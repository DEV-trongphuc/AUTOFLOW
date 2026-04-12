const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/config/EmailActionConfig.tsx';
let text = fs.readFileSync(path, 'utf8');

const target = // Fallback default
            if (currentSaved.length === 0) {
                currentSaved = ['marketing@ka-en.com.vn'];
            };
            
const replacement = // Lọc bỏ email mock mặc định nằm vùng trong localStorage
            currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn');;

if (text.includes(target)) {
    text = text.replace(target, replacement);
    fs.writeFileSync(path, text, 'utf8');
    console.log('Fixed hardcoded email.');
} else {
    // If not exact match, try regex
    text = text.replace(/currentSaved\s*=\s*\['marketing@ka-en\.com\.vn'\];/g, "// removed marketing email fallback");
    
    // Also add the filter right before checking settings
    text = text.replace(/let currentSaved[^;]+;/g, "let currentSaved: string[] = JSON.parse(localStorage.getItem('mailflow_verified_emails') || '[]');\n            currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn');");
    fs.writeFileSync(path, text, 'utf8');
    console.log('Fixed hardcoded email using regex.');
}
