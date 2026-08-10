# 🔺 Game-OS V2.5 — Decision AI Platform

> A trustable decision-making AI platform that turns black-box AI into auditable, explainable, circuit-broken decision pipelines — built around the **Decision Cone** geometry and the universal **0.68 threshold**.

[![Status](https://img.shields.io/badge/status-V2.5%20Verified-purple.svg)](https://hellomind-star.github.io/ymine/)
[![Stack](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS%20%7C%20FastAPI%20%7C%20Streamlit-cyan.svg)](https://hellomind-star.github.io/ymine/)
[![Demos](https://img.shields.io/badge/demos-62%20interactive%20labs-amber.svg)](https://hellomind-star.github.io/ymine/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

**Live:** https://hellomind-star.github.io/ymine/
**Portfolio:** https://hellomind-star.github.io/ymine/portfolio.html
**Research paper:** https://hellomind-star.github.io/ymine/research.html

---

## ✨ What is Game-OS?

Game-OS is not a game — it is an **operating system for decisions**.

Starting from game theory and extending through quantitative finance, cognitive modeling, airspace scheduling, and molecular mixology, Game-OS is built on the conjecture that every decision-making problem, regardless of domain, projects onto the same geometric skeleton: a **Cone** with a universal risk threshold at **0.68**.

- Below the threshold — decisions are rigid, brittle, over-optimized.
- Above the threshold — decisions collapse into chaos, cascade risk, black swans.
- At the threshold — the system breathes: adaptive, auditable, evolvable.

62 fully interactive HTML labs let visitors feel the math instead of just reading it.

---

## 🏗️ Architecture at a glance

```
                   ┌─────────────────────────────────┐
                   │      Portfolio / Research       │  ← 面向求职 / 学术入口
                   │   portfolio.html · research.html│
                   └──────────────┬──────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐       ┌──────────────────┐       ┌────────────────┐
│  Control Deck │       │  Core Engines    │       │  Private       │
│  index.html   │◄─────►│  - quant-engine  │◄─────►│  Engines (JS)  │
│  ymine-studio │       │  - mcn-alpha     │       │  - financemind │
│               │       │  - cone-game     │       │  - airmind     │
└───────┬───────┘       │  - triangle-audit│       │  - mindspeak   │
        │               │  - risk-circuit  │       │  - circle-cog  │
        │               └────────┬─────────┘       └────────┬───────┘
        │                        │                          │
        ▼                        ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Labs / Evidence (62 HTML)                  │
│  Cone Game · Chromosome · CAPM Pricing · 7D Vector · Sandbox …    │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────┐
                   │  Backend (FastAPI)      │
                   │  - chromosome router    │
                   │  - storm simulator      │
                   └─────────────────────────┘
```

Everything runs client-side by default (zero-dependency vanilla JS/HTML/CSS). The optional Python backend (`backend/`) powers a few heavier simulations; the Streamlit dashboard (`dashboard/`) is a separate ops view.

---

## 🧪 Core Demos

Start here for interviews, demos, or just to get oriented:

| Demo | Description | Link |
|------|-------------|------|
| 🎯 **Cone Game Sandbox** | Watch strategies converge to the 0.68 equilibrium in real time | [`labs/evidence/general-game-os.html`](labs/evidence/general-game-os.html) |
| 🧬 **Chromosome Diagnostic** | Visualize the Fibonacci–Chromosome isomorphism | [`labs/evidence/chromosome_diagnostic.html`](labs/evidence/chromosome_diagnostic.html) |
| ♠ **Poker Egg** | Texas Hold'em GTO training companion (separate site) | [hellomind-star.github.io/poker-egg](https://hellomind-star.github.io/poker-egg/) |
| 📐 **CAPM Cone Pricing** | Project CAPM/WACC/DCF onto the Decision Cone | [`labs/evidence/capm-pricing-simulator.html`](labs/evidence/capm-pricing-simulator.html) |
| 🧪 **7-D Vector Analysis** | Cross-domain semantic vector space across 5 domains | [`labs/evidence/vector_analysis.html`](labs/evidence/vector_analysis.html) |
| 🎰 **Ultimate Sandbox** | Human × Machine × Market — full circuit-breaker demo | [`labs/evidence/ultimate-sandbox.html`](labs/evidence/ultimate-sandbox.html) |

---

## 🧠 Core Concepts

### The Decision Cone
Every trade-off (explore/exploit, risk/return, order/chaos) lives on a cone:
- **Vertex (0.0)** — absolute certainty, dead.
- **0.48 line** — capital-preservation floor.
- **0.50 axis** — steady-state centerline.
- **0.68 threshold** — fuse / circuit-breaker line (derived from φ + safety margin).
- **Base (1.0)** — pure chaos, maximum entropy.

### Seven-Layer Circuit Breaker
Risk is not a single number — it's a layered fuse system. When any layer trips, the system degrades gracefully rather than cascading.

### Triangle Audit
Every decision is cross-validated by three independent models before it can be acted upon — no single model ever has unchecked authority.

### Cross-Domain Isomorphism
The Fibonacci–Chromosome isomorphism (see [research.html](research.html)) is the mathematical backbone — explaining why the same 0.68 constant appears across finance, poker, scheduling, cognition, and mixology.

---

## 📂 Repository Structure

```
ymine/
├── index.html                   # Control deck (main dashboard)
├── portfolio.html               # Author portfolio / resume page
├── research.html                # Academic paper landing page
├── ymine-studio.html            # Full-feature studio console
├── 404.html                     # Themed 404 page
│
├── assets/
│   ├── css/                     # base.css · components.css · poker-egg.css
│   └── js/                      # bus · components · quant-engine · poker-egg · …
│
├── labs/
│   ├── evidence/                # ★ Core interactive demos (20+ HTML labs)
│   ├── engineering/             # Engineering-domain simulations
│   ├── structural-mechanics/    # Structural mechanics experiments
│   ├── marketing/               # Marketing reinvention demos
│   └── finance-evidence-lab/    # Finance evidence lab
│
├── engines/                     # Domain engines (financemind · airmind · mindspeak · gamemind · …)
├── models/                      # Data models (calc · compute · gamemind · common)
├── game-os-main/                # Core engine modules & business modules
├── isomorphism-block-engine/    # Cross-domain isomorphism block demo
│
├── backend/                     # Optional FastAPI backend
├── dashboard/                   # Streamlit ops dashboard
├── docs/                        # Papers, audits, architecture docs, PDFs
│   └── Fibonacci-Chromosome_Isomorphism.pdf
├── tests/                       # Core engine tests (run in browser)
├── tools/                       # Internal dev tooling
└── video/                       # Video production assets
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+), Canvas 2D, SVG, Web Audio |
| Backend (optional) | Python 3.10+, FastAPI, Uvicorn |
| Dashboard | Streamlit, Plotly |
| Math / Modeling | Analytical (no heavy ML frameworks required) |
| Hosting | GitHub Pages (static) + optional backend deployment |
| Design | Dark tech aesthetic · deep purple · neon cyan · amber gold |

**Design philosophy:** zero external dependencies for the public-facing site — every lab loads and runs offline once cached.

---

## 📄 Research

The mathematical foundation behind Game-OS is formalized in the working paper:

**Fibonacci–Chromosome Isomorphism: A Unified Geometric Skeleton for Cross-Domain Decision Systems** — HelloMInd-star, 2026 (preprint).

- 📥 [Download PDF](docs/Fibonacci-Chromosome_Isomorphism.pdf)
- 📄 [Research page](research.html) (with abstract, framework, interactive experiments, BibTeX)
- arXiv link pending.

---

## 👤 About the Author

**HelloMInd-star** — AI Product Manager / Decision Systems Architect.
2026 届校招 · 技术类 AI PM（游戏 AI 方向）.

- 📁 [Portfolio page](portfolio.html)
- ⭐ [GitHub](https://github.com/HelloMInd-star)

---

## 🚀 Running Locally

```bash
# Just serve the directory — any static server works
python3 -m http.server 8080
# then open http://localhost:8080/

# Optional backend (for chromosome / storm endpoints)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📝 License

MIT — feel free to fork, study, and build on top. If this work helps your research or product, a citation or a star is always appreciated.

---

<p align="center">
<sub>KMP → IPD → 7D Vector → THRESHOLDS → 01 解码 · 0.68 Cone · Triangle Audit · Seven-Layer Fuse</sub>
</p>
