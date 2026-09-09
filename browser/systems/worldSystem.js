// File Overview
// Advances ecological time, population changes, lifeform behaviour,
// spatial state, and queued world mutations.

// 1. This digital ecology continues to live
// Here I arrange the conditions in which stories can occur,
// entrusting subsequent change to relationships between participants and lifeforms.

// 2. All lifeforms share the same temporal and spatial scales
const {
  eco,
  renderConfig,
  testParams,
  visualTest,
  visualTestMs,
  visTestWdth,
  testViewHeight,
  glowConfig,
  glowLayersOn,
  predatorLure,
  lifeCache,
  lifeGlow,
  lifeMechanism: lifeCfg,
  zones,
  settings,
  driftMode,
} = window.SketchConfig;
const ecoConst = window.EcologyConstants;
const num = window.NumericApp;
const softGlow = window.SoftGlowApp;
const legacyEvent = ecoConst.legacyEvent;
const guardCfg = settings.guardian;
const driftCfg = guardCfg.drift;
const plusCfg = guardCfg.plus;
const collabCfg = guardCfg.collab;
const signalCfg = collabCfg.signal;
const packetCfg = collabCfg.pkt;
const linkCfg = collabCfg.link;
const returnCfg = guardCfg.cellReturn;
const driftPlusCfg = guardCfg.driftPluses;
const deepCfg = settings.deepDiver;
const roamCfg = settings.roamer;
const parasiteCfg = settings.parasite;
const predCfg = settings.predator;
const userGlowCfg = settings.userGlow;
const guardRange = settings.guardianRange;

const intrTyps = new Set([
  ...Object.values(eco.lifeType),
]);

const careSpcView = Object.freeze({
  Predator: Object.freeze({ name: "Predator", color: [251, 167, 188] }),
  Parasite: Object.freeze({ name: "Parasite", color: [248, 228, 75] }),
  Roamer: Object.freeze({ name: "Roamer", color: [161, 215, 255] }),
  DeepDiver: Object.freeze({ name: "Deep Diver", color: [255, 255, 255] }),
  Guardian: Object.freeze({ name: "Guardian", color: [168, 219, 129] }),
});

const capture = Object.freeze({
  activateDelay: 1500,
  logFocusMs: 2000,
  focusMs: 4000,
  diffFocusMs: 18000,
  diffColorMs: 2500,
  diffDurationMs: 3600,
  diffBirthMs: 4000,
  parsDiffChnc: 0.6,
  othrLifRsdChn: 0.2,
  scrcAlphGain: 0.06,
  parsScrSizGai: 0.025,
  scrcBrnchMin: 1,
  scrcBrnchMax: 4,
  scrcBrnGroMs: 2500,
  brncAddPerGrw: 2,
  brnchGrowLmt: 6,
  domnIxCap: 5,
  dominanceEase: 0.045,
  domBgDarkMax: 0.4,
  domBgEase: 0.12,
  domBgRestoreMs: 3000,
  bgRestoreMs44: 5000,
  domBgClearR: 95,
  domBgOuterR: 520,
  domBgBlurMax: 2.4,
  domBgDitherA: 0.008,
  prdtSclGain: 0.07,
  prdtSclMax: 1.35,
  prdtAlphGain: 0.2,
  prdtAlphMax: 1,
  domPredSpdMax: 1.05,
  domnOthrSpdMin: 0.3,
  otherScaleDrop: 0.06,
  domnOthrSclMin: 0.7,
  otherAlphaDrop: 0.15,
  domnOthAlpMin: 0.25,
  parsSclGain: 0,
  domParsSclMax: 1,
  parsAlphGain: 0.02,
  domParsAMax: 1.1,
  outlineAlpha: 200,
  outlineWeight: 15,
  baitVisHoldMs: 3000,
  baitFadeOutMs: 2500,
  baitHiddenMs: 18000,
  baitFadeInMs: 2500,
  noticeStartMul: 0.72,
  tailGrowMs: 500,
  numberMorphMs: 2400,
  numberFontSize: 11.6,
  numberAlpha: 250,
  numLineAlph: 250,
  numLineWght: 1.1,
  numMorphDist: 7,
  hitRadiusScale: 1.08,
  tgtHoldScl: 1.8,
  swtchDistRt: 0.18,
  lureRadius: 240,
  lureHoldScale: 1.25,
  lureMaximum: 5,
  lureOrbtRad: 40,
  lureOrbEntRad: 40,
  lureTurnRate: 0.0045,
  preSpeedMulMin: 1.1,
  preSpeedMulMax: 1.8,
  prctTurnRate: 0.004,
  cptrSpdScl: 0.3,
  othrSpcLurDlyM: 1500,
  othrSmpTurRat: 0.0032,
  encnLureScl: 0.6,
  encnTurnRate: 0.0026,
  roamerLure: 0.15,
  guardLure: 0.07,
  deepLure: 0.03,
  parasiteLure: 0.18,

  leaveDelayMs: 2800,
  restoreMs: 1800,
  prePathAlpha: 0.72,
  pathShowProg: 0.375,
  pathInitA: 0.08,
  preCptPatFadIn: 1500,
  preCptPatLvMs: 2500,
  preCptPatFadMs: 1400,
  cptrPathHoldMs: 2500,
  cptrPathFadeMs: 7000,
  pathEndNtcMess: Object.freeze([
    "[ATTENTION SPENT HERE]\nAnother possible life is fading.",
    "[ATTENTION SPENT]\nAnother possible life becomes the cost.",
    "[ATTENTION CAPTURED]\nThe space for another life is shrinking.",
  ]),
  repeatRearmMs: 6200,
  messageMinimum: 3,
  messageMaximum: 4,
  branchGrowMs: 2600,
  brnchStggrMs: 300,
  pathBaseBend: 18,
  pathTextAnchrT: 0.22,
  pathTextColor: Object.freeze([255, 232, 237]),
  pathTexSizMin: 10,
  pathTexSizMax: 11,
  pathXScale: 1.53,
  pathYScale: 0.98,
  pathYMin: 4,
  pathMinGap: 2,
  pathWaveAmp: 3,
  pathWaveCycles: 1.1,
  pathCharBrkMs: 1400,
  pathChaSplOff: 3.5,
  pathCharCount: 4,
  pathParTrvMin: 4,
  pathParTrvMax: 25,
  pathParSizStr: 1.9,
  pathParSizEnd: 0.65,
  pathPartAlph: 230,
  pathAttDotSiz: 2,
  pathAttLinWgh: 1.1,
  pathAttachLen: 7,
  pathAttachMin: 1,
  pathAttachMax: 3,
  pathAttachZgzg: 1.6,
  pathAttachSkew: 0.5,
  pathAttachGap: 5,
  pathTextGap: 9,
  pathAttGroMs: 400,
  pathAttStgMs: 100,
  pathIntCnfMs: 1200,
  pathIntrHoldMs: 1000,
  messages: Object.freeze([
    "Take a break",
    "Follow this thought",
    "Start creating",
    "Sit in silence",
    "Continue the task",
    "Become another self",
    "Do nothing awhile",
    "Close your eyes",
    "Take another path",
    "Ask how they are",
    "Write the thought down",
    "Develop the idea",
    "Let the idea grow",
    "Return to the task",
    "Finish this page",
    "Keep practising",
    "Save time for yourself",
    "Tend to your fatigue",
    "Listen to your needs",
  ]),
});


const attnCont = Object.freeze({
  focused: "focused",
  paused: "paused",
  interrupted: "interrupted",
  hardReset: "hard-reset",
  completed: "completed",
});

// 3. Departure, lingering, and renewed approach form a continuous span of attention
function clssAttnFlow({
  focused = false,
  pauseReason = null,
  hardReset = false,
  completed = false,
} = {}) {
  if (hardReset) return attnCont.hardReset;
  if (completed) return attnCont.completed;
  if (pauseReason) return attnCont.paused;
  return focused
    ? attnCont.focused
    : attnCont.interrupted;
}

function updateAttnProg(
  progress,
  interruptionMs,
  continuity,
  frameMs,
  options = null
) {
  // All species share this continuity model; callers provide thresholds,
  // while this section centrally manages blink and departure rules.
  const elapsedMs = max(0, Number(frameMs) || 0);
  const focusMs = max(1, options?.focusMs || 1);
  const leaveDelayMs = max(
    0,
    options?.leaveDelayMs ?? capture.leaveDelayMs
  );
  const restoreMs = max(
    1,
    options?.restoreMs ?? capture.restoreMs
  );
  let nextProgress = clamp(Number(progress) || 0, 0, 1);
  let nextBreakMs = max(0, Number(interruptionMs) || 0);

  // Hard reset, completion, and pause are terminal branches.
  if (continuity === attnCont.hardReset) {
    return { progress: 0, interruptionMs: 0, phase: "idle" };
  }
  if (continuity === attnCont.completed) {
    return { progress: 1, interruptionMs: 0, phase: "completed" };
  }
  if (continuity === attnCont.paused) {
    return {
      progress: nextProgress,
      interruptionMs: nextBreakMs,
      phase: "paused",
    };
  }
  if (continuity === attnCont.focused) {
    nextProgress = min(1, nextProgress + elapsedMs / focusMs);
    return {
      progress: nextProgress,
      interruptionMs: 0,
      phase: nextProgress >= 1 ? "completed" : "accumulating",
    };
  }

  // An interruption receives a grace period, then decays in
  // reverse over the recovery duration after the threshold.
  nextBreakMs += elapsedMs;
  if (nextBreakMs < leaveDelayMs) {
    return {
      progress: nextProgress,
      interruptionMs: nextBreakMs,
      phase: "holding",
    };
  }
  nextProgress = max(0, nextProgress - elapsedMs / restoreMs);
  return {
    progress: nextProgress,
    interruptionMs: nextBreakMs,
    phase: nextProgress > 0 ? "restoring" : "idle",
  };
}

// Predator state initializes target, progress, and cooldown together.
function crtHuntStt() {
  return {
  focused: null,
  attracted: [],
  intrCand: null,
  intrCandSnc: 0,
  prdtFcsMs: 0,
  diffCount: 0,
  roamerDiffCount: 0,
  deepDiverDiffCount: 0,
  parasiteDiffCount: 0,
  othrLifeEncnN: 0,
  parsAlphBst: 0,
  paraScaleUp: 0,
  parasiteBoost: 0,
  brnchGrowN: 0,
  replN: 0,
  lureInfluence: 1,
  lureTurnRate: 0.0045,
  otherLureType: null,
  othrSpcLurFcsM: 0,
  othrLureActv: false,
  prdtBlcByCar: false,
  };
}
let hunt = crtHuntStt();

// 4. Relationships among lifeforms persist as the world changes size
// This system jointly maintains lifeform collections, the lifespan clock, deferred add/remove queues,
// viewport mapping, and world-level lure scheduling.
// Data flow: systems register additions/removals -> AppRuntime
// queue -> flushLife -> creatures and parasites collections.
function worldPos(entity) {
  if (entity?.host) {
    if (
      entity.attached === false &&
      Number.isFinite(entity.x) &&
      Number.isFinite(entity.y)
    ) {
      return { x: entity.x, y: entity.y };
    }
    const cosRotation = entity.rotCos ?? Math.cos(entity.rot || 0);
    const sinRotation = entity.rotSin ?? Math.sin(entity.rot || 0);
    return {
      x: entity.host.x + entity.ox * cosRotation - entity.oy * sinRotation,
      y: entity.host.y + entity.ox * sinRotation + entity.oy * cosRotation,
    };
  }
  return { x: entity?.x || 0, y: entity?.y || 0 };
}

// A Deep Diver uses an interpolated position after entering a focus transition;
// other lifeforms continue using true world coordinates.
function visualWorldPos(entity) {
  if (
    entity &&
    entity === deepFocus.target &&
    deepFocus.phase !== "idle"
  ) {
    return { x: deepFocus.visualX, y: deepFocus.visualY };
  }
  return worldPos(entity);
}

// Gaze targets a lifeform-defined visual anchor first,
// falling back to its current visible position when none exists.
function focusPos(entity) {
  const anchor = entity?.attnAnchr;
  return anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
    ? anchor
    : visualWorldPos(entity);
}

// Register lifeform changes within the frame and commit
// collection additions and removals together at a safe boundary
function flushLife() {
  const lifecycle = window.AppRuntime?.entities;
  if (!lifecycle) return { added: [], removed: [] };
  const changes = lifecycle.flushPending();
  for (const record of changes.removed) {
    const collection = record.metadata.group === "parasite" ? parasites : creatures;
    const index = collection.indexOf(record.entity);
    if (index >= 0) collection.splice(index, 1);
  }
  for (const record of changes.added) {
    const collection = record.metadata.group === "parasite" ? parasites : creatures;
    if (!collection.includes(record.entity)) collection.push(record.entity);
  }
  return changes;
}

function setWorld(nextCreatures, nextParasites, replTkn = null) {
  // Perform a full replacement when the token is valid,
  // first clearing session and care state from the old world.
  if (replTkn !== worldToken) return false;
  rstWrldSess();
  care.resetRegrowth();
  care.rstSpcFade();
  const runtime = window.AppRuntime;
  const lifecycle = runtime?.entities;
  if (lifecycle) {
    lifecycle.clear("world-rebuild", { silent: true });
  } else {
    for (const entity of [...creatures, ...parasites]) dropLifeCache(entity);
  }

  creatures = nextCreatures;
  parasites = nextParasites;
  if (lifecycle) {
    lifecycle.registerMany(
      [
        ...creatures.map((entity) => ({ entity, metadata: { group: "creature" } })),
        ...parasites.map((entity) => ({ entity, metadata: { group: "parasite" } })),
      ],
      { silent: true }
    );
  }
  return true;
}

// Viewport changes also cancel pending cache tasks and clear entity images.
function refreshLayout() {
  const runtime = window.AppRuntime;
  runtime?.clearQueue("cacheRefresh");
  for (const entity of [...creatures, ...parasites]) clearLifeCache(entity);
  runtime?.entities?.beginFrame();
}

// Normalize viewport dimensions into the ecological world's center and elliptical radii;
// subsequent remapping reuses this geometric definition.
function viwpWrldGeo(viewportWidth, viewportHeight) {
  const safeWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeHeight = Math.max(1, Number(viewportHeight) || 1);
  const radius = Math.min(safeWidth, safeHeight) * 0.5;
  return {
    width: safeWidth,
    height: safeHeight,
    centerX: safeWidth * 0.5,
    centerY: safeHeight * 0.5,
    radiusX: Math.max(1, radius * 1.05),
    radiusY: Math.max(1, radius),
  };
}

// Size changes trigger world remapping.
function viwpGeoChngd(previous, next) {
  return Boolean(
    previous &&
      next &&
      (previous.width !== next.width || previous.height !== next.height)
  );
}

// Transform coordinate pairs according to the old and new viewport proportions.
function rmpViwpPair(
  value,
  xKey,
  yKey,
  previous,
  next,
  remappedPairs
) {
  if (!value || typeof value !== "object") return false;
  const x = value[xKey];
  const y = value[yKey];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  let valuePairs = remappedPairs.get(value);
  if (!valuePairs) {
    valuePairs = new Set();
    remappedPairs.set(value, valuePairs);
  }
  const pairKey = `${xKey}:${yKey}`;
  if (valuePairs.has(pairKey)) return false;
  valuePairs.add(pairKey);

  value[xKey] = (x / previous.width) * next.width;
  value[yKey] = (y / previous.height) * next.height;
  return true;
}

// Scale velocity and offset vectors by the viewport's axial ratios,
// applying the corresponding transform to position and direction fields.
function sclViwpVctr(
  value,
  xKey,
  yKey,
  previous,
  next
) {
  if (!value || typeof value !== "object") return false;
  if (!Number.isFinite(value[xKey]) || !Number.isFinite(value[yKey])) {
    return false;
  }
  value[xKey] *= next.width / previous.width;
  value[yKey] *= next.height / previous.height;
  return true;
}

function remapLifeView(
  entity,
  previous,
  next,
  remappedPairs
) {
  if (!entity) return;
  // Host position determines the position of an attached Parasite.
  const attcPars = entity.host && entity.attached !== false;
  const rmpEnttyPair = (value, xKey, yKey) =>
    rmpViwpPair(
      value,
      xKey,
      yKey,
      previous,
      next,
      remappedPairs
    );
  if (!attcPars) {
    rmpEnttyPair(entity, "x", "y");
    rmpEnttyPair(entity, "x0", "y0");
  }

  // Migrate temporary visual coordinates with world coordinates
  // so animation continues naturally after the window is resized.
  for (const [xKey, yKey] of [
    ["visualMotionX", "visualMotionY"],
    ["attentionVisualX", "attentionVisualY"],
    ["guardVisX", "guardVisY"],
    ["returnVisX", "returnVisY"],
    ["splitLastGazeX", "splitLastGazeY"],
  ]) {
    rmpEnttyPair(entity, xKey, yKey);
  }
  rmpViwpPair(
    entity,
    "lureX",
    "lureY",
    previous,
    next,
    remappedPairs
  );
  for (const nested of [
    entity.cruiseCenter,
    entity.attnAnchr,
    entity.cellReturnHold,
  ]) {
    rmpEnttyPair(nested, "x", "y");
  }
  // Birth and differentiation store screen-space start and end points, which must be converted together.
  for (const transition of [
    entity.splitBirth,
    entity.diffBirth,
  ]) {
    rmpEnttyPair(transition, "startX", "startY");
    rmpEnttyPair(transition, "targetX", "targetY");
  }
  for (const outcome of entity.spltArrwOutc || []) {
    rmpEnttyPair(outcome, "startX", "startY");
    rmpEnttyPair(outcome, "targetX", "targetY");
  }
  sclViwpVctr(
    entity,
    "cruiseOffsetX",
    "cruiseOffsetY",
    previous,
    next
  );
  sclViwpVctr(
    entity,
    "attentionOffsetX",
    "attentionOffsetY",
    previous,
    next
  );
}

// Remap focus windows, visual anchors, and bubble origins together so their internal narrative space
// retains its relative layout after resizing.
function remapDeepFocus(state, previous, next, remappedPairs) {
  if (!state || state.phase === "idle") return;
  for (const [xKey, yKey] of [
    ["originX", "originY"],
    ["visualX", "visualY"],
    ["exitStartX", "exitStartY"],
    ["cancelStartX", "cancelStartY"],
    ["moveControlX", "moveControlY"],
  ]) {
    rmpViwpPair(state, xKey, yKey, previous, next, remappedPairs);
  }
  for (const [xKey, yKey] of [
    ["x", "y"],
    ["centerX", "centerY"],
    ["insideX", "insideY"],
  ]) {
    rmpViwpPair(state.window, xKey, yKey, previous, next, remappedPairs);
  }
  if (state.window) {
    if (Number.isFinite(state.window.width)) {
      state.window.width *= next.width / previous.width;
    }
    if (Number.isFinite(state.window.height)) {
      state.window.height *= next.height / previous.height;
    }
  }
  for (const bubble of state.bubbles || []) {
    rmpViwpPair(bubble, "originX", "originY", previous, next, remappedPairs);
    if (Number.isFinite(bubble.driftX)) {
      bubble.driftX *= next.width / previous.width;
    }
  }
}

// Scale care centers, path endpoints, and signal anchors together
// so active relationships remain connected after the window changes.
function rmpCareViwp(state, previous, next, remappedPairs) {
  if (!state || state.phase === "idle") return;
  for (const [xKey, yKey] of [
    ["centerX", "centerY"],
    ["progressX", "progressY"],
    ["wrapStartX", "wrapStartY"],
    ["returnStartX", "returnStartY"],
    ["shieldStartX", "shieldStartY"],
  ]) {
    rmpViwpPair(state, xKey, yKey, previous, next, remappedPairs);
  }
  for (const approach of state.shields || []) {
    rmpViwpPair(approach, "startX", "startY", previous, next, remappedPairs);
  }
  for (const signal of Object.values(state.signals || {})) {
    rmpViwpPair(signal, "x", "y", previous, next, remappedPairs);
    rmpViwpPair(signal, "startX", "startY", previous, next, remappedPairs);
    rmpViwpPair(signal, "targetX", "targetY", previous, next, remappedPairs);
  }
}

// Preserve relative relationships among lifeforms and
// active interaction positions when adjusting the viewport
// This function was modified with the assistance of ChatGPT.
function remapWorld(previous, next) {
  if (!viwpGeoChngd(previous, next)) return false;
  // A WeakMap records objects and coordinate fields already scaled during this operation,
  // shared by lifeform and interaction state.
  const remappedPairs = new WeakMap();
  for (const entity of [...creatures, ...parasites]) {
    remapLifeView(entity, previous, next, remappedPairs);
  }
  // Lifeforms, interaction anchors, and care connections use the same viewport transform.
  for (const session of sessions) {
    remapDeepFocus(
      session.deepFocus,
      previous,
      next,
      remappedPairs
    );
    care.remapViewport(
      session.careState,
      previous,
      next,
      remappedPairs
    );
    rmpViwpPair(
      session.aim?.rawGaze,
      "x",
      "y",
      previous,
      next,
      remappedPairs
    );
    rmpViwpPair(
      session.aim?.logicalGaze,
      "x",
      "y",
      previous,
      next,
      remappedPairs
    );
    // Panel bounds are a screen-space cache and must be remeasured after viewport changes.
    session.carePanelBox = null;
  }
  for (const connector of careLinkFades) {
    rmpViwpPair(connector.source, "x", "y", previous, next, remappedPairs);
    rmpViwpPair(connector.target, "x", "y", previous, next, remappedPairs);
  }
  return true;
}

function setupWorld() {
  // Initialization centrally establishes lifecycles, the spatial index, and restoration boundaries;
  // repeated calls reuse existing world state.
  const runtime = window.AppRuntime;
  if (!runtime?.entities) return;
  runtime.entities.configure({
    typeOf: (entity) => entity.type || eco.lifeType.parasite,
    positionOf: worldPos,
    disposeEntity: dropLifeCache,
    onAdded: (record) => ensureLifeState(record.entity, lifeClockNow()),
  });

  // The public removal entry point validates ecological minimums and clears parasitic relationships
  // before passing the entity to the end-of-frame queue.
  const remove = (entityOrId, reason = "requested") => {
    const record = runtime.entities.resolve(entityOrId);
    const entity = record?.entity || entityOrId;
    if (!entity) return false;
    if (!lifeCanRmvEnt(entity)) return false;
    if (entity.type !== eco.lifeType.parasite) {
      rhmParsFrom(entity);
    }
    return runtime.entities.queueRemove(entity, reason);
  };

  window.CreatureWorld = Object.freeze({
    add(entity, options = {}) {
      if (!entity || !lifeCanAdmTyp(entity.type)) return false;
      const group = options.group || (entity.type === eco.lifeType.parasite ? "parasite" : "creature");
      ensureLifeState(entity, lifeClockNow());
      return runtime.entities.queueAdd(entity, { ...options, group });
    },
    remove,
    getByType: (type) => runtime.entities.getByType(type),
    getPosition: (entity) => worldPos(entity),
    getVisRad: (entity) => infoRadius(entity),
    queryNearby: (sourceEntity, radius, options) =>
      runtime.entities.queryNearby(sourceEntity, radius, options),
  });
}

const perfTest = testParams.get("performance-test") === "1";
const ixTest = testParams.get("interaction-test") === "1";
const ecoStoreTest =
  testParams.get("ecosystem-store-test") === "1" ||
  testParams.get("ecosystem-persistence-test") === "1";
const interactionDisabled = testParams.get("interaction") === "0";
const gazeEnabled =
  !ecoStoreTest &&
  (ixTest ||
    (!interactionDisabled &&
      !visualTest &&
      !perfTest));
let exprPsd = false;
let exprPsdAt = null;
let resetUiOverlay = null;
let rstUiKeepBttn = null;
let rstUiErsBttn = null;
let resetUiStatus = null;
let resetUiTitle = null;
let rstUiPrimaryCopy = null;
let rstUiSecondaryCopy = null;
let rstUiTokenRow = null;
let rstUiTokenInput = null;
let rstPrevFcs = null;
let rstUiWasPsd = false;
let resetUiBusy = false;
let maintenanceUiAction = "reset";
const poplScl = Number(testParams.get("population-scale") || 1);
const countScale = perfTest
  ? Math.min(1.5, Math.max(1, Number.isFinite(poplScl) ? poplScl : 1))
  : 1;
const sclPopl = (count) => Math.max(1, Math.round(count * countScale));
const counts = Object.fromEntries(
  Object.entries(ecoConst.initialCounts).map(([type, count]) => [
    type,
    sclPopl(count),
  ])
);

// 5. The lifespan clock, shared ecology, and lures that actively approach attention
// The lifespan clock allows growth, decay, and transformation
// to continue beyond participants' direct interaction.
// Time domains: lifeClockNow provides world time; lifeClock.rate scales lifespan consumption;
// the interface and frame animation use the real frame clock.
function makePathNtcStt() {
  return {
    startedAt: -Infinity,
    message: "",
  };
}
let pathEndNtcStt = makePathNtcStt();

const reservedCount = 4;

const sizes = {
  Predator: [0.6, 0.75, 0.67, 0.82, 0.55],
  Roamer: [0.38, 0.47, 0.42, 0.47, 0.38],
  DeepDiver: [0.61, 0.78, 0.68, 0.8, 0.6],
  Guardian: [0.54, 0.67, 0.59, 0.74, 0.5],
  Parasite: [0.59, 0.64, 0.71, 0.77, 0.82],
};

const species = [
  {
    type: eco.lifeType.predator,
    count: counts.Predator - reservedCount,
    zone: { ...zones.predator, bias: 1.35 },
    cluster: { cols: 4, radius: 220, tight: 33, stray: 0.3, lock: true },
    sep: 30,
  },
  {
    type: eco.lifeType.roamer,
    count: counts.Roamer,
    zone: zones.roamer,
    cluster: { cols: 4, radius: 225, tight: 42, stray: 0.05 },
    sep: 100,
  },
  {
    type: eco.lifeType.deepDiver,
    count: counts.DeepDiver,
    zone: zones.deepDiver,
    cluster: { cols: 3, radius: 95, tight: 34, stray: 0.02 },
    sep: 68,
    centered: true,
    centerY: 0.64,
    nearRoamer: 0.6,
    anchorMin: 44,
    anchorMax: 70,
  },
  {
    type: eco.lifeType.guardian,
    count: counts.Guardian,
    zone: { ...zones.guardian, bias: 0.72 },
    cluster: { cols: 6, radius: 260, tight: 92, stray: 0.6 },
    sep: 50,
    edgePreferred: true,
  },
];

const defaultZone = { y0: 0.02, y1: 0.98 };
const lifeZones = Object.freeze({
  [eco.lifeType.predator]: zones.predator,
  [eco.lifeType.roamer]: zones.roamer,
  [eco.lifeType.deepDiver]: zones.deepDiver,
  [eco.lifeType.guardian]: zones.guardian,
});
const emptyOptions = Object.freeze({});
const deepAvoidType = eco.lifeType.roamer;
const wanderDrift = {
  ttMul: (o) => o.rw,
  dxMul: (o) => o.ax,
  yMul: (o) => o.ay,
};

let creatures = [];
let parasites = [];
// Environmental lures emerge anonymously from interactive Predators at random intervals,
// preserving chance in capture while excluding individual gaze history from selection.
// The trigger determines when an existing lure enters the environment;
// its type remains determined by the baitType preset when the Predator was created.
// Pause the countdown during interactions or while the page is hidden.
const prdtLureStt = {
  nextAt: null,
  blockedAt: null,
  activeTarget: null,
  actvStartAt: -Infinity,
  lastTrggAt: -Infinity,
  sequence: 0,
};

function lurePulseMs() {
  return (
    predatorLure.flashPulseMs * predatorLure.flashCount +
    predatorLure.flashGapMs * (predatorLure.flashCount - 1)
  );
}

// The first lure waits longer, as if testing whether a participant is willing to approach;
// later intervals use random values within the configured range.
function rndmLureIntr() {
  const firstLure = prdtLureStt.sequence === 0;
  return lerp(
    firstLure
      ? predatorLure.frstMinIntrMs
      : predatorLure.minIntrMs,
    firstLure
      ? predatorLure.frstMaxIntrMs
      : predatorLure.maxIntrMs,
    Math.random()
  );
}

function schdNextLure(now) {
  prdtLureStt.nextAt =
    now + rndmLureIntr();
}

// Predator lure candidates require an expired cooldown,
// a valid lifecycle, and no active interaction state.
function rdyPrdtLrs(now) {
  return creatures.filter(
    (entity) =>
      entity.type === eco.lifeType.predator &&
      Boolean(entity.baitType) &&
      isVisible(entity) &&
      (entity.birthProgress ?? 1) >= 1 &&
      !entity.captureDone &&
      (entity.cptrProg || 0) <= 0 &&
      entity.baitPrsn?.(now)?.alpha > 0.2 &&
      tgtRdyToSssn(entity)
  );
}

// Select one global lure from Predators whose timers have expired and whose interaction state is empty.
function trggrPrdtLure(now) {
  const candidates = rdyPrdtLrs(now);
  if (!candidates.length) {
    prdtLureStt.nextAt =
      now + predatorLure.rtryIntrMs;
    return false;
  }
  const target = candidates[
    floor(Math.random() * candidates.length)
  ];
  const position = worldPos(target);
  const sequence = ++prdtLureStt.sequence;
  target.bgnAmbntLure?.(now);
  prdtLureStt.activeTarget = target;
  prdtLureStt.actvStartAt = now;
  prdtLureStt.lastTrggAt = now;
  window.GazeApp?.qPrdtRppl?.({
    id: `predator-lure:${sequence}`,
    x: position.x,
    y: position.y,
    startedAt: now,
  });
  window.SoundApp?.cue?.("predator-lure", {
    key: `predator-lure:${sequence}`,
    cooldownKey: "predator-lure",
    x: position.x,
    width,
    priority: 1,
    reverbMix: 0,
  });
  schdNextLure(now);
  return true;
}

// Lure timing holds during capture and pauses; ordinary ecological time advances the next appearance.
function updtPrdtLrs(now, ixData) {
  if (visualTest || perfTest || ixTest) return;
  if (
    prdtLureStt.activeTarget &&
    now - prdtLureStt.actvStartAt >=
      lurePulseMs()
  ) {
    prdtLureStt.activeTarget = null;
  }

  const blocked = document.hidden || ixData.active;
  if (blocked) {
    if (prdtLureStt.blockedAt == null) {
      prdtLureStt.blockedAt = now;
    }
    return;
  }
  if (prdtLureStt.blockedAt != null) {
    if (prdtLureStt.nextAt != null) {
      prdtLureStt.nextAt += max(
        0,
        now - prdtLureStt.blockedAt
      );
    }
    prdtLureStt.blockedAt = null;
  }
  if (prdtLureStt.nextAt == null) {
    schdNextLure(now);
    return;
  }
  if (now >= prdtLureStt.nextAt) {
    trggrPrdtLure(now);
  }
}

const encounterLifeTypes = Object.freeze([
  eco.lifeType.predator,
  eco.lifeType.roamer,
  eco.lifeType.deepDiver,
  eco.lifeType.parasite,
  eco.lifeType.guardian,
]);
const encnLifTypSet = new Set(encounterLifeTypes);
const overloadShift = {
  lastStartedAt: -Infinity,
  sequence: 0,
};
const lifeClock = {
  mode: "unattended",
  rate: lifeCfg.clock.openUnttRate,
  prsnStartAt: null,
  absncStartAt: null,
  venueOpen: true,
  presentCount: 0,
  confirmedParticipantCount: 0,
  lastUpdatedAt: null,
};

// Lifecycle timing prefers the current frame clock,
// then falls back to the rendering-library clock or zero.
function lifeClockNow() {
  return frame.now > 0
    ? frame.now
    : typeof millis === "function"
      ? millis()
      : 0;
}

// This function was modified with the assistance of ChatGPT.
function updEcsLifMod(
  now,
  presence = window.GazeApp?.eclgyPrsn?.() || null
) {
  // Switch to active mode after sustained presence reaches its threshold;
  // absence enters unattended mode after a grace period.
  const previousMode = lifeClock.mode;
  if (
    lifeClock.lastUpdatedAt != null &&
    now < lifeClock.lastUpdatedAt
  ) {
    lifeClock.mode = "unattended";
    lifeClock.prsnStartAt = null;
    lifeClock.absncStartAt = null;
  }
  const presentCount = max(
    0,
    floor(Number(presence?.presentCount) || 0)
  );
  lifeClock.presentCount = presentCount;
  lifeClock.confirmedParticipantCount = max(
    presentCount,
    floor(Number(presence?.confirmedParticipantCount) || 0)
  );
  const anyonePresent = Boolean(presence?.anyonePresent || presentCount > 0);
  const config = lifeCfg.clock;
  lifeClock.venueOpen = true;
  // Mode transitions use a state machine with confirmation and grace periods.
  if (
    lifeClock.mode === "unattended" ||
    lifeClock.mode === "closed"
  ) {
    lifeClock.mode = "unattended";
    lifeClock.absncStartAt = null;
    if (!anyonePresent) {
      lifeClock.prsnStartAt = null;
    } else {
      if (lifeClock.prsnStartAt == null) {
        lifeClock.prsnStartAt = now;
      }
      if (
        now - lifeClock.prsnStartAt >=
        config.prsnCnfrmMs
      ) {
        lifeClock.mode = "active";
        lifeClock.prsnStartAt = null;
      }
    }
  // Restore active mode when presence returns within the grace period,
  // allowing time to return after a brief departure.
  } else if (lifeClock.mode === "grace") {
    if (anyonePresent) {
      lifeClock.mode = "active";
      lifeClock.absncStartAt = null;
      lifeClock.prsnStartAt = null;
    } else if (
      lifeClock.absncStartAt != null &&
      now - lifeClock.absncStartAt >=
        config.absenceDelayMs
    ) {
      lifeClock.mode = "unattended";
      lifeClock.absncStartAt = null;
      lifeClock.prsnStartAt = null;
    }
  } else if (anyonePresent) {
    lifeClock.absncStartAt = null;
  } else {
    if (lifeClock.absncStartAt == null) {
      lifeClock.absncStartAt = now;
    }
    lifeClock.mode = "grace";
  }
  lifeClock.rate =
    lifeClock.mode === "active"
      ? config.activeRate
      : config.openUnttRate;
  // The authority device consumes life budgets for the shared ecology.
  if (window.SharedClient?.isLifeLeader?.() === false) {
    lifeClock.rate = 0;
  }
  lifeClock.lastUpdatedAt = now;
  if (
    previousMode !== "unattended" &&
    lifeClock.mode === "unattended"
  ) {
    lifeLog.record(
      "ECOLOGY RESTING",
      "Without attention, life continues more slowly.",
      {
        key: "ecology-resting",
        primarySpecies: eco.lifeType.basicCell,
        display: false,
        now,
      }
    );
  }
  return lifeClock;
}

function isEncnLife(entity) {
  return Boolean(entity && encnLifTypSet.has(entity.type));
}

function lifeRangeFor(entity) {
  return lifeCfg.lifespanMs[entity?.type] || null;
}

// An individual seed combined with a purpose-specific salt generates reproducible randomness,
// giving lifespan and transformation independent, stable random sequences.
function lifeRandUnit(entity, salt = 0) {
  const seed =
    (floor(Number(entity?.seed) || 0) ^
      Math.imul((salt | 0) + 1, 0x9e3779b1)) >>>
    0;
  return mulberry32(seed)();
}

// Determine birth completion from species-specific animation state;
// world rules take ownership once the lifeform becomes visible.
function isLifeBrthDone(entity, now) {
  if (!entity) return false;
  if (entity.type === eco.lifeType.predator) {
    return (entity.birthProgress ?? 1) >= 1;
  }
  if (entity.type === eco.lifeType.parasite) {
    if (entity.lifeTrnsGrwth) {
      return now >= entity.lifeTrnsGrwth.endsAt;
    }
    return (entity.birthProgress ?? 1) >= 1;
  }
  if (entity.type === eco.lifeType.roamer) return !entity.splitBirth;
  if (entity.type === eco.lifeType.deepDiver) {
    return !entity.diffBirth;
  }
  if (entity.type === eco.lifeType.guardian) {
    return !entity.careBirth;
  }
  return true;
}

// Aggregate lifeforms currently encountered within sessions;
// lifecycle protection and world cleanup share this target set.
function encnTrgts(session) {
  if (!session) return [];
  const deepState = session.deepFocus;
  const guardianState = session.careState;
  const targets = [];
  const deepEntStrMs =
    deepCfg.gazeHoldMs *
    deepCfg.fcsEntryStrt;
  // Claim a Deep Diver candidate only after it approaches the entry threshold.
  if (deepState?.phase !== "idle") targets.push(deepState.target);
  if (
    deepState?.phase === "idle" &&
    deepState.candFocusMs > deepEntStrMs
  ) {
    targets.push(deepState.candidate);
  }
  for (const track of deepState?.exits || []) {
    if (track.focusMs > deepEntStrMs) targets.push(track.entity);
  }
  const guardCareOn = Boolean(
    guardianState &&
      (guardianState.phase !== "idle" ||
        guardianState.collabStatus === "offered")
  );
  // Collect care sources, targets, participating Guardians,
  // and new lifeforms for interaction-protection evaluation.
  if (guardCareOn) {
    targets.push(
      guardianState.candidate,
      guardianState.source,
      ...guardianState.participants,
      guardianState.careTarget,
      guardianState.shieldTarget,
      ...guardianState.limitLinks.map((link) => link.target),
      ...guardianState.shields.flatMap((approach) => [
        approach.guardian,
        approach.target,
      ]),
      ...guardianState.parents,
      ...guardianState.newborns
    );
  }
  return targets.filter(Boolean);
}

// Combine birth, interaction, protection, and pause conditions
// into lifespan-pause state, which governs the timer.
function isLifeClckHeld(entity) {
  if (!entity) return false;
  if (entity.type === eco.lifeType.predator) {
    return Boolean(!entity.captureDone && entity.cptrProg > 0);
  }
  if (entity.type === eco.lifeType.roamer) {
    return Boolean(!entity.splitComplete && entity.splitProgress?.() > 0);
  }
  return sessions.some((session) =>
    encnTrgts(session).includes(entity)
  );
}

// Prioritize lifespan-pause reasons as birth, interaction, then protective relationship,
// giving callers a clear, recordable explanation.
function lifeClockPauseReason(entity, now) {
  if (!isLifeBrthDone(entity, now)) return "birth-growth";
  if (
    entity.cellReturn ||
    entity.guardRprTx ||
    entity.careBirth ||
    entity.guardSeedBirth
  ) {
    return "diff-regeneration";
  }
  if (
    entity.type === eco.lifeType.parasite &&
    (entity.migrating || !entity.attached)
  ) {
    return "migration";
  }
  if (isLifeClckHeld(entity)) return legacyEvent.encounterPause;
  return null;
}

// 6. How each lifeform grows, fades, and returns its traces to the ecology
// The lifecycle records remaining time, pause reasons, and fade outcomes.
// committedRemoval marks a lifeform as having entered its terminal state;
// subsequent updates complete departure presentation and resource cleanup.
function ensureLifeState(entity, now = lifeClockNow()) {
  if (!isEncnLife(entity)) return null;
  if (!entity.lifeState) {
    entity.lifeState = {
      // phase and clock fields define the lifecycle's current interval and expiration boundary.
      phase: "alive",
      clockStartedAt: null,
      expiresAt: null,
      estimatedExpiresAt: null,
      // Budget, consumed duration, and last update time are used to resolve survival time.
      lifeBudgetMs: null,
      lifeConsumedMs: 0,
      lifeRemainingMs: null,
      lastLifeUpdateAt: null,
      // Pause, extension, safe period, and cause of death explain why the budget changes or stops.
      clockPauseReason: "birth-growth",
      extensionMs: 0,
      safeSince: null,
      deathStartedAt: null,
      outcome: null,
      cause: null,
      parasiteBorn: false,
      committedRemoval: false,
      // alpha, scale, and movement fields drive fade presentation,
      // while the life outcome retains its terminal value.
      alpha: 1,
      scale: 1,
      movementScale: 1,
      pulseScale: 1,
      // createdAt identifies this lifecycle instance,
      // distinguishing a rebuilt individual from its predecessor.
      createdAt: now,
    };
  }
  return entity.lifeState;
}

// The lifespan clock starts after birth and restoration complete;
// repeated calls synchronize remaining time while preserving the existing budget.
function startLifeClock(entity, now) {
  const state = ensureLifeState(entity, now);
  if (!state || state.clockStartedAt != null || !isLifeBrthDone(entity, now)) {
    return state;
  }
  const range = lifeRangeFor(entity);
  if (!range) return state;
  const duration = lerp(
    range[0],
    range[1],
    lifeRandUnit(entity, 0x51f15e)
  );
  state.clockStartedAt = now;
  state.lifeBudgetMs = duration;
  state.lifeConsumedMs = 0;
  state.lifeRemainingMs = duration + state.extensionMs;
  state.lastLifeUpdateAt = now;
  state.clockPauseReason = null;
  state.expiresAt = now + state.lifeRemainingMs;
  state.estimatedExpiresAt = state.expiresAt;
  return state;
}

function accntEnttyLife(entity, state, now) {
  // Resolve the delta from now once; rate changes consumption speed,
  // while estimatedExpiresAt converts the result back into world time.
  if (state.clockStartedAt == null || state.lifeBudgetMs == null) return state;
  if (state.lastLifeUpdateAt == null || now < state.lastLifeUpdateAt) {
    state.lastLifeUpdateAt = now;
  }
  const elapsed = max(0, now - state.lastLifeUpdateAt);
  state.lastLifeUpdateAt = now;
  state.clockPauseReason = lifeClockPauseReason(entity, now);
  const grantedLife = state.lifeBudgetMs + state.extensionMs;
  if (!state.committedRemoval && !state.clockPauseReason && elapsed > 0) {
    state.lifeConsumedMs += elapsed * lifeClock.rate;
  }
  state.lifeRemainingMs = max(0, grantedLife - state.lifeConsumedMs);
  state.estimatedExpiresAt =
    state.clockPauseReason || lifeClock.rate <= 0
      ? null
      : now + state.lifeRemainingMs / lifeClock.rate;
  state.expiresAt = state.estimatedExpiresAt;
  return state;
}

// Population projections include both pending births and committed removals.
function encnProjCnts() {
  const countsByType = Object.fromEntries(
    encounterLifeTypes.map((type) => [type, 0])
  );
  const lifecycle = window.AppRuntime?.entities;
  const pendingAdds = lifecycle?.pendingAdds || new Map();
  const pendingRemovals = lifecycle?.pendingRemovals || new Map();
  const current = [...creatures, ...parasites];
  const currentSet = new Set(current);
  for (const entity of current) {
    if (!isEncnLife(entity) || pendingRemovals.has(entity)) continue;
    const state = entity.lifeState;
    if (state?.committedRemoval) continue;
    countsByType[entity.type]++;
  }
  for (const entity of pendingAdds.keys()) {
    if (!isEncnLife(entity) || currentSet.has(entity)) continue;
    if (pendingRemovals.has(entity) || entity.lifeState?.committedRemoval) continue;
    countsByType[entity.type]++;
  }
  const total = encounterLifeTypes.reduce(
    (sum, type) => sum + countsByType[type],
    0
  );
  return { byType: countsByType, total };
}

function encnPopStt(total = encnProjCnts().total) {
  if (total <= lifeCfg.capacity.ovrlThresh) return "normal";
  if (total < lifeCfg.capacity.hardMaximum) return "overload";
  return "hard-limit";
}

// The hard population limit constrains lifecycle species, while basic
// or auxiliary objects may still enter the world under their own rules.
function lifeCanAdmTyp(type) {
  if (!encnLifTypSet.has(type)) return true;
  return encnProjCnts().total < lifeCfg.capacity.hardMaximum;
}

// Evaluate removal permission against species minimums and committed counts.
function lifeCanRmvEnt(entity, extrCommByType = null) {
  if (!isEncnLife(entity)) return true;
  if (entity.lifeState?.committedRemoval) return true;
  const projected = encnProjCnts();
  const extra = extrCommByType?.[entity.type] || 0;
  return (
    projected.byType[entity.type] - extra >
    lifeCfg.spcMins[entity.type]
  );
}

// Treat committed removals and active death phases as departure-locked state.
function isLifeDying(entity) {
  return Boolean(
    entity?.lifeState?.committedRemoval ||
      entity?.lifeState?.phase === "dying"
  );
}

// This function was modified with the assistance of ChatGPT.
function isLifeIxSafe(entity) {
  if (!entity || isLifeDying(entity)) return false;
  // Protect an ordinary cell while any participant is gazing at it.
  if (entity.type === eco.lifeType.basicCell) {
    const radius = infoRadius(entity);
    if (
      sessions.some((session) => {
        const gaze = session?.enabled && session.camera?.gaze;
        if (!gaze) return false;
        const position = focusPos(entity);
        return (
          dist2(gaze.x, gaze.y, position.x, position.y) <=
          radius * radius
        );
      })
    ) {
      return true;
    }
  }
  // Treat session ownership and encounter targets as interaction-protection state.
  if (ixTargetOwners.get(entity)) return true;
  if (isEncounterActive(entity)) return true;
  for (const session of sessions) {
    if (!session?.enabled) continue;
    if (session.lockedTargets.has(entity)) return true;
    if (desiredTargets(session).has(entity)) return true;
  }
  // Return, repair, and birth fields indicate that a cross-frame animation still owns the entity,
  // preserving it even without current gaze.
  if (
    entity.cellReturn ||
    entity.guardRprTx ||
    entity.careBirth ||
    entity.guardSeedBirth ||
    entity.guardVisX != null ||
    entity.guardVisY != null
  ) {
    return true;
  }
  // Each species checks interaction fields that can persist into the next frame.
  if (entity.type === eco.lifeType.predator) {
    return Boolean(
      entity.gazeDwellMs > 0 ||
        entity.cptrProg > 0 ||
        entity.captureFxAlpha > 0 ||
        entity.pathTextAlpha > 0 ||
        entity.lureActive
    );
  }
  if (entity.type === eco.lifeType.parasite) {
    return Boolean(
      entity.attnFcsd ||
        entity.attentionAlpha > entity.attnAlphBase + 0.001
    );
  }
  if (entity.type === eco.lifeType.roamer) {
    return Boolean(
      entity.isIxActv?.() ||
        entity.attnPow > 0.001 ||
        entity.attnMtnSett ||
        entity.splitBirth
    );
  }
  if (entity.type === eco.lifeType.deepDiver) {
    return Boolean(
      entity.attnPow > 0.001 ||
        entity.attentionScale > 1.001 ||
        entity.diffBirth
    );
  }
  if (entity.type === eco.lifeType.guardian) {
    return Boolean(
      entity.attnPow > 0.001 ||
        entity.attentionOffsetX ||
        entity.attentionOffsetY
    );
  }
  return false;
}

// Host selection first honors a still-valid specified object;
// the default path finds the nearest present object among available lifeforms.
function nearLifeHost(position, excluded = null, preferred = null) {
  if (
    preferred &&
    preferred !== excluded &&
    preferred.type !== eco.lifeType.parasite &&
    creatures.includes(preferred) &&
    !isLifeDying(preferred)
  ) {
    return preferred;
  }
  let nearest = null;
  let nearestDistSq = Infinity;
  for (const candidate of creatures) {
    if (
      candidate === excluded ||
      candidate.repairRetired ||
      isLifeDying(candidate)
    ) {
      continue;
    }
    const candPos = worldPos(candidate);
    const distSq = dist2(
      position.x,
      position.y,
      candPos.x,
      candPos.y
    );
    if (distSq < nearestDistSq) {
      nearest = candidate;
      nearestDistSq = distSq;
    }
  }
  return nearest;
}

// Find a new host for a Parasite on its original host and
// reset the attachment offset from its current world position.
function rhmParsFrom(host) {
  const hosted = parasites.filter((parasite) => parasite.host === host);
  for (const parasite of hosted) {
    const position = worldPos(parasite);
    const nextHost = nearLifeHost(position, host);
    if (!nextHost) continue;
    parasite.host = nextHost;
    parasite.rot0 = 0;
    parasite.rot = 0;
    parasite.rotCos = 1;
    parasite.rotSin = 0;
    parasite.ox0 = position.x - nextHost.x;
    parasite.oy0 = position.y - nextHost.y;
    parasite.ox = parasite.ox0;
    parasite.oy = parasite.oy0;
    parasite.attached = true;
    parasite.migrating = false;
    clearLifeCache(parasite);
  }
}

// Removal is a one-way commit boundary; the first call stores its reason and outcome.
function bgnLifeRmvl(entity, now, options = {}) {
  const state = ensureLifeState(entity, now);
  if (!state || state.committedRemoval) return false;
  if (!options.ignoreFloor && !lifeCanRmvEnt(entity)) return false;
  state.phase = "dying";
  state.cause = options.cause || "natural-lifespan";
  state.outcome = options.outcome || "fade";
  state.deathStartedAt = now;
  state.safeSince = null;
  state.committedRemoval = true;
  state.parasiteBorn = false;
  state.alpha = 1;
  state.scale = 1;
  state.movementScale = 1;
  state.pulseScale = 1;
  if (state.cause === "natural-lifespan" && state.outcome === "fade") {
    lifeLog.record(
      "LIFE FADING",
      "A life is leaving the ecology.",
      {
        key: "life-fading",
        primarySpecies: entity?.type || eco.lifeType.basicCell,
        display: false,
        now,
      }
    );
  }
  return true;
}

// Other species transform into residue according to configured probability;
// Parasites return an ordinary fade outcome.
function lifeMorphRoll(entity) {
  if (entity.type === eco.lifeType.parasite) return false;
  return (
    lifeRandUnit(entity, 0x28d34b) <
    lifeCfg.transform.chance
  );
}

// The transformation-source radius includes current species and animation scale,
// determining safe distances for the reversion marker and new cell.
function trnsSrcRad(source) {
  if (source?.type === eco.lifeType.basicCell) {
    const dthBaseRad = Number(source.lifeDthBaseRad);
    if (Number.isFinite(dthBaseRad) && dthBaseRad > 0) {
      return dthBaseRad;
    }
    const visualRadius = Number(source.visualRadius);
    const deathScale = Number(source.deathScale);
    if (Number.isFinite(visualRadius) && visualRadius > 0) {
      return visualRadius / max(0.0001, Number.isFinite(deathScale) ? deathScale : 1);
    }
  }
  return infoRadius(source);
}

// A fading lifeform may leave residue, allowing a shift of attention to continue affecting the ecology
function spawnResidue(
  source,
  now,
  preferredHost = null,
  revealDuration = null
) {
  // Transformation preserves the original lifeform's world position before finding a nearby host,
  // turning the fade outcome into traceable attention residue.
  if (!source || !lifeCanAdmTyp(eco.lifeType.parasite)) return null;
  const sourcePosition = worldPos(source);
  const host = nearLifeHost(sourcePosition, source, preferredHost);
  if (!host) return null;
  const index = encnProjCnts().byType[eco.lifeType.parasite];
  const seed =
    700000 +
    ((floor(source.seed || 0) ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0);
  const parasite = new Parasite(
    host,
    sourcePosition.x - host.x,
    sourcePosition.y - host.y,
    0,
    sizes.Parasite[index % sizes.Parasite.length],
    seed
  );
  parasite.attached = false;
  parasite.migrating = false;
  parasite.x = sourcePosition.x;
  parasite.y = sourcePosition.y;
  const normalRadius = max(1, infoRadius(parasite));
  const initialScale = clamp(
    (trnsSrcRad(source) *
      lifeCfg.transform.finalScale) /
      normalRadius,
    0.15,
    1.5
  );
  const resShowDur = max(
    1,
    revealDuration ??
      lifeCfg.transform.durationMs -
        lifeCfg.transform.birthDelayMs
  );
  parasite.lifeTrnsGrwth = {
    startedAt: now,
    revealEndsAt: now + resShowDur,
    endsAt: now + lifeCfg.transform.parsGrwthMs,
    initialScale,
  };
  parasite.prepStaticCache();
  // Register newly formed residue through the world queue.
  const added = window.CreatureWorld?.add?.(parasite, {
    group: "parasite",
    origin: "life-death-transformation",
    replacementFor: source,
  });
  if (added && source.lifeState?.cause === "natural-lifespan") {
    lifeLog.record(
      "LIFE TRANSFORMED",
      "A fading life continues as a Parasite.",
      {
        key: "life-transformed",
        primarySpecies: "Parasite",
        aggregationKey: "life-transformed:Parasite",
        priority: 90,
        dedupeMs: 30000,
        display: false,
        now,
      }
    );
  }
  return added ? parasite : null;
}

// Advance the reveal and growth of a transformed new lifeform,
// starting host migration once its reveal completes.
function updtLifeMrph(entity, now) {
  const growth = entity.lifeTrnsGrwth;
  if (!growth) return { alpha: 1, scale: 1 };
  const revealProgress = clamp(
    (now - growth.startedAt) / max(1, growth.revealEndsAt - growth.startedAt),
    0,
    1
  );
  const growthProgress = clamp(
    (now - growth.startedAt) / max(1, growth.endsAt - growth.startedAt),
    0,
    1
  );
  if (revealProgress >= 1 && !entity.attached && !entity.migrating) {
    entity.migrating = true;
    entity.migrationSpeed = max(0.01, entity.migrationSpeed || 0.12);
  }
  if (growthProgress >= 1) delete entity.lifeTrnsGrwth;
  return {
    alpha: cubicSmoothstep(revealProgress),
    scale: lerp(
      growth.initialScale,
      1,
      cubicSmoothstep(growthProgress)
    ),
  };
}

function updtDyngLife(entity, state, now) {
  const elapsed = max(0, now - state.deathStartedAt);
  if (state.cause === "overload-displacement") {
    // Overload fade-out may leave residue, expressing ecological crowding as a lasting influence.
    const config = lifeCfg.overload;
    const progress = clamp(elapsed / config.durationMs, 0, 1);
    const eased = cubicSmoothstep(progress);
    state.alpha = 1 - eased;
    state.scale = lerp(1, config.finalScale, eased);
    state.movementScale = lerp(1, 0.2, eased);
    state.pulseScale = 1 - eased;
    if (
      state.dispLdr &&
      !state.parasiteBorn &&
      elapsed >= config.parsBrthDlyMs
    ) {
      state.parasiteBorn = true;
      spawnResidue(
        entity,
        now,
        state.dispTgt,
        config.durationMs - config.parsBrthDlyMs
      );
    }
    if (progress >= 1 && !state.removalQueued) {
      state.removalQueued = true;
      window.CreatureWorld?.remove?.(entity, "overload-displacement");
    }
    return;
  }

  const vitlProg = clamp(
    elapsed / lifeCfg.vitlDurMs,
    0,
    1
  );
  state.movementScale = lerp(
    1,
    lifeCfg.activity.fnlMoveScl,
    vitlProg
  );
  state.pulseScale = lerp(
    1,
    lifeCfg.activity.fnlPlsScl,
    vitlProg
  );
  const transform = state.outcome === "transform";
  // Natural expiration chooses between fading and transformation.
  // The end of one lifeform still participates in the ecology and leaves room for interpretation.
  const config = transform
    ? lifeCfg.transform
    : lifeCfg.fade;
  const fadeProgress = clamp(
    (elapsed - config.startMs) / config.durationMs,
    0,
    1
  );
  const eased = cubicSmoothstep(fadeProgress);
  state.alpha = 1 - eased;
  state.scale = lerp(1, config.finalScale, eased);
  if (
    transform &&
    !state.parasiteBorn &&
    elapsed >=
      lifeCfg.transform.startMs +
        lifeCfg.transform.birthDelayMs
  ) {
    state.parasiteBorn = true;
    const born = spawnResidue(entity, now);
    if (!born) {
      state.outcome = "fade";
    }
  }
  const activeConfig =
    state.outcome === "transform"
      ? lifeCfg.transform
      : lifeCfg.fade;
  const completedAt = activeConfig.startMs + activeConfig.durationMs;
  if (elapsed >= completedAt && !state.removalQueued) {
    state.removalQueued = true;
    window.CreatureWorld?.remove?.(entity, "natural-lifespan");
  }
}

// An expired lifeform waits for active relationships to resolve safely,
// then fades or transforms into attention residue
// This function was modified with the assistance of ChatGPT.
function updtLifeMech(entity, ctx) {
  const now = ctx.now;
  const state = startLifeClock(entity, now);
  if (!state) return null;
  const trnsVis = updtLifeMrph(entity, now);
  entity.lifeTrnsAlph = trnsVis.alpha;
  entity.lifeTrnsScl = trnsVis.scale;
  if (state.committedRemoval) {
    if (!state.externalDeath) updtDyngLife(entity, state, now);
    return state;
  }
  state.alpha = 1;
  state.scale = 1;
  state.movementScale = 1;
  state.pulseScale = 1;
  accntEnttyLife(entity, state, now);
  if (state.lifeRemainingMs == null || state.lifeRemainingMs > 0) {
    state.phase = "alive";
    state.safeSince = null;
    return state;
  }
  state.phase = "expired-waiting";
  // Wait for a safe state and an additional grace period before committing the terminal outcome.
  if (isLifeIxSafe(entity)) {
    state.safeSince = null;
    return state;
  }
  if (state.safeSince == null) {
    state.safeSince = now;
    state.phase = "safe-grace";
    return state;
  }
  if (now - state.safeSince < lifeCfg.safeGraceMs) {
    state.phase = "safe-grace";
    return state;
  }
  const outcome = lifeMorphRoll(entity) ? "transform" : "fade";
  bgnLifeRmvl(entity, now, {
    cause: "natural-lifespan",
    outcome,
  });
  return state;
}

// Add a bounded lifespan budget to a still-living Predator.
function extndPrdtLife(entity, durationMs) {
  if (entity?.type !== eco.lifeType.predator) return false;
  const now = lifeClockNow();
  const state = ensureLifeState(entity, now);
  if (!state || state.committedRemoval) return false;
  const extension = max(0, Number(durationMs) || 0);
  if (extension <= 0) return false;
  // Resolve consumption up to the current moment before adding the budget.
  if (state.clockStartedAt != null) accntEnttyLife(entity, state, now);
  const grantedBefore = max(
    1,
    (state.lifeBudgetMs || 0) + state.extensionMs
  );
  const leftBfr = max(
    0,
    grantedBefore - (state.lifeConsumedMs || 0)
  );
  const tailMaximum = max(
    1,
    lifeCfg.predatorTail.visualScaleMax
  );
  const baseBudget = state.lifeBudgetMs;
  const ratioBefore = baseBudget == null
    ? 1
    : clamp(leftBfr / max(1, baseBudget), 0, tailMaximum);
  state.extensionMs += extension;
  const grantedAfter = grantedBefore + extension;
  state.lifeRemainingMs = max(
    0,
    grantedAfter - (state.lifeConsumedMs || 0)
  );
  state.estimatedExpiresAt =
    state.clockPauseReason || lifeClock.rate <= 0
      ? null
      : now + state.lifeRemainingMs / lifeClock.rate;
  state.expiresAt = state.estimatedExpiresAt;
  // Remaining ratios before and after extension feed the tail animation,
  // making visual growth correspond directly to added lifespan.
  entity.bgnLifTaiExt?.(
    now,
    ratioBefore,
    baseBudget == null
      ? 1
      : clamp(
          state.lifeRemainingMs / max(1, baseBudget),
          0,
          tailMaximum
        )
  );
  return true;
}

// Sort overload candidates by time since gaze; after preserving each species' minimum count,
// remaining individuals enter compression selection.
function overloadCands(currentTarget) {
  const projected = encnProjCnts();
  const selectedByType = Object.fromEntries(
    encounterLifeTypes.map((type) => [type, 0])
  );
  const candidates = creatures
    .filter(
      (entity) =>
        entity !== currentTarget &&
        Number.isFinite(entity.lastAttnAt) &&
        !isLifeDying(entity) &&
        !isLifeIxSafe(entity) &&
        !entity.repairRetired &&
        isLifeBrthDone(entity, lifeClockNow())
    )
    .sort(
      (first, second) =>
        first.lastAttnAt - second.lastAttnAt ||
        (first.seed || 0) - (second.seed || 0)
    );
  return candidates.filter((entity) => {
    const remaining =
      projected.byType[entity.type] - selectedByType[entity.type];
    if (remaining <= lifeCfg.spcMins[entity.type]) return false;
    selectedByType[entity.type]++;
    return true;
  });
}

// Ecological crowding expresses pressure on shared
// attentional space through gradual compression and residue
function entrOvrlAttn(target, session, now) {
  if (!target || !isEncnLife(target)) return false;
  if (session.lifeAttnTgt === target) return false;
  session.lifeAttnTgt = target;
  target.lastAttnAt = now;
  rcrdSurvEvnt("simple", target, now, {
    sessionId: session.id,
  });
  // Record one gaze event; trigger population compression
  // when the ecology is overloaded and cooldown has ended.
  if (encnPopStt() !== "overload") return false;
  if (
    now - overloadShift.lastStartedAt <
    lifeCfg.overload.cooldownMs
  ) {
    return false;
  }
  const candidates = overloadCands(target);
  const minimum = lifeCfg.overload.compressionMin;
  if (candidates.length < minimum) return false;
  const maximum = min(
    lifeCfg.overload.compressionMax,
    candidates.length
  );
  const desired =
    minimum +
    floor(
      lifeRandUnit(
        target,
        ++overloadShift.sequence
      ) *
        (maximum - minimum + 1)
    );
  // Candidates are already ordered by time since last gaze; randomness determines this cycle's scale.
  const selected = candidates.slice(0, desired);
  let committed = 0;
  for (let index = 0; index < selected.length; index++) {
    const entity = selected[index];
    if (
      bgnLifeRmvl(entity, now, {
        cause: "overload-displacement",
        outcome: "transform",
      })
    ) {
      const state = entity.lifeState;
      state.dispLdr = committed === 0;
      state.dispTgt =
        target.type === eco.lifeType.parasite ? target.host : target;
      committed++;
    }
  }
  // Write the ecological-pressure event only after successfully committing at least the minimum count.
  if (committed < minimum) return false;
  overloadShift.lastStartedAt = now;
  lifeLog.record(
    "ECOLOGY STRAINED",
    "Too many lives are competing for space.",
    {
      key: "ecology-strained",
      primarySpecies: target?.type || eco.lifeType.basicCell,
      aggregationKey: "ecology-strained",
      priority: 100,
      dedupeMs: 30000,
      display: false,
      now,
    }
  );
  return true;
}

// Balance species populations and movement so competing
// states of attention remain distinguishable within one image
const worldToken = Object.freeze({});
let ecosystemWorldReady = false;
let ecosystemBuildCount = 0;
const grpdLifeTyps = Object.freeze([
  eco.lifeType.predator,
  eco.lifeType.roamer,
  eco.lifeType.deepDiver,
  eco.lifeType.guardian,
]);
const sptlIndxTyps = Object.freeze([
  eco.lifeType.roamer,
  eco.lifeType.deepDiver,
]);
const groups = Object.fromEntries(
  grpdLifeTyps.map((type) => [type, []])
);
const avoidCellSize = 160;
const avoidRadius = 256;
const avoidBuffers = {
  [eco.lifeType.roamer]: [],
  [eco.lifeType.deepDiver]: [],
};
const avoidIndexName = (type) => `separation:${type}`;

// Rebuild groups by species and create avoidance indexes for configured species.
function indexGroups() {
  for (const type of grpdLifeTyps) groups[type].length = 0;
  for (const creature of creatures) {
    const group = groups[creature.type];
    if (group) group.push(creature);
  }

  const runtime = window.AppRuntime;
  if (!runtime) return;
  for (const type of sptlIndxTyps) {
    runtime.buildLifeIndex(
      avoidIndexName(type),
      groups[type],
      avoidCellSize
    );
  }
}

const clamp = num.clamp;
const cubicSmoothstep = num.cubicSmoothstep;
const dtFactor = () => clamp(deltaTime / 16.666, 0.25, 3);
const smoothA = (a, dt) => 1 - Math.pow(1 - a, dt);
const scaleOf = (type) => eco.lifeScale[type] || 1;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const mulberry32 = num.createMulberry32;

const srng = (rand, a, b) => a + (b - a) * rand();

const relAlert = {
  sequence: 0,
  regressions: [],
  lastSelection: null,
  lastPairKey: "",
  lastTrggAt: -Infinity,
};
const cellMateFx = [];

function relSmth(progress) {
  return num.smoothstep01(progress);
}

// Relationship animation and ecological updates share the frame clock.
function relClckNow() {
  return frame.now > 0
    ? frame.now
    : typeof millis === "function"
      ? millis()
      : 0;
}

// A fading lifeform gradually returns to a BasicCell, yielding its form back to the ecology.
function cellRtrnHoldMs() {
  const config = guardCfg;
  return max(
    returnCfg.shrinkDurMs +
      returnCfg.colorDurMs,
    returnCfg.shrinkDurMs +
      returnCfg.morphDelayMs +
      returnCfg.morphDurMs
  );
}

// Derive each phase of BasicCell reversion from one absolute timeline
// so rendering and lifecycle resolution share the same boundaries.
function cellRtrnTiml(regression) {
  const config = guardCfg;
  const detachMs =
    (returnCfg.detachMinMs +
      returnCfg.detachMaxMs) *
    0.5;
  const stageStartedAt = Number.isFinite(regression.stageStartedAt)
    ? regression.stageStartedAt
    : regression.startedAt + detachMs;
  const shrnkStartAt = stageStartedAt;
  const shrnkDoneAt =
    shrnkStartAt + returnCfg.shrinkDurMs;
  const colorStartedAt = shrnkDoneAt;
  const clrDoneAt =
    colorStartedAt + returnCfg.colorDurMs;
  const morphStartedAt =
    shrnkDoneAt + returnCfg.morphDelayMs;
  const mrphDoneAt =
    morphStartedAt + returnCfg.morphDurMs;
  const tgtDoneAt = max(clrDoneAt, mrphDoneAt);
  const completedAt = Number.isFinite(regression.completedAt)
    ? regression.completedAt
    : tgtDoneAt;
  return {
    stageStartedAt,
    shrnkStartAt,
    shrnkDoneAt,
    colorStartedAt,
    clrDoneAt,
    morphStartedAt,
    mrphDoneAt,
    tgtDoneAt,
    completedAt,
  };
}

// Generate a unified visual snapshot for one reversion marker from
// attachment through detachment and fade; the body timeline reads the result.
function rtrnMrkrVis(regression, markerPlan, now) {
  const config = guardCfg;
  const dtchDurMs = max(
    1,
    markerPlan?.dtchDurMs ||
      (returnCfg.detachMinMs +
        returnCfg.detachMaxMs) *
        0.5
  );
  const attachedAt = markerPlan?.attachedAt ||
    regression.startedAt + dtchDurMs;
  const detachProgress = relSmth(
    (now - regression.startedAt) / dtchDurMs
  );
  const mrkrDoneAt =
    attachedAt + cellRtrnHoldMs();
  const mnsFadeStartAt =
    mrkrDoneAt - returnCfg.minusFadeDurMs;
  const minusAlpha =
    1 -
    relSmth(
      (now - mnsFadeStartAt) /
        max(1, returnCfg.minusFadeDurMs)
    );
  return { detachProgress, minusAlpha, attachedAt, mrkrDoneAt };
}

// Convert the reversion timeline into displacement, scale, and reveal progress.
function cellRtrnVisStt(regression, now) {
  const config = guardCfg;
  const timeline = cellRtrnTiml(regression);
  const progress = clamp(
    (now - regression.startedAt) /
      max(1, timeline.completedAt - regression.startedAt),
    0,
    1
  );
  // Marker detachment, body contraction, species-color fading,
  // and cell reveal use independent intervals so the
  // meaning of transformation becomes visible gradually.
  const markerStates = (regression.markerPlans || []).map((markerPlan) =>
    rtrnMrkrVis(regression, markerPlan, now)
  );
  // Advance the body phase when the first minus sign begins to detach.
  const detachProgress = markerStates.length
    ? max(...markerStates.map((state) => state.detachProgress))
    : relSmth(
        (now - regression.startedAt) /
          max(1, timeline.stageStartedAt - regression.startedAt)
      );
  const shrinkProgress = relSmth(
    (now - timeline.shrnkStartAt) /
      max(1, returnCfg.shrinkDurMs)
  );
  const colorProgress = relSmth(
    (now - timeline.colorStartedAt) /
      max(1, returnCfg.colorDurMs)
  );
  const morphProgress = relSmth(
    (now - timeline.morphStartedAt) /
      max(1, returnCfg.morphDurMs)
  );
  const spcFadeProg = relSmth(
    morphProgress /
      max(0.001, returnCfg.spcFadeEndShr)
  );
  const cellShowProg = relSmth(
    (morphProgress - returnCfg.cellShoStrShr) /
      max(
        0.001,
        1 - returnCfg.cellShoStrShr
      )
  );
  // Average minus-sign opacity so overall brightness recedes smoothly as multiple markers fade.
  const minusAlpha = markerStates.length
    ? markerStates.reduce((sum, state) => sum + state.minusAlpha, 0) /
      markerStates.length
    : rtrnMrkrVis(regression, null, now).minusAlpha;
  return {
    progress,
    detachProgress,
    shrinkProgress,
    colorProgress,
    morphProgress,
    spcFadeProg,
    cellShowProg,
    minusAlpha,
    targetScale: lerp(
      regression.originalScale,
      regression.targetScale,
      shrinkProgress
    ),
    targetAlpha: lerp(
      regression.originalAlpha,
      returnCfg.targetAlpha,
      spcFadeProg
    ),
  };
}

// Interpolate the reverting form between its world position and transformation anchor,
// approaching the new cell gradually after the color change begins.
function returnMorphPos(
  regression,
  visualState,
  livePosition
) {
  if (
    visualState.colorProgress > 0 &&
    (!Number.isFinite(regression.trnsAnchrX) ||
      !Number.isFinite(regression.trnsAnchrY))
  ) {
    regression.trnsAnchrX = livePosition.x;
    regression.trnsAnchrY = livePosition.y;
  }
  return Number.isFinite(regression.trnsAnchrX) &&
    Number.isFinite(regression.trnsAnchrY)
    ? {
        x: regression.trnsAnchrX,
        y: regression.trnsAnchrY,
      }
    : livePosition;
}

// Combine reversion progress into one filter layer, using desaturation, tint,
// and brightness to express the return to cellular form after care.
function careRegrFltr(mix) {
  const progress = clamp(Number(mix) || 0, 0, 1);
  if (progress <= 0.001) return "none";
  return [
    `grayscale(${progress})`,
    `sepia(${progress * 0.58})`,
    `saturate(${1 + progress * 2.4})`,
    `hue-rotate(${progress * 126}deg)`,
    `brightness(${1 + progress * 0.12})`,
  ].join(" ");
}

// Reversion candidates are present, idle members of the specified species whose birth phase is complete.
function relReadyLife(type) {
  const source = type === eco.lifeType.parasite
    ? parasites
    : creatures.filter((entity) => entity.type === type);
  return source.filter(
    (entity) =>
      entity &&
      isVisible(entity) &&
      !(
        type === eco.lifeType.predator &&
        entity.birthProgress != null &&
        entity.birthProgress < 1
      ) &&
      tgtRdyToSssn(entity) &&
      !entity.cellReturn &&
      !entity.repairRetired
  );
}

// Order species by descending number of eligible reversion candidates, resolving ties by preset order.
function relRankedType() {
  const types = [
    eco.lifeType.predator,
    eco.lifeType.parasite,
    eco.lifeType.roamer,
    eco.lifeType.deepDiver,
  ];
  return types
    .map((type, order) => ({
      type,
      order,
      entities: relReadyLife(type),
    }))
    .sort(
      (first, second) =>
        second.entities.length - first.entities.length ||
        first.order - second.order
    );
}

// Use the mean participant gaze position as the event center,
// falling back to the source anchor or world center when unavailable.
function relEventCenter() {
  const sessionIds = [
    activeSession?.id,
    ...(care.state.collIds || []),
  ];
  const points = sessions
    .filter(
      (session) =>
        sessionIds.includes(session.id) && session.camera?.gaze
    )
    .map((session) => session.camera.gaze);
  if (!points.length && care.state.source) {
    return focusPos(care.state.source);
  }
  return points.length
    ? {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      }
    : { x: ecoWorld.centerX(), y: ecoWorld.centerY() };
}

// Prioritize repair of more abundant species while preserving
// minimum populations to sustain ecological diversity
function slctRtrnClls() {
  if (encnPopStt() === "hard-limit") {
    relAlert.lastSelection = [];
    return [];
  }
  const center = relEventCenter();
  const ranked = relRankedType().slice(0, 2);
  const projected = encnProjCnts();
  const ratios = [0.14, 0.1];
  const selection = [];
  for (let rank = 0; rank < ranked.length; rank++) {
    const species = ranked[rank];
    const targetCount = min(
      species.entities.length,
      max(
        0,
        projected.byType[species.type] -
          lifeCfg.spcMins[species.type]
      ),
      max(1, ceil(species.entities.length * ratios[rank]))
    );
    const targets = [...species.entities]
      .sort((first, second) => {
        const firstPosition = worldPos(first);
        const secondPosition = worldPos(second);
        return (
          dist2(
            center.x,
            center.y,
            firstPosition.x,
            firstPosition.y
          ) -
          dist2(
            center.x,
            center.y,
            secondPosition.x,
            secondPosition.y
          )
        );
      })
      .slice(0, targetCount);
    for (const target of targets) {
      selection.push({ target, type: species.type, rank, ratio: ratios[rank] });
    }
  }
  relAlert.lastSelection = ranked.map((species, rank) => ({
    type: species.type,
    population: species.entities.length,
    ratio: ratios[rank],
    selectedCount: selection.filter((item) => item.type === species.type).length,
  }));
  return selection;
}

// This function was modified with the assistance of ChatGPT.
function bgnCellRtrns(now) {
  // Reversion targets come from the current relational imbalance,
  // with the Guardian providing a visible source.
  const targets = slctRtrnClls();
  const guardians = care.state.participants.length
    ? care.state.participants
    : care.state.source
      ? [care.state.source]
      : [];
  // Freeze original position, scale, and opacity so subsequent
  // animation remains independent of ordinary lifeform movement.
  const regressions = [];
  for (let index = 0; index < targets.length; index++) {
    const item = targets[index];
    const target = item.target;
    const position = worldPos(target);
    const originalScale = Number.isFinite(target.careScale)
      ? target.careScale
      : 1;
    const originalAlpha = Number.isFinite(target.careAlpha)
      ? target.careAlpha
      : 1;
    target.cellReturn = true;
    const sourceGuard = guardians[index % max(1, guardians.length)] || null;
    const regression = {
      ...item,
      alertSequence: relAlert.sequence,
      sourceGuard,
      srcPlusIndx: 0,
      plusIds: [],
      markerPlans: [],
      markerKind: "minus",
      startedAt: now,
      x: position.x,
      y: position.y,
      originalScale,
      originalAlpha,
      seed: (target.seed || index * 917) + relAlert.sequence * 31,
    };
    const cellPlan = returnCellPlan(regression);
    const bscCellVisRad =
      window.GazeApp?.relationalBasicCellVisualRadius?.(
        cellPlan.size
      ) || 24;
    regression.tgtVisRad = bscCellVisRad;
    regression.targetScale =
      bscCellVisRad / max(1, infoRadius(target));
    regressions.push(regression);
    relAlert.regressions.push(regression);
  }
  // Group targets by Guardian and assign drifting symbols,
  // cycling through symbols when too few are available.
  const regrByGrd = new Map();
  for (const regression of regressions) {
    if (!regression.sourceGuard) continue;
    const assigned = regrByGrd.get(regression.sourceGuard) || [];
    assigned.push(regression);
    regrByGrd.set(regression.sourceGuard, assigned);
  }
  for (const [guardian, assigned] of regrByGrd) {
    const pluses = guardian.driftPluses || [];
    assigned.forEach((regression, assignIndx) => {
      regression.plusIds = pluses
        .map((_, plusIndex) => plusIndex)
        .filter(
          (plusIndex) => plusIndex % assigned.length === assignIndx
        );
      if (!regression.plusIds.length && pluses.length) {
        regression.plusIds.push(assignIndx % pluses.length);
      }
      regression.srcPlusIndx = regression.plusIds[0] || 0;
      regression.markerPlans = regression.plusIds.map(
        (plusIndex, markerIndex) => {
        const plus = pluses[plusIndex];
          const home = detcCarPluPos(guardian, plus);
          const surface = carePlusPos(
            regression.target,
            plus,
            markerIndex,
            now
          );
          return {
            plusIndex,
            markerIndex,
            distance: dist(home.x, home.y, surface.x, surface.y),
            dtchDurMs: 0,
            attachedAt: 0,
          };
        }
      );
    });
  }
  // Travel distance determines symbol-detachment duration, letting nearby targets respond earlier and
  // distant ones arrive later with a natural stagger.
  const markerPlans = regressions
    .flatMap((regression) =>
      regression.markerPlans.map((markerPlan) => ({
        regression,
        markerPlan,
      }))
    )
    .sort(
      (first, second) =>
        first.markerPlan.distance - second.markerPlan.distance ||
        first.regression.seed - second.regression.seed ||
        first.markerPlan.plusIndex - second.markerPlan.plusIndex
    );
  markerPlans.forEach(({ markerPlan }, rank) => {
    const distanceRank =
      markerPlans.length <= 1 ? 0.5 : rank / (markerPlans.length - 1);
    markerPlan.dtchDurMs = lerp(
      returnCfg.detachMinMs,
      returnCfg.detachMaxMs,
      distanceRank
    );
    markerPlan.attachedAt = now + markerPlan.dtchDurMs;
  });
  // Completion time covers both target reversion and each symbol's hold,
  // releasing state only after all layers end.
  const postAttchDurMs = cellRtrnHoldMs();
  for (const regression of regressions) {
    const detachMs =
      (returnCfg.detachMinMs +
        returnCfg.detachMaxMs) *
      0.5;
    regression.stageStartedAt = regression.markerPlans.length
      ? min(...regression.markerPlans.map((plan) => plan.attachedAt))
      : now + detachMs;
    const tgtDoneAt =
      regression.stageStartedAt + postAttchDurMs;
    const lastMrkrDoneAt = regression.markerPlans.length
      ? max(
          ...regression.markerPlans.map(
            (plan) => plan.attachedAt + postAttchDurMs
          )
        )
      : tgtDoneAt;
    regression.completedAt = max(tgtDoneAt, lastMrkrDoneAt);
    if (regression.cellPlan) {
      regression.cellPlan.completedAt = regression.completedAt;
    }
    for (const markerPlan of regression.markerPlans) {
      const plus = regression.sourceGuard.driftPluses[markerPlan.plusIndex];
      plus.relDetcUntl = max(
        plus.relDetcUntl || 0,
        regression.completedAt
      );
    }
  }
  return targets.length;
}

// Trigger one relational alert for the same participant combination within the cooldown period.
function wasPairTrgg(pairKey, now) {
  return Boolean(
    pairKey &&
      pairKey === relAlert.lastPairKey &&
      now - relAlert.lastTrggAt <
        guardCfg.relPairColdMs
  );
}

// Once the relationship plan is complete, the reversion alert locks its
// center and targets so subsequent phases share one narrative anchor.
function bgnRelAlrt() {
  const now = frame.now || (typeof millis === "function" ? millis() : 0);
  const pairKey = [
    activeSession?.id,
    ...(care.state.collIds || []),
  ]
    .filter(Boolean)
    .sort()
    .join("|");
  if (wasPairTrgg(pairKey, now)) {
    return false;
  }
  relAlert.lastPairKey = pairKey;
  relAlert.lastTrggAt = now;
  relAlert.sequence++;
  bgnCellRtrns(now);
  return true;
}

// On first read, lock the reverting cell's size, rotation,
// and completion time so redraw and restoration reuse the same visual result.
function returnCellPlan(regression) {
  if (regression.cellPlan) return regression.cellPlan;
  const rng = mulberry32(floor(regression.seed) >>> 0);
  regression.cellPlan = {
    size: lerp(0.18, 0.27, rng()),
    rotation: rng() * TWO_PI,
    completedAt:
      regression.startedAt +
      returnCfg.durationMs,
  };
  return regression.cellPlan;
}

// Reversion first reuses the BasicCell reserved by the plan; if absent,
// create one and immediately record ownership.
function ensrRtrnCell(
  regression,
  position,
  revealProgress,
  now
) {
  const plan = returnCellPlan(regression);
  if (!regression.basicCell || regression.basicCell.dead) {
    regression.basicCell =
      window.GazeApp?.createRelCell?.(
        position.x,
        position.y,
        {
          size: plan.size,
          rotation: plan.rotation,
          glowUntil:
            plan.completedAt +
            guardCfg.careMateDlyMs,
          regressionHold: true,
          revealProgress,
        },
        now
      ) || null;
  }
  if (regression.basicCell) {
    window.GazeApp?.updtCellRtrn?.(
      regression.basicCell,
      position.x,
      position.y,
      revealProgress
    );
  }
  return regression.basicCell;
}

function updateRelAlert(now) {
  // Reverse iteration allows completed items to be removed immediately.
  for (let index = relAlert.regressions.length - 1; index >= 0; index--) {
    const regression = relAlert.regressions[index];
    const visualState = cellRtrnVisStt(regression, now);
    const livePosition = worldPos(regression.target);
    const position = returnMorphPos(
      regression,
      visualState,
      livePosition
    );
    if (visualState.colorProgress > 0) {
      regression.target.returnVisX = position.x;
      regression.target.returnVisY = position.y;
    }
    regression.target.careScale = visualState.targetScale;
    regression.target.careAlpha = visualState.targetAlpha;
    regression.target.grdRgrssMix =
      visualState.colorProgress;
    // Establish the BasicCell after form transformation begins.
    if (visualState.morphProgress > 0) {
      ensrRtrnCell(
        regression,
        position,
        visualState.cellShowProg,
        now
      );
    }
    if (visualState.progress < 1) continue;
    delete regression.target.grdRgrssMix;
    delete regression.target.returnVisX;
    delete regression.target.returnVisY;
    // On completion, remove the old target before releasing the new cell's return lock.
    window.CreatureWorld?.remove?.(
      regression.target,
      "relational-alert-basic-cell"
    );
    const cell = ensrRtrnCell(
      regression,
      position,
      1,
      now
    );
    if (cell) {
      window.GazeApp?.freeCellRtrn?.(cell, now);
      bgnCellChld(cell, regression, now);
    }
    relAlert.regressions.splice(index, 1);
  }
}

// The reverting cell's birth state inherits the original plan's position and timing.
function bgnCellChld(cell, regression, now) {
  if (!cell || cell.relCompanionFx) return;
  const startedAt = now + guardCfg.careMateDlyMs;
  const effect = {
    cell,
    startedAt,
    until:
      startedAt + guardCfg.careMateMs,
    particleSeed: abs(sin((cell.seed || 0) * 0.019)) * TWO_PI,
    companions: care.crtComp(
      cell,
      regression?.sourceGuard,
      now,
      returnCfg.mateSizeSclMin,
      returnCfg.mateSizeSclMax
    ),
    symbolKind: "minus",
    scale: returnCfg.companionScale,
  };
  cell.relCompanionFx = effect;
  cellMateFx.push(effect);
}

const ecoWorld = {
  left: () => width * 0.08,
  right: () => width * 0.92,
  centerX: () => width * 0.5,
  centerY: () => height * 0.5,
  radius: () => min(width * 0.5, height * 0.5),
  radiusX: () => min(width, height) * 0.6,
  radiusY: () => ecoWorld.radius() * 1.05,

  zone(type) {
    return lifeZones[type] || defaultZone;
  },

  // Use the ellipse equation to determine whether a point belongs to the ecological world;
  // padding lets spawning and collision share a safety margin.
  inside(x, y, pad = 0) {
    const rx = max(1, this.radiusX() - pad);
    const ry = max(1, this.radiusY() - pad);
    const dx = (x - this.centerX()) / rx;
    const dy = (y - this.centerY()) / ry;
    return dx * dx + dy * dy <= 1;
  },

  // Project a point into the padded elliptical world and return the boundary normal,
  // sharing the result between position constraints and reflection calculations.
  project(x, y, pad = 0, out = null) {
    const result = out || {};
    const cx = this.centerX();
    const cy = this.centerY();
    const rx = max(1, this.radiusX() - pad);
    const ry = max(1, this.radiusY() - pad);
    const dx = x - cx;
    const dy = y - cy;
    const q = sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    if (q <= 1) {
      result.x = x;
      result.y = y;
      result.hit = false;
      result.nx = 0;
      result.ny = 0;
      return result;
    }
    const px = cx + dx / q;
    const py = cy + dy / q;
    let nx = (px - cx) / (rx * rx);
    let ny = (py - cy) / (ry * ry);
    const nd = max(0.001, sqrt(nx * nx + ny * ny));
    nx /= nd;
    ny /= nd;
    result.x = px;
    result.y = py;
    result.hit = true;
    result.nx = nx;
    result.ny = ny;
    return result;
  },

  // Calculate the ellipse's horizontal boundary at a specified height.
  xBoundsAt(y, pad = 0, out = null) {
    const result = out || {};
    const rx = max(1, this.radiusX() - pad);
    const ry = max(1, this.radiusY() - pad);
    const dy = clamp(y - this.centerY(), -ry, ry);
    const half = rx * sqrt(max(0, 1 - (dy * dy) / (ry * ry)));
    result.min = this.centerX() - half;
    result.max = this.centerX() + half;
    return result;
  },

  // Apply the species activity band and optional horizontal range before projecting into the elliptical
  // world boundary, keeping constraints consistent.
  keep(o, opt = emptyOptions) {
    const zone = this.zone(o.type);
    const xPad = opt.xPad ?? 20;
    const minX = opt.x0 != null ? width * opt.x0 + xPad : this.left() + xPad;
    const maxX = opt.x1 != null ? width * opt.x1 - xPad : this.right() - xPad;
    const y0 = opt.y0 ?? zone.y0;
    const y1 = opt.y1 ?? zone.y1;
    o.x = clamp(o.x, minX, maxX);
    o.y = clamp(o.y, height * y0, height * y1);
    const projection = o.wrldProj || (o.wrldProj = {});
    const p = this.project(o.x, o.y, opt.circlePad ?? 0, projection);
    o.x = p.x;
    o.y = p.y;
    return o;
  },
};

const frame = {
  dt: 1,
  movementDt: 1,
  movementT: 0,
  movementReady: false,
  now: 0,
  t: 0,
};

const sortDepth = (a, b) =>
  a.y + (a.dy || 0) - (b.y + (b.dy || 0));

const renderMargin = 260;
// Visibility includes a buffer beyond the canvas so lifeforms near
// the edge remain selectable and move smoothly into and out of view.
const isVisible = (object) => {
  const anchor = object.host || object;
  return (
    anchor.x >= -renderMargin &&
    anchor.x <= width + renderMargin &&
    anchor.y >= -renderMargin &&
    anchor.y <= height + renderMargin
  );
};

const getCircleTrig = num.circleTrig;
const makeRingBuffer = num.createCircularNoiseBuffer;
const makeWavePoints = num.createOrganicRingPoints;

const drawWaveRing = softGlow.drawWaveRing;

// Determine the number of visible segments from progress, beginning at three quarters of the ring.
function drawWavRinPro(points, progress) {
  const segments = points.length;
  const visSegs = clamp(
    Math.ceil(segments * clamp(progress, 0, 1)),
    0,
    segments
  );
  if (visSegs <= 0) return;
  const startIndex = Math.floor(segments * 0.75);
  beginShape();
  for (let step = -1; step <= visSegs + 1; step++) {
    const index = (startIndex + step + segments) % segments;
    curveVertex(points[index][0], points[index][1]);
  }
  if (visSegs >= segments) endShape(CLOSE);
  else endShape();
}

function advanceCache(
  owner,
  now,
  ticksPerSecond,
  phaseMs,
  cacheKey,
  stateKey,
  buildMethod
) {
  // Advance the cache by preset time steps and return the interpolation ratio.
  const stepMs = 1000 / ticksPerSecond;
  const shiftedTime = now + phaseMs;
  const tick = Math.floor(shiftedTime / stepMs);
  let cache = owner[cacheKey];

  if (!cache || tick < cache.tick || tick > cache.tick + 1) {
    const current = owner[buildMethod](tick, cache?.current);
    const next = owner[buildMethod](tick + 1, cache?.next);
    if (!cache) cache = owner[cacheKey] = {};
    cache.tick = tick;
    cache.current = current;
    cache.next = next;
  } else if (tick === cache.tick + 1) {
    const current = cache.next;
    const next = owner[buildMethod](tick + 1, cache.current);
    cache.tick = tick;
    cache.current = current;
    cache.next = next;
  }

  const state = owner[stateKey];
  state.current = cache.current;
  state.next = cache.next;
  state.mix = clamp(shiftedTime / stepMs - tick, 0, 1);
  return state;
}

// 7. Preserving activity bounds, mutual distance, and opportunities for encounter
// Lifeforms move within their own bounds while leaving one another room to breathe.
function driftUpdate(o, ctx, cfg, mul = null) {
  const dt = ctx.movementDt ?? ctx.dt;
  const ttMul = mul?.ttMul ? mul.ttMul(o, ctx) : 1;
  const initialT = o.tt ?? random(9999);
  o.tt = initialT + cfg.ttSpd * ttMul * dt;
  o.visualT = (o.visualT ?? initialT) + cfg.ttSpd * ttMul * ctx.dt;

  const t = o.tt;
  const n1 = noise(o.seed + t);
  const n2 = noise(o.seed + (cfg.n2Off ?? 333) + t);
  const dxMul = mul?.dxMul ? mul.dxMul(o, ctx) : 1;
  const yMul = mul?.yMul != null ? (typeof mul.yMul === "function" ? mul.yMul(o, ctx) : mul.yMul) : 1;

  o.x = o.x0 + (n1 - 0.5) * (cfg.dx ?? 0) * dxMul;
  o.dy = (sin(t + o.seed) * (cfg.sinY ?? 0) + (n2 - 0.5) * (cfg.noiseY ?? 0)) * yMul;
  o.y = o.y0 + o.dy;

  if (cfg.rotN != null) o.rot = o.rot0 + (n1 - 0.5) * cfg.rotN + (mul?.rotExtra ? mul.rotExtra(o, ctx) : 0);
  if (cfg.bAmp != null) o.b = 1 + sin(o.visualT * (cfg.bFreq ?? 1) + o.seed) * cfg.bAmp;
}

function cruiseUpdate(o, ctx, cfg) {
  // Generate a random direction on the first update; subsequent
  // frames move continuously along the instance velocity.
  if (o.cruiseVX == null || o.cruiseVY == null) {
    const angle = random(TWO_PI);
    o.cruiseVX = cos(angle);
    o.cruiseVY = sin(angle);
  }

  if (!o.cruiseCenter) o.cruiseCenter = { x: o.x0, y: o.y0 };
  const zoneMinX = ecoWorld.left() + 35;
  const zoneMaxX = ecoWorld.right() - 35;
  const zoneMinY = height * cfg.y0;
  const zoneMaxY = height * cfg.y1;
  const centerX = clamp(
    (o.cruiseCenter.x0 ?? o.cruiseCenter.x) + (o.cruiseOffsetX || 0),
    zoneMinX,
    zoneMaxX
  );
  const centerY = clamp(
    (o.cruiseCenter.y0 ?? o.cruiseCenter.y) + (o.cruiseOffsetY || 0),
    zoneMinY,
    zoneMaxY
  );
  const speed = cfg.speed;
  const minX = max(zoneMinX, centerX - cfg.rx);
  const maxX = min(zoneMaxX, centerX + cfg.rx);
  const minY = max(zoneMinY, centerY - cfg.ry);
  const maxY = min(zoneMaxY, centerY + cfg.ry);

  const movementDt = ctx.movementDt ?? ctx.dt;
  o.x0 += o.cruiseVX * speed * movementDt;
  o.y0 += o.cruiseVY * speed * movementDt;

// Local activity zones preserve movement through specular reflection,
// allowing lifeforms to turn naturally at their edges.
  if (o.x0 <= minX) {
    o.x0 = minX;
    if (o.cruiseVX < 0) o.cruiseVX *= -1;
  } else if (o.x0 >= maxX) {
    o.x0 = maxX;
    if (o.cruiseVX > 0) o.cruiseVX *= -1;
  }
  if (o.y0 <= minY) {
    o.y0 = minY;
    if (o.cruiseVY < 0) o.cruiseVY *= -1;
  } else if (o.y0 >= maxY) {
    o.y0 = maxY;
    if (o.cruiseVY > 0) o.cruiseVY *= -1;
  }

  // Finally project the result into the overall elliptical world.
  const projection = o.wrldProj || (o.wrldProj = {});
  const circlePoint = ecoWorld.project(o.x0, o.y0, 0, projection);
  if (circlePoint.hit) {
    o.x0 = circlePoint.x;
    o.y0 = circlePoint.y;
    const dot = o.cruiseVX * circlePoint.nx + o.cruiseVY * circlePoint.ny;
    if (dot > 0) {
      o.cruiseVX -= 2 * dot * circlePoint.nx;
      o.cruiseVY -= 2 * dot * circlePoint.ny;
    }
  }

}

// Project an entity entering the inner region onto the inner
// ellipse boundary and reflect its inward velocity component.
function keepAtEdge(o, innerRatio) {
  const rx = ecoWorld.radiusX();
  const ry = ecoWorld.radiusY();
  const dx = o.x0 - ecoWorld.centerX();
  const dy = o.y0 - ecoWorld.centerY();
  const q = sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  if (q >= innerRatio || q < 0.001) return;

  const scale = innerRatio / q;
  o.x0 = ecoWorld.centerX() + dx * scale;
  o.y0 = ecoWorld.centerY() + dy * scale;

  const nx = dx / (rx * rx);
  const ny = dy / (ry * ry);
  const inward = o.cruiseVX * nx + o.cruiseVY * ny;
  if (inward < 0) {
    const nn = nx * nx + ny * ny;
    o.cruiseVX -= (2 * inward * nx) / nn;
    o.cruiseVY -= (2 * inward * ny) / nn;
  }
}

// Constrain the activity band by the Guardian's resident
// position while preserving fixed horizontal padding.
function keepGuardEdge(o) {
  if (!o.poleResident) return;

  if (o.poleResident === "right") {
    // A right-side Guardian is constrained by both its dedicated activity band and the ellipse boundary.
    const clampRightBand = (x, y, xPad) => {
      const boundsCache = o._xBounds || (o._xBounds = {});
      const bounds = ecoWorld.xBoundsAt(y, 0, boundsCache);
      const maxX = Math.min(width * guardRange.rightX1, ecoWorld.right() - xPad, bounds.max);
      const minX = Math.min(
        maxX,
        Math.max(width * guardRange.rightX0, ecoWorld.left() + xPad, bounds.min)
      );
      return clamp(x, minX, maxX);
    };

    o.x0 = clampRightBand(o.x0, o.y0, 35);
    o.x = clampRightBand(o.x, o.y, 20);
    return;
  }

  const isTop = o.poleResident === "top";
  const minY = height * (isTop ? guardRange.topY0 : guardRange.bottomY0);
  const maxY = height * (isTop ? guardRange.topY1 : guardRange.bottomY1);
  const clampInWorld = (x, y, xPad) => {
    const boundsCache = o._xBounds || (o._xBounds = {});
    const bounds = ecoWorld.xBoundsAt(y, 0, boundsCache);
    return clamp(x, max(ecoWorld.left() + xPad, bounds.min), min(ecoWorld.right() - xPad, bounds.max));
  };

  o.y0 = clamp(o.y0, minY, maxY);
  o.x0 = clampInWorld(o.x0, o.y0, 35);
  o.y = clamp(o.y, minY, maxY);
  o.x = clampInWorld(o.x, o.y, 20);
}

// Separation collisions permit bounded displacement and adjust current position and movement origin
// proportionally, preserving subsequent motion continuity.
function limitDrift(o, startX, startY, startX0, startY0, maxPush) {
  if (!Number.isFinite(maxPush)) return;

  const movedX = o.x - startX;
  const movedY = o.y - startY;
  const movedDist = sqrt(movedX * movedX + movedY * movedY);
  if (movedDist <= maxPush) return;

  const moveScale = maxPush / movedDist;
  o.x = startX + movedX * moveScale;
  o.y = startY + movedY * moveScale;
  o.x0 = startX0 + (o.x0 - startX0) * moveScale;
  o.y0 = startY0 + (o.y0 - startY0) * moveScale;
}

// Clamp visible speed by actual frame duration.
function lmtVisSpd(o, maxSpeed, frameMs, maxFrameMs) {
  if (!Number.isFinite(o.visualMotionX) || !Number.isFinite(o.visualMotionY)) {
    o.visualMotionX = o.x;
    o.visualMotionY = o.y;
    return;
  }

  const dx = o.x - o.visualMotionX;
  const dy = o.y - o.visualMotionY;
  const distance = sqrt(dx * dx + dy * dy);
  const maximumStep =
    maxSpeed * (min(max(0, frameMs), maxFrameMs) / 1000);
  if (distance > maximumStep && distance > 0.001) {
    const stepScale = maximumStep / distance;
    o.x = o.visualMotionX + dx * stepScale;
    o.y = o.visualMotionY + dy * stepScale;
  }
  o.visualMotionX = o.x;
  o.visualMotionY = o.y;
}

// Collision radius includes species baseline size and current animation scale.
function collRad(o) {
  if (o.type === eco.lifeType.roamer) {
    return (
      56.43 *
      (o.sz || 1) *
      (o.splitGrowMul ?? 1) *
      (o.deathScale ?? 1)
    );
  }
  if (o.type === eco.lifeType.deepDiver) {
    const focusSizeScale =
      1 + effcFcsN(o) * deepCfg.focusSizeGain;
    return (
      52.25 *
      (o.sz || 1) *
      (o.diffGrwthScl ?? 1) *
      focusSizeScale *
      deepFocusScale(o)
    );
  }
  return 0;
}

function separateByGap(
  o,
  type,
  minDist,
  strength,
  sizeAware,
  maxPush,
  visualPadding
) {
  // Save the position at frame start so maximum displacement can be
  // constrained after accumulating forces from multiple neighbors.
  const startX = o.x;
  const startY = o.y;
  const startX0 = o.x0;
  const startY0 = o.y0;

  // Query the spatial index first, falling back to the complete
  // species collection when the runtime index is empty.
  const spatialPeers = window.AppRuntime?.queryLifeIndex(
    avoidIndexName(type),
    o.x,
    o.y,
    avoidRadius,
    avoidBuffers[type]
  );
  const peers = spatialPeers || groups[type];
  for (const other of peers) {
    if (other === o) continue;
    let targetDist;
    if (visualPadding != null) {
      targetDist =
        collRad(o) + collRad(other) + visualPadding;
    } else if (sizeAware) {
      const spacingBias = max(o.sepBias || 1, other.sepBias || 1);
      targetDist = minDist * ((o.sz || 1) + (other.sz || 1)) * spacingBias;
    } else {
      targetDist = minDist;
    }
    let dx = o.x - other.x;
    let dy = o.y - other.y;
    let d = sqrt(dx * dx + dy * dy);
    if (d >= targetDist) continue;

    // Use the seed difference to determine separation direction when positions overlap.
    if (d < 0.001) {
      const angle = (o.seed - other.seed) % TWO_PI;
      dx = cos(angle);
      dy = sin(angle);
      d = 1;
    }

    const rawPush = (targetDist - d) * strength;
    const push = visualPadding == null ? min(rawPush, maxPush) : rawPush;
    const px = (dx / d) * push;
    const py = (dy / d) * push;
    o.x += px;
    o.y += py;
    o.x0 += px;
    o.y0 += py;
  }

  limitDrift(o, startX, startY, startX0, startY0, maxPush);
}

function separateStep(o, type, minDist, strength, sizeAware = false, maxPush = Infinity) {
  separateByGap(o, type, minDist, strength, sizeAware, maxPush, null);
}

function separateLife(o, type, strength, padding = 0, maxPush = Infinity) {
  separateByGap(o, type, 0, strength, false, maxPush, padding);
}

// 8. The initial population appears, and stored time reawakens
// The initial population appears at dispersed positions,
// leaving space for later relationships to grow naturally.
// This function was modified with the assistance of ChatGPT.
function spwnLifeGrps(pickSpawn, centers, placed) {
  // Different species have their own activity regions, making ecological distribution legible while
  // allowing regions to continue influencing one another.
  const predators = [];
  const roamers = [];
  const deepDivers = [];
  const guardians = [];

  for (const cfg of species) {
    for (let i = 0; i < cfg.count; i++) {
      let anchor = null;
      if (cfg.nearRoamer && roamers.length) {
        const centerRoamers = roamers.filter(
          (o) =>
            o.y >= height * 0.45 &&
            o.y <= height * 0.88 &&
            abs(o.x - ecoWorld.centerX()) <= width * 0.3
        );
        const lowerRoamers = roamers.filter((o) => o.y >= height * 0.45);
        const roamerAnchors = centerRoamers.length
          ? centerRoamers
          : lowerRoamers.length
            ? lowerRoamers
            : roamers;
        if (random() < cfg.nearRoamer) anchor = random(roamerAnchors);
      }

      const edgeCount = round(cfg.count * guardRange.edgeShare);
      const spawnMode = cfg.edgePreferred ? (i < edgeCount ? "edge" : "interior") : null;
      const p = pickSpawn(cfg, centers[cfg.type], anchor, spawnMode);
      let o = null;

      if (cfg.type === eco.lifeType.predator) {
        o = new Predator(p.x, p.y, Predator.baitTypes[i % Predator.baitTypes.length]);
        o.sz = sizes.Predator[i % sizes.Predator.length];
        o.sz *= predCfg.baitSizeMul[o.baitType] ?? 1;
        o.dir = random([1, -1]);
        o.targetDir = o.dir;
        o.vx = o.v * o.dir;
        predators.push(o);
      }

      if (cfg.type === eco.lifeType.roamer) {
        o = new Roamer(p.x, p.y, p.rot + random(-0.08, 0.08));
        o.sz = sizes.Roamer[i % sizes.Roamer.length];
        o.ax = random(0.72, 0.95);
        o.ay = random(0.65, 0.9);
        roamers.push(o);
      }

      if (cfg.type === eco.lifeType.deepDiver) {
        o = new DeepDiver(p.x, p.y, random(100, 900), p.rot);
        o.sz = sizes.DeepDiver[i % sizes.DeepDiver.length];
        deepDivers.push(o);
      }

      if (cfg.type === eco.lifeType.guardian) {
        o = new Guardian(p.x, p.y, p.rot);
        o.sz = sizes.Guardian[i % sizes.Guardian.length];
        o.edgeResident = p.edgeResident;
        guardians.push(o);
      }

      if (o && cfg.type !== eco.lifeType.predator && p.groupCenter) {
        o.cruiseCenter =
          cfg.type === eco.lifeType.deepDiver &&
          cfg.centered &&
          p.groupCenter.type !== eco.lifeType.roamer
            ? { x: p.x, y: p.y }
            : p.groupCenter;
        if (cfg.type === eco.lifeType.deepDiver && p.groupCenter.type === eco.lifeType.roamer) {
          o.cruiseOffsetX = p.x - p.groupCenter.x;
          o.cruiseOffsetY = p.y - p.groupCenter.y;
        }
      }
      if (o) placed.push(o);
    }
  }

  return { predators, roamers, deepDivers, guardians };
}

function placeReserved(guardians, predators) {
  // Project reserved positions into the ecological world first so they
  // remain aligned with the ellipse boundary as screen proportions change.
  const placeAtEdge = (o, x, y, poleResident = null) => {
    if (!o) return;
    const p = ecoWorld.project(x, y, 0);
    o.x = p.x;
    o.y = p.y;
    o.x0 = p.x;
    o.y0 = p.y;
    o.cruiseCenter = { x: p.x, y: p.y };
    o.cruiseOffsetX = 0;
    o.cruiseOffsetY = 0;
    o.poleResident = poleResident;
  };

  // Derive the horizontal ellipse coordinate from a given vertical position,
  // preserving edge composition better than static pixel coordinates.
  const edgePointAtY = (targetYRatio, xSign) => {
    const ratio = (guardRange.edgeInner + guardRange.edgeOuter) * 0.5;
    const targetY = height * targetYRatio;
    const maxNormalizedY = ratio * 0.92;
    const normalizedY = clamp(
      (targetY - ecoWorld.centerY()) / ecoWorld.radiusY(),
      -maxNormalizedY,
      maxNormalizedY
    );
    const normalizedX = sqrt(max(0, ratio * ratio - normalizedY * normalizedY));
    return {
      x: ecoWorld.centerX() + xSign * ecoWorld.radiusX() * normalizedX,
      y: ecoWorld.centerY() + normalizedY * ecoWorld.radiusY(),
    };
  };

  const verticalEdgePt = (side, xSign) =>
    edgePointAtY(
      side === "top"
        ? (guardRange.topY0 + guardRange.topY1) * 0.5
        : (guardRange.bottomY0 + guardRange.bottomY1) * 0.5,
      xSign
    );

  const topLeft = verticalEdgePt("top", -1);
  const topRight = verticalEdgePt("top", 1);
  const bottomLeft = verticalEdgePt("bottom", -1);
  const bottomRight = verticalEdgePt("bottom", 1);
  const rightUpper = edgePointAtY(0.32, 1);
  const rightLower = edgePointAtY(0.68, 1);
  // Guardians are distributed at the upper and lower poles and along
  // the right side, leaving stable, open space for the entry into care.
  const guardianSpots = [
    [topLeft, "top"],
    [topRight, "top"],
    [bottomLeft, "bottom"],
    [bottomRight, "bottom"],
    [rightUpper, "right"],
    [rightLower, "right"],
  ];
  for (let i = 0; i < guardianSpots.length; i++) {
    const [point, pole] = guardianSpots[i];
    placeAtEdge(guardians[i], point.x, point.y, pole);
  }

  // Create a Predator at each preset display position and bind it to a dedicated reserved zone,
  // giving the lure narrative stable placement.
  const addSpotPrdt = (x, y, reservedRegion) => {
    const o = new Predator(x, y, Predator.baitTypes[predators.length % Predator.baitTypes.length]);
    o.sz = sizes.Predator[predators.length % sizes.Predator.length];
    o.reservedRegion = reservedRegion;
    o.dir = random([1, -1]);
    o.targetDir = o.dir;
    o.vx = o.v * o.dir;
    predators.push(o);
  };

  const rightPredPoint = edgePointAtY(0.5, 1);
  // Configure an independent activity region for each preset Predator.
  const predatorSpots = [
    [width * 0.435, height * 0.045, { x0: 0.4, x1: 0.47, y0: 0.01, y1: 0.18 }],
    [width * 0.5, height * 0.045, { x0: 0.465, x1: 0.535, y0: 0.01, y1: 0.18 }],
    [width * 0.565, height * 0.045, { x0: 0.53, x1: 0.6, y0: 0.01, y1: 0.18 }],
    [
      rightPredPoint.x,
      rightPredPoint.y,
      { x0: 0.82, x1: 0.91, y0: 0.35, y1: 0.65 },
    ],
  ];
  for (const placement of predatorSpots) {
    addSpotPrdt(...placement);
  }
}

// Initial Parasites spawn across eligible hosts while obeying the total population limit.
function crtPars(roamers, deepDivers) {
  const result = [];
  const hosts = [...roamers, ...deepDivers];
  const hostLoads = new Map(hosts.map((host) => [host, 0]));

  for (let i = 0; i < counts.Parasite; i++) {
    const unusedHosts = hosts.filter((host) => hostLoads.get(host) === 0);
    const host = random(
      unusedHosts.length && random() < Parasite.spreadChance
        ? unusedHosts
        : hosts
    );
    hostLoads.set(host, hostLoads.get(host) + 1);
    const a = random(TWO_PI);
    const r = host.hostR * random(0.1, 0.6);
    result.push(
      new Parasite(
        host,
        cos(a) * r,
        sin(a) * r,
        (host.rot ?? host.rot0 ?? 0) + random(-0.9, 0.8),
        sizes.Parasite[i % sizes.Parasite.length],
        901 + i * 137
      )
    );
  }

  for (const parasite of result) parasite.prepStaticCache();
  return result;
}

// Establish position-sampling and spawning rules centrally,
// using a fallback position after all attempts are exhausted.
// This function was modified with the assistance of ChatGPT.
function createSpawners(placed) {
  const spawnL = width * 0.08;
  const spawnR = width * 0.78;
  const gaussian = () => {
    const u = Math.max(random(), 1e-6);
    const v = Math.max(random(), 1e-6);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * v);
  };
  const minDistOk = (x, y, arr, d) => arr.every((o) => dist2(x, y, o.x, o.y) >= d * d);
  const randomZoneY = (zone) =>
    height * lerp(zone.y0, zone.y1, pow(random(), zone.bias ?? 1));
  // Sample ordinary lifeforms within their species activity band,
  // falling back to a safe position near the world center after exhausting attempts.
  const rndmLifePnt = (zone, pad = 35) => {
    const r = max(1, ecoWorld.radius() - pad);
    for (let tries = 0; tries < 1200; tries++) {
      const x = random(ecoWorld.centerX() - r, ecoWorld.centerX() + r);
      const y = randomZoneY(zone);
      if (ecoWorld.inside(x, y, pad)) return { x, y };
    }
    return { x: ecoWorld.centerX(), y: clamp(ecoWorld.centerY(), height * zone.y0, height * zone.y1) };
  };
  // Guardians preferentially occupy ecological edges; vertical offsets create visible protective
  // positions along the upper and lower boundaries.
  const rndmEdgePnt = (zone) => {
    for (let tries = 0; tries < 1200; tries++) {
      let x;
      let y;

      if (random() < guardRange.verticalBias) {
        const isTop = random() < 0.5;
        const y0 = isTop ? guardRange.topY0 : guardRange.bottomY0;
        const y1 = isTop ? guardRange.topY1 : guardRange.bottomY1;
        y = height * random(y0, y1);

        const normalizedY = (y - ecoWorld.centerY()) / ecoWorld.radiusY();
        const minRatio = max(guardRange.edgeInner, abs(normalizedY) + 0.005);
        if (minRatio > guardRange.edgeOuter) continue;

        const ratio = random(minRatio, guardRange.edgeOuter);
        const normalizedX = sqrt(max(0, ratio * ratio - normalizedY * normalizedY));
        x = ecoWorld.centerX() + random([-1, 1]) * ecoWorld.radiusX() * normalizedX;
      } else {
        const angle = random(TWO_PI);
        const ratio = random(guardRange.edgeInner, guardRange.edgeOuter);
        x = ecoWorld.centerX() + cos(angle) * ecoWorld.radiusX() * ratio;
        y = ecoWorld.centerY() + sin(angle) * ecoWorld.radiusY() * ratio;
      }

      if (x < ecoWorld.left() + 20 || x > ecoWorld.right() - 20) continue;
      if (y < height * zone.y0 || y > height * zone.y1) continue;
      return { x, y };
    }
    return rndmLifePnt(zone, 0);
  };
  // Cluster centers determine overall distribution first,
  // then individual spawning adds variation around them.
  const makeCenters = (cols, zone, radius, centered = false, centerY = 0.5) => {
    const centers = [];
    for (let i = 0; i < cols; i++) {
      let p;
      if (centered) {
        const angle = -HALF_PI + (TWO_PI * i) / cols;
        const centerDistance = cols > 1 ? radius * 1.5 : 0;
        p = {
          x: ecoWorld.centerX() + cos(angle) * centerDistance,
          y: clamp(
            height * centerY + sin(angle) * centerDistance,
            height * zone.y0,
            height * zone.y1
          ),
        };
      } else {
        p = rndmLifePnt(zone, 0);
      }
      centers.push({
        x: p.x,
        y: p.y,
        rot: random(TWO_PI),
        radius,
      });
    }
    return centers;
  };
  // Spawning strategies support edge, interior, inherited-anchor, solitary,
  // and cluster-member modes, with all sources sharing safety checks.
  const pickSpawn = (cfg, centers, anchor = null, spawnMode = null) => {
    for (let tries = 0; tries < 900; tries++) {
      let x;
      let y;
      let rot;
      let groupCenter = null;

      // Explicit mode takes precedence over anchor and cluster randomness.
      if (spawnMode === "edge") {
        const p = rndmEdgePnt(cfg.zone);
        x = p.x;
        y = p.y;
        rot = random(TWO_PI);
        groupCenter = { x, y };
      } else if (spawnMode === "interior") {
        const p = rndmLifePnt(cfg.zone, ecoWorld.radius() * 0.32);
        x = p.x;
        y = p.y;
        rot = random(TWO_PI);
        groupCenter = { x, y };
      } else if (anchor) {
        const a = random(TWO_PI);
        const r = (cfg.anchorMin || 0) + Math.abs(gaussian()) * (cfg.cluster.tight * 0.45 + 12);
        if (cfg.anchorMax && r > cfg.anchorMax) continue;
        x = anchor.x + cos(a) * r;
        y = anchor.y + sin(a) * r;
        rot = (anchor.rot ?? anchor.rot0 ?? 0) + random(-0.14, 0.14);
        groupCenter = anchor;
      } else if (random() < cfg.cluster.stray) {
        x = random(spawnL, spawnR);
        y = randomZoneY(cfg.zone);
        rot = random(TWO_PI);
      } else {
        const c = random(centers);
        const a = random(TWO_PI);
        const r = Math.abs(gaussian()) * cfg.cluster.tight;
        x = c.x + cos(a) * r;
        y = c.y + sin(a) * r;
        rot = c.rot;
        if (dist2(x, y, c.x, c.y) > c.radius * c.radius) continue;
        groupCenter = c;
      }

      // Candidates must pass activity-band, world-boundary, and spacing checks;
      // default mode also checks the horizontal spawning range.
      if (spawnMode == null && (x < spawnL || x > spawnR)) continue;
      if (y < height * cfg.zone.y0 || y > height * cfg.zone.y1) continue;
      if (!ecoWorld.inside(x, y, 0)) continue;
      if (!minDistOk(x, y, placed, cfg.sep * 0.4389)) continue;

      return {
        x,
        y,
        rot: cfg.cluster.lock ? -PI / 4 : rot,
        groupCenter: groupCenter || { x, y },
        edgeResident: spawnMode === "edge",
      };
    }
    // If spacing remains below the requirement after repeated attempts, retain the in-world position.
    const fallback = rndmLifePnt(cfg.zone, 0);
    return {
      x: fallback.x,
      y: fallback.y,
      rot: cfg.cluster.lock ? -PI / 4 : random(TWO_PI),
    };
  };

  return { makeCenters, pickSpawn };
}

// Establish the initial population in species order,
// spawning relational lifeforms only after hosts exist.
// This function was modified with the assistance of ChatGPT.
function buildCreatures() {
  if (ecosystemWorldReady && !visualTest) return false;
  window.AppRuntime?.clearQueue("cacheRefresh");
  randomSeed(eco.seed);
  noiseSeed(eco.seed);

  const placed = [];
  const { makeCenters, pickSpawn } = createSpawners(placed);

  const centers = {};
  for (const cfg of species) {
    centers[cfg.type] = makeCenters(
      cfg.cluster.cols,
      cfg.zone,
      cfg.cluster.radius,
      cfg.centered,
      cfg.centerY
    );
  }

  const { predators, roamers, deepDivers, guardians } = spwnLifeGrps(
    pickSpawn,
    centers,
    placed
  );

  placeReserved(guardians, predators);
  const nextCreatures = [...predators, ...roamers, ...deepDivers, ...guardians];
  const nextParasites = crtPars(roamers, deepDivers);
  setWorld(nextCreatures, nextParasites, worldToken);
  ecosystemWorldReady = true;
  ecosystemBuildCount++;
  return true;
}

// 9. Finding the lifeform currently gazed at within a crowded ecology
function infoRadius(entity) {
  if (!entity) return 0;
  // Interaction radius uses the current visible scale, allowing
  // the hit region to follow birth and departure animation.
  if (entity.type === eco.lifeType.basicCell) return entity.attnRad || 24;
  if (entity.type === eco.lifeType.predator) {
    return (
      prdtBaseRad(entity) *
      care.getSpeciesFade(entity.type).scale
    );
  }
  if (entity.type === eco.lifeType.roamer) {
    return (
      clamp(76 * (entity.sz || 1), 34, 105) *
      (entity.splitGrowMul ?? 1) *
      (entity.deathScale ?? 1) *
      (entity.guardCareScl ?? 1) *
      (entity.guardBirthMul ?? 1)
    );
  }
  if (entity.type === eco.lifeType.deepDiver) {
    return deepDvrBaseRad(entity) *
      (entity.guardCareScl ?? 1) *
      (entity.guardBirthMul ?? 1);
  }
  if (entity.type === eco.lifeType.guardian) {
    return (
      care.baseRadius(entity) *
      (entity.guardRprScl ?? 1) *
      (entity.guardBirthMul ?? 1)
    );
  }
  if (entity.type === eco.lifeType.parasite) {
    // A Parasite's visual scale is inherited from both itself and its
    // host and is affected by predatory amplification and species fade.
    return clamp(
      38 *
        (entity.s || 1) *
        (entity.host?.sz || 1) *
        (1 + hunt.paraScaleUp),
      24,
      66
    ) * care.getSpeciesFade(entity.type).scale;
  }
  return 0;
}

// Test the body radius first, then add branch hit testing for Parasites.
function gazeHitsEntity(
  entity,
  gazeX,
  gazeY,
  position,
  hitRadius,
  radiusScale = 1
) {
  if (
    dist2(gazeX, gazeY, position.x, position.y) <=
    hitRadius * hitRadius
  ) {
    return true;
  }
  return Boolean(
    entity.type === eco.lifeType.parasite &&
      entity.hitsResidue?.(
        gazeX,
        gazeY,
        parasiteCfg.attnBrnchPddng * radiusScale
      )
  );
}

// Target selection combines visual range with species-interaction
// priority to reduce mistaken selection among overlapping lifeforms
function findTarget(gazeX, gazeY) {
  const selected = [];
  // Compare candidates within each group by normalized distance.
  const inspect = (collection) => {
    for (const entity of collection) {
      if (!intrTyps.has(entity.type) || !isVisible(entity)) continue;
      if (!tgtRdyToSssn(entity)) continue;
      const position = worldPos(entity);
      const radiusScale = ixGazeScale(entity.type);
      const hitRadius = infoRadius(entity) * radiusScale;
      const distSq = dist2(gazeX, gazeY, position.x, position.y);
      if (
        !gazeHitsEntity(
          entity,
          gazeX,
          gazeY,
          position,
          hitRadius,
          radiusScale
        )
      ) {
        continue;
      }
      selected.push({
        entity,
        distSq,
      });
    }
  };
  inspect(creatures);
  inspect(parasites);
  inspect(window.GazeApp?.targets?.() || []);
  selected.sort((a, b) => a.distSq - b.distSq);
  return selected;
}

// After determining valid controllers and targets each frame,
// update all Parasites in one pass while remaining individuals enter recovery.
function updtParsAttn(camera, hasController, frameMs) {
  const radiusScale = ixGazeScale(
    eco.lifeType.parasite
  );
  for (const parasite of parasites) {
    const position = worldPos(parasite);
    const hitRadius = infoRadius(parasite) * radiusScale;
    const focused = Boolean(
      hasController &&
        gazeHitsEntity(
          parasite,
          camera.gaze.x,
          camera.gaze.y,
          position,
          hitRadius,
          radiusScale
        )
    );
    if (frameIntent) {
      if (focused && tgtRdyToSssn(parasite)) {
        activeSession.parasites.add(parasite);
      }
    } else {
      window.ParasiteBehavior.updateInteraction({
        entity: parasite,
        focused,
        frameMs,
      });
    }
  }
}

// Update Deep Diver gaze feedback during the ordinary world phase,
// handing control to its specialized state machine when the focus window is active.
function updtDeeDvrAtt(camera, hasController, frameMs) {
  const deepDivers = groups[eco.lifeType.deepDiver];
  const gaze = camera?.gaze;
  const radiusScale = ixGazeScale(
    eco.lifeType.deepDiver
  );
  let closest = null;
  let nearDistSq = Infinity;

// Select the nearest available lifeform each frame so
// the gaze relationship remains centered on one object.
  if (hasController && gaze) {
    for (const deepDiver of deepDivers) {
      if (deepDiver.diffBirth) continue;
      if (!tgtRdyToSssn(deepDiver)) continue;
      const position = worldPos(deepDiver);
      const nearRadius =
        (infoRadius(deepDiver) +
          deepCfg.attnNearPddng) *
        radiusScale;
      const distSq = dist2(
        gaze.x,
        gaze.y,
        position.x,
        position.y
      );
      if (
        distSq <= nearRadius * nearRadius &&
        distSq < nearDistSq
      ) {
        closest = deepDiver;
        nearDistSq = distSq;
      }
    }
  }

  for (const deepDiver of deepDivers) {
    if (!tgtRdyToSssn(deepDiver)) continue;
    if (deepDiver.diffBirth) {
      deepDiver.updtAttnFb(false, frameMs);
      continue;
    }
    // A target already inside the focus window retains its form;
    // candidate changes in this frame affect the next selection.
    const keepEncnShp = Boolean(
      deepDiver === deepFocus.target &&
        deepFocus.phase !== "exiting" &&
        deepFocus.phase !== "idle"
    );
    deepDiver.updtAttnFb(
      keepEncnShp ||
        (deepDiver === closest && deepDiver !== deepFocus.target),
      frameMs
    );
  }
}

// 10. Exposing the shared world's capabilities to other systems
// window.WorldSystem provides ecological operations; window.CreatureWorld provides queries and queued
// additions/removals that obey lifecycle rules.
window.WorldSystem = Object.freeze({
  setup: setupWorld,
  build: buildCreatures,
  flush: flushLife,
  indexGroups,
  updateLifeMode: updEcsLifMod,
  updatePredatorLures: updtPrdtLrs,
  updateRelationalAlert: updateRelAlert,
  initializeSharedEcology: sharedWorldAdapter.initialize,
  viewportGeometry: viwpWrldGeo,
  remapViewport: remapWorld,
  refreshLayout,
});
