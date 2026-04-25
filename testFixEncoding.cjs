const fs = require('fs');
const iconv = require('iconv-lite');

const filePath = 'e:/AUTOFLOW/AUTOMATION_FLOW/pages/LinksQR.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Convert string to bytes using Windows-1252 (ANSI)
const bytes = iconv.encode(content, 'win1252');

// Convert bytes back to string using UTF-8
const restored = iconv.decode(bytes, 'utf8');

fs.writeFileSync(filePath + '.test', restored, 'utf8');
console.log('Restored sample: ' + restored.substring(200, 300));
