import streamlit as st
import requests
import pandas as pd
from datetime import datetime

st.set_page_config(page_title="Game-OS 实时仪表盘", layout="wide")

st.title("🔺 Game-OS 系统实时状态")
st.markdown(f"**V2.5 FullStack-Verified** · 更新时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# 后端 API 地址（确保 FastAPI 已启动）
API_BASE = "http://localhost:8000"

# 尝试获取后端状态
try:
    health = requests.get(f"{API_BASE}/health", timeout=2)
    backend_status = "✅ 已连接" if health.status_code == 200 else "⚠️ 异常"
except:
    backend_status = "❌ 未连接"

# 尝试获取阈值数据
try:
    thresholds = requests.get(f"{API_BASE}/thresholds", timeout=2)
    if thresholds.status_code == 200:
        data = thresholds.json()
        breakeven = data.get("BREAKEVEN", 0.48)
        steady = data.get("STEADY", 0.50)
        fuse = data.get("FUSE", 0.68)
    else:
        breakeven, steady, fuse = 0.48, 0.50, 0.68
except:
    breakeven, steady, fuse = 0.48, 0.50, 0.68

# 顶部指标卡
col1, col2, col3, col4 = st.columns(4)
col1.metric("后端状态", backend_status)
col2.metric("保本线", f"{breakeven:.2f}")
col3.metric("稳态线", f"{steady:.2f}")
col4.metric("熔断线", f"{fuse:.2f}")

# 显示阈值仪表盘
st.subheader("📊 全局阈值基准")
st.progress(0.48, text="0.48 保本底线")
st.progress(0.50, text="0.50 稳态中轴线")
st.progress(0.68, text="0.68 熔断警戒线")

# 显示系统信息（从 /version 获取）
try:
    ver = requests.get(f"{API_BASE}/version", timeout=2)
    if ver.status_code == 200:
        info = ver.json()
        st.subheader("📌 系统信息")
        st.json(info)
except:
    st.warning("无法获取版本信息，请检查后端是否运行")

# 底部说明
st.info("💡 仪表盘数据来自 FastAPI 后端实时 API，确保 `uvicorn main:app --reload` 已在 8000 端口运行。")