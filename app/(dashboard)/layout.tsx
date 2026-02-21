'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSubscription {
  planName: string;
  status: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      }),
      fetch('/api/subscription', {
        credentials: 'include',
        cache: 'no-store',
      }),
    ])
      .then(async ([meRes, subscriptionRes]) => {
        if (!meRes.ok) throw new Error('Unauthorized');

        const meData = await meRes.json();
        setUser(meData.user);

        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json();
          if (subscriptionData?.subscription) {
            setSubscription({
              planName: subscriptionData.subscription.planName || 'Active Plan',
              status: subscriptionData.subscription.status || 'active',
            });
          }
        }

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.replace('/login');
      });
  }, [router]);

  useEffect(() => {
    if (!loading && user?.role !== 'admin' && pathname?.startsWith('/admin')) {
      router.replace('/analytics');
    }
  }, [loading, pathname, router, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar userRole={user?.role} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header 
          userName={user?.name || 'User'} 
          userEmail={user?.email}
          userRole={user?.role}
          subscription={subscription}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
