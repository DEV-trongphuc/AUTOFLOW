import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
    Send, Users, FileEdit, BarChart3, GitMerge, Tag, Webhook, Zap, Bot,
    Facebook, Globe, Settings, ChevronRight, Search, MessageSquare,
    Target, Menu, X, ArrowLeft, Activity, MailOpen, HelpCircle,
    ExternalLink, Code, Bell, Lock, AlertCircle, BookOpen,
    Home, TrendingUp, Mail, GitBranch, Package, Eye, Database
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
    SectionOverview, SectionCampaigns, SectionAutomation,
    SectionEmailBuilder, SectionTemplates, SectionAudience, SectionTags,
    SectionAITraining
} from './DocSections';
import {
    SectionAIChat, SectionZaloMeta, SectionAPITriggers,
    SectionWebTracking, SectionAnalytics, SectionSettings,
    SectionMarketplace, SectionWorkspace, SectionLogic
} from './DocSectionsB';

/* --- Nav structure ----------------------------------- */
const navGroups = [
    {
        title: '?? B?t d?u',
        items: [
            { id: 'overview', name: 'T?ng quan h? th?ng', icon: Home },
        ]
    },
    {
        title: '?? Marketing',
        items: [
            { id: 'campaigns', name: 'Chi?n d?ch', icon: Send },
            { id: 'email-builder', name: 'Email Builder', icon: FileEdit },
            { id: 'templates', name: 'Templates', icon: BookOpen },
            { id: 'marketplace', name: 'Marketplace', icon: Package },
        ]
    },
    {
        title: '?? Automation',
        items: [
            { id: 'automation', name: 'Automation Flows', icon: GitMerge },
            { id: 'api-triggers', name: 'API Triggers', icon: Webhook },
        ]
    },
    {
        title: '?? Khách hàng',
        items: [
            { id: 'audience', name: 'Audience CDP', icon: Users },
            { id: 'tags', name: 'Tags & Segments', icon: Tag },
        ]
    },
    {
        title: '?? AI & Chat',
        items: [
            { id: 'ai-training', name: 'AI Training (RAG)', icon: Bot },
            { id: 'ai-chat', name: 'AI Chat Space', icon: MessageSquare },
            { id: 'zalo-meta', name: 'Zalo & Meta', icon: Facebook },
        ]
    },
    {
        title: '?? Analytics',
        items: [
            { id: 'web-tracking', name: 'Website Tracking', icon: Globe },
            { id: 'analytics', name: 'Báo cáo', icon: BarChart3 },
            { id: 'workspace', name: 'AI Assets', icon: Database },
            { id: 'logic', name: 'Liquid Logic', icon: Code },
            { id: 'settings', name: 'C?u h�nh', icon: Settings },
        ]
    },
];

/* --- Section map ------------------------------------- */
const sectionMap: Record<string, React.FC> = {
    overview: SectionOverview,
    campaigns: SectionCampaigns,
    'email-builder': SectionEmailBuilder,
    templates: SectionTemplates,
    automation: SectionAutomation,
    'api-triggers': SectionAPITriggers,
    audience: SectionAudience,
    tags: SectionTags,
    'ai-training': SectionAITraining,
    'ai-chat': SectionAIChat,
    'zalo-meta': SectionZaloMeta,
    'web-tracking': SectionWebTracking,
    analytics: SectionAnalytics,
    settings: SectionSettings,
    marketplace: SectionMarketplace,
    workspace: SectionWorkspace,
    logic: SectionLogic,
};

const sectionLabel: Record<string, string> = {
    overview: 'T?ng quan',
    campaigns: 'Chi?n d?ch',
    'email-builder': 'Email Builder',
    templates: 'Templates',
    automation: 'Automation Flows',
    'api-triggers': 'API Triggers',
    audience: 'Audience CDP',
    tags: 'Tags & Segments',
    'ai-training': 'AI Training',
    'ai-chat': 'AI Chat Space',
    'zalo-meta': 'Zalo & Meta',
    'web-tracking': 'Web Tracking',
    analytics: 'Báo cáo',
    settings: 'C?u h�nh',
    marketplace: 'Marketplace',
    workspace: 'AI Assets',
    logic: 'Liquid Logic',
};

/* --- Main component ---------------------------------- */
const Documentation: React.FC = () => {
    const [active, setActive] = useState('overview');
    const [sidebar, setSidebar] = useState(true);
    const [search, setSearch] = useState('');
    const [scroll, setScroll] = useState(0);
    const mainRef = useRef<HTMLDivElement>(null);

    // Responsive sidebar
    useEffect(() => {
        const onResize = () => setSidebar(window.innerWidth >= 1024);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Scroll progress
    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const onScroll = () => {
            const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
            setScroll(Math.min(100, Math.round(pct * 100)));
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // Reset scroll on section change
    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
        setScroll(0);
    }, [active]);

    // Filtered nav
    const filteredGroups = search.trim()
        ? navGroups.map(g => ({
            ...g,
            items: g.items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || it.id.toLowerCase().includes(search.toLowerCase()))
        })).filter(g => g.items.length > 0)
        : navGroups;

    const navigate = (id: string) => {
        setActive(id);
        if (window.innerWidth < 1024) setSidebar(false);
    };

    const ActiveSection = sectionMap[active] ?? SectionOverview;

    return (
        <div className="fixed inset-0 bg-white flex overflow-hidden selection:bg-amber-600 selection:text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 transition-all duration-300 lg:static lg:translate-x-0 ${sidebar ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-20'}`}>
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Brand Header */}
                    <div className="h-24 px-8 flex items-center gap-4 shrink-0 border-b border-slate-50">
                        <div className="relative w-10 h-10 shrink-0">
                            <div className="absolute inset-0 bg-amber-400 blur-lg opacity-20 rounded-full"></div>
                            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg border border-amber-400/20">
                                <Zap className="w-5 h-5 text-white fill-white/20" strokeWidth={3} />
                            </div>
                        </div>
                        {sidebar && (
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">AUTOFLOW</h1>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Documentation</span>
                            </div>
                        )}
                        {sidebar && (
                            <button onClick={() => setSidebar(false)} className="ml-auto text-slate-300 hover:text-slate-600 lg:hidden">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    {sidebar && (
                        <div className="px-6 py-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="T�m ki?m..."
                                    className="w-full bg-slate-50 border border-transparent focus:border-amber-200 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium transition-all outline-none"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide space-y-6 pb-20">
                        {filteredGroups.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                {sidebar && (
                                    <h4 className="px-8 mt-4 mb-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                        {group.title}
                                    </h4>
                                )}
                                {group.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => navigate(item.id)}
                                        className={`
                                            relative flex items-center ${sidebar ? 'justify-between px-8' : 'justify-center px-3'} py-3.5 transition-all duration-300 group
                                            ${active === item.id
                                                ? 'bg-amber-50 text-amber-900 shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                            }
                                        `}
                                    >
                                        <div className={`flex items-center ${sidebar ? 'gap-3' : ''}`}>
                                            <item.icon
                                                className={`w-[18px] h-[18px] transition-transform duration-300 ${active === item.id ? 'text-amber-600 scale-105' : 'text-slate-400 group-hover:text-slate-600'}`}
                                                strokeWidth={2}
                                            />
                                            {sidebar && (
                                                <span className="text-[13px] tracking-wide font-medium truncate">
                                                    {item.name}
                                                </span>
                                            )}
                                        </div>
                                        {active === item.id && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-9 bg-amber-600 rounded-r-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </nav>

                    {/* Back to App */}
                    <div className="p-4 border-t border-slate-50 shrink-0">
                        <NavLink
                            to="/"
                            className="flex items-center gap-3 px-5 py-3.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            {sidebar && <span className="text-xs font-bold uppercase tracking-wider">V? App ch�nh</span>}
                        </NavLink>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Progress bar */}
                <div className="fixed top-0 left-0 right-0 h-1 z-[60] pointer-events-none">
                    <div
                        className="h-full bg-amber-600 transition-all duration-200"
                        style={{ width: `${scroll}%` }}
                    />
                </div>

                {/* Mobile FAB */}
                {!sidebar && (
                    <button
                        onClick={() => setSidebar(true)}
                        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all active:scale-90"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}

                {/* Main Content Scroll Area */}
                <main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-16 lg:py-24">
                        {/* Section Content */}
                        <ActiveSection />

                        {/* Pagination */}
                        <div className="mt-20 pt-10 border-t border-slate-100 flex items-center justify-between gap-6 pb-20">
                            {(() => {
                                const allItems = navGroups.flatMap(g => g.items);
                                const idx = allItems.findIndex(it => it.id === active);
                                const prev = idx > 0 ? allItems[idx - 1] : null;
                                const next = idx < allItems.length - 1 ? allItems[idx + 1] : null;
                                return (
                                    <>
                                        {prev ? (
                                            <button onClick={() => navigate(prev.id)} className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                                                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                                <div className="text-left">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tru?c</p>
                                                    <p className="text-sm font-black text-slate-800">{prev.name}</p>
                                                </div>
                                            </button>
                                        ) : <div />}
                                        {next ? (
                                            <button onClick={() => navigate(next.id)} className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all group ml-auto">
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ti?p theo</p>
                                                    <p className="text-sm font-black text-slate-800">{next.name}</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                            </button>
                                        ) : <div />}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebar && window.innerWidth < 1024 && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setSidebar(false)} />
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default Documentation;
