const express = require('express');
const pool = require('../config/db');
const { gql } = require('../config/hasura');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/inventory?distributor_id=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const where = distributor_id
      ? { product: { distributor_id: { _eq: distributor_id } } }
      : {};

    const data = await gql(
      `query GetInventory($where: inventory_bool_exp!) {
        inventory(where: $where, order_by: { product: { name: asc } }) {
          id quantity_available low_stock_threshold updated_at
          product { id name sku unit price is_active category { name } }
        }
      }`,
      { where }
    );
    res.json(data.inventory);
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/adjust — stock in/out/adjustment
router.post('/adjust', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { product_id, movement_type, quantity, note } = req.body;

    if (!['in', 'out', 'adjustment'].includes(movement_type)) {
      return res.status(400).json({ error: 'Invalid movement_type' });
    }

    await client.query('BEGIN');

    // Log movement
    await client.query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, note, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [product_id, movement_type, quantity, note || null, req.user.sub]
    );

    // Update inventory
    let updateQuery;
    if (movement_type === 'in') {
      updateQuery = `UPDATE inventory SET quantity_available = quantity_available + $1, updated_at = NOW() WHERE product_id = $2 RETURNING *`;
    } else if (movement_type === 'out') {
      updateQuery = `UPDATE inventory SET quantity_available = GREATEST(0, quantity_available - $1), updated_at = NOW() WHERE product_id = $2 RETURNING *`;
    } else {
      // adjustment = set absolute value
      updateQuery = `UPDATE inventory SET quantity_available = $1, updated_at = NOW() WHERE product_id = $2 RETURNING *`;
    }

    const result = await client.query(updateQuery, [quantity, product_id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inventory record not found for this product' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/inventory/movements?product_id=xxx
router.get('/movements', authenticate, async (req, res, next) => {
  try {
    const { product_id, limit = 50 } = req.query;
    const where = product_id ? { product_id: { _eq: product_id } } : {};

    const data = await gql(
      `query GetMovements($where: stock_movements_bool_exp!, $limit: Int!) {
        stock_movements(where: $where, order_by: { created_at: desc }, limit: $limit) {
          id movement_type quantity note created_at
          product { name unit }
          user { name }
        }
      }`,
      { where, limit: parseInt(limit) }
    );
    res.json(data.stock_movements);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/inventory/:product_id/threshold
router.patch('/:product_id/threshold', authenticate, async (req, res, next) => {
  try {
    const { low_stock_threshold } = req.body;
    const data = await gql(
      `mutation UpdateThreshold($product_id: uuid!, $threshold: Int!) {
        update_inventory(
          where: { product_id: { _eq: $product_id } }
          _set: { low_stock_threshold: $threshold }
        ) {
          returning { id quantity_available low_stock_threshold }
        }
      }`,
      { product_id: req.params.product_id, threshold: low_stock_threshold }
    );
    res.json(data.update_inventory.returning[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
