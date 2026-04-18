const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/config/EmailActionConfig.tsx';
let text = fs.readFileSync(path, 'utf8');

const targetBlock = // Auto scrub mock email
            if (currentSaved.length === 0) {
                currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn');
            };

if (text.includes(targetBlock)) {
    text = text.replace(targetBlock, // Xóa triệt để email mock bị lưu trong bộ nhớ tạm từ những phiên trước
            currentSaved = currentSaved.filter(e => e !== 'marketing@ka-en.com.vn'););
    fs.writeFileSync(path, text, 'utf8');
    console.log('Fixed properly!');
} else {
    console.log('Block not found.');
}
