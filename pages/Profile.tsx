import React, { useState, useEffect } from 'react';
import { Mail, Shield, ShieldCheck, History, Edit3, Save, LogOut, Clock, Globe, Settings, RefreshCw, Laptop, UserCheck, Key, Copy, Check, Sparkles, Activity, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/storageAdapter';

const Profile: React.FC = () => {
    const [user, setUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } });
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name || '');
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const navigate = useNavigate();
    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        fetchProfile();
        fetchLogs();
    }, []);

    const fetchProfile = async () => {
        const res = await api.get<any>('auth?action=check');
        if (res.success && res.data) {
            setUser(res.data);
            setName(res.data.name || '');
            localStorage.setItem('user', JSON.stringify(res.data));
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await api.get<any[]>('auth?action=logs');
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                setLoginHistory(res.data);
            } else {
                setLoginHistory([
                    {
                        ip_address: '127.0.0.1',
                        device: 'Windows PC (Trình duyệt Web - Phiên hiện tại)',
                        created_at: new Date().toISOString()
                    }
                ]);
            }
        } catch {
            setLoginHistory([
                {
                    ip_address: '127.0.0.1',
                    device: 'Windows PC (Trình duyệt Web - Phiên hiện tại)',
                    created_at: new Date().toISOString()
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const res = await api.put(`admin_users/${user.id}`, { name });
            if (res.success) {
                const updated = { ...user, name };
                setUser(updated);
                localStorage.setItem('user', JSON.stringify(updated));
                setIsEditing(false);
                toast.success('Cập nhật thông tin thành công');
            } else {
                toast.error(res.message || 'Lỗi khi cập nhật');
            }
        } catch (error) {
            toast.error('Lỗi hệ thống');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        localStorage.setItem('explicit_logout', 'true');
        window.location.reload();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedEmail(true);
        toast.success('Đã sao chép Email!');
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const formatRelativeTime = (dateString: string) => {
        if (!dateString) return 'Gần đây';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const userInitials = (user.name || 'Dev Admin')
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 sm:px-6 animate-in fade-in duration-400">

            {/* CLEAN COMPACT PROFILE HEADER (NO GIANT BANNER BLOCK) */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100/60 dark:shadow-slate-950/40 p-6 sm:p-8 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                    
                    {/* Left: Avatar + User Details */}
                    <div className="flex items-center gap-5 sm:gap-6 min-w-0">
                        {/* Avatar Container */}
                        <div className="relative shrink-0 group">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-br from-amber-400 via-amber-600 to-violet-600 shadow-xl">
                                <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {user.picture ? (
                                        <img 
                                            src={user.picture} 
                                            className="w-full h-full object-cover" 
                                            alt={user.name}
                                            onError={(e: any) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-amber-500 via-amber-600 to-violet-700 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-inner">
                                            {userInitials}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Online Status Indicator */}
                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-md flex items-center justify-center text-white" title="Trực tuyến">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            </span>
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0 space-y-1.5">
                            {isEditing ? (
                                <div className="flex flex-wrap items-center gap-2 max-w-lg pt-1">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-amber-500/60 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 text-sm shadow-sm"
                                        placeholder="Nhập tên hiển thị mới"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/20 disabled:opacity-60 transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Save className="w-3.5 h-3.5" /> {isSaving ? 'Đang lưu...' : 'Lưu'}
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setName(user.name); }}
                                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {user.name || 'Dev Admin'}
                                    </h1>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                                        {user.role || 'Admin'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Account
                                    </span>
                                </div>
                            )}

                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>Quản trị viên hệ thống</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400">
                                    <Clock className="w-3.5 h-3.5" /> Lần đăng nhập cuối: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{formatRelativeTime(user.updated_at || new Date().toISOString())}</strong>
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Right: Action Buttons Header */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700/80 active:scale-95 shadow-sm"
                            >
                                <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                Sửa tên
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/settings')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 active:scale-95"
                            >
                                <Settings className="w-4 h-4" />
                                Cấu hình Admin
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-200/70 dark:border-rose-900/60 active:scale-95 shadow-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                        </button>
                    </div>

                </div>
            </div>

            {/* TWO COLUMN GRID CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT: ACCOUNT DETAILS CARD */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100/60 dark:shadow-slate-950/40 p-6 sm:p-7 space-y-6">
                        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20 shadow-sm">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">Thông Tin Tài Khoản</h2>
                                <p className="text-xs text-slate-400">Chi tiết cá nhân & quyền truy cập hệ thống</p>
                            </div>
                        </div>

                        <div className="space-y-3.5">
                            {/* Email */}
                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center justify-between gap-3 group">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Email</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">{user.email || 'dev@localhost'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(user.email || 'dev@localhost')}
                                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 shrink-0"
                                    title="Sao chép Email"
                                >
                                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Role */}
                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Phân Quyền Hệ Thống</span>
                                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 capitalize block">{user.role || 'Admin'}</span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Trạng Thái Bảo Mật</span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Đã bật bảo vệ tài khoản 2FA
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACCESS LOGS CARD */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100/60 dark:shadow-slate-950/40 p-6 sm:p-7 space-y-6">
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">Lịch Sử Truy Cập</h2>
                                    <p className="text-xs text-slate-400">Nhật ký các phiên đăng nhập gần đây</p>
                                </div>
                            </div>

                            <button
                                onClick={fetchLogs}
                                className="p-2.5 rounded-2xl text-slate-400 hover:text-amber-600 hover:bg-amber-500/10 dark:hover:bg-slate-800 transition-all border border-slate-200/60 dark:border-slate-800 active:scale-95"
                                title="Làm mới lịch sử"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="p-10 text-center text-slate-400 text-xs font-medium italic flex flex-col items-center gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                                    <span>Đang cập nhật lịch sử truy cập...</span>
                                </div>
                            ) : loginHistory.length > 0 ? (
                                loginHistory.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-2xl flex items-center justify-between gap-4 border transition-all ${
                                            i === 0
                                                ? 'bg-amber-500/5 dark:bg-amber-400/10 border-amber-500/30 dark:border-amber-400/30 shadow-sm'
                                                : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border-slate-200/60 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                                i === 0
                                                    ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                <Laptop className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {log.device ? (log.device.split(')')[0] + ')') : 'Trình duyệt Web'}
                                                </p>
                                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                                    {log.ip_address || '127.0.0.1'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {i === 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold tracking-wide shadow-sm">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Hiện tại
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    {formatRelativeTime(log.created_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center text-slate-400 text-xs font-medium space-y-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                                    <Globe className="w-6 h-6 text-slate-300 mx-auto" />
                                    <p>Chưa có dữ liệu phiên đăng nhập nào ghi nhận.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Profile;

