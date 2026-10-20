import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'purple' | 'amber' | 'emerald' | 'rose' | 'orange' | 'slate';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Badge({
  variant = 'indigo',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-bold tracking-tight rounded-full';

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-mono',
    md: 'text-xs px-2 py-0.5',
  };

  const variantStyles = {
    indigo: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
    orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
    slate: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
