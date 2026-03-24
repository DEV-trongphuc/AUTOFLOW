
import { Sparkles, Zap, Cpu } from 'lucide-react';

// Available Models - Gemini 2.5 Lineup
export const AI_MODELS = [
    { id: 'auto', name: 'Auto', icon: Sparkles, desc: 'Tự động chọn model tối ưu thông minh' },
    { id: 'gemini-2.5-flash-lite', name: 'Category Flash', icon: Zap, desc: 'Thế hệ mới, tốc độ cao, xử lý ảnh & văn bản cực tốt' },
    { id: 'gemini-2.5-pro', name: 'Category Pro', icon: Cpu, desc: 'Cao cấp nhất, phân tích sâu ảnh, video & hội thoại dài' },
    // Temporarily hidden - Gemini 3 models
    // { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: Zap, desc: 'Mới nhất (Preview), siêu tốc và thông minh vượt trội' },
    // { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', icon: Cpu, desc: 'Mạnh mẽ nhất thế giới (Preview), đa phương thức cực hạn' },
];

// Helper function to replace "Category" with actual organization name
export const getModelDisplayName = (modelName: string, categoryName: string) => {
    return modelName.replace('Category', categoryName || 'AI');
};

// Nano Banana Image Generation Configuration
export const IMAGE_PROVIDERS = [
    { id: 'gemini-2.5-flash-lite-image', name: '🍌 Nano Banana', desc: 'Tốc độ cực cao, hiệu suất tối ưu cho tác vụ lớn.', version: '2.5 Flash' },
    { id: 'gemini-3-pro-image-preview', name: '🍌 Nano Banana Pro', desc: 'Chất lượng chuyên nghiệp, hỗ trợ 4K & Google Search.', version: '3 Pro' },
];
