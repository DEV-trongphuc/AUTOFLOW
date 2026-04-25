import { API_BASE_URL } from '@/utils/config';

import React, { useState, useEffect } from 'react';
import {
    ShoppingCart, Plus, Code2, Trash2, Edit3, ShoppingBag,
    Terminal, FileCode, Check, Copy, CheckCircle2, Info, Bell, ToggleLeft, ToggleRight
} from 'lucide-react';
import { api } from '../services/storageAdapter';
import { PurchaseEvent } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/common/ConfirmModal';

interface EventFormState {
    name: string;
    notificationEnabled: boolean;
    notificationEmails: string;
    notificationSubject: string;
}

const DEFAULT_FORM: EventFormState = {
    name: '',
    notificationEnabled: false,
    notificationEmails: '',
    notificationSubject: '',
};

const Purchases: React.FC = () => {
    const [events, setEvents] = useState<PurchaseEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [formState, setFormState] = useState<EventFormState>(DEFAULT_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    // Integration Modal
    const [integrationModal, setIntegrationModal] = useState<PurchaseEvent | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        setLoading(true);
        const res = await api.get<PurchaseEvent[]>('purchase_events');
        if (res.success) setEvents(res.data);
        setLoading(false);
    };

    const handleCreateNew = () => {
        setEditingEventId(null);
        setFormState(DEFAULT_FORM);
        setIsModalOpen(true);
    };

    const handleEditClick = (evt: PurchaseEvent) => {
        setEditingEventId(evt.id);
        setFormState({
            name: evt.name,
            notificationEnabled: (evt as any).notificationEnabled || false,
            notificationEmails: (evt as any).notificationEmails || '',
            notificationSubject: (evt as any).notificationSubject || '',
        });
        setIsModalOpen(true);
    };

    // [FIX UI-BUG-02] Toggle active/inactive status
    // [FIX UI-BUG-02] Toggle active/inactive status
    const handleToggleStatus = async (evt: PurchaseEvent) => {
        if (isToggling) return; // [GUARD]
        setIsToggling(true);
        try {
            const res = await api.put<{ id: string; status: 'active' | 'inactive' }>(`purchase_events/${evt.id}?route=toggle_status`, {});
            if (res.success) {
                const newStatus = res.data?.status ?? (evt.status === 'active' ? 'inactive' : 'active');
                setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, status: newStatus } : e));
                toast.success(`Da ${newStatus === 'active' ? 'kich hoat' : 'vo hieu hoa'} su kien`);
            } else {
                toast.error('Loi khi thay doi trang thai');
            }
        } catch {
            toast.error('Loi ket noi');
        } finally {
            setIsToggling(false); // [GUARD] Always unlock
        }
    };

    const handleSave = async () => {
        if (!formState.name) {
            toast.error('Vui long nhap ten su kien');
            return;
        }
        if (isSubmitting) return; // [GUARD]
        setIsSubmitting(true);
        const payload = {
            name: formState.name,
            notificationEnabled: formState.notificationEnabled,
            notificationEmails: formState.notificationEmails,
            notificationSubject: formState.notificationSubject,
        };

        let res;
        if (editingEventId) {
            res = await api.put<PurchaseEvent>(`purchase_events/${editingEventId}`, payload);
        } else {
            res = await api.post<PurchaseEvent>('purchase_events', payload);
        }

        if (res.success) {
            setIsModalOpen(false);
            toast.success(editingEventId ? 'Đã cập nhật' : 'Đã tạo sự kiện mới');
            fetchEvents();
        } else {
            toast.error(res.message || 'Lỗi khi lưu');
        }
        setIsSubmitting(false);
    };

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const executeDelete = async () => {
        if (!confirmDeleteId || isDeleting) return; // [GUARD]
        setIsDeleting(true);
        // [OPTIMISTIC UI] Remove immediately
        const snapshot = [...events];
        setEvents(prev => prev.filter(e => e.id !== confirmDeleteId));
        setConfirmDeleteId(null);
        try {
            const res = await api.delete(`purchase_events/${confirmDeleteId}`);
            if (res.success) {
                toast.success('Da xoa su kien mua hang');
            } else {
                setEvents(snapshot); // [ROLLBACK]
                toast.error('Loi khi xoa');
            }
        } catch {
            setEvents(snapshot); // [ROLLBACK]
            toast.error('Loi ket noi');
        } finally {
            setIsDeleting(false); // [GUARD] Always unlock
        }
    };
    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    
    const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/purchase_events.php?route=track`;

    const getJsSnippet = (evtId: string) => `// Tracking Mua hàng (JavaScript Fetch)
const trackPurchase = async () => {
    const payload = {
        event_id: "${evtId}",
        email: "khach_hang@example.com", // Email Khách hàng
        firstName: "Nguyen", // (Optional)
        lastName: "Van A",   // (Optional)
        total_value: 1500000,
        currency: "VND",
        items: [
            { name: "Sản phẩm A", price: 500000 },
            { name: "Sản phẩm B", price: 1000000 }
        ]
    };

    try {
        const response = await fetch("${endpoint}", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        console.log("Tracking:", result);
    } catch (err) {
        console.error("Lỗi API:", err);
    }
};`;

    return (
        <div className="animate-fade-in space-y-8 mx-auto pb-40">
            <PageHeader
                 brandColor="#ffa900"title="Hành động Mua hàng"
                description="Định nghĩa các sự kiện mua hàng để theo dõi doanh thu và kích hoạt Automation."
                action={<Button icon={Plus} size="lg" onClick={handleCreateNew}>Tạo Sự kiện mới</Button>}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-[40px] animate-pulse border border-slate-100" />)}
                    </div>
                ) : events.length === 0 ? (
                    <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[50px] bg-white">
                        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-slate-500 font-black text-xl uppercase tracking-tight">Chưa có sự kiện nào</h3>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm">Tạo sự kiện để API có thể gửi dữ liệu đơn hàng về hệ thống.</p>
                        <Button variant="outline" className="mt-10 px-10 h-12 rounded-2xl" onClick={handleCreateNew}>Bắt đầu ngay</Button>
                    </div>
                ) : events.map(evt => (
                    <div key={evt.id} className={`group bg-white p-6 rounded-[32px] border shadow-sm hover:shadow-2xl hover:shadow-pink-500/10 transition-all flex flex-col justify-between gap-6 relative overflow-hidden ${evt.status === 'inactive' ? 'border-slate-200 opacity-60' : 'border-slate-100 hover:border-pink-200'}`}>
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-pink-600 group-hover:scale-125 transition-transform"><ShoppingBag className="w-32 h-32" /></div>

                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 group-hover:rotate-6 transition-transform">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-slate-800 leading-tight truncate pr-2" title={evt.name}>{evt.name}</h4>
                                        {/* [FIX UI-BUG-02] Status badge */}
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${evt.status === 'inactive' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {evt.status === 'inactive' ? 'Tắt' : 'Bật'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit">ID: {evt.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* [FIX UI-BUG-02] Toggle status button */}
                                <button
                                    onClick={() => handleToggleStatus(evt)}
                                    className={`p-2 rounded-xl transition-all ${evt.status === 'inactive' ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-emerald-500 hover:text-slate-400 hover:bg-slate-50'}`}
                                    title={evt.status === 'inactive' ? 'Kích hoạt' : 'Vô hiệu hoá'}
                                >
                                    {evt.status === 'inactive' ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleEditClick(evt)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Sửa">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDeleteId(evt.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Xóa">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-pink-50/50 group-hover:border-pink-100 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đơn hàng</span>
                                    <span className="text-sm font-black text-slate-700">{(evt.stats?.count || 0).toLocaleString()}</span>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                {/* [FIX UI-BUG-01] Revenue was hardcoded N/A — now uses actual value */}
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</span>
                                    <span className="text-sm font-black text-slate-700">
                                        {(evt.stats?.revenue ?? 0) > 0
                                            ? (evt.stats!.revenue).toLocaleString('vi-VN') + '₫'
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIntegrationModal(evt)}
                                className="w-full h-11 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 group/btn"
                            >
                                <Code2 className="w-4 h-4 text-[#ffa900] group-hover/btn:rotate-12 transition-transform" />
                                Lấy mã tích hợp API
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* CREATE / EDIT MODAL — [FIX UI-BUG-04] Now includes notification settings */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEventId ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
                size="sm"
                footer={<div className="flex justify-between w-full"><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button><Button icon={CheckCircle2} onClick={handleSave} isLoading={isSubmitting}>{editingEventId ? 'Cập nhật' : 'Tạo sự kiện'}</Button></div>}
            >
                <div className="space-y-4 py-2">
                    <Input
                        label="Tên sự kiện mua hàng"
                        placeholder="VD: Mua gói Premium, Đặt hàng Website..."
                        value={formState.name}
                        onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                        autoFocus
                    />
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700 text-xs">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>ID sẽ được sinh tự động. Tên hàng, giá tiền và thông tin chi tiết sẽ được truyền động qua API khi gọi.</p>
                    </div>

                    {/* Notification Settings */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-bold text-slate-700">Thông báo Email</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormState(s => ({ ...s, notificationEnabled: !s.notificationEnabled }))}
                                className="flex items-center gap-2"
                            >
                                <div className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center ${formState.notificationEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${formState.notificationEnabled ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {formState.notificationEnabled ? 'Bật' : 'Tắt'}
                                </span>
                            </button>
                        </div>
                        {formState.notificationEnabled && (
                            <div className="space-y-3 pt-1">
                                <Input
                                    label="Email nhận thông báo (phân cách bằng dấu phẩy)"
                                    placeholder="admin@company.com, sales@company.com"
                                    value={formState.notificationEmails}
                                    onChange={e => setFormState(s => ({ ...s, notificationEmails: e.target.value }))}
                                />
                                <Input
                                    label="Tiêu đề email (tùy chọn)"
                                    placeholder="[Purchase] Đơn hàng mới từ khách hàng"
                                    value={formState.notificationSubject}
                                    onChange={e => setFormState(s => ({ ...s, notificationSubject: e.target.value }))}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* INTEGRATION GUIDE MODAL */}
            {integrationModal && (
                <Modal
                    isOpen={!!integrationModal}
                    onClose={() => setIntegrationModal(null)}
                    title="Tích hợp API Mua hàng"
                    size="lg"
                >
                    <div className="space-y-6 pb-4">
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-[28px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> API Endpoint (POST)</p>
                            <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-100 shadow-inner overflow-hidden">
                                <code className="text-[10px] text-slate-600 truncate font-mono">{endpoint}</code>
                                <button onClick={() => handleCopy(endpoint, 'url')} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 shrink-0">
                                    {copied === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileCode className="w-3.5 h-3.5" /> JavaScript Code Example</span>
                                <button onClick={() => handleCopy(getJsSnippet(integrationModal.id), 'js')} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2">
                                    {copied === 'js' ? <><Check className="w-3 h-3" /> ĐÃ CHÉP</> : <><Copy className="w-3 h-3" /> SAO CHÉP CODE</>}
                                </button>
                            </div>
                            <div className="bg-[#0f172a] rounded-3xl p-6 overflow-x-auto border-b-4 border-slate-800 shadow-xl">
                                <pre className="text-[11px] font-mono text-pink-300 leading-relaxed">{getJsSnippet(integrationModal.id)}</pre>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* CONFIRM DELETE MODAL */}
            <ConfirmModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={executeDelete}
                title="Xóa sự kiện này?"
                message="Hành động này sẽ xóa ID sự kiện khỏi hệ thống. Các lệnh gọi API sử dụng ID này sẽ bị lỗi."
                variant="danger"
                confirmLabel="Xóa vĩnh viễn"
            />


        </div>
    );
};

export default Purchases;
