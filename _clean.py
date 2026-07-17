import re

def clean_marketing():
    with open('marketing-reinvented.html', 'r') as f:
        content = f.read()
    
    original_len = len(content)
    
    # ========== 1. 删HTML块（从后往前删，用内容定位）==========
    
    # 删"第七层：资本定价公式"整个HTML块
    # 从 <!-- ===== 第七层：资本定价公式 到 下一个 <!-- ===== 三流分发效率
    pattern1 = r'<!-- ===== 第七层：资本定价公式.*?-->\n.*?(?=<!-- ===== 三流分发效率)'
    content, count1 = re.subn(pattern1, '', content, flags=re.DOTALL)
    print(f"删除第七层资本定价HTML: {count1}处")
    
    # 删"精算流程总览"块
    pattern2 = r'<!-- ===== 精算流程总览 ===== -->\n.*?(?=\n\n\n.*?<!-- ={2,} -->\n.*?元架构重构营销)'
    content, count2 = re.subn(pattern2, '', content, flags=re.DOTALL)
    if count2 == 0:
        # 换个方式：从"精算流程总览"到"元架构重构营销"之前
        pattern2b = r'<!-- ===== 精算流程总览 ===== -->\n.*?</div>\n\n\n'
        content, count2 = re.subn(pattern2b, '', content, flags=re.DOTALL)
    print(f"删除精算流程总览HTML: {count2}处")
    
    # 删"漏斗接管状态条"
    pattern3 = r'<!-- ===== 漏斗接管状态条 ===== -->\n.*?</div>\n'
    content, count3 = re.subn(pattern3, '', content, flags=re.DOTALL)
    print(f"删除漏斗状态条HTML: {count3}处")
    
    # 删"使用说明"里的金融描述（替换整个使用说明）
    old_usage = '''        <!-- ===== 使用说明 ===== -->
        <div class="usage-guide">
            <details>
                <summary>
                    <span>📖</span>
                    <span>如何使用这个页面</span>
                    <span class="arrow">点击展开 ▼</span>
                </summary>
                <div class="guide-body">
                    <div><strong>🧭 读法</strong> — 按顺序从上往下读，每一层都在前一层的基础上推进</div>
                    <div><strong>🎛️ 交互</strong> — 分发链路 · 定价模拟器 · 三维评估 · 公式计算器 · 凯利配置</div>
                    <div><strong>🔺 核心</strong> — 资本定价 = 无风险利率 + 风险溢价 × β系数</div>
                    <div><strong>📌 捷径</strong> — 左侧导航可随时跳转到任意板块</div>
                </div>
            </details>
        </div>'''
    
    new_usage = '''        <!-- ===== 使用说明 ===== -->
        <div class="usage-guide">
            <details>
                <summary>
                    <span>📖</span>
                    <span>如何使用这个页面</span>
                    <span class="arrow">点击展开 ▼</span>
                </summary>
                <div class="guide-body">
                    <div><strong>🧭 读法</strong> — 按顺序从上往下读，每一层都在前一层的基础上推进</div>
                    <div><strong>🎯 核心</strong> — 营销=信息分发 · 运营=流量分发 · 物流=物理分发</div>
                    <div><strong>⚡ 方法</strong> — 元架构七层推导 → 三流效率对照 → 最终产出</div>
                    <div><strong>📌 捷径</strong> — 左侧导航可随时跳转到任意板块</div>
                </div>
            </details>
        </div>'''
    
    if old_usage in content:
        content = content.replace(old_usage, new_usage)
        print("更新使用说明: 已替换为营销专属描述")
    
    # ========== 2. 删JS引擎块 ==========
    
    js_blocks = [
        ('无风险利率联动引擎', '// ===== 圆锥模型可视化引擎 ====='),
        ('圆锥模型可视化引擎', '// ===== 三流分发效率引擎'),
        ('三流分发效率引擎', '// ===== 定价模型模拟器引擎 ====='),
        ('定价模型模拟器引擎', '// ===== 第四层：三维评估引擎 ====='),
        ('第七层资本定价公式引擎', '// ===== 第八层：凯利资源配置模拟器引擎 ====='),
        ('第八层凯利资源配置模拟器引擎', '// ===== 6维风险向量计算引擎 ====='),
        ('6维风险向量计算引擎', '// ===== 案例库容器 ====='),
        ('案例库容器', '// ===== 定价基准容器 ====='),
        ('定价基准容器', '// ===== 总线事件监听'),
        ('总线事件监听', '// ===== 定价模拟器 · 4 输入'),
        ('定价模拟器4输入4输出', '// ===== 圆锥浓度计算引擎'),
        ('圆锥浓度计算引擎', '// ===== 漏斗对接引擎 ====='),
        ('漏斗对接引擎', '        // ================================================================'),
    ]
    
    # 从后往前删
    for i in range(len(js_blocks)-1, -1, -1):
        name, end_marker = js_blocks[i]
        start_marker = f'// ===== {name} ====='
        if start_marker in content:
            start_idx = content.find(start_marker)
            end_idx = content.find(end_marker, start_idx + len(start_marker))
            if end_idx > start_idx:
                # 找到end_marker前的换行
                line_end = content.rfind('\n', 0, end_idx)
                removed = content[start_idx:line_end]
                content = content[:start_idx] + content[line_end+1:]
                print(f"删除JS: {name}")
    
    # ========== 3. 删CSS块 ==========
    
    css_blocks = [
        ('圆锥模型板块', '/* ===== 通用板块 ===== */'),
    ]
    
    for name, end_marker in css_blocks:
        start_marker = f'/* ===== {name} ===== */'
        if start_marker in content:
            start_idx = content.find(start_marker)
            end_idx = content.find(end_marker, start_idx + len(start_marker))
            if end_idx > start_idx:
                line_end = content.rfind('\n', 0, end_idx)
                content = content[:start_idx] + content[line_end+1:]
                print(f"删除CSS: {name}")
    
    # 保存
    with open('marketing-reinvented.html', 'w') as f:
        f.write(content)
    
    new_len = len(content)
    print(f"\n原始大小: {original_len} -> 新大小: {new_len} (减少 {original_len - new_len} 字符)")
    print(f"行数: {content.count(chr(10))}")

clean_marketing()
