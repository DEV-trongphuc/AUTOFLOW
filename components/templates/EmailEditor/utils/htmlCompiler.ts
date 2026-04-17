import { EmailBlock, EmailBodyStyle, EmailBlockStyle } from '../../../../types';
import { SHARED_EMAIL_CSS } from '../constants/editorStyles';

// Utility: Sanitize border-radius to prevent double 'px' suffix
const sanitizeRadius = (val: string | undefined): string => {
    if (!val) return '0px';
    // Remove any existing 'px' and add it back once
    const cleaned = val.replace(/px/g, '').trim();
    // Handle multi-value radius (e.g., "10 20 30 40" or "10px 20px 30px 40px")
    const values = cleaned.split(/\s+/).filter(v => v);
    return values.map(v => `${v}px`).join(' ');
};

const CHECKLIST_SVGS: Record<string, string> = {
    CheckCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    CircleCheckBig: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3 7-7"></path>',
    Check: '<path d="M20 6 9 17l-5-5"></path>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
    ArrowRight: '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
    MousePointer2: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"></path><path d="m13 13 3 3"></path>',
    Sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path>',
    Heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>',
    Zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path>',
    Target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
    ShoppingBag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>',
    Package: '<path d="M16.5 9.4 7.55 4.24"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line>',
    Settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>'
};

const getSVGIcon = (path: string, size: number, color: string) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; width: ${size}px; height: ${size}px;">${path}</svg>`;
};

export const getIconUrl = (iconName: string, color: string) => {
    const cleanColor = color.replace('#', '');
    const iconMap: Record<string, string> = {
        facebook: 'facebook-new',
        twitter: 'twitter',
        instagram: 'instagram-new',
        linkedin: 'linkedin',
        youtube: 'youtube-play',
        website: 'globe',
        email: 'mail',
        phone: 'phone',
        tiktok: 'tiktok',
        github: 'github',
        address: 'map-pin',
        // Expanded Icon Set
        CheckCircle: 'checked',
        CircleCheckBig: 'checklist',
        Check: 'ok',
        Star: 'star',
        ArrowRight: 'right',
        MousePointer2: 'cursor',
        Sparkles: 'sparkling',
        Heart: 'like',
        Zap: 'lightning-bolt',
        Target: 'goal',
        ShoppingBag: 'shopping-bag',
        Package: 'box',
        Settings: 'settings',
        ThumbsUp: 'thumb-up',
        Shield: 'shield',
        Award: 'medal',
        Gift: 'gift',
        User: 'user',
        Home: 'home',
        Calendar: 'calendar',
        Clock: 'clock',
        Lock: 'lock',

        // General UI
        MapPin: 'map-pin',
        Phone: 'phone',
        Mail: 'mail',
        Globe: 'globe',
        Bell: 'bell',
        Users: 'groups',
        Search: 'search',
        Menu: 'menu',
        Camera: 'camera',
        Video: 'video',
        Music: 'music',
        File: 'file',
        Folder: 'folder',
        Trash: 'trash',
        Edit: 'edit',
        Plus: 'plus',
        Minus: 'minus',
        X: 'multiply',
        Info: 'info',
        Help: 'help',
        Alert: 'error'
    };
    const tag = iconMap[iconName] || 'ok';
    return `https://img.icons8.com/ios-filled/${(tag === 'twitter' || tag === 'star') ? '50' : '100'}/${cleanColor}/${tag}.png`;
};

export const compileHTML = (blocks: EmailBlock[], bodyStyle: EmailBodyStyle, title: string) => {

    const HEAD_CSS = `
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">
        <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
        
        ${SHARED_EMAIL_CSS}
        a { color: ${bodyStyle.linkColor || '#2563eb'} !important; text-decoration: underline !important; }
        .btn-link { text-decoration: none !important; }
        p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
        
        /* MOBILE RESPONSIVE STYLES */
        @media screen and (max-width: 600px) {
            .full-width { width: 100% !important; }
            
            /* Section & Layout Resets */
            .section-wrapper { 
                padding-left: 0 !important; 
                padding-right: 0 !important; 
                padding-top: 15px !important; /* Reduced from 20px */
                padding-bottom: 15px !important; /* Reduced from 20px */
            }
            .section-content {
                width: 100% !important;
                max-width: 100% !important;
            }
            
            /* Stacking Columns */
            .row-resp { 
                display: block !important; 
                width: 100% !important; 
            }
            .col-resp { 
                display: block !important; 
                width: 100% !important; 
                min-width: 100% !important;
                max-width: 100% !important;
                padding-left: 8px !important; /* Further reduced from 10px */
                padding-right: 8px !important; /* Further reduced from 10px */
                margin-bottom: 12px !important; /* Reduced from 15px */
                box-sizing: border-box !important;
                clear: both !important;
            }
            .col-resp:last-child { margin-bottom: 0 !important; }

            /* Timeline Mobile Fix */
            .timeline-date {
                width: 60px !important;
                padding-right: 10px !important;
                font-size: 11px !important;
            }

            /* NoStack Button Adjustments */
            .btn-nostack { 
                font-size: 10px !important; 
            }
            .btn-nostack a {
                padding: 8px 12px !important;
                font-size: 10px !important;
            }

            /* Font Adjustments */
            h1 { font-size: 26px !important; }
            h2 { font-size: 22px !important; }
            p, td, div { font-size: 16px !important; line-height: 1.6 !important; }
            
            /* Image scaling */
            img {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
            }
            
            /* Text & Content Block Mobile Adjustments */
            .text-block, .quote-block {
                padding-left: 10px !important;
                padding-right: 10px !important;
            }

            .image-block {
                padding-left: 0 !important;
                padding-right: 0 !important;
                padding-top: 10px !important;
                padding-bottom: 10px !important;
            }
            
            /* Reduce vertical padding for internal blocks if excessive */
            .mobile-padding-y {
                padding-top: 10px !important;
                padding-bottom: 10px !important;
            }
            .center-on-narrow {
                text-align: center !important;
                display: block !important;
                margin: 0 auto !important;
                float: none !important;
            }
            .mobile-hide { display: none !important; }
        }
    </style>
    `;

    const getBackgroundStyle = (styleObj: EmailBlockStyle | EmailBodyStyle): string => {
        let style = '';
        const overlayColor = (styleObj as any).overlayColor;
        const overlayOpacity = (styleObj as any).overlayOpacity ?? 0;
        let bgImage = styleObj.backgroundImage || '';

        // Helper to mix overlay
        if (overlayColor && overlayOpacity > 0) {
            const hexToRgba = (hex: string, alpha: number) => {
                let r = 0, g = 0, b = 0;
                if (hex.length === 4) {
                    r = parseInt(hex[1] + hex[1], 16);
                    g = parseInt(hex[2] + hex[2], 16);
                    b = parseInt(hex[3] + hex[3], 16);
                } else if (hex.length === 7) {
                    r = parseInt(hex.slice(1, 3), 16);
                    g = parseInt(hex.slice(3, 5), 16);
                    b = parseInt(hex.slice(5, 7), 16);
                }
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            const rgba = hexToRgba(overlayColor, overlayOpacity);
            if (bgImage && bgImage !== 'none') {
                bgImage = `linear-gradient(${rgba}, ${rgba}), ${bgImage}`;
            } else {
                // If no image but overlay, treating overlay as bg color over transparent? 
                // Or just bg color? Let's use linear-gradient trick or just bg-color if solid.
                // Actually if ONLY overlay color provided without image, it acts like bg color.
                // But sticking to gradient over 'none' might be invalid in some clients.
                // If no image, we usually just use backgroundColor.
            }
        }

        if (bgImage && bgImage.includes('gradient')) {
            style += `background: ${bgImage}; `;
            // Fallback for solid color extraction if possible, or just ignore
            const match = bgImage.match(/linear-gradient\((?:to\s+\w+|[\d.]+deg),\s*(#[\da-fA-F]{3,6}|rgba?\([^)]+\))\s*,/i);
            if (match && match[1]) style += `background-color: ${match[1]}; `; // Fallback
        } else if (bgImage && bgImage !== 'none') {
            style += `background-image: url('${bgImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1')}'); background-repeat: ${styleObj.backgroundRepeat || 'no-repeat'}; background-size: ${styleObj.backgroundSize || 'cover'}; background-position: ${styleObj.backgroundPosition || 'center'};`;
            // For Outlook VML would be needed here for full support, but skipping for now
        }

        if (styleObj.backgroundColor && styleObj.backgroundColor !== 'transparent') {
            style += `background-color: ${styleObj.backgroundColor}; `;
        }
        return style;
    };

    const getBgColorHtmlAttr = (styleObj: EmailBlockStyle | EmailBodyStyle): string => {
        if (styleObj.backgroundColor && styleObj.backgroundColor !== 'transparent' && !styleObj.backgroundColor.includes('gradient')) {
            return `bgcolor="${styleObj.backgroundColor}"`;
        }
        return '';
    };

    const renderBlock = (b: EmailBlock, parentAlign: string = 'center', parentNoStack: boolean = false): string => {
        const s = b.style || {};
        const getBorderStyle = (styleObj: EmailBlockStyle) => {
            if (!styleObj.borderTopWidth && !styleObj.borderRightWidth && !styleObj.borderBottomWidth && !styleObj.borderLeftWidth) return '';
            return `border-top: ${styleObj.borderTopWidth || '0'} ${styleObj.borderStyle || 'solid'} ${styleObj.borderColor || '#dddddd'}; border-right: ${styleObj.borderRightWidth || '0'} ${styleObj.borderStyle || 'solid'} ${styleObj.borderColor || '#dddddd'}; border-bottom: ${styleObj.borderBottomWidth || '0'} ${styleObj.borderStyle || 'solid'} ${styleObj.borderColor || '#dddddd'}; border-left: ${styleObj.borderLeftWidth || '0'} ${styleObj.borderStyle || 'solid'} ${styleObj.borderColor || '#dddddd'};`;
        };

        const blockBgCss = getBackgroundStyle(s);
        const paddingCss = `padding: ${s.paddingTop || '0'} ${s.paddingRight || '0'} ${s.paddingBottom || '0'} ${s.paddingLeft || '0'};`;
        const marginCss = `margin: ${s.marginTop || '0'} ${s.marginRight || '0'} ${s.marginBottom || '0'} ${s.marginLeft || '0'};`;

        // Alignment logic: use own if specified, else parent
        const align = s.textAlign || parentAlign || 'left';

        const fontFamily = bodyStyle.fontFamily || "'Roboto', Arial, sans-serif";
        const commonStyle = `font-family: ${fontFamily}; color: ${s.color || 'inherit'}; text-align: ${align}; font-weight: ${s.fontWeight || 'normal'}; font-style: ${s.fontStyle || 'normal'}; text-decoration: ${s.textDecoration || 'none'}; text-transform: ${s.textTransform || 'none'};`;
        const radiusStyle = s.borderRadius ? `border-radius: ${sanitizeRadius(s.borderRadius)};` : '';

        const wrapWithMargin = (innerTdHtml: string): string => {
            const hasMargin = [s.marginTop, s.marginBottom, s.marginLeft, s.marginRight].some(m => m && m !== '0' && m !== '0px' && m !== 'auto');
            if (hasMargin) {
                return `<tr><td style="padding: 0;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; ${marginCss}"><tr>${innerTdHtml}</tr></table></td></tr>`;
            }
            return `<tr>${innerTdHtml}</tr>`;
        };

        if (b.type === 'section') {
            const innerBgStyleObj = { backgroundColor: s.contentBackgroundColor };
            const innerBgCss = getBackgroundStyle(innerBgStyleObj);
            const childrenHtml = b.children?.map(c => renderBlock(c, align, parentNoStack).trim()).join('') || '';
            const sectionMarginTop = s.marginTop || '0px';
            const sectionMarginBottom = s.marginBottom || '0px';
            // [FIX] Apply marginTop/Bottom via wrapper table cellspacing trick (margin on td is ignored by Outlook/Gmail)
            // We use separate spacer rows before/after the section content for cross-client margin support
            const topSpacer = sectionMarginTop !== '0px' && sectionMarginTop !== '0' ? `<tr><td height="${parseInt(sectionMarginTop)||0}" style="font-size: ${parseInt(sectionMarginTop)||0}px; line-height: ${parseInt(sectionMarginTop)||0}px; mso-line-height-rule: exactly;">&nbsp;</td></tr>` : '';
            const bottomSpacer = sectionMarginBottom !== '0px' && sectionMarginBottom !== '0' ? `<tr><td height="${parseInt(sectionMarginBottom)||0}" style="font-size: ${parseInt(sectionMarginBottom)||0}px; line-height: ${parseInt(sectionMarginBottom)||0}px; mso-line-height-rule: exactly;">&nbsp;</td></tr>` : '';
            return `${topSpacer}<tr><td align="center" valign="top" class="section-wrapper" ${getBgColorHtmlAttr(s)} style="${getBackgroundStyle(s)} ${paddingCss} ${radiusStyle}"><table class="full-width section-content" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" align="center" style="max-width: ${bodyStyle.contentWidth}; ${innerBgCss}; margin: 0 auto;"><tbody>${childrenHtml}</tbody></table></td></tr>${bottomSpacer}`;
        }

        if (b.type === 'row') {
            const noStack = s.noStack === true;
            const columnsHtml = (b.children || []).map(col => {
                const width = col.style?.width || '100%';
                const cs = col.style || {};
                const colRadius = cs.borderRadius ? `border-radius: ${sanitizeRadius(cs.borderRadius)};` : '';
                const textAlign = cs.textAlign || align; // Inherit from row if not specified
                const colClass = noStack ? "" : "col-resp";
                const colBorderStyle = getBorderStyle(cs);
                const colChildrenHtml = col.children?.map(c => renderBlock(c, textAlign, noStack).trim()).join('') || '';
                return `<td class="${colClass}" align="${textAlign}" valign="${cs.verticalAlign || 'top'}" width="${width}" ${getBgColorHtmlAttr(cs)} style="width:${width}; padding: ${cs.paddingTop || '0'} ${cs.paddingRight || '0'} ${cs.paddingBottom || '0'} ${cs.paddingLeft || '0'}; text-align: ${textAlign}; ${getBackgroundStyle(cs)} ${colBorderStyle} ${colRadius} overflow: hidden;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" align="${textAlign}"><tbody>${colChildrenHtml}</tbody></table></td>`;
            }).join('');
            const rowClass = noStack ? "" : "row-resp";
            return wrapWithMargin(`<td align="${s.textAlign || 'center'}" ${getBgColorHtmlAttr(s)} style="${getBackgroundStyle(s)} ${paddingCss} ${radiusStyle}"><table class="${rowClass}" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width: 100%;"><tr>${columnsHtml}</tr></table></td>`);
        }

        if (b.type === 'button') {
            const btnBg = s.contentBackgroundColor || (s as any).buttonBackgroundColor || s.backgroundColor || '#d97706';
            const btnWidth = s.width || 'auto';
            const tableWidth = btnWidth === 'auto' ? '' : btnWidth.replace('px', '');
            const btnColor = s.color || '#ffffff';
            const btnPadding = `padding: ${s.paddingTop || '12px'} ${s.paddingRight || '24px'} ${s.paddingBottom || '12px'} ${s.paddingLeft || '24px'};`;
            // Use inherited alignment if not explicitly set
            const btnAlign = s.textAlign || parentAlign || 'center';
            const btnMarginTop = s.marginTop || '0px';
            const btnMarginBottom = s.marginBottom || '0px';
            const btnMarginLeft = s.marginLeft || (btnAlign === 'center' ? 'auto' : (btnAlign === 'right' ? 'auto' : '0px'));
            const btnMarginRight = s.marginRight || (btnAlign === 'center' ? 'auto' : (btnAlign === 'right' ? '0px' : 'auto'));

            // Use global sanitizeRadius utility
            const btnRadius = sanitizeRadius(s.borderRadius || '4px');
            const btnHeight = s.height ? `height: ${s.height}; ` : '';
            const btnLineHeight = s.lineHeight ? `line-height: ${s.lineHeight}; ` : '';

            const tableMarginCss = `margin-top: ${btnMarginTop}; margin-bottom: ${btnMarginBottom}; margin-left: ${btnMarginLeft}; margin-right: ${btnMarginRight};`;

            return `<tr><td align="${btnAlign}" style="width: 100%; text-align: ${btnAlign} !important;"><!--[if mso]><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="${btnAlign}" width="${tableWidth}" style="${tableMarginCss} width: ${btnWidth};"><tr><td align="center" style="background: ${btnBg}; border-radius: ${btnRadius};"><![endif]--><!--[if !mso]><!--><table border="0" cellspacing="0" cellpadding="0" align="${btnAlign}" width="${tableWidth}" style="${tableMarginCss} display: inline-table; border-collapse: separate; width: ${btnWidth};"><!--<![endif]--><tr><td align="center" class="${parentNoStack ? 'btn-nostack' : ''}" style="${getBorderStyle(s)} border-radius: ${btnRadius};"><a class="btn-link ${parentNoStack ? 'btn-nostack' : ''}" href="${b.url || '#'}" target="_blank" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: ${s.fontSize || '16px'}; font-weight: ${s.fontWeight || 'bold'}; font-style: ${s.fontStyle || 'normal'}; text-decoration: ${s.textDecoration || 'none'}; text-transform: ${s.textTransform || 'none'}; color: ${btnColor} !important; border-radius: ${btnRadius}; -webkit-border-radius: ${btnRadius}; -moz-border-radius: ${btnRadius}; ${btnPadding} ${btnHeight}${btnLineHeight}display: block; background: ${btnBg}; width: ${btnWidth}; box-sizing: border-box; text-align: center; overflow: hidden;">${b.content || 'BUTTON'}</a></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr>`;
        }

        if (b.type === 'header') {
            const menuType = (s as any).headerMenuType || 'link';
            const menuGap = parseInt((s as any).menuGap || '20px');
            const logoWidth = (s as any).logoWidth || '120px';
            const btnBg = (s as any).buttonBg || '#d97706';
            const btnColor = (s as any).buttonColor || '#ffffff';
            const menuItems = b.items || [];
            
            const menuHtml = menuItems.map((item, i) => {
                const paddingLeft = i === 0 ? 0 : menuGap;
                const itemLink = item.description || '#';
                const itemType = item.menuType || menuType;
                
                if (itemType === 'button') {
                    return `<td style="padding-left: ${paddingLeft}px; padding-top: 5px; padding-bottom: 5px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center" bgcolor="${btnBg}" style="border-radius: 6px; padding: 8px 16px;"><a href="${itemLink}" target="_blank" style="font-family: ${fontFamily}; font-size: 13px; font-weight: bold; color: ${btnColor} !important; text-decoration: none; display: block;">${item.title}</a></td></tr></table></td>`;
                } else {
                    return `<td style="padding-left: ${paddingLeft}px; padding-top: 5px; padding-bottom: 5px;"><a href="${itemLink}" target="_blank" style="font-family: ${fontFamily}; font-size: 14px; font-weight: 600; color: ${s.color || '#475569'} !important; text-decoration: none;">${item.title}</a></td>`;
                }
            }).join('');

            return wrapWithMargin(`
                <td align="center" style="${paddingCss} ${getBackgroundStyle(s)}">
                    <!--[if mso]><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td width="30%" align="left" valign="middle"><![endif]-->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                        <tr>
                            <!-- Logo Column -->
                            <td class="col-resp" align="left" valign="middle" style="padding: 0; text-align: left;">
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                    <tr>
                                        <td align="left" class="center-on-narrow">
                                            <img src="${b.content || 'https://via.placeholder.com/120x40?text=Logo'}" width="${logoWidth.replace('px', '')}" style="display: block; width: ${logoWidth}; max-width: 100%; height: auto; border: 0;" alt="${b.altText || 'Logo'}" />
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <!--[if mso]></td><td width="70%" align="right" valign="middle"><![endif]-->
                            <!-- Menu Column -->
                            <td class="col-resp" align="right" valign="middle" style="padding: 0; text-align: right;">
                                <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="right" class="center-on-narrow" style="display: inline-table;">
                                    <tr>${menuHtml}</tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <!--[if mso]></td></tr></table><![endif]-->
                </td>
            `);
        }

        if (b.type === 'timeline') {
            const dotColor = s.timelineDotColor || '#ffa900';
            const lineColor = s.timelineLineColor || '#e2e8f0';
            const lineStyle = s.timelineLineStyle || 'solid';
            const items = b.items || [];

            return wrapWithMargin(`<td style="${paddingCss} ${getBackgroundStyle(s)}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse;">${items.map((item, i) => {
                const isFirst = i === 0;
                const isLast = i === items.length - 1;
                const centerPos = '14px';
                const gradStart = isFirst ? centerPos : '0%';
                const gradEnd = isLast ? centerPos : '100%';
                const lineBg = `linear-gradient(to bottom, transparent 0%, transparent ${gradStart}, ${lineColor} ${gradStart}, ${lineColor} ${gradEnd}, transparent ${gradEnd})`;
                const dateWidth = item.date ? 80 : 0;
                return `<tr><td class="timeline-date" width="${dateWidth}" valign="top" style="padding: 6px ${item.date ? '15' : '0'}px 30px 0; text-align: right; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 12px; color: ${s.color || 'inherit'}; width: ${dateWidth}px;"><strong>${item.date || ''}</strong></td><td width="20" valign="top" align="center" style="padding: 0; background: ${lineBg}; background-size: 2px 100%; background-position: center; background-repeat: no-repeat;"><div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${dotColor}; border: 2px solid #ffffff; margin: 6px auto 0; box-sizing: content-box;"></div></td><td valign="top" style="padding: 6px 0 40px 20px; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"};"><h4 style="margin: 0 0 5px; font-size: 16px; color: ${bodyStyle.fontFamily ? 'inherit' : '#1e293b'}; font-weight: bold; text-align: left;">${item.title}</h4><p style="margin: 0; font-size: 14px; color: #64748b; text-align: left; line-height: 1.5;">${item.description}</p></td></tr>`;
            }).join('')}</table></td>`);
        }

        if (b.type === 'video') {
            const videoAlign = s.textAlign || 'center';
            const playBtnColor = s.playButtonColor || '#d97706';
            return wrapWithMargin(`<td align="${videoAlign}" style="${paddingCss} ${getBackgroundStyle(s)}"><a href="${b.videoUrl || '#'}" target="_blank" style="display: inline-block; text-decoration: none;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td style="padding: 0;"><img src="${b.thumbnailUrl || 'https://via.placeholder.com/600x340?text=Video+Thumbnail'}" width="100%" style="display: block; max-width: 100%; border-radius: ${sanitizeRadius(s.borderRadius || '12px')};" /></td></tr><tr><td align="center" style="margin-top: -80px; position: relative;"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" bgcolor="${playBtnColor}" style="width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"><img src="https://cdn-icons-png.flaticon.com/512/0/375.png" width="30" height="30" style="display: block; filter: invert(1); margin-left: 4px;" /></td></tr></table></td></tr></table></a></td>`);
        }

        if (b.type === 'order_list') {
            return wrapWithMargin(`
                    <td style="${paddingCss} ${getBackgroundStyle(s)}">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse; background-color: ${s.backgroundColor || '#ffffff'}; border-radius: ${sanitizeRadius(s.borderRadius || '12px')}; border: 1px solid #eeeeee;">
                            <tr>
                                <td style="padding: 20px;">
                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                                        <tr>
                                            <td width="24" valign="middle" style="padding-right: 8px;">
                                                <img src="${getIconUrl('ShoppingBag', '#64748b')}" width="16" height="16" style="display: block; width: 16px; height: 16px;" />
                                            </td>
                                            <td valign="middle" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Danh sách sản phẩm</td>
                                        </tr>
                                    </table>
                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        ${[1, 2].map(i => `
                                            <tr>
                                                <td width="70" valign="top" style="padding-bottom: 15px;">
                                                    <div style="width: 60px; height: 60px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
                                                        <img src="${getIconUrl('Package', '#cbd5e1')}" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                                                    </div>
                                                </td>
                                                <td valign="top" style="padding: 0 10px 15px 10px; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"};">
                                                    <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">Sản phẩm mẫu #${i}</div>
                                                    <div style="font-size: 12px; color: #64748b; line-height: 1.4;">Chi tiết về sản phẩm này sẽ được hiển thị tại đây. Đây là mẫu thiết kế.</div>
                                                </td>
                                                <td width="80" valign="top" align="right" style="padding-bottom: 15px; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"};">
                                                    <div style="font-size: 14px; font-weight: bold; color: #ffa900;">$99.00</div>
                                                    <div style="font-size: 11px; color: #94a3b8; text-decoration: line-through;">$149.00</div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </table>
                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-top: 1px solid #f1f5f9; margin-top: 10px; padding-top: 15px;">
                                        <tr>
                                            <td style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 13px; font-weight: bold; color: #1e293b;">TỔNG CỘNG</td>
                                            <td align="right" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 15px; font-weight: 800; color: #ffa900;">$198.00</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                `);
        }

        if (b.type === 'countdown') {
            const digitColor = (s.color || '#ffffff').replace('#', '');
            const labelColor = (s.labelColor || '#004a7c').replace('#', '');
            // const targetDate = s.targetDate ? new Date(s.targetDate).getTime() : 0;
            const targetDateStr = s.targetDate || '';
            const bg = 'transparent'; // Future: s.backgroundColor ...

            // Use server-side generated image for email compatibility
            const timerUrl = `https://automation.ideas.edu.vn/mail_api/timer.php?target=${encodeURIComponent(targetDateStr)}&color=${digitColor}&bg=${bg}&v=${Date.now()}`;

            return wrapWithMargin(`\n                    <td align="center" style="${paddingCss} ${getBackgroundStyle(s)}">\n                        <!-- Timer Container -->
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width: 400px;">
                            <tr>
                                <td align="center">
                                    <!-- Numbers Image -->
                                    <img src="${timerUrl}" width="500" style="display: block; max-width: 100%; height: auto; margin: 0 auto;" alt="Countdown Timer" />
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding-top: 4px;">
                                    <!-- Labels Table -->
                                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                            <td width="33.33%" align="center" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 13px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #${labelColor};">NGÀY</td>
                                            <td width="33.33%" align="center" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 13px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #${labelColor};">GIỜ</td>
                                            <td width="33.33%" align="center" style="font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: 13px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #${labelColor};">PHÚT</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                                        </td>\n                `);
        }

        if (b.type === 'quote') {
            const paddingVertical = s.paddingTop || '15px';
            const paddingHorizontal = s.paddingLeft || '25px';
            const quoteBorderColor = s.borderColor || '#ffa900';
            const quoteBorderWidth = s.borderLeftWidth || '4px';
            // [FIX] Gmail-safe: use table instead of div for quote block
            return wrapWithMargin(`<td class="quote-block" style="${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-left: ${quoteBorderWidth} solid ${quoteBorderColor}; border-radius: ${sanitizeRadius(s.borderRadius || '0')}; background-color: ${s.backgroundColor || 'transparent'};"><tr><td style="padding: ${paddingVertical} ${s.paddingRight || '25px'} ${s.paddingBottom || '15px'} ${paddingHorizontal}; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: ${s.fontSize || '15px'}; font-style: ${s.fontStyle || 'italic'}; line-height: 1.6; color: ${s.color || 'inherit'}; text-align: ${s.textAlign || 'left'}; font-weight: ${s.fontWeight || 'normal'};">${b.content}</td></tr></table></td>`);
        }

        if (b.type === 'check_list') {
            const checkIconColor = s.checkIconColor || '#d97706';
            const checkIconSize = parseInt(s.checkIconSize || '20');
            const items = b.items || [];
            const showTitle = s.showCheckListTitle !== false;
            const title = b.checkListTitle || 'Checklist';
            const maxW = s.maxWidth ? `max-width: ${s.maxWidth}; margin: 0 auto;` : '';
            
            const titleFont = s.checkTitleFont || fontFamily;
            const titleSize = s.checkTitleSize ? (typeof s.checkTitleSize === 'string' ? s.checkTitleSize : s.checkTitleSize + 'px') : '18px';
            const itemSize = s.checkItemSize ? (typeof s.checkItemSize === 'string' ? s.checkItemSize : s.checkItemSize + 'px') : '14px';
            const descSize = s.checkItemSize ? `${Math.max(10, parseInt(String(s.checkItemSize)) - 1)}px` : '13px';
            const titleColor = s.checkTitleColor || s.color || '#1e293b';
            const itemColor = s.checkItemColor || s.color || '#334155';
            const descColor = s.checkDescColor || '#64748b';
            const vAlignGlobal = s.checkIconVerticalAlign || 'top';

            return wrapWithMargin(`
                    <td class="mobile-padding-y" style="${paddingCss} ${getBackgroundStyle(s)} border-radius: ${sanitizeRadius(s.borderRadius || '0')}; overflow: hidden;">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="${maxW}">
                        <tbody><tr><td style="text-align: ${s.textAlign || 'left'};">
                        ${showTitle ? `<h3 style="margin: 0 0 15px; font-family: ${titleFont}; font-size: ${titleSize}; font-weight: bold; color: ${titleColor}; text-align: ${s.textAlign || 'left'};">${title}</h3>` : ''}
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                            ${items.map(item => {
                const showItemTitle = s.showItemTitle !== false;
                const showItemDesc = s.showItemDescription !== false;
                const isSingleLine = !showItemTitle || !showItemDesc;
                const iconPaddingTop = isSingleLine ? '5px' : '6px';
                const textPaddingTop = isSingleLine ? '5px' : '2px';

                // Support custom image OR library icon
                const showIndividual = s.checkIndividualIcons && s.checkIconMode === 'image';
                const iconUrl = (showIndividual && item.customIconUrl)
                    ? item.customIconUrl
                    : (s.checkIconMode === 'image' && s.checkCustomIconUrl)
                        ? s.checkCustomIconUrl
                        : getIconUrl(s.checkIcon || 'CheckCircle', checkIconColor);

                // Style for the icon container
                const iconRadius = sanitizeRadius(s.checkIconRadius || '0');
                const iconBg = s.checkIconBackgroundColor || 'transparent';
                const iconBorder = (parseInt(s.checkIconBorderWidth || '0') > 0) 
                    ? `${s.checkIconBorderWidth} solid ${s.checkIconBorderColor || '#e2e8f0'}` 
                    : 'none';
                const iconPadding = s.checkIconPadding || '0';
                const iconAlign = s.textAlign === 'center' ? 'center' : (s.textAlign === 'right' ? 'right' : 'left');

                return `
                                    <tr>
                                        <td width="${checkIconSize + 10}" valign="${vAlignGlobal}" style="padding: ${vAlignGlobal === 'top' ? iconPaddingTop : '0'} 0 12px 0;">
                                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="${iconAlign}" style="background-color: ${iconBg}; border-radius: ${iconRadius}; border: ${iconBorder}; border-collapse: separate;">
                                                <tr>
                                                    <td style="padding: ${iconPadding}; font-size: 0; line-height: 0;">
                                                        <img src="${iconUrl}" width="${checkIconSize}" height="${checkIconSize}" style="display: block; width: ${checkIconSize}px; height: ${checkIconSize}px; object-fit: ${s.checkIconMode === 'image' ? 'cover' : 'contain'}; border: 0; border-radius: ${iconRadius};" />
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        <td valign="${vAlignGlobal}" style="padding: ${textPaddingTop} 0 12px 10px; font-family: ${fontFamily}; text-align: left;">
                                            ${showItemTitle ? `<div style="font-size: ${itemSize}; font-weight: bold; color: ${itemColor}; margin-bottom: ${showItemDesc ? '2' : '0'}px;">${item.title}</div>` : ''}
                                            ${showItemDesc ? `<div style="font-size: ${descSize}; color: ${descColor}; line-height: 1.4;">${item.description}</div>` : ''}
                                        </td>
                                    </tr>
                                `;
            }).join('')}
                        </table>
                        </td></tr></tbody></table>
                    </td>
                `);
        }

        if (b.type === 'table') {
            const tableRows = s.tableRows ?? 3;
            const tableCols = s.tableCols ?? 4;
            const headerRow = s.tableHeaderRow !== false;
            const headerBg = s.tableHeaderBg || '#1e293b';
            const headerTextColor = s.tableHeaderTextColor || '#ffffff';
            const stripe = s.tableStripe || 'alternate';
            const evenBg = s.tableEvenBg || '#f8fafc';
            const oddBg = s.tableOddBg || '#ffffff';
            const solidBg = s.tableSolidBg || '#ffffff';
            const evenColor = s.tableEvenTextColor || '#1e293b';
            const oddColor = s.tableOddTextColor || '#1e293b';
            const borderColor = s.tableBorderColor || '#e2e8f0';
            const borderW = s.tableBorderWidth || '1px';
            const cellPad = s.tableCellPadding || '8px 12px';
            const colWidths: string[] = s.tableColWidths || Array(tableCols).fill('auto');
            const colAligns: string[] = s.tableColAligns || Array(tableCols).fill('left');
            const fontSize = s.tableFontSize || '13px';
            const lastRowBg = s.tableLastRowBg || '';
            const lastRowColor = s.tableLastRowTextColor || '';
            const lastColBg = s.tableLastColBg || '';
            const lastColColor = s.tableLastColTextColor || '';

            let cells: { content: string; align?: string; bg?: string; color?: string }[][] = [];
            try { cells = JSON.parse(b.content); } catch { cells = []; }
            while (cells.length < tableRows) cells.push(Array(tableCols).fill({ content: '', align: 'left' }));

            const borderStyle = `${borderW} solid ${borderColor}`;

            const getCellBg = (ri: number, ci: number): string => {
                if (headerRow && ri === 0) return headerBg;
                const di = headerRow ? ri - 1 : ri;
                let bg = stripe === 'alternate' ? (di % 2 === 0 ? evenBg : oddBg) : solidBg;
                if (ri === tableRows - 1 && lastRowBg) bg = lastRowBg;
                if (ci === tableCols - 1 && lastColBg) bg = lastColBg;
                const cellBg = cells[ri]?.[ci]?.bg;
                if (cellBg) bg = cellBg;
                return bg;
            };

            const getCellColor = (ri: number, ci: number): string => {
                if (headerRow && ri === 0) return headerTextColor;
                const di = headerRow ? ri - 1 : ri;
                let color = stripe === 'alternate' ? (di % 2 === 0 ? evenColor : oddColor) : (s.color || '#1e293b');
                if (ri === tableRows - 1 && lastRowColor) color = lastRowColor;
                if (ci === tableCols - 1 && lastColColor) color = lastColColor;
                const cellColor = cells[ri]?.[ci]?.color;
                if (cellColor) color = cellColor;
                return color;
            };

            // colgroup for widths
            const colgroup = `<colgroup>${Array.from({ length: tableCols }, (_, ci) => {
                const w = colWidths[ci];
                return w && w !== 'auto' ? `<col width="${w.replace('%', '').replace('px', '')}${w.includes('%') ? '%' : ''}" />` : '<col />';
            }).join('')}</colgroup>`;

            const rows = Array.from({ length: tableRows }, (_, ri) => {
                const rowCells = cells[ri] || [];
                const tds = Array.from({ length: tableCols }, (_, ci) => {
                    const cell = rowCells[ci] || { content: '', align: colAligns[ci] || 'left' };
                    const cellAlign = cell.align || colAligns[ci] || 'left';
                    const isHeader = headerRow && ri === 0;
                    const bg = getCellBg(ri, ci);
                    const color = getCellColor(ri, ci);
                    return `<td align="${cellAlign}" valign="middle" style="padding: ${cellPad}; border: ${borderStyle}; font-family: ${bodyStyle.fontFamily || "'Roboto', Arial, sans-serif"}; font-size: ${fontSize}; font-weight: ${isHeader ? 'bold' : 'normal'}; color: ${color}; text-align: ${cellAlign}; background-color: ${bg};">${cell.content || '&nbsp;'}</td>`;
                }).join('');
                return `<tr>${tds}</tr>`;
            }).join('');

            return wrapWithMargin(`\n                    <td style="${paddingCss}">\n                        <!--[if mso]><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
                        <div style="overflow-x: auto;">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse; width: 100%; table-layout: fixed;">
                            ${colgroup}
                            <tbody>${rows}</tbody>
                        </table>
                        </div>
                        <!--[if mso]></td></tr></table><![endif]-->\n                    </td>\n                `).trim();
        }

        if (b.type === 'voucher') {
            const vStyle = s.voucherStyle || 'ticket';
            const vBorderColor = s.voucherBorderColor || '#d97706';
            const vBorderStyle = s.voucherBorderStyle || 'dashed';
            const vBg = s.voucherBg || '#fffbe1';
            const vTextColor = s.voucherTextColor || '#b45309';
            const btnBg = s.voucherButtonBg || '#d97706';
            const btnText = s.voucherButtonTextColor || '#ffffff';
            const linkId = b.voucherCampaignId;
            const codePlaceholder = linkId ? `[VOUCHER_${linkId}]` : 'XXXX-XXXX';
            
            let previewImgUrl = '';
            if (linkId) {
                try {
                    const stored = JSON.parse(localStorage.getItem('mailflow_voucher_campaigns') || '[]');
                    const camp = stored.find((c: any) => c.id === linkId);
                    if (camp && camp.rewards && camp.rewards.length > 0) {
                        previewImgUrl = camp.rewards[0].imageUrl || '';
                    }
                } catch (e) {}
            }

            // We must render standard table-based layouts for email clients
            const innerHtml = `
                <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color: ${vBg}; border: 2px ${vBorderStyle} ${vBorderColor}; border-radius: ${sanitizeRadius(s.borderRadius || '12px')};">
                    <tr>
                        <td align="center" style="padding: 24px; text-align: center; font-family: ${fontFamily};">
                            <!-- Icon / Img -->
                            ${previewImgUrl 
                                ? `<img src="${previewImgUrl}" style="display: block; margin: 0 auto 16px auto; max-height: 120px; max-width: 100%; border-radius: 8px;" alt="Reward" />` 
                                : `<img src="${getIconUrl('Gift', vBorderColor)}" width="32" height="32" style="display: block; margin: 0 auto 16px auto;" alt="Gift" />`
                            }
                            
                            <!-- Title -->
                            <h3 style="margin: 0 0 8px 0; font-size: ${s.fontSize || '24px'}; font-weight: 900; color: ${vTextColor}; text-transform: uppercase;">
                                VOUCHER ƯU ĐÃI
                            </h3>
                            
                            <p style="margin: 0 0 20px 0; font-size: 14px; color: ${vTextColor}; opacity: 0.8;">
                                Sử dụng mã dưới đây khi thanh toán
                            </p>
                            
                            <!-- Code Box -->
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="border: 2px solid ${vBorderColor}; background-color: #ffffff; border-radius: 8px; padding: 10px 24px;">
                                        <span style="font-family: monospace; font-size: 20px; font-weight: bold; color: ${vBorderColor}; letter-spacing: 2px;">
                                            ${codePlaceholder}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Save Button -->
                            <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                                <tr>
                                    <td align="center" style="border-radius: 8px;" bgcolor="${btnBg}">
                                        <a href="#" target="_blank" style="font-size: 14px; font-weight: bold; font-family: ${fontFamily}; color: ${btnText}; text-decoration: none; border-radius: 8px; padding: 12px 32px; border: 1px solid ${btnBg}; display: inline-block; text-transform: uppercase;">
                                            LƯU MÃ NGAY
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `;

            return wrapWithMargin(`
                <td align="center" style="${paddingCss} ${getBackgroundStyle(s)}">
                    ${innerHtml}
                </td>
            `);
        }

        if (b.type === 'review') {
            const starsHtml = Array(b.rating || 5).fill(0).map(() => `<div style="display: inline-block; margin: 0 2px;"><img src="${getIconUrl('Star', '#fbbf24')}" width="20" height="20" style="display: block; width: 20px; height: 20px;" /></div>`).join('');
            return wrapWithMargin(`\n                    <td align="center">\n                        <table border="0" cellpadding="0" cellspacing="0" width="${s.width || '100%'}" style="display: inline-table; max-width: 100%; border-radius: ${sanitizeRadius(s.borderRadius || '8px')}; overflow: hidden; border-collapse: separate;">
                            <tbody>
                                <tr>
                                    <td style="background-color: ${s.backgroundColor || 'transparent'}; border-top: ${s.borderTopWidth || '1px'} ${(s.borderStyle && s.borderStyle !== 'none') ? s.borderStyle : 'solid'} ${s.borderColor || '#e2e8f0'}; border-right: ${s.borderRightWidth || s.borderTopWidth || '1px'} ${(s.borderStyle && s.borderStyle !== 'none') ? s.borderStyle : 'solid'} ${s.borderColor || '#e2e8f0'}; border-bottom: ${s.borderBottomWidth || s.borderTopWidth || '1px'} ${(s.borderStyle && s.borderStyle !== 'none') ? s.borderStyle : 'solid'} ${s.borderColor || '#e2e8f0'}; border-left: ${s.borderLeftWidth || s.borderTopWidth || '1px'} ${(s.borderStyle && s.borderStyle !== 'none') ? s.borderStyle : 'solid'} ${s.borderColor || '#e2e8f0'}; border-radius: ${sanitizeRadius(s.borderRadius || '8px')}; padding: ${s.paddingTop || '20px'} ${s.paddingRight || '20px'} ${s.paddingBottom || '20px'} ${s.paddingLeft || '20px'}; box-sizing: border-box;">
                                        <div style="margin-bottom: 15px; text-align: center; font-size: 0;">
                                            ${starsHtml}
                                        </div>
                                        <div style="${commonStyle} font-size: ${s.fontSize || '14px'}; line-height: ${s.lineHeight || '1.5'};">${b.content}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    \n                    </td>\n                `).trim();
        }

        if (b.type === 'social') {
            const size = parseInt(s.iconSize || '32');
            const gap = parseInt(s.gap || '10') / 2;
            const icons = b.socialLinks?.map(l => {
                const mode = s.iconMode || 'color';
                let bg = l.customStyle?.backgroundColor || s.iconBackgroundColor || 'transparent';
                let fill = l.customStyle?.iconColor || s.iconColor;

                if (!fill) {
                    if (mode === 'original' || mode === 'color') {
                        const brandColors: any = { facebook: '#1877F2', twitter: '#1DA1F2', instagram: '#E4405F', linkedin: '#0A66C2', youtube: '#FF0000', zalo: '#0068FF' };
                        fill = brandColors[l.network] || '#666666';
                    } else {
                        fill = mode === 'dark' ? '#000000' : '#ffffff';
                    }
                }

                const ZALO_ICON_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/960px-Icon_of_Zalo.svg.png';
                const iconUrl = l.network === 'zalo' ? ZALO_ICON_URL : getIconUrl(l.network, fill);
                const imgSize = l.network === 'zalo' ? size : size * 0.6;
                return `<td style="padding: 0 ${gap}px;"><a href="${l.url}" style="display: block; width: ${size}px; height: ${size}px; background-color: ${bg}; border-radius: ${sanitizeRadius(s.borderRadius || '4px')}; text-align: center; line-height: ${size}px;">
                    <img src="${iconUrl}" width="${imgSize}" height="${imgSize}" style="vertical-align: middle; display: inline-block; width: ${imgSize}px; height: ${imgSize}px; object-fit: contain;" />
                </a></td>`;
            }).join('');
            // [FIX] Add getBackgroundStyle so social block background color works in email clients
            return wrapWithMargin(`<td align="${align}" style="${paddingCss} ${getBackgroundStyle(s)} ${radiusStyle} text-align: ${align};"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display: inline-table;"><tr>${icons}</tr></table></td>`);
        }

        // Text block: full styles including border, radius, background
        if (b.type === 'text') {
            const borderCss = getBorderStyle(s);
            const overflowCss = s.borderRadius ? 'overflow: hidden;' : '';
            // [FIX] Margin on <td> is ignored by Outlook/Gmail.
            // When margin is set, wrap in an outer table with margin for cross-client support.
            return wrapWithMargin(`<td align="${align}" class="text-block" style="${paddingCss} ${commonStyle} font-size: ${s.fontSize || '14px'}; line-height: ${s.lineHeight || '1.5'}; ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} ${overflowCss} text-align: ${align};">${b.content}</td>`);
        }
        if (b.type === 'image') {
            const imgWidth = s.width || '100%';
            const isPercent = imgWidth.includes('%');
            const borderCss = getBorderStyle(s);

            // [FIX] Two cases for image width:
            //
            // CASE 1 â€” Percent-based (e.g. '100%', '50%'):
            //   Do NOT set HTML width attribute â€” we can't know the actual pixel size of the
            //   parent column (e.g. 33% of 600px = 200px), and setting width="600" for a column
            //   image would be incorrect. Instead, use CSS-only: width:100%  + max-width:100%.
            //   This is universally respected by Gmail, Apple Mail, Outlook 365, and mobile.
            //
            // CASE 2 â€” Pixel-based (e.g. '300px', '200px'):
            //   Set both the HTML width attribute (numeric, required by old Outlook desktop)
            //   AND the CSS width property for other clients.
            const imgHeight = s.height && s.height !== 'auto' ? s.height : 'auto';
            const objectFit = s.objectFit || 'cover';
            let imgHtml: string;
            if (isPercent) {
                imgHtml = `<img src="${b.content}" class="full-width" style="display: block; width: 100%; max-width: 100%; height: ${imgHeight}; object-fit: ${objectFit}; margin: 0 auto; border-radius: ${sanitizeRadius(s.borderRadius || '0')};" alt="${b.altText || ''}" />`;
            } else {
                const pxVal = imgWidth.replace('px', '') || '600';
                const pxHeight = imgHeight !== 'auto' ? imgHeight.replace('px', '') : '';
                imgHtml = `<img src="${b.content}" width="${pxVal}" ${pxHeight ? `height="${pxHeight}"` : ''} class="full-width" style="display: block; width: ${imgWidth}; max-width: 100%; height: ${imgHeight}; object-fit: ${objectFit}; margin: 0 auto; border-radius: ${sanitizeRadius(s.borderRadius || '0')};" alt="${b.altText || ''}" />`;
            }

            if (b.url) {
                return wrapWithMargin(`<td align="${align}" class="image-block" width="100%" style="width: 100%; ${paddingCss} ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} text-align: ${align};"><a href="${b.url}" target="_blank" style="display: block; text-decoration: none; width: 100%;">${imgHtml}</a></td>`);
            }
            return wrapWithMargin(`<td align="${align}" class="image-block" width="100%" style="width: 100%; ${paddingCss} ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} text-align: ${align};">${imgHtml}</td>`);
        }


        // [FIX] Divider: use hr-mimicking table cell (div is unreliable in Outlook)
        if (b.type === 'divider') return wrapWithMargin(`<td style="${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td height="1" style="font-size: 1px; line-height: 1px; border-top: ${s.borderTopWidth || '1px'} ${s.borderStyle || 'solid'} ${s.borderColor || '#eeeeee'}; mso-line-height-rule: exactly;">&nbsp;</td></tr></table></td>`);
        // [FIX] Spacer: mso-line-height-rule: exactly for Outlook
        if (b.type === 'spacer') { const h = parseInt(s.height?.replace('px', '') || '20'); return wrapWithMargin(`<td height="${h}" style="font-size: ${h}px; line-height: ${h}px; mso-line-height-rule: exactly; ${getBackgroundStyle(s)}">&nbsp;</td>`); }

        // Fallback for unknown types
        const borderCss = getBorderStyle(s);
        return wrapWithMargin(`<td align="${align}" style="${paddingCss} ${commonStyle} ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} text-align: ${align};">${b.content}</td>`);
    };

    const PREVIEW_SCRIPT = `
    <script>
        (function() {
            function updateTimers() {
                var timers = document.querySelectorAll('[data-target]');
                timers.forEach(function(timer) {
                    var targetStr = timer.getAttribute('data-target');
                    if (!targetStr) return;
                    var target = new Date(targetStr).getTime();
                    var now = new Date().getTime();
                    var d = target - now;
                    if (d < 0) { d = 0; }
                    var days = Math.floor(d / (1000 * 60 * 60 * 24));
                    var hours = Math.floor((d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    var minutes = Math.floor((d % (1000 * 60 * 60)) / (1000 * 60));
                    var seconds = Math.floor((d % (1000 * 60)) / 1000);
                    var pad = function(n) { return n < 10 ? '0' + n : n; };
                    var elDays = timer.querySelector('.days');
                    var elHours = timer.querySelector('.hours');
                    var elMins = timer.querySelector('.minutes');
                    var elSecs = timer.querySelector('.seconds');
                    if (elDays) elDays.innerText = pad(days);
                    if (elHours) elHours.innerText = pad(hours);
                    if (elMins) elMins.innerText = pad(minutes);
                    if (elSecs) elSecs.innerText = pad(seconds);
                });
            }
            setInterval(updateTimers, 1000);
            updateTimers();
        })();
    </script>
    `;

    return `<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="x-apple-disable-message-reformatting">
<title>${title || 'Email'}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
${HEAD_CSS}
</head>
<body ${getBgColorHtmlAttr(bodyStyle)} style="margin: 0; padding: 0; word-spacing: normal; ${getBackgroundStyle(bodyStyle)};">
<div role="article" aria-roledescription="email" lang="vi" style="text-size-adjust: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
<center>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto;">
<tbody>
${blocks.map(b => renderBlock(b).trim()).join('')}
</tbody>
</table>
</center>
</div>
${PREVIEW_SCRIPT}
</body>
</html>`.trim();
};


