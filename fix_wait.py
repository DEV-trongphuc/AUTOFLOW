import sys

file_path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove shifting logic
target_shift = '''        // Loop through steps in order and push 'wait' counts forward
        // Repeat up to 3 times to handle chained wait nodes (Wait -> Wait -> Action)
        for (let i = 0; i < 3; i++) {
            sortedSteps.forEach(s => {
                if (s.type === 'wait') {
                    const count = shiftedWaiting.get(s.id) || 0;
                    if (count > 0 && s.nextStepId) {
                        const currentTargetCount = shiftedWaiting.get(s.nextStepId) || 0;
                        shiftedWaiting.set(s.nextStepId, currentTargetCount + count);
                        shiftedWaiting.set(s.id, 0); // Clear from wait step
                    }
                }
            });
        }'''
content = content.replace(target_shift, '')

# 2. Allow effectiveStepId shifting logic to NOT shift wait
target_fetch = '''        // [SHIFTING FIX] If we are looking for 'waiting' users for a specific step,
        // we must also include users who are at any 'wait' step that leads to this step.
        let effectiveStepId = stepId;
        if (stepId && (!status || status === 'waiting')) {
            const sources = [stepId];
            const findWaitSources = (targetId: string) => {
                currentFlow.steps.forEach(s => {
                    if (s.type === 'wait' && s.nextStepId === targetId && !sources.includes(s.id)) {
                        sources.push(s.id);
                        findWaitSources(s.id);
                    }
                });
            };
            findWaitSources(stepId);
            effectiveStepId = sources.join(',');
        }'''
content = content.replace(target_fetch, '        let effectiveStepId = stepId;')

# 3. Remove item.type !== 'wait' from click handler
target_click = '''                                                    onClick={() => item.type !== 'wait' && handleStepClick(item.id, item.type)}'''
content = content.replace(target_click, '''                                                    onClick={() => handleStepClick(item.id, item.type)}''')

# 4. Remove special card styling for wait step
target_style = '''\'''
content = content.replace(target_style, '''\''')

target_style2 = '''(item.type === 'wait' ? 'border-slate-200 dark:border-slate-700/60' : 'border-slate-100 dark:border-slate-800/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700/60')'''
content = content.replace(target_style2, '''(item.type === 'wait' ? 'border-slate-300 dark:border-slate-700 hover:border-slate-400' : 'border-slate-100 dark:border-slate-800/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700/60')''')

# 5. Remove 'Ch?: {item.waiting}' badge
target_badge = '''                                                                    {item.waiting > 0 && (
                                                                        <span className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md animate-pulse">
                                                                            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-amber-600"></div>
                                                                            Ch?: {item.waiting}
                                                                        </span>
                                                                    )}'''
content = content.replace(target_badge, '')

# 6. Show pills for wait step
target_pills = ''') : item.type !== 'wait' ? ('''
content = content.replace(target_pills, ''') : (''')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
