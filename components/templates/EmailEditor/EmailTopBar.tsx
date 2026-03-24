import * as React from 'react';
import { useState } from 'react';
import { ChevronLeft, Undo2, Redo2, Layout, Code, Monitor, Smartphone, Eye, Save, Loader2, Send, FolderOpen, ShieldCheck } from 'lucide-react';
import Button from '../../common/Button';
import Select from '../../common/Select';
import { TemplateGroup } from '../../../types';

interface EmailTopBarProps {
  name: string;
  setName: (name: string) => void;
  groupId: string;
  setGroupId: (id: string) => void;
  groups: TemplateGroup[];
  editorMode: 'visual' | 'code';
  setEditorMode: (mode: 'visual' | 'code') => void;
  viewMode: 'desktop' | 'mobile';
  setViewMode: (mode: 'desktop' | 'mobile') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onCancel: () => void;
  onPreview: () => void;
  onSendTest: (email: string) => Promise<void>;
  onValidate: () => void;
  validationIssueCount?: number;
  showValidation?: boolean;
}

const EmailTopBar: React.FC<EmailTopBarProps> = ({
  name, setName, groupId, setGroupId, groups, editorMode, setEditorMode, viewMode, setViewMode,
  canUndo, canRedo, onUndo, onRedo, onSave, onCancel, onPreview, onSendTest,
  onValidate, validationIssueCount, showValidation
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showTestInput, setShowTestInput] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) return;
    setIsSendingTest(true);
    await onSendTest(testEmail);
    setIsSendingTest(false);
    setShowTestInput(false);
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] z-50 relative">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base font-bold text-slate-800 outline-none bg-transparent hover:bg-slate-50 focus:bg-slate-100 px-2 py-0.5 rounded transition-all border border-transparent hover:border-slate-200 focus:border-amber-500 truncate max-w-[150px] sm:max-w-xs"
            />
            <div className="w-48">
              <Select
                options={[
                  { value: '', label: 'Chưa phân loại' },
                  ...groups.map(g => ({ value: g.id, label: g.name }))
                ]}
                value={groupId}
                onChange={setGroupId}
                variant="filled"
                size="xs"
                searchable
                icon={FolderOpen}
                placeholder="Chọn nhóm..."
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-black px-2 uppercase tracking-wider">{editorMode === 'code' ? 'HTML Editor' : 'Drag & Drop Builder'}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {editorMode === 'visual' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-inner">
            <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-slate-300"></div>
            <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></button>
          </div>
        )}

        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setEditorMode('visual')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${editorMode === 'visual' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <Layout className="w-3.5 h-3.5" /> Visual
          </button>
          <button onClick={() => setEditorMode('code')} className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${editorMode === 'code' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
            <Code className="w-3.5 h-3.5" /> Code
          </button>
        </div>

        <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button onClick={() => setViewMode('desktop')} className={`p-2 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`} title="Desktop View"><Monitor className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('mobile')} className={`p-2 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`} title="Mobile View"><Smartphone className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Validate button */}
        {editorMode === 'visual' && (
          <div className="relative">
            <button
              onClick={onValidate}
              title="Kiểm duyệt email"
              className={`relative flex items-center gap-2 px-4 h-10 rounded-xl border text-xs font-bold transition-all ${showValidation
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-inner'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Kiểm duyệt</span>
              {validationIssueCount !== undefined && validationIssueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm shadow-rose-300 animate-in zoom-in duration-200">
                  {validationIssueCount}
                </span>
              )}
              {validationIssueCount === 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
            </button>
          </div>
        )}

        <div className="relative">
          <Button variant="secondary" onClick={() => setShowTestInput(!showTestInput)} icon={Send} className="hidden sm:flex h-10 px-4 text-xs font-medium text-slate-600">Test Send</Button>
          {showTestInput && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-xs font-semibold text-slate-700">Gửi email test</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="nhập email..."
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-all"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
                  autoFocus
                />
                <button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail}
                  className="bg-amber-500 text-white rounded-lg p-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          {/* Backdrop for popover */}
          {showTestInput && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowTestInput(false)} />}
        </div>

        <Button variant="secondary" onClick={onPreview} icon={Eye} className="hidden sm:flex h-10 px-4 text-xs">Xem trước</Button>
        <Button icon={isSaving ? Loader2 : Save} onClick={handleSave} isLoading={isSaving} className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-transparent hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 h-10 px-6 text-xs transition-all duration-300">Lưu mẫu</Button>
      </div>
    </div>
  );
};

export default EmailTopBar;
