import streamlit as st
import requests
import plotly.graph_objects as go

st.set_page_config(page_title="风暴能量模拟实验室", layout="wide")

st.title("⚡ 风暴能量分配模拟器")
st.markdown("模拟雷暴系统中雷、闪电、大风的能量守恒与阈值熔断")

API_BASE = "http://localhost:8000"

st.subheader("🌪️ 输入参数")
col1, col2, col3 = st.columns(3)
wind_speed = col1.slider("风速 (m/s)", 0, 50, 25)
precipitation = col2.slider("降水量 (mm)", 0, 200, 80)
duration = col3.slider("持续时间 (h)", 1, 24, 8)

if st.button("⚡ 模拟风暴"):
    try:
        response = requests.get(f"{API_BASE}/api/storm/simulate", 
                                params={"wind_speed": wind_speed, "precipitation": precipitation, "duration": duration},
                                timeout=5)
        if response.status_code == 200:
            result = response.json()
            st.success("模拟完成！")
            col1, col2, col3 = st.columns(3)
            col1.metric("风暴强度", f"{result.get('intensity', 0):.2f}")
            col2.metric("评级", result.get('rating', 'N/A'))
            col3.metric("熔断状态", "🔴 触发" if result.get('fuse_status') else "🟢 安全")
            
            # 能量分配圆环图
            energy = result.get('energy_distribution', {})
            fig = go.Figure(data=[go.Pie(labels=list(energy.keys()), values=list(energy.values()), hole=0.4)])
            fig.update_layout(title="能量分配", height=400)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.error(f"API 调用失败：{response.status_code}")
    except Exception as e:
        st.error(f"请求失败：{e}")

st.info("💡 能量守恒：雷 + 闪电 + 大风 = 100%")