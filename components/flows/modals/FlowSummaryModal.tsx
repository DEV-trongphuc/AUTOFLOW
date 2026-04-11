
import React from 'react';
import { X, Users, CheckCircle2, Mail, MailOpen, AlertOctagon, UserMinus, Activity, MousePointerClick, TrendingUp, BarChart3 } from 'lucide-react';
import { Flow, FlowStats } from '../../../types';

interface FlowSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    flow: Flow;
    stats: FlowStats;
}

const FlowSummaryModal: React.FC<FlowSummaryModalProps> = ({ isOpen, onClose, flow, stats }) => {
    if (!isOpen) return null;

    const enrolled = stats.enrolled || 0;
    const completed = stats.completed || 0;
    const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

    const totalSent = stats.totalSent || 0;
    const totalOpened = stats.totalOpened || 0;
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    const StatCard = ({ label, value, icon: Icon, color, subValue }: any) => (
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {subValue && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {subValue}
                    </span>
                )}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-black text-slate-800">{value.toLocaleString()}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-50 w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Tổng quan hiệu suất</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{flow.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Main Performance Section */}
                    <div className="bg-[#0f172a] rounded-[32px] p-8 text-white relative overflow-hidden ring-1 ring-white/10 shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                            <div className="w-full md:w-1/2 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tỉ lệ hoàn tất</p>
                                        <h3 className="text-3xl font-black tracking-tight">{completionRate}%</h3>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${completionRate}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{completed.toLocaleString()} / {enrolled.toLocaleString()} Khách hàng Hoàn thành</p>
                                </div>
                            </div>

                            <div className="w-px h-24 bg-white/10 hidden md:block"></div>

                            <div className="w-full md:w-1/2 flex justify-around">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Unique Open</p>
                                    <p className="text-3xl font-black text-emerald-400">{openRate}%</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">Trung bình</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">CTR</p>
                                    <p className="text-3xl font-black text-orange-400">{totalSent > 0 ? Math.round(((stats.totalClicked || 0) / totalSent) * 100) : 0}%</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">Average</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <StatCard
                            label="Khách tham gia"
                            value={enrolled}
                            icon={Users}
                            color="from-blue-500 to-indigo-600 shadow-blue-500/20"
                            subValue="Enrolled"
                        />
                        <StatCard
                            label="Hoàn tất"
                            value={completed}
                            icon={CheckCircle2}
                            color="from-emerald-500 to-teal-600 shadow-emerald-500/20"
                            subValue={`${completionRate}%`}
                        />
                        <StatCard
                            label="Lượt gửi"
                            value={totalSent}
                            icon={Mail}
                            color="from-indigo-500 to-violet-600 shadow-indigo-500/20"
                            subValue="Total Sent"
                        />
                        <StatCard
                            label="Lượt mở"
                            value={totalOpened}
                            icon={MailOpen}
                            color="from-cyan-500 to-blue-600 shadow-cyan-500/20"
                            subValue={`${openRate}% Open`}
                        />
                        <StatCard
                            label="Lượt Click"
                            value={stats.totalClicked || 0}
                            icon={MousePointerClick}
                            color="from-orange-500 to-red-600 shadow-orange-500/20"
                        />
                        <StatCard
                            label="Unique Clicks"
                            value={stats.uniqueClicked || 0}
                            icon={TrendingUp}
                            color="from-amber-400 to-orange-500 shadow-amber-600/20"
                        />
                        <StatCard
                            label="Gửi lại"
                            value={stats.totalFailed || 0}
                            icon={AlertOctagon}
                            color="from-rose-500 to-red-600 shadow-rose-500/20"
                        />
                        <StatCard
                            label="Hủy đăng ký"
                            value={stats.totalUnsubscribed || 0}
                            icon={UserMinus}
                            color="from-slate-600 to-slate-800 shadow-slate-600/20"
/>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-end items-center gap-4">
                    <p className="text-[11px] font-bold text-slate-400 italic">Dữ liệu được cập nhật theo Thời gian thực từ hệ thống Tracking.</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Đóng Báo cáo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlowSummaryModal;
