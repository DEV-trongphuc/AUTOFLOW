
import React, { useState, useEffect, useMemo } from 'react';
import { Save, Clock, Settings2, Power, Zap, Shield, Calendar, Target, Users, Globe, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Flow } from '../../../types';
import Card from '../../common/Card';
import Input from '../../common/Input';
import Badge from '../../common/Badge';
import ExitConditions from '../config/ExitConditions';
import BounceHandling from '../config/BounceHandling';
import AdvancedExitTrigger from '../config/AdvancedExitTrigger';
import Button from '../../common/Button';

interface FlowSettingsTabProps {
    flow: Flow;
    onUpdate: (data: Partial<Flow>, isSilent?: boolean, skipApi?: boolean) => void;
}

const FlowSettingsTab: React.FC<FlowSettingsTabProps> = ({ flow, onUpdate }) => {
    const triggerStep = flow.steps.find(s => s.type === 'trigger');

    // Check Form, Purchase, and Custom Event triggers as Priority
    const isPriorityTrigger = ['form', 'purchase', 'custom_event'].includes(triggerStep?.config?.type || '');
    // Determine if the entire flow is archived
    const isFlowArchived = flow.status === 'archived';

    const defaultConfig = useMemo(() => {
        // Default frequency: 'recurring' for Priority triggers, 'one-time' for others
        const defaultFrequency = isPriorityTrigger ? 'recurring' : 'one-time';

        return {
            frequencyCap: 3,
            maxMessagesPerDay: 0,
            activeDays: [0, 1, 2, 3, 4, 5, 6],
            startTime: '08:00',
            endTime: '21:00',
            exitConditions: ['unsubscribed'],
            type: 'realtime' as const,
            frequency: defaultFrequency as 'one-time' | 'recurring',
            enrollmentCooldownHours: 12,
            allowMultiple: false,
            maxEnrollments: 0,
            bounceBehavior: 'stop' as const,
            advancedExit: {}
        };
    }, [isPriorityTrigger]);

    // --- LOCAL STATE FOR MANUAL SAVE ---
    const [localName, setLocalName] = useState(flow.name);
    const [localDesc, setLocalDesc] = useState(flow.description);
    // Initialize config, ensuring default frequency is applied IF config.frequency is missing
    const [localConfig, setLocalConfig] = useState(() => {
        const merged = { ...defaultConfig, ...(flow.config || {}) };
        // Force the default frequency if the flow config doesn't explicitly have one AND it's a new setup
        if (!flow.config?.frequency) {
            merged.frequency = defaultConfig.frequency;
        }
        return merged;
    });
    const [isModified, setIsModified] = useState(false);

    // Sync state if prop changes externally (e.g. refresh)
    useEffect(() => {
        setLocalName(flow.name);
        setLocalDesc(flow.description);
        setLocalConfig(prev => {
            // We carefully merge to preserve local edits if needed, but here we just resync from props
            // For checking defaults on re-sync:
            const incoming = (flow.config || {}) as Record<string, unknown>;
            // If incoming matches prev (structural equality), keep prev to avoid cursor jumps if possible?
            // But here we prioritize truth from props.
            return {
                ...defaultConfig,
                ...incoming,
                // If existing config has no frequency, use our intelligent default
                frequency: (incoming.frequency as typeof defaultConfig.frequency) || defaultConfig.frequency
            };
        });
        setIsModified(false);
    }, [flow.id, defaultConfig, flow.config]); // Added flow.config dependency

    const handleSave = () => {
        // Prevent saving if flow is archived
        if (isFlowArchived) return;

        onUpdate({
            name: localName,
            description: localDesc,
            config: localConfig
        }, false);
        setIsModified(false);
    };

    // Helper: Update local config AND sync to parent (draft mode - no API)
    // This ensures that if the user hits Global Save (Header), it captures these changes.
    const applyUpdate = (updates: Partial<typeof localConfig>) => {
        if (isFlowArchived) return;

        setLocalConfig(prev => {
            const next = { ...prev, ...updates };
            // Sync to parent immediately (Draft Mode: skipApi=true)
            onUpdate({ config: next }, true, true);
            return next;
        });
        // Note: isModified will be reset to false when the prop updates from parent, 
        // effectively disabling the Local Save button until another change. 
        // This is a tradeoff to support Global Save.
        setIsModified(true);
    };

    const updateConfig = (key: string, value: any) => {
        applyUpdate({ [key]: value });
    };

    const updateConfigs = (updates: Partial<typeof localConfig>) => {
        applyUpdate(updates);
    };

    const handleCapping = (delta: number) => {
        // If flow is archived, prevent changes
        if (isFlowArchived) return;
        const current = localConfig.frequencyCap || 1;
        const next = Math.max(1, Math.min(5, current + delta));
        updateConfig('frequencyCap', next);
    };

    const toggleDay = (dayIdx: number) => {
        // If flow is archived, prevent changes
        if (isFlowArchived) return;
        const currentDays = localConfig.activeDays || [];
        const nextDays = currentDays.includes(dayIdx)
            ? currentDays.filter((d: number) => d !== dayIdx)
            : [...currentDays, dayIdx].sort();
        updateConfig('activeDays', nextDays);
    };

    const timeToPercent = (timeStr: string) => {
        const [h, m] = (timeStr || '00:00').split(':').map(Number);
        return ((h * 60 + m) / 1440) * 100;
    };

    const scheduleBarStyles = useMemo(() => {
        // Schedule bar should always reflect actual config, regardless of priority bypass
        const start = timeToPercent(localConfig.startTime);
        const end = timeToPercent(localConfig.endTime);
        return {
            left: `${start}%`,
            width: `${Math.max(2, end - start)}%`
        };
    }, [localConfig.startTime, localConfig.endTime]);

    const days = [
        { label: 'T2', id: 0 }, { label: 'T3', id: 1 }, { label: 'T4', id: 2 },
        { label: 'T5', id: 3 }, { label: 'T6', id: 4 }, { label: 'T7', id: 5 }, { label: 'CN', id: 6 },
    ];

    const getPriorityLabel = () => {
        const type = triggerStep?.config?.type;
        if (type === 'purchase') return 'Hành động Mua hàng';
        if (type === 'custom_event') return 'Sự kiện Tùy chỉnh';
        return 'Form Đăng ký';
    };

    return (
        <div className="p-5 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">

            {/* WARNING FOR PRIORITY TRIGGER */}
            {isPriorityTrigger && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-orange-900 uppercase tracking-tight">Chế độ ưu tiên (Real-time Transaction)</p>
                        <p className="text-[11px] font-medium text-orange-800 leading-relaxed mt-1">
                            Kịch bản này được kích hoạt bởi <b>{getPriorityLabel()}</b>.
                            Hệ thống sẽ <b>Bỏ qua</b> các giới hạn về khung giờ, ngày nghỉ và tần suất gửi để đảm bảo phản hồi ngay lập tức cho Khách hàng.
                        </p>
                    </div>
                </div>
            )}

            {/* GENERAL CONFIG */}
            <section className="mb-6 space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shadow-sm"><Settings2 className="w-3.5 h-3.5" /></div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Thông tin chung</h3>
                </div>
                <Card className="rounded-[20px] border border-slate-200 shadow-sm p-5 bg-white" noPadding>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Tên định danh Flow"
                                value={localName}
                                onChange={(e) => {
                                    setLocalName(e.target.value);
                                    // Also sync name to parent if needed? 
                                    // For now focusing on config. 
                                    // But consistency suggests we should sync.
                                    onUpdate({ name: e.target.value }, true, true);
                                }}
                                className="shadow-none border-slate-200 focus:border-blue-500"
                                disabled={isFlowArchived} // Disable if archived
                            />
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Mô tả / Ghi chú</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all min-h-[80px]"
                                    value={localDesc}
                                    onChange={(e) => {
                                        setLocalDesc(e.target.value);
                                        onUpdate({ description: e.target.value }, true, true);
                                    }}
                                    placeholder="Mục tiêu chiến dịch..."
                                    disabled={isFlowArchived} // Disable if archived
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1">Loại quy trình</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateConfig('type', 'realtime')}
                                        className={`p-3 rounded-xl text-left transition-all border-2 flex items-center gap-3 ${localConfig.type !== 'batch' ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                        disabled={isFlowArchived} // Disable if archived
                                    >
                                        <div className={`p-1.5 rounded-lg ${localConfig.type !== 'batch' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase ${localConfig.type !== 'batch' ? 'text-blue-700' : 'text-slate-600'}`}>Real-time</p>
                                            <p className="text-[9px] text-slate-400 font-medium">Xử lý ngay</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => updateConfig('type', 'batch')}
                                        className={`p-3 rounded-xl text-left transition-all border-2 flex items-center gap-3 ${localConfig.type === 'batch' ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                        disabled={isFlowArchived} // Disable if archived
                                    >
                                        <div className={`p-1.5 rounded-lg ${localConfig.type === 'batch' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase ${localConfig.type === 'batch' ? 'text-indigo-700' : 'text-slate-600'}`}>Batch</p>
                                            <p className="text-[9px] text-slate-400 font-medium">Tỉ lệ</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <Globe className="w-4 h-4 text-slate-400" />
                                <p className="text-[10px] text-slate-500 font-medium">Tự động gắn UTM tag: <span className="font-bold text-slate-700">{localName}</span></p>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* ENROLLMENT RULES */}
            <section className="mb-6 space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100 shadow-sm"><Users className="w-3.5 h-3.5" /></div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Quy tắc tham gia</h3>
                </div>
                <Card className="rounded-[20px] border border-slate-200 shadow-sm p-6 bg-white" noPadding>
                    <div className="p-6 space-y-8">
                        {/* Frequency Toggle - Row of 3 spread out */}
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">Tần suất tham gia</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => {
                                        updateConfigs({ frequency: 'one-time', allowMultiple: false });
                                    }}
                                    className={`p-4 rounded-2xl text-left transition-all border-2 flex items-center gap-4 ${(localConfig.frequency || 'one-time') === 'one-time' ? 'bg-purple-50 border-purple-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    disabled={isFlowArchived}
                                >
                                    <div className={`p-2 rounded-xl ${(localConfig.frequency || 'one-time') === 'one-time' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase ${(localConfig.frequency || 'one-time') === 'one-time' ? 'text-purple-700' : 'text-slate-600'}`}>Một lần</p>
                                        <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Chỉ tham gia 1 lần duy nhất</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        updateConfigs({ frequency: 'recurring', allowMultiple: false });
                                    }}
                                    className={`p-4 rounded-2xl text-left transition-all border-2 flex items-center gap-4 ${localConfig.frequency === 'recurring' && !localConfig.allowMultiple ? 'bg-pink-50 border-pink-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    disabled={isFlowArchived}
                                >
                                    <div className={`p-2 rounded-xl ${localConfig.frequency === 'recurring' && !localConfig.allowMultiple ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <RefreshCw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase ${localConfig.frequency === 'recurring' && !localConfig.allowMultiple ? 'text-pink-700' : 'text-slate-600'}`}>Lặp lại</p>
                                        <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Xong lượt này mới vào lại</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        updateConfigs({ frequency: 'recurring', allowMultiple: true });
                                    }}
                                    className={`p-4 rounded-2xl text-left transition-all border-2 flex items-center gap-4 ${localConfig.allowMultiple ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    disabled={isFlowArchived}
                                >
                                    <div className={`p-2 rounded-xl ${localConfig.allowMultiple ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase ${localConfig.allowMultiple ? 'text-emerald-700' : 'text-slate-600'}`}>Liên tục</p>
                                        <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Luôn vào luồng khi có sự kiện</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Secondary Settings (Cooldown for Recurring, Max for Continuous) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                            {/* Cooldown Settings - Only for "Lặp lại" (recurring without allowMultiple) */}
                            <div className={`${localConfig.frequency !== 'recurring' || localConfig.allowMultiple ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">Thời gian chờ (Cool-down)</h4>
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="w-4 h-4 text-slate-400 group-hover:text-pink-500 transition-colors" /></div>
                                    <div className="flex-1 flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="720"
                                            value={localConfig.enrollmentCooldownHours ?? 12}
                                            onChange={(e) => updateConfig('enrollmentCooldownHours', parseInt(e.target.value) || 0)}
                                            className="w-14 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-black text-slate-700 outline-none focus:border-pink-500 text-center shadow-inner"
                                            disabled={isFlowArchived || localConfig.frequency !== 'recurring' || localConfig.allowMultiple}
                                        />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Giờ</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium max-w-[140px] leading-tight text-right">Khoảng cách tối thiểu giữa 2 lần tham gia.</p>
                                </div>
                            </div>

                            {/* Max Enrollments - Only for "Liên tục" (allowMultiple = true) */}
                            <div className={`${!localConfig.allowMultiple ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest ml-1">Giới hạn số lần (Max)</h4>
                                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><Target className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" /></div>
                                    <div className="flex-1 flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={localConfig.maxEnrollments ?? 0}
                                            onChange={(e) => updateConfig('maxEnrollments', parseInt(e.target.value) || 0)}
                                            className="w-14 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-black text-slate-700 outline-none focus:border-emerald-500 text-center shadow-inner"
                                            disabled={isFlowArchived || !localConfig.allowMultiple}
                                        />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Lần</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium max-w-[140px] leading-tight text-right">Tổng số lần tối đa. Để <b>0</b> nếu muốn không giới hạn.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* SCHEDULING - HIDDEN FOR PRIORITY TRIGGERS, DISABLED IF ARCHIVED */}
            {!isPriorityTrigger && (
                <section className={`mb-6 space-y-3 transition-opacity ${isFlowArchived ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="flex items-center gap-2 px-1">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 shadow-sm"><Calendar className="w-3.5 h-3.5" /></div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Lịch trình gửi</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="rounded-[20px] border border-slate-200 shadow-sm p-5 bg-white md:col-span-1" noPadding>
                            <div className="p-5 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-slate-400" />
                                        <h4 className="text-xs font-bold text-slate-700 uppercase">Tần suất (Cap)</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Giới hạn số email tối đa gửi cho 1 người / 24h.</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <button onClick={() => handleCapping(-1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-600 shadow-sm active:scale-90 transition-all font-bold text-lg" disabled={isFlowArchived}>-</button>
                                    <div className="flex-1 text-center">
                                        <span className="text-xl font-black text-slate-800">{localConfig.frequencyCap}</span>
                                    </div>
                                    <button onClick={() => handleCapping(1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-600 shadow-sm active:scale-90 transition-all font-bold text-lg" disabled={isFlowArchived}>+</button>
                                </div>
                            </div>
                        </Card>

                        {/* Max Messages Per Day */}
                        <Card className="rounded-[20px] border border-slate-200 shadow-sm p-5 bg-white md:col-span-1" noPadding>
                            <div className="p-5 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-slate-400" />
                                        <h4 className="text-xs font-bold text-slate-700 uppercase">Max Tin / Ngày</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Giới hạn tổng tin nhắn (email + Zalo + Meta) / ngày. Để <b>0</b> là không giới hạn.</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <button
                                        onClick={() => updateConfig('maxMessagesPerDay', Math.max(0, (localConfig.maxMessagesPerDay ?? 0) - 1))}
                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-600 shadow-sm active:scale-90 transition-all font-bold text-lg"
                                        disabled={isFlowArchived}
                                    >-</button>
                                    <div className="flex-1 text-center">
                                        <span className="text-xl font-black text-slate-800">{localConfig.maxMessagesPerDay ?? 0}</span>
                                    </div>
                                    <button
                                        onClick={() => updateConfig('maxMessagesPerDay', (localConfig.maxMessagesPerDay ?? 0) + 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-600 shadow-sm active:scale-90 transition-all font-bold text-lg"
                                        disabled={isFlowArchived}
                                    >+</button>
                                </div>
                            </div>
                        </Card>

                        <Card className="rounded-[20px] border border-slate-200 shadow-sm md:col-span-2 bg-white" noPadding>
                            <div className="p-5 space-y-5">
                                {/* Time Range */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khung giờ vàng</span>
                                        <Badge variant='warning' className="text-[8px] px-1.5 py-0">GMT+7</Badge>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full relative overflow-hidden mb-4">
                                        <div
                                            className="absolute h-full rounded-full shadow-sm bg-emerald-500"
                                            style={scheduleBarStyles}
                                        ></div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={localConfig.startTime}
                                                onChange={(e) => updateConfig('startTime', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-slate-400 outline-none text-center"
                                                disabled={isFlowArchived}
                                            />
                                        </div>
                                        <span className="text-slate-300 font-black">-</span>
                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={localConfig.endTime}
                                                onChange={(e) => updateConfig('endTime', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-slate-400 outline-none text-center"
                                                disabled={isFlowArchived}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Active Days */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Ngày hoạt động</label>
                                    <div className="flex gap-1.5">
                                        {days.map((day) => {
                                            const isActive = (localConfig.activeDays || []).includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`
                                            flex-1 py-2.5 rounded-lg text-[10px] font-bold border transition-all shadow-sm
                                            ${isActive
                                                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}
                                        `}
                                                    disabled={isFlowArchived}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>
            )}

            {/* SMART INTERRUPTS */}
            <section className={`mb-8 space-y-3 ${isFlowArchived ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="flex items-center gap-2 px-1">
                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 shadow-sm"><Power className="w-3.5 h-3.5" /></div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Quy tắc ngắt luồng</h3>
                </div>
                <Card className="rounded-[20px] border border-slate-200 shadow-sm p-5 bg-white" noPadding>
                    <div className="p-5">

                        {/* EXIT CONDITIONS */}
                        <ExitConditions
                            conditions={localConfig.exitConditions || []}
                            onChange={(c) => updateConfig('exitConditions', c)}
                            disabled={isFlowArchived}
                        />

                        <div className="mt-8">
                            <BounceHandling
                                value={localConfig.bounceBehavior || 'stop'}
                                onChange={(val) => {
                                    updateConfig('bounceBehavior', val);
                                    // FORCE 'bounced' into exitConditions if not present (since this setting implies it's handled)
                                    // Logic: If user sets behavior, they expect bounce checking. 
                                    const currentExits = localConfig.exitConditions || [];
                                    if (!currentExits.includes('bounced')) {
                                        updateConfig('exitConditions', [...currentExits, 'bounced']);
                                    }
                                }}
                                disabled={isFlowArchived}
                            />
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <AdvancedExitTrigger
                                config={localConfig.advancedExit || {}}
                                onChange={(cfg) => updateConfig('advancedExit', cfg)}
                                disabled={isFlowArchived}
                            />
                        </div>
                    </div>
                </Card>
            </section>

            {/* MANUAL SAVE BUTTON AREA */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                    size="lg"
                    onClick={handleSave}
                    icon={Save}
                    disabled={!isModified || isFlowArchived} // Disable if not modified OR archived
                    className={`
                px-8 h-12 rounded-xl shadow-xl transition-all
                ${isModified && !isFlowArchived
                            ? 'bg-slate-900 text-white hover:bg-black shadow-slate-300'
                            : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'}
            `}
                >
                    {isModified ? 'Lưu cấu hình' : 'Đã đồng bộ'}
                </Button>
            </div>
        </div >
    );
};

export default FlowSettingsTab;
