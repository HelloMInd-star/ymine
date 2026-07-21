import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from pathlib import Path

from moodmind_config import (
    CONFIG, VEC_DIM_NAMES, LIGHTING_DIM_NAMES, RISK_LEVELS, KMP_TIERS,
    STORAGE_DIR,
)
from moodmind_types import FinanceVector11D, now_iso
from moodmind_engine_stub import (
    generate_mock_vector, run_kmp_match, snapshot_lighting, snapshot_sphere_risk,
    save_vector, load_recent_vectors, load_kmp_scores,
    PATTERN_LIBRARY, STOCK_SYMBOLS, ingest_market_data,
)
from moodmind_billing import record_billing, get_billing_summary
from moodmind_audit import has_permission, audit_log, read_audit_log, ROLE_RANK, PERMISSIONS
from moodmind_alert import (
    emit_alert, check_risk_alert, check_storage_alert, check_kmp_alert,
    read_alerts, mark_resolved,
)
from moodmind_compute import (
    build_report, send_report, read_reports, inject_command, fetch_commands,
    apply_command, estimate_vram, estimate_compute_time, hot_cold_label,
    COMPUTE_STATE,
)
from moodmind_push import (
    push_vector_to_mslab, get_push_log, get_push_stats, get_push_queue,
)

st.set_page_config(
    page_title="💜 MoodMind-Lab · 金融向量实验室",
    page_icon="💜",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .stApp { background: radial-gradient(ellipse at 20% 20%, #1a0a2e 0%, #0f0a1e 40%, #050310 100%); }
    .main .block-container { padding-top: 1.5rem; padding-bottom: 2rem; max-width: 1600px; }
    h1, h2, h3 { color: #e9d5ff !important; }
    .metric-card {
        background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.04));
        border: 1px solid rgba(139,92,246,0.15);
        border-radius: 14px;
        padding: 18px 20px;
        margin-bottom: 14px;
    }
    .risk-gauges {
        background: linear-gradient(180deg, rgba(15,5,30,0.9), rgba(5,3,15,0.95));
        border: 1px solid rgba(139,92,246,0.12);
        border-radius: 16px;
        padding: 20px;
    }
    .section-title {
        font-size: 22px;
        font-weight: 700;
        color: #c4b5fd;
        margin: 24px 0 14px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(139,92,246,0.2);
    }
    .redline-box {
        background: rgba(239,68,68,0.06);
        border-left: 4px solid #ef4444;
        border-radius: 0 10px 10px 0;
        padding: 14px 18px;
        margin: 12px 0;
        font-size: 13px;
        color: rgba(255,255,255,0.6);
    }
    .redline-box strong { color: #fca5a5; }
    .ok-badge { background: rgba(34,197,94,0.12); color: #6ee7b7; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .warn-badge { background: rgba(251,191,36,0.12); color: #fcd34d; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .danger-badge { background: rgba(239,68,68,0.12); color: #fca5a5; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .private-badge { background: rgba(168,85,247,0.15); color: #c4b5fd; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 1px solid rgba(168,85,247,0.3); }
    .stButton button[kind="primary"] {
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border: none;
    }
    div[data-testid="stSidebar"] { background: rgba(10,5,25,0.85); }
    .css-1d391kg, .css-1v3fvcr { color: rgba(255,255,255,0.7); }
</style>
""", unsafe_allow_html=True)


def _autogen_batch(n=20):
    for _ in range(n):
        v = generate_mock_vector()
        save_vector(v)
        k = run_kmp_match(v)
        rpt = build_report(
            num_vectors=1, tokens_in=256, tokens_out=64,
            kmp_similarity=v.kmp_similarity, sphere_risk=v.sphere_risk,
            precision="fp32", kmp_blocks=random.randint(0, 20),
        )
        send_report(rpt)
        check_risk_alert(v.sphere_risk)
        check_kmp_alert(v.kmp_similarity)
        record_billing("vector_embed_kmp", tokens_in=256, tokens_out=64)
        push_vector_to_mslab(v, simulate=True)


if "mood_inited" not in st.session_state:
    st.session_state.mood_inited = True
    st.session_state.perm_level = "admin"
    existing = load_recent_vectors(5)
    if len(existing) < 3:
        _autogen_batch(30)


with st.sidebar:
    st.markdown("""
    <div style="text-align:center;padding:20px 0 10px">
        <div style="font-size:36px;margin-bottom:6px">💜</div>
        <div style="font-size:18px;font-weight:700;color:#c4b5fd">MoodMind-Lab</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:2px">金融向量实验室 v1.0</div>
    </div>
    """, unsafe_allow_html=True)
    st.markdown("---")
    page = st.radio(
        "📂 导航",
        ["🏠 实验室概览", "💹 11维向量总库", "💡 四维光照环境", "🧬 KMP周期匹配",
         "⚠️ 球面风控阈值", "🖥️ 算力底座对接", "📤 MS-Lab推送通道",
         "💰 计费与审计", "🛡️ 安全与红线"],
        label_visibility="collapsed",
    )
    st.markdown("---")
    roles = list(ROLE_RANK.keys())
    st.selectbox("🔑 当前角色", roles, index=roles.index(st.session_state.perm_level),
                 key="role_sel", on_change=lambda: st.session_state.update(perm_level=st.session_state.role_sel))
    st.markdown("""
    <div style="font-size:11px;color:rgba(255,255,255,0.25);padding:8px 4px;line-height:1.7">
    <b style="color:#c4b5fd">平行实验室</b><br/>
    <a href="http://localhost:8501" target="_blank" style="color:rgba(255,255,255,0.4);text-decoration:none">🧠 MS-Lab 通用心智实验室</a><br/>
    <a href="../geom-compute/index.html" target="_blank" style="color:rgba(255,255,255,0.4);text-decoration:none">🏗️ 几何算力底座</a><br/>
    <a href="../../index.html" style="color:rgba(255,255,255,0.4);text-decoration:none">🏠 Y.Mine总控台</a>
    </div>
    """, unsafe_allow_html=True)


if page.startswith("🏠"):
    st.markdown('<div class="section-title">💜 MoodMind-Lab · 金融向量实验室概览</div>', unsafe_allow_html=True)

    cols = st.columns(4)
    vectors = load_recent_vectors(1000)
    n_vec = len(list(STORAGE_DIR.glob("*.json")))
    design_gb = CONFIG["storage"]["design_capacity_gb"]
    used_pct = min(1.0, n_vec * 11 * 4 / (design_gb * 1024 * 1024 * 1024) * 100000)
    by_tier = {}
    for v in vectors:
        t = v.get("tier", "unknown")
        by_tier[t] = by_tier.get(t, 0) + 1
    risks = [v.get("sphere_risk", 0) for v in vectors]
    avg_risk = np.mean(risks) if risks else 0.0
    kmps = [v.get("kmp_similarity", 0) for v in vectors]
    avg_kmp = np.mean(kmps) if kmps else 0.0

    with cols[0]:
        st.metric("📊 金融向量总量", n_vec, f"设计容量 {design_gb}GB")
    with cols[1]:
        label, color = ("🟢稳态", "#22c55e") if avg_risk < 0.48 else ("🟡预警", "#fbbf24") if avg_risk < 0.68 else ("🔴熔断", "#ef4444")
        st.metric("⚠️ 平均球面风险", f"{avg_risk:.3f}", label)
    with cols[2]:
        st.metric("🧬 平均KMP相似度", f"{avg_kmp:.3f}", hot_cold_label(avg_kmp, avg_risk))
    with cols[3]:
        push_s = get_push_stats()
        st.metric("📤 已推送MS-Lab", push_s["total_pushed"], f"成功率 {push_s['success_rate']*100:.1f}%")

    st.markdown("---")
    c1, c2 = st.columns([1.2, 1])

    with c1:
        st.subheader("📊 四库存储水位与冷热分布")
        tiers_order = ["trash", "buffer", "normal", "knowledge"]
        tier_labels = ["噪声库", "缓冲库", "常规库", "知识库"]
        tier_colors = ["#64748b", "#fbbf24", "#3b82f6", "#a855f7"]
        tier_counts = [by_tier.get(t, 0) for t in tiers_order]
        tier_caps = [500, 2000, 10000, 20000]
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=tier_labels, y=[c/max(1, cap)*100 for c, cap in zip(tier_counts, tier_caps)],
            marker_color=tier_colors, text=[f"{c}条" for c in tier_counts], textposition="outside",
            name="使用率%",
        ))
        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="rgba(255,255,255,0.7)"), height=300, margin=dict(l=10,r=10,t=30,b=10),
            yaxis_title="使用率 %", showlegend=False,
        )
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.subheader("🚦 风险状态分布")
        risk_buckets = {"🟢 稳态":0, "🟡 预警":0, "🟠 警戒":0, "🔴 熔断":0}
        for r in risks:
            if r >= 0.68: risk_buckets["🔴 熔断"] += 1
            elif r >= 0.50: risk_buckets["🟠 警戒"] += 1
            elif r >= 0.48: risk_buckets["🟡 预警"] += 1
            else: risk_buckets["🟢 稳态"] += 1
        fig_pie = go.Figure(data=[go.Pie(
            labels=list(risk_buckets.keys()), values=list(risk_buckets.values()),
            marker=dict(colors=["#22c55e","#fbbf24","#f97316","#ef4444"]),
            hole=0.55, textfont=dict(color="white"),
        )])
        fig_pie.update_layout(paper_bgcolor="rgba(0,0,0,0)", height=300, margin=dict(l=10,r=10,t=10,b=10),
                              font=dict(color="rgba(255,255,255,0.7)"))
        st.plotly_chart(fig_pie, use_container_width=True)

    st.markdown("---")
    st.subheader("📈 时序增量趋势（最近100条）")
    recent = vectors[-100:]
    if recent:
        df = pd.DataFrame([{
            "id": i,
            "KMP相似度": v.get("kmp_similarity", 0),
            "球面风险": v.get("sphere_risk", 0),
            "tier": v.get("tier", "normal"),
        } for i, v in enumerate(recent)])
        fig_line = go.Figure()
        fig_line.add_trace(go.Scatter(y=df["KMP相似度"], mode="lines", name="KMP相似度",
                                      line=dict(color="#a855f7", width=2)))
        fig_line.add_trace(go.Scatter(y=df["球面风险"], mode="lines", name="球面风险",
                                      line=dict(color="#ef4444", width=2, dash="dot")))
        fig_line.add_hline(y=0.48, line_dash="dash", line_color="#fbbf24", annotation_text="预警线 0.48")
        fig_line.add_hline(y=0.68, line_dash="dash", line_color="#ef4444", annotation_text="熔断线 0.68")
        fig_line.add_hline(y=0.50, line_dash="dash", line_color="#22c55e", annotation_text="稳态中轴 0.50")
        fig_line.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="rgba(255,255,255,0.7)"), height=300, margin=dict(l=10,r=10,t=10,b=10),
            xaxis_title="入库序号", yaxis_title="分值", legend=dict(orientation="h"),
        )
        st.plotly_chart(fig_line, use_container_width=True)

    st.markdown("---")
    cA, cB = st.columns(2)
    with cA:
        st.subheader("🚨 最近告警")
        alerts = read_alerts(20)
        if alerts:
            for a in alerts[-10:]:
                color = {"info":"ℹ️","warn":"⚠️","danger":"🔴","success":"✅"}.get(a.get("level","info"),"ℹ️")
                st.markdown(f"{color} `{a.get('ts','')[:19]}` [{a.get('source','')}] {a.get('message','')}")
        else:
            st.info("暂无告警")
    with cB:
        st.subheader("📐 架构定位")
        st.markdown("""
        <div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:2">
        <b style="color:#c4b5fd">层级</b>：Game-OS V3.0 同级平行实验室<br/>
        <b style="color:#c4b5fd">平级</b>：🧠 MS-Lab 通用心智向量实验室<br/>
        <b style="color:#c4b5fd">上级</b>：几何心智空间算力底座 + Y.Mine总控台<br/>
        <b style="color:#c4b5fd">核心</b>：11维时序金融向量 + 四维光照 + 改良KMP + 球面风控<br/>
        <b style="color:#c4b5fd">原则</b>：公私彻底隔离 · 私有内核不进工程层
        </div>
        """, unsafe_allow_html=True)


elif page.startswith("💹"):
    st.markdown('<div class="section-title">💹 11维金融向量总库</div>', unsafe_allow_html=True)

    if not has_permission(st.session_state.perm_level, "view_vectors"):
        st.error("🔒 当前角色无权查看向量总库（需operator及以上）")
        st.stop()

    c1, c2 = st.columns([1, 2])
    with c1:
        if st.button("⚡ 生成一条金融向量", use_container_width=True, type="primary"):
            v = generate_mock_vector()
            save_vector(v)
            rpt = build_report(1, 256, 64, v.kmp_similarity, v.sphere_risk, kmp_blocks=random.randint(0,15))
            send_report(rpt)
            record_billing("vector_embed", 256, 64, st.session_state.perm_level)
            audit_log(st.session_state.perm_level, "generate_vector", v.vec_id, True)
            st.success(f"向量 {v.vec_id} 已生成 · 标的 {v.symbol} · 路由层 {v.tier}")
        if st.button("⚡⚡ 批量生成 20 条", use_container_width=True):
            _autogen_batch(20)
            st.success("批量生成完成 20 条")
        st.markdown("---")
        sym_sel = st.selectbox("行情数据接入(模拟)", STOCK_SYMBOLS)
        if st.button("📥 接入行情数据", use_container_width=True):
            price = round(50 + random.random() * 500, 2)
            volume = random.randint(100000, 99999999)
            ingest_market_data(sym_sel, price, volume)
            st.success(f"已接入 {sym_sel} 价格={price} 成交量={volume}")
    with c2:
        st.markdown('<div class="redline-box"><strong>🚫 红线声明：</strong>D4-D10金融私有7维由 private_moodmind_engine 闭源计算，工程层仅接收最终结果向量，<b>不实现任何金融底层公式</b>（11维底层公式/PID/光照权重/球面求解/阈值判定/KMP-LPS/筹码算子/凯利内核）。</div>', unsafe_allow_html=True)

    st.markdown("---")
    vectors = load_recent_vectors(200)
    if vectors:
        st.subheader(f"📊 最近入库向量（{len(vectors)} 条）")
        df = pd.DataFrame([{
            "vec_id": v.get("vec_id","")[:10],
            "标的": v.get("symbol",""),
            "入库时间": v.get("timestamp","")[:19],
            "D0主体": round(v["vector_public"][0],3) if len(v.get("vector_public",[]))>0 else 0,
            "D1动作": round(v["vector_public"][1],3) if len(v.get("vector_public",[]))>1 else 0,
            "D2属性": round(v["vector_public"][2],3) if len(v.get("vector_public",[]))>2 else 0,
            "D3外扰": round(v["vector_public"][3],3) if len(v.get("vector_public",[]))>3 else 0,
            "D4-P": round(v["vector_finance_private"][0],3) if len(v.get("vector_finance_private",[]))>0 else 0,
            "D5-I": round(v["vector_finance_private"][1],3) if len(v.get("vector_finance_private",[]))>1 else 0,
            "D6-D": round(v["vector_finance_private"][2],3) if len(v.get("vector_finance_private",[]))>2 else 0,
            "D7箱体": round(v["vector_finance_private"][3],3) if len(v.get("vector_finance_private",[]))>3 else 0,
            "D8相位": round(v["vector_finance_private"][4],3) if len(v.get("vector_finance_private",[]))>4 else 0,
            "D9凯利": round(v["vector_finance_private"][5],3) if len(v.get("vector_finance_private",[]))>5 else 0,
            "D10风控": round(v["vector_finance_private"][6],3) if len(v.get("vector_finance_private",[]))>6 else 0,
            "KMP分值": round(v.get("kmp_similarity",0),3),
            "路由层": v.get("tier",""),
        } for v in vectors[:50]])
        st.dataframe(df, use_container_width=True, height=350)

        st.markdown("---")
        st.subheader("📐 11维维度均值雷达图")
        dim_means = []
        for i in range(11):
            if i < 4:
                vals = [v["vector_public"][i] for v in vectors if len(v.get("vector_public",[]))>i]
            else:
                vals = [v["vector_finance_private"][i-4] for v in vectors if len(v.get("vector_finance_private",[]))>i-4]
            dim_means.append(np.mean(vals) if vals else 0.5)
        fig_radar = go.Figure()
        fig_radar.add_trace(go.Scatterpolar(
            r=dim_means, theta=VEC_DIM_NAMES, fill="toself",
            name="均值向量", line=dict(color="#a855f7"),
            fillcolor="rgba(168,85,247,0.2)",
        ))
        fig_radar.update_layout(
            polar=dict(
                bgcolor="rgba(0,0,0,0)",
                radialaxis=dict(visible=True, range=[0,1], gridcolor="rgba(255,255,255,0.08)"),
                angularaxis=dict(gridcolor="rgba(255,255,255,0.08)", tickfont=dict(size=11, color="#c4b5fd")),
            ),
            paper_bgcolor="rgba(0,0,0,0)", height=420, margin=dict(l=40,r=40,t=30,b=20),
            font=dict(color="rgba(255,255,255,0.7)"),
        )
        st.plotly_chart(fig_radar, use_container_width=True)


elif page.startswith("💡"):
    st.markdown('<div class="section-title">💡 四维光照环境模型</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "view_lighting"):
        st.error("🔒 当前角色无权查看光照数据（需viewer及以上）")
        st.stop()

    st.markdown('<div class="redline-box"><strong>🚫 红线声明：</strong>四维光照动态行业权重算法属于私有内核，工程层仅展示最终光照结果分值（L1-L4），<b>不展示加权公式和权重分配逻辑</b>。</div>', unsafe_allow_html=True)

    if st.button("🔄 刷新光照快照"):
        st.rerun()

    snap = snapshot_lighting()
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        lvl = "🟢" if snap.L1_liquidity > 0.6 else "🟡" if snap.L1_liquidity > 0.3 else "🔴"
        st.metric("💧 L1 成交量流动性", f"{snap.L1_liquidity:.3f}", lvl)
    with c2:
        lvl = "🟢" if snap.L2_sentiment > 0.6 else "🟡" if snap.L2_sentiment > 0.3 else "🔴"
        st.metric("🎭 L2 题材情绪", f"{snap.L2_sentiment:.3f}", lvl)
    with c3:
        lvl = "🟢" if snap.L3_policy > 0.6 else "🟡" if snap.L3_policy > 0.3 else "🔴"
        st.metric("📜 L3 产业政策", f"{snap.L3_policy:.3f}", lvl)
    with c4:
        lvl = "🟢" if snap.L4_prosperity > 0.6 else "🟡" if snap.L4_prosperity > 0.3 else "🔴"
        st.metric("🏭 L4 产业链景气", f"{snap.L4_prosperity:.3f}", lvl)

    st.markdown("---")
    fig_bar = go.Figure()
    fig_bar.add_trace(go.Bar(
        x=["L1\n成交量流动性", "L2\n题材情绪", "L3\n产业政策", "L4\n产业链景气"],
        y=[snap.L1_liquidity, snap.L2_sentiment, snap.L3_policy, snap.L4_prosperity],
        marker_color=["#3b82f6", "#ec4899", "#f59e0b", "#10b981"],
        text=[f"{v:.3f}" for v in [snap.L1_liquidity, snap.L2_sentiment, snap.L3_policy, snap.L4_prosperity]],
        textposition="outside",
    ))
    fig_bar.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="rgba(255,255,255,0.7)"), height=350, margin=dict(l=10,r=10,t=30,b=10),
        yaxis=dict(range=[0, 1.1]), showlegend=False,
        title=dict(text=f"四维光照实时快照 · 综合评分 {snap.lighting_score:.3f} · 板块偏向 {snap.sector_bias}",
                   font=dict(size=14, color="#c4b5fd")),
    )
    st.plotly_chart(fig_bar, use_container_width=True)

    st.markdown("---")
    st.subheader("📈 光照时序演变（随机模拟快照历史）")
    hist_n = 80
    hist_t = [f"t-{hist_n-i}" for i in range(hist_n)]
    l1h = np.cumsum(np.random.randn(hist_n)*0.02) + 0.55
    l2h = np.cumsum(np.random.randn(hist_n)*0.03) + 0.5
    l3h = np.cumsum(np.random.randn(hist_n)*0.015) + 0.6
    l4h = np.cumsum(np.random.randn(hist_n)*0.02) + 0.5
    for arr in [l1h,l2h,l3h,l4h]:
        np.clip(arr, 0.05, 0.98, out=arr)
    fig_lh = go.Figure()
    fig_lh.add_trace(go.Scatter(y=l1h, name="L1 流动性", line=dict(color="#3b82f6", width=2)))
    fig_lh.add_trace(go.Scatter(y=l2h, name="L2 情绪", line=dict(color="#ec4899", width=2)))
    fig_lh.add_trace(go.Scatter(y=l3h, name="L3 政策", line=dict(color="#f59e0b", width=2)))
    fig_lh.add_trace(go.Scatter(y=l4h, name="L4 景气", line=dict(color="#10b981", width=2)))
    fig_lh.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="rgba(255,255,255,0.7)"), height=320, margin=dict(l=10,r=10,t=10,b=10),
        xaxis_title="时间窗口", yaxis_title="光照分值", legend=dict(orientation="h"),
        yaxis=dict(range=[0, 1]),
    )
    st.plotly_chart(fig_lh, use_container_width=True)


elif page.startswith("🧬"):
    st.markdown('<div class="section-title">🧬 KMP 周期匹配热度与范式沉淀</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "view_kmp"):
        st.error("🔒 当前角色无权查看KMP数据（需viewer及以上）")
        st.stop()

    st.markdown('<div class="redline-box"><strong>🚫 红线声明：</strong>改良KMP周期匹配 LPS 底层源码属于私有内核，工程层仅接收最终相似度分值（0~1）和范式沉淀结果，<b>不实现LPS构造/匹配逻辑</b>。</div>', unsafe_allow_html=True)

    vectors = load_recent_vectors(100)
    scores = load_kmp_scores(500)
    scores = scores[-200:]

    c1, c2, c3, c4 = st.columns(4)
    if scores:
        sims = [s.get("kmp_similarity",0) for s in scores]
        high_h = sum(1 for s in sims if s >= 0.85)
        paradigm = sum(1 for s in sims if s >= 0.92)
        with c1:
            st.metric("🧬 KMP匹配总次数", len(scores))
        with c2:
            st.metric("📊 平均相似度", f"{np.mean(sims):.3f}")
        with c3:
            st.metric("🔥 高同源范式", high_h, f"{high_h/max(1,len(scores))*100:.1f}%")
        with c4:
            st.metric("💎 沉淀入库范式", paradigm, f"{paradigm/max(1,len(scores))*100:.1f}%")

    st.markdown("---")
    cL, cR = st.columns([1, 1])
    with cL:
        st.subheader("🎯 KMP手动匹配")
        sel_pat = st.selectbox("选择周期形态", [f"{p['pid']} · {p['name']} ({p['type']})" for p in PATTERN_LIBRARY])
        if st.button("▶️ 执行匹配", type="primary", use_container_width=True):
            v = generate_mock_vector()
            save_vector(v)
            pid = sel_pat.split(" ")[0]
            k = run_kmp_match(v, pattern_id=pid)
            record_billing("kmp_match", 128, 32, st.session_state.perm_level)
            check_kmp_alert(k.similarity)
            tier = next((t["name"] for t in KMP_TIERS if t["min"] <= k.similarity < t["max"]), "knowledge")
            st.success(f"匹配完成 · {k.pattern_name} · 相似度 {k.similarity:.3f} → 路由 {tier}")
            if k.paradigm_precipitated:
                st.balloons()
                st.info("✨ 高同源范式已沉淀至知识库长期记忆！")

    with cR:
        st.subheader("📊 模式库")
        df_pat = pd.DataFrame(PATTERN_LIBRARY)
        st.dataframe(df_pat, use_container_width=True)

    st.markdown("---")
    st.subheader("📈 KMP相似度分布直方图")
    if scores:
        fig_hist = go.Figure()
        fig_hist.add_trace(go.Histogram(
            x=sims, nbinsx=30, marker_color="#a855f7",
            marker_line_color="#c4b5fd", marker_line_width=1,
        ))
        for thresh, color, label in [(0.25,"#64748b","噪声"), (0.50,"#fbbf24","缓冲"), (0.75,"#3b82f6","常规"), (0.92,"#a855f7","范式")]:
            fig_hist.add_vline(x=thresh, line_dash="dash", line_color=color, annotation_text=label,
                               annotation_font_color=color)
        fig_hist.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="rgba(255,255,255,0.7)"), height=300, margin=dict(l=10,r=10,t=10,b=10),
            xaxis_title="相似度", yaxis_title="频次", bargap=0.05, showlegend=False,
        )
        st.plotly_chart(fig_hist, use_container_width=True)


elif page.startswith("⚠️"):
    st.markdown('<div class="section-title">⚠️ 球面风控阈值与稳态/预警/熔断状态</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "view_risk"):
        st.error("🔒 当前角色无权查看风控数据（需viewer及以上）")
        st.stop()

    st.markdown('<div class="redline-box"><strong>🚫 红线声明：</strong>超球面风险模长求解公式、0.48/0.50/0.68三阈值底层判定逻辑属于私有内核，工程层仅接收最终风险模长和状态标签，<b>不实现求解公式</b>。</div>', unsafe_allow_html=True)

    if st.button("🔄 刷新风控快照", type="primary"):
        st.rerun()

    snap = snapshot_sphere_risk()
    rl = RISK_LEVELS[snap.status]
    c1, c2, c3 = st.columns(3)
    with c1:
        delta = "↓ 安全" if snap.status == "stable" else "↑ 注意" if snap.status == "warn" else "↑↑ 警戒" if snap.status == "danger" else "🔴 熔断"
        st.metric("🌐 球面风险模长", f"{snap.risk_magnitude:.3f}", delta)
    with c2:
        st.metric("📊 当前状态", rl["label"], f"预警线 {snap.threshold_warn} / 熔断线 {snap.threshold_fuse}")
    with c3:
        st.metric("🛡️ 建议对冲比例", f"{snap.auto_hedge_ratio*100:.1f}%", f"凯利 {snap.suggested_kelly:.3f}")

    st.markdown("---")
    st.subheader("🎯 球面风险仪表盘")
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=snap.risk_magnitude,
        domain=dict(x=[0,1], y=[0,1]),
        title=dict(text="风险模长", font=dict(size=16, color="#c4b5fd")),
        delta=dict(reference=0.50, increasing=dict(color="#ef4444"), decreasing=dict(color="#22c55e")),
        gauge=dict(
            axis=dict(range=[0,1], tickwidth=1, tickcolor="rgba(255,255,255,0.5)"),
            bar=dict(color=rl["color"]),
            bgcolor="rgba(0,0,0,0)", borderwidth=1, bordercolor="rgba(255,255,255,0.1)",
            steps=[
                dict(range=[0, 0.48], color="rgba(34,197,94,0.15)"),
                dict(range=[0.48, 0.50], color="rgba(251,191,36,0.15)"),
                dict(range=[0.50, 0.68], color="rgba(249,115,22,0.15)"),
                dict(range=[0.68, 1.0], color="rgba(239,68,68,0.15)"),
            ],
            threshold=dict(
                line=dict(color="#ef4444", width=3), thickness=0.8, value=0.68,
            ),
        ),
        number=dict(font=dict(size=36, color=rl["color"]), suffix=""),
    ))
    fig_gauge.update_layout(paper_bgcolor="rgba(0,0,0,0)", height=320, margin=dict(l=20,r=20,t=30,b=10),
                            font=dict(color="rgba(255,255,255,0.7)"))
    st.plotly_chart(fig_gauge, use_container_width=True)

    st.markdown("---")
    st.subheader("📐 三级阈值带时序")
    n_hist = 100
    risk_hist = np.cumsum(np.random.randn(n_hist)*0.02) + 0.42
    np.clip(risk_hist, 0.05, 0.95, out=risk_hist)
    fig_rr = go.Figure()
    fig_rr.add_trace(go.Scatter(y=risk_hist, name="风险模长", line=dict(color="#a855f7", width=2.5), fill="tozeroy",
                                fillcolor="rgba(168,85,247,0.08)"))
    fig_rr.add_hrect(y0=0, y1=0.48, fillcolor="rgba(34,197,94,0.06)", line_width=0, annotation_text="🟢 稳态")
    fig_rr.add_hrect(y0=0.48, y1=0.50, fillcolor="rgba(251,191,36,0.08)", line_width=0)
    fig_rr.add_hrect(y0=0.50, y1=0.68, fillcolor="rgba(249,115,22,0.06)", line_width=0, annotation_text="🟠 警戒")
    fig_rr.add_hrect(y0=0.68, y1=1.0, fillcolor="rgba(239,68,68,0.08)", line_width=0, annotation_text="🔴 熔断")
    fig_rr.add_hline(y=0.50, line_dash="dash", line_color="#22c55e", annotation_text="稳态中轴")
    fig_rr.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="rgba(255,255,255,0.7)"), height=320, margin=dict(l=10,r=10,t=10,b=10),
        xaxis_title="时间窗口", yaxis_title="风险模长", yaxis=dict(range=[0,1]), showlegend=False,
    )
    st.plotly_chart(fig_rr, use_container_width=True)


elif page.startswith("🖥️"):
    st.markdown('<div class="section-title">🖥️ 几何心智算力底座双向对接</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "view_dashboard"):
        st.error("🔒 无权访问")
        st.stop()

    cL, cR = st.columns([1.2, 1])
    with cL:
        st.subheader("📊 显存/耗时/冷热估算器")
        n_vec = st.number_input("向量条数", 1, 100000, 1, step=100)
        prec = st.selectbox("精度", ["fp32", "fp64"], index=0)
        tkn_in = st.number_input("输入Token数", 1, 100000, 256, step=64)
        tkn_out = st.number_input("输出Token数", 0, 100000, 64, step=32)
        blocks = st.number_input("KMP匹配块数", 0, 1024, 10, step=1)
        sim_in = st.slider("KMP相似度", 0.0, 1.0, 0.62, 0.01)
        risk_in = st.slider("球面风险", 0.0, 1.0, 0.42, 0.01)
        vram = estimate_vram(int(n_vec), 11, prec, True, True)
        tm = estimate_compute_time(int(n_vec), int(tkn_in), int(tkn_out), prec,
                                   with_kmp_blocks=(blocks>0), kmp_blocks=blocks)
        hc = hot_cold_label(sim_in, risk_in)
        cc1, cc2, cc3 = st.columns(3)
        cc1.metric("💾 显存估算", f"{vram['total_mb']} MB")
        cc2.metric("⏱️ 耗时估算", f"{tm['total_ms']} ms")
        cc3.metric("🌡️ 冷热标签", hc)
        if st.button("📤 手动上报算力底座", use_container_width=True, type="primary"):
            rpt = build_report(int(n_vec), int(tkn_in), int(tkn_out), sim_in, risk_in, prec, blocks)
            send_report(rpt)
            record_billing("compute_report", int(tkn_in), int(tkn_out), st.session_state.perm_level)
            st.success(f"上报成功 · {rpt.hot_cold_label} · {rpt.vram_estimate_mb}MB · {rpt.time_estimate_ms}ms")

    with cR:
        st.subheader("📥 接收算力调度指令")
        if not has_permission(st.session_state.perm_level, "inject_compute_cmd"):
            st.warning("🔒 需要quant角色以上才可以下发模拟指令")
        else:
            with st.form("cmd_form"):
                cmd_type = st.selectbox("指令类型", [
                    ("stagger", "⏱️ 错峰延迟"),
                    ("downgrade_precision", "⬇️ 精度降级到FP32"),
                    ("pause", "⏸️ 暂停入库"),
                    ("resume", "▶️ 恢复入库"),
                    ("quota_limit", "📊 配额限制"),
                ], format_func=lambda x: x[1])
                params = {}
                if cmd_type[0] == "stagger":
                    params["delay_ms"] = st.slider("延迟ms", 100, 30000, 1000, step=100)
                elif cmd_type[0] == "quota_limit":
                    params["vectors_per_min"] = st.slider("每分钟向量数", 1, 1000, 60, step=10)
                submitted = st.form_submit_button("📨 注入指令", type="primary", use_container_width=True)
                if submitted:
                    res = inject_command(cmd_type[0], params)
                    st.success(f"指令已注入并应用: {res['effect']}")

        st.markdown("---")
        st.subheader("📋 算力状态")
        cs = COMPUTE_STATE
        st.json(cs)
        pending = fetch_commands(mark_applied=False)
        st.info(f"待处理指令队列: {len(pending)} 条")
        for p in pending[-5:]:
            st.code(f"[{p.get('ts','')[:19]}] {p.get('cmd','')} {p.get('params',{})}", language="text")

    st.markdown("---")
    st.subheader("📈 上报历史趋势")
    reports = read_reports(200)
    if reports:
        df_r = pd.DataFrame([{
            "ts": r.get("timestamp","")[:19],
            "显存MB": r.get("vram_estimate_mb",0),
            "耗时ms": r.get("time_estimate_ms",0),
            "冷热": r.get("hot_cold_label","warm"),
            "向量数": r.get("num_vectors",0),
        } for r in reports[-100:]])
        fig_vram = go.Figure()
        fig_vram.add_trace(go.Scatter(y=df_r["显存MB"], name="显存MB", line=dict(color="#3b82f6", width=2)))
        fig_vram.add_trace(go.Scatter(y=df_r["耗时ms"], name="耗时ms", line=dict(color="#a855f7", width=2), yaxis="y2"))
        fig_vram.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="rgba(255,255,255,0.7)"), height=300, margin=dict(l=10,r=10,t=10,b=10),
            xaxis_title="序号", yaxis=dict(title="显存 MB"),
            yaxis2=dict(title="耗时 ms", overlaying="y", side="right"),
            legend=dict(orientation="h"),
        )
        st.plotly_chart(fig_vram, use_container_width=True)

        cc_counts = df_r["冷热"].value_counts().to_dict()
        fig_hc = go.Figure(data=[go.Pie(
            labels=list(cc_counts.keys()), values=list(cc_counts.values()),
            marker=dict(colors=["#ef4444" if k=="cold" else "#fbbf24" if k=="warm" else "#22c55e" for k in cc_counts.keys()]),
            hole=0.5,
        )])
        fig_hc.update_layout(paper_bgcolor="rgba(0,0,0,0)", height=260,
                             title=dict(text="冷热标签分布", font=dict(size=14, color="#c4b5fd")),
                             font=dict(color="rgba(255,255,255,0.7)"), margin=dict(l=10,r=10,t=40,b=10))
        st.plotly_chart(fig_hc, use_container_width=True)


elif page.startswith("📤"):
    st.markdown('<div class="section-title">📤 MS-Lab 向量推送通道</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "push_to_mslab"):
        st.error("🔒 当前角色无权推送（需quant及以上）")
        st.stop()

    st.markdown("""
    <div style="background:rgba(59,130,246,0.08);border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;padding:14px 18px;margin:12px 0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.8">
    <strong style="color:#93c5fd">📐 MS-Lab 推送规范（强制）：</strong><br/>
    1. MoodMind自主生成完整11维向量<br/>
    2. MoodMind内部运行改良KMP算出相似度分值<br/>
    3. 仅推送两类数据：<b>①最终11维向量本体 ②0~1相似度分值</b><br/>
    4. MS-Lab根据分值自动路由：&lt;25%噪声 / 25-50%缓冲 / 50-75%常规 / ≥75%知识库<br/>
    5. MS-Lab全程<b>无金融逻辑、无权重计算、无内核泄露</b>
    </div>
    """, unsafe_allow_html=True)

    stats = get_push_stats()
    c1,c2,c3,c4 = st.columns(4)
    c1.metric("📤 总推送数", stats["total_pushed"])
    c2.metric("✅ 成功率", f"{stats['success_rate']*100:.1f}%")
    c3.metric("📊 平均KMP", f"{stats['avg_kmp_score']:.3f}")
    c4.metric("🎯 知识库占比", f"{stats['by_tier'].get('knowledge',0)/max(1,stats['total_pushed'])*100:.1f}%")

    st.markdown("---")
    if st.button("⚡ 生成并推送一条向量到MS-Lab", type="primary", use_container_width=True):
        v = generate_mock_vector()
        save_vector(v)
        push = push_vector_to_mslab(v, simulate=True)
        record_billing("push_to_mslab", 256, 0, st.session_state.perm_level)
        audit_log(st.session_state.perm_level, "push_mslab", v.vec_id, True)
        st.success(f"推送完成 · {push.response}")
    if st.button("⚡⚡ 批量推送10条", use_container_width=True):
        for _ in range(10):
            v = generate_mock_vector()
            save_vector(v)
            push_vector_to_mslab(v, simulate=True)
        st.success("批量推送10条完成")

    st.markdown("---")
    st.subheader("📜 推送日志")
    logs = get_push_log(100)
    if logs:
        df_pl = pd.DataFrame([{
            "时间": l.get("timestamp","")[:19],
            "vec_id": l.get("vec_id","")[:10],
            "KMP分值": round(l.get("kmp_score",0),3),
            "目标层": l.get("target_tier",""),
            "状态": l.get("status",""),
            "响应": l.get("response","")[:40],
        } for l in logs[-30:]])
        st.dataframe(df_pl, use_container_width=True, height=300)

    st.markdown("---")
    st.subheader("📊 路由分层统计")
    by_tier = stats["by_tier"]
    labels = ["噪声库", "缓冲库", "常规库", "知识库"]
    keys = ["trash","buffer","normal","knowledge"]
    vals = [by_tier.get(k,0) for k in keys]
    colors = ["#64748b","#fbbf24","#3b82f6","#a855f7"]
    fig_pt = go.Figure(data=[go.Bar(x=labels, y=vals, marker_color=colors,
                                     text=vals, textposition="outside")])
    fig_pt.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="rgba(255,255,255,0.7)"), height=280, margin=dict(l=10,r=10,t=10,b=10),
        showlegend=False, yaxis_title="条数",
    )
    st.plotly_chart(fig_pt, use_container_width=True)


elif page.startswith("💰"):
    st.markdown('<div class="section-title">💰 Token 计费 · 审计日志 · 告警中心</div>', unsafe_allow_html=True)
    if not has_permission(st.session_state.perm_level, "view_billing"):
        st.error("🔒 当前角色无权查看计费（需operator及以上）")
        st.stop()

    tab1, tab2, tab3 = st.tabs(["💰 计费账单", "📋 审计日志", "🚨 告警中心"])

    with tab1:
        summ = get_billing_summary(1000)
        c1,c2,c3 = st.columns(3)
        c1.metric("📊 账单记录数", summ["total_records"])
        c2.metric("🪙 总Token消耗", f"{summ['total_tokens']:,}")
        c3.metric("💵 总费用 (USD)", f"${summ['total_cost_usd']:.4f}")
        st.markdown("---")
        if summ["by_action"]:
            df_b = pd.DataFrame([{
                "操作": k, "次数": v["count"], "Token": v["tokens"], "费用USD": round(v["cost"],6)
            } for k,v in summ["by_action"].items()])
            st.dataframe(df_b, use_container_width=True)
        st.subheader("最近账单记录")
        if summ["records"]:
            df_br = pd.DataFrame([{
                "时间": r.get("timestamp","")[:19],
                "操作": r.get("action",""),
                "Token输入": r.get("tokens_in",0),
                "Token输出": r.get("tokens_out",0),
                "费用USD": r.get("cost_usd",0),
                "操作人": r.get("operator",""),
            } for r in summ["records"][-30:]])
            st.dataframe(df_br, use_container_width=True, height=280)

    with tab2:
        if not has_permission(st.session_state.perm_level, "view_audit"):
            st.warning("🔒 审计日志需要quant角色以上")
        else:
            logs = read_audit_log(200)
            st.info(f"共 {len(logs)} 条审计记录")
            if logs:
                df_au = pd.DataFrame([{
                    "时间": l.get("timestamp","")[:19],
                    "角色": l.get("role",""),
                    "操作": l.get("action",""),
                    "目标": l.get("target","")[:16],
                    "允许": "✅" if l.get("allowed") else "❌",
                    "详情": l.get("detail",""),
                } for l in logs[-50:]])
                st.dataframe(df_au, use_container_width=True, height=360)

    with tab3:
        alerts = read_alerts(200)
        c1,c2,c3,c4 = st.columns(4)
        c1.metric("🚨 告警总数", len(alerts))
        c2.metric("🔴 危险级", sum(1 for a in alerts if a.get("level")=="danger"))
        c3.metric("🟡 警告级", sum(1 for a in alerts if a.get("level")=="warn"))
        c4.metric("✅ 成功提示", sum(1 for a in alerts if a.get("level")=="success"))
        st.markdown("---")
        if alerts:
            for a in reversed(alerts[-40:]):
                icon = {"info":"ℹ️","warn":"⚠️","danger":"🔴","success":"✅"}.get(a.get("level","info"),"ℹ️")
                bg = "rgba(239,68,68,0.06)" if a.get("level")=="danger" else "rgba(251,191,36,0.06)" if a.get("level")=="warn" else "rgba(0,0,0,0.2)"
                resolved = "✅已处理" if a.get("resolved") else "🔲未处理"
                st.markdown(f"""<div style="background:{bg};border-radius:8px;padding:8px 14px;margin:4px 0;font-size:12px">
                {icon} <code style="color:rgba(255,255,255,0.5)">{a.get('ts','')[:19]}</code>
                <b style="color:rgba(255,255,255,0.7)">[{a.get('source','')}]</b> {a.get('message','')}
                <span style="float:right;color:rgba(255,255,255,0.3)">{resolved}</span>
                </div>""", unsafe_allow_html=True)


elif page.startswith("🛡️"):
    st.markdown('<div class="section-title">🛡️ 安全体系 · 权限 · 红线声明</div>', unsafe_allow_html=True)

    st.subheader("🔑 RBAC四级权限矩阵")
    perm_rows = []
    for perm in sorted(PERMISSIONS.keys()):
        req = PERMISSIONS[perm]
        perm_rows.append({
            "权限点": perm,
            "最低角色": req,
            "admin": "✓" if ROLE_RANK["admin"] >= ROLE_RANK.get(req,99) else "-",
            "quant": "✓" if ROLE_RANK["quant"] >= ROLE_RANK.get(req,99) else "-",
            "operator": "✓" if ROLE_RANK["operator"] >= ROLE_RANK.get(req,99) else "-",
            "viewer": "✓" if ROLE_RANK["viewer"] >= ROLE_RANK.get(req,99) else "-",
        })
    st.dataframe(pd.DataFrame(perm_rows), use_container_width=True)

    st.markdown("---")
    st.subheader("🚫 私有内核红线（绝对禁止工程层触碰）")
    blocked = CONFIG["private_engine"]["blocked_items"]
    for i, item in enumerate(blocked, 1):
        st.markdown(f"""<div style="background:rgba(239,68,68,0.05);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:10px 14px;margin:6px 0;font-size:13px;color:rgba(255,255,255,0.65)">
        <b style="color:#fca5a5">❌ 红线 #{i}</b>：{item}
        </div>""", unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("📐 公私隔离架构示意")
    st.markdown("""
    <div style="background:linear-gradient(135deg,rgba(139,92,246,0.06),rgba(59,130,246,0.04));border:1px solid rgba(139,92,246,0.15);border-radius:14px;padding:24px;font-size:13px;color:rgba(255,255,255,0.6);line-height:2.2">
    <pre style="background:rgba(0,0,0,0.3);padding:16px;border-radius:10px;font-size:12px;color:#c4b5fd;line-height:1.8;margin:0">
┌─────────────────────────────────────────────────────────┐
│  <b style="color:#fca5a5">[PRIVATE] private_moodmind_engine/</b>  🔒 闭源不入工程  │
│  • 11维底层公式  • PID迭代  • 光照权重算法             │
│  • 球面求解  • 阈值判定  • KMP-LPS  • 筹码算子         │
│  • 凯利内核  • 行情相位  • 箱体中枢                    │
└───────────────────┬─────────────────────────────────────┘
                    │  仅推送最终结果
                    ▼
┌─────────────────────────────────────────────────────────┐
│  <b style="color:#93c5fd">[PUBLIC]  public_dashboard/</b>  ✅ 工程可见层         │
│  • 11维向量结果  • 四维光照结果  • KMP分值             │
│  • 球面风险模长  • 风控状态标签  • 计费/审计/告警      │
│  • 算力上报/指令接收  • MS-Lab推送通道  • 可视化       │
└───────────────────┬─────────────────────────────────────┘
                    │  仅推送向量+分值
                    ▼
┌─────────────────────────────────────────────────────────┐
│  <b style="color:#6ee7b7">[EXTERN] MS-Lab / 算力底座 / Y.Mine总控</b>            │
│  MS-Lab：接收向量+分值，自动路由四库（无金融逻辑）      │
│  算力底座：显存/耗时上报，错峰/精度指令下发             │
│  Y.Mine：聚合展示、状态巡检、调度下发                  │
└─────────────────────────────────────────────────────────┘
    </pre>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.info(f"""
**实验室信息**
- ID: `{CONFIG['lab_id']}`
- 版本: `{CONFIG['version']}`
- 存储路径: `{STORAGE_DIR}`
- 设计容量: {CONFIG['storage']['design_capacity_gb']} GB
- 向量维度: {CONFIG['vector']['total_dims']} 维（公共4维 + 金融私有7维）
""")
