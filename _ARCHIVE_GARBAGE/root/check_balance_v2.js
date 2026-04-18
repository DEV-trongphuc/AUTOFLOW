
const fs = require('fs');
const path = require('path');
const filePath = 'pages/CategoryChatPage.tsx';

try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Remove comments (block and line) to avoid false positives
    // Be careful with URLs in strings like 'http://...'
    // A simple regex for comments:
    const noComments = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

    let stack = [];
    let lines = content.split('\n'); // Keep line numbers for reporting errors, but we need to parse char by char or token by token

    // Regex to find tags. We need to handle multi-line attributes.
    // We will index the content and find all <... > blocks.
    const tagRegex = /<\/?(div|Modal|main)(\s[^>]*)?\/?>/gy;

    // We'll iterate through all matches in the full content
    let match;
    let pos = 0;

    // Helper to get line number from position
    function getLineNumber(index) {
        return content.substring(0, index).split('\n').length;
    }

    // We can't easily remove comments without messing up indices for line numbers if we just replacing.
    // Let's iterate and skip comments manually or just rely on the fact that tags usually don't appear in comments in TSX except maybe in strings.
    // For now, let's use the regex on the whole content and hope for the best, checking if match is inside a string/comment would be ideal but complex.
    // Let's assume standard formatting where tags are meaningful.

    const matches = [...content.matchAll(/<\/?(div|Modal|main)\b[^>]*\/?>/g)];

    matches.forEach(m => {
        const tag = m[0];
        const index = m.index;
        const lineNum = getLineNumber(index);

        // Check if self-closing
        if (/\/>$/.test(tag)) return;

        // Check if closing
        if (tag.startsWith('</')) {
            const tagName = tag.match(/^<\/(div|Modal|main)/)[1];
            if (stack.length === 0) {
                console.log(`Error: Closing tag </${tagName}> on line ${lineNum} has no matching open tag.`);
            } else {
                const last = stack.pop();
                if (last.tagName !== tagName) {
                    console.log(`Error: Tag mismatch at line ${lineNum}. Expected </${last.tagName}> (from line ${last.lineNum}), but found </${tagName}>.`);
                    // Recover: put matching tag back if possible or just ignore?
                    // Strategy: assume missing closing tag for 'last', so we popped 'last' (implicitly closed), and now we check 'last's parent against current closing tag?
                    // Or assume extra closing tag?
                    // For simple balancing, specific errors help.
                }
            }
        } else {
            // Opening tag
            const tagName = tag.match(/^<(div|Modal|main)/)[1];
            stack.push({ tagName, lineNum });
        }
    });

    if (stack.length > 0) {
        console.log('\nRemaining open tags:');
        stack.forEach(s => {
            console.log(`<${s.tagName}> open on line ${s.lineNum}`);
        });
    } else {
        console.log('All tags are balanced!');
    }

} catch (e) {
    console.error(e);
}
