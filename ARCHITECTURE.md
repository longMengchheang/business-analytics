# Smart Business Analytics SaaS Platform - Architecture Specification

**Version:** 1.0  
**Date:** 2026-02-20  
**Technology Stack:** Next.js 14 + SQL.js (SQLite) + TypeScript  
**Status:** Implementation Complete

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Database Schema](#3-database-schema)
4. [API Endpoints Structure](#4-api-endpoints-structure)
5. [Frontend Component Hierarchy](#5-frontend-component-hierarchy)
6. [Security Considerations](#6-security-considerations)
7. [Technology Stack Details](#7-technology-stack-details)

---

## 1. System Architecture Overview

### 1.1 Platform Purpose

A web-based SaaS platform enabling small businesses to track performance metrics, analyze sales trends, manage subscriptions, and gain actionable business insights through an intuitive dashboard interface.

### 1.2 Core Features (v1)

| Feature | Description |
|---------|-------------|
| Data Analysis | Sales trends, revenue summaries, growth comparison (daily/monthly), top-performing products/services |
| User Dashboard | Business owner stats, revenue charts, subscription status |
| Admin Dashboard | Total users, total revenue, active subscriptions, system analytics, user management |
| Subscription Plans | Free (limited analytics), Pro (full analytics), Business (exports + API) |
| AI Insights | Sales drop alerts, price recommendations, auto performance summaries |
| Payment Integration | Stripe subscription management |

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Backend | Next.js API Routes |
| Database | SQLite via SQL.js |
| Authentication | JWT with bcrypt password hashing |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Icons | Lucide React |

---

## 2. System Architecture Diagram

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Next.js)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐│
│  │   Auth Pages    │  │  Dashboard      │  │     API Routes              ││
│  │  - Login        │  │  - Overview     │  │     - /api/auth             ││
│  │  - Register     │  │  - Analytics    │  │     - /api/business          ││
│  │                 │  │  - Products     │  │     - /api/products          ││
│  │                 │  │  - Sales        │  │     - /api/sales             ││
│  │                 │  │  - Settings     │  │     - /api/analytics         ││
│  │                 │  │  - Admin        │  │     - /api/admin             ││
│  └─────────────────┘  └────────┬────────┘  └──────────────┬──────────────┘│
└─────────────────────────────────┼──────────────────────────┼───────────────┘
                                  │                          │
                                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS SERVER RUNTIME                              │
│                    API Routes + Server Components                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Authentication Layer                              │   │
│  │  - JWT Token Validation    - Session Management    - Role Checking  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Business Logic Layer                             │   │
│  │  - Auth Service  - Business Service  - Analytics Service            │   │
│  │  - Product Service - Sales Service   - Subscription Service         │   │
│  │  - AI Insights Service - Admin Service - Payment Service           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SQLite Database (sql.js)                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │  Users   │ │ Business │ │ Products │ │  Sales   │ │Sessions │   │    │
│  │  │   Table  │ │  Table   │ │  Table   │ │  Table   │ │  Table  │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │ SubPlans │ │   Subs   │ │Sessions │ │         │               │    │
│  │  │  Table   │ │  Table   │ │  Table   │ │         │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow Diagram

```
User Action
     │
     ▼
┌──────────────────────────┐
│  Next.js Page/Component  │
│  (React Client)          │
└───────────┬──────────────┘
            │ API Call (fetch)
            ▼
┌──────────────────────────┐
│  Next.js API Route      │
│  (app/api/*/route.ts)    │
└───────────┬──────────────┘
            │ Request
            ▼
┌──────────────────────────┐
│  Authentication Check    │
│  (JWT Token Validation)  │
└───────────┬──────────────┘
            │ Authenticated
            ▼
┌──────────────────────────┐
│  Business Logic          │
│  (Service Functions)     │
└───────────┬──────────────┘
            │ Data Request
            ▼
┌──────────────────────────┐
│  Database Layer          │
│  (lib/db.ts queries)     │
└───────────┬──────────────┘
            │ Query Results
            ▼
┌──────────────────────────┐
│  JSON Response           │
│  → Client Update         │
└──────────────────────────┘
```

### 2.3 Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Login     │ │  Dashboard  │ │  Analytics  │ │  Admin    │ │
│  │   Page      │ │   Page      │ │    Page     │ │  Page     │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘ │
└─────────┼───────────────┼───────────────┼───────────────┼───────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES LAYER                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ /api/auth   │ │/api/business │ │/api/analytics│ │/api/admin │ │
│  │ - login     │ │- CRUD       │ │- stats      │ │- users    │ │
│  │ - register  │ │             │ │- trends     │ │- stats    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │/api/products│ │ /api/sales  │ │/api/subscription│ │/api/payment│ │
│  │- CRUD       │ │- CRUD       │ │- plans      │ │- checkout │ │
│  │             │ │             │ │- current    │ │- webhook  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (lib/)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   auth.ts   │ │   db.ts     │ │stripe.ts    │ │ai-insights│ │
│  │ - hash      │ │ - query     │ │- checkout   │ │- analysis │ │
│  │ - token     │ │ - run       │ │- customer   │ │- alerts   │ │
│  │ - session   │ │ - init      │ │- portal     │ │- scoring  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (lib/db.ts)               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  initDb()  │  query()  │  queryOne()  │  run()  │ saveDb() │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  businesses  │       │subscription_plans│
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ user_id (FK) │       │ id (PK)      │
│ email        │       │ id (PK)      │       │ name         │
│ password_hash│       │ name         │       │ display_name │
│ name         │       │ industry     │       │ price_monthly│
│ role         │       │ created_at   │       │ price_yearly │
│ created_at   │       │ updated_at   │       │ max_products │
│ updated_at   │       └──────┬───────┘       │ max_users    │
└──────────────┘              │               │ analytics_level│
         │                    │               │ export_enabled│
         │                    │               │ is_active     │
         │                    │               └──────┬───────┘
         │                    │                      │
         │                    │               ┌──────▼───────┐
         │                    │               │ subscriptions│
         │                    │               ├──────────────┤
         │                    │               │ id (PK)      │
         │                    │               │ user_id (FK) │
         │                    │               │ plan_id (FK) │
         │                    │               │ status        │
         │                    │               │ billing_cycle │
         │                    │               │ start_date    │
         │                    │               │ end_date      │
         │                    │               └──────┬───────┘
         │                    │                      │
         ▼                    │                      │
┌──────────────┐             │                      │
│   sessions   │             │                      │
├──────────────┤             │                      │
│ id (PK)      │             │                      │
│ user_id (FK) │             │                      │
│ token        │             │                      │
│ ip_address   │             │                      │
│ user_agent   │             │                      │
│ expires_at   │             │                      │
└──────────────┘             │                      │
                             │                      │
┌──────────────┐            │                      │
│  products    │◄───────────┘                      │
├──────────────┤                                    │
│ id (PK)      │◄───────────────────────────────────┘
│ business_id  │
│ name         │
│ category     │
│ price        │
│ cost         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    sales     │
├──────────────┤
│ id (PK)      │
│ business_id  │
│ product_id   │
│ customer_name│
│ quantity     │
│ total_amount │
│ sale_date    │
│ created_at   │
└──────────────┘
```

### 3.2 Detailed Schema

#### 3.2.1 Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| email | TEXT | UNIQUE, NOT NULL | User email |
| password_hash | TEXT | NOT NULL | bcrypt hashed password |
| name | TEXT | NOT NULL | User full name |
| role | TEXT | DEFAULT 'user' | 'user' or 'admin' |
| created_at | TEXT | DEFAULT NOW() | Creation timestamp |
| updated_at | TEXT | DEFAULT NOW() | Last update |

#### 3.2.2 Businesses Table

```sql
CREATE TABLE businesses (
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
```

#### 3.2.3 Subscription Plans Table

```sql
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly REAL NOT NULL,
  price_yearly REAL NOT NULL,
  max_products INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  analytics_level TEXT DEFAULT 'basic',
  export_enabled INTEGER DEFAULT 0,
  api_access INTEGER DEFAULT 0,
  priority_support INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Plans:**

| Plan | Price (Monthly) | Max Products | Max Users | Analytics |
|------|-----------------|--------------|-----------|-----------|
| Free | $0 | 10 | 1 | Basic |
| Pro | $29 | 100 | 5 | Full |
| Business | $79 | Unlimited | Unlimited | Advanced |

#### 3.2.4 Subscriptions Table

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);
```

#### 3.2.5 Products Table

```sql
CREATE TABLE products (
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
```

#### 3.2.6 Sales Table

```sql
CREATE TABLE sales (
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
```

#### 3.2.7 Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Database Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_sales_business_date ON sales(business_id, sale_date);
```

---

## 4. API Endpoints Structure

### 4.1 API Versioning

```
Base URL: /api/v1 (implicit via Next.js)
```

### 4.2 Authentication Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| POST | /api/auth/register | [`app/api/auth/register/route.ts`](app/api/auth/register/route.ts) | Public |
| POST | /api/auth/login | [`app/api/auth/login/route.ts`](app/api/auth/login/route.ts) | Public |
| GET | /api/auth/me | Session-based | JWT |

### 4.3 Business Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/business | List user businesses | JWT |
| POST | /api/business | Create business | JWT |

### 4.4 Product Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/products | List products | JWT |
| POST | /api/products | Create product | JWT |
| PUT | /api/products | Update product | JWT |
| DELETE | /api/products | Delete product | JWT |

### 4.5 Sales Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/sales | List sales | JWT |
| POST | /api/sales | Create sale | JWT |
| PUT | /api/sales | Update sale | JWT |
| DELETE | /api/sales | Delete sale | JWT |

### 4.6 Analytics Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/analytics | Dashboard stats, revenue data, top products | JWT |

**Query Parameters:**
- `period`: number (default: 30 days)

**Response:**
```json
{
  "stats": {
    "totalRevenue": number,
    "totalSales": number,
    "totalProducts": number,
    "growth": number
  },
  "revenueData": [
    { "date": "2026-01-01", "revenue": 1500, "sales": 15 }
  ],
  "topProducts": [
    { "id": "uuid", "name": "Product A", "totalRevenue": 5000, "totalSold": 50 }
  ]
}
```

### 4.7 Subscription Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/subscription | Get current subscription | JWT |
| POST | /api/subscription | Create/subscribe to plan | JWT |
| PUT | /api/subscription | Update subscription | JWT |
| DELETE | /api/subscription | Cancel subscription | JWT |

### 4.8 Payment Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| POST | /api/payment | Create checkout session | JWT |
| POST | /api/payment/webhook | Stripe webhook handler | Stripe |

### 4.9 Admin Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/admin | Get admin statistics | Admin |

### 4.10 AI Insights Endpoints

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | /api/ai-insights | Get AI-generated insights | JWT |

---

## 5. Frontend Component Hierarchy

### 5.1 Page Structure

```
app/
├── page.tsx                          # Landing page (redirect)
│
├── (auth)/
│   ├── login/
│   │   └── page.tsx                  # Login page
│   └── register/
│       └── page.tsx                  # Register page
│
├── (dashboard)/
│   ├── layout.tsx                    # Dashboard layout (sidebar + header)
│   │
│   ├── page.tsx                      # User dashboard (overview)
│   │
│   ├── analytics/
│   │   └── page.tsx                  # Analytics page
│   │
│   ├── products/
│   │   └── page.tsx                  # Products management
│   │
│   ├── sales/
│   │   └── page.tsx                  # Sales management
│   │
│   ├── settings/
│   │   └── page.tsx                  # User settings
│   │
│   └── admin/
│       └── page.tsx                  # Admin dashboard
```

### 5.2 Component Architecture

```
src/
├── components/
│   ├── charts/
│   │   ├── RevenueChart.tsx          # Revenue bar chart
│   │   └── SalesTrendChart.tsx       # Sales trend line chart
│   │
│   ├── dashboard/
│   │   ├── Header.tsx                # Top navigation header
│   │   ├── Sidebar.tsx               # Left navigation sidebar
│   │   └── StatCard.tsx              # Statistic card component
│   │
│   ├── forms/
│   │   └── AuthForms.tsx             # Login/Register forms
│   │
│   └── ui/
│       ├── Badge.tsx                 # Status badge
│       ├── Button.tsx                # Button component
│       ├── Card.tsx                  # Card container
│       ├── Input.tsx                 # Form input
│       ├── Modal.tsx                 # Modal dialog
│       └── Table.tsx                 # Data table
│
├── lib/
│   ├── auth.ts                       # Authentication utilities
│   ├── db.ts                         # Database operations
│   ├── stripe.ts                     # Stripe integration
│   ├── ai-insights.ts                # AI insights logic
│   └── utils.ts                      # Utility functions
│
├── types/
│   └── index.ts                      # TypeScript type definitions
│
└── styles/
    └── globals.css                    # Global styles
```

### 5.3 Component Flow

**Authentication Flow:**
```
LoginPage
  └── AuthForms (Login)
        │
        ▼
   POST /api/auth/login
        │
        ▼
   Set JWT cookie + Redirect to Dashboard
```

**Dashboard Load Flow:**
```
DashboardPage
  │
  ├── useEffect → GET /api/analytics?period=30
  │
  ├── StatCard (Total Revenue)
  ├── StatCard (Total Sales)
  ├── StatCard (Total Products)
  ├── StatCard (Growth %)
  │
  ├── RevenueChart (Bar Chart)
  │
  ├── TopProducts (List)
  │
  └── RecentSales (Table)
```

---

## 6. Security Considerations

### 6.1 Authentication & Authorization

| Aspect | Implementation | Location |
|--------|----------------|----------|
| Password Hashing | bcrypt with cost factor 10 | [`lib/auth.ts:25`](lib/auth.ts:25) |
| JWT Token | HS256, 7-day expiry | [`lib/auth.ts:33`](lib/auth.ts:33) |
| Session Management | Server-side sessions with expiry | [`lib/auth.ts:77`](lib/auth.ts:77) |
| Role-Based Access | Admin/User roles | Dashboard routes |

### 6.2 API Security

| Layer | Implementation |
|-------|----------------|
| Input Validation | JSON schema validation in routes |
| SQL Injection | Parameterized queries via sql.js |
| CORS | Next.js default (same-origin) |
| Error Handling | Generic error messages |

### 6.3 Data Security

| Aspect | Implementation |
|--------|----------------|
| Password Storage | bcrypt hashed (never plaintext) |
| Token Storage | httpOnly cookies (JWT) |
| Database | SQLite file-based (local) |
| Environment | JWT_SECRET in env variables |

### 6.4 Security Best Practices

```typescript
// Password hashing (lib/auth.ts:25)
bcrypt.hash(password, 10)

// JWT signing (lib/auth.ts:33)
jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

// Parameterized queries (lib/db.ts:184)
query(sql, params)  // Prevents SQL injection
```

### 6.5 Recommended Enhancements (Production)

- Rate limiting on API routes
- CSRF protection
- Content Security Policy headers
- HTTPS enforcement
- Database encryption at rest
- Audit logging for all data changes

---

## 7. Technology Stack Details

### 7.1 Dependencies

```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "sql.js": "^1.10.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "recharts": "^2.12.0",
    "lucide-react": "^0.312.0",
    "stripe": "^14.14.0",
    "uuid": "^9.0.1"
  }
}
```

### 7.2 Project Scripts

| Script | Command | Description |
|--------|---------|-------------|
| dev | `next dev` | Start development server |
| build | `next build` | Build for production |
| start | `next start` | Start production server |
| db:init | `node scripts/init-db.js` | Initialize database |

### 7.3 File Structure

```
smart-business-analytics/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register)
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── admin/               # Admin dashboard
│   │   ├── analytics/           # Analytics page
│   │   ├── products/            # Products management
│   │   ├── sales/               # Sales management
│   │   ├── settings/             # Settings page
│   │   └── layout.tsx           # Dashboard layout
│   └── api/                     # API routes
│       ├── admin/
│       ├── ai-insights/
│       ├── analytics/
│       ├── auth/
│       ├── business/
│       ├── payment/
│       ├── products/
│       ├── sales/
│       └── subscription/
│
├── components/                   # React components
│   ├── charts/                  # Chart components
│   ├── dashboard/               # Dashboard layout
│   ├── forms/                   # Form components
│   └── ui/                      # UI components
│
├── lib/                         # Core libraries
│   ├── auth.ts                  # Authentication
│   ├── db.ts                    # Database
│   ├── stripe.ts                # Stripe integration
│   ├── ai-insights.ts           # AI insights
│   └── utils.ts                 # Utilities
│
├── types/                       # TypeScript types
│   └── index.ts
│
├── scripts/                     # Database scripts
│   └── init-db.js
│
└── data/                        # SQLite database
    └── analytics.db
```

---

## Appendix: Key Implementation Files

| File | Purpose |
|------|---------|
| [`lib/db.ts`](lib/db.ts) | Database initialization and queries |
| [`lib/auth.ts`](lib/auth.ts) | JWT and session management |
| [`app/api/auth/login/route.ts`](app/api/auth/login/route.ts) | Login endpoint |
| [`app/api/analytics/route.ts`](app/api/analytics/route.ts) | Analytics data endpoint |
| [`app/(dashboard)/layout.tsx`](app/(dashboard)/layout.tsx) | Dashboard layout with auth |
| [`types/index.ts`](types/index.ts) | TypeScript type definitions |

---

*Document Version: 1.0*  
*Last Updated: 2026-02-20*  
*Project: Smart Business Analytics SaaS Platform*
