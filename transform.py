#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

with open('/workspace/marketing-reinvented.html', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

# Step 1: Update page title
content = content.replace(
    '<title>Y.Mine · 金融估值模拟器 · 风险向量精算</title>',
    '<title>Game-OS 金融风险向量精算模拟器・圆锥稳态估值交互操作台</title>'
)

# Step 2: Update page navigation completely
old_nav = '''    <!-- ===== 页面内导航 ===== -->
    <div class="page-nav" id="sidebar">
        <div class="pn-label">🎯 元架构重构营销</div>
        <a class="pn-item" data-target="section-layer1"><span class="icon">🌀</span><span class="label">一/二/三</span></a>
        <a class="pn-item" data-target="section-layer2"><span class="icon">🔄</span><span class="label">A/B对照</span></a>
        <a class="pn-item" data-target="section-layer3"><span class="icon">🎯</span><span class="label">核心比喻</span></a>
        <a class="pn-item" data-target="section-layer4"><span class="icon">📐</span><span class="label">三维评估</span></a>
        <a class="pn-item" data-target="section-layer5"><span class="icon">📋</span><span class="label">理论对照</span></a>
        <a class="pn-item" data-target="section-layer6"><span class="icon">💡</span><span class="label">学习真相</span></a>
        <a class="pn-item" data-target="section-test"><span class="icon">🧪</span><span class="label">验证方法</span></a>
        <a class="pn-item" data-target="section-dispatch-efficiency"><span class="icon">⚡</span><span class="label">三流效率</span></a>
        <a class="pn-item" data-target="section-output"><span class="icon">📦</span><span class="label">最终产出</span></a>
        <div class="pn-divider"></div>
        <div class="pn-label">🏦 金融估值精算 · 独立通道</div>
        <div class="pn-divider"></div>
        <div class="pn-label">🏛️ 价值地基 · 新增体系</div>
        <a class="pn-item" data-target="section-prism"><span class="icon">🔷</span><span class="label">三棱柱地基</span></a>
        <a class="pn-item" data-target="section-pyramid"><span class="icon">🔺</span><span class="label">多棱锥聚合</span></a>
        <a class="pn-item" data-target="section-guoxue"><span class="icon">☯️</span><span class="label">国学向量</span></a>
        <a class="pn-item" data-target="section-flow"><span class="icon">🌊</span><span class="label">价值流</span></a>
        <a class="pn-item" data-target="section-riskvector"><span class="icon">📊</span><span class="label">风险向量</span></a>
        <a class="pn-item" data-target="section-cone"><span class="icon">🔺</span><span class="label">圆锥浓度</span></a>
        <a class="pn-item" data-target="section-gametheory"><span class="icon">👁️</span><span class="label">上帝视角</span></a>
        <a class="pn-item" data-target="section-layer7"><span class="icon">📐</span><span class="label">CAPM定价</span></a>
        <a class="pn-item" data-target="section-layer8"><span class="icon">📊</span><span class="label">凯利配置</span></a>
        <a class="pn-item" data-target="section-reverse-decoder"><span class="icon">⚠️</span><span class="label">反向拆解</span></a>
        <a class="pn-item" data-target="section-pricing-simulator"><span class="icon">🧮</span><span class="label">定价模拟器</span></a>
        <a class="pn-item" data-target="section-fuserisk"><span class="icon">🛡️</span><span class="label">风控熔断</span></a>
        <div class="pn-divider"></div>
        <a class="pn-item" data-target="section-structure"><span class="icon">🗺️</span><span class="label">系统总览</span></a>
        <a class="pn-item" data-target="section-extension"><span class="icon">∞</span><span class="label">迁移</span></a>
    </div>'''

new_nav = '''    <!-- ===== 页面内导航 ===== -->
    <div class="page-nav" id="sidebar">
        <div class="pn-label">🎛️ 金融精算模拟器</div>
        <a class="pn-item" data-target="section-prism"><span class="icon">🔷</span><span class="label">三棱柱地基</span></a>
        <a class="pn-item" data-target="section-pyramid"><span class="icon">🔺</span><span class="label">多棱锥聚合</span></a>
        <a class="pn-item" data-target="section-guoxue"><span class="icon">☯️</span><span class="label">国学向量</span></a>
        <a class="pn-item" data-target="section-flow"><span class="icon">🌊</span><span class="label">价值流</span></a>
        <a class="pn-item" data-target="section-riskvector"><span class="icon">📊</span><span class="label">风险向量</span></a>
        <a class="pn-item" data-target="section-cone"><span class="icon">🔺</span><span class="label">圆锥浓度</span></a>
        <a class="pn-item" data-target="section-gametheory"><span class="icon">👁️</span><span class="label">圆锥博弈场</span></a>
        <a class="pn-item" data-target="section-layer7"><span class="icon">📐</span><span class="label">中轴线定价</span></a>
        <a class="pn-item" data-target="section-layer8"><span class="icon">📊</span><span class="label">圈层最优配比</span></a>
        <a class="pn-item" data-target="section-reverse-decoder"><span class="icon">⚠️</span><span class="label">反向拆解</span></a>
        <a class="pn-item" data-target="section-pricing-simulator"><span class="icon">🧮</span><span class="label">定价模拟器</span></a>
        <a class="pn-item" data-target="section-fuserisk"><span class="icon">🛡️</span><span class="label">风控熔断</span></a>
        <div class="pn-divider"></div>
        <a class="pn-item" data-target="section-structure"><span class="icon">🗺️</span><span class="label">系统总览</span></a>
        <a class="pn-item" data-target="section-extension"><span class="icon">∞</span><span class="label">迁移</span></a>
    </div>'''

content = content.replace(old_nav, new_nav)

# Step 3: Update header (badge, h1, subtitle) and add research disclaimer
old_header = '''        <!-- ===== 头部 ===== -->
        <div class="header">
            <div class="badge">🧪 风险向量精算 · 浓度稳态</div>
            <h1>金融估值模拟器 · 风险向量精算</h1>
            <div class="sub">6维风险向量 × 圆锥浓度模型 = CAPM 估值 · 0.68 稳态铁律</div>
        </div>'''

new_header = '''        <!-- ===== 头部 ===== -->
        <div class="header">
            <div class="badge">🎛️ 圆锥稳态估值交互操作台</div>
            <h1>Game-OS 金融风险向量精算模拟器</h1>
            <div class="sub">六维风险向量・圆锥浓度稳态精算交互工具</div>
        </div>

        <!-- ===== 科研声明 ===== -->
        <div style="margin: 0 0 20px; padding: 14px 20px; background: rgba(167,139,250,0.04); border: 1px solid rgba(167,139,250,0.1); border-radius: 12px; font-size: 13px; color: rgba(255,255,255,0.5); line-height: 1.7; text-align: center;">
            本操作台为自研立体几何风险精算数理工具，依托圈层收敛、圆锥浓度、六维国学向量范式完成资产估值、风险测算、仓位配比动态运算；仅用于复杂系统稳态数理仿真，不构成投资实操建议。
        </div>'''

content = content.replace(old_header, new_header)

# Step 4: Simplify usage guide
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
                    <span>操作台使用说明</span>
                    <span class="arrow">点击展开 ▼</span>
                </summary>
                <div class="guide-body">
                    <div><strong>🎛️ 滑块操作</strong> — 拖动各模块滑块实时调整参数，计算结果自动更新</div>
                    <div><strong>🔷 几何体交互</strong> — 三棱柱/多棱锥/圆锥支持鼠标拖拽旋转，可从多角度观察</div>
                    <div><strong>📌 导航</strong> — 左侧导航可随时跳转到任意精算模块</div>
                </div>
            </details>
        </div>'''

content = content.replace(old_usage, new_usage)

# Step 5: Update flow overview
old_flow = '''        <!-- ===== 精算流程总览 ===== -->
        <div class="flow-overview">
            <div class="fo-title">🧭 精算流程总览</div>
            <div class="fo-steps">
                <div class="fo-step">
                    <div class="fo-step-icon">📥</div>
                    <div class="fo-step-name">输入层</div>
                    <div class="fo-step-desc">风险向量 + 定价模型</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">🧪</div>
                    <div class="fo-step-name">浓度精算</div>
                    <div class="fo-step-desc">圆锥体 · 0.68稳态</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">🧠</div>
                    <div class="fo-step-name">推导层</div>
                    <div class="fo-step-desc">8层递进推理</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">📤</div>
                    <div class="fo-step-name">输出层</div>
                    <div class="fo-step-desc">CAPM · 凯利 · 熔断</div>
                </div>
            </div>
        </div>'''

new_flow = '''        <!-- ===== 精算流程总览 ===== -->
        <div class="flow-overview">
            <div class="fo-title">🧭 精算流程总览</div>
            <div class="fo-steps">
                <div class="fo-step">
                    <div class="fo-step-icon">📊</div>
                    <div class="fo-step-name">风险向量</div>
                    <div class="fo-step-desc">六维向量输入</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">🔺</div>
                    <div class="fo-step-name">圆锥浓度</div>
                    <div class="fo-step-desc">圈层浓度精算</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">📐</div>
                    <div class="fo-step-name">中轴线定价</div>
                    <div class="fo-step-desc">稳态估值</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">📊</div>
                    <div class="fo-step-name">圈层最优配比</div>
                    <div class="fo-step-desc">凯利仓位演算</div>
                </div>
                <div class="fo-arrow">→</div>
                <div class="fo-step">
                    <div class="fo-step-icon">🛡️</div>
                    <div class="fo-step-name">风控熔断</div>
                    <div class="fo-step-desc">0.68稳态铁律</div>
                </div>
            </div>
        </div>'''

content = content.replace(old_flow, new_flow)

# Step 6: Remove the big pink "元架构重构营销" banner and all theory sections (layer1 to output),
# and also remove section-mc and section-pricing (marketing cost & old pricing simulator)
# We'll find the start and end markers

# Remove from "元架构重构营销" banner up to but not including the "金融估值精算·独立通道" banner
# The banner to remove is:
remove_start_marker = '        <!-- ============================================================ -->\n        <!-- ===== 元架构重构营销 · 掌握流量密码 ===== -->\n        <!-- ============================================================ -->'
remove_end_marker = '        <!-- ============================================================ -->\n        <!-- ===== 金融估值精算（独立通道） ===== -->\n        <!-- ============================================================ -->'

# Find positions
start_idx = content.find(remove_start_marker)
end_idx = content.find(remove_end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Step 7: Update the "金融估值精算·独立通道" banner
old_banner = '''        <div style="margin: 32px 0 20px; padding: 16px 20px; background: linear-gradient(135deg, rgba(167,139,250,0.04), rgba(96,165,250,0.04)); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; text-align: center;">
            <div style="font-size: 14px; font-weight: 700; color: #a78bfa; margin-bottom: 4px;">🏦 金融估值精算 · 独立通道</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.3);">风险向量 → 圆锥浓度 → CAPM → 凯利 → 定价 → 风控 · 数据从上往下流通</div>
        </div>'''

new_banner = '''        <div style="margin: 32px 0 20px; padding: 16px 20px; background: linear-gradient(135deg, rgba(167,139,250,0.06), rgba(96,165,250,0.04)); border: 1px solid rgba(167,139,250,0.1); border-radius: 12px; text-align: center;">
            <div style="font-size: 16px; font-weight: 700; color: #a78bfa; margin-bottom: 4px;">🏛️ 圈层收敛·圆锥浓度精算操作台</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.35);">风险向量 → 圆锥浓度 → 中轴线定价 → 圈层最优配比 → 风控熔断</div>
        </div>'''

content = content.replace(old_banner, new_banner)

# Step 8: Update value-prop
old_value_prop = '''        <!-- ===== 价值主张 ===== -->
        <div class="section-anchor" id="section-value"></div>
        <div class="value-prop">
            <p>
                <strong>💡 核心模型：</strong>资本定价 = <span class="highlight">无风险利率 Rf</span> + <span style="color:#a78bfa;">风险溢价 Rp</span> × <span style="color:#60a5fa;">β系数</span><br>
                浓度约束：<span class="highlight">C = m × ρ₀ / V(h)</span>（溶质质量 × 信源密度 / 市场容积）<br>
                稳态铁律：<span style="color:#facc15;">0.48 保本 / 0.50 中轴 / 0.68 熔断</span><br>
                风险向量：6维空间 → 向量模长 × 余弦相似度 = 组合风险收益率
            </p>
        </div>'''

new_value_prop = '''        <!-- ===== 价值主张 ===== -->
        <div class="section-anchor" id="section-value"></div>
        <div class="value-prop">
            <p>
                <strong>💡 核心模型：</strong>圆锥中轴线资产稳态定价 = <span class="highlight">圆锥稳态中轴线基准值Rf</span> + <span style="color:#a78bfa;">风险溢价Rp</span> × <span style="color:#60a5fa;">脑区激活强度差异向量β</span><br>
                浓度约束：<span class="highlight">C = m × ρ₀ / V(h)</span><br>
                稳态铁律：<span style="color:#facc15;">0.48保本/0.50中轴/0.68熔断</span><br>
                风险向量：6维空间→向量模长×余弦相似度=组合风险收益率
            </p>
        </div>'''

content = content.replace(old_value_prop, new_value_prop)

# Step 9: Update key-takeaways
old_key_takeaways = '''        <!-- ===== 核心结论锚点 ===== -->
        <div class="key-takeaways">
            <div class="kt-item">
                <div class="kt-icon">🧪</div>
                <div class="kt-text">圆锥浓度模型<br><span class="hl">市场份额 = 溶质密度 / 容积</span></div>
            </div>
            <div class="kt-item">
                <div class="kt-icon">📊</div>
                <div class="kt-text">6维风险向量<br><span class="hl">向量模长 × 方向相似度</span></div>
            </div>
            <div class="kt-item">
                <div class="kt-icon">⚠️</div>
                <div class="kt-text">0.68 风控铁律<br><span class="hl">正态稳态边界</span></div>
            </div>
        </div>'''

new_key_takeaways = '''        <!-- ===== 核心结论锚点 ===== -->
        <div class="key-takeaways">
            <div class="kt-item">
                <div class="kt-icon">🔺</div>
                <div class="kt-text">圆锥浓度模型<br><span class="hl">圈层浓度 = 溶质质量 × 信源密度 / 容积</span></div>
            </div>
            <div class="kt-item">
                <div class="kt-icon">📊</div>
                <div class="kt-text">六维风险向量<br><span class="hl">向量模长 × 余弦相似度</span></div>
            </div>
            <div class="kt-item">
                <div class="kt-icon">🛡️</div>
                <div class="kt-text">0.68 稳态铁律<br><span class="hl">0.68圈层引力稳态区间</span></div>
            </div>
        </div>'''

content = content.replace(old_key_takeaways, new_key_takeaways)

# Step 10: Simplify meta-grid - remove the long comparison, keep only core model explanation
old_meta = '''        <!-- ===== 验证元数据 ===== -->
        <div class="section-anchor" id="section-meta"></div>
        <div class="meta-grid">
            <div class="meta-item">
                <div class="ml">📊 传统估值 · 估算逻辑</div>
                <div class="mv">依赖财报、PE/PB倍数、DCF现金流折现<br><span class="sub">需要历史数据 · 静态滞后 · 难以评估早期项目</span></div>
            </div>
            <div class="meta-item">
                <div class="ml">🧠 风险向量 · 估算逻辑</div>
                <div class="mv">基于 <span class="hl">6维风险向量</span> × <span style="color:#60a5fa;">圆锥浓度模型</span> 精算<br><span class="sub">实时动态计算 · 物理化学级精度</span></div>
            </div>
            <div class="meta-item" style="grid-column:1/-1;">
                <div class="ml">🔁 两种估值路径的差异</div>
                <div class="mv">
                    <span style="color:rgba(255,255,255,0.5);">传统：</span>归纳法（从历史数据找规律）<br>
                    <span class="hl">风险向量：</span>演绎法（从第一性原理推估值）
                </div>
            </div>
            <div class="meta-item" style="grid-column:1/-1;">
                <div class="ml">💡 核心结论</div>
                <div class="mv">风险向量精算可在分钟级产出与传统估值模型<span class="hl-gold">同等精度</span>、但<span class="hl">动态性更强、可跨领域迁移</span>的估值结果</div>
            </div>
        </div>'''

new_meta = '''        <!-- ===== 验证元数据 ===== -->
        <div class="section-anchor" id="section-meta"></div>
        <div class="meta-grid">
            <div class="meta-item">
                <div class="ml">🧮 核心精算模型</div>
                <div class="mv">
                    <span class="hl">圆锥中轴线资产稳态定价公式</span>：Rf + Rp × β<br>
                    <span class="sub">Rf=圆锥稳态中轴线基准值 · β=脑区激活强度差异向量 · Rp=风险溢价</span>
                </div>
            </div>
            <div class="meta-item">
                <div class="ml">🔬 自研数理范式</div>
                <div class="mv">
                    <span class="hl-gold">圈层收敛 · 圆锥浓度</span> · 六维国学向量<br>
                    <span class="sub">传统归纳式静态估值工具（DCF/PE/PB倍数）仅作标签参考</span>
                </div>
            </div>
        </div>'''

content = content.replace(old_meta, new_meta)

# Step 11: Remove section-mc (业财融合·营销成本精算) and section-pricing (定价模型模拟器 - old one)
# These are between section-riskvector end and section-cone start
# Find section-mc start and section-pricing end
mc_start = content.find('        <!-- ============================================================ -->\n        <!-- ===== 模拟器新增：业财融合 · 营销成本精算 ===== -->')
pricing_end_marker = '        <!-- ============================================================ -->\n        <!-- ===== 圆锥模型（资本定价第一步 + 商业应用 + 几何公理） ===== -->'
pricing_end_idx = content.find(pricing_end_marker)

if mc_start != -1 and pricing_end_idx != -1:
    content = content[:mc_start] + content[pricing_end_idx:]

# Step 12: Terminology replacements
# CAPM资本定价模型 → 圆锥中轴线资产稳态定价公式
content = content.replace('CAPM资本定价模型', '圆锥中轴线资产稳态定价公式')
content = content.replace('CAPM定价', '中轴线定价')
content = content.replace('CAPM', '圆锥稳态定价')

# β系数 → 脑区激活强度差异向量（欧氏距离因子）
content = content.replace('β系数', '脑区激活强度差异向量β')

# 无风险利率Rf → 圆锥稳态中轴线基准值
# Need to be careful with replacements
content = content.replace('无风险利率 Rf', '圆锥稳态中轴线基准值Rf')
content = content.replace('无风险利率Rf', '圆锥稳态中轴线基准值Rf')
content = content.replace('无风险利率', '圆锥稳态中轴线基准值')

# 凯利公式 → 圈层最优资源配比演算
content = content.replace('凯利公式', '圈层最优资源配比演算')
content = content.replace('凯利配置', '圈层最优配比')

# DCF/PE/PB倍数 - just keep as labels with note, already handled in meta

# 正态分布 → 0.68圈层引力稳态区间
content = content.replace('正态分布', '0.68圈层引力稳态区间')
content = content.replace('正态稳态边界', '0.68圈层引力稳态区间')

# 资本定价 → 圆锥中轴线资产稳态定价 (in some remaining places)
content = content.replace('资本定价模型', '圆锥中轴线资产稳态定价公式')
content = content.replace('资本定价 =', '圆锥中轴线资产稳态定价 =')

# Replace "上帝视角" with "圆锥博弈场"
content = content.replace('上帝视角', '圆锥博弈场')

# Step 13: Fix section-cone title and internal terminology
content = content.replace(
    '🧪 圆锥浓度模型 · 0.68稳态铁律 <span class="tag">浓度精算</span>',
    '🔺 圆锥浓度模型 · 圈层收敛稳态 <span class="tag">浓度精算</span>'
)
content = content.replace(
    '💰 资本定价模型 · 无风险利率锚点',
    '📐 圆锥中轴线定价 · 稳态基准锚点'
)

# Fix "资本定价 = " in cone section
content = content.replace(
    '资本定价 = <span style="color:#a78bfa;">无风险利率 Rf</span> + <span style="color:#facc15;">风险溢价 Rp</span> × <span style="color:#60a5fa;">β系数</span>',
    '圆锥中轴线资产稳态定价 = <span style="color:#a78bfa;">圆锥稳态中轴线基准值Rf</span> + <span style="color:#facc15;">风险溢价Rp</span> × <span style="color:#60a5fa;">脑区激活强度差异向量β</span>'
)

# Fix Rf labels in cone section
content = content.replace('📈 大盘 · 国债收益率', '📈 大盘 · 国债基准收益率')
content = content.replace('🏛️ 政策 · 央行基准', '🏛️ 政策 · 央行基准率')
content = content.replace('综合 Rf', '综合稳态基准值Rf')

# Fix section-layer7 title (CAPM定价)
content = content.replace(
    '📐 CAPM资本定价模型 <span class="tag">中轴线定价</span>',
    '📐 圆锥中轴线资产稳态定价公式 <span class="tag">中轴线定价</span>'
)

# Fix section-layer8 title
content = content.replace(
    '📊 凯利公式 · 圈层最优资源配比 <span class="tag">仓位演算</span>',
    '📊 圈层最优资源配比演算 <span class="tag">仓位演算</span>'
)

# Fix references to "凯利" in context
content = content.replace('凯利最优仓位', '圈层最优配比仓位')
content = content.replace('凯利最优 f*', '圈层最优配比 f*')
content = content.replace('凯利仓位', '圈层配比仓位')

# Fix "0.68 风控铁律" references
content = content.replace('0.68 风控铁律', '0.68 圈层稳态铁律')
content = content.replace('0.68 熔断', '0.68 圈层熔断')

# Fix "价值流" particle flow labels if needed - they are mostly internal JS

# Fix "业务价值地基" references
content = content.replace('正三棱柱·业务价值地基', '正三棱柱·资产价值地基')
content = content.replace('三棱柱·业务地基', '三棱柱·资产地基')
content = content.replace('三棱柱价值输出 → 汇入棱锥聚合', '三棱柱资产价值输出 → 汇入棱锥聚合')

# Fix "业财融合" references if any remain
# Already removed section-mc

# Fix "风险向量" module title
content = content.replace(
    '📊 六维风险向量计算器 <span class="tag">风险向量合成</span>',
    '📊 六维风险向量精算器 <span class="tag">风险向量合成</span>'
)

# Fix "圆锥博弈场" section title
content = content.replace(
    '👁️ 上帝视角 · 圆锥博弈场',
    '👁️ 圆锥博弈场 · 多空博弈稳态'
)

# Fix "反向拆解" section
content = content.replace('反向拆解 · 估值还原', '反向拆解 · 稳态估值还原')

# Fix "定价模拟器" section title
content = content.replace(
    '🧮 资产定价模拟器 <span class="tag">综合定价</span>',
    '🧮 资产稳态定价模拟器 <span class="tag">综合定价</span>'
)

# Fix "风控熔断" section
content = content.replace(
    '🛡️ 风控熔断机制 · 0.68稳态铁律',
    '🛡️ 风控熔断机制 · 0.68圈层稳态铁律'
)

# Fix "系统总览"
content = content.replace('系统结构总览', '精算系统总览')

# Fix "迁移" section
content = content.replace('模型迁移方向', '范式迁移方向')

# Fix prism section title
content = content.replace('🔷 正三棱柱·业务价值地基', '🔷 正三棱柱·资产价值地基')
content = content.replace('三大固定立面(<span style="color:#22d3ee;">产品硬价值</span>/<span style="color:#a78bfa;">品牌软价值</span>/<span style="color:#facc15;">三流渠道价值</span>)',
                        '三大固定立面(<span style="color:#22d3ee;">资产硬价值</span>/<span style="color:#a78bfa;">品牌软价值</span>/<span style="color:#facc15;">渠道流动性价值</span>)')
content = content.replace('🔧 产品硬价值', '🔧 资产硬价值')
content = content.replace('💜 品牌软价值', '💜 品牌软价值')
content = content.replace('📡 三流渠道价值', '📡 渠道流动性价值')
content = content.replace('信息分发', '信息传导')
content = content.replace('流量分发', '资金流动')
content = content.replace('物理分发', '资产交割')

# Fix pyramid section
content = content.replace('🔺 多棱锥·多维价值聚合', '🔺 多棱锥·多维风险聚合')
content = content.replace('m 溶质质量聚合', 'm 风险质量聚合')

# Fix guoxue section title already ok but check
content = content.replace('☯️ 国学向量 · 六维风险因子', '☯️ 六维国学向量 · 风险因子')

# Fix flow section title
content = content.replace('🌊 价值流动画演示', '🌊 风险价值流动画')

# Fix some remaining "营销" references that shouldn't be there
# The private engine notice mentions 六维权重引擎 - keep that
# Let's look for other marketing terms to replace where appropriate
# But be careful not to break JS variable names or IDs

# Fix "分发链路" references in visible text where appropriate
# Already removed most theory sections

# Fix "浓度约束" line in cone section
content = content.replace('溶质质量 × 信源密度 / 市场容积', '风险质量 × 信源密度 / 市场容积')

# Fix prism product/brand/channel labels to asset/brand/channel
# Already done above partially

# Fix section-layer7 content references
content = content.replace(
    '资本定价 = 无风险利率 + β × 风险溢价',
    '圆锥中轴线稳态定价 = 圆锥稳态中轴线基准值Rf + β × 风险溢价Rp'
)

# Write the result
with open('/workspace/finance-risk-simulator.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Transformation complete!")
print(f"Input length: {len(content)} chars")
