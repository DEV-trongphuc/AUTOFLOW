import React, { useEffect } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Bot, Zap, Mail, MessageSquare, BarChart3,
    ArrowRight, Workflow, Users, ShieldCheck,
    Cpu, Activity, Layers, Sparkles
} from 'lucide-react';

const FadeInWhenVisible = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
    const controls = useAnimation();
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (inView) {
            controls.start("visible");
        }
    }, [controls, inView]);

    return (
        <motion.div
            ref={ref}
            animate={controls}
            initial="hidden"
            transition={{ duration: 0.6, delay: delay, ease: [0.22, 1, 0.36, 1] }}
            variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 40 }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

const FeatureCard = ({ icon: Icon, title, description, delay = 0, color = "amber" }: { icon: any, title: string, description: string, delay?: number, color?: "amber" | "blue" | "violet" | "emerald" | "rose" }) => {
    const colorClasses = {
        amber: "from-amber-500/10 to-orange-500/5 hover:border-amber-400/50 text-amber-500 group-hover:shadow-[0_8px_30px_rgb(245,158,11,0.15)] bg-amber-50 text-amber-600",
        blue: "from-blue-500/10 to-indigo-500/5 hover:border-blue-400/50 text-blue-500 group-hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] bg-blue-50 text-blue-600",
        violet: "from-violet-500/10 to-purple-500/5 hover:border-violet-400/50 text-violet-500 group-hover:shadow-[0_8px_30px_rgb(139,92,246,0.15)] bg-violet-50 text-violet-600",
        emerald: "from-emerald-500/10 to-green-500/5 hover:border-emerald-400/50 text-emerald-500 group-hover:shadow-[0_8px_30px_rgb(16,185,129,0.15)] bg-emerald-50 text-emerald-600",
        rose: "from-rose-500/10 to-pink-500/5 hover:border-rose-400/50 text-rose-500 group-hover:shadow-[0_8px_30px_rgb(244,63,94,0.15)] bg-rose-50 text-rose-600",
    };

    return (
        <FadeInWhenVisible delay={delay}>
            <div className={`group relative p-[1px] rounded-2xl overflow-hidden transition-all duration-300 bg-white border border-slate-100 shadow-sm hover:shadow-md`}>
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`} />

                <div className={`relative h-full bg-white rounded-2xl p-8 transition-all duration-300 transform group-hover:-translate-y-1`}>
                    <div className={`w-14 h-14 rounded-xl mb-6 flex items-center justify-center ${colorClasses[color].split(' ')[4]} border border-slate-100/50`}>
                        <Icon className={`w-7 h-7 ${colorClasses[color].split(' ')[5]}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">
                        {description}
                    </p>
                </div>
            </div>
        </FadeInWhenVisible>
    );
};

const Landing: React.FC = () => {
    const navigate = useNavigate();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-amber-500/20 overflow-x-hidden font-sans">
            {/* Background Effects (Subtle for Light Mode) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/5 blur-[120px]" />
                <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[150px]" />

                {/* Light Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.4]" style={{
                    backgroundImage: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Workflow className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-slate-800">
                            DOM<span className="text-amber-500"> MARKETING</span>
                        </span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
                        <a href="#features" className="hover:text-amber-600 transition-colors duration-200">Giải Pháp</a>
                        <a href="#orchestration" className="hover:text-amber-600 transition-colors duration-200">Flow Builder</a>
                        <a href="#ai" className="hover:text-amber-600 transition-colors duration-200">AI System</a>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden md:flex text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors"
                        >
                            Đăng Nhập
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                        >
                            Dùng Thử Ngay
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 z-10 w-full flex flex-col items-center justify-center min-h-[90vh]">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold mb-8 shadow-sm"
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Ready to Scale, DOM Marketing! 🚀</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 text-slate-900"
                    >
                        Hệ Sinh Thái Tự Động Hoá <br className="hidden md:inline" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                            Đa Điểm Chạm Toàn Diện
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
                    >
                        Thiết lập kịch bản chăm sóc khách hàng tự động dựa trên hành vi đa kênh: Email, Zalo OAs, Meta Messenger. Gia tăng tỷ lệ chuyển đổi với nền tảng thân thiện, dễ sử dụng.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
                    >
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden"
                        >
                            <span className="relative z-10">Kết Nối Cấu Hình</span>
                            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
                        </button>
                        <button
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl text-base font-bold border border-slate-200 shadow-sm hover:shadow transition-all duration-300"
                        >
                            <span>Tổng Quan Hệ Thống</span>
                        </button>
                    </motion.div>
                </div>

                {/* Dashboard Preview Visual */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-6xl mx-auto mt-24 relative"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 rounded-3xl blur opacity-20 animate-pulse" />
                    <div className="relative rounded-[24px] bg-[#fdfdfd] border border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex h-[650px]">
                        
                        {/* Sidebar Mockup */}
                        <div className="w-64 bg-white border-r border-[#f1f5f9] hidden md:flex flex-col py-6 overflow-y-auto custom-scrollbar">
                            <div className="px-6 mb-8 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center p-[2px] shadow-sm mb-3">
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                        <Bot className="w-6 h-6 text-orange-500" />
                                    </div>
                                </div>
                                <span className="font-extrabold text-slate-800 text-[15px] tracking-tight">
                                    DOM<span className="text-amber-500"> MARKETING</span>
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 tracking-widest mt-1">/ DIGITAL AI VISION</span>
                            </div>

                            <div className="flex-1 px-3 space-y-7">
                                {/* Category 1 */}
                                <div>
                                    <h5 className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-2">MARKETING</h5>
                                    <div className="space-y-1">
                                        <div className="bg-[#fff9ed] border-l-[3px] border-amber-500 text-amber-700 px-4 py-2.5 rounded-r-xl font-bold text-sm flex items-center cursor-pointer">
                                            <LayoutDashboard className="w-[18px] h-[18px] mr-3" />
                                            <span>Trang chủ</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <Mail className="w-[18px] h-[18px] mr-3" />
                                            <span>Chiến dịch</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-between cursor-pointer transition-colors">
                                            <div className="flex items-center">
                                                <Zap className="w-[18px] h-[18px] mr-3" />
                                                <span>Automation</span>
                                            </div>
                                            <span className="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">HOT</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <Users className="w-[18px] h-[18px] mr-3" />
                                            <span>Khách hàng</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <Layers className="w-[18px] h-[18px] mr-3" />
                                            <span>Quản lý Nhân...</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Category 2 */}
                                <div>
                                    <h5 className="px-4 text-[10px] font-bold text-slate-400 tracking-widest mb-2">AI SYSTEM</h5>
                                    <div className="space-y-1">
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <Cpu className="w-[18px] h-[18px] mr-3" />
                                            <span>AI System</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <MessageSquare className="w-[18px] h-[18px] mr-3" />
                                            <span>Zalo OA</span>
                                        </div>
                                        <div className="text-[#64748b] hover:text-slate-800 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center cursor-pointer transition-colors">
                                            <Activity className="w-[18px] h-[18px] mr-3" />
                                            <span>Meta Messenger</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Mockup */}
                        <div className="flex-1 bg-[#f8fafc] overflow-y-auto">
                            {/* Top Header Mockup */}
                            <div className="h-16 px-8 flex items-center justify-between border-b border-transparent">
                                <div className="flex space-x-2">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">⌘</div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">★ PRO MAX</div>
                                    <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                                </div>
                            </div>

                            <div className="px-8 pb-10">
                                {/* Banner Mockup */}
                                <div className="w-full rounded-[24px] bg-gradient-to-r from-[#b45309] to-[#78350f] relative overflow-hidden mb-10 shadow-lg mt-2">
                                    {/* Decorative swooshes */}
                                    <div className="absolute right-0 top-0 h-full w-[400px] opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgwem0xMCAxMGgxMHYxMEgxMHoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />
                                    <div className="absolute right-[5%] top-[20%] text-white/10 opacity-30 text-8xl">★</div>
                                    <div className="absolute -right-[10%] -top-[10%] w-[300px] h-[300px] rounded-full border border-white/10 border-dashed" />
                                    
                                    <div className="absolute top-6 right-6">
                                        <div className="flex items-center space-x-2 bg-black/20 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-bold text-white border border-white/10">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                            <span>MULTI-CHANNEL ACTIVE</span>
                                        </div>
                                    </div>

                                    <div className="relative p-10 z-10">
                                        <h2 className="text-4xl font-extrabold text-white mb-3">Ready to Scale, DOM MARKETING! <span className="inline-block animate-bounce">🚀</span></h2>
                                        <p className="text-orange-100/90 text-[15px] font-medium max-w-2xl mb-8 leading-relaxed">Hệ thống Automation đa thông điệp đã sẵn sàng. Tối ưu hóa trải nghiệm Khách hàng với sức mạnh từ <span className="text-white font-bold underline underline-offset-4 decoration-amber-400">Email, Zalo, Meta & AI Automation.</span></p>
                                        
                                        <div className="flex items-center space-x-4">
                                            <button className="bg-white text-slate-800 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg hover:scale-105 transition-transform">
                                                <Zap className="w-4 h-4 mr-2 text-amber-500" /> Kết Nối Cấu Hình
                                            </button>
                                            <button className="bg-[#eab308] text-[#713f12] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg hover:scale-105 transition-transform hover:bg-[#facc15]">
                                                <Activity className="w-4 h-4 mr-2" /> Cấu Hình Leadscore
                                            </button>
                                            <button className="bg-[#eab308] text-[#713f12] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg hover:scale-105 transition-transform hover:bg-[#facc15]">
                                                <BarChart3 className="w-4 h-4 mr-2" /> Tổng Quan Hệ Thống
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Access Row */}
                                <div className="mb-8">
                                    <div className="flex items-center text-xs font-bold text-slate-400 tracking-widest mb-4">
                                        <Activity className="w-4 h-4 mr-2" /> TRUY CẬP GẦN ĐÂY
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* Card 1 */}
                                        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center space-x-4 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                                            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#ea580c] flex items-center justify-center shrink-0 shadow-sm">
                                                <Mail className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-800 text-[15px] mb-0.5">Campaigns</h4>
                                                <p className="text-[12px] text-slate-400 font-medium truncate w-[160px]">Gửi kịch bản hàng loạt đa kênh...</p>
                                            </div>
                                        </div>
                                        
                                        {/* Card 2 */}
                                        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center space-x-4 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                                            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#c026d3] to-[#9333ea] flex items-center justify-center shrink-0 shadow-sm">
                                                <Layers className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-800 text-[15px] mb-0.5">Email Design</h4>
                                                <p className="text-[12px] text-slate-400 font-medium truncate w-[160px]">Thư viện mẫu thiết kế chuyên...</p>
                                            </div>
                                        </div>

                                        {/* Card 3 */}
                                        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center space-x-4 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                                            <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] flex items-center justify-center shrink-0 shadow-sm">
                                                <Zap className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-800 text-[15px] mb-0.5">Automation</h4>
                                                <p className="text-[12px] text-slate-400 font-medium truncate w-[160px]">Thiết lập kịch bản dựa trên...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* All Features Row */}
                                <div>
                                    <div className="flex items-center text-xs font-bold text-slate-400 tracking-widest mb-4">
                                        <Layers className="w-4 h-4 mr-2" /> TẤT CẢ TÍNH NĂNG
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* Big Card 1 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Mail className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#f59e0b] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-amber-500/30">
                                                <Mail className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">Campaigns</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Gửi kịch bản hàng loạt đa kênh Mail & Zalo ZNS. Tối ưu tỷ lệ mở với bộ lọc đối tượng thông minh.</p>
                                        </div>

                                        {/* Big Card 2 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Zap className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#4f46e5] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-indigo-500/30">
                                                <Zap className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">Automation</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Thiết lập kịch bản dựa trên hành vi và sự kiện thực tế. Tự động hóa 100% quy trình CSKH đa kênh.</p>
                                        </div>

                                        {/* Big Card 3 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Layers className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#c026d3] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-purple-500/30">
                                                <Layers className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">Email Design</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Thư viện mẫu thiết kế chuyên nghiệp, kéo thả linh hoạt. Hỗ trợ đầy đủ các khối nội dung cơ bản.</p>
                                        </div>

                                        {/* Big Card 4 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Users className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#10b981] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-emerald-500/30">
                                                <Users className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">Quản lý Khách hàng</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Cơ sở dữ liệu tập trung (CRM). Theo dõi chi tiết mọi tương tác, thẻ Tag, và lịch sử giao dịch.</p>
                                        </div>

                                        {/* Big Card 5 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Bot className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#e11d48] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-rose-500/30">
                                                <Bot className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">AI Trợ lý ảo</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Train tự động từ website/tài liệu. Trả lời ngay lập tức, tự động ngắt bot khi có NV tư vấn.</p>
                                        </div>

                                        {/* Big Card 6 */}
                                        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all relative overflow-hidden group">
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <MessageSquare className="w-32 h-32 text-slate-800" />
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-[#0284c7] flex items-center justify-center shrink-0 mb-5 shadow-lg shadow-sky-500/30">
                                                <MessageSquare className="w-7 h-7 text-white" />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-lg mb-2">Zalo & Meta API</h4>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Gửi ZNS, nhắn tin hàng loạt qua Zalo OA, Facebook đính kèm file, ảnh, template động.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 relative z-10 bg-slate-50/50">
                <div className="max-w-7xl mx-auto">
                    <FadeInWhenVisible className="text-center mb-16">
                        <h2 className="text-sm font-bold text-amber-500 tracking-wider uppercase mb-3">Tất Cả Tính Năng</h2>
                        <h3 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Mọi Điểm Chạm Khách Hàng, <br className="hidden md:inline" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Một Luồng Chảy Hợp Nhất</span></h3>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                            Dễ dàng kết nối và tự động hóa toàn bộ phễu marketing.
                        </p>
                    </FadeInWhenVisible>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard
                            icon={Mail}
                            title="SES Email Scale"
                            description="Tích hợp Amazon SES gửi vạn email cực nhanh. Hệ thống thiết kế kéo thả linh hoạt."
                            color="amber"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={MessageSquare}
                            title="Zalo & Meta API"
                            description="Gửi tin ZNS tỷ lệ hiển thị 100%. Luồng kịch bản Chatbot kết nối đồng bộ theo thời gian thực."
                            color="blue"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={Bot}
                            title="AI System"
                            description="Trợ lý ảo phân tích ngôn ngữ tự nhiên. Tự train bot cá nhân hoá nghiệp vụ bán hàng."
                            color="violet"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={Activity}
                            title="Website Tracking"
                            description="Kiểm soát tỷ lệ mở, click chi tiết. Cấu hình Lead Score chấm điểm khách hàng tự động."
                            color="emerald"
                            delay={0.4}
                        />
                    </div>
                </div>
            </section>

            {/* Orchestration (Flow Builder) */}
            <section id="orchestration" className="py-24 px-6 relative z-10 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="w-full lg:w-1/2">
                        <FadeInWhenVisible>
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Automation Flow</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                                Thiết lập kịch bản <br />
                                <span className="text-blue-500">Tự động hoá quy trình</span>
                            </h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                Dễ dàng kéo thả (Drag n Drop) để thiết kế luồng chăm sóc khách hàng đa kênh phức tạp chỉ trong vài phút. Thiết lập các khối Hành động, Điều kiện mạch lạc.
                            </p>
                            <ul className="space-y-4">
                                {['Trigger điều kiện khởi chạy (Mở mail, Click link...)', 'Kết hợp Email, Zalo OAs, Messenger', 'Cập nhật điểm Lead Score'].map((item, i) => (
                                    <li key={i} className="flex items-center space-x-3 text-slate-700 font-medium">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        </div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </FadeInWhenVisible>
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                        <FadeInWhenVisible delay={0.2}>
                            <div className="relative rounded-2xl bg-slate-50 border border-slate-200 p-2 shadow-xl skew-y-2 transform-gpu hover:skew-y-0 transition-transform duration-700">
                                {/* Flow Simulation Light Mode */}
                                <div className="bg-white w-full rounded-xl p-8 border border-slate-100 flex flex-col items-center min-h-[400px]">
                                    <div className="bg-white border-2 border-indigo-200 rounded-xl px-6 py-4 shadow-sm flex items-center gap-3 w-64 justify-center">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <Zap className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div className="font-bold text-slate-800">Email Được Mở</div>
                                    </div>
                                    
                                    <div className="w-0.5 h-10 bg-slate-200" />
                                    
                                    <div className="bg-white border-2 border-slate-200 rounded-xl px-6 py-4 shadow-sm flex items-center gap-3 w-64 justify-center relative">
                                        <div className="p-2 bg-slate-100 rounded-lg">
                                            <div className="w-5 h-5 text-slate-500 flex items-center justify-center text-xs font-bold">⏱️</div>
                                        </div>
                                        <div className="font-bold text-slate-800">Đợi 3 Ngày</div>
                                    </div>

                                    <div className="w-0.5 h-10 bg-slate-200" />
                                    
                                    <div className="flex w-full max-w-sm relative">
                                        <div className="border-t-2 border-slate-200 w-full absolute top-0" />
                                        <div className="w-1/2 flex flex-col items-center relative pt-8">
                                            <div className="absolute top-0 w-0.5 h-8 bg-slate-200" />
                                            <div className="bg-white border-2 border-amber-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 relative z-10 w-full justify-center hover:border-amber-400 cursor-pointer">
                                                <div className="p-1.5 bg-amber-50 rounded-lg">
                                                    <Mail className="w-4 h-4 text-amber-500" />
                                                </div>
                                                <div className="text-sm font-bold text-slate-800">Upsell Email</div>
                                            </div>
                                        </div>
                                        <div className="w-1/2 flex flex-col items-center relative pt-8">
                                            <div className="absolute top-0 w-0.5 h-8 bg-slate-200" />
                                            <div className="bg-white border-2 border-blue-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 relative z-10 w-full justify-center hover:border-blue-400 cursor-pointer">
                                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="text-sm font-bold text-slate-800">Gửi ZNS</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeInWhenVisible>
                    </div>
                </div>
            </section>

             {/* AI & Tracking Section */}
             <section id="ai" className="py-24 px-6 relative z-10 bg-slate-50">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
                    <div className="w-full lg:w-1/2 pl-0 lg:pl-12">
                        <FadeInWhenVisible>
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-xs font-bold uppercase tracking-wider mb-6">
                                <Cpu className="w-3.5 h-3.5" />
                                <span>AI Automation</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                                Hệ Thống Đào Tạo <br />
                                <span className="text-purple-500">Khách Hàng Mục Tiêu Đỉnh Cao</span>
                            </h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                Trao quyền cho Trợ lý ảo AI khả năng tự trả lời như một người tư vấn tận tâm. Kết nối với tính năng Lead Score linh hoạt chấm điểm tiềm năng.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 mb-1">Upload Tài Liệu</h4>
                                    <p className="text-sm text-slate-500 text-balance">Hỗ trợ training qua Website URL, file PDF và Text.</p>
                                </div>
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-slate-800 mb-1">Human Can Thiệp</h4>
                                    <p className="text-sm text-slate-500 text-balance">Dừng AI khi nhân sự trực tiếp phản hồi Khách.</p>
                                </div>
                            </div>
                        </FadeInWhenVisible>
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                        <FadeInWhenVisible delay={0.2}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4 pt-12">
                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg">
                                        <div className="w-12 h-12 rounded-xl bg-purple-50 mb-4 flex items-center justify-center border border-purple-100">
                                            <Bot className="text-purple-600 w-6 h-6" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-800 mb-1">24/7</h4>
                                        <p className="text-sm text-slate-500 font-medium">Tương Tác Phản Hồi</p>
                                    </div>
                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 mb-4 flex items-center justify-center border border-orange-100">
                                            <BarChart3 className="text-orange-600 w-6 h-6" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-800 mb-1">Chỉ Số Thực</h4>
                                        <p className="text-sm text-slate-500 font-medium">Cập nhật realtime.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 shadow-xl shadow-orange-500/20 text-white">
                                        <h4 className="text-xl font-bold mb-4">Cấu Hình Leadscore</h4>
                                        <div className="space-y-3">
                                            <div className="w-full flex items-center justify-between text-sm">
                                                <span className="font-medium text-orange-50">Mở Email</span>
                                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">+5 ĐIỂM</span>
                                            </div>
                                            <div className="w-full h-px bg-white/20" />
                                            <div className="w-full flex items-center justify-between text-sm">
                                                <span className="font-medium text-orange-50">Click Link Zalo</span>
                                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">+10 ĐIỂM</span>
                                            </div>
                                            <div className="w-full h-px bg-white/20" />
                                            <div className="w-full flex items-center justify-between text-sm">
                                                <span className="font-medium text-orange-50">Nhắn tin Box</span>
                                                <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">+5 ĐIỂM</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FadeInWhenVisible>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 px-6 relative z-10">
                <div className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-600 p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -m-16 w-64 h-64 bg-white/10 rounded-full blur-3xl mix-blend-overlay" />
                    <div className="absolute bottom-0 left-0 -m-16 w-64 h-64 bg-orange-400/30 rounded-full blur-3xl mix-blend-overlay" />
                    
                    <FadeInWhenVisible className="relative z-10">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Sẵn Sàng Mở Rộng Cùng Hệ Thống?</h2>
                        <p className="text-orange-50 text-lg mb-10 max-w-2xl mx-auto font-medium">
                            Hãy để DOM Marketing xây dựng trải nghiệm Khách Hàng chuyên nghiệp nhất cho Doanh Nghiệp của bạn. Đăng ký & kết nối ngay hôm nay.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto bg-white text-orange-600 px-10 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                Truy Cập Ngay
                            </button>
                            <button
                                className="w-full sm:w-auto px-10 py-4 rounded-xl text-lg font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                            >
                                Xem Hướng Dẫn
                            </button>
                        </div>
                    </FadeInWhenVisible>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white py-12 px-6 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-2 opacity-80">
                        <Workflow className="w-6 h-6 text-amber-500" />
                        <span className="text-xl font-extrabold text-slate-800">
                            DOM<span className="text-amber-500"> MARKETING</span>
                        </span>
                    </div>
                    <div className="text-slate-500 text-sm font-medium">
                        &copy; {new Date().getFullYear()} IDEAS Institute. B2B Automation Built to Scale.
                    </div>
                    <div className="flex space-x-6 text-sm font-medium text-slate-500">
                        <a href="#" className="hover:text-amber-600 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-amber-600 transition-colors">Terms</a>
                        <a href="#" className="hover:text-amber-600 transition-colors">Docs</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// LayoutDashboard Icon for sidebar mockup
const LayoutDashboard = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
)

export default Landing;
