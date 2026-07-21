# MS-Lab 安全权限配置手册

> MS-Lab v1.0-Batch3 · AES-256-GCM · 两级密钥 · RBAC 三级权限 · 批量导出限制 · 原文分离存储 · 审计日志

---

## 1. 安全体系总览

| 维度 | 方案 | 实现模块 |
|------|------|----------|
| **加密算法** | AES-256-GCM（认证加密，防篡改） | [mslab_security.py](file:///workspace/ms-lab/mslab_dashboard/mslab_security.py) |
| **密钥体系** | 两级：64bit 工程种子 + 128bit 预留位 | `mslab_security.get_key()` |
| **密钥派生** | HKDF-SHA256（64bit 种子 → 256bit AES 密钥） | `mslab_security._derive_key()` |
| **原文存储** | 加密分离：向量文件仅存 `[SECURE]<hash>`，密文单独存放 | `sec/text/<hash>.json` |
| **权限模型** | RBAC 三级：admin / architect / operator | `mslab_security.PERMISSIONS` |
| **导出限制** | 硬编码单次 ≤ 100 条，禁止全库批量导出 | `mslab_security.MAX_EXPORT_BATCH=100` |
| **审计日志** | 全部权限敏感操作写 `sec/audit_log.jsonl` | `mslab_security.audit_log()` |
| **随机数** | nonce 使用 `os.urandom(12)`（密码学安全） | `encrypt_text()` |

---

## 2. 加密配置

### 2.1 默认配置（开箱即用）
开箱后即使用工程内置 64bit 种子（位于 `mslab_security.py` 的 `KEY_SEED_64BIT_HEX` 常量）。
首次启动即可对入库原文自动加密，**无需额外配置**。

### 2.2 两级密钥说明

#### 🔑 64bit 工程密钥（已启用）
- 位置：`mslab_security.py` 顶部常量 `KEY_SEED_64BIT_HEX`
- 长度：16 hex 字符 = 64 bit
- 用途：通过 HKDF-SHA256 派生出 32B（256bit）AES 密钥
- 替换方式（**部署前必须替换为随机值**）：
  ```python
  # 生成新的 64bit 种子（在终端执行）
  python -c "import os; print(os.urandom(8).hex())"
  # 将输出替换 KEY_SEED_64BIT_HEX 的值
  ```
- ⚠️ 替换后**历史加密数据无法解密**，请在首次部署前确定。

#### 🔑 128bit 外部密钥（预留位 · 默认未启用）
- 位置：`mslab_security.py` 顶部常量 `KEY_128BIT_RESERVED = None`
- 设计：等待正式 KMS（密钥管理系统）注入 128bit 密钥
- 调用 `get_key(128)` 将抛 `NotImplementedError`
- 启用方式（待 KMS 就绪后）：
  1. 在 `mslab_security.py` 中实现 KMS 拉取逻辑（替换 `NotImplementedError` 分支）
  2. 在 `_derive_key(128)` 中使用 KMS 返回的 16B 密钥
  3. 调用方无需变更接口

### 2.3 加密流程（入库时自动执行）
```
明文 text
  │
  ├─→ text_hash = sha256(text)
  ├─→ nonce = os.urandom(12)
  ├─→ key = HKDF-SHA256(KEY_SEED_64BIT_HEX, salt=b"mslab-vec", info=b"aes-256-gcm") → 32B
  ├─→ ciphertext = AES-256-GCM(key, nonce, plaintext, aad=b"mslab-vec")
  │
  ├─→ 写入 mslab_security/text/<text_hash>.json：
  │     {alg, nonce_b64, ciphertext_b64, text_hash, aad, created_at}
  │
  └─→ 向量 JSON 内只写：text = "[SECURE]" + text_hash
```

### 2.4 解密流程（加载时自动透明执行）
```
向量 JSON 读入
  │
  └─ text 以 "[SECURE]" 开头？
       ├─ Yes → 取 text_hash → 读取 sec/text/<hash>.json → AES-GCM 解密 → 回填明文
       └─ No  → 旧数据/非加密数据，原样返回
```

### 2.5 AAD（附加认证数据）
所有加密使用 AAD=`b"mslab-vec"`，将密文与业务上下文绑定，防止跨系统重放。

---

## 3. RBAC 三级权限

### 3.1 角色定义

| 角色 | 常量 | 等级 | 典型用户 |
|------|------|------|----------|
| 👑 最高管理员 | `ROLE_ADMIN="admin"` | L3（最高） | 安全/SRE 负责人 |
| 🏛️ 架构审核 | `ROLE_ARCHITECT="architect"` | L2 | 算法/系统架构师 |
| 👤 普通操作员 | `ROLE_OPERATOR="operator"` | L1（最低） | 日常业务运维/标注 |

### 3.2 权限矩阵

| 权限点 | operator | architect | admin | 说明 |
|--------|:--------:|:---------:|:-----:|------|
| `view_dashboard` | ✓ | ✓ | ✓ | 查看仪表盘 |
| `basic_search` | ✓ | ✓ | ✓ | 基础向量检索 |
| `view_billing` | ✓ | ✓ | ✓ | 查看账单 |
| `vector_write` | ✓ | ✓ | ✓ | 写入/删除向量 |
| `math_solve` | ✓ | ✓ | ✓ | 调用数学硬模板 |
| `compute_report` | ✓ | ✓ | ✓ | 上报算力底座 |
| `adjust_threshold` | ✗ | ✓ | ✓ | 调整相似度阈值 |
| `tier_mgmt` | ✗ | ✓ | ✓ | 冷热存储策略/手动迁移 |
| `audit_log` | ✗ | ✓ | ✓ | 查看审计日志 |
| `compute_cmd_inject` | ✗ | ✓ | ✓ | 注入算力指令（错峰/降级等） |
| `export_data` | ✗ | ✓ | ✓ | 导出数据（≤100条/次） |
| `security_manage` | ✗ | ✗ | ✓ | 安全管理、查看加密原文 |
| `config_write` | ✗ | ✗ | ✓ | 修改全局配置（定价/阈值） |
| `batch_export_override` | ✗ | ✗ | ✓ | （保留）绕过导出限制，默认仍拒绝 |

### 3.3 在代码中做权限校验
```python
from mslab_security import has_permission

role = st.session_state.perm_level   # 或从请求上下文取
if not has_permission(role, "security_manage"):
    st.error("❌ 权限不足：需要 admin 角色")
    return
# 正常执行安全管理操作...
```

### 3.4 在 UI 中切换角色（演示用）
侧边栏 → 「🔑 权限角色（演示切换）」下拉框，可即时切换三种角色用于测试。
生产环境应接入 SSO/OAuth，从真实登录态获取角色，禁用演示切换器。

---

## 4. 批量导出限制

### 4.1 硬编码约束
```python
# mslab_security.py
MAX_EXPORT_BATCH = 100
```
- 单次导出请求最大允许条数 = 100
- **禁止**任何形式的全库批量导出
- `batch_export_override` 权限虽然保留给 admin，但默认策略仍为拒绝（审计日志会记录尝试）

### 4.2 校验接口
```python
from mslab_security import check_export_limit

ok, msg = check_export_limit(count)
if not ok:
    # 拒绝导出
    raise PermissionError(msg)
```

### 4.3 调整上限（仅管理员通过代码修改）
1. 修改 `mslab_security.py` 顶部常量 `MAX_EXPORT_BATCH`
2. 重启 Streamlit 服务生效
3. 修改后**必须**在审计日志中记录配置变更

---

## 5. 审计日志

### 5.1 记录位置
`mslab_security/audit_log.jsonl`（JSON Lines，每行一条审计事件）

### 5.2 事件字段
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 事件 ID |
| `ts` | string(ISO8601) | 时间戳（东八区） |
| `role` | string | 操作人角色 |
| `action` | string | 操作类型（如 `security_manage`/`math_solve_binary`/`compute_cmd_inject`/`crypto_self_test`/`export_attempt`/`vector_write`） |
| `detail` | object | 操作详情（不含明文原文，仅哈希/元信息） |
| `ok` | bool | 操作是否成功 |

### 5.3 自动埋点操作
- 数学模板调用（二元一次/比例）
- 加解密自检
- 算力指令注入
- 算力上报
- 向量写入/删除（集成层）
- 授权/越权访问（UI 侧）

### 5.4 自定义埋点
```python
from mslab_security import audit_log
audit_log(role="admin", action="config_write",
          detail={"key":"pricing.input_price_per_1k","old":0.02,"new":0.03})
```

### 5.5 日志查看
- UI：🛡️ 安全审计页 → 「📜 安全审计日志」+ Plotly 角色·操作柱状图
- 文件：直接查看 `mslab_security/audit_log.jsonl`
- 接口：`mslab_security.read_audit_log(base_dir, n=100)`

---

## 6. 原文分离存储与禁止嵌入向量

### 6.1 核心原则
**明文原文永远不会写入向量 JSON 文件**，仅通过 `[SECURE]<sha256>` 引用密文。

### 6.2 验证方式
1. 入库一条带 text 的向量（💾 向量库管理页）
2. 查看对应的向量 JSON，`text` 字段形如 `[SECURE]a1b2c3...`
3. 查看 `mslab_security/text/<hash>.json` 存在且包含 `ciphertext_b64`
4. UI 加载时（load_vector/load_all_vectors）自动解密，明文仅在内存中短暂存在

### 6.3 旧数据兼容
历史数据（未加密）的 `text` 字段不以 `[SECURE]` 开头：
- `load_vector` 会原样返回（透明兼容）
- 建议在数据迁移任务中批量调用 `store_text_secure()` 转为加密存储

---

## 7. 部署前安全 Checklist

- [ ] **替换 64bit 工程密钥**：使用 `python -c "import os;print(os.urandom(8).hex())"` 生成并替换 `KEY_SEED_64BIT_HEX`
- [ ] **关闭角色演示切换器**：在生产模式接入 SSO/OAuth，隐藏侧边栏角色切换
- [ ] **限制 mslab_security/text/ 目录权限**：`chmod 700 mslab_security/text`
- [ ] **限制日志目录权限**：`chmod 700 mslab_compute mslab_billing mslab_alert mslab_meta`
- [ ] **配置日志轮转**：对 `*.jsonl` 配置 logrotate，防止单文件过大
- [ ] **关闭调试模式**：启动时不要使用 `--server.runOnSave true` 等开发参数
- [ ] **绑定 127.0.0.1**：若仅本地访问，启动脚本默认绑定 0.0.0.0；如需公网访问请前置 HTTPS 反向代理
- [ ] **审计日志定期备份**：`mslab_security/audit_log.jsonl` 必须纳入备份
- [ ] **导出上限评估**：根据业务合规要求确认 `MAX_EXPORT_BATCH=100` 是否合适，如需调整走代码变更+审计流程
- [ ] **KMS 对接计划**：评估正式环境对接 KMS 以启用 128bit 二级密钥

---

## 8. 常见安全问题排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 入库后向量 text 显示 `[SECURE]xxx` 未解密 | sec/text 下文件被删除或密钥被替换 | 检查文件是否存在、密钥是否与入库时一致 |
| 加解密自检失败 | KEY_SEED 被改动或密文损坏 | 确认当前 KEY_SEED 与入库时一致，损坏的密文无法恢复 |
| 128bit 密钥调用抛 NotImplementedError | 128bit 为预留位，未接入 KMS | 属正常行为，等待 KMS 对接 |
| 导出按钮灰掉/被拒绝 | 导出条数 > MAX_EXPORT_BATCH 或角色不足 | 降低导出条数或使用 architect/admin 角色 |
| 安全页看不到加密原文内容 | 非 admin 角色 | 切换到 👑 admin 角色 |
| 算力页报错"paused by compute_base" | 收到 pause 指令 | 在算力对接页点"✅ 全部应用并标记"后再发 resume |

---

## 9. 密钥轮换流程（建议）

1. **准备**：在 `mslab_security.py` 增加 `KEY_SEED_64BIT_HEX_V2` 常量并实现版本标识写入
2. **双读**：`decrypt_text` 根据记录中的 `key_version` 选择对应密钥解密
3. **批量重加密**：离线任务遍历所有密文，用旧密钥解密、新密钥加密，写回新文件
4. **切换默认**：将 `get_key(256)` 默认指向新密钥
5. **审计**：全程记录到 audit_log（含轮换前后密钥指纹，不含密钥本身）
6. **归档**：旧密钥保留在只读配置中足够时间（如 90 天）后销毁

> 当前版本为快速交付版本，未内置自动轮换流程；上述流程为运维参考方案。
