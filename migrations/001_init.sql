-- ============================================================
--  ANPR Portal — Full Database Migration (PostgreSQL only)
--  Run this once on a fresh PostgreSQL database
--
--  NOTE: This project has been migrated to MongoDB/Mongoose.
--  This file is kept for reference only.
--  For MongoDB, use the Mongoose models in src/models/ and
--  run the index creation script: node migrations/001_mongo_indexes.js
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Roles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('admin',  'Full system access'),
  ('vendor', 'Can create and manage users'),
  ('user',   'End user with car details')
ON CONFLICT (name) DO NOTHING;

-- ─── Accounts (admin / vendor login) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id             INTEGER     NOT NULL REFERENCES roles(id),
  username_encrypted  TEXT        NOT NULL,
  username_hash       TEXT        NOT NULL UNIQUE,
  password_hash       TEXT        NOT NULL,
  phone_encrypted     TEXT        NOT NULL,
  phone_hash          TEXT        NOT NULL,
  created_by          UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  is_active           BOOLEAN     DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── Refresh Tokens (admin / vendor) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_revoked  BOOLEAN     DEFAULT false,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Portal Users (staff — manager / operator / finance) ─────────────────────
CREATE TABLE IF NOT EXISTS portal_users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(50)  NOT NULL,
  access_level  VARCHAR(50)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  actor_role    VARCHAR(50),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   UUID,
  details       JSONB,
  ip_address    INET,
  user_agent    TEXT,
  status        VARCHAR(20)  DEFAULT 'success',
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- ─── Parking Sites (no vendor FK yet — added after vendors table) ────────────
CREATE TABLE IF NOT EXISTS parking_sites (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name             VARCHAR(255) NOT NULL,
  location              VARCHAR(255) NOT NULL,
  type                  VARCHAR(50)  NOT NULL,
  total_capacity        INTEGER      NOT NULL DEFAULT 0,
  occupied              INTEGER      NOT NULL DEFAULT 0,
  hourly_rate           NUMERIC      NOT NULL DEFAULT 0,
  daily_rate            NUMERIC      NOT NULL DEFAULT 0,
  monthly_rate          NUMERIC      NOT NULL DEFAULT 0,
  status                VARCHAR(20)  NOT NULL DEFAULT 'active',
  assigned_vendor_id    UUID,
  entry_camera_ip       VARCHAR(50),
  exit_camera_ip        VARCHAR(50),
  barrier_controller_ip VARCHAR(50),
  created_at            TIMESTAMPTZ  DEFAULT now(),
  updated_at            TIMESTAMPTZ  DEFAULT now()
);

-- ─── Vendors ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name         VARCHAR(255) NOT NULL,
  contact_person      VARCHAR(255) NOT NULL,
  phone               VARCHAR(50)  NOT NULL,
  email               VARCHAR(255) NOT NULL,
  city                VARCHAR(100) NOT NULL,
  state               VARCHAR(100) NOT NULL,
  gstin               VARCHAR(15)  NOT NULL UNIQUE,
  registered_address  TEXT         NOT NULL,
  primary_service     VARCHAR(100) NOT NULL,
  contract_start_date DATE         NOT NULL,
  notes               TEXT,
  status              VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_order_date     DATE,
  assigned_site_id    UUID         REFERENCES parking_sites(id) ON DELETE SET NULL,
  account_id          UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now()
);

-- ─── Add vendor FK back to parking_sites ─────────────────────────────────────
ALTER TABLE parking_sites
  ADD FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- ─── Parking Users (web + app) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_users (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  type             VARCHAR(10)  NOT NULL DEFAULT 'web',
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  phone            VARCHAR(50)  NOT NULL,
  vehicle_number   VARCHAR(50),
  password_hash    TEXT         NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'active',
  profile_photo    TEXT,
  allotted_slots   INTEGER      DEFAULT 1,
  vendor_id        UUID         REFERENCES vendors(id) ON DELETE SET NULL,
  assigned_site_id UUID         REFERENCES parking_sites(id) ON DELETE SET NULL,
  slot_number      VARCHAR(50),
  joined_at        TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

-- ─── Parking Wallets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_wallets (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID    NOT NULL UNIQUE REFERENCES parking_users(id) ON DELETE CASCADE,
  balance          NUMERIC NOT NULL DEFAULT 0,
  total_recharges  NUMERIC NOT NULL DEFAULT 0,
  last_recharge_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── App Vehicles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_vehicles (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  number_plate  VARCHAR(20)  NOT NULL,
  vehicle_type  VARCHAR(20)  NOT NULL,
  vehicle_name  VARCHAR(100) NOT NULL,
  vehicle_model VARCHAR(100) NOT NULL,
  is_primary    BOOLEAN      DEFAULT false,
  status        VARCHAR(20)  DEFAULT 'active',
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- ─── Parking Sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_sessions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id       UUID        REFERENCES app_vehicles(id) ON DELETE SET NULL,
  user_id          UUID        REFERENCES parking_users(id) ON DELETE SET NULL,
  site_id          UUID        REFERENCES parking_sites(id) ON DELETE SET NULL,
  number_plate     VARCHAR(20) NOT NULL,
  vehicle_name     VARCHAR(100),
  vehicle_model    VARCHAR(100),
  vehicle_type     VARCHAR(20),
  entry_time       TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time        TIMESTAMPTZ,
  duration_minutes INTEGER,
  fee              NUMERIC     DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── Parking Recharges ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_recharges (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  user_name       VARCHAR(255),
  vehicle_number  VARCHAR(50),
  amount          NUMERIC      NOT NULL,
  payment_method  VARCHAR(50)  NOT NULL,
  transaction_ref VARCHAR(255) NOT NULL,
  processed_by    UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  DEFAULT now()
);

-- ─── Inventory Items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name     VARCHAR(255) NOT NULL,
  total_qty     INTEGER      NOT NULL DEFAULT 0,
  available_qty INTEGER      NOT NULL DEFAULT 0,
  unit          VARCHAR(50)  NOT NULL DEFAULT 'pcs',
  vendor_id     UUID         REFERENCES vendors(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

-- ─── App Refresh Tokens ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  is_revoked  BOOLEAN     DEFAULT false,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Vehicle Requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_requests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  vehicle_id      UUID        REFERENCES app_vehicles(id) ON DELETE SET NULL,
  request_type    VARCHAR(30) NOT NULL,
  current_value   VARCHAR(255),
  requested_value VARCHAR(255),
  reason          TEXT,
  status          VARCHAR(20) DEFAULT 'pending',
  admin_note      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Visitors ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitors (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  invited_by         UUID         REFERENCES parking_users(id) ON DELETE CASCADE,
  visitor_name       VARCHAR(255) NOT NULL,
  visitor_phone      VARCHAR(50)  NOT NULL,
  visitor_car_number VARCHAR(50)  NOT NULL,
  purpose            VARCHAR(255) NOT NULL,
  visit_date         DATE         NOT NULL,
  visit_time         TIME         NOT NULL,
  duration_hours     INTEGER      NOT NULL DEFAULT 1,
  duration_minutes   INTEGER      NOT NULL DEFAULT 0,
  tracking_number    VARCHAR(25)  NOT NULL UNIQUE,
  status             VARCHAR(20)  DEFAULT 'pending',
  created_at         TIMESTAMPTZ  DEFAULT now(),
  updated_at         TIMESTAMPTZ  DEFAULT now()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  data       JSONB,
  is_read    BOOLEAN      DEFAULT false,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ─── Car Details ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS car_details (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id           UUID         NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  car_number_encrypted TEXT         NOT NULL,
  car_number_hash      TEXT         NOT NULL,
  car_model            VARCHAR(255) NOT NULL,
  car_name             VARCHAR(255) NOT NULL,
  created_at           TIMESTAMPTZ  DEFAULT now(),
  updated_at           TIMESTAMPTZ  DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_username_hash  ON accounts(username_hash);
CREATE INDEX IF NOT EXISTS idx_accounts_role_id        ON accounts(role_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account  ON refresh_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash     ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_app_refresh_tokens_user ON app_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_parking_users_email     ON parking_users(email);
CREATE INDEX IF NOT EXISTS idx_parking_users_type      ON parking_users(type);
CREATE INDEX IF NOT EXISTS idx_parking_users_status    ON parking_users(status);
CREATE INDEX IF NOT EXISTS idx_parking_users_vendor    ON parking_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_parking_users_site      ON parking_users(assigned_site_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_plate  ON parking_sessions(number_plate);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_site   ON parking_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_user   ON parking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_vehicles_user       ON app_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_vehicles_plate      ON app_vehicles(number_plate);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor        ON inventory_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_invited_by     ON visitors(invited_by);
CREATE INDEX IF NOT EXISTS idx_visitors_tracking       ON visitors(tracking_number);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor        ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created      ON audit_logs(created_at DESC);
