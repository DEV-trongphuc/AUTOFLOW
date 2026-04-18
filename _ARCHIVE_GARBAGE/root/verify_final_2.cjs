const fs = require("fs");
const content = fs.readFileSync("e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/CampaignDetailDrawer.tsx", "utf8");
const lines = content.split("\n");
console.log(lines[326].trim());
