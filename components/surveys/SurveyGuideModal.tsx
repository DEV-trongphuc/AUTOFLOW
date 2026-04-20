import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Lightbulb, MousePointerClick, MessageSquareText, PenTool, Link2, Sparkles, Navigation2 } from 'lucide-react';

interface SurveyGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SurveyGuideModal: React.FC<SurveyGuideModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);

    const steps = [
        {
            icon: <PenTool className="w-8 h-8 text-amber-500" />,
            title: "Trải nghiệm Tùy biến Không giới hạn",
            description: "Thêm logo, sửa màu sắc thương hiệu, tải ảnh nền và điều chỉnh từng khối khảo sát trực tiếp (Kéo - Thả) với thanh công cụ bên trái.",
            image: "/imgs/ks.png"
        },
        {
            icon: <Link2 className="w-8 h-8 text-blue-500" />,
            title: "Tích hợp và Xuất bản Bất cứ đâu",
            description: "Sau khi thiết kế xong, lấy link gốc để chia sẻ qua Email, SMS hoặc Zalo. Hệ thống sẽ tự động bắt ID khách hàng (uid) để theo dõi kết quả chuẩn xác.",
            image: "/imgs/ks2.png"
        },
        {
            icon: <Sparkles className="w-8 h-8 text-emerald-500" />,
            title: "Kích hoạt Kịch bản (Automation Flow)",
            description: "Khảo sát có thể trở thành điểm chạm đầu tiên! Tự động gắn tag, phân luồng khách hàng hoặc gửi Email cảm ơn ngay lập tức khi họ nộp phản hồi.",
            image: "/imgs/ks3.png"
        }
    ];

    const currentStep = steps[step - 1];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" noPadding>
            <div className="flex flex-col md:flex-row min-h-[460px] bg-white rounded-[32px] overflow-hidden">
                {/* Left panel */}
                <div className="w-full md:w-2/5 bg-slate-50 p-8 flex flex-col border-r border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-6 shrink-0">
                        <Lightbulb className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 tracking-tight">
                        Kiến tạo Khảo sát, <br />Thấu hiểu Khách hàng
                    </h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Chỉ với 3 bước cơ bản, bạn có thể thiết lập hệ thống thu thập phản hồi chuyên nghiệp và mượt mà.
                    </p>

                    <div className="mt-auto space-y-4">
                        {steps.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => setStep(idx + 1)}
                                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all ${
                                    step === idx + 1 
                                        ? 'bg-white shadow-sm border border-slate-200 ring-2 ring-transparent' 
                                        : 'hover:bg-slate-100/50 text-slate-400 border border-transparent'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                    step === idx + 1 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </div>
                                <span className={`text-xs font-bold leading-tight ${step === idx + 1 ? 'text-slate-800' : ''}`}>
                                    {s.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right panel */}
                <div className="w-full md:w-3/5 p-8 flex flex-col relative overflow-hidden bg-white">
                    {/* Background blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-60"></div>
                    
                    <div className="relative flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 key={step}">
                        <div className="mb-6">
                            {currentStep.icon}
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 mb-3">{currentStep.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mb-6">
                            {currentStep.description}
                        </p>
                        
                        {/* Mock Image Placeholder */}
                        <div className="mt-auto w-full rounded-2xl border border-slate-200 overflow-hidden shadow-lg shadow-slate-200/50 bg-slate-100 flex items-center justify-center min-h-[200px] relative">
                            {currentStep.image ? (
                                <img src={currentStep.image} alt="Feature preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Illustration</span>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex gap-2 z-10">
                        {step < steps.length ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                Xem tiếp <Navigation2 className="w-3.5 h-3.5 rotate-90" />
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 transition-all hover:scale-105"
                            >
                                Bắt đầu ngay!
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SurveyGuideModal;
