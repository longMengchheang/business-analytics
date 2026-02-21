// Database initialization script for MongoDB
// Run this script to set up the initial data

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'smart-business-analytics';

console.log('Connecting to:', MONGODB_URI);

async function initializeDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    console.log('Connected to MongoDB');
    
    // Create collections
    const collections = ['users', 'businesses', 'products', 'sales', 'subscriptions', 'subscriptionPlans'];
    
    for (const coll of collections) {
      const exists = await db.listCollections({ name: coll }).hasNext();
      if (!exists) {
        await db.createCollection(coll);
        console.log(`Created collection: ${coll}`);
      }
    }
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('Created index on users.email');
    
    await db.collection('businesses').createIndex({ userId: 1 });
    console.log('Created index on businesses.userId');
    
    await db.collection('products').createIndex({ businessId: 1 });
    await db.collection('products').createIndex({ category: 1 });
    console.log('Created indexes on products');
    
    await db.collection('sales').createIndex({ businessId: 1 });
    await db.collection('sales').createIndex({ productId: 1 });
    await db.collection('sales').createIndex({ date: -1 });
    console.log('Created indexes on sales');
    
    await db.collection('subscriptions').createIndex({ userId: 1 });
    await db.collection('subscriptions').createIndex({ status: 1 });
    console.log('Created indexes on subscriptions');
    
    await db.collection('subscriptionPlans').createIndex({ name: 1 }, { unique: true });
    console.log('Created index on subscriptionPlans.name');
    
    // Insert default subscription plans
    const plans = await db.collection('subscriptionPlans').find({}).toArray();
    if (plans.length === 0) {
      await db.collection('subscriptionPlans').insertMany([
        {
          name: 'free',
          displayName: 'Free',
          description: 'Basic analytics for small businesses',
          priceMonthly: 0,
          priceYearly: 0,
          maxProducts: 10,
          maxSalesPerMonth: 100,
          analyticsLevel: 'basic',
          exportEnabled: false,
          aiInsights: false,
          supportLevel: 'email',
          features: JSON.stringify([
            'Up to 10 products',
            '100 sales per month',
            'Basic analytics',
            'Email support'
          ]),
          isActive: true,
          createdAt: new Date()
        },
        {
          name: 'pro',
          displayName: 'Pro',
          description: 'Full analytics for growing businesses',
          priceMonthly: 29,
          priceYearly: 290,
          maxProducts: 100,
          maxSalesPerMonth: 10000,
          analyticsLevel: 'full',
          exportEnabled: false,
          aiInsights: false,
          supportLevel: 'priority',
          features: JSON.stringify([
            'Up to 100 products',
            '10,000 sales per month',
            'Advanced analytics',
            'Priority support'
          ]),
          isActive: true,
          createdAt: new Date()
        },
        {
          name: 'business',
          displayName: 'Business',
          description: 'AI-powered analytics for serious businesses',
          priceMonthly: 79,
          priceYearly: 790,
          maxProducts: -1,
          maxSalesPerMonth: -1,
          analyticsLevel: 'full',
          exportEnabled: true,
          aiInsights: true,
          supportLevel: 'dedicated',
          features: JSON.stringify([
            'Unlimited products',
            'Unlimited sales',
            'Full analytics',
            'Report export',
            'AI insights',
            'Dedicated support'
          ]),
          isActive: true,
          createdAt: new Date()
        }
      ]);
      console.log('Inserted default subscription plans');
    }
    
    // Create default admin user
    const adminExists = await db.collection('users').findOne({ email: 'admin@analytics.com' });
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      await db.collection('users').insertOne({
        email: 'admin@analytics.com',
        passwordHash: adminPassword,
        name: 'Admin',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created default admin user');
    }
    
    console.log('\nDatabase initialization complete!');
    console.log('Default admin credentials:');
    console.log('  Email: admin@analytics.com');
    console.log('  Password: admin123');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.close();
  }
}

initializeDatabase();
