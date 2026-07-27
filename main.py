from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import THRESHOLDS

app = FastAPI(
    title="Game-OS Backend API",
    version="2.4",
    description="Game-OS 后端服务，提供算法 API 调用"
)

# CORS 配置，支持前端跨域调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Game-OS Backend API 运行中"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "game-os-backend", "version": "2.4"}

@app.get("/thresholds")
async def get_thresholds():
    return THRESHOLDS

@app.get("/version")
async def get_version():
    return {"version": "2.4", "description": "Backend-Integrated"}

# 染色体诊断 API（模拟）
@app.get("/api/chromosome/diagnose")
async def diagnose_chromosome():
    # 模拟染色体分析结果
    return {
        "status": "completed",
        "result": "染色体分析完成",
        "similarity_score": 0.65,
        "threshold_status": "steady"  # 0.48/0.50/0.68 三态
    }

# 风暴能量模拟 API（模拟）
@app.get("/api/storm/simulate")
async def simulate_storm():
    # 模拟风暴能量分配结果
    return {
        "status": "simulated",
        "energy_distribution": {
            "thunder": 0.35,
            "lightning": 0.25,
            "wind": 0.40
        },
        "total_energy": 1.0,
        "threshold_status": "steady"
    }
