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
    // Correcting my previous bad replacements first
    { reg: /Ch\?n\x11\?ng m\?/g, to: "Chọn một" },
    { reg: /Ch\?n\u0110\xE3 m\u1EDFi/g, to: "Chọn mới" },
    { reg: /Ch\?n\u0110\xE3 m\u1EDBt/g, to: "Chọn một" },
    { reg: /Ch\?n\u0110\xE3 m\u1EDF/g, to: "Chọn mới" },
    { reg: /t\?o\u0110\xE3 m\u1EDFi/g, to: "tạo mới" },
    { reg: /t\?o \u0110\xE3 m\u1EDFi/g, to: "tạo mới" },
    { reg: / \u0110\xE3 m\u1EDFi/g, to: " mới" },
    { reg: /m\u1EDFi/g, to: "mới" },
    { reg: / \u0110\xE3 g\u1EEDi l\u1EA1i/g, to: " gửi lại" },
    { reg: /\u0110\xE3 g\u1EEDi/g, to: "đã gửi" },
    { reg: /ZNS d\u0110\xE3 g\u1EEDi/g, to: "ZNS đã gửi" },
    { reg: /X\xEF\xBF\xBDc nh\?n\u0110\xE3 g\u1EEDi l\u1EA1i\?/g, to: "Xác nhận gửi lại?" },

    // Primary corrupted strings from user request and observation
    { reg: /Danh s\xEF\xBF\xBDch t\?i/g, to: "Danh sách tại" },
    { reg: /Danh sch t\?i/g, to: "Danh sách tại" },
    { reg: /T\?ng s\?/g, to: "Tổng số" },
    { reg: /KH\xEF\xBF\xBDCH H\xEF\xBF\xBDNG/g, to: "KHÁCH HÀNG" },
    { reg: /Th\xEF\xBF\xBDm User/g, to: "Thêm User" },
    { reg: /T\xEF\xBF\xBDm ki\?m email/g, to: "Tìm kiếm email" },
    { reg: /G\?i l\?i/g, to: "Gửi lại" },
    { reg: /G\?i ngay/g, to: "Gửi ngay" },
    { reg: /H\?y \x11\x11ng k\?/g, to: "Hủy đăng ký" },
    { reg: /H\?y d\?ng k\?/g, to: "Hủy đăng ký" },
    { reg: /H\?y b\?/g, to: "Hủy bỏ" },
    { reg: /B\xEF\xBF\xBDo c\xEF\xBF\xBDo/g, to: "Báo cáo" },
    { reg: /Tr\?ng th\?i/g, to: "Trạng thái" },
    { reg: /Th\?i gian/g, to: "Thời gian" },
    { reg: /L\?t Click/g, to: "Lượt Click" },
    { reg: /\xEF\xBF\xBD\?ng ch\?/g, to: "Đang chờ" },
    { reg: /\uFFFD\?ng ch\?/g, to: "Đang chờ" },
    { reg: /ang ch\?/g, to: "Đang chờ" },
    { reg: /ang x\? l/g, to: "Đang xử lý" },
    { reg: /ang d\?i/g, to: "Đang đợi" },
    { reg: /Hon thnh/g, to: "Hoàn thành" },
    { reg: /kh\?p/g, to: "khớp" },
    { reg: /Kh\xEF\xBF\xBDng kh\?p/g, to: "Không khớp" },
    { reg: /B\? qua/g, to: "Bỏ qua" },
    { reg: /Xc nh\?n/g, to: "Xác nhận" },
    { reg: /li\xEF\xBF\xBDn h\?/g, to: "liên hệ" },
    { reg: /C\?p nh\?n/g, to: "Cập nhật" },
    { reg: /Khi\?u n\?i/g, to: "Khiếu nại" },
    { reg: /H\u1EBFt h\u1EA1n l\?c/g, to: "Hết hạn lúc" },
    { reg: /mu\?n lo\?i/g, to: "muốn loại" }
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
            console.log("Surgically Repaired: " + file);
        }
    });
});
