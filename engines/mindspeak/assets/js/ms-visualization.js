/**
 * MindSpeak V19.0 · Canvas动态可视化模块
 * 实现三层结构实时肉眼可见
 */

window.MS_Viz = window.MS_Viz || {};

MS_Viz._canvases = {};
MS_Viz._animFrame = null;

MS_Viz.init = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
};

MS_Viz.setupCanvas = function(canvasId, width, height) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    canvas.width = width || canvas.offsetWidth * 2;
    canvas.height = height || canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    this._canvases[canvasId] = { canvas, ctx, w: canvas.width/2, h: canvas.height/2 };
    return this._canvases[canvasId];
};

MS_Viz.drawThresholdLines = function(ctx, w, h) {
    ctx.strokeStyle = 'rgba(34,197,94,0.4)';
    ctx.setLineDash([5,5]);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.52);
    ctx.lineTo(w, h * 0.52);
    ctx.stroke();
    ctx.fillStyle = 'rgba(34,197,94,0.6)';
    ctx.font = '10px monospace';
    ctx.fillText('0.48 保本线', 5, h * 0.52 - 5);

    ctx.strokeStyle = 'rgba(250,204,21,0.6)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(250,204,21,0.8)';
    ctx.fillText('0.50 稳态中轴线', 5, h * 0.5 - 5);

    ctx.strokeStyle = 'rgba(248,113,113,0.8)';
    ctx.setLineDash([3,3]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.32);
    ctx.lineTo(w, h * 0.32);
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,113,113,0.9)';
    ctx.fillText('0.68 熔断红线', 5, h * 0.32 - 5);
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
};

MS_Viz.drawWordOrderSwap = function(canvasId, progress, labels) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);

    const items = labels || ['Adj', 'N'];
    const n = items.length;
    const spacing = w / (n + 1);
    const y = h / 2;
    const radius = 25;

    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < n; i++) {
        let x = spacing * (i + 1);
        const targetX = spacing * (n - i);
        const cx = x + (targetX - x) * progress;
        const cy = y;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, i === 0 ? 'rgba(103,232,249,0.8)' : 'rgba(244,114,182,0.8)');
        grad.addColorStop(1, i === 0 ? 'rgba(103,232,249,0.2)' : 'rgba(244,114,182,0.2)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = i === 0 ? '#67e8f9' : '#f472b6';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[i], cx, cy);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(spacing, y);
    ctx.lineTo(spacing * n, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
};

MS_Viz.drawKellyCurve = function(canvasId, p, confidenceHistory) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    this.drawThresholdLines(ctx, w, h);

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const history = confidenceHistory || [];
    const step = w / Math.max(1, history.length - 1);
    for (let i = 0; i < history.length; i++) {
        const x = i * step;
        const y = h * (1 - history[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const q = 1 - p;
    const fStar = p > 0 && q > 0 ? Math.max(0, (p * 2 - 1)) : 0;
    const kellyY = h * (1 - (0.5 + fStar * 0.5));

    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.arc(w - 30, kellyY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    ctx.font = '11px monospace';
    ctx.fillText(`p=${p.toFixed(2)} f*=${fStar.toFixed(2)}`, w - 100, kellyY - 12);
};

MS_Viz.drawFeatureTopology = function(canvasId, layers) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const networkLayers = layers || [
        { nodes: ['词性', '时态', '单复'], color: '#67e8f9' },
        { nodes: ['词×时', '时×数'], color: '#a78bfa' },
        { nodes: ['高阶语义'], color: '#f472b6' }
    ];

    const positions = [];
    const layerWidth = w / networkLayers.length;
    for (let li = 0; li < networkLayers.length; li++) {
        const layer = networkLayers[li];
        const x = layerWidth * (li + 0.5);
        const nodeCount = layer.nodes.length;
        const nodeSpacing = Math.min(40, (h - 40) / nodeCount);
        const startY = (h - nodeSpacing * (nodeCount - 1)) / 2;
        positions[li] = [];
        for (let ni = 0; ni < nodeCount; ni++) {
            const y = startY + ni * nodeSpacing;
            positions[li][ni] = { x, y, label: layer.nodes[ni] };
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let li = 0; li < positions.length - 1; li++) {
        for (const a of positions[li]) {
            for (const b of positions[li + 1]) {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }
    }

    for (let li = 0; li < positions.length; li++) {
        const color = networkLayers[li].color;
        for (const p of positions[li]) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y + 22);
        }
    }
    ctx.textAlign = 'left';
};

MS_Viz.drawIoCFlow = function(canvasId, reversed) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const boxW = 80;
    const boxH = 40;
    const y1 = h * 0.25;
    const y2 = h * 0.75;

    const nodes = [
        { x: w*0.2, y: reversed ? y2 : y1, label: '主语', c: '#67e8f9' },
        { x: w*0.5, y: h*0.5, label: '动词', c: '#a78bfa' },
        { x: w*0.8, y: reversed ? y1 : y2, label: '宾语', c: '#f472b6' }
    ];

    for (const n of nodes) {
        ctx.fillStyle = n.c + '40';
        ctx.fillRect(n.x - boxW/2, n.y - boxH/2, boxW, boxH);
        ctx.strokeStyle = n.c;
        ctx.lineWidth = 2;
        ctx.strokeRect(n.x - boxW/2, n.y - boxH/2, boxW, boxH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
    }

    ctx.strokeStyle = reversed ? '#f87171' : '#22c55e';
    ctx.lineWidth = 3;
    ctx.setLineDash(reversed ? [6,4] : []);
    const arrowSize = 8;

    const drawArrow = (from, to, progress) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const cx = from.x + dx * progress;
        const cy = from.y + dy * progress;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - arrowSize * Math.cos(angle - 0.4), cy - arrowSize * Math.sin(angle - 0.4));
        ctx.lineTo(cx - arrowSize * Math.cos(angle + 0.4), cy - arrowSize * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = reversed ? '#f87171' : '#22c55e';
        ctx.fill();
    };

    const t = (Date.now() / 1500) % 1;
    drawArrow(nodes[0], nodes[1], t);
    drawArrow(nodes[1], nodes[2], t);
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
};

MS_Viz.drawStrategyRouting = function(canvasId, branches, activeBranch) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const brs = branches || ['体育', '交通', '日常', '法律'];
    const startX = 60;
    const endX = w - 60;
    const centerY = h / 2;

    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(startX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('多义词', startX, centerY);

    const n = brs.length;
    const branchSpacing = (h - 60) / n;
    const startY = 30 + branchSpacing / 2;

    for (let i = 0; i < n; i++) {
        const by = startY + i * branchSpacing;
        ctx.strokeStyle = i === activeBranch ? '#22c55e' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = i === activeBranch ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(startX + 20, centerY);
        ctx.quadraticCurveTo((startX + endX)/2, by, endX - 20, by);
        ctx.stroke();

        ctx.fillStyle = i === activeBranch ? '#22c55e' : 'rgba(100,116,139,0.6)';
        ctx.beginPath();
        ctx.arc(endX, by, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(brs[i], endX, by);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
};

MS_Viz.drawCultureConstraint = function(canvasId, strength) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const s = strength || 0.5;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.4;

    for (let i = 0; i < 5; i++) {
        const r = maxR * (0.3 + i * 0.17) * s;
        ctx.strokeStyle = `rgba(251,191,36,${0.2 + i * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('文', cx, cy);

    ctx.strokeStyle = 'rgba(251,191,36,0.6)';
    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * s * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
};

MS_Viz.drawOODConfidenceDecay = function(canvasId, oodScores) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);
    this.drawThresholdLines(ctx, w, h);

    const scores = oodScores || [0.1, 0.3, 0.5, 0.7, 0.9];
    const n = scores.length;
    const step = w / (n + 1);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = step * (i + 1);
        const conf = Math.max(0, 1 - scores[i] * 0.9);
        const y = h * (1 - conf);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        const color = conf >= 0.5 ? '#22c55e' : conf >= 0.32 ? '#facc15' : '#ef4444';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        if (conf < 0.32) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 2;
        }
    }
};

MS_Viz.drawBarChart = function(canvasId, labels, values, colors) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const labs = labels || ['鸡', '兔'];
    const vals = values || [23, 12];
    const cols = colors || ['#67e8f9', '#f472b6'];
    const n = vals.length;
    const barW = Math.min(60, (w - 60) / n - 20);
    const maxVal = Math.max(...vals, 1);
    const chartH = h - 50;
    const startX = (w - (barW + 15) * n) / 2 + 20;

    for (let i = 0; i < n; i++) {
        const x = startX + i * (barW + 15);
        const barH = (vals[i] / maxVal) * chartH * 0.8;
        const y = h - 30 - barH;
        ctx.fillStyle = cols[i] + '80';
        ctx.fillRect(x, y, barW, barH);
        ctx.strokeStyle = cols[i];
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barW, barH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(vals[i], x + barW/2, y - 8);
        ctx.font = '12px sans-serif';
        ctx.fillText(labs[i], x + barW/2, h - 10);
    }
    ctx.textAlign = 'left';
};

MS_Viz.drawPieChart = function(canvasId, labels, values, colors) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(0, 0, w, h);

    const labs = labels || ['A', 'B', 'C'];
    const vals = values || [0.3, 0.5, 0.2];
    const cols = colors || ['#67e8f9', '#a78bfa', '#f472b6'];
    const total = vals.reduce((a,b) => a+b, 0) || 1;
    const cx = w/2;
    const cy = h/2 - 10;
    const r = Math.min(w, h) * 0.35;
    let startAngle = -Math.PI/2;

    for (let i = 0; i < vals.length; i++) {
        const slice = (vals[i] / total) * Math.PI * 2;
        ctx.fillStyle = cols[i] + 'cc';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + slice);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        startAngle += slice;
    }

    ctx.fillStyle = '#0b0b1a';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    let legY = h - 30 - labs.length * 8;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < labs.length; i++) {
        const pct = Math.round(vals[i]/total*100);
        ctx.fillStyle = cols[i];
        ctx.fillRect(10, legY + i*16, 10, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText(`${labs[i]} ${pct}%`, 25, legY + i*16 + 9);
    }
};

MS_Viz.drawMatrixOverview = function(canvasId) {
    const cv = this._canvases[canvasId];
    if (!cv) return;
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    ctx.fillRect(0, 0, w, h);

    const modules = ['语序', '时态', '词缀', 'IoC', '多义', '文化', 'OOD', '鸡兔', 'PACD', '枚举'];
    const layers = ['语言层', '数理层', '架构层'];
    const n = modules.length;
    const m = layers.length;
    const cellW = (w - 80) / n;
    const cellH = (h - 60) / m;
    const startX = 70;
    const startY = 35;

    const palette = ['#67e8f9', '#a78bfa', '#f472b6', '#22c55e', '#facc15', '#fb923c', '#f87171', '#34d399', '#60a5fa', '#c084fc'];

    for (let li = 0; li < m; li++) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(layers[li], startX - 8, startY + li * cellH + cellH/2 + 4);
    }

    for (let mi = 0; mi < n; mi++) {
        ctx.save();
        ctx.translate(startX + mi * cellW + cellW/2, h - 8);
        ctx.rotate(-Math.PI/6);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(modules[mi], 0, 0);
        ctx.restore();
    }

    for (let li = 0; li < m; li++) {
        for (let mi = 0; mi < n; mi++) {
            const intensity = 0.3 + 0.5 * Math.sin(mi * 0.7 + li * 1.1 + Date.now()/3000) * 0.5 + 0.2;
            ctx.fillStyle = palette[mi] + Math.floor(intensity * 200).toString(16).padStart(2, '0');
            ctx.fillRect(startX + mi * cellW + 2, startY + li * cellH + 2, cellW - 4, cellH - 4);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(startX + mi * cellW, startY + li * cellH, cellW, cellH);
        }
    }
    ctx.textAlign = 'left';
};

console.log('%c MindSpeak V19.0 Visualization Module Loaded ', 
    'background:#1a1a2e;color:#22c55e;font-weight:bold;padding:4px 8px;border-radius:4px;');