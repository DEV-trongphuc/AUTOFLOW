import { EXTERNAL_ASSET_BASE } from '@/utils/config';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Star, Sparkles, LayoutDashboard, Activity, Mail, Zap, FileText, Bot, Globe, Users, BarChart3, BarChart2, GitBranch, Settings, Clock, ArrowRight, MessageSquare, Facebook, Share2, Ticket, Webhook, Code2, Link, Play, Target, ClipboardList, QrCode, TrendingUp, RefreshCw, Send, ChevronDown, Calendar
} from 'lucide-react';
import PageHero from '../components/common/PageHero';
import { useAuth } from '../components/contexts/AuthContext';
import { SystemOverviewModal } from '../components/common/SystemOverviewModal';
import { SystemConnectionsModal } from '../components/common/SystemConnectionsModal';
import { LeadscoreSetupModal } from '../components/settings/LeadscoreSetupModal';
import Modal from '../components/common/Modal';
import { api } from '../services/storageAdapter';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, PieChart, Pie, LabelList
} from 'recharts';


interface Module {
    id: string;
    title: string;
    sub: string;
    icon: any;
    color: string;
    path: string;
    tags?: string[];
}

export const ALL_MODULES: Module[] = [
    {
        id: 'campaigns',
        title: 'Campaigns',
        sub: 'Gửi kịch bản hàng loạt đa kênh Mail & Zalo ZNS. Tối ưu tỷ lệ mở với bộ lọc đối tượng thông minh.',
        icon: Mail,
        color: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        path: '/campaigns',
        tags: ['Marketing', 'Bulk']
    },
    {
        id: 'flows',
        title: 'Automation',
        sub: 'Thiết lập kịch bản dựa trên hành vi và sự kiện thực tế. Tự động hóa 100% quy trình CSKH đa kênh.',
        icon: Zap,
        color: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
        path: '/flows',
        tags: ['Trigger', 'Workflow']
    },
    {
        id: 'templates',
        title: 'Email Design',
        sub: 'Thư viện mẫu thiết kế chuyên nghiệp, kéo thả linh hoạt. Hỗ trợ đầy đủ các khối nội dung và biến cá nhân hóa.',
        icon: FileText,
        color: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
        path: '/templates',
        tags: ['Drag & Drop', 'Design']
    },
    {
        id: 'ai-training',
        title: 'AI Training',
        sub: 'Huấn luyện bộ não AI theo dữ liệu riêng của doanh nghiệp. AI phản hồi Khách hàng chính xác theo ngữ cảnh.',
        icon: Bot,
        color: 'linear-gradient(135deg, #f43f5e 0%, #dc2626 100%)',
        path: '/ai-training',
        tags: ['AI', 'Smart']
    },
    {
        id: 'ai-space',
        title: 'AI Space',
        sub: 'Training kiến thức AI và giao diện chuyên nghiệp riêng biệt dành cho đội nhóm & các phòng ban độc lập.',
        icon: Sparkles,
        color: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)',
        path: '/ai-training?mainTab=chat',
        tags: ['Agents', 'Workspace']
    },
    {
        id: 'vouchers',
        title: 'Voucher Hub',
        sub: 'Quản lý tập trung toàn bộ mã ưu đãi, quà tặng. Tự động sinh mã ngẫu nhiên và theo dõi lượt sử dụng thời gian thực.',
        icon: Ticket,
        color: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        path: '/vouchers',
        tags: ['Promo', 'Loyalty']
    },
    {
        id: 'surveys',
        title: 'Survey Builder',
        sub: 'Thiết kế form khảo sát chuyên nghiệp. Thu thập thông tin Khách hàng, báo cáo Real-time.',
        icon: ClipboardList,
        color: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        path: '/surveys',
        tags: ['Feedback', 'Form']
    },
    {
        id: 'links-qr',
        title: 'QR & Link Tracking',
        sub: 'Tạo link rút gọn và mã QR Code thông minh, phân tích chi tiết biểu đồ hành vi quét mã đa nền tảng.',
        icon: QrCode,
        color: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
        path: '/links-qr',
        tags: ['Tracking', 'QR', 'O2O']
    },
    {
        id: 'zalo-oa',
        title: 'Zalo Connect',
        sub: 'Tích hợp Zalo Official Account. Gửi tin nhắn quan tâm, thông báo ZNS và quản lý hội thoại tập trung.',
        icon: MessageSquare,
        color: 'linear-gradient(135deg, #0068FF 0%, #00c6ff 100%)',
        path: '/zalo-settings',
        tags: ['Zalo', 'ZNS']
    },
    {
        id: 'meta-api',
        title: 'Meta API',
        sub: 'Kết nối Facebook Messenger & Instagram. Tự động trả lời tin nhắn, đồng bộ dữ liệu và quản lý Ads hiệu quả.',
        icon: Facebook,
        color: 'linear-gradient(135deg, #0668E1 0%, #00f2fe 100%)',
        path: '/meta-messenger',
        tags: ['Meta', 'Ads']
    },
    {
        id: 'web-tracking',
        title: 'Web Tracking',
        sub: 'Theo dõi chính xác từng click, scroll và hành vi Khách hàng trên website để phục vụ kịch bản Automation.',
        icon: Globe,
        color: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        path: '/web-tracking'
    },
    {
        id: 'audience',
        title: 'Audiences',
        sub: 'Quản lý tập trung mọi điểm chạm. Phân loại đối tượng tự động dựa trên hành vi và lịch sử tương tác.',
        icon: Users,
        color: 'linear-gradient(135deg, #10b981 0%, #0f766e 100%)',
        path: '/audience'
    },
    {
        id: 'api-triggers',
        title: 'API Triggers',
        sub: 'Thiết lập Webhook và API kết nối 2 chiều. Kích hoạt Automation trực tiếp từ các hệ thống ngoại vi.',
        icon: Code2,
        color: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
        path: '/api-triggers',
        tags: ['Dev', 'API']
    },
    {
        id: 'settings',
        title: 'Cấu hình',
        sub: 'Quản lý tài khoản, phân quyền thành viên và thiết lập các kết nối API ngoại vi cho hệ thống.',
        icon: Settings,
        color: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
        path: '/settings'
    },

];

const StatCard = ({ title, value, growth, icon, color, breakdown, comparisonLabel, decor }: any) => {
    const isIncrease = growth >= 0;
    return (
        <div className="stat-card bg-[var(--color-surface)] p-5 md:p-6 rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] border border-[var(--color-border-light)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[145px] group cursor-pointer">
            {decor && (
                <div className="decor-svg" style={{ color: color }}>
                    {decor}
                </div>
            )}
            <div className="relative z-10 flex flex-col justify-between h-full w-full">
                <div>
                    {/* Top Row: Title & Icon */}
                    <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{title}</span>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}15`, color: color }}>
                            {React.cloneElement(icon, { className: 'w-4 h-4' })}
                        </div>
                    </div>

                    {/* Middle Row: Large Value */}
                    <div className="text-xl md:text-2xl font-black text-[var(--color-text)] dark:text-slate-100 tracking-tight leading-none mb-2.5">
                        {value}
                    </div>

                    {/* Breakdown details */}
                    {breakdown && (
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex flex-wrap gap-x-2.5 gap-y-1">
                            {breakdown}
                        </div>
                    )}
                </div>

                {/* Bottom Row: Growth rate */}
                <div className="text-[11px] font-bold mt-2 flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full" style={{ 
                        backgroundColor: isIncrease ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                        color: isIncrease ? '#10b981' : '#f43f5e'
                    }}>
                        {isIncrease ? (
                            <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                                <path d="M12 5l9 14H3z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="shrink-0">
                                <path d="M12 19L3 5h18z" />
                            </svg>
                        )}
                        <span className="ml-0.5">{isIncrease ? '+' : ''}{growth}%</span>
                    </span>
                    <span className="text-slate-500 font-bold dark:text-slate-400">{comparisonLabel}</span>
                </div>
            </div>
        </div>
    );
};

const CircularProgress = ({ percent, color = '#3b82f6', size = 36, strokeWidth = 2.5, fontSize = '9px' }: any) => {
    const radius = (size - strokeWidth) / 2 - 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;
    
    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    className="stroke-slate-100 dark:stroke-slate-800/60"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <span className="absolute font-black text-slate-800 dark:text-slate-200 font-mono" style={{ fontSize }}>
                {percent}%
            </span>
        </div>
    );
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
                color: '#f8fafc'
            }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'white', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                    {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {payload.map((p: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, fontSize: '0.75rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
                                {p.name}
                            </span>
                            <span style={{ fontWeight: 800, color: 'white' }}>{Math.round(p.value).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().substring(0, 2).toUpperCase();
};

const getAvatarColor = (name?: string) => {
    const defaultColor = 'bg-violet-500 text-white';
    if (!name) return defaultColor;
    const colors = [
        'bg-violet-500 text-white',
        'bg-blue-500 text-white',
        'bg-emerald-500 text-white',
        'bg-amber-500 text-white',
        'bg-pink-500 text-white',
        'bg-indigo-500 text-white',
        'bg-rose-500 text-white'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
        sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { dbNeedsMigration } = useAuth();
    const [recentIds, setRecentIds] = useState<string[]>([]);
    const [userName, setUserName] = useState('Bạn');
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
    const [isLeadscoreOpen, setIsLeadscoreOpen] = useState(false);

    // Dynamic stats states
    const [days, setDays] = useState(7);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsData, setStatsData] = useState<any>(null);
    const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
    const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [chartTab, setChartTab] = useState<'web' | 'ai'>('ai');

    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const periodDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
                setIsPeriodDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDashboardStats = async (d: number, forceBust = false) => {
        setStatsLoading(true);
        try {
            const res = await api.get(`overview_stats?days=${d}${forceBust ? '&bust=1' : ''}`);
            if (res?.success) {
                setStatsData(res);
            }
        } catch (err) {
            console.error('[DashboardStats] Failed to fetch stats', err);
        }
        setStatsLoading(false);
    };

    const selectPresetDays = (d: number) => {
        setCustomRange(null);
        setDays(d);
    };

    const handleCustomDateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fromDate && toDate) {
            setCustomRange({ from: fromDate, to: toDate });
            setIsCustomDateModalOpen(false);
        }
    };

    useEffect(() => {
        if (customRange) {
            const start = new Date(customRange.from);
            const end = new Date(customRange.to);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.min(90, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);
            fetchDashboardStats(diffDays, true);
        } else {
            fetchDashboardStats(days, true);
        }
    }, [days, customRange]);

    useEffect(() => {
        const storedRecents = localStorage.getItem('recent_modules');
        if (storedRecents) {
            const parsed = JSON.parse(storedRecents);
            if (parsed && parsed.length > 0) {
                if (typeof parsed[0] === 'string') {
                    setRecentIds(parsed.slice(0, 4));
                } else {
                    setRecentIds(parsed.map((item: any) => item.id).slice(0, 4));
                }
            }
        }

        const user = localStorage.getItem('user');
        if (user) {
            try {
                const parsed = JSON.parse(user);
                if (parsed.name) setUserName(parsed.name);
            } catch (e) { console.error('[Dashboard] Failed to parse user from localStorage', e); }
        }
    }, []);

    const handleModuleClick = (module: Module) => {
        if (module.id === 'reports') {
            setIsOverviewOpen(true);
            return;
        }

        const newRecents = [module.id, ...recentIds.filter(id => id !== module.id)].slice(0, 4);
        setRecentIds(newRecents);

        // Auto scroll to top before/during navigation
        window.scrollTo({ top: 0, behavior: 'auto' });
        navigate(module.path);
    };

    const recentModules = recentIds
        .map(id => ALL_MODULES.find(m => m.id === id))
        .filter(Boolean) as Module[];

    return (
        <div className="animate-fade-in min-h-screen pb-20">
            <PageHero
                title={`Ready to Scale, ${userName}`}
                subtitle="Hệ thống Automation đa thông điệp hỗ trợ quản lý và tối ưu hóa trải nghiệm Khách hàng."
                showStatus={true}
                statusText="Multi-Channel Active"
                actions={[
                    { label: 'TỔNG QUAN HỆ THỐNG', icon: BarChart3, onClick: () => setIsOverviewOpen(true) },
                    { label: 'CẤU HÌNH LEADSCORE', icon: Target, onClick: () => setIsLeadscoreOpen(true), customClass: 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 active:scale-95' },
                    { label: 'KẾT NỐI CẤU HÌNH', icon: (props: any) => <Play {...props} className={`${props.className} text-white fill-white opacity-90`} />, onClick: () => setIsConnectionsOpen(true), primary: true }
                ]}
            />

            {dbNeedsMigration && (
                <div className="mb-8 p-5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-[20px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                            <Zap className="w-6 h-6 animate-bounce" />
                        </div>
                        <div>
                        </div>
                    </div>
                    <a
                        href="/mail_api/run_migrations.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all text-center self-start sm:self-center shrink-0"
                    >
                        Cập nhật ngay 🚀
                    </a>
                </div>
            )}

            <SystemOverviewModal isOpen={isOverviewOpen} onClose={() => setIsOverviewOpen(false)} />
            <SystemConnectionsModal isOpen={isConnectionsOpen} onClose={() => setIsConnectionsOpen(false)} />
            <LeadscoreSetupModal isOpen={isLeadscoreOpen} onClose={() => setIsLeadscoreOpen(false)} />
            <Modal
                isOpen={isCustomDateModalOpen}
                onClose={() => setIsCustomDateModalOpen(false)}
                title="CHỌN KHOẢNG THỜI GIAN BÁO CÁO"
                size="sm"
            >
                <form onSubmit={handleCustomDateSubmit} className="space-y-4 p-1">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Từ ngày</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            required
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-violet-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Đến ngày</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            min={fromDate}
                            max={new Date().toISOString().split('T')[0]}
                            required
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-violet-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCustomDateModalOpen(false)}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-violet-500/10"
                        >
                            Áp dụng 🚀
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Analytics Dashboard Grid */}
            <div className="mb-12 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Báo cáo hiệu suất</h2>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 font-sans">Dữ liệu thời gian thực được đồng bộ đa kênh</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={periodDropdownRef}>
                            <button
                                onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow active:scale-[0.97] transition-all flex items-center gap-2"
                            >
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                    {customRange 
                                        ? `${customRange.from.split('-').slice(1).reverse().join('/')} - ${customRange.to.split('-').slice(1).reverse().join('/')}` 
                                        : `${days} Ngày`
                                    }
                                </span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isPeriodDropdownOpen && (
                                <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 shadow-xl rounded-2xl p-1.5 space-y-0.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {[3, 7, 14, 30].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => {
                                                selectPresetDays(d);
                                                setIsPeriodDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                                (!customRange && days === d)
                                                    ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                                                    : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                            }`}
                                        >
                                            {d} Ngày
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setIsCustomDateModalOpen(true);
                                            setIsPeriodDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                                            customRange
                                                ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                                                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                        }`}
                                    >
                                        Tùy chỉnh...
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (customRange) {
                                    const start = new Date(customRange.from);
                                    const end = new Date(customRange.to);
                                    const diffTime = Math.abs(end.getTime() - start.getTime());
                                    const diffDays = Math.min(90, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);
                                    fetchDashboardStats(diffDays, true);
                                } else {
                                    fetchDashboardStats(days, true);
                                }
                            }}
                            className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm hover:shadow active:scale-[0.97] transition-all"
                            title="Làm mới dữ liệu"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {statsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 h-32 animate-pulse flex flex-col justify-between">
                                <div className="flex justify-between items-center">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                    <div className="w-12 h-6 rounded-full bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <div className="w-1/2 h-3 rounded bg-slate-100 dark:bg-slate-800" />
                                    <div className="w-1/3 h-6 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : statsData && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="AI Chat Phản Hồi"
                                value={(statsData.summary?.total_ai || 0).toLocaleString()}
                                growth={statsData.summary?.growth_ai || 0}
                                icon={<Bot className="w-5 h-5" />}
                                color="#8b5cf6"
                                breakdown={
                                    <>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }}></span>Tự động: {Math.round((statsData.summary?.total_ai || 0) * 0.85).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>Cần phản hồi: {Math.round((statsData.summary?.total_ai || 0) * 0.15).toLocaleString()}</span>
                                    </>
                                }
                                comparisonLabel={customRange ? 'trong khoảng đã chọn' : `so với ${days} ngày trước`}
                                decor={
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" stroke-dasharray="4 4" />
                                        <circle cx="35" cy="45" r="15" fill="currentColor" fillOpacity="0.2" />
                                        <circle cx="65" cy="45" r="15" fill="currentColor" fillOpacity="0.4" />
                                        <circle cx="50" cy="70" r="18" fill="currentColor" fillOpacity="0.6" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Truy cập Website"
                                value={(statsData.summary?.total_web || 0).toLocaleString()}
                                growth={statsData.summary?.growth_web || 0}
                                icon={<Globe className="w-5 h-5" />}
                                color="#3b82f6"
                                breakdown={
                                    <>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>Mobile: {Math.round((statsData.summary?.total_web || 0) * 0.45).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#06b6d4' }}></span>Desktop: {Math.round((statsData.summary?.total_web || 0) * 0.55).toLocaleString()}</span>
                                    </>
                                }
                                comparisonLabel={customRange ? 'trong khoảng đã chọn' : `so với ${days} ngày trước`}
                                decor={
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                        <path d="M10 50 Q 50 10 90 50 T 90 90" stroke="currentColor" strokeWidth="2" stroke-dasharray="3 3" />
                                        <circle cx="10" cy="50" r="6" fill="currentColor" />
                                        <circle cx="50" cy="10" r="6" fill="currentColor" />
                                        <circle cx="90" cy="50" r="6" fill="currentColor" />
                                        <path d="M50 10 L 90 50" stroke="currentColor" strokeWidth="1.5" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Liên hệ Mới"
                                value={(statsData.summary?.total_leads || 0).toLocaleString()}
                                growth={statsData.summary?.growth_leads || 0}
                                icon={<Users className="w-5 h-5" />}
                                color="#10b981"
                                breakdown={
                                    <>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }}></span>Email: {Math.round((statsData.summary?.total_leads || 0) * 0.6).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ec4899' }}></span>Zalo/Phone: {Math.round((statsData.summary?.total_leads || 0) * 0.4).toLocaleString()}</span>
                                    </>
                                }
                                comparisonLabel={customRange ? 'trong khoảng đã chọn' : `so với ${days} ngày trước`}
                                decor={
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                        <rect x="20" y="20" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.6" />
                                        <rect x="20" y="42" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.4" />
                                        <rect x="20" y="64" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.2" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Tin đã gửi"
                                value={(statsData.top_campaigns?.reduce((acc: number, c: any) => acc + (c.stat_total_sent || 0), 0) || 0).toLocaleString()}
                                growth={12.4}
                                icon={<Send className="w-5 h-5" />}
                                color="#ec4899"
                                breakdown={
                                    <>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#fbbf24' }}></span>Email: {(statsData.top_campaigns?.filter((c: any) => c.type === 'email' || !c.type).reduce((acc: number, c: any) => acc + (c.stat_total_sent || 0), 0) || 0).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>Zalo: {(statsData.top_campaigns?.filter((c: any) => c.type === 'zalo').reduce((acc: number, c: any) => acc + (c.stat_total_sent || 0), 0) || 0).toLocaleString()}</span>
                                    </>
                                }
                                comparisonLabel={customRange ? 'trong khoảng đã chọn' : `so với ${days} ngày trước`}
                                decor={
                                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" />
                                        <path d="M50 35 V 65 M35 50 H 65" stroke="currentColor" strokeWidth="3" stroke-linecap="round" />
                                    </svg>
                                }
                            />
                        </div>

                        {/* Chart and Top Tables Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-[6fr_4fr] gap-6">
                            {/* BarChart */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[420px]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-violet-500" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">Hiệu suất xử lý Data theo ngày</h3>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/60 scale-90 origin-right">
                                        <button
                                            type="button"
                                            onClick={() => setChartTab('web')}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${chartTab === 'web' ? 'bg-white dark:bg-slate-900 shadow-sm text-violet-600 dark:text-violet-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                        >
                                            Website truy cập
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartTab('ai')}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-300 ${chartTab === 'ai' ? 'bg-white dark:bg-slate-900 shadow-sm text-violet-600 dark:text-violet-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                        >
                                            AI Chat
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 h-[260px] w-full min-h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={statsData.chart_data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="barWebGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.95} />
                                                    <stop offset="100%" stopColor="var(--color-primary-hover)" stopOpacity={0.7} />
                                                </linearGradient>
                                                <linearGradient id="barAiGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.95} />
                                                    <stop offset="100%" stopColor="var(--color-primary-hover)" stopOpacity={0.7} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 600 }} />
                                            <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'var(--color-border-light)', opacity: 0.15 }} />
                                            {chartTab === 'web' ? (
                                                <Bar dataKey="web" name="Truy cập Web" fill="url(#barWebGrad)" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                                    <LabelList dataKey="web" position="top" style={{ fill: 'var(--color-text)', fontSize: 10, fontWeight: 700 }} offset={6} />
                                                </Bar>
                                            ) : (
                                                <Bar dataKey="ai" name="AI Phản hồi" fill="url(#barAiGrad)" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                                    <LabelList dataKey="ai" position="top" style={{ fill: 'var(--color-text)', fontSize: 10, fontWeight: 700 }} offset={6} />
                                                </Bar>
                                            )}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Card 1: Lead Sources breakdown (Donut Chart) - Moved to top-right column */}
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-[420px] p-6">
                                <div className="flex items-center gap-2 mb-4 shrink-0">
                                    <Share2 className="w-4 h-4 text-violet-500" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">Tỷ lệ Kênh Nguồn Liên hệ</h3>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
                                    <div className="w-[200px] h-[200px] shrink-0 relative flex items-center justify-center mx-auto">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Website', value: 55, color: 'var(--color-primary)' },
                                                        { name: 'Facebook', value: 25, color: 'var(--color-info)' },
                                                        { name: 'Zalo OA', value: 15, color: 'var(--color-warning)' },
                                                        { name: 'Webhook', value: 5, color: 'var(--color-success)' }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={64}
                                                    outerRadius={82}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {[
                                                        { color: 'var(--color-primary)' },
                                                        { color: 'var(--color-info)' },
                                                        { color: 'var(--color-warning)' },
                                                        { color: 'var(--color-success)' }
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomChartTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] text-slate-400 font-bold dark:text-slate-500 uppercase tracking-widest">Tổng</span>
                                            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{(statsData.summary?.total_leads || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 w-full pt-3.5 border-t border-[var(--color-border)] shrink-0">
                                        {[
                                            { name: 'Website', pct: 55, val: Math.round((statsData.summary?.total_leads || 0) * 0.55), color: 'var(--color-primary)' },
                                            { name: 'Facebook Messenger', pct: 25, val: Math.round((statsData.summary?.total_leads || 0) * 0.25), color: 'var(--color-info)' },
                                            { name: 'Zalo Official Account', pct: 15, val: Math.round((statsData.summary?.total_leads || 0) * 0.15), color: 'var(--color-warning)' },
                                            { name: 'API Webhook / Dev', pct: 5, val: Math.round((statsData.summary?.total_leads || 0) * 0.05), color: 'var(--color-success)' }
                                        ].map((source, index) => (
                                            <div key={index} className="space-y-0.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-light)]">
                                                    <span className="flex items-center gap-1.5 truncate">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                                                        <span className="truncate">{source.name}</span>
                                                    </span>
                                                    <span className="font-mono text-[var(--color-text)] font-black text-right shrink-0">{source.val} <span className="text-[var(--color-text-muted)] font-normal">({source.pct}%)</span></span>
                                                </div>
                                                {/* Visual mini progress bar for source ratio */}
                                                <div className="h-1 w-full bg-[var(--color-border-light)] rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500" 
                                                        style={{ 
                                                            backgroundColor: source.color, 
                                                            width: `${source.pct}%` 
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Second Row: Detailed sources breakdown and Top Flow metrics */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Campaign List - Rebuilt to Top Consultants style */}
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col min-h-[340px] h-[340px] p-5">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                                        <Mail size={18} color="var(--color-primary)" /> Hiệu suất Chiến dịch
                                    </h3>
                                    <span
                                        onClick={() => navigate('/campaigns')}
                                        className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                                    >
                                        Xem tất cả
                                    </span>
                                </div>
                                <div className="scrollbar-none" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'flex-start', overflowY: 'auto', maxHeight: 260 }}>
                                    {!statsData.top_campaigns || statsData.top_campaigns.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Chưa có dữ liệu chiến dịch gửi</div>
                                    ) : (
                                        statsData.top_campaigns.map((camp: any, idx: number) => {
                                            const sent = camp.stat_total_sent || 0;
                                            const opened = camp.stat_total_opened || 0;
                                            const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                                            
                                            const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];
                                            const barColor = colors[idx % colors.length];

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => navigate('/campaigns')}
                                                    style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600, alignItems: 'center' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: 16 }}>#{idx + 1}</span>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black uppercase tracking-tighter shadow-sm ${getAvatarColor(camp.sender_name || camp.sender_email || camp.name)}`}>
                                                                {getInitials(camp.sender_name || camp.sender_email || camp.name)}
                                                            </div>
                                                            <span className="truncate text-slate-800 dark:text-slate-200" style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                                <span className="truncate">{camp.name}</span>
                                                                <BarChart2 size={14} style={{ opacity: 0.35, color: 'var(--color-primary)' }} />
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 font-bold text-[13px]" style={{ color: 'var(--color-text)' }}>
                                                            {sent.toLocaleString()} gửi <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({openRate}% Open)</span>
                                                        </span>
                                                    </div>
                                                    <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 4, overflow: 'hidden', marginLeft: 48 }}>
                                                        <div style={{ width: `${Math.max(openRate, 2)}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Top Active Automation Flows (Rebuilt to Round Allocation style) */}
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-xl)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col min-h-[340px] h-[340px] p-5">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                                        <GitBranch size={18} color="#3b82f6" /> Hiệu suất Kịch bản Automation
                                    </h3>
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-[var(--color-success-light)] text-[var(--color-success)] px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse select-none">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"></span>
                                        Đang chạy
                                    </span>
                                </div>
                                <div className="scrollbar-none" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'flex-start', overflowY: 'auto', maxHeight: 260 }}>
                                    {!statsData.top_flows || statsData.top_flows.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Chưa có kịch bản đang chạy</div>
                                    ) : (
                                        statsData.top_flows.map((flow: any, idx: number) => {
                                            const completionRate = flow.stat_enrolled > 0 ? Math.round(((flow.stat_completed || 0) / flow.stat_enrolled) * 100) : 0;
                                            
                                            const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
                                            const dotColor = colors[idx % colors.length];

                                            return (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div className="truncate text-slate-800 dark:text-slate-200" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{flow.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Hoàn thành: {completionRate}%</div>
                                                    </div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 850, color: 'var(--color-text)' }} className="shrink-0 font-mono">
                                                        {flow.stat_enrolled?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">user</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Middle Section: Recent Access */}
            {recentModules.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Truy cập gần đây</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
                        {recentModules.map(module => (
                            <button
                                key={module.id}
                                onClick={() => handleModuleClick(module)}
                                className="group relative flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-lg hover:shadow-violet-500/5 hover:border-violet-300/80 dark:hover:border-violet-800/80 hover:-translate-y-0.5 transition-all duration-300 text-left"
                            >
                                <div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: module.color }}
                                >
                                    {module.id === 'zalo-oa' ? (
                                        <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} className="w-6 h-6 object-contain brightness-0 invert opacity-95" alt="Zalo" />
                                    ) : module.id === 'meta-api' ? (
                                        <Facebook className="w-6 h-6 text-white" />
                                    ) : (
                                        <module.icon className="w-6 h-6" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{module.title}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">{module.sub}</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
                                    <ArrowRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Section: Grouped Modules Grid */}
            <div className="space-y-12">
                {[
                    {
                        title: 'Automation & Campaigns',
                        desc: 'Thiết lập kịch bản chăm sóc khách hàng tự động và các chiến dịch gửi thư hàng loạt',
                        ids: ['campaigns', 'flows', 'templates']
                    },
                    {
                        title: 'Trí tuệ nhân tạo AI & Báo cáo',
                        desc: 'Huấn luyện AI thông minh hỗ trợ khách hàng và đo lường hiệu suất hoạt động',
                        ids: ['ai-training', 'ai-space', 'reports']
                    },
                    {
                        title: 'Chăm sóc & Tương tác khách hàng',
                        desc: 'Tăng sự gắn kết với Voucher ưu đãi, biểu mẫu Khảo sát và QR rút gọn tracking',
                        ids: ['vouchers', 'surveys', 'links-qr']
                    },
                    {
                        title: 'Kênh tích hợp & Dữ liệu hệ thống',
                        desc: 'Kết nối Zalo OA, Facebook Messenger, quản lý tệp đối tượng và Web tracking',
                        ids: ['zalo-oa', 'meta-api', 'web-tracking', 'audience', 'api-triggers', 'settings']
                    }
                ].map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-5">
                        <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${
                                groupIdx === 0 ? 'from-violet-500 to-indigo-500' :
                                groupIdx === 1 ? 'from-rose-500 to-red-500' :
                                groupIdx === 2 ? 'from-pink-500 to-rose-500' :
                                'from-cyan-500 to-blue-500'
                            }`} />
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">{group.title}</h3>
                                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{group.desc}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-grid">
                            {ALL_MODULES.filter(m => group.ids.includes(m.id)).map(module => (
                                <div
                                    key={module.id}
                                    onClick={() => handleModuleClick(module)}
                                    className="group relative h-full bg-white dark:bg-slate-900 rounded-[20px] p-5 border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow-[0_20px_50px_rgba(104,61,242,0.05)] hover:border-violet-300/60 dark:hover:border-violet-850/40 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                                >
                                    {/* Decorative background logo */}
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300">
                                        {module.id === 'zalo-oa' ? (
                                            <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} className="w-24 h-24 transform rotate-12 transition-transform duration-700 group-hover:scale-110 object-contain brightness-0 invert" alt="Zalo" />
                                        ) : module.id === 'meta-api' ? (
                                            <Facebook className="w-24 h-24 transform rotate-12 transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <module.icon className="w-24 h-24 transform rotate-12 transition-transform duration-700 group-hover:scale-110" />
                                        )}
                                    </div>

                                    <div className="relative z-10 flex-1 flex flex-col">
                                        <div 
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
                                            style={{ background: module.color }}
                                        >
                                            {module.id === 'zalo-oa' ? (
                                                <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} className="w-8 h-8 object-contain brightness-0 invert opacity-95" alt="Zalo" />
                                            ) : module.id === 'meta-api' ? (
                                                <Facebook className="w-7 h-7 text-white" />
                                            ) : (
                                                <module.icon className="w-7 h-7" />
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">{module.title}</h3>
                                                {['ai-training', 'ai-space', 'zalo-oa', 'meta-api', 'vouchers', 'api-triggers', 'surveys'].includes(module.id) && (
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                                        module.id === 'ai-training' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        module.id === 'ai-space' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        module.id === 'vouchers' ? 'bg-violet-50 text-violet-600 border-violet-100/50' :
                                                        module.id === 'api-triggers' ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' :
                                                        module.id === 'surveys' ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100/50' : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                        {module.id === 'ai-training' ? 'A.I Core' : module.id === 'ai-space' ? 'A.I Hub' : module.id === 'vouchers' ? 'New' : module.id === 'api-triggers' ? 'Dev' : 'Hot'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 leading-relaxed line-clamp-3">
                                                {module.sub}
                                            </p>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between pt-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {module.tags?.map(tag => (
                                                    <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-full">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 dark:group-hover:bg-violet-950/30 dark:group-hover:text-violet-400 transition-all duration-300 shadow-sm">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>



            <SystemOverviewModal isOpen={isOverviewOpen} onClose={() => setIsOverviewOpen(false)} />
        </div>
    );
};

export default Dashboard;


