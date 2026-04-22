import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, ShieldAlert, Trash2, CheckCircle, XCircle, Search, Mail, Calendar, UserPlus, UserCheck, UserX, AlertTriangle, UserMinus } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import toast from 'react-hot-toast';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import Button from '../components/common/Button';
import AuditLogModal from '../components/settings/AuditLogModal';
import { useIsAdmin } from '../hooks/useAuthUser';
import { Lock } from 'lucide-react';
import { api } from '../services/storageAdapter';


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
    const [isLoading, setIsLoading] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant: 'danger' | 'warning' | 'info' | 'success';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'warning',
        onConfirm: () => { }
    });

    const [pendingModal, setPendingModal] = useState<{
        isOpen: boolean;
        user: ManagedUser | null;
    }>({
        isOpen: false,
        user: null
    });

    const fetchUsers = async () => {
        try {
            const result = await api.get<{ data: ManagedUser[] }>('admin_users?action=list');
            if (result.success) setUsers((result as any).data);
        } catch (e) {
            console.error('[AdminUsers] fetchUsers failed:', e);
            toast.error('Lỗi tải danh sách người dùng');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleRole = async (email: string, currentRole: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot change root admin role');

        const executeToggle = async () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            setIsLoading(true);
            try {
                const result = await api.post('admin_users?action=update_role', { id, role: currentRole === 'admin' ? 'user' : 'admin' });
                if (result.success) {
                    toast.success('Đã cập nhật vai trò người dùng');
                    fetchUsers();
                } else toast.error((result as any).message || 'Lỗi cập nhật vai trò');
            } catch (e) {
                console.error('[AdminUsers] toggleRole failed:', e);
                toast.error('Lỗi kết nối');
            } finally {
                setIsLoading(false);
            }
        };

        if (currentRole === 'user') {
            setConfirmModal({
                isOpen: true,
                title: 'Nâng cấp quyền Admin?',
                variant: 'warning',
                message: (
                    <div className="space-y-3">
                        <p>Bạn có chắc chắn muốn nâng cấp người dùng <span className="font-bold text-slate-800">{email}</span> lên quyền <span className="text-amber-600 font-bold italic">ADMIN</span>?</p>
                        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4 italic">
                            <li>Admin có quyền quản lý kịch bản, chiến dịch.</li>
                            <li>Admin có quyền xem và xuất báo cáo dữ liệu.</li>
                            <li>Admin có thể quản lý danh sách người dùng.</li>
                        </ul>
                    </div>
                ),
                onConfirm: executeToggle
            });
        } else {
            setConfirmModal({
                isOpen: true,
                title: 'Hạ cấp người dùng?',
                variant: 'danger',
                message: `Bạn có chắc chắn muốn hạ cấp người dùng "${email}" xuống quyền USER thông thường?`,
                onConfirm: executeToggle
            });
        }
    };

    const handleToggleStatus = async (email: string, currentStatus: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot disable root admin');

        setIsLoading(true);
        try {
            const result = await api.post('admin_users?action=update_status', { id, status: currentStatus === 'approved' ? 'pending' : 'approved' });
            if (result.success) {
                toast.success('Đã cập nhật trạng thái người dùng');
                fetchUsers();
            } else toast.error((result as any).message || 'Lỗi cập nhật trạng thái');
        } catch (e) {
            console.error('[AdminUsers] toggleStatus failed:', e);
            toast.error('Lỗi kết nối');
        } finally { setIsLoading(false); }
    };

    const handleApproveUser = async (user: ManagedUser) => {
        setPendingModal({ isOpen: false, user: null });
        handleToggleStatus(user.email, 'pending', user.id);
    };

    const handleDelete = async (email: string, id: any) => {
        if (email === 'dom.marketing.vn@gmail.com') return toast.error('Cannot delete root admin');

        setConfirmModal({
            isOpen: true,
            title: 'Xóa người dùng?',
            variant: 'danger',
            message: `Bạn có chắc chắn muốn xóa người dùng "${email}"? Hành động này không thể hoàn tác.`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsLoading(true);
                try {
                    const result = await api.post(`admin_users?action=delete&id=${id}`, {});
                    if (result.success) {
                        toast.success('Đã xóa người dùng');
                        fetchUsers();
                    } else toast.error((result as any).message || 'Lỗi xóa người dùng');
                } catch (e) {
                    console.error('[AdminUsers] delete failed:', e);
                    toast.error('Lỗi kết nối');
                } finally { setIsLoading(false); }
            }
        });
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const navigate = useNavigate();
    const isAdmin = useIsAdmin();

    // ─── Permission Gate ────────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-8">
                <div className="text-center max-sm">
                    <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Không đủ quyền truy cập</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Trang <b>Quản lý người dùng</b> chỉ dành cho tài khoản <b className="text-amber-600">Admin</b>.<br />
                        Vui lòng liên hệ quản trị viên để được cấp quyền.
                    </p>
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">

            <PageHero
                title={<>User <span className="text-amber-100/80">Management</span></>}
                subtitle="Quản lý quyền truy cập, nâng cấp/hạ cấp và phê duyệt người dùng mới."
                showStatus={true}
                statusText="System Security Active"
                actions={[
                    { label: 'Admin Logs', title: 'System Audit Logs', icon: ShieldAlert, onClick: () => setIsAuditModalOpen(true), primary: true },
                    { label: 'Cài đặt Phân quyền', icon: Shield, onClick: () => navigate('/admin/workspace'), primary: false }
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
                                <th className="px-8 py-4">Last Activity </th>
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
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${user.role === 'admin'
                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}
                                        >
                                            {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => {
                                                if (user.status === 'pending') {
                                                    setPendingModal({ isOpen: true, user });
                                                } else {
                                                    handleToggleStatus(user.email, user.status, user.id);
                                                }
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                (user.status?.toLowerCase() === 'approved' || user.status?.toLowerCase() === 'active')
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
                                                }`}
                                        >
                                            {user.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {user.status}
                                        </button>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-bold">{(user.last_login || user.lastLogin) ? new Date(user.last_login || user.lastLogin!).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => handleToggleRole(user.email, user.role, user.id)}
                                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                                title="Thay đổi quyền"
                                            >
                                                <Shield className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.email, user.id)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Xóa người dùng"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={isLoading}
            />

            <Modal
                isOpen={pendingModal.isOpen}
                onClose={() => setPendingModal({ isOpen: false, user: null })}
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-black text-slate-800 tracking-tight">Phê duyệt người dùng</span>
                    </div>
                }
                size="md"
            >
                {pendingModal.user && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                                <img src={pendingModal.user.picture || "/imgs/ICON.png"} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 leading-tight">{pendingModal.user.name}</h4>
                                <p className="text-sm font-medium text-slate-500">{pendingModal.user.email}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 font-medium leading-relaxed">Người dùng này đang chờ được phê duyệt để truy cập vào hệ thống. Bạn có thể chọn phê duyệt ngay hoặc từ chối để xóa người dùng này.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                fullWidth
                                icon={UserCheck}
                                onClick={() => handleApproveUser(pendingModal.user!)}
                                isLoading={isLoading}
                                className="!py-4 shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                            >
                                Phê duyệt truy cập
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="danger"
                                    icon={UserX}
                                    onClick={() => {
                                        setPendingModal({ isOpen: false, user: null });
                                        handleDelete(pendingModal.user!.email, pendingModal.user!.id);
                                    }}
                                    className="!py-3"
                                >
                                    Từ chối & Xóa
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPendingModal({ isOpen: false, user: null })}
                                    className="!py-3"
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <AuditLogModal
                isOpen={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
            />
        </div>
    );
};

export default AdminUsers;
