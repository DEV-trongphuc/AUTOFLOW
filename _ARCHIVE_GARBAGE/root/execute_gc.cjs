const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const apiDir = path.join(rootDir, 'api');
const archiveRoot = path.join(rootDir, '_ARCHIVE_GARBAGE');
const archiveRootFiles = path.join(archiveRoot, 'root');
const archiveApiFiles = path.join(archiveRoot, 'api');

// Create Archive Directories
[archiveRoot, archiveRootFiles, archiveApiFiles].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

let movedRootCount = 0;
let movedApiCount = 0;

// ==========================================
// 1. CLEAN ROOT DIRECTORY
// ==========================================
const rootFiles = fs.readdirSync(rootDir);
rootFiles.forEach(file => {
    const fPath = path.join(rootDir, file);
    if (!fs.statSync(fPath).isFile()) return; // Only process files

    let isGarbage = false;

    // Detect Python & CJS scripts used for fixing/maintenance
    if (file.endsWith('.py') || file.endsWith('.cjs')) {
        // Keep eslint config if any
        if (file !== 'eslint.config.cjs') isGarbage = true;
    }
    
    // Detect compiler text dumps
    if (file.startsWith('tsc_') && file.endsWith('.txt')) isGarbage = true;
    if (file.startsWith('eslint-output')) isGarbage = true;
    if (file === 'temp_stats.txt' || file === 'pages_list.txt') isGarbage = true;
    
    // HTML dumps
    if (file === 'cleanup_workspace.html' || file === 'diag_output.html') isGarbage = true;

    // Stray SQL in root
    if (file.endsWith('.sql')) isGarbage = true;
    
    // Old fix files
    if (file.startsWith('fix_') && file.endsWith('.js')) isGarbage = true;
    if (file.startsWith('check_') && file.endsWith('.js')) isGarbage = true;

    // DO NOT touch vite.config.ts, package.json, App.tsx, etc.

    if (isGarbage) {
        try {
            fs.renameSync(fPath, path.join(archiveRootFiles, file));
            movedRootCount++;
        } catch (e) {
            console.error(`Error moving ${file}:`, e.message);
        }
    }
});

// ==========================================
// 2. CLEAN API DIRECTORY (Prefix Based)
// ==========================================
const prefixes = [
    'test_', 'debug_', 'diag_', 'check_', 'audit_', 
    'fix_', 'migrate_', 'migration_', 'rescue_', 'recover_', 
    'clean_', 'cleanup_', 'temp_', 'tmp_', 'scan_', 'verify_', 'diagnose_', 'setup_'
];

// Special Exact match filters for old leftovers
const exactMatches = ['test.php', 'testp.php', 'aisave.php.php', 'db_indexes_audit.sql', 'perf_fix_indexes.sql', 'diagnostics.php'];

function scanAndMoveApiFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fPath = path.join(dir, file);
        if (!fs.statSync(fPath).isFile()) return;

        let basename = path.basename(file).toLowerCase();
        let shouldMove = false;

        // Check Prefix
        for (const pre of prefixes) {
            if (basename.startsWith(pre)) {
                shouldMove = true;
                break;
            }
        }

        // Check Exact Match
        if (exactMatches.includes(basename)) {
            shouldMove = true;
        }

        // Never touch core configs / logs (for safety)
        if (basename === 'db_connect.php' || basename.endsWith('.md')) {
            shouldMove = false;
        }

        if (shouldMove) {
            try {
                fs.renameSync(fPath, path.join(archiveApiFiles, file));
                movedApiCount++;
            } catch (e) {
                console.error(`Error moving ${file}:`, e.message);
            }
        }
    });
}

scanAndMoveApiFiles(apiDir);

console.log(`=== SURGICAL GARBAGE COLLECTION COMPLETED ===`);
console.log(`Root files quarantined: ${movedRootCount}`);
console.log(`API files quarantined: ${movedApiCount}`);
console.log(`All files safely stored in: _ARCHIVE_GARBAGE`);
