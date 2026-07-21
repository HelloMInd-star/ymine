import json
from pathlib import Path
from typing import List, Dict, Optional

from moodmind_config import CONFIG, BILLING_LOG
from moodmind_types import BillingRecord, now_iso


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


def record_billing(action: str, tokens_in: int = 0, tokens_out: int = 0,
                   operator: str = "system") -> BillingRecord:
    price_per_1k = CONFIG["billing"]["price_per_1k_tokens"]
    total_tokens = tokens_in + tokens_out
    cost = round(total_tokens / 1000.0 * price_per_1k, 6)
    rec = BillingRecord(
        action=action,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost,
        operator=operator,
    )
    _append_jsonl(BILLING_LOG, rec.to_dict())
    return rec


def get_billing_summary(n: int = 500) -> Dict:
    records = _read_jsonl(BILLING_LOG, n)
    total_tokens_in = sum(r.get("tokens_in", 0) for r in records)
    total_tokens_out = sum(r.get("tokens_out", 0) for r in records)
    total_cost = sum(r.get("cost_usd", 0) for r in records)
    by_action = {}
    for r in records:
        a = r.get("action", "unknown")
        if a not in by_action:
            by_action[a] = {"count": 0, "tokens": 0, "cost": 0.0}
        by_action[a]["count"] += 1
        by_action[a]["tokens"] += r.get("tokens_in", 0) + r.get("tokens_out", 0)
        by_action[a]["cost"] += r.get("cost_usd", 0)
    return {
        "total_records": len(records),
        "total_tokens_in": total_tokens_in,
        "total_tokens_out": total_tokens_out,
        "total_tokens": total_tokens_in + total_tokens_out,
        "total_cost_usd": round(total_cost, 6),
        "by_action": by_action,
        "records": records[-50:],
    }
