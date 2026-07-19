'use strict';

/**
 * @namespace YModels.common
 * @description Shared utility module for YModels - the ONLY shared code across all models.
 * Provides normalization, safety, and ID generation utilities.
 */
(function (global) {
    /**
     * @private
     * @type {Object}
     * @description Threshold constants shared across models.
     * @property {number} BREAKEVEN - Minimum breakeven threshold (0.48)
     * @property {number} STEADY - Steady state threshold (0.50)
     * @property {number} FUSE - Fuse/circuit breaker threshold (0.68)
     */
    const THRESHOLDS = Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    /**
     * @private
     * @type {number}
     * @description Counter for unique ID generation.
     */
    let idCounter = 0;

    /**
     * Clamp a numeric value to the [0, 1] range.
     * @param {number} v - The value to clamp
     * @returns {number} Value clamped between 0 and 1 inclusive
     */
    const clamp01 = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, n));
    };

    /**
     * Compute the absolute difference between two numbers.
     * @param {number} a - First operand
     * @param {number} b - Second operand
     * @returns {number} Absolute difference |a - b|
     */
    const absDiff = (a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return NaN;
        return Math.abs(na - nb);
    };

    /**
     * Safely parse a value as a number, returning fallback on failure.
     * @param {*} v - The value to parse
     * @param {number} fallback - Fallback value if parsing fails (default: 0)
     * @returns {number} Parsed number or fallback
     */
    const safeNum = (v, fallback = 0) => {
        if (v === null || v === undefined) return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    /**
     * Generate a unique pipeline/audit ID.
     * Format: ymid-<timestamp>-<counter>-<random>
     * @returns {string} Unique identifier string
     */
    const generateId = () => {
        idCounter += 1;
        const ts = Date.now().toString(36);
        const cnt = idCounter.toString(36);
        const rnd = Math.random().toString(36).slice(2, 8);
        return `ymid-${ts}-${cnt}-${rnd}`;
    };

    const common = {
        THRESHOLDS,
        clamp01,
        absDiff,
        safeNum,
        generateId
    };

    if (!global.YModels) {
        global.YModels = {};
    }
    global.YModels.common = Object.freeze(common);
})(typeof window !== 'undefined' ? window : globalThis);
