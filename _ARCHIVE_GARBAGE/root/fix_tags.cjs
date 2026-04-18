const fs = require("fs");

// Fix specific broken tags found
const fixes = [
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/audience/AudienceSplitModal.tsx",
        from: /Tổng sốhiện/g,
        to: "Tổng số hiện"
    },
    {
        file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/common/Pagination.tsx",
        // "trong Tổng sốspan " should be "trong Tổng số</span>"
        from: /trong Tổng sốspan\s/g,
        to: "trong Tổng số</span> "
    }
];

fixes.forEach(({ file, from, to }) => {
    if (!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, "utf8");
    const before = c;
    c = c.replace(from, to);
    if (c !== before) {
        fs.writeFileSync(file, c, "utf8");
        console.log("Fixed: " + file);
    } else {
        console.log("No match in: " + file);
    }
});
