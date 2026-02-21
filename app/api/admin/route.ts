import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase, query, queryOneAsync, aggregate, count, update } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').trim();
    const roleFilter = (url.searchParams.get('role') || '').trim();
    const limitRaw = Number.parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 50;

    // Get total users
    const totalUsersResult = await aggregate('users', [
      { $count: 'count' }
    ]);
    const totalUsers = totalUsersResult[0]?.count || 0;

    const adminUsersCount = await count('users', { role: 'admin' });
    const businessOwnerCount = await count('users', { role: 'user' });

    const userFilter: any = {};
    if (roleFilter === 'admin' || roleFilter === 'user') {
      userFilter.role = roleFilter;
    }
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const activeSubscriptions = await query('subscriptions', { status: 'active' });
    const activeSubCount = activeSubscriptions.length;

    const plans = await query('subscriptionPlans', {});
    const plansById = new Map(plans.map((plan: any) => [String(plan._id), plan]));
    const plansByName = new Map(plans.map((plan: any) => [String(plan.name), plan]));

    const resolvePlan = (planId: string) => plansById.get(String(planId)) || plansByName.get(String(planId));

    let monthlyRecurringRevenue = 0;
    const revenueByMonthMap = new Map<string, number>();
    const planDistributionMap = new Map<string, number>();

    for (const subscription of activeSubscriptions) {
      const plan = resolvePlan(subscription.planId);
      if (!plan) continue;

      const monthlyPrice = Number(plan.priceMonthly || 0);
      monthlyRecurringRevenue += monthlyPrice;
      const planName = String(plan.displayName || plan.name || 'Unknown');
      planDistributionMap.set(planName, (planDistributionMap.get(planName) || 0) + 1);

      const start = new Date(subscription.startDate || Date.now());
      const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonthMap.set(monthKey, (revenueByMonthMap.get(monthKey) || 0) + monthlyPrice);
    }

    const salesRevenueResult = await aggregate('sales', [{ $group: { _id: null, total: { $sum: '$total' } } }]);
    const totalSalesRevenue = Number(salesRevenueResult[0]?.total || 0);
    const totalPlatformRevenue = monthlyRecurringRevenue + totalSalesRevenue;
    const totalBusinesses = await count('businesses', {});
    const totalProducts = await count('products', {});
    const totalSalesRecords = await count('sales', {});
    const averageRevenuePerUser = totalUsers > 0 ? totalPlatformRevenue / totalUsers : 0;
    const subscriptionPenetration = totalUsers > 0 ? (activeSubCount / totalUsers) * 100 : 0;

    // Get users for management list
    const recentUsers = await query('users', userFilter, { sort: { createdAt: -1 }, limit });
    const filteredUsers = await count('users', userFilter);

    const revenueOverTime = Array.from(revenueByMonthMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6);

    // Get users by role
    const usersByRole = await aggregate('users', [
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalRevenue: totalPlatformRevenue,
        monthlyRecurringRevenue,
        totalSalesRevenue,
        activeSubscriptions: activeSubCount,
        revenueGrowth: 0,
        adminUsers: adminUsersCount,
        businessOwners: businessOwnerCount
      },
      recentUsers: recentUsers.map((u: any) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        created_at: u.createdAt
      })),
      revenueOverTime: revenueOverTime.map((r: any) => ({
        month: r.month,
        revenue: r.revenue
      })),
      revenueByMonth: revenueOverTime.map((r: any) => ({
        month: r.month,
        revenue: r.revenue
      })),
      usersByRole: usersByRole.map((r: any) => ({
        role: r._id,
        count: r.count
      })),
      planDistribution: Array.from(planDistributionMap.entries()).map(([planName, count]) => ({
        planName,
        count
      })),
      systemAnalytics: {
        totalBusinesses,
        totalProducts,
        totalSalesRecords,
        averageRevenuePerUser,
        subscriptionPenetration: Number(subscriptionPenetration.toFixed(1))
      },
      userManagement: {
        search,
        roleFilter: roleFilter || 'all',
        filteredUsers,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const adminUser = getUserFromRequest(request);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role } = body as { userId?: string; role?: string };

    if (!userId || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Valid userId and role are required' }, { status: 400 });
    }

    const targetUser = await queryOneAsync('users', { _id: userId });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (String(targetUser._id) === String(adminUser.userId)) {
      return NextResponse.json({ error: 'Cannot modify current admin session' }, { status: 400 });
    }

    if (targetUser.role === 'admin' && role === 'user') {
      const adminCount = await count('users', { role: 'admin' });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'At least one admin is required' }, { status: 400 });
      }
    }

    const success = await update('users', { _id: userId }, { role, updatedAt: new Date() });
    if (!success) {
      return NextResponse.json({ error: 'No user changes applied' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
