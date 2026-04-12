import React, { useState } from 'react';
import { Gift, Plus, CalendarRange, Infinity as InfinityIcon, Tag, Hash, Box } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Tabs from '../common/Tabs';
import ImageUploader from '../templates/EmailEditor/components/Properties/ImageUploader';
import { VoucherCampaign } from '../../types';
import toast from 'react-hot-toast';

interface VoucherCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (campaign: Partial<VoucherCampaign>) => void;
    initialData?: Partial<VoucherCampaign>;
}

const VoucherCampaignModal: React.FC<VoucherCampaignModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [step, setStep] = useState(1);
    const [syncModeModalOpen, setSyncModeModalOpen] = useState(false);
    const [syncMode, setSyncMode] = useState<'preserve' | 'reset_unused'>('preserve');

    const [formData, setFormData] = useState<Partial<VoucherCampaign>>(initialData || {
        name: '',
        description: '',
        rewards: [
            { id: `rew_${Date.now()}`, discountType: 'percentage', discountValue: 0 }
        ],
        codeType: 'dynamic',
        staticCode: '',
        status: 'draft',
    });
    
    const handleNext = () => setStep(prev => prev + 1);
    const handlePrev = () => setStep(prev => prev - 1);

    const handleSubmit = () => {
        if (initialData?.id) {
            setSyncModeModalOpen(true);
        } else {
            finalizeSave('preserve');
        }
    };

    const finalizeSave = (mode: string) => {
        setSyncModeModalOpen(false);
        const finalData = { ...formData, syncMode: mode };
        onSave(finalData);
    };

    const addReward = () => {
        setFormData(prev => ({
            ...prev,
            rewards: [...(prev.rewards || []), { id: `rew_${Date.now()}`, discountType: 'percentage', discountValue: 0 }]
        }));
    };

    const updateReward = (idx: number, field: string, value: any) => {
        setFormData(prev => {
            const newRewards = [...(prev.rewards || [])];
            newRewards[idx] = { ...newRewards[idx], [field]: value };
            return { ...prev, rewards: newRewards };
        });
    };

    const removeReward = (idx: number) => {
        setFormData(prev => {
            const newRewards = [...(prev.rewards || [])];
            if (newRewards.length <= 1) {
                toast.error('Phải có ít nhất 1 phần quà!');
                return prev;
            }
            newRewards.splice(idx, 1);
            return { ...prev, rewards: newRewards };
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData?.id ? "Chỉnh sửa Ưu đãi" : "Tạo Chiến dịch Voucher mới"}
            size="lg"
            footer={
                <div className="flex justify-between w-full">
                    <Button variant="ghost" onClick={step === 1 ? onClose : handlePrev}>
                        {step === 1 ? 'Hủy' : 'Quay lại'}
                    </Button>
                    <div className="flex gap-2">
                        {step < 2 ? (
                            <Button onClick={handleNext} variant="primary">Tiếp tục</Button>
                        ) : (
                            <Button onClick={handleSubmit} variant="primary" icon={Plus}>Hoàn tất</Button>
                        )}
                    </div>
                </div>
            }
        >
            <div className="flex items-center gap-2 mb-6">
                {[1, 2].map((s) => (
                    <React.Fragment key={s}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            s === step ? 'bg-amber-600 text-white shadow-md' :
                            s < step ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                            {s}
                        </div>
                        {s < 2 && (
                            <div className={`flex-1 h-1 rounded-full ${s < step ? 'bg-amber-200' : 'bg-slate-100'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="space-y-4">
                        <Input 
                            label="Tên chiến dịch *" 
                            placeholder="VD: Tri ân khách VIP tháng 10"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                        />
                        <Input 
                            label="Mô tả ưu đãi" 
                            placeholder="Mô tả chi tiết thể lệ, điều kiện áp dụng..."
                            value={formData.description || ''}
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        />
                        <div className="pt-2">
                            <ImageUploader 
                                label="Hình ảnh Thumbnail của Campaign" 
                                value={formData.thumbnailUrl || ''}
                                onChange={(url: string) => setFormData(p => ({ ...p, thumbnailUrl: url }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Danh sách phần quà / Ưu đãi</label>
                            <Button size="sm" variant="outline" icon={Plus} onClick={addReward}>Thêm Quà</Button>
                        </div>
                        
                        {(formData.rewards || []).map((reward, idx) => (
                            <div key={reward.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative space-y-4">
                                <div className="absolute -top-3 -right-3">
                                    <button onClick={() => removeReward(idx)} className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors">
                                        <Plus className="w-3 h-3 rotate-45" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'percentage', label: 'Giảm phần trăm', icon: Tag, suffix: '%' },
                                        { id: 'fixed_amount', label: 'Giảm số tiền', icon: Hash, suffix: 'VNĐ' },
                                        { id: 'physical_gift', label: 'Tặng quà', icon: Box, suffix: '' }
                                    ].map(type => {
                                        const Icon = type.icon;
                                        const isSelected = reward.discountType === type.id;
                                        return (
                                            <button 
                                                key={type.id}
                                                onClick={() => updateReward(idx, 'discountType', type.id)}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                                    isSelected ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-100 hover:border-slate-300 bg-white text-slate-500'
                                                }`}
                                            >
                                                <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                                                <span className="text-[10px] font-bold text-center">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        {reward.discountType === 'percentage' && (
                                            <div className="relative">
                                                <Input 
                                                    type="number"
                                                    label="Giảm (%)"
                                                    placeholder="20"
                                                    value={reward.discountValue || ''}
                                                    onChange={e => updateReward(idx, 'discountValue', parseInt(e.target.value) || 0)}
                                                    customSize="sm"
                                                />
                                            </div>
                                        )}
                                        {reward.discountType === 'fixed_amount' && (
                                            <div className="relative">
                                                <Input 
                                                    type="number"
                                                    label="Giảm (VNĐ)"
                                                    placeholder="50000"
                                                    value={reward.discountValue || ''}
                                                    onChange={e => updateReward(idx, 'discountValue', parseInt(e.target.value) || 0)}
                                                    customSize="sm"
                                                />
                                            </div>
                                        )}
                                        {reward.discountType === 'physical_gift' && (
                                            <Input 
                                                label="Tên quà tặng"
                                                placeholder="VD: 1 Áo thun mùa hè"
                                                value={reward.giftTitle || ''}
                                                onChange={e => updateReward(idx, 'giftTitle', e.target.value)}
                                                customSize="sm"
                                            />
                                        )}
                                    </div>
                                    <div className="w-1/3">
                                        <Input
                                            type="number"
                                            label="Số lượng"
                                            placeholder="Vô hạn"
                                            value={reward.quantity !== undefined && reward.quantity !== null ? reward.quantity.toString() : ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                updateReward(idx, 'quantity', val === '' ? undefined : Number(val));
                                            }}
                                            customSize="sm"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100/60">
                                    <ImageUploader 
                                        compact
                                        label="Hình ảnh riêng của phần quà này"
                                        value={reward.imageUrl || ''}
                                        onChange={(url: string) => updateReward(idx, 'imageUrl', url)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Loại mã Voucher</label>
                        <Tabs 
                            activeId={formData.codeType as string}
                            onChange={(id) => setFormData(p => ({ ...p, codeType: id as any, staticCode: id === 'dynamic' ? '' : p.staticCode }))}
                            items={[
                                { id: 'dynamic', label: 'Tự động sinh ngẫu nhiên', icon: Hash },
                                { id: 'static', label: 'Một mã dùng chung', icon: Tag }
                            ]}
                        />
                    </div>

                    {formData.codeType === 'static' ? (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in">
                            <Input 
                                label="Mã Voucher chung"
                                placeholder="VD: SUMMERROSE"
                                value={formData.staticCode || ''}
                                onChange={e => setFormData(p => ({ ...p, staticCode: e.target.value.toUpperCase() }))}
                            />
                            <p className="text-xs text-slate-500 mt-2">Ví dụ: Mọi người đều nhập SUMMERROSE để được giảm giá.</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4 animate-in fade-in items-start">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-amber-600 shrink-0">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">Tự động sinh mã (Auto-generate)</h4>
                                <p className="text-xs text-slate-500 line-height-relaxed mt-1">Hệ thống sẽ tự động tạo từng chuỗi mã khác nhau (VD: XA4-QWF-22) mỗi khi gửi mail cho khách hàng, tránh việc lộ mã.</p>
                            </div>
                        </div>
                    )}

                    {/* Số lượng phát hành giờ đây được chỉnh ở mỗi item, nên ta có thể bỏ phần Vô hạn ở step 2, hoặc giữ nguyên nhưng disable quantity field */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Chế độ phân bổ</label>
                        <p className="text-xs text-slate-500">
                            Trong gói đa quà tặng, với loại <strong className="text-amber-600">Dynamic</strong>, khi hệ thống sinh mã ngẫu nhiên sẽ phân phối ngẫu nhiên (hoặc theo tỷ lệ số lượng <strong className="text-slate-800">Của từng món quà</strong> bạn nhập ở bước 1).
                        </p>
                        {formData.codeType === 'static' && formData.rewards && formData.rewards.length > 1 && (
                            <p className="text-xs text-rose-500 font-bold bg-rose-50 p-2 rounded">Cảnh báo: Dùng mã tĩnh (VD: SUMMER26) cho một gói có NHIỀU món quà sẽ khiến mọi người nhập cùng 1 mã nhưng nhận phần quà chung! Đa quà tặng thường chỉ hiệu quả với mã Dynamic (Random Code).</p>
                        )}
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Thời hạn sử dụng</label>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                type="datetime-local"
                                label="Ngày bắt đầu (Optional)"
                                value={formData.startDate || ''}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                            <Input 
                                type="datetime-local"
                                label="Ngày kết thúc (Optional)"
                                value={formData.endDate || ''}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                        <div className="mt-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-2">
                            <Input 
                                type="number"
                                label="Hạn sử dụng sau khi nhận (Số ngày) - Tùy chọn"
                                placeholder="VD: 3 (Hết hạn sau 3 ngày kể từ khi lấy mã)"
                                value={formData.expirationDays || ''}
                                onChange={e => setFormData({ ...formData, expirationDays: e.target.value ? parseInt(e.target.value) : undefined })}
                            />
                            <p className="text-xs text-amber-700 font-medium">Khi khách hàng "Xí" mã thành công, hệ thống sẽ tự đếm ngược thời gian hết hạn riêng cho người đó. Bỏ trống nếu không áp dụng tính năng này.</p>
                        </div>
                    </div>
                </div>
            )}

            <Modal 
                isOpen={syncModeModalOpen} 
                onClose={() => setSyncModeModalOpen(false)}
                title="Thay đổi Kho Mã"
                size="md"
                footer={
                    <div className="flex justify-between w-full">
                        <Button variant="outline" onClick={() => setSyncModeModalOpen(false)}>Quay lại</Button>
                        <Button variant="primary" onClick={() => finalizeSave(syncMode)}>Tiếp tục Lưu</Button>
                    </div>
                }
            >
                <div className="space-y-4 text-sm text-slate-600">
                    <p>Bạn đang lưu những thay đổi vào Ưu đãi đã có sẵn. Bạn muốn cập nhật số lượng mã phân bổ như thế nào?</p>
                    
                    <div className="space-y-3 mt-4">
                        <label className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${syncMode === 'preserve' ? 'border-amber-600 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                            <input 
                                type="radio" 
                                name="syncMode" 
                                value="preserve" 
                                checked={syncMode === 'preserve'} 
                                onChange={() => setSyncMode('preserve')}
                                className="mt-1"
                            />
                            <div>
                                <h4 className="font-bold text-slate-800">Giữ nguyên Kho mã (Mặc định)</h4>
                                <p className="text-xs text-slate-500 line-height-relaxed mt-1">Chỉ lưu thông tin cấu hình thay đổi. Nếu thiếu mã, bạn sẽ tự vào Kho Mã ấn nút "Tạo thêm mã".</p>
                            </div>
                        </label>
                        
                        <label className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${syncMode === 'reset_unused' ? 'border-amber-600 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                            <input 
                                type="radio" 
                                name="syncMode" 
                                value="reset_unused" 
                                checked={syncMode === 'reset_unused'} 
                                onChange={() => setSyncMode('reset_unused')}
                                className="mt-1"
                            />
                            <div>
                                <h4 className="font-bold text-slate-800">Khởi tạo lại Kho mã Trống</h4>
                                <p className="text-xs text-rose-600 font-medium line-height-relaxed mt-1">Xoá toàn bộ các <strong className="underline">Mã chưa sử dụng</strong> và cài đặt lại từ đầu. Các mã đã phát cho khách hàng sẽ không bị ảnh hưởng.</p>
                            </div>
                        </label>
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

export default VoucherCampaignModal;
