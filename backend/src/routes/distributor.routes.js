const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/distributors
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.business_name, d.address, d.subcity, d.city, d.tin_number, d.is_verified, d.created_at,
              json_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email) AS user
       FROM distributors d JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/distributors/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.business_name, d.address, d.subcity, d.city, d.tin_number, d.is_verified, d.created_at,
              json_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email) AS user,
              (SELECT COUNT(*) FROM shops WHERE distributor_id = d.id) AS shop_count,
              (SELECT COUNT(*) FROM products WHERE distributor_id = d.id) AS product_count,
              (SELECT COUNT(*) FROM orders WHERE distributor_id = d.id) AS order_count
       FROM distributors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Distributor not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/distributors
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { user_id, business_name, address, subcity, city, tin_number } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO distributors (user_id, business_name, address, subcity, city, tin_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, business_name, created_at`,
      [user_id, business_name, address || null, subcity || null, city || 'Addis Ababa', tin_number || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/distributors/:id
router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { business_name, address, subcity, city, tin_number, is_verified } = req.body;
    const { rows } = await pool.query(
      `UPDATE distributors SET
         business_name = COALESCE($1, business_name), address = COALESCE($2, address),
         subcity = COALESCE($3, subcity), city = COALESCE($4, city),
         tin_number = COALESCE($5, tin_number), is_verified = COALESCE($6, is_verified),
         updated_at = NOW()
       WHERE id = $7 RETURNING id, business_name, is_verified, updated_at`,
      [business_name, address, subcity, city, tin_number, is_verified, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Distributor not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
