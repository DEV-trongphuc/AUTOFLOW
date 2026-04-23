import * as React from 'react';
import {
    Send, Users, FileEdit, BarChart3, GitMerge, Tag, Webhook, Zap, Bot,
    Facebook, Globe, Settings, ChevronRight, MousePointer,
    Smartphone, Mail, MessageSquare, Cpu, Layers, Target, ShieldCheck,
    BarChart, Clock, Activity, MailOpen, ArrowRight, Database,
    Code, Key, Bell, Lock, UserCheck, Map, TrendingUp, Eye,
    Package, RefreshCw, CheckCircle, Sliders, Globe2, Server,
    BookOpen, Image, FileText, Link2, Share2, Terminal, Monitor,
    GitBranch, Rocket, Filter, Play, AlignLeft, Columns
} from 'lucide-react';

const Badge = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${color}`}>{children}</span>
);
const SectionHeader = ({ label, title, desc }: { label: string; title: React.ReactNode; desc?: string }) => (
    <div className="max-w-4xl mb-14">
        <p className="text-[11px] font-black text-amber-600 uppercase tracking-[0.4em] mb-3">{label}</p>
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-5">{title}</h2>
        {desc && <p className="text-lg text-slate-500 leading-relaxed">{desc}</p>}
    </div>
);
const CodeBlock = ({ code, lang = 'js' }: { code: string; lang?: string }) => (
    <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-white/5 border-b border-white/5">
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

/* ─── SECTION 9: AI CHAT SPACE ──────────────────────── */
export const SectionAIChat = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="AI Chat Space" title={<>Multi-Chatbot <span className="text-amber-600">Platform</span></>} desc="Quản lý nhiều chatbot AI trong một workspace, phân quyền tổ chức, widget nhúng web, slug tùy chỉnh." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Bot className="w-5 h-5 text-amber-600" />Cấu trúc AI Space</h3>
                    <div className="space-y-3">
                        {[
                            { icon: Globe, t: 'Category (Tổ chức)', d: 'Mỗi tổ chức có một AI Space riêng với custom domain & branding.' },
                            { icon: MessageSquare, t: 'Chatbot (agent)', d: 'Nhiều chatbot trong một tổ chức, mỗi bot có RAG riêng.' },
                            { icon: Users, t: 'Org User Management', d: 'Admin/Member/Viewer roles & permission per chatbot.' },
                            { icon: Link2, t: 'Custom Slug', d: 'URL thân thiện: /ai-space/ten-cong-ty/ten-chatbot.' },
                            { icon: Smartphone, t: 'Embedded Widget', d: 'Nhúng chatbot vào bất kỳ website bằng 3 dòng JavaScript.' },
                        ].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                    </div>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <h3 className="font-black text-slate-900 mb-5">Embed Widget Code</h3>
                    <CodeBlock lang="HTML" code={`<!-- Nhúng vào <body> của website -->
<script>
  window.AF_CONFIG = {
    categoryId: "your-org-slug",
    botId: "sales-bot",
    theme: "light", // dark | light
    position: "bottom-right"
  };
</script>
<script src="https://cdn.DOMATION.io/widget.js"
        async defer></script>`} />
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-slate-950 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/10 rounded-full blur-[80px]" />
                    <div className="relative z-10">
                        <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-6">AI Space — Live Preview</h3>
                        {/* Sidebar mock */}
                        <div className="flex rounded-2xl overflow-hidden border border-white/10 min-h-[320px]">
                            <div className="w-16 bg-white/5 flex flex-col items-center py-5 gap-4 border-r border-white/10">
                                <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
                                {[MessageSquare, Users, Settings].map((Icon, i) => <div key={i} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500"><Icon className="w-4 h-4" /></div>)}
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Bot · Online</span>
                                </div>
                                <div className="flex-1 p-4 space-y-3">
                                    <div className="flex justify-end"><div className="bg-slate-700 text-white text-[10px] px-3 py-2 rounded-xl rounded-tr-none max-w-[75%]">Sản phẩm nào phù hợp cho startup?</div></div>
                                    <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-slate-900" /></div><div className="bg-amber-600 text-slate-900 text-[10px] px-3 py-2 rounded-xl rounded-tl-none font-bold max-w-[75%]">Chào bạn! Gói Starter phù hợp nhất với startup — 3 flows, 5.000 contacts, AI chat không giới hạn.</div></div>
                                </div>
                                <div className="p-3 border-t border-white/10 flex gap-2">
                                    <div className="flex-1 bg-white/5 rounded-xl h-9 border border-white/10" />
                                    <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center"><Send className="w-4 h-4 text-slate-900" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Added Detail: Code Mode & File Context */}
            <div className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-2xl" />
                <h3 className="font-black text-emerald-400 uppercase tracking-widest text-[10px] mb-4">Advanced AI Collaboration</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shrink-0"><Terminal className="w-5 h-5" /></div>
                        <div><p className="text-xs font-black">Code Mode (Python/JS)</p><p className="text-[10px] text-slate-400">AI tự viết và thực thi code để tính toán ROAS, vẽ biểu đồ tăng trưởng doanh thu ngay trong chat.</p></div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                        <div><p className="text-xs font-black">Knowledge Training (RAG)</p><p className="text-[10px] text-slate-400">Huấn luyện AI bằng Catalogue sản phẩm (.xlsx), FAQ (.docx) hoặc hướng dẫn sử dụng PDF.</p></div>
                    </div>
                </div>
                <div className="mt-6">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ví dụ Training Data</p>
                    <CodeBlock lang="JSON" code='{
  "q": "Chính sách đổi trả của shop thế nào?",
  "a": "Shop hỗ trợ đổi trả trong 7 ngày kể từ khi nhận hàng. Sản phẩm phải còn nguyên tem mác và chưa qua sử dụng."
}' />
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 10: ZALO & META ───────────────────────── */
export const SectionZaloMeta = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Social Channels" title={<>Zalo OA & <span className="text-amber-600">Meta Messenger</span></>} desc="Kết nối Zalo Official Account và Facebook Page đã gửi ZNS, broadcast và automation Messenger." />
        <div className="grid lg:grid-cols-2 gap-10">
            {/* Zalo */}
            <div className="space-y-6">
                <div className="p-8 bg-gradient-to-br from-blue-950 to-blue-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-xl"><Send className="w-7 h-7 text-white" /></div>
                        <div><h3 className="text-xl font-black">Zalo Official Account</h3><p className="text-blue-300 text-xs font-bold">ZNS Transactional & OA Broadcast</p></div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {[
                            { t: 'ZNS (Zalo Notification Service)', d: 'Gửi thông báo giao dịch: xác nhận đơn, nhắc nhở, OTP với rate cao.' },
                            { t: 'OA Broadcast', d: 'Gửi tin nhắn marketing đến tất cả người theo dõi OA.' },
                            { t: 'Auto-reply Bot', d: 'AI tự trả lời tin nhắn đến OA theo kịch bản & RAG knowledge.' },
                            { t: 'Token Auto-refresh', d: 'Tự động renew Zalo access token — không bao giờ bị ngắt kết nối.' },
                        ].map((f, i) => (
                            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="font-black text-white text-sm">{f.t}</p>
                                <p className="text-blue-300 text-xs mt-1">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 bg-slate-950 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">ZNS Payload Example</p>
                    <CodeBlock lang="JSON" code={`{
  "template_id": "281945", // Xác nhận đơn hàng
  "phone": "84912345678",
  "template_data": {
    "customer_name": "Trần Minh Nam",
    "order_code": "ATF-9921",
    "total_amount": "2.450.000 VNĐ",
    "delivery_time": "Sáng mai, 25/02"
  },
  "tracking_id": "campaign_black_friday"
}`} />
                </div>
            </div>
            {/* Meta */}
            <div className="space-y-6">
                <div className="p-8 bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl" />
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-xl"><Facebook className="w-7 h-7 text-white" /></div>
                        <div><h3 className="text-xl font-black">Meta Messenger</h3><p className="text-indigo-300 text-xs font-bold">Facebook Page Bot & Broadcast</p></div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {[
                            { t: 'Page Inbox Bot', d: 'AI tự trả lời comment & inbox Facebook Page 24/7.' },
                            { t: 'Message Templates', d: 'Gửi template có nút bấm (Quick Reply, CTA Button).' },
                            { t: 'Lead Ads Sync', d: 'Tự động import lead từ Facebook Lead Ads vào CDP.' },
                            { t: 'Comment Auto-reply', d: 'Reply comment → gửi Messenger chứa link/offer.' },
                        ].map((f, i) => (
                            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="font-black text-white text-sm">{f.t}</p>
                                <p className="text-indigo-300 text-xs mt-1">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="font-black text-slate-900 mb-5">Thiết lập kết nối</h3>
                    <div className="space-y-3">
                        {['Vào Settings → Social Channels', 'Click "Connect Zalo OA" → Đăng nhập tài khoản Zalo', 'Chọn OA cần kết nối → Cấp quyền', 'Token tự động lưu & refresh mỗi 6 giờ'].map((s, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                                <p className="text-sm font-bold text-slate-700">{s}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 11: API TRIGGERS ──────────────────────── */
export const SectionAPITriggers = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="API & Integrations" title={<>API Triggers <span className="text-amber-600">& Webhooks</span></>} desc="Kết nối DOMATION với bất kỳ hệ thống nào qua REST API và real-time Webhooks." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Key className="w-5 h-5 text-amber-600" />API Endpoints</h3>
                    <div className="space-y-3">
                        {[
                            { method: 'POST', path: '/api/contacts', desc: 'Tạo / cập nhật contact trong CDP.' },
                            { method: 'POST', path: '/api/trigger-flow', desc: 'Kích hoạt m\u1ed9t DOMATION Flow cho contact.' },
                            { method: 'GET', path: '/api/contacts/:id', desc: 'Lấy thông tin và history của một contact.' },
                            { method: 'POST', path: '/api/tags/assign', desc: 'Gắn / gỡ tag cho contact theo email/phone.' },
                            { method: 'POST', path: '/api/campaigns/send', desc: 'Trigger gửi campaign ngay lập tức.' },
                        ].map((ep, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{ep.method}</span>
                                <code className="text-xs font-bold text-slate-800 flex-1">{ep.path}</code>
                                <span className="text-[10px] text-slate-400 hidden sm:block">{ep.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                    <h3 className="font-black text-slate-900 mb-5 flex items-center gap-3"><Webhook className="w-5 h-5 text-amber-600" />Outbound Webhooks</h3>
                    <div className="space-y-3">
                        {[{ icon: UserCheck, t: 'Contact Updated', d: 'Gửi payload khi contact thay đổi trường dữ liệu.' }, { icon: Tag, t: 'Tag Assigned', d: 'Notify khi tag được gắn — tích hợp với CRM.' }, { icon: Mail, t: 'Email Opened', d: 'Tracking event gửi về server của bạn.' }, { icon: GitBranch, t: 'Flow Completed', d: 'Khi contact Hoàn thành toàn bộ flow.' }].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-slate-950 rounded-3xl text-white shadow-xl">
                    <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-5">Ví dụ: Trigger Flow từ CRM/POS</h3>
                    <CodeBlock lang="JavaScript" code={`// Gửi event từ hệ thống ngoài để kích hoạt Automation
const response = await fetch("https://api.DOMATION.io/v1/events", {
  method: "POST",
  headers: {
    "X-DOMATION-Key": "af_live_8kjs...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    event: "POS_ORDER_COMPLETED",
    contact: {
      email: "nam.tran@gmail.com",
      phone: "0912345678",
      attributes: {
        last_purchase_value: 5000000,
        tier: "VIP_GOLD"
      }
    },
    metadata: {
      store_id: "HANOI_01",
      cashier: "Ly_Phuong"
    }
  })
});
if (!response.ok) throw new Error("Trigger failed");`} />
                </div>
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-3xl">
                    <h3 className="font-black text-amber-900 mb-5">Authentication</h3>
                    <div className="space-y-3">
                        {['Bearer Token trong header Authorization', 'Mỗi workspace có API Key riêng', 'Rate limit: 1000 req/phút per key', 'IP Whitelist có thể bật trong Settings'].map((s, i) => (
                            <div key={i} className="flex items-center gap-3"><ArrowRight className="w-4 h-4 text-amber-600 shrink-0" /><p className="text-sm font-bold text-amber-900">{s}</p></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 12: WEB TRACKING ──────────────────────── */
export const SectionWebTracking = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Website Tracking" title={<>Theo dõi Hành vi <span className="text-amber-600">Người dùng</span></>} desc="SDK nhẹ (<5 KB) nhúng vào website, ghi lại mọi sự kiện và merge data vào CDP." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-black text-slate-900 mb-5">Cài đặt SDK (2 phút)</h3>
                    <CodeBlock lang="HTML" code={`<!-- Dán trước </head> -->
<script>
!function(w,d,s,c){
  w.AutoflowTrack=w.AutoflowTrack||[];
  w.afq=function(){w.AutoflowTrack.push(arguments)};
  var el=d.createElement(s);
  el.src="https://cdn.DOMATION.io/track.min.js";
  el.setAttribute("data-pid","YOUR_PROPERTY_ID");
  d.head.appendChild(el);
}(window,document,"script");
</script>`} />
                    <div className="mt-6 space-y-3">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Track Conversions</p>
                        <CodeBlock lang="JavaScript" code={`// Track sự kiện giỏ hàng (E-commerce)
afq("track", "AddToCart", {
  id: "PROD_99",
  name: "Serum Aura Glow v3",
  price: 850000,
  currency: "VND"
});

// Gắn định danh khi khách để lại thông tin
afq("identify", {
  email: "khach-hang@gmail.com",
  phone: "0901234567",
  full_name: "Nguyễn Văn A"
});`} />
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Eye className="w-5 h-5 text-amber-600" />Loại sự kiện tự động</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: Globe, t: 'Page View', c: 'blue' },
                            { icon: MousePointer, t: 'Click', c: 'indigo' },
                            { icon: Monitor, t: 'Scroll Depth', c: 'violet' },
                            { icon: Clock, t: 'Time on Page', c: 'amber' },
                            { icon: Activity, t: 'Form Submit', c: 'emerald' },
                            { icon: TrendingUp, t: 'Conversion', c: 'rose' },
                            { icon: Map, t: 'Geo Location', c: 'cyan' },
                            { icon: Smartphone, t: 'Device Info', c: 'slate' },
                        ].map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <ev.icon className={`w-4 h-4 text-${ev.c}-500 shrink-0`} />
                                <span className="text-xs font-bold text-slate-700">{ev.t}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-slate-900 rounded-3xl text-white">
                    <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-5">Heatmap & Session Replay</h3>
                    <div className="space-y-4">
                        {[{ icon: Map, t: 'Click Heatmap', d: 'Thấy chính xác vùng nào được click nhiều nhất.' }, { icon: Eye, t: 'Scroll Map', d: 'Tỉ lệ người xem đến từng section trang.' }, { icon: Activity, t: 'Session Replay', d: 'Xem lại hành trình từng người dùng như video.' }].map((f, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <f.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div><p className="font-black text-white text-sm">{f.t}</p><p className="text-slate-400 text-xs mt-0.5">{f.d}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 13: ANALYTICS ─────────────────────────── */
export const SectionAnalytics = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Reports & Analytics" title={<>Báo cáo <span className="text-amber-600">Thông minh</span></>} desc="Dashboards đa chiều — Campaign, Flow, AI Chat, Tracking — mọi thứ trên một màn hình." />
        <div className="grid lg:grid-cols-2 gap-10">
            {/* Main stats */}
            <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/5 rounded-full blur-[80px]" />
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 relative z-10"><BarChart3 className="w-6 h-6 text-amber-600" />Hiệu suất Tổng quan</h3>
                <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                    {[
                        { label: 'Doanh thu từ AI', val: '425.8M₫', change: '+18%', icon: TrendingUp },
                        { label: 'Tỉ lệ chốt đơn AI', val: '12.4%', change: '+3.2%', icon: Target },
                        { label: 'Tỉ lệ mở Email', val: '24.5%', change: '+2.4%', icon: MailOpen },
                        { label: 'Hành động trên Web', val: '8.2k', change: '+1.1%', icon: MousePointer },
                    ].map((s, i) => (
                        <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-amber-600/30 transition-all">
                            <div className="flex items-center justify-between mb-3"><s.icon className="w-4 h-4 text-amber-600" /><span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">{s.change}</span></div>
                            <div className="text-2xl font-black">{s.val}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="h-40 flex items-end gap-2 px-1 relative z-10">
                    {[40, 60, 45, 90, 65, 80, 55, 100, 75, 85].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/10 rounded-t-lg relative group overflow-hidden" style={{ height: `${h}%` }}>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-600 to-amber-300 h-0 group-hover:h-full transition-all duration-700" />
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest px-1 relative z-10">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'T2', 'T3', 'T4'].map((d, i) => <span key={i}>{d}</span>)}
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Smartphone className="w-5 h-5 text-amber-600" />Device Distribution</h3>
                    <div className="space-y-5">
                        {[{ label: 'iOS Mobile', pct: 64, color: 'bg-amber-600' }, { label: 'Windows Desktop', pct: 22, color: 'bg-slate-400' }, { label: 'Android', pct: 14, color: 'bg-slate-200' }].map((d, i) => (
                            <div key={i}>
                                <div className="flex justify-between mb-2"><span className="text-xs font-black text-slate-800">{d.label}</span><span className="text-sm font-black text-amber-600">{d.pct}%</span></div>
                                <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className={`h-full ${d.color} transition-all duration-1000`} style={{ width: `${d.pct}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-3xl">
                    <h3 className="font-black text-amber-900 mb-5">AI Predictive Analytics</h3>
                    <p className="text-sm text-amber-800/70 leading-relaxed mb-5">Hệ thống phân tích xu hướng để dự báo sản phẩm hot và thời điểm tối ưu cho chiến dịch tiếp theo.</p>
                    <div className="p-4 bg-white rounded-2xl border border-amber-200 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0"><Bot className="w-5 h-5" /></div>
                        <div><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">AI Recommendation</p><p className="text-xs font-bold text-slate-800">Tăng ngân sách Ads cuối tuần → ROAS dự báo 4.5x</p></div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-black text-slate-900 mb-4">Báo cáo xuất được</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {['Campaign Report CSV', 'Flow Funnel PDF', 'AI Chat Logs', 'Tracking Heatmap PNG', 'Contact History', 'Revenue Attribution'].map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{r}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 14: SETTINGS ──────────────────────────── */
export const SectionSettings = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Platform Settings" title={<>Cấu hình <span className="text-amber-600">Hệ thống</span></>} desc="Quản lý SMTP, người gửi, tích hợp, phân quyền và cấu hình AI model cho toàn workspace." />
        <div className="grid lg:grid-cols-3 gap-8">
            {[
                {
                    title: 'Email & SMTP', icon: Mail, color: 'from-blue-400 to-blue-600',
                    items: ['Cấu hình SMTP tùy chỉnh (Gmail, Outlook, Mailgun)', 'Xác thực SPF, DKIM, DMARC', 'Nhiều sender name / email', 'Warm-up IP tự động', 'Bounce & Complaint handling']
                },
                {
                    title: 'AI Model Config', icon: Bot, color: 'from-amber-400 to-amber-600',
                    items: ['Chọn model: GPT-4o, Gemini 1.5 Pro, Claude 3.5', 'API Key quản lý per workspace', 'Custom system prompt', 'RAG chunk size & top-K', 'Cost monitoring dashboard']
                },
                {
                    title: 'Workspace & Team', icon: Users, color: 'from-emerald-400 to-teal-600',
                    items: ['Mời thành viên qua email', 'Role: Admin / Editor / Viewer', 'SSO / Google OAuth', 'Audit log truy cập', '2FA bắt buộc cho Admin']
                },
                {
                    title: 'Security', icon: Lock, color: 'from-rose-400 to-rose-600',
                    items: ['IP Whitelist cho API calls', 'Session timeout tùy chỉnh', 'Data encryption at rest', 'GDPR data deletion', 'Webhook signature verify']
                },
                {
                    title: 'Notifications', icon: Bell, color: 'from-violet-400 to-purple-600',
                    items: ['Alert khi bounce rate > X%', 'Flow error notifications', 'Campaign sent summary', 'Low balance warning', 'Webhook failure alert']
                },
                {
                    title: 'Billing & Plan', icon: Package, color: 'from-slate-500 to-slate-700',
                    items: ['Xem usage Thời gian thực', 'Nâng cấp / hạ cấp gói', 'Lịch sử thanh toán & hóa đơn', 'Top-up email credits', 'Contact limit management']
                },
            ].map((s, i) => (
                <div key={i} className="p-7 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-5 shadow-lg`}><s.icon className="w-6 h-6" /></div>
                    <h3 className="font-black text-slate-900 mb-4">{s.title}</h3>
                    <ul className="space-y-2">{s.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-slate-500"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{item}</li>
                    ))}</ul>
                </div>
            ))}
        </div>
        {/* Advanced config panel */}
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-950 rounded-3xl text-white">
                <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-5">SMTP Configuration (Mailgun)</h3>
                <CodeBlock lang="Settings" code={`Host:     smtp.mailgun.org
Port:     587 (TLS)
User:     postmaster@mg.DOMATION.vn
Pass:     ••••••••••••••••

DNS Records Required:
SPF:  v=spf1 include:mailgun.org ~all
DKIM: k=rsa; p=MIGfMA0GCSqGSIb3DQE...`} />
            </div>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl">
                <h3 className="font-black text-slate-900 mb-5">AI Model Comparison</h3>
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left">
                        <thead><tr className="bg-slate-50"><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Speed</th><th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {[{ m: 'GPT-4o', s: '⚡ Fast', q: '★★★★★' }, { m: 'Gemini 1.5 Pro', s: '⚡⚡ Fastest', q: '★★★★☆' }, { m: 'Claude 3.5', s: '⚡ Fast', q: '★★★★★' }].map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-xs font-black text-slate-800">{r.m}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{r.s}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{r.q}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 15: MARKETPLACE ──────────────────────── */
export const SectionMarketplace = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="App Marketplace" title={<>Mini App & <span className="text-amber-600">Mở rộng</span></>} desc="Khám phá kho ứng dụng, plugins và các mini-app giúp mở rộng sức mạnh cho DOMATION." />
        <div className="grid lg:grid-cols-3 gap-8">
            {[
                { name: 'Lark Base Connector', desc: 'Đồng bộ data Khách hàng 2 chiều với Lark Base.', cat: 'Integration', icon: Link2 },
                { name: 'Omnichannel Chat Widget', desc: 'Widget chat tổng hợp: Zalo, FB, Web, Telegram.', cat: 'Channels', icon: MessageSquare },
                { name: 'AI Image Optimizer', desc: 'Tự động tối ưu dung lượng ảnh trong Email.', cat: 'Utility', icon: Image },
                { name: 'E-commerce Tracker', desc: 'Plugin dành cho Shopify & WooCommerce.', cat: 'Tracking', icon: Globe },
                { name: 'Customer Survey Pro', desc: 'Còng cụ tạo bảng hỏi / survey chuyên sâu.', cat: 'Marketing', icon: FileEdit },
                { name: 'Advanced SEO Bot', desc: 'AI phân tích & gợi ý từ khóa SEO cho content.', cat: 'AI Tools', icon: Bot },
            ].map((app, i) => (
                <div key={i} className="group p-6 bg-white border border-slate-100 rounded-[32px] hover:shadow-xl hover:-translate-y-1 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform"><app.icon className="w-7 h-7" /></div>
                    <Badge color="bg-slate-100 text-slate-500 mb-3">{app.cat}</Badge>
                    <h3 className="text-lg font-black text-slate-900 mb-2">{app.name}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">{app.desc}</p>
                    <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">Cài đặt ngay <Rocket className="w-3.5 h-3.5" /></button>
                </div>
            ))}
        </div>
        <div className="p-10 bg-slate-950 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-[100px]" />
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <h3 className="text-3xl font-black mb-6">Bạn là Developer?</h3>
                    <p className="text-slate-400 leading-relaxed mb-8">Xây dựng Mini App của riêng bạn và chia sẻ/bán trên DOMATION Marketplace. Chúng lôi hỗ trợ đầy đủ SDK, Hosting và Sandbox để bạn phát triển nhanh nhất.</p>
                    <div className="flex gap-4">
                        <button className="px-6 py-3 bg-amber-600 text-slate-900 font-black rounded-xl text-sm">Xem Document SDK</button>
                        <button className="px-6 py-3 bg-white/5 border border-white/10 text-white font-black rounded-xl text-sm hover:bg-white/10">Đăng ký Partner</button>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Marketplace API example</p>
                    <CodeBlock lang="JSON" code={`{
  "app_id": "lark-connector-001",
  "permissions": [
    "contacts:read",
    "flows:write",
    "webhooks:manage"
  ],
  "callback_url": "https://your-app.com/auth"
}`} />
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 16: WORKSPACE ASSETS ─────────────────── */
export const SectionWorkspace = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Workspace Management" title={<>Quản lý <span className="text-amber-600">Tài sản & Assets</span></>} desc="Quản lý tập trung hình ảnh, tài liệu và mã nguồn cho toàn bộ tổ chức của bạn." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Database className="w-5 h-5 text-amber-600" />Thư viện tài sản</h3>
                    <div className="space-y-3">
                        {[
                            { icon: Image, t: 'AI Image Gallery', d: 'Lưu trữ toàn bộ ảnh được tạo bởi DALL·E 3 trong chat.' },
                            { icon: FileText, t: 'Document Knowledge', d: 'File PDF, Excel, Docx được upload để làm context cho AI.' },
                            { icon: Terminal, t: 'Code Snippets', d: 'Thư viện mã nguồn Python/JS được trích xuất từ Code Mode.' },
                            { icon: Layers, t: 'Global Assets', d: 'Tài sản dùng chung cho tất cả các con bot trong cùng Organization.' },
                        ].map((f, i) => <FeatureRow key={i} icon={f.icon} title={f.t} desc={f.d} />)}
                    </div>
                </div>
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-[32px]">
                    <h3 className="font-black text-amber-900 mb-4">Tính năng bảo mật</h3>
                    <p className="text-sm text-amber-800/70 leading-relaxed mb-6">Mọi tài liệu upload đều được mã hóa tại chỗ (Encryption at rest) và chỉ có chatbot được phân quyền mới có thể truy cập nội dung.</p>
                    <div className="flex gap-2">
                        <Badge color="bg-amber-100 text-amber-700">GDPR Compliant</Badge>
                        <Badge color="bg-amber-100 text-amber-700">AES-256</Badge>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                    <h3 className="font-black text-amber-600 uppercase tracking-widest text-[10px] mb-6">Asset Preview</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group cursor-pointer hover:border-amber-600/50 transition-all">
                                <Image className="w-8 h-8 text-slate-600 group-hover:text-amber-600 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-[32px]">
                    <h4 className="font-black text-slate-900 mb-4">Thao tác nâng cao</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {['Xóa vĩnh viễn', 'Chia sẻ công khai', 'Gắn nhãn (Labeling)', 'Batch Download', 'OCR Trích xuất văn bản', 'Lưu vào Cloud'].map((op, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {op}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ─── SECTION 17: LOGIC & LIQUID ───────────────────── */
export const SectionLogic = () => (
    <div className="space-y-16 animate-in fade-in duration-700">
        <SectionHeader label="Logic & Dynamic Content" title={<>Cá nhân hóa <span className="text-amber-600">Cực hạn với Liquid</span></>} desc="Sử dụng cú pháp Logic để tạo ra những nội dung Email & Message biến đổi theo từng Khách hàng." />
        <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
                <div className="p-8 bg-slate-950 rounded-[32px] text-white">
                    <h3 className="font-black text-amber-600 uppercase tracking-widest text-xs mb-6">Liquid Logic Example</h3>
                    <CodeBlock lang="Liquid" code={`{% if contact.gender == 'male' %}
  Chào Anh {{ contact.last_name }},
{% elsif contact.gender == 'female' %}
  Chào Chị {{ contact.last_name }},
{% else %}
  Chào {{ contact.first_name }},
{% endif %}

Bạn hiện có {{ contact.points | default: 0 }} điểm thưởng.
Hãy dùng mã {{ contact.tags | first }} để nhận ưu đãi!`} />
                </div>
                <div className="p-8 bg-white border border-slate-100 rounded-[32px]">
                    <h3 className="font-black text-slate-900 mb-5">Filters thông dụng</h3>
                    <div className="space-y-3">
                        {[
                            { t: 'date', d: 'Định dạng ngày tháng: {{ "now" | date: "%Y" }}' },
                            { t: 'upcase / downcase', d: 'Chuyển chữ hoa/thường.' },
                            { t: 'default', d: 'Giá trị mặc định nếu dữ liệu trống.' },
                            { t: 'truncate', d: 'Cắt bớt chuỗi dài kèm dấu ...' },
                        ].map((f, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                <code className="text-xs font-black text-amber-600">| {f.t}</code>
                                <span className="text-[10px] font-bold text-slate-500">{f.d}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                    <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3"><Cpu className="w-5 h-5 text-amber-600" />Biến hệ thống (System Vars)</h3>
                    <div className="space-y-4">
                        {[
                            { v: '{{ sender.name }}', d: 'Tên người gửi (trong Settings).' },
                            { v: '{{ organization.name }}', d: 'Tên công ty / Workspace.' },
                            { v: '{{ unsubscribe_url }}', d: 'Link Hủy đăng kýbắt buộc cho Email).' },
                            { v: '{{ view_in_browser_url }}', d: 'Link xem bản web của email.' },
                        ].map((v, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                                <div><p className="text-xs font-black text-slate-800">{v.v}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{v.d}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[32px] text-slate-900">
                    <h4 className="text-2xl font-black mb-4">Cá nhân hóa 1:1</h4>
                    <p className="font-bold text-slate-900/70 leading-relaxed">Kết hợp giữa dữ liệu CDP và Liquid Logic để đảm bảo 100,000 Khách hàng nhận được 100,000 nội dung khác nhau.</p>
                    <button className="mt-8 px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-slate-800 transition-all">Thử nghiệm Logic ngay</button>
                </div>
            </div>
        </div>
    </div>
);
