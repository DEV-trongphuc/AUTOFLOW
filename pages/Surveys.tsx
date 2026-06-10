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
import ConfirmModal from '../components/common/ConfirmModal';
import Input from '../components/common/Input';
import Tabs from '../components/common/Tabs';
import Button from '../components/common/Button';
import { api } from '../services/storageAdapter';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

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
    isDark?: boolean;
}> = ({ survey, onConfirm, onCancel, isDark }) => {
    if (!survey) return null;
    return (
        <ConfirmModal
            isOpen={!!survey}
            onClose={onCancel}
            onConfirm={onConfirm}
            title="Xoá khảo sát"
            message={
                <>
                    Bạn có chắc muốn xoá khảo sát <span className="font-bold text-slate-900 dark:text-slate-200">"{survey.name}"</span>?
                    <br />Toàn bộ phản hồi và dữ liệu sẽ bị xoá vĩnh viễn.
                </>
            }
            confirmText="Xoá khảo sát"
            variant="danger"
            isDarkTheme={isDark}
        />
    );
};

// ─── Share / Preview Modal (opens when slug link is clicked) ─────────────────
const SurveyPreviewModal: React.FC<{
    survey: Survey | null;
    onClose: () => void;
    onEdit: () => void;
    isDark?: boolean;
}> = ({ survey, onClose, onEdit, isDark }) => {
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
        <Modal
            isOpen={!!survey}
            onClose={onClose}
            size="md"
            title={
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">Khảo sát</p>
                        <h3 className="text-slate-800 dark:text-slate-100 font-black text-base leading-tight line-clamp-1">{survey.name}</h3>
                        <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPublic ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {STATUS[survey.status as keyof typeof STATUS]?.label ?? survey.status}
                        </span>
                    </div>
                </div>
            }
            isDarkTheme={isDark}
        >
            <div className="space-y-4">
                {/* Slug link */}
                {publicUrl ? (
                    <>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link công khai</p>
                            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
                                <Link2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="flex-1 text-xs font-medium text-amber-700 dark:text-amber-400 truncate font-mono">{publicUrl}</span>
                                <button
                                    onClick={() => copy(publicUrl)}
                                    className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 transition-all"
                                    title="Copy link"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />}
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
                                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Mở trang</span>
                                </a>
                                <button
                                    onClick={onEdit}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <PenLine className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Thiết kế</span>
                                </button>
                                <button
                                    onClick={() => copy(emailTrackUrl ?? '')}
                                    className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <QrCode className="w-4 h-4 text-violet-600 dark:text-violet-500" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Email link</span>
                                </button>
                            </div>
                        )}

                        {/* Email tracking */}
                        {isPublic && emailTrackUrl && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-3.5 space-y-1.5">
                                <p className="text-[11px] font-black text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                    <Link2 className="w-3 h-3" /> Email Tracking Link
                                </p>
                                <p className="text-[10px] text-blue-600 dark:text-blue-500 leading-relaxed">
                                    Thêm vào cuối URL khi gửi qua email:
                                </p>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-blue-100 dark:border-blue-900/40">
                                    <code className="text-[10px] text-slate-500 dark:text-slate-400 flex-1 break-all font-mono">{emailTrackUrl}</code>
                                    <button onClick={() => copy(emailTrackUrl)} className="flex-shrink-0">
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                        <Globe className="w-8 h-8 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Chưa xuất bản</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nhấn "Thiết kế" để cấu hình và xuất bản</p>
                    </div>
                )}

                <button
                    onClick={onEdit}
                    className="w-full py-3 rounded-2xl font-black text-white text-sm shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}
                >
                    <PenLine className="w-4 h-4" />
                    Mở trình thiết kế
                </button>
            </div>
        </Modal>
    );
};

// ─── Create Modal ────────────────────────────────────────────────────────────
const CreateSurveyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
    isDark?: boolean;
}> = ({ isOpen, onClose, onCreate, isDark }) => {
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
        <Modal isOpen={isOpen} onClose={onClose} size="sm" isDarkTheme={isDark} title="Tạo khảo sát mới">
            <div className="space-y-4">
                <Input
                    label="Tên khảo sát"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="VD: Khảo sát hài lòng sản phẩm Q2/2026"
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    autoFocus
                />

                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-2.5">Mẫu phổ biến</p>
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
                                    type="button"
                                    onClick={() => setName(t.label)}
                                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                                        isActive ? 'border-amber-400 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
                                    }`}
                                    style={{ background: isActive ? (isDark ? 'rgba(245,158,11,0.15)' : t.bg) : (isDark ? '#161b24' : 'white') }}
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all bg-white dark:bg-slate-900"
                                        style={{ color: t.color, boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                                    >
                                        {t.svg}
                                    </div>
                                    <div className="flex-1 mt-0.5">
                                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight mb-0.5">{t.label}</p>
                                        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-450 leading-snug line-clamp-2">{t.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-2 shrink-0">
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
    const { isDark } = useTheme();
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
                isDark={isDark}
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
                isDark={isDark}
            />

            {/* Share / preview modal */}
            {previewSurvey && (
                <SurveyPreviewModal
                    survey={previewSurvey}
                    onClose={() => setPreviewSurvey(null)}
                    onEdit={() => { navigate(`/surveys/${previewSurvey.id}/edit`); setPreviewSurvey(null); }}
                    isDark={isDark}
                />
            )}

            <SurveyGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
};

export default Surveys;
