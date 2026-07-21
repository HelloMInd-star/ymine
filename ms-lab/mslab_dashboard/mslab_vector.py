"""
MS-Lab 四维向量引擎 (Batch1已实现/Batch2可拓展)
=====================================
Batch1 已实现/已交付：
  1. 词性拆分(FMM分词)/四维向量生成(L1归一化)
  2. 位宽测算/二进制统计/KMP分块
  3. 余弦相似度计算
  4. 四档自动分流路由：<0.25丢弃 / 0.25-0.5缓冲 / 0.5-0.75常规 / ≥0.75知识
  5. Token计数：1~2汉字=1Token，英文单词≈1Token
  6. 向量去重指纹哈希
  7. FP64→FP32精度降级接口
Batch2 可拓展：多参考向量路由、批量相似度加速、自定义权重配置
严格红线：不实现KMP底层匹配算法、不实现128bit运算、不实现通用求解库
"""
import struct
import math
import copy
import uuid
import hashlib
import re
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path


POS_DIM_LABELS = ["noun", "verb", "adj", "adv"]
POS_DIM_NAMES  = ["名词", "动词", "形容词", "副词"]

PRECISION_BYTES = {
    "fp32":  4,
    "fp64":  8,
    "fp128": 16,
}


# ============================================================
# 中文词性词典（公开表层工程用，覆盖常用词汇；非NLP内核）
# ============================================================
NOUN_WORDS = {
    "人", "人们", "人民", "男人", "女人", "孩子", "学生", "老师", "医生", "护士",
    "工人", "农民", "警察", "军人", "科学家", "艺术家", "作家", "演员", "歌手",
    "公司", "企业", "工厂", "学校", "医院", "银行", "商店", "市场", "超市",
    "手机", "电脑", "汽车", "飞机", "火车", "轮船", "房子", "大楼", "道路", "桥梁",
    "水", "火", "土", "木", "金", "空气", "阳光", "月亮", "星星", "地球",
    "书", "笔", "纸", "桌子", "椅子", "床", "门", "窗", "墙",
    "时间", "空间", "世界", "国家", "城市", "乡村", "家庭", "社会", "历史", "文化",
    "经济", "政治", "科技", "艺术", "音乐", "电影", "游戏", "体育", "教育",
    "数据", "信息", "系统", "模型", "算法", "网络", "软件", "硬件", "程序",
    "向量", "矩阵", "维度", "精度", "比特", "字节", "存储", "记忆", "知识",
    "心智", "思维", "认知", "情感", "意识", "精神", "灵魂", "智慧", "能力",
    "问题", "答案", "方法", "方案", "策略", "计划", "目标", "结果", "效果",
    "风险", "收益", "成本", "价格", "价值", "利润", "市场", "竞争", "合作",
    "实验", "研究", "分析", "测试", "报告", "论文", "专利", "技术",
    "向量库", "仪表盘", "控制台", "实验室", "知识库", "噪声库", "缓冲库",
    "token", "embedding", "lab", "model", "data", "system", "vector",
    "我", "你", "他", "她", "它", "我们", "你们", "他们", "自己", "大家",
    "朋友", "敌人", "同事", "同学", "领导", "老板", "客户", "用户",
    "钱", "资金", "资产", "资本", "股票", "债券", "基金", "期货", "期权",
    "天", "地", "山", "河", "海", "湖", "树", "花", "草", "鸟", "鱼", "虫",
    "风", "雨", "雪", "云", "雾", "雷", "电",
    "今天", "明天", "昨天", "现在", "过去", "未来", "年", "月", "日", "小时", "分钟",
    "爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "爷爷", "奶奶",
    "眼睛", "耳朵", "鼻子", "嘴巴", "手", "脚", "头", "心", "大脑",
    "颜色", "声音", "味道", "感觉", "记忆", "梦想", "理想", "现实",
    "价格", "数量", "质量", "速度", "力量", "能量", "温度", "压力",
}

VERB_WORDS = {
    "是", "有", "在", "看", "听", "说", "读", "写", "做", "走", "跑", "跳",
    "吃", "喝", "睡", "玩", "学", "教", "想", "思考", "知道", "理解", "感觉",
    "爱", "恨", "喜欢", "讨厌", "希望", "害怕", "相信", "怀疑",
    "来", "去", "回", "到", "进", "出", "上", "下", "开", "关", "起", "落",
    "买", "卖", "给", "拿", "放", "推", "拉", "打", "杀", "救", "帮", "保护",
    "建", "造", "生产", "制造", "加工", "运输", "销售", "购买",
    "工作", "学习", "研究", "分析", "设计", "开发", "测试", "运行", "启动",
    "创建", "更新", "删除", "查询", "检索", "存储", "读取", "写入", "加载",
    "计算", "运算", "处理", "转换", "映射", "编码", "解码", "加密", "解密",
    "增长", "下降", "上升", "变化", "发展", "进步", "退步", "改善", "恶化",
    "开始", "结束", "继续", "停止", "暂停", "恢复", "完成", "失败", "成功",
    "连接", "断开", "发送", "接收", "上传", "下载", "同步", "异步",
    "选择", "决定", "判断", "评估", "比较", "对比", "测量", "监控",
    "生成", "构建", "部署", "发布", "上线", "下线", "维护", "修复",
    "投资", "理财", "交易", "买入", "卖出", "持有", "抛售", "涨", "跌",
    "成为", "变成", "属于", "包含", "代表", "表示", "意味着", "显示",
    "使", "让", "把", "被", "给", "向", "对", "为",
    "可以", "能", "会", "要", "应该", "必须", "需要",
    "嵌入", "量化", "归一化", "收敛", "发散", "优化", "迭代", "训练",
    "调度", "上报", "下发", "告警", "熔断", "降级", "恢复",
    "be", "have", "do", "go", "come", "see", "know", "think", "get", "make",
    "create", "update", "delete", "query", "search", "store", "read", "write",
    "run", "start", "stop", "send", "receive", "connect", "build", "deploy",
    "embed", "quantize", "normalize", "converge", "optimize", "train",
}

ADJ_WORDS = {
    "大", "小", "多", "少", "高", "低", "长", "短", "宽", "窄", "深", "浅",
    "快", "慢", "强", "弱", "好", "坏", "新", "旧", "老", "年轻",
    "美", "丑", "漂亮", "好看", "难看", "帅", "酷",
    "红", "黄", "蓝", "绿", "白", "黑", "紫", "灰", "粉", "橙", "青",
    "冷", "热", "暖", "凉", "温", "烫", "冰",
    "甜", "苦", "酸", "辣", "咸", "香", "臭",
    "聪明", "愚蠢", "勇敢", "胆小", "善良", "邪恶", "诚实", "虚伪",
    "重要", "关键", "核心", "主要", "次要", "普通", "特殊", "一般",
    "简单", "复杂", "容易", "困难", "轻松", "艰难",
    "真实", "虚假", "正确", "错误", "准确", "精确", "模糊", "清晰",
    "安全", "危险", "稳定", "不稳定", "可靠", "不可靠",
    "有效", "无效", "成功", "失败", "正常", "异常",
    "深", "浅", "厚", "薄", "重", "轻",
    "完整", "残缺", "全面", "片面", "系统", "零散",
    "优秀", "良好", "一般", "较差", "糟糕",
    "红色", "蓝色", "绿色", "黄色", "黑色", "白色",
    "高速", "低速", "高频", "低频", "实时", "延迟",
    "高维", "低维", "稀疏", "稠密", "离散", "连续",
    "线性", "非线性", "对称", "非对称", "均匀", "不均匀",
    "公开", "私有", "加密", "明文", "安全", "危险",
    "hot", "cold", "new", "old", "big", "small", "fast", "slow",
    "good", "bad", "high", "low", "red", "blue", "green",
}

ADV_WORDS = {
    "很", "非常", "特别", "十分", "极其", "相当", "比较", "稍微", "略微",
    "最", "太", "更", "越", "更加", "最为", "格外", "尤其",
    "都", "全", "总", "共", "统统", "一律", "一概",
    "也", "还", "又", "再", "才", "就", "都",
    "已", "已经", "曾", "曾经", "刚", "刚刚", "正", "正在", "在", "将", "将要",
    "马上", "立刻", "立即", "顿时", "忽然", "突然", "渐渐", "逐渐", "慢慢",
    "不", "没", "没有", "未", "别", "莫", "勿", "非",
    "一定", "必须", "必然", "肯定", "确实", "的确",
    "可能", "也许", "大概", "大约", "似乎", "好像", "几乎", "差不多",
    "究竟", "到底", "难道", "岂",
    "亲自", "亲手", "亲眼", "亲笔", "擅自", "私自",
    "互相", "彼此", "共同", "一起", "一同", "一块儿",
    "连续", "继续", "持续", "不断", "一直", "始终",
    "快速", "缓慢", "迅速", "及时", "准时",
    "主动", "被动", "自觉", "被迫",
    "直接", "间接", "简单", "反复", "多次",
    "远远", "大大", "深深", "死死", "紧",
    "always", "never", "often", "usually", "sometimes", "rarely",
    "very", "quite", "rather", "almost", "nearly", "hardly",
    "already", "just", "still", "yet", "soon", "now", "then",
    "quickly", "slowly", "carefully", "easily", "well", "badly",
    "not", "no", "yes", "maybe", "perhaps", "probably",
}

POS_LEXICON = {
    "noun": NOUN_WORDS,
    "verb": VERB_WORDS,
    "adj":  ADJ_WORDS,
    "adv":  ADV_WORDS,
}


# ============================================================
# 中文分词器 —— 前向最大匹配（FMM）
# （仅表层工程分词，不涉及NLP内核）
# ============================================================
def tokenize(text: str, max_word_len: int = 6) -> List[Tuple[str, str]]:
    """
    前向最大匹配分词 + 词性标注。
    返回 [(word, pos_tag), ...]；pos_tag ∈ {noun, verb, adj, adv, other}
    未命中词典的单字归入 other。
    """
    text = text.strip()
    if not text:
        return []
    result = []
    i = 0
    n = len(text)
    while i < n:
        matched = None
        matched_pos = None
        for l in range(min(max_word_len, n - i), 0, -1):
            w = text[i:i+l]
            for pos_tag, words in POS_LEXICON.items():
                if w in words:
                    matched = w
                    matched_pos = pos_tag
                    break
            if matched:
                break
        if matched:
            result.append((matched, matched_pos))
            i += len(matched)
        else:
            ch = text[i]
            if ch.isspace():
                i += 1
                continue
            if ch in "，。！？、；：""''（）【】《》,.!?;:()[]{}\"'-—…·":
                i += 1
                continue
            ascii_w = []
            while i < n and (text[i].isalnum() and ord(text[i]) < 128):
                ascii_w.append(text[i])
                i += 1
            if ascii_w:
                w = "".join(ascii_w).lower()
                pos_tag = "other"
                for tag, words in POS_LEXICON.items():
                    if w in words:
                        pos_tag = tag
                        break
                result.append((w, pos_tag))
            else:
                result.append((ch, "other"))
                i += 1
    return result


# ============================================================
# FP128 预留接口（红线：不可实现）
# ============================================================
class FP128Reserved:
    """FP128 高精度占位类 —— Batch1/Batch2/Batch3 均不实现，仅抛 NotImplementedError"""
    enabled = False
    reason = "红线：128bit高精度向量运算禁止在本层实现，仅预留空接口"

    def __init__(self):
        raise NotImplementedError(self.reason)

    @staticmethod
    def to_bytes(arr):
        raise NotImplementedError(FP128Reserved.reason)


# ============================================================
# 精度 → numpy dtype
# ============================================================
def precision_dtype(precision: str):
    p = precision.lower()
    if p == "fp32":
        return np.float32
    elif p == "fp64":
        return np.float64
    elif p == "fp128":
        FP128Reserved()
    raise ValueError(f"不支持的精度: {precision}（仅支持 fp32/fp64；fp128 为预留接口）")


# ============================================================
# 四维向量生成
# ============================================================
def build_4d_vector(text: str, precision: str = "fp32") -> Dict:
    """
    从文本生成四维向量：[名词得分, 动词得分, 形容词得分, 副词得分]
    得分 = 该词性命中词数 / 总有效词数（归一化到[0,1]，L1归一化后总和=1）
    """
    dtype = precision_dtype(precision)
    tokens = tokenize(text)
    if not tokens:
        vec = np.zeros(4, dtype=dtype)
        counts = [0, 0, 0, 0]
    else:
        counts = [0, 0, 0, 0]
        other_count = 0
        for _, tag in tokens:
            if tag == "noun": counts[0] += 1
            elif tag == "verb": counts[1] += 1
            elif tag == "adj":  counts[2] += 1
            elif tag == "adv":  counts[3] += 1
            else: other_count += 1
        total_pos = sum(counts)
        total_all = total_pos + other_count
        if total_pos > 0:
            vec = np.array([c / total_pos for c in counts], dtype=dtype)
        else:
            vec = np.zeros(4, dtype=dtype)
    return {
        "vector": vec,
        "counts": {"noun": counts[0], "verb": counts[1], "adj": counts[2], "adv": counts[3]},
        "tokens": tokens,
        "token_count": len(tokens),
        "precision": precision.lower(),
        "dims": 4,
    }


# ============================================================
# 存储字节测算
# 公式：总字节 = 维度数 × 单精度字节 + 8字节元数据
# ============================================================
def calc_vector_bytes(dims: int, precision: str) -> Dict:
    p = precision.lower()
    if p == "fp128":
        FP128Reserved()
    if p not in PRECISION_BYTES:
        raise ValueError(f"不支持的精度: {precision}")
    elem_bytes = PRECISION_BYTES[p]
    payload_bytes = dims * elem_bytes
    metadata_bytes = 8
    total_bytes = payload_bytes + metadata_bytes
    return {
        "dims": dims,
        "precision": p,
        "elem_bytes": elem_bytes,
        "payload_bytes": payload_bytes,
        "metadata_bytes": metadata_bytes,
        "total_bytes": total_bytes,
        "formula": f"{dims} dims × {elem_bytes}B + 8B metadata = {total_bytes}B",
    }


# ============================================================
# 二进制补0冗余 / 有效比特占比统计
# ============================================================
def _count_bits_in_bytes(raw_bytes: bytes) -> Dict:
    """统计字节序列中的1-bit/0-bit数量"""
    total_bits = len(raw_bytes) * 8
    one_bits = 0
    for b in raw_bytes:
        one_bits += bin(b).count("1")
    zero_bits = total_bits - one_bits
    return {
        "total_bits": total_bits,
        "one_bits": one_bits,
        "zero_bits": zero_bits,
        "effective_bit_ratio": one_bits / total_bits if total_bits > 0 else 0.0,
        "zero_padding_ratio": zero_bits / total_bits if total_bits > 0 else 0.0,
    }


def analyze_vector_bits(vec: np.ndarray, precision: str) -> Dict:
    """
    将向量按精度序列化为字节，统计二进制有效比特占比与补0冗余。
    metadata 固定为8字节（向量ID前缀，8字节大端无符号整数）。
    """
    p = precision.lower()
    if p == "fp128":
        FP128Reserved()
    if p == "fp32":
        payload = struct.pack(f">{len(vec)}f", *[float(x) for x in vec])
    elif p == "fp64":
        payload = struct.pack(f">{len(vec)}d", *[float(x) for x in vec])
    metadata = struct.pack(">Q", 0)  # 8字节元数据占位
    raw = metadata + payload
    stats = _count_bits_in_bytes(raw)
    stats["payload_bits_stats"] = _count_bits_in_bytes(payload)
    stats["metadata_bits_stats"] = _count_bits_in_bytes(metadata)
    stats["raw_hex"] = raw.hex()
    return stats


# ============================================================
# KMP 长文本分块存储统计
# （仅做文本切片+块元数据统计，不实现KMP匹配算法本身——红线）
# ============================================================
def kmp_block_stats(text: str, block_size: int = 256) -> Dict:
    """
    将长文本按固定块大小切分，统计分块元数据。
    注意：本函数仅做分块切片+记录块信息，不包含KMP匹配算法源码。
    KMP底层匹配由Batch2对接外部引擎后仅接收分值。
    """
    text_bytes = text.encode("utf-8")
    total_bytes = len(text_bytes)
    if block_size <= 0:
        block_size = 256
    blocks = []
    offset = 0
    block_idx = 0
    while offset < total_bytes:
        end = min(offset + block_size, total_bytes)
        chunk = text_bytes[offset:end]
        blocks.append({
            "block_id": block_idx,
            "offset": offset,
            "length": len(chunk),
            "crc32_prefix": (sum(chunk) & 0xFFFFFFFF) if chunk else 0,
            "is_last": end >= total_bytes,
        })
        offset = end
        block_idx += 1
    return {
        "text_bytes": total_bytes,
        "text_chars": len(text),
        "block_size": block_size,
        "block_count": len(blocks),
        "padding_bytes": sum(block_size - b["length"] for b in blocks),
        "blocks": blocks,
        "note": "KMP匹配算法本身不在本层实现；此处仅做分块存储元数据统计（红线合规）",
    }


# ============================================================
# 向量记录封装
# ============================================================
@dataclass
class VectorRecord:
    vec_id: str
    text: str
    vector: List[float]
    precision: str
    dims: int
    counts: Dict[str, int]
    token_count: int
    tokens_tagged: List[List]
    byte_info: Dict
    bit_stats: Dict
    kmp_blocks: Dict
    tier: str
    created_at: str
    tags: List[str] = field(default_factory=list)
    source: str = "user_input"

    def to_dict(self) -> Dict:
        d = asdict(self)
        return d

    @classmethod
    def from_text(cls, text: str, precision: str = "fp32", tier: str = "buffer",
                  tags: Optional[List[str]] = None, block_size: int = 256,
                  timestamp: str = "", vec_id: str = "") -> "VectorRecord":
        v = build_4d_vector(text, precision)
        byte_info = calc_vector_bytes(v["dims"], precision)
        bit_stats = analyze_vector_bits(v["vector"], precision)
        kmp = kmp_block_stats(text, block_size)
        TZ = timezone(timedelta(hours=8))
        ts = timestamp or datetime.now(TZ).isoformat(timespec="seconds")
        vid = vec_id or uuid.uuid4().hex[:16]
        return cls(
            vec_id=vid,
            text=text,
            vector=[float(x) for x in v["vector"]],
            precision=precision,
            dims=v["dims"],
            counts=v["counts"],
            token_count=v["token_count"],
            tokens_tagged=[list(t) for t in v["tokens"]],
            byte_info=byte_info,
            bit_stats=bit_stats,
            kmp_blocks=kmp,
            tier=tier,
            created_at=ts,
            tags=tags or [],
        )


# ============================================================
# 余弦相似度计算（Batch1已实现）
# ============================================================
def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """
    计算两个向量的余弦相似度，返回值范围 [-1, 1]。
    对于归一化向量（L2归一化），余弦相似度≈点积；此处使用通用公式。
    """
    a = np.array(v1, dtype=np.float64)
    b = np.array(v2, dtype=np.float64)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-12 or norm_b < 1e-12:
        return 0.0
    return float(dot / (norm_a * norm_b))


def batch_cosine_similarity(query: List[float], corpus: List[List[float]]) -> List[float]:
    """批量计算query与语料库中每个向量的余弦相似度"""
    q = np.array(query, dtype=np.float64)
    qn = np.linalg.norm(q)
    if qn < 1e-12:
        return [0.0] * len(corpus)
    q = q / qn
    results = []
    for c in corpus:
        cv = np.array(c, dtype=np.float64)
        cn = np.linalg.norm(cv)
        if cn < 1e-12:
            results.append(0.0)
        else:
            results.append(float(np.dot(q, cv / cn)))
    return results


# ============================================================
# 四档自动分流路由（Batch1已实现）
#   ＜1/4(0.25) → trash丢弃
#   1/4~2/4(0.25~0.5) → buffer缓冲
#   2/4~3/4(0.5~0.75) → normal常规
#   ≥3/4(0.75) → knowledge知识库
# 注意：相似度这里指与"理想高质量向量"的余弦相似度。
#   基准向量取纯名动高密度方向 [0.5,0.5,0,0]（名词+动词占比高=信息密度高）
#   形副主导的噪声文本与该基准夹角大→相似度低→流入trash/buffer；
#   名动主导的高信息文本与该基准夹角小→相似度高→流入knowledge。
# ============================================================
REFERENCE_KNOWLEDGE_VEC = [0.50, 0.50, 0.00, 0.00]

ROUTE_THRESHOLDS = [
    (0.00, 0.25, "trash",     "🗑️ 丢弃（噪声库）"),
    (0.25, 0.50, "buffer",    "⏳ 缓冲库"),
    (0.50, 0.75, "normal",    "📦 常规库"),
    (0.75, 1.01, "knowledge", "🏛️ 知识库"),
]

def classify_tier_by_similarity(vec: List[float], ref_vec: List[float] = None) -> Dict:
    """
    基于与参考高质量向量的余弦相似度，自动路由到四库之一。
    返回: {tier, similarity, tier_label, tier_desc, auto_routed: True}
    """
    if ref_vec is None:
        ref_vec = REFERENCE_KNOWLEDGE_VEC
    sim = cosine_similarity(vec, ref_vec)
    sim_clamped = max(0.0, min(1.0, sim))
    target_tier = "trash"
    tier_label = "🗑️ 丢弃"
    for lo, hi, tier, label in ROUTE_THRESHOLDS:
        if lo <= sim_clamped < hi:
            target_tier = tier
            tier_label = label
            break
    return {
        "tier": target_tier,
        "similarity": round(sim_clamped, 6),
        "similarity_pct": round(sim_clamped * 100, 2),
        "tier_label": tier_label,
        "reference_vec": ref_vec,
        "auto_routed": True,
        "thresholds": [
            {"min": lo, "max": hi, "tier": t, "label": lbl}
            for lo, hi, t, lbl in ROUTE_THRESHOLDS
        ],
    }


# ============================================================
# Token 计数规则（Batch1已实现）
#   - 1~2个汉字(CJK字符) = 1个Token
#   - 每个英文单词≈1Token
#   - 标点/空格不计费Token，但计入字符长度
#   - 输出Token按向量维度数+元数据开销估算
# ============================================================
def count_tokens_in_text(text: str) -> Dict:
    """
    计算输入文本的Token消耗。
    规则：连续CJK汉字每2个计1Token（不足2个按1计）；
          连续ASCII字母/数字组成的单词计1Token；
          纯标点/空白不计Token。
    """
    cjk_chars = 0
    ascii_words = 0
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        code = ord(ch)
        if 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF or 0xF900 <= code <= 0xFAFF:
            cjk_chars += 1
            i += 1
        elif ch.isalnum() and code < 128:
            while i < n and text[i].isalnum() and ord(text[i]) < 128:
                i += 1
            ascii_words += 1
        else:
            i += 1
    cjk_tokens = (cjk_chars + 1) // 2 if cjk_chars > 0 else 0
    total_tokens = cjk_tokens + ascii_words
    return {
        "total_tokens": total_tokens,
        "cjk_chars": cjk_chars,
        "cjk_tokens": cjk_tokens,
        "ascii_words": ascii_words,
        "total_chars": len(text),
        "rule": "1~2汉字=1Token, 英文单词≈1Token, 标点不计",
    }


def estimate_output_tokens(precision: str = "fp32", dims: int = 4, with_metadata: bool = True) -> Dict:
    """
    估算输出Token数（向量序列化后用于计费）。
    规则：每个浮点分量≈1Token，元数据额外固定5Token。
    """
    elem_token = dims
    meta_token = 5 if with_metadata else 0
    total = elem_token + meta_token
    return {
        "dims": dims,
        "element_tokens": elem_token,
        "metadata_tokens": meta_token,
        "total_tokens": total,
        "precision": precision,
    }


# ============================================================
# 向量去重指纹（Batch1已实现）
# ============================================================
def vector_fingerprint(vec: List[float], precision: str = "fp32", text_norm: str = "") -> str:
    """
    生成向量指纹：将向量按精度量化后做SHA256，可用于检测重复向量。
    text_norm: 可选，去空白后的原文，参与哈希增强去重准确性。
    """
    if precision == "fp64":
        quantized = tuple(round(x, 10) for x in vec)
    else:
        quantized = tuple(round(x, 6) for x in vec)
    raw = f"{precision}|{'|'.join(f'{v:.10f}' for v in quantized)}|{text_norm.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def text_normalize(text: str) -> str:
    """归一化文本：去空白、标点、转小写，用于去重比对"""
    t = re.sub(r"\s+", "", text)
    t = re.sub(r"[，。！？、；：\"\"''（）【】《》,.!?;:()\[\]{}\"'\-—…·]", "", t)
    return t.lower()


# ============================================================
# 精度降级（FP64→FP32）（Batch1已实现）
# ============================================================
def downgrade_precision(vec_record: Dict) -> Dict:
    """
    将FP64向量降级为FP32，重新计算字节占用和比特统计。
    返回新的向量记录dict（不修改原对象）。
    """
    if vec_record.get("precision") != "fp64":
        return vec_record
    new_rec = copy.deepcopy(vec_record)
    new_rec["precision"] = "fp32"
    new_vec = [float(np.float32(x)) for x in vec_record["vector"]]
    new_rec["vector"] = new_vec
    new_rec["byte_info"] = calc_vector_bytes(new_rec["dims"], "fp32")
    arr = np.array(new_vec, dtype=np.float32)
    new_rec["bit_stats"] = analyze_vector_bits(arr, "fp32")
    new_rec["downgraded_from"] = "fp64"
    new_rec["downgraded_at"] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")
    return new_rec
