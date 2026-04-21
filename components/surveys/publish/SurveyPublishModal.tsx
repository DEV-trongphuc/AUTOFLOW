import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Survey } from '../../../types/survey';
import { X, Link, QrCode, Code, Globe, Send, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
    survey: Survey;
    onClose: () => void;
    onPublish: () => Promise<void>;
}

const API = '/api/surveys.php';

const SurveyPublishModal: React.FC<Props> = ({ survey, onClose, onPublish }) => {
    const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'embed' | 'api'>('link');
    const [qrData, setQrData] = useState<{ url: string; qr_image_url: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoadingQr, setIsLoadingQr] = useState(false);

    const surveyUrl = survey.slug ? `${window.location.origin}/s/${survey.slug}` : '';

    const copy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    useEffect(() => {
        if (activeTab === 'qr' && survey.id && !qrData) {
            setIsLoadingQr(true);
            fetch(`${API}?action=qr&id=${survey.id}`)
                .then(r => r.json())
                .then(res => { if (res.success) setQrData(res.data); })
                .finally(() => setIsLoadingQr(false));
        }
    }, [activeTab, survey.id]);

    const embedCode = `<div id="domation-survey" data-survey="${survey.slug}" data-mode="inline"></div>
<script src="${window.location.origin}/widget/survey.js" async></script>`;

    const popupCode = `<button onclick="window.DomationSurvey.open('${survey.slug}')">Bắt đầu khảo sát</button>
<script src="${window.location.origin}/widget/survey.js" async></script>`;

    const apiCode = `// Lấy schema câu hỏi
GET ${window.location.origin}/api/survey_public.php?slug=${survey.slug}

// Nộp câu trả lời
POST ${window.location.origin}/api/survey_public.php?slug=${survey.slug}&action=submit
Content-Type: application/json

{
  "session_token": "unique-uuid-v4",
  "answers": [
    { "question_id": "q1", "type": "short_text", "answer_text": "Câu trả lời" },
    { "question_id": "q2", "type": "nps", "answer_num": 9 }
  ],
  "source_channel": "api",
  "time_spent_sec": 45
}`;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="font-bold text-slate-800">Xuất bản & Chia sẻ</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{survey.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Status Banner */}
                {survey.status !== 'active' && (
                    <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-sm text-amber-700 font-medium">Khảo sát ở trạng thái Nháp — chưa nhận được kết quả</span>
                        </div>
                        <button
                            onClick={async () => { setIsPublishing(true); await onPublish(); setIsPublishing(false); }}
                            disabled={isPublishing}
                            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                        >
                            {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Xuất bản ngay
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 px-6 mt-4">
                    {([['link', Link, 'Link'], ['qr', QrCode, 'QR Code'], ['embed', Code, 'Nhúng Website'], ['api', Globe, 'API']] as const).map(([tab, Icon, label]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                                ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="px-6 py-4 space-y-3">
                    {activeTab === 'link' && (
                        <>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Link khảo sát</label>
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 overflow-hidden">
                                    <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 truncate">{surveyUrl || 'Lưu khảo sát trước...'}</span>
                                </div>
                                <button
                                    onClick={() => surveyUrl && copy(surveyUrl, 'link')}
                                    disabled={!surveyUrl}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-600 transition-all"
                                >
                                    {copied === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <a
                                    href={surveyUrl}
                                    target="_blank"
                                    rel="noopener"
                                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl text-white text-sm transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {[
                                    { label: 'Trực tiếp', desc: '?src=direct', color: 'blue' },
                                    { label: 'Email', desc: '?src=email&utm_campaign=...', color: 'purple' },
                                    { label: 'QR Code', desc: '?src=qr', color: 'orange' },
                                ].map(ch => (
                                    <div key={ch.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-xs font-semibold text-slate-600">{ch.label}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono break-all">{ch.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'qr' && (
                        <div className="flex flex-col items-center gap-4">
                            {isLoadingQr ? (
                                <div className="flex flex-col items-center gap-2 py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                    <p className="text-sm text-slate-500">Đang tạo QR Code...</p>
                                </div>
                            ) : qrData ? (
                                <>
                                    <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100">
                                        <img src={qrData.qr_image_url} alt="QR Code" className="w-48 h-48" />
                                    </div>
                                    <p className="text-xs text-slate-500 text-center">Quét QR để mở khảo sát trên thiết bị di động</p>
                                    <div className="flex gap-2">
                                        <a
                                            href={qrData.qr_image_url}
                                            download="survey-qr.png"
                                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all"
                                        >
                                            Tải PNG
                                        </a>
                                        <button
                                            onClick={() => copy(qrData.url, 'qrurl')}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all"
                                        >
                                            {copied === 'qrurl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            Copy Link
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500 py-8">Lưu khảo sát trước để tạo QR</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'embed' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">Nhúng trực tiếp vào bất kỳ trang web nào bằng đoạn mã JavaScript:</p>
                            <div className="relative">
                                <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-xs overflow-x-auto font-mono">{embedCode}</pre>
                                <button
                                    onClick={() => copy(embedCode, 'embed')}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    {copied === 'embed' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">Hoặc dùng dạng popup khi click nút:</p>
                            <div className="relative">
                                <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-xs overflow-x-auto font-mono">{popupCode}</pre>
                                <button
                                    onClick={() => copy(popupCode, 'popup')}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    {copied === 'popup' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">Sử dụng Headless API để tích hợp vào app mobile, chatbot Zalo, hoặc kiosk:</p>
                            <div className="relative">
                                <pre className="bg-slate-900 text-sky-400 rounded-xl p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{apiCode}</pre>
                                <button
                                    onClick={() => copy(apiCode, 'api')}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    {copied === 'api' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SurveyPublishModal;
