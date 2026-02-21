// User types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

// Business types
export interface Business {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  industry?: string;
  address?: string;
  phone?: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Product types
export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  price: number;
  cost?: number;
  unit?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Sales types
export interface Sale {
  id: string;
  business_id: string;
  product_id: string;
  product_name?: string;
  customer_name?: string;
  customer_email?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  discount: number;
  payment_method?: string;
  notes?: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  max_products: number;
  max_users: number;
  analytics_level: 'basic' | 'full' | 'advanced';
  export_enabled: boolean;
  api_access: boolean;
  priority_support: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  billing_cycle: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

// Analytics types
export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  growth: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  sales: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category?: string;
  totalRevenue: number;
  totalSold: number;
}

export interface SalesTrend {
  date: string;
  revenue: number;
  sales: number;
}

export interface AnalyticsOverview {
  stats: DashboardStats;
  revenueData: RevenueData[];
  topProducts: TopProduct[];
  salesTrends: SalesTrend[];
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  revenueByMonth: { month: string; revenue: number }[];
  recentUsers: User[];
}

// AI Insights types
export interface SalesInsight {
  type: 'alert' | 'recommendation' | 'summary';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: number;
}

export interface BusinessHealthScore {
  score: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  factors: {
    name: string;
    value: number;
    weight: number;
  }[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ProductFormData {
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  price: number;
  cost?: number;
  unit?: string;
}

export interface SaleFormData {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  customer_name?: string;
  customer_email?: string;
  payment_method?: string;
  notes?: string;
  sale_date: string;
}

export interface BusinessFormData {
  name: string;
  description?: string;
  industry?: string;
  address?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
}
