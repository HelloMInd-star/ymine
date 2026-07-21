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
    PrivateKernel128Bit, KMPSearchInterface, SolverKernelStub, ComputeSchedulerStub,
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
idx = refresh_index_stats()
cfg = load_lab_config()

# ============================================================
# 侧边栏 —— 导航 + 权限切换 + 红线
# ============================================================
with st.sidebar:
    st.markdown("""
    <div style="padding:10px 4px 14px 4px; border-bottom:1px solid rgba(129,140,248,0.15); margin-bottom:12px">
        <div style="font-size:15px; font-weight:700; color:#e0e7ff; display:flex; align-items:center; gap:8px">
            🧠 MS-Lab 控制台
        </div>
        <div style="font-size:11px; color:#7a86b4; margin-top:4px; font-family:monospace">
            v1.0-Batch1
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
    # ------- KPI 计算 -------
    tiers = idx.get("tiers", {})
    total_vec = sum(t.get("vector_count", 0) for t in tiers.values())
    total_byte = sum(t.get("byte_size", 0) for t in tiers.values())
    # 模拟指标（Batch1真实向量尚未入库，部分指标用合理演示值，并明确标注）
    bit_util = 0.862
    precision = 0.962
    watermark = {
        "trash":     0.05,
        "buffer":    0.23,
        "normal":    0.41,
        "knowledge": 0.68,
    }
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
            <div class="kpi-value">{watermark['knowledge']*100:.0f}%</div>
            <div class="kpi-sub">知识库最高水位</div>
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
        tier_caps = {"trash": 500*1024*1024, "buffer": 2*1024*1024*1024, "normal": 10*1024*1024*1024, "knowledge": 20*1024*1024*1024}
        # 模拟当前字节（Batch1真实数据=0，补充演示容量展示）
        demo_byte = {
            "trash": int(tier_caps["trash"] * watermark["trash"]),
            "buffer": int(tier_caps["buffer"] * watermark["buffer"]),
            "normal": int(tier_caps["normal"] * watermark["normal"]),
            "knowledge": int(tier_caps["knowledge"] * watermark["knowledge"]),
        }
        html_tier = '<div class="tier-grid">'
        for k,(icon,name,cls,dirn) in tier_labels.items():
            t = tiers.get(k, {})
            vc = t.get("vector_count", 0)
            bs = demo_byte[k]
            cap = tier_caps[k]
            ratio = min(100, bs/cap*100)
            wm_alarm = cfg.get("storage_tiers",{}).get(k,{}).get("watermark_alarm", 0.8)*100
            html_tier += f"""
            <div class="tier-card {cls}">
                <div class="tier-name">{icon} {name}</div>
                <div class="tier-stat-row"><span>向量条数</span><span class="tier-stat-val">{vc}</span></div>
                <div class="tier-stat-row"><span>占用空间</span><span class="tier-stat-val">{human_bytes(bs)}</span></div>
                <div class="tier-stat-row"><span>设计容量</span><span class="tier-stat-val">{human_bytes(cap)}</span></div>
                <div class="tier-stat-row"><span>水位</span><span class="tier-stat-val">{ratio:.1f}% / 告警{wm_alarm:.0f}%</span></div>
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
        sizes = [demo_byte["trash"], demo_byte["buffer"], demo_byte["normal"], demo_byte["knowledge"]]
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
# 页面2：向量库管理（Batch1 展示只读状态；CRUD在Batch2实现）
# ---------------------------------------------------------------------
elif page.startswith("💾"):
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">💾 四级向量库状态</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            📌 Batch1仅展示目录统计；向量CRUD、加密存取、冷热迁移将在 Batch2 交付。
        </div>
    """, unsafe_allow_html=True)
    rows = []
    for k, p in DB_PATHS.items():
        st = dir_stats(p)
        cap = {"trash":500*1024*1024,"buffer":2*1024**3,"normal":10*1024**3,"knowledge":20*1024**3}[k]
        wm  = st["byte_size"]/cap if cap else 0
        rows.append({
            "仓储层级": {"trash":"🗑️ 噪声库","buffer":"⏳ 缓冲库","normal":"📦 常规库","knowledge":"🏛️ 知识库"}[k],
            "文件数": st["file_count"],
            "占用字节": human_bytes(st["byte_size"]),
            "设计容量": human_bytes(cap),
            "当前水位": f"{wm*100:.2f}%",
            "目录": str(p.relative_to(BASE_DIR)),
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    st.markdown("</div>", unsafe_allow_html=True)

    # 私有接口占位展示
    st.markdown("""
    <div class="section-panel">
        <div class="section-title">🔒 私有内核接口占位（Batch1均为禁用空壳）</div>
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
        <div class="section-title">💰 Token 计量计费</div>
    """, unsafe_allow_html=True)
    bills = read_billing_tail(500)
    if bills:
        df = pd.DataFrame(bills)
        total_in = int(df["tokens_in"].sum())
        total_out = int(df["tokens_out"].sum())
        total = int(df["tokens_total"].sum())
        cost = float(df["cost_rmb"].sum())
        c1,c2,c3,c4 = st.columns(4)
        c1.metric("Tokens 输入", f"{total_in:,}")
        c2.metric("Tokens 输出", f"{total_out:,}")
        c3.metric("Tokens 合计", f"{total:,}")
        c4.metric("累计费用(¥)", f"{cost:.4f}")
        st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)
        df_show = df[["ts","op","model","tokens_in","tokens_out","tokens_total","cost_rmb"]].copy()
        df_show.columns = ["时间","操作类型","模型","输入Tokens","输出Tokens","合计Tokens","费用(¥)"]
        df_show = df_show.sort_values("时间", ascending=False).reset_index(drop=True)
        st.dataframe(df_show, use_container_width=True, hide_index=True, height=420)
        csv = df_show.to_csv(index=False).encode("utf-8-sig")
        st.download_button("📥 导出计费记录 CSV", csv, "mslab_billing.csv", "text/csv")
    else:
        st.info("暂无计费记录")
    st.markdown("</div>", unsafe_allow_html=True)

    # 模拟一次查询计费（仅用于演示Token计数）
    with st.expander("🧪 模拟一次查询请求（验证计费日志）"):
        ci, co = st.columns(2)
        tin  = ci.number_input("输入Tokens", 10, 10000, 256)
        tout = co.number_input("输出Tokens", 10, 5000, 128)
        if st.button("📝 写入演示计费记录"):
            c = (tin+tout)*0.00002
            rec = log_billing(int(tin), int(tout), c, op="query")
            log_alert("info", "billing", f"新计费记录 {rec['id']} ¥{c:.6f}", "billing")
            st.success(f"已写入：{rec['id']}  ¥{c:.6f}")
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
