// File Overview
// Defines species identifiers and ecological boundaries shared by the browser and server.

// Species names and ecological boundaries form the work's shared language,
// through which the client and server understand the world.
(function (root, factory) {
  const constants = factory();
  if (typeof module === "object" && module.exports) module.exports = constants;
  if (root) root.EcologyConstants = constants;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const lifeType = Object.freeze({
    basicCell: "OriginalCell",
    predator: "Predator",
    parasite: "Parasite",
    roamer: "Roamer",
    deepDiver: "DeepDiver",
    guardian: "Guardian",
  });
  const lifeName = Object.freeze({
    [lifeType.basicCell]: "Basic Cell",
    [lifeType.predator]: "Predator",
    [lifeType.parasite]: "Parasite",
    [lifeType.roamer]: "Roamer",
    [lifeType.deepDiver]: "Deep Diver",
    [lifeType.guardian]: "Guardian",
  });
  const species = Object.freeze([
    lifeType.predator,
    lifeType.parasite,
    lifeType.roamer,
    lifeType.deepDiver,
    lifeType.guardian,
  ]);
  const initialCounts = Object.freeze({
    Predator: 16,
    Parasite: 5,
    Roamer: 13,
    DeepDiver: 9,
    Guardian: 7,
  });
  const minimumCounts = Object.freeze({
    Predator: 9,
    Parasite: 3,
    Roamer: 7,
    DeepDiver: 5,
    Guardian: 4,
  });
  const lifeRates = Object.freeze({
    active: 1,
    openUnattended: 0.1,
    closed: 0.003,
  });
  const eventKind = Object.freeze({
    encounter: "encounter",
    encounterCompleted: "encounter-completed",
    attentionEncounterCompleted: "attention-encounter-completed",
    guardianCare: "guardian.care",
  });
  const legacyEvent = Object.freeze({
    encounter: "formal",
    encounterPause: "formal-interaction",
    encounterCompleted: "formal-completed",
    attentionEncounterCompleted: "attention-formal-completed",
    guardianCare: "guardian.recovery",
    guardianGroupPrefix: "guardian-formal",
    encounterSlotPrefix: "formal",
  });

  // Legacy spellings and separator variants converge on the current species constants;
  // all other values safely fall back to BasicCell.
  function normalizeLifeType(value) {
    const key = String(value || "")
      .replace(/[\s_-]+/g, "")
      .toLowerCase();
    const aliases = {
      basiccell: lifeType.basicCell,
      originalcell: lifeType.basicCell,
      predator: lifeType.predator,
      parasite: lifeType.parasite,
      roamer: lifeType.roamer,
      deepdiver: lifeType.deepDiver,
      guardian: lifeType.guardian,
    };
    return aliases[key] || lifeType.basicCell;
  }

  return Object.freeze({
    lifeType,
    lifeName,
    species,
    initialCounts,
    minimumCounts,
    lifeRates,
    eventKind,
    legacyEvent,
    normalizeLifeType,
    maximumParticipants: 3,
    hardMaximum: 82,
  });
});
