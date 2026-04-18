
const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/config/EmailActionConfig.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(/currentSaved = currentSaved\.filter\(e => e !== 'marketing@ka-en\.com\.vn'\);/g, ''); 
text = text.replace(/\/\/ Auto scrub mock email/g, '');
text = text.replace(/if \(currentSaved\.length === 0\) \{\s*\}/g, '');

const insertAfter = let currentSaved: string[] = JSON.parse(localStorage.getItem('mailflow_verified_emails') || '[]');;
const filterStr = \n            currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn');\n;

if (text.includes(insertAfter) && !text.includes(filterStr.trim())) {
    text = text.replace(insertAfter, insertAfter + filterStr);
    fs.writeFileSync(path, text, 'utf8');
    console.log('Fixed properly globally.');
} else {
    console.log('Already fixed or not found.');
}

