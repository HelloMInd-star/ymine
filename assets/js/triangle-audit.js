'use strict';

/**
 * 三角冗余交叉审计模块 v2.1
 * STEP9写入前强制执行：
 *   A: 金融精算模拟器 (YModels.calc)
 *   B: GameMind博弈沙盘 (YModels.gamemind)
 *   C: 几何心智算力底座 (YModels.compute)
 *
 * 规则：
 *   - 同源输入 → 三模型独立并行
 *   - 固定误差阈值 ±0.02
 *   - 三分支判定：全部正常放行 / 单组异常均值修正 / 两组以上异常阻断
 *   - 终审：触碰0.68自动风险标记
 *
 * @namespace YTriangleAudit
 */
(function (global) {
    'use strict';

    const common = global.YModels && global.YModels.common;
    const calcModel = global.YModels && global.YModels.calc;
    const gameModel = global.YModels && global.YModels.gamemind;
    const computeModel = global.YModels && global.YModels.compute;
    const bus = global.YBus;

    const THRESHOLDS = common ? common.THRESHOLDS : Object.freeze({
        BREAKEVEN: 0.48,
        STEADY: 0.50,
        FUSE: 0.68
    });
    const ERROR_THRESHOLD = 0.02;

    const AUDIT_STATUS = Object.freeze({
        IDLE: 'IDLE',
        RUNNING: 'RUNNING',
        PASSED: 'PASSED',
        WARNING: 'WARNING',
        BLOCKED: 'BLOCKED',
        ERROR: 'ERROR'
    });

    let _auditRunning = false;
    let _lastAuditResult = null;

    /**
     * @private
     * @description 映射通用输入到各模型独立入参格式
     */
    const _buildModelInputs = (sourceInput) => {
        const input = sourceInput || {};

        const calcInput = {
            beta: input.beta !== undefined ? input.beta : 1.0,
            costOfDebt: input.costOfDebt !== undefined ? input.costOfDebt : 0.095,
            debtRatio: input.debtRatio !== undefined ? input.debtRatio : 0.3,
            taxRate: input.taxRate !== undefined ? input.taxRate : 0.25,
            peRatio: input.peRatio !== undefined ? input.peRatio : 15,
            fairPe: input.fairPe !== undefined ? input.fairPe : 15,
            growthRate: input.growthRate !== undefined ? input.growthRate : 0.05,
            margin: input.margin !== undefined ? input.margin : 0.15,
            winRate: input.winRate,
            winLossRatio: input.winLossRatio !== undefined ? input.winLossRatio : 1.2
        };

        const gameInput = {
            competitionIntensity: input.competitionIntensity !== undefined ? input.competitionIntensity : 0.5,
            marketGrowth: input.marketGrowth !== undefined ? input.marketGrowth : 0.5,
            cooperationBonus: input.cooperationBonus !== undefined ? input.cooperationBonus : 0.3,
            priceWarCost: input.priceWarCost !== undefined ? input.priceWarCost : 0.4
        };

        const computeInput = {
            volume: input.volume !== undefined ? input.volume : 1.0,
            surface: input.surface !== undefined ? input.surface : 1.0,
            length: input.length !== undefined ? input.length : 1.0,
            prefillRatio: input.prefillRatio !== undefined ? input.prefillRatio : 0.5
        };

        if (input.riskLevel !== undefined) {
            const risk = common ? common.safeNum(input.riskLevel, 0.5) : Number(input.riskLevel) || 0.5;
            calcInput.winRate = risk;
            gameInput.competitionIntensity = 1 - risk;
            computeInput.volume = risk * 1.5;
        }
        if (input.valuationScore !== undefined) {
            const vs = common ? common.clamp01(input.valuationScore) : Math.max(0, Math.min(1, Number(input.valuationScore) || 0.5));
            calcInput.growthRate = 0.02 + vs * 0.1;
            gameInput.marketGrowth = vs;
            computeInput.volume = 0.3 + vs * 1.2;
        }
        if (input.loadScore !== undefined) {
            const ls = common ? common.clamp01(input.loadScore) : Math.max(0, Math.min(1, Number(input.loadScore) || 0.5));
            computeInput.volume = 0.4 + ls;
        }

        return { calcInput, gameInput, computeInput };
    };

    /**
     * @private
     * @description 从各模型结果中提取可比对的归一化分数
     */
    const _extractScore = (result, modelKey) => {
        if (!result || result.error) return null;
        switch (modelKey) {
            case 'calc':
                return result.valuationScore;
            case 'game':
                return result.equilibriumScore;
            case 'compute':
                return result.loadScore;
            default:
                return null;
        }
    };

    /**
     * @private
     */
    const _appendAuditLog = (entry) => {
        try {
            if (bus && typeof bus.publish === 'function') {
                const raw = localStorage.getItem('audit_log_triangle');
                const log = raw ? JSON.parse(raw) : [];
                log.push(Object.assign({ ts: Date.now() }, entry));
                if (log.length > 200) log.splice(0, log.length - 200);
                localStorage.setItem('audit_log_triangle', JSON.stringify(log));
            }
        } catch (_) {}
    };

    /**
     * @private
     * @description 单模型安全执行，封装独立try-catch
     */
    const _runModelSafely = (factory, input, modelName) => {
        let instance = null;
        try {
            if (!factory || typeof factory.createInstance !== 'function') {
                return { error: true, message: modelName + ' model not available' };
            }
            instance = factory.createInstance(input);
            const result = instance.evaluate();
            return result;
        } catch (err) {
            return { error: true, message: err && err.message ? err.message : String(err) };
        } finally {
            try {
                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }
            } catch (_) {}
            instance = null;
        }
    };

    /**
     * @private
     * @description 更新UI审计状态指示器
     */
    const _updateUI = (status, message) => {
        try {
            const statusEl = document.getElementById('auditStatus');
            const textEl = document.getElementById('auditStatusText');
            if (!statusEl || !textEl) return;

            statusEl.classList.remove('warn', 'danger');
            let text = '三角审计待命';
            let dotColor = '#4ade80';

            switch (status) {
                case AUDIT_STATUS.RUNNING:
                    text = '三角审计计算中...';
                    break;
                case AUDIT_STATUS.PASSED:
                    text = '✓ 审计通过：三模型误差≤0.02';
                    break;
                case AUDIT_STATUS.WARNING:
                    statusEl.classList.add('warn');
                    text = '⚠ 单组异常：双模型均值修正放行';
                    dotColor = '#fbbf24';
                    break;
                case AUDIT_STATUS.BLOCKED:
                    statusEl.classList.add('danger');
                    text = '✗ 两组以上异常：阻断全局同步';
                    dotColor = '#f87171';
                    break;
                case AUDIT_STATUS.ERROR:
                    statusEl.classList.add('danger');
                    text = '✗ 审计错误：' + (message || '模型执行失败');
                    dotColor = '#f87171';
                    break;
                default:
                    text = '三角审计待命';
            }
            textEl.textContent = text;
        } catch (_) {}
    };

    /**
     * 执行三角冗余审计（异步）
     * @param {Object} sourceInput - 同源输入数据
     * @param {Object} [options]
     * @param {boolean} [options.silent=false]
     * @returns {Promise<Object>} 审计结果
     */
    function runAudit(sourceInput, options) {
        const opts = options || {};

        if (_auditRunning) {
            return Promise.resolve(_lastAuditResult || { status: AUDIT_STATUS.RUNNING, message: 'Audit already running' });
        }

        if (bus && typeof bus.isHalted === 'function' && bus.isHalted()) {
            _updateUI(AUDIT_STATUS.BLOCKED, 'Emergency halt active');
            return Promise.resolve({
                status: AUDIT_STATUS.BLOCKED,
                passed: false,
                blocked: true,
                reason: 'EMERGENCY_HALT',
                message: '紧急停机中，审计终止'
            });
        }

        _auditRunning = true;
        if (!opts.silent) _updateUI(AUDIT_STATUS.RUNNING);

        return new Promise(function (resolve) {
            setTimeout(function () {
                try {
                    const { calcInput, gameInput, computeInput } = _buildModelInputs(sourceInput);

                    const resultA = _runModelSafely(calcModel, calcInput, 'calc');
                    const resultB = _runModelSafely(gameModel, gameInput, 'game');
                    const resultC = _runModelSafely(computeModel, computeInput, 'compute');

                    const scoreA = _extractScore(resultA, 'calc');
                    const scoreB = _extractScore(resultB, 'game');
                    const scoreC = _extractScore(resultC, 'compute');

                    const errors = [];
                    if (resultA && resultA.error) errors.push({ model: 'A_calc', message: resultA.message });
                    if (resultB && resultB.error) errors.push({ model: 'B_game', message: resultB.message });
                    if (resultC && resultC.error) errors.push({ model: 'C_compute', message: resultC.message });

                    if (errors.length >= 2) {
                        const failed = errors.map(function (e) { return e.model; }).join(', ');
                        const auditResult = {
                            auditId: common ? common.generateId() : ('audit-' + Date.now()),
                            timestamp: Date.now(),
                            status: AUDIT_STATUS.BLOCKED,
                            passed: false,
                            blocked: true,
                            reason: 'MULTIPLE_MODEL_FAILURES',
                            message: '两个以上模型执行失败：' + failed,
                            errors: errors,
                            scores: { A: scoreA, B: scoreB, C: scoreC },
                            diffs: null,
                            finalScore: null,
                            fuseTriggered: false
                        };
                        _lastAuditResult = auditResult;
                        _appendAuditLog(auditResult);
                        _updateUI(AUDIT_STATUS.ERROR, auditResult.message);
                        _auditRunning = false;
                        resolve(auditResult);
                        return;
                    }

                    if (scoreA === null || scoreB === null || scoreC === null) {
                        const nullModels = [];
                        if (scoreA === null) nullModels.push('A_calc');
                        if (scoreB === null) nullModels.push('B_game');
                        if (scoreC === null) nullModels.push('C_compute');
                        const auditResult = {
                            auditId: common ? common.generateId() : ('audit-' + Date.now()),
                            timestamp: Date.now(),
                            status: AUDIT_STATUS.BLOCKED,
                            passed: false,
                            blocked: true,
                            reason: 'MISSING_SCORES',
                            message: '模型分数缺失：' + nullModels.join(', '),
                            errors: errors,
                            scores: { A: scoreA, B: scoreB, C: scoreC },
                            diffs: null,
                            finalScore: null,
                            fuseTriggered: false
                        };
                        _lastAuditResult = auditResult;
                        _appendAuditLog(auditResult);
                        _updateUI(AUDIT_STATUS.BLOCKED);
                        _auditRunning = false;
                        resolve(auditResult);
                        return;
                    }

                    const diffAB = common ? common.absDiff(scoreA, scoreB) : Math.abs(scoreA - scoreB);
                    const diffBC = common ? common.absDiff(scoreB, scoreC) : Math.abs(scoreB - scoreC);
                    const diffAC = common ? common.absDiff(scoreA, scoreC) : Math.abs(scoreA - scoreC);

                    const abNormal = diffAB <= ERROR_THRESHOLD;
                    const bcNormal = diffBC <= ERROR_THRESHOLD;
                    const acNormal = diffAC <= ERROR_THRESHOLD;

                    const anomalyCount = [abNormal, bcNormal, acNormal].filter(function (ok) { return !ok; }).length;

                    let finalScore;
                    let status;
                    let passed = false;
                    let blocked = false;
                    let message = '';
                    let reason = '';

                    if (anomalyCount === 0) {
                        finalScore = (scoreA + scoreB + scoreC) / 3;
                        status = AUDIT_STATUS.PASSED;
                        passed = true;
                        message = '三模型交叉校验全部正常，误差均≤0.02';
                        reason = 'ALL_WITHIN_THRESHOLD';
                    } else if (anomalyCount === 1) {
                        let avgAB = (scoreA + scoreB) / 2;
                        let avgBC = (scoreB + scoreC) / 2;
                        let avgAC = (scoreA + scoreC) / 2;
                        let mostConsistentPair;
                        if (abNormal) {
                            finalScore = avgAB;
                            mostConsistentPair = 'A-B';
                        } else if (bcNormal) {
                            finalScore = avgBC;
                            mostConsistentPair = 'B-C';
                        } else {
                            finalScore = avgAC;
                            mostConsistentPair = 'A-C';
                        }
                        status = AUDIT_STATUS.WARNING;
                        passed = true;
                        message = '单组误差超阈值，采用' + mostConsistentPair + '均值修正放行';
                        reason = 'SINGLE_ANOMALY_CORRECTED';
                    } else {
                        finalScore = null;
                        status = AUDIT_STATUS.BLOCKED;
                        passed = false;
                        blocked = true;
                        message = '两组以上模型偏差超±0.02，阻断全局同步，需回溯流水线';
                        reason = 'MULTIPLE_ANOMALIES_BLOCKED';
                    }

                    const fuseTriggered = finalScore !== null && finalScore >= THRESHOLDS.FUSE;
                    if (fuseTriggered && passed) {
                        reason += '_FUSE_TRIGGERED';
                    }

                    const auditResult = {
                        auditId: common ? common.generateId() : ('audit-' + Date.now()),
                        timestamp: Date.now(),
                        status: status,
                        passed: passed,
                        blocked: blocked,
                        reason: reason,
                        message: message,
                        errors: errors.length > 0 ? errors : null,
                        scores: { A: scoreA, B: scoreB, C: scoreC },
                        diffs: { AB: diffAB, BC: diffBC, AC: diffAC, threshold: ERROR_THRESHOLD },
                        anomalyCount: anomalyCount,
                        finalScore: finalScore,
                        fuseTriggered: fuseTriggered,
                        modelResults: {
                            calc: resultA,
                            game: resultB,
                            compute: resultC
                        }
                    };

                    _lastAuditResult = auditResult;
                    _appendAuditLog({
                        auditId: auditResult.auditId,
                        event: 'audit_completed',
                        status: status,
                        passed: passed,
                        scores: auditResult.scores,
                        diffs: auditResult.diffs,
                        finalScore: finalScore,
                        fuseTriggered: fuseTriggered,
                        anomalyCount: anomalyCount
                    });

                    _updateUI(
                        blocked ? AUDIT_STATUS.BLOCKED : (anomalyCount === 1 ? AUDIT_STATUS.WARNING : AUDIT_STATUS.PASSED),
                        message
                    );

                    if (fuseTriggered && passed && typeof document !== 'undefined') {
                        try {
                            const fuseEvent = new CustomEvent('fuse-global-alert', {
                                detail: { score: finalScore, auditId: auditResult.auditId }
                            });
                            document.dispatchEvent(fuseEvent);
                        } catch (_) {}
                    }

                    _auditRunning = false;
                    resolve(auditResult);
                } catch (err) {
                    const errorResult = {
                        auditId: common ? common.generateId() : ('audit-' + Date.now()),
                        timestamp: Date.now(),
                        status: AUDIT_STATUS.ERROR,
                        passed: false,
                        blocked: true,
                        reason: 'AUDIT_EXCEPTION',
                        message: err && err.message ? err.message : String(err),
                        errors: [{ model: 'audit', message: String(err) }],
                        scores: null,
                        diffs: null,
                        finalScore: null,
                        fuseTriggered: false
                    };
                    _lastAuditResult = errorResult;
                    _appendAuditLog(errorResult);
                    _updateUI(AUDIT_STATUS.ERROR, errorResult.message);
                    _auditRunning = false;
                    resolve(errorResult);
                }
            }, 50);
        });
    }

    /**
     * STEP9闭环出口：审计通过后才写入总线并分发
     * @param {Object} pipelineData - S0-S8流水线产出数据
     * @param {Object} [options]
     * @returns {Promise<Object>} { ok: boolean, audit: Object, writeOk: boolean }
     */
    async function step9CloseLoop(pipelineData, options) {
        const opts = options || {};

        if (bus && typeof bus.isHalted === 'function' && bus.isHalted()) {
            return { ok: false, blocked: true, reason: 'EMERGENCY_HALT', message: '紧急停机中，STEP9写入被阻断' };
        }

        const auditInput = Object.assign({}, pipelineData, {
            valuationScore: pipelineData && pipelineData.keyMetrics ? pipelineData.keyMetrics.coneC : undefined
        });

        const auditResult = await runAudit(auditInput, opts);

        if (auditResult.blocked || !auditResult.passed) {
            _appendAuditLog({
                event: 'step9_blocked',
                auditId: auditResult.auditId,
                reason: auditResult.reason
            });
            return { ok: false, audit: auditResult, writeOk: false, blocked: true, reason: auditResult.reason };
        }

        const finalData = Object.assign({}, pipelineData, {
            auditId: auditResult.auditId,
            auditPassed: true,
            triangleScores: auditResult.scores,
            triangleDiffs: auditResult.diffs,
            finalScore: auditResult.finalScore,
            fuseTriggered: auditResult.fuseTriggered,
            status: 'COMPLETED',
            completedAt: Date.now()
        });

        let writeOk = false;
        if (bus && typeof bus.publish === 'function') {
            writeOk = bus.publish('engineOutput', finalData, { trusted: true, force: true });
        }

        _appendAuditLog({
            event: 'step9_completed',
            auditId: auditResult.auditId,
            writeOk: writeOk,
            finalScore: auditResult.finalScore,
            fuseTriggered: auditResult.fuseTriggered
        });

        return {
            ok: writeOk,
            audit: auditResult,
            writeOk: writeOk,
            finalData: finalData
        };
    }

    /**
     * 获取最后一次审计结果
     * @returns {Object|null}
     */
    function getLastResult() {
        return _lastAuditResult;
    }

    /**
     * 查询审计是否正在运行
     * @returns {boolean}
     */
    function isRunning() {
        return _auditRunning;
    }

    function _bindUIButtons() {
        try {
            const startBtn = document.getElementById('btnStartPipeline');
            const stopBtn = document.getElementById('btnEmergencyStop');

            if (startBtn) {
                startBtn.addEventListener('click', function () {
                    if (bus && typeof bus.resumeFromHalt === 'function') {
                        bus.resumeFromHalt();
                    }
                    startBtn.textContent = '⏳ 启动中...';
                    startBtn.disabled = true;
                    setTimeout(function () {
                        const demoInput = { beta: 1.0, growthRate: 0.05, margin: 0.15, competitionIntensity: 0.4, marketGrowth: 0.6, volume: 0.8, surface: 1.0, length: 1.0, prefillRatio: 0.5 };
                        step9CloseLoop({
                            pipelineId: 'demo-' + Date.now(),
                            version: '2.1.0',
                            regime: 'RED_OCEAN',
                            status: 'RUNNING',
                            startedAt: Date.now(),
                            ticker: 'DEMO',
                            keyMetrics: { dynamicBeta: 1.0, rationalityScore: 65, kellyMultiplier: 0.5, coneC: 0.52, sharpeRatio: 1.2, haltProbability: 0.1, wacc: 0.095 }
                        }, { silent: false }).then(function (result) {
                            startBtn.disabled = false;
                            startBtn.textContent = result.ok ? '🚀 启动十步闭环' : '🚀 重试启动';
                        });
                    }, 300);
                });
            }

            if (stopBtn) {
                stopBtn.addEventListener('click', function () {
                    if (bus && typeof bus.emergencyHalt === 'function') {
                        bus.emergencyHalt();
                    }
                    stopBtn.textContent = '✓ 已停机';
                    stopBtn.style.background = 'rgba(239,68,68,0.35)';
                    setTimeout(function () {
                        stopBtn.textContent = '🛑 紧急停机';
                        stopBtn.style.background = '';
                    }, 2000);
                });
            }
        } catch (_) {}
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _bindUIButtons);
        } else {
            setTimeout(_bindUIButtons, 0);
        }
    }

    const YTriangleAudit = {
        AUDIT_STATUS: AUDIT_STATUS,
        THRESHOLDS: THRESHOLDS,
        ERROR_THRESHOLD: ERROR_THRESHOLD,
        runAudit: runAudit,
        step9CloseLoop: step9CloseLoop,
        getLastResult: getLastResult,
        isRunning: isRunning
    };

    global.YTriangleAudit = YTriangleAudit;

})(typeof window !== 'undefined' ? window : globalThis);
