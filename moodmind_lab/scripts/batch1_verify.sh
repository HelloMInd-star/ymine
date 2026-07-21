#!/bin/bash
# scripts/batch1_verify.sh — Batch1 验收自检脚本
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PASS=0; FAIL=0
red() { echo -e "\033[31m❌ $1\033[0m"; FAIL=$((FAIL+1)); }
green() { echo -e "\033[32m✅ $1\033[0m"; PASS=$((PASS+1)); }
blue() { echo -e "\033[36m▶ $1\033[0m"; }

echo "═══════════════════════════════════════════════"
echo "🧠 MoodMind-Lab · Batch1 红线验收自检"
echo "═══════════════════════════════════════════════"
echo ""

blue "[1] 目录结构完整性"
for d in scripts public_static public_static/assets moodmind_dashboard moodmind_dashboard/pages \
         public_api market_data_gate moodmind_storage_main/trash moodmind_storage_main/buffer \
         moodmind_storage_main/normal moodmind_storage_main/knowledge billing_log alert_log \
         security config docs; do
    [ -d "$d" ] && green "目录存在: $d" || red "目录缺失: $d"
done

blue "[2] 关键文件存在"
for f in public_static/index.html public_static/assets/deepspace.css \
         moodmind_dashboard/app.py moodmind_dashboard/theme.py moodmind_dashboard/private_engine_stub.py \
         scripts/start_all.sh scripts/stop_all.sh scripts/batch1_verify.sh \
         security/rbac_role.json security/aes_config.json security/private_placeholder.json \
         config/global.env requirements.txt \
         docs/API.md docs/SECURITY.md docs/DIRECTORY.md \
         public_api/vector_sender.py public_api/kmp_score_sender.py \
         market_data_gate/__init__.py; do
    [ -f "$f" ] && green "文件存在: $f" || red "文件缺失: $f"
done

blue "[3] 红线检查：私有内核目录隔离"
[ -d "../private_moodmind_engine" ] || [ -d "private_moodmind_engine" ] && \
    green "private_moodmind_engine 目录存在（独立于工程）" || \
    red "private_moodmind_engine 目录缺失"

blue "[4] 红线检查：MAX_EXPORT_BATCH=100 硬编码"
grep -q "MAX_EXPORT_BATCH.*=.*100\|MAX_EXPORT_BATCH_SIZE.*=.*100" moodmind_dashboard/private_engine_stub.py && \
    green "批量导出硬上限 100 条已硬编码" || \
    red "未找到 MAX_EXPORT_BATCH=100 硬编码"

blue "[5] 红线检查：NotImplementedError 抛出"
NIE_COUNT=$(grep -c "NotImplementedError\|_raise_private\|PrivateKernelNotImplementedError" moodmind_dashboard/private_engine_stub.py)
[ "$NIE_COUNT" -ge 39 ] && \
    green "私有接口抛异常数量 ≥39 (实测: $NIE_COUNT)" || \
    red "抛异常数量不足 (实测: $NIE_COUNT, 需要≥39)"

blue "[6] 红线检查：KMP 仅预留分值接收"
grep -q "receive_final_score" moodmind_dashboard/private_engine_stub.py && \
    green "KMP receive_final_score() 接收入口已预留" || \
    red "KMP 分值接收入口缺失"
python3 - <<'PYEOF'
import ast, sys
with open("moodmind_dashboard/private_engine_stub.py") as f:
    tree = ast.parse(f.read())
kmp_banned = {"build_lps_array", "kmp_search", "pattern_similarity", "cycle_detection", "homologous_pattern_mining"}
violations = []
for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in kmp_banned:
        body_text = ast.unparse(node)
        if "_raise_private" not in body_text and "NotImplementedError" not in body_text:
            violations.append(node.name)
sys.exit(1 if violations else 0)
PYEOF
if [ $? -eq 0 ]; then
    green "KMP/LPS 底层源码未实现（全部为stub抛异常，符合红线）"
else
    red "发现 KMP/LPS 底层真实实现（违反红线）"
fi

blue "[7] Python语法检查"
for pyfile in moodmind_dashboard/app.py moodmind_dashboard/theme.py moodmind_dashboard/private_engine_stub.py \
              moodmind_dashboard/pages/__init__.py moodmind_dashboard/pages/overview.py moodmind_dashboard/pages/risk.py \
              moodmind_dashboard/pages/lighting.py moodmind_dashboard/pages/kmp.py moodmind_dashboard/pages/alerts.py \
              moodmind_dashboard/pages/redline.py moodmind_dashboard/pages/export_limit.py moodmind_dashboard/pages/config_page.py \
              public_api/__init__.py public_api/vector_sender.py public_api/kmp_score_sender.py \
              market_data_gate/__init__.py; do
    python3 -c "import ast; ast.parse(open('$pyfile').read())" 2>/dev/null && \
        green "语法正确: $pyfile" || red "语法错误: $pyfile"
done

blue "[8] 端口HTTP连通性（需先启动服务）"
for port in 8100 8510; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://localhost:$port/" 2>/dev/null)
    if [ "$code" = "200" ]; then
        green "端口 $port HTTP 200"
    else
        echo "  ⚠️  端口 $port 未响应 (HTTP $code)，请先 bash scripts/start_all.sh"
    fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  自检结果: ✅ 通过 $PASS 项  ❌ 失败 $FAIL 项"
echo "═══════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && echo "🎉 Batch1 全部红线检查通过！" && exit 0 || exit 1
