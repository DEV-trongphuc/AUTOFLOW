
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'pink' | 'amber' | 'secondary';
  className?: string;
  icon?: React.ElementType;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', icon: Icon }) => {
  const styles = {
    success: 'bg-emerald-50/80 text-emerald-600 border-emerald-100/30 shadow-none',
    warning: 'bg-amber-50/80 text-amber-600 border-amber-100/30 shadow-none',
    danger: 'bg-rose-50/80 text-rose-600 border-rose-100/30 shadow-none',
    info: 'bg-sky-50/80 text-sky-600 border-sky-100/30 shadow-none',
    neutral: 'bg-slate-100/60 text-slate-500 border-transparent shadow-none',
    brand: 'bg-violet-50/80 text-violet-600 border-violet-100/30 shadow-none',
    pink: 'bg-pink-50/80 text-pink-600 border-pink-100/30 shadow-none',
    amber: 'bg-violet-50/80 text-violet-600 border-violet-100/30 shadow-none',
    secondary: 'bg-slate-100/60 text-slate-500 border-transparent shadow-none'
  };

  return (
    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-[10px] font-bold rounded-lg border ${styles[variant]} ${className} transition-all duration-300 uppercase tracking-wide`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default Badge;
