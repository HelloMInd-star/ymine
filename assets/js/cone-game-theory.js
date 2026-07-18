/**
 * ================================================================
 * Y.Mine 圆锥博弈论 · 0.68引力法则核心引擎
 * ================================================================
 * 
 * 【底层公理】
 * 1. 荷官(Dealer)处于圆锥体顶端，掌握绝对底牌(Ground Truth)
 * 2. 市场参与者构成三棱锥/四棱锥，多方压力向中心坍缩
 * 3. 0.68(1σ)为市场绝对引力中心，正态分布的稳态区间
 * 4. 波动在0.68区间内=正常博弈噪音，击穿=黑天鹅/极端情绪
 * 
 * @author Y.Mine System
 * @version 1.0.0 - God Mode Edition
 */

(function(global) {
    'use strict';

    const CONE_GRAVITY_CENTER = 0.68;
    const SIGMA_1 = 0.682689492;
    const SIGMA_2 = 0.954499736;
    const SIGMA_3 = 0.997300204;
    const GROUND_TRUTH_SIGMA = 0.16;

    const CHANNEL_FRICTION = {
        paid_ads: { phi: 0.85, alpha: 0.3, name: '买量投放', color: '#ef4444' },
        content: { phi: 0.15, alpha: 1.2, name: '自然内容', color: '#22c55e' },
        private_domain: { phi: 0.05, alpha: 2.0, name: '私域裂变', color: '#a78bfa' }
    };

    const PARTICIPANT_TYPES = {
        BULL: { id: 'bull', name: '多头', color: '#22c55e', pressure: 1 },
        BEAR: { id: 'bear', name: '空头', color: '#ef4444', pressure: -1 },
        WHALE: { id: 'whale', name: '巨鲸', color: '#a78bfa', pressure: 2.5 },
        RETAIL: { id: 'retail', name: '散户', color: '#60a5fa', pressure: 0.3 },
        MARKET_MAKER: { id: 'mm', name: '做市商', color: '#facc15', pressure: 0.8 }
    };

    const GAME_STATES = {
        CALM: { id: 'calm', name: '稳态博弈', color: '#22c55e', level: 0,
                description: '0.68引力区间内·凯利仓位正常执行' },
        TENSION: { id: 'tension', name: '张力累积', color: '#facc15', level: 1,
                  description: '接近0.68边界·仓位警戒·波动率上升' },
        EXTREME: { id: 'extreme', name: '极端波动', color: '#fb923c', level: 2,
                  description: '击穿1σ区间·减仓50%·准备风控' },
        BLACK_SWAN: { id: 'black_swan', name: '黑天鹅', color: '#ef4444', level: 3,
                     description: '击穿2σ边界·最高级别风险清算·全仓对冲' },
        MELTDOWN: { id: 'meltdown', name: '系统性坍缩', color: '#dc2626', level: 4,
                   description: '3σ外·流动性枯竭·熔断清算' }
    };

    class Participant {
        constructor(type, position, conviction) {
            this.type = type;
            this.position = position;
            this.conviction = Math.max(0, Math.min(1, conviction));
            this.pressureVector = PARTICIPANT_TYPES[type].pressure * this.conviction;
            this.alive = true;
            this.pnl = 0;
        }

        updatePressure(centerGravity, volatility) {
            const pullStrength = (centerGravity - this.position) * volatility * 0.3;
            this.position += pullStrength * 0.1;
            this.position = Math.max(-1, Math.min(1, this.position));
            
            const distanceFromCenter = Math.abs(this.position - centerGravity);
            if (distanceFromCenter > 2.5 && this.conviction < 0.8) {
                this.alive = Math.random() > distanceFromCenter * 0.3;
            }
        }
    }

    class ConeGameField {
        constructor(config = {}) {
            this.config = {
                gravityCenter: config.gravityCenter || CONE_GRAVITY_CENTER,
                sigma1: config.sigma1 || SIGMA_1,
                collapseRate: config.collapseRate || 0.02,
                volatilityWindow: config.volatilityWindow || 60,
                kellyFraction: config.kellyFraction || 0.5,
                ...config
            };

            this.dealer = {
                position: 1.0,
                groundTruth: this.config.gravityCenter,
                entropy: 0,
                cardsDealt: 0
            };

            this.participants = [];
            this.priceHistory = [];
            this.volatilityHistory = [];
            this.state = GAME_STATES.CALM;
            this.coneCollapse = 0;
            this.centerPressure = 0;
            this.timestamp = Date.now();
            this.listeners = {};

            this.brandVolume = {
                V: 1.0,
                r: 0.10,
                h: 1.0,
                growthRate: 0,
                frozen: false,
                freezeReason: '',
                totalDeposited: 0,
                lastGrowthTick: 0,
                decayPerTick: 0.0005
            };

            this.hedgeReservoir = {
                totalPool: 0,
                privateDomain: 0,
                premiumContent: 0,
                privateRatio: 0.75,
                contentRatio: 0.25,
                lastInjection: 0,
                injectionSource: ''
            };

            this.pokerBridge = {
                connected: false,
                handsPlayed: 0,
                totalPnL: 0,
                runningWinRate: 0.50,
                lastHandResult: null,
                gtBias: 0,
                kellyBias: 0,
                bigBlind: 10,
                stackSize: 1000
            };

            this.valuationAnchor = {
                enabled: false,
                blendedValue: 0.68,
                wacc: 0.095,
                hurdleRate: 0.08,
                npv: 0,
                irr: 0,
                strategicNPV: 0,
                waitOptVal: 0,
                expandOptVal: 0,
                abandonOptVal: 0,
                valuationGap: 0,
                mispricingSignal: 'fair',
                gravityStrength: 0.15,
                kellyCapByIRR: 1.0,
                lastUpdate: 0
            };

            this._initDefaultParticipants();
        }

        _initDefaultParticipants() {
            this.addParticipant('WHALE', -0.3, 0.9);
            this.addParticipant('WHALE', 0.4, 0.85);
            this.addParticipant('BULL', 0.2, 0.7);
            this.addParticipant('BULL', 0.5, 0.6);
            this.addParticipant('BULL', 0.1, 0.5);
            this.addParticipant('BEAR', -0.4, 0.75);
            this.addParticipant('BEAR', -0.6, 0.65);
            this.addParticipant('BEAR', -0.2, 0.4);
            for (let i = 0; i < 15; i++) {
                const pos = (Math.random() - 0.5) * 1.2;
                const conv = 0.2 + Math.random() * 0.4;
                this.addParticipant('RETAIL', pos, conv);
            }
            this.addParticipant('MARKET_MAKER', 0, 0.95);
        }

        addParticipant(type, position, conviction) {
            const p = new Participant(type, position, conviction);
            this.participants.push(p);
            return p;
        }

        calculateNormalPDF(x, mu = this.config.gravityCenter, sigma = 0.16) {
            const coeff = 1 / (sigma * Math.sqrt(2 * Math.PI));
            const exponent = -Math.pow(x - mu, 2) / (2 * sigma * sigma);
            return coeff * Math.exp(exponent);
        }

        calculateVolatility() {
            if (this.priceHistory.length < 5) return 0.1;
            const returns = [];
            for (let i = 1; i < this.priceHistory.length; i++) {
                returns.push(Math.abs(Math.log(this.priceHistory[i] / this.priceHistory[i-1])));
            }
            const mean = returns.reduce((a,b) => a+b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
            return Math.sqrt(variance) * Math.sqrt(252);
        }

        calculateCenterPressure() {
            let totalPressure = 0;
            let totalWeight = 0;
            this.participants.forEach(p => {
                if (!p.alive) return;
                const distanceWeight = 1 - Math.abs(p.position - this.config.gravityCenter);
                totalPressure += p.pressureVector * distanceWeight;
                totalWeight += Math.abs(p.pressureVector);
            });
            this.centerPressure = totalWeight > 0 ? totalPressure / totalWeight : 0;
            return this.centerPressure;
        }

        calculateImpliedPrice() {
            let weightedPos = 0;
            let totalWeight = 0;
            this.participants.forEach(p => {
                if (!p.alive) return;
                const weight = Math.abs(p.pressureVector) * p.conviction;
                weightedPos += p.position * weight;
                totalWeight += weight;
            });
            const consensusPos = totalWeight > 0 ? weightedPos / totalWeight : 0;
            const gtMapped = this.dealer.groundTruth * 2 - 1;
            const gravityPull = (gtMapped - consensusPos) * (0.15 + this.dealer.revelation * 0.2);
            const noiseSigma = 0.02 * (1 - this.dealer.revelation * 0.5);
            const price = 0.5 + consensusPos * 0.4 + gravityPull + (Math.random() - 0.5) * noiseSigma;
            return Math.max(0.01, Math.min(0.99, price));
        }

        updateKellyFraction(fStar) {
            this.config.kellyFraction = Math.max(0, Math.min(1, fStar));
        }

        determineGameState(zScore) {
            const absZ = Math.abs(zScore);
            if (absZ > 3) return GAME_STATES.MELTDOWN;
            if (absZ > 2) return GAME_STATES.BLACK_SWAN;
            if (absZ > 1) return GAME_STATES.EXTREME;
            if (absZ > 0.6745) return GAME_STATES.TENSION;
            return GAME_STATES.CALM;
        }

        calculateZScore(currentPrice) {
            const mu = this.dealer.groundTruth;
            const sigma = GROUND_TRUTH_SIGMA;
            return (currentPrice - mu) / sigma;
        }

        generateDecisionCommand(state, zScore, volatility) {
            const baseKelly = this.config.kellyFraction;
            const absZ = Math.abs(zScore);
            let antiFragilityGamma = absZ > 2 ? Math.min(0.2, (absZ - 2) * 0.1) : 0;

            const distribution = this.calculateOptimalDistribution(state, absZ);

            let kellyCap = 1.0;
            let budgetCap = 1.0;
            let valuationAdjusted = false;
            let valuationSignal = 'neutral';
            if (this.valuationAnchor.enabled) {
                const va = this.valuationAnchor;
                if (va.npv < 0) {
                    kellyCap = 0.3;
                    budgetCap = 0.3;
                    valuationSignal = 'npv_negative';
                    valuationAdjusted = true;
                } else if (va.irr < va.hurdleRate) {
                    kellyCap = 0.6;
                    budgetCap = 0.6;
                    valuationSignal = 'irr_below_hurdle';
                    valuationAdjusted = true;
                }
                if (va.expandOptVal > 0 && state.id === 'calm' && va.mispricingSignal === 'undervalued') {
                    kellyCap = Math.min(1.0, kellyCap * 1.15);
                }
                if (va.abandonOptVal > Math.abs(va.npv) * 0.3) {
                    antiFragilityGamma = Math.min(0.25, antiFragilityGamma + 0.05);
                }
            }

            const commands = {
                calm: {
                    action: valuationSignal === 'npv_negative' ? 'DE_RISK' : 'HOLD',
                    positionSizing: Math.min(baseKelly, baseKelly * kellyCap),
                    hedgeRatio: valuationSignal === 'npv_negative' ? 0.3 : 0,
                    leverage: valuationSignal === 'npv_negative' ? 0.5 : 1.0,
                    antiFragilityGamma: 0,
                    distribution: distribution,
                    budgetMultiplier: Math.min(1.0, budgetCap),
                    valuationSignal,
                    valuationAdjusted,
                    message: valuationSignal === 'npv_negative'
                        ? '🔻 NPV为负·资本约束强制减仓'
                        : (valuationSignal === 'irr_below_hurdle' ? '⚠️ IRR低于WACC门槛·谨慎' : '✅ 0.68引力区间稳态·执行凯利标准仓位'),
                    orders: valuationAdjusted
                        ? ['资本约束启动·减仓至hurdle rate许可范围', '复核DCF假设']
                        : ['维持现有头寸', '常规再平衡', '收集Alpha']
                },
                tension: {
                    action: 'CAUTION',
                    positionSizing: Math.min(baseKelly * 0.7, baseKelly * kellyCap),
                    hedgeRatio: 0.15 + (valuationAdjusted ? 0.1 : 0),
                    leverage: 0.7,
                    antiFragilityGamma: 0,
                    distribution: distribution,
                    budgetMultiplier: Math.min(0.7, budgetCap * 0.7),
                    valuationSignal,
                    message: '⚠️ 接近0.68边界(0.6745σ)·波动率上升·仓位警戒',
                    orders: ['减仓至70%凯利', '买入虚值看跌保护', '提高止损位', '内容渠道权重+15%']
                },
                extreme: {
                    action: 'DE_RISK',
                    positionSizing: Math.min(baseKelly * 0.5, baseKelly * kellyCap * 0.5),
                    hedgeRatio: 0.4,
                    leverage: 0.4,
                    antiFragilityGamma: 0,
                    distribution: distribution,
                    budgetMultiplier: Math.min(0.5, budgetCap * 0.5),
                    valuationSignal,
                    message: '🔶 击穿1σ区间·极端波动·启动半仓风控',
                    orders: ['减仓50%', 'Delta对冲至中性', '暂停买量', 'ALL IN自然内容']
                },
                black_swan: {
                    action: 'LIQUIDATE_HEDGE',
                    positionSizing: 0,
                    hedgeRatio: 1.0,
                    leverage: 0,
                    antiFragilityGamma: antiFragilityGamma,
                    distribution: distribution,
                    budgetMultiplier: 0.08,
                    valuationSignal,
                    message: '🔴 黑天鹅确认(2σ+)·最高级别风险向量清算',
                    orders: ['风险资产全清', '全仓对冲', '启动流动性预案', '波动率套利', '尾部对冲建仓']
                },
                meltdown: {
                    action: 'SYSTEMIC_PROTECTION',
                    positionSizing: -antiFragilityGamma,
                    hedgeRatio: 1.5,
                    leverage: -0.5,
                    antiFragilityGamma: antiFragilityGamma,
                    distribution: distribution,
                    budgetMultiplier: 0.0,
                    valuationSignal,
                    message: '💥 系统性坍缩(3σ+)·熔断·逆向抄底准备',
                    orders: ['熔断保护启动', '现金为王', '150%尾部风险对冲', '等待均值回归信号', '20%极限逆向建仓']
                }
            };
            return commands[state.id];
        }

        setValuationAnchor(anchorData) {
            if (!anchorData) return;
            this.valuationAnchor.enabled = true;
            if (typeof anchorData.blendedValue === 'number') {
                this.valuationAnchor.blendedValue = Math.max(0.3, Math.min(0.85, anchorData.blendedValue));
            }
            if (typeof anchorData.wacc === 'number') this.valuationAnchor.wacc = anchorData.wacc;
            if (typeof anchorData.hurdleRate === 'number') this.valuationAnchor.hurdleRate = anchorData.hurdleRate;
            if (typeof anchorData.npv === 'number') this.valuationAnchor.npv = anchorData.npv;
            if (typeof anchorData.irr === 'number') this.valuationAnchor.irr = anchorData.irr;
            if (typeof anchorData.strategicNPV === 'number') this.valuationAnchor.strategicNPV = anchorData.strategicNPV;
            if (typeof anchorData.waitOptVal === 'number') this.valuationAnchor.waitOptVal = anchorData.waitOptVal;
            if (typeof anchorData.expandOptVal === 'number') this.valuationAnchor.expandOptVal = anchorData.expandOptVal;
            if (typeof anchorData.abandonOptVal === 'number') this.valuationAnchor.abandonOptVal = anchorData.abandonOptVal;
            this.valuationAnchor.lastUpdate = Date.now();
        }

        calculateOptimalDistribution(state, absZ) {
            const stateLevel = state.level;
            const tensionFactor = Math.min(1, Math.max(absZ / 3, stateLevel / 4));
            const paidWeight = Math.max(0, 0.40 - tensionFactor * 0.40);
            const contentWeight = stateLevel >= 3 ? 0.75 : (0.35 + tensionFactor * 0.40);
            const privateWeight = stateLevel >= 3 ? 0.25 : 0.25;
            const total = paidWeight + contentWeight + privateWeight;

            return {
                paid_ads: {
                    weight: paidWeight / total,
                    budget: '$' + Math.round(paidWeight / total * 100) + '%',
                    effectiveConcentration: (0.68 / (1 - CHANNEL_FRICTION.paid_ads.phi)),
                    friction: CHANNEL_FRICTION.paid_ads.phi,
                    alpha: CHANNEL_FRICTION.paid_ads.alpha
                },
                content: {
                    weight: contentWeight / total,
                    budget: '$' + Math.round(contentWeight / total * 100) + '%',
                    effectiveConcentration: (0.68 / (1 - CHANNEL_FRICTION.content.phi)),
                    friction: CHANNEL_FRICTION.content.phi,
                    alpha: CHANNEL_FRICTION.content.alpha
                },
                private_domain: {
                    weight: privateWeight / total,
                    budget: '$' + Math.round(privateWeight / total * 100) + '%',
                    effectiveConcentration: (0.68 / (1 - CHANNEL_FRICTION.private_domain.phi)),
                    friction: CHANNEL_FRICTION.private_domain.phi,
                    alpha: CHANNEL_FRICTION.private_domain.alpha
                }
            };
        }

        tick(externalShock = 0) {
            this.timestamp = Date.now();
            this.dealer.cardsDealt++;

            this.coneCollapse = 1 - (this.participants.filter(p => p.alive).length / this.participants.length);
            const truthRevelation = Math.min(1, this.coneCollapse * 1.5 + this.dealer.cardsDealt * 0.002);
            const truthDrift = (Math.random() - 0.5) * 0.03 * (1 - truthRevelation);
            this.dealer.groundTruth += truthDrift;
            if (this.valuationAnchor.enabled) {
                const va = this.valuationAnchor;
                const gap = va.blendedValue - this.dealer.groundTruth;
                const anchorPull = gap * va.gravityStrength * truthRevelation;
                this.dealer.groundTruth += anchorPull;
                va.valuationGap = gap;
                va.mispricingSignal = Math.abs(gap) < 0.05 ? 'fair' : (gap > 0 ? 'undervalued' : 'overvalued');
            }
            this.dealer.groundTruth = Math.max(0.3, Math.min(0.85, this.dealer.groundTruth));
            this.dealer.revelation = truthRevelation;

            this.dealer.entropy = -this.participants
                .filter(p => p.alive)
                .reduce((sum, p) => {
                    const prob = (p.position + 1) / 2;
                    return sum + (prob > 0 ? prob * Math.log(prob) : 0);
                }, 0);

            const currentVol = this.calculateVolatility() + Math.abs(externalShock) * 0.5;
            this.volatilityHistory.push({ t: this.timestamp, v: currentVol });
            if (this.volatilityHistory.length > this.config.volatilityWindow) {
                this.volatilityHistory.shift();
            }

            this.calculateCenterPressure();
            this.participants.forEach(p => {
                p.updatePressure(this.dealer.groundTruth, currentVol * (1 - truthRevelation * 0.5));
                if (externalShock !== 0 && Math.abs(externalShock) > 0.5) {
                    p.position += externalShock * 0.2 * (Math.random() + 0.5);
                    p.position = Math.max(-1, Math.min(1, p.position));
                }
            });

            this.coneCollapse = Math.min(1, Math.max(0, this.coneCollapse + this.config.collapseRate * Math.abs(this.centerPressure) * 0.1));

            let price = this.calculateImpliedPrice();
            if (externalShock !== 0) {
                const shockImpact = externalShock * GROUND_TRUTH_SIGMA * 0.7;
                price += shockImpact;
                price = Math.max(0.01, Math.min(0.99, price));
            }
            this.priceHistory.push(price);
            if (this.priceHistory.length > 120) this.priceHistory.shift();

            const zScore = this.calculateZScore(price);
            const shockZ = externalShock * 0.8;
            const effectiveZ = zScore + shockZ;
            const newState = this.determineGameState(effectiveZ);
            const stateChanged = newState.id !== this.state.id;
            this.state = newState;

            const decision = this.generateDecisionCommand(newState, effectiveZ, currentVol);
            this._lastDistribution = decision.distribution;

            this._updateBrandVolume(newState, effectiveZ, decision);
            const hedgeInjection = this._updateHedgeReservoir(newState, decision, stateChanged);

            const snapshot = {
                timestamp: this.timestamp,
                tick: this.dealer.cardsDealt,
                price,
                zScore: effectiveZ,
                realizedZ: zScore,
                volatility: currentVol,
                centerPressure: this.centerPressure,
                coneCollapse: this.coneCollapse,
                groundTruth: this.dealer.groundTruth,
                truthRevelation: this.dealer.revelation,
                entropy: this.dealer.entropy,
                state: this.state,
                decision,
                kellyFraction: this.config.kellyFraction,
                brandVolume: { ...this.brandVolume },
                hedgeReservoir: { ...this.hedgeReservoir, lastInjection: hedgeInjection },
                pokerBridge: { ...this.pokerBridge },
                valuationAnchor: { ...this.valuationAnchor },
                participants: this.participants.filter(p => p.alive).map(p => ({
                    type: p.type,
                    position: p.position,
                    conviction: p.conviction,
                    pressure: p.pressureVector
                })),
                aliveCount: this.participants.filter(p => p.alive).length,
                totalCount: this.participants.length
            };

            if (stateChanged) {
                this._emit('stateChange', snapshot);
            }
            this._emit('tick', snapshot);

            return snapshot;
        }

        injectShock(magnitude) {
            return this.tick(magnitude);
        }

        reset() {
            this.participants = [];
            this.priceHistory = [];
            this.volatilityHistory = [];
            this.state = GAME_STATES.CALM;
            this.coneCollapse = 0;
            this.centerPressure = 0;
            this.dealer = {
                position: 1.0,
                groundTruth: this.config.gravityCenter,
                entropy: 0,
                cardsDealt: 0,
                revelation: 0
            };
            this.brandVolume = {
                V: 1.0, r: 0.10, h: 1.0, growthRate: 0,
                frozen: false, freezeReason: '', totalDeposited: 0,
                lastGrowthTick: 0, decayPerTick: 0.0005
            };
            this.hedgeReservoir = {
                totalPool: 0, privateDomain: 0, premiumContent: 0,
                privateRatio: 0.75, contentRatio: 0.25,
                lastInjection: 0, injectionSource: ''
            };
            this._initDefaultParticipants();
            this._emit('reset');
        }

        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        }

        _emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(cb => cb(data));
            }
        }

        _updateBrandVolume(state, z, decision) {
            const bv = this.brandVolume;
            const alive = this.participants.filter(p => p.alive).length;
            const penetration = alive / this.participants.length;
            const tensionFactor = Math.min(1, Math.abs(z) / 3);
            const canGrow = state.id === 'calm' && decision.budgetMultiplier >= 0.95;

            bv.r = 0.10 + penetration * 0.20 * (1 - tensionFactor * 0.5);
            bv.r = Math.max(0.05, Math.min(0.45, bv.r));

            if (canGrow) {
                const growthIncrement = 0.003 * (1 - this.coneCollapse * 0.5);
                bv.h += growthIncrement;
                bv.growthRate = growthIncrement / Math.max(0.01, bv.h);
                bv.frozen = false;
                bv.freezeReason = '';
                bv.lastGrowthTick = this.dealer.cardsDealt;
                bv.totalDeposited += growthIncrement;
            } else {
                bv.h = Math.max(0.01, bv.h - bv.decayPerTick);
                bv.growthRate = -bv.decayPerTick / Math.max(0.01, bv.h);
                bv.frozen = true;
                if (state.id === 'black_swan') bv.freezeReason = 'BLACK_SWAN: 买量熔断，品牌投资冻结';
                else if (state.id === 'meltdown') bv.freezeReason = 'MELTDOWN: 系统性风险，全线冻结';
                else if (state.id === 'extreme') bv.freezeReason = 'EXTREME: 极端波动，品牌投资缩减';
                else bv.freezeReason = 'TENSION: 张力累积，增长放缓';
            }

            bv.V = Math.PI * bv.r * bv.r * bv.h;
        }

        _updateHedgeReservoir(state, decision, stateChanged) {
            const hr = this.hedgeReservoir;
            let injected = 0;
            let injectionSource = '';

            if (stateChanged && (state.id === 'black_swan' || state.id === 'meltdown')) {
                const steadyPaidWeight = 0.40;
                const currentPaidWeight = decision.distribution.paid_ads.weight;
                const weightGap = Math.max(0, steadyPaidWeight - currentPaidWeight);
                const releasedBudget = weightGap * 1.0;
                if (releasedBudget > 0.001) {
                    const toPrivate = releasedBudget * hr.privateRatio;
                    const toContent = releasedBudget * hr.contentRatio;
                    hr.privateDomain += toPrivate;
                    hr.premiumContent += toContent;
                    hr.totalPool = hr.privateDomain + hr.premiumContent;
                    injected = releasedBudget;
                    injectionSource = state.id + '_FUSE_TRIGGERED';
                    hr.lastInjection = this.dealer.cardsDealt;
                    hr.injectionSource = injectionSource;
                }
            } else if (state.id === 'calm' && hr.totalPool > 0.001) {
                const drainRate = 0.005;
                const drainPrivate = hr.privateDomain * drainRate;
                const drainContent = hr.premiumContent * drainRate;
                hr.privateDomain = Math.max(0, hr.privateDomain - drainPrivate);
                hr.premiumContent = Math.max(0, hr.premiumContent - drainContent);
                hr.totalPool = hr.privateDomain + hr.premiumContent;
                if (hr.totalPool < 0.001) {
                    hr.totalPool = 0;
                    hr.privateDomain = 0;
                    hr.premiumContent = 0;
                }
            }

            return injected > 0 ? { amount: injected, source: injectionSource } : null;
        }

        pokerSettleHand(handResult) {
            if (!handResult || typeof handResult.pnl !== 'number') return null;
            const pb = this.pokerBridge;
            pb.connected = true;
            pb.handsPlayed += 1;
            pb.totalPnL += handResult.pnl;
            pb.lastHandResult = {
                pnl: handResult.pnl,
                won: handResult.pnl > 0,
                potSize: handResult.potSize || Math.abs(handResult.pnl) * 2,
                timestamp: Date.now()
            };
            const wins = (pb.runningWinRate * (pb.handsPlayed - 1) + (handResult.pnl > 0 ? 1 : 0)) / pb.handsPlayed;
            pb.runningWinRate = wins;

            const bb = pb.bigBlind;
            const pnlInBB = handResult.pnl / bb;
            const gtShift = Math.max(-0.08, Math.min(0.08, pnlInBB * 0.003));
            pb.gtBias = gtShift;
            this.dealer.groundTruth = Math.max(0.10, Math.min(0.95, this.dealer.groundTruth + gtShift));

            const kellyDelta = Math.max(-0.15, Math.min(0.15, (wins - 0.5) * 0.3));
            pb.kellyBias = kellyDelta;
            const newKelly = Math.max(0, Math.min(1, this.config.kellyFraction + kellyDelta));
            this.config.kellyFraction = newKelly;

            let injectedShock = 0;
            if (Math.abs(pnlInBB) > 50) {
                injectedShock = pnlInBB > 0 ? 1.5 : -2.0;
            } else if (Math.abs(pnlInBB) > 20) {
                injectedShock = pnlInBB > 0 ? 0.6 : -0.8;
            }
            if (injectedShock !== 0) {
                this.tick(injectedShock);
            }

            return {
                handsPlayed: pb.handsPlayed,
                totalPnL: pb.totalPnL,
                runningWinRate: pb.runningWinRate,
                gtShift,
                newGroundTruth: this.dealer.groundTruth,
                kellyDelta,
                newKellyFraction: newKelly,
                injectedShock
            };
        }

        getGaussianBands() {
            const mu = this.config.gravityCenter;
            const sigma = 0.16;
            return {
                mu,
                sigma,
                band1Low: mu - sigma,
                band1High: mu + sigma,
                band2Low: mu - 2 * sigma,
                band2High: mu + 2 * sigma,
                band3Low: mu - 3 * sigma,
                band3High: mu + 3 * sigma,
                pdf68: this.calculateNormalPDF(mu)
            };
        }
    }

    const YMineConeGame = {
        ConeGameField,
        PARTICIPANT_TYPES,
        GAME_STATES,
        CONE_GRAVITY_CENTER,
        SIGMA_1,
        SIGMA_2,
        SIGMA_3,

        createField(config) {
            return new ConeGameField(config);
        },

        quickAnalysis(prices) {
            if (!prices || prices.length < 10) return null;
            const mean = prices.reduce((a,b) => a+b, 0) / prices.length;
            const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
            const std = Math.sqrt(variance);
            const within1Sigma = prices.filter(p => Math.abs(p - mean) <= std).length / prices.length;
            return {
                mean,
                std,
                within1SigmaRatio: within1Sigma,
                gravityCenterAdherence: Math.abs(within1Sigma - SIGMA_1),
                isNormal: within1Sigma > 0.6 && within1Sigma < 0.76,
                zScoreLatest: std > 0 ? (prices[prices.length-1] - mean) / std : 0
            };
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = YMineConeGame;
    } else {
        global.YMineConeGame = YMineConeGame;
    }

})(typeof window !== 'undefined' ? window : global);
