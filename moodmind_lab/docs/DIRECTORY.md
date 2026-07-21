# MoodMind-Lab 目录结构说明 (Batch1)

```
moodmind_lab/
├── scripts/                      # 启停与验收脚本
│   ├── start_all.sh              # 一键整套启动（加载 global.env）
│   ├── stop_all.sh               # 一键关停
│   ├── batch1_verify.sh          # Batch1 红线自检（8大类检查）
│   ├── batch2_verify.sh          # Batch2 验收（占位）
│   └── batch3_verify.sh          # Batch3 验收（占位）
│
├── public_static/                # 8100 静态深空风格首页
│   ├── index.html                # 实验室名称/批次状态/跳转按钮/11维+光照说明/RBAC演示
│   └── assets/
│       └── deepspace.css         # 深空主题样式（外置）
│
├── moodmind_dashboard/           # 8510 Streamlit 金融大盘
│   ├── app.py                    # 主入口（set_page_config + 侧栏导航 + 主题注入）
│   ├── theme.py                  # 深空主题CSS、PAGE_CONFIG、角色配色
│   ├── private_engine_stub.py    # 🔴核心红线文件：7个Stub类/39接口NotImplementedError
│   └── pages/                    # 8个子面板
│       ├── __init__.py           # 页面注册表 PAGES
│       ├── overview.py           # 📊 总览面板
│       ├── risk.py               # ⚠️ 球面风险监控
│       ├── lighting.py           # 💡 四维光照
│       ├── kmp.py                # 🔗 KMP匹配
│       ├── alerts.py             # 🚨 独立告警中心
│       ├── redline.py            # 🔴 红线验证（39接口动态自检）
│       ├── export_limit.py       # 📤 导出限制
│       └── config_page.py        # ⚙️ 系统配置
│
├── public_api/                   # 对外推送 MS-Lab 接口层（Batch2实现）
│   ├── __init__.py
│   ├── vector_sender.py          # 11维向量推送 + 告警推送
│   └── kmp_score_sender.py       # KMP分值接收器 + MS-Lab推送
│
├── market_data_gate/             # 行情数据接收外壳（Batch2实现）
│   └── __init__.py               # MarketDataGate 接收tick/kline，不做计算
│
├── moodmind_storage_main/        # 金融向量总库持久化目录（四级子库）
│   ├── trash/                    # 噪声库（KMP相似度<0.25）
│   ├── buffer/                   # 缓冲库（0.25~0.50）
│   ├── normal/                   # 常规库（0.50~0.75）
│   └── knowledge/                # 知识库（≥0.75）
│
├── billing_log/                  # Token计费日志目录
├── alert_log/                    # 独立告警日志目录
│
├── security/                     # 安全配置
│   ├── rbac_role.json            # 三级RBAC角色/权限定义
│   ├── aes_config.json           # AES-256-GCM加密配置
│   └── private_placeholder.json  # 私有内核占位说明与docking points
│
├── config/
│   └── global.env                # 全局环境变量（端口/推送地址/导出上限）
│
├── docs/
│   ├── API.md                    # 对外API/字段/对接点位/拓扑
│   ├── SECURITY.md               # 7条红线/RBAC/加密规范
│   └── DIRECTORY.md              # 本文件
│
├── requirements.txt              # Python依赖（streamlit/plotly/pandas/cryptography/requests/python-dotenv）
│
├── .logs/                        # 运行日志（启动时生成，.gitignore）
└── .pids/                        # PID文件（启动时生成，.gitignore）
```

## 严禁创建/纳入的目录

- `private_moodmind_engine/` 私有内核目录 —— 单独本地留存，父级 `../private_moodmind_engine/`，不纳入本工程代码仓库。

## 端口规划

| 端口 | 服务 | 说明 |
|------|------|------|
| 8100 | 静态首页 | public_static via `python -m http.server` |
| 8510 | Streamlit大盘 | moodmind_dashboard via `streamlit run` |
| 8090 | Y.Mine总控台 | 对端，已存在 |
| 8501 | MS-Lab | 对端，已存在 |

## 一键启动

```bash
cd /workspace
bash moodmind_lab/scripts/start_all.sh     # 启动
bash moodmind_lab/scripts/stop_all.sh      # 停止
bash moodmind_lab/scripts/batch1_verify.sh # Batch1红线自检
```

或使用 `/workspace/start_all.sh`（严格对齐示例两行写法）：
```bash
cd /workspace
bash start_all.sh
```
