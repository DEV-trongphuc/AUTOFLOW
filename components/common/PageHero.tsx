import React from 'react';

interface Action {
    label: string;
    title?: string;
    icon: any;
    onClick: () => void;
    primary?: boolean;
}

interface PageHeroProps {
    title: string | React.ReactNode;
    subtitle: string | React.ReactNode;
    actions?: Action[];
    showStatus?: boolean;
    statusText?: string;
    customGradient?: string;
    shadowColor?: string;
}

const PageHero: React.FC<PageHeroProps> = ({ 
    title, 
    subtitle, 
    actions, 
    showStatus = false, 
    statusText = 'System Active',
    customGradient = 'from-[#d97706] to-[#78350f]',
    shadowColor = 'shadow-amber-900/30'
}) => {
    return (
        <div className={`relative mb-4 sm:mb-8 rounded-[24px] overflow-hidden p-4 sm:p-6 md:p-8 min-h-[100px] sm:min-h-[140px] flex flex-col justify-center shadow-2xl ${shadowColor} border border-white/10 bg-gradient-to-r ${customGradient} group/hero`}>
            {/* Ambient overlay: Clean high-tech grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_110%)] opacity-30 pointer-events-none" />
            
            {/* Glowing radial ambient background lights */}
            <div className="absolute -right-20 -top-20 w-[380px] h-[380px] bg-white/10 rounded-full blur-[80px] pointer-events-none group-hover/hero:scale-110 transition-transform duration-700" />
            <div className="absolute left-[15%] bottom-[-50px] w-[250px] h-[250px] bg-black/15 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                        {title}
                    </h1>
                </div>
                
                <p className="hidden sm:block text-white/85 text-sm font-medium leading-relaxed max-w-2xl mb-6 sm:mb-8">
                    {subtitle}
                </p>

                {actions && actions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full mt-4 sm:mt-0">
                        {actions.map((action, idx) => {
                            return (
                                <button 
                                    key={idx}
                                    onClick={action.onClick}
                                    title={action.title || action.label}
                                    className={`flex items-center justify-center transition-all duration-200 ${
                                        action.label 
                                            ? 'gap-2 h-[36px] sm:h-[40px] rounded-xl font-bold text-xs uppercase tracking-wider px-4 sm:px-6' 
                                            : 'h-[36px] sm:h-[40px] w-[36px] sm:w-[40px] rounded-xl'
                                    } ${
                                        action.primary 
                                        ? 'bg-white text-slate-900 border border-white/40 shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]' 
                                        : 'bg-white/10 text-white border border-white/20 hover:bg-white/25 hover:border-white/35 shadow-[0_8px_25px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                                >
                                    {action.icon && <action.icon className={action.label ? "w-4 h-4" : "w-5 h-5"} />}
                                    {/* Hide label on mobile for non-primary (secondary) actions to save space */}
                                    {action.label && (
                                        <span className={action.primary ? 'inline' : 'hidden sm:inline'}>{action.label}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showStatus && (
                <div className="absolute top-6 right-6 hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/15 shadow-[0_4px_30px_rgba(0,0,0,0.05)] hover:border-white/30 transition-colors pointer-events-none">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span className="text-[10px] font-bold text-white tracking-[0.12em] uppercase">{statusText}</span>
                </div>
            )}
        </div>
    );
};

export default PageHero;
