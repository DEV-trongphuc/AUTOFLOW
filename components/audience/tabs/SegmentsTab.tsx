
import React, { useState } from 'react';
import { Layers, RefreshCw, Filter, Edit3, Trash2, Check, X, Scissors, Eraser, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../common/Card';
import Skeleton from '../../common/Skeleton';
import { Segment } from '../../../types';


interface SegmentsTabProps {
    loading?: boolean;
    segments: Segment[];
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onView: (segment: Segment) => void;
    onEdit: (segment: Segment) => void;
    onDelete: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onSplit?: (segment: Segment) => void;
    onRefresh?: () => void;
    onCleanup: (segment: Segment) => void;
}

interface SegmentRowProps {
    seg: Segment;
    isSelected: boolean;
    onView: (seg: Segment) => void;
    onToggleSelect: (id: string) => void;
    onSplit: ((seg: Segment) => void) | undefined;
    onCleanup: (seg: Segment) => void;
    onEdit: (seg: Segment) => void;
    onDelete: (id: string) => void;
}

const SegmentRow = React.memo<SegmentRowProps>(({ seg, isSelected, onView, onToggleSelect, onSplit, onCleanup, onEdit, onDelete }) => {
    return (
        <tr
            className={`group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer ${isSelected ? 'bg-orange-50/20' : ''}`}
            onClick={() => onView(seg)}
        >
            <td className="px-6 py-5 pl-8 text-center" onClick={(e) => { e.stopPropagation(); onToggleSelect(seg.id); }}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]"
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
            </td>
            <td className="px-6 py-5 pl-2">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ca7900] flex items-center justify-center shrink-0 border border-orange-100 group-hover:bg-[#ffa900] group-hover:text-white transition-all">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-[#ca7900] transition-colors">{seg.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">{seg.description}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate max-w-[150px]">
                        {seg.criteria && seg.criteria.startsWith('[') ? 'Complex Logic' : (seg.criteria || 'Custom')}
                    </span>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-bold uppercase tracking-wide">
                    <RefreshCw className="w-3 h-3 animate-spin-slow" />
                    Auto-Sync
                </div>
            </td>
            <td className="px-6 py-5 text-right">
                <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{(seg.count || 0).toLocaleString()}</span>
            </td>
            <td className="px-6 py-5 text-right pr-8">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSplit && onSplit(seg); }}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                        title="Tách phân khúc"
                    >
                        <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCleanup(seg); }}
                        className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all"
                        title="Dọn dẹp phân khúc"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(seg); }}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="Chỉnh sửa cấu hình"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(seg.id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                        title="Xóa phân khúc"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

const SegmentSkeleton = () => (
    <tr>
        <td className="px-6 py-5 pl-8 text-center"><Skeleton variant="rounded" width={20} height={20} className="rounded mx-auto" /></td>
        <td className="px-6 py-5">
            <div className="flex items-center gap-4">
                <Skeleton variant="rounded" width={40} height={40} className="rounded-xl" />
                <div className="space-y-2">
                    <Skeleton variant="text" width={140} height={16} />
                    <Skeleton variant="text" width={100} height={12} />
                </div>
            </div>
        </td>
        <td className="px-6 py-5">
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={14} height={14} />
                <Skeleton variant="text" width={100} />
            </div>
        </td>
        <td className="px-6 py-5"><Skeleton variant="text" width={80} /></td>
        <td className="px-6 py-5 text-right"><Skeleton variant="rounded" width={50} height={24} className="rounded-full ml-auto" /></td>
        <td className="px-6 py-5 text-right pr-8">
            <div className="flex justify-end gap-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} variant="circular" width={28} height={28} />)}
            </div>
        </td>
    </tr>
);

const SegmentsTab: React.FC<SegmentsTabProps> = ({ loading, segments, currentPage = 1, totalPages = 1, onPageChange, onView, onEdit, onDelete, onBulkDelete, onSplit, onRefresh, onCleanup }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelectAll = React.useCallback(() => {
        setSelectedIds(prev => {
            const allSelected = segments.length > 0 && segments.every(s => prev.has(s.id));
            if (allSelected) {
                return new Set();
            } else {
                return new Set(segments.map(s => s.id));
            }
        });
    }, [segments]);

    const toggleSelectOne = React.useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const handleBulkDelete = React.useCallback(() => {
        if (onBulkDelete) {
            onBulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    }, [onBulkDelete, selectedIds]);

    const handleCancelSelection = React.useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isAllSelected = segments.length > 0 && segments.every(s => selectedIds.has(s.id));

    return (
        <Card noPadding className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-left sticky top-0 z-20 backdrop-blur-sm">
                        {selectedIds.size > 0 ? (
                            <tr className="bg-[#fffbf0] border-b border-orange-200 shadow-sm animate-in fade-in duration-200">
                                <th colSpan={6} className="px-4 py-3">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <button onClick={toggleSelectAll} className="p-1 hover:bg-orange-100 rounded text-orange-600 transition-colors" title="Bỏ chọn tất cả">
                                                <div className="relative flex items-center justify-center">
                                                    <input type="checkbox" checked readOnly className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-orange-400 bg-orange-400" />
                                                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none" />
                                                </div>
                                            </button>
                                            <span className="text-xs font-bold text-slate-700">Đã chọn <span className="text-orange-600 font-black text-sm">{selectedIds.size.toLocaleString()}</span> phân khúc</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleBulkDelete}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Xóa nhanh</span>
                                            </button>
                                            <button
                                                onClick={handleCancelSelection}
                                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600"
                                                title="Hủy chọn"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="px-6 py-4 w-10 pl-8 text-center">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]" />
                                        <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{"T\u00EAn ph\u00E2n kh\u00FAc"}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"\u0110i\u1EC1u ki\u1EC7n l\u1ECDc"}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"\u0110\u1ED3ng b\u1ED9"}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{"K\u1EBFt qu\u1EA3"}</th>
                                <th className="px-6 py-4 w-36 text-right pr-8">{"Thao t\u00E1c"}</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <SegmentSkeleton key={i} />)
                        ) : segments.map(seg => (
                            <SegmentRow
                                key={seg.id}
                                seg={seg}
                                isSelected={selectedIds.has(seg.id)}
                                onView={onView}
                                onToggleSelect={toggleSelectOne}
                                onSplit={onSplit}
                                onCleanup={onCleanup}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                        {!loading && segments.length === 0 && (
                            <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">{"Kh\u00F4ng t\u00ECm th\u1EA5y ph\u00E2n kh\u00FAc n\u00E0o."}</td></tr>
                        )}
                    </tbody>
                </table>

            </div>
            {onPageChange && totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">Trang <span className="font-bold text-slate-800">{(currentPage || 1).toLocaleString()}</span> / {(totalPages || 1).toLocaleString()}</p>

                    <div className="flex gap-2">
                        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">{(currentPage || 1).toLocaleString()} / {(totalPages || 1).toLocaleString()}</span>

                        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default SegmentsTab;

