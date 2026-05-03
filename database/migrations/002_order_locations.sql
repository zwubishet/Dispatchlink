-- Migration: Add pickup/dropoff location to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_name    TEXT,
  ADD COLUMN IF NOT EXISTS pickup_lat     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dropoff_name   TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_lat    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS dropoff_lng    DOUBLE PRECISION;
