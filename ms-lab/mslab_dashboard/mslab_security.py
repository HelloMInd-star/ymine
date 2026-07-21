"""
MS-Lab 安全体系模块 (Batch3)
=====================================
严格红线：
  1. AES-256-GCM 加密存储向量原文（向量本体不嵌入原文）
  2. 两级密钥：
     - 64bit 工程内置密钥种子（KEY_SEED_64BIT 写入工程，实际AES密钥通过HKDF从该种子派生得到256bit）
     - 128bit 密钥严格预留，仅参数位，任何使用128bit密钥的调用抛 NotImplementedError
  3. RBAC 三级权限：admin（最高管理员）/ architect（架构师）/ operator（操作员）
  4. 禁止全库批量导出：单次导出上限 MAX_EXPORT_BATCH 条
  5. 原文不嵌入向量：向量文件只存 text_hash + text_ref，原文独立加密存储
  6. 不实现通用密码学求解、不实现自定义加密算法
"""
import os
import json
import hashlib
import hmac
from pathlib import Path
from typing import Dict, Tuple, Optional
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.exceptions import InvalidTag


# ============================================================
# 两级密钥体系（严格红线）
# ============================================================
KEY_SEED_64BIT_HEX = "5A7B3C9D1E2F4A6B"  # 64bit = 8字节 = 16 hex字符，工程内置
KEY_SEED_64BIT = bytes.fromhex(KEY_SEED_64BIT_HEX)
SALT_FOR_HKDF = b"mslab-vec-store-2026"

# 128bit 密钥预留标记（禁止使用）
KEY_128BIT_RESERVED = None  # 永远是None；仅作参数占位


def _derive_aes256_key() -> bytes:
    """
    从64bit工程密钥种子通过HKDF-SHA256派生256bit AES密钥。
    64bit种子→HKDF→32字节(256bit) 实际加密密钥。
    """
    hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=SALT_FOR_HKDF,
                info=b"mslab-aes256-gcm-vec-store-v1")
    return hkdf.derive(KEY_SEED_64BIT)


def get_key(key_bits: int = 256) -> bytes:
    """
    获取加密密钥：
      - key_bits=64:  返回64bit种子（仅供审计/展示，不直接用于加密）
      - key_bits=256: 返回派生后的256bit AES密钥
      - key_bits=128: 严格红线 → NotImplementedError（仅预留参数位）
    """
    if key_bits == 64:
        return KEY_SEED_64BIT
    if key_bits == 256:
        return _derive_aes256_key()
    if key_bits == 128:
        raise NotImplementedError(
            "128bit密钥仅预留参数位，MS-Lab Batch3 严格禁止使用128bit密钥加密（红线）"
        )
    raise ValueError(f"不支持的密钥位宽: {key_bits}bit（仅支持64bit种子/256bit加密，128bit预留）")


# ============================================================
# AES-256-GCM 加解密
# ============================================================
def encrypt_text(plaintext: str, associated_data: bytes = b"mslab-vec") -> Dict:
    """
    AES-256-GCM 加密文本：
      - nonce: 12字节随机数（每次加密独立）
      - 输出包含 nonce / ciphertext_b64 / tag（GCM自带认证tag）
    """
    import base64
    key = get_key(256)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    pt_bytes = plaintext.encode("utf-8")
    ct = aesgcm.encrypt(nonce, pt_bytes, associated_data)
    return {
        "alg": "AES-256-GCM",
        "nonce_b64": base64.b64encode(nonce).decode("ascii"),
        "ciphertext_b64": base64.b64encode(ct).decode("ascii"),
        "ad": associated_data.decode("ascii", errors="replace"),
        "key_bits": 256,
        "key128_reserved": True,
    }


def decrypt_text(enc_dict: Dict, associated_data: bytes = b"mslab-vec") -> str:
    """AES-256-GCM 解密；tag验证失败则抛 InvalidTag"""
    import base64
    if enc_dict.get("key_bits") == 128:
        raise NotImplementedError("128bit密钥数据为预留参数位，无法解密")
    key = get_key(256)
    aesgcm = AESGCM(key)
    nonce = base64.b64decode(enc_dict["nonce_b64"])
    ct = base64.b64decode(enc_dict["ciphertext_b64"])
    ad = associated_data if associated_data else enc_dict.get("ad", "mslab-vec").encode("utf-8")
    pt = aesgcm.decrypt(nonce, ct, ad)
    return pt.decode("utf-8")


def text_hash(plaintext: str) -> str:
    """文本哈希（用于向量中引用原文，不保存明文）"""
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()[:32]


# ============================================================
# RBAC 三级权限体系
# ============================================================
ROLE_ADMIN     = "admin"
ROLE_ARCHITECT = "architect"
ROLE_OPERATOR  = "operator"

ROLE_LABELS = {
    ROLE_ADMIN:     "最高管理员",
    ROLE_ARCHITECT: "架构师",
    ROLE_OPERATOR:  "操作员",
}

# 权限矩阵：能力 -> 允许的最低角色
# admin(3) > architect(2) > operator(1)
ROLE_RANK = {ROLE_OPERATOR: 1, ROLE_ARCHITECT: 2, ROLE_ADMIN: 3}

PERMISSIONS = {
    "view_dashboard":         ROLE_OPERATOR,
    "basic_search":           ROLE_OPERATOR,
    "view_billing":           ROLE_OPERATOR,
    "vector_write":           ROLE_OPERATOR,
    "view_vectors":           ROLE_OPERATOR,
    "create_vector":          ROLE_OPERATOR,
    "math_solve":             ROLE_OPERATOR,
    "use_math_template":      ROLE_OPERATOR,
    "compute_report":         ROLE_OPERATOR,
    "view_dashboard_basic":   ROLE_OPERATOR,

    "adjust_threshold":       ROLE_ARCHITECT,
    "tier_mgmt":              ROLE_ARCHITECT,
    "audit_log":              ROLE_ARCHITECT,
    "compute_cmd_inject":     ROLE_ARCHITECT,
    "export_data":            ROLE_ARCHITECT,
    "configure_pricing":      ROLE_ARCHITECT,
    "delete_vector":          ROLE_ARCHITECT,
    "export_vectors":         ROLE_ARCHITECT,

    "security_manage":        ROLE_ADMIN,
    "config_write":           ROLE_ADMIN,
    "view_security":          ROLE_ADMIN,
    "manage_keys":            ROLE_ADMIN,
    "configure_storage":      ROLE_ADMIN,
    "view_private_kernel":    ROLE_ADMIN,
    "batch_export_override":  ROLE_ADMIN,

    "bulk_export_forbidden":  True,
    "use_128bit_key":         "__NEVER__",
}

MAX_EXPORT_BATCH = 100  # 单次导出最大条数（禁止全库批量导出）


def role_rank(role: str) -> int:
    return ROLE_RANK.get(role, 0)


def has_permission(role: str, perm: str) -> bool:
    """
    权限校验：角色rank >= 所需rank则放行。
    use_128bit_key 永远返回False（红线）。
    bulk_export_forbidden 通过 MAX_EXPORT_BATCH 硬约束，而不是权限位。
    """
    if perm == "use_128bit_key":
        return False
    required = PERMISSIONS.get(perm)
    if required is None or required == "__NEVER__":
        return False
    return role_rank(role) >= role_rank(required)


def perm_denied_msg(perm: str) -> str:
    required = PERMISSIONS.get(perm, "未知")
    return f"权限不足：{perm} 需要 {required} 角色"


def check_export_limit(count: int) -> Tuple[bool, str]:
    """导出条数限制校验：单次最多 MAX_EXPORT_BATCH 条，禁止全库批量导出"""
    if count > MAX_EXPORT_BATCH:
        return False, f"🚫 批量导出上限 {MAX_EXPORT_BATCH} 条，禁止全库批量导出（安全红线）"
    return True, "ok"


# ============================================================
# 原文分离存储
#   向量文件内：text_hash (SHA256前16字节) + text_ref (加密文件路径标记)
#   原文存储目录：SEC_DIR/vec_texts/{vec_id}.enc（AES-256-GCM加密JSON）
# ============================================================
def build_text_ref(vec_id: str) -> str:
    """生成原文加密存储引用路径（相对）"""
    return f"vec_texts/{vec_id}.enc"


def store_text_secure(base_dir: Path, vec_id: str, plaintext: str,
                      tier: str = "", precision: str = "") -> Dict:
    """
    原文加密并独立存储：返回存入后的加密元信息dict，供写入向量引用。
    不在向量JSON里保留明文。
    """
    import base64
    text_dir = base_dir / "vec_texts"
    text_dir.mkdir(parents=True, exist_ok=True)
    enc = encrypt_text(plaintext, associated_data=f"mslab-vec:{vec_id}".encode("utf-8"))
    thash = text_hash(plaintext)
    payload = {
        "vec_id": vec_id,
        "text_hash": thash,
        "enc": enc,
        "tier": tier,
        "precision": precision,
    }
    out_path = text_dir / f"{vec_id}.enc"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.chmod(out_path, 0o600)
    return {
        "text_hash": thash,
        "text_ref": build_text_ref(vec_id),
        "text_stored_encrypted": True,
        "text_len": len(plaintext),
    }


def load_text_secure(base_dir: Path, vec_id: str) -> Optional[str]:
    """从独立加密存储加载原文；需要解密。若文件不存在返回None"""
    enc_path = base_dir / "vec_texts" / f"{vec_id}.enc"
    if not enc_path.exists():
        return None
    try:
        with open(enc_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        return decrypt_text(payload["enc"], associated_data=f"mslab-vec:{vec_id}".encode("utf-8"))
    except (InvalidTag, Exception):
        return None


def delete_text_secure(base_dir: Path, vec_id: str) -> bool:
    """删除原文加密文件"""
    enc_path = base_dir / "vec_texts" / f"{vec_id}.enc"
    if enc_path.exists():
        enc_path.unlink()
        return True
    return False


# ============================================================
# 安全审计日志（独立于op_log，仅admin可见）
# ============================================================
AUDIT_EVENT_TYPES = {
    "login", "export", "denied", "key_access", "decrypt_text",
    "bulk_export_blocked", "perm_change", "config_change",
}


def audit_log(base_dir: Path, event_type: str, role: str, detail: Dict):
    """安全审计日志（SEC_DIR/audit.jsonl），仅admin可查看"""
    from datetime import datetime, timezone, timedelta
    if event_type not in AUDIT_EVENT_TYPES:
        event_type = "denied"
    audit_dir = base_dir / "mslab_security"
    audit_dir.mkdir(parents=True, exist_ok=True)
    rec = {
        "ts": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
        "event": event_type,
        "role": role,
        "detail": detail,
    }
    with open(audit_dir / "audit.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def read_audit_log(base_dir: Path, n: int = 100) -> list:
    """读取最近N条审计日志"""
    p = base_dir / "mslab_security" / "audit.jsonl"
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
