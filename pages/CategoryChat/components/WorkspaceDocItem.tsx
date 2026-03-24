import React from 'react';
import { CheckCircle, Globe, Save, Download, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import { FileAttachment } from '../types';
import { formatFileSize } from '../utils';

interface WorkspaceDocItemProps {
    doc: FileAttachment;
    isContextSelected: boolean;
    isCodeMode: boolean;
    onContextMenu: (e: React.MouseEvent) => void;
    onClick: () => void;
    onMakeGlobal: (doc: FileAttachment) => void;
    onSaveSnippet: (doc: FileAttachment) => void;
    onDelete: (doc: FileAttachment) => void;
}

const WorkspaceDocItem = React.memo(({
    doc,
    isContextSelected,
    isCodeMode,
    onContextMenu,
    onClick,
    onMakeGlobal,
    onSaveSnippet,
    onDelete
}: WorkspaceDocItemProps) => {
    const isVirtual = doc.previewUrl?.startsWith('virtual://') || doc.name.startsWith('preview_');
    return (
        <div
            onContextMenu={onContextMenu}
            onClick={onClick}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden ${isContextSelected
                ? 'bg-brand/5 border-brand shadow-md shadow-brand/10'
                : (isCodeMode ? 'bg-slate-800 border-slate-700 hover:border-brand hover:border-opacity-30' : 'bg-white border-slate-100 hover:border-brand hover:border-opacity-20 hover:shadow-lg')
                }`}
        >
            {isContextSelected && (
                <div className="absolute top-2 left-2 z-10 p-0.5 animate-in zoom-in-50 duration-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                {!isVirtual && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMakeGlobal(doc);
                        }}
                        className="p-2 rounded-xl border shadow-sm bg-white border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all font-bold"
                        title="Make Global"
                    >
                        <Globe className="w-3.5 h-3.5" />
                    </button>
                )}
                {isVirtual ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSaveSnippet(doc);
                        }}
                        className={`p-2 rounded-xl border shadow-sm transition-all font-bold ${isCodeMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10' : 'bg-white border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        title="Lưu nhanh (Quick Save)"
                    >
                        <Save className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (doc.previewUrl) window.open(doc.previewUrl, '_blank');
                        }}
                        className={`p-2 rounded-xl border shadow-sm transition-all font-bold ${isCodeMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10' : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                        title="Tải xuống"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc);
                    }}
                    className={`p-2 rounded-xl border shadow-sm transition-all font-bold ${isCodeMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
                    title="Xóa tệp"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isContextSelected ? 'bg-brand text-white shadow-lg shadow-brand/20' : (isCodeMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-400')} group-hover:scale-110 transition-transform`}>
                {doc.type.includes('spreadsheet') || doc.name.endsWith('.csv') ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
                <h5 className={`text-xs font-bold truncate ${isContextSelected ? 'text-brand' : (isCodeMode ? 'text-slate-300' : 'text-slate-700')}`} title={doc.name}>{doc.name}</h5>
                <div className="mt-1 flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isContextSelected ? 'text-slate-500' : 'text-slate-400'}`}>{formatFileSize(doc.size)}</span>
                    <span className={`w-1 h-1 rounded-full opacity-30 ${isContextSelected ? 'bg-slate-400' : 'bg-slate-300'}`}></span>
                    {doc.source && (
                        <>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${doc.source.includes('user') ? 'bg-blue-600/70 text-white border-blue-400/20' : (doc.source.includes('assistant') || doc.source.includes('ai') ? 'bg-red-800/70 text-white border-red-400/20' : 'bg-slate-100 text-slate-500 border border-slate-200')
                                }`}>
                                {doc.source.includes('user') ? 'User' : (doc.source.includes('assistant') || doc.source.includes('ai') ? 'AI' : 'Global')}
                            </span>
                            <span className={`w-1 h-1 rounded-full opacity-30 ${isContextSelected ? 'bg-slate-400' : 'bg-slate-300'}`}></span>
                        </>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isContextSelected ? 'text-slate-500' : 'text-slate-400'}`}>{doc.name.split('.').pop()}</span>
                </div>
            </div>
        </div>
    );
});

export default WorkspaceDocItem;
