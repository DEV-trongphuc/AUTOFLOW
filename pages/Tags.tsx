import * as React from 'react';
import { useState, useEffect } from 'react';
import { Tag as TagIcon, Search, Trash2, Users, RefreshCw, Filter, ArrowRight, FileText, Info, Edit3, Check, X, AlertTriangle, Save, Plus, Codesandbox, Plug, Layers, Target, Lightbulb } from 'lucide-react';
import { api } from '../services/storageAdapter';
import { Subscriber } from '../types';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import GroupDetailModal from '../components/audience/GroupDetailModal';
import CustomerProfileModal from '../components/audience/CustomerProfileModal';
import { CardGridSkeleton } from '../components/common/PageSkeleton';
import { useNavigation } from '../contexts/NavigationContext';

interface Tag {
    id: string;
    name: string;
    description?: string;
    subscriber_count?: number;
}

const Tags: React.FC = () => {
    const { setCustomBackAction } = useNavigation();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [newTag, setNewTag] = useState({ name: '', description: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // View Members State
    // View Members State
    const [viewingTag, setViewingTag] = useState<Tag | null>(null);
    const [tagMembers, setTagMembers] = useState<Subscriber[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [tagPagination, setTagPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [tagSearch, setTagSearch] = useState('');
    const [tagStatus, setTagStatus] = useState('all');
    const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null); // For Profile View

    const backToTags = React.useCallback(() => setViewingTag(null), []);
    const backToTagDetail = React.useCallback(() => setSelectedSubscriber(null), []);

    // Smart Back Logic
    useEffect(() => {
        if (selectedSubscriber) {
            setCustomBackAction(() => backToTagDetail);
        } else if (viewingTag) {
            setCustomBackAction(() => backToTags);
        } else {
            setCustomBackAction(null);
        }

        return () => setCustomBackAction(null);
    }, [selectedSubscriber, viewingTag, setCustomBackAction, backToTags, backToTagDetail]);

    // Edit State
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', description: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete Confirmation State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        variant?: 'danger' | 'warning';
        confirmLabel?: string;
        requireConfirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'danger'
    });

    useEffect(() => { fetchTags(); }, []);

    // Re-fetch members when page or search changes
    useEffect(() => {
        if (viewingTag) {
            handleViewMembers(viewingTag, tagPagination.page, tagSearch, tagStatus);
        }
    }, [tagPagination.page, tagSearch, tagStatus, viewingTag?.id]);

    const fetchTags = async () => {
        setLoading(true);
        try {
            const res = await api.get<Tag[]>('tags');
            if (res.success) setTags(res.data);
        } catch (err) {
            showToast('Không thể tải danh sách nhãn', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    const handleAdd = async () => {
        if (!newTag.name.trim()) return;
        setIsAdding(true);
        try {
            const res = await api.post<Tag>('tags', {
                name: newTag.name.trim().toUpperCase().replace(/\s+/g, '_'),
                description: newTag.description.trim()
            });
            if (res.success) {
                setTags([{ ...res.data, subscriber_count: 0 }, ...tags]);
                setNewTag({ name: '', description: '' });
                setIsCreateModalOpen(false);
                showToast('Đã thêm nhãn mới');
            } else {
                showToast(res.message || 'Lỗi khi thêm nhãn', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối, vui lòng thử lại', 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (tag: Tag) => {
        setEditingTag(tag);
        setEditFormData({ name: tag.name, description: tag.description || '' });
    };

    const handleUpdate = async () => {
        if (!editingTag || !editFormData.name.trim()) return;

        const isRename = editingTag.name !== editFormData.name.trim().toUpperCase().replace(/\s+/g, '_');

        const performUpdate = async () => {
            setIsUpdating(true);
            const res = await api.put<Tag>(`tags/${editingTag.id}`, {
                name: editFormData.name.trim().toUpperCase().replace(/\s+/g, '_'),
                description: editFormData.description.trim()
            });

            if (res.success) {
                showToast('Đã cập nhật dữ liệu nhãn trên toàn hệ thống');
                fetchTags();
                setEditingTag(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            } else {
                showToast(res.message || 'Lỗi cập nhật', 'error');
            }
            setIsUpdating(false);
        };

        if (isRename) {
            setConfirmModal({
                isOpen: true,
                title: 'CẢNH BÁO ĐỔI TÊN',
                message: (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Bạn đang đổi tên từ <b>{editingTag.name}</b> sang <b className="text-emerald-600">{editFormData.name.trim().toUpperCase()}</b>.
                        </p>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>Hành động này sẽ cập nhật lại nhãn cho toàn bộ Khách hàng đang sở hữu nhãn này.</p>
                        </div>
                    </div>
                ),
                variant: 'warning',
                confirmLabel: 'Xác nhận Đổi tên',
                onConfirm: performUpdate
            });
            return;
        }

        performUpdate();
    };

    const handleDeleteClick = (e: React.MouseEvent, tag: Tag) => {
        e.stopPropagation();
        const subCount = tag.subscriber_count || 0;

        let messageContent: React.ReactNode;

        if (subCount > 0) {
            messageContent = (
                <div className="space-y-4">
                    <p className="text-center text-slate-600 text-sm">
                        Nhãn <span className="font-bold text-slate-800">"{tag.name}"</span> đang được gắn cho <span className="font-bold text-rose-600">{subCount.toLocaleString()} Khách hàng</span>.
                    </p>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-left shadow-inner">
                        <h4 className="text-xs font-bold text-rose-800 uppercase mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Hậu quả khi xóa:
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-rose-700 font-medium leading-relaxed">
                            <li>Hệ thống sẽ <b>GỠ BỎ</b> nhãn khỏi toàn bộ {subCount.toLocaleString()} Khách hàng này.</li>
                            <li>Các <b></b> có điều kiện lọc theo nhãn này sẽ bị dừng hoặc lỗi.</li>
                            <li>Bạn <b>KHÔNG THỂ</b> khôi phục lại liên kết dữ liệu cũ ngay cả khi tạo lại nhãn trùng tên.</li>
                        </ul>
                    </div>
                    <p className="text-center text-slate-500 text-xs italic">
                        Hãy cân nhắc <b>ĐỔI TÊN</b> thay vì xóa. Bạn vẫn chắc chắn muốn tiếp tục?
                    </p>
                </div>
            );
        } else {
            messageContent = `Bạn có chắc chắn muốn xóa nhãn "${tag.name}"? Nhãn này hiện chưa gắn cho Khách hàng nào.`;
        }

        setConfirmModal({
            isOpen: true,
            title: subCount > 0 ? 'CẢNH BÁO MẤT DỮ LIỆU' : 'Xóa nhãn này?',
            message: messageContent,
            variant: 'danger',
            requireConfirmText: subCount > 0 ? tag.name : undefined,
            confirmLabel: subCount > 0 ? 'Xác nhận xóa' : 'Xóa vĩnh viễn',
            onConfirm: async () => {
                const res = await api.delete(`tags/${tag.id}`);
                if (res.success) {
                    setTags(tags.filter(t => t.id !== tag.id));
                    showToast('Đã xóa nhãn và gỡ khỏi toàn bộ liên hệ');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    // Handle blocked deletion due to active flow
                    const blockingFlowName = res.message?.match(/'([^']+)'/)?.[1];
                    const errorMsg = (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-slate-700">{res.message}</p>
                            {blockingFlowName && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-700 items-start">
                                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-bold mb-1">Gợi ý:</p>
                                        <p>Truy cập vào <b>Automation</b> để tắt hoặc chỉnh sửa Flow <b>"{blockingFlowName}"</b> trước khi thực hiện lại.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );

                    setConfirmModal({
                        isOpen: true,
                        title: 'KHÔNG THỂ XÓA',
                        message: errorMsg,
                        variant: 'warning', // Change to warning/info style
                        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })), // Just close
                        confirmLabel: 'Đã hiểu'
                    });
                }
            }
        });
    };

    const handleViewMembers = async (tag: Tag, page = 1, search = '', status = 'all') => {
        setLoadingMembers(true);
        const query = new URLSearchParams({
            tag: tag.name,
            page: page.toString(),
            limit: '20',
            search: search,
            status: status === 'has_phone' ? 'all' : status
        });
        if (status === 'has_phone') query.set('has_phone', '1');
        try {
            const res = await api.get<any>(`subscribers?${query.toString()}`);
            if (res.success) {
                if (res.data.pagination) {
                    setTagMembers(res.data.data || []);
                    setTagPagination(res.data.pagination);
                } else if (Array.isArray(res.data)) {
                    setTagMembers(res.data);
                    setTagPagination({ page: 1, limit: 20, total: res.data.length, totalPages: 1 });
                }
            } else {
                showToast('Không thể tải danh sách thành viên', 'error');
                setTagMembers([]);
            }
        } catch (err) {
            showToast('Lỗi kết nối khi tải thành viên', 'error');
            setTagMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleRemoveTags = async (subscriberIds: string[]) => {
        if (!viewingTag || subscriberIds.length === 0) return;

        const res = await api.post<any>('bulk_operations', {
            type: 'tag_remove',
            tag: viewingTag.name,
            subscriberIds: subscriberIds
        });

        if (res.success) {
            const idsToRemoveSet = new Set(subscriberIds);
            // Update Local Members List
            setTagMembers(prev => prev.filter(s => !idsToRemoveSet.has(s.id)));

            // Update Tags Counts Locally
            const newCount = Math.max(0, (viewingTag.subscriber_count || 0) - res.data.affected);
            setTags(prev => prev.map(t => t.id === viewingTag.id ? { ...t, subscriber_count: newCount } : t));
            setViewingTag(prev => prev ? { ...prev, subscriber_count: newCount } : null);

            showToast(`Đã gỡ nhãn khỏi ${res.data.affected} Khách hàng`);
        } else {
            showToast(res.message || 'Lỗi khi gỡ nhãn', 'error');
        }
    };

    const filteredTags = tags.filter(t =>
        (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in space-y-8 pb-40">
            <PageHero
                title={<>Tag <span className="text-orange-100/80">Classifier</span></>}
                subtitle="Phân loại Khách hàng tự động để cá nhân hóa chiến dịch và luồng Automation."
                showStatus={true}
                statusText="Tagging Engine Active"
                actions={[
                    {
                        label: 'Tạo nhãn',
                        icon: Plus,
                        onClick: () => setIsCreateModalOpen(true),
                        primary: true
                    },
                    {
                        label: 'Đồng bộ',
                        icon: RefreshCw,
                        onClick: fetchTags
                    }
                ]}
            />

            <div className="space-y-6">
                {/* MAIN CONTENT CONTAINER */}
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-5 md:p-8 min-h-[600px]">

                    {/* SEARCH & STATS BAR */}
                    <div className="flex items-center justify-between gap-4 mb-8">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm nhãn theo tên hoặc mô tả..."
                                className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                            />
                        </div>
                    </div>

                    {/* SECTION HEADER */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6 gap-4">
                        <div>
                            <h3 className="text-base lg:text-lg font-bold text-slate-800 uppercase tracking-tight">Danh sách Nhãn</h3>
                            <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Quản lý các nhãn phân loại Khách hàng.</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm">
                            Tags: {filteredTags.length}
                        </div>
                    </div>

                    {loading ? (
                        <CardGridSkeleton cols={4} rows={2} height={8} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTags.map(tag => (
                                <div
                                    key={tag.id}
                                    onClick={() => {
                                        setViewingTag(tag);
                                        setTagPagination(prev => ({ ...prev, page: 1 }));
                                        setTagSearch('');
                                    }}
                                    className="group bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all flex flex-col justify-between gap-4 relative overflow-hidden cursor-pointer"
                                >
                                    {/* Background Decorative Icon */}
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-emerald-600 group-hover:scale-110 transition-transform">
                                        <TagIcon className="w-16 h-16" />
                                    </div>

                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-6 transition-transform">
                                                <TagIcon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 leading-tight truncate pr-2 uppercase" title={tag.name}>{tag.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Users className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-500">{(tag.subscriber_count || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); startEdit(tag); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Sửa tên">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(e, tag); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Xóa">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        {tag.description ? (
                                            <p className="text-[11px] text-slate-400 font-medium line-clamp-1 leading-relaxed italic">{tag.description}</p>
                                        ) : (
                                            <p className="text-[10px] text-slate-300 font-medium italic">Không có mô tả...</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE TAG MODAL */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Kích hoạt Nhãn mới" size="md">
                <div className="space-y-6 pb-4">
                    <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Plus className="w-24 h-24 text-white" /></div>
                        <div className="relative z-10 text-white">
                            <h3 className="font-extrabold text-lg flex items-center gap-2"><TagIcon className="w-5 h-5" /> Quy chuẩn Nhãn (Tagging)</h3>
                            <p className="text-emerald-100 text-xs font-medium mt-1">Dùng để phân loại hành vi và tệp Khách hàng tiềm năng.</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên định danh (UPPERCASE_ID)</label>
                            <input
                                placeholder="VD: LIKED_POST_123..."
                                value={newTag.name}
                                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase placeholder:text-slate-300 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả hoặc Ghi chú</label>
                            <textarea
                                placeholder="VD: Nhãn này dùng cho Khách hàng tham gia workshop..."
                                value={newTag.description}
                                onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-300 outline-none focus:bg-white focus:border-emerald-500 transition-all resize-none h-24"
                            />
                        </div>

                        <Button fullWidth onClick={handleAdd} isLoading={isAdding} size="lg" className="rounded-xl h-12 bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 border-none transition-all">
                            Xác nhận Tạo nhãn
                        </Button>

                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">Lưu ý: Bạn nên sử dụng tên nhãn không dấu và cách nhau bởi dấu gạch dưới để hệ thống API dễ xử lý.</p>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* EDIT MODAL */}
            <Modal isOpen={!!editingTag} onClose={() => setEditingTag(null)} title="Cập nhật thông tin Nhãn" size="md"
                footer={<div className="flex justify-between w-full"><Button variant="ghost" onClick={() => setEditingTag(null)}>Hủy bỏ</Button><Button icon={Save} onClick={handleUpdate} isLoading={isUpdating}>Cập nhật hệ thống</Button></div>}>
                <div className="space-y-6">
                    {editingTag?.name !== editFormData.name.trim().toUpperCase().replace(/\s+/g, '_') && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold leading-relaxed"><b>CẢNH BÁO:</b> Bạn đang đổi tên ID nhãn. Hệ thống sẽ phải quét lại toàn bộ cơ sở dữ liệu để thay thế nhãn cũ cho Khách hàng.</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên nhãn (Mã ID)</label>
                            <input
                                value={editFormData.name}
                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase outline-none focus:bg-white focus:border-emerald-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả / Ghi chú</label>
                            <textarea
                                value={editFormData.description}
                                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-emerald-500 transition-all h-32 resize-none"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* VIEW MEMBERS MODAL */}
            <GroupDetailModal
                isOpen={!!viewingTag}
                onClose={() => { setViewingTag(null); setTagPagination({ page: 1, limit: 20, total: 0, totalPages: 1 }); setTagSearch(''); setTagStatus('all'); }}
                group={viewingTag ? { id: viewingTag.id, name: viewingTag.name, type: 'tag', count: viewingTag.subscriber_count || 0 } : null}
                members={tagMembers}
                totalCount={tagPagination.total}
                currentPage={tagPagination.page}
                totalPages={tagPagination.totalPages}
                loading={loadingMembers}
                onPageChange={(p) => setTagPagination(prev => ({ ...prev, page: p }))}
                onSearch={setTagSearch}
                onStatusFilter={(status) => { setTagStatus(status); setTagPagination(prev => ({ ...prev, page: 1 })); }}
                activeStatusFilter={tagStatus}
                onRemoveFromList={() => { }} // Not used for tags
                onRemoveFromTag={handleRemoveTags}
                onViewProfile={(sub) => setSelectedSubscriber(sub)}
            />

            {/* CUSTOMER PROFILE MODAL */}
            {selectedSubscriber && (
                <CustomerProfileModal
                    subscriber={selectedSubscriber}
                    onClose={() => setSelectedSubscriber(null)}
                    onUpdate={() => { handleViewMembers(viewingTag!); fetchTags(); }}
                    onDelete={() => { handleViewMembers(viewingTag!); fetchTags(); }}
                    allLists={[]}
                    allSegments={[]}
                    allFlows={[]}
                    allTags={tags}
                    checkMatch={() => false}
                    onAddToList={() => { }}
                    onRemoveFromList={() => { }}
                />
            )}

            {/* CONFIRM DELETE MODAL */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                confirmLabel={confirmModal.confirmLabel || "Xóa vĩnh viễn"}
                requireConfirmText={confirmModal.requireConfirmText}
            />


        </div>
    );
};

export default Tags;
