import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, ShieldCheck, History, Edit3, Save, LogOut, Clock, Globe, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHero from '../components/common/PageHero';
import toast from 'react-hot-toast';
import { api } from '../services/storageAdapter';

const Profile: React.FC = () => {
    const [user, setUser] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } });
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const isAdmin = user && user.role === 'admin';

    useEffect(() => {
        fetchProfile();
        fetchLogs();
    }, []);

    const fetchProfile = async () => {
        const res = await api.get<any>('auth?action=check');
        if (res.success) {
            setUser(res.data);
            setName(res.data.name);
            localStorage.setItem('user', JSON.stringify(res.data));
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        const res = await api.get<any[]>('auth?action=logs');
        if (res.success) {
            setLoginHistory(res.data);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        try {
            // Update via Admin API (which handles name updates)
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
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.reload();
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
            <PageHero 
                title={<>My <span className="text-amber-100/80">Account</span></>}
                subtitle="Quản lý thông tin cá nhân, bảo mật và theo dõi lịch sử truy cập hệ thống."
                actions={[
                    ...(isAdmin ? [{ label: 'Cấu hình Admin', icon: Settings, onClick: () => navigate('/settings'), primary: true }] : []),
                    { label: 'Thoát hệ thống', icon: LogOut, onClick: handleLogout }
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Information Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 text-center space-y-6">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-amber-500/20 p-1">
                                <img 
                                    src={user.picture || `https://ui-avatars.com/api/?name=${user.name}&background=fcd34d&color=92400e`} 
                                    className="w-full h-full object-cover rounded-[24px]" 
                                    alt={user.name} 
                                    onError={(e: any) => { e.target.src = "/imgs/ICON.png"; }}
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        </div>

                        <div>
                            {isEditing ? (
                                <div className="flex flex-col gap-3">
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2 bg-slate-50 border-2 border-amber-500/20 rounded-xl text-center font-bold outline-none focus:border-amber-500"
                                    />
                                    <button onClick={handleSave} className="flex items-center justify-center gap-2 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                                        <Save className="w-3.5 h-3.5" /> Save Changes
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.name}</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{user.role}</p>
                                    <button onClick={() => setIsEditing(true)} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600">
                                        <Edit3 className="w-3 h-3" /> Chỉnh sửa tên
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-50 space-y-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500"><Mail className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Email</p>
                                    <p className="text-xs font-bold text-slate-700">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500"><Shield className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Security Role</p>
                                    <p className="text-xs font-bold text-slate-700 capitalize">{user.role}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Lịch sử truy cập</h3>
                                <p className="text-xs font-medium text-slate-400">Danh sách các phiên đăng nhập gần đây của bạn</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                             {isLoading ? (
                                 <div className="p-8 text-center text-slate-400 text-sm font-medium italic">Đang tải lịch sử...</div>
                             ) : loginHistory.length > 0 ? loginHistory.map((log, i) => (
                                 <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                                     <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center">
                                             <Globe className="w-5 h-5 text-slate-400" />
                                         </div>
                                         <div className="min-w-0">
                                             <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{log.device ? (log.device.split(')')[0] + ')') : 'Unknown Device'}</p>
                                             <p className="text-[10px] font-medium text-slate-400">{log.ip_address}</p>
                                         </div>
                                     </div>
                                     <div className="text-right shrink-0">
                                         <div className="flex items-center gap-1.5 justify-end text-emerald-600">
                                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                             <span className="text-[10px] font-black uppercase tracking-widest">{i === 0 ? 'Hiện tại' : 'Thành công'}</span>
                                         </div>
                                         <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                                             <Clock className="w-3 h-3" />
                                             <span className="text-[10px] font-bold">{formatRelativeTime(log.created_at)}</span>
                                         </div>
                                     </div>
                                 </div>
                             )) : (
                                <div className="p-8 text-center text-slate-400 text-sm font-medium italic">Chưa có dữ liệu truy cập.</div>
                             )}
                        </div>

                        <button className="w-full mt-6 py-4 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-amber-200 hover:text-amber-500 transition-all">
                             Xem tất cả lịch sử
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
