// File Overview
// Persists the shared ecology, anonymous connections, presence,
// and ecological events in PostgreSQL.

"use strict";

// The server stores the shared ecology, anonymous device connections, and presence state;
// participant perception data remains on the local device.
// Device identifiers support connection leases, event deduplication,
// and offline retransmission, allowing shared memory to persist.
const { Pool } = require("pg");
const rules = require("../shared/sharedEcologyRules.js");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
  max: 5,
  idleTimeoutMillis: 30000,
});

// A single world record receives changes from every device,
// allowing them to care for the same ecology together.
// This function was modified with the assistance of ChatGPT.
async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecology_world (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      initialized BOOLEAN NOT NULL DEFAULT FALSE,
      cycle_id BIGINT NOT NULL DEFAULT 1,
      revision BIGINT NOT NULL DEFAULT 0,
      species_counts JSONB NOT NULL,
      ecology_influence JSONB NOT NULL,
      decay_carry JSONB NOT NULL,
      last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ecology_events (
      event_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      revision BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ecology_devices (
      device_id TEXT PRIMARY KEY,
      present_count SMALLINT NOT NULL DEFAULT 0,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ecology_devices_last_seen_idx
      ON ecology_devices(last_seen_at);
    CREATE INDEX IF NOT EXISTS ecology_events_created_idx
      ON ecology_events(created_at);
    ALTER TABLE ecology_world
      ADD COLUMN IF NOT EXISTS cycle_id BIGINT NOT NULL DEFAULT 1;
    CREATE TABLE IF NOT EXISTS ecology_log_entries (
      id BIGSERIAL PRIMARY KEY,
      source_event_id TEXT UNIQUE NOT NULL,
      cycle_id BIGINT NOT NULL,
      revision BIGINT NOT NULL,
      event_type TEXT NOT NULL,
      primary_species TEXT,
      participant_count SMALLINT NOT NULL DEFAULT 0,
      count_delta JSONB NOT NULL,
      influence_delta JSONB NOT NULL,
      species_counts JSONB NOT NULL,
      ecology_influence JSONB NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ecology_log_cycle_created_idx
      ON ecology_log_entries(cycle_id, created_at);
    CREATE INDEX IF NOT EXISTS ecology_log_created_idx
      ON ecology_log_entries(created_at);
  `);
  await pool.query(
    `INSERT INTO ecology_world (
      id, species_counts, ecology_influence, decay_carry
    ) VALUES (1, $1::jsonb, $2::jsonb, $2::jsonb)
    ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(rules.initialCounts), JSON.stringify(rules.emptyInfluence())]
  );
  await pruneEcologyHistory();
}

// Keep only the rolling one-month server archive and its transport records.
// The current shared-world snapshot is stored separately and is not affected.
async function pruneEcologyHistory() {
  await pool.query(
    "DELETE FROM ecology_log_entries WHERE created_at < NOW() - INTERVAL '1 month'"
  );
  await pool.query(
    "DELETE FROM ecology_events WHERE created_at < NOW() - INTERVAL '1 month'"
  );
}

// Database rows are normalized at the service boundary, exposing species counts, ecological influence,
// version, last evaluation time, update time, and authority information.
function publicWorld(row, authority = {}) {
  return {
    cycleId: Number(row.cycle_id || 1),
    revision: Number(row.revision || 0),
    speciesCounts: rules.normalizeCounts(row.species_counts),
    ecologyInfluence: rules.normalizeInfluence(row.ecology_influence),
    lastEvaluatedAt: new Date(row.last_evaluated_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    authority,
  };
}

function emptyCountDelta() {
  return Object.fromEntries(rules.species.map((type) => [type, 0]));
}

function normalizeCountDelta(value) {
  return Object.fromEntries(
    rules.species.map((type) => [type, Math.round(Number(value?.[type]) || 0)])
  );
}

function countDifference(before, after) {
  return Object.fromEntries(
    rules.species.map((type) => [
      type,
      Number(after?.[type] || 0) - Number(before?.[type] || 0),
    ])
  );
}

function influenceDifference(before, after) {
  return Object.fromEntries(
    rules.species.map((type) => [
      type,
      Math.max(0, Number(after?.[type] || 0) - Number(before?.[type] || 0)),
    ])
  );
}

// The shared archive stores ecological outcomes without device identifiers,
// gaze coordinates, calibration data, or participant identity.
async function appendEcologyLog(client, row, entry = {}) {
  const countDelta = normalizeCountDelta(entry.countDelta);
  const influenceDelta = rules.normalizeInfluence(entry.influenceDelta);
  await client.query(
    `INSERT INTO ecology_log_entries (
       source_event_id, cycle_id, revision, event_type, primary_species,
       participant_count, count_delta, influence_delta, species_counts,
       ecology_influence, metadata, created_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb,
       $10::jsonb, $11::jsonb, $12
     )
     ON CONFLICT (source_event_id) DO NOTHING`,
    [
      entry.sourceEventId,
      Number(row.cycle_id || 1),
      Number(row.revision || 0),
      String(entry.eventType || "ecology.change"),
      entry.primarySpecies ? String(entry.primarySpecies) : null,
      Math.max(0, Math.min(32767, Math.round(Number(entry.participantCount) || 0))),
      JSON.stringify(countDelta),
      JSON.stringify(influenceDelta),
      JSON.stringify(rules.normalizeCounts(row.species_counts)),
      JSON.stringify(rules.normalizeInfluence(row.ecology_influence)),
      JSON.stringify(entry.metadata || {}),
      entry.createdAt instanceof Date ? entry.createdAt.toISOString() : new Date().toISOString(),
    ]
  );
}

function publicLogEntry(row) {
  return {
    sequence: Number(row.id),
    cycleId: Number(row.cycle_id),
    revision: Number(row.revision),
    occurredAtIso: new Date(row.created_at).toISOString(),
    eventType: row.event_type,
    primarySpecies: row.primary_species || null,
    participantCount: Number(row.participant_count || 0),
    countDelta: normalizeCountDelta(row.count_delta),
    influenceDelta: rules.normalizeInfluence(row.influence_delta),
    worldAfter: {
      speciesCounts: rules.normalizeCounts(row.species_counts),
      ecologyInfluence: rules.normalizeInfluence(row.ecology_influence),
    },
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

async function activeDeviceCount(client, now = new Date()) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM ecology_devices
      WHERE last_seen_at >= $1::timestamptz - INTERVAL '45 seconds'`,
    [now.toISOString()]
  );
  return Number(result.rows[0]?.count || 0);
}

async function activeParticipantCount(client, now = new Date()) {
  const result = await client.query(
    `SELECT COALESCE(SUM(present_count), 0)::int AS count
       FROM ecology_devices
      WHERE last_seen_at >= $1::timestamptz - INTERVAL '45 seconds'`,
    [now.toISOString()]
  );
  return Number(result.rows[0]?.count || 0);
}

// Lock the world record within a transaction and process device-submitted changes serially.
// This function was modified with the assistance of ChatGPT.
async function lockAndAdvanceWorld(client, now = new Date()) {
  const result = await client.query(
    "SELECT * FROM ecology_world WHERE id = 1 FOR UPDATE"
  );
  let row = result.rows[0];
  const activeDevices = await activeDeviceCount(client, now);
  const start = new Date(row.last_evaluated_at).getTime();
  const end = now.getTime();
  if (activeDevices === 0 && end > start) {
    const previousCounts = rules.normalizeCounts(row.species_counts);
    const advanced = rules.advanceUnattendedCounts(
      row.species_counts,
      row.decay_carry,
      start,
      end
    );
    const changed = rules.species.some(
      (type) => advanced.counts[type] !== Number(row.species_counts[type])
    );
    const updated = await client.query(
      `UPDATE ecology_world
          SET species_counts = $1::jsonb,
              decay_carry = $2::jsonb,
              last_evaluated_at = $3,
              revision = revision + $4,
              updated_at = CASE WHEN $4 = 1 THEN NOW() ELSE updated_at END
        WHERE id = 1
        RETURNING *`,
      [
        JSON.stringify(advanced.counts),
        JSON.stringify(advanced.carry),
        now.toISOString(),
        changed ? 1 : 0,
      ]
    );
    row = updated.rows[0];
    if (changed) {
      await appendEcologyLog(client, row, {
        sourceEventId: `system:${row.cycle_id}:${row.revision}:unattended`,
        eventType: "world.unattended-evolution",
        participantCount: 0,
        countDelta: countDifference(previousCounts, advanced.counts),
        influenceDelta: rules.emptyInfluence(),
        metadata: { kind: "lifecycle", effectiveMs: advanced.effectiveMs },
        createdAt: now,
      });
    }
  } else if (end > start) {
    const updated = await client.query(
      `UPDATE ecology_world
          SET last_evaluated_at = $1
        WHERE id = 1
        RETURNING *`,
      [now.toISOString()]
    );
    row = updated.rows[0];
  }
  return row;
}

// Wrap database operations in a transaction and release the connection in finally.
async function transact(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await handler(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Before reading shared-world state, advance unattended population decay while still holding the
// transaction lock so the returned snapshot remains consistent with the current time.
async function loadWorld(authority = {}) {
  return transact(async (client) =>
    publicWorld(await lockAndAdvanceWorld(client), authority)
  );
}

// This function was modified with the assistance of ChatGPT.
async function hello({ deviceId, presentCount, bootstrap }, authority = {}) {
  return transact(async (client) => {
    let row = await lockAndAdvanceWorld(client);
    let initializedNow = false;
    if (!row.initialized && bootstrap) {
      const counts = rules.normalizeCounts(bootstrap.speciesCounts);
      const influence = rules.normalizeInfluence(bootstrap.ecologyInfluence);
      const result = await client.query(
        `UPDATE ecology_world
            SET initialized = TRUE,
                species_counts = $1::jsonb,
                ecology_influence = $2::jsonb,
                revision = revision + 1,
                last_evaluated_at = NOW(),
                updated_at = NOW()
          WHERE id = 1
          RETURNING *`,
        [JSON.stringify(counts), JSON.stringify(influence)]
      );
      row = result.rows[0];
      initializedNow = true;
    }
    await touchDevice(client, deviceId, presentCount);
    if (initializedNow) {
      await appendEcologyLog(client, row, {
        sourceEventId: `system:${row.cycle_id}:${row.revision}:initialize`,
        eventType: "world.initialize",
        participantCount: await activeParticipantCount(client),
        countDelta: emptyCountDelta(),
        influenceDelta: rules.emptyInfluence(),
        metadata: { kind: "lifecycle" },
      });
    }
    return publicWorld(row, authority);
  });
}

// Clamp the present-participant count before writing a heartbeat
// so the server receives a range-validated value.
async function touchDevice(client, deviceId, presentCount) {
  const safeCount = Math.max(
    0,
    Math.min(
      rules.maximumParticipants,
      Math.round(Number(presentCount) || 0)
    )
  );
  await client.query(
    `INSERT INTO ecology_devices(device_id, present_count, last_seen_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (device_id) DO UPDATE
       SET present_count = EXCLUDED.present_count,
           last_seen_at = NOW()`,
    [deviceId, safeCount]
  );
}

// A heartbeat advances the shared ecology before updating the device's present-participant count.
async function heartbeat({ deviceId, presentCount }) {
  return transact(async (client) => {
    await lockAndAdvanceWorld(client);
    await touchDevice(client, deviceId, presentCount);
  });
}

// Event identifiers provide idempotency for retransmission after disconnection.
// This function was modified with the assistance of ChatGPT.
async function contribute(event, authority = {}) {
  return transact(async (client) => {
    let row = await lockAndAdvanceWorld(client);
    const previousCounts = rules.normalizeCounts(row.species_counts);
    const previousInfluence = rules.normalizeInfluence(row.ecology_influence);
    const inserted = await client.query(
      `INSERT INTO ecology_events(event_id, device_id, event_type, payload, revision)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        event.eventId,
        event.deviceId,
        event.eventType,
        JSON.stringify(event.payload || {}),
        Number(row.revision || 0) + 1,
      ]
    );
    if (inserted.rowCount > 0) {
      const applied = rules.applyContribution(
        row.species_counts,
        row.ecology_influence,
        event.payload?.countDelta,
        event.payload?.influenceDelta
      );
      const result = await client.query(
        `UPDATE ecology_world
            SET initialized = TRUE,
                species_counts = $1::jsonb,
                ecology_influence = $2::jsonb,
                revision = revision + 1,
                last_evaluated_at = NOW(),
                updated_at = NOW()
          WHERE id = 1
          RETURNING *`,
        [JSON.stringify(applied.counts), JSON.stringify(applied.influence)]
      );
      row = result.rows[0];
    }
    await touchDevice(client, event.deviceId, event.presentCount);
    if (inserted.rowCount > 0) {
      const nextCounts = rules.normalizeCounts(row.species_counts);
      const nextInfluence = rules.normalizeInfluence(row.ecology_influence);
      const countDelta = countDifference(previousCounts, nextCounts);
      const influenceDelta = influenceDifference(previousInfluence, nextInfluence);
      const changedSpecies = rules.species.filter(
        (type) => countDelta[type] !== 0 || influenceDelta[type] > 0
      );
      await appendEcologyLog(client, row, {
        sourceEventId: event.eventId,
        eventType: event.eventType,
        primarySpecies: changedSpecies.length === 1 ? changedSpecies[0] : null,
        participantCount: await activeParticipantCount(client),
        countDelta,
        influenceDelta,
        metadata: { kind: "state-change" },
      });
    }
    return publicWorld(row, authority);
  });
}

// Store a semantic interaction alongside the current shared-world snapshot;
// transport identity is used only for idempotency and is not copied into the archive.
async function recordInteraction(event) {
  return transact(async (client) => {
    const row = await lockAndAdvanceWorld(client);
    await touchDevice(client, event.deviceId, event.presentCount);
    await appendEcologyLog(client, row, {
      sourceEventId: event.eventId,
      eventType: event.eventType,
      primarySpecies: event.primarySpecies,
      participantCount: await activeParticipantCount(client),
      countDelta: emptyCountDelta(),
      influenceDelta: rules.emptyInfluence(),
      metadata: { kind: "interaction" },
    });
    return true;
  });
}

// Administrative exports return an anonymous chronological archive and the latest world state.
// This function was modified with the assistance of ChatGPT.
async function exportEcologyLog(filters = {}, authority = {}) {
  return transact(async (client) => {
    const worldRow = await lockAndAdvanceWorld(client);
    const boundaryResult = await client.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS maximum
         FROM ecology_log_entries
        WHERE created_at >= NOW() - INTERVAL '1 month'`
    );
    const latestSequence = Number(boundaryResult.rows[0]?.maximum || 0);
    const throughSequence = Math.max(
      0,
      Math.min(latestSequence, Number(filters.throughSequence) || latestSequence)
    );
    const conditions = ["created_at >= NOW() - INTERVAL '1 month'"];
    const values = [];
    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };
    if (filters.from) addCondition("created_at >= ?::timestamptz", filters.from);
    if (filters.to) addCondition("created_at <= ?::timestamptz", filters.to);
    if (filters.cycleId) addCondition("cycle_id = ?::bigint", filters.cycleId);
    if (filters.afterSequence) addCondition("id > ?::bigint", filters.afterSequence);
    addCondition("id <= ?::bigint", throughSequence);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const maximum = Math.max(1, Math.min(5000, Number(filters.limit) || 5000));
    values.push(maximum + 1);
    const result = await client.query(
      `SELECT *
         FROM ecology_log_entries
         ${where}
        ORDER BY id ASC
        LIMIT $${values.length}`,
      values
    );
    const truncated = result.rows.length > maximum;
    const rows = truncated ? result.rows.slice(0, maximum) : result.rows;
    return {
      schema: "attention-survival-log/shared-export-v1",
      scope: "shared-ecology",
      retention: "one-month",
      exportedAtIso: new Date().toISOString(),
      filters: {
        from: filters.from || null,
        to: filters.to || null,
        cycleId: filters.cycleId || null,
      },
      eventCount: rows.length,
      truncated,
      exportBoundarySequence: throughSequence,
      nextAfterSequence: truncated && rows.length
        ? Number(rows[rows.length - 1].id)
        : null,
      world: publicWorld(worldRow, authority),
      events: rows.map(publicLogEntry),
    };
  });
}

// Administrative reset starts a new ecology cycle while retaining the anonymous archive.
async function clearWorld() {
  return transact(async (client) => {
    await client.query("DELETE FROM ecology_events");
    await client.query("DELETE FROM ecology_devices");
    const result = await client.query(
      `UPDATE ecology_world
          SET initialized = FALSE,
              cycle_id = cycle_id + 1,
              revision = revision + 1,
              species_counts = $1::jsonb,
              ecology_influence = $2::jsonb,
              decay_carry = $2::jsonb,
              last_evaluated_at = NOW(),
              updated_at = NOW()
        WHERE id = 1
        RETURNING *`,
      [JSON.stringify(rules.initialCounts), JSON.stringify(rules.emptyInfluence())]
    );
    const row = result.rows[0];
    await appendEcologyLog(client, row, {
      sourceEventId: `system:${row.cycle_id}:${row.revision}:reset`,
      eventType: "world.reset",
      participantCount: 0,
      countDelta: emptyCountDelta(),
      influenceDelta: rules.emptyInfluence(),
      metadata: { kind: "lifecycle" },
    });
    return publicWorld(row);
  });
}

module.exports = {
  pool,
  migrate,
  loadWorld,
  hello,
  heartbeat,
  contribute,
  recordInteraction,
  exportEcologyLog,
  pruneEcologyHistory,
  clearWorld,
};
