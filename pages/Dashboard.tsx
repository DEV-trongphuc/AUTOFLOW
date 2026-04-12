import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Star, Sparkles, LayoutDashboard, Activity, Mail, Zap, FileText, Bot, Globe, Users, BarChart3, Settings, Clock, ArrowRight, MessageSquare, Facebook, Share2, Ticket
} from 'lucide-react';
import PageHero from '../components/common/PageHero';



interface Module {
    id: string;
    title: string;
    sub: string;
    icon: any;
    color: string;
    path: string;
    tags?: string[];
}

const ALL_MODULES: Module[] = [
    {
        id: 'campaigns',
        title: 'Campaigns',
        sub: 'Gửi kịch bản hàng loạt đa kênh Mail & Zalo ZNS. Tối ưu tỷ lệ mở với bộ lọc đối tượng thông minh.',
        icon: Mail,
        color: 'from-amber-400 to-orange-500',
        path: '/campaigns',
        tags: ['Marketing', 'Bulk']
    },
    {
        id: 'flows',
        title: 'Automation',
        sub: 'Tỉ lệ kịch bản dựa trên hành vi và sự kiện thực tế. Tự động hóa 100% quy trình CSKH đa kênh.',
        icon: Zap,
        color: 'from-blue-500 to-indigo-600',
        path: '/flows',
        tags: ['Trigger', 'Workflow']
    },
    {
        id: 'templates',
        title: 'Email Design',
        sub: 'Thư viện mẫu thiết kế chuyên nghiệp, kéo thả linh hoạt. Hỗ trợ đầy đủ các khối nội dung và biến cá nhân hóa.',
        icon: FileText,
        color: 'from-purple-500 to-pink-600',
        path: '/templates'
    },
    {
        id: 'ai-training',
        title: 'AI Training',
        sub: 'Huấn luyện bộ não AI theo dữ liệu riêng của doanh nghiệp. AI phản hồi Khách hàng chính xác theo ngữ cảnh.',
        icon: Bot,
        color: 'from-rose-500 to-red-600',
        path: '/ai-training',
        tags: ['AI', 'Smart']
    },
    {
        id: 'vouchers',
        title: 'Voucher Hub',
        sub: 'Quản lý tập trung toàn bộ mã ưu đãi, quà tặng. Tự động sinh mã ngẫu nhiên và theo dõi lượt sử dụng thời gian thực.',
        icon: Ticket,
        color: 'from-[#F59E0B] to-[#D97706]',
        path: '/vouchers',
        tags: ['Promo', 'Loyalty']
    },
    {
        id: 'zalo-oa',
        title: 'Zalo Connect',
        sub: 'Tích hợp Zalo Official Account. Gửi tin nhắn quan tâm, thông báo ZNS và quản lý hội thoại tập trung.',
        icon: MessageSquare,
        color: 'from-[#0068FF] to-[#00c6ff]',
        path: '/zalo-settings',
        tags: ['Zalo', 'ZNS']
    },
    {
        id: 'meta-api',
        title: 'Meta API',
        sub: 'Kết nối Facebook Messenger & Instagram. Tự động trả lời tin nhắn, đồng bộ dữ liệu và quản lý Ads hiệu quả.',
        icon: Facebook,
        color: 'from-[#0668E1] to-[#00f2fe]',
        path: '/meta-messenger',
        tags: ['Meta', 'Ads']
    },
    {
        id: 'web-tracking',
        title: 'Web Tracking',
        sub: 'Theo dõi chính xác từng click, scroll và hành vi Khách hàng trên website để phục vụ kịch bản Automation.',
        icon: Globe,
        color: 'from-cyan-500 to-blue-600',
        path: '/web-tracking'
    },
    {
        id: 'audience',
        title: 'Audiences',
        sub: 'Quản lý tập trung mọi điểm chạm. Phân loại đối tượng tự động dựa trên hành vi và lịch sử tương tác.',
        icon: Users,
        color: 'from-emerald-500 to-teal-600',
        path: '/audience'
    },
    {
        id: 'reports',
        title: 'Analytics',
        sub: 'Phân tích hiệu suất chi tiết theo từng chiến dịch. Theo dõi tỷ lệ chuyển đổi và tăng trưởng Khách hàng.',
        icon: BarChart3,
        color: 'from-slate-700 to-slate-900',
        path: '/reports'
    },
    {
        id: 'settings',
        title: 'Cấu hình',
        sub: 'Quản lý tài khoản, phân quyền thành viên và thiết lập các kết nối API ngoại vi cho hệ thống.',
        icon: Settings,
        color: 'from-slate-400 to-slate-600',
        path: '/settings'
    },
];


const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [recentIds, setRecentIds] = useState<string[]>([]);
    const [userName, setUserName] = useState('Bạn');

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
            } catch (e) { }
        }
    }, []);

    const handleModuleClick = (module: Module) => {
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
                title={<>Ready to Scale, {userName}! 🚀</>}
                subtitle={<>Hệ thống Automation đa thông điệp đã sẵn sàng. Tối ưu hóa trải nghiệm Khách hàng với sức mạnh từ <span className="underline decoration-white/40 underline-offset-4 font-black">Email, Zalo, Meta & AI.</span></>}
                showStatus={true}
                statusText="Multi-Channel Active"
                actions={[
                    { label: 'Kịch bản Automation', icon: Zap, onClick: () => navigate('/flows'), primary: true },
                    { label: 'AI TRAINING', icon: Bot, onClick: () => navigate('/ai-training') }
                ]}
            />

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
                                className="group relative flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <module.icon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-800 truncate">{module.title}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">{module.sub}</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-4 h-4 text-amber-600" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Section: All Modules Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tất cả tính năng</h2>
                    </div>
                    <div className="h-px flex-1 bg-slate-100 ml-6 hidden md:block" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 stagger-grid">
                    {ALL_MODULES.map(module => (
                        <div
                            key={module.id}
                            onClick={() => handleModuleClick(module)}
                            className="group relative h-full bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all cursor-pointer overflow-hidden flex flex-col"
                        >
                            {/* Decorative background logo */}
                            <div className="absolute top-0 right-0 p-4 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity">
                                {module.id === 'zalo-oa' ? (
                                    <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo-Arc.png" className="w-24 h-24 grayscale group-hover:grayscale-0 transition-all duration-700 object-contain" alt="Zalo" />
                                ) : module.id === 'meta-api' ? (
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-24 h-24 grayscale group-hover:grayscale-0 transition-all duration-700 object-contain" alt="Meta" />
                                ) : (
                                    <module.icon className="w-24 h-24 transform rotate-12 transition-transform duration-700 group-hover:scale-110" />
                                )}
                            </div>

                            <div className="relative z-10 flex-1 flex flex-col">
                                <div className={`w-14 h-14 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                                    {module.id === 'zalo-oa' ? (
                                        <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo-Arc.png" className="w-full h-full object-contain" alt="Zalo" />
                                    ) : module.id === 'meta-api' ? (
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-full h-full object-contain" alt="Meta" />
                                    ) : (
                                        <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center text-white shadow-lg`}>
                                            <module.icon className="w-7 h-7" />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">{module.title}</h3>
                                        {['ai-training', 'zalo-oa', 'meta-api', 'vouchers'].includes(module.id) && (
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${module.id === 'ai-training' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                module.id === 'vouchers' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                                }`}>
                                                {module.id === 'ai-training' ? 'A.I Core' : module.id === 'vouchers' ? 'New' : 'Hot'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 leading-relaxed line-clamp-3">
                                        {module.sub}
                                    </p>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {module.tags?.map(tag => (
                                            <span key={tag} className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-sm">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section: Quick Tip */}
            <div className="mt-16 p-8 rounded-[32px] bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-[60px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-bold mb-2">Sẵn sàng để bùng nổ? 🚀</h3>
                        <p className="text-slate-400 font-medium max-w-md">Sử dụng AI Training phối hợp với Automation Flows để tối ưu hóa tỷ lệ chuyển đổi Khách hàng gấp 3 lần.</p>
                    </div>
                    <button
                        onClick={() => navigate('/docs')}
                        className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all hover:scale-105 shadow-xl"
                    >
                        Khám phá hướng dẫn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;