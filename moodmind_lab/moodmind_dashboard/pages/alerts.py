"""独立告警中心页"""
import streamlit as st
from datetime import datetime


ALERTS = [
    {"level": "success", "icon": "✅", "title": "[系统] Batch1骨架搭建完成，目录结构对齐交付文档", "time": "2026-07-21 07:10", "module": "MoodMind-Lab"},
    {"level": "info", "icon": "ℹ️", "title": "[信息] 金融向量总库四级目录挂载成功 (trash/buffer/normal/knowledge)", "time": "2026-07-21 07:08", "module": "存储模块"},
    {"level": "warn", "icon": "⚠️", "title": "[提醒] MS-Lab推送通道待对接（Batch2任务）", "time": "2026-07-21 07:05", "module": "API模块"},
    {"level": "info", "icon": "ℹ️", "title": "[信息] 7条全局开发红线已加载，39个私有接口 NotImplementedError", "time": "2026-07-21 07:02", "module": "安全模块"},
    {"level": "info", "icon": "ℹ️", "title": "[信息] RBAC三级权限加载完成（admin/architect/operator）", "time": "2026-07-21 07:00", "module": "安全模块"},
]


def page_alerts():
    st.markdown('<div class="section-title">🚨 独立告警中心</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">INDEPENDENT ALERT CENTER · 独立于 MS-Lab</div>', unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">5</div><div class="metric-label">总告警数</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#f39c12;">1</div><div class="metric-label">待处理提醒</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">0</div><div class="metric-label">熔断告警</div></div>', unsafe_allow_html=True)

    st.divider()
    st.markdown("#### 📋 告警列表")
    filter_level = st.selectbox("过滤级别", ["全部", "info", "success", "warn"], index=0)
    css_map = {"info": "alert-info", "success": "alert-ok", "warn": "alert-warn"}
    for a in ALERTS:
        if filter_level != "全部" and a["level"] != filter_level:
            continue
        st.markdown(
            f'<div class="alert-item {css_map[a["level"]]}">'
            f'<b>{a["icon"]} {a["title"]}</b><br>'
            f'<span style="color:#888;font-size:11px;">{a["time"]} · {a["module"]}</span>'
            f'</div>',
            unsafe_allow_html=True
        )
