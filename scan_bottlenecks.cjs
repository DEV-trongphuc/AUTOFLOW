const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');

function getActiveFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'PHPMailer' && file !== '_debug' && file !== '_ARCHIVE_GARBAGE') {
                getActiveFiles(fullPath, fileList);
            }
        } else if (file.endsWith('.php')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const files = getActiveFiles(apiDir);
console.log(`Scanning ${files.length} active PHP files...`);

const results = {
    nPlusOne: [],
    unboundFetch: [],
    unsafeSql: [],
    missingLock: []
};

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const basename = path.basename(file);
    
    // 1. N+1 Queries (Query inside loop)
    // Basic heuristic: look for while, for, foreach followed by query or fetch inside its block
    // Simplified regex: match loop keyword, then capture everything until next loop or function end, check for query
    if (/(?:foreach|while|for)\s*\(.*?\)\s*\{[^}]*(?:query\(|prepare\(|execute\()/s.test(content)) {
        // Need to be careful with false positives, we'll flag it for review
        results.nPlusOne.push(basename);
    }
    
    // 2. Unbound fetchAll without LIMIT in the preceding query
    // This is hard to do statically, but we can look for `SELECT.*FROM` without `LIMIT` and then `fetchAll`
    // Alternatively, look for fetchAll
    if (content.includes('fetchAll()')) {
        // Does the file have LIMIT in its SQL?
        if (!/LIMIT\s+\d+/i.test(content) && !/\$limit/.test(content)) {
            results.unboundFetch.push(basename);
        }
    }

    // 3. Unsafe String Interpolation in queries
    // query("SELECT ... $var ...") or query('...'.$var.'...')
    // We look for variables inside query() calls.
    const queryRegex = /->(?:query|prepare)\s*\([\s]*"([^"]*\$[^"]*)"\)/g;
    if (queryRegex.test(content)) {
        results.unsafeSql.push(basename);
    }

    // 4. Missing FOR UPDATE SKIP LOCKED in workers
    if (basename.startsWith('worker_') || basename.startsWith('orchestrator_')) {
        if (/SELECT.*FROM/i.test(content) && !/FOR UPDATE SKIP LOCKED|FOR UPDATE/i.test(content)) {
            // Might not need it if updating without select, but good to flag
            results.missingLock.push(basename);
        }
    }
});

console.log("\n--- POTENTIAL BOTTLENECKS FOUND ---");
console.log(`\nN+1 Loops (Query inside loop) - Flagged ${results.nPlusOne.length} files:`);
console.log([...new Set(results.nPlusOne)].join(", "));

console.log(`\nUnbound fetchAll (No LIMIT visible) - Flagged ${results.unboundFetch.length} files:`);
console.log([...new Set(results.unboundFetch)].join(", "));

console.log(`\nUnsafe SQL String Interpolation - Flagged ${results.unsafeSql.length} files:`);
console.log([...new Set(results.unsafeSql)].join(", "));

console.log(`\nWorkers possibly missing FOR UPDATE Locks - Flagged ${results.missingLock.length} files:`);
console.log([...new Set(results.missingLock)].join(", "));

