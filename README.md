<div align="center">

# 🔺 Game-OS V2.5

### 博弈论驱动的全域认知操作系统 · FullStack-Verified

> **全球首个以「圆锥博弈论」为统一数学基座，融合博弈论、控制论、认知科学、量化金融四大学科的跨领域决策操作系统——不是给大模型加壳，而是从底层重新设计了决策的生成、校验、熔断和审计全链路。V2.5实现FastAPI+Streamlit+Remotion全栈验证。**

[![Version](https://img.shields.io/badge/version-V2.5_FullStack--Verified-blueviolet)](#)
[![Audit](https://img.shields.io/badge/audit-7%E8%BD%AE%E9%80%9A%E8%BF%87-success)](#)
[![Tests](https://img.shields.io/badge/tests-148%20passed-brightgreen)](#)
[![Compliance](https://img.shields.io/badge/compliance-97.71%2F100_(A%2B)-orange)](#)

**三阈值基准 · 0.48保本 / 0.50稳态 / 0.68熔断**

[🚀 快速启动](#-30秒快速启动) ·
[🎯 体验路径](#-推荐体验路径) ·
[⚡ 核心亮点](#-核心亮点) ·
[🏗️ 架构总览](#️-架构总览) ·
[🔌 API文档](#-rest-api-端点速查) ·
[🛡️ 安全红线](#️-七条安全红线) ·
[🧪 运行测试](#-单元测试)

</div>

---

## 📑 快速导航

- [一句话定位](#-game-os-v25)
- [30秒快速启动](#-30秒快速启动)
- [全栈服务启动指南](#-全栈服务启动指南)
- [推荐体验路径](#-推荐体验路径)
- [核心亮点](#-核心亮点)
- [系统规模](#-系统规模)
- [REST API端点](#-rest-api-端点速查)
- [架构总览](#️-架构总览)
- [七条安全红线](#️-七条安全红线)
- [单元测试](#-单元测试)

---

## 🚀 30秒快速启动

```bash
# 方式一：仅前端（无需Python依赖）
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

```bash
# 方式二：启动 FastAPI 后端（推荐，支持API调用）
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# 📖 API文档：http://localhost:8000/docs (自动生成Swagger UI)
```

打开后右上角红色「🛑 紧急停机」按钮是**真实可用**的——按下后所有决策输出立即阻断，仓位强制归零。
总控台顶部会实时显示「🟢 后端服务：已连接」或「🔴 后端服务：未连接」状态。
**V2.5新增「全栈服务状态面板」**：在总控台中部可实时查看FastAPI/Streamlit/Remotion三个服务的运行状态、端口和启动命令。

---

## 🔧 全栈服务启动指南

V2.5是首个完整全栈版本，包含三个可独立启动的服务：

### 1. FastAPI 后端（核心算法API）
```bash
# 端口：8000
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# 访问：http://localhost:8000/docs (Swagger UI 自动文档)
```

### 2. Streamlit 数据仪表盘
```bash
# 端口：8501
pip install streamlit pandas numpy plotly
streamlit run dashboard/Home.py
# 访问：http://localhost:8501
```

Streamlit仪表盘包含3个页面：
- **Home.py**：系统概览仪表盘
- **pages/1_Chromosome_Lab.py**：染色体诊断实验台
- **pages/2_Storm_Simulator.py**：风暴能量模拟实验室

### 3. Remotion 视频生成
```bash
# 预览端口：3000，Studio端口：3001
cd video
npm install
npm run dev
# 访问：http://localhost:3000 (视频预览)
# 或：npm start 启动 Remotion Studio (端口3001)
```

---

## 🎯 推荐体验路径

| 顺序 | 入口 | 体验内容 |
|-----|------|---------|
| 🎯 **第1站** | [index.html](index.html) | 系统总控台仪表盘，整体架构一览 · V2.5新增全栈服务状态面板 |
| 🛠️ **第2站** | [ymine-studio.html](ymine-studio.html) | YMine Studio全功能控制台，试试红色紧急停机按钮 |
| 🎮 **第3站** | [labs/evidence/general-game-os.html](labs/evidence/general-game-os.html) | 锥心博弈仿真沙盘，看博弈如何收敛到0.68 |
| 💹 **第4站** | [labs/evidence/finance-risk-simulator.html](labs/evidence/finance-risk-simulator.html) | 金融风险压力测试实验室 |
| 🧬 **第5站** | [labs/evidence/chromosome_diagnostic.html](labs/evidence/chromosome_diagnostic.html) | 🆕 染色体锚定诊断仪——LLM多轮对话主题漂移实时检测（真实算法） |
| ⚡ **第6站** | [labs/evidence/storm_energy_simulator.html](labs/evidence/storm_energy_simulator.html) | 🆕 风暴能量分配模拟器——能量守恒/阈值熔断实验（真实算法） |
| 🧠 **第7站** | [engines/mindspeak/index.html](engines/mindspeak/index.html) | MindSpeak四层认知引擎演示 |
| 📊 **第8站** | http://localhost:8501 | Streamlit数据仪表盘（需启动streamlit） |
| 🎬 **第9站** | http://localhost:3000 | Remotion视频生成预览（需启动npm run dev） |

---

## ⚡ 核心亮点

### 🎯 0.68锥心引力——跨领域统一数学常量
所有博弈力量收敛于**0.68**黄金分割共轭点——从德州扑克GTO、正态分布1σ、Kelly仓位公式到期权定价共同推导的数学常量。超过即熔断，一个数字统一四大领域判断基准。

### 🚌 YBus三分区调度总线
自研事件总线，物理隔离三种数据通道：`PIPELINE`（官方只读流水线，需`trusted`凭证）、`DRAFT`（用户草稿区）、`AUDIT`（审计仅追加）。标准通道全覆盖，引擎完全解耦，越权写入从机制上不可能。

### 🔺 三模型冗余三角审计
金融精算(A)、博弈引擎(B)、几何计算(C)三个独立模型三角校验，固定误差阈值±0.02。结论不一致永远到不了最终输出（STEP9）。航空航天级冗余设计，单点故障不可能发生。

### 🔥 七层安全熔断体系
黑天鹅 / 系统性崩溃 / 估值越界 / 最大回撤 / 情绪倾斜 / 手动停机 / 业务自定义——七重熔断防线，`canBypass=false`不可绕过，一键紧急停机阻断所有输出。

### 🧩 公共组件层
- 统一CSS组件库 `components.css`：横幅卡片、快速入口、状态徽章、阈值色条、动效系统、服务状态面板
- 统一JS组件库 `components.js`：ECharts暗色主题注册、图表工厂、工具函数、滚动入场动效、内存自动管理
- 所有实验室页面共享视觉语言与交互范式，新模块开箱即用

### 🧬 Verifiable Reward 可验证信号验证类
- **染色体锚定诊断仪**：多模态大模型多轮对话主题漂移实时检测，Canvas染色体基因图谱可视化，相似度曲线三基准熔断（真实算法API）
- **风暴能量分配模拟器**：雷-闪电-大风三体能量守恒仿真，能量分配圆环图，阈值三态（安全/预警/熔断）（真实算法API）
- **11维金融向量体系**：金融信号多维特征向量展示框架
- **大模型学习记忆系统**：KMP·IPD·7D向量框架基座

### 🚀 FastAPI 后端支持（V2.4+V2.5增强）
系统内置 **FastAPI 后端服务**，核心算法已从 JavaScript 模拟迁移至 Python 后端，提供7个REST API端点
- 总控台顶部实时显示后端连接状态：「🟢 已连接」/「🔴 未连接」
- **V2.5新增全栈服务状态面板**：集中监控FastAPI/Streamlit/Remotion三服务状态
- **V2.5新增/api/system/status端点**：返回全栈服务状态、版本、测试统计、页面数
- 自动生成 **Swagger UI** 文档（`/docs`），所有接口在线可调试
- CORS 已配置，支持跨域调用，前端与后端可独立部署
- 核心端点：`/health`、`/thresholds`、`/version`、`/api/system/status`、`/api/chromosome/diagnose`、`/api/storm/simulate`

### 📊 Streamlit 数据仪表盘（V2.5新增）
- 独立Python数据可视化应用，提供交互式数据分析体验
- 3个功能页面：系统概览、染色体实验台、风暴模拟器
- 与FastAPI后端共享算法逻辑，确保计算一致性
- 支持Plotly交互式图表、Pandas数据处理

### 🎬 Remotion 视频生成（V2.5新增）
- 基于React的可编程视频生成框架
- 支持3D场景（@react-three/fiber）
- 可渲染输出MP4视频文件
- 提供Remotion Studio可视化编辑界面

---

## 📊 系统规模

| 指标 | 数值 |
|-----|------|
| 独立认知引擎 | **7个** |
| 垂直业务模块 | **5个** |
| 主控台总板块 | **6个** |
| 实验分类 | **9大类** |
| 前端页面 | **25个** |
| 仿真实验入口 | **45个**（含2个VR可验证信号实验） |
| 横幅式特色入口 | **4张** |
| 快速入口卡片 | **4张** |
| 全栈服务 | **3个**（FastAPI + Streamlit + Remotion） |
| FastAPI后端API端点 | **7个** |
| YBus通信通道 | 标准通道全覆盖 |
| 单元测试 | **148个（全部通过）** |
| Node.js后端测试 | 73个 |
| 浏览器前端测试 | 75个（含YBus、VRComponents测试） |
| Streamlit仪表盘页面 | **3个** |
| Remotion视频组件 | 完整React+Three.js技术栈 |
| 专项审计轮次 | **7轮** |
| A类缺陷修复率 | **100% (25/25)** |
| 全域合规度 | **97.71/100 (A+)** |

---

## 🔌 REST API 端点速查

V2.5共提供 **7个REST API端点**，所有端点均支持CORS跨域调用：

| 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|
| GET | `/` | API根信息 | - |
| GET | `/health` | 健康检查 | - |
| GET | `/thresholds` | 获取全局阈值常量 | - |
| GET | `/version` | 获取版本详细信息 | - |
| GET | `/api/system/status` | 🆕 全栈服务状态（总控台面板用） | - |
| GET | `/api/chromosome/diagnose` | 染色体锚定诊断（真实算法） | `data` - 逗号分隔数值(0~1) |
| GET | `/api/storm/simulate` | 风暴能量模拟（真实算法） | `wind_speed`(风速), `precipitation`(降水量), `duration`(持续时间) |

启动FastAPI后访问 **http://localhost:8000/docs** 查看完整Swagger文档并在线调试。

### 示例调用

```bash
# 健康检查
curl http://localhost:8000/health

# 染色体诊断（默认数据）
curl "http://localhost:8000/api/chromosome/diagnose"

# 染色体诊断（自定义数据）
curl "http://localhost:8000/api/chromosome/diagnose?data=0.52,0.48,0.71,0.55,0.49"

# 风暴模拟
curl "http://localhost:8000/api/storm/simulate?wind_speed=25&precipitation=80&duration=8"

# 全栈系统状态
curl http://localhost:8000/api/system/status
```

---

## 🏗️ 架构总览

```
workspace/
├── index.html                     # 🎯 主控台入口（推荐从这里开始）· V2.5新增全栈服务状态面板
├── ymine-studio.html              # 🛠️ YMine Studio全功能控制台
├── main.py                        # 🚀 FastAPI 后端主入口（V2.5新增/api/system/status）
├── config.py                      # ⚙️ 全局配置（版本号、阈值、系统信息）
├── requirements.txt               #    Python 依赖
│
├── dashboard/                     # 📊 V2.5新增：Streamlit 数据仪表盘
│   ├── Home.py                    #    系统概览仪表盘
│   └── pages/
│       ├── 1_Chromosome_Lab.py    #    染色体诊断实验台
│       └── 2_Storm_Simulator.py   #    风暴能量模拟实验室
│
├── video/                         # 🎬 V2.5新增：Remotion 视频生成
│   ├── package.json               #    npm依赖配置（版本2.5.0）
│   ├── src/
│   │   ├── index.ts               #    Remotion 入口
│   │   ├── Root.tsx               #    视频根组件
│   │   └── MolecularMixology.tsx  #    主视频组件（Three.js 3D）
│   └── remotion.config.ts         #    Remotion 配置
│
├── backend/                       # 🚀 FastAPI 后端服务（备用目录）
│   ├── main.py                    #    API 主入口
│   ├── config.py                  #    全局阈值常量
│   └── routers/                   #    路由模块
│
├── assets/                        # ⚙️ 核心公共资源层
│   ├── css/
│   │   ├── base.css               #    基础样式（变量/布局/重置）
│   │   ├── components.css         #    🧩 公共组件库（横幅/卡片/徽章/动效/服务状态面板，V2.5）
│   │   └── poker-egg.css          #    德州扑克GTO样式
│   └── js/
│       ├── bus.js                 #    🚌 YBus三分区消息总线
│       ├── components.js          #    🧩 公共JS组件库（ECharts主题/工具函数/动效）
│       ├── risk-circuit-breaker.js#    🛡️ 前端全局风控熔断
│       ├── triangle-audit.js      #    🔺 三模型冗余审计（STEP9门控）
│       ├── quant-engine.js        #    📊 十步量化投资引擎
│       ├── valuation-engine.js    #    💰 DCF+实物期权估值
│       ├── cone-game-theory.js    #    🎯 0.68锥心博弈论
│       ├── mcn-alpha-engine.js    #    📈 MCNα引擎
│       └── poker-egg.js           #    🃏 德州扑克GTO模块
│
├── models/                        # 🧮 三模型冗余独立实现（三角审计A/B/C）
├── game-os-main/                  # 📦 Node.js后端内核（执行层）
├── engines/                       # 🧠 七大独立认知引擎（核心能力层）
├── labs/                          # 🔬 全域仿真实验向量总管理台（45个入口 · 9大类别）
├── tests/                         # ✅ 单元测试套件（148 tests）
│
├── moodmind_lab/                  # 💜 MoodMind Python后端（Streamlit）
├── ms-lab/                        # 🧬 MS-Lab Python后端（Streamlit）
├── tools/                         # 🔧 链接检查/修复开发工具集
├── docs/                          # 📚 审计报告与设计文档
└── MemoryBase/                    # 💾 向量存储与记忆库
```

**分层说明**：models(数学基座) → assets/js(公共引擎+组件库) → game-os-main/core-engine(后端内核) → engines(七大引擎) → business-modules(业务) → labs(验证) → *-private-engine(涉密隔离)

**V2.5全栈架构**：FastAPI(端口8000) + Streamlit(端口8501) + Remotion(端口3000/3001) + 静态前端(任意端口)

---

## 🛡️ 七条安全红线

| # | 红线 | 状态 |
|---|------|------|
| 1 | 全局三阈值刚性 0.48/0.50/0.68，禁止硬编码非标值 | ✅ |
| 2 | PIPELINE分区发布必须携带`{trusted:true}`凭证 | ✅ |
| 3 | MAX_EXPORT_BATCH=100 硬限制，防止数据批量泄露 | ✅ |
| 4 | 熔断`canBypass=false`，任何人不可绕过 | ✅ |
| 5 | 紧急停机全局锁阻断STEP9最终输出 | ✅ |
| 6 | 私有内核物理隔离，公开层仅暴露stub占位 | ✅ |
| 7 | 全链路异常容错，核心路径try/catch 100%覆盖 | ✅ |

---

## 🔌 YBus API 速查

```javascript
// 发布到官方流水线（必须携带trusted凭证）
YBus.publish(channelName, data, { trusted: true });

// 订阅通道更新
YBus.subscribe(channelName, function(data) { ... });

// 紧急停机（红色按钮调用）
YBus.emergencyHalt();

// 用户草稿区读写（三分区隔离）
YBus.writeDraft(key, data);
const data = YBus.readDraft(key, defaultValue);

// 全局阈值常量
YBus.THRESHOLDS.BREAKEVEN  // 0.48 保本线
YBus.THRESHOLDS.STEADY     // 0.50 稳态线
YBus.THRESHOLDS.FUSE       // 0.68 熔断线
```

### VRComponents 公共组件库

```javascript
// 工具函数
VR.utils.clamp(v, 0, 1);              // 数字钳位
VR.utils.fmt(3.14159, 2);             // 格式化: "3.14"
VR.utils.pct(0.732);                  // 百分比: "73.2%"
VR.utils.getRiskLevel(0.75);          // 风险级别: {label:"熔断", color:{...}, className:"danger"}
VR.utils.thresholdColor(0.75);        // 阈值对应色值: "#ef4444"
VR.utils.uid('chart');                // 唯一ID: "chart-xxx"

// ECharts图表（自动注册ymine-dark暗色主题）
const chart = VR.echarts.trackChart(echarts.init(el, 'ymine-dark'));
chart.setOption(VR.echarts.makeLineChartConfig({
    xData: [...],
    series: [{ name:'line1', data:[...], color:'#a855f7' }]
}));

// 入场动效（自动初始化）
// .vr-banner-card / .qe-card / .lab-card / .service-card 自动获得滚动淡入上滑动效
```

---

## 🧪 单元测试

| 测试套件 | 运行环境 | 测试数 | 覆盖模块 |
|----------|---------|--------|---------|
| [tests/core-engine.test.js](tests/core-engine.test.js) | Node.js | 73 | 工具函数、Kelly仓位、SafetyFuse熔断、四层控制、FatLeanBand |
| [tests/runner.html](tests/runner.html) | 浏览器 | 75 | YModels三模型(13)、RiskCircuitBreaker(13)、TriangleAudit(12)、YBus总线(14)、VRComponents公共组件(10) |
| **合计** | - | **148** | **全部通过 ✅** |

```bash
# Node.js后端测试
node tests/core-engine.test.js

# 浏览器前端测试
python3 -m http.server 8080
# 打开 http://localhost:8080/tests/runner.html
```

测试覆盖的核心安全路径：**Kelly仓位计算**（raw/half/quarter Kelly、optimal band、边界值）、**熔断触发逻辑**（coneC≥0.68精确边界、zScore 2σ/3σ、MDD、手动停机、强制平仓0、硬顶0.25）、**三角审计**（PASSED/WARNING/BLOCKED三段、anomalyCount、fuseTriggered）、**YBus三分区隔离**（halt/resume状态机、draft读写、非法键防御、事件派发、snapshot全通道覆盖）、**VRComponents**（工具函数、风险等级映射、图表配置工厂、阈值标线完整性）。

---

## 📚 文档与审计

| 文档 | 位置 |
|------|------|
| 七轮审计总汇总表 | [docs/system-v21-rectification/](docs/system-v21-rectification/) |
| 全系统安全合规白皮书 | 同上目录 |
| 第七轮终验报告 | 同上目录 |
| P0-P1整改后复测验收报告 | 同上目录 |
| FastAPI Swagger文档 | http://localhost:8000/docs （启动后端后访问） |

---

## 🏛️ 设计哲学

**我们不相信任何单一模型的输出。**

传统AI Agent框架本质是"大模型+工具调用+Prompt编排"，擅长生成流畅文本，但在精确决策场景下，幻觉、不可控、单点故障、缺乏安全边界从未被根本解决。

Game-OS走了一条不同的路：
- **三模型冗余校验**：三个独立引擎交叉验证才放行
- **七层熔断兜底**：越界瞬间自动刹车，不可绕过
- **三分区权限隔离**：官方数据与用户操作物理隔离
- **仿真先行**：算法必须沙盘跑通才上线
- **认知过载熔断**：AI也会"累"，累了就停
- **公共组件层**：统一视觉/交互/工具，降低模块耦合
- **全栈验证**：V2.5实现FastAPI+Streamlit+Remotion三服务完整闭环

> 安全是一等公民，不是事后护栏。决策必须可解释、可验证、可干预。

---

## 📝 版本历史

| 版本 | 时间 | 里程碑 |
|------|------|--------|
| V1.x | 2025-Q4 | 初版，单引擎基础架构 |
| V2.0 | 2026-Q1 | YBus总线 + 三大引擎 |
| V2.1 | 2026-Q2 | 31实验室 + 5业务模块 + 全链路熔断 |
| V2.2 Batch1 | 2026-03~07 | 七轮专项审计 → 25个A类缺陷100%修复 |
| V2.2 P0-Rectified | 2026-07-26 | P0整改：仓库整理、39个实验入口横向总览、统一工具库、124个单元测试 |
| V2.3 Component-Optimized | 2026-07-27 | ✅ 公共组件层抽取(components.css/js)、VR可验证信号类2个新实验、横幅式特色入口、YBus+VRComponents单元测试24项新增、测试总数148 |
| V2.4 Backend-Integrated | 2026-07-27 | 🚀 新增 FastAPI 后端服务，系统从纯前端演示升级为前后端分离的全栈架构；REST API端点；总控台后端状态指示器实时联动 /health；自动Swagger UI文档；CORS跨域支持 |
| **V2.5 FullStack-Verified** | **2026-07-27** | **🎯 首个完整全栈验证版本：FastAPI真实算法引擎（7个API端点，新增/api/system/status）、Streamlit数据仪表盘（3页面）、Remotion视频生成（React+Three.js）、总控台全栈服务状态面板、版本号统一对齐、启动命令标准化、148项测试全通过** |

---

## ⚠️ 许可证与免责

Game-OS V2.5 FullStack-Verified 为内部研究/教学/仿真平台。
- ✅ 所有公开代码为原创或开源教学级实现
- 🔒 私有引擎目录（`*-private-engine/`）包含商业机密，未经授权不得访问
- ⚠️ 金融模型在公开层为简化教学版本，**不构成投资建议**

---

<div align="center">

```
================================================================================
       G A M E - O S   V 2 . 5   F U L L S T A C K - V E R I F I E D
================================================================================

  七轮专项审计 ......... ✅ 全部通过
  A类缺陷修复 ........... ✅ 25/25 (100%)
  公共组件层 ............ ✅ CSS+JS 双端统一（含服务状态面板）
  VR可验证信号 .......... ✅ 2个实验上线（真实算法API）
  FastAPI 后端 .......... ✅ 7个REST API端点
  Streamlit 仪表盘 ...... ✅ 3个交互页面
  Remotion 视频 ......... ✅ React+Three.js 技术栈
  全栈服务监控 .......... ✅ 总控台实时状态面板
  安全红线 .............. ✅ 7/7 零违反
  单元测试 .............. ✅ 148/148 全部通过

  🚀 三服务启动命令：
     FastAPI:    uvicorn main:app --reload --port 8000
     Streamlit:  streamlit run dashboard/Home.py
     Remotion:   cd video && npm run dev

  🎯 从 index.html 开始探索
================================================================================
```

</div>
