const fs = require('fs');
const path = require('path');

const directoryPaths = [
    'components',
    'pages',
    'services',
    'hooks',
    'contexts'
];

function getAllFiles(dir, fileArray = []) {
    if (!fs.existsSync(dir)) return fileArray;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, fileArray);
        } else {
            if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
                fileArray.push(fullPath);
            }
        }
    }
    return fileArray;
}

let targetFiles = ['App.tsx'];
for (const dir of directoryPaths) {
    targetFiles = targetFiles.concat(getAllFiles(path.join(__dirname, '..', dir)));
}

let modifiedCount = 0;

for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Detect if this file needs processing
    if (
        !content.includes('API_BASE') && 
        !content.includes('apiUrl') && 
        !content.includes('baseUrl') && 
        !content.includes('DEFAULT_API_URL') &&
        !content.includes('https://automation.ideas.edu.vn/mail_api')
    ) {
        continue;
    }

    // Skip the config file itself
    if (filePath.endsWith('config.ts')) continue;
    // Skip Settings.tsx for automatic rename as it uses useState('...') 
    if (filePath.includes('Settings.tsx')) continue;

    // Remove isLocal definitions
    content = content.replace(/const\s+isLocal\s*=\s*(typeof\s*window\s*!==\s*'undefined'\s*&&\s*)?\n?\s*\(?window\.location\.hostname\s*===\s*'localhost'\s*\|\|\s*window\.location\.hostname\s*===\s*'127\.0\.0\.1'\)?;\n?/g, '');
    content = content.replace(/const\s+isLocal\s*=\s*['"]?localhost['"]?\s*===\s*window\.location\.hostname.*?\n/g, '');

    // Remove various API_BASE definitions
    content = content.replace(/const\s+API_BASE\s*=\s*isLocal\s*\?\s*['"]\/mail_api['"]\s*:\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    content = content.replace(/const\s+API_BASE_URL\s*=\s*isLocal\s*\?\s*['"]\/mail_api['"]\s*:\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    content = content.replace(/const\s+API_BASE\s*=\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    
    // Remove localStorage variants
    content = content.replace(/const\s+apiUrl\s*=\s*localStorage\.getItem\(['"]mailflow_api_url['"]\)\s*\|\|\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    content = content.replace(/const\s+apiUrl\s*=\s*isLocal\s*\?\s*['"]\/mail_api['"]\s*:\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    content = content.replace(/const\s+baseUrl\s*=\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');
    content = content.replace(/const\s+DEFAULT_API_URL\s*=\s*isLocal\s*\?\s*['"]\/mail_api['"]\s*:\s*['"]https:\/\/automation\.ideas\.edu\.vn\/mail_api['"];\n?/g, '');

    // Rename variables inside strings/templates
    content = content.replace(/\$\{API_BASE\}/g, '${API_BASE_URL}');
    content = content.replace(/\$\{apiUrl\}/g, '${API_BASE_URL}');
    content = content.replace(/\$\{baseUrl\}/g, '${API_BASE_URL}');
    content = content.replace(/\$\{DEFAULT_API_URL\}/g, '${API_BASE_URL}');

    // Direct string concatenations
    content = content.replace(/API_BASE \+/g, 'API_BASE_URL +');
    content = content.replace(/apiUrl \+/g, 'API_BASE_URL +');
    content = content.replace(/DEFAULT_API_URL /g, 'API_BASE_URL ');
    
    // Replace raw string literal occurrences embedded in code 
    // Example: fetch('https://automation.ideas.edu.vn/mail_api/send_test_email.php'
    content = content.replace(/['"`]https:\/\/automation\.ideas\.edu\.vn\/mail_api(.*?)[`"']/g, '`${API_BASE_URL}$1`');

    // If it was changed, inject the import at the top
    if (content !== originalContent) {
        // Ensure API_BASE_URL is imported exactly once
        if (!content.includes("import { API_BASE_URL } from '@/utils/config'")) {
            // Find last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + 
                          "import { API_BASE_URL } from '@/utils/config';\n" + 
                          content.slice(endOfLastImport + 1);
            } else {
                content = "import { API_BASE_URL } from '@/utils/config';\n\n" + content;
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Refactored: ${filePath}`);
        modifiedCount++;
    }
}

console.log(`\nDone. Refactored ${modifiedCount} files.`);
