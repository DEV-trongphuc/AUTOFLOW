import React from 'react';
import {
    RefreshCw, Plus, FileText, Image as ImageIcon, ChevronDown, Check, Search,
    Globe, Trash2, Database, Layers, CheckCircle, Upload, Sparkles, Link as LinkIcon,
    Video, Volume2, FileCode, FileQuestion, MessageSquare, ArrowRight, Lightbulb, FileSpreadsheet, Bot
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FileAttachment, ChatbotInfo } from '../types';
import { formatFileSize, copyToClipboard } from '../utils';
import { api } from '../../../services/storageAdapter';
interface GlobalWorkspaceViewProps {
    globalTab: 'files' | 'images';
    setGlobalTab: (tab: 'files' | 'images') => void;
    handleMigration: () => void;
    docInputRef: React.RefObject<HTMLInputElement>;
    globalTotal: number;
    globalSourceFilter: 'all' | 'workspace' | 'chat_user' | 'chat_assistant';
    setGlobalSourceFilter: (filter: 'all' | 'workspace' | 'chat_user' | 'chat_assistant') => void;
    handleSelectAll: () => void;
    selectedGlobalDocs: string[];
    globalDbAssets: FileAttachment[];
    globalSearchInput: string;
    setGlobalSearchInput: (input: string) => void;
    activeBot: ChatbotInfo | null;
    chatbotId: string | undefined;
    fetchGlobalAssets: () => void;
    setSelectedGlobalDocs: React.Dispatch<React.SetStateAction<string[]>>;
    setIsGlobalSelectMode: (is: boolean) => void;
    isGlobalSelectMode: boolean;
    handleDeleteFromDb: (ids: any[]) => void;
    setWorkspaceDocs: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    chatAssets: { files: FileAttachment[], images: FileAttachment[] };
    setDeletedGalleryImages: React.Dispatch<React.SetStateAction<string[]>>;
    isLoadingGlobalAssets: boolean;
    globalPage: number;
    setGlobalPage: React.Dispatch<React.SetStateAction<number>>;
    setActiveDoc: (doc: FileAttachment | null) => void;
    setIsDocWorkspaceOpen: (open: boolean) => void;
    navigate: any;
    categoryId: string | undefined;
    setPreviewImage: (url: string | null) => void;
    onOpenTips?: () => void;
}

const GlobalWorkspaceView = React.memo(({
    globalTab,
    setGlobalTab,
    handleMigration,
    docInputRef,
    globalTotal,
    globalSourceFilter,
    setGlobalSourceFilter,
    handleSelectAll,
    selectedGlobalDocs,
    globalDbAssets,
    globalSearchInput,
    setGlobalSearchInput,
    activeBot,
    chatbotId,
    fetchGlobalAssets,
    setSelectedGlobalDocs,
    setIsGlobalSelectMode,
    isGlobalSelectMode,
    handleDeleteFromDb,
    setWorkspaceDocs,
    chatAssets,
    setDeletedGalleryImages,
    isLoadingGlobalAssets,
    globalPage,
    setGlobalPage,
    setActiveDoc,
    setIsDocWorkspaceOpen,
    navigate,
    categoryId,
    setPreviewImage,
    onOpenTips
}: GlobalWorkspaceViewProps) => {
    const totalPages = Math.ceil(globalTotal / 24);

    return (
        <div className="flex-1 flex flex-col items-center justify-start px-6 lg:px-12 pt-16 lg:pt-24 pb-12 relative z-10 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-surface via-white to-white">
            <div className="w-full flex flex-col animate-in fade-in duration-500">

                {/* AI Training Style Header */}
                <div className="w-full flex justify-between items-start mb-10 px-4 relative">
                    <div className="animate-in fade-in slide-in-from-left-5 duration-700">
                        <h1 className="text-[32px] font-black text-slate-900 leading-tight flex items-center gap-2">
                            Global Workspace<span className="text-brand text-4xl leading-none">.</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="w-8 h-[2px] bg-slate-200"></div>
                            <p className="text-slate-500 text-sm font-medium">
                                Quản lý tệp tin và hình ảnh dùng chung cho tất cả các hội thoại của bạn.
                            </p>
                        </div>
                    </div>

                    <div className="absolute -top-12 -right-6 z-10 animate-bounce-slow hidden md:block">
                        <img
                            src="https://pngfile.net/files/preview/960x960/11741189725reo9wbrtum5xxfbhubjnxavgk71sl6ptkgksc801wvj0l5pjgdch8arnleln7oqh0kzvi0wrniegc642iks8woshwo14pifdaq67.png"
                            alt="AI Mascot"
                            className="w-40 h-auto drop-shadow-2xl"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    </div>

                    <div className="flex items-center gap-3 shrink-0 relative z-20">
                        <button
                            onClick={handleMigration}
                            className="h-11 px-6 bg-white text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                            title="Đồng bộ lại nguồn gốc file"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Đồng bộ
                        </button>
                        <button
                            onClick={onOpenTips}
                            className="h-11 px-6 bg-white text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                            title="Mẹo sử dụng Workspace"
                        >
                            <Lightbulb className="w-4 h-4 text-amber-600" />
                            Mẹo
                        </button>
                        <button
                            onClick={() => docInputRef.current?.click()}
                            className="h-11 px-6 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-brand hover:brightness-110 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Upload className="w-4 h-4" />
                            UPLOAD
                        </button>
                    </div>
                </div>

                {/* Main Content Container (White Card style) */}
                <div className="w-full bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 min-h-[600px] animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
                    {/* Unified Filter Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                        <div className="relative inline-flex p-1 bg-slate-100/50 backdrop-blur-md rounded-2xl border border-slate-200/50">
                            {/* Sliding pill indicator */}
                            <div
                                className="absolute inset-y-1 rounded-xl bg-white shadow-sm border border-slate-200"
                                style={{
                                    width: '50%',
                                    left: globalTab === 'files' ? '4px' : '50%',
                                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            />
                            <button
                                onClick={() => setGlobalTab('files')}
                                className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 ${globalTab === 'files' ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FileText className="w-4 h-4" />
                                Tài liệu

                            </button>
                            <button
                                onClick={() => setGlobalTab('images')}
                                className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors duration-300 ${globalTab === 'images' ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                Hình ảnh
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Compact Filter Dropdown */}
                            <div className="relative group">
                                <button className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-slate-300 transition-all flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Nguồn:</span>
                                    <span className="text-slate-800">
                                        {globalSourceFilter === 'all' ? 'Tất cả' : globalSourceFilter === 'workspace' ? 'Global' : globalSourceFilter === 'chat_user' ? 'User' : 'AI'}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                                <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    {[
                                        { id: 'all', label: 'Tất cả', icon: Layers },
                                        { id: 'workspace', label: 'Global', icon: Globe },
                                        { id: 'chat_user', label: 'User Tải Lên', icon: Upload },
                                        { id: 'chat_assistant', label: 'AI Tạo Ra', icon: Sparkles }
                                    ].map(filter => {
                                        const Icon = filter.icon;
                                        return (
                                            <button
                                                key={filter.id}
                                                onClick={() => setGlobalSourceFilter(filter.id as any)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${globalSourceFilter === filter.id ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {filter.label}
                                                {globalSourceFilter === filter.id && <Check className="w-3.5 h-3.5 ml-auto text-slate-900" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleSelectAll}
                                className={`h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${selectedGlobalDocs.length === globalDbAssets.length && globalDbAssets.length > 0 ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-white text-slate-500 border-slate-200 hover:border-brand/30 hover:text-brand'}`}
                            >
                                {selectedGlobalDocs.length === globalDbAssets.length && globalDbAssets.length > 0 ? <CheckCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                {selectedGlobalDocs.length === globalDbAssets.length && globalDbAssets.length > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
                            </button>

                            <div className="relative group flex-1 lg:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    type="text"
                                    value={globalSearchInput}
                                    onChange={(e) => setGlobalSearchInput(e.target.value)}
                                    placeholder="Tìm kiếm tài sản..."
                                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-brand-accent transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sticky Bulk Action Bar */}
                    <div className="sticky top-0 z-40 -mx-8 px-8 py-3 bg-white/95 backdrop-blur-xl border-b border-slate-100 mb-6 transition-all duration-300" style={{ marginTop: selectedGlobalDocs.length > 0 ? '0' : '-60px', opacity: selectedGlobalDocs.length > 0 ? 1 : 0, pointerEvents: selectedGlobalDocs.length > 0 ? 'auto' : 'none' }}>
                        {selectedGlobalDocs.length > 0 && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center h-10 px-4 bg-brand/5 border border-brand/10 rounded-xl mr-2">
                                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest leading-none">Đã chọn {selectedGlobalDocs.length}</span>
                                </div>
                                {selectedGlobalDocs.some(name => globalDbAssets.find(a => a.name === name)?.source !== 'workspace') && (
                                    <button
                                        onClick={async () => {
                                            const toPromote = globalDbAssets.filter(a => selectedGlobalDocs.includes(a.name) && a.source !== 'workspace');
                                            if (toPromote.length === 0) return;

                                            try {
                                                for (const asset of toPromote) {
                                                    await api.post('ai_org_chatbot', {
                                                        action: 'make_global',
                                                        url: asset.previewUrl,
                                                        name: asset.name,
                                                        type: asset.type,
                                                        size: asset.size,
                                                        property_id: activeBot?.id,
                                                        conversation_id: asset.conversationId,
                                                        source: 'workspace'
                                                    });
                                                }
                                                toast.success(`Đã chuyển ${toPromote.length} tệp thành Global`);
                                                fetchGlobalAssets();
                                                setSelectedGlobalDocs([]);
                                                setIsGlobalSelectMode(false);
                                            } catch (err) {
                                                toast.error('Lỗi khi chuyển tệp');
                                            }
                                        }}
                                        className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                                    >
                                        <Globe className="w-4 h-4" />
                                        Make Global
                                    </button>
                                )}
                                <button
                                    onClick={async () => {

                                        const toDeleteNames = selectedGlobalDocs;
                                        const toDeleteIds = globalDbAssets
                                            .filter(a => toDeleteNames.includes(a.name))
                                            .map(a => a.id)
                                            .filter(id => id != null && !String(id).startsWith('training_'));

                                        if (toDeleteIds.length > 0) {
                                            handleDeleteFromDb(toDeleteIds);
                                        } else {
                                            setWorkspaceDocs(prev => prev.filter(d => !toDeleteNames.includes(d.name)));
                                            setIsGlobalSelectMode(false);
                                        }

                                        const chatImgUrls = chatAssets.images
                                            .filter(img => toDeleteNames.includes(img.name))
                                            .map(img => img.previewUrl!)
                                            .filter(Boolean);
                                        if (chatImgUrls.length > 0) {
                                            setDeletedGalleryImages(prev => [...prev, ...chatImgUrls]);
                                        }

                                        setSelectedGlobalDocs([]);
                                        setIsGlobalSelectMode(false);
                                    }}
                                    disabled={selectedGlobalDocs.length === 0}
                                    className="h-10 px-5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Xóa ({selectedGlobalDocs.length})
                                </button>
                                <button
                                    onClick={() => { setIsGlobalSelectMode(false); setSelectedGlobalDocs([]); }}
                                    className="h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Hủy
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Empty State / Grid */}
                    {(() => {
                        if (isLoadingGlobalAssets && globalDbAssets.length === 0) {
                            return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 animate-pulse">
                                            <div className="w-full aspect-square rounded-xl bg-slate-50 mb-3" />
                                            <div className="h-4 bg-slate-50 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-slate-50 rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        if (globalDbAssets.length === 0) return (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 animate-pulse">
                                    <Database className="w-10 h-10 text-slate-200" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">Chưa có tệp tin nào</h4>
                                <p className="text-slate-400 text-sm max-w-xs">Tải lên các tài liệu hoặc hình ảnh quan trọng để sử dụng chung cho nhiều Bot khác nhau.</p>
                            </div>
                        );

                        return (
                            <div className="flex flex-col gap-8">
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {globalDbAssets.map((doc, i) => {
                                        const isSelected = selectedGlobalDocs.includes(doc.name);
                                        const fileExt = doc.name.split('.').pop()?.toLowerCase() || '';
                                        const getIconStyle = (ext: string) => {
                                            switch (ext) {
                                                case 'pdf': return { IconOutline: FileText, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' };
                                                case 'doc':
                                                case 'docx': return { IconOutline: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
                                                case 'xls':
                                                case 'xlsx':
                                                case 'csv': return { IconOutline: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
                                                case 'ppt':
                                                case 'pptx': return { IconOutline: FileText, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' };
                                                case 'txt': return { IconOutline: FileText, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100' };
                                                case 'zip':
                                                case 'rar':
                                                case '7z': return { IconOutline: Layers, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
                                                case 'html': case 'css': case 'js': case 'jsx': case 'ts': case 'tsx': case 'php': case 'json': case 'sql':
                                                    return { IconOutline: FileCode, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' };
                                                case 'mp3': case 'wav': return { IconOutline: Volume2, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' };
                                                case 'mp4': case 'mov': return { IconOutline: Video, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
                                                default: return { IconOutline: FileQuestion, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
                                            }
                                        };
                                        const { IconOutline, color, bg, border } = getIconStyle(fileExt);
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    if (selectedGlobalDocs.length > 0) {
                                                        setSelectedGlobalDocs(prev =>
                                                            prev.includes(doc.name) ? prev.filter(n => n !== doc.name) : [...prev, doc.name]
                                                        );
                                                    }
                                                }}
                                                className={`group relative bg-white p-3 rounded-[24px] border border-slate-100/60 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1
                                                    ${isSelected ? 'outline outline-2 outline-brand outline-offset-0 bg-brand/[0.02] shadow-[0_20px_40px_-15px_rgba(var(--brand-rgb),0.3)] -translate-y-1' : ''}
                                                `}
                                            >
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.08] via-transparent to-transparent pointer-events-none" />
                                                )}

                                                {!isGlobalSelectMode && (
                                                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 translate-y-1 group-hover:translate-y-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyToClipboard(doc.previewUrl || '');
                                                            }}
                                                            className="p-2 bg-white/90 backdrop-blur-md shadow-lg rounded-xl text-slate-400 hover:text-brand hover:scale-110 transition-all border border-slate-100"
                                                            title="Share Link"
                                                        >
                                                            <LinkIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        {(doc.source === 'chat_user' || doc.source === 'chat_assistant') && !(doc as any).isGlobal && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const tid = toast.loading('Đang chuyển thành Global...');

                                                                    try {
                                                                        const data = await api.post<any>('ai_org_chatbot', {
                                                                            action: 'make_global',
                                                                            url: doc.previewUrl,
                                                                            name: doc.name,
                                                                            type: doc.type,
                                                                            size: doc.size,
                                                                            property_id: activeBot?.id || chatbotId,
                                                                            conversation_id: doc.conversationId,
                                                                            source: 'workspace'
                                                                        });
                                                                        if (data.success) {
                                                                            toast.success('Đã chuyển thành file Global', { id: tid });
                                                                            fetchGlobalAssets();
                                                                        } else {
                                                                            toast.error('Lỗi khi chuyển thành file Global', { id: tid });
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Lỗi khi chuyển thành file Global', { id: tid });
                                                                    }
                                                                }}
                                                                className="p-2 bg-white/90 backdrop-blur-md shadow-lg rounded-xl text-slate-400 hover:text-emerald-500 hover:scale-110 transition-all border border-slate-100"
                                                                title="Make Global"
                                                            >
                                                                <Globe className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();

                                                                const idStr = String(doc.id);
                                                                if (doc.id != null && !idStr.startsWith('training_')) {
                                                                    handleDeleteFromDb([doc.id]);
                                                                } else {
                                                                    setWorkspaceDocs(prev => prev.filter(d => d.name !== doc.name));
                                                                    toast.success('Đã xóa tệp');
                                                                }
                                                            }}
                                                            className="p-2 bg-white/90 backdrop-blur-md shadow-lg rounded-xl text-slate-400 hover:text-rose-500 hover:scale-110 transition-all border border-slate-100"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}

                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedGlobalDocs(prev =>
                                                            prev.includes(doc.name) ? prev.filter(n => n !== doc.name) : [...prev, doc.name]
                                                        );
                                                    }}
                                                    className={`absolute top-3 left-3 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 z-20 cursor-pointer shadow-sm
                                                        ${isSelected
                                                            ? 'bg-brand border-brand text-white rotate-0 scale-100 shadow-lg shadow-brand/30'
                                                            : 'bg-white/90 backdrop-blur-md border-slate-200 text-transparent opacity-0 -rotate-12 scale-75 group-hover:opacity-100 group-hover:rotate-0 group-hover:scale-100 hover:border-brand/50'}
                                                    `}
                                                >
                                                    <Check className={`w-4 h-4 transition-transform duration-500 ${isSelected ? 'scale-100' : 'scale-50'}`} strokeWidth={4} />
                                                </div>

                                                <div
                                                    onClick={(e) => {
                                                        if (selectedGlobalDocs.length === 0) {
                                                            e.stopPropagation();
                                                            if (doc.type.startsWith('image/')) {
                                                                setPreviewImage(doc.previewUrl || doc.base64 || '');
                                                            } else {
                                                                setActiveDoc(doc);
                                                                setIsDocWorkspaceOpen(true);
                                                            }
                                                        }
                                                    }}
                                                    className="w-full aspect-square rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 overflow-hidden group-hover:scale-[1.02] transition-transform relative"
                                                >
                                                    {doc.source && (
                                                        <div className="absolute bottom-2 left-2 z-10">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md border shadow-sm ${(doc.source === 'global_training' || (doc as any).isGlobal)
                                                                ? 'bg-amber-600/80 text-white border-amber-300/20'
                                                                : doc.source.includes('user')
                                                                    ? 'bg-blue-700/70 text-white border-blue-400/20'
                                                                    : (doc.source.includes('assistant') || doc.source.includes('ai') ? 'bg-red-800/70 text-white border-red-400/20' : 'bg-slate-800/60 text-white border-slate-500/30')
                                                                }`}>
                                                                {(doc.source === 'global_training' || (doc as any).isGlobal) ? 'Knowledge' : doc.source.includes('user') ? 'User' : (doc.source.includes('assistant') || doc.source.includes('ai') ? 'AI' : 'Global')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {doc.type.startsWith('image/') ? (
                                                        <img src={doc.previewUrl || doc.base64} className="w-full h-full object-cover" alt={doc.name} />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className={`w-12 h-12 rounded-2xl ${bg} ${border} shadow-sm flex items-center justify-center ${color} group-hover:scale-110 transition-all duration-300 border-2`}>
                                                                <IconOutline className="w-6 h-6" />
                                                            </div>
                                                            <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-wider">{fileExt}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    onClick={(e) => {
                                                        if (selectedGlobalDocs.length === 0 && doc.conversationId) {
                                                            e.stopPropagation();
                                                            if (doc.propertyId || chatbotId) {
                                                                navigate(`/ai-space/${categoryId}/${doc.propertyId || chatbotId}/${doc.conversationId}`);
                                                            }
                                                        }
                                                    }}
                                                    className={`px-1 relative ${doc.conversationId ? 'cursor-alias' : ''}`}
                                                >
                                                    <h5 className="text-[11px] font-bold text-slate-700 truncate group-hover:text-brand transition-colors mb-0.5">{doc.name}</h5>
                                                    {doc.conversationTitle && (
                                                        <p className="text-[9px] text-slate-400 font-medium truncate mb-1" title={doc.conversationTitle}>
                                                            {(doc.source === 'global_training' || (doc as any).isGlobal)
                                                                ? <Bot className="w-2.5 h-2.5 inline mr-1 text-amber-600" />
                                                                : <MessageSquare className="w-2.5 h-2.5 inline mr-1" />}
                                                            {doc.conversationTitle}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-slate-400 font-bold">{formatFileSize(doc.size)}</span>
                                                        <ArrowRight className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-4 pt-8 border-t border-slate-50">
                                        <button
                                            onClick={() => setGlobalPage(Math.max(1, globalPage - 1))}
                                            disabled={globalPage === 1}
                                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-brand disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronDown className="w-4 h-4 rotate-90" />
                                        </button>

                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setGlobalPage(i + 1)}
                                                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${globalPage === i + 1 ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white border border-slate-100 text-slate-500 hover:border-brand-accent'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setGlobalPage(Math.min(totalPages, globalPage + 1))}
                                            disabled={globalPage === totalPages}
                                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-brand disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronDown className="w-4 h-4 -rotate-90" />
                                        </button>

                                        <span className="ml-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Trang {globalPage} / {totalPages} ({globalTotal} tệp)
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
});

export default GlobalWorkspaceView;
