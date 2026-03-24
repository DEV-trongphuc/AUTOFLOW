import * as React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

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
  const [isVisible, setIsVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        setAnimateIn(true);
      }, 10);

      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = 'unset';
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

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
    <div className={`fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden ${size === 'full' ? 'w-full h-full' : 'p-4 sm:p-6'}`}>
      {/* Backdrop */}
      <div
        className={`
            absolute inset-0 bg-slate-900/60 transition-all duration-500 ease-in-out
            ${animateIn ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-0'}
        `}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          perspective: '1000px'
        }}
        className={`
        relative shadow-2xl w-full flex flex-col overflow-hidden
        transform transition-all duration-500 border shadow-[0_32px_120px_-10px_rgba(0,0,0,0.3)]
        ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}
        ${animateIn ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-[0.98] opacity-0 translate-y-8 rotate-x-4'}
        ${isDarkTheme ? 'bg-[#161B24] border-slate-800' : 'bg-white border-white/20'}
      `}>
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
      </div>
    </div>,
    document.body
  );
};

export default Modal;
