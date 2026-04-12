import * as React from 'react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, MessageSquare, Zap, Calendar, RefreshCw, ChevronDown, Users, Heart, MessageSquareDashed } from 'lucide-react';
import axios from 'axios';

// Interfaces matching Zalo Report Data Structure
interface ReportData {
    date: string;
    label: string;
    new_followers: number;
    non_follower_interactions: number;
    total_followers: number;
    automation: number;
}

interface MetaConfig {
    id: string;
    page_name: string;
    avatar_url?: string;
}

const API_BASE = 'https://automation.ideas.edu.vn/mail_api';

const MetaGrowthReport: React.FC = () => {
    const [period, setPeriod] = useState<'month' | 'day'>('month');
    const [selectedConfigId, setSelectedConfigId] = useState<string>('');
    const [configs, setConfigs] = useState<MetaConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData[]>([]);

    const [startDate, setStartDate] = useState(
        new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        if (selectedConfigId) {
            fetchReport();
        }
    }, [period, selectedConfigId, startDate, endDate]);

    const fetchConfigs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/meta_config.php`);
            if (res.data.success && res.data.data.length > 0) {
                setConfigs(res.data.data);
                setSelectedConfigId(res.data.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch Configs", error);
        }
    };

    const [summary, setSummary] = useState<any>({});

    const fetchReport = async () => {
        setLoading(true);
        try {
            // Using refined API endpoint that mirrors Zalo structure
            const res = await axios.get(`${API_BASE}/meta_report.php?period=${period}&meta_config_id=${selectedConfigId}&start_date=${startDate}&end_date=${endDate}`);
            if (res.data.success) {
                setData(res.data.data);
                setSummary(res.data.summary || {});
            }
        } catch (error) {
            console.error("Failed to fetch Meta report", error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { label: 'TỔNG CHAT', value: summary.total_chat || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-600/10', iconBg: 'bg-indigo-500' },
        { label: 'CÓ THÔNG TIN LEAD', value: summary.has_lead || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-600/10', iconBg: 'bg-emerald-500' },
        { label: 'CHƯA CÓ THÔNG TIN', value: summary.no_lead || 0, icon: MessageSquareDashed, color: 'text-slate-600', bg: 'bg-slate-600/10', iconBg: 'bg-slate-500' },
        { label: 'KÍCH HOẠT AUTOMATION', value: summary.automation || 0, icon: Zap, color: 'text-orange-600', bg: 'bg-orange-600/10', iconBg: 'bg-orange-500' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filters Row */}
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex flex-wrap items-center gap-6">
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    <button onClick={() => setPeriod('month')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${period === 'month' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}>Tháng</button>
                    <button onClick={() => setPeriod('day')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${period === 'day' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}>Ngày</button>
                </div>

                <div className="relative group shrink-0 min-w-[200px]">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        {selectedConfigId && configs.find(c => c.id === selectedConfigId)?.avatar_url ? (
                            <img src={configs.find(c => c.id === selectedConfigId)?.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                        ) : <Users className="w-4 h-4 text-slate-400" />}
                    </div>
                    <select value={selectedConfigId} onChange={(e) => setSelectedConfigId(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-2xl pl-12 pr-10 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none transition-all cursor-pointer shadow-sm w-full">
                        {configs.map(c => <option key={c.id} value={c.id}>{c.page_name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Từ</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[11px] font-black text-slate-700 outline-none uppercase bg-transparent w-[120px]" />
                    </div>
                    <div className="w-px h-4 bg-slate-100"></div>
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đến</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[11px] font-black text-slate-700 outline-none uppercase bg-transparent w-[120px]" />
                    </div>
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Khách chưa nhắn quan tâm nhưng có nhắn tin</p>
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
        </div>
    );
};

export default MetaGrowthReport;
