const fs = require('fs');

const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloOAManager.tsx';
let text = fs.readFileSync(path, 'utf8');

// The reason previous replaces failed was because the string might not have ?. It could be any weird Unicode.
// Let's use [\s\S]*? or regex . to replace the bad text exactly.
text = text.replace(/>K[^<]{0,20}n[^<]{0,10}i ngay</gi, '>Kết nối ngay<');
text = text.replace(/>Qu[^<]{0,20}OA</g, '>Quản lý kết nối OA<');

const pieces = [
    // Ensure all buttons with amber-600 get !text-white
    { from: /text-white/gi, to: '!text-white' }
];

for (const p of pieces) {
    text = text.replace(p.from, p.to);
}

fs.writeFileSync(path, text, 'utf8');
