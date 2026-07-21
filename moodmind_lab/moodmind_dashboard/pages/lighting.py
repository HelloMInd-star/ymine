"""四维光照页"""
import streamlit as st
from private_engine_stub import get_batch1_mock_data


def page_lighting():
    st.markdown('<div class="section-title">💡 四维光照结果展示</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">4D LIGHTING ENVIRONMENT · 仅预留展示位</div>', unsafe_allow_html=True)

    st.markdown('<div class="redline-banner">🔴 <b>红线</b>：L1成交量流动性 / L2题材情绪 / L3产业政策 / L4产业链景气 四维权重算法<b>完全不写</b>，仅占位展示。</div>', unsafe_allow_html=True)

    st.markdown('<div class="placeholder-card"><div class="ph-icon">💡</div><b>四维光照结果展示位</b><p>Batch1 仅预留展示面板，权重数值为模拟占位。</p><p>Batch3 将上线：四维光照趋势图、周期相位走势、球面风险阈值时序图。</p></div>', unsafe_allow_html=True)

    d = get_batch1_mock_data()
    c1, c2, c3, c4 = st.columns(4)
    cols = [c1, c2, c3, c4]
    labels = [("L1", "成交量流动性", "#f1c40f"), ("L2", "题材情绪", "#e91e63"), ("L3", "产业政策", "#00bcd4"), ("L4", "产业链景气", "#8bc34a")]
    for col, (k, name, color), val in zip(cols, labels, [d["lighting"]["L1"], d["lighting"]["L2"], d["lighting"]["L3"], d["lighting"]["L4"]]):
        with col:
            st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:{color};">{val}%</div><div class="metric-label">{k} {name}</div></div>', unsafe_allow_html=True)
            st.progress(val / 100.0)

    st.info("📌 动态行业加权融合算法为私有内核，工程层只通过 receive_final_lighting() 接收最终结果。")
