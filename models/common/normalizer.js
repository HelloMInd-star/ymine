'use strict';

/**
 * @namespace YModels.common
 * @description Shared utility module for YModels - the ONLY shared code across all models.
 * Provides normalization, safety, type checking, hashing, and ID generation utilities.
 * This is the canonical single source of truth for all helper functions.
 */
(function (global) {
    const THRESHOLDS = Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    let idCounter = 0;

    const clamp01 = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, n));
    };

    const clamp = (v, min, max) => {
        const n = Number(v);
        const mn = Number(min);
        const mx = Number(max);
        if (!Number.isFinite(n)) return Number.isFinite(mn) ? mn : 0;
        const lo = Number.isFinite(mn) ? mn : 0;
        const hi = Number.isFinite(mx) ? mx : 1;
        return Math.max(lo, Math.min(hi, n));
    };

    const absDiff = (a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isFinite(na) || !Number.isFinite(nb)) return NaN;
        return Math.abs(na - nb);
    };

    const isValidNumber = (v) => {
        return typeof v === 'number' && !isNaN(v) && isFinite(v);
    };

    const safeNum = (v, fallback = 0) => {
        if (v === null || v === undefined) return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    const safeObj = (v, def = {}) => {
        return v && typeof v === 'object' && !Array.isArray(v) ? v : def;
    };

    const safeArr = (v, def = []) => {
        return Array.isArray(v) ? v : def;
    };

    const safeStr = (v, def = '') => {
        return typeof v === 'string' && v.length > 0 ? v : def;
    };

    const safeBool = (v, def = false) => {
        if (typeof v === 'boolean') return v;
        if (v === 'true' || v === '1' || v === 1) return true;
        if (v === 'false' || v === '0' || v === 0) return false;
        return !!def;
    };

    const hashObj = (obj) => {
        const s = JSON.stringify(obj) || '';
        let h = 0;
        for (let i = 0; i < s.length; i += 1) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return h.toString(36);
    };

    const generateId = (prefix) => {
        idCounter += 1;
        const p = typeof prefix === 'string' && prefix.length > 0 ? prefix : 'ymid';
        const ts = Date.now().toString(36);
        const cnt = idCounter.toString(36);
        const rnd = Math.random().toString(36).slice(2, 8);
        return `${p}-${ts}-${cnt}-${rnd}`;
    };

    const deepClone = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
        const cloned = {};
        for (const key of Object.keys(obj)) {
            cloned[key] = deepClone(obj[key]);
        }
        return cloned;
    };

    const roundTo = (v, decimals = 2) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        const factor = Math.pow(10, Math.max(0, decimals));
        return Math.round(n * factor) / factor;
    };

    const common = Object.freeze({
        THRESHOLDS,
        clamp01,
        clamp,
        absDiff,
        isValidNumber,
        safeNum,
        safeObj,
        safeArr,
        safeStr,
        safeBool,
        hashObj,
        generateId,
        deepClone,
        roundTo
    });

    if (!global.YModels) {
        global.YModels = {};
    }
    global.YModels.common = common;
})(typeof window !== 'undefined' ? window : globalThis);
