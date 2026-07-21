# MS-Lab 目录结构说明

> MS-Lab v1.0-Batch3 · 工程目录、模块归属、运行时产物

---

## 1. 顶层目录树

```
ms-lab/
├── index.html                     # 原生 HTML 入口跳转页（深空主题）
├── README.md                      # 项目说明 & 快速启动
├── requirements.txt               # Python 依赖
│
├── mslab_dashboard/               # Streamlit 仪表盘主程序（核心代码目录）
│   ├── __init__.py
│   ├── app.py                     # Streamlit 入口（8 大页面 + Plotly 可视化）
│   ├── mslab_vector.py            # 4D 向量核心：分词/构造/相似度/降级/指纹
│   ├── mslab_math.py              # Batch3：数学硬编码模板（二元一次/比例）
│   ├── mslab_security.py          # Batch3：AES-256-GCM/两级密钥/RBAC/导出限制/审计
│   ├── mslab_compute.py           # Batch3：显存/耗时/冷热估算/上报/指令
│   ├── mslab_utils.py             # 整合工具层：CRUD/计费/告警/缓存/加密集成
│   └── mslab_theme.py             # 深空蓝星空主题 CSS
│
├── mslab_trash_db/                # 🗑️ 无效噪声库（低相似度 <25% 自动进入，可 GC）
│   └── .gitkeep
├── mslab_buffer_db/               # ⏳ 临时缓冲库（相似度 25%~50%）
│   └── .gitkeep
├── mslab_normal_db/               # 📦 常规业务库（相似度 50%~75%）
│   └── *.json                     # 单向量单文件（text 字段为 [SECURE]<hash>）
├── mslab_knowledge_db/            # 🏛️ 高价值知识库（相似度 ≥75%，常驻热缓存）
│   └── *.json
│
├── mslab_meta/                    # 元数据 / 索引
│   ├── lab_config.json            # 全局配置（阈值/容量/价格/权限）
│   ├── vector_index.json          # 四向量库实时索引统计
│   └── op_log.jsonl               # 操作日志（JSONL）
│
├── mslab_billing/                 # Token 计量计费
│   └── token_billing.jsonl        # 实时计费流水（输入/输出分别计价）
│
├── mslab_alert/                   # 告警中心
│   └── alert_log.jsonl            # 四级告警：crit/warn/info/ok
│
├── mslab_security/                # 🔐 安全模块（加密/权限/审计）
│   ├── private_interfaces.json    # 128bit 私有接口占位（红线声明）
│   ├── audit_log.jsonl            # 安全审计日志（谁在何时做了什么）
│   └── text/                      # 原文加密分离存储
│       └── <sha256>.json          # AES-256-GCM 密文块（nonce+ciphertext）
│
├── mslab_compute/                 # 🖥️ 算力底座对接（文件队列 stub）
│   ├── reports.jsonl              # MS-Lab → 算力底座：显存/耗时/冷热/精度
│   └── commands.jsonl             # 算力底座 → MS-Lab：错峰/精度/暂停/配额
│
├── scripts/
│   └── start_dashboard.sh         # 一键启动脚本（检查依赖+起静态服务+起Streamlit）
│
└── docs/                          # 交付文档
    ├── API.md                     # 全接口使用说明书
    ├── DIRECTORY.md               # 本文档：目录结构说明
    └── SECURITY.md                # 安全权限配置手册
```

---

## 2. 各模块归属

### 2.1 核心代码（`mslab_dashboard/`）

| 文件 | Batch | 职责 | 依赖 |
|------|-------|------|------|
| [app.py](file:///workspace/ms-lab/mslab_dashboard/app.py) | 1+2+3 | Streamlit 主入口，9 大页面组装、Plotly 图表绘制 | 所有其他模块 |
| [mslab_vector.py](file:///workspace/ms-lab/mslab_dashboard/mslab_vector.py) | 2 | 向量算法：中文分词、4D 向量构造、余弦相似度、精度降级、向量指纹 | 无外部依赖（标准库） |
| [mslab_math.py](file:///workspace/ms-lab/mslab_dashboard/mslab_math.py) | 3 | 两套硬编码数学模板（二元一次/比例），仅数值代入，无解方程能力 | 无外部依赖 |
| [mslab_security.py](file:///workspace/ms-lab/mslab_dashboard/mslab_security.py) | 2+3 | AES-256-GCM 加解密、两级密钥、RBAC 三级权限、导出限制、审计日志 | `cryptography` |
| [mslab_compute.py](file:///workspace/ms-lab/mslab_dashboard/mslab_compute.py) | 3 | 显存/耗时估算、冷热标签、上报/指令文件队列 | 无外部依赖 |
| [mslab_utils.py](file:///workspace/ms-lab/mslab_dashboard/mslab_utils.py) | 1+2+3 | 工具层：CRUD、JSON 读写、统计、计费、告警、热缓存、集成加密+算力 | 上述所有模块 |
| [mslab_theme.py](file:///workspace/ms-lab/mslab_dashboard/mslab_theme.py) | 1 | 深空蓝星空主题 CSS（`render_theme` / `render_header`） | streamlit |

### 2.2 数据目录（运行时自动生成）

| 目录 | 存储内容 | 单文件格式 |
|------|----------|-----------|
| `mslab_trash_db/` | 被判定为噪声（<25% 相似度）的向量 | 单条 JSON，`[SECURE]<hash>` 引用 |
| `mslab_buffer_db/` | 临时缓冲（25%~50%）向量 | 同上 |
| `mslab_normal_db/` | 常规业务（50%~75%）向量 | 同上 |
| `mslab_knowledge_db/` | 高价值知识（≥75%）向量，启动时加载到热缓存 | 同上 |
| `mslab_meta/` | `lab_config.json`（配置）、`vector_index.json`（索引）、`op_log.jsonl`（操作流水） | JSON / JSONL |
| `mslab_billing/` | Token 计费流水 | JSONL（每条=一次调用） |
| `mslab_alert/` | 告警流水 | JSONL（每条=一次告警事件） |
| `mslab_security/text/` | 原文加密密文，以 text_hash 为文件名 | JSON（alg+nonce+ciphertext+text_hash） |
| `mslab_security/audit_log.jsonl` | 安全审计（权限调用/加解密/导出/指令） | JSONL |
| `mslab_compute/reports.jsonl` | 向算力底座上报的心跳/入库报告 | JSONL |
| `mslab_compute/commands.jsonl` | 算力底座下发的指令 | JSONL（带 applied 标记） |

### 2.3 入口与脚本

| 路径 | 用途 |
|------|------|
| [index.html](file:///workspace/ms-lab/index.html) | 原生 HTML 入口页，提供启动仪表盘按钮、总控返回、目录结构、红线声明 |
| [scripts/start_dashboard.sh](file:///workspace/ms-lab/scripts/start_dashboard.sh) | 一键启动：检查依赖 → 起静态 HTTP 服务(8090) → 起 Streamlit(8501) |
| [requirements.txt](file:///workspace/ms-lab/requirements.txt) | Python 依赖清单 |
| [README.md](file:///workspace/ms-lab/README.md) | 项目说明/快速启动/架构概览 |
| [docs/API.md](file:///workspace/ms-lab/docs/API.md) | 全接口使用说明书 |
| [docs/DIRECTORY.md](file:///workspace/ms-lab/docs/DIRECTORY.md) | 本文档 |
| [docs/SECURITY.md](file:///workspace/ms-lab/docs/SECURITY.md) | 安全权限配置手册 |

---

## 3. 向量文件示例（知识库单条）

```json
{
  "id": "5d2daf4f76014b80",
  "text": "[SECURE]9a2f...sha256...c3e1",
  "text_encrypted": true,
  "vec": [0.21, 0.63, 0.08, 0.08],
  "precision": "fp32",
  "tokens": ["深度", "学习", "模型", ...],
  "fingerprint": "sha1:8c72...",
  "tier": "knowledge",
  "bytes": 512,
  "created_at": "2026-...",
  "updated_at": "2026-...",
  "access_count": 3,
  "last_accessed": "2026-..."
}
```

要点：
- `text` 字段为 `[SECURE]<sha256>` 引用，**明文不嵌入向量内部**
- 原文密文存于 `mslab_security/text/<sha256>.json`
- `load_vector` 加载时自动解密并回填 text 明文（透明）

---

## 4. 加密原文文件示例（`mslab_security/text/<hash>.json`）

```json
{
  "alg": "AES-256-GCM",
  "nonce_b64": "base64-random-nonce-12B",
  "ciphertext_b64": "base64-ciphertext-with-tag",
  "text_hash": "sha256-hex-64chars",
  "aad": "mslab-vec",
  "created_at": "2026-..."
}
```

---

## 5. 算力上报记录示例（`mslab_compute/reports.jsonl`）

```json
{
  "id": "rpt_20260421T040000Z_a1b2c3",
  "ts": "2026-04-21T04:00:00+08:00",
  "op": "embed",
  "num_vectors": 1,
  "dims": 4,
  "precision": "fp32",
  "tokens_in": 32,
  "kmp_blocks": 1,
  "vram": {"total_bytes": 4096, "total_mb": 0.004, "payload_mb": 0.00006},
  "est_compute_time": {"time_sec": 0.0002, "gops": 0.001},
  "label": "cold",
  "paused": false,
  "reported_at": "2026-04-21T04:00:00+08:00"
}
```

## 6. 算力指令示例（`mslab_compute/commands.jsonl`）

```json
{
  "id": "cmd_20260421T040500Z_x9y8",
  "ts": "2026-04-21T04:05:00+08:00",
  "type": "stagger",
  "params": {"delay_sec": 30},
  "reason": "peak hour",
  "source": "geom-compute-base",
  "applied": false
}
```

---

## 7. 扩展指引

- **新增向量库层级**：在 `mslab_utils.py` 的 `DB_PATHS` 中新增路径，并在 `lab_config.json` 的 `storage_tiers` 中补充容量/阈值/告警水位。
- **新增数学模板**：在 `mslab_math.py` 中**只允许**硬编码固定公式（与现有两个模板风格一致），禁止引入通用 solver；新增后在 `list_templates()` 注册。
- **替换算力对接 stub**：将 `mslab_compute.py` 中 `send_report` / `inject_command` 的文件读写替换为 gRPC/HTTP/MQ 调用即可，上层无感知。
- **接入真实 KMS**：将 `mslab_security.py` 中 `get_key(128)` 的 `NotImplementedError` 替换为从 KMS 拉取 128bit 密钥的逻辑，并更新密钥派生流程。
