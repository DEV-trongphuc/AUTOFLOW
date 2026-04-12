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
    { from: /Danh s\xEF\xBF\xBDch t\?/g, to: "Danh sách tại" },
    { from: /Danh s[\W]{1,3}ch/g, to: "Danh sách" },
    { from: /Th\xEF\xBF\xBDm User/g, to: "Thêm User" },
    { from: /T\xEF\xBF\xBDm ki\?m/g, to: "Tìm kiếm" },
    { from: /G\?i l\?i/g, to: "Gửi lỗi" },
    { from: /Tr\?ng th\xEF\xBF\xBDi/g, to: "Trạng thái" },
    { from: /Th\?i gian/g, to: "Thời gian" },
    { from: /\xEF\xBF\xBDĐang chờ/g, to: "Đang chờ" },
    { from: /Hủy đăng ký\xEF\xBF\xBD/g, to: "Hủy đăng ký" },
    { from: /B\xEF\xBF\xBDo c\xEF\xBF\xBDo/g, to: "Báo cáo" },
    { from: /D[\W]{1,3} i qua/g, to: "Đã đi qua" }, 
    { from: /Tr\?ng th\?i/g, to: "Trạng thái" },
    { from: /B\? qua/g, to: "Bỏ qua" },
    { from: /H\?y/g, to: "Hủy" },
    { from: /d\xEF\xBF\xBD\x10\? g\?i/g, to: "đã gửi" },
    { from: /d\xEF\xBF\xBD\? g\?i/g, to: "đã gửi" },
    { from: /g\?i/g, to: "gửi" },
    { from: /m\?i/g, to: "mới" },
    { from: /Hon thnh/g, to: "Hoàn thành" },
    { from: /H\?t h\?n/g, to: "Hết hạn" },
    { from: /d\xEF\xBF\xBD[\W]{1,6}g\?i/g, to: "đã gửi" }
];

const targetDirs = ["e:/AUTOFLOW/AUTOMATION_FLOW/components/", "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"];

targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        let content = fs.readFileSync(file, "utf8");
        let changed = false;
        map.forEach(item => {
            if (item.from.test(content)) {
                content = content.replace(item.from, item.to);
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(file, content, "utf8");
            console.log("Deep Cleaned v2: " + file);
        }
    });
});
