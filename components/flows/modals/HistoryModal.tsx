import React from 'react';
import { Clock, RotateCcw, X, History, User, Loader2 } from 'lucide-react';

// Matches the DB-backed snapshot type in Flows.tsx
interface FlowSnapshot {
    id: string;
    flow_id: string;
    label: string;
    created_by?: string;
    created_at: string;
    flow_data?: any;
}

interface FlowHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: FlowSnapshot[];
    onRestore: (snapshot: FlowSnapshot) => void;
    isLoading?: boolean;
}

const FlowHistoryModal: React.FC<FlowHistoryModalProps> = ({ isOpen, onClose, snapshots, onRestore, isLoading }) => {
    if (!isOpen) return null;
    const safeSnapshots = Array.isArray(snapshots) ? snapshots : [];

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const getRelativeTime = (iso: string) => {
        const now = Date.now();
        const diff = Math.floor((now - new Date(iso).getTime()) / 1000);
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return `${Math.floor(diff / 86400)} ngày trước`;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-w-[95vw] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-[#ffa900]">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800">Lịch sử phiên bản</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Lưu trên server · Tất cả thành viên có thể xem</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin text-[#ffa900]" />
                        </div>
                    ) : safeSnapshots.length === 0 ? (
                        <div className="text-center py-12 opacity-40">
                            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-xs text-slate-500 font-bold">Chưa có phiên bản nào được lưu</p>
                            <p className="text-[10px] text-slate-400 mt-1">Phiên bản sẽ tự động lưu khi bạn chỉnh sửa flow</p>
                        </div>
                    ) : (
                        safeSnapshots.map((snap, index) => (
                            <div key={snap.id} className="group relative bg-white border border-slate-100 rounded-xl p-3.5 hover:border-amber-200 hover:shadow-sm transition-all">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                        {/* Timeline dot */}
                                        <div className="flex flex-col items-center flex-shrink-0 mt-1">
                                            <div className={`w-2 h-2 rounded-full ring-4 ${index === 0 ? 'bg-[#ffa900] ring-amber-50' : 'bg-slate-300 ring-slate-50'}`} />
                                            {index < snapshots.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs font-black text-slate-700 truncate">{snap.label || 'Chỉnh sửa'}</p>
                                                {index === 0 && (
                                                    <span className="text-[9px] font-black text-white bg-[#ffa900] px-1.5 py-0.5 rounded-md shrink-0">
                                                        Mới nhất
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                    <Clock size={9} /> {formatTime(snap.created_at)}
                                                </span>
                                                <span className="text-[10px] text-[#ca7900] font-medium">
                                                    {getRelativeTime(snap.created_at)}
                                                </span>
                                                {snap.created_by && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                        <User size={9} /> {snap.created_by}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onRestore(snap)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-[#ca7900] border border-amber-200 hover:bg-amber-50 rounded-lg shrink-0"
                                    >
                                        <RotateCcw size={11} />
                                        Khôi phục
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-slate-50 bg-slate-50/50 rounded-b-2xl text-center shrink-0">
                    <p className="text-[10px] text-slate-400">
                        Lưu trữ tối đa 20 phiên bản · Dữ liệu trên server, mọi thành viên đều thấy
                    </p>
                </div>
            </div>
        </div>
    );
};

export { FlowHistoryModal };
