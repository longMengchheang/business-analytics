'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface SalesTrendChartProps {
  data: { date: string; revenue: number; sales: number }[];
  granularity?: 'daily' | 'monthly';
}

function parseChartDate(value: string): Date {
  // Parse date-only values in local time to avoid timezone shifting labels.
  return value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
}

function formatAxisLabel(value: string, granularity: 'daily' | 'monthly'): string {
  const date = parseChartDate(value);
  if (Number.isNaN(date.getTime())) return value;

  if (granularity === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipLabel(value: string, granularity: 'daily' | 'monthly'): string {
  const date = parseChartDate(value);
  if (Number.isNaN(date.getTime())) return value;

  if (granularity === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function SalesTrendChart({ data, granularity = 'daily' }: SalesTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={granularity === 'monthly' ? 32 : 12}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="date" 
          stroke="#94a3b8" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
          tickFormatter={(value) => formatAxisLabel(value, granularity)}
        />
        <YAxis 
          yAxisId="revenue"
          stroke="#94a3b8" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={-10}
          tickFormatter={(value) => `$${value}`}
        />
        <YAxis 
          yAxisId="sales"
          orientation="right"
          stroke="#94a3b8" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={10}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            padding: '12px',
          }}
          cursor={{ fill: '#f8fafc' }}
          formatter={(value: number, name: string) => {
            if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
            return [value, 'Sales'];
          }}
          labelFormatter={(label) => formatTooltipLabel(label, granularity)}
        />
        <Legend 
          iconType="circle"
          wrapperStyle={{ paddingTop: '20px' }}
        />
        <Bar yAxisId="revenue" dataKey="revenue" fill="#4f46e5" name="Revenue" radius={[4, 4, 4, 4]} />
        <Bar yAxisId="sales" dataKey="sales" fill="#10b981" name="Sales" radius={[4, 4, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
