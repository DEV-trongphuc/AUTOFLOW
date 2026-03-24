import React from 'react';
import { Search, ShoppingBag, BookOpen, ChevronDown } from 'lucide-react';
import { ChatbotInfo, ChatSession } from '../types';
import ChatbotCard from './ChatbotCard';

interface HomeViewProps {
    chatbots: ChatbotInfo[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    loadingList: boolean;
    filteredChatbots: ChatbotInfo[];
    sessions: Record<string, ChatSession[]>;
    categoryId: string | undefined;
    handleNewChat: (e: React.MouseEvent, bot: ChatbotInfo) => void;
    navigate: any;
    isManualNavigationRef: React.MutableRefObject<boolean>;
}

const HomeView = React.memo(({
    chatbots,
    searchTerm,
    setSearchTerm,
    loadingList,
    filteredChatbots,
    sessions,
    categoryId,
    handleNewChat,
    navigate,
    isManualNavigationRef
}: HomeViewProps) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-start px-6 lg:px-12 pt-16 lg:pt-24 pb-12 relative z-10 overflow-y-auto custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-surface via-white to-white">
            <div className="w-full flex flex-col items-center animate-in fade-in duration-500">

                {/* AI Training Style Header */}
                <div className="w-full flex justify-between items-start mb-10 px-4 relative">
                    <div className="animate-in fade-in slide-in-from-left-5 duration-700">
                        <h1 className="text-[32px] font-black text-slate-900 leading-tight flex items-center gap-2">
                            AI Agents<span className="text-brand text-4xl leading-none">.</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="w-8 h-[2px] bg-slate-200"></div>
                            <p className="text-slate-500 text-sm font-medium">
                                Quản lý và tương tác với các chuyên gia AI được đào tạo riêng cho bạn.
                            </p>
                        </div>
                    </div>

                    <div className="absolute -top-12 -right-6 z-10 animate-bounce-slow hidden md:block">
                        <img
                            src="https://pngfile.net/files/preview/960x960/11741189725reo9wbrtum5xxfbhubjnxavgk71sl6ptkgksc801wvj0l5pjgdch8arnleln7oqh0kzvi0wrniegc642iks8woshwo14pifdaq67.png"
                            alt="AI Mascot"
                            className="w-40 h-auto drop-shadow-2xl"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    </div>
                </div>

                {/* Main Content Container (White Card style) */}
                <div className="w-full bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 min-h-[600px] animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
                    {/* Search & Controls Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-6">
                            <h3 className="text-lg font-bold text-slate-800">Danh sách AI Agents</h3>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                Tổng cộng: {chatbots.length}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:max-w-md">
                            <div className="relative group flex-1">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm kiếm AI..."
                                    className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl pl-11 pr-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-brand outline-none transition-all shadow-sm"
                                />
                            </div>
                            <button className="shrink-0 h-11 px-5 bg-gradient-to-r from-brand text-white border border-brand border-opacity-20 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-brand hover:brightness-110 transition-all flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Store</span>
                            </button>
                            <button className="shrink-0 h-11 px-5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand hover:bg-opacity-5 transition-all flex items-center gap-2 shadow-sm">
                                <BookOpen className="w-4 h-4 text-brand" />
                                <span className="hidden sm:inline">Mẹo & Hướng dẫn</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Grid of Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {loadingList ? [1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-slate-50 rounded-[32px] animate-pulse border border-slate-100" />
                        )) : filteredChatbots.map(bot => (
                            <ChatbotCard
                                key={bot.id}
                                bot={bot}
                                onClick={(e) => {
                                    const botSessions = sessions[bot.id] || [];
                                    if (botSessions.length > 0) {
                                        const latest = botSessions[0];
                                        isManualNavigationRef.current = true;
                                        navigate(`/ai-space/${categoryId}/${bot.id}/${latest.id}`);
                                    } else {
                                        handleNewChat(e, bot);
                                    }
                                }}
                                onStartChat={(e) => {
                                    e.stopPropagation();
                                    const botSessions = sessions[bot.id] || [];
                                    if (botSessions.length > 0) {
                                        const latest = botSessions[0];
                                        isManualNavigationRef.current = true;
                                        navigate(`/ai-space/${categoryId}/${bot.id}/${latest.id}`);
                                    } else {
                                        handleNewChat(e, bot);
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default HomeView;
