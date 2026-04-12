const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const map = [
    { reg: /Danh s[\W]{1,3}ch t[\W]{1,3}i/gi, to: "Danh sách tại" },
    { reg: /T[\W]{1,3}ng s[\W]{1,3}/gi, to: "Tổng số" },
    { reg: /KH[\W]{1,3}CH H[\W]{1,3}NG/g, to: "KHÁCH HÀNG" },
    { reg: /Th[\W]{1,3}m User/g, to: "Thêm User" },
    { reg: /T[\W]{1,3}m ki[\W]{1,3}m email/gi, to: "Tìm kiếm email" },
    { reg: /G[\W]{1,3}i l[\W]{1,3}i/gi, to: "Gửi lại" },
    { reg: /Tr[\W]{1,3}ng th[\W]{1,3}i/gi, to: "Trạng thái" },
    { reg: /Th[\W]{1,3}i gian/gi, to: "Thời gian" },
    { reg: /B[\W]{1,3}o c[\W]{1,3}o/gi, to: "Báo cáo" },
    { reg: /L[\W]{1,3}t Click/gi, to: "Lượt Click" },
    { reg: /H[\W]{1,3}y \x11\x11ng k\?|H[\W]{1,3}y \w+ k[\W]{1,3}/gi, to: "Hủy đăng ký" },
    { reg: /[\W]Đang chờ/g, to: "Đang chờ" },
    { reg: /Đ[\W]{1,3} g[\W]{1,3}i/gi, to: "Đã gửi" },
    { reg: /Đ[\W]{1,3} m[\W]{1,3} mail/gi, to: "Đã mở mail" },
    { reg: /H[\W]{1,3}y [\W]{1,3}ng k[\W]{1,3}/gi, to: "Hủy đăng ký" },
    { reg: /C[\W]{1,3}n/g, to: "Còn" },
    { reg: /S[\W]{1,3}p ch[\W]{1,3}y ngay/gi, to: "Sắp chạy ngay" },
    { reg: /Ho[\W]{1,3}n th[\W]{1,3}nh/gi, to: "Hoàn thành" },
    { reg: /Hon th[\W]{1,3}nh/gi, to: "Hoàn thành" },
    { reg: /B[\W]{1,3} qua/gi, to: "Bỏ qua" }
];

const targetDirs = ["e:/AUTOFLOW/AUTOMATION_FLOW/components/", "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"];

targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        let content = fs.readFileSync(file, "utf8");
        let changed = false;
        map.forEach(item => {
            if (item.reg.test(content)) {
                content = content.replace(item.reg, item.to);
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(file, content, "utf8");
            console.log("V3 Cleaned: " + file);
        }
    });
});
