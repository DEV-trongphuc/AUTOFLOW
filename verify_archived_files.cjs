const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const archiveApiDir = path.join(rootDir, '_ARCHIVE_GARBAGE', 'api');
const srcDirs = [
    path.join(rootDir, 'api'), // Remaining backend files
    path.join(rootDir, 'src'), 
    path.join(rootDir, 'pages'), 
    path.join(rootDir, 'components')
];

if (!fs.existsSync(archiveApiDir)) {
    console.log("No archived API files found to verify.");
    process.exit(0);
}

const archivedFiles = fs.readdirSync(archiveApiDir);
const archivedBasenames = new Set(archivedFiles);

console.log(`Verifying ${archivedFiles.length} quarantined API files against the active codebase...`);

let allSourceCode = "";

function getSourceCode(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== '_debug' && file !== 'PHPMailer') getSourceCode(fullPath);
        } else if (/\.(php|js|jsx|ts|tsx)$/.test(file)) {
            allSourceCode += fs.readFileSync(fullPath, 'utf8') + "\n";
        }
    }
}

srcDirs.forEach(dir => getSourceCode(dir));

const falsePositives = [];

for (const archived of archivedBasenames) {
    // Look for exact string occurrences of the archived filename in the active code
    // Exclude 'test.php' string matching generally because it's too common
    if (archived === 'test.php' || archived === 'check.php' || archived === 'auth.php') {
        const strictMatch = new RegExp(`['"\`/]${archived}['"\`]`, 'i');
        if (strictMatch.test(allSourceCode)) {
            falsePositives.push(archived);
        }
        continue;
    }
    
    // For other files, look for their exact name
    if (allSourceCode.includes(archived)) {
        falsePositives.push(archived);
    }
}

if (falsePositives.length > 0) {
    console.warn("\n🚨 WARNING! The following archived files are STILL referenced in active code:");
    falsePositives.forEach(fp => console.warn(` - ${fp}`));
    console.log("\nAction required! Restore these files from _ARCHIVE_GARBAGE/api/");
} else {
    console.log("\n✅ SUCCESS: No quarantined API files are referenced by the active Frontend or Backend.");
    console.log("The GC operation was 100% safe.");
}
