const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/dashboard/summary?distributor_id=xxx
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { distributor_id } = req.query;
    const param = distributor_id ? [distributor_id] : [];
    const filter = distributor_id ? 'AND distributor_id = $1' : '';

    const [orders, revenue, shops, lowStock] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending') AS pending,
           COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
           COUNT(*) FILTER (WHERE status = 'in_transit') AS in_transit,
           COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
           COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
           COUNT(*) AS total
         FROM orders WHERE 1=1 ${filter}`,
        param
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS total_revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered' AND created_at >= date_trunc('month', NOW())), 0) AS monthly_revenue
         FROM orders WHERE 1=1 ${filter}`,
        param
      ),
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = true) AS active
         FROM shops WHERE 1=1 ${distributor_id ? 'AND distributor_id = $1' : ''}`,
        param
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM inventory i
         JOIN products p ON p.id = i.product_id
         WHERE i.quantity_available <= i.low_stock_threshold
         ${distributor_id ? 'AND p.distributor_id = $1' : ''}`,
        param
      ),
    ]);

    res.json({
      orders: orders.rows[0],
      revenue: revenue.rows[0],
      shops: shops.rows[0],
      low_stock_count: parseInt(lowStock.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-orders?distributor_id=xxx
router.get('/recent-orders', authenticate, async (req, res, next) => {
  try {
    const { distributor_id, limit = 10 } = req.query;
    const params = [parseInt(limit)];
    const filter = distributor_id ? (params.push(distributor_id), 'AND o.distributor_id = $2') : '';

    const result = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
              s.name AS shop_name, s.phone AS shop_phone
       FROM orders o
       JOIN shops s ON s.id = o.shop_id
       WHERE 1=1 ${filter}
       ORDER BY o.created_at DESC
       LIMIT $1`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/top-products?distributor_id=xxx
router.get('/top-products', authenticate, async (req, res, next) => {
  try {
    const { distributor_id, limit = 5 } = req.query;
    const params = [parseInt(limit)];
    const filter = distributor_id ? (params.push(distributor_id), 'AND p.distributor_id = $2') : '';

    const result = await pool.query(
      `SELECT p.id, p.name, p.unit,
              SUM(oi.quantity) AS total_quantity_sold,
              SUM(oi.subtotal) AS total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'delivered' ${filter}
       GROUP BY p.id, p.name, p.unit
       ORDER BY total_quantity_sold DESC
       LIMIT $1`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
