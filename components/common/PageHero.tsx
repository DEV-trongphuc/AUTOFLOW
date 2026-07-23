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
