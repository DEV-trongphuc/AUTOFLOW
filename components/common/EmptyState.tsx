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
                <div className={`w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100/50 shadow-inner relative group`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Icon className={`w-10 h-10 ${iconColor} transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`} />
                </div>

                <h3 className="text-lg font-black text-slate-800 mb-2 uppercase tracking-tight">
                    {title}
                </h3>

                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                    {description}
                </p>

                {ctaLabel && onCtaClick && (
                    <Button
                        onClick={onCtaClick}
                        variant={ctaClassName ? 'custom' : 'primary'}
                        className={ctaClassName || "shadow-xl shadow-blue-500/20 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest"}
                    >
                        {ctaLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default EmptyState;
