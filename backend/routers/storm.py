"""
Storm Energy Simulator Router
=============================
Thunder-lightning-wind energy conservation simulation API.
Energy constraint: lightning_slope + wind_slope = total_energy (head pool).
"""

import math
import random
import time
from typing import List, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from config import THRESHOLDS, RISK_LEVELS

router = APIRouter(prefix="/api/storm", tags=["storm"])


class StormState(BaseModel):
    t: float
    lightning_slope: float
    wind_slope: float
    total_energy: float
    energy_conserved: bool
    signal: float
    status: str
    status_label: str
    status_color: str
    lightning_pct: float
    wind_pct: float


class StormSimResponse(BaseModel):
    state: StormState
    history: List[StormState]
    thresholds: dict


def _get_risk(v: float) -> dict:
    for lvl in RISK_LEVELS:
        if v < lvl["max"]:
            return lvl
    return RISK_LEVELS[-1]


def _classify(signal: float):
    if signal >= THRESHOLDS["FUSE"]:
        return "danger", "熔断", RISK_LEVELS[4]["color"]
    if signal >= THRESHOLDS["WARNING"]:
        return "warning", "预警", RISK_LEVELS[3]["color"]
    if signal >= THRESHOLDS["BREAKEVEN"]:
        return "steady", "稳态", RISK_LEVELS[2]["color"]
    return "safe", "正常", RISK_LEVELS[0]["color"]


@router.get("/status")
def storm_status():
    return {
        "module": "Storm Energy Distribution Simulator",
        "version": "1.0",
        "thresholds": THRESHOLDS,
        "energy_law": "lightning_slope + wind_slope = total_energy",
    }


@router.get("/simulate", response_model=StormSimResponse)
def simulate_storm(
    total_energy: float = Query(6.0, ge=1.0, le=10.0, description="Total energy pool (1-10)"),
    duration: float = Query(10.0, ge=1.0, le=60.0, description="Simulation duration in seconds"),
    steps: int = Query(50, ge=5, le=200, description="Number of data points"),
    seed: int = Query(None, description="Random seed for reproducibility"),
):
    rng = random.Random(seed if seed is not None else int(time.time()*1000) % (2**32))
    dt = duration / steps
    history: List[StormState] = []

    lightning = total_energy * 0.63
    wind = total_energy * 0.37
    t = 0.0

    for i in range(steps):
        noise_l = (rng.random() - 0.5) * 0.3
        noise_w = (rng.random() - 0.5) * 0.3
        phase = math.sin(t * 0.8) * 0.5
        target_l = total_energy * (0.5 + phase * 0.3)
        target_w = total_energy - target_l
        lightning = max(0.1, lightning + (target_l - lightning) * 0.15 + noise_l)
        wind = max(0.1, total_energy - lightning + noise_w * 0.1)
        total_now = lightning + wind
        conserved = abs(total_now - total_energy) < 0.2
        signal = max(lightning, wind) / total_energy
        status, label, color = _classify(signal)

        history.append(StormState(
            t=round(t, 2),
            lightning_slope=round(lightning, 2),
            wind_slope=round(wind, 2),
            total_energy=round(total_now, 2),
            energy_conserved=conserved,
            signal=round(signal, 3),
            status=status,
            status_label=label,
            status_color=color,
            lightning_pct=round(lightning / total_now * 100, 1),
            wind_pct=round(wind / total_now * 100, 1),
        ))
        t += dt

    state = history[-1]
    return StormSimResponse(state=state, history=history, thresholds=THRESHOLDS)


@router.get("/tick")
def storm_tick(
    t: float = Query(0.0, ge=0.0),
    total_energy: float = Query(6.0, ge=1.0, le=10.0),
    lightning: float = Query(3.8, ge=0.0),
    wind: float = Query(2.2, ge=0.0),
    dt: float = Query(0.1, gt=0.0, le=1.0),
):
    rng = random.Random(int(time.time()*1000) % (2**32))
    phase = math.sin(t * 0.8) * 0.5
    target_l = total_energy * (0.5 + phase * 0.3)
    new_l = max(0.1, lightning + (target_l - lightning) * 0.2 + (rng.random()-0.5)*0.2)
    new_w = max(0.1, total_energy - new_l + (rng.random()-0.5)*0.05)
    total = new_l + new_w
    signal = max(new_l, new_w) / total
    status, label, color = _classify(signal)
    return {
        "t": round(t + dt, 2),
        "lightning_slope": round(new_l, 2),
        "wind_slope": round(new_w, 2),
        "total_energy": round(total, 2),
        "energy_conserved": abs(total - total_energy) < 0.2,
        "signal": round(signal, 3),
        "status": status,
        "status_label": label,
        "status_color": color,
        "lightning_pct": round(new_l / total * 100, 1),
        "wind_pct": round(new_w / total * 100, 1),
        "thresholds": THRESHOLDS,
    }
