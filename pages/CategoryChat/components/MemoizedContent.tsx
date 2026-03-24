import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';

interface MemoizedContentProps {
    content: string;
    role: string;
    messageId?: string;
    renderMarkdown: (text: string) => string;
    isCodeMode?: boolean;
    isCiteMode?: boolean;
    workspaceDocs?: any[];
}

const MemoizedContent = React.memo(({
    content,
    role,
    messageId,
    renderMarkdown,
    isCodeMode,
    isCiteMode,
    workspaceDocs = []
}: MemoizedContentProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter out markers from content display
    const cleanContent = useMemo(() => {
        if (!content) return '';
        // Remove code extraction markers when displaying
        return content.replace(/\[\[CODE_EXTRACTED_MARKER:(.+?)\]\]/g, '');
    }, [content]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Custom click handler for image previews and other interactive elements
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Handle image clicks (zoom preview)
            if (target.tagName === 'IMG' && target.classList.contains('cursor-zoom-in')) {
                const src = target.getAttribute('src');
                if (src && (window as any).__previewImage) {
                    (window as any).__previewImage(src);
                }
            }

            // Handle "..." options button — toggle overlay
            const optionsBtn = target.closest('.ai-img-options-btn') as HTMLElement | null;
            if (optionsBtn) {
                e.stopPropagation();
                const card = optionsBtn.closest('.ai-img-card') as HTMLElement | null;
                if (!card) return;
                const overlay = card.querySelector('.image-actions-overlay') as HTMLElement | null;
                if (!overlay) return;
                const isOpen = overlay.style.opacity === '1';
                // Close all other open overlays first
                container.querySelectorAll<HTMLElement>('.image-actions-overlay').forEach(o => {
                    o.style.opacity = '0';
                    o.style.pointerEvents = 'none';
                });
                if (!isOpen) {
                    overlay.style.opacity = '1';
                    overlay.style.pointerEvents = 'auto';
                }
                return;
            }

            // Close overlay when clicking outside it
            const clickedInsideOverlay = target.closest('.image-actions-overlay');
            if (!clickedInsideOverlay) {
                container.querySelectorAll<HTMLElement>('.image-actions-overlay').forEach(o => {
                    o.style.opacity = '0';
                    o.style.pointerEvents = 'none';
                });
            }

            // Handle action buttons inside overlay
            const imgOpen = target.closest('.ai-img-open') as HTMLElement | null;
            if (imgOpen) {
                e.stopPropagation();
                const card = imgOpen.closest('.ai-img-card') as HTMLElement | null;
                const encodedUrl = card?.getAttribute('data-imgurl');
                if (encodedUrl) window.open(decodeURIComponent(encodedUrl), '_blank');
                return;
            }

            const imgDelete = target.closest('.ai-img-delete') as HTMLElement | null;
            if (imgDelete) {
                e.stopPropagation();
                const card = imgDelete.closest('.ai-img-card') as HTMLElement | null;
                const encodedUrl = card?.getAttribute('data-imgurl');
                if (encodedUrl && (window as any).__deleteGalleryImage) {
                    (window as any).__deleteGalleryImage(decodeURIComponent(encodedUrl));
                }
                return;
            }

            const imgEdit = target.closest('.ai-img-edit') as HTMLElement | null;
            if (imgEdit) {
                e.stopPropagation();
                const card = imgEdit.closest('.ai-img-card') as HTMLElement | null;
                const encodedUrl = card?.getAttribute('data-imgurl');
                if (encodedUrl && (window as any).__editImage) {
                    (window as any).__editImage(decodeURIComponent(encodedUrl));
                }
                return;
            }

            // Handle document links
            if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('virtual://')) {
                const fileName = target.getAttribute('href')?.replace('virtual://', '');
                if (fileName && (window as any).__openWorkspaceFile) {
                    (window as any).__openWorkspaceFile(fileName);
                }
            }
        };

        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }); // re-run on every render to pick up new images

    return (
        <div
            ref={containerRef}
            dangerouslySetInnerHTML={{
                __html: role === 'assistant'
                    ? renderMarkdown(cleanContent).replace(/\[\[CODE_EXTRACTED_MARKER:(.+?)\]\]/g, (match, fileName) => `
                <div onclick="window.__openWorkspaceFile('${fileName}')" class="code-extracted-info cursor-pointer group flex items-center justify-between gap-3 p-2 bg-slate-900 border border-slate-700 rounded-xl my-1 text-slate-300 font-medium text-[11px] shadow-sm hover:shadow-md select-none transform hover:-translate-y-0.5 duration-200 max-w-sm">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <div class="h-6 w-6 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <span class="font-mono tracking-tight truncate">${fileName}</span>
                    </div>
                </div>
            `).replace(/\[Xem trang ([\d,\s-]+)\]/g, (match, pages) => {
                        if (isCiteMode) {
                            return `<span class="mf-citation-text cursor-pointer" onclick="window.__goToPDFPage('${pages}')" title="Click để xem trang này trong tài liệu">Trang ${pages}</span>`;
                        }
                        return '';
                    }).replace(/\[\[PDFPAGECIT:(\d+)\]\]/g, (match, page) => {
                        if (isCiteMode) {
                            return `<span class="mf-citation-text cursor-pointer" onclick="window.__goToPDFPage('${page}')" title="Click để xem trang này trong tài liệu">Trang ${page}</span>`;
                        }
                        return '';
                    })
                    : renderMarkdown(cleanContent)
            }}
        />
    );
});

export default MemoizedContent;
