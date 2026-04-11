
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNavigate } from 'react-router-dom';
import { X, Keyboard, Command, ChevronRight } from 'lucide-react';
import Card from './Card';

interface KeyboardShortcutsContextType {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcutsUI = () => {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) throw new Error('useKeyboardShortcutsUI must be used within a KeyboardShortcutsProvider');
    return context;
};

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const navigate = useNavigate();

    const toggleHelp = useCallback(() => setIsHelpOpen(prev => !prev), []);

    useKeyboardShortcuts({
        '?': toggleHelp,
        'escape': () => setIsHelpOpen(false),
        // Global navigation
        'alt+c': () => navigate('/campaigns'),
        'alt+a': () => navigate('/audience'),
        'alt+f': () => navigate('/flows'),
        'alt+s': () => navigate('/settings'),
        'alt+t': () => navigate('/templates'),
        'ctrl+k': () => window.dispatchEvent(new CustomEvent('open-command-palette')),
    }, [navigate, toggleHelp]);

    const ShortcutItem = ({ keys, label }: { keys: string[], label: string }) => (
        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 group">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">{label}</span>
            <div className="flex gap-1">
                {keys.map((k, i) => (
                    <React.Fragment key={i}>
                        <kbd className="px-2 py-1 bg-slate-100 border-b-2 border-slate-300 rounded text-[10px] font-black text-slate-600 min-w-[24px] text-center">
                            {k.toUpperCase()}
                        </kbd>
                        {i < keys.length - 1 && <span className="text-slate-300 self-center text-[10px]">+</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    return (
        <KeyboardShortcutsContext.Provider value={{ isHelpOpen, toggleHelp }}>
            {children}

            {isHelpOpen && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg animate-in zoom-in-95 duration-300">
                        <Card className="relative overflow-hidden shadow-2xl border-0">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                        <Keyboard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Phím tắt hệ thống</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tăng tốc quy trình làm việc của bạn</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsHelpOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-orange-400" />
                                        Tổng quan
                                    </h3>
                                    <ShortcutItem keys={['?']} label="Mở bảng phím tắt" />
                                    <ShortcutItem keys={['Esc']} label="Đóng / Hủy" />
                                    <ShortcutItem keys={['N']} label="Tạo mới (trong danh sách)" />
                                    <ShortcutItem keys={['Ctrl', 'S']} label="Lưu thay đổi" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <ChevronRight className="w-3 h-3 text-blue-400" />
                                        Chuyển trang nhanh
                                    </h3>
                                    <ShortcutItem keys={['Alt', 'C']} label="Chiến dịch (Campaigns)" />
                                    <ShortcutItem keys={['Alt', 'A']} label="Liên hệ (Audience)" />
                                    <ShortcutItem keys={['Alt', 'F']} label="Kịch bản (Flows)" />
                                    <ShortcutItem keys={['Alt', 'S']} label="Cài đặt (Settings)" />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-slate-400">
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                    <Command className="w-3 h-3" />
                                    <span>Gợi ý: Nhấn Esc để thoát nhanh</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter opacity-50">MailFlow Pro v2.5</span>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </KeyboardShortcutsContext.Provider>
    );
};
