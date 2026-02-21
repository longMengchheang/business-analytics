'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SalesTrendChart } from '@/components/charts/SalesTrendChart';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/utils';

interface TrendPoint {
  date: string;
  revenue: number;
  sales: number;
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  revenueSharePercent?: number;
}

interface RevenueSummary {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  averageRevenuePerDay: number;
  bestDay: { date: string; revenue: number; sales: number } | null;
  bestMonth: { month: string; revenue: number; sales: number } | null;
}

interface GrowthComparison {
  current: {
    revenue: number;
    sales: number;
    averageOrderValue: number;
  };
  previous: {
    revenue: number;
    sales: number;
    averageOrderValue: number;
  };
  revenueGrowth: number;
  salesGrowth: number;
}

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalSales: number;
    growth: number | string;
  };
  revenueByDay: TrendPoint[];
  salesTrendDaily?: TrendPoint[];
  salesTrendMonthly?: TrendPoint[];
  topProducts: TopProduct[];
  revenueSummary?: RevenueSummary;
  growthComparison?: GrowthComparison;
  access?: {
    planName: string;
    analyticsLevel: 'limited' | 'full';
    maxAnalyticsPeriodDays: number;
    canViewMonthly: boolean;
    canUseAIInsights: boolean;
  };
  range?: {
    days: number;
    requestedDays: number;
  };
}

interface SubscriptionStatus {
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
}

interface AIInsightsPayload {
  insights: AIInsight[];
  healthScore: number;
  summary?: {
    performanceSummary?: string;
  };
}

function formatDailyLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthlyLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30');
  const [trendView, setTrendView] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsightsPayload | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics?period=${period}`, { cache: 'no-store' }),
      fetch('/api/subscription', { cache: 'no-store' }),
      fetch('/api/ai-insights', { cache: 'no-store' })
    ])
      .then(async ([analyticsRes, subscriptionRes, aiRes]) => {
        if (!analyticsRes.ok) {
          const payload = await analyticsRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to fetch analytics');
        }

        const analyticsPayload = await analyticsRes.json();
        setData(analyticsPayload);

        if (subscriptionRes.ok) {
          const subscriptionPayload = await subscriptionRes.json();
          setSubscription(subscriptionPayload.subscription || null);
        }

        if (aiRes.ok) {
          const aiPayload = await aiRes.json();
          setAiInsights(aiPayload);
          setAiMessage('');
        } else {
          const aiPayload = await aiRes.json().catch(() => ({}));
          setAiInsights(null);
          if (aiRes.status === 403 && aiPayload?.upgradeRequired) {
            setAiMessage('Upgrade to Business plan to unlock AI-generated insights.');
          } else {
            setAiMessage(aiPayload.error || 'AI insights are currently unavailable.');
          }
        }

        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [period]);

  const trendData = useMemo(() => {
    if (!data) return [];
    if (trendView === 'monthly' && data.access?.canViewMonthly) {
      return data.salesTrendMonthly || [];
    }
    return data.salesTrendDaily || data.revenueByDay || [];
  }, [data, trendView]);

  const summary = data?.revenueSummary;
  const growth = Number(data?.growthComparison?.revenueGrowth ?? data?.overview?.growth ?? 0);
  const salesGrowth = Number(data?.growthComparison?.salesGrowth ?? 0);
  const currentRevenue = data?.growthComparison?.current.revenue ?? data?.overview?.totalRevenue ?? 0;
  const currentSales = data?.growthComparison?.current.sales ?? data?.overview?.totalSales ?? 0;
  const previousRevenue = data?.growthComparison?.previous.revenue ?? 0;
  const previousSales = data?.growthComparison?.previous.sales ?? 0;
  const monthlyViewEnabled = data?.access?.canViewMonthly ?? true;

  if (error && !loading) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="mt-1 text-slate-500">
            Track your business performance and trends. Plan: <span className="font-medium text-slate-700">{data?.access?.planName || 'Free'}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex space-x-2">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p.toString())}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.toString()
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p} Days
            </button>
          ))}
          </div>
          {data?.range && data.range.requestedDays > data.range.days && (
            <p className="text-xs text-amber-600">
              Your plan supports up to {data.range.days} days, so period was adjusted automatically.
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-slate-500">Subscription Status</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
                {subscription?.planName || data?.access?.planName || 'Free'}
              </p>
              <p className="mt-2 text-sm text-slate-600 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${subscription?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                Status: <span className="capitalize">{subscription?.status || 'active'}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Analytics Level: <span className="font-medium text-slate-900">{subscription?.capabilities?.analyticsLevel === 'full' ? 'Full' : 'Limited'}</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-slate-500">AI Insights (Optional)</p>
              {aiInsights ? (
                <>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">
                    Health Score: {aiInsights.healthScore}<span className="text-lg text-slate-500 font-medium">/100</span>
                  </p>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {aiInsights.summary?.performanceSummary || 'Insights are generated from your latest sales performance.'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600 italic">
                  {aiMessage || 'Enable Business plan to access AI-generated recommendations.'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Summaries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50/80 p-5 border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(summary?.totalRevenue ?? data?.overview?.totalRevenue ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-5 border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500">Total Sales</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                {summary?.totalSales ?? data?.overview?.totalSales ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-5 border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500">Avg. Order Value</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(
                  summary?.averageOrderValue ??
                    ((data?.overview?.totalRevenue ?? 0) / Math.max(1, data?.overview?.totalSales ?? 0))
                )}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 p-5 border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500">Avg. Revenue / Day</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(summary?.averageRevenuePerDay ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm">
              <p className="text-sm font-medium text-slate-500">Best Day</p>
              <p className="mt-2 font-bold text-slate-900 tracking-tight">
                {summary?.bestDay ? formatDailyLabel(summary.bestDay.date) : 'No data'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.bestDay
                  ? <><span className="font-medium text-slate-700">{formatCurrency(summary.bestDay.revenue)}</span> from {summary.bestDay.sales} sales</>
                  : 'Record sales to view this insight'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm">
              <p className="text-sm font-medium text-slate-500">Best Month</p>
              <p className="mt-2 font-bold text-slate-900 tracking-tight">
                {summary?.bestMonth ? formatMonthlyLabel(summary.bestMonth.month) : 'No data'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {summary?.bestMonth
                  ? <><span className="font-medium text-slate-700">{formatCurrency(summary.bestMonth.revenue)}</span> from {summary.bestMonth.sales} sales</>
                  : 'Record sales to view this insight'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales Trend Analysis</CardTitle>
            <div className="flex space-x-2">
              {(['daily', 'monthly'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    if (view === 'monthly' && !monthlyViewEnabled) return;
                    setTrendView(view);
                  }}
                  disabled={view === 'monthly' && !monthlyViewEnabled}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors ${
                    trendView === view
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  } ${view === 'monthly' && !monthlyViewEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {!monthlyViewEnabled && (
              <p className="mb-3 text-xs text-amber-600">
                Monthly view is available on Pro and Business plans.
              </p>
            )}
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <SalesTrendChart data={trendData} granularity={trendView === 'monthly' && monthlyViewEnabled ? 'monthly' : 'daily'} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>Revenue</TableHeader>
                  <TableHeader>Sold</TableHeader>
                  <TableHeader>Revenue Share</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.topProducts?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell className="text-slate-700">{product.quantity}</TableCell>
                    <TableCell className="text-slate-500">
                      {`${(product.revenueSharePercent ?? 0).toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.topProducts || data.topProducts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Growth Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="text-center p-5 bg-slate-50/80 rounded-xl border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500 mb-2">Revenue Growth</p>
              <p className={`text-3xl font-extrabold tracking-tight ${growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-5 bg-slate-50/80 rounded-xl border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500 mb-2">Sales Growth</p>
              <p className={`text-3xl font-extrabold tracking-tight ${salesGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500 mb-2">Current Period</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(currentRevenue)}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{currentSales} sales</p>
            </div>
            <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-100/50">
              <p className="text-sm font-medium text-slate-500 mb-2">Previous Period</p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(previousRevenue)}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{previousSales} sales</p>
            </div>
          </div>
          <div className="mt-5 text-sm font-medium text-slate-500">
            Comparing the last {period} days against the previous {period} days.
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm">
              <p className="text-sm font-medium text-slate-500">Current Avg. Order Value</p>
              <p className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(data?.growthComparison?.current.averageOrderValue ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/60 p-5 bg-white shadow-sm">
              <p className="text-sm font-medium text-slate-500">Previous Avg. Order Value</p>
              <p className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(data?.growthComparison?.previous.averageOrderValue ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
