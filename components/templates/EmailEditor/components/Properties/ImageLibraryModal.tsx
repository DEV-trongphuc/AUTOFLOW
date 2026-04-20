
// components/templates/EmailEditor/components/Properties/ImageLibraryModal.tsx
// Style synced with FileLibraryModal (common/FileLibraryModal.tsx)
import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Search, FolderOpen, Image as ImageIcon, CheckCircle2,
    Loader2, RefreshCw, Download, AlertCircle, Trash2, Upload,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../../services/storageAdapter';

interface ImageLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (url: string) => void;
}

interface ImageFile {
    name: string;
    uniqueName: string;
    url: string;
    size: number;
    date: number;        // unix seconds (from list_images) OR modified_at
    modified_at?: number;
}

const PAGE_SIZE = 20;

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(unixSec: number) {
    return new Date(unixSec * 1000).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [images, setImages]           = useState<ImageFile[]>([]);
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState('');
    const [page, setPage]               = useState(1);
    const [uploading, setUploading]     = useState(false);
    const [error, setError]             = useState('');
    // Single delete states
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting]           = useState<string | null>(null);
    const [deleteError, setDeleteError]     = useState<string | null>(null);
    // Multi-select & bulk delete
    const [selected, setSelected]               = useState<Set<string>>(new Set());
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [bulkDeleting, setBulkDeleting]           = useState(false);
    const [bulkDeleteError, setBulkDeleteError]     = useState('');

    const fetchImages = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Try the shared library endpoint first (returns uniqueName)
            const res = await api.get<ImageFile[]>('upload?route=library');
            if (res.success) {
                const imgs = (res.data || []).filter((f: any) => {
                    const ext = (f.type || '').toLowerCase();
                    return ['jpg','jpeg','png','gif','webp'].includes(ext);
                });
                setImages(imgs);
            } else {
                // Fall back to legacy list_images endpoint
                const res2 = await api.get<any[]>('list_images');
                if (res2.success) {
                    setImages((res2.data || []).map((f: any) => ({
                        name: f.name,
                        uniqueName: f.name,
                        url: f.url,
                        size: f.size ?? 0,
                        date: f.date ?? 0,
                        modified_at: f.date ?? 0
                    })));
                } else {
                    setError('Không thể tải danh sách ảnh');
                }
            }
        } catch {
            setError('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setSearch('');
            setSelected(new Set());
            fetchImages();
        }
    }, [isOpen, fetchImages]);

    // Reset page when search changes
    useEffect(() => { setPage(1); }, [search]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post<any>('upload', formData);
            if (res.success) {
                toast.success('Upload ảnh thành công');
                fetchImages();
                e.target.value = '';
            } else {
                toast.error(res.message || 'Upload thất bại');
            }
        } catch {
            toast.error('Lỗi upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, uniqueName: string) => {
        e.stopPropagation();
        setDeleteError(null);
        setConfirmDelete(uniqueName);
    };

    const handleDeleteConfirm = async (e: React.MouseEvent, uniqueName: string) => {
        e.stopPropagation();
        setDeleting(uniqueName);
        setDeleteError(null);
        try {
            const res = await api.get<any>(`upload?route=delete&file=${encodeURIComponent(uniqueName)}`);
            if (res.success) {
                setImages(prev => prev.filter(f => f.uniqueName !== uniqueName));
                toast.success('Đã xóa ảnh');
            } else {
                setDeleteError(uniqueName);
            }
        } catch {
            setDeleteError(uniqueName);
        } finally {
            setDeleting(null);
            setConfirmDelete(null);
        }
    };

    const handleDeleteCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete(null);
        setDeleteError(null);
    };

    const toggleSelect = (uniqueKey: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            if (n.has(uniqueKey)) n.delete(uniqueKey); else n.add(uniqueKey);
            return n;
        });
    };

    const handleBulkDelete = async () => {
        const toDelete = Array.from(selected);
        setBulkDeleting(true);
        setBulkDeleteError('');
        let failed = 0;
        for (const uniqueName of toDelete) {
            try {
                const res = await api.get<any>(`upload?route=delete&file=${encodeURIComponent(uniqueName)}`);
                if (res.success) {
                    setImages(prev => prev.filter(f => f.uniqueName !== uniqueName));
                    setSelected(prev => { const n = new Set(prev); n.delete(uniqueName); return n; });
                } else { failed++; }
            } catch { failed++; }
        }
        setBulkDeleting(false);
        setBulkDeleteConfirm(false);
        if (failed > 0) setBulkDeleteError(`Xóa thất bại ${failed} ảnh.`);
        else toast.success(`Đã xóa ${toDelete.length} ảnh`);
    };

    if (!isOpen) return null;

    const filtered = images.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-2 md:top-4 bottom-2 md:bottom-4 md:inset-x-[5%] lg:inset-x-[10%] xl:inset-x-[15%] z-[9999] flex flex-col bg-white rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Thư viện Hình ảnh</h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {images.length} ảnh đã upload — click để chọn
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Upload button */}
                        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border shadow-sm ${uploading ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100'}`}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {uploading ? 'Đang upload...' : 'Upload ảnh'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                        </label>
                        <button
                            onClick={fetchImages}
                            disabled={loading}
                            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Tải lại"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên ảnh..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
                        />
                    </div>
                    {filtered.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {filtered.length} ảnh
                        </span>
                    )}
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                <p className="text-xs font-medium">Đang tải thư viện...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-rose-500">
                                <AlertCircle className="w-8 h-8" />
                                <p className="text-xs font-medium">{error}</p>
                                <button onClick={fetchImages} className="text-xs text-violet-600 underline">Thử lại</button>
                            </div>
                        </div>
                    ) : paged.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <FolderOpen className="w-12 h-12 text-slate-200" />
                                <p className="text-sm font-medium">
                                    {search ? 'Không tìm thấy ảnh nào' : 'Chưa có ảnh nào'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {search ? 'Thử từ khóa khác.' : 'Upload ảnh để chúng xuất hiện ở đây.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {paged.map(file => {
                                const uniqueKey = file.uniqueName || file.url;
                                return (
                                    <div
                                        key={uniqueKey}
                                        onClick={(e) => {
                                            if (selected.size > 0 || e.shiftKey || e.ctrlKey || e.metaKey) {
                                                toggleSelect(uniqueKey);
                                            } else {
                                                if (onSelect) { onSelect(file.url); onClose(); }
                                            }
                                        }}
                                        className={`group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
                                            selected.has(uniqueKey)
                                                ? 'border-rose-400 ring-2 ring-rose-100 shadow-lg shadow-rose-50'
                                                : 'border-slate-100 bg-white hover:border-violet-300 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-square relative overflow-hidden bg-slate-50">
                                            <img
                                                src={file.url}
                                                alt={file.name}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/10 transition-colors" />

                                            {/* Selection indicator */}
                                            <div 
                                                className={`absolute top-2 right-2 transition-all duration-200 cursor-pointer ${
                                                    selected.has(uniqueKey) ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-60 group-hover:scale-90'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(uniqueKey);
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow ${
                                                    selected.has(uniqueKey) ? 'bg-rose-500' : 'bg-white/90 border border-slate-200'
                                                }`}>
                                                    {selected.has(uniqueKey) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>

                                            {/* Single delete — inside thumbnail to avoid overflow clipping */}
                                            {confirmDelete === uniqueKey ? (
                                                <div
                                                    className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 bg-white/95 backdrop-blur-sm border-t border-rose-200 px-2 py-1.5 z-20"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span className="text-[9px] font-bold text-rose-600 truncate">
                                                        {deleteError === uniqueKey ? 'Lỗi! Thử lại?' : 'Xóa ảnh này?'}
                                                    </span>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={e => handleDeleteConfirm(e, uniqueKey)} disabled={deleting === uniqueKey} className="text-[9px] font-black text-white bg-rose-500 hover:bg-rose-600 rounded px-2 py-0.5 disabled:opacity-60">
                                                            {deleting === uniqueKey ? '...' : 'Xóa'}
                                                        </button>
                                                        <button onClick={handleDeleteCancel} className="text-[9px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100">Không</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={e => handleDeleteClick(e, uniqueKey)}
                                                    title="Xóa ảnh"
                                                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-2.5">
                                            <p className="text-[10px] font-bold text-slate-700 truncate leading-tight mb-1" title={file.name}>
                                                {file.name}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-slate-400 font-mono">{formatSize(file.size)}</span>
                                                <span className="text-[9px] text-slate-400">{formatDate(file.modified_at ?? file.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bulk delete confirm overlay */}
                {bulkDeleteConfirm && (
                    <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-[28px]">
                        <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
                            <Trash2 className="w-7 h-7 text-rose-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-800 text-sm">Xóa {selected.size} ảnh đã chọn?</p>
                            <p className="text-xs text-slate-400 mt-1">Hành động này không thể hoàn tác.</p>
                            {bulkDeleteError && <p className="text-xs text-rose-500 font-bold mt-2">{bulkDeleteError}</p>}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setBulkDeleteConfirm(false); setBulkDeleteError(''); }} disabled={bulkDeleting}
                                className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50">
                                Không
                            </button>
                            <button onClick={handleBulkDelete} disabled={bulkDeleting}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-rose-200">
                                {bulkDeleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xóa...</> : <><Trash2 className="w-3.5 h-3.5" /> Xóa hết</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer — pagination + bulk delete */}
                <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="text-xs font-medium">
                        {selected.size > 0 ? (
                            <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                Đã chọn {selected.size} ảnh
                            </span>
                        ) : (
                            <span className="text-slate-400">
                                {filtered.length > 0 ? `Trang ${safePage}/${totalPages} · ${filtered.length} ảnh` : 'Chưa có ảnh nào'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5" /> Trước
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-2">{safePage} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Sau <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {selected.size > 0 && (
                            <button onClick={() => { setBulkDeleteError(''); setBulkDeleteConfirm(true); }}
                                className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                                Xóa ({selected.size})
                            </button>
                        )}
                        {selected.size > 0 && (
                            <button onClick={() => setSelected(new Set())}
                                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                Bỏ chọn
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImageLibraryModal;
