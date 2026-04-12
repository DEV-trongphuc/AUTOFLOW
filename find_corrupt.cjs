const fs = require("fs");
const content = fs.readFileSync("e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx", "utf8");
const corrupted = [];
corrupted.push(...content.matchAll(/[^\x00-\x7F\xC0-\xDF\xE0-\xEF\xF0-\xF7]/g));
const uniqueCorrupted = [...new Set(corrupted.map(m => m[0]))];
console.log("Unique Non-ASCII/Non-UTF8 Chars: " + uniqueCorrupted.join(" "));
console.log("Lines with ?: ");
const lines = content.split("\n");
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes("?") || lines[i].includes("\uFFFD")) {
        console.log((i+1) + ": " + lines[i].trim());
    }
}
