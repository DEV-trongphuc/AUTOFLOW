import React, { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, Code, Globe, Zap, CheckCircle2, ChevronRight, Activity, ArrowRight, Server, Smartphone, MonitorSmartphone, Bot, Link, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/storageAdapter';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const SystemConnectionsModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [fetchedStatus, setFetchedStatus] = useState<any>(null);
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setFetchedStatus(null);
            setRevealed({});
            fetchStatus();
        }
    }, [isOpen]);

    const fetchStatus = async () => {
        try {
            const res = await api.get<any>('system_connections');
            if (res.success && res.data) {
                setFetchedStatus(res.data);
                
                // Hiệu ứng "đang kiểm tra" tuần tự từng card
                const keys = ['smtp', 'zalo', 'mess', 'api', 'tracking', 'ai'];
                keys.forEach((key, index) => {
                    setTimeout(() => {
                        setRevealed(prev => ({ ...prev, [key]: true }));
                    }, 500 + (index * 250)); // Mất khoảng 2 giây để quét xong tất cả
                });
            }
        } catch (error) {
            console.error('Failed to fetch connections status', error);
        }
    };

    if (!isOpen) return null;

    const connections = [
        {
            id: 'smtp',
            name: 'Máy chủ Gửi Email',
            desc: 'Cấu hình SMTP (Amazon SES, SendGrid...) để gửi chiến dịch tự động.',
            icon: Mail,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            status: fetchedStatus ? fetchedStatus.smtp : false,
            path: '/settings'
        },
        {
            id: 'zalo',
            name: 'Zalo OA (ZNS)',
            desc: 'Kết nối Official Account gửi tin nhắn Zalo chăm sóc khách hàng.',
            icon: MessageSquare,
            imageUrl: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-Zalo-Arc.png',
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            status: fetchedStatus ? fetchedStatus.zalo : false,
            path: '/settings'
        },
        {
            id: 'mess',
            name: 'Messenger',
            desc: 'Gửi tin nhắn chăm sóc tự động và thu thập Khách hàng từ Fanpage.',
            icon: Smartphone,
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwESTE4gC5EjHVEh0GMHxFEkbc9xadlRePkA&s',
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            status: fetchedStatus ? fetchedStatus.meta : false,
            path: '/settings'
        },
        {
            id: 'api',
            name: 'Forms & API Webhooks',
            desc: 'Thu thập Khách hàng trực tiếp từ Form hoặc qua ứng dụng thứ ba (CRM, POS...).',
            icon: Code,
            color: 'text-violet-500',
            bg: 'bg-violet-50',
            border: 'border-violet-200',
            status: fetchedStatus ? fetchedStatus.api : false,
            path: '/api-triggers'
        },
        {
            id: 'tracking',
            name: 'Website Tracking Pixel',
            desc: 'Gắn mã theo dõi hành vi Khách truy cập web, giỏ hàng, mua hàng.',
            icon: Globe,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            status: fetchedStatus ? fetchedStatus.tracking : false,
            path: '/forms' // Assuming tracking instructions might be near forms or landing pages
        },
        {
            id: 'ai',
            name: 'AI Chatbot Assistant',
            desc: 'Triển khai tư vấn viên tự động sử dụng trí tuệ nhân tạo riêng biệt.',
            icon: Bot,
            color: 'text-rose-500',
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            status: fetchedStatus ? fetchedStatus.ai : false,
            path: '/ai-training'
        }
    ];

    const handleNavigate = (path: string) => {
        onClose();
        navigate(path);
        window.scrollTo(0, 0);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-2xl" onClick={onClose} />

            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-[14px] bg-white shadow-sm border border-slate-200 flex items-center justify-center text-emerald-600">
                            <Link className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">KẾT NỐI SẴN SÀNG</h2>
                            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                Điểm kiểm tra tích hợp các kênh truyền thông & API
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 bg-white hover:bg-slate-200 rounded-full transition-colors text-slate-400 shadow-sm border border-slate-100 z-10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {connections.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col group">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${item.bg} ${item.color} ${item.border}`}>
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-7 h-7 object-contain mix-blend-multiply rounded" />
                                            ) : (
                                                <item.icon className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 text-[15px] truncate">{item.name}</h3>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        {!revealed[item.id] ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 text-slate-500 rounded-lg text-xs font-bold border border-slate-200/50">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                                <span>Đang quét...</span>
                                            </div>
                                        ) : item.status ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-xs font-bold animate-in zoom-in-95 duration-300">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Sẵn sàng</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold animate-in zoom-in-95 duration-300">
                                                <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                <span>Chưa liên kết</span>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => handleNavigate(item.path)}
                                            disabled={!revealed[item.id]}
                                            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors ${!revealed[item.id] ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : item.status ? 'text-slate-600 hover:bg-slate-100' : 'bg-[#ffa900] hover:bg-[#e69800] text-white shadow-md shadow-orange-500/20'}`}
                                        >
                                            {item.status ? 'Cấu hình' : 'Thiết lập ngay'} <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
