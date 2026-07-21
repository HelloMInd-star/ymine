# MoodMind-Lab API 文档 (Batch1)

> 文档版本：V1.0-Batch1
> 约束：公私隔离，所有金融算子为 private_moodmind_engine 闭源实现，工程层仅预留接口。

## 1. 对外 API 出口地址

| 模块 | 接口 | 方法 | Batch1状态 | 推送目标 |
|------|------|------|-----------|---------|
| public_api.vector_sender | push_11d_vector() | POST | 🔴 占位Stub | MSLAB_API_ADDR (http://127.0.0.1:8090) |
| public_api.vector_sender | push_alert() | POST | 🔴 占位Stub | MSLAB_API_ADDR |
| public_api.kmp_score_sender | KMPScoreReceiver.push_to_mslab() | POST | 🔴 占位Stub | MSLAB_API_ADDR |
| public_api.kmp_score_sender | receive_final_score(score) | 本地调用 | ✅ 可用 | 工程内部 |

## 2. 推送至 MS-Lab 字段结构

### 2.1 11维向量推送 payload
```json
{
  "source": "moodmind_lab",
  "vector": [D0, D1, D2, D3, D4_P, D5_I, D6_D, D7, D8, D9, D10],
  "metadata": {
    "symbol": "标的代码",
    "timestamp": "ISO时间",
    "vector_id": "向量UUID"
  }
}
```

### 2.2 KMP 分值推送 payload
```json
{
  "source": "moodmind_lab",
  "score": 0.58,
  "tier": "noise|buffer|normal|knowledge",
  "route_target": "trash_db|buffer_db|normal_db|knowledge_db",
  "score_id": "分值UUID",
  "timestamp": "ISO时间"
}
```

## 3. 私有内核预留对接点位（docking points）

| 对接方法 | 签名 | 用途 |
|---------|------|------|
| VectorEngine.receive_final_vector | (result_dict: Dict) → Dict | 11维向量结果唯一入口 |
| KMPEngine.receive_final_score | (similarity_score: float, metadata?) → Dict | KMP 0~1相似度分值唯一入口 |
| LightingEngine.receive_final_lighting | (result_dict: Dict) → Dict | 四维光照结果唯一入口 |
| SphereRiskEngine.receive_final_risk | (magnitude: float) → Dict | 风险模长结果唯一入口 |
| HighPrecision128Stub | 8个方法全部 NotImplementedError | 128bit高精度接口占位 |
| IPDPIDControllerStub | 3个方法全部 NotImplementedError | PID控制器占位 |
| MarketOperatorStub | 4个方法全部 NotImplementedError | 箱体/筹码/相位/凯利占位 |

## 4. 数据流入流出拓扑（Batch1）

```
[行情数据源] → market_data_gate (占位)
                        ↓
              private_moodmind_engine (闭源·不在仓库)
                        ↓ 结果接收（唯一通道）
  ┌─────────────────────┼─────────────────────┐
  ↓                     ↓                     ↓
receive_final_vector  receive_final_score  receive_final_lighting/risk
  ↓                     ↓                     ↓
  总库四级存储         KMP分值路由            告警/展示
  (trash/buffer/       (noise/buffer/        (dashboard 8510)
   normal/knowledge)    normal/knowledge)           ↓
                                              public_api (Batch2)
                                                    ↓
                                          MS-Lab (http://8090)
```

## 5. 环境变量

见 `config/global.env`：
- `MOODMIND_STATIC_PORT=8100`
- `MOODMIND_DASH_PORT=8510`
- `MSLAB_API_ADDR=http://127.0.0.1:8090`
- `MAX_EXPORT_BATCH=100`
