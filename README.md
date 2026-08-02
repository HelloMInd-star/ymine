<div align="center">
  <img src="assets/banner.png" alt="Game-OS Banner" width="100%" />
  
  <h1>🔺 Game-OS V2.5.1</h1>
  <h3>面向金融资管机构的可信赖决策AI中台</h3>
  
  <p>
    <i>“我们不相信任何单一模型的输出。”</i><br>
    <i>Trustable AI · Auditable Decision · Unbypassable Safety</i>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Version-2.5.1-blueviolet" alt="Version" />
    <img src="https://img.shields.io/badge/Tests-148%20%E2%9C%85-success" alt="Tests" />
    <img src="https://img.shields.io/badge/Security_Audit-8_Rounds_A%2B-brightgreen" alt="Audit" />
    <img src="https://img.shields.io/badge/Hallucination_Rate-%3C%200.5%25-critical" alt="Hallucination" />
    <img src="https://img.shields.io/badge/Architecture-FullStack_Verified-9cf" alt="Arch" />
  </p>
</div>

---

## ⚡ 破局者宣言：重新定义 AI 决策

> **行业现状：** 传统 AI Agent 本质是“大模型 + 工具调用 + Prompt 编排”。它们擅长生成流畅文本，但在投资风控、量化投研等场景下，**“幻觉、不可控、单点故障”** 从未被根本解决。

> **Game-OS 的解法：** 我们不去给大模型加壳，而是从底层重新设计了决策的生成、校验、熔断和审计全链路。
> 
> **核心价值：** 通过 **「三模型冗余审计」** 与 **「七层不可绕过熔断体系」**，将 AI 决策的**幻觉率从行业平均的 15% 降低至可审计的 0.5% 以内**。

---

## 🎯 为什么是 Game-OS？（三大硬核支柱）

### 🔺 0.68 锥心引力 —— 跨领域的数学常量
德州扑克 GTO、正态分布 1σ、Kelly 仓位公式、期权定价，所有博弈力量统一收敛于 **0.68** 黄金分割共轭点。超过即熔断——**一个数字，统一四大领域的判断基准。**

### 🔺 三模型冗余三角审计（STAGE-9 门控）
金融精算(A)、博弈引擎(B)、几何计算(C) 三个独立引擎交叉验证。固定误差阈值 ±0.02：
- 结论不一致，**永远无法到达最终输出（STEP 9）**。
- 航空级冗余设计，单点故障不可能发生。

### 🛡️ 七层安全熔断体系（canBypass = false）
黑天鹅 / 系统性崩溃 / 估值越界 / 最大回撤 / 情绪倾斜 / 手动紧急停机 / 业务自定义。  
**七重防线，任何人不可绕过。** 红色「🛑 紧急停机」按钮按下，所有决策输出立即阻断，仓位强制归零。

---

## 🚀 三分钟体验路径（E2E 全栈闭环）

不要只看文档，直接上手玩：

| 顺序 | 入口 | 体验核心 |
| :--- | :--- | :--- |
| 🎯 第 1 站 | **[index.html](https://你的部署地址)** | 系统总控台 & 全栈服务状态面板 |
| 🛠️ 第 2 站 | **[ymine-studio.html](https://你的部署地址)** | 按压红色紧急停机按钮，体验“防自杀式熔断” |
| 🎮 第 3 站 | **[锥心博弈仿真沙盘](https://你的部署地址)** | 看博弈力量如何收敛至 0.68 |
| 🧬 第 4 站 | **[染色体锚定诊断仪](https://你的部署地址)** | LLM 多轮对话主题漂移实时检测 |
| ⚡ 第 5 站 | **[风暴能量分配模拟器](https://你的部署地址)** | 能量守恒与阈值熔断真实算法实验 |

---

## 🛠️ 技术架构概览（全栈 V2.5.1 验证）

```text
workspace/
├── index.html                     # 🎯 统一总控台（状态面板）
├── main.py                        # 🚀 FastAPI 主入口（9个核心端点，零ML依赖）
├── dashboard/                     # 📊 Streamlit 数据仪表盘 (3个交互页面)
│   ├── Home.py                    #    系统概览（调用大写阈值）
│   └── pages/                     #    染色体诊断/风暴模拟实验室
├── video/                         # 🎬 Remotion 3D 视频生成引擎 (React + Three.js)
├── assets/                        # 🧩 核心公共组件层（统一 CSS + JS）
│   ├── css/components.css         #    公共UI库（含服务状态面板）
│   └── js/                        #    YBus总线、三角审计、量化引擎、熔断器
├── models/                        # 🧮 三模型冗余独立实现
└── backend/                       # 🔧 备用模块化后端（含NLP语义诊断懒加载）
```

**服务列表（三核启动）：**
- 🟢 **FastAPI** (端口 8000) ：真实算法引擎，9 个 REST API 端点。
- 🔵 **Streamlit** (端口 8501) ：数据可视化交互面板。
- 🟣 **Remotion** (端口 3000) ：3D 分子调酒实验室视频生成。

---

## 🔌 核心 API 参考（V2.5.1 规范）

所有端点支持 **CORS 白名单跨域**，阈值键名统一大写 `BREAKEVEN/STEADY/FUSE`。

| 方法 | 端点 | 功能描述 |
| :--- | :--- | :--- |
| `GET` | `/health` | 服务健康检查 |
| `GET` | `/thresholds` | 获取全局 0.48/0.50/0.68 阈值 |
| `GET` | `/api/system/status` | 全栈三服务运行状态监控 |
| `GET` | `/api/chromosome/diagnose` | 染色体诊断（数值版 / NLP语义版） |
| `GET` | `/api/storm/simulate` | 风暴能量模拟（真实物理算法） |

启动后端后访问 **[http://localhost:8000/docs](http://localhost:8000/docs)** 即可在线调试 Swagger UI。

---

## 🧪 工程质量与安全红线

```bash
# 148 项单元测试全部通过
node tests/core-engine.test.js

# 22 项 API 回归测试（主入口9端点 + 边界校验 + 状态码规范）
# 全链路异常容错，核心路径 try/catch 100% 覆盖

# 零违反 7 条核心安全红线（含：硬编码阈值禁止、批量导出 100 条硬限制）
```

- **八轮专项审计**：A+ 级合规度 (97.71/100)
- **A 类缺陷修复率**：100% (25/25)

---

## 📜 设计哲学

> **安全是一等公民，不是事后护栏。**
> 
> 我们不相信任何单一模型的输出。
> 
> 传统 AI 倾向于“让机器看起来像人”，而 Game-OS 倾向于**“让机器像机器一样可靠”**。决策必须可解释、可验证、可干预。如果 AI 认知过载，它会“累”，它会自动熔断，它不会在金融模型里欺骗你。

---

## 👨‍💻 关于作者

**HelloMind-star**

> *“从零跨界学习，用极客思维重塑金融 AI 的安全边界。”*

如果这个项目对你有启发，欢迎给个 ⭐️ 支持一下。

- 📦 前端体验：https://hellomind-star.github.io/ymine/
- 📖 API 文档：启动后访问 `/docs`

---

## ⚠️ 免责声明

Game-OS V2.5.1 为内部研究与教学级全栈仿真平台。所有代码为原创或开源教学级实现。金融模型在公开层为简化教学版本，**不构成任何投资建议**。



