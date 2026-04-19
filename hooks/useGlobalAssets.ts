import { useQuery } from '@tanstack/react-query';
import { FileAttachment } from '../types';
import { useChatPage } from '../contexts/ChatPageContext';
import { api } from '../services/storageAdapter';

interface GlobalAssetsParams {
    chatbotId?: string;
    categoryId?: string;
    type: 'files' | 'images';
    source: string;
    search: string;
    page: number;
    pageSize: number;
    enabled: boolean;
}

const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const useGlobalAssets = ({
    chatbotId,
    categoryId,
    type,
    source,
    search,
    page,
    pageSize,
    enabled
}: GlobalAssetsParams) => {
    const { orgUser } = useChatPage();

    return useQuery({
        queryKey: ['globalAssets', chatbotId, categoryId, type, source, search, page, orgUser?.id],
        queryFn: async () => {
            const typeParam = type === 'files' ? 'document' : 'image';
            const offset = (page - 1) * pageSize;

            const res = await api.get<any>(`get_global_assets.php?action=list&property_id=${chatbotId || ''}&group_id=${categoryId || ''}&type=${typeParam}&source=${source}&search=${search}&limit=${pageSize}&offset=${offset}${orgUser?.id ? `&org_user_id=${orgUser.id}` : ''}`);

            if (res.success && Array.isArray(res.data)) {
                const mapped: FileAttachment[] = res.data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    type: item.type || 'application/octet-stream',
                    size: item.size,
                    previewUrl: item.url,
                    source: item.source,
                    createdAt: item.created_at,
                    conversationId: item.conversation_id,
                    conversationTitle: item.conversation_title,
                    propertyId: item.property_id
                }));

                // Deduplicate
                const uniqueMap = new Map();
                mapped.forEach(item => {
                    const uniqueKey = item.id || `${item.name}_${item.conversationId || 'no-conv'}`;
                    uniqueMap.set(uniqueKey, item);
                });

                return {
                    assets: Array.from(uniqueMap.values()) as FileAttachment[],
                    total: res.total || 0
                };
            }
            throw new Error('Failed to fetch global assets');
        },
        enabled: enabled,
        staleTime: 1000 * 60, // 1 minute
    });
};
