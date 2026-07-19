# isomorphism-block-private-engine
> 跨域同构积木映射引擎 · 私有内核库（物理隔离仓库）

## ⚠️ 权限说明
- 本仓库为 **单人读写** 权限仓库
- 关闭所有外部克隆、PR、访问权限
- 外网不可访问

## 目录结构

```
isomorphism-block-private-engine/
├── full-derivations/          # 9大领域完整版原始推导文稿
│   ├── finance-cad.md
│   ├── cad-lego.md
│   ├── lego-battery.md
│   ├── battery-cad.md
│   ├── garden-finance.md
│   ├── ops-pdca.md
│   ├── pdca-llm.md
│   ├── llm-geo.md
│   └── geo-lowaltitude.md
├── thresholds/                # 积木兼容判定精细权重与阈值
│   ├── compatibility-weights.json   # 各维度权重系数
│   ├── interface-thresholds.json    # 接口匹配阈值
│   ├── structure-isomorphism.json   # 结构同构度参数
│   └── risk-fuse-config.json        # 0.6熔断精细配置
├── commercial-kits/           # 全套商业化交付资料
│   ├── pricing-system.md            # 定价体系
│   ├── service-playbook.md          # 服务底稿
│   ├── delivery-templates/          # 交付模板
│   └── case-studies/                # 完整案例
├── biomed-track/              # 生物医学预留赛道
│   └── architecture/               # 底层架构方案
│       └── biomed-isomorphism.md
├── astronomy-track/           # 天文物理预留赛道
│   └── architecture/
│       └── astrophysics-isomorphism.md
└── README.md
```

## 与公开引擎联动逻辑
1. 公开引擎 `isomorphism-block-engine` 仅做展示、基础结构演示
2. 高精度量化运算、完整深度推演，需通过私有API调用本库数据包
3. 缺失本库时，公开引擎仅能做基础结构演示，无法商用落地
