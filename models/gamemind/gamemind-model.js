'use strict';

/**
 * @namespace YModels.gamemind
 * @description Independent game-theory / Nash-equilibrium model.
 * Simulates a 2-player game with an iterated best-response algorithm to locate
 * approximate Nash equilibria, then maps convergence distance to a normalized risk score.
 * Imports only from YModels.common normalizer. No references to calc or compute.
 */
(function (global) {
    const common = global.YModels && global.YModels.common;
    const cfg = global.YModels && global.YModels.gamemind && global.YModels.gamemind.config;

    if (!common) {
        throw new Error('YModels.common (normalizer.js) must be loaded before gamemind-model.js');
    }
    if (!cfg) {
        throw new Error('YModels.gamemind.config (gamemind-config.js) must be loaded before gamemind-model.js');
    }

    const { clamp01, absDiff, safeNum, generateId } = common;
    const { nashConvergenceEpsilon, maxIterations, initialBelief, explorationRate, thresholds, logPrefix } = cfg;
    const { BREAKEVEN, STEADY, FUSE } = thresholds;

    /**
     * @private
     * @description Append an audit entry to localStorage under the gamemind log namespace.
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
            // silently continue if storage is unavailable
        }
    };

    /**
     * @private
     * @description Build a 2x2 payoff matrix from inputData. The matrix represents a generic
     * market-participation game: rows = our actions (0=AGGRESSIVE, 1=COOPERATE),
     * cols = opponent actions (0=AGGRESSIVE, 1=COOPERATE). Values are our payoffs.
     * @param {Object} input - Input data with optional fields: competitionIntensity,
     *                         marketGrowth, cooperationBonus, priceWarCost
     * @returns {number[][]} 2x2 payoff matrix for the row player (us)
     */
    const buildPayoffMatrix = (input) => {
        const intensity = clamp01(safeNum(input.competitionIntensity, 0.5));
        const growth = clamp01(safeNum(input.marketGrowth, 0.5));
        const coopBonus = clamp01(safeNum(input.cooperationBonus, 0.3));
        const warCost = clamp01(safeNum(input.priceWarCost, 0.4));

        const cooperateVsCoop = 0.5 + coopBonus + growth * 0.3;
        const coopVsAgg = 0.2 - warCost * 0.5;
        const aggVsCoop = 0.6 + intensity * 0.2 - growth * 0.1;
        const aggVsAgg = 0.3 - warCost * 0.3 + intensity * 0.1;

        return [
            [aggVsAgg, aggVsCoop],
            [coopVsAgg, cooperateVsCoop]
        ];
    };

    /**
     * @private
     * @description Compute the best-response action for the row player given a belief
     * about the column player's probability of playing action 0 (AGGRESSIVE).
     * @param {number[][]} payoff - 2x2 payoff matrix
     * @param {number} beliefOppAgg - Probability in [0,1] that opponent plays AGGRESSIVE
     * @returns {{ action: number, expectedPayoff: number }} Best-response action and its expected payoff
     */
    const bestResponse = (payoff, beliefOppAgg) => {
        const p = clamp01(beliefOppAgg);
        const eu0 = payoff[0][0] * p + payoff[0][1] * (1 - p);
        const eu1 = payoff[1][0] * p + payoff[1][1] * (1 - p);
        if (eu0 >= eu1) {
            return { action: 0, expectedPayoff: eu0 };
        }
        return { action: 1, expectedPayoff: eu1 };
    };

    /**
     * @private
     * @description Run iterated best-response dynamics until convergence or max iterations.
     * Alternates between updating our belief and the opponent's best response.
     * @param {number[][]} payoff - 2x2 payoff matrix
     * @returns {{ belief: number, iterations: number, converged: boolean, finalAction: number }}
     */
    const iterateBestResponse = (payoff) => {
        let ourBelief = safeNum(initialBelief, 0.5);
        let iterations = 0;
        let converged = false;
        let lastBelief = -1;
        let finalAction = 1;

        for (let i = 0; i < maxIterations; i += 1) {
            iterations = i + 1;

            const explore = Math.random() < explorationRate;
            let br;
            if (explore) {
                br = { action: Math.random() < 0.5 ? 0 : 1, expectedPayoff: 0 };
            } else {
                br = bestResponse(payoff, ourBelief);
            }
            finalAction = br.action;

            const oppPayoff = [
                [payoff[0][0], payoff[1][0]],
                [payoff[0][1], payoff[1][1]]
            ];
            const opponentBeliefAboutUs = 1 - ourBelief;
            const oppBR = bestResponse(oppPayoff, opponentBeliefAboutUs);

            const newBelief = oppBR.action === 0
                ? ourBelief + (1 - ourBelief) * 0.5
                : ourBelief * 0.5;

            if (Math.abs(newBelief - lastBelief) < nashConvergenceEpsilon) {
                ourBelief = newBelief;
                converged = true;
                break;
            }
            lastBelief = ourBelief;
            ourBelief = newBelief;
        }

        return {
            belief: clamp01(ourBelief),
            iterations: iterations,
            converged: converged,
            finalAction: finalAction
        };
    };

    /**
     * @private
     * @description Map convergence result and payoff structure to a market regime label.
     * BLUE_OCEAN represents cooperative/growth equilibria; RED_OCEAN represents competitive price-war equilibria.
     * @param {number} finalBelief - Our final belief that opponent plays aggressive
     * @param {number[][]} payoff - Payoff matrix
     * @returns {string} 'RED_OCEAN' | 'BLUE_OCEAN'
     */
    const classifyRegime = (finalBelief, payoff) => {
        const coopPayoff = payoff[1][1];
        const aggPayoff = payoff[0][0];
        if (coopPayoff > aggPayoff && finalBelief < 0.5) {
            return 'BLUE_OCEAN';
        }
        return 'RED_OCEAN';
    };

    /**
     * Create a fresh, isolated instance of the gamemind model.
     * Each instance carries its own state, payoff matrix, and convergence results.
     * @memberof YModels.gamemind
     * @param {Object} inputData - Input object with optional fields competitionIntensity,
     *                             marketGrowth, cooperationBonus, priceWarCost
     * @returns {Object} Instance object with evaluate() and destroy() methods
     */
    const createInstance = (inputData) => {
        const instanceId = generateId();
        let destroyed = false;

        /**
         * @private
         * @type {Object}
         * @description Per-instance state (not shared across instances).
         */
        const state = {
            input: inputData ? Object.assign({}, inputData) : {},
            payoffMatrix: null,
            result: null,
            lastRun: null
        };

        /**
         * Run the Nash-equilibrium game simulation independently for this instance.
         * Builds a payoff matrix from input, runs iterated best-response, and maps
         * the result to a normalized equilibrium score, strategy recommendation,
         * market regime, Nash stability metric, and fuse check.
         * @memberof YModels.gamemind
         * @instance
         * @returns {Object} Result object:
         *   { equilibriumScore, strategyRecommendation, marketRegime, nashStability, fuseCheck }
         *   or { error: true, message: string }
         */
        const evaluate = () => {
            if (destroyed) {
                return { error: true, message: 'Instance has been destroyed' };
            }
            try {
                state.payoffMatrix = buildPayoffMatrix(state.input);
                const nash = iterateBestResponse(state.payoffMatrix);

                const convergenceRatio = nash.iterations / maxIterations;
                const distancePenalty = nash.converged ? 0 : convergenceRatio * 0.3;
                const rawEquilibrium = 1 - distancePenalty - nash.belief * 0.3;
                const equilibriumScore = clamp01(rawEquilibrium);

                const strategy = nash.finalAction === 1
                    ? clamp01(0.3 + equilibriumScore * 0.4)
                    : clamp01(0.1 + (1 - equilibriumScore) * 0.3);
                const strategyRecommendation = strategy;

                const marketRegime = classifyRegime(nash.belief, state.payoffMatrix);
                const nashStability = clamp01(nash.converged ? 1 - convergenceRatio * 0.3 : 0.2);
                const fuseCheck = equilibriumScore <= FUSE;

                const result = {
                    equilibriumScore: equilibriumScore,
                    strategyRecommendation: strategyRecommendation,
                    marketRegime: marketRegime,
                    nashStability: nashStability,
                    fuseCheck: fuseCheck
                };

                state.result = result;
                state.lastRun = Date.now();

                appendAudit({
                    instanceId: instanceId,
                    event: 'evaluate',
                    equilibriumScore: equilibriumScore,
                    strategyRecommendation: strategyRecommendation,
                    marketRegime: marketRegime,
                    nashStability: nashStability,
                    fuseCheck: fuseCheck,
                    iterations: nash.iterations,
                    converged: nash.converged
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
         * @memberof YModels.gamemind
         * @instance
         * @returns {void}
         */
        const destroy = () => {
            destroyed = true;
            state.input = null;
            state.payoffMatrix = null;
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

    const gamemindModel = {
        createInstance: createInstance
    };

    if (!global.YModels) {
        global.YModels = {};
    }
    global.YModels.gamemind = Object.assign({}, global.YModels.gamemind, gamemindModel);
})(typeof window !== 'undefined' ? window : globalThis);
