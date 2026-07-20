import * as React from 'react';
import { useMemo, useState } from 'react';
import { Users, Zap, Eye, Clock, TrendingUp, BarChart2, Activity, Info, Table, BookOpen, UserPlus } from 'lucide-react';
import Modal from '../../common/Modal';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { WebStats } from '../types';

interface GeneralTabContentProps {
    stats: WebStats | null;
    formatDuration: (seconds: number) => string;
}

const GeneralTabContent: React.FC<GeneralTabContentProps> = ({ stats, formatDuration }) => {
    const [isBounceInfoOpen, setIsBounceInfoOpen] = useState(false);
    const chartOptions: ApexOptions = useMemo(() => ({
        chart: {
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'Inter, system-ui, sans-serif',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: { enabled: true, delay: 150 }
            },
            background: 'transparent'
        },
        dataLabels: { enabled: false },
        stroke: {
            curve: 'smooth',
            width: [2.5, 2.5],
            lineCap: 'round',
            dashArray: [0, 0]
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: stats?.chart.map(c => c.date) || [],
            labels: {
                style: {
                    colors: '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif'
                },
                offsetY: 2,
                rotate: 0
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif'
                },
                formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toString()
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 3,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } },
            padding: { top: 10, right: 15, bottom: 5, left: 5 }
        },
        colors: ['#6366f1', '#8b5cf6'],
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'right',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            itemMargin: { horizontal: 12, vertical: 0 },
            markers: {
                radius: 12,
                width: 10,
                height: 10,
                offsetY: 0,
                strokeWidth: 0
            },
            labels: {
                colors: '#475569'
            }
        },
        tooltip: {
            theme: 'light',
            style: { fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' },
            x: { show: true },
            y: {
                formatter: (val) => val.toLocaleString(),
                title: {
                    formatter: (seriesName) => seriesName + ':'
                }
            },
            marker: { show: true }
        }
    }), [stats]);

    const chartSeries = useMemo(() => [
        { name: 'Sessions', data: stats?.chart.map(c => c.sessions) || [] },
        { name: 'Page Views', data: stats?.chart.map(c => c.pageViews) || [] }
    ], [stats]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {!stats ? (
                /* Skeleton Loading */
                <div className="space-y-8 animate-pulse">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-[26px] h-32 border border-slate-100 shadow-sm"></div>
                        ))}
                    </div>
                    <div className="bg-white p-8 rounded-[32px] h-[450px] border border-slate-100 shadow-sm"></div>
                </div>
            ) : (
                <>
                    {/* Stats Grid - Compact Style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Unique Visitors */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#8b5cf6' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" stroke-dasharray="4 4" />
                                    <circle cx="35" cy="45" r="15" fill="currentColor" fillOpacity="0.2" />
                                    <circle cx="65" cy="45" r="15" fill="currentColor" fillOpacity="0.4" />
                                    <circle cx="50" cy="70" r="18" fill="currentColor" fillOpacity="0.6" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">Unique Visitors</h5>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none">{stats?.overview.visitors.toLocaleString() || 0}</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}>
                                <Users className="w-4 h-4" />
                            </div>
                        </div>

                        {/* New Users */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#3b82f6' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <path d="M10 50 Q 50 10 90 50 T 90 90" stroke="currentColor" strokeWidth="2" stroke-dasharray="3 3" />
                                    <circle cx="10" cy="50" r="6" fill="currentColor" />
                                    <circle cx="50" cy="10" r="6" fill="currentColor" />
                                    <circle cx="90" cy="50" r="6" fill="currentColor" />
                                    <path d="M50 10 L 90 50" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">New Users</h5>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none">{(stats?.overview.newUsers ?? 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
                                <UserPlus className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Total Sessions */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#f59e0b' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <rect x="20" y="20" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.6" />
                                    <rect x="20" y="42" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.4" />
                                    <rect x="20" y="64" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.2" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Total Sessions</h5>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none">{stats?.overview.sessions.toLocaleString() || 0}</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>
                                <Zap className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Page Views */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#ec4899' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" />
                                    <path d="M50 35 V 65 M35 50 H 65" stroke="currentColor" strokeWidth="3" stroke-linecap="round" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">Page Views</h5>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none">{stats?.overview.pageViews.toLocaleString() || 0}</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#ec489915', color: '#ec4899' }}>
                                <Eye className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Avg Duration */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#10b981' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <rect x="20" y="20" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.6" />
                                    <rect x="20" y="42" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.4" />
                                    <rect x="20" y="64" width="60" height="15" rx="7.5" fill="currentColor" fillOpacity="0.2" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">Avg Duration</h5>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl md:text-2xl font-black text-slate-855 dark:text-slate-100 tracking-tight leading-none">{formatDuration(Math.floor(stats?.overview.avgDuration || 0))}</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#10b98115', color: '#10b981' }}>
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Bounce Rate */}
                        <div className="stat-card bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[24px] border border-slate-100/70 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-[0_12px_36px_rgba(0,0,0,0.035)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[100px] cursor-pointer">
                            <div className="decor-svg" style={{ color: '#ef4444' }}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" />
                                    <path d="M50 35 V 65 M35 50 H 65" stroke="currentColor" strokeWidth="3" stroke-linecap="round" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Bounce Rate</h5>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsBounceInfoOpen(true);
                                        }}
                                        className="text-slate-300 hover:text-rose-500 transition-colors z-20 relative"
                                    >
                                        <Info className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    {(() => {
                                        const val = stats?.overview.bounceRate || 0;
                                        return (
                                            <div className="flex flex-col">
                                                <span className="text-xl md:text-2xl font-black tracking-tight text-slate-850 dark:text-slate-100 leading-none">
                                                    {val.toFixed(1)}%
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tight">
                                                    {stats?.overview.bounces.toLocaleString()} / {stats?.overview.sessions.toLocaleString()}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative z-10" style={{ backgroundColor: '#ef444415', color: '#ef4444' }}>
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <Modal
                        isOpen={isBounceInfoOpen}
                        onClose={() => setIsBounceInfoOpen(false)}
                        title={
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <span className="text-xl font-black text-slate-800 tracking-tight">Về Tỷ lệ thoát (Bounce Rate)</span>
                            </div>
                        }
                        size="xl"
                    >
                        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] relative overflow-hidden group">
                                <h4 className="flex items-center gap-2 font-black text-lg mb-4 text-slate-800 relative">
                                    <div className="p-2 bg-rose-600 text-white rounded-xl">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    Bounce Rate là gì?
                                </h4>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    Bounce rate hay Tỷ lệ thoát là phần trăm số lượt truy cập trang web chỉ xem duy nhất một trang và rời đi ngay lập tức mà không có thêm tương tác nào khác (như nhấn vào link hoặc xem trang thứ hai). Nó đo lường mức độ tương tác và tính hấp dẫn của trang đích.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                                    <h5 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        Tỷ lệ bao nhiêu là tốt?
                                    </h5>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">
                                        Không có con số "chuẩn" cho mỗi lĩnh vực. Tỷ lệ thoát phụ thuộc rất lớn vào loại trang web và mục đích của trang.
                                    </p>
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl italic text-[11px] text-orange-800 font-bold">
                                        "Ví dụ: Một trang blog trả lời đúng câu hỏi người dùng tìm kiếm có thể có tỷ lệ thoát 90%+ nhưng vẫn là chất lượng tốt."
                                    </div>
                                </div>

                                <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm">
                                    <h5 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Table className="w-4 h-4" />
                                        </div>
                                        Trung bình theo ngành
                                    </h5>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Bán lẻ / TMĐT', range: '20% - 40%', color: 'text-emerald-500' },
                                            { label: 'Dịch vụ', range: '10% - 30%', color: 'text-emerald-500' },
                                            { label: 'Tạo Khách hàng tiềm năng', range: '30% - 50%', color: 'text-blue-500' },
                                            { label: 'Nội dung (Content site)', range: '40% - 60%', color: 'text-amber-600' },
                                            { label: 'Blog / Landing Page', range: '70% - 90%', color: 'text-rose-500' }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] font-bold py-2 border-b border-slate-50 last:border-0">
                                                <span className="text-slate-500">{item.label}</span>
                                                <span className={item.color}>{item.range}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Modal>

                    {/* Chart Section - Enhanced */}
                    <div className="bg-gradient-to-br from-white to-slate-50/30 p-6 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-base font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
                                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/30">
                                        <BarChart2 className="w-4 h-4" />
                                    </div>
                                    Traffic Trend Analytics
                                </h3>
                                <p className="text-[10px] text-slate-500 mt-1.5 font-semibold ml-11">Thống kê lưu lượng truy cập theo Thời gian</p>
                            </div>
                        </div>
                        <div className="min-h-[350px] bg-white rounded-2xl p-4 border border-slate-100">
                            {stats?.chart && stats.chart.length > 0 ? (
                                <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-3">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                        <BarChart2 className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="font-bold">Chưa có dữ liệu biểu đồ cho khoảng Thời gian này</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default GeneralTabContent;
