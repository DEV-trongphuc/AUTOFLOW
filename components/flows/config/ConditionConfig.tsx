import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { GitMerge, Clock, MailOpen, MousePointer2, MessageSquare, UserMinus, AlertTriangle, Search, CheckSquare, Square, RefreshCw, Unlink, MailCheck, Bell, Link } from 'lucide-react';
import { Flow } from '../../../types';
import { api } from '../../../services/storageAdapter';
import Radio from '../../common/Radio';
import Input from '../../common/Input';
import Select from '../../common/Select';
// @ts-ignore: `compileHTML` is a named export from `htmlCompiler`
import { compileHTML } from '../../templates/EmailEditor/utils/htmlCompiler';

interface ConditionConfigProps {
    config: Record<string, any>;
    onChange: (newConfig: Record<string, any>) => void;
    flow?: Flow;
    stepId?: string;
    disabled?: boolean;
}

const ConditionConfig: React.FC<ConditionConfigProps> = ({ config, onChange, flow, stepId, disabled }) => {
    const [availableLinks, setAvailableLinks] = useState<any[]>([]);
    const [parentEmailStep, setParentEmailStep] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const linkContainerRef = useRef<HTMLDivElement>(null);

    // Convert old single linkTarget to array if needed
    const selectedLinks: string[] = Array.isArray(config.linkTargets)
        ? config.linkTargets
        : (config.linkTarget ? [config.linkTarget] : []);

    const unitOptions = [
        { value: 'hours', label: 'Gi?' },
        { value: 'days', label: 'Ng�y' },
        { value: 'weeks', label: 'Tu?n' },
    ];

    useEffect(() => {
        if (!flow || !stepId) return;

        const findParentEmail = (currentId: string, visited: Set<string>): any => {
            if (visited.has(currentId)) return null;
            visited.add(currentId);
            // Find steps that point TO currentId
            const parentCandidates = flow.steps.filter(s =>
                s.nextStepId === currentId || s.yesStepId === currentId || s.noStepId === currentId || s.pathAStepId === currentId || s.pathBStepId === currentId
            );
            for (const parent of parentCandidates) {
                if (parent.type === 'action' || parent.type === 'zalo_zns') return parent;
                if (parent.type === 'trigger' && parent.config?.type === 'campaign') return parent;
                const foundInBranch = findParentEmail(parent.id, visited);
                if (foundInBranch) return foundInBranch;
            }
            return null;
        };

        const parentEmail = findParentEmail(stepId, new Set<string>());
        setParentEmailStep(parentEmail);

        // [NEW] Persist targetStepId for backend tracking
        if (parentEmail && config.targetStepId !== parentEmail.id && !disabled) {
            onChange({ ...config, targetStepId: parentEmail.id });
        }

        if (parentEmail) {
            setScanning(true);
            const scanLinks = async () => {
                let htmlToCheck = parentEmail.config.customHtml || '';
                let templateId = parentEmail.config.templateId;

                if (parentEmail.type === 'trigger' && parentEmail.config?.type === 'campaign' && parentEmail.config?.targetId) {
                    try {
                        const campRes = await api.get<any>(`campaigns/${parentEmail.config.targetId}`);
                        if (campRes.success) {
                            if (campRes.data.templateId) templateId = campRes.data.templateId;
                            if (campRes.data.contentBody) htmlToCheck = campRes.data.contentBody;
                        }
                    } catch (e) { console.error("Error fetching campaign template", e); }
                }

                if (templateId && templateId !== 'custom-html') {
                    // For ZNS, we don't have standard email templates, but might have link args.
                    // IMPORTANT: If parent is ZNS, we might need to fetch ZNS template specific content or just allow 'clicked' without specific links scan for now.
                    // For now, let's keep it simple. If it's ZNS, we might not find links easily unless we parse arguments.
                    if (parentEmail.type !== 'zalo_zns') {
                        const res = await api.get<any>(`templates/${templateId}`);
                        if (res.success) {
                            const tpl = res.data;
                            if (tpl.blocks) {
                                htmlToCheck = compileHTML(tpl.blocks, tpl.bodyStyle, tpl.name || 'temp');
                            } else {
                                htmlToCheck = tpl.htmlContent || '';
                            }
                        }
                    }
                }

                const links: any[] = [];
                // UPDATED REGEX: Supports attributes before href, and multiline content [\s\S]
                const regex = /<a\s+[^>]*?href\s*=\s*["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/gi;

                let match;
                let idx = 0;
                while ((match = regex.exec(htmlToCheck)) !== null) {
                    const url = match[1];
                    // Strip HTML tags from label and trim whitespace/newlines
                    const rawLabel = match[2];
                    const label = rawLabel.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim() || url;

                    if (!url.includes('{{unsubscribe_url}}') && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                        links.push({ id: `link-${idx++}`, label: label.substring(0, 50) || url, url: url });
                    }
                }

                const uniqueLinks = Array.from(new Map(links.map(item => [item.url, item])).values());
                setAvailableLinks(uniqueLinks);
                setScanning(false);
            };
            scanLinks();
        } else {
            setAvailableLinks([]);
        }
    }, [flow, stepId]);

    useEffect(() => {
        if (config.waitUnit === 'minutes') {
            onChange({ ...config, waitUnit: 'hours', waitDuration: 1 });
        }
    }, [config.waitUnit]);

    const handleTypeChange = (val: string) => {
        if (disabled) return;
        const updates: Record<string, any> = {
            ...config,
            conditionType: val,
            linkTargets: val === 'clicked' ? selectedLinks : []
        };

        // UX Defaults:
        // - Delivery/Sent checks should be fast (1 hour).
        // - ZNS interactions (Click/Reply) are usually faster than email, default to 1 Day.
        // - Email interactions default to 3 Days.
        if (['delivered', 'zns_delivered', 'zns_failed'].includes(val)) {
            updates.waitDuration = 1;
            updates.waitUnit = 'hours';
        } else if (['zns_clicked', 'zns_replied'].includes(val)) {
            updates.waitDuration = 1;
            updates.waitUnit = 'days';
        } else {
            updates.waitDuration = 3;
            updates.waitUnit = 'days';
        }
        onChange(updates);

        // Auto-scroll to link selection if clicked
        if (val === 'clicked' || val === 'zns_clicked') {
            setTimeout(() => {
                linkContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const toggleLink = (url: string) => {
        if (disabled) return;
        let newTargets: string[] = [];

        if (selectedLinks.length === 0) {
            // If currently "Any" (empty), and user clicks a specific link, it means they want to UNCHECK it
            // So new targets = everything EXCEPT this one
            newTargets = availableLinks.filter(l => l.url !== url).map(l => l.url);
        } else if (selectedLinks.includes(url)) {
            newTargets = selectedLinks.filter(l => l !== url);
        } else {
            newTargets = [...selectedLinks, url];
            // If all are selected, revert to "Any" (empty array)
            if (newTargets.length === availableLinks.length) {
                newTargets = [];
            }
        }
        onChange({ ...config, linkTargets: newTargets });
    };

    const toggleAllLinks = () => {
        if (disabled) return;
        if (selectedLinks.length > 0) {
            onChange({ ...config, linkTargets: [] }); // Clear all = Match ANY (Behavior definition)
        } else {
            // Select specifically all found links (Restrictive)
            onChange({ ...config, linkTargets: availableLinks.map(l => l.url) });
        }
    };

    const getActionDescription = () => {
        switch (config.conditionType) {
            case 'opened': return 'm? mail';
            case 'clicked': return 'click link';
            case 'delivered': return 'nh?n du?c mail/tin';
            case 'unsubscribed': return 'Hủy đăng ký';
            default: return 'tuong t�c';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32">
            {!parentEmailStep ? (
                <div className="p-8 bg-rose-50 border-2 border-dashed border-rose-200 rounded-[32px] text-center space-y-4">
                    <Unlink className="w-8 h-8 mx-auto text-rose-500" />
                    <p className="text-sm font-black text-rose-700 uppercase">Thi?u ngu?n Email/ZNS</p>
                    <p className="text-xs text-rose-500">Vui l�ng n?i bu?c n�y SAUĐã mởt bu?c "G?i Email" ho?c "Zalo ZNS".</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                            <GitMerge className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Ngu?n theo d�i:</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-indigo-100 shadow-sm">
                            <Link className="w-3 h-3" />
                            <span className="truncate max-w-[180px]">{parentEmailStep.label}</span>
                        </div>
                    </div>

                    <Radio
                        label="H�nh d?ng ki?m tra:"
                        options={parentEmailStep?.type === 'zalo_zns' ? [
                            { id: 'zns_delivered', label: '�� nh?n (G?i th�nh c�ng)', icon: CheckSquare, desc: 'Tin nh?n d�đã gửi th�nh c�ng' },
                            { id: 'zns_clicked', label: 'Kh�ch Click Link', icon: MousePointer2, desc: 'Theo d�i chuy?n d?i link ZNS' },
                            { id: 'zns_replied', label: 'Kh�ch Phản hồi', icon: MessageSquare, desc: 'Kh�ch chat l?i v?i OA' },
                            { id: 'zns_failed', label: 'G?i th?t b?i', icon: AlertTriangle, desc: 'Gửi lại (H?t quota, sai s?...)' },
                        ] : [
                            { id: 'delivered', label: '�� nh?n (Delivered)', icon: MailCheck, desc: 'Nữu KH�NG -> Chuy?n nh�nh ELSE' },
                            { id: 'opened', label: 'Kh�chĐã mở Email', icon: MailOpen, desc: 'Theo d�i t? l? d?c' },
                            { id: 'clicked', label: 'Kh�ch Click Link', icon: MousePointer2, desc: 'Theo d�i chuy?n d?i' },
                            ...((parentEmailStep?.type === 'trigger' && parentEmailStep?.config?.type === 'campaign') ? [
                                { id: 'received_reminder', label: '�� nh?n Reminder', icon: Bell, desc: '�� nh?n Email Nh?c nh?' },
                                { id: 'opened_reminder', label: 'Đã mở Reminder', icon: MailOpen, desc: 'Đã mở Email Nh?c nh?' }
                            ] : []),
                            { id: 'unsubscribed', label: 'Hủy đăng ký', icon: UserMinus, desc: 'Ph�n lo?i kh�ch r?i di' },
                        ]}
                        value={config.conditionType || (parentEmailStep?.type === 'zalo_zns' ? 'zns_delivered' : 'opened')}
                        onChange={handleTypeChange}
                        disabled={disabled}
                    />

                    {/* Reminder ID Input */}
                    {['received_reminder', 'opened_reminder'].includes(config.conditionType) && (
                        <div className="p-5 bg-amber-50 border border-amber-200 rounded-[28px] space-y-2 mt-4">
                            <label className="text-[10px] font-black uppercase text-amber-700 tracking-widest">ID Chi?n d?ch Reminder</label>
                            <Input
                                placeholder="Nh?p ID Reminder (VD: 1, 2...)"
                                value={config.reminderId || ''}
                                onChange={(e) => onChange({ ...config, reminderId: e.target.value })}
                                disabled={disabled}
                            />
                            <p className="text-[10px] text-amber-600 italic">ID n�y n?m trong c�i d?t Reminder c?a Chi?n d?ch.</p>
                        </div>
                    )}

                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-[28px] space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Th?i h?n ki?m tra (Timeout)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Nữu sau Thời gian n�y kh�ch v?n chua {getActionDescription()}, h? th?ng s? dua kh�ch v�o nh�nh "ELSE".
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="number" min="1"
                                value={config.waitDuration || 1}
                                onChange={(e) => onChange({ ...config, waitDuration: parseInt(e.target.value) || 1 })}
                                disabled={disabled}
                            />
                            <Select
                                options={unitOptions}
                                value={config.waitUnit || 'hours'}
                                onChange={(val) => onChange({ ...config, waitUnit: val })}
                                disabled={disabled}
                                direction="bottom"
                            />
                        </div>
                    </div>

                    {(config.conditionType === 'clicked' || config.conditionType === 'zns_clicked') && (
                        <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-4 duration-500" ref={linkContainerRef}>
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ch?n Link c?n theo d�i (OR Logic)</p>
                                {scanning && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                            </div>

                            {scanning ? (
                                <div className="space-y-2">
                                    <div className="h-14 bg-slate-50 animate-pulse rounded-2xl"></div>
                                    <div className="h-14 bg-slate-50 animate-pulse rounded-2xl"></div>
                                </div>
                            ) : availableLinks.length > 0 ? (
                                <>
                                    {/* Option for ANY Link using a Toggle Switch */}
                                    <div className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedLinks.length === 0 ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-4 ring-indigo-500/5' : 'border-slate-100 bg-slate-50/30'}`}>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-slate-800">Theo d�i B?T K? Link n�o (Any)</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">H?p l? n?u kh�ch click v�o b?t c? link n�o c� trong n?i dung.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (disabled) return;
                                                if (selectedLinks.length === 0) {
                                                    // Turning OFF 'Any' -> Select first link if available to enter specific mode
                                                    if (availableLinks.length > 0) {
                                                        onChange({ ...config, linkTargets: [availableLinks[0].url] });
                                                    }
                                                } else {
                                                    // Turning ON 'Any'
                                                    onChange({ ...config, linkTargets: [] });
                                                }
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${selectedLinks.length === 0 ? 'bg-indigo-600' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={disabled}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${selectedLinks.length === 0 ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {/* Require Warning if mode is Specific but nothing selected */}
                                    {!disabled && selectedLinks.length === availableLinks.length && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed lowercase first-letter:uppercase">�ang ? ch? d? "B?t k? Link n�o". B? ch?nĐã mởt link b?t k? n?u b?n ch? mu?n theo d�i danh sách c? th?.</p>
                                        </div>
                                    )}

                                    {/* Link List */}
                                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar p-1">
                                        {availableLinks.map((link) => {
                                            const isSelected = selectedLinks.length === 0 || selectedLinks.includes(link.url);
                                            return (
                                                <button
                                                    key={link.id}
                                                    onClick={() => toggleLink(link.url)}
                                                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left group ${isSelected ? 'border-indigo-200 bg-white shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    disabled={disabled}
                                                >
                                                    <div className="flex-1 overflow-hidden pr-2">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            {isSelected ? <CheckSquare className="w-3 h-3 text-indigo-500" /> : <Square className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />}
                                                            <p className={`text-xs font-black truncate transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{link.label}</p>
                                                        </div>
                                                        <p className={`text-[10px] truncate font-mono ml-5 transition-colors ${isSelected ? 'text-indigo-500/70' : 'text-slate-400'}`}>{link.url}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-lg shadow-indigo-200' : 'border-slate-200 bg-slate-50 opacity-0 group-hover:opacity-100'}`}>
                                                        {isSelected && <CheckSquare className="w-3 h-3" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                parentEmailStep.type === 'zalo_zns' ? (
                                    <div className="p-4 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4" />
                                        M?c d?nh theo d�i B?T K? LINK n�o trong tin ZNS (Do kh�ng th? qu�t tru?c n?i dung ZNS).
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Kh�ng t�m th?y Link n�o trong n?i dung tru?c d�.
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ConditionConfig;