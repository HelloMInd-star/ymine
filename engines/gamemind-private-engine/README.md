# GameMind Private Engine (SEALED)

**状态**: SEALED_FOR_COPYRIGHT_DEPOSIT · 版权交存密封

本目录为 GameMind 全域通用博弈总基座的私有涉密内核接口桩。

## 涉密资产清单（已密封）

- `nash-equilibrium.js` - 纳什均衡求解内核
- `kelly-criterion.js` - 凯利公式最优决策计算
- `strategy-evolution.js` - 多方策略迭代演化模型

## 前端调用

```javascript
window.GameMindPrivate.nashEquilibrium.calculateNash(...)
window.GameMindPrivate.kellyCriterion.optimalFraction(...)
window.GameMindPrivate.strategyEvolution.evolveStrategies(...)
```

> 完整涉密内核已作软著例外交存密封处理，前端仅暴露接口桩。
