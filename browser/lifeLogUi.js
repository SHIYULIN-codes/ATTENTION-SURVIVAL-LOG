// File Overview
// Converts ecological events into short textual records and manages
// their display and export in the life log.

// 1. Each unfolding change also leaves behind a sentence
// I let the words begin with the change now unfolding, leaving
// room for the audience's own experience to shape its meaning.

// 2. A limited vocabulary and rhythm accompany the live interaction
const lifeLogConfig = Object.freeze({
  maximumLines: 6,
  maxVisEntrs: 2,
  maxEntryLns: 2,
  maxBuffEntrs: 12,
  maxWaitEntrs: 8,
  fadeInMs: 1000,
  moveMs: 900,
  minVisMs: 6000,
  coalesceMs: 30000,
  dedupeMs: 4500,
});

function logEntry(message, identityPhrase) {
  return Object.freeze({ message, identityPhrase });
}

const logText = Object.freeze({
  Predator: Object.freeze({
    simple: Object.freeze([
      logEntry(
        "This lure is learning from your attention.",
        "lure"
      ),
    ]),
    full: Object.freeze([
      logEntry(
        "Your gaze has nourished a Predator.",
        "Predator"
      ),
      logEntry(
        "A lure has gained new attention.",
        "lure"
      ),
      logEntry(
        "Your lingering has strengthened the lure.",
        "the lure"
      ),
    ]),
    cost: Object.freeze([
      logEntry(
        "Another possible life was the price.",
        "the price"
      ),
    ]),
  }),
  Parasite: Object.freeze({
    simple: Object.freeze([
      logEntry(
        "Attention stirs the residue.",
        "the residue"
      ),
    ]),
    general: Object.freeze([
      logEntry(
        "A lingering trace of attention clings to the path.",
        "lingering trace"
      ),
      logEntry(
        "An old thought still circles through the ecosystem.",
        "still circles"
      ),
      logEntry(
        "A thought that could not settle remains here.",
        "remains here"
      ),
      logEntry(
        "An old trace of attention keeps returning like an echo.",
        "keeps returning"
      ),
    ]),
  }),
  Roamer: Object.freeze({
    simple: Object.freeze([
      logEntry(
        "Thoughts drift freely from one direction to another.",
        "drift freely"
      ),
    ]),
    full: Object.freeze([
      logEntry(
        "A Roamer surfaces as attention loosens.",
        "Roamer"
      ),
      logEntry(
        "A Roamer appears as the focus lets go.",
        "Roamer"
      ),
      logEntry(
        "Wandering lets attention drift briefly free of goal pressure.",
        "Wandering"
      ),
    ]),
  }),
  DeepDiver: Object.freeze({
    simple: Object.freeze([
      logEntry(
        "Attention is gathering around a single focus.",
        "single focus"
      ),
    ]),
    full: Object.freeze([
      logEntry(
        "A steady focus is taking shape.",
        "steady focus"
      ),
      logEntry(
        "Focus is gathering in this area.",
        "Focus"
      ),
      logEntry(
        "The periphery is slowly receding from attention.",
        "slowly receding"
      ),
    ]),
    rest: Object.freeze([
      logEntry(
        "Every stretch of focus has a limit.",
        "focus"
      ),
      logEntry(
        "This focus has held for a long time.",
        "focus"
      ),
      logEntry(
        "The next focus needs time to gather.",
        "next focus"
      ),
    ]),
  }),
  Guardian: Object.freeze({
    simplePredator: Object.freeze([
      logEntry(
        "A flicker of vigilance swims towards the lure.",
        "vigilance"
      ),
      logEntry(
        "The lure’s faint glow set the Guardian’s marker in motion.",
        "Guardian’s marker"
      ),
    ]),
    simpleParasite: Object.freeze([
      logEntry(
        "A flicker of vigilance swims towards the residue.",
        "vigilance"
      ),
      logEntry(
        "Lingering attention stirred the Guardian’s marker.",
        "Guardian’s marker"
      ),
    ]),
    scan: Object.freeze([
      logEntry(
        "Abundance and scarcity come into view together.",
        "scarcity"
      ),
      logEntry(
        "The Guardian hears an uneven pulse.",
        "Guardian"
      ),
    ]),
    suppression: Object.freeze([
      logEntry(
        "A space occupied for too long begins to breathe again.",
        "breathe again"
      ),
      logEntry(
        "An overpowering rhythm is slowly settling back into the ecosystem.",
        "settling back"
      ),
      logEntry(
        "The Guardian opens space for other life.",
        "Guardian"
      ),
    ]),
    protection: Object.freeze([
      logEntry(
        "Faint colonies grow clearer in view.",
        "Faint colonies"
      ),
      logEntry(
        "The pulse of a rare colony is growing stronger.",
        "rare colony"
      ),
      logEntry(
        "The rarest colony gains more room to survive.",
        "rarest colony"
      ),
      logEntry(
        "Diversity slowly returns at the edges.",
        "Diversity"
      ),
    ]),
    signal: Object.freeze([
      logEntry(
        "A vigilance signal is spreading outward.",
        "vigilance signal"
      ),
      logEntry(
        "The signal waits for another gaze to respond.",
        "The signal"
      ),
    ]),
    accepted: Object.freeze([
      logEntry(
        "Another gaze answers the signal.",
        "answers"
      ),
    ]),
    repairStarted: Object.freeze([
      logEntry(
        "Collective repair begins here.",
        "Collective repair"
      ),
    ]),
    repairCompleted: Object.freeze([
      logEntry(
        "This space regains a little quiet.",
        "little quiet"
      ),
      logEntry(
        "The ecosystem makes room for different forms of life again.",
        "makes room"
      ),
    ]),
    unanswered: Object.freeze([
      logEntry(
        "A connection for collective repair does not form.",
        "collective repair"
      ),
    ]),
    fallback: Object.freeze([
      logEntry(
        "One field of attention begins repairing the space.",
        "begins repairing"
      ),
    ]),
  }),
});

const logIdByMsg = new Map();
for (const speciesCopy of Object.values(logText)) {
  for (const conditionCopy of Object.values(speciesCopy)) {
    for (const copy of conditionCopy) {
      const message = String(copy.message || "");
      const identityPhrase = String(copy.identityPhrase || "").trim();
      const wordCount = identityPhrase.split(/\s+/).filter(Boolean).length;
      const firstIndex = message.indexOf(identityPhrase);
      if (
        wordCount < 1 ||
        wordCount > 2 ||
        firstIndex < 0 ||
        firstIndex !== message.lastIndexOf(identityPhrase)
      ) {
        throw new Error(
          `Invalid attention log identity phrase: ${identityPhrase} / ${message}`
        );
      }
      logIdByMsg.set(message, identityPhrase);
    }
  }
}

// Identity phrases use values supplied by the event; when no explicit identity is available,
// stable fragments in the text provide accessible differentiation.
function logIdPhrase(message, prfrPhrs = "") {
  const normMsg = String(message || "");
  const candidates = [
    String(prfrPhrs || "").trim(),
    logIdByMsg.get(normMsg) || "",
  ];
  for (const phrase of candidates) {
    const wordCount = phrase.split(/\s+/).filter(Boolean).length;
    const firstIndex = normMsg.indexOf(phrase);
    if (
      phrase &&
      wordCount >= 1 &&
      wordCount <= 2 &&
      firstIndex >= 0 &&
      firstIndex === normMsg.lastIndexOf(phrase)
    ) {
      return phrase;
    }
  }
  return "";
}
const archvOnlyTags = new Set([
  "ECOLOGY STRAINED",
  "LIFE TRANSFORMED",
  "LIFE DIFFERENTIATED",
  "BALANCE RESTORED",
  "ATTENTION SHARED",
]);
const lifeLogExportSchema = "attention-survival-log/reading-v1";
const lifeLogReadingSimple = Object.freeze({
  Predator: "The lure learns.",
  Parasite: "A trace remains.",
  Roamer: "Thoughts drift.",
  DeepDiver: "Focus gathers.",
});

// 3. Presenting ecological text on screen
// The interface manages the display queue and deduplication;
// AttentionLogStoreApp stores runs and events.
const logState = {
  sequence: 0,
  entries: [],
  pendingEntries: [],
  lastRecordedAt: new Map(),
  lastShownAt: new Map(),
  seenArcEvnIds: new Set(),
  lastInsertAt: -Infinity,
  displayTimer: null,
  root: null,
  list: null,
  revision: 0,
  rendRevs: -1,
  initialized: false,
  intlErrr: null,
  activeSessionId: null,
  storageStatus: "starting",
  archOn: true,
  saveKeyBound: false,
  saveInProgress: false,
  unsbStrg: null,
};

// Log timestamps prefer the caller's ecological clock,
// falling back to the current runtime when it is absent.
function lifeLogNow(value = null) {
  if (Number.isFinite(value)) return value;
  if (typeof frame !== "undefined" && Number.isFinite(frame.now) && frame.now > 0) {
    return frame.now;
  }
  return typeof millis === "function" ? millis() : performance.now();
}

function lifeLogTag(value) {
  return String(value || "ECOLOGY CHANGED")
    .trim()
    .replace(/^\[|\]$/g, "")
    .toUpperCase();
}

function lifeLogSpecies(value) {
  return ecoConst.normalizeLifeType(value);
}

function lifeLogEvnTyp(value) {
  return lifeLogTag(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ecology-changed";
}

const lifeLog = Object.freeze({
  ensureElements: logEnsrElmn,
  exportJson: logExportJson,
  formatSharedExport: logSharedReadingExport,
  handleSaveKey: hndlLogSaveKey,
  setupSaveKey: stpLogSaveKey,
  createSignal: crtLogSgnl,
  createElement: crtLogElmnt,
  record: recordLogEntry,
  clear: clrLogEntrs,
  render: rndrLogEntrs,
  initialize: initializeLog,
});

// The log root is retrieved and cached on demand; records
// enter an internal queue until the interface has mounted.
function logEnsrElmn() {
  if (logState.root?.isConnected && logState.list?.isConnected) {
    return true;
  }
  logState.root = document.getElementById(
    "attention-survival-log"
  );
  logState.list = document.getElementById(
    "attention-survival-log-entries"
  );
  return Boolean(logState.root && logState.list);
}

// Update the log health notice according to the storage
// backend, persistence permission, and write state.
function updtLogHlth(storeState = {}) {
  logState.archOn =
    storeState.ready === false ||
    (storeState.backend === "indexeddb" && storeState.writerStatus === "active");
  logState.storageStatus = storeState.backend === "indexeddb"
    ? storeState.persistent ? "persistent" : "indexeddb"
    : storeState.backend || "starting";
  logState.intlErrr = storeState.error || null;
}

function logExportFilename(epochMs) {
  const timestamp = new Date(Number(epochMs) || Date.now())
    .toISOString()
    .replace(/[:.]/g, "-");
  return `attention-survival-log_reading_${timestamp}.json`;
}

function logReadingMessage(event) {
  const eventType = String(event?.eventType || "");
  const tag = lifeLogTag(event?.tag);
  const species = lifeLogSpecies(event?.primarySpecies);
  const condition = String(event?.metadata?.condition || "");
  if (
    eventType === "attention-simple" ||
    eventType === legacyEvent.attentionEncounterCompleted
  ) {
    return "";
  }
  if (eventType === "ecology-observation" && condition === "simple") {
    return lifeLogReadingSimple[species] || String(event?.message || "").trim();
  }
  if (tag === "ECOLOGY RESTING") return "The ecology rests.";
  if (tag === "LIFE FADING") return "A life fades.";
  if (tag === "LIFE TRANSFORMED") return "A fading life becomes a Parasite.";
  if (tag === "LIFE DIFFERENTIATED") {
    const name = ecoConst.lifeName?.[species] || species;
    return species === ecoConst.lifeType.basicCell
      ? "A life emerges."
      : `A ${name} emerges.`;
  }
  return String(event?.message || "").trim();
}

// Reading exports retain only the ecological sentence and its context.
// Consecutive repetitions become a count and final timestamp,
// as in the exhibition samples.
// This conversion was modified with the assistance of ChatGPT.
function logReadingEntries(events = []) {
  const entries = [];
  for (const event of events) {
    const message = logReadingMessage(event);
    if (!message) continue;
    const epochMs = Number(event?.occurredAtEpochMs);
    const time = Number.isFinite(epochMs) && epochMs > 0
      ? new Date(epochMs).toISOString()
      : String(event?.occurredAtIso || "");
    if (!time) continue;
    const species = lifeLogSpecies(event?.primarySpecies);
    const previous = entries[entries.length - 1];
    if (previous?.species === species && previous.message === message) {
      previous.count = (previous.count || 1) + 1;
      previous.lastTime = time;
      continue;
    }
    entries.push({ time, species, message });
  }
  return entries;
}

function logReadingDelta(value = {}) {
  const result = {};
  for (const [species, amount] of Object.entries(value || {})) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric === 0) continue;
    result[lifeLogSpecies(species)] = Math.round(numeric * 1000) / 1000;
  }
  return result;
}

function logReadingDeltaText(delta) {
  return Object.entries(delta)
    .map(([species, amount]) => {
      const name = ecoConst.lifeName?.[species] || species;
      return `${name} ${amount > 0 ? "+" : ""}${amount}`;
    })
    .join(", ");
}

function logSharedSpecies(event, population, influence) {
  if (event?.primarySpecies) return lifeLogSpecies(event.primarySpecies);
  const changed = new Set([
    ...Object.keys(population),
    ...Object.keys(influence),
  ]);
  return changed.size === 1 ? [...changed][0] : "Ecology";
}

function logSharedReadingMessage(event, species, population, influence) {
  const eventType = String(event?.eventType || "ecology.change");
  const changeText = logReadingDeltaText(population);
  const speciesName = ecoConst.lifeName?.[species] || species;
  if (eventType === "ecology-observation" || eventType === "attention-simple") {
    return lifeLogReadingSimple[species] ||
      (species === ecoConst.lifeType.guardian
        ? "The Guardian tends the ecology."
        : "Attention changes the ecology.");
  }
  if (eventType === legacyEvent.attentionEncounterCompleted) {
    return `An encounter with ${speciesName} is complete.`;
  }
  if (eventType === "population.change") {
    return changeText
      ? `The shared population changes: ${changeText}.`
      : "The shared population changes.";
  }
  if (eventType === "predator.capture") return "The lure learns.";
  if (eventType === "deep-diver.focus") return "Focus gathers.";
  if (eventType === legacyEvent.guardianCare) {
    return "The Guardian restores space for other life.";
  }
  if (eventType === "ecology-resting") return "The ecology rests.";
  if (eventType === "life-fading") return "A life fades.";
  if (eventType === "life-transformed") {
    return "A fading life becomes a Parasite.";
  }
  if (eventType === "life-differentiated") {
    return species === ecoConst.lifeType.basicCell
      ? "A life emerges."
      : `A ${speciesName} emerges.`;
  }
  if (eventType === "ecology-strained") {
    return "The ecology strains under competing lives.";
  }
  if (eventType === "balance-restored") return "The ecology regains balance.";
  if (eventType === "attention-shared") return "Attention is shared.";
  if (eventType === "world.initialize") return "The shared ecology begins.";
  if (eventType === "world.reset") {
    return "The shared ecology begins a new cycle.";
  }
  if (eventType === "world.unattended-evolution") {
    return changeText
      ? `The unattended ecology changes: ${changeText}.`
      : "The unattended ecology continues to change.";
  }
  const influenceText = logReadingDeltaText(influence);
  if (influenceText) return `Ecological influence changes: ${influenceText}.`;
  return `${eventType.replace(/[._:-]+/g, " ").trim()}.`;
}

// Shared reading entries translate anonymous server events into ecological language
// while retaining participant totals and exact population or influence changes.
// This conversion was modified with the assistance of ChatGPT.
function logSharedReadingEntries(events = []) {
  const entries = [];
  let previousSignature = "";
  for (const event of events) {
    const time = String(event?.occurredAtIso || "");
    if (!time) continue;
    const population = logReadingDelta(event?.countDelta);
    const influence = logReadingDelta(event?.influenceDelta);
    const species = logSharedSpecies(event, population, influence);
    const message = logSharedReadingMessage(
      event,
      species,
      population,
      influence
    );
    const entry = {
      time,
      species,
      message,
      participants: Math.max(0, Number(event?.participantCount) || 0),
    };
    const cycle = Math.max(0, Number(event?.cycleId) || 0);
    if (cycle) entry.cycle = cycle;
    if (Object.keys(population).length || Object.keys(influence).length) {
      entry.change = {};
      if (Object.keys(population).length) entry.change.population = population;
      if (Object.keys(influence).length) entry.change.influence = influence;
    }
    const signature = JSON.stringify([
      entry.species,
      entry.message,
      entry.participants,
      entry.cycle || 0,
      entry.change || null,
    ]);
    const previous = entries[entries.length - 1];
    if (previous && signature === previousSignature) {
      previous.count = (previous.count || 1) + 1;
      previous.lastTime = time;
      continue;
    }
    entries.push(entry);
    previousSignature = signature;
  }
  return entries;
}

function logTimeZone(date) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const zoneName = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value || "UTC";
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  const offset = `${sign}${hours}:${minutes}`;
  return {
    timeZone,
    zoneName,
    label: `${timeZone} (${zoneName}, UTC${offset})`,
  };
}

function logLocalTimestamp(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value || "00";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

function logSharedReadingExport(payload = {}) {
  const savedAt = new Date(payload.exportedAtIso || Date.now());
  const savedAtIso = savedAt.toISOString();
  const entries = logSharedReadingEntries(
    Array.isArray(payload.events) ? payload.events : []
  );
  const firstTime = entries[0]?.time || savedAtIso;
  const lastEntry = entries[entries.length - 1];
  const lastTime = lastEntry?.lastTime || lastEntry?.time || savedAtIso;
  const zone = logTimeZone(savedAt);
  const timestamp = savedAtIso.replace(/[:.]/g, "-");
  const filename = `attention-survival-log_shared-reading_${timestamp}.json`;
  const world = payload.world || {};
  return {
    schema: "attention-survival-log/shared-reading-v1",
    title: "ATTENTION SURVIVAL LOG — SHARED ECOLOGY",
    source: "Render shared ecology",
    savedAt: savedAtIso,
    sourceFile: filename,
    timeZone: zone.label,
    range:
      `${logLocalTimestamp(firstTime, zone.timeZone)}–` +
      `${logLocalTimestamp(lastTime, zone.timeZone)} ${zone.zoneName}`,
    retention: "one month",
    eventCount: Math.max(0, Number(payload.eventCount) || 0),
    entryCount: entries.length,
    currentEcology: {
      cycle: Math.max(1, Number(world.cycleId) || 1),
      updatedAt: world.updatedAt || savedAtIso,
      speciesCounts: world.speciesCounts || {},
      ecologicalInfluence: world.ecologyInfluence || {},
    },
    entries,
  };
}

async function waitForLogWrites(store, timeoutMs = 3000) {
  const deadline = performance.now() + timeoutMs;
  while (store.snapshot?.().pendingWrites > 0 && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  if (store.snapshot?.().pendingWrites > 0) {
    throw new Error("The event log is still being written. Please try again.");
  }
}

function downloadLogJson(filename, contents) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveLogJson(filename, contents) {
  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: "Attention Survival Log",
          accept: { "application/json": [".json"] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return { saved: true, method: "file-system-write", filename };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { saved: false, method: "cancelled", filename };
      }
      console.warn("[LifeLog] File picker unavailable; using browser download.", error);
    }
  }
  downloadLogJson(filename, contents);
  return { saved: true, method: "browser-download", filename };
}

// On S, wait for current writes to finish, then export a readable version of the active run.
// This function was modified with the assistance of ChatGPT.
async function logExportJson() {
  if (logState.saveInProgress) return null;
  logState.saveInProgress = true;
  try {
    const store = window.AttentionLogStoreApp;
    if (!store) throw new Error("The ecology event log is unavailable.");
    await waitForLogWrites(store);
    const session = await store.activeSession();
    if (!session) throw new Error("No active ecology event session is available.");
    const snapshot = await store.exportSnapshot(session.id);
    if (!snapshot) throw new Error("The ecology event log could not be prepared.");
    const savedAt = new Date();
    const filename = logExportFilename(session.startedAtEpochMs);
    const entries = logReadingEntries(snapshot.events);
    const firstTime =
      entries[0]?.time || session.startedAtIso || savedAt.toISOString();
    const lastEntry = entries[entries.length - 1];
    const lastTime =
      lastEntry?.lastTime || lastEntry?.time || savedAt.toISOString();
    const zone = logTimeZone(savedAt);
    const contents = JSON.stringify({
      schema: lifeLogExportSchema,
      title: "ATTENTION SURVIVAL LOG",
      sessionStartedAt: session.startedAtIso,
      savedAt: savedAt.toISOString(),
      sourceFile: filename,
      timeZone: zone.label,
      range:
        `${logLocalTimestamp(firstTime, zone.timeZone)}–` +
        `${logLocalTimestamp(lastTime, zone.timeZone)} ${zone.zoneName}`,
      entries,
    }, null, 2);
    const result = await saveLogJson(filename, contents);
    if (result.saved) console.info(`[LifeLog] JSON exported: ${result.filename}`);
    return result;
  } catch (error) {
    console.error("[LifeLog] JSON export failed:", error);
    return null;
  } finally {
    logState.saveInProgress = false;
  }
}

// Handle the S export shortcut on the page, ignoring
// editable fields, Shift, and Alt, Ctrl, or Meta combinations.
function hndlLogSaveKey(event) {
  if (
    event.repeat ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    String(event.key || "").toLowerCase() !== "s"
  ) {
    return;
  }
  const target = event.target;
  if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "")) {
    return;
  }
  event.preventDefault();
  lifeLog.exportJson();
}

function stpLogSaveKey() {
  if (logState.saveKeyBound) return;
  logState.saveKeyBound = true;
  document.addEventListener("keydown", lifeLog.handleSaveKey);
}

// Create a decorative signal for a log entry; its variant is determined by the entry number and species.
function crtLogSgnl(entry) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const variantSource = `${entry?.id ?? ""}:${entry?.primarySpecies ?? ""}`;
  let variantHash = 0;
  for (let index = 0; index < variantSource.length; index++) {
    variantHash = (variantHash * 31 + variantSource.charCodeAt(index)) >>> 0;
  }
  const variant = variantHash % 3;
  const dotPaths = [
    "M8 4.2C8.9 4.8 10 4.2 10.5 5.3C11.7 5.7 11.1 6.9 11.6 7.8C11.9 8.8 10.6 9.2 10.6 10.1C10 11.2 9 10.7 8.2 11.8C7.3 11.1 6.2 11.6 5.6 10.5C4.5 10.1 5.2 8.9 4.4 8.1C5 7.1 4.6 6 5.7 5.6C6.3 4.5 7.3 5.1 8 4.2Z",
    "M7.7 4.4C8.6 4.9 9.8 4.2 10.2 5.4C11.5 5.6 11 6.9 11.7 7.6C11.3 8.6 11.8 9.7 10.5 10.1C10 11.4 8.8 10.9 7.9 11.7C7 11 5.8 11.5 5.5 10.2C4.4 9.7 5.1 8.7 4.5 7.8C5.1 7 4.6 5.8 5.9 5.6C6.2 4.5 7.1 5 7.7 4.4Z",
    "M8.3 4.3C9.1 5 10.2 4.3 10.7 5.4C11.8 5.9 11.1 7 11.6 8C11 8.8 11.7 9.9 10.4 10.3C9.9 11.5 8.7 10.8 8 11.8C7.1 11 6 11.5 5.5 10.4C4.3 10 5.1 8.8 4.4 8C5 7.2 4.7 6.1 5.8 5.7C6.4 4.5 7.5 5.1 8.3 4.3Z",
  ];
  const connectorPaths = [
    "M8 0C7.4 9 8.7 17 7.8 26C7.5 35 8.9 41 8.4 50C7.8 59 7.3 68 8.4 77C8.9 86 7.5 94 8 100",
    "M8 0C8.8 8 7.4 17 8.5 27C8.8 36 7.3 44 7.9 53C8.7 62 8.8 70 7.7 79C7.4 88 8.6 95 8 100",
    "M8 0C7.5 8 7.7 16 8.7 24C9 33 7.6 40 7.9 49C8.5 58 7.4 66 8.3 75C8.9 84 7.6 92 8 100",
  ];
  const signal = document.createElement("span");
  signal.className = "attention-survival-log-signal";
  signal.dataset.signalVariant = String(variant);
  signal.setAttribute("aria-hidden", "true");

  const dot = document.createElementNS(svgNamespace, "svg");
  dot.classList.add("attention-survival-log-signal-dot");
  dot.setAttribute("viewBox", "0 0 16 16");
  const dotPath = document.createElementNS(svgNamespace, "path");
  dotPath.setAttribute("d", dotPaths[variant]);
  dot.append(dotPath);

  const connector = document.createElementNS(svgNamespace, "svg");
  connector.classList.add("attention-survival-log-signal-connector");
  connector.setAttribute("viewBox", "0 0 16 100");
  connector.setAttribute("preserveAspectRatio", "none");
  const connectorPath = document.createElementNS(svgNamespace, "path");
  connectorPath.setAttribute("d", connectorPaths[variant]);
  connector.append(connectorPath);
  signal.append(dot, connector);
  return signal;
}

// A log node establishes its semantic structure and species attribute once;
// subsequent updates change its content while preserving the accessible hierarchy.
function crtLogElmnt(entry) {
  const element = document.createElement("article");
  element.className = "attention-survival-log-entry";
  element.dataset.entryId = String(entry.id);
  element.dataset.species = lifeLogSpecies(entry.primarySpecies);
  const message = document.createElement("p");
  message.className = "attention-survival-log-message";
  const messageText = String(entry.message || "");
  const identityPhrase = logIdPhrase(
    messageText,
    entry.identityPhrase
  );
  const identityIndex = messageText.indexOf(identityPhrase);
  if (!identityPhrase || identityIndex < 0) {
    message.textContent = messageText;
  } else {
    const identity = document.createElement("span");
    identity.className = "attention-survival-log-identity";
    identity.textContent = identityPhrase;
    message.append(
      document.createTextNode(messageText.slice(0, identityIndex)),
      identity,
      document.createTextNode(
        messageText.slice(identityIndex + identityPhrase.length)
      )
    );
  }
  element.append(message, lifeLog.createSignal(entry));
  return element;
}

// Insert a hidden measurement node at the list width and calculate
// line count from the actual text height and line height.
function lifeLogLineN(entry) {
  if (!lifeLog.ensureElements()) return 1;
  const probe = lifeLog.createElement(entry);
  try {
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "fixed";
    probe.style.left = "-10000px";
    probe.style.top = "0";
    probe.style.width = `${Math.max(1, logState.list.getBoundingClientRect().width)}px`;
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    logState.list.appendChild(probe);
    const message = probe.querySelector(".attention-survival-log-message");
    if (!message) return 1;
    const lineHeight = Number.parseFloat(window.getComputedStyle(message).lineHeight);
    const height = message.getBoundingClientRect().height;
    return Math.max(
      1,
      Math.round(height / Math.max(1, lineHeight || height))
    );
  } finally {
    probe.remove();
  }
}

// Select logs backward from the newest entry and limit the
// visible range by both entry count and total line count.
function visLogEntrs() {
  const selected = [];
  let lineCount = 0;
  for (
    let index = logState.entries.length - 1;
    index >= 0;
    index--
  ) {
    const entry = logState.entries[index];
    const entryLines = Math.min(
      lifeLogConfig.maxEntryLns,
      lifeLogLineN(entry)
    );
    if (selected.length > 0 && lineCount + entryLines > lifeLogConfig.maximumLines) {
      break;
    }
    selected.unshift(entry);
    lineCount += entryLines;
    if (
      selected.length >= lifeLogConfig.maxVisEntrs
    ) {
      break;
    }
    if (lineCount >= lifeLogConfig.maximumLines) break;
  }
  return selected;
}

// Assemble a sentence from the live interaction, together with its
// time, species, and participant count, into an archival record.
function archvLogRcrd(tag, message, options, now) {
  const gazeSnapshot = window.GazeApp?.snapshot?.() || null;
  const participantCount = Number.isFinite(options.participantCount)
    ? options.participantCount
    : gazeSnapshot?.participants?.length || gazeSnapshot?.sessionCount || 0;
  return {
    occurredAtEpochMs: Date.now(),
    experienceElapsedMs: now,
    eventType: String(options.eventType || lifeLogEvnTyp(tag)),
    tag,
    message,
    primarySpecies: lifeLogSpecies(options.primarySpecies),
    participantCount,
    metadata: options.metadata || {},
  };
}

function appendLogEntry(
  entry,
  { render = true, markInsertion = true } = {}
) {
  logState.entries.push(entry);
  if (
    logState.entries.length >
    lifeLogConfig.maxBuffEntrs
  ) {
    logState.entries.splice(
      0,
      logState.entries.length -
        lifeLogConfig.maxBuffEntrs
    );
  }
  if (markInsertion) {
    logState.lastInsertAt = Date.now();
  }
  logState.revision++;
  if (render) lifeLog.render(entry.startedAt);
  return entry;
}

// I allow time to read the sentence currently displayed;
// the next dequeue observes the minimum display interval.
function schdLogQ() {
  if (
    logState.displayTimer != null ||
    logState.pendingEntries.length === 0
  ) {
    return;
  }
  const delayMs = Math.max(
    0,
    logState.lastInsertAt +
      lifeLogConfig.minVisMs -
      Date.now()
  );
  logState.displayTimer = setTimeout(() => {
    logState.displayTimer = null;
    drainLogQueue();
  }, delayMs);
}

// Dequeue logs for presentation at the display interval; archival
// writes use an immediate path independent of the interface's pacing.
// This function was modified with the assistance of ChatGPT.
function drainLogQueue() {
  if (logState.pendingEntries.length === 0) return null;
  const now = Date.now();
  const leftHoldMs =
    logState.lastInsertAt +
    lifeLogConfig.minVisMs -
    now;
  if (leftHoldMs > 0) {
    schdLogQ();
    return null;
  }
  // After the waiting window ends, show higher-importance events first;
  // events of equal priority retain their queue order.
  let selectedIndex = 0;
  for (
    let index = 1;
    index < logState.pendingEntries.length;
    index++
  ) {
    const candidate = logState.pendingEntries[index];
    const selected = logState.pendingEntries[selectedIndex];
    if (
      candidate.priority > selected.priority ||
      (candidate.priority === selected.priority &&
        candidate.qdAtEpchMs < selected.qdAtEpchMs)
    ) {
      selectedIndex = index;
    }
  }
  const [entry] = logState.pendingEntries.splice(
    selectedIndex,
    1
  );
  appendLogEntry(entry);
  schdLogQ();
  return entry;
}

// 4. Allow time to read each entry
function queueLogEntry(
  entry,
  { immediate = false } = {}
) {
  if (immediate) return appendLogEntry(entry);
  const qdAtEpchMs = Date.now();
  const aggregationKey = String(entry.aggregationKey || entry.key);
  // Displays with the same aggregation key are merged within coalesceMs,
  // preserving the event count and highest priority.
  const existing = logState.pendingEntries.find(
    (candidate) =>
      candidate.aggregationKey === aggregationKey &&
      qdAtEpchMs - candidate.qdAtEpchMs <
        lifeLogConfig.coalesceMs
  );
  if (existing) {
    existing.relatedCount = (existing.relatedCount || 1) + 1;
    existing.priority = Math.max(existing.priority, entry.priority);
    return existing;
  }
  const queuedEntry = {
    ...entry,
    aggregationKey,
    priority: Number(entry.priority) || 0,
    qdAtEpchMs,
    relatedCount: 1,
  };
  logState.pendingEntries.push(queuedEntry);
  if (
    logState.pendingEntries.length >
    lifeLogConfig.maxWaitEntrs
  ) {
    // When the queue is crowded, retain higher-priority and newer
    // results so the live display focuses on key ecological changes.
    let discardIndex = 0;
    for (
      let index = 1;
      index < logState.pendingEntries.length;
      index++
    ) {
      const candidate = logState.pendingEntries[index];
      const discarded = logState.pendingEntries[discardIndex];
      if (
        candidate.priority < discarded.priority ||
        (candidate.priority === discarded.priority &&
          candidate.qdAtEpchMs < discarded.qdAtEpchMs)
      ) {
        discardIndex = index;
      }
    }
    logState.pendingEntries.splice(discardIndex, 1);
  }
  if (
    logState.entries.length === 0 &&
    !Number.isFinite(logState.lastInsertAt)
  ) {
    return drainLogQueue() || queuedEntry;
  }
  schdLogQ();
  return queuedEntry;
}

// 5. System events become ecological language the audience can read
// Filter archived events by run, display policy,
// and deduplication conditions before sending them to the live log.
function ingestLogEvent(event, options = {}) {
  if (!event || event.id == null) return false;
  const archiveId = String(event.id);
  if (logState.seenArcEvnIds.has(archiveId)) return false;
  logState.seenArcEvnIds.add(archiveId);
  if (
    logState.activeSessionId &&
    event.sessionId &&
    event.sessionId !== logState.activeSessionId
  ) {
    return false;
  }
  const display = event.metadata?.attnLogDsply;
  if (display?.visible === false) return false;
  const normalizedTag = lifeLogTag(event.tag);
  // System-level changes enter the archive, while the live interface
  // presents explanations directly related to current behavior.
  if (archvOnlyTags.has(normalizedTag)) return false;
  if (display?.policyVersion !== 2) return false;
  const key = String(
    display?.key || `${lifeLogTag(event.tag)}:${event.message || ""}`
  );
  const occurredAtEpochMs = Number(event.occurredAtEpochMs) || Date.now();
  const dedupeMs = max(
    0,
    Number(display?.dedupeMs) || lifeLogConfig.dedupeMs
  );
  const lastDispAt = logState.lastShownAt.get(key);
  if (
    Number.isFinite(lastDispAt) &&
    occurredAtEpochMs - lastDispAt < dedupeMs
  ) {
    return false;
  }
  logState.lastShownAt.set(key, occurredAtEpochMs);
  const entry = {
    id: `archive-${archiveId}`,
    key,
    tag: normalizedTag,
    message: String(event.message || ""),
    identityPhrase: logIdPhrase(
      event.message,
      display?.identityPhrase
    ),
    primarySpecies: lifeLogSpecies(event.primarySpecies),
    startedAt: Number(event.experienceElapsedMs) || lifeLogNow(),
    aggregationKey: String(display?.aggregationKey || key),
    priority: Number(display?.priority) || 0,
    restored: Boolean(options.restored),
  };
  if (options.restored) {
    appendLogEntry(entry, {
      render: options.render !== false,
      markInsertion: false,
    });
  } else {
    queueLogEntry(entry, {
      immediate: Boolean(display?.dsplyImmd),
    });
  }
  return true;
}

// 6. Changes in the present enter the archive and can be seen again later
// This function was modified with the assistance of ChatGPT.
function recordLogEntry(tag, message, options = {}) {
  const normMsg = String(message || "").trim();
  if (!normMsg) return null;
  const normalizedTag = lifeLogTag(tag);
  const identityPhrase = logIdPhrase(
    normMsg,
    options.identityPhrase
  );
  const now = lifeLogNow(options.now);
  const key = String(options.key || `${normalizedTag}:${normMsg}`);
  const store = window.AttentionLogStoreApp;
  const lastRecordedAt = logState.lastRecordedAt.get(key);
  const dedupeMs = Math.max(
    0,
    Number(options.dedupeMs) || lifeLogConfig.dedupeMs
  );
// Identical event keys share a display-deduplication window.
  const duplicate = Boolean(
    Number.isFinite(lastRecordedAt) &&
    now - lastRecordedAt < dedupeMs
  );
// The screen schedules text according to the deduplication window;
// events meeting the write conditions still enter the archive.
  const storeState = store?.snapshot?.() || null;
  const archivable = Boolean(
    store?.append && (!storeState?.ready || store.canWrite?.())
  );
  const dsplyReqs = options.display !== false;
  if (storeState) updtLogHlth(storeState);
  const archiveOptions = {
    ...options,
    metadata: {
      ...(options.metadata || {}),
      attnLogDsply: {
        policyVersion: 2,
        visible: dsplyReqs && !duplicate,
        key,
        dedupeMs,
        aggregationKey: String(options.aggregationKey || key),
        priority: Number(options.priority) || 0,
        dsplyImmd: Boolean(options.dsplyImmd),
        identityPhrase,
      },
    },
  };
  const archiveRecord = archvLogRcrd(
    normalizedTag,
    normMsg,
    archiveOptions,
    now
  );
  window.SharedClient?.recordLogEvent?.(archiveRecord);
  // Archiving runs asynchronously; failure reduces persistence capability.
  const archivePromise = archivable
    ? store.append(archiveRecord).catch((error) => {
        logState.storageStatus = "error";
        logState.intlErrr = error?.message || String(error);
        console.error("[LifeLog] Event could not be archived:", error);
        return null;
      })
    : Promise.resolve(null);
  // Return values separately indicate the write condition and display result;
  // archivePromise confirms whether the write completed.
  if (duplicate || !dsplyReqs) {
    return { archived: archivable, displayed: false, archivePromise };
  }
  logState.lastRecordedAt.set(key, now);
  logState.lastShownAt.set(key, Date.now());
  const entry = {
    id: ++logState.sequence,
    key,
    tag: normalizedTag,
    message: normMsg,
    identityPhrase,
    primarySpecies: lifeLogSpecies(options.primarySpecies),
    startedAt: now,
    aggregationKey: String(options.aggregationKey || key),
    priority: Number(options.priority) || 0,
  };
  queueLogEntry(entry, {
    immediate: Boolean(options.dsplyImmd),
  });
  return {
    archived: archivable,
    displayed: true,
    queued: !logState.entries.includes(entry),
    entry,
    archivePromise,
  };
}

function lifeLogStbHas(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rcrdSurvNote(
  species,
  condition,
  entity,
  now = lifeLogNow(),
  options = {}
) {
  const normSpc = lifeLogSpecies(species);
  const messages = logText[normSpc]?.[condition];
  if (!messages?.length) return null;
  const sequence = Number(options.sequence) || 1;
  const entitySeed = Number(entity?.seed) || 0;
  const sessionId = options.sessionId ?? activeSession?.id ?? 0;
  const selectionSeed =
    (floor(entitySeed) ^
      Math.imul(sequence, 0x9e3779b1) ^
      lifeLogStbHas(`${normSpc}:${condition}`)) >>>
    0;
  const copyIndex = Math.min(
    messages.length - 1,
    floor(mulberry32(selectionSeed)() * messages.length)
  );
  const selectedCopy = messages[copyIndex];
  const key = options.ddpByCond
    ? `ecology-observation:${sessionId}:${normSpc}:${condition}`
    : `ecology-observation:${sessionId}:${normSpc}:${condition}:${floor(entitySeed)}:${sequence}`;
  return lifeLog.record("ECOLOGY", selectedCopy.message, {
    key,
    eventType: "ecology-observation",
    primarySpecies: normSpc,
    participantCount: options.participantCount,
    aggregationKey:
      options.aggregationKey ||
      `ecology-observation:${sessionId}:${normSpc}:${condition}`,
    priority: Number(options.priority) || 0,
    dedupeMs: Number(options.dedupeMs) || lifeLogConfig.dedupeMs,
    identityPhrase: selectedCopy.identityPhrase,
    metadata: {
      entitySeed,
      sessionId,
      sequence,
      copyIndex,
      condition,
      ...(options.metadata || {}),
    },
    now,
  });
}

function lifeLogSpcName(entity) {
  if (entity?.type === eco.lifeType.deepDiver) return "Deep Diver";
  return String(entity?.type || "possible life");
}

function rcrdSurvEvnt(
  kind,
  entity,
  now = lifeLogNow(),
  options = {}
) {
  if (!entity) return null;
  const type = lifeLogSpecies(entity.type);
  const name = lifeLogSpcName(entity);
  const sessionId = options.sessionId ?? activeSession?.id ?? 0;
  const seed = Number(entity.seed) || 0;
  if (kind === "simple") {
    return lifeLog.record(
      "ATTENTION SPENT",
      `Attention has reached a ${name}.`,
      {
        key: `attention-spent:${sessionId}:${type}`,
        eventType: "attention-simple",
        primarySpecies: type,
        participantCount: options.participantCount,
        dedupeMs: 12000,
        display: false,
        metadata: {
          ixKind: "simple",
          entitySeed: seed,
          sessionId,
        },
        now,
      }
    );
  }
  const sequence = options.sequence ?? Math.round(now);
  return lifeLog.record(
    "ATTENTION CAPTURED",
    `A ${name} encounter has completed.`,
    {
      key: `attention-captured:${type}:${seed}:${sequence}`,
      eventType: legacyEvent.attentionEncounterCompleted,
      primarySpecies: type,
      participantCount: options.participantCount,
      display: false,
      metadata: {
        ixKind: legacyEvent.encounterCompleted,
        entitySeed: seed,
        sessionId,
        sequence,
      },
      now,
    }
  );
}

function clrLogEntrs() {
  if (logState.displayTimer != null) {
    clearTimeout(logState.displayTimer);
    logState.displayTimer = null;
  }
  logState.entries.length = 0;
  logState.pendingEntries.length = 0;
  logState.lastRecordedAt.clear();
  logState.lastShownAt.clear();
  logState.seenArcEvnIds.clear();
  logState.lastInsertAt = -Infinity;
  logState.revision++;
  if (lifeLog.ensureElements()) {
    logState.list.replaceChildren();
    logState.root.dataset.empty = "true";
  }
}

function rndrLogEntrs(now = lifeLogNow()) {
  if (!lifeLog.ensureElements()) return;
  if (logState.rendRevs === logState.revision) return;
  const config = lifeLogConfig;
  const activeEntries = visLogEntrs();
  // Record positions before and after updating the DOM, move existing entries with FLIP,
  // and use the entrance animation for new entries.
  const previousTops = new Map(
    [...logState.list.children].map((child) => [
      child.dataset.entryId,
      child.getBoundingClientRect().top,
    ])
  );
  const existing = new Map(
    [...logState.list.children].map((child) => [
      child.dataset.entryId,
      child,
    ])
  );
  const rendEntrs = activeEntries.map((entry) => {
    const id = String(entry.id);
    let element = existing.get(id);
    const isNew = !element;
    if (!element) {
      element = lifeLog.createElement(entry);
    }
    element.getAnimations().forEach((animation) => animation.cancel());
    element.style.opacity = "1";
    element.style.transform = "translateY(0)";
    return { entry, id, element, isNew };
  });
  logState.list.replaceChildren(
    ...rendEntrs.map(({ element }) => element)
  );
  const finalTops = new Map(
    rendEntrs.map(({ id, element }) => [
      id,
      element.getBoundingClientRect().top,
    ])
  );
  rendEntrs.forEach(({ entry, id, element, isNew }) => {
    const previousTop = previousTops.get(id);
    const currentTop = finalTops.get(id);
    // Restored historical records retain their existing state; entries added during this run fade in.
    if (isNew && config.fadeInMs > 0 && !entry.restored) {
      element.animate(
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: config.fadeInMs, easing: "ease-out" }
      );
    } else if (Number.isFinite(previousTop) && Math.abs(previousTop - currentTop) > 0.5) {
      element.animate(
        [
          { transform: `translateY(${previousTop - currentTop}px)` },
          { transform: "translateY(0)" },
        ],
        { duration: config.moveMs, easing: "ease-in-out" }
      );
    }
  });
  logState.root.dataset.empty = String(
    activeEntries.length === 0
  );
  logState.rendRevs = logState.revision;
}

// Connect archival storage, restore recent records, and subscribe to subsequent events;
// retain temporary interface feedback if storage fails.
async function initializeLog() {
  const store = window.AttentionLogStoreApp;
  if (!store || logState.initialized) return;
  logState.initialized = true;
  lifeLog.setupSaveKey();
  const revsAtStrt = logState.revision;
// Subscribe to new events before reading recent records; if the
// display updates in the meantime, skip inserting historical records.
  logState.unsbStrg = store.subscribe?.(({ type, detail, state }) => {
    updtLogHlth(state);
    if (type === "event-appended" && detail?.external && detail.event) {
      ingestLogEvent(detail.event);
    }
  }) || null;
  try {
    const initialized = await store.init({ createSession: true });
    logState.activeSessionId = initialized.session?.id || null;
    logState.storageStatus = initialized.state.backend === "indexeddb"
      ? initialized.state.persistent ? "persistent" : "indexeddb"
      : "unavailable";
    updtLogHlth(initialized.state);
    if (initialized.session?.id) {
      const restored = await store.recentEvents(
        initialized.session.id,
        lifeLogConfig.maxBuffEntrs * 8
      );
      if (logState.revision !== revsAtStrt) return;
      const visRest = restored
        .filter((event) => event.metadata?.attnLogDsply?.visible !== false)
        .slice(-lifeLogConfig.maxBuffEntrs);
      for (const event of visRest) {
        ingestLogEvent(event, {
          restored: true,
          render: false,
        });
      }
      lifeLog.render();
    }
  } catch (error) {
    logState.storageStatus = "error";
    logState.intlErrr = error?.message || String(error);
    console.error("[LifeLog] Initialization failed:", error);
  }
}

// 7. Other systems send their changes to this survival log
// record accepts general entries; rcrdIx and rcrdObsr record interactions and observations respectively.
window.LifeLogApp = Object.freeze({
  record: lifeLog.record,
  exportJson: lifeLog.exportJson,
  rcrdIx: rcrdSurvEvnt,
  rcrdObsr: rcrdSurvNote,
});
