const fs = require('fs');
const path = require('path');

const workspaceRoot = '/workspace';
const brokenLinks = [];
const allHtmlFiles = [];

function findAllHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'node_modules' || file === '.git') continue;
            findAllHtmlFiles(fullPath);
        } else if (file.endsWith('.html')) {
            allHtmlFiles.push(fullPath);
        }
    }
}

function resolvePath(baseFile, href) {
    if (href.startsWith('http://') || href.startsWith('https://') || 
        href.startsWith('#') || href.startsWith('javascript:') || 
        href.startsWith('mailto:') || href.startsWith('tel:')) {
        return null;
    }
    
    let cleanHref = href.split('#')[0].split('?')[0];
    if (!cleanHref) return null;
    
    const baseDir = path.dirname(baseFile);
    return path.resolve(baseDir, cleanHref);
}

function fileExists(targetPath) {
    try {
        return fs.existsSync(targetPath);
    } catch (e) {
        return false;
    }
}

console.log('🔍 开始扫描所有HTML文件...\n');
findAllHtmlFiles(workspaceRoot);
console.log(`📄 找到 ${allHtmlFiles.length} 个HTML文件\n`);

console.log('🔗 检查所有链接...\n');
for (const htmlFile of allHtmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const relativePath = path.relative(workspaceRoot, htmlFile);
    
    const hrefRegex = /href=["']([^"']+)["']/g;
    const srcRegex = /src=["']([^"']+)["']/g;
    
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
        const href = match[1];
        const targetPath = resolvePath(htmlFile, href);
        if (targetPath && !fileExists(targetPath)) {
            brokenLinks.push({
                file: relativePath,
                link: href,
                target: path.relative(workspaceRoot, targetPath),
                type: 'href'
            });
        }
    }
    
    while ((match = srcRegex.exec(content)) !== null) {
        const src = match[1];
        const targetPath = resolvePath(htmlFile, src);
        if (targetPath && !fileExists(targetPath)) {
            brokenLinks.push({
                file: relativePath,
                link: src,
                target: path.relative(workspaceRoot, targetPath),
                type: 'src'
            });
        }
    }
}

if (brokenLinks.length === 0) {
    console.log('✅ 所有链接检查通过！没有发现断链。\n');
} else {
    console.log(`❌ 发现 ${brokenLinks.length} 个断链:\n`);
    for (const broken of brokenLinks) {
        console.log(`📄 ${broken.file}`);
        console.log(`   ${broken.type}: ${broken.link}`);
        console.log(`   目标不存在: ${broken.target}\n`);
    }
}

console.log('\n📋 检查侧边栏（仅index.html应该有）...\n');
const sidebarIssues = [];
for (const htmlFile of allHtmlFiles) {
    const relativePath = path.relative(workspaceRoot, htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf8');
    const hasSidebar = content.includes('sidebar.js') || content.includes('id="sidebar"') || content.includes('class="sidebar"');
    const isIndex = htmlFile.endsWith(path.sep + 'index.html') && path.dirname(htmlFile) === workspaceRoot;
    
    if (hasSidebar && !isIndex && !relativePath.includes('game-os-main')) {
        sidebarIssues.push(relativePath);
    }
}

if (sidebarIssues.length === 0) {
    console.log('✅ 侧边栏检查通过！只有总控台首页有侧边栏。\n');
} else {
    console.log(`⚠️  发现 ${sidebarIssues.length} 个页面仍保留侧边栏:\n`);
    for (const file of sidebarIssues) {
        console.log(`   - ${file}`);
    }
    console.log('');
}

console.log('\n🔙 检查面包屑和返回按钮...\n');
const breadcrumbIssues = [];
const nonIndexPages = allHtmlFiles.filter(f => {
    const rel = path.relative(workspaceRoot, f);
    return !f.endsWith(path.sep + 'index.html') || path.dirname(f) !== workspaceRoot;
});

for (const htmlFile of nonIndexPages) {
    const relativePath = path.relative(workspaceRoot, htmlFile);
    if (relativePath.includes('game-os-main') || relativePath.includes('mindspeak-private-engine') || 
        relativePath.includes('airmind-private-engine') || relativePath.includes('private-engine')) {
        continue;
    }
    const content = fs.readFileSync(htmlFile, 'utf8');
    const hasBreadcrumb = content.includes('breadcrumb');
    const hasBackBtn = content.includes('返回上一级') || content.includes('history.back');
    const hasHomeBtn = content.includes('一键返回总控台') || content.includes('返回总控台');
    
    if (!hasBreadcrumb || !hasBackBtn || !hasHomeBtn) {
        breadcrumbIssues.push({
            file: relativePath,
            hasBreadcrumb,
            hasBackBtn,
            hasHomeBtn
        });
    }
}

if (breadcrumbIssues.length === 0) {
    console.log('✅ 面包屑和返回按钮检查通过！\n');
} else {
    console.log(`⚠️  发现 ${breadcrumbIssues.length} 个页面缺少导航元素:\n`);
    for (const issue of breadcrumbIssues) {
        console.log(`📄 ${issue.file}`);
        if (!issue.hasBreadcrumb) console.log('   ❌ 缺少面包屑');
        if (!issue.hasBackBtn) console.log('   ❌ 缺少返回上一级按钮');
        if (!issue.hasHomeBtn) console.log('   ❌ 缺少返回总控台按钮');
        console.log('');
    }
}

console.log('\n🏷️  检查页面标题一致性...\n');
const titleIssues = [];
const mainPages = [
    'index.html',
    'engines/gamemind/index.html',
    'engines/airmind/index.html',
    'engines/mindspeak/index.html',
    'engines/evolvemind/index.html',
    'engines/moodmind/index.html',
    'engines/geom-compute/index.html',
    'geom-compute-base.html',
    'labs/structural-mechanics/exp30-gravity.html',
    'labs/structural-mechanics/exp31-atom.html',
    'labs/structural-mechanics/exp32-molecule.html'
];

for (const page of mainPages) {
    const fullPath = path.join(workspaceRoot, page);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
    
    if (titleMatch && h1Match) {
        const title = titleMatch[1].trim();
        const h1 = h1Match[1].trim().replace(/<[^>]+>/g, '');
        console.log(`📄 ${page}`);
        console.log(`   <title>: ${title}`);
        console.log(`   <h1>: ${h1}`);
        if (!title.includes(h1.substring(0, 10)) && !h1.includes(title.substring(0, 10))) {
            console.log('   ⚠️  标题可能不一致');
            titleIssues.push(page);
        }
        console.log('');
    }
}

console.log('\n' + '='.repeat(60));
console.log('📊 检查总结:');
console.log(`   总HTML文件: ${allHtmlFiles.length}`);
console.log(`   断链: ${brokenLinks.length}`);
console.log(`   侧边栏问题: ${sidebarIssues.length}`);
console.log(`   面包屑问题: ${breadcrumbIssues.length}`);
console.log(`   标题不一致: ${titleIssues.length}`);
console.log('='.repeat(60));
