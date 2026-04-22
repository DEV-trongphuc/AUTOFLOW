const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = path.join(__dirname, '../api/demo_data.sql.sql');
const outputFile = path.join(__dirname, '../src/data/real_demo_data.json');

const tablesToExtract = [
    'ai_chatbot_categories',
    'ai_chatbots',
    'ai_chatbot_settings',
    'ai_chatbot_scenarios',
    'ai_conversations',
    'ai_messages',
    'ai_chat_queries',
    'subscribers',
    'campaigns',
    'flows'
];

const data = {};
tablesToExtract.forEach(t => data[t] = []);

async function processLineByLine() {
    if (!fs.existsSync(inputFile)) {
        console.error('SQL file not found at:', inputFile);
        return;
    }

    const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentTable = null;
    let insertBuffer = '';

    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `')) {
            const match = line.match(/^INSERT INTO `([^`]+)`/);
            if (match && tablesToExtract.includes(match[1])) {
                currentTable = match[1];
                insertBuffer = line;
                if (line.trim().endsWith(';')) {
                    parseInsert(currentTable, insertBuffer);
                    currentTable = null;
                    insertBuffer = '';
                }
            }
        } else if (currentTable) {
            insertBuffer += '\n' + line;
            if (line.trim().endsWith(';')) {
                parseInsert(currentTable, insertBuffer);
                currentTable = null;
                insertBuffer = '';
            }
        }
    }
    
    console.log('Extraction complete. Post-processing data...');
    postProcess(data);
    
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`Saved extracted data to ${outputFile}`);
}

function parseInsert(table, sqlStr) {
    const colMatch = sqlStr.match(/\(([^)]+)\)\s+VALUES/i);
    if (!colMatch) return;
    const cols = colMatch[1].split(',').map(s => s.trim().replace(/`/g, ''));
    
    const valuesStr = sqlStr.substring(sqlStr.indexOf('VALUES') + 6).trim().replace(/;$/, '');
    
    let rows = [];
    let currentRow = [];
    let currentValue = '';
    let inString = false;
    let escape = false;
    let inParen = 0;
    
    for (let i = 0; i < valuesStr.length; i++) {
        const c = valuesStr[i];
        if (escape) {
            currentValue += c;
            escape = false;
        } else if (c === '\\') {
            escape = true;
            currentValue += c;
        } else if (c === "'") {
            inString = !inString;
            currentValue += c;
        } else if (!inString) {
            if (c === '(') {
                if (inParen > 0) currentValue += c;
                inParen++;
            } else if (c === ')') {
                inParen--;
                if (inParen === 0) {
                    currentRow.push(currentValue);
                    rows.push(currentRow);
                    currentRow = [];
                    currentValue = '';
                } else {
                    currentValue += c;
                }
            } else if (c === ',' && inParen === 1) {
                currentRow.push(currentValue);
                currentValue = '';
            } else {
                if (inParen > 0) currentValue += c;
            }
        } else {
            currentValue += c;
        }
    }
    
    rows.forEach(r => {
        if (r.length === cols.length) {
            let obj = {};
            for (let i = 0; i < cols.length; i++) {
                let val = r[i].trim();
                if (val.startsWith("'") && val.endsWith("'")) {
                    val = val.substring(1, val.length - 1);
                    val = val.replace(/\\'/g, "'").replace(/\\\\/g, "\\").replace(/\\r\\n/g, "\\n").replace(/\\n/g, "\\n");
                } else if (val === 'NULL') {
                    val = null;
                } else if (!isNaN(val) && val !== '') {
                    val = Number(val);
                }
                obj[cols[i]] = val;
            }
            data[table].push(obj);
        }
    });
}

function postProcess(d) {
    for (const t in d) {
        if (d[t].length > 500) d[t] = d[t].slice(0, 500); // Limit to avoid heavy JSON
    }
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/g;

    function anonymize(str) {
        if (typeof str !== 'string' || !str) return str;
        let res = str.replace(emailRegex, (match) => {
            const parts = match.split('@');
            return `demo.${parts[0].substring(0, 3)}***@domation.net`;
        });
        res = res.replace(phoneRegex, '099***999');
        return res;
    }

    if (d.ai_conversations) {
        d.ai_conversations.forEach(c => {
            c.last_message = anonymize(c.last_message);
            c.metadata = anonymize(c.metadata);
        });
    }
    if (d.ai_messages) {
        d.ai_messages.forEach(m => {
            m.message = anonymize(m.message);
        });
    }
    if (d.ai_chat_queries) {
        d.ai_chat_queries.forEach(m => {
            m.query_text = anonymize(m.query_text);
            m.response_text = anonymize(m.response_text);
        });
    }
    if (d.subscribers) {
        d.subscribers.forEach(s => {
            s.email = anonymize(s.email);
            s.phone = anonymize(s.phone);
            s.email_address = anonymize(s.email_address); // sometimes different column
            if (s.stat_opens) s.stat_opens = Math.floor(Number(s.stat_opens) * 25) + 120;
            if (s.stat_clicks) s.stat_clicks = Math.floor(Number(s.stat_clicks) * 30) + 40;
        });
    }
    if (d.campaigns) {
        d.campaigns.forEach(c => {
            if (c.stat_sent) c.stat_sent = Math.floor(Number(c.stat_sent) * 15) + 5000;
            if (c.stat_opened) c.stat_opened = Math.floor(Number(c.stat_opened) * 20) + 2000;
            if (c.stat_clicked) c.stat_clicked = Math.floor(Number(c.stat_clicked) * 25) + 800;
        });
    }
    if (d.flows) {
        d.flows.forEach(f => {
             if (f.stat_enrolled) f.stat_enrolled = Math.floor(Number(f.stat_enrolled) * 10) + 1000;
             if (f.stat_completed) f.stat_completed = Math.floor(Number(f.stat_completed) * 10) + 800;
        });
    }
}

processLineByLine().catch(console.error);
