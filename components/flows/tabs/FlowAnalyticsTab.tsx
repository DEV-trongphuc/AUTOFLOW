
import React, { useState, useMemo, useEffect, memo } from 'react';
import {
    Users, CheckCircle2, Mail, MousePointerClick, Activity, Filter,
    X, Target, Zap, Search, Download, UserPlus, Tag, ListPlus,
    MoreHorizontal, MailOpen, ChevronRight, ChevronDown, ChevronUp, Check, Plus, Save,
    FastForward, UserMinus, RefreshCcw, ArrowRightLeft, Loader2,
    Clock, History, CalendarClock, Layers, FileInput, Calendar, Send,
    GitMerge, Beaker, Link as LinkIcon, Trash2, AlertOctagon, ShoppingCart, List, UserCheck,
    Play, Pause, Eraser, FileDown, ExternalLink, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Flow, Subscriber } from '../../../types';
import { api } from '../../../services/storageAdapter';
import Skeleton from '../../common/Skeleton';
import Card from '../../common/Card';
import Badge from '../../common/Badge';
import toast from 'react-hot-toast';
import StepErrorModal from '../modals/StepErrorModal';
import StepUnsubscribeModal from '../modals/StepUnsubscribeModal';
import StepParticipantsModal from '../modals/StepParticipantsModal';
import ConfirmModal from '../../common/ConfirmModal';
import FlowSimulateModal from '../modals/FlowSimulateModal';
import { generateFlowStepLabels } from '../../../utils/flowLabeling';

const FlowAnalyticsTab: React.FC<{ flow: Flow }> = memo(({ flow }) => {
    const navigate = useNavigate();
    const [modalParticipants, setModalParticipants] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [currentFlow, setCurrentFlow] = useState<Flow>(flow); // Local copy for fresh stats
    const [loadingList, setLoadingList] = useState(false);
    // NEW: Track active branch for each split step
    const [activeBranches, setActiveBranches] = useState<Record<string, string>>({});

    // Inactive Users State
    const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
    const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
    const [inactivePagination, setInactivePagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [loadingInactive, setLoadingInactive] = useState(false);
    // NEW: Track completed user stats by branch (leaf node id -> count)
    const [completedBranchStats, setCompletedBranchStats] = useState<Record<string, number>>({});
    // NEW: Real-time Waiting Distribution from Backend (Updated to support Bottleneck Detection)
    const [realtimeDistribution, setRealtimeDistribution] = useState<Record<string, { count: number, avg_wait: number }>>({});
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOpens, setShowOpens] = useState(false);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    // NEW: Execution Log State
    const [logPage, setLogPage] = useState(1);
    const [logPagination, setLogPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [logSearchTerm, setLogSearchTerm] = useState('');
    const [debouncedLogSearch, setDebouncedLogSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [isLoadingMoreLogs, setIsLoadingMoreLogs] = useState(false);

    // Error and Unsubscribe Modal States
    const [errorModal, setErrorModal] = useState({ isOpen: false, stepId: '', stepLabel: '', users: [] });
    const [unsubscribeModal, setUnsubscribeModal] = useState({ isOpen: false, stepId: '', stepLabel: '', users: [] });

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Participants Modal State
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<'waiting' | 'opened' | 'failed' | 'unsubscribed' | 'all' | 'clicks' | 'all_touched' | 'report' | 'zns_sent' | 'zns_clicked' | 'zns_replied' | 'zns_failed'>('all_touched');

    const triggerStep = useMemo(() => currentFlow.steps.find(s => s.type === 'trigger'), [currentFlow.steps]);

    // Safe access to stats with defaults
    const stats = currentFlow.stats || { enrolled: 0, completed: 0, totalSent: 0, totalOpened: 0, uniqueOpened: 0, totalClicked: 0, totalFailed: 0, totalUnsubscribed: 0 };

    // Memoize labels for unified usage
    const flowLabels = useMemo(() => generateFlowStepLabels(currentFlow), [currentFlow]);

    // Calculate Rates
    const realOpenRate = (stats.totalSent || 0) > 0
        ? Math.round(((stats.uniqueOpened || 0) / stats.totalSent) * 100)
        : 0;

    const errorRate = (stats.totalSent || 0) > 0
        ? ((stats.totalFailed || 0) / ((stats.totalSent || 0) + (stats.totalFailed || 0)) * 100).toFixed(1)
        : "0.0";

    const completionRate = (stats.enrolled || 0) > 0
        ? Math.round(((stats.completed || 0) / stats.enrolled) * 100)
        : 0;

    // --- HELPER: GET VISUAL STYLE FOR NODE ---
    const getNodeStyle = (step: any) => {
        const type = step.type;
        const config = step.config || {};

        // 1. TRIGGER STYLES
        if (type === 'trigger') {
            const tType = config.type || 'segment';
            switch (tType) {
                case 'segment': return { icon: Layers, gradient: 'from-orange-500 to-[#ca7900]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Segment Trigger' };
                case 'form': return { icon: FileInput, gradient: 'from-amber-400 to-orange-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Form Trigger' };
                case 'purchase': return { icon: ShoppingCart, gradient: 'from-pink-500 to-rose-600', text: 'text-pink-600', bg: 'bg-pink-50', label: 'Purchase Trigger' };
                case 'custom_event': return { icon: Zap, gradient: 'from-violet-500 to-indigo-600', text: 'text-violet-600', bg: 'bg-violet-50', label: 'Custom Event' };
                case 'tag': return { icon: Tag, gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Tag Trigger' };
                case 'date': return { icon: Calendar, gradient: 'from-blue-500 to-indigo-600', text: 'text-blue-600', bg: 'bg-blue-50', label: 'Date Event' };
                case 'campaign': return { icon: Send, gradient: 'from-violet-500 to-purple-600', text: 'text-violet-600', bg: 'bg-violet-50', label: 'Campaign Trigger' };
                default: return { icon: Zap, gradient: 'from-slate-700 to-slate-900', text: 'text-slate-600', bg: 'bg-slate-50', label: 'Trigger' };
            }
        }

        // 2. ACTION STYLES
        switch (type) {
            case 'action': return { icon: Mail, gradient: 'from-blue-600 to-indigo-700', text: 'text-blue-600', bg: 'bg-blue-50', label: 'Email' };
            case 'zalo_zns': return {
                icon: ({ className }: { className?: string }) => (
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/2048px-Icon_of_Zalo.svg.png"
                        alt="Zalo"
                        className={className}
                    />
                ),
                gradient: 'from-blue-400 to-blue-600',
                text: 'text-blue-600',
                bg: 'bg-blue-50',
                label: 'Zalo ZNS'
            };
            case 'wait': return { icon: Clock, gradient: 'from-amber-400 to-orange-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Delay' };
            case 'condition': return { icon: GitMerge, gradient: 'from-indigo-500 to-purple-600', text: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Condition' };
            case 'advanced_condition': return { icon: GitMerge, gradient: 'from-indigo-500 to-purple-600', text: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Adv. Condition' };
            case 'split_test': return { icon: Beaker, gradient: 'from-violet-500 to-fuchsia-600', text: 'text-violet-600', bg: 'bg-violet-50', label: 'A/B Test' };
            case 'update_tag': return { icon: Tag, gradient: 'from-emerald-500 to-emerald-700', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Update Tag' };
            case 'list_action': return { icon: List, gradient: 'from-orange-500 to-orange-700', text: 'text-orange-600', bg: 'bg-orange-50', label: 'List Action' };
            case 'link_flow': return { icon: LinkIcon, gradient: 'from-slate-700 to-slate-900', text: 'text-slate-600', bg: 'bg-slate-50', label: 'Jump Flow' };
            case 'remove_action': return { icon: UserMinus, gradient: 'from-rose-500 to-red-600', text: 'text-rose-600', bg: 'bg-rose-50', label: 'Clean Up' };
            default: return { icon: CheckCircle2, gradient: 'from-slate-400 to-slate-500', text: 'text-slate-500', bg: 'bg-slate-50', label: 'Step' };
        }
    };

    // CHUYỂN ĐỔI DỮ LIỆU THỰC TẾ SANG FUNNEL (REAL-TIME LOGIC)
    const funnelData = useMemo(() => {
        // 1. TOPOLOGICAL SORT: Get steps in execution order (Start -> End)
        const sortedSteps: any[] = [];
        const trigger = currentFlow.steps.find(s => s.type === 'trigger');

        if (trigger) {
            const queue = [trigger.id];
            const visited = new Set<string>();

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (visited.has(currentId)) continue;
                visited.add(currentId);

                const step = currentFlow.steps.find(s => s.id === currentId);
                if (step) {
                    sortedSteps.push(step);
                    // Add children to queue
                    if (step.nextStepId) queue.push(step.nextStepId);
                    if (step.yesStepId) queue.push(step.yesStepId);
                    if (step.noStepId) queue.push(step.noStepId);
                    if (step.pathAStepId) queue.push(step.pathAStepId);
                    if (step.pathBStepId) queue.push(step.pathBStepId);
                }
            }
        } else {
            // Fallback if no trigger (shouldn't happen in valid flow)
            sortedSteps.push(...currentFlow.steps);
        }

        // Filter for Action Steps from the SORTED steps - ADD zalo_zns
        const actionSteps = sortedSteps.filter(s => ['action', 'zalo_zns', 'update_tag', 'condition', 'wait', 'list_action', 'remove_action'].includes(s.type));

        // 2. T?o Map index d? bi?t th? t? bu?c
        const stepIndexMap: Record<string, number> = {};
        actionSteps.forEach((s, idx) => { stepIndexMap[s.id] = idx; });

        // 3. (REMOVED REDUNDANT DISTRIBUTION LOGIC)
        // Distribution is now handled by realtimeDistribution fetch for accuracy and performance.

        // Build Parent Map for Branch Labeling (Kept existing)
        const parentMap: Record<string, { id: string, branch: string }> = {};
        currentFlow.steps.forEach(s => {
            if (s.nextStepId) parentMap[s.nextStepId] = { id: s.id, branch: 'next' };
            if (s.yesStepId) parentMap[s.yesStepId] = { id: s.id, branch: 'yes' };
            if (s.noStepId) parentMap[s.noStepId] = { id: s.id, branch: 'no' };
            if (s.pathAStepId) parentMap[s.pathAStepId] = { id: s.id, branch: 'A' };
            if (s.pathBStepId) parentMap[s.pathBStepId] = { id: s.id, branch: 'B' };
        });

        // 3.5 [SHIFTING LOGIC] Move 'Waiting' counts from Wait/Delay steps to their target steps
        const shiftedWaiting = new Map<string, number>();
        currentFlow.steps.forEach(s => {
            shiftedWaiting.set(s.id, realtimeDistribution[s.id]?.count || 0);
        });

        // Loop through steps in order and push 'wait' counts forward
        // Repeat up to 3 times to handle chained wait nodes (Wait -> Wait -> Action)
        for (let i = 0; i < 3; i++) {
            sortedSteps.forEach(s => {
                if (s.type === 'wait') {
                    const count = shiftedWaiting.get(s.id) || 0;
                    if (count > 0 && s.nextStepId) {
                        const currentTargetCount = shiftedWaiting.get(s.nextStepId) || 0;
                        shiftedWaiting.set(s.nextStepId, currentTargetCount + count);
                        shiftedWaiting.set(s.id, 0); // Clear from wait step
                    }
                }
            });
        }


        // 4. Build Funnel Data (Recursive Traversal)
        const finalFunnel: any[] = [];

        const traverse = (stepId: string) => {
            const step = currentFlow.steps.find(s => s.id === stepId);
            if (!step) return;

            // Add current step
            const idx = stepIndexMap[step.id] ?? -1;

            if (['trigger', 'action', 'zalo_zns', 'update_tag', 'condition', 'wait', 'list_action', 'remove_action', 'split_test', 'advanced_condition'].includes(step.type)) {
                const sStats = (step as any).stats || { sent: 0, opened: 0, processed: 0, matched: 0, timed_out: 0, path_a: 0, path_b: 0, waiting: 0, zns_sent: 0, zns_failed: 0 };
                const waitingData = realtimeDistribution[step.id];
                const waitingHere = shiftedWaiting.get(step.id) ?? 0; // USE SHIFTED COUNT
                const avgWaitSeconds = waitingData?.avg_wait || 0;

                // SHOW: Waiting + Processed (Approx total who touched this step)
                // Fix for Condition: 'processed' might not be populated or distributed correctly - use matched+timed_out
                let processedHere = (sStats.processed || 0);
                if (step.type === 'condition') {
                    // For Condition, "processed" is effectively the sum of those who went 'Yes' (matched) and 'No' (timed_out)
                    const totalMatched = (sStats.matched || 0);
                    const totalTimedOut = (sStats.timed_out || 0);
                    // Use the greater of 'processed' or sum of paths to be safe, or just sum of paths
                    processedHere = Math.max(processedHere, totalMatched + totalTimedOut);
                }
                const displayUserCount = waitingHere + processedHere;

                let displayRate = 0;
                let detailStat = null;

                // Calc stats...
                if (step.type === 'action') {
                    const stepSent = sStats.sent || 0;
                    const stepOpened = sStats.unique_opened || sStats.opened || 0;
                    displayRate = stepSent > 0 ? Math.round((stepOpened / stepSent) * 100) : 0;
                } else if (step.type === 'zalo_zns') {
                    const znsSent = sStats.zns_sent || 0;
                    const znsClicked = sStats.zns_clicked || 0;
                    displayRate = znsSent > 0 ? Math.round((znsClicked / znsSent) * 100) : 0;
                    detailStat = `Sent: ${znsSent}${znsClicked > 0 ? ` / Clicks: ${znsClicked}` : ''}`;
                } else if (step.type === 'condition') {
                    const totalCond = (sStats.matched || 0) + (sStats.timed_out || 0);

                    if (totalCond > 0) {
                        displayRate = Math.round(((sStats.matched || 0) / totalCond) * 100);
                        detailStat = `${sStats.matched} IF / ${sStats.timed_out} ELSE`;
                    }
                } else if (step.type === 'advanced_condition') {
                    const branchStats = sStats.branchStats || {};
                    const totalProcessed = sStats.processed || Object.values(branchStats).reduce((a: any, b: any) => a + b, 0); // Approx
                    // For Advance Condition, rate isn't as simple as Yes/No. 
                    // Let's show the breakdown in detailStat
                    const parts = Object.entries(branchStats).map(([k, v]) => `${k}: ${v}`);
                    detailStat = parts.length > 0 ? parts.join(' | ') : 'No data';
                    // Fallback visual rate? Maybe just show total processed
                    displayRate = 100; // Just to fill bar or hide it
                } else if (step.type === 'split_test') {
                    const totalSplit = (sStats.path_a || 0) + (sStats.path_b || 0);
                    if (totalSplit > 0) {
                        displayRate = Math.round(((sStats.path_a || 0) / totalSplit) * 100);
                        detailStat = `A(${sStats.path_a}) / B(${sStats.path_b})`;
                    }
                }

                const labelInfo = flowLabels[step.id];
                const stepDisplayLabel = labelInfo ? labelInfo.stepNumberLabel : 'Step';
                const style = getNodeStyle(step);

                // Determine if this step is "Truly Stuck"
                let isTrulyStuck = false;
                if (avgWaitSeconds > 3600 * 24) {
                    if (step.type === 'wait') {
                        // For relative delays, only flag if > duration + 24h
                        if (step.config?.type === 'delay') {
                            const durationData = parseInt(step.config?.duration || '0');
                            const unitData = step.config?.unit;
                            const limit = durationData * (unitData === 'days' ? 86400 : (unitData === 'hours' ? 3600 : 60));
                            isTrulyStuck = limit > 0 && avgWaitSeconds > limit + 3600 * 24;
                        } else { isTrulyStuck = false; }
                    } else if (step.type === 'condition') {
                        const durationData = parseInt(step.config?.waitDuration || '0');
                        const unitData = step.config?.waitUnit;
                        const limit = durationData * (unitData === 'days' ? 86400 : (unitData === 'hours' ? 3600 : 60));
                        isTrulyStuck = avgWaitSeconds > limit + 3600 * 24;
                    } else {
                        isTrulyStuck = true;
                    }
                }

                finalFunnel.push({
                    id: step.id,
                    type: step.type,
                    stepLabel: style.label,
                    stepNumberLabel: stepDisplayLabel,
                    label: step.label,
                    users: displayUserCount,
                    waiting: waitingHere,
                    processedHere: processedHere,
                    rate: displayRate,
                    detailStat: detailStat,
                    config: step.config,
                    style: style,
                    hasBranches: (step.type === 'condition' || step.type === 'split_test' || step.type === 'advanced_condition'),
                    activeBranch: activeBranches[step.id], // Current active branch
                    avgWaitSeconds: avgWaitSeconds,
                    isTrulyStuck: isTrulyStuck
                });
            }

            // Recurse based on type and active branch
            let nextStepId: string | undefined = undefined;

            if (step.type === 'condition') {
                const currentBranch = activeBranches[step.id] || 'yes';
                nextStepId = currentBranch === 'yes' ? step.yesStepId : step.noStepId;
            } else if (step.type === 'split_test') {
                const currentBranch = activeBranches[step.id] || 'A';
                nextStepId = currentBranch === 'A' ? step.pathAStepId : step.pathBStepId;
            } else if (step.type === 'advanced_condition') {
                // Find branch ID that matches activeBranches selection
                const branches = step.config.branches || [];
                const currentBranchId = activeBranches[step.id];

                if (currentBranchId) {
                    if (currentBranchId === 'fallback') {
                        nextStepId = step.config.defaultStepId;
                    } else {
                        const branch = branches.find((b: any) => b.id === currentBranchId);
                        if (branch) nextStepId = branch.stepId;
                        else if (step.config.defaultStepId) nextStepId = step.config.defaultStepId; // Fallback safety
                    }
                } else {
                    // Default to first branch if nothing selected
                    if (branches.length > 0) {
                        nextStepId = branches[0].stepId;
                    } else {
                        nextStepId = step.config.defaultStepId;
                    }
                }
            } else {
                nextStepId = step.nextStepId;
            }

            // Check for termination
            if (nextStepId) {
                traverse(nextStepId);
            } else {
                // BRANCH TERMINATION -> Add "Completed" node for this branch
                // [FIX] Use min(total_completed, last_step_processed) for most accurate display.
                // Reasoning:
                //   - stats.completed = 444 (authoritative, but can exceed step.stats due to buffer lag)
                //   - byBranch[step.id] = 439 (undercounts due to step_id mismatch on exit paths)
                //   - step.stats.processed = 440 (definitive: exactly how many passed through last step)
                // → min(444, 440) = 440: matches Qua count, never shows more completed than passed through.
                const lastStepStats = (step as any).stats || {};
                const lastStepProcessed = lastStepStats.processed || lastStepStats.sent || 0;
                const totalCompleted = stats.completed || 0;
                const byBranchCount = completedBranchStats[step.id] || 0;
                // Priority: min(total, last_step_processed) when we have real data; fallback to byBranch
                const completedCount = lastStepProcessed > 0
                    ? Math.min(totalCompleted, lastStepProcessed)
                    : (byBranchCount > 0 ? byBranchCount : totalCompleted);
                finalFunnel.push({
                    id: `end_${step.id}`,
                    type: 'completed',
                    stepLabel: 'Kết thúc',
                    stepNumberLabel: 'END',
                    label: "Hoàn thành Flow",
                    users: completedCount,
                    waiting: 0,
                    rate: 100,
                    detailStat: `Hoàn tất: ${completedCount}`,
                    config: {},
                    style: { icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Completed' }
                });
            }

        };

        const triggerStart = currentFlow.steps.find(s => s.type === 'trigger');
        if (triggerStart) {
            traverse(triggerStart.id);
        }

        // =========================================================================================
        // POST-PROCESSING: BACK-PROPAGATE TRAFFIC (INFER COUNTS FROM LEAVES UP TO ROOT)
        // This fixes "0 Processed" issues for system steps where logs were previously missing.
        // Concept: Traffic(S) = Waiting(S) + Sum(Traffic(Children))
        // =========================================================================================

        const funnelMap = new Map();
        finalFunnel.forEach(item => funnelMap.set(item.id, item));
        const computedTraffic = new Map<string, number>();

        // Iterate sorted steps in REVERSE (Bottom-Up)
        for (let i = sortedSteps.length - 1; i >= 0; i--) {
            const step = sortedSteps[i];
            const funnelItem = funnelMap.get(step.id);

            // 1. Initial Traffic = Waiting count at this step
            let myTraffic = funnelItem ? funnelItem.waiting : 0;

            // 2. Add Traffic from Children (Who must have passed through here)
            const childrenIds: string[] = [];
            if (step.nextStepId) childrenIds.push(step.nextStepId);
            if (step.yesStepId) childrenIds.push(step.yesStepId);
            if (step.noStepId) childrenIds.push(step.noStepId);
            if (step.pathAStepId) childrenIds.push(step.pathAStepId);
            if (step.pathBStepId) childrenIds.push(step.pathBStepId);
            if (step.config?.branches) {
                step.config.branches.forEach((b: any) => { if (b.stepId) childrenIds.push(b.stepId); });
            }
            if (step.config?.defaultStepId) childrenIds.push(step.config.defaultStepId);

            let childrenTraffic = 0;
            childrenIds.forEach(childId => {
                // Add computed traffic from child
                // [FIX] Use a global map for traffic to ensure we count all branches
                childrenTraffic += computedTraffic.get(childId) || 0;
            });

            // 3. Add Traffic from completions recorded exactly at this step (very important for all branches)
            // This ensures that people who end at this step (on ANY branch) are counted in the parent's total traffic.
            const completionsHere = completedBranchStats[step.id] || 0;
            myTraffic += completionsHere;

            myTraffic += childrenTraffic;
            computedTraffic.set(step.id, myTraffic);

            // 4. Update Funnel Item with inferred counts
            if (funnelItem) {
                // People who entered this step = Total traffic computed above
                const totalEntered = myTraffic;

                funnelItem.processedHere = Math.max(funnelItem.processedHere, totalEntered - funnelItem.waiting);
                funnelItem.users = funnelItem.waiting + funnelItem.processedHere;

                // Calculation for Drop-off
                // Traffic Moved Forward (to ANY branch) + Traffic Completed (Target reached)
                const totalSuccess = childrenTraffic + completionsHere;
                const totalEffectiveIn = funnelItem.processedHere;

                // Only show drop-off if there's significant data and it's not a terminal step
                if (totalEffectiveIn > 5 && childrenIds.length > 0) {
                    const dropRate = 1 - (totalSuccess / totalEffectiveIn);
                    // Only flag if drop rate is significant (> 1%)
                    if (dropRate > 0.01) {
                        funnelItem.dropOffRate = dropRate;
                    } else {
                        delete funnelItem.dropOffRate;
                    }
                }
            }

        }

        return finalFunnel;
    }, [currentFlow.steps, stats, activeBranches, flowLabels, completedBranchStats, realtimeDistribution]);

    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const selectedStepType = useMemo(() => {
        if (!selectedStepId) return null;
        return currentFlow.steps.find(s => s.id === selectedStepId)?.type;
    }, [selectedStepId, currentFlow.steps]);

    const handleToggleOpens = (val: boolean) => {
        setShowOpens(val);
        // fetchParticipants will be triggered by useEffect
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        refreshFlow();
        fetchLogs(1, true, debouncedLogSearch);
        // Removed fetchParticipants(1) from here, it's handled by the unified effect below
    }, [flow.id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedLogSearch(logSearchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [logSearchTerm]);

    useEffect(() => {
        if (flow.id) {
            fetchLogs(1, true, debouncedLogSearch);
        }
    }, [debouncedLogSearch]);

    // Unified effect for participants - Handles initial load and all filter changes
    useEffect(() => {
        // For Report and Clicks tabs, we still fetch to get the total count for the modal header
        // while the tabs handle their own detailed data fetching.

        // Map modalTab to API params
        let typeParam: string | null = null;
        let statusParam: string | null = selectedStatus;

        if (!selectedStatus && selectedStepId) {
            if (modalTab === 'opened') typeParam = 'opens';
            else if (modalTab === 'failed') statusParam = 'failed';
            else if (modalTab === 'unsubscribed') statusParam = 'unsubscribed';
            else if (modalTab === 'waiting') statusParam = null;
            else if (modalTab === 'report') statusParam = 'all_touched';
            else if (modalTab === 'all_touched') statusParam = 'all_touched';
            else if (modalTab === 'clicks') typeParam = 'clicks';
            // ZNS Logic
            else if (modalTab === 'zns_sent') typeParam = 'zns_sent'; // API must support type=zns_sent
            else if (modalTab === 'zns_clicked') typeParam = 'click_zns';
            else if (modalTab === 'zns_replied') typeParam = 'reply_zns';
            else if (modalTab === 'zns_failed') typeParam = 'zns_failed';
        }

        fetchParticipants(1, selectedStepId, statusParam, debouncedSearchTerm, typeParam);
    }, [flow.id, selectedStepId, selectedStatus, debouncedSearchTerm, modalTab]);

    // Sync local flow changes (steps/config) from parent to ensure report shows unsaved steps
    useEffect(() => {
        setCurrentFlow(prev => ({
            ...prev,
            steps: flow.steps,
            config: flow.config,
            name: flow.name
        }));
    }, [flow]);

    const refreshFlow = async () => {
        // [FIX] Fetch flow data + completed stats + distribution ALL in parallel.
        // Previously: flow data was set first, then fetchLogs fetched stats separately.
        // This caused a window where step.stats.processed (from flow) was newer than
        // completedBranchStats (from fetchLogs), showing e.g. "440 Qua / 439 Hoàn thành".
        // Fix: single Promise.all ensures all state updates use data from the same moment.
        const [flowRes, statsRes, distRes] = await Promise.all([
            api.get<Flow>(`flows/${flow.id}`),
            api.get<any>(`flows?id=${flow.id}&route=completed-users`),
            api.get<any>(`flows?id=${flow.id}&route=distribution`)
        ]);

        if (flowRes.success) setCurrentFlow(flowRes.data);
        if (statsRes.success && statsRes.data) setCompletedBranchStats(statsRes.data.byBranch || {});
        if (distRes.success && distRes.data) setRealtimeDistribution(distRes.data);

        // Fetch logs only (skip stats re-fetch since we just set them above)
        fetchLogs(1, false, debouncedLogSearch);
    };

    const fetchParticipants = async (page = 1, stepId?: string | null, status?: string | null, search?: string, type?: string | null) => {
        setLoadingList(true);
        let url = '';

        // [SHIFTING FIX] If we are looking for 'waiting' users for a specific step,
        // we must also include users who are at any 'wait' step that leads to this step.
        let effectiveStepId = stepId;
        if (stepId && (!status || status === 'waiting')) {
            const sources = [stepId];
            const findWaitSources = (targetId: string) => {
                currentFlow.steps.forEach(s => {
                    if (s.type === 'wait' && s.nextStepId === targetId && !sources.includes(s.id)) {
                        sources.push(s.id);
                        findWaitSources(s.id);
                    }
                });
            };
            findWaitSources(stepId);
            effectiveStepId = sources.join(',');
        }

        if (status === 'failed') {
            url = `flows?id=${flow.id}&route=step-errors&page=${page}&limit=10`;
            if (effectiveStepId) url += `&step_id=${effectiveStepId}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
        } else if (status === 'unsubscribed') {
            url = `flows?id=${flow.id}&route=step-unsubscribes&page=${page}&limit=10`;
            if (effectiveStepId) url += `&step_id=${effectiveStepId}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
        } else {
            url = `flows?id=${flow.id}&route=participants&page=${page}&limit=10`;
            if (effectiveStepId) url += `&step_id=${effectiveStepId}`;
            if (status) url += `&status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (type) url += `&type=${type}`;
        }

        const res = await api.get<any>(url);
        if (res.success) {
            if (res.data.data && Array.isArray(res.data.data)) {

                // Mormalize data structure difference between endpoints if any
                // route=participants returns { data: [], pagination: {} }
                // route=step-errors usually returns array directly or similar structure?
                // Based on previous code: `setErrorModal({ ..., users: res.data })` implies it returned an array directly.
                // Let's handle both.

                setModalParticipants(res.data.data);
                setPagination(res.data.pagination);
            } else if (Array.isArray(res.data)) {
                // If endpoint returns direct array (like likely step-errors does based on old code)
                setModalParticipants(res.data);
                setPagination({ page: 1, limit: 10, total: res.data.length, totalPages: 1 });
            } else {
                setModalParticipants([]);
                setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
        } else {
            setModalParticipants([]);
            setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
        }
        setLoadingList(false);
    };

    // Auto-search effect moved to unified participant effect above

    const handleClearFilter = () => {
        setSelectedStepId(null);
        setSelectedStatus(null);
        setSearchTerm('');
        setDebouncedSearchTerm(''); // Clear immediately
        setShowOpens(false);
    };

    const handleStepClick = (stepId: string, type: string, initialTab?: string) => {
        setSelectedStepId(stepId);
        setSelectedStatus(null);
        setSearchTerm(''); // Clear search on step change
        setDebouncedSearchTerm(''); // Clear immediately to avoid lag/double-fetch
        setIsParticipantsModalOpen(true); // Open Modal

        // Smart Default Tab
        if (initialTab) {
            setModalTab(initialTab as any);
        } else if (type === 'zalo_zns') {
            setModalTab('zns_sent');
        } else {
            setModalTab('all_touched');
        }

        const isEmailStep = type === 'action';
        setShowOpens(isEmailStep); // Keep for legacy, but UI uses Modal now

        if (type === 'completed') {
            // Extract real step ID from "end_{stepId}"
            const realStepId = stepId.startsWith('end_') ? stepId.replace('end_', '') : stepId;
            setSelectedStepId(realStepId);
            setSelectedStatus('completed');
            setShowOpens(false);
            setIsParticipantsModalOpen(true);
        }
    };

    const fetchLogs = async (page = 1, reset = false, search = '') => {
        if (reset) {
            setLoadingLogs(true);
            setLogPage(1);
        } else {
            setIsLoadingMoreLogs(true);
        }

        const limit = 10;
        let url = `flows?id=${flow.id}&route=history&page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        // Parallel Fetch for Stats and History
        // Only fetch stats on first load or manual refresh
        const statsPromises = reset ? [
            api.get<any>(`flows?id=${flow.id}&route=completed-users`),
            api.get<any>(`flows?id=${flow.id}&route=distribution`)
        ] : [];

        try {
            const [historyRes, ...statsResults] = await Promise.all([
                api.get<any[]>(url),
                ...statsPromises
            ]);

            if (reset && statsResults.length === 2) {
                const [statsRes, distRes] = statsResults;
                if (statsRes.success && statsRes.data) {
                    setCompletedBranchStats(statsRes.data.byBranch || {});
                }
                if (distRes.success && distRes.data) {
                    setRealtimeDistribution(distRes.data);
                }
            }

            if (historyRes.success) {
                // Handle both response formats: direct array or { data: [], pagination: {} }
                const logsData = Array.isArray(historyRes.data)
                    ? historyRes.data
                    : ((historyRes.data as any)?.data && Array.isArray((historyRes.data as any).data) ? (historyRes.data as any).data : []);

                const paginationData = (historyRes.data as any)?.pagination || { page, limit, total: logsData.length, totalPages: Math.ceil(logsData.length / limit) };

                setLogs(logsData);
                setLogPagination(paginationData);
                setLogPage(page);
            } else if (reset) {
                setLogs([]);
                setLogPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoadingLogs(false);
            setIsLoadingMoreLogs(false);
        }
    };

    const getStepName = (stepId: string) => {
        if (flowLabels[stepId]) return flowLabels[stepId].fullLabel;
        const s = currentFlow.steps.find(x => x.id === stepId);
        return s ? s.label : 'Unknown Step';
    };

    const formatTime = (iso: string) => {
        if (!iso) return '--';
        return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    const calculateTimeRemaining = (dateStr: string) => {
        if (!dateStr) return '';
        const target = new Date(dateStr).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) return 'Sắp chạy ngay';

        const totalMinutes = Math.floor(diff / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) {
            return `Còn ${days} ngày ${hours}h ${minutes}p`;
        }
        if (hours > 0) return `Còn ${hours}h ${minutes}p`;
        return `Còn ${minutes} phút`;
    };

    // Grouping Logic: Group consecutive logs from the same user
    const groupedLogs = useMemo(() => {
        const groups: any[] = [];
        let currentGroup: any = null;

        logs.forEach((log, index) => {
            if (!currentGroup) {
                currentGroup = {
                    id: `group-${index}`,
                    email: log.email,
                    main: log,
                    subs: [],
                    isExpanded: expandedGroups.has(`group-${index}`)
                };
            } else if (currentGroup.email === log.email) {
                currentGroup.subs.push(log);
            } else {
                groups.push(currentGroup);
                currentGroup = {
                    id: `group-${index}`,
                    email: log.email,
                    main: log,
                    subs: [],
                    isExpanded: expandedGroups.has(`group-${index}`)
                };
            }
        });

        if (currentGroup) groups.push(currentGroup);
        return groups;
    }, [logs, expandedGroups]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    // Fetch step errors
    const fetchStepErrors = async (stepId: string, stepLabel: string) => {
        const res = await api.get<any>(`flows?id=${flow.id}&route=step-errors&step_id=${stepId}`);
        if (res.success && res.data) {
            setErrorModal({ isOpen: true, stepId, stepLabel, users: res.data });
        } else {
            setErrorModal({ isOpen: true, stepId, stepLabel, users: [] });
        }
    };

    // Fetch step unsubscribes
    const fetchStepUnsubscribes = async (stepId: string, stepLabel: string) => {
        const res = await api.get<any>(`flows?id=${flow.id}&route=step-unsubscribes&step_id=${stepId}`);
        if (res.success && res.data) {
            setUnsubscribeModal({ isOpen: true, stepId, stepLabel, users: res.data });
        } else {
            setUnsubscribeModal({ isOpen: true, stepId, stepLabel, users: [] });
        }
    };

    // Show toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    // Quick Actions
    const handleExportReport = async () => {
        showToast('Đang xuất Báo cáo...', 'info');
        const res = await api.post(`flows?id=${flow.id}&route=export-analytics`, {});
        if (res.success) {
            showToast('Xuất Báo cáo thành công!');
        } else {
            showToast('Lỗi khi xuất Báo cáo', 'error');
        }
    };

    const fetchInactiveUsers = async (page = 1) => {
        setLoadingInactive(true);
        setIsInactiveModalOpen(true);
        try {
            const res = await api.get(`flows?id=${flow.id}&route=inactive-users&page=${page}&limit=10`);
            if (res.success) {
                setInactiveUsers((res.data as any).users || []);
                if ((res.data as any).pagination) {
                    setInactivePagination((res.data as any).pagination);
                }
            } else {
                showToast('Không thể tải danh sách', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Lỗi kết nối', 'error');
        } finally {
            setLoadingInactive(false);
        }
    };

    const handleCleanFailedUsers = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận dọn dẹp',
            message: 'Bạn có chắc muốn xóa tất cả người dùng bị lỗi khỏi flow này?',
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false });
                showToast('Đang dọn dẹp...', 'info');
                const res = await api.post(`flows?id=${flow.id}&route=clean-failed`, {});
                if (res.success) {
                    showToast('Đã dọn dẹp người dùng bị lỗi!');
                    refreshFlow();
                } else {
                    showToast('Lỗi khi dọn dẹp', 'error');
                }
            }
        });
    };

    const StatItem = ({ label, value, icon: Icon, color, trend, onClick }: any) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-[24px] border border-slate-100 flex items-center justify-between hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group ${onClick ? 'cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
        >
            <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{label}</p>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
                {trend && <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 mt-1.5 bg-emerald-50 w-fit px-2 py-0.5 rounded-full border border-emerald-100">{trend}</span>}
            </div>
            <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br ${color === 'bg-blue-600' ? 'from-blue-500 to-indigo-600 shadow-indigo-500/10' :
                color === 'bg-[#ffa900]' ? 'from-orange-500 to-[#ca7900] shadow-orange-500/10' :
                    color === 'bg-indigo-600' ? 'from-indigo-500 to-blue-600 shadow-indigo-500/10' :
                        color === 'bg-emerald-500' ? 'from-emerald-500 to-teal-600 shadow-emerald-500/10' :
                            'from-slate-500 to-slate-600 shadow-slate-500/10'
                }`}>
                <Icon className="w-7 h-7" />
            </div>
        </div>
    );

    // --- BOTTLENECK INDICATOR COMPONENT ---
    const BottleneckBadge = ({ type, value, tooltip }: { type: 'time' | 'drop', value: string, tooltip?: string }) => (
        <div
            title={tooltip}
            className={`absolute -top-3 -right-3 z-50 px-3 py-1.5 rounded-full shadow-lg border flex items-center gap-2 animate-pulse cursor-help ${type === 'time' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-orange-500 border-orange-400 text-white'
                }`}
        >
            <AlertOctagon className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{value}</span>
        </div>
    );

    return (
        <div className="p-3 md:p-6 lg:px-8 lg:pb-8 lg:pt-4 space-y-4 md:space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 relative pb-20">

            {/* Premium Header Dashboard */}
            <div className="bg-[#0f172a] rounded-[24px] md:rounded-[40px] p-5 md:p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600 opacity-[0.1] rounded-full blur-[120px] -mr-48 -mt-48 transition-all duration-700 group-hover:opacity-[0.15]"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500 opacity-[0.05] rounded-full blur-[100px] -ml-32 -mb-32"></div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-center">
                    {/* Left: Main Performance */}
                    <div className="lg:col-span-5 lg:border-r border-white/10 lg:pr-10">
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-[14px] md:rounded-[18px] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-bold tracking-tight">Hiệu suất vận hành</h3>
                                    <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentFlow.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} title={currentFlow.status === 'active' ? 'Active' : 'Paused'}></span>
                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                            ID: {currentFlow.id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSimulateModalOpen(true)}
                                className="px-3 md:px-5 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 md:gap-2 backdrop-blur-md"
                            >
                                <Beaker className="w-3.5 h-3.5 md:w-4 h-4 text-blue-400" />
                                <span className="hidden xs:inline">FLOW TEST</span>
                                <span className="xs:hidden">TEST</span>
                            </button>
                        </div>

                        <div className="space-y-4 md:space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] md:text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Tỷ lệ hoàn tất</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">{completionRate}%</span>
                                        <span className="text-[10px] md:text-xs text-slate-400 font-medium">({stats.completed}/{stats.enrolled})</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] md:text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Tỷ lệ mở TB</p>
                                    <span className="text-xl md:text-2xl font-black text-emerald-400 tracking-tighter">{realOpenRate}%</span>
                                </div>
                            </div>

                            <div className="h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                                    style={{ width: `${completionRate}%` }}
                                ></div>
                            </div>
                        </div>

                    </div>

                    {/* Middle: Key Figures & Link */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                                <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5 md:mb-2 text-center lg:text-left">đã gửi</p>
                                <div className="flex items-center justify-center lg:justify-start gap-2">
                                    <div className="p-1 px-1.5 bg-white/5 rounded-lg border border-white/5 hidden md:block">
                                        <Mail className="w-3 h-3 text-blue-400" />
                                    </div>
                                    <span className="text-base md:text-lg font-bold">{(stats.totalSent || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                                <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5 md:mb-2 text-center lg:text-left">Đã mở</p>
                                <div className="flex items-center justify-center lg:justify-start gap-2">
                                    <div className="p-1 px-1.5 bg-white/5 rounded-lg border border-white/5 hidden md:block">
                                        <MailOpen className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <span className="text-base md:text-lg font-bold">{(stats.totalOpened || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                                <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5 md:mb-2 text-center lg:text-left">Gửi lại</p>
                                <div className="flex items-center justify-center lg:justify-start gap-2">
                                    <div className="p-1 px-1.5 bg-white/5 rounded-lg border border-white/5 hidden md:block">
                                        <AlertOctagon className={`w-3 h-3 ${(stats.totalFailed || 0) > 0 ? 'text-rose-400' : 'text-slate-600'}`} />
                                    </div>
                                    <span className={`text-base md:text-lg font-bold ${(stats.totalFailed || 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {(stats.totalFailed || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 lg:bg-transparent lg:p-0 lg:border-0">
                                <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5 md:mb-2 text-center lg:text-left">Hủy đăng ký</p>

                                <div className="flex items-center justify-center lg:justify-start gap-2">
                                    <div className="p-1 px-1.5 bg-white/5 rounded-lg border border-white/5 hidden md:block">
                                        <UserMinus className={`w-3 h-3 ${(stats.totalUnsubscribed || 0) > 0 ? 'text-orange-400' : 'text-slate-600'}`} />
                                    </div>
                                    <span className={`text-base md:text-lg font-bold ${(stats.totalUnsubscribed || 0) > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                                        {(stats.totalUnsubscribed || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* NEW: Campaign Link - REPOSITIONED & UNIFIED */}
                        {triggerStep?.config?.type === 'campaign' && triggerStep.config.targetId && (
                            <div className="flex items-center gap-4 p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="w-10 h-10 bg-violet-500/20 rounded-lg md:rounded-xl flex items-center justify-center border border-violet-500/30">
                                    <Send className="w-5 h-5 text-violet-300" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chiến dịch gốc</p>
                                    <p className="text-[10px] md:text-xs font-bold text-slate-200">Truy cập Báo cáo chi tiết</p>
                                </div>
                                <button
                                    onClick={() => navigate('/campaigns', { state: { openCampaignId: triggerStep.config.targetId } })}
                                    className="px-3 md:px-4 py-2 bg-white text-[#0f172a] hover:bg-slate-100 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 md:gap-2"
                                >
                                    <span className="hidden xs:inline">Báo cáo</span><span className="xs:hidden">Xem</span> <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatItem label="Khách hàng" value={(stats.enrolled || 0).toLocaleString()} icon={Users} color="bg-blue-600" />
                <StatItem
                    label="Lượt mở duy nhất"
                    value={(stats.uniqueOpened || 0).toLocaleString()}
                    icon={UserCheck}
                    color="bg-indigo-600"
                    onClick={() => {
                        if (triggerStep?.config?.type === 'campaign' && triggerStep.config.targetId) {
                            navigate('/campaigns', { state: { openCampaignId: triggerStep.config.targetId } });
                        }
                    }}
                />
                <StatItem
                    label="Lượt Click"
                    value={(stats.totalClicked || 0).toLocaleString()}
                    icon={MousePointerClick}
                    color="bg-[#ffa900]"
                    onClick={() => {
                        if (triggerStep?.config?.type === 'campaign' && triggerStep.config.targetId) {
                            navigate('/campaigns', { state: { openCampaignId: triggerStep.config.targetId } });
                        }
                    }}
                />
                <StatItem
                    label="Tỷ lệ lỗi"
                    value={errorRate + '%'}
                    icon={AlertOctagon}
                    color="bg-rose-500"
                />
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                <div className="lg:col-span-2 space-y-8">

                    {/* JOURNEY VISUALIZATION */}
                    <Card className="rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white" noPadding>
                        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-50 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/30 gap-3">
                            <div>
                                <h3 className="text-xs md:text-sm font-black text-slate-800">Hành trình Khách hàng</h3>
                                <p className="text-[9px] md:text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">Cumulative Flow Analytics</p>
                            </div>
                            <button
                                onClick={() => fetchInactiveUsers()}
                                className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                                <UserMinus className="w-3.5 h-3.5 text-slate-400" />
                                KHÔNG TƯƠNG TÁC
                            </button>
                        </div>

                        <div className="p-4 md:p-8">
                            {funnelData.length > 0 ? (
                                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                                    {funnelData.map((item, idx) => {
                                        const Icon = item.style.icon;
                                        return (
                                            <div key={idx} className="relative group">
                                                {/* Timeline Connector Dot */}
                                                <div className={`absolute -left-[21px] md:-left-[33px] top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white shadow-sm z-10 flex items-center justify-center ${item.users > 0 ? 'bg-[#ffa900]' : 'bg-slate-200'}`}>
                                                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full"></div>
                                                </div>

                                                {/* Step Card */}
                                                <div
                                                    onClick={() => item.type !== 'wait' && handleStepClick(item.id, item.type)}
                                                    className={`flex flex-col border rounded-xl md:rounded-[20px] transition-all duration-300 group 
                                                        ${item.type === 'wait' ? 'p-2 md:p-3 border-dashed bg-slate-100/50 opacity-90' : 'bg-white p-3 md:p-4 cursor-pointer'} 
                                                        ${(selectedStepId === item.id || (selectedStatus === 'completed' && item.type === 'completed'))
                                                            ? 'border-[#ffa900] shadow-lg ring-1 ring-[#ffa900]/20'
                                                            : (item.type === 'wait' ? 'border-slate-200' : 'border-slate-100 hover:shadow-lg hover:border-slate-200')
                                                        }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">

                                                        <div className="flex items-center flex-1 min-w-0 gap-3 md:gap-4">
                                                            <div className={`${item.type === 'wait' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'} rounded-lg md:rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${item.style.gradient} text-white shrink-0`}>
                                                                <Icon className={`${item.type === 'wait' ? 'w-4 h-4 md:w-5 md:h-5' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                                                                    <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${item.style.bg} ${item.style.text}`}>
                                                                        {item.stepNumberLabel}: {item.style.label}
                                                                    </span>
                                                                    {item.waiting > 0 && (
                                                                        <span className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md animate-pulse">
                                                                            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-amber-600"></div>
                                                                            Chờ: {item.waiting}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className={`${item.type === 'wait' ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm'} font-bold text-slate-800 truncate`} title={item.label}>{item.label}</h4>
                                                            </div>
                                                        </div>

                                                        {/* BOTTLENECK INDICATORS */}
                                                        {item.isTrulyStuck && (
                                                            <BottleneckBadge
                                                                type="time"
                                                                value="Stuck > 24h"
                                                                tooltip="Cảnh báo: Khách hàng đang bị nghẽn tại bước này quá 24h so với thời gian xử lý dự kiến. Bỏ qua cảnh báo này nếu logic của bạn là đúng."
                                                            />
                                                        )}
                                                        {item.dropOffRate > 0.7 && (
                                                            <BottleneckBadge
                                                                type="drop"
                                                                value={`Drop-off ${Math.round(item.dropOffRate * 100)}%`}
                                                                tooltip="Cảnh báo: Tỷ lệ thoát/dừng tại bước này cao (>70%). Bạn nên tối ưu nội dung hoặc điều kiện lọc."
                                                            />
                                                        )}

                                                        {/* Right: Stats */}
                                                        <div className="flex items-center shrink-0 justify-between sm:justify-end gap-4 md:gap-8 text-right">
                                                            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 items-end sm:items-center">
                                                                {item.type === 'completed' ? (
                                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
                                                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                                                        <span className="text-[11px] md:text-xs font-bold text-emerald-600">{(item as any).users?.toLocaleString() || 0} Hoàn thành</span>
                                                                    </div>
                                                                ) : item.type !== 'wait' ? (
                                                                    <>
                                                                        <div className="flex items-center gap-1.5" title="Đang ở đây (Waiting)">
                                                                            <div 
                                                                                onClick={(e) => { e.stopPropagation(); handleStepClick(item.id, item.type, 'waiting'); }}
                                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50/70 border border-amber-200/40 shadow-sm transition-colors hover:bg-amber-500 hover:border-amber-500 group/pill cursor-pointer"
                                                                            >
                                                                                <Clock size={12} className="text-amber-500 group-hover/pill:text-white" />
                                                                                <span className="text-[11px] md:text-xs font-semibold text-amber-600 group-hover/pill:text-white transition-colors">
                                                                                    {(item as any).waiting?.toLocaleString() || 0} <span className="font-medium text-amber-500 group-hover/pill:text-white hidden xl:inline transition-colors">Chờ</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5" title="Đã đi qua (Processed)">
                                                                            <div 
                                                                                onClick={(e) => { e.stopPropagation(); handleStepClick(item.id, item.type, 'all_touched'); }}
                                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50/70 border border-emerald-200/40 shadow-sm transition-colors hover:bg-emerald-500 hover:border-emerald-500 group/pill2 cursor-pointer"
                                                                            >
                                                                                <FastForward size={12} className="text-emerald-500 group-hover/pill2:text-white transition-colors" />
                                                                                <span className="text-[11px] md:text-xs font-semibold text-emerald-600 group-hover/pill2:text-white transition-colors">
                                                                                    {(item as any).processedHere?.toLocaleString() || 0} <span className="font-medium text-emerald-500 group-hover/pill2:text-white hidden xl:inline transition-colors">Qua</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                ) : null}
                                                            </div>

                                                            {/* Contextual Metric based on Type */}
                                                            <div className="w-16 md:w-20">
                                                                {item.type === 'action' && (
                                                                    <>
                                                                        <div className="flex justify-end items-center gap-1 mb-1">
                                                                            <MailOpen className="w-3 h-3 text-slate-400" />
                                                                            <span className="text-[10px] font-bold text-slate-500">Unique Open</span>
                                                                        </div>
                                                                        <div className="text-sm font-black text-[#ffa900]">{item.rate}%</div>
                                                                    </>
                                                                )}
                                                                {item.type === 'condition' && (
                                                                    <>
                                                                        <div className="flex justify-end items-center gap-1 mb-1">
                                                                            <span className="text-[10px] font-bold text-slate-500">Wait: {item.config.waitDuration}{item.config.waitUnit === 'days' ? 'd' : (item.config.waitUnit === 'hours' ? 'h' : 'm')}</span>
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-indigo-600">{item.detailStat || '--'}</div>
                                                                    </>
                                                                )}
                                                                {item.type === 'split_test' && (
                                                                    <>
                                                                        <div className="flex justify-end items-center gap-1 mb-1">
                                                                            <span className="text-[10px] font-bold text-slate-500">Split</span>
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-violet-600">{item.detailStat || '--'}</div>
                                                                    </>
                                                                )}
                                                                {item.type === 'advanced_condition' && (
                                                                    <>
                                                                        <div className="flex justify-end items-center gap-1 mb-1">
                                                                            <span className="text-[10px] font-bold text-slate-500">Results</span>
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-indigo-600 truncate max-w-[120px]" title={item.detailStat}>
                                                                            {item.detailStat || '--'}
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {item.type === 'wait' && (
                                                                    <div className="flex flex-col items-end opacity-60">
                                                                        <Clock className="w-4 h-4 text-slate-300 mb-1" />
                                                                        <span className="text-[10px] font-bold text-slate-400">Delay</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Error and Unsubscribe Badges */}
                                                    {item.type === 'action' && item.id !== 'virtual_completed' && (
                                                        (() => {
                                                            const failed = (currentFlow.steps.find(s => s.id === item.id) as any)?.stats?.failed || 0;
                                                            const unsubscribed = (currentFlow.steps.find(s => s.id === item.id) as any)?.stats?.unsubscribed || 0;

                                                            if (failed === 0 && unsubscribed === 0) {
                                                                return (
                                                                    <div className="flex items-center gap-1.5 mt-2 ml-16 text-[10px] font-bold text-emerald-600 opacity-60">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>Hoạt động tốt</span>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="flex items-center gap-2 mt-2 ml-16">
                                                                    {failed > 0 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                fetchStepErrors(item.id, item.label);
                                                                            }}
                                                                            className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors"
                                                                        >
                                                                            <AlertOctagon className="w-3 h-3" />
                                                                            Lỗi ({failed})
                                                                        </button>
                                                                    )}
                                                                    {unsubscribed > 0 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                fetchStepUnsubscribes(item.id, item.label);
                                                                            }}
                                                                            className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors"
                                                                        >
                                                                            <UserMinus className="w-3 h-3" />
                                                                            Hủy ({unsubscribed})
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                </div>

                                                {/* Branch Switching UI */}
                                                {item.hasBranches && (
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex bg-white rounded-full shadow-md border border-slate-100 p-0.5 transition-all z-20">
                                                        {item.type === 'advanced_condition' ? (
                                                            <div className="flex items-center gap-1 px-2">
                                                                {(item.config.branches || []).map((b: any, i: number) => (
                                                                    <button
                                                                        key={b.id || i}
                                                                        onClick={(e) => { e.stopPropagation(); setActiveBranches(prev => ({ ...prev, [item.id]: b.id })); }}
                                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors whitespace-nowrap ${item.activeBranch === b.id || (!item.activeBranch && i === 0 && item.activeBranch !== 'fallback') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`}
                                                                    >
                                                                        {b.label || `Branch ${i + 1}`}
                                                                    </button>
                                                                ))}
                                                                {/* Fallback Branch Button */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveBranches(prev => ({ ...prev, [item.id]: 'fallback' })); }}
                                                                    className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors whitespace-nowrap ${item.activeBranch === 'fallback' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-indigo-600'}`}
                                                                >
                                                                    Mặc định (Fallback)
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveBranches(prev => ({ ...prev, [item.id]: item.type === 'split_test' ? 'A' : 'yes' })); }}
                                                                    className={`px-4 min-w-[50px] py-1 text-[10px] font-bold rounded-full transition-all flex items-center justify-center ${item.activeBranch === 'yes' || item.activeBranch === 'A' || (!item.activeBranch) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`}
                                                                >
                                                                    {item.type === 'split_test' ? 'Path A' : 'IF'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveBranches(prev => ({ ...prev, [item.id]: item.type === 'split_test' ? 'B' : 'no' })); }}
                                                                    className={`px-4 min-w-[50px] py-1 text-[10px] font-bold rounded-full transition-all flex items-center justify-center ${item.activeBranch === 'no' || item.activeBranch === 'B' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`}
                                                                >
                                                                    {item.type === 'split_test' ? 'Path B' : 'ELSE'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-20 opacity-40">
                                    <Activity className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Chưa có dữ liệu vận hành</p>
                                </div>
                            )}
                        </div>
                    </Card >


                </div >

                <div className="space-y-6">
                    <Card className="rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 bg-white overflow-hidden h-full flex flex-col" title="Live Events" noPadding>
                        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Activity className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nhật ký</span>

                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group/search">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm email..."
                                            value={logSearchTerm}
                                            onChange={(e) => setLogSearchTerm(e.target.value)}
                                            className="pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] w-28 focus:w-44 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all outline-none"
                                        />
                                    </div>
                                    <button onClick={() => { fetchLogs(1, true, debouncedLogSearch); refreshFlow(); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-all">
                                        <RefreshCcw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[600px] p-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {loadingLogs ? (
                                <div className="space-y-3 p-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <Skeleton variant="rounded" width={24} height={24} className="shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between">
                                                    <Skeleton variant="text" width="40%" height={10} />
                                                    <Skeleton variant="text" width="20%" height={10} />
                                                </div>
                                                <Skeleton variant="text" width="90%" height={14} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 opacity-40">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <History className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Chưa có sự kiện nào</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {groupedLogs.map((group) => {
                                        return (
                                            <div key={group.id} className="relative">
                                                <LogItem
                                                    log={group.main}
                                                    isGroupItem={false}
                                                    hasSubs={group.subs.length > 0}
                                                    isExpanded={group.isExpanded}
                                                    onToggle={() => toggleGroup(group.id)}
                                                    subCount={group.subs.length}
                                                />
                                                {group.isExpanded && group.subs.length > 0 && (
                                                    <div className="animate-in slide-in-from-top-1 duration-200">
                                                        {group.subs.map((sub: any, subIndex: number) => (
                                                            <LogItem key={subIndex} log={sub} isGroupItem={true} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Pagination UI */}
                        {logs.length > 0 && logPagination.totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="text-[9px] text-slate-500 font-bold">
                                        Trang {logPagination.page} / {logPagination.totalPages} • Tổng {logPagination.total} sự kiện
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => fetchLogs(logPagination.page - 1, true, debouncedLogSearch)}
                                            disabled={logPagination.page <= 1 || loadingLogs}
                                            className="px-3 py-1.5 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                                        >
                                            <ChevronDown className="w-3 h-3 rotate-90" />
                                            Trước
                                        </button>
                                        <button
                                            onClick={() => fetchLogs(logPagination.page + 1, true, debouncedLogSearch)}
                                            disabled={logPagination.page >= logPagination.totalPages || loadingLogs}
                                            className="px-3 py-1.5 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                                        >
                                            Sau
                                            <ChevronDown className="w-3 h-3 -rotate-90" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div >

            {/* Error Modal */}
            <StepErrorModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                stepLabel={errorModal.stepLabel}
                stepId={errorModal.stepId}
                flowId={currentFlow.id}
                users={errorModal.users}
                availableSteps={currentFlow.steps}
                exitConditions={currentFlow.config?.exitConditions || []}
                onResolved={async () => {
                    await refreshFlow();
                    // Refresh the error list too
                    fetchStepErrors(errorModal.stepId, errorModal.stepLabel);
                }}
                onExport={() => showToast('Đã xuất danh sách lỗi')}
            />

            {/* Unsubscribe Modal */}
            <StepUnsubscribeModal
                isOpen={unsubscribeModal.isOpen}
                onClose={() => setUnsubscribeModal({ ...unsubscribeModal, isOpen: false })}
                stepLabel={unsubscribeModal.stepLabel}
                stepId={unsubscribeModal.stepId}
                users={unsubscribeModal.users}
                onExport={() => showToast('Đã xuất danh sách Hủy đăng ký')}
            />

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
            />

            {/* Step Participants Modal */}
            <StepParticipantsModal
                isOpen={isParticipantsModalOpen}
                onClose={() => {
                    setIsParticipantsModalOpen(false);
                }}
                title={selectedStatus === 'completed' ? 'Danh sách Hoàn thành' : `Danh sách tại: ${selectedStepId ? getStepName(selectedStepId) : '...'}`}
                participants={modalParticipants}
                loading={loadingList}
                pagination={pagination}
                onPageChange={(page) => {
                    let typeParam: string | null = null;
                    let statusParam: string | null = selectedStatus;
                    if (!selectedStatus && selectedStepId) {
                        if (modalTab === 'opened') typeParam = 'opens';
                        else if (modalTab === 'failed') typeParam = 'failed_email';
                        else if (modalTab === 'unsubscribed') typeParam = 'unsubscribe';
                        else if (modalTab === 'waiting') statusParam = 'waiting';
                        else if (modalTab === 'all_touched') statusParam = 'all_touched';
                        else if (modalTab === 'clicks') typeParam = 'clicks';
                        // ZNS Tabs
                        else if (modalTab === 'zns_sent') typeParam = 'zns_sent';
                        else if (modalTab === 'zns_clicked') typeParam = 'click_zns'; // Backend logs 'click_zns'
                        else if (modalTab === 'zns_replied') typeParam = 'reply_zns'; // Backend logs 'reply_zns'
                        else if (modalTab === 'zns_failed') typeParam = 'zns_failed';
                    }
                    fetchParticipants(page, selectedStepId, statusParam, searchTerm, typeParam);
                }}
                onRefresh={() => {
                    let typeParam: string | null = null;
                    let statusParam: string | null = selectedStatus;
                    if (!selectedStatus && selectedStepId) {
                        if (modalTab === 'opened') typeParam = 'opens';
                        else if (modalTab === 'failed') typeParam = 'failed_email';
                        else if (modalTab === 'unsubscribed') typeParam = 'unsubscribe';
                        else if (modalTab === 'waiting') statusParam = 'waiting';
                        else if (modalTab === 'all_touched') statusParam = 'all_touched';
                        else if (modalTab === 'clicks') typeParam = 'clicks';
                        // ZNS Tabs
                        else if (modalTab === 'zns_sent') typeParam = 'zns_sent';
                        else if (modalTab === 'zns_clicked') typeParam = 'click_zns';
                        else if (modalTab === 'zns_replied') typeParam = 'reply_zns';
                        else if (modalTab === 'zns_failed') typeParam = 'zns_failed';
                    }
                    fetchParticipants(pagination.page, selectedStepId, statusParam, searchTerm, typeParam);
                    refreshFlow(); // Update global stats (Total Users, Enrolled, etc.)
                }}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                getStepName={getStepName}
                activeTab={modalTab}
                onTabChange={setModalTab}
                stepType={selectedStatus === 'completed' ? 'completed' : (selectedStepType || undefined)}
                stepConfig={currentFlow.steps.find((s: any) => s.id === selectedStepId)?.config}
                flowId={currentFlow.id}
                stepId={selectedStepId || undefined}
                stepData={currentFlow.steps.find((s: any) => s.id === selectedStepId)}
                onActionComplete={refreshFlow}
            />

            {/* Inactive Users Modal */}
            <StepParticipantsModal
                isOpen={isInactiveModalOpen}
                onClose={() => setIsInactiveModalOpen(false)}
                title="Không tương tác (Inactive)"
                participants={inactiveUsers}
                loading={loadingInactive}
                pagination={inactivePagination}
                onPageChange={(page) => fetchInactiveUsers(page)}
                onRefresh={() => fetchInactiveUsers(inactivePagination.page)}
                searchTerm=""
                onSearchChange={() => { }}
                getStepName={getStepName}
                activeTab="inactive" // Custom type
                onTabChange={() => { }}
                stepType="inactive" // Custom type
                flowId={currentFlow.id}
                onActionComplete={refreshFlow}
            />

            <FlowSimulateModal
                isOpen={isSimulateModalOpen}
                onClose={() => setIsSimulateModalOpen(false)}
                flow={currentFlow}
            />

        </div >
    );
});

// --- SUB-COMPONENT: LOG ITEM ---
const LogItem: React.FC<{
    log: any;
    isGroupItem?: boolean;
    hasSubs?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
    subCount?: number;
}> = ({ log, isGroupItem = false, hasSubs = false, isExpanded = false, onToggle, subCount = 0 }) => {
    const type = log.type || '';
    let icon = <Activity className="w-3.5 h-3.5" />;
    let colorClass = 'text-slate-500 bg-slate-50 border-slate-100';

    if (type.includes('email') || type.includes('sent')) {
        icon = <MailOpen className="w-3.5 h-3.5" />;
        colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
    }
    if (type.includes('open')) {
        icon = <MailOpen className="w-3.5 h-3.5" />;
        colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
    }
    if (type.includes('click')) {
        icon = <MousePointerClick className="w-3.5 h-3.5" />;
        colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
    if (type.includes('fail') || type.includes('error')) {
        icon = <AlertOctagon className="w-3.5 h-3.5" />;
        colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
    }
    if (type === 'enter_flow') {
        icon = <Play className="w-3.5 h-3.5 ml-0.5" />;
        colorClass = 'text-indigo-600 bg-indigo-50 border-indigo-100';
    }
    if (type === 'unsubscribe') {
        icon = <UserMinus className="w-3.5 h-3.5" />;
        colorClass = 'text-orange-600 bg-orange-50 border-orange-100';
    }
    if (type === 'frequency_cap_reached') {
        icon = <Clock className="w-3.5 h-3.5" />;
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
    }

    return (
        <div className={`group px-3 py-3 hover:bg-slate-50 transition-all cursor-default border-b border-slate-50/50 ${isGroupItem ? 'bg-slate-50/40 ml-4 border-l border-slate-200' : ''}`}>
            <div className="flex items-center gap-2.5">
                {/* Minimal Icon Box */}
                <div className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center border shadow-none transition-transform group-hover:scale-105 ${colorClass.replace('bg-', 'bg-opacity-10 ')}`}>
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-2.5 h-2.5 opacity-80" })}
                </div>

                {/* Main Content Area: Email and Action Type */}
                <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        {!isGroupItem && (
                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[140px]" title={log.email}>
                                {log.email}
                            </span>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-tight ${colorClass.split(' ')[0]} opacity-60 whitespace-nowrap`}>
                            {type.replace(/_/g, ' ')}
                        </span>
                        {log.details && (
                            <span className="text-[9px] text-slate-400 truncate opacity-0 group-hover:opacity-100 transition-opacity max-w-[120px]" title={log.details}>
                                {log.details.replace('Clicked link:', 'Click:')}
                            </span>
                        )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {!isGroupItem && hasSubs && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {subCount}
                                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono tabular-nums opacity-60 group-hover:opacity-100 transition-opacity w-[45px] text-right">
                            {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowAnalyticsTab;

