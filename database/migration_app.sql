-- ════════════════════════════════════════════════════════════════════════════
-- ANPR Mobile App – Migration
-- ════════════════════════════════════════════════════════════════════════════

-- Profile photo column for parking_users
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- ─── App Refresh Tokens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN     DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_rt_user_id    ON app_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_app_rt_token_hash ON app_refresh_tokens(token_hash);

-- ─── App Vehicles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_vehicles (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  number_plate   VARCHAR(20)  NOT NULL,
  vehicle_type   VARCHAR(20)  NOT NULL CHECK (vehicle_type IN ('two_wheeler','four_wheeler')),
  vehicle_name   VARCHAR(100) NOT NULL,
  vehicle_model  VARCHAR(100) NOT NULL,
  is_primary     BOOLEAN      DEFAULT FALSE,
  status         VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','inactive','removed')),
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_vehicles_user_id ON app_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_vehicles_plate   ON app_vehicles(number_plate);

-- ─── Vehicle Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_requests (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  vehicle_id       UUID         REFERENCES app_vehicles(id) ON DELETE SET NULL,
  request_type     VARCHAR(30)  NOT NULL CHECK (request_type IN ('plate_change','slot_swap','remove_vehicle')),
  current_value    VARCHAR(255),
  requested_value  VARCHAR(255),
  reason           TEXT,
  status           VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note       TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_user_id ON vehicle_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status  ON vehicle_requests(status);

-- ─── Parking Sessions (In/Out tracking) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_sessions (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id       UUID         REFERENCES app_vehicles(id) ON DELETE SET NULL,
  user_id          UUID         REFERENCES parking_users(id) ON DELETE SET NULL,
  site_id          UUID         REFERENCES parking_sites(id) ON DELETE SET NULL,
  number_plate     VARCHAR(20)  NOT NULL,
  vehicle_name     VARCHAR(100),
  vehicle_model    VARCHAR(100),
  vehicle_type     VARCHAR(20),
  entry_time       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  exit_time        TIMESTAMPTZ,
  duration_minutes INTEGER,
  status           VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON parking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_vehicle_id ON parking_sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sessions_plate      ON parking_sessions(number_plate);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_time ON parking_sessions(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON parking_sessions(status);

-- ─── Visitors ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitors (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  invited_by        UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  visitor_name      VARCHAR(255) NOT NULL,
  visitor_phone     VARCHAR(50)  NOT NULL,
  visitor_car_number VARCHAR(50) NOT NULL,
  purpose           VARCHAR(255) NOT NULL,
  visit_date        DATE         NOT NULL,
  visit_time        TIME         NOT NULL,
  duration_hours    INTEGER      NOT NULL DEFAULT 1,
  duration_minutes  INTEGER      NOT NULL DEFAULT 0,
  tracking_number   VARCHAR(25)  NOT NULL UNIQUE,
  status            VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','checked_in','checked_out','expired','cancelled')),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitors_invited_by      ON visitors(invited_by);
CREATE INDEX IF NOT EXISTS idx_visitors_tracking_number ON visitors(tracking_number);
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date      ON visitors(visit_date);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES parking_users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  data       JSONB,
  is_read    BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ─── Triggers ─────────────────────────────────────────────────────────────────
CREATE TRIGGER set_app_vehicles_updated_at
  BEFORE UPDATE ON app_vehicles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_vehicle_requests_updated_at
  BEFORE UPDATE ON vehicle_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
