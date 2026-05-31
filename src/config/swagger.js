const swaggerJsdoc  = require('swagger-jsdoc');
const swaggerUi     = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'ANPR Platform API',
      version:     '1.0.0',
      description: 'Automatic Number Plate Recognition – REST API documentation',
      contact: { name: 'ANPR Team' },
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}${process.env.API_PREFIX || '/api/v1'}` },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Auth ──────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'john_doe' },
            password: { type: 'string', example: 'Secret@123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn:    { type: 'string', example: '1h' },
            role:         { type: 'string', enum: ['admin', 'vendor', 'user'] },
          },
        },
        // ── Vendor ───────────────────────────────────────
        CreateVendorRequest: {
          type: 'object',
          required: ['username', 'password', 'phone'],
          properties: {
            username: { type: 'string', example: 'vendor_one' },
            password: { type: 'string', example: 'Vendor@123' },
            phone:    { type: 'string', example: '9876543210' },
          },
        },
        // ── User ─────────────────────────────────────────
        CreateUserRequest: {
          type: 'object',
          required: ['username', 'password', 'phone', 'carNumber', 'carModel', 'carName'],
          properties: {
            username:  { type: 'string', example: 'user_one' },
            password:  { type: 'string', example: 'User@123' },
            phone:     { type: 'string', example: '9123456780' },
            carNumber: { type: 'string', example: 'MH12AB1234' },
            carModel:  { type: 'string', example: 'Swift Dzire' },
            carName:   { type: 'string', example: 'My Car' },
          },
        },
        // ── Generic ──────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors:  { type: 'array', items: { type: 'object' } },
          },
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            total:      { type: 'integer' },
            page:       { type: 'integer' },
            limit:      { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'ANPR API Docs',
  }));
  app.get('/api-docs.json', (_, res) => res.json(swaggerSpec));
};

module.exports = { setupSwagger };
