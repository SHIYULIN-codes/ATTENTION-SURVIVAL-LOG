// File Overview
// Maintains a local continuity snapshot and fallback state without replacing
// the server-shared ecology.

// I want this world to remember how it looked when it was last left,
// allowing relationships among lifeforms to persist across the space between visits.
// This module stores a restorable world snapshot;
// AttentionLogStoreApp preserves interaction events in a separate archive.
const ecoStoreConfig = Object.freeze({
  key: "attention-ecology-state-v1",
  schemaVersion: 1,
  intervalMs: 10000,
});
const ecoStoreState = {
  enabled:
    ecoStoreTest ||
    (!visualTest &&
      !perfTest &&
      !ixTest),
  ready: false,
  restored: false,
  resetting: false,
  strgAvlb: true,
  lastSavedAtEpochMs: null,
  lastRestoredAtEpochMs: null,
  lastReason: null,
  error: null,
  timer: null,
  loadedSnapshot: null,
  offlineLifeMs: 0,
};

function storeFinite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const store = Object.freeze({
  storage: getStrStrg,
  readSnapshot: readStrSnps,
  clear: clearStore,
  save: saveStore,
  initialize: initializeStore,
});

// Probe storage access for the ecological archive; record the error and return null if access fails.
function getStrStrg() {
  if (!ecoStoreState.enabled) return null;
  try {
    const storage = window.localStorage;
    const probeKey = `${ecoStoreConfig.key}-probe`;
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    ecoStoreState.strgAvlb = true;
    return storage;
  } catch (error) {
    ecoStoreState.strgAvlb = false;
    ecoStoreState.error = error?.message || String(error);
    return null;
  }
}

// Validate the snapshot version and lifeform array; clear the old
// snapshot and return null if parsing or structural validation fails.
function readStrSnps() {
  const storage = store.storage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ecoStoreConfig.key);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (
      snapshot?.schemaVersion !== ecoStoreConfig.schemaVersion ||
      !Array.isArray(snapshot.creatures) ||
      !Array.isArray(snapshot.parasites)
    ) {
      storage.removeItem(ecoStoreConfig.key);
      return null;
    }
    return snapshot;
  } catch (error) {
    ecoStoreState.error = error?.message || String(error);
    try {
      storage.removeItem(ecoStoreConfig.key);
    } catch {}
    return null;
  }
}

// Clear this project's ecology key.
function clearStore() {
  ecoStoreState.resetting = true;
  const storage = store.storage();
  try {
    storage?.removeItem(ecoStoreConfig.key);
    ecoStoreState.lastSavedAtEpochMs = null;
    ecoStoreState.loadedSnapshot = null;
    return true;
  } catch (error) {
    ecoStoreState.error = error?.message || String(error);
    return false;
  }
}

// Life continues to change slowly while the page sleeps,
// allowing time between visits to enter the ecology.
function offlineLifeUse(startedAt, endedAt) {
  const start = storeFinite(startedAt, 0);
  const end = storeFinite(endedAt, start);
  if (!(end > start)) return 0;
  return max(0, (end - start) * lifeCfg.clock.closedRate);
}

// Extract recoverable shared lifespan fields from a lifeform,
// limited to ecological state that persists across runs.
function packStoredWorld(entity) {
  const state = entity?.lifeState;
  if (!state || state.committedRemoval || !(state.lifeBudgetMs > 0)) return null;
  return {
    lifeBudgetMs: state.lifeBudgetMs,
    lifeConsumedMs: max(0, state.lifeConsumedMs || 0),
    extensionMs: max(0, state.extensionMs || 0),
  };
}

// This function was modified with the assistance of ChatGPT.
function packStoredLife(entity, id) {
  // The shared record stores the normalized position and movement seed required for restoration.
  const record = {
    id,
    type: entity.type,
    x: storeFinite(entity.x) / max(1, width),
    y: storeFinite(entity.y) / max(1, height),
    x0: storeFinite(entity.x0, entity.x) / max(1, width),
    y0: storeFinite(entity.y0, entity.y) / max(1, height),
    rot: storeFinite(entity.rot),
    rot0: storeFinite(entity.rot0, entity.rot),
    sz: storeFinite(entity.sz, 1),
    seed: storeFinite(entity.seed),
    dy: storeFinite(entity.dy),
    b: storeFinite(entity.b, 1),
    tt: storeFinite(entity.tt),
    cruiseCenter: entity.cruiseCenter
      ? {
          x: storeFinite(entity.cruiseCenter.x) / max(1, width),
          y: storeFinite(entity.cruiseCenter.y) / max(1, height),
        }
      : null,
    cruiseOffsetX: storeFinite(entity.cruiseOffsetX),
    cruiseOffsetY: storeFinite(entity.cruiseOffsetY),
    life: packStoredWorld(entity),
  };
  // Group species fields by restoration constructor.
  if (entity.type === eco.lifeType.predator) {
    Object.assign(record, {
      baitType: entity.baitType,
      dir: storeFinite(entity.dir, 1),
      targetDir: storeFinite(entity.targetDir, entity.dir || 1),
      v: storeFinite(entity.v),
      vx: storeFinite(entity.vx),
      a: storeFinite(entity.a),
      w: storeFinite(entity.w),
      swimY: storeFinite(entity.swimY),
      preactivationSpeedMultiplier: storeFinite(
        entity.preSpeedMul,
        1
      ),
      numberValue: storeFinite(entity.numberValue),
      viewCount: storeFinite(entity.viewCount),
    });
  } else if (entity.type === eco.lifeType.roamer) {
    Object.assign(record, {
      sepBias: storeFinite(entity.sepBias, 1),
      hostR: storeFinite(entity.hostR, 60),
      ax: storeFinite(entity.ax, 1),
      ay: storeFinite(entity.ay, 1),
      rw: storeFinite(entity.rw, 1),
      splitGeneration: storeFinite(entity.splitGeneration),
      splitDeathRoll: storeFinite(entity.splitDeathRoll, 1),
    });
  } else if (entity.type === eco.lifeType.deepDiver) {
    Object.assign(record, {
      base: storeFinite(entity.base, 500),
      sm: storeFinite(entity.sm, 0.5),
    });
  } else if (entity.type === eco.lifeType.guardian) {
    Object.assign(record, {
      r1: storeFinite(entity.r1),
      r2: storeFinite(entity.r2),
      edgeResident: Boolean(entity.edgeResident),
      poleResident: entity.poleResident ?? null,
      guardianRepairUseCount: storeFinite(entity.guardianRepairUseCount),
    });
  }
  return record;
}

// The snapshot stores the ecological state and time required for the next restoration.
function captureEcoSnapshot(reason = "interval") {
  const savedAtEpochMs = Date.now();
  const eligibleCreatures = creatures.filter(
    (entity) => entity && !entity.lifeState?.committedRemoval
  );
  // Identifiers associate hosts with Parasites within this snapshot,
  // allowing restoration to rebuild their relationships.
  const ids = new Map(
    eligibleCreatures.map((entity, index) => [
      entity,
      `life-${index}-${entity.type}-${floor(storeFinite(entity.seed))}`,
    ])
  );
  const creatureRecords = eligibleCreatures.map((entity) =>
    packStoredLife(entity, ids.get(entity))
  );
  // A Parasite can be stored when its host is included in the same snapshot.
  const parasiteRecords = parasites
    .filter(
      (parasite) =>
        parasite &&
        !parasite.lifeState?.committedRemoval &&
        ids.has(parasite.host)
    )
    .map((parasite, index) => ({
      id: `parasite-${index}-${floor(storeFinite(parasite.seed))}`,
      type: eco.lifeType.parasite,
      hostId: ids.get(parasite.host),
      ox: storeFinite(parasite.ox),
      oy: storeFinite(parasite.oy),
      ox0: storeFinite(parasite.ox0, parasite.ox),
      oy0: storeFinite(parasite.oy0, parasite.oy),
      rot: storeFinite(parasite.rot),
      rot0: storeFinite(parasite.rot0, parasite.rot),
      s: storeFinite(parasite.s, 1),
      seed: storeFinite(parasite.seed),
      life: packStoredWorld(parasite),
    }));
  return {
    schemaVersion: ecoStoreConfig.schemaVersion,
    lifespanScale: lifeCfg.lifespanScale,
    lifespanRangesMs: Object.fromEntries(
      encounterLifeTypes.map((type) => [
        type,
        [...lifeCfg.lifespanMs[type]],
      ])
    ),
    savedAtEpochMs,
    reason,
    // Store the previous viewport and lifespan configuration as
    // references for restoration across devices and version migration.
    viewport: { width: max(1, width), height: max(1, height) },
    clock: {
      mode: lifeClock.mode,
    },
    creatures: creatureRecords,
    parasites: parasiteRecords,
    basicCells:
      window.GazeApp?.exportStoredCells?.({ width, height }) || [],
  };
}

// Save only when the world is stable and storage is writable.
function saveStore(reason = "interval") {
  if (
    !ecoStoreState.enabled ||
    ecoStoreState.resetting ||
    !ecosystemWorldReady
  ) {
    return false;
  }
  const storage = store.storage();
  if (!storage) return false;
  try {
    const snapshot = captureEcoSnapshot(reason);
    storage.setItem(ecoStoreConfig.key, JSON.stringify(snapshot));
    ecoStoreState.lastSavedAtEpochMs = snapshot.savedAtEpochMs;
    ecoStoreState.lastReason = reason;
    ecoStoreState.error = null;
    return true;
  } catch (error) {
    ecoStoreState.error = error?.message || String(error);
    return false;
  }
}

// Restore archived lifespan fields to an existing instance,
// accounting for offline consumption and lifespan scaling.
function loadStoredWorld(
  entity,
  record,
  now,
  offlineConsumedMs,
  lifeScale = 1
) {
  const life = record?.life;
  if (!life || !(life.lifeBudgetMs > 0)) return;
  const state = ensureLifeState(entity, now);
  state.phase = "alive";
  state.clockStartedAt = now;
  state.lifeBudgetMs = max(
    1,
    storeFinite(life.lifeBudgetMs, 1) * lifeScale
  );
  state.extensionMs = max(0, storeFinite(life.extensionMs));
  // Count offline time toward consumed lifespan.
  state.lifeConsumedMs =
    max(0, storeFinite(life.lifeConsumedMs)) + offlineConsumedMs;
  state.lifeRemainingMs = max(
    0,
    state.lifeBudgetMs + state.extensionMs - state.lifeConsumedMs
  );
  state.lastLifeUpdateAt = now;
  state.clockPauseReason = null;
  state.safeSince = null;
  state.deathStartedAt = null;
  state.outcome = null;
  state.cause = null;
  state.parasiteBorn = false;
  state.committedRemoval = false;
  state.alpha = 1;
  state.scale = 1;
  state.movementScale = 1;
  state.pulseScale = 1;
  state.createdAt = now;
  // Recalculate expiration time using the current clock multiplier
  // so restoration fits the current device's time domain.
  state.estimatedExpiresAt = lifeClock.rate > 0
    ? now + state.lifeRemainingMs / lifeClock.rate
    : null;
  state.expiresAt = state.estimatedExpiresAt;
}

// This function was modified with the assistance of ChatGPT.
function calcLifeScale(
  snapshot,
  record,
  type,
  fallbackScale
) {
  // Migration preserves the individual's relative position within
  // the old lifespan interval and maps it to the new range.
  const currentRange = lifeCfg.lifespanMs[type];
  const savedBudgetMs = storeFinite(record?.life?.lifeBudgetMs);
  let savedRange = snapshot?.lifespanRangesMs?.[type];
  // Reconstruct the historical interval when a legacy Parasite uses the global multiplier,
  // providing a compatibility path for existing snapshots.
  if (
    !Array.isArray(savedRange) &&
    type === eco.lifeType.parasite
  ) {
    const savedScale = max(
      0.001,
      storeFinite(snapshot?.lifespanScale, 1)
    );
    savedRange = [
      17 * 60 * 1000 * savedScale,
      20 * 60 * 1000 * savedScale * 1.2,
    ];
  }
  if (
    !Array.isArray(currentRange) ||
    !Array.isArray(savedRange) ||
    savedBudgetMs <= 0
  ) {
    return fallbackScale;
  }
  const savedMinimum = storeFinite(savedRange[0]);
  const savedMaximum = storeFinite(savedRange[1], savedMinimum);
  if (savedMinimum <= 0 || savedMaximum < savedMinimum) return fallbackScale;
  const position = savedMaximum > savedMinimum
    ? clamp(
        (savedBudgetMs - savedMinimum) /
          (savedMaximum - savedMinimum),
        0,
        1
      )
    : 0;
  const migratedBudgetMs = lerp(currentRange[0], currentRange[1], position);
  return migratedBudgetMs / savedBudgetMs;
}

// This function was modified with the assistance of ChatGPT.
function loadStoredLife(
  record,
  now,
  offlineConsumedMs,
  lifeScale
) {
  // Store lifeform positions as viewport proportions and
  // convert them to the current canvas during restoration.
  const x = constrain(storeFinite(record?.x, 0.5), 0, 1) * width;
  const y = constrain(storeFinite(record?.y, 0.5), 0, 1) * height;
  const rot = storeFinite(record?.rot);
  let entity = null;
  // Restore independently existing lifeforms; relational objects
  // such as Parasites are rebuilt in a later relationship phase.
  if (record?.type === eco.lifeType.predator) {
    entity = new Predator(x, y, record.baitType);
  } else if (record?.type === eco.lifeType.roamer) {
    entity = new Roamer(x, y, rot);
  } else if (record?.type === eco.lifeType.deepDiver) {
    entity = new DeepDiver(x, y, storeFinite(record.base, 500), rot);
  } else if (record?.type === eco.lifeType.guardian) {
    entity = new Guardian(x, y, rot);
  }
  if (!entity) return null;
  // Restore shared movement fields with safe defaults first.
  entity.x = x;
  entity.y = y;
  entity.x0 = constrain(storeFinite(record.x0, record.x), 0, 1) * width;
  entity.y0 = constrain(storeFinite(record.y0, record.y), 0, 1) * height;
  entity.rot = rot;
  entity.rot0 = storeFinite(record.rot0, rot);
  entity.sz = max(0.05, storeFinite(record.sz, entity.sz || 1));
  entity.seed = storeFinite(record.seed, entity.seed);
  entity.dy = storeFinite(record.dy, entity.dy);
  entity.b = storeFinite(record.b, 1);
  entity.tt = storeFinite(record.tt, entity.tt);
  if (record.cruiseCenter) {
    entity.cruiseCenter = {
      x: constrain(storeFinite(record.cruiseCenter.x, 0.5), 0, 1) * width,
      y: constrain(storeFinite(record.cruiseCenter.y, 0.5), 0, 1) * height,
    };
  }
  entity.cruiseOffsetX = storeFinite(record.cruiseOffsetX);
  entity.cruiseOffsetY = storeFinite(record.cruiseOffsetY);
// Restore species-specific fields, supplying defaults for
// invalid values and constraining speed-related values.
  if (entity.type === eco.lifeType.predator) {
    entity.dir = storeFinite(record.dir, entity.dir);
    entity.targetDir = storeFinite(record.targetDir, entity.dir);
    entity.v = constrain(
      storeFinite(record.v, entity.v),
      predCfg.speedMin,
      predCfg.speedMax
    );
    entity.vx = constrain(
      storeFinite(record.vx, entity.v * entity.dir),
      -entity.v,
      entity.v
    );
    entity.a = storeFinite(record.a, entity.a);
    entity.w = storeFinite(record.w, entity.w);
    entity.swimY = storeFinite(record.swimY, entity.swimY);
    entity.preSpeedMul = constrain(
      storeFinite(
        record.preSpeedMul ?? record.preactivationSpeedMultiplier,
        entity.preSpeedMul
      ),
      capture.preSpeedMulMin,
      capture.preSpeedMulMax
    );
    entity.numberValue = storeFinite(record.numberValue);
    entity.prevNumber = entity.numberValue;
    entity.viewCount = storeFinite(record.viewCount);
  } else if (entity.type === eco.lifeType.roamer) {
    entity.sepBias = storeFinite(record.sepBias, entity.sepBias);
    entity.hostR = storeFinite(record.hostR, entity.hostR);
    entity.ax = storeFinite(record.ax, entity.ax);
    entity.ay = storeFinite(record.ay, entity.ay);
    entity.rw = storeFinite(record.rw, entity.rw);
    entity.splitGeneration = storeFinite(record.splitGeneration);
    entity.splitDeathRoll = storeFinite(record.splitDeathRoll, 1);
  } else if (entity.type === eco.lifeType.deepDiver) {
    entity.base = storeFinite(record.base, entity.base);
    entity.sm = storeFinite(record.sm, entity.sm);
  } else if (entity.type === eco.lifeType.guardian) {
    entity.r1 = storeFinite(record.r1, entity.r1);
    entity.r2 = storeFinite(record.r2, entity.r2);
    entity.edgeResident = Boolean(record.edgeResident);
    entity.poleResident = record.poleResident ?? null;
    entity.guardianRepairUseCount = storeFinite(
      record.guardianRepairUseCount
    );
  }
  // Restore lifecycle timing last and deduct offline consumption;
  // visual caches must be rebuilt from the new state.
  loadStoredWorld(
    entity,
    record,
    now,
    offlineConsumedMs,
    lifeScale
  );
  clearLifeCache(entity);
  return entity;
}

// After host lifeforms awaken, parasitic relationships regrow along their original attachments.
// This function was modified with the assistance of ChatGPT.
function restoreEcoSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.creatures)) return false;
  const nowEpochMs = Date.now();
  const savedAtEpochMs = storeFinite(snapshot.savedAtEpochMs, nowEpochMs);
  const offlineConsumedMs = offlineLifeUse(
    savedAtEpochMs,
    nowEpochMs
  );
  const now = lifeClockNow();
  const savedLifeScale = max(
    0.001,
    storeFinite(snapshot.lifespanScale, 1)
  );
  const baseLifeScale =
    lifeCfg.lifespanScale / savedLifeScale;
  const restoredCreatures = [];
  const byId = new Map();
  // Build the host-identifier map before restoring parasitic relationships.
  for (const record of snapshot.creatures) {
    const entity = loadStoredLife(
      record,
      now,
      offlineConsumedMs,
      calcLifeScale(
        snapshot,
        record,
        record.type,
        baseLifeScale
      )
    );
    if (!entity) continue;
    restoredCreatures.push(entity);
    byId.set(record.id, entity);
  }
  if (!restoredCreatures.length) return false;
  const restoredParasites = [];
  for (const record of snapshot.parasites || []) {
    const host = byId.get(record.hostId);
    if (!host) continue;
    const parasite = new Parasite(
      host,
      storeFinite(record.ox),
      storeFinite(record.oy),
      storeFinite(record.rot),
      max(0.05, storeFinite(record.s, 1)),
      storeFinite(record.seed)
    );
    parasite.ox0 = storeFinite(record.ox0, parasite.ox);
    parasite.oy0 = storeFinite(record.oy0, parasite.oy);
    parasite.rot0 = storeFinite(record.rot0, parasite.rot);
    parasite.attached = true;
    parasite.migrating = false;
    loadStoredWorld(
      parasite,
      record,
      now,
      offlineConsumedMs,
      calcLifeScale(
        snapshot,
        record,
        eco.lifeType.parasite,
        baseLifeScale
      )
    );
    parasite.prepStaticCache();
    restoredParasites.push(parasite);
  }
  setWorld(
    restoredCreatures,
    restoredParasites,
    worldToken
  );
  // Full restoration passes through the setWorld boundary, updating old sessions, caches,
  // and deferred queues with the new snapshot.
  ecosystemWorldReady = true;
  ecosystemBuildCount++;
  ecoStoreState.restored = true;
  ecoStoreState.loadedSnapshot = snapshot;
  ecoStoreState.offlineLifeMs = offlineConsumedMs;
  ecoStoreState.lastRestoredAtEpochMs = nowEpochMs;
  ecoStoreState.lastSavedAtEpochMs = savedAtEpochMs;
  return true;
}

// Start periodic ecological-archive saves and page-exit writes;
// test mode and storage fallback remain memory-only.
function initializeStore() {
  if (!ecoStoreState.enabled) return false;
  ecoStoreState.ready = true;
  const snapshot = ecoStoreState.loadedSnapshot;
  // World lifeforms are established during restoration;
  // BasicCells owned by GazeEngine are restored afterward.
  if (snapshot) {
    const savedLifespanScale = max(
      0.001,
      storeFinite(snapshot.lifespanScale, 1)
    );
    window.GazeApp?.restoreStoredCells?.(snapshot.basicCells || [], {
      width,
      height,
      now: lifeClockNow(),
      offlineLifeMs: ecoStoreState.offlineLifeMs,
      lifespanScale:
        lifeCfg.lifespanScale / savedLifespanScale,
    });
  }
  if (ecoStoreState.timer == null) {
    ecoStoreState.timer = window.setInterval(
      () => store.save("interval"),
      ecoStoreConfig.intervalMs
    );
  }
  window.addEventListener("pagehide", () => {
    store.save("pagehide");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      store.save("hidden");
    }
  });
  store.save(
    ecoStoreState.restored ? "restored" : "initial"
  );
  return true;
}

// Preserve confirmation timing and the keyboard path for restarting
function psExpr() {
  if (exprPsd || visualTest) return false;
  exprPsd = true;
  exprPsdAt = performance.now();
  window.SoundApp?.pause?.();
  noLoop();
  return true;
}

// During restoration, shift the p5 start time by the pause
// duration so simulation time continues from where it paused.
function rsmExpr() {
  if (!exprPsd || exprPsdAt == null) return false;
  const resumedAt = performance.now();
  const pausedDuration = max(0, resumedAt - exprPsdAt);
  const instance = typeof p5 !== "undefined" ? p5.instance : null;
  if (instance && Number.isFinite(instance._millisStart)) {
    instance._millisStart += pausedDuration;
    instance._lastTargetFrameTime = resumedAt;
    instance._lastRealFrameTime = resumedAt;
  }
  exprPsd = false;
  exprPsdAt = null;
  window.SoundApp?.resume?.();
  loop();
  return true;
}

function canEditRstTgt(target) {
  return Boolean(
    target?.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "")
  );
}

function rstUiDlgOpen() {
  return Boolean(resetUiOverlay && !resetUiOverlay.hidden);
}

function isShrdRstMode() {
  return Boolean(window.SharedClient?.isEnabled?.());
}

// Configure the hidden maintenance dialog for shared-log export, hosted-world reset,
// or the independent ecology running only in this browser.
function prepRstUi(action, sharedReset) {
  const sharedExport = action === "export";
  if (sharedExport) {
    resetUiTitle.textContent = "Export the shared ecology reading log?";
    rstUiPrimaryCopy.textContent =
      "Download a readable version of the anonymous history across all connected devices.";
    rstUiSecondaryCopy.textContent =
      "Raw events remain on the server; camera, gaze, and calibration data are not included.";
    rstUiTokenRow.hidden = false;
    rstUiTokenInput.value = "";
    rstUiErsBttn.textContent = "Export Reading Log";
    return;
  }
  resetUiTitle.textContent = sharedReset
    ? "Reset the shared ecology?"
    : "Reset the ecology?";
  rstUiPrimaryCopy.textContent = sharedReset
    ? "This will erase the Render-hosted world and restart it for every connected participant."
    : "This will permanently erase this browser's ecology and participant log.";
  rstUiSecondaryCopy.textContent = sharedReset
    ? "This browser's local snapshot and log will also be cleared. Other browsers' private logs are not affected."
    : "Use only if the ecology is corrupted or cannot continue running.";
  rstUiTokenRow.hidden = !sharedReset;
  rstUiTokenInput.value = "";
  rstUiErsBttn.textContent = sharedReset
    ? "Reset Shared Ecology"
    : "Erase & Restart";
}

// Save the original focus and lock background interaction when the reset confirmation dialog opens.
function openRstUiDlg(action = "reset") {
  if (!resetUiOverlay || resetUiBusy) return false;
  if (action === "export" && !isShrdRstMode()) return false;
  maintenanceUiAction = action;
  rstPrevFcs = document.activeElement;
  rstUiWasPsd = exprPsd;
  if (!exprPsd) psExpr();
  resetUiStatus.textContent = "";
  rstUiKeepBttn.disabled = false;
  rstUiErsBttn.disabled = false;
  rstUiTokenInput.disabled = false;
  prepRstUi(action, isShrdRstMode());
  resetUiOverlay.hidden = false;
  rstUiKeepBttn.focus({ preventScroll: true });
  return true;
}

// Restore the original focus and page state when the confirmation dialog closes.
function clsRstUiDlg() {
  if (!rstUiDlgOpen() || resetUiBusy) return false;
  resetUiOverlay.hidden = true;
  rstUiTokenInput.value = "";
  rstUiTokenInput.disabled = false;
  if (!rstUiWasPsd) rsmExpr();
  const focusTarget = rstPrevFcs;
  rstPrevFcs = null;
  if (focusTarget?.isConnected && typeof focusTarget.focus === "function") {
    focusTarget.focus({ preventScroll: true });
  }
  return true;
}

// Convert and download the administrator-only shared archive
// without storing the key or raw export in browser state.
function dwnldShrdLog(payload) {
  const reading = window.LifeLogApp?.formatSharedExport?.(payload);
  if (!reading) throw new Error("shared-reading-export-unavailable");
  const blob = new Blob([JSON.stringify(reading, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = reading.sourceFile;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

async function exprtShrdLog() {
  if (!rstUiDlgOpen() || resetUiBusy || !isShrdRstMode()) return false;
  const adminToken = rstUiTokenInput.value.trim();
  if (!adminToken) {
    resetUiStatus.textContent = "Enter the administrator key to continue.";
    rstUiTokenInput.focus({ preventScroll: true });
    return false;
  }
  resetUiBusy = true;
  rstUiKeepBttn.disabled = true;
  rstUiErsBttn.disabled = true;
  rstUiTokenInput.disabled = true;
  rstUiErsBttn.textContent = "Exporting…";
  resetUiStatus.textContent = "Preparing the shared ecology reading log…";
  try {
    const payload = await window.SharedClient.exportLog(adminToken);
    dwnldShrdLog(payload);
    resetUiBusy = false;
    clsRstUiDlg();
    return true;
  } catch (error) {
    resetUiBusy = false;
    rstUiKeepBttn.disabled = false;
    rstUiErsBttn.disabled = false;
    rstUiTokenInput.disabled = false;
    rstUiTokenInput.value = "";
    rstUiErsBttn.textContent = "Export Reading Log";
    resetUiStatus.textContent = error?.message === "admin-token-invalid"
      ? "The administrator key was not accepted."
      : "The shared ecology log could not be exported. Check the connection and try again.";
    rstUiTokenInput.focus({ preventScroll: true });
    console.error("[EcologyMaintenance] Shared log export failed:", error);
    return false;
  }
}

function runMaintAction() {
  return maintenanceUiAction === "export"
    ? exprtShrdLog()
    : ersAndRstrtEco();
}

// Restarting ends the current run and clears its old snapshot;
// a new ecology then grows from the initialization entry point.
async function ersAndRstrtEco() {
  if (!rstUiDlgOpen() || resetUiBusy) return false;
  const sharedReset = isShrdRstMode();
  const adminToken = sharedReset ? rstUiTokenInput.value.trim() : "";
  if (sharedReset && !adminToken) {
    resetUiStatus.textContent = "Enter the administrator key to continue.";
    rstUiTokenInput.focus({ preventScroll: true });
    return false;
  }
  resetUiBusy = true;
  rstUiKeepBttn.disabled = true;
  rstUiErsBttn.disabled = true;
  rstUiTokenInput.disabled = true;
  rstUiErsBttn.textContent = sharedReset ? "Resetting…" : "Erasing…";
  resetUiStatus.textContent = sharedReset
    ? "Resetting the shared ecology…"
    : "Clearing the local ecology and participant log…";
  ecoStoreState.resetting = true;
  let sharedResetCompleted = false;
  try {
    if (sharedReset) {
      await window.SharedClient.resetWorld(adminToken);
      sharedResetCompleted = true;
    }
    const archive = window.AttentionLogStoreApp;
    const logsCleared = archive?.clearAll
      ? await archive.clearAll()
      : true;
    if (!logsCleared) {
      throw new Error("The participant archive could not be cleared.");
    }
    if (!store.clear()) {
      throw new Error("The ecology snapshot could not be cleared.");
    }
    window.location.reload();
    return true;
  } catch (error) {
    ecoStoreState.resetting = false;
    store.save("reset-aborted");
    resetUiBusy = false;
    rstUiKeepBttn.disabled = false;
    rstUiErsBttn.disabled = false;
    rstUiTokenInput.disabled = false;
    rstUiTokenInput.value = "";
    rstUiErsBttn.textContent = sharedReset
      ? "Reset Shared Ecology"
      : "Erase & Restart";
    resetUiStatus.textContent = sharedResetCompleted
      ? "The shared ecology was reset, but this browser's local data could not be cleared. Reload the page."
      : error?.message === "admin-token-invalid"
        ? "The administrator key was not accepted."
        : sharedReset
          ? "The shared ecology could not be reset. Check the connection and try again."
          : "Reset failed. The current ecology has been kept. Please try again.";
    console.error("[EcologyMaintenance] Reset failed:", error);
    return false;
  }
}

function hndlRstKydwn(event) {
  // While the dialog is open, handle Escape and focus cycling,
  // then skip subsequent reset-shortcut evaluation.
  if (rstUiDlgOpen()) {
    if (event.key === "Escape" && !resetUiBusy) {
      event.preventDefault();
      clsRstUiDlg();
      return;
    }
    if (event.key === "Tab") {
      const first = rstUiKeepBttn;
      const last = rstUiErsBttn;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  // Hidden maintenance shortcuts open either shared-log export or ecology reset.
  const shortcut = String(event.key || "").toLowerCase();
  if (
    event.repeat ||
    !event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (shortcut !== "r" && shortcut !== "s") ||
    canEditRstTgt(event.target)
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  openRstUiDlg(shortcut === "s" ? "export" : "reset");
}

function stpRstCont() {
  // The maintenance entry point requires all related dialog nodes to be present.
  resetUiOverlay = document.getElementById(
    "maintenance-reset-overlay"
  );
  rstUiKeepBttn = document.getElementById(
    "maintenance-reset-keep"
  );
  rstUiErsBttn = document.getElementById(
    "maintenance-reset-erase"
  );
  resetUiStatus = document.getElementById(
    "maintenance-reset-status"
  );
  resetUiTitle = document.getElementById(
    "maintenance-reset-title"
  );
  rstUiPrimaryCopy = document.getElementById(
    "maintenance-reset-primary-copy"
  );
  rstUiSecondaryCopy = document.getElementById(
    "maintenance-reset-secondary-copy"
  );
  rstUiTokenRow = document.getElementById(
    "maintenance-reset-token-row"
  );
  rstUiTokenInput = document.getElementById(
    "maintenance-reset-token"
  );
  if (
    !resetUiOverlay ||
    !rstUiKeepBttn ||
    !rstUiErsBttn ||
    !resetUiStatus ||
    !resetUiTitle ||
    !rstUiPrimaryCopy ||
    !rstUiSecondaryCopy ||
    !rstUiTokenRow ||
    !rstUiTokenInput
  ) {
    return false;
  }
  // dataset marks listener-binding state so setup can perform the initial binding exactly once.
  if (resetUiOverlay.dataset.bound !== "1") {
    resetUiOverlay.dataset.bound = "1";
    rstUiKeepBttn.addEventListener(
      "click",
      clsRstUiDlg
    );
    rstUiErsBttn.addEventListener(
      "click",
      runMaintAction
    );
    resetUiOverlay.addEventListener("pointerdown", (event) => {
      if (event.target === resetUiOverlay) {
        clsRstUiDlg();
      }
    });
    document.addEventListener(
      "keydown",
      hndlRstKydwn,
      true
    );
  }
  return true;
}
