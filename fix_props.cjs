const fs = require('fs');
let content = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx', 'utf8');

content = content.replace(/stepData\?\: any;[\r\n\s]+onActionComplete\?\: \(\) => void;[\r\n]+\}/, `stepData?: any;\n    onActionComplete?: () => void;\n    activeBranchFilter?: string | null;\n    onBranchClick?: (branch: string | null) => void;\n}`);

content = content.replace(/stepId,[\r\n\s]+stepData,[\r\n\s]+onActionComplete[\r\n]+\}\) => \{/, `stepId,\n    stepData,\n    onActionComplete,\n    activeBranchFilter,\n    onBranchClick\n}) => {`);

fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx', content, 'utf8');
console.log('Props fixed:', content.includes('activeBranchFilter?: string | null'));
