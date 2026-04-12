const fs = require("fs");
const p = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const c = fs.readFileSync(p, "utf8");
const lines = c.split("\n");
const suspicious = [];
lines.forEach((l, i) => {
    const skip = l.includes("api.post") || l.includes("api.get") || l.includes("route=") || l.includes("const res") || l.includes("=>") || l.includes("stepConfig?") || l.includes("resendingParticipant?") || l.includes("selectedBranch?") || l.includes("className=");
    if (skip) return;
    if (/[\uFFFD]|\b[a-z]\?[a-z\s]|H\?y|Th\?|c\?ng\b|b\?c\b|n\?y\b|d\?u\b|th\?ng\b|nh\?nh\b|t\?o\b/.test(l)) {
        suspicious.push((i+1) + ": " + l.trim().substring(0, 120));
    }
});
console.log(suspicious.length === 0 ? "✅ FULLY CLEAN!" : "Issues:\n" + suspicious.join("\n"));
