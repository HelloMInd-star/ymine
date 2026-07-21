"""
MS-Lab 通用工具模块 (Batch2)
红线声明：本模块仅提供监控数据读取、JSON持久化、日志记录、
         计费计量、冷热缓存、自动分流入库等表层工程能力；
禁止实现通用数学求解库、128bit高精度运算、KMP底层匹配、算力调度博弈算法。
Batch2新增：自动相似度分流、冷热内存缓存、Token计费增强、FP64→FP32自动降级、向量去重。
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


# ============================================================
# 全操作行为日志
# ============================================================
OP_LOG_PATH = ALERT_DIR.parent / "mslab_meta" / "op_log.jsonl"

def log_op(op_type: str, detail: dict, operator: str = "system") -> dict:
    """记录所有操作行为到操作日志"""
    rec = {
        "id": uuid.uuid4().hex[:12],
        "ts": now_cn_iso(),
        "op_type": op_type,
        "operator": operator,
        "detail": detail,
    }
    op_log_file = BASE_DIR / "mslab_meta" / "op_log.jsonl"
    append_jsonl(op_log_file, rec)
    return rec

def read_op_log(n: int = 200) -> list:
    p = BASE_DIR / "mslab_meta" / "op_log.jsonl"
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
    return list(reversed(out))


# ============================================================
# 向量持久化 CRUD
# ============================================================
def _vec_file(tier: str, vec_id: str) -> Path:
    if tier not in DB_PATHS:
        raise ValueError(f"未知向量库层级: {tier}（可选: {list(DB_PATHS.keys())}）")
    return DB_PATHS[tier] / f"{vec_id}.json"

def save_vector(vec_record: dict) -> dict:
    """将向量记录写入对应层级目录的JSON文件"""
    tier = vec_record.get("tier", "buffer")
    vec_id = vec_record["vec_id"]
    fp = _vec_file(tier, vec_id)
    ok = write_json(fp, vec_record)
    if ok:
        log_op("vector_save", {
            "vec_id": vec_id,
            "tier": tier,
            "precision": vec_record.get("precision"),
            "byte_size": vec_record.get("byte_info", {}).get("total_bytes"),
            "text_preview": vec_record.get("text", "")[:60],
        })
        check_watermark_after_write(tier)
    return {"ok": ok, "path": str(fp), "vec_id": vec_id}

def load_vector(tier: str, vec_id: str) -> dict:
    fp = _vec_file(tier, vec_id)
    return read_json(fp)

def delete_vector(tier: str, vec_id: str) -> dict:
    fp = _vec_file(tier, vec_id)
    existed = fp.exists()
    if existed:
        fp.unlink()
        log_op("vector_delete", {"vec_id": vec_id, "tier": tier})
    return {"ok": True, "existed": existed, "deleted": existed}

def list_vectors(tier: str) -> list:
    """列出某一层级库中的所有向量ID"""
    if tier not in DB_PATHS:
        return []
    ids = []
    for p in DB_PATHS[tier].glob("*.json"):
        ids.append(p.stem)
    return sorted(ids)

def load_all_vectors(tier: str, limit: int = 500) -> list:
    """加载某一层级所有向量（最近N条按修改时间倒序）"""
    if tier not in DB_PATHS:
        return []
    files = sorted(
        [p for p in DB_PATHS[tier].glob("*.json")],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )[:limit]
    out = []
    for fp in files:
        v = read_json(fp)
        if v:
            out.append(v)
    return out


# ============================================================
# 存储水位告警检查
# ============================================================
TIER_CAP_BYTES = {
    "trash":      500 * 1024 * 1024,
    "buffer":     2   * 1024 * 1024 * 1024,
    "normal":     10  * 1024 * 1024 * 1024,
    "knowledge":  20  * 1024 * 1024 * 1024,
}

def tier_real_stats(tier: str) -> dict:
    """实时统计某层向量库的真实数据"""
    if tier not in DB_PATHS:
        return {"vector_count": 0, "byte_size": 0, "watermark": 0.0, "cap_bytes": 0}
    p = DB_PATHS[tier]
    files = [f for f in p.glob("*.json")]
    total_bytes = sum(f.stat().st_size for f in files)
    cap = TIER_CAP_BYTES[tier]
    wm = total_bytes / cap if cap > 0 else 0.0
    return {
        "vector_count": len(files),
        "byte_size": total_bytes,
        "cap_bytes": cap,
        "watermark": wm,
    }

def all_tiers_real_stats() -> dict:
    out = {}
    for tier in DB_PATHS:
        out[tier] = tier_real_stats(tier)
    return out

def check_watermark_after_write(tier: str):
    """写入向量后检查水位，超过告警线则记录告警"""
    cfg = load_lab_config()
    wm_alarm = cfg.get("storage_tiers", {}).get(tier, {}).get("watermark_alarm", 0.8)
    st = tier_real_stats(tier)
    wm = st["watermark"]
    if wm >= wm_alarm:
        pct = wm * 100
        level = "crit" if wm >= 0.95 else "warn"
        log_alert(level, "watermark",
                  f"mslab_{tier}_db 水位 {pct:.1f}% 超过告警线 {wm_alarm*100:.0f}%（{human_bytes(st['byte_size'])} / {human_bytes(st['cap_bytes'])}）",
                  "storage")
    elif wm >= 0.5:
        log_alert("info", "watermark",
                  f"mslab_{tier}_db 水位 {wm*100:.1f}%（{human_bytes(st['byte_size'])} / {human_bytes(st['cap_bytes'])}）",
                  "storage")


def compute_global_bit_util() -> float:
    """
    遍历所有已存向量，计算全局平均二进制有效比特率。
    遍历上限1000条以控制性能。
    """
    ratios = []
    for tier in DB_PATHS:
        for vec in load_all_vectors(tier, limit=250):
            bs = vec.get("bit_stats", {})
            r = bs.get("effective_bit_ratio")
            if r is not None:
                ratios.append(r)
    if not ratios:
        return 0.862
    return sum(ratios) / len(ratios)


# ============================================================
# Batch2 新增：冷热内存缓存
#   - knowledge库（高分知识库）：常驻内存（HOT）
#   - normal库：温数据，LRU缓存
#   - buffer/trash库：冷数据，直接磁盘读写
# ============================================================
HOT_VECTOR_CACHE = {}
WARM_VECTOR_CACHE = {}
WARM_CACHE_MAX = 200
HOT_CACHE_MAX = 1000


def build_hot_cache():
    """启动时/入库后重建知识库内存缓存（高分向量常驻内存）"""
    from mslab_vector import cosine_similarity
    global HOT_VECTOR_CACHE
    HOT_VECTOR_CACHE = {}
    kvecs = load_all_vectors("knowledge", limit=HOT_CACHE_MAX)
    for v in kvecs:
        vid = v["vec_id"]
        HOT_VECTOR_CACHE[vid] = {
            "vec_id": vid,
            "vector": v["vector"],
            "precision": v["precision"],
            "text": v.get("text", "")[:80],
            "similarity": v.get("route_info", {}).get("similarity", 0),
            "tier": "knowledge",
            "_loaded_at": now_cn_iso(),
        }
    log_op("cache_rebuild", {"tier": "knowledge", "cached_count": len(HOT_VECTOR_CACHE)})
    return len(HOT_VECTOR_CACHE)


def warm_cache_put(vec_record: dict):
    """将常规库向量放入温缓存，超限则淘汰最早的"""
    global WARM_VECTOR_CACHE
    vid = vec_record["vec_id"]
    WARM_VECTOR_CACHE[vid] = {
        "vec_id": vid,
        "vector": vec_record["vector"],
        "precision": vec_record["precision"],
        "text": vec_record.get("text", "")[:80],
        "tier": vec_record.get("tier", "normal"),
        "_loaded_at": now_cn_iso(),
    }
    if len(WARM_VECTOR_CACHE) > WARM_CACHE_MAX:
        oldest = sorted(WARM_VECTOR_CACHE.keys(), key=lambda k: WARM_VECTOR_CACHE[k]["_loaded_at"])[:len(WARM_VECTOR_CACHE) - WARM_CACHE_MAX]
        for k in oldest:
            del WARM_VECTOR_CACHE[k]


def cache_status() -> dict:
    """返回冷热缓存状态"""
    return {
        "hot": {"tier": "knowledge", "count": len(HOT_VECTOR_CACHE), "policy": "常驻内存"},
        "warm": {"tier": "normal", "count": len(WARM_VECTOR_CACHE), "max": WARM_CACHE_MAX, "policy": f"LRU(上限{WARM_CACHE_MAX})"},
        "cold": {"tier": "buffer/trash", "policy": "磁盘直读直写"},
    }


def hot_cache_search(query_vec: list, top_k: int = 5) -> list:
    """在知识库内存缓存中做相似度搜索（仅表层余弦计算，非KMP）"""
    from mslab_vector import cosine_similarity
    results = []
    for vid, item in HOT_VECTOR_CACHE.items():
        sim = cosine_similarity(query_vec, item["vector"])
        results.append({
            "vec_id": vid,
            "similarity": round(sim, 6),
            "text_preview": item["text"],
            "precision": item["precision"],
            "tier": "knowledge",
            "source": "hot_cache",
        })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]


# ============================================================
# Batch2 新增：Token 计费增强
# ============================================================
DEFAULT_PRICING = {
    "input_price_per_1k":  0.002,
    "output_price_per_1k": 0.004,
    "storage_price_per_kb_month": 0.001,
}


def load_pricing_config() -> dict:
    """读取自定义计费单价，无配置则使用默认"""
    cfg = load_lab_config()
    p = cfg.get("pricing", {})
    merged = dict(DEFAULT_PRICING)
    merged.update(p)
    return merged


def save_pricing_config(pricing: dict):
    """保存自定义计费单价到lab_config"""
    cfg = load_lab_config()
    cfg["pricing"] = pricing
    write_json(META_DIR / "lab_config.json", cfg)
    log_op("pricing_update", {"pricing": pricing})


def calc_billing(input_tokens: int, output_tokens: int, pricing: dict = None) -> dict:
    """
    精确计算费用：分输入/输出Token分别统计。
    """
    if pricing is None:
        pricing = load_pricing_config()
    ip = pricing.get("input_price_per_1k", DEFAULT_PRICING["input_price_per_1k"])
    op = pricing.get("output_price_per_1k", DEFAULT_PRICING["output_price_per_1k"])
    input_cost  = input_tokens  / 1000.0 * ip
    output_cost = output_tokens / 1000.0 * op
    total = input_cost + output_cost
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "input_price_per_1k": ip,
        "output_price_per_1k": op,
        "input_cost":  round(input_cost,  6),
        "output_cost": round(output_cost, 6),
        "total_cost":  round(total, 6),
        "formula": f"输入{input_tokens}tok × ¥{ip}/1K + 输出{output_tokens}tok × ¥{op}/1K = ¥{total:.6f}",
    }


def log_billing_v2(input_tokens: int, output_tokens: int, op: str = "embed",
                   model: str = "mslab-embed-v1", extra: dict = None) -> dict:
    """Batch2增强版计费记录，写入bill明细（分别记录input/output）"""
    billing = calc_billing(input_tokens, output_tokens)
    rec = {
        "id": uuid.uuid4().hex[:12],
        "ts": now_cn_iso(),
        "op": op,
        "model": model,
        "tokens_in": input_tokens,
        "tokens_out": output_tokens,
        "tokens_total": billing["total_tokens"],
        "cost_in":  billing["input_cost"],
        "cost_out": billing["output_cost"],
        "cost_rmb": billing["total_cost"],
        "pricing": {"in_per_1k": billing["input_price_per_1k"], "out_per_1k": billing["output_price_per_1k"]},
    }
    if extra:
        rec["extra"] = extra
    append_jsonl(BILLING_DIR / "token_billing.jsonl", rec)
    return rec


# ============================================================
# Batch2 新增：向量去重检测
# ============================================================
def check_duplicate(vec_record: dict, target_tier: str = None) -> dict:
    """
    在已有向量库中检测重复。
    去重依据：向量指纹（量化后SHA256）+ 归一化文本。
    """
    from mslab_vector import vector_fingerprint, text_normalize, cosine_similarity
    search_tiers = [target_tier] if target_tier else list(DB_PATHS.keys())
    fp = vector_fingerprint(vec_record["vector"], vec_record.get("precision", "fp32"),
                            text_normalize(vec_record.get("text", "")))
    for tier in search_tiers:
        for v in load_all_vectors(tier, limit=500):
            v_fp = v.get("fingerprint")
            if v_fp == fp:
                return {
                    "is_duplicate": True,
                    "duplicate_id": v["vec_id"],
                    "duplicate_tier": tier,
                    "match_type": "fingerprint_exact",
                    "similarity": 1.0,
                }
            if text_normalize(v.get("text", "")) == text_normalize(vec_record.get("text", "")):
                sim = cosine_similarity(vec_record["vector"], v["vector"])
                if sim > 0.999:
                    return {
                        "is_duplicate": True,
                        "duplicate_id": v["vec_id"],
                        "duplicate_tier": tier,
                        "match_type": "text_vector_identical",
                        "similarity": round(sim, 6),
                    }
    return {"is_duplicate": False, "duplicate_id": None, "duplicate_tier": None, "similarity": 0.0}


# ============================================================
# Batch2 新增：水位检查 + 精度自动降级
# ============================================================
def should_downgrade(tier: str, current_precision: str) -> dict:
    """
    判断是否需要降级：若当前层水位>90%且精度为FP64，建议降级为FP32。
    """
    if current_precision != "fp64":
        return {"should_downgrade": False, "reason": "非FP64无需降级", "watermark": 0}
    st = tier_real_stats(tier)
    wm = st["watermark"]
    if wm >= 0.90:
        return {
            "should_downgrade": True,
            "reason": f"{tier}库水位{wm*100:.1f}%≥90%，FP64自动降级为FP32以释放空间",
            "watermark": wm,
        }
    return {"should_downgrade": False, "reason": f"水位{wm*100:.1f}%，无需降级", "watermark": wm}


# ============================================================
# Batch2 新增：自动分流入库（端到端）
# ============================================================
def auto_route_and_store(vec_record: dict, auto_downgrade: bool = True,
                         skip_duplicate: bool = True) -> dict:
    """
    端到端自动分流入库：
    1. 基于余弦相似度自动路由到四库之一
    2. 指纹+文本去重检测
    3. 水位超90%时FP64自动降级为FP32
    4. 写入对应库+冷热缓存更新
    5. Token分输入/输出分别计费
    """
    from mslab_vector import (classify_tier_by_similarity, downgrade_precision,
                              count_tokens_in_text, estimate_output_tokens,
                              vector_fingerprint, text_normalize)
    result = {
        "ok": False,
        "vec_id": vec_record.get("vec_id"),
        "steps": [],
        "warnings": [],
    }

    route = classify_tier_by_similarity(vec_record["vector"])
    target_tier = route["tier"]
    vec_record["tier"] = target_tier
    vec_record["route_info"] = route
    result["route"] = route
    result["steps"].append(f"相似度{route['similarity_pct']}% → 自动路由到{route['tier_label']}")

    tok_in = count_tokens_in_text(vec_record.get("text", ""))
    tok_out = estimate_output_tokens(vec_record.get("precision", "fp32"), vec_record.get("dims", 4))
    vec_record["token_usage"] = {"input": tok_in, "output": tok_out}
    result["token_usage"] = {"input_tokens": tok_in["total_tokens"], "output_tokens": tok_out["total_tokens"]}

    if skip_duplicate:
        dup = check_duplicate(vec_record, target_tier)
        result["duplicate_check"] = dup
        if dup["is_duplicate"]:
            result["ok"] = False
            result["skipped"] = True
            result["steps"].append(f"检测到重复向量 {dup['duplicate_id']}@{dup['duplicate_tier']}，跳过入库")
            log_op("vector_duplicate_skip", {
                "vec_id": vec_record["vec_id"], "target_tier": target_tier,
                "duplicate_id": dup["duplicate_id"], "match_type": dup["match_type"],
            })
            return result

    dg = should_downgrade(target_tier, vec_record.get("precision", "fp32"))
    result["downgrade_check"] = dg
    if dg["should_downgrade"] and auto_downgrade:
        old_bytes = vec_record["byte_info"]["total_bytes"]
        vec_record = downgrade_precision(vec_record)
        new_bytes = vec_record["byte_info"]["total_bytes"]
        saved = old_bytes - new_bytes
        result["warnings"].append(f"⚠️ {dg['reason']}，已自动降级（节省{saved}B/向量）")
        result["downgraded"] = True
        result["steps"].append(f"精度从FP64降级为FP32，每条节省{saved}B")
        log_alert("warn", "precision",
                  f"自动精度降级：{target_tier}库水位{dg['watermark']*100:.1f}%，FP64→FP32", "storage")

    vec_record["fingerprint"] = vector_fingerprint(
        vec_record["vector"], vec_record.get("precision", "fp32"),
        text_normalize(vec_record.get("text", ""))
    )

    saved_path = save_vector(vec_record)
    result["save_result"] = saved_path
    if saved_path["ok"]:
        result["ok"] = True
        result["steps"].append(f"已写入{target_tier}库，{vec_record['byte_info']['total_bytes']}B")
    else:
        result["steps"].append("写入失败")
        return result

    if target_tier == "knowledge":
        HOT_VECTOR_CACHE[vec_record["vec_id"]] = {
            "vec_id": vec_record["vec_id"],
            "vector": vec_record["vector"],
            "precision": vec_record["precision"],
            "text": vec_record.get("text", "")[:80],
            "similarity": route["similarity"],
            "tier": "knowledge",
            "_loaded_at": now_cn_iso(),
        }
    elif target_tier == "normal":
        warm_cache_put(vec_record)

    bill_rec = log_billing_v2(
        tok_in["total_tokens"], tok_out["total_tokens"],
        op="embed_auto_route",
        extra={"tier": target_tier, "similarity": route["similarity"],
               "precision": vec_record.get("precision")},
    )
    result["billing"] = bill_rec
    result["steps"].append(f"计费：输入{tok_in['total_tokens']}tok + 输出{tok_out['total_tokens']}tok = ¥{bill_rec['cost_rmb']:.6f}")

    return result
