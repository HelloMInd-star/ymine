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

// 排除总控台首页（它可以有侧边栏）
const INDEX_PATH = path.join(rootDir, 'index.html');
const subPages = allFiles.filter(f => f !== INDEX_PATH);

const issues = [];
let pageCount = 0;

for (const file of subPages) {
    const relPath = path.relative(rootDir, file);
    // 跳过重定向页面（根目录的旧文件）
    const rootHtmls = [
        'circle-lab.html','binary-solver.html','value-pyramid.html','info-funnel.html',
        'ai-pricing-benchmark.html','case-library.html','cross-domain-mapping.html',
        'business-learning-evidence.html','finance-risk-simulator.html','ultimate-sandbox.html',
        'isomorphism-block-demo.html','funnel-penetration.html','marketing-reinvented.html',
        'general-game-os.html','language-mapping-evidence.html','gamemind.html','moodmind.html',
        'evolvemind.html','geom-compute-base.html','marketing-structure-lab.html','lab-section.html',
        'mindspeak/index.html','airmind/index.html'
    ];
    const isOldRedirect = rootHtmls.some(r => relPath === r || relPath.endsWith('/' + r));
    
    let content;
    try {
        content = fs.readFileSync(file, 'utf-8');
    } catch {
        continue;
    }
    
    // 如果是重定向页（meta refresh），跳过检查
    if (content.includes('http-equiv="refresh"') || content.includes('http-equiv=\'refresh\'')) {
        continue;
    }
    
    // 跳过私有内核页面（mindspeak-private-engine, airmind-private-engine）- 它们是接口桩
    if (relPath.includes('private-engine')) {
        continue;
    }
    
    // 跳过game-os-main下的旧页面
    if (relPath.startsWith('game-os-main/')) {
        continue;
    }
    
    // 跳过pages/下的旧重定向页
    if (relPath.startsWith('pages/')) {
        continue;
    }
    
    pageCount++;
    const pageIssues = [];
    
    // 1. 检查是否还有侧边栏引用
    const hasSidebar = content.includes('sidebar') || 
                       content.includes('sidebar.js') ||
                       content.includes('id="sidebar"') ||
                       content.includes('class="sidebar') ||
                       content.includes('layout-with-sidebar');
    if (hasSidebar) {
        const hasSidebarJs = content.includes('sidebar.js');
        const hasSidebarDiv = content.includes('id="sidebar"') || content.includes('class="sidebar');
        if (hasSidebarJs || hasSidebarDiv) {
            pageIssues.push('⚠️ 仍包含侧边栏引用');
        }
    }
    
    // 2. 检查面包屑
    const hasBreadcrumb = content.includes('breadcrumb') && 
                         (content.includes('Y.Mine总控台') || content.includes('总控台'));
    if (!hasBreadcrumb) {
        pageIssues.push('❌ 缺少标准面包屑导航');
    }
    
    // 3. 检查返回上一级按钮
    const hasBackBtn = content.includes('返回上一级') && content.includes('history.back');
    if (!hasBackBtn) {
        pageIssues.push('❌ 缺少【返回上一级】按钮');
    }
    
    // 4. 检查一键返回总控台按钮
    const hasHomeBtn = content.includes('一键返回总控台') && content.includes('index.html');
    if (!hasHomeBtn) {
        pageIssues.push('❌ 缺少【一键返回总控台】按钮');
    }
    
    // 5. 检查title
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const pageTitle = titleMatch ? titleMatch[1].trim() : null;
    
    if (pageIssues.length > 0) {
        issues.push({ file: relPath, issues: pageIssues, title: pageTitle });
    }
}

console.log(`\n========== 导航链路全面检查报告 ==========`);
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
    console.log('✅ 所有子页面均符合导航规范！');
}

// 同时检查所有href链接是否指向存在的文件
console.log(`\n========== 链接有效性检查 ==========`);
const linkRegex = /(?:href|src)=["']([^"']+)["']/g;
const brokenLinks = [];

for (const file of allFiles) {
    const relPath = path.relative(rootDir, file);
    let content;
    try {
        content = fs.readFileSync(file, 'utf-8');
    } catch { continue; }
    
    let match;
    const dir = path.dirname(file);
    while ((match = linkRegex.exec(content)) !== null) {
        const link = match[1];
        // 跳过外部链接、javascript、锚点、data URI
        if (link.startsWith('http') || link.startsWith('javascript') || 
            link.startsWith('#') || link.startsWith('data:') || link.startsWith('mailto:')) {
            continue;
        }
        // 移除锚点
        const cleanLink = link.split('#')[0];
        if (!cleanLink) continue;
        
        let targetPath;
        if (cleanLink.startsWith('/')) {
            targetPath = path.join(rootDir, cleanLink);
        } else {
            targetPath = path.resolve(dir, cleanLink);
        }
        
        if (!fs.existsSync(targetPath)) {
            brokenLinks.push({ from: relPath, link: cleanLink, target: targetPath });
        }
    }
}

if (brokenLinks.length > 0) {
    console.log(`发现 ${brokenLinks.length} 个断链:\n`);
    brokenLinks.forEach((bl, i) => {
        console.log(`${i + 1}. 文件: ${bl.from}`);
        console.log(`   链接: ${bl.link}`);
        console.log(`   目标不存在: ${bl.target}`);
        console.log();
    });
} else {
    console.log('✅ 所有链接均有效！');
}
