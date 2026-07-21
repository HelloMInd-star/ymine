#!/bin/bash
# scripts/stop_all.sh — Batch1 一键关停
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"

echo "🛑 停止 MoodMind-Lab..."
for svc in static dashboard; do
    PID_FILE="$PID_DIR/$svc.pid"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null && echo "   ✓ $svc (PID:$PID) 已停止"
        fi
        rm -f "$PID_FILE"
    fi
done
pkill -f "http.server.*public_static" 2>/dev/null || true
pkill -f "streamlit.*app.py.*8510" 2>/dev/null || true
echo "✅ 所有服务已停止"
