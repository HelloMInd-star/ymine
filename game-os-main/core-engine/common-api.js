/**
 * Game-OS Core Engine · Common Public API Gateway
 * ============================================================
 * LAYER 2: Unified Public API - THE ONLY entry point for all
 *          business modules. Business modules MUST load ONLY this
 *          file. Directly requiring any other core-engine/ file
 *          from business-modules/ is an ARCHITECTURE VIOLATION.
 *
 * Responsibilities:
 *   1. Parameter validation (required fields, types, ranges)
 *   2. Routing to correct Core internal module
 *   3. Standardized return structure formatting
 *   4. Audit trail assembly (triangle redundancy)
 *   5. Version-based dispatch (backward compatibility)
 *   6. Module isolation enforcement
 *
 * Return structure (UNIVERSAL for all operations):
 * {
 *   code:       200 | 4xx | 5xx,
 *   message:    string,
 *   version:    string,
 *   data:       operation-specific result object,
 *   auditTrail: array of audit entries,
 *   loopback: { canRerun, feedbackReady, recommendedAction, status }
 * }
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        var Internal = require('./_internal.js');
        var Kelly = require('./kelly-base.js');
        var Circle = require('./circle-boundary.js');
        var Fuse = require('./safety-fuse.js');
        var Control = require('./four-layer-control.js');
        var FatLean = require('./fat-lean-band.js');
        var Loopback = require('./triangle-loopback.js');
        var ElevenLayer = require('./eleven-layer-public.js');
        module.exports = factory(Internal, Kelly, Circle, Fuse, Control, FatLean, Loopback, ElevenLayer);
    } else {
        root.GameOS_API = factory(
            root._GameOS_CoreInternal,
            root._GameOS_KellyBase,
            root._GameOS_CircleBoundary,
            root._GameOS_SafetyFuse,
            root._GameOS_FourLayerControl,
            root._GameOS_FatLeanBand,
            root._GameOS_TriangleLoopback,
            root._GameOS_ElevenLayer
        );
    }
})(typeof self !== 'undefined' ? self : this, function (Internal, Kelly, Circle, Fuse, Control, FatLean, Loopback, ElevenLayer) {
    'use strict';

    var API_VERSION = '1.0.0';
    var SUPPORTED_VERSIONS = ['1.0.0'];
    var ALLOWED_OPERATIONS = Object.freeze([
        'kelly', 'circle', 'fuse', 'control', 'fatlean',
        'loopback', 'elevenlayer', 'fuse_reset',
        'get_constants', 'get_audit', 'get_layers', 'health'
    ]);
    var REGISTERED_MODULES = Object.freeze([
        'lowalt-economy', 'mcn-valuation', 'wall-street-11step', 'math-cognition', '_template', 'system'
    ]);

    var CONSTANTS_PUBLIC = Object.freeze({
        FUSE_BASELINE: Internal.CONST.FUSE_BASELINE,
        GOV_BASELINE_SLOPE: Internal.CONST.GOV_BASELINE_SLOPE,
        KELLY_OPTIMAL_MIN: Internal.CONST.KELLY_OPTIMAL_MIN,
        KELLY_OPTIMAL_MAX: Internal.CONST.KELLY_OPTIMAL_MAX,
        FOUR_LAYERS: Internal.CONST.FOUR_LAYERS,
        FAT_LEAN_STATES: Internal.CONST.FAT_LEAN_STATES,
        FUSE_CATEGORIES: Internal.CONST.FUSE_CATEGORIES,
        STATUS_CODES: Internal.CONST.STATUS_CODES,
        LOOPBACK_ACTIONS: Internal.CONST.LOOPBACK_ACTIONS,
        ELEVEN_LAYER_COUNT: ElevenLayer.LAYER_COUNT
    });

    function buildError(code, message) {
        return {
            code: code,
            message: message,
            version: API_VERSION,
            data: null,
            auditTrail: [],
            loopback: Loopback.buildLoopback({ halted: true, signal: 'WAIT' }, { defaultSignal: 'WAIT' })
        };
    }

    function buildSuccess(data, callId, moduleId, operation) {
        var loopback;
        if (data && data.loopback) {
            loopback = data.loopback;
            delete data.loopback;
        } else {
            loopback = Loopback.buildLoopback(data || {}, {});
        }
        var auditTrail = Loopback.getAuditTrail({ callId: callId });
        return {
            code: Internal.CONST.STATUS_CODES.OK,
            message: 'OK',
            version: API_VERSION,
            data: data,
            auditTrail: auditTrail,
            loopback: loopback
        };
    }

    function validateParams(params) {
        var p = Internal.safeObj(params);
        var errors = [];
        var moduleId = Internal.safeStr(p.moduleId, '');
        var operation = Internal.safeStr(p.operation, '');
        var version = Internal.safeStr(p.version, API_VERSION);
        var payload = Internal.safeObj(p.payload);
        var context = Internal.safeObj(p.context);

        if (!moduleId) errors.push('MISSING_MODULE_ID');
        if (REGISTERED_MODULES.indexOf(moduleId) === -1) errors.push('UNREGISTERED_MODULE:' + moduleId);
        if (!operation) errors.push('MISSING_OPERATION');
        if (ALLOWED_OPERATIONS.indexOf(operation) === -1) errors.push('UNKNOWN_OPERATION:' + operation);
        if (SUPPORTED_VERSIONS.indexOf(version) === -1) errors.push('UNSUPPORTED_VERSION:' + version);

        return {
            valid: errors.length === 0,
            errors: errors,
            moduleId: moduleId,
            operation: operation,
            version: version,
            payload: payload,
            context: context
        };
    }

    function dispatch(validated, callId) {
        var op = validated.operation;
        var payload = validated.payload;
        var data;

        switch (op) {
            case 'health':
                data = {
                    healthy: true,
                    apiVersion: API_VERSION,
                    coreVersion: Internal.VERSION,
                    coreLocked: Internal.LOCKED,
                    timestamp: Date.now(),
                    registeredModules: REGISTERED_MODULES.slice()
                };
                break;

            case 'get_constants':
                data = { constants: CONSTANTS_PUBLIC };
                break;

            case 'get_audit':
                data = { auditTrail: Loopback.getAuditTrail({ moduleId: validated.moduleId }) };
                break;

            case 'get_layers':
                data = { layers: ElevenLayer.getLayers() };
                break;

            case 'kelly':
                data = Kelly.evaluate(payload);
                break;

            case 'circle':
                data = Circle.evaluate(payload);
                break;

            case 'fuse':
                data = Fuse.evaluate(payload);
                var kellyData = Kelly.evaluate({
                    winRate: payload.winRate,
                    winLossRatio: payload.winLossRatio,
                    scalingFactor: payload.scalingFactor,
                    rationalityScore: payload.rationalityScore,
                    kellyMultiplier: payload.kellyMultiplier,
                    tiltAdjustment: payload.tiltAdjustment,
                    regimeAdjustment: payload.regimeAdjustment,
                    businessAdjustment: payload.businessAdjustment
                });
                data.enforcedPosition = data.halted ? 0 : (payload.requestedPosition !== undefined
                    ? Math.min(Internal.safeNum(payload.requestedPosition, kellyData.finalPosition), kellyData.finalPosition)
                    : kellyData.finalPosition);
                data.kellyRecommendation = kellyData;
                break;

            case 'fuse_reset':
                data = Fuse.canReset(payload.currentState, payload);
                break;

            case 'control':
                var fuseResult = Fuse.evaluate(payload);
                data = Control.determineLayer({
                    coneC: Internal.safeNum(payload.coneC, 0),
                    emotionalTilt: Internal.safeNum(payload.emotionalTilt, 0),
                    rationalityScore: Internal.safeNum(payload.rationalityScore, 50),
                    fuseTriggered: fuseResult.halted,
                    extremeEvent: payload.extremeEvent,
                    thresholdL2: payload.thresholdL2,
                    thresholdL3: payload.thresholdL3,
                    thresholdL4: payload.thresholdL4
                }, payload.currentLayer);
                data.fuse = fuseResult;
                break;

            case 'fatlean':
                var bandResult = FatLean.evaluate(payload.indicator, {
                    fatThreshold: payload.fatThreshold,
                    leanThreshold: payload.leanThreshold
                });
                var tightness = FatLean.getTightness(bandResult, {
                    fatLoosenessFactor: payload.fatLoosenessFactor,
                    leanTightnessFactor: payload.leanTightnessFactor
                });
                data = { band: bandResult, tightness: tightness };
                break;

            case 'elevenlayer':
                var subOp = Internal.safeStr(payload.subOp, 'create');
                if (subOp === 'create') {
                    data = ElevenLayer.createContext({ moduleId: validated.moduleId });
                } else if (subOp === 'advance') {
                    data = ElevenLayer.advance(payload.context, payload.stepResult);
                } else if (subOp === 'progress') {
                    data = ElevenLayer.getProgress(payload.context);
                } else if (subOp === 'validate') {
                    data = ElevenLayer.validateStep(payload.stepIndex, payload);
                } else {
                    return buildError(Internal.CONST.STATUS_CODES.BAD_PARAM, 'UNKNOWN_ELEVENLAYER_SUBOP:' + subOp);
                }
                break;

            case 'loopback':
                data = {
                    loopback: Loopback.buildLoopback(payload.result || {}, payload),
                    auditCall: payload.trackCall ? Loopback.startCall(validated.moduleId, 'loopback', payload) : null
                };
                break;

            default:
                return buildError(Internal.CONST.STATUS_CODES.NOT_FOUND, 'OPERATION_NOT_IMPLEMENTED:' + op);
        }

        return data;
    }

    function invoke(params) {
        var validated = validateParams(params);
        if (!validated.valid) {
            return buildError(
                Internal.CONST.STATUS_CODES.BAD_PARAM,
                'VALIDATION_FAILED: ' + validated.errors.join(';')
            );
        }

        var callId = Loopback.startCall(validated.moduleId, validated.operation, validated.payload);

        var data;
        try {
            data = dispatch(validated, callId);
        } catch (err) {
            Loopback.recordAudit({
                moduleId: validated.moduleId,
                operation: validated.operation,
                callId: callId,
                inputs: validated.payload,
                outputs: null,
                status: 'ERROR',
                error: err.message || 'CORE_INTERNAL_ERROR',
                layer: Control.LAYERS.L1_FULL_AUTO
            });
            var errResult = buildError(Internal.CONST.STATUS_CODES.CORE_ERROR, 'CORE_ERROR:' + (err.message || 'unknown'));
            Loopback.completeCall(callId, []);
            return errResult;
        }

        Loopback.recordAudit({
            moduleId: validated.moduleId,
            operation: validated.operation,
            callId: callId,
            inputs: validated.payload,
            outputs: data,
            status: 'OK',
            error: '',
            layer: (data && data.recommendedLayer) || Control.LAYERS.L1_FULL_AUTO
        });

        Loopback.completeCall(callId, [{ op: validated.operation, ok: true }]);

        return buildSuccess(data, callId, validated.moduleId, validated.operation);
    }

    function registerModule(moduleId) {
        var mid = Internal.safeStr(moduleId, '');
        if (!mid) return { registered: false, reason: 'EMPTY_MODULE_ID' };
        return { registered: true, moduleId: mid, note: 'Runtime registration is allowed; static folder creation required for physical isolation.' };
    }

    return Object.freeze({
        name: 'common-api',
        version: API_VERSION,
        invoke: invoke,
        registerModule: registerModule,
        getConstants: function () { return CONSTANTS_PUBLIC; },
        getLayers: function () { return ElevenLayer.getLayers(); },
        health: function () {
            return invoke({ moduleId: 'system', operation: 'health', version: API_VERSION, payload: {}, context: {} });
        }
    });
});
