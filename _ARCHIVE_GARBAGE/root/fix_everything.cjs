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
    [/L[^\s]{1,2}ch s[^\s]{1,2}/g, "Lịch sử"],
    [/Thi[^\s]{1,2}t b[^\s]{1,2}/g, "Thiết bị"],
    [/N[^\s]{1,2}i dung/g, "Nội dung"],
    [/Nh[^\s]{1,2}t k[^\s]{1,2}/g, "Nhật ký"],
    [/Nh[^\s]{1,2}t ky[^\s]{1,2}/g, "Nhật ký"],
    [/Hi[^\s]{1,2}u su[^\s]{1,2}t/g, "Hiệu suất"],
    [/v[^\s]{1,2}n h[^\s]{1,2}nh/g, "vận hành"],
    [/Kh[^\s]{1,2}ch h[^\s]{1,2}ng/g, "Khách hàng"],
    [/Đối tu[^\s]{1,2}ng/g, "Đối tượng"],
    [/Báo c[^\s]{1,2}o/g, "Báo cáo"],
    [/T[^\s]{1,2}ng s[^\s]{1,2}:/g, "Tổng số:"],
    [/kh[^\s]{1,2}ch h[^\s]{1,2}ng/g, "khách hàng"],
    [/ang ch[^\s]{1,2}/g, "đang chạy"],
    [/\ufffd\ufffd di qua/g, "đã đi qua"],
    [/ di qua/g, "đã đi qua"],
    [/T[^\s]{1,2} l[^\s]{1,2}/g, "Tỉ lệ"],
    [/ho[^\s]{1,2}n t[^\s]{1,2}t/g, "hoàn tất"],
    [/m[^\s]{1,2} TB/g, "mở TB"],
    [/Lu[^\s]{1,2}t/g, "Lượt"],
    [/danh s[^\s]{1,2}ch/g, "danh sách"]
];

const targetDirs = [
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/",
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
