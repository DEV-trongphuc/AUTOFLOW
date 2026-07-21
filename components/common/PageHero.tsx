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
                                            ? 'gap-2 h-[42px] rounded-2xl font-extrabold text-xs uppercase tracking-wider px-5' 
                                            : 'h-[42px] w-[42px] rounded-2xl'
                                    } ${
                                        action.customClass 
                                        ? action.customClass
                                        : action.primary 
                                          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 active:scale-95 transition-all duration-200' 
                                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 active:scale-95 transition-all duration-200'
                                    }`}
                                >
                                    {action.icon && <action.icon className={action.label ? "w-4 h-4" : "w-5 h-5"} />}
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
