import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    ctaLabel?: string;
    onCtaClick?: () => void;
    className?: string;
    iconColor?: string;
    ctaClassName?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    ctaLabel,
    onCtaClick,
    className = '',
    iconColor = 'text-slate-300',
    ctaClassName = ''
}) => {
    return (
        <div className={`py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-700 ${className}`}>
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className={`relative w-32 h-32 mb-8 mx-auto flex items-center justify-center group`}>
                    {/* Layer 1: Back skewed shadow box */}
                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900/80 rounded-[32px] rotate-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105"></div>
                    {/* Layer 2: Main clean box */}
                    <div className="absolute inset-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-[32px] shadow-sm -rotate-3 transition-transform duration-500 group-hover:rotate-0"></div>
                    {/* Layer 3: Inner gradient depth */}
                    <div className="absolute inset-3 bg-gradient-to-br from-slate-50 to-slate-100/30 dark:from-slate-900 dark:to-slate-800/80 rounded-[24px] border border-white/80 dark:border-slate-700/30 transition-all duration-500 group-hover:inset-2"></div>
                    {/* Icon */}
                    <Icon className={`relative z-10 w-12 h-12 ${iconColor} transition-all duration-500 group-hover:scale-110 group-hover:text-amber-500`} strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2.5 tracking-tight">
                    {title}
                </h3>

                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                    {description}
                </p>

                {ctaLabel && onCtaClick && (
                    <Button
                        onClick={onCtaClick}
                        variant={ctaClassName ? 'custom' : 'primary'}
                        className={ctaClassName || "px-8 py-3.5 rounded-[16px] text-[11px] text-white font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl shadow-amber-500/20 hover:-translate-y-1 transition-all duration-300"}
                    >
                        {ctaLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default EmptyState;
