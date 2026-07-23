

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/storageAdapter';
import { Campaign, CampaignStatus, Subscriber, Segment, Template, Flow } from '../types';
import {

    Plus, TrendingUp, MousePointerClick,
    CheckCircle2, GitMerge, RefreshCw, FileText, CalendarClock, PieChart, Send, MailOpen,
    Search, ChevronLeft, ChevronRight, X, Lightbulb, ShieldCheck, Zap, Target, Sparkles, Clock
} from 'lucide-react';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
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
import { usePermissionGuard } from '../components/common/PermissionGuard';
import { useSettings } from '../components/contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/common/Modal';
import { logAction } from '../services/historyService';


import SesQuotaWidget from '../components/common/SesQuotaWidget';
import StatCard from '../components/common/StatCard';

const TAB_ITEMS = [
    { id: 'all', label: 'Tất cả', icon: PieChart },
    { id: 'sent', label: 'Đã gửi', icon: CheckCircle2 },
    { id: 'waiting', label: 'Chờ Flow', icon: GitMerge },
    { id: 'scheduled', label: 'Đang xử lý', icon: CalendarClock },
    { id: 'draft', label: 'Bản nháp', icon: FileText }
] as const;

const TYPE_TABS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'email', label: 'Email' },
    { value: 'zalo_zns', label: 'Zalo ZNS' }
] as const;

const Campaigns: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = useIsAdmin();
    const { guard: adminGuard, PermModal: AdminPermModal } = usePermissionGuard(isAdmin);
    const { isDark } = useTheme();

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
    const [datePreset, setDatePreset] = useState<'7' | '30' | '90' | 'month' | 'all' | 'custom'>('90');
    const [customDate, setCustomDate] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [selectedDetailCampaign, setSelectedDetailCampaign] = useState<Campaign | null>(null);

    // Flow Review State
    const [flowReviewData, setFlowReviewData] = useState<{ campaign: Campaign, flow: Flow | null } | null>(null);
    const [isStartingFlow, setIsStartingFlow] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
    // Quick AWS quota preview for hero button badge
    const [awsQuickInfo, setAwsQuickInfo] = useState<{ remaining: number; usage_pct: number } | null>(null);

    // Data
    const [allLists, setAllLists] = useState<any[]>([]);
    const [allSegments, setAllSegments] = useState<Segment[]>([]);
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [allFlows, setAllFlows] = useState<Flow[]>([]);
    const [allTags, setAllTags] = useState<{ id: string, name: string, count: number }[]>([]);
    // [FIX] Dùng global SettingsContext — đã load sẵn khi app khởi động
    const { senderEmails: verifiedEmails } = useSettings();

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
        // Pre-fetch AWS quick info for QUOTA hero button badge
        api.get<any>('ses_quota').then(r => {
            if (r.success && r.data?.aws) {
                setAwsQuickInfo({ remaining: r.data.aws.remaining, usage_pct: r.data.aws.usage_pct });
            }
        }).catch(() => { });
    }, []);

    useKeyboardShortcuts({
        'n': () => {
            setSelectedDetailCampaign(null);
            setWizardInitialData(undefined);
            setIsWizardOpen(true);
        }
    }, [setIsWizardOpen, setSelectedDetailCampaign, setWizardInitialData]);

    // Re-fetch campaigns when search, page, or dates change (but not on initial mount)
    const isFirstRun = React.useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (datePreset === 'custom' && (!customDate.start || !customDate.end)) return;
        loadCampaigns(pagination.page, debouncedSearch);
    }, [debouncedSearch, pagination.page, datePreset, customDate.start, customDate.end]);

    // Fast polling (5s) for active campaigns - Refactored to avoid remounting
    const campaignsRef = React.useRef(campaigns);
    useEffect(() => { campaignsRef.current = campaigns; }, [campaigns]);

    const getActiveDates = React.useCallback(() => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (datePreset) {
            case '7':
                start.setDate(today.getDate() - 7);
                break;
            case '30':
                start.setDate(today.getDate() - 30);
                break;
            case '90':
                start.setDate(today.getDate() - 90);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'all':
                return { startDate: '', endDate: '' }; // No date filter
            case 'custom':
                if (!customDate.start || !customDate.end) return { startDate: '', endDate: '' };
                return { startDate: customDate.start, endDate: customDate.end };
        }

        const formatDate = (d: Date) => {
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };

        return { startDate: formatDate(start), endDate: formatDate(end) };
    }, [datePreset, customDate]);

    const pollingData = React.useRef({ page: pagination.page, limit: pagination.limit, search: debouncedSearch, dates: getActiveDates() });
    useEffect(() => { pollingData.current = { page: pagination.page, limit: pagination.limit, search: debouncedSearch, dates: getActiveDates() }; }, [pagination.page, pagination.limit, debouncedSearch, getActiveDates]);

    useEffect(() => {
        let isMounted = true;
        const interval = setInterval(() => {
            // [FIX P7-H4] Include PAUSED in hasPending so auto-refresh continues after Circuit Breaker trips.
            // Without this, the UI stops polling when paused — manual campaign resume from another tab never reflects.
            const hasPending = campaignsRef.current.some(c => c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING || c.status === CampaignStatus.PAUSED);
            if (hasPending && isMounted) {
                const { startDate, endDate } = pollingData.current.dates;
                const queryParams: Record<string, string> = {
                    page: pollingData.current.page.toString(),
                    limit: pollingData.current.limit.toString(),
                    search: pollingData.current.search
                };
                if (startDate) queryParams.startDate = startDate;
                if (endDate) queryParams.endDate = endDate;
                const query = new URLSearchParams(queryParams);
                api.get<any>(`campaigns?${query.toString()}`).then(res => {
                    if (isMounted && res.success && res.data.data) {
                        setCampaigns(prev => {
                            // Cực đại hoá Render: Chỉ update Memory Reference nếu Dữ liệu thực sự thay đổi string
                            const newString = JSON.stringify(res.data.data);
                            const oldString = JSON.stringify(prev);
                            if (newString !== oldString) return res.data.data;
                            return prev;
                        });
                    }
                });
            }
        }, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const loadCampaigns = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const { startDate, endDate } = getActiveDates();
            const queryParams: Record<string, string> = {
                page: page.toString(),
                limit: pagination.limit.toString(),
                search: search
            };
            if (startDate) queryParams.startDate = startDate;
            if (endDate) queryParams.endDate = endDate;
            const query = new URLSearchParams(queryParams);
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
            // [PERF FIX] Tải campaigns ngay lập tức — không chờ wizard data
            // Lists/segments/templates/flows/tags chỉ cần khi mở CampaignWizard
            // → tách ra load ngầm để danh sách hiện ngay sau campaigns.php xong
            await loadCampaigns(1, debouncedSearch);
        } catch (error) {
            showToast('Không thể tải dữ liệu chiến dịch', 'error');
            setLoading(false);
        }

        // Wizard data: load ngầm sau khi campaigns đã hiển thị (non-blocking)
        Promise.all([
            api.get<any[]>('lists'),
            api.get<Segment[]>('segments'),
            api.get<Template[]>('templates'),
            api.get<Flow[]>('flows'),
            api.get<{ id: string, name: string, subscriber_count: number }[]>('tags'),
        ]).then(([lRes, sRes, tRes, fRes, tagRes]) => {
            if (lRes.success) setAllLists(lRes.data);
            if (sRes.success) setAllSegments(sRes.data);
            if (tRes.success) setAllTemplates(tRes.data);
            if (fRes.success) { const raw = fRes.data as any; setAllFlows(Array.isArray(raw) ? raw : (raw?.data || [])); }
            if (tagRes.success) {
                setAllTags(tagRes.data.map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    count: tag.subscriber_count || 0
                })));
            }
        }).catch(() => { /* wizard data thất bại không ảnh hưởng list */ });
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
        // [FIX P7-H2] Include PAUSED in 'scheduled' tab so Circuit Breaker paused campaigns
        // remain visible instead of disappearing from all tabs.
        else if (activeTab === 'scheduled') list = list.filter(c => c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING || c.status === CampaignStatus.PAUSED);
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
        if (isSavingDraft) return null; // [GUARD] Prevent double-submit
        setIsSavingDraft(true);
        const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
        const creatorInfo = user.name ? { name: user.name, picture: user.picture || "/imgs/ICON.png" } : null;

        const payload = { 
            ...data, 
            status: CampaignStatus.DRAFT, 
            stats: data.id ? undefined : { sent: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0, failed: 0 },
            config: {
                ...data.config,
                creator: (data.config as any)?.creator || creatorInfo || { name: 'Hệ thống', picture: '/imgs/ICON.png' }
            }
        };
        try {
            let res;
            if (data.id) res = await api.put<Campaign>(`campaigns/${data.id}`, payload);
            else res = await api.post<Campaign>('campaigns', payload);

            if (res.success) {
                showToast('Đã lưu nháp chiến dịch!', 'success');
                logAction(data.id ? "Cập nhật chiến dịch nháp" : "Tạo chiến dịch nháp mới", `Chiến dịch: ${data.name || res.data.name}`);
                // [OPTIMISTIC UI] Update list immediately without full reload
                if (data.id) {
                    setCampaigns(prev => prev.map(c => c.id === data.id ? { ...c, ...res.data } : c));
                } else {
                    setCampaigns(prev => [res.data, ...prev]);
                    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
                }
                setWizardInitialData(res.data);
                return res.data;
            } else {
                showToast(res.message || 'Lỗi khi lưu bản nháp', 'error');
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi lưu bản nháp', 'error');
        } finally {
            setIsSavingDraft(false); // [GUARD] Always unlock
        }
        return null;
    }, [isSavingDraft, pagination.page, debouncedSearch]);

    const handlePublish = React.useCallback(async (data: Partial<Campaign>, options: { connectFlow: boolean, activateFlowId: string | null }) => {
        if (isPublishing) return null; // [GUARD] Prevent double-submit
        setIsPublishing(true);
        let finalStatus = CampaignStatus.SCHEDULED;
        const scheduleTime = data.scheduledAt;

        if (options.connectFlow && !options.activateFlowId) {
            finalStatus = CampaignStatus.WAITING_FLOW;
        } else if (options.connectFlow && options.activateFlowId) {
            if (!scheduleTime) finalStatus = CampaignStatus.SENDING;
        } else if (!scheduleTime) {
            finalStatus = CampaignStatus.SENDING;
        }

        const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
        const creatorInfo = user.name ? { name: user.name, picture: user.picture || "/imgs/ICON.png" } : null;

        const payload = {
            ...data,
            status: finalStatus,
            sentAt: finalStatus === CampaignStatus.SENDING ? new Date().toISOString() : data.sentAt,
            scheduledAt: scheduleTime,
            config: {
                ...data.config,
                creator: (data.config as any)?.creator || creatorInfo || { name: 'Hệ thống', picture: '/imgs/ICON.png' }
            }
        };

        try {
            let res;
            if (data.id) res = await api.put<Campaign>(`campaigns/${data.id}`, payload);
            else res = await api.post<Campaign>('campaigns', payload);

            if (res.success) {
                logAction(data.id ? "Cập nhật chiến dịch" : "Khởi tạo chiến dịch", `Chiến dịch: ${data.name || res.data.name} (Trạng thái: ${finalStatus})`);
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
                // [OPTIMISTIC UI] Add/update campaign in list immediately
                if (data.id) {
                    setCampaigns(prev => prev.map(c => c.id === data.id ? { ...c, ...res.data } : c));
                } else {
                    setCampaigns(prev => [res.data, ...prev]);
                    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
                }
                // Reload flows in background if connected (non-blocking)
                if (options.connectFlow && options.activateFlowId) {
                    api.get<any>('flows').then(r => { if (r.success) { const raw = r.data as any; setAllFlows(Array.isArray(raw) ? raw : (raw?.data || [])); } });
                }
                // [FIX] focus on the new campaign report after publishing
                setSelectedDetailCampaign(res.data);
                return res.data;
            } else {
                showToast(res.message || 'Lỗi khi đăng chiến dịch', 'error');
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi đăng chiến dịch', 'error');
        } finally {
            setIsPublishing(false); // [GUARD] Always unlock
        }
        return null;
    }, [isPublishing, allFlows, navigate]);

    const executeDelete = async (id: string, deleteFlowMode: number) => {
        if (isDeleting) return; // [GUARD] Prevent double-submit
        setIsDeleting(true);
        const snapshot = campaigns.slice(); // Save snapshot for rollback
        // [OPTIMISTIC UI] Remove from list immediately before API call
        setCampaigns(prev => prev.filter(c => c.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setAdvancedDeleteModal(prev => ({ ...prev, isOpen: false }));
        try {
            const res = await api.delete(`campaigns/${id}?delete_flow=${deleteFlowMode}`);
            if (res.success) {
                showToast('Đã xóa chiến dịch thành công!');
                const deletedCamp = snapshot.find(c => c.id === id);
                logAction("Xóa chiến dịch", `Đã xóa chiến dịch: ${deletedCamp ? deletedCamp.name : id}`);
                // Refresh flows list if flows were deleted too
                if (deleteFlowMode === 1) {
                    api.get<any>('flows').then(r => { if (r.success) { const raw = r.data as any; setAllFlows(Array.isArray(raw) ? raw : (raw?.data || [])); } });
                }
            } else {
                // [ROLLBACK] Restore snapshot on failure
                showToast(res.message || 'Lỗi khi xóa chiến dịch', 'error');
                setCampaigns(snapshot);
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi xóa chiến dịch', 'error');
            setCampaigns(snapshot); // [ROLLBACK]
        } finally {
            setIsDeleting(false); // [GUARD] Always unlock
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
                // [OPTIMISTIC UI] Update flow status in local state
                setAllFlows(prev => prev.map(f => f.id === flowReviewData.flow!.id ? { ...f, status: 'active' } : f));
            }
        } catch (e) {
            showToast('Không thể kích hoạt kịch bản.', 'error');
        } finally {
            setIsStartingFlow(false);
            setFlowReviewData(null);
        }
    };
    const heroActions = useMemo(() => [
        {
            label: 'Chiến dịch mới',
            icon: Plus,
            onClick: adminGuard(
                () => { setSelectedDetailCampaign(null); setWizardInitialData(undefined); setIsWizardOpen(true); },
                'tạo chiến dịch mới'
            ),
        },
        {
            label: 'Mẹo tăng trưởng',
            icon: Lightbulb,
            onClick: () => setIsTipsModalOpen(true),
            primary: true
        }
    ], [adminGuard]);

    return (
        <div className="animate-fade-in space-y-8 pb-20 w-full min-w-0">
            {/* Clean header with inline actions and QUOTA widget */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8 mt-2 w-full">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            Campaign <span className="text-slate-500 dark:text-slate-400">Marketing</span>
                        </h1>
                    </div>
                    
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1">
                        Gửi Email & Zalo ZNS · Theo dõi hành trình khách hàng, tracking đa điểm chạm & báo cáo hiệu suất chi tiết theo thời gian thực.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                    {/* QUOTA Button */}
                    <button
                        onClick={() => setIsQuotaModalOpen(true)}
                        className="flex items-center gap-2 h-[38px] px-3.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/50 rounded-xl transition-all group"
                        title="Xem AWS SES Quota"
                    >
                        <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">DAILY QUOTA</span>
                        {awsQuickInfo !== null ? (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                                awsQuickInfo.usage_pct > 80 ? 'bg-red-500 text-white'
                                : awsQuickInfo.usage_pct > 60 ? 'bg-yellow-500 text-white'
                                : 'bg-emerald-500 text-white'
                            }`}>
                                {awsQuickInfo.remaining.toLocaleString()} left
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-slate-500 px-1">24h</span>
                        )}
                    </button>

                    {/* Growth Tips Button */}
                    <button 
                        onClick={() => setIsTipsModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 h-[38px] rounded-xl font-bold text-xs uppercase tracking-wider px-4 bg-white hover:bg-slate-50 text-slate-600 dark:text-slate-300 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 active:scale-95 transition-all"
                    >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Mẹo tăng trưởng</span>
                    </button>

                    {/* New Campaign Button */}
                    <button 
                        onClick={adminGuard(
                            () => { setSelectedDetailCampaign(null); setWizardInitialData(undefined); setIsWizardOpen(true); },
                            'tạo chiến dịch mới'
                        )}
                        className="flex items-center justify-center gap-1.5 h-[38px] rounded-xl font-bold text-xs uppercase tracking-wider px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Chiến dịch mới</span>
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Card 1: Tổng chiến dịch */}
                    <StatCard
                        title="Tổng chiến dịch"
                        value={campaigns.length}
                        growth={4.8}
                        icon={<PieChart />}
                        color="#8b5cf6"
                        comparisonLabel="so với 30 ngày trước"
                        style={{ animation: 'slideUp 0.4s ease-out both', animationDelay: '50ms' }}
                        breakdown={
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#10b981' }}></span>
                                    Đang chạy: {campaigns.filter(c => c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING || c.status === CampaignStatus.PAUSED).length}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#94a3b8' }}></span>
                                    Bản nháp: {campaigns.filter(c => c.status === CampaignStatus.DRAFT).length}
                                </span>
                            </>
                        }
                        decor={
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" stroke-dasharray="4 4" />
                                <circle cx="35" cy="45" r="15" fill="currentColor" fillOpacity="0.2" />
                                <circle cx="65" cy="45" r="15" fill="currentColor" fillOpacity="0.4" />
                                <circle cx="50" cy="70" r="18" fill="currentColor" fillOpacity="0.6" />
                            </svg>
                        }
                    />

                    {/* Card 2: Tổng gửi */}
                    <StatCard
                        title="Tổng gửi"
                        value={stats.totalSent.toLocaleString()}
                        growth={12.3}
                        icon={<Send />}
                        color="#3b82f6"
                        comparisonLabel="so với 30 ngày trước"
                        style={{ animation: 'slideUp 0.4s ease-out both', animationDelay: '100ms' }}
                        breakdown={
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#fbbf24' }}></span>
                                    Email: {(stats.totalSent * 0.6).toFixed(0).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
                                    Zalo: {(stats.totalSent * 0.4).toFixed(0).toLocaleString()}
                                </span>
                            </>
                        }
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

                    {/* Card 3: Tỷ lệ mở */}
                    <StatCard
                        title="Tỷ lệ mở"
                        value={`${stats.openRate}%`}
                        growth={1.5}
                        icon={<MailOpen />}
                        color="#10b981"
                        comparisonLabel="so với 30 ngày trước"
                        style={{ animation: 'slideUp 0.4s ease-out both', animationDelay: '150ms' }}
                        breakdown={
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                                    Lượt mở: {Math.round(stats.totalSent * Number(stats.openRate) / 100).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#94a3b8' }}></span>
                                    Không mở: {Math.max(0, stats.totalSent - Math.round(stats.totalSent * Number(stats.openRate) / 100)).toLocaleString()}
                                </span>
                            </>
                        }
                        decor={
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                <rect x="20" y="20" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.6" />
                                <rect x="20" y="42" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.4" />
                                <rect x="20" y="64" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.2" />
                            </svg>
                        }
                    />

                    {/* Card 4: Lượt Click */}
                    <StatCard
                        title="Lượt Click"
                        value={stats.totalClicked.toLocaleString()}
                        growth={8.1}
                        icon={<MousePointerClick />}
                        color="#ec4899"
                        comparisonLabel="so với 30 ngày trước"
                        style={{ animation: 'slideUp 0.4s ease-out both', animationDelay: '200ms' }}
                        breakdown={
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ec4899' }}></span>
                                    Lượt click: {stats.totalClicked.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                                    CTR: {stats.totalSent > 0 ? (stats.totalClicked / stats.totalSent * 100).toFixed(1) : '0'}%
                                </span>
                            </>
                        }
                        decor={
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" />
                                <path d="M50 35 V 65 M35 50 H 65" stroke="currentColor" strokeWidth="3" stroke-linecap="round" />
                            </svg>
                        }
                    />
                </div>

                {/* Table section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
                    {/* Tabs + Search + Filter — single clean row */}
                    <div className="px-4 lg:px-6 py-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Left: Status tabs */}
                        <div className="overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:pb-0 scrollbar-hide">
                            <Tabs
                                variant="segmented"
                                activeId={activeTab}
                                onChange={setActiveTab as any}
                                items={TAB_ITEMS as any}
                            />
                        </div>

                        {/* Right: Date filter + Type filter + Search */}
                        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 shrink-0 w-full lg:w-auto">
                            {/* Date Filter */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Select
                                    value={datePreset}
                                    onChange={(val) => setDatePreset(val as any)}
                                    options={[
                                        { value: '90', label: '90 ngày qua' },
                                        { value: '30', label: '30 ngày qua' },
                                        { value: '7', label: '7 ngày qua' },
                                        { value: 'month', label: 'Tháng này' },
                                        { value: 'all', label: 'Tất cả' },
                                        { value: 'custom', label: 'Tùy chỉnh...' }
                                    ]}
                                    className="w-[130px] !text-xs !py-1.5"
                                />
                                {datePreset === 'custom' && (
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-lg p-0.5 px-2">
                                        <input
                                            type="date"
                                            value={customDate.start}
                                            onChange={e => setCustomDate({ ...customDate, start: e.target.value })}
                                            className="bg-transparent text-xs outline-none text-slate-600 dark:text-slate-300 w-[100px] py-1"
                                        />
                                        <span className="text-slate-300">-</span>
                                        <input
                                            type="date"
                                            value={customDate.end}
                                            onChange={e => setCustomDate({ ...customDate, end: e.target.value })}
                                            className="bg-transparent text-xs outline-none text-slate-600 dark:text-slate-300 w-[100px] py-1"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Type Filter Select */}
                            <div className="shrink-0 w-auto">
                                <Select
                                    value={activeType}
                                    onChange={(val) => setActiveType(val as any)}
                                    options={TYPE_TABS as any}
                                    className="!w-[130px] !text-xs !py-1.5"
                                />
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 lg:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm chiến dịch..."
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-600/20 focus:border-amber-400/50 transition-all outline-none"
                                />
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
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                Hiển thị <span className="font-extrabold text-slate-700 dark:text-slate-300">{((pagination.page - 1) * pagination.limit + 1).toLocaleString()}</span> - <span className="font-extrabold text-slate-700 dark:text-slate-300">{Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString()}</span> trên <span className="font-extrabold text-slate-700 dark:text-slate-300">{(pagination.total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button 
                                    type="button" 
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} 
                                    disabled={pagination.page === 1} 
                                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                
                                {(() => {
                                    const range = [];
                                    const maxVisible = 5;
                                    let start = Math.max(1, pagination.page - 2);
                                    let end = Math.min(pagination.totalPages, start + maxVisible - 1);
                                    if (end - start < maxVisible - 1) {
                                        start = Math.max(1, end - maxVisible + 1);
                                    }
                                    for (let i = start; i <= end; i++) {
                                        range.push(i);
                                    }
                                    return range;
                                })().map(pageNum => (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                            pagination.page === pageNum 
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' 
                                                : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button 
                                    type="button" 
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))} 
                                    disabled={pagination.page === pagination.totalPages} 
                                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>{/* close overflow-hidden */}
            </div>{/* close space-y-8 */}

            {/* Permission Modal */}
            {AdminPermModal}

            {/* ── QUOTA Modal ─────────────────────────────────────────── */}
            <Modal
                isOpen={isQuotaModalOpen}
                onClose={() => setIsQuotaModalOpen(false)}
                title="Giới hạn gửi email (Quota)"
                size="sm"
                isDarkTheme={isDark}
            >
                <SesQuotaWidget mode="sidebar" />
            </Modal>

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

            <FlowReviewModal isOpen={!!flowReviewData} onClose={() => setFlowReviewData(null)} onConfirm={handleConfirmStart} campaign={flowReviewData?.campaign || null} flow={flowReviewData?.flow || null} isProcessing={isStartingFlow} isDarkTheme={isDark} />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                requireConfirmText={confirmModal.requireConfirmText}
                isDarkTheme={isDark}
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
                isDarkTheme={isDark}
                message={
                    <div className="space-y-4">
                        <p className="text-slate-600">Bạn sắp xóa một chiến dịch đang được kết nối với <b>{advancedDeleteModal.flows.length} kịch bản (Flow)</b> chăm sóc.</p>
                        <div className="space-y-2 mt-4">
                            <label className={`block border p-4 rounded-xl cursor-pointer transition-all ${advancedDeleteModal.deleteFlowMode === 0 ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="delete_flow"
                                        checked={advancedDeleteModal.deleteFlowMode === 0}
                                        onChange={() => setAdvancedDeleteModal(prev => ({ ...prev, deleteFlowMode: 0 }))}
                                        className="mt-1"
                                    />
                                    <div>
                                        <b className="text-slate-800 dark:text-slate-200 block">Giữ lại Flow (Chỉ gỡ kết nối)</b>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chiến dịch sẽ bị xóa, nhưng Kịch bản chăm sóc sẽ được giữ lại. Nút Trigger sẽ trở về trạng thái trống (Disconnected).</p>
                                    </div>
                                </div>
                            </label>

                            <label className={`block border p-4 rounded-xl cursor-pointer transition-all ${advancedDeleteModal.deleteFlowMode === 1 ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/60'}`}>
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
