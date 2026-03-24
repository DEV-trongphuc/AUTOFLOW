import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Sparkles, Zap, TrendingUp, Bot } from 'lucide-react';
import { api } from '../services/storageAdapter';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post<any>('auth?action=login', {
                username,
                password
            });

            if (response.success) {
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(response.data));
                localStorage.setItem('isAuthenticated', 'true');

                // Redirect to dashboard
                navigate('/');
                window.location.reload(); // Reload to update app state
            } else {
                setError(response.message || 'Đăng nhập thất bại');
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,169,0,0.15),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(251,191,36,0.1),transparent_50%)]"></div>

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,169,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,169,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-amber-400/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 20}s`
                        }}
                    />
                ))}
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>

            {/* Main Content */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

                    {/* Left Side - Branding */}
                    <div className="hidden lg:block space-y-8 text-white">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-full">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-sm font-bold text-amber-100">DOM Marketing Automation Platform</span>
                            </div>
                            <h1 className="text-6xl font-black leading-tight">
                                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                                    AutoFlow Pro
                                </span>
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                Nền tảng tự động hóa marketing thông minh, giúp doanh nghiệp tăng trưởng vượt bậc
                            </p>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid gap-4">
                            {[
                                {
                                    icon: Bot,
                                    title: 'Đồng bộ Trợ lý AI',
                                    desc: 'Tự động đồng bộ Web, Messenger, Zalo'
                                },
                                {
                                    icon: Zap,
                                    title: 'Automation Flow',
                                    desc: 'Tự động hóa quy trình chăm sóc đa kênh'
                                },
                                {
                                    icon: TrendingUp,
                                    title: 'Phân tích hành vi',
                                    desc: 'Theo dõi hành trình khách hàng 360°'
                                }
                            ].map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-4 p-4 bg-white/5 backdrop-blur-sm border border-amber-500/20 rounded-2xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
                                >
                                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 group-hover:shadow-amber-500/50 transition-all">
                                        <feature.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                                        <p className="text-sm text-slate-400">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="relative">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>

                        <div className="relative bg-white/10 backdrop-blur-xl border border-amber-500/20 rounded-3xl shadow-2xl p-8 lg:p-10">
                            {/* Logo */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl mb-6 shadow-2xl shadow-amber-500/50 relative group">
                                    <Mail className="w-10 h-10 text-white relative z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2">Chào mừng trở lại</h2>
                                <p className="text-slate-300 font-medium">Đăng nhập để tiếp tục quản lý</p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-6 p-4 bg-rose-500/20 backdrop-blur-sm border border-rose-500/30 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <AlertCircle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-rose-200 font-medium">{error}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Username Input */}
                                <div className="group">
                                    <label className="block text-xs font-black text-amber-200 mb-3 uppercase tracking-widest">
                                        Tên đăng nhập
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="admin"
                                            required
                                            className="w-full h-14 pl-5 pr-5 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-base font-bold text-white placeholder:text-slate-400 focus:border-amber-500 focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="group">
                                    <label className="block text-xs font-black text-amber-200 mb-3 uppercase tracking-widest">
                                        Mật khẩu
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full h-14 pl-5 pr-14 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-base font-bold text-white placeholder:text-slate-400 focus:border-amber-500 focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-amber-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full h-14 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-black text-base rounded-2xl shadow-2xl shadow-amber-500/50 hover:shadow-amber-600/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-6 h-6" />
                                            Đăng nhập
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Info Badge */}
                            <div className="mt-8 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl">
                                <p className="text-xs text-amber-100 font-bold text-center leading-relaxed">
                                    🔐 Khu vực dành cho Quản trị viên
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-sm text-slate-400 mt-6 font-medium">
                            © 2026 MailFlow Pro • Powered by AI
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { 
                        transform: translateY(0) translateX(0); 
                        opacity: 0;
                    }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    50% { 
                        transform: translateY(-100vh) translateX(50px); 
                    }
                }
                .animate-float {
                    animation: float linear infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.15; transform: scale(1); }
                    50% { opacity: 0.25; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s ease-in-out infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
};

export default Login;
