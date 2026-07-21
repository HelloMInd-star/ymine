#!/usr/bin/env bash
set -e
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
DASHBOARD_DIR="$PROJECT_ROOT/public_dashboard"
PORT=8502
STATIC_PORT=8091

echo "========================================="
echo " 💜 MoodMind-Lab · 金融向量实验室"
echo "========================================="

cd "$PROJECT_ROOT"

echo "[1/4] 检查Python环境..."
if ! command -v python3 &>/dev/null; then
    echo "❌ 未找到python3，请先安装Python 3.9+"
    exit 1
fi

echo "[2/4] 检查依赖..."
python3 -c "import streamlit, plotly, numpy, pandas" 2>/dev/null || {
    echo "📦 安装依赖..."
    python3 -m pip install -q -r requirements.txt
}

echo "[3/4] 启动静态HTTP服务器（端口 ${STATIC_PORT}）..."
pkill -f "http.server.*${STATIC_PORT}" 2>/dev/null || true
(cd "$PROJECT_ROOT/.." && python3 -m http.server $STATIC_PORT --bind 0.0.0.0 > "$PROJECT_ROOT/.static_server.log" 2>&1) &
sleep 1
echo "    ✅ 静态入口页: http://localhost:${STATIC_PORT}/moodmind-lab/index.html"

echo "[4/4] 启动Streamlit仪表盘（端口 ${PORT}）..."
pkill -f "streamlit run.*${PORT}" 2>/dev/null || true
cd "$DASHBOARD_DIR"
echo "    ✅ 数据大盘:   http://localhost:${PORT}"
echo ""
echo "========================================="
echo " 🎉 MoodMind-Lab 启动完成！"
echo "========================================="
echo ""
exec python3 -m streamlit run app.py --server.port "$PORT" --server.address 0.0.0.0 --theme.base dark --browser.gatherUsageStats false
