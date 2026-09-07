// File Overview
// Implements Roamer, representing non-goal-directed attention,
// mind-wandering, and recovery.

// 1. Roamer represents low-arousal, non-goal-directed attention and supports recovery.
// It draws on research into mind-wandering (Schooler et al., 2011) and Attention Restoration Theory,
// particularly soft fascination and being away (Kaplan, 1995).

// 2. Body and direction
class Roamer {
  static arrowPath = null;
  static spriteAtlas = null;
  static morphLevels = 32;
  static transitionSize = 56;
  static spriteDensity = 1;
  static arrowDirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  static getArrowPath() {
    if (Roamer.arrowPath || typeof Path2D === "undefined") return Roamer.arrowPath;

    const path = new Path2D();
    path.moveTo(-6, -1.7);
    path.bezierCurveTo(-6.9, -1.7, -7.4, -1.05, -7.4, 0);
    path.bezierCurveTo(-7.4, 1.05, -6.9, 1.7, -6, 1.7);
    path.bezierCurveTo(-3.8, 1.7, -2, 1.7, -0.9, 1.7);
    path.bezierCurveTo(-0.3, 1.7, 0.12, 2.25, -0.06, 2.82);
    path.bezierCurveTo(-0.28, 3.5, -0.62, 4.2, -0.25, 4.82);
    path.bezierCurveTo(0.12, 5.42, 0.88, 5.5, 1.45, 5.02);
    path.bezierCurveTo(3.35, 3.45, 5.35, 1.9, 7.05, 0.75);
    path.bezierCurveTo(7.82, 0.23, 7.82, -0.23, 7.05, -0.75);
    path.bezierCurveTo(5.35, -1.9, 3.35, -3.45, 1.45, -5.02);
    path.bezierCurveTo(0.88, -5.5, 0.12, -5.42, -0.25, -4.82);
    path.bezierCurveTo(-0.62, -4.2, -0.28, -3.5, -0.06, -2.82);
    path.bezierCurveTo(0.12, -2.25, -0.3, -1.7, -0.9, -1.7);
    path.bezierCurveTo(-2, -1.7, -3.8, -1.7, -6, -1.7);
    path.closePath();
    Roamer.arrowPath = path;
    return Roamer.arrowPath;
  }

  // This method was modified with the assistance of ChatGPT.
  static getSpriteAtlas() {
    if (Roamer.spriteAtlas) return Roamer.spriteAtlas;
    if (typeof document === "undefined") return null;
    const arrowPath = Roamer.getArrowPath();
    if (!arrowPath) return null;

    const levels = Roamer.morphLevels;
    const size = Roamer.transitionSize;
    const density = Roamer.spriteDensity;
    const col = eco.lifeColor.Roamer;
    const sprites = new Array(levels + 1);

    for (let level = 1; level < levels; level++) {
      const glow = level / levels;
      const canvas = document.createElement("canvas");
      canvas.width = size * density;
      canvas.height = size * density;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(density, 0, 0, density, size * density * 0.5, size * density * 0.5);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const dotAlpha = roamCfg.arrowDotAlpha * (1 - glow);
      const dotSize = roamCfg.arrowDotSize * lerp(1, 0.5, glow);
      ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${dotAlpha / 255})`;
      ctx.beginPath();
      ctx.arc(0, 0, dotSize * 0.5, 0, TWO_PI);
      ctx.fill();

      const arrowAlpha = roamCfg.arrowLitAlpha * glow;
      const arrowScale =
        roamCfg.arrowScale * lerp(1, roamCfg.arrowLitScale, glow);
      ctx.save();
      ctx.scale(arrowScale * roamCfg.arrowScaleX, arrowScale);
      ctx.fillStyle = `rgba(${roamCfg.arrowGlowColor.join(",")}, ${arrowAlpha / 255})`;
      ctx.fill(arrowPath);
      ctx.restore();

      sprites[level] = canvas;
    }

    Roamer.spriteAtlas = { levels, size, sprites };
    return Roamer.spriteAtlas;
  }

  // Each Roamer stores movement, division, encounter, and render-cache state;
  // WorldSystem manages the shared lifeform collection.
  constructor(x, y, rot) {
    // Initial form and separation tendency are sampled independently,
    // allowing the same Roamer rules to produce distinct individuals.
    this.type = eco.lifeType.roamer;
    this.x0 = x;
    this.y0 = y;
    this.rot0 = rot;
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.sz = random(0.9, 1.4);
    const sepRoll = random();
    this.sepBias =
      sepRoll < roamCfg.sepFarChance
        ? lerp(
            roamCfg.sepFarMin,
            roamCfg.sepFarMax,
            sepRoll / roamCfg.sepFarChance
          )
        : lerp(
            roamCfg.sepBiasMin,
            roamCfg.sepBiasMax,
            (sepRoll - roamCfg.sepFarChance) / (1 - roamCfg.sepFarChance)
          );
    this.hostR = 60;
    this.seed = random(1e6);
    this.dy = 0;
    this.b = 1;
    this.ax = random(0.75, 1.35);
    this.ay = random(0.75, 1.35);
    this.rw = random(0.7, 1.4);
    this.tt = random(9999);
    // Each instance reuses the waveform and orbit data required for high-frequency rendering.
    this.motionCache = null;
    this.motionState = { current: null, next: null, mix: 0 };
    this.motionPhase = this.seed % (1000 / roamCfg.motionCacheTps);
    this.bodyPoints = Array.from(
      { length: roamCfg.bodyWaveSteps },
      () => [0, 0]
    );
    this.arrowGlow = Array(roamCfg.arrowCount).fill(0);
    this.arrwGlowTgt = Array(roamCfg.arrowCount).fill(0);
    this.orbitItems = Array.from({ length: roamCfg.arrowCount }, () => ({}));
    this.nextArrwGlowAt = 0;
    // Gaze response, division, and departure are stored separately
    // so their timelines can decay and resolve independently.
    this.attnDwellMs = 0;
    this.attnPow = 0;
    this.attentionOffsetX = 0;
    this.attentionOffsetY = 0;
    this.attnOrbtAngl = 0;
    this.attnSldSign = this.seed % 2 < 1 ? -1 : 1;
    this.attnOn = false;
    this.attnSldDirX = 0;
    this.attnSldDirY = 0;
    this.visualMotionX = x;
    this.visualMotionY = y;
    this.attnMtnSett = false;
    this.splitFocusMs = 0;
    this.spltBreakMs = 0;
    this.splitArmed = false;
    this.splitComplete = false;
    this.attnLogDone = false;
    this.splitLastGazeX = x;
    this.splitLastGazeY = y;
    this.splitChildren = [];
    this.splitBirth = null;
    this.splitGrowMul = 1;
    this.splitGeneration = 0;
    this.splitDeathRoll = 1;
    this.splitDied = false;
    this.deathStartedAt = -Infinity;
    this.deathProgress = 0;
    this.deathAlpha = 1;
    this.deathScale = 1;
    this.dthRmvlQd = false;
    this.spltFreCueStaA = -Infinity;
    this.splitArrowIds = [];
    this.spltArrwOutc = [];

  }

// 3. When mind-wandering opens more possibilities from a single direction
  pickLitArrows(now) {
    const pool = Array.from({ length: roamCfg.arrowCount }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = floor(random(i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const count = floor(random(roamCfg.arrowGlowMin, roamCfg.arrowGlowMax + 1));
    this.arrwGlowTgt.fill(0);
    for (let i = 0; i < count; i++) this.arrwGlowTgt[pool[i]] = 1;
    this.nextArrwGlowAt = now + roamCfg.arrowGlowMs;
  }

  // Periodically reselect illuminated arrows; each arrow's
  // current brightness approaches its target value frame by frame.
  updtArrwGlow(ctx) {
    const now = ctx.now;
    if (now >= this.nextArrwGlowAt) this.pickLitArrows(now);

    const ease = smoothA(roamCfg.arrowGlowEase, ctx.dt);
    for (let i = 0; i < this.arrowGlow.length; i++) {
      const nextGlow = lerp(this.arrowGlow[i], this.arrwGlowTgt[i], ease);
      this.arrowGlow[i] =
        abs(nextGlow - this.arrwGlowTgt[i]) < 0.01 ? this.arrwGlowTgt[i] : nextGlow;
    }
  }

  // Collect arrows whose target brightness exceeds the threshold, filling any shortfall by brightness.
  getLitArrInd() {
    const candidates = [];
    for (let index = 0; index < this.arrowGlow.length; index++) {
      if (this.arrwGlowTgt[index] > 0.5) candidates.push(index);
    }
    if (candidates.length < roamCfg.arrowGlowMin) {
      const ranked = Array.from(
        { length: roamCfg.arrowCount },
        (_, index) => index
      ).sort(
        (a, b) =>
          max(this.arrowGlow[b], this.arrwGlowTgt[b]) -
          max(this.arrowGlow[a], this.arrwGlowTgt[a])
      );
      for (const index of ranked) {
        if (!candidates.includes(index)) candidates.push(index);
        if (candidates.length >= roamCfg.arrowGlowMin) break;
      }
    }
    return candidates;
  }

  // The division-release cue stores its start time and arrow count.
  bgnSpltFreeCue(now) {
    this.splitArrowIds = this.getLitArrInd();
    this.arrwGlowTgt.fill(0);
    for (const index of this.splitArrowIds) {
      this.arrwGlowTgt[index] = 1;
    }
    this.nextArrwGlowAt = Infinity;
    this.spltFreCueStaA = now;
  }

  // Total cue duration is determined by the blink cycle and repetition count,
  // giving the release phase a single completion boundary.
  spltFreeCueDur() {
    return (
      roamCfg.spltCueBlnPrdM *
      roamCfg.spltCueBlnkN
    );
  }

  // Selected arrows blink on the same cycle to indicate available directions for division.
  splitCueBright(arrowIndex, now) {
    if (
      !this.splitArmed ||
      !this.splitArrowIds.includes(arrowIndex)
    ) {
      return 1;
    }
    const elapsed = now - this.spltFreCueStaA;
    if (elapsed < 0 || elapsed >= this.spltFreeCueDur()) return 1;
    const phase =
      (elapsed % roamCfg.spltCueBlnPrdM) /
      roamCfg.spltCueBlnPrdM;
    const pulse = 0.5 - 0.5 * cos(TWO_PI * phase);
    return lerp(1, roamCfg.spltCueMinBrgh, pulse);
  }

  // Cue scale and brightness use the same segmented clock.
  spltFreeCueScl(arrowIndex, now) {
    if (
      !this.splitArmed ||
      !this.splitArrowIds.includes(arrowIndex)
    ) {
      return 1;
    }
    const elapsed = now - this.spltFreCueStaA;
    if (elapsed < 0 || elapsed >= this.spltFreeCueDur()) return 1;
    const phase =
      (elapsed % roamCfg.spltCueBlnPrdM) /
      roamCfg.spltCueBlnPrdM;
    const pulse = 0.5 - 0.5 * cos(TWO_PI * phase);
    return lerp(1, roamCfg.spltCueMaxScl, pulse);
  }

  // Once division is ready, ripples around selected arrows expand in sync with the cue cycle.
  drawSpltRppls(now) {
    if (!this.splitArmed || !this.splitArrowIds.length) return;
    const elapsed = now - this.spltFreCueStaA;
    if (elapsed < 0 || elapsed >= this.spltFreeCueDur()) return;

    const phase =
      (elapsed % roamCfg.spltCueBlnPrdM) /
      roamCfg.spltCueBlnPrdM;
    const spread = 1 - pow(1 - phase, 2);
    const diameter = lerp(
      roamCfg.spltRppSizMin,
      roamCfg.spltRppSizMax,
      spread
    );
    const alpha =
      roamCfg.spltCueRppAlp * pow(1 - phase, 1.35);

    push();
    setDynamicGlow(
      `rgba(255, 255, 255, ${roamCfg.spltCueRppGloA})`,
      roamCfg.spltCueRppGloB
    );
    noFill();
    stroke(255, alpha);
    strokeWeight(roamCfg.spltCueRppWgh);
    for (const arrowIndex of this.splitArrowIds) {
      const item = this.orbitItems[arrowIndex];
      if (item) circle(item.x, item.y, diameter);
    }
    pop();
  }

  // The division snapshot locks body position, rotation, and arrow directions so offspring birth remains
  // independent of ordinary roaming updates.
  spltFreeSnap() {
    const centerX = Number.isFinite(this.visualMotionX)
      ? this.visualMotionX
      : this.x;
    const centerY = Number.isFinite(this.visualMotionY)
      ? this.visualMotionY
      : this.y;
    return {
      centerX,
      centerY,
      rotation: this.rot,
      arrows: this.orbitItems.map((item) => ({
        x: item.x,
        y: item.y,
        worldX: item.worldX,
        worldY: item.worldY,
      })),
    };
  }

  // Align the world position with the release snapshot and
  // translate the birth path and roaming center by the same offset.
  syncVisPos(snapshot) {
    const visibleX = snapshot.centerX;
    const visibleY = snapshot.centerY;
    const shiftX = visibleX - this.x;
    const shiftY = visibleY - this.y;
    this.x0 += shiftX;
    this.y0 += shiftY;
    this.x = visibleX;
    this.y = visibleY;
    if (this.splitBirth) {
      this.splitBirth.startX += shiftX;
      this.splitBirth.startY += shiftY;
      this.splitBirth.targetX += shiftX;
      this.splitBirth.targetY += shiftY;
    }
    if (this.cruiseCenter) {
      this.cruiseCenter = {
        x: (this.cruiseCenter.x0 ?? this.cruiseCenter.x) + shiftX,
        y: (this.cruiseCenter.y0 ?? this.cruiseCenter.y) + shiftY,
      };
    }
    this.attentionOffsetX = 0;
    this.attentionOffsetY = 0;
    this.visualMotionX = visibleX;
    this.visualMotionY = visibleY;
    this.attnMtnSett = false;
  }

  // This method was modified with the assistance of ChatGPT.
  pickSplArrDir(rng, freeSnps = null) {
    // Prefer illuminated arrows saved at the moment of release;
    // if the snapshot is empty, fall back to the current orbit state.
    const candidates = this.splitArrowIds.length
      ? [...this.splitArrowIds]
      : this.getLitArrInd();
    for (let index = candidates.length - 1; index > 0; index--) {
      const swapIndex = floor(rng() * (index + 1));
      [candidates[index], candidates[swapIndex]] = [
        candidates[swapIndex],
        candidates[index],
      ];
    }
    // Each candidate records its position, direction, and random
    // outcome so spawning and visual feedback share the same decision.
    const outcomes = candidates.map((arrowIndex) => {
      const item =
        freeSnps?.arrows?.[arrowIndex] || this.orbitItems[arrowIndex];
      const fallbackAngle =
        (TWO_PI * arrowIndex) / roamCfg.arrowCount +
        this.attnOrbtAngl;
      const hasArrwPos =
        Number.isFinite(item?.x) && Number.isFinite(item?.y);
      const hasArrwWrldPos =
        Number.isFinite(item?.worldX) && Number.isFinite(item?.worldY);
      const localX = hasArrwPos ? item.x : cos(fallbackAngle) * 91;
      const localY = hasArrwPos ? item.y : sin(fallbackAngle) * 86;
      const localAngle =
        hasArrwPos ? atan2(localY, localX) : fallbackAngle;
      const snpsCntrX =
        freeSnps?.centerX ?? this.visualMotionX ?? this.x;
      const snpsCntrY =
        freeSnps?.centerY ?? this.visualMotionY ?? this.y;
      const worldAngle = hasArrwWrldPos
        ? atan2(
            item.worldY - snpsCntrY,
            item.worldX - snpsCntrX
          )
        : (freeSnps?.rotation ?? this.rot) + localAngle;
      const birthRoll = rng();
      return {
        arrowIndex,
        angle: worldAngle,
        localX,
        localY,
        worldX: hasArrwWrldPos ? item.worldX : null,
        worldY: hasArrwWrldPos ? item.worldY : null,
        birthRoll,
        born: birthRoll < roamCfg.spltArrBrtChn,
        created: false,
      };
    });
    // Preserve each arrow's original probability result before applying the minimum-birth guarantee
    // separately, allowing the log to explain the final selection.
    const bornCount = outcomes.reduce(
      (count, outcome) => count + (outcome.born ? 1 : 0),
      0
    );
    const requiredBirths = min(
      roamCfg.spltMinBrths,
      outcomes.length
    );
    // If the expected birth count is below the minimum, add candidates with the lowest random rolls.
    if (bornCount < requiredBirths) {
      const fallbacks = outcomes
        .filter((outcome) => !outcome.born)
        .sort((a, b) => a.birthRoll - b.birthRoll);
      for (let index = 0; index < requiredBirths - bornCount; index++) {
        fallbacks[index].born = true;
      }
    }
    return outcomes;
  }

// New Roamers depart along selected arrows, extending mind-wandering from the original position.
  // This method was modified with the assistance of ChatGPT.
  triggerSplit(now, freeSnps = null) {
    if (this.splitComplete) return;
    const creatureWorld = window.CreatureWorld;
    // Register all offspring through the common world entry point.
    if (!creatureWorld?.add) return;
    const rng = mulberry32(
      (floor(this.seed || 0) ^ Math.imul(floor(now) + 1, 0x9e3779b1)) >>> 0
    );
    // Each arrow receives an outcome in advance; successful directions then produce offspring,
    // keeping visual cues aligned with probability decisions.
    const arrowOutcomes = this.pickSplArrDir(rng, freeSnps);
    this.spltArrwOutc = arrowOutcomes;
    const spltDirc = arrowOutcomes.filter((outcome) => outcome.born);

    const children = [];
    for (let index = 0; index < spltDirc.length; index++) {
      const outcome = spltDirc[index];
      const {
        arrowIndex,
        angle,
        localX,
        localY,
        worldX,
        worldY,
        birthRoll,
      } = outcome;
      const distance = srng(
        rng,
        roamCfg.spltDistMin,
        roamCfg.spltDistMax
      );
      const parentScale =
        eco.drawScale *
        this.sz *
        scaleOf(this.type) *
        this.b *
        this.splitGrowMul *
        this.deathScale *
        prdtDomn.otherScale;
      const rotationCosine = cos(this.rot);
      const rotationSine = sin(this.rot);
      const visualCenterX = freeSnps?.centerX ?? this.x;
      const visualCenterY = freeSnps?.centerY ?? this.y;
      // Use the visual snapshot from the start of division so
      // offspring appear where participants actually saw the parent.
      const start = {
        x: Number.isFinite(worldX)
          ? worldX
          : visualCenterX +
            (localX * rotationCosine - localY * rotationSine) * parentScale,
        y: Number.isFinite(worldY)
          ? worldY
          : visualCenterY +
            (localX * rotationSine + localY * rotationCosine) * parentScale,
      };
// Bring offspring destinations within ecological bounds while leaving room for their diverging paths.
      const target = ecoWorld.project(
        start.x + cos(angle) * distance,
        start.y + sin(angle) * distance,
        20
      );
      outcome.startX = start.x;
      outcome.startY = start.y;
      // Each offspring stores its visible start, bounded endpoint, and parent scale.
      const child = new Roamer(start.x, start.y, angle);
      const initSizeRt = srng(
        rng,
        roamCfg.spltIniSizRtMi,
        roamCfg.spltIniSizRtMa
      );
      const tgtSizeRt = srng(
        rng,
        roamCfg.spltTgtSizRtMi,
        roamCfg.spltTgtSizRtMa
      );
      const sourceSize = this.sz * this.splitGrowMul;
      const initialSize = sourceSize * initSizeRt;
      const targetSize = sourceSize * tgtSizeRt;
      child.sz = targetSize;
      child.splitGeneration = this.splitGeneration + 1;
      child.splitGrowMul = 0;
      child.splitDeathRoll = rng();
      child.splitBirth = {
        startX: start.x,
        startY: start.y,
        targetX: target.x,
        targetY: target.y,
        angle,
        arrowIndex,
        birthRoll,
        srcArrwGlow: max(
          this.arrowGlow[arrowIndex],
          this.arrwGlowTgt[arrowIndex]
        ),
        initialSize,
        targetSize,
        initSizeRt,
        tgtSizeRt,
        initialScale: initialSize / targetSize,
        startAt: now + index * roamCfg.splitStaggerMs,
        birthDuration: roamCfg.splitBirthMs,
        driftDuration: roamCfg.splitDriftMs,
        growthDuration: roamCfg.splitGrowthMs,
        deathChecked: false,
      };
      child.cruiseCenter = { x: target.x, y: target.y };
      child.cruiseVX = cos(angle);
      child.cruiseVY = sin(angle);
      const commandSession = activeSession;
      // Submit spawning through the world command queue.
      const queued = enqWrldCmmnd(
        commandSession,
        "roamer-spawn",
        () =>
          creatureWorld.add(child, {
            group: "creature",
            origin: "roamer-split",
            parentSeed: this.seed,
            sessionId: commandSession?.id ?? 0,
          }),
        { parentSeed: this.seed }
      );
      if (queued) {
        outcome.created = true;
        children.push(child);
      }
    }
    // Once offspring spawning completes, this division enters its closing state.
    this.splitChildren = children;
    this.splitFocusMs = 0;
    this.spltBreakMs = 0;
    this.splitArmed = false;
    this.splitComplete = true;
    this.nextArrwGlowAt = now + roamCfg.arrowGlowMs;
    rcrdSurvEvnt(legacyEvent.encounter, this, now, {
      sessionId: activeSession?.id,
      sequence: this.splitGeneration || 1,
    });
    if (children.length > 0) {
      rcrdSurvNote(
        "Roamer",
        "full",
        this,
        now,
        {
          sessionId: activeSession?.id,
          sequence: this.splitGeneration || 1,
          priority: 80,
        }
      );
    }
    rslvFcsChng({
      host: this,
      species: eco.lifeType.roamer,
      spcReqr: true,
      session: activeSession,
      now,
    });
  }

// 4. Accumulating gaze over a lifetime and awaiting an intentional release
  startDiffBirth(sourceCell, now, duration, initialSize) {
    const initSize = clamp(
      initialSize,
      roamCfg.diffIniSizMin,
      roamCfg.diffIniSizMax
    );
    this.x0 = sourceCell.x;
    this.y0 = sourceCell.y;
    this.x = sourceCell.x;
    this.y = sourceCell.y;
    this.cruiseCenter = { x: sourceCell.x, y: sourceCell.y };
    this.splitGrowMul = 0;
    this.splitDeathRoll = 1;
    this.diffSourceCell = sourceCell;
    this.splitBirth = {
      startX: sourceCell.x,
      startY: sourceCell.y,
      targetX: sourceCell.x,
      targetY: sourceCell.y,
      angle: this.rot,
      arrowIndex: -1,
      srcArrwGlow: 0,
      initialSize: initSize,
      targetSize: this.sz,
      initialScale: initSize / this.sz,
      startAt: now,
      birthDuration: 0,
      driftDuration: 1,
      growthDuration: max(1, duration),
      diff: true,
    };
  }

  // This method was modified with the assistance of ChatGPT.
  updtSpltBrth(ctx) {
    const birth = this.splitBirth;
    if (!birth) return false;
    // During the birth delay, remain at the arrow's origin;
    // I reveal the direction of division before allowing new life to appear.
    const elapsed = ctx.now - birth.startAt;
    if (elapsed < 0) {
      this.x0 = birth.startX;
      this.y0 = birth.startY;
      this.x = birth.startX;
      this.y = birth.startY;
      this.splitGrowMul = 0;
      this.updtArrwGlow(ctx);
      return true;
    }

    // Reveal, drift, and growth use independent timelines,
    // while differentiation can enter the growth process directly.
    const birthDuration = max(0, birth.birthDuration || 0);
    const birthProgress =
      birthDuration > 0 ? clamp(elapsed / birthDuration, 0, 1) : 1;
    const growthElapsed = max(0, elapsed - birthDuration);
    const driftProgress = clamp(growthElapsed / birth.driftDuration, 0, 1);
    const growthProgress = clamp(growthElapsed / birth.growthDuration, 0, 1);
    const birthEase =
      cubicSmoothstep(birthProgress);
    const driftEase = cubicSmoothstep(driftProgress);
    const growthEase = cubicSmoothstep(growthProgress);
    this.x0 = lerp(birth.startX, birth.targetX, driftEase);
    this.y0 = lerp(birth.startY, birth.targetY, driftEase);
    this.x = this.x0;
    this.y = this.y0;
    this.splitGrowMul =
      birthProgress < 1
        ? lerp(0, birth.initialScale, birthEase)
        : lerp(birth.initialScale, 1, growthEase);
    this.rot = this.rot0 + sin(elapsed * 0.00045 + this.seed) * 0.035;
    this.updtArrwGlow(ctx);

    // Offspring produced by division apply an early-mortality probability;
    // ordinary cell differentiation uses the standard lifecycle.
    if (
      !birth.diff &&
      !birth.deathChecked &&
      growthElapsed >= roamCfg.spltChlDthDlyM
    ) {
      birth.deathChecked = true;
      if (this.splitDeathRoll < roamCfg.spltChlDthChn) {
        this.beginDeath(ctx.now);
        return true;
      }
    }

    if (birthProgress >= 1 && driftProgress >= 1 && growthProgress >= 1) {
      this.x0 = birth.targetX;
      this.y0 = birth.targetY;
      this.x = birth.targetX;
      this.y = birth.targetY;
      this.splitGrowMul = 1;
      this.splitBirth = null;
    }
    return true;
  }

  // Lock the current scale, opacity, and position when death begins so the departure animation remains
  // independent of subsequent ordinary movement.
  beginDeath(now) {
    if (this.splitDied || !lifeCanRmvEnt(this)) return false;
    const lifeState = ensureLifeState(this, now);
    lifeState.phase = "dying";
    lifeState.cause = "roamer-split-death";
    lifeState.outcome = "fade";
    lifeState.committedRemoval = true;
    lifeState.externalDeath = true;
    this.splitDied = true;
    this.deathStartedAt = now;
    this.deathProgress = 0;
    this.deathAlpha = 1;
    this.deathScale = 1;
    this.arrwGlowTgt.fill(0);
    this.nextArrwGlowAt = Infinity;
    return true;
  }

  // The departure clock decays movement, scale, and opacity together,
  // then reports the lifeform as removable when the animation ends.
  updateDeath(ctx) {
    const progress = clamp(
      (ctx.now - this.deathStartedAt) / roamCfg.dthDurMs,
      0,
      1
    );
    const eased = cubicSmoothstep(progress);
    this.deathProgress = progress;
    this.deathAlpha = 1 - eased;
    this.deathScale = lerp(1, roamCfg.dthFnlScl, eased);
    this.updtArrwGlow(ctx);
    if (progress >= 1 && !this.dthRmvlQd) {
      this.dthRmvlQd = true;
      enqWrldCmmnd(
        ixTargetOwners.get(this) || activeSession,
        "roamer-remove",
        () => window.CreatureWorld?.remove(this, "roamer-split-death"),
        { seed: this.seed }
      );
    }
  }

  // Accumulate gaze duration and control the division trigger
  // This method was modified with the assistance of ChatGPT.
  updtSpltIx(
    gaze,
    hasController,
    hovered,
    frameMs,
    now,
    freeWhenArmd = true
  ) {
    if (this.splitComplete) return;
    const reqrFcsMs =
      roamCfg.spltActvMs + roamCfg.splitCaptureMs;
    if (hovered) {
      const prevSpltFcsMs = this.splitFocusMs;
      this.spltBreakMs = 0;
      this.splitFocusMs = min(
        reqrFcsMs,
        this.splitFocusMs + frameMs
      );
      if (
        !this.attnLogDone &&
        prevSpltFcsMs < capture.logFocusMs &&
        this.splitFocusMs >= capture.logFocusMs
      ) {
        this.attnLogDone = true;
        rcrdSurvNote(
          "Roamer",
          "simple",
          this,
          now,
          {
            sessionId: activeSession?.id,
            sequence: this.splitGeneration || 1,
            priority: 50,
            dedupeMs: 45000,
            ddpByCond: true,
          }
        );
      }
      this.splitLastGazeX = gaze.x;
      this.splitLastGazeY = gaze.y;
      if (this.splitFocusMs >= reqrFcsMs && !this.splitArmed) {
        this.splitArmed = true;
        this.bgnSpltFreeCue(now);
      }
      return;
    }

    // Preserve progress once division is ready and wait for the release signal.
    if (
      this.splitArmed &&
      freeWhenArmd &&
      hasController &&
      gaze
    ) {
      const freeSnps = this.spltFreeSnap();
      this.syncVisPos(freeSnps);
      this.triggerSplit(now, freeSnps);
      return;
    }
    if (this.splitArmed) return;

    const visibleFocusMs = max(
      0,
      this.splitFocusMs - roamCfg.spltActvMs
    );
    if (visibleFocusMs <= 0) {
      this.splitFocusMs = 0;
      this.spltBreakMs = 0;
      return;
    }
    // A blink falls within the grace period; if gaze remains absent,
    // response and accumulated progress gradually recede.
    const continuity = clssAttnFlow({ focused: false });
    const fallback = updateAttnProg(
      visibleFocusMs / roamCfg.splitCaptureMs,
      this.spltBreakMs,
      continuity,
      frameMs,
      { focusMs: roamCfg.splitCaptureMs }
    );
    this.spltBreakMs = fallback.interruptionMs;
    this.splitFocusMs = fallback.progress > 0
      ? roamCfg.spltActvMs +
        fallback.progress * roamCfg.splitCaptureMs
      : 0;
  }

  // After subtracting the activation delay, normalize accumulated
  // gaze into division progress; return zero after division completes.
  splitProgress() {
    if (this.splitComplete) return 0;
    return clamp(
      (this.splitFocusMs - roamCfg.spltActvMs) /
        roamCfg.splitCaptureMs,
      0,
      1
    );
  }

  // Interaction becomes available after the birth reveal;
  // return false once division is complete or death has begun.
  canRcvIx(now) {
    if (this.splitComplete || this.splitDied) return false;
    const birth = this.splitBirth;
    if (!birth) return true;
    return now - birth.startAt >= max(0, birth.birthDuration || 0);
  }

  isIxActv() {
    return Boolean(
      !this.splitComplete &&
        !this.splitDied &&
        (this.attnOn || this.splitFocusMs > 0 || this.splitArmed)
    );
  }

  // Align visual coordinates with the world position after gaze-driven movement ends.
  syncVisMtnToWr() {
    this.visualMotionX = this.x;
    this.visualMotionY = this.y;
    this.attnMtnSett = false;
  }

  // Distinguish ordinary roaming from gaze-driven movement for lifecycle and visual-state selection.
  isAttnMoving() {
    return Boolean(
      this.attnOn ||
        this.attnPow > 0.001 ||
        abs(this.attentionOffsetX) + abs(this.attentionOffsetY) >= 0.01
    );
  }

// Clamp visual displacement by frame duration so different devices present comparable roaming speeds.
  lmtVisMtn(frameMs) {
    const targetX = this.x;
    const targetY = this.y;
    lmtVisSpd(
      this,
      settings.cruise.roamer.speed *
        eco.moveSpeed *
        eco.simFps *
        roamCfg.mtnSpdMul,
      frameMs,
      roamCfg.mtnMaxFrmMs
    );
    return dist2(this.x, this.y, targetX, targetY) < 0.000001;
  }

  // This method was modified with the assistance of ChatGPT.
  getGroExiDir() {
    // Move outward when neighbors are nearby; otherwise move away from
    // the group center to find a less crowded path for mind-wandering.
    const roamers = groups[eco.lifeType.roamer] || [];
    const clusterRadius = roamCfg.attnGroupRad;
    let escapeX = 0;
    let escapeY = 0;
    let nearbyCount = 0;
    let globalX = 0;
    let globalY = 0;
    let globalCount = 0;

    for (const other of roamers) {
      if (
        other === this ||
        other.splitDied ||
        other.splitBirth ||
        other.splitGrowMul < 0.999
      ) {
        continue;
      }
      globalX += other.x;
      globalY += other.y;
      globalCount++;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = sqrt(dx * dx + dy * dy);
      if (distance <= 0.001 || distance > clusterRadius) continue;
      const weight = 1 - distance / clusterRadius;
      escapeX += (dx / distance) * weight;
      escapeY += (dy / distance) * weight;
      nearbyCount++;
    }

    if (!nearbyCount && globalCount) {
      escapeX = this.x - globalX / globalCount;
      escapeY = this.y - globalY / globalCount;
    }
    const magnitude = sqrt(escapeX * escapeX + escapeY * escapeY);
    if (magnitude <= 0.001) {
      return { x: cos(this.seed), y: sin(this.seed) };
    }
    return { x: escapeX / magnitude, y: escapeY / magnitude };
  }

  // This method was modified with the assistance of ChatGPT.
  cmmtAttnSld() {
    // Commit the visual offset from an interaction to world coordinates when the interaction ends.
    this.attnMtnSett = true;
    if (abs(this.attentionOffsetX) + abs(this.attentionOffsetY) < 0.001) {
      this.attentionOffsetX = 0;
      this.attentionOffsetY = 0;
      return;
    }
    const oldX0 = this.x0;
    const oldY0 = this.y0;
    const projected = ecoWorld.project(
      oldX0 + this.attentionOffsetX,
      oldY0 + this.attentionOffsetY,
      20
    );
    const shiftX = projected.x - oldX0;
    const shiftY = projected.y - oldY0;
    this.x0 = projected.x;
    this.y0 = projected.y;
    this.x += shiftX;
    this.y += shiftY;
    if (this.splitBirth) {
      // Translate the current individual's birth-path start and end by the same offset.
      this.splitBirth.startX += shiftX;
      this.splitBirth.startY += shiftY;
      this.splitBirth.targetX += shiftX;
      this.splitBirth.targetY += shiftY;
    }
    if (this.cruiseCenter) {
      this.cruiseCenter = {
        x: (this.cruiseCenter.x0 ?? this.cruiseCenter.x) + shiftX,
        y: (this.cruiseCenter.y0 ?? this.cruiseCenter.y) + shiftY,
      };
    }
    this.attentionOffsetX = 0;
    this.attentionOffsetY = 0;
  }

  // This method was modified with the assistance of ChatGPT.
  updtAttnFb(
    camera,
    hasController,
    frameMs,
    spltIxMode = "active"
  ) {
    const now = typeof millis === "function" ? millis() : 0;
    // When the individual is temporarily unavailable for interaction, clear gaze progress, response,
    // and offset before realigning visual coordinates.
    if (!this.canRcvIx(now)) {
      this.splitFocusMs = 0;
      this.spltBreakMs = 0;
      this.splitArmed = false;
      this.attnDwellMs = 0;
      this.attnPow = 0;
      this.attnOn = false;
      this.attentionOffsetX = 0;
      this.attentionOffsetY = 0;
      this.syncVisMtnToWr();
      return;
    }
    const gaze = camera?.gaze;
    const radiusScale = ixGazeScale(
      eco.lifeType.roamer
    );
    // The proximity range drives gaze response, while a smaller hit range independently determines
    // whether division progress accumulates.
    const prxmRad =
      (infoRadius(this) + roamCfg.attnNearPddng) *
      radiusScale;
    const dx = gaze ? this.x - gaze.x : 0;
    const dy = gaze ? this.y - gaze.y : 0;
    const distSq = dx * dx + dy * dy;
    const nearby = Boolean(
      hasController &&
        gaze &&
        distSq <= prxmRad * prxmRad
    );
    const ixRad =
      infoRadius(this) *
      roamCfg.ixHitScl *
      radiusScale;
    const hovered = Boolean(
      hasController &&
        gaze &&
        distSq <= ixRad * ixRad
    );
    // active updates according to hit state; release allows a ready division to trigger;
    // hold preserves the ready result while reversing incomplete progress.
    if (spltIxMode === "active") {
      this.updtSpltIx(
        gaze,
        hasController,
        hovered,
        frameMs,
        now
      );
    } else if (spltIxMode === "release") {
      this.updtSpltIx(
        gaze,
        hasController,
        false,
        frameMs,
        now
      );
    } else if (this.splitFocusMs > 0) {
      this.updtSpltIx(
        gaze,
        hasController,
        false,
        frameMs,
        now,
        false
      );
    }

    if (nearby) {
      this.attnDwellMs = min(
        roamCfg.attnDlyMs,
        this.attnDwellMs + frameMs
      );
    } else {
      this.attnDwellMs = max(0, this.attnDwellMs - frameMs * 1.5);
    }

    // Begin lateral movement only after the lingering threshold,
    // expressing mind-wandering as a directional response.
    const engaged =
      nearby &&
      this.attnDwellMs >= roamCfg.attnDlyMs;
    const wasEngaged = this.attnOn;
    // Lock the lateral direction when the response begins, then
    // commit visual displacement to the world trajectory when it ends.
    if (engaged && !wasEngaged) {
      const escpDir = this.getGroExiDir();
      this.attnSldDirX = escpDir.x;
      this.attnSldDirY = escpDir.y;
    } else if (!engaged && wasEngaged) {
      this.cmmtAttnSld();
    }
    this.attnOn = engaged;
    const frameFactor = clamp(frameMs / 16.666, 0.25, 4.8);
    const ease = smoothA(
      engaged
        ? roamCfg.attnSldEase
        : roamCfg.attnResEas,
      frameFactor
    );
    this.attnPow = lerp(
      this.attnPow,
      engaged ? 1 : 0,
      ease
    );
    if (!engaged && this.attnPow < 0.001) {
      this.attnPow = 0;
    }

    // The gaze response sets a relative displacement target,
    // while the natural roaming center remains independent until the action completes.
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    if (engaged) {
      targetOffsetX =
        this.attnSldDirX *
        roamCfg.attnSldDist;
      targetOffsetY =
        this.attnSldDirY *
        roamCfg.attnSldDist;
    }
    const offsetDeltaX = targetOffsetX - this.attentionOffsetX;
    const offsetDeltaY = targetOffsetY - this.attentionOffsetY;
    const offsetDistance = sqrt(
      offsetDeltaX * offsetDeltaX + offsetDeltaY * offsetDeltaY
    );
    const slideSpeed =
      settings.cruise.roamer.speed *
      eco.moveSpeed *
      eco.simFps *
      roamCfg.attnSldSpdMul;
    const slideFrameMs = min(
      frameMs,
      roamCfg.attnSldMaxFrmM
    );
    const maximumStep = slideSpeed * (slideFrameMs / 1000);
    // Limit the lateral step by frame duration.
    if (offsetDistance <= maximumStep || offsetDistance < 0.001) {
      this.attentionOffsetX = targetOffsetX;
      this.attentionOffsetY = targetOffsetY;
    } else {
      const stepScale = maximumStep / offsetDistance;
      this.attentionOffsetX += offsetDeltaX * stepScale;
      this.attentionOffsetY += offsetDeltaY * stepScale;
    }
    if (
      !engaged &&
      abs(this.attentionOffsetX) + abs(this.attentionOffsetY) < 0.01
    ) {
      this.attentionOffsetX = 0;
      this.attentionOffsetY = 0;
    }

    // Synchronize the world position only after visual movement ends.
    const visMtnActv = this.isAttnMoving();
    if (visMtnActv || this.attnMtnSett) {
      this.x += this.attentionOffsetX;
      this.y += this.attentionOffsetY;
      const settled = this.lmtVisMtn(frameMs);
      if (!visMtnActv && settled) {
        this.attnMtnSett = false;
      }
    } else {
      this.syncVisMtnToWr();
    }
    const spltOrbtActv = this.splitProgress() > 0 || this.splitArmed;
    const attnOrbtSpd = spltOrbtActv
      ? roamCfg.attnOrbtSpd
      : roamCfg.attnOrbitSpeed;
    this.attnOrbtAngl =
      (this.attnOrbtAngl +
        attnOrbtSpd * (frameMs / 1000) * this.attnPow) %
      TWO_PI;
  }

  // 5. Roamers keep their distance while wandering, yet preserve the possibility of encounter
  // This method was modified with the assistance of ChatGPT.
  buildMotion(tick, frame = null) {
    // Movement is generated at the configured sampling rate;
    // rendering interpolates between adjacent samples to reduce noise-computation cost.
    const stepMs = 1000 / roamCfg.motionCacheTps;
    const sampleNow = tick * stepMs - this.motionPhase;
    const elapsedSeconds = sampleNow * 0.001;
    const motionTime = elapsedSeconds * roamCfg.orbitSpeed;
    const bodyMotionTime = elapsedSeconds * roamCfg.bodyMtnSpd;
    const motionSeed = this.seed * 0.001;
    const arrowCount = roamCfg.arrowCount;

    // Callers may pass the previous frame container to reuse its arrays.
    if (!frame) {
      frame = {
        bodyWave: makeRingBuffer(roamCfg.bodyWaveSteps),
        orbitX: new Float64Array(arrowCount),
        orbitY: new Float64Array(arrowCount),
        orbitSize: new Float64Array(arrowCount),
      };
    }

    frame.outlinePulse =
      1 +
      (noise(motionSeed + 10, bodyMotionTime * 0.85) - 0.5) *
        2 *
        roamCfg.linePlsAmp;
    frame.bodyDriftX =
      (noise(motionSeed + 20, bodyMotionTime * 0.72) - 0.5) *
      2 *
      roamCfg.bodyDriftAmp;
    frame.bodyDriftY =
      (noise(motionSeed + 40, bodyMotionTime * 0.72) - 0.5) *
      2 *
      roamCfg.bodyDriftAmp;
    makeWavePoints(
      102,
      bodyMotionTime * roamCfg.bodyWaveSpeed,
      roamCfg.bodyWaveAmp,
      motionSeed + 60,
      roamCfg.bodyWaveSteps,
      frame.bodyWave
    );

    // A shared cache provides circular trigonometric values; each arrow adds radial breathing,
    // tangential drift, and scale variation.
    const orbitTrig = getCircleTrig(arrowCount);
    const radialSeed = motionSeed + 130;
    const tangentSeed = motionSeed + 260;
    const sizeSeed = motionSeed + 390;
    for (let i = 0; i < arrowCount; i++) {
      const cosA = orbitTrig.cosines[i];
      const sinA = orbitTrig.sines[i];
      const radialBreath =
        1 +
        (noise(
          radialSeed + cosA * 1.05,
          radialSeed * 0.731 + sinA * 1.05,
          motionTime
        ) -
          0.5) *
          2 *
          roamCfg.orbitBreathAmp;
      const tangentDrift =
        (noise(
          tangentSeed + cosA * 1.15,
          tangentSeed * 0.731 + sinA * 1.15,
          motionTime * 0.83
        ) -
          0.5) *
        2 *
        roamCfg.orbitDriftAmp;
      frame.orbitSize[i] =
        1 +
        (noise(
          sizeSeed + cosA * 1.1,
          sizeSeed * 0.731 + sinA * 1.1,
          motionTime * 1.07
        ) -
          0.5) *
          2 *
          roamCfg.orbitSizeAmp;
      frame.orbitX[i] = cosA * 91 * radialBreath - sinA * tangentDrift;
      frame.orbitY[i] = sinA * 86 * radialBreath + cosA * tangentDrift;
    }

    return frame;
  }

  getMotionState(now) {
    return advanceCache(
      this,
      now,
      roamCfg.motionCacheTps,
      this.motionPhase,
      "motionCache",
      "motionState",
      "buildMotion"
    );
  }

  // This method was modified with the assistance of ChatGPT.
  updtEncnAvdn(ctx) {
    // Apply avoidance while interaction remains available and division progress is visible;
    // the extra displacement serves division feedback.
    if (
      !this.canRcvIx(ctx.now) ||
      this.splitProgress() <= 0
    ) {
      return;
    }

    let pushX = 0;
    let pushY = 0;
    const ownRadius = collRad(this);
    // Apply avoidance consistently to both the lifeform and its interaction target.
    const applyAvoidance = (other) => {
      if (
        other === this ||
        other.type === this.type ||
        !isVisible(other)
      ) {
        return;
      }
      const position = worldPos(other);
      const targetDistance =
        ownRadius +
        infoRadius(other) * 0.6 +
        roamCfg.encnAvdPddng;
      let dx = this.x - position.x;
      let dy = this.y - position.y;
      let distance = sqrt(dx * dx + dy * dy);
      if (distance >= targetDistance) return;
      if (distance < 0.001) {
        const angle = ((this.seed || 0) - (other.seed || 0)) % TWO_PI;
        dx = cos(angle);
        dy = sin(angle);
        distance = 1;
      }
      const push =
        (targetDistance - distance) * roamCfg.encnAvdPow;
      pushX += (dx / distance) * push;
      pushY += (dy / distance) * push;
    };

    for (const other of creatures) applyAvoidance(other);
    for (const other of parasites) applyAvoidance(other);

    const pushDistance = sqrt(pushX * pushX + pushY * pushY);
    if (pushDistance <= 0.001) return;
    const maximumStep =
      settings.cruise.roamer.speed *
      roamCfg.encnAvdSpdScl *
      (ctx.movementDt ?? ctx.dt);
    const pushScale = min(1, maximumStep / pushDistance);
    const shiftX = pushX * pushScale;
    const shiftY = pushY * pushScale;
    this.x += shiftX;
    this.y += shiftY;
    this.x0 += shiftX;
    this.y0 += shiftY;
    if (this.splitBirth) {
      this.splitBirth.startX += shiftX;
      this.splitBirth.startY += shiftY;
      this.splitBirth.targetX += shiftX;
      this.splitBirth.targetY += shiftY;
    }
  }

  update(ctx) {
    // Birth or departure phases override ordinary roaming; other frames
    // apply movement, gaze response, and encounter avoidance in sequence.
    if (this.splitDied) {
      this.updateDeath(ctx);
      this.syncVisMtnToWr();
      return;
    }
    if (this.updtSpltBrth(ctx)) {
      this.updtEncnAvdn(ctx);
      ecoWorld.keep(this);
      this.syncVisMtnToWr();
      return;
    }
    cruiseUpdate(this, ctx, settings.cruise.roamer);
    driftUpdate(this, ctx, driftMode.roamer, wanderDrift);

    separateStep(
      this,
      this.type,
      roamCfg.minSep,
      roamCfg.sepStrength,
      true,
      settings.cruise.roamer.speed *
        roamCfg.sepSpdMul *
        (ctx.movementDt ?? ctx.dt)
    );
    this.updtEncnAvdn(ctx);
    ecoWorld.keep(this);
    if (
      !this.isAttnMoving() &&
      !this.attnMtnSett
    ) {
      this.syncVisMtnToWr();
    }
    this.rot = this.rot0 + (noise(this.seed + this.tt) - 0.5) * 0.1;
    this.updtArrwGlow(ctx);
  }

  // 6. Drawing an open state of mind-wandering
  draw(ctx) {
    push();
    drawingContext.globalAlpha *= this.deathAlpha;
    const birth = this.splitBirth;
    const birthElapsed = birth ? ctx.now - birth.startAt : Infinity;
    const liveBirthBody = Boolean(
      birth &&
        birth.birthDuration > 0 &&
        birthElapsed < birth.birthDuration
    );
    this.renderBodyOnly = true;
    try {
      if (liveBirthBody) {
        this.drawVector(ctx);
      } else {
        drawLifeCache(this, ctx, this.drawVector);
      }
    } finally {
      this.renderBodyOnly = false;
    }

    this.arrowsOnly = true;
    try {
      this.drawVector(ctx);
    } finally {
      this.arrowsOnly = false;
    }
    pop();
  }

  // Division progress appears along the body contour and follows the same drift offset,
  // expressing progress through the existing form.
  drawSpltProg(bodyPoints, bodyDriftX, bodyDriftY) {
    const progress = this.splitProgress();
    if (progress <= 0) return;
    const progressColor = roamCfg.spltProgClr;
    push();
    translate(bodyDriftX, bodyDriftY);
    setDynamicGlow(`rgba(${progressColor.join(", ")}, 0.34)`, 7);
    noFill();
    stroke(...progressColor, roamCfg.spltProgAlph);
    strokeWeight(roamCfg.spltProgWght);
    strokeCap(ROUND);
    drawWavRinPro(bodyPoints, progress);
    pop();
  }

  // This method was modified with the assistance of ChatGPT.
  drawVector(ctx) {
    const col = eco.lifeColor.Roamer;
    // Interpolate adjacent movement samples while rendering.
    const motionState = this.getMotionState(ctx.now);
    const currentMotion = motionState.current;
    const nextMotion = motionState.next;
    const motionMix = motionState.mix;
    const outlinePulse = lerp(
      currentMotion.outlinePulse,
      nextMotion.outlinePulse,
      motionMix
    );
    const bodyDriftX = lerp(
      currentMotion.bodyDriftX,
      nextMotion.bodyDriftX,
      motionMix
    );
    const bodyDriftY = lerp(
      currentMotion.bodyDriftY,
      nextMotion.bodyDriftY,
      motionMix
    );
    // Interpolate contour points element by element into the instance buffer.
    const currentWavePts = currentMotion.bodyWave.points;
    const nextBodyPoints = nextMotion.bodyWave.points;
    for (let i = 0; i < this.bodyPoints.length; i++) {
      this.bodyPoints[i][0] = lerp(
        currentWavePts[i][0],
        nextBodyPoints[i][0],
        motionMix
      );
      this.bodyPoints[i][1] = lerp(
        currentWavePts[i][1],
        nextBodyPoints[i][1],
        motionMix
      );
    }
    const bodyPoints = this.bodyPoints;

    push();
    translate(this.x, this.y);
    rotate(this.rot);
    scale(
      eco.drawScale *
        this.sz *
        scaleOf(this.type) *
        this.b *
        this.splitGrowMul *
        this.deathScale
    );

    // Body, division progress, and orbit arrows can be separated by rendering purpose,
    // allowing the offscreen cache to draw only the required layers.
    if (!this.arrowsOnly) {
      push();
      translate(bodyDriftX, bodyDriftY);
      setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.bodyGlowAlpha})`, roamCfg.bodyGlowBlur);

    noStroke();
    fill(col[0], col[1], col[2], 44);
    drawWaveRing(bodyPoints);

    setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.edgeGlowAlpha * outlinePulse})`, roamCfg.lineGlowBlur);
    noFill();
    stroke(255, 78 * outlinePulse);
    strokeWeight(4 * outlinePulse);
    drawWaveRing(bodyPoints);

    stroke(255, 106);
    strokeWeight(3);
    for (const [vx, vy] of Roamer.arrowDirs) {
      const angle = atan2(vy, vx);
      const wrappedAngle = (angle + TWO_PI) % TWO_PI;
      const contourIndex = round((wrappedAngle / TWO_PI) * bodyPoints.length) % bodyPoints.length;
      const contourPoint = bodyPoints[contourIndex];
      push();
      // Keep the marker circular, with its center following the corresponding body-contour undulation.
      translate(contourPoint[0] + vx * 12.5, contourPoint[1] + vy * 12.5);
      circle(0, 0, 9);
      pop();
      }
      pop();
    }

    if (!this.renderBodyOnly) {
      this.drawSpltProg(bodyPoints, bodyDriftX, bodyDriftY);
    }

    if (!this.renderBodyOnly) {
      noStroke();
    const arrowPath = Roamer.getArrowPath();
    drawingContext.beginPath();
    let hasInctDots = false;
    const attnOrbtCos = cos(this.attnOrbtAngl);
    const attnOrbtSin = sin(this.attnOrbtAngl);
    const wrldRotCos = cos(this.rot);
    const wrldRotSin = sin(this.rot);
    const worldScale =
      eco.drawScale *
      this.sz *
      scaleOf(this.type) *
      this.b *
      this.splitGrowMul *
      this.deathScale *
      prdtDomn.otherScale;

    // Store both local and world coordinates so division can
    // directly reuse the arrow position seen by participants.
    for (let i = 0; i < roamCfg.arrowCount; i++) {
      const orbitX = lerp(currentMotion.orbitX[i], nextMotion.orbitX[i], motionMix);
      const orbitY = lerp(currentMotion.orbitY[i], nextMotion.orbitY[i], motionMix);
      const x =
        orbitX * attnOrbtCos - orbitY * attnOrbtSin;
      const y =
        orbitX * attnOrbtSin + orbitY * attnOrbtCos;
      const sizeBreath = lerp(
        currentMotion.orbitSize[i],
        nextMotion.orbitSize[i],
        motionMix
      );
      const glow =
        this.arrowGlow[i] * this.splitCueBright(i, ctx.now);
      const dotAlpha = roamCfg.arrowDotAlpha * (1 - glow);
      const dotSize = roamCfg.arrowDotSize * lerp(1, 0.5, glow) * sizeBreath;
      const arrowAlpha = roamCfg.arrowLitAlpha * glow;
      const arrowScale =
        roamCfg.arrowScale *
        lerp(1, roamCfg.arrowLitScale, glow) *
        sizeBreath *
        this.spltFreeCueScl(i, ctx.now);

      const item = this.orbitItems[i];
      item.x = x;
      item.y = y;
      item.worldX =
        this.x +
        (x * wrldRotCos - y * wrldRotSin) * worldScale;
      item.worldY =
        this.y +
        (x * wrldRotSin + y * wrldRotCos) * worldScale;
      item.glow = glow;
      item.dotAlpha = dotAlpha;
      item.dotSize = dotSize;
      item.arrowAlpha = arrowAlpha;
      item.arrowScale = arrowScale;
      item.sizeBreath = sizeBreath;

      // Add inactive orbit points to one path in a batch, leaving illuminated arrows for subsequent
      // independent transformation and rendering.
      if (glow === 0) {
        const radius = dotSize * 0.5;
        drawingContext.moveTo(x + radius, y);
        drawingContext.arc(x, y, radius, 0, TWO_PI);
        hasInctDots = true;
      }
    }

    if (hasInctDots) {
      setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.dotGlowAlpha})`, roamCfg.dotGlowBlur);
      fill(col[0], col[1], col[2], roamCfg.arrowDotAlpha);
      drawingContext.fill();
    }

    this.drawSpltRppls(ctx.now);

    // When the browser supports path matrices, draw fully illuminated arrows in a batch;
    // otherwise fall back to per-arrow form interpolation.
    const batchBright =
      arrowPath &&
      typeof DOMMatrix !== "undefined" &&
      typeof Path2D.prototype.addPath === "function";
    const brghtArrwPath = batchBright ? new Path2D() : null;
    let hasBrghtArrws = false;

    for (const item of this.orbitItems) {
      if (item.glow === 0) continue;
      drawArrGloShp(item, arrowPath);

      if (item.glow === 1 && brghtArrwPath) {
        const angle = atan2(item.y, item.x);
        const cosAngle = cos(angle);
        const sinAngle = sin(angle);
        const scaleX = item.arrowScale * roamCfg.arrowScaleX;
        const scaleY = item.arrowScale;
        const matrix = item.arrowMatrix || (item.arrowMatrix = new DOMMatrix());
        matrix.a = cosAngle * scaleX;
        matrix.b = sinAngle * scaleX;
        matrix.c = -sinAngle * scaleY;
        matrix.d = cosAngle * scaleY;
        matrix.e = item.x;
        matrix.f = item.y;
        brghtArrwPath.addPath(arrowPath, matrix);
        hasBrghtArrws = true;
        continue;
      }

      this.drawMorphArrow(item, arrowPath, col);
    }

      if (hasBrghtArrws) {
        setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.arrowGlowAlpha})`, roamCfg.arrowGlowBlur);
        fill(...roamCfg.arrowGlowColor, roamCfg.arrowLitAlpha);
        drawingContext.fill(brghtArrwPath);
      }
    }

    pop();
  }

  drawMorphArrow(item, arrowPath, col) {
    // When an atlas is available, select cached sprites by brightness level;
    // otherwise retain a vector fallback for older browsers.
    const atlas = glowLayersOn ? Roamer.getSpriteAtlas() : null;
    if (atlas) {
      const level = clamp(round(item.glow * atlas.levels), 1, atlas.levels - 1);
      const sprite = atlas.sprites[level];
      if (sprite) {
        drawingContext.save();
        drawingContext.translate(item.x, item.y);
        drawingContext.rotate(atan2(item.y, item.x));
        drawingContext.scale(item.sizeBreath, item.sizeBreath);
        drawingContext.drawImage(
          sprite,
          -atlas.size * 0.5,
          -atlas.size * 0.5,
          atlas.size,
          atlas.size
        );
        drawingContext.restore();
        return;
      }
    }

    push();
    translate(item.x, item.y);
    setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.dotGlowAlpha * (1 - item.glow)})`, roamCfg.dotGlowBlur);
    fill(col[0], col[1], col[2], item.dotAlpha);
    circle(0, 0, item.dotSize);
    rotate(atan2(item.y, item.x));
    scale(item.arrowScale * roamCfg.arrowScaleX, item.arrowScale);
    setDynamicGlow(`rgba(255, 255, 255, ${roamCfg.arrowGlowAlpha * item.glow})`, roamCfg.arrowGlowBlur * item.glow);
    fill(...roamCfg.arrowGlowColor, item.arrowAlpha);
    if (arrowPath) drawingContext.fill(arrowPath);
    else this.drawArrowShape();
    pop();
  }

  // Arrow forms use local preset geometry, while direction, scale,
  // and highlighting are controlled by outer state.
  drawArrowShape() {
    beginShape();
    vertex(-6, -1.7);
    bezierVertex(-6.9, -1.7, -7.4, -1.05, -7.4, 0);
    bezierVertex(-7.4, 1.05, -6.9, 1.7, -6, 1.7);
    bezierVertex(-3.8, 1.7, -2, 1.7, -0.9, 1.7);
    bezierVertex(-0.3, 1.7, 0.12, 2.25, -0.06, 2.82);
    bezierVertex(-0.28, 3.5, -0.62, 4.2, -0.25, 4.82);
    bezierVertex(0.12, 5.42, 0.88, 5.5, 1.45, 5.02);
    bezierVertex(3.35, 3.45, 5.35, 1.9, 7.05, 0.75);
    bezierVertex(7.82, 0.23, 7.82, -0.23, 7.05, -0.75);
    bezierVertex(5.35, -1.9, 3.35, -3.45, 1.45, -5.02);
    bezierVertex(0.88, -5.5, 0.12, -5.42, -0.25, -4.82);
    bezierVertex(-0.62, -4.2, -0.28, -3.5, -0.06, -2.82);
    bezierVertex(0.12, -2.25, -0.3, -1.7, -0.9, -1.7);
    bezierVertex(-2, -1.7, -3.8, -1.7, -6, -1.7);
    endShape(CLOSE);
  }
}

// 7. Mind-wandering rejoins the shared world
// The object stores roaming and division state, while Behavior
// receives interaction updates through a common interface.
window.Roamer = Roamer;
window.RoamerBehavior = Object.freeze({
  createSessionState() {
    return crtRmrIxStt();
  },
  resetInteraction(context = {}) {
    const entity = context.entity;
    if (!entity) return;
    entity.attnOn = false;
    entity.attnDwellMs = 0;
    entity.splitArmed = false;
  },
  updateInteraction(context = {}) {
    const entity = context.entity;
    if (!entity) return false;
    entity.updtAttnFb(
      context.camera || null,
      Boolean(context.hasController),
      Number(context.frameMs) || 0,
      context.mode || "hold"
    );
    return true;
  },
  getViewState(entity) {
    return entity || null;
  },
});
