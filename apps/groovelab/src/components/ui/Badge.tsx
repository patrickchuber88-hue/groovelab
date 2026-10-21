import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  moduleTheme?: 'admin' | 'campus' | 'groovelab';
  appearance?: 'soft' | 'filled' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = React.memo(({
  children,
  variant = 'default',
  moduleTheme,
  appearance = 'soft',
  className = '',
}) => {
  const getBadgeStyle = (): string => {
    // 1. FILLED (Solid Brand + High Contrast Text, border-0)
    if (appearance === 'filled') {
      if (moduleTheme === 'admin') return 'bg-[#ea4335] text-white border-0';
      if (moduleTheme === 'campus') return 'bg-[#34a853] text-white border-0';
      if (moduleTheme === 'groovelab') return 'bg-[#facc15] text-slate-900 font-bold border-0';

      switch (variant) {
        case 'success':
          return 'bg-emerald-600 text-white border-0';
        case 'warning':
          return 'bg-amber-500 text-slate-900 font-bold border-0';
        case 'danger':
          return 'bg-red-600 text-white border-0';
        case 'info':
          return 'bg-blue-600 text-white border-0';
        default:
          return 'bg-slate-800 text-white border-0';
      }
    }

    // 2. OUTLINE (Transparent/White + 1px border + Matching Text)
    if (appearance === 'outline') {
      if (moduleTheme === 'admin') return 'bg-transparent text-red-600 border border-red-500';
      if (moduleTheme === 'campus') return 'bg-transparent text-[#34a853] border border-[#34a853]';
      if (moduleTheme === 'groovelab') return 'bg-transparent text-amber-700 border border-[#facc15]';

      switch (variant) {
        case 'success':
          return 'bg-transparent text-emerald-600 border border-emerald-500';
        case 'warning':
          return 'bg-transparent text-amber-700 border border-amber-500';
        case 'danger':
          return 'bg-transparent text-red-600 border border-red-500';
        case 'info':
          return 'bg-transparent text-blue-600 border border-blue-500';
        default:
          return 'bg-transparent text-slate-700 border border-slate-300';
      }
    }

    // 3. SOFT TINT (Default Apple Standard: ~10% Tint + Vibrant Text, border-0)
    if (moduleTheme === 'admin') return 'bg-red-500/10 text-red-700 border-0';
    if (moduleTheme === 'campus') return 'bg-emerald-500/10 text-emerald-800 border-0';
    if (moduleTheme === 'groovelab') return 'bg-amber-500/15 text-amber-900 border-0';

    switch (variant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-800 border-0';
      case 'warning':
        return 'bg-amber-500/15 text-amber-900 border-0';
      case 'danger':
        return 'bg-red-500/10 text-red-700 border-0';
      case 'info':
        return 'bg-blue-500/10 text-blue-800 border-0';
      default:
        return 'bg-slate-500/10 text-slate-800 border-0';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeStyle()} ${className}`}
    >
      {children}
    </span>
  );
});
