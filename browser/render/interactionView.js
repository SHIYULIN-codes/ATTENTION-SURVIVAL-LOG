// File Overview
// Visualizes scanning, connection, protection, care, and regeneration
// between participants and lifeforms.

// 1. Care becomes a process that can be felt together
// Expanding scans, flowing connections, and emerging seeds reveal how care takes place.

// 2. From searching and approach to protection and regeneration
// This view maintains rendering state such as progressX, progressY, and linkStates;
// the system layer advances the relationship of care itself.
function drawGrdProgArc(guardian, progress, alphaScale = 1) {
  if (!guardian || progress <= 0 || alphaScale <= 0) return;
  const position = careProgPos(guardian);
  const progressColor = guardCfg.progressColor;
  const repairScale = Number.isFinite(guardian.guardRprScl)
    ? guardian.guardRprScl
    : 1;
  const now = guardian.actvClckMs ?? frame.now;
// These progress arcs also emerge from the Guardian's body;
// I want participants to recognize the process of care through the same contour language.
  const waveState = guardian.getWaveState(now);
  const start = PI * 0.6 + guardian.r1 + 0.07;
  const end = PI * 2.1 + guardian.r1;
  push();
  translate(position.x, position.y);
  scale(prdtDomn.otherScale);
  rotate(guardian.rot);
  scale(
    eco.drawScale *
      guardian.sz *
      scaleOf(guardian.type) *
      guardian.b *
      repairScale
  );
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  applyGlowStyle(lifeGlow.guardian);
  stroke(
    progressColor[0],
    progressColor[1],
    progressColor[2],
    guardCfg.progressAlpha * alphaScale
  );
  strokeWeight(guardCfg.progressWeight);
  // Extend one outer-ring segment, expressing progress through the existing form.
  guardian.drawWavyArc(
    waveState,
    165,
    start,
    lerp(start, end, progress),
    guardCfg.outerRingAmp,
    870
  );
  applyGlowStyle(lifeGlow.none);
  pop();
}

function carePerdWave(profile, angle) {
  const count = profile.length;
  if (!count) return 0;
  const wrappedAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const position = (wrappedAngle / TWO_PI) * count;
  const index = floor(position) % count;
  const progress = position - floor(position);
  const previous = profile[(index - 1 + count) % count];
  const current = profile[index];
  const next = profile[(index + 1) % count];
  const following = profile[(index + 2) % count];
  const progress2 = progress * progress;
  const progress3 = progress2 * progress;
  return (
    ((-progress3 + 3 * progress2 - 3 * progress + 1) * previous +
      (3 * progress3 - 6 * progress2 + 4) * current +
      (-3 * progress3 + 3 * progress2 + 3 * progress + 1) * next +
      progress3 * following) /
    6
  );
}

function careNatWave(angle, progress) {
  const profileAngle =
    angle +
    care.state.wavePrflRot +
    progress * guardCfg.scanWavRotDrf;
  const primary = carePerdWave(
    care.state.waveProfile,
    profileAngle
  );
  const secondary = carePerdWave(
    care.state.wavePrflNext,
    profileAngle
  );
  const morphProgress =
    cubicSmoothstep(progress) *
    guardCfg.scanWavMrpAmn;
  return lerp(primary, secondary, morphProgress);
}

// Draw outward-expanding ring feedback when care begins,
// expressing a state transition as a perceptible wave of recovery.
function drawCarRppRin(
  radius,
  alpha,
  pulsePhase,
  amplitudeScale = 1,
  weightScale = 1
) {
  const col = guardCfg.progressColor;
  // Use a preset segment count to produce a stable closed contour.
  const segmentCount = 192;
  const pulse = 0.5 + 0.5 * sin(pulsePhase);
  const pulseOffset =
    sin(pulsePhase) * guardCfg.scanPulseAmp;
  const waveSizeProg = clamp(
    radius / max(1, care.state.maximumRadius),
    0,
    1
  );
  const waveSizeEase =
    cubicSmoothstep(waveSizeProg);
  // The scan begins near-circular; as its range expands, individual
  // contours emerge and a sense of life appears at the spatial boundary.
  const shpShowProg = clamp(
    radius / max(1, guardCfg.scanShpShowRad),
    0,
    1
  );
  const shapeReveal =
    cubicSmoothstep(shpShowProg);
  const waveAmplitude =
    guardCfg.scanWaveAmp *
    lerp(
      guardCfg.scanWavAmpMinS,
      guardCfg.scanWavAmpMaxS,
      waveSizeEase
    );
  stroke(
    col[0],
    col[1],
    col[2],
    alpha *
      lerp(
        guardCfg.scanPlsAlphMin,
        1,
        pulse
      )
  );
  strokeWeight(guardCfg.scanWaveWeight * weightScale);
  beginShape();
  for (let index = 0; index <= segmentCount; index++) {
    const angle = (index / segmentCount) * TWO_PI;
    const naturalWave =
      careNatWave(angle, waveSizeEase) * waveAmplitude;
    const contourAngle =
      angle +
      care.state.wavePrflRot +
      waveSizeEase * guardCfg.scanWavRotDrf * 0.35;
    const contourWave = carePerdWave(
      care.state.waveCntrPrfl,
      contourAngle
    );
    const cntrAmpl = min(
      guardCfg.scanCntrMaxAmp,
      radius * guardCfg.scanCntrRadScl
    );
    // Global elliptical, eccentric, and triangular components overlay local noise,
    // giving the scan range a lifeform-like shape.
    const globalShape = care.state.waveGlblShp;
    const globalContour = globalShape
      ? radius *
        (globalShape.ellipticity *
          cos(2 * (angle - globalShape.ellipseAngle)) +
          globalShape.lopsidedness *
            cos(angle - globalShape.lopsidedAngle) +
          globalShape.triangularity *
            cos(3 * (angle - globalShape.triAngl)))
      : 0;
    const waveRadius =
      radius +
      pulseOffset * amplitudeScale * shapeReveal +
      (naturalWave + contourWave * cntrAmpl + globalContour) *
        amplitudeScale *
        shapeReveal;
    vertex(
      care.state.centerX + cos(angle) * waveRadius,
      care.state.centerY + sin(angle) * waveRadius
    );
  }
  endShape(CLOSE);
}

function drawCarScaWav(ctx) {
  if (care.state.phase !== "scanning") return;
  // All durations are scaled by the rhythm of care, keeping
  // scan visuals synchronized with ecological action speed.
  const scanTimings = careScanTmngs();
  const scanDurationMs = scaleCareMs(
    scanTimings.durationMs
  );
  const scanFadeInMs = scaleCareMs(
    scanTimings.fadeInMs
  );
  const scanFadeOutMs = scaleCareMs(
    scanTimings.fadeOutMs
  );
  const scanLatFadStrM = scaleCareMs(
    scanTimings.lateFadeStrtMs
  );
  const scanLateFadeMs = scaleCareMs(
    scanTimings.lateFadeMs
  );
  const progress = clamp(
    care.state.phaseElapsedMs / scanDurationMs,
    0,
    1
  );
  const radius = care.state.maximumRadius * progress;
  const fadeInProgress = clamp(
    care.state.phaseElapsedMs / scanFadeInMs,
    0,
    1
  );
  const glowFadeIn =
    cubicSmoothstep(fadeInProgress);
  const mainFadeIn = 1 - (1 - fadeInProgress) * (1 - fadeInProgress);
  // Calculate tail-end fading separately from overall fade-out so the contour weakens before departing.
  const fadeOutProg = clamp(
    (care.state.phaseElapsedMs -
      (scanDurationMs - scanFadeOutMs)) /
      scanFadeOutMs,
    0,
    1
  );
  const fadeOut =
    1 - cubicSmoothstep(fadeOutProg);
  const lateFadeProg = clamp(
    (care.state.phaseElapsedMs - scanLatFadStrM) /
      scanLateFadeMs,
    0,
    1
  );
  const lateFadeEase =
    cubicSmoothstep(lateFadeProg);
  const lateAlphaScale = lerp(
    1,
    guardCfg.scanLatAlpScl,
    lateFadeEase
  );
  // The glow appears more slowly than the main line, keeping the scan range legible.
  const glowFade = glowFadeIn * fadeOut * lateAlphaScale;
  const mainFade = mainFadeIn * fadeOut * lateAlphaScale;
  const pulsePhase =
    ctx.now * guardCfg.scanPulseSpeed;
  push();
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  applyGlowStyle(lifeGlow.none);
  const scanColor = guardCfg.progressColor;
  drawingContext.save();
  // Two screen-blended glow layers and one crisp main line reuse the same geometry.
  drawingContext.globalCompositeOperation = "screen";
  drawingContext.shadowColor = `rgba(${scanColor[0]}, ${scanColor[1]}, ${scanColor[2]}, ${guardCfg.scanGloOtrShdA})`;
  drawingContext.shadowBlur = guardCfg.scanGloOtrBlu;
  drawCarRppRin(
    radius,
      guardCfg.scanWaveAlpha *
      guardCfg.scanGloOtrAlpS *
      glowFade,
    pulsePhase,
    1,
    guardCfg.scanGloOtrWghS
  );
  drawingContext.restore();
  drawingContext.save();
  drawingContext.globalCompositeOperation = "screen";
  drawingContext.shadowColor = `rgba(${scanColor[0]}, ${scanColor[1]}, ${scanColor[2]}, ${guardCfg.scanGloShdAlp})`;
  drawingContext.shadowBlur = guardCfg.scanGlowBlur;
  drawCarRppRin(
    radius,
      guardCfg.scanWaveAlpha *
      guardCfg.scanGloAlpScl *
      glowFade,
    pulsePhase,
    1,
    guardCfg.scanGloWghScl
  );
  drawingContext.restore();
  drawCarRppRin(
    radius,
    guardCfg.scanWaveAlpha * mainFade,
    pulsePhase
  );
  applyGlowStyle(lifeGlow.none);
  pop();
}

// Snapshot each Guardian's current glow intensity when care ends
// so fade-out can complete independently of cleared session state.
function bgnCarGloFad(guardians, now) {
  for (let index = 0; index < guardians.length; index++) {
    const guardian = guardians[index];
    if (!guardian) continue;
    const position = careSourcePos(guardian);
    const ecologyScale = Number.isFinite(guardian.careScale)
      ? guardian.careScale
      : 1;
    careGlowFades.push({
      guardian,
      startAt: now,
      x: position.x,
      y: position.y,
      radius:
        infoRadius(guardian) *
        ecologyScale *
        guardCfg.userGlowScl *
        (index === 0
          ? guardCfg.userGlowSrcScl
          : 1),
      alphaScale:
        index === 0
          ? guardCfg.userGloSrcAlp
          : 1,
      durationMs: scaleCareMs(
        guardCfg.userGloFadOutM
      ),
      fllwsGuard: !guardian.repairRetired,
    });
  }
}

// Map plus signs produced by detection from source-local coordinates to the current visual pose so they
// remain attached to the body during scaling and movement.
function detcCarPluPos(source, plus) {
  const center = careSourcePos(source);
  const drawScale =
    eco.drawScale * source.sz * scaleOf(source.type) * source.b;
  const localX = Number.isFinite(plus.visualX)
    ? plus.visualX
    : cos(plus.angle) * plus.radius;
  const localY = Number.isFinite(plus.visualY)
    ? plus.visualY
    : sin(plus.angle) * plus.radius;
  return {
    x:
      center.x +
      (localX * cos(source.rot) - localY * sin(source.rot)) * drawScale,
    y:
      center.y +
      (localX * sin(source.rot) + localY * cos(source.rot)) * drawScale,
    drawScale,
  };
}

function carePlusPos(target, plus, index, now) {
  const liveCenter = worldPos(target);
  const center = {
    x: Number.isFinite(target.returnVisX)
      ? target.returnVisX
      : liveCenter.x,
    y: Number.isFinite(target.returnVisY)
      ? target.returnVisY
      : liveCenter.y,
  };
  const targetScale = Number.isFinite(target.careScale)
    ? target.careScale
    : 1;
  const angle =
    plus.attnWndrPhs +
    index * 2.399 +
    sin(now * 0.0012 + plus.phase) * 0.08;
  const radius =
    infoRadius(target) * targetScale *
    (0.7 + (index % 4) * 0.075);
  return {
    x: center.x + cos(angle) * radius,
    y: center.y + sin(angle) * radius,
    angle,
  };
}

// This function was modified with the assistance of ChatGPT.
function drawDetcPlss(ctx) {
  // Cross-species limitation or cancellation takes ownership of drifting symbols;
  // ordinary care continues using the Guardian's own rendering.
  if (
    care.state.interveneKind !== "cross-limit" &&
    !care.state.canceling
  ) {
    return;
  }
  const links = care.state.limitLinks.filter(
    (link) => link.guardian && link.target
  );
  if (!links.length) return;
  const col = eco.lifeColor.Guardian;
  push();
  strokeCap(ROUND);
  applyGlowStyle(lifeGlow.guardian);
  // Each relationship reads its own approach or return progress,
  // with each Guardian using an independent animation clock.
  for (const link of links) {
    if (
      ![
        "cross-approaching",
        "cross-attached",
        "cross-returning",
        "cross-abandoning",
      ].includes(link.state)
    ) {
      continue;
    }
    const returning =
      link.state === "cross-returning" || link.state === "cross-abandoning";
    const abandoning = link.state === "cross-abandoning";
    const apprProg = clamp(link.crssApprProg || 0, 0, 1);
    let returnProgress = 0;
    let linkEnhn = apprProg;
    let linkAlphEnhn = apprProg;
    // returning withdraws an established relationship, while abandoning interrupts an approach;
    // the two states draw symbols back from opposite endpoints.
    if (returning) {
      const rawRtrnProg = clamp(
        link.crssRtrElaMs /
          guardCfg.crossReturnMs,
        0,
        1
      );
      returnProgress =
        cubicSmoothstep(rawRtrnProg);
      linkEnhn = abandoning
        ? apprProg * (1 - returnProgress)
        : 1 - returnProgress;
      const alphaFadeStart = max(
        0,
        guardCfg.crossReturnMs -
          guardCfg.crssAlphOutMs
      );
      const alphaProgress = clamp(
        (link.crssRtrElaMs - alphaFadeStart) /
          guardCfg.crssAlphOutMs,
        0,
        1
      );
      const esdAlphProg =
        cubicSmoothstep(alphaProgress);
      linkAlphEnhn =
        (abandoning ? apprProg : 1) * (1 - esdAlphProg);
    }
    // Symbols interpolate between the Guardian's original position and the target surface,
    // expressing the formation and withdrawal of a relationship of care.
    for (let index = 0; index < link.guardian.driftPluses.length; index++) {
      const plus = link.guardian.driftPluses[index];
      const home = detcCarPluPos(link.guardian, plus);
      const surface = carePlusPos(
        link.target,
        plus,
        index,
        ctx.now
      );
      const actvSrfcProg = abandoning
        ? apprProg * (1 - returnProgress)
        : apprProg;
      const x = returning
        ? abandoning
          ? lerp(home.x, surface.x, actvSrfcProg)
          : lerp(surface.x, home.x, returnProgress)
        : lerp(home.x, surface.x, apprProg);
      const y = returning
        ? abandoning
          ? lerp(home.y, surface.y, actvSrfcProg)
          : lerp(surface.y, home.y, returnProgress)
        : lerp(home.y, surface.y, apprProg);
      const baseSize =
        plus.size *
        driftCfg.sizeMul *
        home.drawScale;
      const plusSize = baseSize *
        lerp(1, guardCfg.crossSizeScale, linkEnhn);
      const baseAlpha = Number.isFinite(plus.visualAlpha)
        ? plus.visualAlpha
        : plus.alpha;
      // Map original symbol brightness into the care-enhancement range, preserving individual variation.
      const careFadeProg = clamp(
        (baseAlpha - driftCfg.idleAlphaMin) /
          max(
            0.001,
            driftCfg.idleAlphaMax -
              driftCfg.idleAlphaMin
          ),
        0,
        1
      );
      const enhancedAlpha = lerp(
        guardCfg.crossAlphaMin,
        guardCfg.crossAlphaMax,
        careFadeProg
      );
      const plusAlpha = lerp(
        baseAlpha,
        enhancedAlpha,
        linkAlphEnhn
      ) * careIxFadeAlph();
      const lineWeight = max(
        driftCfg.minScrnWght,
        plus.weight *
          driftCfg.weightMul *
          home.drawScale
      );
      stroke(col[0], col[1], col[2], plusAlpha);
      strokeWeight(
        lineWeight *
          lerp(1, guardCfg.crssWghtScl, linkEnhn) *
          link.guardian.drftSymblWght(plus)
      );
      push();
      translate(x, y);
      const srfcRotPwr = returning
        ? returnProgress
        : 1 - apprProg;
      rotate(surface.angle * 0.12 * srfcRotPwr);
      line(-plusSize, 0, plusSize, 0);
      const verticalScale = link.guardian.driftSymbolY(plus);
      if (verticalScale > 0.001) {
        line(0, -plusSize * verticalScale, 0, plusSize * verticalScale);
      }
      pop();
    }
  }
  applyGlowStyle(lifeGlow.none);
  pop();
}

// Convert care-phase progress into a fade-in/fade-out envelope.
function guardCareFade(progress) {
  const fadeShare = max(
    0.001,
    guardCfg.careFloFadShr
  );
  const fadeIn = clamp(progress / fadeShare, 0, 1);
  const fadeOut = clamp((1 - progress) / fadeShare, 0, 1);
  const fadeInEased = cubicSmoothstep(fadeIn);
  const fadeOutEased = cubicSmoothstep(fadeOut);
  return min(fadeInEased, fadeOutEased);
}

function drawGuardCare(ctx) {
  // Draw flowing particles from relationships in the
  // transferring phase, making the transfer of support visible.
  const actvAppr = new Map(
    care.state.shields
      .filter((approach) => approach.state === "transferring")
      .map((approach) => [approach.guardian, approach])
  );
  if (!actvAppr.size) return;
  const col = eco.lifeColor.Guardian;
  const ixFade = careIxFadeAlph();
  push();
  strokeCap(ROUND);
  applyGlowStyle(lifeGlow.guardian);
  const particleCount =
    guardCfg.carePartN;
  for (
    let linkIndex = 0;
    linkIndex < care.state.links.length;
    linkIndex++
  ) {
    const link = care.state.links[linkIndex];
    const approach = actvAppr.get(link.guardian);
    if (!approach) continue;
    const source = careSourcePos(link.guardian);
    const target = worldPos(link.target);
    const progress = clamp(
      approach.moveElapsedMs /
        max(1, link.moveDurMs || approach.moveDurMs),
      0,
      1
    );
    // The connection fades at both moving ends and remains clearest in the middle.
    const lineFade = guardCareFade(progress);
    stroke(
      col[0],
      col[1],
      col[2],
      guardCfg.careLineAlpha * lineFade * ixFade
    );
    strokeWeight(guardCfg.careLineWeight);
    line(source.x, source.y, target.x, target.y);
    noStroke();
// Offset particle phases by relationship identifier so
// multiple care connections have distinct flow rhythms.
    for (let index = 0; index < particleCount; index++) {
      const partProg =
        (progress * guardCfg.careFlowCycles +
          index / particleCount +
          linkIndex * 0.137) %
        1;
      const eased =
        cubicSmoothstep(partProg);
      const x = lerp(source.x, target.x, eased);
      const y = lerp(source.y, target.y, eased);
      const partAlphMix =
        particleCount > 1 ? index / (particleCount - 1) : 0.5;
      const partMaxAlph = lerp(
        guardCfg.careParAlpMin,
        guardCfg.careParAlpMax,
        partAlphMix
      );
      const particleAlpha =
        partMaxAlph *
        lineFade *
        ixFade *
        sin(PI * partProg);
      const particleColor =
        guardCfg.carePartClr;
      fill(
        particleColor[0],
        particleColor[1],
        particleColor[2],
        particleAlpha
      );
      const partSizeProg =
        0.5 +
        0.5 *
          sin(
            ctx.now *
              (TWO_PI /
                guardCfg.carePartBrthMs) +
              index +
              linkIndex
          );
      circle(
        x,
        y,
        lerp(
          guardCfg.careParSizMin,
          guardCfg.careParSizMax,
          partSizeProg
        )
      );
    }
  }
  applyGlowStyle(lifeGlow.none);
  pop();
}

// Protective-formation movement and regeneration feedback present the Guardian as a sheltering presence.
function drawShldLine(
  x,
  y,
  symbolWidth,
  symbolHeight,
  alpha,
  color,
  lineWeight,
  filled = false,
  symbolKind = "plus"
) {
  // Contour and fill share the same shield-shaped path.
  const halfWidth = symbolWidth * 0.5;
  const halfHeight = symbolHeight * 0.5;
  push();
  if (filled) {
    noStroke();
    fill(color[0], color[1], color[2], alpha);
  } else {
    noFill();
    stroke(color[0], color[1], color[2], alpha);
    strokeWeight(lineWeight);
    strokeCap(ROUND);
    strokeJoin(ROUND);
  }
  beginShape();
  vertex(x, y - halfHeight);
  bezierVertex(
    x + halfWidth * 0.35,
    y - halfHeight * 0.72,
    x + halfWidth * 0.62,
    y - halfHeight * 0.56,
    x + halfWidth,
    y - halfHeight * 0.54
  );
  bezierVertex(
    x + halfWidth,
    y + halfHeight * 0.18,
    x + halfWidth * 0.92,
    y + halfHeight * 0.58,
    x,
    y + halfHeight
  );
  bezierVertex(
    x - halfWidth * 0.92,
    y + halfHeight * 0.58,
    x - halfWidth,
    y + halfHeight * 0.18,
    x - halfWidth,
    y - halfHeight * 0.54
  );
  bezierVertex(
    x - halfWidth * 0.62,
    y - halfHeight * 0.56,
    x - halfWidth * 0.35,
    y - halfHeight * 0.72,
    x,
    y - halfHeight
  );
  if (filled) {
    // Write the inner contour in reverse, using the
    // nonzero winding rule to cut out plus or minus states.
    const armX = symbolWidth * 0.3;
    const armY = symbolHeight * 0.27;
    const stemX = symbolWidth * 0.07;
    const stemY = symbolHeight * 0.08;
    const plusContour =
      symbolKind === "minus"
        ? [
            [-armX, -stemY],
            [armX, -stemY],
            [armX, stemY],
            [-armX, stemY],
          ]
        : [
            [-stemX, -armY],
            [stemX, -armY],
            [stemX, -stemY],
            [armX, -stemY],
            [armX, stemY],
            [stemX, stemY],
            [stemX, armY],
            [-stemX, armY],
            [-stemX, stemY],
            [-armX, stemY],
            [-armX, -stemY],
            [-stemX, -stemY],
          ];
    beginContour();
    for (let index = plusContour.length - 1; index >= 0; index--) {
      vertex(x + plusContour[index][0], y + plusContour[index][1]);
    }
    endContour();
  }
  endShape(CLOSE);
  pop();
}

// Glow snapshots from completed care decay independently and are removed on completion.
function updtCarGloFds(now) {
  for (let index = careGlowFades.length - 1; index >= 0; index--) {
    if (
      now - careGlowFades[index].startAt >=
      careGlowFades[index].durationMs
    ) {
      careGlowFades.splice(index, 1);
    }
  }
}

function drawGrdChld(ctx) {
  const supported = creatures.filter(
    (entity) =>
      (entity.type === eco.lifeType.roamer ||
        entity.type === eco.lifeType.deepDiver) &&
      Number.isFinite(entity.guardCareUntl) &&
      entity.guardCareUntl > ctx.now
  );
  if (!supported.length) return;
  const col = eco.lifeColor.Guardian;
  push();
  noFill();
  strokeCap(ROUND);
  applyGlowStyle(lifeGlow.guardian);
  for (const entity of supported) {
    const center = worldPos(entity);
    const elapsed = max(0, ctx.now - entity.guarCarStaAt);
    const remaining = entity.guardCareUntl - ctx.now;
    const intro = clamp(
      elapsed / guardCfg.careMatFadInMs,
      0,
      1
    );
    const outro = clamp(
      remaining / guardCfg.careMatFadOutM,
      0,
      1
    );
    // Fade-in and remaining time jointly limit opacity, allowing
    // the effect to resolve smoothly at both ends of its lifecycle.
    const alphaScale = min(intro, outro);
    const baseRadius = infoRadius(entity);
    strokeWeight(guardCfg.careMateWght);
    const companions = entity.careCompanions || [];
    for (let index = 0; index < companions.length; index++) {
      const companion = companions[index];
      const phase =
        entity.carePartSeed +
        companion.phaseOffset +
        ctx.now * companion.speed;
      const radius =
        (baseRadius * companion.radiusScale +
          sin(ctx.now * 0.0015 + index) * 2.5) *
        guardCfg.careMateRadScl;
      const x = center.x + cos(phase) * radius;
      const y = center.y + sin(phase) * radius;
      const companionSize = max(1, companion.size);
      const shieldWidth = companionSize * 2;
      const shieldHeight =
        shieldWidth *
        (guardCfg.pnlSttIcoHgh /
          guardCfg.pnlSttIcoWdt);
      care.drawShldLine(
        x,
        y,
        shieldWidth,
        shieldHeight,
        companion.alpha * alphaScale,
        col,
        guardCfg.careMateWght,
        true
      );
    }
  }
  applyGlowStyle(lifeGlow.none);
  pop();
}

function drawCellChld(ctx) {
  // Clear feedback that has ended or lost its target first;
  // the list retains cell companions that remain visible.
  for (
    let index = cellMateFx.length - 1;
    index >= 0;
    index--
  ) {
    const effect = cellMateFx[index];
    if (!effect.cell || effect.cell.dead || ctx.now >= effect.until) {
      cellMateFx.splice(index, 1);
    }
  }
  if (!cellMateFx.length) return;
  const col = eco.lifeColor.Guardian;
  push();
  strokeCap(ROUND);
  applyGlowStyle(lifeGlow.guardian);
  for (const effect of cellMateFx) {
    if (ctx.now < effect.startedAt) continue;
    const elapsed = ctx.now - effect.startedAt;
    const remaining = effect.until - ctx.now;
    const intro = clamp(
      elapsed / guardCfg.careMatFadInMs,
      0,
      1
    );
    const outro = clamp(
      remaining / guardCfg.careMatFadOutM,
      0,
      1
    );
// Opacity follows the lower of fade-in and fade-out, allowing
// companions to appear and depart at either end of their lifecycle.
    const alphaScale = min(intro, outro);
    const baseRadius = max(
      1,
      effect.cell.visualRadius || effect.cell.attnRad || 1
    );
    // Companions orbit the cell's actual radius, remaining outside its contour after size changes.
    for (let index = 0; index < effect.companions.length; index++) {
      const companion = effect.companions[index];
      const companionSize = max(1, companion.size) * effect.scale;
      const phase =
        effect.particleSeed +
        companion.phaseOffset +
        ctx.now * companion.speed;
      const radius =
        baseRadius +
        companionSize +
        returnCfg.companionGap +
        sin(ctx.now * 0.0015 + index) * 2.5;
      const x = effect.cell.x + cos(phase) * radius;
      const y = effect.cell.y + sin(phase) * radius;
      const shieldWidth = companionSize * 2;
      const shieldHeight =
        shieldWidth *
        (guardCfg.pnlSttIcoHgh /
          guardCfg.pnlSttIcoWdt);
      care.drawShldLine(
        x,
        y,
        shieldWidth,
        shieldHeight,
        companion.alpha * alphaScale,
        col,
        guardCfg.careMateWght,
        true,
        effect.symbolKind
      );
    }
  }
  applyGlowStyle(lifeGlow.none);
  pop();
}

function drawCareProg() {
  // Candidate, completion hold, and exit trajectory share
  // the progress arc while reading independent timing state.
  const completing =
    care.state.phase === "scanning" &&
    care.state.phaseElapsedMs <=
      careProgHoldMs();
  if (!careProgExsts()) return;
  if (completing) {
    const completionFade =
      1 -
      care.state.phaseElapsedMs /
        careProgHoldMs();
    drawGrdProgArc(
      care.state.source,
      1,
      completionFade
    );
    return;
  }
  if (care.state.candidate && care.state.focusMs > 0) {
    const position = careProgPos(
      care.state.candidate
    );
    care.state.progressX = position.x;
    care.state.progressY = position.y;
    care.state.progressAtRest = false;
    drawGrdProgArc(
      care.state.candidate,
      careCllbProg()
    );
  }
  for (const track of care.state.receding) {
    drawGrdProgArc(
      track.guardian,
      clamp(
        track.focusMs / guardCfg.attnHoldMs,
        0,
        1
      )
    );
  }
}

// Draw phase feedback for a lifeform reverting to a BasicCell on the world layer,
// then return it to ordinary cell rendering on completion.
function drawRtrnFb(ctx) {
  if (!relAlert.regressions.length) return;
  const guardianColor = eco.lifeColor.Guardian;
  push();
  strokeCap(ROUND);
  // Minus signs return to the source along the withdrawal path,
  // expressing a reduction in the relationship.
  for (const regression of relAlert.regressions) {
    const pluses = regression.sourceGuard?.driftPluses || [];
    // Prefer the symbol set saved during resolution; if absent
    // from legacy records, fall back to a single source index.
    const plusIds = regression.plusIds?.length
      ? regression.plusIds
      : [regression.srcPlusIndx];
    for (
      let markerIndex = 0;
      markerIndex < plusIds.length;
      markerIndex++
    ) {
      const plusIndex = plusIds[markerIndex];
      const plus = pluses[plusIndex];
      if (!plus) continue;
      const markerPlan = regression.markerPlans?.find(
        (plan) => plan.plusIndex === plusIndex
      );
      const markerState = rtrnMrkrVis(
        regression,
        markerPlan,
        ctx.now
      );
      const home = detcCarPluPos(
        regression.sourceGuard,
        plus
      );
      const surface = carePlusPos(
        regression.target,
        plus,
        markerIndex,
        ctx.now
      );
      const x = lerp(home.x, surface.x, markerState.detachProgress);
      const y = lerp(home.y, surface.y, markerState.detachProgress);
      const baseSize =
        plus.size *
        driftCfg.sizeMul *
        home.drawScale;
      const minusSize =
        baseSize *
        lerp(
          1,
          guardCfg.crossSizeScale,
          markerState.detachProgress
        );
      const baseAlpha = Number.isFinite(plus.visualAlpha)
        ? plus.visualAlpha
        : plus.alpha;
// Minus signs inherit the original symbols' brightness hierarchy,
// allowing withdrawal to retain an individual trace of the Guardian.
      const alphaProgress = clamp(
        (baseAlpha - driftCfg.idleAlphaMin) /
          max(
            0.001,
            driftCfg.idleAlphaMax -
              driftCfg.idleAlphaMin
          ),
        0,
        1
      );
      const minusAlpha =
        lerp(
          guardCfg.crossAlphaMin,
          guardCfg.crossAlphaMax,
          alphaProgress
        ) * markerState.minusAlpha;
      const lineWeight = max(
        driftCfg.minScrnWght,
        plus.weight *
          driftCfg.weightMul *
          home.drawScale
      );
      drawingContext.shadowColor = `rgba(${guardianColor[0]},${guardianColor[1]},${guardianColor[2]},0.5)`;
      drawingContext.shadowBlur = 13;
      stroke(
        guardianColor[0],
        guardianColor[1],
        guardianColor[2],
        minusAlpha
      );
      strokeWeight(
        lineWeight *
          lerp(
            guardCfg.drftMnsWghtMul,
            guardCfg.crssWghtScl,
            markerState.detachProgress
          )
      );
      push();
      translate(x, y);
      rotate(surface.angle * 0.12 * (1 - markerState.detachProgress));
      line(-minusSize, 0, minusSize, 0);
      pop();
    }
  }
  pop();
}

// 3. Care results become visible, and repair leaves seeds
// The care panel explains the current change, while regeneration
// seeds preserve traces that continue growing after repair.
function carePanelAlpha() {
  if (
    care.state.phase === "idle" ||
    !care.state.speciesCounts
  ) {
    return 0;
  }
  const revealProgress = clamp(
    care.state.panelRevealMs /
      max(
        1,
        scaleCareMs(
          guardCfg.panelFadeInMs
        )
      ),
    0,
    1
  );
  const revealAlpha =
    cubicSmoothstep(revealProgress);
  if (!care.state.pnlFadeStart) {
    return revealAlpha * careIxFadeAlph();
  }
  const fadeOutAlpha =
    1 -
    care.state.pnlFadElaMs /
      max(
        1,
        scaleCareMs(
          guardCfg.panelFadeOutMs
        )
      );
  return (
    revealAlpha *
    clamp(fadeOutAlpha, 0, 1) *
    careIxFadeAlph()
  );
}

function carePnlExsts() {
  return Boolean(
    care.state.phase !== "idle" &&
      care.state.speciesCounts
  );
}

// Stagger species-label reveal timing by row index.
function careSpcTexAlp(index) {
  const revealMs = max(
    1,
    scaleCareMs(
      guardCfg.pnlSpcTexShoMs
    )
  );
  const stepMs = max(
    0,
    scaleCareMs(
      guardCfg.pnlSpcTexGapMs
    )
  );
  const revealDelayMs = max(
    0,
    scaleCareMs(
      guardCfg.pnlTypeDlyMs
    )
  );
  const revealProgress = clamp(
    (care.state.panelRevealMs - revealDelayMs - index * stepMs) /
      revealMs,
    0,
    1
  );
  return cubicSmoothstep(revealProgress);
}

function careProgExsts() {
  const completing =
    care.state.phase === "scanning" &&
    care.state.phaseElapsedMs <=
      careProgHoldMs();
  if (completing) return Boolean(care.state.source);
  return Boolean(
    care.state.phase === "idle" &&
      ((care.state.candidate && care.state.focusMs > 0) ||
        care.state.receding.length > 0) &&
      !care.state.reqrFree
  );
}

// The care overlay centrally renders scans, panels, and relationship feedback.
function drawCareOvrly(ctx) {
  drawCareProg();
  updtCarGloFds(ctx.now);
  drawCarScaWav(ctx);
  care.drawDetcPlss(ctx);
  drawGuardCare(ctx);
  drawGrdChld(ctx);
  drawGuardSeeds(ctx);
}

// The Guardian top layer adds symbols and states that must appear above the cached body.
function drawGuaTopLyr(ctx) {
  for (const guardian of creatures) {
    if (
      guardian.type === eco.lifeType.guardian &&
      isVisible(guardian)
    ) {
      drawDomnLife(guardian, ctx);
    }
  }
}

function carePnlLyt(
  requestedWidth = guardCfg.panelWidth,
  reqsHght = guardCfg.panelHeight
) {
  // Place the panel near the care source when possible, falling
  // back to a safe upper-right position when no source exists.
  const edgePadding = guardCfg.pnlEdgePddng;
  const panelWidth = min(
    requestedWidth,
    max(190, width - edgePadding * 2)
  );
  const panelHeight = reqsHght;
  const topExpansion = guardCfg.pnlTopExpn;
  const source = care.state.source;
  if (!source) {
    return {
      panelWidth,
      panelHeight,
      panelX: width - panelWidth - edgePadding,
      panelY: edgePadding,
    };
  }
  const worldPosition = worldPos(source);
  const sourcePosition = {
    x: Number.isFinite(source.guardVisX)
      ? source.guardVisX
      : worldPosition.x,
    y: Number.isFinite(source.guardVisY)
      ? source.guardVisY
      : worldPosition.y,
  };
  const sourceScale = Number.isFinite(source.careScale)
    ? source.careScale
    : 1;
  const sourceRadius = infoRadius(source) * sourceScale;
  // panelSide records the left-right choice for the current session.
  const desiredX =
    care.state.panelSide > 0
      ? sourcePosition.x +
        sourceRadius +
        guardCfg.panelOffset
      : sourcePosition.x -
        sourceRadius -
        guardCfg.panelOffset -
        panelWidth;
  return {
    panelWidth,
    panelHeight,
    panelX: clamp(
      desiredX,
      edgePadding,
      width - panelWidth - edgePadding
    ),
    panelY: clamp(
      sourcePosition.y -
        (panelHeight - topExpansion) * 0.5 -
        topExpansion,
      edgePadding,
      height - panelHeight - edgePadding
    ),
  };
}

// Result type determines the status-symbol form; fade-in follows a shared rhythm,
// and the graphic further clarifies completion or limitation.
function drawGrdStts(x, y, alpha, kind) {
  const col = guardCfg.panelTextColor;
  const symbolWidth = guardCfg.pnlSttIcoWdt;
  const symbolHeight = guardCfg.pnlSttIcoHgh;
  care.drawShldLine(
    x,
    y,
    symbolWidth,
    symbolHeight,
    alpha,
    col,
    guardCfg.pnlSttIcoWgh
  );
  push();
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(guardCfg.pnlSttIcoWgh * 1.05);
  strokeCap(ROUND);
  const markHalfWidth = symbolWidth * (kind === "suppress" ? 0.24 : 0.18);
  line(x - markHalfWidth, y, x + markHalfWidth, y);
  if (kind === "protect") {
    line(x, y - symbolHeight * 0.17, x, y + symbolHeight * 0.17);
  }
  pop();
}

// Set panel text size, weight, and typeface.
function setCarePnlText(
  size,
  weight = guardCfg.pnlFontWght
) {
  textStyle(NORMAL);
  textSize(size);
  drawingContext.font = `${weight} ${size}px Arial`;
}

function addCarePnlBnds(bounds, box) {
  bounds.left = min(bounds.left, box.left);
  bounds.top = min(bounds.top, box.top);
  bounds.right = max(bounds.right, box.right);
  bounds.bottom = max(bounds.bottom, box.bottom);
}

function careCpslInst(panelHeight, y) {
  const radius = panelHeight * 0.5;
  const distanceY = abs(y - radius);
  if (distanceY >= radius) return radius;
  return radius - sqrt(max(0, radius * radius - distanceY * distanceY));
}

// Return a status marker for limited or protected species; return an empty string for the rest.
function carePnlMrkr(type) {
  if (
    type === care.state.suppressType ||
    type === care.state.peerSuppType
  ) {
    return "SUPPRESS";
  }
  if (type === care.state.protectType) return "PROTECT";
  return "";
}

// Calculate panel dimensions and content coordinates from
// species labels and status markers for subsequent rendering.
// This function was modified with the assistance of ChatGPT.
function carePnlMtrcs(types) {
  const config = guardCfg;
  const ellipseCenterX =
    config.panelWidth * 0.5 + config.pnlEllpsOffstX;
  const ellipseCenterY = config.panelHeight * 0.5;
  // Measure each label and status marker first, then derive panel dimensions from the actual content.
  const bounds = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  };
  const boxes = [];
  const items = [];
  const includeBox = (box) => {
    boxes.push(box);
    addCarePnlBnds(bounds, box);
  };

  // Arrange species along an ellipse in ecological order,
  // with dot size also encoding current ranking intensity.
  for (let index = 0; index < types.length; index++) {
    const type = types[index];
    const species = careSpcView[type];
    const rankStrength =
      types.length > 1 ? 1 - index / (types.length - 1) : 0.5;
    const dotSize = lerp(
      config.pnlDotMinSize,
      config.pnlDotMaxSize,
      rankStrength
    );
    const angle =
      config.pnlEllStrAng + (TAU * index) / types.length;
    const infrOffst = config.pnlRankOffst[index];
    const dotX =
      ellipseCenterX +
      cos(angle) * config.pnlEllpsRadX +
      infrOffst.x;
    const rowY =
      ellipseCenterY +
      sin(angle) * config.pnlEllpsRadY +
      infrOffst.y;
    const marker = carePnlMrkr(type);
    const dotY =
      rowY +
      (index === 0 || index === types.length - 1
        ? config.pnlExtDotOffY
        : 0) +
      (marker ? config.pnlSttDotOffY : 0);

    // Measure actual font bounds before expanding the capsule.
    setCarePnlText(13.5, config.pnlSpcFontWght);
    const speciesWidth = textWidth(species.name);
    const speciesHeight = max(13.5, textAscent() + textDescent());
    const speciesNameX =
      dotX + dotSize * 0.5 + config.pnlDotTextGap;
    const speciesBox = {
      left: speciesNameX,
      top: rowY - speciesHeight * 0.5,
      right: speciesNameX + speciesWidth,
      bottom: rowY + speciesHeight * 0.5,
    };
    includeBox({
      left: dotX - dotSize * 0.5,
      top: dotY - dotSize * 0.5,
      right: dotX + dotSize * 0.5,
      bottom: dotY + dotSize * 0.5,
    });
    includeBox(speciesBox);

    let statusIconX = null;
    let statusIconY = null;
    let markerX = null;
    let markerY = null;
    let markerWidth = 0;
    // Species actually involved in limitation or protection
    // expand their status-icon and label allocation.
    if (marker) {
      statusIconX =
        speciesBox.right +
        config.pnlSttsIconGap +
        config.pnlSttIcoWdt * 0.5;
      statusIconY = rowY + config.pnlSttIcoOffY;
      const iconStrkPddng = config.pnlSttIcoWgh * 0.525;
      includeBox({
        left:
          statusIconX -
          config.pnlSttIcoWdt * 0.5 -
          iconStrkPddng,
        top:
          statusIconY -
          config.pnlSttIcoHgh * 0.5 -
          iconStrkPddng,
        right:
          statusIconX +
          config.pnlSttIcoWdt * 0.5 +
          iconStrkPddng,
        bottom:
          statusIconY +
          config.pnlSttIcoHgh * 0.5 +
          iconStrkPddng,
      });

      setCarePnlText(7.5, config.pnlMrkFonWgh);
      markerWidth = textWidth(marker);
      const markerHeight = max(7.5, textAscent() + textDescent());
      markerX = speciesNameX;
      markerY =
        rowY + config.pnlMrkRowOffY + config.pnlMrkrOffstY;
      includeBox({
        left: markerX,
        top: markerY - markerHeight * 0.5,
        right: markerX + markerWidth,
        bottom: markerY + markerHeight * 0.5,
      });
    }

    // Store label and icon measurements as render items.
    items.push({
      index,
      type,
      species,
      dotSize,
      dotX,
      dotY,
      rowY,
      speciesNameX,
      speciesWidth,
      marker,
      markerX,
      markerY,
      markerWidth,
      statusIconX,
      statusIconY,
    });
  }

  const paddingTop = config.pnlPddngTop;
  const paddingBottom = config.pnlPddngBttm;
  const paddingLeft = config.pnlPddngLeft;
  const paddingRight = config.pnlPddngRght;
  const panelHeight = bounds.bottom - bounds.top + paddingTop + paddingBottom;
  const contentShiftY = paddingTop - bounds.top;
  let contentShiftX = -bounds.left;
  // Capsule edges taper inward at the top and bottom,
  // with positions corrected by each content box's height.
  let leftCorrection = 0;
  for (const box of boxes) {
    for (const rawY of [box.top, box.bottom]) {
      const localY = rawY + contentShiftY;
      const inset = careCpslInst(panelHeight, localY);
      leftCorrection = max(
        leftCorrection,
        inset + paddingLeft - (box.left + contentShiftX)
      );
    }
  }
  contentShiftX += max(0, leftCorrection);
  let panelWidth = panelHeight;
  for (const box of boxes) {
    for (const rawY of [box.top, box.bottom]) {
      const localY = rawY + contentShiftY;
      const inset = careCpslInst(panelHeight, localY);
      panelWidth = max(
        panelWidth,
        box.right + contentShiftX + inset + paddingRight
      );
    }
  }

  // Finally calculate surrounding clearance in reverse to verify
  // that the panel still satisfies capsule-edge constraints.
  let leftClearance = Infinity;
  let rightClearance = Infinity;
  for (const box of boxes) {
    for (const rawY of [box.top, box.bottom]) {
      const localY = rawY + contentShiftY;
      const inset = careCpslInst(panelHeight, localY);
      leftClearance = min(
        leftClearance,
        box.left + contentShiftX - inset
      );
      rightClearance = min(
        rightClearance,
        panelWidth - inset - (box.right + contentShiftX)
      );
    }
  }

  return {
    items,
    panelWidth,
    panelHeight,
    contentShiftX,
    contentShiftY,
    contentBounds: bounds,
    clearance: {
      top: bounds.top + contentShiftY,
      right: rightClearance,
      bottom: panelHeight - (bounds.bottom + contentShiftY),
      left: leftClearance,
    },
  };
}

// Draw the explanatory panel according to the care phase, selecting appropriate information density for
// solo, collaborative, and fallback outcomes.
function drawCarePanel() {
  const alpha = clamp(carePanelAlpha(), 0, 1);
  const speciesCounts = care.state.speciesCounts;
  if (alpha <= 0 || !speciesCounts) return;
  const typeOrder = [
    eco.lifeType.predator,
    eco.lifeType.parasite,
    eco.lifeType.roamer,
    eco.lifeType.deepDiver,
    eco.lifeType.guardian,
  ];
  const types = [...typeOrder].sort(
    (left, right) =>
      speciesCounts[right] - speciesCounts[left] ||
      typeOrder.indexOf(left) - typeOrder.indexOf(right)
  );
  // Sort panel items by current count, helping participants read
  // the relative relationship between abundance and scarcity.
  push();
  noStroke();
  textFont("Arial");
  textAlign(LEFT, CENTER);
  // Labels, icons, and panel contours share measurements from the layout phase.
  const metrics = carePnlMtrcs(types);
  const {
    panelWidth,
    panelHeight,
    panelX,
    panelY,
  } = carePnlLyt(metrics.panelWidth, metrics.panelHeight);
  const contentAlpha =
    alpha * guardCfg.pnlCntAlpScl;
  const bodyTextAlpha = guardCfg.pnlBodTexAlp * alpha;
  carePanelBox = {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    clearance: {
      ...metrics.clearance,
      right:
        metrics.clearance.right + panelWidth - metrics.panelWidth,
    },
  };
  translate((1 - alpha) * care.state.panelSide * 10, 0);
  rectMode(CORNER);
  noStroke();
  fill(
    5,
    18,
    55,
    guardCfg.pnlBgAlph * alpha
  );
  const pnlCrnrRad = panelHeight * 0.5;
  rect(panelX, panelY, panelWidth, panelHeight, pnlCrnrRad);

  const panelTextColor = guardCfg.panelTextColor;
  const contentX = panelX + metrics.contentShiftX;
  const contentY = panelY + metrics.contentShiftY;

  // Each content item uses coordinates stored during layout.
  for (const item of metrics.items) {
    const itemTextAlpha = careSpcTexAlp(item.index);
    const dotX = contentX + item.dotX;
    const dotY = contentY + item.dotY;
    const rowY = contentY + item.rowY;
    const speciesNameX = contentX + item.speciesNameX;
    fill(
      item.species.color[0],
      item.species.color[1],
      item.species.color[2],
      225 * contentAlpha * itemTextAlpha
    );
    circle(dotX, dotY, item.dotSize);
    fill(
      item.species.color[0],
      item.species.color[1],
      item.species.color[2],
      bodyTextAlpha * itemTextAlpha
    );
    textAlign(LEFT, CENTER);
    setCarePnlText(13.5, guardCfg.pnlSpcFontWght);
    text(item.species.name, speciesNameX, rowY);
    if (item.marker) {
      // Draw the protection or limitation icon in its reserved position with the corresponding label.
      drawGrdStts(
        contentX + item.statusIconX,
        contentY + item.statusIconY,
        guardCfg.pnlSttIcoAlp * alpha * itemTextAlpha,
        item.marker === "PROTECT" ? "protect" : "suppress"
      );
      textAlign(LEFT, CENTER);
      setCarePnlText(
        7.5,
        guardCfg.pnlMrkFonWgh
      );
      fill(
        panelTextColor[0],
        panelTextColor[1],
        panelTextColor[2],
        bodyTextAlpha * itemTextAlpha
      );
      text(
        item.marker,
        contentX + item.markerX,
        contentY + item.markerY
      );
    }
    textStyle(NORMAL);
  }
  pop();
}

// Calculate the glow-intensity ratio from seed transformation and regeneration phases.
function grdSeedGlowScl(cluster, now) {
  if (cluster.regrowAt == null) return 1;
  const progress = clamp(
    (now - cluster.regrowAt) /
      max(1, guardCfg.seedGloFadOutM),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  return 1 - eased;
}

  // Delay fading the old seed body after regeneration begins,
  // preserving visual handoff time for the new Guardian's birth.
function careSeeBodAlp(cluster, now) {
  if (cluster.regrowAt == null) return 1;
  const birthStartedAt =
    cluster.regrowAt +
    guardCfg.seedGuaBrtDlyM;
  const progress = clamp(
    (now - birthStartedAt) /
      max(1, guardCfg.seedGuaBrtMs),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  return 1 - eased;
}

// The seed's outer contour inherits the Guardian waveform with fewer layers,
// preserving recognition of its source while expressing a reduced state.
function drawGrdSeedOtr(cluster) {
  const start = PI * 0.6 + (cluster.srcOtrPhs || 0) + 0.07;
  const end = PI * 2.1 + (cluster.srcOtrPhs || 0);
  strokeWeight(10.4);
  arc(0, 0, 165, 165, start, end);
  const radius = 165 * 0.5;
  const radialX = cos(end);
  const radialY = sin(end);
  const tangentX = -radialY;
  const tangentY = radialX;
  const tipX = radialX * radius + tangentX * 6.5;
  const tipY = radialY * radius + tangentY * 6.5;
  const baseX = tipX - tangentX * 12.3;
  const baseY = tipY - tangentY * 12.3;
  strokeWeight(5);
  beginShape();
  vertex(baseX + radialX * 10.2, baseY + radialY * 10.2);
  vertex(tipX, tipY);
  vertex(baseX - radialX * 10.2, baseY - radialY * 10.2);
  endShape();
}

// The seed's inner structure preserves the core rhythm at lower opacity,
// providing visual continuity for later regeneration.
function drawGrdSeeInn(cluster) {
  const start = -PI * 0.2 + (cluster.srcInnrPhs || 0);
  const end = PI * 1.3 + (cluster.srcInnrPhs || 0) - 0.07;
  strokeWeight(9.4);
  arc(0, 0, 124, 124, start, end);
  const radius = 124 * 0.5;
  const radialX = cos(start);
  const radialY = sin(start);
  const tangentX = radialY;
  const tangentY = -radialX;
  const tipX = radialX * radius + tangentX * 6;
  const tipY = radialY * radius + tangentY * 6;
  const baseX = tipX - tangentX * 10.9;
  const baseY = tipY - tangentY * 10.9;
  strokeWeight(4.4);
  beginShape();
  vertex(baseX + radialX * 9, baseY + radialY * 9);
  vertex(tipX, tipY);
  vertex(baseX - radialX * 9, baseY - radialY * 9);
  endShape();
}

// Draw seeds released during Guardian repair so the recovery result first appears as potential life.
function drawGuardSeeds(ctx) {
  if (!guardSeedClst.length) return;
  const col = eco.lifeColor.Guardian;
  push();
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  drawingContext.shadowBlur = guardCfg.seedGlowBlur;
  // Seeds inherit the original Guardian's rotation, size, and breathing scale,
  // keeping their origin recognizable after retirement.
  for (const cluster of guardSeedClst) {
    const offset = grdSeeFltOff(cluster, ctx.now);
    const transition = care.getSeedTx(cluster, ctx.now);
    // Calculate drift, form transformation, and glow separately.
    const glowScale = grdSeedGlowScl(cluster, ctx.now);
    const bodyAlphaScale = care.seedBodyAlpha(cluster, ctx.now);
    drawingContext.shadowColor = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${guardCfg.seedGlowAlpha * glowScale})`;
    stroke(
      col[0],
      col[1],
      col[2],
      transition.alpha * bodyAlphaScale
    );
    push();
    translate(cluster.x + offset.x, cluster.y + offset.y);
    rotate(cluster.sourceRotation || 0);
    scale(
      eco.drawScale *
        cluster.sourceSize *
        scaleOf(eco.lifeType.guardian) *
        (cluster.sourceBreath || 1) *
        transition.scale
    );
    drawGrdSeedOtr(cluster);
    stroke(
      col[0],
      col[1],
      col[2],
      transition.alpha * bodyAlphaScale * (150 / 215)
    );
    drawGrdSeeInn(cluster);
    pop();
  }
  applyGlowStyle(lifeGlow.none);
  pop();
}

// 4. Connecting people who share care through relational geometry
// Collaboration lines show how different participants
// approach the same target and complete repair together.
function carePcktAlph(alpha) {
  return clamp(
    alpha + packetCfg.alphaBoost,
    0,
    255
  );
}

// Apply a common gain to relational-data-packet opacity and clamp it to the valid range.
function carePcktAlpha(opacity) {
  return clamp(
    opacity +
      packetCfg.alphaBoost / 255,
    0,
    1
  );
}

const carePcktPttrn = Object.freeze([
  "left-chevron",
  "dot",
  "dot",
  "middle-chevron",
  "right-chevron",
]);

const carePcktYOffst = Object.freeze([
  -2.6,
  0.4,
  0.75,
  1.05,
  2.5,
]);

const carePcktXOffst = Object.freeze([
  -2,
  0.35,
  1.15,
  -0.35,
  -1.45,
]);

const carePckGapScl = Object.freeze([
  1.08,
  0.92,
  1.16,
  0.98,
]);

const pcktDrftPhss = Object.freeze([
  0.18,
  1.33,
  2.61,
  3.46,
  4.82,
]);

const pcktWaveBffrs = new Map();

// Offset data-packet waveform points along the connection's tangent and normal so movement follows the
// relationship direction while maintaining spacing from the line.
function carePckWavPnt(
  sessionId,
  key,
  diameter,
  amplitude,
  speed,
  seedOffset
) {
  const config = guardCfg;
  const bufferKey = `${sessionId}:${key}`;
  let buffer = pcktWaveBffrs.get(bufferKey);
  if (!buffer) {
    buffer = makeRingBuffer(packetCfg.waveSteps);
    pcktWaveBffrs.set(bufferKey, buffer);
  }
  return makeWavePoints(
    diameter,
    carePcktClck(sessionId) * 0.001 * speed,
    amplitude,
    (sessionId + 1) * 0.731 + seedOffset,
    packetCfg.waveSteps,
    buffer
  );
}

function trcPcktWave(
  context,
  points,
  centerX,
  centerY,
  pointScale = 1
) {
  if (!points.length) return;
  context.beginPath();
  context.moveTo(
    centerX + points[0][0] * pointScale,
    centerY + points[0][1] * pointScale
  );
  for (let index = 1; index < points.length; index++) {
    context.lineTo(
      centerX + points[index][0] * pointScale,
      centerY + points[index][1] * pointScale
    );
  }
  context.closePath();
}

function drawPacketWave(points, centerX, centerY) {
  push();
  translate(centerX, centerY);
  drawWaveRing(points);
  pop();
}

function carePcktClck(sessionId) {
  return care.state.offerElapsedMs + sessionId * 173;
}

// Generate stable data-packet jitter from the session, cycle, and salt.
function carePcktJttr(sessionId, cycle, salt) {
  const value =
    sin(
      (sessionId + 1) * 12.9898 +
        (cycle + 1) * 78.233 +
        salt * 37.719
    ) * 43758.5453;
  return (value - floor(value)) * 2 - 1;
}

// Data packets advance on a shared clock; session identifiers
// produce stable variation in transmission intervals and durations.
function carePacketTx(clock, sessionId) {
  const config = guardCfg;
  let cycleStart = 0;
  for (let cycle = 0; cycle < 12; cycle++) {
    const intervalMs =
      packetCfg.sendIntervalMs *
      (1 +
        carePcktJttr(sessionId, cycle, 1) *
          packetCfg.sendIntrJttr);
    if (clock < cycleStart + intervalMs) {
      const durationMs =
        packetCfg.sendMs *
        (1 +
          carePcktJttr(sessionId, cycle, 2) *
            packetCfg.sendDurJitter);
      const age = max(0, clock - cycleStart);
      return {
        active: age < durationMs,
        progress: clamp(age / durationMs, 0, 1),
      };
    }
    cycleStart += intervalMs;
  }
  return { active: false, progress: 1 };
}

// Distribute the highlight between adjacent symbols, with weights summing to 1 for a non-empty sequence.
function pcktLghtWghts(symbols, progress) {
  if (!symbols.length) return [];
  if (symbols.length === 1) return [1];
  const positions = symbols.map((symbol) => symbol.centerX);
  const gaps = [];
  for (let index = 1; index < positions.length; index++) {
    gaps.push(max(0.001, positions[index] - positions[index - 1]));
  }
  // Close the loop using the mean existing gap between the first and last symbols,
  // allowing the highlight to retain its speed across the endpoint.
  const wrapGap =
    gaps.reduce((sum, gap) => sum + gap, 0) / max(1, gaps.length);
  const firstPosition = positions[0];
  const cycleLength = max(
    0.001,
    positions[positions.length - 1] - firstPosition + wrapGap
  );
  const normProg =
    progress >= 1 ? 0 : ((progress % 1) + 1) % 1;
  const lightPosition = normProg * cycleLength;
  const reltPost = positions.map(
    (position) => position - firstPosition
  );
  let fromIndex = reltPost.length - 1;
  for (let index = 0; index < reltPost.length - 1; index++) {
    if (lightPosition < reltPost[index + 1]) {
      fromIndex = index;
      break;
    }
  }
  const toIndex = (fromIndex + 1) % reltPost.length;
  const segmentStart = reltPost[fromIndex];
  const segmentEnd =
    toIndex === 0 ? cycleLength : reltPost[toIndex];
  const segProg = clamp(
    (lightPosition - segmentStart) / max(0.001, segmentEnd - segmentStart),
    0,
    1
  );
  const weights = new Array(symbols.length).fill(0);
  weights[fromIndex] = 1 - segProg;
  weights[toIndex] += segProg;
  return weights;
}

// Moving data packets express the formation of a relationship of care
// This function was modified with the assistance of ChatGPT.
function drawCarPckDat(
  signal,
  sessionId,
  accpProg,
  color
) {
  const config = guardCfg;
  const reticleColor = packetCfg.reticleColor;
  const pattern = carePcktPttrn;
  const widths = pattern.map((kind) =>
    kind === "left-chevron"
      ? packetCfg.leftArrowWidth *
        packetCfg.arrowScale
      : kind === "middle-chevron"
        ? packetCfg.mddlArrwWdth *
          packetCfg.arrowScale
        : kind === "right-chevron"
          ? packetCfg.rghtArrwWdth *
            packetCfg.arrowScale
          : packetCfg.slotRadius * 2
  );
  const arrvlProg = relSmth(
    clamp((signal.progress - 0.72) / 0.28, 0, 1)
  );
  // Tighten symbol spacing near a participant, expressing
  // the formation of an invitation through visual rhythm.
  const gap =
    packetCfg.dataGap *
    (1 -
      arrvlProg *
        packetCfg.arrivalTighten);
  const gaps = carePckGapScl.map(
    (scale) => gap * scale
  );
  const scrnToPcktScl =
    1 / max(0.001, packetCfg.visualScale);
  gaps[1] +=
    packetCfg.dotGapOffset *
    scrnToPcktScl;
  gaps[3] +=
    packetCfg.arrowGapOffset *
    scrnToPcktScl;
  const totalWidth =
    widths.reduce((sum, value) => sum + value, 0) +
    gaps.reduce((sum, value) => sum + value, 0);
  const clock = carePcktClck(sessionId);
  const transmission = carePacketTx(
    clock,
    sessionId
  );
  const shrdDotBrth =
    1 +
    sin(
      (TWO_PI * clock) /
        packetCfg.dotBreathMs +
        sessionId * 0.47
      ) * packetCfg.dotBreathScale;
  let cursorX = -totalWidth * 0.5;
  // Build stable geometry for the full symbol sequence before using
  // the same coordinates for highlight calculation and rendering.
  const symbols = pattern.map((kind, index) => {
    const width = widths[index];
    const driftPhase = pcktDrftPhss[index];
    const symbolCursorX =
      cursorX + carePcktXOffst[index];
    const symbol = {
      kind,
      width,
      cursorX: symbolCursorX,
      centerX: symbolCursorX + width * 0.5,
      symbolY:
        carePcktYOffst[index] +
        (kind === "dot"
          ? 0
          : -packetCfg.arrowLift *
            scrnToPcktScl) +
        sin(clock * 0.00032 + driftPhase + sessionId * 0.73) *
          packetCfg.symbolDriftY,
      breath: kind === "dot" ? shrdDotBrth : 1,
    };
    cursorX += width + (gaps[index] || 0);
    return symbol;
  });
  // The highlight flows by interpolating between adjacent symbols,
  // carrying the transfer continuously through the sequence.
  const lightWeights = pcktLghtWghts(
    symbols,
    transmission.progress
  );
  push();
  translate(signal.x, signal.y);
  rotate(signal.heading || 0);
  scale(packetCfg.visualScale);
  translate(0, packetCfg.dataOffsetY);
  const emptyDot = symbols[1];
  drawCarPckRpp(
    emptyDot.centerX,
    emptyDot.symbolY,
    sessionId,
    accpProg,
    color
  );
  strokeCap(ROUND);
  strokeWeight(packetCfg.dataWeight);
  drawingContext.save();
  drawingContext.globalCompositeOperation = "screen";
  drawingContext.shadowColor = `rgba(${color[0]},${color[1]},${color[2]},${carePcktAlpha(0.55)})`;
  drawingContext.shadowBlur = 4.5;
  // Arrows indicate transfer direction and dots represent relationship nodes;
  // both share the moving highlight while using independent geometric rules.
  for (let index = 0; index < symbols.length; index++) {
    const { kind, width, cursorX, centerX, symbolY, breath } = symbols[index];
    const highlight = lightWeights[index] || 0;
    const alpha = carePcktAlph(
      lerp(
        packetCfg.dataBaseAlpha,
        packetCfg.dataPeakAlpha,
        highlight
      )
    );
    drawingContext.shadowBlur = lerp(1.5, 4.5, highlight);
    if (kind !== "dot") {
      const bend =
        sin(clock * 0.00027 + index * 1.73 + sessionId) *
        packetCfg.arrowCurve;
      const halfHeight =
        packetCfg.arrwHalfHght *
        packetCfg.arrowScale *
        (kind === "middle-chevron" ? 0.9 : 1);
      const tipX = cursorX + width + bend * 0.12;
      drawingContext.beginPath();
      drawingContext.moveTo(cursorX, symbolY - halfHeight);
      drawingContext.bezierCurveTo(
        cursorX +
          width * packetCfg.arrwShldDpth,
        symbolY -
          halfHeight *
            packetCfg.arrwShldScl +
          bend * 0.16,
        tipX,
        symbolY -
          halfHeight * packetCfg.arrowTipRound +
          bend * 0.1,
        tipX,
        symbolY
      );
      // The lower half mirrors the shoulder curve, giving the closed arrow a soft contour.
      drawingContext.bezierCurveTo(
        tipX,
        symbolY +
          halfHeight * packetCfg.arrowTipRound -
          bend * 0.1,
        cursorX +
          width * packetCfg.arrwShldDpth,
        symbolY +
          halfHeight *
            packetCfg.arrwShldScl -
          bend * 0.16,
        cursorX,
        symbolY + halfHeight
      );
      drawingContext.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${
        alpha / 255
      })`;
      drawingContext.lineWidth =
        packetCfg.dataWeight;
      drawingContext.lineCap = "round";
      drawingContext.stroke();
    // The solid center dot is a stable relationship anchor;
    // remaining hollow dots use fill progress to express acceptance.
    } else if (index === 2) {
      const dotPoints = carePckWavPnt(
        sessionId,
        `dot-${index}`,
        width * breath,
        packetCfg.dotWaveAmp,
        packetCfg.dotWaveSpeed,
        31 + index * 13
      );
      noStroke();
      fill(
        reticleColor[0],
        reticleColor[1],
        reticleColor[2],
        min(alpha, packetCfg.slotFillAlpha)
      );
      drawPacketWave(
        dotPoints,
        centerX,
        symbolY
      );
      noFill();
      stroke(
        reticleColor[0],
        reticleColor[1],
        reticleColor[2],
        min(alpha, packetCfg.slotLineAlph)
      );
      strokeWeight(packetCfg.slotWeight);
      drawPacketWave(
        dotPoints,
        centerX,
        symbolY
      );
    } else {
      // Outer hollow dots express acceptance progress through clipped filling while retaining the
      // consistent form of data-packet symbols.
      const diameter = width * breath;
      const radius = diameter * 0.5;
      const dotPoints = carePckWavPnt(
        sessionId,
        `dot-${index}`,
        diameter,
        packetCfg.dotWaveAmp,
        packetCfg.dotWaveSpeed,
        31 + index * 13
      );
      const fillProgress = relSmth(accpProg);
      const fillInset = min(
        radius - 0.001,
        packetCfg.progressInset
      );
      const fillRadScl = (radius - fillInset) / radius;
// The clipping region follows the lifeform waveform, keeping
// the flowing signal within the relationship's visible boundary.
      drawingContext.save();
      trcPcktWave(
        drawingContext,
        dotPoints,
        centerX,
        symbolY,
        fillRadScl
      );
      drawingContext.clip();
      drawingContext.fillStyle = `rgba(${reticleColor[0]},${reticleColor[1]},${reticleColor[2]},${
        carePcktAlph(
          packetCfg.progFillAlph
        ) / 255
      })`;
      const fillExtent =
        (radius + packetCfg.dotWaveAmp * 2) *
        fillRadScl;
      const fillSize = fillExtent * 2;
      const fillWidth = fillSize * fillProgress;
      drawingContext.fillRect(
        centerX - fillExtent,
        symbolY - fillExtent,
        fillWidth,
        fillSize
      );
      drawingContext.restore();
      noFill();
      stroke(
        color[0],
        color[1],
        color[2],
        min(alpha, packetCfg.slotLineAlph)
      );
      strokeWeight(packetCfg.slotWeight);
      drawPacketWave(
        dotPoints,
        centerX,
        symbolY
      );
    }
  }
  drawingContext.restore();
  pop();
}

function drawCarPckRpp(
  x,
  y,
  sessionId,
  accpProg,
  color
) {
// Slightly offset each participant's ripple clock so shared care retains multiple individual rhythms.
  const config = guardCfg;
  const clock = carePcktClck(sessionId);
  const progress =
    (clock % packetCfg.rippleLifeMs) /
    packetCfg.rippleLifeMs;
  const easedProgress = 1 - (1 - progress) ** 2;
  const radius = lerp(
    packetCfg.rpplMinRad,
    packetCfg.rpplMaxRad,
    easedProgress
  ) * packetCfg.rpplSizeScl;
  const session = sessions.find(
    (candidate) => candidate.id === sessionId
  );
  const gazeRpplAlph = Number.isFinite(session?.camera?.rippleAlpha)
    ? session.camera.rippleAlpha * 255
    : 0.22 * 255;
  const baseAlpha = max(
    0,
    min(
      255,
      (gazeRpplAlph +
        packetCfg.rpplAlphBst) *
        packetCfg.rpplAlphScl
    ) - packetCfg.rpplAlphDrop
  );
  // As acceptance progress rises, empty-slot ripples weaken,
  // yielding visual emphasis to established data packets.
  const emptyVis =
    1 - relSmth(accpProg);
  const alpha = carePcktAlph(
    (1 - progress) ** 1.65 * baseAlpha * emptyVis
  );
  push();
  noFill();
  strokeWeight(packetCfg.rippleWeight);
  stroke(color[0], color[1], color[2], alpha);
  const outerPoints = carePckWavPnt(
    sessionId,
    "ripple-outer",
    radius * 2,
    packetCfg.rippleWaveAmp,
    packetCfg.rpplWaveSpd,
    97
  );
  drawPacketWave(outerPoints, x, y);
  // The inner ring appears later and decays faster,
  // using existing state to create layers of propagation.
  const innerDelay = 0.32;
  if (progress > innerDelay) {
    const innerProgress =
      (progress - innerDelay) / (1 - innerDelay);
    const innerRadius = lerp(
      packetCfg.rpplMinRad,
      packetCfg.rpplMaxRad * 0.7,
      1 - (1 - innerProgress) ** 2
    ) * packetCfg.rpplSizeScl;
    const innerAlpha = carePcktAlph(
      (1 - innerProgress) ** 1.8 *
      baseAlpha *
      0.44 *
      emptyVis
    );
    stroke(color[0], color[1], color[2], innerAlpha);
    const innerPoints = carePckWavPnt(
      sessionId,
      "ripple-inner",
      innerRadius * 2,
      packetCfg.rippleWaveAmp,
      packetCfg.rpplWaveSpd,
      143
    );
    drawPacketWave(innerPoints, x, y);
  }
  pop();
}

function drawPcktLctr(source) {
  // The locator appears during the active segment of the invitation cycle;
  // the rest segment leaves visual space for data packets and participant cursors.
  const config = guardCfg;
  const activeMs = packetCfg.lctrActvMs;
  const cycleMs =
    activeMs + packetCfg.locatorRestMs;
  const cycleElapsed =
    care.state.offerElapsedMs % cycleMs;
  const active = cycleElapsed < activeMs;
  if (!active) return;
  const progress = active ? cycleElapsed / activeMs : 0;
  let locatorAlpha;
  // Opacity passes through entry, hold, and a brief peak, guiding
  // participants toward the invitation signal within a bounded cycle.
  if (progress < 0.3) {
    locatorAlpha = lerp(
      0,
      150,
      relSmth(progress / 0.3)
    );
  } else if (progress < 0.7) {
    locatorAlpha = 150;
  } else {
    locatorAlpha = lerp(
      150,
      packetCfg.lctrPeakAlph,
      relSmth((progress - 0.7) / 0.3)
    );
  }
  const sourcePosition = careSourcePos(source);
  const x =
    sourcePosition.x + packetCfg.locatorOffsetX;
  const y =
    sourcePosition.y + packetCfg.locatorOffsetY;
  const crossSize = packetCfg.lctrCrssSize;
  const color = packetCfg.reticleColor;
  push();
  noFill();
  strokeCap(SQUARE);
  strokeWeight(packetCfg.locatorWeight);
  stroke(
    color[0],
    color[1],
    color[2],
    carePcktAlph(locatorAlpha)
  );
  line(x - crossSize, y, x + crossSize, y);
  line(x, y - crossSize, x, y + crossSize);
  const tickRadius = packetCfg.lctrTickRad;
  const tickLength = packetCfg.lctrTickLngth;
  stroke(
    color[0],
    color[1],
    color[2],
    carePcktAlph(locatorAlpha * 0.62)
  );
  for (let index = 0; index < 4; index++) {
    const angle = index * HALF_PI;
    line(
      x + cos(angle) * tickRadius,
      y + sin(angle) * tickRadius,
      x + cos(angle) * (tickRadius + tickLength),
      y + sin(angle) * (tickRadius + tickLength)
    );
  }
  pop();
}

// 5. Invitation signals travel along the relationship and are visible to both participants
// Calculate curve control points from adjacent nodes to connect participants' gaze positions.
function careLinCrvSeg(curvePoints) {
  const curveTension =
    linkCfg.shapeTension;
  const curveSegments = [];
  for (let pointIndex = 0; pointIndex < curvePoints.length - 1; pointIndex++) {
    const previous = curvePoints[max(0, pointIndex - 1)];
    const start = curvePoints[pointIndex];
    const end = curvePoints[pointIndex + 1];
    const next = curvePoints[min(curvePoints.length - 1, pointIndex + 2)];
    curveSegments.push({
      control1: {
        x: start.x + ((end.x - previous.x) * curveTension) / 6,
        y: start.y + ((end.y - previous.y) * curveTension) / 6,
      },
      control2: {
        x: end.x - ((next.x - start.x) * curveTension) / 6,
        y: end.y - ((next.y - start.y) * curveTension) / 6,
      },
      end,
    });
  }
  return curveSegments;
}

// This function was modified with the assistance of ChatGPT.
function careLinkGeo(
  source,
  target,
  sessionId = 0,
  now = relClckNow()
) {
  if (!source || !target) return null;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  // Endpoint gaps preserve separate space for the connection
  // line, direction markers, and participant cursors.
  const gap = linkCfg.gap;
  if (distance <= gap * 2 + 0.001) return null;
  const directionX = dx / distance;
  const directionY = dy / distance;
  const normalX = -directionY;
  const normalY = directionX;
  const avlbLngth = distance - gap * 2;
  // Opposed breathing phases at the endpoints make the connection appear reciprocal.
  const triangleLength = min(
    linkCfg.triLength,
    avlbLngth * 0.24
  );
  const breathPhase =
    (TWO_PI * now) /
      linkCfg.triBreathMs +
    sessionId * 0.73;
  const brthAmpl =
    guardCfg
      .collab.link.triBreathAmp;
  const sourceBreath = 1 + sin(breathPhase) * brthAmpl;
  const targetBreath = 1 + sin(breathPhase + PI) * brthAmpl;
  const srcTrngLngth = triangleLength * sourceBreath;
  const tgtTrngLngth = triangleLength * targetBreath;
  const sourceTip = {
    x: source.x + directionX * gap,
    y: source.y + directionY * gap,
  };
  const targetTip = {
    x: target.x - directionX * gap,
    y: target.y - directionY * gap,
  };
  const sourceLineEnd = {
    x: sourceTip.x + directionX * srcTrngLngth,
    y: sourceTip.y + directionY * srcTrngLngth,
  };
  const targetLineEnd = {
    x: targetTip.x - directionX * tgtTrngLngth,
    y: targetTip.y - directionY * tgtTrngLngth,
  };
  const baseBend = min(
    distance * linkCfg.bendScale,
    linkCfg.bendMax
  );
  const driftPhase =
    now * linkCfg.driftSpeed +
    sessionId * 1.731;
  // Alternate curve direction by session so individual paths remain
  // distinguishable where multiple collaboration connections meet.
  const bendDirection = sessionId % 2 === 0 ? 1 : -1;
  const bend =
    bendDirection *
    (baseBend +
      sin(driftPhase) *
        linkCfg.drift);
  const shpNodeAmpl =
    guardCfg
      .collab.link.shapeNodeAmps;
  const shpNodePrds =
    guardCfg
      .collab.link.shpNodePrdsMs;
  const longDrft =
    guardCfg
      .collab.link.shapeLongDrift;
  const curvePoints = [sourceLineEnd];
  // Three internal nodes use independent cycles with subtle offsets,
  // giving the connection a state of ongoing negotiation.
  for (let nodeIndex = 0; nodeIndex < 3; nodeIndex++) {
    const progress = (nodeIndex + 1) * 0.25;
    const envelope = 4 * progress * (1 - progress);
    const shapePhase =
      (TWO_PI * now) / shpNodePrds[nodeIndex] +
      sessionId * 1.113 +
      nodeIndex * 2.037;
    const normalOffset =
      bend * envelope +
      sin(shapePhase) * shpNodeAmpl[nodeIndex];
    const alongOffset =
      sin(shapePhase * 0.73 + nodeIndex * 0.91) * longDrft;
    curvePoints.push({
      x:
        lerp(sourceLineEnd.x, targetLineEnd.x, progress) +
        normalX * normalOffset +
        directionX * alongOffset,
      y:
        lerp(sourceLineEnd.y, targetLineEnd.y, progress) +
        normalY * normalOffset +
        directionY * alongOffset,
    });
  }
  curvePoints.push(targetLineEnd);
  const curveSegments =
    careLinCrvSeg(curvePoints);
  return {
    distance,
    gap,
    directionX,
    directionY,
    triangleLength,
    srcTrngLngth,
    tgtTrngLngth,
    sourceBreath,
    targetBreath,
    sourceTip,
    targetTip,
    sourceLineEnd,
    targetLineEnd,
    curveMid: curvePoints[2],
    curvePoints,
    curveSegments,
    bend,
  };
}

// Make internal connection nodes follow target positions
// elastically and preserve movement state for each relationship.
// This function was modified with the assistance of ChatGPT.
function careLinElsGeo(
  geometry,
  sessionId,
  now,
  connSttStr = null
) {
  const config = guardCfg;
  const connStts =
    connSttStr ||
    care.state.linkStates ||
    (care.state.linkStates = {});
  const stateKey = String(sessionId);
  const targetNodes = geometry.curvePoints.slice(1, -1);
  let state = connStts[stateKey];
  const invalidState =
    !state ||
    !Array.isArray(state.nodes) ||
    state.nodes.length !== targetNodes.length ||
    !Number.isFinite(state.lastNow);
  // Each connection preserves node velocity, producing controlled lag when target geometry changes and
  // giving the collaborative relationship elasticity.
  if (invalidState) {
    const fadeInStartAt = Number.isFinite(state?.fadeInStartAt)
      ? state.fadeInStartAt
      : now;
    state = {
      nodes: targetNodes.map((point) => ({
        x: point.x,
        y: point.y,
        velocityX: 0,
        velocityY: 0,
      })),
      lastNow: now,
      sourceTip: { ...geometry.sourceTip },
      targetTip: { ...geometry.targetTip },
      fadeInStartAt,
      motionSpeed: 0,
      dashFlowDist:
        now *
        0.001 *
        linkCfg.dashSpeed,
    };
    connStts[stateKey] = state;
  } else {
    const elapsedMs = now - state.lastNow;
    // Snap directly to the target after a tab pause or clock anomaly.
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 250) {
      for (let index = 0; index < targetNodes.length; index++) {
        state.nodes[index].x = targetNodes[index].x;
        state.nodes[index].y = targetNodes[index].y;
        state.nodes[index].velocityX = 0;
        state.nodes[index].velocityY = 0;
      }
      state.motionSpeed = 0;
    } else {
      const deltaSeconds = min(0.05, elapsedMs * 0.001);
      if (deltaSeconds > 0) {
        const endpointTravel =
          Math.hypot(
            geometry.sourceTip.x - state.sourceTip.x,
            geometry.sourceTip.y - state.sourceTip.y
          ) +
          Math.hypot(
            geometry.targetTip.x - state.targetTip.x,
            geometry.targetTip.y - state.targetTip.y
          );
        const rawMotionSpeed = endpointTravel / (2 * deltaSeconds);
        const motionBlend =
          1 -
          exp(
            -linkCfg.motionSmooth *
              deltaSeconds
          );
        state.motionSpeed = lerp(
          state.motionSpeed,
          rawMotionSpeed,
          motionBlend
        );
        // Elastic nodes follow the target curve and decay velocity frame by frame,
        // giving the connection soft displacement.
        const velocityDecay = exp(
          -linkCfg.elasticDamp *
            deltaSeconds
        );
        for (let index = 0; index < targetNodes.length; index++) {
          const node = state.nodes[index];
          const targetNode = targetNodes[index];
          node.velocityX +=
            (targetNode.x - node.x) *
            linkCfg.elasticStiff *
            deltaSeconds;
          node.velocityY +=
            (targetNode.y - node.y) *
            linkCfg.elasticStiff *
            deltaSeconds;
          node.velocityX *= velocityDecay;
          node.velocityY *= velocityDecay;
          node.x += node.velocityX * deltaSeconds;
          node.y += node.velocityY * deltaSeconds;
          const lagX = node.x - targetNode.x;
          const lagY = node.y - targetNode.y;
          const lagDistance = Math.hypot(lagX, lagY);
          const maximumLag =
            linkCfg.elasticMaxLag;
// Keep node lag within a legible range so signal connections
// remain soft while following changes in the relationship.
          if (lagDistance > maximumLag) {
            const lagScale = maximumLag / lagDistance;
            node.x = targetNode.x + lagX * lagScale;
            node.y = targetNode.y + lagY * lagScale;
          }
        }
        const motionStrength = clamp(
          state.motionSpeed /
            linkCfg.mtnFullSpd,
          0,
          1
        );
        // Faster endpoint movement makes dashed flow more pronounced,
        // translating shared movement into stronger relational activity.
        state.dashFlowDist +=
          linkCfg.dashSpeed *
          deltaSeconds *
          (1 +
            motionStrength *
              linkCfg.mtnFlowBst);
      }
    }
    state.lastNow = now;
    state.sourceTip = { ...geometry.sourceTip };
    state.targetTip = { ...geometry.targetTip };
  }
  const curvePoints = [
    geometry.sourceLineEnd,
    ...state.nodes.map((node) => ({ x: node.x, y: node.y })),
    geometry.targetLineEnd,
  ];
  return {
    ...geometry,
    curveMid: curvePoints[2],
    curvePoints,
    curveSegments:
      careLinCrvSeg(curvePoints),
    dashFlowDist: state.dashFlowDist,
    motionSpeed: state.motionSpeed,
    fadeInOpacity: careLinkFadeIn(state, now),
  };
}

function careLinkFadeIn(state, now) {
  if (!Number.isFinite(state?.fadeInStartAt)) return 1;
  return relSmth(
    (now - state.fadeInStartAt) /
      max(
        1,
        linkCfg.fadeInMs
      )
  );
}

function careLinFadOut(fadeOut, now) {
  return (
    1 -
    relSmth(
      (now - fadeOut.startedAt) /
        max(
          1,
          linkCfg.fadeOutMs
        )
    )
  );
}

function drawCarRndTri(
  tip,
  directionX,
  directionY,
  length,
  halfWidth,
  color,
  alpha
) {
  const baseX = tip.x - directionX * length;
  const baseY = tip.y - directionY * length;
  const normalX = -directionY;
  const normalY = directionX;
  const points = [
    tip,
    {
      x: baseX + normalX * halfWidth,
      y: baseY + normalY * halfWidth,
    },
    {
      x: baseX - normalX * halfWidth,
      y: baseY - normalY * halfWidth,
    },
  ];
  // The triangle marks transfer direction, while rounded corners soften the invitation contour.
  const roundness = clamp(
    linkCfg.triRound,
    0,
    0.45
  );
  const context = drawingContext;
  context.save();
  context.beginPath();
// Connect each vertex with a quadratic curve so the collaborative contour bends continuously.
  for (let index = 0; index < points.length; index++) {
    const previous = points[(index + points.length - 1) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const entryX = lerp(current.x, previous.x, roundness);
    const entryY = lerp(current.y, previous.y, roundness);
    const exitX = lerp(current.x, next.x, roundness);
    const exitY = lerp(current.y, next.y, roundness);
    if (index === 0) context.moveTo(entryX, entryY);
    else context.lineTo(entryX, entryY);
    context.quadraticCurveTo(current.x, current.y, exitX, exitY);
  }
  context.closePath();
  context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${
    clamp(alpha, 0, 255) / 255
  })`;
  context.fill();
  context.restore();
}

// Generate a stable pseudorandom value for a specified dash segment so redraws preserve the same rhythm.
function careLinDasUni(
  dashIndex,
  sessionId,
  salt
) {
  const value =
    sin(
      (dashIndex + 1) * 12.9898 +
        (sessionId + 1) * 78.233 +
        salt * 37.719
    ) * 43758.5453;
  return value - floor(value);
}

function careLinDasPrf(sessionId = 0) {
  const config = guardCfg;
  const profiles = [];
  for (
    let dashIndex = 0;
    dashIndex < linkCfg.dashVrntN;
    dashIndex++
  ) {
    profiles.push({
      length: lerp(
        linkCfg.dashLengthMin,
        linkCfg.dashLengthMax,
        careLinDasUni(
          dashIndex,
          sessionId,
          0.17
        )
      ),
      gap: lerp(
        linkCfg.dashGapMin,
        linkCfg.dashGapMax,
        careLinDasUni(
          dashIndex,
          sessionId,
          0.53
        )
      ),
      alphaScale: lerp(
        linkCfg.dashAlphMinScl,
        linkCfg.dashAlphMaxScl,
        careLinDasUni(
          dashIndex,
          sessionId,
          0.89
        )
      ),
    });
  }
  return profiles;
}

// Calculate a position on a cubic Bezier curve from the given control points and progress.
function careLinkCbcPnt(
  start,
  control1,
  control2,
  end,
  progress
) {
  const inverse = 1 - progress;
  const startWeight = inverse * inverse * inverse;
  const control1Weight = 3 * inverse * inverse * progress;
  const control2Weight = 3 * inverse * progress * progress;
  const endWeight = progress * progress * progress;
  return {
    x:
      start.x * startWeight +
      control1.x * control1Weight +
      control2.x * control2Weight +
      end.x * endWeight,
    y:
      start.y * startWeight +
      control1.y * control1Weight +
      control2.y * control2Weight +
      end.y * endWeight,
  };
}

// Sample the curve in segments and accumulate distance so dashes can be clipped by path length.
// This function was modified with the assistance of ChatGPT.
function careLinSmpPat(geometry) {
  const points = [{ ...geometry.sourceLineEnd, distance: 0 }];
  const steps =
    linkCfg.dashCurveSteps;
  let segmentStart = geometry.sourceLineEnd;
  let totalLength = 0;
  let previousPoint = segmentStart;
  for (const segment of geometry.curveSegments) {
    for (let step = 1; step <= steps; step++) {
      const point = careLinkCbcPnt(
        segmentStart,
        segment.control1,
        segment.control2,
        segment.end,
        step / steps
      );
      totalLength += Math.hypot(
        point.x - previousPoint.x,
        point.y - previousPoint.y
      );
      points.push({ ...point, distance: totalLength });
      previousPoint = point;
    }
    segmentStart = segment.end;
  }
  return { points, totalLength };
}

function strkCarLinRng(
  context,
  sampledPath,
  startDistance,
  endDistance
) {
  // Clip the sampled path by cumulative length so dash
  // segments continue across multiple curve-sampling intervals.
  const clippedStart = max(0, startDistance);
  const clippedEnd = min(sampledPath.totalLength, endDistance);
  if (clippedEnd <= clippedStart) return false;
  let hasPoint = false;
  context.beginPath();
  for (let index = 1; index < sampledPath.points.length; index++) {
    const previous = sampledPath.points[index - 1];
    const current = sampledPath.points[index];
    if (current.distance < clippedStart || previous.distance > clippedEnd) {
      continue;
    }
    const sectionLength = current.distance - previous.distance;
    if (sectionLength <= 0.0001) continue;
    const sectionStart = max(clippedStart, previous.distance);
    const sectionEnd = min(clippedEnd, current.distance);
    if (sectionEnd <= sectionStart) continue;
    const startProgress =
      (sectionStart - previous.distance) / sectionLength;
    const endProgress = (sectionEnd - previous.distance) / sectionLength;
    const startX = lerp(previous.x, current.x, startProgress);
    const startY = lerp(previous.y, current.y, startProgress);
    const endX = lerp(previous.x, current.x, endProgress);
    const endY = lerp(previous.y, current.y, endProgress);
    if (!hasPoint) {
      context.moveTo(startX, startY);
      hasPoint = true;
    } else {
      context.lineTo(startX, startY);
    }
    context.lineTo(endX, endY);
  }
  if (!hasPoint) return false;
  context.stroke();
  return true;
}

function drawCareLink(
  source,
  target,
  color,
  alpha,
  sessionId = 0,
  now = relClckNow(),
  options = null
) {
  // Clear corresponding state and skip rendering when connection geometry is unavailable.
  const targetGeometry = careLinkGeo(
    source,
    target,
    sessionId,
    now
  );
  if (!targetGeometry) return false;
  const geometry = careLinElsGeo(
    targetGeometry,
    sessionId,
    now,
    options?.connStts || null
  );
  // Callers may override departure opacity; the default path uses the connection's own fade-in progress.
  const opacity = clamp(
    Number.isFinite(options?.opacity)
      ? options.opacity
      : geometry.fadeInOpacity,
    0,
    1
  );
  if (opacity <= 0) return true;
  const context = drawingContext;
  const dashProfiles =
    careLinDasPrf(sessionId);
  const dashCycle = dashProfiles.reduce(
    (sum, profile) => sum + profile.length + profile.gap,
    0
  );
  // Offset dash phases by participant identifier.
  const flowDistance = geometry.dashFlowDist + sessionId * 13;
  const cycleOffset = ((flowDistance % dashCycle) + dashCycle) % dashCycle;
  // Sample the curve by distance and reveal dash segments at varying opacities,
  // combining organic rhythm with continuous flow.
  const sampledPath =
    careLinSmpPat(geometry);
  context.save();
  context.setLineDash([]);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth =
    linkCfg.weight;
  let dashCursor = -dashCycle + cycleOffset;
  let dashIndex = 0;
  while (dashCursor < sampledPath.totalLength) {
    const profile = dashProfiles[dashIndex % dashProfiles.length];
    context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${
      clamp(
        (alpha * profile.alphaScale +
          guardCfg
            .collab.link.alphaBoost) * opacity,
        0,
        255
      ) / 255
    })`;
    strkCarLinRng(
      context,
      sampledPath,
      dashCursor,
      dashCursor + profile.length
    );
    dashCursor += profile.length + profile.gap;
    dashIndex++;
  }
  context.restore();
  // Draw endpoint markers after the dashes, keeping direction
  // cues clear while sharing overall departure opacity.
  const triangleAlpha =
    (alpha *
      guardCfg
        .collab.link.triAlphaScale +
      guardCfg
        .collab.link.triAlphaBoost) *
    opacity;
  const halfWidth =
    guardCfg
      .collab.link.triHalfWidth;
  drawCarRndTri(
    geometry.sourceTip,
    -geometry.directionX,
    -geometry.directionY,
    geometry.srcTrngLngth,
    halfWidth * geometry.sourceBreath,
    color,
    triangleAlpha
  );
  drawCarRndTri(
    geometry.targetTip,
    geometry.directionX,
    geometry.directionY,
    geometry.tgtTrngLngth,
    halfWidth * geometry.targetBreath,
    color,
    triangleAlpha
  );
  return true;
}

function getCareLinkPrs() {
  if (!activeSession?.camera?.gaze) return [];
  const collIds = care.state.collIds || [];
  // Connect accepted sessions that still have gaze coordinates.
  const userSess = [
    activeSession,
    ...sessions.filter(
      (session) =>
        session !== activeSession &&
        collIds.includes(session.id) &&
        session.camera?.gaze
    ),
  ];
  const pairs = [];
  for (
    let firstIndex = 0;
    firstIndex < userSess.length;
    firstIndex++
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < userSess.length;
      secondIndex++
    ) {
      const first = userSess[firstIndex];
      const second = userSess[secondIndex];
      // Connections involving the primary participant use the other participant's identifier;
      // other combinations use a stable pair identifier to preserve animation phase.
      const connectorId =
        firstIndex === 0
          ? second.id
          : maxIxSessions +
            min(first.id, second.id) * maxIxSessions +
            max(first.id, second.id);
      pairs.push({
        source: first.camera.gaze,
        target: second.camera.gaze,
        srcSssnId: first.id,
        tgtSssnId: second.id,
        connectorId,
      });
    }
  }
  return pairs;
}

// Fade the connection in after collaboration is accepted, preserving the current participant's endpoint
function bgnCarLinFadIn(
  now = relClckNow()
) {
  const connStts =
    care.state.linkStates ||
    (care.state.linkStates = {});
  for (const pair of care.getLinkPairs()) {
    const stateKey = String(pair.connectorId);
    const state = connStts[stateKey];
    if (Number.isFinite(state?.fadeInStartAt)) continue;
    connStts[stateKey] = {
      ...(state || {}),
      fadeInStartAt: now,
    };
  }
}

// Copy connection endpoints and opacity when relational care ends so
// the relationship line can fade independently after session cleanup.
function bgnCarLinFadOu(
  now = relClckNow()
) {
  const pairs = care.getLinkPairs();
  if (!pairs.length) return false;
  const connStts =
    care.state.linkStates || {};
  careLinkFades.push({
    startedAt: now,
    connStts,
    pairs: pairs.map((pair) => ({
      connectorId: pair.connectorId,
      srcSssnId: pair.srcSssnId,
      tgtSssnId: pair.tgtSssnId,
      source: { x: pair.source.x, y: pair.source.y },
      target: { x: pair.target.x, y: pair.target.y },
      startOpacity: careLinkFadeIn(
        connStts[String(pair.connectorId)],
        now
      ),
    })),
  });
  return true;
}

function careLinFadPnt(sessionId, fallback) {
  const session = sessions.find(
    (candidate) => candidate.id === sessionId
  );
  return session?.camera?.gaze || fallback;
}

// Render connection fade-out independently after relational-care state is released.
function drawCarLinFadO(now = frame.now) {
  if (!careLinkFades.length) return;
  const connectorColor =
    packetCfg.reticleColor;
  const pulse = 0.5 + 0.5 * sin(now * 0.0032);
  const alpha = lerp(
    linkCfg.alphaMin,
    linkCfg.alphaMax,
    pulse
  );
  push();
  noFill();
  strokeCap(ROUND);
  for (
    let index = careLinkFades.length - 1;
    index >= 0;
    index--
  ) {
    const fadeOut = careLinkFades[index];
    const fadeOpacity = careLinFadOut(
      fadeOut,
      now
    );
    if (fadeOpacity <= 0) {
      careLinkFades.splice(index, 1);
      continue;
    }
    for (const pair of fadeOut.pairs) {
      drawCareLink(
        careLinFadPnt(
          pair.srcSssnId,
          pair.source
        ),
        careLinFadPnt(
          pair.tgtSssnId,
          pair.target
        ),
        connectorColor,
        alpha,
        pair.connectorId,
        now,
        {
          connStts: fadeOut.connStts,
          opacity: pair.startOpacity * fadeOpacity,
        }
      );
    }
  }
  pop();
}

// 6. Care feedback remains above lifeforms while leaving visual space for the world
// Compose collaboration connections, invitation signals, data packets, and target-location feedback
function drawCareSignal() {
  const relActv =
    care.state.collabMode === "relational" &&
    care.state.collabStatus === "accepted";
  const okLinkActv =
    relActv ||
    (care.state.collabStatus === "offered" &&
      care.state.collIds.length > 0);
  if (
    (care.state.collabStatus !== "offered" &&
      !relActv) ||
    !care.state.source
  ) {
    return;
  }
  const color = guardCfg.progressColor;
  const connectorColor =
    packetCfg.reticleColor;
  push();
  noFill();
  strokeCap(ROUND);
  // Continue drawing accepted relationships; during invitation,
  // draw connections that already have explicit targets.
  if (okLinkActv) {
    const pulse = 0.5 + 0.5 * sin(frame.now * 0.0032);
    const alpha = lerp(
      linkCfg.alphaMin,
      linkCfg.alphaMax,
      pulse
    );
    for (const pair of care.getLinkPairs()) {
      drawCareLink(
        pair.source,
        pair.target,
        connectorColor,
        alpha,
        pair.connectorId,
        frame.now
      );
    }
  }
  // Send invitation data packets to respondents with valid gaze positions who remain visible.
  if (care.state.collabStatus === "offered") {
    drawPcktLctr(care.state.source);
    const responders = carePeers();
    for (const session of responders) {
      const target = session.camera?.gaze;
      if (!target) continue;
      const signal = care.state.signals[session.id];
      if (!signal) continue;
      if (signal.visible === false) continue;
      const acceptanceMs =
        care.state.cllbAccWndMs[session.id] || 0;
      const accpProg = clamp(
        acceptanceMs / collabCfg.acceptMs,
        0,
        1
      );
      push();
      drawingContext.globalAlpha *=
        careSgnFadAlp(signal);
      drawCarPckDat(
        signal,
        session.id,
        accpProg,
        color
      );
      pop();
    }
  }
  drawingContext.setLineDash([]);
  pop();
}

// 4. Making room for focus while preserving rendering boundaries
// This section renders from deepFocus and target snapshots;
// the state machine continues to advance target selection and phase transitions.
function fcsArchPnts(windowRect, inset = 0, segments = 32) {
  const left = windowRect.x + inset;
  const right = windowRect.x + windowRect.width - inset;
  const top = windowRect.y + inset;
  const bottom = windowRect.y + windowRect.height - inset;
  const radiusX = max(1, (right - left) * 0.5);
  const archHeight = min(
    radiusX,
    max(1, (bottom - top) * 0.42)
  );
  const centerX = (left + right) * 0.5;
  const shoulderY = top + archHeight;
  const points = [
    { x: left, y: bottom },
    { x: left, y: shoulderY },
  ];
  for (let index = 0; index <= segments; index++) {
    const angle = PI + (PI * index) / segments;
    points.push({
      x: centerX + cos(angle) * radiusX,
      y: shoulderY + sin(angle) * archHeight,
    });
  }
  points.push(
    { x: right, y: bottom },
    { x: left, y: bottom }
  );
  return points;
}

function drawFocusArch(points) {
  beginShape();
  for (const point of points) vertex(point.x, point.y);
  endShape(CLOSE);
}

// Arrange phase text within the focus window and give entry, hold, and departure the same visual anchor.
// This function was modified with the assistance of ChatGPT.
function drawFocusText(
  message,
  points,
  alpha,
  textColor,
  revealProgress = 1,
  alphaProg = 1,
  maximumAlpha = deepCfg.focusTextAlpha
) {
  if (alpha <= 0 || revealProgress <= 0 || alphaProg <= 0) return;
  const layoutScale = fcsLytScl();
  const reptMsg =
    message +
    " ".repeat(
      deepCfg.fcsSentSpcs
    );
  // Convert the arched polyline into a path with cumulative lengths
  // so character spacing is independent of sample-point density.
  const segments = [];
  let totalLength = 0;
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index];
    const end = points[index + 1];
    const length = dist(start.x, start.y, end.x, end.y);
    if (length <= 0.001) continue;
    segments.push({ start, end, length, offset: totalLength });
    totalLength += length;
  }
  if (!segments.length || !reptMsg.length) return;
  // The visible range grows along actual path length,
  // synchronizing text reveal with the unfolding focus window.
  const visibleLength =
    totalLength *
    clamp(deepCfg.fcsTextCovr, 0, 1) *
    clamp(revealProgress, 0, 1);

  textAlign(CENTER, CENTER);
  fill(
    textColor[0],
    textColor[1],
    textColor[2],
    maximumAlpha *
      alpha *
      clamp(alphaProg, 0, 1)
  );
  noStroke();
  drawingContext.save();
  drawingContext.shadowColor =
    `rgba(${textColor[0]}, ${textColor[1]}, ${textColor[2]}, ` +
    `${deepCfg.fcsTexGloAlp})`;
  drawingContext.shadowBlur =
    deepCfg.fcsTexGloBlu * layoutScale;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 0;
  let cursor = 2;
  let characterIndex = 0;
  let segmentIndex = 0;
  // Advance characters along the path by their actual widths, repeating the message when necessary.
  while (cursor < visibleLength - 2) {
    const character = reptMsg[characterIndex];
    const characterWidth = max(2, textWidth(character));
    const charCntr = cursor + characterWidth * 0.5;
    if (
      charCntr >= totalLength - 2 ||
      charCntr > visibleLength
    ) {
      break;
    }
    while (
      segmentIndex < segments.length - 1 &&
      charCntr >
        segments[segmentIndex].offset + segments[segmentIndex].length
    ) {
      segmentIndex++;
    }
    const segment = segments[segmentIndex];
    const progress = clamp(
      (charCntr - segment.offset) / segment.length,
      0,
      1
    );
    if (character !== " ") {
      const pathAngle = atan2(
        segment.end.y - segment.start.y,
        segment.end.x - segment.start.x
      );
      const wavePhase =
        (charCntr * TWO_PI) /
          (deepCfg.fcsTexWavLng * layoutScale) +
        deepFocus.entryElapsedMs *
          0.001 *
          deepCfg.fcsTextWaveSpd *
          TWO_PI;
      const jitterPhase =
        charCntr * 0.713 +
        (deepFocus.target?.seed || 0) * 0.017;
      // Waves offset along the path normal while text rotates with the tangent,
      // preserving organic movement and a readable direction.
      const normalOffset =
        sin(wavePhase) *
          deepCfg.fcsTextWaveAmp *
          layoutScale +
        sin(jitterPhase) *
          deepCfg.fcsTextJttr *
          layoutScale;
      const tilt =
        cos(wavePhase) * deepCfg.focusTextTilt +
        sin(jitterPhase * 1.37) *
          deepCfg.focusTextTilt *
          0.45;
      const characterX = lerp(
        segment.start.x,
        segment.end.x,
        progress
      );
      const characterY = lerp(
        segment.start.y,
        segment.end.y,
        progress
      );
      push();
      translate(
        characterX - sin(pathAngle) * normalOffset,
        characterY + cos(pathAngle) * normalOffset
      );
      rotate(pathAngle + tilt);
      text(character, 0, 0);
      pop();
    }
    cursor +=
      characterWidth +
      deepCfg.fcsLttrSpcng * layoutScale;
    characterIndex++;
    if (characterIndex >= reptMsg.length) {
      characterIndex = 0;
    }
  }
  drawingContext.restore();
}

// Convert focus-result text reveal progress into a smooth blend value.
function fcsMsgMix(progress) {
  const config = deepCfg;
  const txProg = clamp(progress, 0, 1);
  const focusAlpha =
    1 -
    deepFocusEase(
      txProg / config.fcsMsgFadeEnd
    );
  const restAlpha = deepFocusEase(
    (txProg - config.restMsgFadStr) /
      (1 - config.restMsgFadStr)
  );
  return { focusAlpha, restAlpha };
}

// Draw masks, prompts, and exit feedback according to the Deep Diver's current focus phase.
function drawFcsWndw() {
  if (
    !deepFocus.window ||
    deepFocus.windowProgress <= 0
  ) {
    return;
  }
  const config = deepCfg;
  const layoutScale = fcsLytScl();
  const windowRect = curFcsWndw();
  const alpha = fcsWndwAlph();
  const textShowProg = deepFocusEase(
    deepFocus.entryElapsedMs /
      config.fcsTextShowMs
  );
  const textAlphaProg = deepFocusEase(
    deepFocus.entryElapsedMs /
      config.fcsTextFadeMs
  );
  // The arched mask and text share the same geometry source.
  const archPoints = fcsArchPnts(windowRect);
  push();
  noStroke();
  drawingContext.save();
  // destination-out cuts a transparent focus window through the darkened environment.
  drawingContext.globalCompositeOperation = "destination-out";
  drawingContext.filter =
    `blur(${config.fcsWndwBlur}px)`;
  fill(255, config.fcsWndwAlph * alpha);
  drawFocusArch(archPoints);
  drawingContext.restore();
  textFont(config.focusFont);
  textStyle(NORMAL);
  textSize(config.focusTextSize * layoutScale);
  push();
  translate(windowRect.centerX, windowRect.centerY);
  scale(shrdFcsBrth());
  translate(-windowRect.centerX, -windowRect.centerY);
  const textPath = fcsArchPnts(
    windowRect,
    config.focusTextInset * layoutScale
  );
  const restMessage = "Rest before the next flow.";
  if (deepFocus.message === restMessage) {
    const txProg =
      deepFocus.phase === "breathing"
        ? clamp(
            deepFocus.phaseElapsedMs /
              config.focusMessageMs,
            0,
            1
          )
        : 1;
    const { focusAlpha, restAlpha } =
      fcsMsgMix(txProg);
    drawFocusText(
      "Focus has entered a steady flow.",
      textPath,
      alpha * focusAlpha,
      [255, 255, 255],
      textShowProg,
      textAlphaProg
    );
    drawFocusText(
      restMessage,
      textPath,
      alpha * restAlpha,
      config.restTextColor,
      textShowProg,
      textAlphaProg,
      config.restTextAlpha
    );
  } else {
    drawFocusText(
      deepFocus.message,
      textPath,
      alpha,
      [255, 255, 255],
      textShowProg,
      textAlphaProg
    );
  }
  pop();
  pop();
}

function drawFcsBbbls() {
  // Bubbles appear during breathing and exit phases, then
  // release according to their individual delays and durations.
  if (
    deepFocus.phase !== "breathing" &&
    deepFocus.phase !== "exiting"
  ) {
    return;
  }
  const config = deepCfg;
  for (const bubble of deepFocus.bubbles) {
    const progress = clamp(
      (deepFocus.bbblElapsedMs - bubble.delay) /
        bubble.duration,
      0,
      1
    );
    if (progress <= 0 || progress >= 1) continue;
    const eased = deepFocusEase(progress);
    const alpha = sin(progress * PI);
    const bubbleX =
      bubble.originX + bubble.driftX * eased;
    const bubbleY =
      bubble.originY -
      config.fcsBbblOffst -
      config.fcsBbblRise * eased;
    push();
    noFill();
    drawingContext.save();
    drawingContext.shadowColor =
      `rgba(225, 247, 255, ${config.fcsBbbGloAlp * alpha})`;
    drawingContext.shadowBlur = config.fcsBbbGloBlu;
    stroke(225, 247, 255, config.fcsBbblAlph * alpha);
    strokeWeight(1.2);
    circle(bubbleX, bubbleY, bubble.size * lerp(0.7, 1.25, eased));
    drawingContext.restore();
    pop();
  }
}

// Draw the focus target in its in-window pose on the overlay
// while the world array continues storing its true coordinates.
function drawFcsTgt(ctx, target = deepFocus.target) {
  if (!target) return;
  const originalX = target.x;
  const originalY = target.y;
  const orgnRot = target.rot;
  target.x = deepFocus.visualX;
  target.y = deepFocus.visualY;
  target.rot = orgnRot + deepFocus.visualRotation;
  try {
    drawDomnLife(target, ctx);
  } finally {
    target.x = originalX;
    target.y = originalY;
    target.rot = orgnRot;
  }
}

// In multiplayer mode, collect targets still being interacted
// with by other participants and their owning sessions.
function prtcDeepDvrs() {
  if (ixUserCount <= 1) return new Map();
  const actvDeepSess = sessions.filter(
    (session) =>
      session.enabled &&
      session.deepFocus.phase !== "idle" &&
      session.deepFocus.window &&
      session.deepFocus.windowProgress > 0
  );
  if (!actvDeepSess.length) return new Map();

  const prtcTrgts = new Map();
  for (const entity of [...creatures, ...parasites]) {
    const owner = ixTargetOwners.get(entity);
    if (
      !owner?.enabled ||
      !isEncounterActive(entity) ||
      !actvDeepSess.some((deepSession) => deepSession !== owner)
    ) {
      continue;
    }
    prtcTrgts.set(entity, owner);
  }
  return prtcTrgts;
}

// Redraw protected interaction targets under their owning sessions,
// then restore the original session after rendering.
function drawSafeDeep(ctx) {
  const prevSssn = activeSession;
  try {
    for (const [target, owner] of prtcDeepDvrs()) {
      if (!isVisible(target)) continue;
      bindIxSession(owner);
      if (
        target === deepFocus.target &&
        deepFocus.phase !== "idle"
      ) {
        drawFcsTgt(ctx, target);
      } else {
        drawDomnLife(target, ctx);
      }
    }
  } finally {
    bindIxSession(prevSssn);
  }
}

// Compose the focus overlay in window, target, bubble, and exit-feedback layers,
// displaying it during session-visible phases.
function drawDeepFocus(ctx) {
  const target = deepFocus.target;
  if (deepFocus.phase === "idle") return;
  if (!target) return;
  drawFcsWndw();
  drawFcsTgt(ctx, target);
  drawFcsBbbls();
}

// 8. Specialized interaction feedback returns to the main loop through one view object.
window.InteractionView = Object.freeze({
  drawCellChildren: drawCellChld,
  drawReturnFeedback: drawRtrnFb,
  drawGuardianOverlay: drawCareOvrly,
  drawGuardianTopLayer: drawGuaTopLyr,
  drawGuardianPanel: drawCarePanel,
  drawGuardianLinkFadeOut: drawCarLinFadO,
  drawGuardianSignal: drawCareSignal,
  drawDeepFocusSafe: drawSafeDeep,
  drawDeepFocus: drawDeepFocus,
});
