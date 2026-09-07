// File Overview
// Coordinates participant sessions, gaze targets, and interactions
// between attention paths and lifeforms.

// 1. A single gaze can also become a relationship
// Each participant enters a session with their own gaze,
// and their influences meet within the shared environment.

// 2. Understanding each participant's current state
function crtRmrIxStt() {
  return {
    target: null,
    leaveMs: 0,
  };
}
let roamLock = crtRmrIxStt();

const maxIxSessions = 3;
const othrLifGazScl = 0.88;
const gazeIxAssist = Object.freeze({
  inputMode: "eye-head",
  predatorPad: 14,
  smallLifePad: 18,
  defaultPad: 12,
  smallLifeRMax: 34,
  dfltHoldScl: 1.45,
  lgclRadScl: 0.88,
});

// Five lifeforms receive session updates through a common interface;
// InteractionSystem handles only selection and dispatch.
const behaviorByType = Object.freeze({
  [eco.lifeType.predator]: window.PredatorBehavior,
  [eco.lifeType.parasite]: window.ParasiteBehavior,
  [eco.lifeType.roamer]: window.RoamerBehavior,
  [eco.lifeType.deepDiver]: window.DeepDiverBehavior,
  [eco.lifeType.guardian]: window.GuardianBehavior,
});

// Camera snapshots are classified as gaze, rest, or interruption;
// species systems read this normalized state.
function ixEngageState(camera) {
  if (!camera) return "gaze-engagement";
  if (camera.inputMode !== gazeIxAssist.inputMode) {
    return "gaze-engagement";
  }
  const state = camera.engagementState || camera.eyes?.engagementState;
  return state === "rest" ? "rest" : "gaze-engagement";
}

function ixBlinkFlow(camera) {
  if (!camera || camera.inputMode !== gazeIxAssist.inputMode) {
    return false;
  }
  return camera.eyes?.closurePhase === "blink";
}

// Pause reasons are prioritized as input interruption, eyes-closed rest, then tracking interruption;
// return the one requiring the highest-level handling.
function getProgPsRsn(camera) {
  if (!camera || camera.inputMode !== gazeIxAssist.inputMode) {
    return null;
  }
  if (camera.eyes?.closurePhase === "long-interrupt") return null;
  if (ixBlinkFlow(camera)) return null;
  if (ixEngageState(camera) === "rest") return "rest";
  if (camera.calibration?.active) return "calibration";
  if (
    camera.cursorTracking?.phase === "grace" ||
    camera.cursorTracking?.phase === "recovering"
  ) {
    return "tracking-grace";
  }
  return null;
}

function longEyeCloSeq(camera) {
  if (!camera || camera.inputMode !== gazeIxAssist.inputMode) return 0;
  return max(0, Number(camera.eyes?.longClosureSequence) || 0);
}

// Data flow: GazeApp snapshot -> session synchronization ->
// per-session update -> frame-intent aggregation -> world-queue commit.
class InteractionSession {
  constructor(id, legacyState = null) {
    // Identity and input bindings belong to session root state;
    // camera is updated from the input snapshot each frame.
    this.id = id;
    this.userIndx = id;
    this.enabled = id === 0;
    this.camera = null;
    // Corresponding systems interpret each lifeform's substate;
    // this class stores one instance per participant.
    this.hunt =
      legacyState?.hunt ||
      behaviorByType[eco.lifeType.predator].createSessionState();
    this.roamLock =
      legacyState?.roamLock ||
      behaviorByType[eco.lifeType.roamer].createSessionState();
    this.deepFocus =
      legacyState?.deepFocus ||
      behaviorByType[eco.lifeType.deepDiver].createSessionState();
    this.careState =
      legacyState?.careState ||
      behaviorByType[eco.lifeType.guardian].createSessionState();
    this.careGlowFades =
      legacyState?.careGlowFades || [];
    this.carePanelBox =
      legacyState?.carePanelBox || null;
    this.pathEndNtcStt =
      legacyState?.pathEndNtcStt || makePathNtcStt();
    // These sets are rebuilt each frame to represent world
    // objects currently attended to or locked by the session.
    this.parasites =
      behaviorByType[eco.lifeType.parasite].createSessionState();
    this.fcsdPrdt6y = null;
    this.lures = [];
    // aim stores the raw and logical gaze required for target acquisition;
    // radius fields belong to the current frame's hit test.
    this.aim = {
      target: null,
      active: false,
      rawGaze: null,
      logicalGaze: null,
      acqsPddng: 0,
      acqsRad: 0,
      holdRadius: 0,
    };
    this.lockedTargets = new Set();
    // The following fields preserve continuity across frames,
    // providing a common interpretation of pauses, interruptions, and the most recent valid contact.
    this.engagementState = "gaze-engagement";
    this.progressPaused = false;
    this.progPsRsn = null;
    this.specialIx = null;
    this.lastEnggdCmr = null;
    this.lastCloseSeq = 0;
    this.breakRsn = null;
    this.rrmBlckdTgt = null;
    this.lastUpdatedAt = 0;
  }

  // The camera snapshot is normalized into participation state;
  // the most recent valid gaze is copied separately so
  // blinks and brief pauses can sustain the relationship.
  bindCamera(camera, enabled) {
    this.camera = camera || null;
    this.enabled = Boolean(enabled && camera);
    this.engagementState = ixEngageState(camera);
    this.progPsRsn = getProgPsRsn(camera);
    this.progressPaused = Boolean(this.progPsRsn);
    this.specialIx =
      this.engagementState === "rest" &&
      camera?.eyes?.closurePhase !== "long-interrupt"
        ? "rest"
        : null;
    if (
      this.engagementState === "gaze-engagement" &&
      camera?.inputActive &&
      camera?.gaze
    ) {
      this.lastEnggdCmr = {
        ...camera,
        gaze: { ...camera.gaze },
        eyes: camera.eyes ? { ...camera.eyes } : null,
      };
    }
    if (camera?.inputMode !== gazeIxAssist.inputMode) {
      this.aim.target = null;
      this.aim.active = false;
    }
  }

  // The calibration-barrier snapshot exposes gaze, focused object, and encounter phase.
  calibObst85() {
    const focused =
      this.hunt.focused ||
      [...this.parasites][0] ||
      this.deepFocus.target ||
      this.roamLock.target ||
      this.careState.source ||
      null;
    return {
      enabled: this.enabled,
      gaze: this.camera?.gaze ? { ...this.camera.gaze } : null,
      logicalGaze: this.aim.logicalGaze
        ? { ...this.aim.logicalGaze }
        : null,
      focusedType: focused?.type || null,
      focusedSeed: focused?.seed ?? null,
      deepPhase: this.deepFocus.phase,
      guardianPhase: this.careState.phase,
      encnActv: getActLifTyp(this).size > 0,
    };
  }

}

const sessions = Array.from(
  { length: maxIxSessions },
  (_, index) =>
    new InteractionSession(
      index,
      index === 0
        ? {
            hunt,
            roamLock,
            deepFocus,
            careState: care.state,
            careGlowFades,
            carePanelBox,
            pathEndNtcStt,
          }
        : null
    )
);
// This system centrally coordinates sessions, the currently bound
// session, target locks, and cross-species interaction progress.
let activeSession = sessions[0];
let activeCam = null;
let ixUserCount = 1;
let isMultLtchd = false;

function bindIxSession(session) {
  // Switch compatibility aliases to the specified session; the caller
  // is responsible for restoring the previous session afterward.
  const resolved = session || sessions[0];
  if (activeSession) {
    activeSession.carePanelBox =
      carePanelBox;
  }
  activeSession = resolved;
  activeCam = resolved.camera;
  hunt = resolved.hunt;
  roamLock = resolved.roamLock;
  deepFocus = resolved.deepFocus;
  care.state = resolved.careState;
  careGlowFades = resolved.careGlowFades;
  carePanelBox = resolved.carePanelBox;
  pathEndNtcStt = resolved.pathEndNtcStt;
  return resolved;
}

// Check whether care still has an active phase, candidate, source, or collaboration state.
function careNdsCelCnc(state) {
  return Boolean(
    state &&
      (state.phase !== "idle" ||
        state.candidate ||
        state.source ||
        state.collabStatus !== "idle")
  );
}

// Active Guardian care takes priority over related targets;
// other species interactions must release conflicting locks.
function enfrcCareLock(
  ownerSession,
  collIds = []
) {
  const owner = ownerSession || sessions[0];
  const participantIds = new Set([
    owner.id,
    ...collIds,
  ]);
  for (const session of sessions) {
    bindIxSession(session);
    if (careNdsCelCnc(care.state)) {
      behaviorByType[eco.lifeType.guardian].resetInteraction();
    }
  }
  for (const session of sessions) {
    bindIxSession(session);
    syncTgtLcks(session);
  }
  bindIxSession(owner);
  care.state.collIds = [...participantIds].filter(
    (sessionId) => sessionId !== owner.id
  );
}

// Interactions read the snapshot bound for the current frame; if absent,
// retrieve current state from the gaze system.
function ixCamSnapshot() {
  return activeCam || window.GazeApp?.snapshot?.() || null;
}

// This function was modified with the assistance of ChatGPT.
function syncIxSessions(cameraSnapshot) {
  // Participant identifiers in the snapshot map directly to preset session slots.
  const multiEnabled =
    cameraSnapshot?.multiModeEnabled !== false;
  const sessionLimit = multiEnabled
    ? maxIxSessions
    : 1;
  const hasSuppUsrs = Array.isArray(cameraSnapshot?.participants);
  const supplied = hasSuppUsrs
    ? cameraSnapshot.participants.slice(0, sessionLimit)
    : [];
  const participants = Array(maxIxSessions).fill(null);
  if (hasSuppUsrs) {
    for (const participant of supplied) {
      const participantId = clamp(
        Number(participant?.participantId) || 0,
        0,
        maxIxSessions - 1
      );
      if (!participants[participantId]) participants[participantId] = participant;
    }
  } else if (cameraSnapshot) {
    participants[0] = cameraSnapshot;
  }
  const activeCount = clamp(
    Number(cameraSnapshot?.participantCount) ||
      participants.filter(Boolean).length ||
      1,
    1,
    sessionLimit
  );
  if (activeCount > 1) isMultLtchd = true;
  for (let index = 0; index < sessions.length; index++) {
    const participant = participants[index] || null;
    const session = sessions[index];
    const ongoing = Boolean(
      session.lockedTargets.size ||
        session.deepFocus.phase !== "idle" ||
        session.careState.phase !== "idle"
    );
    // When a participant temporarily disappears during an active interaction,
    // retain a camera-disabled copy so cancellation animation can complete safely.
    const inactiveCamera = !participant && ongoing && session.camera
      ? {
          ...session.camera,
          inputActive: false,
          pointerActive: false,
          isPointerMode: false,
          faceCount: 0,
        }
      : null;
    session.bindCamera(
      participant || inactiveCamera,
      Boolean(participant) || ongoing
    );
  }
  const peerOngng = sessions
    .slice(1)
    .some((session) => session.enabled || session.lockedTargets.size);
  // Release the multiplayer-mode latch only after all other sessions become idle.
  if (activeCount <= 1 && !peerOngng) {
    isMultLtchd = false;
  }
  ixUserCount = isMultLtchd
    ? max(2, activeCount)
    : activeCount;
  bindIxSession(sessions[0]);
  activeCam = sessions[0].camera || cameraSnapshot;
}

const ixTargetOwners = new WeakMap();

// A target can be assigned to the current participant once it is idle and has met its release threshold.
function tgtRdyToSssn(entity, session = activeSession) {
  if (!entity) return false;
  if (isLifeDying(entity)) return false;
  if (session?.rrmBlckdTgt === entity) return false;
  const owner = ixTargetOwners.get(entity);
  return !owner || owner === session;
}

// Active-species sets combine entity feedback with session phases.
function getActLifTyp(
  session = activeSession
) {
  const species = new Set();
  if (!session) return species;
  if (session.deepFocus.phase !== "idle") {
    species.add(eco.lifeType.deepDiver);
  }
  if (session.careState.phase !== "idle") {
    species.add(eco.lifeType.guardian);
  }
  if (session.careState.collabStatus === "offered") {
    species.add(eco.lifeType.guardian);
  }
  if (session.roamLock.target?.isIxActv?.()) {
    species.add(eco.lifeType.roamer);
  }
  for (const entity of session.lockedTargets) {
    if (isEncounterActive(entity)) species.add(entity.type);
  }
  return species;
}

// When another species already has an active interaction, narrow the gaze hit range for a new species to
// reduce one gaze accidentally triggering multiple narrative branches.
function ixGazeScale(
  type,
  session = activeSession
) {
  const activeTypes = getActLifTyp(session);
  return activeTypes.size > 0 && !activeTypes.has(type)
    ? othrLifGazScl
    : 1;
}

// Register target ownership centrally before an interaction begins.
function lockIxTarget(entity, session = activeSession) {
  if (!entity || !session || !tgtRdyToSssn(entity, session)) {
    return false;
  }
  ixTargetOwners.set(entity, session);
  return true;
}

function freeIxTgt(entity, session = activeSession) {
  if (!entity || ixTargetOwners.get(entity) !== session) return false;
  ixTargetOwners.delete(entity);
  return true;
}

const wrldCmmndQ = [];
let frameIntent = null;

// 3. Each relationship first leaves an intention; the shared world responds afterward
// Local contract: session updates register commands, and the
// flush functions in this section execute shared-world mutations.
function enqWrldCmmnd(session, kind, execute, metadata = {}) {
  if (typeof execute !== "function") return false;
  wrldCmmndQ.push({
    sessionId: session?.id ?? 0,
    kind,
    execute,
    metadata,
  });
  return true;
}

// Commit the world-change queue after interaction updates complete.
// This function was modified with the assistance of ChatGPT.
function flshWrldQ() {
  if (!wrldCmmndQ.length) return 0;
  const commands = wrldCmmndQ.splice(0, wrldCmmndQ.length);
  let completed = 0;
  for (const command of commands) {
    try {
      if (command.execute() !== false) completed++;
    } catch (error) {
      console.error("World command failed", command.kind, error);
    }
  }
  return completed;
}

// Release target locks and rebuild species-interaction
// state while preserving participant session containers.
function rstWrldSess() {
  careLinkFades.length = 0;
  for (const session of sessions) {
    bindIxSession(session);
    behaviorByType[eco.lifeType.deepDiver].resetInteraction();
    behaviorByType[eco.lifeType.guardian].resetInteraction();
    for (const entity of session.lockedTargets) {
      freeIxTgt(entity, session);
    }
    session.hunt =
      behaviorByType[eco.lifeType.predator].createSessionState();
    session.roamLock =
      behaviorByType[eco.lifeType.roamer].createSessionState();
    session.deepFocus =
      behaviorByType[eco.lifeType.deepDiver].createSessionState();
    session.careState =
      behaviorByType[eco.lifeType.guardian].createSessionState();
    session.careGlowFades = [];
    session.carePanelBox = null;
    session.pathEndNtcStt = makePathNtcStt();
    session.parasites.clear();
    session.fcsdPrdt6y = null;
    session.lures = [];
    session.lastCloseSeq = 0;
    session.breakRsn = null;
    session.rrmBlckdTgt = null;
    session.lifeAttnTgt = null;
    session.lockedTargets.clear();
  }
  bindIxSession(sessions[0]);
}

// 4. How attention enters different lifeforms and drives BasicCell transformation
// This function was modified with the assistance of ChatGPT.
function updtRmrAttn(camera, hasController, frameMs) {
  const roamers = groups[eco.lifeType.roamer];
  const gaze = camera?.gaze;
  const now = typeof millis === "function" ? millis() : 0;
  const radiusScale = ixGazeScale(eco.lifeType.roamer);
  let target = roamLock.target;
  let targetInside = false;
  let releasedTarget = null;

  // Release a locked target immediately when it leaves the world, enters another interaction,
  // or no longer meets eligibility conditions.
  if (
    target &&
    (!roamers.includes(target) ||
      !target.canRcvIx(now) ||
      !tgtRdyToSssn(target))
  ) {
    target = null;
    roamLock.target = null;
    roamLock.leaveMs = 0;
  }

  // An existing target takes precedence over a new hit; the grace period absorbs brief departure,
  // while a ready division waits for an explicit release action.
  if (target) {
    const radius =
      infoRadius(target) *
      roamCfg.ixHitScl *
      radiusScale;
    const inside = Boolean(
      hasController &&
        gaze &&
        dist2(gaze.x, gaze.y, target.x, target.y) <= radius * radius
    );
    if (inside) {
      targetInside = true;
      roamLock.leaveMs = 0;
    // Once division is ready, submit release when controlled gaze
    // leaves the hit range. Departure also contributes to growth.
    } else if (target.splitArmed && hasController && gaze) {
      releasedTarget = target;
      behaviorByType[eco.lifeType.roamer].updateInteraction({
        entity: target,
        camera,
        hasController,
        frameMs,
        mode: "release",
      });
      target = null;
      roamLock.target = null;
      roamLock.leaveMs = 0;
    } else if (target.splitArmed) {
      roamLock.leaveMs = 0;
    } else {
      roamLock.leaveMs += frameMs;
      if (
        roamLock.leaveMs >=
        roamCfg.ixLvGrcMs
      ) {
        releasedTarget = target;
        behaviorByType[eco.lifeType.roamer].updateInteraction({
          entity: target,
          camera,
          hasController,
          frameMs,
          mode: "release",
        });
        target = null;
        roamLock.target = null;
        roamLock.leaveMs = 0;
      }
    }
  }

  // Lock remaining candidates by nearest distance within hit range.
  if (!target && !releasedTarget && hasController && gaze) {
    let bestDistSq = Infinity;
    for (const roamer of roamers) {
      if (
        !roamer.canRcvIx(now) ||
        !tgtRdyToSssn(roamer)
      ) {
        continue;
      }
      const radius =
        infoRadius(roamer) *
        roamCfg.ixHitScl *
        radiusScale;
      const distSq = dist2(gaze.x, gaze.y, roamer.x, roamer.y);
      if (
        distSq <= radius * radius &&
        distSq < bestDistSq
      ) {
        target = roamer;
        bestDistSq = distSq;
      }
    }
    if (target) {
      roamLock.target = target;
      roamLock.leaveMs = 0;
      targetInside = true;
    }
  }

  // Update gaze feedback for available Roamers, using
  // active for the current hit target and hold for the rest.
  for (const roamer of roamers) {
    if (!tgtRdyToSssn(roamer)) continue;
    if (roamer === releasedTarget) continue;
    behaviorByType[eco.lifeType.roamer].updateInteraction({
      entity: roamer,
      camera,
      hasController,
      frameMs,
      mode: roamer === target && targetInside ? "active" : "hold",
    });
  }
}

// Treat a Predator with active capture and existing gaze progress as locked.
function prdtFcsLckd(entity) {
  return Boolean(
    entity &&
      !entity.captureDone &&
      (entity.gazeDwellMs > 0 || entity.cptrProg > 0)
  );
}

function prdtIgnrsLure(entity) {
  return Boolean(entity && entity.cptrProg > 0);
}

// Sort interactive Predators by normalized hit distance.
function findPredator(gazeX, gazeY, current = null) {
  const radiusScale = ixGazeScale(
    eco.lifeType.predator
  );
  let heldCurrent = null;
  let heldDistSq = Infinity;
  if (
    current &&
    creatures.includes(current) &&
    isVisible(current) &&
    tgtRdyToSssn(current)
  ) {
    const position = worldPos(current);
    const holdRadius =
      infoRadius(current) *
      capture.tgtHoldScl *
      radiusScale;
    heldDistSq = dist2(gazeX, gazeY, position.x, position.y);
    if (heldDistSq <= holdRadius * holdRadius) {
      heldCurrent = current;
    }
  }
  // A target already in capture has the highest retention priority.
  if (heldCurrent && prdtFcsLckd(heldCurrent)) {
    return heldCurrent;
  }

  let closest = null;
  let closestDistSq = Infinity;
  for (const entity of creatures) {
    if (entity.type !== eco.lifeType.predator || !isVisible(entity)) continue;
    if (!tgtRdyToSssn(entity)) continue;
    if (entity.birthProgress < 1) continue;
    const position = worldPos(entity);
    const hitRadius = infoRadius(entity) * radiusScale;
    const distSq = dist2(gazeX, gazeY, position.x, position.y);
    if (
      distSq <= hitRadius * hitRadius &&
      distSq < closestDistSq
    ) {
      closest = entity;
      closestDistSq = distSq;
    }
  }

  if (!heldCurrent || closest === heldCurrent) return closest || heldCurrent;
  // A substantially nearer new target may replace the retained target,
  // reducing rapid switching near boundaries.
  if (
    closest &&
    closestDistSq <
      heldDistSq *
        capture.swtchDistRt
  ) {
    return closest;
  }
  return heldCurrent;
}

function findPlldPrdt(
  gazeX,
  gazeY,
  current = [],
  focused = null,
  excluded = null
) {
  // The lure set permits a wider retention radius.
  const lureRadius = capture.lureRadius;
  const holdRadius =
    lureRadius * capture.lureHoldScale;
  const lureRadiusSq = lureRadius * lureRadius;
  const holdRadiusSq = holdRadius * holdRadius;
  const held = new Set(Array.isArray(current) ? current : []);
  const candidates = [];
  for (const entity of creatures) {
    if (entity.type !== eco.lifeType.predator || !isVisible(entity)) continue;
    if (!tgtRdyToSssn(entity)) continue;
    if (entity.birthProgress < 1) continue;
    if (entity === excluded) continue;
    const position = worldPos(entity);
    const distSq = dist2(gazeX, gazeY, position.x, position.y);
    const isFocused = entity === focused;
    const isHeld = held.has(entity) && distSq <= holdRadiusSq;
    if (!isFocused && !isHeld && distSq >= lureRadiusSq) continue;
    candidates.push({ entity, distSq, isFocused });
  }
  // The currently body-focused target has higher priority; remaining targets are ordered by distance,
  // and the entry point limits how many are affected this frame.
  candidates.sort(
    (a, b) =>
      Number(b.isFocused) - Number(a.isFocused) ||
      a.distSq - b.distSq
  );
  return candidates
    .slice(0, capture.lureMaximum)
    .map((candidate) => candidate.entity);
}

// Source seed and encounter count jointly determine the residue outcome,
// producing the same result from identical inputs and probability settings.
function encnRsd(sourceEntity) {
  const seed =
    (floor(sourceEntity?.seed || 0) ^
      Math.imul(sourceEntity?.viewCount || 1, 0x9e3779b1)) >>>
    0;
  return (
    mulberry32(seed)() < capture.parsDiffChnc
  );
}

// Source species and outcome jointly determine whether differentiation leaves residue;
// logging and visuals use the same decision.
function leavesResidue(
  sourceEntity,
  species,
  compSeq = 1
) {
  const speciesSeed = {
    [eco.lifeType.roamer]: 0x243f6a88,
    [eco.lifeType.deepDiver]: 0x85a308d3,
    [eco.lifeType.guardian]: 0x13198a2e,
  }[species] || 0xa4093822;
  const seed =
    (floor(sourceEntity?.seed || 0) ^
      speciesSeed ^
      Math.imul(max(1, compSeq), 0x9e3779b1)) >>>
    0;
  return (
    mulberry32(seed)() <
    capture.othrLifRsdChn
  );
}

const diff = Object.freeze({
  timing: getDiffTiming,
  commit: commitDiff,
  toParasite: diffToParasite,
  toRoamer: diffToRoamer,
  toDeepDiver: diffDeepDiver,
  forSpecies: diffForType,
  toPredator: diffToPredator,
});

// Differentiation phases share color, body, and birth durations;
// Roamer alone uses its own movement-growth rhythm.
function getDiffTiming(reason, type) {
  return {
    colorMs: capture.diffColorMs,
    durationMs: capture.diffDurationMs,
    birthMs:
      type === eco.lifeType.roamer
        ? roamCfg.diffGrowthMs
        : capture.diffBirthMs,
  };
}

// Differentiation logs bind the source cell and normalized timing
// information so visual completion and archived records can be cross-checked.
function recordLifeDiff(type, now, sourceCell = null, timing = null) {
  const name = type === eco.lifeType.deepDiver ? "Deep Diver" : type;
  return lifeLog.record(
    "LIFE DIFFERENTIATED",
    `A possible life has become a ${name}.`,
    {
      key: `life-differentiated:${type}`,
      primarySpecies: type,
      aggregationKey: `life-differentiated:${type}`,
      priority: 90,
      dedupeMs: 30000,
      display: false,
      now,
    }
  );
}

// After differentiation completes, the shared glow lingers briefly
// so participants have time to see the result of the change.
function holdLifeGlow(entity, completedAt) {
  if (!entity || !Number.isFinite(completedAt)) return;
  entity.audnImpGloUnt =
    completedAt +
    userGlowCfg.diffLifeHoldMs;
}

// Build the differentiation timeline from the target cell's current state, keeping entry,
// transformation, and release phases continuous.
function diffCellStrtr(targetCell, now) {
  return targetCell
    ? (duration, colorDuration, colors, alphas) =>
        window.GazeApp?.bgnTgtDiff?.(
          targetCell,
          duration,
          colorDuration,
          colors,
          alphas,
          now
        )
    : window.GazeApp?.beginCellDiff;
}

// BasicCells differentiate according to interaction outcomes,
// translating gaze behavior into ecological change.
function commitDiff({
  entity,
  type,
  metadata,
  counter,
  now,
  sourceCell,
  timing,
}) {
  if (!window.CreatureWorld.add(entity, metadata)) return false;
  hunt[counter]++;
  hunt.diffCount++;
  recordLifeDiff(type, now, sourceCell, timing);
  return true;
}

function diffToParasite(
  reason,
  host,
  now = typeof millis === "function" ? millis() : 0,
  targetCell = null
) {
  const creatureWorld = window.CreatureWorld;
  // Differentiation requires a valid host, a writable world entry point, and one reserved cell;
  // commit ecological capacity once all conditions are met.
  const timing = diff.timing(
    reason,
    eco.lifeType.parasite
  );
  const beginCell = diffCellStrtr(targetCell, now);
  if (!host || !creatureWorld?.add || typeof beginCell !== "function") {
    return false;
  }
  if (!lifeCanAdmTyp(eco.lifeType.parasite)) return false;

  const index = hunt.parasiteDiffCount;
  // Host, observation count, and differentiation sequence jointly generate a stable seed.
  const seed =
    (floor(host.seed || 0) ^
      Math.imul(host.viewCount || 1, 0x85ebca6b) ^
      Math.imul(index + 1, 0xc2b2ae35)) >>>
    0;
  const parasiteSeed = 200000 + seed;
  // Begin changing the BasicCell's color before creating the Parasite,
  // preserving the source of this differentiation.
  const sourceCell = beginCell(
    timing.durationMs,
    timing.colorMs,
    {
      body: Parasite.residueColor,
      core: Parasite.actvCoreClr,
      line: [255, 255, 255],
    },
    {
      body: 0.54 * 255,
      core: Parasite.actvCoreAlph * 255,
    }
  );
  if (!sourceCell) return false;

  const rng = mulberry32(seed);
  const angle = rng() * TWO_PI;
  const radius = infoRadius(host) * srng(rng, 0.15, 0.42);
  const rotation =
    (host.rot ?? host.rot0 ?? host.a ?? 0) +
    srng(rng, -0.9, 0.8);
  const parasite = new Parasite(
    host,
    cos(angle) * radius,
    sin(angle) * radius,
    rotation,
    sizes.Parasite[index % sizes.Parasite.length],
    parasiteSeed
  );
  parasite.startDiffBirth(
    sourceCell,
    now + timing.colorMs,
    timing.birthMs
  );
  holdLifeGlow(
    parasite,
    parasite.birthStartAt + parasite.birthDuration
  );
  // A new Parasite may prebuild its static cache before the growth animation begins.
  parasite.prepStaticCache();
  return diff.commit({
    entity: parasite,
    type: eco.lifeType.parasite,
    metadata: {
      group: "parasite",
      origin: "basic-cell-diff",
      reason,
      hostType: host.type,
    },
    counter: "parasiteDiffCount",
    now,
    sourceCell,
    timing,
  });
}

function diffToRoamer(
  reason,
  sourceRoamer,
  now = typeof millis === "function" ? millis() : 0,
  targetCell = null
) {
  const creatureWorld = window.CreatureWorld;
  // Begin differentiation when both the reserved cell and species capacity are valid.
  const timing = diff.timing(
    reason,
    eco.lifeType.roamer
  );
  const beginCell = diffCellStrtr(targetCell, now);
  if (!sourceRoamer || !creatureWorld?.add || typeof beginCell !== "function") {
    return false;
  }
  if (!lifeCanAdmTyp(eco.lifeType.roamer)) return false;

  const sourceCell = beginCell(
    timing.durationMs,
    timing.colorMs,
    {
      body: roamCfg.diffColor,
      core: roamCfg.diffColor,
      line: [255, 255, 255],
    }
  );
  if (!sourceCell) return false;

  const index = hunt.roamerDiffCount;
  // Source and differentiation sequence control initial direction and size,
  // keeping the same ecological outcome consistent on replay.
  const seed =
    (floor(sourceRoamer.seed || 0) ^
      Math.imul(index + 1, 0x9e3779b1)) >>>
    0;
  const rng = mulberry32(seed);
  const roamer = new Roamer(sourceCell.x, sourceCell.y, rng() * TWO_PI);
  roamer.sz = srng(
    rng,
    roamCfg.diffTgtSizeMin,
    roamCfg.diffTgtSizeMax
  );
  const initialSize = srng(
    rng,
    roamCfg.diffIniSizMin,
    roamCfg.diffIniSizMax
  );
  // Birth begins at the cell position and grows in phases, expressing
  // mind-wandering as a new path unfolding from an ordinary cell.
  roamer.startDiffBirth(
    sourceCell,
    now + timing.colorMs,
    timing.birthMs,
    initialSize
  );
  holdLifeGlow(
    roamer,
    roamer.splitBirth.startAt +
      roamer.splitBirth.birthDuration +
      roamer.splitBirth.growthDuration
  );
  return diff.commit({
    entity: roamer,
    type: eco.lifeType.roamer,
    metadata: {
      group: "creature",
      origin: "basic-cell-diff",
      reason,
      targetType: eco.lifeType.roamer,
    },
    counter: "roamerDiffCount",
    now,
    sourceCell,
    timing,
  });
}

function diffDeepDiver(
  reason,
  srcDeepDvr,
  now = typeof millis === "function" ? millis() : 0,
  targetCell = null
) {
  const creatureWorld = window.CreatureWorld;
  // Deep Diver differentiation shares capacity checks with
  // other species while using its own color and growth duration.
  const timing = diff.timing(
    reason,
    eco.lifeType.deepDiver
  );
  const beginCell = diffCellStrtr(targetCell, now);
  if (
    !srcDeepDvr ||
    !creatureWorld?.add ||
    typeof beginCell !== "function"
  ) {
    return false;
  }
  if (!lifeCanAdmTyp(eco.lifeType.deepDiver)) return false;

  const sourceCell = beginCell(
    timing.durationMs,
    timing.colorMs,
    {
      body: eco.lifeColor.DeepDiver,
      core: eco.lifeColor.DeepDiver,
      line: [255, 255, 255],
    }
  );
  if (!sourceCell) return false;

  const index = hunt.deepDiverDiffCount;
  // A deterministic seed varies individual form and orientation.
  const seed =
    (floor(srcDeepDvr.seed || 0) ^
      Math.imul(index + 1, 0x9e3779b1)) >>>
    0;
  const rng = mulberry32(seed);
  const deepDiver = new DeepDiver(
    sourceCell.x,
    sourceCell.y,
    srng(rng, 100, 900),
    rng() * TWO_PI
  );
  deepDiver.sz = srng(
    rng,
    deepCfg.diffTgtSizeMin,
    deepCfg.diffTgtSizeMax
  );
  const initialSize = srng(
    rng,
    deepCfg.diffIniSizMin,
    deepCfg.diffIniSizMax
  );
  // Begin entity growth only after the color transition completes,
  // giving the formation of sustained attention a legible transitional phase.
  deepDiver.startDiffBirth(
    sourceCell,
    now + timing.colorMs,
    initialSize,
    timing.birthMs
  );
  holdLifeGlow(
    deepDiver,
    deepDiver.diffBirth.startAt +
      deepDiver.diffBirth.duration
  );
  return diff.commit({
    entity: deepDiver,
    type: eco.lifeType.deepDiver,
    metadata: {
      group: "creature",
      origin: "basic-cell-diff",
      reason,
      targetType: eco.lifeType.deepDiver,
    },
    counter: "deepDiverDiffCount",
    now,
    sourceCell,
    timing,
  });
}

let fcsSlotSeq = 0;

// Encounter-cell candidates must satisfy availability, distance, and ownership conditions together.
function encnCellCnds(
  session = activeSession
) {
  const available = (window.GazeApp?.targets?.() || []).filter(
    (cell) =>
      cell &&
      !cell.dead &&
      !cell.differentiating &&
      !cell.directAppr &&
      !cell.encounterLock
  );
  if (ixUserCount <= 1) return available;
  const participantId = session?.userIndx ?? 0;
  const owned = available.filter(
    (cell) =>
      cell.countsForBirth !== false &&
      cell.brthUserId === participantId
  );
  const fallback = available.filter(
    (cell) => cell.countsForBirth === false
  );
  return [...owned, ...fallback];
}

// Select and lock the required number of available cells,
// returning the actual reserved count for resolution.
function rsrvMeetClls(
  count,
  session = activeSession
) {
  const requested = max(0, floor(Number(count) || 0));
  if (!requested) return { id: null, cells: [] };
  const id = `${legacyEvent.encounterSlotPrefix}-${++fcsSlotSeq}`;
  const cells = encnCellCnds(session).slice(0, requested);
  for (const cell of cells) {
    cell.encounterLock = {
      id,
      participantId: session?.userIndx ?? 0,
    };
  }
  return { id, cells };
}

// When a reservation identifier is provided, validate it before
// release; when omitted, release the existing lock directly.
function freeEncnCell(cell, reservationId) {
  if (
    !cell?.encounterLock ||
    (reservationId &&
      cell.encounterLock.id !== reservationId)
  ) {
    return false;
  }
  delete cell.encounterLock;
  return true;
}

// Map species intent to an available differentiation entry point;
// return null for other types and let the upper layer degrade safely.
function diffForType(species) {
  if (species === eco.lifeType.roamer) {
    return diff.toRoamer;
  }
  if (species === eco.lifeType.deepDiver) {
    return diff.toDeepDiver;
  }
  return null;
}

// Determine differentiation, reproduction, or residue
// outcomes from the current species and interaction phase
// This function was modified with the assistance of ChatGPT.
function rslvFcsChng({
  host,
  species,
  spcReqr = false,
  session = activeSession,
  now = typeof millis === "function" ? millis() : 0,
  deferSpecies = false,
} = {}) {
  if (!host || !species) return null;
  // Advance one resolution sequence per completed interaction;
  // species differentiation and parasitic residue share the same outcome context.
  const compSeq =
    (hunt.othrLifeEncnN || 0) + 1;
  hunt.othrLifeEncnN = compSeq;
  const parasiteRoll = leavesResidue(
    host,
    species,
    compSeq
  );
  // Reserve all required cells before performing differentiation.
  const reqrCellN = Number(spcReqr) + Number(parasiteRoll);
  const reservation = rsrvMeetClls(
    reqrCellN,
    session
  );
  let nextCellIndex = 0;
  const speciesCell = spcReqr
    ? reservation.cells[nextCellIndex++] || null
    : null;
  const parasiteCell =
    parasiteRoll && (!spcReqr || speciesCell)
      ? reservation.cells[nextCellIndex++] || null
      : null;
  const result = {
    host,
    species,
    spcReqr,
    parasiteRoll,
    compSeq,
    reservationId: reservation.id,
    speciesCell,
    parasiteCell,
    spcDiff: false,
    parasiteDiffed: false,
    paraAmped: false,
    deferred: false,
    sessionId: session?.id ?? 0,
  };

  // Release surplus candidates immediately; reservation
  // locks cover cells that this operation may consume.
  for (let index = nextCellIndex; index < reservation.cells.length; index++) {
    freeEncnCell(reservation.cells[index], reservation.id);
  }

  // Abort creation when the primary species has no source cell;
  // degrade the parasitic outcome to an amplification of existing parasitic pressure.
  if (spcReqr && !speciesCell) {
    if (parasiteRoll) {
      bstSprsPars();
      result.paraAmped = true;
    }
    return result;
  }

  // Deferred mode preserves reservations for later phases while
  // this function determines the additional parasitic outcome.
  if (deferSpecies && spcReqr) {
    result.deferred = true;
    if (parasiteRoll && !parasiteCell) {
      bstSprsPars();
      result.paraAmped = true;
    }
    return result;
  }

  // After the primary species forms successfully, parasitic residue may consume a second cell.
  if (spcReqr) {
    const diffSpc = diff.forSpecies(species);
    freeEncnCell(speciesCell, reservation.id);
    result.spcDiff = Boolean(
      diffSpc?.(
        "interaction-complete",
        host,
        now,
        speciesCell
      )
    );
    if (!result.spcDiff) {
      freeEncnCell(parasiteCell, reservation.id);
      if (parasiteRoll) {
        bstSprsPars();
        result.paraAmped = true;
      }
      return result;
    }
  }

  // Failed parasitic differentiation still becomes a global scarcity amplification,
  // leaving the random outcome with a visible ecological consequence.
  if (parasiteRoll) {
    if (parasiteCell) {
      freeEncnCell(parasiteCell, reservation.id);
      result.parasiteDiffed = diff.toParasite(
        "interaction-complete",
        host,
        now,
        parasiteCell
      );
    }
    if (!result.parasiteDiffed) {
      bstSprsPars();
      result.paraAmped = true;
    }
  }
  return result;
}

// Add one layer of parasitic branches after each completed focus,
// using the session count to limit the visual density of sustained feedback.
function growParsBrnc(now) {
  if (
    hunt.brnchGrowN >=
    capture.brnchGrowLmt
  ) {
    return false;
  }
  const growthIndex = hunt.brnchGrowN;
  for (const parasite of parasites) {
    parasite.growBscBrnc(growthIndex, true, now);
  }
  hunt.brnchGrowN++;
  return true;
}

// When no cells are available for differentiation, increase existing parasitic pressure so the failure
// path produces a visible, controlled ecological consequence.
function bstSprsPars() {
  const states = Array.isArray(sessions)
    ? sessions.map((session) => session.hunt)
    : [hunt];
  for (const state of new Set(states)) {
    state.parsAlphBst +=
      capture.scrcAlphGain;
    state.parasiteBoost +=
      capture.parsScrSizGai;
  }
}

// Post-focus BasicCell changes verify host state, then commit the species outcome through the
// differentiation entry point after validation.
function chngCelAftFcs(host, now) {
  growParsBrnc(now);
  const predatorDiffed = diff.toPredator(
    "interaction-complete",
    host,
    now,
    false
  );
  let parasiteDiffed = false;
  let paraAmped = false;
  if (encnRsd(host)) {
    parasiteDiffed = diff.toParasite(
      "interaction-complete",
      host,
      now
    );
    if (!parasiteDiffed) {
      bstSprsPars();
      paraAmped = true;
    }
  }
  host.attnLogSpnLif =
    predatorDiffed || parasiteDiffed;
  return predatorDiffed || parasiteDiffed || paraAmped;
}

// This function was modified with the assistance of ChatGPT.
function diffToPredator(
  reason,
  sourcePredator = null,
  now = typeof millis === "function" ? millis() : 0,
  allwRepl = true,
  targetCell = null
) {
  const creatureWorld = window.CreatureWorld;
  // A Predator may differentiate from an ordinary cell or replicate from an existing individual when
  // explicitly allowed; both paths share capacity checks.
  const timing = diff.timing(
    reason,
    eco.lifeType.predator
  );
  const beginCell = diffCellStrtr(targetCell, now);
  if (!creatureWorld?.add || !lifeCanAdmTyp(eco.lifeType.predator)) {
    return false;
  }

  const sourceCell =
    typeof beginCell === "function"
      ? beginCell(
          timing.durationMs,
          timing.colorMs,
          {
            body: Predator.bodyColor,
            core: Predator.coreColor,
            line: Predator.lineColor,
          },
          {
            body: Predator.bodyStyle.alpha,
            core: Predator.coreStyle.alpha,
            coreLine: Predator.coreStyle.lineAlpha,
            outline: Predator.bodyStyle.lineAlpha,
          }
        )
      : null;
  if (!sourceCell && !allwRepl) return false;
  // When no cells are available, enter the replication fallback;
  // calls without replication permission fail directly, preserving traceable individual provenance.
  const replicated = !sourceCell;
  const source = sourceCell || sourcePredator;
  if (!source) return false;

  const index = hunt.diffCount;
  const dfltBaitType =
    Predator.baitTypes[index % Predator.baitTypes.length];
  const baitType = replicated
    ? sourcePredator.baitType
    : dfltBaitType;
  let spawnX = source.x;
  let spawnY = source.y;
  // Spawn the replica outside the parent's contour and project it back within ecological bounds.
  if (replicated) {
    const angle =
      ((sourcePredator.seed || 0) * 0.0001 + index * 2.399) % TWO_PI;
    const offset = infoRadius(sourcePredator) + 24;
    const spawnPoint = ecoWorld.project(
      sourcePredator.x + cos(angle) * offset,
      sourcePredator.y + sin(angle) * offset,
      20
    );
    spawnX = spawnPoint.x;
    spawnY = spawnPoint.y;
  }

  const predator = new Predator(spawnX, spawnY, baitType);
  predator.y0 = spawnY - sin(predator.a) * predator.swimY;
  predator.y = spawnY;
  predator.startDiffBirth(
    sourceCell ? now + timing.colorMs : now,
    timing.birthMs
  );
  if (sourceCell) {
    holdLifeGlow(
      predator,
      predator.birthStartAt + predator.birthDuration
    );
  }
  // Replication inherits size and swims in the opposite direction;
  // cell differentiation applies standard size rules for the current lure type.
  if (replicated) {
    predator.sz = sourcePredator.sz;
    predator.dir = -(sourcePredator.dir || 1);
    predator.targetDir = predator.dir;
    predator.vx = predator.v * predator.dir;
  } else {
    predator.sz = sizes.Predator[index % sizes.Predator.length];
    predator.sz *= predCfg.baitSizeMul[predator.baitType] ?? 1;
  }
  // Advance counts and logs only after the world entry point confirms acceptance.
  const added = creatureWorld.add(predator, {
    group: "creature",
    origin: replicated
      ? "predator-self-replication"
      : "basic-cell-diff",
    reason,
  });
  if (!added) return false;
  if (replicated) hunt.replN++;
  hunt.diffCount++;
  if (!replicated) {
    recordLifeDiff(
      eco.lifeType.predator,
      now,
      sourceCell,
      timing
    );
  }
  return true;
}

// 5. Gaze settles on a lifeform and receives a response
// Coordinate gaze assistance, target locking, and session updates.
function isGuaCarAct() {
  return careProgExsts() || carePnlExsts();
}

// Active gaze requires enabled input, valid coordinates,
// and any interruption to remain within its grace period.
function isGazeActive(camera) {
  if (!camera) return false;
  if (
    camera.inputMode === gazeIxAssist.inputMode &&
    ixEngageState(camera) !== "gaze-engagement"
  ) {
    return false;
  }
  if (typeof camera.inputActive === "boolean") return camera.inputActive;
  return Boolean(
    camera.faceCount > 0 ||
      camera.pointerActive ||
      camera.isPointerMode
  );
}

const aim = Object.freeze({
  reset: resetAssist,
  getTarget: getAssstTgt,
  findCandidate: findAssstCand,
  apply: applyAim,
});

// Resetting assisted aim clears its target and radii while
// preserving the session and camera's raw input snapshot.
function resetAssist(session = activeSession) {
  if (!session?.aim) return;
  session.aim.target = null;
  session.aim.active = false;
  session.aim.rawGaze = null;
  session.aim.logicalGaze = null;
  session.aim.acqsPddng = 0;
  session.aim.acqsRad = 0;
  session.aim.holdRadius = 0;
}

function aimAcqPadding(entity, baseRadius) {
  if (entity?.type === eco.lifeType.predator) {
    return gazeIxAssist.predatorPad;
  }
  if (baseRadius <= gazeIxAssist.smallLifeRMax) {
    return gazeIxAssist.smallLifePad;
  }
  return gazeIxAssist.defaultPad;
}

// Convert visible size into acquisition and retention radii
// while preserving species-specific compensation rules.
function aimTargetData(entity) {
  if (!entity || !isVisible(entity) || !tgtRdyToSssn(entity)) {
    return null;
  }
  if (Number.isFinite(entity.birthProgress) && entity.birthProgress < 1) {
    return null;
  }
  const position = focusPos(entity);
  const radiusScale = ixGazeScale(entity.type);
  const baseRadius = infoRadius(entity) * radiusScale;
  if (!Number.isFinite(baseRadius) || baseRadius <= 0) return null;
  const acqsPddng = aimAcqPadding(entity, baseRadius);
  const acqsRad = baseRadius + acqsPddng;
  const spcHoldScl =
    entity.type === eco.lifeType.predator
      ? capture.tgtHoldScl
      : gazeIxAssist.dfltHoldScl;
  return {
    entity,
    position,
    baseRadius,
    acqsPddng,
    acqsRad,
    holdRadius: max(acqsRad, baseRadius * spcHoldScl),
  };
}

// Interaction order determines the current assisted target,
// allowing cursor attraction to follow the relationship as it unfolds.
function getAssstTgt(session) {
  const candidates = [
    session.deepFocus.target,
    session.deepFocus.candidate,
    session.careState.source,
    session.careState.candidate,
    session.roamLock.target,
    session.hunt.focused,
    ...session.parasites,
    session.aim.target,
  ];
  return candidates.find((entity) => aimTargetData(entity)) || null;
}

// Compare assisted candidates by distance normalized to hit radius,
// giving different body sizes consistent selection weight.
function findAssstCand(rawGaze) {
  let best = null;
  let bestScore = Infinity;
  const candidates = new Set([...creatures, ...parasites]);
  for (const entity of candidates) {
    const data = aimTargetData(entity);
    if (!data) continue;
    const distSq = dist2(
      rawGaze.x,
      rawGaze.y,
      data.position.x,
      data.position.y
    );
    if (distSq > data.acqsRad ** 2) continue;
    const score = distSq / max(1, data.acqsRad ** 2);
    if (score < bestScore) {
      best = data;
      bestScore = score;
    }
  }
  return best;
}

// Adjust logical gaze according to the current target and hit range,
// helping gaze remain on the lifeform.
// This function was modified with the assistance of ChatGPT.
function applyAim(camera) {
  const session = activeSession;
  if (
    !camera?.gaze ||
    camera.inputMode !== gazeIxAssist.inputMode ||
    !session?.aim
  ) {
    aim.reset(session);
    return camera;
  }

  const rawGaze = { x: camera.gaze.x, y: camera.gaze.y };
  let target = aim.getTarget(session);
  let data = aimTargetData(target);
  // A locked target uses a wider retention radius to
  // reduce repeated switching between adjacent lifeforms.
  if (data) {
    const distSq = dist2(
      rawGaze.x,
      rawGaze.y,
      data.position.x,
      data.position.y
    );
    if (distSq > data.holdRadius ** 2) {
      target = null;
      data = null;
    }
  }
  if (!data) {
    data = aim.findCandidate(rawGaze);
    target = data?.entity || null;
  }
  if (!data || !target) {
    aim.reset(session);
    session.aim.rawGaze = rawGaze;
    session.aim.logicalGaze = { ...rawGaze };
    return camera;
  }

  const dx = rawGaze.x - data.position.x;
  const dy = rawGaze.y - data.position.y;
  const distance = sqrt(dx * dx + dy * dy);
  const logicalRadius = data.baseRadius * gazeIxAssist.lgclRadScl;
  // Pull the assisted point inside the lifeform's logical radius
  // while preserving the participant's approach direction.
  const logicalGaze = distance <= logicalRadius
    ? rawGaze
    : {
        x: data.position.x + (dx / max(0.001, distance)) * logicalRadius,
        y: data.position.y + (dy / max(0.001, distance)) * logicalRadius,
      };
  // Raw gaze serves feedback and diagnostics; logical gaze feeds hit rules,
  // and the two are stored in separate fields.
  session.aim.target = target;
  session.aim.active = true;
  session.aim.rawGaze = rawGaze;
  session.aim.logicalGaze = logicalGaze;
  session.aim.acqsPddng = data.acqsPddng;
  session.aim.acqsRad = data.acqsRad;
  session.aim.holdRadius = data.holdRadius;
  return { ...camera, gaze: logicalGaze, rawGaze };
}

// Activity evaluation reads each species' actual feedback phase.
function isEncounterActive(entity) {
  if (!entity) return false;
  if (entity.type === eco.lifeType.predator) {
    return Boolean(
      entity.cptrProg > 0 ||
        entity.captureFxAlpha > 0 ||
        entity.pathTextAlpha > 0
    );
  }
  if (entity.type === eco.lifeType.parasite) {
    return Boolean(entity.attnFcsd);
  }
  if (entity.type === eco.lifeType.roamer) {
    return Boolean(entity.isIxActv?.());
  }
  if (entity.type === eco.lifeType.deepDiver) {
    return sessions.some(
      (session) =>
        session.deepFocus.target === entity &&
        session.deepFocus.phase !== "idle"
    );
  }
  if (entity.type === eco.lifeType.guardian) {
    return sessions.some((session) => {
      const state = session.careState;
      return (
        (state.phase !== "idle" ||
          state.collabStatus === "offered") &&
        (state.source === entity || state.participants.includes(entity))
      );
    });
  }
  return false;
}

// Rebuild session target sets from each species' activity state.
function desiredTargets(session) {
  return new Set(
    [
      session.hunt.focused,
      ...session.parasites,
      session.roamLock.target,
      session.deepFocus.candidate,
      session.deepFocus.target,
      session.careState.candidate,
      session.careState.source,
      ...session.careState.participants,
      session.careState.careTarget,
      session.careState.shieldTarget,
      ...session.careState.limitLinks.map((link) => link.target),
      ...session.careState.shields.flatMap((approach) => [
        approach.guardian,
        approach.target,
      ]),
      ...session.careState.parents,
      ...session.careState.newborns,
    ].filter(Boolean)
  );
}

// Update target locks by set difference so ended relationships release
// promptly and new relationships gain ownership in the same frame.
function syncTgtLcks(session) {
  const desired = desiredTargets(session);
  for (const entity of session.lockedTargets) {
    if (!desired.has(entity) && !isEncounterActive(entity)) {
      freeIxTgt(entity, session);
      session.lockedTargets.delete(entity);
    }
  }
  for (const entity of desired) {
    if (lockIxTarget(entity, session)) {
      session.lockedTargets.add(entity);
    }
  }
}

function rcrdPrdtIntnt(
  entity,
  session,
  focused,
  lurePoint,
  ignoresLure,
  lureInfluence,
  lureTurnRate,
  frameMs
) {
  // Merge multiple participants' intentions toward the same Predator into one record;
  // body focus takes priority, while the lure accepts the first valid source.
  if (!frameIntent) return;
  let intent = frameIntent.predators.get(entity);
  if (!intent) {
    intent = {
      focused: false,
      session: null,
      lurePoint: null,
      ignoresLure: false,
      lureInfluence: 1,
      lureTurnRate: capture.lureTurnRate,
      frameMs: null,
    };
    frameIntent.predators.set(entity, intent);
  }
  if (focused) {
    intent.focused = true;
    intent.session = session;
    intent.ignoresLure = ignoresLure;
    intent.frameMs = frameMs;
  }
  if (lurePoint && !intent.lurePoint) {
    intent.lurePoint = lurePoint;
    intent.session ||= session;
    intent.lureInfluence = lureInfluence;
    intent.lureTurnRate = lureTurnRate;
  }
}

// 6. Multiple participants' intentions meet within the same frame
// Collect intentions from each session before updating shared
// Parasites and Predators, then restore the default session binding.
function applyFrmIntnt(now, frameMs) {
  const intents = frameIntent;
  if (!intents) return;
  for (const parasite of parasites) {
    const fcsdSess = sessions.filter(
      (session) => session.enabled && session.parasites.has(parasite)
    );
    const focused = fcsdSess.length > 0;
    // When a Parasite is attended to but all related sessions are paused,
    // set its advancement time for this frame to zero.
    const parsFrmMs =
      focused && fcsdSess.every((session) => session.progressPaused)
        ? 0
        : frameMs;
    behaviorByType[eco.lifeType.parasite].updateInteraction({
      entity: parasite,
      focused,
      frameMs: parsFrmMs,
    });
  }
  for (const entity of creatures) {
    if (entity.type !== eco.lifeType.predator) continue;
    const intent = intents.predators.get(entity);
    // Apply the merged result once to each Predator.
    const owner = intent?.session || sessions[0];
    bindIxSession(owner);
    behaviorByType[eco.lifeType.predator].updateInteraction({
      entity,
      focused: Boolean(intent?.focused),
      now,
      frameMs: intent?.frameMs ?? frameMs,
      lurePoint: intent?.lurePoint || null,
      ignoresLure: Boolean(intent?.focused && intent?.ignoresLure),
      lureInfluence: intent?.lureInfluence ?? 1,
      lureTurnRate: intent?.lureTurnRate ?? capture.lureTurnRate,
    });
  }
  bindIxSession(sessions[0]);
}

// Retain the highest-priority active target while input is paused.
function pausedIxTarget(session) {
  return (
    session.hunt.focused ||
    [...session.parasites][0] ||
    session.deepFocus.target ||
    session.deepFocus.candidate ||
    session.roamLock.target ||
    session.careState.source ||
    null
  );
}

// Clear the block after valid gaze leaves the retention range;
// also clear it when the target departs or becomes invisible.
function updSssnRrmGate(session) {
  const target = session?.rrmBlckdTgt;
  if (!target) return false;
  const stillPresent =
    creatures.includes(target) || parasites.includes(target);
  if (!stillPresent || !isVisible(target)) {
    session.rrmBlckdTgt = null;
    session.breakRsn = null;
    return true;
  }
  const camera = session.camera;
  if (!camera?.inputActive || !camera.gaze) return false;
  const position = focusPos(target);
  const holdRadius =
    infoRadius(target) * gazeIxAssist.dfltHoldScl +
    gazeIxAssist.defaultPad;
  if (
    dist2(camera.gaze.x, camera.gaze.y, position.x, position.y) <=
    holdRadius * holdRadius
  ) {
    return false;
  }
  session.rrmBlckdTgt = null;
  session.breakRsn = null;
  return true;
}

// I provide an interruption path for longer eye closure,
// allowing pause itself to become a mode of participation.
function intrOnBlnk(session, now) {
  bindIxSession(session);
  const target = pausedIxTarget(session);
// Release related locks after a capture relationship ends
// so participant and Predator can enter the next encounter.
  const predator = hunt.focused || session.fcsdPrdt6y;
  if (predator) {
    predator.gazeDwellMs = 0;
    predator.lastGazeAt = now - capture.leaveDelayMs;
  }
  hunt.focused = null;
  hunt.attracted = [];
  session.fcsdPrdt6y = null;
  session.lures = [];
  session.parasites.clear();

  // Roamer preserves rollback feedback and clears its division-ready state.
  const roamer = roamLock.target ||
    (target?.type === eco.lifeType.roamer ? target : null);
  if (roamer) {
    if (roamer.attnOn) roamer.cmmtAttnSld?.();
    roamer.attnOn = false;
    roamer.attnDwellMs = 0;
    roamer.splitArmed = false;
    if (roamer.splitFocusMs > 0) {
      roamer.spltBreakMs = roamCfg.ixLvGrcMs;
    }
  }
  roamLock.target = null;
  roamLock.leaveMs = 0;

  // A Deep Diver candidate enters the exit queue;
  // its Behavior cancels and resolves any focus already underway.
  if (deepFocus.candidate) {
    queueDeepExit(
      deepFocus.candidate,
      deepFocus.candFocusMs,
      capture.leaveDelayMs
    );
    deepFocus.candidate = null;
    deepFocus.candOnMs = 0;
    deepFocus.candFocusMs = 0;
    deepFocus.candBreakMs = 0;
  }
  if (
    deepFocus.target &&
    deepFocus.phase !== "idle" &&
    deepFocus.phase !== "canceling"
  ) {
    cnclDeepFcs();
  }

  // A Guardian candidate retains its decaying arc; collaboration invitations
  // and formal care use reset or cancellation paths respectively.
  if (care.state.candidate && care.state.focusMs > 0) {
    care.queueReceding(
      care.state.candidate,
      care.state.focusMs,
      capture.leaveDelayMs
    );
  }
  care.state.candidate = null;
  care.state.candLvMs = 0;
  care.state.activationMs = 0;
  care.state.focusMs = 0;
  if (care.state.collabStatus === "offered") {
    behaviorByType[eco.lifeType.guardian].resetInteraction();
  } else if (
    care.state.phase !== "idle" &&
    !care.state.canceling
  ) {
    bgnCarGazCnc();
  }

  session.aim.target = null;
  session.aim.active = false;
  // Record the blocked target for rearming; after reopening the eyes,
  // leave the original target and approach again to enable the next trigger.
  session.breakRsn = "long-eye-close";
  session.rrmBlckdTgt = target || null;
  if (target) {
    freeIxTgt(target, session);
    session.lockedTargets.delete(target);
  }
  return target;
}

function updtIxSess(now) {
  // Create the shared intention container at the start of each frame; sessions write intentions,
  // and shared Predator state is modified together during commit.
  const frameMs = clamp(Number(deltaTime) || 16.666, 0, 80);
  frameIntent = { predators: new Map() };
  for (const session of sessions) {
    if (!session.enabled) continue;
    bindIxSession(session);
    updSssnRrmGate(session);
    const closureSequence = longEyeCloSeq(session.camera);
    if (closureSequence > session.lastCloseSeq) {
      session.lastCloseSeq = closureSequence;
      intrOnBlnk(session, now);
    }
    const blnkCont = Boolean(
      ixBlinkFlow(session.camera) && session.lastEnggdCmr
    );
    // During a blink or pause, reuse the last valid input to retain the target;
    // progressPaused determines whether interaction time pauses for this frame.
    const holdingInput = Boolean(
      (session.progressPaused || blnkCont) && session.lastEnggdCmr
    );
    const heldCamera = holdingInput
      ? session.lastEnggdCmr || session.camera
      : session.camera;
    const heldTarget = holdingInput
      ? pausedIxTarget(session)
      : null;
    const heldTgtPos = heldTarget ? focusPos(heldTarget) : null;
    const progressCamera = holdingInput && heldCamera
      ? {
          ...heldCamera,
          gaze: heldTgtPos
            ? { ...heldTgtPos }
            : { ...heldCamera.gaze },
          inputActive: true,
          engagementState: "gaze-engagement",
          eyes: heldCamera.eyes
            ? {
                ...heldCamera.eyes,
                engagementState: "gaze-engagement",
              }
            : null,
        }
      : heldCamera;
    updateHunt(now, {
      camera: progressCamera,
      frameMs: session.progressPaused ? 0 : frameMs,
    });
    syncTgtLcks(session);
    session.lastUpdatedAt = now;
  }
  // Publish assisted aim after session updates complete
  // so the interface reads the frame's final intention.
  for (const session of sessions) {
    window.GazeApp?.setIxVisAssist?.(
      session.id,
      session.enabled ? session.aim : null
    );
  }
  applyFrmIntnt(now, frameMs);
  frameIntent = null;
  updPrdtDomn();
  bindIxSession(sessions[0]);
}

// Roamer, Deep Diver, and Guardian lures advance when their species is interactive and has a controller,
// then recover under species-specific rules after focus is lost.
function updtOthrLure(intnSpc, hasController, frameMs) {
  const focusType =
    hasController &&
    intnSpc &&
    intnSpc !== eco.lifeType.predator
      ? intnSpc
      : null;
  if (hunt.otherLureType !== focusType) {
    hunt.otherLureType = focusType;
    hunt.othrSpcLurFcsM = 0;
  }
  if (!focusType) return false;
  hunt.othrSpcLurFcsM = min(
    capture.othrSpcLurDlyM,
    hunt.othrSpcLurFcsM + max(0, frameMs)
  );
  return (
    hunt.othrSpcLurFcsM >=
    capture.othrSpcLurDlyM
  );
}

// Roamer, Deep Diver, and Guardian lures return normalized
// weights according to species and encounter phase.
function othrTypLurPrf(type, drngEncn = false) {
  let smplInfl = null;
  switch (type) {
    case eco.lifeType.roamer:
      smplInfl = capture.roamerLure;
      break;
    case eco.lifeType.guardian:
      smplInfl = capture.guardLure;
      break;
    case eco.lifeType.deepDiver:
      smplInfl = capture.deepLure;
      break;
    case eco.lifeType.parasite:
      smplInfl = capture.parasiteLure;
      break;
    default:
      return null;
  }
  return {
    influence:
      smplInfl *
      (drngEncn ? capture.encnLureScl : 1),
    turnRate: drngEncn
      ? capture.encnTurnRate
      : capture.othrSmpTurRat,
  };
}

// 7. Ordering this frame's relationships along one participant's attention
// Predator capture and gaze responses from other lifeforms
// Time domains: now serves cross-frame thresholds and logging; after clamping,
// frameMs is the interaction time available to advance this frame.
// This function was modified with the assistance of ChatGPT.
function updateHunt(now, updateOptions = null) {
  // 1. Read the current participant's input and determine the directly gazed-at target.
  const sourceCamera =
    updateOptions?.camera || ixCamSnapshot();
  const hasController = isGazeActive(sourceCamera);
  const camera = hasController
    ? aim.apply(sourceCamera)
    : sourceCamera;
  if (!hasController) aim.reset();
  const frameMs = Number.isFinite(updateOptions?.frameMs)
    ? clamp(updateOptions.frameMs, 0, 80)
    : clamp(Number(deltaTime) || 16.666, 0, 80);
  activeSession.parasites.clear();
  const directFocus = hasController
    ? findTarget(camera.gaze.x, camera.gaze.y)[0] || null
    : null;
  if (isEncnLife(directFocus?.entity)) {
    entrOvrlAttn(
      directFocus.entity,
      activeSession,
      now
    );
  } else {
    activeSession.lifeAttnTgt = null;
  }
  // 2. Give active interactions priority over new target
  // hits so each gaze process has a clear beginning and end.
  const exstSpc = (() => {
    if (deepFocus.phase !== "idle") return eco.lifeType.deepDiver;
    if (
      care.state.phase !== "idle" ||
      isGuaCarAct()
    ) {
      return eco.lifeType.guardian;
    }
    if (
      roamLock.target?.isIxActv?.() ||
      (ixUserCount <= 1 &&
        creatures.some(
          (entity) =>
            entity.type === eco.lifeType.roamer &&
            entity.isIxActv?.()
        ))
    ) {
      return eco.lifeType.roamer;
    }
    const ownedPredator = [...activeSession.lockedTargets].find(
      (entity) =>
        entity.type === eco.lifeType.predator &&
        isEncounterActive(entity)
    );
    if (ownedPredator) return eco.lifeType.predator;
    const ownedParasite = [...activeSession.lockedTargets].find(
      (entity) =>
        entity.type === eco.lifeType.parasite &&
        isEncounterActive(entity)
    );
    return ownedParasite ? eco.lifeType.parasite : null;
  })();
  // When no interaction is active, select a new species from a direct hit or Guardian intention.
  const guardianIntent =
    !exstSpc && !directFocus && hasController
      ? care.findAttnTgt(
          camera.gaze,
          activeSession,
          true
        )
      : null;
  const intnSpc =
    exstSpc ||
    directFocus?.entity?.type ||
    guardianIntent?.type ||
    null;
  const isOthrLureRdy = updtOthrLure(
    intnSpc,
    hasController,
    frameMs
  );
  const activeTypes = getActLifTyp(
    activeSession
  );
  const isRoamerLured = Boolean(
    hunt.otherLureType === eco.lifeType.roamer &&
      (roamLock.target?.splitFocusMs > 0 ||
        roamLock.target?.splitArmed ||
        (ixUserCount <= 1 &&
          creatures.some(
            (entity) =>
              entity.type === eco.lifeType.roamer &&
              !entity.splitComplete &&
              (entity.splitFocusMs > 0 || entity.splitArmed)
          )))
  );
  // Lure state treats established Roamer division and Guardian care as active.
  const othrLureActv = Boolean(
    isRoamerLured ||
      activeTypes.has(hunt.otherLureType) ||
      (hunt.otherLureType === eco.lifeType.guardian &&
        isGuaCarAct())
  );
  const actvLurePrfl = isOthrLureRdy
    ? othrTypLurPrf(
        hunt.otherLureType,
        othrLureActv
      )
    : null;
  const grdInvtWait =
    careInttWtng();
  // Pause other species interactions while a collaboration invitation awaits a response.
  const speciesAllowed = (type) =>
    grdInvtWait
      ? type === eco.lifeType.guardian
      : ixUserCount <= 1 ||
        activeTypes.size > 0 ||
        intnSpc === type;
  const drctFcsEntty = directFocus?.entity || null;
  const isFocusOnLure = Boolean(
    drctFcsEntty?.type === eco.lifeType.predator &&
      (hunt.attracted.includes(drctFcsEntty) ||
        activeSession.lures.includes(
          drctFcsEntty
        ) ||
        drctFcsEntty.lureActive)
  );
  // 3. Update mind-wandering, sustained attention, protection, and residue state by species.
  updtRmrAttn(
    camera,
    hasController && speciesAllowed(eco.lifeType.roamer),
    frameMs
  );
  updtDeeDvrAtt(
    camera,
    hasController && speciesAllowed(eco.lifeType.deepDiver),
    frameMs
  );
  updtGrdAttn(
    camera,
    hasController && speciesAllowed(eco.lifeType.guardian),
    frameMs,
    {
      contActv: hasController,
      drctFcsType: drctFcsEntty?.type || null,
      drctFcsEntty,
      isFocusOnLure,
      intnSpc,
    }
  );
  if (activeSession.id === 0) care.updtSeedRegr(now);
  behaviorByType[eco.lifeType.deepDiver].updateInteraction({
    camera,
    hasController:
      hasController && speciesAllowed(eco.lifeType.deepDiver),
    frameMs,
  });
  updtParsAttn(
    camera,
    hasController && speciesAllowed(eco.lifeType.parasite),
    frameMs
  );
  // Aggregate other species' claims on the current gaze.
  const gazeOccupied = Boolean(
    deepFocus.target ||
      (directFocus &&
        directFocus.entity.type !== eco.lifeType.predator)
  );
  const guardCareOn =
    speciesAllowed(eco.lifeType.guardian) &&
    isGuaCarAct();
  hunt.prdtBlcByCar = guardCareOn;
  // 4. Predators use gaze not currently claimed by focus, mind-wandering, or care.
  const fcsdPrdt6y =
    hasController &&
      speciesAllowed(eco.lifeType.predator) &&
      !gazeOccupied &&
      !guardCareOn
    ? findPredator(
        camera.gaze.x,
        camera.gaze.y,
        hunt.focused
      )
    : null;
  const fcsdIgnrsLure =
    prdtIgnrsLure(fcsdPrdt6y);
  const lures = hasController
    ? findPlldPrdt(
        sourceCamera.gaze.x,
        sourceCamera.gaze.y,
        hunt.attracted,
        fcsdIgnrsLure ? null : fcsdPrdt6y,
        fcsdIgnrsLure ? fcsdPrdt6y : null
      )
    : [];
  hunt.focused = fcsdPrdt6y;
  hunt.attracted = lures;
  activeSession.fcsdPrdt6y = fcsdPrdt6y;
  activeSession.lures = lures;
  hunt.lureInfluence = actvLurePrfl?.influence ?? 1;
  hunt.lureTurnRate =
    actvLurePrfl?.turnRate ?? capture.lureTurnRate;
  hunt.othrLureActv = Boolean(
    actvLurePrfl && othrLureActv
  );
  const luredSet = new Set(lures);
  // 5. Aggregate or directly apply this frame's gaze and lure state for each Predator.
  for (const entity of creatures) {
    if (entity.type !== eco.lifeType.predator) continue;
    const focused = entity === fcsdPrdt6y;
    if (frameIntent) {
      rcrdPrdtIntnt(
        entity,
        activeSession,
        focused,
        luredSet.has(entity) ? sourceCamera.gaze : null,
        focused && prdtIgnrsLure(entity),
        hunt.lureInfluence,
        hunt.lureTurnRate,
        frameMs
      );
    } else {
      behaviorByType[eco.lifeType.predator].updateInteraction({
        entity,
        focused,
        now,
        frameMs,
        lurePoint: luredSet.has(entity) ? sourceCamera.gaze : null,
        ignoresLure: focused && prdtIgnrsLure(entity),
        lureInfluence: hunt.lureInfluence,
        lureTurnRate: hunt.lureTurnRate,
      });
    }
  }
  // 6. Trigger new Predator differentiation after sustained capture reaches its threshold.
  if (fcsdPrdt6y) {
    hunt.prdtFcsMs += frameMs;
    while (hunt.prdtFcsMs >= capture.diffFocusMs) {
      hunt.prdtFcsMs -= capture.diffFocusMs;
      diff.toPredator(
        "gaze-threshold",
        fcsdPrdt6y,
        now
      );
    }
  }
  const intrCand = gazeOccupied
    ? directFocus?.entity || null
    : fcsdPrdt6y;
  if (intrCand !== hunt.intrCand) {
    hunt.intrCand = intrCand;
    hunt.intrCandSnc = now;
  }
  const intrEntty =
    intrCand &&
    now - hunt.intrCandSnc >=
      capture.pathIntCnfMs
      ? intrCand
      : null;
  if (intrEntty) {
    for (const entity of creatures) {
      if (
        entity.type === eco.lifeType.predator &&
        entity !== intrEntty
      ) {
        entity.suppLostPths(now);
      }
    }
  }
  if (!frameIntent) updPrdtDomn();
}

function updtGrdAttn(
  camera,
  hasController,
  frameMs,
  ixCntxt = null
) {
  // Update each Guardian's own feedback individually, then advance
  // the care state machine once after all individuals complete.
  const guardians = groups[eco.lifeType.guardian] || [];
  const gaze = camera?.gaze;
  const guardFrmMs = clamp(
    Number(frameMs) || 0,
    0,
    driftCfg.frameMsMax
  );
  const closest = hasController
    ? care.findAttnTgt(gaze, activeSession, true)
    : null;

  for (const guardian of guardians) {
    if (!tgtRdyToSssn(guardian)) continue;
    const nearby = guardian === closest;
    // A relationship already in transit retains its original target.
    const lockedTarget = guardian.attnTgts.find(
      (entity) =>
        (entity.type === eco.lifeType.predator &&
          (groups[eco.lifeType.predator] || []).includes(entity)) ||
        (entity.type === eco.lifeType.parasite && parasites.includes(entity))
    );
    const journeyLocked =
      guardian.attnPhase === "traveling";
    const targets = lockedTarget
      ? [lockedTarget]
      : nearby || journeyLocked
        ? care.getAttrTrgts(guardian)
        : [];
    guardian.updtAttnFb(nearby, guardFrmMs, targets);
    guardian.updateAttnDir();
    guardian.updtDrfPluVsl(guardFrmMs);
  }
  behaviorByType[eco.lifeType.guardian].updateInteraction({
    guardians,
    closest,
    gaze,
    hasController,
    frameMs: guardFrmMs,
    interactionContext: ixCntxt,
  });
}

function getEncnStts() {
  // Predator and Roamer activity is stored on entities, so scan the shared lifeform collections first.
  let predator = false;
  let roamer = false;
  for (const entity of creatures) {
    if (entity.type === eco.lifeType.predator) {
      predator ||= Boolean(
        entity.cptrProg > 0 ||
        entity.captureFxAlpha > 0 ||
        entity.pathTextAlpha > 0
      );
    } else if (entity.type === eco.lifeType.roamer) {
      roamer ||= Boolean(entity.isIxActv?.());
    }
    if (predator && roamer) break;
  }
  const parasite = parasites.some(
    (entity) => entity.attnFcsd
  );
  let deepDiver = false;
  let guardian = false;
  // Deep Diver and Guardian activity belongs to session
  // state and must be aggregated across enabled participants.
  for (const session of sessions) {
    if (!session.enabled) continue;
    deepDiver ||= session.deepFocus.phase !== "idle";
    guardian ||= session.careState.phase !== "idle";
    if (deepDiver && guardian) break;
  }
  const species = {
    [eco.lifeType.predator]: predator,
    [eco.lifeType.parasite]: parasite,
    [eco.lifeType.roamer]: roamer,
    [eco.lifeType.deepDiver]: deepDiver,
    [eco.lifeType.guardian]: guardian,
  };
  // Expose activity from other species separately so environmental pressure and rendering layers can
  // decide whether to reduce Predator weight.
  const prdsBlwOthrs =
    parasite || roamer || deepDiver || guardian;
  return {
    active: predator || prdsBlwOthrs,
    species,
    prdsBlwOthrs,
  };
}

const interactionCalibration = Object.freeze({
  obstacles: () => sessions.map((session) => session.calibObst85()),
});
const interactionEncounter = Object.freeze({
  isActive: () => getEncnStts().active,
});
const interactionLifeMechanism = Object.freeze({
  // Target cells may be replenished; other birth outcomes must obey the ecology's hard population limit.
  canSpwnBscCell(kind = "target") {
    return (
      kind === "target" ||
      encnPopStt() !== "hard-limit"
    );
  },
  isIxPrtc: isLifeIxSafe,
  // On ordinary cell death, ecological probability selects a
  // deterministic outcome between fading and parasitic transformation.
  deathOutcome(entity) {
    return lifeMorphRoll(entity) ? "transform" : "fade";
  },
  // Parasitic birth completes through the world queue;
  // the world commit phase modifies the Parasite collection.
  spwnDthPars(source, now = lifeClockNow()) {
    return spawnResidue(source, now);
  },
  // Expose the current life-time multiplier while keeping mutable clock state inside the world system.
  lifeRate() {
    return lifeClock.rate;
  },
  extendPredator: extndPrdtLife,
});

// 8. Participant sessions and ecological interactions return to the main loop
// Public entry points are grouped by session, calibration, encounter, and lifecycle mechanisms;
// sessions returns the live array for callers to read by contract.
window.InteractionSystem = Object.freeze({
  get sessions() {
    return sessions;
  },
  bindSession: bindIxSession,
  syncSessions: syncIxSessions,
  updateSessions: updtIxSess,
  encounterStatus: getEncnStts,
  flushWorldQueue: flshWrldQ,
  behaviors: behaviorByType,
  calibration: interactionCalibration,
  encounter: interactionEncounter,
  lifeMechanism: interactionLifeMechanism,
});
