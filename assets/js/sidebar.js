/**
 * Y.Mine 侧边栏渲染 v2.1
 * JSON配置驱动的侧边栏动态渲染 + 鼠标跟随光晕效果
 * @namespace YSidebar
 */
(function(global) {
    'use strict';

    /**
     * 计算从当前页面到根目录的相对路径前缀
     * @private
     * @returns {string} 路径前缀，如"", "../", "../../"
     */
    function getPathPrefix() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(s => s && !s.endsWith('.html'));
        const depth = segments.length;
        if (depth === 0) return '';
        return '../'.repeat(depth);
    }

    /**
     * 侧边栏导航配置（v2.2 五层架构版）
     * @private
     * @type {Array<{label: string, items: Array<{href: string, icon: string, text: string, tag: string, activeTag?: boolean}>}>}
     */
    const NAV_CONFIG_BASE = [
        {
            label: '🧮 精算系统',
            items: [
                { href: 'labs/evidence/info-funnel.html', icon: '🔭', text: '信息漏斗', tag: '前置', activeTag: true },
                { href: 'ymine-studio.html', icon: '🏛️', text: '投资工作室', tag: '十步闭环', activeTag: true },
                { href: 'labs/evidence/ai-pricing-benchmark.html', icon: '📡', text: 'AI 定价基准库', tag: '基准' },
                { href: 'labs/evidence/case-library.html', icon: '🗂️', text: '案例向量库', tag: '案例' }
            ]
        },
        { divider: true },
        {
            label: '⚙️ 核心系统',
            items: [
                { href: 'index.html', icon: '🏠', text: '总控台', tag: '首页', activeTag: true },
                { href: 'game-os-main/total-index.html', icon: '🏛️', text: 'Game-OS', tag: '新架构', activeTag: true },
                { href: 'engines/gamemind/index.html', icon: '🎯', text: 'GameMind', tag: '策略' },
                { href: 'engines/moodmind/index.html', icon: '📊', text: 'MoodMind', tag: '估值' },
                { href: 'engines/evolvemind/index.html', icon: '🧬', text: 'EvolveMind', tag: '演化' },
                { href: 'engines/airmind/index.html', icon: '🛩️', text: 'AirMind V2.0', tag: '低空' },
                { href: 'engines/mindspeak/index.html', icon: '🗣️', text: 'MindSpeak V19.0', tag: '翻译' },
                { href: 'engines/geom-compute/index.html', icon: '⚡', text: 'Geom Compute', tag: '算力' }
            ]
        },
        { divider: true },
        {
            label: '🔬 认知科研实验组',
            items: [
                { href: 'labs/evidence/circle-lab.html', icon: '🧠', text: '认知画圈实验', tag: '底层引擎', activeTag: true },
                { href: 'labs/evidence/business-learning-evidence.html', icon: '📊', text: '市场证据实验室', tag: '上层实证', activeTag: true },
                { href: 'labs/marketing/index.html', icon: '📡', text: '营销实证实验室', tag: '上层实证', activeTag: true },
                { href: 'labs/evidence/finance-risk-simulator.html', icon: '🧪', text: '金融精算模拟器', tag: '数理工具', activeTag: true },
                { href: 'labs/evidence/value-pyramid.html', icon: '📐', text: 'Game-OS 六层科研价值金字塔', tag: '分层' }
            ]
        },
        { divider: true },
        {
            label: '🏗️ 结构力学实验室',
            items: [
                { href: 'labs/structural-mechanics/exp30-gravity.html', icon: '🌍', text: '万有引力实验', tag: 'Exp30' },
                { href: 'labs/structural-mechanics/exp31-atom.html', icon: '⚛️', text: '原子结构实验', tag: 'Exp31' },
                { href: 'labs/structural-mechanics/exp32-molecule.html', icon: '🧬', text: '分子结构实验', tag: 'Exp32' }
            ]
        },
        { divider: true },
        {
            label: '🔗 跨域映射',
            items: [
                { href: 'labs/evidence/cross-domain-mapping.html', icon: '🧱', text: '跨域同构积木映射引擎', tag: 'v2.1' },
                { href: 'labs/evidence/isomorphism-block-demo.html', icon: '🧩', text: '同构积木演示', tag: '演示' }
            ]
        },
        { divider: true },
        {
            label: '🛠️ 工具与归档',
            items: [
                { href: 'labs/evidence/language-mapping-evidence.html', icon: '🔄', text: '语言映射证据', tag: '归档' },
                { href: 'labs/evidence/binary-solver.html', icon: '🧩', text: '二元拆分', tag: '工具' },
                { href: 'labs/evidence/funnel-penetration.html', icon: '📊', text: '漏斗穿透', tag: '工具' },
                { href: 'labs/evidence/ultimate-sandbox.html', icon: '🏖️', text: '终极沙盘', tag: '工具' },
                { href: 'labs/evidence/general-game-os.html', icon: '📜', text: 'Game-OS 旧版', tag: '归档' }
            ]
        }
    ];

    function getNavConfig() {
        const prefix = getPathPrefix();
        return NAV_CONFIG_BASE.map(function(group) {
            if (group.divider) return group;
            return {
                label: group.label,
                items: group.items.map(function(item) {
                    return Object.assign({}, item, { href: prefix + item.href });
                })
            };
        });
    }

    /**
     * 获取当前页面文件名
     * @private
     * @returns {string} 当前页面文件名
     */
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1);
        return filename || 'index.html';
    }

    /**
     * 渲染单个导航项
     * @private
     * @param {Object} item - 导航项配置
     * @param {string} currentPage - 当前页面文件名
     * @returns {string} HTML字符串
     */
    function renderNavItem(item, currentPage) {
        const isActive = item.href === currentPage;
        const tagClass = item.activeTag ? 'level-tag active-tag' : 'level-tag';
        const itemClass = isActive ? 'nav-item active' : 'nav-item';
        return '<a href="' + item.href + '" class="' + itemClass + '">' +
            '<span class="icon">' + item.icon + '</span> ' + item.text +
            '<span class="' + tagClass + '">' + item.tag + '</span>' +
        '</a>';
    }

    /**
     * 渲染侧边栏
     * @param {HTMLElement} container - 侧边栏容器元素
     * @returns {void}
     */
    function renderSidebar(container) {
        if (!container) return;

        const currentPage = getCurrentPage();
        const navConfig = getNavConfig();
        let html = '';

        html += '<div class="logo">Y.<span>Mine</span></div>';
        html += '<div class="logo-sub">数理操作系统</div>';

        navConfig.forEach(function(group) {
            if (group.divider) {
                html += '<hr class="nav-divider" />';
                return;
            }
            html += '<div class="nav-group">';
            html += '<div class="group-label">' + group.label + '</div>';
            group.items.forEach(function(item) {
                html += renderNavItem(item, currentPage);
            });
            html += '</div>';
        });

        html += '<div class="footer-nav">v2.2 · 五层架构</div>';

        container.innerHTML = html;
    }

    /**
     * 初始化侧边栏
     * 查找class为sidebar的元素并自动渲染
     * @returns {void}
     */
    function initSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            renderSidebar(sidebar);
        }
    }

    /**
     * 初始化鼠标跟随光晕效果
     * @returns {void}
     */
    function initGlow() {
        const glow = document.getElementById('glow');
        if (!glow) return;

        document.addEventListener('mousemove', function(e) {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;
            glow.style.setProperty('--x', x + '%');
            glow.style.setProperty('--y', y + '%');
        });
    }

    /**
     * 初始化所有UI公共组件
     * @returns {void}
     */
    function init() {
        initSidebar();
        initGlow();
    }

    const YSidebar = {
        init: init,
        renderSidebar: renderSidebar,
        NAV_CONFIG: NAV_CONFIG_BASE,
        getNavConfig: getNavConfig,
        getCurrentPage: getCurrentPage
    };

    global.YSidebar = YSidebar;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof window !== 'undefined' ? window : this);
