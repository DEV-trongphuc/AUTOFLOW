import React from 'react';
import { Bot, ChevronDown, CornerDownRight, Plus, Trash2 } from 'lucide-react';
import { ChatbotInfo, ChatSession } from '../types';

interface SidebarItemProps {
    bot: ChatbotInfo;
    isActive: boolean;
    isExpanded: boolean;
    sessions: Record<string, ChatSession[]>;
    sessionId: string | undefined;
    categoryId: string | undefined;
    onToggleExpand: (bot: ChatbotInfo) => void;
    onNewChat: (e: React.MouseEvent, bot: ChatbotInfo) => void;
    onDeleteSession: (e: React.MouseEvent, botId: string, sessId: string) => void;
    onNavigate: (botId: string, sessId: string) => void;
}

const SidebarItem = React.memo(({
    bot,
    isActive,
    isExpanded,
    sessions,
    sessionId,
    onToggleExpand,
    onNewChat,
    onDeleteSession,
    onNavigate
}: SidebarItemProps) => {
    const botSessions = sessions[bot.id] || [];

    return (
        <div className="mx-2 mb-1">
            <div className="relative">
                <button
                    onClick={() => onToggleExpand(bot)}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group cursor-pointer
                        ${isActive || isExpanded
                            ? 'bg-slate-50/80 shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-700'
                        }
                    `}
                >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-brand text-white shadow-brand' : 'bg-slate-100 text-slate-400'}`}>
                        {bot.settings?.bot_avatar ? (
                            <img src={bot.settings.bot_avatar} className="w-full h-full object-cover rounded-lg scale-90" alt={bot.name} />
                        ) : (
                            <Bot className="w-3.5 h-3.5" />
                        )}
                    </div>
                    <span className={`text-[13px] font-bold truncate flex-1 text-left ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                        {bot.name}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] mt-1' : 'max-h-0'}`}>
                <div className="pl-6 space-y-1 py-1">
                    <button
                        onClick={(e) => onNewChat(e, bot)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand hover:bg-opacity-5 transition-colors group/new"
                    >
                        <CornerDownRight className="w-3 h-3 opacity-50" />
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">New Chat</span>
                    </button>

                    {botSessions.map((sess: ChatSession) => (
                        <div key={sess.id} className="relative group/sess">
                            <div
                                onClick={() => onNavigate(bot.id, sess.id)}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer group/sess-item
                                    ${sessionId === sess.id && isActive
                                        ? 'bg-brand bg-opacity-5 text-brand font-bold'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }
                                `}
                            >
                                <CornerDownRight className={`w-3 h-3 shrink-0 ${sessionId === sess.id && isActive ? 'text-brand' : 'text-slate-300'}`} />
                                <span className="text-[12px] truncate max-w-[120px]" title={sess.title}>{sess.title}</span>
                                <div className="ml-auto opacity-0 group-hover/sess:opacity-100 flex items-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteSession(e, bot.id, sess.id);
                                        }}
                                        className="p-1 hover:text-red-500 rounded bg-transparent border-0 cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default SidebarItem;
