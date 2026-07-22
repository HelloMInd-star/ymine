#!/bin/bash
# start_all_services.sh — 启动Game-OS全部服务
# 架构：8090统一服务所有静态页面（总控台+实验室+引擎文档），Streamlit独立端口
set -e
cd /workspace

LOG_DIR=/workspace/.logs
mkdir -p "$LOG_DIR"

echo "🧹 清理旧进程..."
pkill -f "http.server 8100" 2>/dev/null || true
pkill -f "http.server 8090" 2>/dev/null || true
pkill -f "streamlit.*8510" 2>/dev/null || true
pkill -f "streamlit.*8501" 2>/dev/null || true
sleep 2

# 确保MoodMind符号链接存在
ln -sfn moodmind_lab/public_static /workspace/moodmind

echo "🚀 启动服务..."

# 1. Y.Mine 总控台静态服务器 (8090) — 统一服务所有静态内容
#    包括：总控台首页(/)、MoodMind实验室(/moodmind/)、各引擎文档(/engines/*)、实验室(/labs/*)等
cd /workspace
python -m http.server 8090 --bind 0.0.0.0 \
    > "$LOG_DIR/ymine-static.log" 2>&1 &
echo "   ✓ Y.Mine总控台+静态页面 (PID:$!) :8090"

# 2. MoodMind Streamlit大盘 (8510)
cd /workspace/moodmind_lab/moodmind_dashboard
python -m streamlit run app.py \
    --server.port 8510 \
    --server.address 0.0.0.0 \
    --server.headless true \
    --browser.gatherUsageStats false \
    --server.enableCORS false \
    --server.enableXsrfProtection false \
    --theme.base dark \
    > "$LOG_DIR/moodmind-dash.log" 2>&1 &
echo "   ✓ MoodMind数据大盘     (PID:$!) :8510"

# 3. MS-Lab Streamlit大盘 (8501)
cd /workspace/ms-lab
python -m streamlit run mslab_dashboard/app.py \
    --server.port 8501 \
    --server.address 0.0.0.0 \
    --server.headless true \
    --browser.gatherUsageStats false \
    --server.enableCORS false \
    --server.enableXsrfProtection false \
    --theme.base dark \
    > "$LOG_DIR/mslab-dash.log" 2>&1 &
echo "   ✓ MS-Lab数据大盘       (PID:$!) :8501"

sleep 6
echo ""
echo "=== 验证服务状态 ==="
for port in 8090 8510 8501; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://localhost:$port/" 2>/dev/null || echo "FAIL")
    echo "   :$port → HTTP $code"
done
echo ""
echo "   /moodmind/ → $(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 http://localhost:8090/moodmind/)"
echo ""
echo "✅ 全部服务已启动！"
echo ""
echo "🏛️  Y.Mine 数理操作系统总控台:  http://localhost:8090"
echo "📈 MoodMind 金融向量实验室:    http://localhost:8090/moodmind/"
echo "📊 MoodMind 数据大盘:          http://localhost:8510"
echo "🧬 MS-Lab 通用心智实验室:      http://localhost:8090/ms-lab/"
echo "🧬 MS-Lab 数据大盘:            http://localhost:8501"
