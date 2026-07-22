"""
MoodMind-Lab · 金融向量实验室 Streamlit 主入口 (Batch1)
端口：8510 | 主题：dark | 公私隔离 · 7条红线强制
"""
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(PROJECT_ROOT))

ENV_FILE = PROJECT_ROOT / "config" / "global.env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

import streamlit as st
from theme import DEEPSPACE_CSS, PAGE_CONFIG

st.set_page_config(**PAGE_CONFIG)
st.markdown(DEEPSPACE_CSS, unsafe_allow_html=True)

from pages import PAGES

with st.sidebar:
    st.markdown("## 🧠 MoodMind-Lab")
    st.markdown("**金融向量实验室 · Batch1**")
    st.markdown("---")
    page_labels = [f"{icon} {name}" for icon, name, _ in PAGES]
    selected = st.radio("📋 导航", page_labels, index=0, label_visibility="collapsed")
    st.markdown("---")
    st.markdown("### 🔗 快速跳转")
    st.markdown('[🏛️ 返回 Y.Mine 总控台](http://localhost:8090)')
    st.markdown('[📈 MoodMind 实验室首页](http://localhost:8090/moodmind/)')
    st.markdown('[🧬 前往 MS-Lab](http://localhost:8501)')
    st.markdown("---")
    st.markdown("🔴 **红线状态：已启用**")
    st.markdown("• 39个私有接口 → NotImplementedError")
    st.markdown("• MAX_EXPORT_BATCH=100 硬编码")
    st.markdown("• private_moodmind_engine 不入仓库")

for icon, name, func in PAGES:
    if selected == f"{icon} {name}":
        func()
        break
