/**
 * Circle Cognitive Engine · Public API Gateway
 * ============================================================
 * LAYER 2: Circle Module Public API for Game-OS
 *
 * Theory foundation: Motor-Cognitive Coupling (运动-认知耦合)
 * Core architecture: 3→1→1→3→100
 *   - 3 base dimensions: Demand(speed), Supply(radius), Policy(center offset)
 *   - 1 core: System equilibrium point
 *   - 1 transferable architecture: Circle layer structure
 *   - 3 delivery dimensions: Theory, Experiment, Validation
 *   - 100 industry application scenarios
 *
 * Naming convention: All APIs prefixed with circle_
 * All private weights, thresholds, coefficients marked as PLACEHOLDER
 * and must be filled in private engine repository ymine-circle-cognitive-engine
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.CircleAPI = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var API_VERSION = '2.1.0';
    var MODULE_ID = 'circle-cognitive';

    // ============================================================
    // PRIVATE ENGINE PLACEHOLDER
    // All weights, thresholds, coefficients below are PLACEHOLDERS
    // 【需在私有circle认知引擎内配置填充】
    // ============================================================
    var PRIVATE_WEIGHTS = {
        // Founder matching weights (五大维度加权)
        founderWeights: {
            founderAbility: null,      // 【需私有引擎填充】创始人能力权重
            decisionQuality: null,     // 【需私有引擎填充】决策质量权重
            cognitiveAccuracy: null,   // 【需私有引擎填充】认知准确度权重
            marketFit: null,           // 【需私有引擎填充】市场适配度权重
            executionEfficiency: null  // 【需私有引擎填充】执行效率权重
        },
        // Bias weights (三类心理偏差)
        biasWeights: {
            anchoring: null,           // 【需私有引擎填充】锚定偏差权重
            lossAversion: null,        // 【需私有引擎填充】损失厌恶权重
            overconfidence: null       // 【需私有引擎填充】过度自信权重
        },
        // Market thresholds
        marketThresholds: {
            blueSeaVolatility: null,   // 【需私有引擎填充】蓝海波动率上限
            redSeaVolatility: null,    // 【需私有引擎填充】红海波动率下限
            convergenceSpeed: null,    // 【需私有引擎填充】收敛速度系数
            profitCompression: null    // 【需私有引擎填充】利润压缩系数
        },
        // Tracking metrics thresholds
        trackingThresholds: {
            roundnessPerfect: null,    // 【需私有引擎填充】圆度完美阈值
            roundnessGood: null,       // 【需私有引擎填充】圆度良好阈值
            radialErrorMax: null,      // 【需私有引擎填充】径向误差最大值
            speedVariationMax: null    // 【需私有引擎填充】速度变异最大值
        },
        // Matching thresholds
        matchThresholds: {
            highMatch: 0.75,           // 高匹配 >75%
            mediumMatch: 0.50          // 中等匹配 50%~75%, 低匹配 <50%
        }
    };

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    function safeNum(v, def) { return typeof v === 'number' && !isNaN(v) ? v : (def || 0); }
    function safeObj(o) { return o && typeof o === 'object' ? o : {}; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function buildSuccess(data, loopback) {
        return {
            code: 200,
            message: 'OK',
            moduleId: MODULE_ID,
            version: API_VERSION,
            data: data,
            loopback: loopback || { canRerun: true, feedbackReady: false, recommendedAction: 'CONTINUE', status: 'IDLE' }
        };
    }

    function buildError(code, message) {
        return {
            code: code || 500,
            message: message,
            moduleId: MODULE_ID,
            version: API_VERSION,
            data: null,
            loopback: { canRerun: true, feedbackReady: false, recommendedAction: 'RESET', status: 'ERROR' }
        };
    }

    // Check fuse baseline 0.6
    function checkFuse(riskConcentration) {
        var risk = safeNum(riskConcentration, 0);
        if (risk > 0.6) {
            return {
                halted: true,
                reason: 'RISK_EXCEEDS_0.6_FUSE',
                riskLevel: risk
            };
        }
        return { halted: false, riskLevel: risk };
    }

    // ============================================================
    // API 1: circle_static_solve
    // Static mode: Ji-Tu Tong-Long (鸡兔同笼) linear equations
    // Variable mapping: chickens=demand, rabbits=supply
    //   totalHeads = elastic constraint
    //   totalLegs  = hard policy constraint
    // Static circle = special case of dynamic with speed=0
    // ============================================================
    function staticSolve(payload) {
        var totalHeads = safeNum(payload.totalHeads);
        var totalLegs = safeNum(payload.totalLegs);

        if (totalHeads <= 0 || totalLegs <= 0) {
            return buildError(400, 'INVALID_INPUT: totalHeads and totalLegs must be positive');
        }

        // Solve: chickens + rabbits = totalHeads
        //        2*chickens + 4*rabbits = totalLegs
        var rabbits = (totalLegs - 2 * totalHeads) / 2;
        var chickens = totalHeads - rabbits;

        if (chickens < 0 || rabbits < 0 || !Number.isInteger(chickens) || !Number.isInteger(rabbits)) {
            return buildError(400, 'NO_SOLUTION: Constraints conflict, no integer solution exists');
        }

        // Equilibrium point = intersection of two lines
        var equilibrium = {
            x: rabbits,  // supply (horizontal axis)
            y: chickens, // demand (vertical axis)
            stability: 1.0 // static = perfect stability
        };

        return buildSuccess({
            mode: 'static',
            model: 'chicken_rabbit_linear',
            solution: {
                chickens: chickens,  // 鸡数量 = 需求
                rabbits: rabbits,    // 兔数量 = 供给
                totalHeads: totalHeads, // 弹性约束
                totalLegs: totalLegs   // 政策硬性约束
            },
            equilibrium: equilibrium,
            circleParams: {
                centerX: equilibrium.x,
                centerY: equilibrium.y,
                radius: Math.min(chickens, rabbits) / 2,
                speed: 0 // static = speed zero special case
            },
            lineEquations: {
                line1: 'x + y = ' + totalHeads,
                line2: '2x + 4y = ' + totalLegs
            }
        });
    }

    // ============================================================
    // API 2: circle_dynamic_evolve
    // Dynamic mode: Evolving circles with drifting center,
    // fluctuating radius, continuous rotation
    // Blue sea / Red sea market simulation
    // Black swan shock slider
    // ============================================================
    function dynamicEvolve(payload) {
        var initialDemand = safeNum(payload.initialDemand, 50);
        var initialSupply = safeNum(payload.initialSupply, 50);
        var policyOffset = safeNum(payload.policyOffset, 0);
        var marketType = payload.marketType || 'blue_sea'; // blue_sea | red_sea
        var blackSwanShock = safeNum(payload.blackSwanShock, 0);
        var ticks = safeNum(payload.ticks, 60);

        var fuse = checkFuse(Math.abs(blackSwanShock) / 100);
        if (fuse.halted) {
            return buildError(403, 'FUSE_TRIGGERED: ' + fuse.reason + ' · Operation locked');
        }

        // 【需在私有circle认知引擎内配置填充】
        // Private coefficients for market simulation
        var volatility = marketType === 'red_sea'
            ? (PRIVATE_WEIGHTS.marketThresholds.redSeaVolatility || 0.15)
            : (PRIVATE_WEIGHTS.marketThresholds.blueSeaVolatility || 0.05);

        var convergenceSpeed = PRIVATE_WEIGHTS.marketThresholds.convergenceSpeed || 0.95;
        var profitCompression = PRIVATE_WEIGHTS.marketThresholds.profitCompression || 0.8;

        var timeSeries = [];
        var cx = initialSupply;
        var cy = initialDemand + policyOffset;
        var radius = Math.min(initialDemand, initialSupply) * 0.4;
        var angle = 0;

        for (var t = 0; t < ticks; t++) {
            // Random fluctuation based on market type
            var demandNoise = (Math.random() - 0.5) * 2 * volatility * 50;
            var supplyNoise = (Math.random() - 0.5) * 2 * volatility * 50;

            // Policy drift
            cx = cx * convergenceSpeed + (initialSupply + supplyNoise + policyOffset) * (1 - convergenceSpeed);
            cy = cy * convergenceSpeed + (initialDemand + demandNoise) * (1 - convergenceSpeed);

            // Radius adjustment
            var targetRadius = marketType === 'red_sea'
                ? radius * profitCompression // red sea compresses profit
                : radius * 1.02;
            radius = radius * 0.9 + targetRadius * 0.1;

            // Black swan shock effect
            if (blackSwanShock > 0 && t === Math.floor(ticks / 3)) {
                cx += (Math.random() - 0.5) * blackSwanShock;
                cy += (Math.random() - 0.5) * blackSwanShock;
                radius *= 0.7;
            }

            angle += 0.1 + volatility;

            timeSeries.push({
                t: t,
                centerX: cx,
                centerY: cy,
                radius: Math.max(5, radius),
                angle: angle,
                demand: cy,
                supply: cx
            });
        }

        var final = timeSeries[timeSeries.length - 1];
        var stability = 1 - volatility - Math.abs(blackSwanShock) / 200;
        var profitSpace = marketType === 'blue_sea' ? radius * 2 : radius * 0.5;

        return buildSuccess({
            mode: 'dynamic',
            marketType: marketType,
            policyOffset: policyOffset,
            blackSwanShock: blackSwanShock,
            timeSeries: timeSeries,
            finalState: {
                centerX: final.centerX,
                centerY: final.centerY,
                radius: final.radius,
                angle: final.angle
            },
            metrics: {
                equilibriumStability: clamp(stability, 0, 1),
                priceVolatility: volatility * 100,
                profitSpace: profitSpace,
                convergenceSpeed: convergenceSpeed,
                shockRecovered: t > ticks * 0.7 ? true : false
            }
        });
    }

    // ============================================================
    // API 3: circle_ai_feedback
    // AI Agent feedback loop
    //   user prompt = demand
    //   AI generated = supply
    //   context length = system elasticity
    //   system instruction = policy constraint
    //   token generation speed = running speed
    // ============================================================
    function aiFeedback(payload) {
        var prompt = payload.prompt || '';
        var systemInstruction = payload.systemInstruction || '';
        var contextLength = safeNum(payload.contextLength, 4096);
        var maxIterations = safeNum(payload.maxIterations, 10);

        if (!prompt) {
            return buildError(400, 'EMPTY_PROMPT: Input required');
        }

        // Simulate feedback iterations (public placeholder logic)
        // 【需在私有circle认知引擎内配置填充】Real LLM integration in private engine
        var iterations = [];
        var equilibrium = false;
        var convergenceScore = 0;

        for (var i = 0; i < maxIterations; i++) {
            var quality = Math.min(1, 0.3 + i * 0.08 + Math.random() * 0.1);
            var tokensUsed = Math.floor(prompt.length * (1 + i * 0.3));
            var contextUsage = clamp(tokensUsed / contextLength, 0, 1);

            iterations.push({
                iteration: i,
                quality: quality,
                tokensUsed: tokensUsed,
                contextUsage: contextUsage,
                feedback: i > 0 ? 'Refinement round ' + i : 'Initial generation',
                equilibriumDistance: 1 - quality
            });

            if (quality > 0.85 && contextUsage < 0.8) {
                equilibrium = true;
                convergenceScore = quality;
                break;
            }
        }

        return buildSuccess({
            mode: 'ai_feedback',
            loop: 'input→reason→feedback→iterate',
            mapping: {
                prompt: 'demand',
                generated: 'supply',
                contextLength: 'elasticity',
                systemInstruction: 'policy',
                tokenSpeed: 'rotation_speed'
            },
            iterations: iterations,
            result: {
                equilibriumReached: equilibrium,
                convergenceScore: convergenceScore || iterations[iterations.length - 1].quality,
                totalIterations: iterations.length,
                finalContextUsage: iterations[iterations.length - 1].contextUsage
            }
        });
    }

    // ============================================================
    // API 4: circle_tracking_collect
    // Human drawing trajectory collection
    // 4 core neuromotor metrics:
    //   - roundness (0~1)
    //   - radial error
    //   - speed variation coefficient
    //   - total center drift
    // PDCA alignment: Plan=expected circle, Do=actual drawing,
    //                  Check=radial error, Act=improvement
    // ============================================================
    function trackingCollect(payload) {
        var points = payload.points || [];
        var expectedRadius = safeNum(payload.expectedRadius, 100);

        if (points.length < 10) {
            return buildError(400, 'INSUFFICIENT_POINTS: Need at least 10 trajectory points');
        }

        // Calculate center (centroid)
        var cx = 0, cy = 0;
        points.forEach(function (p) { cx += p.x; cy += p.y; });
        cx /= points.length;
        cy /= points.length;

        // Calculate radii for each point
        var radii = points.map(function (p) {
            return Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
        });

        // Mean radius
        var meanRadius = radii.reduce(function (a, b) { return a + b; }, 0) / radii.length;

        // Radial error (RMSE)
        var radialError = Math.sqrt(
            radii.reduce(function (sum, r) { return sum + (r - expectedRadius) * (r - expectedRadius); }, 0) / radii.length
        );

        // Roundness (1 - normalized radial error)
        var roundness = clamp(1 - radialError / expectedRadius, 0, 1);

        // Speed variation coefficient
        var speeds = [];
        for (var i = 1; i < points.length; i++) {
            var dt = points[i].t - points[i - 1].t;
            if (dt > 0) {
                var dx = points[i].x - points[i - 1].x;
                var dy = points[i].y - points[i - 1].y;
                speeds.push(Math.sqrt(dx * dx + dy * dy) / dt);
            }
        }
        var meanSpeed = speeds.length ? speeds.reduce(function (a, b) { return a + b; }, 0) / speeds.length : 0;
        var speedStd = speeds.length ? Math.sqrt(
            speeds.reduce(function (sum, s) { return sum + (s - meanSpeed) * (s - meanSpeed); }, 0) / speeds.length
        ) : 0;
        var speedCV = meanSpeed > 0 ? speedStd / meanSpeed : 1;

        // Total center drift from expected center
        var expectedCenter = payload.expectedCenter || { x: 0, y: 0 };
        var centerDrift = Math.sqrt(
            (cx - expectedCenter.x) * (cx - expectedCenter.x) +
            (cy - expectedCenter.y) * (cy - expectedCenter.y)
        );

        return buildSuccess({
            mode: 'tracking',
            pdcaMapping: {
                plan: 'expected dashed circle',
                do: 'actual hand-drawn trajectory',
                check: 'radial prediction error',
                act: 'roundness improvement iteration'
            },
            metrics: {
                roundness: roundness,
                radialError: radialError,
                speedVariation: speedCV,
                centerDrift: centerDrift,
                meanRadius: meanRadius,
                sampleCount: points.length
            },
            center: { x: cx, y: cy },
            rating: roundness > 0.85 ? 'EXCELLENT' : roundness > 0.7 ? 'GOOD' : roundness > 0.5 ? 'FAIR' : 'NEEDS_PRACTICE'
        });
    }

    // ============================================================
    // API 5: circle_bias_compare
    // Dual decision control group
    //   - Rational baseline: Bayesian pure rational decision
    //   - Real human: anchoring, loss aversion, overconfidence
    // Output: decision accuracy, convergence speed, expected return delta
    // ============================================================
    function biasCompare(payload) {
        var infoAccuracy = clamp(safeNum(payload.infoAccuracy, 0.7), 0, 1);
        var feedbackSpeed = clamp(safeNum(payload.feedbackSpeed, 0.5), 0, 1);
        var scenario = payload.scenario || 'investment';

        // 【需在私有circle认知引擎内配置填充】Actual bias weights from private engine
        var anchoringWeight = PRIVATE_WEIGHTS.biasWeights.anchoring || 0.15;
        var lossAversionWeight = PRIVATE_WEIGHTS.biasWeights.lossAversion || 0.2;
        var overconfidenceWeight = PRIVATE_WEIGHTS.biasWeights.overconfidence || 0.12;

        // Rational Bayesian decision (baseline)
        var rationalAccuracy = infoAccuracy * feedbackSpeed * 0.9 + 0.1;
        var rationalConvergence = 5 + Math.floor((1 - feedbackSpeed) * 10);
        var rationalReturn = infoAccuracy * 0.3;

        // Human with biases
        var biasTotal = anchoringWeight + lossAversionWeight + overconfidenceWeight;
        var humanAccuracy = rationalAccuracy * (1 - biasTotal * 0.5);
        var humanConvergence = rationalConvergence + Math.floor(biasTotal * 8);
        var humanReturn = rationalReturn * (1 - lossAversionWeight) - overconfidenceWeight * 0.1;

        return buildSuccess({
            mode: 'bias_compare',
            groups: {
                rational: {
                    name: '贝叶斯理性基准组',
                    decisionAccuracy: rationalAccuracy,
                    convergenceSpeed: rationalConvergence,
                    expectedReturn: rationalReturn
                },
                human: {
                    name: '真实人脑组（带偏差）',
                    biases: {
                        anchoring: anchoringWeight,
                        lossAversion: lossAversionWeight,
                        overconfidence: overconfidenceWeight
                    },
                    decisionAccuracy: humanAccuracy,
                    convergenceSpeed: humanConvergence,
                    expectedReturn: humanReturn
                }
            },
            delta: {
                accuracyDelta: rationalAccuracy - humanAccuracy,
                convergenceDelta: humanConvergence - rationalConvergence,
                returnDelta: rationalReturn - humanReturn
            },
            note: '三类心理偏差：锚定偏差·损失厌恶·过度自信'
        });
    }

    // ============================================================
    // API 6: circle_market_blue_red
    // Blue sea / Red sea market simulation
    // Blue: low volatility, high stability, high profit
    // Red: high turbulence, poor stability, compressed profit
    // ============================================================
    function marketBlueRed(payload) {
        var marketType = payload.marketType || 'blue_sea';
        var policySupport = clamp(safeNum(payload.policySupport, 0.5), 0, 1);
        var competition = clamp(safeNum(payload.competition, 0.5), 0, 1);

        var metrics = {};

        if (marketType === 'blue_sea') {
            metrics = {
                volatility: 0.05 + competition * 0.1,
                stability: 0.8 - competition * 0.2,
                profitMargin: 0.4 - competition * 0.2 + policySupport * 0.15,
                convergenceSpeed: 0.9,
                description: '低波动·高均衡稳定性·高额利润空间'
            };
        } else {
            metrics = {
                volatility: 0.2 + competition * 0.2,
                stability: 0.3 - competition * 0.15,
                profitMargin: 0.08 - competition * 0.05 + policySupport * 0.1,
                convergenceSpeed: 0.6,
                description: '剧烈扰动·稳定性差·利润被持续压缩'
            };
        }

        return buildSuccess({
            mode: 'market_simulation',
            marketType: marketType,
            metrics: metrics,
            indicators: {
                entryRecommended: metrics.stability > 0.5 && metrics.profitMargin > 0.15,
                riskLevel: marketType === 'red_sea' ? 'HIGH' : 'LOW',
                fuseSafe: metrics.volatility < 0.6
            }
        });
    }

    // ============================================================
    // API 7: circle_match_rate
    // Founder-Business model matching rate
    // 5 weighted dimensions:
    //   founderAbility, decisionQuality, cognitiveAccuracy,
    //   marketFit, executionEfficiency
    // Ratings: >75% high, 50-75% medium, <50% low
    // ============================================================
    function matchRate(payload) {
        var scores = {
            founderAbility: clamp(safeNum(payload.founderAbility, 0.5), 0, 1),
            decisionQuality: clamp(safeNum(payload.decisionQuality, 0.5), 0, 1),
            cognitiveAccuracy: clamp(safeNum(payload.cognitiveAccuracy, 0.5), 0, 1),
            marketFit: clamp(safeNum(payload.marketFit, 0.5), 0, 1),
            executionEfficiency: clamp(safeNum(payload.executionEfficiency, 0.5), 0, 1)
        };

        // 【需在私有circle认知引擎内配置填充】Actual weights from private engine
        var w = PRIVATE_WEIGHTS.founderWeights;
        var weights = {
            founderAbility: w.founderAbility || 0.25,
            decisionQuality: w.decisionQuality || 0.20,
            cognitiveAccuracy: w.cognitiveAccuracy || 0.20,
            marketFit: w.marketFit || 0.20,
            executionEfficiency: w.executionEfficiency || 0.15
        };

        var totalScore =
            scores.founderAbility * weights.founderAbility +
            scores.decisionQuality * weights.decisionQuality +
            scores.cognitiveAccuracy * weights.cognitiveAccuracy +
            scores.marketFit * weights.marketFit +
            scores.executionEfficiency * weights.executionEfficiency;

        var rating;
        if (totalScore > PRIVATE_WEIGHTS.matchThresholds.highMatch) {
            rating = 'HIGH_MATCH';
        } else if (totalScore >= PRIVATE_WEIGHTS.matchThresholds.mediumMatch) {
            rating = 'MEDIUM_MATCH';
        } else {
            rating = 'LOW_MATCH';
        }

        return buildSuccess({
            mode: 'founder_match',
            dimensionScores: scores,
            weights: weights,
            totalMatchRate: totalScore,
            rating: rating,
            ratingThresholds: PRIVATE_WEIGHTS.matchThresholds,
            recommendation: rating === 'HIGH_MATCH' ? '推荐全力投入' :
                           rating === 'MEDIUM_MATCH' ? '建议补强短板后进入' :
                           '不推荐，建议重新评估'
        });
    }

    // ============================================================
    // MAIN DISPATCH
    // ============================================================
    function invoke(params) {
        var p = safeObj(params);
        var operation = p.operation || p.op || '';
        var payload = safeObj(p.payload || p.data);

        // Global fuse check
        var globalFuse = checkFuse(safeNum(payload.riskConcentration, 0));
        if (globalFuse.halted && operation !== 'health') {
            return buildError(403, 'GLOBAL_FUSE_TRIGGERED: ' + globalFuse.reason);
        }

        switch (operation) {
            case 'circle_static_solve':
                return staticSolve(payload);
            case 'circle_dynamic_evolve':
                return dynamicEvolve(payload);
            case 'circle_ai_feedback':
                return aiFeedback(payload);
            case 'circle_tracking_collect':
                return trackingCollect(payload);
            case 'circle_bias_compare':
                return biasCompare(payload);
            case 'circle_market_blue_red':
                return marketBlueRed(payload);
            case 'circle_match_rate':
                return matchRate(payload);
            case 'health':
                return buildSuccess({
                    healthy: true,
                    apiVersion: API_VERSION,
                    moduleId: MODULE_ID,
                    privateEngineConnected: false, // 【需私有引擎接入后改为true】
                    placeholderNote: '【需在私有circle认知引擎内配置填充】',
                    fuseBaseline: 0.6
                });
            default:
                return buildError(404, 'UNKNOWN_OPERATION: ' + operation);
        }
    }

    // Register with Game-OS if available
    function registerWithGameOS() {
        if (root.GameOS_API && typeof root.GameOS_API.registerModule === 'function') {
            root.GameOS_API.registerModule(MODULE_ID);
        }
    }

    // Auto-register on load
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', registerWithGameOS);
        } else {
            registerWithGameOS();
        }
    }

    return Object.freeze({
        name: 'circle-cognitive-api',
        version: API_VERSION,
        moduleId: MODULE_ID,
        invoke: invoke,
        // Direct access functions for convenience
        staticSolve: staticSolve,
        dynamicEvolve: dynamicEvolve,
        aiFeedback: aiFeedback,
        trackingCollect: trackingCollect,
        biasCompare: biasCompare,
        marketBlueRed: marketBlueRed,
        matchRate: matchRate,
        health: function () { return invoke({ operation: 'health' }); }
    });
});
