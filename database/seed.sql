-- DispatchLink Seed Data
-- Run: docker exec -i dispatchlink_postgres psql -U dispatchlink_user -d dispatchlink < database/seed.sql

-- ─── Distributor user (admin already exists as id below) ───────────────────
INSERT INTO users (id, name, phone, email, password_hash, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Abebe Distributor', '0911000001', 'abebe@dispatch.et', '$2a$10$4Ft1RInc/pxkKqBTpm0AY.9pr845hVuBnBE9djduFuwA/APUuId9K', 'distributor')
ON CONFLICT (phone) DO NOTHING;

-- ─── Driver users ──────────────────────────────────────────────────────────
INSERT INTO users (id, name, phone, password_hash, role) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Dawit Haile',    '0922000001', '$2a$10$4Ft1RInc/pxkKqBTpm0AY.9pr845hVuBnBE9djduFuwA/APUuId9K', 'driver'),
  ('22222222-0000-0000-0000-000000000002', 'Girma Tadesse',  '0922000002', '$2a$10$4Ft1RInc/pxkKqBTpm0AY.9pr845hVuBnBE9djduFuwA/APUuId9K', 'driver'),
  ('22222222-0000-0000-0000-000000000003', 'Yonas Bekele',   '0922000003', '$2a$10$4Ft1RInc/pxkKqBTpm0AY.9pr845hVuBnBE9djduFuwA/APUuId9K', 'driver')
ON CONFLICT (phone) DO NOTHING;

-- ─── Distributor ───────────────────────────────────────────────────────────
INSERT INTO distributors (id, user_id, business_name, address, subcity, city, tin_number, is_verified) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Abebe General Trading', 'Bole Road, Near Edna Mall', 'Bole', 'Addis Ababa', 'TIN-123456', true)
ON CONFLICT DO NOTHING;

-- ─── Drivers ───────────────────────────────────────────────────────────────
INSERT INTO drivers (user_id, distributor_id, vehicle_plate, vehicle_type, is_available) VALUES
  ('22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'AA 3-12345', 'Truck',    true),
  ('22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'AA 3-67890', 'Van',      true),
  ('22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'AA 3-11111', 'Pickup',   false)
ON CONFLICT DO NOTHING;

-- ─── Shops ─────────────────────────────────────────────────────────────────
INSERT INTO shops (id, distributor_id, name, owner_name, phone, address, subcity) VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Selam Mini Market',   'Selam Alemu',   '0911100001', 'Bole Atlas',        'Bole'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Tigist General Store','Tigist Worku',  '0911100002', 'Sarbet Square',     'Kirkos'),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Haile Supermarket',   'Haile Gebre',   '0911100003', 'CMC Road',          'Yeka'),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Meron Kiosk',         'Meron Desta',   '0911100004', 'Megenagna',         'Yeka'),
  ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'Biruk Shop',          'Biruk Tesfaye', '0911100005', 'Piassa',            'Addis Ketema'),
  ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', 'Hana Convenience',   'Hana Mulugeta', '0911100006', 'Gerji',             'Bole'),
  ('44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', 'Liya Mini Mart',      'Liya Kebede',   '0911100007', 'Ayat',              'Bole'),
  ('44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', 'Robel Store',         'Robel Girma',   '0911100008', 'Lebu',              'Nifas Silk'),
  ('44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000001', 'Bethel Supermarket',  'Bethel Hailu',  '0911100009', 'Gofa',              'Nifas Silk'),
  ('44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000001', 'Eden General Store',  'Eden Teshome',  '0911100010', 'Kality',            'Akaki Kaliti')
ON CONFLICT DO NOTHING;

-- ─── Categories ────────────────────────────────────────────────────────────
INSERT INTO categories (id, distributor_id, name) VALUES
  ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Beverages'),
  ('55555555-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Dry Goods'),
  ('55555555-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Cleaning Products'),
  ('55555555-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Dairy & Eggs')
ON CONFLICT DO NOTHING;

-- ─── Products ──────────────────────────────────────────────────────────────
INSERT INTO products (id, distributor_id, category_id, name, sku, unit, price) VALUES
  ('66666666-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Coca-Cola 500ml',       'BEV-001', 'piece',  25.00),
  ('66666666-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Pepsi 500ml',           'BEV-002', 'piece',  23.00),
  ('66666666-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Ambo Water 1L',         'BEV-003', 'piece',  18.00),
  ('66666666-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Mirinda Orange 500ml',  'BEV-004', 'piece',  22.00),
  ('66666666-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Wheat Flour 50kg',      'DRY-001', 'carton', 1850.00),
  ('66666666-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Sugar 50kg',            'DRY-002', 'carton', 2200.00),
  ('66666666-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Rice 25kg',             'DRY-003', 'carton', 1400.00),
  ('66666666-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'Cooking Oil 5L',        'DRY-004', 'piece',  680.00),
  ('66666666-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Omo Detergent 1kg',     'CLN-001', 'piece',  95.00),
  ('66666666-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Ariel Detergent 500g',  'CLN-002', 'piece',  75.00),
  ('66666666-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000003', 'Sunlight Dish Soap',    'CLN-003', 'piece',  45.00),
  ('66666666-0000-0000-0000-000000000012', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'Eggs (Tray of 30)',     'DAI-001', 'piece',  320.00),
  ('66666666-0000-0000-0000-000000000013', '33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000004', 'Lama Milk 1L',          'DAI-002', 'piece',  55.00)
ON CONFLICT DO NOTHING;

-- ─── Inventory ─────────────────────────────────────────────────────────────
INSERT INTO inventory (product_id, quantity_available, low_stock_threshold) VALUES
  ('66666666-0000-0000-0000-000000000001', 240,  30),
  ('66666666-0000-0000-0000-000000000002', 180,  30),
  ('66666666-0000-0000-0000-000000000003', 300,  50),
  ('66666666-0000-0000-0000-000000000004', 150,  30),
  ('66666666-0000-0000-0000-000000000005',  18,  10),
  ('66666666-0000-0000-0000-000000000006',  12,  10),
  ('66666666-0000-0000-0000-000000000007',  25,  10),
  ('66666666-0000-0000-0000-000000000008',  60,  15),
  ('66666666-0000-0000-0000-000000000009', 120,  20),
  ('66666666-0000-0000-0000-000000000010',   8,  20),  -- low stock
  ('66666666-0000-0000-0000-000000000011',  95,  20),
  ('66666666-0000-0000-0000-000000000012',  40,  15),
  ('66666666-0000-0000-0000-000000000013',   5,  20)   -- low stock
ON CONFLICT (product_id) DO NOTHING;

-- ─── Orders ────────────────────────────────────────────────────────────────
-- Get admin user id for created_by
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE phone = '0900000000';

  -- Order 1: delivered
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'delivered', 2875.00, 'Bole Atlas, Shop 12', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 50, 25.00),
    ('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000005',  1, 1850.00)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by) VALUES
    ('77777777-0000-0000-0000-000000000001', NULL,        'pending',   admin_id),
    ('77777777-0000-0000-0000-000000000001', 'pending',   'confirmed', admin_id),
    ('77777777-0000-0000-0000-000000000001', 'confirmed', 'assigned',  admin_id),
    ('77777777-0000-0000-0000-000000000001', 'assigned',  'picked_up', admin_id),
    ('77777777-0000-0000-0000-000000000001', 'picked_up', 'in_transit',admin_id),
    ('77777777-0000-0000-0000-000000000001', 'in_transit','delivered', admin_id)
    ON CONFLICT DO NOTHING;

  -- Order 2: in_transit
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'in_transit', 1560.00, 'Sarbet Square', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000006', 1, 2200.00),
    ('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000009', 5,   95.00)
    ON CONFLICT DO NOTHING;

  -- Order 3: confirmed
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'confirmed', 3400.00, 'CMC Road', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000007', 2, 1400.00),
    ('77777777-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000008', 1,  680.00)
    ON CONFLICT DO NOTHING;

  -- Order 4: pending
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'pending', 690.00, 'Megenagna', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000012', 2, 320.00),
    ('77777777-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000013', 1,  55.00)
    ON CONFLICT DO NOTHING;

  -- Order 5: pending
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001', 'pending', 1125.00, 'Piassa', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000005', '66666666-0000-0000-0000-000000000001', 25, 25.00),
    ('77777777-0000-0000-0000-000000000005', '66666666-0000-0000-0000-000000000003', 20, 18.00)
    ON CONFLICT DO NOTHING;

  -- Order 6: delivered
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', 'delivered', 4400.00, 'Gerji', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000006', 2, 2200.00)
    ON CONFLICT DO NOTHING;

  -- Order 7: cancelled
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000001', 'cancelled', 450.00, 'Ayat', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000007', '66666666-0000-0000-0000-000000000010', 6, 75.00)
    ON CONFLICT DO NOTHING;

  -- Order 8: assigned
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', 'assigned', 2040.00, 'Lebu', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000008', '66666666-0000-0000-0000-000000000008', 3, 680.00)
    ON CONFLICT DO NOTHING;

  -- Order 9: delivered
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000009', '44444444-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000001', 'delivered', 1760.00, 'Gofa', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000009', '66666666-0000-0000-0000-000000000002', 40, 23.00),
    ('77777777-0000-0000-0000-000000000009', '66666666-0000-0000-0000-000000000011', 20, 45.00)
    ON CONFLICT DO NOTHING;

  -- Order 10: pending
  INSERT INTO orders (id, shop_id, distributor_id, status, total_amount, delivery_address, created_by) VALUES
    ('77777777-0000-0000-0000-000000000010', '44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000001', 'pending', 3700.00, 'Kality', admin_id)
    ON CONFLICT DO NOTHING;
  INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    ('77777777-0000-0000-0000-000000000010', '66666666-0000-0000-0000-000000000005', 2, 1850.00)
    ON CONFLICT DO NOTHING;

END $$;

-- ─── Stock movements log ────────────────────────────────────────────────────
INSERT INTO stock_movements (product_id, movement_type, quantity, note) VALUES
  ('66666666-0000-0000-0000-000000000001', 'in',  500, 'Initial stock received'),
  ('66666666-0000-0000-0000-000000000005', 'in',   30, 'Initial stock received'),
  ('66666666-0000-0000-0000-000000000006', 'in',   20, 'Initial stock received'),
  ('66666666-0000-0000-0000-000000000010', 'out',  12, 'Delivered to Tigist Store'),
  ('66666666-0000-0000-0000-000000000013', 'out',  15, 'Delivered to Selam Mini Market');
