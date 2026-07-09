
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'custom';
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
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 tracking-tight select-none';

  const variants = {
    primary: 'bg-gradient-to-b from-amber-500 to-amber-600 text-white border border-amber-600/10 shadow-[0_6px_18px_-4px_rgba(104,61,242,0.22),inset_0_1.5px_0_rgba(255,255,255,0.3)] hover:brightness-[1.03] active:brightness-95',
    secondary: isDarkTheme
      ? 'bg-slate-800/80 backdrop-blur-md text-slate-200 border border-slate-700/80 hover:bg-slate-700/80 hover:border-slate-650 hover:text-white shadow-sm shadow-[inset_0_1px_rgba(255,255,255,0.05)]'
      : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.02)] shadow-[inset_0_1.5px_rgba(255,255,255,1)]',
    outline: isDarkTheme
      ? 'bg-transparent border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/40'
      : 'bg-transparent border border-slate-250 text-slate-500 hover:border-slate-350 hover:bg-slate-50/50 hover:text-slate-900',
    ghost: isDarkTheme
      ? 'bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      : 'bg-transparent text-slate-500 hover:bg-slate-100/50 hover:text-slate-900',
    danger: isDarkTheme
      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50'
      : 'bg-rose-50/80 text-rose-600 hover:bg-rose-100 border border-rose-100 hover:border-rose-200',
    custom: '', // Allows full override via className
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-[11px] md:text-xs gap-1.5 rounded-full',
    md: 'px-5 py-2.5 text-xs md:text-sm gap-2 rounded-2xl',
    lg: 'px-7 py-3.5 text-sm md:text-base gap-2.5 rounded-3xl',
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
