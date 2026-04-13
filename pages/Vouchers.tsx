import React, { useState, useEffect } from 'react';
import { Plus, Gift, LayoutGrid, Search, MoreVertical, CreditCard, Copy, Filter, CalendarClock, Ticket, Settings2, Trash2, Power, AlertTriangle } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import { api } from '../services/storageAdapter';
import toast from 'react-hot-toast';
import { VoucherCampaign, VoucherCode } from '../types';
import VoucherCampaignModal from '../components/vouchers/VoucherCampaignModal';
import VoucherCodeManager from '../components/vouchers/VoucherCodeManager';
import VoucherGuideModal from '../components/vouchers/VoucherGuideModal';
import VoucherApiEmbedModal from '../components/vouchers/VoucherApiEmbedModal';
import { BookOpen, Code } from 'lucide-react';

const Vouchers: React.FC = () => {
    const [campaigns, setCampaigns] = useState<VoucherCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    const [isOriginModalOpen, setOriginModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Partial<VoucherCampaign> | undefined>();
    const [selectedCampaignForCodes, setSelectedCampaignForCodes] = useState<VoucherCampaign | null>(null);
    const [selectedCampaignForApi, setSelectedCampaignForApi] = useState<VoucherCampaign | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<VoucherCampaign | null>(null);
    const [isGuideModalOpen, setGuideModalOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get<VoucherCampaign[]>('voucher_campaigns');
            if (res.success && res.data) {
                setCampaigns(res.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải danh sách Voucher');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredCampaigns = campaigns.filter(c => {
        if (activeTab === 'all') return true;
        return c.status === activeTab;
    });

    const handleCreateOrUpdateCampaign = async (campaignData: Partial<VoucherCampaign>) => {
        const url = 'voucher_campaigns';
        // API handles both create and edit via POST using ID check
        const finalData = { ...campaignData };

        const res = await api.post<VoucherCampaign>(url, finalData);
        if (res.success) {
            toast.success(campaignData.id ? 'Đã cập nhật chiến dịch!' : 'Tạo Voucher thành công!');
            setOriginModalOpen(false);
            loadData();
        } else {
            toast.error((res as any).message || 'Lỗi khi lưu chiến dịch!');
        }
    };

    const handleToggleStatus = async (campaign: VoucherCampaign) => {
        const newStatus = campaign.status === 'active' ? 'draft' : 'active';
        const res = await api.post('voucher_campaigns', {
            ...campaign,
            status: newStatus
        });
        if (res.success) {
            toast.success(`Đã chuyển chiến dịch sang: ${newStatus === 'active' ? 'Đang chạy' : 'Bản nháp'}`);
            loadData();
        } else {
            toast.error('Lỗi khi đổi trạng thái');
        }
    };

    const confirmDelete = (campaign: VoucherCampaign) => {
        setDeleteTarget(campaign);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const res = await api.delete(`voucher_campaigns/${deleteTarget.id}`);
        if (res.success) {
            toast.success('Đã xóa chiến dịch!');
            setDeleteTarget(null);
            loadData();
        } else {
            toast.error('Lỗi khi xóa!');
        }
    };

    const openCreateModal = () => {
        setEditingCampaign(undefined);
        setOriginModalOpen(true);
    };

    return (
        <div className="animate-fade-in space-y-6 pb-32">
            <PageHero
                title={<>Kho <span className="text-orange-100/80">Voucher</span></>}
                subtitle="Quản lý mã giảm giá, quà tặng và tích hợp trực tiếp vào chiến dịch Email/Zalo của bạn."
                actions={[
                    {
                        label: 'Tạo Voucher mới',
                        icon: Plus,
                        onClick: openCreateModal,
                        primary: false
                    },
                    {
                        label: 'Hướng dẫn chi tiết',
                        icon: BookOpen,
                        onClick: () => setGuideModalOpen(true),
                        primary: true
                    }
                ]}
            />

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 lg:p-6 min-h-[500px]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <Tabs
                        variant="pill"
                        activeId={activeTab}
                        onChange={setActiveTab}
                        items={[
                            { id: 'all', label: 'Tất cả', icon: LayoutGrid },
                            { id: 'active', label: 'Đang chạy', icon: Ticket },
                            { id: 'draft', label: 'Bản nháp', icon: Settings2 },
                            { id: 'expired', label: 'Hết hạn', icon: CalendarClock },
                        ]}
                    />
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Tìm kiếm voucher..."
                            icon={Search}
                            className="w-64"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64"><p className="text-slate-400">Đang tải dữ liệu...</p></div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="py-20 flex justify-center animate-in fade-in zoom-in-95 duration-700">
                        <div className="relative bg-[#fffbe1] border-[2px] border-dashed border-[#b45309] rounded-[16px] p-10 max-w-lg w-full text-center overflow-hidden">
                            {/* Cutouts */}
                            <div className="absolute top-1/2 -left-4 w-8 h-8 bg-white rounded-full transform -translate-y-1/2 border-r-[2px] border-dashed border-[#b45309]"></div>
                            <div className="absolute top-1/2 -right-4 w-8 h-8 bg-white rounded-full transform -translate-y-1/2 border-l-[2px] border-dashed border-[#b45309]"></div>

                            <Gift className="w-10 h-10 mx-auto text-[#b45309] mb-4" />
                            <h3 className="text-2xl font-black text-[#b45309] uppercase tracking-widest mb-3">Chưa có Voucher Nào</h3>
                            <p className="text-sm font-medium text-[#b45309]/80 mb-8 mx-auto max-w-sm">
                                Khởi tạo chiến dịch quà tặng/mã giảm giá để tri ân khách hàng và tăng tỉ lệ chuyển đổi.
                            </p>

                            <Button
                                onClick={openCreateModal}
                                variant="custom"
                                className="bg-[#b45309] hover:bg-[#92400e] text-white border-0 shadow-lg shadow-[#b45309]/20 px-8 py-3 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all hover:scale-105"
                            >
                                Tạo chiến dịch ngay
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredCampaigns.map(campaign => (
                            <div key={campaign.id} className="group bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/5 to-orange-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shrink-0 relative overflow-hidden shadow-md shadow-orange-200/30 border-[1.5px] border-orange-500/30">
                                        {campaign.thumbnailUrl ? (
                                            <img 
                                                src={campaign.thumbnailUrl} 
                                                alt={campaign.name} 
                                                className="absolute inset-0 w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110" 
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-600">
                                                <Gift className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer mr-2" title={campaign.status === 'active' ? 'Tạm dừng chiến dịch' : 'Kích hoạt chiến dịch'}>
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={campaign.status === 'active'}
                                                onChange={() => handleToggleStatus(campaign)}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 hover:bg-slate-300 peer-checked:hover:bg-emerald-600"></div>
                                            <span className={`ml-2 text-[10px] uppercase font-black tracking-widest ${campaign.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {campaign.status === 'active' ? 'Hoạt động' : 'Đang Tắt'}
                                            </span>
                                        </label>
                                        <button onClick={() => { setEditingCampaign(campaign); setOriginModalOpen(true); }} className="text-slate-300 hover:text-slate-600 transition-colors p-1" title="Chỉnh sửa"><Settings2 className="w-4 h-4" /></button>
                                        <button onClick={() => confirmDelete(campaign)} className="text-slate-300 hover:text-rose-600 transition-colors p-1" title="Xóa bỏ"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight line-clamp-1 mb-1">{campaign.name}</h3>
                                <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-4 h-8">{campaign.description}</p>

                                <div className="mt-auto">
                                    <div className="bg-slate-50 border border-slate-100/80 rounded-xl p-3 flex flex-col gap-1 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại mã</span>
                                            <span className="text-xs font-bold text-slate-700 uppercase">{campaign.codeType}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ưu đãi</span>
                                            <span className="text-xs font-bold text-amber-700">
                                                {campaign.rewards && campaign.rewards.length > 1
                                                    ? `Gói đa quà tặng (${campaign.rewards.length} món)`
                                                    : campaign.rewards && campaign.rewards.length === 1
                                                        ? (campaign.rewards[0].discountType === 'percentage' ? `${campaign.rewards[0].discountValue}%` :
                                                            campaign.rewards[0].discountType === 'fixed_amount' ? `${campaign.rewards[0].discountValue?.toLocaleString()}đ` :
                                                                campaign.rewards[0].giftTitle)
                                                        : 'Chưa có ưu đãi'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-[3] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200" variant="custom" icon={Code} onClick={() => setSelectedCampaignForApi(campaign)}>API</Button>
                                        <Button className="flex-[7]" variant="outline" icon={LayoutGrid} iconClassName="text-orange-500 stroke-[1.5px]" onClick={() => setSelectedCampaignForCodes(campaign)}>Quản lý mã</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isOriginModalOpen && (
                <VoucherCampaignModal
                    isOpen={isOriginModalOpen}
                    onClose={() => setOriginModalOpen(false)}
                    onSave={handleCreateOrUpdateCampaign}
                    initialData={editingCampaign}
                />
            )}

            {selectedCampaignForCodes && (
                <VoucherCodeManager
                    isOpen={!!selectedCampaignForCodes}
                    onClose={() => setSelectedCampaignForCodes(null)}
                    campaign={selectedCampaignForCodes}
                />
            )}

            {selectedCampaignForApi && (
                <VoucherApiEmbedModal
                    isOpen={!!selectedCampaignForApi}
                    onClose={() => setSelectedCampaignForApi(null)}
                    campaign={selectedCampaignForApi}
                />
            )}

            <VoucherGuideModal
                isOpen={isGuideModalOpen}
                onClose={() => setGuideModalOpen(false)}
            />

            {/* Custom Delete Warning Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Cảnh báo xóa chiến dịch</h3>
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">
                                Khách hàng sẽ <span className="font-bold text-rose-600">không thể nhận phần thưởng</span> nếu nhấp vào nút trong Email chứa Voucher này nữa!
                            </p>
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
                                <p className="text-xs font-medium text-amber-800">
                                    Vui lòng chuyển qua mục Chiến dịch (Email/Zalo) và xóa hoặc thay thế khối Voucher lỗi trước khi bấm nút xóa tại đây.
                                </p>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Suy nghĩ lại</Button>
                                <Button variant="danger" onClick={executeDelete}>Vẫn Xóa</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vouchers;
