// File Overview
// Implements Predator, representing stimulus-driven attention and capture
// through persuasive signals.

// 1. Predator represents stimulus-driven and impulsive attention (Corbetta and Shulman, 2002),
// while also responding to critiques of attention merchants
// and persuasive systems (Wu, 2016; Williams, 2018).
// Notification-like lures show how attention can be attracted and captured.
// I use familiar notifications, numbers, and prompts as lures,
// asking what a moment of lingering might feed.
(() => {
"use strict";

// 2. Individuals and lures
// Captures accumulate into environmental pressure,
// and each instance retains the lure type assigned at birth.
const prdtSmth = window.NumericApp.cubicSmoothstep;
const predEco = window.EcologyConstants;

class Predator {
  static centerY = 229;
  static centerX = (44 + 325) / 2;
  static visualScale = 0.42;
  // Lure presets include a red dot, count, alert, and notification; null represents no lure.
  static baitTypes = [null, "dot", "count", "alert", "notice"];
  static bodyColor = [227, 155, 173];
  static coreColor = [142, 76, 140];
  static baitColor = [212, 5, 61];
  static noticeBg = [255, 255, 255];
  static noticeText = [0, 0, 0];
  static lineColor = [255, 255, 255];
  static bodyStyle = { alpha: 200, lineAlpha: 220, lineWeight: 9.8 };
  static coreStyle = { x: 100, y: 229, size: 70, alpha: 200, lineAlpha: 230, lineWeight: 10.4 };
  static tailStyle = { startX: 277, endX: 397.75, alpha: 220, lineWeight: 18 };
  static bodyWave = null;
  static noticeMetrics = null;
  static baitStyles = {
    dot: {
      offsetX: 147,
      offsetY: -120,
      size: 38,
      alpha: 245,
    },
    count: {
      offsetX: 152,
      offsetY: -112,
      width: 100,
      height: 56,
      radius: 30,
      alpha: 240,
      label: "99+",
      labelSize: 37,
      labelAlpha: 240,
      labelOffsetY: -3,
    },
    alert: {
      offsetX: 148,
      offsetY: -106,
      size: 70,
      alpha: 240,
      stemWidth: 9,
      stemHeight: 27,
      stemOffsetY: -11,
      stemRadius: 3,
      dotSize: 11,
      dotOffsetY: 14,
    },
    notice: {
      offsetX: -4,
      offsetY: -131,
      width: 420,
      height: 92,
      radius: 25,
      alpha: 232,
      message: "New reaction",
      messageSize: 48,
      messageAlpha: 250,
      messageOffsetX: 21,
      messageOffsetY: 3,
      arrow: ">",
      arrowSize: 112,
      arrowScaleX: 0.85,
      arrowAlpha: 250,
      arrowOffsetX: 6,
      arrowOffsetY: 6,
      gap: 38,
    },
  };
  static bodyPoints = [
    [44, 229],
    [46, 242],
    [53, 258],
    [64, 273],
    [76, 287],
    [87, 303],
    [95, 323],
    [100, 344],
    [103, 363],
    [110, 378],
    [128, 384],
    [151, 385],
    [176, 379],
    [200, 368],
    [221, 351],
    [240, 331],
    [256, 309],
    [268, 282],
    [274, 256],
    [276, 229],
  ];

// 3. The body and lure maintain independent movement
  static getBodyPoints() {
    const upper = Predator.bodyPoints.slice(1, -1)
      .reverse()
      .map(([x, y]) => [x, Predator.centerY * 2 - y]);
    return [...Predator.bodyPoints, ...upper];
  }

  // This method was modified with the assistance of ChatGPT.
  static resampleLoop(points, count) {
    const segments = points.map(([x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      return { x, y, nextX, nextY, length: dist(x, y, nextX, nextY) };
    });
    const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);
    const resampled = [];
    let segmentIndex = 0;
    let segmentStart = 0;

    for (let i = 0; i < count; i++) {
      const target = (perimeter * i) / count;
      while (
        segmentIndex < segments.length - 1 &&
        target > segmentStart + segments[segmentIndex].length
      ) {
        segmentStart += segments[segmentIndex].length;
        segmentIndex++;
      }
      const segment = segments[segmentIndex];
      const progress = (target - segmentStart) / max(0.001, segment.length);
      resampled.push([
        lerp(segment.x, segment.nextX, progress),
        lerp(segment.y, segment.nextY, progress),
      ]);
    }

    return resampled;
  }

  static getBodyWave() {
    if (Predator.bodyWave) return Predator.bodyWave;

    const controlPoints = Predator.resampleLoop(
      Predator.getBodyPoints(),
      settings.predator.outlinePoints
    );
    const count = controlPoints.length;
    const xs = new Float64Array(count);
    const ys = new Float64Array(count);
    const normalXs = new Float64Array(count);
    const normalYs = new Float64Array(count);
    const noiseXs = new Float64Array(count);
    const noiseYs = new Float64Array(count);

    for (let i = 0; i < count; i++) {
      const x = controlPoints[i][0];
      const y = controlPoints[i][1];
      const dx = x - Predator.centerX;
      const dy = y - Predator.centerY;
      const distance = max(0.001, sqrt(dx * dx + dy * dy));
      xs[i] = x;
      ys[i] = y;
      normalXs[i] = dx / distance;
      normalYs[i] = dy / distance;
      const angle = atan2(dy, dx);
      noiseXs[i] = cos(angle) * settings.predator.waveSpaceScale;
      noiseYs[i] = sin(angle) * settings.predator.waveSpaceScale;
    }

    Predator.bodyWave = {
      count,
      xs,
      ys,
      normalXs,
      normalYs,
      noiseXs,
      noiseYs,
    };
    return Predator.bodyWave;
  }

// The body waveform is cached at evenly spaced intervals so
// the Predator's pulse remains continuous across frame rates.
  // This method was modified with the assistance of ChatGPT.
  buildBodyWave(tick, frame = null) {
    const stepMs = 1000 / settings.predator.lineCchTps;
    const sampleNow = tick * stepMs - this.bodyWavePhase;
    const time = sampleNow * 0.001 * settings.predator.outlineSpeed;
    const waveSeed = this.seed * 0.001 + 420;
    const template = Predator.getBodyWave();
    if (!frame) {
      frame = {
        xs: new Float32Array(template.count),
        ys: new Float32Array(template.count),
      };
    }

    for (let i = 0; i < template.count; i++) {
      const wave =
        (noise(
          waveSeed + template.noiseXs[i],
          waveSeed * 0.731 + template.noiseYs[i],
          time
        ) -
          0.5) *
        2 *
        settings.predator.outlineWaveAmp;

      frame.xs[i] = template.xs[i] + template.normalXs[i] * wave;
      frame.ys[i] = template.ys[i] + template.normalYs[i] * wave;
    }
    return frame;
  }

  // The body contour is interpolated between cached frames,
  // allowing capture and breathing animations to share a stable form.
  getWavyBody(now) {
    const state = advanceCache(
      this,
      now,
      settings.predator.lineCchTps,
      this.bodyWavePhase,
      "bodyWaveCache",
      "bodyWaveState",
      "buildBodyWave"
    );
    const template = Predator.getBodyWave();
    for (let i = 0; i < template.count; i++) {
      this.wavyBodyPoints[i][0] = lerp(state.current.xs[i], state.next.xs[i], state.mix);
      this.wavyBodyPoints[i][1] = lerp(state.current.ys[i], state.next.ys[i], state.mix);
    }
    return this.wavyBodyPoints;
  }

  // Each Predator owns its lure, capture progress, movement, and render cache;
  // WorldSystem determines when environmental lures appear.
  constructor(x, y, baitType = random(Predator.baitTypes)) {
    // Each Predator has a base position, swimming direction, and randomized form,
    // preserving individual variation within shared rules.
    this.type = eco.lifeType.predator;
    this.x0 = x;
    this.y0 = y;
    this.x = x;
    this.y = y;
    this.dir = random([1, -1]);
    this.targetDir = this.dir;
    this.v = random(settings.predator.speedMin, settings.predator.speedMax);
    this.vx = this.v * this.dir;
    this.a = random(TWO_PI);
    this.w = random(0.002, 0.005);
    this.swimY = random(20, 36);
    this.sz = random(0.5, 1.3);
    this.seed = random(1e6);
    // The pre-capture speed multiplier is derived from the instance seed.
    this.preSpeedMul = srng(
      mulberry32((floor(this.seed) ^ 0x51f15e) >>> 0),
      capture.preSpeedMulMin,
      capture.preSpeedMulMax
    );
    // Body waveforms are cached at a low sampling rate,
    // with rendered frames interpolated between adjacent states.
    this.bodyWaveCache = null;
    this.bodyWaveState = { current: null, next: null, mix: 0 };
    this.bodyWavePhase = this.seed % (1000 / settings.predator.lineCchTps);
    this.swimTilt = 0;
    this.b = 1;
    this.dy = 0;
    this.baitType = baitType;
    this.wavyBodyPoints = Array.from(
      { length: settings.predator.outlinePoints },
      () => [0, 0]
    );

    // Activity bounds are stored independently; lure movement and
    // ordinary roaming share the same visible-area constraints.
    this.keepOpt = {
      x0: settings.predator.x0,
      x1: settings.predator.x1,
      xPad: 20,
      y0: settings.predator.y0,
      y1: settings.predator.y1,
      circlePad: 0,
    };
    // Capture, path text, and departure timing form a single attention timeline while independently
    // controlling behavior and narrative display.
    this.gazeDwellMs = 0;
    this.cptrProg = 0;
    this.captureDone = false;
    this.captureDoneAt = -Infinity;
    this.baitCycleAt = -Infinity;
    this.captureFxAlpha = 0;
    this.baitFade = 0;
    this.tailProgress = 0;
    this.pathTextAlpha = 0;
    this.pathBreakup = 0;
    this.pathStartAt = -Infinity;
    this.pathLytIndx = 0;
    this.pathLeaveAt = -Infinity;
    this.pathIntrAt = -Infinity;
    this.lastGazeAt = -Infinity;
    this.numberValue = 0;
    this.prevNumber = this.numberValue;
    this.numberMorphAt = -Infinity;
    this.leftAfterDone = false;
    this.viewCount = 0;
    this.attnLogSeq = 0;
    this.lostPathText = [];
    // The lure has its own position and turning speed,
    // allowing it to drift away from the Predator's body.
    this.lureActive = false;
    this.lureX = x;
    this.lureY = y;
    this.lureVy = 0;
    this.lureInfluence = 1;
    this.lureTurnRate = capture.lureTurnRate;
    this.lureOrbitSign = floor(this.seed) % 2 === 0 ? 1 : -1;
    // Birth and tail extension are temporary visual phases;
    // the defaults represent an ordinary mature individual.
    this.birthStartAt = -Infinity;
    this.birthDuration = 0;
    this.birthProgress = 1;
    this.lureStartAt = -Infinity;
    this.ambntLureSeq = 0;
    this.tailExtendAt = -Infinity;
    this.tailExtndRt = 1;
    this.tailExtendTo = 1;
  }

  // Differentiation birth starts an independent clock at zero;
  // mature movement and capture progress use separate timelines.
  startDiffBirth(now, duration) {
    this.birthStartAt = now;
    this.birthDuration = max(1, duration);
    this.birthProgress = 0;
  }

  // Centralize transitions in the Predator's lure-tracking state.
  setLure(
    target = null,
    stopImmd = false,
    influence = 1,
    turnRate = capture.lureTurnRate
  ) {
    const nextActive = Boolean(
      target && Number.isFinite(target.x) && Number.isFinite(target.y)
    );
    if (!nextActive) {
      if (stopImmd && this.lureActive) {
        this.lureVy = 0;
        this.vx = this.v * this.targetDir;
      }
      this.lureActive = false;
      this.lureInfluence = 1;
      this.lureTurnRate = capture.lureTurnRate;
      return;
    }
    const nextInfluence = Number(influence);
    const nextTurnRate = Number(turnRate);
    this.lureActive = true;
    this.lureX = target.x;
    this.lureY = target.y;
    this.lureInfluence = Number.isFinite(nextInfluence)
      ? clamp(nextInfluence, 0, 1)
      : 1;
    this.lureTurnRate = Number.isFinite(nextTurnRate)
      ? max(0, nextTurnRate)
      : capture.lureTurnRate;
  }

  // This method was modified with the assistance of ChatGPT.
  update(ctx) {
    // During the birth reveal, displacement is held while body pulsing continues; once visible,
    // the new Predator begins roaming the ecology.
    if (Number.isFinite(this.birthStartAt)) {
      const progress = clamp(
        (ctx.now - this.birthStartAt) / this.birthDuration,
        0,
        1
      );
      this.birthProgress = prdtSmth(progress);
      if (progress >= 1) this.birthStartAt = -Infinity;
    }
    const movementScale = this.birthProgress >= 1 ? 1 : 0;
    const dt = (ctx.movementDt ?? ctx.dt) * movementScale;
    const elapsedSeconds = ctx.t / eco.animTps;
    const breathPhase = (elapsedSeconds * TWO_PI) / settings.predator.breathPeriod;
    this.b = 1 + sin(breathPhase + this.seed) * settings.predator.breathAmp;

    let desiredVX = this.v * this.targetDir;
    let desiredVY = 0;
    // The lure first draws the Predator closer, then switches
    // to tangential movement once within orbital range.
    if (this.lureActive) {
      const targetDX = this.lureX - this.x;
      const targetDY = this.lureY - this.y;
      const targetDistance = max(0.001, sqrt(targetDX * targetDX + targetDY * targetDY));
      const radialX = targetDX / targetDistance;
      const radialY = targetDY / targetDistance;
      let steeringX = radialX;
      let steeringY = radialY;
      const orbitRadius = capture.lureOrbtRad;

      if (targetDistance <= capture.lureOrbEntRad) {
        const tangentX = -radialY * this.lureOrbitSign;
        const tangentY = radialX * this.lureOrbitSign;
        const radialAdjust = clamp(
          (targetDistance - orbitRadius) / max(1, orbitRadius),
          -0.7,
          0.7
        );
        steeringX = tangentX + radialX * radialAdjust;
        steeringY = tangentY + radialY * radialAdjust;
        const steeringLength = max(
          0.001,
          sqrt(steeringX * steeringX + steeringY * steeringY)
        );
        steeringX /= steeringLength;
        steeringY /= steeringLength;
      }

      // Movement slows before the capture threshold so participants can perceive the lure's response;
      // the configured pursuit rhythm resumes after capture.
      const preactTracking = Boolean(
        this.gazeDwellMs > 0 &&
          this.gazeDwellMs < capture.activateDelay &&
          this.cptrProg <= 0
      );
      const attrSpd =
        this.v *
        (preactTracking ? this.preSpeedMul : 1);
      desiredVX = lerp(
        desiredVX,
        attrSpd * steeringX,
        this.lureInfluence
      );
      desiredVY = lerp(
        desiredVY,
        attrSpd * steeringY,
        this.lureInfluence
      );
      if (abs(desiredVX) > 0.01) this.targetDir = desiredVX >= 0 ? 1 : -1;
    }

    const turnResponse = this.lureActive
      ? this.gazeDwellMs > 0 &&
        this.gazeDwellMs < capture.activateDelay &&
        this.cptrProg <= 0
        ? capture.prctTurnRate
        : this.lureTurnRate
      : 0.0025;
    const turnBlend = smoothA(turnResponse, dt);
    this.vx = lerp(this.vx, desiredVX, turnBlend);
    this.lureVy = lerp(
      this.lureVy,
      desiredVY,
      turnBlend
    );
    // During capture, horizontal and vertical displacement are scaled together,
    // expressing locked attention as constrained movement.
    const cptrSpdScl =
      this.cptrProg > 0 && !this.captureDone
        ? capture.cptrSpdScl
        : 1;
    const stepX = this.vx * dt * cptrSpdScl;
    const stepY = this.lureVy * dt * cptrSpdScl;
    this.x += stepX;
    const previousDy = this.dy;
    this.y0 += stepY;
    this.a += this.w * dt;
    this.dy = sin(this.a) * this.swimY;
    this.y = this.y0 + this.dy;
    this.updateSwimTilt(stepX, stepY + this.dy - previousDy, dt);

    // Turning bounds respect both the world contour and the species activity zone;
    // reserved areas remove the additional inset.
    const boundsCache = this._xBounds || (this._xBounds = {});
    const circleBounds = ecoWorld.xBoundsAt(this.y, 0, boundsCache);
    const rangeX0 = this.reservedRegion?.x0 ?? settings.predator.x0;
    const rangeX1 = this.reservedRegion?.x1 ?? settings.predator.x1;
    const rangeXPad = this.reservedRegion ? 0 : 20;
    const turnL = max(circleBounds.min + 12, width * rangeX0 + rangeXPad);
    const turnR = min(circleBounds.max - 12, width * rangeX1 - rangeXPad);
    if (this.targetDir > 0 && this.x >= turnR) this.targetDir = -1;
    else if (this.targetDir < 0 && this.x <= turnL) this.targetDir = 1;

    if (this.dir !== this.targetDir && this.vx * this.targetDir >= 0) this.dir = this.targetDir;

    this.keepOpt.x0 = rangeX0;
    this.keepOpt.x1 = rangeX1;
    this.keepOpt.xPad = rangeXPad;
    this.keepOpt.y0 = this.reservedRegion?.y0 ?? settings.predator.y0;
    this.keepOpt.y1 = this.reservedRegion?.y1 ?? settings.predator.y1;
    ecoWorld.keep(this, this.keepOpt);
  }

// 4. Lingering, departure, and lost paths left by captured gaze
  choosePathText(viewIndex = this.viewCount) {
    const seed =
      (floor(this.seed) ^ Math.imul(viewIndex, 0x9e3779b1)) >>> 0;
    const rng = mulberry32(seed);
    const count =
      capture.messageMinimum +
      floor(
        rng() *
          (capture.messageMaximum -
            capture.messageMinimum +
            1)
      );
    const pool = capture.messages.slice();
    const selected = [];
    while (selected.length < count && pool.length > 0) {
      selected.push(pool.splice(floor(rng() * pool.length), 1)[0]);
    }
    return selected;
  }

  // If capture-path text is still visible, record the interruption start
  // so the active path can leave naturally along the same timeline.
  suppLostPths(
    now = typeof millis === "function" ? millis() : 0
  ) {
    if (this.captureDone) return;
    if (this.lostPathText.length === 0 && this.pathTextAlpha <= 0) return;
    if (!Number.isFinite(this.pathIntrAt)) {
      this.pathIntrAt = now;
    }
  }

  // This method was modified with the assistance of ChatGPT.
  finishCapture(now) {
    if (this.captureDone) return;
// On capture completion, lock the result and previous count so subsequent logging, pressure,
// and departure share the same state at that moment.
    this.captureDone = true;
    this.captureDoneAt = now;
    this.baitCycleAt = now;
    this.leftAfterDone = false;
    this.cptrProg = 1;
    this.captureFxAlpha = 1;
    this.baitFade = 0;
    this.tailProgress = 0;
    this.pathTextAlpha = 1;
    this.pathBreakup = 0;
    this.pathLeaveAt = -Infinity;
    this.prevNumber = this.numberValue;
    this.numberValue++;
    this.numberMorphAt = now;
    this.viewCount++;
    // Resolve the local capture first, then submit its shared impact, cell change, and life log.
    window.SharedClient?.recordInfluence?.("Predator", 1, {
      eventType: "predator.capture",
    });
    chngCelAftFcs(this, now);
    const spntPossLife = Boolean(this.attnLogSpnLif);
    window.LifeLogApp?.rcrdIx?.(
      predEco.legacyEvent.encounter,
      this,
      now,
      { sequence: this.viewCount }
    );
    window.LifeLogApp?.rcrdObsr?.(
      "Predator",
      spntPossLife ? "cost" : "full",
      this,
      now,
      {
        sequence: this.viewCount,
        priority: spntPossLife ? 95 : 80,
      }
    );
    window.InteractionSystem?.lifeMechanism?.extendPredator?.(
      this,
      window.SketchConfig?.lifeMechanism?.prdtIxExtndMs
    );
    // Path text is selected when first needed and remains stable throughout this capture.
    if (this.lostPathText.length === 0) {
      this.lostPathText = this.choosePathText();
      this.pathLytIndx = this.viewCount;
      this.pathStartAt = now;
    }
    clearLifeCache(this);
  }

// A brief glance receives an immediate response, while
// sustained lingering gradually feeds capture progress.
  // This method was modified with the assistance of ChatGPT.
  updateFocus(focused, now, frameMs) {
    this.baitFade = 1 - this.baitPrsn(now).alpha;
    // A brief loss of gaze first freezes the timeline.
    if (Number.isFinite(this.pathIntrAt)) {
      // When gaze returns within the grace period, shift the entire path clock so capture and
      // dissipation progress accumulate only valid lingering time.
      if (focused) {
        const pausedMs = max(0, now - this.pathIntrAt);
        if (Number.isFinite(this.pathStartAt)) {
          this.pathStartAt += pausedMs;
        }
        if (Number.isFinite(this.captureDoneAt)) {
          this.captureDoneAt += pausedMs;
        }
        if (Number.isFinite(this.pathLeaveAt)) {
          this.pathLeaveAt += pausedMs;
        }
        this.pathIntrAt = -Infinity;
      } else if (
        now - this.pathIntrAt <
        capture.pathIntrHoldMs
      ) {
        return;
      } else {
        this.pathTextAlpha = 0;
        this.pathBreakup = 0;
        this.pathStartAt = -Infinity;
        this.pathLytIndx = 0;
        this.pathLeaveAt = -Infinity;
        this.pathIntrAt = -Infinity;
        this.lostPathText = [];
        return;
      }
    }
    if (this.captureDone && !focused) {
      this.leftAfterDone = true;
    }
    // After capture, begin the next cycle once gaze has left
    // and returned and the reset interval reaches repeatRearmMs.
    const repeatReady =
      this.captureDone &&
      focused &&
      this.leftAfterDone &&
      now - this.lastGazeAt >= capture.repeatRearmMs;
    if (repeatReady) {
      this.captureDone = false;
      this.gazeDwellMs = 0;
      this.cptrProg = 0;
      this.captureFxAlpha = 0;
      this.tailProgress = 0;
      this.pathTextAlpha = 0;
      this.pathBreakup = 0;
      this.pathStartAt = -Infinity;
      this.pathLeaveAt = -Infinity;
      this.lostPathText = [];
      this.leftAfterDone = false;
      clearLifeCache(this);
    }
    if (this.captureDone) {
      const previousFade = this.pathBreakup;
      // The path holds before dissipating, giving participants time to read the result of the capture.
      const disintegration = clamp(
        (now -
          this.captureDoneAt -
          capture.cptrPathHoldMs) /
          capture.cptrPathFadeMs,
        0,
        1
      );
      const fadeEase = prdtSmth(disintegration);
      this.pathBreakup = disintegration;
      this.pathTextAlpha = 1 - fadeEase;
      // Write the result once when dissipation first begins.
      if (
        previousFade <= 0 &&
        disintegration > 0 &&
        this.lostPathText.length > 0
      ) {
        pathEndNtcStt.startedAt = now;
        pathEndNtcStt.message = random(capture.pathEndNtcMess);
        const [tag, ...messageLines] = pathEndNtcStt.message.split("\n");
        window.LifeLogApp?.record?.(
          tag,
          messageLines.join(" "),
          {
            key: "attention-spent",
            primarySpecies: "Predator",
            display: false,
            now,
          }
        );
      }
      this.cptrProg = 1;
      if (focused) {
        if (!this.leftAfterDone) this.lastGazeAt = now;
        this.captureFxAlpha = 1;
        this.tailProgress = min(
          1,
          this.tailProgress + frameMs / capture.tailGrowMs
        );
        return;
      }
      // Completion feedback remains visible through a brief blink;
      // once gaze is absent beyond the grace period, the ring and trail begin to withdraw.
      if (now - this.lastGazeAt >= capture.leaveDelayMs) {
        const compFadeStep = frameMs / capture.restoreMs;
        this.captureFxAlpha = max(
          0,
          this.captureFxAlpha - compFadeStep
        );
        this.tailProgress = max(
          0,
          this.tailProgress - compFadeStep
        );
      }
      if (this.pathBreakup >= 1 && this.captureFxAlpha <= 0) {
        this.captureDone = false;
        this.gazeDwellMs = 0;
        this.cptrProg = 0;
        this.captureFxAlpha = 0;
        this.tailProgress = 0;
        this.pathTextAlpha = 0;
        this.pathBreakup = 0;
        this.pathStartAt = -Infinity;
        this.pathLeaveAt = -Infinity;
        this.lostPathText = [];
        this.leftAfterDone = false;
        clearLifeCache(this);
      }
      return;
    } else if (focused) {
      // Path text begins appearing while capture is still underway, tracing how the gaze is drawn away.
      const pathShowRdy =
        this.lostPathText.length > 0 ||
        this.cptrProg >= capture.pathShowProg;
      if (pathShowRdy) {
        if (this.lostPathText.length === 0) {
          this.lostPathText = this.choosePathText(this.viewCount + 1);
          this.pathLytIndx = this.viewCount + 1;
          this.pathStartAt = now;
          this.pathTextAlpha = max(
            this.pathTextAlpha,
            capture.pathInitA
          );
        }
        this.pathBreakup = 0;
        this.pathLeaveAt = -Infinity;
        this.pathTextAlpha = min(
          capture.prePathAlpha,
          this.pathTextAlpha +
            (frameMs / capture.preCptPatFadIn) *
              (capture.prePathAlpha -
                capture.pathInitA)
        );
      }
    } else if (this.lostPathText.length > 0) {
      // If gaze is lost during capture, the text lingers briefly before receding.
      if (!Number.isFinite(this.pathLeaveAt)) {
        this.pathLeaveAt = now;
      }
      if (
        now - this.pathLeaveAt >=
        capture.preCptPatLvMs
      ) {
        this.pathTextAlpha = max(
          0,
          this.pathTextAlpha -
            (frameMs / capture.preCptPatFadMs) *
              capture.prePathAlpha
        );
        if (this.pathTextAlpha <= 0) {
          this.lostPathText = [];
          this.pathStartAt = -Infinity;
          this.pathLeaveAt = -Infinity;
        }
      }
    }
    // The activation delay separates an ordinary glance from intentional lingering;
    // time after the delay contributes to capture progress.
    if (focused) {
      if (
        !this.captureDone ||
        !this.leftAfterDone
      ) {
        this.lastGazeAt = now;
      }

      const prevDwllMs = this.gazeDwellMs;
      this.gazeDwellMs = min(
        capture.activateDelay,
        prevDwllMs + frameMs
      );
      // The observation log triggers independently before capture completes,
      // recording a gaze that has already begun to linger.
      const attnSeq = this.viewCount + 1;
      if (
        prevDwllMs < capture.logFocusMs &&
        this.gazeDwellMs >= capture.logFocusMs &&
        this.attnLogSeq !== attnSeq
      ) {
        this.attnLogSeq = attnSeq;
        window.LifeLogApp?.rcrdObsr?.(
          "Predator",
          "simple",
          this,
          now,
          {
            sequence: attnSeq,
            priority: 50,
            dedupeMs: 45000,
            ddpByCond: true,
          }
        );
      }
      const activeFrameMs = max(
        0,
        prevDwllMs + frameMs - capture.activateDelay
      );
      if (activeFrameMs <= 0) return;

      this.cptrProg = min(
        1,
        this.cptrProg + activeFrameMs / capture.focusMs
      );
      if (this.cptrProg >= 1) this.finishCapture(now);
      return;
    }

    // An active capture remains reversible; once the departure grace period ends,
    // visual and progress feedback gradually withdraw.
    if (
      this.cptrProg <= 0 &&
      this.captureFxAlpha <= 0 &&
      this.pathTextAlpha <= 0
    ) {
      this.gazeDwellMs = 0;
      return;
    }
    if (now - this.lastGazeAt < capture.leaveDelayMs) return;

    const restoreStep = frameMs / capture.restoreMs;
    this.cptrProg = max(0, this.cptrProg - restoreStep);
    this.captureFxAlpha = max(0, this.captureFxAlpha - restoreStep);
    this.tailProgress = max(0, this.tailProgress - restoreStep);
    if (
      this.cptrProg <= 0 &&
      this.captureFxAlpha <= 0 &&
      this.pathTextAlpha <= 0
    ) {
      const wasCompleted = this.captureDone;
      this.captureDone = false;
      this.gazeDwellMs = 0;
      this.tailProgress = 0;
      this.pathTextAlpha = 0;
      this.pathBreakup = 0;
      this.pathStartAt = -Infinity;
      this.pathLeaveAt = -Infinity;
      this.lostPathText = [];
      this.leftAfterDone = false;
      if (wasCompleted) clearLifeCache(this);
    }
  }

  baitPrsn(
    now = typeof millis === "function" ? millis() : 0
  ) {
    // The lure cycles through hold, fade-out, hidden, and return phases,
    // giving attention capture a brief visual absence.
    if (!Number.isFinite(this.baitCycleAt)) {
      return { phase: "visible", alpha: 1, scale: 1 };
    }

    const elapsed = max(0, now - this.baitCycleAt);
    const fadeOutStart = capture.baitVisHoldMs;
    const fadeOutEnd = fadeOutStart + capture.baitFadeOutMs;
    const hiddenEnd = fadeOutEnd + capture.baitHiddenMs;
    const fadeInEnd = hiddenEnd + capture.baitFadeInMs;
    if (elapsed < fadeOutStart) {
      return { phase: "holding", alpha: 1, scale: 1 };
    }
    if (elapsed < fadeOutEnd) {
      const progress = clamp(
        (elapsed - fadeOutStart) / capture.baitFadeOutMs,
        0,
        1
      );
      return {
        phase: "fading-out",
        alpha: 1 - prdtSmth(progress),
        scale: 1,
      };
    }
    if (elapsed < hiddenEnd) {
      return { phase: "hidden", alpha: 0, scale: 1 };
    }
    if (elapsed < fadeInEnd) {
      const progress = clamp(
        (elapsed - hiddenEnd) / capture.baitFadeInMs,
        0,
        1
      );
      // The notice lure rebounds after leaving the bounds, while other lures fade in,
      // each carrying a familiar rhythm of interruption.
      if (this.baitType === "notice") {
        const overshoot = 1.70158;
        const shifted = progress - 1;
        const popEase =
          1 +
          (overshoot + 1) * shifted * shifted * shifted +
          overshoot * shifted * shifted;
        return {
          phase: "popping-in",
          alpha: clamp(progress * 5, 0, 1),
          scale:
            capture.noticeStartMul +
            (1 - capture.noticeStartMul) * popEase,
        };
      }
      return {
        phase: "fading-in",
        alpha: prdtSmth(progress),
        scale: 1,
      };
    }
    return { phase: "visible", alpha: 1, scale: 1 };
  }

  numberLabel(value = this.numberValue) {
    return String(value).padStart(4, "0");
  }

  numberMorph(now) {
    if (!Number.isFinite(this.numberMorphAt)) return 1;
    return clamp(
      (now - this.numberMorphAt) /
        capture.numberMorphMs,
      0,
      1
    );
  }

  // The swimming tilt is derived from vertical direction and clamped in amplitude.
  updateSwimTilt(dx, dy, dt) {
    const maxTilt = Math.PI / 24;
    const targetTilt = clamp(-Math.atan2(dy, max(abs(dx), 0.001)), -maxTilt, maxTilt);
    this.swimTilt = lerp(this.swimTilt, targetTilt, smoothA(0.04, dt));
  }

  // The final render scale includes both the birth reveal and ecological dominance multiplier,
  // keeping the two narrative effects composable.
  renderScale() {
    return (
      lerp(0.7, 1, this.birthProgress) *
      prdtDomn.predatorScale
    );
  }

  // The life-extension animation stores the scale bounds before and after extension,
  // highlighting the newly added length while preserving the existing tail.
  bgnLifTaiExt(now, fromRatio, toRatio) {
    const minimum = clamp(
      window.SketchConfig?.lifeMechanism?.predatorTail
        ?.visualScaleMin ?? 0.3,
      0,
      1
    );
    const maximum = max(
      1,
      window.SketchConfig?.lifeMechanism?.predatorTail
        ?.visualScaleMax ?? 4
    );
    this.tailExtendAt = now;
    this.tailExtndRt = clamp(fromRatio, minimum, maximum);
    this.tailExtendTo = clamp(toRatio, minimum, maximum);
  }

  // Logical tail length combines the lifespan ratio with the active extension interpolation,
  // so world-state resolution and visual growth use the same progress.
  lifeTailLgclRt() {
    const state = this.lifeState;
    if (!state || state.lifeBudgetMs == null) return 1;
    const grantedLife = max(1, state.lifeBudgetMs + state.extensionMs);
    const remainingLife = Number.isFinite(state.lifeRemainingMs)
      ? state.lifeRemainingMs
      : max(0, grantedLife - (state.lifeConsumedMs || 0));
    const maximum = max(
      1,
      window.SketchConfig?.lifeMechanism?.predatorTail
        ?.visualScaleMax ?? 4
    );
    const minimum = clamp(
      window.SketchConfig?.lifeMechanism?.predatorTail
        ?.visualScaleMin ?? 0.3,
      0,
      1
    );
    return clamp(
      remainingLife / max(1, state.lifeBudgetMs),
      minimum,
      maximum
    );
  }

  // Logical tail length, revealed length, and the glowing newly added segment are calculated separately.
  lifeTailMtrcs(now) {
    const tail = Predator.tailStyle;
    const logicalRatio = this.lifeTailLgclRt();
    const duration = max(
      1,
      window.SketchConfig?.lifeMechanism?.predatorTail
        ?.extendAnimMs ?? 1000
    );
    const rawProgress = clamp(
      (now - this.tailExtendAt) / duration,
      0,
      1
    );
    const extendProg = prdtSmth(rawProgress);
    const animating =
      Number.isFinite(this.tailExtendAt) &&
      rawProgress < 1;
    const lifeRatio = animating
  ? lerp(
      this.tailExtndRt,
      logicalRatio,
      extendProg
    )
  : logicalRatio;

// Only reduce the tail during the birth animation.
const birthLengthScale = lerp(
  0.55,
  1,
  clamp(this.birthProgress, 0, 1)
);

const birthThicknessScale = lerp(
  0.75,
  1,
  clamp(this.birthProgress, 0, 1)
);

const ratio = lifeRatio * birthLengthScale;
    return {
      ratio,
      logicalRatio,
      extendProg,
      animating,
      startX: tail.startX,
      endX: lerp(tail.startX, tail.endX, ratio),
      lineWeight: tail.lineWeight * clamp(ratio, 0.7, 1.3),
    };
  }

  // 5. The lure appears first, followed by the captor's body
  draw(ctx) {
    const birthScale = this.renderScale();
    const birthAlpha = this.birthProgress;
    push();
    drawingContext.globalAlpha *= birthAlpha;
    translate(this.x, this.y);
    scale(birthScale);
    translate(-this.x, -this.y);
    const prevBodyPass = this.renderBodyOnly;
    this.renderBodyOnly = true;
    drawLifeCache(this, ctx, this.drawVector);
    if (prdtDomn.predOverlayA > 0.001) {
      push();
      drawingContext.globalAlpha *=
        prdtDomn.predOverlayA;
      drawLifeCache(this, ctx, this.drawVector);
      pop();
    }
    this.renderBodyOnly = prevBodyPass;
    this.drawLiftTail(ctx.now);
    this.drawCptrRing(ctx);
    this.drawBaitVector();
    this.drawCaptureEnd(ctx.now);
    pop();
  }

  // Predator vector rendering separates body, tail, and lure so
  // caching and capture transitions can invoke each layer selectively.
  drawVector(ctx) {
    push();
    translate(this.x, this.y);
    scale(-this.dir, 1);
    rotate(this.swimTilt);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b * Predator.visualScale);
    translate(-Predator.centerX, -Predator.centerY);

    drawingContext.lineJoin = "round";
    drawingContext.lineCap = "round";

    this.drawBody(ctx.now);
    if (!this.renderBodyOnly) this.drawBait("all");
    pop();
  }

// The lure occupies an independent dynamic layer, allowing it to drift
// away from the Predator's body while continuing to draw attention.
  drawBaitVector(now = typeof millis === "function" ? millis() : 0) {
    if (!this.baitType) return;

    push();
    translate(this.x, this.y);
    scale(-this.dir, 1);
    rotate(this.swimTilt);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b * Predator.visualScale);
    translate(-Predator.centerX, -Predator.centerY);

    drawingContext.lineJoin = "round";
    drawingContext.lineCap = "round";
    this.drawBait("all", now);
    pop();
  }

  // Gaze-capture progress is rendered as a contracting ring;
  // the Predator body and lure remain distinguishable until completion.
  drawCptrRing(ctx) {
    const progress = this.captureDone
      ? 1
      : clamp(this.cptrProg, 0, 1);
    const alphaScale = this.captureDone
      ? clamp(this.captureFxAlpha, 0, 1)
      : 1;
    if (progress <= 0 || alphaScale <= 0) return;

    push();
    translate(this.x, this.y);
    scale(-this.dir, 1);
    rotate(this.swimTilt);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b * Predator.visualScale);
    translate(-Predator.centerX, -Predator.centerY);

    const points = this.getWavyBody(ctx.now);
    // Measure the current undulating contour first so progress corresponds to the actual path length.
    let perimeter = 0;
    for (let index = 0; index < points.length; index++) {
      const next = points[(index + 1) % points.length];
      perimeter += dist(points[index][0], points[index][1], next[0], next[1]);
    }

    const tailMetrics = this.lifeTailMtrcs(ctx.now);
    const tailLength = max(0, tailMetrics.endX - tailMetrics.startX);
    let remaining = (perimeter + tailLength) * progress;
    this.disableGlow();
    noFill();
    this.applyStroke(
      Predator.baitColor,
      capture.outlineAlpha * alphaScale
    );
    strokeWeight(capture.outlineWeight);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    drawingContext.beginPath();
    drawingContext.moveTo(points[0][0], points[0][1]);
    for (let index = 0; index < points.length && remaining > 0; index++) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      const segmentLength = dist(point[0], point[1], next[0], next[1]);
      if (remaining >= segmentLength) {
        drawingContext.lineTo(next[0], next[1]);
        remaining -= segmentLength;
      } else {
        const mix = remaining / max(0.001, segmentLength);
        drawingContext.lineTo(
          lerp(point[0], next[0], mix),
          lerp(point[1], next[1], mix)
        );
        remaining = 0;
      }
    }
    drawingContext.stroke();

    // Once the body contour closes, remaining progress extends along the tail,
    // keeping the capture line connected as one path.
    if (remaining > 0 && tailLength > 0) {
      const cvrdTailLngth = min(tailLength, remaining);
      strokeWeight(tailMetrics.lineWeight);
      drawingContext.beginPath();
      drawingContext.moveTo(tailMetrics.startX, Predator.centerY);
      drawingContext.lineTo(
        tailMetrics.startX + cvrdTailLngth,
        Predator.centerY
      );
      drawingContext.stroke();
    }
    pop();
  }

  // Branch points interpolate along stored control geometry so
  // tail extension and static rendering share the same curve.
  branchPoint(branch, t) {
    const inverse = 1 - t;
    const inverse2 = inverse * inverse;
    const t2 = t * t;
    const x =
      inverse2 * inverse * branch.x0 +
      3 * inverse2 * t * branch.x1 +
      3 * inverse * t2 * branch.x2 +
      t2 * t * branch.x3;
    const y =
      inverse2 * inverse * branch.y0 +
      3 * inverse2 * t * branch.y1 +
      3 * inverse * t2 * branch.y2 +
      t2 * t * branch.y3;
    const dx =
      3 * inverse2 * (branch.x1 - branch.x0) +
      6 * inverse * t * (branch.x2 - branch.x1) +
      3 * t2 * (branch.x3 - branch.x2);
    const dy =
      3 * inverse2 * (branch.y1 - branch.y0) +
      6 * inverse * t * (branch.y2 - branch.y1) +
      3 * t2 * (branch.y3 - branch.y2);
    return {
      x,
      y,
      dx,
      dy,
    };
  }

  // This method was modified with the assistance of ChatGPT.
  rsrvPatTexLyt(branch, layoutWidth, occupiedBounds) {
    // Text anchors are sampled along the capture path, then constrained to the screen-safe area.
    const baseSize = branch.fontSize;
    const screenPadding = 18;
    const anchorPoint = this.branchPoint(
      branch,
      capture.pathTextAnchrT
    );
    const scaledAnchorX =
      anchorPoint.x * capture.pathXScale;
    const scaledAnchorY =
      anchorPoint.y * capture.pathYScale;
    const anchorX = clamp(
      scaledAnchorX,
      screenPadding + layoutWidth * 0.5 - this.x,
      width - screenPadding - layoutWidth * 0.5 - this.x
    );
    const halfWidth = layoutWidth * 0.5;
    const halfHeight =
      baseSize * 0.6 + capture.pathWaveAmp;
    const vertDir = scaledAnchorY >= 0 ? 1 : -1;
    // Text remains clear of both the Predator's body and wave height,
    // keeping the lure form and lettering legible.
    const spacedAnchorY =
      vertDir *
      max(
        abs(scaledAnchorY),
        branch.bodyRadius +
          halfHeight +
          capture.pathYMin
      );
    const baseAnchorY = clamp(
      spacedAnchorY,
      screenPadding + halfHeight - this.y,
      height -
        screenPadding -
        halfHeight -
        this.y
    );
    const minimumAnchorY =
      screenPadding + halfHeight - this.y;
    const maximumAnchorY =
      height - screenPadding - halfHeight - this.y;
    const laneStep =
      halfHeight * 2 + capture.pathMinGap;
    const laneDirection =
      sin(branch.seed * 0.0091) >= 0 ? 1 : -1;
    let anchorY = baseAnchorY;
    let reservedBounds = null;

    // Search alternately to either side of the preferred orbit for open space,
    // increasing attempts as existing text grows.
    const laneAttempts = occupiedBounds.length * 2 + 2;
    for (let lane = 0; lane <= laneAttempts; lane++) {
      const laneOffset =
        lane === 0
          ? 0
          : ceil(lane * 0.5) *
            laneStep *
            (lane % 2 === 1 ? laneDirection : -laneDirection);
      const candidateY = clamp(
        baseAnchorY + laneOffset,
        minimumAnchorY,
        maximumAnchorY
      );
      const candBnds = {
        left: anchorX - halfWidth,
        right: anchorX + halfWidth,
        top: candidateY - halfHeight,
        bottom: candidateY + halfHeight,
      };
      const hasClearance = occupiedBounds.every(
        (other) =>
          candBnds.right + capture.pathMinGap <=
            other.left ||
          candBnds.left >=
            other.right + capture.pathMinGap ||
          candBnds.bottom + capture.pathMinGap <=
            other.top ||
          candBnds.top >=
            other.bottom + capture.pathMinGap
      );
      if (!hasClearance) continue;
      anchorY = candidateY;
      reservedBounds = candBnds;
      break;
    }
    // When the viewport is too narrow and avoidance space is limited,
    // retain the text placement closest to the preferred position.
    const finalBounds =
      reservedBounds || {
        left: anchorX - halfWidth,
        right: anchorX + halfWidth,
        top: anchorY - halfHeight,
        bottom: anchorY + halfHeight,
      };
    occupiedBounds.push(finalBounds);
    return { anchorX, anchorY };
  }

  // Arrange persuasive text along the Predator's movement path,
  // controlling its readable extent and dissipation order through the capture phases.
  // This method was modified with the assistance of ChatGPT.
  drawPathText(
    message,
    branch,
    reveal,
    alpha,
    disintegration,
    textLayout,
    textColor
  ) {
    if (alpha <= 0) return;
    const [red, green, blue] = textColor;
    const baseSize = branch.fontSize;
    textSize(baseSize);
    const messageWidth = textWidth(message);
    const { anchorX, anchorY } = textLayout;
    let cursor = -messageWidth * 0.5;
    let characterIndex = 0;

    noStroke();
    // Position each character by its actual width so path progress remains consistent with text length.
    for (const character of message) {
      const advance = max(2, textWidth(character));
      const along = cursor + advance * 0.5;
      const textProgress = clamp(
        (along + messageWidth * 0.5) / max(1, messageWidth),
        0,
        1
      );
      const targetT = lerp(
        branch.textStartT,
        branch.textEndT,
        textProgress
      );
      // Characters arrive sequentially along the branch parameter,
      // making the capture path grow outward from the body.
      const arrival = clamp((reveal - targetT) * 9, 0, 1);
      if (arrival > 0) {
        const waveAngle =
          textProgress * TWO_PI * capture.pathWaveCycles +
          branch.wavePhase;
        const waveY = sin(waveAngle) * capture.pathWaveAmp;
        const pointX = anchorX + along;
        const pointY = anchorY + waveY;
// Use the seed to determine when characters fragment,
// preserving the same dissipation rhythm across redraws.
        const fragmentSeed = abs(
          sin(branch.seed * 0.013 + characterIndex * 12.9898)
        );
        const lossAt = 0.08 + fragmentSeed * 0.72;
        const fragment = clamp(
          (disintegration - lossAt) /
            (capture.pathCharBrkMs /
              capture.cptrPathFadeMs),
          0,
          1
        );
        const edgeFade = clamp(
          abs(along) / max(1, messageWidth * 0.5),
          0,
          1
        );
        const textAlpha = lerp(255, 220, edgeFade);
        const characterSize = lerp(
          baseSize,
          max(capture.pathTexSizMin, baseSize - 0.4),
          edgeFade
        );
        if (fragment < 1) {
          const splitOffset =
            fragment * capture.pathChaSplOff;
          push();
          translate(
            pointX + splitOffset * sin(fragmentSeed * 19),
            pointY + splitOffset * sin(fragmentSeed * 31)
          );
          textSize(characterSize);
          stroke(0, 0, 0, 255 * alpha * arrival * (1 - fragment));
          strokeWeight(0.5);
          fill(
            red,
            green,
            blue,
            textAlpha * alpha * arrival * (1 - fragment)
          );
          text(character, 0, 0);
          pop();
        }
        if (character !== " " && fragment > 0 && fragment < 1) {
          for (
            let particleIndex = 0;
            particleIndex < capture.pathCharCount;
            particleIndex++
          ) {
            const particleSeed = abs(
              sin(
                branch.seed * 0.041 +
                characterIndex * 7.31 +
                particleIndex * 17.17
              )
            );
            const direction = particleSeed * TWO_PI;
            const travel =
              fragment *
              lerp(
                capture.pathParTrvMin,
                capture.pathParTrvMax,
                particleSeed
              );
            const particleAlpha =
              capture.pathPartAlph *
              alpha *
              arrival *
              sin(PI * fragment);
            noStroke();
            fill(red, green, blue, particleAlpha);
            circle(
              pointX + cos(direction) * travel,
              pointY + sin(direction) * travel,
              lerp(
                capture.pathParSizStr,
                capture.pathParSizEnd,
                fragment
              )
            );
          }
        }
      }
      cursor += advance;
      characterIndex++;
    }
  }

  // Draw a transition connected to the body at the path's end,
  // visually binding the textual lure to the Predator.
  drawPathAttach(
    branch,
    reveal,
    alpha,
    textLayout,
    messageWidth
  ) {
    const revealProgress = clamp(reveal, 0, 1);
    if (alpha <= 0 || revealProgress <= 0) return;
    const revealEase = prdtSmth(revealProgress);
    const attachN = branch.attachN;
    const vertexCount = attachN + 1;
    const halfWidth = messageWidth * 0.5;
    const startPoint = {
      x: textLayout.anchorX - halfWidth,
      y:
        textLayout.anchorY +
        sin(branch.wavePhase) *
          capture.pathWaveAmp,
    };
    const endPoint = {
      x: textLayout.anchorX + halfWidth,
      y:
        textLayout.anchorY +
        sin(
          TWO_PI * capture.pathWaveCycles +
            branch.wavePhase
        ) *
          capture.pathWaveAmp,
    };
    // Select the text endpoint closer to the body so the connection reads as an attached path.
    const textEndpoint =
      dist2(0, 0, startPoint.x, startPoint.y) <=
      dist2(0, 0, endPoint.x, endPoint.y)
        ? startPoint
        : endPoint;
    const endpDist = max(
      0.001,
      sqrt(textEndpoint.x ** 2 + textEndpoint.y ** 2)
    );
    const avlbLngth = max(
      0,
      endpDist -
        branch.bodyRadius -
        capture.pathAttachGap -
        capture.pathTextGap
    );
    // Connection length is limited by the available space between body and text.
    const connLngth = min(
      attachN * capture.pathAttachLen,
      avlbLngth
    );
    const inwardAngle =
      atan2(-textEndpoint.y, -textEndpoint.x) +
      sin(branch.seed * 0.031) *
        capture.pathAttachSkew;
    const connectorEndX =
      textEndpoint.x +
      cos(inwardAngle) * capture.pathTextGap;
    const connectorEndY =
      textEndpoint.y +
      sin(inwardAngle) * capture.pathTextGap;
    const startX =
      connectorEndX + cos(inwardAngle) * connLngth;
    const startY =
      connectorEndY + sin(inwardAngle) * connLngth;
    const connectorDX = connectorEndX - startX;
    const connectorDY = connectorEndY - startY;
    const connDist = max(
      0.001,
      sqrt(connectorDX ** 2 + connectorDY ** 2)
    );
    const normalX = -connectorDY / connDist;
    const normalY = connectorDX / connDist;
    // Alternating normal offsets form an irregular attachment
    // structure while stable endpoints preserve geometric continuity.
    const vertices = [];
    for (let pointIndex = 0; pointIndex < vertexCount; pointIndex++) {
      const pointProgress = pointIndex / attachN;
      const point = {
        x: lerp(startX, connectorEndX, pointProgress),
        y: lerp(startY, connectorEndY, pointProgress),
      };
      if (pointIndex > 0 && pointIndex < vertexCount - 1) {
        const zigzag =
          capture.pathAttachZgzg *
          (pointIndex % 2 === 1 ? 1 : -1);
        point.x += normalX * zigzag;
        point.y += normalY * zigzag;
      }
      vertices.push(point);
    }
    const [lineRed, lineGreen, lineBlue] = Predator.bodyColor;
    // Reveal amount determines the drawable segment range,
    // with the final segment clipped by fractional progress.
    const revlSegs = attachN * revealEase;

    stroke(lineRed, lineGreen, lineBlue, 190 * alpha);
    strokeWeight(capture.pathAttLinWgh);
    noFill();
    beginShape();
    vertex(vertices[0].x, vertices[0].y);
    for (let pointIndex = 1; pointIndex < vertexCount; pointIndex++) {
      const segProg = clamp(
        revlSegs - (pointIndex - 1),
        0,
        1
      );
      if (segProg <= 0) break;
      const previous = vertices[pointIndex - 1];
      const current = vertices[pointIndex];
      vertex(
        lerp(previous.x, current.x, segProg),
        lerp(previous.y, current.y, segProg)
      );
      if (segProg < 1) break;
    }
    endShape();

    noStroke();
    fill(255, 255, 255, 180 * alpha);
    for (let pointIndex = 1; pointIndex < vertexCount; pointIndex++) {
      const pointReveal =
        clamp(revlSegs - pointIndex + 1, 0, 1);
      if (pointReveal <= 0) break;
      circle(
        vertices[pointIndex].x,
        vertices[pointIndex].y,
        capture.pathAttDotSiz * pointReveal
      );
    }
  }

  // 6. Attention drawn away leaves a trace of being lost
  // This method was modified with the assistance of ChatGPT.
  drawLostPaths(now) {
    const pathNow = Number.isFinite(this.pathIntrAt)
      ? this.pathIntrAt
      : now;
    const alpha = clamp(this.pathTextAlpha, 0, 1);
    const disintegration = clamp(this.pathBreakup, 0, 1);
    if (alpha <= 0 || this.lostPathText.length === 0) return;

    push();
    translate(this.x, this.y);
    scale(this.renderScale());
    textFont("Arial");
    textStyle(BOLD);
    textSize(capture.pathTexSizMin);
    textAlign(CENTER, CENTER);
    const visualScale =
      eco.drawScale *
      this.sz *
      scaleOf(this.type) *
      this.b *
      Predator.visualScale;
    const bodyRadius = 120 * visualScale;
    const branchCount = this.lostPathText.length;
    const occpTextBnds = [];
    // A limited character set reduces browser layout variation, stabilizing text measurement,
    // branch avoidance, and fragmentation particles.
    const cleanMessage = (message) =>
      message
        .replace(/[^A-Za-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    // Branches spread evenly around the body, then receive stable perturbations.
    const baseAngle =
      (this.seed * 0.00073 + this.pathLytIndx * 1.618) % TWO_PI;

    for (let index = 0; index < branchCount; index++) {
      const message = cleanMessage(this.lostPathText[index]);
      const branchSeed =
        this.seed + index * 7919 + this.pathLytIndx * 104729;
      const fontVariant = floor(branchSeed) % 3;
      const fontSize = lerp(
        capture.pathTexSizMin,
        capture.pathTexSizMax,
        fontVariant / 2
      );
      const angleJitter = sin(branchSeed * 0.019) * 0.08;
      const angle =
        baseAngle + (TWO_PI * index) / branchCount + angleJitter;
      const directionX = cos(angle);
      const directionY = sin(angle);
      const normalX = -directionY;
      const normalY = directionX;
      textSize(fontSize);
      const messageWidth = textWidth(message);
      const naturalLength =
        150 + messageWidth * 0.72 + sin(branchSeed * 0.007) * 20;
      // Estimate branch length from text width and clamp it to the range 190-420.
      const readableLength = messageWidth / 0.7;
      const length = clamp(max(naturalLength, readableLength), 190, 420);
      const textHalfSpan = messageWidth * 0.5 / length;
      const textStartT = max(0.12, 0.48 - textHalfSpan);
      const textEndT = min(0.84, 0.48 + textHalfSpan);
      const bendMagnitude =
        capture.pathBaseBend + abs(sin(branchSeed * 0.023)) * 14;
      const bend =
        bendMagnitude *
        (sin(branchSeed * 0.011) >= 0 ? 1 : -1);
      const drift = sin(pathNow * 0.00062 + branchSeed * 0.003) * 2.8;
      const distanceOffset = -4 + sin(branchSeed * 0.017) * 6;
      const attachN = clamp(
        capture.pathAttachMin +
          floor(
            abs(sin(branchSeed * 0.029)) *
              (capture.pathAttachMax -
                capture.pathAttachMin +
                1)
          ),
        capture.pathAttachMin,
        capture.pathAttachMax
      );
      // Each path caches its Bezier control points for the current frame
      // so text layout and attachment structures share the same curve.
      const branch = {
        seed: branchSeed,
        attachN,
        bodyRadius,
        length,
        fontSize,
        textStartT,
        textEndT,
        wavePhase: branchSeed * 0.0053,
        x0: directionX * bodyRadius,
        y0: directionY * bodyRadius,
        x1:
          directionX * (bodyRadius + distanceOffset + length * 0.29) +
          normalX * (bend + drift),
        y1:
          directionY * (bodyRadius + distanceOffset + length * 0.29) +
          normalY * (bend + drift),
        x2:
          directionX * (bodyRadius + distanceOffset + length * 0.69) -
          normalX * bend * 0.55,
        y2:
          directionY * (bodyRadius + distanceOffset + length * 0.69) -
          normalY * bend * 0.55,
        x3:
          directionX * (bodyRadius + distanceOffset + length) +
          normalX * bend * 0.28,
        y3:
          directionY * (bodyRadius + distanceOffset + length) +
          normalY * bend * 0.28,
      };
      // Multiple paths stagger their growth by index while retaining
      // their own deterministic reveal progress within the same frame.
      const elapsed =
        pathNow -
        this.pathStartAt -
        index * capture.brnchStggrMs;
      const reveal = clamp(elapsed / capture.branchGrowMs, 0, 1);
      if (reveal <= 0) continue;
      const revealEase = prdtSmth(reveal);
      const pathReveal = lerp(
        branch.textStartT + 1 / 9,
        min(0.98, branch.textEndT + 1 / 9),
        revealEase
      );
      // Reserve text positions one by one according to already occupied regions.
      const textLayout = this.rsrvPatTexLyt(
        branch,
        messageWidth,
        occpTextBnds
      );
      const allTextDoneAt =
        this.pathStartAt +
        (branchCount - 1) * capture.brnchStggrMs +
        capture.branchGrowMs;
      // Attachment structures appear only after each text segment is fully revealed,
      // separating persuasive information from final capture into two phases.
      const attachShow = clamp(
        (pathNow -
          allTextDoneAt -
          index * capture.pathAttStgMs) /
          capture.pathAttGroMs,
        0,
        1
      );
      this.drawPathAttach(
        branch,
        attachShow,
        alpha,
        textLayout,
        messageWidth
      );
      this.drawPathText(
        message,
        branch,
        pathReveal,
        alpha,
        disintegration,
        textLayout,
        capture.pathTextColor
      );
    }
    pop();
  }
  // After capture completes, draw brief endpoint feedback to preserve
  // a clear pause between ecological resolution and the next lure.
  drawCaptureEnd(now) {
    if (this.viewCount <= 0 && this.lostPathText.length === 0) return;
    const numberAlpha = clamp(this.captureFxAlpha, 0, 1);

    if (numberAlpha > 0) {
      push();
      translate(this.x, this.y + 13);
      rotate(-this.dir * this.swimTilt);
      textFont("Arial");
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(capture.numberFontSize);
      this.disableGlow();
      strokeJoin(ROUND);
      strokeWeight(capture.numLineWght);
      const morphProgress = this.numberMorph(now);
      const transitionEase = prdtSmth(morphProgress);
      const [numberRed, numberGreen, numberBlue] =
        Predator.coreColor;
      // The old value moves upward and fades out while the new value enters from below,
      // clarifying the count change and preserving space around the body contour.
      const drawNumber = (value, y, alphaScale) => {
        stroke(
          255,
          255,
          255,
          capture.numLineAlph * numberAlpha * alphaScale
        );
        fill(
          numberRed,
          numberGreen,
          numberBlue,
          capture.numberAlpha * numberAlpha * alphaScale
        );
        text(this.numberLabel(value), 0, y);
      };
      if (morphProgress < 1) {
        drawNumber(
          this.prevNumber,
          lerp(0, -capture.numMorphDist, transitionEase),
          1 - transitionEase
        );
        drawNumber(
          this.numberValue,
          lerp(capture.numMorphDist, 0, transitionEase),
          transitionEase
        );
      } else {
        drawNumber(this.numberValue, 0, 1);
      }
      pop();
    }

  }

// Draw the Predator's body, core, and tail so the force of
// capture extends from within toward its direction of movement.
  drawBody(now) {
    const body = Predator.bodyStyle;
    const core = Predator.coreStyle;
    this.enableGlow();

    this.applyFill(Predator.bodyColor, body.alpha);
    this.applyStroke(Predator.lineColor, body.lineAlpha);
    strokeWeight(body.lineWeight);
    curveTightness(0.15);
    this.drawClsdCrv(this.getWavyBody(now));

    this.disableGlow();
    erase();
    noStroke();
    circle(core.x, core.y, core.size);
    noErase();

    this.enableGlow();

    this.applyFill(Predator.coreColor, core.alpha);
    this.applyStroke(Predator.lineColor, core.lineAlpha);
    strokeWeight(core.lineWeight);
    circle(core.x, core.y, core.size);

    this.disableGlow();
  }

  drawLiftTail(now) {
    const tail = Predator.tailStyle;
    const metrics = this.lifeTailMtrcs(now);
    if (metrics.ratio <= 0.001 || metrics.lineWeight <= 0.001) return;
    push();
    translate(this.x, this.y);
    scale(-this.dir, 1);
    rotate(this.swimTilt);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b * Predator.visualScale);
    translate(-Predator.centerX, -Predator.centerY);
    drawingContext.lineJoin = "round";
    drawingContext.lineCap = "round";
    this.enableGlow();
    noFill();
    this.applyStroke(Predator.lineColor, tail.alpha);
    strokeWeight(metrics.lineWeight);
    line(metrics.startX, Predator.centerY, metrics.endX, Predator.centerY);

    // Highlight the newly added tail region separately so participants can distinguish lifespan
    // extension from an ordinary static tail.
    if (metrics.animating && metrics.endX > metrics.startX) {
      const config = window.SketchConfig?.lifeMechanism?.predatorTail;
      const addedStartX = lerp(
        tail.startX,
        tail.endX,
        this.tailExtndRt
      );
      const glowStartX = min(addedStartX, metrics.endX);
      if (metrics.endX > glowStartX + 0.001) {
        drawingContext.save();
        drawingContext.shadowColor = "rgba(255,255,255,0.95)";
        drawingContext.shadowBlur = config?.extendGlowBlur ?? 18;
        this.applyStroke(
          Predator.lineColor,
          (config?.extendGlowAlph ?? 235) *
            (1 - metrics.extendProg)
        );
        strokeWeight(metrics.lineWeight);
        line(glowStartX, Predator.centerY, metrics.endX, Predator.centerY);
        drawingContext.restore();
      }
    }
    this.disableGlow();
    pop();
  }

  // 7. How environmental lures appear, disappear, and return
  bgnAmbntLure(now) {
    this.lureStartAt = Number(now) || 0;
    this.ambntLureSeq++;
    return true;
  }

  ambntLureVis(
    now = typeof millis === "function" ? millis() : 0
  ) {
    // Blinking consists of a finite sequence of pulses and gaps;
    // its start time is released on completion.
    const rules = window.SketchConfig?.predatorLure;
    const pulseMs = max(1, Number(rules?.flashPulseMs) || 1000);
    const gapMs = max(0, Number(rules?.flashGapMs) || 500);
    const pulseCount = max(1, floor(Number(rules?.flashCount) || 2));
    const totalMs = pulseMs * pulseCount + gapMs * (pulseCount - 1);
    const elapsedMs = now - this.lureStartAt;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= totalMs) {
      if (elapsedMs >= totalMs) this.lureStartAt = -Infinity;
      return { active: false, alpha: 1, scale: 1 };
    }

    const cycleMs = pulseMs + gapMs;
    const cycleIndex = floor(elapsedMs / cycleMs);
    const localMs = elapsedMs - cycleIndex * cycleMs;
    const pulseProgress = localMs < pulseMs
      ? clamp(localMs / pulseMs, 0, 1)
      : 0;
    // A sinusoidal envelope eases the prompt in and out,
    // returning to zero intensity during the gap phase.
    const intensity = localMs < pulseMs
      ? sin(Math.PI * pulseProgress)
      : 0;
    return {
      active: true,
      alpha: lerp(
        Number(rules?.flshMinAlph) || 0.3,
        Number(rules?.flshMaxAlph) || 1,
        intensity
      ),
      scale: lerp(
        1,
        Number(rules?.flshMaxScl) || 1.065,
        intensity
      ),
    };
  }

  // Return the lure anchor in the body's render coordinate system according to orientation.
  baitAnchor() {
    const style = Predator.baitStyles[this.baitType];
    if (!style) return { x: Predator.centerX, y: Predator.centerY };
    return {
      x: Predator.centerX - this.dir * style.offsetX,
      y: Predator.centerY + style.offsetY,
    };
  }

  // Select the visual variant by lure type and render layer,
  // sharing fade-in and pulse transforms to maintain a consistent attention-capture rhythm.
  drawBait(
    mode = "all",
    now = typeof millis === "function" ? millis() : 0
  ) {
    if (!this.baitType) return;
    const presentation = this.baitPrsn(now);
    const lureVisual = this.ambntLureVis(now);
    const alpha = presentation.alpha;
    if (alpha <= 0.001) return;
    push();
    drawingContext.globalAlpha *= alpha * lureVisual.alpha;
    if (lureVisual.active && lureVisual.scale !== 1) {
      const anchor = this.baitAnchor();
      translate(anchor.x, anchor.y);
      scale(lureVisual.scale);
      translate(-anchor.x, -anchor.y);
    }
    if (this.baitType === "dot" && mode !== "text") this.drawDotBait();
    if (this.baitType === "count") this.drawCountBait(mode);
    if (this.baitType === "alert" && mode !== "text") this.drawAlertBait();
    if (this.baitType === "notice") {
      this.drawNoticeBait(mode, presentation.scale);
    }
    pop();
  }

  // The dot lure attracts gaze through position and brightness.
  drawDotBait() {
    const style = Predator.baitStyles.dot;
    const x = Predator.centerX - this.dir * style.offsetX;
    const y = Predator.centerY + style.offsetY;

    this.disableGlow();
    push();
    translate(x, y);
    scale(-this.dir, 1);
    translate(-x, -y);
    noStroke();
    this.applyFill(Predator.baitColor, style.alpha);
    circle(x, y, style.size);
    pop();
    this.enableGlow();
  }

  // The numeric lure renders its static container and dynamic text
  // separately so capture transitions can replace either layer independently.
  drawCountBait(mode = "all") {
    const style = Predator.baitStyles.count;
    const x = Predator.centerX - this.dir * style.offsetX;
    const y = Predator.centerY + style.offsetY;

    this.disableGlow();
    push();
    translate(x, y);
    scale(-this.dir, 1);
    translate(-x, -y);
    noStroke();
    rectMode(CENTER);
    if (mode !== "text") {
      this.applyFill(Predator.baitColor, style.alpha);
      rect(x, y, style.width, style.height, style.radius);
    }

    if (mode !== "static") {
      fill(255, style.labelAlpha);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(style.labelSize);
      text(style.label, x, y + style.labelOffsetY);
    }

    pop();
    this.enableGlow();
  }

  // The alert lure uses a familiar symbol and disables the lifeform glow,
  // emphasizing its interface-like disguise.
  drawAlertBait() {
    const style = Predator.baitStyles.alert;
    const x = Predator.centerX - this.dir * style.offsetX;
    const y = Predator.centerY + style.offsetY;

    this.disableGlow();
    push();
    translate(x, y);
    scale(-this.dir, 1);
    translate(-x, -y);
    noStroke();
    this.applyFill(Predator.baitColor, style.alpha);
    circle(x, y, style.size);

    fill(255, style.alpha);
    rectMode(CENTER);
    rect(x, y + style.stemOffsetY, style.stemWidth, style.stemHeight, style.stemRadius);
    circle(x, y + style.dotOffsetY, style.dotSize);
    pop();
    this.enableGlow();
  }

  // The notification lure is split into graphic and text layers so
  // callers can select the required parts according to occlusion.
  drawNoticeBait(mode = "all", popScale = 1) {
    const style = Predator.baitStyles.notice;
    const x = Predator.centerX - this.dir * style.offsetX;
    const y = Predator.centerY + style.offsetY;
    const messageY = y + style.messageOffsetY;

    // The notification belongs to a simulated interface, so the
    // Predator's organic glow is temporarily disabled while it is drawn.
    this.disableGlow();
    push();
    translate(x, y);
    scale(-this.dir * popScale, popScale);
    translate(-x, -y);
    noStroke();
    rectMode(CENTER);
    if (mode !== "text") {
      this.applyFill(Predator.noticeBg, style.alpha);
      rect(x, y, style.width, style.height, style.radius);
    }
    if (mode !== "static") {
    drawingContext.textBaseline = "middle";
    textFont("Arial");

    // Text dimensions are shared across all Predators.
    if (!Predator.noticeMetrics) {
      textStyle(NORMAL);
      textSize(style.messageSize);
      const messageWidth = textWidth(style.message);
      textStyle(BOLD);
      textSize(style.arrowSize);
      Predator.noticeMetrics = {
        messageWidth,
        arrowWidth: textWidth(style.arrow) * style.arrowScaleX,
      };
    }
    const { messageWidth, arrowWidth } = Predator.noticeMetrics;

    // Center the text and arrow as a single unit.
    const contentWidth = messageWidth + style.gap + arrowWidth;
    const messageX = x - contentWidth / 2;
    const arrowX = messageX + messageWidth + style.gap;

    textAlign(LEFT, CENTER);
    textStyle(NORMAL);
    textSize(style.messageSize);
    this.applyFill(Predator.noticeText, style.messageAlpha);
    text(style.message, messageX + style.messageOffsetX, messageY);

    push();
    translate(
      arrowX + style.arrowOffsetX,
      messageY + style.arrowOffsetY
    );
    scale(style.arrowScaleX, 1);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(style.arrowSize);
    this.applyFill(Predator.baitColor, style.arrowAlpha);
    text(style.arrow, 0, 0);
    pop();
    }
    pop();
    this.enableGlow();
  }

  applyFill(color, alpha = 255) {
    fill(color[0], color[1], color[2], min(255, alpha * 1.05));
  }

  applyStroke(color, alpha = 255) {
    stroke(color[0], color[1], color[2], min(255, alpha * 1.05));
  }

  enableGlow() {
    applyGlowStyle(lifeGlow.predator);
  }

  disableGlow() {
    applyGlowStyle(lifeGlow.none);
  }

// Duplicate the first and last control points to complete the closed curve,
// keeping the body contour smooth at the seam.
  drawClsdCrv(points) {
    beginShape();
    curveVertex(points[points.length - 1][0], points[points.length - 1][1]);
    for (const [x, y] of points) curveVertex(x, y);
    curveVertex(points[0][0], points[0][1]);
    curveVertex(points[1][0], points[1][1]);
    endShape();
  }
}

// 8. The effects of capture enter the shared ecology
// The object stores individual state, while Behavior receives specialized interactions dispatched by
// InteractionSystem through a common interface.
window.Predator = Predator;
window.PredatorBehavior = Object.freeze({
  createSessionState() {
    return crtHuntStt();
  },
  resetInteraction(context = {}) {
    const entity = context.entity;
    if (!entity) return;
    entity.setLure?.(null, false, 1, capture.lureTurnRate);
    entity.gazeDwellMs = 0;
  },
  updateInteraction(context = {}) {
    const entity = context.entity;
    if (!entity) return false;
    entity.setLure(
      context.lurePoint || null,
      Boolean(context.ignoresLure),
      context.lureInfluence ?? 1,
      context.lureTurnRate ?? capture.lureTurnRate
    );
    entity.updateFocus(
      Boolean(context.focused),
      Number(context.now) || 0,
      Number(context.frameMs) || 0
    );
    return true;
  },
  getViewState(entity) {
    return entity || null;
  },
});
})();
