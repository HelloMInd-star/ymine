"""market_data_gate — 行情数据接收外壳（Batch1 占位）

Batch2 任务：
1. 原始行情数据接收（websocket/http 拉取）
2. 表层清洗（字段标准化、缺失值处理）
3. 不做任何金融计算/向量化，原始数据直送私有内核
"""
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class MarketDataGate:
    """行情数据接收外壳，仅做接收/清洗，不做计算"""

    def __init__(self):
        self._received_count = 0
        self._last_tick: Dict[str, Any] = {}

    def ingest_raw_tick(self, symbol: str, price: float, volume: float,
                        timestamp: datetime = None) -> Dict[str, Any]:
        """接收原始行情 tick（Batch1 仅计数占位，Batch2 实现真实清洗）"""
        self._received_count += 1
        self._last_tick = {
            "symbol": symbol, "price": price, "volume": volume,
            "timestamp": timestamp or datetime.now(),
        }
        return {
            "status": "received_batch1_stub",
            "symbol": symbol, "count": self._received_count,
            "note": "Batch2 实现清洗并路由至私有内核",
        }

    def ingest_kline(self, symbol: str, interval: str, ohlcv: List[float]) -> Dict[str, Any]:
        """接收 K 线数据（Batch1 占位）"""
        logger.info("[Batch1占位] ingest_kline %s/%s ohlcv=%s", symbol, interval, ohlcv)
        return {"status": "stub_batch1"}

    @property
    def stats(self) -> Dict[str, Any]:
        return {"received_ticks": self._received_count, "last_tick": self._last_tick}
