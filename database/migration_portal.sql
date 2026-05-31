-- ════════════════════════════════════════════════════════════════════════════
-- ANPR Portal – Migration: New modules
-- Run once against your anpr_db database
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Vendors (portal entity – separate from account-based vendor logins) ─────
CREATE TABLE IF NOT EXISTS vendors (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name          VARCHAR(255) NOT NULL,
  contact_person       VARCHAR(255) NOT NULL,
  phone                VARCHAR(50)  NOT NULL,
  email                VARCHAR(255) NOT NULL,
  city                 VARCHAR(100) NOT NULL,
  state                VARCHAR(100) NOT NULL,
  gstin                VARCHAR(15)  NOT NULL,
  registered_address   TEXT         NOT NULL,
  primary_service      VARCHAR(100) NOT NULL,
  contract_start_date  DATE         NOT NULL,
  notes                TEXT,
  status               VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  last_order_date      DATE,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_gstin ON vendors(gstin);
CREATE        INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- ─── Parking Sites ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_sites (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_name             VARCHAR(255) NOT NULL,
  location              VARCHAR(255) NOT NULL,
  type                  VARCHAR(50)  NOT NULL CHECK (type IN ('Commercial','Public','Mall','Residential')),
  total_capacity        INTEGER      NOT NULL DEFAULT 0,
  occupied              INTEGER      NOT NULL DEFAULT 0,
  hourly_rate           NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_rate            NUMERIC(10,2) NOT NULL DEFAULT 0,
  monthly_rate          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  assigned_vendor_id    UUID         REFERENCES vendors(id) ON DELETE SET NULL,
  entry_camera_ip       VARCHAR(50),
  exit_camera_ip        VARCHAR(50),
  barrier_controller_ip VARCHAR(50),
  created_at            TIMESTAMPTZ  DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parking_sites_status     ON parking_sites(status);
CREATE INDEX IF NOT EXISTS idx_parking_sites_vendor_id  ON parking_sites(assigned_vendor_id);

-- ─── Parking Users (web + app) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_users (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            VARCHAR(10)  NOT NULL DEFAULT 'web' CHECK (type IN ('web','app')),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(50)  NOT NULL,
  vehicle_number  VARCHAR(50)  NOT NULL,
  password_hash   TEXT         NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  joined_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_users_email          ON parking_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parking_users_vehicle_number ON parking_users(vehicle_number);
CREATE        INDEX IF NOT EXISTS idx_parking_users_type           ON parking_users(type);
CREATE        INDEX IF NOT EXISTS idx_parking_users_status         ON parking_users(status);

-- ─── Parking Wallets (app users only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_wallets (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES parking_users(id) ON DELETE CASCADE,
  balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_recharges   NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_recharge_at  TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON parking_wallets(user_id);

-- ─── Parking Recharges ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_recharges (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  user_name        VARCHAR(255),
  vehicle_number   VARCHAR(50),
  amount           NUMERIC(10,2) NOT NULL,
  payment_method   VARCHAR(50)  NOT NULL CHECK (payment_method IN ('Cash','UPI','Card')),
  transaction_ref  VARCHAR(255) NOT NULL,
  processed_by     UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recharges_user_id    ON parking_recharges(user_id);
CREATE INDEX IF NOT EXISTS idx_recharges_created_at ON parking_recharges(created_at DESC);

-- ─── Inventory Items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name     VARCHAR(255) NOT NULL,
  total_qty     INTEGER      NOT NULL DEFAULT 0,
  available_qty INTEGER      NOT NULL DEFAULT 0,
  unit          VARCHAR(50)  NOT NULL DEFAULT 'pcs',
  vendor_id     UUID         REFERENCES vendors(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor_id ON inventory_items(vendor_id);

-- ─── Portal Users (admin panel accounts) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('Manager','Operator','Finance','Super Admin')),
  access_level  VARCHAR(50)  NOT NULL CHECK (access_level IN ('Read Only','Read+Write','Full Access','Finance Module')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_users_status ON portal_users(status);

-- ─── Auto-update triggers ─────────────────────────────────────────────────────
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_parking_sites_updated_at
  BEFORE UPDATE ON parking_sites
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_parking_users_updated_at
  BEFORE UPDATE ON parking_users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_portal_users_updated_at
  BEFORE UPDATE ON portal_users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
