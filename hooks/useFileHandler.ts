
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../services/storageAdapter';
import { FileAttachment, ChatbotInfo, User } from '../types';
import { uploadFileToServer } from '../pages/CategoryChat/utils';

interface UseFileHandlerProps {
    sessionId: string;
    activeBot: ChatbotInfo | null;
    remoteConvId: string | null;
    currentUser: User | null;
    isImageGenMode: boolean;
    setIsImageGenMode: (val: boolean) => void;
    setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    setWorkspaceDocs: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    setActiveDoc: (doc: FileAttachment | null) => void;
    setOpenTabNames: React.Dispatch<React.SetStateAction<string[]>>;
    isDocWorkspaceOpen: boolean;
    setIsDocWorkspaceOpen: (val: boolean) => void;
    viewMode: string;
    orgUser: any;
}

export const useFileHandler = ({
    sessionId,
    activeBot,
    remoteConvId,
    currentUser,
    isImageGenMode,
    setIsImageGenMode,
    setAttachments,
    setWorkspaceDocs,
    setActiveDoc,
    setOpenTabNames,
    isDocWorkspaceOpen,
    setIsDocWorkspaceOpen,
    viewMode,
    orgUser
}: UseFileHandlerProps) => {
    const [isDragging, setIsDragging] = useState(false);

    // --- HELPER: Upload to Workspace (FormData) ---
    const uploadToWorkspace = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (remoteConvId) formData.append('conversation_id', remoteConvId);
            if (activeBot?.id) formData.append('property_id', activeBot.id);
            if (orgUser?.id) formData.append('org_user_id', orgUser.id.toString());
            if (currentUser?.id) formData.append('user_id', currentUser.id.toString());

            const res = await api.post<any>('upload', formData);

            if (res.success && res.data?.url) {
                const newDoc: FileAttachment = {
                    id: res.data.id || `doc_${Date.now()}_${Math.random()}`,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    previewUrl: res.data.url,
                    source: 'workspace',
                    conversationId: remoteConvId || sessionId,
                    propertyId: activeBot?.id
                };
                return newDoc;
            } else {
                throw new Error(res.message || 'Upload failed');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Lỗi tải lên "${file.name}": ${error.message}`);
            return null;
        }
    }, [remoteConvId, activeBot?.id, sessionId]);

    // --- HANDLER: Chat Attachment Selection ---
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file: File) => {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`File "${file.name}" quá lớn (tối đa 10MB)`);
                return;
            }

            // Add placeholder IMMEDIATELY so user sees feedback right away
            const tempId = `att_${Date.now()}_${Math.random()}`;
            const placeholder: FileAttachment = {
                id: tempId,
                name: file.name,
                type: file.type,
                size: file.size,
                uploading: true
            };
            setAttachments(prev => [...prev, placeholder]);

            const reader = new FileReader();
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setAttachments(prev => prev.map(a =>
                        a.id === tempId ? { ...a, uploadProgress: progress } : a
                    ));
                }
            };
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setAttachments(prev => prev.map(a =>
                    a.id === tempId
                        ? { ...a, base64, previewUrl: base64, uploading: false, uploadProgress: 100 }
                        : a
                ));
                if (file.type.startsWith('image/') && !isImageGenMode) {
                    // Vision mode is handled by the model context, don't force UI mode change
                }
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    }, [isImageGenMode, setIsImageGenMode, setAttachments]);

    // --- HANDLER: Workspace Document Selection ---
    const handleDocFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (isImageGenMode) {
            toast.error('Vui lòng tắt Image Mode để tải lên tài liệu');
            e.target.value = '';
            return;
        }

        const uploadPromises = Array.from(files).map(async (file: File) => {
            if (file.size > 100 * 1024 * 1024) {
                toast.error(`File "${file.name}" quá lớn (tối đa 100MB)`);
                return null;
            }
            return await uploadToWorkspace(file);
        });

        const results = await Promise.all(uploadPromises);

        results.forEach(newDoc => {
            if (newDoc) {
                setWorkspaceDocs(prev => {
                    if (prev.some(d => d.name === newDoc.name)) {
                        toast.error(`File "${newDoc.name}" đã tồn tại trong workspace`);
                        return prev;
                    }
                    return [...prev, newDoc];
                });

                setIsDocWorkspaceOpen(true);
                setActiveDoc(newDoc);
                setOpenTabNames(prev => !prev.includes(newDoc.name) ? [...prev, newDoc.name] : prev);
                toast.success(`Đã tải lên: ${newDoc.name}`);
            }
        });

        e.target.value = '';
    }, [isImageGenMode, uploadToWorkspace, setWorkspaceDocs, setIsDocWorkspaceOpen, setActiveDoc, setOpenTabNames]);

    // --- DRAG & DROP ---
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const isWorkspaceDrop = isDocWorkspaceOpen && viewMode === 'chat';

        for (const file of files) {
            const maxSize = isWorkspaceDrop ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error(`File "${file.name}" quá lớn (tối đa ${maxSize / 1024 / 1024}MB)`);
                continue;
            }

            const isImage = file.type.startsWith('image/');

            if (isWorkspaceDrop && !isImageGenMode) {
                const newDoc = await uploadToWorkspace(file);
                if (newDoc) {
                    setWorkspaceDocs(prev => {
                        if (prev.some(d => d.name === newDoc.name)) {
                            toast.error(`File "${newDoc.name}" đã tồn tại`);
                            return prev;
                        }
                        return [...prev, newDoc];
                    });
                    setActiveDoc(newDoc);
                    setOpenTabNames(prev => prev.includes(newDoc.name) ? prev : [...prev, newDoc.name]);
                    toast.success(`Đã thêm: ${file.name}`);
                }
            } else {
                // Add placeholder immediately
                const tempId = `att_${Date.now()}_${Math.random()}`;
                setAttachments(prev => [...prev, {
                    id: tempId, name: file.name, type: file.type,
                    size: file.size, uploading: true
                }]);

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    setAttachments(prev => prev.map(a =>
                        a.id === tempId
                            ? { ...a, base64, previewUrl: base64, uploading: false }
                            : a
                    ));
                    if (isImage && !isImageGenMode) {
                        // Vision handles images automatically
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }, [isDocWorkspaceOpen, viewMode, isImageGenMode, uploadToWorkspace, setAttachments, setIsImageGenMode, setWorkspaceDocs, setActiveDoc, setOpenTabNames]);

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const tempId = `att_${Date.now()}_${Math.random()}`;
                    const fileName = file.name || `pasted_image_${Date.now()}.png`;

                    // ✅ Add placeholder card IMMEDIATELY — user sees it right away
                    setAttachments(prev => [...prev, {
                        id: tempId,
                        name: fileName,
                        type: file.type || 'image/png',
                        size: file.size,
                        uploading: true,
                        uploadProgress: 0
                    }]);
                    // Vision handles pasted images automatically, don't force Gen Mode
                    e.preventDefault();

                    const reader = new FileReader();
                    reader.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const progress = Math.round((event.loaded / event.total) * 100);
                            setAttachments(prev => prev.map(a =>
                                a.id === tempId ? { ...a, uploadProgress: progress } : a
                            ));
                        }
                    };
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        // Replace placeholder with real data
                        setAttachments(prev => prev.map(a =>
                            a.id === tempId
                                ? { ...a, base64, previewUrl: base64, uploading: false, uploadProgress: 100 }
                                : a
                        ));
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    }, [setAttachments, setIsImageGenMode]);

    return {
        isDragging,
        handleFileSelect,
        handleDocFileSelect,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handlePaste
    };
};
