const fs = require("fs");
const content = fs.readFileSync("e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx", "utf8");
const line = content.split("\n")[900];
console.log(line.trim());
