const express = require('express');
const { gql } = require('../config/hasura');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/drivers?distributor_id=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const pool = require('../config/db');
    const { distributor_id } = req.query;
    const params = [];
    let where = '';
    if (distributor_id) { params.push(distributor_id); where = 'WHERE d.distributor_id = $1'; }

    const { rows } = await pool.query(
      `SELECT d.id, d.vehicle_plate, d.vehicle_type, d.is_available,
              d.latitude, d.longitude, d.location_updated_at, d.created_at,
              json_build_object('id', u.id, 'name', u.name, 'phone', u.phone) AS user
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       ${where}
       ORDER BY d.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/drivers
router.post('/', authenticate, async (req, res, next) => {
  try {
    const pool = require('../config/db');
    const { user_id, vehicle_plate, vehicle_type, latitude, longitude } = req.body;
    let { distributor_id } = req.body;
    if (!distributor_id) {
      const r = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.sub]);
      distributor_id = r.rows[0]?.id;
    }
    if (!distributor_id) return res.status(400).json({ error: 'No distributor linked to this account' });

    const { rows } = await pool.query(
      `INSERT INTO drivers (user_id, distributor_id, vehicle_plate, vehicle_type, latitude, longitude, location_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, vehicle_plate, vehicle_type, is_available, latitude, longitude, location_updated_at, created_at`,
      [user_id, distributor_id, vehicle_plate, vehicle_type,
       latitude ?? null, longitude ?? null,
       latitude != null ? new Date() : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drivers/:id/vehicle
router.patch('/:id/vehicle', authenticate, async (req, res, next) => {
  try {
    const pool = require('../config/db');
    const { vehicle_plate, vehicle_type, latitude, longitude } = req.body;

    const locFields = latitude != null
      ? ', latitude = $3, longitude = $4, location_updated_at = NOW()'
      : '';
    const params = latitude != null
      ? [vehicle_plate, vehicle_type, latitude, longitude, req.params.id]
      : [vehicle_plate, vehicle_type, req.params.id];

    const { rows } = await pool.query(
      `UPDATE drivers SET vehicle_plate = $1, vehicle_type = $2${locFields}
       WHERE id = $${params.length}
       RETURNING id, vehicle_plate, vehicle_type, latitude, longitude, location_updated_at`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drivers/:id/location
router.patch('/:id/location', authenticate, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    const pool = require('../config/db');
    const { rows } = await pool.query(
      `UPDATE drivers
       SET latitude = $1, longitude = $2, location_updated_at = NOW()
       WHERE id = $3
       RETURNING id, latitude, longitude, location_updated_at`,
      [latitude, longitude, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drivers/:id/availability
router.patch('/:id/availability', authenticate, async (req, res, next) => {
  try {
    const { is_available } = req.body;
    const data = await gql(
      `mutation UpdateDriverAvailability($id: uuid!, $available: Boolean!) {
        update_drivers_by_pk(pk_columns: { id: $id }, _set: { is_available: $available }) {
          id is_available updated_at
        }
      }`,
      { id: req.params.id, available: is_available }
    );
    res.json(data.update_drivers_by_pk);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
