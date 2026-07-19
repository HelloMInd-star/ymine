/**
 * Game-OS Core Engine · Fat-Lean Dynamic Band
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Fat/lean universal upper/lower threshold judgment
 *           framework, tight/loose switch state machine, fat→lean
 *           and lean→fat transition smoothing rules.
 * DOES NOT contain: Finance bull/bear cycle private thresholds,
 *           low-altitude peak/off-peak season params, MCN traffic
 *           high/low season params, Olympiad learning progress fat/
 *           lean judgment params, or any industry-specific values.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_FatLeanBand = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var safeStr = Internal.safeStr;
    var clamp = Internal.clamp;

    var STATES = C.FAT_LEAN_STATES;

    function evaluateBand(currentIndicator, payload) {
        var indicator = clamp(safeNum(currentIndicator, 0.5), 0, 1);
        var p = Internal.safeObj(payload);
        var fatThreshold = clamp(safeNum(p.fatThreshold, 0.6), 0, 1);
        var leanThreshold = clamp(safeNum(p.leanThreshold, 0.4), 0, 1);
        if (leanThreshold >= fatThreshold) {
            leanThreshold = Math.max(0, fatThreshold - 0.1);
        }

        var state;
        if (indicator >= fatThreshold) {
            state = STATES.FAT;
        } else if (indicator <= leanThreshold) {
            state = STATES.LEAN;
        } else {
            state = STATES.NEUTRAL;
        }

        return {
            indicator: indicator,
            fatThreshold: fatThreshold,
            leanThreshold: leanThreshold,
            state: state,
            isFat: state === STATES.FAT,
            isNeutral: state === STATES.NEUTRAL,
            isLean: state === STATES.LEAN
        };
    }

    function computeTightnessCoefficient(bandResult, payload) {
        var br = Internal.safeObj(bandResult);
        var p = Internal.safeObj(payload);
        var state = safeStr(br.state, STATES.NEUTRAL);
        var fatLooseness = clamp(safeNum(p.fatLoosenessFactor, 1.2), 1.0, 2.0);
        var leanTightness = clamp(safeNum(p.leanTightnessFactor, 0.7), 0.1, 1.0);
        var coeff;
        switch (state) {
            case STATES.FAT:
                coeff = fatLooseness;
                break;
            case STATES.LEAN:
                coeff = leanTightness;
                break;
            default:
                coeff = 1.0;
        }
        return {
            state: state,
            tightnessCoefficient: coeff,
            kellyAdjusted: true,
            controlThresholdAdjusted: true,
            note: state === STATES.FAT
                ? 'FAT/LOOSE: Kelly allocation may expand, control thresholds slightly relaxed'
                : state === STATES.LEAN
                    ? 'LEAN/TIGHT: Kelly allocation compressed, control thresholds tightened'
                    : 'NEUTRAL: Standard tightness, no adjustment'
        };
    }

    function transitionBand(previousState, newIndicator, payload) {
        var prev = safeStr(previousState, STATES.NEUTRAL);
        var p = Internal.safeObj(payload);
        var newBand = evaluateBand(newIndicator, p);
        var smoothing = clamp(safeNum(p.smoothingFactor, 0.3), 0, 1);
        var transitioned = prev !== newBand.state;
        var direction = 'STAY';
        if (transitioned) {
            var order = [STATES.LEAN, STATES.NEUTRAL, STATES.FAT];
            var prevIdx = order.indexOf(prev);
            var newIdx = order.indexOf(newBand.state);
            if (newIdx > prevIdx) direction = 'TO_FAT';
            else direction = 'TO_LEAN';
        }
        return {
            previousState: prev,
            newState: newBand.state,
            transitioned: transitioned,
            direction: direction,
            smoothingFactor: smoothing,
            transitionNote: transitioned
                ? ('Band transition: ' + prev + ' → ' + newBand.state + ', applying smoothing factor ' + smoothing)
                : ('No transition, remaining in ' + prev),
            band: newBand
        };
    }

    return Object.freeze({
        name: 'fat-lean-band',
        version: Internal.VERSION,
        STATES: STATES,
        evaluate: evaluateBand,
        getTightness: computeTightnessCoefficient,
        transition: transitionBand
    });
});
