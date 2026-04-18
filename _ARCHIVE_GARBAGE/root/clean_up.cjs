const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/tabs/FlowAnalyticsTab.tsx";
let content = fs.readFileSync(path, "utf8");
content = content.replace(/Nhật ký\ufffd/g, "Nhật ký");
fs.writeFileSync(path, content, "utf8");
console.log("Cleaned up trailing char.");
