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
    [/Hi[^u]{1,2}u su[^t]{1,2}t v[^n]{1,2}n h[^n]{1,2}nh/g, "Hiệu suất vận hành"],
    [/NH\?T K\?/g, "NHẬT KÝ"],
    [/Nh\?t k\?/g, "Nhật ký"],
    [/T\? l\? ho\?n t\?t/g, "Tỉ lệ hoàn tất"],
    [/T\? l\? m\? TB/g, "Tỉ lệ mở TB"],
    [/KH\ufffdCH H\ufffdNG/gi, "KHÁCH HÀNG"],
    [/KH[^C]{1,2}CH H[^N]{1,2}NG/gi, "KHÁCH HÀNG"],
    [/Lu\?t m\? duy nh\?t/g, "Lượt mở duy nhất"],
    [/Hnh trnh khch hng/gi, "Hành trình khách hàng"],
    [/H[^n]{1,2}nh tr[^n]{1,2}nh kh[^c]{1,2}ch h[^n]{1,2}ng/gi, "Hành trình khách hàng"],
    [/KHNG TUONG TC/gi, "KHÔNG TƯƠNG TÁC"],
    [/KH\?NG TUONG T\?C/gi, "KHÔNG TƯƠNG TÁC"],
    [/di qua/g, "đi qua"],
    [/ \? dy/g, " ở đây"],
    [/ang ch\?/g, "Đang chờ"],
    [/ang ch\? g\?i/g, "Đang chờ gửi"],
    [/ m\? mail/g, "Đã mở mail"],
    [/Trang [\s\S]+ T\?ng [\s\S]+ s\? ki\?n/g, (m) => m.replace("T\?ng", "• Tổng").replace("s\? ki\?n", "sự kiện")],
    [/Ti`m email/g, "Tìm email"],
    [/Ti`m ki\?m email/g, "Tìm kiếm email"],
    [/Chua c s\? ki\?n no/g, "Chưa có sự kiện nào"],
    [/Chua c\? s\? ki\?n n\?o/g, "Chưa có sự kiện nào"],
    [/Chua c d\? li\?u v\?n hnh/g, "Chưa có dữ liệu vận hành"],
    [/Bo co/gi, "Báo cáo"],
    [/TR\?NG TH\?I/g, "TRẠNG THÁI"],
    [/TH\?I GIAN/g, "THỜI GIAN"],
    [/BU\?C CU\?I C\?NG/g, "BƯỚC CUỐI CÙNG"],
    [/T\?ng s\?:\s\d+\skh\?ch h\?ng/g, (m) => m.replace("T\?ng s\?:", "Tổng số:").replace("kh\?ch h\?ng", "khách hàng")],
    [/Hi\ufffd?u su\ufffd?t v\ufffd?n h\ufffd?nh/g, "Hiệu suất vận hành"]
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
