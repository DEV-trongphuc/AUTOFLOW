
// components/templates/EmailEditor/EmailToolbox.tsx
import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons
import { type LucideIcon } from 'lucide-react'; // Import specific type
import { EmailBlock } from '../../../types';
import ToolboxSavedItem from './components/ToolboxSavedItem'; // Import new component
import { TOOLBOX_ITEMS } from './constants/toolboxItems';
import { TEMPLATE_PRESETS } from './constants/templatePresets';

interface EmailToolboxProps {
    blocks: EmailBlock[];
    onDragStart: (e: React.DragEvent, type: string, layout?: string) => void;
    onSelectBlock: (id: string) => void;
    onLoadTemplate?: (blocks: EmailBlock[]) => void;
    selectedBlockId: string | null;
    savedSections?: { id: string, name: string, data: EmailBlock }[];
    onDeleteSavedSection?: (id: string) => void;
}

// Dynamic Icon mapping
const IconMap: Record<string, any> = LucideIcons;

const EmailToolbox: React.FC<EmailToolboxProps> = ({ blocks, onDragStart, onSelectBlock, selectedBlockId, savedSections = [], onLoadTemplate, onDeleteSavedSection }) => {
    const [activeTab, setActiveTab] = useState<'blocks' | 'layers' | 'saved' | 'templates'>('blocks');
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleCollapse = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newSet = new Set(collapsedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCollapsedIds(newSet);
    };

    const LayoutVisual = ({ layout }: { layout: string }) => {
        let widths: string[] = [];
        if (layout === '1') widths = ['100%'];
        else if (layout === '2') widths = ['50%', '50%'];
        else if (layout === '3') widths = ['33%', '34%', '33%'];
        else if (layout === '4') widths = ['25%', '25%', '25%', '25%'];
        else if (layout === '1-2') widths = ['33%', '67%'];
        else if (layout === '2-1') widths = ['67%', '33%'];

        return (
            <div className="flex w-10 h-8 gap-0.5 rounded-sm overflow-hidden bg-slate-100 border border-slate-200">
                {widths.map((w, i) => (
                    <div key={i} style={{ width: w }} className="h-full bg-slate-300 first:bg-slate-400"></div>
                ))}
            </div>
        );
    };

    const ToolItem = ({ type, label, icon: IconName, layout }: any) => {
        const Icon = IconMap[IconName as string] || IconMap.Layers; // Default to Layers if icon not found
        return (
            <div
                draggable
                onDragStart={(e) => onDragStart(e, type, layout)}
                className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing hover:border-amber-600/30 hover:shadow-[0_12px_24px_-10px_rgba(245,158,11,0.25)] transition-all group h-[100px] justify-center items-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] active:scale-95 duration-300 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-amber-600/10 group-hover:text-amber-600 transition-all duration-300 text-slate-400 group-hover:scale-110">
                    {type === 'layout' ? <LayoutVisual layout={layout} /> : <Icon className="w-5 h-5 transition-all" />}
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none group-hover:text-slate-900 transition-colors">{label}</span>
            </div>
        );
    };

    const filteredTools = TOOLBOX_ITEMS.filter(t => t.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderTreeItem = (block: EmailBlock, depth: number = 0) => {
        const isSelected = selectedBlockId === block.id;
        const hasChildren = block.children && block.children.length > 0;
        const isCollapsed = collapsedIds.has(block.id);

        const getIcon = (type: string): LucideIcon => {
            switch (type) {
                case 'section': return IconMap.Maximize as LucideIcon;
                case 'row': return IconMap.GripHorizontal as LucideIcon;
                case 'column': return IconMap.Box as LucideIcon;
                case 'text': return IconMap.Type as LucideIcon;
                case 'image': return IconMap.Image as LucideIcon;
                case 'button': return IconMap.MousePointer2 as LucideIcon;
                case 'social': return IconMap.Share2 as LucideIcon;
                case 'video': return IconMap.Video as LucideIcon;
                case 'quote': return IconMap.Quote as LucideIcon;
                case 'timeline': return IconMap.List as LucideIcon;
                case 'review': return IconMap.Star as LucideIcon;
                case 'countdown': return IconMap.Clock as LucideIcon;
                case 'order_list': return IconMap.ShoppingBag as LucideIcon;
                case 'check_list': return IconMap.CheckCircle as LucideIcon;
                case 'voucher': return IconMap.Ticket as LucideIcon;
                default: return IconMap.Layers as LucideIcon;
            }
        };

        const Icon = getIcon(block.type);

        return (
            <div key={block.id} className="space-y-1 select-none">
                <button
                    onClick={() => onSelectBlock(block.id)}
                    className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all text-left group/item border ${isSelected ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-transparent hover:bg-slate-50 text-slate-600'}`}
                    style={{ paddingLeft: `${depth * 10 + 8}px` }}
                >
                    {hasChildren ? (
                        <div onClick={(e) => toggleCollapse(e, block.id)} className="p-0.5 hover:bg-black/5 rounded transition-colors cursor-pointer">
                            <IconMap.ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        </div>
                    ) : <div className="w-4" />}
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400 group-hover/item:text-slate-600'}`} />
                    <span className="text-[10px] font-bold uppercase truncate tracking-tight">{block.type.replace('_', ' ')}</span>
                </button>
                {hasChildren && !isCollapsed && (
                    <div className="space-y-1 relative before:absolute before:left-[14px] before:top-0 before:bottom-0 before:w-px before:bg-slate-100 ml-2">
                        {block.children?.map(child => renderTreeItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-40 h-full shadow-xl">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="grid grid-cols-2 gap-1 bg-slate-200/50 p-1 rounded-xl mb-3">
                    <button onClick={() => setActiveTab('blocks')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all w-full ${activeTab === 'blocks' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LucideIcons.Blocks className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Blocks</span>
                    </button>
                    <button onClick={() => setActiveTab('templates')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all w-full ${activeTab === 'templates' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LucideIcons.Sparkles className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Mẫu</span>
                    </button>
                    <button onClick={() => setActiveTab('saved')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all w-full ${activeTab === 'saved' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LucideIcons.Bookmark className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Thư viện</span>
                    </button>
                    <button onClick={() => setActiveTab('layers')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all w-full ${activeTab === 'layers' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LucideIcons.Layers className="w-5 h-5" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">Cấu trúc</span>
                    </button>
                </div>
                {activeTab === 'blocks' && (
                    <div className="relative group">
                        <IconMap.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm block..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 transition-all placeholder:text-slate-300"
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500"><IconMap.X className="w-3 h-3" /></button>}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#fcfcfc]">
                {activeTab === 'blocks' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="space-y-6 pt-2">
                            {['layout', 'content', 'basic'].map(cat => {
                                const catTools = filteredTools.filter(t => t.cat === cat);
                                if (catTools.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1 border-b border-slate-100 pb-1 w-fit">
                                            {cat === 'layout' ? 'Bố cục' : (cat === 'content' ? 'Nội dung' : 'Cơ bản')}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {catTools.map(tool => (
                                                <ToolItem key={tool.id} type={tool.type || tool.id} layout={tool.layout} label={tool.label} icon={tool.icon} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredTools.filter(t => ['layout', 'content', 'basic'].includes(t.cat)).length === 0 && (
                                <div className="text-center py-10 opacity-40">
                                    <IconMap.Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-xs font-bold text-slate-400">Không tìm thấy</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300 pt-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mẫu kéo thả nhanh</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {TOOLBOX_ITEMS.filter(t => t.cat === 'template_tab').map(tool => (
                                <ToolItem key={tool.id} type={tool.type || tool.id} layout={tool.layout} label={tool.label} icon={tool.icon} />
                            ))}
                        </div>
                        {TOOLBOX_ITEMS.filter(t => t.cat === 'template_tab').length === 0 && (
                            <div className="text-center py-10 opacity-40">
                                <IconMap.LayoutTemplate className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs font-bold text-slate-400">Chưa có mẫu</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mẫu đã lưu</p>
                        {savedSections.length > 0 ? (
                            savedSections.map(item => <ToolboxSavedItem key={item.id} item={item} onDragStart={onDragStart} onDelete={onDeleteSavedSection} />)
                        ) : (
                            <div className="text-center py-10 opacity-40">
                                <IconMap.Bookmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-[10px] font-bold uppercase text-slate-400">Chưa có mẫu nào</p>
                                <p className="text-[9px] text-slate-300 mt-1">Lưu Section trong trình soạn thảo để tái sử dụng.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'layers' && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300 pb-10">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cấu trúc Email</span>
                        </div>
                        {blocks.length === 0 ? (
                            <div className="text-center py-10 opacity-30 italic text-[10px]">Chưa có nội dung</div>
                        ) : (
                            <div className="space-y-1">
                                {blocks.map(b => renderTreeItem(b))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[9px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                    <IconMap.Settings className="w-3 h-3" /> Kéo thả để thêm Block
                </p>
            </div>
        </div>
    );
};

export default EmailToolbox;