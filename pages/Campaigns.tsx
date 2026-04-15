

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/storageAdapter';
import { Campaign, CampaignStatus, Subscriber, Segment, Template, Flow } from '../types';
import {

    Plus, TrendingUp, MousePointerClick,
    CheckCircle2, GitMerge, RefreshCw, FileText, CalendarClock, PieChart, Send, MailOpen,
    Search, ChevronLeft, ChevronRight, X, Lightbulb, ShieldCheck, Zap, Target, Sparkles, Clock
} from 'lucide-react';
import Button from '../components/common/Button';
import PageHero from '../components/common/PageHero';
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
import { useIsAdmin } from '../hooks/useAuthUser';

const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = useIsAdmin();

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // State for Wizard
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardInitialData, setWizardInitialData] = useState<Partial<Campaign> | undefined>(undefined);

    // Guard against React StrictMode double fetching
    const initialLoadDone = React.useRef(false);

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

    const [advancedDeleteModal, setAdvancedDeleteModal] = useState<{
        isOpen: boolean;
        campaignId: string | null;
        flows: Flow[];
        deleteFlowMode: number;
    }>({ isOpen: false, campaignId: null, flows: [], deleteFlowMode: 0 });

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

    useEffect(() => { 
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        fetchInitialData(); 
    }, []);

    useKeyboardShortcuts({
        'n': () => {
            setSelectedDetailCampaign(null);
            setWizardInitialData(undefined);
            setIsWizardOpen(true);
        }
    }, [setIsWizardOpen, setSelectedDetailCampaign, setWizardInitialData]);

    // Re-fetch campaigns when search or page changes (but not on initial mount)
    const isFirstRun = React.useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
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
            
            // Initial Campaigns Fetch (parallellized by the backend thanks to session unlock, but handled after the UI gets settings to avoid huge bundle stalls in JS thread)
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
        const payload = { ...data, status: CampaignStatus.DRAFT, stats: data.id ? undefined : { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 } };
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

    const executeDelete = async (id: string, deleteFlowMode: number) => {
        setLoading(true);
        try {
            const res = await api.delete(`campaigns/${id}?delete_flow=${deleteFlowMode}`);
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
            setAdvancedDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleDeleteCampaign = React.useCallback((id: string) => {
        // [FIX] Nếu đang xem campaign này thì đóng drawer lại
        setSelectedDetailCampaign(prev => prev?.id === id ? null : prev);

        const connectedFlows = allFlows.filter(f => {
            const trigger = f.steps.find(s => s.type === 'trigger');
            return trigger?.config.type === 'campaign' && trigger.config.targetId === id;
        });

        if (connectedFlows.length > 0) {
            setAdvancedDeleteModal({
                isOpen: true,
                campaignId: id,
                flows: connectedFlows,
                deleteFlowMode: 0
            });
        } else {
            setConfirmModal({
                isOpen: true,
                title: 'Xác nhận xóa chiến dịch',
                message: 'Bạn có chắc chắn muốn xóa chiến dịch này không? Toàn bộ dữ liệu kết quả và thống kê sẽ bị xóa vĩnh viễn.',
                variant: 'danger',
                requireConfirmText: 'DELETE',
                onConfirm: () => executeDelete(id, 1)
            });
        }
    }, [allFlows]);


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
        <div className="animate-fade-in space-y-8 pb-20">

            <PageHero 
                title={<>Campaign <span className="text-orange-100/80">Marketing</span></>}
                subtitle="Gửi Email & Zalo ZNS · theo dõi hiệu suất Thời gian thực với sức mạnh từ Trí tuệ nhân tạo."
                showStatus={true}
                statusText="AI Engine Active"
                actions={[
                    ...(isAdmin ? [{ 
                        label: 'Chiến dịch mới', 
                        icon: Plus, 
                        onClick: () => { setSelectedDetailCampaign(null); setWizardInitialData(undefined); setIsWizardOpen(true); },
                        primary: false 
                    }] : []),
                    { 
                        label: 'Mẹo tăng trưởng', 
                        icon: Lightbulb, 
                        onClick: () => setIsTipsModalOpen(true),
                        primary: true
                    }
                ]}
            />

            <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Tổng chiến dịch</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{campaigns.length}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <PieChart className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Tổng gửi (Email/ZNS)</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.totalSent.toLocaleString()}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <Send className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Tỷ lệ mở trung bình</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.openRate}%</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <MailOpen className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Lượt Click</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{stats.totalClicked.toLocaleString()}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl shadow-lg shadow-rose-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <MousePointerClick className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Table section */}
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs + Search + Filter — single clean row */}
                <div className="px-4 lg:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Status tabs */}
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab as any}
                        items={[
                            { id: 'all', label: 'Tất cả', icon: PieChart },
                            { id: 'sent', label: 'đã gửi', icon: CheckCircle2 },
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
                                className="w-44 pl-8 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-amber-600/20 focus:border-amber-400/50 transition-all outline-none"
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
        </div>{/* close space-y-8 */}

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

            <ConfirmModal
                isOpen={advancedDeleteModal.isOpen}
                onClose={() => setAdvancedDeleteModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    if (advancedDeleteModal.campaignId) {
                        executeDelete(advancedDeleteModal.campaignId, advancedDeleteModal.deleteFlowMode);
                    }
                }}
                title="Xác nhận xóa chiến dịch"
                message={
                    <div className="space-y-4">
                        <p className="text-slate-600">Bạn sắp xóa một chiến dịch đang được kết nối với <b>{advancedDeleteModal.flows.length} kịch bản (Flow)</b> chăm sóc.</p>
                        <div className="space-y-2 mt-4">
                            <label className={`block border p-4 rounded-xl cursor-pointer transition-all ${advancedDeleteModal.deleteFlowMode === 0 ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-start gap-3">
                                    <input 
                                        type="radio" 
                                        name="delete_flow" 
                                        checked={advancedDeleteModal.deleteFlowMode === 0}
                                        onChange={() => setAdvancedDeleteModal(prev => ({ ...prev, deleteFlowMode: 0 }))}
                                        className="mt-1"
                                    />
                                    <div>
                                        <b className="text-slate-800 block">Giữ lại Flow (Chỉ gỡ kết nối)</b>
                                        <p className="text-xs text-slate-500 mt-1">Chiến dịch sẽ bị xóa, nhưng Kịch bản chăm sóc sẽ được giữ lại. Nút Trigger sẽ trở về trạng thái trống (Disconnected).</p>
                                    </div>
                                </div>
                            </label>
                            
                            <label className={`block border p-4 rounded-xl cursor-pointer transition-all ${advancedDeleteModal.deleteFlowMode === 1 ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-start gap-3">
                                    <input 
                                        type="radio" 
                                        name="delete_flow" 
                                        checked={advancedDeleteModal.deleteFlowMode === 1}
                                        onChange={() => setAdvancedDeleteModal(prev => ({ ...prev, deleteFlowMode: 1 }))}
                                        className="mt-1 accent-rose-600"
                                    />
                                    <div>
                                        <b className="text-rose-800 block">Xóa TOÀN BỘ (Cả Campaign & Flow)</b>
                                        <p className="text-xs text-rose-600/80 mt-1">Hành động này sẽ xóa vĩnh viễn chiến dịch và tất cả {advancedDeleteModal.flows.length} flow đang theo dõi chiến dịch này.</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                }
                variant={advancedDeleteModal.deleteFlowMode === 1 ? 'danger' : 'warning'}
                requireConfirmText="DELETE"
            />

            <TipsModal
                isOpen={isTipsModalOpen}
                onClose={() => setIsTipsModalOpen(false)}
                title="Mẹo Chiến dịch"
                subtitle="Tối ưu hóa nội dung & Tỉ lệ chuyển đổi"
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
                        title: "Cònhân hóa nội dung",
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
                        description: "Kết nối với Flow chăm sóc ngay sau khi gửi để tối đa hóa điểm chạm Khách hàng.",
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