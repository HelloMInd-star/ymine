#!/bin/bash
# start_all.sh Batch1
cd moodmind_lab
# 静态网页 8100
python -m http.server 8100 -d public_static &
# Streamlit大盘 8510
cd moodmind_dashboard
streamlit run app.py --server.port 8510 --theme.base dark
