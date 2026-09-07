// File Overview
// Provides shared mathematical, timing, scheduling, and spatial-indexing utilities.

// All species share numerical, scheduling, and spatial-indexing utilities.
(() => {
  "use strict";

  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));

  const cubicSmoothstep = (value) =>
    value * value * (3 - 2 * value);

  function smoothstep01(value) {
    const progress = clamp(value, 0, 1);
    return cubicSmoothstep(progress);
  }

  // Generate a reproducible random sequence from a seed;
  // the same seed and call order produce the same values.
  function createMulberry32(seed) {
    let state = (seed >>> 0) || 0x12345678;
    return function randomUnit() {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  const circleTrigCache = new Map();

// Circular trigonometric values are cached by segment count, giving
// different lifeforms a stable, lightweight basis for their outlines.
  function circleTrig(segments) {
    let trig = circleTrigCache.get(segments);
    if (trig) return trig;
    const cosine = window.cos || Math.cos;
    const sine = window.sin || Math.sin;
    const cosines = new Float64Array(segments);
    const sines = new Float64Array(segments);
    for (let index = 0; index < segments; index++) {
      const angle = (Math.PI * 2 * index) / segments;
      cosines[index] = cosine(angle);
      sines[index] = sine(angle);
    }
    trig = { cosines, sines };
    circleTrigCache.set(segments, trig);
    return trig;
  }

  // Preallocate sample and point arrays for organic rings, reusing
  // memory between animation frames to reduce garbage-collection jitter.
  function createCircularNoiseBuffer(segments) {
    return {
      samples: new Float64Array(segments),
      scratch: new Float64Array(segments),
      offsets: new Float64Array(segments),
      points: Array.from({ length: segments }, () => [0, 0]),
    };
  }

  function sampleCircularNoise(
    state,
    time,
    amplitude,
    seed,
    smoothingPasses = 2
  ) {
    const segments = state.samples.length;
    let samples = state.samples;
    let scratch = state.scratch;
    const offsets = state.offsets || (state.offsets = new Float64Array(segments));
    const trig = circleTrig(segments);
    const noiseAt = window.noise;

    for (let index = 0; index < segments; index++) {
      samples[index] = noiseAt(
        seed + trig.cosines[index] * 0.9,
        seed * 0.73 + trig.sines[index] * 0.9,
        time
      );
    }

    for (let pass = 0; pass < smoothingPasses; pass++) {
      for (let index = 0; index < segments; index++) {
        const previous2 = samples[(index - 2 + segments) % segments];
        const previous1 = samples[(index - 1 + segments) % segments];
        const next1 = samples[(index + 1) % segments];
        const next2 = samples[(index + 2) % segments];
        scratch[index] =
          (previous2 + previous1 * 2 + samples[index] * 3 + next1 * 2 + next2) /
          9;
      }
      [samples, scratch] = [scratch, samples];
    }

    state.samples = samples;
    state.scratch = scratch;
    let average = 0;
    for (const sample of samples) average += sample;
    average /= segments;
    const waveScale = amplitude * 5;
    for (let index = 0; index < segments; index++) {
      offsets[index] = (samples[index] - average) * waveScale;
    }
    return { offsets, trig };
  }

  // Project smooth noise offsets onto points around the circumference;
  // the returned array can be reused for a lifeform's organic outline.
  function createOrganicRingPoints(
    diameter,
    time,
    amplitude,
    seed,
    segments = 36,
    buffer = null
  ) {
    const state = buffer || createCircularNoiseBuffer(segments);
    const radius = diameter * 0.5;
    const { offsets, trig } = sampleCircularNoise(
      state,
      time,
      amplitude,
      seed
    );
    for (let index = 0; index < segments; index++) {
      state.points[index][0] =
        trig.cosines[index] * (radius + offsets[index]);
      state.points[index][1] =
        trig.sines[index] * (radius + offsets[index]);
    }
    return state.points;
  }

  window.NumericApp = Object.freeze({
    clamp,
    cubicSmoothstep,
    smoothstep01,
    createMulberry32,
    circleTrig,
    createCircularNoiseBuffer,
    sampleCircularNoise,
    createOrganicRingPoints,
  });
})();

// Per-frame tasks and lifeform changes converge here so all systems share the same frame timing.
const runtimeCore = (() => {
  "use strict";

  const now = () => performance.now();

// The frame budget distributes heavier work across successive frames,
// keeping runtime performance smooth and consistent.
  class FrameBudget {
    constructor(budgets = {}) {
      this.budgets = { ...budgets };
      this.used = Object.create(null);
      this.queues = new Map();
      this.frameNumber = 0;
    }

    beginFrame(frameNumber) {
      this.frameNumber = frameNumber;
      this.used = Object.create(null);
    }

    setBudget(lane, limit) {
      this.budgets[lane] = Math.max(0, Number(limit) || 0);
    }

    // Check the channel's remaining capacity before accounting for the cost,
    // allowing callers to defer work safely when the frame budget is exceeded.
    tryConsume(lane, cost = 1) {
      const limit = this.budgets[lane] ?? Infinity;
      const used = this.used[lane] || 0;
      if (used + cost > limit) return false;
      this.used[lane] = used + cost;
      return true;
    }

    enqueue(lane, key, task, cost = 1) {
      let queue = this.queues.get(lane);
      if (!queue) {
        queue = new Map();
        this.queues.set(lane, queue);
      }
      queue.set(key, { task, cost });
    }

    clearQueue(lane) {
      if (lane == null) this.queues.clear();
      else this.queues.delete(lane);
    }

    cancel(lane, key) {
      return this.queues.get(lane)?.delete(key) || false;
    }

    // Execute tasks in registration order within the time and cost budgets,
    // leaving remaining work for subsequent frames.
    // This method was modified with the assistance of ChatGPT.
    drain(lane, maxMs = Infinity) {
      const queue = this.queues.get(lane);
      if (!queue?.size) return 0;
      const startedAt = now();
      let completed = 0;
      for (const [key, item] of queue) {
        if (completed > 0 && now() - startedAt >= maxMs) break;
        if (!this.tryConsume(lane, item.cost)) break;
        queue.delete(key);
        item.task();
        completed++;
      }
      return completed;
    }
  }

// The spatial index helps lifeforms find nearby companions, boundaries, and targets more quickly.
  class SpatialHash {
    constructor(cellSize = 160) {
      this.cellSize = cellSize;
      this.cells = new Map();
      this.order = new Map();
      this.sourceCount = 0;
    }

    key(cellX, cellY) {
      return `${cellX},${cellY}`;
    }

    clear() {
      this.cells.clear();
      this.order.clear();
      this.sourceCount = 0;
    }

    // Preserve the original order as objects enter their spatial cells,
    // making proximity-query results reproducible.
    insert(item, x = item.x, y = item.y, order = this.sourceCount) {
      const cellX = Math.floor(x / this.cellSize);
      const cellY = Math.floor(y / this.cellSize);
      const key = this.key(cellX, cellY);
      let cell = this.cells.get(key);
      if (!cell) {
        cell = [];
        this.cells.set(key, cell);
      }
      cell.push(item);
      this.order.set(item, order);
      this.sourceCount++;
    }

    rebuild(items) {
      this.clear();
      for (let i = 0; i < items.length; i++) this.insert(items[i], items[i].x, items[i].y, i);
      return this;
    }

    // Collect candidates from spatial cells overlapping the query circle,
    // leaving exact distance checks to the caller so different hit rules can be reused.
    // This method was modified with the assistance of ChatGPT.
    queryRadius(x, y, radius, out = []) {
      out.length = 0;
      const minCellX = Math.floor((x - radius) / this.cellSize);
      const maxCellX = Math.floor((x + radius) / this.cellSize);
      const minCellY = Math.floor((y - radius) / this.cellSize);
      const maxCellY = Math.floor((y + radius) / this.cellSize);
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
          const cell = this.cells.get(this.key(cellX, cellY));
          if (cell) out.push(...cell);
        }
      }
      out.sort((a, b) => this.order.get(a) - this.order.get(b));
      return out;
    }
  }

  const qualityProfiles = Object.freeze({
    visual: Object.freeze({
      budgets: Object.freeze({ cacheRefresh: 10 }),
      timeBudgets: Object.freeze({ cacheRefresh: 8 }),
    }),
    balanced: Object.freeze({
      budgets: Object.freeze({ cacheRefresh: 8 }),
      timeBudgets: Object.freeze({ cacheRefresh: 6 }),
    }),
    reserve: Object.freeze({
      budgets: Object.freeze({ cacheRefresh: 6 }),
      timeBudgets: Object.freeze({ cacheRefresh: 4 }),
    }),
  });

  // The application runtime centrally owns the scheduler and spatial indexes.
  class AppRuntime {
    constructor() {
      this.scheduler = new FrameBudget(qualityProfiles.visual.budgets);
      this.timeBudgets = { ...qualityProfiles.visual.timeBudgets };
      this.spatialIndexes = new Map();
      this.frameNumber = 0;
    }

    beginFrame() {
      this.frameNumber++;
      this.scheduler.beginFrame(this.frameNumber);
    }

    enqueue(lane, key, task, cost = 1) {
      this.scheduler.enqueue(lane, key, task, cost);
    }

    drain(lane) {
      return this.scheduler.drain(lane, this.timeBudgets[lane] ?? Infinity);
    }

    clearQueue(lane) {
      this.scheduler.clearQueue(lane);
    }

    cancel(lane, key) {
      return this.scheduler.cancel(lane, key);
    }

    // Retrieve a spatial index by purpose; if absent, create one with the specified cell size.
    getSpatialIndex(name, cellSize = 160) {
      let index = this.spatialIndexes.get(name);
      if (!index) {
        index = new SpatialHash(cellSize);
        this.spatialIndexes.set(name, index);
      }
      return index;
    }

    buildLifeIndex(name, items, cellSize = 160) {
      return this.getSpatialIndex(name, cellSize).rebuild(items);
    }

    queryLifeIndex(name, x, y, radius, out) {
      const index = this.spatialIndexes.get(name);
      return index ? index.queryRadius(x, y, radius, out) : null;
    }

    // Quality tiers update both the per-frame task count and execution-time budget,
    // keeping the visual degradation strategy consistent.
    setQuality(name) {
      const profile = qualityProfiles[name];
      if (!profile) return false;
      for (const [lane, budget] of Object.entries(profile.budgets)) {
        this.scheduler.setBudget(lane, budget);
      }
      this.timeBudgets = { ...profile.timeBudgets };
      return true;
    }
  }

  window.AppRuntime = new AppRuntime();
  return Object.freeze({ SpatialHash });
})();

// The shared lifecycle through which lifeforms enter the world, form relationships, and leave.
(() => {
  "use strict";

  const { SpatialHash } = runtimeCore;
  const runtime = window.AppRuntime;
  if (!runtime) {
    throw new Error("lifeCycle requires runtimeCore.");
  }

  class EntityLifecycle {
    constructor({ cellSize = 192 } = {}) {
      this.nextId = 1;
      this.records = new Map();
      this.entityIds = new WeakMap();
      this.byType = new Map();
      this.pendingAdds = new Map();
      this.pendingRemovals = new Map();
      this.positionRecords = [];
      this.spatial = new SpatialHash(cellSize);
      this.spatialDirty = true;
      this.typeOf = (entity) => entity.type || "Unknown";
      this.positionOf = (entity) => ({ x: entity.x || 0, y: entity.y || 0 });
      this.disposeEntity = null;
      this.onAdded = null;
      this.onRemoved = null;
    }

    configure(options = {}) {
      if (options.typeOf) this.typeOf = options.typeOf;
      if (options.positionOf) this.positionOf = options.positionOf;
      if (options.disposeEntity) this.disposeEntity = options.disposeEntity;
      if (options.onAdded) this.onAdded = options.onAdded;
      if (options.onRemoved) this.onRemoved = options.onRemoved;
      return this;
    }

    resolve(entityOrId) {
      if (typeof entityOrId === "string") return this.records.get(entityOrId) || null;
      const id = entityOrId && this.entityIds.get(entityOrId);
      return id ? this.records.get(id) || null : null;
    }

    register(entity, metadata = {}, { silent = false } = {}) {
      if (!entity || typeof entity !== "object") throw new TypeError("Entity must be an object.");
      const existing = this.resolve(entity);
      if (existing) return existing;
      const id = metadata.id || `entity-${this.nextId++}`;
      if (this.records.has(id)) throw new Error(`Entity id already exists: ${id}`);
      const type = metadata.type || this.typeOf(entity);
      const record = { id, type, entity, metadata: { ...metadata, id: undefined, type: undefined } };
      this.records.set(id, record);
      this.entityIds.set(entity, id);
      let typeRecords = this.byType.get(type);
      if (!typeRecords) {
        typeRecords = new Set();
        this.byType.set(type, typeRecords);
      }
      typeRecords.add(record);
      this.spatialDirty = true;
      if (!silent) this.onAdded?.(record);
      return record;
    }

    // The batch entry point accepts both bare entities and records with metadata,
    // while ultimately reusing the single-entity registration rules.
    registerMany(entries, options) {
      return entries.map((entry) =>
        entry?.entity
          ? this.register(entry.entity, entry.metadata || {}, options)
          : this.register(entry, {}, options)
      );
    }

    unregister(entityOrId, reason = "removed", { dispose = true, silent = false } = {}) {
      const record = this.resolve(entityOrId);
      if (!record) return null;
      this.records.delete(record.id);
      this.entityIds.delete(record.entity);
      const typeRecords = this.byType.get(record.type);
      typeRecords?.delete(record);
      if (typeRecords && !typeRecords.size) this.byType.delete(record.type);
      this.pendingAdds.delete(record.entity);
      this.pendingRemovals.delete(record.entity);
      this.spatialDirty = true;
      if (dispose) this.disposeEntity?.(record.entity, reason, record);
      if (!silent) this.onRemoved?.(record, reason);
      return record;
    }

    queueAdd(entity, metadata = {}) {
      if (this.resolve(entity) || this.pendingAdds.has(entity)) return false;
      this.pendingAdds.set(entity, metadata);
      return true;
    }

// Removal requests first enter the end-of-frame queue, allowing
// lifeforms to complete the current frame before leaving the world.
    queueRemove(entityOrId, reason = "removed") {
      const record = this.resolve(entityOrId);
      const entity = record?.entity || entityOrId;
      if (!entity || typeof entity !== "object") return false;
      if (this.pendingAdds.delete(entity)) {
        this.disposeEntity?.(entity, "cancelled-before-add", null);
        return true;
      }
      if (!record || this.pendingRemovals.has(entity)) return false;
      this.pendingRemovals.set(entity, reason);
      return true;
    }

    // At the safe boundary, commit removals before additions.
    flushPending() {
      const removed = [];
      const added = [];
      const removals = [...this.pendingRemovals];
      this.pendingRemovals.clear();
      for (const [entity, reason] of removals) {
        const record = this.unregister(entity, reason);
        if (record) removed.push(record);
      }
      const additions = [...this.pendingAdds];
      this.pendingAdds.clear();
      for (const [entity, metadata] of additions) {
        added.push(this.register(entity, metadata));
      }
      return { added, removed };
    }

    clear(reason = "reset", { dispose = true, silent = false } = {}) {
      const records = [...this.records.values()];
      this.pendingAdds.clear();
      this.pendingRemovals.clear();
      for (const record of records) this.unregister(record.id, reason, { dispose, silent });
      this.spatial.clear();
      this.positionRecords.length = 0;
      this.spatialDirty = true;
      return records.length;
    }

    beginFrame() {
      this.spatialDirty = true;
    }

    // Extract current world positions from entity records and rebuild the proximity index so subsequent
    // queries share the same frame snapshot.
    buildLifeIndex() {
      this.positionRecords.length = 0;
      for (const record of this.records.values()) {
        const position = this.positionOf(record.entity, record);
        this.positionRecords.push({ x: position.x, y: position.y, record });
      }
      this.spatial.rebuild(this.positionRecords);
      this.spatialDirty = false;
    }

    queryNearby(source, radius, options = {}) {
      if (this.spatialDirty) this.buildLifeIndex();
      const sourceRecord = this.resolve(source);
      const sourceEntity = sourceRecord?.entity || source;
      const position = this.positionOf(sourceEntity, sourceRecord);
      const candidates = this.spatial.queryRadius(position.x, position.y, radius, []);
      const radius2 = radius * radius;
      const output = options.out || [];
      output.length = 0;
      for (const item of candidates) {
        const record = item.record;
        if (!options.includeSource && record.entity === sourceEntity) continue;
        if (options.type && record.type !== options.type) continue;
        const dx = item.x - position.x;
        const dy = item.y - position.y;
        if (dx * dx + dy * dy > radius2) continue;
        if (options.filter && !options.filter(record.entity, record, sourceEntity)) continue;
        output.push(record.entity);
      }
      return output;
    }

    getByType(type) {
      return Array.from(this.byType.get(type) || [], (record) => record.entity);
    }

  }

  const entities = new EntityLifecycle();
  runtime.entities = entities;
})();
