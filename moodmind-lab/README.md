# MoodMind-Lab · 金融向量实验室

> Game-OS V3.0 集群同级核心实验室 · 与 MS-Lab 通用心智向量实验室完全平级
> 统一挂载于「几何心智空间全域算力底座 & Y.Mine 总控台」

---

## 0. 整体定位

| 实验室 | 定位 | 核心能力 |
|--------|------|----------|
| **MS-Lab** | 通用心智向量实验室（公共底座） | 通用存储、通用监控、通用冷热分层、通用算力上报（无行业内核） |
| **MoodMind-Lab** | 金融向量实验室（专业金融内核） | 金融专属向量生成、11维时序建模、IPD自控系统、四维光照环境模型、改良KMP周期匹配、球面风控内核 |

### 核心原则：公私彻底隔离

- 所有金融底层数理公式、权重、周期逻辑、估值内核 **仅存在 MoodMind 私有引擎**
- MS-Lab **只接收最终向量、最终分值、最终状态**，永远不碰金融计算逻辑
- 总控台 **只做聚合展示、状态巡检、算力调度**，不介入业务内核

---

## 1. 官方正式定名（最终不可修改）

| 定名项 | 正式名称 |
|--------|----------|
| 实验室全称 | **MoodMind-Lab・金融向量实验室** |
| 内部存储定名 | **MoodMind 金融向量总库** |
| 私有内核定名 | **private_moodmind_engine**（金融私有闭源内核） |
| 对外服务层定名 | **moodmind_public_api**（可公开对接层，无核心逻辑） |

---

## 2. 目录结构

```
moodmind_lab/
├── public_dashboard/          # 公开仪表盘、总控页面（Streamlit）
│   ├── app.py                 # 主Dashboard入口（9页可视化）
│   ├── moodmind_types.py      # 核心数据类型定义
│   ├── moodmind_config.py     # 实验室配置
│   ├── moodmind_engine_stub.py # 公开stub层（仅输出结果，不含金融逻辑）
│   ├── moodmind_push.py       # MS-Lab推送服务
│   ├── moodmind_billing.py    # 独立Token计费
│   ├── moodmind_compute.py    # 算力上报模块
│   ├── moodmind_audit.py      # 审计日志
│   ├── moodmind_alert.py      # 独立告警中心
│   └── __init__.py
├── public_api/                # 对外推送接口（给MS-Lab、总控台）
├── market_data_source/        # 行情原始数据接入层
├── vector_export_layer/       # 11维向量输出层（仅结果）
├── kmp_score_service/         # KMP分值推送服务（仅输出分值）
├── moodmind_storage_main/     # 金融向量总库持久化目录
├── billing_log/               # 独立计费日志
├── alert_log/                 # 金融独立告警
├── audit_security/            # 独立权限、审计、加密适配
├── private_moodmind_engine/   # 【绝对私有】私有内核（不入工程交付）
│   └── README.md              # 私有内核红线说明
├── config/
│   └── lab_config.json        # 实验室配置文件
├── scripts/
│   └── start.sh               # 一键启动脚本
├── index.html                 # MoodMind独立首页（深空主题）
└── requirements.txt           # Python依赖
```

---

## 3. MoodMind 11维金融向量体系

### 公共4维（与MS-Lab通用）

| 维度 | 名称 | 说明 |
|------|------|------|
| D0 | 主体 | 标的/主体标识 |
| D1 | 动作 | 市场行为类型 |
| D2 | 属性 | 标的基本属性 |
| D3 | 外部扰动 | 外部事件因子 |

### 金融私有7维（MoodMind独有、闭源）

| 维度 | 名称 | 访问权限 |
|------|------|----------|
| D4-P | 现价偏离中枢比例 | admin/quant |
| D5-I | 基本面积分稳态值 | admin/quant |
| D6-D | 涨跌速率微分 | admin/quant |
| D7 | 筹码箱体区间向量 | admin only |
| D8 | 行情周期相位 | admin only |
| D9 | 凯利安全仓位系数 | admin only |
| D10 | 球面风险模长（全局风控值） | 公开展示结果，公式私有 |

### 四维光照环境向量（结果对外展示，权重私有）

| 维度 | 名称 |
|------|------|
| L1 | 成交量流动性光照 |
| L2 | 题材情绪光照 |
| L3 | 产业政策光照 |
| L4 | 产业链景气光照 |

---

## 4. 与MS-Lab标准交互规范（强制固定）

1. MoodMind-Lab 自主生成完整11维向量
2. MoodMind-Lab 内部运行改良KMP，算出周期匹配相似度分值
3. MoodMind-Lab 仅推送两类数据到MS-Lab：
   - 最终11维向量本体
   - 0~1相似度匹配分值
4. MS-Lab 根据分值自动执行：

| 分值区间 | MS-Lab处理策略 |
|----------|----------------|
| <25% | 噪声库丢弃 |
| 25%~50% | 缓冲库复检 |
| 50%~75% | 常规库存放 |
| ≥75% | 知识库长效沉淀（KMP长期记忆） |

> MS-Lab全程无金融逻辑、无权重计算、无内核泄露

---

## 5. 球面风控阈值体系

| 阈值 | 状态 | 颜色 |
|------|------|------|
| <0.48 | 保本安全区 | 🟢 绿色 |
| 0.48~0.50 | 预警观察区 | 🟡 黄色 |
| 0.50~0.68 | 稳态运行区 | 🟢 绿色 |
| ≥0.68 | 熔断警戒线 | 🔴 红色 |

---

## 6. RBAC四级权限体系

| 角色 | 权限范围 |
|------|----------|
| admin | 全部权限，可查看私有维度、配置内核参数、审计日志 |
| quant | 可查看D4-D6、运行分析、推送向量，不可查看D7-D10内核参数 |
| operator | 可查看公开维度、监控状态、处理告警 |
| viewer | 只读访问公开仪表盘和统计数据 |

---

## 7. 快速开始

### 7.1 环境要求

- Python 3.8+
- pip

### 7.2 安装依赖

```bash
cd moodmind-lab
pip install -r requirements.txt
```

### 7.3 一键启动

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

启动后访问：
- 金融数据大盘（Streamlit）：http://localhost:8502
- MoodMind独立首页：http://localhost:8091

### 7.4 手动启动

```bash
# 启动Streamlit仪表盘
cd public_dashboard
streamlit run app.py --server.port 8502 --server.address 0.0.0.0

# 启动静态首页（新终端）
python -m http.server 8091
```

---

## 8. 总控台监控板块（Y.Mine已集成）

Y.Mine数理操作系统总控台已新增【🧠 MoodMind 金融向量实验室】一级入口，包含：

1. ✅ 金融向量总库实时容量/水位/冷热占比
2. ✅ 11维向量日产量、时序增量
3. ✅ 四维光照环境实时权重展示（仅结果）
4. ✅ KMP周期匹配热度、高同源范式沉淀数量
5. ✅ 球面风险模长实时阈值、稳态/预警/熔断状态
6. ✅ 金融算力占用、错峰调度状态
7. ✅ 金融模块独立告警中心

---

## 9. 开发红线（绝对禁止）

以下内容 **不写代码、不实现、不公开、不入工程层**：

1. ❌ 11维向量底层计算公式
2. ❌ I/P/D三维PID自控迭代逻辑
3. ❌ 四维光照动态行业权重算法
4. ❌ 超球面风险模长求解公式
5. ❌ 0.48/0.50/0.68三阈值底层判定逻辑
6. ❌ 改良KMP周期匹配LPS底层源码
7. ❌ 行情相位、箱体中枢、筹码结构私有算子
8. ❌ 凯利仓位安全系数内核

> 工程层仅 **接收最终结果、最终分值、最终状态**，所有私有内核逻辑在 `private_moodmind_engine/` 中，不纳入代码仓库交付。

---

## 10. 技术栈

- **前端可视化**：Streamlit + Plotly
- **数据处理**：NumPy, Pandas
- **加密存储**：cryptography (AES-256-GCM)
- **静态首页**：原生HTML/CSS/JS（深空主题）
- **日志格式**：JSONL

---

## 11. 文件清单说明

| 模块文件 | 功能说明 |
|----------|----------|
| [public_dashboard/app.py](file:///workspace/moodmind-lab/public_dashboard/app.py) | Streamlit主Dashboard（9页） |
| [public_dashboard/moodmind_types.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_types.py) | 核心数据结构定义 |
| [public_dashboard/moodmind_engine_stub.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_engine_stub.py) | 公开stub层（模拟私有引擎输出） |
| [public_dashboard/moodmind_push.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_push.py) | MS-Lab向量推送服务 |
| [public_dashboard/moodmind_billing.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_billing.py) | Token独立计费 |
| [public_dashboard/moodmind_alert.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_alert.py) | 独立告警中心 |
| [public_dashboard/moodmind_audit.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_audit.py) | 审计日志 |
| [public_dashboard/moodmind_compute.py](file:///workspace/moodmind-lab/public_dashboard/moodmind_compute.py) | 算力上报 |
| [index.html](file:///workspace/moodmind-lab/index.html) | MoodMind独立首页 |
| [scripts/start.sh](file:///workspace/moodmind-lab/scripts/start.sh) | 一键启动脚本 |

---

## 12. 版本信息

- **版本**：V1.0 正式立项版
- **状态**：工程框架交付完成
- **私有内核**：待接入（private_moodmind_engine/）
