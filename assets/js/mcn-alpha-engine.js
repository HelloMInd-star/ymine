/**
 * ================================================================
 * Y.Mine 全栖系统 · MCN资管核心引擎 (v1.0)
 * ================================================================
 * 对应3-49《MCN资管AI运营解决方案》§2-§5 的量化底层
 * 
 * 包含5大模块：
 *   M1: 四方博弈向量引擎 + α标准化匹配系数 (§2.2)
 *   M2: R²阶梯函数四阶调度器 (§3.1)
 *   M3: 夏普比率+最大回撤+37前置信号风控底座 (§5.1-5.2)
 *   M4: 博主三级分类+S成长曲线 (§4.1-4.2)
 *   M5: 交互判定系统（收敛/发散态+置信度[0.5,0.68]映射）(§5.4)
 * 
 * 可对接: cone-game-theory.js / valuation-engine.js
 * ================================================================
 */

(function(global) {
    'use strict';

    // ================================================================
    // 数学工具
    // ================================================================
    const MathKit = {
        mean(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; },
        std(arr) {
            const m = this.mean(arr);
            return Math.sqrt(arr.reduce((s,x)=>s+(x-m)**2,0)/arr.length);
        },
        cv(arr) { const m=this.mean(arr), s=this.std(arr); return m===0?0:s/m; },
        dot(a,b) { return a.reduce((s,v,i)=>s+v*(b[i]||0),0); },
        norm(a) { return Math.sqrt(a.reduce((s,v)=>s+v*v,0)); },
        cosine(a,b) {
            const na=this.norm(a), nb=this.norm(b);
            return (na===0||nb===0) ? 0 : this.dot(a,b)/(na*nb);
        },
        euclidean(a,b) {
            return Math.sqrt(a.reduce((s,v,i)=>s+(v-(b[i]||0))**2,0));
        },
        sigmoid(x) { return 1/(1+Math.exp(-x)); },
        tanh(x) { return Math.tanh(x); },
        lerp(a,b,t) { return a+(b-a)*t; },
        clamp(x,lo,hi) { return Math.max(lo,Math.min(hi,x)); },
        zScore(x,mu,sigma) { return sigma===0?0:(x-mu)/sigma; },
        softmax(arr) {
            const e = arr.map(x=>Math.exp(x-Math.max(...arr)));
            const s = e.reduce((a,b)=>a+b,0);
            return e.map(x=>x/s);
        }
    };

    // ================================================================
    // M1: 四方博弈向量引擎 + α标准化匹配系数
    // ================================================================
    // 四方：平台(Platform) / 粉丝(Audience) / 品牌(Brand) / 博主(Creator)
    // 每个博主有一个四维SWOT向量，通过余弦相似度+点积+欧氏距离组合量化与"理想锚点"的匹配度
    const FOUR_PARTIES = ['platform', 'audience', 'brand', 'creator'];
    const PARTY_NAMES = { platform:'平台算法', audience:'粉丝受众', brand:'品牌广告', creator:'博主自身' };

    const DIMENSIONS = {
        flow:     { name:'流量力', weight:0.25, parties:['platform','audience'] },
        persona:  { name:'人设力', weight:0.25, parties:['audience','creator'] },
        monetize: { name:'变现力', weight:0.30, parties:['brand','creator'] },
        risk:     { name:'风控力', weight:0.20, parties:['platform','brand'] }
    };

    const IDEAL_ANCHOR = {
        S: { flow:0.95, persona:0.90, monetize:0.85, risk:0.90 },  // S级头部
        A: { flow:0.75, persona:0.80, monetize:0.70, risk:0.80 },  // A级腰部
        B: { flow:0.55, persona:0.60, monetize:0.50, risk:0.65 },  // B级成长
        C: { flow:0.35, persona:0.40, monetize:0.30, risk:0.50 },  // C级种子
        D: { flow:0.15, persona:0.20, monetize:0.15, risk:0.30 }   // D级风险
    };

    class AlphaVectorEngine {
        constructor() {
            this.creators = new Map();
            this.partyPressures = { platform:0.5, audience:0.5, brand:0.5, creator:0.5 };
        }

        /**
         * 录入/更新博主向量
         * @param {string} id 博主ID
         * @param {object} scores {flow, persona, monetize, risk} ∈ [0,1]
         * @param {object} meta 元数据（粉丝数、赛道、GMV等）
         */
        upsertCreator(id, scores, meta = {}) {
            const vec = [
                MathKit.clamp(scores.flow ?? 0.5, 0, 1),
                MathKit.clamp(scores.persona ?? 0.5, 0, 1),
                MathKit.clamp(scores.monetize ?? 0.5, 0, 1),
                MathKit.clamp(scores.risk ?? 0.5, 0, 1)
            ];
            const record = {
                id,
                vec,
                scores: { flow:vec[0], persona:vec[1], monetize:vec[2], risk:vec[3] },
                meta,
                history: [],
                createdAt: this.creators.has(id) ? this.creators.get(id).createdAt : Date.now()
            };
            this.creators.set(id, record);
            this._recomputeAlpha(id);
            return this.getCreator(id);
        }

        /**
         * 设置四方博弈压力（由cone引擎的participants或MoodMind注入）
         */
        setPartyPressures(pressures) {
            Object.keys(pressures).forEach(k => {
                if(k in this.partyPressures) {
                    this.partyPressures[k] = MathKit.clamp(pressures[k], 0, 1);
                }
            });
        }

        _recomputeAlpha(id) {
            const c = this.creators.get(id);
            if(!c) return;
            // 综合距离度量：余弦相似度（方向一致性）+ 点积（强度）+ 欧氏距离（绝对差距）
            let bestAlpha = 0, bestGrade = 'D', bestAnchor = 'C';
            for(const [grade, anchor] of Object.entries(IDEAL_ANCHOR)) {
                const anchorVec = [anchor.flow, anchor.persona, anchor.monetize, anchor.risk];
                const cos = MathKit.cosine(c.vec, anchorVec);
                const dot = MathKit.dot(c.vec, anchorVec);
                const euc = 1 - MathKit.clamp(MathKit.euclidean(c.vec, anchorVec)/2, 0, 1); // 归一化并反转
                // 加权组合：余弦0.4 + 点积0.3 + 欧氏0.3
                const sim = 0.4*cos + 0.3*MathKit.clamp(dot/4,0,1)*2 + 0.3*euc;
                if(sim > bestAlpha) { bestAlpha = sim; bestGrade = grade; bestAnchor = grade; }
            }
            // 维度加权α
            let weightedSum = 0;
            Object.entries(DIMENSIONS).forEach(([dim, cfg]) => {
                weightedSum += c.scores[dim] * cfg.weight;
            });
            // 四方压力修正：每方对相关维度的压力会惩罚α
            let pressurePenalty = 0;
            Object.entries(DIMENSIONS).forEach(([dim, cfg]) => {
                cfg.parties.forEach(p => {
                    pressurePenalty += (1 - this.partyPressures[p]) * 0.05 * cfg.weight;
                });
            });
            const finalAlpha = MathKit.clamp(bestAlpha * 0.6 + weightedSum * 0.4 - pressurePenalty, 0, 1);
            const grade = this._gradeFromAlpha(finalAlpha);
            c.alpha = finalAlpha;
            c.grade = grade;
            c.bestAnchor = bestAnchor;
            c.similarity = { cosine: MathKit.cosine(c.vec, [IDEAL_ANCHOR[grade].flow, IDEAL_ANCHOR[grade].persona, IDEAL_ANCHOR[grade].monetize, IDEAL_ANCHOR[grade].risk]) };
            c.lastUpdate = Date.now();
            c.history.push({ t: Date.now(), alpha: finalAlpha, vec:[...c.vec] });
            if(c.history.length > 90) c.history.shift();
        }

        _gradeFromAlpha(a) {
            if(a >= 0.85) return 'S';
            if(a >= 0.70) return 'A';
            if(a >= 0.55) return 'B';
            if(a >= 0.40) return 'C';
            return 'D';
        }

        getCreator(id) {
            const c = this.creators.get(id);
            return c ? {
                id: c.id, scores: {...c.scores}, meta: {...c.meta},
                alpha: c.alpha, grade: c.grade, bestAnchor: c.bestAnchor,
                similarity: {...c.similarity}, vec: [...c.vec]
            } : null;
        }

        /**
         * 矩阵三层穿透：博主级→赛道级→全域级
         */
        getPortfolioView() {
            const all = Array.from(this.creators.values());
            if(all.length === 0) return { count:0 };
            // 博主级汇总
            const byGrade = { S:[], A:[], B:[], C:[], D:[] };
            all.forEach(c => byGrade[c.grade].push(this.getCreator(c.id)));
            // 赛道级聚合（按meta.track）
            const byTrack = {};
            all.forEach(c => {
                const t = c.meta.track || 'default';
                if(!byTrack[t]) byTrack[t] = { creators:[], avgAlpha:0, totalAlpha:0 };
                byTrack[t].creators.push(c.id);
                byTrack[t].totalAlpha += c.alpha;
            });
            Object.values(byTrack).forEach(t => t.avgAlpha = t.totalAlpha / t.creators.length);
            // 全域α
            const globalAlpha = all.reduce((s,c)=>s+c.alpha,0) / all.length;
            const portfolioVec = [0,0,0,0];
            all.forEach(c => c.vec.forEach((v,i) => portfolioVec[i] += v/all.length));
            return {
                count: all.length,
                byGrade: Object.fromEntries(Object.entries(byGrade).map(([g,arr])=>[g, arr.length])),
                byTrack,
                globalAlpha,
                portfolioVec,
                concentration: MathKit.cv(all.map(c=>c.alpha)) // 矩阵集中度（CV高=头部分散差）
            };
        }

        /**
         * 计算两个博主的向量距离（用于相似替代/对冲配置）
         */
        creatorDistance(idA, idB) {
            const a = this.creators.get(idA), b = this.creators.get(idB);
            if(!a||!b) return null;
            return {
                cosine: MathKit.cosine(a.vec, b.vec),
                euclidean: MathKit.euclidean(a.vec, b.vec),
                dot: MathKit.dot(a.vec, b.vec)
            };
        }
    }

    // ================================================================
    // M2: R²阶梯函数四阶调度器 (§3.1)
    // ================================================================
    // R² ∈ [0,1] 表示AI决策置信度的决定系数
    // R² < 0.30 → Mode1 轻量化（规则型）
    // 0.30 ≤ R² < 0.50 → Mode2 辅助智能（分析型）
    // 0.50 ≤ R² < 0.75 → Mode3 全量自治（自主决策）
    // R² ≥ 0.75 → Mode4 架构师全局迭代
    const AUTONOMY_MODES = {
        LIGHT:   { id:'light',   name:'轻量化模式',   minR2:0,    maxR2:0.30, humanOversight:1.0, aiAutonomy:0.0, action:'执行规则+人工全量审批' },
        ASSIST:  { id:'assist',  name:'辅助智能模式', minR2:0.30, maxR2:0.50, humanOversight:0.7, aiAutonomy:0.3, action:'AI参谋+人最终决策' },
        AUTO:    { id:'auto',    name:'全量自治模式', minR2:0.50, maxR2:0.75, humanOversight:0.2, aiAutonomy:0.8, action:'AI自主执行+人工例外管控' },
        ARCH:    { id:'arch',    name:'架构师迭代模式', minR2:0.75, maxR2:1.01, humanOversight:0.5, aiAutonomy:0.5, action:'AI进化系统+架构师SOP双周迭代' }
    };

    class R2Scheduler {
        constructor() {
            this.mode = AUTONOMY_MODES.LIGHT;
            this.r2History = [];
            this.modeHistory = [];
            this.coneIntegration = null; // 可注入cone引擎
        }

        attachCone(coneField) { this.coneIntegration = coneField; }

        /**
         * R²由多源信号合成：cone状态稳定性 + 决策历史准确率 + 数据完整度 + MoodMind置信度
         */
        computeR2(signals = {}) {
            const {
                coneStability = 0.5,   // cone state稳定度 (1 - 过去N tick状态变更频率)
                decisionAccuracy = 0.5, // 历史决策准确率
                dataCompleteness = 0.7, // 数据完整度
                moodConfidence = 0.5,   // MoodMind识别置信度
                modelAgreement = 0.5    // 豆包/DeepSeek双模型一致性
            } = signals;
            // 加权合成
            const r2 = MathKit.clamp(
                0.25*coneStability + 0.25*decisionAccuracy +
                0.20*dataCompleteness + 0.15*moodConfidence +
                0.15*modelAgreement,
                0, 1
            );
            return r2;
        }

        determineMode(r2) {
            for(const mode of Object.values(AUTONOMY_MODES)) {
                if(r2 >= mode.minR2 && r2 < mode.maxR2) return mode;
            }
            return AUTONOMY_MODES.LIGHT;
        }

        /**
         * 执行一次调度
         * @returns {{mode, r2, shouldUpgrade, shouldDowngrade, orders:[]}}
         */
        tick(signals = {}) {
            const r2 = this.computeR2(signals);
            const newMode = this.determineMode(r2);
            const oldMode = this.mode;
            const upgraded = newMode.id !== oldMode.id && this._modeRank(newMode) > this._modeRank(oldMode);
            const downgraded = newMode.id !== oldMode.id && this._modeRank(newMode) < this._modeRank(oldMode);
            this.r2History.push({ t:Date.now(), r2 });
            if(this.r2History.length > 60) this.r2History.shift();
            // 防抖：需连续3个tick确认才切换
            const recent = this.r2History.slice(-3);
            let confirmedMode = oldMode;
            if(recent.length === 3) {
                const inNewMode = recent.every(r => {
                    const m = this.determineMode(r.r2);
                    return m.id === newMode.id;
                });
                if(inNewMode) { confirmedMode = newMode; this.mode = newMode; }
            }
            if(confirmedMode.id !== oldMode.id) {
                this.modeHistory.push({ t:Date.now(), from:oldMode.id, to:confirmedMode.id, r2 });
            }
            const orders = this._ordersFor(confirmedMode, r2, upgraded, downgraded);
            return {
                mode: confirmedMode,
                r2,
                upgraded: upgraded && confirmedMode.id===newMode.id,
                downgraded: downgraded && confirmedMode.id===newMode.id,
                orders,
                canUpgradeTo: Object.values(AUTONOMY_MODES).find(m=>this._modeRank(m)===this._modeRank(confirmedMode)+1) || null,
                threshold: { next: confirmedMode.maxR2, prev: confirmedMode.minR2 }
            };
        }

        _modeRank(m) {
            return { light:1, assist:2, auto:3, arch:4 }[m.id] || 1;
        }

        _ordersFor(mode, r2, up, down) {
            const orders = [];
            orders.push(`R²=${(r2*100).toFixed(1)}% · 当前模式：${mode.name}`);
            if(up) orders.push(`⬆️ 升级信号：连续3个tick满足${mode.name}阈值，可零沉没成本升级`);
            if(down) orders.push(`⬇️ 降级信号：R²跌破阈值，自动回退到${mode.name}`);
            if(mode.id==='light') orders.push('📋 执行规则套表，人工全量审批');
            if(mode.id==='assist') orders.push('🤖 AI推送参谋建议，人做最终决策');
            if(mode.id==='auto') orders.push('🚗 AI自动驾驶，仅人工例外清单管控');
            if(mode.id==='arch') orders.push('🏛️ 进入架构师模式，启动双周迭代SOP');
            return orders;
        }
    }

    // ================================================================
    // M3: 风控底座：夏普比率 + 最大回撤 + 37前置信号 (§5.1-5.2)
    // ================================================================
    const RISK_SIGNALS = {
        // A. 流量信号(8个)
        traffic: [
            { id:'T01', name:'连续3天播放量环比-30%', severity:2, threshold:(d)=>d.trafficDrop3d < -0.3 },
            { id:'T02', name:'完播率跌破行业均值50%', severity:2, threshold:(d)=>d.completionRate < 0.20 },
            { id:'T03', name:'涨粉速度转负且持续7天', severity:2, threshold:(d)=>d.followerGrowth7d < 0 },
            { id:'T04', name:'搜索来源占比骤降', severity:1, threshold:(d)=>d.searchShareDrop < -0.2 },
            { id:'T05', name:'首页推荐流量腰斩', severity:2, threshold:(d)=>d.feedTrafficDrop < -0.5 },
            { id:'T06', name:'粉丝取关率>3%/天', severity:2, threshold:(d)=>d.unfollowRate > 0.03 },
            { id:'T07', name:'私域打开率<5%', severity:1, threshold:(d)=>d.privateOpenRate < 0.05 },
            { id:'T08', name:'CTR连续5天下滑', severity:1, threshold:(d)=>d.ctrStreak < -5 }
        ],
        // B. 内容信号(8个)
        content: [
            { id:'C01', name:'更新频率断更>7天', severity:2, threshold:(d)=>d.daysNoUpdate > 7 },
            { id:'C02', name:'内容同质化指数>0.8', severity:1, threshold:(d)=>d.contentHomogeneity > 0.8 },
            { id:'C03', name:'评论负向率>15%', severity:3, threshold:(d)=>d.negativeCommentRate > 0.15 },
            { id:'C04', name:'选题敏感词命中', severity:3, threshold:(d)=>d.sensitiveHit === true },
            { id:'C05', name:'人设漂移度>0.3', severity:2, threshold:(d)=>d.personaDrift > 0.3 },
            { id:'C06', name:'爆文率<3%/月', severity:1, threshold:(d)=>d.hitRate < 0.03 },
            { id:'C07', name:'AI内容检测率>30%', severity:1, threshold:(d)=>d.aiDetectRate > 0.3 },
            { id:'C08', name:'跨赛道尝试失败>3次', severity:1, threshold:(d)=>d.crossTrackFail > 3 }
        ],
        // C. 商业信号(7个)
        business: [
            { id:'B01', name:'商单报价月跌>20%', severity:2, threshold:(d)=>d.priceDrop > 0.2 },
            { id:'B02', name:'品牌复投率<20%', severity:2, threshold:(d)=>d.brandReturnRate < 0.2 },
            { id:'B03', name:'CPM超行业均值2倍', severity:1, threshold:(d)=>d.cpmRatio > 2.0 },
            { id:'B04', name:'GMV日环比-50%', severity:3, threshold:(d)=>d.gmvDailyDrop < -0.5 },
            { id:'B05', name:'退单率>15%', severity:2, threshold:(d)=>d.refundRate > 0.15 },
            { id:'B06', name:'应收账款逾期>30天', severity:2, threshold:(d)=>d.overdueAR > 30 },
            { id:'B07', name:'签约品牌同赛道塌方', severity:2, threshold:(d)=>d.brandScandal === true }
        ],
        // D. 合规信号(7个)
        compliance: [
            { id:'L01', name:'监管政策波及赛道', severity:3, threshold:(d)=>d.regulatoryRisk === true },
            { id:'L02', name:'平台账号处罚(限流)', severity:3, threshold:(d)=>d.accountPenalty === true },
            { id:'L03', name:'税务风险预警', severity:3, threshold:(d)=>d.taxRisk === true },
            { id:'L04', name:'合同纠纷未决', severity:2, threshold:(d)=>d.contractDispute === true },
            { id:'L05', name:'版权侵权诉讼', severity:3, threshold:(d)=>d.copyrightSuit === true },
            { id:'L06', name:'代言产品塌房', severity:3, threshold:(d)=>d.endorsementRisk === true },
            { id:'L07', name:'MCN签约到期<30天', severity:2, threshold:(d)=>d.contractDaysLeft < 30 }
        ],
        // E. 平台/生态信号(7个)
        platform: [
            { id:'P01', name:'平台算法大版本更新', severity:2, threshold:(d)=>d.algoUpdate === true },
            { id:'P02', name:'同类博主批量崛起', severity:1, threshold:(d)=>d.competitorSurge === true },
            { id:'P03', name:'平台分成规则不利变化', severity:2, threshold:(d)=>d.revenueShareCut === true },
            { id:'P04', name:'赛道搜索指数月跌>40%', severity:2, threshold:(d)=>d.trackSearchDrop < -0.4 },
            { id:'P05', name:'头部跨赛道入侵者', severity:1, threshold:(d)=>n=>n.invaderEntry === true },
            { id:'P06', name:'平台对垂类政策收紧', severity:2, threshold:(d)=>d.trackPolicyTight === true },
            { id:'P07', name:'竞品MCN挖角信号', severity:2, threshold:(d)=>d.poachingSignal === true }
        ]
    };

    class RiskController {
        constructor(riskFreeRate = 0.035) {
            this.rf = riskFreeRate;
            this.returns = [];      // 日收益率序列
            this.equity = [1.0];    // 净值序列
            this.peak = 1.0;
            this.maxDrawdown = 0;
            this.signalHits = [];   // 触发过的信号
            this.fuseTriggered = null;
        }

        /**
         * 记录每日收益（或每tick收益）
         * @param {number} ret 收益率(小数, 0.02=+2%)
         */
        recordReturn(ret) {
            this.returns.push(ret);
            const newEquity = this.equity[this.equity.length-1] * (1 + ret);
            this.equity.push(newEquity);
            if(newEquity > this.peak) this.peak = newEquity;
            const dd = (this.peak - newEquity) / this.peak;
            if(dd > this.maxDrawdown) this.maxDrawdown = dd;
            // 熔断检查
            if(dd > 0.15 && !this.fuseTriggered) {
                this.fuseTriggered = { type:'MAX_DRAWDOWN_FUSE', level:dd, t:Date.now() };
            }
            return { equity:newEquity, drawdown:dd, sharpe:this.sharpe(), maxDD:this.maxDrawdown };
        }

        /**
         * 年化夏普比率 = (R_p - R_f) / σ_p
         * 默认按日频数据，√252年化
         */
        sharpe(annualize = true) {
            if(this.returns.length < 5) return 0;
            const mean = MathKit.mean(this.returns);
            const std = MathKit.std(this.returns);
            if(std === 0) return 0;
            const ann = annualize ? Math.sqrt(252) : 1;
            const rfDaily = (this.rf - 1) / 252 + 1;
            return ((mean - (rfDaily-1)) / std) * ann;
        }

        /**
         * 双指标联动决策矩阵（§5.1.3）
         */
        decisionMatrix() {
            const s = this.sharpe();
            const dd = this.maxDrawdown;
            // 夏普<1或回撤>10% -> 红灯
            if(s < 1.0 || dd > 0.10) {
                return { status:'RED', action:'强制减仓/对冲', positionLimit:0.25, hedgeMin:0.5 };
            }
            // 夏普1-2 回撤5-10% -> 黄灯
            if(s < 2.0 || dd > 0.05) {
                return { status:'YELLOW', action:'谨慎加仓/提高止损', positionLimit:0.50, hedgeMin:0.2 };
            }
            // 夏普>2 回撤<5% -> 绿灯
            return { status:'GREEN', action:'标准凯利执行', positionLimit:1.0, hedgeMin:0 };
        }

        /**
         * 扫描37个前置信号
         * @param {object} data 博主/矩阵实时数据
         * @returns {Array} 触发的信号列表
         */
        scanSignals(data) {
            const triggered = [];
            Object.values(RISK_SIGNALS).flat().forEach(sig => {
                try {
                    if(sig.threshold(data)) {
                        triggered.push({ id:sig.id, name:sig.name, severity:sig.severity, category:Object.keys(RISK_SIGNALS).find(k=>RISK_SIGNALS[k].includes(sig)) });
                    }
                } catch(e) {}
            });
            // 按严重度排序
            triggered.sort((a,b)=>b.severity-a.severity);
            this.signalHits.push({ t:Date.now(), triggered:triggered.map(s=>s.id) });
            if(this.signalHits.length > 100) this.signalHits.shift();
            // 严重度>=3的信号触发紧急熔断
            const critical = triggered.filter(s=>s.severity>=3);
            if(critical.length >= 2) {
                this.fuseTriggered = { type:'CRITICAL_SIGNAL_FUSE', count:critical.length, signals:critical.map(s=>s.id), t:Date.now() };
            }
            return triggered;
        }

        resetFuse() { this.fuseTriggered = null; }

        summary() {
            return {
                sharpe: this.sharpe(),
                maxDrawdown: this.maxDrawdown,
                currentDrawdown: this.peak === 0 ? 0 : (this.peak - this.equity[this.equity.length-1])/this.peak,
                equity: this.equity[this.equity.length-1],
                peak: this.peak,
                signalCount: this.signalHits.length,
                fuse: this.fuseTriggered,
                matrix: this.decisionMatrix()
            };
        }
    }

    // ================================================================
    // M4: 博主三级分类 + S成长曲线模型 (§4.1-4.2)
    // ================================================================
    // 三级：种子期 → 成长期 → 成熟期 → 衰退期（生命周期四阶段，但分类是3级）
    // 用Logistic S曲线建模成长：f(t) = K / (1 + e^(-r*(t-t0)))
    const LIFECYCLE = {
        SEED:     { id:'seed',     name:'种子期', alphaMin:0,    alphaMax:0.40, color:'#94a3b8' },
        GROWTH:   { id:'growth',   name:'成长期', alphaMin:0.40, alphaMax:0.70, color:'#22c55e' },
        MATURE:   { id:'mature',   name:'成熟期', alphaMin:0.70, alphaMax:0.90, color:'#3b82f6' },
        DECLINE:  { id:'decline',  name:'衰退期', alphaMin:0,    alphaMax:1.00, color:'#ef4444' } // 衰退由趋势判定，不看α绝对值
    };

    class LifecycleModel {
        constructor() {
            this.curves = new Map();
        }

        /**
         * 初始化博主S曲线参数
         * @param {string} id 
         * @param {object} params { K:成熟期潜力上限[0,1], r:成长速率, t0:中点时间(天), startDay:开始天数 }
         */
        initCurve(id, params = {}) {
            const curve = {
                id,
                K:  params.K  ?? 0.75,  // 上限
                r:  params.r  ?? 0.04,  // 速率
                t0: params.t0 ?? 90,    // 成长期中点（天）
                startDay: params.startDay ?? 0,
                actualPoints: [],
                createdAt: Date.now()
            };
            this.curves.set(id, curve);
            return curve;
        }

        /**
         * Logistic预测
         */
        predict(id, day) {
            const c = this.curves.get(id);
            if(!c) return null;
            const t = day - c.startDay;
            return c.K / (1 + Math.exp(-c.r * (t - c.t0)));
        }

        /**
         * 记录实际α值
         */
        recordPoint(id, day, actualAlpha) {
            const c = this.curves.get(id);
            if(!c) return;
            c.actualPoints.push({ day, alpha: actualAlpha });
        }

        /**
         * 判定生命周期阶段
         */
        stage(id, currentAlpha, currentDay) {
            const c = this.curves.get(id);
            if(!c) return LIFECYCLE.SEED;
            // 看最近14天的一阶导数（α变化率）
            const recent = c.actualPoints.slice(-14);
            if(recent.length < 3) {
                if(currentAlpha < 0.40) return LIFECYCLE.SEED;
                if(currentAlpha < 0.70) return LIFECYCLE.GROWTH;
                return LIFECYCLE.MATURE;
            }
            const first = recent[0], last = recent[recent.length-1];
            const delta = (last.alpha - first.alpha) / Math.max(1,last.day - first.day);
            const predicted = this.predict(id, currentDay);
            const gap = currentAlpha - predicted;
            // 衰退判定：实际持续低于预测且负增长
            if(delta < -0.005 && currentAlpha < predicted*0.85) return LIFECYCLE.DECLINE;
            if(currentAlpha < 0.40) return LIFECYCLE.SEED;
            if(currentAlpha < 0.70 && delta > 0.002) return LIFECYCLE.GROWTH;
            if(delta < -0.002 && currentAlpha >= 0.70) return LIFECYCLE.DECLINE;
            if(currentAlpha >= 0.70) return LIFECYCLE.MATURE;
            return LIFECYCLE.GROWTH;
        }

        /**
         * 动态再平衡建议（§4.4）
         */
        rebalanceSuggestion(portfolio, id, currentAlpha, currentDay) {
            const stage = this.stage(id, currentAlpha, currentDay);
            const suggestions = {
                seed:    { action:'加仓孵化', budgetWeight:0.10, contentWeight:0.80, adWeight:0.10, riskTag:'高风险高弹性' },
                growth:  { action:'重点加仓', budgetWeight:0.40, contentWeight:0.50, adWeight:0.40, riskTag:'成长主力' },
                mature:  { action:'稳仓收割', budgetWeight:0.35, contentWeight:0.20, adWeight:0.20, riskTag:'现金牛' },
                decline: { action:'减仓对冲', budgetWeight:0.05, contentWeight:0.10, adWeight:0.0,  riskTag:'出清候选', hedge:true }
            };
            return { stage: stage.id, stageName: stage.name, ...suggestions[stage.id] };
        }
    }

    // ================================================================
    // M5: 交互判定系统（收敛/发散态+置信度[0.5,0.68]映射）(§5.4)
    // ================================================================
    // 置信度区间 [0.5, 0.68]
    // - 0.50 = 随机水平（无信息）
    // - 0.59 = 弱信号
    // - 0.68 = 1σ稳态（68%置信度，决策临界点）
    // - >0.68 = 强信号/收敛态
    const CONFIDENCE_BANDS = {
        RANDOM:      { min:0.00, max:0.50, label:'随机区', color:'#6b7280', action:'禁止决策,补充数据' },
        WEAK:        { min:0.50, max:0.59, label:'弱信号', color:'#f59e0b', action:'辅助模式,人决策' },
        MODERATE:    { min:0.59, max:0.68, label:'中等信号', color:'#3b82f6', action:'AI参谋+人审' },
        STRONG:      { min:0.68, max:0.85, label:'强信号', color:'#22c55e', action:'AI自治执行' },
        CONVERGED:   { min:0.85, max:1.01, label:'收敛态', color:'#a855f7', action:'架构师SOP,可放大' }
    };

    class InteractionJudger {
        constructor(windowSize = 20) {
            this.window = windowSize;
            this.history = []; // {t, prediction, actual, coneZ, moodZeta}
        }

        /**
         * 记录一次预测-实际对
         */
        record(prediction, actual, aux = {}) {
            this.history.push({ t:Date.now(), p:prediction, a:actual, ...aux });
            if(this.history.length > this.window * 3) this.history.shift();
        }

        /**
         * 计算当前置信度：滑动窗口内预测与实际的一致率，结合熵/变异系数
         * 置信度 ≈ 一致率 × 稳定性 × 收敛度
         */
        confidence() {
            const w = this.history.slice(-this.window);
            if(w.length < 5) return { conf:0.5, band:CONFIDENCE_BANDS.RANDOM, converged:false, diverging:false };
            // 一致率：预测方向与实际方向相同的比例
            let hits = 0;
            w.forEach(h => {
                const pDir = Math.sign(h.p);
                const aDir = Math.sign(h.a);
                if(pDir === aDir || (Math.abs(h.p)<0.05 && Math.abs(h.a)<0.05)) hits++;
            });
            const hitRate = hits / w.length;
            // 稳定性：最近N个决策的CV越小越稳定
            const preds = w.map(h=>h.p);
            const stability = 1 - MathKit.clamp(MathKit.cv(preds), 0, 1);
            // 收敛度：coneZ绝对值越小越收敛（在0.68稳态附近）
            const zVals = w.map(h=>h.coneZ || 0);
            const absZmean = MathKit.mean(zVals.map(z=>Math.abs(z)));
            const convergence = 1 - MathKit.clamp(absZmean/2, 0, 1);
            // 综合
            const conf = MathKit.clamp(hitRate*0.5 + stability*0.25 + convergence*0.25, 0, 1);
            const band = Object.values(CONFIDENCE_BANDS).find(b => conf >= b.min && conf < b.max) || CONFIDENCE_BANDS.RANDOM;
            // 收敛/发散判定
            const recent = this.history.slice(-Math.floor(this.window/2));
            const early = this.history.slice(-this.window, -Math.floor(this.window/2));
            if(recent.length >= 3 && early.length >= 3) {
                const recentCv = MathKit.cv(recent.map(h=>h.a));
                const earlyCv = MathKit.cv(early.map(h=>h.a));
                const converged = recentCv < earlyCv * 0.6 && conf >= 0.68;
                const diverging = recentCv > earlyCv * 1.5 && conf < 0.5;
                return { conf, band, converged, diverging, hitRate, stability, convergence };
            }
            return { conf, band, converged:false, diverging:false, hitRate, stability, convergence };
        }

        /**
         * MCN资产评级映射（§5.4.1）
         * 置信度区间映射到MCN决策动作
         */
        mapToMCNAssetRating(conf) {
            const c = typeof conf === 'number' ? conf : this.confidence().conf;
            if(c < 0.50) return { rating:'HOLD', action:'禁止交易', positionLimit:0 };
            if(c < 0.59) return { rating:'WATCH', action:'观察名单', positionLimit:0.05 };
            if(c < 0.68) return { rating:'TACTICAL', action:'战术配置', positionLimit:0.15 };
            if(c < 0.85) return { rating:'CORE', action:'核心仓位', positionLimit:0.35 };
            return { rating:'STRATEGIC', action:'战略重仓', positionLimit:0.50 };
        }
    }

    // ================================================================
    // 统一入口：YMcMine 聚合器
    // ================================================================
    class YMcMine {
        constructor(config = {}) {
            this.alpha = new AlphaVectorEngine();
            this.r2 = new R2Scheduler();
            this.risk = new RiskController(config.riskFreeRate ?? 0.035);
            this.lifecycle = new LifecycleModel();
            this.judger = new InteractionJudger(config.windowSize ?? 20);
            this.cone = null;
            this.version = '1.0.0';
        }

        attachCone(coneField) {
            this.cone = coneField;
            this.r2.attachCone(coneField);
        }

        /**
         * 一次全引擎tick：从cone拿状态→跑α/R²/风控/判定→输出统一决策
         */
        tick(marketData = {}) {
            // 1. 从cone拿状态（如果已挂载）
            let coneSnap = null;
            if(this.cone) {
                coneSnap = this.cone.tick(marketData.shock || 0);
                // 把cone的四方压力映射给α引擎（简化：用参与者位置）
                this.alpha.setPartyPressures({
                    platform:  MathKit.clamp(0.5 + (coneSnap.centerPressure||0)*0.3, 0, 1),
                    audience:  MathKit.clamp(0.5 + (coneSnap.price - 0.5)*0.5, 0, 1),
                    brand:     MathKit.clamp(0.5 + (coneSnap.zScore||0)*0.1, 0, 1),
                    creator:   MathKit.clamp(0.5 + (coneSnap.brandVolume?.V ? (coneSnap.brandVolume.V-1)*0.3 : 0), 0, 1)
                });
            }
            // 2. 37信号扫描
            const signals = this.risk.scanSignals(marketData);
            // 3. R²调度
            const coneStability = coneSnap ? Math.max(0, 1 - Math.abs(coneSnap.zScore)/3) : 0.5;
            const r2Result = this.r2.tick({
                coneStability,
                decisionAccuracy: this.judger.confidence().hitRate || 0.5,
                dataCompleteness: marketData.dataCompleteness ?? 0.7,
                moodConfidence: coneSnap?.moodMind?.zetaConfidence ?? 0.5,
                modelAgreement: marketData.modelAgreement ?? 0.5
            });
            // 4. 组合视图
            const portfolio = this.alpha.getPortfolioView();
            // 5. 交互判定
            const judge = this.judger.confidence();
            return {
                cone: coneSnap,
                portfolio,
                r2: r2Result,
                risk: this.risk.summary(),
                signals,
                judge,
                mode: r2Result.mode.id,
                timestamp: Date.now()
            };
        }
    }

    // ================================================================
    // 导出
    // ================================================================
    const api = {
        MathKit,
        AlphaVectorEngine,
        R2Scheduler,
        AUTONOMY_MODES,
        RiskController,
        RISK_SIGNALS,
        LifecycleModel,
        LIFECYCLE,
        InteractionJudger,
        CONFIDENCE_BANDS,
        IDEAL_ANCHOR,
        FOUR_PARTIES,
        PARTY_NAMES,
        DIMENSIONS,
        YMcMine,
        version: '1.0.0'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.YMcMine = api;
    }
})(typeof window !== 'undefined' ? window : global);
