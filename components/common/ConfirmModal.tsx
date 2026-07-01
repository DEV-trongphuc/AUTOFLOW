import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<any>;
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
    const [localLoading, setLocalLoading] = useState(false);

    const activeLoading = isLoading || localLoading;
    const isConfirmDisabled = activeLoading || (requireConfirmText && confirmInput.trim().toLowerCase() !== requireConfirmText.trim().toLowerCase());

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setLocalLoading(false);
            setConfirmInput('');
            const timer = setTimeout(() => setAnimateIn(true), 10);
            return () => clearTimeout(timer);
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    const handleConfirm = async () => {
        setLocalLoading(true);
        try {
            await onConfirm();
        } finally {
            setLocalLoading(false);
        }
    };

    const variantStyles = {
        danger: {
            icon: AlertCircle,
            iconClass: 'text-rose-600',
            iconBg: isDarkTheme ? 'bg-rose-900/30' : 'bg-rose-50',
            inlineIconBg: undefined,
            inlineIconColor: undefined,
            button: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/20'
        },
        warning: {
            icon: AlertTriangle,
            iconClass: '',
            iconBg: '',
            inlineIconBg: '#fef3c7',
            inlineIconColor: '#d97706',
            button: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-violet-500/20'
        },
        info: {
            icon: Info,
            iconClass: 'text-blue-600',
            iconBg: isDarkTheme ? 'bg-blue-900/30' : 'bg-blue-50',
            inlineIconBg: undefined,
            inlineIconColor: undefined,
            button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
        },
        success: {
            icon: CheckCircle2,
            iconClass: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            inlineIconBg: undefined,
            inlineIconColor: undefined,
            button: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
        }
    };

    const styles = variantStyles[variant];
    const Icon = styles.icon;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            isLoading={activeLoading}
            isDarkTheme={isDarkTheme}
            footer={
                <div className="flex items-center justify-center gap-3 w-full p-2">
                    {dangerText && dangerAction && (
                        <button
                            onClick={dangerAction}
                            disabled={activeLoading}
                            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20' : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100'} mr-auto active:scale-95`}
                        >
                            {dangerText}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        disabled={activeLoading}
                        className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-full border transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-slate-400 bg-slate-800 border-slate-750 hover:bg-slate-700 hover:text-slate-200' : 'text-violet-600 bg-white border-violet-600 hover:bg-violet-50/50'} active:scale-95`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest text-white rounded-full transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${
                            variant === 'danger'
                                ? 'bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20'
                                : 'bg-gradient-to-b from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-violet-500/20'
                        }`}
                    >
                        {activeLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang xử lý</span>
                            </>
                        ) : (
                            confirmLabel || confirmText
                        )}
                    </button>
                </div>
            }
        >
            <div className="flex flex-col items-center text-center py-4">
                {/* Large Center Icon */}
                <div 
                    className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center shadow-lg shadow-slate-100 dark:shadow-none mb-4`}
                    style={styles.inlineIconBg ? { backgroundColor: styles.inlineIconBg, color: styles.inlineIconColor } : undefined}
                >
                    <Icon className={`w-8 h-8 ${styles.iconClass}`} style={styles.inlineIconColor ? { color: styles.inlineIconColor } : undefined} />
                </div>

                {/* Subtitle / Big Title */}
                <h4 className={`text-base md:text-lg font-black tracking-tight mb-2 uppercase ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>
                    {variant === 'danger' ? 'Yêu cầu nguy hiểm!' : 'Yêu cầu cần xử lý!'}
                </h4>

                {/* Message */}
                <div className={`text-[13px] leading-relaxed font-semibold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} max-w-[280px] sm:max-w-xs mx-auto mb-2`}>
                    {typeof message === 'string' ? message.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i < message.split('\n').length - 1 && <br />}
                        </React.Fragment>
                    )) : message}
                </div>

                {requireConfirmText && (
                    <div className="mt-6 w-full text-left p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                            Xác nhận định danh
                        </label>
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-slate-500">Nhập <span className="text-slate-900 dark:text-slate-200 font-bold select-all px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-800 rounded">"{requireConfirmText}"</span> để tiếp tục</p>
                            <input
                                type="text"
                                value={confirmInput}
                                onChange={(e) => setConfirmInput(e.target.value)}
                                placeholder={confirmPlaceholder || `Nhập mã xác nhận...`}
                                className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition-all placeholder:font-medium placeholder:text-slate-400 ${isDarkTheme ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10' : 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}
                                autoFocus
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ConfirmModal;
