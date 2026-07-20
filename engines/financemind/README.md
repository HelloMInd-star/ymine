# FinanceMind · 量化公司理财 & 投行资本中台 V1.0

FinanceMind 是 Game-OS V2.1 体系下的集团级财务与资本市场中台，采用双分区架构：
- **分区A 对内传统量化财务核算区**（集团财务部职能）
- **分区B 对外11层投行资本市场估值区**（集团投行资本总部职能）

## 基本信息
- **版本**: V1.0 · Game-OS V2.1 B级整改版基线
- **定位**: 量化公司理财 & 投行资本中台 · CFO & 投行总部双区架构
- **入口**: index.html
- **对应私有内核**: ../financemind-private-engine/
- **对应科研实验室**: ../../labs/finance-evidence-lab/

## 架构约束
- 强制绑定全局三大刚性阈值：0.48保本 / 0.50稳态中轴 / 0.68熔断（复用THRESHOLDS常量，禁止本地重定义）
- 严格复用YBus六大标准通道，禁止新增私有通道
- 商用操作台与金融科研实验室物理目录完全隔离，严禁商业化逻辑污染科研实证内核
- 所有输出至riskThreshold通道的信号须经三角审计引擎STEP9闸门校验

## YBus订阅输入
| 通道 | 来源模块 | 用途 |
|------|---------|------|
| assetQuant | MoodMind | 非标无形资产四维估值、圆锥浓度 |
| kellyAllocation | GameMind | 全域资源最优资本配比 |
| powerSchedule | AirMind | 算力/运营固定成本负载 |
| gameEquilibrium | GameMind | 市场竞争均衡、行业稳态基准 |

## YBus发布输出
| 通道 | 接收模块 | 内容 |
|------|---------|------|
| riskThreshold | 三角审计/全局风控 | 资本结构风险、融资熔断预警、现金流保本预警 |

## 复用公共内核（禁止重复开发）
- ../../assets/js/bus.js — YBus三分区消息总线
- ../../assets/js/triangle-audit.js — 三角三模型并行校验（STEP9闸门）
- ../../game-os-main/core-engine/circle-boundary.js — 圆锥浓度/圈层收缩内核
- ../../game-os-main/quant-engine.js — DCF/WACC/凯利底层计算
- 全局THRESHOLDS常量（0.48/0.50/0.68）
