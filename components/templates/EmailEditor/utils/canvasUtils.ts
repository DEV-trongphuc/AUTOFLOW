// components/templates/EmailEditor/utils/canvasUtils.ts
import React from 'react';
import { EmailBlockStyle, EmailBodyStyle } from '../../../../types';

// Builds CSSProperties from an EmailBlockStyle object, considering mobile overrides
export const buildCss = (s: EmailBlockStyle, viewMode: 'desktop' | 'mobile', bodyFontFamily: string): React.CSSProperties => {
    const isMobile = viewMode === 'mobile';
    const mobileStyles = s.mobile || {};
    const rs = isMobile ? { ...s, ...mobileStyles } : s;

    const marginLeft = rs.marginLeft === 'auto' ? 'auto' : rs.marginLeft;
    const marginRight = rs.marginRight === 'auto' ? 'auto' : rs.marginRight;

    // Prioritize backgroundImage (gradients) in CSS
    const background = rs.backgroundImage && rs.backgroundImage !== 'none'
        ? rs.backgroundImage
        : rs.backgroundColor;

    return {
        paddingTop: rs.paddingTop, paddingRight: rs.paddingRight, paddingBottom: rs.paddingBottom, paddingLeft: rs.paddingLeft,
        marginTop: rs.marginTop, marginRight: marginRight, marginBottom: rs.marginBottom, marginLeft: marginLeft,
        background: background,
        backgroundColor: rs.backgroundColor,
        backgroundImage: rs.backgroundImage,
        backgroundSize: rs.backgroundSize || 'cover',
        backgroundPosition: rs.backgroundPosition || 'center',
        backgroundRepeat: rs.backgroundRepeat || 'no-repeat',
        color: rs.color,
        fontSize: rs.fontSize,
        fontWeight: rs.fontWeight,
        // ✅ FIX: Ưu tiên rs.fontFamily (block setting), fallback về body font
        fontFamily: rs.fontFamily || bodyFontFamily || 'Arial, sans-serif',
        textAlign: rs.textAlign as any,
        lineHeight: rs.lineHeight,
        borderStyle: rs.borderStyle as any,
        borderColor: rs.borderColor,
        borderTopWidth: rs.borderTopWidth,
        borderRightWidth: rs.borderRightWidth,
        borderBottomWidth: rs.borderBottomWidth,
        borderLeftWidth: rs.borderLeftWidth,
        borderRadius: rs.borderRadius,
        borderTopLeftRadius: rs.borderTopLeftRadius,
        borderTopRightRadius: rs.borderTopRightRadius,
        borderBottomLeftRadius: rs.borderBottomLeftRadius,
        borderBottomRightRadius: rs.borderBottomRightRadius,
        width: rs.width,
        height: rs.height,
        maxWidth: (rs as any).maxWidth,
        verticalAlign: rs.verticalAlign as any,
        display: rs.display,
        letterSpacing: rs.letterSpacing,
        fontStyle: rs.fontStyle as any,
        textDecoration: rs.textDecoration,
        textTransform: rs.textTransform as any,
        boxShadow: (rs as any).boxShadow,

        // Custom Block Properties
        checkIconColor: (rs as any).checkIconColor,
        checkIconSize: (rs as any).checkIconSize,
        checkIcon: (rs as any).checkIcon,
        checkTitleFont: (rs as any).checkTitleFont,
        checkTitleColor: (rs as any).checkTitleColor,
        checkTitleSize: (rs as any).checkTitleSize,
        checkItemSize: (rs as any).checkItemSize,
        checkDescColor: (rs as any).checkDescColor,
        checkIconMode: (rs as any).checkIconMode,
        checkCustomIconUrl: (rs as any).checkCustomIconUrl,
        showCheckListTitle: (rs as any).showCheckListTitle,
        showItemTitle: (rs as any).showItemTitle,
        showItemDescription: (rs as any).showItemDescription,
        checkIndividualIcons: (rs as any).checkIndividualIcons,
        checkIconVerticalAlign: (rs as any).checkIconVerticalAlign,
        checkItemColor: (rs as any).checkItemColor,
        checkIconBackgroundColor: (rs as any).checkIconBackgroundColor,
        playButtonColor: (rs as any).playButtonColor,
        timelineDotColor: (rs as any).timelineDotColor,
        timelineLineColor: (rs as any).timelineLineColor,
        timelineLineStyle: (rs as any).timelineLineStyle,
        timelineDotShape: (rs as any).timelineDotShape,
        starSize: (rs as any).starSize,
        starColor: (rs as any).starColor,
        overlayColor: (rs as any).overlayColor,
        overlayOpacity: (rs as any).overlayOpacity,
        iconColor: (rs as any).iconColor,
        iconBackgroundColor: (rs as any).iconBackgroundColor,
        iconSize: (rs as any).iconSize,
        iconMode: (rs as any).iconMode,
        gap: (rs as any).gap,
        contentBackgroundColor: (rs as any).contentBackgroundColor,
        targetDate: (rs as any).targetDate,
        labelColor: (rs as any).labelColor,
    } as any;
};

// Utility: Sanitize border-radius — accepts string | number | undefined
export const sanitizeRadius = (val: string | number | undefined): string => {
    if (val === undefined || val === null || val === '') return '0px';
    const str = String(val);
    // If it's a plain number (no unit), append px
    if (/^[\d.]+$/.test(str.trim())) return `${str.trim()}px`;
    // Handle multi-value like "10px 20px" or "10 20"
    const cleaned = str.replace(/px/g, '').trim();
    const values = cleaned.split(/\s+/).filter(v => v);
    return values.map(v => `${v}px`).join(' ');
};
