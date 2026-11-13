const BASE_SCALE = 50;
let viewerState = {
    viewport: { originX: 0, originY: 0, scale: BASE_SCALE },
    items: { lines: [] },
    colorPalette: ['#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']
};

let vCanvas = null;
let vCtx = null;
let vCssW = 0, vCssH = 0;
let viewerInitialized = false;

function resizeViewerCanvas() {
    vCanvas = document.getElementById('modelViewerCanvas');
    if (!vCanvas) return;
    vCtx = vCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    vCssW = window.innerWidth;
    vCssH = window.innerHeight;

    vCanvas.width = Math.round(vCssW * dpr);
    vCanvas.height = Math.round(vCssH * dpr);
    vCanvas.style.width = vCssW + 'px';
    vCanvas.style.height = vCssH + 'px';

    vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function vWorldToScreen(wx, wy) {
    return {
        x: viewerState.viewport.originX + wx * viewerState.viewport.scale,
        y: viewerState.viewport.originY - wy * viewerState.viewport.scale
    };
}

function vScreenToWorld(px, py) {
    return {
        x: (px - viewerState.viewport.originX) / viewerState.viewport.scale,
        y: (viewerState.viewport.originY - py) / viewerState.viewport.scale
    };
}

function vGetVisibleWorldBounds(width, height) {
    const tl = vScreenToWorld(0, 0);
    const br = vScreenToWorld(width, height);
    return { minX: tl.x, maxX: br.x, minY: br.y, maxY: tl.y };
}

function vFormatNum(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (Math.abs(num) < 1e-6) return '0';
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

function calculateGridStep(scale) {
    const targetPx = 80;
    const rawStep = targetPx / scale;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;

    if (residual < 1.5) return 1 * magnitude;
    if (residual < 3.5) return 2 * magnitude;
    if (residual < 7.5) return 5 * magnitude;
    return 10 * magnitude;
}

function updateViewerZoomBadge() {
    const badge = document.getElementById('viewerZoomBadge');
    if (badge) {
        const pct = Math.round((viewerState.viewport.scale / BASE_SCALE) * 100);
        badge.textContent = `${pct}%`;
    }
}

function viewerReset() {
    viewerState.viewport.originX = vCssW / 2;
    viewerState.viewport.originY = vCssH / 2;
    viewerState.viewport.scale = BASE_SCALE;
    updateViewerZoomBadge();
    requestViewerRender();
}

function viewerZoomAtPixel(px, py, factor) {
    const newScale = Math.min(Math.max(viewerState.viewport.scale * factor, 5), 1000);
    const world = vScreenToWorld(px, py);

    viewerState.viewport.scale = newScale;
    viewerState.viewport.originX = px - world.x * newScale;
    viewerState.viewport.originY = py + world.y * newScale;

    updateViewerZoomBadge();
    requestViewerRender();
}

function viewerZoom(factor) {
    viewerZoomAtPixel(vCssW / 2, vCssH / 2, factor);
}

function viewerFitAll() {
    const width = vCssW;
    const height = vCssH;
    const visibleLines = viewerState.items.lines.filter(l => l.visible);

    if (visibleLines.length === 0) {
        viewerReset();
        return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    visibleLines.forEach(line => {
        minX = Math.min(minX, line.x1, line.x2);
        maxX = Math.max(maxX, line.x1, line.x2);
        minY = Math.min(minY, line.y1, line.y2);
        maxY = Math.max(maxY, line.y1, line.y2);
    });

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    const padLeft = Math.min(80, width * 0.12);
    const padRight = Math.min(130, width * 0.22);
    const padTop = Math.min(95, height * 0.16);
    const padBottom = Math.min(70, height * 0.12);

    const availW = Math.max(width - padLeft - padRight, 60);
    const availH = Math.max(height - padTop - padBottom, 60);

    let optimalScale;
    if (spanX < 1e-6 && spanY < 1e-6) {
        optimalScale = 60;
    } else {
        const scaleX = spanX > 1e-6 ? availW / spanX : Infinity;
        const scaleY = spanY > 1e-6 ? availH / spanY : Infinity;
        optimalScale = Math.min(scaleX, scaleY);
    }
    optimalScale = Math.min(Math.max(optimalScale, 5), 500);

    const worldCenterX = (minX + maxX) / 2;
    const worldCenterY = (minY + maxY) / 2;
    const safeCenterPxX = padLeft + availW / 2;
    const safeCenterPxY = padTop + availH / 2;

    viewerState.viewport.scale = optimalScale;
    viewerState.viewport.originX = safeCenterPxX - worldCenterX * optimalScale;
    viewerState.viewport.originY = safeCenterPxY + worldCenterY * optimalScale;

    updateViewerZoomBadge();
    requestViewerRender();
}

let viewerRenderRequested = false;
function requestViewerRender() {
    if (!viewerRenderRequested && !document.getElementById('viewerModal').classList.contains('hidden')) {
        viewerRenderRequested = true;
        requestAnimationFrame(() => {
            renderViewerCanvas();
            viewerRenderRequested = false;
        });
    }
}

function renderViewerCanvas() {
    if (!vCtx) return;
    const width = vCssW;
    const height = vCssH;

    vCtx.fillStyle = '#0f172a';
    vCtx.fillRect(0, 0, width, height);

    const gridStep = calculateGridStep(viewerState.viewport.scale);
    const minorStep = gridStep / 5;

    vCtx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    vCtx.lineWidth = 0.5;
    drawViewerGrid(width, height, minorStep);

    vCtx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    vCtx.lineWidth = 1;
    drawViewerGrid(width, height, gridStep);

    drawViewerAxes(width, height, gridStep);

    viewerState.items.lines.forEach(l => {
        if (l.visible) drawViewerLine(l);
    });
}

function drawViewerGrid(width, height, step) {
    const bounds = vGetVisibleWorldBounds(width, height);
    const startX = Math.floor(bounds.minX / step) * step;
    const endX = Math.ceil(bounds.maxX / step) * step;
    const startY = Math.floor(bounds.minY / step) * step;
    const endY = Math.ceil(bounds.maxY / step) * step;

    vCtx.beginPath();
    for (let x = startX; x <= endX; x += step) {
        const sp = vWorldToScreen(x, 0);
        vCtx.moveTo(sp.x, 0);
        vCtx.lineTo(sp.x, height);
    }
    for (let y = startY; y <= endY; y += step) {
        const sp = vWorldToScreen(0, y);
        vCtx.moveTo(0, sp.y);
        vCtx.lineTo(width, sp.y);
    }
    vCtx.stroke();
}

function drawViewerAxes(width, height, step) {
    const origin = vWorldToScreen(0, 0);

    vCtx.strokeStyle = '#94a3b8';
    vCtx.lineWidth = 2;
    vCtx.beginPath();
    vCtx.moveTo(0, origin.y);
    vCtx.lineTo(width, origin.y);
    vCtx.moveTo(origin.x, 0);
    vCtx.lineTo(origin.x, height);
    vCtx.stroke();

    vCtx.fillStyle = '#cbd5e1';
    vCtx.font = '11px ui-sans-serif, system-ui, sans-serif';

    const bounds = vGetVisibleWorldBounds(width, height);
    const startX = Math.floor(bounds.minX / step) * step;
    const endX = Math.ceil(bounds.maxX / step) * step;
    const startY = Math.floor(bounds.minY / step) * step;
    const endY = Math.ceil(bounds.maxY / step) * step;

    const labelY = Math.min(Math.max(origin.y + 6, 8), height - 20);
    const labelX = Math.min(Math.max(origin.x - 12, 8), width - 30);

    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'top';
    for (let x = startX; x <= endX; x += step) {
        if (Math.abs(x) < 1e-6) continue;
        const sp = vWorldToScreen(x, 0);
        vCtx.beginPath();
        vCtx.moveTo(sp.x, origin.y - 4);
        vCtx.lineTo(sp.x, origin.y + 4);
        vCtx.stroke();
        vCtx.fillText(vFormatNum(x), sp.x, labelY);
    }

    vCtx.textAlign = 'right';
    vCtx.textBaseline = 'middle';
    for (let y = startY; y <= endY; y += step) {
        if (Math.abs(y) < 1e-6) continue;
        const sp = vWorldToScreen(0, y);
        vCtx.beginPath();
        vCtx.moveTo(origin.x - 4, sp.y);
        vCtx.lineTo(origin.x + 4, sp.y);
        vCtx.stroke();
        vCtx.fillText(vFormatNum(y), labelX, sp.y);
    }

    vCtx.fillText('0', origin.x - 6, origin.y + 12);
}

function drawViewerLine(line) {
    const sp1 = vWorldToScreen(line.x1, line.y1);
    const sp2 = vWorldToScreen(line.x2, line.y2);
    const midX = (line.x1 + line.x2) / 2;
    const midY = (line.y1 + line.y2) / 2;
    const spMid = vWorldToScreen(midX, midY);

    // Draw main coordinate line
    vCtx.strokeStyle = line.color;
    vCtx.lineWidth = 2.5;
    vCtx.beginPath();
    vCtx.moveTo(sp1.x, sp1.y);
    vCtx.lineTo(sp2.x, sp2.y);
    vCtx.stroke();

    // Calculate length for display
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const lengthVal = Math.sqrt(dx * dx + dy * dy);

    // Build label text: Name + Degree + Length
    let displayDegree = line.degree ? line.degree : "0°";
    let primaryText = `${line.label} (${displayDegree})`;
    let secondaryText = `L: ${vFormatNum(lengthVal)}`;

    // Draw midpoint pin marker
    vCtx.beginPath();
    vCtx.arc(spMid.x, spMid.y, 4, 0, Math.PI * 2);
    vCtx.fillStyle = '#64748b';
    vCtx.fill();
    vCtx.lineWidth = 1.5;
    vCtx.strokeStyle = '#e2e8f0';
    vCtx.stroke();

    // Measure text widths for background badge sizing
    vCtx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    const tw1 = vCtx.measureText(primaryText).width;
    vCtx.font = '10px ui-sans-serif, system-ui, sans-serif';
    const tw2 = vCtx.measureText(secondaryText).width;
    const maxTw = Math.max(tw1, tw2);

    // Draw background badge pill at midpoint
    vCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    vCtx.beginPath();
    vCtx.roundRect(spMid.x - maxTw / 2 - 6, spMid.y - 30, maxTw + 12, 28, 4);
    vCtx.fill();

    // Render Primary Text (Name + Degree)
    vCtx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
    vCtx.fillStyle = '#ffffff';
    vCtx.textAlign = 'center';
    vCtx.textBaseline = 'middle';
    vCtx.fillText(primaryText, spMid.x, spMid.y - 19);

    // Render Secondary Text (Length)
    vCtx.font = '10px ui-sans-serif, system-ui, sans-serif';
    vCtx.fillStyle = '#38bdf8';
    vCtx.fillText(secondaryText, spMid.x, spMid.y - 7);

    // Draw start and end points
    drawViewerPoint(sp1.x, sp1.y, line.color, `START (${vFormatNum(line.x1)}, ${vFormatNum(line.y1)})`);
    drawViewerPoint(sp2.x, sp2.y, line.color, `END (${vFormatNum(line.x2)}, ${vFormatNum(line.y2)})`);
}

function drawViewerPoint(x, y, color, labelText) {
    vCtx.beginPath();
    vCtx.arc(x, y, 5.5, 0, Math.PI * 2);
    vCtx.fillStyle = color;
    vCtx.fill();
    vCtx.lineWidth = 2;
    vCtx.strokeStyle = '#ffffff';
    vCtx.stroke();

    if (labelText) {
        vCtx.font = '10px ui-sans-serif, system-ui, sans-serif';
        vCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        const tw = vCtx.measureText(labelText).width;
        vCtx.beginPath();
        vCtx.roundRect(x + 10, y + 2, tw + 6, 14, 3);
        vCtx.fill();
        vCtx.fillStyle = '#cbd5e1';
        vCtx.textAlign = 'left';
        vCtx.textBaseline = 'middle';
        vCtx.fillText(labelText, x + 13, y + 9);
    }
}

let vPanState = null;
let vPinchStartDist = 0;

function vUpdateCoordHUD(clientX, clientY) {
    vCanvas = document.getElementById('modelViewerCanvas');
    const rect = vCanvas.getBoundingClientRect();
    const world = vScreenToWorld(clientX - rect.left, clientY - rect.top);
    const vxEl = document.getElementById('vCoordX');
    const vyEl = document.getElementById('vCoordY');
    if (vxEl) vxEl.textContent = world.x.toFixed(2);
    if (vyEl) vyEl.textContent = world.y.toFixed(2);
}

function initViewerEvents() {
    vCanvas = document.getElementById('modelViewerCanvas');
    if (viewerInitialized || !vCanvas) return;
    viewerInitialized = true;

    vCanvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = vCanvas.getBoundingClientRect();
        vPanState = {
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            originX: viewerState.viewport.originX,
            originY: viewerState.viewport.originY
        };
        vCanvas.classList.add('panning');
    });

    window.addEventListener('mousemove', e => {
        if (document.getElementById('viewerModal').classList.contains('hidden')) return;
        vUpdateCoordHUD(e.clientX, e.clientY);
        if (vPanState) {
            const rect = vCanvas.getBoundingClientRect();
            viewerState.viewport.originX = vPanState.originX + (e.clientX - rect.left - vPanState.startX);
            viewerState.viewport.originY = vPanState.originY + (e.clientY - rect.top - vPanState.startY);
            requestViewerRender();
        }
    });

    window.addEventListener('mouseup', () => {
        if (vPanState) {
            vPanState = null;
            if (vCanvas) vCanvas.classList.remove('panning');
        }
    });

    vCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = vCanvas.getBoundingClientRect();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        viewerZoomAtPixel(e.clientX - rect.left, e.clientY - rect.top, factor);
    }, { passive: false });

    vCanvas.addEventListener('touchstart', e => {
        const rect = vCanvas.getBoundingClientRect();
        if (e.touches.length === 1) {
            e.preventDefault();
            vPinchStartDist = 0;
            const t = e.touches[0];
            vPanState = {
                startX: t.clientX - rect.left,
                startY: t.clientY - rect.top,
                originX: viewerState.viewport.originX,
                originY: viewerState.viewport.originY
            };
            vCanvas.classList.add('panning');
            vUpdateCoordHUD(t.clientX, t.clientY);
        } else if (e.touches.length === 2) {
            e.preventDefault();
            vPanState = null;
            vCanvas.classList.remove('panning');
            vPinchStartDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });

    vCanvas.addEventListener('touchmove', e => {
        const rect = vCanvas.getBoundingClientRect();
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (vPinchStartDist > 0) {
                const factor = dist / vPinchStartDist;
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                viewerZoomAtPixel(midX, midY, factor);
                vPinchStartDist = dist;
            }
        } else if (e.touches.length === 1 && vPanState) {
            e.preventDefault();
            const t = e.touches[0];
            viewerState.viewport.originX = vPanState.originX + (t.clientX - rect.left - vPanState.startX);
            viewerState.viewport.originY = vPanState.originY + (t.clientY - rect.top - vPanState.startY);
            requestViewerRender();
            vUpdateCoordHUD(t.clientX, t.clientY);
        }
    }, { passive: false });

    vCanvas.addEventListener('touchend', e => {
        vPinchStartDist = 0;
        if (e.touches.length === 0) {
            vPanState = null;
            vCanvas.classList.remove('panning');
        } else if (e.touches.length === 1) {
            const rect = vCanvas.getBoundingClientRect();
            const t = e.touches[0];
            vPanState = {
                startX: t.clientX - rect.left,
                startY: t.clientY - rect.top,
                originX: viewerState.viewport.originX,
                originY: viewerState.viewport.originY
            };
            vCanvas.classList.add('panning');
        }
    });

    window.addEventListener('resize', () => {
        if (document.getElementById('viewerModal').classList.contains('hidden')) return;
        const world = vScreenToWorld(vCssW / 2, vCssH / 2);
        resizeViewerCanvas();
        viewerState.viewport.originX = vCssW / 2 - world.x * viewerState.viewport.scale;
        viewerState.viewport.originY = vCssH / 2 + world.y * viewerState.viewport.scale;
        requestViewerRender();
    });

    window.addEventListener('keydown', e => {
        if (document.getElementById('viewerModal').classList.contains('hidden')) return;
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            viewerFitAll();
        } else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            viewerZoom(1.25);
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            viewerZoom(0.8);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModelViewer();
        }
    });
}

function openModelViewer() {
    if (!currentState.model || !appData[currentState.model]) {
        alert("Please select a Model first.");
        return;
    }

    const modelName = currentState.model;
    document.getElementById('viewerModelTitle').textContent = modelName;

    let lines = [];
    let colorIdx = 0;
    const modelData = appData[modelName];
    
    if (modelData.fronts) {
        Object.keys(modelData.fronts)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .forEach(key => {
                const item = modelData.fronts[key];
                const x1 = parseFloat(item.startX_in || item.startX_ro);
                const y1 = parseFloat(item.startY_in || item.startY_ro);
                const x2 = parseFloat(item.endX_in || item.endX_ro);
                const y2 = parseFloat(item.endY_in || item.endY_ro);

                if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                    // Extract the first available selected degree
                    const degVal = item.deg_1 || item.deg_3 || "0°";
                    lines.push({
                        label: `F-${key}`,
                        degree: degVal,
                        x1: x1, y1: y1, x2: x2, y2: y2,
                        color: viewerState.colorPalette[colorIdx % viewerState.colorPalette.length],
                        visible: true
                    });
                    colorIdx++;
                }
            });
    }

    if (modelData.backs) {
        Object.keys(modelData.backs)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .forEach(key => {
                const item = modelData.backs[key];
                const x1 = parseFloat(item.startX_in || item.startX_ro);
                const y1 = parseFloat(item.startY_in || item.startY_ro);
                const x2 = parseFloat(item.endX_in || item.endX_ro);
                const y2 = parseFloat(item.endY_in || item.endY_ro);

                if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                    // Extract the first available selected degree
                    const degVal = item.deg_1 || item.deg_3 || "0°";
                    lines.push({
                        label: `B-${key}`,
                        degree: degVal,
                        x1: x1, y1: y1, x2: x2, y2: y2,
                        color: viewerState.colorPalette[colorIdx % viewerState.colorPalette.length],
                        visible: true
                    });
                    colorIdx++;
                }
            });
    }

    if (lines.length === 0) {
        alert(`No calculated coordinate lines found for model "${modelName}". Please calculate and save coordinates first.`);
        return;
    }

    viewerState.items.lines = lines;

    const menu = document.getElementById('dropdownMenu');
    if (menu && !menu.classList.contains('hidden')) {
        toggleMenu();
    }

    const modal = document.getElementById('viewerModal');
    modal.classList.remove('hidden');

    if (modal.requestFullscreen) {
        modal.requestFullscreen().catch(() => {});
    }

    requestAnimationFrame(() => {
        initViewerEvents();
        resizeViewerCanvas();
        viewerReset();
        viewerFitAll();
    });
}

function closeModelViewer() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    document.getElementById('viewerModal').classList.add('hidden');
}