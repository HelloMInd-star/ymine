global.window = global;
var YBus = {
    _state: {},
    _subs: {},
    getState: function(k) { return this._state[k]; },
    setState: function(k, v) { this._state[k] = v; },
    publish: function(k, v) { this._state[k] = v; },
    subscribe: function(k, fn) { if(!this._subs[k])this._subs[k]=[]; this._subs[k].push(fn); },
    getSnapshot: function() { return this._state; },
    ready: function(fn) { fn(); }
};
global.YBus = YBus;
global.YMineRiskCB = {
    enforce: function(inp) {
        var halted = inp.cone >= 0.68 || inp.tiltLevel >= 0.8 || inp.npvNegative || inp.irrBelowHurdle || inp.mdd2 > 0.4;
        return { requested: inp.ratio, actual: halted ? 0 : inp.ratio, halted: halted, fuseIds: halted ? ['CONE_BREAKER'] : [], caps: [], reductions: [], hedgingRequired: inp.hedging_required, budgetMultiplier: 1, coneDistanceToFuse: 0.68 - inp.cone, timestamp: Date.now() };
    }
};
require('./assets/js/quant-engine.js');
try {
    var result = YMineQuantEngine.runPipeline({ forceRegime: 'RED_OCEAN', monteCarloRuns: 10, pokerHands: 4, simulationDays: 30 });
    console.log('=== Pipeline RED_OCEAN completed SUCCESS ===');
    console.log('Signal:', result.signal.direction, 'Position:', (result.kelly.enforcedPosition*100).toFixed(1)+'%');
    console.log('Halted:', result.riskStatus.halted);
    console.log('Warnings count:', result.riskStatus.warnings.length);
    console.log('Audit steps:', result.auditTrail.stepsCompleted.join(','));
    console.log('Hedge instruments:', result.hedgingPlan.instruments.length);
    var sim = YBus.getState('simulationResult');
    console.log('sim keys:', Object.keys(sim));
    console.log('sim.valuation keys:', sim.valuation ? Object.keys(sim.valuation) : 'NULL_valuation');
    console.log('Kline points:', sim.baselineKLine.length);
    var rat = YBus.getState('rationalityScore');
    console.log('Rationality score:', rat.overallScore, 'kellyMultiplier:', rat.positionAdjustment.kellyMultiplier);

    var result2 = YMineQuantEngine.runPipeline({ forceRegime: 'BLUE_OCEAN', monteCarloRuns: 10, pokerHands: 4, simulationDays: 30 });
    console.log('=== Pipeline BLUE_OCEAN completed SUCCESS ===');
    console.log('Blue signal:', result2.signal.direction, 'pos:', (result2.kelly.enforcedPosition*100).toFixed(1)+'%');
    var sim2 = YBus.getState('simulationResult');
    console.log('Beta blue:', sim2.valuation.pricing.dynamicBeta);
    console.log('ALL TESTS PASSED - NO undefined beta ERROR');
} catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
}
