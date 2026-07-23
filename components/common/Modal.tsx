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
  className?: string;
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
  zIndex,
  className
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
    sm: 'max-w-md rounded-[var(--radius-lg)] max-h-[90vh]',
    md: 'max-w-lg rounded-[var(--radius-lg)] max-h-[90vh]',
    lg: 'max-w-2xl rounded-[var(--radius-lg)] max-h-[90vh]',
    xl: 'max-w-4xl rounded-[var(--radius-xl)] max-h-[95vh]',
    '2xl': 'max-w-6xl rounded-[var(--radius-xl)] max-h-[95vh]',
    '3xl': 'max-w-7xl rounded-[var(--radius-xl)] max-h-[95vh]',
    '4xl': 'max-w-[1300px] rounded-[var(--radius-2xl)] max-h-[95vh]',
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
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[4px]"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
            className={`
              relative w-full flex flex-col overflow-hidden border border-[var(--color-border-light)]
              bg-[var(--color-surface)] shadow-[var(--shadow-lg)]
              dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5),0_10px_10px_-5px_rgba(0,0,0,0.4),0_0_40px_rgba(99,102,241,0.05)]
              ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}
              ${className || ''}
            `}
          >
            {isLoading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-surface)]/75">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                  <p className="text-xs font-bold animate-pulse text-[var(--color-text-light)]">Đang xử lý...</p>
                </div>
              </div>
            )}
            {/* Header */}
            {!noHeader && (
              <div className="px-[35px] py-[20px] flex justify-between items-center border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-[var(--color-text)]">{title}</h3>
                </div>
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center transition-all duration-200 text-[var(--color-text-light)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] dark:hover:bg-[rgba(99,102,241,0.15)] dark:hover:text-[var(--color-primary)] bg-transparent active:scale-95"
                  >
                    <X className="w-5 h-5 stroke-[2px]" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className={`${noPadding ? '' : 'px-[35px] py-[35px]'} ${noScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} flex-1 min-h-0 bg-[var(--color-surface)] flex flex-col`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-[35px] py-4 border-t border-[var(--color-border)] shrink-0 flex items-center justify-end bg-[var(--color-bg)]/30">
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
