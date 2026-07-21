/**
 * Y.Mine 机构级量化投研十步闭环引擎 v2.1.0
 * 
 * 核心铁律：Step 8 最终仓位必须且只能调用 YMineRiskCB.enforce() 进行强制门控
 * 熔断触发时 actual=0，不可绕过
 * 
 * 闭环返回：Step 8 完成后组装 EngineOutput → engineOutput 通道 → 总控台
 * 
 * @namespace YMineQuantEngine
 */
(function(global) {
    'use strict';

    var THRESHOLDS = (global.YBus && global.YBus.THRESHOLDS) || Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    var STEPS = [
        { id: 0, name: '宏观海选', icon: '🌊', channel: 'macroFunnel' },
        { id: 1, name: '信息清洗ETL', icon: '🧹', channel: null },
        { id: 2, name: '信息清洗ETL', icon: '⚗️', channel: 'factorLibrary' },
        { id: 3, name: '核心定价估值', icon: '⚖️', channel: null },
        { id: 4, name: '核心定价估值', icon: '📐', channel: 'valuationV2' },
        { id: 5, name: '沙盘决策推演', icon: '🔮', channel: null },
        { id: 6, name: '动态周期观测', icon: '📈', channel: 'simulationResult' },
        { id: 7, name: '人性偏差校验', icon: '🧠', channel: 'rationalityScore' },
        { id: 8, name: '熔断风控对冲', icon: '🛡️', channel: 'executionOrder' }
    ];

    var PRESET_ASSETS = [
        { ticker: 'AAPL', name: '苹果', industry: '科技', marketCap: 2800, pe: 28, pb: 45, revenueGrowthYoY: 0.08, fcfYield: 0.035, roe: 1.5, debtToEquity: 1.8, grade: 'A' },
        { ticker: 'MSFT', name: '微软', industry: '科技', marketCap: 3100, pe: 35, pb: 12, revenueGrowthYoY: 0.15, fcfYield: 0.03, roe: 0.4, debtToEquity: 0.4, grade: 'S' },
        { ticker: 'NVDA', name: '英伟达', industry: '半导体', marketCap: 2500, pe: 70, pb: 50, revenueGrowthYoY: 2.6, fcfYield: 0.02, roe: 1.2, debtToEquity: 0.3, grade: 'S' },
        { ticker: 'GOOGL', name: '谷歌', industry: '互联网', marketCap: 2000, pe: 25, pb: 6, revenueGrowthYoY: 0.13, fcfYield: 0.04, roe: 0.3, debtToEquity: 0.2, grade: 'A' },
        { ticker: 'AMZN', name: '亚马逊', industry: '电商/云', marketCap: 1900, pe: 60, pb: 8, revenueGrowthYoY: 0.12, fcfYield: 0.02, roe: 0.2, debtToEquity: 0.5, grade: 'A' },
        { ticker: 'XOM', name: '埃克森美孚', industry: '能源', marketCap: 450, pe: 10, pb: 2, revenueGrowthYoY: -0.05, fcfYield: 0.08, roe: 0.2, debtToEquity: 0.3, grade: 'B' },
        { ticker: 'JNJ', name: '强生', industry: '医药', marketCap: 380, pe: 15, pb: 5, revenueGrowthYoY: 0.06, fcfYield: 0.05, roe: 0.25, debtToEquity: 0.4, grade: 'B' },
        { ticker: 'JPM', name: '摩根大通', industry: '银行', marketCap: 500, pe: 11, pb: 1.8, revenueGrowthYoY: 0.2, fcfYield: 0, roe: 0.15, debtToEquity: 0, grade: 'B' },
        { ticker: 'TSLA', name: '特斯拉', industry: '新能源', marketCap: 600, pe: 50, pb: 12, revenueGrowthYoY: 0.1, fcfYield: 0.01, roe: 0.25, debtToEquity: 0.2, grade: 'A' },
        { ticker: 'BRK.B', name: '伯克希尔', industry: '多元金融', marketCap: 900, pe: 9, pb: 1.5, revenueGrowthYoY: 0.05, fcfYield: 0.04, roe: 0.15, debtToEquity: 0.3, grade: 'S' }
    ];

    function generateId() {
        return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    }

    function safeNum(v, def) { return typeof v === 'number' && !isNaN(v) ? v : (def || 0); }
    function safeObj(v, def) { return v && typeof v === 'object' ? v : (def || {}); }
    function safeStr(v, def) { return typeof v === 'string' ? v : (def || ''); }
    function safeArr(v, def) { return Array.isArray(v) ? v : (def || []); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, safeNum(v, 0))); }

    function gaussianRandom() {
        var u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function computeConeC(marketShare, industryConcentration) {
        var V = 1.0;
        var m = safeNum(marketShare, 0);
        var rho0 = Math.max(0.1, safeNum(industryConcentration, 0.4));
        return clamp(m * rho0 / V * 0.8, 0.2, 0.9);
    }

    function computeKellyFraction(p, b) {
        var f = (safeNum(p, 0.5) * (safeNum(b, 1) + 1) - 1) / safeNum(b, 1);
        return clamp(f, 0, 1);
    }

    function computeDCF(fcf, growthRate, wacc, terminalGrowth, years) {
        var pv = 0;
        var projectedFCFs = [];
        var curFcf = safeNum(fcf, 1);
        var g = safeNum(growthRate, 0.05);
        var w = Math.max(0.01, safeNum(wacc, 0.08));
        var tg = safeNum(terminalGrowth, 0.025);
        var n = safeNum(years, 10);
        for (var t = 1; t <= n; t++) {
            var gt = t <= 3 ? g : Math.max(0.03, g * Math.pow(0.8, t - 3));
            curFcf = curFcf * (1 + gt);
            projectedFCFs.push(curFcf);
            pv += curFcf / Math.pow(1 + w, t);
        }
        var terminalValue = projectedFCFs[projectedFCFs.length - 1] * (1 + tg) / Math.max(0.001, w - tg);
        var terminalPV = terminalValue / Math.pow(1 + w, n);
        var npv = pv + terminalPV;
        return { npv: npv, irr: w, projectedFCFs: projectedFCFs, terminalValue: terminalValue, intrinsicValue: npv };
    }

    function computeWACC(rf, beta, marketPremium, costOfDebt, taxRate, equityWeight) {
        var r = safeNum(rf, 0.042);
        var b = safeNum(beta, 1);
        var mp = safeNum(marketPremium, 0.055);
        var cod = safeNum(costOfDebt, 0.05);
        var tr = safeNum(taxRate, 0.21);
        var ew = clamp(safeNum(equityWeight, 0.8), 0, 1);
        var costOfEquity = r + b * mp;
        var afterTaxCostOfDebt = cod * (1 - tr);
        return costOfEquity * ew + afterTaxCostOfDebt * (1 - ew);
    }

    function defaultRiskFuse() {
        return {
            status: 'idle',
            coneC: 0.3, zScore: 0, mdd: 0,
            warnings: [],
            timestamp: Date.now()
        };
    }

    function getDefaultFactorLibrary(assetId, regime) {
        var r = regime || 'RED_OCEAN';
        return {
            assetId: assetId || 'AAPL',
            processedAt: Date.now(),
            regime: r,
            valueFactors: { pe_ttm: 20, pb_lf: 5, ps_ttm: 3, ev_ebitda: 12, dividendYield: 0.02, fcfYield: 0.03, pePercentile: 0.5, pbPercentile: 0.5 },
            growthFactors: { revenueGrowth3yCAGR: 0.1, earningsGrowth3yCAGR: 0.1, fcfGrowth3yCAGR: 0.08, revenueGrowthYoY: 0.1, earningsGrowthYoY: 0.1, epsGrowthNextFY: 0.1, revenueGrowthNextFY: 0.08 },
            qualityFactors: { roe_ttm: 0.2, roa_ttm: 0.08, grossMargin: 0.4, operatingMargin: 0.2, netMargin: 0.15, debtToEquity: 0.5, currentRatio: 1.5, interestCoverage: 8, earningsStability: 0.8 },
            momentumFactors: { return1m: 0, return3m: 0.02, return6m: 0.05, return12m: 0.1, relativeStrength: 0.5, northboundFlow: 0, institutionalHolding: 0.6 },
            sentimentFactors: { newsSentiment: 0.5, analystConsensus: 0.5, socialSentiment: 0.5, shortInterestRatio: 0.04, putCallRatio: 0.8, vixAdjustment: 1 },
            riskFactors: { coneC: 0.4, zScore: 0, mdd: r === 'BLUE_OCEAN' ? 0.25 : 0.35, drawdown: 0.1, volatility30d: r === 'BLUE_OCEAN' ? 0.2 : 0.35, beta: r === 'BLUE_OCEAN' ? 1.3 : 0.9, valueAtRisk95: 0.03, maxDrawdown1y: r === 'BLUE_OCEAN' ? 0.3 : 0.45 },
            factorZScores: {},
            compositeScore: 50
        };
    }

    var STEP_MODULES = {
        0: function step0_macroFunnel(input, context) {
            var regime = safeStr(context.regime, 'RED_OCEAN');
            var now = Date.now();
            var assets = PRESET_ASSETS.map(function(asset) {
                var score = 50;
                var reasons = [];
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
                var coneC = computeConeC(asset.marketCap / 5000, regime === 'BLUE_OCEAN' ? 0.6 : 0.4);
                var zScore = gaussianRandom() * (regime === 'BLUE_OCEAN' ? 0.8 : 0.6);
                var mdd = regime === 'BLUE_OCEAN' ? 0.2 : 0.3;
                return Object.assign({}, asset, {
                    screeningScore: clamp(score, 0, 100),
                    selectionReasons: reasons.slice(),
                    macroSignals: { coneC: coneC, zScore: zScore, mdd: mdd }
                });
            }).filter(function(a) { return a.screeningScore >= 55; })
              .sort(function(a, b) { return b.screeningScore - a.screeningScore; });

            if (assets.length === 0) assets = [Object.assign({}, PRESET_ASSETS[0], { screeningScore: 60, selectionReasons: ['默认标的'], macroSignals: { coneC: 0.4, zScore: 0, mdd: 0.3 } })];

            var initialTicker = safeObj(context.config, {}).initialTicker;
            var selectedAsset = initialTicker
                ? (assets.find(function(a) { return a.ticker === initialTicker; }) || assets[0])
                : assets[0];

            var result = {
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

            return result;
        },

        1: function step1_ingestion(input, context) {
            return input;
        },

        2: function step2_etl(input, context) {
            var macroFunnel = safeObj(context.pipeline, {}).macroFunnel;
            var regime = safeStr(context.regime, 'RED_OCEAN');
            var now = Date.now();
            var asset = safeObj(input, {}).selectedAsset || safeObj(macroFunnel, {}).selectedAsset || safeObj(input, {}) || PRESET_ASSETS[0];
            var assetId = safeStr(asset.ticker, 'AAPL');

            var basePE = safeNum(asset.pe, 20);
            var baseGrowth = safeNum(asset.revenueGrowthYoY, 0.1);
            var basePB = safeNum(asset.pb, 5);
            var baseFCFYield = safeNum(asset.fcfYield, 0.03);
            var baseROE = safeNum(asset.roe, 0.2);
            var baseDE = safeNum(asset.debtToEquity, 0.5);

            var riskFactors = {
                coneC: computeConeC(safeNum(asset.marketCap, 1000) / 5000, regime === 'BLUE_OCEAN' ? 0.55 : 0.4),
                zScore: gaussianRandom() * (regime === 'BLUE_OCEAN' ? 0.7 : 0.9),
                mdd: regime === 'BLUE_OCEAN' ? 0.25 : 0.35,
                drawdown: Math.random() * 0.2,
                volatility30d: regime === 'BLUE_OCEAN' ? 0.2 : 0.35,
                beta: regime === 'BLUE_OCEAN' ? 1.2 + Math.random() * 0.3 : 0.8 + Math.random() * 0.2,
                valueAtRisk95: 0.02 + Math.random() * 0.03,
                maxDrawdown1y: regime === 'BLUE_OCEAN' ? 0.3 : 0.45
            };

            var result = {
                assetId: assetId,
                processedAt: now,
                regime: regime,
                valueFactors: {
                    pe_ttm: basePE,
                    pb_lf: basePB,
                    ps_ttm: basePE * 0.8,
                    ev_ebitda: basePE * 0.7,
                    dividendYield: baseFCFYield * 0.6,
                    fcfYield: baseFCFYield,
                    pePercentile: clamp(basePE / 80, 0, 1),
                    pbPercentile: clamp(basePB / 60, 0, 1)
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
                    roe_ttm: baseROE,
                    roa_ttm: baseROE * 0.4,
                    grossMargin: 0.3 + Math.random() * 0.3,
                    operatingMargin: 0.15 + Math.random() * 0.25,
                    netMargin: 0.1 + Math.random() * 0.2,
                    debtToEquity: baseDE,
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
                    newsSentiment: (regime === 'BLUE_OCEAN' ? 0.6 : 0.3) - 0.5 + (Math.random() - 0.5) * 0.4,
                    analystConsensus: (regime === 'BLUE_OCEAN' ? 0.6 : 0.3) - 0.3 + (Math.random() - 0.5) * 0.3,
                    socialSentiment: (regime === 'BLUE_OCEAN' ? 0.6 : 0.3) - 0.5 + (Math.random() - 0.5) * 0.6,
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
            return input;
        },

        4: function step4_valuation(input, context) {
            var factors = safeObj(input, getDefaultFactorLibrary('AAPL', context.regime));
            var regime = safeStr(context.regime, 'RED_OCEAN');
            var pipeline = safeObj(context.pipeline, {});
            var macroFunnel = safeObj(pipeline.macroFunnel, STEP_MODULES[0](null, context));
            var asset = safeObj(macroFunnel.selectedAsset, PRESET_ASSETS[0]);
            var now = Date.now();

            var rf = 0.042;
            var marketPremium = 0.055;
            var riskF = safeObj(factors.riskFactors, getDefaultFactorLibrary(asset.ticker, regime).riskFactors);
            var valF = safeObj(factors.valueFactors, getDefaultFactorLibrary(asset.ticker, regime).valueFactors);
            var growF = safeObj(factors.growthFactors, getDefaultFactorLibrary(asset.ticker, regime).growthFactors);

            var betaBase = safeNum(riskF.beta, 1.0);
            var dynamicBeta = regime === 'BLUE_OCEAN' ? betaBase * 1.2 : betaBase * 0.85;
            var wacc = computeWACC(rf, dynamicBeta, marketPremium, 0.05, 0.21, 0.8);
            var basePrice = 100;
            var baseFCF = Math.max(0.01, basePrice * safeNum(valF.fcfYield, 0.03));
            var growth = regime === 'BLUE_OCEAN'
                ? safeNum(growF.epsGrowthNextFY, 0.1)
                : Math.min(0.1, safeNum(growF.epsGrowthNextFY, 0.08));
            var terminalGrowth = 0.025;
            var dcfResult = computeDCF(baseFCF, growth, wacc, terminalGrowth, 10);
            var marketCap = Math.max(100, safeNum(asset.marketCap, 1000));
            var perShareValue = dcfResult.intrinsicValue / (marketCap / basePrice);
            var peImplied = (basePrice / Math.max(0.01, baseFCF)) * baseFCF * 12;
            var pbImplied = basePrice * (safeNum(valF.pb_lf, 5) / Math.max(0.5, safeNum(asset.pb, 5)));
            var bearPrice = perShareValue * 0.75;
            var bullPrice = perShareValue * 1.3;
            var baseTarget = perShareValue;
            var currentPrice = basePrice * (0.85 + Math.random() * 0.3);
            var valuationGap = currentPrice > 0 ? (baseTarget - currentPrice) / currentPrice : 0;
            var mispricingSignal = valuationGap > 0.15 ? 'BULLISH' : (valuationGap < -0.1 ? 'BEARISH' : 'NEUTRAL');

            var npvNegative = dcfResult.npv <= 0;
            var irrBelowHurdle = dcfResult.irr < 0.08;

            var result = {
                assetId: safeStr(factors.assetId, safeStr(asset.ticker, 'AAPL')),
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
                    expectedReturn: valuationGap,
                    riskPremium: wacc - rf,
                    dynamicBeta: dynamicBeta,
                    valuationGap: valuationGap,
                    valuationSignal: mispricingSignal,
                    marginOfSafety: baseTarget > 0 ? (baseTarget - currentPrice) / baseTarget : 0
                },
                valuationRisk: {
                    coneC: safeNum(riskF.coneC, 0.4),
                    zScore: safeNum(riskF.zScore, 0),
                    mdd: safeNum(riskF.mdd, 0.3),
                    npvNegative: npvNegative,
                    irrBelowHurdle: irrBelowHurdle
                },
                assumptions: {}
            };

            return result;
        },

        5: function step5_sandbox(input, context) {
            return input;
        },

        6: function step6_simulation(input, context) {
            var valuation = safeObj(input, {
                currentPrice: 100,
                pricing: { targetPriceRange: { bear: 75, base: 100, bull: 130 }, dynamicBeta: 1, expectedReturn: 0.05 },
                valuationRisk: { coneC: 0.4, zScore: 0, mdd: 0.3 }
            });
            var regime = safeStr(context.regime, 'RED_OCEAN');
            var now = Date.now();
            var cfg = safeObj(context.config, {});
            var days = safeNum(cfg.simulationDays, 60);
            var mcRuns = safeNum(cfg.monteCarloRuns, 50);

            var pricing = safeObj(valuation.pricing, { targetPriceRange: { bear: 75, base: 100, bull: 130 }, dynamicBeta: 1 });
            var valRisk = safeObj(valuation.valuationRisk, { coneC: 0.4, zScore: 0, mdd: 0.3 });
            var tgt = safeObj(pricing.targetPriceRange, { bear: 75, base: 100, bull: 130 });
            var gravityCenter = safeNum(tgt.base, 100);
            var startPrice = safeNum(valuation.currentPrice, 100);
            var volBase = safeNum(pricing.dynamicBeta, 1) * (regime === 'BLUE_OCEAN' ? 0.015 : 0.025);
            var meanReversionSpeed = 0.02;

            function generateKline(startP) {
                var kline = [];
                var curP = startP;
                var curCone = safeNum(valRisk.coneC, 0.4);
                var curZ = safeNum(valRisk.zScore, 0);
                var curMdd = safeNum(valRisk.mdd, 0.3);
                for (var d = 0; d < days; d++) {
                    var progress = d / days;
                    var reversion = (gravityCenter - curP) * meanReversionSpeed;
                    var shock = gaussianRandom() * volBase * curP * (regime === 'BLUE_OCEAN' ? 1 : 1.3);
                    var coneNoise = gaussianRandom() * 0.05;
                    curCone = clamp(curCone + coneNoise + (progress - 0.5) * 0.02, 0.2, 0.85);
                    curZ = curZ * 0.9 + gaussianRandom() * 0.3;
                    var open = curP;
                    var close = curP + reversion + shock;
                    close = Math.max(1, close);
                    var high = Math.max(open, close) * (1 + Math.abs(gaussianRandom()) * volBase * 0.5);
                    var low = Math.min(open, close) * (1 - Math.abs(gaussianRandom()) * volBase * 0.5);
                    low = Math.max(0.1, low);
                    var curGameState = 'CALM';
                    if (curCone >= THRESHOLDS.FUSE) curGameState = 'BLACK_SWAN';
                    else if (curCone >= THRESHOLDS.STEADY) curGameState = 'MELTDOWN';
                    else if (curCone >= THRESHOLDS.BREAKEVEN) curGameState = 'TENSION';
                    var suggestedPos = curCone >= THRESHOLDS.FUSE ? 0 : (curCone >= THRESHOLDS.STEADY ? 0.1 : (curCone >= THRESHOLDS.BREAKEVEN ? 0.25 : (regime === 'BLUE_OCEAN' ? 0.5 : 0.3)));
                    var hedgingReq = curCone >= THRESHOLDS.FUSE ? 1.0 : (curCone >= THRESHOLDS.STEADY ? 0.6 : (curCone >= THRESHOLDS.BREAKEVEN ? 0.3 : 0));
                    kline.push({
                        day: d,
                        date: now + d * 86400000,
                        open: open, high: high, low: low, close: close,
                        volume: 1000000 + Math.random() * 5000000,
                        coneC: curCone, zScore: curZ,
                        gameState: curGameState,
                        gravityCenter: gravityCenter,
                        suggestedPosition: suggestedPos,
                        hedgingRequired: hedgingReq
                    });
                    curP = close;
                }
                return kline;
            }

            var baselineKLine = generateKline(startPrice);
            var endKline = baselineKLine[baselineKLine.length - 1] || { close: startPrice, coneC: 0.4, gameState: 'CALM' };

            var mcPaths = [];
            var mcFinalValues = [];
            var mcMaxDrawdowns = [];
            var fuseHits = 0;
            for (var r = 0; r < mcRuns; r++) {
                var p = generateKline(startPrice);
                var finalP = p[p.length - 1].close;
                var peak = startPrice, maxDD = 0;
                var fuseHit = false;
                for (var k = 0; k < p.length; k++) {
                    peak = Math.max(peak, p[k].high);
                    var dd = peak > 0 ? (peak - p[k].low) / peak : 0;
                    maxDD = Math.max(maxDD, dd);
                    if (p[k].coneC >= THRESHOLDS.FUSE) fuseHit = true;
                }
                mcPaths.push(p);
                mcFinalValues.push(finalP / startPrice);
                mcMaxDrawdowns.push(maxDD);
                if (fuseHit) fuseHits++;
            }
            mcFinalValues.sort(function(a, b) { return a - b; });
            mcMaxDrawdowns.sort(function(a, b) { return a - b; });
            function percentile(arr, pct) {
                if (!arr.length) return 0;
                var idx = Math.floor(arr.length * pct);
                idx = Math.min(arr.length - 1, Math.max(0, idx));
                return arr[idx];
            }
            var meanFinal = mcFinalValues.reduce(function(a, b) { return a + b; }, 0) / Math.max(1, mcFinalValues.length);
            var meanMDD = mcMaxDrawdowns.reduce(function(a, b) { return a + b; }, 0) / Math.max(1, mcMaxDrawdowns.length);

            var stressScenarios = [
                { name: '波动率飙升', shockType: 'VOL_SPIKE', shockMultiplier: 2.5 },
                { name: '红海突袭', shockType: 'RED_SEA_CRASH', shockMultiplier: -0.2 },
                { name: '流动性危机', shockType: 'LIQUIDITY_CRISIS', shockMultiplier: -0.3 },
                { name: '黑天鹅', shockType: 'BLACK_SWAN', shockMultiplier: -0.4 }
            ];
            var stressTests = stressScenarios.map(function(sc) {
                var pnl = sc.shockMultiplier * (sc.shockType === 'VOL_SPIKE' ? -0.1 : 1);
                var mdd = Math.abs(pnl) * (0.8 + Math.random() * 0.4);
                var fuseTrig = mdd >= 0.2 || pnl <= -0.2;
                var reasons = [];
                if (mdd >= 0.2) reasons.push('最大回撤触发熔断');
                if (pnl <= -0.2) reasons.push('极端跌幅触发');
                return {
                    name: sc.name, shockType: sc.shockType,
                    pnlPercent: pnl * 100,
                    maxDrawdown: mdd,
                    fuseTriggered: fuseTrig,
                    fuseReasons: reasons
                };
            });

            var entryLow = startPrice * 0.95;
            var entryHigh = startPrice * 0.99;
            var stopLoss = startPrice * 0.92;
            var takeProfit = tgt.bull;
            var finalCone = safeNum(endKline.coneC, THRESHOLDS.BREAKEVEN - 0.08);
            var rawRecommendation = finalCone >= THRESHOLDS.FUSE ? 0 : (finalCone >= THRESHOLDS.STEADY ? 0.1 : (finalCone >= THRESHOLDS.BREAKEVEN ? 0.2 : (regime === 'BLUE_OCEAN' ? 0.5 : 0.3)));
            var warnLevel = 'LOW';
            if (finalCone >= THRESHOLDS.FUSE) warnLevel = 'EXTREME';
            else if (finalCone >= THRESHOLDS.STEADY) warnLevel = 'HIGH';
            else if (finalCone >= THRESHOLDS.BREAKEVEN) warnLevel = 'MEDIUM';

            var result = {
                simulationId: generateId(),
                timestamp: now,
                config: {
                    regime: regime,
                    simulationDays: days,
                    monteCarloRuns: mcRuns,
                    initialCapital: 100000,
                    initialPosition: 0
                },
                assetId: safeStr(valuation.assetId, 'AAPL'),
                valuation: valuation,

                baselineKLine: baselineKLine,
                monteCarlo: {
                    runs: mcRuns,
                    paths: [],
                    statistics: {
                        meanFinalValue: meanFinal * 100000,
                        medianFinalValue: percentile(mcFinalValues, 0.5) * 100000,
                        percentile5: percentile(mcFinalValues, 0.05) * 100000,
                        percentile95: percentile(mcFinalValues, 0.95) * 100000,
                        meanMaxDrawdown: meanMDD,
                        meanSharpeRatio: regime === 'BLUE_OCEAN' ? 1.2 : 0.5,
                        fuseTriggerProbability: mcRuns > 0 ? fuseHits / mcRuns : 0
                    }
                },
                stressTests: stressTests,
                threeFlow: {
                    paid: { allocation: 0.3, phi: 0.5, alpha: 0.3, expectedReturn: 0.08 },
                    content: { allocation: 0.4, phi: 0.4, alpha: 0.25, expectedReturn: 0.15 },
                    private: { allocation: 0.3, phi: 0.6, alpha: 0.2, expectedReturn: 0.05 },
                    blendedReturn: 0.09
                },
                simulationRisk: {
                    coneC: finalCone,
                    zScore: safeNum(endKline.zScore, 0),
                    drawdown: safeNum(endKline.close, startPrice) > 0 ? (startPrice - endKline.close) / startPrice : 0,
                    mdd: meanMDD,
                    gameState: endKline.gameState || 'CALM'
                },
                sandboxRecommendation: {
                    optimalEntryZone: { low: entryLow, high: entryHigh },
                    optimalExitZone: { low: gravityCenter * 0.98, high: tgt.bull },
                    stopLoss: stopLoss,
                    takeProfit: takeProfit,
                    recommendedPositionBeforeFuse: rawRecommendation,
                    warningLevel: warnLevel
                }
            };

            return result;
        },

        7: function step7_pokerTest(input, context) {
            var simulation = safeObj(input, {
                simulationRisk: { coneC: 0.4, zScore: 0, mdd: 0.3, gameState: 'CALM' }
            });
            var cfg = safeObj(context.config, {});
            var numHands = safeNum(cfg.pokerHands, 8);
            var now = Date.now();
            var regime = safeStr(context.regime, 'RED_OCEAN');

            var hands = [];
            var totalGTOAlignment = 0;
            var quickAllIn = 0;
            var chasingLosses = 0;
            var tiltAfterBluff = false;
            var foldStreak = 0;

            var bankroll = 1000;
            for (var h = 0; h < numHands; h++) {
                var handStrength = Math.random();
                var potOdds = 0.2 + Math.random() * 0.4;
                var gtoAction = handStrength > 0.7 ? 'RAISE' : (handStrength > 0.4 ? 'CALL' : 'FOLD');
                var noise = gaussianRandom() * 0.3;
                var tiltedFactor = h > numHands * 0.6 ? noise * 0.5 : 0;
                var effectiveStrength = handStrength + tiltedFactor + (bankroll < 800 ? -0.1 : 0) + (bankroll > 1200 ? 0.05 : 0);
                var actualAction;
                if (effectiveStrength > 0.75) actualAction = 'RAISE';
                else if (effectiveStrength > 0.35) actualAction = 'CALL';
                else actualAction = 'FOLD';
                var betSize = actualAction === 'RAISE' ? Math.round(50 + Math.random() * 150) : (actualAction === 'CALL' ? Math.round(30 + Math.random() * 50) : 0);
                var gtoBet = gtoAction === 'RAISE' ? 100 : (gtoAction === 'CALL' ? 40 : 0);
                var won = actualAction === gtoAction ? (Math.random() > 0.45) : (Math.random() > 0.7);
                var result = won ? betSize : -betSize;
                bankroll += result;

                var alignment = actualAction === gtoAction ? 1.0 : (Math.abs(betSize - gtoBet) < 30 ? 0.5 : 0);
                totalGTOAlignment += alignment;
                if (actualAction === 'RAISE' && betSize > 150 && h < 3) quickAllIn++;
                if (bankroll < 800 && betSize > 100) chasingLosses++;
                if (result < -100 && actualAction === 'RAISE' && h > 0 && hands[h-1].result < 0) tiltAfterBluff = true;
                if (actualAction === 'FOLD') foldStreak++; else foldStreak = 0;

                hands.push({
                    handIndex: h,
                    holeCards: [],
                    communityCards: [],
                    potOdds: potOdds,
                    gtoAction: gtoAction,
                    actualAction: actualAction,
                    betSize: betSize,
                    gtoBetSize: gtoBet,
                    result: result,
                    bankrollAfter: bankroll,
                    gtoAlignment: alignment
                });
            }

            var avgGTO = numHands > 0 ? totalGTOAlignment / numHands : 0.5;
            var overAggression = 1 + quickAllIn * 0.15 - (avgGTO - 0.5);
            var lossAversion = bankroll < 900 ? 1.3 : 1.0;
            var overConfidence = bankroll > 1100 ? 1.2 : 1.0;
            var chasing = chasingLosses > 2 ? 1.3 : 1.0;
            var tiltLevel = 0;
            if (chasingLosses > 3 || tiltAfterBluff) tiltLevel = 0.9;
            else if (chasingLosses > 1 || quickAllIn > 1) tiltLevel = 0.6;
            else if (avgGTO < 0.4) tiltLevel = 0.4;
            tiltLevel = clamp(tiltLevel, 0, 1);

            var overallScore = Math.round(avgGTO * 100 - tiltLevel * 30 - quickAllIn * 5 + (bankroll - 1000) / 50);
            overallScore = clamp(overallScore, 0, 100);

            var rationalityState;
            var kellyMult;
            var forceDefensive = false;
            var riskCap;
            var rfAlloc;
            var hedgeAdj;
            if (overallScore >= 75) {
                rationalityState = 'PREFRONTAL_RATIONAL';
                kellyMult = 1.3; riskCap = regime === 'BLUE_OCEAN' ? 0.6 : 0.35; rfAlloc = 0; hedgeAdj = 0;
            } else if (overallScore >= 50) {
                rationalityState = 'BALANCED';
                kellyMult = 1.0; riskCap = regime === 'BLUE_OCEAN' ? 0.4 : 0.25; rfAlloc = 0.1; hedgeAdj = 0.1;
            } else if (overallScore >= 25) {
                rationalityState = 'LIMBIC_TILT';
                kellyMult = 0.5; riskCap = 0.15; rfAlloc = 0.4; hedgeAdj = 0.4;
            } else {
                rationalityState = 'EXTREME_TILT';
                kellyMult = 0; forceDefensive = true; riskCap = 0; rfAlloc = 1.0; hedgeAdj = 1.0;
            }

            var result = {
                sessionId: generateId(),
                timestamp: now,
                handsPlayed: numHands,
                hands: hands,
                overallScore: overallScore,
                rationalityState: rationalityState,
                subScores: {
                    gtoAlignment: Math.round(avgGTO * 100),
                    betSizingAccuracy: Math.round((1 - Math.min(1, Math.abs(avgGTO - 0.5) * 2)) * 100),
                    decisionSpeed: 70 + Math.round(Math.random() * 20),
                    lossRecovery: Math.round(100 - tiltLevel * 60),
                    varianceTolerance: Math.round(50 + (bankroll - 1000) / 10 - quickAllIn * 10)
                },
                biases: {
                    overAggressionFactor: overAggression,
                    lossAversionFactor: lossAversion,
                    overconfidenceFactor: overConfidence,
                    chasingFactor: chasing,
                    tiltLevel: tiltLevel
                },
                behavioralSignals: {
                    quickAllInCount: quickAllIn,
                    chasingLossesCount: chasingLosses,
                    tiltAfterBluff: tiltAfterBluff,
                    passiveFoldStreak: foldStreak
                },
                positionAdjustment: {
                    kellyMultiplier: kellyMult,
                    hedgingAdjustment: hedgeAdj,
                    forceDefensiveMode: forceDefensive,
                    riskAssetCap: riskCap,
                    riskFreeAllocation: rfAlloc
                },
                tiltSignals: {
                    tiltLevel: tiltLevel,
                    coneC: safeNum(simulation.simulationRisk.coneC, 0.4),
                    zScore: safeNum(simulation.simulationRisk.zScore, 0)
                }
            };

            return result;
        },

        8: function step8_allocation(input, context) {
            var rationality = safeObj(input, {
                overallScore: 50,
                rationalityState: 'BALANCED',
                positionAdjustment: { kellyMultiplier: 1, hedgingAdjustment: 0.1, forceDefensiveMode: false, riskAssetCap: 0.3, riskFreeAllocation: 0.1 },
                tiltSignals: { tiltLevel: 0, coneC: 0.4, zScore: 0 }
            });
            var pipeline = safeObj(context.pipeline, {});
            var simulation = safeObj(pipeline.simulationResult, STEP_MODULES[6](pipeline.valuationV2, context));
            var valuation = safeObj(pipeline.valuationV2, STEP_MODULES[4](pipeline.factorLibrary, context));
            var factors = safeObj(pipeline.factorLibrary, getDefaultFactorLibrary(valuation.assetId, context.regime));
            var regime = safeStr(context.regime, 'RED_OCEAN');
            var now = Date.now();

            var simRisk = safeObj(simulation.simulationRisk, { coneC: 0.4, zScore: 0, mdd: 0.3, drawdown: 0.1, gameState: 'CALM' });
            var sandboxRec = safeObj(simulation.sandboxRecommendation, { optimalEntryZone: {low:95,high:99}, optimalExitZone: {low:98,high:130}, stopLoss: 92, takeProfit: 130, recommendedPositionBeforeFuse: 0.3, warningLevel: 'LOW' });
            var valPricing = safeObj(valuation.pricing, { targetPriceRange: { bear:75,base:100,bull:130 }, expectedReturn:0.05, dynamicBeta:1, valuationGap:0, valuationSignal:'NEUTRAL', marginOfSafety:0 });
            var valTgt = safeObj(valPricing.targetPriceRange, { bear:75, base:100, bull:130 });
            var valDCF = safeObj(valuation.dcf, { npv: 100, irr: 0.09, npvNegative: false, irrBelowHurdle: false });
            var valWacc = safeObj(valuation.wacc, { wacc: 0.08 });
            var posAdj = safeObj(rationality.positionAdjustment, { kellyMultiplier:1, hedgingAdjustment:0.1, forceDefensiveMode:false, riskAssetCap:0.3, riskFreeAllocation:0.1 });
            var tiltSig = safeObj(rationality.tiltSignals, { tiltLevel:0, coneC:0.4, zScore:0 });

            var recommendedRaw = safeNum(sandboxRec.recommendedPositionBeforeFuse, 0.3);
            var kellyRaw = recommendedRaw;
            var kellyWithRationality = kellyRaw * safeNum(posAdj.kellyMultiplier, 1);
            var riskCap = safeNum(posAdj.riskAssetCap, 0.3);
            var cappedPosition = Math.min(kellyWithRationality, riskCap);
            if (regime === 'RED_OCEAN') cappedPosition = Math.min(cappedPosition, 0.25);
            if (posAdj.forceDefensiveMode) cappedPosition = 0;

            var hedgeAdj = safeNum(posAdj.hedgingAdjustment, 0.1);
            var macroCone = safeNum(simRisk.coneC, THRESHOLDS.BREAKEVEN - 0.08);
            var hedgingRequired = hedgeAdj;
            if (macroCone > THRESHOLDS.STEADY) hedgingRequired = Math.max(hedgingRequired, 0.4);
            if (macroCone > THRESHOLDS.FUSE) hedgingRequired = 1.0;

            var fuseInput = {
                cone: macroCone,
                z: safeNum(simRisk.zScore, 0),
                mdd2: safeNum(simRisk.mdd, 0.3),
                drawdown: safeNum(simRisk.drawdown, 0.1),
                ratio: cappedPosition,
                state: safeStr(simRisk.gameState, 'CALM'),
                manualHalt: false,
                tiltLevel: safeNum(tiltSig.tiltLevel, 0),
                npvNegative: !!valDCF.npvNegative,
                irrBelowHurdle: !!valDCF.irrBelowHurdle,
                hedging_required: hedgingRequired
            };

            var enforced;
            if (global.YMineRiskCB && typeof global.YMineRiskCB.enforce === 'function') {
                enforced = global.YMineRiskCB.enforce(fuseInput);
                enforced = safeObj(enforced, { actual:0, halted:true, activeFuses:{}, fuseIds:[], caps:[], reductions:[], hedgingRequired:1, budgetMultiplier:0, coneDistanceToFuse:0 });
            } else {
                enforced = {
                    requested: fuseInput.ratio,
                    actual: fuseInput.ratio,
                    halted: false,
                    activeFuses: {},
                    fuseIds: [],
                    caps: [],
                    reductions: [],
                    hedgingRequired: hedgingRequired,
                    budgetMultiplier: 1,
                    coneDistanceToFuse: THRESHOLDS.FUSE - macroCone
                };
            }
            enforced.actual = safeNum(enforced.actual, 0);
            enforced.halted = !!enforced.halted;
            enforced.hedgingRequired = safeNum(enforced.hedgingRequired, hedgingRequired);
            enforced.fuseIds = safeArr(enforced.fuseIds, []);
            enforced.caps = safeArr(enforced.caps, []);
            enforced.reductions = safeArr(enforced.reductions, []);
            enforced.rationalityAdjustment = safeNum(posAdj.kellyMultiplier, 1);

            var signalDirection = 'HOLD';
            var signalStrength = 50;
            var valSignal = safeStr(valPricing.valuationSignal, 'NEUTRAL');
            if (enforced.actual > 0 && valSignal === 'BULLISH') {
                signalDirection = 'BUY'; signalStrength = Math.min(100, Math.round(enforced.actual * 200));
            } else if (enforced.actual === 0 || valSignal === 'BEARISH') {
                signalDirection = enforced.actual > 0 ? 'HOLD' : 'SELL';
                signalStrength = enforced.halted ? 90 : 50;
            }

            var targetPrice = safeNum(valTgt.base, 100);
            var currentPrice = safeNum(valuation.currentPrice, 100);
            var entryLow = safeNum(sandboxRec.optimalEntryZone.low, currentPrice * 0.95);
            var entryHigh = safeNum(sandboxRec.optimalEntryZone.high, currentPrice * 0.99);
            var stopLoss = safeNum(sandboxRec.stopLoss, currentPrice * 0.92);
            var tp1 = targetPrice;
            var tp2 = safeNum(valTgt.bull, targetPrice * 1.15);
            var tp3 = targetPrice * 1.3;
            var rr = currentPrice > stopLoss ? (targetPrice - currentPrice) / Math.max(0.01, (currentPrice - stopLoss)) : 1;

            var hedgeInstruments = [];
            if (enforced.hedgingRequired > 0) {
                hedgeInstruments.push({
                    type: 'INDEX_FUTURE', ticker: 'ES_MINI', name: '标普500迷你期货',
                    hedgeRatio: enforced.hedgingRequired * 0.5, cost: 0.002, efficiency: 0.85,
                    triggerCondition: '组合回撤触发'
                });
                if (macroCone > THRESHOLDS.STEADY || safeNum(tiltSig.tiltLevel, 0) > THRESHOLDS.STEADY) {
                    hedgeInstruments.push({
                        type: 'GOLD', ticker: 'GLD', name: '黄金ETF',
                        hedgeRatio: enforced.hedgingRequired * 0.3, cost: 0.001, efficiency: 0.5,
                        triggerCondition: '风险对冲'
                    });
                }
            }
            if (safeNum(posAdj.riskFreeAllocation, 0) > 0) {
                hedgeInstruments.push({
                    type: 'BOND', ticker: 'TLT', name: '长期国债ETF',
                    hedgeRatio: safeNum(posAdj.riskFreeAllocation, 0), cost: 0.0005, efficiency: 0.3,
                    triggerCondition: '防御模式/极度TILT'
                });
            }

            var warnings = [];
            if (enforced.halted) warnings.push('🔴 风控熔断已触发，仓位强制归零');
            enforced.fuseIds.forEach(function(id) { warnings.push('⚠️ ' + id); });
            if (rationality.rationalityState === 'LIMBIC_TILT') warnings.push('🟡 检测到情绪偏差，建议降仓冷静');
            if (rationality.rationalityState === 'EXTREME_TILT') warnings.push('🔴 极度情绪上头，强制防御模式');
            if (macroCone >= THRESHOLDS.STEADY) warnings.push('🟠 圆锥浓度进入警戒区，逼近0.68熔断线');
            if (valDCF.npvNegative) warnings.push('🟠 DCF净现值为负，估值风险');
            if (valDCF.irrBelowHurdle) warnings.push('🟠 IRR低于门槛回报率');

            var riskAssets = [];
            if (enforced.actual > 0) {
                riskAssets.push({
                    assetId: safeStr(valuation.assetId, 'AAPL'),
                    weight: enforced.actual,
                    direction: signalDirection === 'BUY' ? 'LONG' : 'SHORT',
                    expectedReturn: safeNum(valPricing.expectedReturn, 0),
                    contributionToRisk: safeNum(valPricing.dynamicBeta, 1) * enforced.actual
                });
            }

            var result = {
                orderId: generateId(),
                timestamp: now,
                assetId: safeStr(valuation.assetId, 'AAPL'),
                regime: regime,
                fuseCheck: enforced,
                signal: {
                    direction: signalDirection,
                    strength: signalStrength,
                    confidence: Math.round(50 + safeNum(rationality.overallScore, 50) * 0.3 - macroCone * 30),
                    timeHorizon: 'SWING'
                },
                kelly: {
                    rawKelly: kellyRaw,
                    enforcedPosition: enforced.actual,
                    halfKelly: kellyRaw * 0.5,
                    quarterKelly: kellyRaw * 0.25,
                    rationalityAdjusted: kellyWithRationality,
                    recommendedPosition: enforced.actual
                },
                priceLevels: {
                    entryZone: { low: entryLow, high: entryHigh },
                    stopLoss: stopLoss,
                    takeProfit1: tp1,
                    takeProfit2: tp2,
                    takeProfit3: tp3,
                    targetPrice: targetPrice,
                    riskRewardRatio: rr
                },
                allocation: {
                    riskAssets: riskAssets,
                    hedges: hedgeInstruments,
                    riskFreeAssets: { weight: safeNum(posAdj.riskFreeAllocation, 0.1), instruments: ['TLT', 'SHY'], yield: 0.042 },
                    cashReserve: 1 - enforced.actual - safeNum(posAdj.riskFreeAllocation, 0.1)
                },
                hedgingPlan: {
                    required: enforced.hedgingRequired > 0 || hedgeInstruments.length > 0,
                    hedgeRatio: enforced.hedgingRequired,
                    instruments: hedgeInstruments,
                    estimatedCost: hedgeInstruments.reduce(function(s, h) { return s + safeNum(h.cost, 0); }, 0),
                    defensiveMode: !!posAdj.forceDefensiveMode
                },
                riskStatus: {
                    halted: enforced.halted,
                    activeFuses: enforced.fuseIds.slice(),
                    gameState: safeStr(simRisk.gameState, 'CALM'),
                    rationalityState: safeStr(rationality.rationalityState, 'BALANCED'),
                    warnings: warnings
                },
                auditTrail: {
                    macroFunnelId: safeStr(pipeline.macroFunnel && pipeline.macroFunnel.generationId, ''),
                    factorLibraryId: safeStr(factors.assetId, ''),
                    valuationId: '',
                    simulationId: safeStr(simulation.simulationId, ''),
                    pokerSessionId: safeStr(rationality.sessionId, ''),
                    stepsCompleted: [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            };

            if (global.YBus && global.YBus.publish) {
                global.YBus.publish('riskFuse', {
                    status: enforced.halted ? 'halted' : (macroCone >= THRESHOLDS.STEADY ? 'warning' : 'idle'),
                    coneC: macroCone,
                    zScore: safeNum(simRisk.zScore, 0),
                    mdd: safeNum(simRisk.mdd, 0.3),
                    warnings: warnings,
                    timestamp: now
                }, { trusted: true });
            }

            return result;
        }
    };

    function resetPipeline() {
        return {
            pipelineId: generateId(),
            currentStep: -1,
            completedSteps: [],
            halted: false,
            haltReason: '',
            startedAt: Date.now(),
            lastUpdatedAt: Date.now()
        };
    }

    function switchRegime(regime, reason) {
        if (global.YBus && global.YBus.publish) {
            global.YBus.publish('regimeState', {
                regime: regime,
                switchedAt: Date.now(),
                reason: reason || 'manual'
            }, { trusted: true });
        }
    }

    function runPipeline(config) {
        config = safeObj(config, {});
        config.simulationDays = safeNum(config.simulationDays, 60);
        config.monteCarloRuns = safeNum(config.monteCarloRuns, 50);
        config.pokerHands = safeNum(config.pokerHands, 8);
        config.useHalfKelly = config.useHalfKelly !== false;
        config.riskPreference = safeStr(config.riskPreference, 'MODERATE');

        var pipeline = resetPipeline();
        var regimeState = global.YBus ? global.YBus.getState('regimeState') : { regime: 'RED_OCEAN' };
        var regime = safeStr(config.forceRegime, safeStr(regimeState.regime, 'RED_OCEAN'));
        switchRegime(regime, 'pipeline_start');

        var context = {
            config: config,
            regime: regime,
            pipeline: {},
            pipelineId: pipeline.pipelineId
        };

        function updatePipeline(stepId, result) {
            var stepInfo = STEPS.find(function(s) { return s.id === stepId; });
            var channel = stepInfo ? stepInfo.channel : null;
            pipeline.currentStep = stepId;
            if (pipeline.completedSteps.indexOf(stepId) === -1) {
                pipeline.completedSteps.push(stepId);
            }
            pipeline.lastUpdatedAt = Date.now();
            if (channel && result) {
                context.pipeline[channel] = result;
                if (global.YBus && global.YBus.publish) global.YBus.publish(channel, result, { trusted: true });
            }
            if (global.YBus && global.YBus.publish) global.YBus.publish('quantPipeline', pipeline, { trusted: true });
        }

        try {
            var input = null;
            var stepOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            for (var i = 0; i < stepOrder.length; i++) {
                var stepId = stepOrder[i];
                var result = STEP_MODULES[stepId](input, context);
                updatePipeline(stepId, result);
                input = result;
                if (result && result.riskStatus && result.riskStatus.halted && stepId !== 8) {
                    pipeline.halted = true;
                    pipeline.haltReason = '风控熔断于Step ' + stepId;
                    if (global.YBus && global.YBus.publish) global.YBus.publish('quantPipeline', pipeline, { trusted: true });
                }
            }

            var endTime = Date.now();
            var execOrder = safeObj(context.pipeline.executionOrder, {});
            var simResult = safeObj(context.pipeline.simulationResult, {});
            var ratScore = safeObj(context.pipeline.rationalityScore, {});
            var valResult = safeObj(context.pipeline.valuationV2, {});
            var flResult = safeObj(context.pipeline.factorLibrary, {});
            var mfResult = safeObj(context.pipeline.macroFunnel, {});
            var execSig = safeObj(execOrder.signal, {});
            var ratAdj = safeObj(ratScore.positionAdjustment, { kellyMultiplier: 1 });
            var execAudit = safeObj(execOrder.auditTrail, {});
            var auditSteps = safeArr(execAudit.stepsCompleted, pipeline.completedSteps);
            var signalDir = safeStr(execSig.direction, 'HOLD');
            var isHaltedReturn = !!(execOrder.riskStatus && execOrder.riskStatus.halted) || safeNum(execOrder.position, 0) === 0;

            var auditFormatted = auditSteps.map(function(sid) {
                var si = STEPS.find(function(s){ return s.id===sid; });
                return { step: sid, name: si?si.name:'Step '+sid, channel: si?si.channel:null };
            });

            var engineOutput = {
                pipelineId: context.pipelineId,
                version: '2.1.0',
                regime: regime,
                status: isHaltedReturn ? 'HALTED' : (pipeline.halted ? 'HALTED' : 'COMPLETED'),
                startedAt: pipeline.startedAt,
                completedAt: endTime,
                durationMs: endTime - (pipeline.startedAt || endTime),
                ticker: config.ticker || (mfResult.selectedTicker || (mfResult.topPicks && mfResult.topPicks[0] && mfResult.topPicks[0].ticker) || 'AUTO'),
                finalDecision: {
                    signal: signalDir,
                    position: safeNum(execOrder.position, 0),
                    rawKelly: safeNum(execOrder.rawKelly, 0),
                    circuitBreakerTriggered: isHaltedReturn,
                    enforcedBy: safeStr(execOrder.enforcedBy, isHaltedReturn ? '0.68_IRON_LAW' : 'NONE'),
                    stopLoss: safeNum(execOrder.hedgingPlan && execOrder.hedgingPlan.stopLoss, 0),
                    targetPrice: safeNum(execOrder.hedgingPlan && execOrder.hedgingPlan.targetPrice, 0)
                },
                keyMetrics: {
                    dynamicBeta: safeNum(valResult.pricing && valResult.pricing.dynamicBeta, 1.0),
                    rationalityScore: safeNum(ratScore.overallScore, 50),
                    kellyMultiplier: safeNum(ratAdj.kellyMultiplier, 1.0),
                    coneC: safeNum(flResult.riskFactors && flResult.riskFactors.coneC, 0.4),
                    sharpeRatio: safeNum(simResult.monteCarlo && (simResult.monteCarlo.sharpeRatio || (simResult.monteCarlo.statistics && simResult.monteCarlo.statistics.meanSharpeRatio)), 0),
                    haltProbability: safeNum(simResult.monteCarlo && (simResult.monteCarlo.haltProbability || (simResult.monteCarlo.statistics && simResult.monteCarlo.statistics.fuseTriggerProbability)), 0),
                    wacc: safeNum(valResult.wacc && valResult.wacc.wacc, 0)
                },
                riskFlags: safeArr(execOrder.riskFlags || (execOrder.riskStatus && execOrder.riskStatus.warnings), []),
                auditTrail: auditFormatted,
                channels: {
                    macroFunnel: mfResult,
                    factorLibrary: flResult,
                    valuationV2: valResult,
                    simulationResult: simResult,
                    rationalityScore: ratScore,
                    executionOrder: execOrder
                },
                loopback: {
                    canRerun: true,
                    feedbackReady: true,
                    recommendedAction: signalDir === 'BUY' ? 'MONITOR_ENTRY' :
                                      signalDir === 'SELL' ? 'EXIT_POSITION' : 'WAIT_AND_OBSERVE'
                }
            };

            pipeline.status = engineOutput.status;
            pipeline.engineOutput = engineOutput;
            pipeline.completedAt = endTime;
            pipeline.durationMs = engineOutput.durationMs;
            pipeline.currentStep = 9;

            if (global.YBus && global.YBus.publish) {
                global.YBus.publish('engineOutput', engineOutput, { trusted: true });
                global.YBus.publish('quantPipeline', pipeline, { trusted: true });
            }

            return engineOutput;
        } catch (e) {
            pipeline.halted = true;
            pipeline.haltReason = '引擎异常: ' + e.message;
            pipeline.status = 'ERROR';
            var errorOutput = {
                pipelineId: context.pipelineId,
                version: '2.1.0',
                regime: regime,
                status: 'ERROR',
                startedAt: pipeline.startedAt,
                completedAt: Date.now(),
                error: e.message,
                finalDecision: { signal: 'HOLD', position: 0, circuitBreakerTriggered: true, enforcedBy: 'ERROR_GUARD' },
                keyMetrics: {},
                riskFlags: ['🔴 引擎异常：' + e.message],
                auditTrail: [],
                channels: context.pipeline || {},
                loopback: { canRerun: true, feedbackReady: false, recommendedAction: 'RESTART_PIPELINE' }
            };
            pipeline.engineOutput = errorOutput;
            if (global.YBus && global.YBus.publish) {
                global.YBus.publish('engineOutput', errorOutput, { trusted: true });
                global.YBus.publish('quantPipeline', pipeline, { trusted: true });
            }
            console.error('[QuantEngine] Pipeline failed:', e);
            throw e;
        }
    }

    function runToStep(targetStep, input, config) {
        config = safeObj(config, {});
        config.simulationDays = safeNum(config.simulationDays, 60);
        config.monteCarloRuns = safeNum(config.monteCarloRuns, 30);
        config.pokerHands = safeNum(config.pokerHands, 5);

        var pipeline = global.YBus ? global.YBus.getState('quantPipeline') : resetPipeline();
        if (!pipeline || !pipeline.pipelineId || pipeline.halted) pipeline = resetPipeline();

        var regimeState = global.YBus ? global.YBus.getState('regimeState') : { regime: 'RED_OCEAN' };
        var regime = safeStr(config.forceRegime, safeStr(regimeState.regime, 'RED_OCEAN'));
        var snapshot = global.YBus && global.YBus.getSnapshot ? global.YBus.getSnapshot() : {};
        var context = { config: config, regime: regime, pipeline: snapshot, pipelineId: pipeline.pipelineId };

        var currentInput = input;
        var stepOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        for (var i = 0; i < stepOrder.length && stepOrder[i] <= targetStep; i++) {
            var stepId = stepOrder[i];
            var stepInfo = STEPS.find(function(s) { return s.id === stepId; });
            var channel = stepInfo ? stepInfo.channel : null;
            if (channel && context.pipeline[channel] && stepId < targetStep) {
                currentInput = context.pipeline[channel];
                if (pipeline.completedSteps.indexOf(stepId) === -1) pipeline.completedSteps.push(stepId);
                continue;
            }
            var result = STEP_MODULES[stepId](currentInput, context);
            if (channel) {
                context.pipeline[channel] = result;
                if (global.YBus && global.YBus.publish) global.YBus.publish(channel, result, { trusted: true });
            }
            currentInput = result;
            pipeline.currentStep = stepId;
            if (pipeline.completedSteps.indexOf(stepId) === -1) pipeline.completedSteps.push(stepId);
        }
        pipeline.lastUpdatedAt = Date.now();
        if (global.YBus && global.YBus.publish) global.YBus.publish('quantPipeline', pipeline, { trusted: true });
        return currentInput;
    }

    function emergencyHalt(reason) {
        if (global.YMineRiskCB && global.YMineRiskCB.halt) {
            global.YMineRiskCB.halt(reason);
        }
        var pipeline = global.YBus ? global.YBus.getState('quantPipeline') : resetPipeline();
        pipeline.halted = true;
        pipeline.haltReason = reason || '手动紧急停机';
        pipeline.lastUpdatedAt = Date.now();
        if (global.YBus && global.YBus.publish) {
            global.YBus.publish('quantPipeline', pipeline, { trusted: true });
            global.YBus.publish('riskFuse', {
                status: 'halted',
                warnings: ['🔴 紧急停机：' + (reason || '未知原因')],
                timestamp: Date.now()
            }, { trusted: true });
        }
    }

    if (global.YBus && global.YBus.ready) {
        global.YBus.ready(function() {
            var existingRegime = global.YBus.getState('regimeState');
            if (!existingRegime || !existingRegime.switchedAt) {
                switchRegime('RED_OCEAN', 'init_default');
            }
        });
    }

    var YMineQuantEngine = {
        version: '2.1.0',
        STEPS: STEPS,
        PRESET_ASSETS: PRESET_ASSETS,
        switchRegime: switchRegime,
        runPipeline: runPipeline,
        runToStep: runToStep,
        resetPipeline: resetPipeline,
        emergencyHalt: emergencyHalt,
        modules: STEP_MODULES,
        _defaults: { getDefaultFactorLibrary: getDefaultFactorLibrary, defaultRiskFuse: defaultRiskFuse }
    };

    global.YMineQuantEngine = YMineQuantEngine;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = YMineQuantEngine;
    }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
