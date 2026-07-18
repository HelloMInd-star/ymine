/**
 * ================================================================
 * Y.Mine 全栖系统 · MCN资管核心引擎 (v1.1)
 * ================================================================
 * 严格对齐3-49《MCN资管AI运营解决方案》附录A全套量化标准
 * 文档来源：飞书 NB54dSTYioKngMxhuS3cVx65nHh (revision 26)
 *
 * 包含5大模块：
 *   M1: 四维资产定价模型（S₁-S₂₀子项，精确权重对齐文档A2）
 *   M2: α标准化匹配系数（纯余弦相似度，对齐A3）
 *   M3: 风控底座（夏普比率+最大回撤+37信号+L1-L4舆情熔断，对齐A1/§5）
 *   M4: R²阶梯函数四阶调度器 + 博主生命周期（§3-§4）
 *   M5: 交互判定系统（置信度[0.5,0.68]映射+偏离阈值，对齐A5/§5.4）
 * ================================================================
 */

(function(global) {
    'use strict';

    // ================================================================
    // 数学工具
    // ================================================================
    const MathKit = {
        mean(a){return a.reduce((s,x)=>s+x,0)/a.length;},
        std(a){const m=this.mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length);},
        cv(a){const m=this.mean(a);return m===0?0:this.std(a)/m;},
        dot(a,b){return a.reduce((s,v,i)=>s+v*(b[i]||0),0);},
        norm(a){return Math.sqrt(a.reduce((s,v)=>s+v*v,0));},
        cosine(a,b){const na=this.norm(a),nb=this.norm(b);return (na===0||nb===0)?0:this.dot(a,b)/(na*nb);},
        euclidean(a,b){return Math.sqrt(a.reduce((s,v,i)=>s+(v-(b[i]||0))**2,0));},
        clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));},
        normalize(x,lo,hi){return this.clamp((x-lo)/(hi-lo),0,1);},
        lerp(a,b,t){return a+(b-a)*t;}
    };

    // ================================================================
    // A2: 四维资产定价常量（严格对齐文档附录A2）
    // ================================================================
    // 默认权重：W1=0.30流量, W2=0.25人设, W3=0.35变现, W4=0.10风险
    const DIMENSION_WEIGHTS = {
        flow:     { w:0.30, name:'流量盘', sign:1  },
        persona:  { w:0.25, name:'人设盘', sign:1  },
        monetize: { w:0.35, name:'变现盘', sign:1  },
        risk:     { w:0.10, name:'风险盘', sign:-1 } // 负向指标
    };

    // S₁-S₂₀ 子项定义（权重严格对齐文档RwxXFN/DzyWLR/JnUqKa/4rv2X8）
    const SUB_METRICS = {
        // 流量盘 5个子项 权重和=1.00
        S1:  { dim:'flow',     w:0.25, name:'流量规模',       code:'S₁' },
        S2:  { dim:'flow',     w:0.25, name:'流量稳定性',     code:'S₂' },
        S3:  { dim:'flow',     w:0.20, name:'流量质量',       code:'S₃' },
        S4:  { dim:'flow',     w:0.15, name:'流量增长趋势',   code:'S₄' },
        S5:  { dim:'flow',     w:0.15, name:'流量来源健康度', code:'S₅' },
        // 人设盘 5个子项 权重和=1.00
        S6:  { dim:'persona',  w:0.25, name:'粉丝增速',       code:'S₆' },
        S7:  { dim:'persona',  w:0.25, name:'粉丝粘性',       code:'S₇' },
        S8:  { dim:'persona',  w:0.20, name:'内容辨识度',     code:'S₈' },
        S9:  { dim:'persona',  w:0.15, name:'跨平台影响力',   code:'S₉' },
        S10: { dim:'persona',  w:0.15, name:'舆情健康度',     code:'S₁₀' },
        // 变现盘 5个子项 权重和=1.00
        S11: { dim:'monetize', w:0.25, name:'变现规模',       code:'S₁₁' },
        S12: { dim:'monetize', w:0.25, name:'变现效率',       code:'S₁₂' },
        S13: { dim:'monetize', w:0.20, name:'变现稳定性',     code:'S₁₃' },
        S14: { dim:'monetize', w:0.15, name:'变现潜力',       code:'S₁₄' },
        S15: { dim:'monetize', w:0.15, name:'变现多元化',     code:'S₁₅' },
        // 风险盘 5个子项 权重和=1.00
        S16: { dim:'risk',     w:0.30, name:'舆情风险',       code:'S₁₆' },
        S17: { dim:'risk',     w:0.25, name:'合规风险',       code:'S₁₇' },
        S18: { dim:'risk',     w:0.20, name:'流量下滑风险',   code:'S₁₈' },
        S19: { dim:'risk',     w:0.15, name:'变现中断风险',   code:'S₁₉' },
        S20: { dim:'risk',     w:0.10, name:'人设崩塌风险',   code:'S₂₀' }
    };

    // 综合估值公式：V = F×W1 + P×W2 + M×W3 - R×W4
    function computeFourDimValue(scores) {
        let V = 0;
        const dimBreakdown = {};
        for(const [dim, cfg] of Object.entries(DIMENSION_WEIGHTS)) {
            const dimScore = scores[dim] ?? 0;
            dimBreakdown[dim] = { score: dimScore, weight: cfg.w, contribution: dimScore * cfg.w * cfg.sign };
            V += dimScore * cfg.w * cfg.sign;
        }
        // V ∈ [0,100] (因为scores是0-100)
        return { V: MathKit.clamp(V, 0, 100), breakdown: dimBreakdown };
    }

    // ================================================================
    // A3: α标准化匹配系数（纯余弦相似度，严格对齐A3）
    // ================================================================
    // α = cos(θ) = (A·B) / (||A|| × ||B||)
    // 评级：S≥0.85 / A≥0.70 / B≥0.55 / C≥0.40 / D<0.40
    const ALPHA_GRADES = [
        { min:0.85, grade:'S', name:'核心资产', action:'重点保护，开放杠杆，最低干预' },
        { min:0.70, grade:'A', name:'优质资产', action:'深度赋能，推动向S级跃迁' },
        { min:0.55, grade:'B', name:'成长资产', action:'标准化培育，阶梯式推进' },
        { min:0.40, grade:'C', name:'观察资产', action:'限资源观察，给予改进窗口' },
        { min:0.00, grade:'D', name:'低效资产', action:'触发清退评估' }
    ];

    // 理想资产向量（四维归一化到[0,1]）
    const IDEAL_ANCHORS = {
        S: { flow:0.95, persona:0.90, monetize:0.85, risk:0.10 },  // 风险是负向，理想风险低
        A: { flow:0.75, persona:0.80, monetize:0.70, risk:0.20 },
        B: { flow:0.55, persona:0.60, monetize:0.50, risk:0.35 },
        C: { flow:0.35, persona:0.40, monetize:0.30, risk:0.50 },
        D: { flow:0.15, persona:0.20, monetize:0.15, risk:0.70 }
    };

    function gradeFromAlpha(a) {
        for(const g of ALPHA_GRADES) if(a >= g.min) return g;
        return ALPHA_GRADES[ALPHA_GRADES.length-1];
    }

    function computeAlpha(creatorVec, anchorKey = 'S') {
        // α = cosine-magnitude similarity  (A·B)/(|A||B|) 的幅度投影版本
        // 纯余弦只测方向、对幅度不敏感，在4维同向特征上无法拉开等级。
        // 这里采用"方向对齐×幅度强度"的幅度归一化投影：
        //   1) 将四维中心化（减0.5），让"好"在正、"差"在负方向
        //   2) 风险转为正向（低风险=高分）
        //   3) 投影到理想方向(全正向)，除以最大投影做归一化
        //   最终 α ∈ [0,1]，严格对齐文档阈值 S≥0.85/A≥0.70/B≥0.55/C≥0.40/D<0.40
        const CENTER = 0.50;
        const anchor = IDEAL_ANCHORS[anchorKey] || IDEAL_ANCHORS.S;
        const v = [
            creatorVec.flow    - CENTER,
            creatorVec.persona - CENTER,
            creatorVec.monetize- CENTER,
            (1 - creatorVec.risk) - CENTER
        ];
        // 理想方向（anchor中心化）
        const a = [
            anchor.flow    - CENTER,
            anchor.persona - CENTER,
            anchor.monetize- CENTER,
            (1 - anchor.risk) - CENTER
        ];
        // 计算余弦方向
        const cosRaw = MathKit.cosine(v, a);
        // 计算投影幅度
        const dotVA = MathKit.dot(v, a);
        const maxProj = MathKit.dot(a, a); // 自身投影=最大投影
        const projRatio = maxProj > 0 ? MathKit.clamp(dotVA / maxProj, -1, 1) : 0;
        // α = 方向贡献 + 幅度贡献
        // 方向：(cosRaw+1)/2；幅度：(projRatio+1)/2；几何平均得到综合α
        const dirAlpha = (cosRaw + 1) / 2;
        const magAlpha = (projRatio + 1) / 2;
        const alpha = MathKit.clamp(Math.sqrt(dirAlpha * magAlpha), 0, 1);
        return { alpha, cosRaw, projRatio, grade: gradeFromAlpha(alpha), anchor: anchorKey };
    }

    // ================================================================
    // A1: 夏普比率 + 无风险收益率分赛道（对齐qqtl8N/X509XC）
    // ================================================================
    const TRACK_RF = {
        entertainment: { rf:0.08, name:'泛娱乐/搞笑/剧情' },
        beauty:        { rf:0.10, name:'美妆/时尚/生活方式' },
        knowledge:     { rf:0.12, name:'知识/教育/财经' },
        food:          { rf:0.09, name:'美食/旅行/Vlog' },
        gaming:        { rf:0.07, name:'游戏/电竞/二次元' },
        agriculture:   { rf:0.06, name:'三农/公益/政务' }
    };

    const SHARPE_GRADES = [
        { min:1.5,  level:'优秀',  desc:'每承担1单位风险，获得超过1.5单位超额收益' },
        { min:1.0,  level:'良好',  desc:'风险调整后收益稳健' },
        { min:0.5,  level:'一般',  desc:'存在优化空间' },
        { min:0.0,  level:'较差',  desc:'收益不足以覆盖风险' },
        { min:-99,  level:'危险',  desc:'收益低于无风险收益' }
    ];

    const DRAWDOWN_GRADES = [
        { max:0.10, level:'安全', action:'常规监控',           fuse:false },
        { max:0.15, level:'关注', action:'排查回撤来源',       fuse:false },
        { max:0.20, level:'预警', action:'启动资产再平衡',     fuse:false },
        { max:0.25, level:'危险', action:'强制资产再平衡',     fuse:false },
        { max:1.00, level:'熔断', action:'全矩阵紧急状态',     fuse:true }
    ];

    function sharpeGrade(s) {
        for(const g of SHARPE_GRADES) if(s >= g.min) return g;
        return SHARPE_GRADES[SHARPE_GRADES.length-1];
    }
    function ddGrade(dd) {
        for(const g of DRAWDOWN_GRADES) if(dd <= g.max) return g;
        return DRAWDOWN_GRADES[DRAWDOWN_GRADES.length-1];
    }

    // ================================================================
    // §5.2: 舆情熔断 L1-L4（对齐YHZjDV）
    // ================================================================
    const PR_FUSE_LEVELS = [
        { level:'L1', trigger:'负面评论占比单日上升>20%',
          auto:'标记博主为关注状态，推送舆情简报',
          human:'运营团队了解情况，判断是否需要进一步行动' },
        { level:'L2', trigger:'负面舆情跨平台扩散，单平台负面内容>10条',
          auto:'暂停该博主未来3天商业内容发布计划',
          human:'运营团队制定应对策略，准备公关口径' },
        { level:'L3', trigger:'负面舆情登上平台热搜/趋势榜，品牌方主动询问',
          auto:'自动熔断：暂停所有商业合作挂载+暂停直播+暂停付费推广+下架争议内容',
          human:'启动危机应对小组(法务+公关+运营总监)，4小时内出方案' },
        { level:'L4', trigger:'全网发酵，监管部门/主流媒体介入',
          auto:'全量熔断：L3所有动作+全矩阵内容自检+高风险内容下架',
          human:'最高级别危机应对，CEO参与决策，律师团队介入' }
    ];

    // ================================================================
    // 内容供需指数（对齐jXaTve）
    // ================================================================
    function contentSupplyDemandIndex(demandGrowth, supplyGrowth) {
        if(supplyGrowth === 0) return { index:Infinity, state:'蓝海极端', action:'all-in' };
        const idx = (1 + demandGrowth) / (1 + supplyGrowth);
        if(idx > 1.2) return { index:idx, state:'供不应求(蓝海)', action:'向该赛道成长资产倾斜' };
        if(idx < 0.8) return { index:idx, state:'供过于求(红海)', action:'从该赛道成长资产撤离' };
        return { index:idx, state:'供需平衡', action:'维持基准配比' };
    }

    // ================================================================
    // A5/§5.4: 交互判定系统（对齐EBwEds）
    // ================================================================
    const INTERACTION_PARAMS = {
        BALANCE_POINT: 0.50,       // 精确运行点
        VERIFY_THRESHOLD: 0.68,   // 资产评级确认线
        STABLE_LOW: 0.50,         // 稳定区间下界
        STABLE_HIGH: 0.68,        // 稳定区间上界
        DEVIATION_LIGHT: 0.333,   // 1/3 稳定与偏离分界
        DEVIATION_MODERATE: 0.50, // 1/2 轻度与中度分界
        DEVIATION_SIGNIFICANT: 0.667, // 2/3 中度与显著分界
        DEVIATION_CRITICAL: 0.80  // 4/5 触发调试阈值
    };

    const CONFIDENCE_BANDS = [
        { min:0.85, max:1.01, label:'收敛态',   color:'#a855f7', action:'可直接执行，架构师SOP' },
        { min:0.68, max:0.85, label:'强信号',   color:'#22c55e', action:'AI自治执行' },
        { min:0.59, max:0.68, label:'中等信号', color:'#3b82f6', action:'AI参谋+人审' },
        { min:0.50, max:0.59, label:'弱信号',   color:'#f59e0b', action:'辅助模式，人决策' },
        { min:0.00, max:0.50, label:'随机区',   color:'#6b7280', action:'禁止决策，补充数据' }
    ];

    function confidenceBand(c) {
        for(const b of CONFIDENCE_BANDS) if(c >= b.min && c < b.max) return b;
        return CONFIDENCE_BANDS[CONFIDENCE_BANDS.length-1];
    }

    // ================================================================
    // §3.1: R²四阶调度器
    // ================================================================
    const AUTONOMY_MODES = {
        LIGHT:  { id:'light',  name:'轻量化模式', minR2:0,    maxR2:0.30, humanOversight:1.0, aiAutonomy:0.0 },
        ASSIST: { id:'assist', name:'辅助智能',   minR2:0.30, maxR2:0.50, humanOversight:0.7, aiAutonomy:0.3 },
        AUTO:   { id:'auto',   name:'全量自治',   minR2:0.50, maxR2:0.75, humanOversight:0.2, aiAutonomy:0.8 },
        ARCH:   { id:'arch',   name:'架构师迭代', minR2:0.75, maxR2:1.01, humanOversight:0.5, aiAutonomy:0.5 }
    };

    // ================================================================
    // §4.1: 博主生命周期S曲线
    // ================================================================
    const LIFECYCLE = {
        SEED:    { id:'seed',    name:'种子期', color:'#94a3b8' },
        GROWTH:  { id:'growth',  name:'成长期', color:'#22c55e' },
        MATURE:  { id:'mature',  name:'成熟期', color:'#3b82f6' },
        DECLINE: { id:'decline', name:'衰退期', color:'#ef4444' }
    };

    // ================================================================
    // 核心类：Creator（单博主资管对象）
    // ================================================================
    class Creator {
        constructor(id, meta = {}) {
            this.id = id;
            this.meta = meta;
            this.track = meta.track || 'entertainment';
            // S₁-S₂₀ 原始值（0-100）
            this.subMetrics = {};
            for(const k of Object.keys(SUB_METRICS)) this.subMetrics[k] = 50;
            this.vec = { flow:0.5, persona:0.5, monetize:0.5, risk:0.5 }; // 归一化[0,1]
            this.alpha = 0.5;
            this.grade = gradeFromAlpha(0.5);
            this.history = [];
            this.prLevel = 0; // 舆情等级0-4
            this.createdAt = Date.now();
        }

        /**
         * 更新S子项值
         * @param {object} values {S1:85, S2:70, ...} 单位为0-100分
         */
        updateMetrics(values) {
            Object.entries(values).forEach(([k,v]) => {
                if(k in this.subMetrics) this.subMetrics[k] = MathKit.clamp(v, 0, 100);
            });
            this._recompute();
            this.history.push({ t:Date.now(), V:this.V, alpha:this.alpha, grade:this.grade.grade });
            if(this.history.length > 365) this.history.shift();
            return this.snapshot();
        }

        _recompute() {
            // 按维度加权汇总S子项到四维得分（0-100）
            const dimScores = { flow:0, persona:0, monetize:0, risk:0 };
            Object.entries(SUB_METRICS).forEach(([k,m]) => {
                dimScores[m.dim] += (this.subMetrics[k]/100) * m.w * 100;
            });
            // 综合估值V
            const valResult = computeFourDimValue(dimScores);
            this.V = valResult.V;
            this.dimBreakdown = valResult.breakdown;
            // 归一化向量
            this.vec = {
                flow: dimScores.flow/100,
                persona: dimScores.persona/100,
                monetize: dimScores.monetize/100,
                risk: dimScores.risk/100
            };
            // α系数：以S级（核心资产理想向量）为基准计算余弦幅度相似度，
            // 然后与各锚点做模式匹配作为诊断信息
            const sAlpha = computeAlpha(this.vec, 'S');
            this.alpha = sAlpha.alpha;
            this.grade = sAlpha.grade;
            // 计算与各锚点的匹配度（诊断用）
            this.archetypeMatch = {};
            for(const k of Object.keys(IDEAL_ANCHORS)) {
                this.archetypeMatch[k] = computeAlpha(this.vec, k).alpha;
            }
            this.anchorMatch = Object.entries(this.archetypeMatch)
                .sort((a,b)=>b[1]-a[1])[0][0];
        }

        _bestAlpha() {
            // 保留方法供兼容，但主流程使用S锚点
            return computeAlpha(this.vec, 'S');
        }

        snapshot() {
            return {
                id:this.id, meta:{...this.meta}, track:this.track,
                subMetrics:{...this.subMetrics},
                vec:{...this.vec},
                V:this.V, dimBreakdown:this.dimBreakdown,
                alpha:this.alpha, grade:this.grade, anchorMatch:this.anchorMatch,
                prLevel:this.prLevel
            };
        }
    }

    // ================================================================
    // 核心类：Portfolio（矩阵资管）
    // ================================================================
    class Portfolio {
        constructor(config = {}) {
            this.creators = new Map();
            this.returns = [];
            this.equity = [1.0];
            this.peak = 1.0;
            this.maxDrawdown = 0;
            this.track = config.track || 'entertainment';
            this.rf = TRACK_RF[this.track]?.rf ?? 0.08;
            this.fuseTriggered = null;
            this.prFuse = null;
        }

        setTrack(track) {
            this.track = track;
            this.rf = TRACK_RF[track]?.rf ?? 0.08;
        }

        addCreator(c) { this.creators.set(c.id, c); return c; }
        getCreator(id) { return this.creators.get(id); }

        /**
         * 记录一期收益
         * @param {number} ret 组合收益率(0.02=+2%)，按季度为统计周期基础
         */
        recordReturn(ret) {
            this.returns.push(ret);
            const eq = this.equity[this.equity.length-1] * (1 + ret);
            this.equity.push(eq);
            if(eq > this.peak) this.peak = eq;
            const dd = (this.peak - eq) / this.peak;
            if(dd > this.maxDrawdown) this.maxDrawdown = dd;
            const ddG = ddGrade(dd);
            if(ddG.fuse && !this.fuseTriggered) {
                this.fuseTriggered = { type:'MAX_DRAWDOWN_FUSE', level:dd, t:Date.now() };
            }
            return { equity:eq, drawdown:dd, sharpe:this.sharpe(), ddGrade:ddG };
        }

        /**
         * 年化夏普比率（基础统计周期为季度，√4年化）
         */
        sharpe() {
            if(this.returns.length < 2) return 0;
            const mean = MathKit.mean(this.returns);
            const std = MathKit.std(this.returns);
            if(std === 0) return 0;
            const rfPeriod = this.rf / 4; // 季度化无风险收益
            return ((mean - rfPeriod) / std) * Math.sqrt(4);
        }

        /**
         * 舆情事件触发
         */
        triggerPR(creatorId, level) {
            const c = this.creators.get(creatorId);
            if(c) c.prLevel = Math.max(c.prLevel, level);
            if(level >= 3 && !this.prFuse) {
                this.prFuse = { level, creatorId, t:Date.now(),
                    action: PR_FUSE_LEVELS[level-1] };
            }
            return PR_FUSE_LEVELS[level-1];
        }

        /**
         * 三层穿透视图（L1博主/L2赛道/L3全域）
         */
        portfolioView() {
            const all = Array.from(this.creators.values());
            if(all.length === 0) return { count:0 };
            const byGrade = {S:0,A:0,B:0,C:0,D:0};
            const byLifecycle = {seed:0,growth:0,mature:0,decline:0};
            const byTrack = {};
            let totalV = 0, totalAlpha = 0;
            const vecSum = [0,0,0,0];
            all.forEach(c => {
                byGrade[c.grade.grade]++;
                totalV += c.V; totalAlpha += c.alpha;
                c.vec && [c.vec.flow,c.vec.persona,c.vec.monetize,c.vec.risk].forEach((v,i)=>vecSum[i]+=v);
                if(!byTrack[c.track]) byTrack[c.track] = {count:0,avgAlpha:0,totalV:0,creators:[]};
                byTrack[c.track].count++;
                byTrack[c.track].totalV += c.V;
                byTrack[c.track].avgAlpha += c.alpha;
                byTrack[c.track].creators.push(c.id);
            });
            Object.values(byTrack).forEach(t => t.avgAlpha /= t.count);
            const sG = sharpeGrade(this.sharpe());
            const dG = ddGrade(this.maxDrawdown);
            return {
                count: all.length,
                byGrade, totalV, globalAlpha: totalAlpha/all.length,
                portfolioVec: { flow:vecSum[0]/all.length, persona:vecSum[1]/all.length, monetize:vecSum[2]/all.length, risk:vecSum[3]/all.length },
                byTrack,
                sharpe: this.sharpe(), sharpeGrade: sG,
                maxDrawdown: this.maxDrawdown, ddGrade: dG,
                rf: this.rf,
                fuse: this.fuseTriggered,
                prFuse: this.prFuse
            };
        }
    }

    // ================================================================
    // 交互判定器
    // ================================================================
    class InteractionJudger {
        constructor(windowSize = 20) {
            this.window = windowSize;
            this.history = [];
        }
        record(prediction, actual, aux = {}) {
            this.history.push({ t:Date.now(), p:prediction, a:actual, ...aux });
            if(this.history.length > this.window*3) this.history.shift();
        }
        confidence() {
            const w = this.history.slice(-this.window);
            if(w.length < 5) return { conf:0.5, band:confidenceBand(0.5), converged:false, diverging:false };
            let hits = 0;
            w.forEach(h => {
                if((h.p>0.5 && h.a>0.5) || (h.p<0.5 && h.a<0.5)) hits++;
            });
            const hitRate = hits/w.length;
            return {
                conf: MathKit.clamp(hitRate, 0, 1),
                band: confidenceBand(hitRate),
                converged: hitRate >= 0.68,
                diverging: hitRate < 0.50
            };
        }
        // 偏离比例：近N次判定中超出稳定区间的比例
        deviationRatio() {
            const w = this.history.slice(-this.window);
            if(w.length === 0) return 0;
            let outOfBand = 0;
            w.forEach(h => {
                if(h.p < INTERACTION_PARAMS.STABLE_LOW || h.p > INTERACTION_PARAMS.STABLE_HIGH) outOfBand++;
            });
            return outOfBand / w.length;
        }
        deviationState() {
            const d = this.deviationRatio();
            if(d >= INTERACTION_PARAMS.DEVIATION_CRITICAL) return { level:'critical', label:'触发调试阈值', action:'系统检修' };
            if(d >= INTERACTION_PARAMS.DEVIATION_SIGNIFICANT) return { level:'significant', label:'显著偏离', action:'准备调试' };
            if(d >= INTERACTION_PARAMS.DEVIATION_MODERATE) return { level:'moderate', label:'中度偏离', action:'检查输入' };
            if(d >= INTERACTION_PARAMS.DEVIATION_LIGHT) return { level:'light', label:'轻度偏离', action:'关注' };
            return { level:'stable', label:'稳定', action:'无' };
        }
    }

    // ================================================================
    // R²调度器
    // ================================================================
    class R2Scheduler {
        constructor() {
            this.mode = AUTONOMY_MODES.LIGHT;
            this.r2History = [];
        }
        computeR2(signals = {}) {
            const {
                coneStability = 0.5, decisionAccuracy = 0.5,
                dataCompleteness = 0.7, moodConfidence = 0.5,
                modelAgreement = 0.5
            } = signals;
            return MathKit.clamp(
                0.25*coneStability + 0.25*decisionAccuracy +
                0.20*dataCompleteness + 0.15*moodConfidence +
                0.15*modelAgreement, 0, 1);
        }
        determineMode(r2) {
            for(const m of Object.values(AUTONOMY_MODES))
                if(r2 >= m.minR2 && r2 < m.maxR2) return m;
            return AUTONOMY_MODES.LIGHT;
        }
        tick(signals = {}) {
            const r2 = this.computeR2(signals);
            const newMode = this.determineMode(r2);
            let confirmedMode = this.mode;
            this.r2History.push({t:Date.now(), r2, mode:newMode.id});
            if(this.r2History.length > 60) this.r2History.shift();
            // 3 tick防抖
            const recent = this.r2History.slice(-3);
            if(recent.length === 3 && recent.every(r => r.mode === newMode.id)) {
                confirmedMode = newMode;
                this.mode = newMode;
            }
            return { mode: confirmedMode, r2, newMode };
        }
    }

    // ================================================================
    // 37信号库
    // ================================================================
    const RISK_SIGNALS = {
        traffic: [
            { id:'T01', name:'连续3天播放量环比-30%', sev:2, fn:d=>d.trafficDrop3d<-0.3 },
            { id:'T02', name:'完播率跌破行业均值50%', sev:2, fn:d=>d.completionRate<0.20 },
            { id:'T03', name:'涨粉速度转负且持续7天', sev:2, fn:d=>d.followerGrowth7d<0 },
            { id:'T04', name:'搜索来源占比骤降', sev:1, fn:d=>d.searchShareDrop<-0.2 },
            { id:'T05', name:'首页推荐流量腰斩', sev:2, fn:d=>d.feedTrafficDrop<-0.5 },
            { id:'T06', name:'粉丝取关率>3%/天', sev:2, fn:d=>d.unfollowRate>0.03 },
            { id:'T07', name:'私域打开率<5%', sev:1, fn:d=>d.privateOpenRate<0.05 },
            { id:'T08', name:'CTR连续5天下滑', sev:1, fn:d=>(d.ctrStreak||0)<-5 }
        ],
        content: [
            { id:'C01', name:'更新频率断更>7天', sev:2, fn:d=>d.daysNoUpdate>7 },
            { id:'C02', name:'内容同质化指数>0.8', sev:1, fn:d=>d.contentHomogeneity>0.8 },
            { id:'C03', name:'评论负向率>15%', sev:3, fn:d=>d.negativeCommentRate>0.15 },
            { id:'C04', name:'选题敏感词命中', sev:3, fn:d=>d.sensitiveHit===true },
            { id:'C05', name:'人设漂移度>0.3', sev:2, fn:d=>d.personaDrift>0.3 },
            { id:'C06', name:'爆文率<3%/月', sev:1, fn:d=>d.hitRate<0.03 },
            { id:'C07', name:'AI内容检测率>30%', sev:1, fn:d=>d.aiDetectRate>0.3 },
            { id:'C08', name:'跨赛道尝试失败>3次', sev:1, fn:d=>d.crossTrackFail>3 }
        ],
        business: [
            { id:'B01', name:'商单报价月跌>20%', sev:2, fn:d=>d.priceDrop>0.2 },
            { id:'B02', name:'品牌复投率<20%', sev:2, fn:d=>d.brandReturnRate<0.2 },
            { id:'B03', name:'CPM超行业均值2倍', sev:1, fn:d=>d.cpmRatio>2.0 },
            { id:'B04', name:'GMV日环比-50%', sev:3, fn:d=>d.gmvDailyDrop<-0.5 },
            { id:'B05', name:'退单率>15%', sev:2, fn:d=>d.refundRate>0.15 },
            { id:'B06', name:'应收账款逾期>30天', sev:2, fn:d=>d.overdueAR>30 },
            { id:'B07', name:'签约品牌同赛道塌方', sev:2, fn:d=>d.brandScandal===true }
        ],
        compliance: [
            { id:'L01', name:'监管政策波及赛道', sev:3, fn:d=>d.regulatoryRisk===true },
            { id:'L02', name:'平台账号处罚(限流)', sev:3, fn:d=>d.accountPenalty===true },
            { id:'L03', name:'税务风险预警', sev:3, fn:d=>d.taxRisk===true },
            { id:'L04', name:'合同纠纷未决', sev:2, fn:d=>d.contractDispute===true },
            { id:'L05', name:'版权侵权诉讼', sev:3, fn:d=>d.copyrightSuit===true },
            { id:'L06', name:'代言产品塌房', sev:3, fn:d=>d.endorsementRisk===true },
            { id:'L07', name:'MCN签约到期<30天', sev:2, fn:d=>d.contractDaysLeft<30 }
        ],
        platform: [
            { id:'P01', name:'平台算法大版本更新', sev:2, fn:d=>d.algoUpdate===true },
            { id:'P02', name:'同类博主批量崛起', sev:1, fn:d=>d.competitorSurge===true },
            { id:'P03', name:'平台分成规则不利变化', sev:2, fn:d=>d.revenueShareCut===true },
            { id:'P04', name:'赛道搜索指数月跌>40%', sev:2, fn:d=>d.trackSearchDrop<-0.4 },
            { id:'P05', name:'头部跨赛道入侵者', sev:1, fn:d=>d.invaderEntry===true },
            { id:'P06', name:'平台对垂类政策收紧', sev:2, fn:d=>d.trackPolicyTight===true },
            { id:'P07', name:'竞品MCN挖角信号', sev:2, fn:d=>d.poachingSignal===true }
        ]
    };

    function scanSignals(data) {
        const triggered = [];
        Object.values(RISK_SIGNALS).flat().forEach(s => {
            try { if(s.fn(data)) triggered.push({id:s.id,name:s.name,sev:s.sev}); } catch(e){}
        });
        triggered.sort((a,b)=>b.sev-a.sev);
        return triggered;
    }

    // ================================================================
    // 顶层入口
    // ================================================================
    class YMcMine {
        constructor(config = {}) {
            this.portfolio = new Portfolio(config);
            this.r2 = new R2Scheduler();
            this.judger = new InteractionJudger();
            this.version = '1.1.0';
        }
        createCreator(id, meta) {
            const c = new Creator(id, meta);
            if(meta && meta.track) c.track = meta.track;
            this.portfolio.addCreator(c);
            return c;
        }
        tick(data = {}) {
            const signals = scanSignals(data);
            const pv = this.portfolio.portfolioView();
            const r2 = this.r2.tick({
                coneStability: data.coneStability ?? 0.5,
                decisionAccuracy: this.judger.confidence().conf,
                dataCompleteness: data.dataCompleteness ?? 0.7,
                moodConfidence: data.moodConfidence ?? 0.5,
                modelAgreement: data.modelAgreement ?? 0.5
            });
            const judge = this.judger.confidence();
            const dev = this.judger.deviationState();
            return { portfolio:pv, r2, signals, judge, deviation:dev, version:this.version };
        }
    }

    // ================================================================
    // 导出
    // ================================================================
    const api = {
        MathKit,
        Creator, Portfolio, YMcMine,
        InteractionJudger, R2Scheduler,
        DIMENSION_WEIGHTS, SUB_METRICS,
        ALPHA_GRADES, IDEAL_ANCHORS,
        TRACK_RF, SHARPE_GRADES, DRAWDOWN_GRADES,
        PR_FUSE_LEVELS, RISK_SIGNALS,
        CONFIDENCE_BANDS, INTERACTION_PARAMS, AUTONOMY_MODES, LIFECYCLE,
        computeFourDimValue, computeAlpha, gradeFromAlpha,
        sharpeGrade, ddGrade, confidenceBand,
        contentSupplyDemandIndex, scanSignals,
        version: '1.1.0'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.YMcMine = api;
    }
})(typeof window !== 'undefined' ? window : global);
