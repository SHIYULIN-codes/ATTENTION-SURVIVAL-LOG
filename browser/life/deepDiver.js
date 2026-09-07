// File Overview
// Implements Deep Diver, a lifeform representing sustained and focused attention.

// 1. Deep Diver represents sustained attention, drawing on Posner and Petersen (1990).

// 2. Body and focused form
class DeepDiver {
  static blobTrig = null;
  static eyeTemplate = null;

  static getBlobTrig() {
    const segments = deepCfg.blobSegments;
    if (DeepDiver.blobTrig?.segments === segments) return DeepDiver.blobTrig;

    const cosines = new Float32Array(segments);
    const sines = new Float32Array(segments);
    for (let i = 0; i < segments; i++) {
      const angle = (TWO_PI * i) / segments;
      cosines[i] = cos(angle);
      sines[i] = sin(angle);
    }

    DeepDiver.blobTrig = { segments, cosines, sines };
    return DeepDiver.blobTrig;
  }

  static getEyeTemplate(w, h) {
    const segments = deepCfg.outlineSteps;
    if (
      DeepDiver.eyeTemplate?.w === w &&
      DeepDiver.eyeTemplate.h === h &&
      DeepDiver.eyeTemplate.segments === segments
    ) {
      return DeepDiver.eyeTemplate;
    }

    const hw = w * 0.5;
    const hh = h * 0.5;
    const curves = [
      [[-hw, 0], [-hw, -h * 0.23], [-w * 0.25, -hh], [0, -hh]],
      [[0, -hh], [w * 0.25, -hh], [hw, -h * 0.23], [hw, 0]],
      [[hw, 0], [hw, h * 0.23], [w * 0.25, hh], [0, hh]],
      [[0, hh], [-w * 0.25, hh], [-hw, h * 0.23], [-hw, 0]],
    ];
    const xs = new Float64Array(segments);
    const ys = new Float64Array(segments);
    const normalXs = new Float64Array(segments);
    const normalYs = new Float64Array(segments);
    const noiseXs = new Float64Array(segments);
    const noiseYs = new Float64Array(segments);

    for (let i = 0; i < segments; i++) {
      const curvePosition = (i / segments) * curves.length;
      const curve = curves[floor(curvePosition) % curves.length];
      const t = curvePosition - floor(curvePosition);
      const mt = 1 - t;
      const x =
        mt * mt * mt * curve[0][0] +
        3 * mt * mt * t * curve[1][0] +
        3 * mt * t * t * curve[2][0] +
        t * t * t * curve[3][0];
      const y =
        mt * mt * mt * curve[0][1] +
        3 * mt * mt * t * curve[1][1] +
        3 * mt * t * t * curve[2][1] +
        t * t * t * curve[3][1];
      const angle = atan2(y / hh, x / hw);
      let nx = x / (hw * hw);
      let ny = y / (hh * hh);
      const normalLength = max(0.0001, sqrt(nx * nx + ny * ny));
      nx /= normalLength;
      ny /= normalLength;

      xs[i] = x;
      ys[i] = y;
      normalXs[i] = nx;
      normalYs[i] = ny;
      noiseXs[i] = cos(angle) * 1.05;
      noiseYs[i] = sin(angle) * 1.05;
    }

    DeepDiver.eyeTemplate = {
      w,
      h,
      segments,
      xs,
      ys,
      normalXs,
      normalYs,
      noiseXs,
      noiseYs,
    };
    return DeepDiver.eyeTemplate;
  }

  // Initialization groups world movement, gaze feedback, and focus-window fields;
  // systems modify them through their respective phases.
  // This constructor was modified with the assistance of ChatGPT.
  constructor(x, y, base, rot) {
    this.type = eco.lifeType.deepDiver;
    this.x0 = x;
    this.y0 = y;
    this.rot0 = rot;
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.base = base;
    this.sz = random(0.6, 0.8);
    this.hostR = 72;
    this.seed = random(1e6);
    this.dy = 0;
    this.b = 1;
    this.sm = 0.5;
    this.visualMotionX = x;
    this.visualMotionY = y;
    this.tt = random(9999);
    random(TWO_PI); // Preserve the random-number sequence on which the current composition depends.
    this.blobWaveCache = null;
    this.blobWaveState = { current: null, next: null, mix: 0 };
    this.blobTimeOrigin = null;
    this.blobTTOrigin = null;
    this.blobCachePhase = this.seed % (1000 / deepCfg.blobCacheTps);
    this.outlineCache = null;
    this.outlineState = { current: null, next: null, mix: 0 };
    this.outlinePhase = this.seed % (1000 / deepCfg.lineCchTps);
    this.eyePoints = Array.from(
      { length: deepCfg.outlineSteps },
      () => [0, 0]
    );
    this.attnEyePnts = Array.from(
      { length: deepCfg.outlineSteps },
      () => [0, 0]
    );
    this.attnOn = false;
    this.attnPow = 0;
    this.attnPlusPow = 0;
    this.spokeAttnPow = 0;
    this.attnBodyGrowth = 0;
    this.attnGlowIn = 0;
    this.attnGlowPow = 0;
    this.attnGrwWaiMs = 0;
    this.focusProgress = 0;
    this.focusAlpha = 1;
    this.focusShape = 0;
    this.focusMotion = 0;
    this.fcsExtrRngs = 0;
    this.focusRingStart = 0;
    this.fcsRingTgt = 0;
    this.fcsRngsAddd = 0;
    this.focusRingMs = 0;
    this.fcsRingGrwth = 1;
    this.encnActv = false;
    this.diffBirth = null;
    this.diffGrwthScl = 1;
    this.diffOpacity = 1;
    this.motionContext = { dt: 1, movementDt: 1 };

  }

  // Establish the Deep Diver's birth state at the source cell's position,
  // enabling body movement once its contour has formed.
  startDiffBirth(
    sourceCell,
    now,
    initialSize,
    morphDuration
  ) {
    const initSize = clamp(
      initialSize,
      deepCfg.diffIniSizMin,
      deepCfg.diffIniSizMax
    );
    this.x0 = sourceCell.x;
    this.y0 = sourceCell.y;
    this.x = sourceCell.x;
    this.y = sourceCell.y;
    this.visualMotionX = sourceCell.x;
    this.visualMotionY = sourceCell.y;
    this.cruiseCenter = { x: sourceCell.x, y: sourceCell.y };
    this.diffGrwthScl = 0;
    this.diffOpacity = 0;
    const resMrphDur = max(1, morphDuration);
    this.diffBirth = {
      startAt: now,
      morphDuration: resMrphDur,
      duration: resMrphDur,
      initialSize: initSize,
      targetSize: this.sz,
      initialScale: initSize / max(0.001, this.sz),
    };
  }

  // A differentiation birth completes its contour reveal before enabling body movement.
  updtDiffBrth(ctx) {
    const birth = this.diffBirth;
    if (!birth) return false;
    const elapsed = ctx.now - birth.startAt;
    if (elapsed < 0) {
      this.diffGrwthScl = 0;
      this.diffOpacity = 0;
      return true;
    }
    const morphProgress = clamp(
      elapsed / birth.morphDuration,
      0,
      1
    );
    const morphEase =
      cubicSmoothstep(morphProgress);
    this.diffOpacity = morphEase;
    this.diffGrwthScl = lerp(
      birth.initialScale * 0.8,
      1,
      morphEase
    );
    if (morphProgress >= 1) {
      this.diffGrwthScl = 1;
      this.diffOpacity = 1;
      this.diffBirth = null;
      clearLifeCache(this);
    }
    return true;
  }

  // After birth movement ends, adjust roaming, drift,
  // and avoidance speeds according to attention and focus intensity.
  // This method was modified with the assistance of ChatGPT.
  update(ctx) {
    if (this.updtDiffBrth(ctx)) return;
    const smplMtnScl = lerp(
      1,
      deepCfg.attnSpdScl,
      this.attnPow
    );
    const motionScale = lerp(
      smplMtnScl,
      deepCfg.fcsSpdScl,
      this.focusMotion
    );
    const motionCtx = this.motionContext;
    motionCtx.dt = ctx.dt;
    motionCtx.movementDt = (ctx.movementDt ?? ctx.dt) * motionScale;
    cruiseUpdate(this, motionCtx, settings.cruise.deep);
    driftUpdate(this, motionCtx, driftMode.deep);
    separateStep(
      this,
      this.type,
      deepCfg.minSep,
      deepCfg.sepStrength,
      false,
      deepCfg.maxTypePush * motionCtx.movementDt
    );
    separateLife(
      this,
      deepAvoidType,
      deepCfg.visualPush,
      -6,
      deepCfg.maxVisualPush * motionCtx.movementDt
    );
    ecoWorld.keep(this);
    lmtVisSpd(
      this,
      settings.cruise.deep.speed *
        eco.moveSpeed *
        eco.simFps *
        deepCfg.mtnSpdMul *
        motionScale,
      (ctx.dt * 1000) / eco.simFps,
      deepCfg.mtnMaxFrmMs
    );
  }

// As gaze lingers, the contour responds layer by layer;
// after gaze moves away, brightness and form gradually recede.
// This method was modified with the assistance of ChatGPT.
  updtAttnFb(nearby, frameMs) {
    const elapsedMs = max(0, frameMs);
    // Entry requires sustained lingering, while exit retains a brief grace period.
    if (nearby) {
      this.attnLeaveMs = 0;
      if (!this.attnOn) {
        this.attnDwellMs = min(
          deepCfg.attnDlyMs,
          this.attnDwellMs + elapsedMs
        );
        if (
          this.attnDwellMs >=
          deepCfg.attnDlyMs
        ) {
          this.attnOn = true;
        }
      }
    } else if (this.attnOn) {
      this.attnLeaveMs = min(
        deepCfg.attnLvGrcMs,
        this.attnLeaveMs + elapsedMs
      );
      if (
        this.attnLeaveMs >=
        deepCfg.attnLvGrcMs
      ) {
        this.attnOn = false;
        this.attnDwellMs = 0;
      }
    } else {
      this.attnDwellMs = 0;
      this.attnLeaveMs = 0;
    }

    const prevPow = this.attnPow;
    const prevSpokePower = this.spokeAttnPow;
    const prevBodyGrowth = this.attnBodyGrowth;
    const prevGlowIntro = this.attnGlowIn;
    const prevGlowPow = this.attnGlowPow;
    // Contour, spokes, and glow use independent durations so feedback appears in layered sequence.
    const txDur = this.attnOn
      ? deepCfg.attnTxMs
      : deepCfg.attnRestoreMs;
    const spokeTurnDur = this.attnOn
      ? deepCfg.attnSpkTurnMs
      : deepCfg.attnSpkResMs;
    const transitionStep = elapsedMs / txDur;
    const spkTxStep = elapsedMs / spokeTurnDur;
    const glowTurnDur = this.attnOn
      ? deepCfg.attnGlowDurMs
      : deepCfg.attnGloResMs;
    this.attnPow = this.attnOn
      ? min(1, this.attnPow + transitionStep)
      : max(0, this.attnPow - transitionStep);
    this.spokeAttnPow = this.attnOn
      ? min(1, this.spokeAttnPow + spkTxStep)
      : max(0, this.spokeAttnPow - spkTxStep);
    if (this.attnOn) {
      this.attnGlowIn = min(
        1,
        this.attnGlowIn +
          elapsedMs / deepCfg.attnGlowIntrMs
      );
      // Body growth waits until the contour and spokes are nearly complete,
      // establishing the gaze relationship before expressing deeper entry.
      const shpLeftMs = max(
        (1 - prevPow) * txDur,
        (1 - prevSpokePower) * spokeTurnDur
      );
      const postShapeMs = max(0, elapsedMs - shpLeftMs);
      const grwthTimlMs = this.attnGrwWaiMs + postShapeMs;
      this.attnGrwWaiMs = min(
        deepCfg.attnGrwthDlyMs,
        grwthTimlMs
      );
      const grwthElapsedMs = max(
        0,
        grwthTimlMs - deepCfg.attnGrwthDlyMs
      );
      this.attnBodyGrowth = min(
        1,
        this.attnBodyGrowth +
          grwthElapsedMs / deepCfg.attnBodyDurMs
      );
      this.attnGlowPow = min(
        1,
        this.attnGlowPow + grwthElapsedMs / glowTurnDur
      );
    } else {
      // On departure, each layer resolves independently over its exit duration.
      this.attnGrwWaiMs = 0;
      this.attnBodyGrowth = max(
        0,
        this.attnBodyGrowth -
          elapsedMs / deepCfg.attnRestoreMs
      );
      this.attnGlowIn = max(
        0,
        this.attnGlowIn -
          elapsedMs / deepCfg.attnGloResMs
      );
      this.attnGlowPow = max(
        0,
        this.attnGlowPow - elapsedMs / glowTurnDur
      );
    }
    // Clear the cache only after gaze feedback in every layer returns to zero.
    if (
      (prevPow > 0 ||
        prevSpokePower > 0 ||
        prevBodyGrowth > 0 ||
        prevGlowIntro > 0 ||
        prevGlowPow > 0) &&
      this.attnPow === 0 &&
      this.spokeAttnPow === 0 &&
      this.attnBodyGrowth === 0 &&
      this.attnGlowIn === 0 &&
      this.attnGlowPow === 0
    ) {
      clearLifeCache(this);
    }
  }

  // Draw the gaze glow from the current contour size
  // and focus intensity so feedback grows with the form.
  drawAttnGlow(outlineW, outlineH) {
    const introProgress = deepFcsGrwth(
      this.attnGlowIn
    );
    const expansionProgress = deepFcsGrwth(
      this.attnGlowPow
    );
    if (introProgress <= 0 && expansionProgress <= 0) return;
    const glow = softGlow.deepInteractionMetrics({
      baseRadius: max(outlineW, outlineH) * 0.5,
      introProgress,
      expansionProgress,
      introScale: deepCfg.attnGloIntScl,
      scale: deepCfg.attnGlowScl,
      introAlpha: deepCfg.attnGloIntAlp,
      alpha: deepCfg.attnGlowAlph,
      opacity:
        this.focusProgress > 0 || this.encnActv
          ? 1
          : userGlowCfg.smplAlphScl,
    });
    softGlow.drawDeepInteractionGradient(drawingContext, {
      x: 0,
      y: 0,
      radius: glow.radius,
      alpha: glow.alpha,
    });
  }

  // The main render combines current form and gaze feedback;
  // the cache and focus overlay are handled separately by external rendering systems.
  // This method was modified with the assistance of ChatGPT.
  draw(ctx) {
    if (
      this.attnPow > 0 ||
      this.spokeAttnPow > 0 ||
      this.attnBodyGrowth > 0 ||
      this.attnGlowIn > 0 ||
      this.attnGlowPow > 0 ||
      this.focusProgress > 0 ||
      this.encnActv ||
      this.diffBirth ||
      (deepFocus.phase === "entering" && deepFocus.target) ||
      shrdFcsGrwng()
    ) {
      this.drawVector(ctx);
      return;
    }
    drawLifeCache(this, ctx, this.drawVector);
  }

  drawVector(ctx) {
    const now = ctx.now;
    const blobWaveState = this.getBlobWave(now);
// Accumulated focus remains in scale and brightness, forming the underlying tone of the next encounter.
    const focusCount = effcFcsN(this);
    const focusSizeScale =
      1 + focusCount * deepCfg.focusSizeGain;
    const fcsAlphScl =
      1 + focusCount * deepCfg.focusAlphaGain;
    const scaledAlpha = (value) => min(255, value * fcsAlphScl);
    const regularAlpha = (value) =>
      scaledAlpha(value * deepCfg.rglrAlphScl);

    push();
    drawingContext.globalAlpha *= this.diffOpacity;
    translate(this.x, this.y);
    rotate(this.rot);
    scale(
      eco.drawScale *
        this.sz *
        scaleOf(this.type) *
        this.b *
        0.9 *
        this.diffGrwthScl *
        focusSizeScale
    );

    const outlineW = 120 * 1.14;
    const outlineH = 98 * 1.14;
    this.drawAttnGlow(outlineW, outlineH);
    // Shared-focus breathing affects the current target,
    // while the baseline gaze glow remains in outer coordinates.
    const fcsBrthScl =
      this === deepFocus.target
        ? shrdFcsBrth(
            deepCfg.focusBreathAmp
          )
        : 1;
    scale(deepFocusScale(this) * fcsBrthScl);
    applyGlowStyle(lifeGlow.deepOuter);

    // The eye-shaped contour tightens with focus, inscribing the lingering gaze into its form.
    const outlinePoints = this.eyeShapePoints(outlineW, outlineH, now);
    const smplLineScl = lerp(
      1,
      deepCfg.attnLineScl,
      this.attnPow
    );
    const outlineScale = lerp(
      smplLineScl,
      deepCfg.fcsLineScl,
      this.focusShape
    );
    for (let i = 0; i < outlinePoints.length; i++) {
      this.attnEyePnts[i][0] = outlinePoints[i][0] * outlineScale;
      this.attnEyePnts[i][1] = outlinePoints[i][1] * outlineScale;
    }
    const attnLinePnts = this.attnEyePnts;
    const spokeLength = deepCfg.spkOtrLngth;
    const spokeInset = deepCfg.spkInnrLngth;
    const smplSpkInst =
      deepCfg.attnSpkInst *
      this.spokeAttnPow;
    const spkInwrdShft =
      -deepCfg.spkBaseOtst +
      lerp(
        smplSpkInst,
        deepCfg.fcsSpkInst,
        this.focusShape
      );
    // Spokes and contour first draw a wide low-opacity layer,
    // then add a fine layer to form a legible boundary for the deep dive.
    noFill();
    strokeCap(ROUND);
    stroke(255, regularAlpha(12));
    strokeWeight(14);
    this.drawSpokes(
      outlineW,
      outlineH,
      spokeLength,
      spokeInset,
      spkInwrdShft
    );
    strokeWeight(10);
    drawWaveRing(attnLinePnts);

    stroke(255, regularAlpha(171));
    strokeWeight(deepCfg.spkStrkWght);
    this.drawSpokes(
      outlineW,
      outlineH,
      spokeLength,
      spokeInset,
      spkInwrdShft
    );

    // Control the faint interior fill and crisp outline separately.
    fill(255, regularAlpha(19));
    stroke(255, regularAlpha(136));
    strokeWeight(deepCfg.lineStrkWght);
    drawWaveRing(attnLinePnts);

    const cancProg =
      this === deepFocus.target &&
      deepFocus.phase === "canceling";
    const progAlpha = this.encnActv || cancProg
      ? this.focusAlpha
      : 1;
    // The progress line shows established focus; the canceling
    // phase uses its frozen opacity to complete withdrawal.
    if (this.focusProgress > 0 && progAlpha > 0) {
      noFill();
      stroke(
        255,
        255,
        255,
        scaledAlpha(deepCfg.progressAlpha) * progAlpha
      );
      strokeWeight(deepCfg.progStrkWght);
      drawWavRinPro(
        attnLinePnts,
        this.focusProgress
      );
    }

    push();
    scale(deepCfg.innerScale);
    applyGlowStyle(lifeGlow.deepCore);
    noStroke();
    fill(255, regularAlpha(245));
    circle(0, 0, 74 * 0.75);

    noFill();
    stroke(255, regularAlpha(145));
    strokeWeight(deepCfg.ringStrkWght);
    push();
    scale(
      deepCfg.blobScale *
        lerp(
          1,
          deepCfg.focusRingScale,
          this.focusShape
        )
    );
    // The number of core rings records accumulated traces of focus,
    // with new layers fading in over existing ones.
    const ringLayerCount = deepRingCount(this);
    const visRingN = ceil(ringLayerCount - 0.000001);
    for (let i = 0; i < visRingN; i++) {
      const layerOpacity = deepFocusEase(
        clamp(ringLayerCount - i, 0, 1)
      );
      push();
      drawingContext.globalAlpha *= layerOpacity;
      this.blob(
        34 * 0.87 + i * 2.3,
        deepCfg.blobWaveAmpl,
        i,
        blobWaveState
      );
      pop();
    }
    pop();
    pop();

    applyGlowStyle(lifeGlow.none);

    pop();
  }

  // Draw four directional strokes from the current eye-shaped width and height so the Deep Diver's focus
  // marker scales symmetrically with its contour.
  drawSpokes(
    outlineW,
    outlineH,
    spokeLength,
    spokeInset,
    inwardShift = 0
  ) {
    const left = -outlineW * 0.5 + inwardShift;
    const right = outlineW * 0.5 - inwardShift;
    const top = -outlineH * 0.5 + inwardShift;
    const bottom = outlineH * 0.5 - inwardShift;
    line(left + spokeInset, 0, left - spokeLength, 0);
    line(right - spokeInset, 0, right + spokeLength, 0);
    line(0, top + spokeInset, 0, top - spokeLength);
    line(0, bottom - spokeInset, 0, bottom + spokeLength);
  }

  // Generate waveform frames at evenly spaced intervals and reuse their buffers,
  // keeping body movement independent of the actual render frame rate.
  // This method was modified with the assistance of ChatGPT.
  buildWaveFrame(tick, frame = null) {
    const stepMs = 1000 / deepCfg.lineCchTps;
    const sampleNow = tick * stepMs - this.outlinePhase;
    const time = sampleNow * 0.001 * deepCfg.outlineSpeed;
    const template = DeepDiver.getEyeTemplate(120 * 1.14, 98 * 1.14);
    if (!frame) {
      frame = {
        xs: new Float32Array(template.segments),
        ys: new Float32Array(template.segments),
      };
    }
    const waveSeed = this.seed * 0.001 + 520;

    for (let i = 0; i < template.segments; i++) {
      const wave =
        (noise(
          waveSeed + template.noiseXs[i],
          waveSeed * 0.731 + template.noiseYs[i],
          time
        ) -
          0.5) *
        2 *
        deepCfg.outlineWaveAmp;
      frame.xs[i] = template.xs[i] + template.normalXs[i] * wave;
      frame.ys[i] = template.ys[i] + template.normalYs[i] * wave;
    }
    return frame;
  }

  // Generate an irregular eye-shaped contour from the individual's seed and time.
  eyeShapePoints(w, h, now) {
    const template = DeepDiver.getEyeTemplate(w, h);
    const state = advanceCache(
      this,
      now,
      deepCfg.lineCchTps,
      this.outlinePhase,
      "outlineCache",
      "outlineState",
      "buildWaveFrame"
    );

    for (let i = 0; i < template.segments; i++) {
      this.eyePoints[i][0] = lerp(state.current.xs[i], state.next.xs[i], state.mix);
      this.eyePoints[i][1] = lerp(state.current.ys[i], state.next.ys[i], state.mix);
    }

    return this.eyePoints;
  }

  // Generate body waveforms at cached intervals, reusing the sample array.
  buildBlobWaves(tick, fields = null) {
    const stepMs = 1000 / deepCfg.blobCacheTps;
    const sampleTime = tick * stepMs - this.blobCachePhase;
    const sampleTT =
      this.blobTTOrigin +
      ((sampleTime - this.blobTimeOrigin) / 16.666) * driftMode.deep.ttSpd;
    const sampleWB = sin(sampleTT * 1.1 + this.seed) * 0.18;
    const noiseRadius = this.sm + sampleWB;
    const trig = DeepDiver.getBlobTrig();
    if (!fields) {
      const maxLyrN = deepCfg.focusRingLimit;
      fields = Array.from(
        { length: maxLyrN },
        () => new Float32Array(trig.segments)
      );
    }

    for (let i = 0; i < trig.segments; i++) {
      const nx = trig.cosines[i] * noiseRadius + this.base;
      const ny = trig.sines[i] * noiseRadius + this.base;
      for (let layer = 0; layer < fields.length; layer++) {
        fields[layer][i] = noise(nx, ny, layer) - 0.5;
      }
    }

    return fields;
  }

  // Interpolate the body waveform between adjacent cached frames so
  // low-frequency generation still produces continuous breathing.
  getBlobWave(now) {
    if (this.blobTimeOrigin == null) {
      this.blobTimeOrigin = now;
      this.blobTTOrigin = this.tt;
    }
    return advanceCache(
      this,
      now,
      deepCfg.blobCacheTps,
      this.blobCachePhase,
      "blobWaveCache",
      "blobWaveState",
      "buildBlobWaves"
    );
  }

  // Draw the organic body contour for a specified layer, with radius, amplitude,
  // and cached waveform supplied by the outer layer.
  blob(r, amp, layer, waveState) {
    const trig = DeepDiver.getBlobTrig();
    const current = waveState.current[layer];
    const next = waveState.next[layer];

    beginShape();
    for (let i = 0; i < trig.segments; i++) {
      const n = current[i] + (next[i] - current[i]) * waveState.mix;
      const rr = r + n * amp * 2;
      vertex(trig.cosines[i] * rr, trig.sines[i] * rr);
    }
    endShape(CLOSE);
  }
}

// 3. From approach to deep dive, then calmly returning to the world
// Main state path: idle -> capturing -> entering -> holding -> breathing -> exiting -> idle.
// canceling handles external interruption; before the entry threshold,
// capturing can return directly to idle without producing a completion result.
// The target and focus window exist while active; completion, cancellation,
// and reset release both the window and target anchor.
function crtDeepFcs() {
  return {
  // phase is the primary state; the remaining fields describe the current phase.
  phase: "idle",
  // Result count and window difficulty persist across individual
  // focus sessions to support continuity and log deduplication.
  focusCount: 0,
  attnLogSeqht: 0,
  attnLogDone: false,
  focusWaitN: null,
  fcsWndwN: 0,
  diffReady: false,
  // candidate stores the current candidate; exits temporarily stores progress after leaving a target.
  candidate: null,
  candOnMs: 0,
  candFocusMs: 0,
  candBreakMs: 0,
  exits: [],
  // The target and window are established during capturing
  // and released after completion or cancellation.
  target: null,
  phaseElapsedMs: 0,
  entryElapsedMs: 0,
  holdFocusMs: 0,
  focusLeaveMs: 0,
  windowProgress: 0,
  // The exit snapshot freezes the target's starting point so the completion animation remains
  // independent of subsequent world-position updates.
  originX: 0,
  originY: 0,
  exitStartX: 0,
  exitStartY: 0,
  exitStrWndPro: 0,
  exitStrtShpPow: 0,
  exitStrtMtnPow: 0,
  exitStrtRot: 0,
  // The cancellation snapshot stores the return path;
  // the normal exit snapshot uses a separate container.
  cancelStartX: 0,
  cancelStartY: 0,
  cnclStrtProg: 0,
  cnclStrtRot: 0,
  // The following fields describe focus-window and movement presentation;
  // state-machine fields determine session status.
  visualX: 0,
  visualY: 0,
  visualRotation: 0,
  moveControlX: 0,
  moveControlY: 0,
  moveDirectionX: 0,
  moveDirectionY: -1,
  moveOvershoot: 0,
  moveSide: 1,
  driftInMs: 0,
  window: null,
  // Messages and bubbles are presentation state for phase results.
  message: "Focus has entered a steady flow.",
  bubbles: [],
  bbblElapsedMs: 0,
  };
}
// When adding temporary phase fields, update resetDeepFocus in parallel;
// the accumulated focus count must remain intact.
let deepFocus = crtDeepFcs();

function resetDeepFocus() {
  // Reset the Deep Diver's focus-presentation fields
  // and release encounter markers and attention anchors.
  for (const entity of [...creatures, ...parasites]) {
    if (entity.type === eco.lifeType.deepDiver) {
      entity.focusProgress = 0;
      entity.focusAlpha = 1;
      entity.focusShape = 0;
      entity.focusMotion = 0;
      entity.fcsRingGrwth = 1;
      entity.encnActv = false;
      entity.attnAnchr = null;
    }
  }
  // Candidate timing, window geometry, and exit buffers belong
  // to one focus session and reset at the same boundary.
  deepFocus.phase = "idle";
  deepFocus.candidate = null;
  deepFocus.candOnMs = 0;
  deepFocus.candFocusMs = 0;
  deepFocus.candBreakMs = 0;
  deepFocus.exits = [];
  deepFocus.target = null;
  deepFocus.phaseElapsedMs = 0;
  deepFocus.entryElapsedMs = 0;
  deepFocus.holdFocusMs = 0;
  deepFocus.focusLeaveMs = 0;
  deepFocus.focusWaitN = null;
  deepFocus.fcsWndwN = 0;
  deepFocus.diffReady = false;
  deepFocus.windowProgress = 0;
  deepFocus.cancelStartX = 0;
  deepFocus.cancelStartY = 0;
  deepFocus.cnclStrtProg = 0;
  deepFocus.cnclStrtRot = 0;
  deepFocus.visualRotation = 0;
  deepFocus.driftInMs = 0;
  deepFocus.window = null;
  deepFocus.message = "Focus has entered a steady flow.";
  deepFocus.bubbles = [];
  deepFocus.bbblElapsedMs = 0;
}

function deepFocusEase(value) {
  return num.smoothstep01(value);
}

// Focus-window opacity responds separately to entering, stable, and exiting phases.
function fcsWndwAlph() {
  const entryOpacity = deepFocusEase(
    deepFocus.entryElapsedMs /
      deepCfg.fcsWndwFadeMs
  );
  if (deepFocus.phase === "canceling") {
    const cancelProgress =
      deepFocus.cnclStrtProg > 0
        ? deepFocus.windowProgress /
          deepFocus.cnclStrtProg
        : 0;
    return entryOpacity * clamp(cancelProgress, 0, 1);
  }
  if (deepFocus.phase === "holding" || deepFocus.phase === "breathing") {
    return 1;
  }
  if (deepFocus.phase === "exiting") {
    return clamp(deepFocus.windowProgress, 0, 1);
  }
  return entryOpacity;
}

// The effective focus count combines completed and pending levels
// so visual feedback can transition early into the next phase.
function effcFcsN(entity) {
  if (!entity) return 0;
  const maximum = deepCfg.focusStackMax;
  const committedCount = clamp(
    deepFocus.focusCount || 0,
    0,
    maximum
  );
  const pendingCount = clamp(
    deepFocus.focusWaitN ?? committedCount,
    0,
    maximum
  );
  return lerp(
    committedCount,
    pendingCount,
    sharedGrowth()
  );
}

function fcsWndwBldMs() {
  return max(
    deepCfg.fcsWndwApprMs,
    deepCfg.fcsWndwFadeMs
  );
}

// Once the window is established, advance the pending focus level over the form-growth duration.
function sharedGrowth() {
  if (deepFocus.focusWaitN == null) return 1;
  const grwthElapsedMs = max(
    0,
    deepFocus.entryElapsedMs -
      fcsWndwBldMs()
  );
  return deepFocusEase(
    grwthElapsedMs /
      deepCfg.focusShapeMs
  );
}

function shrdFcsGrwng() {
  if (deepFocus.focusWaitN == null) return false;
  const progress = sharedGrowth();
  return progress > 0 && progress < 1;
}

// After growth completes, commit the focus-count increment and clear the Deep Diver's contour cache.
function updtShrdFcs() {
  if (
    deepFocus.focusWaitN == null ||
    sharedGrowth() < 1
  ) {
    return false;
  }
  const maximum = deepCfg.focusStackMax;
  const previousCount = deepFocus.focusCount || 0;
  deepFocus.focusCount = clamp(
    deepFocus.focusWaitN,
    0,
    maximum
  );
  deepFocus.focusWaitN = null;
  if (deepFocus.focusCount > previousCount) {
    window.SharedClient?.recordInfluence?.(
      eco.lifeType.deepDiver,
      deepFocus.focusCount - previousCount,
      { eventType: "deep-diver.focus" }
    );
  }
  for (const entity of creatures) {
    if (entity.type === eco.lifeType.deepDiver) clearLifeCache(entity);
  }
  return true;
}

// Base ring layers include completed growth, while the current
// target interpolates toward the new layers added in this cycle.
function deepRingCount(entity) {
  const baseLayers = deepCfg.blobLayers;
  if (!entity) return baseLayers;
  const commExtrLyrs = max(0, entity.fcsExtrRngs || 0);
  if (entity !== deepFocus.target || !entity.encnActv) {
    return baseLayers + commExtrLyrs;
  }
  return (
    baseLayers +
    lerp(
      entity.focusRingStart ?? commExtrLyrs,
      entity.fcsRingTgt ?? commExtrLyrs,
      clamp(entity.fcsRingGrwth ?? 1, 0, 1)
    )
  );
}

// Advance ring reveal progress over fcsRingGrowMs and stop updating once it reaches 1.
function updtFcsRngs(target, frameMs) {
  if (!target || target.fcsRingGrwth >= 1) return;
  const duration = deepCfg.fcsRingGrowMs;
  target.focusRingMs = min(
    duration,
    (target.focusRingMs || 0) + max(0, frameMs)
  );
  target.fcsRingGrwth = deepFocusEase(
    target.focusRingMs / duration
  );
}

function deepFcsGrwth(strength) {
  const linearProgress = clamp(strength || 0, 0, 1);
  return (
    linearProgress *
    linearProgress *
    linearProgress *
    (linearProgress * (linearProgress * 6 - 15) + 10)
  );
}

// Transition the body from its original size to the configured
// enlargement ratio according to attention-growth progress.
function deepFocusScale(entity) {
  return lerp(
    1,
    deepCfg.attnBodyScl,
    deepFcsGrwth(entity?.attnBodyGrowth)
  );
}

// Generate the breathing scale from elapsed focus time,
// with amplitude unfolding alongside window progress.
function shrdFcsBrth(
  amplitude = deepCfg.fcsSyncBrthAmp
) {
  if (deepFocus.phase === "idle") return 1;
  const config = deepCfg;
  const phase =
    (deepFocus.entryElapsedMs / config.fcsSyncBrthMs) *
    TWO_PI;
  const strength = clamp(deepFocus.windowProgress, 0, 1);
  return 1 + sin(phase) * amplitude * strength;
}

function fcsLytScl() {
  return ixUserCount > 1 ? 1 : 1.1;
}

// Create the focus window's initial position, form, and entry state
function crtFcsWndw(target) {
  const config = deepCfg;
  const layoutScale = fcsLytScl();
  // Scale the window with the layout and constrain it to the viewport,
  // preserving space for focus on small screens.
  let windowWidth = min(
    config.fcsWndwWdth * layoutScale,
    max(80, width)
  );
  let windowHeight = min(
    config.fcsWndwHght * layoutScale,
    max(120, height)
  );
  const distanceNoise = abs(
    sin((target.seed || 0) * 12.9898) * 43758.5453
  );
  const windowDistance = lerp(
    config.fcsWndwDistMin,
    config.fcsWndwDistMax,
    distanceNoise - floor(distanceNoise)
  );
  // Place the window above the lifeform, creating a path
  // away from its original position for this deep dive.
  const centerY =
    target.y -
    windowDistance -
    windowHeight * 0.5;
  // The internal destination uses a seeded preset offset, giving each
  // individual variation while keeping its position stable across redraws.
  const insideNoiseX = abs(
    sin(((target.seed || 0) + 29.17) * 8.731) * 17320.5081
  );
  const insideNoiseY = abs(
    sin(((target.seed || 0) + 53.91) * 6.417) * 22360.6798
  );
  const insideSide =
    floor(abs((target.seed || 0) + 13.7) * 1000) % 2 === 0
      ? -1
      : 1;
  const insideOffsetX =
    insideSide *
    lerp(
      config.fcsInsdXMin,
      config.fcsInsdXMax,
      insideNoiseX - floor(insideNoiseX)
    );
  const insideOffsetY = lerp(
    config.fcsInsdYMin,
    config.fcsInsdYMax,
    insideNoiseY - floor(insideNoiseY)
  );
  return {
    x: target.x - windowWidth * 0.5,
    y: centerY - windowHeight * 0.5,
    width: windowWidth,
    height: windowHeight,
    centerX: target.x,
    centerY,
    distance: windowDistance,
    insideX: target.x + insideOffsetX,
    insideY: centerY + insideOffsetY,
  };
}

// The current window combines base layout, entry scale, and shared-focus gain;
// every rendering entry point reads the same rectangle.
// This function was modified with the assistance of ChatGPT.
function curFcsWndw() {
  const windowRect = deepFocus.window;
  if (!windowRect) return null;
  const windowScale = lerp(
    1,
    deepCfg.fcsWndwMaxScl,
    deepFocus.windowProgress
  );
  const shrdGrwthScl =
    1 +
    clamp(
      deepFocus.fcsWndwN || 0,
      0,
      deepCfg.focusStackMax
    ) *
      deepCfg.fcsWndwGain;
  const totalScale = windowScale * shrdGrwthScl;
  const scaledWidth = windowRect.width * totalScale;
  const scaledHeight = windowRect.height * totalScale;
  return {
    x: windowRect.centerX - scaledWidth * 0.5,
    y: windowRect.centerY - scaledHeight * 0.5,
    width: scaledWidth,
    height: scaledHeight,
    centerX: windowRect.centerX,
    centerY: windowRect.centerY,
    scale: totalScale,
    genrScl: windowScale,
    shrdGrwthScl,
    distance: windowRect.distance,
    insideX: windowRect.insideX,
    insideY: windowRect.insideY,
  };
}

function focusEntryPose(elapsedMs) {
  const config = deepCfg;
  // The entry path consists of subtle anticipation, body movement, and settling.
  const moveElapsed = clamp(elapsedMs, 0, config.focusMoveMs);
  const settleStartMs = max(
    config.fcsAntcMs,
    config.focusMoveMs - config.focusSettleMs
  );
  let pathProgress = 0;
  if (moveElapsed <= config.fcsAntcMs) {
    pathProgress =
      0.025 *
      deepFocusEase(moveElapsed / config.fcsAntcMs);
  } else if (moveElapsed < settleStartMs) {
    pathProgress = lerp(
      0.025,
      1,
      deepFocusEase(
        (moveElapsed - config.fcsAntcMs) /
          max(
            1,
            settleStartMs - config.fcsAntcMs
          )
      )
    );
  } else {
    pathProgress = 1;
  }

  // Move into the window along a quadratic Bezier curve.
  const invrsProg = 1 - pathProgress;
  let x =
    invrsProg * invrsProg * deepFocus.originX +
    2 * invrsProg * pathProgress * deepFocus.moveControlX +
    pathProgress * pathProgress * deepFocus.window.insideX;
  let y =
    invrsProg * invrsProg * deepFocus.originY +
    2 * invrsProg * pathProgress * deepFocus.moveControlY +
    pathProgress * pathProgress * deepFocus.window.insideY;

  // On arrival, move slightly beyond the destination before returning to settle inside the window.
  const ovrsRampStrtMs = max(
    config.fcsAntcMs,
    settleStartMs - config.focusSettleMs
  );
  let ovrsPow = 0;
  if (moveElapsed < settleStartMs) {
    ovrsPow = deepFocusEase(
      (moveElapsed - ovrsRampStrtMs) /
        max(1, settleStartMs - ovrsRampStrtMs)
    );
  } else {
    ovrsPow =
      1 -
      deepFocusEase(
        (moveElapsed - settleStartMs) /
          max(1, config.focusSettleMs)
      );
  }
  x +=
    deepFocus.moveDirectionX *
    deepFocus.moveOvershoot *
    ovrsPow;
  y +=
    deepFocus.moveDirectionY *
    deepFocus.moveOvershoot *
    ovrsPow;

  return {
    x,
    y,
    rotation:
      deepFocus.moveSide *
      config.focusTiltMax *
      sin(PI * pathProgress),
  };
}

// Drift and tilt gradually unfold inside the window, giving even stillness subtle movement.
function fcsInsdPose(target, elapsedMs) {
  const config = deepCfg;
  const windowRect = deepFocus.window;
  const fadeIn = deepFocusEase(
    elapsedMs / config.fcsDrftFadeMs
  );
  const phase =
    ((target.seed || 0) % TWO_PI) +
    (elapsedMs / 1000) * config.fcsDrftSpd;
  const driftX =
    (sin(phase) * 0.72 + sin(phase * 0.43 + 1.7) * 0.28) *
    config.fcsDrftRadX *
    fadeIn;
  const driftY =
    (cos(phase * 0.81) * 0.76 + cos(phase * 0.37 + 0.8) * 0.24) *
    config.fcsDrftRadY *
    fadeIn;
  return {
    x: windowRect.insideX + driftX,
    y: windowRect.insideY + driftY,
    rotation:
      sin(phase + 0.6) *
      config.focusDriftTilt *
      fadeIn,
  };
}

// Bubble positions are generated deterministically from
// the target seed and distributed around the contour.
function crtFcsBbbls(target) {
  const config = deepCfg;
  const seed =
    (floor(target.seed || 0) ^
      Math.imul(
        deepFocus.focusWaitN ||
          deepFocus.focusCount ||
          1,
        0x9e3779b1
      )) >>>
    0;
  const rng = mulberry32(seed);
  const count = floor(
    lerp(
      config.fcsBbblNMin,
      config.fcsBbblNMax + 0.999,
      rng()
    )
  );
  return Array.from({ length: count }, (_, index) => ({
    originX: deepFocus.visualX,
    originY: deepFocus.visualY,
    delay:
      index * config.fcsBbblDlyStep +
      rng() * config.fcsBbblDlyJttr,
    duration: lerp(
      config.fcsBbblDurMin,
      config.fcsBbblDurMax,
      rng()
    ),
    driftX: lerp(-18, 18, rng()),
    size: lerp(
      config.focusBubbleMin,
      config.focusBubbleMax,
      rng()
    ),
  }));
}

// Lock the target and prepare the focus window during the entry phase
// This function was modified with the assistance of ChatGPT.
function prprDeepFcs(target) {
  const config = deepCfg;
  for (const track of deepFocus.exits) {
    track.entity.focusProgress = 0;
  }
  deepFocus.exits = [];
  deepFocus.phase = "capturing";
  deepFocus.attnLogSeqht++;
  deepFocus.target = target;
  deepFocus.phaseElapsedMs = 0;
  deepFocus.entryElapsedMs = 0;
  deepFocus.holdFocusMs = 0;
  deepFocus.focusLeaveMs = 0;
  deepFocus.focusWaitN = null;
  deepFocus.diffReady = false;
  deepFocus.fcsWndwN = clamp(
    deepFocus.focusCount || 0,
    0,
    config.focusStackMax
  );
  deepFocus.windowProgress = 0;
  deepFocus.originX = target.x;
  deepFocus.originY = target.y;
  deepFocus.visualX = target.x;
  deepFocus.visualY = target.y;
  deepFocus.visualRotation = 0;
  deepFocus.driftInMs = 0;
  // Snapshot the window geometry on entry and use preset focus coordinates throughout the phase.
  deepFocus.window = crtFcsWndw(target);
  const moveX = deepFocus.window.insideX - deepFocus.originX;
  const moveY = deepFocus.window.insideY - deepFocus.originY;
  const moveDistance = max(0.001, sqrt(moveX * moveX + moveY * moveY));
  // Curve lateral offset and overshoot use deterministic noise from the target seed,
  // preserving reproducible individual variation.
  const curveNoise = abs(
    sin(((target.seed || 0) + 17.31) * 9.173) * 31415.9265
  );
  const overshootNoise = abs(
    sin(((target.seed || 0) + 41.73) * 7.531) * 27182.8183
  );
  deepFocus.moveSide =
    floor(abs(target.seed || 0) * 1000) % 2 === 0 ? -1 : 1;
  const curveAmount = lerp(
    config.focusCurveMin,
    config.focusCurveMax,
    curveNoise - floor(curveNoise)
  );
  deepFocus.moveControlX =
    (deepFocus.originX + deepFocus.window.insideX) * 0.5 +
    (-moveY / moveDistance) *
      curveAmount *
      deepFocus.moveSide;
  deepFocus.moveControlY =
    (deepFocus.originY + deepFocus.window.insideY) * 0.5 +
    (moveX / moveDistance) *
      curveAmount *
      deepFocus.moveSide;
  deepFocus.moveDirectionX = moveX / moveDistance;
  deepFocus.moveDirectionY = moveY / moveDistance;
  deepFocus.moveOvershoot = lerp(
    config.fcsOvrsMin,
    config.fcsOvrsMax,
    overshootNoise - floor(overshootNoise)
  );
  deepFocus.message = "Focus has entered a steady flow.";
  deepFocus.bubbles = [];
  deepFocus.bbblElapsedMs = 0;
  // Transfer the target from ordinary encounter state to the focus
  // system and invalidate its render cache immediately for the new form.
  target.focusShape = 0;
  target.focusMotion = 0;
  target.focusAlpha = 1;
  target.encnActv = false;
  clearLifeCache(target);
}

// Enter the focus window after reaching the threshold and
// begin accumulating sustained and shared-focus feedback
function actvDeepFcs() {
  const target = deepFocus.target;
  if (!target) return;
  const config = deepCfg;
  deepFocus.phase = "entering";
  deepFocus.candidate = null;
  deepFocus.candOnMs = 0;
  deepFocus.candFocusMs = 0;
  deepFocus.candBreakMs = 0;
  deepFocus.attnLogDone = false;
  deepFocus.phaseElapsedMs = 0;
  // Sustained attention increases the number of visible layers within the configured limit.
  const previousCount = min(
    config.focusStackMax,
    deepFocus.focusCount || 0
  );
  const nextCount = min(config.focusStackMax, previousCount + 1);
  deepFocus.focusWaitN = nextCount;
  // Layer count is generated deterministically from the lifeform seed and focus count.
  const ringGrwthNs = abs(
    sin(
      ((target.seed || 0) + nextCount * 37.17) *
        12.9898
    ) * 43758.5453
  );
  const ringGrwthRng =
    config.focusRingMax - config.focusRingMin + 1;
  const reqsRingLyrs =
    nextCount > previousCount
      ? config.focusRingMin +
        floor((ringGrwthNs - floor(ringGrwthNs)) * ringGrwthRng)
      : 0;
  const prevRingLyrs = max(0, target.fcsExtrRngs || 0);
  const maxExtRinLyr = max(
    0,
    config.focusRingLimit - config.blobLayers
  );
  const adddRingLyrs = min(
    reqsRingLyrs,
    max(0, maxExtRinLyr - prevRingLyrs)
  );
  const nextRingLayers = prevRingLyrs + adddRingLyrs;
  target.fcsExtrRngs = nextRingLayers;
  target.focusRingStart = prevRingLyrs;
  target.fcsRingTgt = nextRingLayers;
  target.fcsRngsAddd = adddRingLyrs;
  target.focusRingMs = 0;
  target.fcsRingGrwth = adddRingLyrs > 0 ? 0 : 1;
  target.focusProgress = 1;
  target.focusAlpha = 1;
  target.focusShape = 0;
  target.focusMotion = 0;
  target.encnActv = true;
  target.attnOn = true;
  target.attnDwellMs = config.attnDlyMs;
  target.attnLeaveMs = 0;
  target.attnPow = 1;
  target.spokeAttnPow = 1;
  // The anchor remains at the visual position where focus began.
  target.attnAnchr = {
    x: deepFocus.visualX,
    y: deepFocus.visualY,
  };
  clearLifeCache(target);
}

// During entry, advance the window before moving the lifeform;
// the target enters the focus area once the space is established.
function updtFcsEntry(elapsedMs) {
  const config = deepCfg;
  deepFocus.entryElapsedMs = max(0, elapsedMs);
  deepFocus.windowProgress = deepFocusEase(
    deepFocus.entryElapsedMs / config.fcsWndwApprMs
  );
  const insdElapsedMs = max(
    0,
    deepFocus.entryElapsedMs - config.focusMoveMs
  );
  deepFocus.driftInMs = insdElapsedMs;
  const movePose = insdElapsedMs > 0
    ? fcsInsdPose(deepFocus.target, insdElapsedMs)
    : focusEntryPose(deepFocus.entryElapsedMs);
  deepFocus.visualX = movePose.x;
  deepFocus.visualY = movePose.y;
  deepFocus.visualRotation = movePose.rotation;
}

// Cancel active focus and gradually release the window and
// session lock, ending this cycle with a canceled result.
// This function was modified with the assistance of ChatGPT.
function cnclDeepFcs() {
  const target = deepFocus.target;
  if (!target) return;
  deepFocus.phase = "canceling";
  deepFocus.phaseElapsedMs = 0;
  deepFocus.cancelStartX = deepFocus.visualX;
  deepFocus.cancelStartY = deepFocus.visualY;
  deepFocus.cnclStrtProg =
    deepFocus.windowProgress;
  deepFocus.cnclStrtRot =
    deepFocus.visualRotation;
  deepFocus.candidate = null;
  deepFocus.candOnMs = 0;
  deepFocus.candFocusMs = 0;
  deepFocus.candBreakMs = 0;
  target.focusAlpha = 1;
  target.focusShape = 0;
  target.focusMotion = 0;
  target.encnActv = false;
  target.attnAnchr = {
    x: deepFocus.visualX,
    y: deepFocus.visualY,
  };
}

// After cancellation, restore the target's appearance and
// lock state, clear the pending count, and return to idle.
// This function was modified with the assistance of ChatGPT.
function fnshFcsCncl() {
  const target = deepFocus.target;
  if (target) {
    deepFocus.visualX = target.x;
    deepFocus.visualY = target.y;
    target.visualMotionX = target.x;
    target.visualMotionY = target.y;
    target.focusProgress = 0;
    target.focusAlpha = 1;
    target.focusShape = 0;
    target.focusMotion = 0;
    target.fcsRingGrwth = 1;
    target.encnActv = false;
    target.attnAnchr = null;
    clearLifeCache(target);
  }
  deepFocus.phase = "idle";
  deepFocus.candidate = null;
  deepFocus.candOnMs = 0;
  deepFocus.candFocusMs = 0;
  deepFocus.candBreakMs = 0;
  deepFocus.target = null;
  deepFocus.phaseElapsedMs = 0;
  deepFocus.entryElapsedMs = 0;
  deepFocus.focusWaitN = null;
  deepFocus.windowProgress = 0;
  deepFocus.visualRotation = 0;
  deepFocus.window = null;
}

function fnshDeepFcs() {
  const target = deepFocus.target;
  // Log the encounter on completion, then request a same-species
  // outcome once differentiation conditions are met.
  const shldDiff = Boolean(
    target && deepFocus.diffReady
  );
  // Return the target to its pre-entry ecological anchor
  // and release form fields used by the focus window.
  if (target) {
    target.x = deepFocus.originX;
    target.y = deepFocus.originY;
    target.x0 = deepFocus.originX;
    target.y0 = deepFocus.originY;
    target.visualMotionX = target.x;
    target.visualMotionY = target.y;
    target.cruiseCenter = { x: target.x, y: target.y };
    target.focusProgress = 0;
    target.focusAlpha = 1;
    target.focusShape = 0;
    target.focusMotion = 0;
    target.fcsRingGrwth = 1;
    target.encnActv = false;
    target.attnOn = false;
    target.attnDwellMs = 0;
    target.attnLeaveMs = 0;
    target.attnPow = 0;
    target.spokeAttnPow = 0;
    target.attnAnchr = null;
    clearLifeCache(target);
  }
  // Restore the entity before committing the log and ecological change,
  // recording the final state seen by the relevant participant.
  if (target) {
    const now = typeof millis === "function" ? millis() : 0;
    rcrdSurvEvnt(legacyEvent.encounter, target, now, {
      sessionId: activeSession?.id,
      sequence: deepFocus.focusCount || 1,
    });
    rslvFcsChng({
      host: target,
      species: eco.lifeType.deepDiver,
      spcReqr: shldDiff,
      session: activeSession,
      now,
    });
  }
// Clear the window and timing for this cycle while
// preserving accumulated focus count for the next deep dive.
  deepFocus.phase = "idle";
  deepFocus.target = null;
  deepFocus.phaseElapsedMs = 0;
  deepFocus.entryElapsedMs = 0;
  deepFocus.holdFocusMs = 0;
  deepFocus.focusLeaveMs = 0;
  deepFocus.focusWaitN = null;
  deepFocus.diffReady = false;
  deepFocus.windowProgress = 0;
  deepFocus.visualRotation = 0;
  deepFocus.driftInMs = 0;
  deepFocus.window = null;
  deepFocus.message = "Focus has entered a steady flow.";
  deepFocus.bubbles = [];
  deepFocus.bbblElapsedMs = 0;
}

function fcsdDeepDvrAt(gaze) {
  // Return the nearest Deep Diver within hit range among idle targets whose birth phase is complete.
  if (!gaze) return null;
  const radiusScale = ixGazeScale(
    eco.lifeType.deepDiver
  );
  let closest = null;
  let nearDistSq = Infinity;
  for (const deepDiver of creatures) {
    if (
      deepDiver.type !== eco.lifeType.deepDiver ||
      !isVisible(deepDiver) ||
      deepDiver.encnActv ||
      deepDiver.diffBirth ||
      !tgtRdyToSssn(deepDiver)
    ) {
      continue;
    }
    const position = worldPos(deepDiver);
    const radius = infoRadius(deepDiver) * radiusScale;
    const distSq = dist2(
      gaze.x,
      gaze.y,
      position.x,
      position.y
    );
    if (
      distSq <= radius * radius &&
      distSq < nearDistSq
    ) {
      closest = deepDiver;
      nearDistSq = distSq;
    }
  }
  return closest;
}

// Store the candidate's accumulated gaze and interruption
// timing in the exit queue for later decay or recovery.
function queueDeepExit(entity, focusMs, interruptionMs = 0) {
  if (!entity || focusMs <= 0) {
    if (entity) entity.focusProgress = 0;
    return false;
  }
  const existing = deepFocus.exits.find(
    (track) => track.entity === entity
  );
  if (existing) {
    existing.focusMs = max(existing.focusMs, focusMs);
    existing.interruptionMs = min(
      existing.interruptionMs,
      max(0, interruptionMs)
    );
  } else {
    deepFocus.exits.push({
      entity,
      focusMs,
      interruptionMs: max(0, interruptionMs),
    });
  }
  return true;
}

// Retrieve the target record from the exit queue, preserving its previous gaze accumulation on recovery.
function resumeDeepExit(entity) {
  const index = deepFocus.exits.findIndex(
    (track) => track.entity === entity
  );
  if (index < 0) return null;
  return deepFocus.exits.splice(index, 1)[0];
}

function updtDeepExts(frameMs) {
  const config = deepCfg;
  const remaining = [];
  for (const track of deepFocus.exits) {
    const valid =
      creatures.includes(track.entity) &&
      isVisible(track.entity) &&
      !track.entity.encnActv;
    const fallback = updateAttnProg(
      track.focusMs / config.gazeHoldMs,
      track.interruptionMs,
      clssAttnFlow({
        focused: false,
        hardReset: !valid,
      }),
      frameMs,
      { focusMs: config.gazeHoldMs }
    );
    track.focusMs = fallback.progress * config.gazeHoldMs;
    track.interruptionMs = fallback.interruptionMs;
    track.entity.focusProgress = fallback.progress;
    track.entity.focusAlpha = 1;
    if (fallback.progress > 0 && valid) remaining.push(track);
  }
  deepFocus.exits = remaining;
}

// Determine focus-window engagement from both logical gaze and window bounds.
// This function was modified with the assistance of ChatGPT.
function gazeInDeepFcs(camera, hasController) {
  const target = deepFocus.target;
  const windowRect = curFcsWndw();
  const gaze = camera?.gaze;
  if (!target || !windowRect || !hasController || !gaze) return false;
  const insideWindow =
    gaze.x >= windowRect.x &&
    gaze.x <= windowRect.x + windowRect.width &&
    gaze.y >= windowRect.y &&
    gaze.y <= windowRect.y + windowRect.height;
  const targetRadius = infoRadius(target) * 1.15;
  const insdCptrOrgn =
    deepFocus.phase === "capturing" &&
    dist2(
      gaze.x,
      gaze.y,
      deepFocus.originX,
      deepFocus.originY
    ) <=
      targetRadius * targetRadius;
  return (
    insideWindow ||
    insdCptrOrgn ||
    dist2(
      gaze.x,
      gaze.y,
      deepFocus.visualX,
      deepFocus.visualY
    ) <=
      targetRadius * targetRadius
  );
}

// At the start of exit, save position, rotation, and form progress as the departure origin.
function startFocusExit() {
  const target = deepFocus.target;
  if (!target) return;
  deepFocus.phase = "exiting";
  deepFocus.phaseElapsedMs = 0;
  deepFocus.exitStartX = deepFocus.visualX;
  deepFocus.exitStartY = deepFocus.visualY;
  deepFocus.exitStrWndPro = deepFocus.windowProgress;
  deepFocus.exitStrtShpPow = target.focusShape;
  deepFocus.exitStrtMtnPow = target.focusMotion;
  deepFocus.exitStrtRot = deepFocus.visualRotation;
  target.attnOn = false;
  target.attnDwellMs = 0;
  target.attnLeaveMs = 0;
  target.attnPow = 0;
  target.spokeAttnPow = 0;
}

// Begin exiting focus once gaze has remained absent for the full grace period.
function updtFcsExit(camera, hasController, frameMs) {
  if (gazeInDeepFcs(camera, hasController)) {
    deepFocus.focusLeaveMs = 0;
    return false;
  }
  deepFocus.focusLeaveMs = min(
    deepCfg.leaveGraceMs,
    deepFocus.focusLeaveMs + frameMs
  );
  if (
    deepFocus.focusLeaveMs >=
    deepCfg.leaveGraceMs
  ) {
    startFocusExit();
    return true;
  }
  return false;
}

function updtDeepFcs(camera, hasController, frameMs) {
  // Local contract: read this session's input and world candidates;
  // this function and its completion handler advance deepFocus.phase.
  // frameMs is the interaction time for the current frame.
  // This function was modified with the assistance of ChatGPT.
  const config = deepCfg;
  if (deepFocus.phase === "idle") {
    // idle first accumulates a candidate, opening the window only after the entry threshold is reached.
    const fcsdCand = hasController
      ? fcsdDeepDvrAt(camera?.gaze)
      : null;
    if (
      fcsdCand &&
      fcsdCand !== deepFocus.candidate
    ) {
      // Place a departing Deep Diver in the exit queue,
      // preserving candidate progress that has not yet decayed.
      if (deepFocus.candidate) {
        queueDeepExit(
          deepFocus.candidate,
          deepFocus.candFocusMs,
          deepFocus.candBreakMs
        );
      }
      const resumed = resumeDeepExit(fcsdCand);
      deepFocus.candidate = fcsdCand;
      deepFocus.candOnMs = resumed
        ? config.encnDlyMs
        : 0;
      deepFocus.candFocusMs = resumed?.focusMs || 0;
      deepFocus.candBreakMs = 0;
      deepFocus.attnLogDone = Boolean(resumed);
      deepFocus.windowProgress = 0;
      deepFocus.window = null;
    }
    updtDeepExts(frameMs);
    const candidate = deepFocus.candidate;
    // When the same candidate remains hit, apply the entry delay,
    // then count the remaining frame time toward formal focus.
    if (candidate && fcsdCand === candidate) {
      deepFocus.candBreakMs = 0;
      const prevActvMs = deepFocus.candOnMs;
      const actvTtl =
        prevActvMs + frameMs;
      deepFocus.candOnMs = min(
        config.encnDlyMs,
        actvTtl
      );
      // The narrative log uses a shorter perceptible-lingering threshold,
      // while formal focus still requires the full hold duration.
      if (
        !deepFocus.attnLogDone &&
        prevActvMs < capture.logFocusMs &&
        deepFocus.candOnMs >=
          capture.logFocusMs
      ) {
        deepFocus.attnLogDone = true;
        rcrdSurvNote(
          "DeepDiver",
          "simple",
          candidate,
          lifeLogNow(),
          {
            sessionId: activeSession?.id,
            sequence: deepFocus.attnLogSeqht + 1,
            priority: 50,
            dedupeMs: 45000,
            ddpByCond: true,
          }
        );
      }
      const activeFrameMs = max(
        0,
        actvTtl - config.encnDlyMs
      );
      deepFocus.candFocusMs = min(
        config.gazeHoldMs,
        deepFocus.candFocusMs + activeFrameMs
      );
      candidate.focusProgress =
        deepFocus.candFocusMs / config.gazeHoldMs;
      // The entry animation occupies the latter part of the hold process.
      const entryStartMs =
        config.gazeHoldMs * config.fcsEntryStrt;
      if (deepFocus.candFocusMs >= entryStartMs) {
        const entryElapsedMs =
          deepFocus.candFocusMs - entryStartMs;
        prprDeepFcs(candidate);
        updtFcsEntry(entryElapsedMs);
        if (deepFocus.candFocusMs >= config.gazeHoldMs) {
          actvDeepFcs();
        }
      }
    // When gaze leaves, reverse progress according to the interruption grace period;
    // if the candidate is invalid, skip the grace period and clear it promptly.
    } else if (candidate && deepFocus.candFocusMs > 0) {
      const candidateValid =
        creatures.includes(candidate) &&
        isVisible(candidate) &&
        !candidate.encnActv;
      const fallback = updateAttnProg(
        deepFocus.candFocusMs / config.gazeHoldMs,
        deepFocus.candBreakMs,
        clssAttnFlow({
          focused: false,
          hardReset: !candidateValid,
        }),
        frameMs,
        { focusMs: config.gazeHoldMs }
      );
      deepFocus.candFocusMs =
        fallback.progress * config.gazeHoldMs;
      deepFocus.candBreakMs = fallback.interruptionMs;
      candidate.focusProgress = fallback.progress;
      candidate.focusAlpha = 1;
      if (fallback.progress <= 0) {
        deepFocus.candidate = null;
        deepFocus.candOnMs = 0;
        deepFocus.candBreakMs = 0;
      }
    } else if (candidate) {
      candidate.focusProgress = 0;
      deepFocus.candidate = null;
      deepFocus.candOnMs = 0;
      deepFocus.candFocusMs = 0;
      deepFocus.candBreakMs = 0;
    }
    return;
  }

  const target = deepFocus.target;
  const windowRect = deepFocus.window;
  if (!target || !creatures.includes(target) || !windowRect) {
    resetDeepFocus();
    return;
  }

  if (deepFocus.phase === "capturing") {
    // capturing remains reversible and is committed as formal
    // focus only after the full lingering threshold is reached.
    const focusProgress = updateAttnProg(
      deepFocus.candFocusMs / config.gazeHoldMs,
      deepFocus.candBreakMs,
      clssAttnFlow({
        focused: gazeInDeepFcs(camera, hasController),
      }),
      frameMs,
      { focusMs: config.gazeHoldMs }
    );
    deepFocus.candFocusMs =
      focusProgress.progress * config.gazeHoldMs;
    deepFocus.candBreakMs =
      focusProgress.interruptionMs;
    target.focusProgress =
      deepFocus.candFocusMs / config.gazeHoldMs;
    const entryStartMs =
      config.gazeHoldMs * config.fcsEntryStrt;
    updtFcsEntry(
      max(0, deepFocus.candFocusMs - entryStartMs)
    );
    if (deepFocus.candFocusMs >= config.gazeHoldMs) {
      actvDeepFcs();
    } else if (deepFocus.candFocusMs <= 0) {
      fnshFcsCncl();
    }
    return;
  }

  deepFocus.phaseElapsedMs += frameMs;

  if (deepFocus.phase === "canceling") {
    // canceling handles external interruption, returning the visual to
    // its origin and ending this focus cycle with a canceled result.
    const progress = deepFocusEase(
      deepFocus.phaseElapsedMs / config.focusCancelMs
    );
    deepFocus.visualX = lerp(
      deepFocus.cancelStartX,
      target.x,
      progress
    );
    deepFocus.visualY = lerp(
      deepFocus.cancelStartY,
      target.y,
      progress
    );
    deepFocus.visualRotation =
      deepFocus.cnclStrtRot * (1 - progress);
    deepFocus.windowProgress =
      deepFocus.cnclStrtProg * (1 - progress);
    target.focusAlpha = 1 - progress;
    if (deepFocus.phaseElapsedMs >= config.focusCancelMs) {
      fnshFcsCncl();
      return;
    }
  } else if (deepFocus.phase === "entering") {
    // entering establishes the window and shared feedback together,
    // moving to holding once form and position stabilize.
    updtFcsEntry(
      deepFocus.entryElapsedMs + frameMs
    );
    updtShrdFcs();
    const progressFade = deepFocusEase(
      deepFocus.phaseElapsedMs / config.focusFadeMs
    );
    target.focusAlpha = 1 - progressFade;
    if (progressFade >= 1) target.focusProgress = 0;
    const shapeProgress = deepFocusEase(
      deepFocus.phaseElapsedMs / config.focusShapeMs
    );
    target.focusShape = shapeProgress;
    target.focusMotion = shapeProgress;
    const entryAnimDur = max(
      config.fcsWndwApprMs,
      config.focusMoveMs
    );
    // Window movement and body transformation must complete together.
    if (
      deepFocus.entryElapsedMs >= entryAnimDur &&
      deepFocus.phaseElapsedMs >= config.focusShapeMs
    ) {
      deepFocus.phase = "holding";
      deepFocus.phaseElapsedMs = 0;
      deepFocus.windowProgress = 1;
      target.focusProgress = 0;
      target.focusAlpha = 0;
      target.focusShape = 1;
      target.focusMotion = 1;
      rcrdSurvNote(
        "DeepDiver",
        "full",
        target,
        lifeLogNow(),
        {
          sessionId: activeSession?.id,
          sequence: deepFocus.attnLogSeqht,
          priority: 80,
        }
      );
      const insidePose = fcsInsdPose(
        target,
        deepFocus.driftInMs
      );
      deepFocus.visualX = insidePose.x;
      deepFocus.visualY = insidePose.y;
      deepFocus.visualRotation = insidePose.rotation;
    }
  } else if (deepFocus.phase === "holding") {
    // holding maintains the window form and accumulates holdFocusMs while gaze continues to hit.
    deepFocus.windowProgress = 1;
    target.focusShape = 1;
    target.focusMotion = 1;
    updtFcsRngs(target, frameMs);
    deepFocus.entryElapsedMs += frameMs;
    updtShrdFcs();
    deepFocus.driftInMs += frameMs;
    const insidePose = fcsInsdPose(
      target,
      deepFocus.driftInMs
    );
    deepFocus.visualX = insidePose.x;
    deepFocus.visualY = insidePose.y;
    deepFocus.visualRotation = insidePose.rotation;
    if (updtFcsExit(camera, hasController, frameMs)) {
      return;
    }
    if (gazeInDeepFcs(camera, hasController)) {
      deepFocus.holdFocusMs = min(
        config.sharedHoldMs,
        deepFocus.holdFocusMs + frameMs
      );
    }
    if (deepFocus.holdFocusMs >= config.sharedHoldMs) {
      // Once accumulated valid gaze reaches sharedHoldMs, enter the breathing phase;
      // I leave a moment of rest within this deep dive.
      deepFocus.phase = "breathing";
      deepFocus.phaseElapsedMs = 0;
      deepFocus.message = "Rest before the next flow.";
      deepFocus.bubbles = [];
      deepFocus.bbblElapsedMs = 0;
      rcrdSurvNote(
        "DeepDiver",
        "rest",
        target,
        lifeLogNow(),
        {
          sessionId: activeSession?.id,
          sequence: deepFocus.attnLogSeqht,
          priority: 100,
        }
      );
    }
  } else if (deepFocus.phase === "breathing") {
    // During breathing, the window remains in place and holdFocusMs
    // stops accumulating; exit after the rest timer completes.
    const dropProgress = deepFocusEase(
      deepFocus.phaseElapsedMs / config.focusBreathMs
    );
    deepFocus.windowProgress = 1;
    target.focusShape = 1;
    target.focusMotion = 1;
    updtFcsRngs(target, frameMs);
    deepFocus.entryElapsedMs += frameMs;
    updtShrdFcs();
    deepFocus.driftInMs += frameMs;
    const insidePose = fcsInsdPose(
      target,
      deepFocus.driftInMs
    );
    deepFocus.visualX = insidePose.x;
    deepFocus.visualY =
      insidePose.y + config.fcsBrthDrop * dropProgress;
    deepFocus.visualRotation = insidePose.rotation;
    if (deepFocus.bubbles.length > 0) {
      deepFocus.bbblElapsedMs += frameMs;
    }
    if (
      deepFocus.bubbles.length === 0 &&
      deepFocus.phaseElapsedMs >= config.focusMessageMs
    ) {
      deepFocus.bubbles = crtFcsBbbls(target);
      deepFocus.bbblElapsedMs = 0;
    }
    const greenReadyMs = config.focusMessageMs;
    if (
      deepFocus.phaseElapsedMs >=
      greenReadyMs + config.restHoldMs
    ) {
      deepFocus.diffReady = true;
      startFocusExit();
    }
  } else if (deepFocus.phase === "exiting") {
    // Begin the return journey from the exit snapshot, preserving the shared result already formed.
    if (deepFocus.bubbles.length > 0) {
      deepFocus.bbblElapsedMs += frameMs;
    }
    deepFocus.entryElapsedMs += frameMs;
    updtShrdFcs();
    updtFcsRngs(target, frameMs);
    const progress = deepFocusEase(
      deepFocus.phaseElapsedMs / config.focusExitMs
    );
    deepFocus.windowProgress =
      deepFocus.exitStrWndPro * (1 - progress);
    target.focusShape =
      deepFocus.exitStrtShpPow * (1 - progress);
    target.focusMotion =
      deepFocus.exitStrtMtnPow * (1 - progress);
    deepFocus.visualRotation =
      deepFocus.exitStrtRot * (1 - progress);
    deepFocus.visualX = lerp(
      deepFocus.exitStartX,
      deepFocus.originX,
      progress
    );
    deepFocus.visualY = lerp(
      deepFocus.exitStartY,
      deepFocus.originY,
      progress
    );
    if (deepFocus.phaseElapsedMs >= config.focusExitMs) {
      fnshDeepFcs();
      return;
    }
  }

  if (target?.attnAnchr) {
    target.attnAnchr.x = deepFocus.visualX;
    target.attnAnchr.y = deepFocus.visualY;
  }
}

// 4. The Deep Diver object and its specialized behavior are exposed through the same lifeform module.
// This code was modified with the assistance of ChatGPT.
window.DeepDiver = DeepDiver;
window.DeepDiverBehavior = Object.freeze({
  createSessionState: crtDeepFcs,
  resetInteraction: resetDeepFocus,
  updateInteraction(context = {}) {
    return updtDeepFcs(
      context.camera || null,
      Boolean(context.hasController),
      Number(context.frameMs) || 0
    );
  },
  getViewState() {
    return deepFocus;
  },
});
