
const fs = require('fs');
const path = require('path');

const ROOT = '/workspace';
const REPORT = [];
const FIXED = [];
const SKIP_EXT = new Set(['.pyc', '.pyo', '.so', '.o', '.a', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar', '.gz', '.whl', '.ttf', '.woff', '.woff2']);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const f of list) {
        if (f.startsWith('.') || f === 'node_modules' || f === '__pycache__' || f === '.git') continue;
        const fp = path.join(dir, f);
        try {
            const stat = fs.statSync(fp);
            if (stat.isDirectory()) results = results.concat(walk(fp));
            else results.push(fp);
        } catch(e) {}
    }
    return results;
}

const allFiles = walk(ROOT);
const fileIndex = new Map();
for (const f of allFiles) {
    fileIndex.set(path.basename(f), f);
}

function findTarget(brokenPath, sourceDir) {
    if (brokenPath.startsWith('http://') || brokenPath.startsWith('https://') || brokenPath.startsWith('mailto:') || brokenPath.startsWith('#') || brokenPath.startsWith('tel:') || brokenPath.startsWith('javascript:')) return null;
    
    let cleanPath = brokenPath.split('#')[0].split('?')[0];
    if (!cleanPath) return null;

    if (cleanPath.startsWith('file:///')) {
        cleanPath = cleanPath.replace('file://', '');
    }
    
    if (path.isAbsolute(cleanPath)) {
        if (fs.existsSync(cleanPath)) return { target: cleanPath, relative: path.relative(sourceDir, cleanPath) };
        const basename = path.basename(cleanPath);
        if (fileIndex.has(basename)) {
            return { target: fileIndex.get(basename), relative: path.relative(sourceDir, fileIndex.get(basename)) };
        }
        return null;
    }
    
    const resolved = path.resolve(sourceDir, cleanPath);
    if (fs.existsSync(resolved)) return { target: resolved, relative: cleanPath };
    
    const basename = path.basename(cleanPath);
    if (fileIndex.has(basename)) {
        const target = fileIndex.get(basename);
        return { target, relative: path.relative(sourceDir, target) };
    }
    
    return null;
}

const LINK_PATTERNS = [
    { regex: /href\s*=\s*["']([^"']+)["']/g, group: 1, attr: 'href' },
    { regex: /src\s*=\s*["']([^"']+)["']/g, group: 1, attr: 'src' },
    { regex: /\[(?:[^\]]+)\]\(([^)]+)\)/g, group: 1, attr: 'mdlink' },
];

const SCAN_EXT = new Set(['.html', '.md', '.htm', '.css', '.js']);

for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!SCAN_EXT.has(ext)) continue;
    
    let content;
    try {
        content = fs.readFileSync(file, 'utf8');
    } catch(e) { continue; }
    
    const sourceDir = path.dirname(file);
    let newContent = content;
    let fileFixes = [];
    
    for (const pat of LINK_PATTERNS) {
        const matches = [...content.matchAll(pat.regex)];
        for (const m of matches) {
            const orig = m[pat.group];
            if (!orig || orig.startsWith('data:') || orig.startsWith('http://') || orig.startsWith('https://') || orig.startsWith('mailto:') || orig.startsWith('#') || orig.startsWith('tel:') || orig.startsWith('javascript:')) continue;
            
            let targetPath = orig.split('#')[0].split('?')[0];
            if (!targetPath) continue;
            
            let resolvedPath;
            if (targetPath.startsWith('file:///')) {
                resolvedPath = targetPath.replace('file://', '');
            } else if (path.isAbsolute(targetPath)) {
                resolvedPath = targetPath;
            } else {
                resolvedPath = path.resolve(sourceDir, targetPath);
            }
            
            if (!fs.existsSync(resolvedPath)) {
                const fix = findTarget(orig, sourceDir);
                if (fix && fix.relative) {
                    let newLink = fix.relative.replace(/\\/g, '/');
                    if (!newLink.startsWith('.') && !newLink.startsWith('/')) newLink = './' + newLink;
                    
                    const hashPart = orig.includes('#') ? '#' + orig.split('#')[1] : '';
                    const newFull = newLink + hashPart;
                    
                    newContent = newContent.split(orig).join(newFull);
                    fileFixes.push({ from: orig, to: newFull, target: fix.target });
                    FIXED.push({ file, from: orig, to: newFull });
                } else {
                    REPORT.push({ file, broken: orig, resolved: resolvedPath });
                }
            }
        }
    }
    
    if (fileFixes.length > 0) {
        fs.writeFileSync(file, newContent, 'utf8');
    }
}

fs.writeFileSync(path.join(ROOT, 'tools', 'broken_links_report.json'), JSON.stringify(REPORT, null, 2));
fs.writeFileSync(path.join(ROOT, 'tools', 'fixed_links.json'), JSON.stringify(FIXED, null, 2));

console.log('=== 扫描完成 ===');
console.log('已修复链接数:', FIXED.length);
console.log('剩余断链数:', REPORT.length);
if (REPORT.length > 0) {
    console.log('\n--- 剩余无法自动修复的断链 ---');
    for (const r of REPORT) console.log(`${r.file}: ${r.broken}`);
}
