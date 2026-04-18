const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');
const archiveApiFiles = path.join(__dirname, '_ARCHIVE_GARBAGE', 'api');

let movedApiCount = 0;

function scanAndMoveApiFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fPath = path.join(dir, file);
        if (!fs.statSync(fPath).isFile()) return;

        let basename = path.basename(file).toLowerCase();
        let shouldMove = false;

        // Missing prefixes in previous run:
        if (basename.startsWith('view_') || basename.includes('test')) {
            // Keep main testing framework if it exists? No, mostly debug tools.
            shouldMove = true;
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
console.log(`Final Sweep GC Quarantined: ${movedApiCount} additional files.`);
