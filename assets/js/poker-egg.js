/**
 * Y.Mine · Poker Egg Engine (里层 / Core Engine)
 *
 * 德州扑克彩蛋·表理映射引擎
 * 纯数学/纯逻辑层，无DOM依赖，Node/Browser双兼容。
 *
 * 三层职责严格分离：
 *   1. PokerProbability  —— 德州扑克胜率/赔率蒙特卡洛计算
 *   2. KellyMapper       —— (p,b,q)→f* 凯利公式双核驱动
 *   3. ConeFieldBridge   —— 牌局状态→圆锥博弈场的表理映射
 *   4. PokerEggEngine    —— 整合门面（Facade），对外统一API
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.YMinePokerEgg = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    'use strict';

    // ================================================================
    // 扑克基础：牌组、牌型评估
    // ================================================================
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const RANK_VALUE = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };

    function createDeck() {
        const deck = [];
        for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s, value: RANK_VALUE[r] });
        return deck;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function cardKey(c) { return c.rank + c.suit; }

    /**
     * 7张牌评估 → 返回 { rank: [1..9], tiebreakers: [...] }
     * rank: 9=同花顺, 8=四条, 7=葫芦, 6=同花, 5=顺子, 4=三条, 3=两对, 2=一对, 1=高牌
     * 简化但覆盖标准德州扑克所有牌型（足以用于胜率蒙特卡洛）
     */
    function evaluate7(cards) {
        const all = cards.slice().sort((a, b) => b.value - a.value);
        const all5 = choose7(all);
        let best = { rank: 0, tiebreakers: [] };
        for (const five of all5) {
            const ev = evaluate5(five);
            if (compareHand(ev, best) > 0) best = ev;
        }
        return best;
    }

    function choose7(cards) {
        const res = [];
        for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
            const five = [];
            for (let k = 0; k < 7; k++) if (k !== i && k !== j) five.push(cards[k]);
            res.push(five);
        }
        return res;
    }

    function evaluate5(cards) {
        const vals = cards.map(c => c.value).sort((a, b) => b - a);
        const suits = cards.map(c => c.suit);
        const vcount = {};
        vals.forEach(v => vcount[v] = (vcount[v] || 0) + 1);
        const counts = Object.entries(vcount).map(([v, c]) => ({ v: +v, c })).sort((a, b) => b.c - a.c || b.v - a.v);

        const isFlush = suits.every(s => s === suits[0]);
        const unique = [...new Set(vals)].sort((a, b) => b - a);
        let isStraight = false;
        let straightHigh = 0;
        if (unique.length === 5) {
            if (unique[0] - unique[4] === 4) { isStraight = true; straightHigh = unique[0]; }
            else if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) { isStraight = true; straightHigh = 5; }
        }

        if (isFlush && isStraight) {
            const royal = straightHigh === 14;
            return { rank: royal ? 9 : 8, tiebreakers: [straightHigh] };
        }
        if (counts[0].c === 4) return { rank: 7, tiebreakers: [counts[0].v, counts[1].v] };
        if (counts[0].c === 3 && counts[1].c === 2) return { rank: 6, tiebreakers: [counts[0].v, counts[1].v] };
        if (isFlush) return { rank: 5, tiebreakers: vals };
        if (isStraight) return { rank: 4, tiebreakers: [straightHigh] };
        if (counts[0].c === 3) return { rank: 3, tiebreakers: [counts[0].v, ...counts.slice(1).map(x => x.v)] };
        if (counts[0].c === 2 && counts[1].c === 2) return { rank: 2, tiebreakers: [counts[0].v, counts[1].v, counts[2].v] };
        if (counts[0].c === 2) return { rank: 1, tiebreakers: [counts[0].v, ...counts.slice(1).map(x => x.v)] };
        return { rank: 0, tiebreakers: vals };
    }

    function compareHand(a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
            const av = a.tiebreakers[i] || 0, bv = b.tiebreakers[i] || 0;
            if (av !== bv) return av - bv;
        }
        return 0;
    }

    // ================================================================
    // 模块1：PokerProbability —— 蒙特卡洛胜率计算器
    // ================================================================
    class PokerProbability {
        constructor(simulations = 1500) {
            this.simulations = simulations;
        }

        /**
         * 计算胜率/平局/败率 + 底池赔率
         * @param {Array} hole       手牌 [{rank,suit}, ...] (0/2张)
         * @param {Array} board      公共牌 (0/3/4/5张)
         * @param {number} potSize   当前底池
         * @param {number} toCall    需要跟注的金额
         * @returns {{ win, tie, lose, potOdds, equity, expectedValue, handStrength }}
         */
        simulate(hole, board, potSize = 0, toCall = 0) {
            const nNeed = 5 - board.length;
            const known = new Set([...hole, ...board].map(cardKey));

            let wins = 0, ties = 0, losses = 0;
            let bestRankSum = 0;

            for (let i = 0; i < this.simulations; i++) {
                const deck = createDeck().filter(c => !known.has(cardKey(c)));
                const dealt = shuffle(deck);
                const myBoard = board.concat(dealt.slice(0, nNeed));
                const oppHole = dealt.slice(nNeed, nNeed + 2);

                const myHand = evaluate7(hole.concat(myBoard));
                const oppHand = evaluate7(oppHole.concat(myBoard));
                const cmp = compareHand(myHand, oppHand);
                if (cmp > 0) wins++;
                else if (cmp === 0) ties++;
                else losses++;
                bestRankSum += myHand.rank;
            }

            const total = this.simulations;
            const win = wins / total;
            const tie = ties / total;
            const lose = losses / total;
            const equity = win + tie * 0.5;
            const potOdds = toCall > 0 ? toCall / (potSize + toCall) : 0;
            const ev = equity * (potSize + toCall) - (1 - equity) * toCall;
            const avgRank = bestRankSum / total;

            return {
                win, tie, lose,
                equity,
                potOdds,
                expectedValue: ev,
                handStrength: Math.min(1, avgRank / 8.5),
                simulations: total,
                shouldCall: equity > potOdds && toCall > 0
            };
        }
    }

    // ================================================================
    // 模块2：KellyMapper —— 胜率/赔率→凯利最优f*
    // ================================================================
    class KellyMapper {
        /**
         * 凯利公式（Y.Mine版本：f* = p - q/b）
         * @param {number} p 胜率
         * @param {number} b 净赔率 b = (pot / toCall)
         * @param {number} fraction 半凯利系数(0.5默认)
         * @returns {{f_star, q, b, edge, kellyAction}}
         */
        static compute(p, b, fraction = 0.5) {
            const q = 1 - p;
            let f_star = 0;
            if (b > 0 && p > 0) {
                f_star = p - q / b;
            }
            f_star = Math.max(0, Math.min(1, f_star * fraction));
            const edge = p * b - q;
            let action = 'FOLD';
            if (f_star <= 0) action = 'FOLD';
            else if (f_star < 0.15) action = 'CALL_SMALL';
            else if (f_star < 0.35) action = 'RAISE';
            else if (f_star < 0.6) action = 'BIG_BET';
            else action = 'ALL_IN';

            return { f_star, p, q, b, edge, fraction, action };
        }

        /**
         * 筹码映射：筹码量→TAC总预算，下注→单次营销投放
         */
        static mapToBudget(stack, bet, totalTAC) {
            const betRatio = stack > 0 ? bet / stack : 0;
            const marketingSpend = totalTAC * betRatio;
            const leverage = betRatio * 2;
            return { stack, bet, betRatio, marketingSpend, leverage };
        }
    }

    // ================================================================
    // 模块3：ConeFieldBridge —— 表理映射核心（扑克→圆锥博弈）
    // ================================================================
    class ConeFieldBridge {
        constructor() {
            this.gtMap = this._buildGTMap();
        }

        /**
         * 手牌组合 → Ground Truth引力中心
         * 哲学：底牌是"你知道但市场不知道"的信息优势（Information Edge）
         * 牌力越强 → 内在价值越高 → GT上移(多头)；牌力越弱 → GT下移(空头)
         */
        _buildGTMap() {
            const map = {};
            for (const r1 of RANKS) for (const r2 of RANKS) {
                for (const suited of [true, false]) {
                    const key = this._holeKey(r1, r2, suited);
                    const v1 = RANK_VALUE[r1], v2 = RANK_VALUE[r2];
                    const high = Math.max(v1, v2), low = Math.min(v1, v2);
                    const pair = (r1 === r2);
                    const gap = high - low;
                    let strength = 0;
                    if (pair) {
                        strength = 0.50 + (high - 2) / 12 * 0.45;
                    } else {
                        strength = 0.28 + (high - 2) / 12 * 0.28;
                        if (suited) strength += 0.08;
                        if (gap <= 1) strength += 0.05;
                        else if (gap <= 3) strength += 0.02;
                        else strength -= (gap - 3) * 0.03;
                    }
                    strength = Math.max(0.30, Math.min(0.85, strength));
                    map[key] = strength;
                }
            }
            return map;
        }

        _holeKey(r1, r2, suited) {
            const hi = RANK_VALUE[r1] >= RANK_VALUE[r2] ? r1 : r2;
            const lo = RANK_VALUE[r1] >= RANK_VALUE[r2] ? r2 : r1;
            return hi + lo + (suited ? 's' : 'o');
        }

        holeToGroundTruth(hole) {
            if (!hole || hole.length < 2) return 0.68;
            const suited = hole[0].suit === hole[1].suit;
            const key = this._holeKey(hole[0].rank, hole[1].rank, suited);
            return this.gtMap[key] || 0.68;
        }

        /**
         * 牌局阶段 → 圆锥博弈状态（CALM/TENSION/EXTREME/BLACK_SWAN）
         * preflop=平静期, flop=张力, turn=极端, river(ALL-IN)=黑天鹅
         */
        stageToConeState(stage, action) {
            const base = { preflop: 'calm', flop: 'tension', turn: 'extreme', river: 'black_swan', showdown: 'meltdown' }[stage] || 'calm';
            if (action === 'ALL_IN') return 'meltdown';
            if (action === 'BIG_BET' && (stage === 'turn' || stage === 'river')) return 'black_swan';
            return base;
        }

        /**
         * 牌局结果 → σ冲击注入强度（影响圆锥波动）
         */
        resultToShock(pnlInBB) {
            const abs = Math.abs(pnlInBB);
            if (abs > 50) return pnlInBB > 0 ? +2.0 : -2.5;
            if (abs > 20) return pnlInBB > 0 ? +1.0 : -1.2;
            if (abs > 5)  return pnlInBB > 0 ? +0.4 : -0.5;
            return 0;
        }

        /**
         * 反脆弱γ：翻牌后/ALL-IN时自动提升对冲
         */
        computeGamma(stage, action) {
            if (action === 'ALL_IN') return 0.20;
            if (stage === 'river') return 0.12;
            if (stage === 'turn') return 0.06;
            if (stage === 'flop') return 0.02;
            return 0;
        }

        /**
         * 结算→品牌圆柱体积积累规则：
         * 稳态(CALM)且盈利→h+0.01（V=πr²h复利），否则冻结
         */
        shouldAccumulateBrand(stage, pnl) {
            return stage === 'preflop' ? false : (pnl > 0 && stage !== 'showdown');
        }
    }

    // ================================================================
    // 模块4：PokerEggEngine —— 门面（Facade）
    // ================================================================
    class PokerEggEngine {
        constructor(config = {}) {
            this.simulations = config.simulations || 1500;
            this.bigBlind = config.bigBlind || 10;
            this.startingStack = config.startingStack || 1000;
            this.totalTAC = config.totalTAC || 100000;
            this.kellyFraction = config.kellyFraction || 0.5;

            this.prob = new PokerProbability(this.simulations);
            this.bridge = new ConeFieldBridge();
            this.reset();
        }

        reset() {
            this.hole = [];
            this.board = [];
            this.stage = 'preflop';
            this.pot = this.bigBlind * 1.5;
            this.toCall = this.bigBlind;
            this.stack = this.startingStack;
            this.currentBet = 0;
            this.lastAction = null;
            this.history = [];
            this.handsPlayed = 0;
            this.totalPnL = 0;
            this.runningWinRate = 0.50;
            this.wins = 0;
            this.kellyState = { f_star: 0, action: 'FOLD' };
            this.dcfConstraintPassed = true;
        }

        /**
         * 发手牌（hole cards）→ 同步计算GT引力中心
         */
        dealHole(cards) {
            if (cards && cards.length === 2) {
                this.hole = cards;
            } else {
                const deck = shuffle(createDeck());
                this.hole = [deck[0], deck[1]];
            }
            this.stage = 'preflop';
            this.pot = this.bigBlind * 1.5;
            this.toCall = this.bigBlind;
            this._updateProbability();
            this._publish();
            return { hole: this.hole, gt: this.getGroundTruth(), odds: this.getOdds(), kelly: this.kellyState };
        }

        dealFlop(cards) {
            if (cards && cards.length === 3) {
                this.board = cards;
            } else {
                const known = new Set(this.hole.map(cardKey));
                const deck = shuffle(createDeck().filter(c => !known.has(cardKey(c))));
                this.board = [deck[0], deck[1], deck[2]];
            }
            this.stage = 'flop';
            this._updateProbability();
            this._publish();
            return this._snapshot();
        }

        dealTurn(card) {
            if (card) {
                this.board.push(card);
            } else {
                const known = new Set([...this.hole, ...this.board].map(cardKey));
                const deck = shuffle(createDeck().filter(c => !known.has(cardKey(c))));
                this.board.push(deck[0]);
            }
            this.stage = 'turn';
            this._updateProbability();
            this._publish();
            return this._snapshot();
        }

        dealRiver(card) {
            if (card) {
                this.board.push(card);
            } else {
                const known = new Set([...this.hole, ...this.board].map(cardKey));
                const deck = shuffle(createDeck().filter(c => !known.has(cardKey(c))));
                this.board.push(deck[0]);
            }
            this.stage = 'river';
            this._updateProbability();
            this._publish();
            return this._snapshot();
        }

        /**
         * 玩家动作：FOLD / CHECK / CALL / RAISE(amount) / ALL_IN
         */
        act(action, amount = 0) {
            this.lastAction = action;
            let betAmount = 0;
            switch (action) {
                case 'FOLD':
                    return this._settle(-this.currentBet);
                case 'CHECK':
                    betAmount = 0; break;
                case 'CALL':
                    betAmount = Math.min(this.toCall, this.stack);
                    this.stack -= betAmount;
                    this.pot += betAmount;
                    this.currentBet += betAmount;
                    break;
                case 'RAISE':
                    betAmount = Math.min(amount + this.toCall, this.stack);
                    this.stack -= betAmount;
                    this.pot += betAmount;
                    this.toCall = amount;
                    this.currentBet += betAmount;
                    break;
                case 'ALL_IN':
                    betAmount = this.stack;
                    this.pot += betAmount;
                    this.currentBet += betAmount;
                    this.stack = 0;
                    break;
            }
            this.history.push({ action, amount: betAmount, stage: this.stage, pot: this.pot, stack: this.stack });

            if (action === 'ALL_IN') {
                return this._settle(betAmount * 2 * (Math.random() > (1 - this.kellyState.p) ? 1 : -1));
            }

            this._updateProbability();
            this._publish();
            return this._snapshot();
        }

        /**
         * 结算：牌局结束，PnL→圆锥博弈冲击
         */
        _settle(rawPnL) {
            const pnl = Math.round(rawPnL);
            const won = pnl > 0;
            if (won) this.wins++;
            this.totalPnL += pnl;
            this.handsPlayed++;
            this.runningWinRate = this.handsPlayed > 0 ? this.wins / this.handsPlayed : 0.5;
            this.stage = 'showdown';

            const pnlInBB = pnl / this.bigBlind;
            const shock = this.bridge.resultToShock(pnlInBB);
            const coneState = this.bridge.stageToConeState('showdown', this.lastAction);
            const gamma = this.bridge.computeGamma(this.stage, this.lastAction);
            const brandIncrement = this.bridge.shouldAccumulateBrand(this.stage, pnl) ? 0.01 : 0;

            const result = {
                handOver: true,
                pnl,
                pnlInBB,
                won,
                coneState,
                injectedShock: shock,
                antiFragilityGamma: gamma,
                brandVolumeIncrement: brandIncrement,
                gtAdjustment: Math.max(-0.08, Math.min(0.08, pnlInBB * 0.002)),
                kellyAdjustment: Math.max(-0.15, Math.min(0.15, (this.runningWinRate - 0.5) * 0.3)),
                snapshot: this._snapshot()
            };
            this._publishSettle(result);
            this.lastAction = 'SETTLED';
            return result;
        }

        /**
         * DCF估值约束：如果底池赔率击穿内在价值(equity<potOdds×1.2)，禁止ALL-IN
         */
        checkDCFConstraint(odds) {
            if (!odds) return { allowed: true, reason: '' };
            const requiredEquity = odds.potOdds * 1.2;
            if (odds.equity < requiredEquity) {
                this.dcfConstraintPassed = false;
                return {
                    allowed: false,
                    reason: `DCF熔断: equity=${(odds.equity*100).toFixed(1)}% < required=${(requiredEquity*100).toFixed(1)}%`,
                    requiredEquity,
                    equity: odds.equity
                };
            }
            this.dcfConstraintPassed = true;
            return { allowed: true, reason: 'DCF估值安全边际充足' };
        }

        _updateProbability() {
            const odds = this.prob.simulate(this.hole, this.board, this.pot, this.toCall);
            const netOdds = this.toCall > 0 ? (this.pot / this.toCall) : 1;
            this.kellyState = KellyMapper.compute(odds.equity, netOdds, this.kellyFraction);
            this.odds = odds;
        }

        getGroundTruth() {
            return this.bridge.holeToGroundTruth(this.hole);
        }

        getOdds() {
            return this.odds || { win: 0, tie: 0, lose: 1, equity: 0, potOdds: 0, expectedValue: 0, handStrength: 0 };
        }

        getBudgetMap() {
            return KellyMapper.mapToBudget(this.startingStack, this.currentBet, this.totalTAC);
        }

        getConeContext() {
            return {
                stage: this.stage,
                state: this.bridge.stageToConeState(this.stage, this.lastAction),
                gt: this.getGroundTruth(),
                gamma: this.bridge.computeGamma(this.stage, this.lastAction),
                kellyFraction: this.kellyState.f_star,
                shock: this.lastAction === 'ALL_IN' ? (this.kellyState.p > 0.6 ? +1.5 : -2.0) : 0
            };
        }

        _snapshot() {
            return {
                hole: this.hole.slice(),
                board: this.board.slice(),
                stage: this.stage,
                pot: this.pot,
                toCall: this.toCall,
                stack: this.stack,
                currentBet: this.currentBet,
                lastAction: this.lastAction,
                odds: this.getOdds(),
                kelly: this.kellyState,
                gt: this.getGroundTruth(),
                cone: this.getConeContext(),
                budget: this.getBudgetMap(),
                dcfConstraint: this.dcfConstraintPassed,
                handsPlayed: this.handsPlayed,
                totalPnL: this.totalPnL,
                runningWinRate: this.runningWinRate
            };
        }

        _publish() {
            if (typeof this.onUpdate === 'function') this.onUpdate(this._snapshot());
            if (typeof document !== 'undefined' && document.dispatchEvent) {
                const ev = new CustomEvent('poker-egg-update', { detail: this._snapshot() });
                document.dispatchEvent(ev);
            }
        }

        _publishSettle(result) {
            if (typeof this.onSettle === 'function') this.onSettle(result);
            if (typeof document !== 'undefined' && document.dispatchEvent) {
                const ev = new CustomEvent('poker-egg-settle', { detail: result });
                document.dispatchEvent(ev);
            }
        }
    }

    return {
        PokerProbability,
        KellyMapper,
        ConeFieldBridge,
        PokerEggEngine,
        SUITS, RANKS, RANK_VALUE,
        createDeck, shuffle, cardKey,
        evaluate7,
        version: '2.0.0'
    };
}));
