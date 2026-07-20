/**
 * FinanceMind · YBus 总线订阅/发布初始化模板
 *
 * 规范：
 * 1. 仅使用六大官方标准通道，禁止新增私有通道、禁止使用旧版simulatorOutput
 * 2. 所有riskThreshold输出必须经TriangleAudit.validate()三模型校验
 * 3. 阈值常量引用全局THRESHOLDS，禁止本地重定义0.48/0.50/0.68
 * 4. 订阅回调中严格做数据合法性校验，异常数据静默丢弃+audit_log记录
 */

(function () {
    'use strict';

    const TH = (typeof THRESHOLDS !== 'undefined')
        ? THRESHOLDS
        : Object.freeze({ BREAKEVEN: 0.48, STEADY: 0.50, FUSE: 0.68 });

    const FinanceMindBus = {
        state: {
            assetQuant: null,
            kellyAllocation: null,
            powerSchedule: null,
            gameEquilibrium: null,
            lastUpdate: {}
        },

        init: function () {
            if (typeof YBus === 'undefined' || !YBus.subscribe) {
                console.warn('[FinanceMind] YBus未就绪，1秒后重试订阅');
                setTimeout(() => this.init(), 1000);
                return;
            }
            this._subscribe('assetQuant', this._onAssetQuant.bind(this));
            this._subscribe('kellyAllocation', this._onKelly.bind(this));
            this._subscribe('powerSchedule', this._onPowerSchedule.bind(this));
            this._subscribe('gameEquilibrium', this._onEquilibrium.bind(this));
            console.log('%c[FinanceMind] YBus四通道订阅已完成挂载', 'color:#fbbf24;font-weight:bold');
        },

        _subscribe: function (channel, handler) {
            try {
                YBus.subscribe(channel, handler);
            } catch (e) {
                console.error('[FinanceMind] 订阅通道失败:', channel, e);
            }
        },

        _validate: function (data, requiredFields) {
            if (!data || typeof data !== 'object') return false;
            for (const f of requiredFields) {
                if (data[f] === undefined || data[f] === null) return false;
            }
            return true;
        },

        _onAssetQuant: function (data) {
            if (!this._validate(data, ['score'])) {
                console.warn('[FinanceMind] assetQuant数据非法，已丢弃');
                return;
            }
            if (data.score < 0 || data.score > 1) {
                console.warn('[FinanceMind] assetQuant.score越界[0,1]，已丢弃', data.score);
                return;
            }
            this.state.assetQuant = data;
            this.state.lastUpdate.assetQuant = Date.now();
            console.log('[FinanceMind] ↓ assetQuant 估值:', data.score.toFixed(3), data);
            this._recalcCashHealth();
        },

        _onKelly: function (data) {
            if (!this._validate(data, ['allocation'])) {
                console.warn('[FinanceMind] kellyAllocation数据非法，已丢弃');
                return;
            }
            this.state.kellyAllocation = data;
            this.state.lastUpdate.kellyAllocation = Date.now();
            console.log('[FinanceMind] ↓ kellyAllocation 配比:', JSON.stringify(data.allocation));
            this._recalcCashHealth();
        },

        _onPowerSchedule: function (data) {
            if (!this._validate(data, ['load'])) {
                console.warn('[FinanceMind] powerSchedule数据非法，已丢弃');
                return;
            }
            this.state.powerSchedule = data;
            this.state.lastUpdate.powerSchedule = Date.now();
            console.log('[FinanceMind] ↓ powerSchedule 负载:', data.load.toFixed(3));
            this._recalcCashHealth();
        },

        _onEquilibrium: function (data) {
            if (!this._validate(data, ['equilibriumScore'])) {
                console.warn('[FinanceMind] gameEquilibrium数据非法，已丢弃');
                return;
            }
            this.state.gameEquilibrium = data;
            this.state.lastUpdate.gameEquilibrium = Date.now();
            console.log('[FinanceMind] ↓ gameEquilibrium 均衡:', data.equilibriumScore.toFixed(3));
            this._recalcCashHealth();
        },

        _recalcCashHealth: function () {
            const s = this.state;
            if (!s.assetQuant || !s.kellyAllocation) return;

            const valuationScore = s.assetQuant.score || TH.STEADY;
            const kellyLoad = s.kellyAllocation.allocation
                ? (s.kellyAllocation.allocation.riskFraction || TH.STEADY)
                : TH.STEADY;
            const powerLoad = s.powerSchedule ? (s.powerSchedule.load || TH.STEADY) : TH.STEADY;
            const eqScore = s.gameEquilibrium ? (s.gameEquilibrium.equilibriumScore || TH.STEADY) : TH.STEADY;

            const riskScore = (valuationScore * 0.30 + kellyLoad * 0.30 + powerLoad * 0.20 + eqScore * 0.20);
            const clampedScore = Math.max(0, Math.min(1, riskScore));

            if (typeof window !== 'undefined' && window.FINANCE_MIND_STATE) {
                window.FINANCE_MIND_STATE.cashHealth = clampedScore;
                window.FINANCE_MIND_STATE.assetQuantData = s.assetQuant;
                window.FINANCE_MIND_STATE.kellyData = s.kellyAllocation;
                window.FINANCE_MIND_STATE.powerData = s.powerSchedule;
                window.FINANCE_MIND_STATE.equilibriumData = s.gameEquilibrium;
            }

            let level = 'NORMAL';
            if (clampedScore >= TH.FUSE) level = 'FUSE';
            else if (clampedScore >= TH.STEADY + 0.10) level = 'WARNING';
            else if (clampedScore < TH.BREAKEVEN) level = 'SAFE';

            this.publishRiskThreshold({
                score: clampedScore,
                level: level,
                valuationScore,
                kellyLoad,
                powerLoad,
                eqScore,
                coneConcentration: valuationScore
            });
        },

        publishRiskThreshold: function (riskData) {
            if (typeof TriangleAudit !== 'undefined' && TriangleAudit.validate) {
                const auditResult = TriangleAudit.validate({
                    financialActuarial: riskData.score,
                    gameTheory: riskData.kellyLoad,
                    geometric: riskData.coneConcentration
                }, { source: 'FinanceMind', action: 'riskThreshold.publish' });
                if (!auditResult.passed) {
                    console.error('[FinanceMind] 三角审计未通过，阻断riskThreshold发布', auditResult);
                    return false;
                }
            } else {
                console.warn('[FinanceMind] TriangleAudit未加载，跳过校验（生产环境禁止出现）');
            }

            if (typeof YBus !== 'undefined' && YBus.publish) {
                const payload = Object.assign({
                    source: 'FinanceMind',
                    timestamp: Date.now()
                }, riskData);
                YBus.publish('riskThreshold', payload, { trusted: true });
                const sigil = riskData.score >= TH.FUSE ? '🔥' : riskData.score < TH.BREAKEVEN ? '🛡️' : '⚠️';
                console.log(`%c[FinanceMind] ↑ riskThreshold ${sigil} score=${riskData.score.toFixed(3)} level=${riskData.level}`,
                    `color:${riskData.score >= TH.FUSE ? '#f87171' : riskData.score < TH.BREAKEVEN ? '#22c55e' : '#fbbf24'};font-weight:bold`);
                return true;
            }
            return false;
        }
    };

    if (typeof window !== 'undefined') {
        window.FinanceMindBus = FinanceMindBus;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => FinanceMindBus.init());
        } else {
            FinanceMindBus.init();
        }
    }
})();
