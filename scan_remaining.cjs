const fs = require("fs");
const p = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const c = fs.readFileSync(p, "utf8");
const lines = c.split("\n");
lines.forEach((l, i) => {
    // Show ALL lines with ? followed by < or end of string that look like UI strings
    if (/H\?y|h\?y|b\?|th\?|t\?|l\?|c\?|n\?|m\?|v\?|d\?|g\?|ch\?|nh\?/.test(l) && !l.includes("api.post") && !l.includes("api.get") && !l.includes("const res") && !l.includes("route=")) {
        console.log((i+1) + ": " + l.trim().substring(0, 120));
    }
});
