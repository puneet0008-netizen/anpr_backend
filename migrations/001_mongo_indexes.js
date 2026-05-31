/**
 * MongoDB index creation script.
 * Run once after first deployment: node migrations/001_mongo_indexes.js
 */
require('dotenv').config();
const { connect } = require('../src/config/database');

const Account        = require('../src/models/accounts.model');
const RefreshToken   = require('../src/models/refreshTokens.model');
const AppRefreshToken= require('../src/models/appRefreshTokens.model');
const ParkingUser    = require('../src/models/parkingUsers.model');
const ParkingWallet  = require('../src/models/parkingWallets.model');
const ParkingSession = require('../src/models/parkingSessions.model');
const ParkingRecharge= require('../src/models/parkingRecharges.model');
const ParkingSite    = require('../src/models/parkingSites.model');
const Vendor         = require('../src/models/vendors.model');
const InventoryItem  = require('../src/models/inventoryItems.model');
const AppVehicle     = require('../src/models/appVehicles.model');
const PortalUser     = require('../src/models/portalUsers.model');
const VehicleRequest = require('../src/models/vehicleRequests.model');
const Visitor        = require('../src/models/visitors.model');
const Notification   = require('../src/models/notifications.model');
const AuditLog       = require('../src/models/auditLogs.model');
const CarDetail      = require('../src/models/carDetails.model');

const main = async () => {
  await connect();
  console.log('Creating indexes…');

  await Promise.all([
    Account.createIndexes(),
    RefreshToken.createIndexes(),
    AppRefreshToken.createIndexes(),
    ParkingUser.createIndexes(),
    ParkingWallet.createIndexes(),
    ParkingSession.createIndexes(),
    ParkingRecharge.createIndexes(),
    ParkingSite.createIndexes(),
    Vendor.createIndexes(),
    InventoryItem.createIndexes(),
    AppVehicle.createIndexes(),
    PortalUser.createIndexes(),
    VehicleRequest.createIndexes(),
    Visitor.createIndexes(),
    Notification.createIndexes(),
    AuditLog.createIndexes(),
    CarDetail.createIndexes(),

    // Extra performance indexes
    ParkingSession.collection.createIndex({ numberPlate: 1, status: 1 }),
    ParkingSession.collection.createIndex({ userId: 1, entryTime: -1 }),
    ParkingSession.collection.createIndex({ siteId: 1, status: 1 }),
    Notification.collection.createIndex({ userId: 1, createdAt: -1 }),
    Notification.collection.createIndex({ userId: 1, isRead: 1 }),
    AuditLog.collection.createIndex({ actorId: 1, createdAt: -1 }),
    AppVehicle.collection.createIndex({ userId: 1, status: 1 }),
    ParkingUser.collection.createIndex({ type: 1, status: 1 }),
    ParkingRecharge.collection.createIndex({ userId: 1, createdAt: -1 }),
  ]);

  console.log('All indexes created successfully.');
  process.exit(0);
};

main().catch((err) => {
  console.error('Index creation failed:', err.message);
  process.exit(1);
});
