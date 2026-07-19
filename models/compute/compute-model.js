'use strict';

/**
 * @namespace YModels.compute
 * @description Independent compute / load / peak-shaving model.
 * Uses a V/S/L (Volume / Surface / Length) geometry model to estimate compute
 * concentration, applies prefill/decode overhead adjustments, and determines
 * whether peak-shaving or fuse activation is required.
 * Imports only from YModels.common normalizer. No references to calc or gamemind.
 */
(function (global) {
    const common = global.YModels && global.YModels.common;
    const cfg = global.YModels && global.YModels.compute && global.YModels.compute.config;

    if (!common) {
        throw new Error('YModels.common (normalizer.js) must be loaded before compute-model.js');
    }
    if (!cfg) {
        throw new Error('YModels.compute.config (compute-config.js) must be loaded before compute-model.js');
    }

    const { clamp01, absDiff, safeNum, generateId } = common;
    const {
        vScale, sScale, lScale,
        prefillOverheadRatio, decodeMemoryRatio,
        peakShaveThreshold, fuseLoadThreshold,
        thresholds, logPrefix
    } = cfg;
    const { FUSE } = thresholds;

    /**
     * @private
     * @description Append an audit entry to localStorage under the compute log namespace.
     * @param {Object} entry - Audit entry (JSON-serializable)
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
            // silently continue
        }
    };

    /**
     * @private
     * @description Compute the V/S/L effective concentration ratio.
     * V represents batch/token volume, S represents surface-area (parallelism / memory bandwidth),
     * L represents pipeline length (sequence length / layer depth).
     * Concentration = V / (S * L), higher = more compute-dense (hotter).
     * @param {Object} input - Input with volume, surface, length fields
     * @returns {{ concentration: number, vNorm: number, sNorm: number, lNorm: number }}
     */
    const computeConcentration = (input) => {
        const vRaw = safeNum(input.volume, 1.0);
        const sRaw = safeNum(input.surface, 1.0);
        const lRaw = safeNum(input.length, 1.0);

        const vNorm = clamp01(vRaw * vScale);
        const sNorm = clamp01(sRaw * sScale);
        const lNorm = clamp01(lRaw * lScale);

        const denom = Math.max(sNorm * lNorm, 0.05);
        const concentration = clamp01(vNorm / denom);

        return { concentration, vNorm, sNorm, lNorm };
    };

    /**
     * @private
     * @description Apply prefill and decode overhead ratios to derive current load score.
     * Prefill is bursty (multiplies concentration by prefill overhead factor);
     * decode is steady-state (adds decode memory pressure).
     * @param {number} concentration - Raw V/S/L concentration [0,1]
     * @param {Object} input - May contain prefillRatio (0-1)
     * @returns {number} Load score in [0,1]
     */
    const computeLoadScore = (concentration, input) => {
        const prefillRatio = clamp01(safeNum(input.prefillRatio, 0.5));
        const prefillComponent = concentration * prefillOverheadRatio * prefillRatio;
        const decodeComponent = concentration * decodeMemoryRatio * (1 - prefillRatio);
        const total = concentration + prefillComponent + decodeComponent;
        return clamp01(total);
    };

    /**
     * @private
     * @description Map concentration to a compute efficiency score: higher concentration
     * improves efficiency up to a point, after which contention reduces it.
     * @param {number} concentration - V/S/L concentration [0,1]
     * @returns {number} Efficiency in [0,1]
     */
    const computeEfficiency = (concentration) => {
        const sweetSpot = 0.6;
        const distance = Math.abs(concentration - sweetSpot);
        const raw = 1 - distance * 1.2;
        return clamp01(raw);
    };

    /**
     * Create a fresh, isolated instance of the compute model.
     * Each instance carries its own geometry inputs, intermediate results, and state.
     * @memberof YModels.compute
     * @param {Object} inputData - Input with volume, surface, length, prefillRatio, etc.
     * @returns {Object} Instance with evaluate() and destroy() methods
     */
    const createInstance = (inputData) => {
        const instanceId = generateId();
        let destroyed = false;

        /**
         * @private
         * @type {Object}
         * @description Per-instance state (no sharing across instances).
         */
        const state = {
            input: inputData ? Object.assign({}, inputData) : {},
            concentration: null,
            loadScore: null,
            efficiency: null,
            result: null,
            lastRun: null
        };

        /**
         * Run the compute load / peak-shaving assessment independently for this instance.
         * Computes V/S/L concentration, applies overheads, derives load score, determines
         * peak-shaving requirement, available headroom, efficiency, and fuse state.
         * @memberof YModels.compute
         * @instance
         * @returns {Object} Result:
         *   { computeEfficiency, loadScore, peakShaveRequired, availableCapacity, fuseCheck }
         *   or { error: true, message: string }
         */
        const evaluate = () => {
            if (destroyed) {
                return { error: true, message: 'Instance has been destroyed' };
            }
            try {
                const conc = computeConcentration(state.input);
                state.concentration = conc.concentration;

                const load = computeLoadScore(conc.concentration, state.input);
                state.loadScore = load;

                const eff = computeEfficiency(conc.concentration);
                state.efficiency = eff;

                const peakShaveRequired = load > peakShaveThreshold;
                const availableCapacity = clamp01(1 - load);
                const fuseCheck = load <= FUSE && load <= fuseLoadThreshold;

                const result = {
                    computeEfficiency: eff,
                    loadScore: load,
                    peakShaveRequired: peakShaveRequired,
                    availableCapacity: availableCapacity,
                    fuseCheck: fuseCheck
                };

                state.result = result;
                state.lastRun = Date.now();

                appendAudit({
                    instanceId: instanceId,
                    event: 'evaluate',
                    computeEfficiency: eff,
                    loadScore: load,
                    peakShaveRequired: peakShaveRequired,
                    availableCapacity: availableCapacity,
                    fuseCheck: fuseCheck,
                    concentration: conc.concentration
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
         * After destroy(), evaluate() returns an error.
         * @memberof YModels.compute
         * @instance
         * @returns {void}
         */
        const destroy = () => {
            destroyed = true;
            state.input = null;
            state.concentration = null;
            state.loadScore = null;
            state.efficiency = null;
            state.result = null;
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

    const computeModel = {
        createInstance: createInstance
    };

    if (!global.YModels) {
        global.YModels = {};
    }
    global.YModels.compute = Object.assign({}, global.YModels.compute, computeModel);
})(typeof window !== 'undefined' ? window : globalThis);
