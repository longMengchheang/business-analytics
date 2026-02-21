'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2.5 bg-slate-50/50 border rounded-xl transition-all duration-200 text-slate-900 placeholder:text-slate-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
            ${icon ? 'pl-11' : ''}
            ${error ? 'border-red-500 ring-red-500/50 focus:ring-red-500/50' : 'border-slate-200'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 ml-1 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-3 bg-slate-50/50 border rounded-xl transition-all duration-200 text-slate-900 placeholder:text-slate-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
          ${error ? 'border-red-500 ring-red-500/50 focus:ring-red-500/50' : 'border-slate-200'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 ml-1 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 bg-slate-50/50 border rounded-xl transition-all duration-200 text-slate-900 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
          ${error ? 'border-red-500 ring-red-500/50 focus:ring-red-500/50' : 'border-slate-200'}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 ml-1 text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
