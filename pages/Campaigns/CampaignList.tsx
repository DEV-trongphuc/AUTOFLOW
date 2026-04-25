import { EXTERNAL_ASSET_BASE } from '@/utils/config';
import React from 'react';
import {
    Send, CheckCircle2, CalendarClock, FileText, Loader2,
    GitMerge, Play, Trash2, ChevronRight, Clock, Calendar, PieChart, PauseCircle
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
}

interface CampaignRowProps {
    c: Campaign;
    onSelect: (campaign: Campaign) => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
    onPlayFlow: (campaign: Campaign) => void;
    navigate: any;
    'data-index'?: number;
}

const CampaignTableRow = React.memo(React.forwardRef<HTMLTableRowElement, CampaignRowProps>(({ c, onSelect, onEdit, onDelete, onPlayFlow, navigate, 'data-index': dataIndex }, ref) => {
    const isSent = c.status === CampaignStatus.SENT;
    const isWaiting = c.status === CampaignStatus.WAITING_FLOW;
    const isSending = c.status === CampaignStatus.SENDING;
    // [FIX P7-C1] Paused = Circuit Breaker triggered — needs distinct orange badge, not neutral grey
    const isPaused = c.status === CampaignStatus.PAUSED;
    const sentCount = c.stats?.sent || 0;
    const linkedFlow = c.linkedFlow;
    const showFlowStatus = isSent && linkedFlow;
    // [UI-R1] Campaign has pending reminders → orange clock instead of green sent badge
    const hasReminders = (c.reminderCount ?? (c.reminders?.length ?? 0)) > 0;
    const showReminderBadge = isSent && hasReminders;

    const openRate = sentCount > 0 ? Math.round(((c.stats?.opened || 0) / sentCount) * 100) : 0;

    return (
        <tr
            ref={ref}
            data-index={dataIndex}
            className="hidden md:table-row group hover:bg-slate-50/80 transition-all duration-500 cursor-pointer hover-lift"
            onClick={() => {
                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                    onEdit(c);
                } else {
                    onSelect(c);
                }
            }}
        >
            <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm border ${c.type === 'zalo_zns' ? 'bg-white text-[#0068ff] border-[#0068ff]/20 shadow-[0_0_15px_rgba(0,104,255,0.1)] p-2 group-hover:border-[#0068ff]/40 group-hover:shadow-[0_0_20px_rgba(0,104,255,0.15)]' :
                        (showFlowStatus ? 'bg-violet-50 text-violet-600 border-violet-100' :
                            (showReminderBadge ? 'bg-orange-50 text-orange-500 border-orange-100' :
                                (isSent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    (isWaiting ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        (isSending ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            (isPaused ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                (c.status === CampaignStatus.SCHEDULED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100')))))))
                        }`}>
                        {c.type === 'zalo_zns' ? <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} alt="Zalo" className="w-full h-full object-contain" /> :
                            (showFlowStatus ? <GitMerge className="w-5 h-5" /> :
                                (showReminderBadge ? <Clock className="w-5 h-5" /> :
                                    (isSent ? <CheckCircle2 className="w-5 h-5" /> :
                                        (isWaiting ? <GitMerge className="w-5 h-5" /> :
                                            (isSending ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                                (isPaused ? <PauseCircle className="w-5 h-5" /> :
                                                    (c.status === CampaignStatus.SCHEDULED ? <CalendarClock className="w-5 h-5" /> : <FileText className="w-5 h-5" />)))))))}

                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-tight mb-1 group-hover:text-amber-600 transition-colors truncate pr-4">{c.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs">{c.subject || (c.type === 'zalo_zns' ? `Template: ${c.templateId}` : '')}</p>
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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wide">
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
                                        <span className="text-[9px] font-black text-blue-500">
                                            ({c.totalTargetAudience ? Math.round((sentCount / c.totalTargetAudience) * 100) : 0}%)
                                        </span>
                                    )}
                                    {!isSending && c.type !== 'zalo_zns' && <span className={`text-[9px] font-black ${openRate > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>({openRate}%)</span>}
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${isSending ? 'from-blue-400 to-blue-600 animate-pulse' : (c.type === 'zalo_zns' ? 'from-blue-500 to-blue-700 shadow-[0_0_10px_rgba(0,104,255,0.2)]' : 'from-emerald-400 to-emerald-600')} rounded-full transition-all duration-1000`} style={{ width: `${isSending ? (c.totalTargetAudience ? Math.min((sentCount / c.totalTargetAudience) * 100, 100) : 0) : (c.type === 'zalo_zns' ? 100 : Math.min(openRate, 100))}%` }}></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Chưa có dữ liệu</span>
                )}
            </td>

            <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                    {isWaiting && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlayFlow(c); }}
                            disabled={c.linkedFlow?.status !== 'active'}
                            className={`p-2 rounded-xl transition-all shadow-sm border ${c.linkedFlow?.status !== 'active'
                                ? 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
                                : 'text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-600 hover:shadow-md border-amber-100'
                                }`}
                            title={c.linkedFlow?.status !== 'active' ? `Flow "${c.linkedFlow?.name}" chưa Active` : "Khởi chạy ngay"}
                        >
                            <Play className="w-4 h-4 fill-current" />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-500" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {!isWaiting && (
                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                                onEdit(c);
                            } else {
                                onSelect(c);
                            }
                        }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all duration-500">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}));

const CampaignMobileCard = React.memo<CampaignRowProps>(({ c, onSelect, onEdit, onDelete, onPlayFlow, navigate }) => {
    const isSent = c.status === CampaignStatus.SENT;
    const isWaiting = c.status === CampaignStatus.WAITING_FLOW;
    const isSending = c.status === CampaignStatus.SENDING;
    // [FIX P7-C1] Mobile card: also needs dedicated paused state
    const isPaused = c.status === CampaignStatus.PAUSED;
    const sentCount = c.stats?.sent || 0;
    const linkedFlow = c.linkedFlow;
    const showFlowStatus = isSent && linkedFlow;
    // [UI-R1] Reminder badge for mobile
    const hasReminders = (c.reminderCount ?? (c.reminders?.length ?? 0)) > 0;
    const showReminderBadge = isSent && hasReminders;

    const openRate = sentCount > 0 ? Math.round(((c.stats?.opened || 0) / sentCount) * 100) : 0;

    return (
        <div
            className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all hover-lift"
            onClick={() => {
                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                    onEdit(c);
                } else {
                    onSelect(c);
                }
            }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${c.type === 'zalo_zns' ? 'bg-white p-1.5 border-[#0068ff]/20' : 'bg-slate-50 border-slate-100'}`}>
                        {c.type === 'zalo_zns' ? <img src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`} alt="Zalo" className="w-full h-full object-contain" /> :
                            (showFlowStatus ? <GitMerge className="w-4 h-4 text-violet-600" /> :
                                (showReminderBadge ? <Clock className="w-4 h-4 text-orange-500" /> :
                                    (isSent ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                                        (isWaiting ? <GitMerge className="w-4 h-4 text-amber-600" /> :
                                            (isSending ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> :
                                                (c.status === CampaignStatus.SCHEDULED ? <CalendarClock className="w-4 h-4 text-indigo-600" /> : <FileText className="w-4 h-4 text-slate-400" />))))))}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[13px] leading-tight truncate">{c.name}</p>
                        <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">{c.subject || (c.type === 'zalo_zns' ? `Template: ${c.templateId}` : 'Bản nháp')}</p>
                    </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => onDelete(c.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1">
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</p>
                    <div className="flex">
                        {isWaiting ? (
                            <Badge variant="warning" className="text-[8px] px-1.5 py-0.5">WAITING</Badge>
                        ) : isSending ? (
                            <Badge variant="info" className="text-[8px] px-1.5 py-0.5 animate-pulse-subtle">SENDING</Badge>
                        ) : showReminderBadge ? (
                            // [UI-R1] Mobile sent+reminder badge
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-[8px] font-black uppercase tracking-wide">
                                <Clock className="w-2.5 h-2.5" /> +Reminder
                            </span>
                        ) : isSent ? (
                            <Badge variant="success" className="text-[8px] px-1.5 py-0.5">SENT</Badge>
                        ) : isPaused ? (
                            // [FIX P7-C1] Mobile paused badge — orange to match desktop
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[8px] font-black uppercase tracking-wide">
                                <PauseCircle className="w-2.5 h-2.5" /> PAUSED
                            </span>
                        ) : (
                            <Badge variant="neutral" className="text-[8px] px-1.5 py-0.5">{(c.status || 'DRAFT').toUpperCase()}</Badge>
                        )}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lịch trình</p>
                    <p className="text-[9px] font-bold text-slate-700 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-300" />
                        {isSent && c.sentAt ? new Date(c.sentAt).toLocaleDateString('vi-VN') : (c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString('vi-VN') : '---')}
                    </p>
                </div>
            </div>

            {(isSent || isSending) && (
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                            <Send className="w-3 h-3 text-blue-500 shrink-0" />
                            <span translate="no" className="text-[9px] font-black text-slate-700 whitespace-nowrap">
                                {isSending
                                    ? `${sentCount.toLocaleString()} / ${(c.totalTargetAudience || 0).toLocaleString()} ${c.type === 'zalo_zns' ? 'ZNS' : 'Emails'}`
                                    : `${sentCount.toLocaleString()} ${c.type === 'zalo_zns' ? 'ZNS' : 'Emails'}`
                                }
                            </span>
                        </div>
                        <span translate="no" className={`text-[9px] font-black whitespace-nowrap ${isSending ? 'text-blue-500' : 'text-emerald-600'}`}>
                            {isSending
                                ? `${c.totalTargetAudience ? Math.round((sentCount / c.totalTargetAudience) * 100) : 0}% Tiến độ`
                                : `${openRate}% ${c.type === 'zalo_zns' ? '' : 'Open'}`
                            }
                        </span>
                    </div>
                    <div className="h-1 w-full bg-white rounded-full overflow-hidden border border-slate-200">
                        <div className={`h-full bg-gradient-to-r ${isSending ? 'from-blue-400 to-blue-600 animate-pulse' : (c.type === 'zalo_zns' ? 'from-blue-500 to-blue-700' : 'from-emerald-400 to-emerald-600')} transition-all`} style={{ width: `${isSending ? (c.totalTargetAudience ? Math.min((sentCount / c.totalTargetAudience) * 100, 100) : 0) : (c.type === 'zalo_zns' ? 100 : Math.min(openRate, 100))}%` }}></div>
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

const CampaignList: React.FC<CampaignListProps> = ({ campaigns, loading, onSelect, onEdit, onDelete, onPlayFlow }) => {
    const navigate = useNavigate();

    const handleSelect = React.useCallback((c: Campaign) => onSelect(c), [onSelect]);
    const handleEdit = React.useCallback((c: Campaign) => onEdit(c), [onEdit]);
    const handleDelete = React.useCallback((id: string) => onDelete(id), [onDelete]);
    const handlePlayFlow = React.useCallback((c: Campaign) => onPlayFlow(c), [onPlayFlow]);

    const parentRef = React.useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: campaigns.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 84, // Approximate row height
        overscan: 5,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    return (
        <div className="min-h-[400px]">
            {/* Desktop Table View */}
            <div ref={parentRef} className="hidden md:block overflow-x-auto overflow-y-auto max-h-[600px]">
                <table className="w-full relative">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-left sticky top-0 z-20 backdrop-blur-sm">
                        <tr>
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
