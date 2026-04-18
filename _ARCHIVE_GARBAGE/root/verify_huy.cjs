const fs = require("fs");
const p = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const c = fs.readFileSync(p, "utf8");
const lines = c.split("\n");

// Final verification: print lines 735, 1430, 1523, 1573, 1630
[735, 1430, 1523, 1573, 1630].forEach(n => {
    console.log(n + ":", lines[n-1].trim().substring(0, 100));
});

