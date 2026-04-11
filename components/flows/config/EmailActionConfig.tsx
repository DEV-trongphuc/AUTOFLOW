
import React, { useState, useEffect, useRef } from 'react';
import { Eye, Layout, Mail, Info, User, ShieldCheck, Zap, FileText, Code, Check, Braces, ChevronDown, Paperclip, File as FileIcon, X, Filter, Plus, AlertCircle, Loader2, Layers } from 'lucide-react';
import { api } from '../../../services/storageAdapter';
import { Template, Attachment } from '../../../types';
import Input from '../../common/Input';
import Button from '../../common/Button';
import Select from '../../common/Select';
import TemplateSelector from '../TemplateSelector';
import EmailPreviewDrawer from './EmailPreviewDrawer';
import toast from 'react-hot-toast';


interface EmailActionConfigProps {
    config: Record<string, any>;
    onChange: (newConfig: Record<string, any>) => void;
    disabled?: boolean;
}

const MERGE_TAGS = [
    { label: 'Họ tên', value: '{{full_name}}' },
    { label: 'Tên', value: '{{first_name}}' },
    { label: 'Họ', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Công ty', value: '{{company}}' },
    { label: 'Chức danh', value: '{{job_title}}' },
    { label: 'Số điện thoại', value: '{{phone}}' },
    { label: 'Hủy đăng ký (Bắt buộc)', value: '{{unsubscribe_url}}' },
];

const EmailActionConfig: React.FC<EmailActionConfigProps> = ({ config, onChange, disabled }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [verifiedEmails, setVerifiedEmails] = useState<any[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [previewData, setPreviewData] = useState<{ template: Template | null, html?: string } | null>(null);
    const [showPersonalization, setShowPersonalization] = useState<{ target: 'subject' | 'body' | null }>({ target: null });

    // HTML Mode State
    const [showVarDropdown, setShowVarDropdown] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Attachment States
    const [attachments, setAttachments] = useState<Attachment[]>(config.attachments || []);
    const [isUploading, setIsUploading] = useState(false);
    const [isPersonalizedMode, setIsPersonalizedMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Flag khi template được cấu hình trong step đã bị xóa khỏi hệ thống
    const [templateDeleted, setTemplateDeleted] = useState(false);

    // 'template' or 'html'
    const sourceMode = config.sourceMode || (config.templateId ? 'template' : (config.customHtml ? 'html' : 'template'));

    useEffect(() => {
        Promise.all([
            api.get<Template[]>('templates'),
            api.get<any>('settings')
        ]).then(([res, settingRes]) => {
            if (res.success) {
                const personalTemplates = res.data.filter(t => !t.id.startsWith('sys_'));
                setTemplates(personalTemplates);
            }

            // Sync verified emails
            let currentSaved: string[] = JSON.parse(localStorage.getItem('mailflow_verified_emails') || '[]');

            if (settingRes.success && settingRes.data) {
                const configEmail = settingRes.data.smtp_from_email || settingRes.data.smtp_user;
                if (configEmail && configEmail.includes('@')) {
                    if (!currentSaved.includes(configEmail)) {
                        currentSaved = [configEmail, ...currentSaved];
                    }
                }
            }

            // Fallback default
            if (currentSaved.length === 0) {
                currentSaved = ['marketing@ka-en.com.vn'];
            }

            localStorage.setItem('mailflow_verified_emails', JSON.stringify(currentSaved));
            setVerifiedEmails(currentSaved.map((e: string) => ({ value: e, label: e })));

            // [AUTO-SELECT] Nếu bước chưa có email người gửi → tự chọn
            if (!config.senderEmail && currentSaved.length > 0) {
                // Ưu tiên email đã chọn gần nhất (nhớ qua localStorage)
                const lastUsed = localStorage.getItem('mailflow_last_sender_email');
                const defaultEmail = (lastUsed && currentSaved.includes(lastUsed))
                    ? lastUsed
                    : currentSaved[0];
                onChange({ ...config, senderEmail: defaultEmail });
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync attachments with parent config
    useEffect(() => {
        onChange({ ...config, attachments: attachments });
    }, [attachments]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch full template data when templateId changes
    useEffect(() => {
        if (config.templateId && sourceMode === 'template') {
            setTemplateDeleted(false); // Reset khi templateId thay đổi
            api.get<Template>(`templates?id=${config.templateId}`).then(res => {
                if (res.success && res.data) {
                    // Update templates array with full data
                    setTemplates(prev => {
                        const index = prev.findIndex(t => t.id === config.templateId);
                        if (index >= 0) {
                            const updated = [...prev];
                            updated[index] = res.data;
                            return updated;
                        }
                        return [...prev, res.data];
                    });
                } else {
                    // Template đã bị xóa hoặc không tồn tại
                    setTemplateDeleted(true);
                }
            });
        } else {
            setTemplateDeleted(false);
        }
    }, [config.templateId, sourceMode]);

    const selectedTemplate = templates.find(t => t.id === config.templateId);

    const injectTag = (tag: string, target?: 'subject' | 'body') => {
        if (disabled) return;

        // Determine target based on context
        if (target) {
            const targetKey = target === 'subject' ? 'subject' : 'contentBody';
            const current = config[targetKey] || '';
            onChange({ ...config, [targetKey]: current + ' ' + tag });
            setShowPersonalization({ target: null });
            return;
        }

        // Default to customHtml if in HTML mode and no specific target
        if (sourceMode === 'html') {
            const textarea = textAreaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const current = config.customHtml || '';
                const newText = current.substring(0, start) + tag + current.substring(end);
                onChange({ ...config, customHtml: newText });
                setShowVarDropdown(false);
            } else {
                const current = config.customHtml || '';
                onChange({ ...config, customHtml: current + tag });
            }
        }
    };

    const handleModeChange = (mode: 'template' | 'html') => {
        onChange({ ...config, sourceMode: mode });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled || !e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files) as File[];

        if (isPersonalizedMode) {
            const invalidFiles = files.filter(file => !/_[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(file.name));
            if (invalidFiles.length > 0) {
                const invalidNames = invalidFiles.map(f => f.name).join('\n- ');
                toast.error(`LỖI ĐỊNH DẠNG TÊN FILE!\n\nCác file sau không hợp lệ ở chế độ "Gửi Riêng":\n- ${invalidNames}\n\nYêu cầu: Tên file phải chứa Email (VD: Hopdong_khachA@gmail.com.pdf)`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        }

        setIsUploading(true);
        const newAttachments: Attachment[] = [];
        const apiUrl = localStorage.getItem('mailflow_api_url') || 'https://automation.ideas.edu.vn/mail_api';
        const uploadUrl = apiUrl.replace(/\/$/, '') + '/upload.php';

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(uploadUrl, { method: 'POST', body: formData });
                const result = (await response.json()) as any;

                if (result.success) {
                    newAttachments.push({
                        id: crypto.randomUUID(),
                        name: result.data.name,
                        url: result.data.url,
                        size: result.data.size,
                        type: result.data.type,
                        logic: isPersonalizedMode ? 'match_email' : 'all',
                        path: result.data.path // Save internal path for mailer
                    });
                } else {
                    console.error(`Upload failed for ${file.name}: ${result.message}`);
                }
            } catch (error) {
                console.error(`Upload error for ${file.name}`, error);
            }
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        } else {
            toast.error('Không upload được file nào. Vui lòng kiểm tra kết nối.');
        }

        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (id: string) => {
        if (disabled) return;
        setAttachments(attachments.filter(a => a.id !== id));
    };


    return (
        <div className="space-y-6">
            {/* 1. SENDER & SUBJECT */}
            <div className="space-y-4">
                <div className="relative">
                    <Input
                        label="Tiêu đề Email (Subject)"
                        placeholder="VD: 🎁 Quà tặng cho {{first_name}}..."
                        value={config.subject || ''}
                        onChange={(e) => onChange({ ...config, subject: e.target.value })}
                        error={!config.subject ? "Tiêu đề không được để trống" : ""}
                        disabled={disabled}
                    />
                    <button
                        onClick={() => setShowPersonalization({ target: showPersonalization.target === 'subject' ? null : 'subject' })}
                        className={`absolute right-4 bottom-2.5 p-1.5 transition-colors ${showPersonalization.target === 'subject' ? 'text-[#ca7900]' : 'text-slate-400 hover:text-[#ca7900]'}`}
                        title="Cá nhân hóa tiêu đề"
                        disabled={disabled}
                    >
                        <User className="w-4 h-4" />
                    </button>

                    {showPersonalization.target === 'subject' && (
                        <div className="absolute right-0 top-20 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in zoom-in-95">
                            <p className="text-[9px] font-black uppercase text-slate-400 p-2 tracking-widest">Cá nhân hóa tiêu đề</p>
                            <div className="grid grid-cols-1 gap-1">
                                {MERGE_TAGS.map(tag => (
                                    <button
                                        key={tag.value}
                                        onClick={() => injectTag(tag.value, 'subject')}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 text-xs font-bold text-slate-700 transition-colors flex justify-between items-center"
                                    >
                                        {tag.label} <code className="text-[9px] text-orange-500 font-mono">{tag.value}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 ml-1">Chọn Email gửi đi</label>
                    <div className="grid grid-cols-1 gap-2">
                        {verifiedEmails.length > 0 ? verifiedEmails.map((email) => (
                            <button
                                key={email.value}
                                onClick={() => {
                                    if (!disabled) {
                                        onChange({ ...config, senderEmail: email.value });
                                        // Lưu lại để các bước email sau tự kế thừa
                                        localStorage.setItem('mailflow_last_sender_email', email.value);
                                    }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${config.senderEmail === email.value ? 'border-[#ffa900] bg-orange-50/50 ring-4 ring-orange-50' : 'border-slate-100 bg-white hover:border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={disabled}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${config.senderEmail === email.value ? 'bg-[#ffa900] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{email.label}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Đã xác minh</p>
                                    </div>
                                </div>
                                {config.senderEmail === email.value && <Zap className="w-4 h-4 text-[#ffa900] fill-[#ffa900]" />}
                            </button>
                        )) : (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                                <Info className="w-5 h-5 shrink-0" />
                                <p className="text-xs font-bold">Chưa có email xác minh. Hãy vào Cài đặt để thêm.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. CONTENT SOURCE SELECTOR */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">Nội dung Email</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => handleModeChange('template')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${sourceMode === 'template' ? 'bg-white text-[#ca7900] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        disabled={disabled}
                    >
                        <Layout className="w-3.5 h-3.5" /> Chọn Mẫu (Visual)
                    </button>
                    <button
                        onClick={() => handleModeChange('html')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${sourceMode === 'html' ? 'bg-white text-[#ca7900] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        disabled={disabled}
                    >
                        <Code className="w-3.5 h-3.5" /> HTML Code
                    </button>
                </div>

                {sourceMode === 'template' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Cảnh báo khi template đã bị xóa */}
                        {templateDeleted && (
                            <div className="flex items-start gap-3 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl animate-in fade-in">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-rose-700">⚠️ Mẫu email đã bị xóa!</p>
                                    <p className="text-xs text-rose-600 mt-1">
                                        Mẫu email được chọn cho bước này không còn tồn tại trong hệ thống. Email sẽ <strong>không gử được</strong> cho đến khi chọn lại mẫu mới.
                                    </p>
                                    <button
                                        onClick={() => { onChange({ ...config, templateId: undefined }); setTemplateDeleted(false); setShowPicker(true); }}
                                        className="mt-2 text-xs font-bold text-rose-700 underline hover:text-rose-900"
                                        disabled={disabled}
                                    >
                                        Chọn mẫu khác ngay
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedTemplate ? (
                            <div className="group relative rounded-[24px] border-2 border-[#ffa900]/20 hover:border-[#ffa900] transition-all overflow-hidden bg-white shadow-lg hover:shadow-xl">
                                <div className="aspect-[16/9] bg-slate-50 relative overflow-hidden">
                                    {selectedTemplate.htmlContent ? (
                                        <iframe
                                            srcDoc={selectedTemplate.htmlContent}
                                            className="w-full h-full pointer-events-none scale-[0.4] origin-top-left"
                                            style={{ width: '250%', height: '250%' }}
                                            sandbox="allow-same-origin"
                                            title="Email Preview"
                                        />
                                    ) : (
                                        <img src={selectedTemplate.thumbnail} className="w-full h-full object-cover transition-all duration-500 opacity-80 group-hover:opacity-100" alt={selectedTemplate.name} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                        <div>
                                            <h4 className="font-bold text-white text-sm drop-shadow-lg">{selectedTemplate.name}</h4>
                                            <p className="text-[9px] font-black text-orange-300 uppercase tracking-widest drop-shadow">{selectedTemplate.category}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowPicker(true)} className="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-lg text-[10px] font-bold uppercase hover:bg-white hover:text-[#ca7900] transition-all">Đổi mẫu</button>
                                            <button
                                                onClick={async () => {
                                                    // Fetch full template data with htmlContent
                                                    const res = await api.get<Template>(`templates?id=${selectedTemplate.id}`);
                                                    if (res.success && res.data) {
                                                        setPreviewData({ template: res.data });
                                                    } else {
                                                        setPreviewData({ template: selectedTemplate });
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-[#ffa900] text-white rounded-lg text-[10px] font-bold uppercase hover:bg-[#ca7900] transition-all flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3" /> Xem
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowPicker(true)}
                                className={`w-full py-12 border-2 border-dashed border-slate-200 rounded-[28px] bg-slate-50/50 text-slate-400 flex flex-col items-center justify-center gap-3 hover:bg-white hover:border-[#ffa900] hover:text-[#ca7900] transition-all group shadow-inner ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={disabled}
                            >
                                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Layout className="w-6 h-6" /></div>
                                <span className="text-xs font-bold uppercase tracking-wider">Chọn mẫu từ thư viện</span>
                            </button>
                        )}
                    </div>
                )}

                {/* MODE: HTML CODE */}
                {sourceMode === 'html' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="relative">
                            <div className="absolute top-0 right-0 z-10 flex gap-2">
                                {/* VARIABLE DROPDOWN */}
                                <div className="relative">
                                    <button
                                        onClick={() => !disabled && setShowVarDropdown(!showVarDropdown)}
                                        disabled={disabled}
                                        className="bg-slate-700 text-white px-3 py-1.5 rounded-bl-xl text-[10px] font-bold uppercase hover:bg-slate-600 transition-colors flex items-center gap-1 border-r border-slate-600"
                                    >
                                        <Braces className="w-3.5 h-3.5 text-[#ffa900]" />
                                        Biến động (Click to Insert)
                                        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                                    </button>
                                    {showVarDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setShowVarDropdown(false)}></div>
                                            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30 animate-in fade-in zoom-in-95">
                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Click để chèn</p>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                    {MERGE_TAGS.map((tag) => (
                                                        <button
                                                            key={tag.value}
                                                            onClick={() => injectTag(tag.value)}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors rounded-lg"
                                                        >
                                                            <span className="text-xs font-bold text-slate-700">{tag.label}</span>
                                                            <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono group-hover:text-[#ca7900] group-hover:bg-orange-50">{tag.value}</code>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => setPreviewData({ template: null, html: config.customHtml })}
                                    className="bg-[#ffa900] text-white px-3 py-1.5 rounded-bl-xl text-[10px] font-bold uppercase hover:bg-[#ca7900] transition-colors flex items-center gap-1"
                                >
                                    <Eye className="w-3 h-3" /> Preview HTML
                                </button>
                            </div>
                            <textarea
                                ref={textAreaRef}
                                className="w-full h-64 bg-[#1e293b] text-indigo-100 font-mono text-xs p-4 pt-10 rounded-xl outline-none border-2 border-transparent focus:border-[#ffa900] transition-all resize-y leading-relaxed custom-scrollbar"
                                placeholder="<html><body><h1>Paste your HTML here...</h1></body></html>"
                                value={config.customHtml || ''}
                                onChange={(e) => onChange({ ...config, customHtml: e.target.value })}
                                spellCheck={false}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 3. ATTACHMENTS SECTION */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">Tệp đính kèm (Attachments)</label>
                <div className="space-y-4">
                    {/* Toggle for Personalized Mode */}
                    <div className={`mb-4 p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${isPersonalizedMode ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} onClick={() => !disabled && setIsPersonalizedMode(!isPersonalizedMode)}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isPersonalizedMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                                <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${isPersonalizedMode ? 'text-blue-700' : 'text-slate-600'}`}>Bật để gửi file khớp cá nhân</p>
                                {isPersonalizedMode && <p className="text-[9px] text-blue-500 font-medium mt-0.5">Tự động tìm file chứa Email khách hàng</p>}
                            </div>
                        </div>
                        {isPersonalizedMode ? <Filter className="w-5 h-5 text-blue-500" /> : <Layers className="w-5 h-5 text-slate-400" />}
                    </div>

                    {/* Personalized Mode Info */}
                    {isPersonalizedMode && (
                        <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
                                Khi chế độ này BẬT, tên file đính kèm phải chứa địa chỉ email của người nhận (VD: `invoice_john@example.com.pdf`). File chỉ được gửi nếu khớp email.
                            </p>
                        </div>
                    )}

                    {/* Upload Button */}
                    <div onClick={() => !disabled && fileInputRef.current?.click()} className={`cursor-pointer w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        <span className="text-xs font-bold uppercase">Upload Tệp đính kèm ({isPersonalizedMode ? 'Cá nhân hóa' : 'Gửi Chung'})</span>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} disabled={isUploading || disabled} />
                    </div>

                    {/* Attachment List */}
                    {attachments.length > 0 ? attachments.map((att) => (
                        <div key={att.id} className={`border rounded-2xl p-3 animate-in fade-in slide-in-from-bottom-2 transition-colors ${att.logic !== 'all' ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-100'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${att.logic !== 'all' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate" title={att.name}>{att.name}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[9px] text-slate-400 font-mono">{(att.size / 1024).toFixed(1)} KB</p>
                                            {att.logic !== 'all' && <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Personalized</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => removeAttachment(att.id)} className="text-slate-300 hover:text-rose-500 p-1" disabled={disabled}><X className="w-4 h-4" /></button>
                            </div>

                            {att.logic === 'match_email' && (
                                <p className="text-[9px] text-blue-600 mt-2 px-1 flex items-center gap-1 font-medium bg-white/50 p-1 rounded-lg">
                                    <Filter className="w-3 h-3" /> Chỉ gửi cho Email khớp trong tên file.
                                </p>
                            )}
                        </div>
                    )) : null}

                    {attachments.length === 0 && (
                        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs italic">
                            Chưa có tệp đính kèm.
                        </div>
                    )}
                </div>
            </div>

            {showPicker && (
                <div className="p-1 bg-white rounded-[32px] border-2 border-[#ffa900]/10 shadow-2xl animate-in zoom-in-95 duration-200 fixed inset-x-4 top-20 bottom-20 z-[100] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Chọn mẫu Email</h3>
                        <button onClick={() => setShowPicker(false)} className="p-2 hover:bg-slate-100 rounded-full"><FileText className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <TemplateSelector
                            templates={templates}
                            selectedId={config.templateId}
                            onSelect={(t) => { if (!disabled) { onChange({ ...config, templateId: t.id }); setShowPicker(false); } }}
                        />
                    </div>
                </div>
            )}

            {/* Overlay for Picker Backdrop */}
            {showPicker && <div className="fixed inset-0 bg-black/20 z-[90]" onClick={() => setShowPicker(false)}></div>}

            <EmailPreviewDrawer
                template={previewData?.template || null}
                htmlContent={previewData?.html}
                isOpen={!!previewData}
                onClose={() => setPreviewData(null)}
            />
        </div>
    );
};

export default EmailActionConfig;
