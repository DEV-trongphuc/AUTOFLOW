const fs = require('fs');

// 1. UPDATE Flows.tsx
let flowsContent = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/pages/Flows.tsx', 'utf8');

// Add mailZnsInfo useMemo
if (!flowsContent.includes('const mailZnsInfo = useMemo(')) {
    const durationInfoRegex = /const durationInfo = useMemo\(\(\) => \{[\s\S]*?\}, \[selectedFlow\?\.steps\]\);/;
    const mailZnsInfoCode = `
    const mailZnsInfo = useMemo(() => {
        if (!selectedFlow) return null;
        
        const totalCount = (selectedFlow.steps || []).filter(s => s.type === 'action' || s.type === 'zalo_zns').length;
        
        const maxPathCount = (currentStepId, currentCount, visited) => {
            if (!currentStepId || visited.has(currentStepId)) return currentCount;
            const step = selectedFlow.steps?.find(s => s.id === currentStepId);
            if (!step) return currentCount;
            
            let newCount = currentCount;
            if (step.type === 'action' || step.type === 'zalo_zns') {
                newCount += 1;
            }
            
            const newVisited = new Set(visited);
            newVisited.add(currentStepId);
            
            const children = [];
            if (step.nextStepId) children.push(step.nextStepId);
            if (step.yesStepId) children.push(step.yesStepId);
            if (step.noStepId) children.push(step.noStepId);
            if (step.pathAStepId) children.push(step.pathAStepId);
            if (step.pathBStepId) children.push(step.pathBStepId);
            if (step.type === 'advanced_condition') {
                if (step.config?.defaultStepId) children.push(step.config.defaultStepId);
                if (step.config?.branches) {
                    step.config.branches.forEach(b => {
                        if (b.stepId) children.push(b.stepId);
                    });
                }
            }
            
            if (children.length === 0) return newCount;
            return Math.max(...children.map(childId => maxPathCount(childId, newCount, newVisited)));
        };
        
        const trigger = selectedFlow.steps?.find(s => s.type === 'trigger');
        let maxCount = 0;
        if (trigger) {
            maxCount = maxPathCount(trigger.id, 0, new Set());
        }
        
        return { total: totalCount, maxBranch: maxCount };
    }, [selectedFlow?.steps]);
`;

    flowsContent = flowsContent.replace(durationInfoRegex, match => match + '\n' + mailZnsInfoCode);
}

// Pass mailZnsInfo to FlowSidebar
flowsContent = flowsContent.replace(
    /durationInfo={durationInfo}\s*snapshotCount=\{flowSnapshots\.length\}/,
    'durationInfo={durationInfo}\n                                        mailZnsInfo={mailZnsInfo}\n                                        snapshotCount={flowSnapshots.length}'
);

fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/pages/Flows.tsx', flowsContent, 'utf8');

// 2. UPDATE FlowSidebar.tsx
let sidebarContent = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/builder/FlowSidebar.tsx', 'utf8');

if (!sidebarContent.includes('mailZnsInfo?: { total: number, maxBranch: number };')) {
    // Add to props interface
    sidebarContent = sidebarContent.replace(
        /durationInfo\?: \{ min: string, max: string, breakdown\?: any\[\] \};/,
        'durationInfo?: { min: string, max: string, breakdown?: any[] };\n    mailZnsInfo?: { total: number, maxBranch: number };'
    );
    
    // Add to destructuring
    sidebarContent = sidebarContent.replace(
        /durationInfo,/,
        'durationInfo,\n    mailZnsInfo,'
    );
    
    // Import MessageCircle icon
    if (!sidebarContent.includes('MessageCircle')) {
        sidebarContent = sidebarContent.replace(
            /import \{ ShieldCheck, History, AlertOctagon, CheckCircle2, ChevronRight, Clock, RotateCcw \} from 'lucide-react';/,
            `import { ShieldCheck, History, AlertOctagon, CheckCircle2, ChevronRight, Clock, RotateCcw, Send } from 'lucide-react';`
        );
    }
    
    // Render below durationInfo block
    const durationBlockEndRegex = /<\/div>\s*\}\)\}\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}/;
    const mailZnsBlock = `
                {mailZnsInfo && (
                    <div className="px-1 space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Send className="w-3.5 h-3.5 text-rose-500" /> Thống kê Gửi tin
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Tổng Mail + ZNS:</span>
                                <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                                    {mailZnsInfo.total}
                                </span>
                            </div>
                            <div className="flex justify-between items-start text-[9px] pt-2 border-t border-slate-200 dark:border-slate-700/60/50">
                                <span className="text-slate-500 dark:text-slate-400 font-bold max-w-[70%]">Nhánh nhận nhiều nhất:</span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold">
                                    {mailZnsInfo.maxBranch} tin
                                </span>
                            </div>
                        </div>
                    </div>
                )}
`;
    
    // Ensure we insert it carefully right after durationInfo
    sidebarContent = sidebarContent.replace(
        /({\s*durationInfo\.breakdown\s*&&\s*durationInfo\.breakdown\.length\s*>\s*0\s*&&\s*\([\s\S]*?<\/div>\s*\)\s*}\s*<\/div>\s*\)\s*})/,
        `$1\n${mailZnsBlock}`
    );

    fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/builder/FlowSidebar.tsx', sidebarContent, 'utf8');
}

console.log('Successfully updated Flows.tsx and FlowSidebar.tsx');
