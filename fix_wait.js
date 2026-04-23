const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /[\s]*\/\/ Loop through steps in order and push 'wait' counts forward[\s\S]*?\/\/ Clear from wait step[\s\S]*?\}[\s]*\}\);[\s]*\}[\s]*/,
    '\n\n        // Removed shift loop\n\n'
);

content = content.replace(
    /[\s]*\/\/ \[SHIFTING FIX\] If we are looking for 'waiting' users for a specific step,[\s\S]*?effectiveStepId = sources\.join\(\',\',\);[\s]*\}[\s]*/,
    '\n        // Removed shifting fix\n        let effectiveStepId = stepId;\n'
);

content = content.replace(
    /onClick=\{\(\) => item\.type !== 'wait' && handleStepClick\(item\.id, item\.type\)\}/g,
    'onClick={() => handleStepClick(item.id, item.type)}'
);

content = content.replace(
    /\$\{item\.type === 'wait' \? 'p-2 md:p-3 border-dashed bg-slate-100\/50 opacity-90' : 'bg-white dark:bg-slate-900 p-3 md:p-4 cursor-pointer'\}/g,
    '\'
);

content = content.replace(
    /\(item\.type === 'wait' \? 'border-slate-200 dark:border-slate-700\/60' : 'border-slate-100 dark:border-slate-800\/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700\/60'\)/g,
    '(item.type === \'wait\' ? \'border-slate-300 dark:border-slate-700 hover:border-slate-400\' : \'border-slate-100 dark:border-slate-800/60 hover:shadow-lg hover:border-slate-200 dark:border-slate-700/60\')'
);

content = content.replace(
    /[\s]*\{item\.waiting > 0 && \([\s]*<span className=\"flex items-center gap-1 text-\[8px\] md:text-\[9px\] font-bold text-amber-600 bg-amber-50 px-1\.5 py-0\.5 rounded-md animate-pulse\">[\s]*<div className=\"w-1 h-1 md:w-1\.5 md:h-1\.5 rounded-full bg-amber-600\"><\/div>[\s]*Ch?: \{item\.waiting\}[\s]*<\/span>[\s]*\)\}/,
    ''
);

content = content.replace(
    /\) : item\.type !== 'wait' \? \(/g,
    ') : ('
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
