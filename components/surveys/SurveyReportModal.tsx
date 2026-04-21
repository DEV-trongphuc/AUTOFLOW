import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Survey, SurveyAnalyticsOverview, QuestionAnalytics } from '../../types/survey';
import {
    X, Users, CheckCircle, Clock, Smartphone, Monitor, Globe, BarChart2,
    Mail, QrCode, Zap, Link2, Star, TrendingUp, TrendingDown, Minus,
    ChevronRight, ExternalLink, RefreshCw, User, Copy, Check,
    ArrowUp, ArrowDown, Search, MapPin
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar as RechartsBar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { api } from '../../services/storageAdapter';

interface Props {
    survey: Survey | null;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (secs: number) => {
    if (!secs || secs <= 0) return '—';
    if (secs < 60) return `${Math.round(secs)}s`;
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s}s`;
};

const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0;

// ─── Pill-style progress bar ──────────────────────────────────────────────────
const Bar: React.FC<{ value: number; color?: string; height?: string }> = ({
    value, color = '#f59e0b', height = 'h-2'
}) => (
    <div className={`${height} bg-slate-100 rounded-full overflow-hidden`}>
        <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
    </div>
);

// ─── NPS Gauge ────────────────────────────────────────────────────────────────
const NpsGauge: React.FC<{ score: number; promoters: number; passives: number; detractors: number }> = ({
    score, promoters, passives, detractors
}) => {
    const total = promoters + passives + detractors;
    const pP = pct(promoters, total);
    const pPa = pct(passives, total);
    const pD = pct(detractors, total);
    const isPositive = score >= 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">NPS Score</p>
                    <p className={`text-4xl font-black leading-none mt-1 ${score >= 50 ? 'text-emerald-500' : score >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                        {score > 0 ? '+' : ''}{score}
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                        { label: 'Promoters', val: promoters, pct: pP, color: '#10b981', bg: '#ecfdf5' },
                        { label: 'Passives', val: passives, pct: pPa, color: '#f59e0b', bg: '#fffbeb' },
                        { label: 'Detractors', val: detractors, pct: pD, color: '#ef4444', bg: '#fef2f2' },
                    ].map(s => (
                        <div key={s.label} className="rounded-xl px-3 py-2" style={{ background: s.bg }}>
                            <p className="text-base font-black" style={{ color: s.color }}>{s.val}</p>
                            <p className="text-[9px] font-bold uppercase text-slate-400">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Segmented bar */}
            <div className="flex h-3 rounded-full overflow-hidden">
                <div className="bg-red-400 transition-all" style={{ width: `${pD}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${pPa}%` }} />
                <div className="bg-emerald-400 transition-all" style={{ width: `${pP}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
                <span className="text-red-400 font-bold">Detractors {pD}%</span>
                <span className="text-amber-400 font-bold">Passives {pPa}%</span>
                <span className="text-emerald-400 font-bold">Promoters {pP}%</span>
            </div>
        </div>
    );
};

// ─── Star rating widget ───────────────────────────────────────────────────────
const StarRating: React.FC<{ avg: number; dist?: Array<{ value: number; count: number }>; total: number }> = ({
    avg, dist, total
}) => {
    const max = dist ? Math.max(...dist.map(d => d.count), 1) : 1;
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-slate-800">{Number(avg).toFixed(1)}</span>
                <div>
                    <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-4 h-4" fill={i < Math.round(avg) ? '#f59e0b' : 'none'} stroke={i < Math.round(avg) ? '#f59e0b' : '#cbd5e1'} />
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{total} phản hồi</p>
                </div>
            </div>
            {dist && (
                <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map(star => {
                        const entry = dist.find(d => d.value === star);
                        const cnt = entry?.count ?? 0;
                        const p = pct(cnt, total);
                        return (
                            <div key={star} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-4">{star}</span>
                                <Star className="w-3 h-3 text-amber-400 flex-shrink-0" fill="#f59e0b" stroke="#f59e0b" />
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct(cnt, Math.max(...dist.map(d => d.count), 1)) * 100 / 100}%`, minWidth: cnt > 0 ? '4px' : 0 }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-6 text-right">{cnt}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Choice bar chart ─────────────────────────────────────────────────────────
const ChoiceChart: React.FC<{ dist: Array<{ label: string; count: number; percentage: number }> }> = ({ dist }) => {
    const max = Math.max(...dist.map(d => d.percentage), 1);
    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

    return (
        <div className="space-y-2.5">
            {dist.map((c, i) => (
                <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium truncate max-w-[55%]">{c.label}</span>
                        <span className="font-black text-slate-700">{c.count} <span className="font-normal text-slate-400">({c.percentage}%)</span></span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${c.percentage}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Per-question card ────────────────────────────────────────────────────────
const QuestionCard: React.FC<{ q: QuestionAnalytics; idx: number }> = ({ q, idx }) => {
    const typeIcons: Record<string, React.ReactNode> = {
        nps:           <div className="text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">NPS</div>,
        star_rating:   <Star className="w-3.5 h-3.5 text-amber-500" fill="#f59e0b" stroke="#f59e0b" />,
        single_choice: <div className="w-2 h-2 rounded-full border-2 border-slate-400" />,
        multi_choice:  <div className="w-2.5 h-2.5 rounded border-2 border-slate-400" />,
        likert:        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />,
        slider:        <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Range</div>,
        emoji_rating:  <span className="text-sm">😊</span>,
        short_text:    <div className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Text</div>,
        long_text:     <div className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Text</div>,
        matrix_single: <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Matrix</div>,
    };

    const skipPct = Math.round((q.skip_rate ?? 0) * 100);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-50 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-amber-600">#{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{q.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                        {typeIcons[q.type] ?? <div className="text-[9px] text-slate-400">{q.type}</div>}
                        <span className="text-[10px] text-slate-400">{q.total_answered} phản hồi</span>
                        {skipPct > 0 && <span className="text-[10px] text-red-400">{skipPct}% bỏ qua</span>}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
                {q.nps_score !== undefined && (
                    <NpsGauge
                        score={q.nps_score}
                        promoters={q.promoters ?? 0}
                        passives={q.passives ?? 0}
                        detractors={q.detractors ?? 0}
                    />
                )}
                {q.avg_rating !== undefined && q.nps_score === undefined && (
                    <StarRating avg={q.avg_rating} dist={q.rating_distribution} total={q.total_answered} />
                )}
                {q.choice_distribution && q.choice_distribution.length > 0 && (
                    <ChoiceChart dist={q.choice_distribution} />
                )}
                {q.text_responses && q.text_responses.length > 0 && (
                    <div className="space-y-2">
                        {q.text_responses.slice(0, 5).map((t, i) => (
                            <div key={i} className="flex gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 h-3 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-600 italic leading-snug">
                                    {(() => {
                                        if ((q.type === 'matrix_single' || q.type === 'matrix_multi') && q.content) {
                                            try {
                                                const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
                                                const answer = JSON.parse(t);
                                                const rowMap = new Map(content.rows?.map((r: any) => [r.id, r.text]));
                                                const colMap = new Map(content.columns?.map((c: any) => [c.id, c.text]));
                                                
                                                const results: string[] = [];
                                                for (const [rowId, colIds] of Object.entries(answer)) {
                                                    const rowText = rowMap.get(rowId) || rowId;
                                                    const cols = Array.isArray(colIds) ? colIds.map((id: string) => colMap.get(id) || id) : [colMap.get(colIds as string) || colIds];
                                                    results.push(`${rowText}: ${cols.join(', ')}`);
                                                }
                                                return results.join(' | ');
                                            } catch (e) {
                                                return t;
                                            }
                                        }
                                        if (q.type === 'ranking' && q.options) {
                                            try {
                                                const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                                                const answer = JSON.parse(t);
                                                const optMap = new Map(options.map((o: any) => [o.id, o.label]));
                                                const results = (answer as string[]).map((id, index) => `${index + 1}. ${optMap.get(id) || id}`);
                                                return results.join(' ➔ ');
                                            } catch (e) {
                                                return t;
                                            }
                                        }
                                        return t;
                                    })()}
                                </p>
                            </div>
                        ))}
                        {q.text_responses.length > 5 && (
                            <p className="text-xs text-slate-400 text-center py-1">+{q.text_responses.length - 5} phản hồi khác</p>
                        )}
                    </div>
                )}
                {/* Skip rate micro bar */}
                {skipPct > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-50">
                        <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-400">Tỷ lệ trả lời</span>
                            <span className="font-bold text-slate-600">{100 - skipPct}%</span>
                        </div>
                        <Bar value={100 - skipPct} color="#f59e0b" />
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Respondents list ─────────────────────────────────────────────────────────
const RespondentsList: React.FC<{ surveyId: string }> = ({ surveyId }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        api.get<any>(`surveys/${surveyId}?action=respondents`)
            .then(r => { if (r.success) setData(r.data ?? []); })
            .finally(() => setLoading(false));
    }, [surveyId]);

    const filtered = data.filter(r =>
        !search || (r.subscriber_email ?? '').toLowerCase().includes(search.toLowerCase())
        || (r.subscriber_name ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const copyLink = (email: string, id: string) => {
        const link = `${window.location.origin}/survey/${encodeURIComponent(id)}?src=email&uid=${encodeURIComponent(email)}`;
        navigator.clipboard.writeText(link);
        setCopiedId(email);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm theo email hoặc tên..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    {search ? 'Không tìm thấy kết quả' : 'Chưa có phản hồi nào'}
                </div>
            ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                    {filtered.map((r, i) => (
                        <div key={r.id ?? i} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all group">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                                {(r.subscriber_name || r.subscriber_email || '?')[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">
                                    {r.subscriber_name || <span className="text-slate-400 font-normal">Ẩn danh</span>}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{r.subscriber_email || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${r.completion_rate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {Math.round(r.completion_rate ?? 0)}%
                                </span>
                                {r.subscriber_email && (
                                    <button
                                        onClick={() => copyLink(r.subscriber_email, surveyId)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 transition-all"
                                        title="Copy link có tracking email"
                                    >
                                        {copiedId === r.subscriber_email ? <Check className="w-3 h-3 text-emerald-500" /> : <Link2 className="w-3 h-3 text-slate-400" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Email tracking instruction */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email Tracking Link
                </p>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                    Khi gửi khảo sát qua email, thêm <code className="bg-blue-100 px-1 rounded font-mono">?src=email&uid={"{{email}}"}</code> vào cuối link.
                    Hệ thống sẽ tự động gắn email người nhận để tracking cá nhân hóa.
                </p>
                <div className="bg-white rounded-xl px-3 py-2 font-mono text-[10px] text-slate-500 break-all">
                    https://yourdomain.com/s/<span className="text-amber-600">{surveyId.slice(0, 8)}</span>?src=email&uid=<span className="text-blue-600">{"{{email}}"}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Main SurveyReportModal ───────────────────────────────────────────────────
const SurveyReportModal: React.FC<Props> = ({ survey, isOpen, onClose }) => {
    const [tab, setTab] = useState<'overview' | 'questions' | 'respondents'>('overview');
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !survey) return;
        setLoading(true);
        setAnalytics(null);
        api.get<any>(`surveys/${survey.id}?action=analytics`)
            .then(r => { if (r.success) setAnalytics(r.data); })
            .finally(() => setLoading(false));
    }, [isOpen, survey?.id]);

    if (!isOpen || !survey) return null;

    const ov = analytics?.overview;
    const questions: QuestionAnalytics[] = analytics?.questions ?? [];
    const byDate: Array<{ date: string; count: number }> = analytics?.by_date ?? [];
    const primaryColor = survey.theme?.primaryColor ?? '#f59e0b';

    const TABS = [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'questions', label: `Câu hỏi (${questions.length})` },
        { id: 'respondents', label: 'Người tham gia' },
    ] as const;

    const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; color: string; key: string }> = {
        direct:  { label: 'Link trực tiếp', icon: <Globe className="w-3.5 h-3.5" />,       color: '#3b82f6', key: 'direct_count' },
        qr:      { label: 'QR Code',         icon: <QrCode className="w-3.5 h-3.5" />,      color: '#8b5cf6', key: 'qr_count' },
        email:   { label: 'Email',            icon: <Mail className="w-3.5 h-3.5" />,        color: '#f59e0b', key: 'email_count' },
        widget:  { label: 'Widget',           icon: <Zap className="w-3.5 h-3.5" />,         color: '#10b981', key: 'widget_count' },
        api:     { label: 'API',              icon: <Link2 className="w-3.5 h-3.5" />,       color: '#ec4899', key: 'api_count' },
    };

    const barMax = byDate.length > 0 ? Math.max(...byDate.map(d => d.count), 1) : 1;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel — full height, flush to top */}
            <div className="absolute inset-y-0 right-0 w-full max-w-[1100px] bg-white flex flex-col shadow-2xl shadow-slate-900/30 animate-in slide-in-from-right duration-300">

                {/* ── NEW CLEAN HEADER ────────────────────────────────────────────── */}
                <div className="px-8 pt-6 pb-0 flex-shrink-0 bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap text-[11px] font-bold">
                                {survey.status === 'active' ? (
                                    <span className="px-2 py-0.5 rounded text-emerald-600 bg-emerald-50 border border-emerald-100 uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ACTIVE
                                    </span>
                                ) : survey.status === 'paused' ? (
                                    <span className="px-2 py-0.5 rounded text-amber-600 bg-amber-50 border border-amber-100 uppercase tracking-widest flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> PAUSED
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-slate-500 bg-slate-100 border border-slate-200 uppercase tracking-widest">DRAFT</span>
                                )}
                                {ov && <span className="text-slate-400 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-300" /> Tạo lúc: {new Date(survey.created_at || '').toLocaleDateString('vi-VN')}</span>}
                                <span className="text-slate-400 font-medium flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
                                    ID: <span className="font-mono text-slate-600">{survey.id.split('-')[0]}</span>
                                </span>
                            </div>
                            <h2 className="text-slate-800 font-black text-2xl leading-tight truncate mt-1">{survey.name}</h2>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => {
                                    setLoading(true);
                                    api.get<any>(`surveys/${survey.id}?action=analytics`)
                                        .then(r => { if (r.success) setAnalytics(r.data); })
                                        .finally(() => setLoading(false));
                                }}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
                            </button>
                            <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ── TABS ─────────────────────────────────────────────────── */}
                    <div className="flex border-b border-slate-100 mt-5 pt-1">
                        <button onClick={() => setTab('overview')}
                            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all -mb-px ${tab === 'overview' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        ><BarChart2 className="w-4 h-4" /> Báo cáo</button>
                        <button onClick={() => setTab('questions')}
                            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-all -mb-px ${tab === 'questions' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        ><BarChart2 className="w-4 h-4" /> Nội dung <span className="ml-0.5 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px]">{questions.length}</span></button>
                        <button onClick={() => setTab('respondents')}
                            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-all -mb-px ${tab === 'respondents' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        ><Users className="w-4 h-4" /> Đối tượng</button>
                    </div>
                </div>

                {/* ── BODY ─────────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {loading ? (
                        <div className="p-6 grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                        </div>
                    ) : !ov && tab === 'overview' ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-20">
                            <BarChart2 className="w-12 h-12 text-slate-200" />
                            <p className="text-sm font-semibold">Chưa có dữ liệu phân tích</p>
                            <p className="text-xs">Khảo sát cần có ít nhất một phản hồi</p>
                        </div>
                    ) : tab === 'overview' && ov ? (
                        <div className="p-8 space-y-6">
                            {/* KPI strip */}
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: 'TỔNG LƯỢT PHẢN HỒI', desc: 'LƯỢT THAM GIA', value: Number(ov.total_responses ?? 0).toLocaleString(), icon: <Users className="w-5 h-5 text-white" />, iconBg: 'bg-emerald-500' },
                                    { label: 'TỶ LỆ HOÀN THÀNH', desc: 'COMPLETION RATE', value: ov.avg_completion_rate ? `${Math.round(ov.avg_completion_rate)}%` : '0%', icon: <CheckCircle className="w-5 h-5 text-white" />, iconBg: 'bg-indigo-500' },
                                    { label: 'THỜI GIAN TB', desc: 'TRUNG BÌNH', value: formatTime(+ov.avg_time_spent_sec), icon: <Clock className="w-5 h-5 text-white" />, iconBg: 'bg-blue-500' },
                                    { label: 'TỶ LỆ MOBILE', desc: 'MOBILE USERS', value: (ov.mobile_count && ov.total_responses) ? `${pct(+ov.mobile_count, +ov.total_responses)}%` : '0%', icon: <Smartphone className="w-5 h-5 text-white" />, iconBg: 'bg-amber-500' },
                                ].map((s, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                            <p className="text-3xl font-black text-slate-800 mt-1 leading-none">{s.value}</p>
                                            <p className="text-[9px] text-slate-400 mt-2 uppercase">{s.desc}</p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg} shadow-sm`}>
                                            {s.icon}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Trend chart (Trả lời theo ngày) */}
                            {byDate.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Lượt trả lời theo ngày</h4>
                                    <div className="h-[180px] w-full -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={byDate}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => String(v).slice(5)} />
                                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Line type="monotone" dataKey="count" name="Phản hồi" stroke={primaryColor} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Channel + Device */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Channel */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Nguồn kênh</h4>
                                    <div className="space-y-3">
                                        {Object.entries(CHANNEL_META).map(([k, ch]) => {
                                            const cnt = Number(ov[ch.key] ?? 0);
                                            const p = pct(cnt, Number(ov.total_responses ?? 1) || 1);
                                            return (
                                                <div key={k}>
                                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                                        <span className="flex items-center gap-1.5 font-medium text-slate-600" style={{ color: p > 0 ? ch.color : undefined }}>
                                                            <span style={{ color: ch.color }}>{ch.icon}</span>
                                                            {ch.label}
                                                        </span>
                                                        <span className="font-black text-slate-700">{cnt} <span className="font-normal text-slate-400">({p}%)</span></span>
                                                    </div>
                                                    <Bar value={p} color={ch.color} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Device Donut Chart */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thiết bị</h4>
                                    <div className="h-[200px] w-full flex items-center justify-center">
                                        {(() => {
                                            const DEVICE_COLORS: Record<string, string> = { 'Desktop': '#3b82f6', 'Mobile': '#f59e0b', 'Tablet': '#8b5cf6' };
                                            const deviceData = [
                                                { name: 'Desktop', value: Number(ov.desktop_count ?? 0) },
                                                { name: 'Mobile', value: Number(ov.mobile_count ?? 0) },
                                                { name: 'Tablet', value: Number(ov.tablet_count ?? 0) }
                                            ].filter(x => x.value > 0);
                                            
                                            if (deviceData.length === 0) return <span className="text-xs text-slate-400">Không có dữ liệu</span>;

                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={deviceData}
                                                            innerRadius={55}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {deviceData.map(e => <Cell key={e.name} fill={DEVICE_COLORS[e.name]} />)}
                                                        </Pie>
                                                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Country Bar Chart */}
                            {ov.countries && ov.countries.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" /> Vị trí (Quốc gia)
                                    </h4>
                                    <div className="h-[200px] w-full -ml-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={ov.countries}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="country" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <RechartsBar dataKey="count" name="Lượt phản hồi" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* NPS global if applicable */}
                            {ov.nps_score !== undefined && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">NPS tổng thể</h4>
                                    <NpsGauge
                                        score={ov.nps_score}
                                        promoters={ov.promoters ?? 0}
                                        passives={ov.passives ?? 0}
                                        detractors={ov.detractors ?? 0}
                                    />
                                </div>
                            )}

                            {/* Quick question summary (first 3 questions) */}
                            {questions.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Nổi bật từng câu</h4>
                                        <button onClick={() => setTab('questions')} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                                            Xem tất cả <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {questions.slice(0, 2).map((q, i) => (
                                            <QuestionCard key={q.question_id} q={q} idx={i} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    ) : tab === 'questions' ? (
                        <div className="p-6 space-y-4">
                            {questions.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 text-sm">Chưa có dữ liệu phân tích câu hỏi</div>
                            ) : (
                                questions.map((q, i) => <QuestionCard key={q.question_id} q={q} idx={i} />)
                            )}
                        </div>

                    ) : tab === 'respondents' ? (
                        <div className="p-6">
                            <RespondentsList surveyId={survey.id} />
                        </div>
                      ) : null}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SurveyReportModal;
