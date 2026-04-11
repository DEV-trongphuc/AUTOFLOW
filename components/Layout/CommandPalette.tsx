
import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, Star, Zap, Users, Layout as LayoutIcon, Settings, Mail, List, Layers, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const items = [
        { id: 'dashboard', title: 'Dashboard', icon: LayoutIcon, path: '/', category: 'General' },
        { id: 'audience', title: 'Kh\u00E1ch h\u00E0ng', icon: Users, path: '/audience', category: 'Audience' },
        { id: 'campaigns', title: 'Chi\u1EBFn d\u1ECBch', icon: Mail, path: '/campaigns', category: 'Marketing' },
        { id: 'flows', title: 'Automation Flows', icon: Zap, path: '/flows', category: 'Marketing' },
        { id: 'templates', title: 'M\u1EABu Email', icon: FileText, path: '/templates', category: 'Assets' },
        { id: 'settings', title: 'C\u00E0i \u0111\u1EB7t', icon: Settings, path: '/settings', category: 'System' },
    ];

    const filteredItems = query === ''
        ? items
        : items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.category.toLowerCase().includes(query.toLowerCase())
        );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleOpenEvent = () => setIsOpen(prev => !prev);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-command-palette', handleOpenEvent);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-command-palette', handleOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            // Lock scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const handleSelect = (item: typeof items[0]) => {
        navigate(item.path);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            
            <div 
                ref={containerRef}
                className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl shadow-slate-900/20 border border-slate-200/60 pointer-events-auto overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300 relative z-[9999]"
            >
                {/* Search Header */}
                <div className="relative flex items-center p-6 border-b border-slate-100">
                    <Search className="w-6 h-6 text-[#ffa900] mr-4" />
                    <input
                        autoFocus
                        placeholder={"T\u00ECm nhanh t\u1EA5t c\u1EA3 ch\u1EE9c n\u0103ng (\u2318 + K)..."}
                        className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-800 placeholder:text-slate-300"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-400">
                        <Command className="w-3 h-3" />
                        <span>K</span>
                    </div>
                </div>

                {/* Results Container */}
                <div className="max-h-[400px] overflow-y-auto p-3 custom-scrollbar">
                    {filteredItems.length > 0 ? (
                        <div className="space-y-1">
                            {filteredItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group ${
                                            selectedIndex === index ? 'bg-orange-50/50' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                            selectedIndex === index ? 'bg-white shadow-md text-orange-600 scale-110' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:shadow-sm'
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-bold transition-colors ${
                                                    selectedIndex === index ? 'text-orange-900' : 'text-slate-700'
                                                }`}>{item.title}</p>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{item.category}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Nh\u1EA5n \u0111\u1EC3 truy c\u1EADp nhanh</p>
                                        </div>
                                        <ArrowRight className={`w-4 h-4 transition-all ${
                                            selectedIndex === index ? 'text-orange-400 opacity-100 translate-x-0' : 'text-slate-300 opacity-0 -translate-x-2'
                                        }`} />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-800">No results for "{query}"</p>
                            <p className="text-xs text-slate-400 mt-1">Try searching for campaigns, contacts or settings.</p>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 rotate-180" /> <span>Select</span></div>
                        <div className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 rotate-90" /> <span>Navigate</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{"MailFlow Pro Search"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default CommandPalette;
