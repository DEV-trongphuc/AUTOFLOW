import React from 'react';
import { Star } from 'lucide-react';

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
        <div className={`relative mb-8 rounded-[24px] overflow-hidden p-6 md:p-8 min-h-[140px] flex flex-col justify-center shadow-2xl ${shadowColor} border border-white/10 bg-gradient-to-r ${customGradient} group/hero`}>
            {/* Minimalist Background Decor */}
            <div className="absolute top-1/2 -right-10 w-48 h-48 border-[2px] border-dashed border-white/30 rounded-full transform -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 opacity-20 pointer-events-none">
                <Star className="w-12 h-12 text-white fill-white" />
            </div>
            <div className="absolute bottom-10 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-full h-full bg-black/5 pointer-events-none" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                        {title}
                    </h1>
                </div>
                
                <p className="text-white/90 text-sm font-bold leading-relaxed max-w-xl mb-8">
                    {subtitle}
                </p>

                {actions && actions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        {actions.map((action, idx) => {
                            const isFirstIconOnly = !action.label && (idx === 0 || !!actions[idx - 1].label);
                            
                            return (
                                <button 
                                    key={idx}
                                    onClick={action.onClick}
                                    title={action.title || action.label}
                                    className={`flex items-center justify-center transition-all shadow-xl ${
                                        action.label 
                                            ? 'gap-2 px-6 h-[40px] rounded-xl font-black text-xs uppercase tracking-wider' 
                                            : `h-[40px] w-[40px] rounded-xl`
                                    } ${
                                        action.primary 
                                        ? 'bg-white text-[#333] hover:bg-slate-50 shadow-amber-950/20' 
                                        : 'bg-[#fbbf24] text-[#451a03] border border-[#d97706] hover:bg-[#fcd34d] hover:scale-105 shadow-lg transition-all font-black'
                                    }`}
                                >
                                    {action.icon && <action.icon className={action.label ? "w-4 h-4" : "w-5 h-5"} />}
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showStatus && (
                <div className="absolute top-8 right-8 hidden md:flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    <span className="text-[10px] font-black text-white tracking-[0.1em] uppercase">{statusText}</span>
                </div>
            )}
        </div>
    );
};

export default PageHero;
