const fs = require("fs");
const content = fs.readFileSync("e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx", "utf8");
const lines = content.split("\n");
lines.forEach((l, i) => { if(l.includes("T?") && l.includes("TB")) console.log(i+1, l.trim()); });
