import * as React from 'react';
import { useState } from 'react';
import { 
    Trash2, Edit3, Calendar, UserPlus, 
    List, Check, X, Scissors, Eraser, 
    ChevronLeft, ChevronRight, Upload, GitMerge
} from 'lucide-react';
import Card from '../../common/Card';
import Skeleton from '../../common/Skeleton';

interface ListRowProps {
    list: any;
    isSelected: boolean;
    onView: (list: any) => void;
    onToggleSelect: (id: string) => void;
    onEdit: (list: any) => void;
    onDelete: (id: string) => void;
    onCleanup: (list: any) => void;
    onSplit?: (list: any) => void;
}

const ListRow = React.memo(({ list, isSelected, onView, onToggleSelect, onEdit, onDelete, onCleanup, onSplit }: ListRowProps) => {
    return (
        <tr 
            onClick={() => onView(list)}
            className={`group hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`}
        >
            <td className="px-6 py-5 pl-8 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => onToggleSelect(list.id)}
                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-600" 
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
            </td>
            <td className="px-6 py-5 pl-2">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${list.source === 'Google Sheets'
                        ? 'bg-[#ebfdf4] border-[#d4f7e3]'
                        : list.source === 'MISA CRM'
                            ? 'bg-blue-50 border-blue-100'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                        {list.source === 'Google Sheets' ? (
                            <img src="https://mailmeteor.com/logos/assets/PNG/Google_Sheets_Logo_512px.png" className="w-5 h-5 object-contain" alt="GS" />
                        ) : list.source === 'MISA CRM' ? (
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlIpztniIEN5ZYvLlwwqBvhzdodvu2NfPSbg&s" className="w-5 h-5 object-contain rounded" alt="MISA" />
                        ) : (
                            <List className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{list.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {list.type === 'sync' ? 'Sync List' : 'Static List'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                    {list.source === 'Google Sheets' ? (
                        <img src="https://mailmeteor.com/logos/assets/PNG/Google_Sheets_Logo_512px.png" className="w-3 h-3 object-contain" alt="GS" />
                    ) : list.source === 'MISA CRM' ? (
                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlIpztniIEN5ZYvLlwwqBvhzdodvu2NfPSbg&s" className="w-3 h-3 object-contain rounded-sm" alt="MISA" />
                    ) : list.source === 'Import CSV' ? (
                        <Upload className="w-3 h-3" />
                    ) : (
                        <UserPlus className="w-3 h-3" />
                    )}
                    {list.source}
                </span>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {list.created}
                </div>
            </td>
            <td className="px-6 py-5 text-right">
                <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{list.count.toLocaleString()}</span>
            </td>
            <td className="px-6 py-5 text-right pr-8">
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSplit && onSplit(list); }}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                        title={'\u0054\u00E1\u0063\u0068\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068'}
                    >
                        <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(list); }}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title={'\u0043\u0068\u1EC9\u006E\u0068\u0020\u0073\u1EED\u0061\u0020\u0063\u1EA5\u0075\u0020\u0068\u00EC\u006E\u0068'}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onCleanup(list); }}
                        className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all"
                        title={'\u0044\u1ECD\u006E\u0020\u0064\u1EB9\u0070\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068'}
                    >
                        <Eraser className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(list.id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                        title={'\u0058\u00F3\u0061\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068'}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

const ListSkeleton = () => (
    <tr>
        <td className="px-6 py-5 pl-8 text-center"><Skeleton variant="rounded" width={20} height={20} className="rounded mx-auto" /></td>
        <td className="px-6 py-5">
            <div className="flex items-center gap-4">
                <Skeleton variant="rounded" width={40} height={40} className="rounded-xl" />
                <div className="space-y-2">
                    <Skeleton variant="text" width={140} height={16} />
                    <Skeleton variant="text" width={60} height={12} />
                </div>
            </div>
        </td>
        <td className="px-6 py-5"><Skeleton variant="rounded" width={100} height={24} className="rounded-lg" /></td>
        <td className="px-6 py-5"><Skeleton variant="text" width={100} /></td>
        <td className="px-6 py-5 text-right"><Skeleton variant="rounded" width={50} height={24} className="rounded-full ml-auto" /></td>
        <td className="px-6 py-5 text-right pr-8">
            <div className="flex justify-end gap-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} variant="circular" width={28} height={28} />)}
            </div>
        </td>
    </tr>
);

interface ListsTabProps {
    loading: boolean;
    lists: any[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onView: (list: any) => void;
    onEdit: (list: any) => void;
    onDelete: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onMerge?: (ids: string[]) => void;
    onCleanup: (list: any) => void;
    onSplit?: (list: any) => void;
}

const ListsTab: React.FC<ListsTabProps> = ({ loading, lists, currentPage = 1, totalPages = 1, onPageChange, onView, onEdit, onDelete, onBulkDelete, onMerge, onCleanup, onSplit }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelectAll = React.useCallback(() => {
        setSelectedIds(prev => {
            const allSelected = lists.length > 0 && lists.every(l => prev.has(l.id));
            if (allSelected) {
                return new Set();
            } else {
                return new Set(lists.map(l => l.id));
            }
        });
    }, [lists]);

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

    const handleMerge = React.useCallback(() => {
        if (onMerge && selectedIds.size >= 2) {
            onMerge(Array.from(selectedIds));
        }
    }, [onMerge, selectedIds]);

    const handleCancelSelection = React.useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isAllSelected = lists.length > 0 && lists.every(l => selectedIds.has(l.id));

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
                                            <button type="button" onClick={toggleSelectAll} className="p-1 hover:bg-orange-100 rounded text-orange-600 transition-colors" title={'\u0042\u1ECF\u0020\u0063\u0068\u1ECD\u006E\u0020\u0074\u1EA5\u0074\u0020\u0063\u1EA3'}>
                                                <div className="relative flex items-center justify-center">
                                                    <input type="checkbox" checked readOnly className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-orange-400 bg-orange-400" />
                                                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none" />
                                                </div>
                                            </button>
                                            <span className="text-xs font-bold text-slate-700">{'\u0110\u00E3\u0020\u0063\u0068\u1ECD\u006E'} <span className="text-orange-600 font-black text-sm">{selectedIds.size.toLocaleString()}</span> danh s{"\u00E1"}ch</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedIds.size >= 2 && onMerge && (
                                                <button
                                                    type="button"
                                                    onClick={handleMerge}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                >
                                                    <GitMerge className="w-3.5 h-3.5" />
                                                    <span>{'\u0047\u1ED9\u0070\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068'}</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleBulkDelete}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>{'\u0058\u00F3\u0061\u0020\u006E\u0068\u0061\u006E\u0068'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelSelection}
                                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600"
                                                title={'\u0048\u1EE7\u0079\u0020\u0063\u0068\u1ECD\u006E'}
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
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">{'\u0054\u00EA\u006E\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068'}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{'\u004E\u0067\u0075\u1ED3\u006E'} (Source)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{'\u004E\u0067\u00E0\u0079\u0020\u0074\u1EA1\u006F'}</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{'\u0053\u1ED1\u0020\u006C\u01B0\u1EE3\u006E\u0067'}</th>
                                <th className="px-6 py-4 w-28 text-right pr-8">{'\u0054\u0068\u0061\u006F\u0020\u0074\u00E1\u0063'}</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => <ListSkeleton key={i} />)
                        ) : lists.map(list => (
                            <ListRow
                                key={list.id}
                                list={list}
                                isSelected={selectedIds.has(list.id)}
                                onView={onView}
                                onToggleSelect={toggleSelectOne}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onCleanup={onCleanup}
                                onSplit={onSplit}
                            />
                        ))}
                        {!loading && lists.length === 0 && (
                            <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">{'\u004B\u0068\u00F4\u006E\u0067\u0020\u0074\u00EC\u006D\u0020\u0074\u0068\u1EA5\u0079\u0020\u0064\u0061\u006E\u0068\u0020\u0073\u00E1\u0063\u0068\u0020\u006E\u00E0\u006F\u002E'}</td></tr>
                        )}
                    </tbody>
                </table>

            </div>
            {onPageChange && totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">Trang <span className="font-bold text-slate-800">{currentPage.toLocaleString()}</span> / {totalPages.toLocaleString()}</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">{currentPage.toLocaleString()} / {totalPages.toLocaleString()}</span>
                        <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default ListsTab;
