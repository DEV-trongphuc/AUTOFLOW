const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const archiveRootFiles = path.join(rootDir, '_ARCHIVE_GARBAGE', 'root');

if (!fs.existsSync(archiveRootFiles)) fs.mkdirSync(archiveRootFiles, { recursive: true });

let movedMdCount = 0;
const preserveMd = ['README.md', 'ARCHITECTURE.md'];

function scanAndMoveMdFiles() {
    const files = fs.readdirSync(rootDir);
    
    files.forEach(file => {
        const fPath = path.join(rootDir, file);
        if (!fs.statSync(fPath).isFile()) return;

        let basename = path.basename(file);

        if (basename.endsWith('.md') && !preserveMd.includes(basename)) {
            try {
                fs.renameSync(fPath, path.join(archiveRootFiles, file));
                movedMdCount++;
            } catch (e) {
                console.error(`Error moving ${file}:`, e.message);
            }
        }
    });
}

scanAndMoveMdFiles();
console.log(`MD Garbage Collection quarantined: ${movedMdCount} files.`);
