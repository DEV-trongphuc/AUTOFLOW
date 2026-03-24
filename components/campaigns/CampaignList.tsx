
import React from 'react';
import { Send, MoreVertical, CheckCircle2, CalendarClock, FileText, Loader2, BarChart2, GitMerge, Mail, Calendar, Play, Copy, Trash2, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { Campaign, CampaignStatus } from '../../types';
import Badge from '../../components/common/Badge';

interface CampaignListProps {
    campaigns: Campaign[];
    loading: boolean;
    onSelect: (campaign: Campaign) => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
    onPlayFlow: (campaign: Campaign) => void;
}

const CampaignList: React.FC<CampaignListProps> = ({ campaigns, loading, onSelect, onEdit, onDelete, onPlayFlow }) => {
    if (loading) return (
        <div className="p-32 text-center animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin text-[#ffa900] mx-auto mb-4" />
            <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Đang đồng bộ dữ liệu...</p>
        </div>
    );

    return (
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 w-[35%]">Chiến dịch</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%]">Trạng thái</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Lịch trình</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Hiệu quả</th>
                        <th className="px-8 py-5 text-right w-[10%]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                    {campaigns.map(c => {
                        const isSent = c.status === CampaignStatus.SENT;
                        const isWaiting = c.status === CampaignStatus.WAITING_FLOW;
                        const isSending = c.status === CampaignStatus.SENDING;
                        const sentCount = c.stats?.sent || 0;

                        // FIX: Calculate openRate and clickRate based on new stats properties
                        const openRate = sentCount > 0 ? Math.round(((c.stats?.opened || 0) / sentCount) * 100) : 0;
                        const clickRate = sentCount > 0 ? Math.round(((c.stats?.clicked || 0) / sentCount) * 100) : 0;

                        // FIX: Use the calculated totalTargetAudience from the Campaign object
                        const totalTargetAudience = c.totalTargetAudience || 0;

                        return (
                            <tr
                                key={c.id}
                                className="group hover:bg-slate-50/80 transition-all duration-200 cursor-pointer"
                                onClick={() => {
                                    if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                                        onEdit(c);
                                    } else {
                                        onSelect(c);
                                    }
                                }}
                            >
                                <td className="px-8 py-5 pl-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm border ${c.type === 'zalo_zns' ? 'bg-white text-[#0068ff] border-[#0068ff]/20 shadow-[0_0_15px_rgba(0,104,255,0.1)] p-2 group-hover:border-[#0068ff]/40 group-hover:shadow-[0_0_20px_rgba(0,104,255,0.15)]' :
                                            (isSent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                (isWaiting ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    (isSending ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        (c.status === CampaignStatus.SCHEDULED ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'))))
                                            }`}>
                                            {c.type === 'zalo_zns' ? <CheckCircle2 className="w-5 h-5" /> :
                                                (isSent ? <CheckCircle2 className="w-5 h-5" /> :
                                                    (isWaiting ? <GitMerge className="w-5 h-5" /> :
                                                        (isSending ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                                            (c.status === CampaignStatus.SCHEDULED ? <CalendarClock className="w-5 h-5" /> : <FileText className="w-5 h-5" />))))}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {c.type === 'zalo_zns' && <span className="px-1.5 py-0.5 rounded bg-[#0068ff] text-white text-[9px] font-black uppercase tracking-wider shadow-sm shadow-[#0068ff]/20">ZNS</span>}
                                                <p className="font-bold text-slate-800 text-sm leading-tight group-hover:text-[#ca7900] transition-colors truncate">{c.name}</p>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-xs">{c.subject || (c.type === 'zalo_zns' ? `Template: ${c.templateId}` : '')}</p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-6 py-5 text-center">
                                    {isWaiting ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-wide">
                                            <GitMerge className="w-3 h-3" /> Waiting Flow
                                        </span>
                                    ) : isSending ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-wide">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                                        </span>
                                    ) : isSent ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wide">
                                            <CheckCircle2 className="w-3 h-3" /> Sent
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
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
                                                <Send className="w-3.5 h-3.5 text-blue-500" />
                                                {sentCount.toLocaleString()} <span translate="no" className="text-[10px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">{c.type === 'zalo_zns' ? 'Tin nhắn' : 'Emails'}</span>
                                            </div>
                                            {c.sentAt && <span className="text-[10px] text-slate-400 font-medium block">{new Date(c.sentAt).toLocaleDateString('vi-VN')}</span>}
                                        </div>
                                    ) : isSending ? (
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
                                                <Send className="w-3.5 h-3.5 text-blue-500" />
                                                Đang gửi: {sentCount.toLocaleString()} / {totalTargetAudience.toLocaleString()} {c.type === 'zalo_zns' ? 'Tin nhắn' : 'Emails'}
                                            </div>
                                            {c.scheduledAt && <span className="text-[10px] text-slate-400 font-medium block">Bắt đầu: {new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString('vi-VN') : 'Chưa đặt lịch'}
                                            </span>
                                            {c.scheduledAt && <span className="text-[10px] text-slate-400 font-medium pl-5">{new Date(c.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                                        </div>
                                    )}
                                </td>

                                <td className="px-6 py-5">
                                    {isSent ? (
                                        <div className="w-full min-w-[160px] max-w-[180px] space-y-2">
                                            {/* Open Rate Bar */}
                                            <div>
                                                <div className="flex justify-between items-end mb-1 gap-2 flex-nowrap">
                                                    <span translate="no" className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{c.type === 'zalo_zns' ? 'Tổng tiền' : 'Hiệu suất Open'}</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-medium text-slate-400">
                                                            {c.type === 'zalo_zns' ? `${(sentCount * 300).toLocaleString()}đ` : `${c.stats?.opened || 0}/${sentCount}`}
                                                        </span>
                                                        {c.type !== 'zalo_zns' && <span className={`text-[9px] font-black ${openRate > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>({openRate}%)</span>}
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-gradient-to-r ${c.type === 'zalo_zns' ? 'from-blue-500 to-blue-700 shadow-[0_0_10px_rgba(0,104,255,0.2)]' : 'from-emerald-400 to-emerald-600'} rounded-full transition-all duration-1000`} style={{ width: `${c.type === 'zalo_zns' ? 100 : Math.min(openRate, 100)}%` }}></div>
                                                </div>
                                            </div>
                                            {/* Click Stat (Text Only) */}
                                            <div className="flex justify-between items-center mt-2 flex-nowrap gap-2">
                                                <span translate="no" className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{c.type === 'zalo_zns' ? 'Tương tác' : 'Click'}</span>
                                                <span translate="no" className={`text-[9px] font-black whitespace-nowrap ${clickRate > 0 ? 'text-blue-500' : 'text-slate-300'}`}>{clickRate}%</span>
                                            </div>
                                        </div>
                                    ) : isSending ? (
                                        <div className="w-full max-w-[140px]">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-[9px] font-bold text-blue-500 uppercase animate-pulse">Progress</span>
                                                <span className="text-[9px] font-black text-blue-600">
                                                    {totalTargetAudience > 0 ? Math.round((sentCount / totalTargetAudience) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-blue-50 rounded-full overflow-hidden border border-blue-100/50">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full transition-all duration-1000"
                                                    style={{ width: `${totalTargetAudience > 0 ? Math.min((sentCount / totalTargetAudience) * 100, 100) : 0}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 text-center">
                                                {sentCount.toLocaleString()} / {totalTargetAudience.toLocaleString()}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Chưa có dữ liệu</span>
                                    )}
                                </td>

                                <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300">
                                        {isWaiting && (
                                            <button onClick={() => onPlayFlow(c)} className="p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 rounded-xl transition-all shadow-sm hover:shadow-md border border-emerald-100" title="Khởi chạy ngay">
                                                <Play className="w-4 h-4 fill-current" />
                                            </button>
                                        )}
                                        <button onClick={() => onDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Xóa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {!isWaiting && (
                                            <button onClick={() => {
                                                if (c.status === CampaignStatus.DRAFT || c.status === CampaignStatus.SCHEDULED) {
                                                    onEdit(c);
                                                } else {
                                                    onSelect(c);
                                                }
                                            }} className="p-2 text-slate-400 hover:text-[#ca7900] hover:bg-orange-50 rounded-xl transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    {campaigns.length === 0 && !loading && (
                        <tr>
                            <td colSpan={5} className="py-20 text-center">
                                <div className="flex flex-col items-center justify-center opacity-50">
                                    <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-500">Chưa có chiến dịch nào</p>
                                    <p className="text-xs text-slate-400">Bắt đầu bằng cách tạo chiến dịch mới.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div >
    );
};

export default CampaignList;