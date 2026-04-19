import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Users, Shield, Plus, Trash2, ShieldAlert, KeyRound, ChevronDown, Check, AlertTriangle, X } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { useAuth } from '../components/contexts/AuthContext';
import { api } from '../services/storageAdapter';

interface Role {
    id: number;
    name: string;
    description: string;
    domain: string;
    permissions: string[];
}

interface WorkspaceUser {
    mapping_id: number;
    user_id: number;
    email: string;
    full_name: string;
    picture: string;
    role_id: number;
    role_name: string;
}

// Add ShieldCheck icon for role badge
import { ShieldCheck, User } from 'lucide-react';

// Helper for shiny avatars
const getGradient = (name: string) => {
    const defaultName = name || 'U';
    const hash = Array.from(defaultName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
        ['from-rose-400', 'to-orange-400'],
        ['from-blue-400', 'to-indigo-500'],
        ['from-emerald-400', 'to-teal-500'],
        ['from-violet-400', 'to-purple-500'],
        ['from-amber-400', 'to-orange-500'],
        ['from-pink-400', 'to-rose-500'],
    ];
    const [from, to] = colors[hash % colors.length];
    return `bg-gradient-to-br ${from} ${to} text-white shadow-inner`;
};

// Custom Dropdown Component
const CustomDropdown = ({ value, options, onChange, disabled, fullWidth = false }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selected = options.find((o: any) => o.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Dynamic styling based on role name
    const roleName = selected?.name?.toLowerCase() || '';
    const isAdmin = roleName.includes('admin');

    // Aesthetic badge classes
    const colors = isAdmin
        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'
        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300';

    const activeRing = isAdmin ? 'ring-4 ring-amber-500/20' : 'ring-4 ring-slate-500/10';

    if (disabled) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-[10px] uppercase tracking-wider font-bold opacity-60 cursor-not-allowed ${isAdmin ? 'border-amber-200 bg-amber-50/50 text-amber-700' : 'border-slate-200 bg-slate-50/50 text-slate-500'}`}>
                {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                {selected?.name}
            </div>
        );
    }

    return (
        <div className={`relative ${fullWidth ? 'block w-full' : 'inline-block text-left'} ${isOpen ? 'z-[99]' : ''}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between ${fullWidth ? 'w-full' : 'min-w-[140px]'} gap-3 px-4 py-2 border ${colors} ${isOpen ? activeRing : ''} rounded-full text-[10px] uppercase tracking-wider font-extrabold transition-all shadow-sm group hover:scale-[1.02] active:scale-[0.98]`}
            >
                <div className="flex items-center gap-2">
                    {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    {selected?.name || '-- Chọn Role --'}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-[100] ${fullWidth ? 'w-full' : 'min-w-[180px]'} top-[calc(100%+8px)] bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] py-2 left-0 transform origin-top-left animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5`}>
                    {options.map((opt: any) => {
                        const optIsAdmin = opt.name.toLowerCase().includes('admin');
                        return (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-all duration-200 hover:pl-5
                                ${opt.id === value && optIsAdmin ? 'bg-amber-50/80 text-amber-700' : ''}
                                ${opt.id === value && !optIsAdmin ? 'bg-slate-50/80 text-slate-800' : ''}
                                ${opt.id !== value ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : ''}
                            `}
                            >
                                <span className="flex items-center gap-2">
                                    {optIsAdmin ? <ShieldCheck className={`w-3.5 h-3.5 ${opt.id === value ? 'text-amber-500' : 'opacity-40'}`} /> : <User className={`w-3.5 h-3.5 ${opt.id === value ? 'text-slate-400' : 'opacity-40'}`} />}
                                    {opt.name}
                                </span>
                                {opt.id === value && <Check className={`w-4 h-4 ${optIsAdmin ? 'text-amber-500 drop-shadow-sm' : 'text-slate-500 drop-shadow-sm'}`} />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const WorkspaceSettings: React.FC = () => {
    const { currentWorkspace, can, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

    const [members, setMembers] = useState<WorkspaceUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add User Form
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm Modal System
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        actionLabel: '',
        variant: 'danger' as 'danger' | 'warning' | 'info',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (!currentWorkspace) return;
        fetchData();
    }, [currentWorkspace?.id]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const usersRes = await api.get(`workspaces?action=users&workspace_id=${currentWorkspace?.id}`);
            if (usersRes.success) setMembers(usersRes.data as WorkspaceUser[]);

            const rolesRes = await api.get('roles?action=list');
            if (rolesRes.success) {
                const rolesData = rolesRes.data as any;
                setRoles(rolesData.roles);
                if (rolesData.roles.length > 0) setNewUserRole(rolesData.roles[0].id);
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newUserEmail || !newUserRole) return;
        setIsSubmitting(true);
        try {
            const res = await api.post(`workspaces?action=add_user&workspace_id=${currentWorkspace?.id}`, {
                email: newUserEmail,
                role_id: newUserRole
            });
            if (res.success) {
                toast.success('Đã mời thành viên thành công!');
                setIsAddModalOpen(false);
                setNewUserEmail('');
                fetchData();
            } else {
                toast.error(res.message || 'Không thể thêm nhân sự.');
            }
        } catch (error) {
            toast.error('Đã xảy ra lỗi hệ thống.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmRemoveUser = (mapping_id: number, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xoá nhân sự Workspace',
            message: `Bạn có chắc chắn muốn xóa ${userName || 'người dùng này'} khỏi Workspace hiện tại? Họ sẽ mất toàn bộ quyền truy cập và dữ liệu báo cáo cá nhân.`,
            actionLabel: 'XÁC NHẬN XOÁ',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await api.post(`workspaces?action=remove_user&workspace_id=${currentWorkspace?.id}`, { mapping_id });
                    if (res.success) {
                        toast.success('Đã xóa thành viên khỏi workspace.');
                        setMembers(prev => prev.filter(m => m.mapping_id !== mapping_id));
                    } else {
                        toast.error((res as any).message || 'Lỗi khi xóa thành viên.');
                    }
                } catch (err) { console.error('[WorkspaceSettings] remove_user failed:', err); toast.error('Lỗi kết nối máy chủ.'); }
            }
        });
    };

    const confirmUpdateRole = (mapping_id: number, new_role_id: number) => {
        const roleObj = roles.find(r => r.id === new_role_id);
        const userObj = members.find(m => m.mapping_id === mapping_id);

        setConfirmModal({
            isOpen: true,
            title: 'Thay đổi chức vụ',
            message: `Bạn đang cấp phát quyền hạn mới [${roleObj?.name}] cho [${userObj?.full_name || userObj?.email}]. Quá trình này sẽ thay đổi lập tức các tính năng mà người này được nhìn thấy.`,
            actionLabel: 'CẬP NHẬT CHỨC VỤ',
            variant: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await api.post(`workspaces?action=update_user&workspace_id=${currentWorkspace?.id}`, {
                        mapping_id, role_id: new_role_id
                    });
                    if (res.success && roleObj) {
                        toast.success(`Đã cập nhật chức vụ thành [${roleObj.name}].`);
                        setMembers(prev => prev.map(m => m.mapping_id === mapping_id ? { ...m, role_id: new_role_id, role_name: roleObj.name } : m));
                    } else {
                        toast.error((res as any).message || 'Lỗi khi cập nhật chức vụ.');
                    }
                } catch (error) { console.error('[WorkspaceSettings] update_user failed:', error); toast.error('Lỗi kết nối máy chủ.'); }
            }
        });
    };

    if (!can('manage_users') && !can('manage_workspaces') && user?.id !== 'admin-001' && user?.email !== 'dom.marketing.vn@gmail.com') {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100 italic mx-8 mt-12">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <ShieldAlert className="w-8 h-8 text-rose-300" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Truy cập bị hạn chế</p>
                <p className="text-[10px] mt-1 text-center">Tài khoản của bạn không có thẩm quyền 'manage_users'.<br />Vui lòng liên hệ Admin để được cấp quyền.</p>
            </div>
        );
    }

    const heroActions = can('manage_users') ? [{
        label: 'Mời thành viên',
        icon: Plus,
        onClick: () => setIsAddModalOpen(true),
    }] : [];

    return (
        <div className="animate-fade-in space-y-8 mx-auto pb-40">
            <PageHero
                title={<>Cài đặt <span className="text-amber-100/80">Phân quyền</span></>}
                subtitle={`Quản lý Nhân sự, Chức vụ và Truy cập trong môi trường hiện tại.`}
                showStatus={true}
                statusText={`Đang truy cập: ${currentWorkspace?.name}`}
                actions={heroActions}
            />

            <div className="bg-white rounded-3xl lg:rounded-[32px] border border-slate-200 shadow-sm p-4 lg:p-6 min-h-[600px] flex flex-col relative z-0">
                <Tabs
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as 'members' | 'roles')}
                    variant="pill"
                    className="mb-8"
                    items={[
                        { id: 'members', label: 'Nhân sự Workspace', icon: Users, count: members.length },
                        { id: 'roles', label: 'Danh mục Chức vụ (Roles)', icon: Shield },
                    ]}
                />

                <div className="animate-in fade-in duration-300 flex-1 relative">
                    {activeTab === 'members' && (
                        <div className="bg-white border text-sm rounded-[2rem] overflow-visible shadow-sm ring-1 ring-slate-100/50">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b rounded-t-[2rem]">
                                    <tr>
                                        <th className="px-6 py-5 rounded-tl-[2rem]">Tài khoản</th>
                                        <th className="px-6 py-5">Email Liên kết</th>
                                        <th className="px-6 py-5">Chức vụ (Role)</th>
                                        <th className="px-6 py-5 text-right rounded-tr-3xl">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="text-center py-20 text-slate-400">Đang tải cấu hình nhân sự...</td></tr>
                                    ) : members.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-20 text-slate-400">Workspace chưa có thành viên nào.</td></tr>
                                    ) : members.map((m, idx) => (
                                        <tr key={m.mapping_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden bg-cover bg-center ring-2 ring-white shadow-md ${!m.picture ? getGradient(m.full_name || m.email) : ''}`}
                                                    >
                                                        {m.picture ? (
                                                            <img src={m.picture} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (m.full_name || m.email).charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition-colors">{m.full_name || 'Chưa cập nhật tên'}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">ID: {m.user_id ? m.user_id.toString().substring(0, 8) : 'ROOT'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100/50 text-slate-600 text-xs font-medium border border-slate-200/60">
                                                    {m.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <CustomDropdown
                                                    value={m.role_id}
                                                    options={roles}
                                                    onChange={(newVal: number) => confirmUpdateRole(m.mapping_id, newVal)}
                                                    disabled={!can('manage_users') || user?.id === m.user_id.toString() || m.email === 'dom.marketing.vn@gmail.com'}
                                                />
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => confirmRemoveUser(m.mapping_id, m.full_name)}
                                                    disabled={!can('manage_users') || user?.id === m.user_id.toString() || m.email === 'dom.marketing.vn@gmail.com'}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed group/btn hover:scale-105 active:scale-95"
                                                    title="Xóa nhân sự khỏi Workspace"
                                                >
                                                    <Trash2 className="w-4 h-4 group-hover/btn:animate-pulse" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {isLoading ? (
                                <div className="col-span-full text-center py-20 text-slate-400">Đang tải cấu hình Roles...</div>
                            ) : roles.map(role => (
                                <div key={role.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full group-hover:scale-[2.5] transition-transform duration-700 opacity-50 z-0"></div>
                                    <div className="relative z-10 flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl text-amber-600 shadow-inner border border-amber-200/50">
                                                <KeyRound className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-lg">{role.name}</h3>
                                                <p className="text-[10px] uppercase font-bold text-amber-600/70 tracking-widest mt-0.5">{role.domain}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-6 line-clamp-2 h-8 relative z-10 leading-relaxed">{role.description}</p>

                                    <div className="border-t border-slate-100 pt-5 relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5" /> Quyền hạn ({role.permissions.length})
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto scrollbar-hide">
                                            {role.permissions.map(pSlug => (
                                                <span key={pSlug} className="px-2.5 py-1.5 bg-white text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 shadow-sm hover:border-amber-300 hover:text-amber-700 transition-colors cursor-default">
                                                    {pSlug.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                            {role.permissions.length === 0 && (
                                                <span className="text-xs italic text-slate-400 px-2">Chưa được cấp quyền nào</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Add User */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Mời thành viên mới" size="md">
                <div className="space-y-6 pb-4">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                            Nhân sự cần phải có tài khoản trên hệ thống từ trước. Hãy nhập chính xác Email và cấu hình chức vụ phân quyền cho họ trong Không gian làm việc hiện tại.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Tài Khoản</label>
                            <input
                                type="email"
                                placeholder="nguyenvana@gmail.com"
                                className="w-full border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400 bg-slate-50 focus:bg-white"
                                value={newUserEmail}
                                onChange={e => setNewUserEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Gán Chức vụ (Role)</label>
                            <CustomDropdown
                                value={newUserRole}
                                options={roles}
                                onChange={(val: number) => setNewUserRole(val)}
                                fullWidth={true}
                            />
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end gap-3">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-3 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-xs tracking-wider"
                        >
                            HỦY BỎ
                        </button>
                        <button
                            onClick={handleAddUser}
                            disabled={isSubmitting || !newUserEmail || !newUserRole}
                            className="px-8 py-3 rounded-2xl font-bold text-white bg-slate-900 hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2 text-xs tracking-wider hover:shadow-lg hover:shadow-black/20"
                        >
                            {isSubmitting ? 'ĐANG CHẠY...' : 'GỬI LỜI MỜI'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Actions Modal System */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                        <div className={`p-8 relative overflow-hidden ${confirmModal.variant === 'danger' ? 'bg-rose-50/80' : 'bg-amber-50/80'}`}>
                            {/* Decorative blur blob */}
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-50 rounded-full translate-x-10 -translate-y-10
                                ${confirmModal.variant === 'danger' ? 'bg-rose-400' : 'bg-amber-400'}`}></div>

                            <div className="relative z-10 flex items-start gap-5 mb-2">
                                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-sm
                                    ${confirmModal.variant === 'danger' ? 'bg-rose-100 text-rose-600 border border-rose-200/50' : 'bg-amber-100 text-amber-600 border border-amber-200/50'}`}>
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 pt-2 leading-tight">{confirmModal.title}</h3>
                            </div>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed mt-4 relative z-10">{confirmModal.message}</p>
                        </div>

                        <div className="p-6 bg-white flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-6 py-3 rounded-2xl text-xs font-bold tracking-wider text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                ĐÓNG LẠI
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-8 py-3 rounded-2xl text-xs font-bold tracking-wider text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md
                                    ${confirmModal.variant === 'danger'
                                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:to-orange-600 shadow-amber-500/30'}
                                `}
                            >
                                <Check className="w-4 h-4" />
                                {confirmModal.actionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceSettings;
