
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ElementType; // Added icon prop
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  title,
  description,
  action,
  icon: Icon,
  onClick
}) => {
  const clickableClasses = onClick ? 'cursor-pointer active:scale-[0.985] hover:border-[var(--color-border)]' : '';
  return (
    <div 
      className={`bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border-light)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 transition-all duration-300 group ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {(title || action || Icon) && (
        <div className="px-8 py-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-400 group-hover:text-violet-500 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>}
              {description && <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'px-8 pb-8 pt-2'}>
        {children}
      </div>
    </div>
  );
};

export default Card;
