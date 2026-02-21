require('dotenv').config({ quiet: true });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'smart-business-analytics';

async function runMongoStartupCheck() {
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    await client.db(DB_NAME).command({ ping: 1 });
    console.log('[Startup MongoDB] CONNECTED');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Startup MongoDB] FAILED:', message);
  } finally {
    try {
      await client.close();
    } catch {
      // no-op
    }
  }
}

runMongoStartupCheck()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Startup MongoDB] FAILED:', message);
  })
  .finally(() => {
    process.exit(0);
  });
