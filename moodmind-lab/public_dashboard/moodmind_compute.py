import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional

from moodmind_config import CONFIG, COMPUTE_REPORT
from moodmind_types import ComputeReport, now_iso

COMPUTE_STATE = {
    "paused": False,
    "delay_ms": 0,
    "force_fp32": False,
    "quota_per_min": 120,
    "precision": "fp32",
}


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


def estimate_vram(num_vectors: int, dims: int = 11, precision: str = "fp32",
                  with_lighting: bool = True, with_kmp: bool = True) -> Dict:
    elem = 8 if precision == "fp64" else 4
    payload = num_vectors * dims * elem
    meta = 1024 * 64
    lighting_buf = num_vectors * 4 * elem if with_lighting else 0
    kmp_buf = num_vectors * 256 * elem if with_kmp else 0
    base_reserved = 1024 * 1024 * 50
    total = payload + meta + lighting_buf + kmp_buf + base_reserved
    return {
        "total_bytes": total,
        "total_mb": round(total / (1024 * 1024), 2),
        "payload_bytes": payload,
        "payload_mb": round(payload / (1024 * 1024), 2),
        "lighting_bytes": lighting_buf,
        "kmp_bytes": kmp_buf,
    }


def estimate_compute_time(num_vectors: int, tokens_in: int, tokens_out: int,
                          precision: str = "fp32", with_kmp_blocks: bool = False,
                          kmp_blocks: int = 0) -> Dict:
    ms_per_k = 32.0 if precision == "fp64" else 18.0
    embed_ms = tokens_in / 1000.0 * ms_per_k
    out_ms = tokens_out / 1000.0 * ms_per_k * 0.3
    kmp_ms = kmp_blocks * 0.7 if with_kmp_blocks else 0
    lighting_ms = num_vectors * 0.02
    risk_ms = num_vectors * 0.03
    total_ms = embed_ms + out_ms + kmp_ms + lighting_ms + risk_ms + 8.0
    return {
        "total_ms": round(total_ms, 2),
        "total_s": round(total_ms / 1000, 3),
        "embed_ms": round(embed_ms, 2),
        "output_ms": round(out_ms, 2),
        "kmp_ms": round(kmp_ms, 2),
        "lighting_ms": round(lighting_ms, 2),
        "risk_ms": round(risk_ms, 2),
    }


def hot_cold_label(kmp_similarity: float, sphere_risk: float) -> str:
    score = kmp_similarity * 0.6 + (1 - sphere_risk) * 0.4
    if score >= 0.7:
        return "hot"
    elif score >= 0.4:
        return "warm"
    else:
        return "cold"


def build_report(num_vectors: int, tokens_in: int, tokens_out: int,
                 kmp_similarity: float = 0.5, sphere_risk: float = 0.4,
                 precision: str = "fp32", kmp_blocks: int = 0) -> ComputeReport:
    vram = estimate_vram(num_vectors, 11, precision, True, True)
    tm = estimate_compute_time(num_vectors, tokens_in, tokens_out, precision,
                               with_kmp_blocks=(kmp_blocks > 0), kmp_blocks=kmp_blocks)
    label = hot_cold_label(kmp_similarity, sphere_risk)
    return ComputeReport(
        vram_estimate_mb=vram["total_mb"],
        time_estimate_ms=tm["total_ms"],
        hot_cold_label=label,
        num_vectors=num_vectors,
        precision=precision,
        kmp_blocks=kmp_blocks,
    )


def send_report(report: ComputeReport):
    _append_jsonl(COMPUTE_REPORT, report.to_dict())


def send_report_dict(d: Dict):
    _append_jsonl(COMPUTE_REPORT, d)


def read_reports(n: int = 200) -> List[Dict]:
    return _read_jsonl(COMPUTE_REPORT, n)


def apply_command(cmd: Dict, state: Dict = None):
    s = state or COMPUTE_STATE
    c = cmd.get("cmd")
    if c == "stagger":
        s["delay_ms"] = max(0, min(cmd.get("params", {}).get("delay_ms", 500), 30000))
    elif c == "downgrade_precision":
        s["force_fp32"] = True
        s["precision"] = "fp32"
    elif c == "pause":
        s["paused"] = True
    elif c == "resume":
        s["paused"] = False
    elif c == "quota_limit":
        s["quota_per_min"] = max(1, min(cmd.get("params", {}).get("vectors_per_min", 120), 1000))
    return {"effect": f"Applied {c}", "state": s}


def inject_command(cmd: str, params: Dict = None):
    """
    本地测试用：模拟从算力底座接收指令
    """
    rec = {
        "cmd_id": uuid.uuid4().hex[:12],
        "ts": now_iso(),
        "from": "geom_compute_base",
        "cmd": cmd,
        "params": params or {},
    }
    cmd_log_path = COMPUTE_REPORT.parent / "incoming_commands.jsonl"
    _append_jsonl(cmd_log_path, rec)
    return apply_command(rec)


def fetch_commands(mark_applied: bool = True) -> List[Dict]:
    cmd_path = COMPUTE_REPORT.parent / "incoming_commands.jsonl"
    cmds = _read_jsonl(cmd_path, 100)
    if mark_applied and cmds:
        open(cmd_path, "w").close()
    return cmds
