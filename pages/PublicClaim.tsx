import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Gift, CheckCircle2, AlertCircle, ArrowRight, Scan, ShieldCheck } from 'lucide-react';
import { EXTERNAL_API_BASE } from '../utils/config';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const PUBLIC_API = `${EXTERNAL_API_BASE}/voucher_claim.php`;

export const PublicClaim: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [campaign, setCampaign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null); // { status, code, message }

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        if (!id) return;
        fetch(`${PUBLIC_API}?action=info&id=${id}`)
            .then(r => r.json())
            .then(res => {
                if (res.success) setCampaign(res.data);
                else setCampaign(null);
                setLoading(false);
            }).catch(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email) {
            toast.error('Vui lòng nhập Email hợp lệ!');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${PUBLIC_API}?action=claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voucher_id: id,
                    ...formData
                })
            }).then(r => r.json());

            if (res.success) {
                // Determine if code is returned directly or pending (future proof)
                const finalResult = {
                    status: res.code ? 'approved' : 'pending',
                    code: res.code || (res.data ? res.data.code : undefined)
                };
                setResult(finalResult);
            } else {
                toast.error(res.message || 'Có lỗi xảy ra.');
            }
        } catch (error) {
            toast.error('Máy chủ không phản hồi.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-bold animate-pulse">Đang tải...</p></div>;
    }

    if (!campaign) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-xl font-black text-slate-800">Không tìm thấy Ưu đãi</h1>
                <p className="text-sm text-slate-500 mt-2">Đường dẫn không hợp lệ hoặc chiến dịch đã tạm dừng.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-orange-50 to-rose-50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-200/40 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-200/40 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none" />

            <div className="max-w-md w-full bg-white/60 backdrop-blur-3xl border border-white rounded-[40px] shadow-2xl p-10 relative z-10 transition-all overflow-hidden duration-700">
                
                {result ? (
                    <div className="text-center animate-in zoom-in-95 duration-500 py-8">
                        {result.status === 'pending' ? (
                            <>
                                <div className="w-24 h-24 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <ShieldCheck className="w-12 h-12 text-amber-600" />
                                    <span className="absolute top-0 right-0 w-6 h-6 bg-amber-400 rounded-full animate-ping opacity-20"></span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-3">Đã gửi yêu cầu nhận Mã!</h2>
                                <p className="text-sm text-slate-600 mb-6 font-medium">Yêu cầu của bạn đang được duyệt. Mã ưu đãi sẽ được gửi qua Email <strong className="text-slate-800">{formData.email}</strong> nếu đủ điều kiện.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Chúc mừng bạn!</h2>
                                <p className="text-sm text-slate-500 mb-6 font-medium">Bạn đã nhận ưu đãi thành công. Đây là mã của bạn:</p>

                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 mb-8 relative">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 absolute top-2 left-1/2 transform -translate-x-1/2 bg-slate-50 px-3">Mã giảm giá</span>
                                    <p className="text-3xl font-black text-amber-600 tracking-wider mt-2 font-mono select-all">
                                        {result.code}
                                    </p>
                                </div>

                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Đã gửi 1 bản sao vào Email của bạn.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-white shadow-xl rounded-full flex items-center justify-center mx-auto mb-6 transform -rotate-12 border border-slate-100">
                                {campaign.thumbnail_url ? (
                                    <img src={campaign.thumbnail_url} className="w-full h-full object-cover rounded-full" alt="Gift" />
                                ) : (
                                    <Gift className="w-8 h-8 text-rose-500" />
                                )}
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                                {campaign.name}
                            </h1>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                {campaign.description || 'Vui lòng cung cấp thông tin để xác nhận danh tính và nhận ngay ưu đãi từ chương trình.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input 
                                label="Họ và Tên" 
                                placeholder="Nhập tên của bạn" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="bg-white/80" 
                            />
                            <Input 
                                label="Địa chỉ Email *" 
                                type="email"
                                placeholder="Cần chính xác để nhận mã" 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                className="bg-white/80" 
                                required
                            />
                            <Input 
                                label="Số điện thoại" 
                                type="tel"
                                placeholder="0901234567" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                className="bg-white/80" 
                            />

                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="w-full mt-6 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Scan className="w-5 h-5 animate-spin" /> : 'Nhận Mã Ngay'} 
                                {!submitting && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>
            
            <p className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Secured by MailFlow Anti-Fraud &trade;
            </p>
        </div>
    );
};

export default PublicClaim;
