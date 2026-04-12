
// components/templates/EmailEditor/components/Properties/ImageLibraryModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../../../common/Modal';
import Button from '../../../../common/Button';
import { Image as ImageIcon, Upload, Search, Trash2, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../../services/storageAdapter';

interface ImageLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (url: string) => void;
}

interface ImageFile {
    name: string;
    url: string;
    size: number;
    date: number;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImageCard = React.memo(({ 
    img, 
    isSelected, 
    isDeleteMode, 
    onToggleSelect, 
    onSelect,
    onClose
}: { 
    img: ImageFile, 
    isSelected: boolean, 
    isDeleteMode: boolean, 
    onToggleSelect: (url: string) => void, 
    onSelect?: (url: string) => void,
    onClose?: () => void
}) => {
    return (
        <div
            className={`group relative aspect-square bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer
                ${isSelected ? 'border-amber-600 ring-4 ring-amber-600/10' : 'border-slate-100 hover:border-amber-200'}
            `}
            onClick={() => {
                if (isDeleteMode) {
                    onToggleSelect(img.url);
                } else if (onSelect) {
                    onSelect(img.url);
                    if (onClose) onClose();
                }
            }}
        >
            <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            
            {/* Selection Overlay */}
            <div className={`absolute inset-0 bg-slate-900/60 transition-all duration-300 flex flex-col items-center justify-center p-3 text-center
                ${isDeleteMode || isSelected ? 'opacity-100' : 'opacity-0'}
            `}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 mb-2 shadow-lg
                    ${isSelected ? 'bg-amber-600 text-white scale-110' : 'bg-white/20 text-white border border-white/40'}
                `}>
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-white truncate w-full px-2 drop-shadow-md">{img.name}</p>
                <p className="text-[8px] font-bold text-white/60 uppercase tracking-tighter mt-1">{formatSize(img.size)}</p>
            </div>

            {/* Hover info badge */}
            {!isDeleteMode && !isSelected && (
                <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-slate-900/80 to-transparent">
                    <p className="text-[8px] font-black text-white uppercase truncate">{img.name}</p>
                </div>
            )}
        </div>
    );
});

const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        if (isOpen) {
            fetchImages();
            setSelectedUrls([]);
            setIsDeleteMode(false);
        }
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
                // Reset file input
                e.target.value = '';
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

    const handleDeleteSelected = async () => {
        if (selectedUrls.length === 0) return;
        
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedUrls.length} ảnh đã chọn?`)) {
            return;
        }

        setIsDeleting(true);
        try {
            // [NOTE] Assuming the API supports bulk delete or a single delete that we call multiple times
            // For now, let's assume we have a list_images delete and it takes an array or we loop.
            // In MailFlow project, usually it's one by one or a bulk endpoint.
            // Let's implement one-by-one for safety if no bulk endpoint is confirmed.
            const results = await Promise.all(selectedUrls.map(url => 
                api.post('delete_image', { url })
            ));
            
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
                toast.success(`Đã xóa ${successCount} ảnh`);
                fetchImages();
                setSelectedUrls([]);
            } else {
                toast.error('Xóa ảnh thất bại');
            }
        } catch (error) {
            toast.error('Lỗi khi xóa ảnh');
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelect = useCallback((url: string) => {
        setSelectedUrls(prev => 
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    }, []);

    const filteredImages = images.filter(img =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-amber-600" />
                    <span>Thư viện Hình ảnh</span>
                </div>
            }
            size="lg"
            footer={
                <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                        {isDeleteMode ? (
                            <>
                                <Button 
                                    variant="danger" 
                                    icon={Trash2} 
                                    onClick={handleDeleteSelected}
                                    disabled={selectedUrls.length === 0 || isDeleting}
                                    isLoading={isDeleting}
                                >
                                    Xóa {selectedUrls.length} ảnh
                                </Button>
                                <Button variant="ghost" icon={X} onClick={() => { setIsDeleteMode(false); setSelectedUrls([]); }}>Hủy</Button>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="image-library-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleUpload}
                                        disabled={uploading}
                                    />
                                    <Button
                                        variant="primary"
                                        icon={uploading ? undefined : Upload}
                                        onClick={() => document.getElementById('image-library-upload')?.click()}
                                        disabled={uploading}
                                        isLoading={uploading}
                                    >
                                        Upload ảnh
                                    </Button>
                                </div>
                                <Button 
                                    variant="secondary" 
                                    icon={Trash2} 
                                    onClick={() => setIsDeleteMode(true)}
                                    disabled={loading || images.length === 0}
                                >
                                    Quản lý / Xóa
                                </Button>
                            </>
                        )}
                    </div>
                    <Button variant="ghost" onClick={onClose}>Đóng thư viện</Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm hình ảnh theo tên..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-amber-600 focus:ring-4 focus:ring-amber-600/5 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-600 rounded-full animate-spin shadow-inner"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Đang quét kho dữ liệu...</p>
                    </div>
                ) : filteredImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <div className="p-6 bg-white rounded-3xl shadow-sm mb-6 border border-slate-100">
                            <ImageIcon className="w-10 h-10 text-slate-200" />
                        </div>
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Không có kết quả</h4>
                        <p className="text-[11px] text-slate-300 mt-1">Hãy thử tìm kiếm với tên khác hoặc upload ảnh mới.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredImages.map((img) => (
                            <ImageCard
                                key={img.url}
                                img={img}
                                isSelected={selectedUrls.includes(img.url)}
                                isDeleteMode={isDeleteMode}
                                onToggleSelect={toggleSelect}
                                onSelect={onSelect}
                                onClose={onClose}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageLibraryModal;
