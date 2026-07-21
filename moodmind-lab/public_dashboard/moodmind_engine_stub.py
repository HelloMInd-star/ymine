import random
import math
import uuid
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from moodmind_config import CONFIG, STORAGE_DIR, KMP_SCORE_LOG, MARKET_DATA_IN
from moodmind_types import (
    FinanceVector11D, KMPMatchResult, LightingSnapshot, SphereRiskSnapshot,
    now_iso,
)

STOCK_SYMBOLS = [
    "600519.SH", "000858.SZ", "300750.SZ", "601318.SH", "000333.SZ",
    "600036.SH", "002594.SZ", "601899.SH", "600900.SH", "000001.SZ",
    "BTC-USD", "ETH-USD", "000001.SH", "399001.SZ", "HSI",
]

PATTERN_LIBRARY = [
    {"pid": "P-BO-001", "name": "底部箱体突破", "type": "bullish"},
    {"pid": "P-DT-002", "name": "双顶形态", "type": "bearish"},
    {"pid": "P-FL-003", "name": "旗形整理", "type": "continuation"},
    {"pid": "P-HS-004", "name": "头肩顶", "type": "bearish"},
    {"pid": "P-CP-005", "name": "杯柄形态", "type": "bullish"},
    {"pid": "P-WV-006", "name": "五浪推动", "type": "elliott"},
    {"pid": "P-TR-007", "name": "三角形收敛", "type": "indecision"},
    {"pid": "P-GP-008", "name": "缺口回补", "type": "reversal"},
]


def _read_jsonl(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def _append_jsonl(path: Path, data: Dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")


def _random_walk(base: float, vol: float, lo: float, hi: float) -> float:
    v = base + random.gauss(0, vol)
    return max(lo, min(hi, v))


def generate_mock_vector(symbol: Optional[str] = None) -> FinanceVector11D:
    """
    ⚠️ 公开stub层：仅模拟生成最终11维向量结果
    【红线】：不实现任何金融内核算法，所有私有维度D4-D10仅填充模拟随机值
    【私有引擎】：private_moodmind_engine 才包含真实计算逻辑（不入工程）
    """
    sym = symbol or random.choice(STOCK_SYMBOLS)
    bias = random.random()

    vec_pub = [
        _random_walk(0.5, 0.2, 0.0, 1.0),
        _random_walk(0.5, 0.2, 0.0, 1.0),
        _random_walk(0.5, 0.2, 0.0, 1.0),
        _random_walk(0.5, 0.2, 0.0, 1.0),
    ]

    vec_fin = [
        _random_walk(0.5, 0.15, 0.0, 1.0),
        _random_walk(0.5, 0.1, 0.0, 1.0),
        _random_walk(0.0 if bias < 0.5 else 0.5, 0.2, -1.0, 1.0),
        _random_walk(0.4, 0.15, 0.0, 1.0),
        _random_walk(0.5, 0.25, 0.0, 1.0),
        _random_walk(0.3, 0.15, 0.0, 0.6),
        _random_walk(0.35 + bias * 0.3, 0.1, 0.0, 1.0),
    ]

    lighting = {
        "L1": _random_walk(0.6, 0.2, 0.0, 1.0),
        "L2": _random_walk(0.5, 0.25, 0.0, 1.0),
        "L3": _random_walk(0.5, 0.15, 0.0, 1.0),
        "L4": _random_walk(0.5, 0.15, 0.0, 1.0),
    }

    risk = vec_fin[6]

    kmp = _random_walk(0.55, 0.2, 0.0, 1.0)

    if kmp < 0.25:
        tier = "trash"
    elif kmp < 0.50:
        tier = "buffer"
    elif kmp < 0.75:
        tier = "normal"
    else:
        tier = "knowledge"

    pid = {
        "P": _random_walk(0.5, 0.3, 0.0, 1.0),
        "I": _random_walk(0.5, 0.1, 0.0, 1.0),
        "D": _random_walk(0.0, 0.2, -1.0, 1.0),
    }

    return FinanceVector11D(
        symbol=sym,
        vector_public=vec_pub,
        vector_finance_private=vec_fin,
        lighting=lighting,
        sphere_risk=risk,
        kmp_similarity=kmp,
        pid_state=pid,
        kelly_fraction=vec_fin[5],
        cycle_phase=vec_fin[4],
        tier=tier,
        tokens_used=CONFIG["billing"]["tokens_per_vector"],
        meta={"source": "public_stub", "engine": "private_moodmind_engine (stubbed)"},
    )


def run_kmp_match(vec: FinanceVector11D, pattern_id: Optional[str] = None) -> KMPMatchResult:
    """
    ⚠️ 公开stub层：仅返回匹配分值结果
    【红线】：改良KMP周期匹配LPS底层源码不实现、不入工程
    """
    if pattern_id:
        pat = next((p for p in PATTERN_LIBRARY if p["pid"] == pattern_id), random.choice(PATTERN_LIBRARY))
    else:
        pat = random.choice(PATTERN_LIBRARY)

    similarity = _random_walk(vec.kmp_similarity, 0.08, 0.0, 1.0)

    if similarity < 0.25:
        route = "trash"
    elif similarity < 0.50:
        route = "buffer"
    elif similarity < 0.75:
        route = "normal"
    else:
        route = "knowledge"

    return KMPMatchResult(
        pattern_id=pat["pid"],
        pattern_name=pat["name"],
        similarity=similarity,
        vec_id=vec.vec_id,
        tier_route=route,
        is_high_homology=similarity >= 0.85,
        paradigm_precipitated=similarity >= 0.92,
        tokens_used=CONFIG["billing"]["tokens_per_kmp_match"],
    )


def snapshot_lighting() -> LightingSnapshot:
    return LightingSnapshot(
        L1_liquidity=_random_walk(0.55, 0.2, 0.0, 1.0),
        L2_sentiment=_random_walk(0.5, 0.25, 0.0, 1.0),
        L3_policy=_random_walk(0.6, 0.12, 0.0, 1.0),
        L4_prosperity=_random_walk(0.5, 0.15, 0.0, 1.0),
        lighting_score=_random_walk(0.53, 0.1, 0.0, 1.0),
        sector_bias=random.choice(["bullish", "neutral", "bearish", "rotation"]),
    )


def snapshot_sphere_risk() -> SphereRiskSnapshot:
    mag = _random_walk(0.42, 0.12, 0.0, 1.0)
    if mag >= 0.68:
        status = "fuse"
    elif mag >= 0.50:
        status = "danger"
    elif mag >= 0.48:
        status = "warn"
    else:
        status = "stable"

    return SphereRiskSnapshot(
        risk_magnitude=mag,
        threshold_warn=CONFIG["vector"]["sphere_risk_threshold_warn"],
        threshold_fuse=CONFIG["vector"]["sphere_risk_threshold_fuse"],
        status=status,
        auto_hedge_ratio=0.0 if status == "stable" else min(1.0, (mag - 0.48) * 5),
        suggested_kelly=max(0.0, 0.5 - (mag - 0.3) * 1.5) if mag > 0.3 else 0.5,
    )


def save_vector(vec: FinanceVector11D) -> Dict:
    fp = STORAGE_DIR / f"{vec.vec_id}.json"
    with open(fp, "w", encoding="utf-8") as f:
        json.dump(vec.to_dict(), f, ensure_ascii=False, indent=2)
    _append_jsonl(KMP_SCORE_LOG, {
        "ts": now_iso(),
        "vec_id": vec.vec_id,
        "symbol": vec.symbol,
        "kmp_similarity": vec.kmp_similarity,
        "tier": vec.tier,
        "sphere_risk": vec.sphere_risk,
    })
    return {"ok": True, "vec_id": vec.vec_id, "path": str(fp), "tier": vec.tier}


def load_recent_vectors(n: int = 100) -> List[Dict]:
    files = sorted(STORAGE_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:n]
    out = []
    for fp in files:
        try:
            with open(fp, "r", encoding="utf-8") as f:
                out.append(json.load(f))
        except Exception:
            pass
    return out


def load_kmp_scores(n: int = 200) -> List[Dict]:
    return _read_jsonl(KMP_SCORE_LOG)[-n:]


def ingest_market_data(symbol: str, price: float, volume: float) -> Dict:
    _append_jsonl(MARKET_DATA_IN, {
        "ts": now_iso(), "symbol": symbol, "price": price, "volume": volume
    })
    return {"ok": True, "symbol": symbol, "ingested": True}
