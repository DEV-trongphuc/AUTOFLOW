import * as React from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, Loader2 } from 'lucide-react';
import Modal from './Modal';

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
            icon: AlertCircle,
            iconClass: 'text-rose-600',
            iconBg: isDarkTheme ? 'bg-rose-900/30' : 'bg-rose-50',
            button: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700'
        },
        warning: {
            icon: AlertTriangle,
            iconClass: 'text-amber-600',
            iconBg: 'bg-amber-50',
            button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
        },
        info: {
            icon: Info,
            iconClass: 'text-blue-600',
            iconBg: isDarkTheme ? 'bg-blue-900/30' : 'bg-blue-50',
            button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        },
        success: {
            icon: CheckCircle2,
            iconClass: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            button: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
        }
    };

    const styles = variantStyles[variant];
    const Icon = styles.icon;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${styles.iconBg} flex items-center justify-center shadow-inner relative overflow-hidden group`}>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icon className={`w-6 h-6 ${styles.iconClass} relative z-10`} />
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-xl font-black tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
                        <div className={`h-1 w-12 rounded-full mt-1 bg-gradient-to-r ${variant === 'danger' ? 'from-rose-500 to-red-500' : variant === 'warning' ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500'}`} />
                    </div>
                </div>
            }
            size="sm"
            isLoading={isLoading}
            isDarkTheme={isDarkTheme}
            footer={
                <div className="flex items-center justify-end gap-3 w-full p-2">
                    {dangerText && dangerAction && (
                        <button
                            onClick={dangerAction}
                            disabled={isLoading}
                            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20' : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100'} mr-auto active:scale-95`}
                        >
                            {dangerText}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkTheme ? 'text-slate-400 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/80 hover:text-slate-200' : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700'} active:scale-95`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`px-7 py-3 text-xs font-black uppercase tracking-widest text-white rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${styles.button}`}
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
            }
        >
            <div className="relative py-2">
                <div className={`text-[15px] leading-relaxed font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                    {typeof message === 'string' ? message.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            {i < message.split('\n').length - 1 && <br />}
                        </React.Fragment>
                    )) : message}
                </div>

                {requireConfirmText && (
                    <div className="mt-8 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 space-y-3">
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
                                className={`w-full px-4 py-3.5 border rounded-xl text-sm font-bold focus:outline-none transition-all placeholder:font-medium placeholder:text-slate-400 ${isDarkTheme ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10' : 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}
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
