/**
 * Y.Mine Investment Banking Valuation Engine
 * 投行级标准估值与资本运作底层模型
 *
 * Modules:
 *   1. DCF & NPV / IRR / WACC / Terminal Value
 *   2. Capital Budgeting (项目排序与资本分配)
 *   3. Real Options (Black-Scholes变体: 等待/扩张/放弃期权)
 *   4. Bond Valuation & Equity Relative Valuation (P/E, P/B)
 *
 * 纯数学引擎 · 无DOM依赖 · Node.js/Browser双兼容
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.YMineValuation = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    'use strict';

    // ================================================================
    // 数学工具
    // ================================================================
    const MathUtils = {
        normCDF(x) {
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
            const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const sign = x < 0 ? -1 : 1;
            x = Math.abs(x) / Math.sqrt(2);
            const t = 1.0 / (1.0 + p * x);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            return 0.5 * (1.0 + sign * y);
        },
        normPDF(x) {
            return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        },
        npv(rate, cashflows) {
            return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
        },
        irr(cashflows, guess = 0.1) {
            let rate = guess;
            for (let i = 0; i < 100; i++) {
                const npvVal = MathUtils.npv(rate, cashflows);
                const delta = 1e-6;
                const derivative = (MathUtils.npv(rate + delta, cashflows) - npvVal) / delta;
                if (Math.abs(derivative) < 1e-12) break;
                const newRate = rate - npvVal / derivative;
                if (Math.abs(newRate - rate) < 1e-8) return newRate;
                rate = newRate;
                if (rate < -0.99) rate = -0.99;
            }
            return rate;
        }
    };

    // ================================================================
    // 模块1：DCF 现金流折现引擎
    // ================================================================
    class DCFEngine {
        constructor(config = {}) {
            this.config = Object.assign({
                riskFreeRate: 0.035,
                marketRiskPremium: 0.06,
                taxRate: 0.25,
                beta: 1.0,
                costOfDebt: 0.06,
                debtToCapital: 0.30,
                projectionYears: 5,
                terminalGrowth: 0.025,
                tvMethod: 'gordon'
            }, config);
        }

        calculateWACC() {
            const c = this.config;
            const costOfEquity = c.riskFreeRate + c.beta * c.marketRiskPremium;
            const afterTaxCostOfDebt = c.costOfDebt * (1 - c.taxRate);
            const wacc = (1 - c.debtToCapital) * costOfEquity + c.debtToCapital * afterTaxCostOfDebt;
            return {
                costOfEquity,
                afterTaxCostOfDebt,
                equityWeight: 1 - c.debtToCapital,
                debtWeight: c.debtToCapital,
                wacc
            };
        }

        projectFCF(baseFCF, growthRate, years = null) {
            const n = years || this.config.projectionYears;
            const fcfs = [-baseFCF * 0];
            let fcf = baseFCF;
            for (let t = 1; t <= n; t++) {
                fcf = fcf * (1 + growthRate);
                fcfs.push(fcf);
            }
            return fcfs;
        }

        projectFCFDetailed(baseRevenue, ebitdaMargin, depreciationRate, capexRate, nwcChangeRate, growthRate) {
            const n = this.config.projectionYears;
            const fcfs = [-0];
            let rev = baseRevenue;
            for (let t = 1; t <= n; t++) {
                rev = rev * (1 + growthRate);
                const ebitda = rev * ebitdaMargin;
                const da = rev * depreciationRate;
                const ebit = ebitda - da;
                const nopat = ebit * (1 - this.config.taxRate);
                const capex = rev * capexRate;
                const nwc = rev * nwcChangeRate;
                const fcf = nopat + da - capex - nwc;
                fcfs.push(fcf);
            }
            return {
                revenues: Array.from({ length: n }, (_, i) => baseRevenue * Math.pow(1 + growthRate, i + 1)),
                fcfs
            };
        }

        calculateTerminalValue(finalFCF) {
            const g = this.config.terminalGrowth;
            const { wacc } = this.calculateWACC();
            const MIN_SPREAD = 0.03;
            if (wacc <= g) {
                const fallbackTV = finalFCF * (this.config.tvExitMultiple || 10);
                return { tv: fallbackTV, method: 'exit_multiple_fallback', warning: 'WACC <= g: forced exit multiple fallback', forcedExitMultiple: this.config.tvExitMultiple || 10 };
            }
            if (wacc - g < MIN_SPREAD) {
                const safeG = Math.max(-0.02, wacc - MIN_SPREAD);
                const tv = finalFCF * (1 + safeG) / MIN_SPREAD;
                return {
                    tv,
                    method: 'gordon_spread_capped',
                    finalFCF,
                    g: safeG,
                    originalG: g,
                    wacc,
                    warning: `WACC-g spread (${((wacc - g) * 100).toFixed(1)}%) < 3% hard floor: g capped to ${(safeG * 100).toFixed(1)}%`
                };
            }
            let tv;
            if (this.config.tvMethod === 'gordon') {
                tv = finalFCF * (1 + g) / (wacc - g);
            } else {
                tv = finalFCF * this.config.tvExitMultiple || finalFCF * 10;
            }
            return {
                tv,
                method: this.config.tvMethod,
                finalFCF,
                g,
                wacc
            };
        }

        value(baseFCF, growthRate, initialInvestment = 0) {
            const waccResult = this.calculateWACC();
            const wacc = waccResult.wacc;
            const fcfs = this.projectFCF(baseFCF, growthRate);
            fcfs[0] = -initialInvestment;
            const finalFCF = fcfs[fcfs.length - 1];
            const tvResult = this.calculateTerminalValue(finalFCF);
            const tv = tvResult.tv;

            let pvFCF = 0;
            for (let t = 1; t < fcfs.length; t++) {
                pvFCF += fcfs[t] / Math.pow(1 + wacc, t);
            }
            const pvTV = tv / Math.pow(1 + wacc, fcfs.length - 1);
            const enterpriseValue = pvFCF + pvTV;
            const npv = enterpriseValue - initialInvestment;
            const allCashflows = [...fcfs];
            allCashflows[allCashflows.length - 1] += tv;
            const irr = MathUtils.irr(allCashflows);
            const MOS_CALM = 0.25;
            const maxBid = enterpriseValue * (1 - MOS_CALM);

            return {
                method: 'DCF',
                wacc: waccResult,
                cashflows: fcfs,
                pvOfFCF: pvFCF,
                terminalValue: tvResult,
                pvOfTerminalValue: pvTV,
                enterpriseValue,
                initialInvestment,
                npv,
                irr,
                paybackPeriod: this._paybackPeriod(fcfs),
                profitabilityIndex: pvFCF / Math.max(initialInvestment, 1),
                marginOfSafety: MOS_CALM,
                maxBid,
                spreadWaccMinusG: waccResult.wacc - tvResult.g
            };
        }

        _paybackPeriod(fcfs) {
            let cumulative = fcfs[0];
            for (let t = 1; t < fcfs.length; t++) {
                cumulative += fcfs[t];
                if (cumulative >= 0) {
                    const prevCum = cumulative - fcfs[t];
                    return t - 1 + Math.abs(prevCum) / fcfs[t];
                }
            }
            return Infinity;
        }
    }

    // ================================================================
    // 模块2：资本预算 Capital Budgeting
    // ================================================================
    class CapitalBudgeting {
        constructor(totalCapital) {
            this.totalCapital = totalCapital;
            this.projects = [];
        }

        addProject(project) {
            const p = Object.assign({
                id: 'P' + (this.projects.length + 1),
                name: 'Project-' + (this.projects.length + 1),
                initialInvestment: 0,
                npv: 0,
                irr: 0,
                paybackPeriod: Infinity,
                probabilityOfSuccess: 1.0,
                riskLevel: 1
            }, project);
            p.adjustedNPV = p.npv * p.probabilityOfSuccess;
            p.pi = p.npv / Math.max(p.initialInvestment, 1);
            this.projects.push(p);
            return p;
        }

        addProjectFromDCF(dcfResult, meta = {}) {
            return this.addProject(Object.assign({
                name: meta.name || 'DCF-Project',
                initialInvestment: dcfResult.initialInvestment,
                npv: dcfResult.npv,
                irr: dcfResult.irr,
                paybackPeriod: dcfResult.paybackPeriod
            }, meta));
        }

        rankBy(metric = 'npv') {
            const sorted = [...this.projects].sort((a, b) => {
                if (metric === 'irr') return b.irr - a.irr;
                if (metric === 'pi') return b.pi - a.pi;
                if (metric === 'payback') return a.paybackPeriod - b.paybackPeriod;
                return b.adjustedNPV - a.adjustedNPV;
            });
            return sorted;
        }

        optimalAllocation(method = 'pi_rank') {
            const ranked = this.rankBy(method === 'irr' ? 'irr' : 'pi');
            let remaining = this.totalCapital;
            const allocation = [];
            let totalNPV = 0;
            const rejected = [];

            for (const p of ranked) {
                if (p.npv <= 0) { rejected.push({ project: p, reason: 'NPV≤0' }); continue; }
                if (p.irr < 0.08) { rejected.push({ project: p, reason: 'IRR<hurdle' }); continue; }
                if (remaining >= p.initialInvestment) {
                    allocation.push({
                        project: p,
                        capitalAllocated: p.initialInvestment,
                        pctOfCapital: p.initialInvestment / this.totalCapital
                    });
                    remaining -= p.initialInvestment;
                    totalNPV += p.adjustedNPV;
                } else if (remaining > 0 && p.divisible !== false) {
                    const fraction = remaining / p.initialInvestment;
                    allocation.push({
                        project: p,
                        capitalAllocated: remaining,
                        fraction,
                        pctOfCapital: remaining / this.totalCapital,
                        partialNPV: p.adjustedNPV * fraction
                    });
                    totalNPV += p.adjustedNPV * fraction;
                    remaining = 0;
                } else {
                    rejected.push({ project: p, reason: 'insufficient_capital' });
                }
            }

            return {
                totalCapital: this.totalCapital,
                deployedCapital: this.totalCapital - remaining,
                remainingCapital: remaining,
                deploymentRate: (this.totalCapital - remaining) / this.totalCapital,
                totalExpectedNPV: totalNPV,
                portfolioIRR: this._portfolioIRR(allocation),
                allocations: allocation,
                rejected
            };
        }

        _portfolioIRR(allocation) {
            let totalInv = 0, totalNPV = 0;
            for (const a of allocation) {
                const inv = a.capitalAllocated;
                totalInv += inv;
                totalNPV += (a.partialNPV !== undefined ? a.partialNPV : a.project.adjustedNPV);
            }
            return totalInv > 0 ? totalNPV / totalInv : 0;
        }
    }

    // ================================================================
    // 模块3：实物期权 Real Options (Black-Scholes变体)
    // ================================================================
    class RealOptions {
        constructor(config = {}) {
            this.config = Object.assign({
                riskFreeRate: 0.035,
                sigma: 0.30
            }, config);
        }

        _blackScholes(S, K, T, sigma = null, r = null, q = 0) {
            sigma = sigma || this.config.sigma;
            r = r || this.config.riskFreeRate;
            if (T <= 0 || sigma <= 0) {
                return { call: Math.max(0, S - K), put: Math.max(0, K - S), d1: 0, d2: 0 };
            }
            const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
            const d2 = d1 - sigma * Math.sqrt(T);
            const Nd1 = MathUtils.normCDF(d1);
            const Nd2 = MathUtils.normCDF(d2);
            const call = S * Math.exp(-q * T) * Nd1 - K * Math.exp(-r * T) * Nd2;
            const put = K * Math.exp(-r * T) * MathUtils.normCDF(-d2) - S * Math.exp(-q * T) * MathUtils.normCDF(-d1);
            return { call, put, d1, d2, Nd1, Nd2 };
        }

        optionToWait(S, K, T, sigma = null) {
            const bs = this._blackScholes(S, K, T, sigma);
            return {
                type: 'WAIT_OPTION',
                underlying: S,
                strike: K,
                timeToMaturity: T,
                optionValue: bs.call,
                staticNPV: S - K,
                strategicNPV: Math.max(0, S - K) + bs.put,
                valueOfWaiting: bs.put,
                optimalToExercise: bs.call === 0 && S > K,
                optimalToWait: bs.put > bs.call
            };
        }

        optionToExpand(currentValue, expansionCost, expansionFactor, T, sigma = null) {
            const S = currentValue * (expansionFactor - 1);
            const K = expansionCost;
            const bs = this._blackScholes(S, K, T, sigma);
            return {
                type: 'EXPANSION_OPTION',
                currentValue,
                expansionCost,
                expansionFactor,
                callOptionValue: bs.call,
                staticNPV: currentValue - 0,
                strategicNPV: currentValue + bs.call,
                expandNow: S > K && bs.d1 > 0.5,
                waitToExpand: bs.call > (S - K)
            };
        }

        optionToAbandon(currentValue, salvageValue, T, sigma = null) {
            const bs = this._blackScholes(currentValue, salvageValue, T, sigma);
            return {
                type: 'ABANDONMENT_OPTION',
                currentValue,
                salvageValue,
                putOptionValue: bs.put,
                staticNPV: currentValue,
                strategicNPV: currentValue + bs.put,
                abandonNow: currentValue < salvageValue,
                floorValue: salvageValue * Math.exp(-this.config.riskFreeRate * T)
            };
        }

        compoundOptionValue(NPV, waitOpt, expandOpt, abandonOpt) {
            return {
                staticNPV: NPV,
                waitValue: waitOpt ? waitOpt.valueOfWaiting : 0,
                expansionValue: expandOpt ? expandOpt.callOptionValue : 0,
                abandonmentValue: abandonOpt ? abandonOpt.putOptionValue : 0,
                expandedNPV: NPV
                    + (waitOpt ? waitOpt.valueOfWaiting : 0)
                    + (expandOpt ? expandOpt.callOptionValue : 0)
                    + (abandonOpt ? abandonOpt.putOptionValue : 0)
            };
        }
    }

    // ================================================================
    // 模块4：债券与股票估值
    // ================================================================
    class BondValuation {
        constructor(config = {}) {
            this.config = Object.assign({
                faceValue: 1000,
                couponRate: 0.05,
                yearsToMaturity: 10,
                marketRate: 0.05,
                frequency: 2
            }, config);
        }

        price(marketRate = null) {
            const c = this.config;
            const y = marketRate !== null ? marketRate : c.marketRate;
            const F = c.faceValue;
            const n = c.yearsToMaturity * c.frequency;
            const coupon = F * c.couponRate / c.frequency;
            const yPerPeriod = y / c.frequency;

            let pvCoupons = 0;
            for (let t = 1; t <= n; t++) {
                pvCoupons += coupon / Math.pow(1 + yPerPeriod, t);
            }
            const pvPrincipal = F / Math.pow(1 + yPerPeriod, n);
            const price = pvCoupons + pvPrincipal;

            const ytm = y;
            const dur = this._modifiedDuration(price, coupon, F, n, yPerPeriod, c.frequency);

            return {
                price,
                pvCoupons,
                pvPrincipal,
                ytm,
                couponPayment: coupon,
                currentYield: coupon * c.frequency / price,
                modifiedDuration: dur,
                isPremium: price > F,
                isDiscount: price < F,
                isPar: Math.abs(price - F) < 0.01
            };
        }

        _modifiedDuration(price, coupon, F, n, yPerPeriod, freq) {
            let macaulay = 0;
            for (let t = 1; t <= n; t++) {
                const cf = t < n ? coupon : coupon + F;
                macaulay += (t / freq) * (cf / Math.pow(1 + yPerPeriod, t)) / price;
            }
            return macaulay / (1 + yPerPeriod);
        }

        yieldCurvePricing(rates) {
            const c = this.config;
            const F = c.faceValue;
            const coupon = F * c.couponRate / c.frequency;
            let pv = 0;
            const n = Math.min(rates.length, c.yearsToMaturity * c.frequency);
            for (let t = 1; t <= n; t++) {
                const cf = t < n ? coupon : coupon + F;
                const z = rates[t - 1] / c.frequency;
                pv += cf / Math.pow(1 + z, t);
            }
            return { price: pv, ratesUsed: rates };
        }
    }

    class EquityValuation {
        constructor(config = {}) {
            this.config = Object.assign({
                sharesOutstanding: 1e6,
                netIncome: 1e7,
                bookValue: 5e7,
                revenue: 5e7,
                eps: null,
                bps: null,
                comparablePE: 15,
                comparablePB: 2.0,
                comparablePS: 3.0,
                dividendPerShare: 0,
                dividendGrowth: 0.03,
                requiredReturn: 0.10
            }, config);
        }

        relativeValuation() {
            const c = this.config;
            const eps = c.eps || (c.netIncome / c.sharesOutstanding);
            const bps = c.bps || (c.bookValue / c.sharesOutstanding);
            const sps = c.revenue / c.sharesOutstanding;

            const pePrice = eps * c.comparablePE;
            const pbPrice = bps * c.comparablePB;
            const psPrice = sps * c.comparablePS;

            const avgPrice = (pePrice + pbPrice + psPrice) / 3;

            return {
                method: 'RELATIVE',
                earningsPerShare: eps,
                bookValuePerShare: bps,
                salesPerShare: sps,
                pePrice, peRatio: c.comparablePE,
                pbPrice, pbRatio: c.comparablePB,
                psPrice, psRatio: c.comparablePS,
                targetPriceAverage: avgPrice,
                marketCap: avgPrice * c.sharesOutstanding
            };
        }

        gordonGrowthModel() {
            const c = this.config;
            if (c.dividendPerShare <= 0) return { method: 'DDM', available: false };
            if (c.requiredReturn <= c.dividendGrowth) return { method: 'DDM', available: false, warning: 'r must be > g' };
            const price = c.dividendPerShare * (1 + c.dividendGrowth) / (c.requiredReturn - c.dividendGrowth);
            return {
                method: 'GORDON_GROWTH_DDM',
                dividendPerShare: c.dividendPerShare,
                growthRate: c.dividendGrowth,
                requiredReturn: c.requiredReturn,
                intrinsicPrice: price,
                marketCap: price * c.sharesOutstanding
            };
        }

        residualIncome(bookValuePerShare, expectedROE, requiredReturn, years = 5, longTermROE = null, terminalGrowth = 0.03) {
            const c = this.config;
            const bps0 = bookValuePerShare || (c.bookValue / c.sharesOutstanding);
            const re = requiredReturn || c.requiredReturn;
            const roe = expectedROE || 0.15;
            const ltROE = longTermROE || re;
            let value = bps0;
            let bps = bps0;
            for (let t = 1; t <= years; t++) {
                const eps = bps * roe;
                const ri = eps - re * bps;
                value += ri / Math.pow(1 + re, t);
                bps = bps + eps - (eps * 0.4);
            }
            const terminalEPS = bps * ltROE;
            const terminalRI = terminalEPS - re * bps;
            if (re > terminalGrowth) {
                const tv = terminalRI * (1 + terminalGrowth) / (re - terminalGrowth);
                value += tv / Math.pow(1 + re, years);
            }
            return {
                method: 'RESIDUAL_INCOME',
                currentBVPS: bps0,
                roe,
                requiredReturn: re,
                intrinsicValue: value,
                marketCap: value * c.sharesOutstanding
            };
        }
    }

    // ================================================================
    // 整合门户：ValuationAnchor (估值锚中枢)
    // ================================================================
    class ValuationAnchor {
        constructor(marketContext = {}) {
            this.market = Object.assign({
                riskFreeRate: 0.035,
                marketReturn: 0.095,
                volatility: 0.30,
                name: 'default_market'
            }, marketContext);

            this.dcf = new DCFEngine({
                riskFreeRate: this.market.riskFreeRate,
                marketRiskPremium: this.market.marketReturn - this.market.riskFreeRate
            });
            this.options = new RealOptions({
                riskFreeRate: this.market.riskFreeRate,
                sigma: this.market.volatility
            });
            this.bond = new BondValuation();
            this.equity = new EquityValuation();
            this.capitalBudgeting = null;
            this.lastValuation = null;
        }

        fullValuation(params) {
            const {
                baseFCF = 10e6,
                growthRate = 0.10,
                initialInvestment = 50e6,
                projectionYears = 5,
                terminalGrowth = 0.025,
                beta = 1.2,
                debtToCapital = 0.30,
                costOfDebt = 0.06,
                taxRate = 0.25,
                comparablePE = 18,
                revenue = 100e6,
                netIncome = 15e6,
                bookValue = 60e6,
                shares = 1e6,
                expansionFactor = 1.5,
                expansionCost = 30e6,
                optionMaturity = 3,
                salvageValue = 20e6
            } = params;

            this.dcf = new DCFEngine({
                riskFreeRate: this.market.riskFreeRate,
                marketRiskPremium: this.market.marketReturn - this.market.riskFreeRate,
                beta, debtToCapital, costOfDebt, taxRate,
                projectionYears, terminalGrowth
            });
            const dcfResult = this.dcf.value(baseFCF, growthRate, initialInvestment);

            const waitOpt = this.options.optionToWait(
                dcfResult.enterpriseValue, initialInvestment, optionMaturity
            );
            const expandOpt = this.options.optionToExpand(
                dcfResult.enterpriseValue, expansionCost, expansionFactor, optionMaturity
            );
            const abandonOpt = this.options.optionToAbandon(
                dcfResult.enterpriseValue, salvageValue, optionMaturity
            );
            const strategic = this.options.compoundOptionValue(
                dcfResult.npv, waitOpt, expandOpt, abandonOpt
            );

            this.equity = new EquityValuation({
                sharesOutstanding: shares,
                netIncome, bookValue, revenue,
                comparablePE,
                requiredReturn: this.dcf.calculateWACC().wacc
            });
            const relativeVal = this.equity.relativeValuation();
            const rimVal = this.equity.residualIncome(
                bookValue / shares, netIncome / bookValue,
                this.dcf.calculateWACC().wacc
            );

            return {
                timestamp: Date.now(),
                market: { ...this.market },
                assumptions: params,
                dcf: dcfResult,
                options: { waitOpt, expandOpt, abandonOpt, strategic },
                relativeValuation: relativeVal,
                residualIncome: rimVal,
                valuationAnchor: {
                    enterpriseValue_DCF: dcfResult.enterpriseValue,
                    equityValue_RIM: rimVal.marketCap,
                    equityValue_Relative: relativeVal.marketCap,
                    strategicValue_withOptions: strategic.expandedNPV + initialInvestment,
                    blendedIntrinsicValue:
                        0.40 * dcfResult.enterpriseValue +
                        0.30 * rimVal.marketCap +
                        0.20 * relativeVal.marketCap +
                        0.10 * (strategic.expandedNPV + initialInvestment)
                }
            };
        }
    }

    // ================================================================
    // 模块7：商业场景参数预设工厂
    // ================================================================
    const ValuationScenarioPresets = {
        SCENARIOS: {
            saas_ai: {
                name: 'SaaS/AI高成长',
                beta: 1.6, debtToCapital: 0.10, costOfDebt: 0.06, taxRate: 0.15,
                terminalGrowth: 0.035, tvMethod: 'gordon', tvExitMultiple: 20,
                hurdleRate: 0.15, recommendedMOS: 0.30,
                notes: '高β高R&D，g可到名义GDP+1%，WACC常12-15%'
            },
            mcn_influencer: {
                name: 'MCN/博主IP',
                beta: 2.0, debtToCapital: 0.0, costOfDebt: 0.08, taxRate: 0.20,
                terminalGrowth: 0.01, tvMethod: 'exit_multiple', tvExitMultiple: 8,
                hurdleRate: 0.20, recommendedMOS: 0.45,
                notes: 'IP半衰期3-5年，强制退出倍数法，g必须<2%'
            },
            consumer_physical: {
                name: '实体消费/隐形冠军',
                beta: 0.8, debtToCapital: 0.30, costOfDebt: 0.05, taxRate: 0.25,
                terminalGrowth: 0.025, tvMethod: 'gordon', tvExitMultiple: 12,
                hurdleRate: 0.10, recommendedMOS: 0.25,
                notes: 'β<1现金流稳，WACC 8-10%，护城河高的可放宽MOS'
            },
            cyclical_resource: {
                name: '周期/资源品',
                beta: 1.8, debtToCapital: 0.40, costOfDebt: 0.07, taxRate: 0.25,
                terminalGrowth: 0.0, tvMethod: 'exit_multiple', tvExitMultiple: 6,
                hurdleRate: 0.15, recommendedMOS: 0.40,
                notes: '不适用Gordon增长，必须用退出倍数，g=0'
            },
            crypto_early: {
                name: '加密/早期项目',
                beta: 2.5, debtToCapital: 0.0, costOfDebt: 0.15, taxRate: 0.10,
                terminalGrowth: 0.0, tvMethod: 'exit_multiple', tvExitMultiple: 3,
                hurdleRate: 0.30, recommendedMOS: 0.60,
                notes: '极高不确定性，MOS>50%，期权价值占主导'
            },
            black_swan_stress: {
                name: '黑天鹅压力测试',
                beta: 2.5, debtToCapital: 0.30, costOfDebt: 0.12, taxRate: 0.25,
                terminalGrowth: -0.01, tvMethod: 'exit_multiple', tvExitMultiple: 4,
                hurdleRate: 0.25, recommendedMOS: 0.60,
                notes: 'ERP+5%，WACC自动加3-5%，g可负'
            }
        },

        createEngine(scenarioKey, marketOverrides = {}) {
            const preset = this.SCENARIOS[scenarioKey];
            if (!preset) throw new Error(`Unknown scenario: ${scenarioKey}`);
            const market = Object.assign({
                riskFreeRate: 0.035, marketReturn: 0.095
            }, marketOverrides);
            return new DCFEngine({
                riskFreeRate: market.riskFreeRate,
                marketRiskPremium: market.marketReturn - market.riskFreeRate,
                beta: preset.beta,
                debtToCapital: preset.debtToCapital,
                costOfDebt: preset.costOfDebt,
                taxRate: preset.taxRate,
                terminalGrowth: preset.terminalGrowth,
                tvMethod: preset.tvMethod,
                tvExitMultiple: preset.tvExitMultiple
            });
        },

        createAnchor(scenarioKey, marketOverrides = {}) {
            const preset = this.SCENARIOS[scenarioKey];
            if (!preset) throw new Error(`Unknown scenario: ${scenarioKey}`);
            return { scenario: preset.name, hurdleRate: preset.hurdleRate, recommendedMOS: preset.recommendedMOS };
        },

        list() {
            return Object.entries(this.SCENARIOS).map(([k, v]) => ({
                key: k, name: v.name, waccHint: `beta=${v.beta}, g=${(v.terminalGrowth * 100).toFixed(1)}%`, recommendedMOS: v.recommendedMOS
            }));
        }
    };

    return {
        MathUtils,
        DCFEngine,
        CapitalBudgeting,
        RealOptions,
        BondValuation,
        EquityValuation,
        ValuationAnchor,
        ValuationScenarioPresets,
        version: '1.1.0'
    };
}));
