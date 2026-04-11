
import React, { useState, useEffect } from 'react';
import {
    Code2, Plus, Globe, Copy, Check, Terminal, FileCode, Search,
    Database, List, CheckCircle2, X, Layout, Info, Braces, ArrowRight, Trash2,
    Settings, MousePointer2, FileText, Edit3, ChevronDown, Monitor, BookOpen,
    Type, Mail, Phone, Calendar, Briefcase, Building, MapPin, Sparkles, FileInput, Tag, Bell, BellRing
} from 'lucide-react';
import { api } from '../services/storageAdapter';
import { FormDefinition, FormField } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import ConfirmModal from '../components/common/ConfirmModal';
import IntegrationGuideModal from '../components/flows/modals/IntegrationGuideModal';

const DB_FIELDS = [
    { value: 'email', label: 'Địa chỉ Email (Bắt buộc)', type: 'email', required: true, icon: Mail },
    { value: 'firstName', label: 'Tên Khách hàng', type: 'text', required: false, icon: Type },
    { value: 'lastName', label: 'Họ Khách hàng', type: 'text', required: false, icon: Type },
    { value: 'phoneNumber', label: 'Số điện thoại', type: 'tel', required: false, icon: Phone },
    { value: 'jobTitle', label: 'Chức danh', type: 'text', required: false, icon: Briefcase },
    { value: 'companyName', label: 'Còng ty', type: 'text', required: false, icon: Building },
    { value: 'country', label: 'Quốc gia', type: 'text', required: false, icon: Globe },
    { value: 'city', label: 'Thành phố', type: 'text', required: false, icon: MapPin },
    { value: 'dateOfBirth', label: 'Ngày sinh', type: 'date', required: false, icon: Calendar },
];

const CUSTOM_FIELD_TYPES = [
    { value: 'text', label: 'Văn bản' },
    { value: 'number', label: 'Số' },
    { value: 'date', label: 'Ngày tháng' },
    { value: 'tel', label: 'Số điện thoại' },
];

const Forms: React.FC = () => {
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [lists, setLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFormId, setEditingFormId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<FormDefinition>>({
        name: '', targetListId: '', fields: [{ id: 'f-email', dbField: 'email', label: 'Địa chỉ Email', required: true, type: 'email' }],
        notificationEnabled: false, notificationEmails: '', notificationSubject: ''
    });

    const [selectedFormForCode, setSelectedFormForCode] = useState<FormDefinition | null>(null);
    // 'closed' | 'choose' | 'custom_input'
    const [addFieldMode, setAddFieldMode] = useState<'closed' | 'choose' | 'custom_input'>('closed');
    const [pendingCustomKey, setPendingCustomKey] = useState('');
    const [pendingCustomLabel, setPendingCustomLabel] = useState('');
    const [pendingCustomType, setPendingCustomType] = useState<'text' | 'number' | 'date' | 'tel'>('text');

    // Confirmation Modal State
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [formsRes, listsRes] = await Promise.all([
                api.get<FormDefinition[]>('forms'),
                api.get<any[]>('lists')
            ]);
            if (formsRes.success) setForms(formsRes.data);
            else showToast(formsRes.message || 'Lỗi khi tải danh sách biểu mẫu', 'error');

            if (listsRes.success) setLists(listsRes.data);
            else showToast(listsRes.message || 'Lỗi khi tải danh sách đối tượng', 'error');
        } catch (error) {
            console.error('Fetch initial data error:', error);
            showToast('Không thể kết nối với máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    const handleCreateNew = () => {
        setEditingFormId(null);
        setFormData({
            name: '', targetListId: '',
            fields: [{ id: 'f-email', dbField: 'email', label: 'Địa chỉ Email', required: true, type: 'email' }],
            notificationEnabled: false, notificationEmails: '', notificationSubject: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (form: FormDefinition) => {
        setEditingFormId(form.id);
        setFormData({
            name: form.name,
            targetListId: form.targetListId,
            fields: [...form.fields],
            notificationEnabled: form.notificationEnabled || false,
            notificationEmails: form.notificationEmails || '',
            notificationSubject: form.notificationSubject || '',
        });
        setIsModalOpen(true);
    };

    const handleAddStandardField = () => {
        setFormData({
            ...formData,
            fields: [...(formData.fields || []), { id: crypto.randomUUID(), dbField: 'firstName', label: 'Tên Khách hàng', required: false, type: 'text' }]
        });
        setAddFieldMode('closed');
    };

    const handleAddCustomField = () => {
        const key = pendingCustomKey.trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
        if (!key) return;
        setFormData({
            ...formData,
            fields: [...(formData.fields || []), {
                id: crypto.randomUUID(),
                dbField: `custom_${key}`,
                label: pendingCustomLabel.trim() || key,
                required: false,
                type: pendingCustomType,
                isCustom: true,
                customKey: key
            }]
        });
        setPendingCustomKey('');
        setPendingCustomLabel('');
        setPendingCustomType('text');
        setAddFieldMode('closed');
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFormData({
            ...formData,
            fields: formData.fields?.map(f => {
                if (f.id !== id) return f;
                const newF = { ...f, ...updates };
                if (updates.dbField && !f.isCustom) {
                    const def = DB_FIELDS.find(d => d.value === updates.dbField);
                    if (def) {
                        newF.label = def.label;
                        newF.type = def.type as any;
                    }
                }
                return newF;
            })
        });
    };

    const handleSaveForm = async () => {
        if (!formData.name || !formData.targetListId) {
            showToast('Vui lòng điền đủ tên và list đích', 'error');
            return;
        }
        setIsSubmitting(true);

        try {
            let res;
            if (editingFormId) {
                res = await api.put<FormDefinition>(`forms/${editingFormId}`, formData);
            } else {
                res = await api.post<FormDefinition>('forms', formData);
            }

            if (res.success) {
                setIsModalOpen(false);
                showToast(editingFormId ? 'Đã cập nhật Form thành công' : 'Đã lưu cấu hình Form mới');
                fetchInitialData();
            } else {
                showToast(res.message || 'Lỗi khi lưu Form', 'error');
            }
        } catch (error) {
            console.error('Save form error:', error);
            showToast('Không thể lưu Form. Vui lòng thử lại.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDeleteId) return;

        try {
            const res = await api.delete(`forms/${confirmDeleteId}`);
            if (res.success) {
                setForms(prev => prev.filter(f => f.id !== confirmDeleteId));
                showToast('Đã xóa biểu mẫu và tạm dừng các Flow liên quan');
                setConfirmDeleteId(null);
            } else {
                showToast(res.message || 'Lỗi khi xóa Form', 'error');
            }
        } catch (error) {
            console.error('Delete form error:', error);
            showToast('Không thể xóa biểu mẫu', 'error');
        }
    };

    const getFieldIcon = (dbField: string) => {
        const field = DB_FIELDS.find(f => f.value === dbField);
        return field?.icon || Type;
    }

    return (
        <div className="animate-fade-in space-y-8  mx-auto pb-40">
            <PageHeader
                brandColor="#ffa900" title="Biểu mẫu & API"
                description="Thu thập Khách hàng tiềm năng từ Website và kích hoạt Automation ngay lập tức."
                action={
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 lg:mt-0">
                        <Button
                            icon={Plus}
                            size="lg"
                            onClick={handleCreateNew}
                            className="w-full sm:w-auto bg-slate-900 text-white hover:bg-black"
                        >
                            Tạo Form mới
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {loading ? (
                    <div className="col-span-full space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl lg:rounded-[40px] animate-pulse border border-slate-100" />)}
                    </div>
                ) : forms.length === 0 ? (
                    <div className="col-span-full py-16 lg:py-32 text-center border-2 border-dashed border-slate-200 rounded-2xl lg:rounded-[50px] bg-white p-6">
                        <Code2 className="w-12 h-12 lg:w-16 lg:h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-slate-500 font-black text-lg lg:text-xl uppercase tracking-tight">Chưa có biểu mẫu nào</h3>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto text-xs lg:text-sm">Tạo form để bắt đầu thu thập Khách hàng từ website của bạn.</p>
                        <Button variant="outline" className="mt-8 lg:mt-10 px-8 lg:px-10 h-10 lg:h-12 rounded-xl lg:rounded-2xl" onClick={handleCreateNew}>Bắt đầu ngay</Button>
                    </div>
                ) : forms.map(form => (
                    <div key={form.id} className="group bg-white p-4 lg:p-6 rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-amber-600/10 hover:border-amber-200 transition-all flex flex-col justify-between gap-4 lg:gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 lg:p-8 opacity-[0.03] text-amber-600 group-hover:scale-125 transition-transform"><Globe className="w-24 h-24 lg:w-32 lg:h-32" /></div>

                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-3 lg:gap-4">
                                {/* Changed to Amber Gradient & FileInput Icon to match Flow Creation Modal */}
                                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 group-hover:rotate-6 transition-transform">
                                    <FileInput className="w-5 h-5 lg:w-6 lg:h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-base font-bold text-slate-800 leading-tight truncate pr-2" title={form.name}>{form.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1 truncate max-w-[120px]">
                                            <List className="w-3 h-3" /> {lists.find(l => l.id === form.targetListId)?.name || 'Unknown List'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditClick(form)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Chỉnh sửa">
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDeleteId(form.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Xóa">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-amber-50/50 group-hover:border-amber-100 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chuyển đổi</span>
                                    <span className="text-sm font-black text-slate-700">{(form.stats?.submissions || 0).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">leads</span></span>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Số trường</span>
                                    <span className="text-sm font-black text-slate-700">{form.fields.length} <span className="text-[10px] font-medium text-slate-400">fields</span></span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedFormForCode(form)}
                                className="w-full h-10 lg:h-11 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 group/btn"
                            >
                                <Code2 className="w-4 h-4 text-[#ffa900] group-hover/btn:rotate-12 transition-transform" />
                                API & Nhúng
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* CREATE / EDIT MODAL - REDESIGNED */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingFormId ? "Chỉnh sửa biểu mẫu" : "Thiết kế biểu mẫu mới"}
                size="lg"
                footer={<div className="flex justify-between w-full"><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button><Button icon={CheckCircle2} onClick={handleSaveForm} isLoading={isSubmitting}>{editingFormId ? 'Cập nhật Form' : 'Lưu cấu hình Form'}</Button></div>}
            >
                <div className="space-y-8 py-2">
                    {/* SECTION 1: General Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Tên định danh Form"
                            placeholder="VD: Form Landing Page..."
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                            className="h-11"
                        />
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Danh sách lưu trữ đích</label>
                            <Select
                                options={lists.map(l => ({ value: l.id, label: l.name }))}
                                value={formData.targetListId || ''}
                                onChange={v => setFormData({ ...formData, targetListId: v })}
                                placeholder="Chọn danh sách đích..."
                                icon={Database}
                                variant="outline"
                                className="h-11"
                            />
                        </div>
                    </div>

                    {/* SECTION 1.5: Email Notification */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1 pb-2 border-b border-slate-100">
                            <div>
                                <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-[#ffa900]" /> Thông báo Email
                                </h5>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Gửi email thông Báo cáo tư vấn viên khi có lead mới.</p>
                            </div>
                            {/* Toggle */}
                            <div
                                onClick={() => setFormData({ ...formData, notificationEnabled: !formData.notificationEnabled })}
                                className="flex items-center gap-2 cursor-pointer select-none"
                            >
                                <div className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center ${
                                    formData.notificationEnabled ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}>
                                    <div className="w-4.5 h-4.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    formData.notificationEnabled ? 'text-amber-600' : 'text-slate-400'
                                }`}>{formData.notificationEnabled ? 'Bật' : 'Tắt'}</span>
                            </div>
                        </div>

                        {formData.notificationEnabled && (
                            <div className="space-y-4 bg-amber-50/50 border border-amber-100 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                        <BellRing className="w-3 h-3 inline mr-1 text-amber-600" />
                                        Email nhận thông báo <span className="text-slate-400 font-normal lowercase normal-case tracking-normal">(nhiều email cách nhau bằng dấu phẩy)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="vd: tuvan1@cty.com, manager@cty.com"
                                        value={formData.notificationEmails || ''}
                                        onChange={e => setFormData({ ...formData, notificationEmails: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl text-sm text-slate-700 outline-none resize-none transition-all focus:ring-4 focus:ring-amber-400/10 placeholder:text-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Tiêu đề email (tùy chọn)</label>
                                    <input
                                        type="text"
                                        placeholder={`VD: [${formData.name || 'Form'}] Lead mới cần xử lý`}
                                        value={formData.notificationSubject || ''}
                                        onChange={e => setFormData({ ...formData, notificationSubject: e.target.value })}
                                        className="w-full h-10 px-4 bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl text-sm text-slate-700 outline-none transition-all focus:ring-4 focus:ring-amber-400/10 placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-amber-100">
                                    <span className="text-base mt-0.5">📧</span>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Email sẽ chứa toàn bộ trường dữ liệu mà Khách hàng gửi — bao gồm cả custom fields như <code className="bg-amber-100 px-1 rounded text-amber-700 text-[10px]">hoc_van</code>, <code className="bg-amber-100 px-1 rounded text-amber-700 text-[10px]">chuong_trinh</code>, v.v.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: Fields Structure */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1 pb-2 border-b border-slate-100">
                            <div>
                                <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <Braces className="w-4 h-4 text-[#ffa900]" /> Cấu trúc trường dữ liệu
                                </h5>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Định nghĩa các trường thông tin bạn muốn thu thập từ Khách hàng.</p>
                            </div>
                            <div className="relative">
                                <button onClick={() => setAddFieldMode(m => m === 'closed' ? 'choose' : 'closed')} className="text-[10px] font-black text-blue-600 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 rounded-lg transition-all border border-blue-100 active:scale-95 shadow-sm">
                                    <Plus className="w-3.5 h-3.5" /> THÊM TRƯỜNG
                                </button>
                                {addFieldMode === 'choose' && (
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-52 animate-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={handleAddStandardField}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                                                <Database className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">Trường chuẩn</p>
                                                <p className="text-[10px] text-slate-400">Email, tên, SĐT...</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setAddFieldMode('custom_input')}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50 text-left transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all shrink-0">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">Custom Field</p>
                                                <p className="text-[10px] text-slate-400">Trường tùy chỉnh riêng</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                                {addFieldMode === 'custom_input' && (
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-72 animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-black text-violet-600 uppercase tracking-wide flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Custom Field</p>
                                            <button onClick={() => setAddFieldMode('closed')} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Key (dùng trong email: {'{{key}}'})</label>
                                            <input
                                                autoFocus
                                                value={pendingCustomKey}
                                                onChange={e => setPendingCustomKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                                placeholder="vd: lich_hen, ghi_chu..."
                                                className="w-full h-9 px-3 rounded-xl border-2 border-slate-200 text-xs font-mono font-bold text-violet-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:font-normal"
                                            />
                                            {pendingCustomKey && <p className="text-[9px] text-violet-500 mt-1 font-mono">{`{{${pendingCustomKey}}}`}</p>}
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Label hiển thị trên form</label>
                                            <input
                                                value={pendingCustomLabel}
                                                onChange={e => setPendingCustomLabel(e.target.value)}
                                                placeholder="vd: Lịch hẹn, Ghi chú..."
                                                className="w-full h-9 px-3 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Loại dữ liệu</label>
                                            <select
                                                value={pendingCustomType}
                                                onChange={e => setPendingCustomType(e.target.value as any)}
                                                className="w-full h-9 px-3 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 transition-all"
                                            >
                                                {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddCustomField}
                                            disabled={!pendingCustomKey.trim()}
                                            className="w-full h-9 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            <Tag className="w-3.5 h-3.5" /> Thêm Custom Field
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Click outside to close add field popup */}
                        {addFieldMode !== 'closed' && <div className="fixed inset-0 z-40" onClick={() => setAddFieldMode('closed')} />}

                        <div className="space-y-4 bg-slate-50/50 p-3 lg:p-4 rounded-[24px] border border-slate-200/50 min-h-[200px]">
                            {formData.fields?.map((field, idx) => {
                                const FieldIcon = field.isCustom ? Tag : getFieldIcon(field.dbField);
                                const isEmail = field.dbField === 'email';
                                const isCustom = !!field.isCustom;
                                return (
                                    <div key={field.id} className={`group relative flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-white p-4 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300 ${isCustom ? 'border-violet-100 hover:border-violet-300' : 'border-slate-200 hover:border-blue-300'}`}>
                                        <div className={`absolute -left-3 top-4 lg:top-1/2 lg:-translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm z-10 ${isCustom ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 text-slate-500'}`}>{idx + 1}</div>

                                        {/* Left: Field Type Badge or Selector */}
                                        <div className="pl-4 w-full lg:w-56 shrink-0">
                                            {isCustom ? (
                                                <div>
                                                    <label className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1.5 block">Custom Field Key</label>
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl border-2 border-violet-100">
                                                        <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                                        <span className="text-xs font-mono font-bold text-violet-700 truncate">{field.customKey}</span>
                                                        <span className="text-[9px] text-violet-400 ml-auto font-mono shrink-0">{`{{${field.customKey}}}`}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Trường Database</label>
                                                    <div className="relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FieldIcon className="w-4 h-4" /></div>
                                                        <select
                                                            value={field.dbField}
                                                            onChange={e => updateField(field.id, { dbField: e.target.value })}
                                                            disabled={isEmail}
                                                            className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border-2 transition-all ${isEmail ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                                        >
                                                            {DB_FIELDS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Middle: Label */}
                                        <div className="flex-1 w-full">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tiêu đề hiển thị (Label)</label>
                                            <input
                                                value={field.label}
                                                onChange={e => updateField(field.id, { label: e.target.value })}
                                                className={`w-full h-[40px] px-4 bg-slate-50 border-2 border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all placeholder:text-slate-300 ${isCustom ? 'focus:border-violet-400' : 'focus:border-[#ffa900]'}`}
                                                placeholder="Nhập tên trường..."
                                            />
                                        </div>

                                        {/* Right: Required toggle + Delete */}
                                        <div className="flex items-center justify-between lg:justify-end gap-3 lg:gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-50 mt-1 lg:mt-0">
                                            <div
                                                onClick={() => !isEmail && updateField(field.id, { required: !field.required })}
                                                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg transition-all select-none ${isEmail ? 'opacity-50 pointer-events-none bg-slate-100' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className={`w-8 h-5 rounded-full p-0.5 transition-all duration-300 flex items-center ${field.required ? (isCustom ? 'bg-violet-500 justify-end' : 'bg-emerald-500 justify-end') : 'bg-slate-300 justify-start'}`}>
                                                    <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${field.required ? (isCustom ? 'text-violet-600' : 'text-emerald-600') : 'text-slate-400'}`}>Bắt buộc</span>
                                            </div>

                                            {!isEmail ? (
                                                <button onClick={() => setFormData({ ...formData, fields: formData.fields?.filter(f => f.id !== field.id) })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                            ) : (
                                                <div className="lg:w-8"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="p-4 bg-white/40 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5" /> Dữ liệu sẽ tự động đồng bộ vào hồ sơ Khách hàng.
                                </p>
                            </div>
                        </div>
                    </div>


                </div>
            </Modal>

            {/* GET CODE MODAL */}
            {selectedFormForCode && (
                <IntegrationGuideModal
                    isOpen={!!selectedFormForCode}
                    onClose={() => setSelectedFormForCode(null)}
                    formId={selectedFormForCode.id}
                    formName={selectedFormForCode.name}
                    fields={selectedFormForCode.fields}
                />
            )}

            {/* CONFIRM DELETE MODAL */}
            <ConfirmModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={executeDelete}
                title="Xác nhận xóa biểu mẫu"
                message="Hành động này sẽ xóa vĩnh viễn biểu mẫu này. Mọi kịch bản Automation đang liên kết sẽ bị TẠM DỪNG ngay lập tức để bảo vệ dữ liệu."
                variant="danger"
                confirmLabel="Xóa vĩnh viễn"
            />


        </div>
    );
};

export default Forms;
