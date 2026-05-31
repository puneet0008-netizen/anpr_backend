/**
 * Seeds roles and the bootstrap admin account.
 * Usage: node database/seed.js
 */
require('dotenv').config();
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { encrypt, hmac } = require('../src/utils/encryption');

const Role    = require('../src/models/roles.model');
const Account = require('../src/models/accounts.model');

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/anpr_db';
  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  try {
    // ── 1. Seed roles ──────────────────────────────────────────────────────────
    const rolesData = [
      { _id: 1, name: 'admin',  description: 'Full system access' },
      { _id: 2, name: 'vendor', description: 'Can create and manage users' },
      { _id: 3, name: 'user',   description: 'End user with car details' },
    ];

    for (const r of rolesData) {
      await Role.findOneAndUpdate({ _id: r._id }, r, { upsert: true });
    }
    console.log('✅  Roles seeded (admin=1, vendor=2, user=3)');

    // ── 2. Seed admin account ──────────────────────────────────────────────────
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const phone    = process.env.ADMIN_PHONE    || '0000000000';

    const usernameHash = hmac(username);

    const exists = await Account.findOne({ usernameHash });
    if (exists) {
      console.log('ℹ️   Admin account already exists – skipping seed.');
      return;
    }

    const passwordHash      = await bcrypt.hash(password, 12);
    const usernameEncrypted = encrypt(username);
    const phoneEncrypted    = encrypt(phone);
    const phoneHash         = hmac(phone);

    await Account.create({
      _id:               uuidv4(),
      roleId:            1,
      usernameEncrypted,
      usernameHash,
      passwordHash,
      phoneEncrypted,
      phoneHash,
      isActive:          true,
      createdBy:         null,
    });

    console.log(`✅  Admin seeded  (username: ${username})`);
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
