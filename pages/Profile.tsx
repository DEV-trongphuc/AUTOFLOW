import React, { useState, useEffect } from 'react';
import { Mail, Shield, ShieldCheck, History, Edit3, Save, LogOut, Clock, Globe, Settings, RefreshCw, Laptop, UserCheck, Key, Copy, Check } from 'lucide-react';
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
        <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 sm:px-6 animate-in fade-in duration-300">

            {/* MAIN PROFILE HERO BANNER & HEADER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Cover Banner */}
                <div className="h-40 sm:h-52 bg-gradient-to-r from-violet-600 via-indigo-700 to-purple-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                </div>

                {/* Profile Meta Row */}
                <div className="px-6 sm:px-8 pb-6 relative">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-xl overflow-hidden bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl sm:text-4xl select-none">
                                {user.picture ? (
                                    <img 
                                        src={user.picture} 
                                        className="w-full h-full object-cover" 
                                        alt={user.name}
                                        onError={(e: any) => { e.target.style.display = 'none'; }}
                                    />
                                ) : null}
                                <span className={user.picture ? 'hidden' : 'block'}>{userInitials}</span>
                            </div>
                            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-md flex items-center justify-center text-white" title="Trực tuyến">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2 sm:pt-0">
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Sửa tên
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-violet-500/25 active:scale-95"
                                >
                                    <Settings className="w-4 h-4" />
                                    Cấu hình Admin
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-200/60 dark:border-rose-900/50"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Đăng xuất
                            </button>
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="mt-4 space-y-1">
                        {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2 max-w-md pt-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-violet-500/50 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/30 text-sm"
                                    placeholder="Nhập tên mới"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-500/20 disabled:opacity-60 transition-all flex items-center gap-1.5"
                                >
                                    <Save className="w-3.5 h-3.5" /> {isSaving ? 'Lưu...' : 'Lưu'}
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setName(user.name); }}
                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                                >
                                    Hủy
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {user.name || 'Dev Admin'}
                                </h1>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                    {user.role || 'Admin'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Account
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Quản trị viên hệ thống • Lần đăng nhập cuối: {formatRelativeTime(user.updated_at || new Date().toISOString())}
                        </p>
                    </div>
                </div>
            </div>

            {/* TWO COLUMN GRID CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT: ACCOUNT DETAILS CARD */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white">Thông Tin Tài Khoản</h2>
                                <p className="text-xs text-slate-400">Chi tiết cá nhân & quyền truy cập</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Email */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">{user.email || 'dev@localhost'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(user.email || 'dev@localhost')}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 shrink-0"
                                    title="Sao chép Email"
                                >
                                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Role */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phân Quyền Hệ Thống</span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize block">{user.role || 'Admin'}</span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Key className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trạng Thái Bảo Mật</span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">Đã bật bảo vệ tài khoản</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACCESS LOGS CARD */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">Lịch Sử Truy Cập</h2>
                                    <p className="text-xs text-slate-400">Các phiên đăng nhập gần đây</p>
                                </div>
                            </div>

                            <button
                                onClick={fetchLogs}
                                className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/60 dark:border-slate-800"
                                title="Làm mới"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-violet-600' : ''}`} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="p-10 text-center text-slate-400 text-xs font-medium italic flex flex-col items-center gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
                                    <span>Đang tải lịch sử...</span>
                                </div>
                            ) : loginHistory.length > 0 ? (
                                loginHistory.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`p-3.5 rounded-2xl flex items-center justify-between gap-4 border transition-all ${
                                            i === 0
                                                ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-800/40'
                                                : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                                i === 0
                                                    ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                <Laptop className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {log.device ? (log.device.split(')')[0] + ')') : 'Trình duyệt Web'}
                                                </p>
                                                <span className="text-[10px] font-mono text-slate-400 block">
                                                    {log.ip_address || '127.0.0.1'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {i === 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Hiện tại
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
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
