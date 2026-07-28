"""
================================================================================
                    VECTOR REALITY PROTOCOL · 全局阈值配置
================================================================================
  Version: V2.5.1 FullStack-Verified (Audit-Fixed)
  Date: 2026-07-28
  Features:
    ✓ 真实算法引擎
    ✓ FastAPI REST API (9个端点)
    ✓ Streamlit 数据仪表盘
    ✓ Remotion 视频生成
    ✓ 75个前端测试 + 73个后端测试 = 148项测试
    ✓ V2.5.1修复：阈值键名大写、CORS白名单、HTTP状态码规范
================================================================================
"""

VERSION = "V2.5.1 FullStack-Verified"
VERSION_DATE = "2026-07-28"

THRESHOLDS = {
    "BREAKEVEN": 0.48,
    "STEADY": 0.50,
    "FUSE": 0.68,
    "MAX_DRAWDOWN": 0.15,
    "STORM_INTENSITY_HIGH": 80,
    "STORM_ENERGY_DANGER": 70,
}

ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:8501",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5500",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8501",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
]

CORS_SETTINGS = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
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
        "api_endpoints": 9,
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
