


import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
import { AuthProvider } from './components/contexts/AuthContext';
import { SettingsProvider } from './components/contexts/SettingsContext';
import { apiEvents } from './services/storageAdapter';

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Templates = lazy(() => import('./pages/Templates'));
const Audience = lazy(() => import('./pages/Audience'));
const Flows = lazy(() => import('./pages/Flows'));
const Settings = lazy(() => import('./pages/Settings'));
const Tags = lazy(() => import('./pages/Tags'));
const ApiTriggers = lazy(() => import('./pages/ApiTriggers'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const ZaloSettings = lazy(() => import('./pages/SocialSettings'));
const WebTracking = lazy(() => import('./pages/WebTracking'));
const LinksQR = lazy(() => import('./pages/LinksQR'));
const PublicClaim = lazy(() => import('./pages/PublicClaim'));
const AITraining = lazy(() => import('./pages/AITraining'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CategoryChatPage = lazy(() => import('./pages/CategoryChatPage'));
const MetaMessenger = lazy(() => import('./pages/MetaMessenger'));
const Documentation = lazy(() => import('./pages/Documentation'));
const PublicReport = lazy(() => import('./pages/PublicReport'));
const LoginPage = lazy(() => import('./pages/CategoryChat/LoginPage'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const WorkspaceSettings = lazy(() => import('./pages/WorkspaceSettings'));
const Profile = lazy(() => import('./pages/Profile'));
const Landing = lazy(() => import('./pages/Landing'));
const Surveys = lazy(() => import('./pages/Surveys'));
const SurveyEditorPage = lazy(() => import('./components/surveys/SurveyEditor' as any));
const PublicSurvey = lazy(() => import('./pages/PublicSurvey' as any));
const NotFound = lazy(() => import('./pages/NotFound'));

import PremiumLoader from './components/common/PremiumLoader';
import ErrorBoundary from './components/common/ErrorBoundary';
import { API_BASE_URL, DEMO_MODE } from '@/utils/config';
import axios from 'axios';

// ── [DEV] Synchronous auto-login for localhost ───────────────────────────────
// Runs at module-init time (before first React render) so ProtectedRoute sees
// `isAuthenticated = true` immediately — no redirect flash to /login.
// The X-Admin-Token header in storageAdapter.ts handles backend auth via proxy.
if (
    !DEMO_MODE &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port !== '') &&
    !localStorage.getItem('isAuthenticated')
) {
    localStorage.setItem('user', JSON.stringify({
        id: 1, name: 'Dev Admin', email: 'dev@localhost',
        role: 'admin', status: 'approved', isGuest: false
    }));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('auth_fix_v3_logout_done_prod', 'true');
}
// ─────────────────────────────────────────────────────────────────────────────

// [SECURITY] Strict Demo Mode Isolation
// Any rogue `axios` or `fetch` calls in new components that bypass `storageAdapter.ts`
// will be intercepted here and prevented from hitting the production server.
if (DEMO_MODE) {
    const originalAdapter = axios.defaults.adapter;
    axios.defaults.adapter = (config: any) => {
        if (config.url?.includes(API_BASE_URL) || config.url?.includes('.php')) {
            console.warn('[DEMO MODE] Blocked rogue axios request:', config.url);
            return Promise.resolve({
                data: { success: true, data: [], message: 'Mocked by Demo Guard' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: config,
                request: {}
            });
        }
        if (originalAdapter) {
            return (originalAdapter as any)(config);
        }
        // Fallback for newer axios versions where adapter is not set by default
        return Promise.reject(new Error('No original adapter'));
    };

    const originalFetch = window.fetch;
    window.fetch = async function () {
        const url = arguments[0];
        if (typeof url === 'string' && (url.includes(API_BASE_URL) || url.includes('.php'))) {
            console.warn('[DEMO MODE] Blocked rogue fetch request:', url);
            return new Response(JSON.stringify({ success: true, data: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return originalFetch.apply(this, arguments as any);
    };
}

// Loading fallback component — only for initial cold boot
const PageLoader = () => <PremiumLoader title="AI-SPACE" subtitle="Đang tải ứng dụng..." />;

// [PERF] Full-width amber progress bar for tab switches
const TabLoader = () => {
    // Portal to document.body so it is strictly fixed to window bounds 
    // and ignores AnimatePresence transform/translate!
    return mountComponent() ? createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, height: '4px', background: '#fef3c7', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', top: 0, left: '-100%', bottom: 0, width: '100%',
                background: '#d97706',
                boxShadow: '0 0 15px 4px #fbbf24',
                animation: 'tlbar 0.6s cubic-bezier(0.4,0,0.2,1) infinite',
            }} />
            <style>{`@keyframes tlbar { 0%{left:-100%} 100%{left:100%} }`}</style>
        </div>,
        document.body
    ) : null;
};

// Helper to only render portal on client
function mountComponent() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

// [PERF] Per-route Suspense wrapper — only THIS route's chunk triggers TabLoader,
// NOT the whole app. Combined with startTransition in Sidebar: old page visible
// while new chunk loads, TabLoader shows subtle progress at top.
const P = ({ c: C }: { c: React.LazyExoticComponent<React.ComponentType<any>> }) => (
    <ErrorBoundary>
        <Suspense fallback={<TabLoader />}><C /></Suspense>
    </ErrorBoundary>
);

const HashRedirect = () => {
    const navigate = useNavigate();
    useEffect(() => {
        if (window.location.hash && window.location.hash.startsWith('#/')) {
            const path = window.location.hash.slice(1);
            navigate(path, { replace: true });
        }
    }, [navigate]);
    return null;
};

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
        // [ISOLATION] Skip all production auth side-effects in DEMO_MODE
        if (DEMO_MODE) return;

        const isLocalDev =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port !== '';

        // ── [DEV] Auto-login bypass for localhost ────────────────────────────
        // On local dev, skip Google Login entirely. Inject a dev session so we
        // can reach the app directly. The X-Admin-Token header in storageAdapter
        // already authenticates every API call to the production backend proxy.
        if (isLocalDev && !localStorage.getItem('isAuthenticated')) {
            localStorage.setItem('user', JSON.stringify({
                id: 1,
                name: 'Dev Admin',
                email: 'dev@localhost',
                role: 'admin',
                status: 'approved',
                isGuest: false
            }));
            localStorage.setItem('isAuthenticated', 'true');
            // Also reset the force-logout flag so it doesn't kick the session out
            localStorage.setItem('auth_fix_v3_logout_done_prod', 'true');
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        // --- FORCE ONE-TIME LOGOUT TO FIX CORRUPTED SESSIONS ---
        if (!localStorage.getItem('auth_fix_v3_logout_done_prod')) {
            localStorage.setItem('auth_fix_v3_logout_done_prod', 'true');
            if (localStorage.getItem('user')) {
                localStorage.removeItem('user');
                localStorage.removeItem('isAuthenticated');
                const apiBase = isLocalDev ? '/mail_api' : API_BASE_URL;
                fetch(`${apiBase}/auth.php?action=logout`, { method: 'POST', credentials: 'include' })
                    .catch(() => {})
                    .finally(() => {
                        window.location.href = '/#/login'; 
                    });
                return;
            }
        }
        // -------------------------------------------------------

        // [PERF] Only seed mock data if real data doesn't exist yet
        if (!localStorage.getItem('user')) seedData();
    }, []);

    // ── Worker Heartbeat + Activity Tracker ──────────────────────────────────
    // Ping worker_queue.php every 60s so scheduled flow steps (e.g. after a
    // Delay step) are processed promptly instead of waiting for a random API hit.
    // Also pings auth.php every 5 min to keep last_login fresh while user is active.
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activityRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        const isLocal =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port !== '';
        const apiBase = isLocal ? '/mail_api' : `${API_BASE_URL}`;

        const pingWorker = () => {
            // Only ping when tab is visible to avoid unnecessary load in background
            if (document.visibilityState !== 'visible') return;
            // Fire-and-forget: workers are now handled securely by Server CRON
            // and internal self-triggers. Frontend no longer calls workers directly.
        };

        // [NEW] Ping auth.php to refresh last_login every 5 minutes
        // db_connect.php already throttles the UPDATE to max once per 5 min via session
        const pingActivity = () => {
            // [ISOLATION] Never ping production backend from DEMO_MODE
            if (DEMO_MODE) return;
            if (document.visibilityState !== 'visible') return;
            fetch(`${apiBase}/auth.php?action=ping`, { method: 'GET', credentials: 'include' }).catch(() => { });
        };

        // Immediate first ping, then every 60 seconds
        pingWorker();
        pingActivity(); // Update last_login on app load
        heartbeatRef.current = setInterval(pingWorker, 60_000);
        activityRef.current = setInterval(pingActivity, 5 * 60_000); // every 5 min

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (activityRef.current) clearInterval(activityRef.current);
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
            <AuthProvider>
                <SettingsProvider>
                <BrowserRouter>
                    <HashRedirect />
                    <KeyboardShortcutsProvider>
                        <NavigationProvider>
                            {/* [PERF] Outer Suspense for initial app boot only */}
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    {/* Public routes */}
                                    <Route path="/landing" element={<P c={Landing} />} />
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
                                    {/* Public survey renderer */}
                                    <Route path="/s/:slug" element={<P c={PublicSurvey} />} />
                                    <Route path="/claim/:id" element={<P c={PublicClaim} />} />

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
                                    <Route path="/links-qr" element={
                                        <ProtectedRoute><Layout><P c={LinksQR} /></Layout></ProtectedRoute>
                                    } />
                                    <Route path="/ai-training" element={
                                        <ProtectedRoute>
                                            <ChatPageProvider><Layout><P c={AITraining} /></Layout></ChatPageProvider>
                                        </ProtectedRoute>
                                    } />
                                    <Route path="/admin/users" element={
                                        <ProtectedRoute><Layout><P c={AdminUsers} /></Layout></ProtectedRoute>
                                    } />
                                    <Route path="/admin/workspace" element={
                                        <ProtectedRoute><Layout><P c={WorkspaceSettings} /></Layout></ProtectedRoute>
                                    } />
                                    <Route path="/profile" element={
                                        <ProtectedRoute><Layout><P c={Profile} /></Layout></ProtectedRoute>
                                    } />
                                    {/* Survey Builder Routes */}
                                    <Route path="/surveys" element={
                                        <ProtectedRoute><Layout><P c={Surveys} /></Layout></ProtectedRoute>
                                    } />
                                    <Route path="/surveys/:id/edit" element={
                                        <ProtectedRoute><P c={SurveyEditorPage} /></ProtectedRoute>
                                    } />
                                    <Route path="/surveys/:id/analytics" element={
                                        <ProtectedRoute><Layout><P c={Surveys} /></Layout></ProtectedRoute>
                                    } />

                                    {/* 404 — unknown routes */}
                                    <Route path="*" element={
                                        <Suspense fallback={<TabLoader />}><NotFound /></Suspense>
                                    } />
                                </Routes>
                            </Suspense>
                        </NavigationProvider>
                    </KeyboardShortcutsProvider>
                </BrowserRouter>
                </SettingsProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;