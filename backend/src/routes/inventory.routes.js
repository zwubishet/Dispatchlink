const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/inventory
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const params = [];
    const where = distributor_id ? (params.push(distributor_id), 'WHERE p.distributor_id = $1') : '';

    const { rows } = await pool.query(
      `SELECT i.id, i.quantity_available, i.low_stock_threshold, i.updated_at,
              json_build_object('id', p.id, 'name', p.name, 'sku', p.sku, 'unit', p.unit,
                'price', p.price, 'is_active', p.is_active,
                'category', json_build_object('name', c.name)) AS product
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.name`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/inventory/adjust
router.post('/adjust', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { product_id, movement_type, quantity, note } = req.body;
    if (!['in', 'out', 'adjustment'].includes(movement_type)) {
      return res.status(400).json({ error: 'Invalid movement_type' });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, note, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [product_id, movement_type, quantity, note || null, req.user.sub]
    );

    const updateSQL = movement_type === 'in'
      ? `UPDATE inventory SET quantity_available = quantity_available + $1, updated_at = NOW() WHERE product_id = $2 RETURNING *`
      : movement_type === 'out'
      ? `UPDATE inventory SET quantity_available = GREATEST(0, quantity_available - $1), updated_at = NOW() WHERE product_id = $2 RETURNING *`
      : `UPDATE inventory SET quantity_available = $1, updated_at = NOW() WHERE product_id = $2 RETURNING *`;

    const { rows } = await client.query(updateSQL, [quantity, product_id]);
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Inventory record not found' }); }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// GET /api/inventory/movements
router.get('/movements', authenticate, async (req, res, next) => {
  try {
    const { product_id, limit = 50 } = req.query;
    const params = [parseInt(limit)];
    const where = product_id ? (params.push(product_id), 'WHERE sm.product_id = $2') : '';

    const { rows } = await pool.query(
      `SELECT sm.id, sm.movement_type, sm.quantity, sm.note, sm.created_at,
              json_build_object('name', p.name, 'unit', p.unit) AS product,
              json_build_object('name', u.name) AS user
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.created_by
       ${where}
       ORDER BY sm.created_at DESC LIMIT $1`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/inventory/:product_id/threshold
router.patch('/:product_id/threshold', authenticate, async (req, res, next) => {
  try {
    const { low_stock_threshold } = req.body;
    const { rows } = await pool.query(
      `UPDATE inventory SET low_stock_threshold = $1, updated_at = NOW()
       WHERE product_id = $2 RETURNING id, quantity_available, low_stock_threshold`,
      [low_stock_threshold, req.params.product_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Inventory record not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
