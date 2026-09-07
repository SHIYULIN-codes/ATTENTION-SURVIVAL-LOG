// File Overview
// Connects each browser instance to the project's shared ecology while keeping
// camera, gaze, and calibration data local.

(() => {
  "use strict";

// Different connected instances affect one another through ecological changes;
// I want this connection to become part of shared care as well.
// Species counts, ecological influence, event versions,
// and the number of participants present are shared;
// gaze paths and calibration states remain local.
// deviceId supports anonymous connection, deduplication, and retransmission,
// allowing devices to recognize one another while preserving participants' privacy boundaries.
// The shared world reconciles the aggregated ecology, while each
// lifeform's specific experience continues to belong to its local world.
  const rules = window.SharedRules || window.SharedEcologyRules;
  if (!rules) return;

  const params = window.AppContext.params;
  const appMode = window.AppContext.mode;
  const disabledByMode =
    appMode.visualTest ||
    appMode.performanceTest ||
    appMode.interactionTest ||
    appMode.ecosystemStoreTest;
  const explicitlyEnabled = params.get("shared") === "1";
  const hostedPage = window.location.protocol === "https:";
  const enabled =
    !disabledByMode &&
    params.get("shared") !== "0" &&
    (explicitlyEnabled || hostedPage);
  const storageKey = "attention-ecology-shared-client-v1";
  const queueMaximum = 250;
  const state = {
    enabled,
    status: enabled ? "idle" : "disabled",
    deviceId: null,
    socket: null,
    adapter: null,
    reconnectTimer: null,
    reconnectAttempt: 0,
    sampleTimer: null,
    heartbeatTimer: null,
    hasWorld: false,
    applyingWorld: false,
    lastObservedCounts: null,
    world: null,
    queue: [],
    inflight: new Set(),
    lastConnectedAt: null,
    lastMessageAt: null,
    error: null,
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function setStatus(status) {
    state.status = status;
  }

  // Devices and events use random anonymous identifiers; the device identifier persists across runs and
  // is generated independently of participant images and gaze data.
  function makeId(prefix) {
    const randomId = window.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${randomId}`;
  }

  // Restore the stable device identity and contributions awaiting acknowledgement.
  function readStoredState() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      state.deviceId =
        typeof stored?.deviceId === "string" && stored.deviceId
          ? stored.deviceId
          : makeId("device");
      state.queue = Array.isArray(stored?.queue)
        ? stored.queue.slice(-queueMaximum)
        : [];
    } catch {
      state.deviceId = makeId("device");
      state.queue = [];
    }
    persistState();
  }

  // Persist the device identifier and bounded offline queue.
  function persistState() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ deviceId: state.deviceId, queue: state.queue })
      );
    } catch {}
  }

  // Read the synchronization address from page parameters first;
  // when no external address is provided, use the current origin.
  function baseUrl() {
    const configured = params.get("sync") || "";
    return configured ? configured.replace(/\/$/, "") : window.location.origin;
  }

  // Derive a same-origin WebSocket address from the current API address.
  function websocketUrl() {
    const url = new URL(baseUrl() || window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  // The local present-participant count is constrained by the sharing rules;
  // invalid or empty input is treated as zero.
  function presentCount() {
    return Math.max(
      0,
      Math.min(
        rules.maximumParticipants,
        Math.round(Number(state.adapter?.getPresentCount?.()) || 0)
      )
    );
  }

  function localCounts() {
    return rules.normalizeCounts(state.adapter?.getSpeciesCounts?.());
  }

  function bootstrapInfluence() {
    return rules.normalizeInfluence(state.adapter?.getBootstrapInfluence?.());
  }

  // Return false while the connection is not open; the queue retains events awaiting transmission.
  function send(message) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return false;
    state.socket.send(JSON.stringify(message));
    return true;
  }

// Local changes enter the outgoing queue before persistence and upload are attempted.
  function enqueueContribution(payload, eventType = "ecology.change") {
    if (!state.enabled || !state.adapter || !state.deviceId) return false;
    const countDelta = Object.fromEntries(
      rules.species.map((type) => [type, Math.round(Number(payload.countDelta?.[type]) || 0)])
    );
    const influenceDelta = Object.fromEntries(
      rules.species.map((type) => [
        type,
        Math.max(0, Number(payload.influenceDelta?.[type]) || 0),
      ])
    );
    const hasChange = rules.species.some(
      (type) => countDelta[type] !== 0 || influenceDelta[type] > 0
    );
    if (!hasChange) return false;
    // Uploads contain species deltas, ecological influence, and the present-participant count;
    // local targets and gaze coordinates remain on the device.
    state.queue.push({
      type: "contribution",
      eventId: makeId("event"),
      deviceId: state.deviceId,
      eventType,
      presentCount: presentCount(),
      payload: { countDelta, influenceDelta },
    });
    if (state.queue.length > queueMaximum) {
      // When the queue exceeds its limit, remove the oldest events and retain newer unsent changes.
      state.queue.splice(0, state.queue.length - queueMaximum);
    }
    persistState();
    flushQueue();
    return true;
  }

  // Send a semantic ecological event without messages, gaze coordinates,
  // calibration values, or other participant-level detail.
  function recordLogEvent(event = {}) {
    if (!state.enabled || !state.adapter || !state.deviceId) return false;
    const eventType = String(event.eventType || "ecology.change")
      .replace(/[^a-zA-Z0-9._:-]+/g, "-")
      .slice(0, 80);
    const primarySpecies = window.EcologyConstants.normalizeLifeType(
      event.primarySpecies
    );
    state.queue.push({
      type: "log-event",
      eventId: makeId("log"),
      deviceId: state.deviceId,
      eventType,
      primarySpecies,
      presentCount: presentCount(),
    });
    if (state.queue.length > queueMaximum) {
      state.queue.splice(0, state.queue.length - queueMaximum);
    }
    persistState();
    flushQueue();
    return true;
  }

  // Once the world snapshot arrives and the connection is available, send contributions in order.
  function flushQueue() {
    if (!state.hasWorld || state.socket?.readyState !== WebSocket.OPEN) return;
    for (const event of state.queue) {
      if (state.inflight.has(event.eventId)) continue;
      if (!send(event)) break;
      state.inflight.add(event.eventId);
    }
  }

  // After server acknowledgement, remove both the in-flight
  // marker and the item from the persistent queue.
  function acknowledge(eventId) {
    state.inflight.delete(eventId);
    const index = state.queue.findIndex((event) => event.eventId === eventId);
    if (index >= 0) state.queue.splice(index, 1);
    persistState();
  }

  // Accept server state whose version is greater than or equal to the local version.
  function applyWorld(world) {
    if (!world || !Number.isFinite(Number(world.revision))) return;
    if (state.world && Number(world.revision) < Number(state.world.revision)) return;
    state.world = {
      ...world,
      speciesCounts: rules.normalizeCounts(world.speciesCounts),
      ecologyInfluence: rules.normalizeInfluence(world.ecologyInfluence),
    };
    state.hasWorld = true;
    state.lastMessageAt = Date.now();
    state.applyingWorld = true;
    try {
      // Pause local sampling while applying the remote world.
      state.adapter?.applyWorld?.(clone(state.world));
    } finally {
      state.applyingWorld = false;
    }
    state.lastObservedCounts = localCounts();
    flushQueue();
  }

  // Periodically compare local species counts and upload aggregate deltas; individual positions,
  // identities, and interaction details remain local.
  function sampleLocalChanges() {
    if (!state.adapter || state.applyingWorld) return;
    const current = localCounts();
    if (!state.lastObservedCounts) {
      state.lastObservedCounts = current;
      return;
    }
    const countDelta = {};
    for (const type of rules.species) {
      countDelta[type] = current[type] - state.lastObservedCounts[type];
    }
    state.lastObservedCounts = current;
    enqueueContribution({ countDelta }, "population.change");
  }

// Reconnect after disconnection and retrieve the server's world state.
  function scheduleReconnect() {
    if (!state.enabled || state.reconnectTimer != null) return;
    setStatus("reconnecting");
    const delay = Math.min(30000, 1000 * 2 ** Math.min(5, state.reconnectAttempt));
    state.reconnectAttempt++;
    state.reconnectTimer = window.setTimeout(() => {
      state.reconnectTimer = null;
      connect();
    }, delay);
  }

  function handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    state.lastMessageAt = Date.now();
    if (message.type === "world") {
      applyWorld(message.world);
    } else if (message.type === "authority" && state.world) {
      state.world.authority = message.authority || {};
    } else if (message.type === "contribution.ack") {
      acknowledge(message.eventId);
    } else if (message.type === "error") {
      state.error = message.message || "server-error";
    }
  }

  // Establish a shared connection and bind handlers for world state, acknowledgements, and reconnection.
  // This function was modified with the assistance of ChatGPT.
  function connect() {
    if (!state.enabled || !state.adapter) return false;
    if (
      state.socket &&
      (state.socket.readyState === WebSocket.OPEN ||
        state.socket.readyState === WebSocket.CONNECTING)
    ) {
      return true;
    }
    setStatus("connecting");
    state.hasWorld = false;
    state.inflight.clear();
    try {
      const socket = new WebSocket(websocketUrl());
      state.socket = socket;
      socket.addEventListener("open", () => {
        if (state.socket !== socket) return;
        setStatus("connected");
        state.reconnectAttempt = 0;
        state.lastConnectedAt = Date.now();
        state.error = null;
        send({
          type: "hello",
          deviceId: state.deviceId,
          presentCount: presentCount(),
          bootstrap: {
            speciesCounts: localCounts(),
            ecologyInfluence: bootstrapInfluence(),
          },
        });
      });
      socket.addEventListener("message", handleMessage);
      socket.addEventListener("close", () => {
        if (state.socket !== socket) return;
        setStatus("offline");
        state.socket = null;
        state.hasWorld = false;
        state.inflight.clear();
        scheduleReconnect();
      });
      socket.addEventListener("error", () => {
        state.error = "connection-error";
      });
      return true;
    } catch (error) {
      setStatus("offline");
      state.error = error?.message || String(error);
      scheduleReconnect();
      return false;
    }
  }

  // After injecting the local-world adapter, start sampling, heartbeats, and online-state listeners;
  // entity ownership remains with the local world.
  function start(adapter) {
    if (!state.enabled || state.adapter) return false;
    if (!adapter?.getSpeciesCounts || !adapter?.applyWorld) return false;
    state.adapter = adapter;
    readStoredState();
    state.lastObservedCounts = localCounts();
    state.sampleTimer = window.setInterval(sampleLocalChanges, 3000);
    state.heartbeatTimer = window.setInterval(() => {
      send({
        type: "heartbeat",
        deviceId: state.deviceId,
        presentCount: presentCount(),
      });
      flushQueue();
    }, 20000);
    window.addEventListener("online", () => {
      setStatus("connecting");
      connect();
    });
    window.addEventListener("offline", () => {
      setStatus("offline");
    });
    window.addEventListener("pagehide", sampleLocalChanges);
    connect();
    return true;
  }

  // The public influence entry point validates the species and clamps
  // influence to a non-negative value before queuing the contribution.
  function recordInfluence(type, amount = 1, options = {}) {
    if (!state.enabled || !state.adapter) return false;
    if (!rules.species.includes(type)) return false;
    const influenceDelta = rules.emptyInfluence();
    influenceDelta[type] = Math.max(0, Number(amount) || 0);
    return enqueueContribution(
      { influenceDelta },
      options.eventType || `${type.toLowerCase()}.influence`
    );
  }

  // Local time advances while connection, shared-world, or authority information is pending;
  // once all information is available, the authority device advances the lifespan clock.
  function isLifeLeader() {
    if (!state.enabled || state.status !== "connected" || !state.world) return true;
    const leader = state.world.authority?.leaderDeviceId;
    return !leader || leader === state.deviceId;
  }

  function isEnabled() {
    return state.enabled;
  }

  // This function was modified with the assistance of ChatGPT.
  // Administrative reset credentials are supplied for one request only and are never persisted.
  async function resetWorld(adminToken) {
    if (!state.enabled) throw new Error("shared-reset-unavailable");
    const token = String(adminToken || "").trim();
    if (!token) throw new Error("admin-token-required");
    const response = await fetch(`${baseUrl()}/api/admin/reset`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {}
    if (!response.ok) {
      const error = new Error(
        response.status === 403 ? "admin-token-invalid" : "shared-reset-failed"
      );
      error.status = response.status;
      throw error;
    }
    if (payload?.world) applyWorld(payload.world);
    return clone(payload?.world || null);
  }

  // This function was modified with the assistance of ChatGPT.
  // Export credentials are used for one request and never enter persistent client state.
  async function exportLog(adminToken, filters = {}) {
    if (!state.enabled) throw new Error("shared-export-unavailable");
    const token = String(adminToken || "").trim();
    if (!token) throw new Error("admin-token-required");
    const events = [];
    let afterSequence = 0;
    let boundarySequence = 0;
    let exportPayload = null;
    do {
      const url = new URL(`${baseUrl()}/api/admin/log/export`);
      if (filters.from) url.searchParams.set("from", filters.from);
      if (filters.to) url.searchParams.set("to", filters.to);
      if (filters.cycleId) url.searchParams.set("cycle", filters.cycleId);
      if (afterSequence) url.searchParams.set("after", afterSequence);
      if (boundarySequence) url.searchParams.set("through", boundarySequence);
      url.searchParams.set("limit", "5000");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {}
      if (!response.ok) {
        const error = new Error(
          response.status === 403 ? "admin-token-invalid" : "shared-export-failed"
        );
        error.status = response.status;
        throw error;
      }
      exportPayload = payload;
      events.push(...(Array.isArray(payload?.events) ? payload.events : []));
      boundarySequence = Number(payload?.exportBoundarySequence || 0);
      const nextSequence = Number(payload?.nextAfterSequence || 0);
      if (!nextSequence || nextSequence <= afterSequence) break;
      afterSequence = nextSequence;
    } while (true);
    return {
      ...exportPayload,
      eventCount: events.length,
      truncated: false,
      nextAfterSequence: null,
      events,
    };
  }

  window.SharedClient = Object.freeze({
    start,
    recordInfluence,
    recordLogEvent,
    isLifeLeader,
    isEnabled,
    resetWorld,
    exportLog,
  });
})();

// The client above owns the connection protocol, retransmission queue, and acknowledgement state;
// the adapter maps shared counts and effects into the local ecology.
const sharedWorldAdapter = (() => {
"use strict";

const sharedInfluenceState = {
  Predator: 0,
  Parasite: 0,
  Roamer: 0,
  DeepDiver: 0,
  Guardian: 0,
};

function shrdSpcCnts() {
  return { ...encnProjCnts().byType };
}

// Derive the initial shared influence from the existing local ecology.
function bootstrapInfluence() {
  return {
    [eco.lifeType.predator]: creatures
      .filter((entity) => entity.type === eco.lifeType.predator)
      .reduce((total, entity) => total + max(0, entity.viewCount || 0), 0),
    [eco.lifeType.parasite]: 0,
    [eco.lifeType.roamer]: creatures
      .filter((entity) => entity.type === eco.lifeType.roamer)
      .reduce((total, entity) => total + max(0, entity.splitGeneration || 0), 0),
    [eco.lifeType.deepDiver]: max(0, deepFocus.focusCount || 0),
    [eco.lifeType.guardian]: creatures
      .filter((entity) => entity.type === eco.lifeType.guardian)
      .reduce(
        (total, entity) => total + max(0, entity.guardianRepairUseCount || 0),
        0
      ),
  };
}

// Find an in-world position for a remotely added entity away from existing lifeforms;
// after all attempts are exhausted, fall back to the central safe area.
function shrdSpwnPnt() {
  for (let attempt = 0; attempt < 80; attempt++) {
    const point = ecoWorld.project(
      random(width * 0.08, width * 0.79),
      random(height * 0.08, height * 0.92),
      28
    );
    if (
      [...creatures, ...parasites].every((entity) => {
        const position = worldPos(entity);
        return dist2(point.x, point.y, position.x, position.y) > 35 * 35;
      })
    ) {
      return point;
    }
  }
  return ecoWorld.project(
    ecoWorld.centerX() + random(-80, 80),
    ecoWorld.centerY() + random(-80, 80),
    20
  );
}

// Changes in shared counts grow into new life locally; individuals still follow their own birth rules,
// while remote experiences remain as aggregate traces.
// This function was modified with the assistance of ChatGPT.
function crtShrdEntty(type) {
  if (type === eco.lifeType.parasite) {
// Parasite continues growing from an existing host, preferring
// mobile lifeforms able to carry the narrative of attention residue.
    const preferredHosts = creatures.filter(
      (entity) =>
        !isLifeDying(entity) &&
        (entity.type === eco.lifeType.roamer ||
          entity.type === eco.lifeType.deepDiver)
    );
    const hosts = preferredHosts.length
      ? preferredHosts
      : creatures.filter((entity) => !isLifeDying(entity));
    const host = random(hosts);
    if (!host) return null;
    const angle = random(TWO_PI);
    const radius = max(
      12,
      storeFinite(host.hostR, 60) * random(0.15, 0.55)
    );
    const parasite = new Parasite(
      host,
      cos(angle) * radius,
      sin(angle) * radius,
      (host.rot ?? host.rot0 ?? 0) + random(-0.8, 0.8),
      random(sizes.Parasite),
      random(1e6)
    );
    parasite.prepStaticCache();
    return parasite;
  }

  // Independent species share a safe birth position, then
  // receive their own initial movement direction and visual size.
  const point = shrdSpwnPnt();
  if (type === eco.lifeType.predator) {
    const predator = new Predator(
      point.x,
      point.y,
      random(Predator.baitTypes)
    );
    predator.sz = random(sizes.Predator);
    predator.dir = random([1, -1]);
    predator.targetDir = predator.dir;
    predator.vx = predator.v * predator.dir;
    return predator;
  }
  if (type === eco.lifeType.roamer) {
    const roamer = new Roamer(point.x, point.y, random(TWO_PI));
    roamer.sz = random(sizes.Roamer);
    return roamer;
  }
  if (type === eco.lifeType.deepDiver) {
    const deepDiver = new DeepDiver(
      point.x,
      point.y,
      random(100, 900),
      random(TWO_PI)
    );
    deepDiver.sz = random(sizes.DeepDiver);
    return deepDiver;
  }
  if (type === eco.lifeType.guardian) {
    const guardian = new Guardian(point.x, point.y, random(TWO_PI));
    guardian.sz = random(sizes.Guardian);
    return guardian;
  }
  return null;
}

// Reconcile total counts with the shared state, selecting
// idle and reclaimable lifeforms when reducing populations.
// This function was modified with the assistance of ChatGPT.
function syncShrdCnts(reqsCnts) {
  const rules = window.SharedRules;
  if (!rules) return false;
  const targets = rules.normalizeCounts(reqsCnts);
  flshWrldQ();
  flushLife();
  indexGroups();

// When counts exceed the shared target, gently reclaim
// surplus lifeforms before filling deficits in other species.
  for (const type of encounterLifeTypes) {
    const current = shrdSpcCnts()[type] || 0;
    let removalCount = max(0, current - targets[type]);
    if (!removalCount) continue;
    const source =
      type === eco.lifeType.parasite
        ? [...parasites]
        : [...(groups[type] || [])];
    source.sort((first, second) => {
      // Population reduction prioritizes individuals with no active interaction state.
      const firstProtected = isLifeIxSafe(first) ? 1 : 0;
      const scndPrtc = isLifeIxSafe(second) ? 1 : 0;
      return firstProtected - scndPrtc;
    });
    for (const entity of source) {
      if (removalCount <= 0) break;
      if (isLifeIxSafe(entity)) continue;
      if (window.CreatureWorld?.remove?.(entity, "shared-ecology")) {
        removalCount--;
      }
    }
  }
  flshWrldQ();
  flushLife();
  indexGroups();

  for (const type of encounterLifeTypes) {
    let additionCount = max(
      0,
      targets[type] - (shrdSpcCnts()[type] || 0)
    );
    while (additionCount-- > 0) {
      const entity = crtShrdEntty(type);
      if (!entity || !window.CreatureWorld?.add?.(entity)) break;
    }
  }
  flshWrldQ();
  flushLife();
  indexGroups();
  return true;
}

function applyShrdInfl(influence) {
  const normalized = window.SharedRules?.normalizeInfluence?.(influence);
  if (!normalized) return false;
  Object.assign(sharedInfluenceState, normalized);
  const predators = creatures.filter(
    (entity) => entity.type === eco.lifeType.predator
  );
  let leftCapt = floor(normalized[eco.lifeType.predator] || 0);
  // Aggregate attention capture is reflected in local Predator appearance,
  // while individual remote capture paths remain outside the local rendering boundary.
  for (const predator of predators) {
    const allocation = min(leftCapt, 1);
    predator.viewCount = allocation;
    predator.numberValue = max(predator.numberValue || 0, allocation);
    predator.prevNumber = predator.numberValue;
    leftCapt -= allocation;
    clearLifeCache(predator);
  }
  if (leftCapt > 0 && predators.length) {
    predators[0].viewCount += leftCapt;
    predators[0].numberValue = max(
      predators[0].numberValue || 0,
      predators[0].viewCount
    );
    predators[0].prevNumber = predators[0].numberValue;
    clearLifeCache(predators[0]);
  }
  return true;
}

// The shared world's counts and effects take visible form in the local ecology.
function applyShrdWrld(world) {
  if (!world) return false;
  const changed = syncShrdCnts(world.speciesCounts);
  applyShrdInfl(world.ecologyInfluence);
  store.save("shared-world");
  return changed;
}

// The transport client provides the interface for shared counts, influence,
// and the present-participant count,
// while the world system continues to manage entity ownership.
function intlShrd() {
  return (
    window.SharedClient?.start?.({
      getSpeciesCounts: shrdSpcCnts,
      getBootstrapInfluence: bootstrapInfluence,
      getPresentCount: () =>
        window.GazeApp?.eclgyPrsn?.()?.presentCount || 0,
      applyWorld: applyShrdWrld,
    }) || false
  );
}

return Object.freeze({ initialize: intlShrd });
})();
