
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDarkTheme?: boolean;
  icon?: React.ElementType;
  iconClassName?: string;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  isDarkTheme = false,
  icon: Icon,
  iconClassName = '',
  className = '',
  disabled,
  fullWidth = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-500 active:scale-95 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-1 tracking-tight';

  const variants = {
    primary: 'h-10 px-5 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl text-xs font-bold hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 transition-all duration-500 flex items-center gap-2',
    secondary: isDarkTheme
      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:text-slate-100'
      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-800',
    outline: isDarkTheme
      ? 'bg-transparent border-2 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
      : 'bg-transparent border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    ghost: isDarkTheme
      ? 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800',
    danger: isDarkTheme
      ? 'bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 border border-rose-900/50 hover:border-rose-800'
      : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-transparent hover:border-rose-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[11px] md:text-xs gap-1.5',
    md: 'px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm gap-2',
    lg: 'px-6 py-3 md:px-7 md:py-3.5 text-sm md:text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${iconClassName}`} />
      ) : null}
      {children}
    </button>
  );
};

export default React.memo(Button);
