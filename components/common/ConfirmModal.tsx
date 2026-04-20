import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    requireConfirmText?: string;
    confirmPlaceholder?: string;
    confirmLabel?: string; // New prop for confirm button label (alias for confirmText)
    dangerText?: string;
    dangerAction?: () => void;
    isDarkTheme?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Xác nhận',
    confirmLabel,
    cancelText = 'Hủy',
    variant = 'warning',
    isLoading = false,
    requireConfirmText,
    confirmPlaceholder,
    dangerText,
    dangerAction,
    isDarkTheme
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');

    const isConfirmDisabled = isLoading || (requireConfirmText && confirmInput.trim().toLowerCase() !== requireConfirmText.trim().toLowerCase());

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            const timer = setTimeout(() => setAnimateIn(true), 10);
            return () => clearTimeout(timer);
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    const variantStyles = {
        danger: {
            icon: 'text-rose-600',
            iconBg: isDarkTheme ? 'bg-rose-900/30' : 'bg-rose-50',
            button: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
        },
        warning: {
            icon: 'text-amber-600',
            iconBg: 'bg-amber-50',
            button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
        },
        info: {
            icon: 'text-blue-600',
            iconBg: isDarkTheme ? 'bg-blue-900/30' : 'bg-blue-50',
            button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        },
        success: {
            icon: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            button: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
        }
    };

    const styles = variantStyles[variant];

    return createPortal(
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`rounded-3xl shadow-2xl border w-full max-w-md transform transition-all duration-300 relative ${isDarkTheme ? 'bg-[#0B0F17] border-slate-800' : 'bg-white border-slate-100'} ${animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-[0.95] opacity-0 translate-y-8'}`}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
                            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-lg font-bold ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <div className={`text-sm leading-relaxed font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>{message}</div>

                    {requireConfirmText && (
                        <div className="mt-6 space-y-2">
                            <label className="text-xs font-bold text-slate-500 tracking-wider">
                                <span className="uppercase">Xác nhận bằng cách nhập:</span> <span className="text-slate-800 select-all cursor-copy normal-case">"{requireConfirmText}"</span>
                            </label>
                            <input
                                type="text"
                                value={confirmInput}
                                onChange={(e) => setConfirmInput(e.target.value)}
                                placeholder={confirmPlaceholder || `Nhập "${requireConfirmText}" để xác nhận`}
                                className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition-all placeholder:font-medium ${isDarkTheme ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-brand' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 rounded-b-3xl flex items-center justify-end gap-3 ${isDarkTheme ? 'bg-[#1E2532]/20' : 'bg-slate-50/50'}`}>
                    {dangerText && dangerAction && (
                        <button
                            onClick={dangerAction}
                            disabled={isLoading}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-rose-400 bg-rose-900/20 hover:bg-rose-900/40 border border-transparent' : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-transparent'} mr-auto`}
                        >
                            {dangerText}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${styles.button}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang xử lý</span>
                            </>
                        ) : (
                            confirmLabel || confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmModal;
