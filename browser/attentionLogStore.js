// File Overview
// Stores local ecological sessions and events in IndexedDB, independently
// from the shared-world state.

(() => {
  "use strict";

// I want to preserve how relationships change, so the archive records
// events, time, species, and the number of participants present.
// metadata accepts additional event information supplied by callers.
  const lifeType = window.EcologyConstants.lifeType;

// IndexedDB stores ecological events separately from cross-window control data.
  const databaseName = "attention-survival-log";
  const databaseVersion = 3;
  const schemaVersion = 2;
  const activeSessionKey = "active-session-id";
  const writerLeaseKey = "writer-lease";
  const leaseDurationMs = 15000;
  const leaseHeartbeatMs = 5000;
  const instanceId = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `window-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const listeners = new Set();
  const channel = typeof BroadcastChannel === "function"
    ? new BroadcastChannel("attention-survival-log-control")
    : null;
  let databasePromise = null;
  let initializationPromise = null;
  let heartbeatTimer = null;
  let writeChain = Promise.resolve();
  let successfulWrites = 0;
  let clearingAll = false;

  const state = {
    backend: "indexeddb",
    ready: false,
    persistent: false,
    health: "starting",
    error: null,
    activeSessionId: null,
    writerStatus: "inactive",
    writerOwnerId: null,
    pendingWrites: 0,
    failedWrites: 0,
    lastWriteAtEpochMs: null,
    quota: null,
  };

  function snapshot() {
    return { ...state, quota: state.quota ? { ...state.quota } : null, schemaVersion };
  }

  function notify(type, detail = {}, { broadcast = true } = {}) {
    const payload = { type, detail, state: snapshot() };
    for (const listener of listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error("[SurvivalLog] Status listener failed:", error);
      }
    }
    if (broadcast) channel?.postMessage({ type, detail, senderId: instanceId });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    listener({ type: "snapshot", detail: {}, state: snapshot() });
    return () => listeners.delete(listener);
  }

  // Convert a single IndexedDB request into a Promise; success means the request has returned a result.
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  // The transaction Promise waits for all writes to be committed.
  function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    });
  }

  function sessionRange(sessionId) {
    return IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]);
  }

  // A new run locks its identity and mode version when created;
  // statistics and final export data accumulate from an empty state.
  function createSessionRecord(now = Date.now()) {
    const id = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${now}-${Math.random().toString(16).slice(2)}`;
    return {
      id,
      startedAtEpochMs: now,
      startedAtIso: new Date(now).toISOString(),
      status: "active",
      nextSequence: 1,
      totalEvents: 0,
      speciesCounts: {},
      eventTypeCounts: {},
      schemaVersion,
    };
  }

  // Recent records and full exports are both read by session sequence;
  // extra indexes in older databases may remain.
  function ensureEventIndexes(events) {
    const indexes = [
      ["sessionSequence", ["sessionId", "sequence"]],
    ];
    for (const [name, keyPath] of indexes) {
      if (!events.indexNames.contains(name)) {
        events.createIndex(name, keyPath, { unique: false });
      }
    }
  }

  // IndexedDB initialization and storage health checks
  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        const events = database.objectStoreNames.contains("events")
          ? request.transaction.objectStore("events")
          : database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        ensureEventIndexes(events);
        if (!database.objectStoreNames.contains("sessions")) {
          database.createObjectStore("sessions", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("meta")) {
          database.createObjectStore("meta", { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error("IndexedDB could not open."));
      request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked by another page."));
    });
    return databasePromise;
  }

  async function updateQuotaStatus() {
    if (!navigator.storage?.estimate) return;
    try {
      const estimate = await navigator.storage.estimate();
      const usage = Math.max(0, Number(estimate.usage) || 0);
      const quota = Math.max(0, Number(estimate.quota) || 0);
      state.quota = {
        usage,
        quota,
        remaining: Math.max(0, quota - usage),
        usageRatio: quota > 0 ? usage / quota : 0,
      };
      if (state.quota.usageRatio >= 0.9) {
        state.health = "failed";
        state.error = "Browser storage is above 90% capacity.";
      } else if (state.quota.usageRatio >= 0.75 && state.health === "healthy") {
        state.health = "degraded";
      }
      notify("quota", {}, { broadcast: false });
    } catch {
      // Storage estimates are provided for browsers that support this interface.
    }
  }

  // After initialization, write, read back, and delete a test record
  // to verify that the current database can be read and written.
  async function runStorageSelfTest(database) {
    const key = `self-test-${instanceId}`;
    const transaction = database.transaction("meta", "readwrite");
    const store = transaction.objectStore("meta");
    store.put({ key, value: Date.now() });
    const result = await requestResult(store.get(key));
    if (!result || result.key !== key) {
      transaction.abort();
      throw new Error("Persistent storage self-test could not read its own write.");
    }
    store.delete(key);
    await transactionComplete(transaction);
  }

  // Open the database and request persistent storage; if initialization fails,
  // mark storage as unavailable and return an empty database reference.
  async function initializeStorage() {
    try {
      const database = await openDatabase();
      await runStorageSelfTest(database);
      if (navigator.storage?.persist) {
        try {
          state.persistent = Boolean(await navigator.storage.persist());
        } catch {
          state.persistent = false;
        }
      }
      state.ready = true;
      state.health = state.persistent ? "healthy" : "degraded";
      state.error = null;
      await updateQuotaStatus();
      notify("storage-ready");
      return database;
    } catch (error) {
      state.backend = "unavailable";
      state.ready = true;
      state.health = "failed";
      state.error = error?.message || String(error);
      notify("storage-failed");
      console.error("[SurvivalLog] Persistent storage unavailable:", error);
      return null;
    }
  }

  // Restore an active ecology run from the metadata pointer.
  async function readActiveSession(database) {
    if (!database) return null;
    const transaction = database.transaction(["meta", "sessions"], "readonly");
    const active = await requestResult(transaction.objectStore("meta").get(activeSessionKey));
    const session = active?.value
      ? await requestResult(transaction.objectStore("sessions").get(active.value))
      : null;
    await transactionComplete(transaction);
    state.activeSessionId = session?.status === "active" ? session.id : null;
    return session?.status === "active" ? session : null;
  }

  async function readSession(database, sessionId) {
    if (!database || !sessionId) return null;
    const transaction = database.transaction("sessions", "readonly");
    const session = await requestResult(transaction.objectStore("sessions").get(sessionId));
    await transactionComplete(transaction);
    return session || null;
  }

// Acquire the active run and write lease in the same transaction;
// a window that does not obtain the lease becomes a read-only follower.
  // This function was modified with the assistance of ChatGPT.
  async function acquireWriterAndSession(database) {
    if (!database) return null;
    const now = Date.now();
    const transaction = database.transaction(["meta", "sessions"], "readwrite");
    const meta = transaction.objectStore("meta");
    const sessions = transaction.objectStore("sessions");
    const lease = await requestResult(meta.get(writerLeaseKey));
    const active = await requestResult(meta.get(activeSessionKey));
    let session = active?.value
      ? await requestResult(sessions.get(active.value))
      : null;
    const leaseValue = lease?.value || null;
    // The lease uses a browser-window identifier and allows
    // another window to take over writing after it expires.
    const leaseAvailable =
      !leaseValue || leaseValue.ownerId === instanceId || leaseValue.expiresAtEpochMs <= now;
    if (!leaseAvailable) {
      await transactionComplete(transaction);
      state.activeSessionId = session?.status === "active" ? session.id : null;
      state.writerStatus = "follower";
      state.writerOwnerId = leaseValue.ownerId;
      state.health = "degraded";
      state.error = "Another browser window owns the archive writer lease.";
      notify("writer-follower");
      return session?.status === "active" ? session : null;
    }
    if (!session || session.status !== "active") {
      session = createSessionRecord(now);
      sessions.put(session);
      meta.put({ key: activeSessionKey, value: session.id });
    }
    meta.put({
      key: writerLeaseKey,
      value: {
        ownerId: instanceId,
        sessionId: session.id,
        acquiredAtEpochMs: leaseValue?.ownerId === instanceId
          ? leaseValue.acquiredAtEpochMs || now
          : now,
        expiresAtEpochMs: now + leaseDurationMs,
      },
    });
    await transactionComplete(transaction);
    state.activeSessionId = session.id;
    state.writerStatus = "active";
    state.writerOwnerId = instanceId;
    state.health = state.persistent ? "healthy" : "degraded";
    state.error = null;
    startHeartbeat(database);
    notify("writer-acquired", { sessionId: session.id });
    return session;
  }

  // The active writer window periodically renews the lease and immediately becomes a follower if
  // ownership changes, preventing duplicate writes from multiple windows.
  async function renewWriterLease(database) {
    if (!database || state.writerStatus !== "active") return false;
    const now = Date.now();
    try {
      const transaction = database.transaction("meta", "readwrite");
      const meta = transaction.objectStore("meta");
      const lease = await requestResult(meta.get(writerLeaseKey));
      if (lease?.value?.ownerId !== instanceId) {
        transaction.abort();
        throw new Error("Archive writer lease was transferred to another window.");
      }
      lease.value.expiresAtEpochMs = now + leaseDurationMs;
      meta.put(lease);
      await transactionComplete(transaction);
      return true;
    } catch (error) {
      stopHeartbeat();
      state.writerStatus = "follower";
      state.health = "failed";
      state.error = error?.message || String(error);
      notify("writer-lost");
      return false;
    }
  }

  // Clear the old timer before starting renewal so that
  // each window maintains a single write-lease heartbeat.
  function startHeartbeat(database) {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => renewWriterLease(database), leaseHeartbeatMs);
  }

  // Stop renewal and release the local timer reference; lease ownership
  // is then determined by expiration or a subsequent state update.
  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  async function init({ createSession = true } = {}) {
    if (!initializationPromise) initializationPromise = initializeStorage();
    const database = await initializationPromise;
    let session = null;
    if (database) {
      if (createSession && state.writerStatus === "active" && state.activeSessionId) {
        session = await readSession(database, state.activeSessionId);
      } else {
        session = createSession && state.writerStatus !== "ended"
          ? await acquireWriterAndSession(database)
          : await readActiveSession(database);
      }
    }
    return { database, session, state: snapshot() };
  }

  // Read the current active run so that follower windows can restore its state.
  async function activeSession() {
    const initialized = await init({ createSession: false });
    return initialized.session;
  }

  // Allow writes only while this window holds the lease and
  // the run is valid; disable the entry point during cleanup.
  function canWrite() {
    return (
      !clearingAll &&
      state.backend === "indexeddb" &&
      state.writerStatus === "active" &&
      Boolean(state.activeSessionId)
    );
  }

  // Events from different sources are normalized into common fields,
  // keeping reads and exports compatible across runs.
  function normalizeEvent(event, sessionId) {
    const occurredAtEpochMs = Number(event.occurredAtEpochMs) || Date.now();
    // Normalization accepts ecological event fields; perception snapshots must be converted into
    // anonymous ecological outcomes before reaching this boundary.
    return {
      sessionId,
      occurredAtEpochMs,
      occurredAtIso: new Date(occurredAtEpochMs).toISOString(),
      experienceElapsedMs: Number(event.experienceElapsedMs) || 0,
      eventType: String(event.eventType || "ecology-changed"),
      tag: String(event.tag || "ECOLOGY CHANGED"),
      message: String(event.message || ""),
      primarySpecies: String(event.primarySpecies || lifeType.basicCell),
      participantCount: Math.max(0, Math.floor(Number(event.participantCount) || 0)),
      metadata: event.metadata && typeof event.metadata === "object" ? { ...event.metadata } : {},
      schemaVersion,
    };
  }

// Each ecological change enters the archive in sequence
// and accumulates into readable session statistics.
  // This function was modified with the assistance of ChatGPT.
  async function appendOnce(event) {
    if (clearingAll) {
      const error = new Error("The archive is being cleared.");
      error.code = "ARCHIVE_NOT_WRITABLE";
      throw error;
    }
    const initialized = await init({ createSession: true });
    if (!initialized.database || !canWrite()) {
      const error = new Error(state.error || "This window is not the active archive writer.");
      error.code = "ARCHIVE_NOT_WRITABLE";
      throw error;
    }
    const sessionId = state.activeSessionId;
    const transaction = initialized.database.transaction(
      ["events", "sessions", "meta"],
      "readwrite"
    );
    const sessions = transaction.objectStore("sessions");
    const meta = transaction.objectStore("meta");
    const session = await requestResult(sessions.get(sessionId));
    const lease = await requestResult(meta.get(writerLeaseKey));
    if (
      !session ||
      session.status !== "active" ||
      lease?.value?.ownerId !== instanceId ||
      lease.value.expiresAtEpochMs <= Date.now()
    ) {
      transaction.abort();
      const error = new Error("The ecology session or writer lease is no longer active.");
      error.code = "ARCHIVE_SESSION_ENDED";
      throw error;
    }
    const baseRecord = normalizeEvent(event, sessionId);
    const record = {
      ...baseRecord,
      sequence: Math.max(1, Number(session.nextSequence) || 1),
    };
    session.nextSequence = record.sequence + 1;
    session.totalEvents = record.sequence;
    session.speciesCounts = { ...(session.speciesCounts || {}) };
    session.eventTypeCounts = { ...(session.eventTypeCounts || {}) };
    session.speciesCounts[record.primarySpecies] =
      (session.speciesCounts[record.primarySpecies] || 0) + 1;
    session.eventTypeCounts[record.eventType] =
      (session.eventTypeCounts[record.eventType] || 0) + 1;
    sessions.put(session);
    lease.value.expiresAtEpochMs = Date.now() + leaseDurationMs;
    meta.put(lease);
    const id = await requestResult(transaction.objectStore("events").add(record));
    await transactionComplete(transaction);
    successfulWrites++;
    state.lastWriteAtEpochMs = Date.now();
    state.error = null;
    state.health = state.persistent ? "healthy" : "degraded";
    if (successfulWrites % 100 === 0) updateQuotaStatus();
    const storedEvent = { ...record, id };
    notify("event-appended", { event: storedEvent });
    return storedEvent;
  }

  // Events are written serially along one Promise chain; transient storage failures are retried,
  // while loss of ownership stops writing immediately.
  // This function was modified with the assistance of ChatGPT.
  function append(event) {
    if (clearingAll) {
      const error = new Error("The archive is being cleared.");
      error.code = "ARCHIVE_NOT_WRITABLE";
      return Promise.reject(error);
    }
    state.pendingWrites++;
    notify("write-pending", {}, { broadcast: false });
    // Each queued task is attempted up to three times, including the initial write.
    const run = async () => {
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await appendOnce(event);
        } catch (error) {
          lastError = error;
          if (/ARCHIVE_(NOT_WRITABLE|SESSION_ENDED)/.test(error?.code || "")) break;
          await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
        }
      }
      state.failedWrites++;
      state.health = "failed";
      state.error = lastError?.message || "Archive write failed after retries.";
      notify("write-failed");
      throw lastError || new Error(state.error);
    };
    const result = writeChain.then(run, run);
    writeChain = result.catch(() => {});
    return result.finally(() => {
      state.pendingWrites = Math.max(0, state.pendingWrites - 1);
      notify("write-settled", {}, { broadcast: false });
    });
  }

  // Read recent events from the end of the session-sequence index,
  // then restore chronological order for display in the interface.
  async function recentEvents(sessionId, limit = 12) {
    const initialized = await init({ createSession: false });
    if (!initialized.database || !sessionId) return [];
    const maximum = Math.max(0, Math.floor(Number(limit) || 0));
    const transaction = initialized.database.transaction("events", "readonly");
    const index = transaction.objectStore("events").index("sessionSequence");
    const events = [];
    await new Promise((resolve, reject) => {
      const request = index.openCursor(sessionRange(sessionId), "prev");
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || events.length >= maximum) {
          resolve(true);
          return;
        }
        events.push(cursor.value);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
    await transactionComplete(transaction);
    return events.reverse();
  }

  // Snapshot the session and all of its events within the same read transaction.
  async function exportSnapshot(sessionId) {
    const initialized = await init({ createSession: false });
    if (!initialized.database || !sessionId) return null;
    const transaction = initialized.database.transaction(["sessions", "events"], "readonly");
    const session = await requestResult(transaction.objectStore("sessions").get(sessionId));
    if (!session) {
      await transactionComplete(transaction);
      return null;
    }
    const events = await requestResult(
      transaction.objectStore("events").index("sessionSequence").getAll(sessionRange(sessionId))
    );
    await transactionComplete(transaction);
    const ordered = events.sort((first, second) => first.sequence - second.sequence || first.id - second.id);
    return {
      session,
      events: ordered,
      eventCount: ordered.length,
      lastSequence: Math.max(0, Number(session.nextSequence) - 1 || 0),
    };
  }

  // Full cleanup first waits for the write queue to finish and stops the lease heartbeat,
  // then clears the relevant stores in one transaction.
  async function clearAll() {
    clearingAll = true;
    await writeChain.catch(() => {});
    const initialized = await init({ createSession: false });
    if (!initialized.database) {
      clearingAll = false;
      return false;
    }
    try {
      stopHeartbeat();
      const transaction = initialized.database.transaction(
        ["events", "sessions", "meta"],
        "readwrite"
      );
      transaction.objectStore("events").clear();
      transaction.objectStore("sessions").clear();
      transaction.objectStore("meta").clear();
      await transactionComplete(transaction);
      state.activeSessionId = null;
      state.writerStatus = "inactive";
      state.writerOwnerId = null;
      state.pendingWrites = 0;
      state.error = null;
      notify("archive-cleared", {});
      return true;
    } catch (error) {
      clearingAll = false;
      throw error;
    }
  }

// Release the write lease held by the current window so another window can continue recording.
  async function releaseWriter() {
    stopHeartbeat();
    const database = await initializationPromise;
    if (!database || state.writerStatus !== "active") return false;
    try {
      const transaction = database.transaction("meta", "readwrite");
      const meta = transaction.objectStore("meta");
      const lease = await requestResult(meta.get(writerLeaseKey));
      if (lease?.value?.ownerId === instanceId) meta.delete(writerLeaseKey);
      await transactionComplete(transaction);
    } catch {
      return false;
    }
    state.writerStatus = "inactive";
    state.writerOwnerId = null;
    notify("writer-released");
    return true;
  }

  channel?.addEventListener("message", (event) => {
    const message = event.data || {};
    if (message.senderId === instanceId) return;
    notify(
      message.type || "external-update",
      { ...(message.detail || {}), external: true },
      { broadcast: false }
    );
  });

  window.addEventListener("pagehide", () => {
    releaseWriter();
  });

  window.AttentionLogStoreApp = Object.freeze({
    init,
    append,
    activeSession,
    recentEvents,
    exportSnapshot,
    clearAll,
    releaseWriter,
    canWrite,
    subscribe,
    snapshot,
  });
})();
