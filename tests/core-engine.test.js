'use strict';

const assert = require('assert');

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        return { pass: true, name };
    } catch (err) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${err.message}`);
        return { pass: false, name, error: err.message };
    }
}

function approxEqual(a, b, epsilon = 0.0001) {
    if (Math.abs(a - b) > epsilon) {
        throw new Error(`Expected ~${b}, got ${a} (epsilon=${epsilon})`);
    }
}

console.log('========================================');
console.log('Game-OS Core Engine Test Suite');
console.log('========================================\n');

const Internal = require('../game-os-main/core-engine/_internal.js');

console.log('--- _internal.js: Utility Functions ---');

let results = [];

results.push(test('safeNum: valid number passes through', () => {
    assert.strictEqual(Internal.safeNum(42, 0), 42);
    assert.strictEqual(Internal.safeNum(0, 99), 0);
    assert.strictEqual(Internal.safeNum(-3.14, 0), -3.14);
}));

results.push(test('safeNum: null/undefined returns default', () => {
    assert.strictEqual(Internal.safeNum(null, 5), 5);
    assert.strictEqual(Internal.safeNum(undefined, 7), 7);
}));

results.push(test('safeNum: NaN/Infinity/string returns default', () => {
    assert.strictEqual(Internal.safeNum(NaN, 0), 0);
    assert.strictEqual(Internal.safeNum(Infinity, 0), 0);
    assert.strictEqual(Internal.safeNum('hello', 42), 42);
}));

results.push(test('safeObj: plain object passes through', () => {
    const o = { a: 1 };
    assert.strictEqual(Internal.safeObj(o, {}), o);
}));

results.push(test('safeObj: null/array/primitive returns default', () => {
    const def = { fallback: true };
    assert.deepStrictEqual(Internal.safeObj(null, def), def);
    assert.deepStrictEqual(Internal.safeObj([1, 2], def), def);
    assert.deepStrictEqual(Internal.safeObj('str', def), def);
    assert.deepStrictEqual(Internal.safeObj(123, def), def);
}));

results.push(test('safeArr: array passes through', () => {
    const a = [1, 2, 3];
    assert.strictEqual(Internal.safeArr(a, []), a);
}));

results.push(test('safeArr: non-array returns default', () => {
    const def = [99];
    assert.deepStrictEqual(Internal.safeArr(null, def), def);
    assert.deepStrictEqual(Internal.safeArr({}, def), def);
}));

results.push(test('safeStr: non-empty string passes through', () => {
    assert.strictEqual(Internal.safeStr('hello', ''), 'hello');
}));

results.push(test('safeStr: empty/non-string returns default', () => {
    assert.strictEqual(Internal.safeStr('', 'def'), 'def');
    assert.strictEqual(Internal.safeStr(null, 'x'), 'x');
    assert.strictEqual(Internal.safeStr(123, 'y'), 'y');
}));

results.push(test('isValidNumber: correctly identifies valid numbers', () => {
    assert.strictEqual(Internal.isValidNumber(0), true);
    assert.strictEqual(Internal.isValidNumber(1.5), true);
    assert.strictEqual(Internal.isValidNumber(-100), true);
    assert.strictEqual(Internal.isValidNumber(NaN), false);
    assert.strictEqual(Internal.isValidNumber(Infinity), false);
    assert.strictEqual(Internal.isValidNumber('5'), false);
    assert.strictEqual(Internal.isValidNumber(null), false);
}));

results.push(test('clamp: returns value within range', () => {
    assert.strictEqual(Internal.clamp(0.5, 0, 1), 0.5);
    assert.strictEqual(Internal.clamp(-1, 0, 1), 0);
    assert.strictEqual(Internal.clamp(2, 0, 1), 1);
    assert.strictEqual(Internal.clamp(NaN, 0, 1), 0);
}));

results.push(test('generateId: returns non-empty string with prefix support', () => {
    const id1 = Internal.generateId();
    const id2 = Internal.generateId('test');
    assert.strictEqual(typeof id1, 'string');
    assert.ok(id1.length > 0);
    assert.ok(id2.startsWith('test_'));
    assert.notStrictEqual(id1, id2);
}));

results.push(test('CONST: thresholds are correctly frozen and values match', () => {
    assert.strictEqual(Internal.CONST.FUSE_BASELINE, 0.68);
    assert.strictEqual(Internal.CONST.KELLY_OPTIMAL_MIN, 0.30);
    assert.strictEqual(Internal.CONST.KELLY_OPTIMAL_MAX, 0.50);
    assert.strictEqual(Internal.CONST.POSITION_ZERO, 0);
    assert.ok(Object.isFrozen(Internal.CONST));
}));

results.push(test('CONST: FOUR_LAYERS has all four layers defined', () => {
    assert.strictEqual(Internal.CONST.FOUR_LAYERS.L1_FULL_AUTO, 'L1_FULL_AUTO');
    assert.strictEqual(Internal.CONST.FOUR_LAYERS.L2_ASSISTED, 'L2_ASSISTED');
    assert.strictEqual(Internal.CONST.FOUR_LAYERS.L3_HUMAN_INTERVENE, 'L3_HUMAN_INTERVENE');
    assert.strictEqual(Internal.CONST.FOUR_LAYERS.L4_EXTREME_FALLBACK, 'L4_EXTREME_FALLBACK');
}));

results.push(test('CONST: FAT_LEAN_STATES has FAT/NEUTRAL/LEAN', () => {
    assert.strictEqual(Internal.CONST.FAT_LEAN_STATES.FAT, 'FAT');
    assert.strictEqual(Internal.CONST.FAT_LEAN_STATES.NEUTRAL, 'NEUTRAL');
    assert.strictEqual(Internal.CONST.FAT_LEAN_STATES.LEAN, 'LEAN');
}));

console.log(`\n--- kelly-base.js: Kelly Criterion ---`);

const Kelly = require('../game-os-main/core-engine/kelly-base.js');

results.push(test('calcRawKelly: even bet (p=0.5, b=1) returns 0', () => {
    approxEqual(Kelly.calcRawKelly(0.5, 1), 0);
}));

results.push(test('calcRawKelly: positive edge yields positive Kelly', () => {
    const k = Kelly.calcRawKelly(0.6, 1);
    assert.ok(k > 0, 'p=0.6, b=1 should yield positive Kelly');
    assert.ok(k <= 1, 'Kelly cannot exceed 1');
    approxEqual(k, 0.2);
}));

results.push(test('calcRawKelly: no edge (p<0.5 even odds) yields 0 (clamped)', () => {
    const k = Kelly.calcRawKelly(0.4, 1);
    assert.strictEqual(k, 0, 'p=0.4, b=1 should be clamped to 0');
}));

results.push(test('calcRawKelly: invalid winRate clamped to [0,1]', () => {
    const k = Kelly.calcRawKelly(-0.5, 2);
    assert.ok(k >= 0 && k <= 1);
    const k2 = Kelly.calcRawKelly(1.5, 2);
    assert.ok(k2 >= 0 && k2 <= 1);
}));

results.push(test('calcRawKelly: zero/negative winLossRatio returns 0', () => {
    assert.strictEqual(Kelly.calcRawKelly(0.6, 0), 0);
    assert.strictEqual(Kelly.calcRawKelly(0.6, -1), 0);
}));

results.push(test('applyKellyScaling: half-Kelly (0.5) halves the position', () => {
    approxEqual(Kelly.applyKellyScaling(0.4, 0.5), 0.2);
}));

results.push(test('applyKellyScaling: quarter-Kelly (0.25) quarters the position', () => {
    approxEqual(Kelly.applyKellyScaling(0.4, 0.25), 0.1);
}));

results.push(test('applyKellyScaling: invalid input clamps safely', () => {
    const r = Kelly.applyKellyScaling(NaN, 0.5);
    assert.ok(r >= 0 && r <= 1);
}));

results.push(test('optimalBandCheck: position in [0.30, 0.50] is optimal', () => {
    const r = Kelly.optimalBandCheck(0.4);
    assert.strictEqual(r.inOptimalBand, true);
    assert.strictEqual(r.tooConservative, false);
    assert.strictEqual(r.tooAggressive, false);
}));

results.push(test('optimalBandCheck: below 0.30 is too conservative', () => {
    const r = Kelly.optimalBandCheck(0.2);
    assert.strictEqual(r.inOptimalBand, false);
    assert.strictEqual(r.tooConservative, true);
}));

results.push(test('optimalBandCheck: above 0.50 is too aggressive', () => {
    const r = Kelly.optimalBandCheck(0.6);
    assert.strictEqual(r.inOptimalBand, false);
    assert.strictEqual(r.tooAggressive, true);
}));

results.push(test('optimalBandCheck: edges are inclusive (0.30 and 0.50 both optimal)', () => {
    assert.strictEqual(Kelly.optimalBandCheck(0.30).inOptimalBand, true);
    assert.strictEqual(Kelly.optimalBandCheck(0.50).inOptimalBand, true);
}));

results.push(test('calibrateKellyMultiplier: base=1, rationality=50, all adjustments=1 returns 1.0', () => {
    const m = Kelly.calibrateKellyMultiplier(1.0, 50, { tiltAdjustment: 1, regimeAdjustment: 1, businessAdjustment: 1 });
    approxEqual(m, 1.0);
}));

results.push(test('calibrateKellyMultiplier: rationality=0 gives multiplier 0.5', () => {
    const m = Kelly.calibrateKellyMultiplier(1.0, 0, {});
    approxEqual(m, 0.5);
}));

results.push(test('calibrateKellyMultiplier: rationality=100 gives multiplier 1.5', () => {
    const m = Kelly.calibrateKellyMultiplier(1.0, 100, {});
    approxEqual(m, 1.5);
}));

results.push(test('calibrateKellyMultiplier: result clamped to [0, 2]', () => {
    const m = Kelly.calibrateKellyMultiplier(10, 100, { tiltAdjustment: 10, regimeAdjustment: 10, businessAdjustment: 10 });
    assert.ok(m <= 2.0, 'Multiplier should be capped at 2.0');
    assert.ok(m >= 0);
}));

results.push(test('evaluate: full pipeline produces valid result structure', () => {
    const r = Kelly.evaluate({
        winRate: 0.6,
        winLossRatio: 1,
        scalingFactor: 0.5,
        rationalityScore: 50
    });
    assert.ok(typeof r.rawKelly === 'number');
    assert.ok(typeof r.scaledKelly === 'number');
    assert.ok(typeof r.finalPosition === 'number');
    assert.ok(r.finalPosition >= 0 && r.finalPosition <= 1);
    assert.ok(r.optimalBand);
    assert.strictEqual(typeof r.optimalBand.inOptimalBand, 'boolean');
}));

results.push(test('evaluate: empty payload returns safe defaults without crash', () => {
    const r = Kelly.evaluate({});
    assert.ok(r.finalPosition >= 0 && r.finalPosition <= 1);
    assert.ok(r.rawKelly >= 0 && r.rawKelly <= 1);
}));

results.push(test('evaluate: null payload returns safe defaults without crash', () => {
    const r = Kelly.evaluate(null);
    assert.ok(r.finalPosition >= 0 && r.finalPosition <= 1);
}));

console.log(`\n--- safety-fuse.js: Circuit Breaker ---`);

const Fuse = require('../game-os-main/core-engine/safety-fuse.js');

results.push(test('FUSE_BASELINE constant equals 0.68', () => {
    assert.strictEqual(Fuse.FUSE_BASELINE, 0.68);
}));

results.push(test('evaluate result always includes canBypass=false (critical invariant)', () => {
    const r = Fuse.evaluate({ coneC: 0.1 });
    assert.strictEqual(r.canBypass, false);
    const r2 = Fuse.evaluate({ coneC: 0.9 });
    assert.strictEqual(r2.canBypass, false);
}));

results.push(test('evaluate: normal coneC (0.5) under FUSE_BASELINE does not halt', () => {
    const r = Fuse.evaluate({ coneC: 0.5 });
    assert.strictEqual(r.halted, false);
    assert.strictEqual(r.state, 'ARMED');
}));

results.push(test('evaluate: coneC >= 0.68 triggers VALUATION fuse', () => {
    const r = Fuse.evaluate({ coneC: 0.70 });
    assert.strictEqual(r.halted, true);
    assert.strictEqual(r.state, 'TRIGGERED');
    const valTrigger = r.triggers.find(t => t.category === 'VALUATION');
    assert.ok(valTrigger && valTrigger.triggered === true);
}));

results.push(test('evaluate: coneC exactly at boundary (0.68) triggers fuse', () => {
    const r = Fuse.evaluate({ coneC: 0.68 });
    assert.strictEqual(r.halted, true);
}));

results.push(test('evaluate: coneC just below boundary (0.679) does not trigger VALUATION', () => {
    const r = Fuse.evaluate({ coneC: 0.679 });
    assert.strictEqual(r.halted, false);
}));

results.push(test('evaluate: blackSwanEvent triggers BLACK_SWAN fuse category', () => {
    const r = Fuse.evaluate({ coneC: 0.3, blackSwanEvent: true });
    assert.strictEqual(r.halted, true);
    const bs = r.triggers.find(t => t.category === 'BLACK_SWAN');
    assert.ok(bs && bs.triggered === true);
}));

results.push(test('evaluate: manualKillSwitch triggers MANUAL_KILLSWITCH category', () => {
    const r = Fuse.evaluate({ coneC: 0.1, manualKillSwitch: true });
    assert.strictEqual(r.halted, true);
    const mk = r.triggers.find(t => t.category === 'MANUAL_KILLSWITCH');
    assert.ok(mk && mk.triggered === true);
}));

results.push(test('evaluate: systemicCollapse triggers SYSTEMIC_COLLAPSE category', () => {
    const r = Fuse.evaluate({ coneC: 0.1, systemicCollapse: true });
    assert.strictEqual(r.halted, true);
    const sc = r.triggers.find(t => t.category === 'SYSTEMIC_COLLAPSE');
    assert.ok(sc && sc.triggered === true);
}));

results.push(test('evaluate: emotionalTilt >= 0.68 triggers EMOTIONAL_TILT category', () => {
    const r = Fuse.evaluate({ coneC: 0.3, emotionalTilt: 0.7 });
    assert.strictEqual(r.halted, true);
    const et = r.triggers.find(t => t.category === 'EMOTIONAL_TILT');
    assert.ok(et && et.triggered === true);
}));

results.push(test('evaluate: emotionalTilt below 0.68 does not trigger EMOTIONAL_TILT', () => {
    const r = Fuse.evaluate({ coneC: 0.3, emotionalTilt: 0.5 });
    assert.strictEqual(r.halted, false);
}));

results.push(test('evaluate: maxDrawdown >= 0.68 triggers MAX_DRAWDOWN category', () => {
    const r = Fuse.evaluate({ coneC: 0.3, maxDrawdown: 0.75 });
    assert.strictEqual(r.halted, true);
    const mdd = r.triggers.find(t => t.category === 'MAX_DRAWDOWN');
    assert.ok(mdd && mdd.triggered === true);
}));

results.push(test('evaluate: enforcedPosition is 0 when halted (forced exit)', () => {
    const r = Fuse.evaluate({ coneC: 0.8, requestedPosition: 0.5 });
    assert.strictEqual(r.halted, true);
    assert.strictEqual(r.enforcedPosition, 0);
}));

results.push(test('evaluate: requestedPosition is respected when not halted', () => {
    const r = Fuse.evaluate({ coneC: 0.3, requestedPosition: 0.4 });
    assert.strictEqual(r.halted, false);
    approxEqual(r.enforcedPosition, 0.4);
}));

results.push(test('evaluate: null/empty input does not crash, returns safe result', () => {
    const r = Fuse.evaluate(null);
    assert.strictEqual(typeof r.halted, 'boolean');
    assert.strictEqual(typeof r.enforcedPosition, 'number');
    const r2 = Fuse.evaluate({});
    assert.strictEqual(typeof r2.halted, 'boolean');
}));

results.push(test('evaluate: warningLevel is SAFE at low coneC, WARNING near threshold', () => {
    const safe = Fuse.evaluate({ coneC: 0.2 });
    assert.strictEqual(safe.warningLevel, 'SAFE');
}));

results.push(test('canReset: requires manual confirmation after cooldown', () => {
    const future = Date.now() + 100000;
    const r = Fuse.canReset('TRIGGERED', { lastTriggerAt: 0, cooldownPeriodMs: 0, manualResetConfirmed: true });
    assert.strictEqual(r.canReset, true);
}));

results.push(test('canReset: without manual confirmation cannot reset', () => {
    const r = Fuse.canReset('TRIGGERED', { lastTriggerAt: 0, cooldownPeriodMs: 0, manualResetConfirmed: false });
    assert.strictEqual(r.canReset, false);
    assert.strictEqual(r.requiresManualConfirm, true);
}));

console.log(`\n--- four-layer-control.js: Layer Control ---`);

const Control = require('../game-os-main/core-engine/four-layer-control.js');

results.push(test('LAYERS constant matches Internal.CONST.FOUR_LAYERS', () => {
    assert.strictEqual(Control.LAYERS.L1_FULL_AUTO, 'L1_FULL_AUTO');
    assert.strictEqual(Control.LAYERS.L4_EXTREME_FALLBACK, 'L4_EXTREME_FALLBACK');
}));

results.push(test('determineLayer: normal safe state returns L1_FULL_AUTO', () => {
    const r = Control.determineLayer({ coneC: 0.2, emotionalTilt: 0.1, rationalityScore: 80, fuseTriggered: false }, null);
    assert.strictEqual(r.recommendedLayer, 'L1_FULL_AUTO');
    assert.strictEqual(r.reason, 'SAFE_NORMAL_OPERATION');
}));

results.push(test('determineLayer: fuse triggered forces L4_EXTREME_FALLBACK', () => {
    const r = Control.determineLayer({ coneC: 0.2, emotionalTilt: 0.1, rationalityScore: 80, fuseTriggered: true }, null);
    assert.strictEqual(r.recommendedLayer, 'L4_EXTREME_FALLBACK');
}));

results.push(test('determineLayer: extremeEvent forces L4_EXTREME_FALLBACK', () => {
    const r = Control.determineLayer({ coneC: 0.2, emotionalTilt: 0.1, rationalityScore: 80, fuseTriggered: false, extremeEvent: true }, null);
    assert.strictEqual(r.recommendedLayer, 'L4_EXTREME_FALLBACK');
}));

results.push(test('determineLayer: coneC >= 0.68 (default L3toL4) forces L4', () => {
    const r = Control.determineLayer({ coneC: 0.7, emotionalTilt: 0.1, rationalityScore: 80, fuseTriggered: false }, null);
    assert.strictEqual(r.recommendedLayer, 'L4_EXTREME_FALLBACK');
}));

results.push(test('determineLayer: high tilt (>=0.5 default L2toL3) returns L3', () => {
    const r = Control.determineLayer({ coneC: 0.3, emotionalTilt: 0.6, rationalityScore: 80, fuseTriggered: false }, null);
    assert.strictEqual(r.recommendedLayer, 'L3_HUMAN_INTERVENE');
}));

results.push(test('determineLayer: low rationality (<40) returns L3', () => {
    const r = Control.determineLayer({ coneC: 0.3, emotionalTilt: 0.1, rationalityScore: 20, fuseTriggered: false }, null);
    assert.strictEqual(r.recommendedLayer, 'L3_HUMAN_INTERVENE');
}));

results.push(test('determineLayer: moderate risk (coneC>=0.4) returns L2_ASSISTED', () => {
    const r = Control.determineLayer({ coneC: 0.45, emotionalTilt: 0.1, rationalityScore: 80, fuseTriggered: false }, null);
    assert.strictEqual(r.recommendedLayer, 'L2_ASSISTED');
}));

results.push(test('determineLayer: eightTwentySplit correctly reflects machine/human power', () => {
    const l1 = Control.determineLayer({ coneC: 0.1, emotionalTilt: 0, rationalityScore: 90, fuseTriggered: false }, null);
    assert.strictEqual(l1.eightTwentySplit.machine, 1.0);
    assert.strictEqual(l1.eightTwentySplit.human, 0.0);
    assert.strictEqual(l1.eightTwentySplit.machinePipeline, true);
}));

results.push(test('canExecute: POSITION_OPEN in L1 allowed autoExecute', () => {
    const p = Control.canExecute('L1_FULL_AUTO', 'POSITION_OPEN');
    assert.strictEqual(p.allowed, true);
    assert.strictEqual(p.autoExecute, true);
}));

results.push(test('canExecute: POSITION_OPEN in L4 not allowed (all halted)', () => {
    const p = Control.canExecute('L4_EXTREME_FALLBACK', 'POSITION_OPEN');
    assert.strictEqual(p.allowed, false);
    assert.strictEqual(p.autoExecute, false);
}));

console.log(`\n--- fat-lean-band.js: Fat/Lean Dynamic Band ---`);

const FatLean = require('../game-os-main/core-engine/fat-lean-band.js');

results.push(test('STATES has FAT/NEUTRAL/LEAN', () => {
    assert.strictEqual(FatLean.STATES.FAT, 'FAT');
    assert.strictEqual(FatLean.STATES.NEUTRAL, 'NEUTRAL');
    assert.strictEqual(FatLean.STATES.LEAN, 'LEAN');
}));

results.push(test('evaluate: high indicator (>=fatThreshold default 0.6) returns FAT', () => {
    const r = FatLean.evaluate(0.9, { fatThreshold: 0.6, leanThreshold: 0.4 });
    assert.strictEqual(r.state, 'FAT');
    assert.strictEqual(r.isFat, true);
}));

results.push(test('evaluate: low indicator (<=leanThreshold default 0.4) returns LEAN', () => {
    const r = FatLean.evaluate(0.2, { fatThreshold: 0.6, leanThreshold: 0.4 });
    assert.strictEqual(r.state, 'LEAN');
    assert.strictEqual(r.isLean, true);
}));

results.push(test('evaluate: mid indicator returns NEUTRAL', () => {
    const r = FatLean.evaluate(0.5, { fatThreshold: 0.6, leanThreshold: 0.4 });
    assert.strictEqual(r.state, 'NEUTRAL');
    assert.strictEqual(r.isNeutral, true);
}));

results.push(test('evaluate: invalid leanThreshold (>=fatThreshold) auto-corrected', () => {
    const r = FatLean.evaluate(0.5, { fatThreshold: 0.5, leanThreshold: 0.6 });
    assert.ok(r.leanThreshold < r.fatThreshold);
}));

results.push(test('getTightness: FAT returns looseness coefficient >= 1.0', () => {
    const fat = FatLean.evaluate(0.9, { fatThreshold: 0.6, leanThreshold: 0.4 });
    const t = FatLean.getTightness(fat, { fatLoosenessFactor: 1.3, leanTightnessFactor: 0.7 });
    assert.ok(t.tightnessCoefficient > 1.0, 'FAT should loosen (coeff > 1), got ' + t.tightnessCoefficient);
}));

results.push(test('getTightness: LEAN returns tightness coefficient < 1.0', () => {
    const lean = FatLean.evaluate(0.2, { fatThreshold: 0.6, leanThreshold: 0.4 });
    const t = FatLean.getTightness(lean, { fatLoosenessFactor: 1.3, leanTightnessFactor: 0.7 });
    assert.ok(t.tightnessCoefficient < 1.0, 'LEAN should tighten (coeff < 1), got ' + t.tightnessCoefficient);
}));

results.push(test('getTightness: NEUTRAL returns coefficient 1.0', () => {
    const neutral = FatLean.evaluate(0.5, { fatThreshold: 0.6, leanThreshold: 0.4 });
    const t = FatLean.getTightness(neutral, {});
    assert.strictEqual(t.tightnessCoefficient, 1.0);
}));

results.push(test('transition: band changes correctly reported', () => {
    const t = FatLean.transition('NEUTRAL', 0.9, { fatThreshold: 0.6, leanThreshold: 0.4 });
    assert.strictEqual(t.transitioned, true);
    assert.strictEqual(t.direction, 'TO_FAT');
    assert.strictEqual(t.newState, 'FAT');
}));

results.push(test('transition: no change when staying in same band', () => {
    const t = FatLean.transition('FAT', 0.95, { fatThreshold: 0.6, leanThreshold: 0.4 });
    assert.strictEqual(t.transitioned, false);
    assert.strictEqual(t.direction, 'STAY');
}));

console.log(`\n========================================`);
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);
if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
}
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);
