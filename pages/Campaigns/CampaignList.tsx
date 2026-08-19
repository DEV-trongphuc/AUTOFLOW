import { EXTERNAL_ASSET_BASE } from '@/utils/config';
import React, { useState, useEffect } from 'react';
import {
    Send, CheckCircle2, CalendarClock, FileText, Loader2,
    GitMerge, Play, Trash2, ChevronRight, Clock, Calendar, PieChart, PauseCircle,
    Edit2, Check, X
} from 'lucide-react';
import { Campaign, CampaignStatus } from '../../types';
import Badge from '../../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';

interface CampaignListProps {
    campaigns: Campaign[];
    loading: boolean;
    onSelect: (campaign: Campaign) => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
    onPlayFlow: (campaign: Campaign) => void;
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onRename?: (id: string, newName: string) => Promise<boolean | void> | void;
}

interface CampaignRowProps {
    c: Campaign;
    onSelect: (campaign: Campaign) => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
    onPlayFlow: (campaign: Campaign) => void;
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onRename?: (id: string, newName: string) => Promise<boolean | void> | void;
    navigate: any;
    'data-index'?: number;
}

const CampaignTableRow = React.memo(React.forwardRef<HTMLTableRowElement, CampaignRowProps>(({ c, onSelect, onEdit, onDelete, onPlayFlow, onPause, onResume, onRename, navigate, 'data-index': dataIndex }, ref) => {
    const isSent = c.status === CampaignStatus.SENT;
    const isWaiting = c.status === CampaignStatus.WAITING_FLOW;
    const isSending = c.status === CampaignStatus.SENDING;
    // [FIX P7-C1] Paused = Circuit Breaker triggered — needs distinct orange badge, not neutral grey
    const isPaused = c.status === CampaignStatus.PAUSED;
    const sentCount = c.stats?.sent || 0;
    const linkedFlow = c.linkedFlow;
    const isFlow = !!linkedFlow;
    const showFlowStatus = isSent && linkedFlow;
    // [UI-R1] Campaign has pending reminders → orange clock instead of green sent badge
    const hasReminders = (c.reminderCount ?? (c.reminders?.length ?? 0)) > 0;
    const showReminderBadge = isSent && hasReminders;

    const openRate = sentCount > 0 ? Math.round(((c.stats?.opened || 0) / sentCount) * 100) : 0;

    // Inline Rename State
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(c.name);
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        setNameInput(c.name);
    }, [c.name]);

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNameInput(c.name);
        setIsEditingName(true);
    };

    const handleCancelEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNameInput(c.name);
        setIsEditingName(false);
    };

    const handleSaveEdit = async (e?: React.MouseEvent | React.FormEvent) => {
        e?.stopPropagation();
        const trimmed = nameInput.trim();
        if (!trimmed || trimmed === c.name) {
            setIsEditingName(false);
            return;
        }
        setIsSavingName(true);
        try {
            await onRename?.(c.id, trimmed);
            setIsEditingName(false);
        } catch (err) {
            console.error('Save campaign name error:', err);
        } finally {
            setIsSavingName(false);
        }
    };

    return (
        <tr
            ref={ref}
            data-index={dataIndex}
            className="hidden md:table-row group cursor-pointer"
            onClick={() => {
                if (isEditingName) return;
                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                    onEdit(c);
                } else {
                    onSelect(c);
                }
            }}
        >
            <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm border ${
                        c.type === 'zalo_zns' 
                            ? 'bg-white text-[#0068ff] border-[#0068ff]/20 shadow-[0_2px_8px_rgba(0,104,255,0.05)] p-2 group-hover:border-[#0068ff]/40' 
                            : (isFlow 
                                ? 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 shadow-[0_2px_8px_rgba(139,92,246,0.05)]' 
                                : (showReminderBadge 
                                    ? 'bg-orange-50 text-orange-500 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' 
                                    : (isSent 
                                        ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' 
                                        : (isWaiting 
                                            ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' 
                                            : (isSending 
                                                ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' 
                                                : (isPaused 
                                                    ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' 
                                                    : (c.status === CampaignStatus.SCHEDULED 
                                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' 
                                                        : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700/50'
                                                      )
                                                  )
                                              )
                                          )
                                      )
                                  )
                              )
                    }`}>
                        {c.type === 'zalo_zns' ? <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} alt="Zalo" className="w-full h-full object-contain" /> :
                            (isFlow ? (isSending ? <Loader2 className="w-5 h-5 animate-spin text-violet-600" /> : <GitMerge className="w-5 h-5 text-violet-600" />) :
                                (showReminderBadge ? <Clock className="w-5 h-5 text-orange-500" /> :
                                    (isSent ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> :
                                        (isWaiting ? <GitMerge className="w-5 h-5 text-amber-600" /> :
                                            (isSending ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> :
                                                (isPaused ? <PauseCircle className="w-5 h-5 text-orange-600" /> :
                                                    (c.status === CampaignStatus.SCHEDULED ? <CalendarClock className="w-5 h-5 text-indigo-600" /> : <FileText className="w-5 h-5" />)))))))}

                    </div>
                    <div className="min-w-0 flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-1.5 min-w-0 mb-1" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    autoFocus
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    disabled={isSavingName}
                                    className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 flex-1 min-w-[180px] shadow-sm"
                                    placeholder="Nhập tên chiến dịch..."
                                />
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingName}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-md transition-colors shrink-0"
                                    title="Lưu tên (Enter)"
                                >
                                    {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSavingName}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors shrink-0"
                                    title="Hủy (Esc)"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 group/name mb-1">
                                <p 
                                    className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight group-hover:text-amber-600 transition-colors truncate pr-1"
                                    title={c.name}
                                    onDoubleClick={handleStartEdit}
                                >
                                    {c.name}
                                </p>
                                <button
                                    onClick={handleStartEdit}
                                    className="opacity-0 group-hover:opacity-100 group-hover/name:opacity-100 p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-all shrink-0"
                                    title="Đổi tên chiến dịch (Double-click để sửa)"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            {/* Creator Avatar & Name */}
                            <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 px-1.5 py-0.5 rounded-full">
                                <img 
                                    src={(c.config as any)?.creator?.picture || "/imgs/ICON.png"} 
                                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0" 
                                    alt="" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = "/imgs/ICON.png"; }}
                                />
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold max-w-[80px] truncate">
                                    {(c.config as any)?.creator?.name || 'Hệ thống'}
                                </span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-700 font-normal text-[10px]">|</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[400px]">{c.subject || (c.type === 'zalo_zns' ? `Template: ${c.templateId}` : 'Bản nháp')}</span>
                        </div>
                    </div>
                </div>
            </td>

            <td className="px-6 py-5 text-center">
                {isWaiting ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-wide">
                        <GitMerge className="w-3 h-3" /> Waiting
                    </span>
                ) : isSending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-wide animate-pulse-subtle">
                        <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                    </span>
                ) : showFlowStatus ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (linkedFlow?.id) {
                                navigate('/flows', { state: { openFlowId: linkedFlow.id } });
                            }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-black uppercase tracking-wide hover:bg-violet-100 transition-all duration-500"
                    >
                        <GitMerge className="w-3 h-3" /> FLOW
                    </button>
                ) : isSent ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-wide">
                        <><CheckCircle2 className="w-3 h-3" /> Sent</>
                    </span>
                ) : isPaused ? (
                    // [FIX P7-C1] Dedicated orange badge for Circuit Breaker paused campaigns
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-black uppercase tracking-wide" title="Campaign bị tạm dừng bởi Circuit Breaker">
                        <PauseCircle className="w-3 h-3" /> PAUSED
                    </span>
                ) : c.status === CampaignStatus.SCHEDULED ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-black uppercase tracking-wide">
                        <Clock className="w-3 h-3" /> Scheduled
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase tracking-wide">
                        Draft
                    </span>
                )}
            </td>

            <td className="px-6 py-5">
                {isSent ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Send className="w-3.5 h-3.5 text-blue-500" />
                            {sentCount.toLocaleString()} <span translate="no" className="text-[10px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">{c.type === 'zalo_zns' ? 'Tin nhắn' : 'Emails'}</span>
                        </div>
                        {c.sentAt && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {new Date(c.sentAt).toLocaleDateString('vi-VN')}   {new Date(c.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                ) : isSending ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                            {sentCount.toLocaleString()} / {(c.totalTargetAudience || 0).toLocaleString()} <span translate="no" className="text-[10px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">{c.type === 'zalo_zns' ? 'Tin nhắn' : 'Emails'}</span>
                        </div>
                        {c.scheduledAt && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    Bắt đầu: {new Date(c.scheduledAt).toLocaleDateString('vi-VN')}   {new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString('vi-VN') : 'Chưa đặt lịch'}
                        </span>
                        {c.scheduledAt && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                {new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                )}
            </td>

            <td className="px-6 py-5">
                {(isSent || isSending) ? (
                    <div className="w-full min-w-[160px] max-w-[180px] space-y-2">
                        <div>
                            <div className="flex justify-between items-end mb-1 gap-2 flex-nowrap">
                                <span translate="no" className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
                                    {isSending ? 'Tiến độ' : (c.type === 'zalo_zns' ? 'Tổng tiền' : 'Hiệu suất Open')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-medium text-slate-400">
                                        {isSending
                                            ? `${sentCount.toLocaleString()} / ${(c.totalTargetAudience || 0).toLocaleString()}`
                                            : (c.type === 'zalo_zns' ? `${(sentCount * 300).toLocaleString()}đ` : `${(c.stats?.opened || 0).toLocaleString()}/${sentCount.toLocaleString()}`)
                                        }
                                    </span>
                                    {isSending && (
                                        <span className={`text-[9px] font-black ${isFlow ? 'text-violet-500' : 'text-blue-500'}`}>
                                            ({c.totalTargetAudience ? Math.round((sentCount / c.totalTargetAudience) * 100) : 0}%)
                                        </span>
                                    )}
                                    {!isSending && c.type !== 'zalo_zns' && <span className={`text-[9px] font-black ${openRate > 0 ? (isFlow ? 'text-violet-500' : 'text-blue-500') : 'text-slate-300'}`}>({openRate}%)</span>}
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div className={`h-full bg-gradient-to-r ${isFlow ? 'from-violet-500 to-purple-600 shadow-[0_0_10px_rgba(139,92,246,0.35)]' : (c.type === 'zalo_zns' ? 'from-blue-500 to-blue-700 shadow-[0_0_10px_rgba(0,104,255,0.2)]' : 'from-blue-500 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.35)]')} rounded-full transition-all duration-1000 relative overflow-hidden`} style={{ width: `${isSending ? (c.totalTargetAudience ? Math.min((sentCount / c.totalTargetAudience) * 100, 100) : 0) : (c.type === 'zalo_zns' ? 100 : Math.min(openRate, 100))}%` }}>
                                    {(isSending) && (
                                        <div className="absolute inset-0 animate-sending-shimmer"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Chưa có dữ liệu</span>
                )}
            </td>

            <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                    {isSending && onPause && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPause(c.id); }}
                            className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all shadow-sm flex items-center justify-center border border-rose-100"
                            title="Tạm dừng / Dừng gửi chiến dịch ngay"
                        >
                            <PauseCircle className="w-4 h-4" />
                        </button>
                    )}
                    {isPaused && onResume && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onResume(c.id); }}
                            className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 rounded-xl transition-all shadow-sm flex items-center justify-center border border-emerald-100"
                            title="Tiếp tục gửi chiến dịch"
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}
                    {isWaiting && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlayFlow(c); }}
                            disabled={c.linkedFlow?.status !== 'active'}
                            className={`p-2 rounded-xl transition-all shadow-sm border flex items-center justify-center ${c.linkedFlow?.status !== 'active'
                                ? 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
                                : 'text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-600 hover:shadow-md border-amber-100'
                                }`}
                            title={c.linkedFlow?.status !== 'active' ? `Flow "${c.linkedFlow?.name}" chưa Active` : "Khởi chạy ngay"}
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-500 flex items-center justify-center" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {!isWaiting && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                                    onEdit(c);
                                } else {
                                    onSelect(c);
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all duration-500"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}));

const CampaignMobileCard = React.memo<CampaignRowProps>(({ c, onSelect, onEdit, onDelete, onPlayFlow, onPause, onResume, onRename, navigate }) => {
    const isSent = c.status === CampaignStatus.SENT;
    const isWaiting = c.status === CampaignStatus.WAITING_FLOW;
    const isSending = c.status === CampaignStatus.SENDING;
    const isPaused = c.status === CampaignStatus.PAUSED;
    const sentCount = c.stats?.sent || 0;
    const linkedFlow = c.linkedFlow;
    const isFlow = !!linkedFlow;
    const showFlowStatus = isSent && linkedFlow;
    const hasReminders = (c.reminderCount ?? (c.reminders?.length ?? 0)) > 0;
    const showReminderBadge = isSent && hasReminders;

    const openRate = sentCount > 0 ? Math.round(((c.stats?.opened || 0) / sentCount) * 100) : 0;

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(c.name);
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        setNameInput(c.name);
    }, [c.name]);

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNameInput(c.name);
        setIsEditingName(true);
    };

    const handleCancelEdit = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setNameInput(c.name);
        setIsEditingName(false);
    };

    const handleSaveEdit = async (e?: React.MouseEvent | React.FormEvent) => {
        e?.stopPropagation();
        const trimmed = nameInput.trim();
        if (!trimmed || trimmed === c.name) {
            setIsEditingName(false);
            return;
        }
        setIsSavingName(true);
        try {
            await onRename?.(c.id, trimmed);
            setIsEditingName(false);
        } catch (err) {
            console.error('Save mobile campaign name error:', err);
        } finally {
            setIsSavingName(false);
        }
    };

    return (
        <div
            className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all hover-lift"
            onClick={() => {
                if (isEditingName) return;
                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                    onEdit(c);
                } else {
                    onSelect(c);
                }
            }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${c.type === 'zalo_zns' ? 'bg-white p-1.5 border-[#0068ff]/20' : (isFlow ? 'bg-violet-50 text-violet-600 border-violet-100 shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'bg-slate-50 border-slate-100')}`}>
                        {c.type === 'zalo_zns' ? <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} alt="Zalo" className="w-full h-full object-contain" /> :
                            (isFlow ? (isSending ? <Loader2 className="w-4 h-4 animate-spin text-violet-600" /> : <GitMerge className="w-4 h-4 text-violet-600" />) :
                                (showReminderBadge ? <Clock className="w-4 h-4 text-orange-500" /> :
                                    (isSent ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> :
                                        (isWaiting ? <GitMerge className="w-4 h-4 text-amber-600" /> :
                                            (isSending ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> :
                                                (c.status === CampaignStatus.SCHEDULED ? <CalendarClock className="w-4 h-4 text-indigo-600" /> : <FileText className="w-4 h-4 text-slate-400" />))))))}
                    </div>
                    <div className="min-w-0 flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    autoFocus
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    disabled={isSavingName}
                                    className="px-2 py-0.5 text-xs font-bold bg-white border border-amber-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 flex-1 min-w-0"
                                    placeholder="Tên chiến dịch..."
                                />
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingName}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Lưu"
                                >
                                    {isSavingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSavingName}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    title="Hủy"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 group/mname">
                                <p 
                                    className="font-bold text-slate-800 text-[13px] leading-tight truncate"
                                    onDoubleClick={handleStartEdit}
                                >
                                    {c.name}
                                </p>
                                <button
                                    onClick={handleStartEdit}
                                    className="p-0.5 text-slate-400 hover:text-amber-600 rounded shrink-0"
                                    title="Đổi tên"
                                >
                                    <Edit2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-1.5 py-0.5 rounded-full">
                                <img 
                                    src={(c.config as any)?.creator?.picture || "/imgs/ICON.png"} 
                                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0" 
                                    alt="" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = "/imgs/ICON.png"; }}
                                />
                                <span className="text-[8px] text-slate-500 font-bold max-w-[60px] truncate">
                                    {(c.config as any)?.creator?.name || 'Hệ thống'}
                                </span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-700 font-normal text-[9px]">|</span>
                            <span className="text-[9px] text-slate-500 font-medium truncate max-w-[120px]">{c.subject || (c.type === 'zalo_zns' ? `Template: ${c.templateId}` : 'Bản nháp')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    {isSending && onPause && (
                        <button 
                            onClick={() => onPause(c.id)} 
                            className="p-1 px-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black uppercase"
                            title="Tạm dừng"
                        >
                            <PauseCircle className="w-3.5 h-3.5" /> Dừng
                        </button>
                    )}
                    {isPaused && onResume && (
                        <button 
                            onClick={() => onResume(c.id)} 
                            className="p-1 px-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black uppercase"
                            title="Tiếp tục"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" /> Tiếp tục
                        </button>
                    )}
                    <button onClick={() => onDelete(c.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</p>
                    <div className="flex">
                        {isWaiting ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-black uppercase tracking-wide">
                                WAITING
                            </span>
                        ) : isSending ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase tracking-wide animate-pulse-subtle">
                                SENDING
                            </span>
                        ) : showFlowStatus ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 text-[8px] font-black uppercase tracking-wide">
                                FLOW
                            </span>
                        ) : showReminderBadge ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-[8px] font-black uppercase tracking-wide">
                                <Clock className="w-2.5 h-2.5" /> +Reminder
                            </span>
                        ) : isSent ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase tracking-wide">
                                SENT
                            </span>
                        ) : isPaused ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[8px] font-black uppercase tracking-wide">
                                <PauseCircle className="w-2.5 h-2.5" /> PAUSED
                            </span>
                        ) : c.status === CampaignStatus.SCHEDULED ? (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8px] font-black uppercase tracking-wide">
                                SCHEDULED
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-black uppercase tracking-wide">
                                DRAFT
                            </span>
                        )}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lịch trình</p>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-700">
                            {isSent ? (
                                c.sentAt ? `${new Date(c.sentAt).toLocaleDateString('vi-VN')} ${new Date(c.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đã gửi'
                            ) : isSending ? (
                                c.scheduledAt ? `${new Date(c.scheduledAt).toLocaleDateString('vi-VN')} ${new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đang gửi...'
                            ) : c.scheduledAt ? (
                                `${new Date(c.scheduledAt).toLocaleDateString('vi-VN')} ${new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                            ) : (
                                'Chưa đặt lịch'
                            )}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                            {isSent ? (
                                `${sentCount.toLocaleString()} ${c.type === 'zalo_zns' ? 'tin' : 'emails'}`
                            ) : isSending ? (
                                `${sentCount.toLocaleString()} / ${(c.totalTargetAudience || 0).toLocaleString()} ${c.type === 'zalo_zns' ? 'tin' : 'emails'}`
                            ) : (
                                ''
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {(isSent || isSending) && (
                <div className="pt-2 border-t border-slate-50 space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="font-bold text-slate-400 uppercase">
                            {isSending ? 'Tiến độ gửi' : (c.type === 'zalo_zns' ? 'Chi phí' : 'Hiệu suất Open')}
                        </span>
                        <div className="flex items-center gap-1 font-bold">
                            <span className="text-slate-600">
                                {isSending
                                    ? `${sentCount.toLocaleString()} / ${(c.totalTargetAudience || 0).toLocaleString()}`
                                    : (c.type === 'zalo_zns' ? `${(sentCount * 300).toLocaleString()}đ` : `${(c.stats?.opened || 0).toLocaleString()}/${sentCount.toLocaleString()}`)
                                }
                            </span>
                        </div>
                        <span translate="no" className={`text-[9px] font-black whitespace-nowrap ${isFlow ? 'text-violet-500' : 'text-blue-500'}`}>
                            {isSending
                                ? `${c.totalTargetAudience ? Math.round((sentCount / c.totalTargetAudience) * 100) : 0}% Tiến độ`
                                : `${openRate}% ${c.type === 'zalo_zns' ? '' : 'Open'}`
                            }
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                        <div
                            className={`h-full bg-gradient-to-r ${isFlow ? 'from-violet-500 to-purple-600 shadow-[0_0_8px_rgba(139,92,246,0.3)]' : (c.type === 'zalo_zns' ? 'from-blue-500 to-blue-700 shadow-[0_0_8px_rgba(0,104,255,0.2)]' : 'from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.3)]')} transition-all relative overflow-hidden`}
                            style={{ width: `${isSending ? (c.totalTargetAudience ? Math.min((sentCount / c.totalTargetAudience) * 100, 100) : 0) : (c.type === 'zalo_zns' ? 100 : Math.min(openRate, 100))}%` }}
                        >
                            {(isSending) && (
                                <div className="absolute inset-0 animate-sending-shimmer"></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

const CampaignSkeleton = () => (
    <tr className="hidden md:table-row">
        <td className="px-8 py-5">
            <div className="flex items-center gap-4">
                <Skeleton variant="rounded" width={44} height={44} className="rounded-2xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                </div>
            </div>
        </td>
        <td className="px-6 py-5"><div className="flex justify-center"><Skeleton variant="rounded" width={80} height={24} /></div></td>
        <td className="px-6 py-5"><Skeleton variant="text" width="80%" /></td>
        <td className="px-6 py-5">
            <div className="space-y-2">
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="rectangular" height={4} className="rounded-full mt-1" />
            </div>
        </td>
        <td className="px-8 py-5 text-right"><Skeleton variant="circular" width={32} height={32} className="ml-auto" /></td>
    </tr>
);

const CampaignMobileSkeleton = () => (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4 shadow-sm">
        <div className="flex items-center gap-4">
            <Skeleton variant="rounded" width={44} height={44} className="rounded-2xl" />
            <div className="space-y-2 flex-1">
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="40%" />
            </div>
        </div>
        <div className="flex gap-2">
            <Skeleton variant="rounded" width={60} height={20} />
            <Skeleton variant="rounded" width={100} height={20} />
        </div>
    </div>
);

const CampaignList: React.FC<CampaignListProps> = ({ campaigns, loading, onSelect, onEdit, onDelete, onPlayFlow, onPause, onResume, onRename }) => {
    const navigate = useNavigate();

    const handleSelect = React.useCallback((c: Campaign) => onSelect(c), [onSelect]);
    const handleEdit = React.useCallback((c: Campaign) => onEdit(c), [onEdit]);
    const handleDelete = React.useCallback((id: string) => onDelete(id), [onDelete]);
    const handlePlayFlow = React.useCallback((c: Campaign) => onPlayFlow(c), [onPlayFlow]);
    const handlePause = React.useCallback((id: string) => onPause?.(id), [onPause]);
    const handleResume = React.useCallback((id: string) => onResume?.(id), [onResume]);
    const handleRename = React.useCallback((id: string, newName: string) => onRename?.(id, newName), [onRename]);

    const parentRef = React.useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: campaigns.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 84, // Approximate row height
        overscan: 5,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="min-h-[300px]">
            <style>{`
                @keyframes progressBarStripes {
                    0% { background-position: 1rem 0; }
                    100% { background-position: 0 0; }
                }
                .animate-sending-shimmer {
                    background-image: linear-gradient(
                        45deg, 
                        rgba(255, 255, 255, 0.25) 25%, 
                        transparent 25%, 
                        transparent 50%, 
                        rgba(255, 255, 255, 0.25) 50%, 
                        rgba(255, 255, 255, 0.25) 75%, 
                        transparent 75%, 
                        transparent
                    );
                    background-size: 1rem 1rem;
                    animation: progressBarStripes 1s linear infinite;
                }
                
                /* Floating Card Row Table styling */
                .campaign-table {
                    border-collapse: separate !important;
                    border-spacing: 0 10px !important;
                    width: 100%;
                }
                .campaign-table tbody tr {
                    background: transparent !important;
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .campaign-table tbody td {
                    background-color: #ffffff !important;
                    border-top: 1px solid rgba(229, 229, 234, 0.5) !important;
                    border-bottom: 1px solid rgba(229, 229, 234, 0.5) !important;
                    transition: all 0.25s ease !important;
                }
                .dark .campaign-table tbody td {
                    background-color: #111827 !important;
                    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                }
                .campaign-table tbody td:first-child {
                    border-left: 1px solid rgba(229, 229, 234, 0.5) !important;
                    border-top-left-radius: 16px !important;
                    border-bottom-left-radius: 16px !important;
                }
                .dark .campaign-table tbody td:first-child {
                    border-left: 1px solid rgba(255, 255, 255, 0.05) !important;
                }
                .campaign-table tbody td:last-child {
                    border-right: 1px solid rgba(229, 229, 234, 0.5) !important;
                    border-top-right-radius: 16px !important;
                    border-bottom-right-radius: 16px !important;
                }
                .dark .campaign-table tbody td:last-child {
                    border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                }
                
                /* Hover state styling */
                .campaign-table tbody tr:hover {
                    transform: translateY(-2px);
                }
                .campaign-table tbody tr:hover td {
                    border-color: rgba(104, 61, 242, 0.15) !important;
                }
                .dark .campaign-table tbody tr:hover td {
                    border-color: rgba(139, 92, 246, 0.2) !important;
                }
            `}</style>
            {/* Desktop Table View */}
            <div ref={parentRef} className="hidden md:block overflow-x-auto overflow-y-auto max-h-[580px] px-2">
                <table className="campaign-table relative">
                    <thead className="text-left sticky top-0 z-20 bg-[#F6F6FA] dark:bg-[#0b0f19]">
                        <tr className="border-none">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 w-[35%]">Chiến dịch</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%]">Trạng thái</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Lịch trình</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Hiệu quả</th>
                            <th className="px-8 py-5 text-right w-[10%]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <CampaignSkeleton key={i} />)
                        ) : (
                            <>
                                {virtualItems.length > 0 && <tr style={{ height: virtualItems[0].start }} />}
                                {virtualItems.map((virtualRow) => {
                                    const c = campaigns[virtualRow.index];
                                    return (
                                        <CampaignTableRow
                                            key={c.id}
                                            c={c}
                                            onSelect={handleSelect}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onPlayFlow={handlePlayFlow}
                                            onPause={handlePause}
                                            onResume={handleResume}
                                            onRename={handleRename}
                                            navigate={navigate}
                                            ref={rowVirtualizer.measureElement}
                                            data-index={virtualRow.index}
                                        />
                                    );
                                })}
                                {virtualItems.length > 0 && <tr style={{ height: rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end }} />}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards Container */}
            <div className="md:hidden flex flex-col gap-4 p-4 min-h-[200px] bg-slate-50/30">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <CampaignMobileSkeleton key={i} />)
                ) : (
                    campaigns.map(c => (
                        <CampaignMobileCard
                            key={c.id}
                            c={c}
                            onSelect={handleSelect}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onPlayFlow={handlePlayFlow}
                            onPause={handlePause}
                            onResume={handleResume}
                            onRename={handleRename}
                            navigate={navigate}
                        />
                    ))
                )}
            </div>

            {!loading && campaigns.length === 0 && (
                <EmptyState
                    icon={PieChart}
                    title="Chưa có chiến dịch nào"
                    description="Bắt đầu hành trình Marketing của bạn bằng cách tạo chiến dịch gửi Email hoặc ZNS đầu tiên ngay hôm nay."
                    ctaLabel="Tạo chiến dịch mới"
                    onCtaClick={() => {
                        const btn = document.querySelector('button[icon="plus"]') as HTMLButtonElement;
                        if (btn) btn.click();
                        else window.location.hash = '#new';
                    }}
                />
            )}
        </div>
    );
};

export default React.memo(CampaignList);
