# 🧠 Engines · 七大独立认知引擎

Game-OS 核心能力层。每个引擎是一个独立的认知模块，通过 YBus 消息总线通信，互不直接依赖。

## 快速索引

| 引擎 | 入口 | 职责 | 核心能力 |
|------|------|------|---------|
| **GameMind** | [gamemind/](gamemind/index.html) | 博弈总基座 | 纳什均衡求解、Cournot博弈、蜈蚣博弈 |
| **AirMind** | [airmind/](airmind/index.html) | 低空调度引擎 | 空域冲突检测、级联阻尼权重、对流算法 |
| **FinanceMind** | [financemind/](financemind/index.html) | 金融引擎 | WACC/DCF估值、CAPM锥心定价、破产风险 |
| **MindSpeak** | [mindspeak/](mindspeak/index.html) | 认知语言引擎 | 四层认知向量、4D向量算子、置信核 |
| **GeomCompute** | [geom-compute/](geom-compute/index.html) | 几何计算引擎 | V/S/L算力模型、错峰调度、KV-cache优化 |
| **EvolveMind** | [evolvemind/](evolvemind/index.html) | 演化引擎 | 思维演化、三层记忆、偏误参数化 |
| **MoodMind** | [moodmind/](moodmind/index.html) | 情绪估值引擎 | 非标资产计量、KMP评分、情绪向量 |

## 目录约定

每个公开引擎目录包含：
- `index.html` — 对外演示入口
- `README.md` — 引擎说明文档
- `assets/` 或 `js/` — 引擎专属静态资源（如适用）

## 🔒 私有引擎

涉密内核物理隔离于独立目录，公开层仅暴露 stub 占位：

| 私有引擎 | 位置 | 对应公开引擎 |
|---------|------|------------|
| airmind-private-engine | [airmind-private-engine/](airmind-private-engine/) | AirMind |
| financemind-private-engine | [financemind-private-engine/](financemind-private-engine/) | FinanceMind |
| mindspeak-private-engine | [mindspeak-private-engine/](mindspeak-private-engine/) | MindSpeak |
| isomorphism-block-private-engine | ../isomorphism-block-private-engine/ | 同构拦截引擎 |
| traditional-culture-vector-private-engine | ../traditional-culture-vector-private-engine/ | 文化向量引擎 |
| ymine-circle-cognitive-engine | ../ymine-circle-cognitive-engine/ | 圆环认知引擎 |
