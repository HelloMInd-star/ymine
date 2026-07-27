"""
Game-OS V2.3 FastAPI Backend
============================
Main API entry point. Provides REST access to core algorithms
(threshold judgment, vector computation, simulation analysis)
for frontend-backend separation deployment.

Endpoints:
  GET  /              → API info
  GET  /health        → health check (used by frontend status indicator)
  GET  /thresholds    → global threshold constants
  GET  /version       → version info
  /api/chromosome/*   → chromosome diagnostic APIs
  /api/storm/*        → storm energy simulator APIs

Run:
  cd backend
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import THRESHOLDS, VERSION
from routers import chromosome, storm

app = FastAPI(
    title="🔺 Game-OS API",
    description="博弈论驱动的全域认知操作系统 · FastAPI 后端服务",
    version=VERSION.replace("V", ""),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chromosome.router)
app.include_router(storm.router)


@app.get("/", tags=["root"])
def root():
    return {
        "name": "🔺 Game-OS V2.3 API",
        "version": VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "thresholds": "/thresholds",
        "endpoints": {
            "chromosome": "/api/chromosome/status",
            "storm": "/api/storm/status",
        },
    }


@app.get("/health", tags=["root"])
def health():
    return {
        "status": "ok",
        "service": "game-os-backend",
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
    return {"version": VERSION, "name": "Component-Optimized"}
