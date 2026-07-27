"""
================================================================================
                    VECTOR REALITY PROTOCOL · 全局阈值配置
================================================================================
  Version: V2.5 FullStack-Verified
  Date: 2025-07-27
  Features:
    ✓ 真实算法引擎
    ✓ FastAPI REST API (7个端点)
    ✓ Streamlit 数据仪表盘
    ✓ Remotion 视频生成
    ✓ 75个前端测试 + 73个后端测试 = 148项测试
================================================================================
"""

VERSION = "V2.5 FullStack-Verified"
VERSION_DATE = "2025-07-27"

THRESHOLDS = {
    "breakeven": 0.48,
    "steady": 0.50,
    "fuse": 0.68,
    "max_drawdown": 0.15,
    "storm_intensity_high": 80,
    "storm_energy_danger": 70,
}

SYSTEM_INFO = {
    "frontend": {
        "framework": "HTML/CSS/JavaScript + ECharts",
        "port": 5500,
        "pages": 25,
        "components": 8,
    },
    "backend": {
        "framework": "FastAPI (Python)",
        "port": 8000,
        "api_endpoints": 7,
        "docs": "http://localhost:8000/docs",
    },
    "dashboard": {
        "framework": "Streamlit",
        "port": 8501,
        "pages": 3,
    },
    "video": {
        "framework": "Remotion (React)",
        "port": 3000,
        "studio_port": 3001,
    },
    "tests": {
        "frontend": 75,
        "backend": 73,
        "total": 148,
    }
}
