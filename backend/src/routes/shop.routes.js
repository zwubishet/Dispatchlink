const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/shops
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const params = [];
    const where = distributor_id ? (params.push(distributor_id), 'WHERE s.distributor_id = $1') : '';

    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.owner_name, s.phone, s.address, s.subcity, s.city, s.is_active, s.created_at,
              COUNT(o.id) AS order_count
       FROM shops s
       LEFT JOIN orders o ON o.shop_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.name`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/shops/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.owner_name, s.phone, s.address, s.subcity, s.city, s.is_active, s.created_at
       FROM shops s WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Shop not found' });

    const { rows: orders } = await pool.query(
      `SELECT id, order_number, status, total_amount, created_at
       FROM orders WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );
    res.json({ ...rows[0], orders });
  } catch (err) { next(err); }
});

// POST /api/shops
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, owner_name, phone, address, subcity, city } = req.body;
    let { distributor_id } = req.body;
    if (!distributor_id) {
      const r = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.sub]);
      distributor_id = r.rows[0]?.id;
    }
    if (!distributor_id) return res.status(400).json({ error: 'No distributor linked to this account' });

    const { rows } = await pool.query(
      `INSERT INTO shops (distributor_id, name, owner_name, phone, address, subcity, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, phone, created_at`,
      [distributor_id, name, owner_name || null, phone, address || null, subcity || null, city || 'Addis Ababa']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/shops/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, owner_name, phone, address, subcity, city, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE shops SET
         name = COALESCE($1, name), owner_name = COALESCE($2, owner_name),
         phone = COALESCE($3, phone), address = COALESCE($4, address),
         subcity = COALESCE($5, subcity), city = COALESCE($6, city),
         is_active = COALESCE($7, is_active), updated_at = NOW()
       WHERE id = $8 RETURNING id, name, is_active, updated_at`,
      [name, owner_name, phone, address, subcity, city, is_active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Shop not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
