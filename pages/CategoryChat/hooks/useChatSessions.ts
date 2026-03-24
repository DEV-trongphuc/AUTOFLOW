import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { api } from '../../../services/storageAdapter';
import { ChatSession, ChatbotInfo } from '../types';
import { toast } from 'react-hot-toast';

export function useChatSessions(categoryId: string | undefined, chatbots: ChatbotInfo[]) {
    const [sessions, setSessions] = useState<Record<string, ChatSession[]>>({});
    const [searchTermSessions, setSearchTermSessions] = useState('');
    const [expandedBotId, setExpandedBotId] = useState<string | null>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await api.get<any>(`ai_org_chatbot?action=session_list&category_id=${categoryId}`);
            if (res.success && res.data) {
                const grouped = res.data.reduce((acc: any, s: any) => {
                    if (!acc[s.property_id]) acc[s.property_id] = [];
                    acc[s.property_id].push({
                        id: s.id,
                        title: s.title || 'Untitled Chat',
                        botId: s.property_id,
                        botName: s.bot_name || 'AI Assistant',
                        lastMessage: s.last_message,
                        updatedAt: s.updated_at
                    });
                    return acc;
                }, {});
                setSessions(grouped);
            }
        } catch (e) {
            console.error('Error fetching sessions', e);
        }
    }, [categoryId]);

    const recentSessions = useMemo(() => {
        const all = (Object.values(sessions).flat() as ChatSession[]).sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
        });
        if (!searchTermSessions) return all;
        const lowSearch = searchTermSessions.toLowerCase();
        return all.filter(s =>
            s.title.toLowerCase().includes(lowSearch) ||
            (s.botName || '').toLowerCase().includes(lowSearch)
        );
    }, [sessions, searchTermSessions]);

    const handleDeleteSession = useCallback(async (e: React.MouseEvent, botId: string, sessId: string, currentSessionId: string | undefined, navigate: any) => {
        e.stopPropagation();
        if (!window.confirm('Bạn chắc chắn muốn xóa cuộc trò chuyện này?')) return;

        // Optimistic delete: remove from UI immediately
        const prevSessions = sessions;
        setSessions(prev => ({
            ...prev,
            [botId]: (prev[botId] || []).filter(s => s.id !== sessId)
        }));

        if (currentSessionId === sessId) {
            navigate(`/ai-space/${categoryId}`);
        }

        try {
            const res = await api.post<any>('ai_org_chatbot', {
                action: 'delete_conversation',
                conversation_id: sessId
            });
            if (res.success) {
                toast.success('Xóa cuộc trò chuyện thành công');
            } else {
                // Rollback if API says failed
                setSessions(prevSessions);
                toast.error('Không thể xóa cuộc trò chuyện');
            }
        } catch (err) {
            // Rollback on network error
            setSessions(prevSessions);
            toast.error('Lỗi khi xóa cuộc trò chuyện');
        }
    }, [categoryId, sessions]);

    return {
        sessions,
        setSessions,
        searchTermSessions,
        setSearchTermSessions,
        expandedBotId,
        setExpandedBotId,
        recentSessions,
        fetchSessions,
        handleDeleteSession
    };
}
