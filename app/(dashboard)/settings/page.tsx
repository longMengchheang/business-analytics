'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

interface Subscription {
  id: string;
  planId: string;
  status: string;
  billingCycle: 'monthly' | 'yearly';
  endDate: string;
  capabilities?: {
    analyticsLevel: 'limited' | 'full';
    maxAnalyticsPeriodDays: number;
    aiInsightsEnabled: boolean;
  };
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  capabilities?: {
    analyticsLevel: 'limited' | 'full';
    maxAnalyticsPeriodDays: number;
    aiInsightsEnabled: boolean;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  description: string;
}

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessMessage, setBusinessMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/subscription', { cache: 'no-store' }),
      fetch('/api/auth/me', { cache: 'no-store' }),
      fetch('/api/business', { cache: 'no-store' }),
    ])
      .then(async ([subscriptionRes, meRes, businessRes]) => {
        if (!subscriptionRes.ok) {
          const payload = await subscriptionRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load subscription data');
        }
        if (!meRes.ok) {
          const payload = await meRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load profile');
        }
        if (!businessRes.ok) {
          const payload = await businessRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load business profile');
        }

        const subscriptionData = await subscriptionRes.json();
        const meData = await meRes.json();
        const businessData = await businessRes.json();
        setSubscription(subscriptionData.subscription || null);
        setPlans(Array.isArray(subscriptionData.plans) ? subscriptionData.plans : []);
        setUser(meData.user || null);
        setBusiness(businessData.business || null);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgradingPlanId(planId);
      setPaymentMessage('');

      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: 'monthly' })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process plan change');
      }

      if (data.subscription) {
        setSubscription((prev) =>
          prev
            ? {
                ...prev,
                planId: data.subscription.planId,
                status: data.subscription.status,
                billingCycle: data.subscription.billingCycle,
                endDate: data.subscription.endDate
              }
            : {
                id: data.subscription.id,
                planId: data.subscription.planId,
                status: data.subscription.status,
                billingCycle: data.subscription.billingCycle,
                endDate: data.subscription.endDate
              }
        );
      }

      setPaymentMessage(data.message || 'Plan updated successfully');
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : 'Failed to process plan change');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const handleBusinessSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.name?.trim()) {
      setBusinessMessage('Business name is required');
      return;
    }

    try {
      setSavingBusiness(true);
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: business.name.trim(),
          description: business.description || '',
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update business profile');
      }

      setBusinessMessage('Business profile updated');
    } catch (err) {
      setBusinessMessage(err instanceof Error ? err.message : 'Failed to update business profile');
    } finally {
      setSavingBusiness(false);
    }
  };

  const currentPlan = subscription
    ? plans.find((plan) => plan.id === subscription.planId || plan.name === subscription.planId) || null
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and subscription</p>
        {paymentMessage && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {paymentMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <Input label="Name" value={user?.name || ''} disabled />
              <Input label="Email" value={user?.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleBusinessSave}>
              {businessMessage && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {businessMessage}
                </div>
              )}
              <Input
                label="Business Name"
                value={business?.name || ''}
                onChange={(e) =>
                  setBusiness((prev) =>
                    prev
                      ? { ...prev, name: e.target.value }
                      : { id: '', name: e.target.value, description: '' }
                  )
                }
                required
              />
              <Textarea
                label="Description"
                value={business?.description || ''}
                onChange={(e) =>
                  setBusiness((prev) =>
                    prev
                      ? { ...prev, description: e.target.value }
                      : { id: '', name: '', description: e.target.value }
                  )
                }
                rows={4}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={savingBusiness}>
                  Save Business
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{currentPlan?.displayName || 'Free'}</p>
                    <p className="text-sm text-gray-500">
                      {subscription?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing
                    </p>
                  </div>
                  <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                    {subscription?.status || 'No subscription'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold">{plan.displayName}</h3>
                <p className="text-2xl font-bold mt-2">
                  {plan.priceMonthly === 0 ? 'Free' : `${formatCurrency(plan.priceMonthly)}/mo`}
                </p>
                {plan.priceYearly > 0 && (
                  <p className="text-sm text-gray-500">
                    or {formatCurrency(plan.priceYearly)}/year
                  </p>
                )}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-gray-600">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={`${plan.id}-${feature}`}>• {feature}</li>
                    ))}
                  </ul>
                )}
                <Button
                  className="w-full mt-4"
                  variant={subscription?.planId === plan.id ? 'secondary' : 'primary'}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={subscription?.planId === plan.id || upgradingPlanId === plan.id}
                >
                  {subscription?.planId === plan.id
                    ? 'Current Plan'
                    : upgradingPlanId === plan.id
                      ? 'Processing...'
                      : plan.priceMonthly === 0
                        ? 'Downgrade'
                        : 'Upgrade'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
