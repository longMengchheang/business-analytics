import { MongoClient, Db, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'smart-business-analytics';

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | null | undefined;
  // eslint-disable-next-line no-var
  var __mongoDb: Db | null | undefined;
  // eslint-disable-next-line no-var
  var __mongoIndexesReady: boolean | undefined;
}

let client: MongoClient | null = global.__mongoClient ?? null;
let db: Db | null = global.__mongoDb ?? null;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;
  
  console.log('Connecting to MongoDB...');
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  global.__mongoClient = client;
  global.__mongoDb = db;
  console.log('Connected to MongoDB:', DB_NAME);
  
  // Create indexes
  if (!global.__mongoIndexesReady) {
    await createIndexes(db);
    global.__mongoIndexesReady = true;
  }
  
  return db;
}

async function createIndexes(database: Db): Promise<void> {
  try {
    // Users indexes
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Businesses indexes
    await database.collection('businesses').createIndex({ userId: 1 });
    
    // Products indexes
    await database.collection('products').createIndex({ businessId: 1 });
    await database.collection('products').createIndex({ category: 1 });
    
    // Sales indexes
    await database.collection('sales').createIndex({ businessId: 1 });
    await database.collection('sales').createIndex({ productId: 1 });
    await database.collection('sales').createIndex({ date: -1 });
    
    // Subscriptions indexes
    await database.collection('subscriptions').createIndex({ userId: 1 });
    await database.collection('subscriptions').createIndex({ status: 1 });
    
    // Subscription plans indexes
    await database.collection('subscriptionPlans').createIndex({ name: 1 }, { unique: true });
    
    console.log('Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

// Async query function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(collectionName: string, filter: any = {}, options: any = {}): Promise<any[]> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  let cursor = collection.find(filter);
  
  if (options.sort) {
    cursor = cursor.sort(options.sort);
  }
  if (options.limit) {
    cursor = cursor.limit(options.limit);
  }
  if (options.skip) {
    cursor = cursor.skip(options.skip);
  }
  
  const results = await cursor.toArray();
  
  // Convert ObjectId to string for each document
  return results.map((doc: any) => {
    const result: any = { ...doc };
    if (result._id) result._id = result._id.toString();
    return result;
  });
}

// Async queryOne function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne(collectionName: string, filter: any = {}): Promise<any | undefined> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  const doc = await collection.findOne(filter);
  
  if (!doc) return undefined;
  
  const result: any = { ...doc };
  if (result._id) result._id = result._id.toString();
  return result;
}

// Keep for backward compatibility but make async
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOneAsync(collectionName: string, filter: any = {}): Promise<any | null> {
  return await queryOne(collectionName, filter);
}

// Async run function (insert)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runAsync(collectionName: string, document: any): Promise<string> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  const result = await collection.insertOne(document);
  return result.insertedId.toString();
}

// Keep for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function run(collectionName: string, document: any): Promise<string> {
  return await runAsync(collectionName, document);
}

// Async update function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function update(collectionName: string, filter: any, updateData: any): Promise<boolean> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  const result = await collection.updateOne(filter, { $set: updateData });
  return result.matchedCount > 0;
}

// Async remove function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function remove(collectionName: string, filter: any): Promise<boolean> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  const result = await collection.deleteOne(filter);
  return result.deletedCount > 0;
}

// Async count function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function count(collectionName: string, filter: any = {}): Promise<number> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  return await collection.countDocuments(filter);
}

// Aggregation helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aggregate(collectionName: string, pipeline: any[]): Promise<any[]> {
  const database = getDatabase();
  const collection = database.collection(collectionName);
  
  const results = await collection.aggregate(pipeline).toArray();
  
  return results.map((doc: any) => {
    const result: any = { ...doc };
    if (result._id && typeof result._id === 'object') {
      result._id = result._id.toString();
    }
    return result;
  });
}

// ObjectId helper
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

export function fromObjectId(id: ObjectId): string {
  return id.toString();
}

// Close connection
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    global.__mongoClient = null;
    global.__mongoDb = null;
    global.__mongoIndexesReady = false;
  }
}

// Re-export ObjectId for use in other files
export { ObjectId };
