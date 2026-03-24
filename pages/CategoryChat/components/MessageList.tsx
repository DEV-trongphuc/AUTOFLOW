import * as React from 'react';
import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
    Globe, FileText, Loader2, ImageIcon, Sparkles, Undo, Copy, Volume2,
    StopCircle, RefreshCw, FileCode, Bot, Brain
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message, FileAttachment, ChatbotInfo } from '../../../types';
import MemoizedContent from './MemoizedContent';

interface MessageListProps {
    messages: Message[];
    activeBot: ChatbotInfo | null;
    loadingChat: boolean;
    workspaceDocs: FileAttachment[];
    openTabNames: string[];
    setWorkspaceDocs: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    setOpenTabNames: React.Dispatch<React.SetStateAction<string[]>>;
    setActiveDoc: (doc: FileAttachment | null) => void;
    setIsDocWorkspaceOpen: (open: boolean) => void;
    renderMarkdown: (text: string, messageId?: string) => any;
    isCodeMode: boolean;
    isImageGenMode: boolean;
    copyToClipboard: (text: string) => void;
    speakMessage: (text: string, id: string) => void;
    isSpeaking: string | boolean;
    regenerateResponse: () => void;
    reuseMessage: (content: string, attachments?: FileAttachment[]) => void;
    setInput: (text: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    attachments: FileAttachment[];
    onPreviewImage: (url: string) => void;
    onMakeGlobal: (file: FileAttachment) => void;
    suggestedQuestions?: string[];
    isResearchMode?: boolean;
    setIsResearchMode?: (val: boolean) => void;
    isKbOnlyMode?: boolean;
    setIsKbOnlyMode?: (val: boolean) => void;
    setIsCodeMode?: (val: boolean) => void;
    setIsImageGenMode?: (val: boolean) => void;
    setIsImageSettingsOpen?: (val: boolean) => void;
    isDarkTheme?: boolean;
    isMobile?: boolean;
    selectedModel?: string;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
    canLoadMore?: boolean;
    chatSearchTerm?: string;
    isGeneratingImage?: boolean;
    isCiteMode?: boolean;
}

const MessageList = React.memo(({
    messages,
    activeBot,
    loadingChat,
    workspaceDocs,
    openTabNames,
    setWorkspaceDocs,
    setOpenTabNames,
    setActiveDoc,
    setIsDocWorkspaceOpen,
    renderMarkdown,
    isCodeMode,
    isImageGenMode,
    copyToClipboard,
    speakMessage,
    isSpeaking,
    regenerateResponse,
    reuseMessage,
    setInput,
    messagesEndRef,
    attachments,
    onPreviewImage,
    onMakeGlobal,
    suggestedQuestions = [],
    isResearchMode = false,
    setIsResearchMode = () => { },
    isKbOnlyMode = false,
    setIsKbOnlyMode = () => { },
    setIsCodeMode = () => { },
    setIsImageGenMode = () => { },
    setIsImageSettingsOpen = () => { },
    isDarkTheme = false,
    isMobile = false,
    selectedModel,
    onLoadMore,
    isLoadingMore,
    canLoadMore,
    chatSearchTerm,
    isGeneratingImage = false,
    isCiteMode = false
}: MessageListProps) => {
    const isExpertMode = selectedModel?.toLowerCase().includes('pro') || selectedModel?.toLowerCase().includes('thinking');
    const parentRef = useRef<HTMLDivElement>(null);
    const isInitialLoadRef = useRef(true);
    const userHasScrolledUp = useRef(false); // True when user manually scrolls up
    const [isScrollReady, setIsScrollReady] = useState(false);

    const displayItems = useMemo(() => {
        const items: any[] = [];
        let lastDate: string | null = null;

        // FIX #1: Avoid mutating 'now' when computing yesterdayStr
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const todayStr = now.toLocaleDateString('vi-VN');
        const yesterdayStr = yesterday.toLocaleDateString('vi-VN');

        messages.forEach((m: Message, idx: number) => {
            const date = m.timestamp ? new Date(m.timestamp) : new Date();
            const dateStr = date.toLocaleDateString('vi-VN');

            if (dateStr !== lastDate) {
                let label = dateStr;
                if (dateStr === todayStr) label = "Hôm nay";
                else if (dateStr === yesterdayStr) label = "Hôm qua";

                items.push({ type: 'separator', label, id: `sep-${dateStr}-${idx}` });
                lastDate = dateStr;
            }
            items.push({ type: 'message', data: m, index: idx });
        });
        return items;
    }, [messages]);

    const rowVirtualizer = useVirtualizer({
        count: displayItems.length,
        getScrollElement: () => parentRef.current,
        // FIX #3: Line-count formula gives far more accurate estimates, reducing virtualizer jump
        // Assumes ~60 chars/line at 18px line height, 120px base for padding/avatar/name
        estimateSize: (index) => {
            const item = displayItems[index];
            if (item?.type === 'separator') return 60;
            if (item?.data?.role === 'assistant') {
                const len = item.data.content?.length || 0;
                if (len === 0) return 340; // skeleton placeholder (12 lines + typing indicator)
                const estimatedLines = Math.ceil(len / 60);
                return Math.min(2400, 120 + estimatedLines * 18);
            }
            return 120; // user messages
        },
        overscan: 5,
    });

    // Removed redundant MutationObserver and measurement useEffects to prevent conflict
    // The items already have ref={rowVirtualizer.measureElement} which handles measurement

    // FIX #1: Single unified scroll listener — eliminates race condition between
    // the two previous separate listeners that could conflict on userHasScrolledUp
    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;

        let lastScrollTop = el.scrollTop;
        let loadMoreTimer: any;

        const handleScroll = () => {
            const current = el.scrollTop;

            // --- Detect scroll direction (covers ALL input types: wheel, touch, keyboard) ---
            if (current < lastScrollTop) {
                userHasScrolledUp.current = true;
            }

            // --- Reset flag when scrolled back to bottom ---
            const isAtBottom = el.scrollHeight - current - el.clientHeight < 100;
            if (isAtBottom) userHasScrolledUp.current = false;

            // --- Load more (debounced, guarded) ---
            if (!loadingChat && !isInitialLoadRef.current && !isLoadingMore) {
                if (current <= 5 && onLoadMore && canLoadMore) {
                    clearTimeout(loadMoreTimer);
                    loadMoreTimer = setTimeout(() => {
                        if (el.scrollTop <= 5 && !loadingChat && !isLoadingMore) {
                            onLoadMore();
                        }
                    }, 200);
                }
            }

            lastScrollTop = current;
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            el.removeEventListener('scroll', handleScroll);
            clearTimeout(loadMoreTimer);
        };
    }, [onLoadMore, isLoadingMore, canLoadMore, loadingChat]);

    // Reset initial-load flag when switching bots
    useEffect(() => {
        isInitialLoadRef.current = true;
        setIsScrollReady(false);
    }, [activeBot?.id]);


    // Absolute Authoritative Scroll Controller
    useLayoutEffect(() => {
        const el = parentRef.current;
        if (!el || messages.length === 0 || displayItems.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        const isNewUserMessage = lastMsg?.role === 'user';
        // Skeleton just appeared = assistant message with empty content
        const isNewSkeleton = lastMsg?.role === 'assistant' && lastMsg?.content === '';

        if (isNewUserMessage) {
            userHasScrolledUp.current = false;
        }

        const snapToBottom = (force = false) => {
            if (!el) return;
            if (userHasScrolledUp.current && !force) return;
            el.scrollTop = el.scrollHeight;
        };

        let frameId: number;
        let interval: any;
        const startTime = performance.now();

        if (isNewUserMessage || isNewSkeleton) {
            // KEY FIX: virtualizer hasn't rendered the new row yet when this runs.
            // scrollToIndex forces it to mount the last item so scrollHeight expands,
            // then we finalize with el.scrollTop in the next frame.
            rowVirtualizer.scrollToIndex(displayItems.length - 1, { align: 'end', behavior: 'auto' });

            frameId = requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
                // Lock for 600ms to cover skeleton's initial size measurement
                const lockScroll = (now: number) => {
                    snapToBottom(false);
                    if (now - startTime < 600) {
                        frameId = requestAnimationFrame(lockScroll);
                    }
                };
                frameId = requestAnimationFrame(lockScroll);
            });
        } else {
            snapToBottom(false);
        }

        // Periodic sticky-scroll during AI generation
        if (loadingChat) {
            interval = setInterval(() => snapToBottom(false), 300);
        }

        return () => {
            cancelAnimationFrame(frameId);
            if (interval) clearInterval(interval);
            if (isInitialLoadRef.current) {
                setTimeout(() => {
                    setIsScrollReady(true);
                    isInitialLoadRef.current = false;
                }, 100);
            }
        };
    }, [messages.length, displayItems.length, loadingChat, rowVirtualizer]);

    const renderEmptyState = () => {
        const modes = [
            {
                id: 'standard',
                title: 'Trò chuyện Chuẩn',
                desc: 'Hội thoại thông minh, đa năng và nhanh chóng.',
                icon: <Sparkles className="w-5 h-5 text-brand" />,
                active: !isCodeMode && !isImageGenMode && !isResearchMode && !isKbOnlyMode,
                onClick: () => {
                    setIsCodeMode(false);
                    setIsImageGenMode(false);
                    setIsResearchMode(false);
                    setIsKbOnlyMode(false);
                }
            },
            {
                id: 'research',
                title: 'Chế độ Nghiên cứu',
                desc: 'Truy cập Internet thời gian thực để cập nhật tin tức mới nhất.',
                icon: <Globe className="w-5 h-5 text-brand" />,
                active: isResearchMode,
                onClick: () => {
                    setIsResearchMode(true);
                    setIsCodeMode(false);
                    setIsImageGenMode(false);
                }
            },
            {
                id: 'code',
                title: 'Chế độ Code',
                desc: 'Tự động trích xuất và lưu mã nguồn vào Workspace của bạn.',
                icon: <FileCode className="w-5 h-5 text-brand" />,
                active: isCodeMode,
                onClick: () => {
                    setIsCodeMode(true);
                    setIsImageGenMode(false);
                    setIsResearchMode(false);
                }
            },
            {
                id: 'image',
                title: 'Chế độ Hình ảnh',
                desc: 'Tạo ảnh nghệ thuật và quản lý thư viện hình ảnh AI.',
                icon: <ImageIcon className="w-5 h-5 text-brand" />,
                active: isImageGenMode,
                onClick: () => {
                    setIsImageGenMode(true);
                    setIsCodeMode(false);
                    setIsResearchMode(false);
                    if (setIsImageSettingsOpen) setIsImageSettingsOpen(true);
                }
            }
        ];

        return (
            <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-[28px] bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center text-white shadow-xl shadow-brand/10 mb-8 animate-in zoom-in duration-700`}>
                    {activeBot?.settings?.bot_avatar ? (
                        <img src={activeBot.settings.bot_avatar} className="w-full h-full object-cover rounded-[28px]" alt="Avatar" />
                    ) : (
                        <Bot className="w-10 h-10" />
                    )}
                </div>

                <h2 className={`text-3xl font-black mb-3 tracking-tight text-center animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100 ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                    Sẵn sàng trợ giúp, {activeBot?.name || 'AI Assistant'}
                </h2>
                <p className={`font-medium mb-12 text-center max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                    Hãy bắt đầu một cuộc hội thoại mới hoặc chọn một chế độ chuyên dụng bên dưới để tối ưu hiệu quả công việc.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={mode.onClick}
                            className={`group p-5 rounded-3xl border-2 transition-all duration-300 text-left flex gap-4 items-start ${mode.active && mode.id !== 'standard'
                                ? (isDarkTheme ? 'bg-slate-800 border-slate-700 shadow-xl scale-[1.02]' : 'bg-white border-slate-200 shadow-lg scale-[1.02]')
                                : (isDarkTheme ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800 hover:shadow-md' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-md')
                                }`}
                        >
                            <div className={`p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110 duration-300 ${mode.active && mode.id !== 'standard'
                                ? 'bg-brand/10'
                                : (isDarkTheme ? 'bg-slate-800 shadow-sm border border-slate-700' : 'bg-white shadow-sm border border-slate-100')
                                }`}>
                                {mode.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-bold text-sm ${mode.active && mode.id !== 'standard' ? 'text-brand' : (isDarkTheme ? 'text-white' : 'text-slate-800')}`}>
                                        {mode.title}
                                    </h4>
                                    {mode.active && mode.id !== 'standard' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                    )}
                                </div>
                                <p className={`text-xs leading-relaxed font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {mode.desc}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div
            ref={parentRef}
            className={`flex-1 overflow-y-auto custom-scrollbar pt-6 ${isMobile ? 'pb-40' : 'pb-80'} transition-colors duration-500 ${isDarkTheme ? 'bg-[#0B0F17]' : 'bg-white'}`}
            id="chat-scroll"
            style={{
                opacity: 1,
                scrollBehavior: 'auto',
                overflowAnchor: 'none',
                overscrollBehavior: 'none'
            }}
        >
            {messages.length === 0 ? (
                <div className={`${isMobile ? 'px-4 py-6' : ''}`}>
                    {renderEmptyState()}
                </div>
            ) : (
                <>
                    <div
                        className="max-w-4xl mx-auto px-4 md:px-8 relative"
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const item = displayItems[virtualRow.index];

                            if (item.type === 'separator') {
                                return (
                                    <div
                                        key={item.id}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className="flex justify-center py-6 absolute left-0 right-0 z-10"
                                        style={{
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${isDarkTheme ? 'bg-[#161B24]/80 border-slate-700/50 text-slate-400 backdrop-blur-md' : 'bg-white/80 border-slate-100 text-slate-400 backdrop-blur-md'}`}>
                                            {item.label}
                                        </div>
                                    </div>
                                );
                            }

                            const msg = item.data;
                            const idx = item.index;
                            const isUser = msg.role === 'user';
                            // FIX #6: Pre-compute toLowerCase once, avoid O(n) repeated calls per render
                            const searchTerm = chatSearchTerm?.toLowerCase();
                            const isHighlighted = searchTerm && msg.content.toLowerCase().includes(searchTerm);

                            return (
                                <div
                                    key={msg.id}
                                    data-index={virtualRow.index}
                                    data-message-id={msg.id}
                                    ref={rowVirtualizer.measureElement}
                                    className={`group flex gap-3 pb-6 absolute left-4 right-4 md:left-8 md:right-8 ${isUser ? 'flex-row-reverse items-start' : 'items-start'} ${isHighlighted ? 'ring-2 ring-brand/20 rounded-3xl shadow-[0_0_15px_rgba(var(--brand-rgb),0.2)]' : ''}`}
                                    style={{
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <div className={`flex flex-col max-w-[92%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'} ${loadingChat && !isUser && idx === messages.length - 1 ? 'min-w-[75%] md:min-w-[60%]' : ''}`}>
                                        <div className={`flex items-center gap-2 mb-2.5 opacity-60 text-[10px] font-black uppercase tracking-widest ${isDarkTheme ? 'text-white' : 'text-slate-500'}`}>
                                            {isUser ? 'You' : activeBot?.name || 'AI Assistant'}
                                        </div>

                                        <div className={`relative ${isMobile ? 'px-4 py-3' : 'px-5 py-4'} rounded-[24px] ${isUser
                                            ? (isDarkTheme ? 'bg-brand !text-white shadow-sm shadow-brand/20' : 'user-bubble text-slate-900 shadow-sm')
                                            : (isDarkTheme ? 'bg-[#161B22] !text-white border border-slate-700/50 shadow-md' : 'assistant-bubble text-slate-800 shadow-sm')} text-[15px] leading-relaxed shadow-sm ${loadingChat && !isUser && idx === messages.length - 1 ? 'w-full' : ''}`}>

                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className={`mb-4 ${isUser ? 'flex flex-col items-end' : 'flex flex-wrap gap-2'}`}>
                                                    {/* Images Section */}
                                                    {isUser && msg.attachments.filter((a: any) => a.type.startsWith('image/')).length > 1 ? (
                                                        <div className="relative w-48 h-48 my-6 mr-6 group/fan cursor-pointer hover:mr-10 transition-all duration-500" onClick={() => onPreviewImage(msg.attachments.filter((a: any) => a.type.startsWith('image/'))[0].previewUrl)}>
                                                            {msg.attachments.filter((a: any) => a.type.startsWith('image/')).slice(0, 4).map((file: any, i: number, arr: any[]) => (
                                                                <div
                                                                    key={i}
                                                                    className="absolute inset-0 transition-all duration-500 origin-bottom-right shadow-xl rounded-[24px] border-4 border-white overflow-hidden bg-slate-50 group-hover/fan:scale-110 group-hover/fan:-translate-x-2 group-hover/fan:-translate-y-2 z-0 hover:z-10"
                                                                    style={{
                                                                        zIndex: 10 - i,
                                                                        transform: `rotate(${(i - (arr.length - 1) / 2) * 15}deg) translateX(${i * 20}px) translateY(${i * -5}px)`,
                                                                    }}
                                                                >
                                                                    <img src={file.previewUrl || file.base64} className="w-full h-full object-cover" alt={file.name} />
                                                                </div>
                                                            ))}
                                                            {msg.attachments.filter((a: any) => a.type.startsWith('image/')).length > 4 && (
                                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center text-[10px] font-black z-20 shadow-md border-2 border-white">
                                                                    +{msg.attachments.filter((a: any) => a.type.startsWith('image/')).length - 4}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : ''}`}>
                                                            {msg.attachments.filter((a: any) => a.type.startsWith('image/')).map((file: any, i: number) => (
                                                                <div key={i} className="group/att relative cursor-pointer" onClick={() => onPreviewImage(file.previewUrl || file.base64)}>
                                                                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md transition-all hover:border-brand hover:scale-110 hover:z-50 duration-300 w-full bg-slate-50 max-w-[300px]">
                                                                        <img src={file.previewUrl || file.base64} alt={file.name} className="w-full h-auto object-contain" />
                                                                        {!isUser && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    onMakeGlobal(file);
                                                                                }}
                                                                                className={`absolute bottom-2 right-2 p-1.5 backdrop-blur rounded-lg shadow-sm opacity-0 group-hover/att:opacity-100 transition-all transform translate-y-2 group-hover/att:translate-y-0 ${isDarkTheme ? 'bg-slate-900/90 text-slate-400 hover:text-brand hover:bg-slate-800' : 'bg-white/90 text-slate-500 hover:text-brand hover:bg-white'}`}
                                                                                title="Make Global"
                                                                            >
                                                                                <Globe className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Other Files Section */}
                                                    <div className={`flex flex-wrap gap-2 mt-2 ${isUser ? 'justify-end' : ''}`}>
                                                        {msg.attachments.filter((a: any) => !a.type.startsWith('image/')).map((file: any, i: number) => (
                                                            <div key={i} className="group/att relative cursor-pointer" onClick={() => {
                                                                if (!workspaceDocs.some((d: any) => d.name === file.name)) setWorkspaceDocs((prev: any) => [...prev, file]);
                                                                if (!openTabNames.includes(file.name)) setOpenTabNames((prev: any) => [...prev, file.name]);
                                                                setActiveDoc(file);
                                                                setIsDocWorkspaceOpen(true);
                                                            }}>
                                                                {file.type.startsWith('video/') ? (
                                                                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-md transition-all hover:border-brand hover:scale-110 hover:z-50 duration-300 bg-slate-50">
                                                                        <video src={file.previewUrl || file.base64} controls className="max-w-[280px] max-h-[280px] md:max-w-[400px] md:max-h-[400px]" onClick={(e: any) => e.stopPropagation()} />
                                                                    </div>
                                                                ) : (
                                                                    <div className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-[11px] font-bold transition-all shadow-sm hover:shadow-md pr-8 relative ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-brand-accent hover:text-brand' : 'bg-slate-50 border-slate-200 hover:bg-brand hover:bg-opacity-5 hover:border-brand-accent hover:text-brand'}`}>
                                                                        <FileText className="w-4 h-4 text-brand" />
                                                                        <span className={`truncate max-w-[150px] ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</span>
                                                                        <span className={`text-[9px] font-normal ml-1 border rounded px-1 group-hover/att:border-brand-accent ${isDarkTheme ? 'text-slate-500 border-slate-700' : 'text-slate-400 border-slate-200'}`}>View</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`content-area selection:bg-brand selection:text-white ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
                                                {/* Cross-fade: skeleton fades OUT, content fades IN — no jarring flash */}
                                                {(() => {
                                                    const isSkeleton = loadingChat && idx === messages.length - 1 && msg.role === 'assistant' && !isImageGenMode;
                                                    return (
                                                        <div className="relative">
                                                            {/* Skeleton layer — fades out when loadingChat ends */}
                                                            <div
                                                                className="transition-opacity duration-400 ease-out"
                                                                style={{
                                                                    opacity: isSkeleton ? 1 : 0,
                                                                    pointerEvents: isSkeleton ? 'auto' : 'none',
                                                                    position: isSkeleton ? 'relative' : 'absolute',
                                                                    inset: isSkeleton ? 'auto' : 0,
                                                                }}
                                                            >
                                                                <div className="space-y-3.5 py-3 w-full">
                                                                    <div className="skeleton h-5 w-[99%] rounded-lg opacity-90"></div>
                                                                    <div className="skeleton h-5 w-[96%] rounded-lg opacity-75"></div>
                                                                    <div className="skeleton h-5 w-[100%] rounded-lg opacity-60"></div>
                                                                    <div className="skeleton h-5 w-[93%] rounded-lg opacity-45"></div>
                                                                    <div className="skeleton h-5 w-[97%] rounded-lg opacity-30"></div>
                                                                    <div className="skeleton h-5 w-[78%] rounded-lg opacity-15"></div>
                                                                    <div className="skeleton h-5 w-[55%] rounded-lg" style={{ opacity: 0.08 }}></div>
                                                                    <div className="mt-8 flex items-center gap-3">
                                                                        <div className="relative">
                                                                            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center relative overflow-hidden">
                                                                                <Bot className="w-5 h-5 text-brand animate-bounce" />
                                                                                <div className="absolute inset-0 bg-brand/5 animate-pulse" />
                                                                            </div>
                                                                            <div className="absolute -inset-1 bg-brand/20 blur-md rounded-full animate-pulse -z-10" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[12px] font-bold text-brand animate-pulse">AI đang soạn thảo...</span>
                                                                            <span className="text-[10px] text-slate-400 font-medium">Vui lòng đợi trong giây lát</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Content layer — fades in after skeleton fades out */}
                                                            <div
                                                                className="transition-opacity duration-500 ease-in"
                                                                style={{
                                                                    opacity: isSkeleton ? 0 : 1,
                                                                    transitionDelay: isSkeleton ? '0ms' : '150ms',
                                                                    pointerEvents: isSkeleton ? 'none' : 'auto',
                                                                    position: isSkeleton ? 'absolute' : 'relative',
                                                                    inset: isSkeleton ? 0 : 'auto',
                                                                }}
                                                            >
                                                                <MemoizedContent
                                                                    content={msg.content}
                                                                    role={msg.role}
                                                                    messageId={msg.id}
                                                                    renderMarkdown={renderMarkdown}
                                                                    isCodeMode={isCodeMode}
                                                                    isCiteMode={isCiteMode}
                                                                    workspaceDocs={workspaceDocs}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Image generation mode still uses its own loading UI handled below if needed */}
                                                {isImageGenMode && loadingChat && idx === messages.length - 1 && msg.role === 'assistant' && (
                                                    <div className="mt-4 p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group/gen">
                                                        <div className="flex flex-col items-center gap-4 relative z-10">
                                                            <div className="relative">
                                                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand flex items-center justify-center shadow-brand animate-pulse">
                                                                    <ImageIcon className="w-10 h-10 text-white animate-bounce" />
                                                                </div>
                                                                <div className="absolute -inset-4 bg-brand bg-opacity-20 rounded-full blur-2xl animate-pulse -z-10" />
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Nano Banana Pro</span>
                                                                <span className="text-[11px] font-bold text-brand flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                                                                    Materializing your imagination...
                                                                </span>
                                                            </div>
                                                            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                                                                <div className="h-full bg-gradient-to-r from-brand animate-[progress_3s_ease-in-out_infinite]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {msg.role === 'user' && (
                                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                <button onClick={() => reuseMessage(msg.content, msg.attachments)} className={`p-1.5 rounded-lg transition-all border shadow-sm flex items-center justify-center ${isDarkTheme ? 'bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-brand border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-brand border-slate-100'}`}>
                                                    <Undo className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {msg.role === 'assistant' && (
                                            <div className="flex flex-col gap-3 mt-3">
                                                {msg.quickActions && msg.quickActions.length > 0 && !loadingChat && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {msg.quickActions.map((action: string, ai: number) => (
                                                            <button key={ai} onClick={() => { setInput(action); setTimeout(() => document.getElementById('send-button')?.click(), 100); }} className={`group/btn text-left px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2.5 border ${isDarkTheme ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:border-brand text-slate-100 hover:text-white' : 'bg-white hover:bg-brand hover:bg-opacity-5 border-slate-200 hover:border-brand-accent text-slate-600 hover:text-brand'}`}>
                                                                <Sparkles className="shrink-0 w-3.5 h-3.5 text-brand opacity-80 group-hover/btn:opacity-100 group-hover/btn:rotate-12 transition-all" />
                                                                <span className="line-clamp-2 md:line-clamp-1">{action}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => copyToClipboard(msg.content)} className={`transition-colors ${isDarkTheme ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'}`}><Copy className="w-4 h-4" /></button>
                                                    <button onClick={() => speakMessage(msg.content, msg.id)} className={`transition-colors ${isDarkTheme ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'} ${isSpeaking === msg.id ? 'text-green-500 animate-pulse' : ''}`}>
                                                        {isSpeaking === msg.id ? <StopCircle className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                    </button>
                                                    {idx === messages.length - 1 && (
                                                        <button onClick={regenerateResponse} className={`transition-colors ${isDarkTheme ? 'text-slate-500 hover:text-slate-300' : 'text-slate-600 hover:text-slate-900'}`}><RefreshCw className="w-4 h-4" /></button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* End spacer — outside virtualizer so it's not positioned inside relative container */}
                    <div className="max-w-4xl mx-auto px-4 md:px-8">
                        <div ref={messagesEndRef} className="h-10" />
                    </div>
                </>
            )}
        </div>
    );
});

export default MessageList;
