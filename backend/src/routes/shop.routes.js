const express = require('express');
const { gql } = require('../config/hasura');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/shops?distributor_id=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const where = distributor_id ? { distributor_id: { _eq: distributor_id } } : {};

    const data = await gql(
      `query GetShops($where: shops_bool_exp!) {
        shops(where: $where, order_by: { name: asc }) {
          id name owner_name phone address subcity city is_active created_at
          orders_aggregate { aggregate { count } }
        }
      }`,
      { where }
    );
    res.json(data.shops);
  } catch (err) {
    next(err);
  }
});

// GET /api/shops/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const data = await gql(
      `query GetShop($id: uuid!) {
        shops_by_pk(id: $id) {
          id name owner_name phone address subcity city is_active created_at
          orders(order_by: { created_at: desc }, limit: 10) {
            id order_number status total_amount created_at
          }
        }
      }`,
      { id: req.params.id }
    );
    if (!data.shops_by_pk) return res.status(404).json({ error: 'Shop not found' });
    res.json(data.shops_by_pk);
  } catch (err) {
    next(err);
  }
});

// POST /api/shops
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, owner_name, phone, address, subcity, city } = req.body;
    let { distributor_id } = req.body;
    if (!distributor_id) {
      const pool = require('../config/db');
      const r = await pool.query('SELECT id FROM distributors WHERE user_id = $1', [req.user.sub]);
      distributor_id = r.rows[0]?.id;
    }
    if (!distributor_id) return res.status(400).json({ error: 'No distributor linked to this account' });
    const data = await gql(
      `mutation CreateShop($obj: shops_insert_input!) {
        insert_shops_one(object: $obj) {
          id name phone created_at
        }
      }`,
      { obj: { distributor_id, name, owner_name, phone, address, subcity, city: city || 'Addis Ababa' } }
    );
    res.status(201).json(data.insert_shops_one);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/shops/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, owner_name, phone, address, subcity, city, is_active } = req.body;
    const data = await gql(
      `mutation UpdateShop($id: uuid!, $set: shops_set_input!) {
        update_shops_by_pk(pk_columns: { id: $id }, _set: $set) {
          id name is_active updated_at
        }
      }`,
      { id: req.params.id, set: { name, owner_name, phone, address, subcity, city, is_active } }
    );
    res.json(data.update_shops_by_pk);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
