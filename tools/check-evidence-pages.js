const fs = require('fs');
const path = require('path');

const evidenceDir = '/workspace/labs/evidence';
const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith('.html'));

console.log(`📂 检查 ${files.length} 个evidence页面:\n`);

for (const file of files) {
    const fullPath = path.join(evidenceDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    const hasSidebar = content.includes('sidebar.js') || content.includes('class="sidebar"') || content.includes('id="sidebar"');
    const hasLayoutFlex = content.includes('class="layout-flex"');
    const hasBreadcrumb = content.includes('breadcrumb');
    const hasBackBtn = content.includes('history.back') || content.includes('返回上一级');
    
    console.log(`📄 ${file}:`);
    console.log(`   侧边栏引用: ${hasSidebar ? '⚠️ 有' : '✅ 无'}`);
    console.log(`   layout-flex: ${hasLayoutFlex ? '⚠️ 有' : '✅ 无'}`);
    console.log(`   面包屑: ${hasBreadcrumb ? '✅ 有' : '❌ 无'}`);
    console.log(`   返回上一级: ${hasBackBtn ? '✅ 有' : '❌ 无'}`);
    console.log('');
}
