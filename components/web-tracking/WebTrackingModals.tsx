import React from 'react';
import { X, Copy, Check, AlertTriangle, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';
import { WebProperty } from './types';
import ConfirmModal from '../common/ConfirmModal';

interface WebTrackingModalsProps {
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    newSiteData: { name: string; domain: string };
    setNewSiteData: (data: { name: string; domain: string }) => void;
    handleAddWebsite: () => void;
    showScript: boolean;
    setShowScript: (show: boolean) => void;
    includeAiChat: boolean;
    setIncludeAiChat: (include: boolean) => void;
    selectedWebsite: WebProperty | null;
    copyScript: () => void;
    copied: boolean;

    // Delete Modal Props
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    siteToDelete: WebProperty | null;
    confirmDeleteAction: () => void;
}

const WebTrackingModals: React.FC<WebTrackingModalsProps> = ({
    isAddOpen,
    setIsAddOpen,
    newSiteData,
    setNewSiteData,
    handleAddWebsite,
    showScript,
    setShowScript,
    includeAiChat,
    setIncludeAiChat,
    selectedWebsite,
    copyScript,
    copied,
    isDeleteOpen,
    setIsDeleteOpen,
    siteToDelete,
    confirmDeleteAction
}) => {
    return (
        <>
            {/* Add Website Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Thêm Website Mới</h3>
                            <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <Input
                                    label="Tên Website"
                                    placeholder="VD: My Awesome Blog"
                                    value={newSiteData.name}
                                    onChange={(e) => setNewSiteData({ ...newSiteData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Input
                                    label="Tên miền (Domain)"
                                    placeholder="VD: example.com"
                                    value={newSiteData.domain}
                                    onChange={(e) => setNewSiteData({ ...newSiteData, domain: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 ml-1 italic font-medium">* Chỉ dữ liệu từ domain này mới được hệ thống bảo mật chấp nhận.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="px-6">Hủy</Button>
                            <Button onClick={handleAddWebsite} className="px-8 shadow-none">Kích hoạt ngay</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Script Modal */}
            {showScript && selectedWebsite && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cài đặt Mã theo dõi</h3>
                            <button onClick={() => setShowScript(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                            Sao chép đoạn mã dưới đây và dán vào trước thẻ đóng <code className="bg-slate-100 text-slate-700 font-bold rounded px-1.5">&lt;/head&gt;</code> trên website của bạn để bắt đầu thu thập dữ liệu và kích hoạt hệ thống bảo mật.
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-600 shadow-sm border border-slate-200 group-hover:scale-105 transition-transform">
                                    <X className={`w-5 h-5 ${includeAiChat ? 'hidden' : 'block text-slate-300'}`} />
                                    <div className={`${includeAiChat ? 'block' : 'hidden'} animate-in zoom-in duration-300`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.484 3.53 1.331 5L2 22l5-1.331C8.47 21.516 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">Tích hợp AI Chatbot</h4>
                                    <p className="text-[10px] text-slate-500 font-medium">Kích hoạt cửa sổ chat hỗ trợ Khách hàng ngay lập tức.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIncludeAiChat(!includeAiChat)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 outline-none ${includeAiChat ? 'bg-amber-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${includeAiChat ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-6 mb-8 relative group border border-slate-800 shadow-inner">
                            <pre className="text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                                {includeAiChat ? (
                                    `<!-- MailFlow Pro Tracker & AI Chat -->
<script>
  window._mf_config = {
    property_id: "${selectedWebsite.id}",
    ai_chat: true
  };
</script>
<script src="https://automation.ideas.edu.vn/tracker.js" async></script>`
                                ) : (
                                    `<!-- MailFlow Pro Tracker -->
<script src="https://automation.ideas.edu.vn/tracker.js" data-website-id="${selectedWebsite.id}" async></script>`
                                )}
                            </pre>
                            <button
                                onClick={copyScript}
                                className="absolute top-4 right-4 p-3 bg-slate-800 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-700 active:scale-95 border border-slate-700"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Security Features Highlight - Simple & Sophisticated */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group/feat hover:bg-white hover:border-slate-300 transition-all duration-300">
                                <h4 className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/feat:bg-slate-600 transition-colors"></div>
                                    Domain Lockdown
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Chỉ chấp nhận dữ liệu từ domain <b>{selectedWebsite.domain}</b>. Chặn tuyệt đối mã nhúng lậu.</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group/feat hover:bg-white hover:border-slate-300 transition-all duration-300">
                                <h4 className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/feat:bg-slate-600 transition-colors"></div>
                                    Smart Anti-DDoS
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Tự động phát hiện và ngăn chặn các đợt tấn công flood bot, bảo vệ băng thông website.</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group/feat hover:bg-white hover:border-slate-300 transition-all duration-300">
                                <h4 className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/feat:bg-slate-600 transition-colors"></div>
                                    AI Security Shield
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Lớp màng bảo vệ WAF lọc bỏ lưu lượng truy cập ảo, đảm bảo dữ liệu luôn làm sạch và an toàn.</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group/feat hover:bg-white hover:border-slate-300 transition-all duration-300">
                                <h4 className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/feat:bg-slate-600 transition-colors"></div>
                                    Privacy Compliance
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">Mã hóa dữ liệu định danh theo chuẩn quốc tế, bảo vệ quyền riêng tư người dùng tối đa.</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={() => setShowScript(false)} className="px-10 shadow-none h-12">Đóng</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDeleteAction}
                title="Xác nhận xóa dữ liệu"
                message={
                    <span>
                        Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu của website <span className="text-slate-900 font-bold">{siteToDelete?.name}</span>. Không thể hoàn tác.
                    </span>
                }
                confirmLabel="Xác nhận xóa"
                variant="danger"
                requireConfirmText={siteToDelete?.domain || ''}
                confirmPlaceholder="Nhập tên miền để xác nhận"
            />
        </>
    );
};

export default WebTrackingModals;
