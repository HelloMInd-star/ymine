from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = BASE_DIR / "moodmind-lab" / "config" / "lab_config.json"

def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

CONFIG = load_config()

STORAGE_DIR = BASE_DIR / "moodmind-lab" / "moodmind_storage_main"
BILLING_LOG = BASE_DIR / "moodmind-lab" / "billing_log" / "billing.jsonl"
ALERT_LOG = BASE_DIR / "moodmind-lab" / "alert_log" / "alert.jsonl"
AUDIT_LOG = BASE_DIR / "moodmind-lab" / "audit_security" / "audit.jsonl"
COMPUTE_REPORT = BASE_DIR / "moodmind-lab" / "public_api" / "compute_reports.jsonl"
PUSH_QUEUE = BASE_DIR / "moodmind-lab" / "public_api" / "push_queue.jsonl"
MSLAB_PUSH_LOG = BASE_DIR / "moodmind-lab" / "vector_export_layer" / "mslab_push_log.jsonl"
KMP_SCORE_LOG = BASE_DIR / "moodmind-lab" / "kmp_score_service" / "kmp_scores.jsonl"
MARKET_DATA_IN = BASE_DIR / "moodmind-lab" / "market_data_source" / "incoming.jsonl"

for d in [STORAGE_DIR, BILLING_LOG.parent, ALERT_LOG.parent, AUDIT_LOG.parent,
          COMPUTE_REPORT.parent, PUSH_QUEUE.parent, MSLAB_PUSH_LOG.parent,
          KMP_SCORE_LOG.parent, MARKET_DATA_IN.parent]:
    d.mkdir(parents=True, exist_ok=True)

VEC_DIM_NAMES = [
    "D0-主体",
    "D1-动作",
    "D2-属性",
    "D3-外部扰动",
    "D4-P-现价偏离中枢比例",
    "D5-I-基本面积分稳态值",
    "D6-D-涨跌速率微分",
    "D7-筹码箱体区间向量",
    "D8-行情周期相位",
    "D9-凯利安全仓位系数",
    "D10-球面风险模长",
]

LIGHTING_DIM_NAMES = [
    "L1-成交量流动性光照",
    "L2-题材情绪光照",
    "L3-产业政策光照",
    "L4-产业链景气光照",
]

RISK_LEVELS = {
    "stable": {"min": 0.0, "max": 0.48, "label": "🟢 稳态运行", "color": "#22c55e"},
    "warn": {"min": 0.48, "max": 0.50, "label": "🟡 观察预警", "color": "#fbbf24"},
    "danger": {"min": 0.50, "max": 0.68, "label": "🟠 警戒区间", "color": "#f97316"},
    "fuse": {"min": 0.68, "max": 1.01, "label": "🔴 熔断触发", "color": "#ef4444"},
}

KMP_TIERS = [
    {"name": "trash", "min": 0.0, "max": 0.25, "label": "噪声库丢弃"},
    {"name": "buffer", "min": 0.25, "max": 0.50, "label": "缓冲库复检"},
    {"name": "normal", "min": 0.50, "max": 0.75, "label": "常规库存放"},
    {"name": "knowledge", "min": 0.75, "max": 1.01, "label": "知识库长效沉淀"},
]
