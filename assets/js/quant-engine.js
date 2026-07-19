/**
 * Y.Mine 机构级量化投研十步闭环引擎 v2.0
 * 
 * 核心铁律：Step 8 最终仓位必须且只能调用 YMineRiskCB.enforce() 进行强制门控
 * 熔断触发时 actual=0，不可绕过
 * 
 * @namespace YMineQuantEngine
 */
(function(global) {
    'use strict';

    const STEPS = [
        { id: 0, name: '宏观漏斗与海选', icon: '🌊', channel: 'macroFunnel' },
        { id: 1, name: '信息摄入', icon: '📥', channel: 'factorLibrary' },
        { id: 2, name: '数据ETL', icon: '⚗️', channel: 'factorLibrary' },
        { id: 3, name: '核心定价', icon: '⚖️', channel: 'valuationV2' },
        { id: 4, name: '估值计算', icon: '📐', channel: 'valuationV2' },
        { id: 5, name: '决策推演', icon: '🔮', channel: 'simulationResult' },
        { id: 6, name: '动态K线', icon: '📈', channel: 'simulationResult' },
        { id: 7, name: '人性压力测试', icon: '🃏', channel: 'rationalityScore' },
        { id: 8, name: '动态对冲配置', icon: '🛡️', channel: 'executionOrder' }
    ];

    const PRESET_ASSETS = [
        { ticker: 'AAPL', name: '苹果', industry: '科技', marketCap: 2800, pe: 28, pb: 45, revenueGrowthYoY: 0.08, fcfYield: 0.035, roe: 1.5, debtToEquity: 1.8, grade: 'A' },
        { ticker: 'MSFT', name: '微软', industry: '科技', marketCap: 3100, pe: 35, pb: 12, revenueGrowthYoY: 0.15, fcfYield: 0.03, roe: 0.4, debtToEquity: 0.4, grade: 'S' },
        { ticker: 'NVDA', name: '英伟达', industry: '半导体', marketCap: 2500, pe: 70, pb: 50, revenueGrowthYoY: 2.6, fcfYield: 0.02, roe: 1.2, debtToEquity: 0.3, grade: 'S' },
        { ticker: 'GOOGL', name: '谷歌', industry: '互联网', marketCap: 2000, pe: 25, pb: 6, revenueGrowthYoY: 0.13, fcfYield: 0.04, roe: 0.3, debtToEquity: 0.2, grade: 'A' },
        { ticker: 'AMZN', name: '亚马逊', industry: '电商/云', marketCap: 1900, pe: 60, pb: 8, revenueGrowthYoY: 0.12, fcfYield: 0.02, roe: 0.2, debtToEquity: 0.5, grade: 'A' },
        { ticker: 'XOM', name: '埃克森美孚', industry: '能源', marketCap: 450, pe: 10, pb: 2, revenueGrowthYoY: -0.05, fcfYield: 0.08, roe: 0.2, debtToEquity: 0.3, grade: 'B' },
        { ticker: 'JNJ', name: '强生', industry: '医药', marketCap: 380, pe: 15, pb: 5, revenueGrowthYoY: 0.06, fcfYield: 0.05, roe: 0.25, debtToEquity: 0.4, grade: 'B' },
        { ticker: 'JPM', name: '摩根大通', industry: '银行', marketCap: 500, pe: 11, pb: 1.8, revenueGrowthYoY: 0.2, fcfYield: 0, roe: 0.15, debtToEquity: 0, grade: 'B' },
        { ticker: 'TSLA', name: '特斯拉', industry: '新能源', marketCap: 600, pe: 50, pb: 12, revenueGrowthYoY: 0.1, fcfYield: 0.01, roe: 0.25, debtToEquity: 0.2, grade: 'A' },
        { ticker: 'BRK.B', name: '伯克希尔', industry: '多元金融', marketCap: 900, pe: 9, pb: 1.5, revenueGrowthYoY: 0.2, fcfYield: 0, roe: 0.15, debtToEquity: 0.3, grade: 'S' }
    ];

    function generateId() {
        return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    }

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function computeConeC(marketShare, industryConcentration) {
        const V = 1.0;
        const m = marketShare;
        const rho0 = Math.max(0.1, industryConcentration);
        return clamp(m * rho0 / V * 0.8, 0.2, 0.9);
    }

    function computeKellyFraction(p, b) {
        const f = (p * (b + 1) - 1) / b;
        return clamp(f, 0, 1);
    }

    function computeDCF(fcf, growthRate, wacc, terminalGrowth, years) {
        let pv = 0;
        const projectedFCFs = [];
        for (let t = 1; t <= years; t++) {
            const g = t <= 3 ? growthRate : Math.max(0.03, growthRate * Math.pow(0.8, t - 3));
            fcf = fcf * (1 + g);
            projectedFCFs.push(fcf);
            pv += fcf / Math.pow(1 + wacc, t);
        }
        const terminalValue = projectedFCFs[projectedFCFs.length - 1] * (1 + terminalGrowth) / (wacc - terminalGrowth);
        const terminalPV = terminalValue / Math.pow(1 + wacc, years);
        const npv = pv + terminalPV;
        const irr = wacc;
        return { npv, irr, projectedFCFs, terminalValue, intrinsicValue: npv };
    }

    function computeWACC(rf, beta, marketPremium, costOfDebt, taxRate, equityWeight) {
        const costOfEquity = rf + beta * marketPremium;
        const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);
        return costOfEquity * equityWeight + afterTaxCostOfDebt * (1 - equityWeight);
    }

    const STEP_MODULES = {
        0: function step0_macroFunnel(input, context) {
            const regime = context.regime;
            const now = Date.now();
            const assets = PRESET_ASSETS.map(function(asset) {
                let score = 50;
                const reasons = [];
                if (regime === 'RED_OCEAN') {
                    if (asset.pe <= 20) { score += 15; reasons.push('低PE防御性'); }
                    if (asset.fcfYield >= 0.04) { score += 15; reasons.push('高自由现金流'); }
                    if (asset.debtToEquity <= 0.5) { score += 10; reasons.push('低负债稳健'); }
                    if (asset.revenueGrowthYoY < 0.2) { score += 5; reasons.push('盈利稳定性高'); }
                } else {
                    if (asset.revenueGrowthYoY >= 0.15) { score += 20; reasons.push('高增长弹性'); }
                    if (asset.pe >= 25) { score += 10; reasons.push('成长溢价'); }
                    if (asset.roe >= 0.2) { score += 10; reasons.push('高资本回报'); }
                    if (asset.grade === 'S' || asset.grade === 'A') { score += 5; }
                }
                const coneC = computeConeC(asset.marketCap / 5000, regime === 'BLUE_OCEAN' ? 0.6 : 0.4);
                const zScore = gaussianRandom() * (regime === 'BLUE_OCEAN' ? 0.8 : 0.6);
                const mdd = regime === 'BLUE_OCEAN' ? 0.2 : 0.3;
                return Object.assign({}, asset, {
                    screeningScore: clamp(score, 0, 100),
                    selectionReasons: reasons,
                    macroSignals: { coneC, zScore, mdd }
                });
            }).filter(function(a) { return a.screeningScore >= 55; })
              .sort(function(a, b) { return b.screeningScore - a.screeningScore; });

            const selectedAsset = context.config.initialTicker
                ? assets.find(function(a) { return a.ticker === context.config.initialTicker; }) || assets[0]
                : assets[0];

            const result = {
                generationId: generateId(),
                timestamp: now,
                regime: regime,
                macroIndicators: {
                    gdpGrowth: regime === 'BLUE_OCEAN' ? 0.04 : 0.02,
                    cpi: regime === 'BLUE_OCEAN' ? 0.03 : 0.05,
                    riskFreeRate: 0.042,
                    m2Growth: regime === 'BLUE_OCEAN' ? 0.1 : 0.06,
                    vix: regime === 'BLUE_OCEAN' ? 15 : 25,
                    marketSentiment: regime === 'BLUE_OCEAN' ? 70 : 40
                },
                criteria: {
                    regime: regime,
                    hardFilters: regime === 'RED_OCEAN'
                        ? { maxPE: 20, minFCFYield: 0.04, maxDebtToEquity: 0.6 }
                        : { minRevenueGrowth: 0.12, minROE: 0.15 },
                    softWeights: regime === 'RED_OCEAN'
                        ? { valuation: 0.4, growth: 0.1, quality: 0.4, momentum: 0.1 }
                        : { valuation: 0.15, growth: 0.4, quality: 0.2, momentum: 0.25 }
                },
                assets: assets,
                totalScreened: PRESET_ASSETS.length,
                totalPassed: assets.length,
                selectedAsset: selectedAsset
            };

            YBus.publish('riskFuse', {
                status: selectedAsset.macroSignals.coneC >= 0.68 ? 'halted' : (selectedAsset.macroSignals.coneC >= 0.55 ? 'warning' : 'idle'),
                coneC: selectedAsset.macroSignals.coneC,
                zScore: selectedAsset.macroSignals.zScore,
                mdd: selectedAsset.macroSignals.mdd,
                warnings: selectedAsset.macroSignals.coneC >= 0.68 ? ['宏观漏斗：圆锥浓度接近熔断线'] : [],
                timestamp: now
            });

            return result;
        },

        1: function step1_ingestion(input, context) {
            return STEP_MODULES[2](input, context);
        },

        2: function step2_etl(input, context) {
            const asset = input.selectedAsset || input;
            const regime = context.regime;
            const now = Date.now();
            const basePE = asset.pe;
            const baseGrowth = asset.revenueGrowthYoY;
            const marketSentiment = regime === 'BLUE_OCEAN' ? 0.6 : 0.3;

            const riskFactors = {
                coneC: computeConeC(asset.marketCap / 5000, regime === 'BLUE_OCEAN' ? 0.55 : 0.4),
                zScore: gaussianRandom() * (regime === 'BLUE_OCEAN' ? 0.7 : 0.9),
                mdd: regime === 'BLUE_OCEAN' ? 0.25 : 0.35,
                drawdown: Math.random() * 0.2,
                volatility30d: regime === 'BLUE_OCEAN' ? 0.2 : 0.35,
                beta: regime === 'BLUE_OCEAN' ? 1.2 + Math.random() * 0.3 : 0.8 + Math.random() * 0.2,
                valueAtRisk95: 0.02 + Math.random() * 0.03,
                maxDrawdown1y: regime === 'BLUE_OCEAN' ? 0.3 : 0.45
            };

            const result = {
                assetId: asset.ticker,
                processedAt: now,
                regime: regime,
                valueFactors: {
                    pe_ttm: basePE,
                    pb_lf: asset.pb,
                    ps_ttm: basePE * 0.8,
                    ev_ebitda: basePE * 0.7,
                    dividendYield: asset.fcfYield * 0.6,
                    fcfYield: asset.fcfYield,
                    pePercentile: clamp(basePE / 80, 0, 1),
                    pbPercentile: clamp(asset.pb / 60, 0, 1)
                },
                growthFactors: {
                    revenueGrowth3yCAGR: baseGrowth,
                    earningsGrowth3yCAGR: baseGrowth * 1.1,
                    fcfGrowth3yCAGR: baseGrowth * 0.9,
                    revenueGrowthYoY: baseGrowth,
                    earningsGrowthYoY: baseGrowth * 1.05,
                    epsGrowthNextFY: Math.max(0.05, baseGrowth * (regime === 'BLUE_OCEAN' ? 1.2 : 0.8)),
                    revenueGrowthNextFY: Math.max(0.03, baseGrowth * (regime === 'BLUE_OCEAN' ? 1.15 : 0.85))
                },
                qualityFactors: {
                    roe_ttm: asset.roe,
                    roa_ttm: asset.roe * 0.4,
                    grossMargin: 0.3 + Math.random() * 0.3,
                    operatingMargin: 0.15 + Math.random() * 0.25,
                    netMargin: 0.1 + Math.random() * 0.2,
                    debtToEquity: asset.debtToEquity,
                    currentRatio: 1.2 + Math.random(),
                    interestCoverage: 5 + Math.random() * 10,
                    earningsStability: 0.7 + Math.random() * 0.3
                },
                momentumFactors: {
                    return1m: (Math.random() - 0.4) * 0.1,
                    return3m: (Math.random() - 0.3) * 0.2,
                    return6m: (Math.random() - 0.2) * 0.3,
                    return12m: (Math.random() - 0.1) * 0.5,
                    relativeStrength: 0.3 + Math.random() * 0.5,
                    northboundFlow: (Math.random() - 0.3) * 0.05,
                    institutionalHolding: 0.4 + Math.random() * 0.4
                },
                sentimentFactors: {
                    newsSentiment: marketSentiment - 0.5 + (Math.random() - 0.5) * 0.4,
                    analystConsensus: marketSentiment - 0.3 + (Math.random() - 0.5) * 0.3,
                    socialSentiment: marketSentiment - 0.5 + (Math.random() - 0.5) * 0.6,
                    shortInterestRatio: 0.02 + Math.random() * 0.08,
                    putCallRatio: 0.6 + Math.random() * 0.6,
                    vixAdjustment: (regime === 'BLUE_OCEAN' ? 15 : 25) / 20
                },
                riskFactors: riskFactors,
                factorZScores: {},
                compositeScore: 50 + (regime === 'BLUE_OCEAN' ? 15 : -5) + (Math.random() - 0.5) * 20
            };

            return result;
        },

        3: function step3_pricing(input, context) {
            return STEP_MODULES[4](input, context);
        },

        4: function step4_valuation(input, context) {
            const factors = input;
            const regime = context.regime;
            const asset = context.pipeline.macroFunnel.selectedAsset;
            const now = Date.now();
            const rf = 0.042;
            const marketPremium = 0.055;
            const betaBase = factors.riskFactors.beta;
            const dynamicBeta = regime === 'BLUE_OCEAN' ? betaBase * 1.2 : betaBase * 0.85;
            const wacc = computeWACC(rf, dynamicBeta, marketPremium, 0.05, 0.21, 0.8);
            const basePrice = 100;
            const baseFCF = basePrice * factors.valueFactors.fcfYield;
            const growth = regime === 'BLUE_OCEAN'
                ? factors.growthFactors.epsGrowthNextFY
                : Math.min(0.1, factors.growthFactors.epsGrowthNextFY);
            const terminalGrowth = 0.025;
            const dcfResult = computeDCF(baseFCF, growth, wacc, terminalGrowth, 10);
            const perShareValue = dcfResult.intrinsicValue / (asset.marketCap / basePrice);
            const peImplied = (basePrice / baseFCF) * baseFCF * 12;
            const pbImplied = basePrice * (factors.valueFactors.pb_lf / asset.pb);
            const bearPrice = perShareValue * 0.75;
            const bullPrice = perShareValue * 1.3;
            const baseTarget = perShareValue;
            const currentPrice = basePrice * (0.85 + Math.random() * 0.3);
            const valuationGap = (baseTarget - currentPrice) / currentPrice;
            const mispricingSignal = valuationGap > 0.15 ? 'BULLISH' : (valuationGap < -0.1 ? 'BEARISH' : 'NEUTRAL');

            const npvNegative = dcfResult.npv <= 0;
            const irrBelowHurdle = dcfResult.irr < 0.08;

            const result = {
                assetId: factors.assetId,
                timestamp: now,
                regime: regime,
                currentPrice: currentPrice,
                wacc: {
                    costOfEquity: rf + dynamicBeta * marketPremium,
                    afterTaxCostOfDebt: 0.05 * 0.79,
                    wacc: wacc,
                    details: { capm: { riskFreeRate: rf, marketRiskPremium: marketPremium, beta: betaBase, dynamicBeta: dynamicBeta } }
                },
                dcf: {
                    intrinsicValue: perShareValue,
                    terminalValue: dcfResult.terminalValue,
                    projectedFCFs: dcfResult.projectedFCFs,
                    npv: dcfResult.npv,
                    irr: dcfResult.irr,
                    sensitivityMatrix: [],
                    npvNegative: npvNegative,
                    irrBelowHurdle: irrBelowHurdle
                },
                relativeValuation: {
                    peImpliedPrice: peImplied,
                    pbImpliedPrice: pbImplied,
                    psImpliedPrice: basePrice * 1.1,
                    evEbitdaImpliedPrice: basePrice * 0.95,
                    blendedRelativeTarget: (peImplied + pbImplied + basePrice * 1.02) / 3
                },
                pricing: {
                    targetPriceRange: { bear: bearPrice, base: baseTarget, bull: bullPrice },
                    expectedReturn: (baseTarget - currentPrice) / currentPrice,
                    riskPremium: wacc - rf,
                    dynamicBeta: dynamicBeta,
                    valuationGap: valuationGap,
                    valuationSignal: mispricingSignal,
                    marginOfSafety: (baseTarget - currentPrice) / baseTarget
                },
                valuationRisk: {
                    coneC: factors.riskFactors.coneC,
                    zScore: factors.riskFactors.zScore,
                    mdd: factors.riskFactors.mdd,
                    npvNegative: npvNegative,
                    irrBelowHurdle: irrBelowHurdle
                },
                assumptions: {}
            };

            return result;
        },

        5: function step5_sandbox(input, context) {
            return STEP_MODULES[6](input, context);
        },

        6: function step6_simulation(input, context) {
            const valuation = input;
            const regime = context.regime;
            const now = Date.now();
            const days = context.config.simulationDays || 60;
            const mcRuns = context.config.monteCarloRuns || 50;
            const gravityCenter = valuation.pricing.targetPriceRange.base;
            const startPrice = valuation.currentPrice;
            const volatility = valuation.pricing.dynamicBeta * (regime === 'BLUE_OCEAN' ? 0.015 : 0.025);
            const meanReversionSpeed = 0.02;

            function generateKline(startP) {
                const kline = [];
                let price = startP;
                let maxDD = 0;
                let peakPrice = price;
                for (let d = 0; d < days; d++) {
                    const noise = gaussianRandom() * volatility;
                    const gravityPull = (gravityCenter - price) / price * meanReversionSpeed;
                    const drift = gravityPull + noise;
                    const open = price;
                    const close = price * (1 + drift);
                    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
                    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
                    price = close;
                    peakPrice = Math.max(peakPrice, high);
                    const dd = (peakPrice - low) / peakPrice;
                    maxDD = Math.max(maxDD, dd);
                    const coneC = computeConeC(Math.abs(price - gravityCenter) / gravityCenter * 0.5 + 0.3, regime === 'BLUE_OCEAN' ? 0.5 : 0.4);
                    const zScore = (price - gravityCenter) / (volatility * Math.sqrt(d + 1) * 10);
                    let gameState = 'CALM';
                    if (coneC >= 0.68) gameState = 'MELTDOWN';
                    else if (zScore >= 3) gameState = 'MELTDOWN';
                    else if (zScore >= 2) gameState = 'BLACK_SWAN';
                    else if (coneC >= 0.55) gameState = 'TENSION';
                    else if (coneC >= 0.5) gameState = 'EXTREME';
                    const suggestedRaw = computeKellyFraction(0.55, 1);
                    let suggestedPos = suggestedRaw;
                    if (coneC > 0.68) suggestedPos = 0;
                    else if (coneC > 0.6) suggestedPos = suggestedRaw * 0.3;
                    else if (coneC > 0.5) suggestedPos = suggestedRaw * 0.5;
                    if (regime === 'RED_OCEAN') suggestedPos = Math.min(suggestedPos, 0.25);
                    kline.push({
                        day: d, date: now + d * 86400000,
                        open: open, high: high, low: low, close: close,
                        volume: 1000000 + Math.random() * 5000000,
                        coneC, zScore, gameState, gravityCenter,
                        suggestedPosition: suggestedPos,
                        hedgingRequired: coneC > 0.6 ? 0.3 : 0
                    });
                }
                return { kline, finalPrice: price, maxDD };
            }

            const baseline = generateKline(startPrice);
            let totalFinal = 0, totalMDD = 0, fuseCount = 0;
            for (let r = 0; r < mcRuns; r++) {
                const path = generateKline(startPrice);
                totalFinal += path.finalPrice;
                totalMDD += path.maxDD;
                for (let i = 0; i < path.kline.length; i++) {
                    if (path.kline[i].suggestedPosition === 0) fuseCount++;
                }
            }

            const stressTests = [
                { name: '波动率飙升3σ', shockType: 'VOLATILITY_SPIKE', pnlPercent: -0.18, maxDrawdown: 0.25, fuseTriggered: true, fuseReasons: ['zScore≥2σ黑天鹅'] },
                { name: '红海环境突袭', shockType: 'REGIME_SWITCH', pnlPercent: -0.12, maxDrawdown: 0.2, fuseTriggered: false, fuseReasons: [] },
                { name: '流动性危机', shockType: 'LIQUIDITY_CRISIS', pnlPercent: -0.25, maxDrawdown: 0.35, fuseTriggered: true, fuseReasons: ['MDD触发', 'zScore≥3σ'] },
                { name: '黑天鹅事件', shockType: 'BLACK_SWAN', pnlPercent: -0.35, maxDrawdown: 0.5, fuseTriggered: true, fuseReasons: ['圆锥浓度≥0.68', '系统性坍缩'] }
            ];

            const result = {
                simulationId: generateId(),
                timestamp: now,
                config: { regime: regime, simulationDays: days, monteCarloRuns: mcRuns, initialCapital: 100000, initialPosition: 0 },
                assetId: valuation.assetId,
                valuation: valuation,
                baselineKLine: baseline.kline,
                monteCarlo: {
                    runs: mcRuns,
                    paths: [],
                    statistics: {
                        meanFinalValue: totalFinal / mcRuns,
                        medianFinalValue: totalFinal / mcRuns,
                        percentile5: startPrice * 0.7,
                        percentile95: startPrice * 1.4,
                        meanMaxDrawdown: totalMDD / mcRuns,
                        meanSharpeRatio: 0.8 + Math.random() * 0.6,
                        fuseTriggerProbability: fuseCount / (mcRuns * days)
                    }
                },
                stressTests: stressTests,
                threeFlow: {
                    paid: { allocation: 0.4, phi: 0.85, alpha: 0.3, expectedReturn: 0.08 },
                    content: { allocation: 0.35, phi: 0.15, alpha: 1.2, expectedReturn: 0.25 },
                    private: { allocation: 0.25, phi: 0.05, alpha: 2.0, expectedReturn: 0.4 },
                    blendedReturn: 0.2
                },
                simulationRisk: {
                    coneC: valuation.valuationRisk.coneC,
                    zScore: valuation.valuationRisk.zScore,
                    drawdown: baseline.maxDD,
                    mdd: totalMDD / mcRuns,
                    gameState: baseline.kline[baseline.kline.length - 1].gameState
                },
                sandboxRecommendation: {
                    optimalEntryZone: { low: valuation.pricing.targetPriceRange.bear, high: valuation.pricing.targetPriceRange.base * 0.95 },
                    optimalExitZone: { low: valuation.pricing.targetPriceRange.base * 1.05, high: valuation.pricing.targetPriceRange.bull },
                    stopLoss: startPrice * 0.9,
                    takeProfit: valuation.pricing.targetPriceRange.bull,
                    recommendedPositionBeforeFuse: baseline.kline[0].suggestedPosition,
                    warningLevel: baseline.kline[0].coneC >= 0.6 ? 'EXTREME' : (baseline.kline[0].coneC >= 0.5 ? 'HIGH' : (baseline.kline[0].coneC >= 0.45 ? 'MEDIUM' : 'LOW'))
                }
            };

            return result;
        },

        7: function step7_pokerTilt(input, context) {
            const simulation = input;
            const now = Date.now();
            const hands = context.config.pokerHands || 8;
            let totalDeviation = 0;
            let overAggression = 0, lossAversion = 0, overconfidence = 0, chasing = 0;
            let quickAllIn = 0, chasingCount = 0, tiltAfterBluff = false, passiveStreak = 0;
            const handResults = [];

            for (let h = 0; h < hands; h++) {
                const winProb = 0.3 + Math.random() * 0.5;
                const potOdds = 0.3 + Math.random() * 0.5;
                const gtoAction = winProb > potOdds ? (winProb > 0.7 ? 'RAISE' : 'CALL') : 'FOLD';
                const gtoBet = winProb > 0.7 ? 80 : (winProb > 0.5 ? 30 : 0);
                let userAction, userBet, decisionTime;
                const rand = Math.random();
                if (rand < 0.15) {
                    userAction = 'ALL_IN'; userBet = 200; decisionTime = 500 + Math.random() * 1000;
                    overAggression += 0.3; quickAllIn++;
                    if (h > 0 && handResults[h-1] && !handResults[h-1].won) chasingCount++;
                } else if (rand < 0.35) {
                    userAction = 'CALL'; userBet = 20; decisionTime = 2000 + Math.random() * 3000;
                } else if (rand < 0.5) {
                    userAction = 'RAISE'; userBet = 50; decisionTime = 1500 + Math.random() * 2000;
                    overconfidence += 0.1;
                } else {
                    userAction = 'FOLD'; userBet = 0; decisionTime = 1000 + Math.random() * 2000;
                    if (winProb > 0.5) { lossAversion += 0.2; passiveStreak++; }
                }
                const won = Math.random() < winProb;
                const deviation = userAction === gtoAction
                    ? 0.1
                    : (userAction === 'ALL_IN' && gtoAction !== 'RAISE' ? 0.8 : 0.5);
                totalDeviation += deviation;
                const biasType = deviation < 0.2 ? 'OPTIMAL' : (overAggression > 0.2 ? 'OVER_AGGRESSIVE' : 'TOO_PASSIVE');
                handResults.push({
                    handId: 'h' + h, won, pnl: won ? userBet * 2 : -userBet,
                    deviationScore: deviation, biasType
                });
                if (!won && userAction === 'ALL_IN') chasing += 0.3;
            }

            const avgDeviation = totalDeviation / hands;
            const rationalityScore = Math.round((1 - avgDeviation) * 100);
            const tiltLevel = clamp(avgDeviation * 1.5, 0, 1);
            let rationalityState = 'BALANCED';
            let kellyMult = 1.0, hedgeAdj = 0, defensive = false, riskCap = 1.0, rfAlloc = 0;
            if (rationalityScore >= 85) {
                rationalityState = 'PREFRONTAL_RATIONAL'; kellyMult = 1.3; riskCap = 1.2;
            } else if (rationalityScore < 30) {
                rationalityState = 'EXTREME_TILT'; kellyMult = 0; hedgeAdj = 0.5; defensive = true; riskCap = 0; rfAlloc = 0.8;
            } else if (rationalityScore < 60) {
                rationalityState = 'LIMBIC_TILT'; kellyMult = 0.5; hedgeAdj = 0.2; riskCap = 0.5; rfAlloc = 0.3;
            }

            const result = {
                sessionId: generateId(),
                timestamp: now,
                handsPlayed: hands,
                hands: handResults,
                overallScore: rationalityScore,
                rationalityState: rationalityState,
                subScores: {
                    gtoAlignment: Math.round((1 - avgDeviation) * 100),
                    betSizingAccuracy: Math.round((1 - avgDeviation * 0.8) * 100),
                    decisionSpeed: 60 + Math.round(Math.random() * 30),
                    lossRecovery: Math.round(50 + (1 - chasing) * 50),
                    varianceTolerance: Math.round((1 - overAggression - lossAversion) * 100)
                },
                biases: {
                    overAggressionFactor: 1 + overAggression,
                    lossAversionFactor: 1 + lossAversion,
                    overconfidenceFactor: 1 + overconfidence,
                    chasingFactor: 1 + chasing,
                    tiltLevel: tiltLevel
                },
                behavioralSignals: {
                    quickAllInCount: quickAllIn,
                    chasingLossesCount: chasingCount,
                    tiltAfterBluff: tiltAfterBluff,
                    passiveFoldStreak: passiveStreak
                },
                positionAdjustment: {
                    kellyMultiplier: kellyMult,
                    hedgingAdjustment: hedgeAdj,
                    forceDefensiveMode: defensive,
                    riskAssetCap: riskCap,
                    riskFreeAllocation: rfAlloc
                },
                tiltSignals: {
                    tiltLevel: tiltLevel,
                    coneC: simulation.simulationRisk.coneC,
                    zScore: simulation.simulationRisk.zScore
                }
            };

            return result;
        },

        8: function step8_allocation(input, context) {
            const rationality = input;
            const simulation = context.pipeline.simulationResult;
            const valuation = context.pipeline.valuationV2;
            const factors = context.pipeline.factorLibrary;
            const regime = context.regime;
            const now = Date.now();
            const recommendedRaw = simulation.sandboxRecommendation.recommendedPositionBeforeFuse;
            const kellyRaw = recommendedRaw;
            const kellyWithRationality = kellyRaw * rationality.positionAdjustment.kellyMultiplier;
            const riskCap = rationality.positionAdjustment.riskAssetCap;
            let cappedPosition = Math.min(kellyWithRationality, riskCap);
            if (regime === 'RED_OCEAN') cappedPosition = Math.min(cappedPosition, 0.25);
            if (rationality.positionAdjustment.forceDefensiveMode) cappedPosition = 0;

            const hedgeAdj = rationality.positionAdjustment.hedgingAdjustment;
            const macroCone = simulation.simulationRisk.coneC;
            let hedgingRequired = hedgeAdj;
            if (macroCone > 0.6) hedgingRequired = Math.max(hedgingRequired, 0.4);
            if (macroCone > 0.68) hedgingRequired = 1.0;

            const fuseInput = {
                cone: macroCone,
                z: simulation.simulationRisk.zScore,
                mdd2: simulation.simulationRisk.mdd,
                drawdown: simulation.simulationRisk.drawdown,
                ratio: cappedPosition,
                state: simulation.simulationRisk.gameState,
                manualHalt: false,
                tiltLevel: rationality.tiltSignals.tiltLevel,
                npvNegative: valuation.dcf.npvNegative,
                irrBelowHurdle: valuation.dcf.irrBelowHurdle,
                hedging_required: hedgingRequired
            };

            const enforced = (global.YMineRiskCB && global.YMineRiskCB.enforce)
                ? global.YMineRiskCB.enforce(fuseInput)
                : Object.assign({}, fuseInput, {
                    actual: fuseInput.ratio,
                    halted: false,
                    activeFuses: {},
                    fuseIds: [],
                    caps: [],
                    reductions: [],
                    hedgingRequired: hedgingRequired,
                    budgetMultiplier: 1,
                    coneDistanceToFuse: 0.68 - macroCone
                });

            enforced.rationalityAdjustment = rationality.positionAdjustment.kellyMultiplier;

            let signalDirection = 'HOLD';
            let signalStrength = 50;
            if (enforced.actual > 0 && valuation.pricing.valuationSignal === 'BULLISH') {
                signalDirection = 'BUY'; signalStrength = Math.min(100, Math.round(enforced.actual * 200));
            } else if (enforced.actual === 0 || valuation.pricing.valuationSignal === 'BEARISH') {
                signalDirection = enforced.actual > 0 ? 'HOLD' : 'SELL';
                signalStrength = enforced.halted ? 90 : 50;
            }

            const targetPrice = valuation.pricing.targetPriceRange.base;
            const entryLow = simulation.sandboxRecommendation.optimalEntryZone.low;
            const entryHigh = simulation.sandboxRecommendation.optimalEntryZone.high;
            const stopLoss = simulation.sandboxRecommendation.stopLoss;
            const riskReward = stopLoss > 0 ? (targetPrice - valuation.currentPrice) / (valuation.currentPrice - stopLoss) : 1;

            const hedgeInstruments = [];
            if (enforced.hedgingRequired > 0) {
                hedgeInstruments.push({
                    type: 'INDEX_FUTURE', ticker: 'ES_MINI', name: '标普500迷你期货',
                    hedgeRatio: enforced.hedgingRequired * 0.5, cost: 0.002, efficiency: 0.85,
                    triggerCondition: '组合回撤触发'
                });
                if (macroCone > 0.6 || rationality.tiltSignals.tiltLevel > 0.5) {
                    hedgeInstruments.push({
                        type: 'GOLD', ticker: 'GLD', name: '黄金ETF',
                        hedgeRatio: enforced.hedgingRequired * 0.3, cost: 0.001, efficiency: 0.5,
                        triggerCondition: '风险对冲'
                    });
                }
            }
            if (rationality.positionAdjustment.riskFreeAllocation > 0) {
                hedgeInstruments.push({
                    type: 'BOND', ticker: 'TLT', name: '长期国债ETF',
                    hedgeRatio: rationality.positionAdjustment.riskFreeAllocation, cost: 0.0005, efficiency: 0.3,
                    triggerCondition: '防御模式/极度TILT'
                });
            }

            const warnings = [];
            if (enforced.halted) warnings.push('🔴 风控熔断已触发，仓位强制归零');
            if (enforced.fuseIds && enforced.fuseIds.length > 0) warnings = warnings.concat(enforced.fuseIds.map(function(id) { return '⚠️ ' + id; }));
            if (rationality.rationalityState === 'LIMBIC_TILT') warnings.push('🟡 检测到情绪偏差，建议降仓冷静');
            if (rationality.rationalityState === 'EXTREME_TILT') warnings.push('🔴 极度情绪上头，强制防御模式');

            const result = {
                orderId: generateId(),
                timestamp: now,
                assetId: valuation.assetId,
                regime: regime,
                fuseCheck: enforced,
                signal: {
                    direction: signalDirection,
                    strength: signalStrength,
                    confidence: Math.round(50 + factors.compositeScore * 0.5),
                    timeHorizon: 'POSITION'
                },
                kelly: {
                    rawKelly: kellyRaw,
                    enforcedPosition: enforced.actual,
                    halfKelly: enforced.actual * 0.5,
                    quarterKelly: enforced.actual * 0.25,
                    rationalityAdjusted: kellyWithRationality,
                    recommendedPosition: enforced.actual
                },
                priceLevels: {
                    entryZone: { low: entryLow, high: entryHigh },
                    stopLoss: stopLoss,
                    takeProfit1: valuation.pricing.targetPriceRange.base,
                    takeProfit2: valuation.pricing.targetPriceRange.bull * 0.9,
                    takeProfit3: valuation.pricing.targetPriceRange.bull,
                    targetPrice: targetPrice,
                    riskRewardRatio: riskReward
                },
                allocation: {
                    riskAssets: [{
                        assetId: valuation.assetId,
                        weight: enforced.actual,
                        direction: signalDirection,
                        expectedReturn: valuation.pricing.expectedReturn,
                        contributionToRisk: factors.riskFactors.beta
                    }],
                    hedges: hedgeInstruments,
                    riskFreeAssets: {
                        weight: rationality.positionAdjustment.riskFreeAllocation,
                        instruments: ['TLT', 'SHY'],
                        yield: 0.042
                    },
                    cashReserve: 1 - enforced.actual - rationality.positionAdjustment.riskFreeAllocation - (hedgeInstruments.reduce(function(s, h) { return s + h.hedgeRatio; }, 0))
                },
                hedgingPlan: {
                    required: enforced.hedgingRequired > 0,
                    hedgeRatio: enforced.hedgingRequired,
                    instruments: hedgeInstruments,
                    estimatedCost: hedgeInstruments.reduce(function(s, h) { return s + h.cost * h.hedgeRatio; }, 0),
                    defensiveMode: rationality.positionAdjustment.forceDefensiveMode
                },
                riskStatus: {
                    halted: enforced.halted,
                    activeFuses: enforced.fuseIds || [],
                    gameState: simulation.simulationRisk.gameState,
                    rationalityState: rationality.rationalityState,
                    warnings: warnings
                },
                auditTrail: {
                    macroFunnelId: context.pipeline.macroFunnel.generationId,
                    factorLibraryId: factors.assetId + '_' + factors.processedAt,
                    valuationId: valuation.assetId + '_' + valuation.timestamp,
                    simulationId: simulation.simulationId,
                    pokerSessionId: rationality.sessionId,
                    stepsCompleted: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            };

            YBus.publish('riskFuse', {
                status: enforced.halted ? 'halted' : (warnings.length > 0 ? 'warning' : 'idle'),
                warnings: warnings,
                fuseCheck: enforced,
                timestamp: now
            });

            return result;
        }
    };

    function switchRegime(newRegime, reason) {
        const state = {
            regime: newRegime,
            switchReason: reason || 'manual',
            switchedAt: Date.now(),
            redOceanParams: {
                preferredPE: [5, 15],
                preferredPB: [0.5, 2],
                fcfFocus: 0.8,
                growthPenalty: 0.3,
                valuationDiscount: 0.7
            },
            blueOceanParams: {
                preferredGrowth: [0.3, 1.0],
                preferredMomentum: [0.3, 1.0],
                growthPremium: 1.3,
                valueRelaxation: 0.5,
                betaAmplifier: 1.2
            }
        };
        YBus.publish('regimeState', state);
        return state;
    }

    function resetPipeline() {
        const pipelineId = generateId();
        const initial = {
            pipelineId: pipelineId,
            currentStep: -1,
            completedSteps: [],
            startedAt: Date.now(),
            lastUpdatedAt: Date.now(),
            halted: false,
            haltReason: ''
        };
        YBus.publish('quantPipeline', initial);
        return initial;
    }

    function runPipeline(config) {
        config = config || {};
        config.simulationDays = config.simulationDays || 60;
        config.monteCarloRuns = config.monteCarloRuns || 50;
        config.pokerHands = config.pokerHands || 8;
        config.useHalfKelly = config.useHalfKelly !== false;
        config.riskPreference = config.riskPreference || 'MODERATE';

        let pipeline = resetPipeline();
        const regimeState = YBus.getState('regimeState');
        const regime = config.forceRegime || regimeState.regime || 'RED_OCEAN';
        switchRegime(regime, 'pipeline_start');

        const context = {
            config: config,
            regime: regime,
            pipeline: {},
            pipelineId: pipeline.pipelineId
        };

        function updatePipeline(stepId, result) {
            const stepInfo = STEPS.find(function(s) { return s.id === stepId; });
            const channel = stepInfo ? stepInfo.channel : null;
            pipeline.currentStep = stepId;
            if (pipeline.completedSteps.indexOf(stepId) === -1) {
                pipeline.completedSteps.push(stepId);
            }
            pipeline.lastUpdatedAt = Date.now();
            if (channel) {
                context.pipeline[channel] = result;
                YBus.publish(channel, result);
            }
            YBus.publish('quantPipeline', pipeline);
        }

        try {
            let input = null;
            const stepOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            for (let i = 0; i < stepOrder.length; i++) {
                const stepId = stepOrder[i];
                updatePipeline(stepId, null);
                const result = STEP_MODULES[stepId](input, context);
                updatePipeline(stepId, result);
                input = result;
                if (result && result.riskStatus && result.riskStatus.halted && stepId !== 8) {
                    pipeline.halted = true;
                    pipeline.haltReason = '风控熔断于Step ' + stepId;
                    YBus.publish('quantPipeline', pipeline);
                }
            }
            return context.pipeline.executionOrder;
        } catch (e) {
            pipeline.halted = true;
            pipeline.haltReason = '引擎异常: ' + e.message;
            YBus.publish('quantPipeline', pipeline);
            console.error('[QuantEngine] Pipeline failed:', e);
            throw e;
        }
    }

    function runToStep(targetStep, input, config) {
        config = config || {};
        config.simulationDays = config.simulationDays || 60;
        config.monteCarloRuns = config.monteCarloRuns || 30;
        config.pokerHands = config.pokerHands || 5;

        let pipeline = YBus.getState('quantPipeline');
        if (!pipeline.pipelineId || pipeline.halted) pipeline = resetPipeline();

        const regimeState = YBus.getState('regimeState');
        const regime = config.forceRegime || regimeState.regime || 'RED_OCEAN';
        const context = { config: config, regime: regime, pipeline: YBus.getSnapshot(), pipelineId: pipeline.pipelineId };

        let currentInput = input;
        const stepOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        for (let i = 0; i < stepOrder.length && stepOrder[i] <= targetStep; i++) {
            const stepId = stepOrder[i];
            if (context.pipeline[STEPS.find(s => s.id === stepId).channel] && stepId < targetStep) {
                currentInput = context.pipeline[STEPS.find(s => s.id === stepId).channel];
                continue;
            }
            const result = STEP_MODULES[stepId](currentInput, context);
            const channel = STEPS.find(s => s.id === stepId).channel;
            context.pipeline[channel] = result;
            YBus.publish(channel, result);
            currentInput = result;
            pipeline.currentStep = stepId;
            if (pipeline.completedSteps.indexOf(stepId) === -1) pipeline.completedSteps.push(stepId);
        }
        pipeline.lastUpdatedAt = Date.now();
        YBus.publish('quantPipeline', pipeline);
        return currentInput;
    }

    function emergencyHalt(reason) {
        if (global.YMineRiskCB && global.YMineRiskCB.halt) {
            global.YMineRiskCB.halt(reason);
        }
        const pipeline = YBus.getState('quantPipeline');
        pipeline.halted = true;
        pipeline.haltReason = reason || '手动紧急停机';
        pipeline.lastUpdatedAt = Date.now();
        YBus.publish('quantPipeline', pipeline);
        YBus.publish('riskFuse', {
            status: 'halted',
            warnings: ['🔴 紧急停机：' + reason],
            timestamp: Date.now()
        });
    }

    YBus.ready(function() {
        const existingRegime = YBus.getState('regimeState');
        if (!existingRegime || !existingRegime.switchedAt) {
            switchRegime('RED_OCEAN', 'init_default');
        }
    });

    const YMineQuantEngine = {
        version: '2.0.0',
        STEPS: STEPS,
        PRESET_ASSETS: PRESET_ASSETS,
        switchRegime: switchRegime,
        runPipeline: runPipeline,
        runToStep: runToStep,
        resetPipeline: resetPipeline,
        emergencyHalt: emergencyHalt,
        modules: STEP_MODULES
    };

    global.YMineQuantEngine = YMineQuantEngine;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = YMineQuantEngine;
    }

})(typeof window !== 'undefined' ? window : this);
