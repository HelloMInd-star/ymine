#!/bin/bash
# ============================================================
# start_all.sh · MoodMind-Lab Batch1 一键启停脚本
# 静态首页 8100 | Streamlit大盘 8510
# 严格遵循示例：
#   python -m http.server 8100 -d public_static &
#   cd moodmind_dashboard && streamlit run app.py --server.port 8510 --theme.base dark
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

STATIC_PORT=8100
DASH_PORT=8510
PID_DIR=".pids"
LOG_DIR=".logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

logo() {
    echo -e "${PURPLE}"
    echo "🧠 ======================================== 🧠"
    echo "  MoodMind-Lab · 金融向量实验室 · Batch1"
    echo "  🔴红线强制：128bit接口NotImplementedError"
    echo "  📤导出硬限：单次100条"
    echo "🧠 ======================================== 🧠"
    echo -e "${NC}"
}

stop_services() {
    echo -e "${YELLOW}[停止] 停止 MoodMind-Lab 服务...${NC}"
    # 按PID文件停
    for svc in static dashboard; do
        PID_FILE="$PID_DIR/$svc.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
                sleep 1
                kill -9 "$PID" 2>/dev/null || true
                echo -e "${GREEN}  ✓ $svc 已停止 (PID: $PID)${NC}"
            fi
            rm -f "$PID_FILE"
        fi
    done
    # 兜底端口清理
    pkill -f "http.server.*$STATIC_PORT" 2>/dev/null || true
    pkill -f "streamlit run.*$DASH_PORT" 2>/dev/null || true
    echo -e "${GREEN}[OK] 所有服务已停止${NC}"
}

start_services() {
    logo
    # 检查依赖
    if ! python3 -c "import streamlit" 2>/dev/null; then
        echo -e "${YELLOW}[依赖] 安装 streamlit/plotly/pandas/numpy...${NC}"
        pip install -q streamlit plotly pandas numpy
    fi

    stop_services 2>/dev/null || true
    sleep 1

    echo -e "${YELLOW}[启动] 静态网页（深空风格首页）→ 端口 $STATIC_PORT${NC}"
    python3 -m http.server $STATIC_PORT -d public_static > "$LOG_DIR/static.log" 2>&1 &
    echo $! > "$PID_DIR/static.pid"
    sleep 1
    echo -e "${GREEN}  ✓ http://localhost:$STATIC_PORT${NC}"

    echo -e "${YELLOW}[启动] Streamlit 金融数据大盘 → 端口 $DASH_PORT${NC}"
    cd moodmind_dashboard
    streamlit run app.py \
        --server.port $DASH_PORT \
        --server.address 0.0.0.0 \
        --server.headless true \
        --browser.gatherUsageStats false \
        --theme.base dark \
        > "../$LOG_DIR/dashboard.log" 2>&1 &
    echo $! > "../$PID_DIR/dashboard.pid"
    cd "$SCRIPT_DIR"
    sleep 3
    echo -e "${GREEN}  ✓ http://localhost:$DASH_PORT${NC}"

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   MoodMind-Lab Batch1 启动完成           ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  🏠 静态首页: http://localhost:$STATIC_PORT   ${NC}"
    echo -e "${GREEN}║  📊 数据大盘: http://localhost:$DASH_PORT   ${NC}"
    echo -e "${GREEN}║  🏛️ Y.Mine:   http://localhost:8090        ${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  🔴 红线验证页面: 大盘侧栏→🔴红线验证   ${NC}"
    echo -e "${GREEN}║  📤 导出限制: 单次硬上限100条            ${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}用法: $0 {start|stop|restart|status|logs}${NC}"
}

show_status() {
    logo
    echo "服务状态："
    echo "----------------------------------------------------"
    for svc in static dashboard; do
        PID_FILE="$PID_DIR/$svc.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "  ${GREEN}●${NC} $svc: 运行中 (PID: $PID)"
            else
                echo -e "  ${RED}●${NC} $svc: 已停止"
            fi
        else
            echo -e "  ${YELLOW}○${NC} $svc: 未启动"
        fi
    done
    echo "----------------------------------------------------"
    echo -e "  静态首页: ${GREEN}http://localhost:$STATIC_PORT${NC}"
    echo -e "  数据大盘: ${GREEN}http://localhost:$DASH_PORT${NC}"
}

case "${1:-start}" in
    start)   start_services ;;
    stop)    logo; stop_services ;;
    restart) logo; stop_services; sleep 2; start_services ;;
    status)  show_status ;;
    logs)
        case "${2:-dashboard}" in
            static) tail -f "$LOG_DIR/static.log" ;;
            *)       tail -f "$LOG_DIR/dashboard.log" ;;
        esac ;;
    *) echo "用法: $0 {start|stop|restart|status|logs [static|dashboard]}"; exit 1 ;;
esac
