
import React, { useState, useEffect } from 'react';
import { api } from '../services/storageAdapter';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, Code, Globe,
    MousePointerClick, Activity, ArrowUpRight,
    Users, GanttChartSquare, RefreshCw, BarChart2,
    Monitor, Smartphone, Tablet,
    Copy, MousePointer, MessageSquare, Sparkles, ArrowLeft, Search, ShieldCheck, Filter
} from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import Tabs from '../components/common/Tabs';
import Select from '../components/common/Select';

// Sub-components
import { WebProperty, WebStats, Visitor, VisitorStats } from '../components/web-tracking/types';
import OverviewTab from '../components/web-tracking/OverviewTab';
import VisitorsTab from '../components/web-tracking/VisitorsTab';
import ConversationsTab from '../components/web-tracking/conversations/ConversationsTab';
import WebTrackingModals from '../components/web-tracking/WebTrackingModals';

import { useNavigation } from '../contexts/NavigationContext';

const WebTracking: React.FC = () => {
    const { setCustomBackAction } = useNavigation();
    const [websites, setWebsites] = useState<WebProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWebsite, setSelectedWebsite] = useState<WebProperty | null>(null);
    const [view, setView] = useState<'list' | 'report'>('list');
    const [tab, setTab] = useState<'overview' | 'visitors' | 'heatmap' | 'pages' | 'events' | 'chat'>('overview');
    const [targetConversationId, setTargetConversationId] = useState<string | null>(null);

    // Add Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSiteData, setNewSiteData] = useState({ name: '', domain: '' });

    // Report State
    const [stats, setStats] = useState<WebStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [reportPeriod, setReportPeriod] = useState('7d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [granularity, setGranularity] = useState<'day' | 'month'>('day');
    const [reportDevice, setReportDevice] = useState<'all' | 'mobile' | 'desktop' | 'tablet' | 'bot'>('all');

    // Setup Script State
    const [showScript, setShowScript] = useState(false);
    const [includeAiChat, setIncludeAiChat] = useState(true);
    const [copied, setCopied] = useState(false);

    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<WebProperty | null>(null);

    // Visitors State
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

    const backToVisitors = React.useCallback(() => setSelectedVisitor(null), []);
    const backToList = React.useCallback(() => setView('list'), []);

    // Smart Back Logic
    useEffect(() => {
        if (selectedVisitor) {
            setCustomBackAction(() => backToVisitors);
        } else if (view === 'report') {
            setCustomBackAction(() => backToList);
        } else {
            setCustomBackAction(null);
        }

        return () => setCustomBackAction(null);
    }, [selectedVisitor, view, setCustomBackAction, backToVisitors, backToList]);

    const [visitorEvents, setVisitorEvents] = useState<any[]>([]);
    const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
    const [visitorPage, setVisitorPage] = useState(1);
    const [visitorPagination, setVisitorPagination] = useState<any>(null);
    const [visitorSearch, setVisitorSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [visitorLoyalty, setVisitorLoyalty] = useState<'all' | 'returning' | 'identified'>('all');
    const [liveVisitorCount, setLiveVisitorCount] = useState(0);
    const [visitorType, setVisitorType] = useState<'user' | 'bot'>('user');

    // Heatmap State
    const [heatmapUrl, setHeatmapUrl] = useState('');
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [availablePages, setAvailablePages] = useState<string[]>([]);
    const [heatmapLoading, setHeatmapLoading] = useState(false);
    const [heatmapDevice, setHeatmapDevice] = useState<'all' | 'mobile' | 'desktop'>('all');
    const [websiteSearch, setWebsiteSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchWebsites();
        // Initialize date range for 7 days
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 7);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(visitorSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [visitorSearch]);

    useEffect(() => {
        if (selectedWebsite && view === 'report') {
            fetchStats();
            if (tab === 'visitors') fetchVisitors();
            if (tab === 'overview' || tab === 'heatmap') fetchAvailablePages();
        }
    }, [selectedWebsite, view, reportPeriod, tab, startDate, endDate, reportDevice, visitorPage, debouncedSearch, visitorLoyalty, visitorType]);

    // Reset page on filter change
    useEffect(() => {
        setVisitorPage(1);
        setTargetConversationId(null);
    }, [reportDevice, debouncedSearch, visitorLoyalty, selectedWebsite, visitorType]);

    useEffect(() => {
        if (tab === 'heatmap' && heatmapUrl) {
            fetchHeatmap();
        }
    }, [heatmapUrl, tab, heatmapDevice]);

    const fetchWebsites = async () => {
        try {
            const res = await api.get<WebProperty[]>('web_tracking?action=list');
            if (res.success) setWebsites(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        if (!selectedWebsite) return;
        setStatsLoading(true);
        try {
            const deviceParam = reportDevice !== 'all' ? `&device=${reportDevice}` : '';
            let url = `web_tracking?action=stats&id=${selectedWebsite.id}&period=${reportPeriod}${deviceParam}`;
            if (reportPeriod === 'custom' && startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const res = await api.get<WebStats>(url);
            if (res.success) {
                setStats(res.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchVisitors = async () => {
        if (!selectedWebsite) return;
        try {
            let deviceParam = reportDevice !== 'all' ? `&device=${reportDevice}` : '';
            // Visitor Type Override
            if (visitorType === 'bot') {
                deviceParam = '&device=bot';
            }

            const searchParam = debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : '';
            const loyaltyParam = visitorLoyalty !== 'all' ? `&returning=${visitorLoyalty}` : '';
            const res = await api.get<any>(`web_tracking?action=visitors&id=${selectedWebsite.id}${deviceParam}${searchParam}${loyaltyParam}&page=${visitorPage}`);
            if (res.success) {
                const newVisitors = res.data.visitors || [];
                setVisitors(newVisitors);
                setVisitorPagination(res.data.pagination);
                setLiveVisitorCount(res.data.live_count || 0);

                // Auto-select first visitor if none selected or on fresh load
                if (newVisitors.length > 0) {
                    // Check if current selection is still in the new list, if not or if none, select first
                    const isStillSelected = newVisitors.some((v: any) => v.id === selectedVisitor?.id);
                    if (!isStillSelected) {
                        fetchVisitorJourney(newVisitors[0]);
                    }
                } else {
                    setSelectedVisitor(null);
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchVisitorJourney = async (visitor: Visitor) => {
        setSelectedVisitor(visitor);
        setVisitorEvents([]); // Reset
        setVisitorStats(null); // Reset stats
        try {
            const res = await api.get<any>(`web_tracking?action=visitors&id=${selectedWebsite?.id}&visitor_id=${visitor.id}`);
            if (res.success && res.data) {
                // Support new format { timeline: [], stats: {} } or legacy version []
                const rawEvents = Array.isArray(res.data) ? res.data : (res.data.timeline || []);
                const stats = !Array.isArray(res.data) ? res.data.stats : null;

                setVisitorStats(stats);

                const mapped = rawEvents.map((ev: any) => ({
                    ...ev,
                    timestamp: ev.time || ev.created_at || ev.loaded_at,
                    target_text: ev.target,
                    page_title: ev.page_title,
                    url: ev.url,
                    element_info: ev.meta?.element || ev.meta?.text,
                    duration: ev.duration,
                    source: ev.source
                }));
                setVisitorEvents(mapped);
            }
        } catch (e) {
            console.error('Visitor journey error:', e);
        }
    };

    const fetchAvailablePages = async () => {
        if (!selectedWebsite || !stats?.topPages) return;
        const pages = stats.topPages.map(p => p.url);
        setAvailablePages(pages);
        if (pages.length > 0 && !heatmapUrl) {
            setHeatmapUrl(pages[0]);
        }
    };

    const fetchHeatmap = async () => {
        if (!selectedWebsite || !heatmapUrl) return;
        setHeatmapLoading(true);
        try {
            let url = `web_tracking?action=heatmap&id=${selectedWebsite.id}&url=${encodeURIComponent(heatmapUrl)}`;
            if (heatmapDevice !== 'all') {
                url += `&device=${heatmapDevice}`;
            }
            const res = await api.get<any[]>(url);
            if (res.success) {
                setHeatmapData(res.data || []);
            }
        } catch (e) {
            console.error('Heatmap error:', e);
        } finally {
            setHeatmapLoading(false);
        }
    };

    const handleAddWebsite = async () => {
        if (!newSiteData.name || !newSiteData.domain) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        try {
            const res = await api.post<WebProperty>('web_tracking?action=create', newSiteData);
            if (res.success) {
                toast.success('Thêm website thành công!');
                setWebsites([res.data, ...websites]);
                setIsAddOpen(false);
                setNewSiteData({ name: '', domain: '' });
            }
        } catch (e: any) {
            toast.error(e.message || 'Có lỗi xảy ra');
        }
    };

    const handleDeleteClick = (site: WebProperty, e: React.MouseEvent) => {
        e.stopPropagation();
        setSiteToDelete(site);
        setIsDeleteOpen(true);
    };

    const confirmDeleteAction = async () => {
        if (!siteToDelete) return;

        try {
            await api.delete(`web_tracking?action=delete&id=${siteToDelete.id}`);
            toast.success('Đã xóa dữ liệu website');
            setWebsites(websites.filter(w => w.id !== siteToDelete.id));
            setIsDeleteOpen(false);
            setSiteToDelete(null);
            if (selectedWebsite?.id === siteToDelete.id) {
                setView('list');
                setSelectedWebsite(null);
            }
        } catch (e: any) {
            toast.error(e.message || 'Lỗi xóa');
        }
    };

    const copyScript = () => {
        if (!selectedWebsite) return;

        let actualScript = '';
        if (includeAiChat) {
            actualScript = `<!-- MailFlow Pro Tracker & AI Chat -->
<script>
  window._mf_config = {
    property_id: "${selectedWebsite.id}",
    ai_chat: true
  };
</script>
<script src="https://automation.ideas.edu.vn/tracker.js" async></script>`;
        } else {
            actualScript = `<!-- MailFlow Pro Tracker -->
<script src="https://automation.ideas.edu.vn/tracker.js" data-website-id="${selectedWebsite.id}" async></script>`;
        }

        navigator.clipboard.writeText(actualScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJumpToChat = (conversationId: string) => {
        setTargetConversationId(conversationId);
        setTab('chat');
    };

    const renderEventIcon = (type: string) => {
        switch (type) {
            case 'pageview': return <Globe className="w-4 h-4 text-blue-500" />;
            case 'click': return <MousePointerClick className="w-4 h-4 text-emerald-500" />;
            case 'canvas_click': return <GanttChartSquare className="w-4 h-4 text-indigo-500" />;
            case 'scroll': return <ArrowUpRight className="w-4 h-4 text-orange-400" />;
            case 'identify': return <Users className="w-4 h-4 text-purple-500" />;
            case 'copy': return <Copy className="w-4 h-4 text-rose-500" />;
            case 'select': return <MousePointer className="w-4 h-4 text-amber-600" />;
            case 'form': return <Sparkles className="w-4 h-4 text-[#ffa900]" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const safeFormatDate = (dateValue: any) => {
        if (!dateValue) return 'N/A';
        try {
            let date: Date;
            if (typeof dateValue === 'number') {
                date = dateValue < 10000000000 ? new Date(dateValue * 1000) : new Date(dateValue);
            } else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateValue)) {
                date = new Date(dateValue.replace(' ', 'T'));
            } else {
                date = new Date(dateValue);
            }
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleString('vi-VN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    const shortenUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname + urlObj.search;
        } catch {
            return url;
        }
    };

    const getUserInitials = (visitor: Visitor) => {
        const name = visitor.first_name || visitor.subscriber?.first_name || visitor.email || 'Anonymous';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20  mx-auto">
            {view === 'list' && (
                <>
                    <PageHero
                        title={<>Web <span className="text-amber-100/80">Tracking</span></>}
                        subtitle="Theo dõi toàn diện hành trình người dùng: Visitors, Sessions, Heatmaps."
                        showStatus={true}
                        statusText="Realtime Engine Active"
                        actions={[
                            { label: 'Thêm Website', icon: Plus, onClick: () => setIsAddOpen(true) }
                        ]}
                    />

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                            {[...Array(3)].map((_, i) => {
                                const Sk = ({ w, h, r }: { w: number | string; h: number; r: number }) => (
                                    <div style={{ width: w, height: h, borderRadius: r, background: '#e2e8f0', position: 'relative', overflow: 'hidden', display: 'inline-block', flexShrink: 0 }}>
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} />
                                    </div>
                                );
                                return (
                                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between gap-6 min-h-[180px]">
                                        <div className="flex items-center gap-4">
                                            <Sk w={48} h={48} r={16} />
                                            <div className="space-y-2 flex-1">
                                                <Sk w="70%" h={16} r={6} />
                                                <Sk w="50%" h={11} r={4} />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Sk w="100%" h={52} r={20} />
                                            <div className="grid grid-cols-4 gap-2.5">
                                                <Sk w="100%" h={44} r={12} />
                                                <div className="col-span-3"><Sk w="100%" h={44} r={12} /></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : websites.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <Globe className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Chưa có website nào</h3>
                            <p className="text-slate-500 mb-6">Thêm website để bắt đầu theo dõi.</p>
                            <Button onClick={() => setIsAddOpen(true)} icon={Plus}>Thêm Website đầu tiên</Button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 min-h-[600px]">
                            {/* Internal Header Style From AITraining */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <Tabs
                                    activeId="web"
                                    onChange={() => { }}
                                    variant="pill"
                                    items={[
                                        { id: 'web', label: 'Website Tracking', icon: Globe },
                                    ]}
                                />

                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm website..."
                                        value={websiteSearch}
                                        onChange={(e) => setWebsiteSearch(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 w-full md:w-64 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Danh sách Website</h3>
                                    <p className="text-xs text-slate-500 font-medium">Quản lý và theo dõi hiệu suất các tên miền của bạn.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Tổng cộng: {websites.length}
                                    </div>
                                    <button
                                        onClick={() => setIsAddOpen(true)}
                                        className="h-11 px-6 bg-slate-50 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-2 shadow-sm shrink-0"
                                    >
                                        <Plus className="w-4 h-4 text-slate-400" />
                                        Thêm Website mới
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {websites
                                    .filter(site =>
                                        site.name.toLowerCase().includes(websiteSearch.toLowerCase()) ||
                                        site.domain.toLowerCase().includes(websiteSearch.toLowerCase())
                                    )
                                    .map(site => (
                                        <div
                                            key={site.id}
                                            className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden h-full"
                                        >
                                            {/* Design Elements */}
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-slate-900 group-hover:scale-125 transition-transform">
                                                <Globe className="w-32 h-32" />
                                            </div>

                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform from-amber-400 to-amber-600 shadow-amber-600/30">
                                                        <Globe className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-base font-bold text-slate-800 leading-tight truncate pr-2" title={site.name}>{site.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-1 pr-2 truncate">{site.domain}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDeleteClick(site, e)}
                                                        className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"
                                                        title="Xóa website"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4 relative z-10 mt-2">
                                                <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-[20px] border border-slate-100 group-hover:bg-slate-50 group-hover:border-slate-200 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Online</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bản quyền</span>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Premium Shield</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2.5 mt-2">
                                                    <button
                                                        onClick={() => { setSelectedWebsite(site); setShowScript(true); }}
                                                        className="col-span-1 h-11 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 group/btn"
                                                    >
                                                        <Code className="w-4 h-4 text-slate-400 group-hover/btn:rotate-12 transition-transform" />
                                                        CODE
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedWebsite(site); setView('report'); }}
                                                        className="col-span-3 h-11 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                                                    >
                                                        <BarChart2 className="w-4 h-4 text-slate-500 group-hover/btn:scale-110 transition-transform" />
                                                        Báo cáo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {view === 'report' && selectedWebsite && (
                <div className="animate-fade-in space-y-8">
                    <div className="flex items-center gap-3">

                        <div className="flex-1 w-full">
                            <PageHero
                                title={<>Website: <span className="text-amber-100/80">{selectedWebsite.name}</span></>}
                                subtitle={`Báo cáo chi tiết cho tên miền ${selectedWebsite.domain}. Phân tích hành trình người dùng và đo lường chuyển đổi.`}
                                showStatus={true}
                                statusText="Analytics Active"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 min-h-[800px]">
                        {/* Report Header & Tabs */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                            <Tabs
                                activeId={tab}
                                onChange={setTab as any}
                                variant="pill"
                                items={[
                                    { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
                                    { id: 'visitors', label: 'Hành trình User', icon: GanttChartSquare },
                                    { id: 'chat', label: 'Cuộc trò chuyện', icon: MessageSquare },
                                ]}
                            />

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`h-11 px-6 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 ${showFilters ? 'bg-slate-800 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Bộ lọc
                                </button>
                                <button
                                    onClick={fetchStats}
                                    className="h-11 w-11 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-slate-200 hover:scale-105 transition-all text-slate-600"
                                    title="Làm mới dữ liệu"
                                >
                                    <RefreshCw className={`w-5 h-5 ${statsLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <Button onClick={() => { setShowScript(true); }} icon={Code} variant="secondary" size="md">Cài đặt mã</Button>
                            </div>
                        </div>

                        {/* Filter Toolbar Section */}
                        {showFilters && (
                            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 mb-10 flex flex-wrap items-center gap-6 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Thiết bị</label>

                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                                        <button
                                            onClick={() => setReportDevice('all')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${reportDevice === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            Tất cả
                                        </button>
                                        <button
                                            onClick={() => setReportDevice('desktop')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${reportDevice === 'desktop' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Monitor className="w-3.5 h-3.5" />
                                            Desktop
                                        </button>
                                        <button
                                            onClick={() => setReportDevice('mobile')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${reportDevice === 'mobile' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Smartphone className="w-3.5 h-3.5" />
                                            Mobile
                                        </button>
                                        <button
                                            onClick={() => setReportDevice('tablet')}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${reportDevice === 'tablet' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            <Tablet className="w-3.5 h-3.5" />
                                            Tablet
                                        </button>
                                    </div>
                                </div>

                                <div className="h-12 w-px bg-slate-200 hidden lg:block self-end mb-1"></div>

                                <div className="space-y-2 flex-1 min-w-[200px]">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoảng Thời gian</label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="w-44">
                                            <Select
                                                options={[
                                                    { value: '7d', label: '7 ngày qua' },
                                                    { value: '30d', label: '30 ngày qua' },
                                                    { value: 'this_month', label: 'Tháng này' },
                                                    { value: 'last_month', label: 'Tháng trước' },
                                                    { value: 'this_year', label: 'Năm nay' },
                                                    { value: 'custom', label: 'Tùy chọn...' },
                                                ]}
                                                value={reportPeriod}
                                                onChange={(p) => {
                                                    setReportPeriod(p);
                                                    const now = new Date();
                                                    let start = new Date();
                                                    let end = new Date();
                                                    if (p === '7d') start.setDate(now.getDate() - 7);
                                                    if (p === '30d') start.setDate(now.getDate() - 30);
                                                    if (p === 'this_month') { start.setDate(1); }
                                                    if (p === 'last_month') {
                                                        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                        end = new Date(now.getFullYear(), now.getMonth(), 0);
                                                    }
                                                    if (p === 'this_year') { start.setMonth(0, 1); }
                                                    if (p !== 'custom') {
                                                        setStartDate(start.toISOString().split('T')[0]);
                                                        setEndDate(end.toISOString().split('T')[0]);
                                                    }
                                                }}
                                                variant="outline"
                                                className="h-11 bg-white"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm h-11">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => { setStartDate(e.target.value); setReportPeriod('custom'); }}
                                                className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 focus:ring-0 w-[100px]"
                                            />
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight mx-1">đến</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value); setReportPeriod('custom'); }}
                                                className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 focus:ring-0 w-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className="animate-in fade-in duration-500">

                            {tab === 'overview' && (
                                <OverviewTab
                                    stats={stats}
                                    formatDuration={formatDuration}
                                    shortenUrl={shortenUrl}
                                    renderEventIcon={renderEventIcon}
                                    property={selectedWebsite}
                                    startDate={startDate}
                                    endDate={endDate}
                                    reportDevice={reportDevice}
                                />
                            )}

                            {tab === 'visitors' && (
                                <VisitorsTab
                                    visitors={visitors}
                                    selectedVisitor={selectedVisitor}
                                    setSelectedVisitor={setSelectedVisitor}
                                    fetchVisitorJourney={fetchVisitorJourney}
                                    visitorEvents={visitorEvents}
                                    visitorStats={visitorStats}
                                    renderEventIcon={renderEventIcon}
                                    formatDuration={formatDuration}
                                    safeFormatDate={safeFormatDate}
                                    getUserInitials={getUserInitials}
                                    visitorType={visitorType}
                                    setVisitorType={setVisitorType}
                                    deviceFilter={reportDevice}
                                    pagination={visitorPagination}
                                    onPageChange={setVisitorPage}
                                    searchTerm={visitorSearch}
                                    setSearchTerm={setVisitorSearch}
                                    returningFilter={visitorLoyalty}
                                    setReturningFilter={setVisitorLoyalty}
                                    propertyId={selectedWebsite.id}
                                    property={selectedWebsite}
                                    liveCount={liveVisitorCount}
                                    fetchVisitors={fetchVisitors}
                                    onJumpToChat={handleJumpToChat}
                                />
                            )}

                            {tab === 'chat' && (
                                <ConversationsTab propertyId={selectedWebsite.id} initialConversationId={targetConversationId} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <WebTrackingModals
                isAddOpen={isAddOpen}
                setIsAddOpen={setIsAddOpen}
                newSiteData={newSiteData}
                setNewSiteData={setNewSiteData}
                handleAddWebsite={handleAddWebsite}
                showScript={showScript}
                setShowScript={setShowScript}
                includeAiChat={includeAiChat}
                setIncludeAiChat={setIncludeAiChat}
                selectedWebsite={selectedWebsite}
                copyScript={copyScript}
                copied={copied}
                isDeleteOpen={isDeleteOpen}
                setIsDeleteOpen={setIsDeleteOpen}
                siteToDelete={siteToDelete}
                confirmDeleteAction={confirmDeleteAction}
            />
        </div>
    );
};

export default WebTracking;
