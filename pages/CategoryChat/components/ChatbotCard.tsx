import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { ChatbotInfo } from '../types';

interface ChatbotCardProps {
    bot: ChatbotInfo;
    onClick: (e: React.MouseEvent) => void;
    onStartChat: (e: React.MouseEvent, bot: any) => void;
}

const ChatbotCard = React.memo(({
    bot,
    onClick,
    onStartChat
}: ChatbotCardProps) => {
    return (
        <div
            onClick={onClick}
            className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-brand hover:border-brand-accent transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col justify-between gap-6"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-brand group-hover:scale-125 transition-transform">
                <Bot className="w-32 h-32" />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-primary-dark flex items-center justify-center text-white shadow-brand group-hover:rotate-6 transition-transform shrink-0">
                        {bot.settings?.bot_avatar ? (
                            <img src={bot.settings.bot_avatar} className="w-full h-full object-cover rounded-2xl" alt={bot.name} />
                        ) : (
                            <Bot className="w-6 h-6" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-base font-bold text-slate-800 leading-tight truncate pr-2">{bot.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-1 pr-2 truncate uppercase tracking-widest">{bot.domain || 'AI ASSISTANT'}</p>
                    </div>
                </div>
                <div className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                    Active
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-brand group-hover:bg-opacity-5 group-hover:border-brand-accent transition-colors">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tỉ lệ</span>

                        <span className="text-sm font-black text-slate-700">{(bot.stats?.docs_count || 0).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">docs</span></span>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuộc trò chuyện</span>
                        <span className="text-sm font-black text-slate-700">{(bot.stats?.queries_count || 0).toLocaleString()} <span className="text-[10px] font-medium text-slate-400">convos</span></span>
                    </div>
                </div>

                <button
                    onClick={(e) => onStartChat(e, bot)}
                    className="w-full h-11 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all duration-500 flex items-center justify-center gap-2 group/btn"
                >
                    <MessageSquare className="w-4 h-4 text-slate-400 group-hover/btn:scale-110 transition-transform" />
                    START CHATTING
                </button>
            </div>
        </div>
    );
});

export default ChatbotCard;
