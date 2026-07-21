"""
MS-Lab 算力底座对接模块 (Batch3)
=====================================
严格红线：
  - 不实现真实算力调度博弈算法
  - 不实现128bit高精度运算调度
  - 仅提供上报stub + 指令接收接口
  - 通信方式：文件队列模拟（reports.jsonl上送，commands.jsonl下收）

上报数据：
  - 预估显存占用（按精度+维度+条数估算）
  - 算力耗时估算（按分块数/Token数/精度建模）
  - 冷热标签（hot/warm/cold）
  - 库水位、当前精度

接收指令：
  - stagger: 错峰调度（延迟执行）
  - downgrade_precision: 精度降级要求
  - pause/resume: 暂停/恢复
  - quota_limit: 配额限制
"""
import json
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta

TZ_CN = timezone(timedelta(hours=8))


# 显存估算参数（仅模型化估算，非真实GPU调用）
VRAM_PER_FP32  = 4     # 每个fp32元素占4B
VRAM_PER_FP64  = 8     # 每个fp64元素占8B
VRAM_META_OVERHEAD = 1024  # 每次请求元数据开销1KB
VRAM_BASE_RESERVED = 4 * 1024 * 1024  # 基础预留4MB

# 耗时估算：每千Token毫秒数（模型化值）
MS_PER_KTOKEN_FP32 = 15.0
MS_PER_KTOKEN_FP64 = 28.0


def now_iso() -> str:
    return datetime.now(TZ_CN).isoformat(timespec="seconds")


def _dir(base: Path) -> Path:
    d = base / "mslab_compute"
    d.mkdir(parents=True, exist_ok=True)
    return d


def estimate_vram(num_vectors: int, dims: int = 4, precision: str = "fp32",
                  text_total_chars: int = 0) -> Dict:
    """
    预估显存占用（bytes）：
      payload = 向量条数 × 维度 × 单元素字节
      text_buffer = 文本字符数 × 4B (UTF-32近似)
      total = payload + text_buffer + META_OVERHEAD + BASE_RESERVED
    """
    elem = VRAM_PER_FP64 if precision == "fp64" else VRAM_PER_FP32
    payload = num_vectors * dims * elem
    text_buf = text_total_chars * 4
    total = payload + text_buf + VRAM_META_OVERHEAD + VRAM_BASE_RESERVED
    mb = total / (1024 * 1024)
    return {
        "payload_bytes": payload,
        "text_buffer_bytes": text_buf,
        "overhead_bytes": VRAM_META_OVERHEAD,
        "reserved_bytes": VRAM_BASE_RESERVED,
        "total_bytes": total,
        "total_mb": round(mb, 3),
        "total_gb": round(mb / 1024, 4),
    }


def estimate_compute_time(num_vectors: int, tokens_in: int, tokens_out: int,
                          precision: str = "fp32", with_kmp_blocks: bool = False,
                          kmp_blocks: int = 0) -> Dict:
    """
    预估算力耗时（毫秒）：
      embed_ms = tokens_in × (fp64?28:15)/1000
      kmp_ms   = kmp_blocks × 0.5 (若开启，仅分块统计开销)
      total_ms = embed_ms + kmp_ms + 固定5ms启动开销
    """
    ms_per_k = MS_PER_KTOKEN_FP64 if precision == "fp64" else MS_PER_KTOKEN_FP32
    embed_ms = tokens_in / 1000.0 * ms_per_k
    out_ms = tokens_out / 1000.0 * ms_per_k * 0.3
    kmp_ms = kmp_blocks * 0.5 if with_kmp_blocks else 0
    total_ms = embed_ms + out_ms + kmp_ms + 5.0
    return {
        "embed_ms": round(embed_ms, 3),
        "output_ms": round(out_ms, 3),
        "kmp_block_ms": round(kmp_ms, 3),
        "startup_ms": 5.0,
        "total_ms": round(total_ms, 3),
        "total_s": round(total_ms / 1000.0, 4),
    }


def hot_cold_label(tier: str, similarity: float = 0.0) -> str:
    """冷热标签判定：knowledge→hot，normal→warm，buffer/trash→cold"""
    if tier == "knowledge" or similarity >= 0.75:
        return "hot"
    if tier == "normal" or similarity >= 0.50:
        return "warm"
    return "cold"


def build_report(num_vectors: int, tokens_in: int, tokens_out: int,
                 precision: str, tier: str, similarity: float,
                 text_total_chars: int = 0, kmp_blocks: int = 0,
                 extra: Dict = None) -> Dict:
    """构造上报给算力底座的report"""
    vram = estimate_vram(num_vectors, 4, precision, text_total_chars)
    tm = estimate_compute_time(num_vectors, tokens_in, tokens_out, precision,
                               with_kmp_blocks=True, kmp_blocks=kmp_blocks)
    label = hot_cold_label(tier, similarity)
    rpt = {
        "id": uuid.uuid4().hex[:16],
        "ts": now_iso(),
        "node": "mslab-dashboard-v1",
        "task": "embed_store",
        "num_vectors": num_vectors,
        "precision": precision,
        "target_tier": tier,
        "similarity": similarity,
        "hot_cold_label": label,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "vram_estimate": vram,
        "time_estimate_ms": tm["total_ms"],
        "time_estimate_s": tm["total_s"],
        "time_breakdown": tm,
        "kmp_blocks": kmp_blocks,
        "status": "pending",
    }
    if extra:
        rpt["extra"] = extra
    return rpt


def send_report(base: Path, report: Dict) -> Dict:
    """上报到算力底座（写入reports.jsonl文件队列，模拟RPC）"""
    report["status"] = "reported"
    report["reported_at"] = now_iso()
    reports_path = _dir(base) / "reports.jsonl"
    with open(reports_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(report, ensure_ascii=False) + "\n")
    return {"ok": True, "report_id": report["id"], "queued_at": report["reported_at"]}


def read_reports(base: Path, n: int = 50) -> List[Dict]:
    """读取最近N条上报记录"""
    p = _dir(base) / "reports.jsonl"
    if not p.exists():
        return []
    records = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except:
                    pass
    return records[-n:]


# ============================================================
# 指令接收（算力底座下发）
# ============================================================
VALID_COMMANDS = {"stagger", "downgrade_precision", "pause", "resume", "quota_limit", "noop"}


def inject_command(base: Path, cmd: str, params: Dict = None,
                   source: str = "compute_scheduler") -> Dict:
    """
    注入一条算力底座指令（模拟下发，测试/演示用）。
    实际对接时由算力底座写入commands.jsonl。
    """
    if cmd not in VALID_COMMANDS:
        return {"ok": False, "error": f"非法指令: {cmd}"}
    rec = {
        "cmd_id": uuid.uuid4().hex[:16],
        "ts": now_iso(),
        "cmd": cmd,
        "params": params or {},
        "source": source,
        "applied": False,
    }
    p = _dir(base) / "commands.jsonl"
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return {"ok": True, "cmd_id": rec["cmd_id"], "cmd": cmd}


def fetch_commands(base: Path, mark_applied: bool = True) -> List[Dict]:
    """拉取未处理指令（读取commands.jsonl，标记applied后回写）"""
    p = _dir(base) / "commands.jsonl"
    if not p.exists():
        return []
    pending = []
    all_records = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rec = json.loads(line)
                    if not rec.get("applied"):
                        rec["applied"] = True if mark_applied else False
                        rec["applied_at"] = now_iso() if mark_applied else None
                        pending.append(rec)
                    all_records.append(rec)
                except:
                    pass
    if mark_applied and all_records:
        with open(p, "w", encoding="utf-8") as f:
            for r in all_records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return pending


def apply_command(rec: Dict, state: Dict) -> Dict:
    """
    应用一条指令到本地状态：
      - stagger: 设置 delay_ms 延迟
      - downgrade_precision: 设置 force_fp32=True
      - pause/resume: 设置 paused=True/False
      - quota_limit: 设置 quota_per_min
      - noop: 无操作
    state为可变dict，在调用方维护。
    """
    cmd = rec.get("cmd")
    params = rec.get("params", {})
    result = {"cmd_id": rec.get("cmd_id"), "cmd": cmd, "effect": ""}
    if cmd == "stagger":
        delay = int(params.get("delay_ms", 500))
        state["delay_ms"] = max(0, min(delay, 30000))
        result["effect"] = f"设置错峰延迟 {state['delay_ms']}ms"
    elif cmd == "downgrade_precision":
        state["force_fp32"] = True
        result["effect"] = "强制降级到FP32（即使请求FP64）"
    elif cmd == "pause":
        state["paused"] = True
        result["effect"] = "暂停接收新入库任务"
    elif cmd == "resume":
        state["paused"] = False
        result["effect"] = "恢复接收入库任务"
    elif cmd == "quota_limit":
        q = int(params.get("vectors_per_min", 60))
        state["quota_per_min"] = max(1, min(q, 1000))
        result["effect"] = f"配额限制 {state['quota_per_min']} vectors/min"
    elif cmd == "noop":
        result["effect"] = "心跳/空操作"
    else:
        result["effect"] = f"未知指令 {cmd}，忽略"
    result["applied_at"] = now_iso()
    return result


def default_compute_state() -> Dict:
    return {
        "delay_ms": 0,
        "force_fp32": False,
        "paused": False,
        "quota_per_min": 200,
    }
