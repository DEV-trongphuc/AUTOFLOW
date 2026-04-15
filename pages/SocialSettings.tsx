import * as React from 'react';
import { useState } from 'react';
import { Users, Settings, Zap, BarChart3, Info, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/storageAdapter';
import PageHero from '../components/common/PageHero';
import Tabs from '../components/common/Tabs';
import ZaloDashboard from '../components/zalo/ZaloDashboard';
import ZaloAudienceTab from '../components/zalo/ZaloAudienceTab';
import ZaloAutomationTab from '../components/zalo/ZaloAutomationTab';
import ZaloReportTab from '../components/zalo/ZaloReportTab';
import ZaloPolicyModal from '../components/zalo/ZaloPolicyModal';
import ZaloTemplateModal from '../components/settings/ZaloTemplateModal';

const ZaloSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'automation' | 'audience' | 'dashboard' | 'report'>('audience');
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

    const [isOaSelectorOpen, setIsOaSelectorOpen] = useState(false);
    const [templateModal, setTemplateModal] = useState<{ isOpen: boolean, oaId: string | null }>({ isOpen: false, oaId: null });
    const [oas, setOas] = useState<any[]>([]);

    const handleOpenTemplates = async () => {
        try {
            const res = await api.get<any[]>('zalo_oa');
            if (res.success && res.data) {
                if (res.data.length === 1) {
                    setTemplateModal({ isOpen: true, oaId: res.data[0].id });
                } else if (res.data.length > 1) {
                    setOas(res.data);
                    setIsOaSelectorOpen(true);
                } else {
                    toast.error('Vui lòng kết nối ít nhất 1 Zalo OA ở mục Cấu hình');
                }
            } else {
                toast.error('Không thể tải danh sách Zalo OA');
            }
        } catch (error) {
            toast.error('Lỗi khi lấy danh sách OA');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 mx-auto ">
            <PageHero
                title={<>Zalo Official <span className="text-amber-100/80">Config</span></>}
                subtitle="Thiết lập OA, Quản lý người quan tâm & Tự động hóa tin nhắn đa kênh."
                statusText="Zalo API Connected"
                showStatus={true}
                actions={[
                    { label: 'QUẢN LÝ TEMPLATE', icon: FileText, onClick: handleOpenTemplates },
                    { label: 'Official OA', icon: Zap, onClick: () => window.open('https://developers.zalo.me/docs/official-account/bat-dau/kham-pha', '_blank'), primary: true },
                    { label: '', icon: Info, onClick: () => setIsPolicyModalOpen(true), primary: true },
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

            {/* OA Selector Modal */}
            {isOaSelectorOpen && (
                <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Chọn Zalo OA</h3>
                            <button onClick={() => setIsOaSelectorOpen(false)} className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-sm font-medium text-slate-500 mb-4">Bạn đang có nhiều Official Account đang hoạt động. Vui lòng chọn OA để quản lý Template:</p>
                            {oas.map(oa => (
                                <button
                                    key={oa.id}
                                    onClick={() => {
                                        setIsOaSelectorOpen(false);
                                        setTemplateModal({ isOpen: true, oaId: oa.id });
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-amber-100 rounded-[14px] flex items-center justify-center shrink-0">
                                        {oa.avatar ? <img src={oa.avatar} alt="OA" className="w-full h-full rounded-[14px] object-cover" /> : <Users className="w-6 h-6 text-amber-600" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 group-hover:text-amber-700">{oa.name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {oa.oa_id}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {templateModal.oaId && (
                <ZaloTemplateModal
                    isOpen={templateModal.isOpen}
                    onClose={() => setTemplateModal({ isOpen: false, oaId: null })}
                    oaId={templateModal.oaId}
                />
            )}
        </div>
    );
};

export default ZaloSettings;
