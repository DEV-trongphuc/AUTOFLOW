const fs = require("fs");
const path = require("path");

function walkDir(dir, cb) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        fs.statSync(full).isDirectory() ? walkDir(full, cb) : cb(full);
    });
}

const broken = [];
["e:/AUTOFLOW/AUTOMATION_FLOW/components/", "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"].forEach(dir => {
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        const content = fs.readFileSync(file, "utf8");
        // Look for patterns broken by our regex: mid-word substitution
        const matches = content.match(/.{0,20}đang chạy.{0,20}/g) || [];
        matches.forEach(m => {
            // Flag if "đang chạy" appears inside a word/string not as standalone text
            if (!/[>"\s]đang chạy[\s<",(]/.test(m) && !/^\s*đang chạy\s*$/.test(m.trim())) {
                broken.push(file.replace("e:/AUTOFLOW/AUTOMATION_FLOW/", "") + ": ..." + m + "...");
            }
        });
    });
});

console.log(broken.length === 0 ? "No mid-word đang chạy found!" : broken.join("\n"));
