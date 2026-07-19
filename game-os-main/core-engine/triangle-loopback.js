/**
 * Game-OS Core Engine · Triangle Redundancy Loopback Model
 * ============================================================
 * LAYER 1: Core Public Axiom Module
 * Contains: Triangle redundancy universal math model (input
 *           validation → computation → audit feedback triangular
 *           redundancy), Loopback control receipt standard
 *           structure, audit trail universal format.
 * DOES NOT contain: Per-business audit node lists, finance audit
 *           chain step granularity configs, or industry-specific
 *           audit step definitions.
 * ============================================================
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('./_internal.js'));
    } else {
        root._GameOS_TriangleLoopback = factory(root._GameOS_CoreInternal);
    }
})(typeof self !== 'undefined' ? self : this, function (Internal) {
    'use strict';

    var C = Internal.CONST;
    var safeNum = Internal.safeNum;
    var safeStr = Internal.safeStr;
    var safeObj = Internal.safeObj;
    var safeArr = Internal.safeArr;
    var safeBool = function (v, def) { return typeof v === 'boolean' ? v : !!def; };

    var _auditStore = [];
    var _callStore = {};

    function validateInput(operation, payload) {
        var errors = [];
        var op = safeStr(operation, '');
        if (!op) errors.push('MISSING_OPERATION');
        var p = safeObj(payload);
        var validOps = ['kelly', 'circle', 'fuse', 'control', 'fatlean', 'loopback', 'elevenlayer', 'fuse_reset'];
        if (op && validOps.indexOf(op) === -1) errors.push('UNKNOWN_OPERATION:' + op);
        return {
            valid: errors.length === 0,
            errors: errors,
            operation: op,
            payload: p
        };
    }

    function recordAudit(entry) {
        var e = safeObj(entry);
        var audit = {
            auditId: Internal.generateId('a'),
            timestamp: Date.now(),
            moduleId: safeStr(e.moduleId, 'unknown'),
            operation: safeStr(e.operation, 'unknown'),
            callId: safeStr(e.callId, ''),
            inputsHash: Internal.hashObj(e.inputs || {}),
            outputsHash: Internal.hashObj(e.outputs || {}),
            status: safeStr(e.status, 'OK'),
            error: safeStr(e.error, ''),
            layer: safeStr(e.layer, C.FOUR_LAYERS.L1_FULL_AUTO)
        };
        _auditStore.push(audit);
        if (_auditStore.length > 10000) _auditStore.shift();
        return audit;
    }

    function getAuditTrail(filter) {
        var f = safeObj(filter);
        var moduleId = safeStr(f.moduleId, '');
        var callId = safeStr(f.callId, '');
        var result = _auditStore.slice();
        if (moduleId) result = result.filter(function (a) { return a.moduleId === moduleId; });
        if (callId) result = result.filter(function (a) { return a.callId === callId; });
        return result;
    }

    function buildLoopback(result, payload) {
        var r = safeObj(result);
        var p = safeObj(payload);
        var halted = safeBool(r.halted, false);
        var signal = safeStr(r.signal, safeStr(p.defaultSignal, 'WAIT'));
        var canRerun = safeBool(p.canRerun, true);
        var recommendedAction;

        if (halted) {
            recommendedAction = C.LOOPBACK_ACTIONS.HALT;
        } else if (signal === 'BUY' || signal === 'ALLOCATE' || signal === 'PROCEED' || signal === 'ENTER') {
            recommendedAction = C.LOOPBACK_ACTIONS.MONITOR;
        } else if (signal === 'SELL' || signal === 'DEALLOCATE' || signal === 'EXIT') {
            recommendedAction = C.LOOPBACK_ACTIONS.EXIT;
        } else {
            recommendedAction = C.LOOPBACK_ACTIONS.WAIT;
        }

        return {
            canRerun: canRerun,
            feedbackReady: true,
            recommendedAction: recommendedAction,
            pipelineCompleted: safeBool(r.pipelineCompleted, true),
            status: halted ? 'HALTED' : 'COMPLETED'
        };
    }

    function startCall(moduleId, operation, payload) {
        var callId = Internal.generateId('q');
        _callStore[callId] = {
            callId: callId,
            moduleId: safeStr(moduleId, ''),
            operation: safeStr(operation, ''),
            startedAt: Date.now(),
            completedAt: 0,
            steps: []
        };
        return callId;
    }

    function completeCall(callId, stepResults) {
        var call = _callStore[callId];
        if (!call) return null;
        call.completedAt = Date.now();
        call.steps = safeArr(stepResults);
        call.durationMs = call.completedAt - call.startedAt;
        return {
            callId: call.callId,
            moduleId: call.moduleId,
            operation: call.operation,
            startedAt: call.startedAt,
            completedAt: call.completedAt,
            durationMs: call.durationMs,
            stepsCompleted: call.steps.length
        };
    }

    function getCall(callId) {
        return _callStore[callId] || null;
    }

    function resetAuditLog() {
        _auditStore = [];
        _callStore = {};
        return { cleared: true, timestamp: Date.now() };
    }

    return Object.freeze({
        name: 'triangle-loopback',
        version: Internal.VERSION,
        validateInput: validateInput,
        recordAudit: recordAudit,
        getAuditTrail: getAuditTrail,
        buildLoopback: buildLoopback,
        startCall: startCall,
        completeCall: completeCall,
        getCall: getCall,
        resetLog: resetAuditLog
    });
});
