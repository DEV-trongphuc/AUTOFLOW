const fs = require('fs');

const metaFiles = [
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/meta/MetaCustomers.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/meta/MetaConfig.tsx'
];

for (const path of metaFiles) {
    if (!fs.existsSync(path)) continue;
    let text = fs.readFileSync(path, 'utf8');

    // Replace text-white to !text-white on amber UI elements so text is clearly white
    text = text.replace(/text-white/g, '!text-white');
    
    // Convert generic blue classes to amber-600 classes for the icons, badges and Live Sync buttons
    // Actually, I already ran fix_meta_blue.cjs so it should already be amber-500, etc.
    // Let's ensure things that used to be blue-500 or blue-600 are amber-600 (to match #d97706)
    text = text.replace(/amber-500/g, 'amber-600');
    // I also want to fix the connect button 'Kết nối Page mới'
    // It currently has className="bg-amber-600 hover:bg-amber-700 !text-white" (due to previous replacements)
    // Let's upgrade it to the nice gradient CSS
    text = text.replace(/className="bg-amber-600 hover:bg-amber-700 !text-white"/g, 'className="bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-600 hover:to-amber-700 !text-white rounded-2xl shadow-lg shadow-amber-600/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border-0"');

    // Let's fix the LIVE SYNC buttons in MetaCustomers.tsx if they still use plain amber-600
    // Actually, LIVE SYNC is a small pill button. Let's find it.
    // Replace the corrupted Vietnamese chars if any
    text = text.replace(/'K[^']+Page m[^']+'/gi, "'Kết nối Page mới'");
    text = text.replace(/'H[^']+m m[^']+'/gi, "'Hủy thêm mới'");

    fs.writeFileSync(path, text, 'utf8');
}
console.log('Fixed meta files colors and whitespaces.');
