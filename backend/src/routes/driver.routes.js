const express = require('express');
const { gql } = require('../config/hasura');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/drivers?distributor_id=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const where = distributor_id ? { distributor_id: { _eq: distributor_id } } : {};

    const data = await gql(
      `query GetDrivers($where: drivers_bool_exp!) {
        drivers(where: $where, order_by: { created_at: desc }) {
          id vehicle_plate vehicle_type is_available created_at
          user { id name phone }
        }
      }`,
      { where }
    );
    res.json(data.drivers);
  } catch (err) {
    next(err);
  }
});

// POST /api/drivers
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, phone, vehicle_plate, vehicle_type } = req.body;
    let { user_id, distributor_id } = req.body;
    if (!distributor_id) {
      const pool = require('../config/db');
      const r = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.sub]);
      distributor_id = r.rows[0]?.id;
    }
    if (!distributor_id) return res.status(400).json({ error: 'No distributor linked to this account' });
    const data = await gql(
      `mutation CreateDriver($obj: drivers_insert_input!) {
        insert_drivers_one(object: $obj) {
          id vehicle_plate created_at
          user { name phone }
        }
      }`,
      { obj: { user_id, distributor_id, vehicle_plate, vehicle_type } }
    );
    res.status(201).json(data.insert_drivers_one);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drivers/:id/vehicle
router.patch('/:id/vehicle', authenticate, async (req, res, next) => {
  try {
    const { vehicle_plate, vehicle_type } = req.body;
    const data = await gql(
      `mutation UpdateDriverVehicle($id: uuid!, $plate: String, $type: String) {
        update_drivers_by_pk(pk_columns: { id: $id }, _set: { vehicle_plate: $plate, vehicle_type: $type }) {
          id vehicle_plate vehicle_type updated_at
        }
      }`,
      { id: req.params.id, plate: vehicle_plate, type: vehicle_type }
    );
    res.json(data.update_drivers_by_pk);
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
