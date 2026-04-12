
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'pink' | 'amber' | 'secondary';
  className?: string;
  icon?: React.ElementType;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', icon: Icon }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
    warning: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm',
    info: 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    brand: 'bg-[#fff9f0] text-[#ca7900] border-orange-200 shadow-sm',
    pink: 'bg-pink-50 text-pink-700 border-pink-200 shadow-sm',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-[10px] font-bold rounded-lg border ${styles[variant]} ${className} transition-all duration-300 uppercase tracking-wide`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default Badge;
