-- ─── v2: Make vehicle_number optional, add vendor_id to parking_users ─────────

-- Make vehicle_number optional (users now have vehicles in app_vehicles table)
ALTER TABLE parking_users ALTER COLUMN vehicle_number DROP NOT NULL;
DROP INDEX IF EXISTS idx_parking_users_vehicle_number;
CREATE INDEX IF NOT EXISTS idx_parking_users_vehicle_number ON parking_users(vehicle_number);

-- Add vendor_id: which vendor created/owns this parking user
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parking_users_vendor_id ON parking_users(vendor_id);

-- Add fee column to parking_sessions (for charging later)
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2) DEFAULT 0;

-- ─── Slot allocation: link parking users to a parking site ────────────────────
ALTER TABLE parking_users
  ADD COLUMN IF NOT EXISTS assigned_site_id UUID REFERENCES parking_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parking_users_assigned_site ON parking_users(assigned_site_id);

-- ─── Slot number for individual slot allocation ───────────────────────────────
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS slot_number VARCHAR(50);
