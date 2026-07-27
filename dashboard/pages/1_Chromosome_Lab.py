import streamlit as st
import requests
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="染色体诊断实验台", layout="wide")

st.title("🧬 染色体锚定诊断实验台")
st.markdown("基于 FastAPI 真实算法引擎，实时检测多轮对话主题漂移")

API_BASE = "http://localhost:8000"

# 默认数据
default_data = [0.52, 0.48, 0.71, 0.55, 0.49, 0.63, 0.58, 0.72, 0.45, 0.61]

st.subheader("📊 输入数据")
data_input = st.text_area("请输入染色体健康数据（逗号分隔，0~1之间）", value=",".join(map(str, default_data)))

if st.button("🔬 执行诊断"):
    try:
        data_list = [float(x.strip()) for x in data_input.split(",") if x.strip()]
        params = ",".join(map(str, data_list))
        response = requests.get(f"{API_BASE}/api/chromosome/diagnose", params={"data": params}, timeout=5)
        if response.status_code == 200:
            result = response.json()
            st.success("诊断完成！")
            col1, col2, col3 = st.columns(3)
            col1.metric("平均健康度", f"{result.get('avg_health', 0):.3f}")
            col2.metric("标准差", f"{result.get('std_dev', 0):.3f}")
            col3.metric("异常片段数", result.get('abnormal_segments', 0))
            
            # 显示分布图
            df = pd.DataFrame({"Index": range(len(data_list)), "Value": data_list})
            fig = px.line(df, x="Index", y="Value", title="染色体健康分布", 
                          labels={"Value": "健康值", "Index": "位置"})
            fig.add_hline(y=0.48, line_dash="dash", line_color="orange", annotation_text="保本线")
            fig.add_hline(y=0.68, line_dash="dash", line_color="red", annotation_text="熔断线")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.error(f"API 调用失败：{response.status_code}")
    except Exception as e:
        st.error(f"请求失败：{e}")

st.info("💡 数据范围 0~1，低于 0.48 为异常，高于 0.68 触发熔断")