/**
 * Game-OS Core Engine · 11-Layer Universal Decision Axiom Skeleton
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: 11-layer universal decision flow skeleton (industry-
 *           agnostic), standard step progression framework, layer
 *           transition rules, completion validation framework.
 * DOES NOT contain: The finance-specific 11-step investment
 *           pipeline details (information funnel, K-line, poker
 *           test, etc. - those remain in wall-street-11step/
 *           private-logic/), or any industry-specific step
 *           implementations. This module provides ONLY the generic
 *           axiom skeleton.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_ElevenLayer = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var safeNum = Internal.safeNum;
    var safeStr = Internal.safeStr;
    var safeObj = Internal.safeObj;
    var safeArr = Internal.safeArr;
    var safeBool = function (v, def) { return typeof v === 'boolean' ? v : !!def; };
    var clamp = Internal.clamp;

    var UNIVERSAL_LAYERS = Object.freeze([
        Object.freeze({ index: 0, axiomName: 'SCOPE_FUNNEL', publicDescription: 'Universal scope filtering and macro selection' }),
        Object.freeze({ index: 1, axiomName: 'DATA_INGESTION', publicDescription: 'Raw data intake and normalization' }),
        Object.freeze({ index: 2, axiomName: 'DATA_ETL', publicDescription: 'Data extraction, transformation, loading' }),
        Object.freeze({ index: 3, axiomName: 'CORE_PRICING', publicDescription: 'Core pricing and fair value computation' }),
        Object.freeze({ index: 4, axiomName: 'VALUATION', publicDescription: 'Valuation calculation and gap analysis' }),
        Object.freeze({ index: 5, axiomName: 'DECISION_SIMULATION', publicDescription: 'Decision scenario simulation' }),
        Object.freeze({ index: 6, axiomName: 'DYNAMIC_PROJECTION', publicDescription: 'Dynamic forward projection' }),
        Object.freeze({ index: 7, axiomName: 'HUMAN_RATIONALITY', publicDescription: 'Human rationality bias calibration' }),
        Object.freeze({ index: 8, axiomName: 'HEDGING_CONTROL', publicDescription: 'Risk hedging and control layer' }),
        Object.freeze({ index: 9, axiomName: 'FUSE_GATING', publicDescription: 'Fuse gating and final enforcement' }),
        Object.freeze({ index: 10, axiomName: 'LOOPBACK', publicDescription: 'Total control loopback and audit return' })
    ]);

    function getUniversalLayers() {
        return UNIVERSAL_LAYERS.map(function (l) { return Object.assign({}, l); });
    }

    function validateStepProgression(stepIndex, payload) {
        var idx = parseInt(safeNum(stepIndex, -1), 10);
        var p = safeObj(payload);
        var completedSteps = safeArr(p.completedSteps);
        if (idx < 0 || idx >= UNIVERSAL_LAYERS.length) {
            return { valid: false, error: 'STEP_INDEX_OUT_OF_RANGE', step: idx };
        }
        if (idx > 0 && completedSteps.indexOf(idx - 1) === -1) {
            return {
                valid: false,
                error: 'PREVIOUS_STEP_NOT_COMPLETED',
                step: idx,
                requiredPrevious: idx - 1
            };
        }
        return { valid: true, step: idx, axiomName: UNIVERSAL_LAYERS[idx].axiomName };
    }

    function buildPipelineContext(payload) {
        var p = safeObj(payload);
        return {
            pipelineId: Internal.generateId('pipe'),
            startedAt: Date.now(),
            completedAt: 0,
            currentStep: 0,
            completedSteps: [],
            totalSteps: UNIVERSAL_LAYERS.length,
            moduleId: safeStr(p.moduleId, ''),
            halted: false,
            haltReason: '',
            status: 'INITIALIZED'
        };
    }

    function advanceStep(context, stepResult) {
        var ctx = safeObj(context);
        var sr = safeObj(stepResult);
        var curStep = clamp(safeNum(ctx.currentStep, 0), 0, UNIVERSAL_LAYERS.length - 1);
        var validation = validateStepProgression(curStep, { completedSteps: ctx.completedSteps });
        if (!validation.valid) {
            return Object.assign({}, ctx, { error: validation.error });
        }
        var newCompleted = (ctx.completedSteps || []).slice();
        newCompleted.push(curStep);
        var nextStep = curStep + 1;
        var halted = safeBool(sr.halted, false) || safeBool(ctx.halted, false);
        var completed = nextStep >= UNIVERSAL_LAYERS.length;
        return Object.assign({}, ctx, {
            currentStep: halted ? curStep : (completed ? UNIVERSAL_LAYERS.length - 1 : nextStep),
            completedSteps: newCompleted,
            halted: halted,
            haltReason: safeStr(sr.haltReason, ctx.haltReason || ''),
            status: completed ? (halted ? 'HALTED' : 'COMPLETED') : (halted ? 'HALTED' : 'RUNNING'),
            completedAt: completed ? Date.now() : 0
        });
    }

    function getProgress(context) {
        var ctx = safeObj(context);
        var completed = safeArr(ctx.completedSteps).length;
        return {
            pipelineId: safeStr(ctx.pipelineId, ''),
            currentStep: safeNum(ctx.currentStep, 0),
            completedSteps: completed,
            totalSteps: UNIVERSAL_LAYERS.length,
            progressPercent: clamp((completed / UNIVERSAL_LAYERS.length) * 100, 0, 100),
            halted: safeBool(ctx.halted, false),
            status: safeStr(ctx.status, 'INITIALIZED')
        };
    }

    return Object.freeze({
        name: 'eleven-layer-public',
        version: Internal.VERSION,
        LAYER_COUNT: UNIVERSAL_LAYERS.length,
        UNIVERSAL_LAYERS: UNIVERSAL_LAYERS,
        getLayers: getUniversalLayers,
        validateStep: validateStepProgression,
        createContext: buildPipelineContext,
        advance: advanceStep,
        getProgress: getProgress
    });
});
