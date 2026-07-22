/**
 * SEALED_FOR_COPYRIGHT_DEPOSIT · WACC加权平均资本成本(含MM税盾) · 版权交存密封
 * FinanceMind V1.0 · 私有涉密内核
 * 本文件为接口桩，完整WACC税盾计算模型属于financemind-private-engine涉密资产
 * 软著登记时作例外交存密封处理，前端不暴露源码
 */

(function(global) {
    'use strict';

    const KERNEL_VERSION = '1.0.0-sealed';
    const KERNEL_STATUS = 'SEALED_FOR_COPYRIGHT_DEPOSIT';

    const WaccCalculator = {
        version: KERNEL_VERSION,
        status: KERNEL_STATUS,

        computeWACC(rf, beta, mp, costOfDebt, taxRate, equityWeight, debtWeight) {
            console.warn('Private kernel sealed. Using public stub for demo.');

            const ke = rf + beta * mp;
            const kd = costOfDebt || 0.05;
            const tr = taxRate || 0.25;
            const ew = equityWeight !== undefined ? equityWeight : 0.7;
            const dw = debtWeight !== undefined ? debtWeight : 0.3;
            const kdAfterTax = kd * (1 - tr);
            const wacc = ew * ke + dw * kd * (1 - tr);
            const mmTaxShield = dw * kd * tr;

            return {
                ke: ke,
                kdAfterTax: kdAfterTax,
                wacc: wacc,
                mmTaxShield: mmTaxShield,
                timestamp: Date.now(),
                _sealed: true
            };
        },

        _private_kernel_note: '完整WACC加权平均资本成本、MM定理税盾修正、财务困境成本非线性调整已密封'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Object.freeze(WaccCalculator);
    } else {
        global.FinanceMindWaccCalculator = Object.freeze(WaccCalculator);
    }
})(typeof window !== 'undefined' ? window : global);
