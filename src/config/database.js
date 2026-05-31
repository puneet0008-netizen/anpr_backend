const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const connect = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/anpr_db';
  await mongoose.connect(uri);
  logger.info('MongoDB connected');
};

module.exports = { connect, mongoose };
