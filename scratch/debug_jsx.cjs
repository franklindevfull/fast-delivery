const fs = require('fs');
const content = fs.readFileSync('d:\\projeto-delivery-fast-git\\fast-delivery\\views\\POS.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let inJSX = false;

lines.forEach((line, idx) => {
    if (line.includes('return (')) inJSX = true;
    if (!inJSX) return;

    // Basic tag regex. Handles <tag> and </tag>. Ignores comments and strings broadly.
    // This is a naive parser but can help find obvious mismatches.
    const tagRegex = /<(\/?[a-zA-Z0-9]+)(\s+[^>]*?)?(\/?)>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        const tagName = match[1];
        const isClosing = tagName.startsWith('/');
        const isSelfClosing = match[3] === '/' || ['input', 'img', 'br', 'hr', 'textarea', 'Icons'].some(t => tagName.includes(t));
        
        if (!isSelfClosing) {
            if (isClosing) {
                const pureName = tagName.substring(1);
                if (stack.length > 0) {
                    stack.pop();
                } else {
                    console.log(`Extra closing tag at line ${idx + 1}: ${tagName}`);
                }
            } else {
                stack.push({ name: tagName, line: idx + 1 });
            }
        }
    }
});

console.log('Unclosed tags:', stack);
