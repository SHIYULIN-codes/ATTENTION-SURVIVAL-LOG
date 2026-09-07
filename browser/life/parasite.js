// File Overview
// Implements Parasite, representing attention residue that persists after task switching.

// 1. Parasite represents attention residue after task switching (Leroy, 2009).
// It attaches to attention paths and nearby lifeforms, showing
// how unfinished thoughts continue to occupy attentional space.
// Here, unfinished thoughts take on an attached form,
// continuing to leave an influence as their host moves.

// 2. Hosts and branches
class Parasite {
  static glowAlpha = 0.314;
  static glowBlur = 4;
  static coreGlowAlpha = 0.26;
  static coreGlowBlur = 4;
  static actvCoreAlph = 0.85;
  static whiteAlpha = 0.9;
  static markAlpha = 0.98;
  static tailChance = 0.95;
  static minGap = 20;
  static spacingPasses = 4;
  static spreadChance = 0.8;
  static residueColor = [248, 228, 75];
  static actvCoreClr = [158, 211, 43];
  static idleCoreColor = [205, 123, 145];
  static markColor = [205, 123, 145];
  static cacheScale = 2;
  static cachePad = 18;

  static attnAlpForSee(seed) {
    const rng = mulberry32(
      (floor(seed || 0) ^ 0x6d2b79f5) >>> 0
    );
    return srng(
      rng,
      parasiteCfg.attnAlphMin,
      parasiteCfg.attnAlpMaxBas
    );
  }

  // Each instance stores its host reference, local offset, residue
  // intensity, and visual cache; WorldSystem manages host lifespan.
  constructor(host, ox, oy, rot, s, seed) {
    this.type = eco.lifeType.parasite;
    this.host = host;
    this.ox0 = ox;
    this.oy0 = oy;
    this.ox = ox;
    this.oy = oy;
    this.rot0 = rot;
    this.rot = rot;
    this.rotCos = Math.cos(rot);
    this.rotSin = Math.sin(rot);
    this.s = s;
    this.seed = seed;
    this.tw = 0;
    this.attached = true;
    this.x = 0;
    this.y = 0;
    this.birthStartAt = -Infinity;
    this.birthDuration = 0;
    this.birthProgress = 1;
    this.migrating = false;
    this.migrationSpeed = 0;
    this.attnAlphBase = Parasite.attnAlpForSee(seed);
    this.attentionAlpha = this.attnAlphBase;
    this.attnFcsd = false;
    this.attnLogSeq = 0;
    this.attnLogFocusMs = 0;
    this.attnLogDone = false;
    this.attnLogAttc = false;
    this.coreRadius = 14;
    this.coreGap = 36;
    this.cores = [-this.coreGap, 0, this.coreGap].map((x, index) => ({
      x,
      y: 0,
      fillColor:
        index < 2 ? Parasite.actvCoreClr : Parasite.idleCoreColor,
      fillAlpha: 255,
      checked: index < 2,
    }));

    this.bscRsdBrnc = [];
    this.branchAnims = [];
    this.rsdBrnc = this.createResidue();
    this.residueMarks = this.makeRsdDots();
    this.staticCache = null;
  }

  // This method was modified with the assistance of ChatGPT.
  createResidue() {
    // Separate random streams independently control the body, tail, and growth.
    const rng = mulberry32(this.seed);
    const tailRng = mulberry32(this.seed + 1000);
    const growthRng = mulberry32(this.seed + 2000);
    this.hasFadeTail =
      mulberry32(this.seed + 1500)() < Parasite.tailChance;
    const rsdBrnc = [];
    const branchData = [];
    const branchCount = 8;
    this.bscRsdBrnc.length = 0;

    for (let coreIndex = 0; coreIndex < this.cores.length; coreIndex++) {
      const core = this.cores[coreIndex];

      for (let branchIndex = 0; branchIndex < branchCount; branchIndex++) {
        const angle =
          (TWO_PI * branchIndex) / branchCount + srng(rng, -0.4, 0.4);
        const tip = {
          x: core.x + Math.cos(angle) * this.coreRadius,
          y: core.y + Math.sin(angle) * this.coreRadius,
          angle,
        };
        const branch = [];
        let branchLength = 0;
        const segmentCount = Math.floor(srng(rng, 4, 7));

        for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
          const length = srng(rng, 5, 21);
          this.addSegment(branch, tip, length);
          branchLength += length;
          tip.angle += srng(rng, -0.5, 0.5);
        }

        rsdBrnc.push(branch);
        this.bscRsdBrnc.push(branch);
        branchData.push({
          coreIndex,
          branch,
          endX: tip.x,
          endY: tip.y,
          length: branchLength,
        });

        if (coreIndex === 0 && branchIndex === 4 && this.hasFadeTail) {
          rsdBrnc.push(...this.createFadeTail(tip, tailRng));
        }
      }
    }

    const upperBranch = this.findLongBranch(branchData, 0, true);
    const lowerBranch = this.findLongBranch(branchData, 1, false);

    if (upperBranch) {
      rsdBrnc.push(...this.growFadeBranch(upperBranch, growthRng, true));
    }
    if (lowerBranch) {
      rsdBrnc.push(...this.growFadeBranch(lowerBranch, growthRng, false));
    }

    return rsdBrnc;
  }

  // This method was modified with the assistance of ChatGPT.
  growBscBrnc(
    growthIndex,
    animate = true,
    now = typeof millis === "function" ? millis() : 0
  ) {
    // A shared growth sequence number generates a stable random sequence for each branch.
    const minimum = capture.scrcBrnchMin;
    const maximum = capture.scrcBrnchMax;
    const animBrnc = [];
    let addedSegments = 0;

    // Extend existing primary branches first so growth appears
    // as an expansion of the established parasitic structure.
    for (
      let branchIndex = 0;
      branchIndex < this.bscRsdBrnc.length;
      branchIndex++
    ) {
      const branch = this.bscRsdBrnc[branchIndex];
      const lastSegment = branch[branch.length - 1];
      if (!lastSegment) continue;
      const rng = mulberry32(
        (floor(this.seed || 0) ^
          Math.imul(growthIndex + 1, 0x9e3779b1) ^
          Math.imul(branchIndex + 1, 0x85ebca6b)) >>>
          0
      );
      const extrSegN =
        minimum + floor(rng() * (maximum - minimum + 1));
      // If the previous cycle is still unfolding, new growth continues from its planned endpoint.
      const intendedEndX = lastSegment.growthTargetX ?? lastSegment[2];
      const intendedEndY = lastSegment.growthTargetY ?? lastSegment[3];
      const tip = {
        x: intendedEndX,
        y: intendedEndY,
        angle: Math.atan2(
          intendedEndY - lastSegment[1],
          intendedEndX - lastSegment[0]
        ),
      };
      const animSegs = [];

      for (let index = 0; index < extrSegN; index++) {
        const startX = tip.x;
        const startY = tip.y;
        this.addSegment(branch, tip, srng(rng, 5, 21));
        const segment = branch[branch.length - 1];
        segment.growthTargetX = segment[2];
        segment.growthTargetY = segment[3];
        // Animation mode stores the true endpoint, then collapses the segment to its start so the update
        // function can unfold it incrementally.
        if (animate) {
          animSegs.push({
            segment,
            startX,
            startY,
            endX: segment[2],
            endY: segment[3],
          });
          segment[2] = startX;
          segment[3] = startY;
        }
        tip.angle += srng(rng, -0.5, 0.5);
        addedSegments++;
      }
      if (animSegs.length) {
        animBrnc.push(animSegs);
      }
    }

    // Each cycle then adds a limited number of new branches from different cores.
    for (
      let branchOffset = 0;
      branchOffset < capture.brncAddPerGrw;
      branchOffset++
    ) {
      const branchIndex = this.bscRsdBrnc.length;
      const rng = mulberry32(
        (floor(this.seed || 0) ^
          Math.imul(growthIndex + 1, 0xc2b2ae35) ^
          Math.imul(branchIndex + 1, 0x27d4eb2d)) >>>
          0
      );
      const coreIndex =
        (growthIndex + branchOffset) % this.cores.length;
      const core = this.cores[coreIndex];
      const angle =
        growthIndex * 2.3999632297 +
        (TWO_PI * coreIndex) / this.cores.length +
        srng(rng, -0.28, 0.28);
      const tip = {
        x: core.x + Math.cos(angle) * this.coreRadius,
        y: core.y + Math.sin(angle) * this.coreRadius,
        angle,
      };
      const branch = [];
      const animSegs = [];
      // New branch length is determined by the stable random stream for this cycle.
      const segmentCount =
        minimum + floor(rng() * (maximum - minimum + 1));

      for (let index = 0; index < segmentCount; index++) {
        const startX = tip.x;
        const startY = tip.y;
        this.addSegment(branch, tip, srng(rng, 5, 21));
        const segment = branch[branch.length - 1];
        segment.growthTargetX = segment[2];
        segment.growthTargetY = segment[3];
        if (animate) {
          animSegs.push({
            segment,
            startX,
            startY,
            endX: segment[2],
            endY: segment[3],
          });
          segment[2] = startX;
          segment[3] = startY;
        }
        tip.angle += srng(rng, -0.5, 0.5);
        addedSegments++;
      }
      this.rsdBrnc.push(branch);
      this.bscRsdBrnc.push(branch);
      if (animSegs.length) {
        animBrnc.push(animSegs);
      }
    }

    // Growth initiated at the same moment is merged into a single timeline.
    if (animate && animBrnc.length) {
      const simultaneous = this.branchAnims.find(
        (animation) => abs(animation.startAt - now) < 0.001
      );
      if (simultaneous) {
        for (let index = 0; index < animBrnc.length; index++) {
          if (simultaneous.branches[index]) {
            simultaneous.branches[index].push(...animBrnc[index]);
          } else {
            simultaneous.branches.push(animBrnc[index]);
          }
        }
      } else {
        this.branchAnims.push({
          startAt: now,
          duration: capture.scrcBrnGroMs,
          branches: animBrnc,
        });
      }
      this.freeSttcCch();
    }
    return addedSegments;
  }

  // Release the static canvas when the form changes and defer rebuilding it.
  freeSttcCch() {
    if (this.staticCache?.canvas) {
      this.staticCache.canvas.width = 0;
      this.staticCache.canvas.height = 0;
    }
    this.staticCache = null;
  }

  // All branch animations advance on the same clock; completed items
  // are removed together and trigger a single static-cache rebuild.
  updtBrnchGrwth(now) {
    if (!this.branchAnims.length) return;
    let completed = false;

    for (const animation of this.branchAnims) {
      const progress = clamp(
        (now - animation.startAt) / animation.duration,
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      for (const branch of animation.branches) {
        const revlSegs = eased * branch.length;
        for (let index = 0; index < branch.length; index++) {
          const item = branch[index];
          const segProg = clamp(revlSegs - index, 0, 1);
          item.segment[2] = lerp(item.startX, item.endX, segProg);
          item.segment[3] = lerp(item.startY, item.endY, segProg);
        }
      }
      if (progress >= 1) completed = true;
    }

    if (!completed) return;
    this.branchAnims = this.branchAnims.filter(
      (animation) => now - animation.startAt < animation.duration
    );
    if (this.branchAnims.length) return;
    this.residueMarks = this.makeRsdDots();
    this.prepStaticCache();
  }

  // This method was modified with the assistance of ChatGPT.
  createFadeTail(tip, rng) {
    // The main tail extends leftward, forming the trailing contour of attention residue.
    const tailBranches = [];
    const tail = [];
    const tailPoints = [];
    let bendDir = rng() < 0.5 ? -1 : 1;
    let bendStrength = srng(rng, 0.08, 0.22);

    for (let i = 0; i < 12; i++) {
      const turn = this.angleDelta(PI, tip.angle);
      if (rng() < 0.3) {
        bendDir *= -1;
        bendStrength = srng(rng, 0.08, 0.28);
      }

      tip.angle += turn * 0.12 + bendDir * bendStrength + srng(rng, -0.28, 0.28);
      this.addSegment(tail, tip, srng(rng, 5, 16));
      tailPoints.push({ x: tip.x, y: tip.y, angle: tip.angle });
    }

    tailBranches.push(tail);
    let pointIndex = Math.floor(srng(rng, 1, 3));

    // First-level side branches are spaced apart to preserve the main branch contour.
    while (pointIndex < tailPoints.length - 1) {
      const anchor = tailPoints[pointIndex];
      const side = rng() < 0.5 ? -1 : 1;
      const offshootTip = {
        x: anchor.x,
        y: anchor.y,
        angle: anchor.angle + side * srng(rng, 0.45, 1.35),
      };
      const offshoot = [];
      const offshootCount = Math.floor(srng(rng, 1, 4));

      for (let i = 0; i < offshootCount; i++) {
        this.addSegment(offshoot, offshootTip, srng(rng, 2, 21));
        offshootTip.angle += srng(rng, -0.55, 0.55);
      }

      tailBranches.push(offshoot);
      pointIndex += Math.floor(srng(rng, 4, 7));
    }

    // The final section increases the probability and length of fine branches,
    // gradually fragmenting visual weight toward the direction of departure.
    for (let i = Math.floor(tailPoints.length * 0.65); i < tailPoints.length - 1; i++) {
      const progress = i / (tailPoints.length - 1);
      if (rng() > 0.1 + progress * 0.25) continue;

      const anchor = tailPoints[i];
      const branchAmount = 1;

      for (let j = 0; j < branchAmount; j++) {
        const side = rng() < 0.5 ? -1 : 1;
        const offshootTip = {
          x: anchor.x,
          y: anchor.y,
          angle: anchor.angle + side * srng(rng, 0.5, 1.3),
        };
        const offshoot = [];
        const offshootCount = Math.floor(srng(rng, 1, 2 + progress * 1.5));

        for (let k = 0; k < offshootCount; k++) {
          offshootTip.angle += srng(rng, -0.45, 0.45);
          this.addSegment(offshoot, offshootTip, srng(rng, 2, 11 + progress * 9));
        }
        tailBranches.push(offshoot);
      }
    }

    return tailBranches;
  }

  // Filter branches by core and endpoint orientation, constrain
  // horizontal reach first, then select the longest candidate.
  findLongBranch(branchData, coreIndex, isUpper) {
    const core = this.cores[coreIndex];
    let candidates = branchData.filter((item) => {
      const verticalMatch = isUpper ? item.endY < core.y - 5 : item.endY > core.y + 5;
      return item.coreIndex === coreIndex && verticalMatch && item.endX <= core.x + 8;
    });

    if (!candidates.length) {
      candidates = branchData.filter((item) => {
        const verticalMatch = isUpper ? item.endY < core.y : item.endY > core.y;
        return item.coreIndex === coreIndex && verticalMatch;
      });
    }
    if (!candidates.length) return null;

    return candidates.reduce((longest, item) =>
      item.length > longest.length ? item : longest
    );
  }

  // This method was modified with the assistance of ChatGPT.
  growFadeBranch(branchData, rng, isUpper) {
    // Residual branches extend from the ends of existing branches, retaining their original direction.
    const grownBranches = [];
    const stem = [];
    const stemPoints = [];
    // Upper branches are shortened to preserve balance and a legible contour,
    // while lower branches retain their full extension to convey attachment.
    const lengthScale = isUpper ? 0.38 : 1;
    const lastSegment = branchData.branch[branchData.branch.length - 1];
    const stemTip = {
      x: branchData.endX,
      y: branchData.endY,
      angle: Math.atan2(lastSegment[3] - lastSegment[1], lastSegment[2] - lastSegment[0]),
    };
    const targetAngle = isUpper ? PI + srng(rng, 0.25, 0.58) : PI - srng(rng, 0.25, 0.58);
    let bend = srng(rng, -0.1, 0.1);
    const segmentCount = Math.floor(srng(rng, 6, 9));

    for (let i = 0; i < segmentCount; i++) {
      if (rng() < 0.28) bend = srng(rng, -0.16, 0.16);
      stemTip.angle +=
        this.angleDelta(targetAngle, stemTip.angle) * 0.3 +
        bend +
        srng(rng, -0.17, 0.17);
      this.addSegment(stem, stemTip, srng(rng, 7, 14) * lengthScale);
      stemPoints.push({ x: stemTip.x, y: stemTip.y, angle: stemTip.angle });
    }

    grownBranches.push(stem);
    const offshootAmount = Math.floor(srng(rng, 1, 3));
    const offsIndcs = [];
    let attempts = 0;

    // Branch anchors remain at least two nodes apart, with
    // bounded attempts so even extreme random sequences terminate.
    while (offsIndcs.length < offshootAmount && attempts < 30) {
      attempts++;
      const index = Math.floor(srng(rng, 1, stemPoints.length - 1));
      if (!offsIndcs.some((savedIndex) => Math.abs(savedIndex - index) < 2)) {
        offsIndcs.push(index);
      }
    }

    offsIndcs.sort((a, b) => a - b);
    for (const index of offsIndcs) {
      const anchor = stemPoints[index];
      const side = rng() < 0.5 ? -1 : 1;
      const offshootTip = {
        x: anchor.x,
        y: anchor.y,
        angle: anchor.angle + side * srng(rng, 0.5, 1.05),
      };
      const offshoot = [];
      const offshootPoints = [];
      const offshootCount = Math.floor(srng(rng, 1, 4));
      let offshootBend = srng(rng, -0.18, 0.18);

      for (let i = 0; i < offshootCount; i++) {
        if (rng() < 0.3) offshootBend = srng(rng, -0.25, 0.25);
        offshootTip.angle += offshootBend + srng(rng, -0.22, 0.22);
        this.addSegment(offshoot, offshootTip, srng(rng, 5, 12) * lengthScale);
        offshootPoints.push({ x: offshootTip.x, y: offshootTip.y, angle: offshootTip.angle });
      }

      grownBranches.push(offshoot);
      // Each side branch receives a group of fine branches, preserving
      // both organic complexity and the visibility of core state.
      const twigAmount = 1;

      for (let i = 0; i < twigAmount; i++) {
        const sourceIndex = Math.floor(
          srng(rng, Math.max(0, offshootPoints.length - 3), offshootPoints.length)
        );
        const source = offshootPoints[sourceIndex];
        const twigSide = rng() < 0.5 ? -1 : 1;
        const twigTip = {
          x: source.x,
          y: source.y,
          angle: source.angle + twigSide * srng(rng, 0.42, 0.9),
        };
        const twig = [];
        const twigCount = Math.floor(srng(rng, 1, 4));

        for (let j = 0; j < twigCount; j++) {
          twigTip.angle += srng(rng, -0.28, 0.28);
          this.addSegment(twig, twigTip, srng(rng, 3, 8) * lengthScale);
        }
        grownBranches.push(twig);
      }
    }

    return grownBranches;
  }

  // Speckles are generated from the seed and branch geometry,
  // anchoring attention residue to a specific contour.
  makeRsdDots() {
    const rng = mulberry32(this.seed + 3000);
    const residueMarks = [];

    for (const branch of this.rsdBrnc) {
      for (const segment of branch) {
        if (rng() > 0.16) continue;
        const midX = (segment[0] + segment[2]) * 0.5;
        const midY = (segment[1] + segment[3]) * 0.5;
        if (midY < -8 && rng() > 0.22) continue;
        const clusterCount = Math.floor(srng(rng, 1, 4));

        for (let i = 0; i < clusterCount; i++) {
          const pointCount = Math.floor(srng(rng, 5, 9));
          residueMarks.push({
            x: midX + srng(rng, -100, 60),
            y: midY + srng(rng, -150, 100),
            radius: srng(rng, 1.8, 7),
            stretchX: srng(rng, 0.65, 1.45),
            stretchY: srng(rng, 0.55, 1.25),
            rotation: srng(rng, 0, TWO_PI),
            alpha: srng(rng, 68, 130),
            pointCount,
            radii: Array.from({ length: pointCount }, () => srng(rng, 0.62, 1.25)),
          });
        }
      }
    }

    return residueMarks;
  }

  // Append a local segment from the current branch tip in the
  // established direction and return the new growth endpoint.
  addSegment(branch, tip, length) {
    const nextX = tip.x + Math.cos(tip.angle) * length;
    const nextY = tip.y + Math.sin(tip.angle) * length;
    branch.push([tip.x, tip.y, nextX, nextY]);
    tip.x = nextX;
    tip.y = nextY;
  }

  angleDelta(target, current) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

// 3. Transforming from a BasicCell and finding a host for attachment
// A BasicCell preserves its origin when transformation begins,
// then gradually assumes the Parasite's form.
  startDiffBirth(sourceCell, now, duration) {
    this.attached = false;
    this.x = sourceCell.x;
    this.y = sourceCell.y;
    this.birthStartAt = now;
    this.birthDuration = max(1, duration);
    this.birthProgress = 0;
    this.migrating = false;
    this.migrationSpeed = max(0.01, sourceCell.followSpeed || 0.12);
  }

// The host connection passes attention that has not yet dissipated to another lifeform to carry.
  attachPos() {
    return {
      x:
        this.host.x +
        this.ox0 * this.rotCos -
        this.oy0 * this.rotSin,
      y:
        this.host.y +
        this.ox0 * this.rotSin +
        this.oy0 * this.rotCos,
    };
  }

  // Synchronize host pose, branch growth, and the birth fade
  // so the Parasite reads as a relationship of attachment.
  // This method was modified with the assistance of ChatGPT.
  update(ctx) {
    this.updtBrnchGrwth(ctx.now);
    const tt = (ctx.movementT ?? ctx.t) * parasiteCfg.jitterSpeed;
    const n1 = noise(this.seed + tt);
    const n2 = noise(this.seed + 555 + tt);

    this.tw =
      (n1 - 0.5) * parasiteCfg.jitterRotation +
      sin(tt + this.seed) * parasiteCfg.jitterTurnWave;
    this.rot = this.rot0 + this.tw;
    this.rotCos = Math.cos(this.rot);
    this.rotSin = Math.sin(this.rot);

    if (Number.isFinite(this.birthStartAt)) {
      const progress = clamp(
        (ctx.now - this.birthStartAt) / this.birthDuration,
        0,
        1
      );
      this.birthProgress =
        cubicSmoothstep(progress);
      if (progress >= 1) {
        this.birthStartAt = -Infinity;
        this.migrating = true;
      }
    }

    if (!this.attached) {
      if (this.migrating) {
        // Residue created by transformation first migrates from the original lifeform's position,
        // then switches to host-local coordinates to continue following the host.
        const target = this.attachPos();
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = sqrt(dx * dx + dy * dy);
        const step =
          this.migrationSpeed * max(0.1, ctx.dt || 1);
        if (distance <= step || distance < 0.5) {
          this.x = target.x;
          this.y = target.y;
          this.attached = true;
          this.migrating = false;
          this.ox = this.ox0;
          this.oy = this.oy0;
          if (!this.attnLogAttc) {
            this.attnLogAttc = true;
            rcrdSurvNote(
              "Parasite",
              "general",
              this,
              ctx.now,
              {
                sequence: 1,
                priority: 55,
                dedupeMs: 60000,
                ddpByCond: true,
              }
            );
          }
        } else {
          this.x += (dx / distance) * step;
          this.y += (dy / distance) * step;
        }
      }
      return;
    }

    this.ox = this.ox0 + (n1 - 0.5) * parasiteCfg.jitterPosition;
    this.oy = this.oy0 + (n2 - 0.5) * parasiteCfg.jitterPosition;
  }

// 4. Attention residue resurfaces
  // While gazed at, opacity increases over attnShowMs; after gaze leaves,
  // it returns to its baseline over attnRestoreMs.
  updtAttn(focused, frameMs, options = {}) {
    const config = parasiteCfg;
    const focusStarted = focused && !this.attnFcsd;
    const alphaRange = config.attnAlphMax - this.attnAlphBase;
    const duration = focused
      ? config.attnShowMs
      : config.attnRestoreMs;
    const direction = focused ? 1 : -1;
    this.attnFcsd = focused;
    // Start a new logging sequence each time gaze re-enters.
    if (focusStarted) {
      this.attnLogSeq++;
      this.attnLogFocusMs = 0;
      this.attnLogDone = false;
    }
    if (focused) {
      const prevFocusMs = this.attnLogFocusMs;
      this.attnLogFocusMs = min(
        capture.logFocusMs,
        prevFocusMs + max(0, frameMs)
      );
      // Log sustained gaze once it reaches the threshold; a brief glance changes only the visual reveal.
      if (
        !this.attnLogDone &&
        prevFocusMs < capture.logFocusMs &&
        this.attnLogFocusMs >= capture.logFocusMs
      ) {
        this.attnLogDone = true;
        const focusSession =
          options.session ||
          sessions.find(
            (session) => session.enabled && session.parasites.has(this)
          ) ||
          activeSession;
        rcrdSurvNote(
          "Parasite",
          "simple",
          this,
          lifeLogNow(),
          {
            sequence: this.attnLogSeq,
            sessionId: focusSession?.id,
            participantCount: ixUserCount,
            priority: 50,
            dedupeMs: 12000,
            ddpByCond: true,
          }
        );
      }
    } else {
      this.attnLogFocusMs = 0;
      this.attnLogDone = false;
    }
    // Reveal and return use different durations, leaving a baseline trace after gaze departs.
    this.attentionAlpha = clamp(
      this.attentionAlpha +
        direction * alphaRange * (frameMs / duration),
      this.attnAlphBase,
      config.attnAlphMax
    );
  }

  // Test hits against cores, branches, and residue points in screen
  // space so rotated and scaled forms remain consistently selectable.
  // This method was modified with the assistance of ChatGPT.
  hitsResidue(gazeX, gazeY, screenPadding) {
    if (!this.host) return false;
    const position = worldPos(this);
    const scale =
      eco.drawScale *
      this.s *
      this.host.sz *
      scaleOf(eco.lifeType.parasite) *
      (1 + hunt.paraScaleUp) *
      prdtDomn.parasiteScale;
    if (!Number.isFinite(scale) || scale <= 0) return false;

    // First inverse-transform the gaze point into the Parasite's local coordinates.
    const dx = gazeX - position.x;
    const dy = gazeY - position.y;
    const localX = (dx * this.rotCos + dy * this.rotSin) / scale;
    const localY = (-dx * this.rotSin + dy * this.rotCos) / scale;
    const localPadding = screenPadding / scale;
    const paddingSquared = localPadding * localPadding;

    // Distance to the nearest point on each segment joins
    // slender residual branches into a continuous hit region.
    for (const branch of this.rsdBrnc) {
      for (const segment of branch) {
        const segmentX = segment[2] - segment[0];
        const segmentY = segment[3] - segment[1];
        const lengthSquared =
          segmentX * segmentX + segmentY * segmentY;
        const projection = lengthSquared > 0
          ? clamp(
              ((localX - segment[0]) * segmentX +
                (localY - segment[1]) * segmentY) /
                lengthSquared,
              0,
              1
            )
          : 0;
        const nearestX = segment[0] + segmentX * projection;
        const nearestY = segment[1] + segmentY * projection;
        if (
          dist2(localX, localY, nearestX, nearestY) <=
          paddingSquared
        ) {
          return true;
        }
      }
    }
    return false;
  }

// 5. Preserving the complex contour formed by branches, speckles, and cores
  getSttcBnds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const include = (x, y, radius = 0) => {
      minX = Math.min(minX, x - radius);
      minY = Math.min(minY, y - radius);
      maxX = Math.max(maxX, x + radius);
      maxY = Math.max(maxY, y + radius);
    };

    // Cache bounds cover branches, residue speckles, and cores together.
    for (const branch of this.rsdBrnc) {
      for (const segment of branch) {
        include(segment[0], segment[1], 2.1);
        include(segment[2], segment[3], 2.1);
      }
    }

    for (const mark of this.residueMarks) {
      const radiusScale = Math.max(...mark.radii, 1);
      const radius =
        mark.radius * radiusScale * Math.max(mark.stretchX, mark.stretchY);
      include(mark.x, mark.y, radius);
    }

    for (const core of this.cores) include(core.x, core.y, this.coreRadius + 2.7);

    // If static bounds lack valid values, fall back to the
    // two-core extent when calculating cache dimensions.
    if (!Number.isFinite(minX)) {
      minX = -this.coreGap - this.coreRadius;
      maxX = this.coreGap + this.coreRadius;
      minY = -this.coreRadius;
      maxY = this.coreRadius;
    }

    const padding = Parasite.cachePad;
    minX = Math.floor(minX - padding);
    minY = Math.floor(minY - padding);
    maxX = Math.ceil(maxX + padding);
    maxY = Math.ceil(maxY + padding);
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }

  // This method was modified with the assistance of ChatGPT.
  prepStaticCache() {
    if (this.staticCache) return this.staticCache;
    // Continue frame-by-frame rendering while branches grow.
    if (this.branchAnims.length) return null;
    if (typeof document === "undefined") return null;

    // Cache dimensions come from actual branch and core bounds; extra padding serves the glow,
    // while runtime hit testing continues to use actual geometry.
    const bounds = this.getSttcBnds();
    const cacheScale = Parasite.cacheScale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(bounds.width * cacheScale));
    canvas.height = Math.max(1, Math.ceil(bounds.height * cacheScale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Use lifeform-local coordinates directly in the offscreen canvas so the render stage can place it
    // back into the host coordinate system in one operation.
    ctx.setTransform(
      cacheScale,
      0,
      0,
      cacheScale,
      -bounds.minX * cacheScale,
      -bounds.minY * cacheScale
    );
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = `rgba(255, 255, 255, ${Parasite.glowAlpha})`;
    ctx.shadowBlur = Parasite.glowBlur * cacheScale;

    // Residual texture and branches are merged into the static layer,
    // while the core activation mark remains dynamically rendered.
    for (const mark of this.residueMarks) {
      const cosRotation = Math.cos(mark.rotation);
      const sinRotation = Math.sin(mark.rotation);
      ctx.fillStyle = `rgba(${Parasite.residueColor.join(",")}, ${mark.alpha / 255})`;
      ctx.beginPath();
      for (let i = 0; i < mark.pointCount; i++) {
        const angle = (TWO_PI * i) / mark.pointCount;
        const radius = mark.radius * mark.radii[i];
        const localX = Math.cos(angle) * radius * mark.stretchX;
        const localY = Math.sin(angle) * radius * mark.stretchY;
        const x = mark.x + localX * cosRotation - localY * sinRotation;
        const y = mark.y + localX * sinRotation + localY * cosRotation;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(${Parasite.residueColor.join(",")}, ${137 / 255})`;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    for (const branch of this.rsdBrnc) {
      for (const segment of branch) {
        ctx.moveTo(segment[0], segment[1]);
        ctx.lineTo(segment[2], segment[3]);
      }
    }
    ctx.stroke();

    // Cores use a separate set of glow parameters, while
    // the cache preserves body and core layers together.
    ctx.shadowColor = `rgba(255, 255, 255, ${Parasite.coreGlowAlpha})`;
    ctx.shadowBlur = Parasite.coreGlowBlur * cacheScale;
    for (const core of this.cores) {
      ctx.save();
      ctx.globalAlpha = core.checked
        ? Parasite.actvCoreAlph
        : Parasite.whiteAlpha;
      ctx.fillStyle = `rgba(${core.fillColor.join(",")}, ${core.fillAlpha / 255})`;
      ctx.beginPath();
      ctx.arc(core.x, core.y, this.coreRadius, 0, TWO_PI);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = `rgba(${Parasite.residueColor.join(",")}, ${145 / 255})`;
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      ctx.arc(core.x, core.y, this.coreRadius, 0, TWO_PI);
      ctx.stroke();
    }

    // Store the canvas and local bounds; host position, opacity,
    // and overload compositing remain determined at render time.
    this.staticCache = { ...bounds, canvas };
    return this.staticCache;
  }

  // Render the Parasite according to its static cache, dynamic growth, and fade state;
  // stable branches come from the static cache.
  // This method was modified with the assistance of ChatGPT.
  draw() {
    if (!this.host) return;

    push();
    const baseAlpha =
      drawingContext.globalAlpha * clamp(this.birthProgress, 0, 1);
    const amplAttnAlph =
      this.attentionAlpha *
      (1 + hunt.parsAlphBst) *
      prdtDomn.parasiteAlpha;
    // Baseline opacity is capped for normal compositing; any excess is rendered separately with lighter
    // blending to express attention overload.
    const visibleAlpha = min(1, amplAttnAlph);
    const overdriveAlpha = max(0, amplAttnAlph - 1);
    const attnBaseAlph = baseAlpha * visibleAlpha;
    // Attached state uses the host coordinate system, while migration state uses the Parasite's own
    // coordinates, keeping the two ownership boundaries distinct.
    if (this.attached) {
      translate(this.host.x, this.host.y);
      rotate(this.rot);
      translate(this.ox, this.oy);
    } else {
      translate(this.x, this.y);
      rotate(this.rot);
    }
    scale(
      eco.drawScale *
        this.s *
        this.host.sz *
        scaleOf(eco.lifeType.parasite) *
        (1 + hunt.paraScaleUp) *
        lerp(0.5, 1, this.birthProgress)
    );
    // Static branches prefer the cache, while the check mark and
    // overload layer remain dynamic to reflect the current interaction.
    const cache = this.staticCache;
    if (cache) {
      drawingContext.save();
      applyGlowStyle(lifeGlow.none);
      drawingContext.globalAlpha = attnBaseAlph;
      drawingContext.drawImage(
        cache.canvas,
        cache.minX,
        cache.minY,
        cache.width,
        cache.height
      );
      if (overdriveAlpha > 0) {
        drawingContext.globalCompositeOperation = "lighter";
        drawingContext.globalAlpha = baseAlpha * overdriveAlpha;
        drawingContext.drawImage(
          cache.canvas,
          cache.minX,
          cache.minY,
          cache.width,
          cache.height
        );
      }
      drawingContext.restore();

      this.drawCheckMarks(attnBaseAlph);
      if (overdriveAlpha > 0) {
        drawingContext.save();
        drawingContext.globalCompositeOperation = "lighter";
        this.drawCheckMarks(baseAlpha * overdriveAlpha);
        drawingContext.restore();
      }
    } else {
// Render directly along vector paths before the cache is
// ready so newly formed branches are visible immediately.
      this.drawVector(attnBaseAlph);
      if (overdriveAlpha > 0) {
        drawingContext.save();
        drawingContext.globalCompositeOperation = "lighter";
        this.drawVector(baseAlpha * overdriveAlpha);
        drawingContext.restore();
      }
    }

    pop();
  }

  // The vector fallback renders residue, branches, and cores in layers,
  // preserving the same compositing order as the static cache.
  drawVector(baseAlpha) {
    drawingContext.globalAlpha = baseAlpha;
    setDynamicGlow(`rgba(255, 255, 255, ${Parasite.glowAlpha})`, Parasite.glowBlur);
    this.drawRsdDots();
    this.drawRsdArms();
    this.drawCores(baseAlpha);
  }

  drawCheckMarks(baseAlpha) {
    setDynamicGlow(`rgba(255, 255, 255, ${Parasite.coreGlowAlpha})`, Parasite.coreGlowBlur);
    for (const core of this.cores) {
      if (core.checked) this.drawCheckMark(core.x, core.y, baseAlpha);
    }
  }

  drawRsdDots() {
    noStroke();
    for (const mark of this.residueMarks) {
      push();
      translate(mark.x, mark.y);
      rotate(mark.rotation);
      fill(...Parasite.residueColor, mark.alpha);
      beginShape();
      for (let i = 0; i < mark.pointCount; i++) {
        const angle = (TWO_PI * i) / mark.pointCount;
        const radius = mark.radius * mark.radii[i];
        vertex(
          Math.cos(angle) * radius * mark.stretchX,
          Math.sin(angle) * radius * mark.stretchY
        );
      }
      endShape(CLOSE);
      pop();
    }
  }

  // Residual branches are drawn along stored local segments,
  // so visual form and hit testing use the same geometry.
  drawRsdArms() {
    stroke(...Parasite.residueColor, 137);
    strokeWeight(4.2);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    drawingContext.beginPath();
    for (const branch of this.rsdBrnc) {
      let previousEndX = NaN;
      let previousEndY = NaN;
      for (const segment of branch) {
        if (
          Math.abs(segment[2] - segment[0]) < 0.001 &&
          Math.abs(segment[3] - segment[1]) < 0.001
        ) {
          continue;
        }
        if (
          segment[0] !== previousEndX ||
          segment[1] !== previousEndY
        ) {
          drawingContext.moveTo(segment[0], segment[1]);
        }
        drawingContext.lineTo(segment[2], segment[3]);
        previousEndX = segment[2];
        previousEndY = segment[3];
      }
    }
    drawingContext.stroke();
  }

  // The two cores inherit host scale and current gaze opacity respectively,
  // preserving the Parasite's expression of attachment.
  drawCores(baseAlpha) {
    setDynamicGlow(`rgba(255, 255, 255, ${Parasite.coreGlowAlpha})`, Parasite.coreGlowBlur);
    for (const core of this.cores) {
      push();
      drawingContext.globalAlpha =
        baseAlpha *
        (core.checked ? Parasite.actvCoreAlph : Parasite.whiteAlpha);
      noStroke();
      fill(...core.fillColor, core.fillAlpha);
      circle(core.x, core.y, this.coreRadius * 2);
      pop();

      noFill();
      stroke(...Parasite.residueColor, 145);
      strokeWeight(5.4);
      circle(core.x, core.y, this.coreRadius * 2);
      if (core.checked) this.drawCheckMark(core.x, core.y, baseAlpha);
    }
  }

  // Draw the completion mark at the core and counter-rotate against
  // the Parasite so the check shape retains its orientation.
  drawCheckMark(x, y, baseAlpha) {
    push();
    drawingContext.globalAlpha = baseAlpha * Parasite.markAlpha;
    translate(x, y);
    rotate(-this.rot);
    noFill();
    stroke(...Parasite.markColor);
    strokeWeight(4.6);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    beginShape();
    vertex(-6.2, 0);
    vertex(-2.2, 4.2);
    vertex(6.2, -4.7);
    endShape();
    pop();
  }
}

// This function was modified with the assistance of ChatGPT.
function seprRsd() {
  // Adjust local offsets of attached individuals to separate
  // them while preserving their relationship to the host.
  const minDist = Parasite.minGap;
  const minDist2 = minDist * minDist;

  for (let iteration = 0; iteration < Parasite.spacingPasses; iteration++) {
    for (let i = 0; i < parasites.length; i++) {
      const a = parasites[i];
      if (!a.host || !a.attached) continue;

      for (let j = i + 1; j < parasites.length; j++) {
        const b = parasites[j];
        if (!b.host || !b.attached) continue;

        const ac = a.rotCos;
        const as = a.rotSin;
        const bc = b.rotCos;
        const bs = b.rotSin;
        const ax = a.host.x + a.ox * ac - a.oy * as;
        const ay = a.host.y + a.ox * as + a.oy * ac;
        const bx = b.host.x + b.ox * bc - b.oy * bs;
        const by = b.host.y + b.ox * bs + b.oy * bc;
        let dx = ax - bx;
        let dy = ay - by;
        let d2 = dx * dx + dy * dy;
        if (d2 >= minDist2) continue;

        // When positions overlap, use the seed difference to generate a stable direction.
        if (d2 < 1e-8) {
          const angle = ((a.seed || i) - (b.seed || j)) * 0.01;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d2 = 1;
        }

        const d = Math.sqrt(d2);
        const shift = (minDist - d) * 0.5;
        const sx = (dx / d) * shift;
        const sy = (dy / d) * shift;
        // Convert screen displacement back into each host coordinate system separately so differently
        // rotated Parasites still separate symmetrically.
        a.ox += sx * ac + sy * as;
        a.oy += -sx * as + sy * ac;
        b.ox -= sx * bc + sy * bs;
        b.oy += sx * bs - sy * bc;
      }
    }
  }
}

// 6. Attachment and attention residue continue into the shared world
// The object stores host and residue state, while Behavior
// receives interaction updates through a common interface.
window.Parasite = Parasite;
window.ParasiteBehavior = Object.freeze({
  createSessionState() {
    return new Set();
  },
  resetInteraction(context = {}) {
    context.targets?.clear?.();
  },
  updateInteraction(context = {}) {
    const entity = context.entity;
    if (!entity) return false;
    entity.updtAttn(
      Boolean(context.focused),
      Number(context.frameMs) || 0,
      context.options || {}
    );
    return true;
  },
  getViewState(entity) {
    return entity || null;
  },
});
