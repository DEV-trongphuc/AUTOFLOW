const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const replacements = [
    [/Hi\?u su\?t v\?n h\?nh/g, "Hiệu suất vận hành"],
    [/Nh\?t k\?|Nh\?t ky\?/g, "Nhật ký"],
    [/T\?ng quan hi\?u su\?t/g, "Tổng quan hiệu suất"],
    [/H\u1ea1t \u0111\u1ed9ng t\?t/g, "Hoạt động tốt"],
    [/T\? l\? ho\?n t\?t/g, "Tỉ lệ hoàn tất"],
    [/T\? l\? ho\?n t\ufffdt/g, "Tỉ lệ hoàn tất"],
    [/T\? l\? m\? TB/g, "Tỉ lệ mở TB"],
    [/Kh\ufffdCH H\ufffdNG/g, "KHÁCH HÀNG"],
    [/Khch hng/g, "Khách hàng"],
    [/Lu\?t m\? duy nh\?t/g, "Lượt mở duy nhất"],
    [/Lu\?t Click/g, "Lượt Click"],
    [/T\? l\? l\?i/g, "Tỉ lệ lỗi"],
    [/Hnh trnh khch hng/g, "Hành trình khách hàng"],
    [/KHNG TUONG TC/g, "KHÔNG TƯƠNG TÁC"],
    [/ang ch\?/g, "Đang chờ"],
    [/Danh s\?ch t\?i:/g, "Danh sách tại:"],
    [/Danh s\?ch ho\?n th\?nh/g, "Danh sách hoàn thành"],
    [/T\?ng s\?:\s(\d+)\skh\?ch h\?ng/g, "Tổng số: $1 khách hàng"],
    [/T\?m ki\?m email\.\.\./g, "Tìm kiếm email..."],
    [/ang \? d\?y/g, "Đang ở đây"],
    [/ di qua/g, "Đã đi qua"],
    [/ di qua/g, "Đã đi qua"],
    [/TR\?NG TH\?I/g, "TRẠNG THÁI"],
    [/TH\?I GIAN/g, "THỜI GIAN"],
    [/BU\?C CU\?I C\?NG/g, "BƯỚC CUỐI CÙNG"],
    [/Kh\?ng t\?m th\?y d\? li\?u n\?o\./g, "Không tìm thấy dữ liệu nào."],
    [/Chua c d\? li\?u v\?n hnh/g, "Chưa có dữ liệu vận hành"],
    [/Automation d\? d\?ng/g, "Automation đã dừng"],
    [/dang ch\?y/g, "đang chạy"],
    [/\ufffd\ufffd g\?i/g, "Đã gửi"],
    [/ g\?i/g, "Đã gửi"],
    [/\ufffd\ufffd m\?/g, "Đã mở"],
    [/ m\?/g, "Đã mở"],
    [/H\?y ĐK/g, "Hủy ĐK"],
    [/H\?y K/g, "Hủy ĐK"],
    [/Chi\?n d\?ch g\?c/g, "Chiến dịch gốc"],
    [/Truy c\?p bo co chi ti\?t/g, "Truy cập báo cáo chi tiết"],
    [/Bo co/g, "Báo cáo"],
    [/L\?i\s\(/g, "Lỗi ("],
    [/H\?y\s\(/g, "Hủy ("],
    [/Ch\?:\s/g, "Chờ: "],
    [/Tru\?c/g, "Trước"],
    [/Sau/g, "Sau"],
    [/Nh\?p danh s\?ch\.\.\./g, "Nhập danh sách..."],
    [/Trong danh s\?ch/g, "Trong danh sách"],
    [/Th\?m v\?o danh s\?ch/g, "Thêm vào danh sách"],
    [/G\? kh\?i danh s\?ch/g, "Gỡ khỏi danh sách"],
    [/Ch\?n danh s\?ch/g, "Chọn danh sách"],
    [/T\?m danh s\?ch\.\.\./g, "Tìm danh sách..."],
    [/Danh s\?ch c\? th\?/g, "Danh sách cụ thể"],
    [/Danh s\?ch theo d\?i/g, "Danh sách theo dõi"],
    [/V\?o Danh s\?ch/g, "Vào Danh sách"],
    [/Khi v\?o Danh s\?ch/g, "Khi vào Danh sách"],
    [/Chua ch\?n danh s\?ch/g, "Chưa chọn danh sách"],
    [/Gia nh\?p Danh s\?ch/g, "Gia nhập Danh sách"],
    [/Thao t\?c danh s\?ch/g, "Thao tác danh sách"]
];

walkDir("e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/", file => {
    if (!file.endsWith(".tsx")) return;
    let content = fs.readFileSync(file, "utf8");
    let changed = false;
    replacements.forEach(([reg, rep]) => {
        if (reg.test(content)) {
            content = content.replace(reg, rep);
            changed = true;
        }
    });
    if (changed) {
        fs.writeFileSync(file, content, "utf8");
        console.log("Fixed: " + file);
    }
});
