import * as React from 'react';
import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { FileAttachment, Message, ChatSession, ChatbotInfo } from '../types';

interface ChatPageContextType {
    // State
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    input: string;
    setInput: (text: string) => void;
    loadingChat: boolean;
    setLoadingChat: (loading: boolean) => void;
    activeBot: ChatbotInfo | null;
    setActiveBot: (bot: ChatbotInfo | null) => void;
    sessionId: string;
    setSessionId: (id: string) => void;
    attachments: FileAttachment[];
    setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    workspaceDocs: FileAttachment[];
    setWorkspaceDocs: React.Dispatch<React.SetStateAction<FileAttachment[]>>;

    // Refs
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    messagesEndRef: React.RefObject<HTMLDivElement>;

    // Actions (Placeholders to be filled by the provider or hooks)
    handleSend: () => Promise<void>;
}

const ChatPageContext = createContext<ChatPageContextType | undefined>(undefined);

export const ChatPageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Move all major state here
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [activeBot, setActiveBot] = useState<ChatbotInfo | null>(null);
    const [sessionId, setSessionId] = useState('');
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [workspaceDocs, setWorkspaceDocs] = useState<FileAttachment[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSend = useCallback(async () => {
        // Implementation will be wired up later or kept in a hook that uses this context
    }, []);

    const value = {
        messages, setMessages,
        input, setInput,
        loadingChat, setLoadingChat,
        activeBot, setActiveBot,
        sessionId, setSessionId,
        attachments, setAttachments,
        workspaceDocs, setWorkspaceDocs,
        textareaRef,
        messagesEndRef,
        handleSend
    };

    return <ChatPageContext.Provider value={value}>{children}</ChatPageContext.Provider>;
};

export const useChatPage = () => {
    const context = useContext(ChatPageContext);
    if (!context) throw new Error('useChatPage must be used within a ChatPageProvider');
    return context;
};
