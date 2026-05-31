-- ═══════════════════════════════════════════════════════════
-- ANPR Platform Database Schema
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Roles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id   SERIAL      PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('admin',  'Full system access'),
  ('vendor', 'Can create and manage users'),
  ('user',   'End user with car details')
ON CONFLICT (name) DO NOTHING;

-- ─── Accounts (admin / vendor / user all live here) ─────
CREATE TABLE IF NOT EXISTS accounts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id           INTEGER     NOT NULL REFERENCES roles(id),

  -- Encrypted storage
  username_encrypted TEXT       NOT NULL,
  username_hash      TEXT       NOT NULL,       -- HMAC for lookup
  password_hash      TEXT       NOT NULL,       -- bcrypt
  phone_encrypted    TEXT       NOT NULL,
  phone_hash         TEXT       NOT NULL,       -- HMAC for lookup

  created_by        UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  is_active         BOOLEAN     DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_hash ON accounts(username_hash);
CREATE        INDEX IF NOT EXISTS idx_accounts_role_id       ON accounts(role_id);
CREATE        INDEX IF NOT EXISTS idx_accounts_created_by    ON accounts(created_by);
CREATE        INDEX IF NOT EXISTS idx_accounts_is_active     ON accounts(is_active);

-- ─── Car Details (users only) ───────────────────────────
CREATE TABLE IF NOT EXISTS car_details (
  id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id          UUID    NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,

  car_number_encrypted TEXT   NOT NULL,
  car_number_hash      TEXT   NOT NULL,   -- HMAC for ANPR lookup
  car_model            VARCHAR(255) NOT NULL,
  car_name             VARCHAR(255) NOT NULL,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_car_details_car_number_hash ON car_details(car_number_hash);
CREATE        INDEX IF NOT EXISTS idx_car_details_account_id      ON car_details(account_id);

-- ─── Refresh Tokens ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN     DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account_id ON refresh_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─── Audit Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  actor_role    VARCHAR(50),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   UUID,
  details       JSONB,
  ip_address    INET,
  user_agent    TEXT,
  status        VARCHAR(20) DEFAULT 'success',  -- success | failure
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id      ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs(created_at DESC);

-- ─── Auto-update updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_car_details_updated_at
  BEFORE UPDATE ON car_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
