const fs = require('fs');

const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloOAManager.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(/>Qu[^<]*OA</g, '>Quản lý kết nối OA<');
text = text.replace(/>Hu[^<]*d\?n</g, '>Hướng dẫn<');
text = text.replace(/>K\?t n\?i ngay</gi, '>Kết nối ngay<');
text = text.replace(/=>\s*'(K[^']+th[^']+ng!)'/g, "=> 'Kết nối Zalo OA thành công!'");
text = text.replace(/'L[^']+danh[^']+OA'/g, "'Lỗi khi tải danh sách OA'");
text = text.replace(/'Dang[^']+nh\?p Zalo...'/g, "'Đang mở cửa sổ đăng nhập Zalo...'");
text = text.replace(/'L[^']+URL k\?t n\?i'/g, "'Lỗi khi tạo URL kết nối'");
text = text.replace(/'L[^']+k\?t n\?i API'/g, "'Lỗi kết nối API'");
text = text.replace(/'L[^']+URL authorize'/g, "'Lỗi khi tạo URL authorize'");
text = text.replace(/'D[^']+th[^']+ng!'/g, "'Đã làm mới token thành công!'");
text = text.replace(/'L[^']+refresh token'/g, "'Lỗi khi refresh token'");
text = text.replace(/'D[^']+H\?n m\?c[^']+lu\?ng'/g, "'Đã cập nhật Hạn mức và Chất lượng'");
text = text.replace(/'Ng\?t k\?t n\?i Zalo OA\?'/g, "'Ngắt kết nối Zalo OA?'");
text = text.replace(/B[^']+ng\?t k\?t n\?i/g, 'Bạn có chắc chắn muốn ngắt kết nối');
text = text.replace(/M[^']+OA \\n/g, 'Mọi chiến dịch và tự động hóa liên quan đến OA \\n');
text = text.replace(/n[^']+hu\?ng\./g, 'này sẽ bị ảnh hưởng.');
text = text.replace(/'L[^']+x[^']+OA'/g, "'Lỗi khi xóa OA'");
text = text.replace(/>S[^']+k\?t n\?i\?</g, '>Sẵn sàng kết nối?<');
text = text.replace(/>K[^']+ZNS t\? d\?ng\.</g, '>Kết nối Zalo Official Account của bạn ngay hôm nay để bắt đầu khai thác sức mạnh của thông báo ZNS tự động.<');
text = text.replace(/>K[^']+1 ch\?m</g, '>Kết nối ngay 1 chạm<');
text = text.replace(/>H[^']+k\?t n\?i</g, '>Hết hạn kết nối<');
text = text.replace(/>Token[^']+authorize[^']+v\?\.?</g, '>Token đã hết hạn. Vui lòng authorize lại để tiếp tục sử dụng dịch vụ.<');
text = text.replace(/title="C[^']+l\?i"/g, 'title="Cập nhật quyền/Authorize lại"');
text = text.replace(/>K[^']+ho\?t ngay</g, '>Kích hoạt ngay<');
text = text.replace(/title="Ng[^']+n\?i"/g, 'title="Ngắt kết nối"');
text = text.replace(/confirmLabel="Ng[^']+n\?i"/g, 'confirmLabel="Ngắt kết nối"');

// Wait, the user wants AMBER-600 #d97706 instead of Orange!
// I'll replace any remaining orange/blue/indigo to amber in Zalo components
fs.writeFileSync(path, text, 'utf8');
