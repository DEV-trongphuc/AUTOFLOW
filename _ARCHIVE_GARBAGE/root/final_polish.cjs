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
    { reg: /L[^\s\x27\x22]{1,3}ch s[^\s\x27\x22]{1,3}/g, to: "Lịch sử" },
    { reg: /Thi[^\s\x27\x22]{1,3}t b[^\s\x27\x22]{1,3}/g, to: "Thiết bị" },
    { reg: /N[^\s\x27\x22]{1,3}i dung/g, to: "Nội dung" },
    { reg: /Nh[^\s\x27\x22]{1,3}t k[^\s\x27\x22]{1,3}/g, to: "Nhật ký" },
    { reg: /Nh[^\s\x27\x22]{1,3}t ky[^\s\x27\x22]{1,3}/g, to: "Nhật ký" },
    { reg: /Hi[^\s\x27\x22]{1,3}u su[^\s\x27\x22]{1,3}t/g, to: "Hiệu suất" },
    { reg: /kh[^\s\x27\x22]{1,3}ch h[^\s\x27\x22]{1,3}ng/gi, to: "Khách hàng" },
    { reg: /D[^\s\x27\x22]{1,3}i tu[^\s\x27\x22]{1,3}ng/g, to: "Đối tượng" },
    { reg: /B[^\s\x27\x22]{1,3}o c[^\s\x27\x22]{1,3}o/gi, to: "Báo cáo" },
    { reg: /T[^\s\x27\x22]{1,3}ng s[^\s\x27\x22]{1,3}/g, to: "Tổng số" },
    { reg: /T[^\s\x27\x22]{1,3} l[^\s\x27\x22]{1,3}/g, to: "Tỉ lệ" }
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
            console.log("Final Polished: " + file);
        }
    });
});
