"""public_api — KMP 分值推送服务（Batch1 外壳占位）

仅预留 receive_final_score(score) 分值接收字段和推送接口骨架。
KMP 底层 LPS 匹配源码严禁在此工程实现。
"""
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class KMPScoreReceiver:
    """KMP 相似度分值接收器（仅接收，不计算）"""

    def __init__(self):
        self._last_score: Optional[float] = None
        self._score_history: list = []

    def receive_final_score(self, score: float) -> dict:
        """接收外部私有内核传入的 0~1 相似度分值（唯一合法入口）"""
        if not isinstance(score, (int, float)):
            raise TypeError(f"score 必须是数字，收到 {type(score)}")
        if not (0.0 <= float(score) <= 1.0):
            raise ValueError(f"KMP 分值必须在 [0,1] 区间，收到 {score}")
        self._last_score = float(score)
        self._score_history.append(float(score))
        logger.info("[KMP接收] 分值=%.4f, 历史共 %d 条", self._last_score, len(self._score_history))
        return {"status": "received", "score": self._last_score, "history_count": len(self._score_history)}

    @property
    def last_score(self) -> Optional[float]:
        return self._last_score

    def push_to_mslab(self, score: float, target_addr: str = "http://127.0.0.1:8090") -> dict:
        """推送 KMP 分值至 MS-Lab（Batch2 实现）"""
        self.receive_final_score(score)
        logger.info("[Batch1占位] push kmp score=%.4f → %s", score, target_addr)
        return {"status": "stub_batch1", "pushed": False, "score": score}


def receive_final_score(score: float) -> dict:
    """模块级便捷函数"""
    return KMPScoreReceiver().receive_final_score(score)
