"""
Game-OS V2.3 FastAPI Backend
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

VERSION = "V2.3 Component-Optimized"
