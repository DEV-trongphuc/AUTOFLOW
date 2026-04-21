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
  isDarkTheme = false
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
    sm: 'max-w-md rounded-[32px] max-h-[90vh]',
    md: 'max-w-lg rounded-[32px] max-h-[90vh]',
    lg: 'max-w-2xl rounded-[32px] max-h-[90vh]',
    xl: 'max-w-4xl rounded-[32px] max-h-[95vh]',
    '2xl': 'max-w-6xl rounded-[32px] max-h-[95vh]',
    '3xl': 'max-w-7xl rounded-[32px] max-h-[95vh]',
    '4xl': 'max-w-[90%] rounded-[32px] max-h-[95vh]',
    full: 'w-full h-full rounded-none max-w-full',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden ${size === 'full' ? 'w-full h-full' : 'p-4 sm:p-6'}`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[#0f172a]/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350, mass: 0.8 }}
            className={`
            relative shadow-2xl w-full flex flex-col overflow-hidden
            border shadow-[0_32px_120px_-10px_rgba(0,0,0,0.3)]
            ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}
            ${isDarkTheme ? 'bg-[#161B24] border-slate-800' : 'bg-white border-white/20'}
          `}
          >
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-[#ffa900] animate-spin" />
              <p className="text-xs font-bold text-slate-500 animate-pulse">Đang xử lý...</p>
            </div>
          </div>
        )}
        {/* Header */}
        {!noHeader && (
          <div className={`px-6 py-5 flex justify-between items-center border-b shrink-0 ${isDarkTheme ? 'bg-[#161B24] border-slate-800' : 'bg-white border-slate-100'}`}>
            <div>
              <h3 className={`text-base md:text-lg font-bold tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all duration-200 ${isDarkTheme ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`${noPadding ? '' : 'px-6 py-6'} overflow-y-auto custom-scrollbar flex-1 ${isDarkTheme ? 'bg-[#161B24]' : 'bg-white'}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t shrink-0 flex items-center justify-end ${isDarkTheme ? 'bg-[#1C232E] border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
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
