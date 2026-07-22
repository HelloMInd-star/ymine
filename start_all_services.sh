#!/bin/bash
# start_all_services.sh — 启动Game-OS全部4个服务
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

echo "🚀 启动服务..."

# 1. MoodMind 静态首页 (8100)
cd /workspace/moodmind_lab
python -m http.server 8100 --bind 0.0.0.0 -d public_static \
    > "$LOG_DIR/moodmind-static.log" 2>&1 &
echo "   ✓ MoodMind静态首页 (PID:$!) :8100"

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
echo "   ✓ MoodMind数据大盘 (PID:$!) :8510"

# 3. Y.Mine 总控台静态服务器 (8090)
cd /workspace
python -m http.server 8090 --bind 0.0.0.0 \
    > "$LOG_DIR/ymine-static.log" 2>&1 &
echo "   ✓ Y.Mine总控台     (PID:$!) :8090"

# 4. MS-Lab Streamlit大盘 (8501)
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
echo "   ✓ MS-Lab数据大盘   (PID:$!) :8501"

sleep 6
echo ""
echo "=== 验证服务状态 ==="
for port in 8100 8510 8090 8501; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://localhost:$port/" 2>/dev/null || echo "FAIL")
    echo "   :$port → HTTP $code"
done
echo ""
echo "✅ 全部服务已启动！"
echo ""
echo "📍 MoodMind 金融向量实验室: http://localhost:8100"
echo "📊 MoodMind 数据大盘:       http://localhost:8510"
echo "🏛️  Y.Mine 总控台:          http://localhost:8090"
echo "🧬 MS-Lab 数据大盘:        http://localhost:8501"
