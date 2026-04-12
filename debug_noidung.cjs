const fs = require("fs");
const content = fs.readFileSync("e:/AUTOFLOW/AUTOMATION_FLOW/components/campaigns/CampaignDetailDrawer.tsx", "utf8");
const lines = content.split("\n");
const line = lines[324]; 
console.log(line.trim());
for(let i=0; i<line.length; i++) console.log(line[i], line.charCodeAt(i));
