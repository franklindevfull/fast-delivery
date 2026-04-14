const fs = require('fs');
const content = fs.readFileSync('d:\\projeto-delivery-fast-git\\fast-delivery\\views\\POS.tsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let inJSX = false;

lines.forEach((line, idx) => {
    if (line.includes('return (')) inJSX = true;
    if (!inJSX) return;

    const tagRegex = /<(\/?[a-zA-Z0-9]+)(\s+[^>]*?)?(\/?)>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        const tagName = match[1];
        const isClosing = tagName.startsWith('/');
        const isSelfClosing = match[3] === '/' || ['input', 'img', 'br', 'hr', 'textarea'].includes(tagName.toLowerCase());
        
        if (!isSelfClosing) {
            if (isClosing) depth--;
            else depth++;
        }
    }
    if (depth < 0) {
        console.log(`Negative depth at line ${idx + 1}: ${depth}`);
    }
});
console.log('Final depth:', depth);
