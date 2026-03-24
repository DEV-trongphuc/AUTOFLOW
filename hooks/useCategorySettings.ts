import { useQuery } from '@tanstack/react-query';
import { api } from '../services/storageAdapter';

export const useCategorySettings = (categoryId: string | undefined) => {
    return useQuery({
        queryKey: ['categorySettings', categoryId],
        queryFn: async () => {
            if (!categoryId) return null;
            const res = await api.get<any>(`ai_training?action=get_settings&property_id=${categoryId}`);
            if (res.success) return res.data;
            throw new Error('Failed to fetch category settings');
        },
        enabled: !!categoryId,
    });
};
