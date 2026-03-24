import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../../services/storageAdapter';
import { FileAttachment, ChatbotInfo } from '../types';
import { toast } from 'react-hot-toast';

const CACHE_TTL = 30000; // 30 seconds

export function useWorkspace(currentUser: any, activeBot: ChatbotInfo | null, sessionId: string | undefined) {
    const [workspaceDocs, setWorkspaceDocs] = useState<FileAttachment[]>([]);
    const [globalDbAssets, setGlobalDbAssets] = useState<FileAttachment[]>([]);
    const [globalTotal, setGlobalTotal] = useState(0);
    const [isLoadingGlobalAssets, setIsLoadingGlobalAssets] = useState(false);
    const workspaceCache = useRef<Map<string, { data: FileAttachment[], timestamp: number }>>(new Map());

    const fetchWorkspaceDocs = useCallback(async (convId: string, forceRefresh = false) => {
        if (!currentUser) return;

        // Check cache first
        const cached = workspaceCache.current.get(convId);
        if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setWorkspaceDocs(cached.data);
            return;
        }

        try {
            // Fetch conversation workspace docs + global training docs in parallel
            const [wsRes, trainingRes] = await Promise.all([
                api.get<any>(`ai_org_chatbot?action=workspace_list&conversation_id=${convId}&property_id=${activeBot?.id}`),
                activeBot?.id
                    ? api.get<any>(`ai_training?action=list_docs&property_id=${activeBot.id}`)
                    : Promise.resolve({ success: false, data: [] } as any)
            ]);

            let remoteDocs: FileAttachment[] = [];

            if (wsRes.success && wsRes.data) {
                remoteDocs = wsRes.data.map((d: any) => ({
                    id: d.id,
                    name: d.file_name,
                    type: d.file_type,
                    size: d.file_size,
                    previewUrl: d.file_url,
                    conversationId: d.conversation_id,
                    propertyId: d.property_id,
                    source: d.source || 'workspace',
                    createdAt: d.created_at
                }));
            }

            // Merge global training docs (is_global_workspace = 1)
            if (trainingRes?.success && trainingRes?.data) {
                const globalTrainingDocs: FileAttachment[] = (trainingRes.data as any[])
                    .filter((d: any) => Number(d.is_global_workspace) === 1 && d.source_type === 'upload')
                    .map((d: any) => {
                        let fileUrl = '';
                        try {
                            const meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {});
                            fileUrl = meta.file_url || '';
                        } catch (e) { }
                        return {
                            id: 'training_' + d.id,
                            name: d.name,
                            type: 'application/pdf',
                            size: d.content_size || 0,
                            previewUrl: fileUrl,
                            source: 'global_training',
                            isGlobal: true,
                            createdAt: d.created_at
                        } as FileAttachment;
                    });

                // Merge without duplicates
                const existingNames = new Set(remoteDocs.map(d => d.name));
                globalTrainingDocs.forEach(doc => {
                    if (!existingNames.has(doc.name)) {
                        remoteDocs.unshift(doc); // Put global docs at top
                        existingNames.add(doc.name);
                    }
                });
            }

            // Cache the result
            workspaceCache.current.set(convId, {
                data: remoteDocs,
                timestamp: Date.now()
            });

            setWorkspaceDocs(remoteDocs);
        } catch (e) {
            console.error('Error fetching workspace docs', e);
        }
    }, [activeBot?.id, currentUser]);

    const fetchGlobalAssets = useCallback(async (page = 1, search = '', source = 'all', tab = 'files') => {
        if (!currentUser) return;
        setIsLoadingGlobalAssets(true);
        try {
            const res = await api.get<any>(`ai_org_chatbot?action=workspace_list_global&property_id=${activeBot?.id || ''}&page=${page}&search=${search}&source=${source}&type=${tab}`);
            if (res.success && res.data) {
                const mapped = res.data.map((d: any) => ({
                    id: d.id,
                    name: d.file_name,
                    type: d.file_type,
                    size: d.file_size,
                    previewUrl: d.file_url,
                    conversationId: d.conversation_id,
                    conversationTitle: d.conversation_title,
                    propertyId: d.property_id,
                    source: d.source || 'workspace',
                    createdAt: d.created_at
                }));
                setGlobalDbAssets(mapped);
                setGlobalTotal(res.total || mapped.length);
            }
        } catch (err) {
            console.error('Error fetching global assets:', err);
        } finally {
            setIsLoadingGlobalAssets(false);
        }
    }, [activeBot?.id, currentUser]);

    const handleDeleteFromDb = useCallback(async (ids: number[]) => {
        const tid = toast.loading('Đang xóa...');
        try {
            const res = await api.post<any>('ai_org_chatbot', {
                action: 'workspace_delete_batch',
                ids: ids
            });
            if (res.success) {
                toast.success('Đã xóa tệp khỏi cơ sở dữ liệu', { id: tid });
                fetchGlobalAssets();
                if (sessionId) fetchWorkspaceDocs(sessionId, true);
            } else {
                toast.error('Lỗi khi xóa tệp', { id: tid });
            }
        } catch (err) {
            toast.error('Lỗi khi xóa tệp');
        }
    }, [fetchGlobalAssets, fetchWorkspaceDocs, sessionId]);

    return {
        workspaceDocs,
        setWorkspaceDocs,
        globalDbAssets,
        globalTotal,
        isLoadingGlobalAssets,
        fetchWorkspaceDocs,
        fetchGlobalAssets,
        handleDeleteFromDb
    };
}
