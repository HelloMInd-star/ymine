/**
 * Game-OS Core Engine · Dynamic Circle Constraint Boundary
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Universal circle contraction/expansion framework,
 *           cone concentration C calculation, boundary breach
 *           detection, multi-point locking force mechanics
 *           coordination framework.
 * DOES NOT contain: Financial cone valuation parameters, MCN
 *           influencer circle pricing coefficients, drone airspace
 *           circle radii, Olympiad difficulty circle thresholds,
 *           or any industry-specific slope/weight private values.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_CircleBoundary = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var safeArr = Internal.safeArr;
    var safeObj = Internal.safeObj;
    var clamp = Internal.clamp;

    function computeConeConcentration(factors, payload) {
        var f = safeArr(factors);
        var p = safeObj(payload);
        var weights = safeArr(p.weights);
        var weightedSum = 0;
        var totalWeight = 0;
        for (var i = 0; i < f.length; i++) {
            var val = clamp(safeNum(f[i], 0), 0, 1);
            var w = safeNum(weights[i], 1 / Math.max(f.length, 1));
            weightedSum += val * w;
            totalWeight += w;
        }
        if (totalWeight === 0) totalWeight = 1;
        var coneC = clamp(weightedSum / totalWeight, 0, 1);
        var slope = safeNum(p.boundarySlope, C.GOV_BASELINE_SLOPE);
        var zScore = (coneC - C.FUSE_BASELINE) / Math.max(safeNum(p.volatility, 0.2), 0.001);
        return {
            coneC: coneC,
            slope: slope,
            zScore: zScore,
            breached: coneC >= C.FUSE_BASELINE,
            breachMargin: coneC / C.FUSE_BASELINE,
            warning: coneC >= C.FUSE_BASELINE * 0.7 && coneC < C.FUSE_BASELINE
        };
    }

    function contractCircle(currentConeC, contractionForce, payload) {
        var c = clamp(safeNum(currentConeC, 0), 0, 1);
        var force = clamp(safeNum(contractionForce, 0), 0, 1);
        var p = safeObj(payload);
        var resistCoef = clamp(safeNum(p.resistanceCoefficient, 0.1), 0, 1);
        var newC = clamp(c - force * (1 - resistCoef), 0, 1);
        return {
            previousC: c,
            newC: newC,
            contractionForce: force,
            resistanceCoefficient: resistCoef,
            delta: newC - c
        };
    }

    function expandCircle(currentConeC, expansionForce, payload) {
        var c = clamp(safeNum(currentConeC, 0), 0, 1);
        var force = clamp(safeNum(expansionForce, 0), 0, 1);
        var p = safeObj(payload);
        var resistCoef = clamp(safeNum(p.resistanceCoefficient, 0.1), 0, 1);
        var newC = clamp(c + force * (1 - resistCoef), 0, 1);
        return {
            previousC: c,
            newC: newC,
            expansionForce: force,
            resistanceCoefficient: resistCoef,
            delta: newC - c,
            willBreach: newC >= C.FUSE_BASELINE
        };
    }

    function multiPointLocking(lockPoints, payload) {
        var pts = safeArr(lockPoints);
        var p = safeObj(payload);
        var totalLockForce = 0;
        var maxDeviation = 0;
        var lockedCount = 0;
        var criticalDeviation = clamp(safeNum(p.criticalDeviation, 0.68), 0, 1);
        if (pts.length === 0) {
            return {
                lockPointsCount: 0,
                lockedCount: 0,
                stabilityScore: 1.0,
                maxDeviation: 0,
                criticalDeviation: criticalDeviation,
                systemStable: true,
                note: 'NO_LOCK_POINTS_PROVIDED_DEFAULT_STABLE'
            };
        }
        for (var i = 0; i < pts.length; i++) {
            var pt = safeObj(pts[i]);
            var dev = clamp(safeNum(pt.deviation, 0), 0, 1);
            var lf = clamp(safeNum(pt.lockForce, 0), 0, 1);
            if (dev <= criticalDeviation) {
                totalLockForce += lf;
                lockedCount++;
            }
            if (dev > maxDeviation) maxDeviation = dev;
        }
        var stabilityScore = clamp(totalLockForce / Math.max(pts.length, 1), 0, 1);
        return {
            lockPointsCount: pts.length,
            lockedCount: lockedCount,
            stabilityScore: stabilityScore,
            maxDeviation: maxDeviation,
            criticalDeviation: criticalDeviation,
            systemStable: maxDeviation < criticalDeviation && stabilityScore >= 0.5
        };
    }

    function evaluateBoundary(payload) {
        var p = safeObj(payload);
        var coneResult = computeConeConcentration(p.factors, {
            weights: p.weights,
            boundarySlope: p.boundarySlope,
            volatility: p.volatility
        });
        var lockResult = multiPointLocking(p.lockPoints, {
            criticalDeviation: p.criticalDeviation
        });
        return {
            cone: coneResult,
            locking: lockResult,
            boundaryBreached: coneResult.breached || !lockResult.systemStable,
            recommendedAction: coneResult.breached
                ? C.LOOPBACK_ACTIONS.HALT
                : coneResult.warning
                    ? C.LOOPBACK_ACTIONS.WAIT
                    : C.LOOPBACK_ACTIONS.PROCEED
        };
    }

    return Object.freeze({
        name: 'circle-boundary',
        version: Internal.VERSION,
        computeCone: computeConeConcentration,
        contract: contractCircle,
        expand: expandCircle,
        multiPointLock: multiPointLocking,
        evaluate: evaluateBoundary
    });
});
