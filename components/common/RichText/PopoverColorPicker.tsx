// components/common/RichText/PopoverColorPicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Ban } from 'lucide-react';
import { PREMIUM_COLORS } from '../../templates/EmailEditor/constants/editorConstants';

interface PopoverColorPickerProps {
    onSelect: (color: string) => void;
    onClose: () => void;
    position: { top: number; left: number };
    usedColors?: string[];
}

const CHECKER_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23ccc'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23ccc'/%3E%3C/svg%3E")`;

const PopoverColorPicker: React.FC<PopoverColorPickerProps> = ({ onSelect, onClose, position, usedColors = [] }) => {
    const presetColors = PREMIUM_COLORS.slice(0, 24);
    const [hexInput, setHexInput] = useState('');
    const [previewColor, setPreviewColor] = useState('');
    const [nativeColor, setNativeColor] = useState('#000000');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredUsedColors = Array.from(new Set(usedColors))
        .filter(c => c && c !== 'transparent' && c !== 'none' && !c.includes('gradient'))
        .slice(0, 12);

    // Calculate smart position
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        top: position.top + 38,
        left: position.left - 10,
        zIndex: 99999,
    });

    useEffect(() => {
        if (!containerRef.current) return;
        const w = 228; // approx width
        const h = 380; // approx height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = position.left - 10;
        let top = position.top + 38;

        if (left + w > viewportWidth - 8) left = viewportWidth - w - 8;
        if (left < 8) left = 8;
        if (top + h > viewportHeight - 8) top = position.top - h - 8;

        setStyle({ position: 'fixed', top, left, zIndex: 99999 });
    }, [position]);

    const isValidHex = (val: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);

    const handleHexChange = (val: string) => {
        // Accept with or without # prefix
        const normalized = val.startsWith('#') ? val : `#${val}`;
        setHexInput(val);
        if (isValidHex(normalized)) {
            setPreviewColor(normalized);
            setNativeColor(normalized);
        }
    };

    const handleApply = () => {
        const normalized = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
        if (isValidHex(normalized)) {
            onSelect(normalized);
            onClose();
        }
    };

    const handleNativeChange = (color: string) => {
        setNativeColor(color);
        setPreviewColor(color);
        setHexInput(color);
        // Don't close here - let user pick and then close on blur or OK
        onSelect(color);
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[99998]" onClick={onClose} />

            <div
                ref={containerRef}
                style={style}
                className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-56 animate-in fade-in zoom-in-95"
            >
                {/* Arrow */}
                <div className="absolute -top-1.5 left-5 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45" />

                {/* Hex input + preview */}
                <div className="mb-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nhập màu</p>
                    <div className="flex gap-1.5 items-center">
                        {/* Color swatch - with border so white is visible */}
                        <div
                            className="w-8 h-8 rounded-xl border-2 border-slate-200 flex-shrink-0 shadow-inner"
                            style={
                                previewColor
                                    ? { backgroundColor: previewColor }
                                    : { backgroundImage: CHECKER_BG, backgroundSize: '8px 8px' }
                            }
                        />
                        {/* Hex text input on dark bg */}
                        <div className="flex-1 bg-slate-800 rounded-xl px-2 py-1.5 flex items-center">
                            <input
                                type="text"
                                placeholder="#ffffff"
                                value={hexInput}
                                onChange={e => handleHexChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleApply()}
                                className="flex-1 bg-transparent text-xs font-mono font-bold text-slate-100 outline-none w-0"
                                style={{ minWidth: 0 }}
                            />
                        </div>
                        <button
                            onClick={handleApply}
                            disabled={!isValidHex(hexInput.startsWith('#') ? hexInput : `#${hexInput}`)}
                            className="bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl px-2 py-1.5 text-[10px] font-black transition-all hover:bg-amber-400"
                        >
                            OK
                        </button>
                    </div>

                    {/* Native color picker */}
                    <div className="mt-2">
                        <input
                            type="color"
                            className="w-full h-7 cursor-pointer rounded-xl border border-slate-200"
                            value={nativeColor}
                            onChange={e => handleNativeChange(e.target.value)}
                        />
                    </div>
                </div>

                {/* Used colors */}
                {filteredUsedColors.length > 0 && (
                    <div className="mb-3 border-t border-slate-100 pt-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đang dùng</p>
                        <div className="flex flex-wrap gap-1.5">
                            {filteredUsedColors.map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => { onSelect(c); onClose(); }}
                                    className="w-6 h-6 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform ring-1 ring-slate-200 hover:ring-amber-400"
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Preset palette */}
                <div className="border-t border-slate-100 pt-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Premium Palette</p>
                    <div className="grid grid-cols-6 gap-1.5">
                        {presetColors.map(c => (
                            <button
                                key={c}
                                onClick={() => { onSelect(c); onClose(); }}
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform ring-1 ring-slate-200 hover:ring-amber-400"
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                {/* Close - no transparent needed for text color picker, just a subtle close */}
                <div className="mt-2 border-t border-slate-100 pt-2">
                    <button
                        onClick={onClose}
                        className="w-full text-center text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </>
    );
};

export default PopoverColorPicker;
