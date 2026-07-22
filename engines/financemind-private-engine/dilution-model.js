/**
 * SEALED_FOR_COPYRIGHT_DEPOSIT · 股权/债权融资稀释测算 · 版权交存密封
 * FinanceMind V1.0 · 私有涉密内核
 * 本文件为接口桩，完整股权稀释模型属于financemind-private-engine涉密资产
 * 软著登记时作例外交存密封处理，前端不暴露源码
 */

(function(global) {
    'use strict';

    const KERNEL_VERSION = '1.0.0-sealed';
    const KERNEL_STATUS = 'SEALED_FOR_COPYRIGHT_DEPOSIT';

    const DilutionModel = {
        version: KERNEL_VERSION,
        status: KERNEL_STATUS,

        calculateDilution(preMoney, newInvestment, newShares, totalShares) {
            console.warn('Private kernel sealed. Using public stub for demo.');

            const pm = preMoney || 0;
            const ni = newInvestment || 0;
            const ns = newShares || 0;
            const ts = totalShares || 1;
            const postMoney = pm + ni;
            const newStake = ns / (ts + ns);
            const oldStakeDiluted = 1 - newStake;

            return {
                postMoney: postMoney,
                oldStakeDiluted: oldStakeDiluted,
                newStake: newStake,
                timestamp: Date.now(),
                _sealed: true
            };
        },

        _private_kernel_note: '完整股权/债权融资稀释测算、反稀释条款计算、ESOP期权池稀释、多轮融资瀑布已密封'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Object.freeze(DilutionModel);
    } else {
        global.FinanceMindDilutionModel = Object.freeze(DilutionModel);
    }
})(typeof window !== 'undefined' ? window : global);
