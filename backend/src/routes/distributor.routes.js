const express = require('express');
const { gql } = require('../config/hasura');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/distributors
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await gql(`
      query GetDistributors {
        distributors(order_by: { created_at: desc }) {
          id
          business_name
          address
          subcity
          city
          tin_number
          is_verified
          created_at
          user { id name phone email }
        }
      }
    `);
    res.json(data.distributors);
  } catch (err) {
    next(err);
  }
});

// GET /api/distributors/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const data = await gql(
      `query GetDistributor($id: uuid!) {
        distributors_by_pk(id: $id) {
          id business_name address subcity city tin_number is_verified created_at
          user { id name phone email }
          shops_aggregate { aggregate { count } }
          products_aggregate { aggregate { count } }
          orders_aggregate { aggregate { count } }
        }
      }`,
      { id: req.params.id }
    );
    if (!data.distributors_by_pk) return res.status(404).json({ error: 'Distributor not found' });
    res.json(data.distributors_by_pk);
  } catch (err) {
    next(err);
  }
});

// POST /api/distributors
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { user_id, business_name, address, subcity, city, tin_number } = req.body;
    const data = await gql(
      `mutation CreateDistributor($obj: distributors_insert_input!) {
        insert_distributors_one(object: $obj) {
          id business_name created_at
        }
      }`,
      { obj: { user_id, business_name, address, subcity, city: city || 'Addis Ababa', tin_number } }
    );
    res.status(201).json(data.insert_distributors_one);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/distributors/:id
router.patch('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { business_name, address, subcity, city, tin_number, is_verified } = req.body;
    const data = await gql(
      `mutation UpdateDistributor($id: uuid!, $set: distributors_set_input!) {
        update_distributors_by_pk(pk_columns: { id: $id }, _set: $set) {
          id business_name is_verified updated_at
        }
      }`,
      { id: req.params.id, set: { business_name, address, subcity, city, tin_number, is_verified } }
    );
    res.json(data.update_distributors_by_pk);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
