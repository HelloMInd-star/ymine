import json
from pathlib import Path
from typing import List, Dict

from moodmind_config import AUDIT_LOG
from moodmind_types import AuditEntry, now_iso

ROLE_RANK = {"viewer": 0, "operator": 1, "quant": 2, "admin": 3}

PERMISSIONS = {
    "view_dashboard": "viewer",
    "view_vectors": "viewer",
    "view_risk": "viewer",
    "view_lighting": "viewer",
    "view_kmp": "viewer",
    "view_billing": "operator",
    "view_audit": "quant",
    "ingest_market_data": "operator",
    "generate_vector": "operator",
    "run_kmp_match": "operator",
    "push_to_mslab": "quant",
    "inject_compute_cmd": "quant",
    "config_write": "admin",
    "security_manage": "admin",
    "view_private_kernel_dims": "admin",
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


def has_permission(role: str, perm: str) -> bool:
    req = PERMISSIONS.get(perm)
    if req is None:
        return False
    return ROLE_RANK.get(role, -1) >= ROLE_RANK.get(req, 99)


def audit_log(role: str, action: str, target: str = "", allowed: bool = True, detail: str = "") -> AuditEntry:
    e = AuditEntry(
        role=role,
        action=action,
        target=target,
        allowed=allowed,
        detail=detail,
    )
    _append_jsonl(AUDIT_LOG, e.to_dict())
    return e


def read_audit_log(n: int = 200) -> List[Dict]:
    return _read_jsonl(AUDIT_LOG, n)
