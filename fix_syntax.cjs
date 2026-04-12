const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const fixes = [
    [/label: [\x27]Lịch sử(, icon)/g, "label: \x27Lịch sử\x27$1"],
    [/label: [\x27]Thiết bị(, icon)/g, "label: \x27Thiết bị\x27$1"],
    [/label: [\x27]Nội dung(, icon)/g, "label: \x27Nội dung\x27$1"],
    [/label: [\x27]Báo cáo(, icon)/g, "label: \x27Báo cáo\x27$1"],
    [/label: [\x27]Đối tượng(, icon)/g, "label: \x27Đối tượng\x27$1"],
    [/label: [\x27]Nhật ký Live(, icon)/g, "label: \x27Nhật ký Live\x27$1"]
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
        fixes.forEach(([reg, rep]) => {
            if (reg.test(content)) {
                content = content.replace(reg, rep);
                changed = true;
            }
        });
        if (changed) {
            fs.writeFileSync(file, content, "utf8");
            console.log("Syntax Fixed: " + file);
        }
    });
});
