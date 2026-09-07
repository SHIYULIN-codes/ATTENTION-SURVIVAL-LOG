// File Overview
// Renders the ecological environment, atmospheric effects, glow layers,
// and reusable visual caches.

// 1. Invisible attention takes shape within the image
// Focus, mind-wandering, capture, and recovery alter light and contour,
// allowing participants to perceive the effects of attention in the environment.

// 2. Offscreen canvases and glow layers
// This file manages offscreen canvases, glow layers, and render caches;
// corresponding systems update lifecycles, targets, and counts.
let glowLayer = null;
let arrwGloSrcCnv = null;
let arrwGlowCnvs = null;
let arrwGlowSrcCtx = null;
let arrwGlowCntxt = null;
let arrwGloMaiCnv = null;
let mainCnvsElmnt = null;

const cacheFrame = { refreshes: 0 };
const bgnCchFrm = () => {
  cacheFrame.refreshes = 0;
};

// Disable main-canvas shadows when the independent glow layer is enabled.
const setDynamicGlow = (color, blur) => {
  drawingContext.shadowColor = glowLayersOn
    ? "rgba(0, 0, 0, 0)"
    : color;
  drawingContext.shadowBlur = glowLayersOn ? 0 : blur;
};

const applyGlowStyle = (style) => {
  setDynamicGlow(style.color, style.blur);
};

function stpGlowLyrs(mainCanvas) {
// A low-resolution offscreen canvas renders soft glows while
// preserving performance headroom for real-time lifeform movement.
  if (!glowLayersOn || !mainCanvas || typeof document === "undefined") {
    return;
  }

  Object.assign(mainCanvas.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "1",
    background: "transparent",
  });

  glowLayer = window.GlowApp?.createGlow({
    mainCanvas,
    config: glowConfig,
    hidden: visualTest,
  });
  if (!glowLayer) return;
  glowLayer.nextUpdateAt = 0;
  resizeGlow();
  stpArrwGlowLyr(mainCanvas);
}

// Arrow glows use an offscreen layer with independent pixel density.
function stpArrwGlowLyr(mainCanvas) {
  if (!glowLayersOn || !mainCanvas || typeof document === "undefined") return;

  arrwGloMaiCnv = mainCanvas;
  arrwGloSrcCnv = document.createElement("canvas");
  arrwGlowCnvs = document.createElement("canvas");
  arrwGlowSrcCtx = arrwGloSrcCnv.getContext("2d");
  arrwGlowCntxt = arrwGlowCnvs.getContext("2d");
  if (!arrwGlowSrcCtx || !arrwGlowCntxt) {
    arrwGloSrcCnv = null;
    arrwGlowCnvs = null;
    arrwGlowSrcCtx = null;
    arrwGlowCntxt = null;
    arrwGloMaiCnv = null;
    return;
  }

  arrwGlowCnvs.id = "roamer-arrow-glow";
  arrwGlowCnvs.setAttribute("aria-hidden", "true");
  Object.assign(arrwGlowCnvs.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "0",
    pointerEvents: "none",
    visibility: visualTest ? "hidden" : "visible",
  });
  mainCanvas.parentNode.insertBefore(arrwGlowCnvs, mainCanvas);
  rszArrwGlow();
}

// Synchronize the arrow-glow canvas's pixel and display dimensions when the viewport changes.
function rszArrwGlow() {
  if (!arrwGlowCnvs || !arrwGloSrcCnv) return;
  const scale = glowConfig.resolutionScale;
  const pixelWidth = Math.max(1, Math.ceil(width * scale));
  const pixelHeight = Math.max(1, Math.ceil(height * scale));
  arrwGloSrcCnv.width = pixelWidth;
  arrwGloSrcCnv.height = pixelHeight;
  arrwGlowCnvs.width = pixelWidth;
  arrwGlowCnvs.height = pixelHeight;
  arrwGlowCnvs.style.width = width + "px";
  arrwGlowCnvs.style.height = height + "px";
}

// Clear the arrow-glow layer and restore its pixel transform at the start of each frame so multiple
// Roamers can safely share the same offscreen canvas.
function bgnArrwGlowFrm() {
  if (!arrwGlowSrcCtx || !arrwGloSrcCnv) return;
  arrwGlowSrcCtx.setTransform(1, 0, 0, 1, 0, 0);
  arrwGlowSrcCtx.globalAlpha = 1;
  arrwGlowSrcCtx.clearRect(
    0,
    0,
    arrwGloSrcCnv.width,
    arrwGloSrcCnv.height
  );
}

function drawArrGloShp(item, arrowPath) {
  // Reuse arrow geometry when Path2D is supported; callers fall
  // back to ordinary shape rendering in other environments.
  if (
    !arrwGlowSrcCtx ||
    !arrwGloSrcCnv ||
    !arrwGloMaiCnv ||
    !arrowPath ||
    item.glow <= 0 ||
    typeof drawingContext.getTransform !== "function"
  ) {
    return;
  }

  const transform = drawingContext.getTransform();
  const scale = arrwGloSrcCnv.width / arrwGloMaiCnv.width;
  arrwGlowSrcCtx.save();
  arrwGlowSrcCtx.setTransform(
    transform.a * scale,
    transform.b * scale,
    transform.c * scale,
    transform.d * scale,
    transform.e * scale,
    transform.f * scale
  );
  arrwGlowSrcCtx.translate(item.x, item.y);
  arrwGlowSrcCtx.rotate(Math.atan2(item.y, item.x));
  arrwGlowSrcCtx.scale(
    item.arrowScale * roamCfg.arrowScaleX,
    item.arrowScale
  );
  arrwGlowSrcCtx.globalAlpha = clamp(
    item.glow * drawingContext.globalAlpha,
    0,
    1
  );
  arrwGlowSrcCtx.fillStyle = "#fff";
  arrwGlowSrcCtx.fill(arrowPath);
  arrwGlowSrcCtx.restore();
}

// Render arrow glows separately for each active Roamer, then
// place them together behind the linework during main compositing.
function rndrArrwGlow() {
  if (!arrwGlowCntxt || !arrwGlowCnvs || !arrwGloSrcCnv) return;
  const context = arrwGlowCntxt;
  const pixelWidth = arrwGlowCnvs.width;
  const pixelHeight = arrwGlowCnvs.height;
  const scaledBlur = roamCfg.arrowGlowBlur * glowConfig.resolutionScale;
  const offset = pixelWidth + Math.ceil(scaledBlur * 4);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.shadowColor = `rgba(${roamCfg.arrowGlowColor.join(",")}, ${roamCfg.arrowGlowAlpha})`;
  context.shadowBlur = scaledBlur;
  context.shadowOffsetX = offset;
  context.shadowOffsetY = 0;
  context.drawImage(arrwGloSrcCnv, -offset, 0);
  context.shadowColor = "rgba(0, 0, 0, 0)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

// Mask arrow glows to the focus-window shape, leaving space inside the window.
function maskFocusGlow() {
  if (
    !arrwGlowCntxt ||
    !arrwGlowCnvs ||
    deepFocus.phase === "idle" ||
    deepFocus.windowProgress <= 0
  ) {
    return;
  }
  const windowRect = curFcsWndw();
  if (!windowRect) return;
  const opacity = fcsWndwAlph();
  if (opacity <= 0) return;

  const config = deepCfg;
  const points = fcsArchPnts(windowRect);
  // Convert mask coordinates according to the offscreen glow canvas's pixel density,
  // keeping window edges aligned with the main canvas.
  const scaleX = arrwGlowCnvs.width / Math.max(1, width);
  const scaleY = arrwGlowCnvs.height / Math.max(1, height);
  const blurScale = Math.max(scaleX, scaleY);
  const context = arrwGlowCntxt;

  context.save();
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  // Cut the focus window out of the arrow-glow layer to reduce visual distraction inside it.
  context.globalCompositeOperation = "destination-out";
  context.globalAlpha = clamp(
    (config.fcsWndwAlph / 255) * opacity,
    0,
    1
  );
  context.filter =
    `blur(${config.fcsWndwBlur * blurScale}px)`;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
  context.fill();
  context.restore();
}

// Rebuild glow buffers after a resize and force an update on the next frame.
function resizeGlow() {
  if (!glowLayer) return;
  glowLayer.resize(width, height);
  glowLayer.nextUpdateAt = 0;
  rszArrwGlow();
}

function compositeGlow() {
  if (visualTest) glowLayer.synchronize();
  drawingContext.save();
// Glows emerge behind the lifeform linework, making attention appear to shine from within the contours.
  drawingContext.globalCompositeOperation = "destination-over";
  drawingContext.globalAlpha = 1;
  if (arrwGlowCnvs) {
    drawingContext.drawImage(
      arrwGlowCnvs,
      0,
      0,
      arrwGlowCnvs.width,
      arrwGlowCnvs.height,
      0,
      0,
      width,
      height
    );
  }
  drawingContext.drawImage(
    glowLayer.canvas,
    0,
    0,
    glowLayer.canvas.width,
    glowLayer.canvas.height,
    0,
    0,
    width,
    height
  );
  // Fill remaining transparent regions with the background last,
  // allowing the offscreen glow layer to remain transparent and reusable.
  drawingContext.fillStyle = eco.bgColor;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();
  // Visual tests read one pixel to force canvas compositing to commit;
  // the color result remains outside the test scope.
  if (visualTest) drawingContext.getImageData(0, 0, 1, 1);
}

function renderGlow(now, force = false) {
  if (!glowLayer) return;
  // Glows can refresh at an independent frequency; when
  // synchronization is enabled, they follow the main render frame.
  if (!force && !glowConfig.syncRndrFrm && now < glowLayer.nextUpdateAt) return;
  glowLayer.nextUpdateAt = now + 1000 / glowConfig.updateTps;
  rndrArrwGlow();
  maskFocusGlow();
  window.GlowApp?.render(glowLayer);
  if (visualTest) compositeGlow();
}

// 3. Preserving lifeform contours and reawakening them each frame
// Caches reuse complex contours to reduce frame-by-frame rendering cost.
// This function was modified with the assistance of ChatGPT.
function getLifeCache(creature) {
  if (!lifeCache.enabled) return null;
  const bounds = lifeCache.bounds[creature.type];
  if (!bounds || typeof createGraphics !== "function") return null;
  if (creature.spriteCache) return creature.spriteCache;

  const updateTps =
    lifeCache.updtTpsByType[creature.type] || lifeCache.updateTps;
  const graphics = createGraphics(bounds.width, bounds.height);
  graphics.pixelDensity(lifeCache.pixelDensity);
  graphics.clear();
  graphics.drawingContext.imageSmoothingEnabled = true;
  graphics.drawingContext.imageSmoothingQuality = "high";
  creature.spriteCache = {
    graphics,
    width: bounds.width,
    height: bounds.height,
    lastTick: -1,
    updateTps,
    phaseMs: creature.seed % (1000 / updateTps),
    anchorX: bounds.width * 0.5,
    anchorY: bounds.height * 0.5,
  };
  return creature.spriteCache;
}

const getRenderPass = (creature) => ({
  renderBodyOnly: creature.renderBodyOnly,
  arrowsOnly: creature.arrowsOnly,
  rndrRngsOnly: creature.rndrRngsOnly,
});

// Cache refresh temporarily switches to local coordinates and a specified render channel,
// then fully restores lifeform-rendering flags.
function updtLifeCch(creature, ctx, cache, vectorDraw, rndrPassStt) {
  const graphics = cache.graphics;
  graphics.clear();

  const svdP5Rend = p5.instance._renderer;
  const savedRenderer = _renderer;
  const mainContext = drawingContext;
  const originalX = creature.x;
  const originalY = creature.y;
  const svdRndrPass = getRenderPass(creature);
  cache.rndrPassStt = { ...rndrPassStt };

  try {
    Object.assign(creature, rndrPassStt);
    p5.instance._renderer = graphics._renderer;
    _renderer = graphics._renderer;
    drawingContext = graphics.drawingContext;
    cache.anchorX = cache.width * 0.5 + (originalX - floor(originalX));
    cache.anchorY = cache.height * 0.5 + (originalY - floor(originalY));
    creature.x = cache.anchorX;
    creature.y = cache.anchorY;
    vectorDraw.call(creature, ctx);
  } finally {
    creature.x = originalX;
    creature.y = originalY;
    Object.assign(creature, svdRndrPass);
    p5.instance._renderer = svdP5Rend;
    _renderer = savedRenderer;
    drawingContext = mainContext;
  }
}

// Refresh caches at an independent update frequency while preserving phase.
function refreshCache(cache, now, refresh) {
  const stepMs = 1000 / cache.updateTps;
  const tick = floor((now + cache.phaseMs) / stepMs);
  if (tick === cache.lastTick) return;

  const initialRefresh = cache.lastTick < 0;
  if (!initialRefresh) {
    const runtime = window.AppRuntime;
    if (runtime) {
      runtime.enqueue("cacheRefresh", cache, () => {
        refresh();
        cache.lastTick = tick;
      });
      return;
    }
    if (cacheFrame.refreshes >= lifeCache.maxCchRfrsh) return;
    cacheFrame.refreshes++;
  }

  refresh();
  cache.lastTick = tick;
}

// Prefer the contour cache; call the vector-rendering entry point directly when no cache exists.
function drawLifeCache(creature, ctx, vectorDraw) {
  const cache = getLifeCache(creature);
  if (!cache) {
    vectorDraw.call(creature, ctx);
    return;
  }

  const rndrPassStt = getRenderPass(creature);
  refreshCache(cache, ctx.now, () => {
    updtLifeCch(creature, ctx, cache, vectorDraw, rndrPassStt);
  });

  drawingContext.save();
  drawingContext.globalCompositeOperation = "source-over";
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = "high";
  drawingContext.drawImage(
    cache.graphics.elt,
    creature.x - cache.anchorX,
    creature.y - cache.anchorY,
    cache.width,
    cache.height
  );
  drawingContext.restore();
}

// Cache the Guardian's inner and outer rings separately, preserving their respective rotation baselines.
function getGuardRings(creature) {
  if (!lifeCache.enabled || typeof createGraphics !== "function") return null;
  if (creature.guardCache) return creature.guardCache;

  const bounds = lifeCache.bounds.Guardian;
  const stepMs = 1000 / lifeCache.updateTps;
  // Inner- and outer-ring caches use staggered refresh phases.
  const makeCache = (kind, phaseOffset) => {
    const graphics = createGraphics(bounds.width, bounds.height);
    graphics.pixelDensity(lifeCache.pixelDensity);
    graphics.clear();
    graphics.drawingContext.imageSmoothingEnabled = true;
    graphics.drawingContext.imageSmoothingQuality = "high";
    return {
      kind,
      graphics,
      width: bounds.width,
      height: bounds.height,
      updateTps: lifeCache.updateTps,
      phaseMs: (creature.seed + phaseOffset) % stepMs,
      lastTick: -1,
      anchorX: bounds.width * 0.5,
      anchorY: bounds.height * 0.5,
      baseLifeRot: creature.rot,
      baseRingRot: kind === "outer" ? creature.r1 : creature.r2,
    };
  };
  creature.guardCache = [
    makeCache("outer", 0),
    makeCache("inner", stepMs * 0.5),
  ];
  return creature.guardCache;
}

// The Guardian ring cache draws specified inner and outer layers and records baseline rotation so
// real-time frames can apply angular differences.
function cchGrdRngs(creature, ctx, cache) {
  const graphics = cache.graphics;
  graphics.clear();
  const svdP5Rend = p5.instance._renderer;
  const savedRenderer = _renderer;
  const mainContext = drawingContext;
  const originalX = creature.x;
  const originalY = creature.y;

  cache.anchorX = cache.width * 0.5 + (originalX - floor(originalX));
  cache.anchorY = cache.height * 0.5 + (originalY - floor(originalY));
  cache.baseLifeRot = creature.rot;
  cache.baseRingRot = cache.kind === "outer" ? creature.r1 : creature.r2;

  try {
    p5.instance._renderer = graphics._renderer;
    _renderer = graphics._renderer;
    drawingContext = graphics.drawingContext;
    creature.x = cache.anchorX;
    creature.y = cache.anchorY;
    creature.drawRingVector(ctx, cache.kind);
  } finally {
    creature.x = originalX;
    creature.y = originalY;
    p5.instance._renderer = svdP5Rend;
    _renderer = savedRenderer;
    drawingContext = mainContext;
  }
}

function drawGuardRings(creature, ctx) {
  const caches = getGuardRings(creature);
  if (!caches) {
    // Draw vector rings directly when the ring cache is unavailable.
    creature.rndrRngsOnly = true;
    try {
      window.LifeView.drawVector(creature, ctx);
    } finally {
      creature.rndrRngsOnly = false;
    }
    return;
  }

  const baseAlpha = drawingContext.globalAlpha;
  // Cache inner and outer rings in layers, redraw them during low-frequency texture updates,
  // and restore real-time movement through rotational differences on ordinary frames.
  for (const cache of caches) {
    refreshCache(cache, ctx.now, () => {
      cchGrdRngs(creature, ctx, cache);
    });
    const ringRotation = cache.kind === "outer" ? creature.r1 : creature.r2;
    const rotationDelta =
      creature.rot - cache.baseLifeRot + ringRotation - cache.baseRingRot;

    drawingContext.save();
    drawingContext.globalAlpha = baseAlpha;
    drawingContext.globalCompositeOperation = "source-over";
    // The cache is scaled and rotated; high-quality
    // interpolation reduces aliasing along fine-line edges.
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.imageSmoothingQuality = "high";
    drawingContext.translate(creature.x, creature.y);
    drawingContext.rotate(rotationDelta);
    drawingContext.drawImage(
      cache.graphics.elt,
      -cache.anchorX,
      -cache.anchorY,
      cache.width,
      cache.height
    );
    drawingContext.restore();
  }
}

// Releasing a cache also cancels pending refreshes and destroys its offscreen canvas,
// clearing graphical resources when an entity is removed.
function releaseCache(cache) {
  if (!cache) return;
  window.AppRuntime?.cancel("cacheRefresh", cache);
  const graphics = cache.graphics;
  if (graphics?.remove) graphics.remove();
  cache.graphics = null;
}

// Mark sprite and ring caches for refresh; attempt to
// rebuild immediately after clearing the static canvas.
function clearLifeCache(entity) {
  if (!entity) return false;
  if (entity.spriteCache) {
    window.AppRuntime?.cancel("cacheRefresh", entity.spriteCache);
    entity.spriteCache.lastTick = -1;
  }
  for (const cache of entity.guardCache || []) {
    window.AppRuntime?.cancel("cacheRefresh", cache);
    cache.lastTick = -1;
  }
  if (entity.staticCache?.canvas) {
    entity.staticCache.canvas.width = 0;
    entity.staticCache.canvas.height = 0;
    entity.staticCache = null;
    entity.prepStaticCache?.();
  }
  return true;
}

// Release offscreen canvases and scheduled tasks when an entity leaves the world.
function dropLifeCache(entity) {
  if (!entity) return;
  releaseCache(entity.spriteCache);
  entity.spriteCache = null;
  for (const cache of entity.guardCache || []) releaseCache(cache);
  entity.guardCache = null;
  if (entity.staticCache?.canvas) {
    entity.staticCache.canvas.width = 0;
    entity.staticCache.canvas.height = 0;
  }
  entity.staticCache = null;
  for (const cacheKey of [
    "bodyWaveCache",
    "motionCache",
    "blobWaveCache",
    "outlineCache",
    "waveCache",
  ]) {
    if (cacheKey in entity) entity[cacheKey] = null;
  }
}

// The pattern overlay for a lost participant briefly preserves the
// relationship's last position, then fades with the departure clock.
function drawLosPatOvr(now) {
  for (const entity of creatures) {
    if (
      entity.type === eco.lifeType.predator &&
      isVisible(entity)
    ) {
      entity.drawLostPaths(now);
    }
  }
}

function drawPathEndNtc(now) {
  lifeLog.render(now);
}

// Other species render through the base channel before specialized
// views overlay feedback, keeping compositing order stable.
function drawBasOthSpc(ctx) {
  for (const entity of creatures) {
    if (
      entity.type !== eco.lifeType.predator &&
      entity.type !== eco.lifeType.guardian &&
      !sessions.some(
        (session) => session.deepFocus.target === entity
      ) &&
      isVisible(entity)
    ) {
      drawDomnLife(entity, ctx);
    }
  }
  for (const parasite of parasites) {
    if (isVisible(parasite)) drawDomnLife(parasite, ctx);
  }
}

// Render the Predator body cache separately from its dynamic lure.
function drawBasePrdt(ctx) {
  for (const entity of creatures) {
    if (
      entity.type === eco.lifeType.predator &&
      !sessions.some(
        (session) => session.deepFocus.target === entity
      ) &&
      isVisible(entity)
    ) {
      drawDomnLife(entity, ctx);
    }
  }
}

// 4. When capture gradually becomes pressure across the entire environment
// I let the consequences of capture enter the entire image,
// so one person's lingering also changes the viewing conditions of others.
const prdtDomn = {
  level: 0,
  targetLevel: 0,
  completedUnits: 0,
  partialUnits: 0,
  visualLevel: 0,
  bgLvl: 0,
  bgTgtLvl: 0,
  bgSpcHold: false,
  bgRest: false,
  bgRestoreMs: 0,
  bgRestoreStart: 0,
  bgDark: 0,
  predatorScale: 1,
  predOverlayA: 0,
  prdtSpdScl: 1,
  othrSpdScl: 1,
  otherScale: 1,
  otherAlpha: 1,
  parasiteScale: 1,
  parasiteAlpha: 1,
  backgroundCss: "",
};
let domnSrcCnvs = null;
let domnBlurCnvs = null;
let domDthrCnvs = null;
let domDthrPttrn = null;

// Combine completed capture counts with current progress to update environmental pressure.
// This function was modified with the assistance of ChatGPT.
function updPrdtDomn() {
  const predators = creatures.filter(
    (entity) => entity.type === eco.lifeType.predator
  );
  prdtDomn.completedUnits = predators.reduce(
    (total, entity) => total + entity.viewCount,
    0
  );
  prdtDomn.partialUnits = predators.reduce(
    (total, entity) =>
      total + (entity.captureDone ? 0 : entity.cptrProg),
    0
  );
  prdtDomn.targetLevel = clamp(
    (prdtDomn.completedUnits +
      prdtDomn.partialUnits) /
      capture.domnIxCap,
    0,
    1
  );
  prdtDomn.level = lerp(
    prdtDomn.level,
    prdtDomn.targetLevel,
    smoothA(capture.dominanceEase, frame.dt)
  );
  // Pressure follows smoothly, producing continuous changes in full-screen brightness and scale.
  if (
    abs(prdtDomn.level - prdtDomn.targetLevel) <
    0.0001
  ) {
    prdtDomn.level = prdtDomn.targetLevel;
  }

  const ixUnts =
    prdtDomn.level * capture.domnIxCap;
  prdtDomn.visualLevel = prdtDomn.level;
  const fcsdPrdt = sessions
    .filter((session) => session.enabled)
    .map((session) => session.hunt.focused)
    .filter(Boolean);
  const activeBgSource = fcsdPrdt.reduce(
    (maximum, entity) =>
      max(maximum, entity.captureDone ? 1 : entity.cptrProg),
    0
  );
  const isPathVisible = predators.some(
    (entity) =>
      entity.captureDone && entity.pathBreakup < 1
  );
  // Retain the background effect while capture paths remain visible;
  // release it when paths have ended and there are no capture targets.
  if (isPathVisible) {
    prdtDomn.bgSpcHold = true;
  } else if (!fcsdPrdt.length) {
    prdtDomn.bgSpcHold = false;
  }
  const bgSrc = prdtDomn.bgSpcHold
    ? 1
    : activeBgSource;
  prdtDomn.bgTgtLvl = clamp(
    bgSrc,
    0,
    1
  );
  // Use an independent recovery curve when pressure falls to zero.
  if (
    prdtDomn.bgTgtLvl <= 0 &&
    prdtDomn.bgLvl > 0
  ) {
    if (!prdtDomn.bgRest) {
      prdtDomn.bgRest = true;
      prdtDomn.bgRestoreMs = 0;
      prdtDomn.bgRestoreStart =
        prdtDomn.bgLvl;
    }
    prdtDomn.bgRestoreMs +=
      frame.dt * (1000 / 60);
    prdtDomn.bgLvl =
      prdtDomn.bgRestoreStart *
      bgRestoreLeft(
        prdtDomn.bgRestoreMs
      );
  } else {
    prdtDomn.bgRest = false;
    prdtDomn.bgRestoreMs = 0;
    prdtDomn.bgRestoreStart = 0;
    prdtDomn.bgLvl = lerp(
      prdtDomn.bgLvl,
      prdtDomn.bgTgtLvl,
      smoothA(capture.domBgEase, frame.dt)
    );
  }
  if (
    abs(
      prdtDomn.bgLvl -
        prdtDomn.bgTgtLvl
    ) < 0.0001
  ) {
    prdtDomn.bgLvl =
      prdtDomn.bgTgtLvl;
  }
  prdtDomn.bgDark =
    capture.domBgDarkMax *
    prdtDomn.bgLvl;
  // Map the same pressure unit independently to each species' scale, opacity, and speed,
  // contrasting Predator expansion with the contraction of other lifeforms.
  prdtDomn.predatorScale = min(
    capture.prdtSclMax,
    1 +
      capture.prdtSclGain *
        ixUnts
  );
  prdtDomn.predOverlayA = min(
    capture.prdtAlphMax,
    capture.prdtAlphGain *
      ixUnts
  );
  prdtDomn.prdtSpdScl = lerp(
    1,
    capture.domPredSpdMax,
    prdtDomn.bgLvl
  );
  prdtDomn.othrSpdScl = lerp(
    1,
    capture.domnOthrSpdMin,
    prdtDomn.bgLvl
  );
  // Set minimum contraction and fading values for the remaining species.
  prdtDomn.otherScale = max(
    capture.domnOthrSclMin,
    1 -
      capture.otherScaleDrop *
        ixUnts
  );
  prdtDomn.otherAlpha = max(
    capture.domnOthAlpMin,
    1 -
      capture.otherAlphaDrop *
        ixUnts
  );
  prdtDomn.parasiteScale = min(
    capture.domParsSclMax,
    1 +
      capture.parsSclGain *
        ixUnts
  );
  prdtDomn.parasiteAlpha = min(
    capture.domParsAMax,
    1 +
      capture.parsAlphGain *
        ixUnts
  );
  // Parasite amplification belongs to participant session state;
  // smooth it per session before the rendering stage reads it.
  for (const session of sessions) {
    const state = session.hunt;
    state.paraScaleUp = lerp(
      state.paraScaleUp,
      state.parasiteBoost,
      smoothA(capture.dominanceEase, frame.dt)
    );
    if (
      abs(state.paraScaleUp - state.parasiteBoost) < 0.0001
    ) {
      state.paraScaleUp = state.parasiteBoost;
    }
  }
}

// Background color changes with ecological pressure and gradually recovers as pressure recedes.
function applyDomnBg() {
  if (!glowLayersOn) {
    background(eco.bgColor);
    return;
  }
  if (typeof document === "undefined") return;
  const cssColor = eco.bgColor;
  if (cssColor === prdtDomn.backgroundCss) return;
  prdtDomn.backgroundCss = cssColor;
  document.documentElement.style.bgClr = cssColor;
  document.body.style.bgClr = cssColor;
}

function domGrdnCrv(value) {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Calculate remaining background recovery in two stages according to elapsed time.
function bgRestoreLeft(elapsedMs) {
  const halfMs = capture.domBgRestoreMs;
  const completeMs =
    capture.bgRestoreMs44;
  if (elapsedMs <= halfMs) {
    return lerp(
      1,
      0.5,
      domGrdnCrv(elapsedMs / halfMs)
    );
  }
  if (elapsedMs < completeMs) {
    return lerp(
      0.5,
      0,
      domGrdnCrv(
        (elapsedMs - halfMs) / (completeMs - halfMs)
      )
    );
  }
  return 0;
}

// Gradient stops add stable jitter between primary colors.
function addDomStops(
  gradient,
  red,
  green,
  blue,
  maximumAlpha
) {
  const steps = 32;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const eased = domGrdnCrv(t);
    gradient.addColorStop(
      t,
      `rgba(${red}, ${green}, ${blue}, ${maximumAlpha * eased})`
    );
  }
}

// Generate the jitter texture on a small canvas and reuse it.
function makeDomDither(context) {
  const tileSize = 64;
  const tile = document.createElement("canvas");
  tile.width = tileSize;
  tile.height = tileSize;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return null;
  const pixels = tileContext.createImageData(tileSize, tileSize);
  let state = 0x6d2b79f5;
  for (let index = 0; index < tileSize * tileSize; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const offset = index * 4;
    pixels.data[offset] = 0;
    pixels.data[offset + 1] = 0;
    pixels.data[offset + 2] = 0;
    pixels.data[offset + 3] = state >>> 24;
  }
  tileContext.putImageData(pixels, 0, 0);
  return context.createPattern(tile, "repeat");
}

function drawDomnDthr(
  centerX,
  centerY,
  clearRadius,
  outerRadius,
  level
) {
  // Create the jitter layer when environmental pressure is visible; at low intensity,
  // skip the offscreen-canvas cost entirely.
  const maximumAlpha =
    capture.domBgDitherA * level;
  if (maximumAlpha <= 0.0001 || typeof document === "undefined") return;
  const sourceCanvas = drawingContext.canvas;
  const pixelWidth = sourceCanvas?.width || 0;
  const pixelHeight = sourceCanvas?.height || 0;
  if (pixelWidth <= 0 || pixelHeight <= 0 || width <= 0 || height <= 0) {
    return;
  }
  if (!domDthrCnvs) {
    domDthrCnvs = document.createElement("canvas");
  }
  // The offscreen canvas follows actual pixel dimensions and rebuilds its pattern cache after resizing.
  if (
    domDthrCnvs.width !== pixelWidth ||
    domDthrCnvs.height !== pixelHeight
  ) {
    domDthrCnvs.width = pixelWidth;
    domDthrCnvs.height = pixelHeight;
    domDthrPttrn = null;
  }
  const context = domDthrCnvs.getContext("2d");
  if (!context) return;
  if (!domDthrPttrn) {
    domDthrPttrn = makeDomDither(context);
  }
  if (!domDthrPttrn) return;

  const scaleX = pixelWidth / width;
  const scaleY = pixelHeight / height;
  const radiusScale = (scaleX + scaleY) * 0.5;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = maximumAlpha;
  context.fillStyle = domDthrPttrn;
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  context.globalAlpha = 1;
  // The radial mask preserves peripheral noise and clears the gaze center,
  // concentrating Predator capture pressure at the edge of the visual field.
  context.globalCompositeOperation = "destination-in";
  const mask = context.createRadialGradient(
    centerX * scaleX,
    centerY * scaleY,
    clearRadius * radiusScale,
    centerX * scaleX,
    centerY * scaleY,
    outerRadius * radiusScale
  );
  addDomStops(mask, 0, 0, 0, 1);
  context.fillStyle = mask;
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  context.restore();

  drawingContext.save();
  drawingContext.globalCompositeOperation = "source-over";
  drawingContext.drawImage(
    domDthrCnvs,
    0,
    0,
    pixelWidth,
    pixelHeight,
    0,
    0,
    width,
    height
  );
  drawingContext.restore();
}

// Vignetting and local blur translate accumulated capture into environmental pressure
function drawDomVign() {
  if (ixUserCount > 1) return;
  const darkness = prdtDomn.bgDark;
  if (darkness <= 0.001) return;
  const camera = ixCamSnapshot();
  const centerX = camera?.gaze?.x ?? width * 0.5;
  const centerY = camera?.gaze?.y ?? height * 0.5;
  const clearRadius = capture.domBgClearR;
  const outerRadius = max(
    clearRadius + 1,
    capture.domBgOuterR
  );
  const gradient = drawingContext.createRadialGradient(
    centerX,
    centerY,
    clearRadius,
    centerX,
    centerY,
    outerRadius
  );
  addDomStops(gradient, 0, 0, 0, darkness);
  drawingContext.save();
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();
  drawDomnDthr(
    centerX,
    centerY,
    clearRadius,
    outerRadius,
    prdtDomn.bgLvl
  );
}

// Accumulated Predator pressure becomes a low-frequency environmental blur,
// allowing local capture to gradually affect the shared ecology.
// This function was modified with the assistance of ChatGPT.
function drawDomnBlur() {
  if (ixUserCount > 1) return;
  const level = prdtDomn.bgLvl;
  if (level <= 0.001 || typeof document === "undefined") return;
  const sourceCanvas = drawingContext.canvas;
  if (!sourceCanvas || width <= 0 || height <= 0) return;
  // Cache the source copy and blurred result separately.
  if (!domnSrcCnvs) {
    domnSrcCnvs = document.createElement("canvas");
  }
  if (!domnBlurCnvs) {
    domnBlurCnvs = document.createElement("canvas");
  }
  const pixelWidth = sourceCanvas.width;
  const pixelHeight = sourceCanvas.height;
  if (
    domnSrcCnvs.width !== pixelWidth ||
    domnSrcCnvs.height !== pixelHeight ||
    domnBlurCnvs.width !== pixelWidth ||
    domnBlurCnvs.height !== pixelHeight
  ) {
    domnSrcCnvs.width = pixelWidth;
    domnSrcCnvs.height = pixelHeight;
    domnBlurCnvs.width = pixelWidth;
    domnBlurCnvs.height = pixelHeight;
  }

  const sourceContext = domnSrcCnvs.getContext("2d");
  const blurContext = domnBlurCnvs.getContext("2d");
  if (!sourceContext || !blurContext) return;
  const camera = ixCamSnapshot();
  const centerX = camera?.gaze?.x ?? width * 0.5;
  const centerY = camera?.gaze?.y ?? height * 0.5;
  const clearRadius = capture.domBgClearR;
  const outerRadius = max(
    clearRadius + 1,
    capture.domBgOuterR
  );
  const scaleX = pixelWidth / width;
  const scaleY = pixelHeight / height;
  const radiusScale = (scaleX + scaleY) * 0.5;

  sourceContext.save();
  sourceContext.setTransform(1, 0, 0, 1, 0, 0);
  sourceContext.clearRect(0, 0, pixelWidth, pixelHeight);
  sourceContext.drawImage(sourceCanvas, 0, 0);
  sourceContext.restore();

  // Convert blur radius according to actual pixel density, preserving
  // a comparable visual range on high-density and standard displays.
  const blurRadius =
    capture.domBgBlurMax * level * radiusScale;
  blurContext.save();
  blurContext.setTransform(1, 0, 0, 1, 0, 0);
  blurContext.clearRect(0, 0, pixelWidth, pixelHeight);
  blurContext.globalCompositeOperation = "source-over";
  blurContext.filter = `blur(${blurRadius}px)`;
  blurContext.drawImage(domnSrcCnvs, 0, 0);
  blurContext.filter = "none";
  blurContext.globalCompositeOperation = "destination-in";
  const mask = blurContext.createRadialGradient(
    centerX * scaleX,
    centerY * scaleY,
    clearRadius * radiusScale,
    centerX * scaleX,
    centerY * scaleY,
    outerRadius * radiusScale
  );
  addDomStops(mask, 0, 0, 0, 1);
  blurContext.fillStyle = mask;
  blurContext.fillRect(0, 0, pixelWidth, pixelHeight);
  blurContext.restore();

  drawingContext.save();
  // Replace the original canvas's periphery with the blurred
  // copy while retaining original clarity at the center.
  drawingContext.globalCompositeOperation = "destination-out";
  const replMask = drawingContext.createRadialGradient(
    centerX,
    centerY,
    clearRadius,
    centerX,
    centerY,
    outerRadius
  );
  addDomStops(replMask, 0, 0, 0, 1);
  drawingContext.fillStyle = replMask;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.globalCompositeOperation = "source-over";
  drawingContext.drawImage(
    domnBlurCnvs,
    0,
    0,
    pixelWidth,
    pixelHeight,
    0,
    0,
    width,
    height
  );
  drawingContext.restore();
}

// Synchronize the effects of ecological pressure on lifeform scale, opacity, and movement
function updLifWitDom(entity, ctx) {
  updtGuardBrth(entity, ctx.now);
  care.updateRepair(entity, ctx.now);
  const lifeState = updtLifeMech(entity, ctx);
  const orgnMoveDt = ctx.movementDt;
  const lifeMoveMul = lifeState?.movementScale ?? 1;
  if (
    entity.guardSeedBirth &&
    entity.careBirth
  ) {
    ctx.movementDt = 0;
  } else if (entity.type === eco.lifeType.predator) {
    ctx.movementDt =
      orgnMoveDt *
      prdtDomn.prdtSpdScl *
      lifeMoveMul;
  } else {
    ctx.movementDt =
      orgnMoveDt *
      prdtDomn.othrSpdScl *
      lifeMoveMul;
  }
  entity.update(ctx);
  if (lifeState && Number.isFinite(entity.b)) {
    entity.b = 1 + (entity.b - 1) * (lifeState.pulseScale ?? 1);
  }
  ctx.movementDt = orgnMoveDt;
  if (
    entity.guardSeedBirth &&
    !entity.careBirth
  ) {
    entity.guardSeedBirth = false;
  }
}

// Compose the rendering effects of care, lifecycle, and capture pressure.
// This function was modified with the assistance of ChatGPT.
function drawDomnLife(entity, ctx) {
  push();
  try {
    const position = worldPos(entity);
    // Reversion animation takes priority over the Guardian care position;
    // use the lifeform's world coordinates when neither is present.
    const ecologyVisualX = Number.isFinite(
      entity.returnVisX
    )
      ? entity.returnVisX
      : Number.isFinite(entity.guardVisX)
        ? entity.guardVisX
        : position.x;
    const ecologyVisualY = Number.isFinite(
      entity.returnVisY
    )
      ? entity.returnVisY
      : Number.isFinite(entity.guardVisY)
        ? entity.guardVisY
        : position.y;
    const repairScale =
      entity.type === eco.lifeType.guardian &&
      Number.isFinite(entity.guardRprScl)
        ? entity.guardRprScl
        : 1;
    const repairAlpha =
      entity.type === eco.lifeType.guardian &&
      Number.isFinite(entity.guardRprAlph)
        ? entity.guardRprAlph
        : 1;
    const spcCut = care.getSpeciesFade(entity.type);
    const lifeState = ensureLifeState(entity, ctx.now);
    const lifeScale =
      (lifeState?.scale ?? 1) *
      (Number.isFinite(entity.lifeTrnsScl)
        ? entity.lifeTrnsScl
        : 1);
    const lifeAlpha =
      (lifeState?.alpha ?? 1) *
      (Number.isFinite(entity.lifeTrnsAlph)
        ? entity.lifeTrnsAlph
        : 1);
    // Care, birth, repair, species pressure, and lifecycle each contribute a scale,
    // multiplied at the end to preserve their independent sources.
    const ecologyScale =
      (Number.isFinite(entity.careScale)
        ? entity.careScale
        : 1) *
      (Number.isFinite(entity.guardBirthMul)
        ? entity.guardBirthMul
        : 1) *
      (Number.isFinite(entity.guardCareScl)
        ? entity.guardCareScl
        : 1) *
      repairScale *
      spcCut.scale *
      lifeScale;
    // Opacity uses the same compositional boundaries as scale,
    // allowing terminal fade-out to override temporary care highlighting.
    const ecologyAlpha =
      (Number.isFinite(entity.careAlpha)
        ? entity.careAlpha
        : 1) *
      (Number.isFinite(entity.guardCareAlph)
        ? entity.guardCareAlph
        : 1) *
      (Number.isFinite(entity.guardBrthAlph)
        ? entity.guardBrthAlph
        : 1) *
      repairAlpha *
      spcCut.alpha *
      lifeAlpha;
    // Move to the current visual position first, then scale around the world anchor.
    translate(ecologyVisualX - position.x, ecologyVisualY - position.y);
    translate(position.x, position.y);
    scale(ecologyScale);
    translate(-position.x, -position.y);
    drawingContext.globalAlpha *= ecologyAlpha;
    drawAudnGlow(entity, ctx, position);
    const regrClrMix = clamp(
      Number(entity.grdRgrssMix) || 0,
      0,
      1
    );
    // Append the reversion color filter after existing filters,
    // preserving visual treatment established by other ecological states.
    if (regrClrMix > 0.001) {
      const regrFltr = care.regrFltr(
        regrClrMix
      );
      const currentFilter = drawingContext.filter;
      drawingContext.filter =
        currentFilter && currentFilter !== "none"
          ? `${currentFilter} ${regrFltr}`
          : regrFltr;
    }
    // Predators are the source of the environment's dominance effect.
    if (entity.type === eco.lifeType.predator) {
      window.LifeView.draw(entity, ctx);
      return;
    }
    translate(position.x, position.y);
    const dominanceScale =
      entity.type === eco.lifeType.parasite
        ? prdtDomn.parasiteScale
        : prdtDomn.otherScale;
    scale(dominanceScale);
    translate(-position.x, -position.y);
    if (entity.type !== eco.lifeType.parasite) {
      drawingContext.globalAlpha *= prdtDomn.otherAlpha;
    }
    window.LifeView.draw(entity, ctx);
  } finally {
    pop();
  }
}

// 5. Participants' relationships meet in the final glow
// Aggregate target state from each session to find the lifeforms currently touched by attention.
function hasAudnImpct(entity) {
  for (const session of sessions) {
    if (!session?.enabled) continue;
    if (session.lures?.includes(entity)) {
      return true;
    }
    const state = session.careState;
    if (!state || state.phase === "idle") continue;
    if (
      state.candidate === entity ||
      state.source === entity ||
      state.participants?.includes(entity)
    ) {
      return true;
    }
  }
  return false;
}

function rmrBrthGlowEnd(entity) {
  const birth = entity?.splitBirth;
  if (!birth || birth.diff) return null;
  return (
    birth.startAt +
    max(0, birth.birthDuration || 0) +
    roamCfg.spltBrtGloHolM
  );
}

// Roamer glow covers division preparation, release, and birth feedback;
// allow the shared glow to fade only after these phases end.
function isRmrGlowActv(entity, now) {
  const birth = entity?.splitBirth;
  if (!birth) return false;
  if (birth.diff) return true;
  const glowEndAt = rmrBrthGlowEnd(entity);
  return Number.isFinite(glowEndAt) && now < glowEndAt;
}

function rmrGlowEndd(entity, startAt, endAt) {
  const glowEndAt = rmrBrthGlowEnd(entity);
  return Boolean(
    Number.isFinite(glowEndAt) && glowEndAt > startAt && glowEndAt <= endAt
  );
}

function glowEnddBtwn(entity, startAt, endAt) {
  const glowEndAt = entity?.audnImpGloUnt;
  return Boolean(
    Number.isFinite(glowEndAt) && glowEndAt > startAt && glowEndAt <= endAt
  );
}

// Care-change evaluation aggregates repair, birth, and reversion state
// so the shared glow responds to ecological results that remain visible.
function careEnttyChng(entity) {
  if (!entity) return false;
  if (
    entity.grdLmtScl ||
    entity.guardRprTx ||
    entity.guardCareBst ||
    entity.careBirth ||
    entity.guardSeedBirth
  ) {
    return true;
  }
  return sessions.some((session) => {
    const state = session?.careState;
    if (!session?.enabled || !state || state.phase === "idle") return false;
    return state.limitLinks?.some(
      (link) => link.target === entity && link.state === "clearing"
    );
  });
}

// Determine a Guardian's glow role from active care sessions,
// prioritizing its source role when adjusting size and opacity.
function careGlowRole(entity) {
  if (entity?.type !== eco.lifeType.guardian) return null;
  let role = null;
  for (const session of sessions) {
    const state = session?.careState;
    if (!session?.enabled || !state || state.phase === "idle") continue;
    const userIndx = state.participants?.indexOf(entity) ?? -1;
    if (state.source === entity || userIndx === 0) return "source";
    if (userIndx > 0) role = "participant";
  }
  return role;
}

// Determine glow roles from relationships of care first, then from ordinary interactions.
function userGlowRole(entity) {
  const guardianRole = careGlowRole(entity);
  if (guardianRole) return guardianRole;
  for (const session of sessions) {
    if (!session?.enabled) continue;
    if (
      session.lures?.includes(entity) ||
      session.parasites?.has(entity) ||
      session.roamLock?.target === entity ||
      session.deepFocus?.target === entity
    ) {
      return "source";
    }
  }
  return "consequence";
}

// Clear shared-glow roles and encounter markers so the
// next interaction can determine glow intensity anew.
function clrAudnGlow(entity) {
  delete entity.audnImpGloRol;
  delete entity.audnEncnGlow;
}

// Aggregate care phases and lifeform changes to update the current glow's sustained intensity
function updateCareGlow(entity, ctx) {
  if (entity?.type !== eco.lifeType.guardian) {
    return { progress: 0, role: null };
  }
  const activeRole = careGlowRole(entity);
  // Preserve the previous role after an interaction ends until fade-out completes.
  let role = activeRole || entity.careGlowRole || null;
  const previous = clamp(
    Number(entity.careGlowProg) || 0,
    0,
    1
  );
  const previousAt = Number.isFinite(
    entity.careGloUpdAt
  )
    ? entity.careGloUpdAt
    : ctx.now;
  const elapsedMs = clamp(ctx.now - previousAt, 0, 80);
  const glowConfig = userGlowCfg;
  if (activeRole) {
    delete entity.careGlowOffAt;
  } else if (
    previous > 0.0001 &&
    !Number.isFinite(entity.careGlowOffAt)
  ) {
    entity.careGlowOffAt = ctx.now;
  }
  // A brief hold absorbs state jitter across frames before linear fade-out begins.
  const leaveHold = Boolean(
    !activeRole &&
      previous > 0.0001 &&
      ctx.now - entity.careGlowOffAt <
        glowConfig.leaveHoldMs
  );
  const duration = activeRole
    ? glowConfig.fadeInMs
    : glowConfig.fadeOutMs;
  const step = elapsedMs / max(1, duration);
  let next = activeRole
    ? min(1, previous + step)
    : leaveHold
      ? previous
      : max(0, previous - step);

  if (activeRole) {
    entity.careGlowRole = activeRole;
  } else if (next <= 0.0001) {
    next = 0;
    role = null;
    delete entity.careGlowRole;
    delete entity.careGlowOffAt;
  }
  entity.careGlowProg = next;
  entity.careGloUpdAt = ctx.now;
  if (next > 0.0001) {
    // Disable the shared gaze glow when a specialized care glow appears.
    entity.crowdGlow = 0;
    entity.userGlowAt = ctx.now;
    delete entity.glowOffAt;
    delete entity.userGloSkiHol;
    clrAudnGlow(entity);
  }
  return { progress: next, role };
}

// This function was modified with the assistance of ChatGPT.
function audnSrcPwr(entity, now) {
  if (!entity) return 0;
  // Cross-species shared events form the baseline intensity;
  // species-specific gaze feedback is added before the result is normalized.
  let strength = 0;
  const spcCut = guardTypeCuts[entity.type];
  if (spcCut?.active) strength = 1;
  if (
    hasAudnImpct(entity) ||
    careEnttyChng(entity) ||
    relAlert.regressions?.some(
      (regression) => regression.target === entity
    ) ||
    entity.grdRgrssMix > 0 ||
    (Number.isFinite(entity.audnImpGloUnt) &&
      now < entity.audnImpGloUnt)
  ) {
    strength = 1;
  }

  // Each branch reads visible interaction signals; current relationship
  // state determines the brightness of the shared gaze glow.
  if (entity.type === eco.lifeType.predator) {
    strength = max(
      strength,
      Number(entity.cptrProg) || 0,
      Number(entity.captureFxAlpha) || 0,
      entity.captureDone && entity.pathBreakup < 1 ? 1 : 0
    );
  } else if (entity.type === eco.lifeType.parasite) {
    const scrcTrnng = sessions.some(
      (session) =>
        session?.enabled &&
        abs(
          session.hunt.paraScaleUp -
            session.hunt.parasiteBoost
        ) > 0.0001
    );
    const attentionRange = max(
      0.001,
      parasiteCfg.attnAlphMax - entity.attnAlphBase
    );
    strength = max(
      strength,
      clamp(
        (entity.attentionAlpha - entity.attnAlphBase) /
          attentionRange,
        0,
        1
      ),
      entity.branchAnims?.length ? 1 : 0,
      entity.birthProgress < 1 || entity.migrating ? 1 : 0,
      scrcTrnng ? 1 : 0
    );
  } else if (entity.type === eco.lifeType.roamer) {
    // Roamer lateral movement, division, and aftereffects show that gaze influence is still propagating;
    // any active state can sustain the shared glow.
    strength = max(
      strength,
      Number(entity.attnPow) || 0,
      entity.splitProgress?.() || 0,
      entity.splitArmed || isRmrGlowActv(entity, now) ? 1 : 0
    );
  } else if (entity.type === eco.lifeType.deepDiver) {
    // A Deep Diver's shared growth belongs to session state and must be checked across participants.
    const sharedGrowth = sessions.some((session) => {
      const state = session?.deepFocus;
      if (!session?.enabled || state?.focusWaitN == null) {
        return false;
      }
      const growthElapsed = max(
        0,
        state.entryElapsedMs - fcsWndwBldMs()
      );
      return (
        growthElapsed > 0 &&
        growthElapsed < deepCfg.focusShapeMs
      );
    });
    strength = max(
      strength,
      entity.diffBirth ? 1 : 0,
      sharedGrowth ? 1 : 0
    );
  } else if (entity.type === eco.lifeType.guardian) {
    // A Guardian contributes to the glow according to its current response intensity.
    strength = max(strength, Number(entity.attnPow) || 0);
  }
  return clamp(strength, 0, 1);
}

// The glow follows current interaction intensity,
// lingering briefly after a relationship ends before fading.
// This function was modified with the assistance of ChatGPT.
function crowdGlow(entity, ctx) {
  const rawTarget = audnSrcPwr(entity, ctx.now);
  const previous = clamp(
    Number(entity.crowdGlow) || 0,
    0,
    1
  );
  // Store role and encounter markers when the glow illuminates,
  // allowing later promotion to a source or encounter glow.
  if (rawTarget > 0.0001) {
    const liveRole = userGlowRole(entity);
    const encounterGlow = isAudnGlowActv(entity, ctx.now);
    if (!entity.audnImpGloRol || liveRole === "source") {
      entity.audnImpGloRol = liveRole;
    }
    if (previous <= 0.0001) {
      entity.audnEncnGlow = encounterGlow;
    } else if (encounterGlow) {
      entity.audnEncnGlow = true;
    }
  }
  const previousAt = Number.isFinite(entity.userGlowAt)
    ? entity.userGlowAt
    : ctx.now;
  const elapsedMs = clamp(ctx.now - previousAt, 0, 80);
  const glowConfig = userGlowCfg;
  const decreasing = rawTarget < previous - 0.0001;
  // If a lifeform phase ends between frames, skip the departure hold and remove stale feedback promptly.
  if (
    decreasing &&
    ((entity.type === eco.lifeType.roamer &&
      rmrGlowEndd(entity, previousAt, ctx.now)) ||
      glowEnddBtwn(entity, previousAt, ctx.now))
  ) {
    entity.userGloSkiHol = true;
  }
  if (rawTarget > previous + 0.0001) {
    delete entity.glowOffAt;
    delete entity.userGloSkiHol;
  } else if (
    decreasing &&
    !Number.isFinite(entity.glowOffAt)
  ) {
    entity.glowOffAt = ctx.now;
  }
  const leaveHold = Boolean(
    decreasing &&
      !entity.userGloSkiHol &&
      ctx.now - entity.glowOffAt <
        glowConfig.leaveHoldMs
  );
  // Preserve current intensity during the hold, then resume following the new target value.
  const target = leaveHold ? previous : rawTarget;
  const duration =
    target > previous ? glowConfig.fadeInMs : glowConfig.fadeOutMs;
  const step = elapsedMs / max(1, duration);
  const next =
    target > previous
      ? min(target, previous + step)
      : max(target, previous - step);
  entity.crowdGlow = next;
  entity.userGlowAt = ctx.now;
  if (next <= 0.0001 || rawTarget >= previous - 0.0001) {
    delete entity.glowOffAt;
    delete entity.userGloSkiHol;
  }
  if (next <= 0.0001) clrAudnGlow(entity);
  return next;
}

function isAudnGlowActv(entity, now) {
  // Check cross-species care and reversion events first; these shared
  // relationships take priority over individual species' gaze state.
  const spcCut = guardTypeCuts[entity.type];
  if (
    spcCut?.active ||
    careEnttyChng(entity) ||
    relAlert.regressions?.some(
      (regression) => regression.target === entity
    ) ||
    entity.grdRgrssMix > 0 ||
    (Number.isFinite(entity.audnImpGloUnt) &&
      now < entity.audnImpGloUnt)
  ) {
    return true;
  }
  const guardCareOn = sessions.some((session) => {
    const state = session?.careState;
    if (!session?.enabled || !state || state.phase === "idle") return false;
    return Boolean(
      state.source === entity ||
        state.participants?.includes(entity)
    );
  });
  if (guardCareOn) return true;

  // Each species reports states that continue to produce visible feedback.
  if (entity.type === eco.lifeType.predator) {
    return Boolean(
      entity.cptrProg > 0 ||
        entity.captureFxAlpha > 0 ||
        (entity.captureDone && entity.pathBreakup < 1)
    );
  }
  if (entity.type === eco.lifeType.parasite) {
    return Boolean(
      entity.branchAnims?.length ||
        entity.birthProgress < 1 ||
        entity.migrating ||
        sessions.some(
          (session) =>
            session?.enabled &&
            abs(
              session.hunt.paraScaleUp -
                session.hunt.parasiteBoost
            ) > 0.0001
        )
    );
  }
  if (entity.type === eco.lifeType.roamer) {
    return Boolean(
      entity.splitProgress?.() > 0 ||
        entity.splitArmed ||
        isRmrGlowActv(entity, now)
    );
  }
  if (entity.type === eco.lifeType.deepDiver) {
    return Boolean(
      entity.focusProgress > 0 ||
        entity.encnActv ||
        entity.diffBirth
    );
  }
  return false;
}

function rmrUserRad(entity) {
  // Include the configured orbital breathing amplitude in the default radius.
  const fallOrbRad =
    max(
      91 * (1 + roamCfg.orbitBreathAmp),
      86 * (1 + roamCfg.orbitBreathAmp)
    ) +
    roamCfg.orbitDriftAmp +
    8 *
      roamCfg.arrowScale *
      roamCfg.arrowLitScale *
      (1 + roamCfg.orbitSizeAmp);
  let localRadius = fallOrbRad;
  for (const item of entity.orbitItems || []) {
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
    const dotRadius = max(
      0,
      Number(item.dotSize) || roamCfg.arrowDotSize
    ) * 0.5;
    const arrowRadius =
      8 *
      (Number(item.arrowScale) || roamCfg.arrowScale) *
      max(1, roamCfg.arrowScaleX);
    localRadius = max(
      localRadius,
      Math.hypot(item.x, item.y) + max(dotRadius, arrowRadius)
    );
  }
  const renderScale =
    eco.drawScale *
    (entity.sz || 1) *
    scaleOf(eco.lifeType.roamer) *
    (entity.b || 1) *
    (entity.splitGrowMul ?? 1) *
    (entity.deathScale ?? 1) *
    prdtDomn.otherScale;
  return clamp(localRadius * renderScale, 34, 300);
}

function parsUserRad(entity) {
// Use an empirical radius before the cache is ready so
// a lifeform has stable bounds on its first appearance.
  const fallbackRadius = clamp(
    38 *
      (entity.s || 1) *
      (entity.host?.sz || 1) *
      (1 + hunt.paraScaleUp),
    24,
    66
  );
  const bounds = entity.staticCache || entity.getSttcBnds?.();
  if (
    !bounds ||
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height)
  ) {
    return fallbackRadius;
  }
  const right = bounds.minX + bounds.width;
  const bottom = bounds.minY + bounds.height;
  // Use the greatest distance from the cache-bound corners
  // to the local origin to cover irregular branches.
  const localRadius = max(
    Math.hypot(bounds.minX, bounds.minY),
    Math.hypot(right, bounds.minY),
    Math.hypot(bounds.minX, bottom),
    Math.hypot(right, bottom)
  );
  const renderScale =
    eco.drawScale *
    (entity.s || 1) *
    (entity.host?.sz || 1) *
    scaleOf(eco.lifeType.parasite) *
    (1 + hunt.paraScaleUp) *
    prdtDomn.parasiteScale *
    lerp(0.5, 1, clamp(entity.birthProgress ?? 1, 0, 1));
  return clamp(localRadius * renderScale, 24, 180);
}

// Calculate the current baseline visual radius from Predator body and tail state.
function prdtBaseRad(entity) {
  return clamp(
    48 * (entity.sz || 1) * capture.hitRadiusScale,
    30,
    98
  );
}

// A Deep Diver's baseline radius includes body size and newly added ring layers,
// expanding hit and glow ranges as sustained attention grows.
function deepDvrBaseRad(entity) {
  const focusSizeScale =
    1 +
    effcFcsN(entity) *
      deepCfg.focusSizeGain;
  return clamp(
    54 *
      (entity.sz || 1) *
      (entity.diffGrwthScl ?? 1) *
      focusSizeScale *
      deepFocusScale(entity),
    30,
    110
  );
}

function careBaseRadius(entity) {
  return clamp(62 * (entity.sz || 1), 32, 88);
}

// Use species-specific baseline ranges so glows fit their visual scale
function audienceBaseR(entity) {
  if (entity.type === eco.lifeType.predator) {
    return prdtBaseRad(entity);
  }
  if (entity.type === eco.lifeType.roamer) {
    return rmrUserRad(entity);
  }
  if (entity.type === eco.lifeType.deepDiver) {
    return deepDvrBaseRad(entity);
  }
  if (entity.type === eco.lifeType.guardian) {
    return care.baseRadius(entity);
  }
  if (entity.type === eco.lifeType.parasite) {
    return parsUserRad(entity);
  }
  return max(1, infoRadius(entity));
}

function isDeepGlowActv(entity) {
  return Boolean(
    entity?.type === eco.lifeType.deepDiver &&
      (entity.attnGlowIn > 0 ||
        entity.attnGlowPow > 0 ||
        entity.focusProgress > 0 ||
        entity.encnActv)
  );
}

// Draw the shared gaze glow with a radial gradient on an independent layer.
function drawUserGlow(position, radius, alpha, color) {
  drawingContext.save();
  drawingContext.globalCompositeOperation = "screen";
  softGlow.drawRadialGradient(drawingContext, {
    x: position.x,
    y: position.y,
    radius,
    alpha,
    color,
  });
  drawingContext.restore();
}

// Compose the final glow from individual influence, shared gaze, and care feedback
// This function was modified with the assistance of ChatGPT.
function drawAudnGlow(entity, ctx, position = worldPos(entity)) {
  // When a Deep Diver already has gaze or focus feedback, clear and skip the shared glow.
  if (isDeepGlowActv(entity)) {
    entity.crowdGlow = 0;
    entity.userGlowAt = ctx.now;
    delete entity.glowOffAt;
    delete entity.userGloSkiHol;
    clrAudnGlow(entity);
    return;
  }
  const glowConfig = userGlowCfg;
  // Select glow size and opacity by species, then adjust them according to pulsing and role.
  const glowScale =
    entity.type === eco.lifeType.parasite
      ? parasiteCfg.userGlowScl
      : entity.type === eco.lifeType.roamer
        ? roamCfg.userGlowScl
      : glowConfig.scale;
  const glowAlpha =
    entity.type === eco.lifeType.roamer
      ? roamCfg.userGlowAlph
      : entity.type === eco.lifeType.deepDiver
        ? deepCfg.userGlowAlph
        : glowConfig.alpha;
  // Relational care takes priority over ordinary shared gaze.
  const guardianGlow = updateCareGlow(entity, ctx);
  if (guardianGlow.progress > 0.0001) {
    const eased = deepFcsGrwth(guardianGlow.progress);
    const source = guardianGlow.role === "source";
    const pulse = softGlow.pulse(
      ctx.now,
      glowConfig.pulseSpeed
    );
    const glow = softGlow.participantMetrics({
      baseRadius: max(1, audienceBaseR(entity)),
      pulseValue: pulse,
      scale: glowScale,
      pulseScale: glowConfig.pulseScale,
      alpha: glowAlpha,
      radiusScale: source ? glowConfig.sourceScale : 1,
      alphaScale: source ? glowConfig.srcAlphScl : 1,
      opacity: eased,
    });
    drawUserGlow(
      position,
      glow.radius,
      glow.alpha,
      glowConfig.color
    );
    return;
  }
  // After the care glow ends, read ordinary interaction
  // intensity and skip rendering when it approaches zero.
  const progress = crowdGlow(entity, ctx);
  if (progress <= 0.0001) return;
  const eased = deepFcsGrwth(progress);
  const role =
    entity.audnImpGloRol || userGlowRole(entity);
  const source = role === "source";
  // Encounters and ordinary viewing use different opacity limits.
  const alphaScale = entity.audnEncnGlow
    ? glowConfig.fcsAlphScl
    : glowConfig.smplAlphScl;
  const pulse = softGlow.pulse(ctx.now, glowConfig.pulseSpeed);
  const glow = softGlow.participantMetrics({
    baseRadius: max(1, audienceBaseR(entity)),
    pulseValue: pulse,
    scale: glowScale,
    pulseScale: glowConfig.pulseScale,
    alpha: glowAlpha,
    radiusScale: source ? glowConfig.sourceScale : 1,
    alphaScale: source ? glowConfig.srcAlphScl : 1,
    opacity: eased * alphaScale,
  });
  drawUserGlow(
    position,
    glow.radius,
    glow.alpha,
    glowConfig.color
  );
}

// 6. Glows, lifeform contours, and environmental atmosphere return to the main canvas
// bootstrap.js uses window.WorldView to determine the invocation order of rendering layers.
window.WorldView = Object.freeze({
  setupGlowLayers: stpGlowLyrs,
  beginCacheFrame: bgnCchFrm,
  beginArrowGlowFrame: bgnArrwGlowFrm,
  applyDominanceBackground: applyDomnBg,
  updateLifeWithDominance: updLifWitDom,
  drawBasePredators: drawBasePrdt,
  drawBaseOtherSpecies: drawBasOthSpc,
  drawLostPathOverlay: drawLosPatOvr,
  drawPathEndNotice: drawPathEndNtc,
  drawDominanceBlur: drawDomnBlur,
  drawDominanceVignette: drawDomVign,
  renderGlow,
  resizeGlow,
});
