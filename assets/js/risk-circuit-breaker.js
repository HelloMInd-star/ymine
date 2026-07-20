/**
 * Y.Mine RiskCircuitBreaker · 风控熔断中间件
 * -------------------------------------------
 * 所有凯利/仓位计算的前置强制门控。
 * 任何模块计算建议仓位后，必须调用 enforce() 才能得到最终可执行仓位。
 * 熔断触发时 actualRatio 强制为 0，不可被任何下游逻辑覆盖。
 *
 * 熔断触发条件（任一触发即熔断）：
 *   1. CONE_C_BREACH      : 圆锥浓度 C >= 0.68（正态分布1σ临界值）
 *   2. ZSCORE_BLACK_SWAN  : zScore 绝对值 >= 2σ（黑天鹅）
 *   3. ZSCORE_MELTDOWN    : zScore 绝对值 >= 3σ（系统性坍缩）
 *   4. MDD_BREACH         : 最大回撤 MDD >= 0.50
 *   5. DRAWDOWN_FUSE      : 博弈场内部回撤熔断
 *   6. MANUAL_HALT        : 手动紧急停机
 */
(function(global) {
    'use strict';

    const THRESHOLDS = (global.YBus && global.YBus.THRESHOLDS) || Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    const FUSE_THRESHOLDS = {
        CONE_C: THRESHOLDS.FUSE,
        ZSCORE_BLACK_SWAN: 2.0,
        ZSCORE_MELTDOWN: 3.0,
        MDD_MAX: THRESHOLDS.STEADY,
        DRAWDOWN_MAX: THRESHOLDS.BREAKEVEN * 0.833,
        DRAWDOWN_BREAKEVEN: THRESHOLDS.BREAKEVEN
    };

    const FUSE_IDS = {
        CONE_C_BREACH: 'CONE_C_BREACH',
        ZSCORE_BLACK_SWAN: 'ZSCORE_BLACK_SWAN',
        ZSCORE_MELTDOWN: 'ZSCORE_MELTDOWN',
        MDD_BREACH: 'MDD_BREACH',
        DRAWDOWN_FUSE: 'DRAWDOWN_FUSE',
        BREAKEVEN_WARNING: 'BREAKEVEN_WARNING',
        MANUAL_HALT: 'MANUAL_HALT',
        NPV_NEGATIVE: 'NPV_NEGATIVE',
        IRR_BELOW_HURDLE: 'IRR_BELOW_HURDLE'
    };

    function RiskCircuitBreaker() {
        this._activeFuses = {};
        this._state = {
            coneC: 0.50,
            zScore: 0,
            mdd: 0.25,
            drawdown: 0,
            manualHalt: false,
            npvNegative: false,
            irrBelowHurdle: false
        };
        this._halfKellyWarnThreshold = 0.50;
        this._absoluteHardCap = 0.25;
        this._listeners = [];
    }

    RiskCircuitBreaker.prototype.update = function(signals) {
        if (signals.coneC !== undefined) this._state.coneC = signals.coneC;
        if (signals.zScore !== undefined) this._state.zScore = signals.zScore;
        if (signals.mdd !== undefined) this._state.mdd = signals.mdd;
        if (signals.drawdown !== undefined) this._state.drawdown = signals.drawdown;
        if (signals.manualHalt !== undefined) this._state.manualHalt = !!signals.manualHalt;
        if (signals.npvNegative !== undefined) this._state.npvNegative = !!signals.npvNegative;
        if (signals.irrBelowHurdle !== undefined) this._state.irrBelowHurdle = !!signals.irrBelowHurdle;
        return this.evaluate();
    };

    RiskCircuitBreaker.prototype.setManualHalt = function(halted) {
        this._state.manualHalt = !!halted;
        return this.evaluate();
    };

    RiskCircuitBreaker.prototype.evaluate = function() {
        const s = this._state;
        const f = {};
        const warnings = {};
        const t = FUSE_THRESHOLDS;

        const compositeScore = (s.coneC + (1 - Math.min(Math.abs(s.zScore) / 3, 1)) + (1 - s.mdd) + (1 - s.drawdown)) / 4;

        if (compositeScore < THRESHOLDS.BREAKEVEN || s.coneC < THRESHOLDS.BREAKEVEN) {
            warnings[FUSE_IDS.BREAKEVEN_WARNING] = { value: compositeScore, threshold: THRESHOLDS.BREAKEVEN, reason: '跌破0.48保本线·启动保本风控' };
        }
        if (s.coneC >= t.CONE_C) f[FUSE_IDS.CONE_C_BREACH] = { value: s.coneC, threshold: t.CONE_C, reason: '圆锥浓度C≥0.68·熔断预警线触发' };
        if (Math.abs(s.zScore) >= t.ZSCORE_MELTDOWN) f[FUSE_IDS.ZSCORE_MELTDOWN] = { value: s.zScore, threshold: t.ZSCORE_MELTDOWN, reason: 'zScore≥3σ·系统性坍缩' };
        else if (Math.abs(s.zScore) >= t.ZSCORE_BLACK_SWAN) f[FUSE_IDS.ZSCORE_BLACK_SWAN] = { value: s.zScore, threshold: t.ZSCORE_BLACK_SWAN, reason: 'zScore≥2σ·黑天鹅事件' };
        if (s.mdd >= t.MDD_MAX) f[FUSE_IDS.MDD_BREACH] = { value: s.mdd, threshold: t.MDD_MAX, reason: '最大回撤≥0.50稳态中轴线' };
        if (s.drawdown >= t.DRAWDOWN_MAX) f[FUSE_IDS.DRAWDOWN_FUSE] = { value: s.drawdown, threshold: t.DRAWDOWN_MAX, reason: '组合回撤≥熔断阈值' };
        if (s.manualHalt) f[FUSE_IDS.MANUAL_HALT] = { value: true, threshold: true, reason: '手动紧急停机' };
        if (s.npvNegative) f[FUSE_IDS.NPV_NEGATIVE] = { value: true, threshold: true, reason: 'NPV为负·资本约束' };

        this._activeFuses = f;
        this._activeWarnings = warnings;
        const triggered = Object.keys(f);
        const warningList = Object.keys(warnings);
        const isHalted = triggered.length > 0;
        const breakevenWarning = warningList.length > 0;

        const event = {
            halted: isHalted,
            activeFuses: f,
            activeWarnings: warnings,
            fuseIds: triggered,
            warningIds: warningList,
            breakevenWarning: breakevenWarning,
            fuseTriggered: isHalted,
            currentRiskLevel: compositeScore,
            state: Object.assign({}, s),
            timestamp: Date.now()
        };

        if (typeof YBus !== 'undefined' && YBus.publish) {
            YBus.publish('riskThreshold', {
                engine: 'RiskCircuitBreaker',
                timestamp: Date.now(),
                breakevenLine: THRESHOLDS.BREAKEVEN,
                steadyAxis: THRESHOLDS.STEADY,
                fuseLine: THRESHOLDS.FUSE,
                currentRiskLevel: compositeScore,
                breakevenWarning: breakevenWarning,
                fuseTriggered: isHalted,
                riskFlags: triggered.concat(warningList),
                source: 'risk-circuit-breaker'
            }, { trusted: true });
        }

        this._listeners.forEach(function(fn) {
            try { fn(event); } catch (e) { console.warn('[RCB] Listener error:', e); }
        });

        return event;
    };

    RiskCircuitBreaker.prototype.enforce = function(requestedPosition, opts) {
        opts = opts || {};
        const evt = this.evaluate();

        let finalRatio = requestedPosition;
        let caps = [];
        let reductions = [];

        if (evt.halted) {
            finalRatio = 0;
            return {
                requested: requestedPosition,
                actual: 0,
                halted: true,
                activeFuses: evt.activeFuses,
                fuseIds: evt.fuseIds,
                caps: caps,
                reductions: [{ reason: 'FUSE_TRIGGERED', factor: 0, detail: Object.values(evt.activeFuses).map(function(f){return f.reason;}).join('; ') }],
                hedgingRequired: evt.fuseIds.indexOf(FUSE_IDS.ZSCORE_MELTDOWN) >= 0 ? 1.5 : (evt.fuseIds.indexOf(FUSE_IDS.ZSCORE_BLACK_SWAN) >= 0 ? 1.0 : 0.5),
                budgetMultiplier: 0,
                timestamp: Date.now()
            };
        }

        if (this._state.irrBelowHurdle && !this._state.npvNegative) {
            const cap = 0.6;
            if (finalRatio > cap) {
                finalRatio = cap;
                caps.push({ reason: 'IRR_BELOW_HURDLE', cap: cap });
            }
        }

        if (this._state.npvNegative) {
            const cap = 0.3 * this._absoluteHardCap;
            if (finalRatio > cap) {
                finalRatio = cap;
                caps.push({ reason: 'NPV_NEGATIVE', cap: cap });
            }
        }

        if (finalRatio > this._absoluteHardCap) {
            finalRatio = this._absoluteHardCap;
            caps.push({ reason: 'ABSOLUTE_HARD_CAP', cap: this._absoluteHardCap });
        }

        const coneDistance = Math.max(0, FUSE_THRESHOLDS.CONE_C - this._state.coneC);
        let tensionFactor = 1.0;
        if (coneDistance < 0.02) tensionFactor = 0.3;
        else if (coneDistance < 0.10) tensionFactor = 0.5;
        else if (coneDistance < 0.18) tensionFactor = 0.7;
        if (tensionFactor < 1.0 && finalRatio > 0) {
            reductions.push({ reason: 'TENSION_ZONE', factor: tensionFactor });
            finalRatio *= tensionFactor;
        }

        finalRatio = Math.max(0, Math.min(1, finalRatio));
        if (isNaN(finalRatio) || !isFinite(finalRatio)) finalRatio = 0;

        return {
            requested: requestedPosition,
            actual: finalRatio,
            halted: false,
            activeFuses: {},
            fuseIds: [],
            caps: caps,
            reductions: reductions,
            hedgingRequired: coneDistance < 0.06 ? 0.4 : (coneDistance < 0.18 ? 0.15 : 0),
            budgetMultiplier: finalRatio / Math.max(requestedPosition, 0.001),
            coneDistanceToFuse: coneDistance,
            timestamp: Date.now()
        };
    };

    RiskCircuitBreaker.prototype.getState = function() {
        return {
            state: Object.assign({}, this._state),
            activeFuses: Object.assign({}, this._activeFuses),
            thresholds: Object.assign({}, FUSE_THRESHOLDS),
            isHalted: Object.keys(this._activeFuses).length > 0
        };
    };

    RiskCircuitBreaker.prototype.on = function(fn) {
        this._listeners.push(fn);
    };

    RiskCircuitBreaker.prototype.FUSE_IDS = FUSE_IDS;
    RiskCircuitBreaker.prototype.THRESHOLDS = FUSE_THRESHOLDS;

    global.YMineRiskCB = new RiskCircuitBreaker();
    global.YMineRiskCircuitBreaker = RiskCircuitBreaker;

    if (typeof YBus !== 'undefined' && YBus.publish) {
        global.YMineRiskCB.on(function(evt) {
            YBus.publish('riskFuse', evt);
        });
    }
})(typeof window !== 'undefined' ? window : this);
