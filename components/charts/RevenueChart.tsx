'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: { date: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="date" 
          stroke="#94a3b8" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={-10}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            padding: '12px',
          }}
          itemStyle={{ color: '#0f172a', fontWeight: 600 }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
          labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'long', 
            day: 'numeric' 
          })}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#4f46e5"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#revenueGradient)"
          activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
