require('dotenv').config();
const express = require('express');

const { httpLogger } = require('./logger');

const constructApp = function (){
  const app = express();
  app.use(express.json());
  app.use(httpLogger({ redactBody: false }));
  return app;
}

const startServer = async (app) => {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(JSON.stringify(
      {
        status: 'server_running',
        host: HOST,
        port: PORT,
        time: new Date().toISOString()
      }
    ));
  });
}

module.exports = {
  startServer,
  constructApp
}
