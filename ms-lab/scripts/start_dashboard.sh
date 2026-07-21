#!/usr/bin/env bash
# ============================================================
# MindSpeak Embedding Lab (MS-Lab) 一键启动脚本
# 启动 Streamlit 可视化仪表盘
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/mslab_dashboard"

cd "$PROJECT_ROOT"

echo "============================================================"
echo " 🧠 MindSpeak Embedding Lab · MS-Lab v1.0-Batch3"
echo "============================================================"
echo " 项目根目录：$PROJECT_ROOT"
echo " 仪表盘目录：$DASHBOARD_DIR"
echo "------------------------------------------------------------"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 python3，请先安装 Python 3.9+"
    exit 1
fi

PY=python3
$PY --version

# 检查依赖
echo ""
echo "[1/3] 检查 Python 依赖..."
MISSING=""
$PY -c "import streamlit" 2>/dev/null || MISSING="$MISSING streamlit"
$PY -c "import plotly"   2>/dev/null || MISSING="$MISSING plotly"
$PY -c "import pandas"   2>/dev/null || MISSING="$MISSING pandas"
$PY -c "import cryptography" 2>/dev/null || MISSING="$MISSING cryptography"
if [ -n "$MISSING" ]; then
    echo "⚠️  缺少依赖：$MISSING"
    echo "    正在自动安装（pip install -r requirements.txt）..."
    $PY -m pip install -r "$PROJECT_ROOT/requirements.txt"
else
    echo "✅ 所有依赖已就绪"
fi

# 端口检查
PORT="${MSLAB_PORT:-8501}"
echo ""
echo "[2/3] 端口检查（$PORT）..."
USED=$($PY - <<PY
import socket,sys
s=socket.socket()
try:
    s.connect(("127.0.0.1",$PORT));print("yes")
except Exception:
    print("no")
finally:
    s.close()
PY
)
if [ "$USED" = "yes" ]; then
    echo "⚠️  端口 $PORT 已被占用，尝试自动停止旧 Streamlit 进程..."
    pkill -f "streamlit run.*app.py" 2>/dev/null || true
    sleep 2
fi

# 启动静态页HTTP服务（8090端口，提供入口页index.html）
STATIC_PORT="${MSLAB_STATIC_PORT:-8090}"
echo ""
echo "[3/3] 启动 HTTP 静态入口服务 (端口 $STATIC_PORT) 和 Streamlit 仪表盘 (端口 $PORT)..."
echo ""
echo "🌐 入口页  → http://localhost:$STATIC_PORT/ms-lab/index.html"
echo "📊 仪表盘 → http://localhost:$PORT"
echo "🔙 总控台 → http://localhost:$STATIC_PORT/index.html"
echo "------------------------------------------------------------"
echo ""

# 后台启动静态服务
( cd "$PROJECT_ROOT/.." && $PY -m http.server $STATIC_PORT --bind 127.0.0.1 > "$PROJECT_ROOT/.static_server.log" 2>&1 ) &
STATIC_PID=$!
echo "[静态服务 PID=$STATIC_PID]"

# 前台启动 Streamlit
cleanup() {
    echo ""
    echo "🛑 停止服务..."
    kill $STATIC_PID 2>/dev/null || true
}
trap cleanup EXIT

cd "$DASHBOARD_DIR"
exec $PY -m streamlit run app.py \
    --server.port "$PORT" \
    --server.address 0.0.0.0 \
    --browser.gatherUsageStats false \
    --theme.base dark
