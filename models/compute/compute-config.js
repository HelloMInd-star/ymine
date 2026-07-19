'use strict';

/**
 * @namespace YModels.compute.config
 * @description Independent configuration for the compute/load/peak-shaving model.
 * Uses a V/S/L geometry model for compute concentration. No cross-imports from calc or gamemind.
 * Thresholds are defined locally (copied, not referenced).
 */
(function (global) {
    /**
     * @private
     * @type {Object}
     * @description Threshold constants for compute model.
     */
    const thresholds = Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    const config = Object.freeze({
        /**
         * @type {number}
         * @description Volume scale factor for V/S/L compute geometry.
         */
        vScale: 1.0,

        /**
         * @type {number}
         * @description Surface-area scale factor for V/S/L compute geometry.
         */
        sScale: 1.0,

        /**
         * @type {number}
         * @description Length scale factor for V/S/L compute geometry.
         */
        lScale: 1.0,

        /**
         * @type {number}
         * @description Overhead ratio for KV-cache/prefill phase (0-1).
         */
        prefillOverheadRatio: 0.6,

        /**
         * @type {number}
         * @description Memory ratio consumed during decode phase (0-1).
         */
        decodeMemoryRatio: 0.4,

        /**
         * @type {number}
         * @description Load threshold above which peak-shaving is triggered (0-1).
         */
        peakShaveThreshold: 0.5,

        /**
         * @type {number}
         * @description Fuse threshold for compute load: loads at or above this trigger circuit-breaker.
         */
        fuseLoadThreshold: 0.68,

        /**
         * @type {Object}
         * @description Frozen thresholds (BREAKEVEN/STEADY/FUSE)
         */
        thresholds: thresholds,

        /**
         * @type {string}
         * @description localStorage key prefix for compute model persistence
         */
        storagePrefix: 'compute_',

        /**
         * @type {string}
         * @description localStorage namespace for append-only audit logs
         */
        logPrefix: 'audit_log_compute'
    });

    if (!global.YModels) {
        global.YModels = {};
    }
    if (!global.YModels.compute) {
        global.YModels.compute = {};
    }
    global.YModels.compute.config = config;
})(typeof window !== 'undefined' ? window : globalThis);
