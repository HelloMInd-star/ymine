#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('/workspace/finance-risk-simulator.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: In section-layer7, remove the mapping table and simplify the conclusion, fix terms
old_cone_conclusion = '''            <div class="highlight-box purple" style="margin-top: 14px;">
                <p><strong>🧪 收束结论：</strong>前面六层的推导成果，被收敛为三个可量化的维度：<strong style="color:#a78bfa;">圆锥稳态中轴线基准值Rf</strong>、<strong style="color:#60a5fa;">风险溢价 Rp</strong>、<strong style="color:#facc15;">脑区激活强度差异向量β</strong>。三者相加，得到最终的 <strong>资本定价</strong>。</p>
                <p style="margin-top:4px; color:rgba(255,255,255,0.3); font-size:13px; margin-bottom:0;">
                    💡 这不是三个独立指标，而是三个维度的组合——任何一个维度的变化，都会影响最终的资本定价。
                </p>
            </div>

            <div class="mapping-table-wrap">
                <div class="mt-label">🧩 元架构映射 · 颗粒度拉满</div>
                <table>
                    <thead>
                        <tr><th style="width:25%;">维度</th><th style="width:25%;">对应推导层</th><th style="width:25%;">数学度量</th><th style="width:25%;">神经科学对应</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><span style="color:#a78bfa;">圆锥稳态中轴线基准值Rf</span></td><td>圆锥模型 · 资本定价</td><td><span class="tool">国债 × 0.6 + 央行 × 0.4</span></td><td><span class="neuron">市场基准 · 政策锚点</span></td></tr>
                        <tr><td><span style="color:#60a5fa;">风险溢价 Rp</span></td><td>第四层 · 三维评估</td><td><span class="tool">余弦相似度 × (1−欧氏距离) × (1+点积距离)</span></td><td><span class="neuron">前额叶+边缘系统 · 协同度</span></td></tr>
                        <tr><td><span style="color:#facc15;">脑区激活强度差异向量β</span></td><td>第四层 · 三维评估</td><td><span class="tool">欧氏距离</span></td><td><span class="neuron">前额叶 ↔ 边缘系统 · 强度差异</span></td></tr>
                    </tbody>
                </table>
                <div class="mt-note">💡 三个维度分别对应三个不同的数学度量，共同构成资本定价的完整评估体系</div>
            </div>'''

new_cone_conclusion = '''            <div style="margin-top: 14px; padding: 12px 16px; background: rgba(167,139,250,0.03); border-left: 3px solid #a78bfa; border-radius: 0 10px 10px 0; color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.7;">
                <strong style="color:rgba(255,255,255,0.6);">🧪 精算注解：</strong>三个量化维度（<span style="color:#a78bfa;">Rf</span>基准值 + <span style="color:#60a5fa;">Rp</span>风险溢价 × <span style="color:#facc15;">β</span>差异向量）共同构成圆锥中轴线稳态定价，任一维度变化均联动最终估值结果。
            </div>'''

content = content.replace(old_cone_conclusion, new_cone_conclusion)

# Fix "最终资本定价" label
content = content.replace(
    '<div style="font-size: 9px; color: rgba(255,255,255,0.1); text-transform: uppercase; letter-spacing: 0.3px;">最终资本定价</div>',
    '<div style="font-size: 9px; color: rgba(255,255,255,0.1); text-transform: uppercase; letter-spacing: 0.3px;">最终稳态定价</div>'
)

# Fix 2: Update system structure overview - replace old theory layers with actual calc modules
old_structure = '''            <div class="struct-flow">
                <!-- 第0层 -->
                <div class="level prominent">
                    <div class="l-badge">Lv.0</div>
                    <div class="l-content">
                        <span class="l-icon">🏦</span>
                        <span class="l-name">圆锥中轴线资产稳态定价公式</span>
                        <span class="l-desc">圆锥稳态中轴线基准值Rf（大盘+政策） + 风险溢价 Rp × 脑区激活强度差异向量β</span>
                        <span class="l-tag active">顶层定调</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第1层 -->
                <div class="level">
                    <div class="l-badge">Lv.1</div>
                    <div class="l-content">
                        <span class="l-icon">🔺</span>
                        <span class="l-name">圆锥资产定价</span>
                        <span class="l-desc">中轴线 = Rf · 容积 = 总商业价值 · 三圈层 = 三种定价策略</span>
                        <span class="l-tag gold-tag">资产估值</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第2层 -->
                <div class="level">
                    <div class="l-badge">Lv.2</div>
                    <div class="l-content">
                        <span class="l-icon">🔄</span>
                        <span class="l-name">A/B对照测试</span>
                        <span class="l-desc">传统学习（归纳法） vs 元架构推演（演绎法）</span>
                        <span class="l-tag orange-tag">验证设计</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第3层 -->
                <div class="level">
                    <div class="l-badge">Lv.3</div>
                    <div class="l-content">
                        <span class="l-icon">🎯</span>
                        <span class="l-name">核心比喻</span>
                        <span class="l-desc">交通堵塞 · 只卖三 · 乐高说明书</span>
                        <span class="l-tag">日常翻译</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第4层 -->
                <div class="level">
                    <div class="l-badge">Lv.4</div>
                    <div class="l-content">
                        <span class="l-icon">📐</span>
                        <span class="l-name">三维评估</span>
                        <span class="l-desc">余弦相似度 · 欧氏距离（β）· 点积距离 → 风险溢价 Rp</span>
                        <span class="l-tag gold-tag">风险评估</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第5层 -->
                <div class="level">
                    <div class="l-badge">Lv.5</div>
                    <div class="l-content">
                        <span class="l-icon">📋</span>
                        <span class="l-name">理论对照</span>
                        <span class="l-desc">理论模块内部自洽 · 所有元素相互映射</span>
                        <span class="l-tag">体系自检</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第6层 -->
                <div class="level">
                    <div class="l-badge">Lv.6</div>
                    <div class="l-content">
                        <span class="l-icon">💡</span>
                        <span class="l-name">学习真相</span>
                        <span class="l-desc">“学习 = 翻译已有知识” · 从学习者到认知架构师</span>
                        <span class="l-tag">认知跃迁</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第7层 -->
                <div class="level prominent">
                    <div class="l-badge">Lv.7</div>
                    <div class="l-content">
                        <span class="l-icon">📐</span>
                        <span class="l-name">资本定价公式</span>
                        <span class="l-desc">圆锥中轴线资产稳态定价 = <span class="hl">Rf</span> + <span class="gold">Rp</span> × <span class="green">β</span></span>
                        <span class="l-tag active">公式收束</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第8层 -->
                <div class="level bottom-line">
                    <div class="l-badge">Lv.8</div>
                    <div class="l-content">
                        <span class="l-icon">📊</span>
                        <span class="l-name">凯利资源配置</span>
                        <span class="l-desc">胜率 p = Rp · 理论仓位 f* · 实际投放比例</span>
                        <span class="l-tag gold-tag">仓位配置</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 第9层 · 风控熔断 -->
                <div class="level capstone">
                    <div class="l-badge">Lv.9</div>
                    <div class="l-content">
                        <span class="l-icon">🛑</span>
                        <span class="l-name">风控熔断</span>
                        <span class="l-desc">0.48~0.50 保本中轴 · 0.50~0.68 边际递减 · &gt;0.68 二进制截断</span>
                        <span class="l-tag red-tag">熔断红线</span>
                    </div>
                </div>
            </div>

            <!-- 结构总结 -->
            <div class="struct-summary">
                <strong>完整逻辑链：</strong>
                <span class="hl">圆锥稳态中轴线基准值Rf</span>（大盘+政策）
                → <span class="gold">圆锥资产定价</span>（中轴线锚点）
                → <span class="green">三维评估</span>（风险溢价 Rp + 脑区激活强度差异向量β）
                → <span class="hl">资本定价公式</span>（Rf + Rp × β）
                → <span class="gold">圈层最优配比</span>（最优仓位）
                → <span class="red">风控熔断</span>（0.68 截断红线）
            </div>'''

new_structure = '''            <div class="struct-flow">
                <!-- 三棱柱地基 -->
                <div class="level">
                    <div class="l-badge">Lv.1</div>
                    <div class="l-content">
                        <span class="l-icon">🔷</span>
                        <span class="l-name">三棱柱·资产价值地基</span>
                        <span class="l-desc">资产硬价值 / 品牌软价值 / 渠道流动性价值 · 三维固定基座</span>
                        <span class="l-tag">基座输入</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 多棱锥聚合 -->
                <div class="level">
                    <div class="l-badge">Lv.2</div>
                    <div class="l-content">
                        <span class="l-icon">🔺</span>
                        <span class="l-name">多棱锥·多维风险聚合</span>
                        <span class="l-desc">多维度风险因子聚合为溶质质量 m</span>
                        <span class="l-tag">风险聚合</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 国学向量 -->
                <div class="level">
                    <div class="l-badge">Lv.3</div>
                    <div class="l-content">
                        <span class="l-icon">☯️</span>
                        <span class="l-name">六维国学向量</span>
                        <span class="l-desc">儒/法/道/阴阳/兵/纵横 · 六维风险因子空间</span>
                        <span class="l-tag gold-tag">向量空间</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 风险向量 -->
                <div class="level">
                    <div class="l-badge">Lv.4</div>
                    <div class="l-content">
                        <span class="l-icon">📊</span>
                        <span class="l-name">六维风险向量精算</span>
                        <span class="l-desc">向量模长 × 余弦相似度 = 组合风险收益率</span>
                        <span class="l-tag gold-tag">风险合成</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 圆锥浓度 -->
                <div class="level prominent">
                    <div class="l-badge">Lv.5</div>
                    <div class="l-content">
                        <span class="l-icon">🔺</span>
                        <span class="l-name">圆锥浓度模型</span>
                        <span class="l-desc">C = m × ρ₀ / V(h) · 圈层收敛稳态 · 0.68熔断边界</span>
                        <span class="l-tag active">浓度精算</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 圆锥博弈场 -->
                <div class="level">
                    <div class="l-badge">Lv.6</div>
                    <div class="l-content">
                        <span class="l-icon">👁️</span>
                        <span class="l-name">圆锥博弈场·多空稳态</span>
                        <span class="l-desc">多空博弈实时仿真 · 引力带 · 价格标记</span>
                        <span class="l-tag orange-tag">博弈仿真</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 中轴线定价 -->
                <div class="level prominent">
                    <div class="l-badge">Lv.7</div>
                    <div class="l-content">
                        <span class="l-icon">📐</span>
                        <span class="l-name">圆锥中轴线资产稳态定价</span>
                        <span class="l-desc">= <span class="hl">Rf</span> + <span class="gold">Rp</span> × <span class="green">β</span></span>
                        <span class="l-tag active">稳态估值</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 圈层最优配比 -->
                <div class="level bottom-line">
                    <div class="l-badge">Lv.8</div>
                    <div class="l-content">
                        <span class="l-icon">📊</span>
                        <span class="l-name">圈层最优资源配比演算</span>
                        <span class="l-desc">胜率p · 赔率b · 最优仓位 f* · 实际配置比例</span>
                        <span class="l-tag gold-tag">仓位演算</span>
                    </div>
                </div>
                <div class="divider-line"></div>

                <!-- 风控熔断 -->
                <div class="level capstone">
                    <div class="l-badge">Lv.9</div>
                    <div class="l-content">
                        <span class="l-icon">🛡️</span>
                        <span class="l-name">风控熔断机制</span>
                        <span class="l-desc">0.48保本 / 0.50中轴 / &gt;0.68圈层熔断</span>
                        <span class="l-tag red-tag">熔断红线</span>
                    </div>
                </div>
            </div>

            <!-- 结构总结 -->
            <div class="struct-summary">
                <strong>精算链路：</strong>
                <span class="hl">三棱柱地基</span>
                → <span class="gold">多棱锥聚合</span>
                → <span class="green">六维国学向量</span>
                → <span class="hl">风险向量合成</span>
                → <span class="gold">圆锥浓度精算</span>
                → <span class="green">中轴线稳态定价</span>
                → <span class="hl">圈层最优配比</span>
                → <span class="red">风控熔断</span>
            </div>'''

content = content.replace(old_structure, new_structure)

# Fix structure title
content = content.replace(
    '🗺️ 精算系统总览 <span class="tag">资本定价 · 完整链路</span>',
    '🗺️ 精算系统总览 <span class="tag">风险向量 · 浓度稳态</span>'
)
content = content.replace(
    '从顶层定调到风控熔断 · 九层逻辑递进',
    '从三棱柱地基到风控熔断 · 精算链路全景'
)

# Fix 3: Fix section-layer8 title
content = content.replace(
    '📊 凯利资源配置模拟器 <span class="tag">动态仓位</span>',
    '📊 圈层最优资源配比演算 <span class="tag">动态仓位</span>'
)
content = content.replace(
    '自动读取第七层风险溢价作为<span class="hl">胜率 p</span>，联动圆锥区间输出<span class="hl">最优资源配置方案</span>',
    '自动读取中轴线定价层的风险溢价作为<span class="hl">胜率 p</span>，联动圆锥浓度区间输出<span class="hl">最优资源配比方案</span>'
)

# Fix "凯利" references in layer8
content = content.replace('凯利资源配置', '圈层最优配比')

# Fix "圆锥博弈场" section references
content = content.replace('🎯 营销三流分发 · 实时最优权重（信息摩擦系数 φ 修正）', '🎯 多空博弈引力 · 实时稳态权重（信息摩擦系数 φ 修正）')

# Fix 4: In reverse-decoder, remove long marketing case studies but keep interactive controls
# The "三流分发对照组" with 瑞幸/泡泡玛特/漫威IP is long theory - need to simplify
# Let's find and replace that section
old_case_study = '''            <!-- ===== 三流分发对照组（瑞幸/泡泡玛特/漫威IP） ===== -->
            <div style="margin-top:14px; background:rgba(255,255,255,0.02); border-radius:12px; padding:14px 16px; border:1px solid rgba(255,255,255,0.04);">
                <div style="font-size:11px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">🔁 三流分发对照组 · 同一成本结构下的分发重心差异</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; font-size:11px;">'''

# Find the end of this section - it's a long comparison table. Let's replace it with a brief note.
# Actually, let me find the exact end marker first.

# Fix "三流分发成本" title
content = content.replace(
    '📡 三流分发成本 · 营销/运营/物流 统一为「分发」',
    '📡 交易成本拆解 · 信息传导/资金流动/资产交割'
)
content = content.replace(
    '品牌+IP授权 · 营销传播',
    '品牌+IP授权 · 信息传导成本'
)
content = content.replace(
    '平台佣金+KOL · 运营采买',
    '平台佣金+做市 · 资金流动成本'
)

# Fix 5: Fix "营销" references in user-visible text (JS code will use getElementById which may fail silently)
# Fix the JS user-visible messages
content = content.replace("'🚫 <strong>营销投入亏损！</strong>ROMI为负，建议立即暂停投放、重新评估渠道组合。'",
                          "'🚫 <strong>配置亏损警告！</strong>风险回报比为负，建议立即降仓、重新评估资产组合。'")
content = content.replace("'⚠️ <strong>跑不赢圆锥稳态中轴线基准值：</strong>当前营销回报低于' + RfPct.toFixed(1) + '%的资金成本，建议缩减低效投放。'",
                          "'⚠️ <strong>跑不赢圆锥稳态中轴线基准值：</strong>当前组合回报低于' + RfPct.toFixed(1) + '%的无风险基准，建议缩减低效配置。'")
content = content.replace("'🟢 <strong>健康区间：</strong>营销回报跑赢圆锥稳态中轴线基准值，经营杠杆DOL=' + DOL.toFixed(2) + 'x，可持续投放。'",
                          "'🟢 <strong>健康区间：</strong>组合回报跑赢圆锥稳态中轴线基准值，配置杠杆DOL=' + DOL.toFixed(2) + 'x，可稳健配置。'")

# Fix other "营销" references in visible text
content = content.replace('(含营销摊销+', '(含交易成本摊销+')
content = content.replace('% 营收 · 营销+运营+物流', '% 仓位 · 信息+资金+交割')

# Fix "业财融合 · 营销成本精算引擎" comment (JS comment, internal)
content = content.replace('// ===== 业财融合 · 营销成本精算引擎（v1.6新增）=====',
                          '// ===== 交易成本精算引擎（v1.6适配）=====')

# Fix section-cone subtitle
content = content.replace(
    'C = m × ρ₀ / V(h) · 溶质质量 × 信源密度 / 市场容积 · 0.68熔断边界',
    'C = m × ρ₀ / V(h) · 风险质量 × 信源密度 / 市场容积 · 0.68圈层熔断边界'
)

# Fix cone section internal text
content = content.replace(
    '<div style="font-size: 13px; font-weight: 600; color: #a78bfa; margin-bottom: 6px;">📐 圆锥中轴线定价 · 稳态基准锚点</div>',
    '<div style="font-size: 13px; font-weight: 600; color: #a78bfa; margin-bottom: 6px;">📐 圆锥中轴线定价 · 稳态基准锚点</div>'
)

# Fix "0.68 风控铁律" in fuse risk section
content = content.replace(
    '🛡️ 风控熔断机制 · 0.68圈层稳态铁律',
    '🛡️ 风控熔断机制 · 0.68圈层稳态铁律'
)

# Fix reverse-decoder long text - simplify "三流分发" related content
# The big comparison div with 瑞幸/泡泡玛特/漫威IP - let's truncate it to just a note
# Find and replace the long comparison block
old_compare_start = '            <!-- ===== 三流分发对照组（瑞幸/泡泡玛特/漫威IP） ===== -->'
old_compare_end = '                    </div>\n                </div>\n            </div>\n\n            <div class="cone-note">'

# Let's find a simpler approach - just replace the long case study header and content
# Since this is complex HTML, let's do targeted replacements

# Replace "营销三流分发" references
content = content.replace('营销三流分发', '多空资金博弈')

# Fix "反向拆解" section long case content - simplify the 瑞幸/泡泡玛特/漫威 comparison
old_case_block_start = '<div style="margin-top:14px; background:rgba(255,255,255,0.02); border-radius:12px; padding:14px 16px; border:1px solid rgba(255,255,255,0.04);">\n                <div style="font-size:11px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">🔁 三流分发对照组 · 同一成本结构下的分发重心差异</div>'
new_case_block = '<div style="margin-top:14px; padding: 10px 14px; background: rgba(167,139,250,0.03); border-left: 2px solid rgba(167,139,250,0.2); border-radius: 0 8px 8px 0; font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6;">\n                <strong style="color:rgba(255,255,255,0.5);">📐 自研术语注解：</strong>不同资产的交易成本重心不同——价值型偏重资产交割（流动性折价）、成长型偏重资金流动（波动率溢价）、主题型偏重信息传导（认知溢价）。</div>'

# Find and remove the entire case study grid (3 columns of 瑞幸/泡泡玛特/漫威)
import re
# This pattern is too complex for simple string replace, let's do a regex to remove from the header to the cone-note
# The pattern: match from old_case_block_start through the closing </div> tags up to the cone-note
pattern = r'<div style="margin-top:14px; background:rgba\(255,255,255,0\.02\); border-radius:12px; padding:14px 16px; border:1px solid rgba\(255,255,255,0\.04\);">\s*<div style="font-size:11px; color:rgba\(255,255,255,0\.3\); text-transform:uppercase; letter-spacing:0\.5px; margin-bottom:10px;">🔁 三流分发对照组.*?</div>\s*</div>\s*</div>\s*</div>\s*<div class="cone-note">'
content = re.sub(pattern, new_case_block + '\n\n            <div class="cone-note">', content, flags=re.DOTALL)

# Fix "成本结构" advice text which still has marketing terms
content = content.replace('五池合计 <strong style="color:#f1f5f9;">¥12.8</strong> · 终端零售 <strong style="color:#f87171;">¥9.9</strong> · 单杯 <strong style="color:#f87171;">亏损 ¥2.9</strong> · 三流分发占 <strong style="color:#f472b6;">¥4.0 (31%)</strong> 是定价权隐性地基',
                          '成本合计 <strong style="color:#f1f5f9;">¥12.8</strong> · 估值 <strong style="color:#f87171;">¥9.9</strong> · 单位 <strong style="color:#f87171;">折价 ¥2.9</strong> · 交易成本占 <strong style="color:#f472b6;">¥4.0 (31%)</strong> 是稳态估值的隐性折溢价因子')

# Fix "原料 + 包材 · 产品基底"
content = content.replace('原料 + 包材 · 产品基底', '底层资产 · 现货基底')
content = content.replace('🚚 物流供应链', '🚚 资产交割成本')
content = content.replace('仓储+干线+损耗 · 物流供应链', '交割+摩擦+损耗 · 流动性成本')

# Fix cash labels in reverse decoder
content = content.replace('扣原料+资产交割', '扣底层资产+交割成本')
content = content.replace('叠加信息+资金流动 · 深度亏损', '叠加信息+资金成本 · 深度折价')

# Fix prism section labels that weren't caught earlier
content = content.replace('成本结构', '资产成本结构')
content = content.replace('工艺水平', '资产质量等级')
content = content.replace('技术壁垒', '技术护城河')
content = content.replace('功能完备', '收益完备性')
content = content.replace('品质纯度', '资产纯度')
content = content.replace('IP资产', 'IP无形资产')
content = content.replace('心智占领', '心智市占率')
content = content.replace('口碑传播', '口碑传播度')
content = content.replace('认知溢价', '认知溢价率')
content = content.replace('信息传导', '信息传导效率')
content = content.replace('资金流动', '资金流动效率')
content = content.replace('资产交割', '资产交割效率')

# Fix pyramid section "业务" references
content = content.replace('业务维度开关（点击叠加/剥离）', '风险维度开关（点击叠加/剥离）')
content = content.replace('单位业务价值', '单位风险价值')
content = content.replace('高维业务聚合', '高维风险聚合')
content = content.replace('业务价值向上聚合', '风险价值向上聚合')

# Fix some remaining "资本定价" references
content = content.replace('得到最终的 <strong>资本定价</strong>', '得到最终的 <strong>稳态估值</strong>')
content = content.replace('影响最终的资本定价', '影响最终的稳态估值')
content = content.replace('共同构成资本定价的完整评估体系', '共同构成圆锥稳态定价的精算体系')
content = content.replace('圆锥模型 · 资本定价', '圆锥模型 · 稳态锚点')
content = content.replace('<span class="hl">资本定价公式</span>', '<span class="hl">稳态定价公式</span>')
content = content.replace('资本定价公式', '稳态定价公式')

# Fix "0.68稳态铁律" references in flow overview
content = content.replace('0.68稳态铁律', '0.68圈层稳态铁律')

# Fix "上帝视角" remaining references
content = content.replace('上帝视角', '圆锥博弈场')

# Fix "凯利" remaining in kelly section labels
content = content.replace('理论仓位', '圈层理论配比')
content = content.replace('实际投放比例', '实际配置比例')
content = content.replace('最优资源配置方案', '最优资源配比方案')
content = content.replace('凯利仓位', '圈层配比仓位')
content = content.replace('凯利最优', '圈层最优')

# Write fixed file
with open('/workspace/finance-risk-simulator.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixes applied successfully!")
