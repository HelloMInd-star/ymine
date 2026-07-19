/**
 * Game-OS Core Engine · Four-Layer Hierarchical Control
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Four-layer universal flow framework (Full Auto →
 *           Assisted → Human Intervene → Extreme Fallback), layer
 *           upgrade/downgrade trigger framework, extreme risk
 *           manual fallback trigger logic framework, 80/20 human-
 *           machine collaboration split rule framework.
 * DOES NOT contain: Per-industry layer permission configs,
 *           finance trader approval thresholds, MCN contract
 *           signing tier configs, airspace dispatch tier
 *           permissions, or any role-based private configs.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_FourLayerControl = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var safeStr = Internal.safeStr;
    var safeBool = function (v, def) { return typeof v === 'boolean' ? v : !!def; };
    var clamp = Internal.clamp;

    var LAYERS = C.FOUR_LAYERS;

    var LAYER_DEFAULTS = Object.freeze({
        L1_FULL_AUTO: Object.freeze({
            machinePower: 1.0,
            humanPower: 0.0,
            autoExecute: true,
            humanApprovalRequired: false,
            description: 'Fully automated pipeline execution, audit only'
        }),
        L2_ASSISTED: Object.freeze({
            machinePower: 0.8,
            humanPower: 0.2,
            autoExecute: false,
            humanApprovalRequired: true,
            description: 'Machine generates proposal, human signs off'
        }),
        L3_HUMAN_INTERVENE: Object.freeze({
            machinePower: 0.3,
            humanPower: 0.7,
            autoExecute: false,
            humanApprovalRequired: true,
            description: 'Human leads decision, machine provides data'
        }),
        L4_EXTREME_FALLBACK: Object.freeze({
            machinePower: 0.0,
            humanPower: 1.0,
            autoExecute: false,
            humanApprovalRequired: true,
            allHalted: true,
            description: 'Extreme risk - all automated activity halted, manual only'
        })
    });

    function determineLayer(payload, currentLayer) {
        var p = Internal.safeObj(payload);
        var coneC = clamp(safeNum(p.coneC, 0), 0, 1);
        var tilt = clamp(safeNum(p.emotionalTilt, 0), 0, 1);
        var rationalityScore = clamp(safeNum(p.rationalityScore, 50), 0, 100);
        var fuseTriggered = safeBool(p.fuseTriggered, false);
        var extremeEvent = safeBool(p.extremeEvent, false);

        var thresholds = {
            L1toL2: clamp(safeNum(p.thresholdL2, 0.4), 0, 1),
            L2toL3: clamp(safeNum(p.thresholdL3, 0.5), 0, 1),
            L3toL4: clamp(safeNum(p.thresholdL4, C.FUSE_BASELINE), 0, 1)
        };

        var recommendedLayer;
        var reason;

        if (fuseTriggered || extremeEvent || coneC >= thresholds.L3toL4) {
            recommendedLayer = LAYERS.L4_EXTREME_FALLBACK;
            reason = 'EXTREME_RISK_FUSE_OR_COLLAPSE';
        } else if (coneC >= thresholds.L2toL3 || tilt >= thresholds.L2toL3 || rationalityScore < 40) {
            recommendedLayer = LAYERS.L3_HUMAN_INTERVENE;
            reason = 'HIGH_RISK_OR_TILT_OR_LOW_RATIONALITY';
        } else if (coneC >= thresholds.L1toL2 || tilt >= thresholds.L1toL2 || rationalityScore < 70) {
            recommendedLayer = LAYERS.L2_ASSISTED;
            reason = 'WARNING_ZONE_OR_MODERATE_RISK';
        } else {
            recommendedLayer = LAYERS.L1_FULL_AUTO;
            reason = 'SAFE_NORMAL_OPERATION';
        }

        var layerConfig = LAYER_DEFAULTS[recommendedLayer];
        var current = safeStr(currentLayer, recommendedLayer);
        var direction = 'STAY';
        var layerOrder = [LAYERS.L1_FULL_AUTO, LAYERS.L2_ASSISTED, LAYERS.L3_HUMAN_INTERVENE, LAYERS.L4_EXTREME_FALLBACK];
        var curIdx = layerOrder.indexOf(current);
        var recIdx = layerOrder.indexOf(recommendedLayer);
        if (recIdx > curIdx) direction = 'ESCALATE';
        else if (recIdx < curIdx) direction = 'DEESCALATE';

        return {
            currentLayer: current,
            recommendedLayer: recommendedLayer,
            direction: direction,
            reason: reason,
            config: layerConfig,
            eightTwentySplit: {
                machine: layerConfig.machinePower,
                human: layerConfig.humanPower,
                machinePipeline: layerConfig.machinePower >= 0.5,
                humanCockpit: layerConfig.humanPower >= 0.5
            }
        };
    }

    function canExecute(layer, actionType) {
        var l = safeStr(layer, LAYERS.L1_FULL_AUTO);
        var cfg = LAYER_DEFAULTS[l] || LAYER_DEFAULTS[LAYERS.L1_FULL_AUTO];
        if (actionType === 'POSITION_OPEN' || actionType === 'RESOURCE_ALLOCATE') {
            return {
                allowed: cfg.autoExecute,
                requiresApproval: cfg.humanApprovalRequired,
                autoExecute: cfg.autoExecute
            };
        }
        if (actionType === 'FUSE_RESET' || actionType === 'KILLSWITCH') {
            return {
                allowed: l === LAYERS.L4_EXTREME_FALLBACK || l === LAYERS.L3_HUMAN_INTERVENE,
                requiresApproval: true,
                autoExecute: false
            };
        }
        return { allowed: true, autoExecute: cfg.autoExecute, requiresApproval: cfg.humanApprovalRequired };
    }

    return Object.freeze({
        name: 'four-layer-control',
        version: Internal.VERSION,
        LAYERS: LAYERS,
        LAYER_CONFIGS: LAYER_DEFAULTS,
        determineLayer: determineLayer,
        canExecute: canExecute
    });
});
