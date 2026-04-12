const fs = require('fs');

const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/zalo/ZaloDashboard.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(/'Kh[^']+templates'/g, "'Không thể tải templates'");
text = text.replace(/'L[^']+API'/g, "'Lỗi kết nối API'");
text = text.replace(/>M[^']+t\? d\?ng</g, '>Mẫu tin nhắn thông báo tự động<');
text = text.replace(/title="L[^']+s.ch"/g, 'title="Làm mới danh sách"');
text = text.replace(/>Dang t\?i templates t\? Zalo\.\.\.</g, '>Đang tải templates từ Zalo...<');
text = text.replace(/>Chua c[^']+d\?ng b\?</g, '>Chưa có templates nào được đồng bộ<');
text = text.replace(/>D\?ng b\? ngay</g, '>Đồng bộ ngay<');

fs.writeFileSync(path, text, 'utf8');
