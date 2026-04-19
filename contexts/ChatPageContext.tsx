
import * as React from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { FileAttachment, Message, ChatbotInfo } from '../types';
import { hexToHSL } from '../utils/formatters';
import { api } from '../services/storageAdapter';
import toast from 'react-hot-toast';
import { saveTokens, clearTokens, getRawRefreshToken, hasStoredTokens } from '../services/tokenManager';
import { AIPersona, AI_PERSONAS, getPersonaById } from '../data/personas';

export interface OrgUser {
    id: number;
    email: string;
    full_name: string;
    gender?: 'male' | 'female' | 'other' | null;
    role: 'admin' | 'assistant' | 'user';
    status: 'active' | 'banned' | 'warning';
    status_reason?: string;
    status_expiry?: string;
    permissions: {
        modes: string[];
        access: string;
    };
}

interface ChatPageContextType {
    // UI State
    viewMode: 'home' | 'chat' | 'global_workspace';
    setViewMode: (mode: 'home' | 'chat' | 'global_workspace') => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;

    // Data State
    chatbots: ChatbotInfo[];
    setChatbots: (bots: ChatbotInfo[]) => void;
    activeBot: ChatbotInfo | null;
    setActiveBot: (bot: ChatbotInfo | null) => void;
    categorySettings: any;
    // Org User State
    orgUser: OrgUser | null;
    loginOrgUser: (email: string, password: string, remember?: boolean) => Promise<boolean>;
    loginOrgUserWithGoogle: (credential: string) => Promise<boolean>;
    logoutOrgUser: () => Promise<void>;
    checkOrgSession: () => Promise<void>;
    updateOrgUser: (fields: Partial<OrgUser>) => void;
    isCheckingOrgAuth: boolean;

    setCategorySettings: (settings: any) => void;
    brandColor: string;

    // Chat State
    messages: Message[];
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    loadingChat: boolean;
    setLoadingChat: (loading: boolean) => void;
    sessionId: string;
    setSessionId: (id: string) => void;
    attachments: FileAttachment[];
    setAttachments: (attachments: FileAttachment[] | ((prev: FileAttachment[]) => FileAttachment[])) => void;

    // AI Settings
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    isResearchMode: boolean;
    setIsResearchMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
    isKbOnlyMode: boolean;
    setIsKbOnlyMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
    isImageGenMode: boolean;
    setIsImageGenMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
    isCodeMode: boolean;
    setIsCodeMode: (mode: boolean | ((prev: boolean) => boolean)) => void;

    // Workspace State
    workspaceDocs: FileAttachment[];
    setWorkspaceDocs: (docs: FileAttachment[] | ((prev: FileAttachment[]) => FileAttachment[])) => void;
    activeDoc: FileAttachment | null;
    setActiveDoc: React.Dispatch<React.SetStateAction<FileAttachment | null>>;
    isDocWorkspaceOpen: boolean;
    setIsDocWorkspaceOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    openTabNames: string[];
    setOpenTabNames: (names: string[] | ((prev: string[]) => string[])) => void;
    remoteConvId: string | null;
    setRemoteConvId: (id: string | null) => void;
    docContent: string;
    setDocContent: (content: string) => void;

    // Session Management State
    isRenameModalOpen: boolean;
    setIsRenameModalOpen: (open: boolean) => void;
    renameSessionData: { botId: string, sessionId: string, currentTitle: string } | null;
    setRenameSessionData: (data: { botId: string, sessionId: string, currentTitle: string } | null) => void;
    newSessionTitle: string;
    setNewSessionTitle: (title: string) => void;
    isShareModalOpen: boolean;
    setIsShareModalOpen: (open: boolean) => void;
    isClearModalOpen: boolean;
    setIsClearModalOpen: (open: boolean) => void;
    isClearConfirmOpen: boolean;
    setIsClearConfirmOpen: (open: boolean) => void;
    sessionToDelete: { botId: string; sessId: string } | null;
    setSessionToDelete: (data: { botId: string; sessId: string } | null) => void;
    isModelModalOpen: boolean;
    setIsModelModalOpen: (open: boolean) => void;
    autoTTS: boolean;
    setAutoTTS: (auto: boolean) => void;
    isEnhancing: boolean;
    setIsEnhancing: (enhancing: boolean) => void;
    isImageSettingsOpen: boolean;
    setIsImageSettingsOpen: (open: boolean) => void;
    isGeneratingImage: boolean;
    setIsGeneratingImage: (gen: boolean) => void;
    imageProvider: string;
    setImageProvider: (provider: string) => void;
    isEditingImage: boolean;
    setIsEditingImage: (editing: boolean) => void;
    currentUser: any;
    setCurrentUser: (user: any) => void;
    imageStyle: string;
    setImageStyle: (style: string) => void;
    imageSize: string;
    setImageSize: (size: string) => void;
    isZenMode: boolean;
    setIsZenMode: (zen: boolean | ((prev: boolean) => boolean)) => void;
    suggestedQuestions: string[];
    setSuggestedQuestions: (questions: string[] | ((prev: string[]) => string[])) => void;
    selectedContextDocs: FileAttachment[];
    setSelectedContextDocs: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    abortControllerRef: React.MutableRefObject<AbortController | null>;
    workspacePosition: 'left' | 'right';
    setWorkspacePosition: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
    isDarkTheme: boolean;
    setIsDarkTheme: (isDark: boolean | ((prev: boolean) => boolean)) => void;
    // Persona
    selectedPersona: AIPersona;
    setSelectedPersona: (persona: AIPersona) => void;
    isPersonaPickerOpen: boolean;
    setIsPersonaPickerOpen: (open: boolean) => void;
    // Citations
    isCiteMode: boolean;
    setIsCiteMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
    hasPdfs: boolean;
    setHasPdfs: (has: boolean) => void;
}

const ChatPageContext = createContext<ChatPageContextType | undefined>(undefined);

export const ChatPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewMode, setViewMode] = useState<'home' | 'chat' | 'global_workspace'>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => localStorage.getItem('isSidebarOpen') !== 'false');
    const [searchTerm, setSearchTerm] = useState('');

    const [chatbots, setChatbots] = useState<ChatbotInfo[]>([]);
    const [activeBot, setActiveBot] = useState<ChatbotInfo | null>(null);
    const [categorySettings, setCategorySettings] = useState<any>(null);

    const brandColor = useMemo(() => {
        return categorySettings?.brand_color || activeBot?.settings?.brand_color || '#0066FF';
    }, [categorySettings, activeBot]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [sessionId, setSessionId] = useState(() => 'session_' + Date.now());
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);

    const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selectedAIModel') || 'auto');
    const [isResearchMode, setIsResearchMode] = useState(() => localStorage.getItem('isResearchMode') === 'true');
    const [isKbOnlyMode, setIsKbOnlyMode] = useState(() => {
        const saved = localStorage.getItem('isKbOnlyMode');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isImageGenMode, setIsImageGenMode] = useState(() => {
        const saved = localStorage.getItem('isImageGenMode');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [isCodeMode, setIsCodeMode] = useState(() => localStorage.getItem('isCodeMode') === 'true');

    const [workspaceDocs, setWorkspaceDocs] = useState<FileAttachment[]>([]);
    const [activeDoc, setActiveDoc] = useState<FileAttachment | null>(null);
    const [isDocWorkspaceOpen, setIsDocWorkspaceOpen] = useState(false);
    const [openTabNames, setOpenTabNames] = useState<string[]>([]);
    const [remoteConvId, setRemoteConvId] = useState<string | null>(null);
    const [docContent, setDocContent] = useState('');

    // Session Management State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameSessionData, setRenameSessionData] = useState<{ botId: string, sessionId: string, currentTitle: string } | null>(null);
    const [newSessionTitle, setNewSessionTitle] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<{ botId: string; sessId: string } | null>(null);
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [autoTTS, setAutoTTS] = useState(() => localStorage.getItem('autoTTS') === 'true');
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isImageSettingsOpen, setIsImageSettingsOpen] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageProvider, setImageProvider] = useState(() => localStorage.getItem('imageProvider') || 'gemini-3-pro-image-preview');
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [imageStyle, setImageStyle] = useState(() => localStorage.getItem('imageStyle') || 'professional');
    const [imageSize, setImageSize] = useState(() => localStorage.getItem('imageSize') || '1K');
    const [isZenMode, setIsZenMode] = useState(() => localStorage.getItem('isZenMode') === 'true');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [selectedContextDocs, setSelectedContextDocs] = useState<FileAttachment[]>([]);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const [workspacePosition, setWorkspacePosition] = useState<'left' | 'right'>(() => {
        const saved = localStorage.getItem('workspacePosition');
        return (saved === 'left' || saved === 'right') ? saved : 'right';
    });
    // Org User State with localStorage persistence
    const [orgUser, setOrgUser] = useState<OrgUser | null>(() => {
        try {
            const saved = localStorage.getItem('orgUser');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const saved = localStorage.getItem('isDarkTheme');
        return saved !== null ? JSON.parse(saved) : false;
    });

    const [selectedPersona, setSelectedPersonaState] = useState<AIPersona>(() => {
        const saved = localStorage.getItem('selectedPersonaId');
        return saved ? getPersonaById(saved) : AI_PERSONAS[0];
    });
    const [isPersonaPickerOpen, setIsPersonaPickerOpen] = useState(false);

    const setSelectedPersona = (persona: AIPersona) => {
        setSelectedPersonaState(persona);
        localStorage.setItem('selectedPersonaId', persona.id);
    };

    const [isCiteMode, setIsCiteMode] = useState(() => {
        const saved = localStorage.getItem('isCiteMode');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [hasPdfs, setHasPdfs] = useState(false);

    const [isCheckingOrgAuth, setIsCheckingOrgAuth] = useState(true);

    const loginOrgUser = async (email: string, password: string, remember: boolean = false) => {
        const tid = toast.loading('Đang đăng nhập...');
        try {
            const res = await api.post<any>('ai_org_auth.php?action=login', { email, password, remember });
            if (res.success) {
                // res.data = { user, access_token, refresh_token, expires_in }
                const payload = res.data as any;
                const userData: OrgUser = payload.user ?? payload;

                // ── Save tokens to localStorage ──────────────────────────────
                if (payload.access_token && payload.refresh_token) {
                    saveTokens({
                        access_token: payload.access_token,
                        refresh_token: payload.refresh_token,
                        expires_in: payload.expires_in ?? 900,
                    });
                }

                setOrgUser(userData);
                localStorage.setItem('orgUser', JSON.stringify(userData));
                toast.success(`Chào mừng trở lại, ${userData.full_name}!`, { id: tid });
                return true;
            }
            toast.error(res.message || 'Sai email hoặc mật khẩu', { id: tid });
            throw new Error(res.message);
        } catch (error: any) {
            console.error("Login Error:", error);
            if (!error.message || error.message === 'undefined') {
                toast.error('Lỗi kết nối máy chủ', { id: tid });
            }
            throw error;
        }
    };

    const loginOrgUserWithGoogle = async (credential: string) => {
        const tid = toast.loading('Đang xác thực Google...');
        try {
            const res = await api.post<any>('ai_org_auth.php?action=google_login', { credential });
            if (res.success) {
                const payload = res.data as any;
                const userData: OrgUser = payload.user ?? payload;

                // ── Save tokens to localStorage ──────────────────────────────
                if (payload.access_token && payload.refresh_token) {
                    saveTokens({
                        access_token: payload.access_token,
                        refresh_token: payload.refresh_token,
                        expires_in: payload.expires_in ?? 900,
                    });
                }

                setOrgUser(userData);
                localStorage.setItem('orgUser', JSON.stringify(userData));
                toast.success('Đăng nhập thành công!', { id: tid });
                return true;
            }
            // Dismiss loading toast — caller (LoginPage) will show the actual error
            toast.dismiss(tid);
            return false;
        } catch (error: any) {
            // Network / parse error — dismiss loading toast, let caller handle UI
            toast.dismiss(tid);
            throw error;
        }
    };

    const logoutOrgUser = async () => {
        try {
            // Send refresh token to server so it can be revoked
            const refreshToken = getRawRefreshToken();
            await api.post('ai_org_auth.php?action=logout', { refresh_token: refreshToken || '' });
        } catch (e) {
            // Ignore server errors — still clear local state
        } finally {
            // ── Clear tokens from localStorage ──────────────────────────────
            clearTokens();
            setOrgUser(null);
            localStorage.removeItem('orgUser');
            toast.success('Đã đăng xuất');
        }
    };

    const updateOrgUser = useCallback((fields: Partial<OrgUser>) => {
        setOrgUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...fields };
            localStorage.setItem('orgUser', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const checkOrgSession = async () => {
        setIsCheckingOrgAuth(true);

        // Helper: auto-login as top admin of the current group
        const tryGroupAdminLogin = async (): Promise<boolean> => {
            // Support both hash routing (#/ai-space/:slug) and path routing (/ai-space/:slug)
            let categorySlugFromUrl = '';
            const hash = window.location.hash.replace('#/', '');
            if (hash) {
                // Hash router: #/ai-space/my-company/...
                const parts = hash.split('/');
                if (parts[0] === 'ai-space' && parts[1]) categorySlugFromUrl = parts[1];
            } else {
                // Browser router: /ai-space/my-company/...
                const parts = window.location.pathname.split('/');
                const idx = parts.indexOf('ai-space');
                if (idx !== -1 && parts[idx + 1]) categorySlugFromUrl = parts[idx + 1];
            }

            if (!categorySlugFromUrl || categorySlugFromUrl === 'login') return false;

            try {
                const autoRes = await api.post<any>('ai_org_auth.php?action=auto_login_group_admin', {
                    category_id: categorySlugFromUrl,
                    bypass_token: 'autoflow_admin_bypass_v1',
                });

                if (autoRes.success && autoRes.data) {
                    const authData = autoRes.data;
                    const userData: OrgUser = authData.user ?? authData;

                    if (authData.access_token && authData.refresh_token) {
                        saveTokens({
                            access_token: authData.access_token,
                            refresh_token: authData.refresh_token,
                            expires_in: authData.expires_in ?? 900,
                        });
                    }

                    setOrgUser(userData);
                    localStorage.setItem('orgUser', JSON.stringify(userData));
                    return true;
                }
            } catch (autoErr) {
                console.warn('[AI Space] Auto group-admin login failed:', autoErr);
            }
            return false;
        };

        try {
            const res = await api.get<OrgUser>('ai_org_auth.php?action=check');
            if (res.success && res.data) {
                const userData = res.data as any;

                // If the session returned the Autoflow virtual admin (admin-001),
                // replace it with the actual top admin of this AI-Space group.
                const isVirtualAdmin =
                    String(userData.id) === 'admin-001' ||
                    userData.email === 'admin@autoflow.vn';

                if (isVirtualAdmin) {
                    // Try to login as the real top admin of this group
                    const ok = await tryGroupAdminLogin();
                    if (!ok) {
                        // Fallback: still use admin-001 if no real admin found
                        setOrgUser(userData);
                        localStorage.setItem('orgUser', JSON.stringify(userData));
                    }
                } else {
                    // Normal real AI-Space user — use as-is
                    setOrgUser(userData);
                    localStorage.setItem('orgUser', JSON.stringify(userData));
                }
            } else {
                // No valid session at all → try group admin auto-login
                const ok = await tryGroupAdminLogin();
                if (!ok) {
                    // All auto-login attempts failed → redirect to login page
                    setOrgUser(null);
                    localStorage.removeItem('orgUser');
                }
            }
        } catch (e) {
            console.error('Session check error:', e);
        } finally {
            setIsCheckingOrgAuth(false);
        }
    };

    useEffect(() => {
        checkOrgSession();
    }, []);

    useEffect(() => {
        localStorage.setItem('workspacePosition', workspacePosition);
    }, [workspacePosition]);


    useEffect(() => {
        localStorage.setItem('isZenMode', isZenMode.toString());
    }, [isZenMode]);

    useEffect(() => {
        localStorage.setItem('isDarkTheme', JSON.stringify(isDarkTheme));
    }, [isDarkTheme]);

    useEffect(() => {
        localStorage.setItem('isCiteMode', JSON.stringify(isCiteMode));
    }, [isCiteMode]);

    const value = useMemo(() => ({
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
        loginOrgUser,
        loginOrgUserWithGoogle,
        logoutOrgUser,
        checkOrgSession,
        updateOrgUser,
        isCheckingOrgAuth,
        isDarkTheme,
        setIsDarkTheme,
        selectedPersona,
        setSelectedPersona,
        isPersonaPickerOpen,
        setIsPersonaPickerOpen,
        isCiteMode,
        setIsCiteMode,
        hasPdfs,
        setHasPdfs,
    }), [
        viewMode, isSidebarOpen, searchTerm, chatbots, activeBot, categorySettings, brandColor,
        messages, input, loadingChat, sessionId, attachments, selectedModel, isResearchMode,
        isKbOnlyMode, isImageGenMode, isCodeMode, workspaceDocs, activeDoc, isDocWorkspaceOpen,
        openTabNames, remoteConvId, docContent, isRenameModalOpen, renameSessionData,
        newSessionTitle, isShareModalOpen, isClearModalOpen, isClearConfirmOpen,
        sessionToDelete, isModelModalOpen, autoTTS, isEnhancing, isImageSettingsOpen,
        isGeneratingImage, imageProvider, isEditingImage, imageStyle, imageSize, isZenMode,
        currentUser, suggestedQuestions, selectedContextDocs, workspacePosition, orgUser,
        isCheckingOrgAuth, isDarkTheme, selectedPersona, isPersonaPickerOpen, updateOrgUser,
        isCiteMode, hasPdfs
    ]);

    return (
        <ChatPageContext.Provider value={value}>
            {children}
        </ChatPageContext.Provider>
    );
};


export const useChatPage = () => {
    const context = useContext(ChatPageContext);
    if (context === undefined) {
        throw new Error('useChatPage must be used within a ChatPageProvider');
    }
    return context;
};
