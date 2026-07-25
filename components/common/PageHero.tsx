import React from 'react';
import { Star } from 'lucide-react';

interface Action {
    label: string;
    title?: string;
    icon: any;
    onClick: () => void;
    primary?: boolean;
    customClass?: string;
}

interface PageHeroProps {
    title: string | React.ReactNode;
    subtitle: string | React.ReactNode;
    actions?: Action[];
    showStatus?: boolean;
    statusText?: string;
    customGradient?: string;
    shadowColor?: string;
    children?: React.ReactNode;
    asBanner?: boolean; // Restores the old banner variant
}

const PageHero: React.FC<PageHeroProps> = ({ 
    title, 
    subtitle, 
    actions, 
    showStatus = false, 
    statusText = 'System Active',
    asBanner = false,
    children
}) => {
    if (asBanner) {
        return (
            <div className="relative mb-8 rounded-[24px] overflow-hidden p-6 md:p-8 min-h-[180px] flex flex-col justify-center shadow-xl border border-white/10 bg-gradient-to-r from-[#3b0764] via-[#240043] to-[#120022] group/hero">
                {/* Background Decor */}
                <div className="absolute top-1/2 -right-12 w-56 h-56 border-[2.5px] border-dashed border-white/15 rounded-full transform -translate-y-1/2 pointer-events-none" />
                <div className="absolute top-1/4 right-1/4 opacity-15 pointer-events-none">
                    <Star className="w-12 h-12 text-white fill-white animate-pulse" />
                </div>
                <div className="absolute bottom-2 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-[35px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-full h-full bg-black/5 pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            {title}
                        </h1>
                    </div>
                    
                    <p className="text-white/95 text-xs sm:text-sm font-semibold leading-relaxed max-w-2xl mb-8">
                        {subtitle}
                    </p>

                    {actions && actions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            {actions.map((action, idx) => {
                                return (
                                    <button 
                                        key={idx}
                                        onClick={action.onClick}
                                        title={action.title || action.label}
                                        className={`flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md ${
                                            action.label 
                                                ? 'gap-2 px-5 h-[40px] rounded-xl font-bold text-xs uppercase tracking-wider font-semibold' 
                                                : 'h-[40px] w-[40px] rounded-xl'
                                        } ${
                                            action.primary 
                                            ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] border border-violet-500/20' 
                                            : 'bg-white text-[#3b0764] hover:bg-slate-50 border border-transparent'
                                        }`}
                                    >
                                        {action.icon && <action.icon className={action.label ? "w-3.5 h-3.5" : "w-4 h-4"} />}
                                        {action.label && (
                                            <span>{action.label}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {showStatus && (
                    <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                        <span className="text-[9px] font-black text-white tracking-[0.1em] uppercase">{statusText}</span>
                    </div>
                )}
            </div>
        );
    }

    // Minimal style PageHero for other pages
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 sm:mb-6 mt-0 w-full">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        {title}
                    </h1>
                </div>
                
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    {subtitle}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                {children}
                {actions && actions.length > 0 && (
                    <>
                        {actions.map((action, idx) => {
                            return (
                                <button 
                                    key={idx}
                                    onClick={action.onClick}
                                    title={action.title || action.label}
                                    className={`flex items-center justify-center transition-all duration-200 ${
                                        action.label 
                                            ? 'gap-1.5 h-[38px] rounded-xl font-bold text-xs uppercase tracking-wider px-4' 
                                            : 'h-[38px] w-[38px] rounded-xl'
                                    } ${
                                        action.customClass 
                                        ? action.customClass
                                        : action.primary 
                                          ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[var(--shadow-primary)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200' 
                                          : 'bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-text-light)] hover:text-[var(--color-text)] border border-[var(--color-border)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200'
                                    }`}
                                >
                                    {action.icon && <action.icon className={action.label ? "w-3.5 h-3.5" : "w-4 h-4"} />}
                                    {action.label && (
                                        <span>{action.label}</span>
                                    )}
                                </button>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default PageHero;
