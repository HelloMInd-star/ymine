"""MS-Lab Streamlit 深空蓝主题样式注入 (Batch1)"""

DEEP_SPACE_CSS = """
<style>
    /* ===== 全局深空蓝星空主题 ===== */
    .stApp {
        background: linear-gradient(180deg, #060a1f 0%, #0a0f2c 40%, #0b1238 100%);
    }
    .stApp::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6) 50%, transparent 100%),
            radial-gradient(1px 1px at 80% 10%, rgba(180,200,255,0.5) 50%, transparent 100%),
            radial-gradient(1px 1px at 30% 70%, rgba(200,220,255,0.4) 50%, transparent 100%),
            radial-gradient(2px 2px at 60% 50%, rgba(255,255,255,0.3) 50%, transparent 100%),
            radial-gradient(1px 1px at 90% 85%, rgba(255,255,255,0.5) 50%, transparent 100%),
            radial-gradient(1px 1px at 45% 35%, rgba(160,200,255,0.35) 50%, transparent 100%);
        background-size: 100% 100%;
        pointer-events: none;
        z-index: 0;
    }
    .block-container {
        padding-top: 1.2rem;
        padding-bottom: 3rem;
        max-width: 1440px;
    }

    /* ===== 顶部品牌头 ===== */
    .mslab-header {
        background: linear-gradient(135deg, rgba(30,58,138,0.55) 0%, rgba(79,70,229,0.35) 50%, rgba(14,165,233,0.30) 100%);
        border: 1px solid rgba(129,140,248,0.25);
        border-radius: 14px;
        padding: 18px 24px;
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
    }
    .mslab-header::after {
        content: "";
        position: absolute;
        right: -40px; top: -40px;
        width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%);
        border-radius: 50%;
    }
    .mslab-title {
        font-size: 26px;
        font-weight: 700;
        color: #e0e7ff;
        letter-spacing: 1px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .mslab-title .logo {
        font-size: 32px;
    }
    .mslab-subtitle {
        color: #93c5fd;
        font-size: 13px;
        margin-top: 6px;
        font-family: 'SF Mono', 'Consolas', monospace;
    }
    .mslab-pills {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    .mslab-pill {
        font-size: 11px;
        padding: 3px 10px;
        border-radius: 20px;
        font-family: 'SF Mono', 'Consolas', monospace;
        border: 1px solid;
    }
    .pill-v3   { background: rgba(124,58,237,0.2); border-color: rgba(167,139,250,0.5); color: #c4b5fd; }
    .pill-b1   { background: rgba(16,185,129,0.15); border-color: rgba(52,211,153,0.4); color: #6ee7b7; }
    .pill-b2   { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fcd34d; }
    .pill-b3   { background: rgba(100,116,139,0.2); border-color: rgba(148,163,184,0.3); color: #94a3b8; }

    /* ===== KPI卡片 ===== */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 20px;
    }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 680px)  { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-card {
        background: rgba(14, 20, 42, 0.85);
        border: 1px solid rgba(80,120,255,0.15);
        border-radius: 12px;
        padding: 16px 18px;
        position: relative;
        overflow: hidden;
    }
    .kpi-card::before {
        content: "";
        position: absolute; top:0; left:0; right:0; height: 3px;
    }
    .kpi-card.kpi-blue::before   { background: linear-gradient(90deg, #3b82f6, #06b6d4); }
    .kpi-card.kpi-cyan::before   { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
    .kpi-card.kpi-purple::before { background: linear-gradient(90deg, #8b5cf6, #ec4899); }
    .kpi-card.kpi-amber::before  { background: linear-gradient(90deg, #f59e0b, #f97316); }
    .kpi-card.kpi-green::before  { background: linear-gradient(90deg, #10b981, #34d399); }
    .kpi-card.kpi-red::before    { background: linear-gradient(90deg, #ef4444, #f97316); }
    .kpi-card.kpi-slate::before  { background: linear-gradient(90deg, #64748b, #94a3b8); }
    .kpi-label {
        font-size: 11px;
        color: #7a86b4;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 6px;
    }
    .kpi-value {
        font-size: 24px;
        font-weight: 700;
        color: #e8edff;
        font-family: 'SF Mono', 'Consolas', monospace;
    }
    .kpi-sub {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 4px;
    }

    /* ===== 区块面板 ===== */
    .section-panel {
        background: rgba(14, 20, 42, 0.7);
        border: 1px solid rgba(80,120,255,0.12);
        border-radius: 14px;
        padding: 18px 20px;
        margin-bottom: 18px;
    }
    .section-title {
        font-size: 15px;
        font-weight: 600;
        color: #c7d2fe;
        margin: 0 0 14px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(129,140,248,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .section-title .st-icon { font-size: 16px; }

    /* ===== 存储分层卡片 ===== */
    .tier-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }
    @media (max-width: 1100px) { .tier-grid { grid-template-columns: repeat(2, 1fr); } }
    .tier-card {
        border-radius: 10px;
        padding: 14px;
        position: relative;
    }
    .tier-trash     { background: rgba(100,116,139,0.15); border:1px solid rgba(100,116,139,0.3); }
    .tier-buffer    { background: rgba(251,191,36,0.10); border:1px solid rgba(251,191,36,0.3); }
    .tier-normal    { background: rgba(59,130,246,0.10); border:1px solid rgba(59,130,246,0.3); }
    .tier-knowledge { background: rgba(16,185,129,0.10); border:1px solid rgba(16,185,129,0.35); }
    .tier-name {
        font-size: 13px; font-weight: 600;
        display: flex; align-items: center; gap: 6px;
        margin-bottom: 8px;
    }
    .tier-trash .tier-name     { color: #cbd5e1; }
    .tier-buffer .tier-name    { color: #fcd34d; }
    .tier-normal .tier-name    { color: #93c5fd; }
    .tier-knowledge .tier-name { color: #6ee7b7; }
    .tier-stat-row { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .tier-stat-val { color: #e8edff; font-family: 'SF Mono','Consolas',monospace; font-weight:600; }
    .tier-bar {
        height: 5px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden;
        margin-top: 8px;
    }
    .tier-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
    .tier-trash .tier-bar-fill     { background: linear-gradient(90deg, #64748b, #94a3b8); }
    .tier-buffer .tier-bar-fill    { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .tier-normal .tier-bar-fill    { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .tier-knowledge .tier-bar-fill { background: linear-gradient(90deg, #10b981, #34d399); }

    /* ===== 告警条目 ===== */
    .alert-item {
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 12px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
    }
    .alert-crit  { background: rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); }
    .alert-warn  { background: rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); }
    .alert-info  { background: rgba(59,130,246,0.10); border:1px solid rgba(59,130,246,0.25); }
    .alert-ok    { background: rgba(16,185,129,0.10); border:1px solid rgba(16,185,129,0.25); }
    .alert-ts    { color: #64748b; font-family: 'SF Mono','Consolas',monospace; font-size:11px; white-space:nowrap; }
    .alert-msg   { color: #cbd5e1; flex:1; }
    .alert-level-crit { color: #fca5a5; font-weight: 600; }
    .alert-level-warn { color: #fcd34d; font-weight: 600; }
    .alert-level-info { color: #93c5fd; font-weight: 600; }
    .alert-level-ok   { color: #6ee7b7; font-weight: 600; }

    /* ===== 红线声明面板 ===== */
    .redline-box {
        background: rgba(127,29,29,0.15);
        border: 1px solid rgba(239,68,68,0.35);
        border-radius: 10px;
        padding: 14px 18px;
    }
    .redline-title {
        color: #fca5a5;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
        display: flex; align-items: center; gap: 6px;
    }
    .redline-list {
        margin: 0; padding-left: 18px;
        font-size: 11px; color: #fca5a5; line-height: 1.8;
    }

    /* ===== 批次进度 ===== */
    .batch-row {
        display: flex; gap: 10px; margin-top: 4px; flex-wrap: wrap;
    }
    .batch-chip {
        font-size: 11px; padding: 4px 12px; border-radius: 20px;
        font-family: 'SF Mono','Consolas',monospace; font-weight:600;
    }
    .batch-done { background: rgba(16,185,129,0.15); color:#6ee7b7; border:1px solid rgba(16,185,129,0.4); }
    .batch-next { background: rgba(251,191,36,0.12); color:#fcd34d; border:1px solid rgba(251,191,36,0.4); }
    .batch-todo { background: rgba(100,116,139,0.2); color:#94a3b8; border:1px solid rgba(148,163,184,0.3); }

    /* ===== 权限徽章 ===== */
    .perm-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 12px; border-radius: 20px;
        font-size: 11px; font-weight: 600;
        font-family: 'SF Mono','Consolas',monospace;
    }
    .perm-op  { background: rgba(59,130,246,0.15); color:#93c5fd; border:1px solid rgba(59,130,246,0.4); }
    .perm-arc { background: rgba(168,85,247,0.15); color:#d8b4fe; border:1px solid rgba(168,85,247,0.4); }
    .perm-adm { background: rgba(239,68,68,0.12);  color:#fca5a5; border:1px solid rgba(239,68,68,0.4); }

    /* ===== Streamlit组件覆盖 ===== */
    .stMetric { background: rgba(14,20,42,0.6); border:1px solid rgba(80,120,255,0.12); border-radius:10px; padding:10px 14px; }
    div[data-testid="stSidebar"] { background: rgba(7,10,26,0.9) !important; border-right:1px solid rgba(80,120,255,0.15); }
    div[data-testid="stSidebar"] .stMarkdown { color:#cbd5e1; }
    .stButton > button {
        background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2));
        border: 1px solid rgba(129,140,248,0.4);
        color: #e0e7ff;
        border-radius: 8px;
        transition: all 0.2s;
    }
    .stButton > button:hover {
        background: linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4));
        border-color: rgba(129,140,248,0.7);
        color: #fff;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background: rgba(14,20,42,0.5);
        padding: 4px;
        border-radius: 10px;
    }
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        color: #94a3b8;
        border-radius: 8px;
        padding: 6px 16px;
    }
    .stTabs [aria-selected="true"] {
        background: rgba(59,130,246,0.25) !important;
        color: #e0e7ff !important;
    }
    .stAlert { background: rgba(14,20,42,0.7) !important; border:1px solid rgba(80,120,255,0.2); }
    div[data-testid="stDataFrame"] { border:1px solid rgba(80,120,255,0.12); border-radius: 10px; overflow:hidden; }
    .stDownloadButton > button {
        background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(34,211,238,0.2));
        border: 1px solid rgba(52,211,153,0.4);
        color: #a7f3d0;
        border-radius: 8px;
    }
    .stDownloadButton > button:hover {
        background: linear-gradient(135deg, rgba(16,185,129,0.4), rgba(34,211,238,0.4));
        color: #fff;
    }
    .stSelectbox label, .stTextInput label, .stNumberInput label { color: #c7d2fe !important; }
    footer { visibility: hidden; }
    #MainMenu { visibility: hidden; }
</style>
"""

def render_theme():
    import streamlit as st
    st.markdown(DEEP_SPACE_CSS, unsafe_allow_html=True)

def render_header(perm_level: str = "operator"):
    import streamlit as st
    perm_map = {
        "operator": ("perm-op", "👤 普通操作员"),
        "architect": ("perm-arc", "🏛️ 架构审核"),
        "admin": ("perm-adm", "👑 最高管理员"),
    }
    pcls, plabel = perm_map.get(perm_level, perm_map["operator"])
    st.markdown(f"""
    <div class="mslab-header">
        <div class="mslab-title">
            <span class="logo">🧠</span>
            <span>MindSpeak Embedding Lab</span>
            <span style="font-size:12px;color:#93c5fd;font-family:'SF Mono',Consolas,monospace;font-weight:400">
                MS-Lab · Game-OS V3.0 实验室集群
            </span>
        </div>
        <div class="mslab-subtitle">
            心智向量化实验室 · 与 MoodMind 金融向量实验室同级 · 上层：几何心智空间算力错峰调度底座
        </div>
        <div class="mslab-pills">
            <span class="mslab-pill pill-v3">Game-OS V3.0</span>
            <span class="mslab-pill pill-b1">Batch1 ✓ 已交付</span>
            <span class="mslab-pill pill-b2">Batch2 待开发</span>
            <span class="mslab-pill pill-b3">Batch3 待开发</span>
            <span class="perm-badge {pcls}" style="margin-left:auto">{plabel}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
