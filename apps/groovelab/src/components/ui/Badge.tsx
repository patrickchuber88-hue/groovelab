import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  moduleTheme?: 'admin' | 'campus' | 'groovelab';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  moduleTheme,
  className = '',
}) => {
  const getBadgeStyle = (): string => {
    if (moduleTheme === 'admin') return 'bg-red-100 text-red-800 border-red-200';
    if (moduleTheme === 'campus') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (moduleTheme === 'groovelab') return 'bg-amber-100 text-amber-900 border-amber-300';

    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'danger':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}
    >
      {children}
    </span>
  );
};
