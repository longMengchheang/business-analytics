const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'analytics.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Businesses table
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    address TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Subscription plans table
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly REAL NOT NULL,
    price_yearly REAL NOT NULL,
    max_products INTEGER NOT NULL,
    max_users INTEGER NOT NULL,
    analytics_level TEXT DEFAULT 'basic' CHECK(analytics_level IN ('basic', 'full', 'advanced')),
    export_enabled INTEGER DEFAULT 0,
    api_access INTEGER DEFAULT 0,
    priority_support INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Subscriptions table
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'expired', 'trialing')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'yearly')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
  );

  -- Products table
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    sku TEXT,
    price REAL NOT NULL,
    cost REAL,
    unit TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  -- Sales table
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    payment_method TEXT,
    notes TEXT,
    sale_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  -- Analytics summary table
  CREATE TABLE IF NOT EXISTS analytics_summary (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL UNIQUE,
    period_date TEXT NOT NULL,
    total_revenue REAL DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_products_sold INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    top_product_id TEXT,
    top_product_revenue REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (top_product_id) REFERENCES products(id) ON DELETE SET NULL
  );

  -- Sessions table
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
  CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
  CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, sale_date);
  CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_summary_business_date ON analytics_summary(business_id, period_date);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
`);

// Insert default subscription plans
const plans = [
  {
    id: 'plan_free',
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for getting started',
    price_monthly: 0,
    price_yearly: 0,
    max_products: 10,
    max_users: 1,
    analytics_level: 'basic',
    export_enabled: 0,
    api_access: 0,
    priority_support: 0
  },
  {
    id: 'plan_pro',
    name: 'pro',
    display_name: 'Pro',
    description: 'For growing businesses',
    price_monthly: 29,
    price_yearly: 290,
    max_products: 100,
    max_users: 5,
    analytics_level: 'full',
    export_enabled: 0,
    api_access: 0,
    priority_support: 0
  },
  {
    id: 'plan_business',
    name: 'business',
    display_name: 'Business',
    description: 'For large teams',
    price_monthly: 79,
    price_yearly: 790,
    max_products: -1,
    max_users: -1,
    analytics_level: 'advanced',
    export_enabled: 1,
    api_access: 1,
    priority_support: 1
  }
];

const insertPlan = db.prepare(`
  INSERT OR IGNORE INTO subscription_plans 
  (id, name, display_name, description, price_monthly, price_yearly, max_products, max_users, analytics_level, export_enabled, api_access, priority_support)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const plan of plans) {
  insertPlan.run(
    plan.id,
    plan.name,
    plan.display_name,
    plan.description,
    plan.price_monthly,
    plan.price_yearly,
    plan.max_products,
    plan.max_users,
    plan.analytics_level,
    plan.export_enabled,
    plan.api_access,
    plan.priority_support
  );
}

// Create default admin user
const { v4: uuidv4 } = require('uuid');
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@analytics.com');

if (!adminExists) {
  const adminId = uuidv4();
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin@analytics.com', passwordHash, 'Admin User', 'admin');
  
  console.log('Default admin user created: admin@analytics.com / admin123');
}

console.log('Database initialized successfully!');
console.log('Database path:', dbPath);

db.close();
