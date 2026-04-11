
import React, { useState, useEffect } from 'react';
import { api } from '../../services/storageAdapter';
import { Campaign, Subscriber } from '../../types';
import { Search, Filter, RefreshCw, Smartphone, Monitor, Globe, Mail, AlertTriangle, CheckCircle2, XCircle, MoreHorizontal, Tag, Trash2, Plus, MailOpen, Save, Eye, BadgeCheck } from 'lucide-react';
import Input from '../common/Input';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Select from '../common/Select';
import ConfirmModal from '../common/ConfirmModal';
import Modal from '../common/Modal';
import Checkbox from '../common/Checkbox';
import Radio from '../common/Radio';
import TabTransition from '../common/TabTransition';
import toast from 'react-hot-toast';

interface Props {
    campaign: Campaign;
    allLists: any[];
    allTags: any[];
}

const CampaignDeliveryDetailsTab: React.FC<Props> = ({ campaign, allLists, allTags }) => {
    const isZns = campaign.type === 'zalo_zns';
    const [recipients, setRecipients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Pagination State
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    // Stats State (fetched from API)
    const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, opened: 0 });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        variant?: 'danger' | 'warning';
        confirmLabel?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [deleteOptionModal, setDeleteOptionModal] = useState(false);
    const [deleteOption, setDeleteOption] = useState<'permanent' | 'from_list'>('from_list');

    // Preview Modal State
    const [previewModal, setPreviewModal] = useState<{
        isOpen: boolean;
        recipient: any | null;
        content: string;
        subject: string;
        loading: boolean;
    }>({ isOpen: false, recipient: null, content: '', subject: '', loading: false });

    const [minOpens, setMinOpens] = useState('');
    const [minClicks, setMinClicks] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch when filters/search/page changes (wait, we need to handle page separately or reset it)
    // Actually, when Filter/Search changes, we MUST reset to Page 1.
    // So we use a separate effect for that? Or just call fetch with page 1.

    useEffect(() => {
        fetchRecipients(1);
    }, [campaign, filter, typeFilter, debouncedSearch, minOpens, minClicks]);


    const fetchRecipients = async (page = 1) => {
        setLoading(true);
        const query = new URLSearchParams({
            route: 'recipients',
            id: campaign.id,
            page: page.toString(),
            limit: '20',
            status: filter,
            type: typeFilter,
            search: debouncedSearch,
            min_opens: minOpens,
            min_clicks: minClicks
        });

        const res = await api.get<any>(`campaigns?${query.toString()}`);
        if (res.success) {
            setRecipients(res.data.data || []);
            setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
            if (res.data.stats) {
                setStats(res.data.stats);
            }
            setSelectedIds([]);
        }
        setLoading(false);
    };

    const [openActionId, setOpenActionId] = useState<string | null>(null);
    const [tagInputId, setTagInputId] = useState<string | null>(null);
    const [tagValue, setTagValue] = useState('');
    const [bulkActionOpen, setBulkActionOpen] = useState(false);
    const [bulkTagValue, setBulkTagValue] = useState('');
    const [showBulkTagInput, setShowBulkTagInput] = useState(false);

    const handleActionClick = (id: string) => {
        setOpenActionId(openActionId === id ? null : id);
        setTagInputId(null);
    };

    // ...

    const handleSelectAll = () => {
        // Select all ON CURRENT PAGE
        const validRecipients = recipients.filter(r => r.subscriber_id);
        if (selectedIds.length === validRecipients.length && validRecipients.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(validRecipients.map(r => r.subscriber_id));
        }
    };

    const handleSelectRow = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const performBulkApi = async (action: string, value: string = '') => {
        setLoading(true);
        const res = await api.post('campaigns.php?route=bulk_update_subscribers', {
            subscriber_ids: selectedIds,
            action,
            value
        });

        if (res.success) {
            fetchRecipients(pagination.page);
            setShowBulkTagInput(false);
            setBulkTagValue('');
            setBulkActionOpen(false);
            setTagInputId(null);
        } else {
            toast.error('Có lỗi xảy ra: ' + ((res as any).message || 'Unknown error'));
        }
        setLoading(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    const executeBulkAction = (action: 'add_tag' | 'unsubscribe' | 'delete', value: string = '') => {
        if (selectedIds.length === 0) return;

        if (action === 'delete') {
            setDeleteOptionModal(true);
            return;
        }

        if (action === 'unsubscribe') {
            setConfirmModal({
                isOpen: true,
                title: 'Xác nhận Hủy đăng ký',
                message: `Bạn có chắc muốn Hủy đăng ký ${selectedIds.length} người đã chọn? Họ sẽ không nhận được ${isZns ? 'tin nhắn' : 'email'} nữa.`,
                variant: 'warning',
                confirmLabel: 'Hủy đăng ký',
                onConfirm: () => performBulkApi('unsubscribe')
            });
            return;
        }

        if (action === 'add_tag') {
            performBulkApi('add_tag', value);
        }
    };

    const handleConfirmDeleteOption = () => {
        setDeleteOptionModal(false);
        if (deleteOption === 'permanent') {
            setConfirmModal({
                isOpen: true,
                title: 'CẢNH BÁO: Xóa Vĩnh Viễn',
                message: (
                    <div className="space-y-3">
                        <p>Bạn đang yêu cầu <b>XÓA VĨNH VIỄN</b> {selectedIds.length} người đăng ký khỏi hệ thống.</p>
                        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded border border-rose-100">
                            ⚠ Hành động này không thể hoàn tác. Tất cả dữ liệu lịch sử hoạTổng sốbị mất.
                        </div>
                    </div>
                ),
                variant: 'danger',
                confirmLabel: 'Xác nhận Xóa',
                onConfirm: () => performBulkApi('delete')
            });
        } else {
            performBulkApi('unsubscribe');
        }
    };

    const handleQuickAction = (action: 'tag' | 'delete', subscriberId: string, email: string) => {
        if (action === 'delete') {
            setOpenActionId(null);
            setSelectedIds([subscriberId]);
            setDeleteOptionModal(true);
        } else if (action === 'tag') {
            setTagInputId(subscriberId);
            setTagValue('');
            setOpenActionId(null);
        }
    };

    const submitTag = async (subscriberId: string) => {
        if (tagValue.trim()) {
            await api.post('campaigns.php?route=bulk_update_subscribers', {
                subscriber_ids: [subscriberId],
                action: 'add_tag',
                value: tagValue.trim()
            });
            setTagInputId(null);
            fetchRecipients(pagination.page);
        }
    };

    const handlePreview = async (recipient: any) => {
        setPreviewModal({ ...previewModal, isOpen: true, loading: true, recipient, content: '', subject: '' });

        try {
            const res = await api.get<any>(`campaign_preview?campaign_id=${campaign.id}&email=${recipient.email}&reminder_id=${recipient.reminder_id || ''}`);
            if (res.success) {
                setPreviewModal(prev => ({
                    ...prev,
                    loading: false,
                    content: res.data.html,
                    subject: res.data.subject
                }));
            } else {
                setPreviewModal(prev => ({ ...prev, loading: false, content: `<p class="p-10 text-rose-500 font-bold text-center">Không thể tải nội dung ${isZns ? 'tin nhắn' : 'email'}.</p>` }));
            }
        } catch (err) {
            setPreviewModal(prev => ({ ...prev, loading: false, content: '<p class="p-10 text-rose-500 font-bold text-center">Lỗi kết nối server.</p>' }));
        }
    };

    return (
        <TabTransition className="space-y-6 pb-20">
            {/* ... stats ... */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Tổng gửi</p>
                        <h4 className="text-2xl font-black text-slate-800">{stats.total.toLocaleString()}</h4>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                        {isZns ? <Smartphone className="w-7 h-7" /> : <Mail className="w-7 h-7" />}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Thành công</p>
                        <h4 className="text-2xl font-black text-emerald-600">{stats.sent.toLocaleString()}</h4>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between group hover:border-orange-200 transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{isZns ? 'Người xem' : 'Lượt mở'}</p>
                        <h4 className="text-2xl font-black text-orange-600">{stats.opened.toLocaleString()}</h4>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-[#ca7900] text-white rounded-2xl shadow-lg shadow-orange-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                        {isZns ? <BadgeCheck className="w-7 h-7" /> : <MailOpen className="w-7 h-7" />}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Thất bại</p>
                        <h4 className="text-2xl font-black text-rose-600">{stats.failed.toLocaleString()}</h4>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl shadow-lg shadow-rose-500/10 flex items-center justify-center transition-all group-hover:scale-110">
                        <XCircle className="w-7 h-7" />
                    </div>
                </div>
            </div>

            <div className="flex justify-between gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-wrap">
                <div className="flex gap-2 flex-1 min-w-[300px]">
                    <div className="flex-1 relative group bg-white rounded-xl border border-slate-200 h-10 flex items-center overflow-hidden w-full">
                        <Search className="w-4 h-4 ml-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={isZns ? "Tìm kiếm sđt..." : "Tìm kiếm email..."}
                            className="w-full h-full bg-transparent border-none outline-none text-xs font-medium px-3"
                        />
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="flex gap-2 items-center">
                    <div className="w-24 relative group">
                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                            <Eye className="w-3 h-3 text-slate-400" />
                        </div>
                        <input
                            type="number"
                            min="0"
                            value={minOpens}
                            onChange={(e) => setMinOpens(e.target.value)}
                            placeholder="Mở > 0"
                            className="w-full h-9 pl-7 pr-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    {!isZns && (
                        <div className="w-24 relative group">
                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                <Monitor className="w-3 h-3 text-slate-400" />
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={minClicks}
                                onChange={(e) => setMinClicks(e.target.value)}
                                placeholder="Click > 0"
                                className="w-full h-9 pl-7 pr-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                            />
                        </div>
                    )}

                    <div className="w-40">
                        <Select
                            size="sm"
                            variant="outline"
                            value={typeFilter}
                            onChange={(val) => setTypeFilter(val)}
                            options={[
                                { value: 'all', label: 'Tất cả Loại' },
                                { value: 'Main Campaign', label: 'Chiến dịch chính' },
                                { value: 'Reminder', label: 'Reminder' }
                            ]}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            size="sm"
                            variant="outline"
                            value={filter}
                            onChange={(val) => setFilter(val)}
                            options={[
                                { value: 'all', label: 'Tất cả Trạng thái' },
                                { value: 'success', label: 'Thành công (Sent)' },
                                { value: 'opened', label: 'Đã mở (Opened)' },
                                { value: 'clicked', label: 'Đã click (Clicked)' },
                                { value: 'failed', label: 'Thất bại (Failed)' }
                            ]}
                        />
                    </div>
                    <button onClick={() => fetchRecipients(1)} className="p-2 h-9 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#ffa900] hover:border-[#ffa900] transition-all"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
            </div>

            <Card noPadding className="border-slate-100 shadow-sm min-h-[400px] overflow-visible">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-20 backdrop-blur-sm">
                            {selectedIds.length > 0 ? (
                                <tr className="bg-[#fffbf0] border-b border-orange-200 shadow-sm animate-in fade-in duration-200">
                                    <th colSpan={6} className="px-6 py-3">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={true}
                                                    onChange={handleSelectAll}
                                                    size="sm"
                                                />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Đã chọn <span className="text-orange-600 font-black text-sm">{selectedIds.length.toLocaleString()}</span> {isZns ? 'người nhận' : 'người nhận'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {showBulkTagInput ? (
                                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                                        <div className="w-40">
                                                            <Select
                                                                size="sm"
                                                                variant="outline"
                                                                value={bulkTagValue}
                                                                onChange={val => setBulkTagValue(val)}
                                                                options={[
                                                                    { value: '', label: 'Chọn Tag...' },
                                                                    ...allTags.map(t => ({ value: t.name, label: t.name }))
                                                                ]}
                                                            />
                                                        </div>
                                                        <button onClick={() => executeBulkAction('add_tag', bulkTagValue)} className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-sm transition-all"><Plus className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setShowBulkTagInput(false)} className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-50 transition-all"><XCircle className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setShowBulkTagInput(true)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                        >
                                                            <Tag className="w-3.5 h-3.5" /> Gắn Tag
                                                        </button>
                                                        <button
                                                            onClick={() => executeBulkAction('unsubscribe')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                        >
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Hủy đăng ký                                                       </button>
                                                        <div className="h-4 w-px bg-orange-200 mx-1"></div>
                                                        <button
                                                            onClick={() => executeBulkAction('delete')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Xóa nhanh
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <Checkbox
                                            checked={recipients.filter(r => r.subscriber_id).length > 0 && selectedIds.length === recipients.filter(r => r.subscriber_id).length}
                                            onChange={handleSelectAll}
                                            size="sm"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[220px]">{isZns ? "Số điện thoại" : "Email người nhận"}</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tương tác</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian gửi</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {loading ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-medium italic">Đang tải danh sách...</td></tr>
                            ) : recipients.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400 text-xs font-medium italic">Không tìm thấy người nhận nào khớp với bộ lọc.</td></tr>
                            ) : (
                                recipients.map((r, i) => (
                                    <tr
                                        key={i}
                                        className={`group transition-colors ${r.subscriber_id ? 'cursor-pointer' : ''} ${selectedIds.includes(r.subscriber_id) ? 'bg-orange-50/20' : 'hover:bg-slate-50'}`}
                                        onClick={() => r.subscriber_id && handleSelectRow(r.subscriber_id)}
                                    >
                                        <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(r.subscriber_id)}
                                                onChange={() => r.subscriber_id && handleSelectRow(r.subscriber_id)}
                                                disabled={!r.subscriber_id}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.type === 'Reminder' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {r.type === 'Main Campaign' ? 'Main' : (r.type || 'Main')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 max-w-[220px]">
                                            <div className="text-xs font-bold text-slate-700 group-hover:text-[#ca7900] transition-colors truncate" title={r.email}>{r.email}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge variant={r.delivery_status === 'success' ? 'success' : 'danger'} className="uppercase text-[9px]">
                                                {r.delivery_status}
                                            </Badge>
                                            {r.error_message && <p className="text-[9px] text-rose-500 mt-1 max-w-[200px] truncate" title={r.error_message}>{r.error_message}</p>}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-600">
                                            {!r.subscriber_id ? (
                                                <Badge variant="danger" className="text-[9px] bg-rose-50 text-rose-600 border-rose-100">Đã xóa</Badge>
                                            ) : r.subscriber_status === 'unsubscribed' ? (
                                                <Badge variant="warning" className="text-[9px] bg-amber-50 text-amber-600 border-amber-100">Đã hủy</Badge>
                                            ) : (
                                                <div className="flex gap-2">
                                                    {r.open_count > 0 && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100">{r.open_count.toLocaleString()} {isZns ? 'Xem' : 'Open'}</span>}
                                                    {!isZns && r.click_count > 0 && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">{r.click_count.toLocaleString()} Click</span>}
                                                    {r.open_count == 0 && (isZns || r.click_count == 0) && <span className="text-slate-400">-</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-[10px] font-bold text-slate-400 font-mono">
                                            {new Date(r.sent_at).toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => fetchRecipients(pagination.page - 1)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-semibold text-slate-500">
                            Page {pagination.page.toLocaleString()} of {pagination.totalPages.toLocaleString()} <span className="text-slate-300 mx-2">|</span> Total {pagination.total.toLocaleString()}
                        </span>
                        <button
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchRecipients(pagination.page + 1)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </Card>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                confirmLabel={confirmModal.confirmLabel}
            />

            <Modal
                isOpen={deleteOptionModal}
                onClose={() => setDeleteOptionModal(false)}
                title="Lựa chọn Xóa"
                size="sm"
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <button onClick={() => setDeleteOptionModal(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-bold">Hủy</button>
                        <button onClick={handleConfirmDeleteOption} className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-bold shadow-lg">Tiếp tục</button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Bạn muốn xử lý <span className="font-bold text-slate-900">{selectedIds.length} người đăng ký</span> này như thế nào?</p>
                    <Radio
                        variant="cards"
                        value={deleteOption}
                        onChange={(val) => setDeleteOption(val as any)}
                        options={[
                            {
                                id: 'from_list',
                                label: 'Gỡ khỏi Danh sách nhận tin (Unsubscribe)',
                                desc: 'Người dùng sẽ bị đánh dấu Unsubscribed. Dữ liệu lịch sử vẫn được giữ lại.'
                            },
                            {
                                id: 'permanent',
                                label: 'Xóa vĩnh viễn khỏi hệ thống',
                                desc: 'Xóa hoàn toàn người dùng và mọi lịch sử tương tác. Không thể khôi phục.'
                            }
                        ]}
                    />
                </div>
            </Modal>

            <Modal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
                title={`Preview: ${previewModal.recipient?.email || ''}`}
                size="lg"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiêu đề (Personalized Subject)</p>
                        <p className="text-sm font-bold text-slate-700">{previewModal.loading ? '...' : previewModal.subject}</p>
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner h-[500px]">
                        {previewModal.loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 animate-pulse">
                                <RefreshCw className="w-8 h-8 animate-spin" />
                                <p className="text-xs font-bold uppercase tracking-widest">Đang tạo nội dung preview...</p>
                            </div>
                        ) : (
                            <iframe
                                srcDoc={previewModal.content}
                                className="w-full h-full border-none"
                                title={isZns ? "ZNS Preview" : "Email Preview"}
                            />
                        )}
                    </div>
                </div>
            </Modal>
        </TabTransition>
    );
};



export default CampaignDeliveryDetailsTab;