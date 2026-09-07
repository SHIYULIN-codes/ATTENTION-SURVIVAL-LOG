// File Overview
// Provides a common rendering entry point for the five lifeform types.

// 1. Five lifeforms enter the world view through a common rendering entry point
// Lifeform files retain low-level rendering methods tightly coupled to their forms;
// this file standardizes their selection and invocation.

function drawLifeEntity(entity, frame) {
  if (!entity || !lifeViewByType[entity.type]) return false;
  entity.draw?.(frame);
  return true;
}

function drawLifeVector(entity, frame) {
  if (!entity || !lifeViewByType[entity.type]) return false;
  if (typeof entity.drawVector === "function") {
    entity.drawVector(frame);
  } else {
    entity.draw?.(frame);
  }
  return true;
}

const sharedLifeView = Object.freeze({
  draw: drawLifeEntity,
  drawVector: drawLifeVector,
});

const lifeViewByType = Object.freeze({
  [eco.lifeType.predator]: sharedLifeView,
  [eco.lifeType.parasite]: sharedLifeView,
  [eco.lifeType.roamer]: sharedLifeView,
  [eco.lifeType.deepDiver]: sharedLifeView,
  [eco.lifeType.guardian]: sharedLifeView,
});

// 2. WorldView calls only the common entry point and no longer
// selects rendering methods for specific lifeform classes.
window.LifeView = Object.freeze({
  draw: drawLifeEntity,
  drawVector: drawLifeVector,
  forType(type) {
    return lifeViewByType[type] || null;
  },
});
