# Geom Compute Private Engine (SEALED)

**状态**: SEALED_FOR_COPYRIGHT_DEPOSIT · 版权交存密封

本目录为几何心智算力底座的私有涉密内核接口桩。

## 涉密资产清单（已密封）

- `vsl-geometry.js` - V/S/L 几何算力模型完整实现
- `threshold-fuse.js` - 0.48/0.5/0.68全局阈值熔断内核
- `binary-hardware.js` - 二进制硬件落地映射

## 前端调用

```javascript
window.GeomComputePrivate.vslModel.computeGeometry(...)
window.GeomComputePrivate.thresholdFuse.checkThreshold(...)
```

> 完整涉密内核已作软著例外交存密封处理，前端仅暴露接口桩。
