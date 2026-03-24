
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  title,
  description,
  action,
  onClick
}) => {
  return (
    <div 
      className={`bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      {(title || action) && (
        <div className="px-8 py-6 flex justify-between items-start">
          <div>
            {title && <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h3>}
            {description && <p className="text-sm font-medium text-slate-400 mt-1">{description}</p>}
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
