# Game-OS V2.2 Batch1

> **博弈论驱动的全域量化操作系统 · 生产稳定版**

| 项目属性 | 内容 |
|----------|------|
| 版本 | V2.2 Batch1 (Final) |
| 综合合规度 | **97.71/100 (A+级)** |
| 审计状态 | ✅ 七轮专项审计全部通过，正式闭环交付 |
| 三阈值基准 | 0.48保本 / 0.50稳态 / 0.68熔断 |
| 发布日期 | 2026-07-21 |

---

## 项目简介

Game-OS是一套融合**博弈论、控制论、认知科学、量化金融**的全域操作系统。系统以"圆锥博弈"为核心模型，将德州扑克GTO策略、Kelly仓位公式、Black-Scholes实物期权、四层安全熔断等机制统一在YBus三分区消息总线上，实现从宏观信号到微观仓位的全链路闭环决策。

### 核心理念

- **0.68锥心引力**：市场所有博弈力量收敛于0.68（黄金分割共轭点），超过即触发熔断
- **三层资金池**：对冲蓄水池/品牌体量池/风险资金池动态平衡
- **红蓝双体制**：RED_OCEAN（红海防御）/ BLUE_OCEAN（蓝海成长）参数化切换
- **三模型冗余审计**：金融精算/GameMind/计算引擎三角校验，防止单点故障
- **七类安全熔断**：黑天鹅/系统性崩溃/估值越界/最大回撤/情绪倾斜/手动停机/业务自定义

---

## 快速开始

### 环境要求

- 现代浏览器（Chrome 90+ / Firefox 88+ / Safari 14+ / Edge 90+）
- Python 3.8+（如需启动moodmind_lab/ms-lab后端）
- localStorage启用（系统自动降级内存缓存）

### 启动方式

**方式一：直接打开主控台**
```bash
# 在浏览器中打开根目录 index.html
open /workspace/index.html
```

**方式二：启动本地HTTP服务器（推荐）**
```bash
cd /workspace
python3 -m http.server 8080
# 访问 http://localhost:8080/index.html
```

**方式三：启动YMine Studio全功能控制台**
```bash
open /workspace/ymine-studio.html
# 或 http://localhost:8080/ymine-studio.html
```

**方式四：启动MoodMind Python后端（可选）**
```bash
cd /workspace/moodmind_lab
pip install -r requirements.txt
bash scripts/start_all.sh
```

---

## 系统架构总览

### 目录结构

```
workspace/
├── index.html                     # 主控台入口
├── ymine-studio.html              # YMine Studio全功能控制台
├── evolvemind.html                # EvolveMind演化引擎
├── gamemind.html                  # GameMind博弈引擎
├── moodmind.html                  # MoodMind情绪引擎
│
├── assets/
│   ├── css/                       # 全局样式
│   └── js/                        # 核心公共引擎（L2层）
│       ├── bus.js                 # 🚌 YBus三分区消息总线核心
│       ├── risk-circuit-breaker.js# 🛡️ 全局风控熔断中间件
│       ├── triangle-audit.js      # 🔺 三模型冗余审计闭环
│       ├── quant-engine.js        # 📊 十步量化投资引擎
│       ├── valuation-engine.js    # 💰 DCF+实物期权估值
│       ├── cone-game-theory.js    # 🎯 0.68锥心博弈论
│       ├── mcn-alpha-engine.js    # 📈 MCNα引擎
│       ├── poker-egg.js           # 🃏 德州扑克GTO模块
│       └── sidebar.js             # 📍 导航侧栏
│
├── game-os-main/
│   ├── total-index.html           # 总入口导航
│   ├── core-engine/               # 底层内核（L2层）
│   │   ├── _internal.js           # 内部工具常量
│   │   ├── common-api.js          # 统一API网关
│   │   ├── safety-fuse.js         # 🔥 七类安全熔断基线
│   │   ├── kelly-base.js          # 𐀋 Kelly仓位公式
│   │   ├── circle-boundary.js     # ⭕ 圆锥边界计算
│   │   ├── four-layer-control.js  # 🎛️ 四层管控
│   │   ├── fat-lean-band.js       # 📏 肥瘦区间
│   │   ├── triangle-loopback.js   # 🔄 三角闭环
│   │   └── eleven-layer-public.js # 11层公开接口
│   └── business-modules/          # 五大垂直业务（L3层）
│       ├── circle-cognitive/      # 圆环认知
│       ├── lowalt-economy/        # 低空空域经济
│       ├── math-cognition/        # 数感认知
│       ├── mcn-valuation/         # MCN估值
│       └── wall-street-11step/    # 华尔街十一
│
├── engines/                       # 七大独立引擎（L3层）
│   ├── airmind/                   # AirMind思维引擎
│   ├── evolvemind/                # EvolveMind演化引擎
│   ├── financemind/               # FinanceMind金融引擎
│   ├── gamemind/                  # GameMind博弈引擎
│   ├── geom-compute/              # GeomCompute几何计算
│   ├── mindspeak/                 # MindSpeak认知语言引擎
│   │   └── assets/js/
│   │       ├── mindspeak-public.js
│   │       ├── ms-samples.js
│   │       └── ms-visualization.js
│   └── moodmind/                  # MoodMind情绪引擎
│
├── labs/                          # 31组仿真实验室（L4层）
│   ├── evidence/                  # 通用实证实验室(17个)
│   ├── structural-mechanics/      # 结构力学实验室(3个)
│   ├── finance-evidence-lab/      # 金融实证实验室
│   └── marketing/                 # 营销实验室
│
├── moodmind_lab/                  # MoodMind Python后端
│   ├── moodmind_dashboard/
│   │   ├── app.py
│   │   └── private_engine_stub.py # ⚠️ 私有引擎stub
│   ├── public_api/
│   │   ├── vector_sender.py       # MAX_EXPORT=100硬限制
│   │   └── kmp_score_sender.py
│   └── security/
│
├── ms-lab/                        # MS-Lab Python后端
│   ├── mslab_dashboard/
│   │   ├── app.py
│   │   └── mslab_security.py      # MAX_EXPORT=100硬限制
│   └── mslab_security/
│
├── *-private-engine/              # 🔒 私有引擎（物理隔离）
│   ├── airmind-private-engine/
│   ├── mindspeak-private-engine/
│   ├── financemind-private-engine/
│   ├── isomorphism-block-private-engine/
│   ├── traditional-culture-vector-private-engine/
│   └── ymine-circle-cognitive-engine/
│
├── pages/                         # 页面目录
├── models/                        # 计算模型
├── docs/                          # 📚 文档与审计报告
│   ├── airmind_v2_audit/
│   ├── mindspeak_v19_audit/
│   └── system-v21-rectification/  # V2.2审计报告（本轮）
│
└── isomorphism-block-engine/      # 同构区块引擎
```

---

## 核心模块

### 1. YBus三分区消息总线

[bus.js](file:///workspace/assets/js/bus.js) 是系统的中枢神经，采用三分区权限隔离：

| 分区 | 权限 | 用途 |
|------|------|------|
| **PIPELINE** | 只读（需`{trusted:true}`） | 官方引擎流水线结果 |
| **DRAFT** | 用户可写 | 草稿、参数配置 |
| **AUDIT** | 仅追加 | 审计日志归档 |

共注册**31个通道**，覆盖风控、估值、博弈、认知、体制切换等所有信号流。

### 2. 风控熔断体系

[risk-circuit-breaker.js](file:///workspace/assets/js/risk-circuit-breaker.js) + [safety-fuse.js](file:///workspace/game-os-main/core-engine/safety-fuse.js)

**七类熔断触发：**
- BLACK_SWAN（黑天鹅）
- SYSTEMIC_COLLAPSE（系统性崩溃）
- MANUAL_KILLSWITCH（手动停机）
- VALUATION_BREACH（估值越界 coneC≥0.68）
- MAX_DRAWDOWN（最大回撤 mdd≥0.68）
- EMOTIONAL_TILT（情绪倾斜 tilt≥0.68）
- RESERVED（业务自定义）

### 3. 十步量化引擎

[quant-engine.js](file:///workspace/assets/js/quant-engine.js) 实现完整的量化投资决策流水线：

```
Step1: macroFunnel  → 宏观漏斗选股（RED/BLUE体制差异化筛选）
Step2: factorLibrary → 多因子因子库（价值/成长/质量/动量/情绪/风险）
Step3: valuationV2  → DCF+相对估值+实物期权
Step4: [poker]     → 德扑GTO信号映射（隐含概率→资金分配）
Step5: simulationResult → 蒙特卡洛K线模拟+压力测试
Step6: rationalityScore → 理性度评分（行为偏误检测+Kelly调整）
Step7: [triangle]  → 三模型冗余审计（金融/博弈/计算三角校验）
Step8: executionOrder → 执行指令（风控强制+对冲计划）
Step9: engineOutput → 最终输出（必须通过三角审计STEP9）
```

### 4. MindSpeak认知引擎

[engines/mindspeak/](file:///workspace/engines/mindspeak/) 实现四层认知架构：
- 四维认知向量（math/economic/ai/language）
- 三层记忆（工作/长期/基因）
- 行为偏误参数（锚定/损失厌恶/过度自信）
- 认知过载熔断（overloadScore→fuse）

### 5. 锥心博弈论

[cone-game-theory.js](file:///workspace/assets/js/cone-game-theory.js) 实现基于0.68锥心的博弈仿真：
- 25个参与者zScore分布
- groundTruth=0.68地心引力
- kellyFraction动态调整
- coneCollapse真相揭示时刻

---

## 安全体系

Game-OS V2.2 Batch1已通过**七轮专项审计**，全域综合合规度**97.71%（A+级）**。

### 七条安全红线

| # | 红线 | 状态 |
|---|------|------|
| 1 | 全局三阈值刚性0.48/0.50/0.68 | ✅ |
| 2 | PIPELINE分区发布必须{trusted:true} | ✅ |
| 3 | MAX_EXPORT_BATCH=100硬限制 | ✅ |
| 4 | 熔断canBypass=false不可绕过 | ✅ |
| 5 | 紧急停机全局锁阻断STEP9 | ✅ |
| 6 | 私有内核stub隔离无外泄 | ✅ |
| 7 | 全链路异常容错不崩溃 | ✅ |

### 四层安全防护

```
🔒 L1 私有内核隔离（private*/目录物理隔离，stub占位）
🚌 L2 总线权限隔离（YBus三分区，PIPELINE需trusted）
🔥 L3 熔断管控层（七类熔断+紧急停机+仓位归零）
📝 L4 审计归档层（S9六类日志append-only）
```

详细安全说明参见：[全系统总安全合规白皮书](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_全系统总安全合规白皮书.md)

---

## 模块入口索引

### 主要页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 主控台 | [index.html](file:///workspace/index.html) | 系统总控仪表盘 |
| YMine Studio | [ymine-studio.html](file:///workspace/ymine-studio.html) | 全功能控制台（含停机按钮） |
| EvolveMind | [evolvemind.html](file:///workspace/evolvemind.html) | 演化引擎 |
| GameMind | [gamemind.html](file:///workspace/gamemind.html) | 博弈引擎 |
| MoodMind | [moodmind.html](file:///workspace/moodmind.html) | 情绪引擎 |
| Total Index | [game-os-main/total-index.html](file:///workspace/game-os-main/total-index.html) | 全模块导航 |

### 七大引擎

| 引擎 | 路径 |
|------|------|
| AirMind | [engines/airmind/index.html](file:///workspace/engines/airmind/index.html) |
| EvolveMind | [engines/evolvemind/index.html](file:///workspace/engines/evolvemind/index.html) |
| FinanceMind | [engines/financemind/index.html](file:///workspace/engines/financemind/index.html) |
| GameMind | [engines/gamemind/index.html](file:///workspace/engines/gamemind/index.html) |
| GeomCompute | [engines/geom-compute/index.html](file:///workspace/engines/geom-compute/index.html) |
| MindSpeak | [engines/mindspeak/index.html](file:///workspace/engines/mindspeak/index.html) |
| MoodMind | [engines/moodmind/index.html](file:///workspace/engines/moodmind/index.html) |

### 仿真实验室

| 实验室类别 | 目录 | 数量 |
|-----------|------|------|
| 通用实证 | [labs/evidence/](file:///workspace/labs/evidence/) | 17个 |
| 结构力学 | [labs/structural-mechanics/](file:///workspace/labs/structural-mechanics/) | 3个 |
| 金融实证 | [labs/finance-evidence-lab/](file:///workspace/labs/finance-evidence-lab/) | 1个 |
| 营销实验 | [labs/marketing/](file:///workspace/labs/marketing/) | 1个 |

---

## API速查

### YBus全局API

```javascript
// 发布消息到通道（PIPELINE需{trusted:true}）
YBus.publish(channelName, data, { trusted: true });

// 订阅通道更新
YBus.subscribe(channelName, function(data) { ... });

// 获取通道当前状态
var state = YBus.getState(channelName);

// 设置DRAFT分区用户数据
YBus.setState(channelName, value);

// 紧急停机（立即生效，红色按钮调用）
YBus.emergencyHalt();

// 解除紧急停机
YBus.resumeFromHalt();

// 查询停机状态
var isHalted = YBus.isHalted();

// 等待总线就绪
YBus.ready(function() { ... });

// 全局阈值常量
YBus.THRESHOLDS.BREAKEVEN  // 0.48
YBus.THRESHOLDS.STEADY     // 0.50
YBus.THRESHOLDS.FUSE       // 0.68
```

### 常用通道

| 通道名 | 分区 | 说明 |
|--------|------|------|
| `riskFuse` | PIPELINE | 风控熔断状态 |
| `quantPipeline` | PIPELINE | 十步流水线进度 |
| `engineOutput` | PIPELINE | 最终交易信号（STEP9） |
| `regimeState` | PIPELINE | RED_OCEAN/BLUE_OCEAN体制 |
| `simulationResult` | PIPELINE | 蒙特卡洛模拟结果 |
| `rationalityScore` | PIPELINE | 理性度评分 |
| `valuation` | PIPELINE | 估值锚定 |
| `coneGame` | PIPELINE | 锥心博弈状态 |
| `systemHealth` | PIPELINE | 系统健康度 |

---

## 审计文档

### V2.2 七轮审计报告

所有审计报告位于 [docs/system-v21-rectification/](file:///workspace/docs/system-v21-rectification/)：

| 报告 | 文件 |
|------|------|
| 七轮审计总汇总表 | [Game-OS_V2.2_七轮审计总汇总表.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_七轮审计总汇总表.md) |
| 全系统总安全合规白皮书 | [Game-OS_V2.2_全系统总安全合规白皮书.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_全系统总安全合规白皮书.md) |
| 第七轮全域交叉总终验报告 | [Game-OS_V2.2_第七轮全域交叉总终验报告.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_第七轮全域交叉总终验报告.md) |
| 第六轮全局通用工具层审计 | [Game-OS_V2.2_第六轮全局通用工具层专项审计报告.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_第六轮全局通用工具层专项审计报告.md) |
| 第五轮31实验室审计 | [Game-OS_V2.2_实验室限定范围深度审计报告.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_实验室限定范围深度审计报告.md) |
| P0-P1整改后复测验收 | [Game-OS_V2.2_P0-P1整改后复测验收报告.md](file:///workspace/docs/system-v21-rectification/Game-OS_V2.2_P0-P1整改后复测验收报告.md) |
| 全链路熔断验收 | [全链路熔断机制与数据流连通性验收报告.md](file:///workspace/docs/system-v21-rectification/全链路熔断机制与数据流连通性验收报告.md) |

### 历史审计文档

- AirMind V2.0审计：[docs/airmind_v2_audit/](file:///workspace/docs/airmind_v2_audit/)
- MindSpeak V19审计：[docs/mindspeak_v19_audit/](file:///workspace/docs/mindspeak_v19_audit/)

---

## 版本历史

| 版本 | 时间 | 里程碑 |
|------|------|--------|
| V1.x | 2025-Q4 | 初版，单引擎基础架构 |
| V2.0 | 2026-Q1 | YBus总线+三大引擎 |
| V2.1 | 2026-Q2 | 31实验室+5业务模块+全链路熔断 |
| V2.2 Batch1 | 2026-03~07 | 七轮专项审计→25个A类缺陷修复→全域终验通过 |
| **V2.2 Batch1 Final** | **2026-07-21** | **🎊 正式闭环交付** |

### Batch1 已知预留项（不影响稳定运行）

- **B类（Batch2开发，30项）**：RBAC细粒度管控、引擎热更新、批量向量转换、AES导出加密、批量仿真runner等功能开发
- **C类（Batch3优化，22项）**：UI美化、可视化大屏、PDF报告导出等体验优化

---

## 开发规范

### 新增模块规范

1. **目录规范**：新引擎放入`engines/<name>/`，新业务放入`game-os-main/business-modules/<name>/`，新实验室放入`labs/evidence/`
2. **YBus规范**：向PIPELINE写入**必须**携带`{trusted:true}`，外部模块只读不写
3. **阈值规范**：风控判断边界**必须**使用`YBus.THRESHOLDS.BREAKEVEN/STEADY/FUSE`，禁止硬编码0.6/0.5等非标值
4. **私有算法**：涉密内核放入`*-private-engine/`目录，public层只放stub
5. **异常容错**：所有公开方法需try/catch，使用safeNum/safeObj/safeArr安全取值
6. **审计日志**：关键操作调用`_appendAuditLog()`记录S9日志

### 紧急操作

**🛑 紧急停机**：点击任意页面的红色"🛑 紧急停机"按钮，或在控制台执行：
```javascript
YBus.emergencyHalt();
```
停机后所有STEP9最终输出被阻断，仓位强制归零，需人工点击恢复。

**✅ 恢复运行**：点击"✅ 恢复运行"按钮，或执行：
```javascript
YBus.resumeFromHalt();
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生JavaScript (ES6+)、CustomEvent、localStorage |
| 样式 | CSS3（base.css + 模块级CSS） |
| 后端 | Python 3.8+（Flask/Streamlit） |
| 消息总线 | YBus（自研三分区事件总线） |
| 数据持久化 | localStorage（自动降级内存缓存） |
| 私有引擎 | 物理目录隔离 + stub占位 |

---

## 许可证与合规

Game-OS V2.2 Batch1 为内部研究/教学/仿真平台。

- ✅ 所有公开代码为原创或开源教学级实现
- ⚠️ 私有引擎目录（`*-private-engine/`）包含商业机密，未经授权不得访问
- ⚠️ Black-Scholes等金融模型在公开层为简化教学版本，不构成投资建议

---

## 项目状态

```
==========================================================
  G A M E - O S   V 2 . 2   B A T C H 1   F I N A L
==========================================================

  七轮专项审计 ......... ✅ 全部通过
  A类缺陷修复 ........... ✅ 25/25 (100%)
  全域合规度 ............ ✅ 97.71/100 (A+)
  安全红线 .............. ✅ 7/7 零违反
  代码语法检查 .......... ✅ 21个核心JS全部OK
  YBus通道数 ............ ✅ 31个（PIPELINE:27/DRAFT:3/AUDIT:1）
  模块冒烟测试 .......... ✅ 7引擎+5业务+22+实验室全部通过

  🎊 正式闭环交付 · 可投入生产使用 🎊

==========================================================
```

---

*README版本：V2.2 Batch1 Final*
*更新日期：2026-07-21*
