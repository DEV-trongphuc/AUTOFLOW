// components/templates/EmailEditor/utils/styleUtils.ts
import { EmailBlockStyle } from '../../../../types';

/**
 * Sanitizes border-radius to ensure consistent pixel formatting.
 * Handles single values "10px" and multiple values "10px 20px 30px 40px".
 */
export const sanitizeRadius = (val: string | undefined): string => {
    if (!val) return '';
    const cleaned = val.replace(/px/g, '').trim();
    if (!cleaned) return '';
    const values = cleaned.split(/\s+/).filter(v => v);
    return values.map(v => `${v}px`).join(' ');
};

/**
 * Normalizes numeric strings or numbers into a pixel string.
 */
export const toPx = (val: string | number | undefined, defaultVal = '0px'): string => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return `${val}px`;
    const sVal = String(val).trim();
    if (sVal === 'auto' || sVal.endsWith('%') || sVal.endsWith('px')) return sVal;
    return `${sVal}px`;
};

/**
 * Extracts a numeric value from a pixel string.
 */
export const fromPx = (val: string | undefined): number => {
    if (!val) return 0;
    return parseInt(val.replace('px', '')) || 0;
};

/**
 * Generates a CSS style object or string based on EmailBlockStyle.
 * This is the "Source of Truth" for padding/margin rendering.
 */
export const getPaddingStyle = (s: Partial<EmailBlockStyle>) => {
    return {
        paddingTop: toPx(s.paddingTop),
        paddingRight: toPx(s.paddingRight),
        paddingBottom: toPx(s.paddingBottom),
        paddingLeft: toPx(s.paddingLeft),
    };
};

export const getMarginStyle = (s: Partial<EmailBlockStyle>) => {
    return {
        marginTop: toPx(s.marginTop),
        marginRight: toPx(s.marginRight),
        marginBottom: toPx(s.marginBottom),
        marginLeft: toPx(s.marginLeft),
    };
};
