import statistics
from fastapi import APIRouter, Query
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import THRESHOLDS
except Exception:
    THRESHOLDS = {"breakeven": 0.48, "steady": 0.50, "fuse": 0.68}

router = APIRouter(prefix="/api/chromosome", tags=["chromosome"])


@router.get("/status")
def status():
    return {"module": "chromosome-diagnostic", "status": "ready", "version": "2.5"}


@router.get("/diagnose")
def diagnose_chromosome(
    data: str = Query(
        default="0.52,0.48,0.71,0.55,0.49,0.63,0.45,0.58,0.67,0.51",
        description="染色体数据，逗号分隔的数值列表（0~1之间）"
    )
):
    """
    染色体诊断分析
    - 输入：逗号分隔数值（0~1），代表不同片段的健康度
    - 输出：平均健康度、标准差、异常片段、健康分布、整体状态判定
    """
    try:
        values = [float(x.strip()) for x in data.split(",") if x.strip() != ""]
    except ValueError:
        return {"error": "输入格式错误，请使用逗号分隔的数值列表", "status": "error"}

    if len(values) < 5:
        return {"error": "至少需要5个数据点", "status": "error", "count": len(values)}

    breakeven = THRESHOLDS["breakeven"]
    steady = THRESHOLDS["steady"]
    fuse = THRESHOLDS["fuse"]

    avg_health = sum(values) / len(values)
    std_dev = statistics.stdev(values) if len(values) > 1 else 0.0

    abnormal_positions = [i for i, v in enumerate(values) if v < breakeven or v > fuse]

    healthy = sum(1 for v in values if breakeven <= v <= fuse)
    warning = sum(1 for v in values if 0.45 <= v < breakeven or fuse < v <= 0.72)
    critical = len(values) - healthy - warning

    if avg_health < breakeven:
        status = "critical"
        assessment = "整体健康度低于保本线(0.48)，建议全面检查。"
    elif avg_health > fuse:
        status = "critical"
        assessment = "整体健康度高于熔断线(0.68)，存在过载风险，建议降低负荷。"
    elif len(abnormal_positions) > 3:
        status = "warning"
        assessment = f"存在{len(abnormal_positions)}个异常片段，建议重点关注。"
    elif len(abnormal_positions) > 0:
        status = "warning"
        assessment = f"存在{len(abnormal_positions)}个异常片段，位置：{abnormal_positions}，建议进一步分析。"
    else:
        status = "healthy"
        assessment = "所有片段均在稳态区间[0.48,0.68]内，整体健康状态良好。"

    return {
        "status": status,
        "avg_health": round(avg_health, 4),
        "std_dev": round(std_dev, 4),
        "abnormal_segments": len(abnormal_positions),
        "abnormal_positions": abnormal_positions,
        "health_distribution": {"healthy": healthy, "warning": warning, "critical": critical},
        "thresholds": {"breakeven": breakeven, "steady": steady, "fuse": fuse},
        "overall_assessment": assessment,
        "sample_count": len(values),
        "raw_values": values,
    }
