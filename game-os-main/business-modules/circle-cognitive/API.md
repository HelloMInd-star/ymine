# Circle Cognitive Engine · API Reference
## 画圈认知引擎 · 官方接口文档 v2.1

---

## 架构说明

本模块严格遵循 **GameOS 三层刚性架构**：

| 层级 | 位置 | 职责 |
|------|------|------|
| L1 表层 | `circle-lab.html` | 可视化交互、用户操作、结果展示 |
| L2 中间层 | `private-logic/circle-public-api.js` | 统一公共API调度、熔断检查、参数校验 |
| L3 算力层 | `ymine-circle-cognitive-engine/` (私有仓库) | 核心加权算法、拟合系数、阈值配置 |

---

## 通用规范

### 熔断机制
所有接口兼容 **0.6 风险浓度熔断**：
- `riskConcentration > 0.6` 时返回 HTTP 403，操作自动锁死
- 熔断事件通过 `GameOSBus.emit('circle-fuse-update')` 上报总控台

### 统一响应格式
```javascript
{
  code: 200,              // 200=成功, 400=参数错误, 403=熔断, 404=未知操作
  message: 'OK',
  moduleId: 'circle-cognitive',
  version: '2.1.0',
  data: { ... },          // 业务数据
  loopback: {
    canRerun: true,
    feedbackReady: false,
    recommendedAction: 'CONTINUE', // CONTINUE | RESET
    status: 'IDLE'
  }
}
```

### 变量全局映射
| 物理变量 | 业务映射 | 坐标轴 |
|----------|----------|--------|
| 圆圈半径 | 供给 | 水平轴 (X) |
| 画圈运行速度 | 需求 | 垂直轴 (Y) |
| 圆心偏移/方向 | 政策外部干预 | 全局偏移 |

---

## API 列表

### 1. circle_static_solve
**静态线性方程组求解（鸡兔同笼模型）**

静态圈 = 动态圈在 `speed=0` 时的特殊形态。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| totalHeads | number | ✅ | 总头数（弹性约束） |
| totalLegs | number | ✅ | 总腿数（政策硬性约束） |

**变量映射**：
- 🐔 鸡数量 = 需求
- 🐰 兔数量 = 供给
- 总头数 = 弹性约束
- 总腿数 = 政策硬约束

**响应示例**：
```javascript
{
  mode: 'static',
  model: 'chicken_rabbit_linear',
  solution: { chickens: 23, rabbits: 12, totalHeads: 35, totalLegs: 94 },
  equilibrium: { x: 12, y: 23, stability: 1.0 },
  circleParams: { centerX: 12, centerY: 23, radius: 6, speed: 0 },
  lineEquations: { line1: 'x + y = 35', line2: '2x + 4y = 94' }
}
```

---

### 2. circle_dynamic_evolve
**供需动态圈层演化演算**

支持圆心漂移、半径伸缩、持续旋转、黑天鹅扰动、蓝海/红海市场仿真。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| initialDemand | number | ❌ | 50 | 初始需求 (0-100) |
| initialSupply | number | ❌ | 50 | 初始供给 (0-100) |
| policyOffset | number | ❌ | 0 | 政策干预偏移 (-50~50) |
| marketType | string | ❌ | 'blue_sea' | 'blue_sea' (蓝海) \| 'red_sea' (红海) |
| blackSwanShock | number | ❌ | 0 | 黑天鹅扰动强度 (0-100, ≥60熔断) |
| ticks | number | ❌ | 60 | 演化步数 |
| riskConcentration | number | ❌ | 0 | 风险浓度 (0-1, >0.6熔断) |

**市场特征（阈值需私有引擎配置）**：
- 🌊 蓝海：低波动、高均衡稳定性、高额利润空间
- 🔥 红海：剧烈扰动、稳定性差、利润被持续压缩

**响应指标**：
```javascript
{
  mode: 'dynamic',
  marketType: 'blue_sea',
  timeSeries: [ ... ],      // 每一刻度的圆心/半径/角度时序数据
  finalState: { centerX, centerY, radius, angle },
  metrics: {
    equilibriumStability: number,  // 均衡稳定性 (0-1)
    priceVolatility: number,       // 价格波动幅度 (%)
    profitSpace: number,           // 整体利润空间
    convergenceSpeed: number,      // 博弈收敛速度
    shockRecovered: boolean        // 黑天鹅冲击是否恢复
  }
}
```

> ⚠️ **【需在私有circle认知引擎内配置填充】**：蓝海/红海波动率阈值、收敛系数、利润压缩率、黑天鹅恢复曲线

---

### 3. circle_ai_feedback
**AI 反馈闭环迭代运算**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| prompt | string | ✅ | - | 用户提示词（需求端） |
| systemInstruction | string | ❌ | '' | 全局系统指令（政策约束） |
| contextLength | number | ❌ | 4096 | 上下文长度（系统弹性） |
| maxIterations | number | ❌ | 10 | 最大迭代轮次 |

**变量映射**：
- 提示词 = 需求端
- AI生成内容 = 供给端
- 上下文长度 = 系统弹性
- 系统指令 = 政策约束
- Token生成速率 = 运行速度

**完整链路**：输入→推理输出→反馈修正→新一轮迭代逼近均衡

**响应**：
```javascript
{
  mode: 'ai_feedback',
  loop: 'input→reason→feedback→iterate',
  iterations: [ ... ],  // 每轮迭代的质量/token/距离
  result: {
    equilibriumReached: boolean,
    convergenceScore: number,   // 0-1
    totalIterations: number,
    finalContextUsage: number   // 0-1
  }
}
```

> ⚠️ **【需在私有circle认知引擎内配置填充】**：实际LLM接入、嵌入向量模型、质量评估算法

---

### 4. circle_tracking_collect
**手绘轨迹运动指标采集（神经运动学）**

采集真人鼠标画圈的四项核心神经运动指标，完整对齐 PDCA 商业逻辑。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| points | Array&lt;{x,y,t}&gt; | ✅ | 鼠标轨迹点数组 (至少10个点) |
| expectedRadius | number | ❌ | 标准圆半径（Plan目标） |
| expectedCenter | {x,y} | ❌ | 标准圆圆心 |

**PDCA 对齐**：
- **Plan** = 标准虚线圆（预期目标）
- **Do** = 实际手绘轨迹（执行）
- **Check** = 径向预测误差（检查）
- **Act** = 圆度持续提升（迭代优化）

**四项核心指标**：
```javascript
{
  mode: 'tracking',
  metrics: {
    roundness: number,        // 圆度 (0~1区间)，核心指标
    radialError: number,      // 径向误差 (RMSE)
    speedVariation: number,   // 速度变异系数
    centerDrift: number,      // 圆心总漂移量
    meanRadius: number,
    sampleCount: number
  },
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_PRACTICE'
}
```

**评级阈值（需私有引擎配置）**：
- 圆度 > 0.85 = EXCELLENT
- 圆度 > 0.70 = GOOD
- 圆度 > 0.50 = FAIR
- 否则 = NEEDS_PRACTICE

> ⚠️ **【需在私有circle认知引擎内配置填充】**：神经运动指标阈值、PDCA学习曲线拟合、进步评估算法

---

### 5. circle_bias_compare
**理性决策与人脑偏差对照计算（双决策对照组）**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| infoAccuracy | number | ❌ | 0.7 | 信息准确度 (0-1) |
| feedbackSpeed | number | ❌ | 0.5 | 反馈速度 (0-1) |
| scenario | string | ❌ | 'investment' | 决策场景 |

**两组对照**：
1. **理性基准组**：贝叶斯纯理性决策
2. **真实人脑组**：内置三类心理偏差
   - 锚定偏差 (Anchoring)
   - 损失厌恶 (Loss Aversion)
   - 过度自信 (Overconfidence)

**自动横向对比三项差值**：
- 决策精度差
- 收敛速度差
- 实际期望收益差

**响应**：
```javascript
{
  groups: {
    rational: { decisionAccuracy, convergenceSpeed, expectedReturn },
    human: { decisionAccuracy, convergenceSpeed, expectedReturn, biases: {...} }
  },
  delta: {
    accuracyDelta: number,     // 理性精度 - 人脑精度
    convergenceDelta: number,  // 人脑轮次 - 理性轮次
    returnDelta: number        // 理性收益 - 人脑收益
  }
}
```

> ⚠️ **【需在私有circle认知引擎内配置填充】**：锚定/损失厌恶/过度自信三类偏差权重系数

---

### 6. circle_market_blue_red
**蓝海红海市场仿真计算**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| marketType | string | ❌ | 'blue_sea' | 'blue_sea' \| 'red_sea' |
| policySupport | number | ❌ | 0.5 | 政策支持力度 (0-1) |
| competition | number | ❌ | 0.5 | 竞争激烈程度 (0-1) |

**响应指标**：
```javascript
{
  marketType: 'blue_sea' | 'red_sea',
  metrics: {
    volatility: number,       // 波动率
    stability: number,        // 稳定性
    profitMargin: number,     // 利润率
    convergenceSpeed: number, // 收敛速度
    description: string
  },
  indicators: {
    entryRecommended: boolean,
    riskLevel: 'LOW' | 'HIGH',
    fuseSafe: boolean
  }
}
```

> ⚠️ **【需在私有circle认知引擎内配置填充】**：蓝海/红海详细阈值、竞争响应系数

---

### 7. circle_match_rate
**创始人-商业模型匹配度综合运算**

五大加权评估维度，三档评级。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| founderAbility | number | ❌ | 0.5 | 创始人能力 (0-1) |
| decisionQuality | number | ❌ | 0.5 | 决策质量 (0-1) |
| cognitiveAccuracy | number | ❌ | 0.5 | 认知准确度 (0-1) |
| marketFit | number | ❌ | 0.5 | 市场适配度 (0-1) |
| executionEfficiency | number | ❌ | 0.5 | 执行效率 (0-1) |

**评级标准**：
| 总匹配率 | 评级 | 建议 |
|----------|------|------|
| > 75% | HIGH_MATCH (高匹配) | 推荐全力投入 |
| 50% ~ 75% | MEDIUM_MATCH (中等匹配) | 建议补强短板后进入 |
| < 50% | LOW_MATCH (低匹配) | 不推荐，建议重新评估 |

**响应**：
```javascript
{
  dimensionScores: { founderAbility, decisionQuality, cognitiveAccuracy, marketFit, executionEfficiency },
  weights: { ... },           // 【需私有引擎填充】五维权重
  totalMatchRate: number,     // 0-1
  rating: 'HIGH_MATCH' | 'MEDIUM_MATCH' | 'LOW_MATCH',
  recommendation: string
}
```

> ⚠️ **【需在私有circle认知引擎内配置填充】**：五大维度加权系数（默认各维度均等权重仅为占位）

---

## 前置市场预判

实验启动前三档选择（前端交互，不经过API运算）：

1. **明确给出区间判断** - 精准边界，但可能过度自信（锚定偏差风险）
2. **谨慎预留余地** - 模糊区间，保留容错，较稳健
3. **信息不足暂不判断** - 等待更多数据，避免误判，放弃机会成本

---

## 认知循环理论映射

人类完整认知循环：**学习 → 运用 → 忘记（上下文重置）→ 再次学习**

对标AI算法闭环：**向量提取 → 检索匹配 → 内容生成 → 上下文重置迭代**

配套三条认知实现路径：
1. **语言学结构**：词根→词缀→新词
2. **奥数解题思维**：假设→验证→回退
3. **严谨数学推演**：搭建结构→设置变量→求解答案

---

## 私有引擎接入指南

核心算法、私有权重统一存放于私有仓库 `ymine-circle-cognitive-engine`，公开侧仅保留空调用逻辑。

私有引擎需要暴露的全局对象：
```javascript
window.PRIVATE_ENGINE = {
  connected: true,
  founderWeights: { founderAbility, decisionQuality, cognitiveAccuracy, marketFit, executionEfficiency },
  biasWeights: { anchoring, lossAversion, overconfidence },
  marketThresholds: { blueSeaVolatility, redSeaVolatility, convergenceSpeed, profitCompression, blackSwanRecoveryRate },
  trackingThresholds: { roundnessPerfect, roundnessGood, roundnessLearning, radialErrorMax, speedVariationMax, driftTolerance },
  pdcaCoefficients: { planTargetTolerance, doExecutionVariance, checkFeedbackGain, actLearningRate },
  cognitiveLoop: { learningDecayRate, contextResetThreshold, retrievalAccuracy, generationQuality, iterationConvergence },
  cognitivePaths: { linguisticMapping, mathProblemSolving, formalDeduction }
};
```

所有空值参数统一标注：**【需在私有circle认知引擎内配置填充】**
