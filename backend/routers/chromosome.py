from fastapi import APIRouter, Query
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import jieba.posseg as pseg
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------- 1. 加载语义模型 ----------
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
logger.info("语义模型加载成功")

# ---------- 2. 主题锚点库 ----------
TOPIC_ANCHORS = {
    "quant": {
        "label": "量化金融策略",
        "anchor_text": "量化策略与风控收益波动率仓位管理",
    },
    "medical": {
        "label": "医疗诊断辅助",
        "anchor_text": "症状诊断治疗用药检查病历分析",
    },
    "code": {
        "label": "编程代码生成",
        "anchor_text": "代码函数算法调试测试框架设计",
    },
    "edu": {
        "label": "教育知识问答",
        "anchor_text": "知识学习课程理解概念方法练习",
    }
}

# ---------- 3. 语法片段拆解 ----------
def extract_syntax_fragments(text):
    words = pseg.cut(text)
    fragments = {
        '主语': [], '谓语': [], '宾语': [],
        '定语': [], '状语': [], '补语': []
    }
    for word, flag in words:
        if flag.startswith('n') or flag in ['nr', 'ns', 'nt']:
            fragments['主语'].append(word)
        elif flag.startswith('v'):
            fragments['谓语'].append(word)
        elif flag.startswith('a') or flag.startswith('an'):
            fragments['定语'].append(word)
        elif flag.startswith('d'):
            fragments['状语'].append(word)
        elif flag.startswith('p') or flag in ['ul', 'uj']:
            fragments['补语'].append(word)
        else:
            fragments['宾语'].append(word)
    return fragments

# ---------- 4. 三种距离融合 ----------
def calculate_similarity(user_vec, anchor_vec):
    cos_sim = cosine_similarity(user_vec, anchor_vec)[0][0]
    euclidean_dist = np.linalg.norm(user_vec - anchor_vec)
    euclidean_sim = 1 / (1 + euclidean_dist)
    manhattan_dist = np.sum(np.abs(user_vec - anchor_vec))
    manhattan_sim = 1 / (1 + manhattan_dist)
    return 0.5 * cos_sim + 0.3 * euclidean_sim + 0.2 * manhattan_sim

# ---------- 5. 诊断接口 ----------
@router.get("/diagnose")
async def diagnose_chromosome(
    data: str = Query(..., description="用户输入的文本"),
    topic: str = Query("quant", description="主题: quant/medical/code/edu")
):
    # 主题切换
    if topic not in TOPIC_ANCHORS:
        topic = "quant"
    anchor_text = TOPIC_ANCHORS[topic]["anchor_text"]
    anchor_embedding = model.encode(anchor_text).reshape(1, -1)

    # 拆解片段
    user_fragments = extract_syntax_fragments(data)
    anchor_fragments = extract_syntax_fragments(anchor_text)

    # 加权计算
    weights = {
        '主语': 0.60, '谓语': 0.25, '宾语': 0.10,
        '定语': 0.03, '状语': 0.02, '补语': 0.00
    }
    total_sim = 0.0
    total_weight = 0.0

    for frag_type in weights:
        user_vec = model.encode(' '.join(user_fragments.get(frag_type, []))).reshape(1, -1)
        anchor_vec = model.encode(' '.join(anchor_fragments.get(frag_type, []))).reshape(1, -1)
        if user_vec.size > 0 and anchor_vec.size > 0:
            sim = calculate_similarity(user_vec, anchor_vec)
            total_sim += weights[frag_type] * sim
            total_weight += weights[frag_type]

    overall_sim = total_sim / total_weight if total_weight > 0 else 0.5

    # 状态判定
    if overall_sim >= 0.65:
        status = "normal"
    elif overall_sim >= 0.40:
        status = "warning"
    else:
        status = "meltdown"

    return {
        "avg_health": overall_sim,
        "overall_status": status,
        "status_text": {"normal": "锚定稳定", "warning": "主题漂移警告", "meltdown": "熔断告警"}[status],
        "similarity_score": overall_sim,
        "anchor_text": anchor_text,
        "topic": topic
    }