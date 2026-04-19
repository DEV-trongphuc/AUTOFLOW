import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Bot, Shield, Zap, Globe, Sparkles, Cpu } from 'lucide-react';
import { useChatPage } from '../../contexts/ChatPageContext';
import { GoogleLogin } from '@react-oauth/google';
import { useCategorySettings } from '../../hooks/useCategorySettings';
import SpaceBackground from '../../components/ai/SpaceBackground';

// GoogleOAuthProvider is already mounted at the root in index.tsx with the real Client ID.
// No need to re-wrap here.

// Helper to convert Hex to HSL
const hexToHSL = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
    let h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
};

const LoginPage = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams<{ categoryId: string }>();
    const { data: categorySettings } = useCategorySettings(categoryId);

    const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { loginOrgUser, loginOrgUserWithGoogle, orgUser, isCheckingOrgAuth } = useChatPage();

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!isCheckingOrgAuth && orgUser) {
            navigate(`/ai-space/${categoryId}`);
        }
    }, [orgUser, isCheckingOrgAuth, navigate, categoryId]);

    // Derived Brand Colors & Org Name
    const brandColor = categorySettings?.brand_color || '#3b82f6'; // Default Blue
    const orgName = categorySettings?.bot_name || 'Organization';
    const hsl = useMemo(() => hexToHSL(brandColor), [brandColor]);

    if (isCheckingOrgAuth) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    <div className="text-slate-400 text-sm font-medium tracking-wide">
                        Đang xác thực không gian...
                    </div>
                </div>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const success = await loginOrgUser(email, password, rememberMe);
            if (success) {
                if (rememberMe) {
                    localStorage.setItem('remembered_email', email);
                    localStorage.setItem('remember_me', 'true');
                } else {
                    localStorage.removeItem('remembered_email');
                    localStorage.setItem('remember_me', 'false');
                }
                navigate(`/ai-space/${categoryId}`); // Redirect to main chat with ID
            } else {
                setError('Email hoặc mật khẩu không chính xác, hoặc bạn không có quyền truy cập.');
            }
        } catch (err: any) {
            // Map common error messages to Vietnamese if needed, or use the server message
            const msg = err.message || '';
            if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('authorized')) {
                setError('Bạn không có quyền truy cập vào nhóm này.');
            } else {
                setError(msg || 'Đăng nhập thất bại. Bạn không có quyền truy cập.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        setError(null);
        try {
            const success = await loginOrgUserWithGoogle(credentialResponse.credential);
            if (success) {
                navigate(`/ai-space/${categoryId}`);
            } else {
                setError('Bạn không có quyền truy cập vào nhóm này bằng tài khoản Google này.');
            }
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('authorized')) {
                setError('Bạn không có quyền truy cập vào nhóm này.');
            } else {
                setError('Bạn không có quyền truy cập. Vui lòng liên hệ quản trị viên.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden bg-black">

                {/* Dynamic Brand Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    :root {
                        --brand-h: ${hsl.h};
                        --brand-s: ${hsl.s}%;
                        --brand-l: ${hsl.l}%;
                        --brand-primary-base: var(--brand-h), var(--brand-s), var(--brand-l);
                        --brand-dark-base: var(--brand-h), var(--brand-s), calc(var(--brand-l) * 0.4);
                        --brand-primary: hsl(var(--brand-primary-base));
                    }
                    .bg-brand { background-color: hsla(var(--brand-primary-base), var(--tw-bg-opacity, 1)) !important; }
                    .bg-brand-dark { background-color: hsla(var(--brand-dark-base), var(--tw-bg-opacity, 1)) !important; }
                    .text-brand { color: hsla(var(--brand-primary-base), var(--tw-text-opacity, 1)) !important; }
                    .text-brand-dark { color: hsla(var(--brand-dark-base), var(--tw-text-opacity, 1)) !important; }
                    .border-brand { border-color: hsla(var(--brand-primary-base), var(--tw-border-opacity, 1)) !important; }
                    .ring-brand { --tw-ring-color: hsla(var(--brand-primary-base), var(--tw-ring-opacity, 1)) !important; }
                    .hover\\:bg-brand:hover { background-color: hsla(var(--brand-primary-base), var(--tw-bg-opacity, 0.9)) !important; }
                    
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                    }
                    .animate-float { animation: float 6s ease-in-out infinite; }
                    
                    @keyframes glow {
                        0%, 100% { box-shadow: 0 0 20px -5px hsla(var(--brand-primary-base), 0.3); }
                        50% { box-shadow: 0 0 40px -5px hsla(var(--brand-primary-base), 0.6); }
                    }
                    .animate-glow { animation: glow 4s ease-in-out infinite; }
                `}} />

                {/* Spectacular Space Background */}
                <SpaceBackground theme="pure-black" opacity={0.8} />

                {/* Overlay Gradients - Adjusted for pure black feel */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-transparent to-black/80 pointer-events-none z-0" />

                <div className="max-w-6xl w-full bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[650px] m-4 relative z-10 border border-white/10 animate-in fade-in zoom-in-95 duration-500">

                    {/* Left Side - Feature Showcase (Dark Cosmic Theme) */}
                    <div className="hidden md:flex w-5/12 bg-black relative overflow-hidden flex-col justify-between p-12 text-white border-r border-white/5">

                        {/* Dynamic Background Elements */}
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand rounded-full blur-[100px] opacity-20 animate-pulse-slow"></div>
                        <div className="absolute top-1/2 right-0 w-96 h-96 bg-brand-dark rounded-full blur-[120px] opacity-20 animate-pulse-slow delay-700"></div>

                        {/* Brand Header */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-lg shadow-brand/20 animate-float">
                                    <Sparkles className="w-6 h-6 text-brand" />
                                </div>
                                <div className="h-px bg-gradient-to-r from-brand/50 to-transparent w-24"></div>
                            </div>

                            <h1 className="text-5xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-sm">
                                AI SPACE
                            </h1>

                            <div className="flex items-center gap-2 text-lg font-medium text-slate-400 mb-8">
                                <span className="w-8 h-px bg-slate-600"></span>
                                <span className="font-light italic">powered by</span>
                                <span className="text-brand font-bold uppercase tracking-wider animate-pulse">{orgName}</span>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs border-l-2 border-brand/30 pl-4 py-1">
                                Trải nghiệm không gian làm việc trí tuệ nhân tạo thế hệ mới. Tối ưu hóa hiệu suất, bảo mật tuyệt đối.
                            </p>
                        </div>

                        {/* Feature Cards with Glassmorphism */}
                        <div className="relative z-10 space-y-3 pr-4 max-h-[400px] overflow-y-auto no-scrollbar">
                            <div className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-brand/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-brand/20 rounded-xl text-brand group-hover:scale-110 transition-transform duration-300">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm group-hover:text-brand transition-colors">Agents Chuyên Sâu</h4>
                                        <p className="text-slate-500 text-[10px] mt-0.5">Sở hữu các AI Agent được training sẵn theo nghiệp vụ</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                        <Cpu className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">Code Mode</h4>
                                        <p className="text-slate-500 text-[10px] mt-0.5">Lập trình viên AI hỗ trợ viết và debug code đa ngôn ngữ</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform duration-300">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">Image Mode</h4>
                                        <p className="text-slate-500 text-[10px] mt-0.5">Sáng tạo hình ảnh đỉnh cao với DALL-E 3 & Flux</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-default">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-2.5 bg-orange-500/20 rounded-xl text-orange-400 group-hover:scale-110 transition-transform duration-300">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">RAG - Document IA</h4>
                                        <p className="text-slate-500 text-[10px] mt-0.5">Tương tác và phân tích sâu dữ liệu PDF, Excel, Word</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-brand/30 hover:bg-white/10 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-default">
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{ background: 'linear-gradient(to right, hsla(var(--brand-dark-base), 0.2), transparent)' }}
                                />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div
                                        className="p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300"
                                        style={{ backgroundColor: 'hsla(var(--brand-dark-base), 0.3)', color: 'hsla(var(--brand-dark-base), 1)' }}
                                    >
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm group-hover:text-brand transition-colors">Bảo Mật Cấp Cao</h4>
                                        <p className="text-slate-500 text-[10px] mt-0.5">Mã hóa đầu cuối cho dữ liệu doanh nghiệp</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tech Footer */}
                        <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-600 font-mono border-t border-white/5 pt-4 mt-8">
                            <div className="flex gap-4">
                                <span>v2.5.0</span>
                                <span className="text-brand">● SYSTEM ONLINE</span>
                            </div>
                            <div>ID: {categoryId?.substring(0, 8)}...</div>
                        </div>
                    </div>

                    {/* Right Side - Login Form (Clean White) */}
                    <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white/80 backdrop-blur-xl relative">
                        <div className="max-w-md mx-auto w-full">
                            <div className="mb-10 text-center md:text-left animate-in slide-in-from-bottom-4 duration-500 delay-100">
                                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Xin chào,</h2>
                                <p className="text-slate-500 font-medium">Đăng nhập để truy cập vào <span className="text-brand font-bold">{orgName} AI SPACE</span></p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2 shadow-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Doanh Nghiệp</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mật khẩu</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer group select-none relative py-1">
                                        <div className="relative flex items-center w-5 h-5">
                                            <input
                                                id="remember-me"
                                                type="checkbox"
                                                className="peer absolute inset-0 opacity-0 cursor-pointer z-50"
                                                checked={rememberMe}
                                                onChange={(e) => {
                                                    console.log('Checkbox changed:', e.target.checked);
                                                    setRememberMe(e.target.checked);
                                                }}
                                            />
                                            {/* Visual Checkbox */}
                                            <div className={`absolute inset-0 border-2 rounded-md transition-all flex items-center justify-center pointer-events-none ${rememberMe ? 'bg-brand border-brand' : 'border-slate-300'
                                                }`}>
                                                <CheckCircle2 className={`w-3.5 h-3.5 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'
                                                    }`} />
                                            </div>
                                        </div>
                                        <span className="text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Ghi nhớ</span>
                                    </label>
                                    <button type="button" className="text-xs font-bold text-slate-400 hover:text-brand uppercase tracking-wider transition-colors">
                                        Quên mật khẩu?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-slate-900 hover:bg-brand text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-slate-900/10 hover:shadow-brand/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Đang xác thực...</span>
                                            </>
                                        ) : (
                                            <>
                                                Đăng Nhập <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>

                            <div className="mt-8 relative animate-in slide-in-from-bottom-4 duration-500 delay-300">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                                    <span className="px-4 bg-white/80 backdrop-blur text-slate-400">Hoặc tiếp tục với</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Đăng nhập Google thất bại. Vui lòng thử lại.')}
                                    shape="pill"
                                    width="400"
                                    theme="filled_blue"
                                    text="continue_with"
                                    size="large"
                                    useOneTap
                                    cancel_on_tap_outside={false}
                                />
                                <p className="text-[10px] text-slate-400 font-medium text-center">
                                    Chỉ tài khoản được Admin tổ chức phê duyệt mới có thể truy cập.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes shimmer {
                        100% { transform: translateX(100%); }
                    }
                    .animate-pulse-slow {
                        animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                `}</style>
        </div>
    );
};

export default LoginPage;
