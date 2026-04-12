const fs = require("fs");

// Line-level direct fixes for confirmed broken strings
const fixes = [
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/pages/AITraining.tsx",
        lineNums: [1118, 1192],
        replaceFn: (l) => l
            .replace("\"N\u1ed9i dung\" kh\u00f4ng du\?c d\? tr\?ng\"", "\"N\u1ed9i dung kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng\"")
            .replace("N\u1ed9i dung\u0027 kh\u00f4ng du\?c", "N\u1ed9i dung kh\u00f4ng \u0111\u01b0\u1ee3c")
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/pages/Settings.tsx",
        lineNums: [336],
        replaceFn: (l) => l.replace("\"Nh\u1eadt k\u00fd\" g\u1eedi\"", "\"Nh\u1eadt k\u00fd g\u1eedi\"")
            .replace("label: \"Nh\u1eadt k\u00fd\" g\u1eedi\"", "label: \"Nh\u1eadt k\u00fd g\u1eedi\"")
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/pages/DocSectionsB.tsx",
        lineNums: [449],
        replaceFn: (l) => l.replace("\"L\u1ecbch s\u1eed\" thanh to\u00e1n", "\"L\u1ecbch s\u1eed thanh to\u00e1n")
    }
];

fixes.forEach(({ file, lineNums, replaceFn }) => {
    if (!fs.existsSync(file)) { console.log("NOT FOUND: " + file); return; }
    const lines = fs.readFileSync(file, "utf8").split("\n");
    let changed = false;
    lineNums.forEach(n => {
        const before = lines[n-1];
        lines[n-1] = replaceFn(lines[n-1]);
        if (lines[n-1] !== before) changed = true;
    });
    if (changed) {
        fs.writeFileSync(file, lines.join("\n"), "utf8");
        console.log("Fixed: " + file.split("/").pop());
    } else {
        console.log("No change needed for: " + file.split("/").pop() + " (checking raw content)");
        lineNums.forEach(n => console.log("  L" + n + ": " + JSON.stringify(lines[n-1].trim().substring(0, 80))));
    }
});
