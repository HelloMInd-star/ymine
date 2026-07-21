"""public_api — 对外推送 MS-Lab 接口层（Batch1 外壳占位）

Batch1 仅提供接口骨架，不发起真实 HTTP 请求。
Batch2 实现 MoodMind→MS-Lab 单向数据通信链路。
"""
from typing import List, Dict, Any, Optional
import os
import json
import logging

logger = logging.getLogger(__name__)

MSLAB_API_ADDR = os.environ.get("MSLAB_API_ADDR", "http://127.0.0.1:8090")
MAX_EXPORT_BATCH = int(os.environ.get("MAX_EXPORT_BATCH", "100"))


def push_11d_vector(vector_11d: List[float], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """推送 11 维向量至 MS-Lab（Batch2 实现，当前仅日志占位）"""
    if len(vector_11d) != 11:
        raise ValueError(f"11维向量长度必须为11，收到 {len(vector_11d)}")
    payload = {"vector": vector_11d, "metadata": metadata or {}, "source": "moodmind_lab"}
    logger.info("[Batch1占位] push_11d_vector → MSLab: %s", json.dumps(payload, ensure_ascii=False)[:200])
    return {"status": "stub_batch1", "pushed": False, "note": "Batch2 实现真实推送", "payload_size": len(str(payload))}


def push_alert(level: str, message: str, module: str = "moodmind") -> Dict[str, Any]:
    """推送告警至 MS-Lab（Batch2 实现）"""
    logger.info("[Batch1占位] push_alert [%s] %s/%s", level, module, message)
    return {"status": "stub_batch1", "pushed": False}
