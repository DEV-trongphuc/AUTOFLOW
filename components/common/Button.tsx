
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
  const baseStyles = 'inline-flex items-center justify-center font-extrabold uppercase tracking-wider transition-all duration-200 active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none focus:outline-none select-none';

  const variants = {
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[var(--shadow-primary)] hover:-translate-y-0.5 active:scale-[0.97] border border-transparent',
    secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-light)] shadow-sm hover:-translate-y-0.5 active:scale-[0.97]',
    outline: 'bg-transparent border border-[var(--color-border)] text-[var(--color-text-light)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)] hover:-translate-y-0.5 active:scale-[0.97]',
    ghost: 'bg-transparent text-[var(--color-text-light)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] active:scale-[0.97]',
    danger: 'bg-[var(--color-danger-light)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white border border-[var(--color-danger)] hover:-translate-y-0.5 active:scale-[0.97]',
    custom: '', // Allows full override via className
  };

  const sizes = {
    sm: 'px-4 py-2 text-[11px] md:text-xs gap-1.5 rounded-[var(--radius-md)]',
    md: 'px-5 py-2.5 text-xs md:text-sm gap-2 rounded-[var(--radius-lg)]',
    lg: 'px-7 py-3.5 text-sm md:text-base gap-2.5 rounded-[var(--radius-xl)]',
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
