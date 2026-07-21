"""
MS-Lab 通用工具模块 (Batch1)
红线声明：本模块仅提供监控数据读取、JSON持久化、日志记录等表层工程能力；
禁止实现通用数学求解库、128bit高精度运算、KMP底层匹配、算力调度博弈算法。
"""
import json
import os
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATHS = {
    "trash":     BASE_DIR / "mslab_trash_db",
    "buffer":    BASE_DIR / "mslab_buffer_db",
    "normal":    BASE_DIR / "mslab_normal_db",
    "knowledge": BASE_DIR / "mslab_knowledge_db",
}
META_DIR    = BASE_DIR / "mslab_meta"
BILLING_DIR = BASE_DIR / "mslab_billing"
ALERT_DIR   = BASE_DIR / "mslab_alert"
SEC_DIR     = BASE_DIR / "mslab_security"

TZ_CN = timezone(timedelta(hours=8))

def now_cn() -> str:
    return datetime.now(TZ_CN).strftime("%Y-%m-%d %H:%M:%S")

def now_cn_iso() -> str:
    return datetime.now(TZ_CN).isoformat(timespec="seconds")

def read_json(path: Path, default=None):
    try:
        if not path.exists():
            return default
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def write_json(path: Path, data) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def append_jsonl(path: Path, record: dict) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False

def dir_stats(dir_path: Path) -> dict:
    """统计目录文件数与字节大小（仅表层，不读取向量内容）"""
    count = 0
    size = 0
    if dir_path.exists():
        for p in dir_path.rglob("*"):
            if p.is_file() and p.name != ".gitkeep":
                count += 1
                size += p.stat().st_size
    return {"file_count": count, "byte_size": size}

def human_bytes(n: int) -> str:
    for unit in ["B","KB","MB","GB","TB"]:
        if n < 1024 or unit == "TB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} {unit}"
        n /= 1024
    return f"{n:.1f} TB"

def load_lab_config() -> dict:
    return read_json(META_DIR / "lab_config.json", default={})

def load_vector_index() -> dict:
    return read_json(META_DIR / "vector_index.json", default={"tiers": {}})

def save_vector_index(idx: dict):
    idx["updated_at"] = now_cn_iso()
    write_json(META_DIR / "vector_index.json", idx)

def load_private_interfaces() -> dict:
    return read_json(SEC_DIR / "private_interfaces.json", default={})

def refresh_index_stats():
    """刷新四个向量库的文件统计到meta索引（Batch1使用真实文件扫描）"""
    idx = load_vector_index()
    tiers_new = {}
    for key, path in DB_PATHS.items():
        st = dir_stats(path)
        tiers_new[key] = {
            "vector_count": st["file_count"],
            "byte_size": st["byte_size"],
            "last_gc": idx.get("tiers", {}).get(key, {}).get("last_gc")
        }
    idx["tiers"] = tiers_new
    save_vector_index(idx)
    return idx

def log_billing(tokens_in: int, tokens_out: int, cost_rmb: float, op: str = "query", model: str = "mslab-embed-v1"):
    rec = {
        "id": uuid.uuid4().hex[:12],
        "ts": now_cn_iso(),
        "op": op,
        "model": model,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "tokens_total": tokens_in + tokens_out,
        "cost_rmb": round(cost_rmb, 6)
    }
    append_jsonl(BILLING_DIR / "token_billing.jsonl", rec)
    return rec

def read_billing_tail(n: int = 100):
    p = BILLING_DIR / "token_billing.jsonl"
    if not p.exists():
        return []
    lines = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(line)
    out = []
    for line in lines[-n:]:
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out

def log_alert(level: str, category: str, message: str, source: str = "mslab"):
    rec = {
        "id": uuid.uuid4().hex[:12],
        "ts": now_cn_iso(),
        "level": level,
        "category": category,
        "message": message,
        "source": source,
        "acknowledged": False
    }
    append_jsonl(ALERT_DIR / "alert_log.jsonl", rec)
    return rec

def read_alerts(include_acked: bool = False, n: int = 200):
    p = ALERT_DIR / "alert_log.jsonl"
    if not p.exists():
        return []
    lines = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(line)
    out = []
    for line in lines[-n:]:
        try:
            r = json.loads(line)
            if include_acked or not r.get("acknowledged", False):
                out.append(r)
        except Exception:
            pass
    return list(reversed(out))


# ============================================================
# 以下为私有能力接口预留（Batch1不实现，仅空壳，严格遵守红线）
# ============================================================

class PrivateKernel128Bit:
    """128bit高精度运算接口 —— 仅预留空入口，无实现代码"""
    def __init__(self):
        self.enabled = False
        self.reason = "红线：128bit高精度向量运算禁止在本层实现"

    def configure(self, **kwargs):
        raise NotImplementedError(
            "128bit高精度配置入口已预留，当前Batch无执行代码（最高管理员专属）"
        )

    def compute(self, *args, **kwargs):
        raise NotImplementedError(self.reason)


class KMPSearchInterface:
    """KMP匹配接口外壳 —— 禁止编写KMP底层源码，仅接收最终匹配分值"""
    def __init__(self):
        self.enabled = False
        self.reason = "红线：KMP底层匹配源码禁止在本层编写，仅接收最终匹配分值"

    def search(self, query: str, top_k: int = 10):
        raise NotImplementedError(self.reason)


class SolverKernelStub:
    """通用数学求解库接口预留 —— 禁止实现"""
    def __init__(self):
        self.enabled = False
        self.reason = "红线：通用数学求解库禁止在本层开发"

    def solve(self, *args, **kwargs):
        raise NotImplementedError(self.reason)


class ComputeSchedulerStub:
    """算力调度博弈算法外壳 —— 仅做上报和指令接收"""
    def __init__(self):
        self.enabled = False
        self.reason = "红线：算力调度底层博弈算法禁止开发，仅做上报和指令接收"

    def report_status(self, payload: dict) -> dict:
        """上报状态给总控（Batch1仅返回接收确认）"""
        return {"ok": True, "ts": now_cn_iso(), "echo": payload.get("type")}

    def receive_command(self, cmd: dict) -> dict:
        """接收总控调度指令（Batch1仅记录，不执行底层调度）"""
        return {"ok": True, "ts": now_cn_iso(), "received_cmd": cmd.get("type"), "executed": False}
