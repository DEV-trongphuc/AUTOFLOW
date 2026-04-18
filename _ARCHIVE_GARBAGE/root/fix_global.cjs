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
    [/L\?ch s\?/g, "Lịch sử"],
    [/Thi\?t b\?/g, "Thiết bị"],
    [/N\?i dung/g, "Nội dung"],
    [/Nh\?t k\?/g, "Nhật ký"],
    [/Nh\?t ky\?/g, "Nhật ký"],
    [/Hi\?u su\?t/g, "Hiệu suất"],
    [/v\?n h\?nh/g, "vận hành"],
    [/Khch hng/g, "Khách hàng"],
    [/Đối tu\?ng/g, "Đối tượng"],
    [/Báo c\?o/g, "Báo cáo"],
    [/T\?ng s\?:/g, "Tổng số:"],
    [/khch hng/g, "khách hàng"],
    [/ang ch\?/g, "đang chạy"],
    [/ di qua/g, "đã đi qua"],
    [/Ho\u1ea1t \u0111\u1ed9ng t\?t/g, "Hoạt động tốt"],
    [/L\?i/g, "Lỗi"],
    [/H\?y/g, "Hủy"],
    [/Vui lòng chọn/g, "Vui lòng chọn"],
    [/Thm/g, "Thêm"],
    [/T\? l\?/g, "Tỉ lệ"],
    [/ho\?n t\?t/g, "hoàn tất"],
    [/m\? TB/g, "mở TB"],
    [/Lu\?t/g, "Lượt"],
    [/danh s\?ch/g, "danh sách"]
];

const targetDirs = [
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/",
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/",
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/zalo/",
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/meta/",
    "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"
];

targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, file => {
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
});
