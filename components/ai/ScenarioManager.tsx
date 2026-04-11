import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/storageAdapter';
import { toast } from 'react-hot-toast';
import {
    Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
    MessageSquare, Zap, AlertCircle, CheckCircle2, ToggleLeft,
    ToggleRight, GripVertical, Move, ArrowUp, ArrowDown, Eye,
    EyeOff, Copy, BookOpen, Bot, Play, CircleDashed, Info,
    Download, Upload, FileText
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────
export interface FlowNode {
    id: string;
    text: string;
    buttons: { id: string; label: string; next_node?: string }[];
}

export interface ScenarioButton {
    id: string;
    label: string;
    action?: string; // used for legacy
}

export interface Scenario {
    id: string;
    property_id: string;
    title: string;
    trigger_keywords: string;   // comma-separated keyword/phrase list
    match_mode: 'contains' | 'exact' | 'regex'; // matching mode
    reply_text: string;         // Bot reply (fallback)
    buttons: ScenarioButton[];  // CTA buttons shown below reply (fallback)
    flow_data?: { nodes: FlowNode[] } | string; // NEW: The flow tree
    is_active: number;          // 0 | 1
    priority: number;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    propertyId: string;
    isDarkTheme?: boolean;
    brandColor?: string;
}

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

const emptyScenario = (propertyId: string): Omit<Scenario, 'id'> => ({
    property_id: propertyId,
    title: '',
    trigger_keywords: '',
    match_mode: 'contains',
    reply_text: '',
    buttons: [],
    is_active: 1,
    priority: 0,
});

// ──────────────────────────────────────────────────────────────────
//  Sub-component: Scenario Card (collapsed view)
// ──────────────────────────────────────────────────────────────────
const ScenarioCard: React.FC<{
    scenario: Scenario;
    isDark?: boolean;
    brandColor?: string;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
    onClone: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}> = ({ scenario, isDark, brandColor, onEdit, onDelete, onToggle, onClone, onMoveUp, onMoveDown }) => {
    const accent = brandColor || '#ffa900';
    const keywords = scenario.trigger_keywords
        ? scenario.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5)
        : [];

    return (
        <div
            className={`rounded-2xl border transition-all duration-300 group relative overflow-hidden
                ${isDark
                    ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                }
                ${!scenario.is_active ? 'opacity-50' : ''}
            `}
        >
            {/* Left accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300"
                style={{ backgroundColor: scenario.is_active ? accent : (isDark ? '#475569' : '#cbd5e1') }}
            />

            <div className="flex items-start gap-4 p-4 pl-5">
                {/* Drag handle (visual only) */}
                <div className={`mt-0.5 shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'} cursor-grab`}>
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {scenario.title || 'Kịch bản chưa đặt tên'}
                        </h4>
                        {/* Match mode badge */}
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                            ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            {scenario.match_mode}
                        </span>
                        {!scenario.is_active && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-400">
                                Tắt
                            </span>
                        )}
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 mt-2">
                        {keywords.map((kw, i) => (
                            <span key={i}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border
                                    ${isDark ? 'bg-slate-700/60 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                {kw}
                            </span>
                        ))}
                        {scenario.trigger_keywords.split(',').filter(Boolean).length > 5 && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg
                                ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                +{scenario.trigger_keywords.split(',').filter(Boolean).length - 5} nữa
                            </span>
                        )}
                    </div>

                    {/* Reply preview */}
                    <p className={`mt-2 text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {scenario.reply_text || <em className="opacity-50">Chưa có nội dung trả lời</em>}
                    </p>

                    {/* Buttons preview */}
                    {scenario.buttons && scenario.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {scenario.buttons.slice(0, 4).map((btn, i) => (
                                <span key={i}
                                    className={`text-[10px] font-bold px-3 py-1 rounded-full border
                                        ${isDark ? 'border-slate-600 bg-slate-700/50 text-slate-300' : 'border-slate-200 bg-white text-slate-600 shadow-sm'}`}>
                                    {btn.label}
                                </span>
                            ))}
                            {scenario.buttons.length > 4 && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    +{scenario.buttons.length - 4}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onMoveUp} title="Tăng độ ưu tiên"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'}`}>
                        <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onMoveDown} title="Giảm độ ưu tiên"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'}`}>
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onToggle} title={scenario.is_active ? 'Tắt kịch bản' : 'Bật kịch bản'}
                        className={`w-10 h-6 rounded-full p-1 transition-all duration-300 flex items-center
                            ${scenario.is_active 
                                ? 'bg-emerald-400 justify-end' 
                                : (isDark ? 'bg-slate-700 justify-start' : 'bg-slate-200 justify-start')}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm ring-1 ring-black/5" />
                    </button>
                    <button onClick={onClone} title="Nhân bản (Clone)"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit} title="Chỉnh sửa"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} title="Xóa"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-rose-500/10 text-slate-500 hover:text-rose-400' : 'hover:bg-rose-50 text-slate-300 hover:text-rose-500'}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────
//  Sub-component: Scenario Form (create / edit)
// ──────────────────────────────────────────────────────────────────
const ScenarioForm: React.FC<{
    initial?: Partial<Scenario>;
    propertyId: string;
    isDark?: boolean;
    brandColor?: string;
    onSave: (data: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>) => void;
    onCancel: () => void;
    loading?: boolean;
}> = ({ initial, propertyId, isDark, brandColor, onSave, onCancel, loading }) => {
    const accent = brandColor || '#ffa900';
    const [form, setForm] = useState<Omit<Scenario, 'id' | 'created_at' | 'updated_at'>>({
        property_id: propertyId,
        title: initial?.title || '',
        trigger_keywords: initial?.trigger_keywords || '',
        match_mode: initial?.match_mode || 'contains',
        reply_text: initial?.reply_text || '',
        buttons: initial?.buttons || [],
        is_active: initial?.is_active ?? 1,
        priority: initial?.priority || 0,
        flow_data: initial?.flow_data
    });
    
    // Flow Builder State
    const [nodes, setNodes] = useState<FlowNode[]>(() => {
        let n: FlowNode[] = [];
        if (initial?.flow_data) {
            try {
                const parsed = typeof initial?.flow_data === 'string' ? JSON.parse(initial.flow_data) : initial.flow_data;
                if (parsed?.nodes && parsed.nodes.length > 0) n = parsed.nodes;
            } catch(e){}
        }
        if (n.length === 0) {
            n = [{
                id: 'root',
                text: initial?.reply_text || '',
                buttons: (initial?.buttons || []).map(b => ({ id: b.id, label: b.label, next_node: b.action || '' }))
            }];
        }
        return n;
    });

    const [newBtnLabels, setNewBtnLabels] = useState<Record<string, string>>({});

    const setField = (key: keyof typeof form, val: any) => setForm(f => ({ ...f, [key]: val }));

    const updateNodeText = (id: string, text: string) => {
        setNodes(ns => ns.map(n => n.id === id ? { ...n, text } : n));
    };

    const addNodeButton = (nodeId: string) => {
        const label = newBtnLabels[nodeId]?.trim();
        if (!label) return;
        setNodes(ns => ns.map(n => {
            if (n.id === nodeId) {
                if (n.buttons.length >= 4) return n;
                return { ...n, buttons: [...n.buttons, { id: uid(), label, next_node: '' }] };
            }
            return n;
        }));
        setNewBtnLabels(prev => ({ ...prev, [nodeId]: '' }));
    };

    const removeNodeButton = (nodeId: string, btnId: string) => {
        setNodes(ns => ns.map(n => {
            if (n.id === nodeId) {
                return { ...n, buttons: n.buttons.filter(b => b.id !== btnId) };
            }
            return n;
        }));
    };

    const linkNewNode = (nodeId: string, btnId: string) => {
        const newNodeId = 'node_' + uid();
        setNodes(ns => [
            ...ns.map(n => n.id === nodeId ? 
                { ...n, buttons: n.buttons.map(b => b.id === btnId ? { ...b, next_node: newNodeId } : b) }
            : n),
            { id: newNodeId, text: '', buttons: [] }
        ]);
        toast.success('Đã thêm 1 bước nối tiếp!');
    };

    const unlinkNode = (nodeId: string, btnId: string) => {
        setNodes(ns => ns.map(n => n.id === nodeId ? 
            { ...n, buttons: n.buttons.map(b => b.id === btnId ? { ...b, next_node: '' } : b) }
        : n));
    };

    const deleteNode = (id: string) => {
        if (id === 'root') return;
        setNodes(ns => ns.filter(n => n.id !== id).map(n => ({
            ...n, buttons: n.buttons.map(b => b.next_node === id ? { ...b, next_node: '' } : b)
        })));
    };

    const handleSave = () => {
        if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề kịch bản'); return; }
        if (!form.trigger_keywords.trim()) { toast.error('Vui lòng nhập từ khóa kích hoạt'); return; }
        
        const rootNode = nodes.find(n => n.id === 'root') || nodes[0];
        if (!rootNode || !rootNode.text.trim()) { toast.error('Vui lòng nhập nội dung trả lời Bước 1 (Root)'); return; }

        onSave({
            ...form,
            reply_text: rootNode.text,
            buttons: rootNode.buttons.map(b => ({ id: b.id, label: b.label, action: b.next_node })),
            flow_data: JSON.stringify({ nodes })
        });
    };

    return (
        <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all
            ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: isDark ? '#334155' : '#f1f5f9', background: isDark ? '#0f172a' : `linear-gradient(135deg, ${accent}08, ${accent}04)` }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ background: `${accent}20`, color: accent }}>
                        <ArrowDown className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {initial?.id ? 'Chỉnh sửa Gói Kịch Bản (Flow)' : 'Tạo Gói Kịch Bản mới'}
                        </h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Kịch bản đa tầng - Rẽ nhánh luồng chat
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onCancel}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid gap-6 p-6 grid-cols-1">
                {/* Meta Inputs */}
                <div className={`grid gap-4 md:grid-cols-2 p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Tên Gói Kịch Bản <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setField('title', e.target.value)}
                            placeholder="VD: Gói Tư Vấn Học Phí"
                            className={`w-full h-11 px-4 border rounded-xl text-sm font-medium outline-none transition-all
                                ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-600/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-400'}`}
                        />
                    </div>

                    {/* Trigger Keywords */}
                    <div className="space-y-1.5">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Từ Khóa Kích Hoạt Bước 1 <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                            value={form.trigger_keywords}
                            onChange={e => setField('trigger_keywords', e.target.value)}
                            placeholder="VD: học phí, bao nhiêu tiền (cách nhau bằng dấu phẩy)"
                            rows={2}
                            className={`w-full px-4 py-3 border rounded-xl text-sm font-medium outline-none transition-all resize-y min-h-[80px]
                                ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-amber-600/50' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-400'}`}
                        />
                    </div>
                </div>

                {/* Match mode & Toggle inside meta */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {([
                            { v: 'contains', label: 'Chứa từ khóa' },
                            { v: 'exact', label: 'Chính xác' },
                            { v: 'regex', label: 'Regex' },
                        ] as const).map(opt => (
                            <button key={opt.v}
                                onClick={() => setField('match_mode', opt.v)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                                    ${form.match_mode === opt.v
                                        ? (isDark ? 'bg-amber-600/10 border-amber-600/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700')
                                        : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')
                                    }`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                         <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tình Trạng (Bật/Tắt)</p>
                         <button onClick={() => setField('is_active', form.is_active ? 0 : 1)}
                            className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-inner
                                ${form.is_active ? 'bg-emerald-400 justify-end' : (isDark ? 'bg-slate-700 justify-start' : 'bg-slate-200 justify-start')}`}>
                            <div className="w-4 h-4 bg-white rounded-full shadow-md ring-1 ring-black/5" />
                        </button>
                    </div>
                </div>

                {/* Flow Builder UI */}
                <div className="space-y-4">
                     <h4 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-white border-slate-700' : 'text-slate-800 border-slate-200'}`}>Thiết Kế Luồng Kịch Bản</h4>
                     
                     <div className="space-y-6 relative pl-4 border-l-2" style={{ borderColor: `${accent}30` }}>
                         {nodes.map((node, i) => (
                             <div key={node.id} id={`node-${node.id}`} className={`p-4 rounded-xl border relative
                                 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                 
                                 {/* Dot on the left line */}
                                 <div className="absolute -left-[21px] top-5 w-3 h-3 rounded-full border-2 bg-white" 
                                      style={{ borderColor: accent }} />

                                 <div className="flex items-center justify-between mb-3">
                                     <h5 className={`text-xs font-bold px-2 py-1 rounded bg-black/5 dark:bg-white/10 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                         {node.id === 'root' ? 'Bước 1: Từ khóa kích hoạt' : `Bước nối tiếp`} 
                                         <span className="opacity-50 font-normal ml-2">({node.id})</span>
                                     </h5>
                                     {node.id !== 'root' && (
                                         <button onClick={() => deleteNode(node.id)} className="text-rose-400 hover:text-rose-500 p-1">
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     )}
                                 </div>

                                 {/* Reply Content */}
                                 <div className="mb-4">
                                     <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                         Nội dung Chatbot trả lời <span className="text-rose-400">*</span>
                                     </label>
                                     <div className="space-y-2">
                                         {node.text.split('|||').map((txt, tIdx, arr) => (
                                             <div key={tIdx} className="relative">
                                                 <textarea
                                                     id={tIdx === 0 ? `textarea-${node.id}` : undefined}
                                                     value={txt}
                                                     onChange={e => {
                                                         const newArr = [...arr];
                                                         newArr[tIdx] = e.target.value;
                                                         updateNodeText(node.id, newArr.join('|||'));
                                                     }}
                                                     placeholder="Nhập nội dung trả lời..."
                                                     rows={i === 0 && arr.length === 1 ? 4 : 3}
                                                     className={`w-full px-3 py-2 border rounded-lg text-sm outline-none resize-y min-h-[80px] max-h-[400px]
                                                         ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-amber-600/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-400'}
                                                         ${arr.length > 1 ? 'pr-9' : ''}`}
                                                 />
                                                 {arr.length > 1 && (
                                                     <button
                                                         onClick={() => {
                                                             const newArr = arr.filter((_, idx) => idx !== tIdx);
                                                             updateNodeText(node.id, newArr.join('|||'));
                                                         }}
                                                         className={`absolute top-2 right-2 p-1.5 rounded-md transition-all 
                                                             ${isDark ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/20' : 'bg-white shadow-sm text-rose-500 hover:bg-rose-50'}`}
                                                         title="Xóa câu trả lời này"
                                                     >
                                                         <Trash2 className="w-4 h-4" />
                                                     </button>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                     <button
                                         onClick={() => updateNodeText(node.id, node.text + '|||')}
                                         className={`inline-flex items-center gap-1.5 text-[11px] font-bold mt-2 px-3 py-1.5 rounded-lg border border-dashed transition-all
                                             ${isDark ? 'border-amber-600/30 text-amber-400 hover:bg-amber-600/10' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                                     >
                                         <Plus className="w-3.5 h-3.5" /> Thêm khối tin nhắn (Chat nhiều lần liên tiếp)
                                     </button>
                                 </div>

                                 {/* Buttons */}
                                 <div>
                                     <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                         Các Nút Chọn (Rẽ nhánh) - tối đa 4
                                     </label>
                                     
                                     {!node.buttons.some(b => b.label === '*') && node.buttons.length < 4 && (
                                         <div className="flex gap-2 mb-3">
                                             <input
                                                 type="text"
                                                 value={newBtnLabels[node.id] || ''}
                                                 onChange={e => setNewBtnLabels(p => ({ ...p, [node.id]: e.target.value }))}
                                                 onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNodeButton(node.id))}
                                                 placeholder="Nhập tên nút..."
                                                 className={`flex-1 h-9 px-3 border rounded-lg text-xs outline-none
                                                     ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                             />
                                             <button onClick={() => addNodeButton(node.id)}
                                                 className="h-9 px-4 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shrink-0"
                                                 style={{ backgroundColor: accent }}>
                                                 <Plus className="w-3.5 h-3.5" /> Tạo nút
                                             </button>
                                         </div>
                                     )}

                                     {node.buttons.length > 0 && (
                                         <div className="space-y-2">
                                             {node.buttons.map(btn => {
                                                 const nextNodeExists = nodes.some(n => n.id === btn.next_node);
                                                 const isWildcard = btn.label === '*';

                                                 return (
                                                     <div key={btn.id} className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded border
                                                         ${isWildcard 
                                                             ? (isDark ? 'bg-amber-900/20 border-amber-600/30' : 'bg-amber-50 border-amber-200')
                                                             : (isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200')}`}>
                                                         
                                                         <div className="flex items-center gap-2">
                                                             {isWildcard ? (
                                                                 <span className={`px-2 py-1 flex items-center gap-1.5 rounded-md text-[11px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                                                     <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse relative top-[0.5px]"></span>
                                                                     Người dùng tự do nhập tin nhắn
                                                                 </span>
                                                             ) : (
                                                                 <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                                     {btn.label}
                                                                 </span>
                                                             )}
                                                             <button onClick={() => removeNodeButton(node.id, btn.id)} className="text-rose-400/70 hover:text-rose-500">
                                                                 <X className="w-3.5 h-3.5" />
                                                             </button>
                                                         </div>

                                                         {/* Action Link */}
                                                         <div className="flex items-center gap-2">
                                                             {btn.next_node && nextNodeExists ? (
                                                                 <div className="flex items-center gap-1.5">
                                                                     <button 
                                                                         onClick={() => {
                                                                             const el = document.getElementById(`node-${btn.next_node}`);
                                                                             if (el) {
                                                                                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                 el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
                                                                                 setTimeout(() => {
                                                                                     el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2', 'dark:ring-offset-slate-900');
                                                                                     const txt = document.getElementById(`textarea-${btn.next_node}`);
                                                                                     if (txt) txt.focus();
                                                                                 }, 800);
                                                                             }
                                                                         }}
                                                                         className="text-[10px] font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                                                                         <CheckCircle2 className="w-3 h-3" /> Nối tới: {btn.next_node}
                                                                     </button>
                                                                     <button onClick={() => unlinkNode(node.id, btn.id)} className="text-[10px] text-slate-400 hover:text-rose-400 ml-1">
                                                                         Hủy nối
                                                                     </button>
                                                                 </div>
                                                             ) : (
                                                                 <button onClick={() => linkNewNode(node.id, btn.id)} 
                                                                     className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1.5 transition-colors
                                                                         ${isDark ? 'border-amber-600/30 text-amber-400 hover:bg-amber-600/10' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}>
                                                                     <ArrowDown className="w-3 h-3" /> Tạo bước tiếp theo
                                                                 </button>
                                                             )}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     )}

                                     {/* Bật nhập tự do button */}
                                     {!node.buttons.some(b => b.label === '*') && node.buttons.length < 4 && (
                                         <button onClick={() => {
                                             setNodes(ns => ns.map(n => n.id === node.id ? 
                                                 { ...n, buttons: [...n.buttons, { id: 'btn_' + Math.random().toString(36).substring(2, 9), label: '*', next_node: '' }] } 
                                             : n));
                                         }}
                                         className={`inline-flex items-center gap-1.5 text-[11px] font-bold mt-2 px-3 py-1.5 rounded-lg border transition-all
                                             ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                                             <Plus className="w-3 h-3" /> Thêm nhánh "Bắt mọi tin nhắn"
                                         </button>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>

            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t
                ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <button onClick={onCancel}
                    className={`h-10 px-5 rounded-xl text-sm font-bold border transition-all
                        ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    Hủy bỏ
                </button>
                <button onClick={handleSave} disabled={loading}
                    className="h-10 px-6 rounded-xl text-sm font-bold text-white transition-all shadow-md hover:shadow-lg hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: accent }}>
                    {loading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 12h4z" />
                        </svg>
                    ) : <Save className="w-4 h-4" />}
                    Lưu kịch bản
                </button>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────
//  Main component
// ──────────────────────────────────────────────────────────────────
// ── CSV helpers ────────────────────────────────────────────────────
const CSV_HEADERS = ['title', 'trigger_keywords', 'match_mode', 'reply_text', 'buttons', 'is_active'];

function scenariosToCSV(scenarios: Scenario[]): string {
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = CSV_HEADERS.join(',');
    const rows = scenarios.map(s => [
        escape(s.title),
        escape(s.trigger_keywords),
        escape(s.match_mode),
        escape(s.reply_text),
        escape(s.buttons.map(b => b.label).join(' | ')),
        String(s.is_active)
    ].join(','));
    return [header, ...rows].join('\n');
}

function csvTemplateString(): string {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}`;
    const h = CSV_HEADERS.join(',');
    const ex1 = [
        '"Hỏi học phí EMBA"',
        '"học phí, bao nhiêu tiền, giá emba"',
        'contains',
        '"Dạ, học phí chương trình EMBA là 120 triệu. Anh/chị muốn tư vấn thêm không?"',
        '"Tư vấn ngay | Xem lịch học"',
        '1'
    ].join(',');
    const ex2 = [
        '"Đăng ký xét tuyển"',
        '"đăng ký, xét tuyển, apply"',
        'contains',
        '"Để đăng ký xét tuyển, Anh/chị điền form bên dưới nhé!"',
        '"Điền form | Gọi tư vấn"',
        '1'
    ].join(',');
    return [h, ex1, ex2].join('\n');
}

function parseCSVToScenarios(csv: string, propertyId: string): Array<Omit<Scenario, 'id' | 'created_at' | 'updated_at'>> {
    const results: Array<Omit<Scenario, 'id' | 'created_at' | 'updated_at'>> = [];
    
    // Robust CSV parser to handle newlines in quoted fields
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // Skip \n
            currentRow.push(currentField);
            if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    // Last field/row
    if (currentRow.length > 0 || currentField) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    if (rows.length < 2) throw new Error('File CSV trống hoặc không đúng định dạng');
    
    // Skip header
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 4) continue;
        
        const [title, trigger_keywords, match_mode_raw, reply_text, buttons_raw, is_active_raw] = cols.map(c => c.trim());
        
        const match_mode = (['contains', 'exact', 'regex'] as const).includes(match_mode_raw as any) 
            ? match_mode_raw as 'contains' | 'exact' | 'regex' 
            : 'contains';
            
        const btnLabels = buttons_raw ? buttons_raw.split('|').map(b => b.trim()).filter(Boolean).slice(0, 4) : [];
        const buttons = btnLabels.map(label => ({ id: Math.random().toString(36).slice(2), label }));

        results.push({
            property_id: propertyId,
            title,
            trigger_keywords,
            match_mode,
            reply_text,
            buttons,
            is_active: is_active_raw === '0' ? 0 : 1,
            priority: 0
        });
    }
    return results;
}

const ScenarioManager: React.FC<Props> = ({ propertyId, isDarkTheme, brandColor }) => {
    const isDark = isDarkTheme;
    const accent = brandColor || '#ffa900';

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [globalEnabled, setGlobalEnabled] = useState(true);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const csvInputRef = React.useRef<HTMLInputElement>(null);

    // ── Load scenarios ──────────────────────────────────────────
    const fetchScenarios = useCallback(async () => {
        if (!propertyId) return;
        setLoading(true);
        try {
            const res = await api.get<any>(`ai_scenarios?action=list&property_id=${propertyId}`);
            if (res.success) {
                setScenarios((res as any).data || []);
                setGlobalEnabled((res as any).scenarios_enabled !== false);
            }
        } catch (e) {
            toast.error('Không thể tải kịch bản');
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

    // ── Create scenario ─────────────────────────────────────────
    const handleCreate = async (data: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>) => {
        setSaving(true);
        try {
            const res = await api.post<any>('ai_scenarios?action=create', {
                ...data,
                property_id: propertyId,
                buttons: JSON.stringify(data.buttons)
            });
            if (res.success) {
                toast.success('Đã tạo kịch bản mới', { icon: '🎭' });
                setIsCreating(false);
                fetchScenarios();
            } else {
                toast.error(res.message || 'Lỗi khi tạo kịch bản');
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        } finally {
            setSaving(false);
        }
    };

    // ── Update scenario ─────────────────────────────────────────
    const handleUpdate = async (data: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>) => {
        if (!editingId) return;
        setSaving(true);
        try {
            const res = await api.post<any>('ai_scenarios?action=update', {
                id: editingId,
                ...data,
                property_id: propertyId,
                buttons: JSON.stringify(data.buttons)
            });
            if (res.success) {
                toast.success('Đã cập nhật kịch bản');
                setEditingId(null);
                fetchScenarios();
            } else {
                toast.error(res.message || 'Lỗi khi cập nhật');
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        } finally {
            setSaving(false);
        }
    };

    // ── Clone scenario ──────────────────────────────────────────
    const handleClone = async (id: string) => {
        try {
            const res = await api.post<any>('ai_scenarios?action=clone', { id, property_id: propertyId });
            if (res.success) {
                toast.success('Đã nhân bản Kịch Bản');
                fetchScenarios();
            } else {
                toast.error(res.message || 'Lỗi nhân bản');
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        }
    };

    // ── Delete scenario ─────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa kịch bản này?')) return;
        try {
            const res = await api.post<any>('ai_scenarios?action=delete', { id, property_id: propertyId });
            if (res.success) {
                toast.success('Đã xóa kịch bản');
                fetchScenarios();
            }
        } catch (e) {
            toast.error('Lỗi kết nối');
        }
    };

    // ── Toggle single scenario ──────────────────────────────────
    const handleToggle = async (scenario: Scenario) => {
        const newStatus = scenario.is_active ? 0 : 1;
        setScenarios(prev => prev.map(s => s.id === scenario.id ? { ...s, is_active: newStatus } : s));
        try {
            await api.post<any>('ai_scenarios?action=toggle', {
                id: scenario.id,
                property_id: propertyId,
                is_active: newStatus
            });
        } catch (e) {
            // Rollback
            setScenarios(prev => prev.map(s => s.id === scenario.id ? { ...s, is_active: scenario.is_active } : s));
            toast.error('Lỗi cập nhật');
        }
    };

    // ── Toggle global ───────────────────────────────────────────
    const handleToggleGlobal = async () => {
        const newVal = !globalEnabled;
        setGlobalEnabled(newVal);
        setGlobalLoading(true);
        try {
            await api.post<any>('ai_scenarios?action=toggle_global', {
                property_id: propertyId,
                enabled: newVal ? 1 : 0
            });
            toast.success(newVal ? 'Đã bật Kịch Bản' : 'Đã tắt toàn bộ Kịch Bản');
        } catch (e) {
            setGlobalEnabled(!newVal);
            toast.error('Lỗi cập nhật');
        } finally {
            setGlobalLoading(false);
        }
    };

    // ── Priority up/down ────────────────────────────────────────
    const handleMovePriority = async (idx: number, direction: 'up' | 'down') => {
        const newList = [...scenarios];
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= newList.length) return;
        [newList[idx], newList[swapWith]] = [newList[swapWith], newList[idx]];
        // Reassign priorities
        const updated = newList.map((s, i) => ({ ...s, priority: newList.length - i }));
        setScenarios(updated);
        try {
            await api.post<any>('ai_scenarios?action=reorder', {
                property_id: propertyId,
                order: updated.map(s => ({ id: s.id, priority: s.priority }))
            });
        } catch (e) {
            toast.error('Lỗi cập nhật thứ tự');
            fetchScenarios();
        }
    };

    const editingScenario = editingId ? scenarios.find(s => s.id === editingId) : null;
    const activeCount = scenarios.filter(s => s.is_active).length;

    // ── CSV export (download existing) ─────────────────────────
    const handleExportCSV = () => {
        if (scenarios.length === 0) { toast.error('Không có kịch bản nào để xuất'); return; }
        const csv = scenariosToCSV(scenarios);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `scenarios_${propertyId}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Xuất CSV thành công');
    };

    // ── CSV template download ────────────────────────────────────
    const handleDownloadTemplate = () => {
        const csv = csvTemplateString();
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'scenarios_template.csv'; a.click();
        URL.revokeObjectURL(url);
        toast.success('Tải mẫu CSV xong');
    };

    // ── CSV import ───────────────────────────────────────────────
    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (csvInputRef.current) csvInputRef.current.value = '';
        if (!file) return;
        setImporting(true);
        const tid = toast.loading('Đang import kịch bản...');
        try {
            const text = await file.text();
            const rows = parseCSVToScenarios(text, propertyId);
            if (rows.length === 0) { toast.error('Không đọc được dữ liệu hợp lệ', { id: tid }); return; }
            let ok = 0, fail = 0;
            for (const row of rows) {
                try {
                    const res = await api.post<any>('ai_scenarios?action=create', {
                        ...row, property_id: propertyId,
                        buttons: JSON.stringify(row.buttons)
                    });
                    if (res.success) {
                        ok++;
                    } else {
                        console.error('Scenario import item failed:', res.message, row);
                        fail++;
                    }
                } catch (err) {
                    console.error('Scenario import request error:', err);
                    fail++;
                }
            }
            toast.success(`Import xong: ${ok} thành công${fail ? `, ${fail} lỗi` : ''}`, { id: tid, duration: 5000 });
            fetchScenarios();
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message, { id: tid });
        } finally {
            setImporting(false);
        }
    };


    return (
        <div className="space-y-6">
            {/* Header / Global Toggle */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border
                ${isDark ? 'bg-slate-800/20 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                        <Play className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            Kịch Bản Hội Thoại
                        </h3>
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {scenarios.length > 0
                                ? `${activeCount}/${scenarios.length} kịch bản đang hoạt động · Chatbot ưu tiên kịch bản trước AI`
                                : 'Tạo kịch bản để chatbot trả lời có kịch bản, có nút bấm'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* CSV hidden input */}
                    <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />

                    {/* Download template */}
                    <button onClick={handleDownloadTemplate} title="Tải file mẫu CSV"
                        className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold border transition-all
                            ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                        <FileText className="w-3.5 h-3.5" /> Mẫu CSV
                    </button>

                    {/* Import CSV */}
                    <button onClick={() => csvInputRef.current?.click()} disabled={importing}
                        className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold border transition-all
                            ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                        <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang import...' : 'Import CSV'}
                    </button>

                    {/* Export CSV */}
                    {scenarios.length > 0 && (
                        <button onClick={handleExportCSV}
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold border transition-all
                                ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                            <Download className="w-3.5 h-3.5" /> Export
                        </button>
                    )}

                    {/* Global on/off */}
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border cursor-pointer select-none transition-all
                        ${isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                        onClick={handleToggleGlobal}>
                        <span className={`text-[10px] font-black uppercase tracking-widest
                            ${globalEnabled ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                            {globalEnabled ? 'Đang bật' : 'Đã tắt'}
                        </span>
                        <div className={`w-11 h-6 rounded-full p-1 transition-all duration-300 flex items-center shadow-inner
                            ${globalEnabled ? 'bg-emerald-400 justify-end' : (isDark ? 'bg-slate-700 justify-start' : 'bg-slate-200 justify-start')}`}>
                            <div className="w-4 h-4 bg-white rounded-full shadow-md ring-1 ring-black/5" />
                        </div>
                    </div>

                    {/* Add button */}
                    {!isCreating && !editingId && (
                        <button onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                            style={{ backgroundColor: accent }}>
                            <Plus className="w-4 h-4" /> Tạo kịch bản
                        </button>
                    )}
                </div>
            </div>

            {/* Global disabled banner */}
            {!globalEnabled && (
                <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${isDark ? 'border-amber-600/20 bg-amber-600/5' : 'border-amber-200 bg-amber-50'}`}>
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        Tính năng Kịch Bản đang <strong>tắt</strong>. Chatbot sẽ dùng AI hoàn toàn. Bật lại để áp dụng kịch bản.
                    </p>
                </div>
            )}

            {/* Create form */}
            {isCreating && (
                <ScenarioForm
                    propertyId={propertyId}
                    isDark={isDark}
                    brandColor={accent}
                    onSave={handleCreate}
                    onCancel={() => setIsCreating(false)}
                    loading={saving}
                />
            )}

            {/* Edit form */}
            {editingId && editingScenario && (
                <ScenarioForm
                    initial={editingScenario}
                    propertyId={propertyId}
                    isDark={isDark}
                    brandColor={accent}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    loading={saving}
                />
            )}

            {/* Empty state */}
            {!loading && scenarios.length === 0 && !isCreating && (
                <div className={`flex flex-col items-center justify-center py-16 px-6 rounded-2xl border border-dashed text-center
                    ${isDark ? 'border-slate-700 bg-slate-800/10' : 'border-slate-200 bg-slate-50/30'}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-100'}`}>
                        <BookOpen className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                    </div>
                    <h4 className={`text-base font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Chưa có kịch bản nào
                    </h4>
                    <p className={`text-sm font-medium mb-6 max-w-sm leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Tạo kịch bản để chatbot trả lời theo flow định sẵn với các nút bấm, giúp dẫn dắt khách hàng hiệu quả hơn.
                    </p>
                    <button onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white shadow-md hover:brightness-110 transition-all"
                        style={{ backgroundColor: accent }}>
                        <Plus className="w-4 h-4" /> Tạo kịch bản đầu tiên
                    </button>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-24 rounded-2xl animate-pulse ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`} />
                    ))}
                </div>
            )}

            {/* Scenario list */}
            {!loading && scenarios.length > 0 && !isCreating && !editingId && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {scenarios.length} kịch bản · Kéo thả để thay đổi độ ưu tiên
                        </p>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {activeCount} đang hoạt động
                        </div>
                    </div>
                    {scenarios.map((scenario, idx) => (
                        <ScenarioCard
                            key={scenario.id}
                            scenario={scenario}
                            isDark={isDark}
                            brandColor={accent}
                            onEdit={() => setEditingId(scenario.id)}
                            onDelete={() => handleDelete(scenario.id)}
                            onToggle={() => handleToggle(scenario)}
                            onClone={() => handleClone(scenario.id)}
                            onMoveUp={() => handleMovePriority(idx, 'up')}
                            onMoveDown={() => handleMovePriority(idx, 'down')}
                        />
                    ))}
                </div>
            )}

            {/* Tips box */}
            {scenarios.length > 0 && !isCreating && !editingId && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border
                    ${isDark ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-100 bg-blue-50/50'}`}>
                    <CircleDashed className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className={`text-[11px] font-medium leading-relaxed space-y-1 ${isDark ? 'text-blue-400/80' : 'text-blue-600'}`}>
                        <p><strong>Cách hoạt động:</strong> Khi user gửi tin nhắn, chatbot kiểm tra từ khóa theo thứ tự ưu tiên (từ trên xuống). Nếu khớp → trả lời theo kịch bản + hiển thị nút. Nếu không khớp → AI xử lý bình thường.</p>
                        <p>Dùng nút <strong>↑ ↓</strong> để thay đổi thứ tự ưu tiên.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScenarioManager;
