-- ─── v3: Apply all pending column additions to parking_users ─────────────────
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS everywhere)

-- 1. Make vehicle_number optional
ALTER TABLE parking_users ALTER COLUMN vehicle_number DROP NOT NULL;
DROP INDEX IF EXISTS idx_parking_users_vehicle_number;
CREATE INDEX IF NOT EXISTS idx_parking_users_vehicle_number ON parking_users(vehicle_number);

-- 2. Vendor link
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parking_users_vendor_id ON parking_users(vendor_id);

-- 3. Parking site assignment + slot
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS assigned_site_id UUID REFERENCES parking_sites(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parking_users_assigned_site ON parking_users(assigned_site_id);
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS slot_number VARCHAR(50);

-- 4. Allotted slots (how many vehicles a user may register)
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS allotted_slots INTEGER NOT NULL DEFAULT 1;

-- 5. Profile photo URL
ALTER TABLE parking_users ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 6. Session fee
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2) DEFAULT 0;
