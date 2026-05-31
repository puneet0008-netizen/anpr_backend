require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');
const path         = require('path');

const routes                     = require('./routes');
const { setupSwagger }           = require('./config/swagger');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { apiLimiter }             = require('./middlewares/rateLimiter.middleware');
const logger                     = require('./utils/logger');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Perf / Parsing ────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── HTTP request logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use(apiLimiter);

// ── Static files (profile photos) ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── API routes ────────────────────────────────────────────────────────────────
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
app.use(API_PREFIX, routes);

// ── Swagger docs ─────────────────────────────────────────────────────────────
setupSwagger(app);

// ── 404 + error handlers ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
