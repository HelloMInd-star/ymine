import streamlit as st
import json
import random
import time
from datetime import datetime, timedelta
from pathlib import Path
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np

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
        margin-bottom: 25px;
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
    .status-steady {
        color: #2ecc71;
        font-weight: 700;
    }
    .status-warning {
        color: #f39c12;
        font-weight: 700;
    }
    .status-fuse {
        color: #e74c3c;
        font-weight: 700;
        font-size: 18px;
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
        border: 2px dashed rgba(147,112,219,0.3);
        border-radius: 12px;
        padding: 50px 30px;
        text-align: center;
        color: #666;
    }
    .alert-item {
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 10px;
        border-left: 4px solid;
    }
    .alert-success {
        background: rgba(46,204,113,0.1);
        border-color: #2ecc71;
    }
    .alert-info {
        background: rgba(52,152,219,0.1);
        border-color: #3498db;
    }
    .alert-warning {
        background: rgba(243,156,18,0.1);
        border-color: #f39c12;
    }
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
</style>
""", unsafe_allow_html=True)

with st.sidebar:
    st.markdown('<div class="nav-title">🧠 MoodMind-Lab</div>', unsafe_allow_html=True)
    st.caption(f"版本：{config['batch_version']}")
    page = st.radio(
        "导航菜单",
        ["🏠 总览面板", "⚠️ 球面风控", "💡 四维光照", "🔗 KMP匹配", "🚨 告警中心", "⚙️ 系统配置"],
        label_visibility="collapsed"
    )
    st.divider()
    st.markdown("**开发批次状态**")
    st.markdown('<span class="batch-badge batch-done">✅ Batch1 完工</span>', unsafe_allow_html=True)
    st.markdown('<span class="batch-badge batch-wait">⏳ Batch2 待开发</span>', unsafe_allow_html=True)
    st.markdown('<span class="batch-badge batch-wait">⏳ Batch3 待开发</span>', unsafe_allow_html=True)
    st.divider()
    current_role = st.selectbox("当前角色（演示）", list(rbac["roles"].keys()), format_func=lambda x: f"{rbac['roles'][x]['name']}")
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
""", unsafe_allow_html=True)

def page_overview():
    st.markdown('<div class="section-title">📊 金融总库核心指标</div>', unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown('<div class="metric-card"><div class="metric-value">62.4 / 100 GB</div><div class="metric-label">总库实时容量</div></div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">62.4%</div><div class="metric-label">当前水位线</div></div>', unsafe_allow_html=True)
    with col3:
        st.markdown('<div class="metric-card"><div class="metric-value">2,847</div><div class="metric-label">今日新增向量</div></div>', unsafe_allow_html=True)
    with col4:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#9b59b6;">42,186</div><div class="metric-label">总向量数</div></div>', unsafe_allow_html=True)

    st.markdown('<div class="section-title">💾 四级仓库占用</div>', unsafe_allow_html=True)
    storage_df = pd.DataFrame({
        "仓库层级": ["🔥 热数据（噪声库）", "🌡️ 温数据（缓冲+常规）", "❄️ 冷数据（知识库）", "📦 元数据索引"],
        "占用GB": [18.7, 31.2, 12.5, 0.0],
        "占比": [30, 50, 20, 0],
        "颜色": ["#e74c3c", "#f39c12", "#3498db", "#95a5a6"]
    })
    fig_storage = go.Figure()
    fig_storage.add_trace(go.Bar(
        x=storage_df["占比"],
        y=storage_df["仓库层级"],
        orientation="h",
        marker=dict(color=storage_df["颜色"]),
        text=[f"{v} GB · {p}%" for v, p in zip(storage_df["占用GB"], storage_df["占比"])],
        textposition="inside",
        textfont=dict(color="white", size=12)
    ))
    fig_storage.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc", size=13),
        margin=dict(l=0, r=0, t=20, b=0),
        xaxis=dict(showgrid=False, range=[0, 100]),
        yaxis=dict(showgrid=False)
    )
    st.plotly_chart(fig_storage, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown('<div class="section-title">📈 向量日产量趋势</div>', unsafe_allow_html=True)
        days = 14
        dates = [datetime.now() - timedelta(days=i) for i in range(days-1, -1, -1)]
        daily_counts = [random.randint(2100, 3200) for _ in range(days)]
        daily_counts[-1] = 2847
        trend_df = pd.DataFrame({"日期": dates, "当日向量数": daily_counts})
        fig_trend = px.line(trend_df, x="日期", y="当日向量数", markers=True)
        fig_trend.update_traces(line=dict(color="#9370db", width=3), marker=dict(color="#da70d6", size=8))
        fig_trend.update_layout(
            height=280,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#ccc"),
            margin=dict(l=0, r=0, t=20, b=0),
            xaxis=dict(showgrid=False),
            yaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.05)")
        )
        st.plotly_chart(fig_trend, use_container_width=True)
    with col_b:
        st.markdown('<div class="section-title">🔀 KMP 四级路由分布</div>', unsafe_allow_html=True)
        route_labels = ["<25% 噪声丢弃", "25-50% 缓冲复检", "50-75% 常规入库", "≥75% 知识沉淀"]
        route_values = [15, 25, 40, 20]
        route_colors = ["#7f8c8d", "#f39c12", "#3498db", "#9b59b6"]
        fig_route = go.Figure(data=[go.Pie(
            labels=route_labels,
            values=route_values,
            hole=0.55,
            marker=dict(colors=route_colors),
            textfont=dict(color="white", size=11)
        )])
        fig_route.update_layout(
            height=280,
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#ccc"),
            margin=dict(l=0, r=0, t=20, b=0),
            showlegend=True,
            legend=dict(orientation="h", y=-0.1, font=dict(size=11))
        )
        st.plotly_chart(fig_route, use_container_width=True)

def page_risk():
    st.markdown('<div class="section-title">⚠️ 球面风险模长实时监控</div>', unsafe_allow_html=True)
    risk_val = 0.42
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
            <div class="metric-label">当前球面风险模长 D10</div>
            <div style="margin-top:10px; font-size:18px;">{risk_status}</div>
        </div>
        """, unsafe_allow_html=True)
    with col_r2:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-label" style="font-size:14px; color:#ccc; margin-bottom:15px;">阈值标尺</div>
            <div style="text-align:left; font-size:13px; line-height:2.2;">
                <div><span style="color:#2ecc71;">●</span> 保本线：<b>0.48</b></div>
                <div><span style="color:#f39c12;">●</span> 稳态轴：<b>0.50</b></div>
                <div><span style="color:#e74c3c;">●</span> 熔断线：<b>0.68</b></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_r3:
        st.markdown("""
        <div class="metric-card">
            <div class="metric-label" style="font-size:14px; color:#ccc; margin-bottom:15px;">风控状态</div>
            <div style="text-align:left; font-size:13px; line-height:2;">
                <div>🎯 凯利仓位：<b style="color:#2ecc71;">安全</b></div>
                <div>📊 持仓集中度：<b style="color:#2ecc71;">正常</b></div>
                <div>⚡ 波动率：<b style="color:#f39c12;">偏高</b></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    st.markdown('<div class="section-title">📉 风险模长时序（24h）</div>', unsafe_allow_html=True)
    hours = 24
    risk_history = []
    base = 0.40
    for i in range(hours):
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
        y=risk_history,
        mode="lines+markers",
        line=dict(color=risk_color, width=3),
        marker=dict(size=6, color=risk_color),
        fill="tozeroy",
        fillcolor=f"rgba(147,112,219,0.1)"
    ))
    fig_risk.update_layout(
        height=350,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc"),
        margin=dict(l=0, r=30, t=20, b=0),
        xaxis=dict(title="小时", showgrid=False),
        yaxis=dict(title="风险模长", range=[0.3, 0.75], showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    )
    st.plotly_chart(fig_risk, use_container_width=True)

def page_lighting():
    st.markdown('<div class="section-title">💡 四维光照环境模型</div>', unsafe_allow_html=True)
    st.info("ℹ️ 本页面仅展示光照结果，动态行业权重算法为 MoodMind 私有内核，不对外公开。")
    light_names = ["L1 成交量流动性光照", "L2 题材情绪光照", "L3 产业政策光照", "L4 产业链景气光照"]
    light_vals = [72, 85, 45, 60]
    light_colors = ["#f1c40f", "#e91e63", "#00bcd4", "#8bc34a"]
    light_emojis = ["💰", "🔥", "📜", "🏭"]
    cols = st.columns(4)
    for i, (name, val, color, emoji) in enumerate(zip(light_names, light_vals, light_colors, light_emojis)):
        with cols[i]:
            st.markdown(f"""
            <div class="metric-card">
                <div style="font-size:40px; margin-bottom:10px;">{emoji}</div>
                <div class="metric-value" style="font-size:36px; color:{color};">{val}%</div>
                <div class="metric-label" style="font-size:13px; color:#ccc;">{name}</div>
            </div>
            """, unsafe_allow_html=True)
    st.markdown('<div class="section-title">光照强度对比</div>', unsafe_allow_html=True)
    fig_light = go.Figure()
    fig_light.add_trace(go.Bar(
        x=["L1", "L2", "L3", "L4"],
        y=light_vals,
        marker=dict(color=light_colors),
        text=[f"{v}%" for v in light_vals],
        textposition="outside",
        textfont=dict(color="white", size=14)
    ))
    fig_light.update_layout(
        height=350,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#ccc", size=14),
        margin=dict(l=0, r=0, t=20, b=0),
        xaxis=dict(showgrid=False, tickfont=dict(size=14)),
        yaxis=dict(range=[0, 100], showgrid=True, gridcolor="rgba(255,255,255,0.05)")
    )
    st.plotly_chart(fig_light, use_container_width=True)
    st.markdown("""
    <div style="background:rgba(155,89,182,0.1); border:1px solid rgba(155,89,182,0.3); border-radius:10px; padding:15px; margin-top:10px; font-size:13px; color:#bbb;">
        <b style="color:#9b59b6;">📌 Batch1说明：</b>
        四维光照展示位已预留。Batch2将接入实时光照时序曲线、行业维度细分、光照-向量关联分析等功能。
        私有加权算法永不进入工程层。
    </div>
    """, unsafe_allow_html=True)

def page_kmp():
    st.markdown('<div class="section-title">🔗 KMP 周期匹配热度面板</div>', unsafe_allow_html=True)
    st.markdown("""
    <div class="placeholder-box">
        <div style="font-size:64px; opacity:0.4; margin-bottom:20px;">🔗</div>
        <div style="font-size:20px; color:#888; margin-bottom:15px;">KMP 改良周期匹配面板</div>
        <div style="font-size:14px; color:#666; max-width:500px; margin:0 auto; line-height:1.8;">
            <p style="margin-bottom:10px;"><b style="color:#9b59b6;">📌 Batch2 待开发功能：</b></p>
            <p>• 周期匹配相似度分值热力图</p>
            <p>• 高同源范式沉淀数量统计</p>
            <p>• LPS 最长前缀后缀匹配详情</p>
            <p>• 历史周期匹配回放</p>
            <p>• KMP → MS-Lab 四级路由实时监控</p>
            <p style="margin-top:15px; color:#9b59b6; font-size:12px;">⛔ 改良 KMP 算法 LPS 源码为私有内核，工程层仅接收最终 0~1 分值</p>
        </div>
    </div>
    """, unsafe_allow_html=True)
    col_k1, col_k2, col_k3 = st.columns(3)
    with col_k1:
        st.metric("今日匹配总次数", "12,847", delta="+8.3%")
    with col_k2:
        st.metric("高同源范式（≥75%）", "847", delta="+12.1%", delta_color="normal")
    with col_k3:
        st.metric("平均相似度", "0.58", delta="-0.03", delta_color="off")

def page_alerts():
    st.markdown('<div class="section-title">🚨 MoodMind 独立告警中心</div>', unsafe_allow_html=True)
    alert_level = st.selectbox("告警级别筛选", ["全部", "信息", "成功", "警告", "严重"], index=0)
    alerts = [
        {"level": "success", "time": "2026-07-21 06:30", "module": "系统", "msg": "Batch1骨架搭建完成，所有模块加载正常"},
        {"level": "info", "time": "2026-07-21 06:28", "module": "存储", "msg": "金融向量总库挂载成功，容量100GB"},
        {"level": "warning", "time": "2026-07-21 06:25", "module": "API", "msg": "MS-Lab推送通道待对接，Batch2将完成实装"},
        {"level": "info", "time": "2026-07-21 06:22", "module": "安全", "msg": "RBAC四级权限系统加载完成，当前角色：viewer"},
        {"level": "info", "time": "2026-07-21 06:20", "module": "风控", "msg": "球面风控内核启动，当前风险值0.42（稳态）"},
        {"level": "success", "time": "2026-07-21 06:15", "module": "计算", "msg": "金融算力节点注册成功，错峰调度就绪"},
    ]
    level_map = {"info": "alert-info", "success": "alert-success", "warning": "alert-warning"}
    for alert in alerts:
        css_class = level_map.get(alert["level"], "alert-info")
        icon = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "critical": "🔴"}[alert["level"]]
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

def page_config():
    st.markdown('<div class="section-title">⚙️ 系统配置概览</div>', unsafe_allow_html=True)
    col_c1, col_c2 = st.columns(2)
    with col_c1:
        st.markdown("**实验室基本信息**")
        st.json({
            "实验室名称": config["lab_name"],
            "当前批次": config["batch_version"],
            "Batch1状态": config["batch_status"]["batch1"],
            "Batch2状态": config["batch_status"]["batch2"],
            "Batch3状态": config["batch_status"]["batch3"],
            "静态首页端口": config["ports"]["static_home"],
            "Streamlit端口": config["ports"]["streamlit_dashboard"]
        })
        st.markdown("**向量维度配置**")
        st.json(config["vector"])
    with col_c2:
        st.markdown("**风控阈值配置**")
        st.json(config["sphere_risk"])
        st.markdown("**KMP路由阈值**")
        st.json(config["kmp_routing"])
        st.markdown("**RBAC角色列表**")
        st.json(list(rbac["roles"].keys()))
    st.markdown('<div class="section-title">🔐 权限矩阵（演示）</div>', unsafe_allow_html=True)
    perm_data = []
    for role_id, role in rbac["roles"].items():
        perm_data.append({"角色": role["name"], "角色ID": role_id, "权限数量": len(role["permissions"]), "颜色标识": role["color"]})
    st.dataframe(pd.DataFrame(perm_data), use_container_width=True, hide_index=True)

if page == "🏠 总览面板":
    page_overview()
elif page == "⚠️ 球面风控":
    page_risk()
elif page == "💡 四维光照":
    page_lighting()
elif page == "🔗 KMP匹配":
    page_kmp()
elif page == "🚨 告警中心":
    page_alerts()
elif page == "⚙️ 系统配置":
    page_config()

st.divider()
st.caption("🧠 MoodMind-Lab · 金融向量实验室 | Game-OS V3.0 集群 | ⛔ 公私隔离：私有内核算法永不入工程层")
