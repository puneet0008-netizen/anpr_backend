const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let initialized = false;
let admin       = null;

const FCM_ENABLED = process.env.FCM_ENABLED === 'true';

const _loadAdmin = () => {
  if (admin) return admin;
  try {
    admin = require('firebase-admin');
    return admin;
  } catch {
    logger.warn('firebase-admin not installed – run: npm install firebase-admin');
    return null;
  }
};

const initFirebase = () => {
  if (!FCM_ENABLED) {
    logger.info('FCM disabled (FCM_ENABLED=false)');
    return null;
  }

  const firebaseAdmin = _loadAdmin();
  if (!firebaseAdmin) return null;

  if (initialized) return firebaseAdmin.app();

  try {
    let credential;
    const accountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (accountPath) {
      const resolved = path.resolve(process.cwd(), accountPath);
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      credential = firebaseAdmin.credential.cert(serviceAccount);
    } else {
      const projectId   = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        logger.warn('FCM enabled but Firebase credentials missing – push disabled');
        return null;
      }

      credential = firebaseAdmin.credential.cert({ projectId, clientEmail, privateKey });
    }

    firebaseAdmin.initializeApp({ credential });
    initialized = true;
    logger.info('Firebase Admin initialized');
    return firebaseAdmin.app();
  } catch (err) {
    logger.warn('Firebase init failed – push disabled', { error: err.message });
    return null;
  }
};

const getMessaging = () => {
  if (!initialized || !admin) return null;
  try {
    return admin.messaging();
  } catch {
    return null;
  }
};

module.exports = { initFirebase, getMessaging };
