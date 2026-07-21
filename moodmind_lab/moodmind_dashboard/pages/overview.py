"""总览面板"""
import streamlit as st
import pandas as pd
from private_engine_stub import get_batch1_mock_data


def page_overview():
    st.markdown('<div class="section-title">📊 MoodMind 金融向量实验室 · 总览面板</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">FINANCIAL VECTOR OVERVIEW · BATCH1 骨架版</div>', unsafe_allow_html=True)
    d = get_batch1_mock_data()

    st.markdown('<div class="redline-banner">🔴 <b>Batch1状态</b>：11维公式/IPD/光照权重/KMP底层/128bit高精度<b>均不实现</b>，仅页面占位；39个私有接口全部抛 NotImplementedError。</div>', unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{d["total_vectors"]:,}</div><div class="metric-label">金融总库总向量数</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{d["daily_vector_count"]:,}</div><div class="metric-label">今日向量日产量</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown(f'<div class="metric-card"><div class="metric-value">{d["used_gb"]} / {d["total_capacity_gb"]} GB</div><div class="metric-label">总库容量（水位 {d["watermark_pct"]}%）</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#2ecc71;">{d["sphere_risk_magnitude"]}</div><div class="metric-label">球面风险模长（占位数值）</div></div>', unsafe_allow_html=True)

    st.divider()

    colA, colB = st.columns([1, 1])
    with colA:
        st.markdown("#### 💾 四级仓库占用（模拟）")
        df = pd.DataFrame([
            {"仓库": "🗑️ trash 噪声库", "占比": 15, "容量(GB)": 9.3, "颜色": "#7f8c8d"},
            {"仓库": "⏳ buffer 缓冲库", "占比": 25, "容量(GB)": 15.6, "颜色": "#f39c12"},
            {"仓库": "📦 normal 常规库", "占比": 40, "容量(GB)": 24.9, "颜色": "#3498db"},
            {"仓库": "🧠 knowledge 知识库", "占比": 20, "容量(GB)": 12.6, "颜色": "#9b59b6"},
        ])
        st.dataframe(df, use_container_width=True, hide_index=True)
        for _, row in df.iterrows():
            st.markdown(
                f'<div class="storage-bar"><div class="storage-fill" style="width:{row["占比"]}%;background:{row["颜色"]};">{row["仓库"]} {row["占比"]}%</div></div>',
                unsafe_allow_html=True
            )

    with colB:
        st.markdown("#### 🔗 KMP 匹配热度（占位）")
        st.markdown('<div class="placeholder-card"><div class="ph-icon">🔗</div><b>KMP 匹配热度面板</b><p>Batch2 上线：相似度分值热力图、高同源范式沉淀列表、LPS匹配详情</p><p style="font-size:11px;color:#666;margin-top:8px;">仅预留 <code>receive_final_score(score:float)</code> 分值接收入口</p></div>', unsafe_allow_html=True)

        st.markdown("#### 💡 四维光照结果（占位）")
        st.markdown('<div class="placeholder-card"><div class="ph-icon">💡</div><b>四维光照展示位</b><p>Batch3 上线：光照趋势/周期相位/球面阈值时序图</p></div>', unsafe_allow_html=True)
