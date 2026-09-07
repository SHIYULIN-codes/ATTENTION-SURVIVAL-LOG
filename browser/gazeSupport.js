// File Overview
// Provides the Basic Cell, calibration interface, and supporting elements
// used by gaze-based participation.

// 1. The audience enters the ecology through intentional choice
// BasicCell holds potential, while the calibration path and
// participation interface leave the choice to the audience.
(() => {
"use strict";

// 2. BasicCell grows from potential into visible life
// Each factory manages local geometry and DOM state; GazeEngine manages the video stream,
// calibration samples, and participant sessions.
const gazeSupport = Object.create(null);

(() => {
  "use strict";

  // Create the BasicCell type and its lifecycle interface
  // after injecting world and rendering dependencies.
  function create(deps) {
    const {
      gazeRandom,
      cellRules,
      gazeConfig,
      legacyEvent,
      makeWaveBuffer,
      lifeType,
      world,
      cubicSmoothstep,
      updtCellAnim,
      updtPathFllw,
      makeOrgRing,
      offstRingPnts,
      drawWavFilWitH,
      drawWaveRing,
      softGlow,
    } = deps;

// A BasicCell retains an open form, allowing the gaze
// relationship to determine what kind of life it becomes next.
    return class BasicCell {
  constructor(x, y, rotation, size, cruiseCenter) {
    this.x0 = x;
    this.y0 = y;
    this.x = x;
    this.y = y;
    this.rotation0 = rotation;
    this.rotation = rotation;
    this.targetSize = size;
    this.size = max(0.03, size * 0.12);
    this.growthStart = millis();
    // The lifecycle begins with growth; interaction and
    // migration pause its passage while preserving elapsed time.
    this.lifeDuration = gazeRandom(cellRules.lifeMin, cellRules.lifeMax);
    this.lifeConsumedMs = 0;
    this.lifeRemainingMs = this.lifeDuration;
    this.lifeLastUpdatedAt = null;
    this.lifeClockPauseReason = "birth-growth";
    this.lifePhase = "growing";
    this.lifeSafeSince = null;
    this.lifeDeathStartedAt = null;
    this.lifeDthBaseRad = null;
    this.lifeDeathOutcome = null;
    this.lifeParasiteBorn = false;
    this.lifeMoveMul = 1;
    this.lifePulseScale = 1;
    this.opacity = 1;
    this.deathScale = 1;
    this.dead = false;
    // Differentiation fields jointly store color, opacity, and fade
    // progress so different species can reuse the same transition protocol.
    this.differentiating = false;
    this.countsForBirth = true;
    this.diffStart = -Infinity;
    this.diffDuration = cellRules.diffDuration;
    this.diffColorMs72 =
      cellRules.diffColorMs72;
    this.diffColorProg = 0;
    this.diffColors = {
      body: gazeConfig.color.slice(),
      core: gazeConfig.color.slice(),
      line: [255, 255, 255],
    };
    this.diffAlphas = {
      body: cellRules.bodyFillAlpha,
      core: cellRules.coreFillAlpha,
      coreLine: cellRules.coreStrkAlph,
      outline: cellRules.lineStrkAlph,
    };
    this.diffStrtAlpha = 1;
    this.diffSkipsColor = false;
// The glow records brightness changes introduced by participants,
// stored separately from the cell's growth state.
    this.audnImpctDiff = false;
    this.crowdGlow = 0;
    this.userGlowAt = this.growthStart;
    this.glowOffAt = null;
    this.brthGloStaAt = null;
    this.directAppr = null;
    this.cellReturnHold = null;
    this.cellRtrnShow = 1;
    this.cruiseCenter = cruiseCenter;
    // Path parameters preserve an independent delay and spacing for each cell.
    this.followDelayMs = gazeRandom(
      cellRules.followDelayMin,
      cellRules.followDelayMax
    );
    this.followSpeed = gazeRandom(
      cellRules.followSpeedMin,
      cellRules.followSpeedMax
    );
    this.followDistance = gazeRandom(
      cellRules.fllwDistMin,
      cellRules.fllwDistMax
    );
    this.pathLtrlOffst = gazeRandom(
      cellRules.pathLtrOffMin,
      cellRules.pathLtrOffMax
    );
    this.separationGap = gazeRandom(
      cellRules.seprGapMin,
      cellRules.seprGapMax
    );
    this.followStartAt = this.growthStart;
    this.followLastQueuedAt = this.followStartAt;
    this.followPath = [];
    this.seed = gazeRandom(1e6);
    this.dy = 0;
    this.b = 1;
    this.rw = gazeRandom(0.7, 1.4);
    this.tt = gazeRandom(9999);
    this.type = lifeType.basicCell;
    this.name = "Basic Cell";
    this.coreDiameter = gazeRandom(
      cellRules.coreDimtMin,
      cellRules.coreDimtMax
    );
    // Waveform buffers and outline points reuse preallocated arrays,
    // reducing memory allocation when organic outlines are generated each frame.
    this.bodyWave = makeWaveBuffer(cellRules.bodyWaveSteps);
    this.coreWaveBuffer = makeWaveBuffer(cellRules.coreWaveSteps);
    this.coreFillPoints = Array.from(
      { length: cellRules.coreWaveSteps },
      () => [0, 0]
    );
    this.coreCttPnts = Array.from(
      { length: cellRules.coreWaveSteps },
      () => [0, 0]
    );
    this.core = this.createCore();
    this.innerCircles = this.makeInnerRings();
    // The dashed-line rhythm is fixed at construction;
    // differences between individual outlines come from stable seeds.
    this.outlineDashPattern = [];
    const lineDashPairN = floor(
      gazeRandom(
        cellRules.lineDasPaiNMin,
        cellRules.lineDasPaiNMax + 1
      )
    );
    for (
      let index = 0;
      index < lineDashPairN;
      index++
    ) {
      this.outlineDashPattern.push(
        gazeRandom(
          cellRules.lineDasLngMin,
          cellRules.lineDasLngMax
        ),
        gazeRandom(
          cellRules.lineDashGapMin,
          cellRules.lineDashGapMax
        )
      );
    }
  }

  // The hit radius shrinks with the lifecycle scale while retaining a minimum value.
  get attnRad() {
    return max(
      24,
      cellRules.bodyDiameter *
        0.5 *
        gazeConfig.drawScale *
        this.size *
        this.b *
        this.deathScale
    );
  }

  // The visible radius uses the true lifecycle scale so
  // the rendered size fully reflects growth and fading.
  get visualRadius() {
    return (
      cellRules.bodyDiameter *
      0.5 *
      gazeConfig.drawScale *
      this.size *
      this.b *
      this.deathScale
    );
  }

  // The attentional anchor rotates with the eccentric core,
  // placing the gaze target at the lifeform's visual center of gravity.
  get attnAnchr() {
    const renderScale = gazeConfig.drawScale * this.size * this.b * this.deathScale;
    const rotationCosine = cos(this.rotation);
    const rotationSine = sin(this.rotation);
    return {
      x:
        this.x +
        (this.core.x * rotationCosine - this.core.y * rotationSine) * renderScale,
      y:
        this.y +
        (this.core.x * rotationSine + this.core.y * rotationCosine) * renderScale,
    };
  }

  beginBirthGlow(now) {
    this.brthGloStaAt = now;
  }

  // The birth glow derives its appearance and decay from the target's own timeline.
  brthGlowProg(now, impactGlow) {
    if (!Number.isFinite(this.brthGloStaAt)) return 0;
    const elapsed = max(0, now - this.brthGloStaAt);
    const fadeInMs = max(1, impactGlow.fadeInMs);
    const holdEndsAt = fadeInMs + impactGlow.bscCelBrtHolMs;
    if (elapsed < fadeInMs) return constrain(elapsed / fadeInMs, 0, 1);
    if (elapsed < holdEndsAt) return 1;
    return constrain(
      1 - (elapsed - holdEndsAt) / max(1, impactGlow.fadeOutMs),
      0,
      1
    );
  }

  // BasicCell core and internal ring structure
  createCore() {
    const angle = gazeRandom(TWO_PI);
    const centerDistance = gazeRandom(
      cellRules.coreOffsetMin,
      cellRules.coreOffsetMax
    );
    return {
      x: cos(angle) * centerDistance,
      y: sin(angle) * centerDistance,
    };
  }

  // Randomly determine the number, position, size, and color of internal
  // particles at creation; later rendering retains these textures.
  makeInnerRings() {
    const count = floor(
      gazeRandom(cellRules.innerRingMin, cellRules.innerRingMax + 1)
    );
    const bodyRadius = cellRules.bodyDiameter * 0.5;
    const circles = [];

    for (let index = 0; index < count; index++) {
      const scale = gazeRandom(
        cellRules.innerScaleMin,
        cellRules.innerScaleMax
      );
      const diameter = cellRules.innerBaseSize * scale;
      const radius = diameter * 0.5;
      const maxDistance = max(0, bodyRadius - radius - 5);
      let x = 0;
      let y = 0;

      // Bounded sampling distributes particles outside the core while
      // retaining a deterministic central fallback for extreme sizes.
      for (let attempt = 0; attempt < 80; attempt++) {
        const angle = gazeRandom(TWO_PI);
        const centerDistance = sqrt(gazeRandom()) * maxDistance;
        const candidateX = cos(angle) * centerDistance;
        const candidateY = sin(angle) * centerDistance;
        const coreClearance = this.coreDiameter * 0.5 + radius + 2;
        if (
          dist(candidateX, candidateY, this.core.x, this.core.y) >= coreClearance
        ) {
          x = candidateX;
          y = candidateY;
          break;
        }
      }

      const particleColor = gazeRandom(cellRules.innrRingClrs);
      circles.push({ x, y, diameter, color: particleColor });
    }

    return circles;
  }

  // Establish a unified BasicCell differentiation clock; target species
  // reuse the same transition logic by overriding color and opacity.
  beginDiff(
    now,
    duration = cellRules.diffDuration,
    colorDuration = cellRules.diffColorMs72,
    colors = null,
    alphas = null
  ) {
    if (this.dead || this.differentiating) return false;
    this.directAppr = null;
    this.diffSkipsColor = false;
    this.differentiating = true;
    this.diffStart = now;
    this.diffDuration = max(1, duration);
    this.diffColorMs72 = max(1, colorDuration);
    this.diffColorProg = 0;
    if (colors) {
      this.diffColors = {
        body: (colors.body || gazeConfig.color).slice(),
        core: (colors.core || colors.body || gazeConfig.color).slice(),
        line: (colors.line || [255, 255, 255]).slice(),
      };
    }
    if (alphas) {
      this.diffAlphas = {
        body: alphas.body ?? cellRules.bodyFillAlpha,
        core: alphas.core ?? cellRules.coreFillAlpha,
        coreLine: alphas.coreLine ?? cellRules.coreStrkAlph,
        outline: alphas.outline ?? cellRules.lineStrkAlph,
      };
    }
    this.diffStrtAlpha = this.opacity;
    this.audnImpctDiff = true;
    return true;
  }

// Start the BasicCell fade-out and cancel its current approach plan.
  beginFadeOut(now, duration) {
    if (this.dead || this.differentiating) return false;
    this.directAppr = null;
    this.differentiating = true;
    this.diffStart = now;
    this.diffDuration = max(1, duration);
    this.diffColorMs72 = 0;
    this.diffColorProg = 0;
    this.diffStrtAlpha = this.opacity;
    this.diffSkipsColor = true;
    return true;
  }

  // This method was modified with the assistance of ChatGPT.
  update(frame) {
    // During the return-to-BasicCell transition, Guardian holds the position
    // and pauses the lifespan clock.
    if (this.cellReturnHold) {
      this.lifeLastUpdatedAt = frame.now;
      this.lifeClockPauseReason = "migration-regeneration";
      this.x = this.cellReturnHold.x;
      this.y = this.cellReturnHold.y;
      this.x0 = this.x;
      this.y0 = this.y;
      // Restore size and opacity during the reversion hold
      // while continuing to update the cell animation.
      this.opacity = 1;
      this.deathScale = 1;
      this.dead = false;
      this.size = this.targetSize;
      updtCellAnim(this, frame.dt);
      world.keep(this);
      this.rotation =
        this.rotation0 + (noise(this.seed + this.tt) - 0.5) * 0.1;
      return;
    }
// During differentiation, pause the existing lifespan clock while color and form gradually transition
// the BasicCell into its new species identity.
    if (this.differentiating) {
      this.lifeLastUpdatedAt = frame.now;
      this.lifeClockPauseReason = "diff";
      const elapsed = frame.now - this.diffStart;
      if (!this.diffSkipsColor) {
        const colorProgress = constrain(
          elapsed / this.diffColorMs72,
          0,
          1
        );
        this.diffColorProg =
          cubicSmoothstep(colorProgress);
      }
      const fadeProgress = constrain(
        (elapsed -
          (this.diffSkipsColor
            ? 0
            : this.diffColorMs72)) /
          this.diffDuration,
        0,
        1
      );
      const eased = cubicSmoothstep(fadeProgress);
      this.opacity = this.diffStrtAlpha * (1 - eased);
      this.dead = fadeProgress >= 1;
    } else {
      // Initial growth uses an ease-out curve, allowing the cell to enter the ecology gradually.
      const growthProgress = constrain(
        (frame.now - this.growthStart) / cellRules.growthDuration,
        0,
        1
      );
      const easedGrowth = 1 - pow(1 - growthProgress, 3);
      this.size = lerp(
        max(0.03, this.targetSize * 0.12),
        this.targetSize,
        easedGrowth
      );

      const lifeConfig = window.SketchConfig?.lifeMechanism;
      const brthDoneAt = this.growthStart + cellRules.growthDuration;
      const prtcFromDth = Boolean(
        this.encounterLock ||
          this.directAppr ||
          this.cellReturnHold ||
          window.InteractionSystem?.lifeMechanism?.isIxPrtc?.(this)
      );
      // Birth, encounter locks, and migration pause the lifespan clock.
      const clockPauseReason = growthProgress < 1
        ? "birth-growth"
        : this.encounterLock
          ? legacyEvent.encounterPause
          : this.directAppr
            ? "migration"
            : null;
      if (this.lifeLastUpdatedAt == null) {
        this.lifeLastUpdatedAt = max(frame.now, brthDoneAt);
      }
      const lifeElapsed = max(0, frame.now - this.lifeLastUpdatedAt);
      this.lifeLastUpdatedAt = frame.now;
      this.lifeClockPauseReason = clockPauseReason;
      if (
        this.lifeDeathStartedAt == null &&
        !clockPauseReason &&
        lifeElapsed > 0
      ) {
        this.lifeConsumedMs +=
          lifeElapsed * (window.InteractionSystem?.lifeMechanism?.lifeRate?.() ?? 1);
      }
      this.lifeRemainingMs = max(
        0,
        this.lifeDuration - this.lifeConsumedMs
      );
      // On expiry, first wait for interaction safety and the grace period.
      if (this.lifeRemainingMs > 0) {
        this.lifePhase = growthProgress < 1 ? "growing" : "alive";
        this.lifeSafeSince = null;
      } else if (this.lifeDeathStartedAt == null) {
        this.lifePhase = "expired-waiting";
        if (prtcFromDth) {
          this.lifeSafeSince = null;
        } else if (this.lifeSafeSince == null) {
          this.lifeSafeSince = frame.now;
          this.lifePhase = "safe-grace";
        } else if (
          frame.now - this.lifeSafeSince >=
          (lifeConfig?.safeGraceMs ?? 6000)
        ) {
          this.lifeDeathStartedAt = frame.now;
          this.lifeDthBaseRad = this.visualRadius;
          this.lifeDeathOutcome =
            window.InteractionSystem?.lifeMechanism?.deathOutcome?.(this) || "fade";
          this.lifeParasiteBorn = false;
          this.lifePhase = "dying";
        } else {
          this.lifePhase = "safe-grace";
        }
      }

      // After expiry, motion decays before opacity fades, gradually reducing the cell's vitality.
      this.opacity = 1;
      this.deathScale = 1;
      this.lifeMoveMul = 1;
      this.lifePulseScale = 1;
      if (this.lifeDeathStartedAt != null) {
        if (!(this.lifeDthBaseRad > 0)) {
          this.lifeDthBaseRad =
            this.visualRadius / max(0.0001, this.deathScale);
        }
        const elapsed = max(0, frame.now - this.lifeDeathStartedAt);
        const vitlDur = lifeConfig?.vitlDurMs ?? 10000;
        const vitlProg = constrain(
          elapsed / max(1, vitlDur),
          0,
          1
        );
        this.lifeMoveMul = lerp(
          1,
          lifeConfig?.activity?.fnlMoveScl ?? 0.35,
          vitlProg
        );
        this.lifePulseScale = lerp(
          1,
          lifeConfig?.activity?.fnlPlsScl ?? 0.3,
          vitlProg
        );
        // Transformation and ordinary fading share one timeline,
        // diverging at the final scale and Parasite birth point.
        const transform = this.lifeDeathOutcome === "transform";
        const deathConfig = transform
          ? lifeConfig?.transform
          : lifeConfig?.fade;
        const fadeStart = deathConfig?.startMs ?? 6000;
        const fadeDuration = deathConfig?.durationMs ?? (transform ? 4000 : 5000);
        const finalScale = deathConfig?.finalScale ?? (transform ? 0.6 : 0.7);
        const fadeProgress = constrain(
          (elapsed - fadeStart) / max(1, fadeDuration),
          0,
          1
        );
        const easedDeath =
          cubicSmoothstep(fadeProgress);
        this.opacity = 1 - easedDeath;
        this.deathScale = lerp(1, finalScale, easedDeath);
        const parsBrthAt =
          (lifeConfig?.transform?.startMs ?? 6000) +
          (lifeConfig?.transform?.birthDelayMs ?? 2500);
        // If transformation fails, fall back to ordinary fading.
        if (
          transform &&
          !this.lifeParasiteBorn &&
          elapsed >= parsBrthAt
        ) {
          this.lifeParasiteBorn = true;
          const born = window.InteractionSystem?.lifeMechanism?.spwnDthPars?.(
            this,
            frame.now
          );
          if (!born) this.lifeDeathOutcome = "fade";
        }
        const completedAt = fadeStart + fadeDuration;
        this.dead = elapsed >= completedAt;
      }

      // Near the endpoint, movement and pulsing slow down while world
      // position continues to update, preserving ecological continuity.
      const lifeFrame =
        this.lifeMoveMul < 0.999
          ? {
              ...frame,
              dt: frame.dt * this.lifeMoveMul,
            }
          : frame;
      if (!this.directAppr) updtPathFllw(this, lifeFrame);
      updtCellAnim(this, lifeFrame.dt);
      this.b = 1 + (this.b - 1) * this.lifePulseScale;
      world.keep(this);
    }
    this.rotation =
      this.rotation0 + (noise(this.seed + this.tt) - 0.5) * 0.1;
  }

// Draw a BasicCell still waiting for direction.
  // This method was modified with the assistance of ChatGPT.
  draw(frame) {
    const regrShow = constrain(
      Number(this.cellRtrnShow) || 0,
      0,
      1
    );
    // Continuously blend the differentiation color with the original cell color,
    // making the species transition clearly visible.
    const colorMix = this.diffColorProg;
    const bodyColor = gazeConfig.color.map((value, index) =>
      lerp(value, this.diffColors.body[index], colorMix)
    );
    const coreColor = gazeConfig.color.map((value, index) =>
      lerp(value, this.diffColors.core[index], colorMix)
    );
    const lineColor = [255, 255, 255].map((value, index) =>
      lerp(value, this.diffColors.line[index], colorMix)
    );
    const bodyFillAlpha = lerp(
      cellRules.bodyFillAlpha,
      this.diffAlphas.body,
      colorMix
    );
    const coreFillAlpha = lerp(
      cellRules.coreFillAlpha,
      this.diffAlphas.core,
      colorMix
    );
    const coreStrkAlph = lerp(
      cellRules.coreStrkAlph,
      this.diffAlphas.coreLine,
      colorMix
    );
    const lineStrkAlph = lerp(
      cellRules.lineStrkAlph,
      this.diffAlphas.outline,
      colorMix
    );
    // Participatory influence and relational care share the crowdGlow intensity.
    const ixGlowActive = Boolean(
      this.audnImpctDiff ||
        (this.relationalGlow &&
          frame.now < (this.relationalGlowUntil ?? Infinity))
    );
    const ixGlowElapsed = constrain(
      frame.now - this.userGlowAt,
      0,
      80
    );
    const impactGlow =
      window.SketchConfig?.settings?.userGlow;
    if (ixGlowActive) {
      this.glowOffAt = null;
    } else if (
      this.crowdGlow > 0.0001 &&
      !Number.isFinite(this.glowOffAt)
    ) {
      this.glowOffAt = frame.now;
    }
    const ixGlowHoldMs = this.relationalGlow
      ? impactGlow.relCellHoldMs
      : impactGlow.leaveHoldMs;
    // Let the glow linger briefly after an interaction ends, leaving a trace of light from the change.
    const leaveHold = Boolean(
      !ixGlowActive &&
        this.crowdGlow > 0.0001 &&
        frame.now - this.glowOffAt <
          ixGlowHoldMs
    );
    const ixGlowStep =
      ixGlowElapsed /
      max(
        1,
        ixGlowActive
          ? impactGlow.fadeInMs
          : impactGlow.fadeOutMs
      );
    this.crowdGlow = ixGlowActive
      ? min(1, this.crowdGlow + ixGlowStep)
      : leaveHold
        ? this.crowdGlow
        : max(0, this.crowdGlow - ixGlowStep);
    this.userGlowAt = frame.now;
    if (this.crowdGlow <= 0.0001) {
      this.glowOffAt = null;
    }
    // Use the greater of the birth glow and crowdGlow,
    // sharing a unified intensity ceiling when they overlap.
    const combGlowProg = max(
      this.crowdGlow,
      this.brthGlowProg(frame.now, impactGlow)
    );
    if (combGlowProg > 0.0001) {
      const linearProgress = constrain(
        combGlowProg,
        0,
        1
      );
      const easedProgress =
        linearProgress *
        linearProgress *
        linearProgress *
        (linearProgress * (linearProgress * 6 - 15) + 10);
      const pulse = softGlow.pulse(
        frame.now,
        impactGlow.pulseSpeed
      );
      const glow = softGlow.participantMetrics({
        baseRadius: this.attnRad,
        pulseValue: pulse,
        scale: impactGlow.scale,
        pulseScale: impactGlow.pulseScale,
        alpha: impactGlow.alpha,
        opacity: easedProgress * this.opacity * regrShow,
      });
      drawingContext.save();
      drawingContext.globalCompositeOperation = "screen";
      softGlow.drawRadialGradient(drawingContext, {
        x: this.x,
        y: this.y,
        radius: glow.radius,
        alpha: glow.alpha,
        color: impactGlow.color,
      });
      drawingContext.restore();
    }
    // The organic outline is driven by a stable seed and time.
    const bodyMotionTime = frame.now * 0.001 * cellRules.bodyMtnSpd;
    const motionSeed = this.seed * 0.001;
    const outlinePulse =
      1 +
      (noise(motionSeed + 10, bodyMotionTime * 0.85) - 0.5) *
        2 *
        cellRules.linePlsAmp;
    const bodyDriftX =
      (noise(motionSeed + 20, bodyMotionTime * 0.72) - 0.5) *
      2 *
      cellRules.bodyDriftAmp;
    const bodyDriftY =
      (noise(motionSeed + 40, bodyMotionTime * 0.72) - 0.5) *
      2 *
      cellRules.bodyDriftAmp;
    // The body and core use different noise frequencies, sharing the
    // cell's visual language while retaining distinct movement rhythms.
    const bodyPoints = makeOrgRing(
      cellRules.bodyDiameter,
      bodyMotionTime * cellRules.bodyWaveSpeed,
      cellRules.bodyWaveAmp,
      motionSeed + 60,
      cellRules.bodyWaveSteps,
      this.bodyWave
    );
    const corePoints = makeOrgRing(
      this.coreDiameter,
      frame.now * 0.001 * cellRules.coreWaveSpeed,
      cellRules.coreWaveAmp,
      motionSeed + 160,
      cellRules.coreWaveSteps,
      this.coreWaveBuffer
    );
    const coreFillPoints = offstRingPnts(
      corePoints,
      cellRules.coreStrkWght * -0.5,
      this.coreFillPoints
    );
    const coreCttPnts = offstRingPnts(
      corePoints,
      cellRules.coreStrkWght * 0.5,
      this.coreCttPnts
    );

    // Apply the individual's pose and lifecycle scale first, then compose the body, particles, core,
    // and outer outline in local coordinates.
    push();
    drawingContext.globalAlpha *= this.opacity * regrShow;
    translate(this.x, this.y);
    rotate(this.rotation);
    scale(gazeConfig.drawScale * this.size * this.b * this.deathScale);
    // Draw the body's fill, waveform, and stroke.
    push();
    translate(bodyDriftX, bodyDriftY);
    drawingContext.shadowColor = `rgba(255,255,255,${cellRules.bodyGlowAlpha})`;
    drawingContext.shadowBlur = cellRules.bodyGlowBlur;
    noStroke();
    fill(bodyColor[0], bodyColor[1], bodyColor[2], bodyFillAlpha);
    drawWavFilWitH(
      bodyPoints,
      coreCttPnts,
      this.core.x,
      this.core.y
    );

    drawingContext.shadowColor =
      `rgba(255,255,255,${cellRules.innerGlowAlpha})`;
    drawingContext.shadowBlur = 5;
    noStroke();
    // Internal particles retain their initial colors, then blend toward the target color with
    // differentiation progress, preserving individual variation.
    for (const innerCircle of this.innerCircles) {
      const srcPartClr = innerCircle.color || gazeConfig.color;
      const particleColor = srcPartClr.map((value, index) =>
        lerp(value, this.diffColors.body[index], colorMix)
      );
      fill(
        particleColor[0],
        particleColor[1],
        particleColor[2],
        lineStrkAlph * outlinePulse
      );
      circle(innerCircle.x, innerCircle.y, innerCircle.diameter);
    }

    // Draw the core's fill and outline separately so its eccentric
    // structure remains legible when the body texture brightens.
    push();
    translate(this.core.x, this.core.y);
    drawingContext.shadowColor =
      `rgba(255,255,255,${cellRules.coreGlowAlpha})`;
    drawingContext.shadowBlur = 6;
    noStroke();
    fill(coreColor[0], coreColor[1], coreColor[2], coreFillAlpha);
    drawWaveRing(coreFillPoints);
    noFill();
    stroke(lineColor[0], lineColor[1], lineColor[2], coreStrkAlph);
    strokeWeight(cellRules.coreStrkWght);
    drawWaveRing(corePoints);
    pop();

    drawingContext.shadowColor = `rgba(255,255,255,${
      cellRules.edgeGlowAlpha * outlinePulse
    })`;
    drawingContext.shadowBlur = cellRules.lineGlowBlur;
    noFill();
    stroke(
      lineColor[0],
      lineColor[1],
      lineColor[2],
      lineStrkAlph * outlinePulse
    );
    strokeWeight(cellRules.lineStrkWght * outlinePulse);
    drawingContext.setLineDash(this.outlineDashPattern);
    drawWaveRing(bodyPoints);
    drawingContext.setLineDash([]);
    pop();
    pop();
  }
}
  }

  gazeSupport.basicCell = Object.freeze({ create });
})();

// 3. Accompany the audience along a gradual path toward a stable gaze position

(() => {
  "use strict";

  function create({ clamp, getNow }) {
  const clbPrtlWaveRls = Object.freeze({
    crclAmpl: 1,
    arrowAmplitude: 1,
    speed: 0.0001,
    circleSegments: 72,
    arrwLineSegs: 48,
    arrwHeadSegs: 14,
    circleSeed: 223.41,
    arrowSeed: 261.77,
  });
  
  // Calculate the path length of the complete calibration-portal point sequence,
  // providing a common basis for the progress stroke.
  function calibLineLen(points) {
    let length = 0;
    for (let index = 1; index < points.length; index++) {
      length += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      );
    }
    return length;
  }
  
  // Generate the portal arc from preset samples and a temporal phase.
  function clbPrtlWaveArc(radius, arcStart, arcSpan, now) {
    const rules = clbPrtlWaveRls;
    const count = rules.circleSegments;
    const raw = new Float64Array(count + 1);
    let average = 0;
    const time = now * rules.speed;
    for (let index = 0; index <= count; index++) {
      const angle = arcStart + (arcSpan * index) / count;
      raw[index] = noise(
        rules.circleSeed + Math.cos(angle) * 0.9,
        rules.circleSeed * 0.73 + Math.sin(angle) * 0.9,
        time
      );
      average += raw[index];
    }
    average /= count + 1;
    return Array.from({ length: count + 1 }, (_, index) => {
      const angle = arcStart + (arcSpan * index) / count;
      const wave =
        (raw[index] - average) * rules.crclAmpl * 5;
      const pointRadius = radius + wave;
      return {
        x: Math.cos(angle) * pointRadius,
        y: Math.sin(angle) * pointRadius,
      };
    });
  }
  
  // Add time-varying noise along segment normals to generate an open waveform.
  function clbPrtWavLin(
    start,
    end,
    segments,
    seed,
    now
  ) {
    const rules = clbPrtlWaveRls;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const time = now * rules.speed;
    const raw = new Float64Array(segments + 1);
    let average = 0;
    for (let index = 0; index <= segments; index++) {
      const progress = index / segments;
      raw[index] = noise(seed + progress * 1.35, seed * 0.61, time);
      average += raw[index];
    }
    average /= segments + 1;
    return Array.from({ length: segments + 1 }, (_, index) => {
      const progress = index / segments;
// The oscillation returns to zero at the path endpoints,
// allowing the calibration line to emerge and resolve naturally.
      const endpointEase = Math.sin(Math.PI * progress);
      const wave =
        (raw[index] - average) * rules.arrowAmplitude * 5 * endpointEase;
      return {
        x: start.x + dx * progress + normalX * wave,
        y: start.y + dy * progress + normalY * wave,
      };
    });
  }
  
  function clbPrtlWaveGeo(
    radius,
    lineLength,
    arrowWidth,
    arrowRise,
  now = getNow() || millis()
  ) {
    // A continuous path from arc to arrow presents calibration as a guided process.
    const arcStart = Math.PI * 1.22;
    const arcSpan = Math.PI * 1.56;
    const arc = clbPrtlWaveArc(radius, arcStart, arcSpan, now);
    const arrowLine = clbPrtWavLin(
      { x: 0, y: 0 },
      { x: lineLength, y: 0 },
      clbPrtlWaveRls.arrwLineSegs,
      clbPrtlWaveRls.arrowSeed,
      now
    );
    const arrowHead = clbPrtWavLin(
      { x: lineLength, y: 0 },
      { x: lineLength - arrowWidth, y: -arrowRise },
      clbPrtlWaveRls.arrwHeadSegs,
      clbPrtlWaveRls.arrowSeed + 17.33,
      now
    );
    const arrow = arrowLine.concat(arrowHead.slice(1));
    return {
      arc,
      arrow,
      arcLength: calibLineLen(arc),
      arrowLength: calibLineLen(arrow),
    };
  }
  
  // Connect the path through the point sequence so portal-outline rendering can reuse it.
  function trcClbPrtlLine(context, points) {
    if (!points.length) return;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) {
      context.lineTo(points[index].x, points[index].y);
    }
  }
  
  // Clip calibration progress along the same portal outline, expressing completion through path length.
  function traceCalibLine(context, points, distance) {
    if (!points.length || distance <= 0) return 0;
    let remaining = distance;
    let consumed = 0;
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length && remaining > 0; index++) {
      const previous = points[index - 1];
      const current = points[index];
      const segmentLength = Math.hypot(
        current.x - previous.x,
        current.y - previous.y
      );
      if (remaining >= segmentLength) {
        context.lineTo(current.x, current.y);
        remaining -= segmentLength;
        consumed += segmentLength;
        continue;
      }
      const amount = remaining / Math.max(0.001, segmentLength);
      context.lineTo(
        previous.x + (current.x - previous.x) * amount,
        previous.y + (current.y - previous.y) * amount
      );
      consumed += remaining;
      remaining = 0;
    }
    return consumed;
  }
  
  // The complete portal path continuously joins the left and right arrows with the arc;
  // progress clipping and the underlying stroke share the same geometry.
  function trcClbPrtlPath(
    context,
    radius,
    lineLength,
    arrowWidth,
    arrowRise
  ) {
    const geometry = clbPrtlWaveGeo(
      radius,
      lineLength,
      arrowWidth,
      arrowRise
    );
    context.beginPath();
    trcClbPrtlLine(context, geometry.arc);
    trcClbPrtlLine(context, geometry.arrow);
  }
  
  // Draw calibration-hold progress as an arc segment and waveform,
  // balancing long-distance visibility with clarity at the target center.
  function drawClbPrtPro(
    radius,
    lineLength,
    arrowWidth,
    arrowRise,
    progress
  ) {
    const geometry = clbPrtlWaveGeo(
      radius,
      lineLength,
      arrowWidth,
      arrowRise
    );
    // Advance progress by path length so the arc and arrows appear at a consistent visual speed.
    const totalLength = geometry.arcLength + geometry.arrowLength;
    let remaining = clamp(progress, 0, 1) * totalLength;
    const context = drawingContext;
  
    context.beginPath();
    if (remaining > 0) {
      const completedArc = traceCalibLine(
        context,
        geometry.arc,
        remaining
      );
      remaining -= completedArc;
    }
    if (remaining > 0) {
      traceCalibLine(
        context,
        geometry.arrow,
        remaining
      );
    }
    context.stroke();
  }

    return Object.freeze({
      trcClbPrtlPath,
      drawClbPrtPro,
    });
  }

  gazeSupport.calibration = Object.freeze({ create });
})();

// 4. Normalize facial geometry from different cameras to a shared scale
(() => {
  "use strict";

  function facePoints(face) {
    if (face.keypoints) return face.keypoints;
    if (face.scaledMesh) {
      return face.scaledMesh.map((point) => ({
        x: point[0],
        y: point[1],
        z: point[2] || 0,
      }));
    }
    if (face.landmarks) return face.landmarks;
    return [];
  }
  
  // Calculate face bounds from valid landmarks.
  function getFaceBox(keypoints) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of keypoints) {
      minX = min(minX, point.x);
      minY = min(minY, point.y);
      maxX = max(maxX, point.x);
      maxY = max(maxY, point.y);
    }
    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }
  
  // The specified landmark center filters invalid samples and
  // provides a safe fallback for stable eye and pose measurements.
  function meanPoints(keypoints, indexes) {
    let x = 0;
    let y = 0;
    let count = 0;
    for (const index of indexes) {
      const point = keypoints[index];
      if (!point) continue;
      x += point.x;
      y += point.y;
      count++;
    }
    if (count === 0) {
      return {
        x: faceTrack.cameraWidth / 2,
        y: faceTrack.cameraHeight / 2,
      };
    }
    return { x: x / count, y: y / count };
  }
  
  function pointDist(a, b) {
    if (!a || !b) return 0;
    return dist(a.x, a.y, b.x, b.y);
  }

  gazeSupport.face = Object.freeze({
    facePoints,
    getFaceBox,
    meanPoints,
    pointDist,
  });
})();

// 5. Invisible gaze gains a cursor that can be followed
(() => {
  "use strict";

  function create() {
  // The factory returns a cursor-drawing function; multiple participants reuse its outline geometry.
  function drawCursorTail(
    x0,
    y0,
    controlX0,
    controlY0,
    controlX1,
    controlY1,
    x1,
    y1,
    progressStart,
    progressEnd
  ) {
    // Draw the Bézier curve in segments to vary line width along the path,
    // providing controlled tapering at both ends.
    const steps = 20;
    let previousX = x0;
    let previousY = y0;
    for (let index = 1; index <= steps; index++) {
      const t = index / steps;
      const nextX = bezierPoint(x0, controlX0, controlX1, x1, t);
      const nextY = bezierPoint(y0, controlY0, controlY1, y1, t);
      const progress = lerp(
        progressStart,
        progressEnd,
        (index - 0.5) / steps
      );
      let weight = lerp(0.8, 2.7, pow(sin(PI * progress), 1.2));
      // Taper the outer end of each half to the minimum line width,
      // preserving the outline's narrowing ends.
      if (
        (progressStart === 0 && index === 1) ||
        (progressEnd === 1 && index === steps)
      ) {
        weight = 0.8;
      }
      strokeWeight(weight);
      line(previousX, previousY, nextX, nextY);
      previousX = nextX;
      previousY = nextY;
    }
  }
  
  function drawRndCrsr() {
// Split the round bracket into upper and lower segments,
// handling line width along each curve separately.
    drawCursorTail(
      -7.5, -9.2, -8.7, -7.56, -11.5, -5.21, -11.5, 0, 0, 0.5
    );
    drawCursorTail(
      -11.5, 0, -11.5, 5.21, -8.7, 7.56, -7.5, 9.2, 0.5, 1
    );
    drawCursorTail(
      7.5, -9.2, 8.7, -7.56, 11.5, -5.21, 11.5, 0, 0, 0.5
    );
    drawCursorTail(
      11.5, 0, 11.5, 5.21, 8.7, 7.56, 7.5, 9.2, 0.5, 1
    );
  }
  
  function drawRoundGlow() {
// The glow grows along a continuous Bézier path, giving gaze feedback an uninterrupted edge.
    beginShape();
    vertex(-7.5, -9.2);
    bezierVertex(-8.7, -7.56, -11.5, -5.21, -11.5, 0);
    bezierVertex(-11.5, 5.21, -8.7, 7.56, -7.5, 9.2);
    endShape();
    beginShape();
    vertex(7.5, -9.2);
    bezierVertex(8.7, -7.56, 11.5, -5.21, 11.5, 0);
    bezierVertex(11.5, 5.21, 8.7, 7.56, 7.5, 9.2);
    endShape();
  }
  
  function drawSqrCrsr() {
    // The square bracket retains rounded corners, distinguishing
    // participants from the circular cursor while occupying the same area.
    beginShape();
    vertex(-6.5, -8.75);
    vertex(-7.8, -8.75);
    quadraticVertex(-11, -8.75, -11, -5.25);
    vertex(-11, 5.25);
    quadraticVertex(-11, 8.75, -7.8, 8.75);
    vertex(-6.5, 8.75);
    endShape();
    beginShape();
    vertex(6.5, -8.75);
    vertex(7.8, -8.75);
    quadraticVertex(11, -8.75, 11, -5.25);
    vertex(11, 5.25);
    quadraticVertex(11, 8.75, 7.8, 8.75);
    vertex(6.5, 8.75);
    endShape();
  }

    return Object.freeze({
      drawRndCrsr,
      drawRoundGlow,
      drawSqrCrsr,
    });
  }

  gazeSupport.cursor = Object.freeze({ create });
})();

// 6. Invite the audience into perception through clear choices and waveforms
(() => {
  "use strict";

  // Create the participation-consent panel and its SVG waveform controller;
  // the panel owns its interface state and geometry cache.
  function create(rules, num) {
  function cnsntPnlMtrcs(
    width,
    height,
    offset = 0,
    cornerRadius = rules.snglPnlCrnrRad,
    padding = rules.snglPnlWavPdd
  ) {
// Sample the waveform along the panel perimeter so the invitation
// to participate resembles a continuously breathing boundary.
    const left = padding - offset;
    const top = padding - offset;
    const right = padding + width + offset;
    const bottom = padding + height + offset;
    const radius = Math.min(
      cornerRadius,
      (right - left) * 0.5,
      (bottom - top) * 0.5
    );
    const horizLngth = right - left - radius * 2;
    const verticalLength = bottom - top - radius * 2;
    const arcLength = radius * Math.PI * 0.5;
    return {
      left,
      top,
      right,
      bottom,
      radius,
      horizLngth,
      verticalLength,
      arcLength,
      perimeter:
        horizLngth * 2 +
        verticalLength * 2 +
        arcLength * 4,
    };
  }

  function cnsntRectPnt(metrics, distance) {
// Normalize perimeter distance cyclically so the waveform
// remains continuous as it crosses the panel's starting point.
    let remaining =
      ((distance % metrics.perimeter) + metrics.perimeter) %
      metrics.perimeter;
    const linePoint = (x, y, normalX, normalY) => ({
      x,
      y,
      normalX,
      normalY,
    });
    // Subtract straight and rounded-corner lengths segment by segment clockwise,
    // returning the outward normal at the resulting position.
    if (remaining < metrics.horizLngth) {
      return linePoint(
        metrics.left + metrics.radius + remaining,
        metrics.top,
        0,
        -1
      );
    }
    remaining -= metrics.horizLngth;
    if (remaining < metrics.arcLength) {
      const angle = -Math.PI * 0.5 +
        (remaining / metrics.arcLength) * Math.PI * 0.5;
      return linePoint(
        metrics.right - metrics.radius + Math.cos(angle) * metrics.radius,
        metrics.top + metrics.radius + Math.sin(angle) * metrics.radius,
        Math.cos(angle),
        Math.sin(angle)
      );
    }
    remaining -= metrics.arcLength;
    if (remaining < metrics.verticalLength) {
      return linePoint(
        metrics.right,
        metrics.top + metrics.radius + remaining,
        1,
        0
      );
    }
    remaining -= metrics.verticalLength;
    if (remaining < metrics.arcLength) {
      const angle = (remaining / metrics.arcLength) * Math.PI * 0.5;
      return linePoint(
        metrics.right - metrics.radius + Math.cos(angle) * metrics.radius,
        metrics.bottom - metrics.radius + Math.sin(angle) * metrics.radius,
        Math.cos(angle),
        Math.sin(angle)
      );
    }
    remaining -= metrics.arcLength;
    // Continue calculating along the bottom and left edges in the same perimeter direction,
    // returning normals that keep oscillation consistent outside the panel.
    if (remaining < metrics.horizLngth) {
      return linePoint(
        metrics.right - metrics.radius - remaining,
        metrics.bottom,
        0,
        1
      );
    }
    remaining -= metrics.horizLngth;
    if (remaining < metrics.arcLength) {
      const angle = Math.PI * 0.5 +
        (remaining / metrics.arcLength) * Math.PI * 0.5;
      return linePoint(
        metrics.left + metrics.radius + Math.cos(angle) * metrics.radius,
        metrics.bottom - metrics.radius + Math.sin(angle) * metrics.radius,
        Math.cos(angle),
        Math.sin(angle)
      );
    }
    remaining -= metrics.arcLength;
    if (remaining < metrics.verticalLength) {
      return linePoint(
        metrics.left,
        metrics.bottom - metrics.radius - remaining,
        -1,
        0
      );
    }
    remaining -= metrics.verticalLength;
    // The remaining distance falls on the upper-left rounded corner.
    const angle = Math.PI +
      (remaining / metrics.arcLength) * Math.PI * 0.5;
    return linePoint(
      metrics.left + metrics.radius + Math.cos(angle) * metrics.radius,
      metrics.top + metrics.radius + Math.sin(angle) * metrics.radius,
      Math.cos(angle),
      Math.sin(angle)
    );
  }

  // Sample the invitation waveform at the current time.
  function updCnsntOffst(state, now) {
    const time = now * rules.snglPnlWaveSpd;
    num.sampleCircularNoise(
      state,
      time,
      state.amplitude,
      state.seed,
      state.smoothingPasses
    );
  }

  // Derive a single-point ripple offset from the stable sample and current phase.
  function cnsntWaveOffst(state, progress) {
    const offsets = state.offsets;
    const wrapped = ((progress % 1) + 1) % 1;
    const position = wrapped * offsets.length;
    const index = Math.floor(position) % offsets.length;
    const nextIndex = (index + 1) % offsets.length;
    const mix = position - Math.floor(position);
    return offsets[index] + (offsets[nextIndex] - offsets[index]) * mix;
  }

  // The perimeter position and normal oscillation jointly
  // determine the actual point on the panel outline.
  function cnsntWavePnt(metrics, distance, state) {
    const base = cnsntRectPnt(metrics, distance);
    const wave = cnsntWaveOffst(
      state,
      distance / metrics.perimeter
    );
    return {
      x: base.x + base.normalX * wave,
      y: base.y + base.normalY * wave,
    };
  }

  // Convert discrete outline points into a smooth closed path that the panel surface can reuse directly.
  function clsdCnsntPath(points) {
    if (!points.length) return "";
    const first = points[0];
    const last = points[points.length - 1];
    let path = `M ${(last.x + first.x) * 0.5} ${(last.y + first.y) * 0.5}`;
    for (let index = 0; index < points.length; index++) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      path += ` Q ${current.x} ${current.y} ${(current.x + next.x) * 0.5} ${(current.y + next.y) * 0.5}`;
    }
    return `${path} Z`;
  }

  // The open waveform path smooths internal nodes while keeping both ends open,
  // making it suitable for corner accent lines.
  function openCnsWavPat(points) {
    if (!points.length) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length - 1; index++) {
      const current = points[index];
      const next = points[index + 1];
      path += ` Q ${current.x} ${current.y} ${(current.x + next.x) * 0.5} ${(current.y + next.y) * 0.5}`;
    }
    const last = points[points.length - 1];
    return `${path} L ${last.x} ${last.y}`;
  }

  // Extract an open waveform point sequence over a perimeter interval for local corner-line decoration.
  function cnsntWaveRng(
    metrics,
    start,
    end,
    state,
    count = 32
  ) {
    return Array.from({ length: count }, (_, index) => {
      const distance = start + ((end - start) * index) / (count - 1);
      return cnsntWavePnt(metrics, distance, state);
    });
  }
  // Recalculate three waveform paths from the current panel dimensions;
  // the size cache limits routine frame updates to necessary path data.
  function updtPnlWave({
    panel,
    svg,
    surface,
    topLeft,
    bottomRight,
    waves,
    size,
    now,
  }) {
    if (!panel || !svg || !surface || !topLeft || !bottomRight || !size) return;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    if (!panelWidth || !panelHeight) return;
    const padding = rules.snglPnlWavPdd;
    // Update the SVG coordinate system when panel dimensions change;
    // regular frames update the waveform points.
    if (
      size.width !== panelWidth ||
      size.height !== panelHeight
    ) {
      size.width = panelWidth;
      size.height = panelHeight;
      svg.setAttribute(
        "viewBox",
        `0 0 ${panelWidth + padding * 2} ${panelHeight + padding * 2}`
      );
    }
    updCnsntOffst(waves.surface, now);
    updCnsntOffst(waves.topLeft, now);
    updCnsntOffst(waves.bottomRight, now);
    // Sample the main outline at equal distances along the perimeter
    // so horizontal and vertical edges have similar ripple density.
    const mainMetrics = cnsntPnlMtrcs(
      panelWidth,
      panelHeight
    );
    const mainPoints = Array.from(
      { length: rules.pnlWavePnts },
      (_, index) =>
        cnsntWavePnt(
          mainMetrics,
            (mainMetrics.perimeter * index) /
            rules.pnlWavePnts,
            waves.surface
          )
      );
    surface.setAttribute(
      "d",
      clsdCnsntPath(mainPoints)
    );
    // The two open corner lines use independent phases; their
    // local strokes signal that the interface remains active.
    const cornerOffset = rules.snglPnlCrnOff;
    const cornerMetrics = cnsntPnlMtrcs(
      panelWidth,
      panelHeight,
      cornerOffset
    );
    const horizontalLeg =
      rules.pnlCrnrLegX;
    const verticalLeg =
      rules.pnlCrnrLegY;
    const topLeftStart =
      cornerMetrics.perimeter - cornerMetrics.arcLength - verticalLeg;
    const topLeftEnd = cornerMetrics.perimeter + horizontalLeg;
    const bttmRghArcStr =
      cornerMetrics.horizLngth +
      cornerMetrics.arcLength +
      cornerMetrics.verticalLength;
    // The two corner lines share rounded-perimeter coordinates,
    // maintaining symmetrical lengths after responsive size changes.
    topLeft.setAttribute(
      "d",
      openCnsWavPat(
        cnsntWaveRng(
          cornerMetrics,
          topLeftStart,
          topLeftEnd,
          waves.topLeft
        )
      )
    );
    bottomRight.setAttribute(
      "d",
      openCnsWavPat(
        cnsntWaveRng(
          cornerMetrics,
          bttmRghArcStr - verticalLeg,
          bttmRghArcStr + cornerMetrics.arcLength + horizontalLeg,
          waves.bottomRight
        )
      )
    );
  }

  return Object.freeze({
    panelMetrics: cnsntPnlMtrcs,
    rectPoint: cnsntRectPnt,
    updateOffset: updCnsntOffst,
    waveOffset: cnsntWaveOffst,
    wavePoint: cnsntWavePnt,
    closedPath: clsdCnsntPath,
    openPath: openCnsWavPat,
    waveRange: cnsntWaveRng,
    updatePanel: updtPnlWave,
  });
  }

  gazeSupport.consent = Object.freeze({ create });
})();

// 7. BasicCell, calibration, and the participation interface return to the perception engine
// Factories are exposed in basicCell, calibration, face, cursor, and consent groups.
window.GazeSupport = Object.freeze(gazeSupport);
})();
