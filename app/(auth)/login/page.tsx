'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { LoginForm } from '@/components/forms/AuthForms';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden z-0">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-200/40 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3"></div>

      <div className="mb-8 text-center animate-slide-up">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3.5 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl shadow-lg shadow-primary-600/20 ring-1 ring-white/20">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-slate-500 mt-2.5 font-medium">Sign in to your account to continue</p>
      </div>

      <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <LoginForm />
      </div>

      <p className="mt-10 text-sm font-medium text-slate-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        &copy; 2024 Smart Analytics. All rights reserved.
      </p>
    </div>
  );
}
