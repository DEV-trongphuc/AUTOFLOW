const fs = require("fs");
const path = require("path");

const targetDirs = ["e:/AUTOFLOW/AUTOMATION_FLOW/components/", "e:/AUTOFLOW/AUTOMATION_FLOW/pages/"];
const suspicious = [];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        let content = fs.readFileSync(file, "utf8");
        // Look for typical artifacts of my bad replacements
        let matches = content.match(/[^\x20-\x7E\s]{1,10}/g);
        if (matches) {
            matches.forEach(m => {
                if (m.includes("\uFFFD") || m.includes("?") || m.includes("\x11")) {
                     suspicious.push({ file: file, text: m });
                }
            });
        }
    });
});

console.log(JSON.stringify(suspicious.slice(0, 100)));
