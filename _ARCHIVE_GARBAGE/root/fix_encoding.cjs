const fs = require("fs");
const files = [
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx",
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx"
];
const replacements = [
    [/Hi\?u su\?t v\?n h\?nh/g, "Hiệu suất vận hành"],
    [/Automation d\? d\?ng/g, "Automation đã dừng"],
    [/dang ch\?y/g, "đang chạy"],
    [/T\? l\? ho\?n t\?t/g, "Tỉ lệ hoàn tất"],
    [/T\? l\? ho\?n t\ufffdt/g, "Tỉ lệ hoàn tất"],
    [/T\? l\? m\? TB/g, "Tỉ lệ mở TB"],
    [/\ufffd\ufffd g\?i/g, "Đã gửi"],
    [/ g\?i/g, "Đã gửi"],
    [/\ufffd\ufffd m\?/g, "Đã mở"],
    [/ m\?/g, "Đã mở"],
    [/H\?y K/g, "Hủy ĐK"],
    [/Chi\?n d\?ch g\?c/g, "Chiến dịch gốc"],
    [/Truy c\?p bo co chi ti\?t/g, "Truy cập báo cáo chi tiết"],
    [/Bo co/g, "Báo cáo"],
    [/Khch hng/g, "Khách hàng"],
    [/KH\ufffdCH H\ufffdNG/g, "KHÁCH HÀNG"],
    [/Lu\?t m\? duy nh\?t/g, "Lượt mở duy nhất"],
    [/Lu\?t Click/g, "Lượt Click"],
    [/T\? l\? l\?i/g, "Tỉ lệ lỗi"],
    [/Hnh trnh khch hng/g, "Hành trình khách hàng"],
    [/KHNG TUONG TC/g, "KHÔNG TƯƠNG TÁC"],
    [/ang \? dy/g, "Đang ở đây"],
    [/\ufffd\ufffd di qua/g, "Đã đi qua"],
    [/ di qua/g, "Đã đi qua"],
    [/Ch\?:\s/g, "Chờ: "],
    [/Ho\u1ea1t \u0111\u1ed9ng t\?t/g, "Hoạt động tốt"],
    [/L\?i\s\(/g, "Lỗi ("],
    [/H\?y\s\(/g, "Hủy ("],
    [/ xu\?t danh sch/g, "Đã xuất danh sách"],
    [/h\u1ee7y \u0111\u0103ng k\u00fd/g, "hủy đăng ký"],
    [/M\?c d\?nh \(Fallback\)/g, "Mặc định (Fallback)"],
    [/Chua c d\? li\?u v\?n hnh/g, "Chưa có dữ liệu vận hành"],
    [/Nh\?t k/g, "Nhật ký"],
    [/Ti`m email\.\.\./g, "Tìm kiếm email..."],
    [/Ti`m ki\?m email\.\.\./g, "Tìm kiếm email..."],
    [/Chua c s\? ki\?n no/g, "Chưa có sự kiện nào"],
    [/Tru\?c/g, "Trước"],
    [/T\?ng s\?:/g, "Tổng số:"],
    [/khch hng/g, "khách hàng"],
    [/Thm User/g, "Thêm User"],
    [/ang ch\? g\?i/g, "Đang chờ gửi"],
    [/ m\? mail/g, "Đã mở mail"],
    [/H\u1ee7y \u0111\u0103ng k\u00fd/g, "Hủy đăng ký"],
    [/Lu\?t click/g, "lượt click"],
    [/ang ch\?/g, "đang chạy"],
    [/ th\?m/g, "Đã thêm"],
    [/v\?o danh s\?ch/g, "vào danh sách"],
    [/Vui l\?ng ch\?n danh s\?ch/g, "Vui lòng chọn danh sách"],
    [/Xc nh?n d\?n d\?p/g, "Xác nhận dọn dẹp"],
    [/ang d\?n d\?p\.\.\./g, "Đang dọn dẹp..."],
    [/ d\?n d\?p ngu\?i dng b\? l\?i!/g, "Đã dọn dẹp người dùng bị lỗi!"],
    [/L\?i khi d\?n d\?p/g, "Lỗi khi dọn dẹp"],
    [/ang xu\?t bo co\.\.\./g, "Đang xuất báo cáo..."],
    [/Xu\?t bo co thnh cng!/g, "Xuất báo cáo thành công!"],
    [/L\?i khi xu\?t bo co/g, "Lỗi khi xuất báo cáo"],
    [/Khng th\? t\?i danh sch/g, "Không thể tải danh sách"],
    [/L\?i k\?t n\?i/g, "Lỗi kết nối"],
    [/C l\?i x\?y ra/g, "Có lỗi xảy ra"],
    [/L\?i g\?i l\?i/g, "Lỗi gửi lại"],
    [/Vui lng ch\?n tag/g, "Vui lòng chọn tag"],
    [/ g\?n tag cho/g, "Đã gắn tag cho"],
    [/Vui lng ch\?n tr\?ng thi/g, "Vui lòng chọn trạng thái"],
    [/ c\?p nh\?t tr\?ng thi cho/g, "Đã cập nhật trạng thái cho"],
    [/T\?m ki\?m email\.\.\./g, "Tìm kiếm email..."],
    [/T\?m danh s\?ch\.\.\./g, "Tìm danh sách..."],
    [/Ch\?n danh s\?ch/g, "Chọn danh sách"],
    [/Danh s\?ch c\? th\?/g, "Danh sách cụ thể"],
    [/Danh s\?ch theo d\?i/g, "Danh sách theo dõi"]
];
files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, "utf8");
    replacements.forEach(([reg, rep]) => {
        content = content.replace(reg, rep);
    });
    fs.writeFileSync(file, content, "utf8");
});
console.log("Fixed!");
