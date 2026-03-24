
import React from 'react';
import { X, Smartphone, Monitor, SmartphoneNfc, Code, Check } from 'lucide-react';
import { Template } from '../../../types';

interface EmailPreviewDrawerProps {
  template: Template | null;
  htmlContent?: string;
  isOpen: boolean;
  onClose: () => void;
  // Optional action button for "Templates" page usage
  onAction?: () => void;
  actionLabel?: string;
}

const EmailPreviewDrawer: React.FC<EmailPreviewDrawerProps> = ({ template, htmlContent, isOpen, onClose: _onClose, onAction, actionLabel }) => {
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  const [isVisible, setIsVisible] = React.useState(false);
  const [animateIn, setAnimateIn] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const onClose = () => {
    setAnimateIn(false);
    setTimeout(_onClose, 500);
  };

  if (!isVisible) return null;

  let contentToRender = htmlContent;
  if (!contentToRender && template) {
    contentToRender = template.htmlContent;
  }

  const showMock = !contentToRender;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end">
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`relative w-full max-w-5xl bg-slate-50 shadow-2xl flex flex-col h-full border-l border-white/10 transform transition-all duration-500 ease-in-out ${animateIn ? 'translate-x-0 opacity-100' : 'translate-x-[100px] opacity-0'}`}>
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{template?.name || 'HTML Preview'}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              {htmlContent ? <><Code className="w-3 h-3" /> Visual Preview</> : 'Template Preview'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white shadow text-[#ca7900]' : 'text-slate-400'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white shadow text-[#ca7900]' : 'text-slate-400'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {onAction && actionLabel && (
              <button
                onClick={onAction}
                className="px-4 py-2 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> {actionLabel}
              </button>
            )}

            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:rotate-90"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100/50">
          <div className={`bg-white shadow-2xl transition-all duration-500 rounded-lg overflow-hidden border border-slate-200 flex flex-col ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full h-full'}`}>
            <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b border-slate-200 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="bg-white px-3 py-1 rounded text-[10px] text-slate-400 flex-1 text-center font-mono truncate">
                about:blank
              </div>
            </div>

            <div className="flex-1 bg-white relative overflow-hidden">
              {showMock ? (
                <div className="absolute inset-0 p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-[#fff4e0] rounded-2xl mx-auto flex items-center justify-center text-[#ca7900] mb-4">
                    <SmartphoneNfc className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800 mb-2">Chưa có nội dung</h1>
                  <p className="text-slate-500 text-sm max-w-md">Template này chưa được biên dịch HTML hoặc chưa có nội dung. Vui lòng kiểm tra lại trình editor.</p>
                </div>
              ) : (
                <iframe
                  title="email-preview"
                  srcDoc={contentToRender || ''}
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewDrawer;
