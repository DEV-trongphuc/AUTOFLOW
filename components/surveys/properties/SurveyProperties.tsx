import React, { useRef, useState, useEffect } from 'react';
import { Survey, SurveyBlock, MatrixRow, MatrixCol } from '../../../types/survey';
import {
    Settings, Plus, Trash2, GripVertical, Upload, Link, AlignLeft, AlignCenter, AlignRight,
    Image, Palette, Settings2, Heart, Calendar, Clock, Hash, Zap, GitMerge, ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from '../../../utils/config';
import { api } from '../../../services/storageAdapter';
import FileLibraryModal from '../../common/FileLibraryModal';

interface Props {
    survey: Survey;
    selectedBlock: SurveyBlock | null;
    selectedBlockId: string | null;
    onUpdateBlock: (id: string, changes: Partial<SurveyBlock>) => void;
    onUpdateSurvey: (changes: Partial<Survey>) => void;
}

// ─── Flow Trigger Selector ───────────────────────────────────────────────
const FlowTriggerSelector: React.FC<{
    value: string | null;
    onChange: (flowId: string | null) => void;
}> = ({ value, onChange }) => {
    const [flows, setFlows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get<any>('flows').then(r => {
            if (r.success) {
                const surveyFlows = (r.data ?? []).filter((f: any) =>
                    f.status !== 'archived' &&
                    (f.trigger_type === 'survey' ||
                     (f.steps ?? []).some((s: any) => s.type === 'trigger' && s.config?.type === 'survey'))
                );
                setFlows(surveyFlows);
            }
        }).finally(() => setLoading(false));
    }, []);

    const selected = flows.find(f => f.id === value);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left hover:border-amber-300 transition-all"
            >
                <span className="flex items-center gap-2 flex-1 min-w-0">
                    <GitMerge className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate font-medium text-slate-700">
                        {loading ? 'Đang tải...' : selected ? selected.name : 'Chưa chọn flow'}
                    </span>
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                        <button
                            onClick={() => { onChange(null); setOpen(false); }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50 transition-all"
                        >
                            Không kích hoạt flow
                        </button>
                        {flows.length === 0 && !loading && (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">
                                Chưa có flow nào có trigger “Survey Submit”
                            </div>
                        )}
                        {flows.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { onChange(f.id); setOpen(false); }}
                                className={`w-full px-3 py-2.5 text-left flex items-center gap-2 text-xs transition-all ${
                                    f.id === value ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <GitMerge className="w-3 h-3 flex-shrink-0" />
                                <span className="flex-1 truncate">{f.name}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                    f.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                }`}>{f.status}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Shared micro-components ─────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] mb-1.5">{children}</label>
);

const FieldInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`w-full px-3 py-2 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/20 transition-all shadow-sm ${props.className ?? ''}`} />
);

const FieldTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className={`w-full px-3 py-2.5 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/20 transition-all shadow-sm resize-none ${props.className ?? ''}`} />
);

const FieldSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <div className={`relative ${props.className?.includes('w-fit') ? 'w-fit' : 'w-full'}`}>
        <select {...props} className={`appearance-none w-full px-3 py-2 text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-[3px] focus:ring-amber-500/20 transition-all shadow-sm pr-8 ${props.className ?? ''}`}>
            {props.children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
);

const Toggle: React.FC<{ value: boolean; onChange: () => void; label: string }> = ({ value, onChange, label }) => (
    <div className="flex items-center justify-between py-0.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <button onClick={onChange} className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-amber-500' : 'bg-slate-200'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
        </button>
    </div>
);

const AlignButtons: React.FC<{ value?: string; onChange: (v: 'left' | 'center' | 'right') => void }> = ({ value = 'left', onChange }) => (
    <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map(a => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
            return (
                <button key={a} onClick={() => onChange(a)}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${value === a ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                    <Icon className="w-3.5 h-3.5" />
                </button>
            );
        })}
    </div>
);

const ColorRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
    const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(value ?? '');
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <label className="relative flex-shrink-0 cursor-pointer">
                    <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200 transition-transform hover:scale-110"
                        style={{ background: value }}
                    />
                    <input type="color" value={isHex ? value : '#ffffff'} onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8" />
                </label>
                <FieldInput value={value} onChange={e => onChange(e.target.value)} className="font-mono" />
            </div>
        </div>
    );
};

const ShadowRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
    const presets = [
        { label: 'Không', value: 'none' },
        { label: 'Rất nhẹ', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
        { label: 'Nhẹ (sm)', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
        { label: 'Vừa (md)', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
        { label: 'Đậm (lg)', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
        { label: 'Nổi 3D (2xl)', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
    ];
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex flex-col gap-2">
                <select 
                    value={presets.find(p => p.value === value) ? value : 'custom'} 
                    onChange={e => { if (e.target.value !== 'custom') onChange(e.target.value); }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                    {presets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    {!presets.find(p => p.value === value) && value && <option value="custom">Tùy chỉnh CSS...</option>}
                </select>
                <FieldInput value={value || 'none'} onChange={e => onChange(e.target.value)} className="font-mono text-[10px]" />
            </div>
        </div>
    );
};

const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-slate-100" />
    </div>
);

// ─── Image uploader with Library ─────────────────────────────────────────────
const ImageUploader: React.FC<{
    value: string;
    onChange: (url: string) => void;
    label?: string;
}> = ({ value, onChange, label = 'Hình ảnh' }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [tab, setTab] = useState<'url' | 'upload'>('upload');
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'surveys');
        try {
            const res = await fetch(`${API_BASE_URL}/upload.php`, { method: 'POST', body: fd, credentials: 'include' });
            const json = await res.json();
            if (json.success && json.url) { onChange(json.url); }
        } catch { /* ignore */ } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <Label>{label}</Label>
                <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                >
                    <Image className="w-3 h-3" /> Thư viện
                </button>
            </div>

            <div className="flex gap-0.5 mb-2 bg-slate-100 rounded-xl p-0.5">
                {([
                    { key: 'upload',  label: 'Tải lên' },
                    { key: 'url',     label: 'Nhập URL' },
                ] as const).map(t => (
                    <button key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                            tab === t.key ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >{t.label}</button>
                ))}
            </div>

            {tab === 'url' && (
                <FieldInput value={value} onChange={e => onChange(e.target.value)} placeholder="https://..." />
            )}

            {tab === 'upload' && (
                <div>
                    <button onClick={() => fileRef.current?.click()}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
                        disabled={uploading}
                    >
                        {uploading ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Đang tải...' : 'Chọn ảnh từ máy'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
            )}

            {value && (
                <div className="relative mt-2 group">
                    <img src={value} alt="" className="w-full h-20 object-cover rounded-xl border border-slate-100" />
                    <button onClick={() => onChange('')}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-500"
                    >×</button>
                </div>
            )}

            <FileLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                multi={false}
                onSelect={(files) => {
                    if (files[0]) onChange(files[0].url);
                }}
            />
        </div>
    );
};


// ─── Matrix editor ────────────────────────────────────────────────────────────
const MatrixEditor: React.FC<{
    rows: MatrixRow[];
    cols: MatrixCol[];
    onChangeRows: (rows: MatrixRow[]) => void;
    onChangeCols: (cols: MatrixCol[]) => void;
}> = ({ rows, cols, onChangeRows, onChangeCols }) => {
    const addRow = () => onChangeRows([...rows, { id: crypto.randomUUID(), label: `Tiêu chí ${rows.length + 1}` }]);
    const addCol = () => onChangeCols([...cols, { id: crypto.randomUUID(), label: `Cột ${cols.length + 1}` }]);
    const editRow = (id: string, label: string) => onChangeRows(rows.map(r => r.id === id ? { ...r, label } : r));
    const editCol = (id: string, label: string) => onChangeCols(cols.map(c => c.id === id ? { ...c, label } : c));
    const deleteRow = (id: string) => onChangeRows(rows.filter(r => r.id !== id));
    const deleteCol = (id: string) => onChangeCols(cols.filter(c => c.id !== id));

    return (
        <div className="space-y-3">
            {/* Rows */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <Label>Hàng (Tiêu chí)</Label>
                    <button onClick={addRow} className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-bold">
                        <Plus className="w-3 h-3" /> Thêm
                    </button>
                </div>
                <div className="space-y-1">
                    {rows.map(row => (
                        <div key={row.id} className="flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <input
                                value={row.label}
                                onChange={e => editRow(row.id, e.target.value)}
                                className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <button onClick={() => deleteRow(row.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {/* Cols */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <Label>Cột (Mức đánh giá)</Label>
                    <button onClick={addCol} className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-bold">
                        <Plus className="w-3 h-3" /> Thêm
                    </button>
                </div>
                <div className="space-y-1">
                    {cols.map(col => (
                        <div key={col.id} className="flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <input
                                value={col.label}
                                onChange={e => editCol(col.id, e.target.value)}
                                className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <button onClick={() => deleteCol(col.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Thank You Page Designer ─────────────────────────────────────────────
const ThankYouDesigner: React.FC<{
    survey: Survey;
    onUpdate: (changes: Partial<Survey>) => void;
}> = ({ survey, onUpdate }) => {
    const ty = survey.thankYouPage;
    const upd = (changes: Partial<typeof ty>) => onUpdate({ thankYouPage: { ...ty, ...changes } });
    const EMOJIS = ['🎉', '🙏', '✅', '💎', '🚀', '❤️', '⭐', '🔥', '💐', '👏'];

    return (
        <div className="space-y-3">
            <div>
                <Label>Emoji</Label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                    {EMOJIS.map(e => (
                        <button key={e} onClick={() => upd({ emoji: e, title: ty.title })}
                            className={`w-8 h-8 text-lg flex items-center justify-center rounded-lg transition-all ${ty.emoji === e || (!ty.emoji && e === '🎉') ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-slate-50 hover:bg-slate-100'}`}
                        >{e}</button>
                    ))}
                </div>
                <FieldInput value={ty.emoji ?? ''} onChange={e => upd({ emoji: e.target.value })} placeholder="Nhập emoji tuỳ chỉnh..." />
            </div>
            <div>
                <Label>Tiêu đề</Label>
                <FieldInput value={ty.title} onChange={e => upd({ title: e.target.value })} placeholder="Cảm ơn bạn! 🎉" />
            </div>
            <div>
                <Label>Nội dung</Label>
                <FieldTextarea value={ty.message} onChange={e => upd({ message: e.target.value })} rows={3} placeholder="Phản hồi của bạn đã được ghi nhận..." />
            </div>
            <ImageUploader value={ty.imageUrl ?? ''} onChange={v => upd({ imageUrl: v })} label="Ảnh minh hoạ (tuỳ chọn)" />
            <SectionDivider label="Nút CTA" />
            <div>
                <Label>Text nút</Label>
                <FieldInput value={ty.ctaText ?? ''} onChange={e => upd({ ctaText: e.target.value })} placeholder="VD: Xem kết quả ngay" />
            </div>
            <div>
                <Label>Link nút</Label>
                <FieldInput value={ty.ctaUrl ?? ''} onChange={e => upd({ ctaUrl: e.target.value })} placeholder="https://..." />
            </div>
            {/* Button color */}
            <ColorRow label="Màu nút CTA" value={(ty as any).ctaColor ?? '#f59e0b'} onChange={v => upd({ ...(ty as any), ctaColor: v })} />
            <SectionDivider label="Redirect" />
            <div>
                <Label>URL chuyển hướng</Label>
                <FieldInput value={ty.redirectUrl ?? ''} onChange={e => upd({ redirectUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div>
                <Label>Thời gian chờ (giây)</Label>
                <FieldInput type="number" value={ty.redirectDelay ?? ''} onChange={e => upd({ redirectDelay: +e.target.value })} placeholder="3" />
            </div>
            <Toggle value={ty.showSocialShare} onChange={() => upd({ showSocialShare: !ty.showSocialShare })} label="Chia sẻ mạng xã hội" />
        </div>
    );
};

// ─── Main component ──────────────────────────────────────────────────
const SurveyProperties: React.FC<Props> = ({ survey, selectedBlock, selectedBlockId, onUpdateBlock, onUpdateSurvey }) => {
    const [settingsTab, setSettingsTab] = useState<'theme' | 'settings' | 'thankyou'>('theme');

    // Auto-switch to thankyou tab when __thankyou__ block is clicked
    useEffect(() => {
        if (selectedBlockId === '__thankyou__') setSettingsTab('thankyou');
        else if (selectedBlockId === '__cover__') setSettingsTab('theme');
    }, [selectedBlockId]);

    const TABS = [
        { key: 'theme',    label: 'Giao diện', icon: Palette },
        { key: 'settings', label: 'Cấu hình',  icon: Settings2 },
        { key: 'thankyou', label: 'Cảm ơn',    icon: Heart },
    ] as const;

    // Survey-level settings (nothing selected OR special blocks)
    if (!selectedBlock) {
        return (
            <div className="w-80 bg-white border-l border-slate-100 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5" /> Cài đặt khảo sát
                    </h3>
                </div>
                {/* Icon tabs */}
                <div className="flex border-b border-slate-100">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setSettingsTab(key)}
                            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[9px] font-bold transition-all ${
                                settingsTab === key
                                    ? 'text-amber-600 border-b-2 border-amber-500'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {settingsTab === 'theme' && (
                        <>
                            <ColorRow label="Màu chủ đạo" value={survey.theme?.primaryColor ?? '#f59e0b'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, primaryColor: v } })} />
                            <ColorRow label="Màu nền trang" value={survey.theme?.backgroundColor ?? '#f8fafc'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, backgroundColor: v } })} />
                            <ColorRow label="Màu card" value={survey.theme?.cardBackground ?? '#ffffff'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, cardBackground: v } })} />
                            <ShadowRow label="Đổ bóng Card" value={survey.theme?.cardShadow ?? 'none'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, cardShadow: v } as any })} />
                            <ColorRow label="Màu chữ" value={survey.theme?.textColor ?? '#1e293b'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, textColor: v } })} />
                            <SectionDivider label="Header / Cover" />

                            {/* Cover style toggle */}
                            <div>
                                <Label>Kiểu header</Label>
                                <div className="grid grid-cols-3 gap-1">
                                    {([['minimal', 'Minimal'], ['gradient', 'Gradient'], ['image', 'Ảnh']] as const).map(([s, lbl]) => (
                                        <button key={s} onClick={() => onUpdateSurvey({ theme: { ...survey.theme, coverStyle: s } })}
                                            className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${
                                                (survey.theme?.coverStyle ?? 'minimal') === s
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >{lbl}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Gradient color pickers when gradient mode */}
                            {survey.theme?.coverStyle === 'gradient' && (
                                <>
                                    <ColorRow label="Màu gradient đầu" value={(survey.theme as any).gradientFrom ?? survey.theme?.primaryColor ?? '#b45309'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, gradientFrom: v } as any })} />
                                    <ColorRow label="Màu gradient cuối" value={(survey.theme as any).gradientTo ?? '#f59e0b'} onChange={v => onUpdateSurvey({ theme: { ...survey.theme, gradientTo: v } as any })} />
                                </>
                            )}

                            {/* Image uploader first when image mode */}
                            {survey.theme?.coverStyle === 'image' && (
                                <ImageUploader
                                    value={survey.theme?.coverImageUrl ?? ''}
                                    onChange={v => onUpdateSurvey({ theme: { ...survey.theme, coverImageUrl: v } })}
                                    label="Ảnh bên trên (header)"
                                />
                            )}

                            {/* Height selector */}
                            <div>
                                <Label>Chiều cao header</Label>
                                <div className="grid grid-cols-3 gap-1">
                                    {(['sm', 'md', 'lg'] as const).map(h => (
                                        <button key={h} onClick={() => onUpdateSurvey({ theme: { ...survey.theme, coverHeight: h } })}
                                            className={`py-1.5 text-[10px] font-bold rounded-lg uppercase transition-all ${
                                                (survey.theme?.coverHeight ?? 'md') === h
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >{h}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Logo URL</Label>
                                <FieldInput value={survey.theme?.logoUrl ?? ''} onChange={e => onUpdateSurvey({ theme: { ...survey.theme, logoUrl: e.target.value } })} placeholder="https://..." />
                            </div>

                            <SectionDivider label="Nội dung Hero / Marketing" />

                            <div>
                                <Label>Badge (Huy hiệu góc trái)</Label>
                                <FieldInput value={survey.theme?.coverBadge ?? ''} onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverBadge: e.target.value } as any })} placeholder="VD: SALE SỐC" />
                            </div>

                            <div>
                                <Label>Đoạn giới thiệu ngắn</Label>
                                <FieldTextarea 
                                    className="resize-y"
                                    rows={3}
                                    value={survey.theme?.coverDescription ?? ''}
                                    onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverDescription: e.target.value } as any })}
                                    placeholder="Nhập giới thiệu khảo sát..."
                                />
                            </div>

                            <div>
                                <Label>Đếm ngược tới hẹn</Label>
                                <div className="flex flex-col gap-2">
                                    <FieldInput type="datetime-local" value={survey.theme?.coverCountdown ?? ''} onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverCountdown: e.target.value } as any })} />
                                    {survey.theme?.coverCountdown && (
                                        <FieldSelect 
                                            value={survey.theme?.coverCountdownPos ?? 'bottom'}
                                            onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverCountdownPos: e.target.value } as any })}
                                        >
                                            <option value="bottom">Nguyên khối (Dưới cùng)</option>
                                            <option value="top_right">Huy hiệu nhỏ (Góc phải)</option>
                                        </FieldSelect>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <Label>Danh sách nổi bật</Label>
                                    <FieldSelect 
                                        className="!w-24 !py-1 !text-[10px]"
                                        value={survey.theme?.coverFeaturesStyle ?? 'check'}
                                        onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverFeaturesStyle: e.target.value } as any })}
                                    >
                                        <option value="check">Nút Check</option>
                                        <option value="dot">Dấu Chấm</option>
                                    </FieldSelect>
                                </div>
                                <FieldTextarea 
                                    className="font-mono resize-y"
                                    rows={4}
                                    value={(survey.theme?.coverFeatures ?? []).join('\n')}
                                    onChange={e => onUpdateSurvey({ theme: { ...survey.theme, coverFeatures: e.target.value.split('\n').filter(Boolean) } as any })}
                                    placeholder="Miễn phí 100%&#10;Quà tặng bí mật&#10;Không lộ danh tính"
                                />
                            </div>
                        </>
                    )}

                    {settingsTab === 'settings' && (
                        <>
                            <Toggle value={survey.settings?.showProgressBar} onChange={() => onUpdateSurvey({ settings: { ...survey.settings, showProgressBar: !survey.settings?.showProgressBar } })} label="Thanh tiến trình" />
                            <Toggle value={survey.settings?.allowPartialSubmit} onChange={() => onUpdateSurvey({ settings: { ...survey.settings, allowPartialSubmit: !survey.settings?.allowPartialSubmit } })} label="Cho phép nộp một phần" />
                            <Toggle value={survey.settings?.trackIp} onChange={() => onUpdateSurvey({ settings: { ...survey.settings, trackIp: !survey.settings?.trackIp } })} label="Ghi nhận IP" />
                            <SectionDivider label="Nhận diện người dùng" />
                            <div>
                                <Toggle
                                    value={!!(survey.settings as any)?.allow_anonymous}
                                    onChange={() => onUpdateSurvey({ settings: { ...survey.settings, allow_anonymous: !(survey.settings as any)?.allow_anonymous } } as any)}
                                    label="Cho phép ẩn danh"
                                />
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed pl-9">
                                    Không yêu cầu email — phản hồi không liên kết với người dùng nào.
                                </p>
                            </div>
                            <div>
                                <Toggle
                                    value={!!(survey.settings as any)?.email_tracking}
                                    onChange={() => onUpdateSurvey({ settings: { ...survey.settings, email_tracking: !(survey.settings as any)?.email_tracking } } as any)}
                                    label="Email tracking"
                                />
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed pl-9">
                                    Tự nhận diện người dùng qua <code className="bg-slate-100 px-1 rounded text-[9px]">?uid={'{{email}}'}</code> trong link public.
                                </p>
                            </div>
                            <SectionDivider label="Automation Flow" />
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-200/60 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2" />
                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-amber-500">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-black text-amber-900 tracking-tight leading-none uppercase">Kịch bản sau khảo sát</h4>
                                        <p className="text-[9px] text-amber-700/80 mt-0.5 leading-tight">Chăm sóc khách tự động</p>
                                    </div>
                                    {/* Toggle */}
                                    <button
                                        onClick={() => onUpdateSurvey({ flow_trigger_id: (survey as any).flow_trigger_id ? null : 'enable_intent' } as any)}
                                        className={`relative w-10 h-5 rounded-full transition-colors shadow-inner ${
                                            (survey as any).flow_trigger_id ? 'bg-amber-500' : 'bg-slate-300'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                            (survey as any).flow_trigger_id ? 'left-5.5 left-[22px]' : 'left-[2px]'
                                        }`} />
                                    </button>
                                </div>
                                
                                {/* Selector conditionally shown */}
                                {(survey as any).flow_trigger_id && (
                                    <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <FlowTriggerSelector
                                            value={(survey as any).flow_trigger_id === 'enable_intent' ? null : (survey as any).flow_trigger_id}
                                            onChange={v => onUpdateSurvey({ flow_trigger_id: v } as any)}
                                        />
                                        <p className="text-[9px] text-amber-800/70 mt-1.5 leading-relaxed font-medium">
                                            Chọn kịch bản "Phản hồi Khảo sát" để gửi Email cảm ơn hoặc gắn Tag ngay khi khách nộp đơn.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {settingsTab === 'thankyou' && (
                        <ThankYouDesigner survey={survey} onUpdate={onUpdateSurvey} />
                    )}
                </div>
            </div>
        );
    }

    // Block-level properties
    const block = selectedBlock;
    const update = (changes: Partial<SurveyBlock>) => onUpdateBlock(block.id, changes);
    const isLayout = ['section_header', 'image_block', 'divider', 'page_break', 'button_block', 'link_block', 'banner_block'].includes(block.type);

    return (
        <div className="w-80 bg-white border-l border-slate-100 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" /> Cấu hình câu hỏi
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* Label */}
                {!['divider', 'page_break', 'button_block', 'link_block'].includes(block.type) && (
                    <div>
                        <Label>Câu hỏi / Tiêu đề</Label>
                        <FieldTextarea value={block.label} onChange={e => update({ label: e.target.value })} rows={2} />
                    </div>
                )}

                {/* Description */}
                {!['divider', 'page_break', 'button_block', 'link_block', 'banner_block'].includes(block.type) && (
                    <div>
                        <Label>Mô tả phụ (tuỳ chọn)</Label>
                        <FieldInput value={block.description ?? ''} onChange={e => update({ description: e.target.value })} placeholder="Gợi ý cho người điền..." />
                    </div>
                )}

                {/* Required */}
                {!isLayout && (
                    <Toggle value={block.required} onChange={() => update({ required: !block.required })} label="Bắt buộc trả lời" />
                )}

                {/* ─ Text input config ─ */}
                {['short_text', 'long_text', 'email', 'phone', 'number'].includes(block.type) && (
                    <div>
                        <Label>Placeholder</Label>
                        <FieldInput value={block.placeholder ?? ''} onChange={e => update({ placeholder: e.target.value })} placeholder="Ví dụ: Nhập tên của bạn..." />
                    </div>
                )}

                {/* ─ Choice options ─ */}
                {['single_choice', 'multi_choice', 'dropdown', 'yes_no', 'ranking'].includes(block.type) && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label>Lựa chọn</Label>
                            <button
                                onClick={() => update({ options: [...(block.options ?? []), { id: crypto.randomUUID(), label: `Lựa chọn ${(block.options?.length ?? 0) + 1}`, value: String((block.options?.length ?? 0) + 1) }] })}
                                className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-bold"
                            >
                                <Plus className="w-3 h-3" /> Thêm
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {(block.options ?? []).map(opt => (
                                <div key={opt.id} className="flex items-center gap-1.5">
                                    <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                    <input
                                        value={opt.label}
                                        onChange={e => update({ options: block.options?.map(o => o.id === opt.id ? { ...o, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') } : o) })}
                                        className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
                                    />
                                    <button onClick={() => update({ options: block.options?.filter(o => o.id !== opt.id) })} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {['single_choice', 'multi_choice'].includes(block.type) && (
                            <div className="mt-2">
                                <Toggle value={!!block.allowOther} onChange={() => update({ allowOther: !block.allowOther })} label='Thêm ô "Khác..."' />
                            </div>
                        )}
                    </div>
                )}

                {/* ─ Matrix editor ─ */}
                {['matrix_single', 'matrix_multi'].includes(block.type) && (
                    <MatrixEditor
                        rows={block.matrixRows ?? []}
                        cols={block.matrixCols ?? []}
                        onChangeRows={rows => update({ matrixRows: rows })}
                        onChangeCols={cols => update({ matrixCols: cols })}
                    />
                )}

                {/* ─ Date config ─ */}
                {block.type === 'date' && (
                    <>
                        <div>
                            <Label>Chế độ</Label>
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    onClick={() => update({ dateMode: 'date' } as any)}
                                    className={`py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold rounded-lg transition-all ${

                                        (block as any).dateMode !== 'datetime' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <Calendar className="w-3 h-3" /> Chỉ ngày
                                </button>
                                <button
                                    onClick={() => update({ dateMode: 'datetime' } as any)}
                                    className={`py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                        (block as any).dateMode === 'datetime' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <Clock className="w-3 h-3" /> Ngày + giờ
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ─ Likert editor ─ */}
                {block.type === 'likert' && (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label>Các mức đánh giá</Label>
                            <button
                                onClick={() => {
                                    const cur = (block as any).likertPoints ?? [
                                        { value: 1, label: (block.likertLabels ?? [])[0] ?? 'Rất không đồng ý' },
                                        { value: 2, label: (block.likertLabels ?? [])[1] ?? 'Không đồng ý' },
                                        { value: 3, label: (block.likertLabels ?? [])[2] ?? 'Bình thường' },
                                        { value: 4, label: (block.likertLabels ?? [])[3] ?? 'Đồng ý' },
                                        { value: 5, label: (block.likertLabels ?? [])[4] ?? 'Rất đồng ý' },
                                    ];
                                    const next = [...cur, { value: cur.length + 1, label: `Mức ${cur.length + 1}` }];
                                    update({ likertPoints: next, likertLabels: next.map((p: any) => p.label) } as any);
                                }}
                                className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 font-bold"
                            >
                                <Plus className="w-3 h-3" /> Thêm
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {((block as any).likertPoints ?? [
                                { value: 1, label: (block.likertLabels ?? [])[0] ?? 'Rất không đồng ý' },
                                { value: 2, label: (block.likertLabels ?? [])[1] ?? 'Không đồng ý' },
                                { value: 3, label: (block.likertLabels ?? [])[2] ?? 'Bình thường' },
                                { value: 4, label: (block.likertLabels ?? [])[3] ?? 'Đồng ý' },
                                { value: 5, label: (block.likertLabels ?? [])[4] ?? 'Rất đồng ý' },
                            ] as any[]).map((pt: any, i: number) => {
                                const pts: any[] = (block as any).likertPoints ?? [
                                    { value: 1, label: 'Rất không đồng ý' },
                                    { value: 2, label: 'Không đồng ý' },
                                    { value: 3, label: 'Bình thường' },
                                    { value: 4, label: 'Đồng ý' },
                                    { value: 5, label: 'Rất đồng ý' },
                                ];
                                return (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                        {/* Number */}
                                        <input
                                            type="number"
                                            value={pt.value}
                                            onChange={e => {
                                                const updated = pts.map((p: any, j: number) => j === i ? { ...p, value: +e.target.value } : p);
                                                update({ likertPoints: updated, likertLabels: updated.map((p: any) => p.label) } as any);
                                            }}
                                            className="w-10 px-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-amber-300"
                                        />
                                        {/* Label */}
                                        <input
                                            value={pt.label}
                                            onChange={e => {
                                                const updated = pts.map((p: any, j: number) => j === i ? { ...p, label: e.target.value } : p);
                                                update({ likertPoints: updated, likertLabels: updated.map((p: any) => p.label) } as any);
                                            }}
                                            className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
                                        />
                                        <button
                                            onClick={() => {
                                                const updated = pts.filter((_: any, j: number) => j !== i);
                                                update({ likertPoints: updated, likertLabels: updated.map((p: any) => p.label) } as any);
                                            }}
                                            className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─ Rating config ─ */}
                {['star_rating', 'slider'].includes(block.type) && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Min</Label>
                            <FieldInput type="number" value={block.minValue ?? 0} onChange={e => update({ minValue: +e.target.value })} />
                        </div>
                        <div>
                            <Label>Max</Label>
                            <FieldInput type="number" value={block.maxValue ?? 5} onChange={e => update({ maxValue: +e.target.value })} />
                        </div>
                    </div>
                )}

                {['nps', 'slider'].includes(block.type) && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label>Nhãn min</Label>
                            <FieldInput value={block.minLabel ?? ''} onChange={e => update({ minLabel: e.target.value })} />
                        </div>
                        <div>
                            <Label>Nhãn max</Label>
                            <FieldInput value={block.maxLabel ?? ''} onChange={e => update({ maxLabel: e.target.value })} />
                        </div>
                    </div>
                )}

                {/* ─ Image block ─ */}
                {block.type === 'image_block' && (
                    <>
                        <ImageUploader value={block.imageUrl ?? ''} onChange={v => update({ imageUrl: v })} />
                        <div>
                            <Label>Căn chỉnh</Label>
                            <AlignButtons value={block.imageAlign ?? 'center'} onChange={v => update({ imageAlign: v })} />
                        </div>
                        <div>
                            <Label>Độ rộng</Label>
                            <div className="grid grid-cols-4 gap-1">
                                {(['25%', '50%', '75%', '100%'] as const).map(w => (
                                    <button key={w} onClick={() => update({ imageWidth: w })}
                                        className={`py-1 text-[10px] font-bold rounded-lg transition-all ${(block.imageWidth ?? '100%') === w ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >{w}</button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ─ Button block ─ */}
                {block.type === 'button_block' && (
                    <>
                        <div>
                            <Label>Text nút</Label>
                            <FieldInput value={block.buttonText ?? ''} onChange={e => update({ buttonText: e.target.value })} placeholder="Nhấn vào đây" />
                        </div>
                        <div>
                            <Label>Link</Label>
                            <FieldInput value={block.buttonUrl ?? ''} onChange={e => update({ buttonUrl: e.target.value })} placeholder="https://..." />
                        </div>
                        <div>
                            <Label>Kiểu nút</Label>
                            <div className="grid grid-cols-3 gap-1">
                                {(['filled', 'outline', 'ghost'] as const).map(s => (
                                    <button key={s} onClick={() => update({ buttonStyle: s })}
                                        className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${(block.buttonStyle ?? 'filled') === s ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >{s}</button>
                                ))}
                            </div>
                        </div>
                        <ColorRow label="Màu nút" value={block.buttonColor ?? '#f59e0b'} onChange={v => update({ buttonColor: v })} />
                        <ShadowRow label="Đổ bóng nút" value={block.buttonShadow ?? 'none'} onChange={v => update({ buttonShadow: v })} />
                        <div>
                            <Label>Căn chỉnh</Label>
                            <AlignButtons value={block.buttonAlign ?? 'center'} onChange={v => update({ buttonAlign: v })} />
                        </div>
                    </>
                )}

                {/* ─ Link block ─ */}
                {block.type === 'link_block' && (
                    <>
                        <div>
                            <Label>Text hiển thị</Label>
                            <FieldInput value={block.linkText ?? ''} onChange={e => update({ linkText: e.target.value })} placeholder="Xem thêm" />
                        </div>
                        <div>
                            <Label>URL</Label>
                            <FieldInput value={block.linkUrl ?? ''} onChange={e => update({ linkUrl: e.target.value })} placeholder="https://..." />
                        </div>
                        <div>
                            <Label>Căn chỉnh</Label>
                            <AlignButtons value={block.linkAlign ?? 'left'} onChange={v => update({ linkAlign: v })} />
                        </div>
                    </>
                )}

                {/* ─ Banner block ─ */}
                {block.type === 'banner_block' && (
                    <>
                        <div>
                            <Label>Tiêu đề banner</Label>
                            <FieldInput value={block.label} onChange={e => update({ label: e.target.value })} />
                        </div>
                        <div>
                            <Label>Mô tả</Label>
                            <FieldTextarea value={block.description ?? ''} onChange={e => update({ description: e.target.value })} rows={2} />
                        </div>
                        <ImageUploader value={block.bannerImageUrl ?? ''} onChange={v => update({ bannerImageUrl: v })} label="Ảnh nền banner" />
                        <div>
                            <Label>Chiều cao (px)</Label>
                            <FieldInput type="number" value={block.bannerHeight ?? 200} onChange={e => update({ bannerHeight: +e.target.value })} />
                        </div>
                        <ColorRow label="Màu overlay" value={block.bannerOverlay ?? 'rgba(0,0,0,0.35)'} onChange={v => update({ bannerOverlay: v })} />
                        <ColorRow label="Màu chữ" value={block.bannerTextColor ?? '#ffffff'} onChange={v => update({ bannerTextColor: v })} />
                    </>
                )}

                {/* ─ Block color override ─ */}
                {!['divider', 'page_break'].includes(block.type) && (
                    <>
                        <SectionDivider label="Màu sắc khối" />
                        <ColorRow label="Màu nền" value={block.style?.backgroundColor ?? '#ffffff'} onChange={v => update({ style: { ...block.style, backgroundColor: v } })} />
                        <ShadowRow label="Đổ bóng khối" value={block.style?.boxShadow ?? 'none'} onChange={v => update({ style: { ...block.style, boxShadow: v } })} />
                        <ColorRow label="Màu chữ" value={block.style?.textColor ?? '#1e293b'} onChange={v => update({ style: { ...block.style, textColor: v } })} />
                        <div>
                            <Label>Căn chỉnh nội dung</Label>
                            <AlignButtons value={block.style?.textAlign ?? 'left'} onChange={v => update({ style: { ...block.style, textAlign: v } })} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SurveyProperties;
