import streamlit as st
import json
import random
from datetime import datetime, timedelta
from pathlib import Path
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

from private_engine_stub import (
    PrivateKernelNotImplementedError,
    HighPrecision128Stub,
    VectorEngineStub,
    IPDPIDControllerStub,
    LightingEngineStub,
    KMPEngineStub,
    SphereRiskEngineStub,
    MarketOperatorStub,
    MAX_EXPORT_BATCH_SIZE,
    enforce_export_limit,
    export_vectors,
    export_kmp_scores,
    export_risk_records,
    get_batch1_mock_data,
)

st.set_page_config(
    page_title="MoodMind-Lab · 金融向量实验室",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

LAB_ROOT = Path(__file__).parent.parent
CONFIG_PATH = LAB_ROOT / "config" / "lab_config.json"
RBAC_PATH = LAB_ROOT / "config" / "rbac_roles.json"

def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def load_rbac():
    with open(RBAC_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

config = load_config()
rbac = load_rbac()
mock = get_batch1_mock_data()

st.markdown("""
<style>
    .stApp {
        background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%);
    }
    .main-header {
        background: linear-gradient(90deg, rgba(147,112,219,0.15), rgba(186,85,211,0.1));
        border: 1px solid rgba(147,112,219,0.3);
        border-radius: 16px;
        padding: 25px 30px;
        margin-bottom: 15px;
    }
    .header-title {
        font-size: 32px;
        font-weight: 700;
        background: linear-gradient(90deg, #9370db, #da70d6, #87ceeb);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 8px;
    }
    .header-sub {
        color: #9370db;
        font-size: 14px;
        letter-spacing: 2px;
    }
    .redline-banner {
        background: linear-gradient(90deg, rgba(231,76,60,0.15), rgba(192,57,43,0.08));
        border: 1px solid rgba(231,76,60,0.4);
        border-radius: 10px;
        padding: 12px 18px;
        margin-bottom: 20px;
        font-size: 13px;
        color: #f5b7b1;
    }
    .redline-banner b { color: #e74c3c; }
    .metric-card {
        background: rgba(20,10,40,0.6);
        border: 1px solid rgba(147,112,219,0.25);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
    }
    .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: #da70d6;
    }
    .metric-label {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
    }
    .batch-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-right: 8px;
    }
    .batch-done {
        background: rgba(46,204,113,0.2);
        border: 1px solid rgba(46,204,113,0.5);
        color: #2ecc71;
    }
    .batch-wait {
        background: rgba(149,165,166,0.15);
        border: 1px solid rgba(149,165,166,0.3);
        color: #95a5a6;
    }
    .section-title {
        color: #ba55d3;
        font-size: 20px;
        font-weight: 700;
        margin: 20px 0 15px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(147,112,219,0.2);
    }
    .placeholder-box {
        background: rgba(0,0,0,0.3);
        border: 2px dashed rgba(231,76,60,0.4);
        border-radius: 12px;
        padding: 40px 30px;
        text-align: center;
        color: #c0392b;
    }
    .placeholder-box .ph-icon { font-size:48px; opacity:0.6; margin-bottom:15px; }
    .alert-item {
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 10px;
        border-left: 4px solid;
    }
    .alert-success { background: rgba(46,204,113,0.1); border-color: #2ecc71; }
    .alert-info { background: rgba(52,152,219,0.1); border-color: #3498db; }
    .alert-warning { background: rgba(243,156,18,0.1); border-color: #f39c12; }
    .alert-danger { background: rgba(231,76,60,0.1); border-color: #e74c3c; }
    .notimpl-card {
        background: rgba(231,76,60,0.08);
        border: 1px solid rgba(231,76,60,0.3);
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 8px;
        font-size: 12px;
        color: #e6b0aa;
        font-family: 'Courier New', monospace;
    }
    .notimpl-card .ni-name { color: #e74c3c; font-weight: 700; }
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0d0d20 0%, #150828 100%);
        border-right: 1px solid rgba(147,112,219,0.2);
    }
    .nav-title {
        font-size: 20px;
        font-weight: 700;
        color: #9370db;
        text-align: center;
        padding: 10px 0 20px 0;
        border-bottom: 1px solid rgba(147,112,219,0.2);
        margin-bottom: 20px;
    }
    .export-limit-box {
        background: rgba(243,156,18,0.1);
        border: 1px solid rgba(243,156,18,0.4);
        border-radius: 10px;
        padding: 15px;
        text-align: center;
    }
    .export-limit-value {
        font-size: 42px;
        font-weight: 800;
        color: #f39c12;
    }
</style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.markdown('<div class="nav-title">🧠 MoodMind-Lab</div>', unsafe_allow_html=True)
    st.caption(f"版本：{config['batch_version']} · 🔴红线已强制")
    page = st.radio(
        "导航菜单",
        ["🏠 总览面板", "⚠️ 球面风控", "💡 四维光照", "🔗 KMP匹配",
         "🚨 告警中心", "🔴 红线验证", "📤 导出限制", "⚙️ 系统配置"],
        label_visibility="collapsed"
    )
    st.divider()
    st.markdown("**开发批次状态**")
    st.markdown('<span class="batch-badge batch-done">✅ Batch1 完工</span>', unsafe_allow_html=True)
    st.markdown('<span class="batch-badge batch-wait">⏳ Batch2 待开发</span>', unsafe_allow_html=True)
    st.markdown('<span class="batch-badge batch-wait">⏳ Batch3 待开发</span>', unsafe_allow_html=True)
    st.divider()
    current_role = st.selectbox("当前角色（演示）", list(rbac["roles"].keys()),
                                format_func=lambda x: f"{rbac['roles'][x]['name']}")
    st.caption(rbac["roles"][current_role]["description"])
    st.divider()
    st.page_link("http://localhost:8100", label="🏠 返回实验室首页", icon="🌐")
    st.page_link("http://localhost:8090", label="🏛️ Y.Mine 总控台", icon="🎛️")
    st.page_link("http://localhost:8501", label="🧬 MS-Lab", icon="🔬")

st.markdown(f"""
<div class="main-header">
    <div class="header-title">🧠 MoodMind-Lab · 金融向量实验室</div>
    <div class="header-sub">GEOMETRIC MIND SPACE · FINANCIAL VECTOR LABORATORY · Batch1 骨架版</div>
</div>
<div class="redline-banner">
    🔴 <b>Batch1强制红线已启用</b>：所有11维公式/IPD/光照权重/KMP-LPS/128bit高精度接口 → <b>NotImplementedError</b> ｜
    批量导出硬上限 <b>100条/次</b> ｜ 工程层仅接收最终结果字段，不触碰任何金融计算
</div>
""", unsafe_allow_html=True)


def page_overview():
    st.markdown('<div class="section-title">📊 金融总库核心指标</div>', unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{mock["used_gb"]} / {mock["total_capacity_gb"]} GB</div><div class="metric-label">总库实时容量</div></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">{mock["watermark_pct"]}%</div><div class="metric-label">当前水位线</div></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{mock["daily_vector_count"]:,}</div><div class="metric-label">今日新增向量</div></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#9b59b6;">{mock["total_vectors"]:,}</div><div class="metric-label">总向量数</div></div>', unsafe_allow_html=True)

    st.markdown('<div class="section-title">💾 四级仓库占用</div>', unsafe_allow_html=True)
    tiers = mock["storage_tiers"]
    storage_df = pd.DataFrame({
        "仓库层级": ["🔥 热数据（噪声库）", "🌡️ 温数据（缓冲+常规）", "❄️ 冷数据（知识库）"],
        "占用GB": [tiers["hot"]["gb"], tiers["warm"]["gb"], tiers["cold"]["gb"]],
        "占比": [tiers["hot"]["pct"], tiers["warm"]["pct"], tiers["cold"]["pct"]],
        "颜色": [tiers["hot"]["color"], tiers["warm"]["color"], tiers["cold"]["color"]]
    })
    fig_storage = go.Figure()
    fig_storage.add_trace(go.Bar(
        x=storage_df["占比"], y=storage_df["仓库层级"], orientation="h",
        marker=dict(color=storage_df["颜色"]),
        text=[f"{v} GB · {p}%" for v, p in zip(storage_df["占用GB"], storage_df["占比"])],
        textposition="inside", textfont=dict(color="white", size=12)
    ))
    fig_storage.update_layout(
        height=260, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc", size=13), margin=dict(l=0, r=0, t=20, b=0),
        xaxis=dict(showgrid=False, range=[0, 100]), yaxis=dict(showgrid=False)
    )
    st.plotly_chart(fig_storage, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown('<div class="section-title">📈 向量日产量趋势</div>', unsafe_allow_html=True)
        days = 14
        dates = [datetime.now() - timedelta(days=i) for i in range(days-1, -1, -1)]
        random.seed(123)
        daily_counts = [random.randint(2100, 3200) for _ in range(days)]
        daily_counts[-1] = mock["daily_vector_count"]
        trend_df = pd.DataFrame({"日期": dates, "当日向量数": daily_counts})
        fig_trend = px.line(trend_df, x="日期", y="当日向量数", markers=True)
        fig_trend.update_traces(line=dict(color="#9370db", width=3), marker=dict(color="#da70d6", size=8))
        fig_trend.update_layout(
            height=260, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#ccc"), margin=dict(l=0, r=0, t=20, b=0),
            xaxis=dict(showgrid=False), yaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
        )
        st.plotly_chart(fig_trend, use_container_width=True)
    with col_b:
        st.markdown('<div class="section-title">🔀 KMP 四级路由分布</div>', unsafe_allow_html=True)
        rd = mock["kmp_route_dist"]
        route_labels = ["<25% 噪声丢弃", "25-50% 缓冲复检", "50-75% 常规入库", "≥75% 知识沉淀"]
        route_values = [rd["noise"], rd["buffer"], rd["normal"], rd["knowledge"]]
        fig_route = go.Figure(data=[go.Pie(
            labels=route_labels, values=route_values, hole=0.55,
            marker=dict(colors=["#7f8c8d", "#f39c12", "#3498db", "#9b59b6"]),
            textfont=dict(color="white", size=11)
        )])
        fig_route.update_layout(
            height=260, paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#ccc"),
            margin=dict(l=0, r=0, t=20, b=0), showlegend=True,
            legend=dict(orientation="h", y=-0.1, font=dict(size=11))
        )
        st.plotly_chart(fig_route, use_container_width=True)


def page_risk():
    st.markdown('<div class="section-title">⚠️ 球面风险模长实时监控</div>', unsafe_allow_html=True)
    risk_val = mock["sphere_risk_magnitude"]
    risk_status = "🟢 稳态运行"
    risk_color = "#2ecc71"
    if risk_val >= 0.68:
        risk_status = "🔴 熔断触发"
        risk_color = "#e74c3c"
    elif risk_val >= 0.48:
        risk_status = "🟡 预警状态"
        risk_color = "#f39c12"
    col_r1, col_r2, col_r3 = st.columns([1, 1, 1])
    with col_r1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value" style="font-size:48px; color:{risk_color};">{risk_val:.2f}</div>
            <div class="metric-label">当前球面风险模长 D10（仅展示数值位）</div>
            <div style="margin-top:10px; font-size:18px;">{risk_status}</div>
        </div>
        """, unsafe_allow_html=True)
    with col_r2:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-label" style="font-size:14px; color:#ccc; margin-bottom:15px;">阈值标尺（判定逻辑私有）</div>
            <div style="text-align:left; font-size:13px; line-height:2.2;">
                <div><span style="color:#2ecc71;">●</span> 保本线：<b>0.48</b> <span style="color:#c0392b;font-size:11px;">🔴私有判定</span></div>
                <div><span style="color:#f39c12;">●</span> 稳态轴：<b>0.50</b> <span style="color:#c0392b;font-size:11px;">🔴私有判定</span></div>
                <div><span style="color:#e74c3c;">●</span> 熔断线：<b>0.68</b> <span style="color:#c0392b;font-size:11px;">🔴私有判定</span></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_r3:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-label" style="font-size:14px; color:#ccc; margin-bottom:15px;">风控状态（仅展示位）</div>
            <div style="text-align:left; font-size:13px; line-height:2;">
                <div>🎯 凯利仓位：<b style="color:#2ecc71;">安全</b> <span style="color:#c0392b;font-size:11px;">🔴私有</span></div>
                <div>📊 持仓集中度：<b style="color:#2ecc71;">正常</b></div>
                <div>⚡ 波动率：<b style="color:#f39c12;">偏高</b></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    st.markdown('<div class="section-title">📉 风险模长时序（24h · 模拟数值）</div>', unsafe_allow_html=True)
    random.seed(99)
    risk_history = []
    base = 0.40
    for i in range(24):
        noise = random.uniform(-0.03, 0.04)
        base = max(0.35, min(0.55, base + noise))
        risk_history.append(round(base, 3))
    fig_risk = go.Figure()
    fig_risk.add_hrect(y0=0, y1=0.48, fillcolor="rgba(46,204,113,0.08)", line_width=0)
    fig_risk.add_hrect(y0=0.48, y1=0.68, fillcolor="rgba(243,156,18,0.08)", line_width=0)
    fig_risk.add_hrect(y0=0.68, y1=1, fillcolor="rgba(231,76,60,0.08)", line_width=0)
    fig_risk.add_hline(y=0.48, line_dash="dash", line_color="#f39c12", annotation_text="保本线 0.48")
    fig_risk.add_hline(y=0.50, line_dash="dot", line_color="#2ecc71", annotation_text="稳态轴 0.50")
    fig_risk.add_hline(y=0.68, line_dash="dash", line_color="#e74c3c", annotation_text="熔断线 0.68")
    fig_risk.add_trace(go.Scatter(
        y=risk_history, mode="lines+markers",
        line=dict(color=risk_color, width=3), marker=dict(size=6, color=risk_color),
        fill="tozeroy", fillcolor="rgba(147,112,219,0.1)"
    ))
    fig_risk.update_layout(
        height=320, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc"), margin=dict(l=0, r=30, t=20, b=0),
        xaxis=dict(title="小时", showgrid=False),
        yaxis=dict(title="风险模长", range=[0.3, 0.75], showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    )
    st.plotly_chart(fig_risk, use_container_width=True)


def page_lighting():
    st.markdown('<div class="section-title">💡 四维光照环境模型（仅预留展示位）</div>', unsafe_allow_html=True)
    st.info("ℹ️ 本页面仅展示光照最终结果位，动态行业权重算法为 MoodMind 私有内核，不对外公开（NotImplementedError）。")
    light = mock["lighting"]
    light_names = ["L1 成交量流动性光照", "L2 题材情绪光照", "L3 产业政策光照", "L4 产业链景气光照"]
    light_vals = [light["L1"], light["L2"], light["L3"], light["L4"]]
    light_colors = ["#f1c40f", "#e91e63", "#00bcd4", "#8bc34a"]
    light_emojis = ["💰", "🔥", "📜", "🏭"]
    cols = st.columns(4)
    for i, (name, val, color, emoji) in enumerate(zip(light_names, light_vals, light_colors, light_emojis)):
        with cols[i]:
            st.markdown(f"""
            <div class="metric-card">
                <div style="font-size:40px; margin-bottom:10px;">{emoji}</div>
                <div class="metric-value" style="font-size:36px; color:{color};">{val}%</div>
                <div class="metric-label" style="font-size:13px; color:#ccc;">{name}<br><span style="color:#c0392b;font-size:10px;">🔴权重算法私有</span></div>
            </div>
            """, unsafe_allow_html=True)
    st.markdown('<div class="section-title">光照强度对比（模拟结果展示）</div>', unsafe_allow_html=True)
    fig_light = go.Figure()
    fig_light.add_trace(go.Bar(
        x=["L1", "L2", "L3", "L4"], y=light_vals, marker=dict(color=light_colors),
        text=[f"{v}%" for v in light_vals], textposition="outside", textfont=dict(color="white", size=14)
    ))
    fig_light.update_layout(
        height=320, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc", size=14), margin=dict(l=0, r=0, t=20, b=0),
        xaxis=dict(showgrid=False, tickfont=dict(size=14)),
        yaxis=dict(range=[0, 100], showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    )
    st.plotly_chart(fig_light, use_container_width=True)
    st.markdown("""
    <div class="placeholder-box" style="margin-top:15px;">
        <div class="ph-icon">💡</div>
        <div style="font-size:16px; margin-bottom:10px;">四维光照加权算法 · Batch1 不实现</div>
        <div style="font-size:13px; max-width:550px; margin:0 auto; line-height:1.8;">
        • L1/L2/L3/L4 动态权重融合 → <b style="color:#e74c3c;">NotImplementedError</b><br>
        • 行业维度细分光照 → Batch2<br>
        • 光照-向量关联分析 → Batch2<br>
        • 私有加权算法永不进入工程层
        </div>
    </div>
    """, unsafe_allow_html=True)


def page_kmp():
    st.markdown('<div class="section-title">🔗 KMP 周期匹配热度（仅预留分值接收字段）</div>', unsafe_allow_html=True)
    st.markdown("""
    <div class="placeholder-box">
        <div class="ph-icon">🔗</div>
        <div style="font-size:18px; margin-bottom:15px;">KMP 改良周期匹配面板 · Batch1 仅预留分值字段</div>
        <div style="font-size:13px; max-width:550px; margin:0 auto; line-height:2; text-align:left;">
        <div>🔴 build_lps_array（LPS源码） → <b>NotImplementedError</b></div>
        <div>🔴 kmp_search 模式匹配 → <b>NotImplementedError</b></div>
        <div>🔴 pattern_similarity 相似度计算 → <b>NotImplementedError</b></div>
        <div>🔴 cycle_detection 周期检测 → <b>NotImplementedError</b></div>
        <div>🔴 homologous_pattern_mining 同源挖掘 → <b>NotImplementedError</b></div>
        <div style="margin-top:12px;color:#2ecc71;">✅ receive_final_score(score) 分值接收字段已预留</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    col_k1, col_k2, col_k3 = st.columns(3)
    with col_k1:
        st.metric("今日匹配总次数（模拟）", f"{mock['kmp_today_total']:,}", delta="+8.3%")
    with col_k2:
        st.metric("高同源范式≥75%（模拟）", f"{mock['kmp_high_homology']:,}", delta="+12.1%")
    with col_k3:
        st.metric("平均相似度（模拟）", f"{mock['kmp_avg_similarity']:.2f}", delta="-0.03", delta_color="off")
    st.markdown('<div class="section-title">📥 KMP分值接收测试（唯一允许的入口）</div>', unsafe_allow_html=True)
    test_score = st.slider("模拟输入KMP相似度分值（0~1）", 0.0, 1.0, 0.58, 0.01)
    if st.button("测试分值路由"):
        result = KMPEngineStub.receive_final_score(test_score)
        st.success(f"✅ 分值接收成功 → 路由层级: **{result['tier']}** → 目标库: **{result['route_target']}**")
        st.json(result)


def page_alerts():
    st.markdown('<div class="section-title">🚨 MoodMind 独立告警中心</div>', unsafe_allow_html=True)
    alerts = [
        {"level": "danger", "time": "2026-07-21 06:40", "module": "红线", "msg": "🔴 Batch1红线已强制：所有私有接口抛出NotImplementedError"},
        {"level": "success", "time": "2026-07-21 06:35", "module": "导出", "msg": f"批量导出硬限制已生效：单次上限 {MAX_EXPORT_BATCH_SIZE} 条"},
        {"level": "success", "time": "2026-07-21 06:30", "module": "系统", "msg": "Batch1骨架搭建完成，所有模块加载正常"},
        {"level": "info", "time": "2026-07-21 06:28", "module": "存储", "msg": "金融向量总库挂载成功，容量100GB"},
        {"level": "warning", "time": "2026-07-21 06:25", "module": "API", "msg": "MS-Lab推送通道待对接，Batch2将完成实装"},
        {"level": "info", "time": "2026-07-21 06:22", "module": "安全", "msg": "RBAC四级权限系统加载完成"},
        {"level": "info", "time": "2026-07-21 06:20", "module": "风控", "msg": "球面风控桩模块加载（公式不实现）"},
    ]
    level_map = {"info": "alert-info", "success": "alert-success", "warning": "alert-warning", "danger": "alert-danger"}
    icon_map = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "danger": "🔴"}
    for alert in alerts:
        css_class = level_map.get(alert["level"], "alert-info")
        icon = icon_map[alert["level"]]
        st.markdown(f"""
        <div class="alert-item {css_class}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span style="margin-right:8px;">{icon}</span>
                    <b>[{alert['module']}]</b> {alert['msg']}
                </div>
                <div style="color:#666; font-size:11px; white-space:nowrap;">{alert['time']}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)


def page_redline():
    st.markdown('<div class="section-title">🔴 Batch1 红线强制验证面板</div>', unsafe_allow_html=True)
    st.warning("本面板验证：所有私有内核接口均抛出 NotImplementedError，工程层不含任何金融公式代码。")

    stub_classes = [
        ("HighPrecision128（128bit高精度）", HighPrecision128Stub, [
            ("precise_vector_dot", [[1.0]*11, [1.0]*11]),
            ("precise_risk_magnitude", [[0.5]*11]),
            ("precise_kelly_coefficient", [0.55, 1.8]),
            ("precise_integral", [[1.0]*20, 20]),
            ("precise_derivative", [[1.0]*20, 5]),
            ("precise_deviation", [100.0, 95.0]),
            ("precise_phase_angle", [[0.0]*36]),
            ("precise_lps_build", [[0.1,0.2,0.3]]),
        ]),
        ("VectorEngine（11维向量计算）", VectorEngineStub, [
            ("calc_d0_subject", [{}]), ("calc_d1_action", [{}]), ("calc_d2_attribute", [{}]),
            ("calc_d3_disturbance", [{}]), ("calc_d4_price_deviation", [100.0, 95.0]),
            ("calc_d5_integral", [[1.0]*20]), ("calc_d6_derivative", [[1.0]*20]),
            ("calc_d7_chip_box", [{}]), ("calc_d8_cycle_phase", [{}]),
            ("calc_d9_kelly", [0.55, 1.8]), ("calc_d10_sphere_risk", [[0.5]*11]),
        ]),
        ("IPDPIDController（IPD三维PID）", IPDPIDControllerStub, [
            ("pid_iterate", [0.1, 0.2, 0.05, 0.0, 0.1]),
            ("auto_adjust_weights", [[]]),
            ("convergence_check", [[0.01]*10]),
        ]),
        ("LightingEngine（四维光照权重）", LightingEngineStub, [
            ("calc_l1_liquidity_weight", [{}]), ("calc_l2_sentiment_weight", [{}]),
            ("calc_l3_policy_weight", [{}]), ("calc_l4_prosperity_weight", [{}]),
            ("dynamic_weight_fusion", [0.7, 0.8, 0.5, 0.6, "bull"]),
        ]),
        ("KMPEngine（KMP-LPS底层）", KMPEngineStub, [
            ("build_lps_array", [[0.1,0.2,0.3]]), ("kmp_search", [[0.0]*100, [0.1,0.2]]),
            ("pattern_similarity", [[0.0]*50, [0.0]*50]),
            ("cycle_detection", [[0.0]*100]), ("homologous_pattern_mining", [[], 0.75]),
        ]),
        ("SphereRiskEngine（球面风控）", SphereRiskEngineStub, [
            ("solve_hypersphere_magnitude", [[0.5]*11]),
            ("threshold_judge", [0.5]), ("fuse_trigger_check", [0.7, {}]),
        ]),
        ("MarketOperator（市场私有算子）", MarketOperatorStub, [
            ("calc_pivot_price", [{}]), ("calc_chip_distribution", [[]]),
            ("calc_market_phase", [{}]), ("calc_kelly_position", [{}]),
        ]),
    ]

    total_count = 0
    not_impl_count = 0
    for class_name, cls, methods in stub_classes:
        st.markdown(f"**{class_name}**")
        instance = cls()
        for method_name, args in methods:
            total_count += 1
            try:
                getattr(instance, method_name)(*args)
                st.markdown(f'<div class="notimpl-card" style="border-color:#27ae60;color:#27ae60;">❌ {method_name}() 未抛出异常（违反红线）</div>', unsafe_allow_html=True)
            except PrivateKernelNotImplementedError as e:
                not_impl_count += 1
                st.markdown(f'<div class="notimpl-card"><span class="ni-name">🔴 {method_name}()</span> → NotImplementedError ✓</div>', unsafe_allow_html=True)
            except Exception as e:
                st.markdown(f'<div class="notimpl-card" style="border-color:#f39c12;">⚠️ {method_name}() → {type(e).__name__}: {str(e)[:60]}</div>', unsafe_allow_html=True)
        st.divider()

    col_s1, col_s2, col_s3 = st.columns(3)
    with col_s1:
        st.metric("私有接口总数", total_count)
    with col_s2:
        st.metric("正确抛出NotImplementedError", not_impl_count, delta=None)
    with col_s3:
        status_icon = "✅" if not_impl_count == total_count else "❌"
        st.metric("红线合规率", f"{not_impl_count}/{total_count} = {not_impl_count*100//total_count}%")
    if not_impl_count == total_count:
        st.success(f"{status_icon} 红线验证通过：全部 {total_count} 个私有接口均正确抛出 NotImplementedError。")
    else:
        st.error(f"❌ 发现 {total_count - not_impl_count} 个接口未正确抛出异常，请检查！")


def page_export():
    st.markdown('<div class="section-title">📤 批量导出硬限制（单次上限100条）</div>', unsafe_allow_html=True)
    col_e1, col_e2 = st.columns([1, 1])
    with col_e1:
        st.markdown(f"""
        <div class="export-limit-box">
            <div class="metric-label" style="font-size:14px;color:#ccc;">硬编码单次导出上限</div>
            <div class="export-limit-value">{MAX_EXPORT_BATCH_SIZE}</div>
            <div class="metric-label" style="font-size:12px;color:#888;">条/次 · 无法在UI层修改</div>
        </div>
        """, unsafe_allow_html=True)
    with col_e2:
        st.markdown("""
        <div class="metric-card" style="text-align:left;">
            <div style="font-size:14px;color:#ccc;margin-bottom:12px;"><b>硬限制规则</b></div>
            <div style="font-size:12px;line-height:2;color:#bbb;">
            • 请求 ≤100 条 → 全额返回<br>
            • 请求 &gt;100 条 → 强制截断到100条<br>
            • truncated 字段标记是否被截断<br>
            • 三类导出统一限制：向量 / KMP分值 / 风控记录
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown('<div class="section-title">🧪 导出限制测试</div>', unsafe_allow_html=True)
    test_count = st.number_input("模拟请求导出条数", min_value=1, max_value=10000, value=250, step=50)
    if st.button("测试向量导出"):
        mock_vecs = [{"id": i, "data": f"vector_{i}"} for i in range(test_count)]
        result = export_vectors(mock_vecs, requester=current_role)
        if result["truncated"]:
            st.warning(f"⚠️ 请求 {result['requested_count']} 条 → 被硬限制截断为 {result['exported_count']} 条（上限{result['limit']}）")
        else:
            st.success(f"✅ 导出成功：{result['exported_count']} 条（未触发截断）")
        st.json({
            "export_id": result["export_id"],
            "requested": result["requested_count"],
            "exported": result["exported_count"],
            "truncated": result["truncated"],
            "limit": result["limit"]
        })
    if st.button("测试KMP分值导出（500条）"):
        mock_scores = [{"score_id": i, "score": round(random.random(), 3)} for i in range(500)]
        result = export_kmp_scores(mock_scores)
        st.warning(f"⚠️ 请求500条 → 硬截断为 {result['exported_count']} 条")
        st.json({"requested": 500, "exported": result["exported_count"], "truncated": True, "limit": MAX_EXPORT_BATCH_SIZE})


def page_config():
    st.markdown('<div class="section-title">⚙️ 系统配置概览</div>', unsafe_allow_html=True)
    col_c1, col_c2 = st.columns(2)
    with col_c1:
        st.markdown("**实验室基本信息**")
        st.json({
            "实验室名称": config["lab_name"],
            "当前批次": config["batch_version"],
            "静态首页端口": config["ports"]["static_home"],
            "Streamlit端口": config["ports"]["streamlit_dashboard"],
            "红线状态": "已强制",
            "导出上限": f"{MAX_EXPORT_BATCH_SIZE}条/次"
        })
        st.markdown("**向量维度配置**")
        st.json({k: v for k, v in config["vector"].items() if k != "dimension_names"})
    with col_c2:
        st.markdown("**风控阈值配置（仅展示值，判定逻辑私有）**")
        st.json(config["sphere_risk"])
        st.markdown("**KMP路由阈值**")
        st.json(config["kmp_routing"])
        st.markdown("**RBAC角色列表**")
        st.json(list(rbac["roles"].keys()))
    st.markdown('<div class="section-title">🔐 权限矩阵（演示）</div>', unsafe_allow_html=True)
    perm_data = []
    for role_id, role in rbac["roles"].items():
        perm_data.append({"角色": role["name"], "角色ID": role_id, "权限数量": len(role["permissions"])})
    st.dataframe(pd.DataFrame(perm_data), use_container_width=True, hide_index=True)


page_map = {
    "🏠 总览面板": page_overview,
    "⚠️ 球面风控": page_risk,
    "💡 四维光照": page_lighting,
    "🔗 KMP匹配": page_kmp,
    "🚨 告警中心": page_alerts,
    "🔴 红线验证": page_redline,
    "📤 导出限制": page_export,
    "⚙️ 系统配置": page_config,
}
page_map[page]()

st.divider()
st.caption(f"🧠 MoodMind-Lab · Batch1 · 🔴红线强制 | 128bit接口NotImplementedError | 导出上限{MAX_EXPORT_BATCH_SIZE}条 | ⛔私有内核永不入工程层")
