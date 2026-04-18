const fs = require('fs');
const path = require('path');

function getFiles(dir, filter, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, filter, fileList);
        } else if (filter.test(filePath)) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// 1. Gather all API files
const apiDir = path.join(__dirname, 'api');
const allPhpFiles = getFiles(apiDir, /\.php$/);
const allPhpBasenames = new Set(allPhpFiles.map(f => path.basename(f)));

// 2. Scan frontend for explicit API usages
const frontendDirs = ['pages', 'components', 'src'].map(d => path.join(__dirname, d));
let frontendCode = "";
for (const d of frontendDirs) {
    const files = getFiles(d, /\.(ts|tsx|js|jsx)$/);
    files.forEach(f => {
        frontendCode += "\n" + fs.readFileSync(f, 'utf8');
    });
}

const usedByFrontend = new Set();
for (const php of allPhpBasenames) {
    // Check if the exact filename is referenced anywhere in frontend
    if (frontendCode.includes(php)) {
        usedByFrontend.add(php);
        // also strip extension to check
    } else if (frontendCode.includes(php.replace('.php', ''))) {
        // Warning: this could be false positive, e.g. "campaigns" for campaigns.php
        // We'll rely on strict string matching for now, as fetch(`/api/${action}.php`) might be used
    }
}

// Custom manual additions for Dynamic Fetchers like `fetchApi('subscribers')`
const dynamicEndpoints = ['campaigns', 'subscribers', 'flows', 'tags', 'segments', 'templates', 'lists', 'roles', 'settings', 'admin_users', 'workspaces', 'audit_all_tracking_endpoints']; 
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
    
    // match require '...', include '...', require_once '...'
    const regex = /(?:require|include|require_once|include_once)\s*\(?['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const reqFile = path.basename(match[1]);
        if (allPhpBasenames.has(reqFile)) {
            dependencies[base].add(reqFile);
        }
    }
});

// 4. Trace from Entry Points
const activeFiles = new Set();
const entryPoints = new Set([
    ...Array.from(usedByFrontend),
    // Known Webhooks
    'webhook.php', 'meta_webhook.php', 'zalo_webhook.php', 'ses_webhook.php',
    'zalo_oauth_callback.php', 'login_google.php', 'track.php', 'verify_indexes.php',
    // Known Workers / Cron jobs
    ...allPhpFiles.map(f => path.basename(f)).filter(name => name.startsWith('worker_') || name.startsWith('cron_')),
    // Entry configs
    'db_connect.php', 'flow_helpers.php', 'segment_helper.php', 'trigger_helper.php'
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

// 5. Categorize Unused Files
const unusedFiles = Array.from(allPhpBasenames).filter(f => !activeFiles.has(f));

const categories = {
    'Tests & Debugging': [],
    'Migrations & Schema Checks': [],
    'Diagnostics & Fixes': [],
    'Temporary & Backup': [],
    'Uncategorized': []
};

unusedFiles.forEach(f => {
    if (/^(test_|debug_|view_|check_|audit_)/.test(f)) {
        categories['Tests & Debugging'].push(f);
    } else if (/^(migrate_|migration_|add_|setup_|update_schema|check_schema)/.test(f)) {
        categories['Migrations & Schema Checks'].push(f);
    } else if (/^(fix_|diag_|rescue_|recover|emergency_|restore_|clean_|purge_|reset_)/.test(f)) {
        categories['Diagnostics & Fixes'].push(f);
    } else if (/^(temp_|tmp_|_old|v2|v3|copy)/.test(f)) {
        categories['Temporary & Backup'].push(f);
    } else {
        // Could be valid endpoints missed by the trace.
        // We will put them here for review.
        categories['Uncategorized'].push(f);
    }
});

console.log("=== API CLEANUP PLAN ===");
console.log(`Total PHP Files: ${allPhpBasenames.size}`);
console.log(`Active / Used Files: ${activeFiles.size}`);
console.log(`Candidates for Deletion: ${unusedFiles.length}\n`);

for (const [cat, files] of Object.entries(categories)) {
    console.log(`\n### ${cat} (${files.length} files)`);
    console.log(files.sort().join('\n'));
}

