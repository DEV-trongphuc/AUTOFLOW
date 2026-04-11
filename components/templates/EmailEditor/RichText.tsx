
import React, { useRef, useEffect, useState, useCallback } from 'react';
import RichTextToolbar from './components/RichTextToolbar';

interface RichTextProps {
    html: string;
    onChange: (newHtml: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
    bodyLinkColor?: string;
    customMergeTags?: { label: string; key: string }[];
    usedColors?: string[];
    // Block-level font defaults (from Typography panel) — applied via CSS rule, not wrapper style
    blockFontSize?: string | number;
    blockLineHeight?: string | number;
}

const RichText: React.FC<RichTextProps> = ({ html, onChange, placeholder, className, disabled, style, bodyLinkColor = '#2563eb', customMergeTags = [], usedColors = [], blockFontSize, blockLineHeight }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const [toolbar, setToolbar] = useState({ isVisible: false, position: { top: 0, left: 0 } });
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Track whether toolbar is being interacted with (prevent premature hide)
    const toolbarInteractingRef = useRef(false);
    // Unique id to scope CSS rules to this instance
    const instanceId = useRef(`rte-${Math.random().toString(36).slice(2, 8)}`).current;

    useEffect(() => {
        if (elementRef.current && elementRef.current.innerHTML !== html) {
            elementRef.current.innerHTML = html;
        }
    }, [html]);

    // Hide toolbar when block becomes disabled (another block selected)
    useEffect(() => {
        if (disabled) {
            setToolbar(t => ({ ...t, isVisible: false }));
        }
    }, [disabled]);

    const handleInput = () => {
        if (elementRef.current) {
            onChange(elementRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Special handling for Enter if needed
        }
    };

    const saveRange = useCallback(() => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (elementRef.current && elementRef.current.contains(range.commonAncestorContainer)) {
                savedRangeRef.current = range.cloneRange();
            }
        }
    }, []);

    const restoreRange = useCallback(() => {
        const range = savedRangeRef.current;
        if (!range || !elementRef.current) return;
        elementRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, []);

    const handleFocus = () => {
        if (disabled || isModalOpen) return;
        const el = elementRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setToolbar({
            isVisible: true,
            position: {
                top: rect.top + window.scrollY,
                left: rect.left + rect.width / 2 + window.scrollX
            }
        });
    };

    const handleSelection = () => {
        if (disabled || isModalOpen) return;
        const selection = window.getSelection();
        if (!selection || !elementRef.current?.contains(selection.anchorNode)) {
            return;
        }
        saveRange();
        // Update toolbar position when selection changes — keep it pinned to editor top
        const el = elementRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setToolbar({
            isVisible: true,
            position: {
                top: rect.top + window.scrollY,
                left: rect.left + rect.width / 2 + window.scrollX
            }
        });
    };

    // Ensure focus + selection before execCommand
    const ensureFocusAndSelection = () => {
        if (!elementRef.current) return;
        // Only focus if not already active - calling focus() can collapse selection
        if (document.activeElement !== elementRef.current) {
            elementRef.current.focus();
        }
        // Restore saved range, or select all as fallback
        const range = savedRangeRef.current;
        const sel = window.getSelection();
        if (sel) {
            if (range) {
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (sel.isCollapsed) {
                const r = document.createRange();
                r.selectNodeContents(elementRef.current);
                sel.removeAllRanges();
                sel.addRange(r);
            }
        }
    };

    const applyFontSize = (size: string) => {
        const el = elementRef.current;
        if (!el) return;
        // Toolbar uses onMouseDown+preventDefault, so editor keeps focus.
        // Only refocus+restore if somehow focus was lost.
        if (document.activeElement !== el) {
            el.focus();
            const range = savedRangeRef.current;
            const sel = window.getSelection();
            if (range && sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
        // Select all if no text selected
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
            const r = document.createRange();
            r.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(r);
        }
        document.execCommand('styleWithCSS', false, 'false');
        document.execCommand('fontSize', false, '7');
        el.querySelectorAll('font[size="7"]').forEach(fontEl => {
            const span = document.createElement('span');
            span.style.fontSize = size;
            span.innerHTML = fontEl.innerHTML;
            fontEl.parentNode?.replaceChild(span, fontEl);
        });
        handleInput();
    };

    const execLocalCommand = (command: string, value?: string) => {
        const el = elementRef.current;
        if (!el || disabled) return;
        if (document.activeElement !== el) {
            el.focus();
            const range = savedRangeRef.current;
            const sel = window.getSelection();
            if (range && sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
            const r = document.createRange();
            r.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(r);
        }
        if (['fontSize', 'fontName', 'foreColor'].includes(command)) {
            document.execCommand('styleWithCSS', false, 'true');
        }
        document.execCommand(command, false, value);
        handleInput();
    };

    const applyFontFamily = (fontFamily: string) => {
        const el = elementRef.current;
        if (!el) return;
        if (document.activeElement !== el) {
            el.focus();
            const range = savedRangeRef.current;
            const sel = window.getSelection();
            if (range && sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
            const r = document.createRange();
            r.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(r);
        }
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('fontName', false, fontFamily);
        el.querySelectorAll('font[face]').forEach(fontEl => {
            const span = document.createElement('span');
            span.style.fontFamily = (fontEl as HTMLElement).getAttribute('face') || fontFamily;
            span.innerHTML = fontEl.innerHTML;
            fontEl.parentNode?.replaceChild(span, fontEl);
        });
        handleInput();
    };

    return (
        <>
            <div
                ref={elementRef}
                id={instanceId}
                contentEditable={!disabled}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onMouseUp={handleSelection}
                onKeyUp={handleSelection}
                onFocus={handleFocus}
                className={`rich-text-editor ${className || ''}`}
                style={{
                    outline: 'none',
                    cursor: disabled ? 'default' : 'text',
                    minHeight: '1em',
                    ...style
                }}
                onBlur={() => {
                    handleInput();
                    // Delay hiding — check if toolbar is being interacted with
                    setTimeout(() => {
                        if (isModalOpen || toolbarInteractingRef.current) return;
                        if (!elementRef.current?.contains(document.activeElement)) {
                            setToolbar(t => ({ ...t, isVisible: false }));
                        }
                    }, 250);
                }}
                onClick={(e) => e.stopPropagation()}
            />
            {!disabled && (
                <RichTextToolbar
                    isVisible={toolbar.isVisible}
                    position={toolbar.position}
                    onApplyFontSize={applyFontSize}
                    onApplyFontFamily={applyFontFamily}
                    onExecCommand={execLocalCommand}
                    onModalToggle={setIsModalOpen}
                    onToolbarMouseEnter={() => { toolbarInteractingRef.current = true; }}
                    onToolbarMouseLeave={() => { toolbarInteractingRef.current = false; }}
                    elementRef={elementRef}
                    customMergeTags={customMergeTags}
                    usedColors={usedColors}
                />
            )}
            <style>{`
                #${instanceId} a { color: ${bodyLinkColor} !important; text-decoration: underline !important; }
                ${blockFontSize ? `#${instanceId} p, #${instanceId} div:not([class]) { font-size: ${typeof blockFontSize === 'number' ? blockFontSize + 'px' : blockFontSize}; }` : ''}
                ${blockLineHeight ? `#${instanceId} p { line-height: ${blockLineHeight}; }` : ''}
            `}</style>
        </>
    );
};

export default RichText;