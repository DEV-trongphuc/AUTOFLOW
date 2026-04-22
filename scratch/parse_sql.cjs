const fs = require('fs');

const sql = fs.readFileSync('api/demo_data.sql.sql', 'utf8');

// Find the section for templates
// INSERT INTO `templates` (`id`, `name`, `thumbnail`, `category`, `group_id`, `blocks`, `body_style`, `html_content`, `created_at`, `updated_at`, `type`, `subject`, `workspace_id`) VALUES
// ('...', '...', '...', ...)

const regex = /INSERT INTO `templates` \(`id`, `name`, `thumbnail`, `category`, `group_id`, `blocks`, `body_style`, `html_content`, `created_at`, `updated_at`, `type`, `subject`, `workspace_id`\) VALUES\s*\n\(([\s\S]*?)\);/g;

const templates = [];
let match;
let count = 0;

while ((match = regex.exec(sql)) !== null && count < 8) {
    const rawArgs = match[1];
    
    // We can evaluate this as an array if we carefully replace NULL and fix escaping
    // But evaluating arbitrary strings is hard. 
    // Let's do a simple parse: split by comma, respecting quotes.
    const fields = [];
    let current = '';
    let inQuotes = false;
    let escape = false;
    
    for (let i = 0; i < rawArgs.length; i++) {
        const char = rawArgs[i];
        if (char === "'" && !escape) {
            inQuotes = !inQuotes;
        } else if (char === '\\' && !escape) {
            escape = true;
            current += char;
            continue;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
            escape = false;
            continue;
        }
        current += char;
        escape = false;
    }
    fields.push(current.trim());
    
    // Cleanup quotes from strings
    const cleanStr = (s) => {
        if (!s) return '';
        if (s.startsWith("'") && s.endsWith("'")) {
            return s.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
        }
        return s === 'NULL' ? null : s;
    };
    
    const id = cleanStr(fields[0]);
    const name = cleanStr(fields[1]);
    const thumbnail = cleanStr(fields[2]);
    const category = cleanStr(fields[3]);
    const html_content = cleanStr(fields[7]);
    const subject = cleanStr(fields[11]);
    
    templates.push({
        id,
        name,
        thumbnail,
        category,
        html_content,
        subject,
        status: 'active',
        created_at: new Date().toISOString()
    });
    count++;
}

fs.writeFileSync('public/data/demo_templates.json', JSON.stringify(templates, null, 2));
console.log(`Extracted ${templates.length} templates successfully!`);
