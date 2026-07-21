# MoodMind-Lab 安全规范 (Batch1)

## 1. 7 条全局开发红线（强制）

| # | 红线 | Batch1处理 |
|---|------|-----------|
| 1 | 禁止在公开工程内编写 11 维金融向量、IPD、四维光照加权底层公式 | ✅ 39个接口全部 NotImplementedError |
| 2 | 禁止实现改良 KMP 匹配源码，仅允许接收外部传入的分值数字 | ✅ 仅 `receive_final_score(score)` 可用 |
| 3 | 禁止编写球面风险模长、0.48/0.50/0.68 风控底层运算 | ✅ 全部方法 NotImplementedError |
| 4 | 禁止搭建通用数学求解库，仅允许预留固定模板入口 | ✅ 仅占位Stub，无求解库 |
| 5 | 前端所有图表只做可视化展示，不嵌入任何运算逻辑 | ✅ 所有图表数值为硬编码占位 |
| 6 | private_moodmind_engine 私有内核文件夹不纳入工程代码仓库 | ✅ 仅在 `../private_moodmind_engine`，不打包 |
| 7 | 全系统批量导出严格限制 MAX_EXPORT_BATCH=100，禁止全库导出 | ✅ 硬编码 `MAX_EXPORT_BATCH_SIZE=100` |

## 2. RBAC 三级权限

| 角色 | level | 核心权限 |
|------|-------|---------|
| admin（管理员） | 3 | 全部功能/配置/用户/审计/私有维度查看 |
| architect（架构审核） | 2 | 向量/光照/KMP/风控审核、策略审批、只读用户管理 |
| operator（操作员） | 1 | 存储/算力/告警/导出监控、服务重启、无金融数据写入 |

配置文件：`security/rbac_role.json`

## 3. 加密配置

- 算法：AES-256-GCM
- 密钥派生：PBKDF2-HMAC-SHA256，迭代 100000
- IV长度：12字节，Tag长度：16字节，Salt长度：16字节
- Batch1状态：配置占位，生产密钥通过环境变量注入，禁止硬编码入库
- 配置文件：`security/aes_config.json`

## 4. 审计（Batch3落地）

- 所有向量读写留痕 → billing_log/ + alert_log/
- Batch1 仅日志目录占位，完整审计系统 Batch3 上线
