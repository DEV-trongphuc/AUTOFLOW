import * as React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    // [PERF FIX] Synchronous auth check via useState lazy initializer.
    // Previously: useEffect + null state → spinner flash on EVERY tab switch.
    // Now: reads localStorage synchronously at first render → zero spinner delay.
    const isAuthenticated = React.useMemo(() => {
        const authStatus = localStorage.getItem('isAuthenticated');
        const user = localStorage.getItem('user');
        return authStatus === 'true' && !!user;
    }, []); // stable — localStorage doesn't change between renders

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;

