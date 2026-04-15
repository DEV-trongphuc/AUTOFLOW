import React, { useState, useEffect } from 'react';
import { X, Activity, Server, Zap, Users, ShieldCheck, Mail, Database, Bot, BarChart3, TrendingUp, Globe, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '../../services/storageAdapter';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import Tabs from './Tabs';
import MetaGrowthReport from '../meta/MetaGrowthReport';
import ZaloReportTab from '../zalo/ZaloReportTab';
import AIChatReport from '../reports/AIChatReport';
import WebJourneyReport from '../reports/WebJourneyReport';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MODAL_STYLES = `
@keyframes pulseRing {
    0%, 100% { transform: scale(1);    opacity: 0.5; }
    50%       { transform: scale(1.2);  opacity: 0; }
}
@keyframes spin2    { to { transform: rotate(360deg); } }
@keyframes spin2rev { to { transform: rotate(-360deg); } }
@keyframes dotBounce {
    0%, 80%, 100% { transform: scaleY(0.4); opacity: 0.3; }
    40%            { transform: scaleY(1.2); opacity: 1; }
}
`;

export const SystemOverviewModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanText, setScanText] = useState('Đang khởi tạo kết nối...');
    const [days, setDays] = useState(7);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'meta' | 'zalo' | 'ai' | 'web'>('overview');

    const dateRange = React.useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }, [days]);

    useEffect(() => {
        if (!isOpen) {
            setLoading(true);
            setScanProgress(0);
            setData(null);
            return;
        }

        fetchData();

    }, [isOpen, days]);

    const fetchData = async () => {
        setLoading(true);
        setScanProgress(0);
        setScanText('Đang quét dữ liệu truy cập Web...');

        // Setup realistic scan animation sequence
        const scanSequence = [
            { text: 'Đang trích xuất Traffic hệ thống...', p: 20 },
            { text: 'Đang tổng hợp dữ liệu AI Chat...', p: 45 },
            { text: 'Đang phân tích hiệu suất Campaign/Flow...', p: 75 },
            { text: 'Đang tính toán tỷ lệ chuyển đổi...', p: 90 },
            { text: 'Hoàn tất.', p: 100 }
        ];

        let seqIdx = 0;
        const interval = setInterval(() => {
            if (seqIdx < scanSequence.length) {
                setScanText(scanSequence[seqIdx].text);
                setScanProgress(scanSequence[seqIdx].p);
                seqIdx++;
            }
        }, 400); // Progress visually updates fast

        try {
            const result = await api.get(`overview_stats?days=${days}`);
            clearInterval(interval);
            setScanProgress(100);

            // Artificial delay to ensure user sees the "hacking/scanning" aesthetic
            setTimeout(() => {
                if (result?.success) {
                    setData(result);
                }
                setLoading(false);
            }, 600);

        } catch (error) {
            clearInterval(interval);
            setLoading(false);
            console.error(error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <style>{MODAL_STYLES}</style>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl" onClick={onClose} />

            <div className="relative bg-white w-full max-w-6xl max-h-[90vh] min-h-[500px] rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700" />

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600">
                            <Server className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">TỔNG QUAN HỆ THỐNG</h2>
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Hệ thống đang hoạt động ổn định
                            </p>
                        </div>
                    </div>

                    {!loading && (
                        <div className="flex items-center gap-4">
                            <div className="flex p-1 bg-slate-100/80 backdrop-blur rounded-xl border border-slate-200/50">
                                {[3, 7, 14, 30].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDays(d)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${days === d ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {d} ngày
                                    </button>
                                ))}
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="px-6 py-3 border-b border-slate-100 bg-white">
                    <Tabs
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                        items={[
                            { id: 'overview', label: 'Dashboard', icon: Activity },
                            { id: 'ai', label: 'Chat AI', icon: Bot },
                            { id: 'web', label: 'Website', icon: Globe },
                            { id: 'meta', label: 'Meta', icon: Users },
                            { id: 'zalo', label: 'Zalo OA', icon: MessageSquare }
                        ]}
                        variant="pill"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">

                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur z-20">
                            {/* Spinning rings from AI Generator */}
                            <div style={{ position: 'relative', width: '96px', height: '96px', marginBottom: '24px' }}>
                                <div style={{ position: 'absolute', inset: '-14px', borderRadius: '50%', border: '2px solid rgba(217,119,6,0.12)', animation: 'pulseRing 2s ease-in-out infinite' }} />
                                <div style={{ position: 'absolute', inset: '4px', borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#d97706', borderRightColor: 'rgba(245,158,11,0.25)', animation: 'spin2 1.1s linear infinite' }} />
                                <div style={{ position: 'absolute', inset: '15px', borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#d97706', borderLeftColor: 'rgba(217,119,6,0.2)', animation: 'spin2rev 0.75s linear infinite' }} />
                                <div style={{ position: 'absolute', inset: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(217,119,6,0.15)' }}>
                                    <Server style={{ width: 20, height: 20, color: '#d97706' }} />
                                </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{scanText}</p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Đang đồng bộ dữ liệu {days} ngày gần nhất...</p>
                            </div>

                            {/* Bouncing dots */}
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '20px', marginTop: '24px', opacity: 0.8 }}>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div key={i} style={{
                                        width: i === 2 ? '26px' : '7px', height: '7px', borderRadius: '4px',
                                        background: i === 2 ? 'linear-gradient(90deg, #d97706, #d97706)' : '#334155',
                                        animation: 'dotBounce 1.2s ease-in-out infinite',
                                        animationDelay: `${i * 0.12}s`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    ) : (data && activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title="AI Chat Phản Hồi"
                                    value={data.summary.total_ai.toLocaleString()}
                                    growth={data.summary.growth_ai}
                                    icon={<Bot className="w-5 h-5" />}
                                    gradient="from-rose-500 to-pink-600 shadow-rose-500/25"
                                    trendColor={data.summary.growth_ai >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                />
                                <StatCard
                                    title="Truy cập Website"
                                    value={data.summary.total_web.toLocaleString()}
                                    growth={data.summary.growth_web}
                                    icon={<Globe className="w-5 h-5" />}
                                    gradient="from-blue-500 to-indigo-600 shadow-blue-500/25"
                                    trendColor={data.summary.growth_web >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                />
                                <StatCard
                                    title="Khách Mới"
                                    value={data.summary.total_leads.toLocaleString()}
                                    growth={data.summary.growth_leads}
                                    icon={<Users className="w-5 h-5" />}
                                    gradient="from-amber-400 to-orange-500 shadow-orange-500/25"
                                    trendColor={data.summary.growth_leads >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                />
                            </div>

                            {/* Chart Area */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                                    <h3 className="font-bold text-slate-800">Lưu lượng {days} ngày qua</h3>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                            <Area type="monotone" name="Truy cập Web" dataKey="web" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeb)" />
                                            <Area type="monotone" name="AI Phản hồi" dataKey="ai" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorAi)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Two Column Lists */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Top Campaigns */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25 flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="font-bold text-slate-800">Top Chiến dịch Email</h3>
                                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">All Time</span>
                                    </div>
                                    <div className="space-y-3">
                                        {data.top_campaigns.length === 0 ? (
                                            <div className="text-center py-6 text-sm text-slate-400">Chưa có dữ liệu chiến dịch</div>
                                        ) : data.top_campaigns.map((camp: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                                                <div className="min-w-0 flex-1 mr-4">
                                                    <p className="text-sm font-bold text-slate-800 truncate mb-1">{camp.name}</p>
                                                    <div className="flex gap-3 text-xs text-slate-500 font-medium tracking-tight">
                                                        <span>Gửi: <strong className="text-slate-700">{camp.stat_total_sent?.toLocaleString() || 0}</strong></span>
                                                        <span>Mở: <strong className="text-emerald-600">{camp.stat_total_opened?.toLocaleString() || 0}</strong></span>
                                                        <span>Click: <strong className="text-blue-600">{camp.stat_total_clicked?.toLocaleString() || 0}</strong></span>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Flows */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="font-bold text-slate-800">Top Automation Flow Kích hoạt</h3>
                                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">All Time</span>
                                    </div>
                                    <div className="space-y-3">
                                        {data.top_flows.length === 0 ? (
                                            <div className="text-center py-6 text-sm text-slate-400">Chưa có dữ liệu kịch bản</div>
                                        ) : data.top_flows.map((flow: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                                                <div className="min-w-0 flex-1 mr-4">
                                                    <p className="text-sm font-bold text-slate-800 truncate mb-1">{flow.name}</p>
                                                    <div className="flex gap-3 text-xs text-slate-500 font-medium tracking-tight">
                                                        <span>Enroll: <strong className="text-slate-700">{flow.stat_enrolled?.toLocaleString() || 0}</strong></span>
                                                        <span>Hoàn thành: <strong className="text-emerald-600">{flow.stat_completed?.toLocaleString() || 0}</strong></span>
                                                        <span className="px-1.5 py-px border border-slate-200 rounded text-[9px] uppercase tracking-wider">{flow.trigger_type || 'Manual'}</span>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Rendering Sub-Reports */}
                    {!loading && activeTab === 'ai' && (
                        <div className="animate-fade-in">
                            <AIChatReport dateRange={dateRange} />
                        </div>
                    )}
                    
                    {!loading && activeTab === 'web' && (
                        <div className="animate-fade-in">
                            <WebJourneyReport dateRange={dateRange} />
                        </div>
                    )}

                    {!loading && activeTab === 'meta' && (
                        <div className="animate-fade-in">
                            <MetaGrowthReport />
                        </div>
                    )}

                    {!loading && activeTab === 'zalo' && (
                        <div className="animate-fade-in">
                            <ZaloReportTab />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, growth, icon, gradient, trendColor }: any) => {
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-white rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform" />
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${growth >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    <TrendingUp className={`w-3 h-3 ${growth < 0 ? 'rotate-180' : ''}`} />
                    {growth > 0 ? '+' : ''}{growth}%
                </div>
            </div>
            <h4 className="text-sm font-bold text-slate-400 mb-1">{title}</h4>
            <div className="text-3xl font-black text-slate-800">{value}</div>
        </div>
    );
};
