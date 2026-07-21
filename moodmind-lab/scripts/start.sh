#!/bin/bash
# ============================================================
# MoodMind-Lab 一键启停脚本 · Batch1 骨架版
# 静态首页: 8100 | Streamlit大盘: 8510
# ============================================================

set -e
LAB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$LAB_ROOT/.pids"
LOG_DIR="$LAB_ROOT/.logs"
STATIC_PORT=8100
STREAMLIT_PORT=8510

mkdir -p "$PID_DIR" "$LOG_DIR"

# 颜色
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

logo() {
    echo -e "${PURPLE}"
    echo "🧠 ============================================ 🧠"
    echo "    MoodMind-Lab · 金融向量实验室 · Batch1"
    echo "🧠 ============================================ 🧠"
    echo -e "${NC}"
}

check_python() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}[ERROR] python3 未安装${NC}"
        exit 1
    fi
}

install_deps() {
    echo -e "${YELLOW}[INFO] 检查 Python 依赖...${NC}"
    pip install -q streamlit plotly pandas numpy 2>/dev/null
    echo -e "${GREEN}[OK] 依赖就绪${NC}"
}

start_static() {
    echo -e "${YELLOW}[启动] 深空风格静态首页 (端口 $STATIC_PORT)...${NC}"
    cd "$LAB_ROOT"
    python3 -m http.server $STATIC_PORT --bind 0.0.0.0 > "$LOG_DIR/static.log" 2>&1 &
    echo $! > "$PID_DIR/static.pid"
    sleep 1
    echo -e "${GREEN}[OK] 静态首页已启动 → http://localhost:$STATIC_PORT${NC}"
}

start_streamlit() {
    echo -e "${YELLOW}[启动] Streamlit 金融数据大盘 (端口 $STREAMLIT_PORT)...${NC}"
    cd "$LAB_ROOT/public_dashboard"
    streamlit run app.py \
        --server.port $STREAMLIT_PORT \
        --server.address 0.0.0.0 \
        --server.headless true \
        --browser.gatherUsageStats false \
        --theme.base dark \
        > "$LOG_DIR/streamlit.log" 2>&1 &
    echo $! > "$PID_DIR/streamlit.pid"
    sleep 3
    echo -e "${GREEN}[OK] 数据大盘已启动 → http://localhost:$STREAMLIT_PORT${NC}"
}

stop_services() {
    echo -e "${YELLOW}[停止] 正在停止 MoodMind-Lab 服务...${NC}"
    for svc in static streamlit; do
        PID_FILE="$PID_DIR/$svc.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
                sleep 1
                kill -9 "$PID" 2>/dev/null || true
                echo -e "${GREEN}[OK] $svc 已停止 (PID: $PID)${NC}"
            fi
            rm -f "$PID_FILE"
        fi
    done
    pkill -f "http.server $STATIC_PORT" 2>/dev/null || true
    pkill -f "streamlit run.*$STREAMLIT_PORT" 2>/dev/null || true
    echo -e "${GREEN}[DONE] 所有服务已停止${NC}"
}

status_services() {
    echo -e "${PURPLE}[状态] MoodMind-Lab 服务运行状态${NC}"
    echo "----------------------------------------------------"
    for svc in static streamlit; do
        PID_FILE="$PID_DIR/$svc.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "  ${GREEN}●${NC} $svc: 运行中 (PID: $PID)"
            else
                echo -e "  ${RED}●${NC} $svc: 已停止 (PID文件存在但进程不存在)"
            fi
        else
            echo -e "  ${YELLOW}○${NC} $svc: 未启动"
        fi
    done
    echo "----------------------------------------------------"
    echo -e "  静态首页:  ${GREEN}http://localhost:$STATIC_PORT${NC}"
    echo -e "  数据大盘:  ${GREEN}http://localhost:$STREAMLIT_PORT${NC}"
    echo -e "  Y.Mine总控: ${GREEN}http://localhost:8090${NC}"
    echo -e "  MS-Lab:    ${GREEN}http://localhost:8501${NC}"
}

case "${1:-start}" in
    start)
        logo
        check_python
        install_deps
        stop_services 2>/dev/null || true
        start_static
        start_streamlit
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   MoodMind-Lab Batch1 启动完成!              ║${NC}"
        echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
        echo -e "${GREEN}║  📊 数据大盘: http://localhost:$STREAMLIT_PORT      ${NC}"
        echo -e "${GREEN}║  🏠 静态首页: http://localhost:$STATIC_PORT      ${NC}"
        echo -e "${GREEN}║  🏛️ Y.Mine:   http://localhost:8090        ${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}[提示] 使用 '$0 stop' 停止服务 | '$0 status' 查看状态${NC}"
        ;;
    stop)
        logo
        stop_services
        ;;
    restart)
        logo
        stop_services
        sleep 2
        check_python
        install_deps
        start_static
        start_streamlit
        ;;
    status)
        logo
        status_services
        ;;
    logs)
        LOG_TYPE="${2:-streamlit}"
        if [ "$LOG_TYPE" = "static" ]; then
            tail -f "$LOG_DIR/static.log"
        else
            tail -f "$LOG_DIR/streamlit.log"
        fi
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs [static|streamlit]}"
        exit 1
        ;;
esac
