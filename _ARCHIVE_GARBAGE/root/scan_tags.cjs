const fs = require("fs");
const path = require("path");

function walkDir(dir, cb) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        fs.statSync(full).isDirectory() ? walkDir(full, cb) : cb(full);
    });
}

const rootDir = "e:/AUTOFLOW/AUTOMATION_FLOW";
const issues = [];

[rootDir + "/components", rootDir + "/pages"].forEach(dir => {
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        const content = fs.readFileSync(file, "utf8");
        // Find patterns like >Tỉ lệspan> or >Tỉ lệ\w (closing tag eaten)
        const lines = content.split("\n");
        lines.forEach((l, i) => {
            if (/>[^<]+(Tỉ lệ|Tổng số|Báo cáo|Nội dung)[a-z<>]+/.test(l)) {
                issues.push((file) + ":" + (i+1) + ": " + l.trim().substring(0,100));
            }
        });
    });
});

console.log(issues.length === 0 ? "No tag eating issues found!" : issues.join("\n"));
