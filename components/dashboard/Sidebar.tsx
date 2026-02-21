'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  Shield,
  Activity,
  BarChart3,
  Package, 
  ShoppingCart, 
  Settings, 
  Users, 
  Zap,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole = 'user' }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAdminMode = userRole === 'admin';
  const tabQuery = searchParams.get('tab');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      window.location.href = '/login';
    }
  };

  const userLinks = [
    { href: '/analytics', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/sales', label: 'Sales', icon: ShoppingCart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminConsoleLinks = [
    { href: '/admin', label: 'Control Center', icon: Shield },
    { href: '/admin?tab=users', label: 'User Management', icon: Users },
    { href: '/admin?tab=system', label: 'System Analytics', icon: Activity },
    { href: '/admin?tab=revenue', label: 'Revenue Monitor', icon: BarChart3 }
  ];

  const adminWorkspaceLinks = [
    { href: '/admin?tab=pricing', label: 'Business Workspace', icon: LayoutDashboard }
  ];

  const allLinks = isAdminMode ? adminConsoleLinks : userLinks;
  const secondaryLinks = isAdminMode ? adminWorkspaceLinks : [];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-40 flex flex-col transition-all">
      <div className="h-16 px-6 flex items-center border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <Link href={isAdminMode ? '/admin' : '/analytics'} className="flex items-center space-x-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm transition-transform group-hover:scale-105">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block text-lg font-bold text-slate-900 tracking-tight">
              Analytics
            </span>
            {isAdminMode && <span className="text-[11px] font-medium text-primary-600 uppercase tracking-wider">Admin Console</span>}
          </div>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-hide flex flex-col gap-2">
        <nav className="space-y-1">
          {allLinks.map((link) => {
            const Icon = link.icon;
            const [baseHref, queryString] = link.href.split('?');
            const queryTab = queryString?.startsWith('tab=') ? queryString.replace('tab=', '') : null;
            const isActive = queryTab
              ? pathname === baseHref && tabQuery === queryTab
              : pathname === baseHref && !tabQuery;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50/80 text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100/50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isActive ? 2 : 1.5} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {secondaryLinks.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
            {secondaryLinks.map((link) => {
              const Icon = link.icon;
              const [baseHref, queryString] = link.href.split('?');
              const queryTab = queryString?.startsWith('tab=') ? queryString.replace('tab=', '') : null;
              const isActive = queryTab
                ? pathname === baseHref && tabQuery === queryTab
                : pathname === baseHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50/80 text-primary-700 shadow-sm ring-1 ring-inset ring-primary-100/50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={isActive ? 2 : 1.5} />
                  <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => {
            void handleLogout();
          }}
          className="group flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ring-1 ring-inset ring-transparent hover:ring-red-100"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
