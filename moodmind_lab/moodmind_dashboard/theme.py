"""MoodMind-Lab 深空主题配置 — Batch1 骨架版"""

DEEPSPACE_CSS = """
<style>
    .stApp {
        background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%);
    }
    .main .block-container { padding-top: 2rem; max-width: 1400px; }
    .section-title {
        font-size: 26px; font-weight: 700;
        background: linear-gradient(90deg, #9370db, #da70d6, #87ceeb);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        margin: 1rem 0 1.2rem 0; letter-spacing: 1px;
    }
    .section-desc { color: #9370db; font-size: 13px; margin-bottom: 20px; letter-spacing: 2px; }
    .metric-card {
        background: rgba(20,10,40,0.6);
        border: 1px solid rgba(147,112,219,0.3);
        border-radius: 12px; padding: 20px;
        backdrop-filter: blur(10px);
    }
    .metric-value { font-size: 32px; font-weight: 700; color: #ba55d3; }
    .metric-label { font-size: 12px; color: #888; margin-top: 5px; }
    .placeholder-card {
        background: rgba(0,0,0,0.3);
        border: 1px dashed rgba(147,112,219,0.4);
        border-radius: 12px; padding: 40px; text-align: center;
        color: #888;
    }
    .ph-icon { font-size: 48px; opacity: 0.4; margin-bottom: 15px; }
    .redline-banner {
        background: linear-gradient(90deg, rgba(231,76,60,0.15), rgba(192,57,43,0.08));
        border: 1px solid rgba(231,76,60,0.4);
        border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;
        color: #f5b7b1; font-size: 13px; line-height: 1.7;
    }
    .redline-banner b { color: #e74c3c; }
    .notimpl-card {
        padding: 8px 12px; border-radius: 6px; margin: 4px 0;
        font-family: monospace; font-size: 12px;
        background: rgba(231,76,60,0.08); border-left: 3px solid #e74c3c;
    }
    .ni-name { color: #e74c3c; font-weight: 600; }
    .role-badge {
        display: inline-block; padding: 4px 12px; border-radius: 12px;
        font-size: 12px; font-weight: 600; margin-right: 8px;
    }
    .role-admin { background: rgba(255,71,87,0.2); color: #ff4757; border: 1px solid #ff4757; }
    .role-architect { background: rgba(243,156,18,0.2); color: #f39c12; border: 1px solid #f39c12; }
    .role-operator { background: rgba(52,152,219,0.2); color: #3498db; border: 1px solid #3498db; }
    .storage-bar { height: 22px; border-radius: 11px; background: rgba(255,255,255,0.08); overflow: hidden; margin: 6px 0; }
    .storage-fill { height: 100%; display: flex; align-items: center; padding-left: 10px; font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.7); border-radius: 11px; }
    .alert-item { padding: 10px 12px; border-radius: 6px; margin: 6px 0; font-size: 13px; }
    .alert-ok { background: rgba(46,204,113,0.1); border-left: 3px solid #2ecc71; }
    .alert-info { background: rgba(52,152,219,0.1); border-left: 3px solid #3498db; }
    .alert-warn { background: rgba(243,156,18,0.1); border-left: 3px solid #f39c12; }
    [data-testid="stSidebar"] { background: rgba(10,5,25,0.85); }
    [data-testid="stSidebar"] .stMarkdown { color: #c0c0e0; }
    .stButton button {
        background: linear-gradient(135deg, #9370db, #663399) !important;
        color: white !important; border: none !important;
    }
</style>
"""

PAGE_CONFIG = {
    "page_title": "MoodMind-Lab · 金融向量实验室",
    "page_icon": "🧠",
    "layout": "wide",
    "initial_sidebar_state": "expanded",
    "menu_items": {
        "About": "🧠 MoodMind-Lab · 金融向量实验室 · Batch1 骨架版\nGame-OS 几何心智算力底座"
    }
}

ROLE_COLORS = {
    "admin": "#ff4757",
    "architect": "#f39c12",
    "operator": "#3498db",
}
