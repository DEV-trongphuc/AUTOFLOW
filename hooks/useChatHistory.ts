import { useQuery } from '@tanstack/react-query';
import { api } from '../services/storageAdapter';
import { Message, FileAttachment, ApiResponse } from '../types';


export const useChatHistory = (sessionId: string | undefined, botId: string | undefined, limit: number = 10, offset: number = 0, orgUserId?: string | number) => {
    return useQuery({
        queryKey: ['chatHistory', sessionId, botId, limit, offset, orgUserId],
        queryFn: async () => {
            if (!sessionId || !botId) return null;
            const orgParam = orgUserId ? `&org_user_id=${orgUserId}` : '';
            const res = await api.get<any>(`ai_org_chatbot?action=get_conversation_history&visitor_id=${sessionId}&property_id=${botId}&limit=${limit}&offset=${offset}${orgParam}`);
            if (res.success) {
                const loadedMessages: Message[] = (res.data || []).map((msg: any) => {
                    let attachments: FileAttachment[] = [];
                    try {
                        if (msg.metadata) {
                            const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                            if (meta.attachments) attachments = meta.attachments;
                        }
                    } catch (e) { }

                    return {
                        id: msg.id || 'msg_' + Date.now(),
                        role: msg.sender === 'visitor' ? 'user' : 'assistant',
                        content: msg.message,
                        timestamp: new Date(msg.created_at),
                        attachments: attachments
                    };
                });
                return {
                    messages: loadedMessages,
                    hasMore: res.has_more,
                    conversationId: res.conversation_id
                };
            }
            throw new Error('Failed to fetch chat history');
        },
        enabled: !!sessionId && !!botId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
