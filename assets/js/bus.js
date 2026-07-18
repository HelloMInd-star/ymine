/**
 * Y.Mine 数据总线 v1.5
 * 统一管理localStorage跨页同步、事件发布订阅、状态初始化
 * @namespace YBus
 */
(function(global) {
    'use strict';

    /**
     * 总线通道配置
     * @private
     * @type {Object<string, {storageKey: string, eventName: string, defaultValue: *}>}
     */
    const CHANNELS = {
        funnel: {
            storageKey: 'funnelOutput',
            eventName: 'funnel-bus-update',
            defaultValue: null
        },
        circle: {
            storageKey: 'circleLabData',
            eventName: 'circle-bus-update',
            defaultValue: { motor: { hasData: false }, model: { hasData: false }, market: { hasData: false } }
        },
        aiPricing: {
            storageKey: 'aiPricingBenchmark',
            eventName: 'ai-pricing-bus-update',
            defaultValue: null
        },
        caseLibrary: {
            storageKey: 'caseLibrary',
            eventName: 'case-library-bus-update',
            defaultValue: null
        },
        pricing: {
            storageKey: 'pricingOutput',
            eventName: 'pricing-bus-update',
            defaultValue: null
        },
        capmAuto: {
            storageKey: 'capmAutoMode',
            eventName: 'capm-auto-update',
            defaultValue: 'false'
        },
        simulator: {
            storageKey: 'simulatorOutput',
            eventName: 'simulator-bus-update',
            defaultValue: null
        },
        founder: {
            storageKey: 'founderMatch',
            eventName: 'founder-bus-update',
            defaultValue: null
        },
        riskFuse: {
            storageKey: 'riskFuseState',
            eventName: 'risk-fuse-trigger',
            defaultValue: { status: 'idle', warnings: [] }
        }
    };

    /**
     * 初始化总线状态
     * 检查localStorage中各通道数据，不存在则填充默认值，并触发bus-ready事件
     * @returns {void}
     */
    function initState() {
        let initialized = false;

        Object.keys(CHANNELS).forEach(function(channelName) {
            const channel = CHANNELS[channelName];
            try {
                const existing = localStorage.getItem(channel.storageKey);
                if (existing === null || existing === undefined) {
                    const defaultValue = typeof channel.defaultValue === 'string'
                        ? channel.defaultValue
                        : JSON.stringify(channel.defaultValue);
                    localStorage.setItem(channel.storageKey, defaultValue);
                    initialized = true;
                }
            } catch (e) {
                console.warn('[YBus] Failed to initialize channel:', channelName, e);
            }
        });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                triggerBusReady(initialized);
            });
        } else {
            setTimeout(function() {
                triggerBusReady(initialized);
            }, 0);
        }
    }

    /**
     * 触发bus-ready事件
     * @private
     * @param {boolean} initialized - 是否有新初始化的通道
     * @returns {void}
     */
    function triggerBusReady(initialized) {
        const event = new CustomEvent('bus-ready', {
            detail: { initialized: initialized }
        });
        window.dispatchEvent(event);
    }

    /**
     * 发布数据到指定通道
     * @param {string} channelName - 通道名 (funnel|circle|aiPricing|caseLibrary|pricing|capmAuto|simulator|founder|riskFuse)
     * @param {*} data - 要发布的数据
     * @returns {boolean} 发布成功返回true
     */
    function publish(channelName, data) {
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return false;
        }

        try {
            const value = typeof data === 'string' ? data : JSON.stringify(data);
            localStorage.setItem(channel.storageKey, value);

            const event = new CustomEvent(channel.eventName, {
                detail: { channel: channelName, data: data }
            });
            window.dispatchEvent(event);

            return true;
        } catch (e) {
            console.error('[YBus] Publish failed:', channelName, e);
            return false;
        }
    }

    /**
     * 订阅指定通道的更新事件
     * @param {string} channelName - 通道名
     * @param {function(*): void} callback - 回调函数，接收data参数
     * @returns {function} 取消订阅函数
     */
    function subscribe(channelName, callback) {
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return function() {};
        }

        const handler = function(e) {
            if (e.detail && e.detail.channel === channelName) {
                callback(e.detail.data);
            }
        };

        window.addEventListener(channel.eventName, handler);

        const storageHandler = function(e) {
            if (e.key === channel.storageKey) {
                try {
                    const data = e.newValue ? JSON.parse(e.newValue) : null;
                    callback(data);
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
     * @param {string} channelName - 通道名
     * @returns {*} 通道数据
     */
    function getState(channelName) {
        const channel = CHANNELS[channelName];
        if (!channel) {
            console.warn('[YBus] Unknown channel:', channelName);
            return null;
        }

        try {
            const raw = localStorage.getItem(channel.storageKey);
            if (raw === null || raw === undefined) {
                return channel.defaultValue;
            }
            if (typeof channel.defaultValue === 'string') {
                return raw;
            }
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[YBus] Get state failed:', channelName, e);
            return channel.defaultValue;
        }
    }

    /**
     * 等待bus-ready事件
     * @param {function(): void} callback - 总线就绪后的回调
     * @returns {void}
     */
    function ready(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 0);
        } else {
            window.addEventListener('bus-ready', callback, { once: true });
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(callback, 0);
            }, { once: true });
        }
    }

    /**
     * 获取所有通道的当前状态快照
     * @returns {Object<string, *>} 所有通道数据
     */
    function getSnapshot() {
        const snapshot = {};
        Object.keys(CHANNELS).forEach(function(name) {
            snapshot[name] = getState(name);
        });
        return snapshot;
    }

    const YBus = {
        initState: initState,
        publish: publish,
        subscribe: subscribe,
        getState: getState,
        ready: ready,
        getSnapshot: getSnapshot,
        CHANNELS: Object.keys(CHANNELS)
    };

    global.YBus = YBus;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initState);
    } else {
        initState();
    }

})(typeof window !== 'undefined' ? window : this);
