import React from 'react';

interface TabTransitionProps {
    children: React.ReactNode;
    className?: string;
}

const TabTransition: React.FC<TabTransitionProps> = ({ children, className = '' }) => {
    return (
        <div
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            className={`animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-2 duration-500 ${className}`}
        >
            {children}
        </div>
    );
};

export default TabTransition;
