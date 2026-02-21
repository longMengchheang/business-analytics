'use client';

import React, { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { SalesTrendChart } from '@/components/charts/SalesTrendChart';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalSales: number;
    growth: number | string;
  };
  revenueByDay: { date: string; revenue: number; sales: number }[];
  topProducts: { id: string; name: string; revenue: number; quantity: number }[];
}

interface ProductData {
  id: string;
}

interface RecentSale {
  id: string;
  productName: string;
  total: number;
  date: string;
}

interface SubscriptionData {
  planName: string;
  status: string;
  capabilities?: {
    analyticsLevel: 'limited' | 'full';
    aiInsightsEnabled: boolean;
  };
}

interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'recommendation';
  title: string;
  message: string;
  action?: string | null;
}

interface AIInsightsPayload {
  insights: AIInsight[];
  healthScore: number;
  summary?: {
    performanceSummary?: string;
    weeklyGrowth?: string;
  };
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsightsPayload | null>(null);
  const [aiInsightsMessage, setAiInsightsMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [analyticsRes, salesRes, productsRes, subscriptionRes] = await Promise.all([
          fetch('/api/analytics?period=30', { cache: 'no-store' }),
          fetch('/api/sales?limit=5', { cache: 'no-store' }),
          fetch('/api/products', { cache: 'no-store' }),
          fetch('/api/subscription', { cache: 'no-store' })
        ]);

        if (!analyticsRes.ok || !salesRes.ok || !productsRes.ok || !subscriptionRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const analyticsJson = await analyticsRes.json();
        const salesJson = await salesRes.json();
        const productsJson = await productsRes.json();
        const subscriptionJson = await subscriptionRes.json();

        if (!mounted) return;

        setAnalytics(analyticsJson);
        setRecentSales(Array.isArray(salesJson.sales) ? salesJson.sales : []);
        const products = Array.isArray(productsJson.products) ? (productsJson.products as ProductData[]) : [];
        setTotalProducts(products.length);
        setSubscription(subscriptionJson.subscription || null);
        setAiInsights(null);
        setAiInsightsMessage('');

        const aiRes = await fetch('/api/ai-insights', { cache: 'no-store' });
        const aiPayload = await aiRes.json().catch(() => ({}));
        if (!mounted) return;
        if (aiRes.ok) {
          setAiInsights(aiPayload);
        } else if (aiRes.status === 403 && aiPayload?.upgradeRequired) {
          setAiInsightsMessage('Upgrade to Business plan to unlock AI-generated insights.');
        } else if (aiPayload?.error) {
          setAiInsightsMessage(aiPayload.error);
        }

        setError('');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const growth = Number(analytics?.overview?.growth || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-slate-500">Welcome back! Here's an overview of your business performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.overview?.totalRevenue || 0)}
          change={growth}
          icon="revenue"
        />
        <StatCard
          title="Total Sales"
          value={analytics?.overview?.totalSales || 0}
          icon="sales"
        />
        <StatCard
          title="Products"
          value={totalProducts}
          icon="products"
        />
        <StatCard
          title="Growth"
          value={`${growth.toFixed(1)}%`}
          icon="growth"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Current Plan</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
                {subscription?.planName || 'Free'}
              </p>
              <div className="mt-3">
                <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                  {subscription?.status || 'inactive'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
              <p className="flex justify-between">
                <span>Analytics:</span> 
                <span className="font-semibold text-slate-900">{subscription?.capabilities?.analyticsLevel === 'full' ? 'Full' : 'Limited'}</span>
              </p>
              <p className="flex justify-between">
                <span>AI Insights:</span> 
                <span className="font-semibold text-slate-900">{subscription?.capabilities?.aiInsightsEnabled ? 'Enabled' : 'Not available'}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={analytics?.revenueByDay || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={analytics?.revenueByDay || []} granularity="daily" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.topProducts?.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-semibold ring-1 ring-inset ring-primary-500/10">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-900">{product.name}</span>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrency(product.revenue)}</span>
              </div>
            ))}
            {(!analytics?.topProducts || analytics.topProducts.length === 0) && (
              <p className="text-slate-500 text-center py-6 text-sm">No products yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Insights (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          {aiInsights ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/60 bg-white shadow-sm p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 -mt-4 -mr-4 w-24 h-24 bg-primary-50 rounded-full blur-2xl pointer-events-none"></div>
                <p className="text-sm font-medium text-slate-500 relative z-10">Business Health Score</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight relative z-10">{aiInsights.healthScore}/100</p>
                {aiInsights.summary?.performanceSummary && (
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed relative z-10">{aiInsights.summary.performanceSummary}</p>
                )}
              </div>
              <div className="space-y-4">
                {aiInsights.insights.map((insight, index) => (
                  <div key={`${insight.title}-${index}`} className="group rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>
                    <p className="font-bold text-slate-900">{insight.title}</p>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{insight.message}</p>
                  </div>
                ))}
                {aiInsights.insights.length === 0 && (
                  <p className="text-sm text-slate-500 italic py-2">No AI insights at the moment.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 bg-slate-50/50 text-center">
              {aiInsightsMessage || 'AI insights are optional and can be enabled with Business plan.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Product</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium text-slate-900">{sale.productName}</TableCell>
                  <TableCell className="font-semibold text-slate-700">{formatCurrency(sale.total)}</TableCell>
                  <TableCell className="text-slate-500">{formatDate(sale.date)}</TableCell>
                  <TableCell>
                    <Badge variant="success">Completed</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-8 text-sm">
                    No sales recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
