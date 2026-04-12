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
    [/L\?ch s\? tuong t\?c/g, "Lịch sử tương tác"],
    [/l\?ch s\? ho\?t d\?ng/g, "lịch sử hoạt động"],
    [/Kh\?ng th\? t\?i n\?i dung/g, "Không thể tải nội dung"],
    [/l\?ch s\? v\?n du\?c gi\? l\?i/g, "lịch sử vẫn được giữ lại"],
    [/m\?i l\?ch s\? tuong t\?c/g, "mọi lịch sử tương tác"],
    [/Dang t\?o n\?i dung preview\.\.\./g, "Đang tạo nội dung preview..."],
    [/Kh\?ng th\? ho\?n t\?t/g, "Không thể hoàn tất"],
    [/Ch\?t lu\?ng n\?i dung/g, "Chất lượng nội dung"],
    [/N\?i dung ZNS/g, "Nội dung ZNS"],
    [/Email ch\nh/g, "Email chính"],
    [/Vui l\?ng ch\?n m\?u email ho\?c nh\?p n\?i dung HTML/g, "Vui lòng chọn mẫu email hoặc nhập nội dung HTML"],
    [/C\?u hnh N\?i dung/g, "Cấu hình Nội dung"],
    [/Tham s\? n\?i dung/g, "Tham số nội dung"],
    [/tr\n thi\?t b\?/g, "trên thiết bị"],
    [/Lo\?t n\?i dung/g, "Loại nội dung"],
    [/Xem tru\?c n\?i dung/g, "Xem trước nội dung"],
    [/M\? t\? n\?i dung nh\?c/g, "Mô tả nội dung nhắc"],
    [/Ti\u d\? Email nh\?c/g, "Tiêu đề Email nhắc"],
    [/Ph\?n t\ch Thi\?t b\?/g, "Phân tích Thiết bị"],
    [/Ki\?m tra n\?i dung/g, "Kiểm tra nội dung"]
];

walkDir("e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/", file => {
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
