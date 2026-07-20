const fs = require('fs');
const path = require('path');

const indexContent = fs.readFileSync('/workspace/index.html', 'utf8');
const hrefRegex = /href=["']([^"']+)["']/g;
const links = new Set();
let match;

while ((match = hrefRegex.exec(indexContent)) !== null) {
    const href = match[1];
    if (!href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('http')) {
        const cleanHref = href.split('#')[0].split('?')[0];
        if (cleanHref) links.add(cleanHref);
    }
}

console.log('🔗 总控台链接到的页面:\n');
const sortedLinks = Array.from(links).sort();
for (const link of sortedLinks) {
    const fullPath = path.resolve('/workspace', link);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${link}`);
}
