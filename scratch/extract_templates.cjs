const fs = require('fs');

const sql = fs.readFileSync('api/demo_data.sql.sql', 'utf8');
const lines = sql.split('\n');
const templateLines = lines.filter(l => l.includes('INSERT INTO `templates`'));

const templates = [];

// Very hacky parse for the first 8 lines
for (let i = 0; i < Math.min(8, templateLines.length); i++) {
    const line = templateLines[i];
    
    // We can extract parts by doing a split on `, ` assuming it's not in the text, 
    // or just use regex matching `(?<=\(|, )'([^']|'')*'(?=\)|, )` 
    // Actually, let's just find the first few string fields.
    // Structure: `id`, `name`, `thumbnail`, `category`, `group_id`, `blocks`, `body_style`, `html_content`, ...
    
    const fields = [];
    let current = '';
    let inString = false;
    let escape = false;
    
    const valuePartMatch = line.match(/VALUES\s*\((.*)\);/);
    if (!valuePartMatch) continue;
    const valuePart = valuePartMatch[1];
    
    for (let j = 0; j < valuePart.length; j++) {
        const char = valuePart[j];
        if (char === "'" && !escape) {
            inString = !inString;
            if (!inString) {
                fields.push(current);
                current = '';
            }
        } else if (char === '\\' && !escape) {
            escape = true;
        } else {
            if (inString) {
                current += char;
            }
            escape = false;
        }
    }
    
    if (fields.length >= 8) {
        templates.push({
            id: fields[0],
            name: fields[1],
            thumbnail: fields[2],
            category: fields[3],
            // fields[5] is blocks, fields[7] is html_content
            html_content: fields[7],
            created_at: new Date().toISOString(),
            status: 'active'
        });
    }
}

fs.writeFileSync('public/data/demo_templates.json', JSON.stringify(templates, null, 2));
console.log(`Extracted ${templates.length} templates!`);
