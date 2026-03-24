
// components/templates/EmailEditor/components/Properties/ImageLibraryModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../../../../common/Modal';
import Button from '../../../../common/Button';
import { Image as ImageIcon, Upload, Search, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../../services/storageAdapter';

interface ImageLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

interface ImageFile {
    name: string;
    url: string;
    size: number;
    date: number;
}

const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await api.get<ImageFile[]>('list_images');
            if (res.success) {
                setImages(res.data);
            } else {
                toast.error(res.message || 'Không thể tải danh sách ảnh');
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
            toast.error('Lỗi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchImages();
    }, [isOpen]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post<any>('upload', formData);
            if (res.success) {
                toast.success('Upload ảnh thành công');
                fetchImages();
            } else {
                toast.error(res.message || 'Upload thất bại');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Lỗi upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    const filteredImages = images.filter(img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Thư viện hình ảnh"
            size="lg"
            footer={
                <div className="flex justify-between w-full">
                    <div className="relative">
                        <input
                            type="file"
                            id="image-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <Button
                            variant="primary"
                            icon={uploading ? undefined : Upload}
                            onClick={() => document.getElementById('image-upload')?.click()}
                            disabled={uploading}
                        >
                            {uploading ? 'Đang upload...' : 'Upload ảnh mới'}
                        </Button>
                    </div>
                    <Button variant="ghost" onClick={onClose}>Đóng</Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm ảnh..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải thư viện...</p>
                    </div>
                ) : filteredImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <ImageIcon className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-400">Không tìm thấy ảnh nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {filteredImages.map((img) => (
                            <div
                                key={img.url}
                                className="group relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:border-emerald-500 cursor-pointer transition-all shadow-sm hover:shadow-md"
                                onClick={() => onSelect(img.url)}
                            >
                                <img
                                    src={img.url}
                                    alt={img.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-white mb-2" />
                                    <p className="text-[10px] font-bold text-white truncate w-full px-2">{img.name}</p>
                                    <p className="text-[8px] text-slate-300">{formatSize(img.size)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageLibraryModal;
