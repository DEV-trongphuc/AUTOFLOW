import * as React from 'react';
import { useState } from 'react';
import { LayoutDashboard, Users, MessageSquare, Zap, Globe, Calendar, ChevronRight, Download } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import MetaGrowthReport from '../components/meta/MetaGrowthReport';
import ZaloReportTab from '../components/zalo/ZaloReportTab';
import AIChatReport from '../components/reports/AIChatReport';
import WebJourneyReport from '../components/reports/WebJourneyReport';
// Import legacy components logic if needed, or keeping it inline for "Marketing" tab

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'meta' | 'zalo' | 'ai' | 'web' | 'marketing'>('ai');

    // Global Date State (lifted up so it persists across tabs)
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [showDatePicker, setShowDatePicker] = useState(false);

    const tabs = [
        { id: 'ai', label: 'Chat AI', icon: Zap },
        { id: 'web', label: 'Website', icon: Globe },
        { id: 'meta', label: 'Meta', icon: Users },
        { id: 'zalo', label: 'Zalo OA', icon: MessageSquare },
        // { id: 'marketing', label: 'Marketing', icon: Mail } // Keeping simple for now
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6 pb-20 px-2">
            {/* Header */}
            <PageHeader
                title="Trung tâm Phân tích"
                description="Báo cáo hiệu quả kinh doanh & Automation đa kênh"
                action={
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-4 bg-white border border-slate-200 px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl shadow-sm hover:border-amber-400 hover:shadow-lg transition-all group w-full lg:w-auto"
                        >
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-amber-50 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calendar className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Thời gian</p>
                                <p className="text-[11px] lg:text-xs font-black text-slate-700 tracking-tight">{dateRange.start} → {dateRange.end}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform ml-auto" />
                        </button>
                    </div>
                }
            />

            {/* Quick Date Picker Popover (Simplified) */}
            {showDatePicker && (
                <div className="absolute top-44 lg:top-24 right-4 lg:right-8 z-50 bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 w-[calc(100%-32px)] sm:w-80 animate-in zoom-in-95 duration-200">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Từ ngày</label>
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full text-xs font-bold p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-amber-500 transition-all outline-none border-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Đến ngày</label>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full text-xs font-bold p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-amber-500 transition-all outline-none border-2" />
                        </div>
                        <button onClick={() => setShowDatePicker(false)} className="w-full bg-slate-900 text-white font-black text-xs py-3.5 rounded-xl mt-2 hover:bg-black transition-colors shadow-lg shadow-slate-200 uppercase tracking-widest">Áp dụng</button>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <Tabs
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as any)}
                items={tabs}
                variant="pill"
            />

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'meta' && <MetaGrowthReport />}
                {/* Note: MetaGrowthReport handles its own date picker usually, pass props if refactored or let it be independent */}

                {activeTab === 'zalo' && <ZaloReportTab />}

                {activeTab === 'ai' && <AIChatReport dateRange={dateRange} />}

                {activeTab === 'web' && <WebJourneyReport dateRange={dateRange} />}
            </div>

        </div>
    );
};

export default Reports;