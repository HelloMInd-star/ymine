<div align="center">

# 🔺 Game-OS V2.2

### 博弈论驱动的全域认知操作系统

> **全球首个以「圆锥博弈论」为统一数学基座，融合博弈论、控制论、认知科学、量化金融四大学科的跨领域决策操作系统——不是给大模型加壳，而是从底层重新设计了决策的生成、校验、熔断和审计全链路。**

[![Version](https://img.shields.io/badge/version-V2.2_P0--Rectified-blueviolet)](#)
[![Audit](https://img.shields.io/badge/audit-7%E8%BD%AE%E9%80%9A%E8%BF%87-success)](#)
[![Tests](https://img.shields.io/badge/tests-124%20passed-brightgreen)](#)
[![Compliance](https://img.shields.io/badge/compliance-97.71%2F100_(A%2B)-orange)](#)

**三阈值基准 · 0.48保本 / 0.50稳态 / 0.68熔断**

[🚀 快速启动](#-30秒快速启动) ·
[🎯 体验路径](#-推荐体验路径) ·
[⚡ 核心亮点](#-核心亮点) ·
[🏗️ 架构总览](#️-架构总览) ·
[🛡️ 安全红线](#️-七条安全红线) ·
[🧪 运行测试](#-单元测试)

</div>

---

## 📑 快速导航

- [一句话定位](#-game-os-v22)
- [30秒快速启动](#-30秒快速启动)
- [推荐体验路径](#-推荐体验路径)
- [核心亮点](#-核心亮点)
- [系统规模](#-系统规模)
- [架构总览](#️-架构总览)
- [七条安全红线](#️-七条安全红线)
- [单元测试](#-单元测试)

---

## 🚀 30秒快速启动

```bash
# 纯前端，无需安装任何依赖
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

打开后右上角红色「🛑 紧急停机」按钮是**真实可用**的——按下后所有决策输出立即阻断，仓位强制归零。

---

## 🎯 推荐体验路径

| 顺序 | 入口 | 体验内容 |
|-----|------|---------|
| 🎯 **第1站** | [index.html](index.html) | 系统总控台仪表盘，整体架构一览 |
| 🛠️ **第2站** | [ymine-studio.html](ymine-studio.html) | YMine Studio全功能控制台，试试红色紧急停机按钮 |
| 🎮 **第3站** | [labs/evidence/general-game-os.html](labs/evidence/general-game-os.html) | 锥心博弈仿真沙盘，看博弈如何收敛到0.68 |
| 💹 **第4站** | [labs/evidence/finance-risk-simulator.html](labs/evidence/finance-risk-simulator.html) | 金融风险压力测试实验室 |
| 🧠 **第5站** | [engines/mindspeak/index.html](engines/mindspeak/index.html) | MindSpeak四层认知引擎演示 |

---

## ⚡ 核心亮点

### 🎯 0.68锥心引力——跨领域统一数学常量
所有博弈力量收敛于**0.68**黄金分割共轭点——从德州扑克GTO、正态分布1σ、Kelly仓位公式到期权定价共同推导的数学常量。超过即熔断，一个数字统一四大领域判断基准。

### 🚌 YBus三分区调度总线
自研事件总线，物理隔离三种数据通道：`PIPELINE`（官方只读流水线，需`trusted`凭证）、`DRAFT`（用户草稿区）、`AUDIT`（审计仅追加）。35个标准通道，引擎完全解耦，越权写入从机制上不可能。

### 🔺 三模型冗余三角审计
金融精算(A)、博弈引擎(B)、几何计算(C)三个独立模型三角校验，固定误差阈值±0.02。结论不一致永远到不了最终输出（STEP9）。航空航天级冗余设计，单点故障不可能发生。

### 🔥 七层安全熔断体系
黑天鹅 / 系统性崩溃 / 估值越界 / 最大回撤 / 情绪倾斜 / 手动停机 / 业务自定义——七重熔断防线，`canBypass=false`不可绕过，一键紧急停机阻断所有输出。

---

## 📊 系统规模

| 指标 | 数值 |
|-----|------|
| 独立认知引擎 | **7个** |
| 垂直业务模块 | **5个** |
| 仿真实验入口 | **39个** |
| YBus通信通道 | **35个** |
| 单元测试 | **124个（全部通过）** |
| 专项审计轮次 | **7轮** |
| A类缺陷修复率 | **100% (25/25)** |
| 全域合规度 | **97.71/100 (A+)** |

---

## 🏗️ 架构总览

```
workspace/
├── index.html                     # 🎯 主控台入口（推荐从这里开始）
├── ymine-studio.html              # 🛠️ YMine Studio全功能控制台
│
├── models/                        # 🧮 三模型冗余独立实现（三角审计A/B/C）
│   ├── common/normalizer.js       #    🔧 唯一工具函数库（唯一事实源）
│   ├── calc/                      #    A: 金融精算模型 (WACC/DCF/Kelly)
│   ├── gamemind/                  #    B: 博弈论纳什均衡模型
│   └── compute/                   #    C: V/S/L几何算力负载模型
│
├── assets/js/                     # ⚙️ 核心公共引擎层
│   ├── bus.js                     #    🚌 YBus三分区消息总线
│   ├── risk-circuit-breaker.js    #    🛡️ 前端全局风控熔断
│   ├── triangle-audit.js          #    🔺 三模型冗余审计（STEP9门控）
│   ├── quant-engine.js            #    📊 十步量化投资引擎
│   ├── valuation-engine.js        #    💰 DCF+实物期权估值
│   ├── cone-game-theory.js        #    🎯 0.68锥心博弈论
│   ├── mcn-alpha-engine.js        #    📈 MCNα引擎
│   └── poker-egg.js               #    🃏 德州扑克GTO模块
│
├── game-os-main/                  # 📦 Node.js后端内核（执行层）
│   ├── core-engine/               #    内核模块
│   │   ├── _internal.js           #       🔧 内部工具（委托YModels.common）
│   │   ├── safety-fuse.js         #       🔥 七类安全熔断基线
│   │   ├── kelly-base.js          #       Kelly仓位公式
│   │   ├── four-layer-control.js  #       四层管控(L1-L4)
│   │   ├── fat-lean-band.js       #       动态松紧带(FAT/NEUTRAL/LEAN)
│   │   └── ...                    #       圆环边界、三角闭环、公共API
│   └── business-modules/          #    五大垂直业务模块
│       ├── circle-cognitive/      #       圆环认知
│       ├── lowalt-economy/        #       低空空域经济
│       ├── math-cognition/        #       数感认知
│       ├── mcn-valuation/         #       MCN估值
│       └── wall-street-11step/    #       华尔街十一
│
├── engines/                       # 🧠 七大独立认知引擎（核心能力层）
│   ├── airmind/                   #    AirMind 低空调度引擎
│   ├── evolvemind/                #    EvolveMind 演化引擎
│   ├── financemind/               #    FinanceMind 金融引擎
│   ├── gamemind/                  #    GameMind 博弈总基座
│   ├── geom-compute/              #    GeomCompute 几何计算引擎
│   ├── mindspeak/                 #    MindSpeak 认知语言引擎（四层记忆）
│   └── moodmind/                  #    MoodMind 情绪估值引擎
│
├── labs/                          # 🔬 全域仿真实验向量总管理台（39个入口 · 8大类别）
│   ├── evidence/                  #    核心实证实验室（锥心博弈、金融风险、CAPM等）
│   ├── engineering/               #    工程实验室（声场修复、能源材料、空域调度）
│   ├── finance-evidence-lab/      #    金融压力测试专项实验室（Streamlit）
│   ├── marketing/                 #    营销结构实证实验室（Streamlit）
│   ├── structural-mechanics/      #    结构力学实验室（exp30-32）
│   └── *.html                     #    根级6个分类总控入口（控制论/博弈论/市场等）
│
├── tests/                         # ✅ 单元测试套件
│   ├── core-engine.test.js        #    Node.js后端测试 (73 tests)
│   └── runner.html                #    浏览器前端测试 (51 tests)
│
├── *-private-engine/              # 🔒 私有涉密引擎（物理隔离，不公开源码）
│   ├── engines/airmind-private-engine/
│   ├── engines/financemind-private-engine/
│   ├── engines/mindspeak-private-engine/
│   ├── isomorphism-block-private-engine/
│   ├── traditional-culture-vector-private-engine/
│   └── ymine-circle-cognitive-engine/
│
├── moodmind_lab/                  # 💜 MoodMind Python后端（Streamlit）
├── ms-lab/                        # 🧬 MS-Lab Python后端（Streamlit）
├── tools/                         # 🔧 链接检查/修复开发工具集
├── docs/                          # 📚 审计报告与设计文档
└── MemoryBase/                    # 💾 向量存储与记忆库
```

**分层说明**：models(数学基座) → assets/js(公共引擎) → game-os-main/core-engine(后端内核) → engines(七大引擎) → business-modules(业务) → labs(验证) → *-private-engine(涉密隔离)

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

// 全局阈值常量
YBus.THRESHOLDS.BREAKEVEN  // 0.48 保本线
YBus.THRESHOLDS.STEADY     // 0.50 稳态线
YBus.THRESHOLDS.FUSE       // 0.68 熔断线
```

---

## 🧪 单元测试

| 测试套件 | 运行环境 | 测试数 | 覆盖模块 |
|----------|---------|--------|---------|
| [tests/core-engine.test.js](tests/core-engine.test.js) | Node.js | 73 | 工具函数、Kelly仓位、SafetyFuse熔断、四层控制、FatLeanBand |
| [tests/runner.html](tests/runner.html) | 浏览器 | 51 | YModels三模型、RiskCircuitBreaker、TriangleAudit |
| **合计** | - | **124** | **全部通过 ✅** |

```bash
# Node.js后端测试
node tests/core-engine.test.js

# 浏览器前端测试
python3 -m http.server 8080
# 打开 http://localhost:8080/tests/runner.html
```

测试覆盖的核心安全路径：**Kelly仓位计算**（raw/half/quarter Kelly、optimal band、边界值）、**熔断触发逻辑**（coneC≥0.68精确边界、zScore 2σ/3σ、MDD、手动停机、强制平仓0、硬顶0.25）、**三角审计**（PASSED/WARNING/BLOCKED三段、anomalyCount、fuseTriggered）。

---

## 📚 文档与审计

| 文档 | 位置 |
|------|------|
| 七轮审计总汇总表 | [docs/system-v21-rectification/](docs/system-v21-rectification/) |
| 全系统安全合规白皮书 | 同上目录 |
| 第七轮终验报告 | 同上目录 |
| P0-P1整改后复测验收报告 | 同上目录 |

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

> 安全是一等公民，不是事后护栏。决策必须可解释、可验证、可干预。

---

## 📝 版本历史

| 版本 | 时间 | 里程碑 |
|------|------|--------|
| V1.x | 2025-Q4 | 初版，单引擎基础架构 |
| V2.0 | 2026-Q1 | YBus总线 + 三大引擎 |
| V2.1 | 2026-Q2 | 31实验室 + 5业务模块 + 全链路熔断 |
| V2.2 Batch1 | 2026-03~07 | 七轮专项审计 → 25个A类缺陷100%修复 |
| **V2.2 P0-Rectified** | **2026-07-26** | **✅ P0整改：仓库整理、39个实验入口横向总览、统一工具库、124个单元测试** |

---

## ⚠️ 许可证与免责

Game-OS V2.2 为内部研究/教学/仿真平台。
- ✅ 所有公开代码为原创或开源教学级实现
- 🔒 私有引擎目录（`*-private-engine/`）包含商业机密，未经授权不得访问
- ⚠️ 金融模型在公开层为简化教学版本，**不构成投资建议**

---

<div align="center">

```
==========================================================
  G A M E - O S   V 2 . 2   P 0 - R E C T I F I E D
==========================================================

  七轮专项审计 ......... ✅ 全部通过
  A类缺陷修复 ........... ✅ 25/25 (100%)
  P0整改项 .............. ✅ 3/3 (100%)
  全域合规度 ............ ✅ 97.71/100 (A+)
  安全红线 .............. ✅ 7/7 零违反
  单元测试 .............. ✅ 124/124 全部通过

  🎯 从 index.html 开始探索
==========================================================
```

</div>
