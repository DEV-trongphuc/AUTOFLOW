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
const broken = [];

[rootDir + "/components", rootDir + "/pages"].forEach(dir => {
    walkDir(dir, file => {
        if (!file.endsWith(".tsx")) return;
        const content = fs.readFileSync(file, "utf8");
        const matches = content.match(/.{0,20}Dang ch.{0,20}/g) || [];
        matches.forEach(m => {
            if (!/>[^\u0110\u00c4]?Dang ch/.test(m) && /[a-zA-Z_\u1eds-\u1ef9]Dang ch/.test(m)) {
                broken.push(file.replace(rootDir + "/", "") + ":  ..." + m.trim() + "...");
            }
        });
    });
});

if (broken.length === 0) {
    console.log("No mid-word Dang cho corruption found!");
} else {
    console.log(broken.join("\n"));
}
