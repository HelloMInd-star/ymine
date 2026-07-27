# 🚀 Game-OS V2.5 · 金融可信决策AI中台 快速启动指南

> **面向金融资管机构的可信赖决策AI中台 · V2.5 FullStack-Verified**

---

## 📍 从这里开始（30秒上手）

| 顺序 | 入口 | 说明 |
|------|------|------|
| 🎯 **第1站** | [index.html](index.html) | **系统总控台仪表盘** — 推荐第一个打开，V2.5新增全栈服务状态面板 |
| 🛠️ **第2站** | [ymine-studio.html](ymine-studio.html) | YMine Studio 全功能控制台 |
| 🧪 **第3站** | [labs/evidence/circle-lab.html](labs/evidence/circle-lab.html) | 锥心博弈沙盘（核心理论可视化） |
| 📊 **第4站** | [labs/evidence/finance-risk-simulator.html](labs/evidence/finance-risk-simulator.html) | 金融风险压力测试实验室 |
| 🧬 **第5站** | [labs/evidence/chromosome_diagnostic.html](labs/evidence/chromosome_diagnostic.html) | 🆕 染色体锚定诊断仪（真实算法API） |
| ⚡ **第6站** | [labs/evidence/storm_energy_simulator.html](labs/evidence/storm_energy_simulator.html) | 🆕 风暴能量分配模拟器（真实算法API） |

---

## 📂 核心目录速览

| 目录 | 说明 | 文档 |
|------|------|------|
| [engines/](engines/) | 🧠 七大独立认知引擎（核心能力层） | [engines/README.md](engines/README.md) |
| [labs/](labs/) | 🔬 45个仿真实验入口 · 全域仿真实验向量总管理台（验证层） | [labs/README.md](labs/README.md) |
| [game-os-main/](game-os-main/) | ⚙️ Node.js后端内核（执行层） | [game-os-main/README.md](game-os-main/README.md) |
| [assets/](assets/) | 🎨 静态资源（CSS公共组件库/JS引擎总线） | [assets/css/components.css](assets/css/components.css) |
| [backend/](backend/) | 🚀 FastAPI后端服务（备用） | [main.py](main.py) |
| [video/](video/) | 🎬 Remotion视频生成（React+Three.js） | [video/package.json](video/package.json) |
| [docs/](docs/) | 📚 审计报告、架构文档（七轮审计） | — |
| [tests/](tests/) | ✅ 单元测试套件（148项测试） | [tests/runner.html](tests/runner.html) |
| [tools/](tools/) | 🔧 开发工具、链接校验脚本 | — |
| `*-private-engine/` | 🔒 私有涉密引擎（物理隔离，仅Stub） | — |

---

## 🚀 启动方式

### 纯前端（推荐，无需后端）

```bash
cd /workspace
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

### FastAPI 后端（推荐，支持API调用）

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API文档：http://localhost:8000/docs
```

### Streamlit 数据仪表盘（可选）

```bash
pip install streamlit pandas numpy plotly
streamlit run dashboard/Home.py
# 访问：http://localhost:8501
```

### Remotion 视频生成（可选）

```bash
cd video && npm install
npm run dev
# 访问：http://localhost:3000
```

### MoodMind 金融情绪实验室（可选，Streamlit）

```bash
cd /workspace
bash start_all.sh
# 静态首页: http://localhost:8100
```

---

## 📚 阅读推荐

1. **先看README**：[README.md](README.md) — 项目完整介绍、核心亮点、架构总览、API文档
2. **再开总控台**：[index.html](index.html) — 可视化导航所有模块，V2.5新增全栈服务状态面板
3. **深入引擎**：[engines/README.md](engines/README.md) — 七大引擎职责详解
4. **体验实验**：[labs/README.md](labs/README.md) — 45个实验入口分类导览（横向滚动总览）
5. **API文档**：http://localhost:8000/docs — Swagger UI自动生成文档（需启动FastAPI）

---

## 🛡️ 安全红线（不可逾越）

- **0.68锥心引力**：所有决策置信度超过0.68必须强制熔断
- **canBypass=false**：七层熔断开关不可绕过、不可关闭
- **三模型审计**：单一模型输出不得直接执行，必须三角校验
- **公私分离**：私有核心算法仅存于`*-private-engine/`，公开层只有接口
- **前端不运算**：浏览器只做可视化展示，禁止嵌入底层数理逻辑

---

## 📊 V2.5 全栈服务端口

| 服务 | 框架 | 端口 | 启动命令 |
|------|------|------|---------|
| 前端总控台 | HTML/CSS/JS | 8080 | `python3 -m http.server 8080` |
| FastAPI后端 | Python | 8000 | `uvicorn main:app --reload` |
| Streamlit仪表盘 | Python | 8501 | `streamlit run dashboard/Home.py` |
| Remotion视频 | React | 3000 | `cd video && npm run dev` |
| API文档 | Swagger UI | 8000 | http://localhost:8000/docs |

---

*Game-OS V2.5 FullStack-Verified · 圆锥博弈论驱动 · 148项测试全部通过*
