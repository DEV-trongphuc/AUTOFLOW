import { useQuery } from '@tanstack/react-query';
import { api } from '../services/storageAdapter';
import { ChatbotInfo } from '../types';

export const useChatbots = (categoryId: string | undefined) => {
    return useQuery({
        queryKey: ['chatbots', categoryId],
        queryFn: async () => {
            if (!categoryId) return [];
            const res = await api.get<any>(`ai_chatbots?action=list&category_id=${categoryId}`);
            if (res.success) {
                return res.data.filter((bot: any) => bot.status === 'active' || bot.status === 1 || !bot.status) as ChatbotInfo[];
            }
            throw new Error('Failed to fetch chatbots');
        },
        enabled: !!categoryId,
    });
};
