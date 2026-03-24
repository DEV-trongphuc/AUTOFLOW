

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/storageAdapter';
import { Campaign, CampaignStatus, Subscriber, Segment, Template, Flow } from '../types';
import {

    Plus, TrendingUp, MousePointerClick,
    CheckCircle2, GitMerge, RefreshCw, FileText, CalendarClock, PieChart, Send, MailOpen,
    Search, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import toast from 'react-hot-toast';
import CampaignList from './Campaigns/CampaignList';
import CampaignDetailDrawer from '../components/campaigns/CampaignDetailDrawer';
import FlowReviewModal from '../components/campaigns/FlowReviewModal';
import CampaignWizard from '../components/campaigns/CampaignWizard';
import ConfirmModal from '../components/common/ConfirmModal';
import InfoCard from '../components/common/InfoCard';
import Tabs from '../components/common/Tabs'; // Import Tabs
import TabTransition from '../components/common/TabTransition';
import { useNavigate, useLocation } from 'react-router-dom';
import { SYSTEM_TEMPLATES } from '../services/systemTemplates';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import TipsModal from '../components/common/TipsModal';
import { Lightbulb, Target, Sparkles, Zap, Clock, ShieldCheck } from 'lucide-react';

const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // State for Wizard
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardInitialData, setWizardInitialData] = useState<Partial<Campaign> | undefined>(undefined);

    // Filtering & Viewing
    const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'scheduled' | 'draft' | 'waiting'>('all');
    const [activeType, setActiveType] = useState<'all' | 'email' | 'zalo_zns'>('all');
    const [selectedDetailCampaign, setSelectedDetailCampaign] = useState<Campaign | null>(null);

    // Flow Review State
    const [flowReviewData, setFlowReviewData] = useState<{ campaign: Campaign, flow: Flow | null } | null>(null);
    const [isStartingFlow, setIsStartingFlow] = useState(false);

    // Modals
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
        requireConfirmText?: string;
    }>({ isOpen: false, title: '', message: '', variant: 'warning', onConfirm: () => { } });

    const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);

    // Data
    const [allLists, setAllLists] = useState<any[]>([]);
    const [allSegments, setAllSegments] = useState<Segment[]>([]);
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [allFlows, setAllFlows] = useState<Flow[]>([]);
    const [allTags, setAllTags] = useState<{ id: string, name: string, count: number }[]>([]);
    const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => { fetchInitialData(); }, []);

    useKeyboardShortcuts({
        'n': () => {
            setSelectedDetailCampaign(null);
            setWizardInitialData(undefined);
            setIsWizardOpen(true);
        }
    }, [setIsWizardOpen, setSelectedDetailCampaign, setWizardInitialData]);

    // Re-fetch campaigns when search or page changes
    useEffect(() => {
        loadCampaigns(pagination.page, debouncedSearch);
    }, [debouncedSearch, pagination.page]);

    // Fast polling (2s) for active campaigns
    useEffect(() => {
        const hasPending = campaigns.some(c => c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING);
        if (hasPending) {
            const interval = setInterval(() => {
                const query = new URLSearchParams({
                    page: pagination.page.toString(),
                    limit: pagination.limit.toString(),
                    search: debouncedSearch
                });
                api.get<any>(`campaigns?${query.toString()}`).then(res => {
                    if (res.success && res.data.data) setCampaigns(res.data.data);
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [campaigns, pagination.page, debouncedSearch]);

    const loadCampaigns = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
                search: search
            });
            const res = await api.get<any>(`campaigns?${query.toString()}`);
            if (res.success) {
                if (res.data.pagination) {
                    setCampaigns(res.data.data);
                    setPagination(res.data.pagination);
                } else if (Array.isArray(res.data)) {
                    setCampaigns(res.data);
                }
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [lRes, sRes, tRes, fRes, tagRes, settingRes] = await Promise.all([
                api.get<any[]>('lists'),
                api.get<Segment[]>('segments'),
                api.get<Template[]>('templates'),
                api.get<Flow[]>('flows'),
                api.get<{ id: string, name: string, subscriber_count: number }[]>('tags'),
                api.get<any>('settings')
            ]);
            if (lRes.success) setAllLists(lRes.data);
            if (sRes.success) setAllSegments(sRes.data);
            if (tRes.success) {
                setAllTemplates(tRes.data);
            }
            if (fRes.success) setAllFlows(fRes.data);

            if (tagRes.success) {
                setAllTags(tagRes.data.map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    count: tag.subscriber_count || 0
                })));
            }

            await loadCampaigns(1, debouncedSearch);

            // Logic to sync verified emails from Settings (Source of Truth)
            let currentSaved: string[] = JSON.parse(localStorage.getItem('mailflow_verified_emails') || '[]');

            if (settingRes.success && settingRes.data) {
                const configEmail = settingRes.data.smtp_from_email || settingRes.data.smtp_user;
                if (configEmail && configEmail.includes('@')) {
                    // Check if configEmail is already in the list, if not add it to TOP
                    if (!currentSaved.includes(configEmail)) {
                        currentSaved = [configEmail, ...currentSaved];
                    }
                }
            }

            // Fallback default
            if (currentSaved.length === 0) {
                currentSaved = ['marketing@ka-en.com.vn'];
            }

            localStorage.setItem('mailflow_verified_emails', JSON.stringify(currentSaved));
            setVerifiedEmails(currentSaved);
        } catch (error) {
            showToast('Không thể tải dữ liệu chiến dịch', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const navState = (location as any).state;
        if (navState?.openCampaignId && campaigns.length > 0) {
            const targetId = navState.openCampaignId;
            const targetCamp = campaigns.find(c => c.id === targetId);
            if (targetCamp) {
                setSelectedDetailCampaign(targetCamp);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, campaigns]);

    const filteredCampaigns = useMemo(() => {
        let list = campaigns;

        // Filter by Status Tab
        if (activeTab === 'sent') list = list.filter(c => c.status === CampaignStatus.SENT);
        else if (activeTab === 'scheduled') list = list.filter(c => c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING);
        else if (activeTab === 'waiting') list = list.filter(c => c.status === CampaignStatus.WAITING_FLOW);
        else if (activeTab === 'draft') list = list.filter(c => c.status === CampaignStatus.DRAFT);

        // Filter by Campaign Type
        if (activeType === 'email') {
            list = list.filter(c => c.type === 'email' || !c.type);
        } else if (activeType === 'zalo_zns') {
            list = list.filter(c => c.type === 'zalo_zns');
        }

        return list;
    }, [campaigns, activeTab, activeType]);

    const stats = useMemo(() => {
        const totalSent = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
        const totalOpened = campaigns.reduce((acc, c) => acc + (c.stats?.opened || 0), 0);
        const totalClicked = campaigns.reduce((acc, c) => acc + (c.stats?.clicked || 0), 0);
        const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
        return { totalSent, totalOpened, totalClicked, openRate };
    }, [campaigns]);

    const handleSaveDraft = React.useCallback(async (data: Partial<Campaign>) => {
        const payload = { ...data, status: CampaignStatus.DRAFT, stats: data.id ? undefined : { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0 } };
        try {
            let res;
            if (data.id) res = await api.put<Campaign>(`campaigns/${data.id}`, payload);
            else res = await api.post<Campaign>('campaigns', payload);

            if (res.success) {
                showToast('Đã lưu nháp chiến dịch!', 'success');
                fetchInitialData();
                setWizardInitialData(res.data);
                return res.data;
            } else {
                showToast(res.message || 'Lỗi khi lưu bản nháp', 'error');
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi lưu bản nháp', 'error');
        }
        return null;
    }, []);

    const handlePublish = React.useCallback(async (data: Partial<Campaign>, options: { connectFlow: boolean, activateFlowId: string | null }) => {
        let finalStatus = CampaignStatus.SCHEDULED;
        const scheduleTime = data.scheduledAt;

        if (options.connectFlow && !options.activateFlowId) {
            finalStatus = CampaignStatus.WAITING_FLOW;
        } else if (options.connectFlow && options.activateFlowId) {
            if (!scheduleTime) finalStatus = CampaignStatus.SENDING;
        } else if (!scheduleTime) {
            finalStatus = CampaignStatus.SENDING;
        }

        const payload = {
            ...data,
            status: finalStatus,
            sentAt: finalStatus === CampaignStatus.SENDING ? new Date().toISOString() : data.sentAt,
            scheduledAt: scheduleTime
        };

        try {
            let res;
            if (data.id) res = await api.put<Campaign>(`campaigns/${data.id}`, payload);
            else res = await api.post<Campaign>('campaigns', payload);

            if (res.success) {
                const campId = data.id || res.data.id;

                if (finalStatus === CampaignStatus.SENDING) {
                    api.post(`campaigns?route=trigger_refresh`, { id: campId });
                }

                if (options.connectFlow && options.activateFlowId) {
                    const flow = allFlows.find(f => f.id === options.activateFlowId);
                    if (flow) {
                        const updatedSteps = flow.steps.map(s => {
                            if (s.type === 'trigger') {
                                return {
                                    ...s,
                                    config: { ...s.config, type: 'campaign', targetId: campId }
                                };
                            }
                            return s;
                        });
                        await api.put(`flows/${options.activateFlowId}`, {
                            status: 'active',
                            steps: updatedSteps,
                            activate_campaign: true
                        });
                    }
                } else if (options.connectFlow && !options.activateFlowId) {
                    setTimeout(() => {
                        navigate('/flows', {
                            state: {
                                action: 'create',
                                campaignId: campId,
                                templateId: 'campaign_tracking',
                                flowName: `Chăm sóc sau Chiến dịch ${data.name}`
                            }
                        });
                    }, 300);
                }

                showToast(finalStatus === CampaignStatus.SENDING ? 'Chiến dịch đang được gửi!' : 'Đã lên lịch gửi chiến dịch!', 'success');
                fetchInitialData();
                // [FIX] focus on the new campaign report after publishing
                setSelectedDetailCampaign(res.data);
                return res.data;
            } else {
                showToast(res.message || 'Lỗi khi đăng chiến dịch', 'error');
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi đăng chiến dịch', 'error');
        }
        return null;
    }, [allFlows, navigate]);

    const handleDeleteCampaign = React.useCallback((id: string) => {
        // [FIX] Nếu đang xem campaign này thì đóng drawer lại
        setSelectedDetailCampaign(prev => prev?.id === id ? null : prev);

        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận xóa chiến dịch',
            message: 'Bạn có chắc chắn muốn xóa chiến dịch này không? Toàn bộ dữ liệu kết quả và thống kê sẽ bị xóa vĩnh viễn.',
            variant: 'danger',
            requireConfirmText: 'DELETE',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await api.delete(`campaigns/${id}`);
                    if (res.success) {
                        showToast('Đã xóa chiến dịch thành công!');
                        fetchInitialData();
                    } else {
                        showToast(res.message || 'Lỗi khi xóa chiến dịch', 'error');
                    }
                } catch (error) {
                    showToast('Đã xảy ra lỗi hệ thống khi xóa chiến dịch', 'error');
                } finally {
                    setLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    }, []);


    const handlePlayClick = React.useCallback((campaign: Campaign) => {
        // Find if there's a flow triggered by this campaign
        const flow = allFlows.find(f => {
            const trigger = f.steps.find(s => s.type === 'trigger');
            return trigger?.config.type === 'campaign' && trigger.config.targetId === campaign.id;
        });

        if (flow) {
            setFlowReviewData({ campaign, flow });
        } else {
            showToast('Chiến dịch này chưa được kết nối với kịch bản chăm sóc nào.', 'info');
        }
    }, [allFlows]);

    const handleConfirmStart = async () => {
        if (!flowReviewData) return;
        setIsStartingFlow(true);
        try {
            const res = await api.put(`flows/${flowReviewData.flow.id}`, { status: 'active' });
            if (res.success) {
                showToast('Kịch bản chăm sóc đã được kích hoạt!');
                fetchInitialData();
            }
        } catch (e) {
            showToast('Không thể kích hoạt kịch bản.', 'error');
        } finally {
            setIsStartingFlow(false);
            setFlowReviewData(null);
        }
    };
    return (
        <div className="animate-in fade-in duration-500 pb-20 max-w-full mx-auto">

            {/* Keyframes */}
            <style>{`
                @keyframes shimmer-x { 0%{transform:translateX(-100%)} 100%{transform:translateX(300%)} }
                @keyframes blink-dot { 0%,100%{opacity:1} 50%{opacity:0.15} }
                @keyframes float-up { 0%{transform:translateY(0) scale(1);opacity:0.5} 100%{transform:translateY(-70px) scale(0);opacity:0} }
                @keyframes count-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulse-ring { 0%,100%{opacity:0.25;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.14)} }
                @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes slide-in-badge { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
                @keyframes bar-grow { from{width:0%} to{width:var(--bar-w)} }
            `}</style>

            {/* ── Single seamless card: dark hero + white table ── */}
            <div className="rounded-[28px] lg:rounded-[40px] overflow-hidden shadow-2xl border border-white/10" style={{boxShadow:'0 25px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06)'}}>

                {/* ── DARK HERO ── */}
                <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg, #09101f 0%, #0f1729 25%, #161042 55%, #0d1525 80%, #07101e 100%)'}}>

                    {/* Atmospheric glow orbs */}
                    <div className="absolute -top-32 -left-20 w-96 h-96 bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute -bottom-28 -right-12 w-[360px] h-[360px] bg-violet-600/12 rounded-full blur-[110px] pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-28 bg-indigo-500/6 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute top-0 right-1/4 w-40 h-40 bg-amber-400/5 rounded-full blur-[60px] pointer-events-none" />

                    {/* Subtle dot grid */}
                    <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:'radial-gradient(circle, #94a3b8 0.7px, transparent 0.7px)', backgroundSize:'20px 20px'}} />

                    {/* Top shimmer line */}
                    <div className="absolute top-0 left-0 right-0 h-px" style={{background:'linear-gradient(90deg,transparent 0%,rgba(245,158,11,0.5) 30%,rgba(251,191,36,0.8) 50%,rgba(245,158,11,0.5) 70%,transparent 100%)'}} />

                    {/* Floating amber particles */}
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute w-[3px] h-[3px] rounded-full pointer-events-none"
                            style={{background: i%2===0 ? 'rgba(251,191,36,0.55)' : 'rgba(167,139,250,0.45)', left:`${6+i*12}%`, bottom:`${20+(i%3)*14}%`, animation:`float-up ${2.6+i*0.45}s ease-out ${i*0.3}s infinite`}} />
                    ))}

                    {/* Corner brackets */}
                    <div className="absolute top-4 left-4 pointer-events-none">
                        <div className="w-8 h-px bg-gradient-to-r from-amber-400/70 to-transparent" />
                        <div className="h-8 w-px bg-gradient-to-b from-amber-400/70 to-transparent" />
                    </div>
                    <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end">
                        <div className="h-8 w-px bg-gradient-to-t from-violet-400/50 to-transparent" />
                        <div className="w-8 h-px bg-gradient-to-l from-violet-400/50 to-transparent" />
                    </div>

                    <div className="relative z-10 px-6 lg:px-10 pt-8 lg:pt-10 pb-10 lg:pb-12">

                        {/* Title row */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-8">
                            <div className="flex-1 min-w-0">
                                {/* Live badge */}
                                <div className="inline-flex items-center gap-2 mb-4 pl-3 pr-4 py-1.5 rounded-full border" style={{background:'rgba(245,158,11,0.08)', borderColor:'rgba(245,158,11,0.22)', animation:'slide-in-badge 0.5s ease-out both'}}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{animation:'blink-dot 1.2s ease-in-out infinite'}} />
                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.22em]">AI-Powered Campaign Engine</span>
                                </div>

                                <h1 className="text-2xl lg:text-[2.2rem] font-black text-white tracking-tight leading-[1.1] mb-3">
                                    Campaign{' '}
                                    <span style={{
                                        background:'linear-gradient(90deg,#f59e0b 0%,#fbbf24 45%,#fde68a 75%,#fbbf24 100%)',
                                        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                                        backgroundClip:'text'
                                    }}>Marketing</span>
                                </h1>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                                    Gửi Email &amp; Zalo ZNS · theo dõi hiệu suất{' '}
                                    <span className="text-amber-400 font-semibold">thời gian thực</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 lg:mt-1">
                                <button
                                    onClick={() => setIsTipsModalOpen(true)}
                                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300"
                                    style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)'}}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.11)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(245,158,11,0.4)'; (e.currentTarget as HTMLButtonElement).style.color='white'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.7)'; }}
                                >
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                    Mẹo tăng trưởng
                                </button>
                                <button
                                    onClick={() => { setSelectedDetailCampaign(null); setWizardInitialData(undefined); setIsWizardOpen(true); }}
                                    className="relative flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden"
                                    style={{background:'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow:'0 4px 24px rgba(245,158,11,0.45), 0 0 0 1px rgba(249,115,22,0.3)'}}
                                >
                                    <span className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)', animation:'shimmer-x 2.2s ease-in-out infinite'}} />
                                    <Plus className="w-3.5 h-3.5 relative z-10" />
                                    <span className="relative z-10">Chiến dịch mới</span>
                                </button>
                            </div>
                        </div>

                        {/* 3 Stat Cards — glassmorphism on dark */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Card 1 — Email đã gửi */}
                            <div className="group relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-0.5"
                                style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', boxShadow:'0 4px 20px rgba(0,0,0,0.25)'}}>
                                {/* Top accent bar */}
                                <div className="absolute top-0 left-4 right-4 h-px" style={{background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)'}} />
                                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{background:'linear-gradient(135deg,rgba(168,85,247,0.06) 0%,transparent 60%)'}} />

                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                                        style={{background:'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(124,58,237,0.35))', border:'1px solid rgba(168,85,247,0.3)', boxShadow:'0 4px 16px rgba(168,85,247,0.2)'}}>
                                        <Send className="w-5 h-5" style={{color:'rgba(216,180,254,1)'}} />
                                    </div>
                                    <div className="absolute inset-0 rounded-[14px] border border-purple-400/20" style={{animation:'pulse-ring 2.5s ease-in-out infinite'}} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{color:'rgba(148,163,184,0.8)'}}>Email đã gửi</p>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.25)'}}>
                                            <div className="w-1 h-1 rounded-full bg-purple-400" style={{animation:'blink-dot 1.5s infinite'}} />
                                            <span className="text-[7px] font-black text-purple-300 uppercase">Live</span>
                                        </div>
                                    </div>
                                    <p className="text-[1.9rem] font-black text-white tracking-tight leading-none" style={{animation:'count-up 0.6s ease-out both', textShadow:'0 0 20px rgba(168,85,247,0.3)'}}>
                                        {stats.totalSent.toLocaleString()}
                                    </p>
                                    <div className="mt-2.5 h-[3px] w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                                        <div className="h-full rounded-full" style={{background:'linear-gradient(90deg,#a855f7,#7c3aed)', width:stats.totalSent>0?'78%':'0%', transition:'width 1.6s cubic-bezier(0.4,0,0.2,1)'}} />
                                    </div>
                                </div>

                                <div className="shrink-0 hidden lg:flex flex-col items-center gap-1 opacity-50">
                                    <TrendingUp className="w-4 h-4 text-purple-300" />
                                    <p className="text-[8px] font-black text-purple-300 uppercase tracking-wider">Total</p>
                                </div>
                            </div>

                            {/* Card 2 — Tỷ lệ mở */}
                            <div className="group relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-0.5"
                                style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', boxShadow:'0 4px 20px rgba(0,0,0,0.25)'}}>
                                <div className="absolute top-0 left-4 right-4 h-px" style={{background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.6),transparent)'}} />
                                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{background:'linear-gradient(135deg,rgba(56,189,248,0.06) 0%,transparent 60%)'}} />

                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                                        style={{background:'linear-gradient(135deg,rgba(56,189,248,0.25),rgba(37,99,235,0.35))', border:'1px solid rgba(56,189,248,0.3)', boxShadow:'0 4px 16px rgba(56,189,248,0.2)'}}>
                                        <MailOpen className="w-5 h-5" style={{color:'rgba(186,230,253,1)'}} />
                                    </div>
                                    <div className="absolute inset-0 rounded-[14px] border border-sky-400/20" style={{animation:'pulse-ring 2.5s 0.5s ease-in-out infinite'}} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{color:'rgba(148,163,184,0.8)'}}>Tỷ lệ mở</p>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.25)'}}>
                                            <div className="w-1 h-1 rounded-full bg-sky-400" style={{animation:'blink-dot 1.8s infinite'}} />
                                            <span className="text-[7px] font-black text-sky-300 uppercase">Rate</span>
                                        </div>
                                    </div>
                                    <p className="text-[1.9rem] font-black text-white tracking-tight leading-none" style={{animation:'count-up 0.6s 0.1s ease-out both', textShadow:'0 0 20px rgba(56,189,248,0.25)'}}>
                                        {stats.openRate}<span className="text-lg font-bold" style={{color:'rgba(148,163,184,0.7)'}}>%</span>
                                    </p>
                                    <div className="mt-2.5 h-[3px] w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                                        <div className="h-full rounded-full" style={{background:'linear-gradient(90deg,#38bdf8,#2563eb)', width:`${Math.min(Number(stats.openRate)*4,100)}%`, transition:'width 1.6s cubic-bezier(0.4,0,0.2,1) 0.2s'}} />
                                    </div>
                                </div>

                                <div className="shrink-0 hidden lg:flex flex-col items-center gap-1 opacity-50">
                                    <MailOpen className="w-4 h-4 text-sky-300" />
                                    <p className="text-[8px] font-black text-sky-300 uppercase tracking-wider">Open</p>
                                </div>
                            </div>

                            {/* Card 3 — Lượt click */}
                            <div className="group relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden cursor-default transition-all duration-300 hover:-translate-y-0.5"
                                style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(12px)', boxShadow:'0 4px 20px rgba(0,0,0,0.25)'}}>
                                <div className="absolute top-0 left-4 right-4 h-px" style={{background:'linear-gradient(90deg,transparent,rgba(52,211,153,0.6),transparent)'}} />
                                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{background:'linear-gradient(135deg,rgba(52,211,153,0.06) 0%,transparent 60%)'}} />

                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                                        style={{background:'linear-gradient(135deg,rgba(52,211,153,0.25),rgba(13,148,136,0.35))', border:'1px solid rgba(52,211,153,0.3)', boxShadow:'0 4px 16px rgba(52,211,153,0.2)'}}>
                                        <MousePointerClick className="w-5 h-5" style={{color:'rgba(167,243,208,1)'}} />
                                    </div>
                                    <div className="absolute inset-0 rounded-[14px] border border-emerald-400/20" style={{animation:'pulse-ring 2.5s 1s ease-in-out infinite'}} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{color:'rgba(148,163,184,0.8)'}}>Lượt click link</p>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.25)'}}>
                                            <div className="w-1 h-1 rounded-full bg-emerald-400" style={{animation:'blink-dot 1.3s infinite'}} />
                                            <span className="text-[7px] font-black text-emerald-300 uppercase">CTR</span>
                                        </div>
                                    </div>
                                    <p className="text-[1.9rem] font-black text-white tracking-tight leading-none" style={{animation:'count-up 0.6s 0.2s ease-out both', textShadow:'0 0 20px rgba(52,211,153,0.25)'}}>
                                        {stats.totalClicked.toLocaleString()}
                                    </p>
                                    <div className="mt-2.5 h-[3px] w-full rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                                        <div className="h-full rounded-full" style={{background:'linear-gradient(90deg,#34d399,#0d9488)', width:stats.totalClicked>0?'60%':'0%', transition:'width 1.6s cubic-bezier(0.4,0,0.2,1) 0.4s'}} />
                                    </div>
                                </div>

                                <div className="shrink-0 hidden lg:flex flex-col items-center gap-1 opacity-50">
                                    <MousePointerClick className="w-4 h-4 text-emerald-300" />
                                    <p className="text-[8px] font-black text-emerald-300 uppercase tracking-wider">Clicks</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seamless fade divider */}
                <div className="h-px" style={{background:'linear-gradient(90deg, transparent, rgba(148,163,184,0.15) 20%, rgba(148,163,184,0.15) 80%, transparent)'}} />

            {/* Table section */}
            <div className="bg-white overflow-hidden">
                {/* Tabs + Search + Filter — single clean row */}
                <div className="px-4 lg:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Status tabs */}
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab as any}
                        items={[
                            { id: 'all', label: 'Tất cả', icon: PieChart },
                            { id: 'sent', label: 'Đã gửi', icon: CheckCircle2 },
                            { id: 'waiting', label: 'Chờ Flow', icon: GitMerge },
                            { id: 'scheduled', label: 'Đang xử lý', icon: CalendarClock },
                            { id: 'draft', label: 'Bản nháp', icon: FileText }
                        ]}
                    />

                    {/* Right: Search + Type filter */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm chiến dịch..."
                                className="w-44 pl-8 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/50 transition-all outline-none"
                            />
                        </div>

                        {/* Type segmented control */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                            {[
                                { value: 'all', label: 'Tất cả' },
                                { value: 'email', label: 'Email' },
                                { value: 'zalo_zns', label: 'Zalo ZNS' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setActiveType(value as any)}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                                        activeType === value
                                            ? 'bg-white text-slate-800 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List Component */}
                <TabTransition key={activeTab + activeType}>
                    <CampaignList
                        campaigns={filteredCampaigns}
                        loading={loading}
                        onSelect={React.useCallback((c: Campaign) => setSelectedDetailCampaign(c), [])}
                        onEdit={React.useCallback((c: Campaign) => {
                            setSelectedDetailCampaign(null); // [FIX] Clear old report when editing
                            setWizardInitialData(c);
                            setIsWizardOpen(true);
                        }, [])}
                        onDelete={handleDeleteCampaign}
                        onPlayFlow={handlePlayClick}
                    />
                </TabTransition>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Trang {pagination.page.toLocaleString()} / {pagination.totalPages.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={ChevronLeft}
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                            />
                            <Button
                                size="sm"
                                variant="secondary"

                                icon={ChevronRight}
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                                disabled={pagination.page === pagination.totalPages}
                            />
                        </div>
                    </div>

                )}
            </div>{/* close overflow-hidden */}
            </div>{/* close seamless bg-white wrapper */}

            {/* Modals */}
            <CampaignWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                initialData={wizardInitialData}
                allLists={allLists}
                allSegments={allSegments}
                allTags={allTags}
                allTemplates={allTemplates}
                allFlows={allFlows}
                senderEmails={verifiedEmails}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
            />

            <CampaignDetailDrawer
                campaign={selectedDetailCampaign}
                isOpen={!!selectedDetailCampaign}
                onClose={() => setSelectedDetailCampaign(null)}
                allLists={allLists}
                allSegments={allSegments}
                allTags={allTags}
                allFlows={allFlows}
            />

            <FlowReviewModal isOpen={!!flowReviewData} onClose={() => setFlowReviewData(null)} onConfirm={handleConfirmStart} campaign={flowReviewData?.campaign || null} flow={flowReviewData?.flow || null} isProcessing={isStartingFlow} />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                requireConfirmText={confirmModal.requireConfirmText}
            />

            <TipsModal
                isOpen={isTipsModalOpen}
                onClose={() => setIsTipsModalOpen(false)}
                title="Mẹo Chiến dịch"
                subtitle="Tối ưu hóa nội dung & Tỷ lệ chuyển đổi"
                accentColor="blue"
                tips={[
                    {
                        icon: Clock,
                        title: "Golden Hour",
                        description: "Gửi tin nhắn vào lúc 8h-9h sáng để đạt tỷ lệ mở cao nhất trong ngày.",
                        colorClass: "bg-gradient-to-br from-amber-400 to-amber-600",
                        highlight: "Hiệu quả"
                    },
                    {
                        icon: Sparkles,
                        title: "Cá nhân hóa nội dung",
                        description: "Sử dụng tag {first_name} trong tiêu đề để tăng tới 25% tỷ lệ click.",
                        colorClass: "bg-gradient-to-br from-blue-400 to-indigo-500",
                        highlight: "Mẹo hay"
                    },
                    {
                        icon: Target,
                        title: "Smart Tracking",
                        description: "Luôn bật theo dõi click để biết chính xác ai quan tâm đến sản phẩm của bạn.",
                        colorClass: "bg-gradient-to-br from-indigo-500 to-purple-600"
                    },
                    {
                        icon: Zap,
                        title: "Follow-up tự động",
                        description: "Kết nối với Flow chăm sóc ngay sau khi gửi để tối đa hóa điểm chạm khách hàng.",
                        colorClass: "bg-gradient-to-br from-emerald-400 to-teal-500",
                        highlight: "Nâng cao"
                    },
                    {
                        icon: ShieldCheck,
                        title: "Vệ sinh tệp gửi",
                        description: "Chỉ gửi tới những liên hệ active trong 30 ngày qua để bảo vệ uy tín đầu gửi.",
                        colorClass: "bg-gradient-to-br from-rose-400 to-rose-600"
                    }
                ]}
            />
        </div >
    );
};

export default Campaigns;