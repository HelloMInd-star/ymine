# Y.Mine 机构级量化投研十步闭环引擎 · 架构设计

## 一、核心数据流向图

```mermaid
flowchart TD
    %% 全局风控总线 - 贯穿全流程
    RCB["🛡️ RiskCircuitBreaker<br/>(强制熔断中间件)<br/>0.68铁律·不可绕过"]

    %% 第0步：宏观漏斗
    S0["🌊 Step 0<br/>宏观漏斗与海选<br/>MacroFunnel"]
    S0 -->|ScreenedUniverse<br/>精选标的池| S1

    %% 第1-2步：信息摄入与ETL
    S1["📥 Step 1-2<br/>信息摄入与数据提取<br/>Ingestion &amp; ETL"]
    S1 -->|FactorLibrary<br/>标准化因子库| S3

    %% 第3-4步：核心定价与估值
    S3["⚖️ Step 3-4<br/>核心定价与估值<br/>Pricing Core"]
    S3 -->|ValuationResult<br/>理论目标价区间| S5

    %% 第5-6步：决策推演与动态模拟
    S5["🔮 Step 5-6<br/>决策推演与动态K线<br/>Sandbox &amp; K-Line"]
    S5 -->|SimulationResult<br/>压力测试结果| S7

    %% 第7步：德州扑克沙盘
    S7["🃏 Step 7<br/>德州扑克人性测试<br/>Poker Tilt Test"]
    S7 -->|RationalityScore<br/>理性指数| S8

    %% 第8步：动态资产配置
    S8["🛡️ Step 8<br/>动态对冲与配置<br/>Allocation &amp; Hedging"]
    S8 -->|ExecutionOrder<br/>最终执行指令| OUTPUT["📤 交易执行层"]

    %% 风控熔断 - 每个步骤都接入
    S0 -.->|MacroSignals| RCB
    S1 -.->|RiskFactors| RCB
    S3 -.->|ValuationRisk| RCB
    S5 -.->|SimulationRisk| RCB
    S7 -.->|TiltSignals| RCB
    S8 -.->|PreTradeCheck| RCB
    RCB ==>|EnforcedResult<br/>(熔断则仓位=0)| S8

    %% 红蓝环境切换总线
    REGIME["🔴🔵 红蓝环境切换器<br/>RegimeSwitcher"]
    REGIME -->|Regime: RED_OCEAN| S0
    REGIME -->|Regime: BLUE_OCEAN| S3
    REGIME -->|Regime: Regime| S5
    REGIME -->|Regime: Regime| S8

    %% 样式定义
    classDef step fill:#1e1b4b,stroke:#a78bfa,stroke-width:2px,color:#f1f5f9
    classDef rcb fill:#450a0a,stroke:#ef4444,stroke-width:3px,color:#fca5a5
    classDef regime fill:#1a1a2e,stroke:#facc15,stroke-width:2px,color:#fde68a
    classDef output fill:#052e16,stroke:#22c55e,stroke-width:2px,color:#86efac

    class S0,S1,S3,S5,S7,S8 step
    class RCB rcb
    class REGIME regime
    class OUTPUT output
```

---

## 二、核心数据接口定义

### 2.1 全局基础类型

```typescript
// ============================================================
// 全局枚举与基础类型
// ============================================================

/** 市场环境：红海(存量博弈)/蓝海(增量资金) */
type MarketRegime = 'RED_OCEAN' | 'BLUE_OCEAN';

/** 游戏状态 - 复用现有cone-game-theory */
type GameState = 'CALM' | 'TENSION' | 'EXTREME' | 'BLACK_SWAN' | 'MELTDOWN';

/** 信号方向 */
type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/** 资产等级 - 复用现有mcn-alpha-engine S/A/B/C/D */
type AssetGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/** 交易方向 */
type TradeDirection = 'BUY' | 'SELL' | 'HOLD';

/** 理性状态 */
type RationalityState = 'PREFRONTAL_RATIONAL' | 'BALANCED' | 'LIMBIC_TILT' | 'EXTREME_TILT';

/** 时间戳 */
type Timestamp = number;

// ============================================================
// 风控熔断 - 复用现有risk-circuit-breaker扩展
// ============================================================

interface FuseThresholds {
    CONE_C: 0.68;           // 圆锥浓度临界值（铁律）
    ZSCORE_BLACK_SWAN: 2.0; // 2σ黑天鹅
    ZSCORE_MELTDOWN: 3.0;   // 3σ系统性坍缩
    MDD_MAX: 0.50;          // 最大回撤50%
    DRAWDOWN_MAX: 0.40;     // 组合回撤40%
    TILT_MAX: 0.80;         // 情绪上头阈值
    NPV_NEGATIVE: boolean;  // NPV为负
    IRR_BELOW_HURDLE: number; // IRR低于门槛
}

interface ActiveFuse {
    fuseId: string;
    value: number | boolean;
    threshold: number | boolean;
    reason: string;
    triggeredAt: Timestamp;
}

interface EnforcedPosition {
    requested: number;       // 请求仓位
    actual: number;          // 实际可执行仓位（熔断则=0）
    halted: boolean;         // 是否熔断
    activeFuses: Record<string, ActiveFuse>;
    fuseIds: string[];
    caps: Array<{ reason: string; cap: number }>;
    reductions: Array<{ reason: string; factor: number; detail?: string }>;
    hedgingRequired: number; // 对冲比例
    budgetMultiplier: number;
    coneDistanceToFuse: number;
    rationalityAdjustment?: number; // 第7步理性指数调整
    timestamp: Timestamp;
}

// ============================================================
// 红蓝环境切换器
// ============================================================

interface RegimeConfig {
    regime: MarketRegime;
    switchReason?: string;
    switchedAt: Timestamp;
    /** 红海参数：杀估值 */
    redOceanParams: {
        preferredPE: [number, number];  // 低PE区间 [5, 15]
        preferredPB: [number, number];  // 低PB区间 [0.5, 2]
        fcfFocus: number;               // 现金流权重 0.8
        growthPenalty: number;          // 成长惩罚系数 0.3
        valuationDiscount: number;      // 估值折价 0.7
    };
    /** 蓝海参数：拔估值 */
    blueOceanParams: {
        preferredGrowth: [number, number]; // 高增长区间 [30%, 100%]
        preferredMomentum: [number, number]; // 动量区间 [0.3, 1.0]
        growthPremium: number;            // 成长溢价 1.3
        valueRelaxation: number;          // 估值容忍度提升 0.5
        betaAmplifier: number;            // Beta放大系数 1.2
    };
}
```

---

### 2.2 Step 0: 宏观漏斗与海选 (MacroFunnel)

```typescript
// ============================================================
// Step 0: 宏观漏斗与海选
// ============================================================

interface MacroIndicator {
    /** GDP同比增速 */
    gdpGrowth: number;
    /** CPI同比 */
    cpi: number;
    /** 10年期国债收益率 */
    riskFreeRate: number;
    /** M2同比增速 */
    m2Growth: number;
    /** 社融增速 */
    socialFinancingGrowth: number;
    /** 市场情绪指数 0-100 */
    marketSentiment: number;
    /** 两融余额变化率 */
    marginBalanceChange: number;
    /** VIX恐慌指数 */
    vix: number;
}

interface ScreeningCriteria {
    regime: MarketRegime;
    /** 硬性过滤条件 */
    hardFilters: {
        minMarketCap?: number;          // 最小市值
        maxPE?: number;                 // 最大PE（红海）
        minPE?: number;                 // 最小PE（蓝海成长）
        minRevenueGrowth?: number;      // 最低营收增速（蓝海）
        minFCFYield?: number;           // 最低自由现金流收益率（红海）
        maxDebtToEquity?: number;       // 最大资产负债率
        minROE?: number;                // 最低ROE
        excludeST?: boolean;            // 排除ST
        excludeFinancial?: boolean;     // 排除金融
    };
    /** 软性评分权重 */
    softWeights: {
        valuation: number;
        growth: number;
        quality: number;
        momentum: number;
    };
}

interface ScreenedAsset {
    ticker: string;
    name: string;
    industry: string;
    marketCap: number;
    pe: number;
    pb: number;
    revenueGrowthYoY: number;
    fcfYield: number;
    roe: number;
    debtToEquity: number;
    /** 漏斗综合评分 0-100 */
    screeningScore: number;
    /** 入选理由 */
    selectionReasons: string[];
    /** 宏观信号 */
    macroSignals: {
        coneC: number;
        zScore: number;
        mdd: number;
    };
}

interface ScreenedUniverse {
    generationId: string;
    timestamp: Timestamp;
    regime: MarketRegime;
    macroIndicators: MacroIndicator;
    criteria: ScreeningCriteria;
    /** 筛选后标的池 */
    assets: ScreenedAsset[];
    /** 总数 */
    totalScreened: number;
    totalPassed: number;
}
```

---

### 2.3 Step 1-2: 信息摄入与数据提取 (Ingestion &amp; ETL)

```typescript
// ============================================================
// Step 1-2: 信息摄入与数据提取 (ETL)
// ============================================================

/** 非结构化数据源 */
interface UnstructuredData {
    /** 新闻情绪 */
    news: Array<{
        source: string;
        title: string;
        content: string;
        publishedAt: Timestamp;
        /** 情绪得分 -1 到 1 */
        sentiment: number;
        /** 主题标签 */
        topics: string[];
        /** 重要性权重 */
        weight: number;
    }>;
    /** 研报摘要 */
    researchReports: Array<{
        institution: string;
        analyst: string;
        rating: 'BUY' | 'HOLD' | 'SELL';
        targetPrice: number;
        summary: string;
        publishedAt: Timestamp;
    }>;
    /** 社交媒体情绪 */
    socialMedia: Array<{
        platform: string;
        mentionCount: number;
        sentiment: number;
        /** 意见领袖影响度 */
        influencerImpact: number;
    }>;
}

/** 结构化财务数据 */
interface StructuredFinancials {
    /** 利润表 */
    incomeStatement: {
        revenue: number[];            // 近12季度营收
        netIncome: number[];          // 近12季度净利润
        ebitda: number[];
        eps: number[];
        grossMargin: number[];
        operatingMargin: number[];
        netMargin: number[];
    };
    /** 资产负债表 */
    balanceSheet: {
        totalAssets: number;
        totalDebt: number;
        cash: number;
        equity: number;
        goodwill: number;
        currentRatio: number;
    };
    /** 现金流量表 */
    cashFlow: {
        operatingCF: number[];
        investingCF: number[];
        financingCF: number[];
        capex: number[];
        fcf: number[];
    };
    /** 市场数据 */
    marketData: {
        price: number;
        volume: number;
        avgVolume20d: number;
        price52wHigh: number;
        price52wLow: number;
        beta2y: number;
        volatility30d: number;
        rsi14: number;
        macd: { diff: number; dea: number; hist: number };
    };
    /** 一致预期 */
    consensus: {
        targetPriceMean: number;
        targetPriceMedian: number;
        numAnalysts: number;
        epsEstimateNextFY: number;
        revenueGrowthNextFY: number;
    };
}

/** 标准化因子库 - 输出给定价核心 */
interface FactorLibrary {
    assetId: string;
    processedAt: Timestamp;
    regime: MarketRegime;

    /** 价值因子 (Value) */
    valueFactors: {
        pe_ttm: number;
        pb_lf: number;
        ps_ttm: number;
        ev_ebitda: number;
        dividendYield: number;
        fcfYield: number;
        /** 相对历史分位数 0-1 */
        pePercentile: number;
        pbPercentile: number;
    };

    /** 成长因子 (Growth) */
    growthFactors: {
        revenueGrowth3yCAGR: number;
        earningsGrowth3yCAGR: number;
        fcfGrowth3yCAGR: number;
        revenueGrowthYoY: number;
        earningsGrowthYoY: number;
        /** 未来一致预期增速 */
        epsGrowthNextFY: number;
        revenueGrowthNextFY: number;
    };

    /** 质量因子 (Quality) */
    qualityFactors: {
        roe_ttm: number;
        roa_ttm: number;
        grossMargin: number;
        operatingMargin: number;
        netMargin: number;
        debtToEquity: number;
        currentRatio: number;
        interestCoverage: number;
        /** 盈利稳定性 */
        earningsStability: number;
    };

    /** 动量因子 (Momentum) */
    momentumFactors: {
        return1m: number;
        return3m: number;
        return6m: number;
        return12m: number;
        relativeStrength: number;
        /** 北向资金持仓变化 */
        northboundFlow: number;
        /** 机构持仓比例 */
        institutionalHolding: number;
    };

    /** 情绪因子 (Sentiment) */
    sentimentFactors: {
        newsSentiment: number;         // -1 到 1
        analystConsensus: number;      // -1 到 1
        socialSentiment: number;       // -1 到 1
        shortInterestRatio: number;
        putCallRatio: number;
        vixAdjustment: number;
    };

    /** 风险因子 (Risk) - 直接馈入RCB */
    riskFactors: {
        coneC: number;
        zScore: number;
        mdd: number;
        drawdown: number;
        volatility30d: number;
        beta: number;
        valueAtRisk95: number;
        maxDrawdown1y: number;
    };

    /** 因子z-score标准化结果 */
    factorZScores: Record<string, number>;
    /** 综合因子得分 */
    compositeScore: number;
}
```

---

### 2.4 Step 3-4: 核心定价与估值 (Pricing Core)

```typescript
// ============================================================
// Step 3-4: 核心定价与估值
// ============================================================

/** CAPM资本资产定价模型输入 */
interface CAPMInputs {
    riskFreeRate: number;
    marketRiskPremium: number;
    beta: number;
    /** 动态Beta - 基于红蓝环境调整 */
    dynamicBeta: number;
    sizePremium: number;
    valuePremium: number;
    countryRiskPremium: number;
}

/** DCF现金流折现输入 */
interface DCFInputs {
    baseFCF: number;
    projectionYears: number;
    /** 分阶段增速 */
    growthRates: number[];
    terminalGrowth: number;
    wacc: number;
    /** 经营杠杆DOL */
    dol: number;
    /** 财务杠杆DFL */
    dfl: number;
    taxRate: number;
}

/** 相对估值输入 */
interface RelativeValuationInputs {
    pe: { current: number; industryMedian: number; historicalMedian: number };
    pb: { current: number; industryMedian: number; historicalMedian: number };
    ps: { current: number; industryMedian: number; historicalMedian: number };
    evEbitda: { current: number; industryMedian: number; historicalMedian: number };
    pegRatio: number;
}

/** 估值结果 */
interface ValuationResult {
    assetId: string;
    timestamp: Timestamp;
    regime: MarketRegime;
    currentPrice: number;

    /** WACC计算 */
    wacc: {
        costOfEquity: number;
        afterTaxCostOfDebt: number;
        wacc: number;
        details: {
            capm: CAPMInputs;
        };
    };

    /** DCF结果 */
    dcf: {
        intrinsicValue: number;
        terminalValue: number;
        projectedFCFs: number[];
        npv: number;
        irr: number;
        /** 敏感性分析矩阵 */
        sensitivityMatrix: Array<{
            waccChange: number;
            growthChange: number;
            value: number;
        }>;
        /** NPV为负标记 */
        npvNegative: boolean;
        /** IRR低于门槛 */
        irrBelowHurdle: boolean;
    };

    /** 相对估值结果 */
    relativeValuation: {
        peImpliedPrice: number;
        pbImpliedPrice: number;
        psImpliedPrice: number;
        evEbitdaImpliedPrice: number;
        /** 加权平均目标价 */
        blendedRelativeTarget: number;
    };

    /** 综合定价 */
    pricing: {
        /** 理论目标价区间（低位、中位、高位） */
        targetPriceRange: {
            bear: number;
            base: number;
            bull: number;
        };
        /** 预期收益率 */
        expectedReturn: number;
        /** 风险溢价 */
        riskPremium: number;
        /** 动态Beta（红蓝环境调整后） */
        dynamicBeta: number;
        /** 估值偏离度（当前价相对内在价值） */
        valuationGap: number;
        /** 信号方向：低估/高估/合理 */
        valuationSignal: SignalDirection;
        /** 安全边际 */
        marginOfSafety: number;
    };

    /** 估值风险信号 - 馈入RCB */
    valuationRisk: {
        coneC: number;
        zScore: number;
        mdd: number;
        npvNegative: boolean;
        irrBelowHurdle: boolean;
    };

    /** 估值假设记录 */
    assumptions: {
        dcf: DCFInputs;
        relative: RelativeValuationInputs;
        regimeAdjustments: {
            growthAdjustment: number;
            discountAdjustment: number;
        };
    };
}
```

---

### 2.5 Step 5-6: 决策推演与动态K线 (Sandbox &amp; Simulation)

```typescript
// ============================================================
// Step 5-6: 决策推演与动态K线
// ============================================================

/** 沙盘配置 */
interface SandboxConfig {
    regime: MarketRegime;
    /** 模拟天数 */
    simulationDays: number;
    /** 蒙特卡洛模拟次数 */
    monteCarloRuns: number;
    /** 初始资金 */
    initialCapital: number;
    /** 初始仓位 */
    initialPosition: number;
    /** 是否开启均值回归 */
    meanReversionEnabled: boolean;
    /** 均值回归强度 */
    meanReversionSpeed: number;
    /** 红蓝切换场景 */
    regimeSwitchScenario?: {
        switchDay: number;
        fromRegime: MarketRegime;
        toRegime: MarketRegime;
    };
}

/** 理论K线节点 */
interface TheoreticalKLineNode {
    day: number;
    date: Timestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    /** 圆锥浓度C值 */
    coneC: number;
    /** zScore */
    zScore: number;
    /** 游戏状态 */
    gameState: GameState;
    /** 引力中心 */
    gravityCenter: number;
    /** 仓位建议（熔断前） */
    suggestedPosition: number;
    /** 对冲需求 */
    hedgingRequired: number;
}

/** 蒙特卡洛单次路径结果 */
interface MonteCarloPath {
    pathId: number;
    finalValue: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    /** 触发熔断的天数 */
    fuseTriggeredDays: number;
    kLine: TheoreticalKLineNode[];
}

/** 压力测试场景 */
interface StressTestScenario {
    name: string;
    description: string;
    shockType: 'VOLATILITY_SPIKE' | 'REGIME_SWITCH' | 'LIQUIDITY_CRISIS' | 'EARNINGS_MISS' | 'BLACK_SWAN';
    shockMagnitude: number;
    probability: number;
}

/** 压力测试结果 */
interface StressTestResult {
    scenario: StressTestScenario;
    pnl: number;
    pnlPercent: number;
    maxDrawdown: number;
    recoveryDays: number;
    fuseTriggered: boolean;
    fuseReasons: string[];
}

/** 模拟结果 */
interface SimulationResult {
    simulationId: string;
    timestamp: Timestamp;
    config: SandboxConfig;
    assetId: string;
    valuation: ValuationResult;

    /** 基准K线（中位路径） */
    baselineKLine: TheoreticalKLineNode[];

    /** 蒙特卡洛结果 */
    monteCarlo: {
        runs: number;
        paths: MonteCarloPath[];
        statistics: {
            meanFinalValue: number;
            medianFinalValue: number;
            percentile5: number;
            percentile95: number;
            meanMaxDrawdown: number;
            meanSharpeRatio: number;
            /** 熔断触发概率 */
            fuseTriggerProbability: number;
        };
    };

    /** 压力测试 */
    stressTests: StressTestResult[];

    /** 三流分发沙盘结果 - 复用现有cone-game-theory */
    threeFlow: {
        paid: { allocation: number; phi: number; alpha: number; expectedReturn: number };
        content: { allocation: number; phi: number; alpha: number; expectedReturn: number };
        private: { allocation: number; phi: number; alpha: number; expectedReturn: number };
        blendedReturn: number;
    };

    /** 博弈场信号 - 馈入RCB */
    simulationRisk: {
        coneC: number;
        zScore: number;
        drawdown: number;
        mdd: number;
        gameState: GameState;
    };

    /** 推演建议 */
    sandboxRecommendation: {
        optimalEntryZone: { low: number; high: number };
        optimalExitZone: { low: number; high: number };
        stopLoss: number;
        takeProfit: number;
        recommendedPositionBeforeFuse: number;
        warningLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    };
}
```

---

### 2.6 Step 7: 德州扑克沙盘 · 人性压力测试

```typescript
// ============================================================
// Step 7: 德州扑克沙盘 · 人性压力测试
// ============================================================

/** 扑克牌 */
interface PokerCard {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';
    value: number;
}

/** 手牌强度 */
type HandStrength = 'TRASH' | 'WEAK' | 'MEDIUM' | 'STRONG' | 'MONSTER' | 'NUTS';

/** 牌局状态 */
interface PokerHandState {
    handId: string;
    stage: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
    holeCards: PokerCard[];
    communityCards: PokerCard[];
    potSize: number;
    currentBet: number;
    stackSize: number;
    opponentStack: number;
    /** 底池赔率 */
    potOdds: number;
    /** 胜率（GTO最优解） */
    gtoWinProbability: number;
    /** GTO最优决策 */
    gtoOptimalAction: 'FOLD' | 'CALL' | 'RAISE' | 'ALL_IN';
    /** GTO最优下注额 */
    gtoOptimalBet: number;
    /** 手牌强度 */
    handStrength: HandStrength;
}

/** 用户决策 */
interface UserPokerDecision {
    handId: string;
    action: 'FOLD' | 'CALL' | 'RAISE' | 'ALL_IN';
    betAmount: number;
    decisionTimeMs: number;
    timestamp: Timestamp;
    /** 手牌信息（用户知道的） */
    knownInfo: {
        holeCards: PokerCard[];
        communityCards: PokerCard[];
        potOdds: number;
        stackSize: number;
    };
}

/** 单局结果 */
interface PokerHandResult {
    handId: string;
    handState: PokerHandState;
    userDecision: UserPokerDecision;
    gtoDecision: { action: string; bet: number };
    /** 偏差分数 -1 到 1 */
    deviationScore: number;
    /** 是否情绪上头信号 */
    tiltSignal: boolean;
    /** 具体偏差类型 */
    biasType: 'OPTIMAL' | 'OVER_AGGRESSIVE' | 'TOO_PASSIVE' | 'CHASING_LOSSES' | 'TILT_FOLD' | 'TILT_ALLIN';
    won: boolean;
    pnl: number;
}

/** 理性指数 - 核心输出 */
interface RationalityScore {
    sessionId: string;
    timestamp: Timestamp;
    handsPlayed: number;
    hands: PokerHandResult[];

    /** 核心分数 */
    overallScore: number;           // 0-100，越高越理性
    rationalityState: RationalityState;

    /** 分项得分 */
    subScores: {
        gtoAlignment: number;       // GTO对齐度 0-100
        betSizingAccuracy: number;  // 下注尺度准确性 0-100
        decisionSpeed: number;      // 决策速度（太快=冲动，太慢=犹豫）0-100
        lossRecovery: number;       // 亏损后恢复能力 0-100
        varianceTolerance: number;  // 波动承受力（直接对应仓位调整）0-100
    };

    /** 情绪偏差量化 */
    biases: {
        overAggressionFactor: number;  // 过度攻击系数 0-2
        lossAversionFactor: number;    // 损失厌恶系数 0-2
        overconfidenceFactor: number;  // 过度自信系数 0-2
        chasingFactor: number;         // 追损倾向 0-2
        tiltLevel: number;             // 当前上头等级 0-1
    };

    /** 行为特征 */
    behavioralSignals: {
        /** 是否快速全押 */
        quickAllInCount: number;
        /** 是否追损（亏损后加注） */
        chasingLossesCount: number;
        /** 是否被bluff后情绪波动 */
        tiltAfterBluff: boolean;
        /** 是否连续弃牌过度保守 */
        passiveFoldStreak: number;
    };

    /** 仓位调整系数 - 直接给Step 8使用 */
    positionAdjustment: {
        /** 仓位乘数：极度理性=1.3，平衡=1.0，上头=0.5，极度上头=0 */
        kellyMultiplier: number;
        /** 对冲需求调整 */
        hedgingAdjustment: number;
        /** 是否触发"强制防御模式" */
        forceDefensiveMode: boolean;
        /** 风险资产上限 */
        riskAssetCap: number;
        /** 无风险资产配置建议 */
        riskFreeAllocation: number;
    };

    /** Tilt信号 - 馈入RCB */
    tiltSignals: {
        tiltLevel: number;  // 0-1，≥0.8熔断
        coneC: number;
        zScore: number;
    };
}
```

---

### 2.7 Step 8: 动态资产对冲与配置

```typescript
// ============================================================
// Step 8: 动态资产对冲与配置
// ============================================================

/** 行业对冲配置 */
interface HedgeInstrument {
    type: 'INDEX_FUTURE' | 'ETF_SHORT' | 'OPTION_PUT' | 'GOLD' | 'BOND' | 'INVERSE_ETF';
    ticker: string;
    name: string;
    /** 对冲比例（相对持仓市值） */
    hedgeRatio: number;
    /** 预期对冲成本 */
    cost: number;
    /** 对冲效率 */
    efficiency: number;
    /** 触发条件 */
    triggerCondition: string;
}

/** 资产配置 */
interface AssetAllocation {
    /** 核心风险资产 */
    riskAssets: Array<{
        assetId: string;
        weight: number;
        direction: TradeDirection;
        expectedReturn: number;
        contributionToRisk: number;
    }>;
    /** 对冲工具 */
    hedges: HedgeInstrument[];
    /** 无风险资产 */
    riskFreeAssets: {
        weight: number;
        instruments: string[];
        yield: number;
    };
    /** 现金储备 */
    cashReserve: number;
}

/** 最终执行指令 - 系统输出 */
interface ExecutionOrder {
    orderId: string;
    timestamp: Timestamp;
    assetId: string;
    regime: MarketRegime;

    /** 前置熔断检查结果 */
    fuseCheck: EnforcedPosition;

    /** 交易信号 */
    signal: {
        direction: TradeDirection;
        strength: number;  // 0-100
        confidence: number; // 0-100
        timeHorizon: 'INTRADAY' | 'SWING' | 'POSITION' | 'LONG_TERM';
    };

    /** 凯利仓位计算 */
    kelly: {
        /** 原始凯利建议（未熔断） */
        rawKelly: number;
        /** 熔断后实际仓位 */
        enforcedPosition: number;
        /** 半凯利/四凯利建议 */
        halfKelly: number;
        quarterKelly: number;
        /** 理性指数调整后仓位 */
        rationalityAdjusted: number;
        /** 最终建议仓位 */
        recommendedPosition: number;
    };

    /** 价格区间 */
    priceLevels: {
        entryZone: { low: number; high: number };
        stopLoss: number;
        takeProfit1: number;
        takeProfit2: number;
        takeProfit3: number;
        /** 目标价 */
        targetPrice: number;
        /** 风险回报比 */
        riskRewardRatio: number;
    };

    /** 资产配置 */
    allocation: AssetAllocation;

    /** 对冲方案 */
    hedgingPlan: {
        required: boolean;
        hedgeRatio: number;
        instruments: HedgeInstrument[];
        estimatedCost: number;
        defensiveMode: boolean;
    };

    /** 风控状态 */
    riskStatus: {
        halted: boolean;
        activeFuses: string[];
        gameState: GameState;
        rationalityState: RationalityState;
        warnings: string[];
    };

    /** 完整决策链追溯 */
    auditTrail: {
        macroFunnelId: string;
        factorLibraryId: string;
        valuationId: string;
        simulationId: string;
        pokerSessionId: string;
        stepsCompleted: number[];
    };
}
```

---

### 2.8 引擎总线接口 (Engine Bus)

```typescript
// ============================================================
// 量化引擎总线 - 协调所有模块
// ============================================================

interface YMineQuantEngine {
    /** 引擎版本 */
    version: '2.0.0';

    /** 模块引用 */
    modules: {
        macroFunnel: MacroFunnelModule;
        etl: ETLModule;
        pricingCore: PricingCoreModule;
        sandbox: SandboxModule;
        pokerTilt: PokerTiltModule;
        allocator: AllocationModule;
        circuitBreaker: RiskCircuitBreaker;
        regimeSwitcher: RegimeSwitcherModule;
    };

    /** 全局事件总线 */
    bus: YBus;

    /** 当前流水线状态 */
    pipeline: {
        currentStep: number;
        completedSteps: number[];
        results: Record<number, any>;
        startedAt: Timestamp;
        lastUpdatedAt: Timestamp;
    };

    /** 运行完整十步流程 */
    runFullPipeline(config: PipelineConfig): Promise&lt;ExecutionOrder&gt;;

    /** 运行到指定步骤 */
    runToStep(step: number, input?: any): Promise&lt;any&gt;;

    /** 重置流水线 */
    reset(): void;

    /** 手动紧急停机 */
    emergencyHalt(reason: string): void;
}

interface PipelineConfig {
    /** 初始标的（可选，不选则从Step0海选） */
    initialTicker?: string;
    /** 市场环境（不选则自动检测） */
    forceRegime?: MarketRegime;
    /** 模拟天数 */
    simulationDays: number;
    /** 扑克局数 */
    pokerHands: number;
    /** 风险偏好 */
    riskPreference: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    /** 是否自动使用半凯利 */
    useHalfKelly: boolean;
}
```

---

## 三、模块接口契约（Module Interfaces）

```typescript
// ============================================================
// 每个模块必须实现的标准接口
// ============================================================

interface IQuantModule&lt;Input, Output&gt; {
    /** 模块ID */
    readonly moduleId: string;
    /** 模块名称 */
    readonly moduleName: string;
    /** 所属步骤 */
    readonly step: number | number[];
    /** 版本 */
    readonly version: string;

    /** 执行模块逻辑 */
    execute(input: Input, context: PipelineContext): Promise&lt;Output&gt;;

    /** 验证输入 */
    validate(input: Input): ValidationResult;

    /** 获取模块状态 */
    getState(): ModuleState;

    /** 重置模块 */
    reset(): void;
}

interface PipelineContext {
    /** 当前环境 */
    regime: MarketRegime;
    /** 全局配置 */
    config: PipelineConfig;
    /** 上游模块结果 */
    previousResults: Record&lt;number, any&gt;;
    /** 风控熔断引用 */
    circuitBreaker: RiskCircuitBreaker;
    /** 事件总线 */
    bus: YBus;
    /** 流水线ID */
    pipelineId: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

interface ModuleState {
    status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'HALTED';
    lastRunAt?: Timestamp;
    error?: string;
    metrics?: Record&lt;string, number&gt;;
}
```

---

## 四、数据流向总结表

| 步骤 | 模块 | 输入 | 输出 | 馈入RCB信号 |
|------|------|------|------|-------------|
| 0 | MacroFunnel | MacroIndicator, RegimeConfig | ScreenedUniverse | coneC, zScore, mdd |
| 1-2 | ETL | ScreenedAsset, UnstructuredData, StructuredFinancials | FactorLibrary | riskFactors全集 |
| 3-4 | PricingCore | FactorLibrary, RegimeConfig | ValuationResult | npvNegative, irrBelowHurdle, coneC, zScore |
| 5-6 | Sandbox | ValuationResult, SandboxConfig | SimulationResult | gameState, coneC, zScore, drawdown |
| 7 | PokerTilt | SimulationResult, PokerConfig | RationalityScore | tiltLevel, coneC, zScore |
| 8 | Allocator | SimulationResult, RationalityScore, RCB状态 | ExecutionOrder | preTradeCheck（最终校验） |

---

## 五、风控熔断嵌入点

在十步闭环的每个关键节点，必须强制执行RCB检查：

1. **Step 0 海选后**：宏观环境异常（VIX&gt;30、zScore&gt;2σ）→ 限制标的池数量
2. **Step 2 ETL后**：风险因子触发 → 在FactorLibrary中标记fuseWarnings
3. **Step 4 定价后**：NPV为负、IRR低于门槛 → 触发估值类熔断
4. **Step 6 模拟后**：C≥0.68、MDD≥50% → 触发模拟类熔断
5. **Step 7 扑克测试后**：tiltLevel≥0.8 → 触发情绪熔断
6. **Step 8 执行前**：**最终强制门控**，任何熔断触发→actual=0，不可绕过

**核心铁律：第8步输出给交易执行层的仓位，必须是YMineRiskCB.enforce()返回的actual值，绝对不允许使用requested值。**
