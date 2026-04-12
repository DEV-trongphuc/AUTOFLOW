const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const terms = [
    { from: /L[\?]{1,2}ch s[\?]{1,2}/g, to: "Lịch sử" },
    { from: /Thi[\?]{1,2}t b[\?]{1,2}/g, to: "Thiết bị" },
    { from: /N[\?]{1,2}i dung/g, to: "Nội dung" },
    { from: /Nh[\?]{1,2}t k[\?]{1,2}/g, to: "Nhật ký" },
    { from: /v[\?]{1,2}n h[\?]{1,2}nh/g, to: "vận hành" },
    { from: /Hi[\?]{1,2}u su[\?]{1,2}t/g, to: "Hiệu suất" },
    { from: /Kh[\?]{1,2}ch h[\?]{1,2}ng/g, to: "Khách hàng" },
    { from: /Di tu[\?]{1,2}ng/g, to: "Đối tượng" },
    { from: /Bo c[\?]{1,2}o/g, to: "Báo cáo" },
    { from: /T[\?]{1,2}ng s[\?]{1,2}/g, to: "Tổng số" },
    { from: /T tỉ lệel/g, to: "Label" },
    { from: /T[\?]{1,2} l[\?]{1,2}/g, to: "Tỉ lệ" }
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
        terms.forEach(term => {
            if (term.from.test(content)) {
                content = content.replace(term.from, term.to);
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(file, content, "utf8");
            console.log("Deep Cleaned: " + file);
        }
    });
});
