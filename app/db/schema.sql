-- =====================================================================
-- UPI shop — operational schema (Neon Postgres)
--
-- Read this file with the CDC module (5) in mind. Three things here exist
-- purely because a downstream data team will have to live with them:
--   1. `updated_at`, maintained by a trigger  → the watermark column
--   2. rows are UPDATEd in place               → the mutable-fact problem
--   3. `payment_events` append-only outbox     → reliable event publishing
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  user_id      BIGSERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  vpa          TEXT        NOT NULL UNIQUE,          -- payer VPA, e.g. aarav1234@okhdfcbank
  phone        TEXT        NOT NULL,
  city         TEXT        NOT NULL,
  kyc_level    TEXT        NOT NULL DEFAULT 'MIN' CHECK (kyc_level IN ('FULL','MIN')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted   BOOLEAN     NOT NULL DEFAULT false     -- soft delete: a hard DELETE is invisible to CDC
);

CREATE TABLE IF NOT EXISTS products (
  product_id   BIGSERIAL PRIMARY KEY,
  sku          TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  category     TEXT        NOT NULL,
  mcc_code     TEXT        NOT NULL,
  price_inr    NUMERIC(12,2) NOT NULL CHECK (price_inr > 0),
  active       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  order_id     BIGSERIAL PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users(user_id),
  order_ref    TEXT        NOT NULL UNIQUE,           -- ORD-20260814-000123, shown to the customer
  items        JSONB       NOT NULL,                  -- [{product_id, sku, qty, price_inr}]
  item_count   INT         NOT NULL,
  subtotal_inr NUMERIC(12,2) NOT NULL,
  amount_inr   NUMERIC(12,2) NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'CREATED'
                           CHECK (status IN ('CREATED','PAID','PAYMENT_FAILED','REFUNDED','CANCELLED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The table the whole series revolves around. A payment row is written once
-- and then UPDATEd, twice or three times, over the following minutes or hours.
CREATE TABLE IF NOT EXISTS payments (
  payment_id     BIGSERIAL PRIMARY KEY,
  order_id       BIGINT      NOT NULL REFERENCES orders(order_id),
  txn_id         TEXT        NOT NULL UNIQUE,         -- UPI<yyyymm><12 digits> — matches the history files
  payer_vpa      TEXT        NOT NULL,
  payee_vpa      TEXT        NOT NULL,
  payer_bank     TEXT        NOT NULL,
  payee_bank     TEXT        NOT NULL,
  psp_app        TEXT        NOT NULL,                -- PhonePe / Google Pay / Paytm / ...
  amount_inr     NUMERIC(12,2) NOT NULL,
  txn_type       TEXT        NOT NULL DEFAULT 'P2M' CHECK (txn_type IN ('P2P','P2M')),
  status         TEXT        NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','SUCCESS','FAILED','REVERSED')),
  failure_reason TEXT,
  device_id      TEXT,
  city           TEXT,
  initiated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at     TIMESTAMPTZ,                          -- set when it reaches a terminal state
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()   -- <<< the CDC watermark column
);

-- The outbox. Every state change appends here in the SAME transaction as the
-- UPDATE above, so the event can never disagree with the row (Module 6).
CREATE TABLE IF NOT EXISTS payment_events (
  event_id     BIGSERIAL PRIMARY KEY,
  txn_id       TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,                  -- txn_initiated | txn_status_update
  payload      JSONB       NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ                            -- NULL = not yet drained to Event Hubs
);

-- ---------------------------------------------------------------------
-- Indexes. The CDC pull reads by (updated_at) and MUST NOT table-scan;
-- the outbox drain reads unpublished rows in event_id order.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_payments_updated_at  ON payments (updated_at);
CREATE INDEX IF NOT EXISTS ix_payments_status      ON payments (status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS ix_payments_order       ON payments (order_id);
CREATE INDEX IF NOT EXISTS ix_orders_updated_at    ON orders   (updated_at);
CREATE INDEX IF NOT EXISTS ix_users_updated_at     ON users    (updated_at);
CREATE INDEX IF NOT EXISTS ix_events_unpublished   ON payment_events (event_id) WHERE published_at IS NULL;

-- ---------------------------------------------------------------------
-- updated_at maintenance. Without this trigger the watermark lies, and
-- every incremental pull downstream silently misses updates.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_touch ON payments;
CREATE TRIGGER trg_payments_touch BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_orders_touch ON orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_touch ON users;
CREATE TRIGGER trg_users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_products_touch ON products;
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- A read-only login for the pipeline. The data team never gets write access
-- to a production OLTP database — say this out loud on camera.
--   CREATE ROLE upi_reader LOGIN PASSWORD '...';
--   GRANT CONNECT ON DATABASE neondb TO upi_reader;
--   GRANT USAGE ON SCHEMA public TO upi_reader;
--   GRANT SELECT ON ALL TABLES IN SCHEMA public TO upi_reader;
