import React from 'react';
import { useLocation } from 'react-router-dom';
import { Zap, LayoutGrid, Globe, Search, Bot, X } from 'lucide-react';
import { ChatbotInfo, ChatSession } from '../types';
import SidebarItem from './SidebarItem';

interface SidebarProps {
    isSidebarOpen: boolean;
    isZenMode: boolean;
    categoryName: string;
    categoryId: string | undefined;
    viewMode: string;
    setViewMode: (mode: 'home' | 'chat' | 'global_workspace') => void;
    navigate: any;
    searchTermSessions: string;
    setSearchTermSessions: (term: string) => void;
    recentSessions: any[];
    sessionId: string | undefined;
    chatbots: ChatbotInfo[];
    loadingList: boolean;
    expandedBotId: string | null;
    setExpandedBotId: (id: string | null) => void;
    activeBot: ChatbotInfo | null;
    sessions: Record<string, ChatSession[]>;
    handleNewChat: (e: React.MouseEvent, bot: ChatbotInfo) => void;
    handleDeleteSession: (e: React.MouseEvent, botId: string, sessId: string) => void;
    handleEditSessionTitle: (sessId: string, newTitle: string) => void;
    isManualNavigationRef: React.MutableRefObject<boolean>;
    onOpenTraining: () => void;
    onCloseTraining: () => void;
    orgUser: any;
    isDarkTheme?: boolean;
    isMobile?: boolean;
    setIsSidebarOpen?: (open: boolean) => void;
    onLogout?: () => void;
    onOpenProfile?: () => void;
    brandColor?: string;
}

const Sidebar = React.memo(({
    isSidebarOpen,
    isZenMode,
    categoryName,
    categoryId,
    viewMode,
    setViewMode,
    navigate,
    searchTermSessions,
    setSearchTermSessions,
    recentSessions,
    sessionId,
    chatbots,
    loadingList,
    expandedBotId,
    setExpandedBotId,
    activeBot,
    sessions,
    handleNewChat,
    handleDeleteSession,
    handleEditSessionTitle,
    isManualNavigationRef,
    onOpenTraining,
    onCloseTraining,
    orgUser,
    isDarkTheme,
    isMobile,
    setIsSidebarOpen,
    onLogout,
    onOpenProfile,
    brandColor
}: SidebarProps) => {
    const location = useLocation();
    // Close training modal when navigating away from /organization
    React.useEffect(() => {
        if (!location.pathname.includes('/organization') && !window.location.hash.includes('/organization')) {
            onCloseTraining();
        }
    }, [location, onCloseTraining]);

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-50 w-[275px] border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
            ${isDarkTheme ? 'bg-[#0B0F17] border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]'}
            ${(isSidebarOpen && !isZenMode) ? 'translate-x-0' : '-translate-x-full md:ml-[-275px]'}
        `}>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className={`h-28 flex items-center px-6 gap-4 border-b relative group cursor-pointer ${isDarkTheme ? 'border-slate-800/50' : 'border-slate-50'}`}>
                    <div className="relative w-12 h-12 shrink-0">
                        <div className="absolute inset-0 bg-brand blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-brand rounded-2xl shadow-brand group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border-brand border-opacity-20">
                            <Zap className="w-6 h-6 text-white fill-white/20" strokeWidth={3} />
                        </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                        <h1 className={`text-2xl font-black tracking-tighter leading-none group-hover:text-brand transition-all duration-500 uppercase ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                            AI-SPACE
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5 opacity-60">
                            <span className="h-3 w-[2px] bg-brand bg-opacity-30 rotate-12"></span>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] truncate ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                                Power by {categoryName}
                            </span>
                        </div>
                    </div>

                    {isMobile && setIsSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className={`absolute -right-12 top-4 p-2.5 rounded-xl border shadow-xl transition-all active:scale-95 ${isDarkTheme ? 'bg-[#0B0F17] border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    <button onClick={() => navigate(`/ai-space/${categoryId}`)} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                        <LayoutGrid className="w-5 h-5 text-slate-400" />
                    </button>
                </div>


                <div className="flex-1 overflow-y-auto px-2 py-6 space-y-6 custom-scrollbar">
                    {/* PRIMARY NAV */}
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                setViewMode('home');
                                navigate(`/ai-space/${categoryId}`);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${viewMode === 'home' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${viewMode === 'home' ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-md'}`}>
                                <LayoutGrid className="w-4 h-4" />
                            </div>
                            <span className={`font-bold text-sm tracking-tight ${viewMode === 'home' ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>AI Centers</span>
                            {viewMode === 'home' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>

                        <button
                            onClick={() => {
                                setViewMode('global_workspace');
                                navigate(`/ai-space/${categoryId}?view=global_workspace`);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${viewMode === 'global_workspace' ? 'bg-brand text-white shadow-brand' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${viewMode === 'global_workspace' ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-md'}`}>
                                <Globe className="w-4 h-4" />
                            </div>
                            <span className={`font-bold text-sm tracking-tight ${viewMode === 'global_workspace' ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>Global Workspace</span>
                            {viewMode === 'global_workspace' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </button>

                        {(orgUser?.role === 'admin' || orgUser?.role === 'assistant') && (
                            <button
                                onClick={() => {
                                    onOpenTraining();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${window.location.hash.includes('/organization') ? 'bg-brand text-white shadow-brand' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${window.location.hash.includes('/organization') ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-md'}`}>
                                    <Bot className="w-4 h-4" />
                                </div>
                                <span className={`font-bold text-sm tracking-tight ${window.location.hash.includes('/organization') ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>AI Training</span>
                                {window.location.hash.includes('/organization') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </button>
                        )}
                    </div>

                    {/* SEARCH SESSIONS */}
                    <div className="px-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTermSessions}
                                onChange={(e) => setSearchTermSessions(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-9 pr-3 text-[13px] font-medium text-slate-600 focus:bg-white focus:border-brand-accent focus:ring-4 focus:ring-brand focus:ring-opacity-10 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* RECENT SESSIONS */}
                    {recentSessions.length > 0 && (
                        <div className="animate-in fade-in duration-500">
                            <div className="px-4 pb-2 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{searchTermSessions ? 'Results' : 'Recent'}</span>
                            </div>
                            <div className="space-y-1">
                                {recentSessions.slice(0, searchTermSessions ? undefined : 3).map(sess => (
                                    <button
                                        key={sess.id}
                                        onClick={() => {
                                            const bot = chatbots.find(b => b.id === sess.botId);
                                            if (bot) {
                                                isManualNavigationRef.current = true;
                                                navigate(`/ai-space/${categoryId}/${bot.id}/${sess.id}`);
                                            }
                                        }}
                                        className={`
                                            w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group mx-2
                                            ${sessionId === sess.id && viewMode === 'chat'
                                                ? 'bg-brand bg-opacity-5 text-brand border border-brand border-opacity-10 shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                                            }
                                        `}
                                        style={{ width: 'calc(100% - 16px)' }}
                                    >
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                            <span className={`text-[12px] font-bold truncate w-full text-left ${sessionId === sess.id ? 'text-brand' : 'text-slate-700'}`}>{sess.title}</span>
                                            <span className="text-[10px] text-slate-400 truncate w-full text-left flex items-center gap-1">
                                                <Bot className="w-2.5 h-2.5" /> {sess.botName}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AVAILABLE INTELLIGENCE */}
                    <div className="pt-2 border-t border-slate-50 mx-4"></div>
                    <div>
                        <div className="px-4 pb-3 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Agents</span>
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">{chatbots.length}</span>
                        </div>

                        <div className="space-y-2">
                            {loadingList ? (
                                [1, 2, 3].map(i => <div key={i} className="mx-2 h-10 bg-slate-50 rounded-xl animate-pulse mb-2" />)
                            ) : chatbots.map(bot => (
                                <SidebarItem
                                    key={bot.id}
                                    bot={bot}
                                    isActive={activeBot?.id === bot.id && viewMode === 'chat'}
                                    isExpanded={expandedBotId === bot.id}
                                    sessions={sessions}
                                    sessionId={sessionId}
                                    categoryId={categoryId}
                                    onToggleExpand={(b: ChatbotInfo) => {
                                        if (expandedBotId !== b.id) {
                                            setExpandedBotId(b.id);
                                            // Handle potential active bot change if needed elsewhere
                                        } else {
                                            setExpandedBotId(null);
                                        }
                                    }}
                                    onNewChat={handleNewChat}
                                    onDeleteSession={handleDeleteSession}
                                    onNavigate={(botId: string, sessId: string) => {
                                        isManualNavigationRef.current = true;
                                        navigate(`/ai-space/${categoryId}/${botId}/${sessId}`);
                                    }}
                                />
                            ))}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-50 bg-white">
                    <div className="flex items-center gap-4 px-2 py-2 group cursor-pointer" onClick={() => navigate(`/ai-space/${categoryId}`)}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand to-brand-primary-dark flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-brand group-hover:scale-110 transition-transform">
                            {categoryName.charAt(0)}
                        </div>
                        <div className="leading-tight">
                            <div className="font-bold text-[14px] truncate w-32 text-slate-800 tracking-tight group-hover:text-brand transition-colors">{categoryName}</div>
                            <div className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-0.5">Professional</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
});

export default Sidebar;
