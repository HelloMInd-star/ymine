# 📦 Game-OS Main · 后端内核与业务模块

Game-OS 执行层，包含 Node.js 后端内核和五大垂直业务模块。

## 📂 目录结构

```
game-os-main/
├── core-engine/           # 🔥 内核模块（安全核心）
│   ├── _internal.js       #    内部工具函数（委托YModels.common）
│   ├── safety-fuse.js     #    七类安全熔断基线（0.68硬约束）
│   ├── kelly-base.js      #    Kelly仓位公式（half/quarter缩放）
│   ├── four-layer-control.js  # 四层管控（L1全自动→L4极端回退）
│   ├── fat-lean-band.js   #    动态松紧带（FAT/NEUTRAL/LEAN）
│   ├── circle-boundary.js #    圆环边界
│   ├── triangle-loopback.js   # 三角闭环
│   ├── common-api.js      #    公共API层
│   └── eleven-layer-public.js # 十一层公开接口
│
├── business-modules/      # 🏢 五大垂直业务模块
│   ├── circle-cognitive/  #    圆环认知（含private-logic）
│   ├── lowalt-economy/    #    低空空域经济
│   ├── math-cognition/    #    数感认知
│   ├── mcn-valuation/     #    MCN估值
│   └── wall-street-11step/ #   华尔街十一
│
└── total-index.html       # Game-OS内核总览页
```

## 🔧 内核架构

core-engine 采用 UMD 模式，同时支持：
- **Node.js**：`require('./core-engine/safety-fuse.js')`
- **浏览器**：通过 `<script>` 标签加载，挂载为 `window._GameOS_SafetyFuse`

### 关键安全约束

| 常量 | 值 | 含义 |
|------|-----|------|
| `FUSE_BASELINE` | 0.68 | 熔断警戒线，任何指标≥此值强制停机 |
| `POSITION_ZERO` | 0 | 熔断时强制仓位归零 |
| `KELLY_HALF_FACTOR` | 0.5 | 半Kelly缩放系数 |
| `KELLY_QUARTER_FACTOR` | 0.25 | 四分之一Kelly缩放系数 |
| `canBypass` | false | 熔断不可绕过（硬约束） |
