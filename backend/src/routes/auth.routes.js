const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { buildHasuraToken } = require('../config/jwt');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { phone, password } = req.body;
      const result = await pool.query(
        'SELECT * FROM users WHERE phone = $1 AND is_active = true',
        [phone]
      );

      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid phone or password' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid phone or password' });

      const token = buildHasuraToken(user);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/register (admin only in production — open for MVP)
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'distributor', 'driver']).withMessage('Invalid role'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, phone, email, password, role } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (name, phone, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, phone, email, role`,
        [name, phone, email || null, password_hash, role]
      );

      const user = result.rows[0];
      const token = buildHasuraToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, email, role, is_active, created_at FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
