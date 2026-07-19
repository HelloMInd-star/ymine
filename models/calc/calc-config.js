'use strict';

/**
 * @namespace YModels.calc.config
 * @description Independent configuration object for the financial calc model.
 * No imports from gamemind or compute modules. Thresholds are copied (not referenced) from common.
 */
(function (global) {
    /**
     * @private
     * @type {Object}
     * @description Threshold constants copied (deep-frozen) for calc model isolation.
     */
    const thresholds = Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    const config = Object.freeze({
        /**
         * @type {number}
         * @description Weighted Average Cost of Capital base rate (9.5%)
         */
        waccBase: 0.095,

        /**
         * @type {number}
         * @description Risk-free rate used in CAPM (3%)
         */
        riskFreeRate: 0.03,

        /**
         * @type {number}
         * @description Equity risk premium (5.5%)
         */
        equityPremium: 0.055,

        /**
         * @type {number}
         * @description Fraction of Kelly criterion to apply (half-Kelly for risk management)
         */
        kellyFraction: 0.5,

        /**
         * @type {number}
         * @description Maximum allowable position size (0-1 scale)
         */
        maxPosition: 1.0,

        /**
         * @type {Object}
         * @description Frozen threshold copy (BREAKEVEN/STEADY/FUSE)
         */
        thresholds: thresholds,

        /**
         * @type {string}
         * @description localStorage key prefix for calc model persistence
         */
        storagePrefix: 'calc_',

        /**
         * @type {string}
         * @description localStorage namespace for append-only audit logs
         */
        logPrefix: 'audit_log_calc'
    });

    if (!global.YModels) {
        global.YModels = {};
    }
    if (!global.YModels.calc) {
        global.YModels.calc = {};
    }
    global.YModels.calc.config = config;
})(typeof window !== 'undefined' ? window : globalThis);
