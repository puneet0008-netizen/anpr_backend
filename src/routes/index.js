const { Router } = require('express');
const authRoutes         = require('./auth.routes');
const adminRoutes        = require('./admin.routes');

// ── New portal modules ────────────────────────────────────────────────────────
const vendorsRoutes      = require('./vendors.routes');
const parkingRoutes      = require('./parking.routes');
const parkingUsersRoutes = require('./parking_users.routes');
const inventoryRoutes    = require('./inventory.routes');
const portalUsersRoutes  = require('./portal_users.routes');

// ── Parking sessions (admin entry/exit) ───────────────────────────────────────
const parkingSessionsRoutes  = require('./parking_sessions.routes');

// ── App admin (vehicle-requests, visitors, sessions) ─────────────────────────
const appAdminRoutes         = require('./app_admin.routes');

// ── Mobile App modules ────────────────────────────────────────────────────────
const appAuthRoutes          = require('./app_auth.routes');
const appProfileRoutes       = require('./app_profile.routes');
const appVehiclesRoutes      = require('./app_vehicles.routes');
const appWalletRoutes        = require('./app_wallet.routes');
const appVisitorsRoutes      = require('./app_visitors.routes');
const appNotificationsRoutes = require('./app_notifications.routes');
const appParkingRoutes       = require('./app_parking.routes');

const router = Router();

router.use('/auth',          authRoutes);
router.use('/admin',         adminRoutes);
router.use('/vendors',       vendorsRoutes);
router.use('/parking',       parkingRoutes);
router.use('/users',         parkingUsersRoutes);
router.use('/inventory',     inventoryRoutes);
router.use('/portal-users',  portalUsersRoutes);
router.use('/app-admin',     appAdminRoutes);
router.use('/sessions',      parkingSessionsRoutes);

// ── Mobile App API (/api/v1/app/...) ─────────────────────────────────────────
router.use('/app/auth',          appAuthRoutes);
router.use('/app/profile',       appProfileRoutes);
router.use('/app/vehicles',      appVehiclesRoutes);
router.use('/app/wallet',        appWalletRoutes);
router.use('/app/visitors',      appVisitorsRoutes);
router.use('/app/notifications', appNotificationsRoutes);
router.use('/app/parking',       appParkingRoutes);

// Health check
router.get('/health', (req, res) =>
  res.json({ success: true, message: 'ANPR API is running', timestamp: new Date() })
);

module.exports = router;
