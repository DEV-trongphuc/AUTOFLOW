const fs = require('fs');

const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloOAManager.tsx';
let text = fs.readFileSync(path, 'utf8');

// Use general replace for these specific phrases accounting for any whitespace
text = text.replace(/Qu\ufffdn l\ufffd k\ufffdt n\ufffdi OA/g, 'Quản lý kết nối OA');
text = text.replace(/Hu\ufffdng d\ufffdn/g, 'Hướng dẫn');
text = text.replace(/K\ufffdt n\ufffdi ngay/g, 'Kết nối ngay');
text = text.replace(/Qu\?n l\? k\?t n\?i OA/g, 'Quản lý kết nối OA');
text = text.replace(/Hu\?ng d\?n/g, 'Hướng dẫn');
text = text.replace(/K\?t n\?i ngay/g, 'Kết nối ngay');

// Ensure anything else is caught
text = text.replace(/K\?t n\?i /g, 'Kết nối ');
text = text.replace(/k\?t n\?i /g, 'kết nối ');
text = text.replace(/K\?ch ho\?t/g, 'Kích hoạt');
text = text.replace(/Ng\?t /g, 'Ngắt ');
text = text.replace(/h\?t h\?n/g, 'hết hạn');

fs.writeFileSync(path, text, 'utf8');
