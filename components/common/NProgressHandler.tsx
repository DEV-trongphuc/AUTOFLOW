import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import nprogress from 'nprogress';
import 'nprogress/nprogress.css';

// Tweak NProgress Configuration
nprogress.configure({ 
    showSpinner: false,
    speed: 400,
    minimum: 0.1,
    easing: 'ease'
});

// Dynamic style overrides to bypass cache/loading order issues
if (typeof document !== 'undefined') {
    const id = 'nprogress-custom-theme-style';
    if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.innerHTML = `
            #nprogress .bar {
                background: linear-gradient(to right, #8b5cf6, #6366f1, #4f46e5) !important;
                height: 3px !important;
                position: fixed;
                z-index: 99999;
                top: 0;
                left: 0;
                width: 100%;
            }
            #nprogress .peg {
                box-shadow: 0 0 10px #8b5cf6, 0 0 5px #6366f1 !important;
            }
        `;
        document.head.appendChild(style);
    }
}

export const NProgressHandler = () => {
    const location = useLocation();

    useEffect(() => {
        nprogress.start();
        
        // Slight delay to allow the new page to mount before stopping the bar
        const timer = setTimeout(() => {
            nprogress.done();
        }, 150);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    return null;
};
