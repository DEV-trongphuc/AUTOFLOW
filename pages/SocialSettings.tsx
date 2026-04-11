import * as React from 'react';
import { useState } from 'react';
import { Users, Settings, Zap, BarChart3, Info } from 'lucide-react';
import PageHero from '../components/common/PageHero';
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
            <PageHero
                title={<>Zalo Official <span className="text-amber-100/80">Config</span></>}
                subtitle="Thiết lập OA, Quản lý người quan tâm & Tự động hóa tin nhắn đa kênh."
                statusText="Zalo API Connected"
                showStatus={true}
                actions={[
                    { label: 'Hướng dẫn', icon: Info, onClick: () => setIsPolicyModalOpen(true), primary: true },
                    { label: 'Official OA', icon: Zap, onClick: () => window.open('https://developers.zalo.me/docs/official-account/bat-dau/kham-pha', '_blank') }
                ]}
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
