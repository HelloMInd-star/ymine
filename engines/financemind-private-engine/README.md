# FinanceMind 私有精算引擎（密封层）

本目录存放FinanceMind核心私有精算代码，仅对内暴露必要接口至公开层。
公开层（engines/financemind/）仅做交互与数据展示，核心11层投行估值收敛算法、罗斯公司理财完整精算工具存放于此。

## 核心私有模块（待填充）
- wacc-calculator.js — 加权平均资本成本精算（含MM税盾模型）
- dcf-engine.js — DCF自由现金流折现内核
- capm-cone-pricing.js — CAPM+圆锥稳态定价复合模型
- capital-structure-optimizer.js — 资本结构最优杠杆寻优（锁定0.5中轴线）
- dilution-model.js — 股权/债权融资稀释测算、Pre-IPO定价
- ml-comp-engine.js — 蒙特卡洛多参数扫描引擎（对接金融实证实验室校准参数）
- bankruptcy-risk.js — 破产风险边界仿真（0.48/0.68阈值校验）
- industry-templates/ — 四大行业模板（制造/互联网/非标服务/混合业态）
