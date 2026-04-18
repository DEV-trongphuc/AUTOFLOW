const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/config/EmailActionConfig.tsx';
let text = fs.readFileSync(path, 'utf8');

const target1 = "// Fallback default";
const target2 = "currentSaved = ['marketing@ka-en.com.vn'];";

if (text.includes(target2)) {
    text = text.replace(target1, "// Auto scrub mock email");
    text = text.replace(target2, "currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn');");
    fs.writeFileSync(path, text, 'utf8');
    console.log('Fixed hardcoded email.');
} else {
    console.log('Target not found.');
}
