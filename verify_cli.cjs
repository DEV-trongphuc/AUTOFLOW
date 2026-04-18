const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const apiDir = path.join(__dirname, 'api');
const archiveApiDir = path.join(__dirname, '_ARCHIVE_GARBAGE', 'api');

function getActiveFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'PHPMailer' && file !== '_debug' && file !== 'node_modules' && file !== '_ARCHIVE_GARBAGE') {
                getActiveFiles(fullPath, fileList);
            }
        } else if (/\.(php|js|jsx|ts|tsx)$/.test(file)) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const activeSourceFiles = getActiveFiles(rootDir);
let scannedCount = 0;
const missingCLI = new Set();

activeSourceFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Match exec('php something.php') or popen('php something.php')
        const cliRegex = /(?:exec|shell_exec|system|passthru|popen|trigger_async)\s*\(?\s*['"][^'"]*php\s+([^'"\s]+\.php)/gi;
        let match;
        scannedCount++;
        
        while ((match = cliRegex.exec(content)) !== null) {
            const reqPathStr = match[1];
            const reqBasename = path.basename(reqPathStr);
            
            // If the triggered PHP script exists in the active API, we are fine.
            const existsInApi = fs.existsSync(path.join(apiDir, reqBasename));
            
            if (!existsInApi) {
                // Was it quarantined?
                if (fs.existsSync(path.join(archiveApiDir, reqBasename))) {
                    missingCLI.add(reqBasename);
                    console.warn(`[!] File ${path.basename(file)} triggers CLI script ${reqBasename} which is QUARANTINED.`);
                }
            }
        }
    } catch(e) {}
});

console.log(`\nScanned ${scannedCount} active files for Backend CLI executions.`);

if (missingCLI.size > 0) {
    console.log(`\n🚨 FOUND ${missingCLI.size} MISSING CLI SCRIPTS. Restoring...`);
    
    let restoredCount = 0;
    missingCLI.forEach(req => {
        const src = path.join(archiveApiDir, req);
        const dest = path.join(apiDir, req);
        if (fs.existsSync(src)) {
            try {
                fs.renameSync(src, dest);
                restoredCount++;
                console.log(` -> Restored: ${req}`);
            } catch(e) {
            }
        }
    });
    console.log(`Successfully restored ${restoredCount} CLI dependencies to active api/ directory.`);
} else {
    console.log(`\n✅ ALL CLEAR! No active file uses CLI exec/shell_exec to trigger any quarantined script.`);
}
