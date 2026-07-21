"""MoodMind-Lab 页面模块"""
from .overview import page_overview
from .risk import page_risk
from .lighting import page_lighting
from .kmp import page_kmp
from .alerts import page_alerts
from .redline import page_redline
from .export_limit import page_export_limit
from .config_page import page_config

PAGES = [
    ("📊", "总览面板", page_overview),
    ("⚠️", "球面风险监控", page_risk),
    ("💡", "四维光照", page_lighting),
    ("🔗", "KMP匹配", page_kmp),
    ("🚨", "独立告警中心", page_alerts),
    ("🔴", "红线验证", page_redline),
    ("📤", "导出限制", page_export_limit),
    ("⚙️", "系统配置", page_config),
]
