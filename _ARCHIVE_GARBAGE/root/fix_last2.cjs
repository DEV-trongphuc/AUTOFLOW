const fs = require("fs");
const p = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
let c = fs.readFileSync(p, "utf8");
const lines = c.split("\n");

// Fix remaining 3 specific lines
lines[1031] = "                                                                <MessageSquare className=\"w-3 h-3\" /> ZNS đã gửi\r";
lines[1205] = "                                            <span className=\"inline-flex items-center gap-1 font-bold text-blue-600\" title={`Kiểm tra - Làm mới mỗi 1 phút. Hết hạn lúc: ${new Date(Date.now() + 30000).toLocaleTimeString()}`}>\r";

c = lines.join("\n");
fs.writeFileSync(p, c, "utf8");
console.log("Last 2 targeted lines fixed!");
