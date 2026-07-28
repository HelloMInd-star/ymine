import math
from fastapi import APIRouter, Query
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import THRESHOLDS
except Exception:
    THRESHOLDS = {"BREAKEVEN": 0.48, "STEADY": 0.50, "FUSE": 0.68}

router = APIRouter(prefix="/api/storm", tags=["storm"])


@router.get("/status")
def status():
    return {"module": "storm-energy-simulator", "status": "ready", "version": "2.5.1"}


@router.get("/simulate")
def simulate_storm(
    wind_speed: float = Query(default=15.0, description="风速 (m/s)", ge=0),
    precipitation: float = Query(default=50.0, description="降水量 (mm/h)", ge=0),
    duration: float = Query(default=6.0, description="持续时间 (小时)", ge=1)
):
    """
    风暴能量模拟
    - 输入：风速、降水量、持续时间（物理单位）
    - 输出：风暴强度、能量评级、熔断状态
    """
    breakeven = THRESHOLDS["BREAKEVEN"]
    steady = THRESHOLDS["STEADY"]
    fuse = THRESHOLDS["FUSE"]

    WIND_MAX = 30.0
    PRECIP_MAX = 100.0
    DUR_MAX = 12.0

    w_norm = min(wind_speed / WIND_MAX, 1.0)
    p_norm = min(precipitation / PRECIP_MAX, 1.0)
    d_norm = min(duration / DUR_MAX, 1.0)

    intensity = w_norm * 0.6 + p_norm * 0.3 + d_norm * 0.1
    intensity = round(min(max(intensity, 0.0), 1.0), 4)

    if intensity < breakeven:
        rating = "低"
        description = "风暴能量低于保本线，影响有限。"
    elif intensity < fuse:
        rating = "中"
        description = "风暴能量处于预警区，建议做好防范并持续监测。"
    else:
        rating = "高"
        description = "风暴能量超过熔断线，建议启动应急预案。"

    if intensity >= fuse:
        fuse_status = "triggered"
        fuse_action = "已触发熔断（≥0.68），建议立即启动应急预案。"
    elif intensity >= steady:
        fuse_status = "warning"
        description = "风暴能量已越过稳态中轴线（≥0.50），建议持续监测。"
        fuse_action = "进入预警区，保持关注。"
    else:
        fuse_status = "safe"
        fuse_action = "处于安全区间（<0.50），无需特殊操作。"

    return {
        "intensity": intensity,
        "rating": rating,
        "description": description,
        "fuse_status": fuse_status,
        "fuse_action": fuse_action,
        "energy_breakdown": {
            "wind_contribution": round(w_norm * 0.6, 4),
            "precipitation_contribution": round(p_norm * 0.3, 4),
            "duration_contribution": round(d_norm * 0.1, 4),
        },
        "thresholds": {"BREAKEVEN": breakeven, "STEADY": steady, "FUSE": fuse},
        "input": {"wind_speed": wind_speed, "precipitation": precipitation, "duration": duration},
        "normalized": {"wind": round(w_norm, 4), "precipitation": round(p_norm, 4), "duration": round(d_norm, 4)},
    }
