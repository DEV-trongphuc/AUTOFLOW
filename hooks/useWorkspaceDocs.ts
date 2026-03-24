import { useQuery } from '@tanstack/react-query';
import { api } from '../services/storageAdapter';
import { FileAttachment } from '../types';

export const useWorkspaceDocs = (conversationId: string | null, propertyId: string | undefined) => {
    return useQuery({
        queryKey: ['workspaceDocs', conversationId, propertyId],
        queryFn: async () => {
            if (!conversationId) return [];
            const res = await api.get<any>(`ai_org_chatbot?action=get_workspace_docs&conversation_id=${conversationId}&property_id=${propertyId || ''}`);
            if (res.success) {
                return (res.data || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    type: item.type || 'application/octet-stream',
                    size: item.size,
                    previewUrl: item.url,
                    source: 'workspace',
                    conversationId: conversationId,
                    propertyId: propertyId
                })) as FileAttachment[];
            }
            throw new Error('Failed to fetch workspace docs');
        },
        enabled: !!conversationId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
