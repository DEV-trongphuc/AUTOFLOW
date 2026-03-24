import * as React from 'react';
import { useState } from 'react';
import { Users, Settings, Zap, BarChart3, Info, HelpCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import MetaConfig from '../components/meta/MetaConfig';
import MetaAutomation from '../components/meta/MetaAutomation';
import MetaCustomers from '../components/meta/MetaCustomers';
import MetaPolicyModal from '../components/meta/MetaPolicyModal';
import MetaGrowthReport from '../components/meta/MetaGrowthReport';

const MetaMessenger: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'automation' | 'customers' | 'report' | 'config'>('customers');
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 mx-auto ">
            <PageHeader
                title="Meta Messenger Config"
                description="Quản lý tin nhắn, Chatbot và Tự động hóa cho Facebook Fanpages"
                action={
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <button
                            onClick={() => setShowPolicyModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-100 shadow-sm w-full sm:w-auto"
                        >
                            <HelpCircle className="w-4 h-4 text-blue-500" />
                            Quy tắc 24h
                        </button>

                        <a
                            href="https://developers.facebook.com/docs/messenger-platform"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-3 bg-white shadow-sm hover:bg-slate-50 px-4 py-2.5 rounded-xl lg:rounded-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500 transition-colors w-full sm:w-auto"
                        >
                            <div className="relative">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="" className="w-5 h-5 lg:w-6 lg:h-6 object-contain" />
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                Meta Platform
                                <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </span>
                        </a>
                    </div>
                }
            />

            <MetaPolicyModal
                isOpen={showPolicyModal}
                onClose={() => setShowPolicyModal(false)}
            />

            <div className="bg-white rounded-3xl lg:rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                <div className="px-4 lg:px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab as any}
                        items={[
                            { id: 'customers', label: 'Khách hàng', icon: Users },
                            { id: 'automation', label: 'Kịch bản', icon: Zap },
                            { id: 'report', label: 'Báo cáo', icon: BarChart3 },
                            { id: 'config', label: 'Cấu hình', icon: Settings }
                        ]}
                    />
                </div>

                <div className="p-4 lg:p-6">
                    {activeTab === 'config' && <MetaConfig />}
                    {activeTab === 'automation' && <MetaAutomation />}
                    {activeTab === 'customers' && <MetaCustomers />}
                    {activeTab === 'report' && <MetaGrowthReport />}
                </div>
            </div>
        </div>
    );
};

export default MetaMessenger;
