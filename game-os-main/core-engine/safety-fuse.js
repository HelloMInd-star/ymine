/**
 * Game-OS Core Engine · 0.6 Fuse Safety Baseline
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Global 0.6 fuse baseline constant, universal fuse
 *           trigger entry, 7 fuse categories framework, forced
 *           position-to-zero logic, reset condition framework.
 * DOES NOT contain: Per-industry fuse trigger thresholds
 *           (business injects via payload), finance industry-level
 *           circuit-breaker business logic, low-altitude airspace
 *           conflict fuse params, MCN contract breach fuse conditions.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_SafetyFuse = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var safeBool = function (v, def) { return typeof v === 'boolean' ? v : !!def; };
    var safeStr = Internal.safeStr;
    var clamp = Internal.clamp;

    var FUSE_STATE = Object.freeze({
        ARMED: 'ARMED',
        TRIGGERED: 'TRIGGERED',
        COOLING: 'COOLING',
        RESET_PENDING: 'RESET_PENDING',
        RESET: 'RESET'
    });

    function evaluateFuseTriggers(payload) {
        var p = Internal.safeObj(payload);
        var coneC = clamp(safeNum(p.coneC, 0), 0, 1);
        var mdd = clamp(safeNum(p.maxDrawdown, 0), 0, 1);
        var tilt = clamp(safeNum(p.emotionalTilt, 0), 0, 1);
        var valuation = safeNum(p.valuationGap, 0);
        var blackSwan = safeBool(p.blackSwanEvent, false);
        var manualKill = safeBool(p.manualKillSwitch, false);
        var systemic = safeBool(p.systemicCollapse, false);
        var businessTriggered = safeBool(p.businessTrigger, false);
        var businessReason = safeStr(p.businessReason, '');

        var triggers = [];
        var overallHalt = false;
        var enforcedPosition = C.POSITION_ZERO;
        var fuseBy = 'NONE';

        if (blackSwan) {
            triggers.push({ category: C.FUSE_CATEGORIES.BLACK_SWAN, triggered: true, value: 1.0 });
            overallHalt = true; fuseBy = C.FUSE_CATEGORIES.BLACK_SWAN;
        }
        if (systemic) {
            triggers.push({ category: C.FUSE_CATEGORIES.SYSTEMIC_COLLAPSE, triggered: true, value: 1.0 });
            overallHalt = true; fuseBy = C.FUSE_CATEGORIES.SYSTEMIC_COLLAPSE;
        }
        if (manualKill) {
            triggers.push({ category: C.FUSE_CATEGORIES.MANUAL_KILLSWITCH, triggered: true, value: 1.0 });
            overallHalt = true; fuseBy = C.FUSE_CATEGORIES.MANUAL_KILLSWITCH;
        }
        if (coneC >= C.FUSE_BASELINE) {
            triggers.push({ category: C.FUSE_CATEGORIES.VALUATION, triggered: true, value: coneC, threshold: C.FUSE_BASELINE });
            overallHalt = true; if (fuseBy === 'NONE') fuseBy = 'CONE_C_BREACH';
        } else {
            triggers.push({ category: C.FUSE_CATEGORIES.VALUATION, triggered: false, value: coneC, threshold: C.FUSE_BASELINE });
        }
        if (mdd >= C.FUSE_BASELINE) {
            triggers.push({ category: C.FUSE_CATEGORIES.MAX_DRAWDOWN, triggered: true, value: mdd, threshold: C.FUSE_BASELINE });
            overallHalt = true; if (fuseBy === 'NONE') fuseBy = C.FUSE_CATEGORIES.MAX_DRAWDOWN;
        } else {
            triggers.push({ category: C.FUSE_CATEGORIES.MAX_DRAWDOWN, triggered: false, value: mdd, threshold: C.FUSE_BASELINE });
        }
        if (tilt >= C.FUSE_BASELINE) {
            triggers.push({ category: C.FUSE_CATEGORIES.EMOTIONAL_TILT, triggered: true, value: tilt, threshold: C.FUSE_BASELINE });
            overallHalt = true; if (fuseBy === 'NONE') fuseBy = C.FUSE_CATEGORIES.EMOTIONAL_TILT;
        } else {
            triggers.push({ category: C.FUSE_CATEGORIES.EMOTIONAL_TILT, triggered: false, value: tilt, threshold: C.FUSE_BASELINE });
        }
        if (businessTriggered) {
            triggers.push({ category: C.FUSE_CATEGORIES.RESERVED, triggered: true, reason: businessReason });
            overallHalt = true; if (fuseBy === 'NONE') fuseBy = businessReason || 'BUSINESS_CUSTOM';
        } else {
            triggers.push({ category: C.FUSE_CATEGORIES.RESERVED, triggered: false });
        }

        if (overallHalt) {
            enforcedPosition = C.POSITION_ZERO;
        } else {
            var requestedPosition = clamp(safeNum(p.requestedPosition, 0), 0, 1);
            enforcedPosition = requestedPosition;
        }

        var warningLevel = coneC >= C.FUSE_BASELINE * 0.7 && !overallHalt ? 'WARNING' :
                           coneC >= C.FUSE_BASELINE * 0.5 && !overallHalt ? 'CAUTION' : 'SAFE';

        return {
            halted: overallHalt,
            state: overallHalt ? FUSE_STATE.TRIGGERED : FUSE_STATE.ARMED,
            enforcedPosition: enforcedPosition,
            enforcedBy: fuseBy,
            triggers: triggers,
            warningLevel: warningLevel,
            canBypass: false
        };
    }

    function canResetFuse(currentState, payload) {
        var p = Internal.safeObj(payload);
        var state = safeStr(currentState, FUSE_STATE.ARMED);
        var cooldownMs = safeNum(p.cooldownPeriodMs, 0);
        var lastTriggerTime = safeNum(p.lastTriggerAt, 0);
        var manualConfirmed = safeBool(p.manualResetConfirmed, false);
        var now = Date.now();
        if (state !== FUSE_STATE.TRIGGERED && state !== FUSE_STATE.COOLING) {
            return { canReset: false, reason: 'FUSE_NOT_TRIGGERED', requiresManualConfirm: true };
        }
        var cooldownSatisfied = (now - lastTriggerTime) >= cooldownMs;
        if (cooldownSatisfied && manualConfirmed) {
            return { canReset: true, state: FUSE_STATE.RESET_PENDING };
        }
        return {
            canReset: false,
            cooldownSatisfied: cooldownSatisfied,
            manualConfirmed: manualConfirmed,
            requiresManualConfirm: true
        };
    }

    return Object.freeze({
        name: 'safety-fuse',
        version: Internal.VERSION,
        FUSE_BASELINE: C.FUSE_BASELINE,
        FUSE_STATE: FUSE_STATE,
        FUSE_CATEGORIES: C.FUSE_CATEGORIES,
        evaluate: evaluateFuseTriggers,
        canReset: canResetFuse
    });
});
