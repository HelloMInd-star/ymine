'use strict';

/**
 * @namespace YModels.calc
 * @description Independent financial valuation model.
 * Provides deterministic valuation scoring via WACC/DCF/relative-valuation blend,
 * Kelly-criterion position sizing, and threshold-based risk classification.
 * Imports only from YModels.common normalizer. No cross-model references.
 */
(function (global) {
    const common = global.YModels && global.YModels.common;
    const cfg = global.YModels && global.YModels.calc && global.YModels.calc.config;

    if (!common) {
        throw new Error('YModels.common (normalizer.js) must be loaded before calc-model.js');
    }
    if (!cfg) {
        throw new Error('YModels.calc.config (calc-config.js) must be loaded before calc-model.js');
    }

    const { clamp01, absDiff, safeNum, generateId } = common;
    const { waccBase, riskFreeRate, equityPremium, kellyFraction, maxPosition, thresholds, logPrefix } = cfg;
    const { BREAKEVEN, STEADY, FUSE } = thresholds;

    /**
     * @private
     * @description Append an audit entry to localStorage under the calc log namespace.
     * @param {Object} entry - Audit entry to persist (must be JSON-serializable)
     * @returns {void}
     */
    const appendAudit = (entry) => {
        try {
            const raw = global.localStorage ? global.localStorage.getItem(logPrefix) : null;
            const log = raw ? JSON.parse(raw) : [];
            log.push(Object.assign({ ts: Date.now() }, entry));
            if (global.localStorage) {
                global.localStorage.setItem(logPrefix, JSON.stringify(log));
            }
        } catch (_) {
            // localStorage unavailable or quota exceeded; silently continue
        }
    };

    /**
     * @private
     * @description Compute a WACC-based valuation component.
     * Uses safeNum to extract relevant input fields and normalizes a score around the cost of capital.
     * @param {Object} input - Input data object
     * @returns {number} Normalized WACC score in [0,1]
     */
    const computeWaccScore = (input) => {
        const beta = safeNum(input.beta, 1.0);
        const costOfDebt = safeNum(input.costOfDebt, waccBase);
        const debtRatio = safeNum(input.debtRatio, 0.3);
        const taxRate = safeNum(input.taxRate, 0.25);
        const costOfEquity = riskFreeRate + beta * equityPremium;
        const effectiveWacc = debtRatio * costOfDebt * (1 - taxRate) + (1 - debtRatio) * costOfEquity;
        const spread = waccBase - effectiveWacc;
        return clamp01(0.5 + spread * 4);
    };

    /**
     * @private
     * @description Compute a relative-valuation component (P/E proxy).
     * Compares the input multiple to a fair-value baseline to produce a normalized score.
     * @param {Object} input - Input data object
     * @returns {number} Normalized relative-valuation score in [0,1]
     */
    const computeRelativeScore = (input) => {
        const pe = safeNum(input.peRatio, 15);
        const fairPe = safeNum(input.fairPe, 15);
        const ratio = fairPe / Math.max(pe, 1);
        const discount = ratio - 1;
        return clamp01(0.5 + discount * 1.5);
    };

    /**
     * @private
     * @description Compute a DCF-proxy score based on growth, discount rate, and margin.
     * Uses a simplified Gordon-growth-style approximation mapped to [0,1].
     * @param {Object} input - Input data object
     * @returns {number} Normalized DCF-proxy score in [0,1]
     */
    const computeDcfProxyScore = (input) => {
        const growth = safeNum(input.growthRate, 0.05);
        const margin = safeNum(input.margin, 0.15);
        const discount = waccBase;
        const spread = growth - discount;
        const raw = 0.5 + spread * 3 + margin * 0.8;
        return clamp01(raw);
    };

    /**
     * @private
     * @description Compute the Kelly-inspired position fraction given a valuation score and
     * a perceived edge, then risk-adjust and clamp it.
     * @param {number} score - Valuation score in [0,1]
     * @param {Object} input - Original input (used for winRate/confidence if provided)
     * @returns {number} Recommended position fraction in [0, maxPosition]
     */
    const computeKellyPosition = (score, input) => {
        const winRate = safeNum(input.winRate, score);
        const lossRate = 1 - winRate;
        const winLossRatio = safeNum(input.winLossRatio, 1.2);
        let kelly = 0;
        if (winLossRatio > 0) {
            kelly = winRate - lossRate / winLossRatio;
        }
        const edgeAdjusted = kelly * kellyFraction * (0.5 + score * 0.5);
        return Math.max(0, Math.min(maxPosition, edgeAdjusted));
    };

    /**
     * @private
     * @description Classify risk level based on the valuation score and fuse state.
     * @param {number} score - Valuation score in [0,1]
     * @param {boolean} fuseOk - Whether fuse threshold is respected (score <= FUSE)
     * @returns {string} 'LOW' | 'MEDIUM' | 'HIGH' | 'FUSE'
     */
    const classifyRisk = (score, fuseOk) => {
        if (!fuseOk) return 'FUSE';
        if (score >= STEADY + 0.1) return 'LOW';
        if (score >= STEADY) return 'MEDIUM';
        return 'HIGH';
    };

    /**
     * Create a fresh, isolated instance of the calc model.
     * Each instance maintains its own state and does not share mutable closures with other instances.
     * @memberof YModels.calc
     * @param {Object} inputData - Input object containing beta, costOfDebt, debtRatio, taxRate,
     *                             peRatio, fairPe, growthRate, margin, winRate, winLossRatio, etc.
     * @returns {Object} Instance object with evaluate() and destroy() methods
     */
    const createInstance = (inputData) => {
        const instanceId = generateId();
        let destroyed = false;

        /**
         * @private
         * @type {Object}
         * @description Per-instance intermediate result storage (not persisted to localStorage).
         */
        const state = {
            input: inputData ? Object.assign({}, inputData) : {},
            waccScore: null,
            relativeScore: null,
            dcfScore: null,
            valuationScore: null,
            lastRun: null
        };

        /**
         * Run the financial valuation independently for this instance.
         * Blends WACC, relative valuation, and DCF proxy into a single normalized score,
         * applies Kelly sizing, checks thresholds, and returns the result object.
         * On error returns { error: true, message: string } without throwing.
         * @memberof YModels.calc
         * @instance
         * @returns {Object} Result object:
         *   { valuationScore, positionRecommendation, riskLevel, breakEvenCheck, fuseCheck }
         *   or { error: true, message: string }
         */
        const evaluate = () => {
            if (destroyed) {
                return { error: true, message: 'Instance has been destroyed' };
            }
            try {
                state.waccScore = computeWaccScore(state.input);
                state.relativeScore = computeRelativeScore(state.input);
                state.dcfScore = computeDcfProxyScore(state.input);

                const w = 0.4;
                const r = 0.3;
                const d = 0.3;
                const blended = w * state.waccScore + r * state.relativeScore + d * state.dcfScore;
                const score = clamp01(blended);
                state.valuationScore = score;
                state.lastRun = Date.now();

                const breakEvenCheck = score >= BREAKEVEN;
                const fuseCheck = score <= FUSE;
                const riskLevel = classifyRisk(score, fuseCheck);
                const positionRecommendation = fuseCheck ? computeKellyPosition(score, state.input) : 0;

                const result = {
                    valuationScore: score,
                    positionRecommendation: clamp01(positionRecommendation),
                    riskLevel: riskLevel,
                    breakEvenCheck: breakEvenCheck,
                    fuseCheck: fuseCheck
                };

                appendAudit({
                    instanceId: instanceId,
                    event: 'evaluate',
                    valuationScore: score,
                    positionRecommendation: result.positionRecommendation,
                    riskLevel: riskLevel,
                    breakEvenCheck: breakEvenCheck,
                    fuseCheck: fuseCheck
                });

                return result;
            } catch (err) {
                const errResult = { error: true, message: err && err.message ? err.message : String(err) };
                appendAudit({
                    instanceId: instanceId,
                    event: 'error',
                    message: errResult.message
                });
                return errResult;
            }
        };

        /**
         * Clear all instance state and mark the instance as destroyed.
         * After calling destroy(), evaluate() will return an error.
         * @memberof YModels.calc
         * @instance
         * @returns {void}
         */
        const destroy = () => {
            destroyed = true;
            state.input = null;
            state.waccScore = null;
            state.relativeScore = null;
            state.dcfScore = null;
            state.valuationScore = null;
            state.lastRun = null;
            appendAudit({
                instanceId: instanceId,
                event: 'destroy'
            });
        };

        appendAudit({
            instanceId: instanceId,
            event: 'create'
        });

        return {
            evaluate: evaluate,
            destroy: destroy
        };
    };

    const calcModel = {
        createInstance: createInstance
    };

    if (!global.YModels) {
        global.YModels = {};
    }
    global.YModels.calc = Object.assign({}, global.YModels.calc, calcModel);
})(typeof window !== 'undefined' ? window : globalThis);
