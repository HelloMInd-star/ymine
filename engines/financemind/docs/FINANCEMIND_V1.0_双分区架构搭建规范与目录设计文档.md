# FinanceMind V1.0 双分区架构搭建规范与目录设计文档

> **模块名称：** FinanceMind 量化公司理财 & 投行资本中台
> **版本：** V1.0 骨架初始化版
> **基准：** Game-OS V2.1（80分B级整改版）
> **对标规范：** MindSpike V19.0 A+ 标准
> **文档用途：** 开发规范 · 目录约定 · 接口契约 · 代码模板 · 软著归档
> **生成日期：** 2026-07-20

---

## 第一章 基础信息与分层定位

### 1.1 模块归属与边界

| 维度 | 说明 |
|-----|------|
| **层级定位** | 上层商业应用操作台（与七大Mind主引擎同层，归属engines/目录） |
| **商业角色** | 集团总部CFO（对内财务核算）+ 投行资本总部（对外资本市场） |
| **科研附属** | 金融稳态实证实验室 [labs/finance-evidence-lab/](file:///workspace/labs/finance-evidence-lab/) （纯科研物理隔离） |
| **私有内核** | [engines/financemind-private-engine/](file:///workspace/engines/financemind-private-engine/) （11层投行精算密封层） |
| **目录隔离** | 商用操作台、私有精算内核、金融科研实验室三者物理目录完全分离 |
| **核心约束** | 强制绑定全局三大刚性阈值 `THRESHOLDS = Object.freeze({BREAKEVEN:0.48, STEADY:0.50, FUSE:0.68})`，禁止本地重定义 |

### 1.2 分层边界强制规则

```
┌─────────────────────────────────────────────────────────────────┐
│  上层应用：战略驾驶舱 / 董事长决策面板（未来P3阶段）             │
├─────────────────────────────────────────────────────────────────┤
│  🏛️ FinanceMind 商用操作台（engines/financemind/）【本次搭建】  │
│  ├── 分区A：对内传统量化财务核算（集团财务部）                   │
│  └── 分区B：对外11层投行资本市场估值（投行总部）                 │
│         ↑ 订阅四大输入通道（assetQuant/kellyAllocation          │
│         │   /powerSchedule/gameEquilibrium）                    │
│         ↓ 发布riskThreshold（经三角审计STEP9闸门校验）          │
├─────────────────────────────────────────────────────────────────┤
│  📦 financemind-private-engine/ 【密封私有精算内核】            │
│     WACC/DCF/CAPM/稀释/LBO/破产边界等核心精算代码               │
├─────────────────────────────────────────────────────────────────┤
│  🔬 finance-evidence-lab/ 【纯科研实验室 · 物理隔离】            │
│     资本结构对照/蒙特卡洛扫描/破产边界仿真等学术实证            │
│     → 仅发布校准系数至 assetQuant/riskThreshold                 │
│     → 不接入经营决策链路，完整保留科研免责声明                   │
├─────────────────────────────────────────────────────────────────┤
│  底层公共底座：YBus · 三角审计 · circle-boundary · quant-engine │
└─────────────────────────────────────────────────────────────────┘
```

**硬性边界规则（违反即阻断）：**
1. ❌ 商用操作台代码中禁止出现实验对照组、蒙特卡洛扫描、参数扫描等科研逻辑
2. ❌ 金融科研实验室中禁止出现经营决策推送、仓位调整、IPO定价等商用逻辑
3. ❌ 私有精算内核代码禁止提交公开层，公开层仅通过接口调用
4. ❌ 禁止在任何FinanceMind文件中重定义0.48/0.50/0.68数值，必须引用全局`THRESHOLDS`常量
5. ❌ 禁止使用`simulatorOutput`等废弃旧通道，禁止新增任何私有YBus通道

---

## 第二章 FinanceMind 商用操作台完整目录结构

### 2.1 树形目录结构

```
engines/
└── financemind/ ..................................... 🏛️ 商用主引擎（公开交互层）
    ├── README.md ..................................... 模块说明文档
    ├── index.html ..................................... 双分区主入口（已生成骨架）
    ├── css/
    │   └── financemind.css ........................... 主样式表（待填充）
    ├── js/
    │   ├── bus-subscribe.js .......................... YBus订阅/发布初始化（已生成）
    │   ├── zone-a-accounting.js ...................... 分区A：财务核算逻辑（待开发）
    │   ├── zone-b-ibanking.js ........................ 分区B：11层投行估值逻辑（待开发）
    │   ├── three-statements-engine.js ................ 三表自动推演引擎（待开发）
    │   ├── ratio-calculator.js ....................... 财务比率计算（杜邦/CVP等）（待开发）
    │   ├── cashflow-health.js ........................ 现金流健康度评分（待开发）
    │   └── risk-gatekeeper.js ........................ 0.48/0.68熔断风控（待开发）
    ├── assets/
    │   ├── icons/ .................................... SVG图标资源
    │   └── industry-templates/ ........................ 四大行业模板配置JSON
    │       ├── manufacturing.json .................... 制造业模板
    │       ├── internet.json ......................... 互联网模板
    │       ├── nonstandard-service.json .............. 非标服务模板
    │       └── conglomerate.json ..................... 混合业态模板
    └── AUDIT.md ...................................... 本模块审计记录（预留）

engines/
└── financemind-private-engine/ ....................... 🔒 私有精算内核（密封层）
    ├── README.md ..................................... 私有内核说明（已生成占位）
    ├── index.js ...................................... 统一导出入口
    ├── wacc-calculator.js ............................ WACC加权资本成本（含MM税盾）
    ├── dcf-engine.js ................................. DCF多阶段自由现金流折现
    ├── capm-cone-pricing.js .......................... CAPM+圆锥稳态复合定价
    ├── capital-structure-optimizer.js ................ 最优杠杆寻优（锁定0.50中轴）
    ├── npv-irr-engine.js ............................. NPV/IRR资本预算引擎
    ├── dilution-model.js ............................. 股权债权稀释/Pre-IPO定价
    ├── lbo-model.js .................................. LBO杠杆收购模型
    ├── comps-engine.js ............................... 可比公司/先例交易估值
    ├── bankruptcy-risk.js ............................ 破产风险边界模型
    ├── monte-carlo-utils.js .......................... 蒙特卡洛工具（对接实验室参数）
    └── industry-templates/ ........................... 四大行业精算参数模板
```

### 2.2 分区A：对内传统量化财务核算区功能拆分

| 子模块 | 对应文件 | 核心能力 | 复用公共组件 |
|-------|---------|---------|------------|
| **三表自动推演引擎** | three-statements-engine.js | 资产负债表/利润表/自由现金流FCF三表联动推演 | quant-engine.js |
| **本量利CVP模型** | ratio-calculator.js | 盈亏平衡点、经营杠杆DOL、边际贡献 | — |
| **杜邦分层拆解** | ratio-calculator.js | ROE = 净利率×周转率×权益乘数 三层拆解 | — |
| **营运资本测算** | zone-a-accounting.js | NWC = 应收+存货-应付、CCC现金转换周期 | — |
| **预算分摊&成本归集** | zone-a-accounting.js | 全事业部预算分摊、FC/VC边际成本拆分 | — |
| **现金流健康度评分** | cashflow-health.js | 综合四大输入通道→0-1健康分→绑定0.48保本预警 | THRESHOLDS常量 |
| **风控闸门** | risk-gatekeeper.js | 0.68熔断触发→riskThreshold发布→STEP9拦截 | triangle-audit.js |

### 2.3 分区B：对外11层投行资本市场估值区层级细则

| 层级 | 名称 | 核心数理模型 | 复用公共内核 | 输入来源 | 输出 |
|-----|------|------------|------------|---------|------|
| **L1** | 标准化财报基底 | GAAP/IFRS科目映射、三表归一化 | — | 三表推演引擎 | 标准化财报结构 |
| **L2** | 全集团营运资本三流核算 | 信息/流量/物理三流→财务科目映射 | — | SalesMind（未来）、三表 | 三流财务化数据 |
| **L3** | 项目NPV/IRR资本预算引擎 | NPV=ΣCFt/(1+r)^t、IRR寻根、投资回收期 | quant-engine.js | DCF参数、WACC | 项目可行/否决信号 |
| **L4** | 全业态成本拆分FC/VC | 固定成本/可变成本拆分、边际贡献、经营杠杆 | — | 三表推演 | 边际成本曲线 |
| **L5** | 资本结构中枢 | MM命题Ⅰ/Ⅱ（含税盾）、最优杠杆寻优锁定**0.50中轴线** | THRESHOLDS.STEADY | WACC、税率 | 最优D/E比率 |
| **L6** | 无形资产估值接收层 | 接收并存储MoodMind非标资产数据 | — | **assetQuant通道** | 无形资产入表估值 |
| **L7** | CAPM圆锥稳态定价 | `E[R] = Rf + β(Rm-Rf)` 、β对接认知差异向量、圆锥浓度校准Rp | circle-boundary.js computeConeConcentration() | L5/L6、宏观Rf | 股权成本Ke |
| **L8** | 可比公司/并购先例估值 | P/E、P/B、EV/EBITDA多倍数对照、先例交易溢价回归 | — | 市场数据、L1财报 | 相对估值区间 |
| **L9** | 融资稀释/Pre-IPO定价 | VC轮次稀释模型、IPO估值区间、绿鞋期权 | — | L7/L8、融资轮次 | 股权价格、稀释比例 |
| **L10** | 宏观利率锚定模块 | Rf无风险利率期限结构、信用利差、宏观周期信号 | — | 宏观数据、gameEquilibrium | Rf动态校准 |
| **L11** | 全局资本风控总闸 | 0.68熔断→自动降杠杆→STEP9闸门写保护 | triangle-audit.js、THRESHOLDS.FUSE | 全层汇总风险分 | **riskThreshold熔断信号** |

---

## 第三章 金融稳态实证实验室完整目录结构

### 3.1 树形目录结构

```
labs/
└── finance-evidence-lab/ ............................. 🔬 金融科研实验室（纯科研隔离）
    ├── README.md ..................................... 科研免责声明+实验清单（已生成）
    ├── index.html ..................................... 实验入口总览页（已生成骨架，含免责声明）
    ├── capital-structure-lab.html .................... F-EXP01 多组资本结构对照仿真
    ├── industry-template-lab.html .................... F-EXP02 四大行业财务稳态对照
    ├── cone-finance-lab.html ......................... F-EXP03 圆锥财务风险浓度对照
    ├── dcf-montecarlo-lab.html ....................... F-EXP04 DCF折现率蒙特卡洛扫描
    ├── bankruptcy-boundary-lab.html .................. F-EXP05 破产风险边界仿真
    ├── js/
    │   ├── common-lab-utils.js ....................... 实验公共工具（Canvas初始化/阈值引用）
    │   └── lab-publish.js ............................ 实验结果标准化发布模板（仅assetQuant/riskThreshold）
    └── assets/
        └── industry-defaults/ ......................... 四大行业默认实验参数JSON
```

### 3.2 五组实验详细规格

| 实验ID | 实验名称 | Canvas仿真 | 对照组数量 | 核心数理模型 | 公共内核复用 |
|-------|---------|-----------|-----------|------------|------------|
| **F-EXP01** | 多组资本结构对照仿真 | 🟢 杠杆-价值曲线Canvas动态绘制 | 6组（无税MM/含税MM/高负债/低负债/最优杠杆0.5/破产成本） | MM命题Ⅰ/Ⅱ、税盾价值、破产成本权衡 | THRESHOLDS、triangle-audit |
| **F-EXP02** | 四大行业财务稳态对照 | 🟢 四行业半径圈层稳态对比Canvas | 4组（制造/互联网/非标/混合） | 行业稳态半径、最优资本结构行业差异 | circle-boundary圈层绘制 |
| **F-EXP03** | 圆锥财务风险浓度对照实验 | 🟢 三维圆锥+杠杆滑块实时渲染 | 5组（0.2/0.35/0.5/0.6/0.75杠杆） | 圆锥浓度 `C = m×ρ₀/V(h)`、圈层扩张/收缩 | circle-boundary.js computeConeConcentration() |
| **F-EXP04** | DCF折现率蒙特卡洛扫描 | 🟢 估值分布直方图 Canvas | 多参数扫描（WACC/Rp/g三参数） | 蒙特卡洛10000次抽样、DCF、分布统计 | quant-engine.js DCF |
| **F-EXP05** | 破产风险边界仿真 | 🟢 负债扩张→熔断→降杠杆动态循环Canvas | 4组（验证0.48/0.68分界合理性） | 破产概率模型、阈值敏感性测试 | THRESHOLDS三阈值、TriangleAudit |

### 3.3 实验室YBus规范（强制）

**✅ 允许发布的通道（仅限2个标准通道）：**

| 通道 | 发布内容 | 频率 |
|-----|---------|------|
| `assetQuant` | 财务实证校准系数、行业风险溢价参数Rp、β校准值 | 实验结束时单次发布 |
| `riskThreshold` | 实验验证后的风险阈值校准建议（非生产熔断信号，仅供FinanceMind商用层校准参考） | 阈值验证实验结束时 |

**❌ 严格禁止：**
- 发布到`kellyAllocation`/`powerSchedule`/`gameEquilibrium`/`mindVector`通道
- 订阅经营性实时数据源（交易价格、订单流等）
- 在实验代码中写入经营决策、仓位调整、定价建议逻辑
- 删除/修改科研免责声明Banner
- 使用`pipeline_*`之外的localStorage前缀

**本地存储三分区规范：**
| 分区 | 键前缀 | 内容 |
|-----|-------|------|
| 管线数据（原始终端） | `pipeline_exp_finance_*` | 实验原始测算结果、Canvas数据快照 |
| 草稿区（中间态） | `draft_exp_finance_*` | 用户调节中、未执行的实验参数 |
| 审计日志 | `audit_log_exp_finance_*` | 实验操作日志、三角审计校验结果 |

### 3.4 力学同构映射规范（复用#30双层阻尼）

F-EXP01/F-EXP03实验**必须复用**[/workspace/labs/structural-mechanics/exp30-gravity.html](file:///workspace/labs/structural-mechanics/exp30-gravity.html)双层阻尼模型映射逻辑：

| 力学概念（#30） | 财务概念（FinanceMind） | 映射关系 |
|----------------|----------------------|---------|
| C₁ 外层乱流阻尼 | **股权风险成本 Ke** | 市场波动、股权风险溢价 → 外层扰动 |
| C₂ 内层热风阻尼 | **债权刚性成本 Kd×(1-t)** | 利息支出刚性兑付、税盾缓冲 → 内层压力 |
| 球体总重量mg | **企业总价值 EV** | 总负载 |
| 偏心偏移量 cdist | **资本结构偏离度** | 偏离0.50中轴越远偏心越大 |
| 姿态稳定度 attStab | **财务健康度评分** | 0.49~0.51极致稳态对应最优杠杆 |
| 0.48安全线 | **保本线** | 对应保本不破产 |
| 0.68熔断线 | **破产风险熔断** | C₁+C₂总阻尼超过临界值，触发熔断降杠杆 |

---

## 第四章 YBus订阅/发布接口完整对照表

### 4.1 FinanceMind商用操作台 订阅输入（4通道）

| 通道 | 来源模块 | 订阅回调函数 | 必需字段 | 数据用途 | 异常处理 |
|-----|---------|------------|---------|---------|---------|
| **assetQuant** | MoodMind | `_onAssetQuant(data)` | `score` [0,1] | 非标无形资产估值、圆锥浓度 | score越界[0,1]静默丢弃+audit_log |
| **kellyAllocation** | GameMind | `_onKelly(data)` | `allocation.riskFraction` [0,1] | 凯利最优资本配比、风险资产仓位 | allocation缺失默认0.5中值 |
| **powerSchedule** | AirMind | `_onPowerSchedule(data)` | `load` [0,1] | 算力/运营固定成本负载、组织能耗 | load缺失默认0.5中值 |
| **gameEquilibrium** | GameMind | `_onEquilibrium(data)` | `equilibriumScore` [0,1] | 市场竞争均衡度、行业稳态基准 | equilibriumScore缺失默认0.5中值 |

### 4.2 FinanceMind商用操作台 发布输出（1通道）

| 通道 | 接收模块 | 发布载荷字段 | 前置校验 | 触发时机 |
|-----|---------|------------|---------|---------|
| **riskThreshold** | 三角审计引擎 / 全局风控 | `source`(固定"FinanceMind")、`score`[0,1]、`level`("SAFE"/"NORMAL"/"WARNING"/"FUSE")、`valuationScore`、`kellyLoad`、`powerLoad`、`eqScore`、`coneConcentration`、`timestamp` | **必须经TriangleAudit.validate()三模型并行校验（金融精算/博弈/几何）±0.02容差，未通过则阻断发布** | 四大输入通道任一数据更新后重算现金流健康度 → 若阈值状态改变则发布 |

### 4.3 金融稳态实证实验室 发布（2通道，仅校准参数）

| 通道 | 接收模块 | 发布载荷字段 | 前置校验 | 触发时机 |
|-----|---------|------------|---------|---------|
| **assetQuant** | FinanceMind商用层 | `source`(固定"FinanceEvidenceLab")、`experimentId`、`calibratedRp`、`calibratedBeta`、`industryDefaults`、`timestamp` | 三角审计校验+科研免责标识 | 实验完成、用户点击"应用校准参数"时 |
| **riskThreshold** | 三角审计 | `source`("FinanceEvidenceLab")、`score`、`level`("CALIBRATION")、`experimentId`、`suggestedThresholds` | 三角审计校验 | 阈值验证实验完成时 |

### 4.4 接口契约代码模板

`js/bus-subscribe.js`中已实现标准订阅模板，核心契约代码片段：

```javascript
// 1. 阈值引用（禁止本地重定义）
const TH = (typeof THRESHOLDS !== 'undefined')
    ? THRESHOLDS
    : Object.freeze({ BREAKEVEN: 0.48, STEADY: 0.50, FUSE: 0.68 });

// 2. 订阅标准通道
YBus.subscribe('assetQuant',       this._onAssetQuant.bind(this));
YBus.subscribe('kellyAllocation',  this._onKelly.bind(this));
YBus.subscribe('powerSchedule',    this._onPowerSchedule.bind(this));
YBus.subscribe('gameEquilibrium',  this._onEquilibrium.bind(this));

// 3. 数据合法性校验
_validate(data, requiredFields) {
    if (!data || typeof data !== 'object') return false;
    for (const f of requiredFields) if (data[f] == null) return false;
    return true;
}

// 4. 发布前三角审计校验（强闸）
if (TriangleAudit.validate) {
    const audit = TriangleAudit.validate({
        financialActuarial: riskData.score,
        gameTheory:        riskData.kellyLoad,
        geometric:         riskData.coneConcentration
    }, { source: 'FinanceMind', action: 'riskThreshold.publish' });
    if (!audit.passed) { console.error('三角审计未通过，阻断发布'); return false; }
}

// 5. 发布（仅标准通道）
YBus.publish('riskThreshold', payload, { trusted: true });
```

完整实现参见：[bus-subscribe.js](file:///workspace/engines/financemind/js/bus-subscribe.js)

---

## 第五章 数理工具挂载清单

### 5.1 复用现有公共内核（禁止重复开发）

| 公共内核文件 | 路径 | 复用的导出能力 | FinanceMind使用位置 |
|------------|------|--------------|-------------------|
| **YBus 三分区总线** | [assets/js/bus.js](file:///workspace/assets/js/bus.js) | `YBus.publish(channel,data,opts)` / `YBus.subscribe(channel,handler)` / 三分区隔离 | 全部模块统一通信基建 |
| **全局刚性阈值** | [assets/js/bus.js](file:///workspace/assets/js/bus.js) | `THRESHOLDS = Object.freeze({BREAKEVEN:0.48, STEADY:0.50, FUSE:0.68})` | 风控闸门、健康度分级、熔断判定 |
| **三角制衡审计引擎** | [assets/js/triangle-audit.js](file:///workspace/assets/js/triangle-audit.js) | `TriangleAudit.validate({financialActuarial, gameTheory, geometric}, meta)` 三模型并行±0.02容差 / STEP9写入闸门 | riskThreshold发布前强制校验 |
| **十步闭环向量引擎** | game-os-main/（STEP9闸门） | S0-S9流水线、STEP9最终写入拦截 | 资本操作指令（融资/分红/回购）最终拦截 |
| **认知画圈数理内核** | [game-os-main/core-engine/circle-boundary.js](file:///workspace/game-os-main/core-engine/circle-boundary.js) | `computeConeConcentration(m,rho,V)` / `contractCircle(r,v)` / `expandCircle(r,v)` / `multiPointLocking(points)` | L7 CAPM圆锥浓度校准、F-EXP03圆锥财务风险仿真、资本结构多点制衡 |
| **V/S/L几何算力模型** | [models/compute/compute-model.js](file:///workspace/models/compute/compute-model.js) | Volume/Surface/Length三维算力浓度 | 组织算力成本核算（对接powerSchedule） |
| **量化底层引擎** | game-os-main/quant-engine.js | DCF/WACC/凯利公式底层计算函数 | L3 NPV引擎、L5资本结构WACC、凯利配比接收解析 |
| **数据归一化工具** | [models/common/normalizer.js](file:///workspace/models/common/normalizer.js) | normalize()/denormalize() 数据归一化 | 四大输入通道数据归一化处理 |

### 5.2 罗斯《公司理财》标准数理公式清单（FinanceMind新增）

| 公式名称 | 公式 | 所在分区/层级 | 对应文件 |
|---------|------|-------------|---------|
| **自由现金流（FCFF）** | `FCFF = EBIT×(1-t) + D&A - CapEx - ΔNWC` | 分区A·三表推演 | three-statements-engine.js |
| **WACC加权平均资本成本** | `WACC = (E/V)×Ke + (D/V)×Kd×(1-t)` | 分区B·L5资本结构 | wacc-calculator.js（私有） |
| **MM命题Ⅱ（含税）** | `Ke = Ku + (Ku-Kd)×(D/E)×(1-t)` | 分区B·L5资本结构 | wacc-calculator.js（私有） |
| **CAPM资本资产定价** | `E[R] = Rf + β×(Rm-Rf) = Rf + Rp×β` | 分区B·L7圆锥定价 | capm-cone-pricing.js（私有） |
| **NPV净现值** | `NPV = Σ CFt/(1+r)^t  -  InitialInvestment` | 分区B·L3资本预算 | npv-irr-engine.js（私有） |
| **CVP本量利** | `BEP_Q = FC/(P-VC)`；`DOL = Q(P-VC)/(Q(P-VC)-FC)` | 分区A·CVP模型 | ratio-calculator.js |
| **杜邦分解ROE** | `ROE = (NI/Revenue) × (Revenue/Assets) × (Assets/Equity)` | 分区A·杜邦拆解 | ratio-calculator.js |
| **凯利最优配比** | `f* = (bp-q)/b`（b=赔率，p=胜率，q=1-p） | 分区B·L9融资（接收GameMind） | 订阅kellyAllocation通道 |
| **圆锥稳态定价** | `P = Rf + Rp×β  +  ConeConcentrationAdjustment` | 分区B·L7 CAPM+Cone | capm-cone-pricing.js（私有）复用circle-boundary |
| **现金转换周期CCC** | `CCC = DIO + DSO - DPO` | 分区A·营运资本 | zone-a-accounting.js |
| **利息保障倍数** | `ICR = EBIT/InterestExpense` | 分区A·风控、L11熔断 | risk-gatekeeper.js |

---

## 第六章 初始化代码模板

### 6.1 HTML入口标准模板

所有FinanceMind HTML页面必须遵循以下模板（已在[index.html](file:///workspace/engines/financemind/index.html)中生成）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>🏛️ FinanceMind · [页面标题]</title>
    <!-- 1. 基础样式 -->
    <link rel="stylesheet" href="../../assets/css/base.css?v=2">
    <!-- 2. YBus总线（必须最先加载） -->
    <script src="../../assets/js/bus.js?v=3"></script>
    <!-- 3. 数据归一化 -->
    <script src="../../models/common/normalizer.js?v=3"></script>
    <!-- 4. 三角审计引擎（riskThreshold发布前置依赖） -->
    <script src="../../assets/js/triangle-audit.js?v=3"></script>
    <!-- 5. 画圈公共数理内核 -->
    <script src="../../game-os-main/core-engine/circle-boundary.js?v=1"></script>
    <!-- 6. FinanceMind模块脚本 -->
    <script src="js/bus-subscribe.js?v=1"></script>
    <style>/* 模块级样式 */</style>
</head>
<body>
    <!-- HTML内容 -->
    <script>/* 模块初始化代码（必须用IIFE封装，禁止全局污染） */</script>
</body>
</html>
```

**关键约束：**
- 必须加载`bus.js`和`triangle-audit.js`，缺一不可
- 禁止重定义`THRESHOLDS`，引用方式：`const TH = (typeof THRESHOLDS!=='undefined') ? THRESHOLDS : Object.freeze({BREAKEVEN:0.48,STEADY:0.50,FUSE:0.68});`
- 所有JS代码用IIFE封装：`(function(){ 'use strict'; ... })();`

### 6.2 YBus订阅发布标准模板

完整模板参见[js/bus-subscribe.js](file:///workspace/engines/financemind/js/bus-subscribe.js)，核心结构：

```javascript
(function () {
    'use strict';

    // 引用全局阈值（不重定义）
    const TH = (typeof THRESHOLDS !== 'undefined')
        ? THRESHOLDS
        : Object.freeze({ BREAKEVEN: 0.48, STEADY: 0.50, FUSE: 0.68 });

    const FinanceMindBus = {
        state: { assetQuant:null, kellyAllocation:null, powerSchedule:null, gameEquilibrium:null },

        init: function () {
            if (typeof YBus === 'undefined') { setTimeout(()=>this.init(), 1000); return; }
            YBus.subscribe('assetQuant',      this._onAssetQuant.bind(this));
            YBus.subscribe('kellyAllocation', this._onKelly.bind(this));
            YBus.subscribe('powerSchedule',   this._onPowerSchedule.bind(this));
            YBus.subscribe('gameEquilibrium', this._onEquilibrium.bind(this));
        },

        publishRiskThreshold: function (riskData) {
            // 三角审计校验（强闸门）
            if (TriangleAudit && TriangleAudit.validate) {
                const r = TriangleAudit.validate({
                    financialActuarial: riskData.score,
                    gameTheory:        riskData.kellyLoad,
                    geometric:         riskData.coneConcentration
                }, { source:'FinanceMind', action:'riskThreshold.publish' });
                if (!r.passed) { console.warn('三角审计未通过，阻断发布'); return false; }
            }
            // 发布（仅标准通道）
            YBus.publish('riskThreshold', Object.assign({source:'FinanceMind', timestamp:Date.now()}, riskData), {trusted:true});
            return true;
        },
        // _onXXX回调（含数据合法性校验、范围校验、触发重算）...
    };

    window.FinanceMindBus = FinanceMindBus;
    document.addEventListener('DOMContentLoaded', () => FinanceMindBus.init());
})();
```

### 6.3 金融实验室页面标准模板

所有`labs/finance-evidence-lab/*.html`必须在body首部包含**免责声明Banner**（参见[index.html](file:///workspace/labs/finance-evidence-lab/index.html)）：

```html
<div class="disclaimer-banner">
    <div class="disc-title">⚠️ 科研实验模块 · 学术用途强制声明</div>
    本实验室为 <strong>Game-OS V2.1 金融稳态数理实证科研板块</strong>，仅用于复杂系统稳态学术研究：
    <ul>
        <li>❌ 不构成任何投资建议、财务建议、经营决策建议</li>
        <li>❌ 实验输出不直接接入经营决策链路，仅作为校准参数供给FinanceMind商用层</li>
        <li>✅ 保留完整学术对照组设计、参数扫描、蒙特卡洛仿真等科研原色</li>
        <li>✅ 股债资本成本模型复用#30双层阻尼力学同构（C₁股权风险+C₂债权刚性）</li>
    </ul>
</div>
```

### 6.4 目录初始化验证Checklist

开发新页面/模块前必须Check：

- [ ] HTML头部正确引入了`bus.js`、`triangle-audit.js`、`circle-boundary.js`
- [ ] 代码中没有重定义0.48/0.50/0.68数值，通过`THRESHOLDS`或兜底`Object.freeze`引用
- [ ] 订阅/发布通道名称是六大标准通道之一（mindVector/powerSchedule/assetQuant/riskThreshold/gameEquilibrium/kellyAllocation）
- [ ] 所有`riskThreshold`发布前调用`TriangleAudit.validate()`校验
- [ ] 实验室页面顶部保留完整科研免责Banner
- [ ] 商用层代码中无蒙特卡洛、对照组扫描、参数扫描等科研逻辑
- [ ] 实验代码中无仓位调整、定价建议、融资决策等商用逻辑
- [ ] localStorage使用规范前缀（`pipeline_`/`draft_`/`audit_log_`+模块标识）
- [ ] IIFE封装、`'use strict'`、无全局变量污染
- [ ] 私有精算代码放`financemind-private-engine/`，不提交公开层

---

## 第七章 与现有系统各模块联动校验要点

### 7.1 规避总线断点（对照审计报告P0/P1）

依据《底层基座+核心Mind引擎审计报告》和《科研实验室专项审计报告》识别的断点，FinanceMind必须：

| 断点编号 | 断点描述 | FinanceMind规避/修复措施 |
|---------|---------|----------------------|
| **P0-旧** | powerSchedule下游断链 | FinanceMind的bus-subscribe.js**必须订阅**powerSchedule，将AirMind算力负载计入固定成本，修复此断点 |
| **P0-旧** | kellyAllocation→MoodMind断链 | FinanceMind订阅kellyAllocation后，在L7圆锥定价中将凯利配比通过assetQuant回传需求（但不反向publish assetQuant，仅内部使用；MoodMind订阅修复由MoodMind侧完成） |
| **P0-新F1** | 圆锥金融精算模拟器→assetQuant断链 | FinanceMind L6层兼容接收来自`finance-risk-simulator.html`实验台发布的assetQuant校准数据 |
| **P0-新F3** | 终极沙盘→gameEquilibrium断链 | FinanceMind的gameEquilibrium订阅通道兼容接收终极沙盘发布的博弈均衡数据 |
| **P1-旧** | 物理力学实验未复用circle-boundary | FinanceMind L7层**必须直接import** circle-boundary.js的`computeConeConcentration()`，不重复实现圆锥浓度计算 |
| **P1-新** | 物理实验YBus通道错误（用simulatorOutput） | FinanceMind**禁止订阅simulatorOutput**；等待#30修复为标准通道后统一接入 |

### 7.2 规避内核未复用（禁止重复开发）

开发前核查清单：

| 需要的能力 | 禁止自行实现 | 必须复用 |
|-----------|-----------|---------|
| 圆锥浓度计算、圈层收缩/扩张 | ❌ 自己写C=mρ/V | ✅ `circle-boundary.js: computeConeConcentration()` |
| 三模型并行校验、STEP9闸门 | ❌ 自己写if/else风控阈值 | ✅ `triangle-audit.js: TriangleAudit.validate()` |
| 消息发布订阅、三分区存储 | ❌ 自己写CustomEvent+localStorage | ✅ `bus.js: YBus.publish/subscribe` |
| 0.48/0.50/0.68阈值判断 | ❌ 写死数字0.48/0.50/0.68 | ✅ `THRESHOLDS.BREAKEVEN/STEADY/FUSE` |
| 数据归一化/反归一化 | ❌ 自己写normalize函数 | ✅ `normalizer.js` |
| DCF/WACC/凯利基础计算 | ❌ 自己写NPV求和/凯利公式 | ✅ `quant-engine.js`（如缺则在私有层financemind-private-engine实现） |

### 7.3 科研/商业边界防御

四道防线确保商业化逻辑不污染科研层，实验逻辑不泄漏至商用层：

1. **物理目录隔离**：商用层`engines/financemind/`、私有层`financemind-private-engine/`、科研层`labs/finance-evidence-lab/`三目录完全平级分离，无相互import（商用层仅通过YBus通道接收科研层校准参数）
2. **通道白名单**：实验室仅允许publish到assetQuant和riskThreshold两个通道，无法直接触发经营性操作
3. **三角审计闸门**：所有riskThreshold发布必须经三模型校验，实验层输出的校准信号风险level固定为"CALIBRATION"，不会被商用层识别为"FUSE"熔断
4. **免责声明UI强制**：实验室所有页面顶部固定免责Banner，从UI层面明确科研属性

### 7.4 初始化文件清单（本次已生成）

| 文件 | 状态 | 路径 |
|-----|------|------|
| FinanceMind 主入口index.html（双分区骨架） | ✅ 已生成 | [engines/financemind/index.html](file:///workspace/engines/financemind/index.html) |
| YBus订阅/发布初始化模板（四通道订阅+三角审计发布） | ✅ 已生成 | [engines/financemind/js/bus-subscribe.js](file:///workspace/engines/financemind/js/bus-subscribe.js) |
| FinanceMind README模块说明 | ✅ 已生成 | [engines/financemind/README.md](file:///workspace/engines/financemind/README.md) |
| 私有精算内核README+规划 | ✅ 已生成 | [engines/financemind-private-engine/README.md](file:///workspace/engines/financemind-private-engine/README.md) |
| 金融实验室入口总览（含免责声明） | ✅ 已生成 | [labs/finance-evidence-lab/index.html](file:///workspace/labs/finance-evidence-lab/index.html) |
| 金融实验室README+实验清单+规范 | ✅ 已生成 | [labs/finance-evidence-lab/README.md](file:///workspace/labs/finance-evidence-lab/README.md) |
| 物理目录树 | ✅ 已创建 | engines/financemind/{js,css,assets}、financemind-private-engine/、labs/finance-evidence-lab/ |
| **本搭建规范文档** | ✅ 已生成 | [FinanceMind V1.0 双分区架构搭建规范与目录设计文档.md](file:///workspace/docs/system-v21-rectification/FINANCEMIND_V1.0_双分区架构搭建规范与目录设计文档.md) |

---

## 附录：名词约定

| 缩写/术语 | 含义 |
|---------|------|
| WACC | Weighted Average Cost of Capital，加权平均资本成本 |
| CAPM | Capital Asset Pricing Model，资本资产定价模型 |
| DCF | Discounted Cash Flow，现金流折现估值 |
| NPV/IRR | Net Present Value / Internal Rate of Return，净现值/内部收益率 |
| NWC | Net Working Capital，净营运资本 |
| CCC | Cash Conversion Cycle，现金转换周期 |
| DOL | Degree of Operating Leverage，经营杠杆系数 |
| FC/VC | Fixed Cost / Variable Cost，固定成本/可变成本 |
| MM定理 | Modigliani-Miller定理，资本结构无关论（含税盾修正） |
| LBO | Leveraged Buyout，杠杆收购 |
| Comps | Comparable Company Analysis，可比公司估值法 |
| C₁/C₂双层阻尼 | 外层乱流阻尼/内层热风阻尼（#30力学实验），映射股权风险成本/债权刚性成本 |
| STEP9闸门 | 十步闭环向量引擎最终写入拦截，必须经三角审计通过才能落盘 |
| TH | 全局阈值常量对象，包含BREAKEVEN/STEADY/FUSE三个冻结值 |

---

**文档归档信息**
- 归档版本：Game-OS V2.1（80分B级完整版）
- 生成日期：2026-07-20
- 本文件：`engines/financemind/docs/FINANCEMIND_V1.0_双分区架构搭建规范与目录设计文档.md`
- 配套文件：[罗斯公司理财数理工具挂载清单.md](file:///workspace/engines/financemind/docs/罗斯公司理财数理工具挂载清单.md)
- 前置审计文件1：`docs/system-v21-rectification/Game-OS_V2.1_底层基座与核心Mind引擎深度架构审计报告.md`
- 前置审计文件2：`docs/system-v21-rectification/Game-OS_V2.1_全科研实证实验室专项深度审计报告.md`
- 初始化代码版本：V1.0 骨架版（双分区UI+YBus四通道订阅+三角审计发布+实验室免责声明入口）
- 下一步：按L1→L11顺序逐层填充投行数理内核；按F-EXP01→F-EXP05顺序开发金融实证实验
