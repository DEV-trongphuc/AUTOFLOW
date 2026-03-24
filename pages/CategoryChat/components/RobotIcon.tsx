import React from 'react';

const RobotIcon = React.memo(({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M12 2v8" />
        <path d="M9 22v-2" />
        <path d="M15 22v-2" />
        <circle cx="12" cy="2" r="2" />
        <path d="M9 15v.01" />
        <path d="M15 15v.01" />
    </svg>
));

export default RobotIcon;
