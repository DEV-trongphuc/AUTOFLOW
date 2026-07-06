import React from 'react';

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
}

const PageHero: React.FC<PageHeroProps> = ({ 
    title, 
    subtitle, 
    actions, 
    showStatus = false, 
    statusText = 'System Active',
    children
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 sm:mb-6 mt-0 w-full">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        {title}
                    </h1>
                    {showStatus && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100/50 shadow-sm pointer-events-none">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[9px] font-black text-emerald-600 tracking-[0.08em] uppercase leading-none">{statusText}</span>
                        </div>
                    )}
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
                                          ? 'bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-md hover:shadow-lg active:scale-95 transition-all duration-200' 
                                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 active:scale-95 transition-all duration-200'
                                    }`}
                                >
                                    {action.icon && <action.icon className={action.label ? "w-3.5 h-3.5" : "w-4.5 h-4.5"} />}
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
