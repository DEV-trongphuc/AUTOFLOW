
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'pages', 'CategoryChatPage.tsx');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const stack = [];

    // Remove comments
    const noComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    const lines = noComments.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Match tags
        // This regex matches <div...>, <div.../>, and </div>
        const regex = /<(div|Modal|main)\b([\s\S]*?)([\/]?)>|<\/(div|Modal|main)>/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const fullMatch = match[0];
            if (fullMatch.startsWith('</')) {
                const tagName = match[4];
                if (stack.length === 0) {
                    console.log(`Error: Closing tag </${tagName}> on line ${lineNum} has no matching open tag.`);
                } else {
                    const [lastTag, lastLine] = stack.pop();
                    if (lastTag !== tagName) {
                        console.log(`Error: Tag mismatch at line ${lineNum}. Expected </${lastTag}> (from line ${lastLine}), but found </${tagName}>.`);
                    }
                }
            } else {
                const tagName = match[1];
                const isSelfClosing = match[3] === '/';
                if (!isSelfClosing) {
                    stack.push([tagName, lineNum]);
                }
            }
        }
    }

    if (stack.length > 0) {
        console.log('\nRemaining open tags:');
        stack.forEach(([tag, line]) => {
            console.log(`<${tag}> open on line ${line}`);
        });
    } else {
        console.log('All tags are balanced!');
    }
} catch (e) {
    console.error('Error in script:', e);
}
