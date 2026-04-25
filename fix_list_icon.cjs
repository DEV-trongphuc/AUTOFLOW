const fs = require('fs');

function replaceInFile(file, regex, replacer) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(regex, replacer);
    fs.writeFileSync(file, content, 'utf8');
}

replaceInFile('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/nodes/FlowNodes.tsx', 
    /case 'segment': return \{ icon: Layers, color: 'from-amber-400 to-amber-600', label: 'Segment Entry' \};/g, 
    `case 'segment': return step.config.targetSubtype === 'list' ? { icon: List, color: 'from-amber-400 to-amber-600', label: 'List Entry' } : { icon: Layers, color: 'from-amber-400 to-amber-600', label: 'Segment Entry' };`
);

replaceInFile('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx', 
    /case 'segment': return \{ icon: Layers, gradient: 'from-orange-500 to-\\[#ca7900\\]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Segment Trigger' \};/g, 
    `case 'segment': return config.targetSubtype === 'list' ? { icon: List, gradient: 'from-orange-500 to-[#ca7900]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'List Trigger' } : { icon: Layers, gradient: 'from-orange-500 to-[#ca7900]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Segment Trigger' };`
);

try {
    replaceInFile('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/FlowSimulateModal.tsx', 
        /case 'segment': return \{ icon: Layers, gradient: 'from-orange-500 to-\\[#ca7900\\]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Kích hoạt: Phân khúc' \};/g, 
        `case 'segment': return config.targetSubtype === 'list' ? { icon: List, gradient: 'from-orange-500 to-[#ca7900]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Kích hoạt: Danh sách' } : { icon: Layers, gradient: 'from-orange-500 to-[#ca7900]', text: 'text-orange-600', bg: 'bg-orange-50', label: 'Kích hoạt: Phân khúc' };`
    );
} catch (e) {
    console.log('Could not fix FlowSimulateModal');
}

console.log('Icons fixed for list trigger');
