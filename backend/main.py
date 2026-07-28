"""
================================================================================
  ⚠️ Game-OS V2.5.1 · FastAPI 后端【备用/模块化版本】
================================================================================
  📌 推荐使用根目录 main.py 作为主入口：
     cd /workspace && uvicorn main:app --reload --port 8000

  本版本为备用模块化版本（routers拆分），包含：
  - NLP染色体诊断（需 sentence-transformers、jieba、sklearn 依赖）
  - routers 模块化拆分

  如无需 NLP 功能或遇到依赖问题，请使用根目录主入口。

  Docs: http://localhost:8000/docs
================================================================================
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import THRESHOLDS, VERSION, CORS_SETTINGS
from routers import chromosome, storm

app = FastAPI(
    title="🔺 Game-OS API (Modular)",
    description="博弈论驱动的全域认知操作系统 · FastAPI 后端服务（备用模块化版本）",
    version="2.5.1",
)

app.add_middleware(CORSMiddleware, **CORS_SETTINGS)

app.include_router(chromosome.router)
app.include_router(storm.router)


@app.get("/", tags=["root"])
def root():
    return {
        "name": "🔺 Game-OS V2.5.1 API (Modular/备用版)",
        "version": VERSION,
        "status": "running",
        "note": "这是备用模块化版本，推荐使用根目录 main.py 主入口",
        "docs": "/docs",
        "health": "/health",
        "thresholds": "/thresholds",
        "endpoints": {
            "chromosome": "/api/chromosome/status (NLP版，需额外依赖)",
            "storm": "/api/storm/status",
        },
    }


@app.get("/health", tags=["root"])
def health():
    return {
        "status": "ok",
        "service": "game-os-backend-modular",
        "version": VERSION,
        "thresholds": THRESHOLDS,
    }


@app.get("/thresholds", tags=["root"])
def get_thresholds():
    return {
        "thresholds": THRESHOLDS,
        "description": {
            "BREAKEVEN": "0.48 保本底线",
            "STEADY": "0.50 稳态中轴线",
            "WARNING": "0.58 预警线",
            "FUSE": "0.68 熔断警戒线",
        },
    }


@app.get("/version", tags=["root"])
def get_version():
    return {"version": VERSION, "name": "FullStack-Verified (Modular)", "description": "备用模块化版本，推荐使用根目录main.py"}
