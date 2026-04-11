import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldAlert, Trash2, CheckCircle, XCircle, Search, Mail, Calendar, UserPlus } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import toast from 'react-hot-toast';

interface ManagedUser {
    id: any;
    email: string;
    name: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved';
    last_login?: string; lastLogin?: string;
    picture?: string;
}

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/mail_api/admin_users.php?action=list');
            const result = await res.json();
            if (result.success) setUsers(result.data);
        } catch (e) {
            toast.error('Lỗi tải danh sách người dùng');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleRole = async (email: string, currentRole: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot change root admin role');
        try {
            const res = await fetch('/mail_api/admin_users.php?action=update_role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, role: currentRole === 'admin' ? 'user' : 'admin' })
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Updated user role');
                fetchUsers();
            } else toast.error(result.message);
        } catch (e) { toast.error('Lỗi kết nối'); }
    };

    const handleToggleStatus = async (email: string, currentStatus: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot disable root admin');
        try {
            const res = await fetch('/mail_api/admin_users.php?action=update_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: currentStatus === 'approved' ? 'pending' : 'approved' })
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Updated user status');
                fetchUsers();
            } else toast.error(result.message);
        } catch (e) { toast.error('Lỗi kết nối'); }
    };

    const handleDelete = async (email: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot delete root admin');
        if (!window.confirm('Xác nhận xóa người dùng này?')) return;
        try {
            const res = await fetch(`/mail_api/admin_users.php?action=delete&id=${id}`, { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                toast.success('Deleted user');
                fetchUsers();
            } else toast.error(result.message);
        } catch (e) { toast.error('Lỗi kết nối'); }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <PageHero 
                title={<>User <span className="text-amber-100/80">Management</span></>}
                subtitle="Quản lý quyền truy cập, nâng cấp/hạ cấp và phê duyệt người dùng mới."
                showStatus={true}
                statusText="System Security Active"
                actions={[
                    { label: 'Mời thành viên', icon: UserPlus, onClick: () => toast('Tính năng mời qua email đang phát triển'), primary: true }
                ]}
            />

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên hoặc email..." 
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                <th className="px-8 py-4">User</th>
                                <th className="px-8 py-4">Role</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4">Last Login</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map((user) => (
                                <tr key={user.email} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 bg-slate-50">
                                                <img src={user.picture || "/imgs/ICON.png"} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail className="w-3 h-3 text-slate-400" />
                                                    <p className="text-[11px] font-medium text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button 
                                            onClick={() => handleToggleRole(user.email, user.role, user.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                user.role === 'admin' 
                                                ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                : 'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}
                                        >
                                            {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                            {user.role}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button 
                                            onClick={() => handleToggleStatus(user.email, user.status, user.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                user.status === 'approved' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}
                                        >
                                            {user.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {user.status}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-bold">{(user.last_login || user.lastLogin) ? new Date(user.last_login || user.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button 
                                            onClick={() => handleDelete(user.email, user.id)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;

