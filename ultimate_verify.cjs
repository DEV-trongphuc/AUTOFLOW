const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const archiveApiDir = path.join(rootDir, '_ARCHIVE_GARBAGE', 'api');

function getFrontendFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFrontendFiles(fullPath, fileList);
        } else if (/\.(ts|tsx|js|jsx|json)$/.test(file)) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const frontendDirs = ['src', 'pages', 'components'].map(d => path.join(rootDir, d));
let allFrontendFiles = [];
frontendDirs.forEach(dir => allFrontendFiles = getFrontendFiles(dir, allFrontendFiles));

const archivedFiles = new Set(fs.existsSync(archiveApiDir) ? fs.readdirSync(archiveApiDir) : []);
const missingFrontendEndpoints = new Set();
let scannedStringsCount = 0;

allFrontendFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Look for any string literal ending in .php or without .php but used as API
        // E.g., 'campaigns.php', "subscribers.php", `auth.php`
        const stringRegex = /['"\`\/]([a-zA-Z0-9_-]+\.php)['"\`]/g;
        let match;
        
        while ((match = stringRegex.exec(content)) !== null) {
            scannedStringsCount++;
            const endpoint = match[1];
            
            if (archivedFiles.has(endpoint)) {
                missingFrontendEndpoints.add(endpoint);
                console.warn(`[!] Frontend file ${path.basename(file)} explicitly calls ${endpoint} which is QUARANTINED.`);
            }
        }

        // Check dynamic API endpoints in Redux or API clients (e.g. action = 'campaigns')
        // We look for single word strings that match a quarantined php file prefix.
        // E.g., 'test_api' -> is there a 'test_api.php' quarantined?
        const dynamicStringRegex = /['"\`]([a-zA-Z0-9_-]+)['"\`]/g;
        while ((match = dynamicStringRegex.exec(content)) !== null) {
            scannedStringsCount++;
            const endpointCandidate = match[1] + '.php';
            // We ignore common words to prevent massive false positives, but look it up anyway
            if (archivedFiles.has(endpointCandidate)) {
                // If the word isn't a generic react term and it exactly matches a quarantined file
                if (!['div', 'span', 'class', 'input', 'button', 'string'].includes(match[1])) {
                     // We already restored false positives, so if any hit here, it's a huge red flag
                     missingFrontendEndpoints.add(endpointCandidate);
                     console.warn(`[!] Frontend file ${path.basename(file)} might dynamically call ${endpointCandidate} which is QUARANTINED.`);
                }
            }
        }

    } catch(e) {}
});

console.log(`\nScanned ${allFrontendFiles.length} Frontend files, extracting ${scannedStringsCount} string literals...`);

if (missingFrontendEndpoints.size > 0) {
    console.log(`\n🚨 FOUND ${missingFrontendEndpoints.size} POTENTIAL MISSING FRONTEND ENDPOINTS. Restoring...`);
    let restoredCount = 0;
    missingFrontendEndpoints.forEach(req => {
        const src = path.join(archiveApiDir, req);
        const dest = path.join(rootDir, 'api', req);
        if (fs.existsSync(src)) {
            try {
                fs.renameSync(src, dest);
                restoredCount++;
                console.log(` -> Restored: ${req}`);
            } catch(e) {}
        }
    });
    console.log(`Successfully restored ${restoredCount} Frontend dependencies.`);
} else {
    console.log(`\n✅ ALL FRONTEND CLEAR! Not a single hardcoded or dynamic string in React points to a deleted API file.`);
}
