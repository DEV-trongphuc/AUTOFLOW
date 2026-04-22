import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Link2, Plus, BarChart2, Edit3, Trash2, CheckCircle2, Globe, ArrowRight, Target, Share2, Scan, Filter, RefreshCw, BarChart, FileText, ChevronDown, Check, Search, Lightbulb, Download, Save, Wand2, Code, Copy, PenLine } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import Tabs from '../components/common/Tabs';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import LinkGuideModal from '../components/links/LinkGuideModal';
import { api } from '../services/storageAdapter';
import toast from 'react-hot-toast';
import { EXTERNAL_API_BASE } from '../utils/config';
import { QRCodeCanvas } from 'qrcode.react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Cell } from 'recharts';
import QRCodeStyling from 'qr-code-styling';
import QRDesignerModal from '../components/links/QRDesignerModal';

const QRPreview = ({ configJson, value, size = 300 }: { configJson?: string, value: string, size?: number }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        try {
            const config = JSON.parse(configJson || '{}');
            const qrCode = new QRCodeStyling({
                width: size,
                height: size,
                type: 'svg',
                data: value,
                image: config.logo,
                dotsOptions: {
                    color: config.fgGradientEnabled ? undefined : (config.fgColor || '#000000'),
                    gradient: config.fgGradientEnabled ? {
                        type: config.fgGradient.type,
                        rotation: (config.fgGradient.rotation * Math.PI) / 180,
                        colorStops: config.fgGradient.colorStops
                    } : undefined,
                    type: config.pattern || 'square'
                },
                backgroundOptions: {
                    color: config.isTransparent ? 'transparent' : (config.bgGradientEnabled ? undefined : (config.bgColor || '#ffffff')),
                    gradient: (!config.isTransparent && config.bgGradientEnabled) ? {
                        type: config.bgGradient.type,
                        rotation: (config.bgGradient.rotation * Math.PI) / 180,
                        colorStops: config.bgGradient.colorStops
                    } : undefined
                },
                imageOptions: {
                    crossOrigin: 'anonymous',
                    margin: config.logoMargin || 5,
                    imageSize: config.logoSize || 0.3
                },
                cornersSquareOptions: {
                    type: config.eyeFrame || 'square',
                    color: config.eyeFrameColor || '#000000'
                },
                cornersDotOptions: {
                    type: config.eyeBall || 'square',
                    color: config.eyeBallColor || '#000000'
                }
            });
            ref.current.innerHTML = '';
            qrCode.append(ref.current);
        } catch (e) {
            console.error('QR Render Error', e);
        }
    }, [configJson, value, size]);

    return <div ref={ref} className="rounded-xl overflow-hidden shadow-inner bg-slate-50" />;
};

export interface ShortLink {
    id: string;
    name: string;
    slug: string;
    target_url: string;
    is_survey_checkin: number;
    survey_id: string | null;
    qr_config_json: string;
    status?: 'active' | 'paused';
    access_pin?: string | null;
    submit_count?: number;
    created_at: string;
    stats?: { clicks: number, unique: number };
}

interface Survey {
    id: string;
    name: string;
}

const LinksQR: React.FC = () => {
    const [links, setLinks] = useState<ShortLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'report'>('list');
    const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
    const [linkStats, setLinkStats] = useState<{ timeline: any[], devices: any[], os: any[], country?: any[] } | null>(null);

    // Modal Add
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<ShortLink>>({
        name: '', target_url: '', slug: '', is_survey_checkin: 0, survey_id: ''
    });

    const [linkToDelete, setLinkToDelete] = useState<ShortLink | null>(null);

    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isSurveyPickerOpen, setIsSurveyPickerOpen] = useState(false);
    const [surveySearch, setSurveySearch] = useState('');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsData, setSettingsData] = useState<Partial<ShortLink>>({});

    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    useEffect(() => {
        fetchLinks();
        fetchSurveys();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        const res = await api.get<ShortLink[]>('links_qr?action=list');
        if (res.success) setLinks(res.data || []);
        setLoading(false);
    };

    const handleSaveName = async () => {
        setIsEditingName(false);
        if (!selectedLink || !editNameValue || editNameValue === (selectedLink.name || selectedLink.slug)) return;
        
        try {
            const res = await api.put(`links_qr?action=update&id=${selectedLink.id}`, { name: editNameValue });
            if (res.success) {
                setSelectedLink({ ...selectedLink, name: editNameValue });
                toast.success('Đã cập nhật tên');
                fetchLinks();
            } else {
                toast.error('Lỗi khi cập nhật tên');
            }
        } catch (e) {
            toast.error('Lỗi hệ thống');
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedLink) return;
        setIsSubmitting(true);
        try {
            const res = await api.put(`links_qr?action=update&id=${selectedLink.id}`, {
                target_url: settingsData.target_url,
                status: settingsData.status,
                access_pin: settingsData.access_pin || ''
            });
            if (res.success) {
                toast.success('Đã lưu cấu hình bảo mật / chuyển hướng');
                const updated = { ...selectedLink, ...settingsData };
                setSelectedLink(updated);
                setIsSettingsOpen(false);
                fetchLinks();
            } else {
                toast.error('Lỗi cập nhật cấu hình');
            }
        } catch (e) {
            toast.error('Bị lỗi trong lúc lưu thiết lập');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!linkToDelete) return;
        const res = await api.delete(`links_qr?action=delete&id=${linkToDelete.id}`);
        if (res.success) {
            setLinks(prev => prev.filter(l => l.id !== linkToDelete.id));
            toast.success("Xóa link thành công");
        } else {
            toast.error("Lỗi xóa link");
        }
        setLinkToDelete(null);
    };

    const fetchSurveys = async () => {
        const res = await api.get<any[]>('surveys');
        if (res.success) setSurveys(res.data || []);
    };

    const fetchLinkStats = async (id: string) => {
        setLinkStats(null);
        const res = await api.get<{ timeline: any[], devices: any[], os: any[], country?: any[] }>(`links_qr?action=stats&id=${id}`);
        if (res.success) setLinkStats(res.data);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.target_url) {
            toast.error('Nhập đầy đủ Tên và URL đích');
            return;
        }
        setIsSubmitting(true);
        const res = await api.post<ShortLink>('links_qr?action=create', formData);
        if (res.success) {
            toast.success('Đã tạo Short Link');
            setIsAddOpen(false);
            fetchLinks();
        } else {
            toast.error(res.message || 'Lỗi khi tạo');
        }
        setIsSubmitting(false);
    };

    const copyLink = (slug: string) => {
        const link = `${EXTERNAL_API_BASE.replace('/mail_api', '').replace('/api', '')}/go/${slug}`;
        navigator.clipboard.writeText(link);
        toast.success('Đã Copy Link!');
    };

    const updateQRConfig = (key: string, value: any) => {
        if (!selectedLink) return;
        try {
            const currentConfig = JSON.parse(selectedLink.qr_config_json || '{}');
            const newConfig = { ...currentConfig, [key]: value };
            setSelectedLink({ ...selectedLink, qr_config_json: JSON.stringify(newConfig) });
        } catch (e) {
            console.error('Config error', e);
        }
    };

    const saveQRConfig = async () => {
        if (!selectedLink) return;
        setIsSubmitting(true);
        const res = await api.put(`links_qr?action=update&id=${selectedLink.id}`, { qr_config_json: selectedLink.qr_config_json });
        if (res.success) {
            toast.success('Đã lưu thiết kế QR Code');
            fetchLinks(); // refresh list
        } else {
            toast.error('Lỗi khi lưu');
        }
        setIsSubmitting(false);
    };

    const downloadQR = () => {
        const canvas = document.getElementById('qr-preview') as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${selectedLink?.name || 'qr-code'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 mx-auto">
            {view === 'list' && (
                <>
                    <PageHero
                        title={<>Link <span className="text-amber-100/80">& QR Tracker</span></>}
                        subtitle="Tạo link rút gọn nội bộ, thiết kế QR Code Campaign và đo lường truy cập sâu theo thiết bị, vị trí."
                        showStatus={true}
                        statusText="Realtime Log Engine"
                        actions={[
                            { label: 'Hướng dẫn sử dụng', icon: Lightbulb, onClick: () => setIsGuideOpen(true), primary: false },
                            { label: 'Tạo Link mới', icon: Plus, onClick: () => { setFormData({ name: '', target_url: '', slug: '', is_survey_checkin: 0, survey_id: '' }); setIsAddOpen(true); }, primary: true }
                        ]}
                    />

                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 min-h-[600px]">
                        <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Tracking Links</h3>
                                <p className="text-xs text-slate-500 font-medium">Danh sách các liên kết theo dõi (Short links).</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-50 rounded-3xl animate-pulse"></div>)}
                            </div>
                        ) : links.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                                <QrCode className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700">Chưa có liên kết nào</h3>
                            </div>
                        ) : (
                            <div className="space-y-16">
                                {Object.entries(links.reduce((acc, link) => {
                                    const target = link.target_url;
                                    if (!acc[target]) acc[target] = [];
                                    acc[target].push(link);
                                    return acc;
                                }, {} as { [key: string]: ShortLink[] })).map(([targetUrl, groupedLinks]) => {
                                    const totalClicks = groupedLinks.reduce((sum, l) => sum + (l.stats?.clicks || 0), 0);
                                    
                                    return (
                                        <div key={targetUrl} className="relative">
                                            {/* Group Header - Light & Elegant */}
                                            <div className="flex items-center justify-between mb-6 px-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-[16px] font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                                        {groupedLinks[0].name}
                                                    </h3>
                                                    <span className="text-[12px] text-slate-400 font-medium">({groupedLinks.length} Links)</span>
                                                </div>
                                                <div className="hidden md:block">
                                                    <span className="text-[12px] text-slate-400">Total Clicks: <strong className="text-slate-700">{totalClicks}</strong></span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                {groupedLinks.map(link => (
                                                    <div key={link.id} className="group bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden">
                                                        {/* decorative blobs */}
                                                        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                                                        <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none text-slate-900">
                                                            <QrCode className="w-24 h-24" />
                                                        </div>

                                                        {/* Top: icon + details + delete */}
                                                        <div className="flex items-start gap-4 mb-6 relative z-10 w-full">
                                                            <div
                                                                className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center flex-shrink-0 shadow-lg"
                                                                style={{background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)'}}
                                                            >
                                                                <QrCode className="w-7 h-7 text-white drop-shadow-sm" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2 pt-0.5">
                                                                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight line-clamp-1 mb-2">
                                                                    {link.name || link.slug || 'Unnamed'}
                                                                </h3>
                                                                <a 
                                                                    href={link.target_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex items-center gap-1.5 w-fit px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/60 hover:bg-amber-100 transition-colors group/slug"
                                                                    title="Đích đến"
                                                                >
                                                                    <Link2 className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                                                    <span className="text-[11px] font-bold text-amber-800 truncate line-clamp-1 max-w-[150px]">
                                                                        {link.target_url}
                                                                    </span>
                                                                </a>
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); setLinkToDelete(link); }} className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 flex-shrink-0 -mt-1 -mr-1" title="Xoá Link">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <div className="flex-1" />

                                                        {/* Stats panel */}
                                                        <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-3 flex flex-col gap-1.5 mb-4 relative z-10">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</span>
                                                                <span className={`text-[11px] font-black uppercase flex items-center gap-1 ${link.status === 'paused' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${link.status === 'paused' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                                                    {link.status === 'paused' ? 'Tạm khóa' : 'Hoạt động'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lượt Clicks</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-xs font-black text-slate-700">{(link.stats?.clicks || 0).toLocaleString()}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400">logs</span>
                                                                </div>
                                                            </div>
                                                            {link.is_survey_checkin ? (
                                                                <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-100/80">
                                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1"><FileText className="w-3 h-3"/> Khảo sát</span>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-xs font-black text-indigo-600">{(link.submit_count || 0).toLocaleString()}</span>
                                                                        <span className="text-[10px] font-bold text-indigo-400">submits</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gateway</span>
                                                                    <span className="text-[11px] font-black uppercase text-slate-500">Direct Link</span>
                                                                </div>
                                                            )}
                                                            {link.access_pin && (
                                                                <div className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase mt-0.5 self-start flex gap-1 items-center">
                                                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div> PIN PROTECTED
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* CTA buttons */}
                                                        <div className="flex gap-2 relative z-10">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); copyLink(link.slug || link.id); }}
                                                                className="flex-[1.2] py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center gap-2 text-slate-600 text-[11px] font-black tracking-widest hover:bg-slate-100 transition-all shadow-sm group"
                                                            >
                                                                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" /> COPY LINK
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedLink(link); setView('report'); fetchLinkStats(link.id); }}
                                                                className="flex-[2] py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center gap-2 text-amber-700 text-[11px] font-black tracking-widest hover:bg-amber-50 hover:border-amber-200 transition-all shadow-sm group"
                                                            >
                                                                <PenLine className="w-3.5 h-3.5 text-amber-500" /> DESIGN QR
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'report' && selectedLink && (
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 min-h-[800px]">
                    <div className="flex items-start justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div>
                                <button 
                                    onClick={() => setView('list')}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase tracking-widest transition-colors mb-3 group"
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                                        <ArrowRight className="w-3 h-3 rotate-180" />
                                    </div>
                                    QUAY LẠI
                                </button>
                                
                                <div className="flex items-center gap-3">
                                    {isEditingName ? (
                                        <input 
                                            type="text" 
                                            value={editNameValue} 
                                            onChange={e => setEditNameValue(e.target.value)} 
                                            onBlur={handleSaveName}
                                            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                            className="text-2xl font-black text-slate-800 uppercase tracking-tight bg-slate-50 border border-amber-400 focus:ring-2 focus:ring-amber-200 rounded-xl px-3 py-1 outline-none w-full min-w-[250px]"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedLink.name || selectedLink.slug}</h2>
                                            <button 
                                                onClick={() => { setIsEditingName(true); setEditNameValue(selectedLink.name || selectedLink.slug); }} 
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200 shadow-sm hover:shadow"
                                                title="Sửa tên chiến dịch"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-200/60 uppercase">/go/{selectedLink.slug}</span>
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="text-[11px] text-slate-400 font-mono italic opacity-70">Domain Link Mapping</span>
                                    
                                    {selectedLink.is_survey_checkin && selectedLink.survey_id && (
                                        <>
                                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200/60 text-indigo-700 rounded-lg shadow-sm">
                                                <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    Khảo sát: {surveys.find(s => s.id === selectedLink.survey_id)?.name || 'Đã liên kết'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target URL (Link gốc)</span>
                            <a 
                                href={selectedLink.target_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-1.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/60 rounded-full flex items-center gap-2 max-w-sm cursor-pointer transition-colors group"
                                title="Mở link"
                            >
                                <Globe className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:rotate-12" />
                                <span className="text-[11px] font-bold text-amber-900 truncate">{selectedLink.target_url}</span>
                            </a>
                            {selectedLink.created_at && (
                                <span className="text-[10px] font-bold text-slate-400 mt-1">
                                    Tạo ngày: {new Date(selectedLink.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            )}
                            <div className="mt-2 flex justify-end">
                                <button 
                                    onClick={() => {
                                        setSettingsData({
                                            target_url: selectedLink.target_url,
                                            status: selectedLink.status || 'active',
                                            access_pin: selectedLink.access_pin || ''
                                        });
                                        setIsSettingsOpen(true);
                                    }}
                                    className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <Target className="w-3.5 h-3.5" /> NÂNG CAO & BẢO MẬT
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* QR Section - Moved to TOP */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-stretch">
                        {/* Designer Tools */}
                        <div className="lg:col-span-5 flex flex-col">
                            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex-1 flex flex-col justify-center">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tùy chỉnh QR</h3>
                                <p className="text-[11px] text-slate-500 mt-1 font-medium italic">Thiết kế mã QR Campaign trở nên chuyên nghiệp và khác biệt.</p>
                                
                                <div className="mt-8 space-y-4">
                                    <button 
                                        onClick={() => setIsDesignerOpen(true)}
                                        className="w-full flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-3xl hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-200/50 group-hover:scale-110 transition-transform">
                                                <Edit3 className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-[15px] font-black text-slate-800 leading-tight">Chỉnh sửa Design</span>
                                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-0.5">Professional Designer</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-white transition-all text-slate-400">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>

                                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                        <div className="flex gap-3">
                                            <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
                                            <p className="text-[11px] text-amber-700/80 font-bold leading-relaxed">
                                                Lưu ý quan trọng: Hãy chọn màu hoa văn có độ tương phản cao với màu nền để các thiết bị quét nhanh hơn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Window plain design */}
                        <div 
                            className="lg:col-span-7 flex flex-col items-center justify-center p-8 bg-slate-50/40 rounded-[32px] border border-slate-100 relative overflow-hidden h-full min-h-[400px]"
                            style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`, backgroundSize: `24px 24px` }}
                        >
                            <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-slate-200/40 flex flex-col items-center border border-slate-100/80 z-10">
                                {(() => {
                                    const cfg = JSON.parse(selectedLink.qr_config_json || '{}');
                                    const hasFrame = cfg.frameId && cfg.frameId !== 'none';
                                    
                                    return (
                                        <div 
                                            className="transition-all duration-500"
                                            style={{
                                                border: hasFrame ? `10px solid ${cfg.frameColor || '#4f46e5'}` : 'none',
                                                borderRadius: '28px',
                                                padding: hasFrame ? '20px 16px 40px' : '0',
                                                background: hasFrame ? (cfg.frameColor || '#4f46e5') : 'transparent',
                                                position: 'relative'
                                            }}
                                        >
                                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                                                <QRPreview 
                                                    configJson={selectedLink.qr_config_json}
                                                    value={`${EXTERNAL_API_BASE.replace('/api', '')}/go/${selectedLink.slug}`}
                                                    size={240}
                                                />
                                            </div>
                                            {hasFrame && (
                                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                                    <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">{cfg.frameText || 'SCAN ME!'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="mt-8 text-center w-full max-w-[200px]">
                                    <button 
                                        onClick={() => {
                                            try {
                                                const config = JSON.parse(selectedLink.qr_config_json || '{}');
                                                const qr = new QRCodeStyling({
                                                    data: `${EXTERNAL_API_BASE.replace('/api', '')}/go/${selectedLink.slug}`,
                                                    width: 1500,
                                                    height: 1500,
                                                    margin: 20,
                                                    image: config.logo,
                                                    dotsOptions: {
                                                        color: config.fgGradientEnabled ? undefined : (config.fgColor || '#000000'),
                                                        gradient: config.fgGradientEnabled && config.fgGradient ? {
                                                            type: config.fgGradient.type,
                                                            rotation: (config.fgGradient.rotation * Math.PI) / 180,
                                                            colorStops: config.fgGradient.colorStops
                                                        } : undefined,
                                                        type: config.pattern || 'square'
                                                    },
                                                    backgroundOptions: {
                                                        color: config.isTransparent ? 'transparent' : (config.bgGradientEnabled ? undefined : (config.bgColor || '#ffffff')),
                                                        gradient: (!config.isTransparent && config.bgGradientEnabled && config.bgGradient) ? {
                                                            type: config.bgGradient.type,
                                                            rotation: (config.bgGradient.rotation * Math.PI) / 180,
                                                            colorStops: config.bgGradient.colorStops
                                                        } : undefined
                                                    },
                                                    imageOptions: {
                                                        crossOrigin: 'anonymous',
                                                        margin: config.logoMargin || 5,
                                                        imageSize: config.logoSize || 0.3
                                                    },
                                                    cornersSquareOptions: {
                                                        type: config.eyeFrame || 'square',
                                                        color: config.eyeFrameColor || '#000000'
                                                    },
                                                    cornersDotOptions: {
                                                        type: config.eyeBall || 'square',
                                                        color: config.eyeBallColor || '#000000'
                                                    }
                                                });
                                                qr.download({ name: `QR_${selectedLink.slug}`, extension: 'png' });
                                            } catch (e) {
                                                console.error('Download QR err', e);
                                            }
                                        }}
                                        className="w-full h-12 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                    >
                                        <Download className="w-4 h-4 text-amber-600" /> TẢI XUỐNG QR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* REPORT - Moved to BOTTOM */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shadow-md"><BarChart2 className="w-4 h-4" /></div>
                            <h3 className="text-[15px] font-bold text-slate-800 uppercase tracking-wide">Thống kê truy cập (Realtime)</h3>
                        </div>

                        {linkStats ? (
                            <div className="flex flex-col gap-6">
                                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6 px-2">Lượt Click theo mốc thời gian</h4>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={linkStats.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                                                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} contentStyle={{ borderRadius: 20, border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }} />
                                                <Area type="monotone" dataKey="clicks" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6">Phân loại Thiết bị</h4>
                                        <div className="flex-1 min-h-[180px]">
                                            {linkStats.devices.length ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsBarChart data={linkStats.devices} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="device_type" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} width={90} />
                                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: 16, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                                        <Bar dataKey="clicks" radius={[0, 8, 8, 0]} barSize={20} label={{ position: 'right', fill: '#f97316', fontSize: 11, fontWeight: 800 }}>
                                                            {linkStats.devices.map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#f97316', '#f59e0b', '#fbbf24'][index % 3]} />
                                                            ))}
                                                        </Bar>
                                                    </RechartsBarChart>
                                                </ResponsiveContainer>
                                            ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold italic text-sm">Chưa có dữ liệu thiết bị</div>}
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6">Hệ điều hành</h4>
                                        <div className="flex-1 min-h-[180px]">
                                            {linkStats.os.length ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsBarChart data={linkStats.os} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="os" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} width={90} />
                                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: 16, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                                        <Bar dataKey="clicks" radius={[0, 8, 8, 0]} barSize={20} label={{ position: 'right', fill: '#8b5cf6', fontSize: 11, fontWeight: 800 }}>
                                                            {linkStats.os.map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'][index % 4]} />
                                                            ))}
                                                        </Bar>
                                                    </RechartsBarChart>
                                                </ResponsiveContainer>
                                            ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold italic text-sm">Chưa có dữ liệu hệ điều hành</div>}
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-6">Quốc gia / Khu vực</h4>
                                        <div className="flex-1 min-h-[180px]">
                                            {linkStats.country && linkStats.country.length ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsBarChart data={linkStats.country} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="country" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} width={90} />
                                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: 16, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                                        <Bar dataKey="clicks" radius={[0, 8, 8, 0]} barSize={20} label={{ position: 'right', fill: '#0ea5e9', fontSize: 11, fontWeight: 800 }}>
                                                            {linkStats.country.map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6'][index % 4]} />
                                                            ))}
                                                        </Bar>
                                                    </RechartsBarChart>
                                                </ResponsiveContainer>
                                            ) : <div className="h-full flex items-center justify-center text-slate-400 font-bold italic text-sm">Chưa có dữ liệu quốc gia</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/30">
                                <RefreshCw className="w-12 h-12 text-slate-200 mx-auto mb-4 animate-spin-slow" />
                                <p className="text-slate-400 font-bold italic">Đang tải dữ liệu báo cáo...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo Link Tracking" size="md" footer={<div className="flex justify-between w-full"><Button variant="ghost" onClick={() => setIsAddOpen(false)}>Hủy</Button><Button onClick={handleSave} isLoading={isSubmitting} icon={CheckCircle2}>Tạo Link</Button></div>}>
                <div className="space-y-5 py-2">
                    <Input label="Tên chiến dịch / Link" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Link báo giá Tết..." autoFocus />
                    <Input label="URL Đích (Redirect)" value={formData.target_url || ''} onChange={e => setFormData({ ...formData, target_url: e.target.value })} placeholder="https://..." />

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mt-6">
                        <div className="flex justify-between items-center mb-4 cursor-pointer select-none" onClick={() => setFormData({ ...formData, is_survey_checkin: formData.is_survey_checkin ? 0 : 1 })}>
                            <div>
                                <h5 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Scan className="w-4 h-4" />Bật "Cổng kiểm soát" (Gateway)</h5>
                                <p className="text-[10px] text-indigo-700/70">Bắt buộc nhập form (Survey) trước khi đi đến Web đích.</p>
                            </div>
                            <div className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-colors ${formData.is_survey_checkin ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full"></div></div>
                        </div>
                        {!!formData.is_survey_checkin && (
                            <div className={`animate-in fade-in slide-in-from-top-2 pt-2 transition-all ${isSurveyPickerOpen ? 'mb-[240px]' : ''}`}>
                                <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-widest block mb-2">Chọn Khảo sát (Form) hiển thị</label>
                                <div className="relative">
                                    <div 
                                        className="w-full flex items-center justify-between p-3 bg-white border-2 border-indigo-200 rounded-2xl cursor-pointer hover:border-indigo-400 transition-colors"
                                        onClick={() => setIsSurveyPickerOpen(!isSurveyPickerOpen)}
                                    >
                                        {formData.survey_id && surveys.find(s => s.id === formData.survey_id) ? (
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><FileText className="w-4 h-4" /></div>
                                                <span className="text-sm font-bold text-slate-700">{surveys.find(s => s.id === formData.survey_id)?.name}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <div className="p-1.5 bg-slate-100 rounded-lg"><FileText className="w-4 h-4" /></div>
                                                <span className="text-sm font-medium">-- Chọn Form / Survey --</span>
                                            </div>
                                        )}
                                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                    </div>

                                    {isSurveyPickerOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsSurveyPickerOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                                <div className="p-2 border-b border-slate-100 flex gap-2 items-center bg-slate-50">
                                                    <div className="relative flex-1">
                                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input 
                                                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                                                            placeholder="Tìm nhanh form..." 
                                                            value={surveySearch}
                                                            onChange={(e) => setSurveySearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button size="sm" variant="outline" icon={Plus} className="shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => window.open('/', '_blank')}>Tạo Mới</Button>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                    {surveys.filter(s => s.name.toLowerCase().includes(surveySearch.toLowerCase())).length > 0 ? (
                                                        surveys.filter(s => s.name.toLowerCase().includes(surveySearch.toLowerCase())).map(s => (
                                                            <div 
                                                                key={s.id}
                                                                onClick={() => { setFormData({...formData, survey_id: s.id}); setIsSurveyPickerOpen(false); }}
                                                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${s.id === formData.survey_id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                                            >
                                                                <div className="flex items-center gap-3 max-w-[85%]">
                                                                    <div className={`p-1.5 rounded-lg shrink-0 ${s.id === formData.survey_id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                        <FileText className="w-4 h-4" />
                                                                    </div>
                                                                    <span className={`text-sm truncate ${s.id === formData.survey_id ? 'font-bold text-indigo-900' : 'font-medium text-slate-600'}`}>{s.name}</span>
                                                                </div>
                                                                {s.id === formData.survey_id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-slate-400 text-xs">Không tìm thấy form nào</div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Nâng cao & Bảo mật" size="md" footer={<div className="flex justify-between w-full"><Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Hủy</Button><Button onClick={handleSaveSettings} isLoading={isSubmitting} icon={Save}>Cập nhật lưu</Button></div>}>
                <div className="space-y-6 py-2">
                    <Input 
                        label="URL Đích (Redirect target)" 
                        value={settingsData.target_url || ''} 
                        onChange={e => setSettingsData({ ...settingsData, target_url: e.target.value })} 
                        placeholder="https://..." 
                    />
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Trạng thái hoạt động</h4>
                            <p className="text-[11px] text-slate-500">Tạm dừng truy cập cho chiến dịch này.</p>
                        </div>
                        <div 
                            className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${settingsData.status !== 'paused' ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                            onClick={() => setSettingsData({...settingsData, status: settingsData.status === 'paused' ? 'active' : 'paused'})}
                        >
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3">
                        <div className="flex gap-2 items-center">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Target className="w-4 h-4" /></div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Mật khẩu PIN Access</h4>
                                <p className="text-[11px] text-amber-700/80">Người dùng quét QR phải nhập đúng PIN để mở.</p>
                            </div>
                        </div>
                        <Input 
                            value={settingsData.access_pin || ''} 
                            onChange={e => setSettingsData({...settingsData, access_pin: e.target.value})} 
                            placeholder="Tạo mã PIN 4-8 số hoặc để trống..."
                            maxLength={8}
                        />
                    </div>
                </div>
            </Modal>

            <LinkGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            
            {selectedLink && (
                <QRDesignerModal
                    isOpen={isDesignerOpen}
                    onClose={() => setIsDesignerOpen(false)}
                    linkUrl={`${EXTERNAL_API_BASE.replace('/mail_api', '').replace('/api', '')}/go/${selectedLink.slug}`}
                    linkName={selectedLink.name}
                    initialConfig={selectedLink.qr_config_json}
                    onSave={async (configJson) => {
                        try {
                            const linkToUpdate = { ...selectedLink, qr_config_json: configJson };
                            setSelectedLink(linkToUpdate);
                            
                            // Persist to database immediately
                            setIsSubmitting(true);
                            const res = await api.put(`links_qr?action=update&id=${selectedLink.id}`, { 
                                qr_config_json: configJson 
                            });
                            
                            if (res.success) {
                                toast.success('Đã lưu thiết kế QR Code chuyên nghiệp');
                                fetchLinks(); // Refresh list to reflect changes
                                setIsDesignerOpen(false);
                            } else {
                                toast.error('Lỗi khi lưu vào hệ thống');
                            }
                        } catch (err) {
                            toast.error('Lỗi lưu cấu hình');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default LinksQR;
