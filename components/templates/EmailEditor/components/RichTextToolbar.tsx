
// components/templates/EmailEditor/components/RichTextToolbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, Strikethrough, Link, Palette, Eraser, AlignLeft, AlignCenter, AlignRight, AlignJustify, Heading1, Heading2, Heading3, Braces, Type, Tag } from 'lucide-react';
import InputModal from '../../../common/InputModal';

interface RichTextToolbarProps {
    isVisible: boolean;
    position: { top: number; left: number };
    onApplyFontSize?: (size: string) => void;
    onApplyFontFamily?: (font: string) => void;
    onExecCommand?: (command: string, value?: string) => void;
    onModalToggle?: (isOpen: boolean) => void;
    onToolbarMouseEnter?: () => void;
    onToolbarMouseLeave?: () => void;
    elementRef?: React.RefObject<HTMLDivElement | null>;
    customMergeTags?: { label: string; key: string }[];
    usedColors?: string[];
}

const FONT_FAMILIES = [
    { label: 'Arial', val: 'Arial, sans-serif' },
    { label: 'Helvetica', val: 'Helvetica, sans-serif' },
    { label: 'Times New Roman', val: "'Times New Roman', Times, serif" },
    { label: 'Courier New', val: "'Courier New', Courier, monospace" },
    { label: 'Verdana', val: 'Verdana, Geneva, sans-serif' },
    { label: 'Inter', val: 'Inter, sans-serif' },
    { label: 'Georgia', val: 'Georgia, serif' },
];

const FONT_SIZES = ['11', '12', '13', '14', '15', '16', '18', '20', '22', '24', '28', '32', '36', '48'];

const MERGE_TAGS = [
    { label: 'Họ và tên', val: '{{fullName}}' },
    { label: 'Tên', val: '{{firstName}}' },
    { label: 'Họ', val: '{{lastName}}' },
    { label: 'Email', val: '{{email}}' },
    { label: 'Số điện thoại', val: '{{phoneNumber}}' },
    { label: 'Công ty', val: '{{companyName}}' },
    { label: 'Chức vụ', val: '{{jobTitle}}' },
    { label: 'Thành phố', val: '{{city}}' },
    { label: 'Quốc gia', val: '{{country}}' },
    { label: 'Link Hủy đăng ký', value: '{{unsubscribeLink}}' },
    { label: 'Tên chiến dịch', val: '{{campaignName}}' },
];

// Biến đặc biệt: ngày, random, ID
const SPECIAL_MERGE_TAGS = [
    { label: 'Ngày hôm nay', val: '{{today}}', desc: 'dd/mm/yyyy' },
    { label: 'Ngày (yyyy-mm-dd)', val: '{{today_ymd}}', desc: 'yyyy-mm-dd' },
    { label: 'ID ngắn (10 số)', val: '{{random_id}}', desc: 'Random mỗi lần gửi' },
    { label: 'Mã 6 số', val: '{{random_6}}', desc: 'Random 6 chữ số' },
    { label: 'ID Khách hàng', val: '{{subscriber_id}}', desc: 'Full ID' },
    { label: 'ID ngắn', val: '{{subscriber_id_short}}', desc: '10 ký tự đầu' },
];

const COLORS = [
    '#000000', '#1e293b', '#64748b', '#94a3b8', '#ffffff',
    '#ef4444', '#f97316', '#d97706', '#22c55e', '#3b82f6',
    '#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#14b8a6',
];

const Divider = () => <div className="w-[1px] h-4 bg-slate-700 mx-0.5 flex-shrink-0" />;

const ToolbarBtn: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
    <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        title={title}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${active ? 'bg-amber-600 text-white' : 'hover:bg-slate-700 text-slate-300 hover:text-white'}`}
    >
        {children}
    </button>
);

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ isVisible, position, onApplyFontSize, onApplyFontFamily, onExecCommand, onModalToggle, onToolbarMouseEnter, onToolbarMouseLeave, elementRef, customMergeTags = [], usedColors = [] }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [hexInput, setHexInput] = useState('');
    const [previewColor, setPreviewColor] = useState('');
    const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false);
    const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
    const [showMergeTags, setShowMergeTags] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const savedRange = useRef<Range | null>(null);

    const closeAllDropdowns = () => {
        setShowColorPicker(false);
        setShowFontFamilyDropdown(false);
        setShowFontSizeDropdown(false);
        setShowMergeTags(false);
    };

    const execCommand = (command: string, value?: string) => {
        if (onExecCommand) { onExecCommand(command, value); return; }
        if (['fontSize', 'fontName', 'foreColor'].includes(command)) document.execCommand('styleWithCSS', false, 'true');
        document.execCommand(command, false, value);
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0);
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
    };

    const handleLinkClick = () => { saveSelection(); closeAllDropdowns(); setShowLinkModal(true); onModalToggle?.(true); };
    const handleLinkConfirm = (url: string) => { restoreSelection(); if (url) execCommand('createLink', url.startsWith('http') ? url : 'https://' + url); setShowLinkModal(false); onModalToggle?.(false); };

    const handleFontSizeApply = (size: string) => {
        const sizeWithPx = size + 'px';
        if (onApplyFontSize) { onApplyFontSize(sizeWithPx); }
        else {
            document.execCommand('styleWithCSS', false, 'false');
            document.execCommand('fontSize', false, '7');
            elementRef?.current?.querySelectorAll('font[size="7"]').forEach(el => {
                const span = document.createElement('span');
                span.style.fontSize = sizeWithPx;
                span.innerHTML = el.innerHTML;
                el.parentNode?.replaceChild(span, el);
            });
        }
        setShowFontSizeDropdown(false);
    };

    const handleFontFamilyApply = (font: string) => {
        if (onApplyFontFamily) onApplyFontFamily(font);
        else execCommand('fontName', font);
        setShowFontFamilyDropdown(false);
    };

    const insertHeading = (level: 1 | 2 | 3) => {
        const tag = `h${level}`;
        const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' };
        const weights: Record<number, string> = { 1: '800', 2: '700', 3: '700' };
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const text = range.toString() || 'Tiêu đề';
        const el = document.createElement(tag);
        el.style.fontSize = sizes[level];
        el.style.fontWeight = weights[level];
        el.style.margin = '0';
        el.textContent = text;
        range.deleteContents();
        range.insertNode(el);
        sel.removeAllRanges();
        // fire onChange
        onExecCommand?.('noop');
        // trigger input event on elementRef
        elementRef?.current?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const insertMergeTag = (tag: string) => {
        restoreSelection();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(tag);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        elementRef?.current?.dispatchEvent(new Event('input', { bubbles: true }));
        setShowMergeTags(false);
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isVisible && !showLinkModal) return null;
    if (!mounted) return null;

    return createPortal(
        <>
            <div
                className={`fixed z-[100100] flex flex-col bg-slate-900 text-white rounded-2xl shadow-2xl px-1 py-1 gap-0.5 border border-slate-700/50 ${!isVisible ? 'invisible pointer-events-none' : 'animate-in fade-in zoom-in-95 duration-150'}`}
                style={{ top: position.top, left: position.left, transform: 'translate(-50%, -100%)', width: 'max-content', marginTop: '-12px' }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={onToolbarMouseEnter}
                onMouseLeave={onToolbarMouseLeave}
            >
                {/* ── Row 1: Headings + Font Family + Font Size ── */}
                <div className="flex items-center gap-0.5">
                    <ToolbarBtn onClick={() => insertHeading(1)} title="Heading 1"><Heading1 className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => insertHeading(2)} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => insertHeading(3)} title="Heading 3"><Heading3 className="w-3.5 h-3.5" /></ToolbarBtn>

                    <Divider />

                    {/* Font Family */}
                    <div className="relative">
                        <ToolbarBtn onClick={() => { closeAllDropdowns(); saveSelection(); setShowFontFamilyDropdown(v => !v); }} title="Font Family">
                            <Type className="w-3.5 h-3.5" />
                        </ToolbarBtn>
                        {showFontFamilyDropdown && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1 w-44 z-50 animate-in slide-in-from-bottom-2">
                                {FONT_FAMILIES.map(f => (
                                    <button key={f.val} onMouseDown={(e) => { e.preventDefault(); restoreSelection(); handleFontFamilyApply(f.val); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 rounded-lg transition-colors" style={{ fontFamily: f.val }}>{f.label}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Font Size */}
                    <div className="relative">
                        <button
                            onMouseDown={(e) => { e.preventDefault(); saveSelection(); closeAllDropdowns(); setShowFontSizeDropdown(v => !v); }}
                            title="Font Size"
                            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 text-[10px] font-black h-7 min-w-[28px]"
                        >A<span className="text-[7px] ml-0.5 opacity-60">px</span></button>
                        {showFontSizeDropdown && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1.5 z-50 animate-in slide-in-from-bottom-2 grid grid-cols-4 gap-1 w-max">
                                {FONT_SIZES.map(size => (
                                    <button key={size} onMouseDown={(e) => { e.preventDefault(); restoreSelection(); handleFontSizeApply(size); }} className="px-2 py-1.5 text-[10px] font-bold hover:bg-slate-800 rounded-lg text-center transition-colors text-slate-200">{size}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Row 2: Format + Align + Link + Merge Tags ── */}
                <div className="flex items-center gap-0.5">
                    {/* Formatting */}
                    <ToolbarBtn onClick={() => execCommand('bold')} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('italic')} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('underline')} title="Underline"><Underline className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('strikeThrough')} title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></ToolbarBtn>

                    <Divider />

                    {/* Alignment — tất cả 4 nút */}
                    <ToolbarBtn onClick={() => execCommand('justifyLeft')} title="Còn trái"><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('justifyCenter')} title="Còn giữa"><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('justifyRight')} title="Còn phải"><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
                    <ToolbarBtn onClick={() => execCommand('justifyFull')} title="Còn đều 2 bên"><AlignJustify className="w-3.5 h-3.5" /></ToolbarBtn>

                    <Divider />

                    {/* Color */}
                    <div className="relative">
                        <ToolbarBtn onClick={() => { closeAllDropdowns(); setShowColorPicker(v => !v); }} title="Màu chữ">
                            <Palette className="w-3.5 h-3.5" />
                        </ToolbarBtn>
                        {showColorPicker && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 p-3 rounded-2xl border border-slate-700 shadow-2xl z-50 animate-in slide-in-from-bottom-2 w-56">
                                {/* Hex Input */}
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Nhập màu</p>
                                <div className="flex gap-1.5 items-center mb-2">
                                    <div
                                        className="w-7 h-7 rounded-lg border-2 border-slate-600 flex-shrink-0"
                                        style={previewColor
                                            ? { backgroundColor: previewColor }
                                            : { background: 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 6px 6px' }
                                        }
                                    />
                                    <div className="flex-1 bg-slate-800 rounded-lg px-2 py-1.5 flex items-center">
                                        <input
                                            type="text"
                                            placeholder="#ffffff"
                                            value={hexInput}
                                            onChange={e => {
                                                const raw = e.target.value;
                                                const val = raw.startsWith('#') ? raw : `#${raw}`;
                                                setHexInput(raw);
                                                if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) setPreviewColor(val);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const val = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
                                                    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                                                        execCommand('foreColor', val);
                                                        setShowColorPicker(false);
                                                        setHexInput('');
                                                        setPreviewColor('');
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-transparent text-xs font-mono font-bold text-slate-100 outline-none w-0"
                                            style={{ minWidth: 0 }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const val = hexInput.startsWith('#') ? hexInput : '#' + hexInput;
                                            if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                                                execCommand('foreColor', val);
                                                setShowColorPicker(false);
                                                setHexInput('');
                                                setPreviewColor('');
                                            }
                                        }}
                                        className="bg-amber-600 text-white rounded-lg px-2 py-1.5 text-[10px] font-bold hover:bg-amber-400 transition-colors flex-shrink-0"
                                    >OK</button>
                                </div>
                                {/* Native color picker - apply ngay khi chọn, không dùng onBlur gây bug */}
                                <input
                                    type="color"
                                    className="w-full h-7 cursor-pointer rounded-lg border border-slate-700 mb-2.5"
                                    value={previewColor || '#000000'}
                                    onChange={e => {
                                        setHexInput(e.target.value);
                                        setPreviewColor(e.target.value);
                                        execCommand('foreColor', e.target.value);
                                    }}
                                />
                                {/* Used colors */}
                                {usedColors.filter(c => c && c !== 'transparent' && c !== 'none' && !c.includes('gradient')).length > 0 && (
                                    <div className="mb-2.5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đang dùng</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {usedColors.filter(c => c && c !== 'transparent' && c !== 'none' && !c.includes('gradient')).slice(0, 10).map((c, i) => (
                                                <button key={i} onClick={() => { execCommand('foreColor', c); setShowColorPicker(false); }} className="w-5 h-5 rounded-full border border-white/10 hover:scale-125 transition-transform shadow-sm ring-offset-slate-900 hover:ring-2 hover:ring-amber-400" style={{ backgroundColor: c }} title={c} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Preset palette */}
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Palette</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {COLORS.map(c => (
                                        <button key={c} onClick={() => { execCommand('foreColor', c); setShowColorPicker(false); }} className="w-5 h-5 rounded-full border border-white/10 hover:scale-125 transition-transform shadow-sm" style={{ backgroundColor: c }} title={c} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Link */}
                    <ToolbarBtn onClick={handleLinkClick} title="Chèn link"><Link className="w-3.5 h-3.5" /></ToolbarBtn>

                    {/* Merge Tags (Biến) */}
                    <div className="relative">
                        <button
                            onClick={() => { saveSelection(); closeAllDropdowns(); setShowMergeTags(v => !v); }}
                            title="Chèn biến"
                            className="px-2 py-1 rounded-lg transition-colors text-[9px] font-black text-amber-400 hover:bg-amber-600/20 border border-amber-600/30 hover:border-amber-600 flex-shrink-0"
                        >BIẾN</button>
                        {showMergeTags && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1 w-56 z-50 animate-in slide-in-from-bottom-2 max-h-72 overflow-y-auto">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-3 pt-1.5 pb-1">Biến chuẩn</p>
                                {MERGE_TAGS.map(tag => (
                                    <button key={tag.val} onClick={() => insertMergeTag(tag.val)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 rounded-lg transition-colors flex justify-between items-center">
                                        <span className="text-slate-300">{tag.label}</span>
                                        <span className="text-amber-400 text-[9px] font-mono">{tag.val}</span>
                                    </button>
                                ))}

                                {/* Special Variables Section */}
                                <div className="border-t border-slate-700 my-1" />
                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest px-3 pb-1 flex items-center gap-1">
                                    <Braces className="w-2.5 h-2.5" /> Biến đặc biệt
                                </p>
                                {SPECIAL_MERGE_TAGS.map(tag => (
                                    <button key={tag.val} onClick={() => insertMergeTag(tag.val)}
                                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-900/30 rounded-lg transition-colors"
                                        title={tag.desc}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">{tag.label}</span>
                                            <span className="text-emerald-400 text-[9px] font-mono">{tag.val}</span>
                                        </div>
                                        <span className="text-slate-500 text-[9px]">{tag.desc}</span>
                                    </button>
                                ))}

                                {customMergeTags.length > 0 && (
                                    <>
                                        <div className="border-t border-slate-700 my-1" />
                                        <p className="text-[8px] font-black text-violet-400 uppercase tracking-widest px-3 pb-1 flex items-center gap-1">
                                            <Tag className="w-2.5 h-2.5" /> Custom Fields
                                        </p>
                                        {customMergeTags.map(f => (
                                            <button key={f.key} onClick={() => insertMergeTag(`{{${f.key}}}`)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-violet-900/30 rounded-lg transition-colors flex justify-between items-center">
                                                <span className="text-slate-300">{f.label}</span>
                                                <span className="text-violet-400 text-[9px] font-mono">{`{{${f.key}}}`}</span>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Clear formatting */}
                    <ToolbarBtn onClick={() => execCommand('removeFormat')} title="Xóa định dạng"><Eraser className="w-3.5 h-3.5" /></ToolbarBtn>

                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
                </div>{/* end Row 2 */}

            </div>{/* end toolbar wrapper */}

            <InputModal
                isOpen={showLinkModal}
                onClose={() => { setShowLinkModal(false); onModalToggle?.(false); }}
                onConfirm={handleLinkConfirm}
                title="Chèn đường dẫn"
                placeholder="https://example.com"
                confirmLabel="Chèn"
            />
        </>,
        document.body
    );
};

export default RichTextToolbar;
