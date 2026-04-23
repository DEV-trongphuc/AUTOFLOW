
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Compass, Zap } from 'lucide-react';

const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [countdown, setCountdown] = useState(10);
    const [glitch, setGlitch] = useState(false);

    // Only show internal navigation for authenticated users
    const isAuthenticated = !!localStorage.getItem('isAuthenticated');

    // Auto-redirect only for authenticated users (external users stay on 404)
    useEffect(() => {
        if (!isAuthenticated) return;
        const tick = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { navigate('/'); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [navigate, isAuthenticated]);

    // Glitch effect
    useEffect(() => {
        const glitchInterval = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 300);
        }, 3000);
        return () => clearInterval(glitchInterval);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #1a0e00 0%, #1f1208 40%, #180d00 100%)' }}>

            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'linear-gradient(#f97316 1px,transparent 1px),linear-gradient(90deg,#f97316 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* Glow orbs */}
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)' }} />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)' }} />

            {/* Main card */}
            <div className="relative z-10 text-center max-w-lg w-full">

                {/* 404 Number */}
                <div className="relative mb-6 select-none">
                    <span
                        className={`text-[160px] font-black leading-none tracking-tighter transition-all duration-100 ${glitch ? 'translate-x-1' : ''}`}
                        style={{
                            fontFamily: 'system-ui, sans-serif',
                            background: 'linear-gradient(180deg, #fed7aa 0%, #f97316 50%, #c2410c 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: glitch
                                ? 'drop-shadow(3px 0 #ea580c) drop-shadow(-3px 0 #fbbf24)'
                                : 'drop-shadow(0 0 60px rgba(249,115,22,0.3))',
                        }}
                    >
                        404
                    </span>
                    {/* Reflection */}
                    <span
                        className="absolute inset-0 text-[160px] font-black leading-none tracking-tighter scale-y-[-1] opacity-20 blur-[2px]"
                        style={{
                            fontFamily: 'system-ui, sans-serif',
                            background: 'linear-gradient(0deg, #f97316 0%, transparent 60%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                        aria-hidden
                    >
                        404
                    </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 8px 32px rgba(249,115,22,0.35)' }}>
                        <Compass className="w-7 h-7 text-white" />
                    </div>
                </div>

                {/* Text */}
                <h1 className="text-2xl font-bold text-orange-50 mb-2">Trang không tồn tại</h1>
                <p className="text-orange-200/50 text-sm mb-3 leading-relaxed">
                    Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển.
                </p>

                {/* Current path pill — only show to authenticated users to avoid info leak */}
                {isAuthenticated && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-8"
                        style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        <code className="text-xs text-orange-300/70 font-mono max-w-[260px] truncate">{location.pathname}</code>
                    </div>
                )}

                {/* Actions — authenticated users get navigation, external users get nothing */}
                {isAuthenticated ? (
                    <>
                        <div className={`flex flex-col sm:flex-row gap-3 justify-center ${!isAuthenticated ? '' : 'mb-0'}`}>
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                                style={{ border: '1px solid rgba(249,115,22,0.25)', color: '#fed7aa', background: 'rgba(249,115,22,0.06)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.15)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.06)')}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200"
                                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
                                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                            >
                                <Home className="w-4 h-4" />
                                Về trang chủ
                            </button>
                        </div>

                        {/* Auto redirect countdown — authenticated only */}
                        <div className="mt-10 relative">
                            <div className="flex items-center justify-center gap-2 text-xs mb-2" style={{ color: 'rgba(249,115,22,0.5)' }}>
                                <Zap className="w-3 h-3 text-orange-500" />
                                <span>Tự động chuyển hướng sau <span className="text-orange-400 font-bold tabular-nums">{countdown}s</span></span>
                            </div>
                            <div className="h-[2px] w-48 mx-auto rounded-full overflow-hidden" style={{ background: 'rgba(249,115,22,0.15)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${(countdown / 10) * 100}%`, background: 'linear-gradient(90deg, #f97316, #fbbf24)' }}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    /* External / unauthenticated users: neutral message, no system links */
                    <p className="text-orange-200/30 text-xs mt-6">
                        Vui lòng kiểm tra lại đường dẫn.
                    </p>
                )}
            </div>
        </div>
    );
};

export default NotFound;
