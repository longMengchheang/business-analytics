'use client';

import React from 'react';
import { Bell, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  subscription?: {
    planName: string;
    status: string;
  };
}

export function Header({ userName = 'User', userEmail, userRole = 'user', subscription }: HeaderProps) {
  const isAdmin = userRole === 'admin';

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-end sticky top-0 z-30">
      <div className="flex items-center space-x-5">
        {isAdmin && (
          <Badge variant="info" className="shadow-sm">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Admin Mode
          </Badge>
        )}

        {!isAdmin && subscription && (
          <Badge variant={subscription.status === 'active' ? 'success' : 'warning'} className="shadow-sm">
            {subscription.planName}
          </Badge>
        )}
        
        <button className="relative p-2 rounded-full transition-all hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

        <button className="flex items-center space-x-3 group focus:outline-none rounded-full p-1 pr-3 hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 ring-2 ring-white shadow-sm transition-transform group-hover:scale-105">
            <User className="w-4 h-4 text-primary-700" strokeWidth={2.5} />
          </div>
          <div className="hidden md:flex flex-col items-start">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{userName}</p>
            {userEmail && (
              <p className="text-[11px] font-medium text-slate-500 leading-tight">{userEmail}</p>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
