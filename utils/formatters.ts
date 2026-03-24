
export const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const hexToHSL = (hex: string) => {
    let r = 0, g = 0, b = 0;
    const hx = hex.startsWith('#') ? hex : '#' + hex;
    if (hx.length === 4) {
        r = parseInt("0x" + hx[1] + hx[1]) / 255;
        g = parseInt("0x" + hx[2] + hx[2]) / 255;
        b = parseInt("0x" + hx[3] + hx[3]) / 255;
    } else if (hx.length === 7) {
        r = parseInt("0x" + hx[1] + hx[2]) / 255;
        g = parseInt("0x" + hx[3] + hx[4]) / 255;
        b = parseInt("0x" + hx[5] + hx[6]) / 255;
    }
    let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);
    return { h, s, l };
};

export const EXT_MAP: Record<string, string> = {
    'javascript': 'js', 'typescript': 'ts', 'python': 'py', 'react': 'tsx',
    'php': 'php', 'html': 'html', 'css': 'css', 'sql': 'sql', 'json': 'json',
    'typescriptreact': 'tsx', 'javascriptreact': 'jsx', 'markdown': 'md',
    'sh': 'sh', 'bash': 'sh',
    'js': 'js', 'ts': 'ts', 'py': 'py', 'java': 'java', 'c++': 'cpp', 'cpp': 'cpp',
    'c#': 'cs', 'cs': 'cs', 'c': 'c', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
    'md': 'md', 'shell': 'sh', 'powershell': 'ps1', 'ps1': 'ps1',
    'ruby': 'rb', 'rb': 'rb', 'go': 'go', 'rust': 'rs', 'rs': 'rs',
    'swift': 'swift', 'kotlin': 'kt', 'kt': 'kt', 'scala': 'scala', 'r': 'r',
    'perl': 'pl', 'pl': 'pl', 'lua': 'lua', 'dart': 'dart', 'objective-c': 'm',
    'visual basic': 'vb', 'vb': 'vb'
};

/**
 * Clean up malformed URLs that might contain Markdown artifacts
 * e.g. "https://domain.com/file.pdf](https://domain.com/file.pdf" -> "https://domain.com/file.pdf"
 */
export const sanitizeUrl = (url?: string): string => {
    if (!url) return '';
    // If it's a base64 or virtual URL, leave it alone
    if (url.startsWith('data:') || url.startsWith('virtual://') || url.startsWith('blob:')) return url;

    // Remove any trailing markdown garbage like "](https://...)" or ")"
    let clean = url;
    const mdSeparator = '](';
    if (clean.includes(mdSeparator)) {
        clean = clean.split(mdSeparator)[0];
    }
    // Remove trailing ')' or ']' if it looks like a markdown closing
    clean = clean.replace(/[\]\)]+$/, '');

    return clean;
};
