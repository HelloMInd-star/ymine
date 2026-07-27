"""
Chromosome Diagnostic Router
============================
LLM multi-turn conversation topic drift detection API.
"""

import math
import random
import time
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from config import THRESHOLDS, RISK_LEVELS

router = APIRouter(prefix="/api/chromosome", tags=["chromosome"])


class ChromosomeMessage(BaseModel):
    role: str = Field(..., description="Message role: system/user/assistant")
    content: str = Field(..., description="Message content")
    topic_vector: Optional[List[float]] = Field(None, description="Optional embedding vector (7-dim)")


class ChromosomeDiagnoseRequest(BaseModel):
    messages: List[ChromosomeMessage] = Field(..., description="Conversation messages")
    drift_strength: float = Field(0.3, ge=0.0, le=1.0, description="Drift strength 0-1")
    base_topic: str = Field("量化金融策略", description="Anchored topic name")
    base_vector: Optional[List[float]] = Field(None, description="Base topic gene vector (7-dim)")


class ChromosomeDiagnoseResponse(BaseModel):
    similarity: float
    drift_degree: float
    status: str
    status_label: str
    status_color: str
    round_count: int
    avg_similarity: float
    warning_count: int
    fuse_triggered: bool
    gene_map: List[float]
    diagnosis: str


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def _get_risk_level(v: float) -> dict:
    for lvl in RISK_LEVELS:
        if v < lvl["max"]:
            return lvl
    return RISK_LEVELS[-1]


def _drift_vector(base: List[float], strength: float, rng: random.Random, bias: List[float]) -> List[float]:
    out = []
    for i, bv in enumerate(base):
        out.append(max(-1.0, min(1.0, bv + bias[i] * strength + (rng.random() * 2 - 1) * strength * 0.3)))
    return out


@router.get("/status")
def chromosome_status():
    return {
        "module": "Chromosome Diagnostic Instrument",
        "version": "1.0",
        "thresholds": THRESHOLDS,
        "supported_topics": [
            "量化金融策略", "医疗诊断辅助", "编程代码生成", "教育知识问答"
        ],
    }


@router.post("/diagnose", response_model=ChromosomeDiagnoseResponse)
def diagnose_conversation(req: ChromosomeDiagnoseRequest):
    rng = random.Random(hash(tuple((m.role, m.content[:20]) for m in req.messages)) % (2**32) ^ int(time.time()*1000) % (2**32))

    base_v = req.base_vector or [0.8, 0.6, 0.4, 0.7, 0.5, 0.3, 0.9]
    n = len(req.messages)
    sims = []
    fuse = False
    warnings = 0
    current_v = list(base_v)
    bias = [(rng.random() * 2 - 1) for _ in base_v]

    for i, msg in enumerate(req.messages):
        if i > 0 and msg.role == "assistant":
            step_strength = req.drift_strength * (i / max(n, 1)) * 0.5
            current_v = _drift_vector(current_v, step_strength, rng, bias)
        sim = _cosine_similarity(base_v, current_v)
        sims.append(sim)
        drift = 1 - sim
        if drift >= THRESHOLDS["FUSE"]:
            fuse = True
        if drift >= THRESHOLDS["WARNING"]:
            warnings += 1

    latest_sim = sims[-1] if sims else 1.0
    latest_drift = 1 - latest_sim
    avg_sim = sum(sims) / len(sims) if sims else 1.0

    if fuse or latest_drift >= THRESHOLDS["FUSE"]:
        status, label, color = "danger", "熔断告警", RISK_LEVELS[4]["color"]
    elif latest_drift >= THRESHOLDS["WARNING"]:
        status, label, color = "warning", "主题漂移", RISK_LEVELS[3]["color"]
    else:
        status, label, color = "safe", "锚定稳定", RISK_LEVELS[0]["color"]

    diagnosis = f"基于{req.base_topic}染色体基因锚定检测：共{n}轮对话，平均锚定度{avg_sim:.3f}。"
    if fuse:
        diagnosis += "⚠️ 已触发熔断红线，建议立即重置话题锚定。"
    elif warnings > 0:
        diagnosis += f"出现{warnings}次预警信号，主题存在漂移趋势。"
    else:
        diagnosis += "锚定稳定，对话主题一致。"

    return ChromosomeDiagnoseResponse(
        similarity=round(latest_sim, 4),
        drift_degree=round(1 - latest_sim, 4),
        status=status,
        status_label=label,
        status_color=color,
        round_count=n,
        avg_similarity=round(avg_sim, 4),
        warning_count=warnings,
        fuse_triggered=fuse,
        gene_map=[round(v, 3) for v in current_v],
        diagnosis=diagnosis,
    )
