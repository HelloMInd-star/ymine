"""批量导出限制页"""
import streamlit as st
from private_engine_stub import (
    MAX_EXPORT_BATCH_SIZE, enforce_export_limit,
    export_vectors, export_kmp_scores, export_risk_records,
)


def page_export_limit():
    st.markdown('<div class="section-title">📤 批量导出硬限制验证</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">EXPORT LIMIT · MAX_EXPORT_BATCH = 100（硬编码不可改）</div>', unsafe_allow_html=True)

    st.markdown('<div class="redline-banner">🔴 <b>红线</b>：批量导出硬上限 <b>MAX_EXPORT_BATCH=100</b>，UI无法修改，超过100条强制截断。禁止全库导出。</div>', unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(f'<div class="metric-card"><div class="metric-value" style="color:#e74c3c;">{MAX_EXPORT_BATCH_SIZE}</div><div class="metric-label">硬编码单次上限</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown('<div class="metric-card"><div class="metric-value">UI不可改</div><div class="metric-label">前端无修改入口</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown('<div class="metric-card"><div class="metric-value">禁止全库</div><div class="metric-label">全库导出禁用</div></div>', unsafe_allow_html=True)

    st.divider()
    st.markdown("#### 🧪 截断测试")
    req = st.number_input("请求导出条数", min_value=1, max_value=10000, value=250, step=10)
    allowed = enforce_export_limit(req)
    if req > MAX_EXPORT_BATCH_SIZE:
        st.warning(f"⚠️ 请求 {req} 条 > 上限 {MAX_EXPORT_BATCH_SIZE}，强制截断为 {allowed} 条")
    else:
        st.success(f"✅ 请求 {req} 条 ≤ 上限 {MAX_EXPORT_BATCH_SIZE}，允许导出 {allowed} 条")

    if st.button("📤 模拟导出向量"):
        mock = [{"id": i, "val": i * 0.01} for i in range(req)]
        r = export_vectors(mock, requester="operator")
        st.json({"exported_count": r["exported_count"], "requested_count": r["requested_count"], "truncated": r["truncated"], "limit": r["limit"]})

    st.divider()
    st.markdown("#### 📋 三类导出函数")
    st.code(
        "export_vectors()      # 向量导出 - 硬上限100\n"
        "export_kmp_scores()   # KMP分值导出 - 硬上限100\n"
        "export_risk_records() # 风控记录导出 - 硬上限100",
        language="python"
    )
