const fs = require("fs");
const p = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
let c = fs.readFileSync(p, "utf8");
const lines = c.split("\n");

// Fix "Hủy b?" -> "Hủy bỏ" on all 4 occurrences
[1430, 1523, 1573, 1630].forEach(lineNum => {
    const idx = lineNum - 1;
    lines[idx] = lines[idx].replace(/H\u1ee7y b\?/, "Hủy bỏ");
});

// Fix line 735: title="Bỏ chọn tất cả" (truncated)
lines[734] = lines[734].replace(/title=\"B\"/, `title="Bỏ chọn tất cả"`);
// Also check the full pattern
lines[734] = lines[734].replace(/title=\"B\?[^\"]*\"/, `title="Bỏ chọn tất cả"`);

c = lines.join("\n");
fs.writeFileSync(p, c, "utf8");
console.log("Fixed Hủy bỏ and title attribute");
