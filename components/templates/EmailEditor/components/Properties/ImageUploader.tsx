// components/templates/EmailEditor/components/Properties/ImageUploader.tsx
import React, { useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import ImageLibraryModal from './ImageLibraryModal';

interface ImageUploaderProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, value, onChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-[9px] font-bold text-emerald-500 hover:text-emerald-600 uppercase flex items-center gap-1 transition-colors"
                >
                    <ImageIcon className="w-3 h-3" /> Mở thư viện
                </button>
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500 transition-all shadow-sm"
                    placeholder="https://..."
                />
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-all border border-slate-100 shadow-sm"
                    title="Upload / Chọn ảnh"
                >
                    <Upload className="w-4 h-4" />
                </button>
            </div>

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
