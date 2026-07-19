/**
 * Y.Mine 侧边栏渲染 v2.0
 * JSON配置驱动的侧边栏动态渲染 + 鼠标跟随光晕效果
 * @namespace YSidebar
 */
(function(global) {
    'use strict';

    /**
     * 侧边栏导航配置（v1.3 精算版）
     * @private
     * @type {Array<{label: string, items: Array<{href: string, icon: string, text: string, tag: string, activeTag?: boolean}>}>}
     */
    const NAV_CONFIG = [
        {
            label: '🧮 精算系统',
            items: [
                { href: 'info-funnel.html', icon: '🔭', text: '信息漏斗', tag: '前置', activeTag: true },
                { href: 'ymine-studio.html', icon: '🏛️', text: '投资工作室', tag: '十步闭环', activeTag: true },
                { href: 'marketing-reinvented.html', icon: '🧪', text: '金融估值模拟器', tag: '精算' },
                { href: 'ai-pricing-benchmark.html', icon: '📡', text: 'AI 定价基准库', tag: '基准' },
                { href: 'case-library.html', icon: '🗂️', text: '案例向量库', tag: '案例' }
            ]
        },
        { divider: true },
        {
            label: '⚙️ 核心系统',
            items: [
                { href: 'index.html', icon: '🏠', text: '总控台', tag: '首页', activeTag: true },
                { href: 'game-os-main/total-index.html', icon: '🏛️', text: 'Game-OS', tag: '新架构', activeTag: true },
                { href: 'circle-lab.html', icon: '🧪', text: '画圈实验', tag: '方法论' },
                { href: 'gamemind.html', icon: '🎯', text: 'GameMind', tag: '策略' },
                { href: 'moodmind.html', icon: '📊', text: 'MoodMind', tag: '估值' },
                { href: 'evolvemind.html', icon: '🧠', text: 'EvolveMind', tag: '认知' }
            ]
        },
        { divider: true },
        {
            label: '🔗 证据链',
            items: [
                { href: 'cross-domain-mapping.html', icon: '⚡', text: '跨领域吞噬', tag: '验证' },
                { href: 'business-learning-evidence.html', icon: '📊', text: '商业证据链', tag: '闭环' },
                { href: 'value-pyramid.html', icon: '📐', text: '价值金字塔', tag: '分层' }
            ]
        },
        { divider: true },
        {
            label: '🛠️ 工具',
            items: [
                { href: 'language-mapping-evidence.html', icon: '🌐', text: '语言映射', tag: '迁移' },
                { href: 'general-game-os.html', icon: '🚁', text: '低空经济', tag: '应用' },
                { href: 'binary-solver.html', icon: '🧩', text: '二元拆分', tag: '工具' }
            ]
        }
    ];

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
        let html = '';

        html += '<div class="logo">Y.<span>Mine</span></div>';
        html += '<div class="logo-sub">数理操作系统</div>';

        NAV_CONFIG.forEach(function(group) {
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

        html += '<div class="footer-nav">v2.1 · Game-OS</div>';

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
        NAV_CONFIG: NAV_CONFIG,
        getCurrentPage: getCurrentPage
    };

    global.YSidebar = YSidebar;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(typeof window !== 'undefined' ? window : this);
