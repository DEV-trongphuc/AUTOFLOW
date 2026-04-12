
import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Tag, Target, Loader2, FileInput, Calendar, Clock,
    CheckCircle2, Send, Cake, Lock,
    List, Snowflake, History, Layers, Search, MessageSquare,
    Info, Filter, ArrowRight, MousePointer2, Check, ShoppingCart, Zap,
    UserPlus, UserMinus, AlertCircle
} from 'lucide-react';
import { api } from '../../../services/storageAdapter';
import { Campaign, Flow, Segment, FormDefinition, PurchaseEvent, CustomEvent } from '../../../types';
import IntegrationGuideModal from '../modals/IntegrationGuideModal';
import { isManualList, isSyncList } from '../../../utils/listHelpers';
import Input from '../../common/Input';
import Select from '../../common/Select';

interface TriggerConfigProps {
    config: Record<string, any>;
    onChange: (newConfig: Record<string, any>, newLabel?: string) => void;
    disabled?: boolean;
    locked?: boolean;
    allFlows?: Flow[];
    currentFlowId?: string;
}

const GoogleSheetsIcon = ({ className }: { className?: string }) => (
    <div className={className} style={{ width: className?.includes('w-3') ? '12px' : '18px', height: className?.includes('h-3') ? '12px' : '18px' }}>
        <img
            src="https://mailmeteor.com/logos/assets/PNG/Google_Sheets_Logo_512px.png"
            className="w-full h-full max-w-full max-h-full object-contain block"
            alt="Google Sheets"
        />
    </div>
);

const MisaIcon = ({ className }: { className?: string }) => (
    <div className={className} style={{ width: className?.includes('w-3') ? '12px' : '18px', height: className?.includes('h-3') ? '12px' : '18px' }}>
        <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlIpztniIEN5ZYvLlwwqBvhzdodvu2NfPSbg&s"
            className="w-full h-full max-w-full max-h-full object-contain block rounded-full"
            alt="MISA CRM"
        />
    </div>
);

const TriggerConfig: React.FC<TriggerConfigProps> = ({ config, onChange, disabled, locked }) => {
    const [triggerType, setTriggerType] = useState<'segment' | 'tag' | 'form' | 'date' | 'campaign' | 'purchase' | 'custom_event' | 'inbound_message' | 'zalo_follow' | 'unsubscribe'>(config.type || 'segment');
    const [targetSubtype, setTargetSubtype] = useState<'list' | 'segment' | 'sync'>(config.targetSubtype || 'list');
    const [lists, setLists] = useState<any[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [purchases, setPurchases] = useState<PurchaseEvent[]>([]);
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [birthdayTab, setBirthdayTab] = useState<'list' | 'sync' | 'segment'>('list');
    const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [customFieldDefs, setCustomFieldDefs] = useState<{ key: string; label: string; type?: string }[]>([]);

    useEffect(() => {
        if (!config.targetLists || config.targetLists !== 'specific') {
            setEstimatedCount(null);
            return;
        }

        const listIds = config.targetListIds || [];
        const segIds = config.targetSegmentIds || [];

        if (listIds.length === 0 && segIds.length === 0) {
            setEstimatedCount(0);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCalculating(true);
            try {
                // Ensure array format for query params
                const listParam = listIds.join(',');
                const segParam = segIds.join(',');
                const res = await api.get<any>(`subscribers?route=count_unique&listIds=${listParam}&segmentIds=${segParam}`);
                if (res.success) {
                    setEstimatedCount(res.data.count);
                }
            } catch (e) {
                console.error("Failed to estimate audience", e);
            } finally {
                setIsCalculating(false);
            }
        }, 600); // Debounce 600ms

        return () => clearTimeout(timer);
    }, [config.targetLists, config.targetListIds, config.targetSegmentIds]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            const [listRes, segRes, campRes, tagRes, formRes, purchRes, customRes] = await Promise.all([
                api.get<any[]>('lists'),
                api.get<Segment[]>('segments'),
                api.get<Campaign[]>('campaigns'),
                api.get<any[]>('tags'),
                api.get<FormDefinition[]>('forms'),
                api.get<PurchaseEvent[]>('purchase_events'),
                api.get<CustomEvent[]>('custom_events')
            ]);
            if (listRes.success) setLists(listRes.data);
            if (segRes.success) setSegments(segRes.data);
            if (campRes.success) setCampaigns(campRes.data);
            if (tagRes.success) setTags(tagRes.data);
            if (formRes.success) setForms(formRes.data);
            if (purchRes.success) setPurchases(purchRes.data);
            if (customRes.success) setCustomEvents(customRes.data);

            // Load custom field definitions for date trigger
            try {
                const cfRes = await api.get<any>('subscribers?route=field_definitions');
                if (cfRes.success && cfRes.data) {
                    setCustomFieldDefs(cfRes.data.filter((f: any) => f.type === 'date' || f.type === 'datetime'));
                }
            } catch (e) { /* ignore */ }

            setLoading(false);
        };
        loadInitialData();
    }, []);

    const triggerOptions = [
        { id: 'segment', label: 'Ph�n kh�c d?ng', icon: Layers, color: 'orange', desc: 'B? l?c th�ng minh' },
        { id: 'form', label: 'G?i Bi?uĐã mởu', icon: FileInput, color: 'amber', desc: 'T? Landing Page' },
        { id: 'purchase', label: 'Khách hàng Mua', icon: ShoppingCart, color: 'pink', desc: 'S? ki?n API' },
        { id: 'inbound_message', label: 'Tin nh?n d?n', icon: MessageSquare, color: 'blue', desc: 'Meta / Zalo OA / Keyword' },
        { id: 'zalo_follow', label: 'Quan t�m Zalo', icon: UserPlus, color: 'cyan', desc: 'Khi kh�ch nh?n Follow' },
        { id: 'custom_event', label: 'Custom Event', icon: Zap, color: 'violet', desc: 'S? ki?n t�y chọnh' },
        { id: 'tag', label: '�u?c g?n nh�n', icon: Tag, color: 'emerald', desc: 'Ph�n lo?i th? c�ng' },
        { id: 'date', label: 'Ng�y / S? ki?n', icon: Calendar, color: 'blue', desc: 'Sinh nh?t, Ng? d�ng' },
        { id: 'campaign', label: 'Sau Chi?n d?ch', icon: Send, color: 'indigo', desc: 'Tương tác Email' },
        { id: 'unsubscribe', label: 'Hủy đăng ký', icon: UserMinus, color: 'red', desc: 'Khi kh�ch nh?n Unsub' },
    ];

    const getLabelForType = (type: string, targetId: string, subtype?: string, dateField?: string) => {
        switch (type) {
            case 'segment':
                if (subtype === 'segment') {
                    const seg = segments.find(s => s.id === targetId);
                    return seg ? `V�o Ph�n kh�c: ${seg.name}` : 'Khi v�o Ph�n kh�c';
                }
                if (subtype === 'sync') {
                    const list = lists.find(l => l.id === targetId);
                    return list ? `�?ng b?: ${list.name}` : 'Khi d?ng b? d? li?u';
                }
                const list = lists.find(l => l.id === targetId);
                return list ? `V�o Danh sách: ${list.name}` : 'Khi v�o Danh sách';
            case 'form':
                const form = forms.find(f => f.id === targetId);
                return form ? `Gửi Form: ${form.name}` : 'Khiđã gửi Bi?uĐã mởu';
            case 'purchase':
                const purch = purchases.find(p => p.id === targetId);
                return purch ? `Mua h�ng: ${purch.name}` : 'Khi kh�ch Mua h�ng';
            case 'custom_event':
                const ce = customEvents.find(c => c.id === targetId);
                return ce ? `S? ki?n: ${ce.name}` : 'Khi c� s? ki?n t�y chọnh';
            case 'inbound_message':
                return targetId ? `Tin nhắn: "${targetId}"` : 'Khi kh�chđã gửi tin nh?n';
            case 'zalo_follow':
                return 'Khi kh�ch Quan t�m Zalo OA';
            case 'unsubscribe':
                return 'Khi khách Hủy đăng ký';
            case 'tag':
                return targetId ? `�u?c g?n Tag: ${targetId}` : 'Khi du?c g?n nh�n';
            case 'campaign':
                const camp = campaigns.find(c => c.id === targetId);
                return camp ? `Sau Campaign: ${camp.name}` : 'Tương tác chi?n d?ch';
            case 'date':
                if (dateField === 'dateOfBirth' || dateField === 'anniversaryDate' || dateField === 'joinedAt') {
                    const isBirth = dateField === 'dateOfBirth';
                    const isJoined = dateField === 'joinedAt';
                    const attr = isBirth ? 'sinh nh?t' : (isJoined ? 'ng�y gia nh?p' : 'ng�y k? ni?m');
                    const offsetType = config.offsetType || 'on';
                    const offsetVal = config.offsetValue || 0;
                    if (offsetType === 'on') return `M?ng ${isBirth ? 'Sinh nh?t' : (isJoined ? 'Ng�y gia nh?p' : 'K? ni?m')}`;
                    return `${offsetVal} ng�y ${offsetType === 'before' ? 'trước' : 'sau'} ${attr}`;
                }
                if (dateField === 'specificDate') return `V�o ng�y ${config.specificDate || '...'}`;
                if (dateField === 'lastActivity') return 'Khách hàng ng? d�ng';
                if (dateField === 'custom_field_date') {
                    const fieldKey = config.customFieldKey || '...';
                    const offsetType = config.offsetType || 'on';
                    const offsetVal = config.offsetValue || 0;
                    if (offsetType === 'on') return `Trigger ng�y: ${fieldKey}`;
                    return `${offsetVal} ng�y ${offsetType === 'before' ? 'trước' : 'sau'} [${fieldKey}]`;
                }
                return 'S? ki?n theo ng�y';
            default: return 'B?t d?u Flow';
        }
    };

    const handleTypeChange = (type: string) => {
        if (disabled || locked) return;
        setTriggerType(type as any);
        setSearchTerm('');
        const newLabel = getLabelForType(type, '', type === 'segment' ? 'list' : undefined);
        onChange({ ...config, type, targetId: '', targetSubtype: type === 'segment' ? 'list' : undefined }, newLabel);
    };

    const handleTargetChange = (id: string, subtype?: string) => {
        if (disabled) return;
        const finalSubtype = subtype || targetSubtype;
        const newLabel = getLabelForType(triggerType, id, finalSubtype, config.dateField);
        onChange({ ...config, targetId: id, targetSubtype: finalSubtype }, newLabel);
    };

    const getOptionClasses = (color: string, isSelected: boolean) => {
        const colors: any = {
            orange: isSelected ? 'border-orange-500 bg-orange-50 ring-orange-50' : 'hover:border-orange-200',
            amber: isSelected ? 'border-amber-600 bg-amber-50 ring-amber-50' : 'hover:border-amber-200',
            pink: isSelected ? 'border-pink-500 bg-pink-50 ring-pink-50' : 'hover:border-pink-200',
            emerald: isSelected ? 'border-emerald-500 bg-emerald-50 ring-emerald-50' : 'hover:border-emerald-200',
            blue: isSelected ? 'border-blue-500 bg-blue-50 ring-blue-50' : 'hover:border-blue-200',
            violet: isSelected ? 'border-violet-500 bg-violet-50 ring-violet-50' : 'hover:border-violet-200',
            indigo: isSelected ? 'border-indigo-500 bg-indigo-50 ring-indigo-50' : 'hover:border-indigo-200',
        };
        return colors[color] || '';
    };

    const getIconClasses = (color: string, isSelected: boolean) => {
        const colors: any = {
            orange: isSelected ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500',
            amber: isSelected ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600',
            pink: isSelected ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-500',
            emerald: isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500',
            blue: isSelected ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500',
            violet: isSelected ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-500',
            indigo: isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-500',
        };
        return colors[color] || '';
    };

    const ConfigItem = ({ label, desc, icon: Icon, isSelected, onClick }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all duration-300 group
        ${isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/10'
                    : 'border-transparent bg-slate-50 hover:bg-slate-100 hover:border-slate-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 ${isSelected ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="text-left overflow-hidden">
                    <p className={`text-[13px] font-semibold transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{label}</p>
                    {desc && <p className={`text-[9px] font-medium uppercase tracking-tight mt-0.5 transition-colors ${isSelected ? 'text-emerald-600/80' : 'text-slate-400'}`}>{desc}</p>}
                </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                {isSelected && <CheckCircle2 className="w-3 h-3" />}
            </div>
        </button>
    );

    const selectedForm = forms.find(f => f.id === config.targetId);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32">
            {locked && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-[22px] flex items-center gap-4 shadow-sm animate-in zoom-in-95 mb-4">
                    <div className="p-2.5 bg-white rounded-xl text-amber-600 shadow-sm"><Lock className="w-4.5 h-4.5" /></div>
                    <div>
                        <p className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">Trigger d� b? kh�a</p>
                        <p className="text-[10px] font-medium text-amber-700 leading-tight">Quy tr�nh d� c� kh�ch tham gia, kh�ng th? thay d?i di?m b?t d?u.</p>
                    </div>
                </div>
            )}

            {/* 1. TINH T?: EVENT SELECTOR (GRID 2 C?T) */}
            <div className="space-y-3.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">Ch?n s? ki?n kh?i d?u</label>
                <div className="grid grid-cols-2 gap-2.5">
                    {triggerOptions.map((opt) => {
                        const isSelected = triggerType === opt.id;
                        return (
                            <button
                                key={opt.id}
                                disabled={disabled || locked}
                                onClick={() => handleTypeChange(opt.id)}
                                className={`flex items-center gap-3 p-3 rounded-[20px] border-2 transition-all duration-300 relative group overflow-hidden
                        ${getOptionClasses(opt.color, isSelected)} 
                        ${isSelected ? 'shadow-sm ring-2' : 'bg-white border-slate-100'}
                        ${disabled || locked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 ${getIconClasses(opt.color, isSelected)} ${isSelected ? 'shadow-md' : 'group-hover:scale-105'}`}>
                                    <opt.icon className="w-4 h-4" />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className={`text-xs font-bold leading-none mb-1 tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{opt.label}</p>
                                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight truncate">{opt.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. �?NG B?: DETAILED CONFIGURATION */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                        <Target className="w-3 h-3" /> Chi ti?t ngu?n d? li?u
                    </h4>
                    {triggerType === 'form' && config.targetId && (
                        <button onClick={() => setShowGuide(true)} className="text-[9px] font-bold text-blue-600 hover:underline">Hu?ng d?n t�ch h?p API</button>
                    )}
                </div>

                {loading ? (
                    <div className="py-20 text-center animate-pulse"><Loader2 className="w-6 h-6 animate-spin text-slate-200 mx-auto" /></div>
                ) : (
                    <div className="space-y-3.5 animate-in slide-in-from-bottom-2 duration-300">

                        {/* SUB-TAB FOR SEGMENT/LIST/SYNC */}
                        {triggerType === 'segment' && (
                            <div className="flex bg-slate-100 p-0.5 rounded-lg w-full mb-1">
                                <button
                                    onClick={() => { setTargetSubtype('list'); handleTargetChange(''); }}
                                    className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${targetSubtype === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <List className="w-3 h-3" /> Danh sách
                                </button>
                                <button
                                    onClick={() => { setTargetSubtype('sync' as any); handleTargetChange(''); }}
                                    className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${targetSubtype === 'sync' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className="flex items-center space-x-1">
                                        <GoogleSheetsIcon className="w-3 h-3" />
                                        <span className="text-[9px]">/</span>
                                        <MisaIcon className="w-3 h-3" />
                                    </div>
                                    <span className="ml-1">�?ng b?</span>
                                </button>
                                <button
                                    onClick={() => { setTargetSubtype('segment'); handleTargetChange(''); }}
                                    className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${targetSubtype === 'segment' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Layers className="w-3 h-3" /> Ph�n kh�c
                                </button>
                            </div>
                        )}

                        {/* SEARCH BAR */}
                        {triggerType !== 'date' && (
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-500 transition-colors" />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="T�m ki?m nhanh..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-slate-400 transition-all" />
                            </div>
                        )}

                        <div className={`space-y-2 pr-1 custom-scrollbar p-0.5 ${triggerType === 'date' ? '' : 'max-h-72 overflow-y-auto'}`}>
                            {/* CASE: SEGMENT / LIST / SYNC */}
                            {triggerType === 'segment' && targetSubtype === 'list' && lists
                                .filter(i => isManualList(i) && i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(item => (
                                    <ConfigItem
                                        key={item.id}
                                        label={item.name}
                                        desc={`${item.count || 0} li�n h?`}
                                        icon={List}
                                        isSelected={config.targetId === item.id}
                                        onClick={() => handleTargetChange(item.id)}
                                    />
                                ))
                            }

                            {triggerType === 'segment' && targetSubtype === 'sync' && lists
                                .filter(i => isSyncList(i) && i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(item => (
                                    <ConfigItem
                                        key={item.id}
                                        label={item.name}
                                        desc={`${item.count || 0} li�n h? � ${item.source}`}
                                        icon={item.source === 'MISA CRM' ? MisaIcon : GoogleSheetsIcon}
                                        isSelected={config.targetId === item.id}
                                        onClick={() => handleTargetChange(item.id)}
                                    />
                                ))
                            }

                            {triggerType === 'segment' && targetSubtype === 'segment' && segments
                                .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(item => (
                                    <ConfigItem
                                        key={item.id}
                                        label={item.name}
                                        desc={`${item.count || 0} li�n h?`}
                                        icon={Layers}
                                        isSelected={config.targetId === item.id}
                                        onClick={() => handleTargetChange(item.id)}
                                    />
                                ))
                            }

                            {/* CASE: FORM SUBMIT */}
                            {triggerType === 'form' && forms
                                .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(f => (
                                    <ConfigItem
                                        key={f.id}
                                        label={f.name}
                                        desc={`${f.stats?.submissions || 0} lu?t dang k�`}
                                        icon={FileInput}
                                        isSelected={config.targetId === f.id}
                                        onClick={() => handleTargetChange(f.id)}
                                    />
                                ))
                            }

                            {/* CASE: PURCHASE EVENT */}
                            {triggerType === 'purchase' && purchases
                                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(p => (
                                    <ConfigItem
                                        key={p.id}
                                        label={p.name}
                                        desc={`Event ID: ${p.id.substring(0, 8)}...`}
                                        icon={ShoppingCart}
                                        isSelected={config.targetId === p.id}
                                        onClick={() => handleTargetChange(p.id)}
                                    />
                                ))
                            }

                            {/* CASE: CUSTOM EVENT */}
                            {triggerType === 'custom_event' && customEvents
                                .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(c => (
                                    <ConfigItem
                                        key={c.id}
                                        label={c.name}
                                        desc={`ID: ${c.id.substring(0, 8)}...`}
                                        icon={Zap}
                                        isSelected={config.targetId === c.id}
                                        onClick={() => handleTargetChange(c.id)}
                                    />
                                ))
                            }

                            {/* CASE: TAG ADDED */}
                            {triggerType === 'tag' && tags
                                .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(t => (
                                    <ConfigItem
                                        key={t.id}
                                        label={t.name}
                                        desc={`K�ch ho?t khi g?n nh�n n�y`}
                                        icon={Tag}
                                        isSelected={config.targetId === t.name}
                                        onClick={() => handleTargetChange(t.name)}
                                    />
                                ))
                            }

                            {/* CASE: CAMPAIGN */}
                            {triggerType === 'campaign' && campaigns
                                .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(c => (
                                    <ConfigItem
                                        key={c.id}
                                        label={c.name}
                                        desc={`Trạng thái: ${c.status}`}
                                        icon={Send}
                                        isSelected={config.targetId === c.id}
                                        onClick={() => handleTargetChange(c.id)}
                                    />
                                ))
                            }

                            {/* CASE: INBOUND MESSAGE KEYWORD */}
                            {triggerType === 'inbound_message' && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300 p-1">
                                    <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><MessageSquare className="w-4 h-4" /></div>
                                            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">T? kh�a k�ch ho?t (T�y chọn)</span>
                                        </div>
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="V� d?: GI�, TU VAN, BAO GIA"
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-slate-400 focus:bg-white outline-none transition-all"
                                                value={config.targetId || ''}
                                                onChange={(e) => handleTargetChange(e.target.value)}
                                            />
                                            <p className="text-[10px] text-slate-400 font-medium">Nh?p t? kh�a kh�chđã gửi. �? tr?ng n?u mu?n k�ch ho?t cho M?I tin nh?n.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-blue-600 font-medium leading-relaxed">
                                            Hệ thống s? ki?m tra tin nh?n c?a kh�ch tr�n Meta (Messenger) v� Zalo OA.
                                            Nữu khớp v?i t? kh�a (kh�ng ph�n bi?t hoa thu?ng), Flow s? du?c k�ch ho?t ngay l?p t?c.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* CASE: ZALO FOLLOW */}
                            {triggerType === 'zalo_follow' && (
                                <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-cyan-100/50">
                                        <UserPlus className="w-10 h-10 text-cyan-500" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">K�ch ho?t khi Quan t�m Zalo OA</h3>
                                    <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                                        T? d?ngđã gửi tin nh?n ch�oĐã mởng ho?c b?t d?u quy tr�nh cham s�c ngay khi Khách hàng nh?n <b>"Quan t�m"</b> Zalo OA c?a b?n.
                                    </p>
                                    <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kh�ng c?n c?u h�nh th�m</span>
                                    </div>
                                </div>
                            )}

                            {/* CASE: UNSUBSCRIBE */}
                            {triggerType === 'unsubscribe' && (
                                <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-100/50">
                                        <UserMinus className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">Kích hoạt khi Hủy đăng ký</h3>
                                    <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                                        S? d?ng d? g?n nh�n "Ng?ng quan t�m" ho?c ghi nh?n ph?n h?i v�o CRM khi Khách hàng nh?n link Hủy đăng kýtrong Email.
                                    </p>
                                    <div className="p-3 bg-red-50/50 rounded-xl inline-block border border-red-100">
                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Trigger D?n d?p & CRM</span>
                                    </div>
                                </div>
                            )}

                            {/* CASE: DATE / EVENTS */}
                            {triggerType === 'date' && (
                                <div className="space-y-3">
                                    {/* 1. Khách hàng NG? ��NG (�ua l�n tr�n) */}
                                    <ConfigItem
                                        label="Khách hàng ng? d�ng"
                                        desc="Khi kh�ch kh�ng tuong t�c qu� l�u"
                                        icon={Snowflake}
                                        isSelected={config.dateField === 'lastActivity'}
                                        onClick={() => {
                                            const newLabel = getLabelForType('date', '', undefined, 'lastActivity');
                                            onChange({ ...config, dateField: 'lastActivity', inactiveAmount: config.inactiveAmount || 30 }, newLabel);
                                        }}
                                    />

                                    {config.dateField === 'lastActivity' && (
                                        <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 shadow-sm mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><History className="w-4 h-4" /></div>
                                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Thời gian kh�ng tuong t�c</span>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <input
                                                    type="number"
                                                    className="w-24 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base text-slate-800 focus:border-slate-400 focus:bg-white outline-none transition-all"
                                                    value={config.inactiveAmount || 30}
                                                    onChange={(e) => onChange({ ...config, inactiveAmount: parseInt(e.target.value) || 30 })}
                                                    disabled={disabled}
                                                />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ng�y li�n t?c</span>
                                            </div>
                                            <div className="p-3.5 bg-blue-50/50 rounded-xl flex items-start gap-2.5 border border-blue-100/50">
                                                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">Hệ thống s? qu�t dảnh k? nh?ng Khách hàng kh�ng M? ho?c Click link trong {config.inactiveAmount || 30} ng�y d? dua v�o lu?ng.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. SINH NH?T */}
                                    <ConfigItem
                                        label="Ch�cĐã mởng Sinh nh?t"
                                        desc="Ch?y v�o ng�y sinh ho?c trước/sau"
                                        icon={Cake}
                                        isSelected={config.dateField === 'dateOfBirth'}
                                        onClick={() => {
                                            const newLabel = getLabelForType('date', '', undefined, 'dateOfBirth');
                                            onChange({ ...config, dateField: 'dateOfBirth', offsetType: config.offsetType || 'on', offsetValue: config.offsetValue || 0 }, newLabel);
                                        }}
                                    />

                                    {/* 3. K? NI?M */}
                                    <ConfigItem
                                        label="M?ng ng�y K? ni?m"
                                        desc="Theo ng�y k? ni?m ri�ng c?a kh�ch"
                                        icon={Calendar}
                                        isSelected={config.dateField === 'anniversaryDate'}
                                        onClick={() => {
                                            const newLabel = getLabelForType('date', '', undefined, 'anniversaryDate');
                                            onChange({ ...config, dateField: 'anniversaryDate', offsetType: config.offsetType || 'on', offsetValue: config.offsetValue || 0 }, newLabel);
                                        }}
                                    />

                                    {/* 4. NG�Y GIA NH?P */}
                                    <ConfigItem
                                        label="K? ni?m Ng�y gia nh?p"
                                        desc="Ch?y h�ng nam v�o ng�y kh�ch dang k�"
                                        icon={History}
                                        isSelected={config.dateField === 'joinedAt'}
                                        onClick={() => {
                                            const newLabel = getLabelForType('date', '', undefined, 'joinedAt');
                                            onChange({ ...config, dateField: 'joinedAt', offsetType: config.offsetType || 'on', offsetValue: config.offsetValue || 0 }, newLabel);
                                        }}
                                    />

                                    {/* 5. NG�Y C? TH? */}
                                    <ConfigItem
                                        label="Ng�y c? th? (L?, S? ki?n)"
                                        desc="Ch?y v�oĐã mởt ng�y c? dảnh duy nh?t"
                                        icon={Clock}
                                        isSelected={config.dateField === 'specificDate'}
                                        onClick={() => {
                                            const newLabel = getLabelForType('date', '', undefined, 'specificDate');
                                            onChange({ ...config, dateField: 'specificDate', specificDate: config.specificDate || '' }, newLabel);
                                        }}
                                    />

                                    {config.dateField === 'specificDate' && (
                                        <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 shadow-sm mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Calendar className="w-4 h-4" /></div>
                                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Ch?n ng�y di?n ra s? ki?n</span>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <input
                                                    type="date"
                                                    className="flex-1 h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-slate-400 focus:bg-white outline-none transition-all"
                                                    value={config.specificDate || ''}
                                                    onChange={(e) => {
                                                        const newCfg = { ...config, specificDate: e.target.value };
                                                        onChange(newCfg, getLabelForType('date', '', undefined, 'specificDate'));
                                                    }}
                                                    disabled={disabled}
                                                />
                                            </div>
                                            <div className="p-3.5 bg-blue-50/50 rounded-xl flex items-start gap-2.5 border border-blue-100/50">
                                                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">V� d?: Thi?t l?p ng�y 14/02 d? b?t d?u chuong tr�nh Valentine cho to�n b? Khách hàng du?c chọn.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 6. THEO CUSTOM FIELD NG�Y */}
                                    <ConfigItem
                                        label="Theo Custom Field Ng�y"
                                        desc="Trước/sau ng�y luu trong tru?ng t�y chọnh"
                                        icon={ArrowRight}
                                        isSelected={config.dateField === 'custom_field_date'}
                                        onClick={() => onChange(
                                            { ...config, dateField: 'custom_field_date', customFieldKey: config.customFieldKey || '', offsetType: config.offsetType || 'before', offsetValue: config.offsetValue ?? 1, triggerHour: config.triggerHour ?? 8 },
                                            getLabelForType('date', '', undefined, 'custom_field_date')
                                        )}
                                    />

                                    {config.dateField === 'custom_field_date' && (
                                        <div className="p-5 bg-white border border-violet-200 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 shadow-sm mb-4">
                                            {/* Field Key */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-violet-50 rounded-lg text-violet-500"><Calendar className="w-3.5 h-3.5" /></div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Tru?ng ng�y (Custom Field Key)</span>
                                                </div>
                                                {customFieldDefs.length > 0 ? (
                                                    <select
                                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-violet-400 outline-none transition-all"
                                                        value={config.customFieldKey || ''}
                                                        onChange={e => onChange({ ...config, customFieldKey: e.target.value }, getLabelForType('date', '', undefined, 'custom_field_date'))}
                                                        disabled={disabled}
                                                    >
                                                        <option value="">-- Ch?n tru?ng ng�y --</option>
                                                        {customFieldDefs.map(f => (
                                                            <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        placeholder="Nh?p key, v� d?: ngay_dat_lich"
                                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-violet-400 focus:bg-white outline-none transition-all"
                                                        value={config.customFieldKey || ''}
                                                        onChange={e => onChange({ ...config, customFieldKey: e.target.value }, getLabelForType('date', '', undefined, 'custom_field_date'))}
                                                        disabled={disabled}
                                                    />
                                                )}
                                                <p className="text-[9px] text-slate-400">Key c?a custom field ch?a gi� tr? ng�y (YYYY-MM-DD ho?c DD/MM/YYYY)</p>
                                            </div>

                                            {/* Offset Config */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-pink-50 rounded-lg text-pink-500"><Clock className="w-3.5 h-3.5" /></div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Th?i di?m k�ch ho?t</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <Select
                                                        label="Ki?u"
                                                        options={[
                                                            { value: 'before', label: 'Trước X ng�y' },
                                                            { value: 'on', label: '��ng ng�y' },
                                                            { value: 'after', label: 'Sau X ng�y' },
                                                        ]}
                                                        value={config.offsetType || 'before'}
                                                        onChange={val => onChange({ ...config, offsetType: val }, getLabelForType('date', '', undefined, 'custom_field_date'))}
                                                    />
                                                    {config.offsetType !== 'on' && (
                                                        <Input
                                                            label="S? ng�y (X)"
                                                            type="number"
                                                            value={config.offsetValue ?? 1}
                                                            onChange={e => onChange({ ...config, offsetValue: parseInt(e.target.value) || 0 }, getLabelForType('date', '', undefined, 'custom_field_date'))}
                                                        />
                                                    )}
                                                    <Input
                                                        label="Gi? (0-23)"
                                                        type="number"
                                                        value={config.triggerHour ?? 8}
                                                        onChange={e => onChange({ ...config, triggerHour: Math.min(23, Math.max(0, parseInt(e.target.value) || 0)) })}
                                                    />
                                                    <Input
                                                        label="Ph�t (0-59)"
                                                        type="number"
                                                        value={config.triggerMinute ?? 0}
                                                        onChange={e => onChange({ ...config, triggerMinute: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)) })}
                                                    />
                                                </div>
                                                <p className="text-[9px] italic text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    {(() => {
                                                        const hh = String(config.triggerHour ?? 8).padStart(2, '0');
                                                        const mm = String(config.triggerMinute ?? 0).padStart(2, '0');
                                                        const field = config.customFieldKey || 'field';
                                                        const x = config.offsetValue ?? 1;
                                                        if (config.offsetType === 'before') return `K�ch ho?t ${x} ng�y TRU?C [${field}] l�c ${hh}:${mm}`;
                                                        if (config.offsetType === 'after') return `K�ch ho?t ${x} ng�y SAU [${field}] l�c ${hh}:${mm}`;
                                                        return `K�ch ho?t d�ng ng�y [${field}] l�c ${hh}:${mm}`;
                                                    })()}
                                                </p>
                                            </div>

                                            {/* Target List */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500"><Target className="w-3.5 h-3.5" /></div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Danh sách theo d�i</span>
                                                </div>
                                                <div className="flex bg-slate-100 p-0.5 rounded-lg w-full">
                                                    <button onClick={() => onChange({ ...config, targetLists: 'all', targetListIds: [] })} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!config.targetLists || config.targetLists === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>T?t c?</button>
                                                    <button onClick={() => onChange({ ...config, targetLists: 'specific', targetListIds: [] })} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${config.targetLists === 'specific' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Danh sách c? th?</button>
                                                </div>
                                                {config.targetLists === 'specific' && (
                                                    <div className="space-y-2">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="T�m danh sách..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold outline-none focus:border-slate-400 transition-all" />
                                                        </div>
                                                        <div className="space-y-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50 max-h-40 overflow-y-auto custom-scrollbar">
                                                            {lists.filter(l => isManualList(l) && l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                                                                const isChecked = (config.targetListIds || []).includes(item.id);
                                                                return (
                                                                    <div key={item.id}
                                                                        onClick={() => {
                                                                            const cur = config.targetListIds || [];
                                                                            const next = isChecked ? cur.filter((id: string) => id !== item.id) : [...cur, item.id];
                                                                            onChange({ ...config, targetListIds: next });
                                                                        }}
                                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-white shadow-sm ring-1 ring-violet-400/30' : 'hover:bg-white/50'}`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <List className="w-3 h-3 text-blue-500 shrink-0" />
                                                                            <div>
                                                                                <p className="text-xs font-semibold text-slate-700">{item.name}</p>
                                                                                <p className="text-[9px] text-slate-400">{item.count || 0} li�n h?</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                                            {isChecked && <Check className="w-3 h-3" />}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-3 bg-violet-50/50 rounded-xl flex items-start gap-2.5 border border-violet-100">
                                                    <Info className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-violet-700 font-medium leading-relaxed">
                                                        Cron job h�ng ng�y qu�t subscriber c� field <b>{config.customFieldKey || 'ng�y'}</b> khớp di?u ki?n v� t? d?ng enroll v�o flow.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(config.dateField === 'dateOfBirth' || config.dateField === 'anniversaryDate' || config.dateField === 'joinedAt' || config.dateField === 'specificDate') && (
                                        <>
                                            {/* Offset selection */}
                                            <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 shadow-sm mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-pink-50 rounded-lg text-pink-500"><Clock className="w-4 h-4" /></div>
                                                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Th?i di?m k�ch ho?t</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Select
                                                        label="Ki?u khớp"
                                                        options={[
                                                            { value: 'on', label: '��ng ng�y' },
                                                            { value: 'before', label: 'Trước X ng�y' },
                                                            { value: 'after', label: 'Sau X ng�y' }
                                                        ]}
                                                        value={config.offsetType || 'on'}
                                                        onChange={(val) => {
                                                            const newCfg = { ...config, offsetType: val };
                                                            onChange(newCfg, getLabelForType('date', '', undefined, config.dateField));
                                                        }}
                                                    />
                                                    {config.offsetType !== 'on' && (
                                                        <Input
                                                            label="S? ng�y (X)"
                                                            type="number"
                                                            value={config.offsetValue || 1}
                                                            onChange={(e) => {
                                                                const newCfg = { ...config, offsetValue: parseInt(e.target.value) || 0 };
                                                                onChange(newCfg, getLabelForType('date', '', undefined, config.dateField));
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Target Audience selection */}
                                            <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 animate-in slide-in-from-top-2 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><Target className="w-4 h-4" /></div>
                                                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">�?i tu?ng �p d?ng</span>
                                                    </div>
                                                </div>

                                                <div className="flex bg-slate-100 p-0.5 rounded-lg w-full">
                                                    <button
                                                        onClick={() => onChange({ ...config, targetLists: 'all', targetListIds: [], targetSegmentIds: [] })}
                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!config.targetLists || config.targetLists === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        T?t c?
                                                    </button>
                                                    <button
                                                        onClick={() => onChange({ ...config, targetLists: 'specific', targetListIds: [] })}
                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${config.targetLists === 'specific' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Danh sách c? th?
                                                    </button>
                                                </div>

                                                {config.targetLists === 'specific' && (
                                                    <div className="mt-4 space-y-4">
                                                        <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2.5 border border-amber-200/50">
                                                            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                                                Ch? k�ch ho?t theo ng�y d?i v?i nh?ng ngu?i c� trong danh sách du?c chọn du?i d�y.
                                                                <span className="block font-medium text-slate-500 mt-0.5 mt-0.5 italic">Nữu h? kh�ng thu?c danh sách n�y, flow s? kh�ng t? d?ng b?t d?u.</span>
                                                            </p>
                                                        </div>
                                                        {/* Sub-tabs for Specific Selection */}
                                                        <div className="flex bg-slate-100/50 p-0.5 rounded-lg w-full mb-2">
                                                            <button
                                                                onClick={() => setBirthdayTab('list')}
                                                                className={`flex-1 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${birthdayTab === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                Danh sách
                                                            </button>
                                                            <button
                                                                onClick={() => setBirthdayTab('sync')}
                                                                className={`flex-1 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${birthdayTab === 'sync' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                Ngu?n Sync
                                                            </button>
                                                            <button
                                                                onClick={() => setBirthdayTab('segment')}
                                                                className={`flex-1 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${birthdayTab === 'segment' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                Ph�n kh�c
                                                            </button>
                                                        </div>

                                                        {/* Local Search for Birthday Lists */}
                                                        <div className="relative group mb-2">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-500 transition-colors" />
                                                            <input
                                                                value={searchTerm}
                                                                onChange={e => setSearchTerm(e.target.value)}
                                                                placeholder="T�m ki?m danh sách..."
                                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold outline-none focus:border-slate-400 transition-all"
                                                            />
                                                        </div>

                                                        <div className="space-y-1 custom-scrollbar border border-slate-100 rounded-xl p-1 bg-slate-50/50 max-h-48 overflow-y-auto">
                                                            {(birthdayTab === 'list' ? lists.filter(l => isManualList(l) && l.name.toLowerCase().includes(searchTerm.toLowerCase())) :
                                                                birthdayTab === 'sync' ? lists.filter(l => isSyncList(l) && l.name.toLowerCase().includes(searchTerm.toLowerCase())) :
                                                                    segments.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))).map(item => {
                                                                        const isChecked = birthdayTab === 'segment'
                                                                            ? (config.targetSegmentIds || []).includes(item.id)
                                                                            : (config.targetListIds || []).includes(item.id);
                                                                        return (
                                                                            <div key={item.id}
                                                                                onClick={() => {
                                                                                    if (birthdayTab === 'segment') {
                                                                                        const currentSegIds = config.targetSegmentIds || [];
                                                                                        const newSegIds = isChecked
                                                                                            ? currentSegIds.filter((id: string) => id !== item.id)
                                                                                            : [...currentSegIds, item.id];
                                                                                        onChange({ ...config, targetSegmentIds: newSegIds });
                                                                                    } else {
                                                                                        const currentListIds = config.targetListIds || [];
                                                                                        const newListIds = isChecked
                                                                                            ? currentListIds.filter((id: string) => id !== item.id)
                                                                                            : [...currentListIds, item.id];
                                                                                        onChange({ ...config, targetListIds: newListIds });
                                                                                    }
                                                                                }}
                                                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-white shadow-sm ring-1 ring-emerald-500/20' : 'hover:bg-white/50'}`}
                                                                            >
                                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                                    <div className="w-5 h-5 flex items-center justify-center rounded">
                                                                                        {birthdayTab === 'sync' ? (
                                                                                            item.source === 'MISA CRM' ? <MisaIcon className="w-3 h-3" /> : <GoogleSheetsIcon className="w-3 h-3" />
                                                                                        ) : birthdayTab === 'segment' ? (
                                                                                            <Layers className="w-3 h-3 text-orange-500" />
                                                                                        ) : (
                                                                                            <List className="w-3 h-3 text-blue-500" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="overflow-hidden">
                                                                                        <p className={`text-xs font-semibold truncate ${isChecked ? 'text-slate-800' : 'text-slate-600'}`}>{item.name}</p>
                                                                                        <p className="text-[9px] text-slate-400 font-medium">
                                                                                            {item.count || 0} li�n h?
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                                                                                    {isChecked && <Check className="w-3 h-3" />}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                        </div>

                                                        {/* Total Estimate Footer */}
                                                        <div className="mt-3 px-1 flex items-center justify-between border-t border-slate-100 pt-2">
                                                            <span className="text-[10px] font-semibold text-slate-500">U?c t�nh (Unique):</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="w-3 h-3 text-emerald-600" />
                                                                <span className="text-[10px] font-bold text-slate-700">
                                                                    {isCalculating ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin inline-block" />
                                                                    ) : (
                                                                        `~${estimatedCount !== null ? estimatedCount : 0} li�n h?`
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <IntegrationGuideModal
                isOpen={showGuide}
                onClose={() => setShowGuide(false)}
                formId={config.targetId}
                formName={selectedForm?.name || 'Form'}
                fields={selectedForm?.fields || []}
            />
        </div>
    );
};

export default TriggerConfig;
