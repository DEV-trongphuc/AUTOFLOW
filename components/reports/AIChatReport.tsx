import * as React from 'react';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, MessageSquare, User, Zap } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'https://automation.ideas.edu.vn/mail_api';

interface AIReportProps {
    dateRange: { start: string; end: string };
}

const AIChatReport: React.FC<AIReportProps> = ({ dateRange }) => {
    const [summary, setSummary] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, chartRes] = await Promise.all([
                axios.get(`${API_BASE}/ai_report.php?action=summary&start_date=${dateRange.start}&end_date=${dateRange.end}`),
                axios.get(`${API_BASE}/ai_report.php?action=chart&period=day&start_date=${dateRange.start}&end_date=${dateRange.end}`)
            ]);

            if (summaryRes.data.success) setSummary(summaryRes.data.data);
            if (chartRes.data.success) setChartData(chartRes.data.data);
        } catch (error) {
            console.error("Failed to fetch AI report", error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { label: 'TỔNG HỘI THOẠI', value: summary?.total_conversations || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'AI TRẢ LỜI', value: summary?.ai_replies || 0, icon: Bot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'CHUYỂN HUMAN', value: summary?.human_handovers || 0, icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'TỰ ĐỘNG HÓA', value: summary ? ((summary.ai_replies / (summary.ai_replies + summary.human_handovers + 1)) * 100).toFixed(1) + '%' : '0%', icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl lg:rounded-[32px] p-4 lg:p-6 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group hover:shadow-md transition-all">
                        <div className="space-y-1">
                            <h4 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h4>
                            <div className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{loading ? '...' : stat.value.toLocaleString()}</div>
                        </div>
                        <div className={`w-10 h-10 lg:w-14 lg:h-14 ${stat.bg} rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chart */}
            <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-sm lg:text-base font-black text-slate-800 uppercase tracking-tight">Xu hướng Chat AI</h3>
                        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tin nhắn theo thời gian</p>
                    </div>
                    <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500 opacity-20" />
                </div>
                <div className="h-[250px] lg:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ border: 'none', borderRadius: '24px', shadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }} />
                            <Area type="monotone" dataKey="ai_count" name="AI Trả lời" stroke="#10b981" strokeWidth={3} fill="url(#colorAi)" />
                            <Area type="monotone" dataKey="visitor_count" name="Khách nhắn" stroke="#6366f1" strokeWidth={3} fill="url(#colorUser)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AIChatReport;
