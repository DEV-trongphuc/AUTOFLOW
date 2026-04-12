const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");
const suspicious = [];
lines.forEach((l, i) => {
    if (/[\uFFFD]/.test(l) || /[?]{1}[a-z]|Kh\?ng|T\?m|Ch\?n|Tr\?ng|Th\?i|G\?i|L\?i|Th\?m|B\?o|c\?ng|b\?c|d\?u|th\?ng|nh\?nh|t\?t|t\?o|h\?ng/.test(l)) {
        suspicious.push((i+1) + ": " + l.trim().substring(0, 120));
    }
});
console.log(suspicious.length === 0 ? "CLEAN - no more corrupted text!" : suspicious.join("\n"));
