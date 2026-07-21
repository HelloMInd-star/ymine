# MS-Lab 全接口使用说明书

> MS-Lab v1.0-Batch3 · 覆盖向量、数学、安全、算力、计费五大接口域  
> 所有 Python 接口均位于 `mslab_dashboard/` 目录下的模块中。

---

## 0. 快速索引

| 模块 | 文件 | 主要能力 |
|------|------|----------|
| 向量核心 | [mslab_vector.py](file:///workspace/ms-lab/mslab_dashboard/mslab_vector.py) | 分词、4D 向量构造、余弦相似度、冷热分流、精度降级、指纹 |
| 数学模板 | [mslab_math.py](file:///workspace/ms-lab/mslab_dashboard/mslab_math.py) | 二元一次方程组、比例（仅硬编码代入） |
| 安全加密 | [mslab_security.py](file:///workspace/ms-lab/mslab_dashboard/mslab_security.py) | AES-256-GCM、两级密钥、RBAC、导出限制、审计 |
| 算力对接 | [mslab_compute.py](file:///workspace/ms-lab/mslab_dashboard/mslab_compute.py) | 显存/耗时估算、冷热标签、上报、指令接收与应用 |
| 工具层 | [mslab_utils.py](file:///workspace/ms-lab/mslab_dashboard/mslab_utils.py) | 向量 CRUD（自动加密+算力上报）、计费、告警、缓存、日志 |

---

## 1. 向量接口（mslab_vector）

### 1.1 分词与 4D 向量构造
```python
from mslab_vector import tokenize, build_4d_vector

tokens = tokenize("深度学习模型通过大规模知识训练")
# → list[str]，中英文混合分词 + 词性标注

vec = build_4d_vector(tokens)
# → VectorRecord(vec=(n,v,adj,adv), precision="fp32", fingerprint="sha1:...")
```

### 1.2 余弦相似度与四档分流
```python
from mslab_vector import cosine_similarity, classify_tier_by_similarity

sim = cosine_similarity(vec_a, vec_b)           # → float [-1, 1]
tier = classify_tier_by_similarity(sim, "normal")
# → "trash" | "buffer" | "normal" | "knowledge"
# 阈值：<0.25→trash / 0.25~0.50→buffer / 0.50~0.75→normal / ≥0.75→knowledge
```

### 1.3 精度降级
```python
from mslab_vector import downgrade_precision, calc_vector_bytes

downgraded_vec = downgrade_precision(vec_fp64, target="fp32")
bytes_used = calc_vector_bytes(vec, precision="fp32")   # → 4 * dims + meta
```

### 1.4 向量指纹（去重用）
```python
from mslab_vector import vector_fingerprint
fp = vector_fingerprint(text)  # → sha1 hex 字符串
```

---

## 2. 数学模板接口（mslab_math）

> ⚠️ **红线约束**：仅提供 2 套硬编码模板，**禁止**扩展通用方程求解。所有函数均为纯数值代入。

### 2.1 二元一次方程组
```python
from mslab_math import solve_binary_linear

# 方程组：
#   a1·x + b1·y = c1
#   a2·x + b2·y = c2
result = solve_binary_linear(a1=2, b1=3, c1=13, a2=1, b2=-1, c2=-1)
# → MathResult(success=True, outputs={"x": 2.0, "y": 3.0}, meta={"D":..., "Dx":..., "Dy":...})
```
- 方法：克莱姆法则（Cramer's Rule），硬编码 D/Dx/Dy 行列式
- 当 |D| < 1e-12（系数矩阵奇异）返回 `success=False, error="Determinant is zero"`

### 2.2 比例运算
```python
from mslab_math import solve_ratio

# a : b = c : x  →  x = b·c / a
result = solve_ratio(a=2, b=6, c=4)
# → MathResult(success=True, outputs={"x": 12.0})
```
- 当 |a| < 1e-12（外项为 0）返回 `success=False, error="Proportion outer term a=0"`

### 2.3 模板元信息
```python
from mslab_math import list_templates
for tpl in list_templates():
    print(tpl["tid"], tpl["name"], tpl["formula"])
```

---

## 3. 安全接口（mslab_security）

### 3.1 AES-256-GCM 加解密
```python
from mslab_security import encrypt_text, decrypt_text, text_hash

enc = encrypt_text("机密原文")
# → {"alg":"AES-256-GCM","nonce_b64":<b64>,"ciphertext_b64":<b64>,"text_hash":<sha256>}

pt = decrypt_text(enc)    # → "机密原文"
h  = text_hash("机密原文") # → sha256 hex
```
- 每次加密使用 `os.urandom(12)` 随机 nonce，附带 AAD=`b"mslab-vec"`
- 密钥通过 HKDF-SHA256 从 64bit 工程种子派生为 256bit AES 密钥

### 3.2 两级密钥
```python
from mslab_security import get_key, KEY_SEED_64BIT_HEX, KEY_128BIT_RESERVED

key256 = get_key(256)    # → bytes（32B），正常返回
key128 = get_key(128)    # → 抛 NotImplementedError（预留位，等待 KMS 注入）
```
- **64bit 密钥**：`KEY_SEED_64BIT_HEX`（16 hex chars/64 bit），已写入工程常量 `mslab_security.py`
- **128bit 密钥**：`KEY_128BIT_RESERVED=None`，仅预留参数位

### 3.3 RBAC 三级权限
```python
from mslab_security import has_permission, ROLE_ADMIN, ROLE_ARCHITECT, ROLE_OPERATOR, PERMISSIONS

has_permission("admin",      "security_manage")  # → True
has_permission("operator",   "security_manage")  # → False
has_permission("architect",  "tier_mgmt")        # → True
```

权限矩阵（`PERMISSIONS` dict，值为该权限所需最低角色）：

| 权限点 | 最低角色 | 说明 |
|--------|----------|------|
| `view_dashboard` | operator | 查看仪表盘 |
| `basic_search` | operator | 基础检索 |
| `view_billing` | operator | 查看账单 |
| `vector_write` | operator | 写入向量 |
| `math_solve` | operator | 调用数学模板 |
| `compute_report` | operator | 算力上报 |
| `adjust_threshold` | architect | 调整相似度阈值 |
| `tier_mgmt` | architect | 冷热存储策略 |
| `audit_log` | architect | 查看审计日志 |
| `compute_cmd_inject` | architect | 注入算力指令 |
| `export_data` | architect | 导出数据（≤100） |
| `security_manage` | admin | 安全管理/查看加密原文 |
| `config_write` | admin | 写全局配置 |
| `batch_export_override` | admin | （保留）绕过导出上限，但默认拒绝 |

### 3.4 批量导出限制
```python
from mslab_security import check_export_limit, MAX_EXPORT_BATCH
ok, msg = check_export_limit(50)    # → (True, "ok")
ok, msg = check_export_limit(9999)  # → (False, "Batch export limit exceeded: max 100")
print(MAX_EXPORT_BATCH)             # → 100
```

### 3.5 审计日志
```python
from mslab_security import audit_log, read_audit_log
audit_log("admin", "security_manage", {"target":"vec_001"})
entries = read_audit_log(base_dir, n=100)
```

---

## 4. 算力对接接口（mslab_compute）

### 4.1 显存估算
```python
from mslab_compute import estimate_vram
r = estimate_vram(num_vectors=1000, dims=4, precision="fp32")
# → {"total_bytes":..., "total_mb":..., "payload_bytes":..., "payload_mb":...,
#    "meta_overhead":..., "reserved":..., "dims":4, "precision":"fp32"}
```

### 4.2 耗时估算
```python
from mslab_compute import estimate_compute_time
t = estimate_compute_time(tokens_in=512, kmp_blocks=8, precision="fp32")
# → {"time_sec":..., "gops":..., "tokens_in":512, "blocks":8}
```

### 4.3 冷热标签
```python
from mslab_compute import hot_cold_label
lab = hot_cold_label(last_access_seconds_ago=3600, access_count=1000)
# → {"label":"hot"|"warm"|"cold", "score":float}
```
- `hot`：24h 内访问，且访问量 ≥100
- `warm`：7d 内访问或访问量 ≥10
- `cold`：其它情况

### 4.4 上报算力底座（文件队列 stub）
```python
from mslab_compute import build_report, send_report, read_reports
rpt = build_report(op="embed", num_vectors=1, dims=4, precision="fp32",
                   tokens_in=32, kmp_blocks=1, label="cold", paused=False)
resp = send_report(base_dir, rpt)
# → {"ok": True, "report_id": "rpt_xxx"}
history = read_reports(base_dir, n=20)
```

### 4.5 接收算力底座指令
```python
from mslab_compute import inject_command, fetch_commands, apply_command, default_compute_state

inject_command(base_dir, "stagger", {"delay_sec":30}, reason="peak hour")
inject_command(base_dir, "downgrade_fp32_to_fp16", {}, reason="gpu-saver")
inject_command(base_dir, "pause", {}, reason="maintenance")
inject_command(base_dir, "resume", {}, reason="")
inject_command(base_dir, "set_quota", {"qps":50}, reason="budget cap")

state = default_compute_state()
for cmd in fetch_commands(base_dir):
    apply_command(cmd, state)   # 修改 state 并返回修改后的 dict
```

支持的指令类型：
- `stagger`：延迟执行，params=`{"delay_sec": int}`
- `downgrade_fp32_to_fp16`：精度降级为 fp16
- `pause` / `resume`：暂停/恢复
- `set_quota`：配额限制，params=`{"qps": int}`

上报/指令队列落地为 JSONL：
- `<base>/mslab_compute/reports.jsonl`（MS-Lab → 算力底座）
- `<base>/mslab_compute/commands.jsonl`（算力底座 → MS-Lab）

> 生产环境可将 send_report / inject_command 替换为 gRPC/HTTP/MQ 调用，接口语义不变。

---

## 5. 向量 CRUD + 自动集成（mslab_utils）

### 5.1 一键入库（自动加密 + 算力指令应用 + 算力上报）
```python
from mslab_utils import auto_route_and_store
rec = auto_route_and_store("待入库文本", storage_mode="auto", precision="fp32",
                           base_dir=BASE_DIR, role="admin")
# → {"ok":True, "id":..., "tier":"knowledge", "vec":..., "sim":0.83,
#    "dedup":False, "downgraded":False, "bytes":..., "compute_report":{...}}
```
`auto_route_and_store` 一次完成：
1. 指纹去重（重复则返回 `dedup=True`）
2. 4D 向量化
3. 余弦相似度分流（auto 模式）
4. FP64 水位 >90% 自动降级 FP32
5. **检查算力指令**：若 pause 则拒绝；stagger 则 sleep；应用精度/配额
6. **原文 AES-256-GCM 加密**并分离存储到 `mslab_security/text/<hash>.json`
7. 向量文件仅存 `[SECURE]<text_hash>` 引用（原文不嵌入向量内部）
8. **上报算力底座**：显存/耗时/冷热标签
9. 写审计日志、操作日志、Token 计费
10. 更新冷热缓存

### 5.2 基础 CRUD
```python
from mslab_utils import save_vector, load_vector, delete_vector, list_vectors, load_all_vectors

save_vector(tier, vec_record)     # 写入单条（自动加密原文）
v = load_vector(tier, vec_id)     # 读取单条（自动解密原文，透明返回）
delete_vector(tier, vec_id)       # 删除（同时删除加密原文文件）
ids = list_vectors(tier)          # 列出所有 ID
vectors = load_all_vectors(tier)  # 列出最近 N 条（默认自动解密）
```

### 5.3 Token 计费
```python
from mslab_utils import calc_billing, log_billing_v2, load_pricing_config, save_pricing_config
b = calc_billing(tokens_in=256, tokens_out=128,
                 cfg={"input_price_per_1k":0.02, "output_price_per_1k":0.06})
# → {"input_cost":..., "output_cost":..., "total":...}
rec = log_billing_v2(256, 128, op="query")
```

### 5.4 告警与操作日志
```python
from mslab_utils import log_alert, read_alerts, log_op, read_op_log
log_alert("warn", "watermark", "mslab_buffer_db 水位 86%", "monitor")
alerts = read_alerts(include_acked=False, n=50)
log_op("admin", "delete_vector", {"tier":"trash","id":"xxx"})
```

### 5.5 冷热缓存
```python
from mslab_utils import build_hot_cache, hot_cache_search, cache_status
build_hot_cache()                              # 启动时构建热缓存（知识库常驻）
results = hot_cache_search(query_vec, topk=10) # 先查 Hot→Warm→落盘
status = cache_status()                        # {"hot_count","warm_count","hot_hits","warm_hits","misses"}
```

---

## 6. HTTP 端点（Streamlit 运行时）

Streamlit 本身使用 WebSocket 通信，不提供 REST 路由。所有接口请通过 Python 模块调用。  
如需对外暴露 HTTP 接口，建议在上层用 FastAPI 包装上述函数。

Streamlit 仪表盘默认：
- Web UI：http://localhost:8501
- 静态入口页（index.html + 总控跳转）：http://localhost:8090/ms-lab/index.html

---

## 7. 返回码与错误约定

| 场景 | 返回/异常 | 说明 |
|------|-----------|------|
| 数学模板奇异解 | `MathResult(success=False, error=...)` | 不抛异常，通过 success 判断 |
| 128bit 密钥调用 | `NotImplementedError` | 红线预留位 |
| 暂停态入库 | 返回 `{"ok":False,"reason":"paused by compute_base"}` | 不抛异常 |
| 批量导出超限 | `check_export_limit` 返回 `(False, msg)` | 上层据此拒绝 |
| 权限不足 | `has_permission(...)` 返回 False | 上层据此拦截 |
| 加密原文缺失 | `load_vector` 返回 vec 中 text 保留 `[SECURE]<hash>` | 不抛异常但原文不可还原 |
