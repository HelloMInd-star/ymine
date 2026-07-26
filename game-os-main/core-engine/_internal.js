/**
 * Game-OS Core Engine · Internal Shared Utilities
 * ============================================================
 * LAYER 1: Core Internal Module (NOT exposed to business layer)
 * DO NOT require this file from business-modules/
 * Only common-api.js may load internal modules.
 *
 * NOTE: When YModels.common is available (loaded on the same page),
 * this module delegates to the canonical implementations in
 * models/common/normalizer.js to avoid code duplication.
 * When running standalone (Node.js or pages without YModels),
 * self-contained fallback implementations are used.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root._GameOS_CoreInternal = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CORE_VERSION = '1.0.1';
    var CORE_LOCKED = true;

    var GLOBAL_CONSTANTS = Object.freeze({
        FUSE_BASELINE: 0.68,
        GOV_BASELINE_SLOPE: 0.5,
        KELLY_OPTIMAL_MIN: 0.30,
        KELLY_OPTIMAL_MAX: 0.50,
        KELLY_HALF_FACTOR: 0.5,
        KELLY_QUARTER_FACTOR: 0.25,
        POSITION_ZERO: 0,
        FOUR_LAYERS: Object.freeze({
            L1_FULL_AUTO: 'L1_FULL_AUTO',
            L2_ASSISTED: 'L2_ASSISTED',
            L3_HUMAN_INTERVENE: 'L3_HUMAN_INTERVENE',
            L4_EXTREME_FALLBACK: 'L4_EXTREME_FALLBACK'
        }),
        FAT_LEAN_STATES: Object.freeze({
            FAT: 'FAT',
            NEUTRAL: 'NEUTRAL',
            LEAN: 'LEAN'
        }),
        FUSE_CATEGORIES: Object.freeze({
            BLACK_SWAN: 'BLACK_SWAN',
            SYSTEMIC_COLLAPSE: 'SYSTEMIC_COLLAPSE',
            MAX_DRAWDOWN: 'MAX_DRAWDOWN',
            EMOTIONAL_TILT: 'EMOTIONAL_TILT',
            VALUATION: 'VALUATION',
            MANUAL_KILLSWITCH: 'MANUAL_KILLSWITCH',
            RESERVED: 'RESERVED'
        }),
        STATUS_CODES: Object.freeze({
            OK: 200,
            BAD_PARAM: 400,
            UNAUTHORIZED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            CORE_ERROR: 500
        }),
        LOOPBACK_ACTIONS: Object.freeze({
            MONITOR: 'MONITOR_ENTRY',
            EXIT: 'EXIT_POSITION',
            WAIT: 'WAIT_AND_OBSERVE',
            RESTART: 'RESTART_PIPELINE',
            PROCEED: 'PROCEED',
            HALT: 'HALT_AND_INVESTIGATE'
        })
    });

    var _common = (typeof window !== 'undefined' && window.YModels && window.YModels.common)
        ? window.YModels.common
        : null;

    function safeNum(v, def) {
        if (_common && _common.safeNum) {
            return _common.safeNum(v, def !== undefined ? def : 0);
        }
        return typeof v === 'number' && !isNaN(v) && isFinite(v) ? v : (def || 0);
    }

    function safeObj(v, def) {
        if (_common && _common.safeObj) {
            return _common.safeObj(v, def || {});
        }
        return v && typeof v === 'object' && !Array.isArray(v) ? v : (def || {});
    }

    function safeArr(v, def) {
        if (_common && _common.safeArr) {
            return _common.safeArr(v, def || []);
        }
        return Array.isArray(v) ? v : (def || []);
    }

    function safeStr(v, def) {
        if (_common && _common.safeStr) {
            return _common.safeStr(v, def || '');
        }
        return typeof v === 'string' && v.length > 0 ? v : (def || '');
    }

    function isValidNumber(v) {
        if (_common && _common.isValidNumber) {
            return _common.isValidNumber(v);
        }
        return typeof v === 'number' && !isNaN(v) && isFinite(v);
    }

    function generateId(prefix) {
        if (_common && _common.generateId) {
            return _common.generateId(prefix);
        }
        var p = (typeof prefix === 'string' && prefix.length > 0) ? prefix : 'g';
        var ts = Date.now().toString(36);
        var rnd = Math.random().toString(36).substring(2, 8);
        return p + '_' + ts + rnd;
    }

    function hashObj(obj) {
        if (_common && _common.hashObj) {
            return _common.hashObj(obj);
        }
        var s = JSON.stringify(obj) || '';
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return h.toString(36);
    }

    function clamp(v, min, max) {
        if (_common && _common.clamp) {
            return _common.clamp(v, min, max);
        }
        v = safeNum(v, 0);
        return Math.max(min, Math.min(max, v));
    }

    return Object.freeze({
        VERSION: CORE_VERSION,
        LOCKED: CORE_LOCKED,
        CONST: GLOBAL_CONSTANTS,
        safeNum: safeNum,
        safeObj: safeObj,
        safeArr: safeArr,
        safeStr: safeStr,
        isValidNumber: isValidNumber,
        generateId: generateId,
        hashObj: hashObj,
        clamp: clamp
    });
});
