const fs = require('fs');

const files = [
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloOAManager.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/zalo/ZaloDashboard.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/zalo/ZaloAudienceTab.tsx',
    'e:/AUTOFLOW/AUTOMATION_FLOW/components/zalo/ZaloSendZBSModal.tsx'
];

for (const path of files) {
    if (!fs.existsSync(path)) continue;
    let text = fs.readFileSync(path, 'utf8');

    // Fix encoding
    text = text.replace(/Qu\?n ly k\?t n\?i OA/g, 'Quản lý kết nối OA');
    text = text.replace(/Qu\?n l\? k\?t n\?i OA/g, 'Quản lý kết nối OA');
    text = text.replace(/Hu\?ng d\?n/g, 'Hướng dẫn');
    text = text.replace(/K\?t n\?i ngay/g, 'Kết nối ngay');
    text = text.replace(/K\?t n\?i Zalo OA thnh cng!/g, 'Kết nối Zalo OA thành công!');
    text = text.replace(/L\?i khi t\?i danh s.ch OA/g, 'Lỗi khi tải danh sách OA');
    text = text.replace(/Dang m\? c\?a s\? dang nh\?p Zalo.../g, 'Đang mở cửa sổ đăng nhập Zalo...');
    text = text.replace(/L\?i khi t\?o URL k\?t n\?i/g, 'Lỗi khi tạo URL kết nối');
    text = text.replace(/L\?i k\?t n\?i API/g, 'Lỗi kết nối API');
    text = text.replace(/L\?i khi t\?o URL authorize/g, 'Lỗi khi tạo URL authorize');
    text = text.replace(/D. l.m m\?i token th.nh c.ng!/g, 'Đã làm mới token thành công!');
    text = text.replace(/L\?i khi refresh token/g, 'Lỗi khi refresh token');
    text = text.replace(/D. c\?p nh\?t H\?n m\?c v. Ch\?t lu\?ng/g, 'Đã cập nhật Hạn mức và Chất lượng');
    text = text.replace(/Ng\?t k\?t n\?i Zalo OA\?/g, 'Ngắt kết nối Zalo OA?');
    text = text.replace(/B\?n c. ch\?c ch\?n mu\?n ng\?t k\?t n\?i/g, 'Bạn có chắc chắn muốn ngắt kết nối');
    text = text.replace(/M\?i chi\?n d\?ch v. t\? d\?ng h.a li.n quan d\?n OA/g, 'Mọi chiến dịch và tự động hóa liên quan đến OA');
    text = text.replace(/n.y s\? b\? \?nh hu\?ng/g, 'này sẽ bị ảnh hưởng');
    text = text.replace(/L\?i khi x.a OA/g, 'Lỗi khi xóa OA');
    text = text.replace(/S\?n s.ng k\?t n\?i\?/g, 'Sẵn sàng kết nối?');
    text = text.replace(/K\?t n\?i Zalo Official Account c\?a b\?n ngay h.m nay d\? b\?t d\?u khai th.c s\?c m\?nh c\?a th.ng b.o ZNS t\? d\?ng./g, 'Kết nối Zalo Official Account của bạn ngay hôm nay để bắt đầu khai thác sức mạnh của thông báo ZNS tự động.');
    text = text.replace(/K\?t n\?i ngay 1 ch\?m/g, 'Kết nối ngay 1 chạm');
    text = text.replace(/H\?t h\?n k\?t n\?i/g, 'Hết hạn kết nối');
    text = text.replace(/Token d. h\?t h\?n. Vui lng authorize l\?i d\? ti\?p t\?c s\? d\?ng d\?ch v\?./g, 'Token đã hết hạn. Vui lòng authorize lại để tiếp tục sử dụng dịch vụ.');
    text = text.replace(/Token da h\?t h\?n. Vui lng authorize l\?i d\? ti\?p t\?c s\? d\?ng d\?ch v\?./g, 'Token đã hết hạn. Vui lòng authorize lại để tiếp tục sử dụng dịch vụ.');
    text = text.replace(/C\?p nh\?t quy\?n\/Authorize l\?i/g, 'Cập nhật quyền/Authorize lại');
    text = text.replace(/K.ch ho\?t ngay/g, 'Kích hoạt ngay');
    text = text.replace(/Ng\?t k\?t n\?i/g, 'Ngắt kết nối');

    text = text.replace(/Kh.ng th\? t\?i templates/g, 'Không thể tải templates');
    text = text.replace(/M\?u tin nh\?n th.ng b.o t\? d\?ng/g, 'Mẫu tin nhắn thông báo tự động');
    text = text.replace(/L.m m\?i danh s.ch/g, 'Làm mới danh sách');
    text = text.replace(/Dang t\?i templates t\? Zalo/g, 'Đang tải templates từ Zalo');
    text = text.replace(/Chua c. templates n.o du\?c d\?ng b\?/g, 'Chưa có templates nào được đồng bộ');
    text = text.replace(/D\?ng b\? ngay/g, 'Đồng bộ ngay');
    text = text.replace(/Danh s.ch d\?i tu\?ng Zalo/gi, 'Danh sách đối tượng Zalo');
    text = text.replace(/T\? d\?ng d\?ng b\? t\? Zalo OA/g, 'Tự động đồng bộ từ Zalo OA');
    
    // Replace blue/orange with amber
    text = text.replace(/orange-500/g, 'amber-600');
    text = text.replace(/orange-600/g, 'amber-600');
    text = text.replace(/orange-700/g, 'amber-700');
    text = text.replace(/orange-50/g, 'amber-50');
    text = text.replace(/orange-100/g, 'amber-100');
    text = text.replace(/orange-200/g, 'amber-200');
    text = text.replace(/orange-300/g, 'amber-300');
    text = text.replace(/orange-400/g, 'amber-400');

    // Replace blue with amber
    text = text.replace(/blue-500/g, 'amber-600');
    text = text.replace(/blue-600/g, 'amber-600');
    text = text.replace(/blue-700/g, 'amber-700');
    text = text.replace(/blue-50/g, 'amber-50');
    text = text.replace(/blue-100/g, 'amber-100');
    text = text.replace(/blue-200/g, 'amber-200');
    text = text.replace(/blue-300/g, 'amber-300');
    text = text.replace(/blue-[0-9]+\/[0-9]+/g, 'amber-600/20'); // Convert any trailing tailwind alpha

    text = text.replace(/from-amber-600 to-indigo-600/g, 'from-amber-500 to-amber-600');
    text = text.replace(/from-blue-600 to-indigo-600/g, 'from-amber-500 to-amber-600');
    text = text.replace(/hover:from-blue-700 hover:to-indigo-700/g, 'hover:from-amber-600 hover:to-amber-700');
    text = text.replace(/to-blue-600/g, 'to-amber-600');
    
    text = text.replace(/indigo-500/g, 'amber-600');
    text = text.replace(/indigo-600/g, 'amber-600');
    text = text.replace(/indigo-700/g, 'amber-700');
    text = text.replace(/indigo-50/g, 'amber-50');
    text = text.replace(/indigo-100/g, 'amber-100');

    // Clean up potentially multiple passes ending up as amber-600-50
    text = text.replace(/amber-600-50/g, 'amber-50'); 
    text = text.replace(/amber-600-100/g, 'amber-100');
    text = text.replace(/amber-600-600/g, 'amber-600');

    fs.writeFileSync(path, text, 'utf8');
}
console.log('Script processed successfully.');
