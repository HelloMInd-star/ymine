#!/bin/bash
# scripts/start_all.sh — Batch1 一键启动
# 用法: bash scripts/start_all.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit 1

if [ -f config/global.env ]; then
    set -a; source config/global.env; set +a
fi
STATIC_PORT=${MOODMIND_STATIC_PORT:-8100}
DASH_PORT=${MOODMIND_DASH_PORT:-8510}

LOG_DIR="$PROJECT_ROOT/.logs"
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

bash "$SCRIPT_DIR/stop_all.sh" >/dev/null 2>&1 || true

echo "🧠 MoodMind-Lab · Batch1 启动中..."
echo "   静态首页  :$STATIC_PORT"
echo "   Streamlit :$DASH_PORT"

python -m http.server "$STATIC_PORT" -d public_static \
    > "$LOG_DIR/static.log" 2>&1 &
STATIC_PID=$!
echo $STATIC_PID > "$PID_DIR/static.pid"

cd "$PROJECT_ROOT/moodmind_dashboard"
streamlit run app.py \
    --server.port "$DASH_PORT" \
    --server.address 0.0.0.0 \
    --server.headless true \
    --browser.gatherUsageStats false \
    --theme.base dark \
    > "$LOG_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo $DASH_PID > "$PID_DIR/dashboard.pid"

sleep 4
echo ""
echo "✅ 启动完成"
echo "   🧠 首页 : http://localhost:$STATIC_PORT"
echo "   📊 大盘 : http://localhost:$DASH_PORT"
echo ""
echo "💡 提示：如需同时启动 Y.Mine 总控台(8090) 和 MS-Lab(8501)，请分别执行："
echo "   cd /workspace && python -m http.server 8090"
echo "   cd /workspace/ms-lab/mslab_dashboard && streamlit run app.py --server.port 8501"
