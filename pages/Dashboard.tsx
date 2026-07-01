import { EXTERNAL_ASSET_BASE } from '@/utils/config';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Star, Sparkles, LayoutDashboard, Activity, Mail, Zap, FileText, Bot, Globe, Users, BarChart3, Settings, Clock, ArrowRight, MessageSquare, Facebook, Share2, Ticket, Webhook, Code2, Link, Play, Target, ClipboardList, QrCode
} from 'lucide-react';
import PageHero from '../components/common/PageHero';
import { useAuth } from '../components/contexts/AuthContext';
import { SystemOverviewModal } from '../components/common/SystemOverviewModal';
import { SystemConnectionsModal } from '../components/common/SystemConnectionsModal';
import { LeadscoreSetupModal } from '../components/settings/LeadscoreSetupModal';


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
        id: 'reports',
        title: 'Analytics',
        sub: 'Phân tích hiệu suất chi tiết theo từng chiến dịch. Theo dõi tỷ lệ chuyển đổi và tăng trưởng Khách hàng.',
        icon: BarChart3,
        color: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
        path: '/reports'
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


const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { dbNeedsMigration } = useAuth();
    const [recentIds, setRecentIds] = useState<string[]>([]);
    const [userName, setUserName] = useState('Bạn');
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
    const [isLeadscoreOpen, setIsLeadscoreOpen] = useState(false);

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
                    { label: 'CẤU HÌNH LEADSCORE', icon: Target, onClick: () => setIsLeadscoreOpen(true), primary: false },
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
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Cơ sở dữ liệu cần cập nhật ⚙️</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Hệ thống đã được nâng cấp nhưng cấu trúc cơ sở dữ liệu hiện tại chưa đồng bộ với phiên bản mới (phiên bản target: 35).</p>
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


