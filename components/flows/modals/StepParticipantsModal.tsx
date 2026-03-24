import * as React from 'react';
import { useState, useEffect } from 'react';
import { X, Search, RefreshCcw, Check, MailOpen, Clock, Download, MousePointer2, MessageSquare, AlertOctagon, Reply, MousePointerClick, Monitor, Smartphone, Tablet, Globe, FastForward, Trash2, Play, SkipForward, UserPlus, Send, Loader2, ChevronDown, Tag, List } from 'lucide-react';
import { api } from '../../../services/storageAdapter';
import Skeleton from '../../common/Skeleton';
import LinkClicksTab from '../../common/LinkClicksTab';
import TechStatsTab from '../../campaigns/TechStatsTab';
import toast from 'react-hot-toast';
import ConfirmModal from '../../common/ConfirmModal';
import SelectBranchModal from '../../common/SelectBranchModal';

interface StepParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    participants: any[];
    loading: boolean;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    onPageChange: (page: number) => void;
    onRefresh: () => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    getStepName: (id: string) => string;
    activeTab: 'waiting' | 'opened' | 'failed' | 'unsubscribed' | 'all' | 'clicks' | 'report' | 'zns_sent' | 'zns_clicked' | 'zns_replied' | 'zns_failed' | 'zns_skipped' | 'all_touched' | 'preview' | 'inactive';
    onTabChange: (tab: any) => void;
    stepType?: string;
    stepConfig?: any;
    flowId?: string;
    stepId?: string;
    stepData?: any;
    onActionComplete?: () => void;
}

const StepParticipantsModal: React.FC<StepParticipantsModalProps> = ({
    isOpen,
    onClose,
    title,
    participants,
    loading,
    pagination,
    onPageChange,
    onRefresh,
    searchTerm,
    onSearchChange,
    getStepName,
    activeTab,
    onTabChange,
    stepType,
    stepConfig,
    flowId,
    stepId,
    stepData,
    onActionComplete
}) => {
    const [animateIn, setAnimateIn] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Add Users Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addEmails, setAddEmails] = useState('');
    const [addingUsers, setAddingUsers] = useState(false);
    // NEW: Branch Selection State
    const [targetAddStepId, setTargetAddStepId] = useState<string>('');
    const [availableBranches, setAvailableBranches] = useState<any[]>([]);
    const [branchSelectOpen, setBranchSelectOpen] = useState(false);

    const [isGlobalSelected, setIsGlobalSelected] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [resendConfirmOpen, setResendConfirmOpen] = useState(false);
    const [resendingParticipant, setResendingParticipant] = useState<any>(null);
    const [actionMode, setActionMode] = useState<'skip' | 'execute'>('skip');
    const [branches, setBranches] = useState<any[]>([]);

    // NEW: Quick Actions State
    const [quickActionsOpen, setQuickActionsOpen] = useState(false);
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [listModalOpen, setListModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedList, setSelectedList] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [availableLists, setAvailableLists] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) setTimeout(() => setAnimateIn(true), 10);
        else {
            setAnimateIn(false);
            setSelectedIds(new Set()); // Clear selections when modal closes
            setIsGlobalSelected(false);
        }
    }, [isOpen]);

    // Clear selections when changing tabs or pages
    useEffect(() => {
        setSelectedIds(new Set());
        setIsGlobalSelected(false);
    }, [activeTab, pagination.page]);

    // Load branches when branch modal opens
    useEffect(() => {
        if (branchModalOpen) {
            getBranches().then(setBranches);
        }
    }, [branchModalOpen]);

    const handleClose = () => {
        setAnimateIn(false);
        setTimeout(onClose, 400);
    };



    const formatTime = (iso: string) => {
        if (!iso) return '--';
        return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const calculateTimeRemaining = (dateStr: string) => {
        if (!dateStr) return { text: '', isUrgent: false };

        // Parse the date string and get timestamps
        const target = new Date(dateStr).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        // Debug logging (remove after fixing)
        if (process.env.NODE_ENV === 'development') {
            console.log('[Time Debug]', {
                scheduledAt: dateStr,
                targetTime: new Date(target).toLocaleString('vi-VN'),
                currentTime: new Date(now).toLocaleString('vi-VN'),
                diffMs: diff,
                diffMinutes: Math.floor(diff / (1000 * 60))
            });
        }

        // If time has passed or is within 30 seconds
        if (diff <= 30000) return { text: 'Sắp chạy ngay', isUrgent: true };

        const totalMinutes = Math.floor(diff / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) {
            return { text: `Còn ${days} ngày ${hours}h ${minutes}p`, isUrgent: false };
        }
        if (hours > 0) return { text: `Còn ${hours}h ${minutes}p`, isUrgent: false };
        return { text: `Còn ${minutes} phút`, isUrgent: totalMinutes <= 5 };
    };

    // Bulk Actions Handlers
    const handleSelectAll = () => {
        if (selectedIds.size === participants.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(participants.map(p => p.subscriber_id || p.id));
            setSelectedIds(allIds);
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkSkip = async () => {
        if (!flowId || (selectedIds.size === 0 && !isGlobalSelected)) return;

        // Check if current step has multiple branches
        const needsBranchSelection = await checkIfNeedsBranchSelection();

        if (needsBranchSelection) {
            setActionMode('skip');
            setBranchModalOpen(true);
        } else {
            executeBulkAction(null, false);
        }
    };

    const handleBulkExecute = async () => {
        if (!flowId || (selectedIds.size === 0 && !isGlobalSelected)) return;

        // Check if current step has multiple branches
        const needsBranchSelection = await checkIfNeedsBranchSelection();

        if (needsBranchSelection) {
            setActionMode('execute');
            setBranchModalOpen(true);
        } else {
            executeBulkAction(null, true);
        }
    };

    const checkIfNeedsBranchSelection = async (): Promise<boolean> => {
        try {
            const res = await api.get(`flows?id=${flowId}`);
            if (res.success && res.data) {
                const stepsData = (res.data as any).steps;
                const steps = typeof stepsData === 'string' ? JSON.parse(stepsData) : (stepsData || []);
                const currentStep = steps.find((s: any) => s.id === stepId);

                if (currentStep) {
                    const type = currentStep.type?.toLowerCase();
                    // Multi-branch steps: condition, advanced_condition, split_test
                    return ['condition', 'advanced_condition', 'split_test'].includes(type);
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking step type:', error);
            return false;
        }
    };

    const getBranches = async () => {
        try {
            const res = await api.get(`flows?id=${flowId}`);
            if (res.success && res.data) {
                const stepsData = (res.data as any).steps;
                const steps = typeof stepsData === 'string' ? JSON.parse(stepsData) : (stepsData || []);
                const currentStep = steps.find((s: any) => s.id === stepId);

                if (currentStep) {
                    const type = currentStep.type?.toLowerCase();
                    const branches: any[] = [];

                    if (type === 'condition') {
                        branches.push(
                            { id: currentStep.yesStepId || currentStep.yesStepID, label: '✓ YES', description: 'Điều kiện đúng' },
                            { id: currentStep.noStepId || currentStep.noStepID, label: '✗ NO', description: 'Điều kiện sai' }
                        );
                    } else if (type === 'advanced_condition') {
                        branches.push(
                            { id: currentStep.yesStepId || currentStep.yesStepID, label: '✓ YES', description: 'Điều kiện đúng' },
                            { id: currentStep.noStepId || currentStep.noStepID, label: '✗ NO', description: 'Điều kiện sai' }
                        );
                    } else if (type === 'split_test') {
                        const config = currentStep.config || {};
                        const variants = config.variants || [];
                        variants.forEach((v: any, index: number) => {
                            branches.push({
                                id: v.nextStepId || v.nextStepID,
                                label: `Variant ${String.fromCharCode(65 + index)} (${v.percentage}%)`,
                                description: v.name || `Test variant ${index + 1}`
                            });
                        });
                    }

                    return branches.filter(b => b.id); // Remove invalid branches
                }
            }
            return [];
        } catch (error) {
            console.error('Error getting branches:', error);
            return [];
        }
    };

    const executeBulkAction = async (targetStepId: string | null, executeAction: boolean) => {
        console.log('executeBulkAction called with:', { targetStepId, executeAction, stepId, flowId });

        setBulkActionLoading(true);
        try {
            const payload = {
                subscriber_ids: isGlobalSelected ? [] : Array.from(selectedIds),
                step_id: stepId,
                select_all: isGlobalSelected,
                execute_action: executeAction,
                target_step_id: targetStepId // For multi-branch steps
            };

            const res = await api.post(`flows?id=${flowId}&route=bulk-next-step`, payload);

            if (res.success) {
                const count = isGlobalSelected ? pagination.total : selectedIds.size;
                const action = executeAction ? 'hoàn thành bước này' : 'bỏ qua';
                toast.success(`Đã ${action} cho ${count} khách hàng`);
                setSelectedIds(new Set());
                setIsGlobalSelected(false);
                onRefresh();
                onActionComplete?.();
            } else {
                toast.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkRemove = async () => {
        if (!flowId || (selectedIds.size === 0 && !isGlobalSelected)) return;

        const count = isGlobalSelected ? pagination.total : selectedIds.size;

        // Show custom confirm modal
        setConfirmModalOpen(true);
    };

    const executeRemove = async () => {
        const count = isGlobalSelected ? pagination.total : selectedIds.size;

        const payload = {
            subscriber_ids: isGlobalSelected ? [] : Array.from(selectedIds),
            step_id: stepId,
            select_all: isGlobalSelected
        };

        console.log('Bulk remove payload:', payload);
        console.log('Flow ID:', flowId);

        setBulkActionLoading(true);
        try {
            const res = await api.post(`flows?id=${flowId}&route=bulk-remove`, payload);

            console.log('Bulk remove response:', res);

            if (res.success) {
                const actualCount = (res.data as any)?.count || count;
                toast.success(`Đã loại ${actualCount} khách hàng ra khỏi flow`);
                setSelectedIds(new Set());
                setIsGlobalSelected(false);
                onRefresh();
                onActionComplete?.();
            } else {
                toast.error(res.message || 'Có lỗi xảy ra');
                console.error('Bulk remove failed:', res);
            }
        } catch (error) {
            console.error('Bulk remove error:', error);
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setBulkActionLoading(false);
            setConfirmModalOpen(false);
        }
    };

    const handleResendInit = (participant: any) => {
        setResendingParticipant(participant);
        setResendConfirmOpen(true);
    };

    const executeResend = async () => {
        if (!resendingParticipant) return;
        setBulkActionLoading(true);
        try {
            const res = await api.post(`flows?id=${flowId}&route=test-step-action`, {
                target_email: resendingParticipant.email,
                step_id: stepId
            });
            if (res.success) toast.success(res.message || 'Đã gửi lại thành công');
            else toast.error(res.message || 'Lỗi gửi lại');
        } catch (error) {
            toast.error('Lỗi kết nối');
        } finally {
            setBulkActionLoading(false);
            setResendingParticipant(null);
            setResendConfirmOpen(false);
        }
    };

    // NEW: Quick Actions Handlers
    const handleBulkAddTag = async () => {
        if (!selectedTag || (selectedIds.size === 0 && !isGlobalSelected)) {
            toast.error('Vui lòng chọn tag');
            return;
        }

        setBulkActionLoading(true);
        try {
            const payload = {
                subscriber_ids: isGlobalSelected ? [] : Array.from(selectedIds),
                select_all: isGlobalSelected,
                tag_id: selectedTag,
                flow_id: flowId,
                step_id: stepId
            };

            const res = await api.post(`subscribers?route=bulk-add-tag`, payload);
            if (res.success) {
                const count = isGlobalSelected ? pagination.total : selectedIds.size;
                toast.success(`Đã gắn tag cho ${count} khách hàng`);
                setSelectedIds(new Set());
                setIsGlobalSelected(false);
                setTagModalOpen(false);
                setSelectedTag('');
                onRefresh();
            } else {
                toast.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkAddToList = async () => {
        if (!selectedList || (selectedIds.size === 0 && !isGlobalSelected)) {
            toast.error('Vui lòng chọn danh sách');
            return;
        }

        setBulkActionLoading(true);
        try {
            const payload = {
                subscriber_ids: isGlobalSelected ? [] : Array.from(selectedIds),
                select_all: isGlobalSelected,
                list_id: selectedList,
                flow_id: flowId,
                step_id: stepId
            };

            const res = await api.post(`subscribers?route=bulk-add-to-list`, payload);
            if (res.success) {
                const count = isGlobalSelected ? pagination.total : selectedIds.size;
                toast.success(`Đã thêm ${count} khách hàng vào danh sách`);
                setSelectedIds(new Set());
                setIsGlobalSelected(false);
                setListModalOpen(false);
                setSelectedList('');
                onRefresh();
            } else {
                toast.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkChangeStatus = async () => {
        if (!selectedStatus || (selectedIds.size === 0 && !isGlobalSelected)) {
            toast.error('Vui lòng chọn trạng thái');
            return;
        }

        setBulkActionLoading(true);
        try {
            const payload = {
                subscriber_ids: isGlobalSelected ? [] : Array.from(selectedIds),
                select_all: isGlobalSelected,
                status: selectedStatus,
                flow_id: flowId,
                step_id: stepId
            };

            const res = await api.post(`subscribers?route=bulk-change-status`, payload);
            if (res.success) {
                const count = isGlobalSelected ? pagination.total : selectedIds.size;
                toast.success(`Đã cập nhật trạng thái cho ${count} khách hàng`);
                setSelectedIds(new Set());
                setIsGlobalSelected(false);
                setStatusModalOpen(false);
                setSelectedStatus('');
                onRefresh();
            } else {
                toast.error(res.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Không thể thực hiện thao tác');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const fetchTagsAndLists = async () => {
        try {
            const [tagsRes, listsRes] = await Promise.all([
                api.get('tags'),
                api.get('lists')
            ]);

            if (tagsRes.success && tagsRes.data) {
                setAvailableTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
            }

            if (listsRes.success && listsRes.data) {
                setAvailableLists(Array.isArray(listsRes.data) ? listsRes.data : []);
            }
        } catch (error) {
            console.error('Error fetching tags and lists:', error);
        }
    };

    // Load tags and lists when modal opens
    useEffect(() => {
        if (isOpen && stepType === 'inactive') {
            fetchTagsAndLists();
        }
    }, [isOpen, stepType]);


    if (!isOpen && !animateIn) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 !mt-0">
            <div
                className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ease-out ${animateIn ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />
            <div
                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                className={`bg-white w-full max-w-4xl rounded-[24px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] transform transition-all duration-500 ${animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'}`}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[24px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                            {stepType === 'zalo_zns' ? (
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/2048px-Icon_of_Zalo.svg.png"
                                    alt="Zalo"
                                    className="w-5 h-5"
                                />
                            ) : stepType === 'action' ? (
                                <MailOpen className="w-5 h-5" />
                            ) : (
                                <Clock className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">{title}</h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Tổng số: {pagination.total} {['clicks', 'zns_clicked'].includes(activeTab) ? 'lượt click' : 'khách hàng'}
                                {selectedIds.size > 0 && ` • ${selectedIds.size} đã chọn`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {stepType !== 'completed' && stepType !== 'inactive' && (
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(true);

                                    // Parse branches from stepData
                                    let initialTarget = stepId || '';

                                    if (stepData) {
                                        const type = stepData.type?.toLowerCase();
                                        const branches: any[] = [];

                                        if (type === 'condition' || type === 'advanced_condition') {
                                            branches.push(
                                                { id: stepData.yesStepId || stepData.yesStepID, label: 'Nhánh YES (Điều kiện đúng)' },
                                                { id: stepData.noStepId || stepData.noStepID, label: 'Nhánh NO (Điều kiện sai)' }
                                            );
                                        } else if (type === 'split_test') {
                                            const variants = stepData.config?.variants || [];
                                            variants.forEach((v: any, index: number) => {
                                                branches.push({
                                                    id: v.nextStepId || v.nextStepID,
                                                    label: `Variant ${String.fromCharCode(65 + index)} (${v.name || v.percentage + '%'})`
                                                });
                                            });
                                        }

                                        const validBranches = branches.filter(b => b.id);
                                        setAvailableBranches(validBranches);

                                        // Default to YES branch (first branch) if available
                                        if (validBranches.length > 0) {
                                            initialTarget = validBranches[0].id;
                                        }
                                    } else {
                                        setAvailableBranches([]);
                                    }

                                    setTargetAddStepId(initialTarget);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Thêm User</span>
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-md rounded-full text-slate-400 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-2.5 border-b border-slate-100 flex justify-between items-center gap-4">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm email..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {stepType === 'action' && (
                            <button
                                onClick={() => onTabChange(activeTab === 'preview' ? 'all_touched' : 'preview')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border shadow-sm ${activeTab === 'preview'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                            >
                                <MailOpen className="w-4 h-4" />
                                <span>{activeTab === 'preview' ? 'Đóng Xem Mail' : 'XEM MAIL'}</span>
                            </button>
                        )}
                        <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Làm mới">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* TAB FILTERS (Only for Action Steps) */}
                {stepType === 'action' && (
                    <div className="px-6 py-3 border-b border-slate-50 flex gap-2 overflow-x-auto" style={{ minHeight: '56px' }}>
                        <button
                            onClick={() => onTabChange('all_touched')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'all_touched' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Đã đi qua
                        </button>
                        <button
                            onClick={() => onTabChange('waiting')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Đang chờ gửi
                        </button>
                        <button
                            onClick={() => onTabChange('opened')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'opened' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Đã mở mail
                        </button>
                        <button
                            onClick={() => onTabChange('failed')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Gửi lỗi
                        </button>
                        <button
                            onClick={() => onTabChange('unsubscribed')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'unsubscribed' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Hủy đăng ký
                        </button>
                        <button
                            onClick={() => onTabChange('clicks')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'clicks' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Lượt Click
                        </button>
                        <button
                            onClick={() => onTabChange('report')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'report' ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Báo cáo
                        </button>
                    </div>
                )}

                {stepType === 'zalo_zns' && (
                    <div className="px-6 py-3 border-b border-slate-50 flex gap-2 overflow-x-auto" style={{ minHeight: '56px' }}>
                        <button onClick={() => onTabChange('zns_sent')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'zns_sent' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Gửi thành công</button>
                        <button onClick={() => onTabChange('waiting')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Đang chờ</button>
                        <button onClick={() => onTabChange('zns_clicked')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'zns_clicked' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Đã Click Link</button>
                        <button onClick={() => onTabChange('zns_replied')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'zns_replied' ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Đã Phản hồi</button>
                        <button onClick={() => onTabChange('zns_failed')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'zns_failed' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Gửi lỗi</button>
                        <button onClick={() => onTabChange('zns_skipped')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'zns_skipped' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>Bỏ qua</button>
                    </div>
                )}

                {/* Generic Tabs for Condition/Wait/etc */}
                {!['action', 'zalo_zns', 'completed', 'inactive'].includes(stepType || '') && (
                    <div className="px-6 py-3 border-b border-slate-50 flex gap-2 overflow-x-auto" style={{ minHeight: '56px' }}>
                        <button
                            onClick={() => onTabChange('all_touched')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'all_touched' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Đã đi qua
                        </button>
                        <button
                            onClick={() => onTabChange('waiting')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}
                        >
                            Đang chờ
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-[450px] relative">
                    {activeTab === 'clicks' && flowId && stepId ? (
                        <div className="p-6">
                            <LinkClicksTab type="flow" id={flowId} stepId={stepId} />
                        </div>
                    ) : activeTab === 'report' && flowId && stepId ? (
                        <div className="p-6">
                            <TechStatsTab type="flow" id={flowId} stepId={stepId} />
                        </div>
                    ) : activeTab === 'preview' && flowId && stepId ? (
                        <div className="p-6">
                            <LinkClicksTab
                                type="flow"
                                id={flowId}
                                stepId={stepId}
                                initialHtml={stepConfig?.body}
                                initialViewMode="heatmap"
                            />
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-left sticky top-0 z-20 backdrop-blur-sm">
                                {selectedIds.size > 0 && ['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive'].includes(activeTab) ? (
                                    <tr className="bg-[#fffbf0] border-b border-orange-200 shadow-sm animate-in fade-in duration-200">
                                        <th colSpan={['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive'].includes(activeTab) ? 5 : 4} className="px-6 py-3">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={handleSelectAll} className="p-1 hover:bg-orange-100 rounded text-orange-600 transition-colors" title="Bỏ chọn tất cả">
                                                        <div className="relative flex items-center justify-center">
                                                            <input type="checkbox" checked readOnly className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-orange-400 bg-orange-400" />
                                                            <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none" />
                                                        </div>
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-700">Đã chọn <span className="text-orange-600 font-black text-sm">{selectedIds.size}</span> khách hàng</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {stepType !== 'inactive' && (
                                                        <>
                                                            <button
                                                                onClick={handleBulkExecute}
                                                                disabled={bulkActionLoading}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                <Play className="w-3.5 h-3.5" />
                                                                <span>{bulkActionLoading ? 'Đang gửi...' : 'Complete & Next'}</span>
                                                            </button>
                                                            <button
                                                                onClick={handleBulkSkip}
                                                                disabled={bulkActionLoading}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                <SkipForward className="w-3.5 h-3.5" />
                                                                <span>{bulkActionLoading ? 'Đang gửi...' : 'Bỏ qua & Next'}</span>
                                                            </button>
                                                            <div className="h-4 w-px bg-orange-200 mx-1"></div>
                                                        </>
                                                    )}

                                                    {/* Quick Actions Dropdown for Inactive Tab */}
                                                    {stepType === 'inactive' && (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                                                                disabled={bulkActionLoading}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                <Tag className="w-3.5 h-3.5" />
                                                                <span>Hành động nhanh</span>
                                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${quickActionsOpen ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {quickActionsOpen && (
                                                                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    <button
                                                                        onClick={() => {
                                                                            setQuickActionsOpen(false);
                                                                            setTagModalOpen(true);
                                                                        }}
                                                                        className="w-full px-4 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                                                            <Tag className="w-4 h-4 text-violet-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700">Gắn Tag</p>
                                                                            <p className="text-[10px] text-slate-400">Thêm nhãn cho khách hàng</p>
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setQuickActionsOpen(false);
                                                                            setListModalOpen(true);
                                                                        }}
                                                                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                                            <List className="w-4 h-4 text-blue-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700">Thêm vào List</p>
                                                                            <p className="text-[10px] text-slate-400">Thêm vào danh sách</p>
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setQuickActionsOpen(false);
                                                                            setStatusModalOpen(true);
                                                                        }}
                                                                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                                                            <Check className="w-4 h-4 text-emerald-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700">Đổi Trạng thái</p>
                                                                            <p className="text-[10px] text-slate-400">Cập nhật trạng thái</p>
                                                                        </div>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleBulkRemove}
                                                        disabled={bulkActionLoading}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>{isGlobalSelected ? 'Loại bỏ TẤT CẢ' : 'Loại bỏ'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                ) : (
                                    <tr>
                                        {/* Checkbox Column - Show for actionable tabs */}
                                        {['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive'].includes(activeTab) && (
                                            <th className="px-4 py-3 w-12">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.size === participants.length && participants.length > 0}
                                                        onChange={handleSelectAll}
                                                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]"
                                                    />
                                                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                            </th>
                                        )}
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[320px]">
                                            Khách hàng
                                        </th>
                                        {(stepType === 'action' || stepType === 'zalo_zns') && activeTab !== 'waiting' && (
                                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">
                                                GỬI LẠI
                                            </th>
                                        )}
                                        {stepType === 'completed' ? (
                                            <>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Bước cuối cùng</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số lần</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thời gian</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[200px]">Trạng thái</th>
                                                {activeTab === 'opened' && (
                                                    <>
                                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">SỐ LẦN</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">THỜI GIAN</th>
                                                    </>
                                                )}
                                                {activeTab === 'waiting' ? (
                                                    <>
                                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">THỜI GIAN VÀO</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">THỜI GIAN CHỜ</th>
                                                    </>
                                                ) : activeTab !== 'opened' ? (
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Thời gian</th>
                                                ) : null}

                                                {activeTab !== 'opened' && activeTab !== 'all_touched' && activeTab !== 'waiting' && activeTab !== 'failed' && stepType !== 'zalo_zns' && (
                                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                                                        ĐỊA CHỈ IP
                                                    </th>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-50 relative">
                                {/* "Select All" row - Show when all on page are selected and there are more */}
                                {selectedIds.size === participants.length && participants.length > 0 && pagination.total > participants.length && ['waiting', 'failed', 'unsubscribed', 'zns_failed', 'zns_skipped'].includes(activeTab) && (
                                    <tr className="bg-orange-50/50">
                                        <td colSpan={['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive', 'zns_skipped'].includes(activeTab) ? 5 : 4} className="px-6 py-2.5 text-center">
                                            {isGlobalSelected ? (
                                                <p className="text-xs font-medium text-slate-600">Đã chọn tất cả <span className="font-bold text-orange-600">{pagination.total.toLocaleString()}</span> khách hàng. <button onClick={() => setIsGlobalSelected(false)} className="ml-2 text-blue-600 font-bold hover:underline">Bỏ chọn</button></p>
                                            ) : (
                                                <p className="text-xs font-medium text-slate-600">Đã chọn {participants.length} khách hàng. <button onClick={() => setIsGlobalSelected(true)} className="ml-1 text-orange-600 font-bold hover:underline italic underline-offset-2">Chọn tất cả {pagination.total.toLocaleString()} khách hàng?</button></p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                                {loading && participants.length > 0 && (
                                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-20" />
                                )}
                                {loading && participants.length === 0 ? (
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i}>
                                            {['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive', 'zns_skipped'].includes(activeTab) && <td className="px-4 py-4"><Skeleton variant="rectangular" width={16} height={16} /></td>}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton variant="circular" width={32} height={32} />
                                                    <div className="space-y-2">
                                                        <Skeleton variant="text" width={100} height={12} />
                                                        <Skeleton variant="text" width={150} height={10} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><Skeleton variant="text" width={80} height={12} /></td>
                                            <td className="px-6 py-4"><Skeleton variant="text" width={60} height={12} /></td>
                                            <td className="px-6 py-4 text-right"><Skeleton variant="text" width={100} height={12} /></td>
                                        </tr>
                                    ))
                                ) : participants.length === 0 ? (
                                    <tr><td colSpan={['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive', 'zns_skipped'].includes(activeTab) ? 6 : 5} className="py-20 text-center">
                                        <p className="text-xs font-bold text-slate-400">Không tìm thấy dữ liệu nào.</p>
                                    </td></tr>
                                ) : participants.map((p, i) => {
                                    const participantId = p.subscriber_id || p.id;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                            {/* Checkbox - Show for actionable tabs */}
                                            {['waiting', 'failed', 'unsubscribed', 'zns_failed', 'inactive', 'zns_skipped'].includes(activeTab) && (
                                                <td className="px-4 py-3">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(participantId)}
                                                            onChange={() => handleSelectOne(participantId)}
                                                            className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]"
                                                        />
                                                        <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                        {p.email.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{p.name || 'Unknown'}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {stepType === 'zalo_zns' ? (p.phone || p.phone_number || p.phoneNumber || p.email) : p.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Dedicated Action Column */}
                                            {(stepType === 'action' || stepType === 'zalo_zns') && activeTab !== 'waiting' && (
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResendInit(p);
                                                        }}
                                                        disabled={bulkActionLoading && (resendingParticipant?.id === participantId || resendingParticipant?.subscriber_id === participantId)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center border border-slate-100 shadow-sm bg-white disabled:opacity-50"
                                                        title="Gửi lại cho người này"
                                                    >
                                                        {bulkActionLoading && (resendingParticipant?.id === participantId || resendingParticipant?.subscriber_id === participantId) ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                                        ) : (
                                                            <Send className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </td>
                                            )}

                                            {stepType === 'completed' ? (
                                                <>
                                                    <td className="px-6 py-3 text-xs text-slate-600 font-medium">
                                                        {p.stepId ? getStepName(p.stepId) : '--'}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 inline-flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Hoàn thành
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                            {p.completion_count || 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-xs font-medium text-slate-500 text-right">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(p.completedAt || p.updatedAt || p.enteredAt)}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-3">
                                                        {p.status === 'completed' ? (
                                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 inline-flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Hoàn thành
                                                            </span>
                                                        ) : p.status === 'opened' ? (
                                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-100 inline-flex items-center gap-1">
                                                                <MailOpen className="w-3 h-3" /> Mở email
                                                            </span>
                                                        ) : (activeTab === 'failed' || p.status?.toLowerCase().includes('failed') || p.status?.toLowerCase().includes('error') || p.status?.toLowerCase() === 'fail') ? (
                                                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[10px] font-bold border border-rose-100 inline-flex items-center gap-1">
                                                                <AlertOctagon className="w-3 h-3" /> Lỗi
                                                            </span>
                                                        ) : p.status === 'zns_sent' ? (
                                                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-100 inline-flex items-center gap-1">
                                                                <MessageSquare className="w-3 h-3" /> ZNS đã gửi
                                                            </span>
                                                        ) : p.status === 'zns_clicked' ? (
                                                            <span className="bg-cyan-50 text-cyan-600 px-2 py-1 rounded-md text-[10px] font-bold border border-cyan-200 inline-flex items-center gap-1">
                                                                <MousePointerClick className="w-3 h-3" /> ZNS Clicked
                                                            </span>
                                                        ) : p.status === 'zns_replied' ? (
                                                            <span className="bg-violet-50 text-violet-600 px-2 py-1 rounded-md text-[10px] font-bold border border-violet-200 inline-flex items-center gap-1">
                                                                <Reply className="w-3 h-3" /> ZNS Replied
                                                            </span>
                                                        ) : p.status === 'zns_failed' ? (
                                                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[10px] font-bold border border-rose-100 inline-flex items-center gap-1">
                                                                <AlertOctagon className="w-3 h-3" /> ZNS Lỗi
                                                            </span>
                                                        ) : p.status === 'zns_skipped' ? (
                                                            <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 inline-flex items-center gap-1">
                                                                <SkipForward className="w-3 h-3" /> Bỏ qua
                                                            </span>
                                                        ) : p.status === 'unsubscribed' ? (
                                                            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md text-[10px] font-bold border border-orange-100 inline-flex items-center gap-1">
                                                                Hủy đăng ký
                                                            </span>
                                                        ) : p.status === 'condition_true' ? (
                                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 inline-flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Đã khớp
                                                            </span>
                                                        ) : p.status === 'condition_false' ? (
                                                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[10px] font-bold border border-rose-100 inline-flex items-center gap-1">
                                                                <X className="w-3 h-3" /> Không khớp
                                                            </span>
                                                        ) : (p.status === 'processed' || p.status === 'success') ? (
                                                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 inline-flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Hoàn thành
                                                            </span>
                                                        ) : p.status === 'processing' ? (
                                                            <span className="bg-violet-50 text-violet-600 px-2 py-1 rounded-md text-[10px] font-bold border border-violet-100 inline-flex items-center gap-1">
                                                                <RefreshCcw className="w-3 h-3 animate-spin" /> Đang xử lý
                                                            </span>
                                                        ) : (p.lastError || p.last_error) && p.status === 'waiting' ? (
                                                            <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-md text-[10px] font-bold border border-orange-200 inline-flex items-center gap-1" title={p.lastError || p.last_error}>
                                                                <AlertOctagon className="w-3 h-3" /> {p.lastError || p.last_error}
                                                            </span>
                                                        ) : (
                                                            <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-md text-[10px] font-bold border border-amber-100 inline-flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Đang đợi
                                                            </span>
                                                        )}
                                                    </td>

                                                    {activeTab === 'opened' && (
                                                        <>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                                    {p.open_count || 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {(() => {
                                                                    const lastOpen = p.updatedAt || p.updated_at || p.lastOpenAt || p.completedAt;
                                                                    const firstOpen = p.firstOpenAt || p.first_open_at;
                                                                    return (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {lastOpen ? formatTime(lastOpen) : (firstOpen ? formatTime(firstOpen) : '--:--')}
                                                                            </span>
                                                                            {firstOpen && lastOpen && firstOpen !== lastOpen && (
                                                                                <span className="text-[9px] text-slate-400 mt-0.5">
                                                                                    Lần đầu: {formatTime(firstOpen)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                        </>
                                                    )}

                                                    {activeTab === 'waiting' ? (
                                                        <>
                                                            <td className="px-6 py-3 text-[11px] font-medium text-slate-500">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {p.enteredAt ? formatTime(p.enteredAt) : '--'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {(() => {
                                                                    // For Condition steps: Calculate deadline from enteredAt + waitDuration
                                                                    if (stepType === 'condition' && stepConfig?.waitDuration) {
                                                                        const enteredMs = new Date(p.enteredAt || p.createdAt || new Date()).getTime();
                                                                        const duration = parseInt(stepConfig.waitDuration);
                                                                        const unit = stepConfig.waitUnit || 'hours';

                                                                        let durationMs = 0;
                                                                        if (unit === 'minutes') durationMs = duration * 60 * 1000;
                                                                        else if (unit === 'hours') durationMs = duration * 60 * 60 * 1000;
                                                                        else if (unit === 'days') durationMs = duration * 24 * 60 * 60 * 1000;

                                                                        const deadline = enteredMs + durationMs;
                                                                        const diff = deadline - new Date().getTime();

                                                                        if (diff > 0) {
                                                                            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                                            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                            return (
                                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    Còn {d > 0 ? `${d}d ` : ''}{h > 0 ? `${h}h ` : ''}{m}m
                                                                                </span>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    Sắp chạy ngay
                                                                                </span>
                                                                            );
                                                                        }
                                                                    }

                                                                    // For ALL other steps (Email, Action, etc.): Show scheduledAt
                                                                    const timeInfo = calculateTimeRemaining(p.scheduledAt);
                                                                    return (
                                                                        <div className="flex flex-col">
                                                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${timeInfo.isUrgent
                                                                                ? 'text-violet-600'
                                                                                : (new Date(p.scheduledAt) > new Date() ? 'text-blue-600' : 'text-amber-600')
                                                                                }`}>
                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                {timeInfo.text || '--'}
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-400">
                                                                                {new Date(p.scheduledAt).toLocaleString('vi-VN')}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                        </>
                                                    ) : activeTab !== 'opened' ? (
                                                        <td className="px-6 py-3 text-[11px] font-medium text-slate-500">
                                                            {(activeTab === 'failed' || activeTab === 'all_touched' || activeTab === 'inactive' || p.status === 'completed' || p.status === 'processed' || p.status === 'success' || p.status === 'condition_true' || p.status === 'condition_false' || p.status === 'unsubscribed' || p.status === 'zns_sent' || p.status === 'zns_skipped') ? (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {activeTab === 'failed' && p.updated_at ? formatTime(p.updated_at) : (p.completedAt ? formatTime(p.completedAt) : (p.updated_at ? formatTime(p.updated_at) : (p.enteredAt ? formatTime(p.enteredAt) : '--:--')))}
                                                                </span>
                                                            ) : p.status === 'opened' ? (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    Lần đầu: {p.firstOpenAt ? formatTime(p.firstOpenAt) : '--:--'}
                                                                </span>
                                                            ) : (
                                                                (() => {
                                                                    // Special handling for Condition steps: Show Deadline instead of Polling Time
                                                                    if (stepType === 'condition' && (activeTab as string) === 'waiting' && stepConfig?.waitDuration) {
                                                                        const enteredMs = new Date(p.enteredAt || p.createdAt || new Date()).getTime();
                                                                        const duration = parseInt(stepConfig.waitDuration);
                                                                        const unit = stepConfig.waitUnit || 'hours';

                                                                        let durationMs = 0;
                                                                        if (unit === 'minutes') durationMs = duration * 60 * 1000;
                                                                        else if (unit === 'hours') durationMs = duration * 60 * 60 * 1000;
                                                                        else if (unit === 'days') durationMs = duration * 24 * 60 * 60 * 1000;

                                                                        const deadline = enteredMs + durationMs;
                                                                        const diff = deadline - new Date().getTime();

                                                                        if (diff > 0) {
                                                                            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                                            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                                                            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                            return (
                                                                                <span className="inline-flex items-center gap-1 font-bold text-blue-600" title={`Kiểm tra mỗi 1 phút. Hết hạn lúc: ${new Date(deadline).toLocaleString()}`}>
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    Chờ {d > 0 ? `${d}d ` : ''}{h > 0 ? `${h}h ` : ''}{m}m (Deadline)
                                                                                </span>
                                                                            );
                                                                        }
                                                                    }

                                                                    const timeInfo = calculateTimeRemaining(p.scheduledAt);
                                                                    return (
                                                                        <span className={`inline-flex items-center gap-1 font-bold ${timeInfo.isUrgent
                                                                            ? 'text-violet-600'
                                                                            : 'text-amber-600'
                                                                            }`}>
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            {timeInfo.text || '--'}
                                                                        </span>
                                                                    );
                                                                })()
                                                            )}
                                                        </td>
                                                    ) : null}

                                                    {activeTab !== 'opened' && activeTab !== 'all_touched' && activeTab !== 'waiting' && activeTab !== 'failed' && stepType !== 'zalo_zns' && (
                                                        <td className="px-6 py-3 text-[11px] text-slate-500 font-mono text-right">
                                                            {p.ip || '--'}
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer / Pagination */}
                {
                    pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-[24px] flex items-center justify-between">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => onPageChange(pagination.page - 1)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Trước
                            </button>
                            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => onPageChange(pagination.page + 1)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Sau
                            </button>
                        </div>
                    )
                }
            </div >

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={executeRemove}
                title="Xác nhận loại bỏ"
                message={`Bạn có chắc muốn loại ${isGlobalSelected ? pagination.total : selectedIds.size} khách hàng ra khỏi flow?`}
                confirmText="Loại bỏ"
                cancelText="Hủy"
                variant="danger"
                isLoading={bulkActionLoading}
            />

            {/* Branch Selection Modal */}
            <SelectBranchModal
                isOpen={branchModalOpen}
                onClose={() => setBranchModalOpen(false)}
                onConfirm={(branchId) => executeBulkAction(branchId, actionMode === 'execute')}
                branches={branches}
                title="Chọn nhánh tiếp theo"
                stepType={stepType || ''}
            />

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                                Thêm người dùng vào bước này
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                                    Danh sách Email / SĐT / Zalo UID (Mỗi dòng 1 thông tin)
                                </label>
                                <textarea
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-mono text-slate-700 resize-none"
                                    placeholder="example@gmail.com&#10;0912345678&#10;84912345678..."
                                    value={addEmails}
                                    onChange={e => setAddEmails(e.target.value)}
                                ></textarea>
                                <p className="mt-2 text-xs text-slate-400">
                                    * Những liên hệ chưa có trong hệ thống sẽ được tự động tạo mới.
                                </p>
                            </div>

                            {/* Branch Selection (if available) */}
                            {availableBranches.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                                        Vị trí bắt đầu
                                    </label>
                                    <div className="relative z-50">
                                        <button
                                            type="button"
                                            onClick={() => setBranchSelectOpen(!branchSelectOpen)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all text-sm font-bold text-slate-700 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                {/* Display Logic */}
                                                {(() => {
                                                    if (targetAddStepId === stepId || !targetAddStepId) {
                                                        return (
                                                            <>
                                                                <span className="text-amber-500">●</span>
                                                                <span>Mặc định (Kiểm tra Logic/Random)</span>
                                                            </>
                                                        );
                                                    }
                                                    const selectedBranch = availableBranches.find(b => b.id === targetAddStepId);
                                                    return (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            <span className="text-blue-700">{selectedBranch?.label || 'Đã chọn nhánh'}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${branchSelectOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {branchSelectOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setBranchSelectOpen(false)}
                                                ></div>
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-slate-400/10 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {/* Option 1: Default */}
                                                    <div
                                                        onClick={() => {
                                                            setTargetAddStepId(stepId || '');
                                                            setBranchSelectOpen(false);
                                                        }}
                                                        className={`px-3 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${(!targetAddStepId || targetAddStepId === stepId)
                                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                            : 'hover:bg-slate-50 text-slate-600'
                                                            }`}
                                                    >
                                                        <span className={(!targetAddStepId || targetAddStepId === stepId) ? 'text-blue-200' : 'text-slate-400'}>●</span>
                                                        <span className="text-sm font-bold">Mặc định (Kiểm tra Logic/Random)</span>
                                                        {(!targetAddStepId || targetAddStepId === stepId) && <Check className="w-4 h-4 ml-auto text-white" />}
                                                    </div>

                                                    <div className="my-2 h-px bg-slate-100"></div>

                                                    <div className="px-3 pb-2 pt-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            Bắt buộc vào nhánh (Bỏ qua logic)
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {availableBranches.map((b, i) => {
                                                            const isSelected = targetAddStepId === b.id;
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setTargetAddStepId(b.id);
                                                                        setBranchSelectOpen(false);
                                                                    }}
                                                                    className={`px-3 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${isSelected
                                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                                        : 'hover:bg-slate-50 text-slate-600'
                                                                        }`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300'}`}></span>
                                                                    <span className="text-sm font-medium">{b.label}</span>
                                                                    {isSelected && <Check className="w-4 h-4 ml-auto text-white" />}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex gap-2">
                                        <AlertOctagon className="w-4 h-4 shrink-0" />
                                        <span>
                                            Nếu chọn nhánh cụ thể, người dùng sẽ <b>bỏ qua</b> logic của bước này và đi thẳng vào nhánh đã chọn.
                                        </span>
                                    </p>
                                </div>
                            )}

                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-200"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={() => {
                                    if (!addEmails.trim()) return toast.error('Vui lòng nhập ít nhất 1 liên hệ');
                                    setAddingUsers(true);

                                    // Split and cleanup
                                    const emails = addEmails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e);

                                    api.post(`flows?id=${flowId}&route=manual-add-participant`, {
                                        inputs: emails, // Send array as 'inputs' to support mixed types
                                        step_id: targetAddStepId || stepId // Use selected target or fallback to current
                                    }).then(res => {
                                        const data = res.data as any; // Cast to any to access dynamic props
                                        if (res.success) {
                                            toast.success(res.message || `Đã thêm ${data?.added || 0} khách hàng`);
                                            setAddEmails(''); // Clear input
                                            setIsAddModalOpen(false); // Close modal
                                            onRefresh(); // Refresh list AND stats
                                        } else {
                                            toast.error(res.message || 'Lỗi thêm khách hàng');
                                            // Provide more detail if errors array exists
                                            if (data?.errors && data.errors.length > 0) {
                                                console.error(data.errors);
                                                toast.error(`Chi tiết lỗi: ${data.errors[0]}...`);
                                            }
                                        }
                                    }).catch(err => {
                                        toast.error('Lỗi kết nối server');
                                        console.error(err);
                                    }).finally(() => setAddingUsers(false));
                                }}
                                disabled={addingUsers}
                                className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {addingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                {addingUsers ? 'Đang thêm...' : 'Thêm ngay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resend Confirmation Modal */}
            <ConfirmModal
                isOpen={resendConfirmOpen}
                onClose={() => {
                    setResendConfirmOpen(false);
                    setResendingParticipant(null);
                }}
                onConfirm={executeResend}
                title="Xác nhận gửi lại?"
                message={`Bạn có chắc chắn muốn gửi lại nội dung bước này cho ${(resendingParticipant?.phone || resendingParticipant?.phone_number || resendingParticipant?.phoneNumber) ? `${resendingParticipant?.email || ''} - ${resendingParticipant?.phone || resendingParticipant?.phone_number || resendingParticipant?.phoneNumber}` : (resendingParticipant?.email || 'khách hàng này')}?`}
                confirmText="Gửi ngay"
                variant="info"
                isLoading={bulkActionLoading}
            />

            {/* Quick Action: Tag Selection Modal */}
            {tagModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Gắn Tag khách hàng</h3>
                                <p className="text-xs text-slate-500">Chọn tag muốn gắn cho {isGlobalSelected ? pagination.total : selectedIds.size} khách hàng</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Chọn Tag</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-medium"
                                    value={selectedTag}
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                >
                                    <option value="">-- Chọn một Tag --</option>
                                    {availableTags.map(tag => (
                                        <option key={tag.id} value={tag.id}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setTagModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleBulkAddTag}
                                    disabled={bulkActionLoading || !selectedTag}
                                    className="flex-[2] py-2.5 px-4 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Xác nhận gắn Tag</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Action: List Selection Modal */}
            {listModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <List className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Thêm vào Danh sách</h3>
                                <p className="text-xs text-slate-500">Chọn list muốn thêm {isGlobalSelected ? pagination.total : selectedIds.size} khách hàng vào</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Chọn Danh sách</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                    value={selectedList}
                                    onChange={(e) => setSelectedList(e.target.value)}
                                >
                                    <option value="">-- Chọn một List --</option>
                                    {availableLists.map(list => (
                                        <option key={list.id} value={list.id}>{list.name} ({list.subscribers_count || 0} user)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setListModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleBulkAddToList}
                                    disabled={bulkActionLoading || !selectedList}
                                    className="flex-[2] py-2.5 px-4 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Xác nhận thêm vào List</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Action: Status Selection Modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 p-6 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <Check className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Đổi trạng thái liên hệ</h3>
                                <p className="text-xs text-slate-500">Cập nhận trạng thái cho {isGlobalSelected ? pagination.total : selectedIds.size} khách hàng</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Chọn trạng thái mới</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'active', label: 'Hoạt động', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                        { value: 'unsubscribed', label: 'Hủy đăng ký', bg: 'bg-orange-50 text-orange-600 border-orange-100' },
                                        { value: 'bounced', label: 'Bounced', bg: 'bg-rose-50 text-rose-600 border-rose-100' },
                                        { value: 'complained', label: 'Khiếu nại', bg: 'bg-slate-100 text-slate-600 border-slate-200' }
                                    ].map(status => (
                                        <button
                                            key={status.value}
                                            onClick={() => setSelectedStatus(status.value)}
                                            className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${selectedStatus === status.value ? status.bg + ' ring-2 ring-offset-1 select-none' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                        >
                                            {status.label}
                                            {selectedStatus === status.value && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStatusModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleBulkChangeStatus}
                                    disabled={bulkActionLoading || !selectedStatus}
                                    className="flex-[2] py-2.5 px-4 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Xác nhận đổi trạng thái</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default StepParticipantsModal;
