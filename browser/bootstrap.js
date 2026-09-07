// File Overview
// Starts the browser application and coordinates setup, frame updates,
// rendering, input, storage, sound, and shared ecology systems.

// This is the browser entry point, where all systems begin running
// within the same p5 lifecycle.
(() => {
  "use strict";

  const requiredApis = Object.freeze({
    AppContext: window.AppContext,
    AppDiagnostics: window.AppDiagnostics,
    EcologyConstants: window.EcologyConstants,
    AttentionLogStoreApp: window.AttentionLogStoreApp,
    NumericApp: window.NumericApp,
    AppRuntime: window.AppRuntime,
    GlowApp: window.GlowApp,
    SoftGlowApp: window.SoftGlowApp,
    GazeSupport: window.GazeSupport,
    GazeEngine: window.GazeEngine,
    SketchConfig: window.SketchConfig,
    SharedRules: window.SharedRules,
    SharedClient: window.SharedClient,
    SoundApp: window.SoundApp,
    LifeLogApp: window.LifeLogApp,
    PredatorBehavior: window.PredatorBehavior,
    ParasiteBehavior: window.ParasiteBehavior,
    RoamerBehavior: window.RoamerBehavior,
    DeepDiverBehavior: window.DeepDiverBehavior,
    GuardianBehavior: window.GuardianBehavior,
    WorldSystem: window.WorldSystem,
    LifeView: window.LifeView,
    WorldView: window.WorldView,
    InteractionView: window.InteractionView,
    InteractionSystem: window.InteractionSystem,
  });
  const missingApis = Object.entries(requiredApis)
    .filter(([, api]) => !api)
    .map(([name]) => name);

  if (missingApis.length) {
    throw new Error(
      `Public API dependencies are missing: ${missingApis.join(", ")}`
    );
  }

  window.GazeApp = window.GazeEngine;
})();

const runtimeSystems = Object.freeze({
  world: window.WorldSystem,
  lifeView: window.LifeView,
  view: window.WorldView,
  interactionView: window.InteractionView,
  interaction: window.InteractionSystem,
});

// Preload perception resources before the application starts.
function preload() {
  window.GazeApp?.preload({
    enabled: gazeEnabled,
    skipCam: ixTest,
  });
}

// Tests and the live runtime each establish the environment they require;
// if the previous ecology cannot be restored, growth continues in a new world.
function setup() {
  pixelDensity(min(window.devicePixelRatio || 1, renderConfig.maxPxlDnsty));
  window.SoundApp?.setup?.({
    enabled: !visualTest && !perfTest && !ixTest,
  });
  const mainRenderer = createCanvas(
    visualTest ? visTestWdth : windowWidth,
    visualTest ? testViewHeight : windowHeight
  );
  mainCnvsElmnt = mainRenderer.elt;
  runtimeSystems.view.setupGlowLayers(mainRenderer.elt);
  noiseDetail(2, 0.5);
  frameRate(eco.renderFps);
  window.AppRuntime?.setQuality(testParams.get("quality") || "visual");
  runtimeSystems.world.setup();
  const persEcsy = store.readSnapshot();
  let restored = false;
  try {
    restored = restoreEcoSnapshot(persEcsy);
  } catch (error) {
    ecoStoreState.error = error?.message || String(error);
    ecoStoreState.loadedSnapshot = null;
    console.error("[Ecology archive restoration failed] Starting with a new ecology.", error);
  }
  if (!restored) {
    runtimeSystems.world.build();
  }
  lifeLog.initialize();
  stpRstCont();
  window.GazeApp?.setup({
    enabled: gazeEnabled,
    skipCam: ixTest,
  });
  store.initialize();
  runtimeSystems.world.initializeSharedEcology();
  window.AppDiagnostics?.markReady();
}

// This function was modified with the assistance of ChatGPT.
function draw() {
  const runtime = window.AppRuntime;
  runtime?.beginFrame();
  const now = visualTest ? visualTestMs : millis();

  // Begin this frame by calibrating the time scale and preparing visual caches.
  if (visualTest) runtimeSystems.world.build();
  if (glowLayersOn) clear();
  runtimeSystems.view.applyDominanceBackground();
  frame.dt = visualTest ? 1 : dtFactor();
  frame.movementDt = visualTest
    ? frame.dt
    : frame.dt * eco.moveSpeed;
  frame.now = now;
  frame.t = (now * eco.animTps) / 1000;
  if (visualTest || !frame.movementReady) {
    frame.movementT = frame.t;
    frame.movementReady = true;
  } else {
    frame.movementT +=
      (frame.movementDt * eco.animTps) / eco.simFps;
  }
  runtimeSystems.view.beginCacheFrame();
  runtimeSystems.view.beginArrowGlowFrame();

  // Each frame first listens for changes in the audience and the ecology, then renders that moment.
  runtimeSystems.world.flush();
  runtime?.entities?.beginFrame();
  runtimeSystems.world.updateLifeMode(now);
  runtimeSystems.world.indexGroups();
  for (const a of creatures) runtimeSystems.view.updateLifeWithDominance(a, frame);
  for (const p of parasites) runtimeSystems.view.updateLifeWithDominance(p, frame);
  seprRsd();

  window.GazeApp?.update(frame);
  runtimeSystems.interaction.syncSessions(window.GazeApp?.snapshot?.() || null);
  runtimeSystems.interaction.updateSessions(now);
  runtimeSystems.world.updateRelationalAlert(now);
  const ixData = runtimeSystems.interaction.encounterStatus();
  runtimeSystems.world.updatePredatorLures(now, ixData);
  runtimeSystems.interaction.flushWorldQueue();
  runtimeSystems.world.flush();

  // Lifeforms appear according to depth and relational hierarchy,
  // together forming the shared ecology before the audience.
  creatures.sort(sortDepth);

  const { prdsBlwOthrs } = ixData;
  if (prdsBlwOthrs) runtimeSystems.view.drawBasePredators(frame);
  runtimeSystems.view.drawBaseOtherSpecies(frame);
  if (!prdsBlwOthrs) runtimeSystems.view.drawBasePredators(frame);
  window.GazeApp?.drawScene(frame);
  runtimeSystems.view.drawLostPathOverlay(now);
  runtimeSystems.interactionView.drawGuardianTopLayer(frame);
  // Draw care overlays by participant session, preserving each participant's progress and target.
  for (const session of runtimeSystems.interaction.sessions) {
    if (!session.enabled) continue;
    runtimeSystems.interaction.bindSession(session);
    runtimeSystems.interactionView.drawGuardianOverlay(frame);
  }
  runtimeSystems.interactionView.drawReturnFeedback(frame);
  runtimeSystems.interactionView.drawCellChildren(frame);
  runtimeSystems.interactionView.drawDeepFocusSafe(frame);
  for (const session of runtimeSystems.interaction.sessions) {
    if (!session.enabled) continue;
    runtimeSystems.interaction.bindSession(session);
    runtimeSystems.interactionView.drawGuardianSignal();
  }
  runtimeSystems.interactionView.drawGuardianLinkFadeOut(frame.now);
  for (const session of runtimeSystems.interaction.sessions) {
    if (!session.enabled) continue;
    runtimeSystems.interaction.bindSession(session);
    runtimeSystems.interactionView.drawDeepFocus(frame);
  }
  runtimeSystems.interaction.bindSession(runtimeSystems.interaction.sessions[0]);

  // Finally, bring the glow, environmental pressure, information panel,
  // and perception feedback together in the same frame.
  runtime?.drain("cacheRefresh");

  runtimeSystems.view.renderGlow(now, visualTest);

  runtimeSystems.view.drawDominanceBlur();
  runtimeSystems.view.drawDominanceVignette();

  for (const session of runtimeSystems.interaction.sessions) {
    if (!session.enabled) continue;
    runtimeSystems.interaction.bindSession(session);
    runtimeSystems.interactionView.drawGuardianPanel();
  }
  runtimeSystems.interaction.bindSession(runtimeSystems.interaction.sessions[0]);
  runtimeSystems.view.drawPathEndNotice(now);

  window.GazeApp?.drawOverlay(frame, {
    bgClr: eco.bgColor,
    glowCanvas: glowLayersOn ? glowLayer?.canvas : null,
    arrwGlowCnvs: glowLayersOn ? arrwGlowCnvs : null,
  });
  if (visualTest) noLoop();
}

// Viewport changes retain snapshots of the old and new geometry, allowing the world, glow,
// and gaze state to be remapped to their original relative positions.
function windowResized() {
  const prevViwp = runtimeSystems.world.viewportGeometry(width, height);
  const nextViewport = runtimeSystems.world.viewportGeometry(windowWidth, windowHeight);
  resizeCanvas(windowWidth, windowHeight, true);
  runtimeSystems.world.remapViewport(prevViwp, nextViewport);
  runtimeSystems.view.resizeGlow();
  runtimeSystems.world.refreshLayout();
  window.GazeApp?.resize({
    previous: prevViwp,
    next: nextViewport,
  });
}

function mouseMoved() {
  window.GazeApp?.pointerMoved(mouseX, mouseY);
}

function touchMoved() {
  window.GazeApp?.pointerMoved(mouseX, mouseY);
  return false;
}

function keyPressed() {
  window.GazeApp?.keyPressed(key);
}

function doubleClicked(event) {
  if (!event || event.target !== mainCnvsElmnt) return false;
  fullscreen(!fullscreen());
  return false;
}



