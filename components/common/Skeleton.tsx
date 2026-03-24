import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animate?: 'pulse' | 'shimmer' | 'none';
}

// Inject keyframe once
let _injected = false;
const injectKf = () => {
    if (_injected || typeof document === 'undefined') return;
    const s = document.createElement('style');
    s.textContent = `@keyframes sk-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`;
    document.head.appendChild(s);
    _injected = true;
};

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animate = 'shimmer',
}) => {
    injectKf();

    const variantClasses: Record<string, string> = {
        text: 'h-4 w-full rounded',
        circular: 'rounded-full',
        rectangular: 'rounded',
        rounded: 'rounded-lg',
    };

    const baseStyle: React.CSSProperties = {
        background: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden',
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? 16 : '100%'),
    };

    return (
        <div className={`${variantClasses[variant]} ${animate === 'pulse' ? 'animate-pulse' : ''} ${className}`} style={baseStyle}>
            {animate === 'shimmer' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)',
                    animation: 'sk-shimmer 1.4s ease-in-out infinite',
                    transform: 'translateX(-100%)',
                }} />
            )}
        </div>
    );
};

export default Skeleton;
