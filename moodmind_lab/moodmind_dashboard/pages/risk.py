"""球面风险监控页"""
import streamlit as st
from private_engine_stub import get_batch1_mock_data


def page_risk():
    st.markdown('<div class="section-title">⚠️ 球面风险监控面板</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">SPHERE RISK MONITOR · 仅展示占位数值</div>', unsafe_allow_html=True)
    d = get_batch1_mock_data()
    mag = d["sphere_risk_magnitude"]

    st.markdown('<div class="redline-banner">🔴 <b>红线</b>：球面风险模长求解、0.48/0.50/0.68三阈值判定、熔断触发<b>全部不实现</b>，仅展示占位数值。</div>', unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        color = "#2ecc71" if mag < 0.48 else "#f39c12" if mag < 0.68 else "#e74c3c"
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:{color};">{mag}</div><div class="metric-label">风险模长 |M|（占位）</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">0.48</div><div class="metric-label">保本线</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#f39c12;">0.50</div><div class="metric-label">稳态中轴线</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown('<div class="metric-card"><div class="metric-value" style="color:#e74c3c;">0.68</div><div class="metric-label">熔断线</div></div>', unsafe_allow_html=True)

    st.divider()
    st.markdown("#### 风险态占位展示")
    if mag < 0.48:
        st.success(f"🟢 当前风险值 {mag} 低于保本线 0.48，处于安全稳态区间 —— Batch1 模拟状态")
    elif mag < 0.50:
        st.info(f"🔵 当前风险值 {mag} 处于保本线~中轴线 [0.48, 0.50) 缓冲区间 —— Batch1 模拟状态")
    elif mag < 0.68:
        st.warning(f"🟡 当前风险值 {mag} 处于预警区间 [0.50, 0.68) —— Batch1 模拟状态")
    else:
        st.error(f"🔴 当前风险值 {mag} 触发熔断 ≥0.68 —— Batch1 模拟状态")

    st.info("📌 本面板所有阈值判定仅做前端颜色展示，真实底层判定逻辑在 private_moodmind_engine 闭源实现。")
