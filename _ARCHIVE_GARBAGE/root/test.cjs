const fs = require('fs');

let text = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/settings/ZaloOAManager.tsx', 'utf8');
const lines = text.split('\n');
const line = lines.find(l => l.includes('OA</p>'));

console.log(line.trim());
for (let i = 0; i < Math.min(line.length, 60); i++) {
    console.log(line[i], line.charCodeAt(i));
}
