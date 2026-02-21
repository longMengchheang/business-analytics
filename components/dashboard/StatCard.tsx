'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Percent } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: 'revenue' | 'sales' | 'products' | 'growth';
}

export function StatCard({ title, value, change, icon = 'revenue' }: StatCardProps) {
  const icons = {
    revenue: <DollarSign className="w-5 h-5 text-slate-500 transition-colors duration-300 group-hover:text-primary-600" />,
    sales: <ShoppingCart className="w-5 h-5 text-slate-500 transition-colors duration-300 group-hover:text-primary-600" />,
    products: <Package className="w-5 h-5 text-slate-500 transition-colors duration-300 group-hover:text-primary-600" />,
    growth: <Percent className="w-5 h-5 text-slate-500 transition-colors duration-300 group-hover:text-primary-600" />,
  };

  return (
    <Card className="p-6 relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-0 transform translate-x-4 -translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 pointer-events-none">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-transparent rounded-full blur-2xl"></div>
      </div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="mt-3 flex items-center">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500 mr-1.5" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1.5" strokeWidth={2.5} />
              )}
              <span className={`text-sm font-semibold tracking-wide ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-slate-400 ml-2">vs last period</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-50/80 rounded-xl ring-1 ring-inset ring-slate-200/50 shadow-sm transition-all duration-300 group-hover:bg-primary-50 group-hover:ring-primary-100">
          {icons[icon]}
        </div>
      </div>
    </Card>
  );
}
