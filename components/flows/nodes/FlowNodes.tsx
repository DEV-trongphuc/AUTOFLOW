
import { EXTERNAL_ASSET_BASE } from '@/utils/config';
import React, { memo } from 'react';
import { Zap, Mail, Clock, GitMerge, Tag, Link as LinkIcon, Edit3, AlertOctagon, AlertTriangle, Beaker, Hourglass, MousePointer2, MailOpen, MoreHorizontal, MessageSquare, UserMinus, Filter, Calendar, FileInput, Users, CheckCircle2, Send, Plus, Minus, Trash2, List, ListPlus, ShoppingCart, Layers, Cake, Snowflake, ArrowRight, Paperclip } from 'lucide-react';
import { FlowStep, Flow, FormDefinition } from '../../../types';

interface NodeProps {
    step: FlowStep;
    isGhost?: boolean;
    isDraggable?: boolean;
    isDragTarget?: boolean;
    isViewMode?: boolean;
    hasError?: boolean;
    hasWarning?: boolean;
    allFlows?: Flow[];
    allForms?: FormDefinition[];
    onClick?: () => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnter?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isReportMode?: boolean;
    reportStats?: { total: number, waiting: number, processed: number, failed?: number } | null;
}

const QuickEdit = ({ onClick }: { onClick: () => void }) => (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1.5 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-sm text-slate-400 hover:text-amber-600 hover:shadow-md transform hover:scale-110 transition-all">
            <MoreHorizontal className="w-4 h-4" />
        </button>
    </div>
);

const ValidationBadge = ({ type, title }: { type: 'error' | 'warning', title?: string }) => (
    <div title={title} className={`absolute -top-2.5 -right-2.5 p-1.5 rounded-full shadow-xl z-[60] animate-bounce ring-4 ring-white ${type === 'error' ? 'bg-rose-600 text-white' : 'bg-amber-400 text-white'
        }`}>
        {type === 'error'
            ? <AlertOctagon className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />
        }
    </div>
);

export const GhostNode = memo(({ label }: { label: string }) => (
    <div className="px-5 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 border-dashed text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-in fade-in zoom-in duration-500">
        {label}
    </div>
));

const ReportOverlay = ({ stats }: { stats: { total: number, waiting: number, processed: number, failed?: number } }) => (
    <div className="absolute -bottom-[2px] left-[15%] right-[15%] translate-y-full flex items-center justify-center bg-white px-4 py-2 rounded-b-xl border-x border-b border-slate-100 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.12)] z-[100] animate-in slide-in-from-top-1 duration-300">
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
                <Users className="w-3 h-3 text-emerald-500 mb-1" />
                <span className="text-[11px] font-black text-slate-800 leading-none">{stats.total.toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-slate-50"></div>
            <div className="flex flex-col items-center">
                <Clock className="w-3 h-3 text-amber-600 mb-1" />
                <span className="text-[11px] font-black text-slate-800 leading-none">{stats.waiting.toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-slate-50"></div>
            <div className="flex flex-col items-center">
                <AlertOctagon className="w-3 h-3 text-rose-500 mb-1" />
                <span className="text-[11px] font-black text-slate-800 leading-none">{(stats.failed ?? 0).toLocaleString()}</span>
            </div>
        </div>
    </div>
);


export const TriggerNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, allForms = [], isReportMode, reportStats }) => {
    const hasFilter = !!step.config.filterSegmentId;
    const triggerType = step.config.type || 'segment';

    // Kiá»ƒm tra xem Form cÃ³ bá»‹ xÃ³a khÃ´ng
    const isFormDeleted = triggerType === 'form' && step.config.targetId && !allForms.find(f => f.id === step.config.targetId);

    const getTriggerStyle = () => {
        if (isFormDeleted) return { icon: AlertOctagon, color: 'from-rose-500 to-red-700', label: 'Lá»–I LIÃŠN Káº¾T' };

        switch (triggerType) {
            case 'segment': return (step.config.targetSubtype === 'list' || step.config.targetSubtype === 'sync') ? { icon: ListPlus, color: 'from-emerald-500 to-teal-600', label: 'List Entry' } : { icon: Layers, color: 'from-amber-400 to-amber-600', label: 'Segment Entry' };
            case 'form': return { icon: FileInput, color: 'from-amber-400 to-amber-600', label: 'Form Submit' };
            case 'purchase': return { icon: ShoppingCart, color: 'from-pink-500 to-rose-600', label: 'Purchase Event' };
            case 'custom_event': return { icon: Zap, color: 'from-violet-500 to-purple-600', label: 'Custom Event' };
            case 'tag': return { icon: Tag, color: 'from-emerald-500 to-teal-600', label: 'Tag Added' };
            case 'campaign': return { icon: Send, color: 'from-indigo-500 to-blue-600', label: 'Campaign Sent' };
            case 'date':
            case 'birthday': return { icon: Cake, color: 'from-pink-400 to-rose-500', label: 'Birthday / Date' };
            case 'colddown': return { icon: Snowflake, color: 'from-sky-400 to-blue-500', label: 'Cool-down Entry' };
            default: return { icon: Zap, color: 'from-amber-400 to-amber-600', label: 'Trigger' };
        }
    };

    const { icon: Icon, color, label } = getTriggerStyle();

    return (
        <div onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }} className={`flow-interactive relative z-20 group ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className={`
                flex items-center gap-3 bg-gradient-to-br ${color} text-white rounded-[24px] px-5 py-3.5 shadow-xl
                ${!isViewMode ? 'transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-2xl' : ''}
            `}>
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">{label}</p>
                    <p className="text-sm font-black leading-tight">{step.label}</p>
                    {hasFilter && <p className="text-[9px] opacity-75 flex items-center gap-1 mt-0.5"><Filter className="w-2.5 h-2.5" /> Filtered</p>}
                    {isFormDeleted && <p className="text-[9px] opacity-90 font-bold mt-0.5">Form Ä‘Ã£ bá»‹ xÃ³a</p>}
                </div>
            </div>
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
        </div>
    );
});

export const ActionNode: React.FC<NodeProps> = memo(({ step, hasError, hasWarning, onClick, isDraggable, isDragTarget, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, isViewMode, isReportMode, reportStats }) => {
    const isTag = step.type === 'update_tag';
    const tagAction = step.config.action || 'add';
    const tags = step.config.tags || [];

    const incomplete = isTag ? tags.length === 0 : (!step.config.subject || (!step.config.templateId && !step.config.customHtml));

    return (
        <div
            draggable={isDraggable && !isViewMode} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`
        flow-interactive relative w-[260px] p-5 rounded-[28px] bg-white z-20 group transition-all duration-300 border border-slate-100
        ${isDraggable && !isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragTarget ? 'scale-[1.04] !border-violet-400 ring-2 ring-violet-300 shadow-[0_0_20px_4px_rgba(139,92,246,0.25)]' : ''}
        ${isViewMode ? 'shadow-sm cursor-default' : (incomplete || hasError)
                    ? 'ring-2 ring-rose-200 shadow-[0_8px_30px_rgba(244,63,94,0.15)] hover:-translate-y-1.5 cursor-pointer'
                    : isTag
                        ? 'hover:ring-2 hover:ring-emerald-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)] hover:-translate-y-1.5 cursor-pointer'
                        : 'hover:ring-2 hover:ring-blue-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] hover:-translate-y-1.5 cursor-pointer'}
      `}
        >
            <div className="flex items-start gap-4">
                <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform 
                ${!isViewMode ? 'group-hover:scale-110 group-hover:rotate-3' : ''}
                ${isTag
                        ? (tagAction === 'remove' ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-200' : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-200')
                        : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-blue-200'}
           `}>
                    {isTag ? <Tag className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                </div>

                <div className="flex-1 overflow-hidden pt-0.5">
                    <div className="flex items-center justify-between mb-2">
                        <p className={`text-[9px] font-bold uppercase tracking-widest leading-none ${isTag ? (tagAction === 'remove' ? 'text-rose-600' : 'text-emerald-600') : 'text-blue-600'}`}>
                            {isTag ? (tagAction === 'remove' ? 'Remove Tag' : 'Add Tag') : 'Send Email'}
                        </p>
                        {!isTag && step.config.attachments?.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title={`${step.config.attachments.length} tá»‡p Ä‘Ã­nh kÃ¨m`}>
                                <Paperclip className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{step.config.attachments.length}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">{step.label}</p>

                    {isTag && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 3).map((t: string) => (
                                <span key={t} className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-0.5 ${tagAction === 'remove' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    {tagAction === 'remove' ? <Minus className="w-2 h-2" /> : <Plus className="w-2 h-2" />} {t}
                                </span>
                            ))}
                            {tags.length > 3 && <span className="text-[9px] text-slate-400 font-medium pt-0.5">+{tags.length - 3}</span>}
                        </div>
                    )}

                    {!isTag && (
                        <div className="space-y-1 mt-2">
                            <div className={`text-[10px] truncate px-2 py-1 rounded-lg border ${incomplete ? 'bg-rose-50 border-rose-100 text-rose-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 font-medium'}`}>
                                {step.config.subject || (isViewMode ? 'No Subject' : 'ChÆ°a cáº¥u hÃ¬nh')}
                            </div>
                            {!step.config.senderEmail && !isViewMode && (
                                <div className="text-[9px] text-slate-400 font-bold bg-slate-50/50 px-2 py-0.5 rounded border border-transparent w-fit">
                                    Email Máº·c Ä‘á»‹nh
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!isViewMode && (incomplete || hasError) && <ValidationBadge type="error" />}
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const RemoveNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, isDraggable, isDragTarget, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, isReportMode, reportStats }) => {
    const actionType = step.config.actionType || 'unsubscribe';
    const isDelete = actionType === 'delete_contact';

    const getActionLabel = () => {
        if (isDelete) return 'Delete Forever';
        return 'Unsubscribe';
    };

    return (
        <div
            draggable={isDraggable && !isViewMode} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`flow-interactive relative w-[240px] p-4 rounded-[24px] bg-white z-20 group transition-all border border-rose-100 shadow-[0_4px_15px_rgba(244,63,94,0.05)]
            ${isDragTarget ? 'scale-[1.04] !border-violet-400 ring-2 ring-violet-300 shadow-[0_0_20px_4px_rgba(139,92,246,0.25)]' : ''}
            ${isDraggable && !isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}
            ${isViewMode ? 'shadow-sm' : 'hover:border-rose-400 hover:shadow-[0_10px_30px_-5px_rgba(244,63,94,0.15)] hover:-translate-y-1 cursor-pointer'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isDelete ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white' : 'bg-rose-50 text-rose-600'}`}>
                    {isDelete ? <Trash2 className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                </div>
                <div>
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-none mb-1">
                        {getActionLabel()}
                    </p>
                    <p className="text-xs font-bold text-slate-800">{step.label}</p>
                </div>
            </div>
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const WaitNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, isDraggable, isDragTarget, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop }) => {
    const mode = step.config.mode || 'duration';
    let incomplete = false;

    if (mode === 'duration') {
        incomplete = !step.config.duration || !step.config.unit;
    }

    return (
        <div
            draggable={isDraggable && !isViewMode} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`flow-interactive relative z-20 group ${isViewMode ? 'cursor-default' : 'cursor-pointer'} ${isDraggable && !isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className={`
            relative flex items-center gap-4 bg-white border rounded-full pl-2 pr-8 py-2 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 w-fit min-w-[200px]
            ${incomplete ? 'border-rose-200 ring-4 ring-rose-50/50' : isDragTarget ? 'border-violet-400 ring-2 ring-violet-300 shadow-[0_0_20px_4px_rgba(139,92,246,0.25)] scale-[1.04]' : 'border-slate-100 hover:border-amber-400 hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.25)]'}
            ${!isViewMode ? 'hover:-translate-y-1' : ''}
       `}>
                <div className={`
                w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300
                ${!isViewMode ? 'group-hover:scale-105 group-hover:rotate-12' : ''}
                ${incomplete ? 'bg-rose-100 text-rose-600' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'}
          `}>
                    <Clock className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-[0.2em] leading-none mb-1.5">
                        {mode === 'until_attribute' ? 'Relative Wait' : 'Wait Delay'}
                    </span>
                    <span className={`text-sm font-bold truncate leading-none ${incomplete ? 'text-rose-600' : 'text-slate-900'}`}>
                        {incomplete ? (isViewMode ? 'Not configured' : 'ChÆ°a cáº¥u hÃ¬nh') : step.label}
                    </span>
                </div>
            </div>
            {!isViewMode && incomplete && <ValidationBadge type="error" />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const ConditionNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, hasWarning, isReportMode, reportStats }) => {
    const incomplete = !step.config.conditionType || step.config.waitDuration === undefined;
    const unitMap: any = { minutes: 'phÃºt', hours: 'giá»', days: 'ngÃ y', weeks: 'tuáº§n' };

    const getActionInfo = () => {
        switch (step.config.conditionType) {
            case 'opened': return { label: 'ÄÃ£ má»Ÿ Email?', icon: MailOpen };
            case 'clicked': return { label: 'ÄÃ£ click Link?', icon: MousePointer2 };
            case 'replied': return { label: 'ÄÃ£ pháº£n há»“i?', icon: MessageSquare };
            case 'unsubscribed': return { label: 'Há»§y Ä‘Äƒng kÃ½', icon: UserMinus };
            default: return { label: 'Äang theo dÃµi...', icon: Hourglass };
        }
    };

    const { label: actionText, icon: Icon } = getActionInfo();

    return (
        <div
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`flow-interactive relative z-20 group ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}
        >
            <div className={`
            flex flex-col bg-white border rounded-[28px] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 w-[240px]
            ${!isViewMode ? 'hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-5px_rgba(99,102,241,0.15)]' : ''}
            ${incomplete ? 'border-rose-200' : hasWarning ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-100 hover:border-indigo-200'}
       `}>
                <div className="p-1 bg-slate-50 border-b border-slate-100 flex gap-1">
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-400"></div>
                    <div className="h-1.5 flex-1 rounded-full bg-rose-400"></div>
                </div>
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <GitMerge className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">Logic</p>
                        </div>
                    </div>
                    <div className="mb-3">
                        <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{step.label}</p>
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{actionText}</span>
                        </div>
                    </div>
                    {!incomplete ? (
                        step.config.waitDuration === 0 ? (
                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Check vÃ  Ráº½ nhÃ¡nh tá»©c thÃ¬</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                <Hourglass className="w-3 h-3 text-amber-600" />
                                <span>Wait: {step.config.waitDuration} {unitMap[step.config.waitUnit] || 'giá»'}</span>
                            </div>
                        )
                    ) : (
                        <div className="text-[10px] text-rose-600 font-bold bg-rose-50 px-3 py-2 rounded-xl text-center border border-rose-100">
                            {isViewMode ? 'Not configured' : 'ChÆ°a cáº¥u hÃ¬nh'}
                        </div>
                    )}
                </div>
            </div>
            {!isViewMode && incomplete && <ValidationBadge type="error" title="Cáº¥u hÃ¬nh chÆ°a hoÃ n táº¥t" />}
            {!isViewMode && hasWarning && !incomplete && <ValidationBadge type="warning" title="Cáº¢NH BÃO: Cáº£ hai nhÃ¡nh Ä‘á»u dáº«n Ä‘áº¿n hÃ nh Ä‘á»™ng giá»‘ng há»‡t nhau." />}
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const SplitTestNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, hasWarning, isReportMode, reportStats }) => {
    const ratioA = step.config.ratioA || 50;
    const ratioB = step.config.ratioB || 50;

    return (
        <div
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`flow-interactive relative z-20 group ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}
        >
            <div className={`flex flex-col bg-white border border-slate-100 rounded-[28px] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] overflow-hidden transition-all w-[220px] 
            ${!isViewMode ? 'hover:border-violet-300 hover:shadow-[0_20px_40px_-5px_rgba(139,92,246,0.15)] hover:-translate-y-1.5' : ''}
            ${hasWarning ? 'border-amber-400 ring-4 ring-amber-100' : ''}
            `}>
                <div className="w-full h-1 bg-gradient-to-r from-violet-500 to-purple-400"></div>
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
                            <Beaker className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">A/B Test</p>
                            <p className="text-xs font-bold text-slate-800">Chia nhÃ³m</p>
                        </div>
                    </div>
                    <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3 ring-1 ring-slate-200">
                        <div className="absolute left-0 top-0 h-full bg-violet-500" style={{ width: `${ratioA}%` }}></div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10" style={{ left: `${ratioA}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-violet-600">
                            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                            A: {ratioA}%
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            B: {ratioB}%
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        </div>
                    </div>
                </div>
            </div>
            {!isViewMode && hasWarning && <ValidationBadge type="warning" title="Cáº¢NH BÃO: Cáº£ hai nhÃ¡nh A/B Ä‘á»u dáº«n Ä‘áº¿n hÃ nh Ä‘á»™ng giá»‘ng há»‡t nhau." />}
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const LinkNode: React.FC<NodeProps> = memo(({ step, onClick, hasError, isViewMode, isReportMode, reportStats }) => (
    <div
        onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
        className={`flow-interactive relative z-20 group ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}
    >
        <div className={`
            pl-2 pr-6 py-2 rounded-full border flex items-center gap-3 transition-all
            ${!isViewMode ? 'hover:scale-105' : ''}
            ${hasError
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-slate-800 border-slate-700 text-white shadow-xl shadow-slate-500/20'}
        `}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <LinkIcon className="w-4 h-4" />
            </div>
            <div>
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 block">Jump to</span>
                <span className="text-xs font-bold">{hasError ? 'Lá»—i liÃªn káº¿t' : 'Flow khÃ¡c'}</span>
            </div>
        </div>
        {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
        {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
    </div>
));

export const ListActionNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, isDraggable, isDragTarget, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, isReportMode, reportStats }) => {
    const action = step.config.action || 'add';

    return (
        <div
            draggable={isDraggable && !isViewMode} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`
                flow-interactive relative w-[260px] p-5 rounded-[28px] bg-white z-20 group transition-all duration-300 border border-slate-100
                ${isDragTarget ? 'scale-[1.04] !border-violet-400 ring-2 ring-violet-300 shadow-[0_0_20px_4px_rgba(139,92,246,0.25)]' : ''}
                ${isDraggable && !isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}
                ${isViewMode ? 'shadow-sm cursor-default' : 'hover:ring-2 hover:orange-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(249,115,22,0.15)] hover:-translate-y-1.5 cursor-pointer'}
            `}
        >
            <div className="flex items-start gap-4">
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform 
                    ${!isViewMode ? 'group-hover:scale-110 group-hover:rotate-3' : ''}
                    bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200
               `}>
                    <List className="w-5 h-5" />
                </div>

                <div className="flex-1 overflow-hidden pt-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-2 text-orange-600">
                        {action === 'add' ? 'Add to List' : 'Remove from List'}
                    </p>
                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">{step.label}</p>
                </div>
            </div>
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const ZaloZNSNode: React.FC<NodeProps> = memo(({ step, hasError, hasWarning, onClick, isDraggable, isDragTarget, onDragStart, onDragEnter, onDragOver, onDragLeave, onDrop, isViewMode, isReportMode, reportStats }) => {
    const incomplete = !step.config.zalo_oa_id || !step.config.template_id;

    return (
        <div
            draggable={isDraggable && !isViewMode} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }}
            className={`
                flow-interactive relative w-[260px] p-5 rounded-[28px] bg-white z-20 group transition-all duration-300 border border-slate-100
                ${isDragTarget ? 'scale-[1.04] !border-violet-400 ring-2 ring-violet-300 shadow-[0_0_20px_4px_rgba(139,92,246,0.25)]' : ''}
                ${isDraggable && !isViewMode ? 'cursor-grab active:cursor-grabbing' : ''}
                ${isViewMode ? 'shadow-sm cursor-default' : (incomplete || hasError)
                    ? 'ring-2 ring-rose-200 shadow-[0_8px_30px_rgba(244,63,94,0.15)] hover:-translate-y-1.5 cursor-pointer'
                    : hasWarning
                        ? 'ring-2 ring-amber-300 border-amber-400 shadow-[0_8px_30px_rgba(245,158,11,0.18)] hover:-translate-y-1.5 cursor-pointer'
                        : 'hover:ring-2 hover:ring-blue-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] hover:-translate-y-1.5 cursor-pointer'}
            `}
        >
            <div className="flex items-start gap-4">
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform 
                    ${!isViewMode ? 'group-hover:scale-110 group-hover:rotate-3' : ''}
                    bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-blue-200
                `}>
                    <img
                        src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`}
                        alt="Zalo"
                        className="w-6 h-6"
                    />
                </div>

                <div className="flex-1 overflow-hidden pt-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-2 text-blue-600">
                        Zalo Template
                    </p>
                    <p className="text-sm font-bold text-slate-800 truncate leading-tight">{step.label === 'BÆ°á»›c má»›i' ? 'Gá»­i tin ZNS' : step.label}</p>

                    <div className="space-y-1 mt-2">
                        <div className={`text-[10px] truncate px-2 py-1 rounded-lg border ${incomplete ? 'bg-rose-50 border-rose-100 text-rose-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 font-medium'}`}>
                            {step.config.template_id ? `Template: ${step.config.template_id}` : (isViewMode ? 'No Template' : 'ChÆ°a cáº¥u hÃ¬nh')}
                        </div>
                        {!incomplete && step.config.template_data?.title && (
                            <div className="text-[9px] text-slate-400 font-medium bg-slate-50/50 px-2 py-0.5 rounded border border-transparent truncate">
                                {step.config.template_data.title}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!isViewMode && (incomplete || hasError) && <ValidationBadge type="error" />}
            {!isViewMode && hasWarning && !(incomplete || hasError) && <ValidationBadge type="warning" title="Template ZNS cáº§n kiá»ƒm tra láº¡i" />}
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
            {!isViewMode && <QuickEdit onClick={onClick || (() => { })} />}
        </div>
    );
});

export const AdvancedConditionNode: React.FC<NodeProps> = memo(({ step, onClick, isViewMode, hasWarning, isReportMode, reportStats }) => {
    const branches = step.config.branches || [];

    return (
        <div onClick={(e) => { e.stopPropagation(); if (!isViewMode) onClick?.(); }} className={`relative group z-30 ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}>
            {!isViewMode && <QuickEdit onClick={() => onClick?.()} />}
            {hasWarning && <ValidationBadge type="warning" />}

            <div className={`
                flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-xl transition-all duration-300
                bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white ring-4 ring-white
                ${!isViewMode ? 'hover:scale-110 hover:-translate-y-1 hover:shadow-2xl hover:ring-violet-100' : ''}
            `}>
                <GitMerge className="w-8 h-8 rotate-90" />
            </div>

            <div className="absolute top-0 left-16 ml-3 w-40 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                <div className="bg-slate-800 text-white text-[10px] p-2 rounded-lg font-bold shadow-xl">
                    <p className="uppercase tracking-widest text-slate-400 mb-1">Advanced Split</p>
                    <p>{step.label}</p>
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        {branches.map((b: any, i: number) => (
                            <div key={i} className="flex justify-between text-[9px] text-slate-300">
                                <span>{b.label}</span>
                                <span className="text-violet-400">â†’</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>Default</span>
                            <span className="text-slate-500">â†’</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-black text-slate-600 shadow-sm border border-slate-100">
                    {step.label}
                </span>
            </div>
            {isReportMode && reportStats && <ReportOverlay stats={reportStats} />}
        </div>
    );
});

