const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/flows/builder/FlowTree.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We need to add useCallback to the imports if not present
if (!content.includes('useCallback')) {
    content = content.replace('import React, { memo, useState, useRef } from', 'import React, { memo, useState, useRef, useCallback } from');
}

// Replace the commonProps object with useMemo
const commonPropsRegex = /const commonProps = \{([\s\S]*?)    \};\n\n    const nextProps/m;
const match = content.match(commonPropsRegex);

if (match) {
    const replacement = 
    const handleNodeClick = useCallback(() => isReportMode ? onReportClick?.(step.id, step.type) : onEditStep(step), [isReportMode, onReportClick, onEditStep, step]);
    const handleDragStart = useCallback((e: React.DragEvent) => {
        if (step.type === 'trigger' || isViewMode) return;
        setDraggedStepId(step.id);
        e.dataTransfer.setData('text/plain', step.id);
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation();
    }, [step.type, step.id, isViewMode, setDraggedStepId]);
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        if (draggedStepId && draggedStepId !== step.id && !isViewMode) {
            e.preventDefault();
            dragEnterCount.current += 1;
            if (dragEnterCount.current === 1) setIsDragHovering(true);
        }
    }, [draggedStepId, step.id, isViewMode]);
    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (draggedStepId && draggedStepId !== step.id && !isViewMode) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }, [draggedStepId, step.id, isViewMode]);
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (draggedStepId && !isViewMode) {
            dragEnterCount.current -= 1;
            if (dragEnterCount.current <= 0) {
                dragEnterCount.current = 0;
                setIsDragHovering(false);
            }
        }
    }, [draggedStepId, isViewMode]);
    const handleDrop = useCallback((e: React.DragEvent) => {
        if (isViewMode) return;
        e.preventDefault();
        e.stopPropagation();
        dragEnterCount.current = 0;
        setIsDragHovering(false);
        const sourceId = e.dataTransfer.getData('text/plain');
        if (sourceId && sourceId !== step.id) {
            onSwapSteps(sourceId, step.id);
            setDraggedStepId(null);
        }
    }, [isViewMode, step.id, onSwapSteps, setDraggedStepId]);

    const commonProps = React.useMemo(() => ({
        step,
        isDraggable: step.type !== 'trigger' && !isViewMode,
        isDragTarget: isDragHovering,
        hasError: hasSpamError,
        hasWarning,
        isViewMode,
        allForms,
        isReportMode,
        reportStats,
        onClick: handleNodeClick,
        onDragStart: handleDragStart,
        onDragEnter: handleDragEnter,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop
    }), [
        step, isDragHovering, hasSpamError, hasWarning, isViewMode, allForms, isReportMode, reportStats,
        handleNodeClick, handleDragStart, handleDragEnter, handleDragOver, handleDragLeave, handleDrop
    ]);

    const nextProps;

    content = content.replace(commonPropsRegex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
}
