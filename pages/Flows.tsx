import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Plus, Trash2, RotateCcw, AlertTriangle, FileText, PauseCircle, PlayCircle, LayoutGrid, Clock, Filter, ChevronDown, Check,
    Zap, Users, Sparkles, CheckCircle2, BarChart3, ShieldCheck, GitMerge, Split, Lightbulb, Target
} from 'lucide-react';
import { api } from '../services/storageAdapter';
import { logAction, getLogs, HistoryLog } from '../services/historyService';
import { validateFlow, validateFlowAsync, ValidationError } from '../services/flowValidationService';
import { calculateFlowDuration, formatDuration } from '../services/flowAnalysis';

import { Flow, FlowStep, Campaign, Segment, FormDefinition, PurchaseEvent, CustomEvent } from '../types';

import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import FlowCard from '../components/flows/FlowCard';
import FlowBuilderTab from '../components/flows/tabs/FlowBuilderTab';
import FlowAnalyticsTab from '../components/flows/tabs/FlowAnalyticsTab';
import FlowSettingsTab from '../components/flows/tabs/FlowSettingsTab';
import StepEditor from '../components/flows/modals/StepEditor';
import ActivateFlowModal from '../components/flows/modals/ActivateFlowModal';
import FlowSimulateModal from '../components/flows/modals/FlowSimulateModal';
import { generateFlowStepLabels } from '../utils/flowLabeling';
import StepParticipantsModal from '../components/flows/modals/StepParticipantsModal';
import { FlowHistoryModal as HistoryModal } from '../components/flows/modals/HistoryModal'; // Renamed File Import

import FlowCreationModal from '../components/flows/modals/FlowCreationModal';
import AddStepModal from '../components/flows/modals/AddStepModal';
import FlowContinuationModal from '../components/flows/modals/FlowContinuationModal';
import FlowSummaryModal from '../components/flows/modals/FlowSummaryModal';
import GroupDetailModal from '../components/audience/GroupDetailModal'; // New Import
import PurchaseEventDetailModal from '../components/triggers/PurchaseEventDetailModal';
import CustomEventDetailModal from '../components/triggers/CustomEventDetailModal';
import CustomerProfileModal from '../components/audience/CustomerProfileModal'; // New Import
import { getStepLabel, getStepIcon } from '../components/flows/flowConstants';
import toast from 'react-hot-toast';
import FlowEmptyState from '../components/flows/FlowEmptyState';
import FlowHeader from '../components/flows/builder/FlowHeader';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import FlowSidebar from '../components/flows/builder/FlowSidebar';
import ConfirmModal from '../components/common/ConfirmModal';
import CampaignDetailDrawer from '../components/campaigns/CampaignDetailDrawer';
import FormEditorModal from '../components/forms/FormEditorModal';
import EmptyState from '../components/common/EmptyState';
import Tabs from '../components/common/Tabs';
import TabTransition from '../components/common/TabTransition';
import TipsModal from '../components/common/TipsModal';

type FlowFilter = 'all' | 'active' | 'draft' | 'paused' | 'archived';
type TriggerTypeFilter = 'all' | 'segment' | 'date' | 'campaign' | 'form' | 'tag';
type FlowViewTab = 'builder' | 'analytics' | 'settings';

const getReachableSteps = (steps: FlowStep[]): FlowStep[] => {
    const trigger = steps.find(s => s.type === 'trigger');
    if (!trigger) return [];

    const reachableIds = new Set<string>();
    const queue = [trigger.id];
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (reachableIds.has(currentId)) continue;

        const s = steps.find(step => step.id === currentId);
        if (!s) continue;

        reachableIds.add(currentId);

        // Strict traversal based on step type to prevent leakage via stale fields
        if (s.type === 'condition') {
            if (s.yesStepId) queue.push(s.yesStepId);
            if (s.noStepId) queue.push(s.noStepId);
        } else if (s.type === 'split_test') {
            if (s.pathAStepId) queue.push(s.pathAStepId);
            if (s.pathBStepId) queue.push(s.pathBStepId);
        } else if (s.type === 'advanced_condition') {
            if (s.config?.branches) s.config.branches.forEach((b: any) => { if (b.stepId) queue.push(b.stepId); });
            if (s.config?.defaultStepId) queue.push(s.config.defaultStepId);
        } else if (s.type === 'link_flow' || s.type === 'remove_action') {
            // These steps terminate the current flow path or jump to another flow
        } else {
            // All other steps (trigger, action, wait, tag, list_action, zalo_zns) use nextStepId
            if (s.nextStepId) queue.push(s.nextStepId);
        }
    }
    return steps.filter(s => reachableIds.has(s.id));
};

/**
 * [SMART AUTO-FIX]
 * Automatically update 'targetStepId' for all condition nodes to point to the nearest
 * preceding Action (Email/Zalo) or Campaign Trigger.
 */
const autoFixConditionTargets = (steps: FlowStep[]): FlowStep[] => {
    const trigger = steps.find(s => s.type === 'trigger');
    if (!trigger) return steps;

    // Use JSON parse/stringify for deep copy to avoid mutating original state incorrectly during calculation
    const newSteps: FlowStep[] = JSON.parse(JSON.stringify(steps));
    const stepIds = new Set(newSteps.map(s => s.id)); // For validation
    const visited = new Set<string>();

    const traverse = (stepId: string | undefined, lastActionId: string | null) => {
        if (!stepId || visited.has(stepId)) return;
        visited.add(stepId);

        const stepIndex = newSteps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
        const step = newSteps[stepIndex];

        // 1. Identify if current step is a valid source for conditions (Action producing events)
        let currentLastActionId = lastActionId;
        if (['action', 'zalo_zns', 'zalo_cs', 'zalo_oa'].includes(step.type)) {
            currentLastActionId = step.id;
        } else if (step.type === 'trigger' && step.config?.type === 'campaign') {
            currentLastActionId = step.id;
        }

        // 2. If current step is a condition, update its target to point to the nearest action
        if (step.type === 'condition' && currentLastActionId) {
            if (!step.config) step.config = {};

            const cType = step.config.conditionType || 'opened';
            // Event-based types that depend on a previous action
            const eventBasedTypes = [
                'delivered', 'opened', 'clicked', 'replied',
                'zns_delivered', 'zns_clicked', 'zns_replied', 'zns_failed',
                'received_reminder', 'opened_reminder'
            ];

            if (eventBasedTypes.includes(cType)) {
                // [FIX] Only auto-fix if current target is empty OR invalid (points to non-existent step)
                const currentTargetId = step.config.targetStepId;
                const isInvalid = !currentTargetId || !stepIds.has(currentTargetId);

                if (isInvalid && currentTargetId !== currentLastActionId) {
                    console.log(`[AutoFix] Condition "${step.label}" target synced to "${currentLastActionId}"`);
                    step.config.targetStepId = currentLastActionId;
                }
            }
        }

        // 3. Recursive traversal
        if (step.type === 'condition') {
            if (step.yesStepId) traverse(step.yesStepId, currentLastActionId);
            if (step.noStepId) traverse(step.noStepId, currentLastActionId);
        } else if (step.type === 'split_test') {
            if (step.pathAStepId) traverse(step.pathAStepId, currentLastActionId);
            if (step.pathBStepId) traverse(step.pathBStepId, currentLastActionId);
        } else if (step.type === 'advanced_condition') {
            step.config?.branches?.forEach((b: any) => { if (b.stepId) traverse(b.stepId, currentLastActionId); });
            if (step.config?.defaultStepId) traverse(step.config.defaultStepId, currentLastActionId);
        } else {
            if (step.nextStepId) traverse(step.nextStepId, currentLastActionId);
        }
    };

    traverse(trigger.id, null);
    return newSteps;
};

// --- SNAPSHOT TYPES (DB-backed) ---
interface FlowSnapshot {
    id: string;           // UUID from DB
    flow_id: string;
    label: string;
    created_by?: string;
    created_at: string;   // ISO datetime from DB
    flow_data?: Flow;     // Only loaded when restoring
}

const Flows: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [purchaseEvents, setPurchaseEvents] = useState<PurchaseEvent[]>([]);
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);

    const [loading, setLoading] = useState(true);
    const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
    const [flowViewTab, setFlowViewTab] = useState<FlowViewTab>('builder');
    const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isNewUnsavedFlow, setIsNewUnsavedFlow] = useState(false); // Track if this is a new unsaved flow
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024); // Default open on large screens
    const [isReportMode, setIsReportMode] = useState(false);
    const [realtimeDistribution, setRealtimeDistribution] = useState<Record<string, { count: number, avg_wait: number }>>({});
    const [completedBranchStats, setCompletedBranchStats] = useState<Record<string, number>>({});
    const [loadingReport, setLoadingReport] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Participants Modal States (Replicated from Analytics for Quick Report)
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    const [modalParticipants, setModalParticipants] = useState<any[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [selectedAnalyticsStepId, setSelectedAnalyticsStepId] = useState<string | null>(null);
    const [analyticsSearchTerm, setAnalyticsSearchTerm] = useState('');
    const [analyticsActiveTab, setAnalyticsActiveTab] = useState<'all_touched' | 'waiting' | 'opened' | 'failed' | 'unsubscribed' | 'all' | 'clicks' | 'report' | 'zns_sent' | 'zns_clicked' | 'zns_replied' | 'zns_failed'>('all_touched');
    const [analyticsPagination, setAnalyticsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    // Filters - Changed default to 'all'
    const [activeTab, setActiveTab] = useState<FlowFilter>('all');
    const [filterType, setFilterType] = useState<TriggerTypeFilter>('all');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);



    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
    const [isAddStepModalOpen, setIsAddStepModalOpen] = useState(false);
    const [addStepContext, setAddStepContext] = useState<{ parentId: string; branch?: 'yes' | 'no' | 'A' | 'B'; isInsert?: boolean } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning'; confirmLabel?: string; requireConfirmText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // NEW: Activation Modal State
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); // New
    const [activateContext, setActivateContext] = useState<{ flow: Flow } | null>(null);

    // Aux Data for Modals
    const [allLists, setAllLists] = useState<any[]>([]);
    const [allSegments, setAllSegments] = useState<Segment[]>([]);
    const [allTags, setAllTags] = useState<any[]>([]);

    // Modal Selection State
    const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<Campaign | null>(null);
    const [selectedFormForEdit, setSelectedFormForEdit] = useState<FormDefinition | null>(null);
    const [selectedPurchaseEvent, setSelectedPurchaseEvent] = useState<PurchaseEvent | null>(null);
    const [selectedCustomEvent, setSelectedCustomEvent] = useState<CustomEvent | null>(null);

    // Group Detail Modal State
    const [viewingGroup, setViewingGroup] = useState<{ id: string; name: string; type: 'list' | 'segment' | 'tag'; count: number } | null>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [groupPagination, setGroupPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [groupLoading, setGroupLoading] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');
    const [selectedSubscriberForDetail, setSelectedSubscriberForDetail] = useState<any | null>(null);

    // Flow Continuation Modal State
    const [continuationModal, setContinuationModal] = useState({
        isOpen: false,
        completedUsers: { total: 0, byBranch: {} },
        newStepInfo: { type: '', label: '', parentStepLabel: '', branch: '' },
        pendingStepType: null as any,
        pendingStepId: '',
        parentId: '',
        branch: '' as any,
        isAffected: false
    });

    const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);

    // DB-backed snapshots for current flow
    const [flowSnapshots, setFlowSnapshots] = useState<FlowSnapshot[]>([]);
    const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
    // Confirm restore modal state
    const [restoreConfirmSnapshot, setRestoreConfirmSnapshot] = useState<FlowSnapshot | null>(null);
    const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);;

    // Memoized Modals/Sub-components avoid passing fresh arrows
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [flowsRes, campaignsRes, formsRes, purchRes, customRes, listsRes, segRes, tagsRes] = await Promise.all([
                api.get<Flow[]>('flows'),
                api.get<Campaign[]>('campaigns'),
                api.get<FormDefinition[]>('forms'),
                api.get<PurchaseEvent[]>('purchase_events'),
                api.get<CustomEvent[]>('custom_events'),
                api.get<any[]>('lists'),
                api.get<Segment[]>('segments'),
                api.get<any[]>('tags')
            ]);
            if (flowsRes.success) {
                const data = flowsRes.data;
                setFlows(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (campaignsRes.success) {
                const data = campaignsRes.data;
                setCampaigns(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (formsRes.success) {
                const data = formsRes.data;
                setForms(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (purchRes.success) {
                const data = purchRes.data;
                setPurchaseEvents(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (customRes.success) {
                const data = customRes.data;
                setCustomEvents(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (listsRes.success) {
                const data = listsRes.data;
                setAllLists(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (segRes.success) {
                const data = segRes.data;
                setAllSegments(Array.isArray(data) ? data : (data as any)?.data || []);
            }
            if (tagsRes.success) {
                const data = tagsRes.data;
                setAllTags(Array.isArray(data) ? data : (data as any)?.data || []);
            }
        } catch (error) {
            showToast('Lỗi khi tải dữ liệu hệ thống', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    const fetchReportData = useCallback(async (flowId: string) => {
        setLoadingReport(true);
        try {
            const [distRes, completedRes, flowRes] = await Promise.all([
                api.get<any>(`flows?id=${flowId}&route=distribution`),
                api.get<any>(`flows?id=${flowId}&route=completed-users`),
                api.get<Flow>(`flows?id=${flowId}`)
            ]);
            if (distRes.success) setRealtimeDistribution(distRes.data);
            if (completedRes.success && completedRes.data) setCompletedBranchStats(completedRes.data.byBranch || {});

            // Critical: Update the selected flow to get the latest step.stats from backend
            if (flowRes.success && flowRes.data) {
                setSelectedFlow(prev => {
                    if (!prev || prev.id !== flowId) return prev;
                    // Merge stats into existing flow to avoid breaking local UI state if user was mid-edit
                    return {
                        ...prev,
                        stats: flowRes.data.stats,
                        steps: prev.steps.map(s => {
                            const updatedStep = flowRes.data.steps.find(us => us.id === s.id);
                            return updatedStep ? { ...s, stats: updatedStep.stats } : s;
                        })
                    };
                });
            }
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setLoadingReport(false);
        }
    }, []);

    useEffect(() => {
        if (isReportMode && selectedFlow) {
            fetchReportData(selectedFlow.id);
        }
    }, [isReportMode, selectedFlow?.id, fetchReportData]);

    const fetchParticipants = useCallback(async (flowId: string, stepId: string, tab: string, page = 1, search = '') => {
        if (!selectedFlow) return;
        setLoadingParticipants(true);
        try {
            const limit = 50;
            let statusParam: string | null = '';
            let typeParam: string | null = null;
            let route = 'participants';

            // Mapping matching FlowAnalyticsTab
            if (tab === 'all_touched') { statusParam = 'all_touched'; }
            else if (tab === 'waiting') { statusParam = null; }
            else if (tab === 'opened') { typeParam = 'opens'; }
            else if (tab === 'failed') { statusParam = 'failed'; route = 'step-errors'; }
            else if (tab === 'unsubscribed') { statusParam = 'unsubscribed'; route = 'step-unsubscribes'; }
            else if (tab === 'clicks') { typeParam = 'clicks'; }
            else if (tab === 'zns_sent') { typeParam = 'zns_sent'; }
            else if (tab === 'zns_clicked') { typeParam = 'click_zns'; }
            else if (tab === 'zns_replied') { typeParam = 'reply_zns'; }
            else if (tab === 'zns_failed') { typeParam = 'zns_failed'; }

            // effectiveStepId logic for waiting users (include parent wait steps)
            let effectiveStepId = stepId;
            if (stepId && (!statusParam || statusParam === 'waiting')) {
                const sources = [stepId];
                const findWaitSources = (targetId: string) => {
                    selectedFlow.steps.forEach(s => {
                        if (s.type === 'wait' && s.nextStepId === targetId && !sources.includes(s.id)) {
                            sources.push(s.id);
                            findWaitSources(s.id);
                        }
                    });
                };
                findWaitSources(stepId);
                effectiveStepId = sources.join(',');
            }

            let url = `flows?id=${flowId}&route=${route}&page=${page}&limit=${limit}`;
            if (effectiveStepId) url += `&step_id=${effectiveStepId}`;
            if (statusParam && route === 'participants') url += `&status=${statusParam}`;
            if (typeParam) url += `&type=${typeParam}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await api.get<any>(url);
            if (res.success) {
                const responseData = res.data;
                const dataArray = responseData.data || (Array.isArray(responseData) ? responseData : []);
                const pagination = responseData.pagination || { page: 1, limit: 50, total: dataArray.length, totalPages: 1 };

                setModalParticipants(dataArray);
                setAnalyticsPagination(pagination);
            }
        } catch (error) {
            showToast('Lỗi khi tải danh sách Khách hàng', 'error');
        } finally {
            setLoadingParticipants(false);
        }
    }, [showToast, selectedFlow]);

    useEffect(() => {
        if (isParticipantsModalOpen && selectedFlow && selectedAnalyticsStepId) {
            fetchParticipants(selectedFlow.id, selectedAnalyticsStepId, analyticsActiveTab, analyticsPagination.page, analyticsSearchTerm);
        }
    }, [isParticipantsModalOpen, analyticsActiveTab, analyticsPagination.page, analyticsSearchTerm, selectedFlow?.id, selectedAnalyticsStepId, fetchParticipants]);


    const handleUpdateFlow = useCallback(async (updated: Flow, isSilent = true, logMsg?: string, skipApi = false) => {
        if (!isSilent && updated.status === 'active' && !skipApi) {
            const trigger = updated.steps?.find(s => s.type === 'trigger');
            if (trigger?.config?.type === 'campaign' && trigger.config.targetId) {
                const campaign = campaigns.find(c => c.id === trigger.config.targetId);
                if (campaign && (campaign.status === 'waiting_flow' || campaign.status === 'draft')) {
                    setActivateContext({ flow: updated });
                    setIsActivateModalOpen(true);
                    return;
                }
            }
        }

        if (!isSilent) setIsSaving(true);

        // [AUTO-FIX] Recalculate and update condition target IDs to point to the nearest actions
        const fixedSteps = autoFixConditionTargets(updated.steps || []);

        // AUTO-PURGE: Always ensure we only save reachable steps
        const cleanedSteps = getReachableSteps(fixedSteps);

        // Derive trigger_type for backend indexing
        const trigger = cleanedSteps.find(s => s.type === 'trigger');
        const triggerType = trigger?.config?.type || null;

        const flowToSave = {
            ...updated,
            steps: cleanedSteps,
            trigger_type: triggerType
        };

        console.log(`[FlowSave] Saving flow ${flowToSave.id} with ${cleanedSteps.length} reachable steps (Original: ${updated.steps?.length})`);

        setFlows(prev => prev.map(f => f.id === flowToSave.id ? flowToSave : f));
        if (selectedFlow && selectedFlow.id === flowToSave.id) {
            setSelectedFlow(flowToSave);
        }

        try {
            if (!skipApi) {
                const res = await api.put(`flows/${flowToSave.id}`, flowToSave);
                if (!res.success) throw new Error(res.message || 'Lỗi khi lưu kịch bản');
            }
            if (logMsg) {
                // [DB SNAPSHOT] Save to backend asynchronously - don't block save
                const snapshotId = crypto.randomUUID();
                api.post(`flows?id=${updated.id}&route=flow-snapshots`, {
                    id: snapshotId,
                    label: logMsg,
                    flow_data: updated,
                    created_by: (window as any).__currentUser?.name || (window as any).__currentUser?.email || 'Admin'
                }).then(() => {
                    // Refresh snapshot list in background
                    api.get<FlowSnapshot[]>(`flows?id=${updated.id}&route=flow-snapshots`).then(res => {
                        if (res.success) setFlowSnapshots(res.data || []);
                    });
                }).catch(err => console.warn('[Snapshot] Failed to save to DB:', err));

                const newLogs = logAction(logMsg, `Flow: ${updated.name}`, updated.id);
                setHistoryLogs(newLogs);
            }
            if (skipApi) {
                setHasUnsavedChanges(true);
            }
        } catch (error: any) {
            showToast(error.message || 'Lỗi khi cập nhật kịch bản', 'error');
            // Revert local state if API failed
            loadData();
        } finally {
            if (!isSilent) setIsSaving(false);
        }
    }, [campaigns, selectedFlow, loadData]);



    // Load snapshots from DB when flow is selected or history modal opens
    const loadSnapshots = useCallback(async (flowId: string) => {
        setIsLoadingSnapshots(true);
        try {
            const res = await api.get<any>(`flows?id=${flowId}&route=flow-snapshots`);
            if (res.success) {
                // Handle both: direct array OR { data: [...] } wrapper
                const raw = res.data;
                const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                setFlowSnapshots(arr);
            }
        } catch (e) {
            console.warn('[Snapshots] Failed to load:', e);
            setFlowSnapshots([]);
        } finally {
            setIsLoadingSnapshots(false);
        }
    }, []);

    // Restore snapshot: fetch full data then show confirm dialog
    const handleRestoreSnapshot = async (snapshot: FlowSnapshot) => {
        if (!selectedFlow) return;
        // Show confirm with snapshot meta info
        setRestoreConfirmSnapshot(snapshot);
    };

    // Execute the actual restore after confirmation
    const handleConfirmRestore = async () => {
        if (!selectedFlow || !restoreConfirmSnapshot) return;
        setIsRestoringSnapshot(true);
        try {
            // Fetch full flow_data from DB
            const res = await api.get<FlowSnapshot>(
                `flows?route=flow-snapshot-data&snapshot_id=${restoreConfirmSnapshot.id}`
            );
            if (!res.success || !res.data?.flow_data) {
                showToast('Không tải được dữ liệu phiên bản', 'error');
                return;
            }
            const restoredFlow = { ...res.data.flow_data, id: selectedFlow.id };
            setSelectedFlow(restoredFlow);
            setHasUnsavedChanges(true);
            setIsHistoryModalOpen(false);
            setRestoreConfirmSnapshot(null);
            showToast(`✅ Đã khôi phục phiên bản: ${restoreConfirmSnapshot.label}. Nhớ bấm Lưu để áp dụng!`, 'success');
        } catch (e) {
            showToast('Lỗi khi khôi phục phiên bản', 'error');
        } finally {
            setIsRestoringSnapshot(false);
        }
    };

    const [pendingMigrations, setPendingMigrations] = useState<{
        flowId: string;
        action: 'continue' | 'stop';
        continueAll?: boolean;
        branches?: string[];
        targetStepId: string;
    }[]>([]);


    const onEditStepMemo = useCallback((step: FlowStep) => setEditingStep(step), []);
    const onAddStepViaBuilder = useCallback((parentId: string, branch?: string, isInsert?: boolean) => {
        setAddStepContext({ parentId, branch: branch as any, isInsert });
        setIsAddStepModalOpen(true);
    }, []);

    const handleSwapSteps = useCallback((sourceId: string, targetId: string) => {
        if (!selectedFlow) return;
        const steps = [...(selectedFlow.steps || [])];
        const sourceIdx = steps.findIndex(s => s.id === sourceId);
        const targetIdx = steps.findIndex(s => s.id === targetId);

        if (sourceIdx !== -1 && targetIdx !== -1) {
            const source = { ...steps[sourceIdx] };
            const target = { ...steps[targetIdx] };

            // [FIX] MISSION-CRITICAL: Preserve connectivity fields during swap
            // We only swap the "Content/Metadata" but keep the IDs and Arrows mapping.
            // This prevents the "A pointing to A" infinite loop bug when swapping parent-child.
            const connectivityFields = [
                'id', 'nextStepId', 'yesStepId', 'noStepId',
                'pathAStepId', 'pathBStepId'
            ];

            const newSource = { ...target };
            connectivityFields.forEach(f => {
                if (source.hasOwnProperty(f)) (newSource as any)[f] = (source as any)[f];
                else delete (newSource as any)[f];
            });

            // Special handling for nested config IDs (Advanced Condition)
            if (source.type === 'advanced_condition' && target.type === 'advanced_condition') {
                newSource.config = {
                    ...target.config,
                    branches: source.config.branches,
                    defaultStepId: source.config.defaultStepId
                };
            }

            const newTarget = { ...source };
            connectivityFields.forEach(f => {
                if (target.hasOwnProperty(f)) (newTarget as any)[f] = (target as any)[f];
                else delete (newTarget as any)[f];
            });

            if (target.type === 'advanced_condition' && source.type === 'advanced_condition') {
                newTarget.config = {
                    ...source.config,
                    branches: target.config.branches,
                    defaultStepId: target.config.defaultStepId
                };
            }

            steps[sourceIdx] = newSource;
            steps[targetIdx] = newTarget;

            handleUpdateFlow({ ...selectedFlow, steps }, false, "Hoán đổi nội dung bước", selectedFlow.status === 'active');

        }
    }, [selectedFlow, handleUpdateFlow]);

    const initialLoadDone = React.useRef(false);
    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        loadData();
        setHistoryLogs(getLogs());
    }, [loadData]);

    // Load DB snapshots when flow changes or history modal opens
    useEffect(() => {
        if (selectedFlow?.id) {
            loadSnapshots(selectedFlow.id);
        } else {
            setFlowSnapshots([]);
        }
    }, [selectedFlow?.id, isHistoryModalOpen, loadSnapshots]);

    useKeyboardShortcuts({
        'n': () => {
            if (!selectedFlow) {
                setIsCreateModalOpen(true);
            }
        }
    }, [selectedFlow, setIsCreateModalOpen]);

    useEffect(() => {
        if (!selectedFlow) {
            setValidationErrors([]);
            return;
        }

        // Bước 1: Chạy sync check ngay lập tức để hiện kết quả cơ bản
        const syncErrors = validateFlow(selectedFlow, flows, false, hasUnsavedChanges);
        setValidationErrors(syncErrors);

        // Bước 2: Chạy async check để kiểm tra template email đã xóa và ZNS template không active
        // Dùng flag để cancel nếu selectedFlow thay đổi trước khi check xong
        let cancelled = false;
        validateFlowAsync(selectedFlow, (endpoint) => api.get(endpoint)).then(asyncErrors => {
            if (!cancelled && asyncErrors.length > 0) {
                setValidationErrors(prev => {
                    // Tránh trùng lặp: loại bỏ errors cũ có cùng stepId + loại async
                    const dedupedPrev = prev.filter(e => !asyncErrors.some(ae => ae.stepId === e.stepId && ae.msg === e.msg));
                    return [...dedupedPrev, ...asyncErrors];
                });
            }
        });

        return () => { cancelled = true; };
    }, [selectedFlow, flows]);

    // Fetch Group Members when viewingGroup changes or its filters change
    useEffect(() => {
        if (viewingGroup) {
            fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
        } else {
            setGroupMembers([]);
            setGroupSearch('');
            setGroupPagination({ page: 1, limit: 50, total: 0, totalPages: 1 });
        }
    }, [viewingGroup?.id, groupPagination.page, groupSearch]);

    const fetchGroupMembers = async (group: { id: string; type: string }, page = 1, search = '') => {
        if (!group) return;
        setGroupLoading(true);
        try {
            const query = new URLSearchParams({ page: page.toString(), limit: '20', search: search });
            if (group.type === 'list') query.set('list_id', group.id);
            else if (group.type === 'segment') query.set('segment_id', group.id);
            else if (group.type === 'tag') query.set('tag', group.id);

            const res = await api.get<any>(`subscribers?${query.toString()}`);
            if (res.success) {
                if (res.data.pagination) {
                    setGroupMembers(Array.isArray(res.data.data) ? res.data.data : []);
                    setGroupPagination(res.data.pagination);
                } else if (Array.isArray(res.data)) {
                    setGroupMembers(res.data);
                    setGroupPagination({ page: 1, limit: res.data.length, total: res.data.length, totalPages: 1 });
                } else {
                    setGroupMembers([]);
                    setGroupPagination({ page: 1, limit: 50, total: 0, totalPages: 1 });
                }
            } else {
                setGroupMembers([]);
                showToast(res.message || 'Không thể tải danh sách thành viên', 'error');
            }
        } catch (error) {
            setGroupMembers([]);
            showToast('Lỗi hệ thống khi tải danh sách thành viên', 'error');
        } finally {
            setGroupLoading(false);
        }
    };

    const handleDetailRemoveFromList = async (subscriberIds: string[], listId: string, options?: { targetType: string, targetId: string }) => {
        setGroupLoading(true);
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
                if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                showToast(`Đã gỡ ${res.data.affected} Khách hàng khỏi danh sách`, 'success');
            } else {
                showToast(res.message || 'Lỗi khi gỡ khỏi danh sách', 'error');
            }
        } catch (error) {
            showToast('Lỗi hệ thống khi gỡ khỏi danh sách', 'error');
        } finally {
            setGroupLoading(false);
        }
    };

    const handleDetailRemoveFromTag = async (subscriberIds: string[], tagName: string, options?: { targetType: string, targetId: string }) => {
        setGroupLoading(true);
        try {
            let payload: any = { type: 'tag_remove', tag: tagName };
            if (options) {
                payload.targetType = options.targetType;
                payload.targetId = options.targetId;
            } else {
                payload.subscriberIds = subscriberIds;
            }
            const res = await api.post<any>('bulk_operations', payload);
            if (res.success) {
                if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                showToast(`Đã gỡ nhãn khỏi ${res.data.affected} Khách hàng`, 'success');
            } else {
                showToast(res.message || 'Lỗi khi gỡ nhãn', 'error');
            }
        } catch (error) {
            showToast('Lỗi hệ thống khi gỡ nhãn', 'error');
        } finally {
            setGroupLoading(false);
        }
    };


    useEffect(() => {
        const navState = (location as any).state;
        if (navState?.openFlowId && flows.length > 0) {
            const targetFlow = flows.find(f => f.id === navState.openFlowId);
            if (targetFlow) {
                setSelectedFlow(JSON.parse(JSON.stringify(targetFlow)));
                // FIX: Support opening to a specific tab (e.g. analytics)
                const initialTab = navState.tab || 'builder';
                setFlowViewTab(initialTab as FlowViewTab);
                window.history.replaceState({}, document.title);
            }
        }
    }, [flows, location.state]);

    // NEW: Handle Redirects for Creation
    const [prefillCampaignId, setPrefillCampaignId] = useState<string | undefined>();
    const [prefillTemplateId, setPrefillTemplateId] = useState<string | undefined>();
    const [prefillFlowName, setPrefillFlowName] = useState<string | undefined>();

    useEffect(() => {
        // Handle HashRouter query params (e.g. #/flows?action=create)
        let searchPart = location.search;
        if (!searchPart && location.hash.includes('?')) {
            searchPart = location.hash.substring(location.hash.indexOf('?'));
        }

        const params = new URLSearchParams(searchPart);
        const action = params.get('action');
        const campaignId = params.get('campaign_id');
        const templateId = params.get('template_id');

        // Also check location.state (from useNavigate)
        const stateAction = location.state?.action as string | undefined;
        const stateCampaignId = location.state?.campaignId as string | undefined;
        const stateTemplateId = location.state?.templateId as string | undefined;

        if ((action === 'create' || stateAction === 'create')) {
            const targetId = campaignId || stateCampaignId;
            const targetTpl = templateId || stateTemplateId;
            const targetName = params.get('flow_name') || (location.state?.flowName as string | undefined);

            if (targetId) setPrefillCampaignId(targetId);
            if (targetTpl) setPrefillTemplateId(targetTpl);
            if (targetName) setPrefillFlowName(targetName);

            // Pre-fill creation modal
            if (!isCreateModalOpen) {
                setIsCreateModalOpen(true);
            }

            // CLEANUP: Immediately clear the URL params and history state to prevent re-triggering on refresh/render
            if (action === 'create') {
                const newParams = new URLSearchParams(params);
                newParams.delete('action');
                newParams.delete('campaign_id');
                newParams.delete('template_id');
                newParams.delete('flow_name');
                const newSearch = newParams.toString();
                // We use replaceState to clean the URL without adding to history
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0] + (newSearch ? '?' + newSearch : ''));
            } else if (stateAction === 'create') {
                window.history.replaceState({}, document.title);
                // Also clear location state for React Router
                navigate('/flows', { replace: true, state: {} });
            }
        }
    }, [location.search, location.hash, location.state]); // More specific dependencies


    const filteredFlows = useMemo(() => {
        let result = Array.isArray(flows) ? flows : [];

        // 1. Status Filter
        if (activeTab === 'all') {
            result = result.filter(f => f.status !== 'archived');
        } else {
            result = result.filter(f => f.status === activeTab);
        }

        // 2. Trigger Type Filter
        if (filterType !== 'all') {
            result = result.filter(f => {
                const trigger = f.steps?.find(s => s.type === 'trigger');
                const type = trigger?.config?.type || 'segment';
                return type === filterType;
            });
        }

        return result;
    }, [flows, activeTab, filterType]);

    // Lookup Maps for Performance
    const campaignsMap = useMemo(() => new Map((Array.isArray(campaigns) ? campaigns : []).map(c => [c.id, c])), [campaigns]);
    const formsMap = useMemo(() => new Map((Array.isArray(forms) ? forms : []).map(f => [f.id, f])), [forms]);
    const purchaseEventsMap = useMemo(() => new Map((Array.isArray(purchaseEvents) ? purchaseEvents : []).map(p => [p.id, p])), [purchaseEvents]);
    const customEventsMap = useMemo(() => new Map((Array.isArray(customEvents) ? customEvents : []).map(c => [c.id, c])), [customEvents]);
    const segmentsMap = useMemo(() => new Map((Array.isArray(allSegments) ? allSegments : []).map(s => [s.id, s])), [allSegments]);
    const listsMap = useMemo(() => new Map((Array.isArray(allLists) ? allLists : []).map(l => [l.id, l])), [allLists]);

    const handleFlowClick = React.useCallback((flow: Flow) => {
        if (flow.status !== 'archived') {
            setSelectedFlow(JSON.parse(JSON.stringify(flow)));
            setFlowViewTab('builder');
        }
    }, []);

    const handleOpenCampaign = React.useCallback((c: Campaign) => {
        // [FIX] Navigate to Campaigns page and open report there for better context
        navigate('/campaigns', { state: { openCampaignId: c.id } });
    }, [navigate]);
    const handleOpenForm = React.useCallback((f: FormDefinition) => setSelectedFormForEdit(f), []);
    const handleOpenPurchase = React.useCallback((event: PurchaseEvent) => {
        setSelectedPurchaseEvent(event);
    }, []);
    const handleOpenCustomEvent = React.useCallback((event: CustomEvent) => {
        setSelectedCustomEvent(event);
    }, []);
    const handleOpenList = React.useCallback((list: any) => setViewingGroup({ id: list.id, name: list.name, type: 'list', count: list.count || 0 }), []);
    const handleOpenSegment = React.useCallback((segment: Segment) => setViewingGroup({ id: segment.id, name: segment.name, type: 'segment', count: segment.count || 0 }), []);
    const handleOpenTag = React.useCallback((tag: string) => setViewingGroup({ id: tag, name: tag, type: 'tag', count: 0 }), []);
    const handleDuplicateFlow = React.useCallback(async (flow: Flow) => {
        setConfirmModal({
            isOpen: true,
            title: 'Nhân bản Flow',
            message: `Bạn có chắc chắn muốn nhân bản flow "${flow.name}" không?`,
            variant: 'warning',
            confirmLabel: 'Nhân bản ngay',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                const { id, stats, status, createdAt, archivedAt, ...rest } = flow;
                const newFlow = {
                    ...rest,
                    name: `${flow.name} (Bản sao)`,
                    status: 'draft' as const,
                    stats: { enrolled: 0, completed: 0, totalSent: 0, totalOpened: 0, uniqueOpened: 0, totalClicked: 0, uniqueClicked: 0 }
                };

                setLoading(true);
                try {
                    const res = await api.post<Flow>('flows', newFlow);
                    if (res.success) {
                        showToast('Đã nhân bản kịch bản thành công!', 'success');
                        loadData();
                    } else {
                        showToast(res.message || 'Lỗi khi nhân bản kịch bản', 'error');
                    }
                } catch (error) {
                    showToast('Đã xảy ra lỗi hệ thống khi nhân bản kịch bản', 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    }, [loadData, showToast]);


    const handleConfirmActivation = async (activateCampaign: boolean) => {
        if (!activateContext) return;
        const { flow } = activateContext;
        setIsSaving(true);
        try {
            const updatedFlow: Flow = { ...flow, status: 'active' };
            const res = await api.put(`flows/${flow.id}`, { ...updatedFlow, activate_campaign: activateCampaign });
            if (!res.success) throw new Error(res.message || 'Lỗi khi kích hoạt kịch bản');

            await handleUpdateFlow(updatedFlow, true, undefined, true);
            logAction("Kích hoạt Flow" + (activateCampaign ? " & Chiến dịch" : ""), flow.name, flow.id);

            const trigger = flow.steps?.find(s => s.type === 'trigger');
            if (activateCampaign && trigger?.config?.targetId) {
                setCampaigns(prev => prev.map(c => c.id === trigger.config.targetId ? { ...c, status: 'scheduled' } as any : c));
            }
            showToast('Đã kích hoạt thành công.');
            setTimeout(() => {
                if (trigger?.config?.type === 'campaign') navigate('/campaigns');
                else setSelectedFlow(null);
            }, 500);
        } catch (error: any) {
            showToast(error.message || 'Lỗi khi kích hoạt', 'error');
        } finally {
            setIsActivateModalOpen(false);
            setActivateContext(null);
            setIsSaving(false);
        }
    };

    const handleRestoreFlow = async (flow: Flow) => {
        setConfirmModal({
            isOpen: true,
            title: 'Khôi phục Flow',
            message: `Bạn có muốn khôi phục flow "${flow.name}" về Trạng thái Tạm dừng không?`,
            variant: 'warning',
            confirmLabel: 'Khôi phục ngay',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setLoading(true);
                try {
                    const updated = { ...flow, status: 'paused' as const, archivedAt: undefined };
                    const res = await api.put(`flows/${flow.id}`, updated);
                    if (res.success) {
                        const newLogs = logAction("Khôi phục kịch bản", flow.name);
                        setHistoryLogs(newLogs);
                        showToast('Đã khôi phục kịch bản. Hãy kích hoạt lại để chạy.');
                        loadData();
                    } else {
                        showToast(res.message || 'Lỗi khi khôi phục kịch bản', 'error');
                    }
                } catch (error) {
                    showToast('Lỗi hệ thống khi khôi phục kịch bản', 'error');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleSync = async () => {
        if (!selectedFlow) return;
        setConfirmModal({
            isOpen: true,
            title: 'Đồng bộ dữ liệu',
            message: 'Hệ thống sẽ tính toán lại toàn bộ thống kê của Flow này. Quá trình này có thể mất vài giây.',
            variant: 'warning',
            confirmLabel: 'Đồng bộ ngay',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsSyncing(true);
                try {
                    const res = await api.get<any>(`flows?route=sync&id=${selectedFlow.id}`);
                    if (res.success) {
                        toast.success("Đã đồng bộ và tính toán lại dữ liệu");
                        // Reload flow to get updated stats
                        const reloadRes = await api.get<Flow>(`flows/${selectedFlow.id}`);
                        if (reloadRes.success) {
                            setSelectedFlow(reloadRes.data);
                        }
                    } else {
                        toast.error(res.message || "Lỗi khi đồng bộ dữ liệu");
                    }
                } catch (err) {
                    toast.error("Lỗi hệ thống khi đồng bộ");
                } finally {
                    setIsSyncing(false);
                }
            }
        });
    };

    const handleDeleteFlow = async (flow: Flow, permanent = false) => {
        if (permanent) {
            setConfirmModal({
                isOpen: true, title: 'Xóa vĩnh viễn?', message: 'Hành động này sẽ xóa sạch mọi dữ liệu liên quan và không thể khôi phục.', variant: 'danger',
                requireConfirmText: 'DELETE',
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        const res = await api.delete(`flows/${flow.id}`);
                        if (res.success) {
                            logAction("Xóa vĩnh viễn kịch bản", flow.name);
                            showToast('Đã xóa vĩnh viễn kịch bản.');
                            loadData();
                        } else {
                            showToast(res.message || 'Lỗi khi xóa kịch bản', 'error');
                        }
                    } catch (error) {
                        showToast('Lỗi hệ thống khi xóa kịch bản', 'error');
                    } finally {
                        setLoading(false);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                }
            });
            return;
        }

        // SMART DELETION LOGIC
        // 1. Check for Active Users
        const res = await api.get<any>(`flows?id=${flow.id}&route=active-count`);
        const activeCount = res.success ? res.data.count : 0;

        if (activeCount > 0) {
            setConfirmModal({
                isOpen: true,
                title: '⚠️ CẢNH BÁO: Đang có người dùng',
                message: `Hiện có ${activeCount} người đang ở trong Flow này (Đang chờ hoặc đang xử lý). Bạn muốn xử lý thế nào?`,
                variant: 'danger',
                confirmLabel: 'Hủy đăng ký & Xóa (Force Exit)',
                requireConfirmText: 'CONFIRM',
                // FIX: Add secondary action for Archive Only needs bespoke modal, but here leveraging onConfirm/onCancel or custom
                // Simplifying: offer "Force Exit & Archive" vs "Cancel". 
                // Wait, user asked for "Next step users down new flow" OR "Remove from automation".
                // Since "Next step" is complex migration UI, I will provide "Remove from Automation" and a Warning.

                // Let's stick to the prompt's request: "xóa flow thì thông báo có xx người... gỡ khỏi automation luôn"
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        await api.post(`flows?id=${flow.id}&route=migrate-users`, { action: 'cancel' });
                        const updated = { ...flow, status: 'archived' as const, archivedAt: new Date().toISOString() };
                        const res = await api.put(`flows/${flow.id}`, updated);
                        if (res.success) {
                            logAction("Xóa & Hủy Active Users", flow.name);
                            showToast(`Đã hủy ${activeCount} người dùng và chuyển Flow vào thùng rác.`);
                            loadData();
                            if (selectedFlow && selectedFlow.id === flow.id) {
                                setSelectedFlow(null);
                                setHasUnsavedChanges(false);
                            }
                        } else {
                            showToast(res.message || 'Lỗi khi lưu trữ kịch bản', 'error');
                        }
                    } catch (error) {
                        showToast('Lỗi hệ thống khi xóa và hủy người dùng', 'error');
                    } finally {
                        setLoading(false);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                }
            });
            return;
        }

        const isActive = flow.status === 'active';
        setConfirmModal({
            isOpen: true, title: isActive ? 'Kịch bản Đang chờ' : 'Xóa vào thùng rác?',
            message: isActive ? 'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ' : 'Kịch bản sẽ được giữ trong thùng rác 30 ngày.',
            variant: isActive ? 'danger' : 'warning',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const updated = { ...flow, status: 'archived' as const, archivedAt: new Date().toISOString() };
                    const res = await api.put(`flows/${flow.id}`, updated);
                    if (res.success) {
                        logAction("Chuyển vào thùng rác", flow.name);
                        showToast('Đã chuyển vào thùng rác.');
                        loadData();
                        if (selectedFlow && selectedFlow.id === flow.id) {
                            setSelectedFlow(null);
                            setHasUnsavedChanges(false);
                        }
                    } else {
                        showToast(res.message || 'Lỗi khi chuyển vào thùng rác', 'error');
                    }
                } catch (error) {
                    showToast('Lỗi hệ thống khi chuyển vào thùng rác', 'error');
                } finally {
                    setLoading(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleAddStep = useCallback(async (type: any, skipContinuationCheck = false, forcedId?: string) => {
        if (!selectedFlow || !addStepContext) return;
        const { parentId, branch, isInsert } = addStepContext;

        if (!skipContinuationCheck && (selectedFlow.status === 'active' || selectedFlow.status === 'paused')) {
            setLoading(true);
            try {
                const res = await api.get<any>(`flows?id=${selectedFlow.id}&route=completed-users`);
                if (res.success && res.data && res.data.total > 0) {
                    const parentStep = selectedFlow.steps?.find(s => s.id === parentId);
                    const branchCounts = res.data.byBranch || {};
                    const namedBranches: { [key: string]: number } = {};
                    const flowLabels = generateFlowStepLabels(selectedFlow);

                    Object.entries(branchCounts).forEach(([stepId, count]) => {
                        const labelInfo = flowLabels[stepId];
                        const label = labelInfo ? labelInfo.fullLabel : (stepId === 'completed' || stepId === 'main' ? 'Đã Hoàn thành' : 'Không xác định');
                        namedBranches[label] = count as number;
                    });

                    const isAffected = Object.keys(branchCounts).includes(parentId);
                    const pendingId = crypto.randomUUID();

                    setContinuationModal({
                        isOpen: true,
                        completedUsers: { total: res.data.total, byBranch: namedBranches },
                        newStepInfo: { type, label: getStepLabel(type), parentStepLabel: parentStep?.label || 'Unknown', branch: addStepContext.branch || 'main' },
                        pendingStepType: type,
                        pendingStepId: pendingId,
                        parentId: parentId,
                        branch: addStepContext.branch,
                        isAffected: isAffected
                    });
                    return;
                }
            } catch (error) {
                showToast('Lỗi khi kiểm tra dữ liệu người dùng', 'error');
            } finally {
                setLoading(false);
            }
        }

        // Proceed with adding step (original logic)
        const newStepId = forcedId || crypto.randomUUID();
        const parentStep = selectedFlow.steps?.find(s => s.id === parentId);
        if (!parentStep) return;

        const getDefaultConfig = (stepType: string) => {
            if (stepType === 'wait') {
                return { duration: 1, unit: 'hours' };
            }
            if (stepType === 'condition') {
                return {
                    conditionType: 'opened',
                    waitDuration: 1,
                    waitUnit: 'days',
                    linkTargets: []
                };
            }
            if (stepType === 'split_test') {
                return {
                    ratioA: 50,
                    ratioB: 50
                };
            }
            if (stepType === 'advanced_condition') {
                return {
                    branches: [
                        { id: crypto.randomUUID(), label: 'Nhánh 1', conditions: [{ field: 'os', operator: 'equals', value: '' }] }
                    ]
                };
            }
            return {};
        };

        const newStep: FlowStep = {
            id: newStepId,
            type,
            label: getStepLabel(type),
            iconName: getStepIcon(type),
            config: getDefaultConfig(type)
        };

        let updatedSteps = [...(selectedFlow.steps || []), newStep];
        let updatedParent = { ...parentStep };

        if (parentStep.type === 'advanced_condition') {
            // Logic for Advanced Condition Dynamic Branches
            if (branch) {
                const branches = [...(updatedParent.config.branches || [])];
                const branchIndex = branches.findIndex((b: any) => b.id === branch);
                if (branchIndex !== -1) {
                    const oldNextId = branches[branchIndex].stepId;
                    branches[branchIndex] = { ...branches[branchIndex], stepId: newStepId };
                    updatedParent.config = { ...updatedParent.config, branches };

                    // [FIX] Correctly bridge the old child to the new step's primary output
                    if (isInsert && oldNextId) {
                        if (newStep.type === 'condition') newStep.yesStepId = oldNextId;
                        else if (newStep.type === 'split_test') newStep.pathAStepId = oldNextId;
                        else if (newStep.type === 'advanced_condition') newStep.config.defaultStepId = oldNextId;
                        else newStep.nextStepId = oldNextId;
                    }
                }
            } else {
                // No branch specified -> Default Step
                const oldNextId = updatedParent.config.defaultStepId;
                updatedParent.config = { ...updatedParent.config, defaultStepId: newStepId };

                // [FIX] Correctly bridge the old child
                if (isInsert && oldNextId) {
                    if (newStep.type === 'condition') newStep.yesStepId = oldNextId;
                    else if (newStep.type === 'split_test') newStep.pathAStepId = oldNextId;
                    else if (newStep.type === 'advanced_condition') newStep.config.defaultStepId = oldNextId;
                    else newStep.nextStepId = oldNextId;
                }
            }
        } else {
            const linkKey = branch === 'yes' ? 'yesStepId' : (branch === 'no' ? 'noStepId' : (branch === 'A' ? 'pathAStepId' : (branch === 'B' ? 'pathBStepId' : 'nextStepId')));
            const oldNextId = (updatedParent as any)[linkKey];
            (updatedParent as any)[linkKey] = newStepId;

            // [FIX] MISSION-CRITICAL: When inserting a branching node (Condition/Split), 
            // the 'oldNextId' must be assigned to the 'Yes/A' branch, NOT 'nextStepId'.
            if (isInsert && oldNextId) {
                if (newStep.type === 'condition') newStep.yesStepId = oldNextId;
                else if (newStep.type === 'split_test') newStep.pathAStepId = oldNextId;
                else if (newStep.type === 'advanced_condition') {
                    if (!newStep.config) newStep.config = {};
                    newStep.config.defaultStepId = oldNextId;
                }
                else newStep.nextStepId = oldNextId;
            }
        }

        updatedSteps = updatedSteps.map(s => s.id === parentId ? updatedParent : s);
        handleUpdateFlow({ ...selectedFlow, steps: updatedSteps }, false, `Thêm bước ${newStep.label}`, selectedFlow.status === 'active');
    }, [selectedFlow, addStepContext, handleUpdateFlow]);

    const handleQuickAddWait = useCallback((parentId: string, branch?: any) => {
        if (!selectedFlow) return;
        const parentStep = selectedFlow.steps?.find(s => s.id === parentId);
        if (!parentStep) return;
        const newStepId = crypto.randomUUID();
        const newStep: FlowStep = { id: newStepId, type: 'wait', label: 'Chờ 1 ngày', iconName: 'clock', config: { duration: 1, unit: 'days' } };
        let updatedSteps = [...(selectedFlow.steps || []), newStep];
        let updatedParent = { ...parentStep };
        if (parentStep.type === 'advanced_condition') {
            if (branch) {
                const branches = [...(updatedParent.config.branches || [])];
                const branchIndex = branches.findIndex((b: any) => b.id === branch);
                if (branchIndex !== -1) {
                    const oldNextId = branches[branchIndex].stepId;
                    branches[branchIndex] = { ...branches[branchIndex], stepId: newStepId };
                    updatedParent.config = { ...updatedParent.config, branches };
                    if (oldNextId) newStep.nextStepId = oldNextId;
                }
            } else {
                const oldNextId = updatedParent.config.defaultStepId;
                updatedParent.config = { ...updatedParent.config, defaultStepId: newStepId };
                if (oldNextId) newStep.nextStepId = oldNextId;
            }
        } else {
            const linkKey = branch === 'yes' ? 'yesStepId' : (branch === 'no' ? 'noStepId' : (branch === 'A' ? 'pathAStepId' : (branch === 'B' ? 'pathBStepId' : 'nextStepId')));
            const oldNextId = (updatedParent as any)[linkKey];
            (updatedParent as any)[linkKey] = newStepId;
            if (oldNextId) newStep.nextStepId = oldNextId;
        }
        updatedSteps = updatedSteps.map(s => s.id === parentId ? updatedParent : s);
        // Explicitly skip API if active
        handleUpdateFlow({ ...selectedFlow, steps: updatedSteps }, false, "Thêm bước Chờ nhanh", selectedFlow.status === 'active');
    }, [selectedFlow, handleUpdateFlow]);

    const handleDeleteStep = (stepId: string) => {
        if (!selectedFlow) return;
        const steps = selectedFlow.steps || [];
        const stepToDelete = steps.find(s => s.id === stepId);
        if (!stepToDelete) return;

        // Smart Delete Logic: Find the child of the deleted step to bridge the gap
        // Only bridge for simple steps (Action, Wait, Tag, Link, List) that have a single output
        let bridgeId: string | undefined = undefined;
        if (['action', 'wait', 'update_tag', 'trigger', 'list_action'].includes(stepToDelete.type)) {
            bridgeId = stepToDelete.nextStepId;
        }
        // For conditions/split tests, bridging is ambiguous, so we break the link (bridgeId = undefined)

        let updatedSteps = steps.filter(s => s.id !== stepId).map(s => {
            const newS = { ...s };
            // If the parent pointed to the deleted step, point it to the bridgeId instead
            if (newS.nextStepId === stepId) newS.nextStepId = bridgeId;
            if (newS.yesStepId === stepId) newS.yesStepId = bridgeId;
            if (newS.noStepId === stepId) newS.noStepId = bridgeId;
            if (newS.pathAStepId === stepId) newS.pathAStepId = bridgeId;
            if (newS.pathBStepId === stepId) newS.pathBStepId = bridgeId;
            if (newS.type === 'advanced_condition') {
                if (newS.config.defaultStepId === stepId) newS.config = { ...newS.config, defaultStepId: bridgeId };
                if (newS.config.branches) {
                    const branches = newS.config.branches.map((b: any) => {
                        if (b.stepId === stepId) return { ...b, stepId: bridgeId };
                        return b;
                    });
                    newS.config = { ...newS.config, branches };
                }
            }
            return newS;
        });

        // AUTO-PURGE: Remove steps that are no longer reachable
        updatedSteps = getReachableSteps(updatedSteps);

        // Explicitly skip API if active
        handleUpdateFlow({ ...selectedFlow, steps: updatedSteps }, false, `Xóa bước ${stepToDelete?.label}`, selectedFlow.status === 'active');
        setEditingStep(null);
    };

    const triggerTypes = [
        { id: 'all', label: 'Tất cả loại' },
        { id: 'campaign', label: 'Chiến dịch' },
        { id: 'segment', label: 'Phân khúc' },
        { id: 'date', label: 'Ngày/Sự kiện' },
        { id: 'form', label: 'Form submit' },
        { id: 'tag', label: 'Gắn Tag' },
    ];

    const handleManualSave = () => {
        if (!selectedFlow) return;
        const isActive = selectedFlow.status === 'active';
        const errors = validateFlow(selectedFlow, flows, isActive);

        const criticalErrors = errors.filter(e => e.type === 'critical');
        if (criticalErrors.length > 0) {
            showToast('Không thể lưu: Có lỗi nghiêm trọng. Vui lòng kiểm tra lại.', 'error');
            setValidationErrors(errors);
            return;
        }

        const warnings = errors.filter(e => e.type === 'warning');

        const performSave = async () => {
            setIsSaving(true);
            try {
                if (pendingMigrations.length > 0) {
                    for (const migration of pendingMigrations) {
                        const res = await api.post(`flows?id=${migration.flowId}&route=migrate-users`, {
                            action: migration.action,
                            continueAll: migration.continueAll,
                            branches: migration.branches,
                            targetStepId: migration.targetStepId
                        });
                        if (!res.success) throw new Error(res.message || 'Lỗi khi di chuyển người dùng');
                    }
                    setPendingMigrations([]);
                }
                await handleUpdateFlow(selectedFlow, false); // Không log 'Lưu thủ công' vào lịch sử
                // Snapshot saved automatically inside handleUpdateFlow via API
                showToast('Đã lưu thành công.');
            } catch (error: any) {
                showToast(error.message || 'Lỗi khi lưu kịch bản', 'error');
            } finally {
                setIsSaving(false);
            }
        };

        if (warnings.length > 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Cònh báo cấu hình',
                message: `Phát hiện ${warnings.length} cảnh báo. Bạn có chắc chắn muốn lưu?`,
                variant: 'warning',
                confirmLabel: 'Xác nhận lưu',
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    // If Active, ask again? Or just proceed?
                    if (isActive) {
                        // Chained modal workaround: setTimeout to allow modal close then open new one
                        setTimeout(() => {
                            setConfirmModal({
                                isOpen: true, title: 'Xác nhận Lưu Flow Đang chờ',
                                message: 'Flow đang hoạt động. Bạn có chắc luồng đã an toàn không?',
                                variant: 'warning',
                                confirmLabel: 'Xác nhận lưu',
                                onConfirm: async () => { await performSave(); setConfirmModal(p => ({ ...p, isOpen: false })); }
                            });
                        }, 200);
                    } else {
                        await performSave();
                    }
                }
            });
            return;
        }

        if (isActive) {
            setConfirmModal({
                isOpen: true,
                title: 'Flow Đang chờ',
                message: 'Flow đang hoạt động. Bất kỳ thay đổi nào sẽ áp dụng ngay lập tức cho người dùng. Bạn có chắc luồng đã an toàn và không bị ngắt quãng?',
                variant: 'warning',
                confirmLabel: 'Xác nhận lưu',
                onConfirm: async () => {
                    await performSave();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            performSave();
        }
        setHasUnsavedChanges(false); // Clear dirty flag on manual save
        setIsNewUnsavedFlow(false); // Clear new unsaved flag
    };

    const durationInfo = useMemo(() => {
        if (!selectedFlow) return null;
        const { minMinutes, maxMinutes, breakdown } = calculateFlowDuration(selectedFlow);
        return {
            min: formatDuration(minMinutes),
            max: formatDuration(maxMinutes),
            breakdown
        };
    }, [selectedFlow?.steps]);

    // Filtered logs for the selected flow - Move to top level to avoid Hook violation
    const currentFlowLogs = useMemo(() => {
        if (!selectedFlow) return [];
        return historyLogs.filter(log =>
            log.flowId === selectedFlow.id ||
            (log.details && log.details.includes(`Flow: ${selectedFlow.name}`))
        );
    }, [historyLogs, selectedFlow?.id, selectedFlow?.name]);

    // Stat summaries for hero
    const flowStats = useMemo(() => ({
        total: flows.length,
        active: flows.filter(f => f.status === 'active').length,
        totalUsers: flows.reduce((sum, f) => sum + (f.stats?.enrolled || 0), 0),
    }), [flows]);

    return (
        <div className="animate-fade-in space-y-8 pb-20">
            {!selectedFlow && (
                <>
                    <PageHero 
                        title={<>Automation <span className="text-orange-100/80">Flows</span></>}
                        subtitle="Quản lý vòng đời Khách hàng tự động — nuôi dưỡng & chuyển đổi thông minh đa kênh."
                        showStatus={true}
                        statusText="Orchestrator Online"
                        actions={[
                            { 
                                label: 'Tạo kịch bản', 
                                icon: Plus, 
                                onClick: () => setIsCreateModalOpen(true),
                                primary: true 
                            },
                            { 
                                label: 'Mẹo Automation', 
                                icon: Lightbulb, 
                                onClick: () => setIsTipsModalOpen(true) 
                            }
                        ]}
                    />

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Tổng kịch bản</p>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{flowStats.total}</h3>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/10 flex items-center justify-center transition-all group-hover:scale-110">
                                    <LayoutGrid className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Đang hoạt động</p>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{flowStats.active}</h3>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                                    <Zap className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Đang tham gia</p>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{flowStats.totalUsers.toLocaleString()}</h3>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Hoàn thành</p>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {flows.reduce((sum, f) => sum + (f.stats?.completed || 0), 0).toLocaleString()}
                                    </h3>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl shadow-lg shadow-rose-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* WHITE CONTENT AREA */}
                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 lg:p-6 min-h-[400px] overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <Tabs
                                variant="pill"
                                activeId={activeTab}
                                onChange={setActiveTab as any}
                                className="flex-nowrap overflow-x-auto scrollbar-hide"
                                items={[
                                    { id: 'all', label: 'Tất cả', icon: LayoutGrid },
                                    { id: 'active', label: 'Đang chờ', icon: PlayCircle },
                                    { id: 'paused', label: 'Tạm dừng', icon: PauseCircle },
                                    { id: 'draft', label: 'Bản nháp', icon: FileText },
                                    { id: 'archived', label: 'Thùng rác', icon: Trash2 },
                                ]}
                            />
                            {/* Type Filter */}
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all"
                                >
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{triggerTypes.find(t => t.id === filterType)?.label}</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                                {isTypeDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsTypeDropdownOpen(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                            {triggerTypes.map(type => (
                                                <button key={type.id}
                                                    onClick={() => { setFilterType(type.id as TriggerTypeFilter); setIsTypeDropdownOpen(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-left hover:bg-slate-50 transition-colors ${filterType === type.id ? 'text-amber-600 bg-orange-50' : 'text-slate-600'}`}
                                                >
                                                    {type.label}
                                                    {filterType === type.id && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">Danh sách kịch bản</h3>
                                <p className="text-[11px] text-slate-400">Các luồng tự động trên hệ thống</p>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                Tổng: {filteredFlows.length}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 space-y-4 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <Skeleton variant="rounded" width={44} height={44} className="rounded-xl" />
                                            <Skeleton variant="rounded" width={80} height={24} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-3">
                                            <Skeleton variant="text" width="80%" height={24} />
                                            <Skeleton variant="text" width="40%" height={14} />
                                        </div>
                                        <div className="pt-6 border-t border-slate-50 flex justify-between gap-4">
                                            <Skeleton variant="rounded" width="45%" height={32} className="rounded-xl" />
                                            <Skeleton variant="rounded" width="45%" height={32} className="rounded-xl" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredFlows.length === 0 ? (
                            <EmptyState
                                icon={LayoutGrid}
                                title="Chưa có kịch bản automation"
                                description="Bắt đầu tạo kịch bản tự động để tối ưu hóa quy trình chăm sóc Khách hàng của bạn."
                                ctaLabel="Khởi tạo Flow ngay"
                                onCtaClick={() => setIsCreateModalOpen(true)}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredFlows.map(flow => {
                                    const trigger = flow.steps?.find(s => s.type === 'trigger');
                                    const targetId = trigger?.config?.targetId;
                                    const type = trigger?.config?.type || 'segment';
                                    const subtype = trigger?.config?.targetSubtype;

                                    return (
                                        <FlowCard
                                            key={flow.id}
                                            flow={flow}
                                            linkedCampaign={type === 'campaign' ? campaignsMap.get(targetId!) : undefined}
                                            linkedForm={type === 'form' ? formsMap.get(targetId!) : undefined}
                                            linkedPurchaseEvent={type === 'purchase' ? purchaseEventsMap.get(targetId!) : undefined}
                                            linkedCustomEvent={type === 'custom_event' ? customEventsMap.get(targetId!) : undefined}
                                            linkedSegment={(type === 'segment' && subtype !== 'list') ? segmentsMap.get(targetId!) : undefined}
                                            linkedList={(type === 'segment' && subtype === 'list') ? listsMap.get(targetId!) : undefined}
                                            linkedTag={type === 'tag' ? targetId : undefined}
                                            onClick={() => handleFlowClick(flow)}
                                            onDelete={(p) => handleDeleteFlow(flow, p)}
                                            onRestore={() => handleRestoreFlow(flow)}
                                            onDuplicate={handleDuplicateFlow}
                                            onOpenCampaign={handleOpenCampaign}
                                            onOpenForm={handleOpenForm}
                                            onOpenPurchase={handleOpenPurchase}
                                            onOpenCustomEvent={handleOpenCustomEvent}
                                            onOpenList={handleOpenList}
                                            onOpenSegment={handleOpenSegment}
                                            onOpenTag={handleOpenTag}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    </div>
                    </div>{/* close space-y-8 */}
                </>
            )}

            {
                selectedFlow && (
                    <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in fade-in duration-300 overflow-hidden">
                        <FlowHeader
                            flow={selectedFlow}
                            isSaving={isSaving}
                            hasCriticalErrors={validationErrors.some(e => e.type === 'critical')}
                            isViewMode={isViewMode}
                            activeTab={flowViewTab}
                            durationInfo={durationInfo}
                            onBack={() => {
                                if (hasUnsavedChanges) {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Thay đổi chưa lưu',
                                        message: 'Bạn có thay đổi chưa lưu. Bạn có muốn lưu trước khi thoát không?',
                                        onConfirm: () => { handleManualSave(); setSelectedFlow(null); setConfirmModal(prev => ({ ...prev, isOpen: false })); },
                                        confirmLabel: 'Lưu & Thoát'
                                    });
                                } else {
                                    setSelectedFlow(null);
                                }
                            }}
                            onTabChange={setFlowViewTab}
                            onToggleStatus={async () => {
                                if (!selectedFlow) return;
                                const isNowActive = selectedFlow.status === 'active';
                                const newStatus = isNowActive ? 'paused' : 'active';
                                if (newStatus === 'active') {
                                    const errors = validateFlow(selectedFlow, flows, true);
                                    if (errors.some(e => e.type === 'critical')) {
                                        setValidationErrors(errors);
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Không thể kích hoạt',
                                            message: 'Flow đang có lỗi nghiêm trọng. Vui lòng sửa hết lỗi trước khi kích hoạt.',
                                            variant: 'danger',
                                            confirmLabel: 'Đã hiểu',
                                            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                                        });
                                        return;
                                    }
                                    const warnings = errors.filter(e => e.type === 'warning');
                                    if (warnings.length > 0) {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Cònh báo cấu hình',
                                            message: `Flow có ${warnings.length} cảnh báo. Bạn có muốn kích hoạt không?`,
                                            variant: 'warning',
                                            confirmLabel: 'Kích hoạt ngay',
                                            onConfirm: async () => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                await handleUpdateFlow({ ...selectedFlow, status: newStatus }, false, `Kích hoạt Flow`);
                                            }
                                        });
                                        return;
                                    }
                                } else {
                                    // [FIX] Hiển thị hậu quả cụ thể dựa theo trigger type của flow
                                    const trigger = selectedFlow.steps?.find(s => s.type === 'trigger');
                                    const triggerType = trigger?.config?.type || 'unknown';
                                    const triggerTarget = trigger?.config?.targetId || trigger?.config?.targetName || '';

                                    // Lấy active count trước khi show modal
                                    let activeCount = 0;
                                    try {
                                        const countRes = await api.get<any>(`flows?id=${selectedFlow.id}&route=active-count`);
                                        if (countRes.success) activeCount = countRes.data?.count || 0;
                                    } catch { }

                                    const triggerWarnings: Record<string, string> = {
                                        form: '📋 Form submit: Người dùng mới điền form sẽ KHÔNG được enroll vào Flow này. Email xác nhận/cảm ơn sẽ không được gửi.',
                                        purchase: '🛒 Purchase Event: Đơn hàng mới được ghi nhận sẽ KHÔNG kích hoạt Flow. Email sau mua hàng sẽ bị Bỏ qua.',
                                        custom_event: '⚡ Custom Event: Sự kiện mới kích hoạt trigger sẽ KHÔNG được xử lý. Flow sẽ không nhận thêm subscriber mới.',
                                        campaign: '📧 Campaign trigger: Flow liên kết với chiến dịch email sẽ bị ngắt. Người nhận mở/click mail sẽ không tiếp tục được dẫn vào Flow.',
                                        tag: '🏷️ Tag trigger: Subscriber được gắn tag mới sẽ KHÔNG được tự động enroll vào Flow.',
                                        list: '📋 List trigger: Subscriber được thêm vào danh sách sẽ KHÔNG được enroll tự động.',
                                        segment: '👥 Segment trigger: Subscriber mới vào phân khúc sẽ KHÔNG được xử lý tự động.',
                                        date: '📅 Date trigger: Các lịch gửi theo ngày sinh/ngày kỷ niệm sẽ bị Bỏ qua trong Thời gian tạm dừng.',
                                    };

                                    const specificWarning = triggerWarnings[triggerType] || '⚠️ Trigger của Flow này sẽ ngừng hoạt động trong Thời gian tạm dừng.';
                                    const activeWarning = activeCount > 0
                                        ? `\n\n🔴 Hiện có ${activeCount} người Đang chờ trong flow — tất cả sẽ bị DỪNG và không tiếp tục nhận email cho đến khi Flow được kích hoạt lại.`
                                        : '\n\n✅ Hiện không có ai đang trong flow.';

                                    setConfirmModal({
                                        isOpen: true,
                                        title: '⏸ Tạm dừng Flow',
                                        message: `Bạn sắp tạm dừng flow này.\n\nHậu quả:\n${specificWarning}${activeWarning}\n\nBạn có thể kích hoạt lại bất cứ lúc nào, nhưng các sự kiện/dữ liệu trong Thời gian tạm dừng sẽ KHÔNG được xử lý hồi tố.`,
                                        variant: 'warning',
                                        confirmLabel: 'Tạm dừng ngay',
                                        onConfirm: async () => {
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            await handleUpdateFlow({ ...selectedFlow, status: newStatus }, false, "Tạm dừng Flow");
                                        }
                                    });
                                    return;
                                }
                                await handleUpdateFlow({ ...selectedFlow, status: newStatus }, false, isNowActive ? "Tạm dừng Flow" : "Kích hoạt Flow");
                            }}
                            onActivate={() => {
                                setActivateContext({ flow: selectedFlow });
                                setIsActivateModalOpen(true);
                            }}
                            onHistory={() => setIsHistoryModalOpen(true)}
                            onToggleViewMode={() => setIsViewMode(!isViewMode)}
                            onSave={handleManualSave}
                            onRestore={() => handleRestoreFlow(selectedFlow)}
                            onSimulate={() => setIsSimulateModalOpen(true)}
                            isSidebarOpen={isSidebarOpen}
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                            onSync={handleSync}
                            isSyncing={isSyncing}
                            isReportMode={isReportMode}
                            onToggleReportMode={() => setIsReportMode(!isReportMode)}
                            onRename={(newName) => { if (selectedFlow) { setSelectedFlow({ ...selectedFlow, name: newName }); setHasUnsavedChanges(true); } }}
                        />
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* MAIN CONTENT AREA */}
                            <TabTransition key={flowViewTab} className={`flex-1 overflow-hidden relative flex flex-col transition-all duration-300 ${isSidebarOpen && selectedFlow && flowViewTab === 'builder' ? 'ml-0' : ''}`}>
                                <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                                    {flowViewTab === 'builder' && (
                                        <FlowBuilderTab
                                            flow={selectedFlow}
                                            allFlows={flows}
                                            allForms={forms}
                                            isViewMode={isViewMode}
                                            onEditStep={setEditingStep}
                                            onAddStep={(parentId, branch, isInsert) => { setAddStepContext({ parentId, branch: branch as any, isInsert }); setIsAddStepModalOpen(true); }}
                                            onQuickAddWait={handleQuickAddWait}
                                            onSwapSteps={handleSwapSteps}
                                            isReportMode={isReportMode}
                                            realtimeDistribution={realtimeDistribution}
                                            onReportClick={(stepId, type) => {
                                                setSelectedAnalyticsStepId(stepId);
                                                // Smart tab selection
                                                if (type === 'action') setAnalyticsActiveTab('opened');
                                                else if (type === 'zalo_zns') setAnalyticsActiveTab('zns_sent');
                                                else setAnalyticsActiveTab('all_touched');

                                                setAnalyticsPagination(p => ({ ...p, page: 1 }));
                                                setAnalyticsSearchTerm('');
                                                setIsParticipantsModalOpen(true);
                                            }}
                                        />
                                    )}
                                    {flowViewTab === 'analytics' && <div className="h-full overflow-y-auto w-full"><FlowAnalyticsTab flow={selectedFlow} /></div>}
                                    {flowViewTab === 'settings' && <div className="h-full overflow-y-auto w-full"><FlowSettingsTab flow={selectedFlow} onUpdate={(d, silent, skipApi) => handleUpdateFlow({ ...selectedFlow, ...d }, silent ?? true, silent ? undefined : "Cập nhật cài đặt", skipApi)} /></div>}
                                </div>
                            </TabTransition>

                            {isSidebarOpen && (
                                <aside className="fixed lg:relative inset-0 top-0 lg:top-auto z-[120] lg:z-[110] lg:w-80 flex-shrink-0 h-full bg-white border-l border-slate-200 shadow-[-4px_0_20px_rgba(0,0,0,0.02)] animate-in slide-in-from-right duration-300">
                                    <div className="lg:hidden absolute top-4 right-4 z-[130]">
                                        <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)} icon={Plus} className="rotate-45" />
                                    </div>
                                    <FlowSidebar
                                        validationErrors={validationErrors}
                                        logs={currentFlowLogs}
                                        durationInfo={durationInfo}
                                        snapshotCount={flowSnapshots.length}
                                        onOpenHistory={() => setIsHistoryModalOpen(true)}
                                        onSelectStep={(sid) => {
                                            setFlowViewTab('builder');
                                            const step = selectedFlow.steps?.find(s => s.id === sid);
                                            if (step) setEditingStep(step);
                                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                        }}
                                    />
                                </aside>
                            )}
                        </div>
                    </div>
                )
            }

            <FlowCreationModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setPrefillCampaignId(undefined);
                    setPrefillTemplateId(undefined);
                    setPrefillFlowName(undefined);
                }}
                initialTemplateId={prefillTemplateId}
                initialCampaignId={prefillCampaignId}
                initialFlowName={prefillFlowName}
                onCreate={async (data) => {
                    setIsSaving(true);
                    try {
                        const triggerType = data.steps?.find((s: any) => s.type === 'trigger')?.config?.type || 'segment';
                        const isPriorityTrigger = ['form', 'purchase', 'custom_event'].includes(triggerType);

                        const newFlow: Flow = {
                            ...data,
                            name: data.name || 'Flow mới',
                            id: crypto.randomUUID(),
                            status: 'draft',
                            createdAt: new Date().toISOString(),
                            stats: { enrolled: 0, completed: 0, totalSent: 0, totalOpened: 0, uniqueOpened: 0, totalClicked: 0, uniqueClicked: 0 },
                            config: {
                                frequencyCap: 3,
                                activeDays: [0, 1, 2, 3, 4, 5, 6],
                                startTime: '08:00',
                                endTime: '21:00',
                                exitConditions: ['unsubscribed'],
                                type: 'realtime',
                                frequency: isPriorityTrigger ? 'recurring' : 'one-time',
                                allowMultiple: isPriorityTrigger ? true : false,
                                enrollmentCooldownHours: isPriorityTrigger ? 0 : 12
                            }
                        };
                        const res = await api.post<Flow>('flows', newFlow);
                        if (res.success) {
                            logAction("Tạo kịch bản mới", newFlow.name, newFlow.id);
                            await loadData();
                            setSelectedFlow(newFlow);
                            setIsNewUnsavedFlow(true);
                            setFlowViewTab('builder');
                            setIsCreateModalOpen(false);
                            setPrefillCampaignId(undefined);
                            setPrefillTemplateId(undefined);
                            setPrefillFlowName(undefined);
                        } else {
                            showToast(res.message || 'Lỗi khi tạo kịch bản mới', 'error');
                        }
                    } catch (error) {
                        showToast('Lỗi hệ thống khi tạo kịch bản', 'error');
                    } finally {
                        setIsSaving(false);
                    }
                }} />

            <AddStepModal isOpen={isAddStepModalOpen} onClose={() => setIsAddStepModalOpen(false)} onAdd={handleAddStep} parentStep={selectedFlow?.steps?.find(s => s.id === addStepContext?.parentId)} isInsert={addStepContext?.isInsert} />
            <StepEditor
                step={editingStep}
                flow={selectedFlow || undefined}
                allFlows={flows}
                validationErrors={validationErrors}
                onClose={() => setEditingStep(null)}
                onSave={(s) => {
                    if (!selectedFlow) return;
                    let newSteps = (selectedFlow.steps || []).map(st => st.id === s.id ? s : st);
                    // Không log edit config step vào lịch sử (chỉ log thêm/xóa bước)
                    handleUpdateFlow({ ...selectedFlow, steps: newSteps }, false, undefined, selectedFlow.status === 'active');
                    setEditingStep(null);
                }}
                onDelete={handleDeleteStep}
                isFlowArchived={selectedFlow?.status === 'archived'}
                onUpdateFlow={(configUpdates) => {
                    if (!selectedFlow) return;
                    handleUpdateFlow({
                        ...selectedFlow,
                        config: { ...selectedFlow.config, ...configUpdates }
                    }, false, undefined, selectedFlow.status === 'active'); // Không log cấu hình flow
                }}
            />

            {/* Detail Modals for Flow Cards */}
            <CampaignDetailDrawer
                campaign={selectedCampaignForDetail}
                isOpen={!!selectedCampaignForDetail}
                onClose={() => setSelectedCampaignForDetail(null)}
                allLists={allLists}
                allSegments={allSegments}
                allTags={allTags}
                allFlows={flows}
            />
            {
                selectedFormForEdit && (
                    <FormEditorModal
                        isOpen={!!selectedFormForEdit}
                        onClose={() => setSelectedFormForEdit(null)}
                        editingFormId={selectedFormForEdit.id}
                        initialData={selectedFormForEdit}
                        lists={allLists}
                        onSuccess={() => { loadData(); setSelectedFormForEdit(null); }}
                    />
                )
            }

            {/* Event Detail Modals */}
            <PurchaseEventDetailModal
                event={selectedPurchaseEvent}
                onClose={() => setSelectedPurchaseEvent(null)}
            />
            <CustomEventDetailModal
                event={selectedCustomEvent}
                onClose={() => setSelectedCustomEvent(null)}
            />


            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant || 'danger'}
                confirmLabel={confirmModal.confirmLabel}
                requireConfirmText={confirmModal.requireConfirmText}
            />

            <TipsModal
                isOpen={isTipsModalOpen}
                onClose={() => setIsTipsModalOpen(false)}
                title="Mẹo Automation"
                subtitle="Tối ưu luồng công việc & Tự động hóa"
                accentColor="emerald"
                tips={[
                    {
                        icon: Sparkles,
                        title: "Trigger Strategy",
                        description: "Bắt đầu flow bằng một Tag đặc biệt hoặc Segment động để tự động hóa 100%.",
                        colorClass: "bg-gradient-to-br from-blue-400 to-indigo-500",
                        highlight: "Cơ bản"
                    },
                    {
                        icon: Clock,
                        title: "Wait Steps thông minh",
                        description: "Đặt Thời gian chờ từ 1-2 tiếng giữa các tin nhắn để tránh cảm giác bị làm phiền.",
                        colorClass: "bg-gradient-to-br from-amber-400 to-orange-500",
                        highlight: "Quan trọng"
                    },
                    {
                        icon: GitMerge,
                        title: "Rẽ nhánh điều kiện",
                        description: "Sử dụng các bước Điều kiện Có/Không để lọc Khách hàng đã mở hoặc click tin nhắn.",
                        colorClass: "bg-gradient-to-br from-emerald-400 to-teal-500"
                    },
                    {
                        icon: Split,
                        title: "Split Testing",
                        description: "Chia tệp Khách hàng để thử nghiệm 2 kịch bản khác nhau, đo lường hiệu quả thực tế.",
                        colorClass: "bg-gradient-to-br from-purple-500 to-pink-500",
                        highlight: "Nâng cao"
                    },
                    {
                        icon: ShieldCheck,
                        title: "Exit Logic",
                        description: "Luôn gán Tag Hoàn thành để gỡ Khách hàng khỏi luồng sau khi họ đã mua hàng.",
                        colorClass: "bg-gradient-to-br from-rose-400 to-rose-600"
                    }
                ]}
            />

            <FlowContinuationModal
                isOpen={continuationModal.isOpen}
                onClose={() => setContinuationModal({ ...continuationModal, isOpen: false })}
                completedUsers={continuationModal.completedUsers}
                newStepInfo={continuationModal.newStepInfo}
                isAffected={continuationModal.isAffected}
                onContinue={async (options) => {
                    if (!selectedFlow) return;

                    const waitStepId = crypto.randomUUID();
                    const newStepId = continuationModal.pendingStepId || crypto.randomUUID();
                    const parentId = continuationModal.parentId;
                    const branch = continuationModal.branch;

                    // 1. Create the forced Wait 10 min step
                    const waitStep: FlowStep = {
                        id: waitStepId,
                        type: 'wait',
                        label: 'Chờ an toàn (10 phút)',
                        iconName: 'clock',
                        config: { duration: 10, unit: 'minutes' },
                        nextStepId: newStepId
                    };

                    // 2. Create the intended new step
                    const getLabel = (t: string) => {
                        switch (t) {
                            case 'action': return 'Gửi Email';
                            case 'wait': return 'Chờ đợi';
                            case 'condition': return 'Kiểm tra';
                            case 'split_test': return 'A/B Test';
                            case 'link_flow': return 'Chuyển Flow';
                            case 'remove_action': return 'Dọn dẹp';
                            case 'update_tag': return 'Gắn nhãn';
                            case 'list_action': return 'Cập nhật List';
                            default: return 'Bước mới';
                        }
                    };
                    const getIcon = (t: string): any => {
                        switch (t) {
                            case 'action': return 'mail';
                            case 'wait': return 'clock';
                            case 'condition': return 'git-merge';
                            case 'split_test': return 'beaker';
                            case 'link_flow': return 'link';
                            case 'remove_action': return 'user-minus';
                            case 'update_tag': return 'tag';
                            case 'list_action': return 'list';
                            default: return 'zap';
                        }
                    };

                    const newStep: FlowStep = {
                        id: newStepId,
                        type: continuationModal.pendingStepType,
                        label: getLabel(continuationModal.pendingStepType),
                        iconName: getIcon(continuationModal.pendingStepType),
                        config: continuationModal.pendingStepType === 'wait' ? { duration: 1, unit: 'hours' } : {}
                    };

                    // 3. Update structure locally
                    const steps = [...(selectedFlow.steps || []), waitStep, newStep];
                    const parentStep = steps.find(s => s.id === parentId);
                    if (parentStep) {
                        const linkKey = branch === 'yes' ? 'yesStepId' : (branch === 'no' ? 'noStepId' : (branch === 'A' ? 'pathAStepId' : (branch === 'B' ? 'pathBStepId' : 'nextStepId')));
                        (parentStep as any)[linkKey] = waitStepId;
                    }

                    // 4. Queue migration
                    setPendingMigrations(prev => [...prev, {
                        flowId: selectedFlow.id,
                        action: 'continue',
                        continueAll: options.continueAll,
                        branches: options.branches,
                        targetStepId: waitStepId // Users move to the WAIT step first
                    }]);

                    handleUpdateFlow({ ...selectedFlow, steps }, false, `Thêm bước ${newStep.label} (có chèn bước chờ)`, true);
                    setContinuationModal({ ...continuationModal, isOpen: false });
                    showToast('Đã thêm bước và chèn bước chờ 10p. Nhấn Lưu để áp dụng di chuyển người dùng.');
                }}
                onStop={async () => {
                    if (!selectedFlow) return;

                    const waitStepId = crypto.randomUUID();
                    const newStepId = continuationModal.pendingStepId || crypto.randomUUID();
                    const parentId = continuationModal.parentId;
                    const branch = continuationModal.branch;

                    // Still insert the wait step for structural consistency if anyone else comes here later
                    const waitStep: FlowStep = {
                        id: waitStepId,
                        type: 'wait',
                        label: 'Chờ an toàn (10 phút)',
                        iconName: 'clock',
                        config: { duration: 10, unit: 'minutes' },
                        nextStepId: newStepId
                    };

                    const newStep: FlowStep = {
                        id: newStepId,
                        type: continuationModal.pendingStepType,
                        label: getStepLabel(continuationModal.pendingStepType),
                        iconName: getStepIcon(continuationModal.pendingStepType),
                        config: continuationModal.pendingStepType === 'wait' ? { duration: 1, unit: 'hours' } : {}
                    };

                    const steps = [...(selectedFlow.steps || []), waitStep, newStep];
                    const parentStep = steps.find(s => s.id === parentId);
                    if (parentStep) {
                        const linkKey = branch === 'yes' ? 'yesStepId' : (branch === 'no' ? 'noStepId' : (branch === 'A' ? 'pathAStepId' : (branch === 'B' ? 'pathBStepId' : 'nextStepId')));
                        (parentStep as any)[linkKey] = waitStepId;
                    }

                    // Queue stop decision
                    setPendingMigrations(prev => [...prev, {
                        flowId: selectedFlow.id,
                        action: 'stop',
                        targetStepId: ''
                    }]);

                    handleUpdateFlow({ ...selectedFlow, steps }, false, `Thêm bước mới (Người cũ Dừng)`, true);
                    setContinuationModal({ ...continuationModal, isOpen: false });
                    showToast('Đã thêm bước mới. Người dùng đã Hoàn thành sẽ không thực hiện bước này.');
                }}
            />

            <ActivateFlowModal
                isOpen={isActivateModalOpen}
                onClose={() => { setIsActivateModalOpen(false); setActivateContext(null); }}
                onConfirm={handleConfirmActivation}
                flowName={activateContext?.flow?.name || ''}
                linkedCampaignName={campaigns.find(c => c.id === activateContext?.flow?.steps?.find(s => s.type === 'trigger')?.config?.targetId)?.name}
                isLoading={isSaving}
            />
            {
                selectedFlow && (
                    <FlowSimulateModal
                        isOpen={isSimulateModalOpen}
                        onClose={() => setIsSimulateModalOpen(false)}
                        flow={selectedFlow}
                    />
                )
            }
            {/* NEW: Automation Warning is now handled inside CustomerProfileModal on save */}
            <CustomerProfileModal
                subscriber={selectedSubscriberForDetail}
                onClose={() => setSelectedSubscriberForDetail(null)}
                // We reuse the same handler, assuming we just need to save basic info.
                // For complex updates (list add/remove inside modal), we might need to handle onUpdate more robustly if needed.
                // But for viewing detail, this is sufficient.
                onUpdate={async (updated) => {
                    setLoading(true);
                    try {
                        const res = await api.put(`subscribers/${updated.id}`, updated);
                        if (res.success) {
                            if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                            showToast('Đã cập nhật hồ sơ', 'success');
                        } else {
                            showToast(res.message || 'Lỗi khi cập nhật hồ sơ', 'error');
                        }
                    } catch (error) {
                        showToast('Lỗi hệ thống khi cập nhật hồ sơ', 'error');
                    } finally {
                        setLoading(false);
                    }
                }}
                onDelete={async (id) => {
                    setLoading(true);
                    try {
                        const res = await api.delete(`subscribers/${id}`);
                        if (res.success) {
                            if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                            setSelectedSubscriberForDetail(null);
                            showToast('Đã xóa Khách hàng', 'success');
                        } else {
                            showToast(res.message || 'Lỗi khi xóa Khách hàng', 'error');
                        }
                    } catch (error) {
                        showToast('Lỗi hệ thống khi xóa Khách hàng', 'error');
                    } finally {
                        setLoading(false);
                    }
                }}
                allLists={allLists}
                allSegments={allSegments}
                allFlows={flows}
                allTags={allTags}
                checkMatch={() => false} // Simplify for this view
                onAddToList={async (subId, listId) => {
                    try {
                        const getRes = await api.get<any>(`subscribers?id=${subId}`);
                        if (getRes.success) {
                            const sub = getRes.data;
                            if (Array.isArray(sub.listIds) && !sub.listIds.includes(listId)) {
                                await api.put(`subscribers/${subId}`, { ...sub, listIds: [...sub.listIds, listId] });
                                if (viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                            }
                        }
                    } catch (error) {
                        showToast('Lỗi khi thêm vào danh sách', 'error');
                    }
                }}
                onRemoveFromList={async (subId, listId) => {
                    try {
                        let payload: any = { type: 'list_remove', listId: listId, subscriberIds: [subId] };
                        const res = await api.post<any>('bulk_operations', payload);
                        if (res.success && viewingGroup) fetchGroupMembers(viewingGroup, groupPagination.page, groupSearch);
                    } catch (error) {
                        showToast('Lỗi khi gỡ khỏi danh sách', 'error');
                    }
                }}
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
                onStatusFilter={() => { }}
                onRemoveFromList={(ids, opts) => {
                    if (viewingGroup?.type === 'list') {
                        handleDetailRemoveFromList(ids, viewingGroup.id, opts);
                    }
                }}
                onRemoveFromTag={(ids, opts) => {
                    if (viewingGroup?.type === 'tag') {
                        handleDetailRemoveFromTag(ids, viewingGroup.name, opts);
                    }
                }}
                onViewProfile={setSelectedSubscriberForDetail}
            />
            <StepParticipantsModal
                isOpen={isParticipantsModalOpen}
                onClose={() => setIsParticipantsModalOpen(false)}
                title={selectedAnalyticsStepId ? (selectedFlow?.steps.find(s => s.id === selectedAnalyticsStepId)?.label || 'Báo cáo bước') : 'Báo cáo'}
                participants={modalParticipants}
                loading={loadingParticipants}
                pagination={analyticsPagination}
                onPageChange={(p) => setAnalyticsPagination(prev => ({ ...prev, page: p }))}
                onRefresh={() => selectedFlow && selectedAnalyticsStepId && fetchParticipants(selectedFlow.id, selectedAnalyticsStepId, analyticsActiveTab, analyticsPagination.page, analyticsSearchTerm)}
                searchTerm={analyticsSearchTerm}
                onSearchChange={setAnalyticsSearchTerm}
                activeTab={analyticsActiveTab}
                onTabChange={setAnalyticsActiveTab}
                getStepName={(id) => selectedFlow?.steps.find(s => s.id === id)?.label || 'Unknown'}
                stepType={selectedFlow?.steps.find(s => s.id === selectedAnalyticsStepId)?.type}
                stepConfig={selectedFlow?.steps.find(s => s.id === selectedAnalyticsStepId)?.config}
                flowId={selectedFlow?.id}
                stepId={selectedAnalyticsStepId || undefined}
            />
            {/* History Modal: DB-backed */}
            {isHistoryModalOpen && selectedFlow && (
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    snapshots={flowSnapshots}
                    isLoading={isLoadingSnapshots}
                    onRestore={handleRestoreSnapshot}
                />
            )}
            {/* Restore Confirm Dialog */}
            {restoreConfirmSnapshot && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-[#ffa900] shrink-0">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800">Xác nhận khôi phục phiên bản</h3>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Hành động này sẽ thay thế flow hiện tại</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-black text-amber-800">📋 Phiên bản được chọn:</p>
                                <p className="text-sm font-bold text-slate-700">{restoreConfirmSnapshot.label}</p>
                                <div className="flex gap-4 text-[10px] text-slate-500 font-medium">
                                    <span>🕐 {new Date(restoreConfirmSnapshot.created_at).toLocaleString('vi-VN')}</span>
                                    {restoreConfirmSnapshot.created_by && <span>👤 {restoreConfirmSnapshot.created_by}</span>}
                                </div>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                                <p className="text-[11px] font-bold text-rose-700">⚠️ Cònh báo: Mọi thay đổi chưa lưu hiện tại sẽ bị mất. Sau khi khôi phục, bạn cần bấm <strong>Lưu</strong> để áp dụng lên server.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-3 justify-end">
                            <button
                                onClick={() => setRestoreConfirmSnapshot(null)}
                                disabled={isRestoringSnapshot}
                                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                disabled={isRestoringSnapshot}
                                className="px-5 py-2 text-xs font-black text-white bg-[#ffa900] hover:bg-[#e69500] rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
                            >
                                {isRestoringSnapshot ? (
                                    <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang khôi phục...</>
                                ) : (
                                    <><RotateCcw className="w-3.5 h-3.5" />Khôi phục ngay</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Flows;