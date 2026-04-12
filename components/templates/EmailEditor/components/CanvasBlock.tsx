// components/templates/EmailEditor/components/CanvasBlock.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { EmailBlock, EmailBlockType, EmailBodyStyle } from '../../../../types';
import { buildCss, sanitizeRadius } from '../utils/canvasUtils';
import { CanvasDropIndicator, CanvasHandleOverlay } from './CanvasUI';
import RichText from '../RichText';
import CountdownTimer from './CountdownTimer';
import { getIconUrl } from '../utils/htmlCompiler';
import { useEditorContext } from '../contexts/EditorContext';
import TableBlockCanvas from './TableBlockCanvas';

interface CanvasBlockProps {
    block: EmailBlock;
    bodyStyle: EmailBodyStyle;
    viewMode: 'desktop' | 'mobile';
    selectedBlockId: string | null;
    dragOverId: string | null;
    dropPosition: 'top' | 'bottom' | 'inside' | 'left' | 'right' | null;
    draggingBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent, id: string, type: EmailBlockType, forcedPos?: 'top' | 'bottom' | 'inside' | 'left' | 'right') => void;
    onDrop: (e: React.DragEvent, targetId: string) => void;
    onMoveOrder: (id: string, direction: 'up' | 'down') => void;
    onSwapColumns: (colId: string) => void;
    onDuplicateBlock: (block: EmailBlock) => void;
    onDeleteBlock: (id: string) => void;
    onUpdateBlockContent?: (id: string, content: string) => void;
    onUpdateBlockStyle?: (id: string, style: Partial<EmailBlock['style']>) => void;
    onUpdateBlock?: (id: string, data: Partial<EmailBlock>) => void;
    onSaveSection?: (block: EmailBlock) => void;
    onSelectParent?: () => void;
    isNoStack?: boolean;
    customMergeTags?: { label: string; key: string }[];
}

const CanvasBlock: React.FC<CanvasBlockProps> = (props) => {
    const {
        block, bodyStyle, viewMode, selectedBlockId, dragOverId, dropPosition,
        onSelectBlock, onDragStart, onDragOver, onDrop, onMoveOrder, onSwapColumns,
        onDuplicateBlock, onDeleteBlock, onUpdateBlockContent, onUpdateBlockStyle, onUpdateBlock, onSaveSection, onSelectParent,
        customMergeTags = [],
    } = props;
    const { usedColors } = useEditorContext();
    const isSelected = selectedBlockId === block.id;
    const css = buildCss(block.style, viewMode, bodyStyle.fontFamily);
    // cssAny: typed escape hatch for custom canvas properties not in CSSProperties
    const cssAny = css as any;

    const {
        marginTop, marginRight, marginBottom, marginLeft,
        paddingTop, paddingRight, paddingBottom, paddingLeft,
    } = css;

    // Decorative props go to inner content for specific blocks to prevent double background/layout breakage
    const decorativeProps = [
        'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
        'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
        'border', 'borderWidth', 'borderStyle', 'borderColor',
        'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
        'boxShadow'
    ];

    const wrapperTdStyles: React.CSSProperties = {
        position: 'relative',
        width: '100%',
        verticalAlign: 'top'
    };

    const decorativeStyles: React.CSSProperties = {};
    const innerPadding: React.CSSProperties = {
        paddingTop: paddingTop ?? '0px',
        paddingRight: paddingRight ?? '0px',
        paddingBottom: paddingBottom ?? '0px',
        paddingLeft: paddingLeft ?? '0px',
    };

    const isFilteredType = ['button', 'image', 'social', 'video', 'quote', 'divider', 'spacer'].includes(block.type);

    if (!isFilteredType) {
        decorativeProps.forEach(prop => {
            // @ts-ignore
            if (css[prop] !== undefined) decorativeStyles[prop] = css[prop];
        });
        decorativeStyles.overflow = css.borderRadius ? 'hidden' : 'visible';
        decorativeStyles.borderRadius = css.borderRadius ? sanitizeRadius(css.borderRadius) : undefined;
    } else {
        innerPadding.paddingTop = '0px';
        innerPadding.paddingRight = '0px';
        innerPadding.paddingBottom = '0px';
        innerPadding.paddingLeft = '0px';
    }

    const renderInner = () => {
        switch (block.type) {
            case 'text':
                return (
                    <RichText
                        html={block.content}
                        onChange={(newHtml) => onUpdateBlockContent?.(block.id, newHtml)}
                        disabled={!isSelected}
                        className="w-full"
                        bodyLinkColor={bodyStyle.linkColor}
                        customMergeTags={customMergeTags}
                        usedColors={usedColors}
                        blockFontSize={css.fontSize}
                        blockLineHeight={css.lineHeight}
                        style={{
                            textAlign: css.textAlign as any ?? 'left',
                            fontFamily: css.fontFamily ?? bodyStyle.fontFamily,
                            color: css.color,
                            fontWeight: css.fontWeight,
                            fontStyle: css.fontStyle,
                            textDecoration: css.textDecoration,
                            textTransform: css.textTransform
                        }}
                    />
                );

            case 'button': {
                const btnBg = block.style.contentBackgroundColor || (block.style as any).buttonBackgroundColor || block.style.backgroundColor || '#d97706';
                const containerBg = 'transparent';
                const btnColor = css.color ?? '#ffffff';
                const align = css.textAlign ?? 'center';
                const btnWidth = css.width ?? 'auto';
                const btnMarginTop = css.marginTop ?? '0px';
                const btnMarginBottom = css.marginBottom ?? '0px';
                const btnMarginLeft = (align === 'center' && !css.marginLeft) ? 'auto' : (css.marginLeft ?? (align === 'right' ? 'auto' : '0px'));
                const btnMarginRight = (align === 'center' && !css.marginRight) ? 'auto' : (css.marginRight ?? (align === 'right' ? '0px' : 'auto'));
                const flexJustify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
                const btnRadius = sanitizeRadius(css.borderRadius);
                return (
                    <div style={{ width: '100%', display: 'flex', justifyContent: flexJustify, background: containerBg }}>
                        <table
                            border={0} cellPadding={0} cellSpacing={0}
                            align={align as any}
                            style={{
                                marginTop: btnMarginTop, marginBottom: btnMarginBottom,
                                marginLeft: btnMarginLeft, marginRight: btnMarginRight,
                                display: 'table',
                                width: btnWidth === 'auto' ? 'fit-content' : btnWidth,  // ✅ fix: auto → fit-content
                                maxWidth: '100%',
                                borderCollapse: 'separate'
                            }}
                        >
                            <tbody>
                                <tr>
                                    <td align="center" style={{
                                        borderTopWidth: css.borderTopWidth,
                                        borderRightWidth: css.borderRightWidth,
                                        borderBottomWidth: css.borderBottomWidth,
                                        borderLeftWidth: css.borderLeftWidth,
                                        borderStyle: css.borderStyle,
                                        borderColor: css.borderColor,
                                        borderRadius: btnRadius,
                                        padding: 0,
                                        whiteSpace: 'nowrap'  // ✅ giữ button không bị wrap
                                    }}>
                                        <div style={{ background: btnBg, borderRadius: btnRadius, overflow: 'hidden', display: 'block', boxSizing: 'border-box' }}>
                                            <div style={{
                                                paddingTop: paddingTop ?? '12px', paddingBottom: paddingBottom ?? '12px',
                                                paddingLeft: paddingLeft ?? '24px', paddingRight: paddingRight ?? '24px',
                                                fontFamily: css.fontFamily ?? bodyStyle.fontFamily,
                                                fontSize: css.fontSize ?? '16px',
                                                fontWeight: css.fontWeight ?? 'bold',
                                                color: btnColor,
                                                textAlign: 'center',
                                                textDecoration: 'none',
                                                display: 'block',
                                                cursor: 'pointer',
                                                letterSpacing: css.letterSpacing,
                                                textTransform: css.textTransform as any,
                                                fontStyle: css.fontStyle as any,
                                                whiteSpace: 'nowrap'
                                            }} dangerouslySetInnerHTML={{ __html: block.content || 'BUTTON' }} />
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'quote': {
                const quoteBorderLeft = `${css.borderLeftWidth ?? '4px'} ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#d97706'}`;
                const quoteHasOtherBorders = css.borderTopWidth || css.borderRightWidth || css.borderBottomWidth;
                return (
                    <div style={{
                        borderLeft: quoteBorderLeft,
                        borderTop: quoteHasOtherBorders ? `${css.borderTopWidth ?? '0'} ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#d97706'}` : undefined,
                        borderRight: quoteHasOtherBorders ? `${css.borderRightWidth ?? '0'} ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#d97706'}` : undefined,
                        borderBottom: quoteHasOtherBorders ? `${css.borderBottomWidth ?? '0'} ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#d97706'}` : undefined,
                        backgroundColor: css.backgroundColor ?? 'transparent',
                        padding: `${css.paddingTop ?? '15px'} ${css.paddingRight ?? '25px'} ${css.paddingBottom ?? '15px'} ${css.paddingLeft ?? '25px'}`,
                        color: css.color ?? '#334155',
                        fontStyle: css.fontStyle ?? 'italic',
                        fontFamily: css.fontFamily,
                        lineHeight: css.lineHeight ?? '1.6',
                        borderRadius: sanitizeRadius(css.borderRadius ?? '0'),
                        overflow: css.borderRadius ? 'hidden' : 'visible',
                        textAlign: css.textAlign as any ?? 'left'
                    }}>
                        <RichText
                            html={block.content}
                            onChange={(newHtml) => onUpdateBlockContent?.(block.id, newHtml)}
                            disabled={!isSelected}
                            bodyLinkColor={bodyStyle.linkColor}
                            customMergeTags={customMergeTags}
                            blockFontSize={css.fontSize}
                            blockLineHeight={css.lineHeight}
                            style={{
                                color: css.color, textAlign: css.textAlign as any ?? 'left',
                                fontWeight: css.fontWeight, fontStyle: css.fontStyle,
                                textDecoration: css.textDecoration, textTransform: css.textTransform
                            }}
                        />
                    </div>
                );
            }

            case 'countdown': {
                const boxStyle: React.CSSProperties = {
                    backgroundColor: 'transparent', color: css.color ?? '#fff', textAlign: 'center',
                    fontWeight: '900', fontSize: css.fontSize ?? '48px', fontFamily: css.fontFamily,
                    lineHeight: '1', letterSpacing: '-0.02em'
                };
                const labelStyle: React.CSSProperties = {
                    fontSize: '11px', color: cssAny.labelColor ?? '#004a7c', textTransform: 'uppercase',
                    marginTop: '8px', fontWeight: '800', letterSpacing: '0.1em',
                    fontFamily: css.fontFamily
                };
                return <CountdownTimer block={block} boxStyle={boxStyle} labelStyle={labelStyle} />;
            }

            case 'timeline': {
                const dotColor = cssAny.timelineDotColor || '#d97706';
                const lineColor = cssAny.timelineLineColor || '#e2e8f0';
                const timelineFontFamily = css.fontFamily;
                const titleClr = css.color || '#1e293b';
                const descClr = cssAny.timelineDescColor || '#64748b';
                return (
                    <div style={{ position: 'relative', paddingLeft: '0px' }}>
                        {block.items?.map((item, i) => {
                            const isLast = i === (block.items?.length || 0) - 1;
                            return (
                                <div key={item.id || i} style={{ position: 'relative', paddingBottom: isLast ? '0' : '30px', display: 'flex' }}>
                                    <div style={{ width: item.date ? (viewMode === 'mobile' ? '60px' : '80px') : '0px', flexShrink: 0, paddingRight: item.date ? '15px' : '0px', textAlign: 'right', paddingTop: '4px', overflow: 'hidden' }}>
                                        <strong style={{ color: titleClr, fontSize: css.fontSize || '12px', fontFamily: timelineFontFamily }}>{item.date}</strong>
                                    </div>
                                    <div style={{ width: '24px', flexShrink: 0, position: 'relative' }}>
                                        {!isLast && (
                                            <div style={{
                                                position: 'absolute', top: '16px', left: '50%', marginLeft: '-1px',
                                                width: '0px', height: 'calc(100% + 14px)',
                                                borderLeft: `2px ${cssAny.timelineLineStyle || 'solid'} ${lineColor}`
                                            }}></div>
                                        )}
                                        <div style={{
                                            width: '12px', height: '12px', borderRadius: '50%',
                                            backgroundColor: dotColor, border: '2px solid white',
                                            boxShadow: '0 0 0 1px ' + (lineColor || '#e2e8f0'),
                                            margin: '6px auto 0', position: 'relative', zIndex: 1
                                        }}></div>
                                    </div>
                                    <div style={{ flex: 1, paddingLeft: '20px', paddingBottom: '10px' }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: css.fontSize || '16px', color: titleClr, fontWeight: 'bold', textAlign: 'left', fontFamily: timelineFontFamily }}>{item.title}</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: descClr, textAlign: 'left', lineHeight: css.lineHeight || '1.5', fontFamily: timelineFontFamily }}>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            case 'check_list': {
                const checkColor = cssAny.checkIconColor ?? '#d97706';
                const checkSize = parseInt(cssAny.checkIconSize ?? '20');
                const showTitle = cssAny.showCheckListTitle !== false;
                const checklistIcon = block.style.checkIcon || 'CheckCircle';
                // Support custom image mode
                const iconMode = cssAny.checkIconMode || 'icon';
                const customIconUrl = cssAny.checkCustomIconUrl;
                const iconUrlCheck = (iconMode === 'image' && customIconUrl) ? customIconUrl : getIconUrl(checklistIcon, checkColor);
                // Typography & color controls
                const titleFont = cssAny.checkTitleFont || css.fontFamily;
                const titleSize = cssAny.checkTitleSize ? (typeof cssAny.checkTitleSize === 'string' ? cssAny.checkTitleSize : cssAny.checkTitleSize + 'px') : '18px';
                const itemSize = cssAny.checkItemSize ? (typeof cssAny.checkItemSize === 'string' ? cssAny.checkItemSize : cssAny.checkItemSize + 'px') : '14px';
                const descSize = cssAny.checkItemSize ? `${Math.max(10, parseInt(String(cssAny.checkItemSize)) - 1)}px` : '13px';
                const titleColor = cssAny.checkTitleColor || css.color || '#1e293b';
                const itemColor = cssAny.checkItemColor || css.color || '#334155';
                const descColor = cssAny.checkDescColor || '#64748b';
                const itemFontFamily = css.fontFamily;
                return (
                    <div style={{
                        textAlign: css.textAlign as any ?? 'left',
                        background: css.backgroundImage || css.backgroundColor || 'transparent',
                        borderRadius: sanitizeRadius(css.borderRadius),
                        padding: `${css.paddingTop ?? '0px'} ${css.paddingRight ?? '0px'} ${css.paddingBottom ?? '0px'} ${css.paddingLeft ?? '0px'}`,
                        overflow: 'hidden'
                    }}>
                        {showTitle && (
                            <h3 style={{ fontSize: titleSize, fontWeight: 'bold', marginBottom: '15px', color: titleColor, textAlign: css.textAlign as any ?? 'left', fontFamily: titleFont }} dangerouslySetInnerHTML={{ __html: block.checkListTitle || 'Checklist' }} />
                        )}
                        <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                            <tbody>
                                {block.items?.map((item, i) => {
                                    const showItemTitle = cssAny.showItemTitle !== false;
                                    const showItemDesc = cssAny.showItemDescription !== false;
                                    const isSingleLine = !showItemTitle || !showItemDesc;
                                    const iconPaddingTop = isSingleLine ? '5px' : '6px';
                                    const textPaddingTop = isSingleLine ? '5px' : '2px';
                                    const vAlign = cssAny.checkIconVerticalAlign || 'middle';
                                    const finalIconPaddingTop = vAlign === 'top' ? iconPaddingTop : '0px';
                                    // Icon customizations
                                    const iconRadius = sanitizeRadius(cssAny.checkIconRadius || '0');
                                    const iconBg = cssAny.checkIconBackgroundColor || 'transparent';
                                    const iconBorder = (parseInt(cssAny.checkIconBorderWidth || '0') > 0) 
                                        ? `${parseInt(String(cssAny.checkIconBorderWidth || 0))}px solid ${cssAny.checkIconBorderColor || '#e2e8f0'}` 
                                        : 'none';
                                    const iconPadding = sanitizeRadius(cssAny.checkIconPadding || '0');

                                    return (
                                        <tr key={item.id || i}>
                                            <td width={checkSize + 10} valign={vAlign} style={{ padding: `${finalIconPaddingTop} 0 12px 0` }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    width: `${checkSize}px`, 
                                                    height: `${checkSize}px`,
                                                    backgroundColor: iconBg,
                                                    borderRadius: iconRadius,
                                                    border: iconBorder,
                                                    padding: iconPadding,
                                                    boxSizing: 'content-box',
                                                    overflow: 'hidden'
                                                }}>
                                                    <img 
                                                        src={(cssAny.checkIndividualIcons && iconMode === 'image' && item.customIconUrl) ? item.customIconUrl : iconUrlCheck} 
                                                        width={checkSize} 
                                                        height={checkSize} 
                                                        style={{ display: 'block', width: `${checkSize}px`, height: `${checkSize}px`, objectFit: iconMode === 'image' ? 'cover' : 'contain' }} 
                                                        alt="check" 
                                                    />
                                                </div>
                                            </td>
                                            <td valign={vAlign} style={{ padding: `${textPaddingTop} 0 12px 10px`, fontFamily: itemFontFamily, textAlign: 'left' }}>
                                                {showItemTitle && <div style={{ fontSize: itemSize, fontWeight: 'bold', color: itemColor, marginBottom: showItemDesc ? '2px' : '0' }} dangerouslySetInnerHTML={{ __html: item.title }} />}
                                                {showItemDesc && <div style={{ fontSize: descSize, color: descColor, lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: item.description }} />}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'social': {
                const alignSocial = css.textAlign as any || 'center';
                const gapSocial = parseInt(cssAny.gap || '10') / 2;
                return (
                    <div style={{ width: '100%', textAlign: alignSocial }}>
                        <table border={0} cellPadding={0} cellSpacing={0} style={{ display: 'inline-table' }}>
                            <tbody>
                                <tr>
                                    {block.socialLinks?.map((l) => {
                                        const mode = cssAny.iconMode || 'color';
                                        const bg = l.customStyle?.backgroundColor || cssAny.iconBackgroundColor || 'transparent';
                                        const iconSize = parseInt(cssAny.iconSize || '32');
                                        let fill = l.customStyle?.iconColor || cssAny.iconColor;
                                        if (!fill) {
                                            if (mode === 'original' || mode === 'color') {
                                                const brandColors: any = { facebook: '#1877F2', twitter: '#1DA1F2', instagram: '#E4405F', linkedin: '#0A66C2', youtube: '#FF0000', zalo: '#0068FF' };
                                                fill = brandColors[l.network] || '#666666';
                                            } else {
                                                fill = mode === 'dark' ? '#000000' : '#ffffff';
                                            }
                                        }
                                        // Zalo dùng image URL thực, các mạng khác dùng icon service
                                        const ZALO_ICON_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/960px-Icon_of_Zalo.svg.png';
                                        const iconSrc = l.network === 'zalo' ? ZALO_ICON_URL : getIconUrl(l.network, fill);
                                        return (
                                            <td key={l.id} style={{ padding: `0 ${gapSocial}px` }}>
                                                <div style={{ width: `${iconSize}px`, height: `${iconSize}px`, backgroundColor: bg, borderRadius: sanitizeRadius(css.borderRadius || '4px'), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                    <img src={iconSrc} width={l.network === 'zalo' ? iconSize : iconSize * 0.6} height={l.network === 'zalo' ? iconSize : iconSize * 0.6} style={{ display: 'block', width: l.network === 'zalo' ? `${iconSize}px` : `${iconSize * 0.6}px`, height: l.network === 'zalo' ? `${iconSize}px` : `${iconSize * 0.6}px`, objectFit: 'contain' }} alt={l.network} />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'image': {
                const imgHeight = css.height && css.height !== 'auto' ? css.height : undefined;
                const hasCoverHeight = !!imgHeight;
                return (
                    <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={{ display: 'inline-table' }}>
                        <tbody>
                            <tr>
                                <td align={css.textAlign as any ?? 'center'}>
                                    {block.content ? (
                                        <div style={{ display: 'flex', justifyContent: css.textAlign === 'left' ? 'flex-start' : css.textAlign === 'right' ? 'flex-end' : 'center', width: '100%' }}>
                                            {hasCoverHeight ? (
                                                // Fixed height + object-fit: cover mode
                                                <div style={{
                                                    width: css.width ?? '100%',
                                                    height: imgHeight,
                                                    borderRadius: sanitizeRadius(css.borderRadius),
                                                    overflow: 'hidden',
                                                    display: 'block',
                                                    maxWidth: '100%',
                                                }}>
                                                    <img
                                                        src={block.content}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            objectPosition: 'center',
                                                            display: 'block',
                                                        }}
                                                        alt={block.altText}
                                                    />
                                                </div>
                                            ) : (
                                                // Default: auto height
                                                <img
                                                    src={block.content}
                                                    style={{ maxWidth: '100%', width: css.width ?? '100%', height: 'auto', borderRadius: sanitizeRadius(css.borderRadius), display: 'block' }}
                                                    alt={block.altText}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center group/img transition-all hover:bg-slate-100 hover:border-emerald-500/30">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover/img:scale-110 transition-transform">
                                                <LucideIcons.Image className="text-slate-300 w-8 h-8" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400" style={{ fontFamily: bodyStyle.fontFamily }}>Kéo thả hoặc chọn ảnh</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                );
            }

            case 'divider':
                return (
                    <div style={{ borderTop: `${css.borderTopWidth ?? '1px'} ${css.borderStyle ?? 'solid'} ${css.borderColor ?? '#eeeeee'}` }}></div>
                );

            case 'spacer':
                return <div style={{ height: css.height ?? '20px', backgroundColor: css.backgroundColor ?? 'transparent' }}></div>;

            case 'video': {
                const videoAlign = css.textAlign as any || 'center';
                const playBtnColor = cssAny.playButtonColor || '#d97706';
                return (
                    <div style={{ textAlign: videoAlign }}>
                        {block.videoUrl ? (
                            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                {/* Thumbnail */}
                                <img
                                    src={block.thumbnailUrl || 'https://via.placeholder.com/600x340?text=Video+Thumbnail'}
                                    style={{ maxWidth: '100%', borderRadius: sanitizeRadius(css.borderRadius || '12px'), display: 'block' }}
                                    alt="Video"
                                />
                                {/* ✅ Nút play overlay chính giữa bằng absolute */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{
                                        width: '60px', height: '60px',
                                        borderRadius: '50%',
                                        backgroundColor: playBtnColor,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        pointerEvents: 'auto',
                                        cursor: 'pointer'
                                    }}>
                                        <img
                                            src="https://cdn-icons-png.flaticon.com/512/0/375.png"
                                            width={28} height={28}
                                            style={{ display: 'block', filter: 'invert(1)', marginLeft: '3px' }}
                                            alt="play"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center group/vid border-4 border-slate-800 shadow-inner overflow-hidden relative">
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.4)_0%,transparent_100%)]"></div>
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 group-hover/vid:scale-110 transition-transform border border-white/20">
                                    <LucideIcons.PlayCircle className="text-white/40 w-10 h-10" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 relative z-10" style={{ fontFamily: bodyStyle.fontFamily }}>Dán link Youtube/Vimeo</span>
                            </div>
                        )}
                    </div>
                );
            }

            case 'order_list':
                return (
                    <div style={{
                        padding: `${css.paddingTop ?? '24px'} ${css.paddingRight ?? '24px'} ${css.paddingBottom ?? '24px'} ${css.paddingLeft ?? '24px'}`,
                        backgroundColor: css.backgroundColor ?? '#ffffff',
                        borderRadius: sanitizeRadius(css.borderRadius ?? '16px'),
                        border: (css as any).border ?? '1px solid #f1f5f9',
                        boxShadow: css.boxShadow ?? '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                    }}>
                        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
                                    <LucideIcons.ShoppingBag size={16} />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: bodyStyle.fontFamily }}>Giỏ hàng của bạn</span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-tighter">Preview</span>
                        </div>
                        {[1, 2].map(i => (
                            <div key={i} className="flex gap-4 mb-4 items-center last:mb-0">
                                <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                                    <LucideIcons.Package size={20} className="text-slate-300" />
                                </div>
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-100 w-2/3 mb-2 rounded-full"></div>
                                    <div className="h-3 bg-slate-50 w-full rounded-full"></div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="h-4 bg-emerald-50 w-12 mb-1 rounded-full ml-auto"></div>
                                    <div className="h-3 bg-slate-50 w-8 rounded-full ml-auto"></div>
                                </div>
                            </div>
                        ))}
                        <div className="mt-6 pt-4 border-t border-slate-50 space-y-2">
                            <div className="flex justify-between items-center opacity-40">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Tạm tính</span>
                                <div className="h-3 bg-slate-200 w-12 rounded-full"></div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-700 uppercase" style={{ fontFamily: bodyStyle.fontFamily }}>Tổng cộng</span>
                                <div className="h-4 bg-emerald-500/20 w-16 rounded-full border border-emerald-500/30"></div>
                            </div>
                        </div>
                    </div>
                );

            case 'review':
                return (
                    <table border={0} cellPadding={0} cellSpacing={0} width={block.style.width || '100%'} style={{ display: 'inline-table', maxWidth: '100%' }}>
                        <tbody>
                            <tr>
                                <td style={{
                                    backgroundColor: css.backgroundColor ?? 'transparent',
                                    borderRadius: sanitizeRadius(css.borderRadius ?? '8px'),
                                    borderTopWidth: css.borderTopWidth ?? '1px',
                                    borderRightWidth: css.borderRightWidth ?? css.borderTopWidth ?? '1px',
                                    borderBottomWidth: css.borderBottomWidth ?? css.borderTopWidth ?? '1px',
                                    borderLeftWidth: css.borderLeftWidth ?? css.borderTopWidth ?? '1px',
                                    borderStyle: (css.borderStyle && css.borderStyle !== 'none') ? css.borderStyle : 'solid',
                                    borderColor: css.borderColor ?? '#e2e8f0',
                                    padding: `${css.paddingTop ?? '20px'} ${css.paddingRight ?? '20px'} ${css.paddingBottom ?? '20px'} ${css.paddingLeft ?? '20px'}`,
                                    boxSizing: 'border-box',
                                    fontFamily: css.fontFamily ?? bodyStyle.fontFamily,
                                    color: css.color ?? '#333333',
                                    fontSize: css.fontSize ?? '14px',
                                    lineHeight: css.lineHeight ?? '1.5',
                                    textAlign: css.textAlign as any ?? 'center'
                                }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '15px' }}>
                                        {Array(block.rating || 5).fill(0).map((_, i) => (
                                            <div key={i} style={{ display: 'inline-block', margin: '0 2px' }}>
                                                <img src={getIconUrl('Star', '#fbbf24')} width={20} height={20} style={{ display: 'block', width: '20px', height: '20px' }} alt="star" />
                                            </div>
                                        ))}
                                    </div>
                                    <RichText
                                        html={block.content}
                                        onChange={(newHtml) => onUpdateBlockContent?.(block.id, newHtml)}
                                        disabled={!isSelected}
                                        className="w-full"
                                        bodyLinkColor={bodyStyle.linkColor}
                                        customMergeTags={customMergeTags}
                                        blockFontSize={css.fontSize}
                                        blockLineHeight={css.lineHeight}
                                        style={{
                                            color: css.color, textAlign: css.textAlign as any ?? 'center',
                                            fontWeight: css.fontWeight, fontStyle: css.fontStyle,
                                            textDecoration: css.textDecoration, textTransform: css.textTransform
                                        }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                );

            case 'table':
                return (
                    <TableBlockCanvas
                        block={block}
                        isSelected={isSelected}
                        onUpdate={(data) => {
                            // Combined atomic update — avoids two-render stale-cols bug
                            if (data.content !== undefined && data.style !== undefined) {
                                onUpdateBlock?.(block.id, { content: data.content, style: data.style as any });
                            } else {
                                if (data.content !== undefined) onUpdateBlockContent?.(block.id, data.content);
                                if (data.style !== undefined) onUpdateBlockStyle?.(block.id, data.style);
                            }
                        }}
                    />
                );

            default:
                return (
                    <RichText
                        html={block.content}
                        onChange={(newHtml) => onUpdateBlockContent?.(block.id, newHtml)}
                        disabled={!isSelected}
                        bodyLinkColor={bodyStyle.linkColor}
                        customMergeTags={customMergeTags}
                        style={{
                            textAlign: css.textAlign as any ?? 'left',
                            fontFamily: css.fontFamily ?? bodyStyle.fontFamily,
                            color: css.color, fontWeight: css.fontWeight,
                            fontStyle: css.fontStyle, textDecoration: css.textDecoration,
                            textTransform: css.textTransform
                        }}
                    />
                );
        }
    };

    return (
        <tr
            key={block.id} id={`block-${block.id}`}
            draggable onDragStart={(e) => onDragStart(e, block.id)} onDragOver={(e) => onDragOver(e, block.id, block.type)} onDrop={(e) => onDrop(e, block.id)} onClick={(e) => { e.stopPropagation(); onSelectBlock(block.id); }}
        >
            <td className={`relative transition-all w-full ${!isSelected ? 'hover:ring-2 hover:ring-amber-600 hover:ring-dashed hover:bg-amber-600/5' : ''}`} style={wrapperTdStyles}>
                {dragOverId === block.id && dropPosition && <CanvasDropIndicator dropPosition={dropPosition} />}
                <CanvasHandleOverlay block={block} color="ring-amber-600" isSelected={isSelected} onDragStart={onDragStart} onMoveOrder={onMoveOrder} onSwapColumns={onSwapColumns} onDuplicateBlock={onDuplicateBlock} onDeleteBlock={onDeleteBlock} onSelectParent={onSelectParent} onSaveSection={onSaveSection} />

                <div style={{
                    ...decorativeStyles,
                    ...(['button', 'quote', 'review', 'order_list', 'check_list', 'table'].includes(block.type) ? {} : innerPadding),
                    marginTop: marginTop ?? '0',
                    marginRight: marginRight ?? '0',
                    marginBottom: marginBottom ?? '0',
                    marginLeft: marginLeft ?? '0',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    {renderInner()}
                </div>

                {!isSelected && <div className="absolute inset-0 z-10 cursor-pointer" title="Click to select" />}
            </td>
        </tr>
    );
};

export default CanvasBlock;
