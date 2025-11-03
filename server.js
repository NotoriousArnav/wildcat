require('dotenv').config();
const express = require('express');

const constructApp = function (whatsapp_socket){
  const app = express();
  app.locals.whatsapp_socket = whatsapp_socket;
  app.use(express.json());
  return app;
}

const makeApp = (app, routes) => {
  routes.forEach((route) => {
    const { path, method, handler } = route;
    app[method](path, handler);
  });
}

const startServer = async (app) => {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
  });
}

module.exports = {
  makeApp,
  startServer,
  constructApp
}
