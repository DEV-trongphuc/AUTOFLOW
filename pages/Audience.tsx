import * as React from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/storageAdapter';
import { automationService } from '../services/automationService';
import { Subscriber, Segment, Flow } from '../types';
import {
    Download, Search, UserPlus, Layers, Users, RefreshCw,
    List, Plus, Check, Trash2, Tag, Filter, TrendingUp, UserMinus,
    FileText, ChevronDown, X, ShieldCheck, Zap, Calendar, Facebook, MessageCircle, RotateCcw
} from 'lucide-react';
import Button from '../components/common/Button';
import PageHero from '../components/common/PageHero';

import Tabs from '../components/common/Tabs';
import Select from '../components/common/Select';
import toast from 'react-hot-toast';
import CustomerProfileModal from '../components/audience/CustomerProfileModal';
import SegmentBuilderModal from '../components/audience/SegmentBuilderModal';
import ListFormModal from '../components/audience/ListFormModal';
import ImportSubscribersModal from '../components/audience/ImportSubscribersModal';
import IntegrationsModal from '../components/audience/IntegrationsModal';
import GroupDetailModal from '../components/audience/GroupDetailModal';
import ListsTab from '../components/audience/tabs/ListsTab';
import SegmentsTab from '../components/audience/tabs/SegmentsTab';
import ContactsTab from '../components/audience/tabs/ContactsTab';
import IntegrationsTab from '../components/audience/tabs/IntegrationsTab';
import AudienceSplitModal from '../components/audience/AudienceSplitModal';
import ListMergeModal from '../components/audience/ListMergeModal';
import CleanupModal from '../components/audience/CleanupModal';
import ConfirmModal from '../components/common/ConfirmModal';
import InfoCard from '../components/common/InfoCard';
import { isManualList } from '../utils/listHelpers';
import ColumnCustomizer from '../components/audience/ColumnCustomizer';
import ItemsPerPageSelector from '../components/audience/ItemsPerPageSelector';
import AdvancedFilters from '../components/audience/AdvancedFilters';
import MetaCustomers from '../components/meta/MetaCustomers';
import ZaloAudienceTab from '../components/zalo/ZaloAudienceTab';
import TabTransition from '../components/common/TabTransition';
import AudienceTipsModal from '../components/audience/AudienceTipsModal';
import FilterPills from '../components/audience/FilterPills';
import { Lightbulb } from 'lucide-react';
import { useIsAdmin } from '../hooks/useAuthUser';
import { usePermissionGuard } from '../components/common/PermissionGuard';

const UndoToastContent = ({ t, icon: Icon, iconColorClass, title, subtitle, durationMs, onUndo }: any) => {
    const [timeLeft, setTimeLeft] = useState(Math.floor(durationMs / 1000));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-[150px]">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
                    <span className="text-[10px] font-black text-rose-500 tabular-nums">({timeLeft}s)</span>
                </div>
            </div>
            <button
                onClick={onUndo}
                className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-slate-800 transition-all uppercase tracking-widest shrink-0 shadow-sm"
            >
                Hoàn tác
            </button>
        </div>
    );
};


const ITEMS_PER_PAGE = 20;

// Column Definitions for Customization
const COLUMN_DEFINITIONS = [
    { id: 'name', label: 'Tên', required: true },
    { id: 'phone', label: 'Số điện thoại', required: false },
    { id: 'company', label: 'Công ty', required: false },
    { id: 'status', label: 'Trạng thái', required: false },
    { id: 'lastActivity', label: 'Hoạt động gần nhất', required: false },
    { id: 'leadScore', label: 'Điểm Lead', required: false },
    { id: 'tags', label: 'Tags', required: false },
    { id: 'salesperson', label: 'Salesperson', required: false },
    { id: 'joinedAt', label: 'Ngày tham gia', required: false },
];

const DEFAULT_VISIBLE_COLUMNS = ['name', 'email', 'status', 'lastActivity', 'leadScore', 'tags', 'salesperson'];

const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Chưa có dữ liệu';
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    if (diffSeconds < 60) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
};



interface PaginationState {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

import { useNavigation } from '../contexts/NavigationContext';

const Audience: React.FC = () => {
    const { setCustomBackAction } = useNavigation();
    const navigate = useNavigate();
    const isAdmin = useIsAdmin();
    const { guard: adminGuard, PermModal: AdminPermModal } = usePermissionGuard(isAdmin);

    const [activeTab, setActiveTab] = useState<'lists' | 'segments' | 'contacts' | 'integrations' | 'meta' | 'zalo'>('contacts');

    // Main Subscriber List State (Paginated)
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });

    // Auxiliary Data
    const [segments, setSegments] = useState<Segment[]>([]);
    const [allSegments, setAllSegments] = useState<Segment[]>([]);
    const [segmentsPagination, setSegmentsPagination] = useState<PaginationState>({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
    const [flows, setFlows] = useState<Flow[]>([]);
    const [staticLists, setStaticLists] = useState<any[]>([]);
    const [allStaticLists, setAllStaticLists] = useState<any[]>([]);
    const [listsPagination, setListsPagination] = useState<PaginationState>({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
    const [integrations, setIntegrations] = useState<any[]>([]); // New state for integrations
    const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingSubscriber, setIsSavingSubscriber] = useState(false);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [stats, setStats] = useState({ total: 0, unsubscribed: 0, customer: 0, lead: 0 });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [filterVerify, setFilterVerify] = useState<string>('all');
    const [filterHasChat, setFilterHasChat] = useState<string>('all');
    const [filterCustomAttrKey, setFilterCustomAttrKey] = useState<string>('');
    const [filterCustomAttrValue, setFilterCustomAttrValue] = useState<string>('');
    const [filterSalesperson, setFilterSalesperson] = useState<string>('');
    const [customAttrKeys, setCustomAttrKeys] = useState<{ key: string; label: string }[]>([]);
    const [sortBy, setSortBy] = useState<string>('newest');
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
    const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [recentDays, setRecentDays] = useState<number>(7);

    // NEW: Column Customization & Items Per Page
    const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
        const saved = localStorage.getItem('mailflow_items_per_page');
        return saved ? parseInt(saved) : 20;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('mailflow_visible_columns');
        return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
    });

    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
    const [isSegmentBuilderOpen, setSegmentBuilderOpen] = useState(false);
    const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);

    // Viewing Group State (GroupDetailModal)
    const [viewingGroup, setViewingGroup] = useState<{ id: string; name: string; type: 'list' | 'segment'; count: number } | null>(null);
    const [editingIntegration, setEditingIntegration] = useState<any | null>(null);
    const [groupMembers, setGroupMembers] = useState<Subscriber[]>([]);
    const [groupPagination, setGroupPagination] = useState<PaginationState>({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
    const [groupLoading, setGroupLoading] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');
    const [groupStatus, setGroupStatus] = useState<string>('all');

    const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
    const [editingList, setEditingList] = useState<any | null>(null);
    const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);

    // Modals & UI
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
        requireConfirmText?: string;
    }>({ isOpen: false, title: '', message: '', variant: 'warning', onConfirm: () => { } });

    const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
    const [bulkTagName, setBulkTagName] = useState('');

    // Split Audience State (Generic)
    const [splittingTarget, setSplittingTarget] = useState<{ id: string; name: string; type: 'segment' | 'list'; count: number } | null>(null);
    const [splitSelectedIds, setSplitSelectedIds] = useState<string[]>([]);

    // Merge Lists State
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergingLists, setMergingLists] = useState<any[]>([]);

    const [cleanupTarget, setCleanupTarget] = useState<{ id: string; name: string; type: 'list' | 'segment' } | null>(null);
    const [isBulkListModalOpen, setIsBulkListModalOpen] = useState(false);
    const [isGlobalSelected, setIsGlobalSelected] = useState(false);

    // NEW: Reporting Stats
    const [reportPeriod, setReportPeriod] = useState('today');
    const [reportStats, setReportStats] = useState<any>(null);
    const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
    const pendingActionsRef = useRef<Record<string, NodeJS.Timeout>>({});
    const initialLoadDone = useRef(false); // Prevent double-fetch on mount

    // Form-protection modal state
    const [formProtectionModal, setFormProtectionModal] = useState<{
        isOpen: boolean;
        listName: string;
        linkedForms: { id: string; name: string }[];
    }>({ isOpen: false, listName: '', linkedForms: [] });

    const fetchReportStats = async (period: string) => {
        const res = await api.get<any>(`audience_report?period=${period}`);
        if (res.success) {
            setReportStats(res.data);
        }
    };

    useEffect(() => {
        let didCancel = false;
        const run = async () => {
            const res = await api.get<any>(`audience_report?period=${reportPeriod}`);
            if (!didCancel && res.success) setReportStats(res.data);
        };
        run();
        return () => { didCancel = true; };
    }, [reportPeriod]);

    const backToContacts = React.useCallback(() => setSelectedSubscriber(null), []);
    const backToGroups = React.useCallback(() => setViewingGroup(null), []);

    // Smart Back Logic
    useEffect(() => {
        if (selectedSubscriber) {
            setCustomBackAction(() => backToContacts);
        } else if (viewingGroup) {
            setCustomBackAction(() => backToGroups);
        } else {
            setCustomBackAction(null);
        }

        return () => setCustomBackAction(null);
    }, [selectedSubscriber, viewingGroup, setCustomBackAction, backToContacts, backToGroups]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
            setListsPagination(prev => ({ ...prev, page: 1 }));
            setSegmentsPagination(prev => ({ ...prev, page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);


    useEffect(() => {
        const guardedFetch = async () => {
            if (initialLoadDone.current) return; // Already loaded
            initialLoadDone.current = true;
            await fetchInitialData();
        };
        guardedFetch();
    }, []);

    const location = useLocation();
    useEffect(() => {
        const state = location.state as any;
        if (state?.openSubscriberId) {
            const subId = state.openSubscriberId;
            api.get<Subscriber>(`subscribers/${subId}`).then(res => {
                if (res.success) {
                    setSelectedSubscriber(res.data);
                    navigate(location.pathname, { replace: true, state: { ...state, openSubscriberId: undefined } });
                }
            });
        }
        if (state?.openListId) {
            setViewingGroup({ id: state.openListId, name: state.openListName || 'Danh sách', type: 'list', count: state.openListCount || 0 });
            navigate(location.pathname, { replace: true, state: { ...state, openListId: undefined, openListName: undefined, openListCount: undefined } });
        }

        // Handle ?segment_id=xxx or ?list_id=xxx query params (from FlowCard link chips)
        const params = new URLSearchParams(location.search);
        const qSegmentId = params.get('segment_id');
        const qListId = params.get('list_id');

        if (qSegmentId) {
            setActiveTab('segments');
            // Try to find from already-loaded data first, else fetch
            const found = allSegments.find(s => s.id === qSegmentId) || segments.find(s => s.id === qSegmentId);
            if (found) {
                setViewingGroup({ id: found.id, name: found.name, type: 'segment', count: found.count || 0 });
            } else {
                api.get<Segment>(`segments?id=${qSegmentId}`).then(res => {
                    if (res.success && res.data) {
                        const seg = Array.isArray(res.data) ? res.data[0] : res.data;
                        if (seg) setViewingGroup({ id: seg.id, name: seg.name, type: 'segment', count: seg.count || 0 });
                    }
                });
            }
            // Clean URL
            navigate(location.pathname, { replace: true, state: state });
        }

        if (qListId) {
            setActiveTab('lists');
            const found = allStaticLists.find((l: any) => l.id === qListId) || staticLists.find((l: any) => l.id === qListId);
            if (found) {
                setViewingGroup({ id: found.id, name: found.name, type: 'list', count: found.count || 0 });
            } else {
                api.get<any>(`lists?id=${qListId}`).then(res => {
                    if (res.success && res.data) {
                        const lst = Array.isArray(res.data) ? res.data[0] : res.data;
                        if (lst) setViewingGroup({ id: lst.id, name: lst.name, type: 'list', count: lst.count || 0 });
                    }
                });
            }
            navigate(location.pathname, { replace: true, state: state });
        }
    }, [location.state, location.search]);

    // CRITICAL: These callbacks must be defined BEFORE any conditional rendering to avoid hooks violations
    const handleToggleSelection = React.useCallback((id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        if (isGlobalSelected) setIsGlobalSelected(false);
    }, [selectedIds, isGlobalSelected]);

    const handleToggleSelectAll = React.useCallback(() => {
        const currentPageIds = subscribers.map(s => s.id);
        const allSelected = currentPageIds.every(id => selectedIds.has(id));
        const newSet = new Set(selectedIds);

        if (allSelected) {
            currentPageIds.forEach(id => newSet.delete(id));
            if (isGlobalSelected) setIsGlobalSelected(false);
        } else {
            currentPageIds.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    }, [subscribers, selectedIds, isGlobalSelected]);

    // Generic fetch for Lists with pagination
    const fetchLists = async (page = 1) => {
        setLoading(true);
        const query = new URLSearchParams({
            page: page.toString(),
            limit: ITEMS_PER_PAGE.toString(),
            search: debouncedSearch
        });
        const res = await api.get<any>(`lists?${query.toString()}`);
        if (res.success && res.data.pagination) {
            setStaticLists(res.data.data);
            setListsPagination(res.data.pagination);
        }
        setLoading(false);
    };

    // Generic fetch for Segments with pagination
    const fetchSegments = async (page = 1) => {
        setLoading(true);
        const query = new URLSearchParams({
            page: page.toString(),
            limit: ITEMS_PER_PAGE.toString(),
            search: debouncedSearch
        });
        const res = await api.get<any>(`segments?${query.toString()}`);
        if (res.success && res.data.pagination) {
            setSegments(res.data.data);
            setSegmentsPagination(res.data.pagination);
        }
        setLoading(false);
    };

    const fetchIntegrations = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get<any[]>(`integrations?t=${Date.now()}`);
            if (res.success) {
                setIntegrations(res.data);
            }
            if (!silent) setLoading(false);
            return res.success ? res.data : null;
        } catch (error) {
            console.error("Lỗi khi tải kết nối", error);
            if (!silent) setLoading(false);
            return null;
        }
    };


    // Effect to fetch tab data (skip first render — fetchInitialData handles mount)
    useEffect(() => {
        if (!initialLoadDone.current) return; // Let fetchInitialData handle the first load
        if (activeTab === 'contacts') fetchSubscribers(pagination.page);
        else if (activeTab === 'lists') fetchLists(listsPagination.page);
        else if (activeTab === 'segments') fetchSegments(segmentsPagination.page);
        else if (activeTab === 'integrations') fetchIntegrations();
    }, [activeTab, pagination.page, listsPagination.page, segmentsPagination.page, debouncedSearch, filterStatus, filterTags, filterVerify, filterHasChat, filterSalesperson, sortBy, dateRange, itemsPerPage, recentDays, filterCustomAttrKey, filterCustomAttrValue]);

    // Reset page to 1 on filter/search change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        setListsPagination(prev => ({ ...prev, page: 1 }));
        setSegmentsPagination(prev => ({ ...prev, page: 1 }));
    }, [debouncedSearch, filterStatus, filterTags, filterVerify, filterHasChat, filterSalesperson, sortBy, filterCustomAttrKey, filterCustomAttrValue]);

    // Fetch Group Members when viewingGroup changes or its filters change
    useEffect(() => {
        if (viewingGroup) {
            fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch, groupStatus);
        } else {
            setGroupMembers([]);
            setGroupSearch('');
            setGroupStatus('all');
            setGroupPagination({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
        }
    }, [viewingGroup?.id, groupPagination.page, groupSearch, groupStatus]);

    const fetchInitialData = async () => {
        // Set guard FIRST so filter useEffect cannot re-enter during async gaps
        initialLoadDone.current = true;
        setLoading(true);
        try {
            const [segRes, listRes, flowRes, tagRes, integRes, totalSubRes, formsRes] = await Promise.all([
                api.get<Segment[]>('segments'),
                api.get<any[]>('lists'),
                api.get<Flow[]>('flows'),
                api.get<{ id: string, name: string }[]>('tags'),
                api.get<any[]>('integrations'),
                api.get<any>('subscribers?limit=1'),
                api.get<any[]>('forms'),  // Moved into parallel batch
            ]);

            if (segRes.success) {
                setSegments(segRes.data);
                setAllSegments(segRes.data);
                setSegmentsPagination(prev => ({ ...prev, total: segRes.data.length }));
            }
            if (listRes.success) {
                setStaticLists(listRes.data);
                setAllStaticLists(listRes.data);
                setListsPagination(prev => ({ ...prev, total: listRes.data.length }));
            }
            if (flowRes.success) { const rawF = flowRes.data as any; setFlows(Array.isArray(rawF) ? rawF : (rawF?.data || [])); }
            if (tagRes.success) setTags(tagRes.data);
            if (integRes.success) setIntegrations(integRes.data);

            // Parse custom field keys from forms (now fetched in parallel)
            if (formsRes.success && Array.isArray(formsRes.data)) {
                const keyMap = new Map<string, string>();
                formsRes.data.forEach((form: any) => {
                    (form.fields || []).forEach((f: any) => {
                        if (f.isCustom && f.customKey) {
                            keyMap.set(f.customKey, f.label || f.customKey);
                        }
                    });
                });
                setCustomAttrKeys(Array.from(keyMap.entries()).map(([key, label]) => ({ key, label })));
            }

            const total = (totalSubRes.success && totalSubRes.data.pagination) ? totalSubRes.data.pagination.total : 0;
            const apiStats = totalSubRes.data?.globalStats || { customer: 0, unsubscribed: 0, lead: 0 };

            setStats(prev => ({
                ...prev,
                total,
                customer: apiStats.customer,
                unsubscribed: apiStats.unsubscribed,
                lead: apiStats.lead
            }));

            // Initial subscriber fetch
            await fetchSubscribers(1);
        } catch (error) {
            console.error("Error loading initial data", error);
        }
        setLoading(false);
    };

    // Polling for Sync Status with timeout protection
    const prevSyncingRef = useRef(false);
    useEffect(() => {
        let isMounted = true;
        const isCurrentlySyncing = integrations.some((i: any) => i.sync_status === 'syncing');
        
        // If we were syncing and now we are not, refresh everything
        if (prevSyncingRef.current && !isCurrentlySyncing) {
            fetchReportStats(reportPeriod);
            if (activeTab === 'contacts') fetchSubscribers(1);
        }
        prevSyncingRef.current = isCurrentlySyncing;

        // If not on integrations tab or nothing is syncing, don't poll
        if (activeTab !== 'integrations' || !isCurrentlySyncing) return;

        // Track sync start time for timeout
        const syncStartTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - syncStartTime;

            // If syncing for more than 5 minutes, force refresh (likely stuck)
            if (elapsed > 300000) {
                console.warn('Sync timeout detected, forcing refresh');
                if (isMounted) fetchIntegrations(true);
                clearInterval(interval);
                return;
            }

            if (isMounted) fetchIntegrations(true); // Silent poll
        }, 2000); // Poll every 2 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [activeTab, integrations.some(i => i.sync_status === 'syncing'), reportPeriod]);

    const fetchSubscribers = async (page = 1) => {
        setLoading(true);
        const query = new URLSearchParams({
            page: page.toString(),
            limit: itemsPerPage.toString(),
            search: debouncedSearch,
            status: filterStatus,
            tag: filterTags.join(','),
            verified: filterVerify,
            has_chat: filterHasChat,
            sort: sortBy,
            salesperson: filterSalesperson,
            ...(sortBy === 'birthday_custom' ? { startDate: dateRange.from, endDate: dateRange.to } : {}),
            ...(sortBy === 'recent_activity' ? { recent_days: recentDays.toString() } : {}),
            ...(filterCustomAttrKey ? { custom_attr_key: filterCustomAttrKey, custom_attr_value: filterCustomAttrValue } : {})
        });

        const res = await api.get<any>(`subscribers?${query.toString()}`);
        if (res.success) {
            if (res.data.pagination) {
                setSubscribers(res.data.data);
                setPagination(res.data.pagination);
            } else if (Array.isArray(res.data)) {
                setSubscribers(res.data);
                setPagination({ page: 1, limit: res.data.length, total: res.data.length, totalPages: 1 });
            }
        }
        setLoading(false);
    };

    const fetchGroupMembers = async (group: { id: string; type: string }, page = 1, search = '', status = 'all') => {
        if (!group) return;
        setGroupLoading(true);
        const query = new URLSearchParams({
            page: page.toString(),
            limit: ITEMS_PER_PAGE.toString(),
            search: search,
            status: status === 'has_phone' ? 'all' : status,
            sort: 'newest'
        });

        if (status === 'has_phone') {
            query.set('has_phone', '1');
        }

        if (group.type === 'list') query.set('list_id', group.id);
        else if (group.type === 'segment') query.set('segment_id', group.id);
        else if (group.type === 'tag') query.set('tag', group.id);

        const res = await api.get<any>(`subscribers?${query.toString()}`);
        if (res.success) {
            if (res.data.pagination) {
                // Ensure data is array
                setGroupMembers(Array.isArray(res.data.data) ? res.data.data : []);
                setGroupPagination(res.data.pagination);
            } else if (Array.isArray(res.data)) {
                setGroupMembers(res.data);
                setGroupPagination({ page: 1, limit: res.data.length, total: res.data.length, totalPages: 1 });
            } else {
                setGroupMembers([]);
                setGroupPagination({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
            }
        } else {
            setGroupMembers([]);
            setGroupPagination({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
        }
        setGroupLoading(false);
    };

    const checkSegmentMatch = (sub: Subscriber, criteriaJson: string) => {
        try {
            if (!criteriaJson) return false;
            const criteria = JSON.parse(criteriaJson);
            if (!criteria) return false;

            const checkCondition = (cond: any) => {
                if (cond.field === 'last_activity') {
                    // Logic: "Inactive > X days" means days since last activity > X
                    const lastDateStr = sub.lastActivityAt || sub.joinedAt;
                    if (!lastDateStr) return false;

                    const date = new Date(lastDateStr);
                    const diffDays = (Date.now() - date.getTime()) / (1000 * 3600 * 24);

                    const val = parseInt(cond.value);
                    if (cond.operator === '>') return diffDays > val;
                    if (cond.operator === '<') return diffDays < val;
                    return false;
                }
                if (cond.field === 'tags') {
                    const tags = sub.tags || [];
                    if (cond.operator === 'contains') return tags.includes(cond.value);
                    if (cond.operator === 'not_contains') return !tags.includes(cond.value);
                }
                if (cond.field === 'list_id') {
                    const listIds = sub.listIds || [];
                    if (cond.operator === 'contains' || cond.operator === 'in' || cond.operator === '=') return listIds.includes(cond.value);
                    if (cond.operator === 'not_contains' || cond.operator === 'not_in' || cond.operator === '!=') return !listIds.includes(cond.value);
                }
                if (cond.field.startsWith('info.')) {
                    const key = cond.field.split('.')[1];
                    const val = (sub as any)[key] || '';
                    if (cond.operator === '=') return val == cond.value;
                    if (cond.operator === '!=') return val != cond.value;
                    if (cond.operator === 'contains') return val.toString().toLowerCase().includes(cond.value.toLowerCase());
                }

                // Generic Top-level Fields (meta_psid, email, firstName, source, etc.)
                const val = (sub as any)[cond.field] !== undefined ? (sub as any)[cond.field] : '';
                const stringVal = (val !== null && val !== undefined) ? val.toString().toLowerCase() : '';
                const searchVal = (cond.value !== null && cond.value !== undefined) ? cond.value.toString().toLowerCase() : '';

                switch (cond.operator) {
                    case 'is_not_empty':
                        return !!val && val !== '';
                    case 'is_empty':
                        return !val || val === '';
                    case 'contains':
                    case 'like':
                        return stringVal.includes(searchVal);
                    case 'not_contains':
                        return !stringVal.includes(searchVal);
                    case 'equals':
                    case 'is':
                    case '=':
                        return val == cond.value;
                    case '!=':
                    case 'is_not':
                        return val != cond.value;
                    case 'starts_with':
                        return stringVal.startsWith(searchVal);
                    case 'greater_than':
                        return parseFloat(val) > parseFloat(cond.value);
                    case 'less_than':
                        return parseFloat(val) < parseFloat(cond.value);
                    default:
                        // Special handling for nested stats
                        if (cond.field.includes('.')) {
                            const parts = cond.field.split('.');
                            let current: any = sub;
                            for (const part of parts) {
                                if (current && current[part] !== undefined) {
                                    current = current[part];
                                } else {
                                    current = undefined;
                                    break;
                                }
                            }
                            if (current !== undefined) {
                                if (cond.operator === 'greater_than') return parseFloat(current) > parseFloat(cond.value);
                                if (cond.operator === 'less_than') return parseFloat(current) < parseFloat(cond.value);
                                if (cond.operator === '=') return current == cond.value;
                            }
                        }
                        return false;
                }
            };

            // NEW: Array of groups structure [ { id, conditions: [] }, ... ]
            // Logic: Groups are ORed, Conditions within a group are ANDed
            if (Array.isArray(criteria)) {
                if (criteria.length === 0) return false;
                return criteria.some((group: any) => {
                    const conditions = group.conditions || [];
                    if (conditions.length === 0) return true; // Empty group matches all? (standard behavior)
                    return conditions.every(checkCondition);
                });
            }

            // OLD: Single object structure { conditions: [], operator: 'AND'|'OR' }
            if (criteria.conditions && Array.isArray(criteria.conditions)) {
                const { conditions, operator } = criteria;
                if (operator === 'OR') {
                    return conditions.some(checkCondition);
                } else {
                    return conditions.every(checkCondition);
                }
            }

            return false;
        } catch (e) {
            console.error('Error parsing criteria', e);
            return false;
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    const handleUpdateSubscriber = async (updated: Subscriber) => {
        if (isSavingSubscriber) return; // [GUARD] Prevent double-submit
        setIsSavingSubscriber(true);
        // [OPTIMISTIC UI] Update local state immediately
        setSubscribers(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
        try {
            const res = await api.put<Subscriber>(`subscribers/${updated.id}`, updated);
            if (res.success) {
                setSubscribers(prev => prev.map(s => s.id === updated.id ? res.data : s));
                if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                if (selectedSubscriber?.id === updated.id) setSelectedSubscriber(res.data);
                showToast('Cap nhat ho so thanh cong', 'success');
            } else {
                fetchSubscribers(pagination.page); // [ROLLBACK]
                showToast(res.message || 'Loi cap nhat ho so', 'error');
            }
        } catch (e) {
            fetchSubscribers(pagination.page); // [ROLLBACK]
            showToast('Loi ket noi khi cap nhat ho so', 'error');
        } finally {
            setIsSavingSubscriber(false); // [GUARD] Always unlock
        }
    };

    const handleRemoveFromList = async (subscriberIds: string[], listId: string, options?: { targetType: string, targetId: string }) => {
        setLoading(true);
        try {
            let payload: any = { type: 'list_remove', listId: listId };
            if (options) {
                payload.targetType = options.targetType;
                payload.targetId = options.targetId;
            } else {
                payload.subscriberIds = subscriberIds;
            }

            const res = await api.post<any>('bulk_operations', payload);
            if (res.success) {
                if (activeTab === 'contacts') fetchSubscribers(pagination.page);
                if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);

                const listRes = await api.get<any[]>('lists');
                if (listRes.success) setStaticLists(listRes.data);

                showToast(`Đã gỡ ${res.data.affected} Khách hàng khỏi danh sách`, 'success');
            } else {
                showToast(res.message || 'Lỗi khi gỡ khỏi danh sách', 'error');
            }
        } catch (error) {
            showToast('Đã xảy ra lỗi hệ thống khi gỡ khỏi danh sách', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubscriber = (id: string, name?: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa liên hệ vĩnh viễn?',
            message: (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Bạn sắp xóa vĩnh viễn liên hệ{name ? <strong> {name}</strong> : ''} khỏi hệ thống.
                    </p>
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 font-medium">
                        ⚠️ Toàn bộ lịch sử hoạt động, tag, và dữ liệu của liên hệ này sẽ bị xóa không thể khôi phục.
                    </div>
                </div>
            ),
            variant: 'danger',
            requireConfirmText: 'DELETE',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await api.delete(`subscribers/${id}`);
                    if (res.success) {
                        fetchSubscribers(pagination.page);
                        if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);

                        const listRes = await api.get<any[]>('lists');
                        if (listRes.success) setStaticLists(listRes.data);
                        const segRes = await api.get<Segment[]>('segments');
                        if (segRes.success) setSegments(segRes.data);

                        if (selectedSubscriber?.id === id) setSelectedSubscriber(null);
                        if (selectedIds.has(id)) {
                            const newSet = new Set(selectedIds);
                            newSet.delete(id);
                            setSelectedIds(newSet);
                        }
                        showToast('Đã xóa Khách hàng hoàn toàn khỏi hệ thống', 'success');
                    } else {
                        showToast(res.message || 'Lỗi khi xóa Khách hàng', 'error');
                    }
                } catch (error) {
                    showToast('Đã xảy ra lỗi hệ thống khi xóa Khách hàng', 'error');
                } finally {
                    setLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };


    const handleBulkDelete = async (options?: { targetType: string }) => {
        const isGlobal = options?.targetType === 'all';
        const countLabel = isGlobal ? pagination.total : selectedIds.size;
        const currentSelectedIds = Array.from(selectedIds);

        setConfirmModal({
            isOpen: true,
            title: `Xóa ${countLabel.toLocaleString()} liên hệ?`,
            message: isGlobal
                ? 'Hành động này sẽ xóa các liên hệ trong hệ thống (theo bộ lọc hiện tại). Bạn có 5 giây để hoàn tác sau khi xác nhận.'
                : 'Hành động này sẽ xóa các liên hệ đã chọn. Bạn có 5 giây để hoàn tác sau khi xác nhận.',
            variant: 'danger',
            requireConfirmText: 'CONFIRM',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSelectedIds(new Set()); // Optimistic clear

                const actionId = `delete_${Date.now()}`;
                const timeout = setTimeout(async () => {
                    let payload: any = { type: 'delete' };
                    if (isGlobal) {
                        payload.targetType = 'all';
                        payload.status = filterStatus;
                        payload.tag = filterTags.join(',');
                        payload.search = debouncedSearch;
                        payload.verified = filterVerify;
                        payload.has_chat = filterHasChat;
                        if (filterCustomAttrKey) {
                            payload.custom_attr_key = filterCustomAttrKey;
                            payload.custom_attr_value = filterCustomAttrValue;
                        }
                    } else {
                        payload.subscriberIds = currentSelectedIds;
                    }

                    const res = await api.post<any>('bulk_operations', payload);
                    if (res.success) {
                        fetchSubscribers(pagination.page);
                        fetchInitialData();
                    }
                    delete pendingActionsRef.current[actionId];
                }, 5000);

                pendingActionsRef.current[actionId] = timeout;

                toast((t) => (
                    <UndoToastContent
                        t={t}
                        icon={Trash2}
                        iconColorClass="bg-rose-100 text-rose-600 animate-pulse-subtle"
                        title={`Đã xóa ${countLabel} liên hệ`}
                        subtitle="Hệ thống sẽ thực hiện thao tác xóa danh tính khách hàng... "
                        durationMs={5000}
                        onUndo={() => {
                            clearTimeout(timeout);
                            delete pendingActionsRef.current[actionId];
                            setSelectedIds(new Set(currentSelectedIds)); // Restore
                            toast.dismiss(t.id);
                            toast.success('Đã hoàn tác xóa liên hệ', { icon: '↩️' });
                        }}
                    />
                ), { duration: 6000, position: 'bottom-center' });
            }
        });
    };

    const handleBulkDeleteLists = async (ids: string[]) => {
        if (ids.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Xóa ${ids.length} danh sách?`,
            message: 'Hành động này sẽ xóa danh sách nhưng KHÔNG xóa subscribers. Bạn có chắc chắn muốn tiếp tục?',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                let successCount = 0;
                for (const id of ids) {
                    const res = await api.delete(`lists?id=${id}`);
                    if (res.success) successCount++;
                }
                const lRes = await api.get<any[]>('lists');
                if (lRes.success) setStaticLists(lRes.data);
                showToast(`Đã xóa ${successCount} danh sách`, 'success');
            }
        });
    };

    const handleBulkDeleteSegments = async (ids: string[]) => {
        if (ids.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Xóa ${ids.length} segment?`,
            message: 'Segments sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                let successCount = 0;
                for (const id of ids) {
                    const res = await api.delete(`segments?id=${id}`);
                    if (res.success) successCount++;
                }
                const sRes = await api.get<Segment[]>('segments');
                if (sRes.success) setSegments(sRes.data);
                showToast(`Đã xóa ${successCount} phân khúc`, 'success');
            }
        });
    };

    const handleBulkTag = async () => {
        if (selectedIds.size === 0) return;
        setBulkTagName('');
        setBulkTagModalOpen(true);
    };

    const confirmBulkTag = async () => {
        if (!bulkTagName.trim()) return;
        const tagName = bulkTagName.trim().toUpperCase().replace(/\s+/g, '_');
        const idsToTag = Array.from(selectedIds);

        setBulkTagModalOpen(false);
        setLoading(true);
        try {
            const res = await api.post<any>('bulk_operations', {
                type: 'tag_add',
                tag: tagName,
                subscriberIds: idsToTag
            });

            if (res.success) {
                setSelectedIds(new Set());
                fetchSubscribers(pagination.page);
                const tagRes = await api.get<{ id: string, name: string }[]>('tags');
                if (tagRes.success) setTags(tagRes.data);

                toast((t) => (
                    <UndoToastContent
                        t={t}
                        icon={Tag}
                        iconColorClass="bg-orange-100 text-orange-600"
                        title={`Đã gắn nhãn #${tagName}`}
                        subtitle={`Cho ${res.data.affected} liên hệ`}
                        durationMs={6000}
                        onUndo={async () => {
                            toast.dismiss(t.id);
                            setLoading(true);
                            const undoRes = await api.post<any>('bulk_operations', {
                                type: 'tag_remove',
                                tag: tagName,
                                subscriberIds: idsToTag
                            });
                            if (undoRes.success) {
                                fetchSubscribers(pagination.page);
                                const tagRes = await api.get<{ id: string, name: string }[]>('tags');
                                if (tagRes.success) setTags(tagRes.data);
                                toast.success('Đã hoàn tác gắn nhãn', { icon: '↩️' });
                            }
                            setLoading(false);
                        }}
                    />
                ), { duration: 6000, position: 'bottom-center' });
            } else {
                showToast(res.message || 'Lỗi khi gắn tag', 'error');
            }
        } catch (e) {
            showToast('Lỗi hệ thống khi gắn tag', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAddToList = async (listId: string, isNew = false, newListName = '') => {
        setLoading(true);
        try {
            let targetListId = listId;

            if (isNew && newListName) {
                const lRes = await api.post<any>('lists', {
                    name: newListName,
                    count: 0,
                    source: 'Bulk Action',
                    created: new Date().toLocaleDateString('vi-VN')
                });
                if (lRes.success) {
                    targetListId = lRes.data.id;
                } else {
                    showToast('Lỗi khi tạo danh sách mới', 'error');
                    setLoading(false);
                    return;
                }
            }

            if (!targetListId) {
                showToast('Chưa chọn danh sách', 'error');
                setLoading(false);
                return;
            }

            const res = await api.post<any>('bulk_operations', {
                type: 'list_add',
                listId: targetListId,
                subscriberIds: Array.from(selectedIds)
            });

            if (res.success) {
                showToast(`Đã thêm ${res.data.affected} liên hệ vào danh sách`, 'success');
                setSelectedIds(new Set());
                setIsBulkListModalOpen(false);

                // Refresh data
                fetchSubscribers(pagination.page);
                const listRes = await api.get<any[]>('lists');
                if (listRes.success) {
                    setAllStaticLists(listRes.data);
                    setStaticLists(listRes.data);
                }
            } else {
                showToast(res.message || 'Lỗi khi thêm vào danh sách', 'error');
            }
        } catch (e) {
            showToast('Lỗi hệ thống khi thực hiện thao tác', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="animate-fade-in space-y-8 pb-20">
                <PageHero
                    title={<>Audience <span className="text-orange-100/80">Nexus</span></>}
                    subtitle="Quản lý vòng đời Khách hàng từ lúc đăng ký đến lúc chuyển đổi đa kênh."
                    showStatus={true}
                    statusText="Database Online"
                    actions={[
                        {
                            label: 'Import liên hệ',
                            icon: UserPlus,
                            onClick: () => setImportModalOpen(true),
                        },
                        {
                            label: 'Connect & Auto Sync',
                            icon: RefreshCw,
                            onClick: () => setIsIntegrationsModalOpen(true),

                        },
                        {
                            label: 'Mẹo tăng trưởng',
                            icon: Lightbulb,
                            onClick: () => setIsTipsModalOpen(true),
                            primary: true

                        }
                    ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[24px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Liên hệ</p>
                            {loading ? (
                                <div style={{ width: 100, height: 32, borderRadius: 8, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></div>
                            ) : (
                                <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{stats.total.toLocaleString()}</h3>
                            )}
                        </div>
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-amber-600/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <Users className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[24px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Customer</p>
                            {loading ? (
                                <div style={{ width: 80, height: 32, borderRadius: 8, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></div>
                            ) : (
                                <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{stats.customer.toLocaleString()}</h3>
                            )}
                        </div>
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <ShieldCheck className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[24px] border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between group cursor-default">
                        <div>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Hủy đăng ký</p>
                            {loading ? (
                                <div style={{ width: 70, height: 32, borderRadius: 8, background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></div>
                            ) : (
                                <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{stats.unsubscribed.toLocaleString()}</h3>
                            )}
                        </div>
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-rose-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                            <UserMinus className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                    </div>
                </div>

                {/* Reporting Section */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                                Báo cáo tăng trưởng & Hoạt động
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Theo dõi lượng Khách hàng mới và hoạt động tương tác</p>
                        </div>
                        <div className="w-full sm:w-48">
                            <Select
                                value={reportPeriod}
                                onChange={(val) => setReportPeriod(val)}
                                icon={Calendar}
                                options={[
                                    { value: 'today', label: 'Hôm nay' },
                                    { value: 'yesterday', label: 'Hôm qua' },
                                    { value: 'week', label: 'Tuần này' },
                                    { value: 'month', label: 'Tháng này' },
                                    { value: 'quarter', label: 'Quý này' },
                                    { value: 'year', label: 'Năm nay' }
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. New Total */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-3.5 lg:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-4 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Khách hàng mới</p>
                                <div className="flex items-center gap-2">
                                    <h5 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                        {reportStats ? (reportStats.growth?.toLocaleString() || '0') : (
                                            <span style={{ display: 'inline-block', width: 60, height: 28, borderRadius: 6, background: '#e2e8f0', position: 'relative', overflow: 'hidden', verticalAlign: 'bottom' }}><span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></span>
                                        )}
                                    </h5>
                                    {reportStats && reportStats.growth_trend !== 0 && (
                                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black ${reportStats.growth_trend > 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}`}>
                                            {reportStats.growth_trend > 0 ? <Plus className="w-2 h-2" /> : '-'}
                                            {Math.abs(reportStats.growth_trend)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Active Customers */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-3.5 lg:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-4 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Khách hoạt động</p>
                                <div className="flex items-center gap-2">
                                    <h5 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                        {reportStats ? (reportStats.active?.toLocaleString() || '0') : (
                                            <span style={{ display: 'inline-block', width: 60, height: 28, borderRadius: 6, background: '#e2e8f0', position: 'relative', overflow: 'hidden', verticalAlign: 'bottom' }}><span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></span>
                                        )}
                                    </h5>
                                    {reportStats && reportStats.active_trend !== 0 && (
                                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black ${reportStats.active_trend > 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}`}>
                                            {reportStats.active_trend > 0 ? <Plus className="w-2 h-2" /> : '-'}
                                            {Math.abs(reportStats.active_trend)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Churn */}
                        <div className="bg-gradient-to-br from-slate-50 to-white p-3.5 lg:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center gap-4 hover:shadow-md transition-all group">
                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/60 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                <UserMinus className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rời bỏ (Churn)</p>
                                <div className="flex items-center gap-2">
                                    <h5 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                        {reportStats ? (reportStats.churn?.toLocaleString() || '0') : (
                                            <span style={{ display: 'inline-block', width: 60, height: 28, borderRadius: 6, background: '#e2e8f0', position: 'relative', overflow: 'hidden', verticalAlign: 'bottom' }}><span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} /></span>
                                        )}
                                    </h5>
                                    {reportStats && reportStats.churn_trend !== 0 && (
                                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black ${reportStats.churn_trend < 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}`}>
                                            {reportStats.churn_trend > 0 ? <Plus className="w-2 h-2" /> : '-'}
                                            {Math.abs(reportStats.churn_trend)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl lg:rounded-[32px] border border-slate-200 dark:border-slate-700/60 shadow-sm p-3 lg:p-6">
                    <Tabs
                        activeId={activeTab}
                        onChange={setActiveTab}
                        className="flex-nowrap overflow-x-auto scrollbar-hide -mx-3 px-3 lg:mx-0 lg:px-0 mb-6"
                        items={[
                            { id: 'contacts', label: 'Tất cả liên hệ', icon: Users, count: pagination.total },
                            { id: 'segments', label: 'Phân khúc', icon: Layers, count: segmentsPagination.total },
                            { id: 'lists', label: 'Danh sách tĩnh', icon: List, count: allStaticLists.filter(isManualList).length },
                            { id: 'meta', label: 'Meta Audience', icon: Facebook },
                            { id: 'zalo', label: 'Zalo Audience', icon: MessageCircle },
                            { id: 'integrations', label: 'Kết nối đồng bộ', icon: Zap, count: integrations.length },
                        ]}
                    />

                    <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 mb-6">
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                            <div className="flex-1 relative group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 h-11 flex items-center overflow-hidden">
                                <Search className="w-4 h-4 ml-4 text-slate-400" />
                                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm tên, email..." className="w-full h-full bg-transparent border-none outline-none text-sm px-3 font-medium" />
                            </div>
                            {activeTab === 'contacts' && (
                                <div className="flex gap-2 flex-wrap">
                                    <AdvancedFilters
                                        filterStatus={filterStatus}
                                        filterTags={filterTags}
                                        filterVerify={filterVerify}
                                        filterHasChat={filterHasChat}
                                        filterSalesperson={filterSalesperson}
                                        filterCustomAttrKey={filterCustomAttrKey}
                                        filterCustomAttrValue={filterCustomAttrValue}
                                        onStatusChange={setFilterStatus}
                                        onTagsChange={setFilterTags}
                                        onVerifyChange={setFilterVerify}
                                        onHasChatChange={setFilterHasChat}
                                        onSalespersonChange={setFilterSalesperson}
                                        onCustomAttrChange={(key, value) => {
                                            setFilterCustomAttrKey(key);
                                            setFilterCustomAttrValue(value);
                                            setPagination(prev => ({ ...prev, page: 1 }));
                                        }}
                                        tags={tags}
                                        customAttrKeys={customAttrKeys}
                                    />
                                    <div className="w-48">
                                        <Select
                                            variant="outline"
                                            icon={TrendingUp}
                                            value={sortBy}
                                            onChange={(val) => {
                                                setSortBy(val);
                                                if (val === 'birthday_custom') setIsDateRangeModalOpen(true);
                                            }}
                                            options={[
                                                { value: 'newest', label: 'Mới nhất' },
                                                { value: 'score', label: 'Điểm cao nhất' },
                                                { value: 'recent_activity', label: 'Tương tác gần đây' },
                                                { value: 'unlisted', label: 'Chưa vào danh sách' },
                                                { value: 'birthday_today', label: 'Sinh nhật hôm nay' },
                                                { value: 'birthday_month', label: 'Sinh nhật tháng này' },
                                                { value: 'birthday_custom', label: 'Tùy chọn khoảng sinh nhật...' }
                                            ]}
                                        />
                                    </div>
                                    {sortBy === 'recent_activity' && (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trong</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={recentDays}
                                                onChange={(e) => setRecentDays(parseInt(e.target.value) || 7)}
                                                className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                            />
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ngày</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {activeTab === 'contacts' && (
                                <ColumnCustomizer
                                    columns={COLUMN_DEFINITIONS}
                                    visibleColumns={visibleColumns}
                                    onChange={setVisibleColumns}
                                />
                            )}
                            {activeTab === 'segments' && (
                                <>
                                    <Button variant="secondary" size="sm" icon={RefreshCw} onClick={adminGuard(async () => {
                                        setLoading(true);
                                        const res = await api.post('segments?route=sync', {});
                                        if (res.success) {
                                            const sRes = await api.get<Segment[]>('segments');
                                            if (sRes.success) setSegments(sRes.data);
                                            showToast('Đã đồng bộ lại dữ liệu phân khúc', 'success');
                                        }
                                        setLoading(false);
                                    }, 'đồng bộ phân khúc')}>Làm mới</Button>
                                    <Button size="sm" onClick={adminGuard(() => { setEditingSegment(null); setSegmentBuilderOpen(true); }, 'tạo phân khúc')}>Tạo phân khúc</Button>
                                </>
                            )}
                            {activeTab === 'lists' && <Button size="sm" onClick={adminGuard(() => setIsCreateListModalOpen(true), 'tạo danh sách')}>Tạo danh sách</Button>}
                        </div>
                    </div>

                    {activeTab === 'contacts' && (
                        <FilterPills
                            filters={{
                                status: filterStatus,
                                tags: filterTags,
                                verify: filterVerify,
                                hasChat: filterHasChat,
                                salesperson: filterSalesperson
                            }}
                            onRemove={(key, value) => {
                                if (key === 'status') setFilterStatus('all');
                                else if (key === 'tags') setFilterTags(prev => prev.filter(t => t !== value));
                                else if (key === 'verify') setFilterVerify('all');
                                else if (key === 'hasChat') setFilterHasChat('all');
                                else if (key === 'salesperson') setFilterSalesperson('');
                            }}
                            onClearAll={() => {
                                setFilterStatus('all');
                                setFilterTags([]);
                                setFilterVerify('all');
                                setFilterHasChat('all');
                                setFilterSalesperson('');
                            }}
                            tags={tags}
                        />
                    )}

                    <div className="animate-in fade-in duration-300">
                        {activeTab === 'lists' && (
                            <TabTransition>
                                <ListsTab
                                    loading={loading}
                                    lists={staticLists.filter(isManualList)}
                                    currentPage={listsPagination.page}
                                    totalPages={listsPagination.totalPages}
                                    onPageChange={(p) => setListsPagination(prev => ({ ...prev, page: p }))}
                                    onView={(list) => setViewingGroup({ id: list.id, name: list.name, type: 'list', count: list.count })}
                                    onEdit={adminGuard(setEditingList, 'sửa danh sách')}
                                    onDelete={adminGuard(async (id) => {
                                        // Check if this list is linked to any form before allowing delete
                                        const list = staticLists.find(l => l.id === id);
                                        const checkRes = await api.get<{ id: string; name: string }[]>(`forms?list_id=${id}`);
                                        const linkedForms = (checkRes.success && Array.isArray(checkRes.data)) ? checkRes.data : [];

                                        if (linkedForms.length > 0) {
                                            // Block deletion — show form protection modal
                                            setFormProtectionModal({ isOpen: true, listName: list?.name || id, linkedForms });
                                            return;
                                        }

                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Xóa danh sách?',
                                            message: 'Gỡ toàn bộ Khách hàng khỏi danh sách này.',
                                            variant: 'danger',
                                            onConfirm: async () => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                const res = await api.delete(`lists/${id}`);
                                                if (res.success) {
                                                    fetchLists(listsPagination.page);
                                                    showToast('Đã xóa danh sách thành công', 'success');
                                                } else {
                                                    showToast(res.message, 'error');
                                                    if (res.message && res.message.includes('đang được sử dụng trong Flow')) {
                                                        setTimeout(() => {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Xác nhận xóa cưỡng chế',
                                                                message: (
                                                                    <div className="space-y-3">
                                                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">{res.message}</p>
                                                                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-medium leading-relaxed">
                                                                            ⚠️ Cảnh báo: Việc xóa này có thể khiến các DOMATION Flow đang chạy gặp lỗi. Bạn vẫn muốn tiếp tục xóa cưỡng chế danh sách này?
                                                                        </div>
                                                                    </div>
                                                                ),
                                                                variant: 'danger',
                                                                requireConfirmText: 'FORCE DELETE',
                                                                onConfirm: async () => {
                                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                    const forceRes = await api.delete(`lists/${id}?force=1`);
                                                                    if (forceRes.success) {
                                                                        fetchLists(listsPagination.page);
                                                                        showToast('Đã xóa danh sách thành công (Cưỡng chế)', 'success');
                                                                    } else {
                                                                        showToast(forceRes.message || 'Lỗi khi xóa cưỡng chế', 'error');
                                                                    }
                                                                }
                                                            });
                                                        }, 300);
                                                    }
                                                }
                                            }
                                        });
                                    }, 'xóa danh sách')}
                                    onBulkDelete={adminGuard(handleBulkDeleteLists, 'xóa danh sách')}
                                    onMerge={adminGuard((listIds) => {
                                        const lists = staticLists.filter(l => listIds.includes(l.id));
                                        setMergingLists(lists);
                                        setIsMergeModalOpen(true);
                                    }, 'gộp danh sách')}
                                    onCleanup={adminGuard((list) => setCleanupTarget({ id: list.id, name: list.name, type: 'list' }), 'dọn rác danh sách')}
                                    onSplit={adminGuard((list) => { setSplittingTarget({ id: list.id, name: list.name, type: 'list', count: list.count }); setSplitSelectedIds([]); }, 'tách danh sách')}
                                />
                            </TabTransition>
                        )}
                        {activeTab === 'segments' && (
                            <TabTransition>
                                <SegmentsTab
                                    loading={loading}
                                    segments={segments}
                                    currentPage={segmentsPagination.page}
                                    totalPages={segmentsPagination.totalPages}
                                    onPageChange={(p) => setSegmentsPagination(prev => ({ ...prev, page: p }))}
                                    onView={(seg) => setViewingGroup({ id: seg.id, name: seg.name, type: 'segment', count: seg.count })}
                                    onEdit={adminGuard((seg) => { setEditingSegment(seg); setSegmentBuilderOpen(true); }, 'sửa phân khúc')}
                                    onDelete={adminGuard((id) => setConfirmModal({
                                        isOpen: true, title: 'Xóa phân khúc?', message: 'Dữ liệu phân khúc động sẽ bị xóa.', variant: 'danger', onConfirm: async () => {
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            await api.delete(`segments/${id}`);
                                            fetchSegments(segmentsPagination.page);
                                            showToast('Đã xóa phân khúc thành công', 'success');
                                        }
                                    }), 'xóa phân khúc')}
                                    onBulkDelete={adminGuard(handleBulkDeleteSegments, 'xóa phân khúc')}
                                    onSplit={adminGuard((seg) => { setSplittingTarget({ id: seg.id, name: seg.name, type: 'segment', count: seg.count }); setSplitSelectedIds([]); }, 'tách phân khúc')}
                                    onRefresh={fetchInitialData}
                                    onCleanup={adminGuard((seg) => setCleanupTarget({ id: seg.id, name: seg.name, type: 'segment' }), 'dọn rác phân khúc')}
                                />
                            </TabTransition>
                        )}
                        {activeTab === 'contacts' && (
                            <TabTransition>
                                <ContactsTab
                                    loading={loading}
                                    subscribers={subscribers}
                                    selectedIds={selectedIds}
                                    onToggleSelection={handleToggleSelection}
                                    onToggleSelectAll={handleToggleSelectAll}
                                    onSelectSubscriber={setSelectedSubscriber}
                                    formatRelativeTime={formatRelativeTime}
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    totalCount={pagination.total}
                                    onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
                                    onBulkDelete={handleBulkDelete}
                                    onBulkTag={handleBulkTag}
                                    onBulkAddToList={() => setIsBulkListModalOpen(true)}
                                    isGlobalSelected={isGlobalSelected}
                                    onToggleGlobalSelection={setIsGlobalSelected}
                                    visibleColumns={visibleColumns}
                                    itemsPerPage={itemsPerPage}
                                    onItemsPerPageChange={(newValue) => {
                                        setItemsPerPage(newValue);
                                        setPagination(prev => ({ ...prev, page: 1, limit: newValue }));
                                    }}
                                />
                            </TabTransition>
                        )}
                        {activeTab === 'integrations' && (
                            <TabTransition>
                                <IntegrationsTab
                                    integrations={integrations}
                                    lists={allStaticLists}
                                    onEdit={adminGuard((item) => {
                                        setEditingIntegration(item);
                                        setIsIntegrationsModalOpen(true);
                                    }, 'sửa cấu hình')}
                                    onView={(item) => {
                                        const config = JSON.parse(item.config || '{}');
                                        if (config.targetListId) {
                                            const targetList = allStaticLists.find(l => l.id == config.targetListId);
                                            if (targetList) {
                                                setViewingGroup({ id: targetList.id, name: targetList.name, type: 'list', count: targetList.count });
                                            } else {
                                                showToast('Không tìm thấy danh sách đích (có thể đã bị xóa)', 'error');
                                            }
                                        } else {
                                            showToast('Kết nối này chưa được cấu hình danh sách đích', 'error');
                                        }
                                    }}
                                    onCleanup={adminGuard((item) => {
                                        const config = JSON.parse(item.config || '{}');
                                        if (config.targetListId) {
                                            const targetList = allStaticLists.find(l => l.id == config.targetListId);
                                            if (targetList) {
                                                setCleanupTarget({ id: targetList.id, name: targetList.name, type: 'list' });
                                            }
                                        }
                                    }, 'dọn rác kết nối')}
                                    onSplit={adminGuard((item) => {
                                        const config = JSON.parse(item.config || '{}');
                                        if (config.targetListId) {
                                            const targetList = allStaticLists.find(l => l.id == config.targetListId);
                                            if (targetList) {
                                                setSplittingTarget({ id: targetList.id, name: targetList.name, type: 'list', count: targetList.count });
                                                setSplitSelectedIds([]);
                                            }
                                        }
                                    }, 'tách danh sách kết nối')}
                                    onDelete={adminGuard((id) => {
                                        const integration = integrations.find(i => i.id === id);
                                        const config = integration ? JSON.parse(integration.config || '{}') : {};
                                        const targetListId = config.targetListId;
                                        const targetList = targetListId ? allStaticLists.find(l => l.id === targetListId) : null;

                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Xóa kết nối đồng bộ?',
                                            message: targetList
                                                ? `Kết nối sẽ bị xóa và danh sách "${targetList.name}" (${targetList.count} liên hệ) cũng sẽ bị xóa. Bạn có chắc chắn?`
                                                : 'Kết nối sẽ bị xóa. Dữ liệu đã tải về sẽ KHÔNG bị xóa.',
                                            variant: 'danger',
                                            onConfirm: async () => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                if (targetListId) {
                                                    await api.delete(`lists/${targetListId}`);
                                                }
                                                await api.delete(`integrations?id=${id}`);
                                                fetchIntegrations();
                                                const listRes = await api.get<any[]>('lists');
                                                if (listRes.success) {
                                                    setAllStaticLists(listRes.data);
                                                    setStaticLists(listRes.data);
                                                }
                                                showToast(
                                                    targetList
                                                        ? `Đã xóa kết nối và danh sách "${targetList.name}"`
                                                        : 'Đã xóa kết nối',
                                                    'success'
                                                );
                                            }
                                        });
                                    }, 'xóa kết nối')}
                                    onSyncNow={adminGuard(async (id) => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Đồng bộ ngay',
                                            message: 'Bắt đầu quá trình đồng bộ dữ liệu từ nguồn bên ngoài. Việc này có thể mất vài phút tùy vào lượng dữ liệu.',
                                            variant: 'warning',
                                            onConfirm: async () => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                setIntegrations(prev => prev.map(i =>
                                                    i.id === id ? { ...i, sync_status: 'syncing' } : i
                                                ));

                                                showToast('Đang tiến hành đồng bộ...', 'info');
                                                try {
                                                    // This call is SYNCHRONOUS in integrations.php
                                                    const res = await api.post(`integrations?route=sync_now&id=${id}`, {});
                                                    
                                                    if (res.success) {
                                                        showToast('Đồng bộ thành công!', 'success');
                                                        // Refresh integrations and lists immediately
                                                        fetchIntegrations(true);
                                                        const [listRes] = await Promise.all([
                                                            api.get<any[]>('lists'),
                                                            fetchReportStats(reportPeriod)
                                                        ]);
                                                        if (listRes.success) setAllStaticLists(listRes.data);
                                                    } else {
                                                        showToast(res.message || 'Lỗi khi đồng bộ.', 'error');
                                                        fetchIntegrations(true);
                                                    }
                                                } catch (e) {
                                                    showToast('Lỗi khi kết nối máy chủ đồng bộ.', 'error');
                                                    setIntegrations(prev => prev.map(i =>
                                                        i.id === id ? { ...i, sync_status: 'idle' } : i
                                                    ));
                                                }
                                            }
                                        });
                                    }, 'đồng bộ kết nối')}
                                />
                            </TabTransition>
                        )}
                        {activeTab === 'meta' && <TabTransition className="mt-8"><MetaCustomers /></TabTransition>}
                        {activeTab === 'zalo' && <TabTransition className="mt-8"><ZaloAudienceTab /></TabTransition>}
                    </div>
                </div>
            </div>

            <SegmentBuilderModal isOpen={isSegmentBuilderOpen} onClose={() => setSegmentBuilderOpen(false)} onSave={async (seg) => {
                const isNew = !seg.id;
                const res = isNew ? await api.post<Segment>('segments', seg) : await api.put<Segment>(`segments/${seg.id}`, seg);
                if (res.success) {
                    const sRes = await api.get<Segment[]>('segments');
                    if (sRes.success) setAllSegments(sRes.data);
                    if (isNew) {
                        setSegmentsPagination(prev => ({ ...prev, page: 1 }));
                    } else {
                        fetchSegments(segmentsPagination.page);
                    }
                    showToast('Đã lưu phân khúc động', 'success');
                }
            }} initialSegment={editingSegment} subscribers={[]} />

            <ListFormModal isOpen={isCreateListModalOpen || !!editingList} onClose={() => { setIsCreateListModalOpen(false); setEditingList(null); }} list={editingList} onSave={async (d, isNew) => {
                setLoading(true);
                try {
                    let res;
                    if (isNew) {
                        res = await api.post('lists', { ...d, count: 0, source: d.source || 'Manual', created: new Date().toLocaleDateString('vi-VN') });
                        if (res.success) showToast('Đã tạo danh sách tĩnh', 'success');
                    } else {
                        res = await api.put(`lists/${editingList.id}`, { ...editingList, ...d });
                        if (res.success) showToast('Đã cập nhật danh sách', 'success');
                    }
                    if (res?.success) {
                        const lRes = await api.get<any[]>('lists');
                        if (lRes.success) setAllStaticLists(lRes.data);
                        // Always call fetchLists directly — do NOT rely on pagination state change
                        // because setListsPagination({ page: 1 }) is a no-op when already on page 1
                        // and the useEffect would never fire
                        fetchLists(isNew ? 1 : listsPagination.page);
                        setIsCreateListModalOpen(false);
                        setEditingList(null);
                    } else {
                        showToast(res?.message || 'Lỗi khi lưu danh sách', 'error');
                    }
                } catch (error) {
                    showToast('Đã xảy ra lỗi hệ thống khi lưu danh sách', 'error');
                } finally {
                    setLoading(false);
                }
            }} isNew={isCreateListModalOpen} />

            <ImportSubscribersModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                existingLists={allStaticLists}
                existingEmails={new Set(subscribers.map(s => s.email).filter(Boolean))}
                existingPhones={new Set(subscribers.map(s => s.phoneNumber).filter(Boolean) as string[])}
                onImport={async (d) => {
                    const { subscribers: newSubs, targetListId, newListName } = d;
                    let finalListId = targetListId;
                    try {
                        if (newListName) {
                            const lRes = await api.post<any>('lists', {
                                name: newListName,
                                count: 0,
                                source: 'Import CSV',
                                created: new Date().toLocaleDateString('vi-VN')
                            });
                            if (lRes.success) finalListId = lRes.data.id;
                        }

                        if (newSubs.length > 0) {
                            // Define standard keys to separate from custom ones
                            const STANDARD_KEYS = [
                                'email', 'firstName', 'lastName', 'phoneNumber', 'jobTitle',
                                'companyName', 'city', 'country', 'gender', 'dateOfBirth',
                                'anniversaryDate', 'tags', 'source', 'salesperson', 'joinedAt'
                            ];

                            const subsPayload = newSubs.map((s: any) => {
                                const customAttr: Record<string, any> = {};
                                // Extract custom attributes
                                Object.keys(s).forEach(key => {
                                    if (!STANDARD_KEYS.includes(key)) {
                                        customAttr[key] = s[key];
                                    }
                                });

                                return {
                                    ...s,
                                    listIds: finalListId ? [finalListId] : [],
                                    tags: s.tags ? s.tags.split(',').map((t: string) => t.trim().toUpperCase().replace(/\s+/g, '_')) : [],
                                    joinedAt: new Date().toISOString(),
                                    status: 'active',
                                    source: s.source || 'Import CSV',
                                    stats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 },
                                    customAttributes: customAttr
                                };
                            });

                            await api.post('bulk_operations', { 
                                type: 'import', 
                                subscribers: subsPayload,
                                createVirtualEmail: d.createVirtualEmail
                            });
                            showToast(`Đã import thành công ${newSubs.length} liên hệ!`, 'success');

                            fetchSubscribers(1);
                            const [lRes, tagRes] = await Promise.all([
                                api.get<any[]>('lists'),
                                api.get<{ id: string, name: string }[]>('tags')
                            ]);
                            if (lRes.success) setAllStaticLists(lRes.data);
                            if (tagRes.success) setTags(tagRes.data);
                            fetchLists(listsPagination.page);
                        }
                    } catch (error) {
                        showToast('Lỗi khi import dữ liệu', 'error');
                    }
                }}
            />

            <IntegrationsModal
                isOpen={isIntegrationsModalOpen}
                onClose={() => {
                    setIsIntegrationsModalOpen(false);
                    setEditingIntegration(null);
                    fetchIntegrations();
                }}
                editingIntegration={editingIntegration}
            />

            <GroupDetailModal
                isOpen={!!viewingGroup}
                onClose={() => setViewingGroup(null)}
                group={viewingGroup}
                members={groupMembers}
                totalCount={groupPagination.total}
                currentPage={groupPagination.page}
                totalPages={groupPagination.totalPages}
                loading={groupLoading}
                onPageChange={(p) => viewingGroup && setGroupPagination(prev => ({ ...prev, page: p }))}
                onSearch={(term) => { setGroupSearch(term); setGroupPagination(prev => ({ ...prev, page: 1 })) }}
                onStatusFilter={(status) => { setGroupStatus(status); setGroupPagination(prev => ({ ...prev, page: 1 })) }}
                activeStatusFilter={groupStatus}
                onCleanup={async (id) => {
                    if (!viewingGroup) return;
                    setLoading(true);
                    try {
                        const res = await api.post<any>('lists?route=cleanup', {
                            targetId: id,
                            targetType: viewingGroup.type,
                            cleanupType: 'junk',
                            statuses: ['unsubscribed', 'error', 'bounced', 'complained'],
                            action: 'remove'
                        });
                        if (res.success) {
                            showToast(res.message || 'Đã dọn dẹp thành công', 'success');
                            fetchInitialData();
                            if (viewingGroup) fetchGroupMembers(viewingGroup, 1, groupSearch);
                        } else {
                            showToast(res.message || 'Lỗi khi dọn dẹp', 'error');
                        }
                    } catch (error) {
                        showToast('Đã xảy ra lỗi hệ thống khi dọn dẹp', 'error');
                    } finally {
                        setLoading(false);
                    }
                }}
                onRemoveFromList={(ids, opts) => {
                    if (viewingGroup?.type === 'list') {
                        handleRemoveFromList(ids, viewingGroup.id, opts);
                    }
                }}
                onRemoveFromTag={async (ids, opts) => {
                    setLoading(true);
                    try {
                        let payload: any = { type: 'tag_remove', tag: viewingGroup.name };
                        if (opts) {
                            payload.targetType = opts.targetType;
                            payload.targetId = opts.targetId;
                        } else {
                            payload.subscriberIds = ids;
                        }
                        const res = await api.post<any>('bulk_operations', payload);
                        if (res.success) {
                            fetchSubscribers(pagination.page);
                            if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                            showToast(`Đã gỡ nhãn khỏi ${res.data.affected} Khách hàng`, 'success');
                        } else {
                            showToast(res.message || 'Lỗi khi gỡ nhãn', 'error');
                        }
                    } catch (error) {
                        showToast('Đã xảy ra lỗi hệ thống khi gỡ nhãn', 'error');
                    } finally {
                        setLoading(false);
                    }
                }}
                onExcludeFromSegment={async (ids, segmentId) => {
                    setLoading(true);
                    try {
                        const res = await api.post<{ count: number }>('segments?route=exclude', { segment_id: segmentId, subscriber_ids: ids });
                        if (res.success) {
                            fetchSubscribers(pagination.page);
                            if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                            showToast(`Đã gỡ vĩnh viễn ${res.data?.count || 0} Khách hàng khỏi phân khúc`, 'success');
                        } else {
                            showToast(res.message || 'Lỗi khi gỡ khỏi phân khúc', 'error');
                        }
                    } catch (error) {
                        showToast('Đã xảy ra lỗi hệ thống khi gỡ khỏi phân khúc', 'error');
                    } finally {
                        setLoading(false);
                    }
                }}
                onSplit={(ids, group) => {
                    // GroupDetailModal passes the group entity, we need to handle it
                    // Assuming 'group' here matches the structure we need or we reconstruct it
                    setSplittingTarget({ id: group.id, name: group.name, type: (group as any).criteria ? 'segment' : 'list', count: (group as any).count || 0 });
                    setSplitSelectedIds(ids);
                }}
                onViewProfile={setSelectedSubscriber}
            />

            <CustomerProfileModal
                subscriber={selectedSubscriber}
                onClose={() => setSelectedSubscriber(null)}
                onUpdate={handleUpdateSubscriber}
                onDelete={handleDeleteSubscriber}
                allLists={allStaticLists}
                allSegments={allSegments}
                allFlows={flows}
                allTags={tags}
                checkMatch={checkSegmentMatch}
                onAddToList={async (subId, listId) => {
                    const getRes = await api.get<any>(`subscribers?id=${subId}`);
                    if (getRes.success) {
                        const sub = getRes.data;
                        if (Array.isArray(sub.listIds) && !sub.listIds.includes(listId)) {
                            await handleUpdateSubscriber({ ...sub, listIds: [...sub.listIds, listId] });
                        }
                    }
                }}
                onRemoveFromList={async (subId, listId) => {
                    await handleRemoveFromList([subId], listId);
                }}
            />


            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant || 'danger'}
                requireConfirmText={confirmModal.requireConfirmText}
            />

            <ConfirmModal
                isOpen={bulkTagModalOpen}
                onClose={() => setBulkTagModalOpen(false)}
                onConfirm={confirmBulkTag}
                title="Gắn nhãn hàng loạt"
                confirmLabel="Xác nhận gắn nhãn"
                message={
                    <div className="space-y-4">
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                            <Tag className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-emerald-800">Gắn tag cho {selectedIds.size} liên hệ</h4>
                                <p className="text-xs text-emerald-600/80 mt-1">Các liên hệ đã chọn sẽ được bổ sung nhãn mới này.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên nhãn muốn gắn</label>
                            <input
                                placeholder="VD: KHACH_QUEN, VIP_2024..."
                                value={bulkTagName}
                                onChange={(e) => setBulkTagName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm font-black text-slate-800 dark:text-slate-200 uppercase placeholder:text-slate-300 outline-none focus:bg-white dark:bg-slate-900 focus:border-emerald-500 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>
                }
            />

            {splittingTarget && (
                <AudienceSplitModal
                    sourceId={splittingTarget.id}
                    sourceName={splittingTarget.name}
                    sourceType={splittingTarget.type}
                    subscriberCount={splittingTarget.count}
                    selectedIds={splitSelectedIds}
                    onClose={() => setSplittingTarget(null)}
                    onRequestSelection={() => {
                        setViewingGroup({
                            id: splittingTarget.id,
                            name: splittingTarget.name,
                            type: splittingTarget.type,
                            count: splittingTarget.count
                        });
                        setSplittingTarget(null);
                    }}
                    onSuccess={() => {
                        fetchInitialData();
                        if (activeTab === 'lists') setListsPagination(prev => ({ ...prev, page: 1 }));
                        if (activeTab === 'segments') setSegmentsPagination(prev => ({ ...prev, page: 1 }));

                        // Also refresh group members if we are viewing that group
                        if (viewingGroup && viewingGroup.id === splittingTarget.id) {
                            fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                        }
                    }}
                />
            )}

            {isMergeModalOpen && (
                <ListMergeModal
                    lists={mergingLists}
                    onClose={() => {
                        setIsMergeModalOpen(false);
                        setMergingLists([]);
                    }}
                    onSuccess={() => {
                        fetchLists(listsPagination.page);
                        const lRes = api.get<any[]>('lists');
                        lRes.then(res => {
                            if (res.success) setAllStaticLists(res.data);
                        });
                    }}
                />
            )}

            {cleanupTarget && (
                <CleanupModal
                    target={cleanupTarget}
                    onClose={() => setCleanupTarget(null)}
                    onSuccess={() => {
                        fetchInitialData();
                        if (activeTab === 'lists') fetchLists(listsPagination.page);
                        if (activeTab === 'segments') fetchSegments(segmentsPagination.page);
                    }}
                />
            )}
            {/* Date Range Modal */}
            {isDateRangeModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Chọn khoảng Thời gian</h3>
                            <button onClick={() => setIsDateRangeModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Từ ngày</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm font-semibold focus:border-blue-500 focus:bg-white dark:bg-slate-900 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đến ngày</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm font-semibold focus:border-blue-500 focus:bg-white dark:bg-slate-900 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1" onClick={() => setIsDateRangeModalOpen(false)}>Hủy</Button>
                            <Button className="flex-1" onClick={() => {
                                setIsDateRangeModalOpen(false);
                                // Trigger refresh by updating state dependency (already handled by useEffect depending on dateRange)
                                // But to be sure, if dateRange didn't change (e.g. re-opening), we might want to force.
                                // React dependency on object `dateRange` handles content changes.
                                // We might need to handle empty selection case? 
                                if (!dateRange.from || !dateRange.to) showToast('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc', 'error');
                            }}>Áp dụng</Button>
                        </div>
                    </div>
                </div>
            )}
            {isBulkListModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-lg shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300 relative border border-slate-100 dark:border-slate-800/60">
                        <button onClick={() => setIsBulkListModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-all">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Thêm vào danh sách</h3>
                            <p className="text-sm font-medium text-slate-400">Chọn danh sách có sẵn hoặc tạo danh sách mới cho <span className="text-orange-600 font-bold">{selectedIds.size.toLocaleString()}</span> liên hệ đã chọn.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn danh sách hiện có</label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1">
                                    {allStaticLists.filter(isManualList).map(list => (
                                        <button
                                            key={list.id}
                                            onClick={() => handleBulkAddToList(list.id)}
                                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 hover:bg-orange-50 hover:border-orange-200 border border-transparent rounded-2xl transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-orange-100 transition-colors">
                                                    <List className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-900">{list.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{list.count.toLocaleString()} liên hệ</p>
                                                </div>
                                            </div>
                                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800/60"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Hoặc tạo mới</span></div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên danh sách mới</label>
                                <div className="flex gap-2">
                                    <input
                                        id="newListNameBulk"
                                        type="text"
                                        placeholder="Ví dụ: Khách hàng VIP 2026..."
                                        className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-bold outline-none focus:border-orange-500 focus:bg-white dark:bg-slate-900 transition-all shadow-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.currentTarget as HTMLInputElement).value;
                                                if (val) handleBulkAddToList('', true, val);
                                            }
                                        }}
                                    />
                                    <Button onClick={() => {
                                        const el = document.getElementById('newListNameBulk') as HTMLInputElement;
                                        if (el.value) handleBulkAddToList('', true, el.value);
                                        else showToast('Vui lòng nhập tên danh sách', 'error');
                                    }}>Tạo & Thêm</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <AudienceTipsModal
                isOpen={isTipsModalOpen}
                onClose={() => setIsTipsModalOpen(false)}
            />

            {/* Form Protection Modal */}
            {formProtectionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFormProtectionModal(prev => ({ ...prev, isOpen: false }))} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-2xl">🔗</span>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-200">Không thể xóa danh sách</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Danh sách <strong className="text-slate-700 dark:text-slate-200">"{formProtectionModal.listName}"</strong> đang được kết nối với form thu thập dữ liệu. Hãy hủy liên kết trước khi xóa.
                                </p>
                            </div>
                        </div>

                        {/* Linked Forms */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">Form đang sử dụng danh sách này</p>
                            <div className="space-y-2">
                                {formProtectionModal.linkedForms.map(form => (
                                    <div key={form.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-amber-100 px-3 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                                                <FileText className="w-3.5 h-3.5 text-amber-600" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{form.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormProtectionModal(prev => ({ ...prev, isOpen: false }));
                                                navigate(`/forms/${form.id}`);
                                            }}
                                            className="text-[10px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-wide px-2 py-1 hover:bg-amber-50 rounded-lg transition-colors"
                                        >
                                            Mở Form →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/60 rounded-xl px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium mb-5 leading-relaxed">
                            💡 Vào Form → Chỉnh sửa → Đổi <strong>"Danh sách nhận liên hệ"</strong> sang danh sách khác hoặc để trống, sau đó quay lại xóa danh sách này.
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setFormProtectionModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormProtectionModal(prev => ({ ...prev, isOpen: false }));
                                    navigate('/forms');
                                }}
                                className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-sm"
                            >
                                Đến trang Forms
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {AdminPermModal}
        </>
    );
};

export default Audience;
