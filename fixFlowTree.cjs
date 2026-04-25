const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/flows/builder/FlowTree.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useCallback, useMemo to imports
content = content.replace(
    "import React, { memo, useState, useRef } from 'react';",
    "import React, { memo, useState, useRef, useCallback, useMemo } from 'react';"
);

// 2. Change pathIds?: Set<string> to pathIds?: string
content = content.replace("pathIds?: Set<string>;", "pathIds?: string;");

// 3. Rename FlowTree to FlowTreeInner and fix defaults
const compStartStr = 'const FlowTree: React.FC<FlowTreeProps> = memo(({';
let parts = content.split(compStartStr);

let innerStr = `const FlowTreeInner = memo(({
    step, nextPathIds,
    stepId, parentId, parentType, branch,
    flow, allFlows, allForms = [], isViewMode = false, draggedStepId,
    onEditStep, onAddStep, onQuickAddWait, onSwapSteps, setDraggedStepId,
    depth = 0, pathIds = '', hasPendingEmail = false,
    isReportMode, realtimeDistribution, onReportClick
}: any) => {`;

let innerBody = parts[1];

// Remove the `depth = 0, pathIds = new Set<string>()...` parameter part
const arrowIndex = innerBody.indexOf('}) => {');
innerBody = innerBody.substring(arrowIndex + 7);

const removeStart = innerBody.indexOf('    if (!stepId) return null;');
const removeEnd = innerBody.indexOf("    const isCondition = step.type === 'condition';");

innerBody = innerBody.substring(0, removeStart) + innerBody.substring(removeEnd);

const commonPropsMatch = innerBody.match(/const commonProps = \{[\s\S]*?    \};\n/);
if (commonPropsMatch) {
    const hooksStr = `
    const handleNodeClick = useCallback(() => {
        return isReportMode ? onReportClick?.(step.id, step.type) : onEditStep(step);
    }, [isReportMode, onReportClick, onEditStep, step.id, step.type, step]);

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

    const commonProps = useMemo(() => ({
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
`;
    innerBody = innerBody.replace(commonPropsMatch[0], hooksStr);
}

innerBody = innerBody.replace('pathIds: nextPathIds', 'pathIds: nextPathIds');

const wrapperStr = `
const FlowTree: React.FC<FlowTreeProps> = memo((props) => {
    const { stepId, flow, depth = 0, pathIds = '' } = props;
    if (!stepId) return null;
    const steps = flow.steps || [];
    const step = steps.find((s: any) => s.id === stepId);
    if (!step) return null;

    if (depth >= 50 || pathIds.includes(stepId)) {
        const isActuallyLoop = pathIds.includes(stepId);
        return (
            <div className="flex flex-col items-center">
                <StraightConnector height={40} isError={true} />
                <GhostNode label={isActuallyLoop ? "Cáº¢NH BÃO: VÃ²ng láº·p phÃ¡t hiá»‡n" : "Cáº¢NH BÃO: QuÃ¡ táº£i Ä‘á»™ sÃ¢u"} />
                <div className="text-[9px] text-rose-500 font-bold mt-1">
                    {isActuallyLoop ? \`BÆ°á»›c nÃ y káº¿t ná»‘i ngÆ°á»£c láº¡i bÆ°á»›c [\${step.label}]\` : "Ká»‹ch báº£n quÃ¡ nÃ³ng hoáº·c quÃ¡ sÃ¢u"}
                </div>
            </div>
        );
    }

    const nextPathIds = pathIds ? \`\${pathIds},\${stepId}\` : stepId;
    return <FlowTreeInner {...props} step={step} nextPathIds={nextPathIds} />;
});

export default FlowTree;
`;

innerBody = innerBody.replace('export default FlowTree;', wrapperStr);

const finalContent = parts[0] + innerStr + innerBody;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Done!');

