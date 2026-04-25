import { API_BASE_URL, DEMO_MODE } from '@/utils/config';
import * as React from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { UserCheck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Settings2, Mail, Users, BellRing, CheckCircle2, Wand2, Check, X,
    ShieldCheck, Code, FileCode, Eye, Save, ChevronRight, ChevronLeft, Calendar, Send, GitMerge, Layout, Braces, ChevronDown, Loader2, ArrowRight, Zap, Sparkles, Smartphone, FileText, Download, Upload, Target, Plus, AlertCircle, Edit3
} from 'lucide-react';
import { Campaign, CampaignStatus, Template, Segment, Flow, Subscriber } from '../../types'; // Fix: Import Subscriber
import { api } from '../../services/storageAdapter'; // Fix: Import api
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import toast from 'react-hot-toast';
import TemplateSelector from '../flows/TemplateSelector';
import AudienceSelector from './AudienceSelector';
import ReminderManager from './ReminderManager';
import LaunchPreview from './LaunchPreview';
import TestEmailModal from './TestEmailModal';
import TabTransition from '../common/TabTransition';
import EmailEditor from '../templates/EmailEditor/index';

interface CampaignWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Partial<Campaign>;
    allLists: any[];
    allSegments: Segment[];
    allTags: any[];
    allTemplates: Template[];
    allFlows: Flow[];
    senderEmails: string[];
    onSaveDraft: (data: Partial<Campaign>) => Promise<Campaign | null>;
    onPublish: (data: Partial<Campaign>, options: { connectFlow: boolean, activateFlowId: string | null }) => Promise<Campaign | null>;
}

const MERGE_TAGS = [
    { label: 'Họ tên', value: '{{full_name}}' },
    { label: 'Tên (First Name)', value: '{{first_name}}' },
    { label: 'Họ (Last Name)', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Công ty', value: '{{company}}' },
    { label: 'Chức danh', value: '{{job_title}}' },
    { label: 'Số điện thoại', value: '{{phone}}' },
    { label: 'Link Hủy đăng ký', value: '{{unsubscribe_url}}' },
];

interface Option {
    value: string;
    label: string;
    subLabel?: string;
    icon?: React.ReactNode;
}

const CustomSelect: React.FC<{
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}> = ({ value, options, onChange, placeholder, disabled, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isVisible, setIsVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            setIsVisible(true);
            const timer = setTimeout(() => setAnimateIn(true), 10);
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 py-3 flex items-center justify-between bg-white border-2 rounded-xl text-sm font-medium transition-all ${isOpen
                    ? 'border-blue-500 ring-4 ring-blue-500/10'
                    : 'border-slate-200 hover:border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {selectedOption?.icon || icon}
                    <span className={`block truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isVisible && (
                <div className={`absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-auto divide-y divide-slate-50 transform transition-all duration-200 ${animateIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}>
                    {options.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                            Không có dữ liệu
                        </div>
                    ) : (
                        options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-3 flex items-start text-left hover:bg-blue-50 transition-colors group ${option.value === value ? 'bg-blue-50/50' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {option.icon}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${option.value === value ? 'text-blue-700' : 'text-slate-700'
                                            }`}>
                                            {option.label}
                                        </p>
                                        {option.subLabel && (
                                            <p className="text-xs text-slate-400 mt-0.5 truncate group-hover:text-blue-400">
                                                {option.subLabel}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {option.value === value && (
                                    <Check className="w-4 h-4 text-blue-600 mt-0.5 ml-2 shrink-0" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const VariablePicker: React.FC<{ onSelect: (val: string) => void }> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isVisible, setIsVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            setIsVisible(true);
            const timer = setTimeout(() => setAnimateIn(true), 10);
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                clearTimeout(timer);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const vars = [
        { label: 'Họ tên đầy đủ', value: '{{full_name}}' },
        { label: 'Tên (First Name)', value: '{{first_name}}' },
        { label: 'Số điện thoại', value: '{{phone}}' },
        { label: 'Email', value: '{{email}}' },
        { label: 'Ngày hiện tại', value: '{{current_date}}' },
    ];

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            >
                <Braces className="w-4 h-4" />
            </button>

            {isVisible && (
                <div className={`absolute right-0 top-full mt-2 z-[100] w-48 bg-white border border-slate-100 rounded-xl shadow-2xl py-2 transform transition-all duration-200 ${animateIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}>
                    <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Chọn biến...</p>
                    {vars.map(v => (
                        <button
                            key={v.value}
                            type="button"
                            onClick={() => {
                                onSelect(v.value);
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between group"
                        >
                            {v.label}
                            <span className="text-[9px] text-slate-300 group-hover:text-blue-400 font-mono transition-colors">{v.value}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const CampaignWizard: React.FC<CampaignWizardProps> = ({
    isOpen, onClose: _onClose, initialData,
    allLists, allSegments, allTags, allTemplates, allFlows, senderEmails,
    onSaveDraft, onPublish
}) => {
    const { can } = useAuth();
    const canSend = can('send_campaigns');
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [animateWizardIn, setAnimateWizardIn] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            const timer = setTimeout(() => setAnimateWizardIn(true), 10);
            return () => clearTimeout(timer);
        } else {
            setAnimateWizardIn(false);
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const onClose = () => {
        setAnimateWizardIn(false);
        setTimeout(_onClose, 500);
    };

    const handleIntentClose = () => {
        if (formData.name || formData.subject || formData.templateId || (formData.target?.listIds && formData.target.listIds.length > 0)) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Campaign>>(() => {
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        return {
            name: `[${dateStr}] - Chiến dịch mới`, subject: '', senderEmail: '', templateId: '',
            target: { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
            reminders: [], trackingEnabled: true, status: CampaignStatus.DRAFT,
            contentBody: '',
            attachments: [],
            type: 'email'
        };
    });
    const [attemptedNext, setAttemptedNext] = useState(false);
    const [isHtmlPreview, setIsHtmlPreview] = useState(false);
    const [connectFlow, setConnectFlow] = useState(false);
    const [activateFlowId, setActivateFlowId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showNurtureOffer, setShowNurtureOffer] = useState(false);
    const [showFlowSelectModal, setShowFlowSelectModal] = useState(false);

    // ZNS State
    const [znsTemplates, setZnsTemplates] = useState<any[]>([]);
    const [loadingZns, setLoadingZns] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [znsOAs, setZnsOAs] = useState<any[]>([]);
    const [inputMode, setInputMode] = useState<'manual' | 'mapped'>('mapped');

    const fetchTemplateDetail = async (id: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.post<{ previewUrl?: string }>(`zalo_templates?route=detail&id=${id}`, {});
            if (res.success && res.data) {
                setZnsTemplates(prev => prev.map(t => t.id === id ? { ...t, template_data: { ...(t.template_data || {}), detail: res.data } } : t));
            }
        } catch (e) {
            console.error('Failed to fetch detail', e);
        }
        setLoadingDetail(false);
    };

    const handleZnsTemplateChange = (templateId: string) => {
        const t = znsTemplates.find(x => x.template_id === templateId);
        if (t) {
            // Auto-match parameters based on name
            const mapped_params: Record<string, string> = {};
            const params = t.template_data?.detail?.listParams || t.template_data?.raw?.listParams || [];

            params.forEach((p: any) => {
                const name = p.name.toLowerCase();
                if (name.includes('ho_ten') || name.includes('customer_name') || name.includes('fullname')) {
                    mapped_params[p.name] = '{{full_name}}';
                } else if (name.includes('phone') || name.includes('sdt') || name.includes('so_dien_thoai')) {
                    mapped_params[p.name] = '{{phone}}';
                } else if (name.includes('email')) {
                    mapped_params[p.name] = '{{email}}';
                } else if (name.includes('ngay') || name.includes('date')) {
                    mapped_params[p.name] = '{{current_date}}';
                }
            });

            setFormData({
                ...formData,
                templateId: t.template_id,
                // P0 FIX: Only overwrite OA if it's currently empty, to prevent "losing" manual selection
                config: {
                    ...formData.config,
                    oa_config_id: formData.config?.oa_config_id || t.oa_config_id,
                    mapped_params
                }
            });

            // Trigger detail fetch immediately if needed
            if (!t.template_data?.detail?.previewUrl) {
                fetchTemplateDetail(t.id);
            }
        }
    };

    const [showVarDropdown, setShowVarDropdown] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    // P0 FIX: Auto-match parameters when audience changes
    useEffect(() => {
        if (formData.type === 'zalo_zns' && formData.templateId && formData.target) {
            const t = znsTemplates.find(x => x.template_id === formData.templateId);
            if (t) {
                const mapped_params = { ...(formData.config?.mapped_params || {}) };
                const params = t.template_data?.detail?.listParams || t.template_data?.raw?.listParams || [];
                let hasChange = false;

                params.forEach((p: any) => {
                    // Only auto-match if not already set manually
                    if (!mapped_params[p.name]) {
                        const name = p.name.toLowerCase();
                        if (name.includes('ho_ten') || name.includes('customer_name') || name.includes('fullname')) {
                            mapped_params[p.name] = '{{full_name}}';
                            hasChange = true;
                        } else if (name.includes('phone') || name.includes('sdt') || name.includes('so_dien_thoai')) {
                            mapped_params[p.name] = '{{phone}}';
                            hasChange = true;
                        } else if (name.includes('email')) {
                            mapped_params[p.name] = '{{email}}';
                            hasChange = true;
                        } else if (name.includes('ngay') || name.includes('date')) {
                            mapped_params[p.name] = '{{current_date}}';
                            hasChange = true;
                        }
                    }
                });

                if (hasChange) {
                    setFormData(prev => ({
                        ...prev,
                        config: { ...prev.config, mapped_params }
                    }));
                }
            }
        }
    }, [formData.target, formData.templateId, znsTemplates]);

    const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const publishLockRef = useRef(false);

    // Fix: Add state for all subscribers to create the existingEmailsSet
    const [allSubscribers, setAllSubscribers] = useState<Subscriber[]>([]);
    // Fix: Explicit state for Test Email ID to ensure modal gets it immediately
    const [testEmailCampaignId, setTestEmailCampaignId] = useState<string | null>(null);

    // Template Preview State
    const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({});
    const [loadingPreview, setLoadingPreview] = useState(false);
    
    // UI Enhancements State
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [activeEditTemplateId, setActiveEditTemplateId] = useState<string | null>(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Effect 1: Reset step ONLY when opening fresh
    // [FIX P39-WIZ] Removed expensive `subscribers?limit=1000` fetch on wizard open.
    // Previously loaded 1000 subscriber records solely to build an existingEmailsSet for
    // duplicate detection. This was wasteful — the server handles deduplication on import.
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setAttemptedNext(false);
            setConnectFlow(false);
            setActivateFlowId(null);
            // Reset allSubscribers — server handles deduplication during actual import
            setAllSubscribers([]);
        }
    }, [isOpen]);

    // Effect 2: Update local form data when initialData changes, but DO NOT RESET STEP
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const initialTagIds = Array.isArray(initialData.target?.tagIds) ? initialData.target.tagIds : [];
                setFormData(prev => ({
                    ...prev,
                    ...initialData,
                    senderEmail: (initialData.senderEmail && senderEmails.includes(initialData.senderEmail)) ? initialData.senderEmail : (senderEmails[0] || ''),
                    target: {
                        listIds: initialData.target?.listIds || [],
                        segmentIds: initialData.target?.segmentIds || [],
                        tagIds: initialTagIds,
                        individualIds: initialData.target?.individualIds || []
                    },
                    reminders: initialData.reminders || [],
                    attachments: initialData.attachments || []
                }));
            } else {
                // Only reset if we are opening fresh without data (controlled by effect 1 implicitly or if ID changes?)
                // Actually, if initialData is null, we might want to ensure formData is blank.
                // But since Effect 1 resets step, let's just do nothing here if initialData is undefined,
                // relying on the initial useState value or manual reset if needed.
                // For "New Campaign", initialData is undefined.
                // We should probably reset formData if initialData is explicitly undefined AND step is 1?
                // Or just set defaults.
                if (step === 1 && !formData.id) {
                    const now = new Date();
                    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
                    setFormData(prev => ({
                        ...prev,
                        name: prev.name && prev.name !== `[${dateStr}] - Chiến dịch mới` ? prev.name : `[${dateStr}] - Chiến dịch mới`,
                        subject: prev.subject || '',
                        senderEmail: (prev.senderEmail && senderEmails.includes(prev.senderEmail)) ? prev.senderEmail : (senderEmails[0] || ''),
                        templateId: prev.templateId || '',
                        target: prev.target?.listIds ? prev.target : { listIds: [], segmentIds: [], tagIds: [], individualIds: [] },
                        reminders: prev.reminders || [],
                        trackingEnabled: prev.trackingEnabled ?? true,
                        status: prev.status || CampaignStatus.DRAFT,
                        contentBody: prev.contentBody || '',
                        attachments: prev.attachments || [],
                        type: prev.type || 'email'
                    }));
                }
            }
        }
    }, [isOpen, initialData, senderEmails]);

    // Fetch ZNS Data when type switches to ZNS
    useEffect(() => {
        if (formData.type === 'zalo_zns' && znsTemplates.length === 0) {
            const fetchData = async () => {
                setLoadingZns(true);
                try {
                    const [resTpl, resOA] = await Promise.all([
                        api.get<any>('zalo_templates'),
                        api.get<any>('zalo_oa') // Assuming this endpoint exists based on context
                    ]);
                    if (resTpl.success) {
                        const rawTemplates = Array.isArray(resTpl.data) ? resTpl.data : resTpl.data?.data || [];
                        const validTemplates = rawTemplates.filter((t: any) => t.status?.toUpperCase() !== 'REJECT' && t.status?.toUpperCase() !== 'REJECTED');
                        setZnsTemplates(validTemplates);
                    }
                    if (resOA.success) {
                        const oas = Array.isArray(resOA.data) ? resOA.data : [];
                        setZnsOAs(oas);
                        // Auto-select first OA if not set
                        if (oas.length > 0 && !formData.config?.oa_config_id) {
                            setFormData(prev => ({ ...prev, config: { ...prev.config, oa_config_id: oas[0].id } }));
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch ZNS data", e);
                } finally {
                    setLoadingZns(false);
                }
            };
            fetchData();
        }
    }, [formData.type]);

    // Polling logic for "sending" status progress within Wizard
    useEffect(() => {
        let pollTimer: any;
        if (isOpen && formData.id && formData.status === CampaignStatus.SENDING) {
            pollTimer = setInterval(async () => {
                const res = await api.get<any>(`campaigns?id=${formData.id}`);
                if (res.success) {
                    setFormData(prev => ({ ...prev, ...res.data }));
                    // If finished, stop polling
                    if (res.data.status !== CampaignStatus.SENDING) {
                        clearInterval(pollTimer);
                    }
                }
            }, 3000); // Poll every 3 seconds
        }
        return () => {
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [isOpen, formData.id, formData.status]);

    const isStepValid = (currentStep: number, showToast = false) => {
        const newErrors: Record<string, string> = {};
        let errorMsg = '';

        switch (currentStep) {
            case 1:
                if (!formData.name?.trim()) {
                    newErrors.name = 'Tên chiến dịch là bắt buộc';
                }
                if (formData.type === 'zalo_zns') {
                    // ZNS validation: OA check could go here if implemented
                } else {
                    // Email validation
                    if (!formData.senderEmail?.trim()) {
                        newErrors.senderEmail = 'Email người gửi là bắt buộc';
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail || '')) {
                        newErrors.senderEmail = 'Email không hợp lệ';
                    }
                }
                errorMsg = Object.values(newErrors)[0] || '';
                break;
            case 2:
                if (formData.type === 'zalo_zns') {
                    if (!formData.templateId) {
                        newErrors.content = 'Vui lòng chọn mẫu ZNS';
                    } else {
                        // Validate mapped_params
                        const t = znsTemplates.find(x => x.template_id === formData.templateId);
                        const params = Array.isArray(t?.preview_data) ? t.preview_data : [];
                        const mappedParams = formData.config?.mapped_params || {};

                        const missingParams = params
                            .filter((p: any) => !mappedParams[p.name] || mappedParams[p.name].trim() === '')
                            .map((p: any) => p.name);

                        if (missingParams.length > 0) {
                            newErrors.content = `Vui lòng điền tham số: ${missingParams.join(', ')}`;
                        }
                    }
                } else {
                    if (!formData.subject?.trim()) {
                        newErrors.subject = 'Tiêu đề email là bắt buộc';
                    } else if ((formData.subject?.length || 0) > 100) {
                        newErrors.subject = 'Tiêu đề không được quá 100 ký tự';
                    }
                    if (!formData.templateId && !formData.contentBody?.trim()) {
                        newErrors.content = 'Vui lòng chọn mẫu email hoặc nhập nội dung HTML';
                    }
                }
                errorMsg = Object.values(newErrors)[0] || '';
                break;
            case 3:
                const hasTarget = (formData.target?.listIds?.length || 0) > 0 ||
                    (formData.target?.segmentIds?.length || 0) > 0 ||
                    (formData.target?.tagIds?.length || 0) > 0 ||
                    (formData.target?.individualIds?.length || 0) > 0;
                if (!hasTarget) {
                    newErrors.target = 'Vui lòng chọn ít nhất một đối tượng nhận tin';
                    errorMsg = newErrors.target;
                }
                break;
            default:
                break;
        }

        if (showToast && errorMsg) {
            toast.error(errorMsg);
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleStepClick = (stepId: number) => {
        if (stepId < step) setStep(stepId);
        else if (stepId === step + 1) {
            if (isStepValid(step, true)) setStep(stepId);
        } else if (stepId > step + 1) {
            toast.error('Vui lòng Hoàn thành các bước theo thứ tự');
        }
    };

    const handleNext = () => {
        setAttemptedNext(true);
        if (isStepValid(step, true)) {
            setStep(step + 1);
            setAttemptedNext(false);
        }
    };

    // Fix: Modified handleQuickImport to match the new onImport signature
    const handleQuickImport = async (data: {
        subscribers: any[],
        targetListId: string | null,
        newListName: string | null,
        duplicates: number
    }) => {
        const { subscribers: newSubs, targetListId, newListName } = data;
        let finalListId = targetListId;

        // Tạo danh sách mới nếu cần
        if (newListName) {
            const lRes = await api.post<any>('lists', {
                name: newListName,
                count: 0,
                source: 'Quick Import',
                created: new Date().toLocaleDateString('vi-VN')
            });
            if (lRes.success) finalListId = lRes.data.id;
        }

        if (newSubs.length > 0 && finalListId) {
            const subsPayload = newSubs.map(s => ({
                ...s,
                listIds: [finalListId],
                tags: s.tags ? s.tags.split(',').map((t: string) => t.trim()) : ['Quick Import'], // Ensure tags are handled
                joinedAt: new Date().toISOString(),
                status: 'active',
                stats: { emailsSent: 0, emailsOpened: 0, linksClicked: 0 },
                customAttributes: {}
            }));

            await api.post('subscribers_bulk', subsPayload);

            // Tự động chọn danh sách vừa tạo/import vào target của campaign
            // FIX: Ensure formData.target.tagIds is an array
            const currentTagIds = Array.isArray(formData.target?.tagIds) ? formData.target!.tagIds : [];
            const newTarget = { ...formData.target!, listIds: Array.from(new Set([...(formData.target?.listIds || []), finalListId])), tagIds: currentTagIds };
            setFormData({ ...formData, target: newTarget });

            // Refresh all subscribers state to update existingEmailsSet
            const res = await api.get<Subscriber[]>('subscribers');
            if (res.success) {
                setAllSubscribers(res.data);
            }
        }
    };

    const handlePublishClick = async () => {
        if (publishLockRef.current || isSubmitting) return;

        // [INSTANT] Nurture Offer Logic: Show this first to provide immediate feedback
        if (!connectFlow && !showNurtureOffer && !formData.scheduledAt) {
            setShowNurtureOffer(true);
            return;
        }

        // Reset errors
        setErrors({});
        setAttemptedNext(true);

        // Required fields check
        if (!formData.name?.trim()) return;
        if (!formData.target?.listIds?.length && !formData.target?.segmentIds?.length && !formData.target?.tagIds?.length && !formData.target?.individualIds?.length) {
            toast.error("Vui lòng chọn đối tượng nhận tin");
            return;
        }

        // Email specific validation
        if ((!formData.type || formData.type === 'email')) {
            if (!formData.subject?.trim()) return;
            if (!formData.senderEmail) return;
            if (!formData.templateId && !formData.contentBody?.trim()) return;
        }

        // ZNS specific validation
        if (formData.type === 'zalo_zns') {
            if (!formData.templateId) return;
            if (!formData.config?.oa_config_id) return;

            // Check mapped params
            const t = znsTemplates.find(x => x.template_id === formData.templateId);
            const params = t?.template_data?.detail?.listParams || t?.template_data?.raw?.listParams || [];
            const missing = params.filter((p: any) => !formData.config?.mapped_params?.[p.name]);
            if (missing.length > 0) {
                toast.error(`Vui lòng điền đủ tham số: ${missing.map((m: any) => m.name).join(', ')}`);
                return;
            }

            // Time window check
            if (formData.scheduledAt) {
                const checkDate = new Date(formData.scheduledAt);
                const hour = checkDate.getHours();
                if (hour < 6 || hour >= 22) {
                    toast.error("Chiến dịch ZNS chỉ có thể gửi trong khung giờ 06:00 - 22:00.");
                    return;
                }
            }
        }

        // [VALIDATION] Server-side Fresh Check for Linked Flow Status
        if (!formData.scheduledAt) {
            try {
                const fRes = await api.get<any>('flows');
                if (fRes.success) {
                    const rawF = fRes.data as any;
                    const freshFlows: Flow[] = Array.isArray(rawF) ? rawF : (rawF?.data || []);
                    let flowToCheck: Flow | undefined;
                    if (activateFlowId) {
                        flowToCheck = freshFlows.find(f => f.id === activateFlowId);
                    } else {
                        flowToCheck = freshFlows.find(f => {
                            if (!f.steps) return false;
                            let steps = f.steps;
                            if (typeof steps === 'string') {
                                try { steps = JSON.parse(steps); } catch (e) { return false; }
                            }
                            if (!Array.isArray(steps)) return false;
                            const trigger = steps.find((s: any) => s.type === 'trigger');
                            return trigger?.config?.type === 'campaign' && String(trigger.config.targetId) === String(formData.id);
                        });
                    }
                    if (flowToCheck && flowToCheck.status !== 'active') {
                        toast.error(
                            `Kịch bản liên kết "${flowToCheck.name}" chưa được Kích hoạt!\n\nNếu bạn gửi bây giờ, Khách hàng sẽ KHÔNG được thêm vào quy trình chăm sóc.\nVui lòng sang trang Automation để bật Flow này lên trước.`,
                            { duration: 8000, icon: '🛑', style: { borderRadius: '16px', background: '#fff1f2', border: '1px solid #fda4af', color: '#be123c' } }
                        );
                        return;
                    }
                }
            } catch (err) {
                console.error("Flow validation failed", err);
            }
        }

        // Start ACTUAL publishing
        publishLockRef.current = true;
        setIsSubmitting(true);
        setShowNurtureOffer(false); // Close the offer modal if it was open

        try {
            const result = await onPublish(formData, { connectFlow, activateFlowId });

            // Fix: Don't rely solely on status check, if result exists it means success
            // Also handle case where result is null but operation was successful (e.g. "Already processed")
            if (result || result === null) {
                // If result is null (already processed), manually set status to SENDING to keep UI consistent
                const update = result || { status: CampaignStatus.SENDING };
                setFormData(prev => ({ ...prev, ...update }));

                // Close modal immediately as requested
                handleIntentClose();
            }
        } finally {
            publishLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleTestEmail = async () => {
        let currentCampaignId = formData.id;

        // If no ID yet, we MUST save draft first to get a campaign context for content resolution
        if (!currentCampaignId) {
            const saved = await onSaveDraft(formData);
            if (saved && saved.id) {
                currentCampaignId = saved.id;
                setFormData(prev => ({ ...prev, id: saved.id }));
                setTestEmailCampaignId(saved.id);
            } else {
                return; // Error occurred during save
            }
        } else {
            setTestEmailCampaignId(currentCampaignId);
        }

        setIsTestEmailModalOpen(true);
    };

    const insertVariable = (tag: string) => {
        if (textAreaRef.current) {
            const start = textAreaRef.current.selectionStart;
            const end = textAreaRef.current.selectionEnd;
            const text = formData.contentBody || '';
            const newText = text.substring(0, start) + tag + text.substring(end);
            setFormData({ ...formData, contentBody: newText });
            setShowVarDropdown(false);
            setTimeout(() => textAreaRef.current?.focus(), 50);
        }
    };

    // Fetch template preview HTML
    const fetchTemplatePreview = useCallback(async (templateId: string) => {
        // Skip if already cached
        if (templatePreviews[templateId]) return;

        // [ISOLATION] In DEMO_MODE, never call the production PHP endpoint.
        // Return a realistic static preview so the wizard UI still demonstrates correctly.
        if (DEMO_MODE) {
            const demoHtml = `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff;border-radius:16px">
                <div style="background:linear-gradient(135deg,#ffa900,#ff6b00);padding:24px;border-radius:12px;text-align:center;margin-bottom:24px">
                    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900">✉️ DOMATION Campaign</h1>
                    <p style="color:#fff3;margin:8px 0 0;font-size:13px">Template ID: ${templateId}</p>
                </div>
                <p style="color:#334155;font-size:15px;line-height:1.7">Xin chào <strong>{{first_name}}</strong>,</p>
                <p style="color:#64748b;font-size:14px;line-height:1.8">Đây là nội dung mẫu email demo. Trong môi trường thực tế, nội dung template sẽ được render đầy đủ từ Email Builder.</p>
                <div style="text-align:center;margin:32px 0">
                    <a href="#" style="background:#ffa900;color:#fff;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:900;font-size:14px">Xem ngay →</a>
                </div>
                <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0"/>
                <p style="color:#94a3b8;font-size:11px;text-align:center">© 2026 DOMATION · <a href="#" style="color:#94a3b8">Hủy đăng ký</a></p>
            </div>`;
            setTemplatePreviews(prev => ({ ...prev, [templateId]: demoHtml }));
            return;
        }

        setLoadingPreview(true);
        try {
            const response = await fetch(`${API_BASE_URL}/campaign_preview.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: templateId,
                    custom_html: '',
                    content_body: ''
                })
            });
            const data = await response.json();
            if (data.success && data.data?.html) {
                setTemplatePreviews(prev => ({ ...prev, [templateId]: data.data.html }));
            }
        } catch (error) {
            console.error('Failed to fetch template preview:', error);
        } finally {
            setLoadingPreview(false);
        }
    }, [templatePreviews]);

    // Fix: Wrap handlers in useCallback to prevent infinite render loops in LaunchPreview
    const handleConnectFlow = useCallback((connected: boolean) => {
        setConnectFlow(connected);
    }, []);

    const handleScheduleChange = useCallback((date: string | null) => {
        let scheduleError = '';

        // [P0] ZNS Time Window Validation (6 AM - 22 PM)
        if (formData.type === 'zalo_zns') {
            const checkDate = date ? new Date(date) : new Date();
            const hour = checkDate.getHours();
            if (hour < 6 || hour >= 22) {
                scheduleError = `Chiến dịch ZNS chỉ có thể gửi trong khung giờ 06:00 - 22:00. Vui lòng ${!date ? 'lên lịch gửi vào khung giờ này.' : 'chọn giờ gửi khác.'}`;
            }
        }

        if (date && !scheduleError) {
            const selectedTime = new Date(date).getTime();
            const minTime = Date.now() + (5 * 60 * 1000); // NOW + 5 minutes

            if (selectedTime < minTime) {
                const minDateStr = new Date(minTime).toLocaleString('vi-VN');
                scheduleError = `Thời gian gửi phải ít nhất 5 phút sau hiện tại (sau ${minDateStr})`;
            }
        }

        // Apply Errors to block Publish button
        if (scheduleError) {
            setErrors(prev => ({ ...prev, schedule: scheduleError }));
        } else {
            setErrors(prev => {
                const { schedule, ...rest } = prev;
                return rest;
            });
        }

        // Get user's timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setFormData(prev => ({
            ...prev,
            scheduledAt: date || undefined,
            timezone: timezone || 'Asia/Ho_Chi_Minh'
        }));
    }, [formData.type]);

    const handleActivateFlow = useCallback((flowId: string, activate: boolean) => {
        setActivateFlowId(activate ? flowId : null);
    }, []);

    const handleAttachmentsChange = useCallback((att: any[]) => {
        setFormData(prev => ({ ...prev, attachments: att }));
    }, []);

    const steps = [
        { id: 1, name: 'Cài đặt', icon: Settings2 },
        { id: 2, name: 'Nội dung', icon: Mail },
        { id: 3, name: 'Đối tượng', icon: Users },
        { id: 4, name: 'Nhắc nhở', icon: BellRing },
        { id: 5, name: 'Preview', icon: CheckCircle2 },
    ];

    if (!isVisible) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[150] flex justify-end">
                <div
                    className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${animateWizardIn ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleIntentClose}
                />
                <div className={`relative w-full lg:max-w-[1400px] bg-[#fdfdfd] shadow-2xl h-full flex flex-col border-l border-slate-100 transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${animateWizardIn ? 'translate-x-0 opacity-100' : 'translate-x-full lg:translate-x-[100px] opacity-0'}`}>
                    <div className="px-4 lg:px-8 py-4 lg:py-5 bg-white flex justify-between items-center shrink-0 border-b border-slate-100">
                        <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0 mr-4">
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-[#ffa900] rounded-xl flex items-center justify-center shadow-md text-white shrink-0"><Wand2 className="w-5 h-5" /></div>
                            <div className="min-w-0"><h3 className="text-sm lg:text-lg font-bold text-slate-800 truncate">{formData.name || 'Chiến dịch mới'}</h3><p className="text-[9px] lg:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Bước {step} / 5</p></div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            {steps.map(s => {
                                const active = step === s.id;
                                const done = step > s.id;
                                return (
                                    <div key={s.id} onClick={() => handleStepClick(s.id)} className={`flex items-center group ${done || active ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${active ? 'bg-[#ffa900] shadow-lg scale-110' : (done ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-100 text-slate-400')}`}>
                                            {done ? <Check className="w-4 h-4 text-white" /> : <s.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />}
                                        </div>
                                        {s.id < steps.length && <div className={`w-6 h-0.5 mx-2 transition-all ${done ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>}
                                    </div>
                            );
                            })}
                        </div>
                        <button onClick={handleIntentClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar bg-[#f8fafc]">
                        {step === 1 && (
                            <TabTransition className="space-y-6 max-w-4xl mx-auto py-4">
                                <div className="text-center mb-6 lg:mb-8">
                                    <h4 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">Cấu hình chiến dịch</h4>
                                    <p className="text-slate-500 text-xs lg:text-sm mt-2 font-medium">Chọn phương thức tiếp cận tối ưu nhất để bứt phá doanh số.</p>
                                    <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Server bảo mật</span>
                                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-[#ffa900]" /> Gửi tức thì</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        onClick={() => setFormData({ ...formData, type: 'email' })}
                                        className={`group relative p-8 rounded-[32px] border-2 text-left transition-all duration-500 overflow-hidden ${(!formData.type || formData.type === 'email') ? 'border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg'}`}
                                    >
                                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] transition-all duration-700 ${(!formData.type || formData.type === 'email') ? 'bg-blue-600/10' : 'bg-slate-50 opacity-0 group-hover:opacity-100'}`}></div>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${(!formData.type || formData.type === 'email') ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                                            <Mail className="w-7 h-7" />
                                        </div>
                                        <h5 className={`text-xl font-black mb-2 transition-colors ${(!formData.type || formData.type === 'email') ? 'text-blue-900' : 'text-slate-800'}`}>Campaign Marketing</h5>
                                        <p className={`text-sm font-medium leading-relaxed ${(!formData.type || formData.type === 'email') ? 'text-blue-700/80' : 'text-slate-500'}`}>
                                            Gửi email hàng loạt với giao diện kéo thả trực quan, tỷ lệ vào inbox cao và Báo cáo chi tiết.
                                        </p>
                                        <div className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${(!formData.type || formData.type === 'email') ? 'text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                            <span>Chọn phương thức này</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, type: 'zalo_zns' })}
                                        className={`group relative p-8 rounded-[32px] border-2 text-left transition-all duration-500 overflow-hidden ${formData.type === 'zalo_zns' ? 'border-[#0068ff] bg-blue-50/50 shadow-xl shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg'}`}
                                    >
                                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] transition-all duration-700 ${formData.type === 'zalo_zns' ? 'bg-[#0068ff]/10' : 'bg-slate-50 opacity-0 group-hover:opacity-100'}`}></div>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${formData.type === 'zalo_zns' ? 'bg-[#0068ff] text-white shadow-lg shadow-blue-200 scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <h5 className={`text-xl font-black mb-2 transition-colors ${formData.type === 'zalo_zns' ? 'text-[#0068ff]' : 'text-slate-800'}`}>Zalo ZNS</h5>
                                        <p className={`text-sm font-medium leading-relaxed ${formData.type === 'zalo_zns' ? 'text-blue-700/80' : 'text-slate-500'}`}>
                                            Gửi thông báo tin nhắn OA trực tiếp đến số điện thoại. Tăng tỷ lệ đọc tin và tương tác lập tức.
                                        </p>
                                        <div className={`mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${formData.type === 'zalo_zns' ? 'text-[#0068ff]' : 'text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                            <span>Chọn phương thức này</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </div>
                                    </button>
                                </div>


                                <div className="bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm space-y-6 mt-6">
                                    <div className="space-y-4">
                                        <Input
                                            label="Tên chiến dịch (Nội bộ)"
                                            required
                                            placeholder="VD: Khuyến mãi Black Friday 2024"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            error={attemptedNext && !formData.name?.trim() ? 'Vui lòng nhập tên' : ''}
                                            maxLength={100}
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3 text-blue-500" />
                                            Mẹo: Đặt tên theo cú pháp [Tháng] - [Sự kiện] để dễ dàng quản lý và báo cáo sau này.
                                        </p>
                                    </div>

                                    {(!formData.type || formData.type === 'email') && (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            <label className="text-[11px] font-bold uppercase text-slate-500 ml-1 tracking-widest">Người gửi (Sender) <span className="text-rose-500">*</span></label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {senderEmails.map((email, index) => (
                                                    <button key={email} onClick={() => setFormData({ ...formData, senderEmail: email })} className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${formData.senderEmail === email ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-200' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <ShieldCheck className={`w-4 h-4 ${formData.senderEmail === email ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                            <span className={`text-xs font-bold truncate flex items-center ${formData.senderEmail === email ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                                {email}
                                                                {index === 0 && <span className="ml-2 text-[9px] text-blue-600 font-bold uppercase tracking-widest bg-blue-100/80 border border-blue-200/50 px-2 py-0.5 rounded-full shrink-0 mt-0.5">Mặc định</span>}
                                                            </span>
                                                        </div>
                                                        {formData.senderEmail === email && <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white"><Check className="w-3 h-3" /></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabTransition>
                        )}

                        {step === 2 && formData.type === 'zalo_zns' && (
                            <TabTransition className="space-y-8 max-w-7xl mx-auto h-[calc(100vh-200px)]">
                                <div className="text-center mb-2"><h4 className="text-2xl font-bold text-slate-800 tracking-tight">Cấu hình Nội dung ZNS</h4></div>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full pb-10">
                                    {/* Left Column: Configuration - WIDENED TO 5/12 */}
                                    <div className="lg:col-span-5 space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-5">
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tài khoản Zalo OA</label>
                                                    <CustomSelect
                                                        value={formData.config?.oa_config_id || ''}
                                                        options={znsOAs.map(oa => ({
                                                            value: oa.id,
                                                            label: oa.name,
                                                            subLabel: `ID: ${oa.oa_id}`,
                                                            icon: oa.avatar ? <img src={oa.avatar} className="w-6 h-6 rounded-full object-cover border border-slate-200" /> : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">{oa.name.charAt(0)}</div>
                                                        }))}
                                                        onChange={val => setFormData({ ...formData, config: { ...formData.config, oa_config_id: val } })}
                                                        placeholder="Chọn tài khoản OA"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mẫu tin nhắn (Template)</label>
                                                    {loadingZns ? (
                                                        <div className="w-full h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                                                    ) : (
                                                        <CustomSelect
                                                            value={formData.templateId || ''}
                                                            options={znsTemplates.map(t => ({
                                                                value: t.template_id,
                                                                label: t.template_name,
                                                                subLabel: `ID: ${t.template_id} • ${t.status === 'approved' ? 'Sẵn sàng' : 'Chờ duyệt'}`
                                                            }))}
                                                            onChange={handleZnsTemplateChange}
                                                            placeholder="Chọn mẫu ZNS..."
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.templateId && (() => {
                                            const t = znsTemplates.find(x => x.template_id === formData.templateId);
                                            const znsPrice = t?.template_data?.detail?.price || t?.template_data?.raw?.price || 300;

                                            return (
                                                <>
                                                    {/* REACH & COST ESTIMATION CARD - MOVED UP */}
                                                    <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl space-y-4 text-white relative overflow-hidden animate-in slide-in-from-left-2 duration-300">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 relative z-10">
                                                            <Sparkles className="w-3 h-3 text-[#ffa900]" /> Ước tính gửi ZNS
                                                        </h5>
                                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Liên hệ dự kiến</p>
                                                                <p className="text-xl font-black text-white">{((formData.target?.listIds?.length || 0) + (formData.target?.segmentIds?.length || 0) + (formData.target?.tagIds?.length || 0)) > 0 ? "Theo Audience" : "Sẽ tính ở B3"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Tạm tính chi phí</p>
                                                                <p className="text-xl font-black text-blue-400">~ {znsPrice}<span className="text-[10px] ml-0.5 text-blue-300 font-bold">đ/tin</span></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CSV HELP CARD - MOVED UP */}
                                                    <div className="bg-white p-6 rounded-[32px] border-2 border-dashed border-slate-200 space-y-4 animate-in slide-in-from-left-2 duration-300 delay-75">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><FileText className="w-5 h-5" /></div>
                                                            <div>
                                                                <h5 className="text-xs font-bold text-slate-800">Dữ liệu liên hệ</h5>
                                                                <p className="text-[10px] text-slate-400 font-medium">Chuẩn bị danh sách gửi tin</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    const headers = ['phone', 'fullname', 'email', 'tags'];
                                                                    const csvContent = [headers, ['0912345678', 'Van A', 'a@example.com', 'Tag1']].map(e => e.join(",")).join("\n");
                                                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                                    const url = URL.createObjectURL(blob);
                                                                    const link = document.createElement("a");
                                                                    link.href = url;
                                                                    link.download = "sample_contacts_zns.csv";
                                                                    link.click();
                                                                }}
                                                                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold transition-all border border-slate-200"
                                                            >
                                                                <Download className="w-3.5 h-3.5" /> Mẫu CSV
                                                            </button>
                                                            <button
                                                                onClick={() => setStep(3)}
                                                                className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-bold transition-all border border-blue-100"
                                                            >
                                                                <Upload className="w-3.5 h-3.5" /> Tải lên CSV
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 italic text-center leading-tight">Bạn có thể tải lên CSV ở Bước 3 (Đối tượng) để tự động khớp các tham số trên.</p>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6 animate-in slide-in-from-left-2 duration-300 delay-150">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tham số nội dung</label>
                                                            <div className="p-1 px-2 bg-blue-50 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-tighter">Unified Input</div>
                                                        </div>

                                                        <div className="space-y-5">
                                                            {(() => {
                                                                const params = Array.isArray(t?.preview_data) ? t.preview_data : [];

                                                                if (!params.length) return <p className="text-xs text-slate-400 italic text-center py-4">Mẫu này không có tham số cần điền.</p>;

                                                                return params.map((p: any) => (
                                                                    <div key={p.name} className="space-y-2 group">
                                                                        <div className="flex justify-between items-center px-1">
                                                                            <span className="text-[11px] font-bold text-slate-600">{p.name}</span>
                                                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{p.type}</span>
                                                                        </div>

                                                                        <div className="relative">
                                                                            <input
                                                                                type="text"
                                                                                className="w-full text-xs p-3 pr-10 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                                                                                placeholder={`Nhập giá trị hoặc chọn biến...`}
                                                                                value={formData.config?.mapped_params?.[p.name] || ''}
                                                                                onChange={e => {
                                                                                    const newMap = { ...(formData.config?.mapped_params || {}) };
                                                                                    newMap[p.name] = e.target.value;
                                                                                    setFormData({ ...formData, config: { ...formData.config, mapped_params: newMap } });
                                                                                }}
                                                                            />
                                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                                <VariablePicker
                                                                                    onSelect={(val) => {
                                                                                        const newMap = { ...(formData.config?.mapped_params || {}) };
                                                                                        newMap[p.name] = val;
                                                                                        setFormData({ ...formData, config: { ...formData.config, mapped_params: newMap } });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-400 font-medium px-1 italic">Tự nhập chữ hoặc click vào biểu tượng <Braces className="inline w-2 h-2" /> để chọn biến cá nhân hóa.</p>
                                                                    </div>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>


                                    {/* Right Column: Phone Simulator Preview - SIMPLIFIED STYLE (Matching Step 5) */}
                                    <div className="lg:col-span-7 flex justify-center items-center bg-slate-100 rounded-[40px] border border-slate-200 relative overflow-hidden group py-10">
                                        {formData.templateId ? (
                                            <div className="relative z-10 scale-[0.85] origin-center transform transition-all duration-700 animate-in zoom-in-95">
                                                {/* Simple Modern Frame (Same as Step 5) */}
                                                <div className="w-[375px] h-[750px] bg-white shadow-[0_50px_100px_-20px_rgba(50,50,93,0.3),0_30px_60px_-30px_rgba(0,0,0,0.5)] rounded-[48px] border-8 border-slate-800 relative overflow-hidden flex flex-col">
                                                    {/* Notch Area */}
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-800 rounded-b-xl z-40"></div>

                                                    {/* Screen Content */}
                                                    <div className="w-full h-full bg-[#f8f9fa] relative flex flex-col pt-8">
                                                        {(() => {
                                                            const t = znsTemplates.find(x => x.template_id === formData.templateId);
                                                            const previewUrl = t?.template_data?.detail?.previewUrl || t?.template_data?.raw?.previewUrl;

                                                            if (loadingDetail) {
                                                                return (
                                                                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                                                                        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Rendering UI...</p>
                                                                    </div>
                                                                )
                                                            }

                                                            if (previewUrl) {
                                                                return (
                                                                    <div className="w-full h-full animate-in fade-in duration-1000">
                                                                        <iframe
                                                                            src={previewUrl}
                                                                            title="ZNS Preview"
                                                                            className="w-full h-full border-0 bg-white"
                                                                            sandbox="allow-scripts allow-same-origin"
                                                                        />
                                                                    </div>
                                                                )
                                                            } else {
                                                                return (
                                                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                                                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2 shadow-inner"><Smartphone className="w-10 h-10 text-slate-300" /></div>
                                                                        <h5 className="font-black text-xl text-slate-800">Preview Unavailable</h5>
                                                                        <p className="text-sm font-medium text-slate-500">Mẫu này chưa có URL preview từ Zalo hoặc đang được xử lý.</p>
                                                                        <button onClick={() => fetchTemplateDetail(t?.id)} className="px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-black transition-all">Làm mới bản xem trước</button>
                                                                    </div>
                                                                )
                                                            }
                                                        })()}

                                                        {/* Home Indicator */}
                                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full z-30 opacity-10"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                                                <div className="w-28 h-28 bg-white rounded-[40px] shadow-2xl flex items-center justify-center mx-auto ring-1 ring-slate-100"><Zap className="w-14 h-14 text-blue-500 animate-pulse" /></div>
                                                <div>
                                                    <p className="text-slate-800 text-xl font-black">Chưa chọn mẫu tin</p>
                                                    <p className="text-slate-400 text-sm font-medium mt-2">Chọn mẫu ZNS ở cột trái để xem trước trên thiết bị</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Abstract Background Decor */}
                                        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                                        <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-[#fbbf24]/20 rounded-full blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                                    </div>
                                </div>
                            </TabTransition>
                        )}

                        {step === 2 && (!formData.type || formData.type === 'email') && (
                            <TabTransition className="space-y-8 max-w-5xl mx-auto">
                                <div className="text-center"><h4 className="text-2xl font-bold text-slate-800 tracking-tight">Nội dung Email</h4></div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-6">
                                        <div className="relative">
                                            <Input
                                                label="Tiêu đề hiển thị (Subject)"
                                                required
                                                placeholder="Món quà đặc biệt dành riêng cho bạn!"
                                                value={formData.subject}
                                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                maxLength={100}
                                                error={errors.subject || (attemptedNext && !formData.subject?.trim() ? 'Vui lòng nhập tiêu đề' : '')}
                                            />
                                            <div className="absolute right-3 top-[27px]">
                                                <VariablePicker
                                                    onSelect={(val) => {
                                                        const current = formData.subject || '';
                                                        setFormData({ ...formData, subject: current + val });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs mt-1.5 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium transition-colors ${(formData.subject?.length || 0) > 60 ? 'text-orange-600' : 'text-slate-400'}`}>
                                                        {formData.subject?.length || 0}/100 ký tự
                                                    </span>
                                                    <span className="text-slate-200">|</span>
                                                    <p className="text-[10px] text-slate-400 hidden sm:block italic">Gợi ý: Dùng {MERGE_TAGS[1].value} để cá nhân hóa tên khách hàng ngay tại tiêu đề.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest">Loại nội dung</label>
                                            </div>
                                            <div className="flex gap-3 max-w-sm">
                                                <button
                                                    onClick={() => setFormData({ ...formData, templateId: '' })}
                                                    className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${formData.templateId !== 'custom-html' ? 'border-[#ffa900] bg-orange-50 text-orange-600 shadow-sm ring-2 ring-orange-100' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase">Chọn mẫu</span>
                                                </button>
                                                <button
                                                    onClick={() => setFormData({ ...formData, templateId: 'custom-html' })}
                                                    className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${formData.templateId === 'custom-html' ? 'border-[#ffa900] bg-orange-50 text-orange-600 shadow-sm ring-2 ring-orange-100' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                                                >
                                                    <Code className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase">Mã HTML</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full">
                                        {formData.templateId === 'custom-html' ? (
                                            <div className="bg-slate-900 rounded-[24px] p-6 shadow-2xl border-b-8 border-slate-800 relative overflow-visible flex flex-col h-[600px]">
                                                {/* Existing HTML Editor Logic */}
                                                <div className="flex items-center justify-between mb-4 relative z-20 shrink-0">
                                                    <div className="flex items-center gap-3"><FileCode className="w-5 h-5 text-indigo-400" /><h6 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">HTML Editor Pro</h6></div>
                                                    <div className="flex gap-2">
                                                        <div className="relative">
                                                            <button onClick={() => setShowVarDropdown(!showVarDropdown)} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-white/5"><Braces className="w-3.5 h-3.5 text-[#ffa900]" />Biến động <ChevronDown className="w-3 h-3 opacity-50" /></button>
                                                            {showVarDropdown && (
                                                                <>
                                                                    <div className="fixed inset-0 z-30" onClick={() => setShowVarDropdown(false)}></div>
                                                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 animate-in fade-in zoom-in-95">
                                                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Click để chèn</p></div>
                                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                                            {MERGE_TAGS.map((tag) => (
                                                                                <button key={tag.value} onClick={() => insertVariable(tag.value)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors rounded-xl"><span className="text-xs font-bold text-slate-700">{tag.label}</span><code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono group-hover:text-[#ca7900] group-hover:bg-orange-50">{tag.value}</code></button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setIsHtmlPreview(!isHtmlPreview)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2">{isHtmlPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{isHtmlPreview ? 'Sửa Code' : 'Xem trước'}</button>
                                                    </div>
                                                </div>
                                                {isHtmlPreview ? <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden shadow-inner relative z-10"><iframe className="w-full h-full" srcDoc={formData.contentBody} title="Preview" sandbox="allow-scripts allow-same-origin" /></div> : <textarea ref={textAreaRef} value={formData.contentBody} onChange={e => setFormData({ ...formData, contentBody: e.target.value })} className="flex-1 w-full bg-black/50 border border-white/10 rounded-2xl p-6 text-indigo-300 font-mono text-sm focus:border-indigo-500 outline-none transition-all resize-none shadow-inner custom-scrollbar relative z-10" placeholder="<html><body><h1>Nhập mã HTML tại đây...</h1></body></html>" spellCheck={false} />}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                                {/* Left: Template Selector */}
                                                <div className="space-y-4 lg:col-span-5">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest">Chọn mẫu thư</label>
                                                        <span className="text-[10px] font-bold text-blue-500">Mới nhất</span>
                                                    </div>
                                                    <TemplateSelector
                                                        templates={allTemplates}
                                                        selectedId={formData.templateId}
                                                        gridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 p-1 pb-8"
                                                        onSelect={t => {
                                                            setFormData({ ...formData, templateId: t.id, subject: t.name });
                                                            fetchTemplatePreview(t.id);
                                                        }}
                                                    />
                                                </div>

                                                {/* Right: Live Preview */}
                                                <div className="bg-slate-100 rounded-[24px] p-4 border border-slate-200 shadow-sm sticky top-0 h-fit lg:col-span-7">
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between mb-1.5 min-h-[40px]">
                                                            <div className="flex items-center gap-2">
                                                                <Eye className="w-4 h-4 text-orange-500 shrink-0" />
                                                                <h4 className="text-sm font-bold text-slate-700 shrink-0">Preview Email</h4>
                                                            </div>
                                                            {formData.templateId && formData.templateId !== 'custom-html' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveEditTemplateId(formData.templateId || null);
                                                                        setIsEditingTemplate(true);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:text-[#ffa900] hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center gap-1.5 shadow-sm"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa Email
                                                                </button>
                                                            )}
                                                        </div>
                                                        {formData.templateId && (
                                                            <div className="text-[13px] text-slate-600 font-bold bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm leading-snug">
                                                                <span className="text-slate-400 font-normal mr-2">Subject:</span>
                                                                {formData.subject || allTemplates.find(t => t.id === formData.templateId)?.name}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={`rounded-xl overflow-hidden border border-slate-200 bg-white ${attemptedNext && !formData.templateId ? 'ring-2 ring-rose-300' : ''}`}>
                                                        {!formData.templateId ? (
                                                            <div className="h-[600px] flex flex-col items-center justify-center text-slate-400">
                                                                <Layout className="w-12 h-12 mb-3 opacity-30" />
                                                                <p className="text-sm font-medium">Select a template to preview</p>
                                                            </div>
                                                        ) : loadingPreview ? (
                                                            <div className="h-[600px] flex flex-col items-center justify-center">
                                                                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                                                                <p className="text-xs text-slate-500">Loading preview...</p>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-[600px] bg-white relative overflow-hidden">
                                                                <iframe
                                                                    srcDoc={templatePreviews[formData.templateId] || ''}
                                                                    className="absolute top-0 left-0 w-[150%] h-[150%] border-none origin-top-left"
                                                                    style={{ transform: 'scale(0.666666)' }}
                                                                    title="Template Preview"
                                                                    sandbox="allow-same-origin"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabTransition>
                        )}

                        {step === 3 && (
                            <TabTransition className="space-y-6 max-w-5xl mx-auto">
                                <div className="text-center mb-6">
                                    <h4 className="text-2xl font-bold text-slate-800 tracking-tight">Đối tượng mục tiêu</h4>
                                    <p className="text-slate-400 text-xs mt-1 font-medium italic">Việc chọn đúng tệp khách hàng giúp tăng 50% hiệu quả chuyển đổi.</p>
                                </div>
                                <AudienceSelector
                                    allLists={allLists}
                                    allSegments={allSegments}
                                    allTags={allTags}
                                    selectedTarget={formData.target as any}
                                    onTargetChange={t => setFormData({ ...formData, target: { ...formData.target!, ...t } })}
                                    // Fix: Pass existingEmails and onImport
                                    existingEmails={new Set(allSubscribers.map(s => s.email))}
                                    onImport={handleQuickImport} // This is the new handleQuickImport which uses onImport's signature
                                    campaignType={formData.type}
                                    error={!!errors.target}
                                />
                            </TabTransition>
                        )}
                        {step === 4 && (
                            <TabTransition className="space-y-6 max-w-4xl mx-auto">
                                <div className="text-center mb-6"><h4 className="text-2xl font-bold text-slate-800 tracking-tight">Kịch bản Nhắc nhở</h4></div>
                                <ReminderManager
                                    reminders={formData.reminders || []}
                                    templates={allTemplates}
                                    onChange={r => setFormData({ ...formData, reminders: r })}
                                    mainSubject={formData.subject || ''}
                                    isZns={formData.type === 'zalo_zns'}
                                    mainTemplateId={formData.templateId || ''}
                                    templatePreviews={templatePreviews}
                                    onEditTemplate={(tid) => {
                                        setActiveEditTemplateId(tid);
                                        setIsEditingTemplate(true);
                                    }}
                                    onFetchPreview={fetchTemplatePreview}
                                />
                            </TabTransition>
                        )}
                        {step === 5 && (
                            <TabTransition>
                                <LaunchPreview
                                    formData={formData}
                                    allLists={allLists}
                                    allSegments={allSegments}
                                    allTags={allTags}
                                    allTemplates={allTemplates}
                                    znsTemplates={znsTemplates}
                                    allFlows={allFlows}
                                    activateFlowId={activateFlowId}
                                    initialConnectFlow={connectFlow}
                                    onTestEmail={handleTestEmail}
                                    onConnectFlow={handleConnectFlow}
                                    onScheduleChange={handleScheduleChange}
                                    onActivateFlow={handleActivateFlow}
                                    onAttachmentsChange={handleAttachmentsChange}
                                />
                            </TabTransition>
                        )}
                    </div>

                    {/* STEP NAVIGATION FOOTER */}
                    <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                        <Button
                            variant="ghost"
                            onClick={step === 1 ? handleIntentClose : () => setStep(step - 1)}
                            className="text-slate-500 font-bold"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            {step === 1 ? 'HỦY BỎ' : 'QUAY LẠI'}
                        </Button>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => !isSubmitting && onSaveDraft(formData)}
                                disabled={isSubmitting}
                                className="text-slate-500 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200 px-6 font-bold hidden sm:flex items-center gap-2 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} LƯU NHÁP
                            </Button>

                            {step < 5 ? (
                                <Button
                                    onClick={handleNext}
                                    className="bg-gradient-to-r from-[#ffa900] to-[#ff8a00] text-white px-8 py-3 rounded-xl shadow-lg shadow-orange-200 hover:scale-105 transition-all font-bold group"
                                >
                                    TIẾP TỤC
                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={async () => {
                                        if (canSend) {
                                            handlePublishClick();
                                        } else {
                                            if (publishLockRef.current) return;
                                            setIsSubmitting(true);
                                            try {
                                                const savedPayload = await onSaveDraft({ ...formData, status: 'pending_approval' } as any);
                                                // [FIX P13-C1] Replace hardcoded fetch('/api/approvals.php') with api.post().
                                                // Old code used a hardcoded /api/ path — fails in production where API is
                                                // at https://automation.ideas.edu.vn/mail_api (different origin/path).
                                                // Also was not awaited and had no catch → approval request silently failed.
                                                if (savedPayload) {
                                                    try {
                                                        await api.post<{ success: boolean }>('approvals?action=request', {
                                                            target_type: 'campaign',
                                                            target_id: savedPayload.id || formData.id
                                                        });
                                                    } catch (approvalErr) {
                                                        toast.error('Không thể gửi yêu cầu phê duyệt. Vui lòng thử lại.');
                                                    }
                                                }
                                                onClose();
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }
                                    }}
                                    disabled={isSubmitting || !!errors.schedule}
                                    className={`${canSend ? 'bg-slate-900 hover:bg-black' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-10 py-3 rounded-xl shadow-xl hover:scale-105 transition-all font-black flex items-center gap-2`}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> ĐANG XỬ LÝ...</>
                                    ) : (
                                        canSend
                                            ? (formData.scheduledAt ? 'LÊN LỊCH GỬI' : 'GỬI CHIẾN DỊCH NGAY')
                                            : <><UserCheck className="w-4 h-4" /> YÊU CẦU DUYỆT</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* PRE-LAUNCH NURTURE OFFER MODAL (GLASSMORPHISM) */}
                {showNurtureOffer && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowNurtureOffer(false); setShowFlowSelectModal(false); }} />
                        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full transform transition-all border border-slate-200/60 animate-in zoom-in-95 duration-500">
                            {showFlowSelectModal ? (
                                <div className="p-8 pb-6 flex flex-col gap-3 bg-white animate-in slide-in-from-right-4 duration-300">
                                    <button
                                        onClick={() => { setShowNurtureOffer(false); setShowFlowSelectModal(false); }}
                                        className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-full transition-all z-10"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <h4 className="text-xl font-black text-slate-900 mb-1">Chọn kịch bản kết nối</h4>
                                    <p className="text-sm font-medium text-slate-500 mb-4">Các lượt tham gia mới vào chiến dịch này sẽ tự động Kích hoạt Automation.</p>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {allFlows.filter(f => {
                                            const trigger = f.steps?.find(s => s.type === 'trigger');
                                            return trigger?.config?.type === 'campaign' && !trigger.config.targetId;
                                        }).length > 0 ? allFlows.filter(f => {
                                            const trigger = f.steps?.find(s => s.type === 'trigger');
                                            return trigger?.config?.type === 'campaign' && !trigger.config.targetId;
                                        }).map((flow) => (
                                            <button
                                                key={flow.id}
                                                onClick={() => {
                                                    handleActivateFlow(flow.id, true);
                                                    setConnectFlow(true);
                                                    setShowFlowSelectModal(false);
                                                    setShowNurtureOffer(false);
                                                    setStep(5);
                                                    toast.success(`Đã kết nối Automation: ${flow.name}`);
                                                }}
                                                className="w-full p-4 rounded-xl border border-slate-200 text-left flex items-center justify-between transition-all bg-white hover:border-indigo-300 hover:bg-indigo-50 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
                                                        <GitMerge className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate" title={flow.name}>{flow.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Kịch bản chăm sóc sẵn có</p>
                                                    </div>
                                                </div>
                                            </button>
                                        )) : null}

                                        <button
                                            disabled={isSubmitting}
                                            onClick={async () => {
                                                if (publishLockRef.current) return;
                                                setIsSubmitting(true);
                                                try {
                                                    const saved = await onSaveDraft(formData);
                                                    if (saved) {
                                                        setShowFlowSelectModal(false);
                                                        setShowNurtureOffer(false);
                                                        onClose();
                                                        navigate('/flows');
                                                        toast.success("Đã lưu Campaign. Vui lòng tạo kịch bản Flow mới!");
                                                    }
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                            className="w-full p-4 rounded-xl border-2 border-indigo-500 bg-white ring-2 ring-indigo-50 shadow-sm text-left flex items-center justify-between transition-all group hover:bg-indigo-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Lưu Campaign & Tạo luồng mới</p>
                                                    <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Chuyển sang Flow Builder</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="mt-2 pt-4 border-t border-slate-100 flex justify-center">
                                        <button onClick={() => setShowFlowSelectModal(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest transition-colors flex items-center gap-2">
                                            ← Quay lại Modal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Header - Sleek Indigo/Blue */}
                                    <div className="bg-gradient-to-b from-indigo-50 to-white p-8 pb-6 border-b border-indigo-100/50">
                                        <button
                                            onClick={() => { setShowNurtureOffer(false); setShowFlowSelectModal(false); }}
                                            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-full transition-all z-10"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 text-indigo-600 shadow-inner">
                                            <GitMerge className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 leading-snug">
                                            Kết nối Automation để<br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">tăng 35% tỉ lệ chuyển đổi</span>
                                        </h3>
                                        <p className="text-sm font-medium text-slate-600 mt-3 leading-relaxed">
                                            Đừng để khách hàng rơi vào quên lãng. Bằng cách kết nối kịch bản chăm sóc, hệ thống sẽ tự động bám đuổi những người chưa mở thư hoặc click link.
                                        </p>
                                    </div>

                                    {/* Features List */}
                                    <div className="px-8 py-6 space-y-3 bg-slate-50/50">
                                        {[
                                            { icon: Zap, label: 'Tự động gửi lại email nhắc nhở nếu chưa mở thư', color: 'text-amber-500', bg: 'bg-amber-100' },
                                            { icon: FileText, label: 'Kích hoạt kịch bản tặng quà khi khách click link', color: 'text-emerald-500', bg: 'bg-emerald-100' },
                                            { icon: Target, label: 'Phân loại khách hàng tiềm năng dựa trên hành vi', color: 'text-blue-500', bg: 'bg-blue-100' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                                                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <p className="text-[13px] font-bold text-slate-700">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    {/* [SMART-HINT] If campaign already has reminders or selected flow has ≤2 steps → suggest Reminder instead */}
                                    {(() => {
                                        const hasExistingReminders = (formData.reminders?.length ?? 0) > 0;
                                        const selectedFlow = allFlows.find(f => f.id === activateFlowId);
                                        const selectedFlowSteps = selectedFlow?.steps?.length ?? selectedFlow?.step_count ?? 0;
                                        const isSimpleFlow = activateFlowId && selectedFlowSteps <= 2;
                                        if (!hasExistingReminders && !isSimpleFlow) return null;
                                        return (
                                            <div className="mx-8 mb-0 mt-0 p-4 rounded-2xl bg-orange-50 border border-orange-200 flex gap-3 items-start animate-in slide-in-from-bottom-2 duration-300">
                                                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                                                    <BellRing className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-orange-800">
                                                        {hasExistingReminders
                                                            ? `Bạn đã có ${formData.reminders?.length} Reminder đã cấu hình!`
                                                            : `Flow "${selectedFlow?.name}" chỉ có 1 email!`
                                                        }
                                                    </p>
                                                    <p className="text-[10px] text-orange-600 font-medium mt-0.5 leading-snug">
                                                        {hasExistingReminders
                                                            ? 'Reminder nhắc nhở tự động tốc độ cao hơn Flow. Bạn có thể bỏ qua và gửi ngay!'
                                                            : 'Với chỉ 1 email chăm sóc, dùng Campaign + Reminder nhanh hơn là tạo Flow phức tạp.'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="p-8 pt-6 flex flex-col gap-3 bg-white">
                                        <button
                                            disabled={isSubmitting}
                                            onClick={() => {
                                                setShowFlowSelectModal(true);
                                            }}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:-translate-y-0.5"
                                        >
                                            <GitMerge className="w-5 h-5" />
                                            KẾT NỐI DOMATION
                                        </button>

                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            <button
                                                disabled={isSubmitting}
                                                onClick={async () => {
                                                    if (publishLockRef.current) return;
                                                    setIsSubmitting(true);
                                                    try {
                                                        await onSaveDraft(formData);
                                                        setShowNurtureOffer(false);
                                                        setShowFlowSelectModal(false);
                                                        onClose();
                                                    } finally {
                                                        setIsSubmitting(false);
                                                    }
                                                }}
                                                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                Lưu nháp
                                            </button>
                                            <button
                                                disabled={isSubmitting}
                                                onClick={() => {
                                                    if (canSend) {
                                                        handlePublishClick();
                                                    } else {
                                                        // Request approval logic
                                                    }
                                                }}
                                                className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (canSend ? <Send className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />)}
                                                {isSubmitting ? 'Đang gửi...' : (canSend ? 'Bỏ qua & Gửi ngay' : 'Bỏ qua & Yêu Cầu Duyệt')}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <TestEmailModal
                isOpen={isTestEmailModalOpen}
                onClose={() => setIsTestEmailModalOpen(false)}
                campaignId={testEmailCampaignId || formData.id || ''}
                campaignName={formData.name || ''}
                campaignType={formData.type}
            />
            {/* AI Email Editor Modal (Quick edit) */}
            {isEditingTemplate && activeEditTemplateId && (
                <EmailEditor
                    template={allTemplates.find(t => t.id === activeEditTemplateId)!}
                    groups={[]}
                    onSave={async (data) => {
                        if (activeEditTemplateId.startsWith('sys_')) {
                            toast.error('Lỗi: Bạn không thể sửa mẫu mặc định của hệ thống.');
                            return;
                        }
                        const res = await api.put(`templates/${activeEditTemplateId}`, { ...allTemplates.find(t => t.id === activeEditTemplateId), ...data, lastModified: new Date().toISOString() });
                        if (res.success) {
                            toast.success('Đã lưu mẫu!');
                            setIsEditingTemplate(false);
                            setActiveEditTemplateId(null);
                            // Update preview
                            const detail = await api.get<Template>(`templates?id=${activeEditTemplateId}`);
                            if (detail.success && detail.data) {
                                setTemplatePreviews(prev => ({ ...prev, [activeEditTemplateId]: detail.data!.htmlContent }));
                            }
                        } else {
                            toast.error('Lỗi lưu mẫu: ' + (res.message || 'Không rõ lý do'));
                        }
                    }}
                    onCancel={() => {
                        setIsEditingTemplate(false);
                        setActiveEditTemplateId(null);
                    }}
                />
            )}
            {/* Confirm modal when closing wizard with unsaved changes */}
            {showCloseConfirm && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCloseConfirm(false)}/>
                    <div className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCloseConfirm(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Chưa lưu chiến dịch</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">Bạn có muốn lưu thành bản nháp trước khi thoát không?</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    setIsSubmitting(true);
                                    try {
                                        await onSaveDraft(formData);
                                        setShowCloseConfirm(false);
                                        onClose();
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className="w-full py-3 bg-[#ffa900] hover:bg-[#ca7900] text-white rounded-xl font-bold transition-colors"
                            >
                                Lưu thành Bản nháp
                            </button>
                            <button
                                onClick={() => {
                                    setShowCloseConfirm(false);
                                    onClose();
                                }}
                                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                            >
                                Bỏ qua & Thoát
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};

export default React.memo(CampaignWizard);