


import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,  // 5 min — data fresh time
            gcTime: 1000 * 60 * 10,    // [PERF] 10 min garbage collect — keep cache when switching tabs
            retry: 1,
            refetchOnWindowFocus: false, // [PERF] Don't refetch just because user alt-tab back
        },
    },
});
// [PERF] Login is also lazy-loaded — not needed for authenticated users
const Login = lazy(() => import('./pages/Login'));
import ProtectedRoute from './components/auth/ProtectedRoute';
import { seedData } from './services/mockData';

import { NavigationProvider } from './contexts/NavigationContext';
import { ChatPageProvider } from './contexts/ChatPageContext';
import { KeyboardShortcutsProvider } from './components/common/KeyboardShortcutsProvider';
import { apiEvents } from './services/storageAdapter';

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Templates = lazy(() => import('./pages/Templates'));
const Audience = lazy(() => import('./pages/Audience'));
const Flows = lazy(() => import('./pages/Flows'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const Tags = lazy(() => import('./pages/Tags'));
const ApiTriggers = lazy(() => import('./pages/ApiTriggers'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const ZaloSettings = lazy(() => import('./pages/SocialSettings'));
const WebTracking = lazy(() => import('./pages/WebTracking'));
const AITraining = lazy(() => import('./pages/AITraining'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CategoryChatPage = lazy(() => import('./pages/CategoryChatPage'));
const MetaMessenger = lazy(() => import('./pages/MetaMessenger'));
const Documentation = lazy(() => import('./pages/Documentation'));
const PublicReport = lazy(() => import('./pages/PublicReport'));
const LoginPage = lazy(() => import('./pages/CategoryChat/LoginPage'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const Profile = lazy(() => import('./pages/Profile'));

import PremiumLoader from './components/common/PremiumLoader';

// Loading fallback component — only for initial cold boot
const PageLoader = () => <PremiumLoader title="AI-SPACE" subtitle="Đang tải ứng dụng..." />;

// [PERF] Full-width amber progress bar for tab switches
const TabLoader = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, height: '4px', background: '#fef3c7', overflow: 'hidden' }}>
        <div style={{
            position: 'absolute', top: 0, left: '-100%', bottom: 0, width: '100%',
            background: '#d97706',
            boxShadow: '0 0 15px 4px #fbbf24',
            animation: 'tlbar 0.6s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />
        <style>{`@keyframes tlbar { 0%{left:-100%} 100%{left:100%} }`}</style>
    </div>
);

// [PERF] Per-route Suspense wrapper — only THIS route's chunk triggers TabLoader,
// NOT the whole app. Combined with startTransition in Sidebar: old page visible
// while new chunk loads, TabLoader shows subtle progress at top.
const P = ({ c: C }: { c: React.LazyExoticComponent<React.FC<any>> }) => (
    <Suspense fallback={<TabLoader />}><C /></Suspense>
);

const GlobalDeleteOverlay = () => {
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        return apiEvents.onDeleteStateChange(setIsDeleting);
    }, []);

    if (!isDeleting) return null;

    return (
        <div className="fixed inset-0 z-[9999999] bg-white/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100/50 flex items-center space-x-3 text-slate-600 font-medium">
                <svg className="animate-spin h-5 w-5 text-rose-500" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang xử lý dọn dẹp dữ liệu...</span>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    useEffect(() => {
        // [PERF] Only seed mock data if real data doesn't exist yet
        if (!localStorage.getItem('user')) seedData();
    }, []);

    // ── Worker Heartbeat ──────────────────────────────────────────────────────
    // Ping worker_queue.php every 60s so scheduled flow steps (e.g. after a
    // Delay step) are processed promptly instead of waiting for a random API hit.
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        const isLocal =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port !== '';
        const apiBase = isLocal ? '/mail_api' : 'https://automation.ideas.edu.vn/mail_api';

        const pingWorker = () => {
            // Only ping when tab is visible to avoid unnecessary load in background
            if (document.visibilityState !== 'visible') return;
            // Fire-and-forget: we don't need the response
            fetch(`${apiBase}/worker_queue.php`, { method: 'GET', credentials: 'include' }).catch(() => { });
            fetch(`${apiBase}/worker_flow.php`, { method: 'GET', credentials: 'include' }).catch(() => { });
        };

        // Immediate first ping, then every 60 seconds
        pingWorker();
        heartbeatRef.current = setInterval(pingWorker, 60_000);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    // ── Eager Loading ────────────────────────────────────────────────────────
    // [PERF] Background-load all major route chunks after 3s of idle time
    // This removes the "loading" state when user clicks a menu item for the first time.
    useEffect(() => {
        const timer = setTimeout(() => {
            const chunks = [
                () => import('./pages/Dashboard'),
                () => import('./pages/Campaigns'),
                () => import('./pages/Flows'),
                () => import('./pages/Audience'),
                () => import('./pages/Templates'),
                () => import('./pages/Reports'),
                () => import('./pages/Settings'),
                () => import('./pages/Vouchers'),
                () => import('./pages/AITraining'),
                () => import('./pages/WebTracking'),
                () => import('./pages/Tags'),
            ];
            chunks.forEach(c => c().catch(() => {}));
            console.log('[PERF] All major route chunks eager-loaded.');
        }, 3000);
        return () => clearTimeout(timer);
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <QueryClientProvider client={queryClient}>
            <Toaster
                position="top-right"
                containerStyle={{
                    zIndex: 999999,
                }}
                toastOptions={{
                    style: {
                        borderRadius: '16px',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: '600',
                        padding: '12px 16px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        border: '1px solid #f1f5f9'
                    },
                    success: {
                        iconTheme: {
                            primary: '#1e293b',
                            secondary: '#fff',
                        },
                    },
                }}
            />
            <GlobalDeleteOverlay />
            <HashRouter>
                <KeyboardShortcutsProvider>
                    <NavigationProvider>
                        {/* [PERF] Outer Suspense for initial app boot only */}
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                {/* Public routes */}
                                <Route path="/login" element={<P c={Login} />} />
                                <Route path="/docs" element={<P c={Documentation} />} />
                                <Route path="/chat/:chatbotId" element={<P c={ChatPage} />} />
                                <Route
                                    path="/ai-space/:categoryId/*"
                                    element={
                                        <ChatPageProvider>
                                            <Routes>
                                                <Route path="login" element={<P c={LoginPage} />} />
                                                <Route index element={<P c={CategoryChatPage} />} />
                                                <Route path=":chatbotId" element={<P c={CategoryChatPage} />} />
                                                <Route path=":chatbotId/:sessionId" element={<P c={CategoryChatPage} />} />
                                            </Routes>
                                        </ChatPageProvider>
                                    }
                                />
                                <Route path="/public-report/:propertyId" element={<P c={PublicReport} />} />
                                <Route path="/public-report/:propertyId/index/:index" element={<P c={PublicReport} />} />

                                {/* Protected Routes — each has its own Suspense via P */}
                                <Route path="/" element={
                                    <ProtectedRoute><Layout><P c={Dashboard} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/campaigns" element={
                                    <ProtectedRoute><Layout><P c={Campaigns} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/templates" element={
                                    <ProtectedRoute><Layout><P c={Templates} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/audience" element={
                                    <ProtectedRoute><Layout><P c={Audience} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/flows" element={
                                    <ProtectedRoute><Layout><P c={Flows} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/tags" element={
                                    <ProtectedRoute><Layout><P c={Tags} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/vouchers" element={
                                    <ProtectedRoute><Layout><P c={Vouchers} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/api-triggers" element={
                                    <ProtectedRoute><Layout><P c={ApiTriggers} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/settings" element={
                                    <ProtectedRoute><Layout><P c={Settings} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/zalo-settings" element={
                                    <ProtectedRoute><Layout><P c={ZaloSettings} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/meta-messenger" element={
                                    <ProtectedRoute><Layout><P c={MetaMessenger} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/web-tracking" element={
                                    <ProtectedRoute><Layout><P c={WebTracking} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/ai-training" element={
                                    <ProtectedRoute>
                                        <ChatPageProvider><Layout><P c={AITraining} /></Layout></ChatPageProvider>
                                    </ProtectedRoute>
                                } />
                                <Route path="/reports" element={
                                    <ProtectedRoute><Layout><P c={Reports} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/admin/users" element={
                                    <ProtectedRoute><Layout><P c={AdminUsers} /></Layout></ProtectedRoute>
                                } />
                                <Route path="/profile" element={
                                    <ProtectedRoute><Layout><P c={Profile} /></Layout></ProtectedRoute>
                                } />

                                {/* Fallback */}
                                <Route path="*" element={
                                    <ProtectedRoute><Layout><Navigate to="/campaigns" replace /></Layout></ProtectedRoute>
                                } />
                            </Routes>
                        </Suspense>
                    </NavigationProvider>
                </KeyboardShortcutsProvider>
            </HashRouter>
        </QueryClientProvider>
    );
};

export default App;