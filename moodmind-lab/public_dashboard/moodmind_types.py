from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
import uuid
import time
from datetime import datetime


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class FinanceVector11D:
    vec_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    symbol: str = ""
    timestamp: str = field(default_factory=now_iso)
    vector_public: List[float] = field(default_factory=lambda: [0.0] * 4)
    vector_finance_private: List[float] = field(default_factory=lambda: [0.0] * 7)
    lighting: Dict[str, float] = field(default_factory=lambda: {"L1": 0.5, "L2": 0.5, "L3": 0.5, "L4": 0.5})
    sphere_risk: float = 0.0
    kmp_similarity: float = 0.0
    pid_state: Dict[str, float] = field(default_factory=lambda: {"P": 0.0, "I": 0.0, "D": 0.0})
    kelly_fraction: float = 0.0
    cycle_phase: float = 0.0
    tier: str = "normal"
    tokens_used: int = 0
    meta: Dict = field(default_factory=dict)

    @property
    def vector_full(self) -> List[float]:
        return self.vector_public + self.vector_finance_private

    @property
    def risk_level(self) -> str:
        if self.sphere_risk >= 0.68:
            return "fuse"
        if self.sphere_risk >= 0.50:
            return "danger"
        if self.sphere_risk >= 0.48:
            return "warn"
        return "stable"

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["vector_full"] = self.vector_full
        d["risk_level"] = self.risk_level
        return d


@dataclass
class KMPMatchResult:
    match_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    pattern_id: str = ""
    pattern_name: str = ""
    similarity: float = 0.0
    vec_id: str = ""
    timestamp: str = field(default_factory=now_iso)
    tier_route: str = "normal"
    is_high_homology: bool = False
    paradigm_precipitated: bool = False
    tokens_used: int = 0

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class LightingSnapshot:
    timestamp: str = field(default_factory=now_iso)
    L1_liquidity: float = 0.5
    L2_sentiment: float = 0.5
    L3_policy: float = 0.5
    L4_prosperity: float = 0.5
    lighting_score: float = 0.5
    sector_bias: str = "neutral"

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class SphereRiskSnapshot:
    timestamp: str = field(default_factory=now_iso)
    risk_magnitude: float = 0.0
    threshold_warn: float = 0.48
    threshold_fuse: float = 0.68
    status: str = "stable"
    auto_hedge_ratio: float = 0.0
    suggested_kelly: float = 0.0

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class BillingRecord:
    bill_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=now_iso)
    action: str = ""
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    operator: str = "system"

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class AlertRecord:
    alert_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=now_iso)
    level: str = "info"
    source: str = ""
    message: str = ""
    resolved: bool = False

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class AuditEntry:
    audit_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=now_iso)
    role: str = ""
    action: str = ""
    target: str = ""
    allowed: bool = True
    detail: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ComputeReport:
    report_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=now_iso)
    vram_estimate_mb: float = 0.0
    time_estimate_ms: float = 0.0
    hot_cold_label: str = "warm"
    num_vectors: int = 0
    precision: str = "fp32"
    kmp_blocks: int = 0

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class PushToMSLab:
    push_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    timestamp: str = field(default_factory=now_iso)
    vec_id: str = ""
    vector_11d: List[float] = field(default_factory=list)
    kmp_score: float = 0.0
    target_tier: str = ""
    status: str = "queued"
    response: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)
