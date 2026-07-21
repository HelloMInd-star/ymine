"""系统配置页"""
import streamlit as st
import os


def page_config():
    st.markdown('<div class="section-title">⚙️ 系统配置</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-desc">SYSTEM CONFIGURATION · 全局环境变量</div>', unsafe_allow_html=True)

    envs = [
        ("MOODMIND_STATIC_PORT", os.environ.get("MOODMIND_STATIC_PORT", "8100"), "静态网页端口"),
        ("MOODMIND_DASH_PORT", os.environ.get("MOODMIND_DASH_PORT", "8510"), "金融仪表盘端口"),
        ("MSLAB_API_ADDR", os.environ.get("MSLAB_API_ADDR", "http://127.0.0.1:8090"), "对接 MS-Lab 推送地址"),
        ("MAX_EXPORT_BATCH", os.environ.get("MAX_EXPORT_BATCH", "100"), "单次最大导出条数硬性限制"),
        ("MOODMIND_ENV", os.environ.get("MOODMIND_ENV", "batch1"), "环境标识"),
    ]
    import pandas as pd
    df = pd.DataFrame([{"环境变量": k, "当前值": v, "说明": d} for k, v, d in envs])
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.divider()
    st.markdown("#### 🔐 RBAC 三级权限")
    st.markdown(
        '<div>'
        '<span class="role-badge role-admin">admin · 管理员</span>全部功能/配置/用户/审计/私有维度查看<br><br>'
        '<span class="role-badge role-architect">architect · 架构审核</span>向量/光照/KMP/风控审核，策略审批<br><br>'
        '<span class="role-badge role-operator">operator · 操作员</span>存储/算力/告警/导出监控，服务重启'
        '</div>',
        unsafe_allow_html=True
    )

    st.divider()
    st.markdown("#### 📁 目录结构")
    tree = """moodmind_lab/
├── scripts/          # 启动/停止/验收脚本
├── public_static/    # 8100静态深空首页
│   └── assets/deepspace.css
├── moodmind_dashboard/  # 8510 Streamlit大盘
│   ├── app.py
│   ├── theme.py
│   ├── private_engine_stub.py
│   └── pages/       # 各子面板
├── public_api/       # 对外推送MS-Lab接口层（Batch2实现）
├── market_data_gate/ # 行情数据接收外壳（Batch2实现）
├── moodmind_storage_main/
│   ├── trash/ buffer/ normal/ knowledge/  # 四级子库
├── billing_log/      # Token计费日志
├── alert_log/        # 独立告警日志
├── security/         # rbac/aes/private_placeholder
├── config/global.env
├── docs/             # API/SECURITY/DIRECTORY
└── requirements.txt"""
    st.code(tree, language="text")

    st.divider()
    st.markdown("#### 🔗 快速跳转")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown('<a href="http://localhost:8100" target="_blank" style="text-decoration:none;"><div class="metric-card" style="text-align:center;cursor:pointer;"><div class="metric-value">🧠</div><div class="metric-label">实验室首页 8100</div></div></a>', unsafe_allow_html=True)
    with c2:
        st.markdown('<a href="http://localhost:8090" target="_blank" style="text-decoration:none;"><div class="metric-card" style="text-align:center;cursor:pointer;"><div class="metric-value">🏛️</div><div class="metric-label">Y.Mine 总控台 8090</div></div></a>', unsafe_allow_html=True)
    with c3:
        st.markdown('<a href="http://localhost:8501" target="_blank" style="text-decoration:none;"><div class="metric-card" style="text-align:center;cursor:pointer;"><div class="metric-value">🧬</div><div class="metric-label">MS-Lab 8501</div></div></a>', unsafe_allow_html=True)
