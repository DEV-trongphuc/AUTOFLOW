// --- TYPES ---

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachments?: FileAttachment[];
    quickActions?: string[];
}

export interface FileAttachment {
    id?: string;
    name: string;
    type: string;
    size: number;
    base64?: string;
    previewUrl?: string;
    content?: string; // For streaming/virtual files
    conversationId?: string;
    conversationTitle?: string;
    propertyId?: string;
    source?: string;
    createdAt?: string;
}

export interface ChatSession {
    id: string;
    visitorId?: string;
    title: string;
    createdAt?: string | number;
    updatedAt?: string | number;
    lastMessage?: string;
    messages?: Message[];
    botId?: string;
    botName?: string;
}

export interface ChatbotInfo {
    id: string;
    name: string;
    description: string;
    category_name?: string;
    settings?: {
        bot_name: string;
        brand_color: string;
        bot_avatar: string;
        welcome_msg: string;
    };
    stats?: {
        docs_count: number;
        queries_count: number;
    };
    domain?: string;
}

// --- API TYPES ---
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    total?: number;
    has_more?: boolean;
    conversation_id?: string;
}
export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        __openWorkspaceFile: (fileName: string) => void;
        __navigateToPage: (pageNum: number) => void;
    }
}
