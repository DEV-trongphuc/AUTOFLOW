
import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Search, FolderOpen, Image, FileText, FileSpreadsheet,
    File as FileIcon, CheckCircle2, Loader2, RefreshCw,
    Download, AlertCircle, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api } from '../../services/storageAdapter';

interface LibraryFile {
    name: string;
    uniqueName: string;
    url: string;
    path: string;
    size: number;
    type: string;
    modified_at: number;
}

interface FileLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called with selected files; caller should assign logic & id */
    onSelect: (files: LibraryFile[]) => void;
    /** Allow picking multiple files */
    multi?: boolean;
}

type FilterType = 'all' | 'image' | 'pdf' | 'doc';

const PAGE_SIZE = 20;

const IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const PDFS   = ['pdf'];
const DOCS   = ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'zip'];

function getFilter(ext: string): FilterType {
    if (IMAGES.includes(ext)) return 'image';
    if (PDFS.includes(ext))   return 'pdf';
    return 'doc';
}

function FileTypeIcon({ ext, className = '' }: { ext: string; className?: string }) {
    if (IMAGES.includes(ext)) return <Image    className={`w-5 h-5 text-violet-500 ${className}`} />;
    if (PDFS.includes(ext))   return <FileText className={`w-5 h-5 text-rose-500   ${className}`} />;
    if (['xls', 'xlsx', 'csv'].includes(ext))
        return <FileSpreadsheet className={`w-5 h-5 text-emerald-500 ${className}`} />;
    return <FileIcon className={`w-5 h-5 text-slate-400 ${className}`} />;
}

function iconBg(ext: string): string {
    if (IMAGES.includes(ext)) return 'bg-violet-50 border-violet-100';
    if (PDFS.includes(ext))   return 'bg-rose-50   border-rose-100';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-emerald-50 border-emerald-100';
    return 'bg-slate-50 border-slate-100';
}

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

const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',   label: 'Tất cả'   },
    { key: 'image', label: 'Hình ảnh' },
    { key: 'pdf',   label: 'PDF'      },
    { key: 'doc',   label: 'Tài liệu' },
];

const FileLibraryModal: React.FC<FileLibraryModalProps> = ({
    isOpen, onClose, onSelect, multi = true
}) => {
    const [files, setFiles]         = useState<LibraryFile[]>([]);
    const [loading, setLoading]     = useState(false);
    const [search, setSearch]       = useState('');
    const [filter, setFilter]       = useState<FilterType>('all');
    const [selected, setSelected]   = useState<Set<string>>(new Set());
    const [error, setError]         = useState('');
    const [page, setPage]           = useState(1);
    // Delete states
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [deleting, setDeleting]           = useState<string | null>(null);
    const [deleteError, setDeleteError]     = useState<string | null>(null);
    // Bulk delete states
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [bulkDeleting, setBulkDeleting]           = useState(false);
    const [bulkDeleteError, setBulkDeleteError]     = useState('');

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get<LibraryFile[]>('upload?route=library');
            if (res.success) setFiles(res.data || []);
            else setError('Không thể tải thư viện file.');
        } catch {
            setError('Lỗi kết nối.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelected(new Set());
            setSearch('');
            setFilter('all');
            setPage(1);
            fetchFiles();
        }
    }, [isOpen, fetchFiles]);

    // Reset page on search or filter change
    useEffect(() => { setPage(1); }, [search, filter]);

    if (!isOpen) return null;

    const filtered = files.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || getFilter(f.type) === filter;
        return matchSearch && matchFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage   = Math.min(page, totalPages);
    const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const toggleSelect = (uniqueName: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(uniqueName)) {
                next.delete(uniqueName);
            } else {
                if (!multi) next.clear();
                next.add(uniqueName);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const picked = files.filter(f => selected.has(f.uniqueName));
        onSelect(picked);
        onClose();
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
            const res = await api.get<{ deleted: string }>(`upload?route=delete&file=${encodeURIComponent(uniqueName)}`);
            if (res.success) {
                setFiles(prev => prev.filter(f => f.uniqueName !== uniqueName));
                setSelected(prev => { const n = new Set(prev); n.delete(uniqueName); return n; });
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

    const handleBulkDelete = async () => {
        const toDelete = Array.from(selected);
        setBulkDeleting(true);
        setBulkDeleteError('');
        let failed = 0;
        for (const uniqueName of toDelete) {
            try {
                const res = await api.get<{ deleted: string }>(`upload?route=delete&file=${encodeURIComponent(uniqueName)}`);
                if (res.success) {
                    setFiles(prev => prev.filter(f => f.uniqueName !== uniqueName));
                    setSelected(prev => { const n = new Set(prev); n.delete(uniqueName); return n; });
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }
        setBulkDeleting(false);
        setBulkDeleteConfirm(false);
        if (failed > 0) {
            setBulkDeleteError(`Xóa thất bại ${failed} file.`);
        } else {
            // [FIX P26-F4] Clear selection after successful bulk delete
            // Previously: files removed from list but selected Set still had old keys → badge showed stale count
            setSelected(new Set());
        }

    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 inset-y-6 md:inset-x-[5%] lg:inset-x-[10%] xl:inset-x-[15%] z-[201] flex flex-col bg-white rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
                            <FolderOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Thư viện File</h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {files.length} file đã upload — chọn để đính kèm
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchFiles}
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
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên file..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
                        />
                    </div>

                    {/* Filter pills */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                    filter === f.key
                                        ? 'bg-violet-600 text-white shadow'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* File Grid */}
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
                                <button onClick={fetchFiles} className="text-xs text-violet-600 underline">Thử lại</button>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                <FolderOpen className="w-12 h-12 text-slate-200" />
                                <p className="text-sm font-medium">
                                    {search ? 'Không tìm thấy file nào' : 'Thư viện trống'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {search ? 'Thử từ khóa khác.' : 'Upload file đính kèm để chúng xuất hiện ở đây.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {paged.map(file => {
                                const isSelected = selected.has(file.uniqueName);
                                const isImage = IMAGES.includes(file.type);
                                return (
                                    <div
                                        key={file.uniqueName}
                                        onClick={() => toggleSelect(file.uniqueName)}
                                        className={`
                                            group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden
                                            ${isSelected
                                                ? 'border-violet-500 bg-violet-50/40 ring-2 ring-violet-100 shadow-lg shadow-violet-100'
                                                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'}
                                        `}
                                    >
                                        {/* Thumbnail / Icon area */}
                                        <div className="aspect-square relative overflow-hidden bg-slate-50">
                                            {isImage ? (
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center border-b ${iconBg(file.type)}`}>
                                                    <FileTypeIcon ext={file.type} className="!w-10 !h-10 opacity-70" />
                                                </div>
                                            )}

                                            {/* Extension badge */}
                                            <div className="absolute top-2 left-2">
                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${iconBg(file.type)}`}>
                                                    {file.type}
                                                </span>
                                            </div>

                                            {/* Selection indicator */}
                                            <div className={`absolute top-2 right-2 transition-all duration-200 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-60 group-hover:scale-90'}`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow ${isSelected ? 'bg-violet-600' : 'bg-white/90 border border-slate-200'}`}>
                                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>
                                            {/* Overlay on hover */}
                                            {!isSelected && (
                                                <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/5 transition-colors" />
                                            )}

                                            {/* Delete - inside thumbnail zone */}
                                            {confirmDelete === file.uniqueName ? (
                                                <div
                                                    className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 bg-white/95 backdrop-blur-sm border-t border-rose-200 px-2 py-1.5 z-20"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span className="text-[9px] font-bold text-rose-600 truncate">
                                                        {deleteError === file.uniqueName ? 'Lỗi! Thử lại?' : 'Xóa file này?'}
                                                    </span>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button
                                                            onClick={e => handleDeleteConfirm(e, file.uniqueName)}
                                                            disabled={deleting === file.uniqueName}
                                                            className="text-[9px] font-black text-white bg-rose-500 hover:bg-rose-600 rounded px-2 py-0.5 transition-colors disabled:opacity-60"
                                                        >
                                                            {deleting === file.uniqueName ? '...' : 'Xóa'}
                                                        </button>
                                                        <button
                                                            onClick={handleDeleteCancel}
                                                            className="text-[9px] font-bold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100"
                                                        >
                                                            Không
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={e => handleDeleteClick(e, file.uniqueName)}
                                                    title="Xóa file"
                                                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-3">
                                            <p className="text-[10px] font-bold text-slate-700 truncate leading-tight mb-1" title={file.name}>
                                                {file.name}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-slate-400 font-mono">{formatSize(file.size)}</span>
                                                <span className="text-[9px] text-slate-400">{formatDate(file.modified_at)}</span>
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
                            <p className="font-bold text-slate-800 text-sm">
                                Xóa {selected.size} file đã chọn?
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Hành động này không thể hoàn tác.</p>
                            {bulkDeleteError && (
                                <p className="text-xs text-rose-500 font-bold mt-2">{bulkDeleteError}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setBulkDeleteConfirm(false); setBulkDeleteError(''); }}
                                disabled={bulkDeleting}
                                className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
                            >
                                Không
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-rose-200"
                            >
                                {bulkDeleting
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xóa...</>
                                    : <><Trash2 className="w-3.5 h-3.5" /> Xóa hết</>}
                            </button>
                        </div>
                    </div>
                )}

                <div className="shrink-0 px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="text-xs text-slate-500 font-medium">
                        {selected.size > 0 ? (
                            <span className="flex items-center gap-1.5 text-violet-700 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                Đã chọn {selected.size} file
                            </span>
                        ) : (
                            <span className="text-slate-400">
                                {filtered.length > 0 ? `${filtered.length} file · Trang ${safePage}/${totalPages}` : 'Chưa chọn file nào'}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Trước
                                </button>
                                <span className="text-xs font-bold text-slate-700 min-w-[60px] text-center">
                                    {safePage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Sau <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        {/* Bulk delete — only when files selected */}
                        {selected.size > 0 && (
                            <button
                                onClick={() => { setBulkDeleteError(''); setBulkDeleteConfirm(true); }}
                                className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Xóa ({selected.size})
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.size === 0}
                            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                                selected.size > 0
                                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200 hover:scale-[1.02]'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Chọn {selected.size > 0 ? `(${selected.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FileLibraryModal;
