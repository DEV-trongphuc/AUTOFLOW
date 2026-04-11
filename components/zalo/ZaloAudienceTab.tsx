import * as React from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../../services/storageAdapter';
import {
    Users, ArrowLeft, Loader2, Calendar, RefreshCw,
    Search, Send, Filter, Check, Minus,
    UserPlus, Heart, ExternalLink, BadgeCheck, Star, Globe, Sparkles,
    Facebook, MessageCircle, Zap, List, Plus, Trash2, ArrowRight, MoreHorizontal, ChevronLeft, ChevronRight, Clock, User
} from 'lucide-react';
import Button from '../common/Button';
import { ZaloUserProfileModal } from './ZaloUserProfileModal';
import ItemsPerPageSelector from '../audience/ItemsPerPageSelector';
import Input from '../common/Input';
import Checkbox from '../common/Checkbox';
import ZaloSendZBSModal from './ZaloSendZBSModal';

const ZaloSkRow = ({ w, h, r }: { w: number | string; h: number; r: number }) => (
    <div style={{ width: w, height: h, borderRadius: r, background: '#e2e8f0', position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)', animation: 'sk-shimmer 1.4s ease-in-out infinite', transform: 'translateX(-100%)' }} />
    </div>
);

interface PaginationState {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ZaloAudienceTab: React.FC = () => {
    const [lists, setLists] = useState<any[]>([]);
    const [oas, setOAs] = useState<any[]>([]); // Store OAs
    const [loading, setLoading] = useState(false);
    const [activeList, setActiveList] = useState<any | null>(null);
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [isSendZBSOpen, setIsSendZBSOpen] = useState(false);

    useEffect(() => {
        fetchLists();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (activeList) {
            fetchSubscribers(activeList.id, pagination.page);
        }
    }, [activeList?.id, pagination.page, itemsPerPage, debouncedSearch]);

    const fetchLists = async () => {
        setLoading(true);
        // Fetch Lists first
        const resLists = await api.get<any[]>('zalo_audience?route=lists');
        if (resLists.success && Array.isArray(resLists.data)) {
            setLists(resLists.data);
        }

        // Fetch OAs to get Avatars
        const resOAs = await api.get<any[]>('zalo_oa');
        if (resOAs.success && Array.isArray(resOAs.data)) {
            setOAs(resOAs.data);
        }

        setLoading(false);
    };

    const fetchSubscribers = async (listId: string, page = 1) => {
        setLoadingSubs(true);
        const params = new URLSearchParams({
            route: 'subscribers',
            list_id: listId,
            page: page.toString(),
            limit: itemsPerPage.toString(),
            search: debouncedSearch
        });

        const res = await api.get<any>(`zalo_audience?${params.toString()}`);
        if (res.success && Array.isArray(res.data)) {
            setSubscribers(res.data);
            const meta = res.meta || {};
            setPagination({
                page: page,
                limit: itemsPerPage,
                total: meta.total || 0,
                totalPages: Math.ceil((meta.total || 0) / itemsPerPage)
            });
        }
        setLoadingSubs(false);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(subscribers.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    // Helper to find OA avatar matching the list
    const getOAForList = (list: any) => {
        if (!oas || oas.length === 0) return null;
        // 1. Try fuzzy match name
        const match = oas.find(oa => list.name.toLowerCase().includes(oa.name.toLowerCase()));
        if (match) return match;
        // 2. Fallback to first OA
        return oas[0];
    }

    if (activeList) {
        const allSelected = subscribers.length > 0 && selectedIds.length >= subscribers.length;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Stats Section Sync with Meta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard label="TỔNG Khách hàng" value={activeList.real_count || activeList.subscriber_count || 0} icon={Users} color="blue" />
                    <StatCard label="QUAN TÂM" value={activeList.followed_count || 0} icon={Heart} color="emerald" />
                    <StatCard label="TƯƠNG TÁC" value={(activeList.real_count || activeList.subscriber_count || 0) - (activeList.followed_count || 0)} icon={MessageCircle} color="amber" />
                </div>

                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                    <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-1">
                            <Input
                                placeholder="Tìm theo tên, email, SDT..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                icon={Search}
                                fullWidth
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl animate-bounce-subtle">
                                        <Sparkles className="w-3 h-3 text-amber-600" />
                                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Mẹo: Gửi qua UID rẻ hơn & tăng 40% tương tác</span>
                                    </div>
                                    <button
                                        onClick={() => setIsSendZBSOpen(true)}
                                        className="h-11 px-6 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-600/25 border-none animate-in fade-in slide-in-from-right-4 duration-300"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        Gửi ZNS ({selectedIds.length})
                                    </button>
                                </div>
                            )}
                            <button className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all">
                                <Filter className="w-4 h-4 text-slate-400" />
                                Bộ lọc
                            </button>
                            <button className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all">
                                <Clock className="w-4 h-4 text-slate-400" />
                                Mới nhất
                            </button>
                            <button className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all">
                                <Globe className="w-4 h-4 text-slate-400" />
                                Cột hiển thị
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm min-h-[500px]">
                    {loadingSubs ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4 pl-8 w-10"><ZaloSkRow w={20} h={20} r={6} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <ZaloSkRow w={40} h={40} r={12} />
                                                    <div className="space-y-2">
                                                        <ZaloSkRow w={120} h={14} r={6} />
                                                        <ZaloSkRow w={80} h={11} r={4} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><ZaloSkRow w={70} h={22} r={8} /></td>
                                            <td className="px-6 py-4"><ZaloSkRow w={100} h={30} r={8} /></td>
                                            <td className="px-6 py-4 text-center"><ZaloSkRow w={50} h={22} r={8} /></td>
                                            <td className="px-6 py-4"><ZaloSkRow w={50} h={20} r={8} /></td>
                                            <td className="px-6 py-4"><ZaloSkRow w={70} h={14} r={6} /></td>
                                            <td className="px-6 py-4 text-right pr-8"><ZaloSkRow w={28} h={28} r={8} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto max-h-[450px] min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-left sticky top-0 z-20 backdrop-blur-sm">
                                        <th className="px-6 py-4 w-10 pl-8">
                                            <Checkbox
                                                checked={allSelected}
                                                onChange={(val) => handleSelectAll(val)}
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoạt động gần nhất</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Điểm Lead</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tham gia</th>
                                        <th className="px-6 py-4 text-right pr-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {subscribers.map(sub => (
                                        <tr
                                            key={sub.id}
                                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedIds.includes(sub.id) ? 'bg-amber-50/20' : ''}`}
                                            onClick={() => setSelectedProfileId(sub.id)}
                                        >
                                            <td className="px-6 py-4 pl-8" onClick={e => { e.stopPropagation(); toggleSelect(sub.id); }}>
                                                <Checkbox
                                                    checked={selectedIds.includes(sub.id)}
                                                    onChange={() => { }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="relative mr-3">
                                                        <div className="h-10 w-10 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-amber-50 group-hover:to-amber-100 transition-all shadow-sm">
                                                            {sub.avatar ? (
                                                                <img src={sub.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-600 group-hover:text-amber-600 text-[13px] font-bold">
                                                                    {getInitials(sub.display_name || sub.name || 'Zalo User')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors flex items-center gap-1">
                                                            {sub.display_name || sub.name || 'Zalo User'}
                                                            {(sub.manual_email || sub.phone_number || sub.email) && <BadgeCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-50" />}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-slate-400 truncate w-32">UID: {sub.zalo_user_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${sub.is_follower == 1 || sub.status === 'followed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {sub.is_follower == 1 || sub.status === 'followed' ? 'QUAN TÂM' : 'TƯƠNG TÁC'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold">Tham gia</span>
                                                        <span className="text-[9px] opacity-70 uppercase">{formatTimeAgoShort(sub.last_interaction_at || sub.created_at)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold">
                                                    <Zap className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                                    {sub.lead_score || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1">
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 uppercase tracking-widest border border-amber-100">Zalo</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-slate-500">{new Date(sub.joined_at || sub.created_at).toLocaleDateString('vi-VN')}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right pr-8">
                                                <button className="text-slate-300 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination Section Sync with Audience Page */}
                {!loadingSubs && pagination.total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-[32px]">
                        <ItemsPerPageSelector
                            value={itemsPerPage}
                            onChange={(val) => {
                                setItemsPerPage(val);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                disabled={pagination.page === pagination.totalPages}
                                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {selectedProfileId && (
                    <ZaloUserProfileModal
                        subscriberId={selectedProfileId}
                        onClose={() => setSelectedProfileId(null)}
                        onUpdate={() => fetchSubscribers(activeList.id, pagination.page)}
                    />
                )}
                {isSendZBSOpen && activeList && (
                    <ZaloSendZBSModal
                        isOpen={isSendZBSOpen}
                        onClose={() => setIsSendZBSOpen(false)}
                        oaId={activeList.oa_config_id}
                        selectedSubscribers={subscribers.filter(s => selectedIds.includes(s.id))}
                        onSuccess={() => setSelectedIds([])}
                    />
                )}
                <style>{`
                    .animate-bounce-subtle {
                        animation: bounce-subtle 2s infinite;
                    }
                    @keyframes bounce-subtle {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-amber-600 rounded-[18px] shadow-lg shadow-amber-600/20 flex items-center justify-center text-white flex-shrink-0">
                        <List className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Danh sách đối tượng Zalo</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-80 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Tự động đồng bộ từ Zalo OA
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                            <div className="flex items-start justify-between mb-8">
                                <ZaloSkRow w={56} h={56} r={16} />
                                <ZaloSkRow w={80} h={28} r={20} />
                            </div>
                            <ZaloSkRow w="70%" h={20} r={8} />
                            <div className="mt-2 mb-8"><ZaloSkRow w="50%" h={12} r={6} /></div>
                            <div className="flex items-center justify-between border-t border-slate-50 pt-8">
                                <ZaloSkRow w={80} h={40} r={10} />
                                <ZaloSkRow w={48} h={48} r={16} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map(list => {
                        const oa = getOAForList(list);

                        return (
                            <div
                                key={list.id}
                                onClick={() => {
                                    setActiveList(list);
                                    setPagination({ page: 1, limit: itemsPerPage, total: 0, totalPages: 1 });
                                }}
                                className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-amber-100 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-amber-100 transition-colors"></div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                                            {oa && oa.avatar ? (
                                                <img src={oa.avatar} alt={oa.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-7 h-7" />
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black px-4 py-2 bg-amber-50 text-amber-600 rounded-full border border-amber-100 uppercase tracking-widest flex items-center gap-2">
                                            <Plus className="w-3.5 h-3.5" /> Thêm mới
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-800 mb-2 truncate pr-6 tracking-tight uppercase">{list.name}</h3>
                                    <p className="text-slate-400 text-[10px] font-bold opacity-60 mb-8 uppercase tracking-[0.1em] line-clamp-1">{list.description || 'Không có mô tả cho danh sách này'}</p>

                                    <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-8">
                                        <div className="flex flex-col text-left">
                                            <span className="text-4xl font-black text-slate-800 tracking-tighter">{(list.real_count || list.subscriber_count || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 px-0.5">Thành viên</span>
                                        </div>
                                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-amber-600/20 transition-all flex items-center justify-center">
                                            <ArrowRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white px-5 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all duration-300">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-${color}-50 text-${color === 'blue' ? 'amber-600' : color === 'emerald' ? 'emerald-600' : 'amber-600'} group-hover:scale-105`}>
            {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-black text-slate-800 tracking-tighter">{(value || 0).toLocaleString()}</p>
        </div>
    </div>
);

const formatTimeAgoShort = (date: string) => {
    if (!date) return 'Vừa xong';
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    if (diff < 60000) return 'vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days} ngày trước`;
    return then.toLocaleDateString('vi-VN');
};

export default ZaloAudienceTab;
