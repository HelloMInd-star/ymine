# Y.Mine / Game-OS 仓库审计与优化报告

**时间**: 2026-08-10  
**范围**: ymine_repo 全站（64个HTML页面 + Python后端 + Streamlit）  
**提交**: `fa93e91` · 63 files changed, 527 insertions(+), 55 deletions(-)

---

## 一、审计发现的问题

### 1. CSS引用不统一（27个页面无base.css）
仅有37个页面引用了`assets/css/base.css`，其余27个页面（包括labs子页、game-os-main、modeling_overview、MemoryBase深层页等）都有各自独立的内联`<style>`，颜色/间距/字体不统一。

### 2. Favicon几乎全部缺失
除portfolio.html和research.html外，62个页面均未设置favicon。

### 3. Title格式混乱
- 有的用`Y.Mine · xxx`，有的用`Game-OS · xxx`，有的无前缀
- 格式不统一（`·`/`-`/`|`/无分隔符混用）

### 4. 半成品/骨架页裸露
`game-os-main/business-modules/`下的4个模块页面（_template、math-cognition、mcn-valuation、wall-street-11step）显示"Skeleton v0.10/骨架就绪"但无视觉标识，易被误认为完整页面。

### 5. 低对比度文字
大量页面使用`rgba(255,255,255,0.1~0.25)`的浅灰色文字在深色背景上，可读性差（不满足WCAG AA对比度要求）。

### 6. 404.html使用绝对路径
`href="/index.html"`等绝对路径在GitHub Pages `/ymine/`子路径下会跳转失败。

### 7. 后端CORS白名单缺失
`config.py`和`backend/config.py`的`ALLOWED_ORIGINS`未包含`https://hellomind-star.github.io`和`localhost:8090`等实际部署域名，线上环境API调用会被CORS拦截。

### 8. 全局滚动条/代码块/表单样式缺失
各页滚动条样式、`<code>`/`<pre>`代码块、input/select/textarea表单元素无统一暗色主题样式。

### 9. 仓库结构概览

| 类别 | 数量 | 状态 |
|------|------|------|
| 根目录HTML页面 | 9 | ✅ 全部正常 |
| engines/ 引擎页面（公开） | 7 (airmind/evolvemind/financemind/gamemind/geom-compute/mindspeak/moodmind) | ✅ 有实质内容 |
| engines/*-private-engine/ 私有JS引擎 | 3 (airmind/financemind/mindspeak) | ✅ JS模块齐全 |
| labs/evidence/ 核心实证Demo | 21 | ✅ 多为完整可交互demo；binary-solver/lab-section/language-mapping-evidence为轻量/迁移页 |
| labs/engineering/ 工程验证 | 4 | ✅ canvas+粒子特效交互页 |
| labs/structural-mechanics/ 结构力学 | 3 | ✅ 完整实验页 |
| labs/ 其他实验室 | 6 (control_theory/game_theory/light_vector/market_equilibrium/signal_filter/molecular-mixology) | ✅ 完整交互页 |
| labs/marketing/ | 1 | ✅ 完整 |
| game-os-main/business-modules/ | 6 (_template/circle-cognitive/lowalt-economy/math-cognition/mcn-valuation/wall-street-11step) | ⚠️ 4个为骨架模板，2个为迁移/实质模块 |
| game-os-main/core-engine/ | 9个JS文件 | ✅ 核心引擎JS |
| models/ | 4个子目录（calc/common/compute/gamemind） | ✅ 模型配置+模型JS齐全 |
| isomorphism-block-engine/ | 2公开页+streamlit-demo+private | ✅ 完整 |
| dashboard/ Streamlit仪表盘 | Home.py + 2 pages | ✅ 语法正确 |
| backend/ FastAPI模块化 | main.py + 2 routers | ✅ 可启动 |
| Python后端主入口 | main.py + config.py | ✅ 13个路由端点，可启动 |
| portfolio.html / research.html | 2个 | ✅ 干净展示页，有独立优秀样式 |
| 分子调酒模块 | molecular-mixology.html | ✅ 未触碰 |
| MemoryBase | 公开index.html + vector_store子模块 | ✅ |
| ms-lab / moodmind_lab | 子项目 | ✅ 各自独立结构 |

---

## 二、所做修改

### A. 设计系统升级（assets/css/base.css 从397行 → 721行）

新增：
1. **完整CSS变量体系** (`:root`)：
   - 主色：`--bg:#0a0a18` / `--purple:#a78bfa` / `--cyan:#22d3ee` / `--amber:#fbbf24`
   - 语义色：`--green:#4ade80` / `--red:#f87171` / `--orange:#fb923c` / `--blue:#60a5fa`
   - 文字层级：`--text/#e8eaf6` / `--text-secondary/0.72` / `--text-tertiary/0.50` / `--text-muted/0.30`
   - 边框/阴影/圆角/字号/字体栈/渐变 全套变量
2. **全局滚动条样式**（WebKit + Firefox），紫色细条
3. **代码块/日志区域**：`code`/`pre`统一等宽字体（JetBrains Mono优先），暗色背景
4. **表单元素**：input/textarea/select暗色统一风格，focus紫色发光
5. **链接统一配色**
6. **标题文字层级对比度提升**
7. **状态徽章**（`.badge-purple/cyan/amber/green/red/muted`）
8. **数据指标卡**（`.metric .metric-value/.metric-label/.metric-delta`）
9. **表格统一风格**
10. **canvas/chart容器圆角**
11. **slider滑块统一紫色样式**
12. **focus-visible可访问性轮廓**
13. **暗色对比度兜底**：`[style*="color:rgba(255,255,255,0.1~0.25)"]` 统一提亮至0.5以上，解决全局低对比度问题
14. **卡片悬停质感** + **按钮hover效果** + **等宽数字**（font-variant-numeric: tabular-nums）
15. **粒子背景弱化**（#particles/#stars opacity:0.5，减少视觉噪音）
16. **Under Development标识样式**（`.dev-banner`琥珀色）

### B. 60个HTML页面统一修复

- **+base.css**：21个原本独立样式的页面新增base.css引用
  - labs/control_theory_lab.html, game_theory_lab.html, light_vector.html, market_equilibrium_lab.html, signal_filter_lab.html
  - labs/engineering/audio_repair.html, info-scheduling.html, music-soundfield.html
  - labs/evidence/funnel-penetration.html, ultimate-sandbox.html, language-mapping-evidence.html
  - game-os-main/total-index.html + business-modules/下5个
  - MemoryBase/vector_store/experiment_sim_vector/, modeling_overview.html, ms-lab/index.html, 404.html
- **+favicon**：60个页面统一添加🔺 SVG data URI favicon
- **~title**：50+个页面title规范化为`页面名 · Game-OS`格式
- **+dev-banner**：4个骨架模块页面添加琥珀色"建设中"标识
- 保留独立样式：portfolio.html、research.html（有自研优秀深色设计）、moodmind_lab（自有deepspace.css）、tests/runner.html（测试工具）

### C. Python后端修复

- `config.py` CORS白名单新增：`localhost:8090`、`https://hellomind-star.github.io`、`null`（file://场景）
- `backend/config.py` 同步更新
- 验证：`main.py`可正常import，13个路由端点全部注册
- 验证：dashboard/下3个Streamlit文件语法正确
- 验证：isomorphism-block-engine/streamlit-demo语法正确

### D. 链接修复

- 404.html中4个绝对路径(`/index.html`等)改为相对路径，修复GitHub Pages子路径跳转问题
- 全站330条内部HTML链接验证：**0死链**
- 全站CSS/JS资源引用验证：**0失效**
- 所有HTML文件DOCTYPE/head/body/title结构完整

---

## 三、未触碰的内容

- ❌ labs/molecular-mixology.html（分子调酒模块，按要求不动）
- ❌ labs/evidence/lab-section.html（HTML片段，非独立页面）
- ❌ index.html的操作台功能和布局（保持完整JS功能，仅通过base.css做视觉统一）
- ❌ 所有JS交互逻辑和canvas/chart元素ID
- ❌ portfolio.html / research.html的精美独立设计
- ❌ 任何页面的功能代码或业务逻辑

---

## 四、Git提交

```
fa93e91 feat(visual): 全面视觉统一优化 · 精密控制台打磨 v3.0
63 files changed, 527 insertions(+), 55 deletions(-)
```

**未push**，本地提交完毕。
