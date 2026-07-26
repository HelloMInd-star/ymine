# 🔬 Labs · 全域仿真实验向量总管理台

Game-OS 验证层。所有算法必须先在沙盘完成对照实验才允许上线，覆盖「假设→仿真→验证→上线」完整科研闭环。通过 **[全域仿真实验向量总管理台](../index.html)** 可横向滚动浏览所有39个实验入口。

## 📊 实验入口分布（39个入口 · 8大类别）

| 分类 | 入口数 | 对应向量维度 | 推荐入口 |
|------|--------|------------|---------|
| ⚙️ 控制论与系统稳定 | **11个** | I（海拔）、D（阻尼） | [control_theory_lab.html](control_theory_lab.html) |
| 🏗️ 结构力学与冗余安全 | **6个** | D（阻尼）、Dev-I | [structural-mechanics/exp30-gravity.html](structural-mechanics/exp30-gravity.html) |
| 🧠 认知与神经科学 | **7个** | S（博弈熵）、Dev1 | [evidence/](evidence/) |
| 💭 心理与行为 | **3个** | Dev3（偏差校正） | [evidence/](evidence/) |
| ♟️ 多方博弈演化 | **5个** | P（坡度）、Dev-I | [game_theory_lab.html](game_theory_lab.html) |
| 📈 经济学与市场 | **4个** | Dev3（估值偏差） | [market_equilibrium_lab.html](market_equilibrium_lab.html) |
| 📡 信息与通信信道 | **1个** | Dev2（历史依赖） | [signal_filter_lab.html](signal_filter_lab.html) |
| 🍸 分子调酒（实体物理） | **2个** | S（熵）、D（阻尼） | [molecular-mixology.html](molecular-mixology.html) |

## 📂 目录结构

| 目录 | 内容 |
|------|------|
| [evidence/](evidence/) | 核心实证实验室（金融风险、锥心博弈、CAPM定价、漏斗渗透、跨域映射等） |
| [engineering/](engineering/) | 工程实验（声场修复、能源材料选型、空域信息调度、音场修复） |
| [finance-evidence-lab/](finance-evidence-lab/) | 金融压力测试专项实验室（Streamlit） |
| [marketing/](marketing/) | 营销结构实证实验室（Streamlit） |
| [structural-mechanics/](structural-mechanics/) | 结构力学实验：重力(exp30)、原子(exp31)、分子(exp32) |

## 🚀 推荐入门（按体验顺序）

| 顺序 | 实验室 | 路径 | 体验内容 |
|------|--------|------|---------|
| 1 | 🧪 锥心博弈沙盘 | [evidence/general-game-os.html](evidence/general-game-os.html) | 观看博弈力量如何收敛到 **0.68** 黄金分割共轭点 |
| 2 | 📊 金融风险压力测试 | [evidence/finance-risk-simulator.html](evidence/finance-risk-simulator.html) | Kelly仓位优化 + 0.68熔断 + 黑天鹅压力测试 |
| 3 | ⚖️ CAPM锥心定价模拟器 | [evidence/capm-pricing-simulator.html](evidence/capm-pricing-simulator.html) | WACC+DCF+CAPM锥心定价仿真 |
| 4 | ⚡ 终极模拟沙盘 | [evidence/ultimate-sandbox.html](evidence/ultimate-sandbox.html) | 人性×机器×市场三方博弈综合沙盘 |
| 5 | 📈 七维向量分析平台 | [evidence/vector_analysis.html](evidence/vector_analysis.html) | 箱体海拔+Dev-I多维向量可视化分析 |
| 6 | 🍸 分子调酒实验室 | [molecular-mixology.html](molecular-mixology.html) | 圆锥浓度模型跨域验证（味觉系统实体物理实验） |

## 🔗 实验 → 七维向量映射

所有实验结果统一映射到七维向量体系：
- **I**（海拔）：稳态偏差，对应控制论中的目标偏差
- **P**（坡度）：博弈张力/趋势斜率
- **D**（阻尼）：振荡抑制/系统稳定性
- **S**（熵）：博弈熵/复杂度
- **Dev-I**：山体容积偏差
- **Dev1**：认知回归偏差
- **Dev2**：历史依赖偏差
- **Dev3**（估值/偏差校正）：估值偏差或心理偏差
