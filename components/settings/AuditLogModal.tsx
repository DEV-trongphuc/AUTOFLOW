import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/storageAdapter';

interface AuditLog {
    id: number;
    user_name: string;
    module: string;
    action: string;
    target_name: string;
    details: any;
    created_at: string;
}

interface AuditLogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLogs([]);
            setPage(1);
            setHasMore(true);
            fetchLogs(1);
        }
    }, [isOpen]);

    const fetchLogs = async (p: number) => {
        setLoading(true);
        try {
            const res = await api.get<any>(`system_audit_logs?page=${p}&limit=20`);
            if (res.success) {
                if (p === 1) {
                    setLogs(res.data.logs || []);
                } else {
                    setLogs(prev => [...prev, ...(res.data.logs || [])]);
                }
                setHasMore(res.data.hasMore);
                setPage(p);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-fade-in mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner">
                            <ShieldCheck className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">System Audit Logs</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lịch sử hoạt động</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
                    {loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                            <p className="text-sm font-bold text-slate-400">Đang tải lịch sử...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-sm font-bold text-slate-500">Chưa có bản ghi hoạt động nào</p>
                        </div>
                    ) : (
                        <div className="space-y-4 relative">
                            {/* Vertical Timeline Line */}
                            <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-200/60 rounded-full"></div>
                            
                            {logs.map((log, index) => {
                                const actionColor = 
                                    log.action === 'delete' ? 'text-rose-600 bg-rose-50 border-rose-100' :
                                    log.action === 'create' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                    log.action === 'update' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                    'text-amber-600 bg-amber-50 border-amber-100';

                                return (
                                    <div key={log.id} className="relative pl-14 transition-all">
                                        {/* Dot */}
                                        <div className={`absolute left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-slate-50 ${actionColor.split(' ')[1]}`}></div>
                                        
                                        <div className="flex items-start justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${actionColor}`}>{log.action}</span>
                                                    <span className="text-xs font-bold text-slate-700 capitalize">{log.module}</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-600 mb-2">
                                                    <span className="font-bold text-slate-800">{log.user_name}</span> đã tác động tới <span className="font-bold text-slate-800 truncate block sm:inline max-w-xs">{log.target_name}</span>
                                                </p>
                                                {log.details && Object.keys(log.details).length > 0 && (
                                                    <div className="mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 overflow-x-auto">
                                                        <pre className="text-[10px] font-mono text-slate-500 m-0">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-1 group-hover:text-amber-600 transition-colors">
                                                {new Date(log.created_at).toLocaleString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {hasMore && (
                                <div className="pl-14 pt-4">
                                    <button 
                                        onClick={() => fetchLogs(page + 1)} 
                                        disabled={loading}
                                        className="w-full py-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:text-amber-600 hover:border-amber-200 shadow-sm transition-all"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Tải thêm...'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogModal;
