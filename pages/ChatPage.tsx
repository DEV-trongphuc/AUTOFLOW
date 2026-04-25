
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Loader } from 'lucide-react';
import { api } from '../services/storageAdapter';
import { toast } from 'react-hot-toast';
import PremiumLoader from '../components/common/PremiumLoader';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatbotInfo {
    id: string;
    name: string;
    description: string;
    settings: {
        bot_name: string;
        brand_color: string;
        bot_avatar: string;
        welcome_msg: string;
    };
}

const ChatPage: React.FC = () => {
    const { chatbotId } = useParams<{ chatbotId: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sessionId] = useState(() => 'session_' + Date.now());

    useEffect(() => {
        let isMounted = true;
        if (chatbotId) {
            loadChatbot(isMounted);
        }
        return () => { isMounted = false; };
    }, [chatbotId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadChatbot = async (isMounted: boolean) => {
        try {
            const res = await api.get<any>(`ai_chatbots?action=get&id=${chatbotId}`);
            if (isMounted && res.success && res.data) {
                const settingsRes = await api.get<any>(`ai_training?action=get_settings&property_id=${chatbotId}`);
                if (!isMounted) return;
                setChatbot({
                    id: res.data.id,
                    name: res.data.name,
                    description: res.data.description,
                    settings: settingsRes.success ? settingsRes.data : {
                        bot_name: res.data.name,
                        brand_color: '#ffa900',
                        bot_avatar: '',
                        welcome_msg: 'Chào bạn! Mình có thể giúp gì cho bạn?'
                    }
                });

                // Add welcome message
                if (settingsRes.success && settingsRes.data.welcome_msg) {
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: settingsRes.data.welcome_msg,
                        timestamp: new Date()
                    }]);
                }
            }
        } catch (e) {
            if (isMounted) toast.error('Không thể tải thông tin chatbot');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: 'user_' + Date.now(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post<any>('ai_chatbot', {
                action: 'chat',
                property_id: chatbotId,
                session_id: sessionId,
                message: userMessage.content,
                visitor_id: sessionId
            });

            if (res.success && (res as any).reply) {
                const assistantMessage: Message = {
                    id: 'assistant_' + Date.now(),
                    role: 'assistant',
                    content: (res as any).reply,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(res.message || 'Lỗi khi gửi tin nhắn');
            }
        } catch (e: any) {
            toast.error(e.message || 'Lỗi kết nối');
            const errorMessage: Message = {
                id: 'error_' + Date.now(),
                role: 'assistant',
                content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!chatbot) {
        return <PremiumLoader title="Chatbot" subtitle="Đang kết nối với trí tuệ nhân tạo..." />;
    }

    const brandColor = chatbot.settings.brand_color || '#ffa900';

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div
                className="px-6 py-4 shadow-lg border-b border-white/50 backdrop-blur-sm"
                style={{
                    background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}05 100%)`,
                    borderBottom: `2px solid ${brandColor}20`
                }}
            >
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)` }}
                    >
                        {chatbot.settings.bot_avatar ? (
                            <img src={chatbot.settings.bot_avatar} alt="Bot" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                            <Bot className="w-6 h-6" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{chatbot.settings.bot_name}</h1>
                        {chatbot.description && (
                            <p className="text-xs text-slate-500">{chatbot.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                    : 'text-white'
                                    }`}
                                style={msg.role === 'assistant' ? {
                                    background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)`
                                } : {}}
                            >
                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>
                            <div
                                className={`max-w-2xl px-5 py-4 rounded-3xl shadow-sm ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                    : 'bg-white text-slate-800 border border-slate-200'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md text-white"
                                style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)` }}
                            >
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-white px-5 py-4 rounded-3xl shadow-sm border border-slate-200">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="px-6 py-6 bg-white border-t border-slate-200 shadow-2xl">
                <div className="max-w-5xl mx-auto flex gap-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:border-transparent outline-none resize-none"
                        style={{ focusRing: `2px solid ${brandColor}20`, focusBorderColor: brandColor } as any}
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="px-6 py-4 rounded-2xl text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{
                            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)`,
                            opacity: (loading || !input.trim()) ? 0.5 : 1
                        }}
                    >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        Gửi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
