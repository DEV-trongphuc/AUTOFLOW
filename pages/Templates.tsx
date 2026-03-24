import * as React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../services/storageAdapter';
import { Template, TemplateGroup } from '../types';
import { Edit3, Copy, Trash2, Plus, Layout, Eye, Sparkles, FolderOpen, Globe, Search, FolderPlus, Check, X, AlertCircle, ChevronRight } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmailEditor from '../components/templates/EmailEditor/index';
// @ts-ignore: `compileHTML` is a named export from `htmlCompiler`
import { compileHTML } from '../components/templates/EmailEditor/utils/htmlCompiler';
import toast from 'react-hot-toast';
import EmailPreviewDrawer from '../components/flows/config/EmailPreviewDrawer';

import TabTransition from '../components/common/TabTransition';
import ConfirmModal from '../components/common/ConfirmModal';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { SYSTEM_TEMPLATES } from '../services/systemTemplates';
import { CardGridSkeleton } from '../components/common/PageSkeleton';

const VisualTemplate: React.FC<{ template: Template, html: string }> = ({ template, html }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.4);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                setScale(containerRef.current.offsetWidth / 600);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full bg-white relative overflow-hidden flex items-start justify-center">
            <div className="absolute top-0 left-0 origin-top-left" style={{
                width: '600px',
                height: '1000px',
                transform: `scale(${scale})`,
                pointerEvents: 'none'
            }}>
                <iframe
                    srcDoc={`
                        <html>
                            <head>
                                <style>
                                    body { margin: 0; padding: 0; overflow: hidden; background: white; }
                                    ::-webkit-scrollbar { display: none; }
                                </style>
                            </head>
                            <body>${html}</body>
                        </html>
                    `}
                    className="w-full h-full border-none"
                    title="preview"
                    scrolling="no"
                />
            </div>
            {/* Smooth overlay */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
        </div>
    );
};

const Templates: React.FC = () => {
    const [userTemplates, setUserTemplates] = useState<Template[]>([]);
    const [groups, setGroups] = useState<TemplateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [customMergeTags, setCustomMergeTags] = useState<{ label: string; key: string }[]>([]);

    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined);

    // Group State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TemplateGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [isSavingGroup, setIsSavingGroup] = useState(false);

    // Preview & Interaction State
    const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

    // Filter State
    const [filterGroupId, setFilterGroupId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    // Confirm Delete
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, ids: string[], type: 'template' | 'group' }>({ isOpen: false, ids: [], type: 'template' });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isMovingGroups, setIsMovingGroups] = useState(false);
    // Modal hiển thị khi xóa bị block do template đang dùng trong flow/campaign
    const [usageBlockModal, setUsageBlockModal] = useState<{ isOpen: boolean, errors: string[] }>({ isOpen: false, errors: [] });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    useEffect(() => {
        fetchUserTemplates();
        fetchGroups();
        // Load custom field keys from forms for the BIẾN (merge tag) dropdown
        api.get<any[]>('forms').then(res => {
            if (res.success && Array.isArray(res.data)) {
                const keyMap = new Map<string, string>();
                res.data.forEach((form: any) => {
                    (form.fields || []).forEach((f: any) => {
                        if (f.isCustom && f.customKey) {
                            keyMap.set(f.customKey, f.label || f.customKey);
                        }
                    });
                });
                setCustomMergeTags(Array.from(keyMap.entries()).map(([key, label]) => ({ key, label })));
            }
        });
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await api.get<TemplateGroup[]>('template_groups');
            if (res.success) setGroups(res.data);
        } catch (error) {
            console.error('Fetch groups error:', error);
        }
    };

    const fetchUserTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get<Template[]>('templates');
            if (res.success) setUserTemplates(res.data);
            else showToast(res.message || 'Lỗi khi tải danh sách mẫu', 'error');
        } catch (error) {
            console.error('Fetch templates error:', error);
            showToast('Không thể kết nối với máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async (data: Partial<Template>, shouldExit: boolean = false) => {
        try {
            let res;
            if (editingTemplate && editingTemplate.id && !editingTemplate.id.startsWith('sys_')) {
                res = await api.put(`templates/${editingTemplate.id}`, { ...editingTemplate, ...data, lastModified: new Date().toISOString() });
                if (res.success) showToast('Đã cập nhật mẫu email');
            } else {
                res = await api.post('templates', {
                    ...data,
                    category: data.category || 'promotional',
                    thumbnail: data.thumbnail || 'https://placehold.co/600x400/f1f5f9/94a3b8?text=Email+Template'
                });
                if (res.success) {
                    showToast('Đã tạo mẫu email mới');
                    setEditingTemplate(res.data);
                    fetchUserTemplates();
                }
            }

            if (res && res.success) {
                fetchUserTemplates();
                if (shouldExit) {
                    setIsEditorOpen(false);
                    setEditingTemplate(undefined);
                    setCurrentPage(1);
                }
            } else if (res) {
                showToast(res.message || 'Lỗi khi lưu mẫu email', 'error');
            }
        } catch (error) {
            console.error('Save template error:', error);
            showToast('Không thể lưu mẫu email. Vui lòng thử lại.', 'error');
        }
    };

    const handleDelete = async (ids: string[], type: 'template' | 'group' = 'template') => {
        try {
            if (type === 'group') {
                const res = await api.delete(`template_groups/${ids[0]}`);
                if (res.success) {
                    setGroups(prev => prev.filter(g => g.id !== ids[0]));
                    if (filterGroupId === ids[0]) setFilterGroupId('all');
                    showToast('Đã xóa nhóm', 'info');
                    fetchUserTemplates(); // Refresh to show templates as "Uncategorized"
                } else {
                    showToast(res.message || 'Lỗi khi xóa nhóm', 'error');
                }
                setDeleteConfirm({ isOpen: false, ids: [], type: 'template' });
            } else {
                const res = await api.delete('templates', { ids });
                if (res.success) {
                    setUserTemplates(prev => prev.filter(t => !ids.includes(t.id)));
                    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                    showToast(res.message || 'Đã xóa mẫu email', 'info');
                } else {
                    // Hiện modal chi tiết khi template đang được dùng trong flow/campaign
                    const errors: string[] = (res.data as any)?.errors || [];
                    if (errors.length > 0) {
                        setUsageBlockModal({ isOpen: true, errors });
                    } else {
                        showToast(res.message || 'Lỗi khi xóa mẫu email', 'error');
                    }
                    fetchUserTemplates(); // Refresh to show what was deleted
                }
            }
        } catch (error) {
            console.error(`Delete ${type} error:`, error);
            showToast(`Không thể xóa ${type}`, 'error');
        }
        setDeleteConfirm({ isOpen: false, ids: [], type: 'template' });
    };

    const handleBulkMove = async (toGroupId: string) => {
        if (selectedIds.length === 0) return;
        setIsMovingGroups(true);
        try {
            const res = await api.put('templates', {
                bulk_action: 'move_to_group',
                ids: selectedIds,
                group_id: toGroupId === 'null' ? null : toGroupId
            });
            if (res.success) {
                showToast(res.message || 'Đã cập nhật nhóm cho các mẫu đã chọn');
                fetchUserTemplates();
                setSelectedIds([]);
            } else {
                showToast(res.message || 'Lỗi khi di chuyển mẫu', 'error');
            }
        } catch (error) {
            showToast('Lỗi kết nối', 'error');
        } finally {
            setIsMovingGroups(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (filtered: Template[]) => {
        const filteredIds = filtered.map(t => t.id);
        const allSelected = filteredIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleSaveGroup = async () => {
        if (!newGroupName.trim()) return;
        setIsSavingGroup(true);
        try {
            const res = editingGroup
                ? await api.put(`template_groups/${editingGroup.id}`, { name: newGroupName })
                : await api.post('template_groups', { name: newGroupName });

            if (res.success) {
                showToast(editingGroup ? 'Đã cập nhật nhóm' : 'Đã tạo nhóm mới');
                fetchGroups();
                setIsGroupModalOpen(false);
                setEditingGroup(null);
                setNewGroupName('');
            } else {
                showToast(res.message || 'Lỗi khi lưu nhóm', 'error');
            }
        } catch (error) {
            showToast('Lỗi kết nối', 'error');
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleDuplicate = async (tpl: Template) => {
        try {
            const baseName = tpl.name.replace(' (Copy)', '');
            const newName = `${baseName} (Copy)`;

            let htmlContent = tpl.htmlContent;
            if (!htmlContent && tpl.blocks) {
                htmlContent = compileHTML(tpl.blocks, tpl.bodyStyle, tpl.name);
            }

            const newTpl = {
                name: newName,
                category: tpl.category,
                thumbnail: tpl.thumbnail,
                blocks: tpl.blocks,
                bodyStyle: tpl.bodyStyle,
                htmlContent: htmlContent
            };

            const res = await api.post('templates', newTpl);
            if (res.success) {
                await fetchUserTemplates();
                setCurrentPage(1);
                showToast('Đã nhân bản mẫu thành công', 'success');
            } else {
                showToast(res.message || 'Lỗi khi nhân bản mẫu', 'error');
            }
        } catch (error) {
            console.error('Duplicate template error:', error);
            showToast('Không thể nhân bản mẫu email', 'error');
        }
    };

    // --- Filtering Logic ---
    // Merge all templates: personal first, system appended
    const allMergedTemplates = [...userTemplates, ...SYSTEM_TEMPLATES];

    const filteredTemplates = allMergedTemplates.filter(t => {
        const matchesGroup = filterGroupId === 'all' || t.groupId === filterGroupId;
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesGroup && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
    const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Reset to page 1 whenever filters change
    const handleFilterGroupChange = (id: string) => { setFilterGroupId(id); setCurrentPage(1); };
    const handleSearchChange = (term: string) => { setSearchTerm(term); setCurrentPage(1); };

    // [FIX] Always recompile from blocks when available so compiler improvements
    // (like the image width fix) take effect immediately in the preview modal
    // without needing to re-save each template.
    // Fall back to stored htmlContent only for HTML-only templates (no blocks).
    const getPreviewHTML = (tpl: Template | null) => {
        if (!tpl) return '';
        if (tpl.blocks && tpl.blocks.length > 0) return compileHTML(tpl.blocks, tpl.bodyStyle, tpl.name);
        if (tpl.htmlContent) return tpl.htmlContent;
        return '';
    };


    const getGroupName = (groupId?: string) => {
        const group = groups.find(g => g.id === groupId);
        return group ? group.name : 'Chưa phân loại';
    };

    return (
        <div className="animate-fade-in space-y-6 pb-20">

            {isEditorOpen ? (
                <EmailEditor
                    template={editingTemplate}
                    groups={groups}
                    onSave={(data) => handleSaveTemplate(data, false)}
                    onCancel={() => { setIsEditorOpen(false); setEditingTemplate(undefined); }}
                    customMergeTags={customMergeTags}
                />
            ) : (
                <>
                    <PageHeader
                        title="Kho giao diện (Templates)"
                        description="Thư viện mẫu email chuyên nghiệp & thiết kế cá nhân."
                        action={
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-4 lg:mt-0">
                                <Button
                                    variant="secondary"
                                    onClick={fetchUserTemplates}
                                    isLoading={loading}
                                    className="w-full sm:w-auto order-2 sm:order-1"
                                >
                                    Làm mới
                                </Button>
                                <Button
                                    icon={Plus}
                                    size="lg"
                                    onClick={() => { setEditingTemplate(undefined); setIsEditorOpen(true); }}
                                    className="whitespace-nowrap w-full sm:w-auto order-1 sm:order-2 bg-slate-900 text-white hover:bg-black"
                                >
                                    Thiết kế mới
                                </Button>
                            </div>
                        }
                    />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
                        <div className="relative group w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Tìm kiếm mẫu..."
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
                            />
                        </div>
                        <p className="text-xs text-slate-400 font-medium shrink-0">{filteredTemplates.length} mẫu</p>
                    </div>


                    <div className="space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 bg-white rounded-2xl lg:rounded-full p-1.5 lg:p-2 shadow-sm border border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                                <button
                                    onClick={() => handleFilterGroupChange('all')}
                                    className={`whitespace-nowrap flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-full text-xs lg:text-sm font-bold transition-all duration-300 ${filterGroupId === 'all' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                >
                                    <Globe className={`w-3.5 h-3.5 lg:w-4 h-4 transition-transform duration-500 ${filterGroupId === 'all' ? 'rotate-12 scale-110' : ''}`} />
                                    Tất cả mẫu
                                    <span className={`text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 rounded-full ${filterGroupId === 'all' ? 'bg-white/20' : 'bg-slate-100'}`}>{allMergedTemplates.length}</span>
                                </button>

                                {groups.map(group => (
                                    <div key={group.id} className="group/item relative flex items-center shrink-0">
                                        <button
                                            onClick={() => handleFilterGroupChange(group.id)}
                                            className={`flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-full text-xs lg:text-sm font-bold transition-all duration-300 ${filterGroupId === group.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                        >
                                            <FolderOpen className={`w-3.5 h-3.5 lg:w-4 h-4 transition-transform duration-500 ${filterGroupId === group.id ? 'rotate-12 scale-110' : 'opacity-50'}`} />
                                            <span className="truncate max-w-[120px] lg:max-w-[150px]">{group.name}</span>
                                            <span className={`text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 rounded-full ${filterGroupId === group.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                {allMergedTemplates.filter(t => t.groupId === group.id).length}
                                            </span>
                                        </button>

                                        {/* Actions for group hover */}
                                        <div className="absolute -top-1 -right-1 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity translate-y-2 group-hover/item:translate-y-0 duration-300">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setNewGroupName(group.name); setIsGroupModalOpen(true); }}
                                                className="p-1.5 bg-white shadow-md border border-slate-100 text-amber-600 rounded-full hover:bg-amber-50"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, ids: [group.id], type: 'group' }); }}
                                                className="p-1.5 bg-white shadow-md border border-slate-100 text-rose-600 rounded-full hover:bg-rose-50"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => { setEditingGroup(null); setNewGroupName(''); setIsGroupModalOpen(true); }}
                                    className="p-3 bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all group shrink-0"
                                    title="Tạo nhóm mới"
                                >
                                    <FolderPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Main Grid */}
                        <TabTransition key={filterGroupId + currentPage}>
                            {loading ? (
                                <CardGridSkeleton cols={4} rows={2} height={160} />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-8">
                                    {filterGroupId === 'all' && currentPage === 1 && (
                                        <button
                                            onClick={() => { setEditingTemplate(undefined); setIsEditorOpen(true); }}
                                            className="border-2 border-dashed border-slate-200 rounded-[32px] h-[380px] flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50/50 transition-all group bg-white hover:shadow-2xl hover:shadow-amber-500/5"
                                        >
                                            <div className="p-8 bg-slate-50 rounded-full mb-6 shadow-sm group-hover:scale-110 transition-transform group-hover:shadow-lg group-hover:bg-white border border-slate-100">
                                                <Plus className="w-10 h-10 text-amber-500" />
                                            </div>
                                            <span className="font-bold text-xl text-[#333333] tracking-tight">Tạo thiết kế mới</span>
                                            <span className="text-[10px] mt-2 opacity-50 font-bold uppercase tracking-[0.2em]">Bắt đầu tạo mẫu của bạn</span>
                                        </button>
                                    )}

                                    {paginatedTemplates.map((template) => (
                                        <div key={template.id} className={`bg-white rounded-[24px] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border-2 overflow-hidden group hover:shadow-[0_20px_40px_-12px_rgba(245,158,11,0.15)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-[380px] relative ${selectedIds.includes(template.id) ? 'border-amber-500 shadow-xl ring-4 ring-amber-500/10' : 'border-white hover:border-amber-200'}`}>

                                            {/* Selection Checkbox */}
                                            {!template.id.startsWith('sys_') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(template.id); }}
                                                    className={`absolute top-5 left-5 z-20 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${selectedIds.includes(template.id) ? 'bg-amber-500 border-amber-500 text-white scale-110 shadow-lg' : 'bg-white/90 backdrop-blur border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:border-amber-400 hover:scale-105'}`}
                                                >
                                                    <Check className={`w-5 h-5 transition-transform duration-500 ${selectedIds.includes(template.id) ? 'scale-100 rotate-0' : 'scale-0 rotate-12'}`} />
                                                </button>
                                            )}

                                            {/* Thumbnail Area */}
                                            <div className="relative h-52 bg-slate-50 overflow-hidden cursor-pointer" onClick={() => setPreviewTemplate(template)}>
                                                <div className="w-full h-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform duration-[1.5s] ease-out overflow-hidden relative">
                                                    {template.thumbnail && !template.thumbnail.includes('placehold.co') ? (
                                                        <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover object-top" loading="lazy" />
                                                    ) : (
                                                        <VisualTemplate template={template} html={getPreviewHTML(template)} />
                                                    )}
                                                </div>

                                                {/* Overlay Actions */}
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4">
                                                    <button onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template); }} className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-2xl flex items-center gap-2 transform translate-y-8 group-hover:translate-y-0 duration-500 ease-out">
                                                        <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                                                    </button>

                                                    {template.id.startsWith('sys_') ? (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl flex items-center gap-2 transform translate-y-8 group-hover:translate-y-0 duration-500 delay-100 ease-out">
                                                            <Copy className="w-3.5 h-3.5" /> Sử dụng ngay
                                                        </button>
                                                    ) : (
                                                        <div className="flex gap-2 transform translate-y-8 group-hover:translate-y-0 duration-500 delay-100 ease-out">
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); setIsEditorOpen(true); }} className="p-2.5 bg-white text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white shadow-xl transition-all" title="Chỉnh sửa">
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }} className="p-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white shadow-xl transition-all" title="Nhân bản">
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, ids: [template.id], type: 'template' }); }} className="p-2.5 bg-white text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white shadow-xl transition-all" title="Xóa">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tech Badge */}
                                                <div className="absolute top-5 right-5 flex flex-col items-end gap-2">
                                                    {template.id.startsWith('sys_') && !['sys_welcome', 'sys_promo', 'sys_newsletter', 'sys_trans'].includes(template.id) && (
                                                        <span className="bg-rose-500 text-white px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-[0.1em] shadow-lg animate-pulse">
                                                            Premium
                                                        </span>
                                                    )}
                                                    <span className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest text-slate-700 shadow-md flex items-center gap-1.5 border border-slate-100">
                                                        {template.blocks && template.blocks.length > 0 ? (
                                                            <><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Editor</>
                                                        ) : (
                                                            <><Layout className="w-3.5 h-3.5 text-blue-500" /> HTML</>
                                                        )}
                                                    </span>

                                                </div>
                                            </div>

                                            {/* Info Area */}
                                            <div className="p-5 flex-1 flex flex-col justify-between bg-white group-hover:bg-slate-50/50 transition-colors duration-500">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-1 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 flex items-center gap-1.5 shadow-sm">
                                                            <FolderOpen className="w-3 h-3 text-slate-400" /> {getGroupName(template.groupId)}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-[#333333] text-sm group-hover:text-amber-600 transition-colors line-clamp-2 leading-tight tracking-tight" title={template.name}>
                                                        {template.name}
                                                    </h3>
                                                </div>

                                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-auto">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 opacity-60">Lần cuối cập nhật</span>
                                                        <span className="text-[11px] text-slate-600 font-bold">
                                                            {template.id.startsWith('sys_') ? 'System Template' : new Date(template.lastModified).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    </div>
                                                    <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {filteredTemplates.length === 0 && !loading && (
                                <div className="text-center py-32 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200 animate-in fade-in duration-700">
                                    <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl flex items-center justify-center mx-auto mb-8 border border-slate-100 transform -rotate-6">
                                        <Search className="w-16 h-16 text-slate-200" />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">Không tìm thấy mẫu phù hợp</h4>
                                    <button onClick={() => { setSearchTerm(''); handleFilterGroupChange('all'); }} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-xl">Xóa bộ lọc</button>
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 pt-6">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:border-amber-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        ← Trước
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${page === currentPage
                                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-110'
                                                    : 'bg-white border border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:border-amber-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        Tiếp →
                                    </button>
                                </div>
                            )}
                        </TabTransition>
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="fixed bottom-6 lg:bottom-8 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-500">
                            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 lg:px-6 lg:py-4 rounded-2xl lg:rounded-[32px] shadow-2xl flex flex-col lg:flex-row items-center gap-4 lg:gap-6 w-full lg:min-w-[500px]">
                                <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto lg:pr-6 lg:border-r lg:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-amber-500 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-white text-sm lg:text-base shadow-lg shadow-amber-500/20">
                                            {selectedIds.length}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-xs lg:text-sm">Đã chọn</span>
                                            <button onClick={() => setSelectedIds([])} className="text-amber-400 text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:text-amber-300">Bỏ chọn</button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSelectAll(filteredTemplates)} className="lg:hidden text-white/60 hover:text-white transition-colors">
                                        {filteredTemplates.every(t => selectedIds.includes(t.id)) ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto">
                                    <div className="flex-1 lg:w-64">
                                        <Select
                                            options={[
                                                { value: 'null', label: 'Chưa phân loại' },
                                                ...groups.map(g => ({ value: g.id, label: g.name }))
                                            ]}
                                            value=""
                                            onChange={(val) => handleBulkMove(val)}
                                            placeholder="Di chuyển..."
                                            variant="premium"
                                            size="sm"
                                            searchable
                                            icon={FolderOpen}
                                            direction="top"
                                            disabled={isMovingGroups}
                                        />
                                    </div>

                                    <button
                                        onClick={() => setDeleteConfirm({ isOpen: true, ids: selectedIds, type: 'template' })}
                                        className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white p-2.5 lg:px-4 lg:py-2.5 rounded-xl lg:rounded-2xl text-[11px] font-bold flex items-center gap-2 transition-all border border-rose-500/20 whitespace-nowrap"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> <span className="hidden sm:inline">Xóa đã chọn</span>
                                    </button>
                                </div>

                                <button onClick={() => handleSelectAll(filteredTemplates)} className="hidden lg:flex items-center gap-2 ml-auto text-white/60 hover:text-white transition-colors group">
                                    {filteredTemplates.every(t => selectedIds.includes(t.id)) ? (
                                        <><X className="w-4 h-4" /> <span className="text-xs font-bold">Bỏ chọn vùng</span></>
                                    ) : (
                                        <><Check className="w-4 h-4" /> <span className="text-xs font-bold">Chọn toàn bộ</span></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {filteredTemplates.length === 0 && !loading && (
                        <div className="text-center py-20 opacity-50">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-10 h-10 text-slate-300" /></div>
                            <p className="text-sm font-bold text-slate-500">Không tìm thấy mẫu nào phù hợp</p>
                        </div>
                    )}
                </>
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, ids: [], type: 'template' })}
                onConfirm={() => deleteConfirm.ids.length > 0 && handleDelete(deleteConfirm.ids, deleteConfirm.type)}
                title={deleteConfirm.type === 'template'
                    ? (deleteConfirm.ids.length > 1 ? `Xóa ${deleteConfirm.ids.length} mẫu đã chọn?` : "Xóa mẫu email này?")
                    : "Xóa nhóm mẫu này?"}
                message={deleteConfirm.type === 'template'
                    ? (deleteConfirm.ids.length > 1 ? "Hành động này sẽ xóa vĩnh viễn các mẫu thiết kế đã chọn. Các mẫu đang được sử dụng sẽ không bị xóa." : "Hành động này sẽ xóa vĩnh viễn mẫu thiết kế. Bạn không thể khôi phục sau khi xóa.")
                    : "Hành động này sẽ xóa nhóm. Các mẫu email trong nhóm này sẽ trở về trạng thái 'Chưa phân loại' và KHÔNG bị xóa."}
                variant="danger"
            />

            {/* Group Modal */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => { setIsGroupModalOpen(false); setEditingGroup(null); setNewGroupName(''); }}
                title={editingGroup ? "Chỉnh sửa nhóm" : "Tạo nhóm mới"}
                size="sm"
                footer={
                    <div className="flex justify-between w-full">
                        <Button variant="ghost" onClick={() => { setIsGroupModalOpen(false); setEditingGroup(null); setNewGroupName(''); }}>Hủy</Button>
                        <Button onClick={handleSaveGroup} isLoading={isSavingGroup} disabled={!newGroupName.trim()}>
                            {editingGroup ? "Cập nhật" : "Tạo nhóm"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Tên nhóm"
                        placeholder="VD: Chào mừng, Khuyến mãi..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            {/* Modal block xóa: template đang dùng trong flows/campaigns */}
            <Modal
                isOpen={usageBlockModal.isOpen}
                onClose={() => setUsageBlockModal({ isOpen: false, errors: [] })}
                title="Không thể xóa mẫu email"
                size="sm"
                footer={
                    <div className="flex justify-end w-full">
                        <Button onClick={() => setUsageBlockModal({ isOpen: false, errors: [] })}>
                            Đã hiểu
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-700 font-medium">
                            Mẫu email đang được sử dụng. Vui lòng <strong>hủy kích hoạt (Pause/Archive)</strong> các Flow hoặc Campaign liên quan trước khi xóa.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Đang được dùng tại:</p>
                        {usageBlockModal.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 font-medium">{err}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* REUSE THE PREVIEW DRAWER BUT WITH DYNAMIC HTML GENERATION */}
            {previewTemplate && (
                <EmailPreviewDrawer
                    template={previewTemplate}
                    htmlContent={getPreviewHTML(previewTemplate)}
                    isOpen={!!previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onAction={() => { handleDuplicate(previewTemplate); setPreviewTemplate(null); }}
                    actionLabel="Sử dụng mẫu này"
                />
            )}


        </div>
    );
};

export default Templates;