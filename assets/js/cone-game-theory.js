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
            const gravityPull = (this.config.gravityCenter * 2 - 1 - consensusPos) * 0.15;
            const price = 0.5 + consensusPos * 0.4 + gravityPull + (Math.random() - 0.5) * 0.02;
            return Math.max(0.01, Math.min(0.99, price));
        }

        determineGameState(zScore) {
            const absZ = Math.abs(zScore);
            if (absZ > 3) return GAME_STATES.MELTDOWN;
            if (absZ > 2) return GAME_STATES.BLACK_SWAN;
            if (absZ > 1) return GAME_STATES.EXTREME;
            if (absZ > 0.68) return GAME_STATES.TENSION;
            return GAME_STATES.CALM;
        }

        calculateZScore(currentPrice) {
            if (this.priceHistory.length < 20) return 0;
            const recent = this.priceHistory.slice(-30);
            const mean = recent.reduce((a,b) => a+b, 0) / recent.length;
            const variance = recent.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recent.length;
            const std = Math.sqrt(variance);
            if (std === 0) return 0;
            return (currentPrice - mean) / std;
        }

        generateDecisionCommand(state, zScore, volatility) {
            const kellyAdjusted = this.config.kellyFraction;
            const commands = {
                calm: {
                    action: 'HOLD',
                    positionSizing: kellyAdjusted,
                    hedgeRatio: 0,
                    leverage: 1.0,
                    message: '✅ 0.68引力区间稳态·执行凯利标准仓位·保持冷静',
                    orders: ['维持现有头寸', '常规再平衡', '收集Alpha']
                },
                tension: {
                    action: 'CAUTION',
                    positionSizing: kellyAdjusted * 0.7,
                    hedgeRatio: 0.15,
                    leverage: 0.7,
                    message: '⚠️ 接近0.68边界·波动率上升·仓位警戒',
                    orders: ['减仓至70%凯利', '买入虚值看跌保护', '提高止损位']
                },
                extreme: {
                    action: 'DE RISK',
                    positionSizing: kellyAdjusted * 0.5,
                    hedgeRatio: 0.4,
                    leverage: 0.4,
                    message: '🔶 击穿1σ区间·极端波动·启动半仓风控',
                    orders: ['减仓50%', 'Delta对冲至中性', '暂停新开仓']
                },
                black_swan: {
                    action: 'LIQUIDATE_HEDGE',
                    positionSizing: 0,
                    hedgeRatio: 1.0,
                    leverage: 0,
                    message: '🔴 黑天鹅确认·最高级别风险向量清算',
                    orders: ['风险资产全清', '全仓对冲', '启动流动性预案', '波动率套利']
                },
                meltdown: {
                    action: 'SYSTEMIC_PROTECTION',
                    positionSizing: -0.2,
                    hedgeRatio: 1.5,
                    leverage: -0.5,
                    message: '💥 系统性坍缩·熔断·逆向抄底准备',
                    orders: ['熔断保护启动', '现金为王', '尾部风险对冲', '等待均值回归信号']
                }
            };
            return commands[state.id];
        }

        tick(externalShock = 0) {
            this.timestamp = Date.now();
            this.dealer.cardsDealt++;

            if (Math.random() < 0.05) {
                this.dealer.groundTruth += (Math.random() - 0.5) * 0.03;
                this.dealer.groundTruth = Math.max(0.3, Math.min(0.85, this.dealer.groundTruth));
            }

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
                p.updatePressure(this.config.gravityCenter, currentVol);
                if (externalShock !== 0 && Math.abs(externalShock) > 0.5) {
                    p.position += externalShock * 0.2 * (Math.random() + 0.5);
                    p.position = Math.max(-1, Math.min(1, p.position));
                }
            });

            this.coneCollapse = 1 - (this.participants.filter(p => p.alive).length / this.participants.length);
            this.coneCollapse = Math.min(1, Math.max(0, this.coneCollapse + this.config.collapseRate * this.centerPressure * 0.1));

            const price = this.calculateImpliedPrice();
            this.priceHistory.push(price);
            if (this.priceHistory.length > 120) this.priceHistory.shift();

            const zScore = this.calculateZScore(price);
            const newState = this.determineGameState(zScore + externalShock);
            const stateChanged = newState.id !== this.state.id;
            this.state = newState;

            const decision = this.generateDecisionCommand(newState, zScore, currentVol);

            const snapshot = {
                timestamp: this.timestamp,
                price,
                zScore,
                volatility: currentVol,
                centerPressure: this.centerPressure,
                coneCollapse: this.coneCollapse,
                groundTruth: this.dealer.groundTruth,
                entropy: this.dealer.entropy,
                state: this.state,
                decision,
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
                cardsDealt: 0
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
