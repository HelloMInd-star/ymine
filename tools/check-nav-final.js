const fs = require('fs');
const path = require('path');

function findHtmlFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.git') {
            findHtmlFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

const rootDir = '/workspace';
const allFiles = findHtmlFiles(rootDir);

const INDEX_PATH = path.join(rootDir, 'index.html');
const subPages = allFiles.filter(f => f !== INDEX_PATH);

const issues = [];
let pageCount = 0;
const skipDirs = ['private-engine', 'game-os-main/', 'pages/'];

for (const file of subPages) {
    const relPath = path.relative(rootDir, file);
    
    let content;
    try {
        content = fs.readFileSync(file, 'utf-8');
    } catch { continue; }
    
    if (content.includes('http-equiv="refresh"') || content.includes('http-equiv=\'refresh\'')) continue;
    if (skipDirs.some(d => relPath.includes(d))) continue;
    if (relPath === 'labs/evidence/lab-section.html') continue;
    
    pageCount++;
    const pageIssues = [];
    
    const hasGlobalSidebar = content.includes('sidebar.js') || 
                            (content.includes('id="sidebar"') && !content.includes('sidebar-index'));
    if (hasGlobalSidebar) pageIssues.push('⚠️ 仍包含全局侧边栏引用');
    
    const hasBreadcrumb = (content.includes('breadcrumb') || content.includes('Y.Mine总控台')) && 
                         content.includes('认知科研实验组');
    if (!hasBreadcrumb) pageIssues.push('❌ 缺少标准面包屑导航（含认知科研实验组层级）');
    
    const hasBackBtn = content.includes('返回上一级') && content.includes('history.back');
    if (!hasBackBtn) pageIssues.push('❌ 缺少【返回上一级】按钮');
    
    const hasHomeBtn = content.includes('一键返回总控台');
    if (!hasHomeBtn) pageIssues.push('❌ 缺少【一键返回总控台】按钮');
    
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const pageTitle = titleMatch ? titleMatch[1].trim() : null;
    
    if (pageIssues.length > 0) {
        issues.push({ file: relPath, issues: pageIssues, title: pageTitle });
    }
}

console.log(`\n========== 导航链路最终验证报告 ==========`);
console.log(`扫描子页面总数: ${pageCount}`);
console.log(`发现问题页面数: ${issues.length}\n`);

if (issues.length > 0) {
    issues.forEach((item, i) => {
        console.log(`${i + 1}. ${item.file}`);
        console.log(`   Title: ${item.title || '(无title)'}`);
        item.issues.forEach(iss => console.log(`   ${iss}`));
        console.log();
    });
} else {
    console.log('✅ 所有子页面均符合导航规范！\n');
}

console.log(`========== 链接有效性检查（去除版本号参数） ==========`);
const linkRegex = /(?:href|src)=["']([^"']+)["']/g;
const brokenLinks = [];

for (const file of allFiles) {
    const relPath = path.relative(rootDir, file);
    let content;
    try { content = fs.readFileSync(file, 'utf-8'); } catch { continue; }
    
    let match;
    const dir = path.dirname(file);
    while ((match = linkRegex.exec(content)) !== null) {
        let link = match[1];
        if (link.startsWith('http') || link.startsWith('javascript') || 
            link.startsWith('#') || link.startsWith('data:') || link.startsWith('mailto:')) continue;
        
        link = link.split('#')[0];
        link = link.split('?')[0];
        if (!link) continue;
        
        let targetPath;
        if (link.startsWith('/')) {
            targetPath = path.join(rootDir, link);
        } else {
            targetPath = path.resolve(dir, link);
        }
        
        if (!fs.existsSync(targetPath)) {
            brokenLinks.push({ from: relPath, link: match[1], target: path.relative(rootDir, targetPath) });
        }
    }
}

if (brokenLinks.length > 0) {
    console.log(`发现 ${brokenLinks.length} 个断链:\n`);
    brokenLinks.forEach((bl, i) => {
        console.log(`${i + 1}. ${bl.from}`);
        console.log(`   链接: ${bl.link}`);
        console.log(`   不存在: ${bl.target}`);
        console.log();
    });
} else {
    console.log('✅ 所有链接均有效！\n');
}
