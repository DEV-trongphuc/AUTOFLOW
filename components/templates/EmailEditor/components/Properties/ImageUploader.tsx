// components/templates/EmailEditor/components/Properties/ImageUploader.tsx
import React, { useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import ImageLibraryModal from './ImageLibraryModal';

interface ImageUploaderProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    compact?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, value, onChange, compact }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className={compact ? "space-y-1" : "space-y-2"}>
            {!compact && (
                <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-[9px] font-bold text-amber-500 hover:text-amber-600 uppercase flex items-center gap-1 transition-colors"
                    >
                        <ImageIcon className="w-3 h-3" /> Mở thư viện
                    </button>
                </div>
            )}
            <div className="flex gap-2 items-center">
                {value && compact && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className={`flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] outline-none focus:border-amber-500 transition-all shadow-sm ${compact ? 'h-8' : ''}`}
                        placeholder={compact ? "Dán link ảnh..." : "https://..."}
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className={`bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all border border-slate-100 shadow-sm flex items-center justify-center shrink-0 ${compact ? 'w-8 h-8' : 'w-8 h-8 px-0'}`}
                        title="Upload / Chọn ảnh"
                    >
                        <Upload className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                    </button>
                </div>
            </div>
            
            {value && !compact && (
                <div className="w-full rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group flex items-center justify-center min-h-[96px]">
                    <img src={value} alt="Preview" className="w-full max-h-48 object-contain" />
                    <button 
                        onClick={() => onChange('')}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold"
                    >
                        Xóa ảnh
                    </button>
                </div>
            )}

            <ImageLibraryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={(url) => {
                    onChange(url);
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
};

export default ImageUploader;
