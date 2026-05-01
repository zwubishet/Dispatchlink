const express = require('express');
const { gql } = require('../config/hasura');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/products?distributor_id=xxx
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const where = distributor_id ? { distributor_id: { _eq: distributor_id } } : {};

    const data = await gql(
      `query GetProducts($where: products_bool_exp!) {
        products(where: $where, order_by: { name: asc }) {
          id name sku unit price is_active created_at
          category { id name }
          inventory { quantity_available low_stock_threshold }
        }
      }`,
      { where }
    );
    res.json(data.products);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const data = await gql(
      `query GetProduct($id: uuid!) {
        products_by_pk(id: $id) {
          id name sku unit price is_active created_at updated_at
          category { id name }
          distributor { id business_name }
          inventory { quantity_available low_stock_threshold }
        }
      }`,
      { id: req.params.id }
    );
    if (!data.products_by_pk) return res.status(404).json({ error: 'Product not found' });
    res.json(data.products_by_pk);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { distributor_id, category_id, name, sku, unit, price, initial_stock } = req.body;

    const data = await gql(
      `mutation CreateProduct($obj: products_insert_input!) {
        insert_products_one(object: $obj) {
          id name unit price created_at
        }
      }`,
      { obj: { distributor_id, category_id, name, sku, unit: unit || 'piece', price } }
    );

    const product = data.insert_products_one;

    // Create inventory record
    await gql(
      `mutation CreateInventory($product_id: uuid!, $qty: Int!) {
        insert_inventory_one(object: { product_id: $product_id, quantity_available: $qty }) {
          id quantity_available
        }
      }`,
      { product_id: product.id, qty: initial_stock || 0 }
    );

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { name, sku, unit, price, is_active, category_id } = req.body;
    const data = await gql(
      `mutation UpdateProduct($id: uuid!, $set: products_set_input!) {
        update_products_by_pk(pk_columns: { id: $id }, _set: $set) {
          id name price is_active updated_at
        }
      }`,
      { id: req.params.id, set: { name, sku, unit, price, is_active, category_id } }
    );
    res.json(data.update_products_by_pk);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await gql(
      `mutation DeactivateProduct($id: uuid!) {
        update_products_by_pk(pk_columns: { id: $id }, _set: { is_active: false }) { id }
      }`,
      { id: req.params.id }
    );
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
