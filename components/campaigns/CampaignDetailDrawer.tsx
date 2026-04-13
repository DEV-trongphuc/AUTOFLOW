import * as React from 'react';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus, TrendingUp, MousePointerClick,
    CheckCircle2, GitMerge, GitBranch, RefreshCw, FileText, CalendarClock, PieChart, Send, MailOpen,
    Search, ChevronLeft, ChevronRight, X, BarChart2, Calendar, Users, MailCheck, Activity, Zap, ExternalLink, Mail, Bell, Clock, Activity as ActivityIcon, MousePointer2, BadgeCheck, FileBarChart, MousePointerClick as ClickIcon,
    Layers, List, AlertOctagon, UserMinus, History, Tag, Loader2, ShieldCheck, Smartphone, Globe, Laptop, Trash2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';
import { Campaign, CampaignStatus, Segment, Flow } from '../../types';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Tabs from '../common/Tabs';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import { api } from '../../services/storageAdapter';
import CampaignDeliveryDetailsTab from './CampaignDeliveryDetailsTab';
import TestEmailModal from './TestEmailModal';
import LinkClicksTab from '../common/LinkClicksTab';
import TechStatsTab from './TechStatsTab';
import ConfirmModal from '../common/ConfirmModal';

interface CampaignDetailDrawerProps {
    campaign: Campaign | null;
    isOpen: boolean;
    onClose: () => void;
    allLists: any[];
    allSegments: Segment[];
    allTags: any[];
    allFlows: Flow[];
}

const CampaignDetailDrawer: React.FC<CampaignDetailDrawerProps> = ({
    campaign, isOpen, onClose, allLists, allSegments, allTags, allFlows
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [initialAudienceFilter, setInitialAudienceFilter] = useState('all');
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [previewType, setPreviewType] = useState<'main' | string>('main');
    const [previewContent, setPreviewContent] = useState({ html: '', subject: '', loading: false });
    const [audienceStats, setAudienceStats] = useState<{ total_current: number, count_sent: number, gap: number, count_unsubscribed?: number, reminders: any[] } | null>(null);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [localCampaign, setLocalCampaign] = useState<Campaign | null>(campaign);
    const [statsLoading, setStatsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        loading: boolean;
        list: any[];
        page: number;
        totalPages: number;
        total: number;
        fetchingList: boolean;
    }>({ isOpen: false, loading: false, list: [], page: 1, totalPages: 1, total: 0, fetchingList: false });

    useEffect(() => {
        if (campaign && isOpen) {
            if (campaign.id !== localCampaign?.id) {
                setActiveTab('overview');
                setAudienceStats(null);
                setPreviewType('main');
                setLogsPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
                setLocalCampaign(campaign);
            } else {
                setLocalCampaign(campaign);
            }

            setIsVisible(true);
            const timer = setTimeout(() => setAnimateIn(true), 10);
            return () => clearTimeout(timer);
        } else if (!isOpen) {
            setAnimateIn(false);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setLocalCampaign(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [campaign, isOpen]);

    const handleNavigateToAudienceFilter = (filter: string) => {
        setInitialAudienceFilter(filter);
        setActiveTab('delivery');
    };

    // Poll for activity logs and campaign stats when drawer is open and relevant tabs are active
    useEffect(() => {
        if (localCampaign?.id && isVisible && activeTab === 'activity') {
            fetchLogs(logsPagination.page);
        }
    }, [localCampaign?.id, isVisible, activeTab, logsPagination.page]);

    // Polling logic for "sending" status progress + stats update
    useEffect(() => {
        let pollTimer: any;
        if (isVisible && localCampaign?.id && localCampaign.status === 'sending') {
            pollTimer = setInterval(async () => {
                const res = await api.get<any>(`campaigns?id=${localCampaign.id}`);
                if (res.success) {
                    setLocalCampaign(res.data);
                    if (res.data.status !== 'sending') {
                        clearInterval(pollTimer);
                    }
                }
            }, 5000);
        }
        return () => {
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [isVisible, localCampaign?.id, localCampaign?.status]);

    const fetchLogs = async (page = 1) => {
        if (!campaign) return;
        setLoadingLogs(true);
        const res = await api.get<any>(`flows?route=history&campaign_id=${campaign.id}&page=${page}&limit=${logsPagination.limit}`);
        if (res.success) {
            if (res.data.pagination) {
                setActivityLogs(res.data.data);
                setLogsPagination(res.data.pagination);
            } else {
                setActivityLogs(res.data);
            }
        }
        setLoadingLogs(false);
    };

    // Effect for Content Preview
    useEffect(() => {
        if (campaign?.id && isOpen && activeTab === 'content') {
            fetchPreviewData();
        }
    }, [campaign?.id, isOpen, activeTab, previewType]);

    const fetchPreviewData = async () => {
        if (!campaign) return;
        setPreviewContent(prev => ({ ...prev, loading: true }));
        try {
            const reminderId = previewType === 'main' ? '' : previewType;
            const res = await api.get<any>(`campaign_preview?campaign_id=${campaign.id}&reminder_id=${reminderId}`);
            if (res.success) {
                setPreviewContent({ html: res.data.html, subject: res.data.subject, loading: false });
            } else {
                setPreviewContent(prev => ({ ...prev, loading: false }));
            }
        } catch (err) {
            setPreviewContent(prev => ({ ...prev, loading: false }));
        }
    };

    // Effect for Audience Stats
    useEffect(() => {
        if (campaign?.id && isOpen && activeTab === 'audience' && campaign.status === 'sent') {
            fetchAudienceStats();
        }
    }, [campaign?.id, isOpen, activeTab]);

    const fetchAudienceStats = async () => {
        if (!campaign) return;
        setStatsLoading(true);
        try {
            const res = await api.get<any>(`campaigns?route=audience_stats&id=${campaign.id}`);
            if (res.success) {
                setAudienceStats(res.data);
            }
        } finally {
            setStatsLoading(false);
        }
    };

    const handleTriggerRefresh = async () => {
        if (!campaign) return;
        setRefreshLoading(true);
        try {
            const res = await api.post<any>(`campaigns?route=trigger_refresh`, { id: campaign.id });
            if (res.success) {
                setShowRefreshConfirm(false);
                fetchAudienceStats();
                setLocalCampaign(prev => prev ? { ...prev, status: CampaignStatus.SENDING, totalTargetAudience: res.data?.total_target_audience || prev.totalTargetAudience } : null);
                toast.success(`Bắt đầu làm mới chiến dịch! Các thành viên mới sẽ sớm nhận được ${isZns ? 'tin nhắn' : 'email'}.`);
            } else {
                toast.error(res.message || "Không thể làm mới chiến dịch.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Đã xảy ra lỗi khi gửi yêu cầu.");
        }
        setRefreshLoading(false);
    };

    const fetchUnsubscribedList = async (page: number = 1) => {
        if (!campaign) return;
        setDeleteModal(prev => ({ ...prev, fetchingList: true, page }));
        try {
            const res = await api.get<any>(`campaigns?route=unsubscribed_list&id=${campaign.id}&page=${page}&limit=10`);
            if (res && res.success && res.data) {
                setDeleteModal(prev => ({
                    ...prev,
                    fetchingList: false,
                    list: res.data.data || [],
                    totalPages: res.data.pagination?.totalPages || 1,
                    total: res.data.pagination?.total || 0
                }));
            } else {
                setDeleteModal(prev => ({ ...prev, fetchingList: false }));
                toast.error("Không thể lấy danh sách, server phản hồi lỗi hoặc chưa nạp API mới!");
            }
        } catch (err) {
            console.error("fetchUnsubscribedList Error:", err);
            toast.error("Lỗi kết nối API lấy danh sách Unsub. Hãy chắc chắn bạn đã upload file api/campaigns.php!");
            setDeleteModal(prev => ({ ...prev, fetchingList: false }));
        }
    };

    useEffect(() => {
        if (deleteModal.isOpen && campaign) {
            fetchUnsubscribedList(deleteModal.page);
        }
    }, [deleteModal.isOpen, deleteModal.page, campaign]);

    const handleDeleteUnsubscribed = async () => {
        if (!campaign) return;
        setDeleteModal(prev => ({ ...prev, loading: true }));
        try {
            const res = await api.post<any>('campaigns?route=delete_unsubscribed', { id: campaign.id });
            if (res.success) {
                toast.success(`Đã xóa vĩnh viễn ${res.data?.deleted || 0} liên hệ Hủy đăng ký khỏi hệ thống.`);
                setDeleteModal(prev => ({ ...prev, isOpen: false, loading: false }));
                fetchAudienceStats();
            } else {
                toast.error(res.message || "Lỗi khi xóa liên hệ.");
                setDeleteModal(prev => ({ ...prev, loading: false }));
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi gọi API xóa.");
            setDeleteModal(prev => ({ ...prev, loading: false }));
        }
    };

    if (!localCampaign) return null;

    const stats = localCampaign.stats || { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 };

    // Real Calculations
    const isSent = localCampaign.status === CampaignStatus.SENT;
    const sentCount = stats.sent || 0;
    const deliveredCount = Math.max(0, sentCount - (stats.bounced || 0));
    const retainedCount = Math.max(0, sentCount - (stats.bounced || 0) - (stats.unsubscribed || 0));

    const isZns = localCampaign.type === 'zalo_zns';
    const openRate = (sentCount > 0 && isFinite(stats.opened / sentCount)) ? ((stats.opened / sentCount) * 100).toFixed(1) : "0.0";
    const clickRate = (sentCount > 0 && isFinite(stats.clicked / sentCount)) ? ((stats.clicked / sentCount) * 100).toFixed(1) : "0.0";
    const clickToOpenRate = (stats.opened > 0 && isFinite(stats.clicked / stats.opened)) ? ((stats.clicked / stats.opened) * 100).toFixed(1) : "0.0";

    const bounceRate = (sentCount > 0 && isFinite(stats.bounced / sentCount)) ? ((stats.bounced / sentCount) * 100).toFixed(2) : "0.00";
    const unsubRate = (sentCount > 0 && isFinite(stats.unsubscribed / sentCount)) ? ((stats.unsubscribed / sentCount) * 100).toFixed(2) : "0.00";
    const deliveryRate = (sentCount > 0 && isFinite(deliveredCount / sentCount)) ? ((deliveredCount / sentCount) * 100).toFixed(1) : "0.0";
    const retainedRate = (sentCount > 0 && isFinite(retainedCount / sentCount)) ? ((retainedCount / sentCount) * 100).toFixed(1) : "0.0";

    const funnelData = [
        { name: isZns ? 'Tin nhắn đã gửi' : 'Đã gửi (Sent)', value: sentCount, fill: '#94a3b8', icon: Send },
        { name: isZns ? 'Đã nhận (Delivered)' : 'Đã nhận (Delivered)', value: deliveredCount, fill: '#3b82f6', icon: CheckCircle2 },
        { name: isZns ? 'Lượt xem (Seen)' : 'Đã mở (Opened)', value: stats.opened, fill: '#ffa900', icon: isZns ? BadgeCheck : MailOpen },
        ...(isZns ? [] : [{ name: 'Đã click (Unique Click)', value: stats.clicked, fill: '#10b981', icon: MousePointer2, subValue: (stats as any).total_clicked ? `Total: ${(stats as any).total_clicked}` : null }]),
    ];

    const healthData = [
        { name: isZns ? 'Đã nhận' : 'Hộp thư chính', value: retainedCount, fill: '#10b981' },
        { name: isZns ? 'Lỗi gửi' : 'Tỷ lệ (Bounce)', value: stats.bounced, fill: '#f43f5e' },
        ...(isZns ? [] : [{ name: 'Hủy đăng ký (Unsub)', value: stats.unsubscribed, fill: '#d97706' }])
    ].filter(d => d.value > 0);

    const targetLists = localCampaign.target?.listIds.map(id => allLists.find(l => l.id === id)).filter(Boolean) || [];
    const targetSegments = localCampaign.target?.segmentIds.map(id => allSegments.find(s => s.id === id)).filter(Boolean) || [];
    const targetTags = localCampaign.target?.tagIds?.map(name => allTags.find(t => t.name === name)).filter(Boolean) || [];

    const totalAudience = localCampaign.totalTargetAudience || 0;

    const StatBox = ({ label, value, subValue, icon: Icon, colorClass }: any) => {
        const getGradient = (clr: string) => {
            if (clr.includes('orange') || clr.includes('#ffa900')) return 'from-orange-500 to-[#ca7900] shadow-orange-500/10';
            if (clr.includes('emerald') || clr.includes('green')) return 'from-emerald-500 to-teal-600 shadow-emerald-500/10';
            if (clr.includes('blue') || clr.includes('indigo')) return 'from-blue-500 to-indigo-600 shadow-indigo-500/10';
            if (clr.includes('rose') || clr.includes('pink') || clr.includes('red')) return 'from-pink-500 to-rose-600 shadow-rose-500/10';
            return 'from-slate-500 to-slate-600 shadow-slate-500/10';
        };

        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:-translate-y-1 transition-all duration-300">
                <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <h4 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{value}</h4>
                    {subValue && <p className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 md:mt-2 uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{subValue}</p>}
                </div>
                <div className={`w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br ${getGradient(colorClass)} text-white rounded-xl md:rounded-2xl shadow-lg flex items-center justify-center transition-all group-hover:scale-110 shrink-0 ml-4`}>
                    <Icon className="w-5 h-5 md:w-7 md:h-7" />
                </div>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <div className={`fixed inset-0 z-[9999] flex justify-end ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
            <div
                className={`relative w-full lg:max-w-6xl bg-[#f8fafc] shadow-2xl h-full lg:h-screen flex flex-col transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${animateIn ? 'translate-x-0 opacity-100' : 'translate-x-full lg:translate-x-[100px] opacity-0'}`}
            >
                {/* Header */}
                <div className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row justify-between items-start gap-4 shrink-0 shadow-sm z-30">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5">
                            <Badge variant={
                                localCampaign.status === 'sent' ? 'success' :
                                    localCampaign.status === 'sending' ? 'info' :
                                        localCampaign.status === 'scheduled' ? 'warning' : 'neutral'
                            } className="px-2 py-0.5 md:px-3 md:py-1 text-[9px] md:text-xs">
                                {localCampaign.status === 'sending' && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                                {localCampaign.status.toUpperCase()}
                            </Badge>
                            {localCampaign.status === 'sending' && localCampaign.totalTargetAudience > 0 && (
                                <span className="text-[10px] md:text-xs font-black text-slate-400">
                                    <span className="text-blue-600">{(localCampaign.stats?.sent || 0).toLocaleString()}</span>/{(localCampaign.totalTargetAudience || 0).toLocaleString()}
                                </span>
                            )}
                            <span className="text-[9px] md:text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                {localCampaign.sentAt
                                    ? `Gửi lúc: ${!isNaN(new Date(localCampaign.sentAt).getTime()) ? new Date(localCampaign.sentAt).toLocaleString('vi-VN') : '...'}`
                                    : `Bản nháp`}
                            </span>
                            <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-[10px] md:text-xs font-black font-mono tracking-widest ml-2 shadow-sm">
                                ID: {localCampaign.id}
                            </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight truncate pr-4">{localCampaign.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={async () => {
                                setRefreshLoading(true);
                                const res = await api.get<any>(`campaigns?id=${campaign.id}`);
                                if (res.success) {
                                    setLocalCampaign(res.data);
                                    toast.success("Đã làm mới dữ liệu Báo cáo");
                                }
                                setRefreshLoading(false);
                            }}
                            variant="secondary"
                            size="sm"
                            icon={RefreshCw}
                            disabled={refreshLoading}
                            className="!rounded-xl border-slate-200"
                        >
                            <span className="hidden md:inline">{refreshLoading ? 'Đang làm mới...' : 'Làm mới'}</span>
                        </Button>
                        <Button
                            onClick={() => setShowTestModal(true)}
                            variant="secondary"
                            size="sm"
                            icon={Send}
                            className="!rounded-xl border-slate-200"
                        >
                            <span className="hidden md:inline">{isZns ? 'Gửi Test ZNS' : 'Gửi Test Email'}</span>
                            <span className="md:hidden">Test</span>
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 md:p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl md:rounded-2xl transition-all"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 md:px-8 pt-2 bg-white border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <Tabs
                        activeId={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { id: 'overview', label: 'Báo cáo', icon: BarChart2 },
                            { id: 'content', label: localCampaign.type === 'zalo_zns' ? 'Nội dung' : 'Nội dung', icon: FileText },
                            { id: 'audience', label: 'Đối tượng', icon: Users, count: totalAudience },
                            { id: 'delivery', label: 'Lịch sử', icon: MailCheck },
                            ...(localCampaign.type !== 'zalo_zns' ? [
                                { id: 'links', label: 'Links', icon: ClickIcon },
                                { id: 'tech', label: 'Thiết bị', icon: Smartphone },
                            ] : []),
                            { id: 'activity', label: 'Nhật ký Live', icon: Activity },
                        ]}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6 md:space-y-8 bg-[#f8fafc]">

                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
                            {localCampaign.status === 'sending' && (
                                <div className="p-1 bg-slate-100 rounded-[28px] overflow-hidden">
                                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center animate-pulse-subtle">
                                                    <Send className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight">Chiến dịch đang được xử lý</h5>
                                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vui lòng không đóng trình duyệt để theo dõi sát sao</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-blue-600 tracking-tight">
                                                    {Math.min(100, Math.round(((localCampaign.stats?.sent || 0) / (localCampaign.totalTargetAudience || 1)) * 100))}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full h-3 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20"
                                                style={{ width: `${Math.min(100, ((localCampaign.stats?.sent || 0) / (localCampaign.totalTargetAudience || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold">
                                            <div className="flex gap-4">
                                                <span className="text-slate-500 uppercase tracking-wider">Đã gửi: <span className="text-blue-600 font-black">{(localCampaign.stats?.sent || 0).toLocaleString()}</span></span>
                                                {(localCampaign.stats?.failed || 0) > 0 && (
                                                    <span className="text-rose-500 uppercase tracking-wider">Thất bại: <span className="font-black">{(localCampaign.stats?.failed || 0).toLocaleString()}</span></span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-400 uppercase tracking-widest">Mục tiêu: {localCampaign.totalTargetAudience?.toLocaleString() || '...'}</span>
                                                <button
                                                    onClick={handleTriggerRefresh}
                                                    disabled={refreshLoading}
                                                    className="ml-2 px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                                                    title="Nếu tiến độ bị kẹt, nhấn để kích hoạt lại tiến trình gửi"
                                                >
                                                    {refreshLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-orange-400" />}
                                                    Kích hoạt lại
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const associatedFlow = allFlows.find(f =>
                                    f.steps.some(s => s.type === 'trigger' && s.config.type === 'campaign' && s.config.targetId === localCampaign.id)
                                );

                                return (
                                    <div className="flex flex-col gap-4">
                                        {associatedFlow && (
                                            <div className="bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-950 p-6 rounded-[24px] shadow-lg shadow-indigo-900/20 text-white flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in zoom-in duration-500 border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                                        <GitBranch className="w-6 h-6 text-orange-300" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-wider">Kịch bản chăm sóc sau chiến dịch</h4>
                                                        <p className="text-xs text-indigo-100 font-medium mt-0.5">Chiến dịch này đang kích hoạt Flow: <span className="font-bold underline">{associatedFlow.name}</span></p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => {
                                                        navigate('/flows', { state: { openFlowId: associatedFlow.id, tab: 'analytics' } });
                                                        onClose();
                                                    }}
                                                    variant="secondary"
                                                    className="bg-white text-indigo-600 border-none hover:bg-slate-50 shadow-md !rounded-xl px-6"
                                                    icon={ExternalLink}
                                                >
                                                    Xem Báo cáo Flow
                                                </Button>
                                            </div>
                                        )}

                                        {(localCampaign.stats?.failed || 0) > 0 && (
                                            <div className="bg-rose-50 border border-rose-100 p-5 rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                                                        <AlertOctagon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Phát hiện lỗi khi gửi ({(localCampaign.stats?.failed || 0).toLocaleString()} {isZns ? 'tin nhắn' : 'email'})</h4>
                                                        <p className="text-xs text-rose-700 font-medium mt-0.5">Một số {isZns ? 'tin nhắn' : 'email'} đã không thể gửi đi do lỗi hệ thống hoặc địa chỉ không tồn tại.</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => setActiveTab('delivery')}
                                                    variant="secondary"
                                                    className="bg-white text-rose-600 border-rose-200 hover:bg-rose-50 shadow-sm !rounded-xl px-6"
                                                    icon={BarChart2}
                                                >
                                                    Xem chi tiết lỗi
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 1. KEY METRICS ROW */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <StatBox
                                    label={isZns ? "Tỷ lệ Xem (Seen Rate)" : "Tỷ lệ Mở (Open Rate)"}
                                    value={`${openRate}%`}
                                    subValue={`${(stats.opened || 0).toLocaleString()} người${(stats as any).total_opened && !isZns ? ` - ${(stats as any).total_opened.toLocaleString()} lượt` : ''}`}
                                    icon={isZns ? BadgeCheck : MailOpen}
                                    colorClass="text-[#ffa900]"
                                />
                                {isZns ? (
                                    <StatBox
                                        label="Đã nhận (Delivered)"
                                        value={(deliveredCount || 0).toLocaleString()}
                                        subValue="Tin nhắn đến máy khách"
                                        icon={Smartphone}
                                        colorClass="text-blue-500"
                                    />
                                ) : (
                                    <StatBox
                                        label="Tỷ lệ Click (CTR)"
                                        value={`${clickRate}%`}
                                        subValue={`${(stats.clicked || 0).toLocaleString()} lượt CLICKS`}
                                        icon={MousePointerClick}
                                        colorClass="text-emerald-500"
                                    />
                                )}
                                {!isZns && (
                                    <StatBox
                                        label="Click / Open (CTOR)"
                                        value={`${clickToOpenRate}%`}
                                        subValue="Chất lượng nội dung"
                                        icon={Activity}
                                        colorClass="text-blue-500"
                                    />
                                )}
                                <StatBox
                                    label={isZns ? "Chi phí tạm tính" : "Tỷ lệ gửi thành công"}
                                    value={isZns ? (() => {
                                        const configData = typeof localCampaign.config === 'string' ? JSON.parse(localCampaign.config) : localCampaign.config;
                                        const price = configData?.price || 300;
                                        return (sentCount * price).toLocaleString() + 'd';
                                    })() : `${deliveryRate}%`}
                                    subValue={isZns ? `Dựa trên ${(sentCount || 0).toLocaleString()} tin` : `${(deliveredCount || 0).toLocaleString()} / ${(sentCount || 0).toLocaleString()}`}
                                    icon={isZns ? PieChart : CheckCircle2}
                                    colorClass="text-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* 2. CONVERSION FUNNEL (LEFT - 2 COLS) */}
                                <div className="lg:col-span-2 space-y-6">
                                    <Card className="border-slate-100 shadow-sm min-h-[400px]" noPadding>
                                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Phễu chuyển đổi (Funnel)</h3>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Hành trình tương tác của Khách hàng</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {/* Legend */}
                                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-[10px] font-bold text-slate-500">{isZns ? 'Đã gửi' : 'Sent'}</span></div>
                                                <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full bg-[#ffa900]`} /><span className="text-[10px] font-bold text-slate-500">{isZns ? 'Đã xem' : 'Open'}</span></div>
                                                {!isZns && <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-500">Click</span></div>}
                                            </div>
                                        </div>
                                        <div className="p-6 h-[320px]">
                                            {stats.sent > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                        <XAxis type="number" hide />
                                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} width={120} tickLine={false} axisLine={false} />
                                                        <Tooltip
                                                            cursor={{ fill: '#f8fafc' }}
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                                        />
                                                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                                                            {funnelData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                    <BarChart2 className="w-12 h-12 mb-3 opacity-50" />
                                                    <p className="text-xs font-bold">Chưa có dữ liệu</p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Detailed List */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {funnelData.map((item, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-slate-50 text-slate-500"><item.icon className="w-4 h-4" /></div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.name.split(' (')[0]}</p>
                                                    <p className="text-sm font-black text-slate-800">{(item.value || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. HEALTH & DELIVERY (RIGHT - 1 COL) */}
                                <div className="space-y-6">
                                    <Card className="border-slate-100 shadow-sm" noPadding>
                                        <div className="p-6 border-b border-slate-50">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sức khỏe gửi tin
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            {stats.sent > 0 ? (
                                                <div className="h-40 relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RePieChart>
                                                            <Pie
                                                                data={healthData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={60}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {healthData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                                                            />
                                                        </RePieChart>
                                                    </ResponsiveContainer>
                                                    {/* Center Text */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                        <span className="text-xl font-black text-slate-800">{retainedRate}%</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Success</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-medium">Chưa có dữ liệu</div>
                                            )}

                                            <div className="space-y-4 mt-2">
                                                <div className="flex justify-between items-center text-xs group cursor-pointer" onClick={() => handleNavigateToAudienceFilter('failed')}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${isZns ? 'bg-rose-500' : 'bg-rose-500'}`} />
                                                        <span className="text-slate-600 font-bold group-hover:text-blue-600 transition-colors">{isZns ? 'Lỗi gửi (Failed)' : 'Email hỏng (Bounce)'}</span>
                                                    </div>
                                                    <span className="font-mono font-bold text-rose-500">{isZns ? `${(sentCount > 0 ? ((localCampaign.stats?.failed || 0) / sentCount * 100).toFixed(2) : '0.00')}% (${localCampaign.stats?.failed || 0})` : `${bounceRate}% (${stats.bounced})`}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs group cursor-pointer" onClick={() => handleNavigateToAudienceFilter('unsubscribed')}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${isZns ? 'bg-[#ca7900]' : 'bg-[#ca7900]'}`} />
                                                        <span className="text-slate-600 font-bold group-hover:text-blue-600 transition-colors">{isZns ? 'Hủy đăng ký (Unsub)' : 'Hủy đăng ký (Unsub)'}</span>
                                                    </div>
                                                    <span className="font-mono font-bold text-[#ca7900]">{isZns ? '0.00% (0)' : `${unsubRate}% (${stats.unsubscribed})`}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-[24px] relative overflow-hidden">
                                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-200 rounded-full opacity-20 blur-xl" />
                                        <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Thông tin gửi</h4>
                                        <div className="space-y-2 text-[11px]">
                                            <div className="flex justify-between">
                                                <span className="text-blue-600/70 font-bold">Subject:</span>
                                                <span className="text-blue-900 font-bold truncate max-w-[150px]">{localCampaign.subject}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-600/70 font-bold">{isZns ? 'ZNS Template:' : 'From:'}</span>
                                                <span className="text-blue-900 font-bold">{isZns ? localCampaign.templateId : localCampaign.senderEmail}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-600/70 font-bold">{isZns ? 'Hệ thống:' : 'Tracking:'}</span>
                                                <span className="text-blue-900 font-bold">{isZns ? 'Zalo Open API' : (localCampaign.trackingEnabled ? 'ON' : 'OFF')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <LinkClicksTab type="campaign" id={localCampaign.id} initialHtml={previewContent.html} />
                        </div>
                    )}

                    {activeTab === 'tech' && (
                        <TechStatsTab type="campaign" id={localCampaign.id} isZns={isZns} />
                    )}

                    {activeTab === 'content' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                <button
                                    onClick={() => setPreviewType('main')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${previewType === 'main' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Mail className="w-3.5 h-3.5" /> {localCampaign.type === 'zalo_zns' ? 'Nội dung ZNS' : 'Email chính'}
                                </button>
                                {localCampaign.type !== 'zalo_zns' && localCampaign.reminders?.map((rem, idx) => (
                                    <button
                                        key={rem.id}
                                        onClick={() => setPreviewType(rem.id!)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${previewType === rem.id ? 'bg-[#ffa900] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Bell className="w-3.5 h-3.5" /> Nhắc nhở {idx + 1}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm min-h-[950px] flex flex-col">
                                        <div className="mb-4 pb-4 border-b border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiêu đề bản tin</p>
                                            <h4 className="text-sm font-bold text-slate-700">{previewContent.loading ? '...' : previewContent.subject}</h4>
                                        </div>
                                        <div className="h-[900px] bg-[#fcfcfc] rounded-2xl border border-slate-50 shadow-inner overflow-hidden relative">
                                            {previewContent.loading ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                                                    <RefreshCw className="w-8 h-8 animate-spin" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Đang tải preview...</p>
                                                </div>
                                            ) : (
                                                <iframe
                                                    srcDoc={previewContent.html}
                                                    className="w-full h-full border-none"
                                                    title="Email Content Preview"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            {previewType === 'main' ? 'Lịch trình gửi chính' : 'Lịch nhắc nhở'}
                                        </h4>

                                        {previewType === 'main' ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trạng thái</p>
                                                    <Badge variant={isSent ? 'success' : 'info'} className="text-[10px] font-bold">{localCampaign.status}</Badge>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Thời gian</p>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {localCampaign.sentAt ? new Date(localCampaign.sentAt).toLocaleString('vi-VN') : (localCampaign.scheduledAt ? new Date(localCampaign.scheduledAt).toLocaleString('vi-VN') : 'Dự kiến ngay')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (() => {
                                            const rem = localCampaign.reminders?.find(r => r.id === previewType);
                                            return rem ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Loại kích hoạt</p>
                                                        <p className="text-xs font-bold text-orange-700">
                                                            {rem.type === 'no_open' ? 'Gửi nếu chưa mở Mail chính' : (rem.type === 'no_click' ? 'Gửi nếu chưa nhấn link' : 'Gửi cho tất cả')}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Thời gian chờ</p>
                                                        <p className="text-xs font-bold text-blue-700">
                                                            {rem.triggerMode === 'delay' ? `Sau ${rem.delayDays} ngày ${rem.delayHours} giờ` : `Vào lúc: ${rem.scheduledAt ? new Date(rem.scheduledAt).toLocaleString('vi-VN') : 'Chưa đặt'}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>

                                    {previewType !== 'main' && (
                                        <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-100">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Gợi ý</p>
                                            <p className="text-xs text-emerald-800 leading-relaxed font-medium">Nhắc nhở này giúp tăng thêm **15-20%** tỷ lệ chuyển đổi cho những người bỏ lỡ email đầu tiên.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audience' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4" /> Đối tượng nhận {isZns ? 'ZNS' : 'Email'} ({(totalAudience || 0).toLocaleString()})
                            </h4>

                            {localCampaign.status === 'sent' && audienceStats && (
                                <Card noPadding className="border-amber-100 bg-amber-50/30 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                        <Users className="w-24 h-24 text-amber-600 translate-x-8 -translate-y-8" />
                                    </div>
                                    <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                        <div className="space-y-1">
                                            <h5 className="text-sm font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                                                <Zap className={`w-4 h-4 text-orange-500 ${statsLoading ? 'animate-bounce' : ''}`} /> Phân tích đối tượng
                                            </h5>
                                            <p className="text-xs text-amber-700/70 font-medium tracking-tight">Đối tượng mà bạn chọn đã thay đổi kể từ lần gửi cuối cùng của chiến dịch này.</p>
                                        </div>
                                        {statsLoading ? (
                                            <div className="flex-1 flex justify-center items-center py-2">
                                                <div className="flex items-center gap-3 text-amber-600/50">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Đang phân tích dữ liệu...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-10">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đã gửi</p>
                                                    <p className="text-xl font-black text-slate-700">{(audienceStats.count_sent || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="w-px h-10 bg-amber-100" />
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hiện tại</p>
                                                    <p className="text-xl font-black text-slate-700">{(audienceStats.total_current || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="w-px h-10 bg-amber-100" />
                                                <div className="text-center relative group">
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Chênh lệch</p>
                                                    <p className="text-xl font-black text-amber-600">+{(audienceStats.gap || 0).toLocaleString()}</p>
                                                    {audienceStats.count_unsubscribed !== undefined && audienceStats.count_unsubscribed > 0 && (
                                                        <div className="mt-2 text-center">
                                                            <p className="text-[10px] font-bold text-rose-500 whitespace-nowrap">Do {audienceStats.count_unsubscribed} người Unsub</p>
                                                            <button
                                                                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: true, loading: false, page: 1 }))}
                                                                className="mt-1 px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto shadow-sm relative z-20"
                                                            >
                                                                <Trash2 className="w-3 h-3" /> Dọn dẹp
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {audienceStats.gap > 0 && !statsLoading && (
                                            <Button
                                                onClick={() => setShowRefreshConfirm(true)}
                                                variant="primary"
                                                className="!rounded-2xl shadow-xl shadow-amber-600/20"
                                                icon={Send}
                                            >
                                                Gửi cho {audienceStats.gap} người mới
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            )}

                            <Card noPadding className="border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <List className="w-4 h-4 text-blue-500" /> Danh sách mục tiêu
                                    </h5>
                                </div>
                                <div className="p-6 space-y-3">
                                    {targetLists.length > 0 ? targetLists.map(list => (
                                        <div key={list.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100"><List className="w-5 h-5" /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{list.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Static List</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{(list.count || 0).toLocaleString()}</span>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 font-bold uppercase tracking-widest">Không có danh sách nào được chọn</p>
                                    )}
                                </div>
                            </Card>

                            <Card noPadding className="border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-orange-500" /> Phân khúc mục tiêu
                                    </h5>
                                </div>
                                <div className="p-6 space-y-3">
                                    {targetSegments.length > 0 ? targetSegments.map(segment => (
                                        <div key={segment.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-50 text-[#ca7900] flex items-center justify-center border border-orange-100"><Layers className="w-5 h-5" /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{segment.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dynamic Segment</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{(segment.count || 0).toLocaleString()}</span>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 font-bold uppercase tracking-widest">Không có phân khúc nào được chọn</p>
                                    )}
                                </div>
                            </Card>

                            <Card noPadding className="border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-emerald-500" /> Nhãn mục tiêu
                                    </h5>
                                </div>
                                <div className="p-6 space-y-3">
                                    {targetTags.length > 0 ? targetTags.map(tag => (
                                        <div key={tag.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100"><Tag className="w-5 h-5" /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{tag.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Tag Group</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{tag.count.toLocaleString()}</span>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 font-bold uppercase tracking-widest">Không có nhãn nào được chọn</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'delivery' && localCampaign && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <CampaignDeliveryDetailsTab
                                campaign={localCampaign}
                                allLists={allLists}
                                allTags={allTags}
                                initialFilter={initialAudienceFilter}
                            />
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Nhật ký tương tác
                                </h4>
                                <button onClick={() => fetchLogs()} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                    <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <Card noPadding className="border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hành động</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loadingLogs ? (
                                                <tr><td colSpan={4} className="py-20 text-center text-slate-400 text-xs font-medium italic">Đang tải dữ liệu...</td></tr>
                                            ) : activityLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-20 text-center">
                                                        <History className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                                                        <p className="text-xs font-bold text-slate-400 uppercase">Chưa có hoạt động nào</p>
                                                        <p className="text-[10px] text-slate-300 mt-1">Dữ liệu sẽ xuất hiện khi Khách hàng mở mail hoặc click link.</p>
                                                    </td>
                                                </tr>
                                            ) : activityLogs.map((log, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">{log.first_name} {log.last_name}</span>
                                                            <span className="text-[10px] text-slate-400">{log.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {log.type === 'open_email' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black uppercase tracking-wide">
                                                                <MailOpen className="w-3 h-3" /> Opened
                                                            </span>
                                                        )}
                                                        {log.type === 'click_link' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-wide">
                                                                <MousePointer2 className="w-3 h-3" /> Clicked
                                                            </span>
                                                        )}
                                                        {log.type === 'unsubscribe' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-wide">
                                                                <UserMinus className="w-3 h-3" /> Unsub
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <p className="text-[10px] font-medium text-slate-500 truncate max-w-[200px]">{log.details || '--'}</p>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-slate-400">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(log.created_at).toLocaleString('vi-VN')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {logsPagination.totalPages > 1 && (
                                    <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            Trang {logsPagination.page} / {logsPagination.totalPages}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setLogsPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                                disabled={logsPagination.page <= 1 || loadingLogs}
                                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-black text-[10px]"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setLogsPagination(prev => ({ ...prev, page: Math.min(logsPagination.totalPages, prev.page + 1) }))}
                                                disabled={logsPagination.page >= logsPagination.totalPages || loadingLogs}
                                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-black text-[10px]"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>

                {/* Confirmation Modal for Refresh */}
                <ConfirmModal
                    isOpen={showRefreshConfirm}
                    onClose={() => setShowRefreshConfirm(false)}
                    onConfirm={handleTriggerRefresh}
                    isLoading={refreshLoading}
                    title={`Gửi email cho ${audienceStats?.gap} thành viên mới?`}
                    variant="warning"
                    confirmLabel="Xác nhận gửi ngay"
                    message={
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 font-medium leading-relaxed text-left">
                                Bạn đang kích hoạt gửi email chính cho những thành viên mới gia nhập danh sách/phân khúc mục tiêu.
                            </p>
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                    <Bell className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div className="space-y-1 text-left">
                                        <p className="text-xs font-black text-amber-900 uppercase tracking-wider">Lưu ý về Reminders</p>
                                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                            Các Reminder sẽ được lập lịch dựa trên thời điểm từng thành viên nhận được email chính này. Thành viên mới sẽ nhận được toàn bộ chuỗi Reminder theo đúng khoảng thời gian bạn đã thiết lập.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                                    <div className="space-y-1 text-left">
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Reminder Ngày cố định</p>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                            Nếu bạn có Reminder theo ngày cố định đã qua, các thành viên mới này sẽ tự động bỏ qua chúng để đảm bảo tính logic.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                <TestEmailModal
                    isOpen={showTestModal}
                    onClose={() => setShowTestModal(false)}
                    campaignId={localCampaign.id}
                    campaignName={localCampaign.name}
                />

                <ConfirmModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => !deleteModal.loading && setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={handleDeleteUnsubscribed}
                    title="Dọn dẹp người Unsubscribe"
                    message={
                        <div className="space-y-4">
                            <p className="text-slate-600">Bạn sắp xóa <span className="font-bold text-rose-600">{deleteModal.total || audienceStats?.count_unsubscribed || 0} người liên hệ</span> đã Hủy đăng ký từ chiến dịch này.</p>

                            {deleteModal.fetchingList ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                </div>
                            ) : deleteModal.list.length > 0 ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <table className="w-full text-left text-[11px]">
                                        <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-500 font-bold tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2">Email</th>
                                                <th className="px-3 py-2">Tên</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {deleteModal.list.map(sub => (
                                                <tr key={sub.id}>
                                                    <td className="px-3 py-2 font-medium text-slate-700 truncate max-w-[150px]">{sub.email}</td>
                                                    <td className="px-3 py-2 text-slate-500">{sub.first_name} {sub.last_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {deleteModal.totalPages > 1 && (
                                        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-500">Trang {deleteModal.page} / {deleteModal.totalPages}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setDeleteModal(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                                    disabled={deleteModal.page === 1}
                                                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                                                >
                                                    <ChevronLeft className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                                                    disabled={deleteModal.page === deleteModal.totalPages}
                                                    className="p-1 rounded bg-white border border-slate-200 disabled:opacity-50"
                                                >
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <h5 className="text-sm font-bold text-rose-800">Cảnh báo: Hành động Vĩnh viễn</h5>
                                    <p className="text-xs text-rose-700/80 mt-1">Các liên hệ này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu và không thể khôi phục. Mọi lịch sử tương tác cũng bị mất.</p>
                                </div>
                            </div>
                        </div>
                    }
                    variant="danger"
                    confirmLabel={deleteModal.loading ? "ĐANG XÓA..." : "XÓA VĨNH VIỄN"}
                />
            </div>
        </div>,
        document.body
    );
};

export default CampaignDetailDrawer;