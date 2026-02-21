'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { formatCurrency, formatDate } from '@/lib/utils';

type AdminTab = 'overview' | 'users' | 'system' | 'revenue' | 'pricing';

interface AdminData {
  stats: {
    totalUsers: number;
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    totalSalesRevenue: number;
    activeSubscriptions: number;
    adminUsers: number;
    businessOwners: number;
  };
  revenueOverTime: { month: string; revenue: number }[];
  recentUsers: { id: string; name: string; email: string; role: string; createdAt: string }[];
  usersByRole?: { role: string; count: number }[];
  planDistribution?: { planName: string; count: number }[];
  systemAnalytics?: {
    totalBusinesses: number;
    totalProducts: number;
    totalSalesRecords: number;
    averageRevenuePerUser: number;
    subscriptionPenetration: number;
  };
  userManagement?: {
    search: string;
    roleFilter: string;
    filteredUsers: number;
    limit: number;
  };
}

function getActiveTab(rawTab: string | null): AdminTab {
  if (rawTab === 'users' || rawTab === 'system' || rawTab === 'revenue' || rawTab === 'pricing') {
    return rawTab;
  }
  return 'overview';
}

interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  effectivePriceMonthly: number;
  effectivePriceYearly: number;
  discount: {
    active: boolean;
    percent: number;
    code: string | null;
    endsAt: string | null;
  };
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const activeTab = getActiveTab(searchParams.get('tab'));

  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState('');
  const [error, setError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadAdminData = () => {
    setError('');

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    params.set('limit', '200');

    fetch(`/api/admin?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error('Unauthorized - Admin access required');
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to fetch admin data');
        }
        return res.json();
      })
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, roleFilter]);

  const loadPricingData = () => {
    setPricingLoading(true);
    fetch('/api/admin/pricing', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load pricing controls');
        }
        return res.json();
      })
      .then((payload) => {
        setPricingPlans(Array.isArray(payload.plans) ? payload.plans : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load pricing controls');
      })
      .finally(() => {
        setPricingLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'pricing') {
      loadPricingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleRoleToggle = async (userId: string, role: 'user' | 'admin') => {
    try {
      setUpdatingRoleId(userId);
      const nextRole = role === 'admin' ? 'user' : 'admin';
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: nextRole })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update role');
      }

      loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const chartData = useMemo(
    () =>
      (data?.revenueOverTime || []).map((point) => ({
        date: `${point.month}-01`,
        revenue: point.revenue
      })),
    [data?.revenueOverTime]
  );

  const alerts = useMemo(() => {
    const items: string[] = [];
    const penetration = data?.systemAnalytics?.subscriptionPenetration || 0;
    if (penetration < 20) {
      items.push('Subscription penetration is below 20%. Consider onboarding campaigns.');
    }
    if ((data?.stats?.adminUsers || 0) < 2) {
      items.push('Only one admin account detected. Consider assigning a backup admin.');
    }
    if ((data?.stats?.monthlyRecurringRevenue || 0) <= 0) {
      items.push('No recurring subscription revenue detected this period.');
    }
    return items;
  }, [data?.stats?.adminUsers, data?.stats?.monthlyRecurringRevenue, data?.systemAnalytics?.subscriptionPenetration]);

  const updatePricingDraft = (
    planId: string,
    patch: Partial<
      Pick<PricingPlan, 'priceMonthly' | 'priceYearly'> & {
        discount: {
          active?: boolean;
          percent?: number;
          code?: string | null;
          endsAt?: string | null;
        };
      }
    >
  ) => {
    setPricingPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;

        const nextPlan: PricingPlan = { ...plan };
        if (patch.priceMonthly !== undefined) nextPlan.priceMonthly = patch.priceMonthly;
        if (patch.priceYearly !== undefined) nextPlan.priceYearly = patch.priceYearly;
        if (patch.discount) {
          nextPlan.discount = {
            ...nextPlan.discount,
            ...(patch.discount.active !== undefined ? { active: patch.discount.active } : {}),
            ...(patch.discount.percent !== undefined ? { percent: patch.discount.percent } : {}),
            ...(patch.discount.code !== undefined ? { code: patch.discount.code } : {}),
            ...(patch.discount.endsAt !== undefined ? { endsAt: patch.discount.endsAt } : {})
          };
        }

        const activeDiscount = nextPlan.discount.active ? nextPlan.discount.percent : 0;
        const applyDiscount = (price: number) => Number((Math.max(price, 0) * (1 - activeDiscount / 100)).toFixed(2));
        nextPlan.effectivePriceMonthly = applyDiscount(nextPlan.priceMonthly);
        nextPlan.effectivePriceYearly = applyDiscount(nextPlan.priceYearly);
        return nextPlan;
      })
    );
  };

  const handleSavePricing = async (plan: PricingPlan) => {
    try {
      setSavingPlanId(plan.id);
      setPricingMessage('');

      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          discountPercent: plan.discount.percent,
          discountActive: plan.discount.active,
          discountCode: plan.discount.code || '',
          discountEndsAt: plan.discount.endsAt || ''
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update pricing');
      }

      if (payload.plan) {
        setPricingPlans((prev) => prev.map((item) => (item.id === payload.plan.id ? payload.plan : item)));
      }
      setPricingMessage(`Saved pricing for ${plan.displayName}.`);
    } catch (err) {
      setPricingMessage(err instanceof Error ? err.message : 'Failed to save pricing');
    } finally {
      setSavingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-700">Admin Access Error</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-gray-900">Admin Command Center</h1>
        <p className="text-gray-500 mt-1">
          Manage platform operations from the admin sidebar sections.
        </p>
      </section>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Total Platform Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data?.stats?.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">MRR</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(data?.stats?.monthlyRecurringRevenue || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Sales Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data?.stats?.totalSalesRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Subscription Penetration</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data?.systemAnalytics?.subscriptionPenetration || 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Operational Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        {alert}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      No critical operational alerts right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.usersByRole || []).map((role) => (
                    <div key={role.role} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="capitalize text-sm text-gray-700">{role.role}</span>
                      <span className="font-semibold text-gray-900">{role.count}</span>
                    </div>
                  ))}
                  {(data?.usersByRole || []).length === 0 && <p className="text-sm text-gray-500">No role data.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Search Users"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name or email"
                icon={<Search className="w-4 h-4 text-gray-400" />}
              />
              <Select
                label="Role Filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter((e.target.value as 'all' | 'admin' | 'user') || 'all')}
                options={[
                  { value: 'all', label: 'All roles' },
                  { value: 'admin', label: 'Admins' },
                  { value: 'user', label: 'Business owners' }
                ]}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>
                Showing {data?.userManagement?.filteredUsers || 0} users
                {roleFilter !== 'all' && ` with role "${roleFilter}"`}.
              </p>
              <p>Admins: {data?.stats?.adminUsers || 0} | Owners: {data?.stats?.businessOwners || 0}</p>
            </div>

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Joined</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.recentUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'danger' : 'default'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleRoleToggle(user.id, user.role as 'user' | 'admin')}
                        disabled={updatingRoleId === user.id}
                        className="text-sm text-emerald-700 hover:underline disabled:text-gray-400"
                      >
                        {updatingRoleId === user.id
                          ? 'Updating...'
                          : user.role === 'admin'
                            ? 'Demote to User'
                            : 'Promote to Admin'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.recentUsers || data.recentUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No users found for current filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{data?.systemAnalytics?.totalBusinesses || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Registered businesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{data?.systemAnalytics?.totalProducts || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Products listed across all businesses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{data?.systemAnalytics?.totalSalesRecords || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Tracked sales entries</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Active Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data?.planDistribution || []).map((plan) => (
                  <div key={plan.planName} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-700">{plan.planName}</span>
                    <span className="font-semibold text-gray-900">{plan.count}</span>
                  </div>
                ))}
                {(data?.planDistribution || []).length === 0 && (
                  <p className="text-sm text-gray-500">No active plan distribution data.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue / User</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(data?.systemAnalytics?.averageRevenuePerUser || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Average platform revenue per user</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Total Platform Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data?.stats?.totalRevenue || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Recurring Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(data?.stats?.monthlyRecurringRevenue || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Sales Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data?.stats?.totalSalesRevenue || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={chartData} />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'pricing' && (
        <Card>
          <CardHeader>
            <CardTitle>Business Workspace - Subscription Pricing & Discounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pricingMessage && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {pricingMessage}
              </div>
            )}

            {pricingLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-5">
                {pricingPlans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.displayName}</p>
                        <p className="text-sm text-gray-500 uppercase">{plan.name}</p>
                      </div>
                      <Badge variant={plan.discount.active ? 'warning' : 'default'}>
                        {plan.discount.active ? `Discount ${plan.discount.percent}%` : 'No discount'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      <Input
                        label="Monthly Price (USD)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(plan.priceMonthly)}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, { priceMonthly: Number(e.target.value || 0) })
                        }
                      />
                      <Input
                        label="Yearly Price (USD)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(plan.priceYearly)}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, { priceYearly: Number(e.target.value || 0) })
                        }
                      />
                      <Input
                        label="Discount Percent"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={String(plan.discount.percent)}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, {
                            discount: { percent: Number(e.target.value || 0) }
                          })
                        }
                      />
                      <Select
                        label="Discount Status"
                        value={plan.discount.active ? 'active' : 'inactive'}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, {
                            discount: { active: e.target.value === 'active' }
                          })
                        }
                        options={[
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'active', label: 'Active' }
                        ]}
                      />
                      <Input
                        label="Discount Code"
                        value={plan.discount.code || ''}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, { discount: { code: e.target.value } })
                        }
                        placeholder="e.g. SPRING20"
                      />
                      <Input
                        label="Discount End Date"
                        type="date"
                        value={plan.discount.endsAt ? plan.discount.endsAt.slice(0, 10) : ''}
                        onChange={(e) =>
                          updatePricingDraft(plan.id, {
                            discount: { endsAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : null }
                          })
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        Effective: {formatCurrency(plan.effectivePriceMonthly)}/mo, {formatCurrency(plan.effectivePriceYearly)}/year
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          void handleSavePricing(plan);
                        }}
                        loading={savingPlanId === plan.id}
                      >
                        Save Pricing
                      </Button>
                    </div>
                  </div>
                ))}
                {pricingPlans.length === 0 && (
                  <p className="text-sm text-gray-500">No plans available to configure.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
