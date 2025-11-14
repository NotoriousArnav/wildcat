require('dotenv').config();
const express = require('express');

const helmet = require('helmet');

const { httpLogger, appLogger } = require('./logger');
const { basicAuthMiddleware, apiKeyMiddleware, globalRateLimiter } = require('./middleware/authMiddleware');

const constructApp = function () {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(httpLogger({ redactBody: false }));

  // Mount ping route BEFORE auth middleware (health check should be unprotected)
  app.get('/ping', (req, res) => {
    res.status(200).json({ ok: true, pong: true, time: new Date().toISOString() });
  });

  // Apply authentication middleware (if enabled) - AFTER ping route
  app.use(basicAuthMiddleware());
  app.use(apiKeyMiddleware());

  // Apply rate limiting middleware (if enabled)
  app.use(globalRateLimiter());

  return app;
};

const startServer = async (app) => {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  const log = appLogger('server');
  app.listen(PORT, HOST, () => {
    log.info('server_running', { host: HOST, port: PORT });
  });
};

module.exports = {
  startServer,
  constructApp,
};
