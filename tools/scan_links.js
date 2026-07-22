const fs = require('fs');
const path = require('path');

const ROOT = '/workspace';
const results = [];
const broken = [];

function walk(dir, exts) {
  const files = [];
  function _walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === '.git' || e.name === 'node_modules' || e.name === '__pycache__' || e.name.startsWith('.pids') || e.name.startsWith('.logs')) continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) { _walk(full); }
        else if (exts.some(ext => e.name.endsWith(ext))) { files.push(full); }
      }
    } catch(e) {}
  }
  _walk(dir);
  return files;
}

function resolveLink(baseFile, link) {
  let cleaned = link.split('#')[0].split('?')[0];
  if (!cleaned || cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('mailto:') || cleaned.startsWith('javascript:') || cleaned.startsWith('tel:') || cleaned === '') return null;
  const baseDir = path.dirname(baseFile);
  return path.resolve(baseDir, cleaned);
}

const htmlFiles = walk(ROOT, ['.html', '.htm']);
const mdFiles = walk(ROOT, ['.md']);
const allFiles = [...htmlFiles, ...mdFiles];

console.log(`扫描 ${htmlFiles.length} 个HTML文件 + ${mdFiles.length} 个MD文件 = ${allFiles.length} 个文件\n`);

const hrefRegex = /(?:href|src|action|data|poster|background)\s*=\s*["']([^"']+)["']/gi;
const mdLinkRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const links = [];

  let m;
  hrefRegex.lastIndex = 0;
  while ((m = hrefRegex.exec(content)) !== null) {
    links.push({ raw: m[1], line: content.substring(0, m.index).split('\n').length });
  }

  if (file.endsWith('.md')) {
    mdLinkRegex.lastIndex = 0;
    while ((m = mdLinkRegex.exec(content)) !== null) {
      links.push({ raw: m[2], line: content.substring(0, m.index).split('\n').length });
    }
  }

  for (const { raw, line } of links) {
    const resolved = resolveLink(file, raw);
    if (!resolved) continue;
    const exists = fs.existsSync(resolved);
    results.push({ file: rel, link: raw, line, resolved, exists });
    if (!exists) {
      broken.push({ file: rel, link: raw, line, resolved });
    }
  }
}

console.log(`===== 总链接数: ${results.length} =====`);
console.log(`===== 断链数: ${broken.length} =====\n`);

if (broken.length > 0) {
  console.log('===== 断链列表 =====');
  const byFile = {};
  for (const b of broken) {
    if (!byFile[b.file]) byFile[b.file] = [];
    byFile[b.file].push(b);
  }
  for (const [f, bs] of Object.entries(byFile)) {
    console.log(`\n📄 ${f}`);
    for (const b of bs) {
      console.log(`   L${b.line}: "${b.link}" → ${path.relative(ROOT, b.resolved)}`);
    }
  }
} else {
  console.log('🎉 所有链接均有效！');
}

fs.writeFileSync('/tmp/broken_links.json', JSON.stringify(broken, null, 2));
