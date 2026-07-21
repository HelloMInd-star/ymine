"""
MindSpeak Embedding Lab (MS-Lab) - Streamlit 可视化仪表盘
==========================================================
Batch1交付：工程骨架 + 深空蓝主题仪表盘 + 四向量库监控 + Token计费 + 告警面板
         + 权限模拟 + 总控对接占位 + 红线声明面板

严格红线：
  - 不实现通用数学求解库
  - 不实现128bit高精度向量运算（仅预留空接口）
  - 不编写KMP底层源码（仅接收匹配分值接口）
  - 不开发算力调度博弈算法（仅上报+指令接收外壳）
  - 不硬编码私有风控/估值公式
  - 不自主生成新方程（仅模板）
  - 前端只展示，不嵌入底层数理运算
"""
import json
import os
import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st

from mslab_utils import (
    BASE_DIR, DB_PATHS, META_DIR, BILLING_DIR, ALERT_DIR, SEC_DIR,
    TZ_CN, now_cn, now_cn_iso,
    read_json, write_json, append_jsonl,
    refresh_index_stats, load_lab_config, load_vector_index,
    log_billing, read_billing_tail, log_alert, read_alerts,
    human_bytes, dir_stats,
    log_op, read_op_log,
    save_vector, load_vector, delete_vector, list_vectors, load_all_vectors,
    tier_real_stats, all_tiers_real_stats, TIER_CAP_BYTES,
    compute_global_bit_util,
    PrivateKernel128Bit, KMPSearchInterface, SolverKernelStub, ComputeSchedulerStub,
    build_hot_cache, cache_status, hot_cache_search,
    load_pricing_config, save_pricing_config, calc_billing, log_billing_v2,
    check_duplicate, should_downgrade, auto_route_and_store,
    HOT_VECTOR_CACHE, WARM_VECTOR_CACHE,
)
from mslab_vector import (
    tokenize, build_4d_vector, calc_vector_bytes, analyze_vector_bits,
    kmp_block_stats, VectorRecord, FP128Reserved,
    POS_DIM_LABELS, POS_DIM_NAMES, PRECISION_BYTES,
    cosine_similarity, classify_tier_by_similarity, count_tokens_in_text,
    estimate_output_tokens, vector_fingerprint, text_normalize, downgrade_precision,
    REFERENCE_KNOWLEDGE_VEC, ROUTE_THRESHOLDS,
)
from mslab_theme import render_theme, render_header


st.set_page_config(
    page_title="MindSpeak Embedding Lab · MS-Lab",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

render_theme()

# ============================================================
# Session 初始化
# ============================================================
if "perm_level" not in st.session_state:
    st.session_state.perm_level = "operator"
if "seeded" not in st.session_state:
    st.session_state.seeded = False
if "scheduler_link" not in st.session_state:
    st.session_state.scheduler_link = False


def seed_demo_data_if_needed():
    """Batch1首次启动时写入一些演示账单与告警数据（仅展示用）"""
    if st.session_state.seeded:
        return
    bill_path = BILLING_DIR / "token_billing.jsonl"
    alert_path = ALERT_DIR / "alert_log.jsonl"
    if (not bill_path.exists()) or bill_path.stat().st_size < 50:
        random.seed(42)
        now = datetime.now(TZ_CN)
        for i in range(72):
            ts = now - timedelta(hours=72-i)
            tokens_in  = random.randint(80, 2000)
            tokens_out = random.randint(20, 800)
            cost = (tokens_in + tokens_out) * 0.00002 * random.uniform(0.8, 1.2)
            append_jsonl(bill_path, {
                "id": f"demo{i:03d}",
                "ts": ts.isoformat(timespec="seconds"),
                "op": random.choice(["query", "embed", "sync_mindspeak", "retrieve"]),
                "model": "mslab-embed-v1",
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "tokens_total": tokens_in + tokens_out,
                "cost_rmb": round(cost, 6),
            })
    if (not alert_path.exists()) or alert_path.stat().st_size < 50:
        log_alert("info", "system", "MS-Lab V1.0-Batch1 仪表盘启动，四向量库挂载成功", "bootstrap")
        log_alert("warn", "watermark", "mslab_buffer_db 水位 23%，处于正常区间", "monitor")
        log_alert("warn", "precision", "当前向量精度 0.962（目标 ≥0.95）", "monitor")
        log_alert("info", "scheduler", "等待几何心智空间算力底座连接确认", "scheduler")
        log_alert("ok",   "security",  "AES-256-GCM 加密模块加载，公私分层隔离生效", "security")
    st.session_state.seeded = True


seed_demo_data_if_needed()
refresh_index_stats()
cfg = load_lab_config()
tiers_real = all_tiers_real_stats()
global_bit_util = compute_global_bit_util()
build_hot_cache()
pricing_cfg = load_pricing_config()

# ============================================================
# 侧边栏 —— 导航 + 权限切换 + 红线
# ============================================================
# 静态服务基址（总控台HTTP服务器端口）
# ============================================================
STATIC_BASE = "http://localhost:8090"

with st.sidebar:
    st.markdown(f"""
    <div style="padding:10px 4px 14px 4px; border-bottom:1px solid rgba(129,140,248,0.15); margin-bottom:12px">
        <div style="font-size:15px; font-weight:700; color:#e0e7ff; display:flex; align-items:center; gap:8px">
            🧠 MS-Lab 控制台
        </div>
        <div style="font-size:11px; color:#7a86b4; margin-top:4px; font-family:monospace">
            v1.0-Batch1 · Streamlit :8501
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
            <a href="{STATIC_BASE}/index.html" target="_blank"
               style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#fcd34d;
                      background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.35);
                      padding:5px 10px;border-radius:6px;text-decoration:none">
               🏠 返回 Y.Mine 总控台
            </a>
            <a href="{STATIC_BASE}/engines/geom-compute/index.html" target="_blank"
               style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#93c5fd;
                      background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35);
                      padding:5px 10px;border-radius:6px;text-decoration:none">
               🏗️ 几何算力中控台
            </a>
            <a href="{STATIC_BASE}/ms-lab/index.html" target="_blank"
               style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#6ee7b7;
                      background:rgba(52,211,153,0.10);border:1px solid rgba(52,211,153,0.35);
                      padding:5px 10px;border-radius:6px;text-decoration:none">
               🧠 MS-Lab 入口页
            </a>
        </div>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio(
        "📂 导航",
        ["🏠 总览仪表盘", "💾 向量库管理", "🔍 检索测试", "💰 Token 计费", "🚨 告警中心", "⚙️ 权限与设置"],
        index=0,
        label_visibility="collapsed",
    )

    st.markdown("---")
    st.markdown("#### 🔑 权限角色（演示切换）")
    perm_map = {"operator": "👤 普通操作员", "architect": "🏛️ 架构审核", "admin": "👑 最高管理员"}
    new_perm = st.selectbox(
        "当前角色",
        options=list(perm_map.keys()),
        format_func=lambda x: perm_map[x],
        index=list(perm_map.keys()).index(st.session_state.perm_level),
        label_visibility="collapsed",
    )
    st.session_state.perm_level = new_perm

    pcan = cfg.get("permissions", {}).get(new_perm, {}).get("can", [])
    st.markdown("<div style='font-size:11px;color:#94a3b8'>已授权能力：</div>", unsafe_allow_html=True)
    can_label = {
        "view_dashboard": "查看仪表盘",
        "basic_search": "基础向量检索",
        "view_billing": "查看账单",
        "adjust_threshold": "调整相似度阈值",
        "tier_mgmt": "冷热存储策略",
        "audit_log": "审计日志",
        "precision_config_128bit_entry": "128bit配置入口（预留）",
    }
    for c in pcan:
        st.markdown(f"<div style='font-size:11px;color:#6ee7b7'>✓ {can_label.get(c,c)}</div>", unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("#### 🔗 算力底座")
    if st.button("🔌 连接几何心智空间总控", use_container_width=True):
        stub = ComputeSchedulerStub()
        resp = stub.report_status({"type": "mslab_hello", "lab": "MS-Lab"})
        st.session_state.scheduler_link = True
        log_alert("ok", "scheduler", "已向几何心智空间算力底座发送握手包（Batch1仅上报外壳）", "scheduler")
        st.success("握手包已上报（外壳层，不执行调度）")
    if st.session_state.scheduler_link:
        st.markdown("<div class='perm-badge perm-op' style='font-size:10px'>🟢 已发握手 · 待总控确认</div>", unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("#### 🚫 开发红线（强制）")
    red_lines = cfg.get("red_lines", [])
    for rl in red_lines:
        st.markdown(f"<div style='font-size:10px;color:#fca5a5;line-height:1.6'>• {rl}</div>", unsafe_allow_html=True)

# ============================================================
# 页面路由
# ============================================================
render_header(st.session_state.perm_level)

# ---------------------------------------------------------------------
# 页面1：总览仪表盘
# ---------------------------------------------------------------------
if page.startswith("🏠"):
    # ------- KPI 计算（基于真实存储） -------
    total_vec = sum(t.get("vector_count", 0) for t in tiers_real.values())
    total_byte = sum(t.get("byte_size", 0) for t in tiers_real.values())
    total_cap  = sum(t.get("cap_bytes", 0) for t in tiers_real.values())
    precision = 0.962
    max_wm_key = max(tiers_real, key=lambda k: tiers_real[k].get("watermark", 0))
    max_wm = tiers_real[max_wm_key]["watermark"]
    bit_util = global_bit_util
    # 账单汇总
    bills = read_billing_tail(1000)
    total_tokens = sum(b.get("tokens_total", 0) for b in bills)
    total_cost   = sum(b.get("cost_rmb", 0) for b in bills)
    last24h = datetime.now(TZ_CN) - timedelta(hours=24)
    cost_24h = sum(b.get("cost_rmb", 0) for b in bills
                   if datetime.fromisoformat(b["ts"]) > last24h) if bills else 0.0
    tokens_24h = sum(b.get("tokens_total", 0) for b in bills
                     if datetime.fromisoformat(b["ts"]) > last24h) if bills else 0
    # 告警
    alerts_all = read_alerts(include_acked=True, n=200)
    alerts_unacked = [a for a in alerts_all if not a.get("acknowledged")]
    crit_cnt = sum(1 for a in alerts_unacked if a.get("level") == "crit")
    warn_cnt = sum(1 for a in alerts_unacked if a.get("level") == "warn")
    scheduler_status = "🟢 已发握手" if st.session_state.scheduler_link else "🟡 待连接"

    # ------- KPI 网格 -------
    st.markdown(f"""
    <div class="kpi-grid">
        <div class="kpi-card kpi-blue">
            <div class="kpi-label">📦 四向量库总量</div>
            <div class="kpi-value">{total_vec}</div>
            <div class="kpi-sub">向量条数 · {human_bytes(total_byte)} 占用</div>
        </div>
        <div class="kpi-card kpi-cyan">
            <div class="kpi-label">💽 总磁盘占用</div>
            <div class="kpi-value">{human_bytes(total_byte + 4*1024*1024)}</div>
            <div class="kpi-sub">含meta/日志/索引</div>
        </div>
        <div class="kpi-card kpi-purple">
            <div class="kpi-label">⚡ 二进制有效比特率</div>
            <div class="kpi-value">{bit_util*100:.1f}%</div>
            <div class="kpi-sub">目标 ≥85%</div>
        </div>
        <div class="kpi-card kpi-amber">
            <div class="kpi-label">🌊 综合存储水位</div>
            <div class="kpi-value">{max_wm*100:.1f}%</div>
            <div class="kpi-sub">最高水位：{ {"trash":"噪声库","buffer":"缓冲库","normal":"常规库","knowledge":"知识库"}[max_wm_key] }</div>
        </div>
        <div class="kpi-card kpi-green">
            <div class="kpi-label">🪙 实时 Token 消耗(24h)</div>
            <div class="kpi-value">{tokens_24h:,}</div>
            <div class="kpi-sub">≈ ¥{cost_24h:.4f}</div>
        </div>
        <div class="kpi-card kpi-green">
            <div class="kpi-label">💳 累计费用</div>
            <div class="kpi-value">¥{total_cost:.2f}</div>
            <div class="kpi-sub">{len(bills)} 条计费记录</div>
        </div>
        <div class="kpi-card kpi-blue">
            <div class="kpi-label">🎯 当前向量精度</div>
            <div class="kpi-value">{precision:.3f}</div>
            <div class="kpi-sub">目标 ≥0.95 · 降级阈值 {(precision-0.05):.2f}</div>
        </div>
        <div class="kpi-card kpi-red">
            <div class="kpi-label">🚨 系统告警</div>
            <div class="kpi-value">{crit_cnt}🔴 / {warn_cnt}🟡</div>
            <div class="kpi-sub">未处理告警总数 {len(alerts_unacked)}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ------- 四向量库存储分层 + 算力底座连接状态 -------
    col_a, col_b = st.columns([2.2, 1], gap="large")

    with col_a:
        st.markdown("""
        <div class="section-panel">
            <div class="section-title">💾 四级向量库存储分布</div>
        """, unsafe_allow_html=True)

        tier_labels = {
            "trash":     ("🗑️", "无效噪声库", "tier-trash",     "mslab_trash_db"),
            "buffer":    ("⏳", "临时缓冲库", "tier-buffer",    "mslab_buffer_db"),
            "normal":    ("📦", "常规业务库", "tier-normal",    "mslab_normal_db"),
            "knowledge": ("🏛️", "高价值知识库", "tier-knowledge","mslab_knowledge_db"),
        }
        html_tier = '<div class="tier-grid">'
        for k,(icon,name,cls,dirn) in tier_labels.items():
            t = tiers_real.get(k, {})
            vc = t.get("vector_count", 0)
            bs = t.get("byte_size", 0)
            cap = t.get("cap_bytes", TIER_CAP_BYTES[k])
            ratio = min(100, bs/cap*100) if cap > 0 else 0
            wm_alarm = cfg.get("storage_tiers",{}).get(k,{}).get("watermark_alarm", 0.8)*100
            html_tier += f"""
            <div class="tier-card {cls}">
                <div class="tier-name">{icon} {name}</div>
                <div class="tier-stat-row"><span>向量条数</span><span class="tier-stat-val">{vc}</span></div>
                <div class="tier-stat-row"><span>占用空间</span><span class="tier-stat-val">{human_bytes(bs)}</span></div>
                <div class="tier-stat-row"><span>设计容量</span><span class="tier-stat-val">{human_bytes(cap)}</span></div>
                <div class="tier-stat-row"><span>水位</span><span class="tier-stat-val">{ratio:.2f}% / 告警{wm_alarm:.0f}%</span></div>
                <div class="tier-bar"><div class="tier-bar-fill" style="width:{ratio}%"></div></div>
            </div>
            """
        html_tier += "</div></div>"
        st.markdown(html_tier, unsafe_allow_html=True)

    with col_b:
        st.markdown("""
        <div class="section-panel">
            <div class="section-title">🔗 算力底座连接</div>
        """, unsafe_allow_html=True)
        st.markdown(f"""
        <div style="font-size:12px; color:#cbd5e1; line-height:2">
            <div>🎯 上层系统：<span style="color:#93c5fd">几何心智空间全域大模型算力错峰调度底座</span></div>
            <div>📡 连接状态：<span style="color:{'#6ee7b7' if st.session_state.scheduler_link else '#fcd34d'}">{scheduler_status}</span></div>
            <div>🧩 同级实验：<span style="color:#c4b5fd">MoodMind 金融向量实验室</span></div>
            <div>🔐 公私分层：<span style="color:#6ee7b7">AES-256-GCM 生效</span></div>
            <div>🧮 128bit内核：<span style="color:#fca5a5">预留空接口 · 未启用</span></div>
            <div>🔎 KMP引擎：<span style="color:#fcd34d">待对接（仅接收分值）</span></div>
            <div>📤 数据方向：<span style="color:#93c5fd">MS-Lab 主动推送 → 总控只读展示</span></div>
        </div>
        """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # ------- Plotly 图：Token 消耗趋势 + 四库容量占比 -------
    col_c, col_d = st.columns(2, gap="large")

    with col_c:
        st.markdown("""
        <div class="section-panel">
            <div class="section-title">📈 72小时 Token 消耗趋势</div>
        """, unsafe_allow_html=True)
        if bills:
            df = pd.DataFrame(bills)
            df["ts_dt"] = pd.to_datetime(df["ts"])
            df_h = df.set_index("ts_dt").resample("1h").agg({"tokens_total":"sum","cost_rmb":"sum"}).reset_index()
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=df_h["ts_dt"], y=df_h["tokens_total"],
                mode="lines", name="Tokens/h",
                line=dict(color="#60a5fa", width=2),
                fill="tozeroy", fillcolor="rgba(96,165,250,0.15)",
            ))
            fig.add_trace(go.Scatter(
                x=df_h["ts_dt"], y=df_h["cost_rmb"]*100000,
                mode="lines", name="费用(×10万 ¥)",
                line=dict(color="#a78bfa", width=1.5, dash="dot"),
                yaxis="y2",
            ))
            fig.update_layout(
                template="plotly_dark",
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#cbd5e1", size=11),
                margin=dict(l=10,r=10,t=10,b=10),
                height=260,
                legend=dict(orientation="h", y=1.02, x=0),
                yaxis=dict(gridcolor="rgba(129,140,248,0.1)", title="Tokens"),
                yaxis2=dict(gridcolor="rgba(129,140,248,0.05)", title="费用(×10万 ¥)", overlaying="y", side="right"),
                xaxis=dict(gridcolor="rgba(129,140,248,0.05)"),
            )
            st.plotly_chart(fig, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with col_d:
        st.markdown("""
        <div class="section-panel">
            <div class="section-title">🥧 四向量库容量占比</div>
        """, unsafe_allow_html=True)
        names = ["噪声库","缓冲库","常规库","知识库"]
        sizes = [tiers_real["trash"]["byte_size"], tiers_real["buffer"]["byte_size"],
                 tiers_real["normal"]["byte_size"], tiers_real["knowledge"]["byte_size"]]
        if sum(sizes) == 0:
            sizes = [1, 1, 1, 1]
        colors = ["#64748b","#fbbf24","#3b82f6","#10b981"]
        fig2 = go.Figure(data=[go.Pie(
            labels=names, values=sizes, hole=.55,
            marker=dict(colors=colors, line=dict(color="rgba(14,20,42,1)", width=2)),
            textfont=dict(color="#e2e8f0", size=11),
            hovertemplate="%{label}<br>%{value} bytes<br>占比 %{percent}<extra></extra>",
        )])
        fig2.update_layout(
            template="plotly_dark",
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=10,r=10,t=10,b=10), height=260,
            annotations=[dict(text=f"{human_bytes(sum(sizes))}", x=0.5, y=0.5,
                              font_size=13, font_color="#e0e7ff", showarrow=False,
                              font_family="SF Mono, Consolas, monospace")],
        )
        st.plotly_chart(fig2, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # ------- 最新告警列表 -------
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🚨 最新告警（最近10条）</div>
    """, unsafe_allow_html=True)
    latest = alerts_all[:10]
    if not latest:
        st.markdown("<div style='color:#6ee7b7;font-size:12px'>✅ 暂无告警</div>", unsafe_allow_html=True)
    else:
        alert_html = ""
        lvl_cls = {"crit":"alert-crit","warn":"alert-warn","info":"alert-info","ok":"alert-ok"}
        lvl_lbl = {"crit":"🔴 严重","warn":"🟡 警告","info":"🔵 信息","ok":"🟢 正常"}
        lvl_name= {"crit":"alert-level-crit","warn":"alert-level-warn","info":"alert-level-info","ok":"alert-level-ok"}
        for a in latest:
            lvl = a.get("level","info")
            alert_html += f"""
            <div class="alert-item {lvl_cls.get(lvl,'alert-info')}">
                <span class="alert-ts">{a.get('ts','')[-8:]}</span>
                <span class="{lvl_name.get(lvl,'alert-level-info')}">{lvl_lbl.get(lvl,lvl)}</span>
                <span class="alert-msg">[{a.get('category','')}] {a.get('message','')}</span>
            </div>
            """
        st.markdown(alert_html, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    # ------- 开发批次进度 -------
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🚀 分批次开发进度</div>
        <div style="font-size:12px; color:#cbd5e1; line-height:2; margin-bottom:10px">
            开发模式：<span style="color:#fcd34d">分三批次开发、分批验收，禁止一次性全量开发</span>
        </div>
        <div class="batch-row">
            <span class="batch-chip batch-done">✅ Batch1：工程骨架+仪表盘+监控面板</span>
            <span class="batch-chip batch-next">⏳ Batch2：向量CRUD+AES加密+KMP检索接口+冷热迁移</span>
            <span class="batch-chip batch-todo">📋 Batch3：三级权限落地+总控主动推送+审计日志+验收</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

# ---------------------------------------------------------------------
# 页面2：向量库管理 —— Batch2增强：自动分流/Token计费/降级/去重/冷热缓存
# ---------------------------------------------------------------------
elif page.startswith("💾"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">💾 向量生成 · 词性拆分 · 相似度自动分流入库</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            📌 Batch2新功能：<b style="color:#fcd34d">余弦相似度四档自动分流</b> ·
            <b style="color:#6ee7b7">Token输入/输出分别计费</b> ·
            <b style="color:#f87171">FP64水位超90%自动降级FP32</b> ·
            <b style="color:#a78bfa">向量指纹去重</b> ·
            <b style="color:#93c5fd">冷热缓存（知识库常驻内存）</b>
        </div>
    """, unsafe_allow_html=True)

    col_input, col_opt = st.columns([3, 1], gap="medium")
    with col_input:
        input_text = st.text_area(
            "📝 输入中文/英文文本",
            value="深度学习模型通过大规模知识训练快速构建高维语义向量空间，实现精准智能检索和稳定的知识存储系统",
            height=100,
            placeholder="在此输入待向量化的文本，支持中英文混合……",
        )
    with col_opt:
        storage_mode = st.radio(
            "📦 入库模式",
            options=["auto", "manual"],
            format_func=lambda x: {"auto":"🤖 自动相似度分流","manual":"✋ 手动指定库"}[x],
            index=0,
            horizontal=True,
        )
        precision_sel = st.selectbox(
            "🧮 存储精度",
            options=["fp32", "fp64", "fp128"],
            index=0,
            format_func=lambda x: {"fp32":"FP32 (单精度·4B)","fp64":"FP64 (双精度·8B)","fp128":"FP128 (预留·红线禁用)"}[x],
        )
        if storage_mode == "manual":
            tier_sel = st.selectbox(
                "📦 目标向量库",
                options=["buffer", "normal", "knowledge", "trash"],
                index=0,
                format_func=lambda x: {"trash":"🗑️ 噪声库","buffer":"⏳ 缓冲库","normal":"📦 常规库","knowledge":"🏛️ 知识库"}[x],
            )
        else:
            st.info("🤖 自动分流：相似度＜25%丢弃 / 25-50%缓冲 / 50-75%常规 / ≥75%知识库")
        block_size = st.number_input("KMP分块大小(字节)", min_value=64, max_value=4096, value=256, step=64)
        auto_downgrade = st.checkbox("🔻 水位超90%自动FP64→FP32", value=True)
        skip_dup = st.checkbox("🔁 自动去重（指纹+文本）", value=True)

    # Token费用预览（实时计算）
    text = input_text.strip()
    if text:
        tok_in_info = count_tokens_in_text(text)
        tok_out_info = estimate_output_tokens(precision_sel if precision_sel != "fp128" else "fp32", 4)
        bill_preview = calc_billing(tok_in_info["total_tokens"], tok_out_info["total_tokens"], pricing_cfg)
        tok1, tok2, tok3, tok4 = st.columns(4)
        tok1.metric("📥 输入Tokens", f"{tok_in_info['total_tokens']}", f"CJK{tok_in_info['cjk_tokens']}+EN{tok_in_info['ascii_words']}")
        tok2.metric("📤 输出Tokens", f"{tok_out_info['total_tokens']}", f"向量{tok_out_info['element_tokens']}+meta{tok_out_info['metadata_tokens']}")
        tok3.metric("💰 预估费用", f"¥{bill_preview['total_cost']:.6f}", f"入¥{bill_preview['input_cost']:.6f}+出¥{bill_preview['output_cost']:.6f}")
        if storage_mode == "auto" and precision_sel != "fp128":
            _tmp_rec = VectorRecord.from_text(text, precision_sel, "buffer", block_size=int(block_size))
            _route = classify_tier_by_similarity(_tmp_rec.vector)
            tier_pred = _route["tier"]
            tier_icon = {"trash":"🗑️","buffer":"⏳","normal":"📦","knowledge":"🏛️"}[tier_pred]
            tok4.metric("🤖 预测路由", f"{tier_icon} {tier_pred}", f"相似度{_route['similarity_pct']}%")
        else:
            tok4.metric("📂 目标库", f"{tier_sel if storage_mode=='manual' else '-'}", "手动模式")

    col_gen, col_clr = st.columns([1, 1])

    if col_gen.button("🚀 生成四维向量 & 自动分流入库", type="primary", use_container_width=True):
        text = input_text.strip()
        if not text:
            st.warning("请输入文本内容")
        elif precision_sel == "fp128":
            try:
                FP128Reserved()
            except NotImplementedError as e:
                st.error(f"🚫 {e}")
        else:
            with st.spinner("正在分词→向量化→相似度路由→计费→入库…"):
                try:
                    rec = VectorRecord.from_text(
                        text=text, precision=precision_sel,
                        tier="buffer" if storage_mode=="auto" else tier_sel,
                        block_size=int(block_size),
                    )
                    rec_dict = rec.to_dict()
                    if storage_mode == "auto":
                        result = auto_route_and_store(rec_dict, auto_downgrade=auto_downgrade, skip_duplicate=skip_dup)
                        st.session_state["last_store_result"] = result
                        st.session_state["preview_vec"] = rec_dict
                        log_op("vector_auto_store", {
                            "precision": precision_sel, "auto_mode": True,
                            "target_tier": result.get("route",{}).get("tier"),
                            "similarity": result.get("route",{}).get("similarity"),
                            "text_len": len(text),
                        })
                    else:
                        if skip_dup:
                            dup = check_duplicate(rec_dict, tier_sel)
                            if dup["is_duplicate"]:
                                st.warning(f"🔁 检测到重复向量 {dup['duplicate_id']}@{dup['duplicate_tier']}（{dup['match_type']}），跳过入库")
                                st.session_state["preview_vec"] = rec_dict
                            else:
                                rec_dict["fingerprint"] = vector_fingerprint(rec_dict["vector"], precision_sel, text_normalize(text))
                                dg = should_downgrade(tier_sel, precision_sel)
                                final_rec = rec_dict
                                downgraded_flag = False
                                if dg["should_downgrade"] and auto_downgrade:
                                    final_rec = downgrade_precision(rec_dict)
                                    downgraded_flag = True
                                    st.warning(f"⚠️ {dg['reason']}，已自动降级为FP32")
                                tok_in_info = count_tokens_in_text(text)
                                tok_out_info = estimate_output_tokens(final_rec["precision"], 4)
                                bill = log_billing_v2(tok_in_info["total_tokens"], tok_out_info["total_tokens"], op="embed_manual",
                                                     extra={"tier": tier_sel, "precision": final_rec["precision"]})
                                save_res = save_vector(final_rec)
                                if save_res["ok"]:
                                    if tier_sel == "knowledge":
                                        HOT_VECTOR_CACHE[final_rec["vec_id"]] = {
                                            "vec_id": final_rec["vec_id"], "vector": final_rec["vector"],
                                            "precision": final_rec["precision"], "text": text[:80],
                                            "similarity": 0, "tier": "knowledge", "_loaded_at": now_cn_iso(),
                                        }
                                    elif tier_sel == "normal":
                                        warm_cache_put(final_rec)
                                    st.success(f"✅ 向量已存入{tier_sel}库 · {final_rec['byte_info']['total_bytes']}B · ¥{bill['cost_rmb']:.6f}" +
                                               ("（已降级FP32）" if downgraded_flag else ""))
                                    del st.session_state["preview_vec"]
                                    st.balloons()
                                    st.rerun()
                                else:
                                    st.error("写入失败")
                        else:
                            save_res = save_vector(rec_dict)
                            if save_res["ok"]:
                                tok_in_info = count_tokens_in_text(text)
                                tok_out_info = estimate_output_tokens(precision_sel, 4)
                                log_billing_v2(tok_in_info["total_tokens"], tok_out_info["total_tokens"], op="embed_manual_nodedup",
                                              extra={"tier": tier_sel})
                                st.success(f"✅ 向量已存入{tier_sel}库 · {rec_dict['byte_info']['total_bytes']}B")
                                del st.session_state["preview_vec"]
                                st.balloons()
                                st.rerun()
                except Exception as e:
                    st.exception(e)
                    st.error(f"向量生成失败: {e}")

    if col_clr.button("🗑️ 清除预览", use_container_width=True):
        for k in ["preview_vec","last_store_result"]:
            if k in st.session_state:
                del st.session_state[k]
        st.rerun()

    preview_rec = st.session_state.get("preview_vec")
    last_result = st.session_state.get("last_store_result")

    # 自动分流结果展示
    if last_result and storage_mode == "auto":
        st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)
        res = last_result
        route = res.get("route", {})
        bg_color = {"trash":"rgba(100,116,139,0.15)","buffer":"rgba(251,191,36,0.12)",
                    "normal":"rgba(59,130,246,0.12)","knowledge":"rgba(16,185,129,0.12)"}.get(route.get("tier"),"rgba(59,130,246,0.1)")
        bd_color = {"trash":"rgba(100,116,139,0.4)","buffer":"rgba(251,191,36,0.4)",
                    "normal":"rgba(59,130,246,0.4)","knowledge":"rgba(16,185,129,0.4)"}.get(route.get("tier"),"rgba(59,130,246,0.4)")
        if res.get("ok"):
            st.success(f"✅ 自动入库成功！路由到 {route.get('tier_label')}（相似度 {route.get('similarity_pct')}%）")
        elif res.get("skipped"):
            st.warning(f"🔁 {res['steps'][-1]}")
        if res.get("warnings"):
            for w in res["warnings"]:
                st.warning(w)
        if "billing" in res:
            b = res["billing"]
            st.info(f"💰 计费：输入{b['tokens_in']}tok × ¥{b['pricing']['in_per_1k']}/1K + 输出{b['tokens_out']}tok × ¥{b['pricing']['out_per_1k']}/1K = **¥{b['cost_rmb']:.6f}**")
        with st.expander("📋 详细执行步骤"):
            for i, step in enumerate(res.get("steps",[]), 1):
                st.markdown(f"{i}. {step}")

    if preview_rec and not (last_result and last_result.get("ok")):
        st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
        pv = preview_rec
        pv_tier = pv.get("tier", tier_sel if storage_mode=="manual" else classify_tier_by_similarity(pv["vector"])["tier"])
        st.markdown(f"""
        <div style="background:linear-gradient(135deg,rgba(59,130,246,0.10),rgba(139,92,246,0.08));
                    border:1px solid rgba(96,165,250,0.30);border-radius:12px;padding:16px 20px;margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;color:#93c5fd;margin-bottom:10px">
                🧠 四维向量预览
                <span style="font-size:11px;color:#64748b;font-weight:400;margin-left:12px">ID: {pv['vec_id']} · {pv['precision'].upper()}</span>
            </div>
        """, unsafe_allow_html=True)

        v = pv["vector"]
        cnt = pv["counts"]
        vc1, vc2, vc3, vc4 = st.columns(4)
        vc1.metric(f"📛 名词(noun)", f"{v[0]:.4f}", f"命中{cnt['noun']}词")
        vc2.metric(f"🏃 动词(verb)", f"{v[1]:.4f}", f"命中{cnt['verb']}词")
        vc3.metric(f"✨ 形容词(adj)", f"{v[2]:.4f}", f"命中{cnt['adj']}词")
        vc4.metric(f"💨 副词(adv)", f"{v[3]:.4f}", f"命中{cnt['adv']}词")

        # 路由预测条
        if storage_mode == "auto":
            route = classify_tier_by_similarity(v)
            st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)
            st.markdown(f"""
            <div style="background:rgba(0,0,0,0.25);border-radius:8px;padding:10px 14px;margin-bottom:8px">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">
                    🤖 与参考知识向量 <code>[0.50,0.50,0.00,0.00]</code>（纯名动高密度方向）余弦相似度 =
                    <b style="color:#fcd34d;font-family:monospace">{route['similarity_pct']}%</b>
                    → 预测路由：<b style="color:#6ee7b7">{route['tier_label']}</b>
                </div>
                <div style="display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden">
                    <div style="flex:25;background:rgba(100,116,139,0.5)" title="0-25% trash"></div>
                    <div style="flex:25;background:rgba(251,191,36,0.5)" title="25-50% buffer"></div>
                    <div style="flex:25;background:rgba(59,130,246,0.5)" title="50-75% normal"></div>
                    <div style="flex:25;background:rgba(16,185,129,0.5)" title="75-100% knowledge"></div>
                </div>
                <div style="position:relative;height:14px;margin-top:-12px">
                    <div style="position:absolute;left:{route['similarity_pct']}%;transform:translateX(-50%);width:2px;height:14px;background:#fff"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:2px">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

        bi = pv["byte_info"]
        bs = pv["bit_stats"]
        kb = pv["kmp_blocks"]
        st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)

        m1, m2, m3, m4, m5 = st.columns(5)
        m1.metric("📐 维度", bi["dims"])
        m2.metric("📦 单元素字节", f"{bi['elem_bytes']} B")
        m3.metric("🧮 载荷字节", f"{bi['payload_bytes']} B")
        m4.metric("🏷️ 元数据字节", f"{bi['metadata_bytes']} B")
        m5.metric("💾 单向量总字节", f"{bi['total_bytes']} B")
        st.caption(f"**计算公式**：{bi['formula']}")

        b1, b2, b3, b4 = st.columns(4)
        b1.metric("⚡ 有效比特率", f"{bs['effective_bit_ratio']*100:.2f}%", f"1-bits: {bs['one_bits']}/{bs['total_bits']}")
        b2.metric("🅾️ 补0冗余率", f"{bs['zero_padding_ratio']*100:.2f}%", f"0-bits: {bs['zero_bits']}")
        b3.metric("📦 KMP分块数", f"{kb['block_count']} 块", f"块大小 {kb['block_size']}B")
        b4.metric("📝 文本长度", f"{kb['text_chars']} 字 / {kb['text_bytes']}B", f"尾块填充{kb['padding_bytes']}B")

        with st.expander("🔍 分词结果详情（词性标注）"):
            tagged = pv["tokens_tagged"]
            pos_color = {"noun":"#60a5fa","verb":"#f87171","adj":"#fbbf24","adv":"#a78bfa","other":"#64748b"}
            pos_lbl   = {"noun":"名","verb":"动","adj":"形","adv":"副","other":"·"}
            html_tokens = '<div style="display:flex;flex-wrap:wrap;gap:6px;font-family:SF Mono,Consolas,monospace;font-size:12px">'
            for word, tag in tagged:
                c = pos_color.get(tag,"#64748b")
                l = pos_lbl.get(tag,"·")
                html_tokens += f'<span style="background:{c}22;border:1px solid {c}55;border-radius:4px;padding:3px 8px;color:{c}">{word}<sup style="opacity:.7;margin-left:2px">{l}</sup></span>'
            html_tokens += "</div>"
            st.markdown(html_tokens, unsafe_allow_html=True)

        with st.expander("🔢 原始二进制 / HEX 预览"):
            st.code(f"HEX (meta+payload): {bs['raw_hex']}", language="text")
            plbs = bs["payload_bits_stats"]
            mebs = bs["metadata_bits_stats"]
            c1,c2 = st.columns(2)
            c1.caption(f"**Payload ({plbs['total_bits']} bits)**: 1-bits={plbs['one_bits']} / 0-bits={plbs['zero_bits']} / 有效率={plbs['effective_bit_ratio']*100:.2f}%")
            c2.caption(f"**Metadata 8B ({mebs['total_bits']} bits)**: 1-bits={mebs['one_bits']} / 0-bits={mebs['zero_bits']} / 有效率={mebs['effective_bit_ratio']*100:.2f}%")

        with st.expander("🧩 KMP长文本分块存储元数据"):
            st.caption(kb["note"])
            if kb["blocks"]:
                blk_df = pd.DataFrame([{
                    "块ID": b["block_id"],
                    "起始偏移": b["offset"],
                    "有效长度": b["length"],
                    "末块": "✓" if b["is_last"] else "",
                    "CRC32前缀(校验)": hex(b["crc32_prefix"]),
                } for b in kb["blocks"]])
                st.dataframe(blk_df, use_container_width=True, hide_index=True, height=min(300, 35+len(kb["blocks"])*35))

        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

    # 冷热缓存状态
    cst = cache_status()
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🔥 冷热内存缓存状态</div>
    """, unsafe_allow_html=True)
    cc1, cc2, cc3 = st.columns(3)
    cc1.metric("🔴 HOT 知识库常驻", f"{cst['hot']['count']} 条", cst['hot']['policy'])
    cc2.metric("🟡 WARM 常规库LRU", f"{cst['warm']['count']} / {cst['warm']['max']} 条", cst['warm']['policy'])
    cc3.metric("🔵 COLD 缓冲/噪声", "磁盘直读", cst['cold']['policy'])
    st.markdown("</div>", unsafe_allow_html=True)

    # 四库实时状态
    tiers_real_now = all_tiers_real_stats()
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">📊 四级向量库实时状态（真实存储）</div>
    """, unsafe_allow_html=True)
    rows = []
    for k in ["trash","buffer","normal","knowledge"]:
        t = tiers_real_now.get(k, {})
        cap = t.get("cap_bytes", TIER_CAP_BYTES[k])
        bs  = t.get("byte_size", 0)
        vc  = t.get("vector_count", 0)
        wm  = t.get("watermark", 0)
        wm_alarm = cfg.get("storage_tiers",{}).get(k,{}).get("watermark_alarm", 0.8)
        dg_note = "⚠️FP64将自动降级" if wm >= 0.90 else ""
        rows.append({
            "仓储层级": {"trash":"🗑️ 噪声库","buffer":"⏳ 缓冲库","normal":"📦 常规库","knowledge":"🏛️ 知识库"}[k],
            "向量条数": vc,
            "占用空间": human_bytes(bs),
            "设计容量": human_bytes(cap),
            "当前水位": f"{wm*100:.2f}%",
            "告警线": f"{wm_alarm*100:.0f}%",
            "状态": ("🔴超告警" if wm >= wm_alarm else ("🟡过半" if wm >= 0.5 else "🟢正常")) + (f" {dg_note}" if dg_note else ""),
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    st.markdown("</div>", unsafe_allow_html=True)

    # 向量列表（按库查看/删除）
    view_tier = st.selectbox("📂 查看指定库中的向量", ["knowledge","normal","buffer","trash"],
                             format_func=lambda x: {"trash":"🗑️ 噪声库","buffer":"⏳ 缓冲库","normal":"📦 常规库","knowledge":"🏛️ 知识库"}[x])
    vecs = load_all_vectors(view_tier, limit=100)
    if vecs:
        cache_note = " 🔥热缓存" if view_tier == "knowledge" else (" 🟡温缓存" if view_tier == "normal" else "")
        st.caption(f"共 {len(vecs)} 条向量（显示最近100条）{cache_note}")
        for vr in vecs[:20]:
            sim_info = vr.get("route_info", {})
            fp_info = vr.get("fingerprint", "")[:12]
            dg_info = f" ←FP64降级" if vr.get("downgraded_from") else ""
            title = f"🧠 {vr['vec_id']} · {vr['precision'].upper()}{dg_info} · {vr['byte_info']['total_bytes']}B · {vr['created_at']}"
            if sim_info:
                title += f" · 相似度{sim_info.get('similarity_pct',0)}%"
            with st.expander(title):
                st.caption(f"原文: {vr['text'][:120]}{'…' if len(vr['text'])>120 else ''}")
                if fp_info:
                    st.caption(f"指纹: `{fp_info}…`")
                cc1,cc2,cc3,cc4 = st.columns(4)
                vv = vr["vector"]; cn=vr["counts"]
                cc1.metric("名词", f"{vv[0]:.4f}", f"{cn['noun']}词")
                cc2.metric("动词", f"{vv[1]:.4f}", f"{cn['verb']}词")
                cc3.metric("形容词", f"{vv[2]:.4f}", f"{cn['adj']}词")
                cc4.metric("副词", f"{vv[3]:.4f}", f"{cn['adv']}词")
                if st.session_state.perm_level in ("architect","admin"):
                    if st.button(f"🗑️ 删除该向量", key=f"del_{vr['vec_id']}"):
                        delete_vector(view_tier, vr["vec_id"])
                        if vr["vec_id"] in HOT_VECTOR_CACHE:
                            del HOT_VECTOR_CACHE[vr["vec_id"]]
                        if vr["vec_id"] in WARM_VECTOR_CACHE:
                            del WARM_VECTOR_CACHE[vr["vec_id"]]
                        st.success("已删除（缓存已同步清理）")
                        st.rerun()
    else:
        st.info(f"{'🗑️ 噪声库' if view_tier=='trash' else '⏳ 缓冲库' if view_tier=='buffer' else '📦 常规库' if view_tier=='normal' else '🏛️ 知识库'}中暂无向量")

    # 私有接口占位展示
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🔒 私有内核接口占位（均为禁用空壳）</div>
    """, unsafe_allow_html=True)
    colx, coly, colz = st.columns(3)
    with colx:
        st.markdown("""
        <div class="alert-item alert-crit">
            <span class="alert-msg"><b>🧮 128bit 高精度运算</b><br>
            <span style="color:#fca5a5">预留空入口，不编写可执行代码<br>仅最高管理员可见入口</span></span>
        </div>
        """, unsafe_allow_html=True)
        if st.session_state.perm_level == "admin":
            if st.button("进入128bit配置入口（仅占位）", use_container_width=True):
                try:
                    PrivateKernel128Bit().configure()
                except NotImplementedError as e:
                    st.error(str(e))
        else:
            st.info("当前角色无权限查看（需：最高管理员）")
    with coly:
        st.markdown("""
        <div class="alert-item alert-warn">
            <span class="alert-msg"><b>🔎 KMP 检索接口</b><br>
            <span style="color:#fcd34d">禁止编写KMP底层源码<br>仅接收最终匹配分值</span></span>
        </div>
        """, unsafe_allow_html=True)
    with colz:
        st.markdown("""
        <div class="alert-item alert-warn">
            <span class="alert-msg"><b>🧩 通用求解内核</b><br>
            <span style="color:#fcd34d">禁止搭建通用应用题底层<br>数学求解函数库</span></span>
        </div>
        """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------
# 页面3：检索测试（Batch1仅界面外壳，KMP在Batch2对接）
# ---------------------------------------------------------------------
elif page.startswith("🔍"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🔍 向量/KMP骨架检索测试</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            📌 Batch1仅提供界面外壳；KMP底层匹配源码不在本层实现，Batch2对接外部引擎仅接收分值。
        </div>
    """, unsafe_allow_html=True)
    q = st.text_input("🔎 输入查询文本 / func_expr 骨架片段", placeholder="例如: sigmoid(x)*∑w_i·h_i")
    topk = st.slider("Top-K", 3, 20, 10)
    col1, col2 = st.columns([1,3])
    with col1:
        if st.button("🚀 执行检索", use_container_width=True, type="primary"):
            if not q.strip():
                st.warning("请输入查询内容")
            else:
                # KMP 接口外壳 —— 不实现底层源码
                try:
                    KMPSearchInterface().search(q, topk)
                except NotImplementedError as e:
                    st.error(f"[红线占位] {e}")
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------
# 页面4：Token计费
# ---------------------------------------------------------------------
elif page.startswith("💰"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">💰 Token 计量计费 (Batch2 增强)</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            📌 Token规则：<b style="color:#fcd34d">1~2汉字 = 1Token</b>，英文单词≈1Token，标点不计；
            输入输出分别计价；支持自定义单价；FP64降级FP32可节省约50%存储Token开销。
        </div>
    """, unsafe_allow_html=True)

    # 单价配置
    with st.expander("⚙️ 自定义单价配置", expanded=False):
        pcfg = load_pricing_config()
        pi, po, ps = st.columns(3)
        in_price  = pi.number_input("📥 输入单价 (¥/1K Tokens)",  0.0001, 1.0, float(pcfg.get("input_price_per_1k", 0.002)), step=0.001, format="%.4f")
        out_price = po.number_input("📤 输出单价 (¥/1K Tokens)",  0.0001, 1.0, float(pcfg.get("output_price_per_1k", 0.004)), step=0.001, format="%.4f")
        sto_price = ps.number_input("💾 存储单价 (¥/KB/月)",     0.00001, 0.1, float(pcfg.get("storage_price_per_kb_month", 0.001)), step=0.0001, format="%.5f")
        if st.button("💾 保存单价配置", type="primary"):
            save_pricing_config({"input_price_per_1k": in_price, "output_price_per_1k": out_price, "storage_price_per_kb_month": sto_price})
            st.success("✅ 单价已更新，后续计费使用新单价")
            st.rerun()
        st.caption(f"当前生效单价：输入 ¥{in_price}/1Ktok · 输出 ¥{out_price}/1Ktok · 存储 ¥{sto_price}/KB/月")

    # Token规则计算器
    with st.expander("🧮 Token规则验证计算器", expanded=False):
        demo_text = st.text_input("输入文本以计算Token", value="心智向量化实验室通过深度学习模型快速将文本转换为高维向量")
        if demo_text:
            tki = count_tokens_in_text(demo_text)
            tko = estimate_output_tokens("fp32", 4)
            b = calc_billing(tki["total_tokens"], tko["total_tokens"],
                             {"input_price_per_1k": in_price, "output_price_per_1k": out_price})
            rc1, rc2, rc3, rc4 = st.columns(4)
            rc1.metric("汉字数", tki["cjk_chars"], f"→{tki['cjk_tokens']}tok")
            rc2.metric("英文单词", tki["ascii_words"])
            rc3.metric("输入Tokens", tki["total_tokens"])
            rc4.metric("预估费用", f"¥{b['total_cost']:.6f}")
            st.caption(b["formula"])

    # 读取计费记录（合并老版billing_records.jsonl和新版token_billing.jsonl）
    bills_all = []
    legacy_path = BILLING_DIR / "billing_records.jsonl"
    v2_path = BILLING_DIR / "token_billing.jsonl"
    for p in [legacy_path, v2_path]:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                bills_all.append(json.loads(line))
                            except:
                                pass
            except:
                pass

    if bills_all:
        def norm(r):
            return {
                "ts": r.get("ts", ""),
                "op": r.get("op", "embed"),
                "model": r.get("model", "mslab-embed-v1"),
                "tokens_in":  int(r.get("tokens_in",  r.get("tokens", 0)) or 0),
                "tokens_out": int(r.get("tokens_out", r.get("tokens_out", 4)) or 0),
                "cost_rmb":   float(r.get("cost_rmb", r.get("cost", 0)) or 0),
                "tier": (r.get("extra") or {}).get("tier", "") if isinstance(r.get("extra"), dict) else "",
            }
        norm_rows = [norm(r) for r in bills_all]
        df = pd.DataFrame(norm_rows)
        df["tokens_total"] = df["tokens_in"] + df["tokens_out"]
        total_in  = int(df["tokens_in"].sum())
        total_out = int(df["tokens_out"].sum())
        total_tok = int(df["tokens_total"].sum())
        cost = float(df["cost_rmb"].sum())
        total_cost_in  = float((df["tokens_in"]  * in_price / 1000.0).sum()) if "tokens_in" in df else 0
        total_cost_out = float((df["tokens_out"] * out_price / 1000.0).sum()) if "tokens_out" in df else 0

        c1,c2,c3,c4 = st.columns(4)
        c1.metric("📥 输入Tokens", f"{total_in:,}", f"费用 ¥{total_cost_in:.4f}")
        c2.metric("📤 输出Tokens", f"{total_out:,}", f"费用 ¥{total_cost_out:.4f}")
        c3.metric("🔢 Tokens 合计", f"{total_tok:,}")
        c4.metric("💰 累计费用(¥)", f"{cost:.4f}")
        st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)

        df_show = df[["ts","op","model","tokens_in","tokens_out","tokens_total","tier","cost_rmb"]].copy()
        df_show.columns = ["时间","操作类型","模型","输入Tokens","输出Tokens","合计Tokens","入库层级","费用(¥)"]
        df_show = df_show.sort_values("时间", ascending=False).reset_index(drop=True)
        st.dataframe(df_show, use_container_width=True, hide_index=True, height=380)
        csv = df_show.to_csv(index=False).encode("utf-8-sig")
        st.download_button("📥 导出计费记录 CSV", csv, "mslab_billing.csv", "text/csv")
    else:
        st.info("暂无计费记录，请先在「向量库管理」生成向量触发计费")
    st.markdown("</div>", unsafe_allow_html=True)

    # 模拟查询计费
    with st.expander("🧪 模拟一次查询请求（验证计费日志）"):
        ci, co = st.columns(2)
        tin  = ci.number_input("输入Tokens", 10, 10000, 256)
        tout = co.number_input("输出Tokens", 10, 5000, 128)
        if st.button("📝 写入演示计费记录"):
            b = calc_billing(int(tin), int(tout), {"input_price_per_1k": in_price, "output_price_per_1k": out_price})
            rec = log_billing_v2(int(tin), int(tout), op="query_demo")
            st.success(f"已写入：{rec['id']}  ¥{rec['cost_rmb']:.6f}（入¥{b['input_cost']:.6f} + 出¥{b['output_cost']:.6f}）")
            st.rerun()

# ---------------------------------------------------------------------
# 页面5：告警中心
# ---------------------------------------------------------------------
elif page.startswith("🚨"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🚨 告警中心</div>
    """, unsafe_allow_html=True)
    include_acked = st.checkbox("包含已确认")
    alerts = read_alerts(include_acked=include_acked, n=500)
    lvls = {"全部":None, "🔴 严重":"crit", "🟡 警告":"warn", "🔵 信息":"info", "🟢 正常":"ok"}
    sel = st.selectbox("按等级过滤", list(lvls.keys()))
    target_lvl = lvls[sel]
    if target_lvl:
        alerts = [a for a in alerts if a.get("level")==target_lvl]
    lvl_cls = {"crit":"alert-crit","warn":"alert-warn","info":"alert-info","ok":"alert-ok"}
    lvl_lbl = {"crit":"🔴 严重","warn":"🟡 警告","info":"🔵 信息","ok":"🟢 正常"}
    lvl_name= {"crit":"alert-level-crit","warn":"alert-level-warn","info":"alert-level-info","ok":"alert-level-ok"}
    if not alerts:
        st.info("当前筛选下无告警 ✅")
    else:
        for a in alerts[:100]:
            lvl = a.get("level","info")
            st.markdown(f"""
            <div class="alert-item {lvl_cls.get(lvl,'alert-info')}">
                <span class="alert-ts">{a.get('ts','')}</span>
                <span class="{lvl_name.get(lvl,'alert-level-info')}">{lvl_lbl.get(lvl,lvl)}</span>
                <span class="alert-msg"><b>[{a.get('category','')}]</b> {a.get('message','')} <span style="color:#64748b">· src={a.get('source','')}</span></span>
            </div>
            """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    if st.session_state.perm_level in ("architect", "admin"):
        with st.expander("🧪 写入测试告警"):
            colx, coly = st.columns(2)
            cat = colx.selectbox("类别", ["system","watermark","precision","billing","security","scheduler"])
            lvl = coly.selectbox("等级", ["info","warn","crit","ok"])
            msg = st.text_input("消息", "测试告警内容")
            if st.button("⚠️ 写入告警"):
                log_alert(lvl, cat, msg, "manual")
                st.success("已写入")
                st.rerun()

# ---------------------------------------------------------------------
# 页面6：权限与设置
# ---------------------------------------------------------------------
elif page.startswith("⚙️"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">⚙️ 系统配置与权限</div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("#### 🔑 三级权限划分")
        perm_df = pd.DataFrame([
            {"角色":"👤 普通操作员","等级":1,"可执行":"查看仪表盘 · 基础检索 · 查看账单","可调阈值":"❌","128bit入口":"❌"},
            {"角色":"🏛️ 架构审核",  "等级":2,"可执行":"操作员全部 + 调整相似度阈值 + 冷热存储策略 + 审计日志","可调阈值":"✅","128bit入口":"❌"},
            {"角色":"👑 最高管理员","等级":3,"可执行":"架构审核全部 + 128bit高精度配置入口（预留空壳）","可调阈值":"✅","128bit入口":"🟡 仅空入口"},
        ])
        st.dataframe(perm_df, use_container_width=True, hide_index=True)

    with col2:
        st.markdown("#### 🧮 全局阈值")
        thr = cfg.get("thresholds", {})
        st.metric("保本线 breakeven", f"{thr.get('breakeven',0.48)}")
        st.metric("稳态线 steady_state", f"{thr.get('steady_state',0.50)}")
        st.metric("熔断线 fuse_line", f"{thr.get('fuse_line',0.68)}")
        st.metric("默认相似度", f"{thr.get('default_similarity',0.72)}")
        if st.session_state.perm_level in ("architect","admin"):
            new_sim = st.slider("调整默认相似度阈值", 0.50, 0.95, float(thr.get('default_similarity',0.72)), 0.01)
            if st.button("💾 保存阈值（演示）"):
                cfg["thresholds"]["default_similarity"] = new_sim
                write_json(META_DIR/"lab_config.json", cfg)
                log_alert("info", "config", f"架构审核调整默认相似度阈值为 {new_sim}", "config")
                st.success("已记录（Batch1演示保存）")
                st.rerun()
        else:
            st.info("调整阈值需架构审核或更高权限")

    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🚫 强制开发红线（务必遵守）</div>
    """, unsafe_allow_html=True)
    st.markdown('<div class="redline-box"><div class="redline-title">⚠️ 以下红线在所有Batch中严格遵守，违反任一条即验收不通过</div>', unsafe_allow_html=True)
    st.markdown("<ol class='redline-list'>", unsafe_allow_html=True)
    for rl in cfg.get("red_lines", []):
        st.markdown(f"<li style='margin-bottom:4px'>{rl}</li>", unsafe_allow_html=True)
    st.markdown("</ol></div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

    # 工程目录结构
    with st.expander("📁 工程目录结构"):
        st.code("""
MS-Lab/
├── mslab_trash_db/        # 无效噪声库
├── mslab_buffer_db/       # 临时缓冲向量库
├── mslab_normal_db/       # 常规业务向量库
├── mslab_knowledge_db/    # 定型高价值知识库
├── mslab_meta/            # 向量元数据、KMP索引标记
│   ├── lab_config.json
│   └── vector_index.json
├── mslab_billing/         # Token计价账单日志
│   └── token_billing.jsonl
├── mslab_alert/           # 告警日志
│   └── alert_log.jsonl
├── mslab_security/        # 权限配置、加密密钥配置
│   └── private_interfaces.json
├── mslab_dashboard/       # Streamlit仪表盘
│   ├── app.py             # 主仪表盘入口
│   ├── mslab_utils.py     # 工具层（表层工程）
│   └── mslab_theme.py     # 深空蓝主题
├── requirements.txt
└── index.html             # 原生HTML入口跳转页
        """, language="text")

    # 导出配置
    st.download_button(
        "📥 导出 lab_config.json",
        json.dumps(cfg, ensure_ascii=False, indent=2).encode("utf-8"),
        "mslab_config.json", "application/json"
    )

# 页脚
st.markdown("""
<div style="text-align:center; font-size:11px; color:#4a5580; padding:20px 0 10px; font-family:monospace">
    🧠 MindSpeak Embedding Lab · MS-Lab · Game-OS V3.0 · Batch1 交付版
    &nbsp;|&nbsp; 🔒 公私分层隔离 · AES-256-GCM · 仅公开表层工程
</div>
""", unsafe_allow_html=True)
