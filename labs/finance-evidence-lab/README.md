# 金融稳态实证实验室 · Finance Evidence Lab

> **⚠️ 科研实验模块 · 学术用途声明**
>
> 本目录下全部内容为 Game-OS 圆锥稳态金融数理仿真实验载体，**仅用于复杂系统稳态数理实证研究、学术推演、对照组对照验证**。
>
> - ❌ 不构成任何投资建议、财务建议、经营决策建议
> - ❌ 输出数据不直接接入集团经营决策链路，仅作为校准参数供给 FinanceMind 商用操作台
> - ❌ 禁止将本实验台仿真结果用于实际证券交易、杠杆决策、IPO定价实操
> - ✅ 完整保留学术对照组设计、参数扫描、蒙特卡洛仿真等科研原色
> - ✅ 复用 #30 双层阻尼力学实验同构逻辑，股债双层资本成本采用力学阻尼映射模型
> - ✅ 全部实验遵循 0.48保本 / 0.50稳态 / 0.68熔断 三阈值刚性约束

## 实验资产清单

| 实验编号 | 实验名称 | 文件 | 状态 |
|---------|---------|------|------|
| F-EXP01 | 多组资本结构对照仿真（税盾×负债率收敛） | capital-structure-lab.html | 🔴 待开发 |
| F-EXP02 | 四大行业财务稳态对照（制造/互联网/非标/混合） | industry-template-lab.html | 🔴 待开发 |
| F-EXP03 | 圆锥财务风险浓度对照实验（圈层扩缩力学） | cone-finance-lab.html | 🔴 待开发 |
| F-EXP04 | DCF折现率多参数蒙特卡洛扫描实证 | dcf-montecarlo-lab.html | 🔴 待开发 |
| F-EXP05 | 破产风险边界仿真（0.48/0.68阈值验证） | bankruptcy-boundary-lab.html | 🔴 待开发 |

## YBus约束
- 实验产出仅发布至 `assetQuant`（行业风险溢价校准系数）和 `riskThreshold`（实验风险阈值校准）两个标准通道
- 不订阅任何经营性实时数据源，仅可订阅公共阈值常量与历史稳态数据
- 严格三分区隔离：实验原始数据写入 `pipeline_exp_finance_*`，中间草稿写入 `draft_exp_finance_*`，审计日志写入 `audit_log_exp_finance_*`

## 公共内核复用要求
- 必须复用 `circle-boundary.js` 的 `computeConeConcentration()` 做财务圆锥浓度计算
- 必须复用 `#30 exp30-gravity.html` 的双层阻尼模型映射股权风险C₁+债权刚性C₂
- 必须使用全局 `THRESHOLDS` 常量，禁止本地重定义阈值
- 必须调用 `TriangleAudit.validate()` 校验实验结果合理性后方可publish
