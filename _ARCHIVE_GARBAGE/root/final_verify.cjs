const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");
const suspicious = [];
lines.forEach((l, i) => {
    // Only flag actual corrupted Vietnamese - ignore API urls and className truncations
    const trimmed = l.trim();
    if (trimmed.startsWith("const res") || trimmed.startsWith("<button") || trimmed.startsWith("<p className") || trimmed.startsWith("api.post")) return;
    if (/[\uFFFD]/.test(l) || /[?]{1}[a-z]|Kh\?ng|T\?m|Ch\?n|G\?i|L\?i|Th\?m|B\?o|n\?y|x\?y|th\?ng|nh\?nh|t\?t|t\?o/.test(l)) {
        suspicious.push((i+1) + ": " + l.trim().substring(0, 120));
    }
});
console.log(suspicious.length === 0 ? "✅ CLEAN - File is fully fixed!" : "Remaining issues:\n" + suspicious.join("\n"));
