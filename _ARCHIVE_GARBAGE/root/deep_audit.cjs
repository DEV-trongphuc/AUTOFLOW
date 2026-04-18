const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, 'api');

function findFiles(dir, filter, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, filter, fileList);
        } else if (filter.test(filePath)) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const phpFiles = findFiles(API_DIR, /\.php$/);
const issues = {
    nPlusOne: [],
    fetchAllNoLimit: [],
    possibleSqlInject: []
};

phpFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const basename = path.basename(file);
    
    // 1. Check N+1: Look for execute/query/prepare inside a foreach or while loop
    const loopRegex = /(?:foreach\s*\(.*?\)[\s\S]*?\{[\s\S]*?(?:->prepare\(|->query\(|->execute\()[\s\S]*?\})|(?:while\s*\(.*?\)[\s\S]*?\{[\s\S]*?(?:->prepare\(|->query\(|->execute\()[\s\S]*?\})/gi;
    
    let match;
    while ((match = loopRegex.exec(content)) !== null) {
        // Exclude some safe patterns if needed
        if (!content.substring(match.index, match.index + 200).includes("INSERT IGNORE INTO subscriber_tags")) {
            // Count line number
            const lines = content.substring(0, match.index).split('\n');
            const snippet = content.substring(match.index, match.index + 100).replace(/\n/g, ' ');
            issues.nPlusOne.push(`${basename}:${lines.length} -> Loop DB call: ${snippet}...`);
        }
    }
    
    // 2. Check fetchAll without LIMIT
    // Look for SELECT ... followed eventually by fetchAll, but where SELECT has no LIMIT
    // This is hard to do robustly with Regex, but we can look for strings containing SELECT but not Limit, near fetchAll
    const allSelects = [...content.matchAll(/(?:->prepare\(|->query\()(['"]SELECT.*?['"])/gi)];
    allSelects.forEach(selMatch => {
        const sql = selMatch[1];
        if (!sql.toUpperCase().includes('LIMIT') && sql.toUpperCase().includes('FROM')) {
            // Did they use fetchAll near here?
            const linesToSearch = content.substring(selMatch.index, selMatch.index + 500);
            if (linesToSearch.includes('->fetchAll(')) {
                const lines = content.substring(0, selMatch.index).split('\n');
                issues.fetchAllNoLimit.push(`${basename}:${lines.length} -> Potential Unbound fetchAll: ${sql.substring(0, 100)}`);
            }
        }
    });

    // 3. String Concatenation in SQL
    const concatRegex = /(?:->prepare\(|->query\()(['"]SELECT.*?['"]\s*\.\s*\$)/gi;
    while ((match = concatRegex.exec(content)) !== null) {
        const lines = content.substring(0, match.index).split('\n');
        issues.possibleSqlInject.push(`${basename}:${lines.length} -> String concatenation in query`);
    }
});

console.log("=== PERFORMANCE N+1 BOTTLENECK AUDIT ===");
issues.nPlusOne.forEach(i => console.log(i));
console.log("\n=== MEMORY LEAK AUDIT (FETCH_ALL NO LIMIT) ===");
issues.fetchAllNoLimit.forEach(i => console.log(i));
console.log("\n=== SQL INJECTION & BAD QUERY AUDIT ===");
issues.possibleSqlInject.forEach(i => console.log(i));
