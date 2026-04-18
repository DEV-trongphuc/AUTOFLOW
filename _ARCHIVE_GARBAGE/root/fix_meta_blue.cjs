const fs = require('fs');

const metaFiles = [
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/meta/MetaCustomers.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/meta/MetaConfig.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/pages/MetaMessenger.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/pages/WebTracking.tsx'
];

for (const path of metaFiles) {
    if (!fs.existsSync(path)) continue;
    let text = fs.readFileSync(path, 'utf8');

    if (path.includes('WebTracking.tsx')) {
        // Remove the back button
        text = text.replace(/<button[^>]*onClick=\{\(\) => setView\('list'\)\}[^>]*>[\s\S]*?<ArrowLeft[\s\S]*?<\/button>/g, '');
    }

    if (path.includes('MetaConfig.tsx') || path.includes('MetaCustomers.tsx')) {
        // Replace blue with amber
        text = text.replace(/blue-500/g, 'amber-600');
        text = text.replace(/blue-600/g, 'amber-600');
        text = text.replace(/blue-700/g, 'amber-700');
        text = text.replace(/blue-50/g, 'amber-50');
        text = text.replace(/blue-100/g, 'amber-100');
        text = text.replace(/blue-200/g, 'amber-200');
        text = text.replace(/blue-300/g, 'amber-300');
        text = text.replace(/blue-400/g, 'amber-400');
    }

    fs.writeFileSync(path, text, 'utf8');
}
console.log('Processed Meta files.');
