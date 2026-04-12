const fs = require("fs");

// Check actual content at those lines
const checks = [
    { file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/ai/training/AITrainingDetail.tsx", line: 1636 },
    { file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/CampaignDetailDrawer.tsx", line: 332 },
    { file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx", line: 366 },
    { file: "e:/AUTOFLOW/AUTOMATION_FLOW/components/web-tracking/VisitorsTab.tsx", line: 187 },
];

checks.forEach(({ file, line }) => {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    const l = lines[line - 1] || "(not found)";
    console.log(file.split("/").pop() + ":" + line + ": " + JSON.stringify(l.trim().substring(0, 120)));
});
