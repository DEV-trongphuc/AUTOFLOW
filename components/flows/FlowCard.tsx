
import React from 'react';
import { GitMerge, Trash2, RotateCcw, Copy, Send, PlayCircle, PauseCircle, Users, Eye, Snowflake, Cake, Crown, Zap, Layers, AlertCircle, FileInput, Tag, ShoppingCart, Link, CheckCircle, ListPlus, BellRing } from 'lucide-react';
import { Flow, Campaign, FormDefinition, PurchaseEvent, CustomEvent, Segment } from '../../types';

interface FlowCardProps {
    flow: Flow;
    linkedCampaign?: Campaign;
    linkedForm?: FormDefinition;
    linkedPurchaseEvent?: PurchaseEvent;
    linkedCustomEvent?: CustomEvent;
    onClick: () => void;
    onDelete: (permanent?: boolean) => void;
    onDuplicate?: (flow: Flow) => void;
    onRestore?: () => void;
    onOpenCampaign?: (campaign: Campaign) => void;
    onOpenForm?: (form: FormDefinition) => void;
    onOpenPurchase?: (event: PurchaseEvent) => void;

    onOpenCustomEvent?: (event: CustomEvent) => void;
    onOpenList?: (list: any) => void;
    onOpenSegment?: (segment: Segment) => void;
    onOpenTag?: (tag: string) => void;
    linkedSegment?: Segment;
    linkedList?: any;
    linkedTag?: string;
}


const FlowCard = React.memo<FlowCardProps>(({
    flow, linkedCampaign, linkedForm, linkedPurchaseEvent, linkedCustomEvent, linkedSegment, linkedList, linkedTag,
    onClick, onDelete, onDuplicate, onRestore,
    onOpenCampaign, onOpenForm, onOpenList, onOpenSegment, onOpenTag, onOpenPurchase, onOpenCustomEvent
}) => {
    const isArchived = flow.status === 'archived';
    const isActive = flow.status === 'active';
    const enrolled = flow.stats.enrolled || 0;

    const completionRate = enrolled > 0
        ? Math.round(((flow.stats.completed || 0) / enrolled) * 100)
        : 0;

    const stepCount = flow.steps?.length || 0;
    const trigger = flow.steps?.find(s => s.type === 'trigger');
    const triggerConfig = trigger?.config || {};
    const triggerType = triggerConfig.type || 'segment';

    const theme = React.useMemo(() => {
        if (isArchived) return {
            icon: GitMerge,
            accent: 'slate' as const,
            gradientMain: 'from-slate-100 to-slate-200 text-slate-500 dark:text-slate-400',
            label: 'Đã xóa'
        };

        if (triggerType === 'date' && triggerConfig.dateField === 'lastActivity') {
            return {
                icon: Snowflake,
                accent: 'blue' as const,
                gradientMain: 'from-blue-500 to-indigo-600',
                label: `Ngủ đông > ${triggerConfig.inactiveAmount || 30} ngày`
            };
        }

        if (triggerType === 'date' && triggerConfig.dateField === 'dateOfBirth') {
            return {
                icon: Cake,
                accent: 'pink' as const,
                gradientMain: 'from-pink-400 to-rose-500',
                label: 'Sinh nhật'
            };
        }

        if (triggerType === 'form') {
            let formName = linkedForm ? linkedForm.name : (triggerConfig.targetId ? `Form ${triggerConfig.targetId.substring(0, 6)}...` : 'Form không xác định');
            let accent = 'amber';
            let gradient = 'from-amber-400 to-orange-500';

            if (!linkedForm && triggerConfig.targetId) {
                accent = 'rose';
                gradient = 'from-rose-400 to-red-500';
                formName = `Form đã xóa [${triggerConfig.targetId.substring(0, 6)}]`;
            }

            return {
                icon: FileInput,
                accent: accent as any,
                gradientMain: gradient,
                label: formName,
                isLink: !!linkedForm,
                onLinkClick: () => linkedForm && onOpenForm?.(linkedForm)
            };
        }

        if (triggerType === 'purchase') {
            let label = linkedPurchaseEvent ? linkedPurchaseEvent.name : 'Sự kiện mua hàng';
            let accent = 'pink';
            let gradient = 'from-pink-400 to-rose-500';

            if (!linkedPurchaseEvent && triggerConfig.targetId) {
                label = `Event Mua [${triggerConfig.targetId.substring(0, 6)}] đã xóa`;
                accent = 'rose';
                gradient = 'from-rose-400 to-red-500';
            }

            return {
                icon: ShoppingCart,
                accent: accent as any,
                gradientMain: gradient,
                label: label,
                isLink: !!linkedPurchaseEvent,
                onLinkClick: () => linkedPurchaseEvent && onOpenPurchase?.(linkedPurchaseEvent)
            };
        }

        if (triggerType === 'custom_event') {
            let label = linkedCustomEvent ? linkedCustomEvent.name : 'Sự kiện tùy chỉnh';
            let accent = 'violet';
            let gradient = 'from-violet-500 to-indigo-600';

            if (!linkedCustomEvent && triggerConfig.targetId) {
                label = `Event [${triggerConfig.targetId.substring(0, 6)}] đã xóa`;
                accent = 'rose';
                gradient = 'from-rose-400 to-red-500';
            }

            return {
                icon: Zap,
                accent: accent as any,
                gradientMain: gradient,
                label: label,
                isLink: !!linkedCustomEvent,
                onLinkClick: () => linkedCustomEvent && onOpenCustomEvent?.(linkedCustomEvent)
            };
        }

        if (triggerType === 'campaign') {
            const campaignName = linkedCampaign ? linkedCampaign.name : (triggerConfig.targetId ? 'Chiến dịch đã xóa' : 'Chưa chọn chiến dịch');
            return {
                icon: Send,
                accent: 'violet' as const,
                gradientMain: 'from-violet-500 to-purple-600',
                label: campaignName,
                isLink: !!linkedCampaign,
                onLinkClick: () => linkedCampaign && onOpenCampaign?.(linkedCampaign)
            };
        }

        if (triggerType === 'tag') {
            return {
                icon: Tag,
                accent: 'emerald' as const,
                gradientMain: 'from-emerald-500 to-teal-600',
                label: triggerConfig.targetId ? `Tag: ${triggerConfig.targetId}` : 'Khi gắn nhãn',
                isLink: !!triggerConfig.targetId,
                onLinkClick: () => triggerConfig.targetId && onOpenTag?.(triggerConfig.targetId)
            };
        }

        if (triggerType === 'date' && triggerConfig.dateField === 'custom_field_date') {
            const fieldKey = triggerConfig.customFieldKey || 'custom field';
            const offsetType = triggerConfig.offsetType || 'on';
            const offsetValue = triggerConfig.offsetValue ?? 0;
            const offsetLabel = offsetType === 'before'
                ? `${offsetValue} ngày trước [${fieldKey}]`
                : offsetType === 'after'
                    ? `${offsetValue} ngày sau [${fieldKey}]`
                    : `Đúng ngày [${fieldKey}]`;
            return {
                icon: BellRing,
                accent: 'violet' as const,
                gradientMain: 'from-violet-500 to-purple-700',
                label: offsetLabel
            };
        }

        if (triggerType === 'segment') {
            const isListSubtype = triggerConfig.targetSubtype === 'list';

            if (isListSubtype) {
                const label = linkedList ? `Danh sách: ${linkedList.name}` : (linkedList === undefined && triggerConfig.targetId ? `List ID: ${triggerConfig.targetId}` : 'Chưa chọn danh sách');
                return {
                    icon: ListPlus,
                    accent: 'emerald' as const,
                    gradientMain: 'from-emerald-600 to-teal-700',
                    label: label,
                    isLink: !!linkedList,
                    onLinkClick: () => linkedList && onOpenList?.(linkedList)
                };
            }

            const label = linkedSegment ? `Phân khúc: ${linkedSegment.name}` : (triggerConfig.targetId ? `Segment ID: ${triggerConfig.targetId}` : 'Chưa chọn phân khúc');
            return {
                icon: Layers,
                accent: 'amber' as const,
                gradientMain: 'from-amber-400 to-orange-500',
                label: label,
                isLink: !!linkedSegment,
                onLinkClick: () => linkedSegment && onOpenSegment?.(linkedSegment)
            };
        }

        return {
            icon: Layers,
            accent: 'amber' as const,
            gradientMain: 'from-amber-400 to-orange-500',
            label: 'Dựa trên phân khúc'
        };
    }, [isArchived, triggerType, triggerConfig, linkedForm, linkedPurchaseEvent, linkedCustomEvent, linkedCampaign, linkedList, linkedSegment, onOpenForm, onOpenCampaign, onOpenTag, onOpenList, onOpenSegment, onOpenPurchase, onOpenCustomEvent]);

    const Icon = theme.icon;

    const StatusPill = () => {
        if (isArchived) return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-700/60">Archived</span>;
        if (isActive) return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-100"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" /> Active</span>;
        if (flow.status === 'draft') return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wide border border-blue-100">Draft</span>;
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-700/60">Paused</span>;
    };

    return (
        <div
            onClick={onClick}
            className={`
        group relative bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-700/60 transition-all duration-500 h-full flex flex-col cursor-pointer overflow-hidden hover-lift
        ${isArchived ? 'opacity-60 grayscale' : 'hover:border-transparent hover:shadow-xl'}
      `}
        >
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradientMain} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="p-4 flex-1 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br ${theme.gradientMain}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <StatusPill />
                </div>

                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {flow.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {!(theme as any).isLink && <span className={`w-1.5 h-1.5 rounded-full bg-${theme.accent}-500`}></span>}
                        {(theme as any).isLink ? (
                            <div onClick={(e) => { e.stopPropagation(); (theme as any).onLinkClick?.(); }} className={`flex items-center gap-1.5 text-${theme.accent}-700 bg-${theme.accent}-50 hover:bg-${theme.accent}-100 px-2.5 py-1 -ml-1 rounded-lg transition-all cursor-pointer group/link z-20 relative font-bold`}>
                                <Link className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{theme.label}</span>
                            </div>
                        ) : (
                            <span className="truncate max-w-[220px]">{theme.label}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 pb-4 pt-1 relative z-10">
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-col items-center justify-center py-1.5 px-1 group/stat">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Layers className="w-3 h-3 text-slate-400 group-hover/stat:text-slate-600 dark:text-slate-300 transition-colors" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Steps</span>
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{stepCount}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1.5 px-1 border-l border-slate-200 dark:border-slate-700/60/50 group/stat">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <Users className="w-3 h-3 text-blue-400 group-hover/stat:text-blue-600 transition-colors" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Users</span>
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{enrolled.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-1.5 px-1 border-l border-slate-200 dark:border-slate-700/60/50 group/stat">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <CheckCircle className="w-3 h-3 text-emerald-400 group-hover/stat:text-emerald-600 transition-colors" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complete</span>
                        </div>
                        <span className={`text-xs font-black ${completionRate > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{completionRate}%</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 z-20">
                {isArchived ? (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onRestore?.(); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 text-emerald-600 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 hover:bg-emerald-50 transition-colors" title="Khôi phục">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(true); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 text-rose-600 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 hover:bg-rose-50 transition-colors" title="Xóa vĩnh viễn">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(flow); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 text-blue-600 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 hover:bg-blue-50 transition-colors" title="Nhân bản">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(false); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 text-rose-600 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 hover:bg-rose-50 rounded-xl transition-all" title="Thùng rác">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div >
    );
});


export default FlowCard;
