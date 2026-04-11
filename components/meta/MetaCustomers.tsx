import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/storageAdapter';
import {
    Users, ArrowLeft, Loader2, Calendar, RefreshCw,
    Search, Send, Filter, Check, Minus,
    UserPlus, Heart, ExternalLink, BadgeCheck, Star, Globe,
    Facebook, MessageCircle, Zap, MoreHorizontal, ChevronLeft, ChevronRight, Clock, UserPlus as UserPlusIcon, User
} from 'lucide-react';
import Button from '../common/Button';
import Select from '../common/Select';
import { MetaCustomerProfileModal } from './MetaCustomerProfileModal';

import ItemsPerPageSelector from '../audience/ItemsPerPageSelector';

const MetaSkRow = ({ w, h, r }: { w: number | string; h: number; r: number }) => (
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

const MetaCustomers: React.FC = () => {
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activePage, setActivePage] = useState<any | null>(null);
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterVerify, setFilterVerify] = useState<'all' | 'verified' | 'unverified'>('all');
    const [filterPoints, setFilterPoints] = useState<'all' | 'low' | 'med' | 'high'>('all');
    const [filterDataType, setFilterDataType] = useState<'all' | 'synced' | 'unsynced'>('all');

    // Stats State
    const [stats, setStats] = useState<any>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = React.useRef<HTMLDivElement>(null);

    const getInitials = (name: string) => {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (activePage) {
            fetchSubscribers(activePage.page_id, pagination.page);
        }
    }, [activePage?.page_id, pagination.page, itemsPerPage, debouncedSearch, filterVerify, filterPoints, filterDataType]);

    const fetchPages = async () => {
        setLoading(true);
        const res = await api.get<any[]>('meta_config');
        if (res.success && Array.isArray(res.data)) {
            setPages(res.data);
        }
        setLoading(false);
    };

    const fetchSubscribers = async (pageId: string, page = 1) => {
        setLoadingSubs(true);
        const offset = (page - 1) * itemsPerPage;

        let filterValue = 'all';
        if (filterVerify === 'verified') filterValue = 'identified';

        const params = new URLSearchParams({
            route: 'subscribers',
            page_id: pageId,
            limit: itemsPerPage.toString(),
            offset: offset.toString(),
            search: debouncedSearch,
            filter: filterDataType !== 'all' ? filterDataType : filterValue
        });

        const res = await api.get<any>(`meta_customers?${params.toString()}`);
        if (res.success && res.data) {
            setSubscribers(res.data.customers || []);
            setPagination({
                page: page,
                limit: itemsPerPage,
                total: res.data.total || 0,
                totalPages: Math.ceil((res.data.total || 0) / itemsPerPage)
            });
            setStats(res.data.counts || null);
        }
        setLoadingSubs(false);
    };

    const handlePageClick = (page: any) => {
        setActivePage(page);
        setPagination({ page: 1, limit: itemsPerPage, total: 0, totalPages: 1 });
        setSelectedIds([]);
    };

    const handleBack = () => {
        setActivePage(null);
        setSubscribers([]);
        setFilterVerify('all');
        setFilterPoints('all');
        setFilterDataType('all');
        setSearchQuery('');
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
        setSelectedIds([]);
    };

    const filteredSubscribers = useMemo(() => {
        if (!Array.isArray(subscribers)) return [];
        return subscribers.filter(sub => {
            const score = Number(sub.lead_score || 0);
            if (filterPoints === 'low' && score >= 10) return false;
            if (filterPoints === 'med' && (score < 10 || score >= 50)) return false;
            if (filterPoints === 'high' && score < 50) return false;
            return true;
        });
    }, [subscribers, filterPoints]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredSubscribers.map(s => s.id));
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

    if (activePage) {
        const allSelected = filteredSubscribers.length > 0 && selectedIds.length >= filteredSubscribers.length;
        const someSelected = selectedIds.length > 0 && !allSelected;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Stats Section Sync with Audience Page */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard label="TỔNG Khách hàng" value={stats.all} icon={Users} color="blue" />
                        <StatCard label="ĐÃ ĐỊNH DANH" value={stats.identified} icon={BadgeCheck} color="emerald" />
                        <StatCard label="CHỜ XỬ LÝ" value={stats.unsynced} icon={RefreshCw} color="amber" />
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                    <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-1 relative group bg-white rounded-xl border border-slate-200 h-11 flex items-center overflow-hidden transition-all focus-within:border-amber-600 focus-within:ring-4 focus-within:ring-amber-600/5">
                            <Search className="w-4 h-4 ml-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, email, PSID..."
                                className="w-full h-full bg-transparent border-none outline-none text-sm px-3 font-medium placeholder:text-slate-300"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`h-11 px-6 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${isFilterOpen ? 'bg-slate-900 !text-white border-slate-900 shadow-xl shadow-slate-900/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <Filter className={`w-4 h-4 ${isFilterOpen ? 'text-amber-400' : 'text-slate-400'}`} />
                                    Bộ lọc
                                    {(filterVerify !== 'all' || filterPoints !== 'all' || filterDataType !== 'all') && (
                                        <span className="w-4 h-4 rounded-full bg-amber-600 !text-white text-[9px] flex items-center justify-center animate-in zoom-in ml-1">
                                            {(filterVerify !== 'all' ? 1 : 0) + (filterPoints !== 'all' ? 1 : 0) + (filterDataType !== 'all' ? 1 : 0)}
                                        </span>
                                    )}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-[32px] shadow-2xl p-6 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">Trạng thái định danh</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { id: 'all', label: 'Tất cả đối tượng' },
                                                        { id: 'verified', label: 'Đã định danh (Linked)' },
                                                        { id: 'unverified', label: 'Chưa định danh' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setFilterVerify(opt.id as any)}
                                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between ${filterVerify === opt.id ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            {opt.label}
                                                            {filterVerify === opt.id && <Check className="w-3.5 h-3.5" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="h-px bg-slate-100"></div>

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block px-1">Mức điểm thưởng</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { id: 'all', label: 'Tất cả mức điểm' },
                                                        { id: 'low', label: 'Dưới 10 (Mới)' },
                                                        { id: 'med', label: '10 - 50 (Tiềm năng)' },
                                                        { id: 'high', label: 'Trên 50 (Khách VIP)' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setFilterPoints(opt.id as any)}
                                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between ${filterPoints === opt.id ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {opt.id !== 'all' && <Star className={`w-3 h-3 ${filterPoints === opt.id ? 'fill-current' : ''}`} />}
                                                                {opt.label}
                                                            </div>
                                                            {filterPoints === opt.id && <Check className="w-3.5 h-3.5" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {(filterVerify !== 'all' || filterPoints !== 'all' || filterDataType !== 'all') && (
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => { setFilterVerify('all'); setFilterPoints('all'); setFilterDataType('all'); }}
                                                        className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                                                    >
                                                        Xóa bộ lọc
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                            <td className="px-6 py-4 pl-8 w-10"><MetaSkRow w={20} h={20} r={6} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <MetaSkRow w={40} h={40} r={12} />
                                                    <div className="space-y-2">
                                                        <MetaSkRow w={120} h={14} r={6} />
                                                        <MetaSkRow w={80} h={11} r={4} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><MetaSkRow w={70} h={22} r={8} /></td>
                                            <td className="px-6 py-4"><MetaSkRow w={100} h={30} r={8} /></td>
                                            <td className="px-6 py-4 text-center"><MetaSkRow w={50} h={22} r={8} /></td>
                                            <td className="px-6 py-4"><MetaSkRow w={50} h={20} r={8} /></td>
                                            <td className="px-6 py-4"><MetaSkRow w={70} h={14} r={6} /></td>
                                            <td className="px-6 py-4 text-right pr-8"><MetaSkRow w={28} h={28} r={8} /></td>
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
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]"
                                                />
                                                <Check className="absolute w-3.5 h-3.5 !text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
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
                                    {filteredSubscribers.map(sub => (
                                        <tr
                                            key={sub.id}
                                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedIds.includes(sub.id) ? 'bg-amber-50/20' : ''}`}
                                            onClick={() => setSelectedProfileId(sub.id)}
                                        >
                                            <td className="px-6 py-4 pl-8" onClick={e => { e.stopPropagation(); toggleSelect(sub.id); }}>
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(sub.id)}
                                                        onChange={() => { }}
                                                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-amber-600 checked:bg-amber-600 hover:border-amber-600"
                                                    />
                                                    <Check className="absolute w-3.5 h-3.5 !text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="relative mr-3">
                                                        <div className="h-10 w-10 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-[#fff4e0] group-hover:to-[#ffe8cc] transition-all shadow-sm">
                                                            <div className="w-full h-full flex items-center justify-center text-slate-600 group-hover:text-[#ca7900] text-[13px] font-bold uppercase">
                                                                {getInitials(sub.name || sub.display_name || 'Facebook User')}
                                                            </div>
                                                            {(sub.avatar || sub.profile_pic) && (
                                                                <img 
                                                                    src={sub.avatar || sub.profile_pic} 
                                                                    alt="" 
                                                                    className="absolute inset-0 w-full h-full object-cover bg-white" 
                                                                    onError={(e) => {
                                                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800 group-hover:text-[#ca7900] transition-colors flex items-center gap-1">
                                                            {sub.name || sub.display_name || 'Facebook User'}
                                                            {(sub.manual_email || sub.phone_number || sub.email || sub.phone) && <BadgeCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-50" />}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-slate-400 truncate w-32">PSID: {String(sub.psid || '').substring(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${sub.is_synced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {sub.is_synced ? 'ACTIVE' : 'VISITOR'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold">Tham gia</span>
                                                        <span className="text-[9px] opacity-70 uppercase">{formatTimeAgoShort(sub.last_active_at || sub.updated_at)}</span>
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
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">Meta</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-slate-500">{new Date(sub.created_at || sub.joined_at).toLocaleDateString('vi-VN')}</span>
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
                    )
                    }
                </div >

                {/* Pagination Section Sync with Audience Page */}
                {
                    !loadingSubs && pagination.total > 0 && (
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
                    )
                }

                {
                    selectedProfileId && (
                        <MetaCustomerProfileModal
                            subscriberId={selectedProfileId}
                            onClose={() => setSelectedProfileId(null)}
                            onUpdate={() => fetchSubscribers(activePage.page_id, pagination.page)}
                        />
                    )
                }
            </div >
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-600 rounded-[14px] shadow-lg shadow-amber-600/10 flex items-center justify-center !text-white flex-shrink-0">
                        <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">Danh sách Khách hàng Messenger</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-80">Tự động đồng bộ từ Facebook Pages</p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-4 px-6 border-l border-slate-200/50">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tổng Khách hàng</p>
                        <p className="text-lg font-black text-slate-800 tracking-tighter">
                            {Array.isArray(pages) ? pages.reduce((acc, p) => acc + Number(p.subscriber_count || 0), 0).toLocaleString() : '0'}
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <div className="flex items-start justify-between mb-8">
                                <MetaSkRow w={48} h={48} r={16} />
                                <MetaSkRow w={80} h={26} r={20} />
                            </div>
                            <MetaSkRow w="70%" h={18} r={8} />
                            <div className="mt-2 mb-8"><MetaSkRow w="50%" h={11} r={6} /></div>
                            <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                                <MetaSkRow w={70} h={36} r={8} />
                                <MetaSkRow w={40} h={40} r={16} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !Array.isArray(pages) || pages.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/30 rounded-[40px] border-2 border-dashed border-slate-100">
                    <Facebook className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[11px] italic">Chưa có kết nối Fanpage nào.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pages.map(page => (
                        <div
                            key={page.id}
                            onClick={() => handlePageClick(page)}
                            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-amber-100 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-amber-50 transition-colors"></div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="relative w-12 h-12 bg-[#fff4e0] rounded-2xl shadow-sm border border-[#ffe8cc] overflow-hidden flex items-center justify-center text-[#ffa900] group-hover:scale-110 transition-transform font-black text-2xl uppercase shrink-0">
                                        {page.page_name || page.name ? (page.page_name || page.name).charAt(0) : 'F'}
                                        {page.avatar_url && (
                                            <img
                                                src={page.avatar_url}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover bg-white"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 uppercase tracking-widest flex items-center gap-1.5">
                                        <RefreshCw className="w-3 h-3 animate-spin duration-[15s]" /> Live Sync
                                    </span>
                                </div>

                                <h3 className="text-base font-black text-slate-800 mb-1 line-clamp-1 pr-6 tracking-tight uppercase">{page.page_name || page.name}</h3>
                                <p className="text-slate-400 text-[10px] font-bold opacity-60 mb-8 uppercase tracking-tighter">PAGE ID: {page.page_id}</p>

                                <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                                    <div className="flex flex-col text-left">
                                        <span className="text-3xl font-black text-slate-800 tracking-tighter">{(page.subscriber_count || 0).toLocaleString()}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Khách hàng Meta</span>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-amber-600 group-hover:!text-white group-hover:shadow-lg group-hover:shadow-amber-600/20 transition-all flex items-center justify-center">
                                        <ArrowLeft className="w-5 h-5 rotate-180" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white px-5 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all duration-300">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${color === 'blue' ? 'bg-amber-50 text-amber-600' :
            color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                'bg-amber-50 text-amber-600'
            } group-hover:scale-105`}>
            {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-black text-slate-800 tracking-tighter">{(value || 0).toLocaleString()}</p>
        </div>
    </div>
);

const TabButton = ({ active, onClick, label, count, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 active:scale-95 ${active
            ? 'bg-amber-600 !text-white shadow-xl shadow-amber-600/20'
            : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
    >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {count !== undefined && <span className={`px-2 py-0.5 rounded-lg text-[9px] ${active ? 'bg-white/20' : 'bg-slate-200/50 text-slate-500'}`}>{count}</span>}
    </button>
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

export default MetaCustomers;
