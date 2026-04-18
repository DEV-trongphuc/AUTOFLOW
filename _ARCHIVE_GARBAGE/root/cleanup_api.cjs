const fs = require('fs');
const path = require('path');

function getFiles(dir, filter, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            // Ignore _archive and logs during scan
            if (!filePath.includes('_archive') && !filePath.includes('logs')) {
                getFiles(filePath, filter, fileList);
            }
        } else if (filter.test(filePath)) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// 1. Gather all API files
const apiDir = path.join(__dirname, 'api');
const archiveDir = path.join(__dirname, 'api', '_archive');

if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

const allPhpFiles = getFiles(apiDir, /\.php$/);
const allPhpBasenames = new Set(allPhpFiles.map(f => path.basename(f)));

// 2. Scan frontend for explicit API usages
const frontendDirs = ['pages', 'components', 'src'].map(d => path.join(__dirname, d));
let frontendCode = "";
for (const d of frontendDirs) {
    if (fs.existsSync(d)) {
        const files = getFiles(d, /\.(ts|tsx|js|jsx)$/);
        files.forEach(f => {
            frontendCode += "\n" + fs.readFileSync(f, 'utf8');
        });
    }
}

const usedByFrontend = new Set();
for (const php of allPhpBasenames) {
    if (frontendCode.includes(php)) {
        usedByFrontend.add(php);
    }
}

// Custom manual additions for Dynamic Fetchers like `fetchApi('subscribers')`
const dynamicEndpoints = ['campaigns', 'subscribers', 'flows', 'tags', 'segments', 'templates', 'lists', 'roles', 'settings', 'admin_users', 'workspaces', 'audit_all_tracking_endpoints', 'admin_stats']; 
for (const endpoint of dynamicEndpoints) {
    if (allPhpBasenames.has(endpoint + '.php')) {
        usedByFrontend.add(endpoint + '.php');
    }
}

// 3. Scan backend for dependencies
const dependencies = {}; // file -> Set of files it requires
allPhpFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const base = path.basename(f);
    dependencies[base] = new Set();
    
    const regex = /(?:require|include|require_once|include_once)\s*\(?['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        let reqFile = match[1];
        if(reqFile.includes('/')) {
            reqFile = path.basename(reqFile);
        }
        if (allPhpBasenames.has(reqFile)) {
            dependencies[base].add(reqFile);
        }
    }
});

// 4. Trace from Entry Points
const activeFiles = new Set();
const entryPoints = new Set([
    ...Array.from(usedByFrontend),
    // Known Webhooks & Entry Configs
    'webhook.php', 'meta_webhook.php', 'zalo_webhook.php', 'ses_webhook.php',
    'zalo_oauth_callback.php', 'login_google.php', 'track.php', 'verify_indexes.php',
    'db_connect.php', 'flow_helpers.php', 'segment_helper.php', 'trigger_helper.php',
    // Known Workers / Cron jobs
    ...allPhpFiles.map(f => path.basename(f)).filter(name => name.startsWith('worker_') || name.startsWith('cron_') || name.startsWith('orchestrator_'))
]);

function traceDependencies(file) {
    if (activeFiles.has(file)) return;
    activeFiles.add(file);
    if (dependencies[file]) {
        for (const req of dependencies[file]) {
            traceDependencies(req);
        }
    }
}

entryPoints.forEach(ep => traceDependencies(ep));

// Exclude core classes that might not be matched (PHPMailer)
['PHPMailer.php', 'SMTP.php', 'Exception.php', 'zalo_api.md'].forEach(c => activeFiles.add(c));

// 5. Categorize Unused Files
let movedCount = 0;
const unusedFiles = Array.from(allPhpFiles).filter(f => !activeFiles.has(path.basename(f)));

unusedFiles.forEach(f => {
    const basename = path.basename(f);
    
    // Safety check - do not move index.html or anything not .php, or core utils
    if (basename === 'index.html' || basename === 'db_connect.php') return;

    const destPath = path.join(archiveDir, basename);
    
    // Move the file
    try {
        fs.renameSync(f, destPath);
        movedCount++;
    } catch (e) {
        console.error(`Failed to move ${basename}: ${e.message}`);
    }
});

console.log(`=== GC EXECUTOR ===`);
console.log(`Scanned ${allPhpFiles.length} PHP Files.`);
console.log(`Marked ${activeFiles.size} as Active.`);
console.log(`Successfully Quarantined ${movedCount} Unused Files into: /api/_archive/`);
