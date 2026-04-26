import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PremiumEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    primaryAction?: {
        label: string;
        icon?: LucideIcon;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

export const PremiumEmptyState: React.FC<PremiumEmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    primaryAction,
    secondaryAction
}) => {
    return (
        <div className="w-full flex flex-col items-center justify-center py-20 px-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mb-8 group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                
                {/* 3D Floating Icon Container */}
                <div className="relative w-28 h-28 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center animate-[float_4s_ease-in-out_infinite] group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/5 rounded-[2rem]"></div>
                    <Icon className="w-12 h-12 text-orange-500 drop-shadow-md" />
                    
                    {/* Decorative mini badges */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce delay-150">
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 text-center tracking-tight">
                {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md font-medium mb-10 leading-relaxed">
                {description}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        className="group relative px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all flex items-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        {primaryAction.icon && <primaryAction.icon className="w-5 h-5 relative z-10" />}
                        <span className="relative z-10">{primaryAction.label}</span>
                    </button>
                )}
                
                {secondaryAction && (
                    <button
                        onClick={secondaryAction.onClick}
                        className="px-8 py-3.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all"
                    >
                        {secondaryAction.label}
                    </button>
                )}
            </div>
        </div>
    );
};
