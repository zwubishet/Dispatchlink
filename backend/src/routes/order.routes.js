const express = require('express');
const { gql } = require('../config/hasura');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

const ORDER_FIELDS = `
  id order_number status total_amount notes delivery_address created_at updated_at
  shop { id name phone address subcity }
  distributor { id business_name }
  order_items {
    id quantity unit_price subtotal
    product { id name unit }
  }
  delivery {
    id assigned_at picked_up_at delivered_at
    driver { id user { name phone } vehicle_plate }
  }
`;

// GET /api/orders?distributor_id=xxx&status=pending
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id, status, shop_id, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (distributor_id) where.distributor_id = { _eq: distributor_id };
    if (status) where.status = { _eq: status };
    if (shop_id) where.shop_id = { _eq: shop_id };

    const data = await gql(
      `query GetOrders($where: orders_bool_exp!, $limit: Int!, $offset: Int!) {
        orders(where: $where, order_by: { created_at: desc }, limit: $limit, offset: $offset) {
          ${ORDER_FIELDS}
        }
        orders_aggregate(where: $where) { aggregate { count } }
      }`,
      { where, limit: parseInt(limit), offset: parseInt(offset) }
    );

    res.json({ orders: data.orders, total: data.orders_aggregate.aggregate.count });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const data = await gql(
      `query GetOrder($id: uuid!) {
        orders_by_pk(id: $id) {
          ${ORDER_FIELDS}
          order_status_histories(order_by: { created_at: asc }) {
            id from_status to_status note created_at
            user { name }
          }
        }
      }`,
      { id: req.params.id }
    );
    if (!data.orders_by_pk) return res.status(404).json({ error: 'Order not found' });
    res.json(data.orders_by_pk);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { shop_id, distributor_id, items, notes, delivery_address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    await client.query('BEGIN');

    // Calculate total
    let total_amount = 0;
    const enrichedItems = [];

    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, price FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );
      if (!productResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product ${item.product_id} not found or inactive` });
      }
      const unit_price = productResult.rows[0].price;
      total_amount += unit_price * item.quantity;
      enrichedItems.push({ ...item, unit_price });
    }

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (shop_id, distributor_id, total_amount, notes, delivery_address, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, order_number`,
      [shop_id, distributor_id, total_amount, notes, delivery_address, req.user.sub]
    );
    const order = orderResult.rows[0];

    // Insert items
    for (const item of enrichedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.unit_price]
      );
    }

    // Log status history
    await client.query(
      `INSERT INTO order_status_history (order_id, to_status, changed_by, note)
       VALUES ($1, 'pending', $2, 'Order created')`,
      [order.id, req.user.sub]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: order.id, order_number: order.order_number, total_amount });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { status, note, driver_id } = req.body;
    const { id } = req.params;

    const VALID_TRANSITIONS = {
      pending: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['assigned', 'cancelled'],
      assigned: ['picked_up', 'cancelled'],
      picked_up: ['in_transit'],
      in_transit: ['delivered', 'failed'],
    };

    await client.query('BEGIN');

    const current = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = current.rows[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot transition from '${currentStatus}' to '${status}'`,
      });
    }

    await client.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, currentStatus, status, req.user.sub, note || null]
    );

    // If assigning, create delivery record
    if (status === 'assigned' && driver_id) {
      await client.query(
        `INSERT INTO deliveries (order_id, driver_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (order_id) DO UPDATE SET driver_id = $2, assigned_at = NOW()`,
        [id, driver_id]
      );
    }

    if (status === 'picked_up') {
      await client.query(
        `UPDATE deliveries SET picked_up_at = NOW() WHERE order_id = $1`,
        [id]
      );
    }

    if (status === 'delivered') {
      await client.query(
        `UPDATE deliveries SET delivered_at = NOW() WHERE order_id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');
    res.json({ id, status, updated: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
