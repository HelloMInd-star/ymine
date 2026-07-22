#!/bin/bash
# start_all.sh — MoodMind-Lab Batch1 一键启动（根目录入口）
# 用法: bash start_all.sh
# 注意：静态页面统一通过Y.Mine总控台(8090)访问，避免跨端口导航问题
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/moodmind_lab"
cd "$PROJECT_ROOT" || exit 1

if [ -f config/global.env ]; then
    set -a; source config/global.env; set +a
fi
DASH_PORT=${MOODMIND_DASH_PORT:-8510}

LOG_DIR="$PROJECT_ROOT/.logs"
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

bash "$PROJECT_ROOT/scripts/stop_all.sh" >/dev/null 2>&1 || true

# 确保符号链接存在（总控台8090通过/moodmind/访问MoodMind实验室）
ln -sfn moodmind_lab/public_static "$SCRIPT_DIR/moodmind"

echo "🧠 MoodMind-Lab · Batch1 启动中..."
echo "   Streamlit大盘 :$DASH_PORT"

cd "$PROJECT_ROOT/moodmind_dashboard"
python -m streamlit run app.py \
    --server.port "$DASH_PORT" \
    --server.address 0.0.0.0 \
    --server.headless true \
    --browser.gatherUsageStats false \
    --server.enableCORS false \
    --server.enableXsrfProtection false \
    --theme.base dark \
    > "$LOG_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo $DASH_PID > "$PID_DIR/dashboard.pid"

sleep 4
echo ""
echo "✅ 启动完成"
echo "   📈 MoodMind实验室首页 : http://localhost:8090/moodmind/"
echo "   📊 金融数据大盘       : http://localhost:$DASH_PORT"
echo ""
echo "💡 提示：请先确保 Y.Mine 总控台(8090) 已启动："
echo "   cd /workspace && python -m http.server 8090 --bind 0.0.0.0"
echo "   一键启动全部服务：bash start_all_services.sh"
