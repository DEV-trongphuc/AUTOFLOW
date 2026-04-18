const fs = require("fs");
const path = require("path");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const terms = ["Lịch sử", "Thiết bị", "Nội dung", "Báo cáo", "Đối tượng", "Nhật ký"];

targetDirs = [
    "e:/AUTOFLOW/AUTOMATION_FLOW/components/",
    "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"
];

targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        let content = fs.readFileSync(file, "utf8");
        let lines = content.split("\n");
        let changed = false;
        for(let i=0; i<lines.length; i++) {
            let line = lines[i];
            terms.forEach(term => {
                // If line has the term and it seems to have swallowed a quote
                // e.g. label: \x27Thiết bị,
                let regex = new RegExp("([\x27\x22])" + term + "(,)", "g");
                if (regex.test(line)) {
                    line = line.replace(regex, "$1" + term + "$1$2");
                    lines[i] = line;
                    changed = true;
                }
            });
        }
        if (changed) {
            fs.writeFileSync(file, lines.join("\n"), "utf8");
            console.log("Syntax Fixed: " + file);
        }
    });
});
