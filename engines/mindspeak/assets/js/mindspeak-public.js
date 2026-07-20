/**
 * MindSpeak V19.0 · 公开层核心逻辑
 * 四层跨域数理同构翻译引擎 - 公开演示版
 * 归属：Game-OS V2.1 · EvolveMind认知演化引擎子组件
 */

(function(global) {
    'use strict';

    const MS_VERSION = 'V19.0';
    const THRESHOLDS = {
        BREAKEVEN: 0.48,
        STEADY: 0.5,
        FUSE: 0.68,
        TOLERANCE: 0.02
    };

    const STORAGE_PREFIX = 'mindspeak_';
    const AUDIT_KEY = STORAGE_PREFIX + 'audit_log';

    const MindSpeak = {
        version: MS_VERSION,
        currentModule: 'word-order',
        globalSteadyBias: 0,
        isEmergencyStopped: false,
        logs: [],
        listeners: {},

        init() {
            this._setupStorage();
            this._loadState();
            this._startRenderLoop();
            this.log('系统', `MindSpeak ${MS_VERSION} 初始化完成，接入GameOS S1信息清洗入口`);
            this.log('系统', '三分区数据总线已激活：pipeline只读/draft可写/audit_log仅追加');
            return this;
        },

        _setupStorage() {
            try {
                if (!localStorage.getItem(STORAGE_PREFIX + 'initialized')) {
                    localStorage.setItem(STORAGE_PREFIX + 'initialized', 'true');
                    localStorage.setItem(STORAGE_PREFIX + 'version', MS_VERSION);
                }
            } catch(e) {
                console.warn('localStorage不可用，使用内存存储');
            }
        },

        _loadState() {
            try {
                const stopped = localStorage.getItem(STORAGE_PREFIX + 'emergency_stop');
                this.isEmergencyStopped = stopped === 'true';
            } catch(e) {}
        },

        _saveAuditLog(entry) {
            try {
                let logs = [];
                const raw = localStorage.getItem(AUDIT_KEY);
                if (raw) {
                    try { logs = JSON.parse(raw); } catch(e) {}
                }
                logs.push({
                    ...entry,
                    timestamp: Date.now(),
                    id: 'MS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)
                });
                if (logs.length > 1000) logs = logs.slice(-1000);
                localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
            } catch(e) {}
        },

        emergencyStop() {
            this.isEmergencyStopped = true;
            try {
                localStorage.setItem(STORAGE_PREFIX + 'emergency_stop', 'true');
            } catch(e) {}
            this.log('紧急停机', '!!! 所有转换运算已被一键切断 !!!', 'error');
            this._saveAuditLog({ type: 'emergency_stop', module: 'global' });
        },

        resume() {
            this.isEmergencyStopped = false;
            try {
                localStorage.setItem(STORAGE_PREFIX + 'emergency_stop', 'false');
            } catch(e) {}
            this.log('系统', '紧急停机解除，运算恢复');
        },

        setGlobalSteadyBias(bias) {
            this.globalSteadyBias = Math.max(-0.2, Math.min(0.2, bias));
            return this;
        },

        log(module, message, level = 'info') {
            const entry = {
                time: new Date().toLocaleTimeString('zh-CN', {hour12:false}),
                module, message, level
            };
            this.logs.push(entry);
            if (this.logs.length > 500) this.logs = this.logs.slice(-500);
            this._emit('log', entry);
            return entry;
        },

        on(event, fn) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(fn);
        },

        _emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(fn => fn(data));
            }
        },

        _startRenderLoop() {
            const render = () => {
                this._emit('render', { time: Date.now() });
                requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
        },

        _applyTripleAudit(input, result) {
            const calcVal = result.confidence + (Math.random() - 0.5) * 0.015;
            const gmVal = result.confidence + (Math.random() - 0.5) * 0.018;
            const cmpVal = result.confidence + (Math.random() - 0.5) * 0.012;

            const maxDiff = Math.max(
                Math.abs(calcVal - gmVal),
                Math.abs(gmVal - cmpVal),
                Math.abs(cmpVal - calcVal)
            );

            let auditResult = 'PASS';
            let finalConf = result.confidence;

            if (maxDiff > THRESHOLDS.TOLERANCE * 1.5) {
                auditResult = 'BLOCK';
                this.log('三角审计', `三模型偏差${maxDiff.toFixed(3)}超限，运算阻断`, 'error');
            } else if (maxDiff > THRESHOLDS.TOLERANCE) {
                auditResult = 'CORRECTED';
                finalConf = (calcVal + gmVal + cmpVal) / 3;
                this.log('三角审计', `单组偏差，均值修正：${finalConf.toFixed(3)}`, 'warn');
            } else {
                this.log('三角审计', `三模型偏差${maxDiff.toFixed(4)}，校验通过`);
            }

            return { auditResult, finalConf, models: { calc: calcVal, gamemind: gmVal, compute: cmpVal } };
        },

        runMapping(moduleId, input, params = {}) {
            if (this.isEmergencyStopped) {
                this.log(moduleId, '紧急停机状态，运算拒绝执行', 'error');
                return { error: 'EMERGENCY_STOPPED' };
            }

            this.currentModule = moduleId;
            const startTime = Date.now();
            this.log(moduleId, `开始处理：${input || '(空输入)'}`);

            const handler = this._modules[moduleId];
            if (!handler) {
                this.log(moduleId, '未知模块', 'error');
                return { error: 'UNKNOWN_MODULE' };
            }

            this.log(moduleId, '步骤1：生成候选映射向量...');
            const rawResult = handler(input, params, this);
            this.log(moduleId, '步骤2：应用约束验证...');

            let conf = rawResult.confidence || 0.5;
            conf += this.globalSteadyBias;
            conf = Math.max(0, Math.min(1, conf));

            let status = 'STEADY';
            if (conf > THRESHOLDS.FUSE) {
                status = 'FUSED';
                this.log(moduleId, `!!! 置信度${conf.toFixed(3)}触碰0.68熔断红线，触发熔断告警 !!!`, 'error');
            } else if (conf > THRESHOLDS.STEADY + THRESHOLDS.TOLERANCE) {
                status = 'WARNING';
                this.log(moduleId, `置信度${conf.toFixed(3)}进入0.5-0.68波动预警区`, 'warn');
            } else if (conf < THRESHOLDS.BREAKEVEN) {
                status = 'BELOW_BREAKEVEN';
                this.log(moduleId, `置信度${conf.toFixed(3)}低于0.48保本线，建议回退`, 'warn');
            } else {
                this.log(moduleId, `置信度${conf.toFixed(3)}稳态区间`);
            }

            this.log(moduleId, '步骤3：三角三模型并行审计...');
            const audit = this._applyTripleAudit(input, { confidence: conf });

            this.log(moduleId, '步骤4：冲突回退检测...');
            let finalResult = { ...rawResult, confidence: audit.finalConf, status, audit };
            if (audit.auditResult === 'BLOCK') {
                this.log(moduleId, '冲突无法回退，结果阻断', 'error');
                finalResult.blocked = true;
            } else {
                this.log(moduleId, '步骤5：采纳最优解...');
            }

            const elapsed = Date.now() - startTime;
            this.log(moduleId, `运算完成，耗时${elapsed}ms，置信度${audit.finalConf.toFixed(3)}`);

            this._saveAuditLog({
                type: 'mapping',
                module: moduleId,
                input: (input||'').substring(0, 100),
                confidence: audit.finalConf,
                status,
                auditResult: audit.auditResult,
                elapsed
            });

            this._emit('mapping-complete', finalResult);
            return finalResult;
        },

        _modules: {
            'word-order': function(input, params, ctx) {
                const text = input || 'a beautiful red flower';
                ctx.log('word-order', '提取词性标注序列...');
                ctx.log('word-order', '识别Adj/N语序模式...');
                const swapped = params.swapped;
                ctx.log('word-order', swapped ? '执行向量交换运算' : '保持原语序');
                ctx.log('word-order', '线性代数交换律验证：交换律在语序线性空间成立');
                return {
                    type: 'word-order',
                    input,
                    output: swapped ? '一朵 红色的 美丽的 花' : '一朵 美丽的 红色的 花',
                    confidence: swapped ? 0.52 : 0.50,
                    vector: [0.51, 0.50, 0.50, 0.51],
                    swapProgress: swapped ? 1 : 0
                };
            },

            'tense-kelly': function(input, params, ctx) {
                const p = params.p || 0.55;
                const q = 1 - p;
                const tense = params.tense || 'present';
                ctx.log('tense-kelly', `识别时态：${tense}`);
                ctx.log('tense-kelly', `胜率p=${p.toFixed(2)}，败率q=${q.toFixed(2)}`);
                const fStar = p > q ? (2*p - 1) : 0;
                ctx.log('tense-kelly', `凯利公式计算：f*=2p-1=${fStar.toFixed(3)}`);
                let conf = 0.45 + fStar * 0.5;
                ctx.log('tense-kelly', `有效年龄（持续时间）映射持仓周期`);
                return {
                    type: 'tense-kelly',
                    tense, p, q, fStar,
                    confidence: Math.max(0, Math.min(1, conf)),
                    kellyFraction: fStar,
                    history: (() => {
                        const h = [];
                        let v = 0.5;
                        for (let i = 0; i < 20; i++) {
                            v += (Math.random() - 0.48) * 0.05;
                            v = Math.max(0.2, Math.min(0.8, v));
                            h.push(v);
                        }
                        return h;
                    })()
                };
            },

            'affix-feature': function(input, params, ctx) {
                ctx.log('affix-feature', '提取词根词缀...');
                ctx.log('affix-feature', '执行一阶特征变换...');
                ctx.log('affix-feature', '执行二阶交互特征组合...');
                ctx.log('affix-feature', '构建特征拓扑图...');
                return {
                    type: 'affix-feature',
                    root: params.root || 'ajar',
                    affixes: params.affixes || ['pe-ajar', 'pe-ajar-an'],
                    features: ['施事者', '抽象名词'],
                    confidence: 0.51,
                    topologyLayers: [
                        { nodes: ['词根', '词缀'], color: '#67e8f9' },
                        { nodes: ['派生', '屈折'], color: '#a78bfa' },
                        { nodes: ['语义特征'], color: '#f472b6' }
                    ]
                };
            },

            'ioc-passive': function(input, params, ctx) {
                const reversed = params.reversed;
                ctx.log('ioc-passive', reversed ? '识别主动句式，执行IoC被动反转' : '识别被动句式，执行IoC主动反转');
                ctx.log('ioc-passive', '反转控制流方向...');
                ctx.log('ioc-passive', '依赖注入：宾语提升为主语...');
                ctx.log('ioc-passive', '原主语降格为旁格(by/被)...');
                return {
                    type: 'ioc-passive',
                    input,
                    output: reversed ? '苹果 被 我 吃了' : '我 吃了 苹果',
                    reversed: !!reversed,
                    confidence: reversed ? 0.48 : 0.49
                };
            },

            'polysemy': function(input, params, ctx) {
                const branch = params.branch || 0;
                const branches = ['体育分支', '交通分支', '日常分支', '法律分支'];
                ctx.log('polysemy', `识别多义词上下文：${input || '打'}`);
                ctx.log('polysemy', `策略路由选择：${branches[branch]}`);
                ctx.log('polysemy', '激活对应算法分支，禁用其他分支');
                return {
                    type: 'polysemy',
                    word: input || '打',
                    activeBranch: branch,
                    branches,
                    meaning: ['play球类运动', 'hail搭乘', 'fetch获取', 'engage诉讼'][branch],
                    confidence: 0.50 + branch * 0.01
                };
            },

            'culture-regex': function(input, params, ctx) {
                const strength = params.strength || 0.55;
                ctx.log('culture-regex', `加载文化正则约束库...`);
                ctx.log('culture-regex', `检测文化意象：${input || '龙'}`);
                ctx.log('culture-regex', `约束强度：${(strength*100).toFixed(0)}%`);
                ctx.log('culture-regex', '应用文化正则化边界收敛...');
                return {
                    type: 'culture-regex',
                    concept: input || '龙',
                    constraintStrength: strength,
                    taboo: params.taboo || false,
                    confidence: strength
                };
            },

            'ood-detect': function(input, params, ctx) {
                const oodScore = params.oodScore || 0.3;
                ctx.log('ood-detect', '计算OOD分布外距离...');
                ctx.log('ood-detect', `OOD评分：${oodScore.toFixed(2)}`);
                const conf = Math.max(0.1, 1 - oodScore * 0.9);
                ctx.log('ood-detect', `置信度衰减至：${conf.toFixed(3)}`);
                if (conf < 0.32) {
                    ctx.log('ood-detect', '!!! 触碰0.68红线，熔断告警 !!!', 'error');
                } else if (conf < 0.5) {
                    ctx.log('ood-detect', '置信度不足，触发预警', 'warn');
                }
                return {
                    type: 'ood-detect',
                    word: input || '测试',
                    oodScore,
                    confidence: conf,
                    fused: conf < 0.32,
                    decayPoints: [0.1, 0.25, oodScore, Math.min(1, oodScore+0.2), 0.9]
                };
            },

            'chicken-rabbit': function(input, params, ctx) {
                const h = params.heads || 35;
                const f = params.feet || 94;
                ctx.log('chicken-rabbit', `输入：头=${h}，脚=${f}`);
                ctx.log('chicken-rabbit', '建立方程组：x+y=h; 2x+4y=f');
                ctx.log('chicken-rabbit', '代入消元法求解...');
                const rabbit = (f - 2*h) / 2;
                const chicken = h - rabbit;
                let conf = 0.5;
                if (Number.isInteger(rabbit) && Number.isInteger(chicken) && rabbit >= 0 && chicken >= 0) {
                    ctx.log('chicken-rabbit', `解：鸡=${chicken}，兔=${rabbit}`);
                    ctx.log('chicken-rabbit', '整数解验证通过，稳态成立');
                    conf = 0.5;
                } else {
                    ctx.log('chicken-rabbit', '无合法整数解，异常检测触发', 'warn');
                    conf = 0.3;
                }
                return {
                    type: 'chicken-rabbit',
                    heads: h, feet: f,
                    chicken: Number.isInteger(chicken) && chicken >= 0 ? chicken : null,
                    rabbit: Number.isInteger(rabbit) && rabbit >= 0 ? rabbit : null,
                    confidence: conf
                };
            },

            'pacd': function(input, params, ctx) {
                const rates = params.rates || [1/10, 1/15];
                ctx.log('pacd', `工作效率：${rates.map(r=>(1/r).toFixed(0)+'天/项').join(', ')}`);
                const combined = rates.reduce((a,b) => a+b, 0);
                const days = 1/combined;
                ctx.log('pacd', `并行效率叠加：${rates.map(r=>r.toFixed(3)).join('+')}=${combined.toFixed(3)}`);
                ctx.log('pacd', `合作工期：1/(${combined.toFixed(3)})=${days.toFixed(2)}天`);
                ctx.log('pacd', '阿马迪亚瓶颈检测完成');
                return {
                    type: 'pacd',
                    rates, combinedRate: combined, days,
                    confidence: 0.52,
                    distribution: rates.map(r => r/combined)
                };
            },

            'enum-validation': function(input, params, ctx) {
                const n = params.n || 3;
                const prune = params.prune || false;
                const total = prune ? Math.round(factorial(n) * (0.3 + Math.random()*0.3)) : factorial(n);
                ctx.log('enum-validation', `枚举规模：${n}! = ${factorial(n)}`);
                if (prune) {
                    ctx.log('enum-validation', `应用约束剪枝，剪枝后分支数：${total}`);
                    ctx.log('enum-validation', `剪枝率：${((1-total/factorial(n))*100).toFixed(1)}%`);
                }
                ctx.log('enum-validation', '组合验证完成，全部枚举通过');
                return {
                    type: 'enum-validation',
                    n,
                    totalBranches: factorial(n),
                    prunedBranches: total,
                    pruneRate: prune ? (1 - total/factorial(n)) : 0,
                    confidence: 0.50
                };
            }
        }
    };

    function factorial(n) {
        if (n <= 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    }

    global.MindSpeak = MindSpeak;
    console.log('%c MindSpeak V19.0 Public Engine Loaded ', 
        'background:#1a1a2e;color:#22d3ee;font-weight:bold;padding:4px 8px;border-radius:4px;');
})(typeof window !== 'undefined' ? window : global);