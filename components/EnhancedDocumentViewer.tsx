import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getDocument } from 'pdfjs-dist';
import {
    FileText, Search, Copy, Download, Maximize2, Minimize2,
    ZoomIn, ZoomOut, RotateCw, Highlighter, MessageSquare,
    BookOpen, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import InputModal from './common/InputModal';

interface DocumentViewerProps {
    file: {
        name: string;
        type: string;
        previewUrl?: string;
        base64?: string;
        content?: string;
    };
    onClose: () => void;
    onAskAI?: (question: string, context?: string) => void;
}

export const EnhancedDocumentViewer: React.FC<DocumentViewerProps> = ({ file, onClose, onAskAI }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlights, setHighlights] = useState<string[]>([]);
    const [zoom, setZoom] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedText, setSelectedText] = useState('');
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [showAskAIModal, setShowAskAIModal] = useState(false);
    const [tableData, setTableData] = useState<any[][] | null>(null);
    const [pdfPages, setPdfPages] = useState<string[]>([]);

    // Enhanced DOC/DOCX reader with better error handling
    const readDocFile = useCallback(async (arrayBuffer: ArrayBuffer) => {
        try {
            const result = await mammoth.convertToHtml({ arrayBuffer });

            if (result.messages.length > 0) {
                console.warn('Mammoth warnings:', result.messages);
            }

            setContent(result.value);

            // Extract plain text for AI interactions
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = result.value;
            return tempDiv.textContent || tempDiv.innerText || '';
        } catch (err: any) {
            // Fallback: Try to extract raw text
            try {
                const decoder = new TextDecoder('utf-8');
                const text = decoder.decode(arrayBuffer);
                // Remove binary junk, keep readable text
                const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, '').trim();
                setContent(`<pre>${cleaned}</pre>`);
                return cleaned;
            } catch {
                throw new Error('Không thể đọc file DOC. Vui lòng chuyển sang DOCX hoặc PDF.');
            }
        }
    }, []);

    // Enhanced PDF reader with page-by-page rendering
    const readPdfFile = useCallback(async (arrayBuffer: ArrayBuffer) => {
        try {
            const loadingTask = getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            setTotalPages(pdf.numPages);

            const pages: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                pages.push(pageText);
            }

            setPdfPages(pages);
            setContent(pages.join('\n\n--- Page Break ---\n\n'));
            return pages.join('\n');
        } catch (err) {
            throw new Error('Lỗi đọc PDF: ' + (err as Error).message);
        }
    }, []);

    // Excel/CSV reader
    const readSpreadsheet = useCallback(async (arrayBuffer: ArrayBuffer, isCSV = false) => {
        try {
            let data: any[][];

            if (isCSV) {
                const text = new TextDecoder().decode(arrayBuffer);
                const parsed = Papa.parse(text, { header: false });
                data = parsed.data as any[][];
            } else {
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
            }

            setTableData(data);

            // Convert to text for AI
            const textContent = data.map(row => row.join('\t')).join('\n');
            setContent(textContent);
            return textContent;
        } catch (err) {
            throw new Error('Lỗi đọc spreadsheet: ' + (err as Error).message);
        }
    }, []);

    // Load document
    useEffect(() => {
        const loadDocument = async () => {
            setLoading(true);
            setError(null);

            try {
                let arrayBuffer: ArrayBuffer;

                if (file.base64) {
                    const base64Data = file.base64.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    arrayBuffer = bytes.buffer;
                } else if (file.previewUrl) {
                    const response = await fetch(file.previewUrl);
                    arrayBuffer = await response.arrayBuffer();
                } else if (file.content) {
                    setContent(file.content);
                    setLoading(false);
                    return;
                } else {
                    throw new Error('No file data available');
                }

                const type = file.type.toLowerCase();

                if (type.includes('word') || type.includes('document') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                    await readDocFile(arrayBuffer);
                } else if (type.includes('pdf')) {
                    await readPdfFile(arrayBuffer);
                } else if (type.includes('sheet') || type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    await readSpreadsheet(arrayBuffer, false);
                } else if (type.includes('csv')) {
                    await readSpreadsheet(arrayBuffer, true);
                } else if (type.includes('text') || type.includes('plain')) {
                    const text = new TextDecoder().decode(arrayBuffer);
                    setContent(text);
                } else {
                    throw new Error('Unsupported file type');
                }

                setLoading(false);
            } catch (err: any) {
                console.error('Document load error:', err);
                setError(err.message || 'Failed to load document');
                setLoading(false);
            }
        };

        loadDocument();
    }, [file, readDocFile, readPdfFile, readSpreadsheet]);

    // Search and highlight
    const handleSearch = useCallback(() => {
        if (!searchTerm.trim()) {
            setHighlights([]);
            return;
        }

        const regex = new RegExp(searchTerm, 'gi');
        const matches = content.match(regex) || [];
        setHighlights(matches);
        toast.success(`Tìm thấy ${matches.length} kết quả`);
    }, [searchTerm, content]);

    // Copy content
    const handleCopy = useCallback(() => {
        const textToCopy = selectedText || content;
        navigator.clipboard.writeText(textToCopy);
        toast.success('Đã sao chép!');
    }, [selectedText, content]);

    // Ask AI about selection
    const handleAskAI = useCallback(() => {
        if (!onAskAI) return;
        setShowAskAIModal(true);
    }, [onAskAI]);

    const confirmAskAI = useCallback((question: string) => {
        if (!question.trim()) return;
        const context = selectedText || content.substring(0, 2000);
        onAskAI?.(question, context);
        setShowAIPanel(true);
    }, [selectedText, content, onAskAI]);

    // Text selection handler
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải tài liệu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                    <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Lỗi đọc tài liệu</h3>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90">
                        Đóng
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b bg-slate-50">
                <div className="flex-1 flex items-center gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Tìm kiếm trong tài liệu..."
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <button onClick={handleSearch} className="p-2 hover:bg-slate-200 rounded-lg">
                        <Search className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1 border-l pl-2">
                    <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-2 hover:bg-slate-200 rounded-lg" title="Zoom out">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium px-2">{zoom}%</span>
                    <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-2 hover:bg-slate-200 rounded-lg" title="Zoom in">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1 border-l pl-2">
                    <button onClick={handleCopy} className="p-2 hover:bg-slate-200 rounded-lg" title="Copy">
                        <Copy className="w-4 h-4" />
                    </button>
                    {onAskAI && (
                        <button onClick={handleAskAI} className="p-2 hover:bg-slate-200 rounded-lg bg-brand/10 text-brand" title="Hỏi AI">
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2 border-l pl-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div
                className="flex-1 overflow-auto p-6"
                style={{ fontSize: `${zoom}%` }}
                onMouseUp={handleTextSelection}
            >
                {tableData ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border">
                            <tbody>
                                {tableData.map((row, i) => (
                                    <tr key={i} className={i === 0 ? 'bg-slate-100 font-bold' : ''}>
                                        {row.map((cell, j) => (
                                            <td key={j} className="border px-3 py-2 text-sm">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                )}
            </div>

            {/* Selection Actions */}
            {selectedText && (
                <div className="fixed bottom-4 right-4 bg-slate-900 text-white rounded-lg shadow-2xl p-3 flex items-center gap-2 animate-in slide-in-from-bottom">
                    <span className="text-xs font-medium">Đã chọn {selectedText.length} ký tự</span>
                    <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg">
                        <Copy className="w-4 h-4" />
                    </button>
                    {onAskAI && (
                        <button onClick={handleAskAI} className="p-2 hover:bg-white/10 rounded-lg bg-brand">
                            <MessageSquare className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
            {/* Modal for Asking AI */}
            <InputModal
                isOpen={showAskAIModal}
                onClose={() => setShowAskAIModal(false)}
                onConfirm={confirmAskAI}
                title="Hỏi AI về tài liệu"
                message="AI sẽ trả lời dựa trên nội dung tài liệu hoặc đoạn văn bản bạn đã chọn."
                placeholder="Nhập câu hỏi của bạn..."
                confirmLabel="Gửi câu hỏi"
            />
        </div>
    );
};

export default React.memo(EnhancedDocumentViewer);
