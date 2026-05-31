const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, errors, json, colorize, printf } = format;

const LOG_DIR   = process.env.LOG_DIR   || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Human-readable format for the console
const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaStr}`;
});

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'anpr-backend' },
  transports: [
    // Rotating file – all levels
    new transports.DailyRotateFile({
      dirname:       path.join(process.cwd(), LOG_DIR),
      filename:      'app-%DATE%.log',
      datePattern:   'YYYY-MM-DD',
      maxSize:       '20m',
      maxFiles:      '14d',
      zippedArchive: true,
    }),
    // Rotating file – errors only
    new transports.DailyRotateFile({
      level:         'error',
      dirname:       path.join(process.cwd(), LOG_DIR),
      filename:      'error-%DATE%.log',
      datePattern:   'YYYY-MM-DD',
      maxSize:       '20m',
      maxFiles:      '30d',
      zippedArchive: true,
    }),
  ],
});

// Pretty console output in non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    ),
  }));
}

module.exports = logger;
