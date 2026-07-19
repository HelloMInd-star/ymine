/**
 * Game-OS Core Engine · Kelly Criterion Base Framework
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Universal Kelly formula framework, half/quarter Kelly
 *           scaling factor range, optimal investment base interval,
 *           Kelly multiplier calibration logic framework.
 * DOES NOT contain: Any industry-specific win rate, odds,
 *           individual position private variables, influencer
 *           monetization parameters, or any business-private values.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_KellyBase = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var clamp = Internal.clamp;

    function calcRawKelly(winRate, winLossRatio) {
        var p = clamp(safeNum(winRate, 0.5), 0, 1);
        var b = safeNum(winLossRatio, 1);
        if (b <= 0) return 0;
        var q = 1 - p;
        var kelly = p - (q / b);
        return clamp(kelly, 0, 1);
    }

    function applyKellyScaling(rawKelly, scalingFactor) {
        var raw = clamp(safeNum(rawKelly, 0), 0, 1);
        var sf = safeNum(scalingFactor, C.KELLY_HALF_FACTOR);
        sf = clamp(sf, 0, 1);
        return raw * sf;
    }

    function optimalBandCheck(position) {
        var pos = clamp(safeNum(position, 0), 0, 1);
        return {
            position: pos,
            inOptimalBand: pos >= C.KELLY_OPTIMAL_MIN && pos <= C.KELLY_OPTIMAL_MAX,
            tooConservative: pos < C.KELLY_OPTIMAL_MIN,
            tooAggressive: pos > C.KELLY_OPTIMAL_MAX,
            bandMin: C.KELLY_OPTIMAL_MIN,
            bandMax: C.KELLY_OPTIMAL_MAX
        };
    }

    function calibrateKellyMultiplier(baseMultiplier, rationalityScore, payload) {
        var base = safeNum(baseMultiplier, 1.0);
        var rs = clamp(safeNum(rationalityScore, 50), 0, 100);
        var tiltAdjust = safeNum(payload && payload.tiltAdjustment, 1.0);
        var regimeAdjust = safeNum(payload && payload.regimeAdjustment, 1.0);
        var businessAdjust = safeNum(payload && payload.businessAdjustment, 1.0);
        var calibrated = base * (rs / 100 + 0.5) * tiltAdjust * regimeAdjust * businessAdjust;
        return clamp(calibrated, 0, 2.0);
    }

    function evaluateKellyAllocation(payload) {
        var p = Internal.safeObj(payload);
        var rawKelly = calcRawKelly(p.winRate, p.winLossRatio);
        var scaledKelly = applyKellyScaling(rawKelly, p.scalingFactor);
        var rationalityScore = clamp(safeNum(p.rationalityScore, 50), 0, 100);
        var kellyMultiplier = calibrateKellyMultiplier(
            safeNum(p.kellyMultiplier, 1.0),
            rationalityScore,
            {
                tiltAdjustment: p.tiltAdjustment,
                regimeAdjustment: p.regimeAdjustment,
                businessAdjustment: p.businessAdjustment
            }
        );
        var finalPosition = clamp(scaledKelly * kellyMultiplier, 0, 1);
        var bandCheck = optimalBandCheck(finalPosition);
        return {
            rawKelly: rawKelly,
            scaledKelly: scaledKelly,
            scalingFactor: clamp(safeNum(p.scalingFactor, C.KELLY_HALF_FACTOR), 0, 1),
            rationalityScore: rationalityScore,
            kellyMultiplier: kellyMultiplier,
            finalPosition: finalPosition,
            optimalBand: bandCheck,
            enforcedPosition: finalPosition
        };
    }

    return Object.freeze({
        name: 'kelly-base',
        version: Internal.VERSION,
        calcRawKelly: calcRawKelly,
        applyKellyScaling: applyKellyScaling,
        optimalBandCheck: optimalBandCheck,
        calibrateKellyMultiplier: calibrateKellyMultiplier,
        evaluate: evaluateKellyAllocation
    });
});
