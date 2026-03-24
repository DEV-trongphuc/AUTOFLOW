import { Sparkles, Zap, Cpu } from 'lucide-react';
import { api } from '../../services/storageAdapter';
import { FileAttachment } from './types';

export const uploadFileToServer = async (file: FileAttachment): Promise<string | null> => {
    try {
        const res = await api.post<any>('ai_org_chatbot', {
            action: 'file_attachment',
            name: file.name,
            type: file.type,
            base64: file.base64
        }) as any;
        return res.success ? res.previewUrl : null;
    } catch (e) {
        console.error('File upload failed', e);
        return null;
    }
};

export const EXT_MAP: Record<string, string> = {
    'javascript': 'js', 'typescript': 'ts', 'python': 'py', 'react': 'tsx',
    'php': 'php', 'html': 'html', 'css': 'css', 'sql': 'sql', 'json': 'json',
    'typescriptreact': 'tsx', 'javascriptreact': 'jsx', 'markdown': 'md',
    'sh': 'sh', 'bash': 'sh'
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

export const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = 2;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const AI_MODELS = [
    { id: 'auto', name: 'Auto (2.5 Flash)', icon: Sparkles, desc: 'Tự động chọn model tối ưu - Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash', icon: Zap, desc: 'Thế hệ mới, tốc độ cao, xử lý ảnh & văn bản cực tốt' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', icon: Cpu, desc: 'Cao cấp nhất, phân tích sâu ảnh, video & hội thoại dài' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: Zap, desc: 'Mới nhất (Preview), siêu tốc và thông minh vượt trội' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', icon: Cpu, desc: 'Mạnh mẽ nhất thế giới (Preview), đa phương thức cực hạn' },
];

export const IMAGE_PROVIDERS = [
    { id: 'gemini-2.5-flash-lite-image', name: '🍌 Nano Banana', desc: 'Tốc độ cực cao, hiệu suất tối ưu cho tác vụ lớn.', version: '2.5 Flash' },
    { id: 'gemini-3-pro-image-preview', name: '🍌 Nano Banana Pro', desc: 'Chất lượng chuyên nghiệp, hỗ trợ 4K & Google Search.', version: '3 Pro' },
];

export const IMAGE_STYLES = [
    { id: 'professional', name: 'Professional', prompt: 'professional business style, clean, modern, corporate', preview: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'artistic', name: 'Artistic', prompt: 'high-end artistic photography, cinematic lighting, masterpiece', preview: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: '3d-render', name: '3D Render', prompt: 'hyper-realistic 3D render, PBR materials, octane render, 8k', preview: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist design, negative space, clean composition', preview: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'infographic', name: 'Infographic', prompt: 'clean infographic style, data visualization, flat design', preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'sketch', name: 'Sketch', prompt: 'detailed pencil sketch, hand-drawn, artistic charcoal', preview: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk aesthetic, neon lights, futuristic city, night', preview: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'isometric', name: 'Isometric', prompt: 'isometric 3D view, miniature world, clean lighting', preview: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=300&h=300&auto=format&fit=crop' },
];

export const IMAGE_SIZES = [
    { id: 'auto', name: 'Freesize (Auto)', width: 0, height: 0, ratio: 'Auto' },
    { id: '1K', name: '1K Standard', width: 1024, height: 1024, ratio: '1:1' },
    { id: '2K', name: '2K High Res', width: 2048, height: 2048, ratio: '1:1' },
    { id: '4K', name: '4K Ultra HD', width: 4096, height: 4096, ratio: '1:1' },
    { id: 'wide', name: 'Wide 16:9', width: 1376, height: 768, ratio: '16:9' },
    { id: 'tall', name: 'Portrait 9:16', width: 768, height: 1376, ratio: '9:16' },
    { id: 'cinema', name: 'Cinematic 21:9', width: 1584, height: 672, ratio: '21:9' },
];

export const DIAGRAM_TEMPLATES = [
    { id: 'flowchart', name: 'Flowchart', icon: '📊', prompt: 'Create a professional flowchart diagram, clean box and arrows' },
    { id: 'mindmap', name: 'Mind Map', icon: '🧠', prompt: 'Create a vibrant mind map diagram with branching ideas' },
    { id: 'orgchart', name: 'Org Chart', icon: '🏢', prompt: 'Create a corporate organizational hierarchy chart' },
    { id: 'isometric', name: 'Isometric View', icon: '📐', prompt: 'Create a 3D isometric representation of ' },
    { id: 'mockup', name: 'UX Mockup', icon: '📦', prompt: 'Create a high-fidelity product UI mockup for ' },
    { id: 'infographic', name: 'Infographic', icon: '📈', prompt: 'Create a detailed data visualization infographic about ' },
];

export const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
};
