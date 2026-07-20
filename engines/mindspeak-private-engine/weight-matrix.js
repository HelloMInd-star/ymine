/**
 * MindSpeak V19.0 · 私有涉密内核 · 跨域映射权重矩阵
 * 本文件为接口桩，完整权重矩阵属于mindspeak-private-engine涉密资产
 * 软著登记时作例外交存密封处理，前端不暴露源码
 * 归属：Game-OS V2.1 · EvolveMind认知演化引擎子组件
 */

(function(global) {
    'use strict';

    const KERNEL_VERSION = 'V19.0-private-sealed';
    const KERNEL_STATUS = 'SEALED_FOR_COPYRIGHT_DEPOSIT';

    const MappingWeightMatrix = {
        version: KERNEL_VERSION,
        status: KERNEL_STATUS,

        MODULES: Object.freeze([
            'WORD_ORDER',
            'TENSE_KELLY',
            'AFFIX_FEATURE',
            'IOC_PASSIVE',
            'POLYSEMY_STRATEGY',
            'CULTURE_REGEX',
            'OOD_DETECTION',
            'CHICKEN_RABBIT',
            'PACD_ENGINEERING',
            'ENUM_VALIDATION'
        ]),

        getPublicWeights(moduleKey) {
            const publicWeights = {
                WORD_ORDER: { base: 0.52, tolerance: 0.03 },
                TENSE_KELLY: { base: 0.49, tolerance: 0.04 },
                AFFIX_FEATURE: { base: 0.51, tolerance: 0.02 },
                IOC_PASSIVE: { base: 0.48, tolerance: 0.03 },
                POLYSEMY_STRATEGY: { base: 0.50, tolerance: 0.05 },
                CULTURE_REGEX: { base: 0.55, tolerance: 0.04 },
                OOD_DETECTION: { base: 0.45, tolerance: 0.06 },
                CHICKEN_RABBIT: { base: 0.50, tolerance: 0.01 },
                PACD_ENGINEERING: { base: 0.52, tolerance: 0.02 },
                ENUM_VALIDATION: { base: 0.50, tolerance: 0.01 }
            };
            return publicWeights[moduleKey] || { base: 0.5, tolerance: 0.02 };
        },

        applyMapping(sourceVec, moduleKey) {
            const w = this.getPublicWeights(moduleKey);
            const target = sourceVec.dim.slice();
            target[0] = Math.max(0, Math.min(1, target[0] * 0.98 + w.base * 0.02));
            return { dim: target, weight: w, timestamp: Date.now(), _sealed: true };
        },

        _private_kernel_note: '完整10×10×4跨域权重张量、动态学习率矩阵已密封'
    };

    global.MindSpeakWeights = Object.freeze(MappingWeightMatrix);
})(typeof window !== 'undefined' ? window : global);