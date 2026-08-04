import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  moduleTheme?: 'admin' | 'campus' | 'groovelab';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  moduleTheme,
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const getThemeClass = (): string => {
    if (variant !== 'primary') return '';
    switch (moduleTheme) {
      case 'admin':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'campus':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'groovelab':
        return 'bg-amber-500 hover:bg-amber-600 text-black font-semibold';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${sizeClasses[size]} ${getThemeClass()} ${className}`}
      {...props}
    >
      {isLoading ? <span className="animate-spin mr-2">⏳</span> : null}
      {children}
    </button>
  );
};
