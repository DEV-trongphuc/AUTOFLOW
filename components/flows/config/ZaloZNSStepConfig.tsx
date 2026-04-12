import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, FileText, AlertCircle, ChevronDown, Check, UploadCloud, FileSpreadsheet, Send, HelpCircle, Eye, RefreshCw, X, Download, Clock, Zap, ShieldAlert, BadgeCheck, Braces, Calendar, User, ChevronRight, Search } from 'lucide-react';
import { api } from '../../../services/storageAdapter';

interface ZaloOA {
    id: string;
    name: string;
    status: string;
}

interface ZaloTemplate {
    id: string;
    template_id: string;
    template_name: string;
    template_type: string;
    status: string;
    preview_data?: any[]; // Array of params from Zalo
    template_data?: {
        detail?: {
            previewUrl?: string;
        };
        support_uid?: boolean;
        price_uid?: number | string;
        price?: number | string;
    };
}

interface ZaloZNSStepConfigProps {
    config: any;
    onChange: (config: any) => void;
    disabled?: boolean;
    flow?: any;
    onUpdateFlow?: (updates: any) => void;
}

interface Option {
    value: string;
    label: string;
    subLabel?: string;
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
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const calculatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = Math.min(options.length * 56 + 8, 240);

        // Open upward if not enough space below
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            setDropdownStyle({
                position: 'fixed',
                top: rect.top - dropdownHeight - 4,
                left: rect.left,
                width: rect.width,
                zIndex: 999999,
            });
        } else {
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 999999,
            });
        }
    }, [options.length]);

    const handleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            calculatePosition();
        }
        setIsOpen(v => !v);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClose = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => { calculatePosition(); };
        document.addEventListener('mousedown', handleClose);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', calculatePosition);
        return () => {
            document.removeEventListener('mousedown', handleClose);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isOpen, calculatePosition]);

    const dropdown = isOpen ? (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100"
        >
            {options.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                    Kh�ng c� d? li?u
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
                        className={`w-full px-4 py-3 flex items-start text-left hover:bg-blue-50 transition-colors group ${option.value === value ? 'bg-blue-50/50' : ''}`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${option.value === value ? 'text-blue-700' : 'text-slate-700'}`}>
                                {option.label}
                            </p>
                            {option.subLabel && (
                                <p className="text-xs text-slate-400 mt-0.5 truncate group-hover:text-blue-400">
                                    {option.subLabel}
                                </p>
                            )}
                        </div>
                        {option.value === value && (
                            <Check className="w-4 h-4 text-blue-600 mt-0.5 ml-2 shrink-0" />
                        )}
                    </button>
                ))
            )}
        </div>
    ) : null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className={`w-full px-4 py-3 flex items-center justify-between bg-white border-2 rounded-xl text-sm font-medium transition-all ${isOpen
                    ? 'border-blue-500 ring-4 ring-blue-500/10'
                    : 'border-slate-200 hover:border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <span className={`block truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
        </div>
    );
};

const ZaloZNSStepConfig: React.FC<ZaloZNSStepConfigProps> = ({ config, onChange, disabled, flow, onUpdateFlow }) => {
    const [oas, setOas] = useState<ZaloOA[]>([]);
    const [templates, setTemplates] = useState<ZaloTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvStats, setCsvStats] = useState<{
        totalRows: number;
        validRows: number;
        missingRequired: string[];
    } | null>(null);

    // Variable picker state
    const [varPickerField, setVarPickerField] = useState<string | null>(null);
    const [varPickerSearch, setVarPickerSearch] = useState('');
    const [pickerButtonRect, setPickerButtonRect] = useState<DOMRect | null>(null);
    const [customFields, setCustomFields] = useState<{ key: string; label: string }[]>([]);
    const varPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOAs();
        fetchCustomFields();
    }, []);

    useEffect(() => {
        if (config.zalo_oa_id) {
            fetchTemplates(config.zalo_oa_id);
        }
    }, [config.zalo_oa_id]);

    useEffect(() => {
        if (config.template_id && templates.length > 0) {
            const selected = templates.find(t => t.template_id === config.template_id);
            if (selected && !selected.template_data?.detail?.previewUrl) {
                fetchTemplateDetail(selected.id);
            }

            // Sync required_params for validation
            if (selected) {
                const requiredParams = selected.preview_data?.filter((p: any) => p.require).map((p: any) => p.name) || [];
                const currentRequired = config.required_params || [];
                const isDifferent = JSON.stringify(requiredParams.sort()) !== JSON.stringify(currentRequired.sort());

                if (isDifferent) {
                    onChange({
                        ...config,
                        required_params: requiredParams
                    });
                }
            }
        }
    }, [config.template_id, templates]);

    const fetchOAs = async () => {
        setLoading(true);
        const res = await api.get<ZaloOA[]>('zalo_oa');
        if (res.success) {
            setOas(res.data.filter((oa: ZaloOA) => oa.status === 'active'));
        }
        setLoading(false);
    };

    const fetchCustomFields = async () => {
        try {
            // Fetch custom attribute keys from subscribers - take a sample to find keys
            const res = await api.get<any>('subscribers?limit=1&fields=custom_attributes');
            if (res.success && res.data?.length > 0) {
                const sample = res.data[0].custom_attributes;
                const attrs = typeof sample === 'string' ? JSON.parse(sample || '{}') : (sample || {});
                const fields = Object.keys(attrs).map(k => ({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
                setCustomFields(fields);
            }
        } catch (e) {
            // Ignore if endpoint doesn't support
        }
    };

    const fetchTemplates = async (oaId: string) => {
        const res = await api.get<ZaloTemplate[]>(`zalo_templates?oa_id=${oaId}`);
        if (res.success) {
            setTemplates(res.data.filter((t: ZaloTemplate) => t.status === 'approved'));
        }
    };

    const fetchTemplateDetail = async (id: string) => {
        setLoadingDetail(true);
        try {
            const res = await api.post<{ previewUrl?: string }>(`zalo_templates?route=detail&id=${id}`, {});
            if (res.success && res.data) {
                setTemplates(prev => prev.map(t => t.id === id ? { ...t, template_data: { ...(t.template_data || {}), detail: res.data } } : t));
            }
        } catch (e) {
            console.error('Failed to fetch detail', e);
        }
        setLoadingDetail(false);
    };

    const handleSyncTemplates = async () => {
        if (!config.zalo_oa_id) return;
        setSyncing(true);
        try {
            const res = await api.post(`zalo_templates?route=sync&oa_id=${config.zalo_oa_id}`, {});
            if (res.success) {
                await fetchTemplates(config.zalo_oa_id);
            }
        } catch (e) {
            console.error('Sync failed', e);
        }
        setSyncing(false);
    };

    const handleOAChange = (oaId: string) => {
        onChange({
            ...config,
            zalo_oa_id: oaId,
            template_id: '',
            template_data: {},
            input_mode: config.input_mode || 'manual'
        });
    };

    const handleTemplateChange = (templateId: string) => {
        const selected = templates.find(t => t.template_id === templateId);
        const requiredParams = selected?.preview_data?.filter((p: any) => p.require).map((p: any) => p.name) || [];

        onChange({
            ...config,
            template_id: templateId,
            template_data: {},
            required_params: requiredParams
        });
    };

    const handleTemplateDataChange = (field: string, value: string) => {
        onChange({
            ...config,
            template_data: {
                ...config.template_data,
                [field]: value
            }
        });
    };

    const handleInputModeChange = (mode: 'manual' | 'csv') => {
        onChange({
            ...config,
            input_mode: mode,
            template_data: {} // Reset params
        });
        setCsvFile(null);
        setCsvHeaders([]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
                setCsvHeaders(headers);

                // Auto match logic
                const autoMapped: any = {};
                const selectedTemplate = templates.find(t => t.template_id === config.template_id);
                const params = selectedTemplate?.preview_data || [];
                const missingReq: string[] = [];

                params.forEach((p: any) => {
                    const match = headers.find(h => h === p.name.toLowerCase() || h.includes(p.name.toLowerCase()));
                    if (match) {
                        autoMapped[p.name] = `csv:${match}`;
                    } else if (p.require) {
                        missingReq.push(p.name);
                    }
                });

                // Check for phone and validate rows
                const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('sdt') || h.includes('s? dĐiện thoại'));
                let validCount = 0;

                if (phoneIdx !== -1) {
                    const phoneHeader = headers[phoneIdx];
                    autoMapped['phone_column'] = phoneHeader;

                    // Validate rows
                    const rows = lines.slice(1);
                    rows.forEach(r => {
                        const cols = r.split(','); // Note: This simple split might fail on quoted commas
                        const val = cols[phoneIdx]?.trim().replace(/^"|"$/g, '');
                        if (val && val.length >= 9 && val.length <= 15 && /^\d+$/.test(val)) {
                            validCount++;
                        }
                    });

                    setCsvStats({
                        totalRows: rows.length,
                        validRows: validCount,
                        missingRequired: missingReq
                    });
                } else {
                    setCsvStats({
                        totalRows: lines.length - 1,
                        validRows: 0,
                        missingRequired: missingReq
                    });
                }

                onChange({
                    ...config,
                    template_data: autoMapped,
                    csv_filename: file.name
                });
            }
        };
        reader.readAsText(file);
    };

    const handleFallbackChange = (behavior: string) => {
        onChange({
            ...config,
            fallback_behavior: behavior
        });
    };

    const handleDownloadTemplate = () => {
        if (!selectedTemplate) return;
        const params = selectedTemplate.preview_data || [];
        const headers = ['phone', ...params.map((p: any) => p.name)];
        const csvContent = headers.join(',') + '\n' + headers.map(() => 'sample_value').join(',');

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `zns_template_${selectedTemplate.template_id}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // All available variables grouped by category
    const allVariableGroups = [
        {
            label: 'Th�ng tin Contact',
            icon: 'user',
            vars: [
                { key: '{{first_name}}', label: 'T�n', desc: 'First name of contact' },
                { key: '{{last_name}}', label: 'H?', desc: 'Last name of contact' },
                { key: '{{full_name}}', label: 'H? v� t�n', desc: 'Full name' },
                { key: '{{email}}', label: 'Email', desc: 'Email address' },
                { key: '{{phone_number}}', label: 'S? dĐiện thoại', desc: 'Phone number' },
                { key: '{{company_name}}', label: 'Còng ty', desc: 'Company name' },
                { key: '{{job_title}}', label: 'Ch?c v?', desc: 'Job title' },
                { key: '{{city}}', label: 'Th�nh ph?', desc: 'City' },
                { key: '{{country}}', label: 'Qu?c gia', desc: 'Country' },
                { key: '{{date_of_birth}}', label: 'Ng�y sinh', desc: 'Date of birth' },
                { key: '{{gender}}', label: 'Gi?i t�nh', desc: 'Gender' },
                { key: '{{joined_at}}', label: 'Ng�y tham gia', desc: 'Join date (dd/mm/yyyy)' },
            ]
        },
        {
            label: 'Ng�y & Thời gian',
            icon: 'calendar',
            vars: [
                { key: '{{today}}', label: 'H�m nay', desc: 'Today\'s date (dd/mm/yyyy)' },
                { key: '{{today_ymd}}', label: 'H�m nay (yyyy-mm-dd)', desc: 'Today yyyy-mm-dd format' },
                { key: '{{today_dmy}}', label: 'H�m nay (dd-mm-yyyy)', desc: 'Today dd-mm-yyyy format' },
                { key: '{{current_date}}', label: 'Ng�y hi?n t?i', desc: 'Current date dd/mm/yyyy' },
                { key: '{{year}}', label: 'Nam hi?n t?i', desc: 'Current year' },
                { key: '{{time}}', label: 'Gi? hi?n t?i', desc: 'Current time HH:mm' },
            ]
        },
        {
            label: 'Hệ thống',
            icon: 'system',
            vars: [
                { key: '{{subscriber_id}}', label: 'ID Subscriber', desc: 'Unique ID of the contact' },
                { key: '{{contact_id}}', label: 'Contact ID', desc: 'Alias for subscriber_id' },
            ]
        },
        ...(customFields.length > 0 ? [{
            label: 'Custom Fields',
            icon: 'custom',
            vars: customFields.map(f => ({ key: `{{${f.key}}}`, label: f.label, desc: `Custom field: ${f.key}` }))
        }] : [])
    ];

    const personalizationTags = [
        { label: 'T�n', value: 'first_name' },
        { label: 'H?', value: 'last_name' },
        { label: 'Email', value: 'email' },
        { label: 'S�T', value: 'phone_number' },
        { label: 'Còng ty', value: 'company_name' },
        { label: 'H�m nay', value: 'today' },
        { label: 'ID', value: 'subscriber_id' },
    ];

    // Insert variable into a specific field
    const insertVariable = (fieldName: string, varKey: string) => {
        const currentVal = config.template_data?.[fieldName] || '';
        handleTemplateDataChange(fieldName, currentVal + varKey);
        setVarPickerField(null);
        setPickerButtonRect(null);
        setVarPickerSearch('');
    };

    // Open picker: track button rect for portal positioning
    const openPicker = (fieldName: string, e: React.MouseEvent<HTMLButtonElement>) => {
        if (varPickerField === fieldName) {
            setVarPickerField(null);
            setPickerButtonRect(null);
        } else {
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            setPickerButtonRect(rect);
            setVarPickerField(fieldName);
            setVarPickerSearch('');
        }
    };

    // Compute fixed position for the picker portal
    const getPickerStyle = (): React.CSSProperties => {
        if (!pickerButtonRect) return { display: 'none' };
        const W = 320;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const spaceBelow = viewportH - pickerButtonRect.bottom;
        const spaceAbove = pickerButtonRect.top;
        const estimatedH = 420;

        // Left: align right edge of picker with right edge of button, but clamp to viewport
        let left = pickerButtonRect.right - W;
        if (left < 8) left = 8;
        if (left + W > viewportW - 8) left = viewportW - W - 8;

        // Top: open upward if not enough space below
        let top: number;
        if (spaceBelow < estimatedH && spaceAbove > spaceBelow) {
            top = pickerButtonRect.top - estimatedH - 4;
            if (top < 8) top = 8;
        } else {
            top = pickerButtonRect.bottom + 4;
        }

        return { position: 'fixed', top, left, width: W, zIndex: 999999 };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (oas.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-amber-800 mb-2">Chua c� Zalo OA</p>
                <p className="text-xs text-amber-600">Vui lòng th�m Zalo Official Account trong Settings trước.</p>
            </div>
        );
    }

    const oaOptions: Option[] = oas.map(oa => ({
        value: oa.id,
        label: oa.name,
        subLabel: 'Official Account'
    }));

    const templateOptions: Option[] = templates.map(t => ({
        value: t.template_id,
        label: t.template_name,
        subLabel: `ID: ${t.template_id} � Type: ${t.template_type}`
    }));

    const selectedTemplate = templates.find(t => t.template_id === config.template_id);
    const templateParams = selectedTemplate?.preview_data || [];
    const previewUrl = selectedTemplate?.template_data?.detail?.previewUrl;

    const isTimeInsecure = flow?.config?.startTime && flow?.config?.endTime && (
        flow.config.startTime < '06:00' || flow.config.endTime > '22:00'
    );

    const handleAutoAdjust = () => {
        if (!onUpdateFlow) return;
        onUpdateFlow({
            startTime: '06:00',
            endTime: '22:00'
        });
    };

    return (
        <div className="space-y-8">
            {/* ZNS Time Policy Warning with Auto-Adjust */}
            <div className={`p-5 rounded-[24px] border shadow-sm animate-in zoom-in-95 duration-500 ${isTimeInsecure ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 ${isTimeInsecure ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {isTimeInsecure ? <ShieldAlert className="w-5 h-5" /> : <BadgeCheck className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className={`text-[11px] font-black uppercase tracking-widest ${isTimeInsecure ? 'text-orange-900' : 'text-emerald-900'}`}>
                                {isTimeInsecure ? 'Cònh b�o khung gi?đã gửi ZNS' : 'Khung gi? Flow d� an to�n'}
                            </h4>
                            <Clock className={`w-4 h-4 ${isTimeInsecure ? 'text-orange-400' : 'text-emerald-400'}`} />
                        </div>
                        <p className={`text-[11px] font-bold leading-relaxed ${isTimeInsecure ? 'text-orange-800' : 'text-emerald-800'}`}>
                            {isTimeInsecure
                                ? `Theo ch�nh s�ch Zalo, tin ZNS ch?đã gửi du?c t? 06:00 - 22:00. Flow hi?n t?i (${flow.config.startTime} - ${flow.config.endTime}) c� th? khi?n tin nh?n b? t?m gi? ho?c th?t b?i.`
                                : 'C?u h�nh Thời gian c?a Flow n�y d� tu�n th? ch�nh s�ch c?a Zalo (06:00 - 22:00). Tin nh?n ZNS s? du?cđã gửi di ngay l?p t?c.'
                            }
                        </p>

                        {isTimeInsecure && onUpdateFlow && !disabled && (
                            <button
                                onClick={handleAutoAdjust}
                                className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-orange-700 transition-all shadow-md shadow-orange-200 active:scale-95"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                T? d?ng di?u chọnh Flow (06:00 - 22:00)
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {/* Configuration Section */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OA Selection */}
                    <div className="relative z-30">
                        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-3">
                            <MessageSquare className="w-4 h-4 inline mr-2 text-blue-500" />
                            G?i t? Zalo OA
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <CustomSelect
                                    value={config.zalo_oa_id || ''}
                                    options={oaOptions}
                                    onChange={handleOAChange}
                                    disabled={disabled}
                                    placeholder="-- Ch?n Zalo OA --"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSyncTemplates}
                                disabled={disabled || !config.zalo_oa_id || syncing}
                                className={`px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all
                                    ${syncing ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}
                                `}
                            >
                                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sync'}
                            </button>
                        </div>
                    </div>

                    {/* Template Selection */}
                    {config.zalo_oa_id && (
                        <div className="relative z-20">
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-3">
                                <FileText className="w-4 h-4 inline mr-2 text-indigo-500" />
                                Ch?n M?u (Template)
                            </label>
                            <CustomSelect
                                value={config.template_id || ''}
                                options={templateOptions}
                                onChange={handleTemplateChange}
                                disabled={disabled || templates.length === 0}
                                placeholder={templates.length === 0 ? "Kh�ng c� template n�o" : "-- Ch?n Template --"}
                            />

                            {/* [NEW] UID Support Warning */}
                            {selectedTemplate && selectedTemplate.template_data?.support_uid === false && (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide mb-1">
                                            Luu �: Template kh�ng h? tr? UID
                                        </p>
                                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                            M?u n�y s? <b>t? d?ng chuy?n sangđã gửi qua S? dĐiện thoại</b> n?u b?n nh?p UID.
                                            <br />
                                            Chi ph� d? ki?n: <b className="text-amber-900">{selectedTemplate.template_data?.price || 'theo quy dảnh Zalo'} VND/tin</b>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Mode Toggle & Config Area */}
                {config.template_id && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit shadow-inner">
                                <button
                                    onClick={() => handleInputModeChange('manual')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.input_mode !== 'csv' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <HelpCircle className="w-3.5 h-3.5 inline mr-1.5" />
                                    Cá nhân h�a
                                </button>
                                <button
                                    onClick={() => handleInputModeChange('csv')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.input_mode === 'csv' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
                                    G?i theo list CSV
                                </button>
                            </div>

                            {config.input_mode === 'csv' && (
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 border border-emerald-100 transition-all active:scale-95"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    T?i fileĐã mởu .CSV
                                </button>
                            )}
                        </div>

                        <div className="p-8 bg-white rounded-[32px] border-2 border-slate-100 shadow-xl shadow-slate-200/20">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    C?u h�nh Tham s? (Parameters)
                                </h4>
                                {config.input_mode === 'manual' && (
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                        Manual Mode
                                    </span>
                                )}
                            </div>

                            {config.input_mode === 'csv' ? (
                                <div className="space-y-8">
                                    {/* CSV Upload */}
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={disabled}
                                        />
                                        <div className={`py-12 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all ${csvFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50 group-hover:border-blue-300 group-hover:bg-blue-50/30'}`}>
                                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${csvFile ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}>
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                            <div className="text-center px-6">
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                                    {csvFile ? csvFile.name : 'Ch?n danh sách ngu?i nh?n (.CSV)'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                                                    {csvFile ? 'File d� s?n s�ng x? l�' : 'Ch? ch?p nh?n file dảnh d?ng CSV c� ch?a c?t S�T'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CSV Mapping Info */}
                                    {csvHeaders.length > 0 && (
                                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">K?t qu? Mapping d? li?u:</p>
                                            </div>
                                            {csvStats && (
                                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-blue-500" />
                                                            Báo cáo ki?m tra File
                                                        </h5>
                                                        <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-1 rounded-lg">
                                                            Total: {csvStats.totalRows} h�ng
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Valid Rows */}
                                                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">H?p l? (S�T OK)</span>
                                                                <Check className="w-4 h-4 text-emerald-500" />
                                                            </div>
                                                            <p className="text-2xl font-black text-emerald-700">{csvStats.validRows}</p>
                                                        </div>

                                                        {/* Invalid Rows */}
                                                        <div className={`border p-3 rounded-xl ${csvStats.totalRows - csvStats.validRows > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`text-[10px] font-bold uppercase ${csvStats.totalRows - csvStats.validRows > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                                                    Lỗi (S�T sai/tr?ng)
                                                                </span>
                                                                {csvStats.totalRows - csvStats.validRows > 0 ? (
                                                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                                                ) : (
                                                                    <Check className="w-4 h-4 text-slate-300" />
                                                                )}
                                                            </div>
                                                            <p className={`text-2xl font-black ${csvStats.totalRows - csvStats.validRows > 0 ? 'text-orange-700' : 'text-slate-300'}`}>
                                                                {csvStats.totalRows - csvStats.validRows}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Missing Columns Warning */}
                                                    {csvStats.missingRequired.length > 0 && (
                                                        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                                            <X className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-[11px] font-black text-rose-700 uppercase mb-1">Thi?u c?t b?t bu?c</p>
                                                                <p className="text-[11px] text-rose-600 leading-relaxed">
                                                                    File CSV thi?u c�c tham s? sau: <b>{csvStats.missingRequired.join(', ')}</b>.
                                                                    Tin nh?n c� th? b? Zalo t? ch?i.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Fallback Logic Explanation */}
                                                    {(csvStats.totalRows - csvStats.validRows > 0) && (
                                                        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                            <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-[11px] font-black text-blue-700 uppercase mb-1">X? l� h�ng l?i</p>
                                                                <p className="text-[11px] text-blue-600 leading-relaxed">
                                                                    C� <b>{csvStats.totalRows - csvStats.validRows}</b> h�ng ch?a S�T kh�ng h?p l?.
                                                                    Hệ thống s? <span className="font-black px-1.5 py-0.5 bg-white rounded border border-blue-200">
                                                                        {config.fallback_behavior === 'mark_failed' ? 'C?T FLOW & B�O L?I' : 'Bỏ qua & TI?P T?C'}
                                                                    </span> d?i v?i c�c li�n h? n�y.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!csvHeaders.some(h => h.includes('phone') || h.includes('sdt')) && (
                                                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                                    <p className="text-[11px] text-rose-600 font-bold leading-relaxed">
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Dynamic Inputs (Manual) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {templateParams.map((param: any) => {
                                            const fieldName = param.name;
                                            const isPickerOpen = varPickerField === fieldName;
                                            return (
                                                <div key={fieldName} className="space-y-2 group relative">
                                                    <label className="flex justify-between items-center px-1">
                                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{fieldName}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{param.type || 'text'}</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={config.template_data?.[fieldName] || ''}
                                                            onChange={(e) => handleTemplateDataChange(fieldName, e.target.value)}
                                                            disabled={disabled}
                                                            placeholder={`Nh?p n?i dung cho ${fieldName}...`}
                                                            className="w-full px-5 py-4 pr-12 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:font-medium"
                                                        />
                                                        {!disabled && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openPicker(fieldName, e)}
                                                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${isPickerOpen
                                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                                    : 'bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200'
                                                                    }`}
                                                                title="Ch?n bi?n"
                                                            >
                                                                <Braces className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {/* Variable Picker Portal */}
                                                        {isPickerOpen && typeof document !== 'undefined' && createPortal(
                                                            <>
                                                                <div
                                                                    className="fixed inset-0"
                                                                    style={{ zIndex: 999998 }}
                                                                    onClick={() => { setVarPickerField(null); setPickerButtonRect(null); }}
                                                                />
                                                                <div
                                                                    ref={varPickerRef}
                                                                    style={getPickerStyle()}
                                                                    className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                                                >
                                                                    {/* Header */}
                                                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                                                                        <p className="text-[11px] font-black text-white uppercase tracking-widest mb-2">Ch?n bi?n cho: <span className="text-blue-200">{fieldName}</span></p>
                                                                        <div className="relative">
                                                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-300" />
                                                                            <input
                                                                                type="text"
                                                                                placeholder="T�m bi?n..."
                                                                                value={varPickerSearch}
                                                                                onChange={e => setVarPickerSearch(e.target.value)}
                                                                                className="w-full pl-7 pr-3 py-1.5 bg-white/20 text-white placeholder-blue-300 text-xs rounded-lg outline-none focus:bg-white/30"
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Variables grouped */}
                                                                    <div className="max-h-72 overflow-y-auto">
                                                                        {allVariableGroups.map((group, gi) => {
                                                                            const filtered = group.vars.filter(v =>
                                                                                !varPickerSearch ||
                                                                                v.label.toLowerCase().includes(varPickerSearch.toLowerCase()) ||
                                                                                v.key.toLowerCase().includes(varPickerSearch.toLowerCase())
                                                                            );
                                                                            if (filtered.length === 0) return null;
                                                                            return (
                                                                                <div key={gi} className="border-b border-slate-100 last:border-0">
                                                                                    <p className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                                                                                        {group.label}
                                                                                    </p>
                                                                                    {filtered.map((v, vi) => (
                                                                                        <button
                                                                                            key={vi}
                                                                                            type="button"
                                                                                            onClick={() => insertVariable(fieldName, v.key)}
                                                                                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left group/var"
                                                                                        >
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="text-[11px] font-black text-slate-700 group-hover/var:text-blue-700">{v.label}</p>
                                                                                                <p className="text-[9px] text-slate-400 font-mono">{v.key}</p>
                                                                                            </div>
                                                                                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover/var:text-blue-500 shrink-0 ml-2" />
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Quick insert shortcuts */}
                                                                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nh?p nhanh</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {[{ k: '{{today}}', l: 'H�m nay' }, { k: '{{first_name}}', l: 'T�n' }, { k: '{{subscriber_id}}', l: 'ID' }].map(q => (
                                                                                <button
                                                                                    key={q.k}
                                                                                    type="button"
                                                                                    onClick={() => insertVariable(fieldName, q.k)}
                                                                                    className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                                                                >{q.l}</button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>,
                                                            document.body
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[9px] font-medium text-slate-400 italic">
                                                            {param.require ? '* B?t bu?c nh?p' : 'Kh�ng b?t bu?c'}
                                                        </span>
                                                        {param.maxLength && (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase">T?i da {param.maxLength} k� t?</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {templateParams.length === 0 && (
                                        <div className="text-center py-10 opacity-30">
                                            <RefreshCw className="w-12 h-12 mx-auto mb-4" />
                                            <p className="text-xs font-black uppercase tracking-widest">Kh�ng c� tham s?</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fallback & Info Box Container */}
                {config.template_id && (
                    <div className="space-y-6">
                        {/* Fallback Behavior */}
                        <div className="space-y-4">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 px-1">
                                H�nh d?ng n?u d? li?u l?i
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex flex-col items-center gap-2 p-3 rounded-[24px] border-2 cursor-pointer transition-all hover:shadow-xl ${(config.fallback_behavior || 'skip') === 'skip' ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}>
                                    <input
                                        type="radio"
                                        name="fallback"
                                        value="skip"
                                        checked={(config.fallback_behavior || 'skip') === 'skip'}
                                        onChange={(e) => handleFallbackChange(e.target.value)}
                                        disabled={disabled}
                                        className="sr-only"
                                    />
                                    <HelpCircle className={`w-6 h-6 ${(config.fallback_behavior || 'skip') === 'skip' ? 'text-white' : 'text-slate-200'}`} />
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-tight">Bỏ qua</p>
                                        <p className={`text-[8px] font-bold ${(config.fallback_behavior || 'skip') === 'skip' ? 'text-blue-200' : 'text-slate-400'}`}>TI?P T?C FLOW</p>
                                    </div>
                                </label>

                                <label className={`flex flex-col items-center gap-2 p-3 rounded-[24px] border-2 cursor-pointer transition-all hover:shadow-xl ${config.fallback_behavior === 'mark_failed' ? 'bg-rose-600 border-rose-600 text-white shadow-rose-200' : 'bg-white border-slate-100 text-slate-500 hover:border-rose-200'}`}>
                                    <input
                                        type="radio"
                                        name="fallback"
                                        value="mark_failed"
                                        checked={config.fallback_behavior === 'mark_failed'}
                                        onChange={(e) => handleFallbackChange(e.target.value)}
                                        disabled={disabled}
                                        className="sr-only"
                                    />
                                    <X className={`w-6 h-6 ${config.fallback_behavior === 'mark_failed' ? 'text-white' : 'text-slate-200'}`} />
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-tight">C?t flow</p>
                                        <p className={`text-[8px] font-bold ${config.fallback_behavior === 'mark_failed' ? 'text-rose-200' : 'text-slate-400'}`}>��NH D?U L?I</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-6 flex flex-col sm:flex-row items-start gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <div className="space-y-2 flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">M�ch nh? cho b?n</p>
                                <ul className="space-y-3 text-[11px] text-slate-500 font-bold leading-relaxed">
                                    <li className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                                        <p className="flex-1">D�ng <b className="text-indigo-600">Cá nhân h�a</b> khi mu?nđã gửi t? d?ng theo s? ki?n c?a kh�ch.</p>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                                        <p className="flex-1">D�ng <b className="text-indigo-600">CSV</b> khi d� c� s?n danh sách S�T trong file Excel/CSV.</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Preview Section - Massive and Beautiful */}
            {
                config.template_id && (
                    <div className="pt-10 border-t border-slate-100 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-800 tracking-tight">TR?C QUAN GIAO DI?N (PREVIEW)</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">X�c nh?n n?i dung s? hi?n th? tr�n dĐiện thoại</p>
                                </div>
                            </div>
                            {previewUrl && (
                                <a href={previewUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                                    Open in Full Tab
                                </a>
                            )}
                        </div>

                        <div className="bg-slate-50/50 rounded-[48px] p-12 border border-slate-100 relative overflow-hidden flex flex-col items-center group">
                            {/* Background Decor */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                            {loadingDetail ? (
                                <div className="h-[600px] flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">�ang n?p b? xem trước...</p>
                                </div>
                            ) : previewUrl ? (
                                <div className="w-full max-w-[400px] bg-slate-900 rounded-[60px] p-2.5 shadow-2xl relative z-10 scale-100 group-hover:scale-[1.02] transition-transform duration-500">
                                    {/* Device Details */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-30"></div>
                                    <div className="absolute top-8 left-8 right-8 h-4 flex justify-between items-center text-[10px] text-slate-400 font-bold z-30">
                                        <span>9:41</span>
                                        <div className="flex gap-1.5 items-center">
                                            <div className="w-3.5 h-2 bg-slate-600 rounded-sm"></div>
                                            <div className="w-2.5 h-2.5 bg-slate-600 rounded-full"></div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[50px] overflow-hidden relative pt-12 pb-2 h-[720px]">
                                        <iframe
                                            src={previewUrl}
                                            title="ZNS Preview"
                                            className="w-full h-full border-0 bg-white overflow-hidden"
                                            sandbox="allow-scripts allow-same-origin"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none',
                                                overflow: 'hidden'
                                            }}
                                        />
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-200 rounded-full z-20"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[500px] flex flex-col items-center justify-center text-center max-w-sm mx-auto relative z-10">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 border-slate-50">
                                        <AlertCircle className="w-10 h-10 text-amber-600" />
                                    </div>
                                    <h5 className="text-lg font-black text-slate-800 tracking-tight mb-2">KH�NG T�M TH?Y PREVIEW</h5>
                                    <p className="text-sm font-bold text-slate-400 leading-relaxed mb-8 uppercase tracking-wide px-4">
                                        Zalo chua cung c?p b?n xem trước cho Template n�y ho?c b? nh? d?m dang g?p l?i.
                                    </p>
                                    <button
                                        onClick={() => fetchTemplateDetail(selectedTemplate?.id || '')}
                                        className="px-10 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95"
                                    >
                                        Th? t?i l?i ngay
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ZaloZNSStepConfig;
