"""KMP 匹配页"""
import streamlit as st


def page_kmp():
    st.markdown('<div class="section-title">🔗 KMP 改良周期匹配面板</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">KMP PATTERN MATCHING · 仅预留分值接收字段</div>', unsafe_allow_html=True)

    st.markdown('<div class="redline-banner">🔴 <b>红线</b>：KMP 底层 LPS 最长前缀后缀数组源码、模式匹配搜索、周期相似度计算<b>完全不实现</b>，仅预留 <code>receive_final_score(score:float)</code> 分值字段。</div>', unsafe_allow_html=True)

    st.markdown('<div class="placeholder-card"><div class="ph-icon">🔗</div><b>KMP 匹配热度面板（空白占位）</b><p>Batch2 上线：相似度分值热力图、高同源范式沉淀列表、LPS匹配详情</p></div>', unsafe_allow_html=True)

    st.divider()
    st.markdown("#### 📥 分值接收入口（仅测试接收）")
    score = st.slider("模拟私有内核传入相似度分值（0~1）", 0.0, 1.0, 0.58, 0.01)
    if st.button("📥 调用 receive_final_score() 接收分值"):
        from private_engine_stub import KMPEngineStub
        result = KMPEngineStub.receive_final_score(score)
        st.success(f"✅ 分值已接收: similarity={result['similarity']} → tier={result['tier']} → route={result['route_target']}")
        st.json(result)

    st.info("📌 工程层不允许编写 build_lps_array / kmp_search / pattern_similarity 底层源码，仅接收分值。")
