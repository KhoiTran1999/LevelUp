import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gold' | 'interactive';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const variantStyles = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700',
    gold:
      'rpg-panel-gold bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 shadow-md',
    interactive:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-500/40 cursor-pointer',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
