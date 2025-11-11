import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB and return database instance
 * Reuses existing connection if available
 * @returns MongoDB database instance
 */
export async function connectToDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'wildcat';

  cachedClient = new MongoClient(mongoURL);
  await cachedClient.connect();
  cachedDb = cachedClient.db(dbName);

  return cachedDb;
}

/**
 * Get cached database instance without connecting
 * @returns MongoDB database instance or null if not connected
 */
export function getDb(): Db | null {
  return cachedDb;
}

/**
 * Close MongoDB connection
 */
export async function closeDB(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

export default {
  connectToDB,
  getDb,
  closeDB,
};
