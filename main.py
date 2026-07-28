"""
================================================================================
  Game-OS V2.5.1 FullStack-Verified · FastAPI 后端【主入口】
================================================================================
  ⚠️ 这是推荐使用的主入口文件。启动命令：
     uvicorn main:app --reload --port 8000

  📌 backend/main.py 为备用/模块化版本（routers拆分，含NLP依赖），
     如无需模块化部署或NLP染色体诊断，建议使用本主入口。

  📖 API文档（启动后访问）：http://localhost:8000/docs
================================================================================
"""

import statistics
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import THRESHOLDS, VERSION, VERSION_DATE, SYSTEM_INFO, CORS_SETTINGS

app = FastAPI(
    title="🔺 Game-OS Backend API",
    version="2.5.1",
    description="Game-OS 后端服务 · V2.5.1 FullStack-Verified (Audit-Fixed) · 提供核心算法 REST API 调用（真实算法引擎）+ Streamlit 仪表盘 + Remotion 视频生成"
)

app.add_middleware(CORSMiddleware, **CORS_SETTINGS)


@app.get("/")
async def root():
    return {
        "message": "Game-OS Backend API 运行中",
        "version": VERSION,
        "version_date": VERSION_DATE,
        "codename": "FullStack-Verified",
        "services": {
            "api": "http://localhost:8000",
            "dashboard": "http://localhost:8501",
            "video": "http://localhost:3000",
            "docs": "http://localhost:8000/docs"
        },
        "api_endpoints": [
            "GET /",
            "GET /health",
            "GET /thresholds",
            "GET /version",
            "GET /api/system/status",
            "GET /api/chromosome/status",
            "GET /api/chromosome/diagnose",
            "GET /api/storm/status",
            "GET /api/storm/simulate"
        ]
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "game-os-backend", "version": VERSION}


@app.get("/thresholds")
async def get_thresholds():
    return THRESHOLDS


@app.get("/version")
async def get_version():
    return {
        "version": VERSION,
        "version_date": VERSION_DATE,
        "codename": "FullStack-Verified",
        "description": "Real-algorithm full-stack system with FastAPI + Streamlit + Remotion",
        "system_info": SYSTEM_INFO,
        "services": {
            "backend": {"framework": "FastAPI", "port": 8000, "status": "running"},
            "dashboard": {"framework": "Streamlit", "port": 8501, "command": "streamlit run dashboard/Home.py"},
            "video": {"framework": "Remotion", "port": 3000, "studio_port": 3001, "command": "cd video && npm run dev"}
        }
    }


@app.get("/api/system/status")
async def get_system_status():
    return {
        "version": VERSION,
        "version_date": VERSION_DATE,
        "services": {
            "fastapi": {
                "name": "FastAPI 后端",
                "status": "online",
                "port": 8000,
                "api_endpoints": 9,
                "docs": "/docs"
            },
            "streamlit": {
                "name": "Streamlit 仪表盘",
                "status": "standby",
                "port": 8501,
                "start_command": "streamlit run dashboard/Home.py"
            },
            "remotion": {
                "name": "Remotion 视频生成",
                "status": "standby",
                "port": 3000,
                "studio_port": 3001,
                "start_command": "cd video && npm run dev"
            }
        },
        "tests": SYSTEM_INFO["tests"],
        "pages": SYSTEM_INFO["frontend"]["pages"]
    }


# ============== 染色体诊断 API（真实算法） ==============
@app.get("/api/chromosome/status")
def chromosome_status():
    return {"module": "chromosome-diagnostic", "status": "ready", "version": "2.5.1"}


@app.get("/api/chromosome/diagnose")
def diagnose_chromosome(
    data: str = Query(
        default="0.52,0.48,0.71,0.55,0.49,0.63,0.45,0.58,0.67,0.51",
        description="染色体数据，逗号分隔的数值列表（0~1之间）"
    )
):
    """
    染色体诊断分析（数值健康度版本）
    - 输入：逗号分隔数值（0~1），代表不同片段的健康度
    - 输出：平均健康度、标准差、异常片段、健康分布、整体状态判定
    """
    try:
        values = [float(x.strip()) for x in data.split(",") if x.strip() != ""]
    except ValueError:
        raise HTTPException(status_code=400, detail="输入格式错误，请使用逗号分隔的数值列表")

    if len(values) < 5:
        raise HTTPException(status_code=400, detail=f"至少需要5个数据点，当前仅提供{len(values)}个")

    breakeven = THRESHOLDS["BREAKEVEN"]
    steady = THRESHOLDS["STEADY"]
    fuse = THRESHOLDS["FUSE"]

    avg_health = sum(values) / len(values)
    std_dev = statistics.stdev(values) if len(values) > 1 else 0.0

    abnormal_positions = [
        i for i, v in enumerate(values) if v < breakeven or v > fuse
    ]

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
        "health_distribution": {
            "healthy": healthy,
            "warning": warning,
            "critical": critical
        },
        "thresholds": {
            "BREAKEVEN": breakeven,
            "STEADY": steady,
            "FUSE": fuse
        },
        "overall_assessment": assessment,
        "sample_count": len(values),
        "raw_values": values
    }


# ============== 风暴能量模拟 API（真实算法） ==============
@app.get("/api/storm/status")
def storm_status():
    return {"module": "storm-energy-simulator", "status": "ready", "version": "2.5.1"}


@app.get("/api/storm/simulate")
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
            "duration_contribution": round(d_norm * 0.1, 4)
        },
        "thresholds": {
            "BREAKEVEN": breakeven,
            "STEADY": steady,
            "FUSE": fuse
        },
        "input": {
            "wind_speed": wind_speed,
            "precipitation": precipitation,
            "duration": duration
        },
        "normalized": {
            "wind": round(w_norm, 4),
            "precipitation": round(p_norm, 4),
            "duration": round(d_norm, 4)
        }
    }
