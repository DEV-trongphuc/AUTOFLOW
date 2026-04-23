import re
import pathlib

p = pathlib.Path('components/flows/tabs/FlowAnalyticsTab.tsx')
text = p.read_text(encoding='utf-8')

# 1. Click handler
text = text.replace(
    "onClick={() => item.type !== 'wait' && handleStepClick(item.id, item.type)}",
    "onClick={() => handleStepClick(item.id, item.type)}"
)

# 2. Pills
text = text.replace(
    ") : item.type !== 'wait' ? (",
    ") : ("
)

# 3. Shifting logic 1
text = re.sub(
    r'// 3\.5 \[SHIFTING LOGIC\].*?// 4\. Build Funnel Data \(Recursive Traversal\)',
    '// 3.5 Use native wait counts\n        const shiftedWaiting = new Map<string, number>();\n        currentFlow.steps.forEach(s => {\n            shiftedWaiting.set(s.id, realtimeDistribution[s.id]?.count || 0);\n        });\n\n        // 4. Build Funnel Data (Recursive Traversal)',
    text, flags=re.DOTALL
)

# 4. Shifting logic 2
text = re.sub(
    r'// \[SHIFTING FIX\].*?let effectiveStepId = stepId;.*?effectiveStepId = sources\.join\(\',\',\);[\s]*\}',
    '// Removed shifting fix\n        let effectiveStepId = stepId;',
    text, flags=re.DOTALL
)

# 5. Wait step style
text = text.replace(
    "${item.type === 'wait' ? 'p-2 md:p-3 border-dashed bg-slate-100/50 opacity-90' : 'bg-white dark:bg-slate-900 p-3 md:p-4 cursor-pointer'}",
    "${item.type === 'wait' ? 'p-2 md:p-3 border-dashed bg-slate-100/50 opacity-90 cursor-pointer hover:opacity-100' : 'bg-white dark:bg-slate-900 p-3 md:p-4 cursor-pointer'}"
)
text = text.replace(
    "(item.type === 'wait' ? 'border-slate-200 dark:border-slate-700/60' : 'border-slate-100 dark:border-slate-800/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700/60')",
    "(item.type === 'wait' ? 'border-slate-300 dark:border-slate-700 hover:border-slate-400' : 'border-slate-100 dark:border-slate-800/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700/60')"
)

# 6. Badge
text = re.sub(
    r'\{item\.waiting > 0 && \([\s]*<span className=\"flex items-center gap-1 text-\[8px\] md:text-\[9px\] font-bold text-amber-600 bg-amber-50 px-1\.5 py-0\.5 rounded-md animate-pulse\">[\s]*<div className=\"w-1 h-1 md:w-1\.5 md:h-1\.5 rounded-full bg-amber-600\"><\/div>[\s]*Ch?: \{item\.waiting\}[\s]*<\/span>[\s]*\)\}',
    '',
    text
)

p.write_text(text, encoding='utf-8')
print("Done")
