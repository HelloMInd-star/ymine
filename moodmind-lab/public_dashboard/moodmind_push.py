import json
import uuid
import time
from pathlib import Path
from typing import List, Dict, Optional

from moodmind_config import CONFIG, MSLAB_PUSH_LOG, PUSH_QUEUE
from moodmind_types import FinanceVector11D, PushToMSLab, now_iso


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


def push_vector_to_mslab(vec: FinanceVector11D, simulate: bool = True) -> PushToMSLab:
    """
    MoodMind → MS-Lab 推送通道
    【规范强制】：仅推送两类数据
      1. 最终 11 维向量本体
      2. 0~1 相似度匹配分值
    【红线】：不推送任何金融公式、权重、PID、光照算法、球面风控求解逻辑
    """
    push = PushToMSLab(
        vec_id=vec.vec_id,
        vector_11d=vec.vector_full,
        kmp_score=vec.kmp_similarity,
        target_tier=vec.tier,
        status="queued",
    )

    _append_jsonl(PUSH_QUEUE, push.to_dict())

    if simulate:
        time.sleep(0.02)
        if vec.kmp_similarity < 0.25:
            route = "trash"
            resp = f"MS-Lab接收：分值{vec.kmp_similarity:.3f}<0.25，路由至噪声库丢弃"
        elif vec.kmp_similarity < 0.50:
            route = "buffer"
            resp = f"MS-Lab接收：分值{vec.kmp_similarity:.3f}∈[0.25,0.50)，路由至缓冲库复检"
        elif vec.kmp_similarity < 0.75:
            route = "normal"
            resp = f"MS-Lab接收：分值{vec.kmp_similarity:.3f}∈[0.50,0.75)，路由至常规库存放"
        else:
            route = "knowledge"
            resp = f"MS-Lab接收：分值{vec.kmp_similarity:.3f}≥0.75，路由至知识库长效沉淀(KMP长期记忆)"
        push.status = "delivered"
        push.response = resp
        push.target_tier = route
        _append_jsonl(MSLAB_PUSH_LOG, {
            **push.to_dict(),
            "delivered_ts": now_iso(),
        })
    return push


def get_push_queue(n: int = 100) -> List[Dict]:
    return _read_jsonl(PUSH_QUEUE, n)


def get_push_log(n: int = 200) -> List[Dict]:
    return _read_jsonl(MSLAB_PUSH_LOG, n)


def get_push_stats() -> Dict:
    logs = _read_jsonl(MSLAB_PUSH_LOG, 10000)
    by_tier = {}
    total = len(logs)
    for l in logs:
        t = l.get("target_tier", "unknown")
        by_tier[t] = by_tier.get(t, 0) + 1
    return {
        "total_pushed": total,
        "by_tier": by_tier,
        "success_rate": round(sum(1 for l in logs if l.get("status") == "delivered") / max(1, total), 4),
        "avg_kmp_score": round(sum(l.get("kmp_score", 0) for l in logs) / max(1, total), 4),
    }
