import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Sparkles, Zap, Bot, Globe, Users, ShieldCheck, Clock, CheckCircle2, History, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/storageAdapter';
import { DEMO_MODE } from '../utils/config';
import { ALL_MODULES } from './Dashboard';


const ADMIN_EMAIL = 'dom.marketing.vn@gmail.com';

// Validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_VN_RE = /^(0|\+84)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
const URL_RE = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isPending, setIsPending] = useState(false);
    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            const result = await api.post<any>('login_google', { credential: credentialResponse.credential });

            if (result.success) {
                const userData = (result as any).data;
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('isAuthenticated', 'true');

                if (userData.status === 'approved') {
                    toast.success(`Chào mừng trở lại, ${userData.name}!`);
                    window.location.href = '/';
                } else {
                    setIsPending(true);
                    toast.error('Tài khoản của bạn đang chờ phê duyệt từ Admin.');
                }
            } else {
                toast.error((result as any).message || 'Lỗi đăng nhập');
            }
        } catch (error) {
            console.error('[Login] Google login failed:', error);
            toast.error('Lỗi kết nối máy chủ. Vui lòng thử lại.');
        }
    };

    // Marquee data split
    const row1 = ALL_MODULES.slice(0, Math.ceil(ALL_MODULES.length / 2));
    const row2 = ALL_MODULES.slice(Math.ceil(ALL_MODULES.length / 2));

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] text-center space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl">
                    <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500/50 animate-pulse">
                        <Clock className="w-12 h-12 text-amber-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tight">Access Locked 🔒</h2>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            Chào <span className="text-white font-bold">{(()=>{try{return JSON.parse(localStorage.getItem('user')||'{}')}catch{return{}}})().name}</span>! Tài khoản của bạn đã được đăng ký thành công nhưng cần Admin phê duyệt để truy cập hệ thống.
                        </p>
                    </div>
                    <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-xs font-bold text-amber-500/80 uppercase tracking-widest text-left">
                        <div className="flex gap-2">
                            <div className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                            <span>Hệ thống bảo mật đa lớp chặn truy cập trái phép.</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <div className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                            <span>Chúng tôi đã thông Báo cáo quản trị viên.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            setIsPending(false);
                        }}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest transition-all"
                    >
                        Quay lại trang đăng nhập
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative flex flex-col lg:flex-row bg-[#0f172a] overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 blur-[100px] rounded-full -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full -ml-64 -mb-64" />

            {/* Left Side: Brand & Visuals */}
            <div className="relative flex-1 p-8 lg:p-20 flex flex-col justify-center min-h-[50vh] lg:min-h-screen overflow-hidden">
                <div className="relative z-10 space-y-12">
                    {/* Header Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-full">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Digital Marketing Ecosystem</span>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter">
                            DOMATION <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                                AI VISION 2026.
                            </span>
                        </h1>
                        <p className="max-w-md text-lg text-slate-400 font-medium leading-relaxed">
                            Thế hệ tiếp theo của Marketing Automation. Tự động hóa điểm chạm, thấu hiểu Khách hàng và chuyển đổi doanh thu 24/7.
                        </p>
                    </div>

                    {/* Scrolling Features Marquee */}
                    <div className="relative w-full max-w-5xl overflow-hidden pause-on-hover mask-fade-edges mt-8">
                        {/* Fade masks for smooth disappearance at edges */}
                        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0f172a] to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0f172a] to-transparent z-10 pointer-events-none" />
                        
                        <div className="flex flex-col gap-4 w-full relative">
                            {/* Row 1 (Forward) */}
                            <div className="flex w-max animate-slide-infinite gap-4 pl-4 hover:[animation-play-state:paused]">
                                {[...row1, ...row1, ...row1].map((f, i) => (
                                    <div key={`r1-${i}`} className="w-[300px] shrink-0 p-5 bg-white/5 backdrop-blur-sm border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all duration-300">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg shadow-black/20`}>
                                            <f.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-white font-bold mb-1 truncate">{f.title}</h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">{f.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Row 2 (Reverse) */}
                            <div className="flex w-max animate-slide-infinite-reverse gap-4 pl-4 hover:[animation-play-state:paused]">
                                {[...row2, ...row2, ...row2].map((f, i) => (
                                    <div key={`r2-${i}`} className="w-[300px] shrink-0 p-5 bg-white/5 backdrop-blur-sm border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all duration-300">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg shadow-black/20`}>
                                            <f.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-white font-bold mb-1 truncate">{f.title}</h3>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">{f.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Animated Circles Decor */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.03] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] border border-white/[0.03] rounded-full pointer-events-none translate-x-10" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] border border-white/[0.05] rounded-full pointer-events-none translate-x-20" />
            </div>

            {/* Right Side: Identity Check */}
            <div className="relative w-full lg:w-[600px] bg-white/5 backdrop-blur-2xl border-l border-white/5 p-8 lg:p-20 flex flex-col justify-center items-center overflow-hidden">
                <div className="relative z-10 w-full max-w-sm space-y-12">
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-600/30 rotate-3 overflow-hidden p-2">
                            <img src="/imgs/ICON.png" className="w-full h-full object-contain" alt="Brand Icon" />
                        </div>
                        <div className="pt-4">
                            <h2 className="text-3xl font-black text-white tracking-tight">
                                {DEMO_MODE ? 'Trải nghiệm Demo' : 'Identity Check'}
                            </h2>
                            <p className="text-slate-400 font-medium mt-2">
                                {DEMO_MODE
                                    ? 'Hãy điền thông tin để khởi động trải nghiệm Demo miễn phí'
                                    : 'Duy nhất Google Login để tiếp tục'}
                            </p>
                        </div>
                    </div>

                    <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] shadow-inner">
                        <div className="flex justify-center flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                            {DEMO_MODE ? (
                                <div className="w-full text-center max-w-[320px] mx-auto">
                                    <button 
                                        onClick={() => {
                                            localStorage.setItem('user', JSON.stringify({ 
                                                id: 'guest_' + Date.now(), 
                                                name: 'Guest User', 
                                                email: 'demo@domation.net', 
                                                role: 'admin', 
                                                status: 'approved',
                                                isGuest: true
                                            }));
                                            localStorage.setItem('isAuthenticated', 'true');
                                            window.location.href = '/';
                                        }}
                                        className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95 group"
                                    >
                                        <Sparkles className="w-5 h-5 group-hover:scale-125 transition-transform" />
                                        Trải nghiệm Guest
                                        <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <p className="text-slate-400 text-xs font-medium mt-4">Nhấn để truy cập ngay bản Demo trải nghiệm hệ thống.</p>
                                </div>
                            ) : (
                                <>
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error('Google Sign In failed')}
                                        useOneTap
                                        theme="filled_black"
                                        shape="pill"
                                        size="large"
                                        width="320"
                                    />

                                    <div className="flex items-center gap-4 w-full max-w-[320px]">
                                        <div className="h-px flex-1 bg-white/10" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hoặc</span>
                                        <div className="h-px flex-1 bg-white/10" />
                                    </div>

                                    <button onClick={() => {
                                        localStorage.setItem('user', JSON.stringify({ 
                                            id: 'guest_' + Date.now(), 
                                            name: 'Guest User', 
                                            email: 'demo@domation.net', 
                                            role: 'admin', 
                                            status: 'approved',
                                            isGuest: true
                                        }));
                                        localStorage.setItem('isAuthenticated', 'true');
                                        window.location.href = '/';
                                    }} className="w-full max-w-[320px] h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                                        <User className="w-4 h-4 text-amber-500" />
                                        View as a Guest (Demo)
                                    </button>

                                    <p className="text-[11px] text-slate-500 font-bold text-center leading-relaxed mt-2 max-w-[320px]">
                                        Bằng cách đăng nhập, bạn đồng ý với các chính sách bảo mật và điều khoản sử dụng của hệ thống.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex items-center justify-center gap-8 pt-8 opacity-40">
                        <div className="flex flex-col items-center gap-2">
                            <History className="w-5 h-5 text-white" />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-white">Log Tracking</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-white">Verified Users</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Zap className="w-5 h-5 text-white" />
                            <span className="text-[8px] font-black uppercase tracking-tighter text-white">Quick Access</span>
                        </div>
                    </div>
                </div>

                {/* Subtle Text BG */}
                <div className="absolute bottom-10 right-10 text-white/5 text-[120px] font-black pointer-events-none select-none rotate-3 translate-y-20">
                    SECURE.
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .google-btn-wrapper svg {
                    display: inline !important;
                }
            `}</style>
        </div>
    );
};

export default Login;
