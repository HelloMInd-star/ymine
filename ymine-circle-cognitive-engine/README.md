# 🔒 ymine-circle-cognitive-engine
## 画圈认知引擎 · 私有算力层 (PRIVATE REPOSITORY)

---

⚠️ **本仓库为私有GitHub仓库，核心算法上锁保管，不对外公开**

---

## 职责说明

本目录为GameOS三层架构中的 **L3 底层算力层**，存放：

- 全部加权算法
- 拟合系数
- 蓝海/红海市场阈值
- 认知偏差权重系数
- 神经运动指标阈值
- PDCA循环学习系数
- 认知循环映射参数
- 三大认知路径系数

公开侧 (`game-os-main`) 仅保留空调用接口，所有参数通过本引擎注入覆盖。

---

## 接入方式

1. 将 `private-engine-loader.js` 在公共API之后载入页面
2. 设置 `window.PRIVATE_ENGINE.connected = true`
3. 填充所有权重配置项（当前所有值为 `null` 占位）
4. 公共API层 `circle-public-api.js` 会自动检测并使用私有权重

---

## 需填充配置项

```javascript
window.PRIVATE_ENGINE = {
  connected: true,

  // 五大维度创始人匹配权重
  founderWeights: {
    founderAbility: null,      // 【需配置】创始人能力权重
    decisionQuality: null,     // 【需配置】决策质量权重
    cognitiveAccuracy: null,   // 【需配置】认知准确度权重
    marketFit: null,           // 【需配置】市场适配度权重
    executionEfficiency: null  // 【需配置】执行效率权重
  },

  // 三类认知偏差权重
  biasWeights: {
    anchoring: null,           // 【需配置】锚定偏差
    lossAversion: null,        // 【需配置】损失厌恶
    overconfidence: null       // 【需配置】过度自信
  },

  // 市场仿真阈值
  marketThresholds: {
    blueSeaVolatility: null,   // 【需配置】蓝海波动率上限
    redSeaVolatility: null,    // 【需配置】红海波动率下限
    convergenceSpeed: null,    // 【需配置】收敛速度系数
    profitCompression: null,   // 【需配置】红海利润压缩系数
    blackSwanRecoveryRate: null // 【需配置】黑天鹅恢复速率
  },

  // 神经运动跟踪阈值
  trackingThresholds: {
    roundnessPerfect: null,    // 【需配置】圆度完美阈值
    roundnessGood: null,       // 【需配置】圆度良好阈值
    roundnessLearning: null,   // 【需配置】学习进步阈值
    radialErrorMax: null,      // 【需配置】径向误差最大值
    speedVariationMax: null,   // 【需配置】速度变异系数最大值
    driftTolerance: null       // 【需配置】圆心漂移容忍度
  },

  // PDCA循环学习系数
  pdcaCoefficients: {
    planTargetTolerance: null, // 【需配置】Plan目标容差
    doExecutionVariance: null, // 【需配置】Do执行方差
    checkFeedbackGain: null,   // 【需配置】Check反馈增益
    actLearningRate: null      // 【需配置】Act迭代学习率
  },

  // 认知循环映射
  cognitiveLoop: {
    learningDecayRate: null,       // 【需配置】遗忘曲线衰减率
    contextResetThreshold: null,   // 【需配置】上下文重置阈值
    retrievalAccuracy: null,       // 【需配置】检索匹配准确率
    generationQuality: null,       // 【需配置】内容生成质量系数
    iterationConvergence: null     // 【需配置】迭代收敛判定
  },

  // 三大认知路径系数
  cognitivePaths: {
    linguisticMapping: null,       // 【需配置】语言学结构路径系数
    mathProblemSolving: null,      // 【需配置】奥数解题思维系数
    formalDeduction: null          // 【需配置】严谨数学推演系数
  }
};
```

---

## 保密要求

1. 本仓库为 **private** 私有仓库，仅授权人员可访问
2. **禁止**将任何本目录代码推送到公开仓库
3. 所有权重系数、阈值为Y.MINE核心知识产权
4. 公共仓库中所有对应位置必须标注：**【需在私有circle认知引擎内配置填充】**
