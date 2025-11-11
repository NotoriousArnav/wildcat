require('dotenv').config();

const { MongoClient } = require('mongodb');

module.exports.connectToDB = async () => {
  const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'wildcat';
  const mongoClient = new MongoClient(mongoURL);
  await mongoClient.connect();
  const db = mongoClient.db(dbName);
  return db;
};
