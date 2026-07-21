import json
from pathlib import Path
from typing import List, Dict

from moodmind_config import ALERT_LOG
from moodmind_types import AlertRecord, now_iso


LEVELS = {"info", "warn", "danger", "success"}


def _append_jsonl(path: Path, data: Dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")


def _read_jsonl(path: Path, n: int = 500) -> List[Dict]:
    if not path.exists():
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return out[-n:]


def emit_alert(level: str, source: str, message: str) -> AlertRecord:
    if level not in LEVELS:
        level = "info"
    a = AlertRecord(level=level, source=source, message=message)
    _append_jsonl(ALERT_LOG, a.to_dict())
    return a


def check_risk_alert(risk_magnitude: float, fuse: float = 0.68, warn: float = 0.48) -> List[AlertRecord]:
    alerts = []
    if risk_magnitude >= fuse:
        alerts.append(emit_alert("danger", "sphere_risk",
            f"🔴 球面风控模长 {risk_magnitude:.3f} ≥ 熔断阈值 {fuse}，触发熔断机制"))
    elif risk_magnitude >= 0.50:
        alerts.append(emit_alert("danger", "sphere_risk",
            f"🟠 球面风控模长 {risk_magnitude:.3f} 进入警戒区间，建议对冲"))
    elif risk_magnitude >= warn:
        alerts.append(emit_alert("warn", "sphere_risk",
            f"🟡 球面风控模长 {risk_magnitude:.3f} 触发观察预警"))
    return alerts


def check_storage_alert(used_pct: float) -> List[AlertRecord]:
    alerts = []
    if used_pct >= 0.9:
        alerts.append(emit_alert("danger", "storage", f"🔴 金融向量总库使用率 {used_pct*100:.1f}%，容量告急"))
    elif used_pct >= 0.7:
        alerts.append(emit_alert("warn", "storage", f"🟡 金融向量总库使用率 {used_pct*100:.1f}%"))
    return alerts


def check_kmp_alert(similarity: float) -> List[AlertRecord]:
    alerts = []
    if similarity >= 0.92:
        alerts.append(emit_alert("success", "kmp",
            f"✨ KMP匹配相似度 {similarity:.3f}，高同源范式沉淀入库"))
    elif similarity < 0.15:
        alerts.append(emit_alert("info", "kmp",
            f"ℹ️ KMP匹配相似度 {similarity:.3f} 极低，噪声数据丢弃"))
    return alerts


def read_alerts(n: int = 100) -> List[Dict]:
    return _read_jsonl(ALERT_LOG, n)


def mark_resolved(alert_id: str) -> bool:
    all_alerts = _read_jsonl(ALERT_LOG, 10000)
    updated = False
    for a in all_alerts:
        if a.get("alert_id") == alert_id:
            a["resolved"] = True
            updated = True
    if updated:
        with open(ALERT_LOG, "w", encoding="utf-8") as f:
            for a in all_alerts:
                f.write(json.dumps(a, ensure_ascii=False) + "\n")
    return updated
