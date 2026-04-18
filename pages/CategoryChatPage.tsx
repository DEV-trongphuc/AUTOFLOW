import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    Send, Bot, User, Loader2, Search, Menu, X,
    LayoutGrid, MessageSquare, Sparkles, Hash, BookOpen,
    ArrowRight, Zap, Paperclip, Image as ImageIcon,
    FileText, Cpu, ChevronUp, ChevronDown, ChevronRight, Plus, History, Settings2, Minimize2, Maximize2, Pencil, Database,
    Command, Globe, Aperture, Mic, Volume2, Copy, RefreshCw, StopCircle, Trash2, FilePlus, Video, Play, ExternalLink, MoreHorizontal, ShieldCheck,
    CornerDownRight, ShoppingBag, Share2, Brain, VolumeX, RotateCcw, Undo, Languages, Wand2, CheckCircle, Bug, RefreshCcw, Briefcase,
    Table, Edit3, Save, FileSpreadsheet, FileCode, Check, PanelLeft, PanelRight, ZoomIn, ZoomOut, Link as LinkIcon, FileQuestion, Upload,
    Download, Eye, AlertTriangle, Layers, Pin, Sun, Moon
} from 'lucide-react';
import { api } from '../services/storageAdapter';
import { toast } from 'react-hot-toast'; import { KeyboardHelpModal } from '../components/ai/modals/KeyboardHelpModal';
import PremiumLoader from '../components/common/PremiumLoader';
import { Skeleton } from '../components/ui/Skeleton';
import Modal from '../components/common/Modal';
import ImageSettingsSidebar from '../components/ImageSettingsSidebar';

import GlobalWorkspaceView from '../components/ai/GlobalWorkspaceView';
import Sidebar from '../components/ai/Sidebar';
import InputModal from '../components/common/InputModal';
import HomeView from '../components/ai/HomeView';
import AITrainingManager from '../components/ai/AITrainingManager';
import MessageList from './CategoryChat/components/MessageList';
import SpaceBackground from '../components/ai/SpaceBackground';
import FullWidthSoundwave from '../components/ai/FullWidthSoundwave';
import WorkspaceDocItem from '../components/ai/WorkspaceDocItem';
import { formatFileSize, hexToHSL, EXT_MAP } from '../utils/formatters';
import { FileAttachment, Message, ChatSession, ChatbotInfo } from '../types';
import ChatInput from '../components/ai/chat/ChatInput';
import ChatHeader from '../components/ai/chat/ChatHeader';
import FeedbackModal from '../components/ai/chat/FeedbackModal';
import DeleteSessionModal from '../components/ai/chat/modals/DeleteSessionModal';
import RenameSessionModal from '../components/ai/chat/modals/RenameSessionModal';
import ClearWorkspaceModal from '../components/ai/chat/modals/ClearWorkspaceModal';
import ShareModal from '../components/ai/chat/modals/ShareModal';
import ImagePreviewModal from '../components/ai/chat/modals/ImagePreviewModal';
import FilePreview from '../components/ai/FilePreview';
import OrgUserManager from '../components/ai/org/OrgUserManager';
import { BannedUserModal, WarningUserModal } from '../components/ai/org/UserStatusModals';
import UserProfileModal from '../components/ai/modals/UserProfileModal';
import ChatSummaryPanel from '../components/ai/ChatSummaryPanel';
import { PersonaPicker } from './CategoryChat/components/PersonaPicker';



// --- TYPES ---
// Moved to ../types.ts

// --- COMPONENTS ---
// --- UTILS ---
// --- UTILS ---

// formatFileSize and hexToHSL moved to ../utils/formatters

// --- COMPONENTS ---

// --- SUB-COMPONENTS ---

// Soundwave Component - Realtime Audio Version


// Available Models - Full Gemini Lineup with Vision Support
// Available Models - Gemini 2.5 Lineup
// Available Models - Gemini 2.5 Lineup
import { useChatPage } from '../contexts/ChatPageContext';
import { useChatbots } from '../hooks/useChatbots';
import { useCategorySettings } from '../hooks/useCategorySettings';
import { useChat } from './CategoryChat/hooks/useChat';
import { useSpeech } from './CategoryChat/hooks/useSpeech';
import { AI_MODELS, getModelDisplayName, IMAGE_PROVIDERS } from '../utils/ai-constants';

import { renderMarkdown as utilityRenderMarkdown } from '../utils/markdownRenderer';
import { useFileHandler } from '../hooks/useFileHandler';
import { useCategorySlug } from '../hooks/useCategorySlug';

const IMAGE_STYLES = [
    { id: 'professional', name: 'Professional', prompt: 'professional business style, clean, modern, corporate', preview: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'artistic', name: 'Artistic', prompt: 'high-end artistic photography, cinematic lighting, masterpiece', preview: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: '3d-render', name: '3D Render', prompt: 'hyper-realistic 3D render, PBR materials, octane render, 8k', preview: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist design, negative space, clean composition', preview: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'infographic', name: 'Infographic', prompt: 'clean infographic style, data visualization, flat design', preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'sketch', name: 'Sketch', prompt: 'detailed pencil sketch, hand-drawn, artistic charcoal', preview: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk aesthetic, neon lights, futuristic city, night', preview: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=300&h=300&auto=format&fit=crop' },
    { id: 'isometric', name: 'Isometric', prompt: 'isometric 3D view, miniature world, clean lighting', preview: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=300&h=300&auto=format&fit=crop' },
];

const IMAGE_SIZES = [
    { id: 'auto', name: 'Freesize (Auto)', width: 0, height: 0, ratio: 'Auto' },
    { id: '1K', name: '1K Standard', width: 1024, height: 1024, ratio: '1:1' },
    { id: '2K', name: '2K High Res', width: 2048, height: 2048, ratio: '1:1' },
    { id: '4K', name: '4K Ultra HD', width: 4096, height: 4096, ratio: '1:1' },
    { id: 'wide', name: 'Wide 16:9', width: 1376, height: 768, ratio: '16:9' },
    { id: 'tall', name: 'Portrait 9:16', width: 768, height: 1376, ratio: '9:16' },
    { id: 'cinema', name: 'Cinematic 21:9', width: 1584, height: 672, ratio: '21:9' },
];

const DIAGRAM_TEMPLATES = [
    { id: 'flowchart', name: 'Flowchart', icon: '📊', prompt: 'Create a professional flowchart diagram, clean box and arrows' },
    { id: 'mindmap', name: 'Mind Map', icon: '🧠', prompt: 'Create a vibrant mind map diagram with branching ideas' },
    { id: 'orgchart', name: 'Org Chart', icon: '🏢', prompt: 'Create a corporate organizational hierarchy chart' },
    { id: 'isometric', name: 'Isometric View', icon: '🧱', prompt: 'Create a 3D isometric representation of ' },
    { id: 'mockup', name: 'UX Mockup', icon: '📱', prompt: 'Create a high-fidelity product UI mockup for ' },
    { id: 'infographic', name: 'Infographic', icon: '📈', prompt: 'Create a detailed data visualization infographic about ' },
];

const CategoryChatPage: React.FC = () => {
    const {
        viewMode, setViewMode,
        isSidebarOpen, setIsSidebarOpen,
        searchTerm, setSearchTerm,
        chatbots, setChatbots,
        activeBot, setActiveBot,
        categorySettings, setCategorySettings,
        brandColor,
        messages, setMessages,
        input, setInput,
        loadingChat, setLoadingChat,
        sessionId, setSessionId,
        attachments, setAttachments,
        selectedModel, setSelectedModel,
        isResearchMode, setIsResearchMode,
        isKbOnlyMode, setIsKbOnlyMode,
        isImageGenMode, setIsImageGenMode,
        isCodeMode, setIsCodeMode,
        workspaceDocs, setWorkspaceDocs,
        activeDoc, setActiveDoc,
        isDocWorkspaceOpen, setIsDocWorkspaceOpen,
        openTabNames, setOpenTabNames,
        remoteConvId, setRemoteConvId,
        docContent, setDocContent,
        isRenameModalOpen, setIsRenameModalOpen,
        renameSessionData, setRenameSessionData,
        newSessionTitle, setNewSessionTitle,
        isShareModalOpen, setIsShareModalOpen,
        isClearModalOpen, setIsClearModalOpen,
        isClearConfirmOpen, setIsClearConfirmOpen,
        sessionToDelete, setSessionToDelete,
        isModelModalOpen, setIsModelModalOpen,
        autoTTS, setAutoTTS,
        isEnhancing, setIsEnhancing,
        isImageSettingsOpen, setIsImageSettingsOpen,
        isGeneratingImage, setIsGeneratingImage,
        imageProvider, setImageProvider,
        isEditingImage, setIsEditingImage,
        imageStyle, setImageStyle,
        imageSize, setImageSize,
        isZenMode, setIsZenMode,
        currentUser, setCurrentUser,
        suggestedQuestions, setSuggestedQuestions,
        selectedContextDocs, setSelectedContextDocs,
        abortControllerRef,
        workspacePosition, setWorkspacePosition,
        orgUser,
        logoutOrgUser,
        updateOrgUser,
        isCheckingOrgAuth,
        isDarkTheme,
        setIsDarkTheme,
        selectedPersona,
        isPersonaPickerOpen, setIsPersonaPickerOpen,
        isCiteMode, setIsCiteMode,
        hasPdfs, setHasPdfs,
    } = useChatPage();
    const { categoryId: categorySlugOrId, chatbotId, sessionId: sessionIdParam } = useParams<{ categoryId: string; chatbotId?: string; sessionId?: string }>();
    const { categoryId, loading: slugLoading, error: slugError } = useCategorySlug(categorySlugOrId);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [isSpeaking, setIsSpeaking] = useState<string | null>(null); // message ID being spoken
    const [isTrainingOpen, setIsTrainingOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [hasNetworkError, setHasNetworkError] = useState(false);
    const [isOrgManagerOpen, setIsOrgManagerOpen] = useState(false);
    const [targetEditUserId, setTargetEditUserId] = useState<number | null>(null);
    const [showSaveSnippetModal, setShowSaveSnippetModal] = useState(false);
    const [snippetToSave, setSnippetToSave] = useState<FileAttachment | null>(null);
    const [hasSeenWarning, setHasSeenWarning] = useState(() => localStorage.getItem(`warning_seen_${orgUser?.id}`) === 'true');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    // Share conversation states
    const [isShareConvModalOpen, setIsShareConvModalOpen] = useState(false);
    const [isConvPublic, setIsConvPublic] = useState(false);
    const [shareConvUrl, setShareConvUrl] = useState('');
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateSourceConvId, setDuplicateSourceConvId] = useState('');
    const [duplicateSourceTitle, setDuplicateSourceTitle] = useState('');
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);

    // --- SEARCH STATE ---
    const [chatSearchTerm, setChatSearchTerm] = useState('');
    const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
    const [searchMatches, setSearchMatches] = useState<string[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
    const [isSearchingRemote, setIsSearchingRemote] = useState(false);
    const [remoteSearchCount, setRemoteSearchCount] = useState(0);

    // --- PAGINATION STATE ---
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [canLoadMore, setCanLoadMore] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // --- SUMMARY STATE ---
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [chatSummary, setChatSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isSummaryConfirmOpen, setIsSummaryConfirmOpen] = useState(false);

    // Show loading state if slug is being resolved
    const isLoadingSlug = slugLoading && !categoryId;

    // Auth Action Effect
    useEffect(() => {
        if (!isCheckingOrgAuth && !orgUser && categoryId) {
            navigate(`/ai-space/${categorySlugOrId}/login`, { replace: true });
        }
    }, [isCheckingOrgAuth, orgUser, navigate, categoryId, categorySlugOrId]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setHasNetworkError(false);
            // Removed proactive reload to prevent losing user's unsaved states/chat drafts
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Theme persistence
    useEffect(() => {
        localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDarkTheme);
    }, [isDarkTheme]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkTheme);
    }, []); // Run once on mount

    // --- GLOBAL HELPERS FOR INTERACTIVE ELEMENTS ---
    useEffect(() => {
        (window as any).__openLatestDocument = () => {
            if (workspaceDocs && workspaceDocs.length > 0) {
                // Find latest PDF or any document
                const latestDoc = [...workspaceDocs].reverse().find(d =>
                    d.type?.includes('pdf') || d.name?.toLowerCase().endsWith('.pdf') || d.type?.includes('text')
                ) || workspaceDocs[workspaceDocs.length - 1];

                if (latestDoc) {
                    setActiveDoc(latestDoc);
                    setIsDocWorkspaceOpen(true);
                    // Force refresh active state in UI if needed
                    window.dispatchEvent(new CustomEvent('mf-refresh-active-doc', { detail: latestDoc }));
                }
            } else {
                toast.error("Không tìm thấy tài liệu đính kèm nào.");
            }
        };

        (window as any).__goToPDFPage = (pages: string) => {
            // Extract first number (e.g. "10 - 15" -> 10)
            const match = pages.match(/\d+/);
            const pageNum = match ? parseInt(match[0], 10) : 1;

            if (workspaceDocs && workspaceDocs.length > 0) {
                const latestDoc = [...workspaceDocs].reverse().find(d =>
                    d.type?.includes('pdf') || d.name?.toLowerCase().endsWith('.pdf')
                ) || workspaceDocs[workspaceDocs.length - 1];

                if (latestDoc) {
                    setActiveDoc(latestDoc);
                    setIsDocWorkspaceOpen(true);

                    // Give extra time for viewer to mount if it wasn't open
                    const delay = 500;
                    setTimeout(() => {
                        if ((window as any).__navigateToPage) {
                            (window as any).__navigateToPage(pageNum);
                        }
                    }, delay);
                }
            }
        };

        return () => {
            delete (window as any).__openLatestDocument;
            delete (window as any).__goToPDFPage;
        };
    }, [workspaceDocs, setActiveDoc, setIsDocWorkspaceOpen]);

    // --- PAGE TITLE: "AI SPACE - <group name>" ---
    useEffect(() => {
        const originalTitle = document.title;
        if (activeBot?.name) {
            document.title = `AI Space · ${activeBot.name}`;
        } else {
            document.title = 'AI Space';
        }
        return () => {
            document.title = originalTitle;
        };
    }, [activeBot?.name]);

    // Check for PDFs when activeBot changes
    useEffect(() => {
        const checkPdfs = async () => {
            if (!activeBot?.id) {
                setHasPdfs(false);
                return;
            }
            try {
                const res = await api.get<any>(`ai_org_chatbot?action=check_pdf_status&property_id=${activeBot.id}`);
                if (res.success) {
                    setHasPdfs((res as any).has_pdfs);
                }
            } catch (e) {
                console.error("Failed to check PDF status", e);
                setHasPdfs(false);
            }
        };
        checkPdfs();
    }, [activeBot?.id, setHasPdfs]);

    const {
        handleSend,
        regenerateResponse,
        isGeneratingImage: isChatGeneratingImage
    } = useChat(orgUser || currentUser);
    const {
        isListening,
        realtimeTranscript,
        isSpeaking: isAnySpeaking,
        speakMessage: speakWithHook,
        stopSpeaking,
        startListening,
        stopListening
    } = useSpeech();

    useEffect(() => {
        if (!isAnySpeaking) setIsSpeaking(null);
    }, [isAnySpeaking]);

    const speakMessage = useCallback((text: string, msgId: string) => {
        if (isSpeaking === msgId) {
            stopSpeaking();
            setIsSpeaking(null);
        } else {
            speakWithHook(text);
            setIsSpeaking(msgId);
        }
    }, [isSpeaking, speakWithHook, stopSpeaking]);



    const handleLoadMoreMessages = useCallback(async () => {
        if (isLoadingMore || !canLoadMore || !sessionId) return;
        setIsLoadingMore(true);
        try {
            const offset = messages.length;
            const res = await api.get<any>(`ai_org_chatbot?action=get_conversation_history&visitor_id=${sessionId}&property_id=${activeBot?.id || ''}&limit=10&offset=${offset}&org_user_id=${orgUser?.id || ''}`);
            if (res.success && Array.isArray(res.data)) {
                const hData = res as any;
                setCanLoadMore(hData.has_more);

                const olderMsgs: Message[] = res.data.map((msg: any) => {
                    let attachments: FileAttachment[] = [];
                    try {
                        if (msg.metadata) {
                            const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                            if (meta.attachments) attachments = meta.attachments;
                        }
                    } catch (e) { }
                    return {
                        id: msg.id || 'msg_' + (Date.now() + Math.random()),
                        role: msg.sender === 'visitor' ? 'user' : 'assistant',
                        content: msg.message,
                        timestamp: new Date(msg.created_at),
                        attachments: attachments
                    };
                });

                if (olderMsgs.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueOlder = olderMsgs.reverse().filter(m => !existingIds.has(m.id));
                        return [...uniqueOlder, ...prev];
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load more messages", e);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, canLoadMore, sessionId, messages.length, activeBot?.id, orgUser?.id]);

    const handleSummarize = useCallback(async () => {
        if (!remoteConvId || isSummarizing) return;

        setIsSummaryConfirmOpen(false);
        setIsSummarizing(true);
        if (!isSummaryOpen) setIsSummaryOpen(true);

        try {
            const res = await api.post<any>('ai_org_chatbot?action=summarize_conversation', {
                conversation_id: remoteConvId,
                property_id: activeBot?.id
            }) as any;

            if (res.success && res.summary) {
                setChatSummary(res.summary);
            } else {
                toast.error(res.message || 'Không có dữ liệu tóm tắt trả về');
            }
        } catch (e) {
            console.error("Summary error", e);
            toast.error('Không thể kết nối với AI để tóm tắt');
        } finally {
            setIsSummarizing(false);
        }
    }, [remoteConvId, isSummarizing, activeBot?.id, isSummaryOpen]);

    // --- SEARCH LOGIC ---
    useEffect(() => {
        if (!chatSearchTerm.trim()) {
            setSearchMatches([]);
            setCurrentSearchIndex(-1);
            setRemoteSearchCount(0);
            return;
        }
        const lowerTerm = chatSearchTerm.toLowerCase();
        const matches = messages
            .filter(m => m.content.toLowerCase().includes(lowerTerm))
            .map(m => m.id);
        setSearchMatches(matches);
        if (matches.length > 0) {
            if (currentSearchIndex === -1 || currentSearchIndex >= matches.length) {
                setCurrentSearchIndex(0);
            }
        } else {
            setCurrentSearchIndex(-1);
        }

        // Debounced Backend Search
        const timer = setTimeout(async () => {
            setIsSearchingRemote(true);
            try {
                const res = await api.get<any>(`ai_org_chatbot?action=search_messages&search=${encodeURIComponent(chatSearchTerm)}&conversation_id=${sessionId || ''}&visitor_id=${sessionId || ''}&property_id=${activeBot?.id || ''}&org_user_id=${orgUser?.id || ''}`);
                if (res.success && res.data) {
                    // Count matches that are NOT in the local messages
                    const remoteMatches = res.data.filter((rm: any) => !messages.some(lm => lm.id === rm.id));
                    setRemoteSearchCount(remoteMatches.length);
                }
            } catch (e) {
                console.error("Remote search failed", e);
            } finally {
                setIsSearchingRemote(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [chatSearchTerm, messages, sessionId, activeBot, orgUser]);

    const navigateSearch = useCallback((direction: 'next' | 'prev') => {
        if (searchMatches.length === 0) return;
        let newIndex = direction === 'next' ? currentSearchIndex + 1 : currentSearchIndex - 1;
        if (newIndex >= searchMatches.length) newIndex = 0;
        if (newIndex < 0) newIndex = searchMatches.length - 1;
        setCurrentSearchIndex(newIndex);

        // Scroll to match
        const msgId = searchMatches[newIndex];
        const container = document.getElementById('chat-scroll');
        const el = document.querySelector(`[data-message-id="${msgId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight glow?
            el.classList.add('search-match-highlight');
            setTimeout(() => el.classList.remove('search-match-highlight'), 2000);
        }
    }, [searchMatches, currentSearchIndex]);

    // --- UI STATE (Local only) ---
    const [isDragging, setIsDragging] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // Load current user
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) setCurrentUser(JSON.parse(userStr));
        } catch (e) { }
    }, [setCurrentUser]);

    // Mobile/Tablet detection - threshold matches sidebar lg breakpoint (1024px)
    // Tablets (768-1023px) also get overlay sidebar + swipe + menu button
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Swipe Support
    const touchStartRef = useRef<number | null>(null);
    const touchEndRef = useRef<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndRef.current = null;
        touchStartRef.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndRef.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartRef.current || !touchEndRef.current) return;
        const distance = touchStartRef.current - touchEndRef.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isRightSwipe && !isSidebarOpen && touchStartRef.current < 40) {
            setIsSidebarOpen(true);
        } else if (isLeftSwipe && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
    };

    const location = useLocation();
    // Close Training Manager when not on /organization route
    useEffect(() => {
        // Robust detection for both standard and hash routes
        const isOnOrganizationRoute =
            location.pathname.endsWith('/organization') ||
            location.pathname.includes('/organization/') ||
            window.location.hash.includes('/organization');

        setIsTrainingOpen(isOnOrganizationRoute);
    }, [location]);



    const hsl = useMemo(() => hexToHSL(brandColor), [brandColor]);

    // --- OTHER LOCAL STATE ---

    // Sync Image Provider to Main Model
    const prevTextModelRef = useRef<string>('');


    const chatScrollRef = useRef<HTMLDivElement>(null);
    const isManualNavigationRef = useRef(false);
    const latestBotSessionFetchId = useRef(0);
    const migratedBotIdRef = useRef<string | null>(null);
    const prevRemoteConvIdRef = useRef<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (isImageGenMode) {
            const targetModel = imageProvider.replace('-image', '');
            if (selectedModel !== targetModel) {
                if (!prevTextModelRef.current) prevTextModelRef.current = selectedModel;
                setSelectedModel(targetModel);
            }
        } else {
            if (prevTextModelRef.current) {
                if (selectedModel !== prevTextModelRef.current) {
                    setSelectedModel(prevTextModelRef.current);
                }
                prevTextModelRef.current = '';
            } else if (selectedModel === 'gemini-3-pro-preview') {
                // Fallback for page reload state where prev is empty but model is stuck on a hidden preview model
                setSelectedModel('auto');
            }
        }
    }, [isImageGenMode, imageProvider, selectedModel]);

    const docInputRef = useRef<HTMLInputElement>(null);
    const streamingBlockRef = useRef<{ name: string, index: number } | null>(null);

    const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);

    const [workspaceWidth, setWorkspaceWidth] = useState(() => {
        const saved = localStorage.getItem('workspaceWidth');
        return saved ? parseInt(saved) : 45;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [explorerSearchTerm, setExplorerSearchTerm] = useState('');
    const [contextTab, setContextTab] = useState<'saved' | 'drafts'>('saved');
    const [contextSearchTerm, setContextSearchTerm] = useState('');
    // const [pdfViewMode, setPdfViewMode] = useState<'native' | 'reader'>('native');
    const [sharingDoc, setSharingDoc] = useState<FileAttachment | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<FileAttachment | null>(null);
    const [isAttachDropdownOpen, setIsAttachDropdownOpen] = useState(false);

    const [deletedGalleryImages, setDeletedGalleryImages] = useState<string[]>([]);
    const [selectedGalleryImages, setSelectedGalleryImages] = useState<string[]>([]);
    const [isGallerySelectMode, setIsGallerySelectMode] = useState(false);
    const [isDeleteGalleryModalOpen, setIsDeleteGalleryModalOpen] = useState(false);
    const [deletingGalleryUrl, setDeletingGalleryUrl] = useState<string | null>(null);


    // --- GLOBAL ASSETS DB STATE ---

    const [globalDbAssets, setGlobalDbAssets] = useState<FileAttachment[]>([]);
    const [isLoadingGlobalAssets, setIsLoadingGlobalAssets] = useState(false);
    const [globalTab, setGlobalTab] = useState<'files' | 'images'>('files');
    const [globalSourceFilter, setGlobalSourceFilter] = useState<'all' | 'workspace' | 'chat_user' | 'chat_assistant'>('all');
    const [isPromoting, setIsPromoting] = useState(false);
    const [globalSearch, setGlobalSearch] = useState('');
    const [globalSearchInput, setGlobalSearchInput] = useState('');
    const [selectedGlobalDocs, setSelectedGlobalDocs] = useState<string[]>([]);
    const [isGlobalSelectMode, setIsGlobalSelectMode] = useState(false);
    const [isDeleteGlobalModalOpen, setIsDeleteGlobalModalOpen] = useState(false);
    const [globalAssetIdsToDelete, setGlobalAssetIdsToDelete] = useState<any[]>([]);
    const [globalPage, setGlobalPage] = useState(1);
    const [globalTotal, setGlobalTotal] = useState(0);
    const GLOBAL_PAGE_SIZE = 18;
    const [isWorkspaceTipsOpen, setIsWorkspaceTipsOpen] = useState(false);

    // Sync Gallery/Workspace tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'images') {
            setGlobalTab('images');
        } else if (tab === 'files') {
            setGlobalTab('files');
        }
    }, [searchParams]);

    // Debounce Global Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setGlobalSearch(globalSearchInput);
        }, 500);
        return () => clearTimeout(timer);
    }, [globalSearchInput]);

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const API_BASE_URL = isLocal ? '/mail_api' : 'https://automation.ideas.edu.vn/mail_api';

    // ==================== FILE HANDLERS (HOOK) ====================
    const {
        isDragging: isDraggingState,
        handleFileSelect,
        handleDocFileSelect,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste
    } = useFileHandler({
        sessionId,
        activeBot,
        remoteConvId,
        currentUser,
        isImageGenMode,
        setIsImageGenMode,
        setAttachments,
        setWorkspaceDocs,
        setActiveDoc,
        setOpenTabNames,
        isDocWorkspaceOpen,
        setIsDocWorkspaceOpen,
        viewMode,
        orgUser
    });

    // Sync local dragging state with hook
    useEffect(() => {
        setIsDragging(isDraggingState);
    }, [isDraggingState]);

    // Attach Paste Handler
    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, [handlePaste]);

    const handleSelectAll = useCallback(() => {
        if (selectedGlobalDocs.length === globalDbAssets.length && globalDbAssets.length > 0) {
            setSelectedGlobalDocs([]);
        } else {
            setSelectedGlobalDocs(globalDbAssets.map(a => a.name));
        }
    }, [selectedGlobalDocs.length, globalDbAssets]);

    const fetchGlobalAssets = useCallback(async () => {
        if (!orgUser && !currentUser) {
            setGlobalDbAssets([]);
            return;
        }

        // Cancel previous fetch if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsLoadingGlobalAssets(true);
        try {
            const typeParam = globalTab === 'files' ? 'document' : 'image';
            const offset = (globalPage - 1) * GLOBAL_PAGE_SIZE;

            // CONTEXT AWARE FILTERING:
            // If in Chat mode, we ONLY want to pull TRULY global files (source=workspace)
            // to join with the conversation-specific docs.
            // If in Global Workspace View, we respect the user's selected filters.
            const forceSource = viewMode === 'chat' ? 'workspace' : globalSourceFilter;

            // Fetch workspace assets + global training knowledge in parallel (for global_workspace view)
            const fetchTraining = (viewMode === 'global_workspace' || !viewMode) && globalTab === 'files';

            const [res, trainingRes] = await Promise.all([
                api.get<any>(`get_global_assets?action=list&property_id=${chatbotId || ''}&group_id=${categoryId || ''}&type=${typeParam}&source=${forceSource}&search=${globalSearch}&limit=${GLOBAL_PAGE_SIZE}&offset=${offset}&org_user_id=${orgUser?.id || ''}`),
                fetchTraining
                    ? api.get<any>(`ai_training?action=list_global_knowledge&group_id=${categoryId || ''}&search=${globalSearch}`).catch(() => ({ success: false, data: [] }))
                    : Promise.resolve({ success: false, data: [] } as any)
            ]);

            let mapped: FileAttachment[] = [];

            if (res.success && Array.isArray(res.data)) {
                setGlobalTotal(res.total || 0);
                mapped = res.data.map((item: any) => ({
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
            }

            // Merge global training knowledge docs (is_global_workspace = 1)
            if (fetchTraining && trainingRes?.success && Array.isArray(trainingRes?.data)) {
                const knowledgeDocs: FileAttachment[] = (trainingRes.data as any[])
                    .filter((d: any) => Number(d.is_global_workspace) === 1 && d.source_type === 'upload')
                    .filter((d: any) => !globalSearch || d.name?.toLowerCase().includes(globalSearch.toLowerCase()))
                    .map((d: any) => {
                        let fileUrl = '';
                        try {
                            const meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {});
                            fileUrl = meta.file_url || '';
                        } catch (e) { }

                        // Bot name comes directly from the API (COALESCE in SQL)
                        const botName = d.bot_name || d.property_id || 'AI Bot';

                        return {
                            id: 'training_' + d.id,
                            name: d.name,
                            type: 'application/pdf',
                            size: d.content_size || 0,
                            previewUrl: fileUrl,
                            source: 'global_training',
                            isGlobal: true,
                            createdAt: d.created_at,
                            propertyId: d.property_id,
                            conversationTitle: botName,
                        } as FileAttachment;
                    });

                // Strategy: upgrade workspace docs that match a knowledge doc (by URL or lowercase name)
                // More reliable than remove+re-add (avoids Vietnamese unicode dedup failures)
                const upgradeByUrl = new Map(
                    knowledgeDocs.map(k => [k.previewUrl, k])
                );
                const upgradeByName = new Map(
                    knowledgeDocs.map(k => [k.name.trim().toLowerCase(), k])
                );
                const upgradedIds = new Set<string>();

                mapped = mapped.map(m => {
                    const kByUrl = m.previewUrl ? upgradeByUrl.get(m.previewUrl) : undefined;
                    const kByName = upgradeByName.get((m.name || '').trim().toLowerCase());
                    const k = kByUrl || kByName;
                    if (k) {
                        upgradedIds.add(String(k.id));
                        // Upgrade workspace doc to knowledge badge in-place
                        return { ...m, source: 'global_training', isGlobal: true, conversationTitle: k.conversationTitle } as FileAttachment;
                    }
                    return m;
                });

                // Prepend any knowledge docs that had NO match in workspace list
                const unmatched = knowledgeDocs.filter(k => !upgradedIds.has(String(k.id)));
                mapped = [...unmatched, ...mapped];

                // Update total to include knowledge docs
                setGlobalTotal(prev => prev + knowledgeDocs.length);
            }


            // Dedup by filename (knowledge docs win over workspace docs for same filename)
            const uniqueMap = new Map<string, FileAttachment>();
            // Add non-knowledge docs first
            mapped.forEach(item => {
                if (!(item as any).isGlobal) {
                    const key = (item.name || '').trim().toLowerCase();
                    uniqueMap.set(key, item);
                }
            });
            // Then knowledge docs override anything with same filename
            mapped.forEach(item => {
                if ((item as any).isGlobal) {
                    const key = (item.name || '').trim().toLowerCase();
                    uniqueMap.set(key, item);
                }
            });
            setGlobalDbAssets(Array.from(uniqueMap.values()));
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Error fetching global assets:", err);
            }
        } finally {
            setIsLoadingGlobalAssets(false);
        }
    }, [globalTab, globalSourceFilter, globalSearch, chatbotId, categoryId, globalPage, API_BASE_URL, currentUser, orgUser, viewMode, chatbots]);


    // Reset pagination when switching tabs
    useEffect(() => {
        setGlobalPage(1);
    }, [globalTab, globalSourceFilter, globalSearch]);

    // Optimize Migration: Run ONCE per bot interaction when entering Global Workspace

    const handleMigration = useCallback(async () => {
        const tid = toast.loading('Đang đồng bộ và tối ưu hóa dữ liệu...');
        try {
            await fetch(`${API_BASE_URL}/migrate_assets?property_id=${chatbotId || ''}&group_id=${categoryId || ''}&org_user_id=${orgUser?.id || ''}`);
            toast.success('Đã hoàn tất đồng bộ hóa tài liệu toàn cầu', { id: tid });
            fetchGlobalAssets();
        } catch (err) {
            toast.error('Lỗi đồng bộ hóa', { id: tid });
        }
    }, [API_BASE_URL, chatbotId, categoryId, fetchGlobalAssets]);






    const handleDeleteFromDb = useCallback(async (ids: any[]) => {
        setGlobalAssetIdsToDelete(ids);
        setIsDeleteGlobalModalOpen(true);
    }, []);

    const confirmDeleteGlobal = useCallback(async () => {
        setIsDeleteGlobalModalOpen(false);
        const ids = globalAssetIdsToDelete;
        if (ids.length === 0) return;

        const tid = toast.loading('Đang xóa tài liệu...');
        try {
            const res = await api.post<any>(`get_global_assets?action=delete&property_id=${chatbotId || ''}&org_user_id=${orgUser?.id || ''}`, { ids });
            if (res.success) {
                toast.success(res.message, { id: tid });
                fetchGlobalAssets();
                setSelectedGlobalDocs([]);
                setIsGlobalSelectMode(false);
            } else {
                toast.error(res.message || 'Lỗi khi xóa', { id: tid });
            }
        } catch (err) {
            toast.error('Lỗi khi xóa dữ liệu', { id: tid });
        } finally {
            setGlobalAssetIdsToDelete([]);
        }
    }, [globalAssetIdsToDelete, API_BASE_URL, chatbotId, fetchGlobalAssets]);

    // Load deleted images when sessionId changes
    useEffect(() => {
        if (!sessionId) return;
        try {
            const saved = localStorage.getItem(`deleted_imgs_${sessionId}`);
            if (saved) {
                setDeletedGalleryImages(JSON.parse(saved));
            } else {
                setDeletedGalleryImages([]);
            }
        } catch (e) {
            console.error("Failed to load deleted images", e);
            setDeletedGalleryImages([]);
        }
    }, [sessionId]);

    // Save deleted images when they change (with proper session tracking)
    useEffect(() => {
        if (sessionId) {
            localStorage.setItem(`deleted_imgs_${sessionId}`, JSON.stringify(deletedGalleryImages));
        }
    }, [deletedGalleryImages, sessionId]);

    // Auto-focus rename input when modal opens
    useEffect(() => {
        if (isRenameModalOpen && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenameModalOpen]);

    // Populate current title when rename modal opens
    useEffect(() => {
        if (renameSessionData) {
            setNewSessionTitle(renameSessionData.currentTitle);
        }
    }, [renameSessionData]);

    const handleDeleteGalleryImages = async (urls: string[]) => {
        if (!urls.length) return;
        if (!isGallerySelectMode && urls.length === 1) {
            setDeletingGalleryUrl(urls[0]);
        }
        setIsDeleteGalleryModalOpen(true);
    };

    const confirmDeleteGalleryImages = async () => {
        const urls = isGallerySelectMode ? selectedGalleryImages : (deletingGalleryUrl ? [deletingGalleryUrl] : []);
        if (!urls.length) return;

        const tid = toast.loading('Đang xóa ảnh...');
        try {
            const response: any = await api.post('ai_org_chatbot?action=workspace_delete_images', {
                conversation_id: remoteConvId || sessionId,
                property_id: activeBot?.id,
                urls: urls,
                org_user_id: orgUser?.id
            });

            if (response.success) {
                // Update UI state for all successfully deleted images
                setDeletedGalleryImages(prev => [...prev, ...urls]);
                setSelectedGalleryImages([]);
                setIsDeleteGalleryModalOpen(false);
                setDeletingGalleryUrl(null);
                setIsGallerySelectMode(false);

                // Show appropriate message based on result
                if (response.partial_success) {
                    toast.error(response.message || `Đã xóa ${response.deleted_count}/${urls.length} ảnh`, { id: tid, icon: '⚠️' });
                } else {
                    toast.success(response.message || 'Đã xóa tệp vĩnh viễn', { id: tid });
                }
            } else {
                toast.error(response.message || 'Lỗi khi xóa ảnh', { id: tid });
            }
        } catch (e: any) {
            console.error('Delete error:', e);
            toast.error(e?.message || 'Lỗi khi xóa ảnh', { id: tid });
        }
    };

    // Memoize gallery images computation for performance
    const galleryImages = useMemo(() => {
        const images: any[] = [];
        const seenUrls = new Set();
        [...messages].reverse().forEach(m => {
            if (m.attachments) {
                m.attachments.forEach(a => {
                    if (a.type.startsWith('image/') && (a.previewUrl || a.base64)) {
                        const url = a.previewUrl || a.base64 || '';
                        if (!seenUrls.has(url) && !deletedGalleryImages.includes(url)) {
                            seenUrls.add(url);
                            images.push({ src: url, name: a.name, type: 'upload' });
                        }
                    }
                });
            }
            const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let match;
            while ((match = regex.exec(m.content)) !== null) {
                const url = match[2];
                if (!seenUrls.has(url) && !deletedGalleryImages.includes(url)) {
                    seenUrls.add(url);
                    images.push({ src: url, name: match[1] || 'Generated Image', type: 'generated' });
                }
            }
        });
        return images;
    }, [messages, deletedGalleryImages]);

    useEffect(() => {
        (window as any).__deleteGalleryImage = (url: string) => {
            handleDeleteGalleryImages([url]);
        };
        (window as any).__editImage = async (url: string) => {
            const toastId = toast.loading('Đang tải ảnh...');
            try {
                let base64data = '';
                let type = 'image/jpeg';
                let size = 0;

                // For internal images, use the proxy to avoid CORS issues
                if (url.includes('/uploadss/')) {
                    try {
                        const res = await api.get<{ base64: string }>(`ai_org_chatbot?action=get_image_base64&url=${encodeURIComponent(url)}`);
                        if (res.success && res.data?.base64) {
                            const ext = url.split('.').pop()?.toLowerCase() || 'jpg';
                            type = ext === 'png' ? 'image/png' : 'image/jpeg';
                            base64data = `data:${type};base64,${res.data.base64}`;
                            size = Math.floor(res.data.base64.length * 3 / 4);
                        }
                    } catch (e) {
                        console.error("Proxy fetch error", e);
                    }
                }

                if (!base64data) {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    type = blob.type;
                    size = blob.size;
                    base64data = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                }

                const fileName = url.split('/').pop() || 'edit-image.png';
                const newAttachment: FileAttachment = {
                    id: `ref_${Date.now()}_${Math.random()}`,
                    name: fileName,
                    type: type,
                    size: size,
                    base64: base64data,
                    previewUrl: url
                };
                setAttachments(prev => [...prev, newAttachment]);
                setIsEditingImage(true);
                setIsImageGenMode(true);
                if (textareaRef.current) textareaRef.current.focus();
                toast.success('Hình ảnh đã được nạp để sửa!', { id: toastId });
            } catch (err) {
                console.error("Edit image error", err);
                toast.error('Không thể tải hình ảnh để sửa', { id: toastId });
            }
        };
        (window as any).__previewImage = (url: string) => {
            setPreviewImage(url);
        };
        return () => {
            delete (window as any).__deleteGalleryImage;
            delete (window as any).__editImage;
            delete (window as any).__previewImage;
        };
    }, [sessionId, remoteConvId, activeBot]);

    // --- Advanced UX States ---
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, doc: FileAttachment } | null>(null);
    const [quickLookDoc, setQuickLookDoc] = useState<FileAttachment | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [docWorkspaceView, setDocWorkspaceView] = useState<'code' | 'preview'>('code');
    const [workspaceFilter, setWorkspaceFilter] = useState<'saved' | 'drafts' | 'images'>('saved');

    // Stable ref so the unified effect always calls the latest fetchGlobalAssets
    // without adding it to the dep array (which caused double-call on viewMode change)
    const fetchGlobalAssetsRef = useRef(fetchGlobalAssets);
    useEffect(() => { fetchGlobalAssetsRef.current = fetchGlobalAssets; }, [fetchGlobalAssets]);

    // Unified Effect to fetch Global Assets for both Workspace View and Chat Sidebar
    useEffect(() => {
        if (!orgUser && !currentUser) return;
        // Skip on AI Agents tab — global assets are only needed in chat / workspace views
        if (viewMode === 'home') return;

        // Reset page when switching categories or bots to ensure fresh global data
        setGlobalPage(1);
        fetchGlobalAssetsRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, categoryId, activeBot?.id, workspaceFilter, globalTab, globalSourceFilter, globalSearch, globalPage, currentUser, orgUser]);

    // --- MULTI-SESSION STATE ---
    const [sessions, setSessions] = useState<Record<string, ChatSession[]>>({}); // Key: botId
    const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(new Set());
    const [lastLoadedFor, setLastLoadedFor] = useState<string | null>(null);

    // Unified logic for the storage user ID to isolate cache per user
    const storageUserId = useMemo(() => {
        return String(orgUser?.id || currentUser?.id || 'guest');
    }, [orgUser?.id, currentUser?.id]);

    // Load pinned sessions whenever the user changes
    useEffect(() => {
        const saved = localStorage.getItem(`pinned_sessions_${storageUserId}`);

        let next: Set<string>;
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                next = new Set(Array.isArray(loaded) ? loaded.map(String) : []);
            } catch (e) {
                console.error("Failed to parse pinned sessions", e);
                next = new Set();
            }
        } else {
            next = new Set();
        }

        setPinnedSessionIds(next);
        setLastLoadedFor(storageUserId);
    }, [storageUserId]);

    // Save pinned sessions whenever they change, but ONLY after a successful load for the current user
    useEffect(() => {
        if (lastLoadedFor !== storageUserId) return;

        localStorage.setItem(`pinned_sessions_${storageUserId}`, JSON.stringify(Array.from(pinnedSessionIds)));
    }, [pinnedSessionIds, storageUserId, lastLoadedFor]);

    const handleTogglePin = useCallback((sessId: any) => {
        const idStr = String(sessId);

        setPinnedSessionIds(prev => {
            const next = new Set(prev);
            const isUnpinning = next.has(idStr);

            // Side effects like toast should be outside the state updater.
            // Since we're in an event handler (handleTogglePin), we can safely
            // determine the action and then call setState + side effects.
            if (isUnpinning) {
                next.delete(idStr);
                // We'll call toast outside
            } else {
                next.add(idStr);
                // We'll call toast outside
            }
            return next;
        });

        // Determine toast message based on CURRENT state (before update is committed, 
        // but since we're in the handler it's fine)
        const currentlyPinned = pinnedSessionIds.has(idStr);
        if (currentlyPinned) {
            toast.success('Đã bỏ ghim hội thoại', { id: `pin-${idStr}` });
        } else {
            toast.success('Đã ghim hội thoại lên đầu', { id: `pin-${idStr}` });
        }
    }, [pinnedSessionIds]);

    // Auto-navigate to latest chat on mobile (only once on fresh entry)
    const hasAutoNavigatedRef = useRef(false);
    useEffect(() => {
        if (
            isMobile &&
            viewMode === 'home' &&
            !sessionId &&
            !hasAutoNavigatedRef.current &&
            !isManualNavigationRef.current &&
            Object.keys(sessions).length > 0 &&
            !loadingList
        ) {
            // Find the most recent session across all bots/sessions
            let latestSession: ChatSession | null = null;
            let latestBotId: string | null = null;

            Object.entries(sessions).forEach(([botId, botSessions]) => {
                if (botSessions && botSessions.length > 0) {
                    const session = botSessions[0];
                    const sessionDate = new Date((session as any).updated_at || (session as any).created_at || 0);
                    const latestDate = latestSession ? new Date((latestSession as any).updated_at || (latestSession as any).created_at || 0) : new Date(0);

                    if (!latestSession || (sessionDate > latestDate)) {
                        latestSession = session;
                        latestBotId = botId;
                    }
                }
            });

            if (latestSession && latestBotId) {
                hasAutoNavigatedRef.current = true;
                navigate(`/ai-space/${categoryId}/${latestBotId}/${(latestSession as any).id}`);
            }
        }
    }, [isMobile, viewMode, sessionId, sessions, categoryId, navigate, loadingList]);

    // --- OPTIMIZED ASSET EXTRACTION ---
    const extractedAssets = useMemo(() => {
        const images: FileAttachment[] = [];
        const files: FileAttachment[] = [];
        const seenUrls = new Set<string>();

        // Fast regex for markdown images
        const imgRegex = /!\[([^\]]*)\]\s*\(([^)]+)\)/g;

        const addAsset = (m: Message, a: Partial<FileAttachment>, typeOverride?: 'image' | 'file') => {
            const url = a.previewUrl || a.base64;
            if (!url || seenUrls.has(url) || deletedGalleryImages.includes(url)) return;

            seenUrls.add(url);
            const isImg = typeOverride === 'image' ||
                a.type?.startsWith('image/') ||
                /\.(jpg|jpeg|png|gif|svg|webp|avif)$/i.test(a.name || url);

            const finalAsset = {
                id: a.id || `ext_${Date.now()}_${Math.random()}`,
                name: a.name || (isImg ? 'AI Generated' : 'Untitled Doc'),
                type: a.type || (isImg ? 'image/png' : 'application/octet-stream'),
                size: a.size || 0,
                previewUrl: url,
                source: a.source || (m.role === 'assistant' ? 'chat_assistant' : 'chat_user'),
                createdAt: m.timestamp.toISOString()
            } as FileAttachment;

            if (isImg) images.push(finalAsset);
            else files.push(finalAsset);
        };

        const processMessage = (m: Message) => {
            if (m.attachments) m.attachments.forEach(att => addAsset(m, att));
            if (m.content && m.content.includes('![')) {
                let match;
                while ((match = imgRegex.exec(m.content)) !== null) {
                    addAsset(m, { name: match[1], previewUrl: match[2] }, 'image');
                }
            }
        };

        // 1. Current Session
        messages.forEach(processMessage);

        // 2. Historical Sessions
        const botSessions = activeBot?.id ? (sessions[activeBot.id] || []) : [];
        botSessions.forEach(s => {
            if (s.messages) s.messages.forEach(processMessage);
        });

        return { images, files };
    }, [messages, sessions, activeBot?.id, deletedGalleryImages]);

    const filteredWorkspaceDocs = useMemo(() => {
        const seenKeys = new Set<string>();
        const combined: FileAttachment[] = [];

        const addUnique = (doc: FileAttachment, defaultSource?: string) => {
            const key = doc.previewUrl || doc.base64 || doc.name;
            if (!key || seenKeys.has(key)) return;
            seenKeys.add(key);
            combined.push(defaultSource && !doc.source ? { ...doc, source: defaultSource } : doc);
        };

        // 1. Direct workspace & attachments (ONLY in chat view or if explicitly allowed)
        if (viewMode !== 'global_workspace') {
            workspaceDocs.forEach(d => addUnique(d));
            attachments.forEach(a => addUnique(a, 'user_attachment'));

            // 2. Extracted Chat Assets
            const chatPool = workspaceFilter === 'images' ? extractedAssets.images : extractedAssets.files;
            chatPool.forEach(a => addUnique(a));
        }

        // 3. Global Assets (Available everywhere)
        globalDbAssets.forEach(a => addUnique(a));

        // 4. Final Filter & Categorization
        return combined.filter(d => {
            const isImg = /\.(jpg|jpeg|png|gif|svg|webp|avif)$/i.test(d.name) || d.type?.startsWith('image/');
            const search = explorerSearchTerm.toLowerCase();
            if (search && !d.name.toLowerCase().includes(search)) return false;

            const isVirtual = d.previewUrl?.startsWith('virtual://') || d.name.startsWith('preview_');
            const isDraft = d.source === 'draft' || isVirtual;

            if (workspaceFilter === 'drafts') return isDraft;
            if (workspaceFilter === 'images') return isImg;
            return !isDraft && !isImg;
        });
    }, [workspaceDocs, attachments, extractedAssets, globalDbAssets, explorerSearchTerm, workspaceFilter]);

    const filteredChatbots = useMemo(() => {
        return chatbots.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [chatbots, searchTerm]);

    // Auto-close workspace in specialized modes - OPTIMIZED
    useEffect(() => {
        if (isResearchMode && isDocWorkspaceOpen) {
            const timer = setTimeout(() => {
                setIsDocWorkspaceOpen(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isResearchMode]);

    // Smart Follow-ups (Simple Logic)
    useEffect(() => {
        if (!isCodeMode) return;
        if (messages.length > 0 && !loadingChat && messages[messages.length - 1].role === 'assistant') {
            const lastMsg = messages[messages.length - 1];
            // Simple heuristic to mock smartness without backend change
            const newSuggestions = [
                "Summarize the key points",
                "Explain the technical details",
                "Provide real-world examples"
            ];
            if (lastMsg.content.includes("code") || lastMsg.content.includes("function") || isCodeMode) {
                newSuggestions[0] = "Refactor this code";
                newSuggestions[1] = "Explain this logic";
            }
            setSuggestedQuestions(newSuggestions);
        }
    }, [messages, loadingChat, isCodeMode]);


    // Debounced tab persistence
    useEffect(() => {
        if (!sessionId) return;
        const timer = setTimeout(() => {
            localStorage.setItem(`open_tabs_${sessionId}`, JSON.stringify(openTabNames));
        }, 500);
        return () => clearTimeout(timer);
    }, [openTabNames, sessionId]);


    const [isAiModeModalOpen, setIsAiModeModalOpen] = useState(false);

    const [zoomLevel, setZoomLevel] = useState(1);

    const [selectionRange, setSelectionRange] = useState<{ start: { r: number, c: number }, end: { r: number, c: number } } | null>(null);
    const [isSelectingCells, setIsSelectingCells] = useState(false);

    useEffect(() => {
        localStorage.setItem('isCodeMode', isCodeMode.toString());
        if (isCodeMode) {
            setIsDocWorkspaceOpen(true);
        }
    }, [isCodeMode]);

    useEffect(() => {
        localStorage.setItem('isResearchMode', isResearchMode.toString());
    }, [isResearchMode]);

    useEffect(() => {
        localStorage.setItem('isKbOnlyMode', isKbOnlyMode.toString());
    }, [isKbOnlyMode]);

    useEffect(() => {
        localStorage.setItem('autoTTS', autoTTS.toString());
    }, [autoTTS]);

    useEffect(() => {
        localStorage.setItem('isSidebarOpen', isSidebarOpen.toString());
    }, [isSidebarOpen]);

    useEffect(() => {
        localStorage.setItem('workspacePosition', workspacePosition);
    }, [workspacePosition]);

    // Global helper for opening workspace files from chat HTML
    useEffect(() => {
        (window as any).__openWorkspaceFile = (fileName: string) => {
            const doc = workspaceDocs.find(d => d.name === fileName);
            if (doc) {
                if (!openTabNames.includes(doc.name)) {
                    setOpenTabNames(prev => [...prev, doc.name]);
                }
                setActiveDoc(doc);
                setIsDocWorkspaceOpen(true);
            } else {
                // Try fuzzy match if needed (e.g. streaming vs final)
                const bestMatch = workspaceDocs.find(d => d.name.startsWith(fileName.split('.')[0]));
                if (bestMatch) {
                    if (!openTabNames.includes(bestMatch.name)) {
                        setOpenTabNames(prev => [...prev, bestMatch.name]);
                    }
                    setActiveDoc(bestMatch);
                    setIsDocWorkspaceOpen(true);
                }
            }
        };
        return () => { delete (window as any).__openWorkspaceFile; };
    }, [workspaceDocs, openTabNames]);

    // Global helper to preview raw code snippets in workspace
    useEffect(() => {
        (window as any).__previewCode = (name: string, content: string, lang: string) => {
            const fileName = name || `snippet_${Date.now()}.${lang || 'txt'}`;
            const newDoc: FileAttachment = {
                name: fileName,
                type: 'text/plain',
                size: content.length,
                content: content,
                previewUrl: 'virtual://' + fileName
            };
            setWorkspaceDocs(prev => {
                const exists = prev.findIndex(d => d.name === fileName);
                if (exists !== -1) {
                    const updated = [...prev];
                    updated[exists] = newDoc;
                    return updated;
                }
                return [...prev, newDoc];
            });
            setActiveDoc(newDoc);
            setIsDocWorkspaceOpen(true);
            if (!openTabNames.includes(fileName)) {
                setOpenTabNames(prev => [...prev, fileName]);
            }
        };

        // NEW: Load/Copy from DOM ID to avoid string escaping issues
        (window as any).__previewCodeFromId = (id: string, lang: string) => {
            const el = document.getElementById(id);
            if (!el) return;
            const content = el.innerText || el.textContent || '';
            (window as any).__previewCode(`snippet_${Date.now()}.${lang}`, content, lang);
        };

        (window as any).__copyCodeFromId = (id: string) => {
            const el = document.getElementById(id);
            if (!el) return;
            const content = el.innerText || el.textContent || '';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(content).then(() => toast.success('Đã sao chép!')).catch(() => fallbackCopy(content));
            } else {
                fallbackCopy(content);
            }
        };

        // Helper for fallback copy
        const fallbackCopy = (text: string) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                toast.success('Đã sao chép!');
            } catch (err) {
                toast.error('Lỗi sao chép');
            }
            document.body.removeChild(ta);
        };

        (window as any).__previewHtmlFromId = (id: string) => {
            const el = document.getElementById(id);
            if (!el) return;
            const content = el.innerText || el.textContent || '';
            (window as any).__previewHtml(content);
        };

        return () => {
            delete (window as any).__previewCode;
            delete (window as any).__previewCodeFromId;
            delete (window as any).__copyCodeFromId;
            delete (window as any).__previewHtmlFromId;
        };
    }, [openTabNames]);

    // Global helper for direct HTML preview from chat
    useEffect(() => {
        (window as any).__previewHtml = (content: string) => {
            const fileName = `preview_${Date.now()}.html`;
            const newDoc: FileAttachment = {
                name: fileName,
                type: 'text/html',
                size: content.length,
                content: content,
                previewUrl: 'virtual://' + fileName
            };
            setWorkspaceDocs(prev => [...prev, newDoc]);
            setActiveDoc(newDoc);
            setIsDocWorkspaceOpen(true);
            setDocWorkspaceView('preview');
            if (!openTabNames.includes(fileName)) {
                setOpenTabNames(prev => [...prev, fileName]);
            }
        };
        return () => { delete (window as any).__previewHtml; };
    }, [openTabNames]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const sidebarWidth = isSidebarOpen ? 275 : 0;
            const contentWidth = window.innerWidth - sidebarWidth;
            let newWidthPercent;

            if (workspacePosition === 'left') {
                // If on left, calculate from sidebar edge
                newWidthPercent = ((e.clientX - sidebarWidth) / contentWidth) * 100;
            } else {
                // If on right, calculate from right edge
                newWidthPercent = ((window.innerWidth - e.clientX) / contentWidth) * 100;
            }

            if (newWidthPercent > 5 && newWidthPercent < 95) {
                setWorkspaceWidth(newWidthPercent);
                localStorage.setItem('workspaceWidth', Math.round(newWidthPercent).toString());
            }
        }
    }, [isResizing, workspacePosition, isSidebarOpen]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const [expandedBotId, setExpandedBotId] = useState<string | null>(null);
    const [searchTermSessions, setSearchTermSessions] = useState('');

    // Text Selection States
    const [selectedChatText, setSelectedChatText] = useState('');
    const [chatSelectionCoords, setChatSelectionCoords] = useState<{ x: number, y: number } | null>(null);

    // Computed Recent Sessions (Global)

    const recentSessions = useMemo(() => {

        let all: (ChatSession & { botId: string, botName: string })[] = [];
        Object.entries(sessions).forEach(([bId, sessList]) => {
            const bot = chatbots.find(b => b.id === bId);
            if (bot && Array.isArray(sessList)) {
                sessList.forEach((s: ChatSession) => {
                    all.push({ ...s, botId: bId, botName: bot.name });
                });
            }
        });
        // Sort by pinned, then by date desc
        all.sort((a: any, b: any) => {
            const aPinned = pinnedSessionIds.has(String(a.id)) || (a.visitorId && pinnedSessionIds.has(String(a.visitorId)));
            const bPinned = pinnedSessionIds.has(String(b.id)) || (b.visitorId && pinnedSessionIds.has(String(b.visitorId)));
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
        });

        // Filter by search
        if (searchTermSessions.trim()) {
            return all.filter(s => s.title.toLowerCase().includes(searchTermSessions.toLowerCase()));
        }

        return all;
    }, [sessions, chatbots, searchTermSessions, pinnedSessionIds]);



    // Load sessions from local storage
    useEffect(() => {
        if (!currentUser) return;
        const key = `chat_sessions_${storageUserId}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) setSessions(JSON.parse(saved));
        } catch (e) { }
    }, [currentUser, storageUserId]);

    // Save sessions to local storage - DEBOUNCED for performance
    useEffect(() => {
        if (!currentUser) return;
        const key = `chat_sessions_${storageUserId}`;
        const timer = setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(sessions));
        }, 1000); // Debounce 1 second
        return () => clearTimeout(timer);
    }, [sessions, currentUser, storageUserId]);

    // --- FETCH SERVER SESSIONS ---
    useEffect(() => {
        const fetchServerSessions = async () => {
            const effectiveUserId = orgUser?.id || currentUser?.id;
            if (!effectiveUserId) return;
            try {
                const res = await api.get<any>(`ai_org_chatbot?action=list_conversations&user_id=${effectiveUserId}&visitor_id=${sessionId || ''}&org_user_id=${orgUser?.id || ''}`);
                if (res.success && Array.isArray(res.data)) {
                    // Safety: Only perform state updates if we've successfully loaded pins for this user 
                    // to avoid migrating against an empty/wrong set or overwriting during load.
                    const isPinsReady = lastLoadedFor === storageUserId;

                    // Group by botId
                    const grouped: Record<string, ChatSession[]> = {};
                    res.data.forEach((s: any) => {
                        // Backend returns property_id, frontend expects botId mapping
                        const bId = s.botId || s.property_id;
                        if (!bId) return;

                        // Normalize: backend already sends camelCase (createdAt, lastMessage, visitorId, botId)
                        // Also support snake_case fallback for compatibility
                        const normalizedSess: ChatSession = {
                            id: String(s.id),
                            visitorId: (s.visitorId || s.visitor_id) ? String(s.visitorId || s.visitor_id) : undefined,
                            title: s.title || 'New Conversation',
                            createdAt: (s.createdAt || s.created_at) ? new Date(s.createdAt || s.created_at).getTime() : Date.now(),
                            lastMessage: s.lastMessage || s.last_message
                        };

                        if (!grouped[bId]) grouped[bId] = [];
                        grouped[bId].push(normalizedSess);
                    });

                    setSessions(prev => {
                        const next = { ...prev };
                        Object.keys(grouped).forEach(bId => {
                            const existing = next[bId] || [];
                            const serverList = grouped[bId];

                            // Combine unique by ID or visitorId, preferring server data
                            const map = new Map();
                            existing.forEach(s => map.set(s.id, s));

                            serverList.forEach(s => {
                                // If the server session identifies itself with a visitorId that we have as a local session ID
                                // Remove the local one so we only keep the stable server one
                                if (s.visitorId && map.has(String(s.visitorId))) {
                                    map.delete(String(s.visitorId));
                                }
                                map.set(String(s.id), s);
                            });

                            next[bId] = Array.from(map.values()).sort((a: any, b: any) => b.createdAt - a.createdAt);
                        });
                        return next;
                    });

                    // Migrate pinned session IDs if needed (from visitorId to real ID)
                    if (res.data && res.data.length > 0 && isPinsReady) {
                        setPinnedSessionIds(prev => {
                            const next = new Set(prev);
                            let changed = false;
                            res.data.forEach((s: any) => {
                                const sid = String(s.id);
                                const vid = s.visitor_id ? String(s.visitor_id) : null;

                                // Migration case: temporary ID is pinned, permanent ID is not.
                                if (vid && next.has(vid) && !next.has(sid)) {
                                    next.delete(vid);
                                    next.add(sid);
                                    changed = true;
                                }
                                // Cleanup case: both are pinned (might happen if user pinned both), just keep permanent.
                                else if (vid && next.has(vid) && next.has(sid)) {
                                    next.delete(vid);
                                    changed = true;
                                }
                            });
                            return changed ? next : prev;
                        });
                    }
                }
            } catch (e) { console.error("Error fetching sessions", e); }
        };

        // If remoteConvId just changed from null to a value, add a small delay to ensure DB persistence
        const isNewConversation = !prevRemoteConvIdRef.current && remoteConvId;
        prevRemoteConvIdRef.current = remoteConvId;

        if (isNewConversation) {
            // Give backend 500ms to persist the conversation before fetching
            const timer = setTimeout(fetchServerSessions, 500);
            return () => clearTimeout(timer);
        } else {
            fetchServerSessions();
        }
        // sessionId removed from deps: it's only a URL param passed as visitor_id, not a trigger for re-listing.
        // remoteConvId changing (null → value) is the correct signal that a new conversation was saved.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, orgUser, remoteConvId]);

    // --- ADVANCED CONFIG (AUTO-ENABLED) ---
    const immersiveMode = true; // Always ON
    const unlimitedTokens = true; // Always ON

    // Save selected model to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('selectedAIModel', selectedModel);
    }, [selectedModel]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Smart auto-scroll: only scroll to bottom when user is near bottom
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    useEffect(() => {
        if (messagesEndRef.current && shouldAutoScrollRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [messages]);

    // Track scroll position to determine if we should auto-scroll (throttled for performance)
    const handleScroll = useCallback(() => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            shouldAutoScrollRef.current = isNearBottom;
        }
    }, []);

    // Throttle scroll handler to run max 10 times per second instead of 60+
    const throttledHandleScroll = useMemo(() => {
        let lastRun = 0;
        return () => {
            const now = Date.now();
            if (now - lastRun >= 100) { // 100ms = 10 times per second
                lastRun = now;
                handleScroll();
            }
        };
    }, [handleScroll]);

    const [spaceTheme, setSpaceTheme] = useState(() => localStorage.getItem('spaceTheme') || 'deep-space');

    useEffect(() => {
        localStorage.setItem('spaceTheme', spaceTheme);
    }, [spaceTheme]);

    const reuseMessage = useCallback((content: string, atts?: FileAttachment[]) => {
        setInput(content);
        if (atts && atts.length > 0) {
            setAttachments(atts.map(a => ({
                ...a,
                previewUrl: a.previewUrl || a.base64
            })));
        }
        toast.success('Đã tải lại tin nhắn để soạn thảo tiếp');
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    // Save image settings to localStorage
    // Debounced localStorage writes for better performance
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('imageProvider', imageProvider);
            localStorage.setItem('imageStyle', imageStyle);
            localStorage.setItem('imageSize', imageSize);
            localStorage.setItem('isImageGenMode', JSON.stringify(isImageGenMode));
            localStorage.setItem('isKbOnlyMode', JSON.stringify(isKbOnlyMode));
        }, 300);
        return () => clearTimeout(timer);
    }, [imageProvider, imageStyle, imageSize, isImageGenMode, isKbOnlyMode]);

    // Enforce mutual exclusivity between Code Mode and Image Generation
    const prevImageMode = useRef(isImageGenMode);
    const prevCodeMode = useRef(isCodeMode);

    useEffect(() => {
        if (isImageGenMode && !prevImageMode.current) {
            // Image mode was just turned ON
            if (isCodeMode) setIsCodeMode(false);
        }
        if (isCodeMode && !prevCodeMode.current) {
            // Code mode was just turned ON
            if (isImageGenMode) setIsImageGenMode(false);
        }
        prevImageMode.current = isImageGenMode;
        prevCodeMode.current = isCodeMode;
    }, [isImageGenMode, isCodeMode]);

    const [interimText, setInterimText] = useState(''); // [NEW] Realtime text
    const isInitialScrollRef = useRef(true);
    // DB WORKSPACE SYNC (with caching)

    // DB WORKSPACE SYNC (with caching)
    const workspaceCache = useRef<Map<string, { data: FileAttachment[], timestamp: number }>>(new Map());
    const CACHE_TTL = 30000; // 30 seconds

    const fetchWorkspaceDocs = useCallback(async (convId: string, forceRefresh = false, propertyIdOverride?: string) => {
        if (!orgUser && !currentUser) return;
        const targetBotId = propertyIdOverride || activeBot?.id;
        if (!targetBotId) return;

        // Check cache first
        const cached = workspaceCache.current.get(convId);
        if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setWorkspaceDocs(cached.data);
            return;
        }

        try {
            // Fetch conversation workspace docs + global training knowledge in parallel
            const [res, trainingRes] = await Promise.all([
                api.get<any>(`ai_org_chatbot?action=workspace_list&conversation_id=${convId}&property_id=${targetBotId}&org_user_id=${orgUser?.id || ''}`),
                api.get<any>(`ai_training?action=list_docs&property_id=${targetBotId}`).catch(() => ({ success: false, data: [] }))
            ]);

            let remoteDocs: FileAttachment[] = [];

            if (res.success && Array.isArray(res.data)) {
                remoteDocs = res.data.map((d: any) => ({
                    id: d.id,
                    name: d.file_name,
                    type: d.file_type,
                    size: d.file_size,
                    previewUrl: d.file_url,
                    conversationId: d.conversation_id,
                    propertyId: d.property_id,
                    source: d.source || 'user_attachment',
                    createdAt: d.created_at
                }));
            }

            // Merge global training docs (is_global_workspace = 1, source_type = 'upload')
            if (trainingRes?.success && Array.isArray(trainingRes?.data)) {
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

                // Prepend global training docs (no duplicates by name)
                const existingNames = new Set(remoteDocs.map(d => d.name));
                globalTrainingDocs.forEach(doc => {
                    if (!existingNames.has(doc.name)) {
                        remoteDocs.unshift(doc);
                        existingNames.add(doc.name);
                    }
                });
            }

            // Cache the result
            workspaceCache.current.set(convId, {
                data: remoteDocs,
                timestamp: Date.now()
            });

            setWorkspaceDocs(() => {
                const uniqueMap = new Map();
                remoteDocs.forEach(d => {
                    if (!uniqueMap.has(d.name)) {
                        uniqueMap.set(d.name, d);
                    }
                });
                return Array.from(uniqueMap.values());
            });

            if (remoteDocs.some(d => d.source !== 'global_training')) {
                const savedTabs = localStorage.getItem(`open_tabs_${sessionId}`);
                if (savedTabs) {
                    const tabs = JSON.parse(savedTabs);
                    setOpenTabNames(tabs);
                }
            }
        } catch (e) {
            console.error('Error fetching workspace docs', e);
        }
    }, [activeBot?.id, sessionId, currentUser, orgUser]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Đã sao chép');
    }, []);

    // Reactive Workspace Fetcher: Triggers when session or remote conversation ID changes
    useEffect(() => {
        // Prefer remoteConvId (server-side ID) over sessionId (local ID)
        // but only call once — whichever arrives first wins, the second is skipped
        const fetchTarget = remoteConvId || sessionId;
        if (fetchTarget && activeBot?.id && (viewMode === 'chat' || viewMode === 'global_workspace')) {
            const isActuallyDifferent = latestBotSessionFetchId.current > 0;
            fetchWorkspaceDocs(fetchTarget, isActuallyDifferent, activeBot.id);
        }
        // Only re-run when the *effective* target changes, not on every remoteConvId/sessionId flip
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remoteConvId ?? sessionId, activeBot?.id, viewMode, fetchWorkspaceDocs]);









    // --- INITIALIZATION ---

    useEffect(() => {
        if (chatbots.length > 0) {
            if (chatbotId) {
                const bot = chatbots.find(b => b.id === chatbotId || b.slug === chatbotId);
                if (bot) {
                    setViewMode('chat');

                    // Determine effective session ID
                    let effectiveSessionId = sessionIdParam;

                    // Check for SHARE LINK (Clone logic)
                    if (effectiveSessionId?.startsWith('share_')) {
                        const originalId = effectiveSessionId.replace('share_', '');
                        const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                        // Fetch original history and clone to new session
                        const cloneSession = async () => {
                            try {
                                const res = await api.get<any>(`ai_org_chatbot?action=get_conversation_history&visitor_id=${originalId}&property_id=${bot.id}&org_user_id=${orgUser?.id || ''}`);
                                if (res.success && Array.isArray(res.data)) {
                                    // Parse messages
                                    const clonedMessages: Message[] = res.data.map((msg: any) => {
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

                                    // Save to LocalStorage for new session
                                    localStorage.setItem(`chat_hist_${newSessionId}`, JSON.stringify(clonedMessages));

                                    // Redirect to new session
                                    const botTarget = bot.slug || chatbotId; // Prioritize slug
                                    navigate(`/ai-space/${categoryId}/${botTarget}/${newSessionId}`, { replace: true });
                                    toast.success('Đã sao chép cuộc trò chuyện từ liên kết chia sẻ');
                                } else {
                                    // Failed or empty, redirect to empty new session
                                    const botTarget = bot.slug || chatbotId;
                                    navigate(`/ai-space/${categoryId}/${botTarget}/${newSessionId}`, { replace: true });
                                    toast.error('Liên kết chia sẻ không hợp lệ hoặc đã hết hạn');
                                }
                            } catch (e) {
                                const botTarget = bot.slug || chatbotId;
                                navigate(`/ai-space/${categoryId}/${botTarget}/${newSessionId}`, { replace: true });
                                toast.error('Lỗi khi sao chép cuộc trò chuyện');
                            }
                        };

                        cloneSession();
                        return;
                    }

                    // If URL has no session ID, generate one and redirect
                    if (!effectiveSessionId) {
                        const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                        // Reset states for fresh chat
                        stopListening();
                        setIsImageGenMode(false);
                        setIsResearchMode(false);
                        setIsKbOnlyMode(true);
                        setIsEditingImage(false);
                        setAttachments([]);
                        setInput('');

                        const botTarget = bot.slug || chatbotId;
                        navigate(`/ai-space/${categoryId}/${botTarget}/${newId}`, { replace: true });
                        return; // Wait for redirect
                    }

                    // Only reload if we changed bot or session
                    if (activeBot?.id !== bot.id || sessionId !== effectiveSessionId) {
                        // Use requestAnimationFrame to defer loading until after render
                        requestAnimationFrame(() => {
                            loadChatbotDetails(bot, effectiveSessionId);
                        });
                    }
                } else {
                    setViewMode('home');
                    setActiveBot(null);
                }
            } else {
                const viewTarget = searchParams.get('view');
                if (viewTarget === 'global_workspace') {
                    setViewMode('global_workspace');
                } else {
                    setViewMode('home');
                }
                setActiveBot(null);
            }
        }
    }, [chatbotId, sessionIdParam, chatbots, categoryId, searchParams, orgUser, currentUser]);

    // NOTE: Scroll-to-bottom is now handled EXCLUSIVELY by the virtualizer in MessageList.tsx.
    // The old messagesEndRef.scrollIntoView was conflicting with the virtualizer's scrollToIndex,
    // causing a double-scroll / janky animation effect.

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // --- LOCAL STORAGE PERSISTENCE (Throttled) ---
    useEffect(() => {
        if (!sessionId) return;
        // Throttle localStorage saves to reduce I/O
        const timeoutId = setTimeout(() => {
            localStorage.setItem(`draft_msg_${sessionId}`, input);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [input, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        // Save draft attachments
        if (attachments.length > 0) {
            try {
                // If attachments are too large, don't save the heavy base64 to localStorage
                const safeAttachments = attachments.map(a => {
                    // If base64 is legacy/huge (> 1MB), strip it for the draft storage
                    if (a.base64 && a.base64.length > 1024 * 1024) {
                        return { ...a, base64: undefined };
                    }
                    return a;
                });
                localStorage.setItem(`draft_att_${sessionId}`, JSON.stringify(safeAttachments));
            } catch (e) {
                console.warn('LocalStorage quota exceeded for draft attachments');
                // Last ditch effort: save metadata only
                try {
                    const metaOnly = attachments.map(a => ({ ...a, base64: undefined }));
                    localStorage.setItem(`draft_att_${sessionId}`, JSON.stringify(metaOnly));
                } catch (inner) {
                    localStorage.removeItem(`draft_att_${sessionId}`);
                }
            }
        } else {
            localStorage.removeItem(`draft_att_${sessionId}`);
        }
    }, [attachments, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        // Save messages history
        if (messages.length > 0) {
            try {
                // Pre-clean messages to ensure NO base64 is saved to history (it should be server URLs only)
                const cleanMessages = messages.map(msg => ({
                    ...msg,
                    attachments: msg.attachments?.map(att => ({
                        ...att,
                        base64: (att.previewUrl && att.previewUrl.startsWith('http')) ? undefined : att.base64
                    }))
                }));
                localStorage.setItem(`chat_hist_${sessionId}`, JSON.stringify(cleanMessages));
            } catch (e) {
                // If QuotaExceededError, clean up older histories
                if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    console.warn('LocalStorage quota exceeded, cleaning up old histories...');
                    try {
                        // Remove all other chat histories except current
                        Object.keys(localStorage).forEach(key => {
                            if ((key.startsWith('chat_hist_') || key.startsWith('draft_att_') || key.startsWith('draft_msg_')) && !key.includes(sessionId)) {
                                localStorage.removeItem(key);
                            }
                        });
                        // Try saving metadata-only version
                        const metaOnlyMessages = messages.map(msg => ({
                            ...msg,
                            attachments: msg.attachments?.map(att => ({ ...att, base64: undefined }))
                        }));
                        localStorage.setItem(`chat_hist_${sessionId}`, JSON.stringify(metaOnlyMessages));
                    } catch (innerError) {
                        console.error('Failed to save to localStorage even after cleanup');
                    }
                }
            }
        }
    }, [messages, sessionId]);

    // PERSIST Workspace Docs to LocalStorage (as draft/cache)
    useEffect(() => {
        if (!sessionId) return;
        if (workspaceDocs.length > 0) {
            localStorage.setItem(`workspace_docs_${sessionId}`, JSON.stringify(workspaceDocs));
        } else {
            localStorage.removeItem(`workspace_docs_${sessionId}`);
        }
    }, [workspaceDocs, sessionId]);

    // DISABLED: This was creating thousands of duplicate records
    // Files are already saved via workspace_upload endpoint when uploaded
    // No need to re-save them every time remoteConvId changes
    /*
    useEffect(() => {
        if (remoteConvId && workspaceDocs.length > 0 && activeBot) {
            workspaceDocs.forEach(doc => {
                if (doc.previewUrl?.startsWith('http')) {
                    api.post('ai_org_chatbot?action=workspace_save', {
                        conversation_id: remoteConvId,
                        property_id: activeBot.id,
                        name: doc.name,
                        type: doc.type,
                        size: doc.size,
                        url: doc.previewUrl
                    });
                }
            });
        }
    }, [remoteConvId]);
    */



    // Persist Active Doc (Simple)
    useEffect(() => {
        if (activeDoc && sessionId) {
            localStorage.setItem(`active_doc_${sessionId}`, activeDoc.name);
        }
    }, [activeDoc, sessionId]);

    // --- API CALLS ---
    const { data: chatbotsData, isLoading: isLoadingBots, isError: isErrorBots } = useChatbots(categoryId);
    const { data: categorySettingsData, isLoading: isLoadingCatSettings, isError: isErrorCatSettings } = useCategorySettings(categoryId);

    useEffect(() => {
        if (chatbotsData) setChatbots(chatbotsData);
    }, [chatbotsData, setChatbots]);

    useEffect(() => {
        if (categorySettingsData) setCategorySettings(categorySettingsData);
    }, [categorySettingsData, setCategorySettings]);

    // Update loading states
    useEffect(() => {
        setLoadingList(isLoadingBots);
    }, [isLoadingBots, setLoadingList]);

    useEffect(() => {
        setIsLoadingSettings(isLoadingCatSettings);
        if (isErrorBots || isErrorCatSettings) {
            setHasNetworkError(true);
        }
    }, [isLoadingCatSettings, setIsLoadingSettings, isErrorBots, isErrorCatSettings]);

    const loadChatbotDetails = useCallback(async (bot: ChatbotInfo, targetSessionId: string) => {
        const fetchId = ++latestBotSessionFetchId.current;
        isInitialScrollRef.current = true; // Reset for new bot

        // 0. CLEAR STATE IMMEDIATELY to prevent bleed-through
        setActiveDoc(null);
        setWorkspaceDocs([]);
        setGlobalDbAssets([]);
        setOpenTabNames([]);
        setRemoteConvId(null);
        setSessionId(targetSessionId);

        try {
            const settingsRes = await api.get<any>(`ai_training?action=get_settings&property_id=${bot.id}`);
            if (fetchId !== latestBotSessionFetchId.current) return;
            const fullBot = {
                ...bot,
                settings: settingsRes.success ? settingsRes.data : {
                    bot_name: bot.name,
                    brand_color: '#ffa900',
                    bot_avatar: '',
                    welcome_msg: 'Tôi s?n sàng h? tr?.'
                }
            };
            setActiveBot(fullBot);
            setExpandedBotId(bot.id); // Auto expand

            // 1. Try to load from Local Storage first (Instant Display) - Batched for performance
            let localMsgs: Message[] = [];
            try {
                // Batch localStorage reads to reduce I/O overhead
                const keys = [
                    `chat_hist_${targetSessionId}`,
                    `draft_msg_${targetSessionId}`,
                    `draft_att_${targetSessionId}`,
                    `open_tabs_${targetSessionId}`,
                    `workspace_docs_${targetSessionId}`
                ];
                const [localHistory, localDraftMsg, localDraftAtt, savedTabs, savedDocs] = keys.map(k => localStorage.getItem(k));

                if (localHistory) {
                    localMsgs = JSON.parse(localHistory);
                    localMsgs.forEach((m: any) => m.timestamp = new Date(m.timestamp));
                    setMessages(localMsgs);
                } else {
                    setMessages([]);
                }

                if (localDraftMsg) setInput(localDraftMsg);
                else setInput('');

                if (localDraftAtt) setAttachments(JSON.parse(localDraftAtt));
                else setAttachments([]);

                if (savedDocs) {
                    const docs = JSON.parse(savedDocs);
                    setWorkspaceDocs(docs);
                    if (savedTabs) {
                        const tabs = JSON.parse(savedTabs);
                        setOpenTabNames(tabs);
                    }
                }

            } catch (e) { console.error('Error loading legacy', e); }

            if (!orgUser && !currentUser) return; // Skip remote history for guest mode

            // CHECK CONVERSATION ACCESS: detect if this is a public shared conversation from another user
            if (targetSessionId && activeBot) {
                try {
                    const accessRes = await api.get<any>(`ai_org_chatbot?action=check_conversation_access&conversation_id=${targetSessionId}&org_user_id=${orgUser?.id || ''}`) as any;
                    if (accessRes.success) {
                        if (accessRes.access === 'owner') {
                            // Own conversation - update isConvPublic state
                            setIsConvPublic(!!accessRes.is_public);
                        } else if (accessRes.access === 'public') {
                            // Public conversation from another user - show duplicate modal
                            setDuplicateSourceConvId(targetSessionId);
                            setDuplicateSourceTitle(accessRes.title || 'Cuộc trò chuyện');
                            setIsDuplicateModalOpen(true);
                        }
                        // 'denied' or 'not_found' - backend already returns 403
                    }
                } catch (e) { /* silent */ }
            }

            try {
                // Fetch history using the unique session ID as visitor_id
                // LOAD INITIAL 10 MESSAGES
                const historyRes = await api.get<any>(`ai_org_chatbot?action=get_conversation_history&visitor_id=${targetSessionId}&property_id=${bot.id}&limit=10&offset=0&org_user_id=${orgUser?.id || ''}`);
                if (fetchId !== latestBotSessionFetchId.current) return;

                if (historyRes.success) {
                    const hData = historyRes as any;
                    setCanLoadMore(hData.has_more); // Update pagination state

                    const convIdToFetch = hData.conversation_id || targetSessionId;
                    setRemoteConvId(hData.conversation_id || null);
                    setChatSummary(hData.summary || null);
                    // fetchWorkspaceDocs will be called by the reactive effect (line 1703)
                    // when remoteConvId changes — no need to call it here explicitly.

                    // ORPHAN SESSION DETECTION:
                    // If server has no conversation record (hData.conversation_id = null)
                    // AND history is empty AND local cache is also empty
                    // → this session was deleted externally (e.g. from another tab/device/user)
                    // → auto-redirect to a fresh new session instead of showing dead-end empty chat
                    const hasLocalCache = localMsgs.length > 0;
                    const isOrphanSession = !hData.conversation_id &&
                        (!Array.isArray(historyRes.data) || historyRes.data.length === 0) &&
                        !hasLocalCache &&
                        !targetSessionId.startsWith('sess_');

                    if (isOrphanSession && (orgUser || currentUser)) {
                        // Clean up stale session from sidebar state
                        setSessions((prev: any) => {
                            const next = { ...prev };
                            if (next[bot.id]) {
                                next[bot.id] = next[bot.id].filter((s: any) =>
                                    s.id !== targetSessionId && s.visitorId !== targetSessionId
                                );
                            }
                            return next;
                        });
                        // Navigate to a fresh new session
                        const newId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const botTarget = bot.slug || bot.id;
                        toast('Hội thoại này đã bị xóa. Đang mở cuộc trò chuyện mới…', { icon: '🔄', duration: 3000 });
                        navigate(`/ai-space/${categoryId}/${botTarget}/${newId}`, { replace: true });
                        return;
                    }

                    if (historyRes.success && Array.isArray(historyRes.data) && historyRes.data.length > 0) {
                        // Convert DB messages to UI format
                        const loadedMessages: Message[] = historyRes.data.map((msg: any) => {
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

                        // COMPRESSION CHECK: Only update if server data differs from local cache to prevent re-render flicker
                        const localIds = localMsgs.map(m => m.id).join(',');
                        const loadIds = loadedMessages.map(m => m.id).join(',');

                        if (localIds !== loadIds || localMsgs.length !== loadedMessages.length || (localMsgs.length > 0 && localMsgs[localMsgs.length - 1].content !== loadedMessages[loadedMessages.length - 1].content)) {
                            setMessages(loadedMessages);
                            // Sync formatted messages back to LS
                            localStorage.setItem(`chat_hist_${targetSessionId}`, JSON.stringify(loadedMessages));
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to load remote history', e);
            }
        } catch (e) { toast.error('Lỗi tải thông tin bot'); }
    }, [categoryId, fetchWorkspaceDocs, orgUser, currentUser]);

    const handleMakeGlobal = useCallback(async (file: FileAttachment) => {
        if (!activeBot || !file.previewUrl) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(fileExt);

        const toastId = toast.loading('Đang thêm vào tài nguyên toàn cầu...');
        try {
            await api.post('ai_org_chatbot', {
                action: 'workspace_save', // Using workspace_save to ensure it's in both local and global
                url: file.previewUrl,
                name: file.name,
                type: file.type || (isImage ? 'image/png' : 'application/octet-stream'),
                size: file.size || 0,
                property_id: activeBot.id,
                conversation_id: remoteConvId || sessionId,
                source: 'workspace',
                org_user_id: orgUser?.id
            });

            toast.success('Đã thêm vào tài nguyên toàn cầu!', { id: toastId });

            // If it's an image and we are in global workspace, switch to images tab
            if (isImage && viewMode === 'global_workspace') {
                setGlobalTab('images');
            }

            // Refresh global assets and local workspace
            if (typeof fetchGlobalAssets === 'function') {
                fetchGlobalAssets();
            }
            fetchWorkspaceDocs(remoteConvId || sessionId, true);

        } catch (e) {
            toast.error('Lỗi khi thêm vào tài nguyên', { id: toastId });
        }
    }, [activeBot, remoteConvId, sessionId, viewMode, fetchGlobalAssets, fetchWorkspaceDocs]);

    // Helper to start a completely new chat from Sidebar
    const handleNewChat = useCallback((e: React.MouseEvent, bot: ChatbotInfo) => {
        e.stopPropagation();

        // Abort any ongoing generation
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Reset all specialized modes for a fresh start
        stopListening();
        setIsImageGenMode(false);
        setIsResearchMode(false);
        setIsKbOnlyMode(true);
        setIsEditingImage(false);
        setIsConvPublic(false);
        setAttachments([]);
        setActiveDoc(null);
        setIsDocWorkspaceOpen(false);
        setInput('');

        // CRITICAL: Clear conversation data so old chat doesn't persist
        setMessages([]);
        setWorkspaceDocs([]);
        setOpenTabNames([]);
        setLoadingChat(false);
        setSessionId(newSessionId);
        setRemoteConvId(null);
        isInitialScrollRef.current = true;

        // Navigate to new session ID immediately
        isManualNavigationRef.current = true; // Block race
        const botTarget = bot.slug || bot.id;
        navigate(`/ai-space/${categoryId}/${botTarget}/${newSessionId}`);
        // The useEffect will handle loading

    }, [categoryId]);

    const handleDeleteSession = useCallback((e: React.MouseEvent, botId: string, sessId: string) => {
        e.stopPropagation();
        setSessionToDelete({ botId, sessId });
    }, []);

    const handleEditSessionTitle = useCallback((botId: string, sessId: string, currentTitle: string) => {
        setRenameSessionData({ botId, sessionId: sessId, currentTitle });
        setNewSessionTitle(currentTitle);
        setIsRenameModalOpen(true);
        // Focus input after modal opens
        setTimeout(() => renameInputRef.current?.focus(), 100);
    }, []);

    // confirmRenameSession was redundant and has been merged into handleRenameSession

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;
        const { botId, sessId } = sessionToDelete;

        const tid = toast.loading('Đang xóa cuộc trò chuyện...');
        try {
            // Updated to use the comprehensive delete_conversation action
            const res = await api.post<any>('ai_org_chatbot?action=delete_conversation', {
                conversation_id: sessId,
                property_id: botId,
                org_user_id: orgUser?.id
            });
            if (res.success) {
                toast.success('Đã xóa cuộc trò chuyện', { id: tid });

                // UI update and cleanup ONLY on success
                setSessions(prev => ({
                    ...prev,
                    [botId]: (prev[botId] || []).filter(s => s.id !== sessId)
                }));

                // Cleanup pinned state if needed
                setPinnedSessionIds(prev => {
                    if (prev.has(sessId)) {
                        const next = new Set(prev);
                        next.delete(sessId);
                        return next;
                    }
                    return prev;
                });

                // If we are deleting the CURRENT session, go home
                if (sessionId === sessId) {
                    setMessages([]);
                    setInput('');
                    setAttachments([]);
                    setActiveDoc(null);
                    setWorkspaceDocs([]);
                    setOpenTabNames([]);
                    setViewMode('home');
                    setActiveBot(null);
                    navigate(`/ai-space/${categoryId}`);
                }

                // Clean LocalStorage for the SPECIFIC session being deleted
                localStorage.removeItem(`chat_hist_${sessId}`);
                localStorage.removeItem(`draft_msg_${sessId}`);
                localStorage.removeItem(`draft_att_${sessId}`);
                localStorage.removeItem(`open_tabs_${sessId}`);
                localStorage.removeItem(`workspace_docs_${sessId}`);
                localStorage.removeItem(`active_doc_${sessId}`);
                localStorage.removeItem(`deleted_imgs_${sessId}`);
                localStorage.removeItem(`doc_scroll_${sessId}`);
            } else {
                toast.error(res.message || 'Lỗi khi xóa cuộc trò chuyện', { id: tid });
            }
        } catch (e) {
            console.error("Session delete error", e);
            toast.error('Lỗi kết nối khi xóa', { id: tid });
        }

        setSessionToDelete(null);
    };

    const handleExportChat = useCallback(() => {
        const text = messages.map(m => `[${m.role.toUpperCase()}] ${new Date().toLocaleTimeString()}\n${m.content}`).join('\n\n---\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_export_${sessionId}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Đã xuất nội dung cuộc trò chuyện');
    }, [messages, sessionId]);

    // Handle share conversation (toggle public/private)
    const handleShareConversation = useCallback(async () => {
        // Guard: conversation must exist and have started
        if (!remoteConvId && !sessionId) {
            toast.error('⚠️ Chưa có cuộc hội thoại. Hãy gửi tin nhắn trước khi chia sẻ.');
            return;
        }
        if (!messages || messages.length === 0) {
            toast.error('💬 Cuộc hội thoại chưa có tin nhắn. Hãy bắt đầu trò chuyện trước.');
            return;
        }

        const convId = remoteConvId || sessionId;
        const newPublicState = !isConvPublic;
        const tid = toast.loading('Đang cập nhật quyền chia sẻ...');
        try {
            const res = await api.post<any>('ai_org_chatbot', {
                action: 'share_conversation',
                conversation_id: convId,
                is_public: newPublicState,
                org_user_id: orgUser?.id,
                property_id: activeBot?.id
            }) as any;
            if (res.success) {
                setIsConvPublic(newPublicState);
                if (newPublicState) {
                    setShareConvUrl(res.share_url || window.location.href);
                    setIsShareConvModalOpen(true);
                    toast.success('🔗 Cuộc trò chuyện đã được chia sẻ công khai', { id: tid });
                } else {
                    toast.success('🔒 Đã đặt về chế độ riêng tư', { id: tid });
                }
            } else {
                // Show specific error messages based on API error code
                const errCode = res.error || '';
                if (errCode === 'NOT_OWNER' || errCode === 'FORBIDDEN') {
                    toast.error('🚫 Bạn không có quyền chia sẻ cuộc hội thoại này (không phải của bạn).', { id: tid });
                } else if (errCode === 'NOT_FOUND' || errCode === 'CONVERSATION_NOT_FOUND') {
                    toast.error('❌ Không tìm thấy cuộc hội thoại này. Có thể đã bị xóa.', { id: tid });
                } else if (errCode === 'EMPTY_CONVERSATION') {
                    toast.error('💬 Cuộc hội thoại chưa có tin nhắn. Hãy bắt đầu trò chuyện trước.', { id: tid });
                } else if (errCode === 'UNAUTHORIZED') {
                    toast.error('🔐 Bạn cần đăng nhập để chia sẻ cuộc hội thoại.', { id: tid });
                } else {
                    toast.error(res.message || 'Không thể chia sẻ cuộc trò chuyện', { id: tid });
                }
            }
        } catch (e) {
            toast.error('Không thể chia sẻ cuộc trò chuyện. Kiểm tra kết nối và thử lại.', { id: tid });
        }
    }, [remoteConvId, sessionId, isConvPublic, orgUser, activeBot, messages]);


    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input/textarea
            const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);

            // Meta (Command) or Ctrl key shortcuts
            if (e.ctrlKey || e.metaKey) {
                // Ctrl + K: Toggle Search
                if (e.key.toLowerCase() === 'k') {
                    e.preventDefault();
                    setIsChatSearchOpen(prev => {
                        if (!prev) setChatSearchTerm('');
                        return !prev;
                    });
                    return;
                }

                // Ctrl + /: Toggle Sidebar
                if (e.key === '/') {
                    e.preventDefault();
                    setIsSidebarOpen(prev => !prev);
                    return;
                }

                // Ctrl + .: Toggle Workspace
                if (e.key === '.') {
                    e.preventDefault();
                    setIsDocWorkspaceOpen(prev => !prev);
                    return;
                }
            }

            // Alt key shortcuts (Safer for modes and theme)
            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                const k = e.key.toLowerCase();
                if (k === 'l') { e.preventDefault(); setIsDarkTheme(prev => !prev); return; }
                if (k === 'i') { e.preventDefault(); setIsResearchMode(prev => !prev); return; }
                if (k === 'g') { e.preventDefault(); setIsImageGenMode(prev => !prev); return; }
                if (k === 'b') { e.preventDefault(); setIsKbOnlyMode(prev => !prev); return; }
                if (k === 'm') { e.preventDefault(); setIsCodeMode(prev => !prev); return; }
                if (k === 'z') { e.preventDefault(); setIsZenMode(prev => !prev); return; }
                if (k === 'n') {
                    e.preventDefault();
                    if (activeBot) {
                        handleNewChat(e as any, activeBot);
                    } else {
                        toast.error('Vui lòng chọn một AI Agent trước');
                    }
                    return;
                }
            }

            // Global shortcuts (non-typing)
            if (!isTyping) {
                // ?: Open Help
                if (e.key === '?') {
                    e.preventDefault();
                    setIsKeyboardHelpOpen(true);
                    return;
                }
            }

            // Global Esc
            if (e.key === 'Escape') {
                setIsChatSearchOpen(false);
                setIsKeyboardHelpOpen(false);
                setIsProfileOpen(false);
                setIsModelModalOpen(false);
                setIsImageSettingsOpen(false);
                setIsTrainingOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsChatSearchOpen, setIsKeyboardHelpOpen, setIsSidebarOpen, setIsDocWorkspaceOpen, setIsDarkTheme, setIsResearchMode, setIsImageGenMode, setIsKbOnlyMode, setIsCodeMode, setIsZenMode, setIsProfileOpen, setIsModelModalOpen, setIsImageSettingsOpen, setIsTrainingOpen, handleNewChat, activeBot]);

    // Handle duplicate a public conversation
    const handleDuplicateConversation = useCallback(async () => {
        if (!duplicateSourceConvId) return;
        setIsDuplicating(true);
        const tid = toast.loading('Đang sao chép cuộc trò chuyện...');
        try {
            const res = await api.post<any>('ai_org_chatbot', {
                action: 'duplicate_conversation',
                conversation_id: duplicateSourceConvId,
                org_user_id: orgUser?.id,
                property_id: activeBot?.id
            }) as any;
            if (res.success) {
                setIsDuplicateModalOpen(false);
                toast.success(`✅ Đã tạo bản sao "${res.title}" với ${res.message_count} tin nhắn`, { id: tid });
                // Navigate to new conversation
                if (activeBot && res.new_visitor_id) {
                    const path = `/ai-space/${categorySlugOrId}/${activeBot.slug || activeBot.id}/${res.new_visitor_id}`;
                    navigate(path);
                }
            } else {
                toast.error(res.message || 'Không thể duplicate', { id: tid });
            }
        } catch (e) {
            toast.error('Lỗi khi duplicate cuộc trò chuyện', { id: tid });
        } finally {
            setIsDuplicating(false);
        }
    }, [duplicateSourceConvId, orgUser, activeBot, categorySlugOrId, navigate]);

    const confirmClearWorkspace = async () => {
        const tid = toast.loading('Đang dọn dẹp Workspace...');
        try {
            await api.post('ai_org_chatbot?action=workspace_clear_all', {
                conversation_id: remoteConvId || sessionId,
                property_id: activeBot?.id,
                org_user_id: orgUser?.id
            });
            setWorkspaceDocs([]);
            setOpenTabNames([]);
            setActiveDoc(null);
            toast.success('Đã dọn dẹp sạch Workspace', { id: tid });
        } catch (e) {
            toast.error('Lỗi khi dọn dẹp Workspace', { id: tid });
        } finally {
            setIsClearModalOpen(false);
        }
    };





    const removeAttachment = useCallback((index: number) => {
        setAttachments(prev => {
            const newAtts = prev.filter((_, i) => i !== index);
            if (newAtts.length === 0) {
                setIsEditingImage(false);
            }
            return newAtts;
        });
    }, [setAttachments, setIsEditingImage]);


    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Allow Shift + Enter for new lines
                return;
            } else {
                // Regular Enter sends the message
                // For Vietnamese IME: sometimes Enter is used to finish a word.
                // If it's Enter without Shift, we want to send.
                e.preventDefault();

                // If currently composing, we might want to wait a split second for the IME to finish
                if (e.nativeEvent.isComposing) {
                    setTimeout(() => handleSend(), 100);
                } else {
                    handleSend();
                }
            }
        }
    }, [handleSend]);

    const handleToggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening(txt => setInput(prev => prev + (prev ? ' ' : '') + txt));
        }
    }, [isListening, stopListening, startListening, setInput]);

    const handleChatMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectedChatText(selection.toString().trim());
            setChatSelectionCoords({
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        }
    }, [setSelectedChatText, setChatSelectionCoords]);

    const handleChatClick = useCallback(() => {
        if (!window.getSelection()?.toString()) {
            setChatSelectionCoords(null);
        }
    }, [setChatSelectionCoords]);

    const handleOpenOrgSettings = useCallback(() => {
        setTargetEditUserId(null);
        setIsOrgManagerOpen(true);
    }, [setTargetEditUserId, setIsOrgManagerOpen]);

    // Rename Session Handler
    const handleRenameSession = async () => {
        if (!renameSessionData || !newSessionTitle.trim()) {
            toast.error('Vui lòng nhập tên cuộc hội thoại');
            return;
        }

        const tid = toast.loading('Đang đổi tên...');
        try {
            const data = await api.post<any>('ai_org_chatbot', {
                action: 'rename_conversation',
                conversation_id: renameSessionData.sessionId,
                property_id: renameSessionData.botId,
                title: newSessionTitle.trim(),
                org_user_id: orgUser?.id
            });

            if (data.success) {
                toast.success(`Đã đổi tên thành "${newSessionTitle.trim()}"`, { id: tid });

                // Update UI state immediately instead of reloading
                setSessions(prev => {
                    const botId = renameSessionData.botId;
                    const sessionId = renameSessionData.sessionId;

                    if (!prev[botId]) return prev;

                    return {
                        ...prev,
                        [botId]: prev[botId].map(s =>
                            s.id === sessionId ? { ...s, title: newSessionTitle.trim() } : s
                        )
                    };
                });

                // Close modal
                setIsRenameModalOpen(false);
                setRenameSessionData(null);
                setNewSessionTitle('');

            } else {
                toast.error(data.message || 'Không thể đổi tên', { id: tid });
            }
        } catch (error: any) {
            console.error('Rename error:', error);
            toast.error('Lỗi kết nối khi đổi tên', { id: tid });
        }
    };



    // Logout Handler
    const handleLogout = async () => {
        try {
            // Use the centralized logout function from context
            await logoutOrgUser();

            // Also clear potentially legacy or additional tokens if any (optional but safe)
            localStorage.removeItem('orgUser'); // Use the same key as context
            localStorage.removeItem('org_user');
            localStorage.removeItem('org_token');

            // Show success message
            toast.success('Đã đăng xuất thành công');

            // Redirect to login page
            navigate(`/ai-space/${categorySlugOrId}/login`, { replace: true });
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Lỗi khi đăng xuất");
        }
    };


    // PDF Navigation Bridge
    // Moved to FilePreview component

    const handleSaveSnippet = useCallback((docToSave: FileAttachment) => {
        if (!docToSave || !docToSave.previewUrl?.startsWith('virtual://')) return;
        setSnippetToSave(docToSave);
        setShowSaveSnippetModal(true);
    }, []);

    const confirmSaveSnippet = async (newName: string) => {
        if (!snippetToSave || !newName.trim()) return;

        const snippet = snippetToSave;
        const blob = new Blob([snippet.content || ''], { type: 'text/plain' });
        // Use a File object for upload
        const file = new File([blob], newName, { type: 'text/plain' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', remoteConvId || sessionId);
        if (activeBot && activeBot.id) {
            formData.append('property_id', activeBot.id);
        }
        if (orgUser?.id) {
            formData.append('org_user_id', orgUser.id.toString());
        }

        const tid = toast.loading('Đang lưu document...');
        try {
            const uploadRes = await fetch(api.baseUrl + '/ai_org_chatbot.php?action=workspace_upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (uploadData.success && uploadData.url) {
                const finalUrl = uploadData.url;
                const finalName = uploadData.name || newName;
                const type = 'text/' + (finalName.split('.').pop() || 'plain');

                // Save metadata
                await api.post('ai_org_chatbot.php', {
                    action: 'workspace_save',
                    conversation_id: remoteConvId || sessionId,
                    property_id: activeBot?.id,
                    name: finalName,
                    type: type,
                    size: blob.size,
                    url: finalUrl,
                    org_user_id: orgUser?.id
                });

                // Update workspaceDocs
                setWorkspaceDocs(prev => prev.map(d => d.name === snippet.name ? { ...d, name: finalName, previewUrl: finalUrl } : d));
                // Update activeDoc if it matches
                if (activeDoc?.name === snippet.name) {
                    setActiveDoc(prev => prev ? { ...prev, name: finalName, previewUrl: finalUrl } : null);
                }

                toast.success(`Đã lưu "${finalName}" vào Workspace`, { id: tid });
            } else {
                toast.error(uploadData.message || uploadData.error || "Upload failed", { id: tid });
            }
        } catch (err) {
            console.error("Failed to save snippet", err);
            toast.error("Lỗi kết nối khi lưu snippet", { id: tid });
        }
    };

    const renderDocumentPreview = () => {
        if (!activeDoc) return null;

        return (
            <FilePreview
                activeDoc={activeDoc}
                activeBot={activeBot}
                sessionId={sessionId}
                remoteConvId={remoteConvId}
                currentUser={currentUser}
                onUpdateDoc={(updatedDoc) => {
                    // Update workspaceDocs
                    setWorkspaceDocs(prev => prev.map(d => d.name === updatedDoc.name ? updatedDoc : d));
                    // Update activeDoc if it matches
                    if (activeDoc?.name === updatedDoc.name) {
                        setActiveDoc(updatedDoc);
                    }
                }}
                setInput={setInput}
                isDocWorkspaceOpen={isDocWorkspaceOpen}
                isCodeMode={isCodeMode}
            />
        );
    };

    // Markdown Render Wrapper (using utility)
    const renderMarkdown = useCallback((text: string, messageId?: string) => {
        return utilityRenderMarkdown(text, messageId, deletedGalleryImages);
    }, [deletedGalleryImages]);

    const handleChatScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (scrollTop === 0 && canLoadMore && !loadingHistory && activeBot) {
            setLoadingHistory(true);
            const currentHeight = e.currentTarget.scrollHeight;

            try {
                const offset = messages.length;
                const historyRes = await api.get<any>(`ai_org_chatbot?action=get_conversation_history&visitor_id=${sessionId}&property_id=${activeBot.id}&limit=10&offset=${offset}&org_user_id=${orgUser?.id || ''}`);

                if (historyRes.success) {
                    setCanLoadMore((historyRes as any).has_more);

                    if (historyRes.success && Array.isArray(historyRes.data) && historyRes.data.length > 0) {
                        const olderMessages: Message[] = historyRes.data.map((msg: any) => {
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

                        // Prepend older messages (with dedup to avoid duplicate keys)
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const uniqueOlder = olderMessages.filter(m => !existingIds.has(m.id));
                            return [...uniqueOlder, ...prev];
                        });

                        // Use requestAnimationFrame to wait for layout update
                        requestAnimationFrame(() => {
                            if (chatScrollRef.current) {
                                const newHeight = chatScrollRef.current.scrollHeight;
                                chatScrollRef.current.scrollTop = newHeight - currentHeight;
                            }
                        });
                    } else {
                        setCanLoadMore(false);
                    }
                }
            } catch (e) {
                console.error("Error loading more history", e);
            } finally {
                setLoadingHistory(false);
            }
        }
    };

    // NOTE: Auto-scroll is handled by the virtualizer in MessageList.tsx


    const categoryName = categorySettings?.bot_name || 'AI Workspace';
    const activeModelName = AI_MODELS.find(m => m.id === selectedModel)?.name;



    if (isCheckingOrgAuth) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
                <span className="ml-3 text-slate-500 font-medium">Verifying access...</span>
            </div>
        );
    }

    if (isLoadingSlug) {
        return (
            <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center z-[100]">
                <div className="flex flex-col items-center gap-6">
                    <PremiumLoader />
                    <div className="flex flex-col items-center gap-2">
                        <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Preparing AI Space</h3>
                        <p className="text-blue-400/60 font-bold text-xs animate-pulse">Resolving secure access...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (slugError) {
        return (
            <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center z-[100] p-4 text-center">
                <div className="max-w-md space-y-6 anim-fade-in-up">
                    <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-500/20 shadow-2xl shadow-rose-500/10">
                        <AlertTriangle className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">{slugError}</h2>
                        <p className="text-slate-400 font-medium">Đường dẫn không tồn tại hoặc đã bị thay đổi.</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Về trĐĐĐĐĐĐĐĐĐĐĐĐĐĐĐĐĐĐĐđang chạy
                    </button>
                </div>
            </div>
        );
    }

    if (orgUser?.status === 'banned') {
        return <BannedUserModal />;
    }

    if (!categoryId) return null;

    if (isLoadingSettings || isOffline || hasNetworkError) {
        return (
            <PremiumLoader
                title={isOffline ? 'KẾT NỐI GIÁN ĐOẠN' : 'AI-SPACE'}
                subtitle={isOffline
                    ? 'Oops! Có vẻ như bạn đã ngắt kết nối Internet. Vui lòng kiểm tra lại đường truyền để tiếp tục.'
                    : 'Đang thiết lập môi trường làm việc thông minh và kết nối dữ liệu an toàn...'
                }
                isOffline={isOffline || hasNetworkError}
                onRetry={() => {
                    setHasNetworkError(false);
                    window.location.reload();
                }}
            />
        );
    }

    return (
        <div
            key={sessionId}
            className={`flex h-screen overflow-hidden font-sans selection:bg-brand selection:text-white relative transition-colors duration-500 ${isDarkTheme ? 'dark bg-[#05070A] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchMove={isMobile ? onTouchMove : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --brand-h: ${hsl.h};
                    --brand-s: ${hsl.s}%;
                    --brand-l: ${hsl.l}%;
                    --brand-primary-base: var(--brand-h), var(--brand-s), var(--brand-l);
                    --brand-primary: hsl(var(--brand-primary-base));
                    --brand-primary-light: hsl(var(--brand-h), var(--brand-s), calc(var(--brand-l) + 15%));
                    --brand-primary-dark: hsl(var(--brand-h), var(--brand-s), calc(var(--brand-l) - 10%));
                    --brand-surface: hsl(var(--brand-h), var(--brand-s), 98%);
                    --brand-surface-accent: hsl(var(--brand-h), var(--brand-s), 96%);
                    --brand-border: hsl(var(--brand-h), var(--brand-s), 94%);
                    --brand-border-accent: hsl(var(--brand-h), var(--brand-s), 88%);
                    --brand-text-accent: hsl(var(--brand-h), var(--brand-s), 30%);
                    --brand-shadow: hsla(var(--brand-h), var(--brand-s), var(--brand-l), 0.1);
                }
                .dark {
                    --brand-surface: hsl(var(--brand-h), var(--brand-s), 10%);
                    --brand-surface-accent: hsl(var(--brand-h), var(--brand-s), 15%);
                    --brand-border: hsl(var(--brand-h), var(--brand-s), 20%);
                    --brand-border-accent: hsl(var(--brand-h), var(--brand-s), 25%);
                    --brand-text-accent: hsl(var(--brand-h), var(--brand-s), 70%);
                }
                .bg-brand { background-color: hsla(var(--brand-primary-base), var(--tw-bg-opacity, 1)) !important; }
                .text-brand { color: hsla(var(--brand-primary-base), var(--tw-text-opacity, 1)) !important; }
                .border-brand { border-color: hsla(var(--brand-primary-base), var(--tw-border-opacity, 1)) !important; }
                .shadow-brand { box-shadow: 0 10px 25px -3px var(--brand-shadow) !important; }
                .from-brand { --tw-gradient-from: var(--brand-primary) !important; --tw-gradient-to: var(--brand-primary-dark) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
                .bg-brand-surface { background-color: var(--brand-surface) !important; }
                .bg-brand-accent { background-color: var(--brand-surface-accent) !important; }
                .text-brand-accent { color: var(--brand-text-accent) !important; }
                .border-brand-accent { border-color: var(--brand-border-accent) !important; }

                /* Custom Utilities */
                .focus-within\\:text-brand:focus-within { color: var(--brand-primary) !important; }
                .focus\\:border-brand:focus { border-color: var(--brand-primary) !important; }
                .focus\\:ring-brand:focus { --tw-ring-color: hsla(var(--brand-primary-base), 0.1) !important; }
                .hover\\:bg-brand-accent:hover { background-color: var(--brand-surface-accent) !important; }
                .hover\\:bg-brand-opaque:hover { background-color: hsla(var(--brand-primary-base), 0.08) !important; }
            `}} />
            {/* Drag Overlay */}
            {isDraggingOver && (
                <div className="absolute inset-0 z-[100] bg-brand/5 backdrop-blur-sm border-2 border-brand border-dashed rounded-xl flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center animate-bounce-slow">
                        <Upload className="w-16 h-16 text-brand mb-4" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Thả tệp vào đây</h3>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Tự động tải lên Workspace</p>
                    </div>
                </div>
            )}


            {/* Mobile/Tablet Sidebar Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}


            {/* --- SIDEBAR --- */}
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                isZenMode={isZenMode}
                categoryName={categoryName}
                categoryId={categorySlugOrId}
                viewMode={viewMode}
                setViewMode={setViewMode}
                navigate={(path: string) => {
                    navigate(path);
                    if (isMobile) setIsSidebarOpen(false);
                }}
                searchTermSessions={searchTermSessions}
                setSearchTermSessions={setSearchTermSessions}
                recentSessions={recentSessions}
                sessionId={sessionId}
                chatbots={chatbots}
                loadingList={loadingList}
                expandedBotId={expandedBotId}
                setExpandedBotId={setExpandedBotId}
                activeBot={activeBot}
                sessions={sessions}
                handleNewChat={(e: React.MouseEvent, bot: ChatbotInfo) => {
                    handleNewChat(e, bot);
                    if (isMobile) setIsSidebarOpen(false);
                }}
                handleDeleteSession={handleDeleteSession}
                handleEditSessionTitle={handleEditSessionTitle}
                isManualNavigationRef={isManualNavigationRef}
                onOpenTraining={() => {
                    // Navigate using react-router to ensure state sync
                    navigate(`/ai-space/${categorySlugOrId}/organization`);
                    if (isMobile) setIsSidebarOpen(false);
                }}
                onCloseTraining={() => {
                    navigate(`/ai-space/${categorySlugOrId}`);
                }}
                orgUser={orgUser}
                isDarkTheme={isDarkTheme}
                isMobile={isMobile}
                setIsSidebarOpen={setIsSidebarOpen}
                onOpenProfile={() => setIsProfileOpen(true)}
                onLogout={handleLogout}
                onTogglePin={handleTogglePin}
                pinnedSessionIds={pinnedSessionIds}
                onOpenKeyboardHelp={() => setIsKeyboardHelpOpen(true)}
                brandColor={brandColor}
            />

            <div className={`flex-1 flex overflow-hidden relative ${!isResizing ? 'transition-all duration-500 ease-in-out' : ''}`}>
                <div
                    className={`
                        flex flex-col relative shadow-xl z-20 overflow-hidden
                        ${isDocWorkspaceOpen && viewMode === 'chat' ? 'flex-shrink-0' : 'flex-none'}
                        ${!isResizing ? 'transition-all duration-500 ease-in-out' : ''}
                        ${workspacePosition === 'left' ? 'order-first' : 'order-last'}
                        ${isCodeMode || isDarkTheme ? 'bg-[#05070A] border-slate-800' : 'bg-white border-slate-200'}
                        ${isDocWorkspaceOpen && viewMode === 'chat' ? (workspacePosition === 'left' ? 'border-r' : 'border-l') : 'border-none'}
                    `}
                    style={{
                        width: isDocWorkspaceOpen && viewMode === 'chat' ? (isMobile ? '100%' : `${workspaceWidth}%`) : '0px',
                        minWidth: isDocWorkspaceOpen && viewMode === 'chat' ? (isMobile ? '100%' : '20px') : '0px',
                        maxWidth: isDocWorkspaceOpen && viewMode === 'chat' ? (isMobile ? '100%' : '98%') : '0px',
                        opacity: isDocWorkspaceOpen && viewMode === 'chat' ? 1 : 0,
                        visibility: isDocWorkspaceOpen && viewMode === 'chat' ? 'visible' : 'hidden',
                        position: isMobile && isDocWorkspaceOpen ? 'absolute' : 'relative',
                        zIndex: isMobile && isDocWorkspaceOpen ? 50 : 20,
                        height: isMobile && isDocWorkspaceOpen ? '100%' : 'auto',
                    }}
                >
                    {viewMode === 'chat' && (
                        <div className="w-full h-full flex flex-col min-w-0">
                            {/* Header */}
                            {
                                isDocWorkspaceOpen && activeDoc ? (
                                    <div className="h-full flex flex-col">
                                        <div className={`flex items-center gap-2 p-3 border-b sticky top-0 z-10 select-none ${isCodeMode ? 'bg-[#0B0F17] border-slate-800' : (isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100')}`}>
                                            <button
                                                onClick={() => setActiveDoc(null)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                                                BACK TO EXPLORER
                                            </button>
                                            <div className="h-4 w-px bg-slate-100 mx-1" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter truncate">{activeDoc.name}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsDocWorkspaceOpen(false)}
                                                className="p-2 text-slate-400 hover:text-slate-600 transition-all rounded-lg hover:bg-slate-50"
                                            >
                                                <Minimize2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <FilePreview
                                                activeDoc={activeDoc}
                                                activeBot={activeBot}
                                                sessionId={sessionId}
                                                remoteConvId={remoteConvId}
                                                currentUser={currentUser}
                                                onUpdateDoc={(updated) => {
                                                    const updatedDocs = workspaceDocs.map(d =>
                                                        d.name === updated.name ? updated : d
                                                    );
                                                    setWorkspaceDocs(updatedDocs);
                                                }}
                                                setInput={setInput}
                                                isDocWorkspaceOpen={isDocWorkspaceOpen}
                                                isCodeMode={isCodeMode}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex-1 flex flex-col h-full ${isDarkTheme ? 'bg-slate-900' : 'bg-white'} overflow-hidden`}>
                                        {/* Sidebar Header */}
                                        {isImageGenMode ? (
                                            <div className={`h-14 flex items-center justify-between px-4 border-b flex-shrink-0 sticky top-0 z-10 w-full ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-2 rounded-xl border ${isDarkTheme ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className={`font-bold text-sm ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>Image Gallery</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isGallerySelectMode ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleDeleteGalleryImages(selectedGalleryImages)}
                                                                disabled={selectedGalleryImages.length === 0}
                                                                className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-rose-600 disabled:opacity-50 transition-all shadow-sm"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Xóa ({selectedGalleryImages.length})</span>
                                                            </button>
                                                            <button
                                                                onClick={() => { setIsGallerySelectMode(false); setSelectedGalleryImages([]); }}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isDarkTheme ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                                            >
                                                                Hủy
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setIsGallerySelectMode(true)}
                                                            className={`p-1.5 pr-3 rounded-lg transition-all flex items-center gap-2 group ${isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                                                        >
                                                            <div className={`p-1 rounded transition-colors ${isDarkTheme ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Chọn nhiều</span>
                                                        </button>
                                                    )}
                                                    <div className={`w-px h-6 mx-2 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'}`} />
                                                    <button
                                                        onClick={() => {
                                                            setIsImageGenMode(false);
                                                            setIsCodeMode(false);
                                                        }}
                                                        className={`p-1.5 px-3 rounded-xl transition-all flex items-center gap-2 border shadow-sm active:scale-95 ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                        title="Switch to Files (Standard Mode)"
                                                    >
                                                        <div className={`p-1 rounded-lg border ${isDarkTheme ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-200'} group-hover:scale-110 transition-transform`}>
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Files</span>
                                                    </button>
                                                    <button onClick={() => setWorkspacePosition(prev => prev === 'left' ? 'right' : 'left')} className={`p-1.5 rounded-xl transition-all active:scale-90 ${isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-brand' : 'text-slate-400 hover:bg-slate-100 hover:text-brand'}`}>
                                                        {workspacePosition === 'left' ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => setIsDocWorkspaceOpen(false)} className={`p-1.5 rounded-xl transition-all active:scale-90 ${isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                                                        <Minimize2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`h-14 flex items-center justify-between px-4 sticky top-0 z-10 shrink-0 border-b ${isCodeMode || isDarkTheme ? 'bg-[#05070A] border-slate-800' : 'bg-white border-slate-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-2.5 rounded-2xl shadow-sm border bg-gradient-to-br transition-all duration-500 ${isCodeMode ? 'from-slate-800 to-slate-900 border-slate-700 text-slate-400' : (isDarkTheme ? 'from-slate-800 to-slate-900 border-slate-700 text-slate-400' : 'from-slate-50 to-white border-slate-200 text-slate-500')}`}>
                                                        <div className="relative">
                                                            <FileCode className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col leading-none">
                                                        <span className={`font-black text-xs uppercase tracking-tight ${isCodeMode || isDarkTheme ? 'text-slate-200' : 'text-slate-800'}`}>Workspace</span>
                                                        <span className={`text-[9px] mt-0.5 ${isCodeMode || isDarkTheme ? 'text-slate-500' : 'text-slate-500'} font-bold`}>{filteredWorkspaceDocs.length} tệp tin</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {/* Zoom Controls */}
                                                    {activeDoc && (
                                                        <div className={`flex items-center gap-1 mr-2 rounded-lg p-0.5 border ${isCodeMode ? 'bg-slate-900 border-slate-800' : (isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                                                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className={`p-1 rounded transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`} title="Zoom Out">
                                                                <ZoomOut className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className={`text-[10px] font-mono w-8 text-center ${isCodeMode || isDarkTheme ? 'text-slate-500' : 'text-slate-500'}`}>{Math.round(zoomLevel * 100)}%</span>
                                                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className={`p-1 rounded transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`} title="Zoom In">
                                                                <ZoomIn className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Switch to Gallery */}
                                                    {!isCodeMode && (
                                                        <button
                                                            onClick={() => {
                                                                setIsImageGenMode(true);
                                                                setIsCodeMode(false);
                                                            }}
                                                            className={`p-1.5 px-3 rounded-xl transition-all flex items-center gap-2 border shadow-sm active:scale-95 ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                            title="Switch to Gallery (Image Mode)"
                                                        >
                                                            <div className={`p-1 rounded-lg border group-hover:scale-110 transition-transform ${isDarkTheme ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-200'}`}>
                                                                <ImageIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Gallery</span>
                                                        </button>
                                                    )}
                                                    <div className={`w-px h-6 mx-1 ${isCodeMode || isDarkTheme ? 'bg-slate-700' : 'bg-slate-200/20'}`} />
                                                    <button
                                                        onClick={() => setWorkspacePosition(prev => prev === 'left' ? 'right' : 'left')}
                                                        className={`p-1.5 rounded-lg transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-brand'}`}
                                                        title={workspacePosition === 'left' ? "Move to Right" : "Move to Left"}
                                                    >
                                                        {workspacePosition === 'left' ? <PanelRight className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                                                    </button>

                                                    {activeDoc && activeDoc.previewUrl && (
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(activeDoc.previewUrl!);
                                                                toast.success('Đã copy link tài liệu!');
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-brand'}`}
                                                            title="Copy Direct Link"
                                                        >
                                                            <LinkIcon className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button onClick={() => docInputRef.current?.click()} className={`p-1.5 rounded-lg transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-400 hover:bg-slate-800 hover:text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-brand'}`} title="Upload Document">
                                                        <Plus className="w-4 h-4" />
                                                    </button>

                                                    <button onClick={() => setIsDocWorkspaceOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                                                        <Minimize2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {isImageGenMode ? (
                                            <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <div className="grid grid-cols-2 gap-8 pt-8 pb-20 px-8">
                                                    {galleryImages.length === 0 ? (
                                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50">
                                                            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                                            <p className="text-xs font-bold uppercase tracking-widest">No images found</p>
                                                        </div>
                                                    ) : (
                                                        galleryImages.map((img) => {
                                                            const url = img.src;
                                                            const isSelected = selectedGalleryImages.includes(url);
                                                            return (
                                                                <div
                                                                    key={url}
                                                                    onClick={() => {
                                                                        if (isGallerySelectMode) {
                                                                            setSelectedGalleryImages(prev =>
                                                                                prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
                                                                            );
                                                                        } else {
                                                                            setPreviewImage(url);
                                                                        }
                                                                    }}
                                                                    className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 aspect-square cursor-pointer
                                                                        ${isSelected ? 'border-brand ring-2 ring-brand/20 scale-95 shadow-md' : (isDarkTheme ? 'border-slate-700 shadow-sm bg-slate-900 hover:shadow-md hover:border-slate-600' : 'border-slate-100 shadow-sm bg-white hover:shadow-md hover:border-slate-200')}
                                                                        ${isGallerySelectMode ? 'hover:scale-95' : 'hover:scale-[1.01]'}
                                                                    `}
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt={img.name}
                                                                        className="w-full h-full object-cover transition-opacity duration-300"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                            const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                                                                            if (fallback) fallback.classList.remove('hidden');
                                                                        }}
                                                                    />
                                                                    <div className={`image-fallback hidden absolute inset-0 flex flex-col items-center justify-center p-4 ${isDarkTheme ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-300'}`}>
                                                                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-center">Load Failed</span>
                                                                    </div>

                                                                    {isGallerySelectMode && (
                                                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : (isDarkTheme ? 'bg-slate-800 border-slate-600' : 'bg-white/80 border-slate-300')}`}>
                                                                            {isSelected && <Check className="w-4 h-4" strokeWidth={4} />}
                                                                        </div>
                                                                    )}

                                                                    <div className={`absolute inset-0 bg-black/40 transition-all flex items-center justify-center gap-3 p-4 ${isGallerySelectMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newAtt: FileAttachment = {
                                                                                id: `ref_${Date.now()}_${Math.random()}`,
                                                                                name: img.name || 'reference_image',
                                                                                type: 'image/png',
                                                                                size: 0,
                                                                                previewUrl: url
                                                                            };
                                                                            setAttachments(prev => [...prev, newAtt]);
                                                                            setIsImageGenMode(true);
                                                                            setIsEditingImage(true);
                                                                            if (textareaRef.current) textareaRef.current.focus();
                                                                            toast.success('Đã thêm ảnh vào prompt chỉnh sửa');
                                                                        }} className="p-2.5 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-sm group/edit" title="Use/Edit Image">
                                                                            <Edit3 className="w-5 h-5 text-slate-400 group-hover/edit:text-slate-600" />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }} className="p-2.5 bg-white/20 text-white rounded-xl hover:bg-white/40 transition-colors backdrop-blur-md shadow-sm"><Maximize2 className="w-5 h-5" /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImages([url]); }} className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-sm" title="Xóa vĩnh viễn">
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Doc List Tabs */}
                                                <div className={`flex items-center border-b ${isCodeMode ? 'bg-[#0B0F17] border-slate-800' : (isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-slate-50/50 border-slate-100')}`}>
                                                    <div className="flex-1 flex gap-2 p-2 overflow-x-auto custom-scrollbar">
                                                        {openTabNames.map((tabName, i) => {
                                                            const doc = workspaceDocs.find(d => d.name === tabName);
                                                            if (!doc) return null;
                                                            return (
                                                                <div key={i} className="relative group/tab">
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveDoc(doc);
                                                                            setSelectionRange(null);
                                                                        }}
                                                                        className={`px-3 py-1.5 pr-7 rounded-lg text-xs font-bold truncate max-w-[140px] transition-all border flex items-center gap-2 ${activeDoc?.name === tabName ? (isCodeMode ? 'bg-[#1E293B] border-slate-600 text-white shadow-sm' : (isDarkTheme ? 'bg-slate-800 border-slate-600 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-800 shadow-sm')) : (isCodeMode ? 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200' : (isDarkTheme ? 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'bg-transparent border-transparent text-slate-500 hover:bg-white hover:text-slate-700'))}`}
                                                                        title={doc.name}
                                                                    >
                                                                        <FileText className="w-3 h-3 shrink-0 opacity-50" />
                                                                        <div className="flex flex-col items-start min-w-0">
                                                                            <span className="truncate">{doc.name}</span>
                                                                            <span className="text-[9px] opacity-40 font-mono">{formatFileSize(doc.size)}</span>
                                                                        </div>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newTabs = openTabNames.filter(name => name !== tabName);
                                                                            setOpenTabNames(newTabs);
                                                                            if (activeDoc?.name === tabName) {
                                                                                const lastTab = newTabs[newTabs.length - 1];
                                                                                setActiveDoc(lastTab ? workspaceDocs.find(d => d.name === lastTab) || null : null);
                                                                                setSelectionRange(null);
                                                                            }
                                                                        }}
                                                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 opacity-0 group-hover/tab:opacity-100 transition-all font-bold"
                                                                        title="Close Tab"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveDoc(null)}
                                                        className={`p-2 mx-2 rounded-lg transition-colors ${!activeDoc ? (isDarkTheme ? 'text-slate-200 bg-slate-700/50' : 'text-slate-800 bg-slate-200/50') : (isDarkTheme ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100')}`}
                                                        title="M? Explorer"
                                                    >
                                                        <LayoutGrid className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Content Area or Explorer */}
                                                <div className="flex-1 overflow-hidden relative">
                                                    {activeDoc ? (
                                                        <div className="w-full h-full relative overflow-hidden">
                                                            {renderDocumentPreview()}
                                                        </div>
                                                    ) : (
                                                        <div className={`flex flex-col h-full ${isCodeMode || isDarkTheme ? 'bg-[#05070A]' : 'bg-slate-50'}`}>
                                                            <div className={`p-4 border-b ${isCodeMode || isDarkTheme ? 'bg-[#05070A] border-slate-800' : 'bg-white border-slate-100'} flex items-center gap-3`}>
                                                                <div className="relative group flex-1">
                                                                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-brand transition-colors ${isCodeMode || isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`} />
                                                                    <input
                                                                        type="text"
                                                                        value={explorerSearchTerm}
                                                                        onChange={e => setExplorerSearchTerm(e.target.value)}
                                                                        placeholder="Tìm kiếm tài liệu..."
                                                                        className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none transition-all ${isCodeMode ? 'bg-[#1E2532] text-white border border-slate-700 focus:border-brand-accent' : (isDarkTheme ? 'bg-slate-800 text-slate-200 border border-slate-700 focus:border-brand-accent' : 'bg-slate-50 border border-transparent focus:bg-white focus:border-brand-accent focus:ring-4 focus:ring-brand focus:ring-opacity-10')}`}
                                                                    />
                                                                </div>
                                                                {workspaceDocs.length > 0 && (
                                                                    <button
                                                                        onClick={() => setIsClearModalOpen(true)}
                                                                        className={`p-2 rounded-xl transition-all active:scale-95 group/clear ${isDarkTheme ? 'text-slate-400 hover:bg-rose-900/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                                                                        title="Clear Workspace"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Workspace Filter Tabs */}
                                                            <div className={`px-4 pt-2 flex gap-4 border-b ${isCodeMode || isDarkTheme ? 'bg-[#05070A] border-slate-800' : 'bg-white border-slate-100'} text-xs font-bold whitespace-nowrap overflow-x-auto custom-scrollbar-hide`}>
                                                                <button
                                                                    onClick={() => setWorkspaceFilter('saved')}
                                                                    className={`pb-2 relative transition-colors ${workspaceFilter === 'saved' ? (isCodeMode || isDarkTheme ? 'text-white' : 'text-slate-800') : (isCodeMode || isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-400')}`}
                                                                >
                                                                    Files
                                                                    {workspaceFilter === 'saved' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${isCodeMode || isDarkTheme ? 'bg-white' : 'bg-slate-400'}`} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => setWorkspaceFilter('images')}
                                                                    className={`pb-2 relative transition-colors ${workspaceFilter === 'images' ? (isCodeMode || isDarkTheme ? 'text-white' : 'text-slate-800') : (isCodeMode || isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-400')}`}
                                                                >
                                                                    Images
                                                                    {workspaceFilter === 'images' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${isCodeMode || isDarkTheme ? 'bg-white' : 'bg-slate-400'}`} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => setWorkspaceFilter('drafts')}
                                                                    className={`pb-2 relative transition-colors ${workspaceFilter === 'drafts' ? (isCodeMode || isDarkTheme ? 'text-white' : 'text-slate-800') : (isCodeMode || isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-400')}`}
                                                                >
                                                                    Drafts
                                                                    {workspaceFilter === 'drafts' && <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full ${isCodeMode || isDarkTheme ? 'bg-white' : 'bg-slate-400'}`} />}
                                                                </button>
                                                            </div>

                                                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                                                                    {filteredWorkspaceDocs.length === 0 ? (
                                                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-40">
                                                                            <FileQuestion className="w-16 h-16" />
                                                                            <span className="text-xs font-black uppercase tracking-widest text-center px-4">
                                                                                {workspaceFilter === 'drafts' ? 'No drafts found' : workspaceFilter === 'images' ? 'No images found' : 'No saved files found'}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        filteredWorkspaceDocs.map((doc, idx) => (
                                                                            <WorkspaceDocItem
                                                                                key={doc.id || doc.previewUrl || `${doc.name}_${idx}`}
                                                                                doc={doc}
                                                                                isCodeMode={isCodeMode}
                                                                                isDarkTheme={isDarkTheme}
                                                                                onContextMenu={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    setContextMenu({ x: e.clientX, y: e.clientY, doc });
                                                                                }}
                                                                                onClick={() => {
                                                                                    if (!openTabNames.includes(doc.name)) {
                                                                                        setOpenTabNames(prev => [...prev, doc.name]);
                                                                                    }
                                                                                    setActiveDoc(doc);
                                                                                }}
                                                                                onMakeGlobal={handleMakeGlobal}
                                                                                onSaveSnippet={handleSaveSnippet}
                                                                                onDelete={setDeletingDoc}
                                                                                onToggleContext={(targetDoc) => {
                                                                                    const isInCtx = selectedContextDocs.some(d => d.name === targetDoc.name);
                                                                                    if (isInCtx) {
                                                                                        setSelectedContextDocs(prev => prev.filter(d => d.name !== targetDoc.name));
                                                                                    } else {
                                                                                        setSelectedContextDocs(prev => [...prev, targetDoc]);
                                                                                    }
                                                                                }}
                                                                                isInContext={selectedContextDocs.some(d => d.name === doc.name)}
                                                                            />
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className={`p-4 border-t ${isCodeMode || isDarkTheme ? 'bg-[#05070A] border-slate-800' : 'bg-white border-slate-100'}`}>
                                                                <button
                                                                    onClick={() => {
                                                                        if (isImageGenMode) {
                                                                            toast.error('Vui lòng t?t Image Mode d? t?tải lên tài liệu');
                                                                            return;
                                                                        }
                                                                        docInputRef.current?.click();
                                                                    }}
                                                                    className={`w-full h-12 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 font-bold transition-all text-sm uppercase tracking-widest ${isImageGenMode ? (isDarkTheme ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-slate-100 text-slate-300 cursor-not-allowed') : (isDarkTheme ? 'border-slate-700 hover:border-brand hover:bg-brand hover:bg-opacity-5 text-slate-400 hover:text-brand' : 'border-slate-200 hover:border-brand hover:bg-brand hover:bg-opacity-5 text-slate-400 hover:text-brand')}`}
                                                                >
                                                                    <Upload className="w-4 h-4" />
                                                                    Tải lên tệp mới
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            }

                        </div>
                    )}
                </div>
                {/* Resize Handle - Positioned relative to boundary */}
                {
                    viewMode === 'chat' && isDocWorkspaceOpen && !isMobile && (
                        <div
                            onMouseDown={startResizing}
                            className={`
                                absolute top-0 bottom-0 w-3 cursor-col-resize z-[100] group transition-opacity
                                ${isResizing ? 'opacity-100' : 'opacity-100 hover:opacity-100'}
                            `}
                            style={{
                                [workspacePosition === 'left' ? 'left' : 'right']: `${workspaceWidth}%`,
                                transform: workspacePosition === 'left' ? 'translateX(-50%)' : 'translateX(50%)',
                                background: isResizing ? `hsla(var(--brand-h), var(--brand-s), var(--brand-l), 0.2)` : 'transparent'
                            }}
                        >
                            <div className={`h-full w-px mx-auto group-hover:bg-brand group-hover:bg-opacity-50 group-hover:w-[2px] transition-all ${isResizing ? 'bg-brand w-[2px]' : (isDarkTheme ? 'bg-slate-700' : 'bg-slate-200')}`} />
                        </div>
                    )
                }

                <main
                    className={`flex-1 flex flex-col relative h-full min-w-0 ${!isResizing ? 'transition-all duration-500 ease-in-out' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 z-[60] bg-brand bg-opacity-5 backdrop-blur-md border-2 border-dashed border-brand border-opacity-30 flex items-center justify-center m-4 rounded-3xl animate-in fade-in duration-200">
                            <div className="flex flex-col items-center gap-4 text-brand">
                                <div className="p-6 rounded-full bg-brand bg-opacity-10 animate-bounce">
                                    <FilePlus className="w-12 h-12" />
                                </div>
                                <p className="text-xl font-black uppercase tracking-widest text-brand">Drop to Analyze with AI</p>
                            </div>
                        </div>
                    )}
                    {/* Hidden Inputs moved here to be always available */}
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                    <input type="file" multiple ref={docInputRef} className="hidden" onChange={handleDocFileSelect} />

                    {!isSidebarOpen && viewMode !== 'chat' && (
                        <button onClick={() => setIsSidebarOpen(true)} className={`absolute top-4 left-4 z-40 p-2 shadow-lg md:hidden rounded-full border ${isDarkTheme ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-slate-200'}`}>
                            <Menu className="w-6 h-6" />
                        </button>
                    )}

                    {isTrainingOpen && (orgUser?.role === 'admin' || orgUser?.role === 'assistant') ? (
                        <AITrainingManager
                            onClose={() => navigate(`/ai-space/${categoryId}`)}
                            categoryId={categoryId}
                            brandColor={brandColor}
                            isDarkTheme={isDarkTheme}
                            onOpenOrgManager={(userId?: number) => {
                                if (userId) setTargetEditUserId(userId);
                                setIsOrgManagerOpen(true);
                            }}
                        />
                    ) : viewMode === 'global_workspace' ? (
                        <GlobalWorkspaceView
                            globalTab={globalTab}
                            setGlobalTab={setGlobalTab}
                            handleMigration={handleMigration}
                            docInputRef={docInputRef}
                            globalTotal={globalTotal}
                            globalSourceFilter={globalSourceFilter}
                            setGlobalSourceFilter={setGlobalSourceFilter}
                            handleSelectAll={handleSelectAll}
                            selectedGlobalDocs={selectedGlobalDocs}
                            globalDbAssets={globalDbAssets}
                            globalSearchInput={globalSearchInput}
                            setGlobalSearchInput={setGlobalSearchInput}
                            isPromoting={isPromoting}
                            activeBot={activeBot}
                            chatbotId={chatbotId}
                            fetchGlobalAssets={fetchGlobalAssets}
                            setSelectedGlobalDocs={setSelectedGlobalDocs}
                            setIsGlobalSelectMode={setIsGlobalSelectMode}
                            isGlobalSelectMode={isGlobalSelectMode}
                            handleDeleteFromDb={handleDeleteFromDb}
                            setWorkspaceDocs={setWorkspaceDocs}
                            chatAssets={extractedAssets}
                            setDeletedGalleryImages={setDeletedGalleryImages}
                            isLoadingGlobalAssets={isLoadingGlobalAssets}
                            globalPage={globalPage}
                            setGlobalPage={setGlobalPage}
                            formatFileSize={formatFileSize}
                            copyToClipboard={copyToClipboard}
                            setActiveDoc={setActiveDoc}
                            setIsDocWorkspaceOpen={setIsDocWorkspaceOpen}
                            navigate={navigate}
                            categoryId={categoryId}
                            setPreviewImage={setPreviewImage}
                            remoteConvId={remoteConvId}
                            sessionId={sessionId}
                            onOpenTips={() => setIsWorkspaceTipsOpen(true)}
                            isDarkTheme={isDarkTheme}
                        />

                    ) : viewMode === 'home' ? (
                        <HomeView
                            chatbots={chatbots}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            loadingList={loadingList}
                            filteredChatbots={filteredChatbots}
                            sessions={sessions}
                            categoryId={categorySlugOrId}
                            handleNewChat={handleNewChat}
                            navigate={navigate}
                            isManualNavigationRef={isManualNavigationRef}
                            orgUser={orgUser}
                            isDarkTheme={isDarkTheme}
                        />
                    ) : (
                        <>

                            {/* Header for Chat View */}
                            <ChatHeader
                                activeBot={activeBot}
                                selectedModel={selectedModel}
                                loadingChat={loadingChat}
                                isSidebarOpen={isSidebarOpen}
                                setIsSidebarOpen={setIsSidebarOpen}
                                isDocWorkspaceOpen={isDocWorkspaceOpen}
                                setIsDocWorkspaceOpen={setIsDocWorkspaceOpen}
                                globalTab={globalTab}
                                setGlobalTab={setGlobalTab}
                                categoryName={activeBot?.category_name || categorySlugOrId?.toUpperCase() || ''}
                                showOrgSettings={orgUser?.role === 'admin' || orgUser?.role === 'assistant'}
                                onOpenOrgSettings={handleOpenOrgSettings}
                                isCodeMode={isCodeMode}
                                isImageGenMode={isImageGenMode}
                                isDarkTheme={isDarkTheme}
                                isMobile={isMobile}
                                orgUser={orgUser}
                                onProfileOpen={() => setIsProfileOpen(true)}
                                isChatSearchOpen={isChatSearchOpen}
                                setIsChatSearchOpen={setIsChatSearchOpen}
                                onOpenSummary={() => { setIsFeedbackOpen(false); setIsSummaryOpen(true); }}
                                isSummarizing={isSummarizing}
                                onOpenFeedback={() => { setIsSummaryOpen(false); setIsFeedbackOpen(true); }}
                            />

                            {/* Chat Search Bar */}
                            {isChatSearchOpen && (
                                <div className={`mx-auto w-full max-w-4xl px-4 md:px-8 mt-2 animate-in slide-in-from-top-2 duration-300 z-40`}>
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${isDarkTheme ? 'bg-[#161B24] border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <Search className={`w-4 h-4 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`} />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm nội dung..."
                                            value={chatSearchTerm}
                                            onChange={(e) => setChatSearchTerm(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') navigateSearch('next');
                                                if (e.key === 'Escape') setIsChatSearchOpen(false);
                                            }}
                                            className={`flex-1 bg-transparent border-none outline-none text-sm font-medium ${isDarkTheme ? 'text-slate-200 placeholder-slate-600' : 'text-slate-700 placeholder-slate-400'}`}
                                        />
                                        {searchMatches.length > 0 && (
                                            <div className={`text-[10px] font-black uppercase tracking-wider px-2 border-r ${isDarkTheme ? 'text-slate-500 border-slate-700' : 'text-slate-400 border-slate-200'}`}>
                                                {currentSearchIndex + 1} / {searchMatches.length}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            {isSearchingRemote && (
                                                <div className="px-2 flex items-center">
                                                    <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}
                                            {remoteSearchCount > 0 && !isSearchingRemote && (
                                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all bg-brand/10 text-brand border border-brand/20 animate-pulse`} title="Matches found in history">
                                                    +{remoteSearchCount} in History
                                                </div>
                                            )}
                                            <button
                                                onClick={() => navigateSearch('prev')}
                                                disabled={searchMatches.length === 0}
                                                className={`p-1 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-slate-800 disabled:opacity-30 text-slate-400' : 'hover:bg-slate-100 disabled:opacity-30 text-slate-500'}`}
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigateSearch('next')}
                                                disabled={searchMatches.length === 0}
                                                className={`p-1 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-slate-800 disabled:opacity-30 text-slate-400' : 'hover:bg-slate-100 disabled:opacity-30 text-slate-500'}`}
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setIsChatSearchOpen(false)}
                                                className={`p-1 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div
                                ref={chatContainerRef}
                                id="chat-scroll-container"
                                className="flex-1 overflow-hidden relative flex flex-col pt-1"
                                onScroll={throttledHandleScroll}
                                onMouseUp={handleChatMouseUp}
                                onClick={handleChatClick}
                            >
                                {loadingHistory && (
                                    <div className={`py-4 flex justify-center sticky top-0 backdrop-blur-sm z-30 ${isDarkTheme ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                                        <div className="w-6 h-6 border-2 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Chat Selection Tooltip */}
                                {chatSelectionCoords && selectedChatText && (
                                    <div
                                        className="fixed z-[100] bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 p-2 flex items-center gap-1 anim-scale-in"
                                        style={{
                                            top: chatSelectionCoords.y,
                                            left: chatSelectionCoords.x,
                                            transform: 'translate(-50%, calc(-100% - 15px))'
                                        }}
                                    >
                                        <button onClick={() => { navigator.clipboard.writeText(selectedChatText); toast.success('Copied!'); setChatSelectionCoords(null); }} className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 min-w-[50px] transition-colors"><Copy className="w-3.5 h-3.5" /><span>Copy</span></button>
                                        <div className="w-px h-8 bg-white/10 mx-1" />
                                        <button onClick={() => { setInput(`Explain this: "${selectedChatText}"`); setChatSelectionCoords(null); setTimeout(() => document.getElementById('chat-input')?.focus(), 100); }} className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 min-w-[50px] transition-colors"><Sparkles className="w-3.5 h-3.5 text-brand" /><span>Explain</span></button>
                                        <button onClick={() => { setInput(`Summarize: "${selectedChatText}"`); setChatSelectionCoords(null); setTimeout(() => document.getElementById('chat-input')?.focus(), 100); }} className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 min-w-[50px] transition-colors"><BookOpen className="w-3.5 h-3.5 text-blue-400" /><span>Summary</span></button>
                                        <div className="w-px h-8 bg-white/10 mx-1" />
                                        <button onClick={() => { window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedChatText)}`, '_blank'); setChatSelectionCoords(null); }} className="px-2.5 py-1.5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 min-w-[50px] transition-colors"><Globe className="w-3.5 h-3.5 text-emerald-400" /><span>Search</span></button>
                                    </div>
                                )}

                                {loadingChat && messages.length === 0 ? (
                                    <div className="flex-1 px-4 md:px-8 py-4 space-y-6">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? 'items-end flex flex-col' : ''}`}>
                                                    <Skeleton variant="rect" width={i % 2 === 0 ? "180px" : "240px"} height="40px" className="rounded-2xl" />
                                                    <Skeleton variant="rect" width={i % 2 === 0 ? "120px" : "180px"} height="12px" className="rounded-lg opacity-50" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <MessageList
                                        messages={messages}
                                        activeBot={activeBot}
                                        loadingChat={loadingChat}
                                        workspaceDocs={workspaceDocs}
                                        openTabNames={openTabNames}
                                        setWorkspaceDocs={setWorkspaceDocs}
                                        setOpenTabNames={setOpenTabNames}
                                        setActiveDoc={setActiveDoc}
                                        setIsDocWorkspaceOpen={setIsDocWorkspaceOpen}
                                        renderMarkdown={renderMarkdown}
                                        isCodeMode={isCodeMode}
                                        isImageGenMode={isImageGenMode}
                                        copyToClipboard={copyToClipboard}
                                        speakMessage={speakMessage}
                                        isSpeaking={isSpeaking}
                                        regenerateResponse={regenerateResponse}
                                        reuseMessage={reuseMessage}
                                        setInput={setInput}
                                        suggestedQuestions={suggestedQuestions}
                                        messagesEndRef={messagesEndRef}
                                        attachments={attachments}
                                        onPreviewImage={setPreviewImage}
                                        onMakeGlobal={handleMakeGlobal}
                                        isResearchMode={isResearchMode}
                                        setIsResearchMode={setIsResearchMode}
                                        isKbOnlyMode={isKbOnlyMode}
                                        setIsKbOnlyMode={setIsKbOnlyMode}
                                        setIsCodeMode={setIsCodeMode}
                                        setIsImageGenMode={setIsImageGenMode}
                                        setIsImageSettingsOpen={setIsImageSettingsOpen}
                                        isGeneratingImage={isChatGeneratingImage}
                                        isDarkTheme={isDarkTheme}
                                        isMobile={isMobile}
                                        selectedModel={selectedModel}
                                        onLoadMore={handleLoadMoreMessages}
                                        isLoadingMore={isLoadingMore}
                                        canLoadMore={canLoadMore}
                                        chatSearchTerm={chatSearchTerm}
                                        isCiteMode={isCiteMode}
                                    />
                                )}
                            </div>


                            {/* Input Area */}
                            <div className="absolute bottom-0 left-0 right-0 bg-transparent flex justify-center pb-6 pt-12 pointer-events-none z-20">
                                {/* Gradient Fade */}
                                <div className={`absolute inset-0 pointer-events-none ${isDarkTheme ? 'bg-gradient-to-t from-[#05070A] via-[#05070A]/95 to-transparent' : 'bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent'}`} />

                                <div className={`w-full max-w-4xl px-4 md:px-8 pointer-events-auto relative ${isMobile ? 'pb-2' : ''}`}>
                                    <div className={`border rounded-[24px] p-2 relative transition-all flex flex-col group chat-input-glow ${isDarkTheme ? 'bg-[#0D1117] border-slate-800 shadow-none' : 'bg-white border-slate-200'}`}>
                                        {/* Full Width Soundwave Overlay */}

                                        {/* Full Width Soundwave Overlay */}
                                        {isListening && (
                                            <FullWidthSoundwave
                                                text={realtimeTranscript}
                                                onStop={stopListening}
                                            />
                                        )}

                                        {/* Attachments Preview & Workspace Context */}
                                        {(attachments.length > 0 || selectedContextDocs.length > 0) && (
                                            <div className={`flex flex-wrap gap-3 p-3 overflow-x-auto custom-scrollbar border-b mb-1 animate-in slide-in-from-top-2 duration-300 ${isDarkTheme ? 'border-slate-700' : 'border-slate-200'}`}>
                                                {/* Local Attachments */}
                                                {attachments.map((file, i) => (
                                                    <div key={`local-${file.id || i}`} className="relative group/file">
                                                        <div className={`rounded-xl overflow-hidden border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                            {file.type.startsWith('image/') || file.type.startsWith('video/') ? (
                                                                <div className={`relative w-16 h-16 ${isDarkTheme ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                                                    {file.uploading ? (
                                                                        /* Uploading state for image */
                                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                            <div className="relative w-7 h-7">
                                                                                <svg className="animate-spin w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                                </svg>
                                                                            </div>
                                                                            {(file.uploadProgress ?? 0) > 0 && (
                                                                                <span className="text-[8px] font-bold text-brand">{file.uploadProgress}%</span>
                                                                            )}
                                                                        </div>
                                                                    ) : file.type.startsWith('image/') ? (
                                                                        <img src={file.previewUrl || file.base64} alt={file.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <Video className="w-6 h-6 text-slate-400" />
                                                                        </div>
                                                                    )}
                                                                    {/* Progress bar at bottom for images */}
                                                                    {file.uploading && (
                                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
                                                                            <div
                                                                                className="h-full bg-brand transition-all duration-300 ease-out"
                                                                                style={{ width: `${file.uploadProgress ?? 10}%` }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="px-3 py-2 flex items-center gap-2 max-w-[150px]">
                                                                    {file.uploading ? (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-3 h-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                            <div className="w-3 h-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                            <div className="w-3 h-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                                                                        </div>
                                                                    ) : (
                                                                        <FileText className="w-4 h-4 text-slate-600" />
                                                                    )}
                                                                    <span className={`text-xs truncate font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>{file.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!file.uploading && (
                                                            <button onClick={() => removeAttachment(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity shadow-lg z-10 border border-white">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}


                                                {/* Workspace Context Files */}
                                                {selectedContextDocs.map((doc, i) => {
                                                    const ext = doc.name.split('.').pop()?.toLowerCase() || '';
                                                    const isImg = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || (doc.type && doc.type.startsWith('image/'));

                                                    // Standardize Icon/Color logic to match WorkspaceDocItem
                                                    const getFileInfo = () => {
                                                        if (ext === 'pdf') return { Icon: FileText, color: 'text-rose-500' };
                                                        if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-emerald-600' };
                                                        if (['doc', 'docx'].includes(ext)) return { Icon: FileText, color: 'text-blue-600' };
                                                        if (['js', 'ts', 'tsx', 'jsx', 'py', 'php', 'html', 'css', 'json', 'sql'].includes(ext))
                                                            return { Icon: FileCode, color: 'text-violet-600' };
                                                        if (isImg)
                                                            return { Icon: ImageIcon, color: 'text-amber-600' };
                                                        return { Icon: FileText, color: 'text-slate-500' };
                                                    };
                                                    const { Icon, color } = getFileInfo();

                                                    return (
                                                        <div
                                                            key={`ws-${i}`}
                                                            className="relative group/ws cursor-pointer shrink-0"
                                                            onClick={() => {
                                                                setActiveDoc(doc);
                                                                setIsDocWorkspaceOpen(true);
                                                            }}
                                                        >
                                                            <div className={`border rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 max-w-[200px] transition-all hover:shadow-md relative pr-7 group/item shadow-sm ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/80' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'}`}>
                                                                {isImg && (doc.previewUrl || doc.base64) ? (
                                                                    <div className={`w-8 h-8 rounded-lg overflow-hidden border shadow-sm shrink-0 ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                                        <img src={doc.previewUrl || doc.base64} alt={doc.name} className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : (
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border shrink-0 ${color} ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                                                                        <Icon className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={`text-[10px] truncate font-bold leading-tight ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{doc.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />
                                                                        <span className="text-[8px] font-black text-brand/80 ml-0.5 uppercase tracking-tighter">AI Context</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedContextDocs(prev => prev.filter(d => d.name !== doc.name));
                                                                    }}
                                                                    className={`absolute top-1 right-1 p-0.5 rounded-full transition-all opacity-0 group-hover/item:opacity-100 ${isDarkTheme ? 'hover:bg-slate-700 text-slate-400 hover:text-red-400' : 'hover:bg-white text-slate-400 hover:text-red-500'}`}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {/* Chat Input Component */}

                                        <ChatInput
                                            input={input}
                                            setInput={setInput}
                                            handleSend={handleSend}
                                            handleKeyDown={handleKeyDown}
                                            loadingChat={loadingChat}
                                            activeBot={activeBot}
                                            isEnhancing={isEnhancing}
                                            setIsEnhancing={setIsEnhancing}
                                            isImageGenMode={isImageGenMode}
                                            isListening={isListening}
                                            toggleListening={handleToggleListening}
                                            isAttachDropdownOpen={isAttachDropdownOpen}
                                            setIsAttachDropdownOpen={setIsAttachDropdownOpen}
                                            fileInputRef={fileInputRef}
                                            setIsDocWorkspaceOpen={setIsDocWorkspaceOpen}
                                            setActiveDoc={setActiveDoc}
                                            setExplorerSearchTerm={setExplorerSearchTerm}
                                            textareaRef={textareaRef}
                                            attachments={attachments}
                                            selectedContextDocs={selectedContextDocs}
                                            setSelectedContextDocs={setSelectedContextDocs}
                                            selectedModel={selectedModel}
                                            setSelectedModel={setSelectedModel}
                                            categoryName={categoryName}
                                            isKbOnlyMode={isKbOnlyMode}
                                            setIsKbOnlyMode={setIsKbOnlyMode}
                                            isResearchMode={isResearchMode}
                                            setIsResearchMode={setIsResearchMode}
                                            isCodeMode={isCodeMode}
                                            setIsCodeMode={setIsCodeMode}
                                            setIsImageGenMode={setIsImageGenMode}
                                            setIsImageSettingsOpen={setIsImageSettingsOpen}
                                            setSuggestedQuestions={setSuggestedQuestions}
                                            autoTTS={autoTTS}
                                            setAutoTTS={setAutoTTS}
                                            isZenMode={isZenMode}
                                            setIsZenMode={setIsZenMode}
                                            handleExportChat={handleExportChat}
                                            setIsShareModalOpen={setIsShareModalOpen}
                                            setIsClearConfirmOpen={setIsClearConfirmOpen}
                                            onShareConversation={handleShareConversation}
                                            isConvPublic={isConvPublic}
                                            isDarkTheme={isDarkTheme}
                                            isMobile={isMobile}
                                            orgUser={orgUser}
                                        />

                                        {/* ── Persona Picker ── */}
                                        {isPersonaPickerOpen && (
                                            <PersonaPicker onClose={() => setIsPersonaPickerOpen(false)} />
                                        )}

                                    </div>
                                </div>
                            </div>
                        </>
                    )
                    }
                </main>

                {/* Share File Modal */}
                <Modal
                    isOpen={!!sharingDoc}
                    onClose={() => setSharingDoc(null)}
                    noHeader={true}
                    noPadding={true}
                    size="sm"
                >
                    <div className={`rounded-3xl overflow-hidden shadow-2xl flex flex-col border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-6 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-b relative ${isDarkTheme ? 'border-slate-700' : 'border-slate-100'}`}>
                            <button onClick={() => setSharingDoc(null)} className={`absolute top-4 right-4 p-2 rounded-full transition-all ${isDarkTheme ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                                <X className="w-4 h-4" />
                            </button>
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-4 mx-auto shadow-xl shadow-blue-500/10 animate-in zoom-in-75 duration-300">
                                <Share2 className="w-8 h-8" />
                            </div>
                            <h3 className={`text-center text-lg tracking-tight px-4 ${isDarkTheme ? 'text-slate-100' : 'font-black text-slate-800'}`}>Chia sẻ tài liệu</h3>
                            <p className={`text-center text-[11px] font-bold uppercase tracking-widest mt-1 px-4 truncate ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>{sharingDoc?.name}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <label className={`block text-[10px] font-black uppercase tracking-widest border-l-2 border-blue-500 pl-2 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>Đường dẫn tài liệu</label>
                                <div className="relative group">
                                    <input
                                        readOnly
                                        type="text"
                                        value={sharingDoc?.previewUrl || ''}
                                        className={`w-full border rounded-xl px-4 py-3 text-xs font-mono pr-24 outline-none transition-all ${isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 focus:bg-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 text-slate-500 focus:bg-white focus:border-blue-300'}`}
                                    />
                                    <button
                                        onClick={() => {
                                            if (sharingDoc?.previewUrl) {
                                                navigator.clipboard.writeText(sharingDoc.previewUrl);
                                                toast.success('Đã copy link chia sẻ!');
                                            }
                                        }}
                                        className="absolute right-1 top-1 bottom-1 px-4 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button className={`p-4 rounded-2xl border transition-all group flex flex-col items-center gap-2 ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-blue-900/20' : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                                    <div className={`p-2.5 rounded-xl transition-colors shadow-sm border ${isDarkTheme ? 'bg-slate-900 text-slate-400 group-hover:text-blue-500 border-slate-700' : 'bg-white text-slate-400 group-hover:text-blue-500 border-slate-100'}`}>
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest group-hover:text-blue-600 ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>Public Access</span>
                                </button>
                                <button className={`p-4 rounded-2xl border transition-all group flex flex-col items-center gap-2 ${isDarkTheme ? 'bg-slate-800 border-slate-700 hover:border-brand hover:bg-brand-900/20' : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                                    <div className={`p-2.5 rounded-xl transition-colors shadow-sm border ${isDarkTheme ? 'bg-slate-900 text-slate-400 group-hover:text-brand border-slate-700' : 'bg-white text-slate-400 group-hover:text-brand border-slate-100'}`}>
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest group-hover:text-brand ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>Restricted</span>
                                </button>
                            </div>
                        </div>

                        <div className={`p-6 border-t flex gap-3 ${isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
                            <button
                                onClick={() => setSharingDoc(null)}
                                className={`flex-1 py-3.5 px-4 border rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isDarkTheme ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    window.open(sharingDoc?.previewUrl, '_blank');
                                }}
                                className="flex-1 py-3.5 px-4 bg-slate-900 border border-slate-800 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Mở tệp
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={!!deletingDoc}
                    onClose={() => setDeletingDoc(null)}
                    noHeader={true}
                    noPadding={true}
                    size="sm"
                >
                    <div className={`rounded-3xl overflow-hidden shadow-2xl flex flex-col border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-8 text-center bg-rose-50/30 ${isDarkTheme ? 'bg-rose-900/20' : ''}`}>
                            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 mx-auto animate-pulse shadow-xl shadow-rose-500/5">
                                <Trash2 className="w-10 h-10" />
                            </div>
                            <h3 className={`font-black text-xl tracking-tight leading-none mb-3 ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Xác nhận xóa tệp</h3>
                            <p className={`text-sm leading-relaxed px-6 ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>
                                Bạn có chắc chắn muốn xóa tệp <span className={`font-bold italic ${isDarkTheme ? 'text-slate-100' : 'text-slate-700'}`}>"{deletingDoc?.name}"</span>? Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div className={`p-6 flex gap-4 ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
                            <button
                                onClick={() => setDeletingDoc(null)}
                                className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isDarkTheme ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={async () => {
                                    if (!deletingDoc) return;
                                    const doc = deletingDoc;
                                    const updated = workspaceDocs.filter(d => d.name !== doc.name);
                                    setWorkspaceDocs(updated);
                                    setOpenTabNames(prev => prev.filter(name => name !== doc.name));
                                    if (activeDoc?.name === doc.name) {
                                        setActiveDoc(updated.length > 0 ? updated[0] : null);
                                    }

                                    // If it's an image/chat asset, also mark as deleted locally
                                    if (doc.previewUrl || doc.base64) {
                                        setDeletedGalleryImages(prev => [...prev, doc.previewUrl || doc.base64 || '']);
                                    }

                                    try {
                                        await api.post('ai_org_chatbot?action=workspace_delete', {
                                            conversation_id: remoteConvId || sessionId,
                                            property_id: activeBot?.id,
                                            name: doc.name
                                        });
                                        toast.success('Đã xóa tệp kh?i Workspace');
                                    } catch (e) {
                                        toast.error('Lỗi khi xóa tệp');
                                    }

                                    setDeletingDoc(null);
                                }}
                                className="flex-1 py-4 px-6 bg-rose-600 hover:bg-rose-700 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-600/20"
                            >
                                Xóa vĩnh viễn
                            </button>
                        </div>
                    </div>
                </Modal>


                <Modal
                    isOpen={isClearConfirmOpen}
                    onClose={() => setIsClearConfirmOpen(false)}
                    noHeader={true}
                    noPadding={true}
                    size="sm"
                >
                    <div className={`border rounded-[32px] overflow-hidden shadow-2xl anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`px-6 py-5 border-b flex justify-between items-center ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`font-bold ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Bắt đầu phiên mới</h3>
                            <button onClick={() => setIsClearConfirmOpen(false)} className={`transition-colors ${isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className={`text-sm mb-8 leading-relaxed ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>Mọi ngữ cảnh tạm thời sẽ bị xoá để bắt đầu dữ liệu mới và tối ưu hóa phản hồi.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsClearConfirmOpen(false)} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${isDarkTheme ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}>Hủy</button>
                                <button
                                    onClick={() => {
                                        // Abort any ongoing generation
                                        if (abortControllerRef.current) abortControllerRef.current.abort();

                                        setMessages([]);
                                        setSessionId('session_' + Date.now());

                                        // UX: Reset modes
                                        stopListening();
                                        setIsImageGenMode(false);
                                        setIsResearchMode(false);
                                        setIsKbOnlyMode(true);
                                        setIsEditingImage(false);
                                        setAttachments([]);
                                        setInput('');

                                        setIsClearConfirmOpen(false);
                                        isInitialScrollRef.current = true;
                                    }}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all text-sm font-bold shadow-lg shadow-red-500/20"
                                >
                                    Làm mới
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* User Profile / Settings Modal */}
                <UserProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    orgUser={orgUser}
                    isDarkTheme={isDarkTheme}
                    setIsDarkTheme={setIsDarkTheme}
                    onLogout={handleLogout}
                    onUpdateUser={updateOrgUser}
                />

                {/* Delete Session Modal */}
                {/* Delete Session Modal */}
                <DeleteSessionModal
                    isOpen={!!sessionToDelete}
                    onClose={() => setSessionToDelete(null)}
                    onConfirm={confirmDeleteSession}
                    isDarkTheme={isDarkTheme}
                />

                {/* Feedback Modal */}
                <FeedbackModal
                    isOpen={isFeedbackOpen}
                    onClose={() => setIsFeedbackOpen(false)}
                    isDarkTheme={isDarkTheme}
                    categoryId={categoryId}
                    botId={activeBot?.id}
                    conversationId={remoteConvId || sessionId}
                    brandColor={brandColor}
                />

                {/* Share Public Modal */}
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    shareUrl={`${window.location.origin}/ai-space/${categoryId}/${activeBot?.id}/share_${sessionId}`}
                    isDarkTheme={isDarkTheme}
                />

                {/* Context Menu */}
                {
                    contextMenu && (
                        <div
                            className={`fixed z-[100] rounded-xl shadow-2xl border py-1.5 w-48 anim-scale-in origin-top-left ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                        >
                            <div className={`px-3 py-1.5 border-b mb-1 ${isDarkTheme ? 'border-slate-700' : 'border-slate-50'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>{contextMenu.doc.name}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setQuickLookDoc(contextMenu.doc);
                                    setContextMenu(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDarkTheme ? 'text-slate-300 hover:bg-slate-800 hover:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Eye className="w-3.5 h-3.5" /> Xem nhanh (Space)
                            </button>
                            <button
                                onClick={() => {
                                    if (!openTabNames.includes(contextMenu.doc.name)) {
                                        setOpenTabNames(prev => [...prev, contextMenu.doc.name]);
                                    }
                                    setActiveDoc(contextMenu.doc);
                                    setContextMenu(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDarkTheme ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-400' : 'text-slate-600 hover:bg-slate-50 hover:text-amber-600'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Mở trong Tab
                            </button>
                            <div className={`my-1 border-t ${isDarkTheme ? 'border-slate-700' : 'border-slate-50'}`} />
                            <button
                                onClick={() => {
                                    setDeletingDoc(contextMenu.doc);
                                    setContextMenu(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDarkTheme ? 'text-rose-400 hover:bg-rose-900/20' : 'text-rose-500 hover:bg-rose-50'}`}
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa tệp
                            </button>
                            {/* Overlay to close on click outside */}
                            <div className="fixed inset-0 -z-10" onClick={() => setContextMenu(null)} />
                        </div>
                    )
                }

                {/* Quick Look Modal */}
                {
                    quickLookDoc && (
                        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setQuickLookDoc(null)}>
                            <div className={`rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                                <div className={`p-4 border-b flex items-center justify-between ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 border rounded-lg ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <FileText className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-sm ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{quickLookDoc.name}</h3>
                                            <p className={`text-[10px] font-mono ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{formatFileSize(quickLookDoc.size)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (!openTabNames.includes(quickLookDoc.name)) {
                                                    setOpenTabNames(prev => [...prev, quickLookDoc.name]);
                                                }
                                                setActiveDoc(quickLookDoc);
                                                setQuickLookDoc(null);
                                            }}
                                            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors"
                                        >
                                            M? ch?nh s?a
                                        </button>
                                        <button onClick={() => setQuickLookDoc(null)} className={`p-2 rounded-xl transition-colors ${isDarkTheme ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className={`flex-1 overflow-auto p-8 flex items-center justify-center ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                    {quickLookDoc.type.startsWith('image/') ? (
                                        <img src={quickLookDoc.previewUrl || quickLookDoc.base64} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                                    ) : (
                                        <div className={`p-8 rounded-xl shadow-sm max-w-2xl w-full text-center ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
                                            <FileText className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                                            <p className={`text-slate-500 ${isDarkTheme ? 'text-slate-400' : ''}`}>Bản xem trước không có sẵn cho loại tệp này.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* AI Studio Sidebar Overlay - Placed at Root for Maximum Coverage */}
                <ImageSettingsSidebar
                    isOpen={isImageSettingsOpen}
                    onClose={() => setIsImageSettingsOpen(false)}
                    isImageGenMode={isImageGenMode}
                    setIsImageGenMode={setIsImageGenMode}
                    imageProvider={imageProvider}
                    setImageProvider={setImageProvider}
                    imageStyle={imageStyle}
                    setImageStyle={setImageStyle}
                    imageSize={imageSize}
                    setImageSize={setImageSize}
                    setInput={setInput}
                    textareaRef={textareaRef}
                    IMAGE_PROVIDERS={IMAGE_PROVIDERS}
                    IMAGE_STYLES={IMAGE_STYLES}
                    IMAGE_SIZES={IMAGE_SIZES}
                    DIAGRAM_TEMPLATES={DIAGRAM_TEMPLATES}
                    isDarkTheme={isDarkTheme}
                />
                {/* Gallery Image Delete Confirmation Modal */}
                <Modal
                    isOpen={isDeleteGalleryModalOpen}
                    onClose={() => setIsDeleteGalleryModalOpen(false)}
                    noHeader={true}
                    noPadding={true}
                    size="sm"
                >
                    <div className={`rounded-[32px] overflow-hidden shadow-2xl flex flex-col border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-8 text-center bg-rose-50/50 relative overflow-hidden ${isDarkTheme ? 'bg-rose-900/20' : ''}`}>
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-rose-600">
                                <Trash2 className="w-32 h-32" />
                            </div>
                            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 mx-auto shadow-xl shadow-rose-500/10 relative z-10">
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h3 className={`font-black text-xl tracking-tight leading-none mb-3 relative z-10 ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Xác nhận xóa tệp</h3>
                            <p className={`text-sm leading-relaxed px-6 relative z-10 font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>
                                Bạn có chắc chắn muốn xóa {isGallerySelectMode ? selectedGalleryImages.length : 1} tệp vĩnh viễn khỏi thư viện? Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div className={`p-6 flex gap-4 ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
                            <button
                                onClick={() => {
                                    setIsDeleteGalleryModalOpen(false);
                                    setDeletingGalleryUrl(null);
                                }}
                                className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isDarkTheme ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmDeleteGalleryImages}
                                className="flex-1 py-4 px-6 bg-rose-600 hover:bg-rose-700 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-600/20"
                            >
                                Xóa vĩnh viễn
                            </button>
                        </div>
                    </div>
                </Modal>



                {/* Global Asset Delete Confirmation Modal */}
                <Modal
                    isOpen={isDeleteGlobalModalOpen}
                    onClose={() => setIsDeleteGlobalModalOpen(false)}
                    noHeader={true}
                    noPadding={true}
                    size="sm"
                >
                    <div className={`rounded-[32px] overflow-hidden shadow-2xl flex flex-col border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-8 text-center bg-rose-50/50 relative overflow-hidden ${isDarkTheme ? 'bg-rose-900/20' : ''}`}>
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-rose-600">
                                <Trash2 className="w-32 h-32" />
                            </div>
                            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 mx-auto shadow-xl shadow-rose-500/10 relative z-10">
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h3 className={`font-black text-xl tracking-tight leading-none mb-3 relative z-10 ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Xác nhận xóa tài liệu</h3>
                            <p className={`text-sm leading-relaxed px-6 relative z-10 font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>
                                Bạn có chắc chắn muốn xóa {globalAssetIdsToDelete.length > 1 ? `${globalAssetIdsToDelete.length} tệp` : 'tệp này'} vĩnh viễn khỏi Global Workspace? Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div className={`p-6 flex gap-4 ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`}>
                            <button
                                onClick={() => {
                                    setIsDeleteGlobalModalOpen(false);
                                    setGlobalAssetIdsToDelete([]);
                                }}
                                className={`flex-1 py-4 px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${isDarkTheme ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmDeleteGlobal}
                                className="flex-1 py-4 px-6 bg-rose-600 hover:bg-rose-700 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-600/20"
                            >
                                Xóa vĩnh viễn
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Lightbox Image Preview Modal */}
                {/* Lightbox Image Preview Modal */}
                <ImagePreviewModal
                    previewImage={previewImage}
                    onClose={() => setPreviewImage(null)}
                    onDownload={() => { }} // already handled in component via anchor tag logic
                    onEdit={(e) => {
                        e.stopPropagation();
                        // Find asset info to get conversation_id
                        const asset = globalDbAssets.find(a => a.previewUrl === previewImage) ||
                            extractedAssets.images.find(a => a.previewUrl === previewImage);

                        setPreviewImage(null);

                        if (asset && asset.conversationId) {
                            // If associated with a conversation, go there
                            if (asset.propertyId && categoryId) {
                                navigate(`/ai-space/${categoryId}/${asset.propertyId}/${asset.conversationId}`);
                                // Trigger edit after navigation
                                setTimeout(() => (window as any).__editImage(previewImage), 500);
                            }
                        } else {
                            // Create new conversation
                            const botIdToUse = activeBot?.id || chatbots[0]?.id;
                            if (botIdToUse && categoryId) {
                                const newSessionId = 'session_' + Date.now();
                                navigate(`/ai-space/${categoryId}/${botIdToUse}/${newSessionId}`);
                                setTimeout(() => (window as any).__editImage(previewImage), 500);
                            } else {
                                toast.error('Vui lòng chọn một Bot để chỉnh sửa');
                            }
                        }
                    }}
                    onMakeGlobal={(e) => {
                        e.stopPropagation();
                        if (!previewImage) return;
                        // Handle Make Global from Preview
                        // Note: we can't fully inline async logic easily here without more refactoring
                        // so I will keep the logic here
                        const asset = globalDbAssets.find(a => a.previewUrl === previewImage) ||
                            extractedAssets.images.find(a => a.previewUrl === previewImage);

                        // ... logic ...
                        const doMakeGlobal = async () => {
                            try {
                                const tid = toast.loading('ĐĐang xử lýý...');
                                await api.post('ai_org_chatbot', {
                                    action: 'workspace_save', // Use workspace_save for consistency
                                    url: previewImage,
                                    name: asset?.name || `global_img_${Date.now()}.png`,
                                    type: asset?.type || 'image/png',
                                    size: asset?.size || 0,
                                    property_id: activeBot?.id || chatbots[0]?.id,
                                    conversation_id: sessionId || asset?.conversationId,
                                    source: 'workspace'
                                });
                                toast.success('Đã thêm vào Global', { id: tid });
                                // Refresh global assets
                                fetchGlobalAssets();
                            } catch (e) {
                                toast.error('Lỗi khi thêm');
                            }
                        };
                        doMakeGlobal();
                    }}
                    onDelete={(e) => {
                        e.stopPropagation();
                        if (!previewImage) return;

                        // Check if global or session image and delete
                        const globalAsset = globalDbAssets.find(a => a.previewUrl === previewImage);
                        if (globalAsset && typeof globalAsset.id === 'number') {
                            setPreviewImage(null);
                            handleDeleteFromDb([globalAsset.id]);
                        } else {
                            setPreviewImage(null);
                            handleDeleteGalleryImages([previewImage]);
                        }
                    }}
                    isGlobal={(() => {
                        const asset = globalDbAssets.find(a => a.previewUrl === previewImage) ||
                            extractedAssets.images.find(a => a.previewUrl === previewImage);
                        return asset?.source === 'workspace';
                    })()}
                    isDarkTheme={isDarkTheme}
                />

                {/* Rename Conversation Modal */}
                <RenameSessionModal
                    isOpen={isRenameModalOpen}
                    onClose={() => {
                        setIsRenameModalOpen(false);
                        setRenameSessionData(null);
                        setNewSessionTitle('');
                    }}
                    sessionTitle={newSessionTitle}
                    setSessionTitle={setNewSessionTitle}
                    onConfirm={handleRenameSession}
                    isDarkTheme={isDarkTheme}
                />
                {/* Workspace Tips Modal */}
                <Modal
                    isOpen={isWorkspaceTipsOpen}
                    onClose={() => setIsWorkspaceTipsOpen(false)}
                    title="M?o s? d?ng Workspace & AI Studio"
                    size="lg"
                    isDarkTheme={isDarkTheme}
                >
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* AI Studio Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand/20">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>AI Studio & Rendering</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { title: "Tự động lưu vào Gallery", desc: "Mọi ảnh AI tạo ra đều được tự động lưu vào Global Workspace để bạn sử dụng lại sau này." },
                                    { title: "Chỉnh sửa ảnh chuyên nghiệp", desc: "Click vào ảnh trong chat để mở trình chỉnh sửa, cho phép thay đổi chi tiết hoặc mở rộng ảnh (In-painting)." },
                                    { title: "Smart Prompting", desc: "Sử dụng icon Sparkles ở thanh chat để AI tự động tối ưu câu lệnh hình ảnh của bạn trở nên chi tiết và nghệ thuật hơn." },
                                    { title: "Style Reference", desc: "Đính kèm ảnh mẫu và yêu cầu AI sáng tạo nội dung mới dựa trên phong cách, bố cục hoặc màu sắc của ảnh đó." }
                                ].map((item, i) => (
                                    <div key={i} className={`flex gap-3 items-start p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-semibold mb-1 ${isDarkTheme ? 'text-slate-200' : 'text-slate-800'}`}>{item.title}</p>
                                            <p className={`text-xs leading-relaxed ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Workspace Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand/20">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>Workspace & Context</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    {
                                        title: "Đính kèm làm ngữ cảnh",
                                        desc: "Chọn tệp từ Workspace để AI đọc và trả lời dựa trên nội dung đó. Hỗ trợ hàng trăm trang tài liệu cùng lúc."
                                    },
                                    {
                                        title: "Knowledge Only Mode",
                                        desc: "Bật chế độ Database để ép AI chỉ sử dụng dữ liệu từ nguồn tin cậy của bạn, tránh các câu trả lời sai lệch."
                                    },
                                    {
                                        title: "Tìm kiếm thông minh",
                                        desc: "Hệ thống tự động lập chỉ mục nội dung tài liệu, giúp bạn tìm kiếm cực nhanh trong hàng ngàn tệp tin Global."
                                    },
                                    {
                                        title: "Đồng bộ đa thiết bị",
                                        desc: "Tải lên Global Workspace sẽ khả dụng cho tất cả các Bot của bạn trên mọi cuộc hội thoại."
                                    }
                                ]
                                    .map((item, i) => (
                                        <div key={i} className={`flex gap-3 items-start p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                            <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-semibold mb-1 ${isDarkTheme ? 'text-slate-200' : 'text-slate-800'}`}>{item.title}</p>
                                                <p className={`text-xs leading-relaxed ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Additional Features Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand/20">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className={`text-sm font-bold uppercase tracking-wide ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>Tính năng khác</h3>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    "Xem trước PDF, Excel, Code ngay trong Workspace.",
                                    "Chế độ 'Grounding' giảm thiểu AI ảo tưởng.",
                                    "Xuất toàn bộ lịch sử hội thoại nhanh chóng.",
                                    "Tính năng Zen Mode để làm việc tập trung hơn.",
                                    "Code Mode tối ưu cho lập trình viên.",
                                    "Real-time Web Search và phân tích YouTube."
                                ].map((text, i) => (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                        <span className={`text-sm leading-relaxed ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Org User Manager Modal */}
                {isOrgManagerOpen && (
                    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsOrgManagerOpen(false)}>
                        <div className={`rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col ${isDarkTheme ? 'bg-slate-900' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                            <div className={`p-4 border-b flex items-center justify-between ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                <h3 className={`font-bold text-lg ${isDarkTheme ? 'text-slate-100' : ''}`}>Organization Management</h3>
                                <button onClick={() => { setIsOrgManagerOpen(false); setTargetEditUserId(null); }} className={`p-2 rounded-full ${isDarkTheme ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className={`flex-1 overflow-hidden p-6 ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                <OrgUserManager initialEditUserId={targetEditUserId} isDarkTheme={isDarkTheme} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={`${window.location.origin}/share/${activeBot?.slug || activeBot?.id || 'public'}/${remoteConvId || sessionId}`}
                isDarkTheme={isDarkTheme}
            />

            {/* User Warning Modal */}
            <ClearWorkspaceModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onConfirm={confirmClearWorkspace}
                isDarkTheme={isDarkTheme}
            />
            <InputModal
                isOpen={showSaveSnippetModal}
                onClose={() => setShowSaveSnippetModal(false)}
                onConfirm={confirmSaveSnippet}
                title="Lưu Document"
                message="Nhập tên cho document (kèm phần mở rộng ví dụ .html, .css):"
                defaultValue={snippetToSave?.name}
                placeholder="filename.html"
                confirmLabel="Lưu lại"
                isDarkTheme={isDarkTheme}
            />
            {
                orgUser?.status === 'warning' && !hasSeenWarning && (
                    <WarningUserModal onContentClick={() => {
                        setHasSeenWarning(true);
                        localStorage.setItem(`warning_seen_${orgUser.id}`, 'true');
                    }} isDarkTheme={isDarkTheme} />
                )
            }

            {/* ===== SHARE CONVERSATION MODAL ===== */}
            {isShareConvModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setIsShareConvModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-backdrop-in" />
                    <div
                        className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                    <Share2 className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className={`font-black text-base ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
                                        {isConvPublic ? '🔗 Cuộc trò chuyện đã được chia sẻ' : '🔒 Đã đặt về riêng tư'}
                                    </h3>
                                    <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {isConvPublic ? 'Bất kỳ ai có link đều có thể xem và duplicate' : 'Chỉ bạn mới có thể xem'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {isConvPublic && (
                                <>
                                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                        <input
                                            readOnly
                                            value={shareConvUrl}
                                            className={`flex-1 text-xs font-mono bg-transparent outline-none truncate ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'
                                                }`}
                                        />
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(shareConvUrl); toast.success('Đã copy link!'); }}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shrink-0"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <p className={`text-[11px] ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                                        💡 Khi người khác truy cập link này, họ sẽ được hỏi có muốn tạo bản sao không.
                                    </p>
                                </>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setIsConvPublic(false); handleShareConversation(); }}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${!isConvPublic
                                        ? 'bg-slate-800 text-white border-slate-700'
                                        : (isDarkTheme ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                                        }`}
                                >
                                    🔒 Riêng tư
                                </button>
                                <button
                                    onClick={() => setIsShareConvModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                >
                                    Xong
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DUPLICATE CONVERSATION MODAL (shown when accessing public conversation) ===== */}
            {isDuplicateModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md anim-backdrop-in" />
                    <div
                        className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border anim-modal-in ${isDarkTheme ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                    >
                        {/* Decorative top */}
                        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <div className="p-6">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                                <Copy className="w-7 h-7 text-blue-500" />
                            </div>
                            <h3 className={`text-center font-black text-lg mb-1 ${isDarkTheme ? 'text-white' : 'text-slate-800'
                                }`}>Cuộc trò chuyện được chia sẻ</h3>
                            <p className={`text-center text-sm mb-1 font-semibold ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                                }`}>"{duplicateSourceTitle}"</p>
                            <p className={`text-center text-xs mb-6 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                Cuộc trò chuyện này không thuộc về bạn. Bạn có muốn tạo bản sao để tiếp tục không?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsDuplicateModalOpen(false); navigate(-1); }}
                                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all border ${isDarkTheme ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Quay lại
                                </button>
                                <button
                                    onClick={handleDuplicateConversation}
                                    disabled={isDuplicating}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                    {isDuplicating ? 'Đang tạo...' : 'Tạo bản sao'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Keyboard Shortcuts Help */}
            <KeyboardHelpModal
                isOpen={isKeyboardHelpOpen}
                onClose={() => setIsKeyboardHelpOpen(false)}
                isDarkTheme={isDarkTheme}
            />

            <ChatSummaryPanel
                isOpen={isSummaryOpen}
                onClose={() => setIsSummaryOpen(false)}
                summary={chatSummary}
                isLoading={isSummarizing}
                onRegenerate={() => setIsSummaryConfirmOpen(true)}
                isDarkTheme={isDarkTheme}
            />

            {/* Summary Confirmation Modal */}
            <Modal
                isOpen={isSummaryConfirmOpen}
                onClose={() => setIsSummaryConfirmOpen(false)}
                title="Xác nhận tóm tắt"
                isDarkTheme={isDarkTheme}
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4 text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                                Bạn có muốn AI tóm tắt những nội dung chính quan trọng từ cuộc hội thoại này không?
                            </p>
                            <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest"></p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsSummaryConfirmOpen(false)}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDarkTheme ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSummarize}
                            className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Đồng ý
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CategoryChatPage;