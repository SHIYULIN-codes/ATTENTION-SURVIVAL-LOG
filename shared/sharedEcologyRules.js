// File Overview
// Defines shared rules for population limits, ecological influence,
// state reconciliation, and unattended decay.

// The browser and server share rules for species counts, ecological influence,
// and population decay while no participants are present.
(function (root, factory) {
  const constants = typeof module === "object" && module.exports
    ? require("./ecologyConstants.js")
    : root.EcologyConstants;
  const rules = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = rules;
  if (root) {
    root.SharedRules = rules;
    root.SharedEcologyRules = rules;
  }
})(typeof window !== "undefined" ? window : globalThis, function (constants) {
  "use strict";

  const {
    species,
    initialCounts,
    minimumCounts,
    lifeRates,
    maximumParticipants,
    hardMaximum,
  } = constants;
  const averageLifespanMs = Object.freeze({
    Predator: 15 * 60 * 1000,
    Parasite: 17 * 60 * 1000,
    Roamer: 14 * 60 * 1000,
    DeepDiver: 16.5 * 60 * 1000,
    Guardian: 21.5 * 60 * 1000,
  });

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function integer(value, fallback = 0) {
    return Math.round(finite(value, fallback));
  }

  function emptyInfluence() {
    return Object.fromEntries(species.map((type) => [type, 0]));
  }

  // Apply the minimum population for each species and the overall population limit;
  // when the limit is exceeded, remove eligible individuals from later species in sequence.
  // This function was modified with the assistance of ChatGPT.
  function normalizeCounts(value, fallback = initialCounts) {
    const result = {};
    for (const type of species) {
      result[type] = Math.max(
        minimumCounts[type],
        integer(value?.[type], fallback[type])
      );
    }
    let total = species.reduce((sum, type) => sum + result[type], 0);
    if (total <= hardMaximum) return result;
    for (const type of [...species].reverse()) {
      if (total <= hardMaximum) break;
      const removable = Math.max(0, result[type] - minimumCounts[type]);
      const reduction = Math.min(removable, total - hardMaximum);
      result[type] -= reduction;
      total -= reduction;
    }
    return result;
  }

  function normalizeInfluence(value) {
    const result = {};
    for (const type of species) {
      result[type] = Math.max(0, finite(value?.[type]));
    }
    return result;
  }

// After all participants leave, lifespan continues to advance
// at the configured unattended rate. Waiting is also part of this work.
  function effectiveUnattendedMs(startedAt, endedAt) {
    const start = finite(startedAt);
    const end = finite(endedAt, start);
    if (!(end > start)) return 0;
    return Math.max(0, (end - start) * lifeRates.closed);
  }

  // Convert the effective unattended duration into the expected population reduction,
  // carrying any fractional remainder below one individual into the next calculation.
  // This function was modified with the assistance of ChatGPT.
  function advanceUnattendedCounts(counts, carry, startedAt, endedAt) {
    const nextCounts = normalizeCounts(counts);
    const nextCarry = normalizeInfluence(carry);
    const effectiveMs = effectiveUnattendedMs(startedAt, endedAt);
    const removed = emptyInfluence();
    if (effectiveMs <= 0) {
      return { counts: nextCounts, carry: nextCarry, removed, effectiveMs: 0 };
    }
    for (const type of species) {
      const expectedDeaths =
        nextCarry[type] +
        (effectiveMs / averageLifespanMs[type]) * nextCounts[type];
      const available = Math.max(0, nextCounts[type] - minimumCounts[type]);
      const deaths = Math.min(available, Math.floor(expectedDeaths));
      nextCounts[type] -= deaths;
      removed[type] = deaths;
      nextCarry[type] = deaths < available ? expectedDeaths - deaths : 0;
    }
    return {
      counts: nextCounts,
      carry: nextCarry,
      removed,
      effectiveMs,
    };
  }

// Each contribution leaves a limited but distinct change;
// the shared ecology gradually grows from these small effects.
  // This function was modified with the assistance of ChatGPT.
  function applyContribution(counts, influence, countDelta, influenceDelta) {
    const nextCounts = { ...normalizeCounts(counts) };
    const nextInfluence = { ...normalizeInfluence(influence) };
    for (const type of species) {
      const countChange = Math.max(-10, Math.min(10, integer(countDelta?.[type])));
      const influenceChange = Math.max(
        0,
        Math.min(5, finite(influenceDelta?.[type]))
      );
      nextCounts[type] += countChange;
      nextInfluence[type] += influenceChange;
      if (countChange > 0 && (type === "Parasite" || type === "Roamer")) {
        nextInfluence[type] += countChange;
      }
    }
    return {
      counts: normalizeCounts(nextCounts),
      influence: normalizeInfluence(nextInfluence),
    };
  }

  return Object.freeze({
    species,
    initialCounts,
    minimumCounts,
    averageLifespanMs,
    maximumParticipants,
    hardMaximum,
    rates: lifeRates,
    emptyInfluence,
    normalizeCounts,
    normalizeInfluence,
    effectiveUnattendedMs,
    advanceUnattendedCounts,
    applyContribution,
  });
});
