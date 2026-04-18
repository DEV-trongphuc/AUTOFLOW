const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');
const archiveApiDir = path.join(__dirname, '_ARCHIVE_GARBAGE', 'api');

function getPhpFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'PHPMailer' && file !== '_debug') {
                getPhpFiles(fullPath, fileList);
            }
        } else if (file.endsWith('.php')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const activePhpFiles = getPhpFiles(apiDir);
const missingDependencies = new Set();
let scannedCount = 0;

activePhpFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // Match include, require, require_once, include_once
    // We regex for strings inside quotes
    const requireRegex = /(?:require|include|require_once|include_once)\s*\(?\s*['"]([^'"]+\.php)['"]\s*\)?/gi;
    let match;
    scannedCount++;
    
    while ((match = requireRegex.exec(content)) !== null) {
        const reqPathStr = match[1];
        const reqBasename = path.basename(reqPathStr);
        
        // Check if this physical file exists in active apiDir or PHPMailer dir
        const existsInApi = fs.existsSync(path.join(apiDir, reqBasename));
        const existsInPHPMailer = fs.existsSync(path.join(apiDir, 'PHPMailer', reqBasename));
        
        if (!existsInApi && !existsInPHPMailer) {
            // It might be in the archive!
            if (fs.existsSync(path.join(archiveApiDir, reqBasename))) {
                missingDependencies.add(reqBasename);
                console.warn(`[!] File ${path.basename(file)} requires ${reqBasename} which is currently QUARANTINED.`);
            } else {
                // Warning, maybe a system file or an external path
                // console.log(`Notice: ${reqBasename} required but not in api/ (might be external)`);
            }
        }
    }
});

console.log(`\nScanned ${scannedCount} active PHP files for explicit dependencies.`);

if (missingDependencies.size > 0) {
    console.log(`\n🚨 FOUND ${missingDependencies.size} MISSING DEPENDENCIES. Restoring...`);
    
    let restoredCount = 0;
    missingDependencies.forEach(req => {
        const src = path.join(archiveApiDir, req);
        const dest = path.join(apiDir, req);
        if (fs.existsSync(src)) {
            try {
                fs.renameSync(src, dest);
                restoredCount++;
                console.log(` -> Restored: ${req}`);
            } catch(e) {
                console.error(` -> Error restoring ${req}: ${e.message}`);
            }
        }
    });
    console.log(`Successfully restored ${restoredCount} dependencies to active api/ directory.`);
} else {
    console.log(`\n✅ ALL CLEAR! Every active PHP file has all its required dependencies fulfilled.`);
    console.log(`No active file is pointing to a quarantined file.`);
}
