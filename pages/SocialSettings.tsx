import * as React from 'react';
import { useState } from 'react';
import { Users, Settings, Zap, BarChart3, Info } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import ZaloDashboard from '../components/zalo/ZaloDashboard';
import ZaloAudienceTab from '../components/zalo/ZaloAudienceTab';
import ZaloAutomationTab from '../components/zalo/ZaloAutomationTab';
import ZaloReportTab from '../components/zalo/ZaloReportTab';
import ZaloPolicyModal from '../components/zalo/ZaloPolicyModal';

const ZaloSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'automation' | 'audience' | 'dashboard' | 'report'>('audience');
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 mx-auto ">
            <PageHeader
                title="Zalo Global Config"
                description="Thiết lập OA, Quản lý người quan tâm & Tự động hóa"
                action={
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-100 shadow-sm w-full sm:w-auto"
                        >
                            <Info className="w-4 h-4 text-blue-500" />
                            Hướng dẫn
                        </button>

                        <a
                            href="https://developers.zalo.me/docs/official-account/bat-dau/kham-pha"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-3 bg-white shadow-sm hover:bg-slate-50 px-4 py-2.5 rounded-xl lg:rounded-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500 transition-colors w-full sm:w-auto"
                        >
                            <div className="relative">
                                <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo-Arc.png" alt="" className="w-5 h-5 lg:w-6 lg:h-6 object-contain" />
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                Official OA
                                <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </span>
                        </a>
                    </div>
                }
            />

            <div className="bg-white rounded-3xl lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                <div className="px-4 lg:px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab as any}
                        items={[
                            { id: 'audience', label: 'Khách hàng', icon: Users },
                            { id: 'automation', label: 'Kịch bản', icon: Zap },
                            { id: 'report', label: 'Báo cáo', icon: BarChart3 },
                            { id: 'dashboard', label: 'Cấu hình', icon: Settings }
                        ]}
                    />
                </div>

                <div className="p-4 lg:p-6">
                    {activeTab === 'dashboard' && <ZaloDashboard />}
                    {activeTab === 'automation' && <ZaloAutomationTab />}
                    {activeTab === 'audience' && <ZaloAudienceTab />}
                    {activeTab === 'report' && <ZaloReportTab />}
                </div>
            </div>
            <ZaloPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
            />
        </div>
    );
};


export default ZaloSettings;
