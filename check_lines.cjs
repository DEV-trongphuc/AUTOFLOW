const fs = require("fs");
const path = "e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx";
const content = fs.readFileSync(path, "utf8");
const lines = content.split("\n");
const check = [154, 157, 243, 244, 297, 300, 335, 366, 380, 432, 561, 562, 621, 643, 702, 752, 760, 775, 793, 807, 808, 822, 869, 885, 894, 982, 1060, 1275, 1289, 1300, 1309, 1349, 1385, 1418, 1434, 1446, 1451, 1467, 1531, 1548, 1549, 1581, 1598, 1638];
check.forEach(n => console.log(n + ":", lines[n-1]));
