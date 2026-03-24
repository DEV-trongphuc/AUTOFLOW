
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ZoomIn, ZoomOut, Move, Undo2, Redo2, Plus, Keyboard, Maximize, Minimize } from 'lucide-react';
import { Flow, FlowStep, FormDefinition } from '../../../types';
import FlowTree from '../builder/FlowTree';
import Modal from '../../common/Modal';
import ActiveFlowWarning from '../builder/ActiveFlowWarning';


interface FlowBuilderTabProps {
    flow: Flow;
    allFlows?: Flow[];
    allForms?: FormDefinition[];
    isViewMode?: boolean;
    onEditStep: (step: FlowStep) => void;
    onAddStep: (parentId: string, branch?: string, isInsert?: boolean) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onQuickAddWait?: (parentId: string, branch?: string) => void;
    onSwapSteps: (sourceId: string, targetId: string) => void;
    isReportMode?: boolean;
    realtimeDistribution?: Record<string, { count: number, avg_wait: number }>;
    onReportClick?: (stepId: string, type: string) => void;
}

const FlowBuilderTab: React.FC<FlowBuilderTabProps> = memo(({
    flow, allFlows = [], allForms = [], isViewMode = false,
    onEditStep, onAddStep,
    canUndo, canRedo, onUndo, onRedo,
    onQuickAddWait, onSwapSteps,
    isReportMode, realtimeDistribution, onReportClick
}) => {
    const [scale, setScale] = useState(1.0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // CSS-based Fullscreen State
    const [isFullscreen, setIsFullscreen] = useState(false);

    const transformRef = useRef({ scale: 1, x: 0, y: 0 });

    // Sync Ref with State for Event Handlers
    useEffect(() => {
        transformRef.current = { scale, x: position.x, y: position.y };
    }, [scale, position]);

    const performZoom = (delta: number, focusX: number, focusY: number) => {
        const { scale: currentScale, x: currentX, y: currentY } = transformRef.current;
        const nextScale = Math.min(Math.max(0.2, currentScale + delta), 2.0);

        // Optimization: Don't update if scale hits boundary
        if (nextScale === currentScale) return;

        const scaleRatio = nextScale / currentScale;

        // Focus Point logic: Point relative to container should remain stationary
        // point_screen = point_canvas * scale + translate
        // Solve for canvas: point_canvas = (point_screen - translate) / scale
        // Invariant: (point_screen - translate_new) / nextScale === (point_screen - translate_old) / currentScale

        // translate_new = point_screen - (point_screen - translate_old) * (nextScale / currentScale)

        const newX = focusX - (focusX - currentX) * scaleRatio;
        const newY = focusY - (focusY - currentY) * scaleRatio;

        // Optimistic Update for fast scrolling
        transformRef.current = { scale: nextScale, x: newX, y: newY };

        setScale(nextScale);
        setPosition({ x: newX, y: newY });
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const centerView = useCallback((targetScale: number = 1.0, attempt: number = 0) => {
        const trigger = flow.steps?.find(s => s.type === 'trigger');
        if (!trigger) return;

        const delays = [50, 120, 250, 500, 1000];
        const delay = delays[Math.min(attempt, delays.length - 1)];

        setTimeout(() => {
            const container = containerRef.current;
            const triggerEl = document.getElementById(`step-node-${trigger.id}`);

            if (!container || !triggerEl) {
                // DOM not ready yet — retry up to 5 times
                if (attempt < delays.length - 1) {
                    centerView(targetScale, attempt + 1);
                }
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const nodeRect = triggerEl.getBoundingClientRect();

            const currentPos = transformRef.current;

            const nodeCenterX = nodeRect.left + nodeRect.width / 2;
            const nodeCenterY = nodeRect.top + nodeRect.height / 2;

            const containerCenterX = containerRect.left + containerRect.width / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;

            const dx = containerCenterX - nodeCenterX;
            const dy = containerCenterY - nodeCenterY - 100;

            const newX = currentPos.x + dx;
            const newY = currentPos.y + dy;

            setScale(targetScale);
            setPosition({ x: newX, y: newY });

        }, delay);
    }, [flow.steps]);

    // Zoom to Center helper for Buttons
    const handleZoomCenter = (delta: number) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        performZoom(delta, rect.width / 2, rect.height / 2);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
                return;
            }
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                centerView(1.0);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                e.shiftKey ? onRedo?.() : onUndo?.();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                onRedo?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onUndo, onRedo, isFullscreen, centerView]);

    // Native Wheel Event Listener for Zoom at Cursor
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Fine-tuned delta
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                performZoom(delta, mouseX, mouseY);
            } else {
                // PANNING
                const { x, y } = transformRef.current;
                if (e.shiftKey) {
                    setPosition({ x: x - e.deltaY, y });
                } else {
                    setPosition({ x: x - e.deltaX, y: y - e.deltaY });
                }
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    useEffect(() => {
        // Reset position first so delta calculation starts from a clean state,
        // then center after a brief moment for DOM to update.
        setScale(1.0);
        setPosition({ x: 0, y: 0 });
        transformRef.current = { scale: 1, x: 0, y: 0 };
        centerView(1.0);
    }, [flow.id]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.flow-interactive')) return;

        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    const trigger = flow.steps?.find(s => s.type === 'trigger');

    return (
        <div
            ref={containerRef}
            // z-[140] puts it above sidebar/header (z-110) but below Modals (z-200)
            className={`w-full h-full overflow-hidden bg-[#f8fafc] select-none font-sans transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[140]' : 'relative'}`}
        >
            {/* Grid background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                    transform: `translate(${position.x % 24}px, ${position.y % 24}px)`
                }}
            />

            {/* Toolbar */}
            <div className="absolute bottom-6 left-6 z-50 flex gap-3">
                <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xl flex items-center gap-1 flow-interactive">
                    <button onClick={onUndo} disabled={!canUndo || isViewMode} title="Undo (Ctrl+Z)" className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
                    <button onClick={onRedo} disabled={!canRedo || isViewMode} title="Redo (Ctrl+Y)" className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={() => handleZoomCenter(-0.1)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-[10px] font-bold text-slate-400 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => handleZoomCenter(0.1)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><ZoomIn className="w-4 h-4" /></button>
                </div>
                <button
                    onClick={() => centerView(1.0)}
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-slate-500 hover:text-slate-800 flow-interactive transition-all active:scale-95"
                    title="Căn giữa kịch bản (Space)"
                >
                    <Move className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`bg-white p-3 rounded-xl border border-slate-200 shadow-xl flow-interactive transition-all active:scale-95 ${isFullscreen ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-500 hover:text-emerald-600'}`}
                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => setShowShortcuts(true)}
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-slate-500 hover:text-blue-500 flow-interactive transition-all active:scale-95"
                    title="Phím tắt & Hướng dẫn"
                >
                    <Keyboard className="w-4 h-4" />
                </button>
            </div>
            {/* Warning Banner for Active Flow */}
            <ActiveFlowWarning isActive={flow.status === 'active'} isViewMode={isViewMode} />

            {/* Shortcuts Modal */}
            <Modal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
                title="Hướng dẫn điều khiển"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Chuột (Mouse)</h4>
                        <div className="space-y-2 text-xs font-bold text-slate-700">
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span>Lăn chuột</span>
                                <span className="text-slate-400">Di chuyển lên / xuống</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span>Giữ <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Shift</kbd> + Lăn</span>
                                <span className="text-slate-400">Di chuyển trái / phải</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span>Giữ <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Ctrl</kbd> + Lăn</span>
                                <span className="text-slate-400">Phóng to / Thu nhỏ</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Bàn phím (Keyboard)</h4>
                        <div className="space-y-2 text-xs font-bold text-slate-700">
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Space</kbd></span>
                                <span className="text-slate-400">Căn giữa (Center View)</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Ctrl</kbd> + <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Z</kbd></span>
                                <span className="text-slate-400">Hoàn tác (Undo)</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Ctrl</kbd> + <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Y</kbd></span>
                                <span className="text-slate-400">Làm lại (Redo)</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <span><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Esc</kbd></span>
                                <span className="text-slate-400">Thoát toàn màn hình</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Canvas */}
            <div
                className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={wrapperRef}
                    className="relative w-fit h-fit min-w-full min-h-full transition-transform duration-100 origin-top-left will-change-transform pt-24 pb-[2000px] px-[2000px]"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
                    }}
                >
                    {trigger ? (
                        <FlowTree
                            stepId={trigger.id} flow={flow} allFlows={allFlows} allForms={allForms} isViewMode={isViewMode} onEditStep={onEditStep} onAddStep={onAddStep}
                            onQuickAddWait={onQuickAddWait || (() => { })} onSwapSteps={onSwapSteps || (() => { })}
                            draggedStepId={draggedStepId} setDraggedStepId={setDraggedStepId}
                            isReportMode={isReportMode} realtimeDistribution={realtimeDistribution} onReportClick={onReportClick}
                        />
                    ) : (
                        <div className="flex flex-col items-center mt-20 flow-interactive">
                            {!isViewMode && (
                                <button onClick={() => onAddStep('', 'yes')} className="w-32 h-32 rounded-full bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:scale-105 transition-all shadow-sm group">
                                    <div className="p-4 bg-slate-50 rounded-full group-hover:bg-emerald-50 transition-colors"><Plus className="w-8 h-8" /></div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Start Here</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default FlowBuilderTab;
