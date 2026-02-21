import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase, queryOneAsync, aggregate, ObjectId } from '@/lib/db';
import { getPlanCapabilities, resolvePlanShape } from '@/lib/subscription';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
export const dynamic = 'force-dynamic';

function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return payload;
  } catch {
    return null;
  }
}

interface TrendPoint {
  date: string;
  revenue: number;
  sales: number;
}

function parsePeriodDays(period: string | null): number {
  const parsed = Number.parseInt(period || '30', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 365);
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateGrowth(current: number, previous: number): number {
  if (previous > 0) {
    return ((current - previous) / previous) * 100;
  }
  if (current > 0) {
    return 100;
  }
  return 0;
}

async function resolvePlanByIdentifier(identifier: string | undefined) {
  if (!identifier) return null;

  let plan = await queryOneAsync('subscriptionPlans', { _id: identifier });
  if (!plan && ObjectId.isValid(identifier)) {
    plan = await queryOneAsync('subscriptionPlans', { _id: new ObjectId(identifier) });
  }
  if (!plan) {
    plan = await queryOneAsync('subscriptionPlans', { name: identifier });
  }

  return plan;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const business = await queryOneAsync('businesses', { userId: user.userId });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessId = business._id;
    const url = new URL(request.url);
    const requestedDays = parsePeriodDays(url.searchParams.get('period'));

    const activeSubscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });
    const activePlan = activeSubscription ? await resolvePlanByIdentifier(activeSubscription.planId) : { name: 'free' };
    const activePlanShape = resolvePlanShape(activePlan);
    const capabilities = getPlanCapabilities(activePlanShape);
    const days = Math.min(requestedDays, capabilities.maxAnalyticsPeriodDays);
    const canViewMonthly = capabilities.analyticsLevel === 'full';

    // Get date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Revenue overview
    const revenueOverview = await aggregate('sales', [
      { $match: { businessId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    // Revenue by day
    const revenueByDay = await aggregate('sales', [
      { $match: { businessId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, revenue: { $sum: '$total' }, sales: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const dailyDataMap = new Map<string, { revenue: number; sales: number }>();
    revenueByDay.forEach((row: any) => {
      dailyDataMap.set(row._id, {
        revenue: Number(row.revenue) || 0,
        sales: Number(row.sales) || 0
      });
    });

    const salesTrendDaily: TrendPoint[] = [];
    const dateCursor = new Date(startDate);
    while (dateCursor <= endDate) {
      const dateKey = formatDateKey(dateCursor);
      const point = dailyDataMap.get(dateKey);
      salesTrendDaily.push({
        date: dateKey,
        revenue: point?.revenue || 0,
        sales: point?.sales || 0
      });
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    const salesTrendMonthly: TrendPoint[] = canViewMonthly
      ? (
          await aggregate('sales', [
            { $match: { businessId, date: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, revenue: { $sum: '$total' }, sales: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ])
        ).map((m: any) => ({
          date: `${m._id}-01`,
          revenue: Number(m.revenue) || 0,
          sales: Number(m.sales) || 0
        }))
      : [];

    // Top products
    const topProducts = await aggregate('sales', [
      { $match: { businessId, date: { $gte: startDate, $lte: endDate } } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$productId', name: { $first: '$product.name' }, total: { $sum: '$total' }, quantity: { $sum: '$quantity' } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Category breakdown
    const categoryBreakdown = await aggregate('sales', [
      { $match: { businessId, date: { $gte: startDate, $lte: endDate } } },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: '$product.category', revenue: { $sum: '$total' }, sales: { $sum: 1 } } },
      { $sort: { revenue: -1 } }
    ]);

    // Growth comparison
    const prevEndDate = new Date(startDate);
    prevEndDate.setMilliseconds(-1);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const currentPeriodRevenue = Number(revenueOverview[0]?.total) || 0;
    const currentPeriodSales = Number(revenueOverview[0]?.count) || 0;
    
    const previousPeriodOverview = await aggregate('sales', [
      { $match: { businessId, date: { $gte: prevStartDate, $lte: prevEndDate } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);
    const previousPeriodRevenue = Number(previousPeriodOverview[0]?.total) || 0;
    const previousPeriodSales = Number(previousPeriodOverview[0]?.count) || 0;
    
    const revenueGrowth = calculateGrowth(currentPeriodRevenue, previousPeriodRevenue);
    const salesGrowth = calculateGrowth(currentPeriodSales, previousPeriodSales);

    const overview = {
      totalRevenue: currentPeriodRevenue,
      totalSales: currentPeriodSales,
      growth: Number(revenueGrowth.toFixed(1))
    };

    const averageOrderValue = currentPeriodSales > 0 ? currentPeriodRevenue / currentPeriodSales : 0;
    const averageRevenuePerDay = days > 0 ? currentPeriodRevenue / days : 0;

    const topProductsData = topProducts.map((p: any) => ({
      id: p._id,
      name: p.name || 'Unknown',
      revenue: Number(p.total) || 0,
      quantity: Number(p.quantity) || 0,
      totalRevenue: Number(p.total) || 0,
      totalSold: Number(p.quantity) || 0,
      revenueSharePercent: currentPeriodRevenue > 0 ? ((Number(p.total) || 0) / currentPeriodRevenue) * 100 : 0
    }));

    const bestDay = salesTrendDaily.reduce<TrendPoint | null>((best, point) => {
      if (!best || point.revenue > best.revenue) return point;
      return best;
    }, null);

    const bestMonth = salesTrendMonthly.reduce<TrendPoint | null>((best, point) => {
      if (!best || point.revenue > best.revenue) return point;
      return best;
    }, null);

    const monthlyComparison = salesTrendMonthly.map((point) => ({
      month: point.date.slice(0, 7),
      revenue: point.revenue,
      sales: point.sales
    }));

    const growthComparison = {
      current: {
        revenue: currentPeriodRevenue,
        sales: currentPeriodSales,
        averageOrderValue
      },
      previous: {
        revenue: previousPeriodRevenue,
        sales: previousPeriodSales,
        averageOrderValue: previousPeriodSales > 0 ? previousPeriodRevenue / previousPeriodSales : 0
      },
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      salesGrowth: Number(salesGrowth.toFixed(1))
    };

    return NextResponse.json({
      overview,
      stats: overview,
      revenueByDay: salesTrendDaily,
      revenueData: salesTrendDaily,
      topProducts: topProductsData,
      salesTrends: salesTrendDaily,
      salesTrendDaily,
      salesTrendMonthly,
      monthlyComparison,
      revenueSummary: {
        totalRevenue: currentPeriodRevenue,
        totalSales: currentPeriodSales,
        averageOrderValue,
        averageRevenuePerDay,
        bestDay: bestDay
          ? {
              date: bestDay.date,
              revenue: bestDay.revenue,
              sales: bestDay.sales
            }
          : null,
        bestMonth: bestMonth
          ? {
              month: bestMonth.date.slice(0, 7),
              revenue: bestMonth.revenue,
              sales: bestMonth.sales
            }
          : null
      },
      growthComparison,
      access: {
        planName: activePlanShape.displayName,
        analyticsLevel: capabilities.analyticsLevel,
        maxAnalyticsPeriodDays: capabilities.maxAnalyticsPeriodDays,
        canViewMonthly,
        canUseAIInsights: capabilities.aiInsightsEnabled
      },
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
        requestedDays
      },
      categoryBreakdown: categoryBreakdown.map((c: any) => ({
        category: c._id || 'Uncategorized',
        revenue: Number(c.revenue) || 0,
        sales: Number(c.sales) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
