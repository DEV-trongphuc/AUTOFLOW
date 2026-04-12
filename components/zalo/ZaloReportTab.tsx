import * as React from 'react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, MessageSquare, Zap, Calendar, RefreshCw, ChevronDown, Users, Heart, MessageSquareDashed, Send } from 'lucide-react';
import { api } from '../../services/storageAdapter';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import TabTransition from '../common/TabTransition';

interface ReportData {
    date: string;
    label: string;
    new_followers: number;
    non_follower_interactions: number;
    total_followers: number;
    automation: number;
}

interface ZaloOA {
    id: string;
    name: string;
    avatar?: string;
}

const ZaloReportTab: React.FC = () => {
    const [period, setPeriod] = useState<'month' | 'day'>('month');
    const [selectedOA, setSelectedOA] = useState<string>('');
    const [oas, setOas] = useState<ZaloOA[]>([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData[]>([]);

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    useEffect(() => { fetchOAs(); }, []);
    useEffect(() => { fetchReport(); }, [period, selectedOA, startDate, endDate]);

    const fetchOAs = async () => {
        try {
            const res = await api.get<ZaloOA[]>('zalo_oa');
            if (res.success) setOas(res.data);
        } catch (error) { console.error("Failed to fetch OAs", error); }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get<ReportData[]>(`zalo_report?period=${period}&oa_id=${selectedOA}&start_date=${startDate}&end_date=${endDate}`);
            if (res.success) setData(res.data);
        } catch (error) { console.error("Failed to fetch Zalo report", error); }
        finally { setLoading(false); }
    };

    const totals = data.length > 0 ? {
        new_followers: data.reduce((acc, curr) => acc + curr.new_followers, 0),
        non_follower_interactions: data.reduce((acc, curr) => acc + curr.non_follower_interactions, 0),
        total_followers: data[data.length - 1].total_followers,
        automation: data.reduce((acc, curr) => acc + curr.automation, 0),
        sent_zns: data.reduce((acc, curr) => acc + (curr as any).sent_zns || 0, 0)
    } : { new_followers: 0, non_follower_interactions: 0, total_followers: 0, automation: 0, sent_zns: 0 };

    const stats = [
        { label: 'THÀNH VIÊN MỚI', value: totals.new_followers + totals.non_follower_interactions, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-600/10', iconBg: 'bg-indigo-500' },
        { label: 'QUAN TÂM', value: totals.total_followers, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-600/10', iconBg: 'bg-rose-500' },
        { label: 'TIN NHẮN ZNS/ZBS', value: totals.sent_zns, icon: Send, color: 'text-blue-600', bg: 'bg-blue-600/10', iconBg: 'bg-blue-500' },
        { label: 'KÍCH HOẠT AUTOMATION', value: totals.automation, icon: Zap, color: 'text-orange-600', bg: 'bg-orange-600/10', iconBg: 'bg-orange-500' },
    ];

    return (

        <TabTransition className="space-y-8">
            {/* Filters Row */}
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex flex-wrap items-center gap-6">
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    <button onClick={() => setPeriod('month')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${period === 'month' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}>Tháng</button>
                    <button onClick={() => setPeriod('day')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${period === 'day' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}>Ngày</button>
                </div>

                <div className="shrink-0 min-w-[200px]">
                    <Select
                        value={selectedOA}
                        onChange={(val) => setSelectedOA(val)}
                        options={[
                            { value: '', label: 'Tất cả OA' },
                            ...oas.map(oa => ({
                                value: oa.id,
                                label: (
                                    <div className="flex items-center gap-2">
                                        {oa.avatar && <img src={oa.avatar} className="w-4 h-4 rounded-full object-cover" />}
                                        <span>{oa.name}</span>
                                    </div>
                                ),
                                searchLabel: oa.name
                            }))
                        ]}
                    />
                </div>

                <div className="flex items-center gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        customSize="sm"
                        className="!w-[140px] !py-1 !px-2"
                        label="Từ"
                    />
                    <div className="w-px h-6 bg-slate-100 mt-4"></div>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        customSize="sm"
                        className="!w-[140px] !py-1 !px-2"
                        label="Đến"
                    />
                </div>

                <button onClick={fetchReport} className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all group ml-auto">
                    <RefreshCw className={`w-5 h-5 text-slate-400 group-hover:text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Redesigned Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                        <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h4>
                            <div className="text-3xl font-black text-slate-800 tracking-tight">{stat.value.toLocaleString()}</div>
                        </div>
                        <div className={`w-14 h-14 ${stat.iconBg} rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 shrink-0`}>
                            <stat.icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Tăng trưởng & Quan tâm</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Số lượng người quan tâm tích lũy</p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-blue-500 opacity-20" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }} />
                                <Area type="monotone" dataKey="new_followers" name="Mới" stroke="#3b82f6" strokeWidth={4} fill="url(#colorNew)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Tương tác khách lạ</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Khách chưa nhấn quan tâm nhưng có nhắn tin</p>
                        </div>
                        <MessageSquare className="w-6 h-6 text-emerald-500 opacity-20" />
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="non_follower_interactions" name="Tương tác" fill="#10b981" radius={[8, 8, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Vận hành Automation</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Số lượt kích hoạt kịch bản tự động</p>
                        </div>
                        <Zap className="w-6 h-6 text-orange-500 opacity-20" />
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip contentStyle={{ border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }} />
                                <Area type="monotone" dataKey="automation" name="Kích hoạt" stroke="#f97316" strokeWidth={4} fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </TabTransition>
    );
};

export default ZaloReportTab;
