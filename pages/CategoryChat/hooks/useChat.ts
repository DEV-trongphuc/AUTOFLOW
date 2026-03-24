import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeech } from './useSpeech';
import { api } from '../../../services/storageAdapter';
import { Message, FileAttachment } from '../types';
import { toast } from 'react-hot-toast';

import { useChatPage } from '../../../contexts/ChatPageContext';
import { uploadFileToServer, EXT_MAP } from '../utils';

export function useChat(user: any) {
    const {
        activeBot,
        sessionId, setSessionId,
        messages, setMessages,
        input, setInput,
        loadingChat, setLoadingChat,
        attachments, setAttachments,
        workspaceDocs, setWorkspaceDocs,
        setIsDocWorkspaceOpen,
        setActiveDoc,
        setDocContent,
        remoteConvId, setRemoteConvId,
        selectedModel,
        isResearchMode,
        isKbOnlyMode,
        isImageGenMode,
        isCodeMode,
        isEditingImage, setIsEditingImage,
        abortControllerRef,
        autoTTS, imageProvider, imageStyle, imageSize,
        suggestedQuestions,
        selectedContextDocs, setSelectedContextDocs,
        selectedPersona,
        isCiteMode,
    } = useChatPage();

    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const { speakMessage } = useSpeech();

    // FIX #1: requestId guards — only latest request can commit state
    const requestIdRef = useRef(0);

    // FIX #3: loadingChatRef stays in sync with state for synchronous guard in handleSend
    const loadingChatRef = useRef(false);
    useEffect(() => {
        loadingChatRef.current = loadingChat;
    }, [loadingChat]);

    // FIX #4 (arch): workspaceDocsRef synced via useEffect — safe for concurrent mode
    const workspaceDocsRef = useRef(workspaceDocs);
    useEffect(() => {
        workspaceDocsRef.current = workspaceDocs;
    }, [workspaceDocs]);

    // FIX #8: mountedRef — prevents setState after component unmounts
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const handleAutoCaptureCode = useCallback(async (text: string, messageId?: string) => {
        if (!isCodeMode) return;

        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)(?:```|$)/g;
        let match;
        const foundBlocks: { name: string, content: string, type: string, index: number }[] = [];
        let blockIdx = 0;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            const lang = (match[1] || 'txt').toLowerCase();
            const content = match[2].trim();
            const currentIndex = blockIdx++;

            if (content.length < 20) continue;

            const ext = EXT_MAP[lang] || lang;
            const deterministicName = messageId ? `code_${messageId}_${currentIndex}.${ext}` : null;
            const name = deterministicName || `code_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.${ext}`;
            foundBlocks.push({ name, content, type: 'text/plain', index: currentIndex });
        }

        if (foundBlocks.length > 0) {
            for (const block of foundBlocks) {
                // FIX #3: Use functional setState to avoid stale closure duplicate detection
                setWorkspaceDocs(prev => {
                    const isDuplicate = prev.some(d =>
                        !d.previewUrl?.startsWith('virtual://') &&
                        ((block.name && d.name === block.name) || (d.name.startsWith('code_') && d.size === block.content.length))
                    );
                    if (isDuplicate) return prev;

                    const newDoc: FileAttachment = {
                        id: 'code_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        name: block.name,
                        type: 'text/plain',
                        size: block.content.length,
                        content: block.content,
                        previewUrl: 'virtual://' + block.name,
                    };
                    return [...prev, newDoc];
                });
            }
        }
    }, [isCodeMode, setWorkspaceDocs]);

    const sendChat = useCallback(async (message: string, currentAttachments: FileAttachment[] = [], existingAssistantId?: string, skipUserMessage: boolean = false) => {
        if (!activeBot) return;

        // FIX #1: Abort the *old* controller before creating a new one
        // Without this, the old request keeps running on the backend wastefully
        if (abortControllerRef?.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        if (abortControllerRef) {
            abortControllerRef.current = controller;
        }

        setLoadingChat(true);

        // FIX #6: Unique message ID prevents collision on fast submission
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const cleanTitle = message.replace(/["']/g, "").replace(/\n/g, " ").trim().substring(0, 45) || "New Conversation";
        const assistantId = existingAssistantId || 'msg_' + uniqueSuffix;

        // COLLECT PROJECT CONTEXT via ref snapshot (no closure on state)
        // FIX #4: Using ref avoids sendChat being re-created on every workspaceDocs change
        let workspaceContext = "";
        const currentDocs = workspaceDocsRef.current;
        if (currentDocs.length > 0) {
            workspaceContext = currentDocs
                .filter(d => ['js', 'ts', 'tsx', 'php', 'py', 'sql', 'html', 'css', 'json', 'txt', 'md', 'pdf', 'docx'].includes(d.name.split('.').pop()?.toLowerCase() || ''))
                .map(d => {
                    const content = (d.content || '(Binary or empty)').substring(0, 3000);
                    return `File: ${d.name}\nContent:\n${content}\n---`;
                })
                .join("\n\n");

            if (workspaceContext.length > 15000) {
                workspaceContext = workspaceContext.substring(0, 15000) + "\n... (Project context truncated for size)";
            }
        }

        const newUserMsg: Message = {
            id: 'msg_' + Date.now(),
            role: 'user',
            content: message,
            timestamp: new Date(),
            attachments: currentAttachments
        };

        const newAssistantMsg: Message = {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: new Date()
        };

        setMessages(prev => skipUserMessage ? [...prev, newAssistantMsg] : [...prev, newUserMsg, newAssistantMsg]);
        setInput('');
        setAttachments([]);

        // FIX #1: Capture request-ID for this invocation
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;

        try {
            // FIX #1: Pass AbortSignal so the network request is actually cancelled
            const data = await api.post<any>('ai_org_chatbot?stream=0', {
                message,
                visitor_id: sessionId,
                property_id: activeBot.id,
                user_id: user?.id,
                org_user_id: user?.id,
                title: cleanTitle,
                attachments: currentAttachments.map(a => ({
                    name: a.name,
                    type: a.type,
                    size: a.size,
                    previewUrl: a.previewUrl,
                    base64: a.base64
                })),
                workspace_context: workspaceContext,
                model_config: {
                    model: selectedModel === 'auto' ? 'gemini-2.5-flash-lite' : selectedModel,
                    code_mode: isCodeMode,
                    is_research: isResearchMode,
                    kb_only: isKbOnlyMode,
                    is_image_gen: isImageGenMode,
                    image_provider: imageProvider,
                    image_style: imageStyle,
                    image_size: imageSize,
                    persona_id: selectedPersona?.id || 'default',
                    persona_prefix: selectedPersona?.systemPromptPrefix || '',
                    cite_mode: isCiteMode,
                    ...(isCiteMode && {
                        cite_instruction: 'Khi trả lời, chỉ trích dẫn tài liệu nếu thông tin đó thực sự đến từ tài liệu trong knowledge base. Chỉ dùng đường link tài liệu có trong dữ liệu đã cung cấp, không tự tạo hoặc gợi ý link bên ngoài. Không bắt buộc mỗi câu phải có trích dẫn — chỉ trích dẫn khi thực sự cần thiết và có nguồn gốc rõ ràng.'
                    })
                }
            }, { signal: controller.signal });

            if (data.success && data.data) {
                // FIX #1: Bail if a newer request has taken over
                if (requestId !== requestIdRef.current || !mountedRef.current) return;

                const result = data.data;
                const msgContent = result.message || '';

                let extractedActions: string[] = result.quick_actions || [];
                if (extractedActions.length === 0) {
                    const actionMatch = msgContent.match(/\[(?:ACTIONS|ACTION|BUTTONS|OPTIONS):?([\s\S]*?)\]/iu);
                    if (actionMatch && actionMatch[1]) {
                        extractedActions = actionMatch[1].split('|').map((a: string) => a.trim()).filter((a: string) => a.length > 0);
                    }
                }

                // FIX #2: Guard inside the setter — atomic, impossible for stale closure to sneak through
                setMessages(prev => {
                    if (requestId !== requestIdRef.current || !mountedRef.current) return prev;
                    return prev.map(m =>
                        m.id === assistantId ? {
                            ...m,
                            content: msgContent,
                            quickActions: extractedActions.length > 0 ? extractedActions : m.quickActions
                        } : m
                    );
                });

                if (result.conversation_id) setRemoteConvId(result.conversation_id);

                // Code block capture (now that response is complete)
                if (isCodeMode && msgContent.includes('```')) {
                    handleAutoCaptureCode(msgContent, assistantId);
                }

                // TTS if enabled
                if (autoTTS) {
                    speakMessage(msgContent);
                }
            } else if (data.message || data.error) {
                throw new Error(data.message || data.error);
            }

        } catch (e: any) {
            // FIX #1+#8: Skip error handling for stale/aborted requests or unmounted components
            if (requestId !== requestIdRef.current || !mountedRef.current) return;
            // AbortError is expected when user sends a new message — not a real error
            if (e?.name === 'AbortError') return;
            console.error(e);
            toast.error(e.message || 'Lỗi xử lý');
            // FIX #2: Unique error message ID prevents key collision on repeated failures
            const errId = 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
            setMessages(prev => [...prev, { id: errId, role: 'assistant', content: '⚠️ Lỗi kết nối AI server: ' + (e.message || ''), timestamp: new Date() }]);
        } finally {
            // FIX #2: Only reset loading state for the *current* request
            // Prevents request A's finally from killing request B's loading indicator
            if (requestId === requestIdRef.current && mountedRef.current) {
                setLoadingChat(false);
                setIsGeneratingImage(false);
            }
        }
    }, [activeBot, user, sessionId, selectedModel, isCodeMode, isResearchMode, isKbOnlyMode, isImageGenMode, imageProvider, imageStyle, imageSize, autoTTS, speakMessage, handleAutoCaptureCode, setMessages, setLoadingChat, setInput, setAttachments, setRemoteConvId, isCiteMode, selectedPersona]);

    const handleSend = useCallback(async () => {
        // FIX #3: Use ref for synchronous guard — prevents double-send on fast click
        // (loadingChat state may be stale due to React batching)
        if ((!input.trim() && attachments.length === 0) || loadingChatRef.current || !activeBot) return;

        const msgText = input.trim();
        const initialAtts = [...attachments];
        const docs = [...selectedContextDocs];

        if (docs.length > 0) {
            docs.forEach(doc => {
                if (!initialAtts.some(a => a.name === doc.name && a.size === doc.size)) {
                    initialAtts.push(doc);
                }
            });
        }

        const isEditing = isEditingImage;
        setInput('');
        setAttachments([]);
        setSelectedContextDocs([]);
        setIsEditingImage(false);
        // FIX #1: Removed setLoadingChat(true) here — sendChat is the single source of truth

        // FIX #6: Unique user message ID
        const userMessageId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const initialUserMessage: Message = {
            id: userMessageId,
            role: 'user',
            content: msgText,
            timestamp: new Date(),
            attachments: initialAtts
        };
        setMessages(prev => [...prev, initialUserMessage]);

        // FIX #5: Upload timeout — prevents loadingChat from hanging if uploadFileToServer stalls
        const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
            const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), ms));
            return Promise.race([promise, timeout]) as Promise<T | null>;
        };

        // FIX #4: Parallel uploads with timeout safety
        const uploadResults = await Promise.all(
            initialAtts.map(async (att) => {
                const publicUrl = await withTimeout(uploadFileToServer(att), 30000);
                if (publicUrl) {
                    // Fire-and-forget make_global, non-blocking
                    api.post('ai_org_chatbot', {
                        action: 'make_global',
                        url: publicUrl,
                        name: att.name,
                        type: att.type,
                        size: att.size,
                        property_id: activeBot?.id,
                        conversation_id: remoteConvId || sessionId,
                        source: 'chat_user'
                    }).catch(console.error);
                    return { ...att, previewUrl: publicUrl, base64: undefined };
                }
                return att;
            })
        );
        const finalAtts = uploadResults;

        setMessages(prev => prev.map(m => m.id === userMessageId ? { ...m, attachments: finalAtts } : m));
        const finalMsgText = isEditing ? `Edit this image: ${msgText}` : msgText;
        sendChat(finalMsgText, finalAtts, undefined, true);
        // FIX #2: Removed uploadFileToServer from deps — it's a static import, never changes
    }, [input, attachments, selectedContextDocs, loadingChat, activeBot, isEditingImage, setInput, setAttachments, setSelectedContextDocs, setIsEditingImage, setMessages, remoteConvId, sessionId, sendChat]);

    const regenerateResponse = useCallback(() => {
        let lastUserMsgIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMsgIndex = i;
                break;
            }
        }
        if (lastUserMsgIndex !== -1) {
            const lastUserMsg = messages[lastUserMsgIndex];
            // FIX #6: Use find() instead of index+1 assumption — safer when messages are out-of-order
            const assistantMsg = messages.find(
                (m, idx) => idx > lastUserMsgIndex && m.role === 'assistant'
            );
            const assistantId = assistantMsg?.id;

            if (assistantId) {
                setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
            }

            sendChat(lastUserMsg.content, lastUserMsg.attachments || [], assistantId, true);
        }
    }, [messages, setMessages, sendChat]);

    const reuseMessage = useCallback((content: string, reuseAttachments?: FileAttachment[]) => {
        setInput(content);
        if (reuseAttachments) setAttachments(reuseAttachments);
    }, [setInput, setAttachments]);

    return {
        messages,
        setMessages,
        input,
        setInput,
        loadingChat,
        setLoadingChat,
        sessionId,
        setSessionId,
        remoteConvId,
        setRemoteConvId,
        attachments,
        setAttachments,
        isGeneratingImage,
        suggestedQuestions,
        isEditingImage,
        setIsEditingImage,
        handleSend,
        regenerateResponse,
        reuseMessage,
        sendChat
    };
}
