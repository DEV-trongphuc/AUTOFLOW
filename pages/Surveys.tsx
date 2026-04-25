import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Survey } from '../types/survey';
import {
    Plus, Search, BarChart2, Globe, Trash2, FileText,
    Users, CheckCircle, Share2, Star, Clock, Smartphone,
    Monitor, LayoutGrid, Ticket, PenSquare, ArrowUpRight, PenLine,
    Link2, Copy, Check, ExternalLink, Eye, X, QrCode, AlertTriangle, Lightbulb, Loader2
} from 'lucide-react';
import SurveyReportModal from '../components/surveys/SurveyReportModal';
import SurveyGuideModal from '../components/surveys/SurveyGuideModal';
import PageHero from '../components/common/PageHero';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Tabs from '../components/common/Tabs';
import Button from '../components/common/Button';
import { api } from '../services/storageAdapter';
import { toast } from 'react-hot-toast';

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS = {
    draft:  { label: 'Nháp',       dotClass: 'bg-slate-400',                 badgeClass: 'bg-slate-100 text-slate-600' },
    active: { label: 'Đang chạy',  dotClass: 'bg-emerald-500 animate-pulse', badgeClass: 'bg-emerald-100 text-emerald-700' },
    paused: { label: 'Tạm dừng',   dotClass: 'bg-amber-400',                 badgeClass: 'bg-amber-100 text-amber-700' },
    closed: { label: 'Đã đóng',    dotClass: 'bg-red-400',                   badgeClass: 'bg-red-100 text-red-600' },
};

// ─── Confirm Delete Modal ────────────────────────────────────────────────────
const ConfirmDeleteModal: React.FC<{
    survey: Survey | null;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ survey, onConfirm, onCancel }) => {
    if (!survey) return null;
    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Red header strip */}
                <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-red-500 to-rose-600 relative overflow-hidden">
                    <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)'}} />
                    <div className="relative flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-black text-base leading-tight">Xoá khảo sát</p>
                            <p className="text-white/70 text-xs mt-0.5">Hành động không thể hoàn tác</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Bạn có chắc muốn xoá khảo sát{' '}
                        <span className="font-black text-slate-800">"{survey.name}"</span>?
                        <br />Toàn bộ phản hồi và dữ liệu sẽ bị xoá vĩnh viễn.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            Huỷ
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-[2] py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm shadow-lg hover:brightness-110 transition-all"
                        >
                            Xoá khảo sát
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Share / Preview Modal (opens when slug link is clicked) ─────────────────
const SurveyPreviewModal: React.FC<{
    survey: Survey | null;
    onClose: () => void;
    onEdit: () => void;
}> = ({ survey, onClose, onEdit }) => {
    const [copied, setCopied] = useState(false);
    if (!survey) return null;

    const publicUrl = survey.slug
        ? `${window.location.origin}/s/${survey.slug}`
        : null;

    const isPublic = survey.status === 'active';

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const emailTrackUrl = publicUrl
        ? `${publicUrl}?src=email&uid={{email}}`
        : null;

    return (
        <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Amber header */}
                <div className="px-6 pt-6 pb-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,#b45309 0%,#d97706 40%,#f59e0b 100%)'}}>
                    <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 80% 30%, rgba(255,255,255,0.12) 0%, transparent 55%)'}} />
                    <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {/* Rounded-square icon */}
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">Khảo sát</p>
                                <h3 className="text-white font-black text-base leading-tight line-clamp-1">{survey.name}</h3>
                                <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isPublic ? 'bg-emerald-500/30 text-white' : 'bg-white/20 text-white/70'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-emerald-300 animate-pulse' : 'bg-white/50'}`} />
                                    {STATUS[survey.status as keyof typeof STATUS]?.label ?? survey.status}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Slug link */}
                    {publicUrl ? (
                        <>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link công khai</p>
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <Link2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    <span className="flex-1 text-xs font-medium text-amber-700 truncate font-mono">{publicUrl}</span>
                                    <button
                                        onClick={() => copy(publicUrl)}
                                        className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-all"
                                        title="Copy link"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
                                    </button>
                                </div>
                            </div>

                            {/* Sharing options */}
                            {isPublic && (
                                <div className="grid grid-cols-3 gap-2">
                                    <a
                                        href={publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ExternalLink className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">Mở trang</span>
                                    </a>
                                    <button
                                        onClick={onEdit}
                                        className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <PenLine className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">Thiết kế</span>
                                    </button>
                                    <button
                                        onClick={() => copy(emailTrackUrl ?? '')}
                                        className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <QrCode className="w-4 h-4 text-violet-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">Email link</span>
                                    </button>
                                </div>
                            )}

                            {/* Email tracking */}
                            {isPublic && emailTrackUrl && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 space-y-1.5">
                                    <p className="text-[11px] font-black text-blue-700 flex items-center gap-1.5">
                                        <Link2 className="w-3 h-3" /> Email Tracking Link
                                    </p>
                                    <p className="text-[10px] text-blue-600 leading-relaxed">
                                        Thêm vào cuối URL khi gửi qua email:
                                    </p>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-blue-100">
                                        <code className="text-[10px] text-slate-500 flex-1 break-all font-mono">{emailTrackUrl}</code>
                                        <button onClick={() => copy(emailTrackUrl)} className="flex-shrink-0">
                                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center">
                            <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-500">Chưa xuất bản</p>
                            <p className="text-xs text-slate-400 mt-0.5">Nhấn "Thiết kế" để cấu hình và xuất bản</p>
                        </div>
                    )}

                    <button
                        onClick={onEdit}
                        className="w-full py-3 rounded-2xl font-black text-white text-sm shadow-lg hover:brightness-110 transition-all"
                        style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}
                    >
                        <PenLine className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                        Mở trình thiết kế
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Create Modal ────────────────────────────────────────────────────────────
const CreateSurveyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('Khảo sát mới');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        await onCreate(name.trim());
        setIsLoading(false);
        setName('Khảo sát mới');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" noHeader noPadding>
            <div className="flex flex-col">
                {/* Gradient header strip */}
                <div className="px-6 pt-8 pb-5 bg-gradient-to-br from-amber-500 to-orange-500 relative overflow-hidden">
                    <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 80% 40%, rgba(255,255,255,0.15) 0%, transparent 55%)'}} />
                    <div className="flex items-start justify-between relative">
                        <div>
                            <p className="text-white font-black text-xl leading-tight">Tạo khảo sát mới</p>
                            <p className="text-white/70 text-xs mt-1">Chọn mẫu hoặc nhập tên để bắt đầu</p>
                        </div>
                        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-4 mt-0.5">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4 bg-white">
                    <Input
                        label="Tên khảo sát"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="VD: Khảo sát hài lòng sản phẩm Q2/2026"
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        autoFocus
                    />

                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5">Mẫu phổ biến</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {([
                                { label: 'Khảo sát NPS', desc: 'Đo điểm hài lòng khách hàng', color: '#f59e0b', bg: '#fffbeb',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" strokeLinejoin="round"/></svg>) },
                                { label: 'Phản hồi sản phẩm', desc: 'Thu thập ý kiến về sản phẩm', color: '#3b82f6', bg: '#eff6ff',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>) },
                                { label: 'Đánh giá dịch vụ', desc: 'Chất lượng dịch vụ sau mua', color: '#10b981', bg: '#ecfdf5',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>) },
                                { label: 'Khảo sát thị trường', desc: 'Nghiên cứu thói quen người dùng', color: '#8b5cf6', bg: '#f5f3ff',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>) },
                                { label: 'Mẫu Quiz (Trắc nghiệm)', desc: 'Kiểm tra kiến thức, đánh giá', color: '#ec4899', bg: '#fdf2f8',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>) },
                                { label: 'Mẫu Check-in Event', desc: 'Đăng ký tham gia sự kiện, quét QR', color: '#14b8a6', bg: '#f0fdfa',
                                  svg: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>) },
                            ] as const).map((t: any) => {
                                const isActive = name === t.label;
                                return (
                                    <button
                                        key={t.label}
                                        onClick={() => setName(t.label)}
                                        className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                                            isActive ? 'border-amber-400 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                        }`}
                                        style={{ background: isActive ? t.bg : 'white' }}
                                    >
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                            style={{ color: t.color, background: 'white', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                        >
                                            {t.svg}
                                        </div>
                                        <div className="flex-1 mt-0.5">
                                            <p className="text-[11px] font-bold text-slate-800 leading-tight mb-0.5">{t.label}</p>
                                            <p className="text-[9px] font-medium text-slate-500 leading-snug line-clamp-2">{t.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5 bg-slate-50 flex items-center justify-between border-t border-slate-100 mt-2 shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                        Huỷ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-b from-amber-400 to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Tạo khảo sát ngay
                    </button>
                </div>
            </div>
        </Modal>
    );
};




// ─── Survey Card ─────────────────────────────────────────────────────────────
const SurveyCard: React.FC<{
    survey: Survey;
    viewMode?: 'grid' | 'list';
    onEdit: () => void;
    onAnalytics: () => void;
    onDelete: () => void;
    onTogglePause: () => void;
    onSlugClick: () => void;
}> = ({ survey, viewMode = 'grid', onEdit, onAnalytics, onDelete, onTogglePause, onSlugClick }) => {
    const sc = STATUS[survey.status as keyof typeof STATUS] ?? STATUS.draft;
    const responses = survey.response_count ?? 0;
    const completion = survey.completion_rate ?? 0;
    const nps = survey.avg_nps;

    if (viewMode === 'list') {
        return (
            <div className="group bg-white rounded-[20px] border border-slate-100 p-3 sm:p-4 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:shadow-md hover:border-slate-200 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-sm" style={{background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)'}}>
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-bold text-slate-700 truncate mb-1">{survey.name}</h3>
                        {survey.slug ? (
                            <button onClick={onSlugClick} className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group/slug" title="Xem / chia sẻ khảo sát">
                                <Link2 className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                <span className="text-[10px] font-bold text-amber-800 truncate line-clamp-1">/s/{survey.slug}</span>
                            </button>
                        ) : (
                            <p className="text-[10px] font-semibold text-slate-400 italic">Chưa xuất bản</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end shrink-0 hidden lg:flex border-l border-slate-100 pl-6 w-32">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lượt trả lời</span>
                    <span className="text-[12px] font-black text-slate-700">{responses.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0 ml-auto md:ml-0">
                    <Button className="h-8 px-3 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hidden md:flex" variant="custom" icon={PenLine} onClick={onEdit}>Thiết kế</Button>
                    <Button className="h-8 px-3 text-[11px]" variant="outline" icon={BarChart2} iconClassName="text-amber-500" onClick={onAnalytics}>Báo cáo</Button>
                    
                    <div className="w-px h-8 bg-slate-100 mx-1 hidden sm:block"></div>
                    
                    <div className="flex gap-1.5 items-center transition-opacity">
                        <label className="relative inline-flex items-center cursor-pointer mr-1" title={survey.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}>
                            <input type="checkbox" className="sr-only peer" checked={survey.status === 'active'} onChange={onTogglePause} />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 hover:bg-slate-300 peer-checked:hover:bg-emerald-600"></div>
                        </label>
                        <button onClick={onDelete} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="group bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden">
            {/* decorative blob */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />

            {/* Top: icon + toggle + delete */}
            <div className="flex justify-between items-center mb-4">
                {/* Amber rounded-square icon (like Globe in screenshot) */}
                <div
                    className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)'}}
                >
                    <FileText className="w-7 h-7 text-white drop-shadow-sm" />
                </div>

                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer" title={survey.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}>
                        <input type="checkbox" className="sr-only peer" checked={survey.status === 'active'} onChange={onTogglePause} />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 hover:bg-slate-300 peer-checked:hover:bg-emerald-600" />
                        <span className={`ml-2 text-[10px] uppercase font-black tracking-widest ${survey.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {survey.status === 'active' ? 'Live' : 'Off'}
                        </span>
                    </label>
                    {/* Delete only — no extra edit icon since Thiết kế button exists */}
                    <button onClick={onDelete} className="text-slate-300 hover:text-rose-600 transition-colors p-1" title="Xoá">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Title */}
            <h3 className="text-[15px] font-bold text-slate-600 tracking-tight leading-tight line-clamp-1 mb-1">{survey.name}</h3>

            {/* Slug link — styled like form trigger connect link */}
            {survey.slug ? (
                <button
                    onClick={onSlugClick}
                    className="flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group/slug mb-4"
                    title="Xem / chia sẻ khảo sát"
                >
                    <Link2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-amber-800 truncate line-clamp-1 max-w-[200px]">
                        /s/{survey.slug}
                    </span>
                </button>
            ) : (
                <p className="text-[11px] font-semibold text-slate-400 mb-4 italic">Chưa xuất bản</p>
            )}

            {/* Stats panel */}
            <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-3 flex flex-col gap-1.5 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lượt trả lời</span>
                    <span className="text-xs font-black text-slate-700">{responses.toLocaleString()}</span>
                </div>

                {nps !== undefined && (
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NPS Score</span>
                        <span className={`text-xs font-black ${nps >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {nps > 0 ? '+' : ''}{nps}
                        </span>
                    </div>
                )}
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2 mt-auto">
                <Button
                    variant="custom"
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                    icon={PenLine}
                    onClick={onEdit}
                >
                    Thiết kế
                </Button>
                <Button
                    variant="outline"
                    className="flex-[2] border-amber-200 text-amber-700 hover:bg-amber-50"
                    icon={BarChart2}
                    iconClassName="text-amber-500"
                    onClick={onAnalytics}
                >
                    Xem báo cáo
                </Button>
            </div>
        </div>
    );
};

// ─── Main Surveys Page ───────────────────────────────────────────────────────
const Surveys: React.FC = () => {
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCreate, setShowCreate] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [reportSurvey, setReportSurvey] = useState<Survey | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
    const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get<Survey[]>('surveys?action=list');
                if (res.success) setSurveys(res.data as Survey[]);
            } catch (err) {
                toast.error('Không thể tải danh sách khảo sát');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleCreate = async (name: string) => {
        const res = await api.post<{ id: string; slug: string }>('surveys?action=create', { name });
        if (res.success) {
            setShowCreate(false);
            navigate(`/surveys/${(res.data as any).id}/edit`);
        } else {
            toast.error('Tạo khảo sát thất bại');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`surveys/${deleteTarget.id}?action=delete`);
            setSurveys(prev => prev.filter(s => s.id !== deleteTarget.id));
            toast.success('Đã xoá khảo sát');
        } catch (err) {
            toast.error('Xoá thất bại, vui lòng thử lại');
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleTogglePause = async (survey: Survey) => {
        const action = survey.status === 'active' ? 'pause' : 'publish';
        try {
            const res = await api.post(`surveys/${survey.id}?action=${action}`, {});
            if (res.success) setSurveys(prev => prev.map(s =>
                s.id === survey.id ? { ...s, status: survey.status === 'active' ? 'paused' : 'active' } : s
            ));
        } catch (err) {
            toast.error('Cập nhật trạng thái thất bại');
        }
    };

    const filtered = surveys.filter(s => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === 'all' || activeTab === 'report' || s.status === activeTab;
        return matchSearch && matchTab;
    });

    const TABS = [
        { id: 'all',    label: 'Tất cả',    icon: LayoutGrid, count: surveys.length },
        { id: 'active', label: 'Đang chạy', icon: Ticket,     count: surveys.filter(s => s.status === 'active').length },
        { id: 'draft',  label: 'Bản nháp',  icon: PenSquare,  count: surveys.filter(s => s.status === 'draft').length },
    ];

    return (
        <div className="animate-fade-in space-y-6 pb-32">
            {/* Hero */}
            <PageHero
                title={<>Trung tâm <span className="text-amber-100/80">Khảo Sát</span></>}
                subtitle="Thu thập phản hồi khách hàng, phân tích mức độ hài lòng và thiết lập dữ liệu (Zero-party Data) cho luồng Automation của bạn."
                showStatus={surveys.some(s => s.status === 'active')}
                statusText={`${surveys.filter(s => s.status === 'active').length} Đang chạy`}
                actions={[
                    { label: 'Tạo khảo sát mới', icon: Plus,     onClick: () => setShowCreate(true), primary: true },
                    { label: 'Hướng dẫn chi tiết', icon: Lightbulb, onClick: () => setIsGuideOpen(true), primary: false },
                ]}
            />

            {/* Content card */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 lg:p-6 min-h-[500px]">
                {/* Tabs + Search */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab}
                        items={TABS}
                    />
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Tìm kiếm khảo sát..."
                            icon={Search}
                            className="w-56"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/50">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Giao diện dạng thẻ"><LayoutGrid className="w-4 h-4" /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Giao diện danh sách">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-slate-50 rounded-[24px] h-64 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-5">
                        <svg width="72" height="52" viewBox="0 0 72 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2"  y="28" width="16" height="22" rx="3" fill="#e2e8f0"/>
                            <rect x="28" y="12" width="16" height="38" rx="3" fill="#cbd5e1"/>
                            <rect x="54" y="20" width="16" height="30" rx="3" fill="#e2e8f0"/>
                        </svg>
                        <p className="text-sm font-semibold text-slate-400">
                            {search ? 'Không tìm thấy khảo sát nào' : 'Chưa có khảo sát nào'}
                        </p>
                        {!search && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 bg-[#fbbf24] text-[#451a03] border border-[#d97706] hover:bg-[#fcd34d] hover:scale-105 shadow-lg transition-all font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo khảo sát ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" : "flex flex-col gap-3"}>
                        {filtered.map(survey => (
                            <SurveyCard
                                key={survey.id}
                                survey={survey}
                                viewMode={viewMode}
                                onEdit={() => navigate(`/surveys/${survey.id}/edit`)}
                                onAnalytics={() => setReportSurvey(survey)}
                                onDelete={() => setDeleteTarget(survey)}
                                onTogglePause={() => handleTogglePause(survey)}
                                onSlugClick={() => setPreviewSurvey(survey)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create modal */}
            <CreateSurveyModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
            />

            {/* Report modal */}
            <SurveyReportModal
                survey={reportSurvey}
                isOpen={!!reportSurvey}
                onClose={() => setReportSurvey(null)}
            />

            {/* Confirm delete modal */}
            <ConfirmDeleteModal
                survey={deleteTarget}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Share / preview modal */}
            {previewSurvey && (
                <SurveyPreviewModal
                    survey={previewSurvey}
                    onClose={() => setPreviewSurvey(null)}
                    onEdit={() => { navigate(`/surveys/${previewSurvey.id}/edit`); setPreviewSurvey(null); }}
                />
            )}

            <SurveyGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
};

export default Surveys;
