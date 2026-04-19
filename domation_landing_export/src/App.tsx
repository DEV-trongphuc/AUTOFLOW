import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import {
    Bot, Zap, Mail, MessageSquare, BarChart3,
    ArrowRight, Workflow, Users, ShieldCheck,
    Cpu, Activity, Layers, Sparkles, Check,
    TrendingUp, Globe, Clock, Star, ChevronDown,
    Play, MousePointer, Bell, Target, Database,
    Lock, Rocket, MousePointerClick, Pointer, ScanLine, LayoutTemplate, BoxSelect, Settings2
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────
const LOGOS = {
    zalo: 'https://automation.ideas.edu.vn/imgs/zalolog.png',
    meta: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
    aws_ses: 'https://www.eetasia.com/wp-content/uploads/sites/2/2021/03/amazon-AWS_1200.jpg?w=600'
};

// ─── Helpers ───────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, className = '', from = 'bottom' }: {
    children: React.ReactNode; delay?: number; className?: string; from?: 'bottom' | 'left' | 'right';
}) => {
    const controls = useAnimation();
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const initial = from === 'left' ? { opacity: 0, x: -50 } : from === 'right' ? { opacity: 0, x: 50 } : { opacity: 0, y: 40 };
    const animate = from === 'left' || from === 'right' ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 };

    useEffect(() => { if (inView) controls.start(animate); }, [controls, inView]);

    return (
        <motion.div ref={ref} animate={controls} initial={initial}
            transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
            {children}
        </motion.div>
    );
};

// Animated counter
const Counter = ({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = Math.ceil(to / 60);
        const timer = setInterval(() => {
            start += step;
            if (start >= to) { setCount(to); clearInterval(timer); }
            else setCount(start);
        }, 16);
        return () => clearInterval(timer);
    }, [inView, to]);
    return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Feature card component
const FeatureCard = ({ icon: Icon, imageIcon, title, description, delay = 0, gradient }: {
    icon?: any; imageIcon?: string; title: string; description: string; delay?: number; gradient: string;
}) => (
    <FadeIn delay={delay}>
        <div className="holo-card group relative p-px rounded-2xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-500 border border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(300px at 50% 50%, ${gradient}15, transparent 70%)` }} />
            <div className="relative p-8 flex flex-col h-full">
                <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center overflow-hidden`}
                    style={{ background: `linear-gradient(135deg, ${gradient}30, ${gradient}10)`, border: `1px solid ${gradient}30` }}>
                    {imageIcon ? (
                        <img src={imageIcon} alt={title} className="w-8 h-8 object-contain drop-shadow-md" />
                    ) : Icon ? (
                        <Icon className="w-7 h-7" style={{ color: gradient }} />
                    ) : null}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    </FadeIn>
);

// Pricing card
const PricingCard = ({ tier, price, desc, features, highlight = false, delay = 0, onClick }: {
    tier: string; price: string; desc: string; features: string[]; highlight?: boolean; delay?: number; onClick?: () => void;
}) => (
    <FadeIn delay={delay} className="h-full">
        <div className={`relative rounded-[24px] p-px h-full mt-4 transition-all duration-500 ${
            highlight
                ? 'pricing-highlight-glow hover:-translate-y-3 hover:scale-[1.02]'
                : 'bg-white/10 hover:-translate-y-1'
        }`} style={highlight ? {
            background: 'linear-gradient(135deg, #f59e0b, #f97316, #ef4444, #a855f7, #f59e0b)',
            backgroundSize: '300% 300%',
            animation: 'border-flow 4s linear infinite'
        } : {}}>
            {highlight && (
                <>
                    {/* Floating star particles */}
                    {['top-2 right-8', 'top-8 left-4', 'bottom-16 right-4'].map((pos, i) => (
                        <div key={i} className={`absolute ${pos} text-amber-400 text-xs pointer-events-none`}
                            style={{animation: `star-float ${2+i*0.7}s ease-in-out infinite`, animationDelay: `${i*0.5}s`}}>✦</div>
                    ))}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[11px] uppercase font-black px-4 py-1.5 rounded-full z-20 shadow-[0_4px_20px_rgba(245,158,11,0.6)]">
                        Phổ Biến Nhất
                    </div>
                </>
            )}
            <div className={`relative rounded-[23px] p-8 h-full flex flex-col overflow-hidden ${
                highlight ? 'bg-gradient-to-b from-[#1a1020] to-[#110d1a]' : 'bg-[#161b22]'
            }`}>
                {highlight && (
                    <div className="absolute top-0 left-0 right-0 h-px" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)'
                    }} />
                )}
                <div className="mb-6">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{tier}</p>
                    <div className="flex items-end gap-1">
                        <span className={`text-4xl font-black ${highlight ? 'shimmer-text' : 'text-white'}`}>{price}</span>
                        {price !== 'Liên hệ' && <span className="text-slate-400 text-sm mb-1">/tháng</span>}
                    </div>
                    <p className="text-slate-500 text-sm mt-2">{desc}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                    {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                highlight ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-white/10 border border-white/20'
                            }`}>
                                <Check className={`w-3 h-3 ${highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                            </div>
                            {f}
                        </li>
                    ))}
                </ul>
                <button onClick={onClick} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                    highlight
                        ? 'glow-btn bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:-translate-y-0.5'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}>
                    {price === 'Liên hệ' ? 'Liên hệ tư vấn' : 'Bắt đầu ngay'}
                </button>
            </div>
        </div>
    </FadeIn>
);

// ─── Main Component ─────────────────────────────────────────────
const Landing: React.FC = () => {
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
    const [emailVolume, setEmailVolume] = useState('500k Emails');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [flowSlide, setFlowSlide] = useState(0);
    const [chatSlide, setChatSlide] = useState(0);
    const [segSlide, setSegSlide] = useState(0);
    const [campSlide, setCampSlide] = useState(0);

    useEffect(() => {
        window.scrollTo(0, 0);
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonials.length), 5000);
        return () => clearInterval(t);
    }, []);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('submitting');
        // Simulate network request
        setTimeout(() => {
            setFormStatus('success');
        }, 1500);
    };

    const features = [
        { imageIcon: LOGOS.aws_ses, title: 'Email Marketing Scale', description: 'Gửi hàng triệu email trực tiếp qua hạ tầng Amazon SES. Cấu hình DNS thông minh đảm bảo tỉ lệ vào Inbox > 95%.', gradient: '#f59e0b' },
        { imageIcon: LOGOS.zalo, title: 'Zalo ZNS & OA Official', description: 'Gửi tin Zalo an toàn 100% tỷ lệ đọc. Hỗ trợ đầy đủ tương tác, tin nhắn CTA, hình ảnh, API Zalo Official Account.', gradient: '#3b82f6' },
        { imageIcon: LOGOS.meta, title: 'Meta Messenger API', description: 'Tích hợp mượt mà với Facebook Page. Gửi tin nhắn Carousel cấu trúc chuẩn, chat tự động và quy tắc phân nhánh sâu.', gradient: '#6366f1' },
        { icon: Bot, title: 'Trợ Lý AI (LLM)', description: 'Knowledge Base thông minh từ tài liệu của bạn. Trợ lý ảo AI túc trực 24/7 đón đầu intent Khách hàng đa nền tảng.', gradient: '#a855f7' },
        { icon: Zap, title: 'Visual Flow Builder', description: 'Thiết kế hành trình bằng giao diện kéo thả trực quan: Chờ, Phân Nhánh (Đã Đọc, Chưa Đọc, Click Link).', gradient: '#22c55e' },
        { icon: Target, title: 'Lead Score Thông Minh', description: 'Tự động chấm điểm (Lead Score) theo mỗi click, scroll trên website để filter khách hàng nóng nhất.', gradient: '#ef4444' },
        { icon: LayoutTemplate, title: 'Drag & Drop Builder', description: 'Email Builder kéo thả siêu mượt như Figma. Hàng trăm block layout có sẵn cho ra những mẫu Email tuyệt đẹp.', gradient: '#ec4899' },
        { icon: ScanLine, title: 'Website Tracking Cực Sâu', description: 'Gắn pixel theo dõi mọi sự kiện User: Web Click, Scroll trang, hành động chạm tương tác với các component.', gradient: '#14b8a6' },
    ];

    const stats = [
        { value: 98, suffix: '%', label: 'Tỉ lệ inbox Email' },
        { value: 100, suffix: '%', label: 'Hiển thị ZNS Zalo' },
        { value: 50, suffix: 'M+', label: 'Hành động Tracking/Tháng' },
        { value: 24, suffix: '/7', label: 'AI Support hoạt động' },
    ];

    const testimonials = [
        { name: 'Nguyễn Minh Khoa', role: 'CEO, TechViet Solutions', text: 'Hệ thống automation giúp chúng tôi tiết kiệm 80% thời gian chăm sóc khách hàng. Lead Score cực kỳ chính xác, team sales tập trung đúng người cần.', avatar: 'MK' },
        { name: 'Trần Thị Lan Anh', role: 'Marketing Director, EduPro', text: 'Tỉ lệ open email tăng từ 18% lên 41% sau 2 tháng dùng. Flow builder rất trực quan, Email Kéo Thả tạo template chỉ trong 5 phút.', avatar: 'LA' },
        { name: 'Lê Văn Hùng', role: 'Founder, RetailMax', text: 'Gửi ZNS Zalo cho 50,000 KH chỉ mất 15 phút, kết hợp Tracking Website chạm Click quá đỉnh. AI chatbot xử lý 70% FAQ.', avatar: 'VH' },
    ];

    const plans = [
        {
            tier: 'Starter', price: '490.000₫', desc: 'Dành cho Startup & Shop nhỏ',
            features: ['Khối lượng 100.000 Email/tháng', 'AI Phân tích', 'Flow Automation 5 Kịch bản', 'Gắn Web Tracking Tiêu Chuẩn', 'AI trực Zalo ZNS & Messenger'],
        },
        {
            tier: 'Growth', price: '1.890.000₫', desc: 'Bứt phá doanh thu cho Doanh Nghiệp',
            features: ['Khối lượng 500.000 Email/tháng', 'AI Chatbot Tự Động Ticket 24/7', 'AI Lead Score Phân Loại Thông Minh', 'Trình Tạo Flow Trực Quan', 'Bản Đồ Tracking Heatmap Website', '100+ Template Kéo Thả Cao Cấp'],
            highlight: true,
        },
        {
            tier: 'Enterprise', price: 'Liên hệ', desc: 'Tập đoàn & Agency Marketing',
            features: ['Trên 1.000.000 Email/tháng', 'Self-hosted AI Language Model', 'Dedicated AWS Infrastructure', 'Tích Hợp API Sâu & Webhook 2 Chiều', 'SLA 99.9% + Support Kỹ Thuật VIP'],
        },
    ];

    return (
        <div className="min-h-screen bg-[#080c14] text-white overflow-x-hidden font-sans selection:bg-amber-500/30" style={{ scrollbarWidth: 'thin', scrollbarColor: '#f59e0b transparent' }}>
            <style>{`
                html, body { scrollbar-width: thin; scrollbar-color: #f59e0b #080c14; overflow-y: scroll; background-color: #080c14; scroll-behavior: smooth; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #080c14; }
                ::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #fbbf24, #f97316, #ea580c); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #fde68a, #fb923c, #f97316); }

                @keyframes aurora-1 {
                    0%,100% { transform: translate(0%,0%) scale(1); opacity:0.12; }
                    33% { transform: translate(8%,-12%) scale(1.15); opacity:0.18; }
                    66% { transform: translate(-5%,8%) scale(0.9); opacity:0.1; }
                }
                @keyframes aurora-2 {
                    0%,100% { transform: translate(0%,0%) scale(1); opacity:0.1; }
                    40% { transform: translate(-10%,10%) scale(1.2); opacity:0.16; }
                    70% { transform: translate(6%,-6%) scale(0.85); opacity:0.08; }
                }
                @keyframes aurora-3 {
                    0%,100% { transform: translate(0%,0%) scale(1); }
                    50% { transform: translate(12%,8%) scale(1.1); }
                }
                @keyframes shimmer-sweep {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes glow-pulse {
                    0%,100% { box-shadow: 0 0 20px 4px rgba(245,158,11,0.35), 0 0 60px 10px rgba(234,88,12,0.15); }
                    50% { box-shadow: 0 0 35px 8px rgba(245,158,11,0.6), 0 0 80px 20px rgba(234,88,12,0.25); }
                }
                @keyframes holo-spin {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes float-y {
                    0%,100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes live-dot {
                    0%,100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.7); }
                }
                @keyframes neon-glow {
                    0%,100% { text-shadow: 0 0 8px rgba(245,158,11,0.6), 0 0 20px rgba(245,158,11,0.3); }
                    50% { text-shadow: 0 0 16px rgba(245,158,11,0.9), 0 0 40px rgba(234,88,12,0.5); }
                }
                @keyframes border-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes star-float {
                    0%,100% { transform: translateY(0) rotate(0deg); opacity:0.8; }
                    50% { transform: translateY(-8px) rotate(180deg); opacity:1; }
                }
                .shimmer-text {
                    background: linear-gradient(90deg, #f59e0b 0%, #fb923c 20%, #fde68a 40%, #f97316 60%, #ef4444 80%, #f59e0b 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer-sweep 4s linear infinite;
                }
                .glow-btn { animation: glow-pulse 2s ease-in-out infinite; }
                .aurora-1 { animation: aurora-1 18s ease-in-out infinite; }
                .aurora-2 { animation: aurora-2 24s ease-in-out infinite; }
                .aurora-3 { animation: aurora-3 30s ease-in-out infinite; }
                .float-y { animation: float-y 6s ease-in-out infinite; }
                .live-dot { animation: live-dot 1.4s ease-in-out infinite; }
                .holo-card {
                    position: relative;
                }
                .holo-card::before {
                    content: '';
                    position: absolute;
                    inset: -1px;
                    border-radius: inherit;
                    background: linear-gradient(90deg, #fbbf24, #f97316, #ea580c, #fbbf24);
                    background-size: 300% 300%;
                    animation: border-flow 4s linear infinite;
                    z-index: -1;
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .holo-card:hover::before { opacity: 1; }
                .holo-card:hover .text-4xl {
                    background: none !important;
                    -webkit-text-fill-color: white !important;
                    text-shadow: 0 0 12px rgba(255,255,255,0.4);
                }
                .holo-card:hover p {
                    color: white !important;
                }
                .pricing-highlight-glow { animation: glow-pulse 3s ease-in-out infinite; }
            `}</style>

            {/* ── Background: Animated Aurora ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="aurora-1 absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full bg-amber-500/[0.12] blur-[160px]" />
                <div className="aurora-2 absolute top-[5%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/[0.1] blur-[160px]" />
                <div className="aurora-3 absolute bottom-[-5%] left-[15%] w-[50%] h-[50%] rounded-full bg-rose-500/[0.08] blur-[140px]" />
                <div className="aurora-1 absolute top-[40%] right-[10%] w-[35%] h-[35%] rounded-full bg-purple-600/[0.07] blur-[120px]" style={{animationDelay:'-8s'}} />
                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.035]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />
                {/* Noise */}
                <div className="absolute inset-0 opacity-[0.025]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`
                }} />
            </div>

            {/* ── Navigation ── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#080c14]/85 backdrop-blur-3xl shadow-[0_1px_0_0_rgba(245,158,11,0.15),0_8px_32px_rgba(0,0,0,0.6)]' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <img src="/imgs/ICON.png" alt="DOMATION Logo" className="w-10 h-10 object-contain rounded-[14px] shadow-lg shadow-amber-500/30 float-y" />
                            <div className="absolute -inset-1 rounded-[18px] bg-amber-500/20 blur-md -z-10" />
                        </div>
                        <span className="text-xl font-black tracking-tight shimmer-text">
                            DOMATION
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-400">
                        {[['#features', 'Tính Năng'], ['#builder', 'Email Builder'], ['#flow', 'Flow Builder'], ['#ai-segment', 'AI Phân Tích'], ['#campaign-tracking', 'Web Analytics'], ['#pricing', 'Giá']].map(([href, label]) => (
                            <a key={href} href={href} className="group relative hover:text-white transition-colors duration-300">
                                {label}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300 rounded-full" />
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center space-x-3">
                        <button onClick={() => setIsFormOpen(true)}
                            className="hidden md:block text-sm font-semibold text-slate-400 hover:text-amber-400 transition-colors px-4 py-2">
                            Liên Hệ
                        </button>
                        <button onClick={() => setIsFormOpen(true)}
                            className="glow-btn flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-5 py-2.5 rounded-full text-sm font-black hover:-translate-y-0.5 transition-transform duration-300">
                            Dùng Thử Nền Tảng
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative pt-40 pb-20 md:pt-52 md:pb-28 px-4 md:px-6 z-10 min-h-screen flex flex-col items-center justify-center">
                <div className="max-w-5xl mx-auto text-center">
                    {/* Badge Hook */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-sm font-bold mb-10 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-sm">
                        <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-amber-400 tracking-wide uppercase">Ready To Scale 🚀</span>
                    </motion.div>

                    {/* Heading */}
                    <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8 w-full">
                        <span className="block text-white mb-2 md:mb-4" style={{textShadow:'0 0 80px rgba(255,255,255,0.08)'}}>DIGITAL AI</span>
                        <span className="shimmer-text block pb-2">
                            MARKETING AUTOMATION
                        </span>
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Hệ thống Automation đa thông điệp đã sẵn sàng. Trải nghiệm sức mạnh tự động hóa vượt trội từ <strong className="text-slate-200">Email, Zalo, Meta &amp; AI</strong> — Chạm đúng người, đúng thời điểm.
                    </motion.p>

                    {/* CTA */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <button onClick={() => setIsFormOpen(true)}
                            className="glow-btn group relative flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-8 py-4 rounded-2xl text-base font-black hover:-translate-y-1 transition-transform duration-300 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-3">
                                Bắt Đầu Tăng Trưởng
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                        <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-slate-300 border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm">
                            <Play className="w-5 h-5 text-amber-400" />
                            Xem Demo Thực Tế
                        </button>
                    </motion.div>

                    {/* Platform Bar */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}
                        className="flex flex-wrap items-center justify-center gap-4 md:gap-6 p-4 md:p-6 rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest w-full mb-1">Kết nối trực tiếp</div>
                        {[
                            { name: 'Amazon SES', icon: LOGOS.aws_ses },
                            { name: 'Zalo ZNS', icon: LOGOS.zalo },
                            { name: 'Meta Messenger', icon: LOGOS.meta },
                            { name: 'Google Sheets', icon: 'https://mailmeteor.com/logos/assets/PNG/Google_Sheets_Logo_512px.png' },
                            { name: 'MISA CRM', icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlIpztniIEN5ZYvLlwwqBvhzdodvu2NfPSbg&s' }
                        ].map((plat) => (
                            <div key={plat.name} className="flex items-center gap-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                <img src={plat.icon} alt={plat.name} className="h-7 md:h-8 object-contain rounded-md" />
                                <span className="font-bold text-slate-300 hidden sm:block text-sm">{plat.name}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Hero Image — Holographic Frame */}
                <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-6xl mx-auto mt-16 md:mt-20 relative px-4">
                    {/* Amber-orange glow border */}
                    <div className="absolute -inset-[2px] rounded-[30px] opacity-60" style={{
                        background: 'linear-gradient(90deg, #fbbf24, #f97316, #ea580c, #fbbf24)',
                        backgroundSize: '200% 200%',
                        animation: 'border-flow 4s linear infinite',
                        filter: 'blur(3px)'
                    }} />
                    <div className="relative rounded-[28px] border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] overflow-hidden bg-[#161b22] p-2">
                        <img src="/imgs/home.jpg" alt="DOM Marketing Overview" className="w-full h-auto rounded-3xl object-cover" />
                    </div>
                    {/* Floating badges */}
                    <div className="absolute -top-4 right-4 md:right-8 flex items-center gap-2 bg-[#0a0f1a]/90 border border-emerald-500/40 rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                        <span className="live-dot w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold">Live System</span>
                    </div>
                    <div className="absolute -bottom-4 left-4 md:left-8 flex items-center gap-2 bg-[#0a0f1a]/90 border border-amber-500/40 rounded-full px-3 md:px-4 py-1.5 md:py-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-400 text-xs font-bold">98% Inbox Rate</span>
                    </div>
                </motion.div>
            </section>

            {/* ── Stats Bar ── */}
            <section className="py-16 px-6 relative z-10 border-y border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900/5 via-transparent to-amber-900/5 pointer-events-none" />
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {stats.map((s, i) => (
                        <FadeIn key={s.label} delay={i * 0.1}>
                            <div className="holo-card relative text-center p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/30 transition-all duration-500 group overflow-hidden">
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{
                                    background: 'radial-gradient(circle at center, rgba(245,158,11,0.08), transparent 70%)'
                                }} />
                                <div className="text-4xl md:text-5xl font-black mb-2" style={{
                                    background: 'linear-gradient(135deg, #fbbf24, #f97316)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))'
                                }}>
                                    <Counter to={s.value} suffix={s.suffix} />
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-semibold">{s.label}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ── All Features ── */}
            <section id="features" className="py-16 md:py-28 px-4 md:px-6 relative z-10 scroll-mt-20">
                <div className="max-w-7xl mx-auto">
                    <FadeIn className="text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-5 leading-tight">
                            Công Cụ Nền Tảng<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Cho Chiến Lược Đa Kênh</span>
                        </h2>
                        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                            Tất cả mọi thứ bạn cần để thu hút, nuôi dưỡng và chuyển đổi khách hàng hoàn toàn tự động.
                        </p>
                    </FadeIn>

                    <div className="w-full relative border border-white/10 rounded-[24px] md:rounded-[32px] p-1.5 md:p-2 bg-[#161b22] backdrop-blur-sm shadow-[0_0_80px_-20px_rgba(245,158,11,0.3)]">
                        <img src="/imgs/cac_tinh_nang.png" alt="Các tính năng nổi bật" className="w-full h-auto rounded-[18px] md:rounded-[24px] object-cover" />
                    </div>
                </div>
            </section>

            {/* ── Email Drag & Drop Builder ── */}
            <section id="builder" className="py-16 md:py-28 px-4 md:px-6 relative z-10 bg-[#0e121a] scroll-mt-20">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                    {/* Visual */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn from="left">
                            <div className="relative rounded-2xl md:rounded-3xl border border-white/10 bg-[#161b22] p-3 md:p-4 shadow-2xl shadow-rose-500/10">
                                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent rounded-2xl md:rounded-3xl pointer-events-none" />
                                <div className="flex justify-between items-center px-2 pb-3 md:pb-4 border-b border-white/10 mb-3 md:mb-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-rose-500" />
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400" />
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><LayoutTemplate className="w-3.5 h-3.5" /> Studio Design</div>
                                </div>
                                <div className="p-1">
                                    <img src="/imgs/email build.jpg" alt="Email Builder Drag and Drop" className="w-full h-auto rounded-xl md:rounded-2xl shadow-lg object-cover" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Content */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn from="right">
                            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-5">
                                <Pointer className="w-3.5 h-3.5" />
                                Email Builder Studio
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 leading-tight">
                                Thiết Kế Email Kéo Thả <br />
                                <span className="text-rose-400">Siêu Mượt, Siêu Tốc</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Loại bỏ hoàn toàn sự phụ thuộc vào IT. Tạo Email Template tuyệt đẹp bằng trực giác với trình kéo thả (Drag & Drop) thông minh. Nội dung hiển thị hoàn hảo trên cả Mobile & Desktop.
                            </p>
                            <ul className="space-y-4 mb-10">
                                {[
                                    '100+ Khối nội dung có sẵn: Banner, Nút bấm, Bảng giá',
                                    'Responsive Design - Auto tương thích mọi thiết bị',
                                    'Hỗ trợ Code Custom & Dynamic Tags {user.name}',
                                    'Kho biểu tượng và hình nền tích hợp sẵn'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1 w-5 h-5 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-rose-400" />
                                        </div>
                                        <span className="text-slate-300 font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── Flow Builder ── */}
            <section id="flow" className="py-16 md:py-28 px-4 md:px-6 relative z-10 overflow-hidden border-y border-white/5 scroll-mt-20">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-emerald-900/10 pointer-events-none" />
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-24">
                    {/* Text */}
                    <div className="w-full lg:w-1/2 order-2 lg:order-1">
                        <FadeIn from="left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <Workflow className="w-3.5 h-3.5" />
                                Automation Flow Tree
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Rẽ Nhánh Kịch Bản<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Theo Chạm Hành Vi</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Khách hàng mở mail? Khách hàng lờ tin nhắn? Kịch bản rẽ nhánh tự động giải quyết mọi tình huống. Kết hợp "Wait Conditions" để tạo ra chuỗi sự kiện nuôi dưỡng lead tự nhiên đỉnh cao.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { t: "Delay Timer", d: "Chờ 3 ngày hoặc 8AM" },
                                    { t: "Condition Switch", d: "Nhiều nhánh hành động" },
                                    { t: "A/B Testing", d: "Chia luồng ngẫu nhiên" },
                                    { t: "Goal/Exit", d: "Hoàn tất mục tiêu Campaign" }
                                ].map((box, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="text-sm font-bold text-white mb-1">{box.t}</div>
                                        <div className="text-xs text-slate-500">{box.d}</div>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>
                    </div>

                    {/* Flow Visual */}
                    <div className="w-full lg:w-1/2 order-1 lg:order-2">
                        <FadeIn delay={0.2} from="right">
                            {/* Mobile slider */}
                            <div className="block lg:hidden">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 scrollbar-none" style={{scrollbarWidth:'none'}}>
                                    {[
                                        {src:'/imgs/flow_mail.png', alt:'Phân nhánh kịch bản'},
                                        {src:'/imgs/flowstep_track.png', alt:'Theo dõi bước flow'},
                                        {src:'/imgs/kichban.png', alt:'Kịch bản 1'},
                                        {src:'/imgs/kichban2.png', alt:'Kịch bản 2'},
                                    ].map((img, i) => (
                                        <div key={i} className="snap-center shrink-0 w-[85vw] border border-white/10 rounded-2xl p-1.5 bg-[#161b22]">
                                            <img src={img.src} alt={img.alt} className="w-full h-auto rounded-xl object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {[0,1,2,3].map(i => (
                                        <div key={i} className={`rounded-full transition-all duration-300 ${flowSlide===i ? 'w-5 h-2 bg-blue-400':'w-2 h-2 bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            {/* Desktop stacked */}
                            <div className="hidden lg:block relative flex flex-col gap-6 items-end perspective-1000 pb-24">
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)] group hover:-translate-y-2 transition-all duration-500 w-[85%] z-10 hover:z-30 self-end">
                                    <img src="/imgs/flow_mail.png" alt="Phân nhánh kịch bản Flow" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] group hover:-translate-y-2 transition-all duration-500 w-[90%] -mt-24 md:-mt-32 self-start z-20 hover:z-[60]">
                                    <img src="/imgs/flowstep_track.png" alt="Theo dõi từng bước flow" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute top-[25%] -left-12 border border-white/10 rounded-2xl p-1 bg-[#161b22] shadow-[0_30px_100px_-20px_rgba(59,130,246,0.6)] group hover:-translate-y-3 transition-all duration-500 w-[50%] z-40 hover:z-50">
                                    <img src="/imgs/kichban.png" alt="Kịch Bản 1" className="w-full h-auto rounded-xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute bottom-[-5%] right-0 md:-right-8 border border-white/10 rounded-2xl p-1 bg-[#161b22] shadow-[0_30px_100px_-20px_rgba(16,185,129,0.5)] group hover:-translate-y-3 transition-all duration-500 w-[45%] z-40 hover:z-50">
                                    <img src="/imgs/kichban2.png" alt="Kịch Bản 2" className="w-full h-auto rounded-xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── Campaign Tracking Section ── */}
            <section id="campaign-tracking" className="py-16 md:py-28 px-4 md:px-6 relative z-10 bg-[#0b0f16] scroll-mt-20">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    {/* Visual */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn delay={0.2} from="left">
                            {/* Mobile slider */}
                            <div className="block lg:hidden">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4" style={{scrollbarWidth:'none'}}>
                                    {[
                                        {src:'/imgs/campain_track_3.png', alt:'Mail Detail Track'},
                                        {src:'/imgs/campain_track_4.png', alt:'Device Analytics'},
                                        {src:'/imgs/campain_track_heatmap.png', alt:'Heatmap'},
                                        {src:'/imgs/campain_track_1.png', alt:'Heatmap Insights'},
                                        {src:'/imgs/campain_track_2.png', alt:'Time Tracking'},
                                    ].map((img, i) => (
                                        <div key={i} className="snap-center shrink-0 w-[85vw] border border-white/10 rounded-2xl p-1.5 bg-[#161b22]">
                                            <img src={img.src} alt={img.alt} className="w-full h-auto rounded-xl object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {[0,1,2,3,4].map(i => (
                                        <div key={i} className={`rounded-full transition-all duration-300 ${campSlide===i ? 'w-5 h-2 bg-pink-400':'w-2 h-2 bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            {/* Desktop stacked layout */}
                            <div className="hidden lg:block relative flex flex-col items-center pb-10 perspective-1000 mt-8">
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(236,72,153,0.3)] group hover:-translate-y-2 transition-all duration-500 w-[90%] z-10 self-start ml-4 hover:z-40">
                                    <img src="/imgs/campain_track_3.png" alt="Mail Detail Track" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] group hover:-translate-y-2 transition-all duration-500 w-[85%] -mt-16 z-20 self-end mr-4 hover:z-40">
                                    <img src="/imgs/campain_track_4.png" alt="Device Analytics" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.7)] group hover:-translate-y-2 transition-all duration-500 w-[90%] -mt-14 z-30 self-center hover:z-50">
                                    <img src="/imgs/campain_track_heatmap.png" alt="Location Metrics" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute top-[25%] -left-10 border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] group hover:-translate-y-2 transition-all duration-500 w-[50%] z-40 hover:z-[60]">
                                    <img src="/imgs/campain_track_1.png" alt="Heatmap Insights" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute top-[65%] -right-8 border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] group hover:-translate-y-2 transition-all duration-500 w-[45%] z-50 hover:z-[60]">
                                    <img src="/imgs/campain_track_2.png" alt="Time Tracking" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Content */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn from="right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <BarChart3 className="w-3.5 h-3.5" />
                                Campaign Deep Analytics
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Theo Dõi Chiến Dịch <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Siêu Chi Tiết Tâm Điểm</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Nắm bắt trọn vẹn hành vi của từng người nhận. Hệ thống phân tích đa chiều không bỏ sót bất kỳ điểm chạm nào: Tỷ lệ Click theo khu vực vị trí, Môi trường thiết bị, và cả bản đồ tương tác (Heatmap) ngay trên file Mail/Landing.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { t: "Heatmap Click", d: "Bản đồ nhiệt biết nơi KH hay tương tác nhất" },
                                    { t: "Device & Browser", d: "Thống kê Thiết bị & Trình duyệt (Mobile vs PC)" },
                                    { t: "Location Tracking", d: "Báo cáo vị trí mở theo Quốc gia/Thành phố" },
                                    { t: "Time Matrix", d: "Biểu đồ phân tích khung giờ mở cực đại" }
                                ].map((box, i) => (
                                    <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-pink-500/30 transition-colors">
                                        <div className="text-sm font-bold text-white mb-1">{box.t}</div>
                                        <div className="text-xs text-slate-500">{box.d}</div>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── Tracking & Lead Scoring Section ── */}
            <section id="analytics" className="py-28 px-6 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
                    {/* Text */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn from="right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <ScanLine className="w-3.5 h-3.5" />
                                Web Analytics & Lead Score
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Tracking Mọi Chạm <br />
                                <span className="text-emerald-400">Trên Hành Trình Users</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Bạn nghĩ khách truy cập website là những cái bóng vô hình? DOM Pixel ghi lại hành động Scroll màn hình, Click từng nút bấm. Kết hợp bộ xử lý Điểm Tiềm Năng (Lead Scoring) tự động phân đoạn luồng chăm sóc.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <Bot className="w-6 h-6 text-emerald-400 mb-3" />
                                    <h4 className="font-bold text-white mb-1">AI Phân Tích Segment</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">Phân cụm hành vi khách hàng hoàn toàn tự động, phân group nóng/lạnh chuẩn xác.</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <Target className="w-6 h-6 text-amber-400 mb-3" />
                                    <h4 className="font-bold text-white mb-1">Cộng/Trừ Điểm Tự Động</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">Score += 5 nếu Scroll 100%. Tiết kiệm sức cho Telesale khi gọi đúng người.</p>
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Dashboard Mock */}
                    <div className="w-full lg:w-1/2 relative min-h-[500px] flex flex-col justify-center">
                        <FadeIn delay={0.2} from="left" className="w-full">
                            <div className="relative flex flex-col items-center pb-10 md:pb-0">
                                {/* Base Vertical Image */}
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] group hover:-translate-y-2 transition-all duration-500 w-[70%] sm:w-[60%] z-10 self-start hover:z-40">
                                    <img src="/imgs/website_tracking1.png" alt="User Journey Vertical" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                {/* Second Base Image */}
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] group hover:-translate-y-2 transition-all duration-500 w-[90%] sm:w-[85%] -mt-20 md:-mt-32 self-end z-20 hover:z-40">
                                    <img src="/imgs/website tracking.jpg" alt="Website Tracking Metrics" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                {/* Third Image (Dọc nhỏ hơn) */}
                                <div className="absolute top-[5%] md:top-[-30%] -right-4 md:-right-10 border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] group hover:-translate-y-2 transition-all duration-500 w-[55%] md:w-[60%] z-30 hover:z-50">
                                    <img src="/imgs/user_jouney.jpg" alt="Tracking Mobile/Vertical" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>

                                {/* Live Tracking Log HTML Mockup */}
                                <div className="absolute right-0 -bottom-8 md:-bottom-12 lg:-right-12 w-[280px] sm:w-[320px] bg-[#0d1117]/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden backdrop-blur-xl z-40 transform hover:-translate-y-2 transition-transform duration-500">
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                        <div><p className="text-sm font-bold text-white">Live Tracking Log</p><p className="text-[10px] text-slate-500">Phát hiện dữ liệu Real-time</p></div>
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-red-500/30" />
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { ev: "PAGE SCROLL_75%", user: "Nguyen Minh (ng**n)", score: "+5 Point", p: "bg-emerald-500" },
                                            { ev: "BTN CLICK: BUY NOW", user: "Tran Anh (tr**a)", score: "+20 Point", p: "bg-amber-500" },
                                            { ev: "EMAIL OPENED", user: "Le Hoang (le**c)", score: "+2 Point", p: "bg-blue-500" },
                                        ].map((row, i) => (
                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${row.p}/20`}>
                                                        <Pointer className={`w-3.5 h-3.5 text-${row.p.replace('bg-', '')}`} style={{ color: `var(--${row.p.replace('bg-', '')})` }} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white leading-tight">{row.ev}</p>
                                                        <p className="text-[9px] text-slate-500 mt-0.5">{row.user}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-1 sm:mt-0 text-right">
                                                    <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black text-amber-400 border border-amber-500/20">
                                                        {row.score}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── AI Chatbot Section ── */}
            <section id="ai" className="py-28 px-6 relative z-10 overflow-hidden border-y border-white/5">
                <div className="absolute inset-0 bg-gradient-to-l from-purple-900/15 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-20">
                    {/* Text */}
                    <div className="w-full lg:w-1/2">
                        <FadeIn from="right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-8">
                                <Cpu className="w-3.5 h-3.5" />
                                AI Chatbot System
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Trợ Lý Ảo AI<br />
                                <span className="text-purple-400">Thông Minh Như Chuyên Gia</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                                Train AI từ tài liệu nội bộ, website của bạn. Thiết lập nền tảng kiến thức (Knowledge Base) thông minh, trả lời trực tiếp thắc mắc Khách hàng 24/7.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                                {[
                                    { icon: Sparkles, label: 'Giao Diện Branding', value: 'Custom màu sắc, UI Design & Logo riêng' },
                                    { icon: Settings2, label: 'Thiết Lập Văn Hóa', value: 'Tuỳ chỉnh tone giọng, chuẩn văn hoá Brand' },
                                    { icon: Users, label: 'Giao Tiếp Tự Nhiên', value: 'Tư vấn, hỏi đáp, chốt sale như người thật' },
                                    { icon: Database, label: 'Train Kiến Thức', value: 'Máy học thần tốc qua File, Web URL' },
                                ].map((item) => (
                                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                        <item.icon className="w-6 h-6 text-purple-400 mb-3" />
                                        <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">{item.label}</p>
                                        <p className="text-sm font-semibold text-white leading-relaxed">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>
                    </div>

                    {/* Screenshot */}
                    <div className="w-full lg:w-1/2 relative perspective-1000">
                        <FadeIn delay={0.2} from="left">
                            {/* Mobile slider */}
                            <div className="block lg:hidden">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4" style={{scrollbarWidth:'none'}}>
                                    {[
                                        {src:'/imgs/kien thuc ai.jpg', alt:'Knowledge Base'},
                                        {src:'/imgs/ai_2.jpg', alt:'AI Chatbot'},
                                        {src:'/imgs/AIchatbot.png', alt:'Custom Chatbot UI'},
                                    ].map((img, i) => (
                                        <div key={i} className="snap-center shrink-0 w-[85vw] border border-white/10 rounded-2xl p-1.5 bg-[#161b22]">
                                            <img src={img.src} alt={img.alt} className="w-full h-auto rounded-xl object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {[0,1,2].map(i => (
                                        <div key={i} className={`rounded-full transition-all duration-300 ${chatSlide===i ? 'w-5 h-2 bg-purple-400':'w-2 h-2 bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            {/* Desktop stacked */}
                            <div className="hidden lg:block relative flex flex-col items-start pt-6 md:pt-12 pb-10">
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(168,85,247,0.3)] group hover:-translate-y-2 transition-all duration-500 w-full sm:w-[85%] z-10 hover:z-40">
                                    <img src="/imgs/kien thuc ai.jpg" alt="Knowledge Base Platform" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] group hover:-translate-y-2 transition-all duration-500 w-[90%] -mt-24 md:-mt-32 self-end z-20 hover:z-40">
                                    <img src="/imgs/ai_2.jpg" alt="AI Chatbot Interaction" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute top-[15%] md:top-[25%] -left-4 sm:-left-12 border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_100px_-20px_rgba(168,85,247,0.8)] group hover:-translate-y-3 transition-all duration-500 w-[55%] sm:w-[45%] z-30 hover:z-50">
                                    <img src="/imgs/AIchatbot.png" alt="Custom AI Chatbot" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.05] transition-transform duration-500" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── AI Segment Analytics ── */}
            <section id="ai-segment" className="py-16 md:py-28 px-4 md:px-6 relative z-10 overflow-hidden border-t border-white/5 bg-[#0b101e] scroll-mt-20">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/10 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    {/* Visual */}
                    <div className="w-full lg:w-[55%]">
                        <FadeIn delay={0.2} from="left">
                            {/* Mobile slider */}
                            <div className="block lg:hidden">
                                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4" style={{scrollbarWidth:'none'}}>
                                    {[
                                        {src:'/imgs/phan_tich_ai_1.png', alt:'Phân Tích AI'},
                                        {src:'/imgs/phan_tich_ai_2.png', alt:'Chủ Đề Quan Tâm'},
                                        {src:'/imgs/thauhieu.png', alt:'Thấu Hiểu KH'},
                                        {src:'/imgs/phan_tich_ai_3.png', alt:'Độ Chính Xác'},
                                    ].map((img, i) => (
                                        <div key={i} className="snap-center shrink-0 w-[85vw] border border-white/10 rounded-2xl p-1.5 bg-[#161b22]">
                                            <img src={img.src} alt={img.alt} className="w-full h-auto rounded-xl object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-center gap-1.5 mt-3">
                                    {[0,1,2,3].map(i => (
                                        <div key={i} className={`rounded-full transition-all duration-300 ${segSlide===i ? 'w-5 h-2 bg-indigo-400':'w-2 h-2 bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            {/* Desktop stacked */}
                            <div className="hidden lg:block relative flex flex-col items-center pb-16 perspective-1000">
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)] group hover:-translate-y-2 transition-all duration-500 w-full sm:w-[85%] z-10 self-start hover:z-40">
                                    <img src="/imgs/phan_tich_ai_1.png" alt="Phân Tích AI Segment" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] group hover:-translate-y-2 transition-all duration-500 w-[80%] sm:w-[70%] -mt-12 sm:-mt-20 self-end z-20 hover:z-40">
                                    <img src="/imgs/phan_tich_ai_2.png" alt="Phân Tích Chủ Đề" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_100px_-20px_rgba(99,102,241,0.5)] group hover:-translate-y-2 transition-all duration-500 w-[85%] sm:w-[75%] -mt-10 sm:-mt-16 self-start z-30 hover:z-50">
                                    <img src="/imgs/thauhieu.png" alt="Thấu Hiểu Khách Hàng" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                                <div className="absolute bottom-[-2%] right-0 md:-right-4 border border-white/10 rounded-2xl p-1.5 bg-[#161b22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] group hover:-translate-y-2 transition-all duration-500 w-[45%] sm:w-[38%] z-40 hover:z-50">
                                    <img src="/imgs/phan_tich_ai_3.png" alt="Phân Tích Độ Chính Xác" className="w-full h-auto rounded-2xl object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Content */}
                    <div className="w-full lg:w-[45%] z-20">
                        <FadeIn from="right">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <Users className="w-3.5 h-3.5" />
                                Cụm Hành Vi (AI Segment)
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Phân Tích &amp; Thấu Hiểu<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Từng Khách Hàng</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                Đào sâu vào hội thoại để nhận diện bức tranh tổng thể. AI Tự động phân loại luồng khách hàng (Segmentation) thành nhóm "tiềm năng", "đang do dự" – và gợi ý ngay kịch bản chăm sóc tiếp theo cho bạn.
                            </p>
                            <div className="space-y-4 mb-4">
                                {[
                                    { t: "AI Segment Grouping", d: "Tự động phân tập theo xu hướng hội thoại" },
                                    { t: "Đề xuất kịch bản chăm sóc", d: "Tạo Flow Automation phù hợp cho từng nhóm chỉ với 1 click" },
                                    { t: "Theo dõi độ chính xác (Accuracy)", d: "Bảng điều khiển đo lường tỷ lệ trả lời đúng của Bot" },
                                    { t: "Khai thác chủ đề quan tâm", d: "Top từ khóa, chủ đề khách hàng hỏi nhiều nhất" }
                                ].map((box, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                                        <div className="mt-1 w-6 h-6 rounded border border-indigo-500/40 bg-indigo-500/20 flex shrink-0 items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-1">{box.t}</h4>
                                            <p className="text-xs text-slate-400">{box.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── AI Space Section ── */}
            <section id="ai-space" className="py-28 px-6 relative z-10 overflow-hidden border-t border-white/5 bg-[#080c14]">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-900/10 to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    {/* Content */}
                    <div className="w-full lg:w-[45%] z-20">
                        <FadeIn from="left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <Sparkles className="w-3.5 h-3.5" />
                                Nền tảng AI Workspace
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                Không Gian AI <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Độc Lập Cho Phòng Ban</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                AI Space chuyên nghiệp đáp ứng nhu cầu doanh nghiệp: Huấn luyện kiến thức riêng lẻ cho phòng Nhân sự, Sale hay Marketing. Với thiết lập Knowledge Base khắt khe, AI sẽ đóng vai trò chuyên môn cực cao.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                {[
                                    { icon: Layers, t: "Training Chuyên Biệt", d: "Data độc lập, kiến thức phân quyền theo từng phòng ban" },
                                    { icon: ScanLine, t: "Chế Độ Đa Năng", d: "Tích hợp IMAGE mode, CodeMode, và Expert mode" },
                                    { icon: ShieldCheck, t: "Knowledge Khắt khe", d: "Kiểm soát truy xuất tài liệu, cấm AI bịa chuyện" },
                                    { icon: Users, t: "Phong Cách AI", d: "Giọng điệu Mentoring chân thật, hướng dẫn chi tiết" },
                                ].map((box, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/30 transition-colors">
                                        <div className="mt-1 w-8 h-8 rounded border border-rose-500/40 bg-rose-500/20 flex shrink-0 items-center justify-center">
                                            <box.icon className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm mb-1">{box.t}</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">{box.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>
                    </div>

                    {/* Visual Gallery */}
                    <div className="w-full lg:w-[55%] relative">
                        <FadeIn delay={0.2} from="right">
                            <div className="relative flex flex-col items-center pb-12 pt-6 perspective-1000">
                                {/* Base Image */}
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_0_80px_-20px_rgba(244,63,94,0.3)] w-full sm:w-[90%] z-10 hover:-translate-y-2 hover:z-40 transition-all duration-500">
                                    <img src="/imgs/AI GROUP (1).png" alt="AI Space" className="w-full rounded-2xl" />
                                </div>
                                {/* Stacked Right */}
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] w-[85%] -mt-16 sm:-mt-24 self-end z-20 hover:-translate-y-2 hover:z-40 transition-all duration-500">
                                    <img src="/imgs/AI GROUP (2).png" alt="Department Training" className="w-full rounded-2xl" />
                                </div>
                                {/* Stacked Left */}
                                <div className="border border-white/10 rounded-3xl p-2 bg-[#161b22] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] w-[95%] sm:w-[85%] -mt-10 sm:-mt-16 z-30 self-center hover:-translate-y-2 hover:z-50 transition-all duration-500">
                                    <img src="/imgs/AI GROUP (4).png" alt="AI Expert Mode" className="w-full rounded-2xl" />
                                </div>

                                {/* Floating Top-Right */}
                                <div className="absolute top-[8%] -right-2 md:-right-8 border border-white/10 rounded-2xl p-1.5 bg-[#161b22] shadow-[0_20px_50px_rgba(244,63,94,0.4)] w-[40%] sm:w-[35%] z-40 hover:-translate-y-3 hover:scale-105 transition-all duration-500">
                                    <img src="/imgs/AI GROUP (3).png" alt="Image Mode" className="w-full rounded-xl" />
                                </div>

                                {/* Floating Bottom-Left */}
                                <div className="absolute bottom-[-5%] -left-2 md:-left-6 border border-white/10 rounded-2xl p-1.5 bg-[#161b22] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9)] w-[45%] sm:w-[40%] z-40 hover:-translate-y-3 hover:scale-105 transition-all duration-500">
                                    <img src="/imgs/AI GROUP (5).png" alt="Code Mode" className="w-full rounded-xl" />
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="py-24 px-6 relative z-10 bg-white/2 border-white/5">
                <div className="max-w-4xl mx-auto">
                    <FadeIn className="text-center mb-16">
                        <div className="flex items-center justify-center gap-1 mb-4">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Khách Hàng Nói Gì?</h2>
                        <p className="text-slate-400">Hàng trăm doanh nghiệp đang tăng trưởng cùng nền tảng của chúng tôi</p>
                    </FadeIn>

                    <div className="relative min-h-[240px]">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTestimonial}
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                                className="bg-[#11151c] border border-separator/10 rounded-3xl p-10 text-center shadow-xl">
                                <p className="text-lg text-slate-200 mb-8 leading-relaxed max-w-2xl mx-auto font-medium">
                                    "{testimonials[activeTestimonial].text}"
                                </p>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-sm">
                                        {testimonials[activeTestimonial].avatar}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white">{testimonials[activeTestimonial].name}</p>
                                        <p className="text-sm text-slate-500">{testimonials[activeTestimonial].role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, i) => (
                            <button key={i} onClick={() => setActiveTestimonial(i)}
                                className={`rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-8 h-2 bg-amber-400' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="py-28 px-6 relative z-10 scroll-mt-20">
                <div className="max-w-6xl mx-auto">
                    <FadeIn className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
                            <BoxSelect className="w-3.5 h-3.5" /> Bảng Giá
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-5">
                            Giá Phù Hợp<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Mọi Quy Mô Doanh Nghiệp</span>
                        </h2>
                    </FadeIn>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-8">
                        {plans.map((plan, i) => (
                            <PricingCard key={plan.tier} {...plan} delay={i * 0.1} onClick={() => setIsFormOpen(true)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Final ── */}
            <section className="py-32 px-6 relative z-10 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="aurora-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full" style={{background:'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.08) 40%, transparent 70%)'}} />
                    <div className="aurora-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full" style={{background:'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', animationDelay:'-5s'}} />
                </div>
                <div className="max-w-5xl mx-auto">
                    <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(245,158,11,0.2),0_40px_80px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0" style={{background:'linear-gradient(135deg,#92400e,#f59e0b,#ea580c,#be185d)',backgroundSize:'300% 300%',animation:'border-flow 8s linear infinite'}} />
                        <div className="absolute inset-0">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
                            <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
                        </div>
                        <FadeIn className="relative z-10 p-10 md:p-20 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 mb-8">
                                <span className="live-dot w-2 h-2 rounded-full bg-white" />
                                <span className="text-white text-xs font-bold uppercase tracking-widest">Sẵn Sàng Tăng Trưởng</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight" style={{textShadow:'0 0 40px rgba(255,255,255,0.2)'}}>
                                Tăng Trưởng Cùng<br />Hệ Thống AI DIGITAL VISION
                            </h2>
                            <p className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium">Bắt đầu khám phá sức mạnh của Automation Đa Kênh. Miễn phí setup, đội ngũ chuyên gia hỗ trợ bạn từng bước.</p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button onClick={() => setIsFormOpen(true)} className="group flex items-center gap-3 bg-white text-orange-600 px-10 py-4 rounded-2xl text-lg font-black shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:-translate-y-1 hover:scale-105 transition-all duration-300">
                                    <Rocket className="w-5 h-5 text-orange-500 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> Đăng Ký Trải Nghiệm
                                </button>
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-white/[0.06] bg-[#050810] py-16 px-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px" style={{background:'linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.5) 30%,rgba(234,88,12,0.5) 60%,transparent 100%)'}} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-48 bg-amber-900/10 blur-[80px] pointer-events-none" />
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                        <div className="md:col-span-1">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="relative">
                                    <img src="/imgs/ICON.png" alt="DOMATION Logo" className="w-10 h-10 object-contain rounded-[14px] shadow-lg shadow-amber-500/20" />
                                    <div className="absolute -inset-1 rounded-[18px] bg-amber-500/10 blur-md -z-10" />
                                </div>
                                <span className="text-xl font-black tracking-tight shimmer-text">DOMATION</span>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed mb-5">Nền tảng tự động hoá marketing đa kênh. Automation flow, AI chatbot, Email Drag Drop siêu việt.</p>
                            <p className="text-xs text-slate-700">© {new Date().getFullYear()} IDEAS Institute. All rights reserved.</p>
                        </div>
                        {[
                            { title: 'Sản Phẩm', links: [['#features','Email Template Builder'], ['#builder','Email Builder'], ['#ai','Chatbot Meta AI'], ['#campaign-tracking','Web Tracking Pixel'], ['#flow','Flow Builder']] },
                            { title: 'Công Ty', links: [['#','Về Chúng Tôi'], ['#','Báo Cáo Tăng Trưởng'], ['#','Khách Hàng'], ['#','Đối Tác Kênh']] },
                            { title: 'Hỗ Trợ', links: [['#','Tài Liệu HDSD'], ['#','API Docs'], ['#','Status Server'], ['#','Liên Hệ Phím Nóng']] },
                        ].map((col) => (
                            <div key={col.title}>
                                <h4 className="text-sm font-bold text-white/80 mb-5 uppercase tracking-wider">{col.title}</h4>
                                <ul className="space-y-3">
                                    {col.links.map(([href, l]) => (
                                        <li key={l}><a href={href} className="text-sm text-slate-600 hover:text-amber-400 transition-colors duration-200">{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>


            {/* ── Form Modal ── */}
            <AnimatePresence>
                {isFormOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0e121a] border border-white/10 rounded-3xl p-8 shadow-2xl"
                        >
                            <button
                                onClick={() => { setIsFormOpen(false); setFormStatus('idle'); }}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {formStatus === 'success' ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check className="w-8 h-8 text-black" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">Cảm ơn bạn!</h3>
                                    <p className="text-slate-400">Thông tin đã được ghi nhận. Chuyên gia của chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất qua số Zalo để demo trực tiếp hệ thống.</p>
                                    <button onClick={() => { setIsFormOpen(false); setFormStatus('idle'); }} className="mt-8 bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full text-white font-semibold transition-colors">Đóng lại</button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
                                        <img src="/imgs/ICON.png" alt="DOMATION Logo" className="w-12 h-12 object-contain rounded-[14px] shadow-lg shadow-amber-500/20" />
                                        <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500">
                                            DOMATION
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">Đăng Ký Tư Vấn & Demo</h3>
                                    <p className="text-slate-400 text-sm mb-6">Để lại thông tin để trực tiếp trải nghiệm nền tảng Marketing Automation số 1.</p>
                                    <form onSubmit={handleFormSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email liên hệ</label>
                                            <input required type="email" className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors" placeholder="name@company.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số điện thoại (Zalo)</label>
                                            <input required type="tel" className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors" placeholder="09xx xxx xxx" />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-[60%]">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Doanh nghiệp / Dự án</label>
                                                <input required type="text" className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors" placeholder="Website công ty" />
                                            </div>
                                            <div className="w-[40%] relative">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số lượng Email/tháng</label>
                                                <div
                                                    className="w-full bg-[#161b22] border border-white/10 rounded-xl px-4 py-3 text-white flex justify-between items-center cursor-pointer hover:border-amber-500/50 transition-colors"
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                >
                                                    <span className="text-sm truncate">{emailVolume}</span>
                                                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>

                                                    {isDropdownOpen && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                                            {['100.000 Emails', '500.000 Emails', '1.000.000 Emails'].map(vol => (
                                                                <div
                                                                    key={vol}
                                                                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
                                                                    onClick={() => setEmailVolume(vol)}
                                                                >
                                                                    {vol}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button disabled={formStatus === 'submitting'} type="submit" className="w-full mt-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-70">
                                            {formStatus === 'submitting' ? 'Đang gửi...' : 'Gửi Yêu Cầu Demo'}
                                            {formStatus !== 'submitting' && <ArrowRight className="w-5 h-5" />}
                                        </button>
                                    </form>

                                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <span className="text-xs text-slate-400 font-medium">Hoặc liên hệ nhanh qua:</span>
                                        <div className="flex items-center gap-3">
                                            <a href="https://zalo.me/0378859736" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF]/20 border border-[#0068FF]/20 transition-all text-sm font-bold">
                                                <img src={LOGOS.zalo} alt="Zalo" className="w-4 h-4 object-contain" />
                                                Zalo
                                            </a>
                                            <a href="https://www.facebook.com/turni0" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0866FF]/10 text-[#0866FF] hover:bg-[#0866FF]/20 border border-[#0866FF]/20 transition-all text-sm font-bold">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                                Facebook
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Landing;
