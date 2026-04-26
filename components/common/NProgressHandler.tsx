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
