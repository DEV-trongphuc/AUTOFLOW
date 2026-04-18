const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");
const suspicious = [];
lines.forEach((l, i) => {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD\u00C2\u00C3\u0080-\u00BF]/.test(l) || /[\?\?]{2,}|[?]{1}[a-z]|Kh\?ng|T\?m|Ch\?n|Tr\?ng|Th\?i|Danh s\?ch|G\?i|L\?i|Th\?m|B\?o/.test(l)) {
        suspicious.push((i+1) + ": " + l.trim().substring(0, 120));
    }
});
console.log(suspicious.join("\n"));
