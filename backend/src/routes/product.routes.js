const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/products
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const params = [];
    const where = distributor_id ? (params.push(distributor_id), 'WHERE p.distributor_id = $1') : '';

    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.sku, p.unit, p.price, p.is_active, p.created_at,
              json_build_object('id', c.id, 'name', c.name) AS category,
              json_build_object('quantity_available', i.quantity_available, 'low_stock_threshold', i.low_stock_threshold) AS inventory
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory i ON i.product_id = p.id
       ${where}
       ORDER BY p.name`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.sku, p.unit, p.price, p.is_active, p.created_at, p.updated_at,
              json_build_object('id', c.id, 'name', c.name) AS category,
              json_build_object('id', d.id, 'business_name', d.business_name) AS distributor,
              json_build_object('quantity_available', i.quantity_available, 'low_stock_threshold', i.low_stock_threshold) AS inventory
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN distributors d ON d.id = p.distributor_id
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { category_id, name, sku, unit, price, initial_stock } = req.body;
    let { distributor_id } = req.body;
    if (!distributor_id) {
      const r = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.sub]);
      distributor_id = r.rows[0]?.id;
    }
    if (!distributor_id) return res.status(400).json({ error: 'No distributor linked to this account' });

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO products (distributor_id, category_id, name, sku, unit, price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, unit, price, created_at`,
      [distributor_id, category_id || null, name, sku || null, unit || 'piece', price]
    );
    await client.query(
      `INSERT INTO inventory (product_id, quantity_available) VALUES ($1, $2)`,
      [rows[0].id, initial_stock || 0]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// PATCH /api/products/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, sku, unit, price, is_active, category_id } = req.body;
    const { rows } = await pool.query(
      `UPDATE products SET
         name = COALESCE($1, name), sku = COALESCE($2, sku), unit = COALESCE($3, unit),
         price = COALESCE($4, price), is_active = COALESCE($5, is_active),
         category_id = COALESCE($6, category_id), updated_at = NOW()
       WHERE id = $7 RETURNING id, name, price, is_active, updated_at`,
      [name, sku, unit, price, is_active, category_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await pool.query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
