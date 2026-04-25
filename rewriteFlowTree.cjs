const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/flows/builder/FlowTree.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the component definition
const startStr = "const FlowTree: React.FC<FlowTreeProps> = memo(({";
const contentParts = content.split(startStr);

// We keep the top part (imports, interfaces)
let newContent = contentParts[0];

// Define FlowTreeContent and FlowTree
// I will just use string replacement on the parameters since they are the same

const innerStart = const FlowTreeContent = memo(({
    step, nextPathIds, stepId, parentId, parentType, branch,
    flow, allFlows, allForms, isViewMode, draggedStepId,
    onEditStep, onAddStep, onQuickAddWait, onSwapSteps, setDraggedStepId,
    depth, pathIds, hasPendingEmail,
    isReportMode, realtimeDistribution, onReportClick,
    isDragHovering, setIsDragHovering, dragEnterCount
}: any) => {;

// Replace if (!stepId) return null; up to // Add current ID to path for children with nothing since we handle it in wrapper
const wrapperStr = 
const FlowTree: React.FC<FlowTreeProps> = memo((props) => {
    const { stepId, flow, depth = 0, pathIds = '' } = props;
    if (!stepId) return null;
    const steps = flow.steps || [];
    const step = steps.find(s => s.id === stepId);
    if (!step) return null;

    if (depth >= 50 || pathIds.includes(stepId)) {
        const isActuallyLoop = pathIds.includes(stepId);
        return (
            <div className="flex flex-col items-center">
                <StraightConnector height={40} isError={true} />
                <GhostNode label={isActuallyLoop ? "CẢNH BÁO: Vòng lặp phát hiện" : "CẢNH BÁO: Quá tải độ sâu"} />
                <div className="text-[9px] text-rose-500 font-bold mt-1">
                    {isActuallyLoop ? \Bước này kết nối ngược lại bước [\]\ : "Kịch bản quá nóng hoặc quá sâu"}
                </div>
            </div>
        );
    }

    const nextPathIds = pathIds ? \\,\\ : stepId;
    
    return <FlowTreeInner {...props} step={step} nextPathIds={nextPathIds} />;
});

const FlowTreeInner = memo(({
    step, nextPathIds,
    stepId, parentId, parentType, branch,
    flow, allFlows, allForms = [], isViewMode = false, draggedStepId,
    onEditStep, onAddStep, onQuickAddWait, onSwapSteps, setDraggedStepId,
    depth = 0, pathIds = '', hasPendingEmail = false,
    isReportMode, realtimeDistribution, onReportClick
}: any) => {
    const [isDragHovering, setIsDragHovering] = useState(false);
    const dragEnterCount = useRef(0);
;

// Find the rest of the component starting from const isCondition
const conditionIndex = contentParts[1].indexOf('const isCondition = step.type');
const restOfComponent = contentParts[1].substring(conditionIndex);

newContent += wrapperStr + restOfComponent;

fs.writeFileSync(filePath, newContent, 'utf8');
