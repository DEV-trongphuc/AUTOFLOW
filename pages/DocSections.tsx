import * as React from 'react';
import {
    Send, Users, FileEdit, BarChart3, GitMerge, Tag, Webhook, Zap, Bot,
    Facebook, Globe, Settings, ChevronRight, Search, MousePointer,
    Smartphone, Mail, MessageSquare, Cpu, Layers, Target, ShieldCheck,
    BarChart, Filter, Play, Clock, Monitor, Activity,
    MailOpen, ArrowRight, HelpCircle, Database, GitBranch, Rocket,
    Code, Key, Bell, Lock, UserCheck, Map, TrendingUp, Eye, Repeat,
    Package, RefreshCw, CheckCircle, XCircle, Sliders, Globe2, Server,
    BookOpen, Image, FileText, Link2, Share2, Columns, AlignLeft
} from 'lucide-react';

/* ─── SHARED helpers ───────────────────────────────── */
const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${color}`}>{children}</span>
);
const SectionHeader = ({ label, title, accent, desc }: { label: string; title: React.ReactNode; accent?: string; desc?: string }) => (
    <div className="max-w-4xl mb-14">
        <p className="text-[11px] font-black text-amber-600 uppercase tracking-[0.4em] mb-3">{label}</p>
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-5">{title}</h2>
        {desc && <p className="text-lg text-slate-500 leading-relaxed">{desc}</p>}
    </div>
);
const CodeBlock = ({ code, lang = 'js' }: { code: string; lang?: string }) => (
    <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{lang}</span>
            <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500/60" /><div className="w-2 h-2 rounded-full bg-amber-600/60" /><div className="w-2 h-2 rounded-full bg-emerald-500/60" /></div>
        </div>
        <pre className="p-5 text-[12px] text-emerald-400 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
);
const FeatureRow = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
    <div className="flex items-start gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-amber-200 transition-all">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><Icon className="w-5 h-5" /></div>
        <div><p className="font-black text-slate-900 text-sm">{title}</p><p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p></div>
    </div>
);
const StatCard = ({ val, label, icon: Icon, color }: any) => (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center hover:bg-white/[0.08] transition-all">
        <Icon className={`w-6 h-6 mx-auto mb-3 ${color}`} />
        <div className="text-2xl font-black text-white">{val}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
);

/* ─── SECTION 1: OVERVIEW ───────────────────────────── */
export const SectionOverview = () => (
    <div className="space-y-20 animate-in fade-in duration-700">
        {/* Hero */}
        <div className="relative rounded-[40px] overflow-hidden bg-slate-950 p-10 lg:p-20 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-amber-400/10 to-transparent blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
                <div className="lg:col-span-3 space-y-8">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Autoflow Platform Docs v3.0</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.95]">
                        Tự động hóa<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Tăng trưởng</span>
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">Nền tảng duy nhất kết hợp <span className="text-white font-bold">Customer Data CDP</span>, <span className="text-white font-bold">Marketing Automation</span>, <span className="text-white font-bold">AI Chatbot</span> và <span className="text-white font-bold">Omnichannel</span> trên một dashboard duy nhất.</p>
                    <div className="flex flex-wrap gap-4">
                        <button className="px-8 py-4 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 font-black rounded-2xl shadow-2xl shadow-amber-600/30 hover:-translate-y-1 transition-all">Bắt đầu ngay</button>
                        <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 flex items-center gap-3 transition-all"><Play className="w-5 h-5 fill-current" />Xem Demo</button>
                    </div>
                </div>
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {[
                        { label: 'Active Flows', val: '124+', icon: GitMerge, color: 'text-amber-400' },
                        { label: 'AI Responses/day', val: '85k', icon: Bot, color: 'text-emerald-400' },
                        { label: 'Tracking Events', val: '2.4M', icon: Activity, color: 'text-blue-400' },
                        { label: 'Avg. Conversion', val: '18.2%', icon: Target, color: 'text-rose-400' },
                    ].map((s, i) => <StatCard key={i} {...s} />)}
                </div>
            </div>
        </div>

        {/* Core Modules */}
        <div className="space-y-10">
            <div className="text-center">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-[0.4em] mb-3">Core Capabilities</p>
                <h2 className="text-4xl font-black text-slate-900">Hệ sinh thái <span className="text-amber-600">toàn diện</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { title: 'Unified CDP', desc: 'Hợp nhất dữ liệu Khách hàng từ Web, Zalo, Facebook, Offline vào một hồ sơ 360°.', icon: Users, gradient: 'from-amber-400 to-amber-600' },
                    { title: 'Omnichannel Automation', desc: 'Kịch bản chăm sóc tự động qua Email, ZNS, Messenger theo hành vi Thời gian thực.', icon: GitMerge, gradient: 'from-blue-500 to-indigo-600' },
                    { title: 'Enterprise AI Training', desc: 'Huấn luyện AI RAG với catalogue, FAQ, URL website để chốt đơn 24/7.', icon: Bot, gradient: 'from-emerald-500 to-teal-600' },
                    { title: 'Website Tracking', desc: 'SDK nhúng vào website để ghi nhận mọi hành vi visitor, merge vào profile CDP.', icon: Globe, gradient: 'from-violet-500 to-purple-600' },
                    { title: 'Visual Flow Builder', desc: 'Drag-drop node-based editor: Trigger → Condition → Action → Wait không giới hạn.', icon: GitBranch, gradient: 'from-rose-500 to-pink-600' },
                    { title: 'AI Chat Space', desc: 'Multi-chatbot platform với phân quyền tổ chức, custom domain, widget nhúng web.', icon: MessageSquare, gradient: 'from-slate-600 to-slate-800' },
                ].map((item, i) => (
                    <div key={i} className="group p-10 rounded-[40px] border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
                        <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-8 shadow-xl group-hover:rotate-[10deg] transition-transform duration-500`}>
                            <item.icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Onboarding Steps */}
        <div className="space-y-10">
            <div className="text-center">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-[0.4em] mb-3">Onboarding Journey</p>
                <h2 className="text-4xl font-black text-slate-900">Triển khai trong <span className="text-amber-600">3 bước</span></h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                {[
                    { step: '01', title: 'Nhập dữ liệu CDP', desc: 'Import Excel, kết nối Facebook Ads, cài Tracking SDK — AI nhận diện hành vi ngay lập tức.', icon: Database, color: 'bg-indigo-500' },
                    { step: '02', title: 'Thiết kế Flow', desc: 'Vẽ hành trình Khách hàng bằng Flow Builder. Aura AI viết nội dung cá nhân hóa từng bước.', icon: GitBranch, color: 'bg-amber-600' },
                    { step: '03', title: 'Kích hoạt & Đo lường', desc: 'Bật AI Chatbot 24/7, theo dõi Heatmap & ROAS Thời gian thực, tối ưu liên tục.', icon: Rocket, color: 'bg-emerald-500' },
                ].map((item, i) => (
                    <div key={i} className="relative flex flex-col items-center text-center p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-xl transition-all group">
                        <div className={`relative w-20 h-20 rounded-[28px] ${item.color} flex items-center justify-center text-white mb-8 shadow-xl`}>
                            <span className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs border-4 border-white">{item.step}</span>
                            <item.icon className="w-10 h-10" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 mb-3">{item.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Integration badges */}
        <div className="bg-slate-50 rounded-[40px] p-12 border border-slate-100 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-8">Kết nối mọi nền tảng</h2>
            <div className="flex flex-wrap justify-center gap-6 lg:gap-10">
                {['Zalo OA', 'Facebook', 'Messenger', 'Gmail', 'Outlook', 'Shopify', 'WooCommerce', 'Lark Base', 'Next.js SDK'].map((b, i) => (
                    <span key={i} className="text-sm font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors cursor-default">{b}</span>
                ))}
            </div>
        </div>
    </div>
);

/* ─── SECTION 2: CAMPAIGNS ──────────────────────────── */
export const SectionCampaigns = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Marketing" title={<>Chiến dịch Marketing <span className="text-amber-600">Đẳng cấp</span></>} desc="Gửi Email & ZNS quy mô lớn với targeting chính xác, A/B Testing AI và đo lường sâu." />
        <div className="grid lg:grid-cols-2 gap-10">
            {/* Flow */}
            <div className="space-y-6">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3"><Target className="w-5 h-5 text-amber-600" />Luồng tạo Chiến dịch</h3>
                    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {['Lọc Phân khúc "Khách mua trên 2tr" (CDP)', 'Thiết kế Email "Black Friday Private Sale"', 'A/B Test Tiêu đề: "Ưu đãi riêng cho bạn" vs "Giảm 50%"', 'Gửi theo múi giờ cá nhân (Smart Scheduling)', 'Tự động gửi ZNS nhắc nhở nếu chưa Open Email'].map((s, i) => (
                            <div key={i} className="flex gap-5 relative z-10">
                                <div className="w-5 h-5 rounded-full bg-amber-600 border-4 border-white shadow shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-slate-800">{s}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="font-black text-slate-900 mb-5">Khả năng thực tế</h3>
                    <div className="space-y-3">
                        {[
                            { icon: Repeat, t: 'Abandoned Cart Recovery', d: 'Tự động gửi email nhắc giỏ hàng khi khách rời web > 30p.' },
                            { icon: GitBranch, t: 'Post-purchase Upsell', d: 'Gợi ý sản phẩm liên quan ngay sau khi khách hoàn tất đơn hàng.' },
                            { icon: Map, t: 'Store Visit Attribution', d: 'Ghi nhận khách click email sau đó đến mua tại cửa hàng vật lý.' },
                        ].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                    </div>
                </div>
            </div>
            {/* A/B + Schedule */}
            <div className="space-y-6">
                <div className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-3xl" />
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-black text-amber-600 uppercase tracking-widest text-xs">Live A/B Testing</h4>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] font-black uppercase">Phase 1</span></div>
                    </div>
                    {[{ v: 'A (Chủ đề: SALE 50%)', r: '24.2%', c: 'bg-indigo-500', tc: 'text-indigo-400', w: false }, { v: 'B (Chủ đề: Quà tặng riêng)', r: '38.9%', c: 'bg-amber-600', tc: 'text-amber-400', w: true }].map((ab, i) => (
                        <div key={i} className={`p-5 bg-white/5 border ${ab.w ? 'border-amber-600/30' : 'border-white/10'} rounded-2xl mb-4 relative`}>
                            {ab.w && <div className="absolute -top-2 -right-2 bg-amber-600 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded uppercase">Winner</div>}
                            <div className="flex justify-between mb-3"><span className={`text-[10px] font-black uppercase ${ab.tc}`}>{ab.v}</span><span className={`text-lg font-black ${ab.w ? 'text-amber-400' : ''}`}>{ab.r} Mở</span></div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${ab.c}`} style={{ width: ab.r }} /></div>
                        </div>
                    ))}
                    <p className="text-[10px] text-slate-500 italic mt-4">Hệ thống tự động chuyển 90% contacts còn lại sang Version B (Winner) sau 2h test.</p>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500"><Clock className="w-6 h-6" /></div>
                        <div><h4 className="font-black text-slate-900">Smart Scheduling</h4><p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tối ưu giờ vàng</p></div>
                    </div>
                    <div className="h-28 flex items-end gap-1 mb-4">
                        {[30, 45, 20, 15, 60, 100, 85, 40, 25, 50, 70, 40].map((h, i) => (
                            <div key={i} className="flex-1 relative" style={{ height: `${h}%` }}>
                                <div className={`absolute inset-0 rounded-t ${h === 100 ? 'bg-amber-600' : 'bg-slate-100'}`} />
                                {h === 100 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-amber-600">20h</span>}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">Khung giờ <span className="font-black text-slate-900">20:00–21:30</span> có tỷ lệ mở cao nhất dựa trên dữ liệu 30 ngày.</p>
                </div>
            </div>
        </div>
        {/* Advanced features table */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
            <h3 className="font-black text-slate-900 mb-6 text-lg">Tính năng nâng cao</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {['Multi-channel send (Email + ZNS bộ đôi)', 'Suppression list tự động', 'Custom UTM per recipient', 'Bounce / Spam trap filter', 'DKIM / SPF / DMARC validated', 'Rate limiting per SMTP', 'Dynamic content theo Tag', 'Report export CSV/PDF'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">{f}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* ─── SECTION 3: AUTOMATION FLOWS ───────────────────── */
export const SectionAutomation = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Automation" title={<>Kịch bản Tự động <span className="text-amber-600">Thông minh</span></>} desc="Visual Flow Builder drag-and-drop: thiết kế hành trình Khách hàng không giới hạn." />
        <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
                <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Zap className="w-5 h-5 text-amber-600" />Loại Triggers</h3>
                    <div className="space-y-3">
                        {[
                            { icon: Globe, t: 'Website Behavior', d: 'Xem sản phẩm >3 lần, rời giỏ hàng, Thời gian trên trang.' },
                            { icon: Tag, t: 'Tag Changed', d: 'Khi khách được gắn / gỡ nhãn "Hot-Lead", "VIP"...' },
                            { icon: MessageSquare, t: 'AI Chatbot Intent', d: 'Khi AI nhận ra intent hỏi giá, muốn đặt hàng...' },
                            { icon: Webhook, t: 'API / Webhook', d: 'Dữ liệu từ POS, CRM, hoặc bất kỳ hệ thống ngoài.' },
                            { icon: Mail, t: 'Campaign Interaction', d: 'Sau khi mở email, click link, hoặc không mở sau Xh.' },
                            { icon: Clock, t: 'Time-based', d: 'Sinh nhật, ngày kỷ niệm, N ngày sau mua hàng.' },
                        ].map((t, i) => <FeatureRow key={i} icon={t.icon} title={t.t} desc={t.d} />)}
                    </div>
                </div>
                <div className="p-8 bg-slate-900 rounded-3xl text-white">
                    <h4 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-4">Loại Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {['Send Email', 'Send ZNS', 'Send Messenger', 'Add/Remove Tag', 'Update Contact Field', 'Wait (Delay)', 'Condition Split', 'Webhook Call', 'AI Response', 'Score Lead'].map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />{a}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Live preview */}
            <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-xl relative">
                <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">LUỒNG GIỎ HÀNG BỎ RƠI</div>
                <h4 className="font-black text-slate-900 mb-8">Kịch bản thực tế </h4>
                <div className="space-y-1 flex flex-col items-center">
                    {/* Trigger */}
                    <div className="w-full max-w-xs bg-slate-900 text-white rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0"><MousePointer className="w-5 h-5" /></div>
                        <div><p className="text-[8px] uppercase font-bold tracking-widest text-slate-400">Trigger: Custom Event</p><p className="text-xs font-black">{"Khách rời giỏ hàng > 30p"}</p></div>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    {/* Action */}
                    <div className="w-full max-w-xs bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center shrink-0"><Mail className="w-5 h-5" /></div>
                        <div><p className="text-[8px] font-black uppercase tracking-widest text-blue-500">Action: Email</p><p className="text-xs font-bold text-slate-800">Nhắc nhở: "Giỏ hàng còn chờ bạn"</p></div>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    {/* Wait */}
                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-full px-5 py-2.5 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                        <span className="text-xs font-black text-slate-900">Wait Until: "Checkout Success" (Max 2 days)</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    {/* Condition */}
                    <div className="w-full max-w-xs bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-1 bg-slate-50 flex gap-1"><div className="h-1 flex-1 rounded-full bg-emerald-400" /><div className="h-1 flex-1 rounded-full bg-rose-400" /></div>
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white"><UserCheck className="w-4 h-4" /></div><span className="text-[10px] font-black text-slate-800">Đã chốt đơn?</span></div>
                            <div className="flex gap-2"><div className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black text-center border border-emerald-100">YES → Tự dừng</div><div className="flex-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black text-center border border-amber-100">NO → Gửi mã Voucher 10%</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
            <h3 className="font-black text-slate-900 mb-6">Tính năng Flow nâng cao</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {['Goal Tracking tự dừng flow khi đạt mục tiêu', 'A/B Test trong Flow (path split %)', 'Frequency cap: max 1 email/3 ngày', 'Re-entry control (lần N)', 'Flow Analytics per-step conversion', 'Wait until (Chờ cho đến khi Click/Open/Event)', 'Exit conditions: Tự dừng khi mua hàng', 'Timezone-based sending logic'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-700">{f}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* New Feature: Wait Until Mockup */}
        <div className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 blur-2xl" />
            <h3 className="text-lg font-black text-amber-600 mb-6 flex items-center gap-2"><Clock className="w-5 h-5" /> Chế độ "Wait Until" Thông minh</h3>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Thay vì chỉ chờ X ngày cố định, bạn có thể thiết lập flow chờ cho đến khi Khách hàng thực hiện hành động cụ thể.</p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Cấu hình Wait</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold"><span>Event:</span> <span className="text-emerald-400">Add to Cart</span></div>
                            <div className="flex justify-between text-xs font-bold"><span>Max timeout:</span> <span className="text-amber-400">48 giờ</span></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                    <Activity className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-xs font-black">AI sẽ tự động kích hoạt bước tiếp theo ngay khi nhận được tín hiệu Tracking từ Website.</p>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 4: EMAIL BUILDER ──────────────────────── */
export const SectionEmailBuilder = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Email Builder" title={<>Drag & Drop <span className="text-amber-600">Sáng tạo</span></>} desc="Builder thế hệ mới — WYSIWYG, responsive 100%, tích hợp Aura AI viết nội dung." />
        <div className="grid lg:grid-cols-3 gap-10">
            {/* Mock builder */}
            <div className="lg:col-span-2 relative rounded-3xl bg-slate-50 border-2 border-slate-200 overflow-hidden min-h-[480px]">
                <div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /></div>
                    <div className="ml-4 h-6 px-3 bg-slate-100 rounded text-[10px] text-slate-400 flex items-center font-bold">Welcome_Campaign.mail</div>
                </div>
                <div className="absolute top-10 left-0 bottom-0 w-14 bg-white border-r border-slate-100 flex flex-col items-center py-4 gap-4">
                    {[AlignLeft, Image, Columns, Link2, Sliders].map((Icon, i) => (
                        <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${i === 0 ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100'}`}><Icon className="w-4 h-4" /></div>
                    ))}
                </div>
                <div className="mt-10 ml-14 flex justify-center p-6">
                    <div className="w-full max-w-sm bg-white shadow border border-slate-100 rounded-2xl p-8 space-y-5">
                        <div className="h-10 w-28 bg-amber-100 rounded-xl mx-auto" />
                        <div className="space-y-2"><div className="h-3.5 w-full bg-slate-50 rounded-full" /><div className="h-3.5 w-5/6 bg-slate-50 rounded-full mx-auto" /><div className="h-3.5 w-4/6 bg-slate-50 rounded-full mx-auto" /></div>
                        <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50 flex items-center justify-center"><Bot className="w-10 h-10 text-amber-200" /></div>
                        <div className="h-11 w-full bg-amber-600 rounded-xl shadow shadow-amber-300" />
                    </div>
                </div>
            </div>
            {/* Features */}
            <div className="space-y-4">
                {[
                    { icon: Layers, t: 'Block Library', d: 'Text, Image, Button, Video, Countdown Timer, Social Links, Dynamic Field.' },
                    { icon: Smartphone, t: 'Responsive Preview', d: 'Real-time preview trên Mobile, Tablet, Desktop. Tự động tối ưu font-size.' },
                    { icon: Bot, t: 'Aura AI Copilot', d: 'Nhập brief → AI viết subject, preheader & toàn bộ nội dung email theo brand tone.' },
                    { icon: Code, t: 'HTML Source Edit', d: 'Toggle sang raw HTML editor bất kỳ lúc nào, sync 2 chiều với builder.' },
                ].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                <div className="p-6 bg-slate-900 rounded-2xl text-white">
                    <h5 className="font-black text-amber-600 uppercase tracking-widest text-[10px] mb-3">Compatibility</h5>
                    <p className="text-sm text-slate-300 leading-relaxed">Đã test trên Gmail, Outlook 2016–365, Apple Mail, Yahoo Mail và 40+ email clients khác.</p>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 5: TEMPLATES ──────────────────────────── */
export const SectionTemplates = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Templates" title={<>Template <span className="text-amber-600">Chuyên nghiệp</span></>} desc="Thư viện hàng trăm mẫu email được thiết kế bởi chuyên gia, sẵn dùng ngay." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { name: 'Welcome Series', cat: 'Onboarding', color: 'from-blue-100 to-indigo-50' },
                { name: 'Cart Recovery', cat: 'E-commerce', color: 'from-rose-100 to-pink-50' },
                { name: 'Product Launch', cat: 'Announcement', color: 'from-amber-100 to-orange-50' },
                { name: 'Monthly Newsletter', cat: 'Newsletter', color: 'from-emerald-100 to-teal-50' },
                { name: 'Re-engagement', cat: 'Retention', color: 'from-violet-100 to-purple-50' },
                { name: 'Flash Sale', cat: 'Promotion', color: 'from-red-100 to-rose-50' },
                { name: 'Webinar Invite', cat: 'Event', color: 'from-cyan-100 to-sky-50' },
                { name: 'Feedback Survey', cat: 'Post-purchase', color: 'from-lime-100 to-green-50' },
            ].map((t, i) => (
                <div key={i} className="group rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
                    <div className={`h-28 bg-gradient-to-br ${t.color} flex items-center justify-center`}><Mail className="w-10 h-10 text-slate-300" /></div>
                    <div className="p-4"><p className="font-black text-slate-900 text-sm">{t.name}</p><Badge color="bg-amber-50 text-amber-600">{t.cat}</Badge></div>
                </div>
            ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-900 rounded-3xl text-white">
                <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-5">Template Variables</h3>
                <CodeBlock lang="Liquid" code={`{{ contact.first_name }},
{{ contact.last_purchase_date | date: "%d/%m/%Y" }},
{% if contact.tags contains "VIP" %}
  {{ vip_offer }}
{% else %}
  {{ standard_offer }}
{% endif %}`} />
            </div>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                <h3 className="font-black text-slate-900 mb-5">Quản lý Template</h3>
                <div className="space-y-3">
                    {[{ icon: Share2, t: 'Workspace Shared', d: 'Template chia sẻ toàn bộ team trong workspace.' }, { icon: Lock, t: 'Private Template', d: 'Chỉ owner mới xem và chỉnh sửa.' }, { icon: Globe, t: 'Global Library', d: 'System templates của Autoflow — không thể xóa.' }].map((f, i) => <FeatureRow key={i} {...{ icon: f.icon, title: f.t, desc: f.d }} />)}
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 6: AUDIENCE / CDP ────────────────────── */
export const SectionAudience = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Customer Data Platform" title={<>Quản lý <span className="text-amber-600">Khách hàng 360°</span></>} desc="CDP hợp nhất dữ liệu từ mọi điểm chạm — website, store, ads, social — vào một hồ sơ duy nhất." />
        {/* Contact table mock */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/20"><Users className="w-5 h-5" /></div><h4 className="font-black text-slate-900">Contacts CDP</h4></div>
                <div className="flex gap-2"><Badge color="bg-white border border-slate-200 text-slate-500">Total: 12,482</Badge><Badge color="bg-amber-50 text-amber-600 border border-amber-100">New: +124</Badge></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/30">
                        {['Khách hàng', 'Nguồn', 'Tags', 'Lead Score', 'Tình trạng'].map(h => <th key={h} className="px-6 py-4">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {[
                            { name: 'Trần Minh Nam', email: 'nam.tran@gmail.com', src: 'Facebook Ads', tags: ['Hot Lead', 'VIP'], score: 92, status: 'Active' },
                            { name: 'Nguyễn Thu Thủy', email: 'thuy.nguyen@me.com', src: 'Website Widget', tags: ['New Customer'], score: 45, status: 'Pending' },
                            { name: 'Lê Văn Tám', email: 'tam.le@vn-express.net', src: 'Store POS', tags: ['Churn Risk'], score: 12, status: 'At Risk' },
                        ].map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">{row.name.charAt(0)}</div><div><p className="text-xs font-black text-slate-800">{row.name}</p><p className="text-[10px] text-slate-400">{row.email}</p></div></div></td>
                                <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{row.src}</td>
                                <td className="px-6 py-4"><div className="flex gap-1">{row.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase">{t}</span>)}</div></td>
                                <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.score > 70 ? 'bg-emerald-500' : row.score > 30 ? 'bg-amber-600' : 'bg-rose-500'}`} style={{ width: `${row.score}%` }} /></div><span className="text-xs font-black text-slate-700">{row.score}</span></div></td>
                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : row.status === 'Pending' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{row.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                <h3 className="font-black text-slate-900 mb-5 flex items-center gap-3"><Filter className="w-5 h-5 text-amber-600" />Segment Builder</h3>
                <div className="space-y-3">
                    {[{ icon: Database, t: 'Dynamic Segments', d: 'Filter theo bất kỳ trường dữ liệu: tag, field, hành vi, ngày.' }, { icon: TrendingUp, t: 'RFM Scoring', d: 'Tự động phân loại Recency, Frequency, Monetary.' }, { icon: RefreshCw, t: 'Auto-refresh', d: 'Segment cập nhật Thời gian thực khi contact thay đổi.' }].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                </div>
            </div>
            <div className="p-8 bg-slate-900 rounded-3xl text-white">
                <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-5">Import Nguồn dữ liệu</h3>
                <div className="space-y-3">
                    {['Excel / CSV upload (bounding 500k rows)', 'Facebook Lead Ads sync tự động', 'API POST /contacts/import', 'Zalo form sync', 'Website tracking merge by email/phone', 'Manual add one by one'].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-slate-300"><ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />{s}</div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 7: TAGS ───────────────────────────────── */
export const SectionTags = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Tags & Segmentation" title={<>Hệ thống <span className="text-amber-600">Phân loại</span></>} desc="Tỉ lệ hoạt + Auto-tagging rules để phân loại Khách hàng điền vào đúng flow." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3"><Tag className="w-5 h-5 text-amber-600" />Tags phổ biến</h3>
                    <div className="space-y-3">
                        {[{ name: 'Potential Lead', count: '1,452', color: 'bg-blue-500' }, { name: 'VIP Member', count: '243', color: 'bg-amber-600' }, { name: 'Cart Abandoned', count: '3,892', color: 'bg-rose-500' }, { name: 'Completed Course', count: '852', color: 'bg-emerald-500' }, { name: 'Whale Customer', count: '128', color: 'bg-violet-500' }].map((tag, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-300 transition-colors">
                                <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${tag.color} shadow`} /><span className="text-sm font-black text-slate-800">{tag.name}</span></div>
                                <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-200">{tag.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="font-black text-slate-900 mb-5">Lead Scoring</h3>
                    <div className="space-y-3">
                        {[{ ev: 'Mở Email', pts: '+5' }, { ev: 'Click link CTA', pts: '+10' }, { ev: 'Xem trang giá', pts: '+15' }, { ev: 'Hỏi AI chatbot', pts: '+20' }, { ev: 'Không mở 7 ngày', pts: '-10' }].map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-700">{s.ev}</span>
                                <span className={`text-xs font-black ${s.pts.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{s.pts} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-8 bg-slate-900 text-white rounded-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/10 rounded-full blur-3xl" />
                <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-8 relative z-10">Smart Auto-Tagging Rules</h3>
                <div className="space-y-5 relative z-10">
                    {[
                        { trigger: 'Xác nhận đơn hàng trong 7 ngày qua', tag: 'Ready-to-Upsell', color: 'emerald' },
                        { trigger: 'Tổng chi tiêu > 10,000,000 VNĐ', tag: 'Whale Customer', color: 'amber' },
                        { trigger: 'Không tương tác 60 ngày', tag: 'Churn Risk', color: 'rose' },
                        { trigger: 'Điểm Lead Score > 80', tag: 'Hot Lead', color: 'blue' },
                    ].map((r, i) => (
                        <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Nếu: <span className="text-white">{r.trigger}</span></p>
                            <div className="flex items-center gap-3 mt-3"><ArrowRight className={`w-4 h-4 text-${r.color}-400`} /><span className={`px-3 py-1 bg-${r.color}-500/10 text-${r.color}-400 border border-${r.color}-500/20 rounded-lg text-[10px] font-black uppercase`}>Gắn nhãn: {r.tag}</span></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 8: AI TRAINING ────────────────────────── */
export const SectionAITraining = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="AI Training — RAG Engine" title={<>Huấn luyện <span className="text-amber-600">Chuyên gia AI</span></>} desc="Upload kiến thức, AI học và trả lời chính xác 24/7 — thay bạn chốt đơn và chăm sóc Khách hàng." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-5 mb-8"><div className="w-14 h-14 rounded-3xl bg-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-600/20"><Cpu className="w-7 h-7" /></div><div><h3 className="text-xl font-black text-slate-900">Nguồn kiến thức</h3><p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">RAG Engine v2.4 (Active)</p></div></div>
                <div className="space-y-4">
                    {[
                        { icon: Globe, t: 'URL Crawl', d: 'Dán URL → AI tự crawl & học toàn bộ nội dung trang.' },
                        { icon: FileText, t: 'PDF / DOCX / TXT', d: 'Upload file quy trình, catalogue, chính sách bảo hành.' },
                        { icon: MessageSquare, t: 'Q&A Manual', d: 'Nhập câu hỏi - đáp chuẩn xác cho Tổng sốn phẩm.' },
                        { icon: Database, t: 'Product Database', d: 'Kết nối tồn kho, giá cả, thuộc tính qua API hoặc CSV.' },
                        { icon: Code, t: 'Custom API Source', d: 'Webhook nhận data từ hệ thống ERP/CRM nội bộ.' },
                    ].map((src, i) => (
                        <div key={i} className="group p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 cursor-pointer hover:bg-white hover:shadow-lg hover:border-amber-200 transition-all">
                            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm"><src.icon className="w-5 h-5" /></div>
                            <div className="flex-1"><p className="font-black text-slate-900">{src.t}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{src.d}</p></div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-slate-950 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/10 rounded-full blur-[80px]" />
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10"><Globe2 className="w-6 h-6 text-amber-600" />Multi-channel Connect</h3>
                    <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                        {[{ l: 'Zalo OA', c: 'text-blue-400 bg-blue-400/10' }, { l: 'Messenger', c: 'text-indigo-400 bg-indigo-400/10' }, { l: 'Website', c: 'text-emerald-400 bg-emerald-400/10' }].map((ch, i) => (
                            <div key={i} className="flex flex-col items-center gap-2"><div className={`w-14 h-14 rounded-2xl ${ch.c} flex items-center justify-center border border-white/10 hover:scale-110 transition-transform`}><MessageSquare className="w-6 h-6" /></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{ch.l}</span></div>
                        ))}
                    </div>
                    {/* Chat demo */}
                    <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-6 relative z-10">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-orange-400 to-amber-600" />
                        <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center"><Bot className="w-5 h-5 text-slate-950" strokeWidth={3} /></div><div><p className="text-white font-black text-sm">AI Training Center</p><p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">AURA GEN v2.4 · Live</p></div><div className="ml-auto px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full animate-pulse">Active</div></div>
                        <div className="space-y-3">
                            <div className="flex justify-end"><div className="bg-slate-800 text-white text-[11px] px-4 py-2.5 rounded-2xl rounded-tr-none font-medium max-w-[80%]">Shop có khuyến mãi gì không?</div></div>
                            <div className="flex gap-2"><div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-slate-900" /></div><div className="bg-amber-600 text-slate-900 text-[11px] px-4 py-2.5 rounded-2xl rounded-tl-none font-bold max-w-[80%]">Dạ có ạ! Mã "SPRING25" giảm 25% đơn từ 500k. Bạn xem thêm không ạ?</div></div>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="font-black text-slate-900 mb-5">Cài đặt AI nâng cao</h3>
                    <div className="space-y-3">
                        {[{ icon: Sliders, t: 'Temperature Control', d: 'Điều chỉnh mức sáng tạo từ nghiêm túc → thân thiện.' }, { icon: Lock, t: 'Topic Guardrails', d: 'Chặn AI trả lời ngoài phạm vi kiến thức đã train.' }, { icon: Bell, t: 'Human Handoff', d: 'Tự chuyển sang agent người khi confidence < 70%.' }].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
