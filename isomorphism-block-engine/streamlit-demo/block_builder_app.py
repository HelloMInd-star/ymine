"""
跨域同构积木映射引擎 · Streamlit 可视化拼装演示台
Isomorphism Block Engine · Streamlit Demo (Public Version)

本文件为公开演示框架，不含精细权重与阈值参数。
高精度量化运算、完整深度推演需调用 isomorphism-block-private-engine 私有库。
"""

import streamlit as st
import pandas as pd
import json
import os

# ============ 页面配置 ============
st.set_page_config(
    page_title="🧱 跨域同构积木映射引擎 · 拼装台",
    page_icon="🧱",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ============ 自定义深色样式（与GameOS星空深色 #0b0b1a 统一） ============
st.markdown("""
<style>
    .stApp { background: #0b0b1a; color: #fff; }
    .block-card {
        padding: 14px 16px; border-radius: 10px; margin: 6px 0;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        transition: all 0.2s;
    }
    .block-card:hover { background: rgba(250,204,21,0.06); border-color: rgba(250,204,21,0.3); }
    .fuse-red { background: rgba(239,68,68,0.12); border: 2px solid #ef4444; border-radius: 12px; padding: 16px; text-align: center; }
    .fuse-green { background: rgba(34,197,94,0.08); border: 2px solid #22c55e; border-radius: 12px; padding: 16px; text-align: center; }
    .fuse-yellow { background: rgba(250,204,21,0.08); border: 2px solid #facc15; border-radius: 12px; padding: 16px; text-align: center; }
    .chain-arrow { text-align: center; font-size: 18px; color: rgba(255,255,255,0.3); margin: 4px 0; }
    .metric-box { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 14px; border-left: 3px solid #facc15; }
    .privacy-note { background: rgba(99,102,241,0.08); border-left: 3px solid #818cf8; padding: 10px 14px; border-radius: 8px; font-size: 12px; color: rgba(255,255,255,0.6); margin: 10px 0; }
    h1, h2, h3 { color: #fff !important; }
</style>
""", unsafe_allow_html=True)

# ============ 领域积木模组数据 ============
DOMAINS = {
    "finance": {"emoji": "💰", "name": "财务", "desc": "会计科目·复式记账·现金流", "color": "#3b82f6"},
    "cad": {"emoji": "📐", "name": "CAD 工程", "desc": "图层·装配体·约束关系", "color": "#ef4444"},
    "lego": {"emoji": "🧱", "name": "乐高", "desc": "积木零件·凹凸接口·模块化", "color": "#facc15"},
    "battery": {"emoji": "🔋", "name": "电池", "desc": "单体组合·串并联·能量密度", "color": "#22c55e"},
    "garden": {"emoji": "🌱", "name": "园林", "desc": "生长周期·生态搭配·景观层次", "color": "#a855f7"},
    "ops": {"emoji": "⚙️", "name": "运营", "desc": "PDCA循环·流程优化·闭环管理", "color": "#ec4899"},
    "pdca": {"emoji": "🔄", "name": "PDCA", "desc": "计划-执行-检查-处理·持续改进", "color": "#14b8a6"},
    "llm": {"emoji": "🤖", "name": "大模型", "desc": "Token·注意力机制·上下文窗口", "color": "#6366f1"},
    "geo": {"emoji": "🛰️", "name": "低空地质", "desc": "低空勘探·地质层构·遥感数据", "color": "#f97316"},
}

# ============ 公开版兼容度矩阵（通用框架，精细值在私有库） ============
PUBLIC_COMPAT = {
    ("finance", "cad"): 0.85, ("cad", "finance"): 0.85,
    ("cad", "lego"): 0.92, ("lego", "cad"): 0.92,
    ("lego", "battery"): 0.72, ("battery", "lego"): 0.72,
    ("battery", "cad"): 0.78, ("cad", "battery"): 0.78,
    ("garden", "finance"): 0.65, ("finance", "garden"): 0.65,
    ("ops", "pdca"): 0.95, ("pdca", "ops"): 0.95,
    ("ops", "cad"): 0.62, ("cad", "ops"): 0.62,
    ("pdca", "llm"): 0.88, ("llm", "pdca"): 0.88,
    ("llm", "geo"): 0.58, ("geo", "llm"): 0.58,
    ("geo", "cad"): 0.70, ("cad", "geo"): 0.70,
    ("lego", "ops"): 0.55, ("ops", "lego"): 0.55,
    ("battery", "garden"): 0.35, ("garden", "battery"): 0.35,
    ("finance", "lego"): 0.80, ("lego", "finance"): 0.80,
    ("ops", "llm"): 0.82, ("llm", "ops"): 0.82,
    ("cad", "llm"): 0.50, ("llm", "cad"): 0.50,
    ("finance", "llm"): 0.45, ("llm", "finance"): 0.45,
    ("garden", "lego"): 0.60, ("lego", "garden"): 0.60,
    ("battery", "ops"): 0.42, ("ops", "battery"): 0.42,
    ("pdca", "cad"): 0.75, ("cad", "pdca"): 0.75,
}

FUSE_THRESHOLD = 0.6


def get_compat(a, b):
    return PUBLIC_COMPAT.get((a, b), 0.55)


# ============ Session 状态 ============
if "chain" not in st.session_state:
    st.session_state.chain = []

# ============ 侧栏 ============
with st.sidebar:
    st.markdown("## 🧱 积木模组库")
    st.caption("点击模块添加到拼装链")
    for did, d in DOMAINS.items():
        already = did in st.session_state.chain
        btn_label = f"{d['emoji']} {d['name']}" + (" ✓" if already else "")
        if st.button(btn_label, key=f"add_{did}", disabled=already, use_container_width=True):
            st.session_state.chain.append(did)
            st.rerun()
    st.divider()
    if st.button("🔄 清空拼装链", use_container_width=True):
        st.session_state.chain = []
        st.rerun()
    st.markdown('<div class="privacy-note">🔒 <b>公私分离说明：</b>本演示使用公开版通用兼容度矩阵。精细权重系数、完整阈值参数、商用交付资料存于 isomorphism-block-private-engine 私有内核库。</div>', unsafe_allow_html=True)

# ============ 主内容区 ============
st.title("🧱 跨域同构积木映射引擎")
st.caption("基于 Y.MINE GameOS 元架构的全域模组同构拼装验证系统 · 可视化拼装演示台 v2.1")

tab1, tab2, tab3 = st.tabs(["🧩 拼装演示台", "📊 兼容度矩阵", "🔧 引擎说明"])

# ---------- Tab 1: 拼装演示 ----------
with tab1:
    chain = st.session_state.chain

    # 熔断仪表条
    col_f1, col_f2, col_f3 = st.columns([1, 3, 1])
    if len(chain) < 2:
        with col_f2:
            st.markdown('<div class="fuse-yellow"><b>⏳ 等待拼装</b><br><span style="font-size:12px;opacity:0.7">至少添加2块积木开始计算兼容度</span></div>', unsafe_allow_html=True)
        c_value = None
    else:
        scores = [get_compat(chain[i], chain[i+1]) for i in range(len(chain)-1)]
        min_score = min(scores)
        c_value = min_score
        with col_f1:
            st.markdown(f'<div class="metric-box"><div style="font-size:11px;opacity:0.5">最低兼容度 C</div><div style="font-size:28px;font-weight:800;color:{"#22c55e" if min_score>=0.75 else "#facc15" if min_score>=0.6 else "#ef4444"}">{min_score:.2f}</div></div>', unsafe_allow_html=True)
        with col_f2:
            if min_score < FUSE_THRESHOLD:
                st.markdown(f'<div class="fuse-red"><b>🚫 熔断拦截</b><br><span style="font-size:12px;opacity:0.8">C={min_score:.2f} &lt; 0.6 红线阈值 · 红色告警禁止通过</span></div>', unsafe_allow_html=True)
            elif min_score < 0.75:
                st.markdown(f'<div class="fuse-yellow"><b>⚠️ 基本通过</b><br><span style="font-size:12px;opacity:0.8">C={min_score:.2f} ≥ 0.6，可通过但建议优化接口</span></div>', unsafe_allow_html=True)
            else:
                st.markdown(f'<div class="fuse-green"><b>✅ 拼装通过</b><br><span style="font-size:12px;opacity:0.8">C={min_score:.2f}，结构同构完成，可进入验证运行</span></div>', unsafe_allow_html=True)
        with col_f3:
            st.markdown(f'<div class="metric-box" style="border-left-color:#818cf8"><div style="font-size:11px;opacity:0.5">积木数量</div><div style="font-size:28px;font-weight:800">{len(chain)}</div></div>', unsafe_allow_html=True)

    st.divider()

    # 拼装链展示
    st.markdown("### 🧩 拼装链路（按四步拆解法顺序）")
    if not chain:
        st.info("👈 从左侧选择领域积木模组添加到拼装链。推荐顺序：拆零件(财务/CAD) → 找接口(乐高) → 重新拼装(电池/运营/PDCA) → 验证运行(大模型/低空地质)")
    else:
        for i, did in enumerate(chain):
            d = DOMAINS[did]
            with st.container():
                col_k, col_v = st.columns([5, 1])
                with col_k:
                    st.markdown(f'''
                    <div class="block-card" style="border-left: 4px solid {d['color']}">
                        <span style="font-size:22px">{d['emoji']}</span>
                        <span style="font-size:16px;font-weight:700;margin-left:6px">{d['name']}</span>
                        <span style="font-size:11px;opacity:0.5;margin-left:8px">{d['desc']}</span>
                    </div>''', unsafe_allow_html=True)
                with col_v:
                    if st.button("✕ 移除", key=f"rm_{i}", use_container_width=True):
                        st.session_state.chain.pop(i)
                        st.rerun()
                if i < len(chain) - 1:
                    sc = get_compat(chain[i], chain[i+1])
                    pass_flag = "🟢" if sc >= 0.75 else "🟡" if sc >= 0.6 else "🔴"
                    st.markdown(f'<div class="chain-arrow">↓&nbsp;&nbsp;{pass_flag} 接口兼容度 C={sc:.2f}&nbsp;&nbsp;{"✓ 通过" if sc>=0.6 else "✗ 熔断"}&nbsp;&nbsp;↓</div>', unsafe_allow_html=True)

    # 验证结论
    if len(chain) >= 2:
        st.divider()
        st.markdown("### 📋 验证结论")
        if min_score < FUSE_THRESHOLD:
            st.error(f"**🔴 熔断拦截**：拼装链中存在兼容度低于0.6的接口（最低C={min_score:.2f}），无法通过验证。请调整积木顺序或更换模组。完整深度优化建议需调用私有引擎数据包。")
        elif len(chain) >= 3:
            st.success(f"**🟢 拼装通过**：所有相邻接口兼容度均 ≥ 0.6（最低C={min_score:.2f}），积木模组完成结构同构拼装。验证运行阶段需要加载私有引擎完整参数集。")
        else:
            st.warning(f"**🟡 初步通过**：当前2块积木接口兼容度C={min_score:.2f}≥0.6，建议继续添加积木完成完整链路拼装后再验证。")

        # 导出结果
        if st.button("📋 导出拼装报告（公开版）"):
            report = {
                "chain": [{"id": did, "name": DOMAINS[did]["name"]} for did in chain],
                "compat_scores": [{"pair": f"{DOMAINS[chain[i]]['name']}→{DOMAINS[chain[i+1]]['name']}", "C": round(get_compat(chain[i], chain[i+1]),3)} for i in range(len(chain)-1)],
                "min_C": round(min_score, 3),
                "fuse_threshold": FUSE_THRESHOLD,
                "passed": min_score >= FUSE_THRESHOLD,
                "note": "公开版报告 · 精细权重阈值存于私有引擎库"
            }
            st.json(report)

# ---------- Tab 2: 兼容度矩阵 ----------
with tab2:
    st.markdown("### 📊 公开版兼容度矩阵（通用框架）")
    st.caption("数值为公开版通用演示值，精细权重参数见 isomorphism-block-private-engine/thresholds/")

    ids = list(DOMAINS.keys())
    matrix_data = []
    for a in ids:
        row = {}
        for b in ids:
            if a == b:
                row[DOMAINS[b]["name"]] = "—"
            else:
                c = get_compat(a, b)
                row[DOMAINS[b]["name"]] = f"{c:.2f}"
        row["领域"] = DOMAINS[a]["emoji"] + " " + DOMAINS[a]["name"]
        matrix_data.append(row)

    df = pd.DataFrame(matrix_data).set_index("领域")
    st.dataframe(df, use_container_width=True)

    st.markdown("#### 🔴 熔断案例示例（C<0.6）")
    bad_pairs = [(a, b, get_compat(a, b)) for a in ids for b in ids if a < b and get_compat(a, b) < FUSE_THRESHOLD]
    for a, b, c in bad_pairs:
        st.markdown(f"- **{DOMAINS[a]['emoji']}{DOMAINS[a]['name']} × {DOMAINS[b]['emoji']}{DOMAINS[b]['name']}**：C={c:.2f} → <span style='color:#ef4444'>熔断拦截</span>", unsafe_allow_html=True)

# ---------- Tab 3: 引擎说明 ----------
with tab3:
    st.markdown("""
    ### 🧱 跨域同构积木映射引擎 Isomorphism Block Engine v2.1

    **基于 Y.MINE GameOS 元架构的全域模组同构拼装验证系统**

    ---

    #### 🧩 核心算法：乐高四步拆解法
    1. **拆零件**：把陌生领域拆解为标准化积木单元（零件层）
    2. **找接口**：识别零件之间的凹凸接口关系（结构同构映射）
    3. **重新拼装**：按元架构规则组合积木，构建新领域的结构模型
    4. **验证运行**：通过0.6风险浓度熔断机制，验证拼装链完整性

    #### ⚖️ 0.6 兼容度熔断机制
    - 兼容度 C = 接口匹配度 × 结构同构度 × 权重系数
    - **C ≥ 0.6** → 拼装通过，进入验证运行
    - **C < 0.6** → 🔴 红色告警拦截，禁止拼装通过
    - 精细权重系数、阈值参数 → **存于私有引擎库**

    #### 🔧 公私双引擎架构
    | 层级 | 仓库 | 内容 |
    |------|------|------|
    | 公开层 | `isomorphism-block-engine` | 静态HTML展示页、通用拼装框架、Streamlit外层框架、公开版README |
    | 私有内核 | `isomorphism-block-private-engine` | 完整推导原稿、精细权重阈值、商用全套资料、生物/天文预留赛道底层架构 |

    **联动逻辑**：公开页面仅做展示和基础结构演示；高精度量化运算、完整深度推演需要调用私有引擎数据包。缺失私有库时仅能做基础结构演示，无法商用落地。

    #### 📐 验证覆盖
    9大领域完整映射链路：财务·CAD·乐高·电池·园林·运营·PDCA·大模型·低空地质

    > **预留赛道**：生物医学、天文物理（底层架构存于私有引擎库，待解锁）
    """)

st.divider()
st.caption("🧱 Isomorphism Block Engine v2.1 · 跨域同构积木映射引擎 · GameOS 体系 · 公开演示版")
