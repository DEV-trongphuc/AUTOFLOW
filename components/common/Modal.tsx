import * as React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  footer?: React.ReactNode;
  isLoading?: boolean;
  noPadding?: boolean;
  noHeader?: boolean;
  hideCloseButton?: boolean;
  isDarkTheme?: boolean;
  noScroll?: boolean;
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  isLoading = false,
  noPadding = false,
  noHeader = false,
  hideCloseButton = false,
  isDarkTheme = false,
  noScroll = false,
  zIndex
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Handle case where some root usages might wrap <Modal> conditionally
  // Wait, if it's conditional, Modal unmounts immediately anyway, AnimatePresence inside won't help limit exit animations, but enter animations will work.
  // Best practice is `<Modal isOpen={state} />`

  const sizeClasses = {
    sm: 'max-w-md rounded-[24px] max-h-[90vh]',
    md: 'max-w-lg rounded-[24px] max-h-[90vh]',
    lg: 'max-w-2xl rounded-[24px] max-h-[90vh]',
    xl: 'max-w-4xl rounded-[24px] max-h-[95vh]',
    '2xl': 'max-w-6xl rounded-[24px] max-h-[95vh]',
    '3xl': 'max-w-7xl rounded-[24px] max-h-[95vh]',
    '4xl': 'max-w-[1300px] rounded-[28px] max-h-[95vh]',
    full: 'w-full h-full rounded-none max-w-full',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className={`fixed inset-0 flex items-center justify-center overflow-y-auto overflow-x-hidden ${size === 'full' ? 'w-full h-full' : 'p-4 py-8 sm:p-6 sm:py-12'}`}
          style={{ zIndex: zIndex ?? 150 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.85 }}
            className={`
            relative w-full flex flex-col overflow-hidden border
            ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}
            ${isDarkTheme 
              ? 'bg-[#11151d] border-violet-500/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_40px_rgba(139,92,246,0.06)]' 
              : 'bg-white border-slate-200/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.06),0_0_40px_rgba(139,92,246,0.02)]'}
          `}
          >
        {isLoading && (
          <div className={`absolute inset-0 z-50 flex items-center justify-center ${isDarkTheme ? 'bg-[#11151d]/75' : 'bg-white/75'}`}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className={`text-xs font-bold animate-pulse ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Đang xử lý...</p>
            </div>
          </div>
        )}
        {/* Header */}
        {!noHeader && (
          <div className={`px-6 py-5 flex justify-between items-center border-b shrink-0 ${isDarkTheme ? 'bg-[#11151d] border-slate-800/60' : 'bg-white border-slate-100'}`}>
            <div>
              <h3 className={`text-base md:text-lg font-bold tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all duration-200 ${isDarkTheme ? 'text-slate-400 hover:text-violet-400 hover:bg-violet-500/10' : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'} hover:scale-105 active:scale-95 bg-transparent`}
              >
                <X className="w-5 h-5 stroke-[2px]" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`${noPadding ? '' : 'px-6 py-6'} ${noScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} flex-1 min-h-0 ${isDarkTheme ? 'bg-[#11151d]' : 'bg-white'} flex flex-col`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t shrink-0 flex items-center justify-end ${isDarkTheme ? 'bg-[#161b24] border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
            {footer}
          </div>
        )}
      </motion.div>
    </div>
    )}
  </AnimatePresence>,
    document.body
  );
};

export default Modal;
