'use strict';

/**
 * @namespace YModels.gamemind.config
 * @description Independent configuration for the game-theory / Nash-equilibrium model.
 * No cross-imports from calc or compute modules. Thresholds are defined locally (copied).
 */
(function (global) {
    /**
     * @private
     * @type {Object}
     * @description Threshold constants for gamemind model (copied, not referenced).
     */
    const thresholds = Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    const config = Object.freeze({
        /**
         * @type {number}
         * @description Convergence epsilon for iterated best-response: when belief changes
         * fall below this value, the strategy is considered to have reached Nash equilibrium.
         */
        nashConvergenceEpsilon: 0.02,

        /**
         * @type {number}
         * @description Maximum number of best-response iterations before forcing termination.
         */
        maxIterations: 50,

        /**
         * @type {number}
         * @description Starting prior belief (0-1) that the opponent plays cooperatively.
         */
        initialBelief: 0.5,

        /**
         * @type {number}
         * @description Probability of taking an exploratory (non-best-response) action.
         */
        explorationRate: 0.1,

        /**
         * @type {Object}
         * @description Frozen thresholds (BREAKEVEN/STEADY/FUSE)
         */
        thresholds: thresholds,

        /**
         * @type {string}
         * @description localStorage key prefix for gamemind model persistence
         */
        storagePrefix: 'game_',

        /**
         * @type {string}
         * @description localStorage namespace for append-only audit logs
         */
        logPrefix: 'audit_log_game'
    });

    if (!global.YModels) {
        global.YModels = {};
    }
    if (!global.YModels.gamemind) {
        global.YModels.gamemind = {};
    }
    global.YModels.gamemind.config = config;
})(typeof window !== 'undefined' ? window : globalThis);
