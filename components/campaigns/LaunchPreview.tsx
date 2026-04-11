
import React, { useState, useEffect, useRef } from 'react';
import {
    CheckCircle2, Mail, Users, Calendar, Target, Layout, ShieldCheck, Send, GitMerge, AlertCircle, Clock, Loader2, List, Layers, Sparkles, ChevronDown, CalendarDays, Tag, Play, Monitor, Smartphone, ExternalLink, Paperclip, File as FileIcon, X, Filter, Plus, Info, HelpCircle, ToggleLeft, ToggleRight, AlertTriangle, ArrowRight, ArrowDown, FileCheck, Search, Link2
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Checkbox from '../common/Checkbox';
import Select from '../common/Select';
import Input from '../common/Input';
import toast from 'react-hot-toast';
import { CampaignStatus } from '../../types'; // Assuming types exist
import { api } from '../../services/storageAdapter';

interface Flow {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'archived';
    steps: any[];
}

interface Attachment {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    logic: 'all' | 'match_email';
}

interface LaunchPreviewProps {
    formData: any;
    allLists: any[];
    allSegments: any[];
    allTags?: any[];
    allTemplates: any[];
    znsTemplates?: any[]; // Added for ZNS
    allFlows?: Flow[];
    activateFlowId?: string | null;
    initialConnectFlow?: boolean;
    onTestEmail: () => Promise<void>;
    onConnectFlow?: (connect: boolean) => void;
    onScheduleChange?: (date: string | null) => void;
    onActivateFlow?: (flowId: string, activate: boolean) => void;
    onAttachmentsChange?: (attachments: Attachment[]) => void;
}

const LaunchPreview: React.FC<LaunchPreviewProps> = ({
    formData, allLists, allSegments, allTags = [], allTemplates, znsTemplates = [], allFlows = [], activateFlowId, initialConnectFlow,
    onTestEmail, onConnectFlow, onScheduleChange, onActivateFlow, onAttachmentsChange
}) => {
    const apiUrl = window.location.origin;

    const testUnsubscribeLink = () => {
        // Open test unsubscribe page with dummy subscriber ID
        const testUrl = `https://automation.ideas.edu.vn/mail_api/webhook.php?type=unsubscribe&sid=test_preview&cid=${formData.id}`;
        window.open(testUrl, '_blank');
    };

    // Determine selected template based on type
    const isZns = formData.type === 'zalo_zns';
    const selectedTemplate = isZns
        ? znsTemplates.find(t => t.template_id === formData.templateId)
        : allTemplates.find(t => t.id === formData.templateId);

    const [connectFlow, setConnectFlow] = useState(initialConnectFlow || !!activateFlowId);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>(formData.scheduledAt ? 'later' : 'now');
    const [activateLinkedFlow, setActivateLinkedFlow] = useState(true);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    // Attachment State
    const [attachments, setAttachments] = useState<Attachment[]>(formData.attachments || []);
    const [isUploading, setIsUploading] = useState(false);
    const [isPersonalizedMode, setIsPersonalizedMode] = useState(false); // Toggle State
    const fileInputRef = useRef<HTMLInputElement>(null);

    const linkedFlow = allFlows.find(f => {
        const trigger = f.steps.find(s => s.type === 'trigger');
        return trigger?.config.type === 'campaign' && trigger.config.targetId === formData.id;
    });

    const isAlreadySent = formData.status === CampaignStatus.SENT || formData.status === CampaignStatus.SENDING;

    // Custom Date/Time State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [customDateValue, setCustomDateValue] = useState('');
    const [selectedHour, setSelectedHour] = useState('09');
    const [selectedMinute, setSelectedMinute] = useState('00');

    // Fresh Flow Data
    const [freshLinkedFlow, setFreshLinkedFlow] = useState<Flow | undefined>(undefined);

    useEffect(() => {
        if (linkedFlow?.id) {
            // Force fetch latest flow to ensure status and steps are current
            api.get<Flow>(`flows/${linkedFlow.id}`).then(res => {
                if (res.success && res.data) {
                    setFreshLinkedFlow(res.data);
                }
            });
        }
    }, [linkedFlow?.id]);

    const activeFlow = freshLinkedFlow || linkedFlow;

    useEffect(() => {
        if (onConnectFlow) onConnectFlow(connectFlow);
    }, [connectFlow, onConnectFlow]);

    useEffect(() => {
        if (onActivateFlow && linkedFlow && linkedFlow.status !== 'active') {
            onActivateFlow(linkedFlow.id, activateLinkedFlow);
        }
    }, [activateLinkedFlow, linkedFlow, onActivateFlow]);

    useEffect(() => {
        if (onAttachmentsChange) onAttachmentsChange(attachments);
    }, [attachments, onAttachmentsChange]);

    useEffect(() => {
        if (scheduleMode === 'later') {
            let combinedDate = new Date();
            if (isCustomDate && customDateValue) {
                combinedDate = new Date(customDateValue);
            } else {
                combinedDate = new Date(selectedDate);
            }
            combinedDate.setHours(parseInt(selectedHour));
            combinedDate.setMinutes(parseInt(selectedMinute));
            if (onScheduleChange) onScheduleChange(combinedDate.toISOString());
        } else {
            if (onScheduleChange) onScheduleChange(null);
        }
    }, [scheduleMode, selectedDate, selectedHour, selectedMinute, isCustomDate, customDateValue, onScheduleChange]);

    const handleTestSend = async () => {
        setIsSendingTest(true);
        await onTestEmail();
        setIsSendingTest(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        // Fix: Cast Array.from result to File[] to ensure proper typing for the loop and filtering
        const files = Array.from(e.target.files) as File[];

        // --- VALIDATION LOGIC (Multiple Files) ---
        if (isPersonalizedMode) {
            // Check ALL files. If ANY file fails, stop everything.
            const invalidFiles = files.filter(file => {
                // Simple check: Must contain '@' and some chars before/after to look like an email inside filename
                // Regex: matches _something@something.something
                // Fix: 'file' is now typed as File so 'name' exists
                return !/_[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(file.name);
            });

            if (invalidFiles.length > 0) {
                // Fix: 'invalidFiles' is now typed as File[] so map is safe
                const invalidNames = invalidFiles.map(f => f.name).join('\n- ');
                toast.error(`LỖI ĐỊNH DẠNG TÊN FILE! Tên file phải chứa Email (VD: Hopdong_khachA@gmail.com.pdf)`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return; // Halt upload
            }
        }
        // -------------------------

        setIsUploading(true);
        const newAttachments: Attachment[] = [];
        const apiUrl = 'https://automation.ideas.edu.vn/mail_api';
        const uploadUrl = apiUrl.replace(/\/$/, '') + '/upload.php';

        // Process sequentially to maintain order and manage errors
        for (const file of files) {
            const formData = new FormData();
            // Fix: 'file' is now typed as File which extends Blob
            formData.append('file', file);

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });
                // Fix: Cast response.json() to any to bypass 'unknown' type check for property access
                const result = (await response.json()) as any;

                if (result.success) {
                    newAttachments.push({
                        id: crypto.randomUUID(),
                        name: result.data.name,
                        url: result.data.url,
                        size: result.data.size,
                        type: result.data.type,
                        logic: isPersonalizedMode ? 'match_email' : 'all'
                    });
                } else {
                    // Fix: result is now cast to any
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
        setAttachments(attachments.filter(a => a.id !== id));
    };

    const [estimatedReach, setEstimatedReach] = useState<number>(0);
    useEffect(() => {
        const fetchReach = async () => {
            if (!formData.target) return;
            try {
                const res = await api.post('campaigns.php?route=estimate_reach', formData.target) as any;
                if (res && res.success && typeof res.data?.count === 'number') {
                    setEstimatedReach(res.data.count);
                } else if (res && res.count !== undefined) {
                    // Fallback if response structure varies
                    setEstimatedReach(res.count);
                }
            } catch (e) {
                console.error("Failed to estimate reach", e);
            }
        };
        fetchReach();
    }, [formData.target]);

    const nextDays = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const getDayLabel = (d: Date, index: number) => {
        if (index === 0) return 'Hôm nay';
        if (index === 1) return 'Ngày mai';
        const day = d.getDay();
        return day === 0 ? 'Chủ Nhật' : `Thứ ${day + 1}`;
    };

    const [auditData, setAuditData] = useState<{ total_checked: number, total_missing: number, missing_field_stats: any } | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);

    useEffect(() => {
        if (isZns && formData.id) {
            setIsAuditing(true);
            api.get(`campaign_audit.php?campaign_id=${formData.id}`).then((res: any) => {
                if (res.success) {
                    setAuditData(res.data);
                }
                setIsAuditing(false);
            }).catch(() => setIsAuditing(false));
        }
    }, [isZns, formData.id]);

    const contentToRender = formData.templateId === 'custom-html' ? formData.contentBody : (selectedTemplate?.htmlContent || '');

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-500 pb-10">

            {/* Top Bar: Quality Check OR Progress Tracking */}
            {formData.status === CampaignStatus.SENDING ? (
                <div className="bg-emerald-900 rounded-[24px] p-6 shadow-xl border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 opacity-[0.05] rounded-full blur-[40px]"></div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/20 animate-pulse">
                                <Send className="w-6 h-6" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                                    Hệ thống đang gửi {isZns ? 'ZNS' : 'Email'}...
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                </h5>
                                <p className="text-[10px] text-emerald-300/70 font-medium uppercase tracking-widest mt-1">Đừng đóng trình duyệt này để theo dõi tiến độ</p>
                            </div>
                        </div>

                        <div className="flex-1 max-w-md w-full">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Tiến độ gửi</span>
                                <span className="text-xl font-black text-white tabular-nums">
                                    {formData.stats?.sent?.toLocaleString() || 0}
                                    <span className="text-sm text-emerald-500/70 mx-1">/</span>
                                    {formData.totalTargetAudience?.toLocaleString() || estimatedReach.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(100, (formData.stats?.sent || 0) / (formData.totalTargetAudience || estimatedReach || 1) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0f172a] rounded-[24px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffa900] opacity-[0.05] rounded-full blur-[40px] transition-transform group-hover:scale-150"></div>
                    <div className="flex items-center gap-3 relative z-10 pl-2">
                        <div className="p-2 bg-white/10 rounded-xl text-[#ffa900] border border-white/10"><ShieldCheck className="w-5 h-5" /></div>
                        <div>
                            <h5 className="text-sm font-bold text-white">Kiểm định chất lượng</h5>
                            <p className="text-[10px] text-slate-400 font-medium">Gửi {isZns ? 'tin ZNS' : 'email'} test đến chính bạn để rà soát hiển thị trước khi gửi thật.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleTestSend(); }}
                        disabled={isSendingTest}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2 shrink-0 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer z-20"
                    >
                        {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{isSendingTest ? 'Đang gửi...' : (isZns ? 'Gửi ZNS Test' : 'Gửi Mail Test')}</span>
                    </button>
                </div>
            )}

            {/* [NEW] ZNS Data Audit Alert */}
            {isZns && (isAuditing || (auditData && auditData.total_missing > 0)) && (
                <div className={`rounded-[24px] p-6 border transition-all animate-in slide-in-from-top-4 duration-500 ${auditData?.total_missing ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${auditData?.total_missing ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-blue-500 text-white animate-pulse'}`}>
                            {isAuditing ? <Loader2 className="w-6 h-6 animate-spin" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h5 className={`text-sm font-black uppercase tracking-tight ${auditData?.total_missing ? 'text-rose-900' : 'text-blue-900'}`}>
                                    {isAuditing ? 'Đang kiểm tra dữ liệu đối tượng...' : `Phát hiện ${auditData?.total_missing} liên hệ thiếu dữ liệu`}
                                </h5>
                                {auditData && (
                                    <Badge variant="neutral" className="bg-white/50 text-[10px] border-none font-bold">
                                        Đã quét: {auditData.total_checked} liên hệ gần nhất
                                    </Badge>
                                )}
                            </div>

                            {isAuditing ? (
                                <p className="text-xs text-blue-700 font-medium mt-1">Hệ thống đang đối soát danh sách người nhận với các tham số mẫu ZNS đã mapping...</p>
                            ) : (
                                <>
                                    <p className="text-xs text-rose-700 font-medium mt-1">
                                        Có <strong>{auditData?.total_missing}</strong> liên hệ trong tệp {formData.target?.listIds.length ? 'CSV/Danh sách' : 'Phân đoạn'} này không đủ dữ liệu để gửi ZNS. Các tin nhắn này sẽ bị <strong>tự động bỏ qua</strong> để tránh lỗi gửi từ Zalo.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {Object.entries(auditData?.missing_field_stats || {}).map(([field, count]) => (
                                            <div key={field} className="bg-white/60 border border-rose-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-tight">{field}:</span>
                                                <span className="text-xs font-bold text-rose-800">{count as any} liên hệ thiếu</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-white/40 rounded-xl border border-rose-100">
                                        <p className="text-[10px] font-bold text-rose-600/80 italic flex items-center gap-1">
                                            <Info className="w-3 h-3" /> Mẹo: Hãy rà soát lại tệp CSV hoặc mapping tham số để đảm bảo đầy đủ thông tin nhất.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* COLUMN 1: SUMMARY & AUDIENCE */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm h-full flex flex-col">
                        {/* Summary Header */}
                        <div className="p-8 border-b border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[60px] -mr-10 -mt-10"></div>
                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2"><Target className="w-3 h-3 text-orange-500" /> Tổng quan chiến dịch</h5>
                            <div className="space-y-1 relative z-10">
                                <p className="text-2xl font-black text-slate-800 leading-tight">{formData.name}</p>
                                <p className="text-sm font-medium text-slate-500 truncate">{isZns ? selectedTemplate?.template_name : formData.subject}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-4 relative z-10">
                                <Badge variant="neutral" className="px-3 py-1 text-[10px]"><ShieldCheck className="w-3 h-3 mr-1" /> {isZns ? `ZNS Template: ${selectedTemplate?.template_id}` : formData.senderEmail}</Badge>
                            </div>
                        </div>

                        {/* P1 FIX: Unsubscribe Link Preview */}
                        {!isZns && (
                            <div className="px-8 pb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-xl">
                                            <Link2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-blue-900 mb-1">Unsubscribe Link (CAN-SPAM Compliance)</h4>
                                            <p className="text-xs text-blue-700">Link hủy đăng ký sẽ tự động được thêm vào cuối mỗi email bởi hệ thống.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Audience Section */}
                        <div className="p-8 bg-slate-50/50 flex-1 flex flex-col">
                            <div className="flex justify-between items-end mb-6">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Users className="w-3 h-3 text-orange-500" /> Đối tượng nhận tin</h5>
                            </div>

                            <div className="space-y-3 flex-1">
                                {/* Lists Rendering */}
                                {formData.target?.listIds.map((id: string) => (
                                    <div key={id} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100"><List className="w-4 h-4" /></div>
                                            <div><p className="text-xs font-bold text-slate-800">{allLists.find(l => l.id === id)?.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Static List</p></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{allLists.find(l => l.id === id)?.count || 0}</span>
                                    </div>
                                ))}

                                {/* Segments Rendering */}
                                {formData.target?.segmentIds.map((id: string) => (
                                    <div key={id} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ca7900] flex items-center justify-center border border-orange-100"><Layers className="w-4 h-4" /></div>
                                            <div><p className="text-xs font-bold text-slate-800">{allSegments.find(s => s.id === id)?.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Dynamic Segment</p></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{allSegments.find(s => s.id === id)?.count || 0}</span>
                                    </div>
                                ))}

                                {/* Tags Rendering */}
                                {formData.target?.tagIds?.map((tagName: string) => (
                                    <div key={tagName} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><Tag className="w-4 h-4" /></div>
                                            <div><p className="text-xs font-bold text-slate-800">{tagName}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Tag Group</p></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{allTags.find(t => t.name === tagName)?.count || 0}</span>
                                    </div>
                                ))}

                                {(!formData.target?.listIds.length && !formData.target?.segmentIds.length && !formData.target?.tagIds?.length) && (
                                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-100/50 rounded-[24px] border-2 border-dashed border-slate-200">Chưa chọn đối tượng nào</div>
                                )}
                            </div>

                            {/* Reach Estimate Styled like SUM at Bottom */}
                            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-4">
                                <div className="flex items-center gap-4 bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 min-w-[200px] justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng Reach</span>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="text-xl font-black leading-none">{estimatedReach.toLocaleString()}</span>
                                    </div>
                                </div>

                                {isZns && (() => {
                                    const znsPrice = selectedTemplate?.template_data?.detail?.price_uid || selectedTemplate?.template_data?.detail?.price || selectedTemplate?.template_data?.raw?.price || 300;
                                    return (
                                        <div className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 rounded-2xl shadow-xl shadow-blue-200 text-white min-w-[200px] justify-between transition-all hover:scale-[1.02]">
                                            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Chi phí ước tính</span>
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-[#ffa900] animate-pulse" />
                                                <span className="text-xl font-black leading-none">{(estimatedReach * znsPrice).toLocaleString()}<span className="text-[10px] ml-1 font-bold">đ</span></span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: ATTACHMENTS, TIMING & FLOW */}
                <div className="space-y-6">

                    {/* ATTACHMENTS SECTION - UPDATED */}
                    {/* Only show attachments for Email, unless ZNS supports it (usually no, except specific templates) */}
                    {!isZns && (
                        <Card className="p-6 border-slate-100 bg-white rounded-[32px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Paperclip className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">Tệp đính kèm</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">Hỗ trợ PDF, DOC, Excel, IMG (Max 10MB)</p>
                                    </div>
                                </div>
                            </div>

                            {/* ... Attachment UI can remain similar, just checking type above ... */}
                            {/* --- TOGGLE ROW (New Layout) --- */}
                            <div className={`mb-6 p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${isPersonalizedMode ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`} onClick={() => !isAlreadySent && setIsPersonalizedMode(!isPersonalizedMode)}>
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

                            <div className="space-y-4">
                                {/* UPLOAD BUTTON */}
                                <div onClick={() => !isAlreadySent && fileInputRef.current?.click()} className={`cursor-pointer w-full py-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-all ${isAlreadySent ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    <span className="text-xs font-bold uppercase">{isPersonalizedMode ? 'Upload Nhiều File (Có kèm Email)' : 'Upload File Gửi Chung (Multi)'}</span>
                                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} disabled={isUploading || isAlreadySent} />
                                </div>

                                {/* ATTACHMENT LIST */}
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
                                            <button onClick={() => !isAlreadySent && removeAttachment(att.id)} className="text-slate-300 hover:text-rose-500 p-1" disabled={isAlreadySent}><X className="w-4 h-4" /></button>
                                        </div>

                                        {att.logic === 'match_email' && (
                                            <p className="text-[9px] text-blue-600 mt-2 px-1 flex items-center gap-1 font-medium bg-white/50 p-1 rounded-lg">
                                                <Filter className="w-3 h-3" /> Chỉ gửi cho Email khớp trong tên file.
                                            </p>
                                        )}
                                    </div>
                                )) : null}
                            </div>
                        </Card>
                    )}

                    {/* Timing Card */}
                    <Card className="p-8 border-slate-100 bg-white rounded-[32px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2.5 rounded-xl transition-colors ${scheduleMode === 'now' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                <Clock className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-800">Thời điểm gửi</h4>
                        </div>

                        {/* [P0] ZNS TIME WINDOW ALERT */}
                        {isZns && (() => {
                            const checkDate = scheduleMode === 'later' ? (() => {
                                let d = new Date(selectedDate);
                                d.setHours(parseInt(selectedHour));
                                d.setMinutes(parseInt(selectedMinute));
                                return d;
                            })() : new Date();

                            const hour = checkDate.getHours();
                            const isTimeRestricted = hour < 6 || hour >= 22;

                            if (!isTimeRestricted) return null;

                            return (
                                <div className="mb-6 p-5 bg-rose-50 border border-rose-100 rounded-[24px] flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-[11px] font-black text-rose-900 uppercase tracking-tight">Ngoài khung giờ gửi ZNS quy định</h5>
                                        <p className="text-xs text-rose-700 font-medium mt-1 leading-relaxed">
                                            Theo chính sách của Zalo, tin nhắn ZNS chỉ được phép gửi trong khung giờ từ <strong>06:00 đến 22:00</strong> hàng ngày.
                                        </p>
                                        <p className="text-[10px] text-rose-600/80 mt-2 font-bold italic">
                                            {scheduleMode === 'now'
                                                ? "⚠️ Hiện tại đã quá giờ gửi. Vui lòng chọn 'Lên lịch gửi' vào sáng mai để kích hoạt chiến dịch."
                                                : "⚠️ Giờ bạn chọn nằm ngoài khung giờ cho phép. Vui lòng điều chỉnh lại thời gian trong khoảng 06:00 - 21:00."}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
                            <button
                                onClick={() => !isAlreadySent && setScheduleMode('now')}
                                disabled={isAlreadySent}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${scheduleMode === 'now' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:text-slate-700'} ${isAlreadySent ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Send className="w-3.5 h-3.5" /> Gửi ngay lập tức
                            </button>
                            <button
                                onClick={() => !isAlreadySent && setScheduleMode('later')}
                                disabled={isAlreadySent}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${scheduleMode === 'later' ? 'bg-white shadow text-[#ca7900]' : 'text-slate-500 hover:text-slate-700'} ${isAlreadySent ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Calendar className="w-3.5 h-3.5" /> Lên lịch gửi
                            </button>
                        </div>

                        {scheduleMode === 'later' && !isAlreadySent && (
                            <div className="animate-in slide-in-from-top-2 space-y-5">
                                {/* ... Date Picker Logic ... */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block ml-1">Chọn ngày</label>
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                        {nextDays.map((d, i) => {
                                            const isSelected = !isCustomDate && d.toDateString() === selectedDate.toDateString();
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSelectedDate(d); setIsCustomDate(false); }}
                                                    className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all flex-shrink-0 ${isSelected ? 'border-[#ffa900] bg-orange-50 text-[#ca7900]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                                >
                                                    <span className="text-[10px] font-bold uppercase">{getDayLabel(d, i)}</span>
                                                    <span className="text-xl font-black mt-1">{d.getDate()}</span>
                                                    <span className="text-[9px] font-medium opacity-60">Thg {d.getMonth() + 1}</span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setIsCustomDate(true)} className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all flex-shrink-0 ${isCustomDate ? 'border-[#ffa900] bg-orange-50 text-[#ca7900]' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                            <CalendarDays className="w-5 h-5 mb-1" />
                                            <span className="text-[9px] font-bold uppercase text-center leading-tight">Ngày<br />khác</span>
                                        </button>
                                    </div>
                                </div>
                                {isCustomDate && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <Input
                                            label="Ngày cụ thể"
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={customDateValue}
                                            onChange={(e) => setCustomDateValue(e.target.value)}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block ml-1">Giờ gửi (24h)</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <Select
                                                value={selectedHour}
                                                onChange={(val) => setSelectedHour(val)}
                                                options={Array.from({ length: 24 }, (_, i) => {
                                                    const h = i.toString().padStart(2, '0');
                                                    return { value: h, label: `${h} giờ` };
                                                })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Select
                                                value={selectedMinute}
                                                onChange={(val) => setSelectedMinute(val)}
                                                options={['00', '15', '30', '45'].map(m => ({ value: m, label: `${m} phút` }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Thời gian dự kiến</p>
                                        <p className="text-sm font-black text-blue-900">
                                            {selectedHour}:{selectedMinute} - {(isCustomDate && customDateValue) ? new Date(customDateValue).toLocaleDateString('vi-VN') : selectedDate.toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAlreadySent && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <p className="text-xs font-bold text-amber-700">Chiến dịch này đã hoàn tất hoặc đang được gửi. Không thể thay đổi lịch trình.</p>
                            </div>
                        )}

                        {scheduleMode === 'now' && !isAlreadySent && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <p className="text-xs font-bold text-emerald-700">Hệ thống đã sẵn sàng gửi ngay.</p>
                            </div>
                        )}
                    </Card>

                    {/* Automation Connection Logic (Refined) */}
                    {linkedFlow ? (
                        <div className={`p-6 rounded-[32px] border-2 transition-all group ${activeFlow.status === 'active' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeFlow.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white'}`}>
                                        <GitMerge className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-800">Đã kết nối Flow: {activeFlow.name}</h4>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${activeFlow.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{activeFlow.status}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 text-[11px] font-medium opacity-80">
                                            {activeFlow.status === 'active' ? <span className="text-emerald-700 flex items-center gap-1"><Play className="w-3 h-3" /> Automation sẽ chạy ngay khi Campaign gửi.</span> : <span className="text-amber-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Automation đang tắt. Cần kích hoạt để chạy.</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {activeFlow.status !== 'active' && !isAlreadySent && (
                                <div className="mt-4 pt-4 border-t border-amber-200/50 flex items-center gap-3">
                                    <Checkbox
                                        id="activate-flow"
                                        checked={activateLinkedFlow}
                                        onChange={(checked) => setActivateLinkedFlow(checked)}
                                        label="Kích hoạt Flow này & Xuất bản cùng lúc?"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className={`p-6 border-2 transition-all rounded-[32px] ${connectFlow ? 'bg-violet-50/50 border-violet-200' : 'bg-white border-slate-100'}`}>
                            <div
                                className={`flex items-center justify-between group ${isAlreadySent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !isAlreadySent && setConnectFlow(!connectFlow)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${connectFlow ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'}`}><GitMerge className="w-6 h-6" /></div>
                                    <div>
                                        <h4 className={`text-sm font-bold transition-colors ${connectFlow ? 'text-violet-900' : 'text-slate-700'}`}>Kích hoạt chăm sóc sau chiến dịch?</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium max-w-sm">
                                            {isAlreadySent ? "Không thể bật automation vì chiến dịch này đã bắt đầu chạy." : "Tự động gửi email chăm sóc khi khách hàng nhận được chiến dịch này."}
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${connectFlow ? 'bg-violet-500 border-violet-500' : 'border-slate-300'}`}>
                                    {connectFlow && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                            </div>

                            {connectFlow && !isAlreadySent && (
                                <div className="mt-6 pt-6 border-t border-violet-100 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-3 block">Chọn kịch bản muốn kết nối:</label>
                                    <div className="space-y-2">
                                        {/* Option: Create New */}
                                        <button
                                            onClick={() => onActivateFlow && onActivateFlow('', true)} // Empty ID means create new, but keep connection ON
                                            className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${!activateFlowId ? 'border-violet-500 bg-white ring-2 ring-violet-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!activateFlowId ? 'bg-violet-100 text-violet-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">Tạo Flow mới</p>
                                                    <p className="text-[9px] text-slate-500 font-medium">Chọn mẫu Chăm sóc sau chiến dịch</p>
                                                </div>
                                            </div>
                                            {!activateFlowId && <CheckCircle2 className="w-4 h-4 text-violet-500" />}
                                        </button>

                                        {/* Existing Unlinked Flows: Only Campaign-triggered, Not Linked */}
                                        {allFlows.filter(f => {
                                            const trigger = f.steps?.find(s => s.type === 'trigger');
                                            return trigger?.config?.type === 'campaign' && !trigger.config.targetId;
                                        }).map((flow) => (
                                            <button
                                                key={flow.id}
                                                onClick={() => onActivateFlow && onActivateFlow(flow.id, true)}
                                                className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${activateFlowId === flow.id ? 'border-violet-500 bg-white ring-2 ring-violet-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activateFlowId === flow.id ? 'bg-violet-100 text-violet-600' : 'bg-slate-50 text-slate-400'}`}>
                                                        <GitMerge className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{flow.name}</p>
                                                        <p className="text-[9px] text-slate-500 font-medium">Kịch bản chăm sóc sẵn có</p>
                                                    </div>
                                                </div>
                                                {activateFlowId === flow.id && <CheckCircle2 className="w-4 h-4 text-violet-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {/* FULL WIDTH INLINE PREVIEW */}
            <div className="bg-slate-100 rounded-[32px] p-2 sm:p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col items-center">
                {/* Preview Toolbar */}
                <div className="w-full flex justify-between items-center px-4 py-3 mb-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Layout className="w-4 h-4 text-orange-500" /> Xem trước nội dung
                    </h5>
                    {!isZns && (
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex gap-1">
                            <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-[#ffa900] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Desktop"><Monitor className="w-4 h-4" /></button>
                            <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-[#ffa900] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Mobile"><Smartphone className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>

                {/* Iframe Container */}
                <div className="w-full flex justify-center bg-slate-200/50 rounded-[24px] overflow-hidden border border-slate-200 min-h-[600px] relative">
                    <div className={`transition-all duration-500 ease-in-out bg-white shadow-2xl overflow-hidden my-8 ${previewDevice === 'mobile' || isZns ? 'w-[375px] h-[667px] rounded-[32px] border-8 border-slate-800' : 'w-full h-[700px] rounded-none border-none'}`}>
                        {(previewDevice === 'mobile' || isZns) && <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>}
                        {isZns ? (
                            <iframe
                                src={selectedTemplate?.template_data?.detail?.previewUrl || selectedTemplate?.template_data?.raw?.previewUrl}
                                className="w-full h-full border-none bg-white"
                                title="ZNS Preview"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        ) : (
                            <iframe
                                srcDoc={contentToRender || ''}
                                className="w-full h-full border-none bg-white"
                                title="Email Preview"
                                sandbox="allow-same-origin"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaunchPreview;
