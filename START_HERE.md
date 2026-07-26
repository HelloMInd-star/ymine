# 🚀 Game-OS 快速导航

> **博弈论驱动的全域认知操作系统 · V2.2 P0-Rectified**

---

## 📍 从这里开始（30秒上手）

| 顺序 | 入口 | 说明 |
|------|------|------|
| 🎯 **第1站** | [index.html](index.html) | **系统总控台仪表盘** — 推荐第一个打开，所有模块的导航入口 |
| 🛠️ **第2站** | [ymine-studio.html](ymine-studio.html) | YMine Studio 全功能控制台 |
| 🧪 **第3站** | [labs/evidence/circle-lab.html](labs/evidence/circle-lab.html) | 锥心博弈沙盘（核心理论可视化） |
| 📊 **第4站** | [labs/evidence/finance-risk-simulator.html](labs/evidence/finance-risk-simulator.html) | 金融风险压力测试实验室 |

---

## 📂 核心目录速览

| 目录 | 说明 | 文档 |
|------|------|------|
| [engines/](engines/) | 🧠 七大独立认知引擎（核心能力层） | [engines/README.md](engines/README.md) |
| [labs/](labs/) | 🔬 39个仿真实验入口 · 全域仿真实验向量总管理台（验证层） | [labs/README.md](labs/README.md) |
| [game-os-main/](game-os-main/) | ⚙️ Node.js后端内核（执行层） | [game-os-main/README.md](game-os-main/README.md) |
| `*-private-engine/` | 🔒 私有涉密引擎（物理隔离，仅Stub） | — |
| [assets/](assets/) | 🎨 静态资源（CSS/JS） | — |
| [docs/](docs/) | 📚 审计报告、架构文档 | — |
| [tools/](tools/) | 🔧 开发工具、链接校验脚本 | — |

---

## 🚀 启动方式

### 纯前端（推荐，无需后端）

```bash
cd /workspace
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

### MoodMind 金融情绪实验室（可选，Streamlit）

```bash
cd /workspace
bash start_all.sh
# 静态首页: http://localhost:8100
```

---

## 📚 阅读推荐

1. **先看README**：[README.md](README.md) — 项目完整介绍、核心亮点、架构总览
2. **再开总控台**：[index.html](index.html) — 可视化导航所有模块
3. **深入引擎**：[engines/README.md](engines/README.md) — 七大引擎职责详解
4. **体验实验**：[labs/README.md](labs/README.md) — 39个实验入口分类导览（横向滚动总览）

---

## 🛡️ 安全红线（不可逾越）

- **0.68锥心引力**：所有决策置信度超过0.68必须强制熔断
- **canBypass=false**：七层熔断开关不可绕过、不可关闭
- **三模型审计**：单一模型输出不得直接执行，必须三角校验
- **公私分离**：私有核心算法仅存于`*-private-engine/`，公开层只有接口
- **前端不运算**：浏览器只做可视化展示，禁止嵌入底层数理逻辑

---

*Game-OS V2.2 P0-Rectified · 圆锥博弈论驱动*
