import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Copy, Code, Terminal, Mail, CheckCircle2 } from 'lucide-react';
import { VoucherCampaign } from '../../types';
import toast from 'react-hot-toast';
import { api } from '../../services/storageAdapter';

interface VoucherApiEmbedModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: VoucherCampaign;
}

const VoucherApiEmbedModal: React.FC<VoucherApiEmbedModalProps> = ({ isOpen, onClose, campaign }) => {
    
    const rootUrl = typeof window !== 'undefined' ? window.location.origin : 'https://automation.ideas.edu.vn';
    const apiLink = `${rootUrl}/api/voucher_claim.php?campaign_id=${campaign.id}&email=khachhang@gmail.com&event=voucher_claimed`;
    
    const shortcode = `[VOUCHER_${campaign.id}]`;

    const htmlEmbed = `<!-- DOMATION VOUCHER FORM -->
<form action="${rootUrl}/api/voucher_claim.php" method="POST" style="max-width: 400px; margin: auto; padding: 20px; font-family: sans-serif; border: 1px solid #ccc; border-radius: 8px;">
    <h3 style="margin-top:0;">Nhận Ưu Đãi: ${campaign.name}</h3>
    <input type="hidden" name="campaign_id" value="${campaign.id}">
    <input type="hidden" name="event" value="voucher_claimed">
    <input type="hidden" name="redirect_success" value="https://thanh-cong.com">
    <div style="margin-bottom: 15px;">
        <label style="display:block; margin-bottom:5px;">Email của bạn:</label>
        <input type="email" name="email" required style="width: 100%; padding: 8px; box-sizing: border-box;">
    </div>
    <button type="submit" style="width: 100%; padding: 10px; background: #ea580c; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
        Nhận Mã Ngay
    </button>
</form>`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Đã Copy thành công!');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 text-slate-800">
                    <Code className="w-5 h-5 text-indigo-600" />
                    Bí kíp Tích hợp: {campaign.name}
                </div>
            }
            size="lg"
            footer={
                <div className="flex justify-end w-full">
                    <Button onClick={onClose} variant="primary">Đóng</Button>
                </div>
            }
        >
            <div className="space-y-6">
                
                {/* 1. Email Shortcode */}
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-emerald-600" /> 1. Mã nhúng Email (Shortcode)
                    </h4>
                    <p className="text-xs text-slate-600">Dán mã này vào bất cứ đâu trong Nội dung Email của DOMATION, hoặc gán vào Nút Bấm. Nó sẽ tự động biến thành 1 mã Voucher thực tế khi gửi.</p>
                    <div className="flex bg-orange-50/50 border border-orange-200 rounded-lg p-1 items-center">
                        <code className="text-sm font-bold text-orange-600 px-3 flex-1">{shortcode}</code>
                        <Button variant="ghost" size="sm" icon={Copy} className="text-orange-600 hover:bg-orange-100" onClick={() => copyToClipboard(shortcode)}>Copy</Button>
                    </div>
                </div>

                {/* 2. API Endpoint */}
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-orange-600" /> 2. Gọi API Cấp Mã (Web / Minigame)
                    </h4>
                    <p className="text-xs text-slate-600">Gửi đường link này cho Đội Dev. Chỉ cần gọi GET/POST là hệ thống tự lấy SĐT/Email để Upsert khách hàng và nhả Mã về dạng JSON hoặc HTTP Redirect.</p>
                    <div className="flex bg-slate-900 rounded-lg p-1 items-center shadow-inner">
                        <code className="text-[11px] font-mono text-orange-400 px-3 py-2 flex-1 break-all">{apiLink}</code>
                        <Button variant="custom" className="text-white hover:bg-slate-800 mx-1 px-3 py-1.5 rounded-md" size="sm" icon={Copy} onClick={() => copyToClipboard(apiLink)}>Copy</Button>
                    </div>
                </div>

                {/* 3. HTML Form */}
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-600" /> 3. Mã HTML Website (Copy & Paste lộ trình ăn liền)
                    </h4>
                    <p className="text-xs text-slate-600">Dành cho người không biết Code. Chỉ cần dán nguyên khối HTML này vào Landing Page (Wordpress/LadiPage...), bạn lập tức có ngay 1 Form thu thập Email tặng mã Voucher.</p>
                    <div className="relative">
                        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-[10px] font-mono text-orange-400/90 overflow-x-auto shadow-xl">
                            {htmlEmbed}
                        </pre>
                        <Button 
                            variant="custom" 
                            size="sm" 
                            className="absolute top-2 right-2 bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                            icon={Copy} 
                            onClick={() => copyToClipboard(htmlEmbed)}
                        >
                            Copy HTML
                        </Button>
                    </div>
                </div>

            </div>
        </Modal>
    );
};

export default VoucherApiEmbedModal;
