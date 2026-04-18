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
let totalFixed = 0;

const patterns = [
    ["trDang cho lu", "tr\u1EDF l\u01B0u"],
    ["V\u1EC1 trDang cho", "V\u1EC1 trang ch\u1EE7"],
    ["\"TrDang cho\"", "\"Trang ch\u1EE7\""],
    ["sDang chobot", "sang bot"],
    ["B\u1EA1n Dang choh s\u1EEDa", "B\u1EA1n \u0111ang s\u1EEDa"],
    ["Dang chon b\uFFFD \uFFFDnh", "\u0110ang t\u1EA3i \u1EA3nh"],
    ["Dang choen", "\u0110ang chuy\u1EC3n"],
    ["Dang cho\u1EC3n", "\u0110ang chuy\u1EC3n"],
];

// Simpler approach: use exact byte strings
const actual = [
    ["\u0110ang ch\u1EDD\u1EC3n", "\u0110ang chuy\u1EC3n"],
    ["tr\u0110ang ch\u1EDD lu", "tr\u1EDF l\u01B0u"],
    ["V\u1EC1 tr\u0110ang ch\u1EDD", "V\u1EC1 trang ch\u1EE7"],
    ["s\u0110ang ch\u1EDDbot", "sang bot"],
    ["B\u1EA1n \u0110ang ch\u1EDDh s\u1EEDa", "B\u1EA1n \u0111ang s\u1EEDa"],
];

[rootDir + "/components", rootDir + "/pages"].forEach(dir => {
    walkDir(dir, file => {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return;
        let content = fs.readFileSync(file, "utf8");
        const original = content;
        actual.forEach(([from, to]) => {
            content = content.split(from).join(to);
        });
        if (content !== original) {
            fs.writeFileSync(file, content, "utf8");
            console.log("Fixed: " + file.replace(rootDir + "/", ""));
            totalFixed++;
        }
    });
});

console.log("Done. Fixed " + totalFixed + " files.");
