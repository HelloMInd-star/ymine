'use strict';

/**
 * Y.Mine 数据总线 v2.1
 * 实现localStorage三分区隔离：
 *   - pipeline_*: 官方流水线演算结果（只读全局，禁止外部写入）
 *   - draft_*: 用户草稿区（可编辑，与官方数据完全隔离）
 *   - audit_log_*: 审计日志专属存储
 *
 * @namespace YBus
 * @version 2.1.0
 */
(function (global) {
    'use strict';

    const common = global.YModels && global.YModels.common;
    const THRESHOLDS = common ? common.THRESHOLDS : Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });

    /**
     * @private
     * @type {boolean}
     * @description 紧急停机状态标志
     */
    let _emergencyHalted = false;

    /**
     * @private
     * @type {number}
     * @description 防抖定时器ID
     */
    let _debounceTimer = null;

    /**
     * @private
     * @type {Object<string, *>}
     * @description 内存缓存，避免重复localStorage读取
     */
    const _memCache = {};

    /**
     * @private
     * @type {Object<string, number>}
     * @description 记录各key最后写入时间戳，用于防抖
     */
    const _lastWriteTs = {};

    /**
     * @private
     * @type {string[]}
     * @description 标准业务向量输出字段白名单，过滤临时缓存/调试变量
     */
    const PIPELINE_FIELD_WHITELIST = Object.freeze([
        'pipelineId', 'version', 'regime', 'status', 'startedAt', 'completedAt',
        'ticker', 'assetId', 'generationId', 'timestamp', 'processedAt',
        'valuationScore', 'equilibriumScore', 'loadScore',
        'positionRecommendation', 'strategyRecommendation', 'availableCapacity',
        'riskLevel', 'marketRegime', 'nashStability', 'computeEfficiency',
        'breakEvenCheck', 'fuseCheck', 'peakShaveRequired',
        'finalDecision', 'keyMetrics', 'riskFlags', 'auditTrail',
        'targetPrice', 'stopLoss', 'signal', 'dynamicBeta', 'rationalityScore',
        'kellyMultiplier', 'coneC', 'sharpeRatio', 'haltProbability', 'wacc',
        'channels', 'loopback'
    ]);

    /**
     * @private
     * @type {string[]}
     * @description 敏感核心参数字段，通用工具访问时自动脱敏
     */
    const SENSITIVE_FIELDS = Object.freeze([
        'valuationScore', 'equilibriumScore', 'loadScore',
        'positionRecommendation', 'kellyMultiplier',
        'fuseCheck', 'riskLevel', 'haltProbability'
    ]);

    /**
     * @private
     * @type {Object}
     * @description 三分区存储前缀定义
     */
    const PARTITIONS = Object.freeze({
        PIPELINE: {
            prefix: 'pipeline_',
            writable: false,
            description: '官方流水线只读结果'
        },
        DRAFT: {
            prefix: 'draft_',
            writable: true,
            description: '用户可编辑草稿区'
        },
        AUDIT: {
            prefix: 'audit_log_',
            writable: false,
            description: '审计日志（仅追加）'
        }
    });

    /**
     * 总线通道配置
     * @private
     * @type {Object<string, {partition: string, storageKey: string, eventName: string, defaultValue: *}>}
     */
    const CHANNELS = {
        funnel: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_funnelOutput',
            eventName: 'funnel-bus-update',
            defaultValue: null
        },
        circle: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_circleLabData',
            eventName: 'circle-bus-update',
            defaultValue: { motor: { hasData: false }, model: { hasData: false }, market: { hasData: false } }
        },
        aiPricing: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_aiPricingBenchmark',
            eventName: 'ai-pricing-bus-update',
            defaultValue: null
        },
        caseLibrary: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_caseLibrary',
            eventName: 'case-library-bus-update',
            defaultValue: null
        },
        pricing: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_pricingOutput',
            eventName: 'pricing-bus-update',
            defaultValue: null
        },
        capmAuto: {
            partition: 'DRAFT',
            storageKey: 'draft_capmAutoMode',
            eventName: 'capm-auto-update',
            defaultValue: 'false'
        },
        simulator: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_simulatorOutput',
            eventName: 'simulator-bus-update',
            defaultValue: null
        },
        founder: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_founderMatch',
            eventName: 'founder-bus-update',
            defaultValue: null
        },
        riskFuse: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_riskFuseState',
            eventName: 'risk-fuse-trigger',
            defaultValue: { status: 'idle', warnings: [] }
        },
        marketingFinance: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_marketingFinance',
            eventName: 'marketing-finance-update',
            defaultValue: {
                C1: 30, C2: 25, C3: 20,
                r1: 0.6, r2: 0.4, r3: 0.85,
                MC_total: 0, OC_total: 0, TAC: 0,
                N_expected: 0, TAC_per_unit: 0, realUnitCost: 0,
                ROMI: 0, DOL: 0, totalLeverage: 0, realROI: 0,
                status: 'idle', timestamp: 0
            }
        },
        coneGame: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_coneGameState',
            eventName: 'cone-game-update',
            defaultValue: {
                state: 'calm', zScore: 0, price: 0.68, volatility: 0,
                centerPressure: 0, coneCollapse: 0, groundTruth: 0.68,
                truthRevelation: 0, kellyFraction: 0.5, decision: null,
                aliveCount: 25, totalCount: 25, timestamp: 0
            }
        },
        kellyConfig: {
            partition: 'DRAFT',
            storageKey: 'draft_kellyConfig',
            eventName: 'kelly-config-update',
            defaultValue: {
                p: 0.5, b: 1.0, f_star: 0, actualRatio: 1.0,
                winZone: 'main', budgetMultiplier: 1.0, timestamp: 0
            }
        },
        distribution: {
            partition: 'DRAFT',
            storageKey: 'draft_channelDistribution',
            eventName: 'distribution-update',
            defaultValue: {
                paid_ads: { weight: 0.40, budget: '$40%', friction: 0.85, alpha: 0.3 },
                content: { weight: 0.35, budget: '$35%', friction: 0.15, alpha: 1.2 },
                private_domain: { weight: 0.25, budget: '$25%', friction: 0.05, alpha: 2.0 },
                state: 'calm', timestamp: 0
            }
        },
        systemHealth: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_systemHealth',
            eventName: 'system-health-update',
            defaultValue: {
                dataFlowScore: 46, modulesConnected: 0, totalModules: 8,
                auditStatus: 'pending', lastAudit: 0, criticalErrors: 0, warnings: 0
            }
        },
        brandVolume: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_brandVolume',
            eventName: 'brand-volume-update',
            defaultValue: {
                V: 0, r: 0.10, h: 0.01, growthRate: 0, frozen: false,
                freezeReason: '', totalDeposited: 0, lastGrowthTick: 0, timestamp: 0
            }
        },
        hedgeReservoir: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_hedgeReservoir',
            eventName: 'hedge-reservoir-update',
            defaultValue: {
                totalPool: 0, privateDomain: 0, premiumContent: 0,
                privateRatio: 0.75, contentRatio: 0.25,
                lastInjection: 0, injectionSource: '', timestamp: 0
            }
        },
        pokerEgg: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_pokerEggState',
            eventName: 'poker-egg-update',
            defaultValue: {
                connected: false, handsPlayed: 0, totalPnL: 0, winRate: 0.50,
                lastHandResult: null, gtAdjustment: 0, kellyAdjustment: 0,
                bigBlind: 10, rationalityScore: null, timestamp: 0
            }
        },
        valuation: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_valuationAnchor',
            eventName: 'valuation-anchor-update',
            defaultValue: {
                wacc: 0.095, enterpriseValue: 0, npv: 0, irr: 0, blendedAnchor: 0.68,
                strategicNPV: 0, hurdleRate: 0.08, waitOptionValue: 0,
                expandOptionValue: 0, abandonOptionValue: 0, relativeTargetPrice: 0,
                bondPrice: 1000, bondYTM: 0.055, valuationGap: 0,
                mispricingSignal: 'fair', timestamp: 0
            }
        },

        macroFunnel: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_macroFunnelOutput',
            eventName: 'macro-funnel-update',
            defaultValue: {
                generationId: '', timestamp: 0, regime: 'RED_OCEAN',
                assets: [], totalScreened: 0, totalPassed: 0, selectedAsset: null
            }
        },
        factorLibrary: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_factorLibrary',
            eventName: 'factor-library-update',
            defaultValue: {
                assetId: '', processedAt: 0, regime: 'RED_OCEAN',
                valueFactors: null, growthFactors: null, qualityFactors: null,
                momentumFactors: null, sentimentFactors: null, riskFactors: null,
                compositeScore: 0
            }
        },
        valuationV2: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_valuationV2Result',
            eventName: 'valuation-v2-update',
            defaultValue: {
                assetId: '', timestamp: 0, regime: 'RED_OCEAN', currentPrice: 0,
                wacc: null, dcf: null, relativeValuation: null,
                pricing: {
                    targetPriceRange: { bear: 0, base: 0, bull: 0 },
                    expectedReturn: 0, riskPremium: 0, dynamicBeta: 0,
                    valuationGap: 0, valuationSignal: 'NEUTRAL', marginOfSafety: 0
                },
                valuationRisk: null
            }
        },
        simulationResult: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_simulationResult',
            eventName: 'simulation-result-update',
            defaultValue: {
                simulationId: '', timestamp: 0, config: null, assetId: '',
                baselineKLine: [], monteCarlo: null, stressTests: [], threeFlow: null,
                simulationRisk: null, sandboxRecommendation: null
            }
        },
        rationalityScore: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_rationalityScore',
            eventName: 'rationality-score-update',
            defaultValue: {
                sessionId: '', timestamp: 0, handsPlayed: 0, overallScore: 50,
                rationalityState: 'BALANCED', subScores: null, biases: null,
                behavioralSignals: null,
                positionAdjustment: {
                    kellyMultiplier: 1.0, hedgingAdjustment: 0,
                    forceDefensiveMode: false, riskAssetCap: 1.0, riskFreeAllocation: 0
                },
                tiltSignals: { tiltLevel: 0, coneC: 0, zScore: 0 }
            }
        },
        executionOrder: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_executionOrder',
            eventName: 'execution-order-update',
            defaultValue: {
                orderId: '', timestamp: 0, assetId: '', regime: 'RED_OCEAN',
                fuseCheck: null, signal: null, kelly: null, priceLevels: null,
                allocation: null, hedgingPlan: null,
                riskStatus: { halted: false, activeFuses: [], warnings: [] },
                auditTrail: null
            }
        },
        regimeState: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_regimeState',
            eventName: 'regime-state-update',
            defaultValue: {
                regime: 'RED_OCEAN', switchReason: 'initial', switchedAt: 0,
                redOceanParams: {
                    preferredPE: [5, 15], preferredPB: [0.5, 2],
                    fcfFocus: 0.8, growthPenalty: 0.3, valuationDiscount: 0.7
                },
                blueOceanParams: {
                    preferredGrowth: [0.3, 1.0], preferredMomentum: [0.3, 1.0],
                    growthPremium: 1.3, valueRelaxation: 0.5, betaAmplifier: 1.2
                }
            }
        },
        quantPipeline: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_quantPipelineState',
            eventName: 'quant-pipeline-update',
            defaultValue: {
                pipelineId: '', currentStep: -1, completedSteps: [],
                startedAt: 0, lastUpdatedAt: 0, halted: false, haltReason: ''
            }
        },
        engineOutput: {
            partition: 'PIPELINE',
            storageKey: 'pipeline_engineOutput',
            eventName: 'engine-output-update',
            defaultValue: {
                pipelineId: '', version: '2.1.0', regime: 'RED_OCEAN',
                status: 'IDLE', startedAt: 0, completedAt: 0, durationMs: 0,
                ticker: '',
                finalDecision: {
                    signal: 'HOLD', position: 0, rawKelly: 0,
                    circuitBreakerTriggered: false, enforcedBy: 'NONE',
                    stopLoss: 0, targetPrice: 0
                },
                keyMetrics: {
                    dynamicBeta: 1.0, rationalityScore: 50, kellyMultiplier: 1.0,
                    coneC: 0.4, sharpeRatio: 0, haltProbability: 0, wacc: 0
                },
                riskFlags: [], auditTrail: [], channels: {},
                loopback: {
                    canRerun: true, feedbackReady: false,
                    recommendedAction: 'WAIT_AND_OBSERVE'
                }
            }
        },

        triangleAudit: {
            partition: 'AUDIT',
            storageKey: 'audit_log_triangle',
            eventName: 'triangle-audit-update',
            defaultValue: []
        }
    };

    /**
     * @private
     * @description 检查localStorage是否可用
     * @returns {boolean}
     */
    const _lsAvailable = () => {
        try {
            const testKey = '__ybus_test__';
            global.localStorage.setItem(testKey, '1');
            global.localStorage.removeItem(testKey);
            return true;
        } catch (_) {
            return false;
        }
    };

    const LS_OK = _lsAvailable();

    /**
     * @private
     * @description 安全localStorage读取
     * @param {string} key
     * @returns {string|null}
     */
    const _lsGet = (key) => {
        if (!LS_OK) return _memCache[key] !== undefined ? JSON.stringify(_memCache[key]) : null;
        try {
            return global.localStorage.getItem(key);
        } catch (_) {
            return _memCache[key] !== undefined ? JSON.stringify(_memCache[key]) : null;
        }
    };

    /**
     * @private
     * @description 安全localStorage写入
     * @param {string} key
     * @param {string} value
     * @returns {boolean}
     */
    const _lsSet = (key, value) => {
        try {
            if (LS_OK) global.localStorage.setItem(key, value);
            _memCache[key] = value;
            return true;
        } catch (_) {
            _memCache[key] = value;
            return false;
        }
    };

    /**
     * @private
     * @description 按白名单过滤对象字段
     * @param {Object} data
     * @returns {Object}
     */
    const _filterFields = (data) => {
        if (!data || typeof data !== 'object') return data;
        const filtered = {};
        for (const key of PIPELINE_FIELD_WHITELIST) {
            if (data[key] !== undefined) {
                filtered[key] = data[key];
            }
        }
        if (data.channels && typeof data.channels === 'object') {
            filtered.channels = {};
            for (const ck of Object.keys(data.channels)) {
                filtered.channels[ck] = _filterFields(data.channels[ck]);
            }
        }
        if (data.auditTrail && Array.isArray(data.auditTrail)) {
            filtered.auditTrail = data.auditTrail.slice();
        }
        if (data.riskFlags && Array.isArray(data.riskFlags)) {
            filtered.riskFlags = data.riskFlags.slice();
        }
        return filtered;
    };

    /**
     * @private
     * @description 敏感字段脱敏
     * @param {Object} data
     * @param {boolean} isTrusted - 是否为可信模块（审计/流水线内部）
     * @returns {Object}
     */
    const _maskSensitive = (data, isTrusted) => {
        if (isTrusted || !data || typeof data !== 'object') return data;
        const masked = Object.assign({}, data);
        for (const field of SENSITIVE_FIELDS) {
            if (masked[field] !== undefined) {
                if (typeof masked[field] === 'number') {
                    masked[field] = Math.round(masked[field] * 100) / 100;
                } else if (typeof masked[field] === 'boolean') {
                    // 保留布尔值
                } else {
                    masked[field] = '***';
                }
            }
        }
        if (masked.keyMetrics && typeof masked.keyMetrics === 'object') {
            masked.keyMetrics = Object.assign({}, masked.keyMetrics);
            for (const kf of ['kellyMultiplier', 'haltProbability', 'dynamicBeta']) {
                if (masked.keyMetrics[kf] !== undefined && typeof masked.keyMetrics[kf] === 'number') {
                    masked.keyMetrics[kf] = Math.round(masked.keyMetrics[kf] * 100) / 100;
                }
            }
        }
        return masked;
    };

    /**
     * @private
     * @description 检测是否触碰0.68熔断阈值
     * @param {Object} data
     * @returns {boolean}
     */
    const _checkFuseTrigger = (data) => {
        if (!data || typeof data !== 'object') return false;
        const checkPoints = [
            data.valuationScore, data.equilibriumScore, data.loadScore,
            data.keyMetrics && data.keyMetrics.haltProbability,
            data.keyMetrics && data.keyMetrics.coneC
        ];
        for (const v of checkPoints) {
            if (typeof v === 'number' && v >= THRESHOLDS.FUSE) {
                return true;
            }
        }
        if (data.fuseCheck === false) return true;
        if (data.finalDecision && data.finalDecision.circuitBreakerTriggered) return true;
        if (data.riskStatus && data.riskStatus.halted) return true;
        return false;
    };

    /**
     * @private
     * @description 追加审计日志
     * @param {string} logKey
     * @param {Object} entry
     */
    const _appendAuditLog = (logKey, entry) => {
        try {
            const fullKey = 'audit_log_' + logKey;
            const raw = _lsGet(fullKey);
            const log = raw ? JSON.parse(raw) : [];
            log.push(Object.assign({ ts: Date.now() }, entry));
            if (log.length > 500) log.splice(0, log.length - 500);
            _lsSet(fullKey, JSON.stringify(log));
        } catch (_) {}
    };

    /**
     * @private
     * @description 创建案例库版本快照
     * @param {Object} data
     */
    const _snapshotToCaseLibrary = (data) => {
        try {
            const snapKey = 'pipeline_caseLibrary';
            const raw = _lsGet(snapKey);
            const lib = raw ? JSON.parse(raw) : { snapshots: [] };
            if (!lib.snapshots) lib.snapshots = [];
            const snapshot = {
                snapId: common ? common.generateId() : ('snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
                snappedAt: Date.now(),
                version: '2.1.0',
                data: _filterFields(data)
            };
            lib.snapshots.push(snapshot);
            if (lib.snapshots.length > 100) lib.snapshots.splice(0, lib.snapshots.length - 100);
            _lsSet(snapKey, JSON.stringify(lib));
        } catch (_) {}
    };

    /**
     * 初始化总线状态
     * @returns {void}
     */
    function initState() {
        let initialized = false;

        Object.keys(CHANNELS).forEach(function (channelName) {
            const channel = CHANNELS[channelName];
            try {
                const existing = _lsGet(channel.storageKey);
                if (existing === null || existing === undefined) {
                    const defaultValue = typeof channel.defaultValue === 'string'
                        ? channel.defaultValue
                        : JSON.stringify(channel.defaultValue);
                    _lsSet(channel.storageKey, defaultValue);
                    initialized = true;
                }
            } catch (e) {
                console.warn('[YBus] Failed to initialize channel:', channelName, e);
            }
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                _triggerBusReady(initialized);
            });
        } else {
            setTimeout(function () {
                _triggerBusReady(initialized);
            }, 0);
        }
    }

    /**
     * @private
     */
    function _triggerBusReady(initialized) {
        const event = new CustomEvent('bus-ready', {
            detail: { initialized: initialized }
        });
        window.dispatchEvent(event);
    }

    /**
     * 发布数据到指定通道（带防抖、白名单过滤、熔断检测）
     * @param {string} channelName
     * @param {*} data
     * @param {Object} [options]
     * @param {boolean} [options.trusted=false] - 是否为可信内部写入（可写pipeline分区）
     * @param {boolean} [options.manualParamChange=false] - 是否为人工改参
     * @returns {boolean}
     */
    function publish(channelName, data, options) {
        const opts = options || {};
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return false;
        }

        if (_emergencyHalted && channelName === 'engineOutput') {
            console.warn('[YBus] Emergency halt active — blocking STEP9 write');
            _appendAuditLog('system', { event: 'halt_blocked', channel: channelName });
            return false;
        }

        const partition = PARTITIONS[channel.partition];

        if (!partition.writable && !opts.trusted) {
            console.warn('[YBus] Write denied to read-only partition:', channel.partition, channelName);
            _appendAuditLog('security', {
                event: 'write_denied',
                channel: channelName,
                partition: channel.partition,
                reason: 'external_write_to_readonly_partition'
            });
            return false;
        }

        const now = Date.now();
        const lastTs = _lastWriteTs[channelName] || 0;
        if (now - lastTs < 100 && !opts.force) {
            return true;
        }

        try {
            let processedData = data;
            if (channel.partition === 'PIPELINE' && data && typeof data === 'object') {
                processedData = _filterFields(data);
            }

            const fuseTriggered = _checkFuseTrigger(processedData);
            if (fuseTriggered) {
                if (!processedData.riskFlags) processedData.riskFlags = [];
                if (!processedData.riskFlags.includes('FUSE_0.68_TRIGGERED')) {
                    processedData.riskFlags.push('FUSE_0.68_TRIGGERED');
                }
                _appendAuditLog('fuse', {
                    event: 'fuse_triggered',
                    channel: channelName,
                    timestamp: now
                });
            }

            if (opts.manualParamChange) {
                _appendAuditLog('manual', {
                    event: 'manual_param_change',
                    channel: channelName,
                    confirmed: true,
                    timestamp: now
                });
            }

            if (channelName === 'engineOutput' && processedData.status === 'COMPLETED') {
                _snapshotToCaseLibrary(processedData);
            }

            const value = typeof processedData === 'string' ? processedData : JSON.stringify(processedData);
            _lsSet(channel.storageKey, value);
            _lastWriteTs[channelName] = now;

            const event = new CustomEvent(channel.eventName, {
                detail: { channel: channelName, data: processedData, fuseTriggered: fuseTriggered }
            });
            window.dispatchEvent(event);

            if (fuseTriggered) {
                const fuseEvent = new CustomEvent('fuse-alert', {
                    detail: { channel: channelName, data: processedData }
                });
                window.dispatchEvent(fuseEvent);
            }

            return true;
        } catch (e) {
            console.error('[YBus] Publish failed:', channelName, e);
            _appendAuditLog('error', { event: 'publish_failed', channel: channelName, error: String(e) });
            return false;
        }
    }

    /**
     * 订阅指定通道的更新事件
     * @param {string} channelName
     * @param {function(*): void} callback
     * @param {Object} [options]
     * @param {boolean} [options.trusted=false]
     * @returns {function} unsubscribe
     */
    function subscribe(channelName, callback, options) {
        const opts = options || {};
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return function () {};
        }

        const handler = function (e) {
            if (e.detail && e.detail.channel === channelName) {
                const data = opts.trusted ? e.detail.data : _maskSensitive(e.detail.data, false);
                callback(data);
            }
        };

        window.addEventListener(channel.eventName, handler);

        const storageHandler = function (e) {
            if (e.key === channel.storageKey) {
                try {
                    const data = e.newValue ? JSON.parse(e.newValue) : null;
                    callback(opts.trusted ? data : _maskSensitive(data, false));
                } catch (err) {
                    callback(e.newValue);
                }
            }
        };
        window.addEventListener('storage', storageHandler);

        return function unsubscribe() {
            window.removeEventListener(channel.eventName, handler);
            window.removeEventListener('storage', storageHandler);
        };
    }

    /**
     * 获取指定通道的当前状态
     * @param {string} channelName
     * @param {Object} [options]
     * @param {boolean} [options.trusted=false]
     * @returns {*}
     */
    function getState(channelName, options) {
        const opts = options || {};
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return null;
        }

        try {
            const raw = _lsGet(channel.storageKey);
            let data;
            if (raw === null || raw === undefined) {
                data = channel.defaultValue;
            } else if (typeof channel.defaultValue === 'string') {
                data = raw;
            } else {
                data = JSON.parse(raw);
            }
            return opts.trusted ? data : _maskSensitive(data, false);
        } catch (e) {
            console.warn('[YBus] Get state failed:', channelName, e);
            return channel.defaultValue;
        }
    }

    /**
     * 紧急停机：立即终止STEP9写入与全局分发
     * @returns {void}
     */
    function emergencyHalt() {
        _emergencyHalted = true;
        const haltData = {
            status: 'HALTED',
            halted: true,
            haltReason: 'EMERGENCY_STOP',
            haltedAt: Date.now()
        };
        _lsSet('pipeline_quantPipelineState', JSON.stringify(Object.assign(
            {}, CHANNELS.quantPipeline.defaultValue, haltData
        )));
        _appendAuditLog('system', { event: 'emergency_halt', timestamp: Date.now() });
        const event = new CustomEvent('emergency-halt', { detail: haltData });
        window.dispatchEvent(event);
    }

    /**
     * 解除紧急停机
     * @returns {void}
     */
    function resumeFromHalt() {
        _emergencyHalted = false;
        _appendAuditLog('system', { event: 'resume', timestamp: Date.now() });
        const event = new CustomEvent('resume-from-halt');
        window.dispatchEvent(event);
    }

    /**
     * 查询紧急停机状态
     * @returns {boolean}
     */
    function isHalted() {
        return _emergencyHalted;
    }

    /**
     * 等待bus-ready事件
     * @param {function(): void} callback
     * @returns {void}
     */
    function ready(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 0);
        } else {
            window.addEventListener('bus-ready', callback, { once: true });
            document.addEventListener('DOMContentLoaded', function () {
                setTimeout(callback, 0);
            }, { once: true });
        }
    }

    /**
     * 获取所有通道的当前状态快照
     * @param {Object} [options]
     * @returns {Object<string, *>}
     */
    function getSnapshot(options) {
        const snapshot = {};
        Object.keys(CHANNELS).forEach(function (name) {
            snapshot[name] = getState(name, options);
        });
        return snapshot;
    }

    /**
     * 草稿区写入（用户草稿，与pipeline完全隔离）
     * @param {string} key - 草稿key（不需要前缀，自动加draft_）
     * @param {*} data
     * @returns {boolean}
     */
    function writeDraft(key, data) {
        if (!key || typeof key !== 'string') return false;
        const fullKey = 'draft_' + key;
        try {
            const value = typeof data === 'string' ? data : JSON.stringify(data);
            _lsSet(fullKey, value);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * 草稿区读取
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {*}
     */
    function readDraft(key, defaultValue) {
        if (!key || typeof key !== 'string') return defaultValue !== undefined ? defaultValue : null;
        const fullKey = 'draft_' + key;
        try {
            const raw = _lsGet(fullKey);
            if (raw === null || raw === undefined) return defaultValue !== undefined ? defaultValue : null;
            try {
                return JSON.parse(raw);
            } catch (_) {
                return raw;
            }
        } catch (_) {
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    const YBus = {
        initState: initState,
        publish: publish,
        subscribe: subscribe,
        getState: getState,
        ready: ready,
        getSnapshot: getSnapshot,
        emergencyHalt: emergencyHalt,
        resumeFromHalt: resumeFromHalt,
        isHalted: isHalted,
        writeDraft: writeDraft,
        readDraft: readDraft,
        THRESHOLDS: THRESHOLDS,
        PARTITIONS: PARTITIONS,
        CHANNELS: Object.keys(CHANNELS)
    };

    global.YBus = YBus;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initState);
    } else {
        initState();
    }

})(typeof window !== 'undefined' ? window : globalThis);
