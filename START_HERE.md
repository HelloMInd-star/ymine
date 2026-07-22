# 🚀 Game-OS 快速导航

> **博弈论驱动的全域认知操作系统 · V2.2 Batch1**

---

## 📍 从这里开始

| 顺序 | 入口 | 说明 |
|------|------|------|
| 🎯 **第1站** | [index.html](index.html) | **系统总控台仪表盘**（首页入口） |
| 🛠️ **第2站** | [ymine-studio.html](ymine-studio.html) | Y.Mine Studio 全功能控制台 |
| 🧠 **第3站** | MoodMind 金融向量实验室（见下方启动说明） | 金融风险向量监控 |
| 🧬 **第4站** | MS-Lab 心智向量化实验室（见下方启动说明） | 向量嵌入实验平台 |

---

## 📂 项目结构速览

```
Game-OS/
├── index.html              # 🎯 系统总控台（主入口）
├── ymine-studio.html       # 🛠️ Y.Mine Studio 控制台
├── start_all.sh            # 🚀 MoodMind-Lab 一键启动脚本
├── README.md               # 📖 项目完整说明文档
├── START_HERE.md           # 📍 本文件（导航页）
│
├── assets/                 # 🎨 静态资源（CSS/JS/图片）
├── models/                 # 🧮 前端数据模型和配置
├── pages/                  # 📄 独立页面
│
├── engines/                # 🧠 各心智引擎（公开层）
│   ├── airmind/            #    空域心智引擎
│   ├── evolvemind/         #    演化心智引擎
│   ├── financemind/        #    金融心智引擎
│   ├── gamemind/           #    博弈心智引擎
│   ├── geom-compute/       #    几何算力底座
│   ├── mindspeak/          #    心智语言引擎
│   └── moodmind/           #    金融情绪引擎
│
├── engines/*-private-engine/   # 🔒 私有内核（仅接口，闭源）
├── airmind-private-engine/     # 🔒 （旧路径，逐步迁移到 engines/）
├── mindspeak-private-engine/   # 🔒 （旧路径）
├── isomorphism-block-private-engine/    # 🔒 同构拦截私有引擎
├── traditional-culture-vector-private-engine/ # 🔒 文化向量私有引擎
├── ymine-circle-cognitive-engine/       # 🔒 圆锥认知引擎
│
├── labs/                   # 🔬 实验室专区
│   ├── evidence/           #    证据链/实验样本页面
│   └── marketing/          #    营销结构实验室
│
├── moodmind_lab/           # 🧠 MoodMind 金融向量实验室（Streamlit）
├── ms-lab/                 # 🧬 MS-Lab 心智向量化实验室（Streamlit）
├── MemoryBase/             # 💾 记忆基座模块
├── isomorphism-block-engine/  # 🧱 同构拦截引擎
│
├── game-os-main/           # 📦 旧版主程序（归档）
├── docs/                   # 📚 项目文档/架构说明/审计报告
└── tools/                  # 🔧 开发工具/链接校验脚本
```

---

## 🚀 启动服务

### 1. 总控台（纯前端，无需后端）

```bash
cd /workspace
python3 -m http.server 8080
# 打开 http://localhost:8080/index.html
```

### 2. MoodMind 金融向量实验室（Streamlit）

```bash
cd /workspace
bash start_all.sh
# 静态首页: http://localhost:8100
# Streamlit大盘: http://localhost:8510
```

### 3. MS-Lab 心智向量化实验室（Streamlit）

```bash
cd /workspace/ms-lab/mslab_dashboard
streamlit run app.py --server.port 8501 --server.address 0.0.0.0 \
  --server.headless true --server.enableCORS false --theme.base dark
# 打开 http://localhost:8501
```

---

## 📚 文档索引

| 文档 | 位置 |
|------|------|
| 项目主说明 | [README.md](README.md) |
| 架构演进日志 | [docs/PROJECT_EVOLUTION_LOG.md](docs/PROJECT_EVOLUTION_LOG.md) |
| 量化引擎架构 | [docs/QUANT_ENGINE_ARCHITECTURE.md](docs/QUANT_ENGINE_ARCHITECTURE.md) |
| Y.Mine审计报告 | [docs/Y.Mine-项目深度审计报告.md](docs/Y.Mine-项目深度审计报告.md) |
| 定价解码器 | [docs/pricing-decoder.md](docs/pricing-decoder.md) |
| 更多文档 | [docs/](docs/) 目录 |

---

## 🔒 安全红线

- 禁止完整实现 128bit 高精度向量运算（仅预留接口）
- 禁止编写 KMP 底层匹配源码（只接收最终匹配分值）
- 禁止硬编码私有风控公式、金融估值深层算子
- 前端可视化只做展示，禁止嵌入底层数理运算逻辑
- 私有内核全部以 Stub 形式存在，调用抛 `NotImplementedError`

---

*Game-OS V2.2 Batch1 · 2026-07-21*
