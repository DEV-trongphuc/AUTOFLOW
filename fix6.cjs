const fs = require('fs');

let f1 = 'components/flows/config/TriggerConfig.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/return 'Khi khách Hủy đăng ký;/g, "return 'Khi khách Hủy đăng ký';");
fs.writeFileSync(f1, c1, 'utf8');

let f2 = 'components/flows/tabs/FlowAnalyticsTab.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/Automation \{currentFlow\.status === 'active' \? 'Đang chờ : 'd. d\?ng'\}/g, "Automation {currentFlow.status === 'active' ? 'Đang chờ' : 'Đã dừng'}");
fs.writeFileSync(f2, c2, 'utf8');
