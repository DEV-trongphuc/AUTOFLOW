const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const archivePublic = path.join(rootDir, '_ARCHIVE_GARBAGE', 'public');
const archiveScratch = path.join(rootDir, '_ARCHIVE_GARBAGE', 'scratch');

if (!fs.existsSync(archivePublic)) fs.mkdirSync(archivePublic, { recursive: true });
if (!fs.existsSync(archiveScratch)) fs.mkdirSync(archiveScratch, { recursive: true });

let movedPublic = 0;
let movedScratch = 0;

// CLEAN PUBLIC
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
    const publicFiles = fs.readdirSync(publicDir);
    publicFiles.forEach(file => {
        const basename = file.toLowerCase();
        let isGarbage = false;

        if (basename.includes(' - fix_') || basename.endsWith('.bak')) isGarbage = true;
        if (basename.startsWith('check_') || basename.startsWith('debug_') || basename.startsWith('test_')) isGarbage = true;
        if (basename === 'testlive.php.txt' || basename === 'list_gemini_models.php') isGarbage = true;

        if (isGarbage) {
            try {
                fs.renameSync(path.join(publicDir, file), path.join(archivePublic, file));
                movedPublic++;
            } catch (e) {
                console.error(`Error moving ${file}:`, e.message);
            }
        }
    });
}

// CLEAN SCRATCH
const scratchDir = path.join(rootDir, 'scratch');
if (fs.existsSync(scratchDir)) {
    const scratchFiles = fs.readdirSync(scratchDir);
    scratchFiles.forEach(file => {
        const fPath = path.join(scratchDir, file);
        if (fs.statSync(fPath).isFile()) {
            try {
                fs.renameSync(fPath, path.join(archiveScratch, file));
                movedScratch++;
            } catch (e) {
                console.error(`Error moving ${file}:`, e.message);
            }
        }
    });
}

console.log(`Public GC quarantined: ${movedPublic} files.`);
console.log(`Scratch GC quarantined: ${movedScratch} files.`);
