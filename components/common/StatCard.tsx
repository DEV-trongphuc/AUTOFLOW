import React from 'react';
import Skeleton from './Skeleton';

interface StatCardProps {
    title: string;
    value: string | number;
    growth?: number;
    icon: React.ReactElement;
    color: string;
    breakdown?: React.ReactNode;
    comparisonLabel?: string;
    loading?: boolean;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    style?: React.CSSProperties;
    className?: string;
    decor?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    growth,
    icon,
    color,
    breakdown,
    comparisonLabel,
    loading = false,
    onClick,
    style,
    className = '',
    decor
}) => {
    const isIncrease = growth !== undefined ? growth >= 0 : true;

    if (loading) {
        return (
            <div 
                className={`bg-[var(--color-surface)] p-5 md:p-6 rounded-[var(--radius-xl)] border border-[var(--color-border-light)] min-h-[145px] flex flex-col justify-between ${className}`}
                style={style}
            >
                <div>
                    <div className="flex items-center justify-between mb-3.5">
                        <Skeleton variant="text" width="60px" height={10} className="bg-slate-100 dark:bg-slate-800" />
                        <Skeleton variant="rounded" width="32px" height={32} className="bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                    <Skeleton variant="text" width="100px" height={24} className="bg-slate-100 dark:bg-slate-800 mb-2" />
                    {breakdown && (
                        <div className="mt-2 flex gap-2">
                            <Skeleton variant="text" width="60px" height={10} className="bg-slate-100 dark:bg-slate-800" />
                            <Skeleton variant="text" width="60px" height={10} className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                    <Skeleton variant="rounded" width="40px" height={16} className="bg-slate-100 dark:bg-slate-800" />
                    <Skeleton variant="text" width="80px" height={10} className="bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`stat-card bg-[var(--color-surface)] p-5 md:p-6 rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] border border-[var(--color-border-light)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[145px] group cursor-pointer ${className}`}
            style={style}
            onClick={onClick}
        >
            {decor && (
                <div className="decor-svg" style={{ color: color }}>
                    {decor}
                </div>
            )}
            <div className="relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                    {/* Top Row: Title & Icon */}
                    <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{title}</span>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15`, color: color }}>
                            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
                        </div>
                    </div>

                    {/* Middle Row: Large Value */}
                    <div className="text-xl md:text-2xl font-black text-[var(--color-text)] dark:text-slate-100 tracking-tight leading-none mb-2.5">
                        {value}
                    </div>

                    {/* Breakdown details */}
                    {breakdown && (
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex flex-wrap gap-x-2.5 gap-y-1">
                            {breakdown}
                        </div>
                    )}
                </div>

                {/* Bottom Row: Growth rate */}
                {growth !== undefined && (
                    <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full" style={{ 
                            backgroundColor: isIncrease ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                            color: isIncrease ? '#10b981' : '#f43f5e'
                        }}>
                            {isIncrease ? (
                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                                    <path d="M12 5l9 14H3z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                                    <path d="M12 19L3 5h18z" />
                                </svg>
                            )}
                            <span className="ml-0.5">{isIncrease ? '+' : ''}{growth}%</span>
                        </span>
                        {comparisonLabel && <span className="text-slate-500 font-bold dark:text-slate-400">{comparisonLabel}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
