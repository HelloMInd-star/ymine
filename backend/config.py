"""
Game-OS V2.5.1 FastAPI Backend (备用/模块化版本配置)
============================
Threshold constants shared across all API endpoints — single source of truth
mirroring the frontend YBus.THRESHOLDS constants.
"""

THRESHOLDS = {
    "BREAKEVEN": 0.48,
    "STEADY": 0.50,
    "WARNING": 0.58,
    "FUSE": 0.68,
}

RISK_LEVELS = [
    {"max": THRESHOLDS["BREAKEVEN"], "label": "安全",   "color": "#22c55e", "level": "safe"},
    {"max": THRESHOLDS["STEADY"],    "label": "保本",   "color": "#22d3ee", "level": "breakeven"},
    {"max": 0.58,                    "label": "稳态",   "color": "#f59e0b", "level": "steady"},
    {"max": THRESHOLDS["FUSE"],      "label": "预警",   "color": "#f97316", "level": "warning"},
    {"max": 1.01,                    "label": "熔断",   "color": "#ef4444", "level": "danger"},
]

ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:8000",
    "http://localhost:8501",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5500",
    "http://localhost:8090",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8501",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8090",
    "https://hellomind-star.github.io",
    "null",
]

CORS_SETTINGS = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

VERSION = "V2.5.1 FullStack-Verified"
