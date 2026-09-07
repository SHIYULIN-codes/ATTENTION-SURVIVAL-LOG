// File Overview
// Implements Guardian, which protects pressured lifeforms and supports attentional recovery.

// 1. Guardian represents attentional recovery and low-disturbance protection,
// drawing on Attention Restoration Theory (Kaplan, 1995) and Calm Technology (Weiser and Brown, 1996).
// It helps restore attentional space
// by limiting dominant species and supporting less dominant lifeforms.
// The Guardian approaches lifeforms under pressure. Drifting symbols, protective waves,
// and slow movement express this care together.

// 2. Body and symbols
class Guardian {
  static waveSeeds = [710, 790, 870, 950];
  static waveTrig = null;

  static getWaveTrig() {
    const segments = guardCfg.waveSegments;
    if (Guardian.waveTrig?.segments === segments) return Guardian.waveTrig;

    const broadXs = new Float64Array(segments);
    const broadYs = new Float64Array(segments);
    const detailXs = new Float64Array(segments);
    const detailYs = new Float64Array(segments);
    for (let i = 0; i < segments; i++) {
      const angle = (TWO_PI * i) / segments;
      broadXs[i] = cos(angle) * 1.05;
      broadYs[i] = sin(angle) * 1.05;
      detailXs[i] = cos(angle * 2) * 0.9;
      detailYs[i] = sin(angle * 2) * 0.9;
    }

    Guardian.waveTrig = { segments, broadXs, broadYs, detailXs, detailYs };
    return Guardian.waveTrig;
  }

  // Each Guardian owns its position, waveform, symbol transitions, gaze feedback, and caring pose;
  // GuardianBehavior coordinates cross-object phases.
  // This constructor was modified with the assistance of ChatGPT.
  constructor(x, y, rot) {
  // Base position and waveform preserve the Guardian's slow rhythm while it is alone.
    this.type = eco.lifeType.guardian;
    this.x0 = x;
    this.y0 = y;
    this.rot0 = rot;
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.sz = random(0.6, 0.95);
    this.seed = random(1e6);
    this.dy = 0;
    this.b = 1;
    this.tt = random(9999);
    this.r1 = random(TWO_PI);
    this.r2 = random(TWO_PI);
    this.waveCache = null;
    this.waveState = { current: null, next: null, mix: 0 };
    this.waveCachePhase = this.seed % (1000 / guardCfg.waveCacheTps);
  // Gaze-response and approach phases record how the Guardian moves toward a relationship.
    this.attnDwellMs = 0;
    this.attnLeaveMs = 0;
    this.attnOn = false;
    this.attnPow = 0;
    this.attnTgts = [];
    this.attnDirX = null;
    this.attnDirY = null;
    this.attnTgtDist = 0;
    this.attnDirSmoothX = null;
    this.attnDirSmoothY = null;
    this.attentionOffsetX = 0;
    this.attentionOffsetY = 0;
    this.attentionVisualX = null;
    this.attentionVisualY = null;
    this.attnOrbtSign = this.seed % 2 < 1 ? -1 : 1;
    this.attnPhase = "idle";
    this.attnJourneySeq = 0;
    this.attnLogFocusMs = 0;
    this.attnLogDone = false;
    this.attnMoveMul =
      guardCfg.attnSpdMulMin;
  // Care, symbol-transition, and repair state preserve changes produced by the relationship.
    this.actvClckMs = null;
    this.plusClockMs = null;
    this.crssPlusCareMs = 0;
    this.guardSigns = false;
    this.drftSymMnsMix = 0;
    this.drftSymblMode = "base";
    this.driftSignMix = null;
    this.progRotScl = 1;
    this.attnArcScale = 1;
    this.guardianRepairUseCount = 0;
    this.guardRprScl = 1;
    this.guardRprAlph = 1;
    this.grdRprRing = 1;
    this.guardRprTx = null;
    this.repairRetired = false;
// Symbols disperse and drift while idle, then gather toward the target in response.
    const plusTune = driftPlusCfg;
    // Independent random streams generate layout, gaze response, and timing separately.
    const plusRand = mulberry32((Math.floor(this.seed * 1000) ^ 0x7f4a7c15) >>> 0);
    const attentionRand = mulberry32(
      (Math.floor(this.seed * 1000) ^ 0x3c6ef372) >>> 0
    );
    const naturalRand = mulberry32(
      (Math.floor(this.seed * 1000) ^ 0xa54ff53a) >>> 0
    );
    const attnTmngRand = mulberry32(
      (Math.floor(this.seed * 1000) ^ 0x510e527f) >>> 0
    );
    this.attnPlusApprMs = srng(
      attnTmngRand,
      plusCfg.approachMsMin,
      plusCfg.approachMsMax
    );
    // Total symbol count varies by individual, while a higher proportion of plus signs keeps the
    // Guardian's restorative tendency legible.
    const plusCount = Math.floor(srng(plusRand, plusTune.countMin, plusTune.countMax + 1));
    const plusSymblN = Math.round(plusCount * 0.6);
    const naturalScatter = [];
    const natGroupN = min(
      plusCount,
      floor(
        srng(
          naturalRand,
          plusTune.natGroupNMin,
          plusTune.natGroupNMax + 1
        )
      )
    );
    const clusteredCount = clamp(
      round(
        plusCount *
          srng(
            naturalRand,
            plusTune.natGroupShrMin,
            plusTune.natGroupShrMax
          )
      ),
      min(plusCount, natGroupN + 1),
      plusCount
    );
    // Select separated cluster centers first, then place members around them to form natural groupings.
    const clusterCenters = [];
    for (
      let clusterIndex = 0;
      clusterIndex < natGroupN;
      clusterIndex++
    ) {
      let bestCenter = null;
      let bestCenterGap = -Infinity;
      for (
        let attempt = 0;
        attempt < plusTune.natScttrAttm;
        attempt++
      ) {
        const centerAngle = naturalRand() * TWO_PI;
        const centerRadius = srng(
          naturalRand,
          plusTune.groupCntrMin,
          plusTune.groupCntrMax
        );
        const candidate = {
          x: cos(centerAngle) * centerRadius,
          y: sin(centerAngle) * centerRadius,
        };
        const nearCtrGap = clusterCenters.reduce(
          (gap, center) =>
            min(
              gap,
              dist(candidate.x, candidate.y, center.x, center.y)
            ),
          Infinity
        );
        // Prioritize maximizing distance to the nearest center; when attempts are exhausted,
        // use the most dispersed candidate found.
        if (nearCtrGap > bestCenterGap) {
          bestCenter = candidate;
          bestCenterGap = nearCtrGap;
        }
        if (
          nearCtrGap >= plusTune.grouCntGapMin
        ) {
          break;
        }
      }
      clusterCenters.push({
        ...(bestCenter || { x: 0, y: 0 }),
        radius: srng(
          naturalRand,
          plusTune.natGroupRadMin,
          plusTune.natGroupRadMax
        ),
        breathPhase: naturalRand() * TWO_PI,
        breathSpeed: srng(
          naturalRand,
          plusTune.groupBrthMin,
          plusTune.groupBrthMax
        ),
      });
    }

    for (
      let scatterIndex = 0;
      scatterIndex < clusteredCount;
      scatterIndex++
    ) {
      const clusterIndex = scatterIndex % natGroupN;
      const center = clusterCenters[clusterIndex];
      const clusterMembers = naturalScatter.filter(
        (position) => position.clusterIndex === clusterIndex
      );
      const desiredGap = srng(
        naturalRand,
        plusTune.natDnsGapMin,
        plusTune.natDnsGapMax
      );
      let bestCandidate = null;
      let bestScore = Infinity;
      for (
        let attempt = 0;
        attempt < plusTune.natScttrAttm;
        attempt++
      ) {
        const offsetAngle = naturalRand() * TWO_PI;
        const offsetRadius =
          sqrt(naturalRand()) * center.radius;
        let x = center.x + cos(offsetAngle) * offsetRadius;
        let y = center.y + sin(offsetAngle) * offsetRadius;
        const distFromCntr = sqrt(x * x + y * y);
        // Push candidates outside the overall contour back to its boundary along their original
        // direction, preserving cluster shape and reusing the sample.
        if (distFromCntr > plusTune.radiusMax) {
          const rangeScale = plusTune.radiusMax / distFromCntr;
          x *= rangeScale;
          y *= rangeScale;
        }
        const nearGroupGap = clusterMembers.reduce(
          (gap, other) => min(gap, dist(x, y, other.x, other.y)),
          Infinity
        );
        const nearOvrllGap = naturalScatter.reduce(
          (gap, other) => min(gap, dist(x, y, other.x, other.y)),
          Infinity
        );
// Spacing variation changes cluster density, preserving differences among symbol groupings.
        const gapScore = clusterMembers.length
          ? abs(nearGroupGap - desiredGap)
          : offsetRadius * 0.25;
        const collPnlty = max(
          0,
          plusTune.natDnsGapMin * 0.65 - nearOvrllGap
        );
        const score = gapScore + collPnlty * 4;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = {
            x,
            y,
            clusterIndex,
            clusterX: center.x,
            clusterY: center.y,
            offsetX: x - center.x,
            offsetY: y - center.y,
            groupBrthPhs: center.breathPhase,
            groupBrthSpd: center.breathSpeed,
          };
        }
      }
      naturalScatter.push(bestCandidate);
    }

    // Scatter remaining symbols around the cluster perimeter to introduce variation in contour density.
    while (naturalScatter.length < plusCount) {
      const desiredGap = srng(
        naturalRand,
        plusTune.natSprsGapMin,
        plusTune.natSprsGapMax
      );
      let bestCandidate = null;
      let bestScore = Infinity;
      for (
        let attempt = 0;
        attempt < plusTune.natScttrAttm;
        attempt++
      ) {
        const angle = naturalRand() * TWO_PI;
        const radius = sqrt(
          lerp(
            plusTune.natSprsRadMin ** 2,
            plusTune.radiusMax ** 2,
            naturalRand()
          )
        );
        const x = cos(angle) * radius;
        const y = sin(angle) * radius;
        const nearestGap = naturalScatter.reduce(
          (gap, other) => min(gap, dist(x, y, other.x, other.y)),
          Infinity
        );
        const nearGroupCntr = clusterCenters.reduce(
          (gap, center) => min(gap, dist(x, y, center.x, center.y)),
          Infinity
        );
        // Outlier candidates remain distant from both existing symbols and cluster centers.
        const clusterPenalty = max(
          0,
          plusTune.natSprsGapMin - nearGroupCntr
        );
        const score =
          abs(nearestGap - desiredGap) + clusterPenalty * 2;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = {
            angle,
            radius,
            x,
            y,
            clusterIndex: -1,
          };
        }
      }
      naturalScatter.push(bestCandidate);
    }

    // A deterministic seeded shuffle changes symbol reading order while preserving the established
    // spatial relationships of clusters and outliers.
    for (let index = naturalScatter.length - 1; index > 0; index--) {
      const swapIndex = floor(naturalRand() * (index + 1));
      [naturalScatter[index], naturalScatter[swapIndex]] =
        [naturalScatter[swapIndex], naturalScatter[index]];
    }
    for (const position of naturalScatter) {
      position.radius = sqrt(
        position.x * position.x + position.y * position.y
      );
      position.angle = atan2(position.y, position.x);
    }
// As attention approaches, symbols gradually gather toward the target and establish a response.
    const attnScttr = [];
    const attnGroupN = min(
      plusCount - 1,
      floor(
        srng(
          attentionRand,
          plusCfg.groupNMin,
          plusCfg.groupNMax + 1
        )
      )
    );
    const attnClstN = clamp(
      round(
        plusCount *
          srng(
            attentionRand,
            plusCfg.groupShrMin,
            plusCfg.groupShrMax
          )
      ),
      attnGroupN + 1,
      plusCount - 1
    );
    // The response layout establishes several centers toward the target,
    // leaving enough spacing for gathered gaze symbols to remain distinguishable.
    const attnGroupCntrs = [];
    for (
      let clusterIndex = 0;
      clusterIndex < attnGroupN;
      clusterIndex++
    ) {
      let candidate = null;
      for (let attempt = 0; attempt < 18; attempt++) {
        candidate = {
          forward: srng(
            attentionRand,
            plusCfg.groupFrwrdMin,
            plusCfg.groupFrwrdMax
          ),
          side: srng(
            attentionRand,
            -plusCfg.groupSideSprd,
            plusCfg.groupSideSprd
          ),
        };
        // Stop sampling once center-spacing requirements are met,
        // limiting initialization cost while preserving sufficient cluster separation.
        const nearCtrGap = attnGroupCntrs.reduce(
          (gap, center) =>
            min(
              gap,
              dist(
                candidate.forward,
                candidate.side,
                center.forward,
                center.side
              )
            ),
          Infinity
        );
        if (
          nearCtrGap >=
          plusCfg.grouCntGapMin
        ) {
          break;
        }
      }
// Accept the current candidate after a bounded number of attempts,
// giving layout generation a reliable completion boundary.
      attnGroupCntrs.push({
        ...(candidate || { forward: 0.7, side: 0 }),
        radius: srng(
          attentionRand,
          plusCfg.groupRadMin,
          plusCfg.groupRadMax
        ),
        wanderPhase: attentionRand() * TWO_PI,
        wanderSpeed: srng(
          attentionRand,
          plusCfg.wanderSpeedMin,
          plusCfg.wanderSpeedMax
        ),
      });
    }

// The primary cluster contains more symbols, giving the response direction a visual center of gravity.
    const attnGroupCnts = Array(attnGroupN).fill(1);
    const domnAttnGroup = floor(
      attentionRand() * attnGroupN
    );
    let attnMmbrsLeft =
      attnClstN - attnGroupN;
    const dominantShare = min(
      attnMmbrsLeft,
      ceil(attnMmbrsLeft * srng(attentionRand, 0.55, 0.72))
    );
    attnGroupCnts[domnAttnGroup] += dominantShare;
    attnMmbrsLeft -= dominantShare;
    while (attnMmbrsLeft > 0) {
      let clusterIndex = floor(attentionRand() * attnGroupN);
      if (
        attnGroupN > 1 &&
        clusterIndex === domnAttnGroup
      ) {
        clusterIndex = (clusterIndex + 1) % attnGroupN;
      }
      attnGroupCnts[clusterIndex]++;
      attnMmbrsLeft--;
    }
    // Expand cluster counts into per-symbol assignments, then shuffle them.
    const attnAssg = [];
    for (
      let clusterIndex = 0;
      clusterIndex < attnGroupCnts.length;
      clusterIndex++
    ) {
      for (
        let memberIndex = 0;
        memberIndex < attnGroupCnts[clusterIndex];
        memberIndex++
      ) {
        attnAssg.push(clusterIndex);
      }
    }
    while (attnAssg.length < plusCount) {
      attnAssg.push(-1);
    }
    for (let index = attnAssg.length - 1; index > 0; index--) {
      const swapIndex = floor(attentionRand() * (index + 1));
      [attnAssg[index], attnAssg[swapIndex]] =
        [attnAssg[swapIndex], attnAssg[index]];
    }

    // Constrain gaze-response anchors to a legible range around the Guardian.
    const boundAttnPos = (position) => {
      position.forward = clamp(
        position.forward,
        plusCfg.forwardMin,
        plusCfg.forwardMax
      );
      position.side = clamp(
        position.side,
        -plusCfg.sideSpread,
        plusCfg.sideSpread
      );
      const distance = sqrt(
        position.forward * position.forward +
          position.side * position.side
      );
      if (distance > 0.98) {
        const boundedScale = 0.98 / distance;
        position.forward *= boundedScale;
        position.side *= boundedScale;
      }
      return position;
    };
    const crtAttnScttr = (clusterIndex) => {
      let candidate = null;
      if (clusterIndex >= 0) {
        // Sample symbols within a cluster around their shared center.
        const center = attnGroupCntrs[clusterIndex];
        for (let attempt = 0; attempt < 18; attempt++) {
          const offsetAngle = attentionRand() * TWO_PI;
          const offsetRadius =
            pow(attentionRand(), 1.65) * center.radius;
          candidate = boundAttnPos({
            forward:
              center.forward + cos(offsetAngle) * offsetRadius * 0.78,
            side: center.side + sin(offsetAngle) * offsetRadius,
          });
          const nearestGap = attnScttr.reduce(
            (gap, other) =>
              min(
                gap,
                dist(
                  candidate.forward,
                  candidate.side,
                  other.forward,
                  other.side
                )
              ),
            Infinity
          );
          if (nearestGap >= plusCfg.collisionGap) {
            break;
          }
        }
        candidate.clusterForward = center.forward;
        candidate.clusterSide = center.side;
        candidate.groupWndrPhs = center.wanderPhase;
        candidate.groupWndrSpd = center.wanderSpeed;
      } else {
        // Keep outlier symbols away from both cluster centers
        // and existing symbols to express drifting attention.
        const dsrdGroupGap = srng(
          attentionRand,
          plusCfg.otlrGroGapMin,
          plusCfg.otlrGroGapMax
        );
        for (let attempt = 0; attempt < 24; attempt++) {
          candidate = boundAttnPos({
            forward: srng(
              attentionRand,
              plusCfg.forwardMin,
              plusCfg.forwardMax
            ),
            side: srng(
              attentionRand,
              -plusCfg.sideSpread,
              plusCfg.sideSpread
            ),
          });
          const nearGroupGap = attnGroupCntrs.reduce(
            (gap, center) =>
              min(
                gap,
                dist(
                  candidate.forward,
                  candidate.side,
                  center.forward,
                  center.side
                )
              ),
            Infinity
          );
          const nearestPlusGap = attnScttr.reduce(
            (gap, other) =>
              min(
                gap,
                dist(
                  candidate.forward,
                  candidate.side,
                  other.forward,
                  other.side
                )
              ),
            Infinity
          );
          if (
            nearGroupGap >= dsrdGroupGap &&
            nearestPlusGap >= plusCfg.collisionGap
          ) {
            break;
          }
        }
        // Each outlier uses its own position as a roaming center,
        // allowing it to share the same animation data structure as cluster members.
        candidate.clusterForward = candidate.forward;
        candidate.clusterSide = candidate.side;
        candidate.groupWndrPhs = attentionRand() * TWO_PI;
        candidate.groupWndrSpd = srng(
          attentionRand,
          plusCfg.wanderSpeedMin,
          plusCfg.wanderSpeedMax
        );
      }
      // Store cluster centers and roaming parameters so later animation
      // can advance offsets while reusing the established layout.
      candidate.clusterIndex = clusterIndex;
      attnScttr.push(candidate);
      return candidate;
    };
    // Merge both layouts into symbol state that can transition smoothly.
    this.driftPluses = Array.from({ length: plusCount }, (_, plusIndex) => {
      const natPos = naturalScatter[plusIndex];
      const attnPos = crtAttnScttr(
        attnAssg[plusIndex]
      );
      // Each symbol receives its own approach duration and delay,
      // presenting the response layout as a continuous convergence.
      const attnApprTtlMs =
        plusIndex === 0
          ? this.attnPlusApprMs
          : srng(
              attnTmngRand,
              plusCfg.approachMsMin,
              this.attnPlusApprMs
            );
      const attnApprDlyMs = srng(
        attnTmngRand,
        0,
        min(
          plusCfg.strtDlyMaxMs,
          max(
            0,
            attnApprTtlMs -
              plusCfg.approachMsMin
          )
        )
      );
      // Distribute baseline plus and minus symbols evenly by index ratio.
      return {
        baseSymbol:
          Math.floor(((plusIndex + 1) * plusSymblN) / plusCount) >
          Math.floor((plusIndex * plusSymblN) / plusCount)
            ? "plus"
            : "minus",
        angle: natPos.angle,
        radius: natPos.radius,
        naturalX: natPos.x,
        naturalY: natPos.y,
        clusterIndex: natPos.clusterIndex,
        clusterX: natPos.clusterX ?? 0,
        clusterY: natPos.clusterY ?? 0,
        clusterOffsetX: natPos.offsetX ?? 0,
        clusterOffsetY: natPos.offsetY ?? 0,
        groupBrthPhs:
          natPos.groupBrthPhs ?? 0,
        groupBrthSpd:
          natPos.groupBrthSpd ?? 0,
        radialAmp: srng(plusRand, plusTune.radialAmpMin, plusTune.radialAmpMax),
        angularAmp: srng(plusRand, plusTune.angularAmpMin, plusTune.angularAmpMax),
        speed: srng(plusRand, plusTune.speedMin, plusTune.speedMax),
        phase: plusRand() * TWO_PI,
        size: srng(plusRand, plusTune.sizeMin, plusTune.sizeMax),
        weight: srng(plusRand, plusTune.weightMin, plusTune.weightMax),
        alpha: srng(plusRand, plusTune.alphaMin, plusTune.alphaMax),
        // Each symbol stores both natural and response layouts,
        // interpolating between established points during state transitions.
        attnFrwrd: attnPos.forward,
        attentionSide: attnPos.side,
        attnGroupIndx: attnPos.clusterIndex,
        attnGroupFrwrd: attnPos.clusterForward,
        attnGroupSide: attnPos.clusterSide,
        attnGroupPhs:
          attnPos.groupWndrPhs,
        attnGroupSpd:
          attnPos.groupWndrSpd,
        attnMmbrWndr: srng(
          attentionRand,
          plusCfg.mmbrWndrMin,
          plusCfg.mmbrWndrMax
        ),
        attnWndrPhs: attentionRand() * TWO_PI,
        attnWndrSpd: srng(
          attentionRand,
          plusCfg.wanderSpeedMin,
          plusCfg.wanderSpeedMax
        ),
        attnApprDlyMs,
        attnMoveMs:
          attnApprTtlMs - attnApprDlyMs,
        visualX: null,
        visualY: null,
        visualAlpha: null,
        prevMovePow: 0,
        filtMtnSpd: 0,
        motionActive: false,
        motionStrength: 0,
        mtnAlphPow: 0,
        mtnAlphHoldMs: 0,
      };
    });

  }

// 3. Approaching lifeforms in need of care
  // This method was modified with the assistance of ChatGPT.
  update(ctx) {
    const dt = ctx.dt;
    const prevVisX = this.x;
    const prevVisY = this.y;
    const spdMul = lerp(
      1,
      guardCfg.attnSpdMulMin,
      this.attnPow
    );
    const motionCtx = {
      dt,
      movementDt: ctx.movementDt ?? dt,
    };
    const frameMs = (max(0, dt) * 1000) / eco.simFps;
    this.updtDrftTurn(frameMs);
    this.updtDrftFade(frameMs);
    if (this.actvClckMs == null) this.actvClckMs = ctx.now;
    else this.actvClckMs += frameMs * spdMul;
    const plusFrameMs = min(
      driftCfg.frameMsMax,
      frameMs
    );
    if (this.plusClockMs == null) this.plusClockMs = ctx.now;
    else this.plusClockMs += plusFrameMs;

    // Continue updating the natural roaming position during response,
    // then return to this moving trajectory afterward.
    cruiseUpdate(this, motionCtx, settings.cruise.guard);
    if (this.edgeResident) keepAtEdge(this, guardRange.roamInner);
    driftUpdate(this, motionCtx, driftMode.guard);
    keepGuardEdge(this);

    const naturalX = this.x;
    const naturalY = this.y;
    const targetPoints = this.attnTgtPnts();
    const attnPrefDist =
      this.attnPrefDist();
    // traveling approaches the geometric center of the target group while maintaining a safe distance.
    if (this.attnPhase === "traveling") {
      if (targetPoints.length) {
        if (this.attentionVisualX == null || this.attentionVisualY == null) {
          this.attentionVisualX = prevVisX;
          this.attentionVisualY = prevVisY;
        }
        const targetCenter = targetPoints.reduce(
          (center, point) => {
            center.x += point.x / targetPoints.length;
            center.y += point.y / targetPoints.length;
            return center;
          },
          { x: 0, y: 0 }
        );
        const dx = targetCenter.x - this.attentionVisualX;
        const dy = targetCenter.y - this.attentionVisualY;
        const distance = sqrt(dx * dx + dy * dy);
        const distLeft = max(
          0,
          distance - attnPrefDist
        );
        if (distance > 0.001 && distLeft > 0) {
          // Approach speed increases with distance, then naturally
          // slows near the safe distance and stops outside the target.
          const distProg = clamp(
            distLeft /
              max(1, guardCfg.attnFarDist),
            0,
            1
          );
          const easedDistProg =
            cubicSmoothstep(distProg);
          const apprSpdMul = lerp(
            guardCfg.attnSpdMulMin,
            guardCfg.attnSpdMulMax,
            easedDistProg
          );
          this.attnMoveMul =
            apprSpdMul;
          const approachSpeed =
            settings.cruise.guard.speed *
            eco.moveSpeed *
            eco.simFps *
            apprSpdMul;
          const step = min(
            distLeft,
            approachSpeed * (frameMs / 1000)
          );
          this.attentionVisualX += (dx / distance) * step;
          this.attentionVisualY += (dy / distance) * step;
          if (step >= distLeft - 0.001) {
            this.attnPhase = "arrived";
          }
        } else {
          this.attnPhase = "arrived";
        }
      }
    // arrived combines radial correction with tangential drift to maintain caring distance.
    } else if (
      this.attnPhase === "arrived" &&
      this.attnOn
    ) {
      if (targetPoints.length) {
        if (this.attentionVisualX == null || this.attentionVisualY == null) {
          this.attentionVisualX = prevVisX;
          this.attentionVisualY = prevVisY;
        }
        const targetCenter = targetPoints.reduce(
          (center, point) => {
            center.x += point.x / targetPoints.length;
            center.y += point.y / targetPoints.length;
            return center;
          },
          { x: 0, y: 0 }
        );
        const dx = targetCenter.x - this.attentionVisualX;
        const dy = targetCenter.y - this.attentionVisualY;
        const distance = sqrt(dx * dx + dy * dy);
        const distanceError =
          distance - attnPrefDist;
        let directionX;
        let directionY;
        if (distance > 0.001) {
          directionX = dx / distance;
          directionY = dy / distance;
        } else {
          const fallbackAngle = (this.seed * 0.0001) % TWO_PI;
          directionX = cos(fallbackAngle);
          directionY = sin(fallbackAngle);
        }
        // Distance error determines radial correction; remaining movement
        // becomes tangential drift to preserve a sense of orbiting.
        const tolerance = max(
          0.001,
          guardCfg.attnKeepTol
        );
        const radialStrength = clamp(
          distanceError / tolerance,
          -1,
          1
        );
        const tngntPow = sqrt(
          max(0, 1 - radialStrength * radialStrength)
        );
        const tangentX = -directionY * this.attnOrbtSign;
        const tangentY = directionX * this.attnOrbtSign;
        const mantDirX =
          directionX * radialStrength + tangentX * tngntPow;
        const mantDirY =
          directionY * radialStrength + tangentY * tngntPow;
        const maintainSpeed =
          settings.cruise.guard.speed *
          eco.moveSpeed *
          eco.simFps *
          guardCfg.lngrDrftScl;
        const maintainStep = maintainSpeed * (frameMs / 1000);
        this.attentionVisualX += mantDirX * maintainStep;
        this.attentionVisualY += mantDirY * maintainStep;
      }
    // After gaze ends, return toward the current natural
    // position so the return trajectory resolves continuously.
    } else if (
      this.attentionVisualX != null &&
      this.attentionVisualY != null
    ) {
      const returnDx = naturalX - this.attentionVisualX;
      const returnDy = naturalY - this.attentionVisualY;
      const returnDistance = sqrt(
        returnDx * returnDx + returnDy * returnDy
      );
      if (returnDistance > 0.001) {
        const returnSpeed =
          settings.cruise.guard.speed *
          eco.moveSpeed *
          eco.simFps *
          guardCfg.attnRtrnSpdMul;
        const returnStep = min(
          returnDistance,
          returnSpeed * (frameMs / 1000)
        );
        this.attentionVisualX +=
          (returnDx / returnDistance) * returnStep;
        this.attentionVisualY +=
          (returnDy / returnDistance) * returnStep;
        if (returnStep >= returnDistance - 0.001) {
          this.attentionVisualX = null;
          this.attentionVisualY = null;
        }
      } else {
        this.attentionVisualX = null;
        this.attentionVisualY = null;
      }
    }
    if (this.attentionVisualX != null && this.attentionVisualY != null) {
      this.x = this.attentionVisualX;
      this.y = this.attentionVisualY;
    }
    // Write the world-boundary-constrained result back to the temporary visual position.
    ecoWorld.keep(this);
    if (this.attentionVisualX != null && this.attentionVisualY != null) {
      this.attentionVisualX = this.x;
      this.attentionVisualY = this.y;
    }
    // The offset preserves the difference between response position and natural trajectory for
    // continuous rendering and next-frame updates.
    this.attentionOffsetX = this.x - naturalX;
    this.attentionOffsetY = this.y - naturalY;
    this.updateAttnDir();

    // Candidate formation and approach phases alter the ring rhythm,
    // using movement speed to distinguish observation, response, and care.
    const ecoProg =
      care.state.phase === "idle" &&
      care.state.candidate === this &&
      care.state.focusMs > 0 &&
      !care.state.reqrFree;
    const rotSclTgt = ecoProg
      ? guardCfg.progRotScl
      : 1;
    const rotSclMix =
      1 -
      Math.exp(
        -frameMs /
          max(
            1,
            guardCfg.progRotTurnMs
          )
      );
    this.progRotScl = lerp(
      this.progRotScl,
      rotSclTgt,
      rotSclMix
    );
    // The approach phase compresses the arc rhythm independently,
    // making the act of care recognizable while retaining the original double-ring structure.
    const attnArcTarget =
      this.attnPhase === "traveling"
        ? guardCfg.attnArcScale
        : 1;
    const attnArcRotMix =
      1 -
      Math.exp(
        -frameMs /
          max(
            1,
            guardCfg.attnArcTurnMs
          )
      );
    this.attnArcScale = lerp(
      this.attnArcScale,
      attnArcTarget,
      attnArcRotMix
    );
    // The two rings advance in opposite directions and share the phase-speed multiplier.
    this.r1 +=
      guardCfg.rspd *
      dt *
      this.progRotScl *
      this.attnArcScale;
    this.r2 -=
      guardCfg.rspd *
      dt *
      this.progRotScl *
      this.attnArcScale;
  }

  // 4. The Guardian senses gaze and responds toward where care is needed
  attnTgtPnts() {
    return this.attnTgts
      .filter((entity) => entity && !entity.dead)
      .map((entity) => worldPos(entity))
      .filter(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
      );
  }

  attnPrefDist() {
    const target = this.attnTgts.find(
      (entity) => entity && !entity.dead
    );
    if (!target) {
      return guardCfg.attnStopDist;
    }
    return max(
      guardCfg.attnStopDist,
      infoRadius(this) +
        infoRadius(target) +
        guardCfg.attnMantPddng
    );
  }

  // Average valid target positions to calculate the
  // Guardian's direction and distance to the target center.
  updateAttnDir() {
    const targetPoints = this.attnTgtPnts();
    if (!targetPoints.length) {
      this.attnDirX = null;
      this.attnDirY = null;
      this.attnTgtDist = 0;
      return;
    }
    const targetCenter = targetPoints.reduce(
      (center, point) => {
        center.x += point.x / targetPoints.length;
        center.y += point.y / targetPoints.length;
        return center;
      },
      { x: 0, y: 0 }
    );
    const dx = targetCenter.x - this.x;
    const dy = targetCenter.y - this.y;
    const distance = sqrt(dx * dx + dy * dy);
    if (distance <= 0.001) {
      this.attnDirX = null;
      this.attnDirY = null;
      this.attnTgtDist = 0;
      return;
    }
    this.attnDirX = dx / distance;
    this.attnDirY = dy / distance;
    this.attnTgtDist = distance;
  }

// Sustained gaze moves the Guardian from waiting into response and approach
  // This method was modified with the assistance of ChatGPT.
  updtAttnFb(nearby, frameMs, targets = []) {
    const elapsedMs = max(0, frameMs);
    // Extend the departure grace period after the Guardian enters response,
    // allowing briefly diverted gaze time to return.
    const leaveHoldMs =
      this.attnPhase === "idle"
        ? guardCfg.attnGraceMs
        : guardCfg.attnLvHoldMs;
    if (nearby) {
      this.attnLeaveMs = leaveHoldMs;
    } else {
      this.attnLeaveMs = max(0, this.attnLeaveMs - elapsedMs);
    }
    const recvAttn = nearby || this.attnLeaveMs > 0;
    // During traveling, continue accepting the set of valid
    // targets and keep approaching through brief losses of gaze.
    const journeyLocked =
      this.attnPhase === "traveling";
    if (targets.length && (recvAttn || journeyLocked)) {
      this.attnTgts = targets;
    }
    // Log an observation when sustained gaze reaches the perceptible threshold.
    if (!recvAttn) {
      this.attnLogFocusMs = 0;
    } else if (nearby && !this.attnLogDone) {
      const prevFocusMs = this.attnLogFocusMs;
      this.attnLogFocusMs = min(
        capture.logFocusMs,
        prevFocusMs + elapsedMs
      );
      if (
        prevFocusMs < capture.logFocusMs &&
        this.attnLogFocusMs >= capture.logFocusMs
      ) {
        const target = (targets.length ? targets : this.attnTgts).find(
          (entity) =>
            entity?.type === eco.lifeType.predator ||
            entity?.type === eco.lifeType.parasite
        );
        // The log records the Guardian's sustained response to threatening species.
        if (target) {
          this.attnLogDone = true;
          rcrdSurvNote(
            "Guardian",
            target.type === eco.lifeType.predator
              ? "simplePredator"
              : "simpleParasite",
            this,
            lifeLogNow(),
            {
              sequence:
                this.attnJourneySeq +
                (this.attnPhase === "idle" ? 1 : 0),
              sessionId: activeSession?.id,
              participantCount: ixUserCount,
              priority: 50,
              metadata: { targetSpecies: target.type },
            }
          );
        }
      }
    }
    if (this.attnPhase === "idle" && !recvAttn) {
      this.attnLogDone = false;
    }

    // Once underway, complete the approach while allowing participants to move their gaze naturally.
    if (this.attnPhase === "traveling") {
      this.attnOn = true;
      this.attnDwellMs = guardCfg.attnDlyMs;
      this.attnPow = min(
        1,
        this.attnPow +
          elapsedMs / guardCfg.attnApprMs
      );
      this.attnPlusPow = min(
        1,
        this.attnPlusPow +
          elapsedMs / this.attnPlusApprMs
      );
      return;
    }

    // After arrival, gaze continues to sustain the relationship; on departure,
    // gradually withdraw feedback and return to idle.
    if (this.attnPhase === "arrived") {
      if (recvAttn) {
        this.attnOn = true;
        this.attnDwellMs = guardCfg.attnDlyMs;
        this.attnPow = min(
          1,
          this.attnPow +
            elapsedMs / guardCfg.attnApprMs
        );
        this.attnPlusPow = min(
          1,
          this.attnPlusPow +
            elapsedMs / this.attnPlusApprMs
        );
      } else {
        this.attnDwellMs = 0;
        this.attnOn = false;
        this.attnPow = max(
          0,
          this.attnPow -
            elapsedMs / guardCfg.attnRestoreMs
        );
        this.attnPlusPow = max(
          0,
          this.attnPlusPow -
            elapsedMs / guardCfg.attnRestoreMs
        );
        if (this.attnPow === 0) {
          this.attnPlusPow = 0;
          this.attnTgts = [];
          this.attnPhase = "idle";
        }
      }
      return;
    }

    // idle accumulates lingering before departure,
    // distinguishing intentional attention from a passing glance.
    if (recvAttn) {
      if (targets.length) this.attnTgts = targets;
      this.attnDwellMs = min(
        guardCfg.attnDlyMs,
        this.attnDwellMs + (nearby ? elapsedMs : 0)
      );
      if (
        this.attnDwellMs >= guardCfg.attnDlyMs
      ) {
        this.attnOn = true;
        this.attnPhase = "traveling";
        this.attnPow = 0;
        this.attnPlusPow = 0;
        this.attnLeaveMs = guardCfg.attnLvHoldMs;
        const target = this.attnTgts.find(
          (entity) =>
            entity?.type === eco.lifeType.predator ||
            entity?.type === eco.lifeType.parasite
        );
        if (target) {
          this.attnJourneySeq++;
        }
      }
    } else {
      this.attnDwellMs = 0;
      this.attnOn = false;
      this.attnPow = 0;
      this.attnPlusPow = 0;
      this.attnTgts = [];
    }
  }

  // 5. Protective waves and drifting symbols sustain care
  buildWaveFields(tick, fields = null) {
    const segments = guardCfg.waveSegments;
    const trig = Guardian.getWaveTrig();
    const stepMs = 1000 / guardCfg.waveCacheTps;
    // Sample waves at preset time intervals, then interpolate between adjacent samples.
    const waveTime =
      (tick * stepMs - this.waveCachePhase) * 0.001 * guardCfg.waveSpeed;
    if (!fields) fields = {};

    for (const seedOffset of Guardian.waveSeeds) {
      const waveSeed = this.seed * 0.001 + seedOffset;
      const detailSeed = waveSeed + 47;
      const samples = fields[seedOffset] || new Float32Array(segments);

      for (let i = 0; i < segments; i++) {
        // Broad-frequency noise determines overall breathing,
        // while low-weight detail noise breaks up an overly regular contour.
        const broadWave =
          (noise(
            waveSeed + trig.broadXs[i],
            waveSeed * 0.731 + trig.broadYs[i],
            waveTime
          ) -
            0.5) *
          2;
        const detailWave =
          (noise(
            detailSeed + trig.detailXs[i],
            detailSeed * 0.731 + trig.detailYs[i],
            waveTime * 1.05
          ) -
            0.5) *
          2;
        samples[i] = broadWave * 1.2 + detailWave * 0.1;
      }

      // Reuse fixed-length arrays to reduce temporary objects and
      // garbage-collection jitter during continuous animation.
      fields[seedOffset] = samples;
    }

    return fields;
  }

  // Retrieve adjacent waveform frames and their interpolation ratio from the fixed-frequency cache.
  getWaveState(now) {
    return advanceCache(
      this,
      now,
      guardCfg.waveCacheTps,
      this.waveCachePhase,
      "waveCache",
      "waveState",
      "buildWaveFields"
    );
  }

  // Spatially interpolate the waveform before blending adjacent time frames,
  // keeping ring lines continuous during rotation and cache updates.
  sampleWave(state, seedOffset, angle) {
    const segments = guardCfg.waveSegments;
    const normAngl = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    const samplePosition = (normAngl / TWO_PI) * segments;
    const index0 = Math.floor(samplePosition) % segments;
    const index1 = (index0 + 1) % segments;
    const spatialMix = samplePosition - Math.floor(samplePosition);
    const currentSamples = state.current[seedOffset];
    const nextSamples = state.next[seedOffset];
    const currentValue =
      currentSamples[index0] +
      (currentSamples[index1] - currentSamples[index0]) * spatialMix;
    const nextValue =
      nextSamples[index0] + (nextSamples[index1] - nextSamples[index0]) * spatialMix;
    return currentValue + (nextValue - currentValue) * state.mix;
  }

  updtDrfPluVsl(frameMs) {
    // Drifting symbols visualize the Guardian's response direction while
    // preserving the original cluster structure and subtle roaming.
    const elapsedMs = clamp(
      Number(frameMs) || 0,
      0,
      driftCfg.frameMsMax
    );
    const crssCareActv = this.crssPlusCareMs > 0;
    this.crssPlusCareMs = max(
      0,
      this.crssPlusCareMs - elapsedMs
    );
    const seconds = (this.plusClockMs ?? 0) * 0.001;
    const drawScale =
      eco.drawScale * this.sz * scaleOf(this.type) * this.b;
    const plusMaxRad =
      (infoRadius(this) * plusCfg.rangeScale) /
      max(0.001, drawScale);
    const invrsRotCos = cos(this.rot);
    const invrsRotSin = sin(this.rot);
    const hasRawAttnDir =
      Number.isFinite(this.attnDirX) &&
      Number.isFinite(this.attnDirY) &&
      this.attnTgtDist > 0;
// Interpolate direction by angle so the Guardian's pose transitions smoothly.
    if (hasRawAttnDir) {
      if (
        !Number.isFinite(this.attnDirSmoothX) ||
        !Number.isFinite(this.attnDirSmoothY)
      ) {
        this.attnDirSmoothX =
          this.attnDirX;
        this.attnDirSmoothY =
          this.attnDirY;
      } else {
        const directionMix =
          1 -
          Math.exp(
            -elapsedMs /
              driftCfg.dirSmthMs
          );
        const currentAngle = atan2(
          this.attnDirSmoothY,
          this.attnDirSmoothX
        );
        const targetAngle = atan2(
          this.attnDirY,
          this.attnDirX
        );
        const angleDelta = atan2(
          sin(targetAngle - currentAngle),
          cos(targetAngle - currentAngle)
        );
        const nextAngle = currentAngle + angleDelta * directionMix;
        this.attnDirSmoothX = cos(nextAngle);
        this.attnDirSmoothY = sin(nextAngle);
      }
    } else {
      this.attnDirSmoothX = null;
      this.attnDirSmoothY = null;
    }
// Smoothed direction maintains spatial orientation while
// the individual waveform preserves the body's rhythm.
    const hasAttnDir =
      Number.isFinite(this.attnDirSmoothX) &&
      Number.isFinite(this.attnDirSmoothY) &&
      this.attnTgtDist > 0;
    const attnTimlMs =
      this.attnPlusPow * this.attnPlusApprMs;
    const positionMix =
      1 -
      Math.exp(
        -elapsedMs / driftCfg.posSmthMs
      );
    const alphaMix =
      1 -
      Math.exp(
        -elapsedMs / driftCfg.alphaSmoothMs
      );
    const elapsedSeconds = elapsedMs * 0.001;
    // Each symbol uses an independent delay to approach the target in sequence,
    // expressing shared awareness as gradual gathering.
    for (let plusIndex = 0; plusIndex < this.driftPluses.length; plusIndex++) {
      const plus = this.driftPluses[plusIndex];
      const t = seconds * plus.speed + plus.phase;
      const radius =
        plus.radius +
        sin(t) * plus.radialAmp +
        sin(t * 0.47 + plus.phase) * plus.radialAmp * 0.35;
      const angle = plus.angle + sin(t * 0.73 + plus.phase * 1.7) * plus.angularAmp;
      let x;
      let y;
      // Clustered symbols breathe around a shared center, while
      // outliers continue drifting along their own polar coordinates.
      if (plus.clusterIndex >= 0) {
        const clusterBreath =
          1 +
          sin(
            seconds * plus.groupBrthSpd +
              plus.groupBrthPhs
          ) *
            driftPlusCfg.groupBrthAmp;
        const localDrift = plus.radialAmp * 0.45;
        x =
          plus.clusterX +
          plus.clusterOffsetX * clusterBreath +
          sin(t + plus.phase) * localDrift;
        y =
          plus.clusterY +
          plus.clusterOffsetY * clusterBreath +
          cos(t * 0.83 + plus.phase * 1.3) * localDrift;
      } else {
        x = cos(angle) * radius;
        y = sin(angle) * radius;
      }
      const attnMoveProg = clamp(
        (attnTimlMs - plus.attnApprDlyMs) /
          max(1, plus.attnMoveMs),
        0,
        1
      );
      const attnMovePower =
        cubicSmoothstep(attnMoveProg);
      // Convert world direction into Guardian-local coordinates so symbols
      // continue pointing toward the same target after body rotation.
      if (hasAttnDir && attnMovePower > 0) {
        const localX =
          this.attnDirSmoothX * invrsRotCos +
          this.attnDirSmoothY * invrsRotSin;
        const localY =
          -this.attnDirSmoothX * invrsRotSin +
          this.attnDirSmoothY * invrsRotCos;
        const localDistance =
          this.attnTgtDist / max(0.001, drawScale);
        if (localDistance > 0.001) {
          const targetRadius = min(
            plusMaxRad,
            localDistance
          );
          const directionX = localX;
          const directionY = localY;
          const sideX = -directionY;
          const sideY = directionX;
          const clusterWander =
            sin(
              seconds * plus.attnGroupSpd +
                plus.attnGroupPhs
            ) * plusCfg.wander;
          const groupWndrSide =
            cos(
              seconds * plus.attnGroupSpd * 0.73 +
                plus.attnGroupPhs
            ) * plusCfg.wander;
          const memberWander =
            sin(
              seconds * plus.attnWndrSpd +
                plus.attnWndrPhs
            ) * plus.attnMmbrWndr;
          // Add the slow roaming of both cluster and member to the target direction,
          // producing an organic convergence of symbols.
          const frwrdDist =
            targetRadius *
            clamp(
              plus.attnFrwrd +
                clusterWander * 0.34 +
                memberWander * 0.28,
              plusCfg.forwardMin,
              plusCfg.forwardMax
            );
          const sideDistance =
            targetRadius *
            clamp(
              plus.attentionSide + groupWndrSide + memberWander,
              -plusCfg.sideSpread,
              plusCfg.sideSpread
            );
          let desiredX =
            directionX * frwrdDist + sideX * sideDistance;
          let desiredY =
            directionY * frwrdDist + sideY * sideDistance;
          const dsrdDist = sqrt(
            desiredX * desiredX + desiredY * desiredY
          );
          if (dsrdDist > plusMaxRad) {
            const rangeScale = plusMaxRad / dsrdDist;
            desiredX *= rangeScale;
            desiredY *= rangeScale;
          }
          x = lerp(x, desiredX, attnMovePower);
          y = lerp(y, desiredY, attnMovePower);
        }
      }
      // Calculate opacity separately after position has settled.
      const idleAlphProg = clamp(
        (plus.alpha - driftPlusCfg.alphaMin) /
          max(
            0.001,
            driftPlusCfg.alphaMax -
              driftPlusCfg.alphaMin
          ),
        0,
        1
      );
      const rawAlpha = lerp(
        driftCfg.idleAlphaMin,
        driftCfg.idleAlphaMax,
        idleAlphProg
      );
      const alphaKnee = driftCfg.alphaSoftKnee;
      const alphaRange = driftCfg.alphaSoftRange;
      const targetAlpha =
        rawAlpha <= alphaKnee
          ? rawAlpha
          : alphaKnee +
            alphaRange *
              (1 - Math.exp(-(rawAlpha - alphaKnee) / alphaRange));
      const prevVisX = plus.visualX;
      const prevVisY = plus.visualY;
      if (!Number.isFinite(plus.visualX)) plus.visualX = x;
      else plus.visualX = lerp(plus.visualX, x, positionMix);
      if (!Number.isFinite(plus.visualY)) plus.visualY = y;
      else plus.visualY = lerp(plus.visualY, y, positionMix);
      if (!Number.isFinite(plus.visualAlpha)) {
        plus.visualAlpha = targetAlpha;
      } else {
        plus.visualAlpha = lerp(
          plus.visualAlpha,
          targetAlpha,
          alphaMix
        );
      }
      // Screen-space speed determines visual emphasis, increasing brightness and line width when
      // movement is perceptible to participants.
      const mvdScrnDist =
        Number.isFinite(prevVisX) &&
        Number.isFinite(prevVisY)
          ? sqrt(
              (plus.visualX - prevVisX) ** 2 +
                (plus.visualY - prevVisY) ** 2
            ) * drawScale
          : 0;
      const motionSpeed =
        elapsedSeconds > 0 ? mvdScrnDist / elapsedSeconds : 0;
      const speedFilterMix =
        1 -
        Math.exp(
          -elapsedMs /
            max(1, driftCfg.mtnSpdFltrMs)
        );
      plus.filtMtnSpd = crssCareActv
        ? 0
        : lerp(plus.filtMtnSpd, motionSpeed, speedFilterMix);
      const prevMovePow =
        plus.prevMovePow;
      const attnTurnSpd =
        elapsedSeconds > 0
          ? abs(
              attnMovePower -
                prevMovePow
            ) / elapsedSeconds
          : 0;
      plus.prevMovePow = attnMovePower;
      const reachedAttnPos =
        attnMovePower >= 0.999 &&
        prevMovePow < 0.999;
      // Briefly retain movement brightness after reaching the target,
      // giving the gathered result time to be seen.
      if (reachedAttnPos && !crssCareActv) {
        plus.mtnAlphHoldMs =
          driftCfg.mtnAlphHoldMs;
      } else {
        plus.mtnAlphHoldMs = max(
          0,
          plus.mtnAlphHoldMs - elapsedMs
        );
      }
      const plnndRelc =
        !crssCareActv &&
        (this.attnPhase === "traveling" ||
          attnTurnSpd >=
            driftCfg.mtnTxSpdMin);
      // Use different speed thresholds for activation and deactivation.
      if (!plnndRelc) {
        plus.motionActive = false;
      } else if (plus.motionActive) {
        plus.motionActive =
          plus.filtMtnSpd >=
          driftCfg.motionSpeedOff;
      } else {
        plus.motionActive =
          plus.filtMtnSpd >=
          driftCfg.motionSpeedOn;
      }
      // Map visible speed to smoothly varying emphasis, with
      // independent timescales for activation, hold, and release.
      const motionProgress = plus.motionActive
        ? clamp(
            (plus.filtMtnSpd -
              driftCfg.motionSpeedOff) /
              max(
                0.001,
                driftCfg.motionSpeedMax -
                  driftCfg.motionSpeedOff
              ),
            0,
            1
          )
        : 0;
      const motionTarget =
        cubicSmoothstep(motionProgress);
      const mtnSmoothMs =
        motionTarget > plus.motionStrength
          ? driftCfg.motionAttackMs
          : driftCfg.mtnFreeMs;
      const motionMix =
        1 - Math.exp(-elapsedMs / max(1, mtnSmoothMs));
      plus.motionStrength = lerp(
        plus.motionStrength,
        motionTarget,
        motionMix
      );
// Sustain brightness while symbol movement or its hold timer
// remains active, then recede over the release duration.
      const mtnAlphTgt =
        plus.motionActive || plus.mtnAlphHoldMs > 0 ? 1 : 0;
      const mtnAlphSmthMs =
        mtnAlphTgt > plus.mtnAlphPow
          ? driftCfg.motionAttackMs
          : driftCfg.mtnFreeMs;
      const motionAlphaMix =
        1 - Math.exp(-elapsedMs / max(1, mtnAlphSmthMs));
      plus.mtnAlphPow = lerp(
        plus.mtnAlphPow,
        mtnAlphTgt,
        motionAlphaMix
      );
    }
  }

  // Advance the plus-minus symbol blend over the configured duration,
  // extending or retracting the vertical stroke with the ratio.
  updtDrftTurn(elapsedMs) {
    const target = this.guardSigns ? 1 : 0;
    const step =
      max(0, Number(elapsedMs) || 0) /
      max(1, guardCfg.symblMnsTxMs);
    this.drftSymMnsMix =
      target > this.drftSymMnsMix
        ? min(target, this.drftSymMnsMix + step)
        : max(target, this.drftSymMnsMix - step);
  }

  driftSymbolY(symbol) {
    return this.drftSymblYScl(symbol, "base");
  }

  // Combine mode and individual parameters to determine vertical symbol scale,
  // keeping detection feedback distinct from ordinary drift.
  drftSymblYScl(symbol, mode = "base") {
    if (mode === "plus") return 1;
    if (mode === "minus" || symbol?.baseSymbol !== "plus") return 0;
    const progress = clamp(this.drftSymMnsMix || 0, 0, 1);
    const eased = cubicSmoothstep(progress);
    return 1 - eased;
  }

  // Adjust stroke weight by symbol hierarchy and mode, preserving visual layering at small sizes.
  drftSymblWght(symbol, mode = "base") {
    const progress =
      mode === "plus"
        ? 0
        : mode === "minus" || symbol?.baseSymbol !== "plus"
          ? 1
          : symbol?.baseSymbol === "plus"
        ? clamp(this.drftSymMnsMix || 0, 0, 1)
        : 1;
    const eased = cubicSmoothstep(progress);
    return lerp(1, guardCfg.drftMnsWghtMul, eased);
  }

  // Store the starting and ending symbol states for a mode transition.
  beginDriftFade(fromMode, toMode) {
    if (fromMode === toMode) {
      this.drftSymblMode = toMode;
      this.driftSignMix = null;
      return;
    }
    this.drftSymblMode = fromMode;
    this.driftSignMix = {
      fromMode,
      toMode,
      elapsedMs: 0,
    };
  }

  // Advance the drift crossfade independently of body movement,
  // releasing the previous-mode symbol only after completion.
  updtDrftFade(elapsedMs) {
    const transition = this.driftSignMix;
    if (!transition) return;
    transition.elapsedMs += max(0, Number(elapsedMs) || 0);
    if (
      transition.elapsedMs >=
      guardCfg.symblCrssMs
    ) {
      this.drftSymblMode = transition.toMode;
      this.driftSignMix = null;
    }
  }

  // Return the current symbol mode; during transition, return
  // both old and new modes with their respective fade weights.
  drftSymRndLyr() {
    const transition = this.driftSignMix;
    if (!transition) {
      return [{ mode: this.drftSymblMode, alpha: 1 }];
    }
    const elapsedMs = clamp(
      transition.elapsedMs,
      0,
      guardCfg.symblCrssMs
    );
    const outProgress = clamp(
      elapsedMs / guardCfg.symblCrssOutMs,
      0,
      1
    );
    const fadeInDelayMs =
      guardCfg.symblCrssMs -
      guardCfg.symblCrssInMs;
    const inProgress = clamp(
      (elapsedMs - fadeInDelayMs) /
        guardCfg.symblCrssInMs,
      0,
      1
    );
    const outEased = cubicSmoothstep(outProgress);
    const inEased = cubicSmoothstep(inProgress);
    return [
      { mode: transition.fromMode, alpha: 1 - outEased },
      { mode: transition.toMode, alpha: inEased },
    ].filter((layer) => layer.alpha > 0.001);
  }

  drawDrftPlss(col) {
    // Skip instance rendering when the care view takes ownership of the symbols.
    if (usesDetcPlus(this)) return;
    const drawScale =
      eco.drawScale * this.sz * scaleOf(this.type) * this.b;
    // Set a minimum screen-space line width for scaled symbols.
    const minLclWght =
      driftCfg.minScrnWght /
      max(0.001, drawScale);
    noFill();
    strokeCap(ROUND);
    for (const plus of this.driftPluses) {
      if ((plus.relDetcUntl || 0) > relClckNow()) continue;
      const x = Number.isFinite(plus.visualX)
        ? plus.visualX
        : cos(plus.angle) * plus.radius;
      const y = Number.isFinite(plus.visualY)
        ? plus.visualY
        : sin(plus.angle) * plus.radius;
      const alpha = Number.isFinite(plus.visualAlpha)
        ? plus.visualAlpha
        : plus.alpha;
      const motionStrength = clamp(plus.motionStrength || 0, 0, 1);
      const mtnAlphPow = clamp(
        plus.mtnAlphPow || 0,
        0,
        1
      );
      const mtnAlphProg = clamp(
        (alpha - driftCfg.idleAlphaMin) /
          max(
            0.001,
            driftCfg.idleAlphaMax -
              driftCfg.idleAlphaMin
          ),
        0,
        1
      );
      const enhnMtnAlph = lerp(
        driftCfg.motionAlphaMin,
        driftCfg.motionAlphaMax,
        mtnAlphProg
      );
      const motionAlpha = lerp(
        alpha,
        enhnMtnAlph,
        mtnAlphPow
      );
      const baseWeight = max(
        plus.weight * driftCfg.weightMul *
          lerp(
            1,
            driftCfg.mtnWghtMul,
            motionStrength
          ),
        minLclWght
      );
      const plusSize =
        plus.size * driftCfg.sizeMul *
        lerp(
          1,
          driftCfg.motionSizeMul,
          motionStrength
        );
      push();
      translate(x, y);
      rotate(-this.rot);
      for (const layer of this.drftSymRndLyr()) {
        stroke(col[0], col[1], col[2], motionAlpha * layer.alpha);
        strokeWeight(
          baseWeight * this.drftSymblWght(plus, layer.mode)
        );
        line(-plusSize, 0, plusSize, 0);
        const verticalScale = this.drftSymblYScl(
          plus,
          layer.mode
        );
        if (verticalScale > 0.001) {
          line(0, -plusSize * verticalScale, 0, plusSize * verticalScale);
        }
      }
      pop();
    }
  }

  // Sample the Guardian cache around the full circle so protective
  // rings and body share the same organic contour language.
  drawWavyCircle(waveState, diameter, amplitude, seedOffset) {
    const segments = guardCfg.waveSegments;
    const radius = diameter * 0.5;
    const trig = getCircleTrig(segments);

    beginShape();
    for (let i = -1; i <= segments + 1; i++) {
      const wrapped = ((i % segments) + segments) % segments;
      const angle = (TWO_PI * wrapped) / segments;
      const r = radius + this.sampleWave(waveState, seedOffset, angle) * amplitude;
      curveVertex(trig.cosines[wrapped] * r, trig.sines[wrapped] * r);
    }
    endShape(CLOSE);
  }

  // Sample a specified angular section of the waveform arc,
  // embedding scan and progress into the existing ring.
  drawWavyArc(waveState, diameter, start, end, amplitude, seedOffset) {
    const radius = diameter * 0.5;
    const segments = max(
      12,
      ceil((guardCfg.waveSegments * abs(end - start)) / TWO_PI)
    );

    beginShape();
    for (let i = -1; i <= segments + 1; i++) {
      const pointIndex = clamp(i, 0, segments);
      const u = pointIndex / segments;
      const angle = lerp(start, end, u);
      const edgeFade = sin(PI * u);
      const r =
        radius +
        this.sampleWave(waveState, seedOffset, angle) * amplitude * edgeFade;
      curveVertex(cos(angle) * r, sin(angle) * r);
    }
    endShape();
  }

  // Construct ring arrows along the tangent and align them with rotation,
  // giving the cyclical protective motion a clear direction.
  drawArcArrow(col, diameter, angle, direction, alpha, weight, length, spread, advance) {
    const radius = diameter * 0.5;
    const radialX = cos(angle);
    const radialY = sin(angle);
    const tangentX = -radialY * direction;
    const tangentY = radialX * direction;
    const tipX = radialX * radius + tangentX * advance;
    const tipY = radialY * radius + tangentY * advance;
    const baseX = tipX - tangentX * length;
    const baseY = tipY - tangentY * length;

    stroke(col[0], col[1], col[2], alpha);
    strokeWeight(weight);
    beginShape();
    vertex(baseX + radialX * spread, baseY + radialY * spread);
    vertex(tipX, tipY);
    vertex(baseX - radialX * spread, baseY - radialY * spread);
    endShape();
  }

  // Position symbols on the circular orbit, modulate
  // opacity with plusBreath, and draw strokes in layers.
  drawTrackPlus(
    col,
    plusBreath,
    radius,
    angle,
    direction,
    alpha,
    advance,
    side,
    radialSide,
    distanceScale,
    distance,
    outward,
    size,
    weight,
    baseSymbol = "plus"
  ) {
    const trackRadius = radius + outward * radialSide;
    const anchorAngle = angle + direction * (advance / trackRadius);
    const plusAngle =
      anchorAngle - direction * ((distance * distanceScale * side) / trackRadius);
    const tangentX = -sin(plusAngle);
    const tangentY = cos(plusAngle);
    const radialX = cos(plusAngle);
    const radialY = sin(plusAngle);
    const x = radialX * trackRadius;
    const y = radialY * trackRadius;
    const plusSize = size * guardCfg.trckPluSizMul;

    const symbol = { baseSymbol };
    const baseAlpha = min(
      255,
      alpha * plusBreath * guardCfg.plusAlphMul
    );
    for (const layer of this.drftSymRndLyr()) {
      stroke(col[0], col[1], col[2], baseAlpha * layer.alpha);
      strokeWeight(
        weight * this.drftSymblWght(symbol, layer.mode)
      );
      line(
        x - tangentX * plusSize,
        y - tangentY * plusSize,
        x + tangentX * plusSize,
        y + tangentY * plusSize
      );
      const verticalScale = this.drftSymblYScl(
        symbol,
        layer.mode
      );
      if (verticalScale > 0.001) {
        line(
          x - radialX * plusSize * verticalScale,
          y - radialY * plusSize * verticalScale,
          x + radialX * plusSize * verticalScale,
          y + radialY * plusSize * verticalScale
        );
      }
    }
  }

  // Combine plus and minus symbols at different distances and sizes
  // to form an attention trail moving with the Guardian's direction.
  drawArrwPlss(
    col,
    plusBreath,
    diameter,
    angle,
    direction,
    alpha,
    advance,
    side = 1,
    radialSide = 1,
    distanceScale = 1
  ) {
    const radius = diameter * 0.5;
    this.drawTrackPlus(
      col,
      plusBreath,
      radius,
      angle,
      direction,
      alpha,
      advance,
      side,
      radialSide,
      distanceScale,
      22,
      16,
      5.8,
      4.2,
      "plus"
    );
    this.drawTrackPlus(
      col,
      plusBreath,
      radius,
      angle,
      direction,
      alpha,
      advance,
      side,
      radialSide,
      distanceScale,
      44,
      16,
      4.7,
      3.4,
      "minus"
    );
  }

  drawDrfPluLyr(ctx) {
    const col = eco.lifeColor.Guardian;
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b);
    applyGlowStyle(lifeGlow.guardian);
    this.drawDrftPlss(col);
    applyGlowStyle(lifeGlow.none);
    pop();
  }

  // 6. Convergence, approach, and protection become its living posture
  draw(ctx) {
    this.renderBodyOnly = true;
    try {
      drawLifeCache(this, ctx, this.drawVector);
    } finally {
      this.renderBodyOnly = false;
    }

    this.drawDrfPluLyr(ctx);
    drawGuardRings(this, ctx);
  }

  // Restrained circular movement expresses care as shelter.
  drawRingShape(waveState, col, plusBreath, kind) {
    noFill();
    strokeCap(ROUND);
    strokeJoin(ROUND);

    if (kind === "outer") {
      const repairWeight = this.grdRprRing ?? 1;
      const start = PI * 0.6 + this.r1 + 0.07;
      const end = PI * 2.1 + this.r1;
      strokeWeight(10.4 * repairWeight);
      stroke(col[0], col[1], col[2], 215);
      this.drawWavyArc(waveState, 165, start, end, guardCfg.outerRingAmp, 870);
      this.drawArcArrow(
        col,
        165,
        end,
        1,
        215,
        5 * repairWeight,
        12.3,
        10.2,
        6.5
      );
      this.drawArrwPlss(col, plusBreath, 165, start, 1, 215, 0, 1, 0, 0.85);
      return;
    }

    const start = -PI * 0.2 + this.r2;
    const end = PI * 1.3 + this.r2 - 0.07;
    strokeWeight(9.4);
    stroke(col[0], col[1], col[2], 150);
    this.drawWavyArc(waveState, 124, start, end, guardCfg.innerRingAmp, 950);
    this.drawArcArrow(col, 124, start, -1, 150, 4.4, 10.9, 9, 6);
    this.drawArrwPlss(col, plusBreath, 124, end, -1, 150, 0, 1, 0, 0.85);
  }

  // Ring-cache requests draw the specified inner or outer ring.
  drawRingVector(ctx, kind) {
    const col = eco.lifeColor.Guardian;
    const now = this.actvClckMs ?? ctx.now;
    const waveState = this.getWaveState(now);
    const plusBreath =
      guardCfg.plusBreathMin +
      (guardCfg.plusBreathMax - guardCfg.plusBreathMin) *
        (0.5 +
          0.5 * sin(now * 0.001 * guardCfg.plusBrthSpd + this.seed * 0.001));
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b);
    applyGlowStyle(lifeGlow.guardian);
    this.drawRingShape(waveState, col, plusBreath, kind);
    applyGlowStyle(lifeGlow.none);
    pop();
  }

  // Vector rendering layers the body, protective rings, and drifting symbols,
  // respecting local render flags passed by the cache.
  drawVector(ctx) {
    const col = eco.lifeColor.Guardian;
    const now = this.actvClckMs ?? ctx.now;
    const waveState = this.getWaveState(now);
    const plusBreath =
      guardCfg.plusBreathMin +
      (guardCfg.plusBreathMax - guardCfg.plusBreathMin) *
        (0.5 +
          0.5 *
            sin(now * 0.001 * guardCfg.plusBrthSpd + this.seed * 0.001));
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    scale(eco.drawScale * this.sz * scaleOf(this.type) * this.b);

    applyGlowStyle(lifeGlow.guardian);

    if (!this.rndrRngsOnly) {
      noStroke();
      fill(col[0], col[1], col[2], 20);
    this.drawWavyCircle(waveState, 86, guardCfg.outerGlowAmp, 710);
    fill(col[0], col[1], col[2], 27);
      this.drawWavyCircle(waveState, 48, guardCfg.innerGlowAmp, 790);
    }

    if (!this.renderBodyOnly) {
      this.drawRingShape(waveState, col, plusBreath, "outer");
      this.drawRingShape(waveState, col, plusBreath, "inner");
    }

    applyGlowStyle(lifeGlow.none);

    pop();
  }
}

// 7. The Guardian enters a broader relationship of care
// The Guardian class and GuardianBehavior below together form the complete lifeform module.

// 1. Care gradually emerges through shared attention
// I organize care through scanning, approach, and repair,
// giving shared attention an opportunity to become action.

// 2. Every phase of a relationship of care
let careWaveSeq = 0;
const guardSeedClst = [];
let careGlowFades = [];
let carePanelBox = null;
const careLinkFades = [];
const guardTypeCuts = {
  [window.SketchConfig.eco.lifeType.predator]: {
    scale: 1,
    alpha: 1,
    startScale: 1,
    startAlpha: 1,
    targetScale: 1,
    targetAlpha: 1,
    elapsedMs: 0,
    active: false,
    count: 0,
  },
  [window.SketchConfig.eco.lifeType.parasite]: {
    scale: 1,
    alpha: 1,
    startScale: 1,
    startAlpha: 1,
    targetScale: 1,
    targetAlpha: 1,
    elapsedMs: 0,
    active: false,
    count: 0,
  },
  [window.SketchConfig.eco.lifeType.roamer]: {
    scale: 1,
    alpha: 1,
    startScale: 1,
    startAlpha: 1,
    targetScale: 1,
    targetAlpha: 1,
    elapsedMs: 0,
    active: false,
    count: 0,
    crossLimit: true,
  },
  [window.SketchConfig.eco.lifeType.deepDiver]: {
    scale: 1,
    alpha: 1,
    startScale: 1,
    startAlpha: 1,
    targetScale: 1,
    targetAlpha: 1,
    elapsedMs: 0,
    active: false,
    count: 0,
    crossLimit: true,
  },
};
// phase manages interaction stages visible to participants; interveneKind selects the actual limiting,
// clearing, protecting, or supporting action.
// Top-level phase: solo care moves from idle through scanning and action phases into panel;
// accepted multiplayer care moves from scanning into relational.
// Top-level action phases include cross-detaching, guardian-wrapping, protection-approaching,
// support-transferring, and support-settling.
// limitLinks and shields each track target substates;
// interruption switches the top-level phase to canceling.
// An active relationship of care owns one source; completion, cancellation,
// and tracking departure release participants, connections, shields, and temporary visual state.
// Multiplayer care requires responses from other participants, while solo care enters scanning directly;
// both paths ultimately release the session lock and return to idle.
// This function was modified with the assistance of ChatGPT.
function crtGuardCare() {
  return {
  // Candidate-loss, receding, and lure-detachment state support care-trigger evaluation during idle.
  candidate: null,
  candLvMs: 0,
  receding: [],
  lureBrkCand: null,
  lureBrkCnfrmMs: 0,
  lureBrkOtsdMs: 0,
  activationMs: 0,
  focusMs: 0,
  // Progress position and rest state together describe the Guardian's approach to a candidate.
  progressX: null,
  progressY: null,
  progressAtRest: false,
  // release, leave, and encounter timers govern normal
  // departure and the time limit of a single encounter.
  releaseMs: 0,
  reqrFree: false,
  leaveMs: 0,
  encnElapsedMs: 0,
  isEncnTmd: false,
  // Cancellation fields store the return animation, while the
  // completion path advances independently through normal care phases.
  canceling: false,
  cnclElapsedMs: 0,
  cnclDurMs: 0,
  cnclCompRpr: false,
  // phase determines the visible stage; panel fields are active during result explanation.
  phase: "idle",
  phaseElapsedMs: 0,
  panelRevealMs: 0,
  pnlFadeStart: false,
  pnlFadElaMs: 0,
  // source, participants, and waveform geometry remain stable within one care session.
  source: null,
  participants: [],
  centerX: 0,
  centerY: 0,
  maximumRadius: 0,
  waveProfile: [],
  wavePrflNext: [],
  waveCntrPrfl: [],
  wavePrflRot: 0,
  waveGlblShp: null,
  panelSide: 1,
  // Species counts determine the ecological operation;
  // interveneKind stores the explicit decision for its action branch.
  speciesCounts: null,
  suppressType: null,
  peerSuppType: null,
  protectType: null,
  careTarget: null,
  limitLinks: [],
  interveneKind: null,
  // Save position, scale, and opacity at phase transitions
  // so subsequent animation can continue smoothly.
  tgtStrtScl: 1,
  tgtStrtAlph: 1,
  wrapScale: 1,
  wrapStartX: 0,
  wrapStartY: 0,
  returnStartX: 0,
  returnStartY: 0,
  shieldStartX: 0,
  shieldStartY: 0,
  shieldDirX: 1,
  shieldDirY: 0,
  shldDurMs: 0,
  shldStrtScl: 1,
  // Writes to protective relationships are confined to
  // the protection phase; other phases read or clear them.
  shieldTarget: null,
  shields: [],
  shieldSequence: 0,
  // Preserve repair and regeneration results until the panel or relationship phase ends.
  links: [],
  parents: [],
  newborns: [],
  boostStarted: false,
  birthRolls: [],
  repairApplied: false,
  rprUsgSttld: false,
  // sequence identifies the care cycle; lggdCond stores result keys already logged during this cycle.
  sequence: 0,
  lggdCond: new Set(),
  // Collaboration fields are active along multiplayer invitation and relational-care paths.
  collabStatus: "idle",
  collabMode: "single",
  offerElapsedMs: 0,
  cllbAccWndMs: {},
  signals: {},
  collIds: [],
  linkStates: {},
  };
}
// New temporary fields must return to their initial values in
// rstGuardCare so the next care sequence begins from a clean state.
// This module advances ecological phases, shields, repair batches, and regeneration seeds;
// the view maintains agreed progress coordinates and connection state.
let careState = crtGuardCare();

function getCarOwnSss() {
  return sessions.find(
    (session) =>
      session.careState.collabMode === "relational" &&
      session.careState.collabStatus === "accepted" &&
      session.careState.phase !== "idle"
  ) || null;
}

const care = Object.freeze({
  get state() {
    return careState;
  },
  set state(value) {
    careState = value;
  },
  attnDistSq: (...args) => careAttnDistSq(...args),
  updateReceding: (...args) => updtRecdCare(...args),
  updtSpcFade: (...args) => updCarTypFad(...args),
  updateClear: (...args) => updtCareClr(...args),
  rstSpcFade: (...args) => rstCareSpcFade(...args),
  resumeReceding: (...args) => rsmRecdCare(...args),
  updateRepair: (...args) => updtCareRpr(...args),
  getOwnrSssn: (...args) => getCarOwnSss(...args),
  strtSpcFade: (...args) => strtCarSpcFad(...args),
  updtLmtFade: (...args) => updtCarLmtFad(...args),
  baseRadius: (...args) => careBaseRadius(...args),
  regrFltr: (...args) => careRegrFltr(...args),
  queueReceding: (...args) => qRecdCare(...args),
  findRegrSeed: (...args) => findCarRegSee(...args),
  findAttnTgt: (...args) => findCarAttTgt(...args),
  updateShield: (...args) => updtShldAppr(...args),
  startShield: (...args) => strtShldAppr(...args),
  getSeedTx: (...args) => getSeedTx(...args),
  abndnLmtPrst: (...args) => abndnLmtPrst(...args),
  getLinkPairs: (...args) => getCareLinkPrs(...args),
  remapViewport: (...args) => rmpCareViwp(...args),
  resetRegrowth: (...args) => rstCareRegr(...args),
  settle: (...args) => settleCare(...args),
  updtSeedRegr: (...args) => updtSeedRegr(...args),
  seedBodyAlpha: (...args) => careSeeBodAlp(...args),
  drawDetcPlss: (...args) => drawDetcPlss(...args),
  strtLmtSpc: (...args) => strtLmtSpc(...args),
  getAttrTrgts: (...args) => getAttrTrgts(...args),
  crtSeedGroup: (...args) => crtSeedGroup(...args),
  drawShldLine: (...args) => drawShldLine(...args),
  strtLmtTgt: (...args) => strtLmtTgt(...args),
  getSpeciesFade: (...args) => getSpeciesFade(...args),
  crtComp: (...args) => crtCareComp(...args),
});

// A new care sequence increments the relationship
// identifier and clears the condition-deduplication table.
function bgnCareLogSeq() {
  care.state.sequence++;
  care.state.lggdCond.clear();
  return care.state.sequence;
}

// Care logging centrally adds participant count and relationship sequence,
// keeping deduplication semantics consistent across phases.
function recordCareNote(condition, now, options = {}) {
  if (care.state.lggdCond.has(condition)) return null;
  const source = options.source || care.state.source;
  if (!source) return null;
  care.state.lggdCond.add(condition);
  return rcrdSurvNote(
    "Guardian",
    condition,
    source,
    now,
    {
      sessionId: activeSession?.id,
      sequence: care.state.sequence || 1,
      participantCount: options.participantCount,
      priority: options.priority,
      metadata: options.metadata,
    }
  );
}

// Resetting the species fade also clears its source and target values.
function rstCareSpcFade() {
  for (const state of Object.values(guardTypeCuts)) {
    state.scale = 1;
    state.alpha = 1;
    state.startScale = 1;
    state.startAlpha = 1;
    state.targetScale = 1;
    state.targetAlpha = 1;
    state.elapsedMs = 0;
    state.active = false;
    state.count = 0;
  }
}

// Store the current value and target type when a species fade begins.
function strtCarSpcFad(type) {
  const state = guardTypeCuts[type];
  if (
    !state ||
    state.count >= guardCfg.clrTypeCutLmt
  ) {
    return false;
  }
  state.startScale = state.scale;
  state.startAlpha = state.alpha;
  state.targetScale *=
    guardCfg.clrSpcScl;
  state.targetAlpha *=
    guardCfg.clrTypeAlphMul;
  state.elapsedMs = 0;
  state.active = true;
  state.count++;
  return true;
}

// Species fades advance on a shared phase clock, preserving consistent
// transition speed when multiple Guardians intervene simultaneously.
function updCarTypFad(elapsedMs) {
  for (const state of Object.values(guardTypeCuts)) {
    if (state.crossLimit) continue;
    if (!state.active) continue;
    state.elapsedMs += elapsedMs;
    const progress = clamp(
      state.elapsedMs /
        max(1, guardCfg.clrSpcTxMs),
      0,
      1
    );
    const eased = cubicSmoothstep(progress);
    state.scale = lerp(state.startScale, state.targetScale, eased);
    state.alpha = lerp(state.startAlpha, state.targetAlpha, eased);
    if (progress >= 1) state.active = false;
  }
}

function strtLmtTgt(target) {
  if (!target) return false;
  const count = target.guardLmtSizeN || 0;
  if (count >= guardCfg.lmtCutLmt) return false;
  const currentScale = Number.isFinite(target.careScale)
    ? target.careScale
    : 1;
  const previousTarget = Number.isFinite(target.guardLmtSclTgt)
    ? target.guardLmtSclTgt
    : currentScale;
  target.guardLmtSclTgt =
    previousTarget * guardCfg.limitSizeScale;
  target.grdLmtScl = {
    elapsedMs: 0,
    fromScale: currentScale,
  };
  target.guardLmtSizeN = count + 1;
  return true;
}

function strtLmtSpc(type) {
  const state = guardTypeCuts[type];
  if (
    !state?.crossLimit ||
    state.count >= guardCfg.lmtCutLmt
  ) {
    return false;
  }
  state.startAlpha = state.alpha;
  state.targetAlpha *= guardCfg.lmtAlphScl;
  state.elapsedMs = 0;
  state.active = true;
  state.count++;
  return true;
}

function updtCarLmtFad(links, elapsedMs) {
  // Species-limit effects decay independently by relationship,
  // retaining brief result visibility after the final target leaves.
  const targets = [...new Set((links || []).map((link) => link.target))]
    .filter(Boolean);
  for (const target of targets) {
    const transition = target.grdLmtScl;
    if (!transition) continue;
    transition.elapsedMs += elapsedMs;
    const progress = clamp(
      transition.elapsedMs /
        max(1, guardCfg.lmtTxMs),
      0,
      1
    );
    const eased = cubicSmoothstep(progress);
    target.careScale = lerp(
      transition.fromScale,
      target.guardLmtSclTgt,
      eased
    );
    if (progress >= 1) {
      target.careScale = target.guardLmtSclTgt;
      target.grdLmtScl = null;
    }
  }

  const type = targets[0]?.type;
  const state = guardTypeCuts[type];
  if (!state?.crossLimit || !state.active) return;
  state.elapsedMs += elapsedMs;
  const progress = clamp(
    state.elapsedMs / max(1, guardCfg.lmtTxMs),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  state.alpha = lerp(state.startAlpha, state.targetAlpha, eased);
  if (progress >= 1) {
    state.alpha = state.targetAlpha;
    state.active = false;
  }
}

function getSpeciesFade(type) {
  return guardTypeCuts[type] || { scale: 1, alpha: 1 };
}

function rstCareRegr() {
  guardSeedClst.length = 0;
}

function rstGuardCare() {
  // Release participants' temporary symbols and visual
  // poses first so reset begins from a blank care state.
  carePanelBox = null;
  careGlowFades.length = 0;
  for (const guardian of care.state.participants) {
    guardian.guardSigns = false;
    if (
      (guardian.drftSymblMode === "plus" ||
        guardian.driftSignMix?.toMode === "plus") &&
      guardian.driftSignMix?.toMode !== "base"
    ) {
      guardian.beginDriftFade("plus", "base");
    }
    delete guardian.guardVisX;
    delete guardian.guardVisY;
    delete guardian.careScale;
  }
  // Candidate, lingering, and departure timers belong to the trigger phase and return to zero on idle.
  care.state.candidate = null;
  care.state.candLvMs = 0;
  care.state.receding = [];
  care.state.lureBrkCand = null;
  care.state.lureBrkCnfrmMs = 0;
  care.state.lureBrkOtsdMs = 0;
  care.state.activationMs = 0;
  care.state.focusMs = 0;
  care.state.progressX = null;
  care.state.progressY = null;
  care.state.progressAtRest = false;
  care.state.releaseMs = 0;
  care.state.reqrFree = false;
  care.state.leaveMs = 0;
  care.state.encnElapsedMs = 0;
  care.state.isEncnTmd = false;
  // Reset cancellation, primary-phase, and panel timing together.
  care.state.canceling = false;
  care.state.cnclElapsedMs = 0;
  care.state.cnclDurMs = 0;
  care.state.cnclCompRpr = false;
  care.state.phase = "idle";
  care.state.phaseElapsedMs = 0;
  care.state.panelRevealMs = 0;
  care.state.pnlFadeStart = false;
  care.state.pnlFadElaMs = 0;
  // Source, participants, and scan waveform form a single-session
  // snapshot and are re-established for each care cycle.
  care.state.source = null;
  care.state.participants = [];
  care.state.centerX = 0;
  care.state.centerY = 0;
  care.state.maximumRadius = 0;
  care.state.waveProfile = [];
  care.state.wavePrflNext = [];
  care.state.waveCntrPrfl = [];
  care.state.wavePrflRot = 0;
  care.state.waveGlblShp = null;
  care.state.panelSide = 1;
  // Species counts and action selection explain this
  // ecological decision and are recalculated after reset.
  care.state.speciesCounts = null;
  care.state.suppressType = null;
  care.state.peerSuppType = null;
  care.state.protectType = null;
  care.state.careTarget = null;
  care.state.limitLinks = [];
  care.state.interveneKind = null;
  care.state.shieldTarget = null;
  // Protection, repair, and birth collections are maintained by action phases;
  // completion and cancellation share this cleanup boundary.
  care.state.shields = [];
  care.state.shieldSequence = 0;
  care.state.links = [];
  care.state.parents = [];
  care.state.newborns = [];
  care.state.boostStarted = false;
  care.state.birthRolls = [];
  care.state.repairApplied = false;
  care.state.rprUsgSttld = false;
  // Collaboration invitations, signals, and connection state
  // are valid within the current multiplayer relationship.
  care.state.collabStatus = "idle";
  care.state.collabMode = "single";
  care.state.offerElapsedMs = 0;
  care.state.cllbAccWndMs = {};
  care.state.signals = {};
  care.state.collIds = [];
  care.state.linkStates = {};
  care.state.tgtStrtScl = 1;
  care.state.tgtStrtAlph = 1;
  // Return wrapping, return, and shield snapshots to their default geometry.
  care.state.wrapScale = 1;
  care.state.wrapStartX = 0;
  care.state.wrapStartY = 0;
  care.state.returnStartX = 0;
  care.state.returnStartY = 0;
  care.state.shieldStartX = 0;
  care.state.shieldStartY = 0;
  care.state.shieldDirX = 1;
  care.state.shieldDirY = 0;
  care.state.shldDurMs = 0;
  care.state.shldStrtScl = 1;
  care.state.shieldTarget = null;
  care.state.links = [];
  care.state.parents = [];
  care.state.newborns = [];
  care.state.boostStarted = false;
  care.state.birthRolls = [];
  // Release the log-deduplication set with the session so the
  // next independent care sequence can record results anew.
  care.state.lggdCond.clear();
}

// 3. Finding lifeforms in need of care and inviting other participants
// The invitation appears in the shared view and waits for another participant to respond.
function getAttrTrgts(guardian) {
  let nearest = null;
  let nearestDistSq = Infinity;
  // Filter for visible, interactive targets and compare distances across collections.
  const inspect = (entities, type) => {
    for (const entity of entities) {
      if (!entity || entity === guardian || !isVisible(entity)) continue;
      if (
        type === eco.lifeType.predator &&
        entity.birthProgress != null &&
        entity.birthProgress < 1
      ) {
        continue;
      }
      const position = worldPos(entity);
      const distSq = dist2(
        guardian.x,
        guardian.y,
        position.x,
        position.y
      );
      if (distSq < nearestDistSq) {
        nearest = entity;
        nearestDistSq = distSq;
      }
    }
  };
  inspect(groups[eco.lifeType.predator] || [], eco.lifeType.predator);
  inspect(parasites, eco.lifeType.parasite);
  return nearest ? [nearest] : [];
}

function careAttnDistSq(guardian, gaze) {
  if (!guardian || !gaze) return Infinity;
  const position = worldPos(guardian);
  const restPosition = {
    x: position.x - guardian.attentionOffsetX,
    y: position.y - guardian.attentionOffsetY,
  };
  return min(
    dist2(gaze.x, gaze.y, position.x, position.y),
    dist2(gaze.x, gaze.y, restPosition.x, restPosition.y)
  );
}

// Guardian proximity checks use the current visual radius plus tolerance,
// keeping hit range aligned with the image during scale animation.
function guarIsNeaGaz(
  guardian,
  gaze,
  extraPadding = 0,
  session = activeSession
) {
  if (!guardian || !gaze) return false;
  if (guardian.careBirth) return false;
  const nearRadius =
    (infoRadius(guardian) +
      guardCfg.attnNearPddng +
      max(0, extraPadding)) *
    ixGazeScale(eco.lifeType.guardian, session);
  return (
    care.attnDistSq(guardian, gaze) <=
    nearRadius * nearRadius
  );
}

// Prefer the Guardian still within hit range; otherwise select the available Guardian nearest to gaze.
function findCarAttTgt(
  gaze,
  session = activeSession,
  incldHeldCand = true
) {
  if (!gaze || !session) return null;
  const heldCandidate = session.careState.candidate;
  if (
    incldHeldCand &&
    heldCandidate &&
    tgtRdyToSssn(heldCandidate, session) &&
    guarIsNeaGaz(
      heldCandidate,
      gaze,
      guardCfg.candHoldPddng,
      session
    )
  ) {
    return heldCandidate;
  }
  let closest = null;
  let nearDistSq = Infinity;
  for (const guardian of groups[eco.lifeType.guardian] || []) {
    if (!tgtRdyToSssn(guardian, session)) continue;
    if (!guarIsNeaGaz(guardian, gaze, 0, session)) continue;
    const distSq = care.attnDistSq(guardian, gaze);
    if (distSq < nearDistSq) {
      closest = guardian;
      nearDistSq = distSq;
    }
  }
  return closest;
}

function careProgPos(guardian) {
  return careSourcePos(guardian);
}

// Align the progress point with the Guardian's current visual position.
function updtCarProPos(guardian, gaze) {
  if (!guardian) return;
  const progPos = careProgPos(guardian);
  care.state.progressX = progPos.x;
  care.state.progressY = progPos.y;
  care.state.progressAtRest = false;
}

// Count species among valid lifeforms for use by the care panel and limit selection.
function careSpcCnts() {
  return {
    [eco.lifeType.predator]: (groups[eco.lifeType.predator] || []).length,
    [eco.lifeType.parasite]: parasites.length,
    [eco.lifeType.roamer]: (groups[eco.lifeType.roamer] || []).length,
    [eco.lifeType.deepDiver]: (groups[eco.lifeType.deepDiver] || []).length,
    [eco.lifeType.guardian]: (groups[eco.lifeType.guardian] || []).length,
  };
}

// Select the most abundant species from the count snapshot, resolving ties by preset order.
function careMaxType(speciesCounts) {
  const types = [
    eco.lifeType.predator,
    eco.lifeType.parasite,
    eco.lifeType.roamer,
    eco.lifeType.deepDiver,
  ];
  return types.reduce((maximumType, type) =>
    speciesCounts[type] > speciesCounts[maximumType]
      ? type
      : maximumType
  );
}

// Between mind-wandering and sustained attention, prioritize care
// for the less abundant; choose Roamer when counts are equal.
function carePrtctType(speciesCounts) {
  return speciesCounts[eco.lifeType.roamer] <=
    speciesCounts[eco.lifeType.deepDiver]
    ? eco.lifeType.roamer
    : eco.lifeType.deepDiver;
}

// Use the source seed to determine participant count,
// then select available Guardians by distance from gaze.
function slctCareUsrs(source, gaze, guardians) {
  const userNs =
    abs(sin((source.seed || 0) * 0.017 + 2.371)) % 1;
  const participantCount = floor(
    lerp(
      guardCfg.participantMin,
      guardCfg.participantMax + 1,
      userNs
    )
  );
  const otherCount = min(
    max(0, guardians.length - 1),
    max(0, participantCount - 1)
  );
  const nearestOthers = guardians
    .filter(
      (guardian) =>
        guardian !== source && tgtRdyToSssn(guardian)
    )
    .sort((left, right) => {
      const leftPosition = worldPos(left);
      const rightPosition = worldPos(right);
      return (
        dist2(gaze.x, gaze.y, leftPosition.x, leftPosition.y) -
        dist2(gaze.x, gaze.y, rightPosition.x, rightPosition.y)
      );
    })
    .slice(0, otherCount);
  return [source, ...nearestOthers];
}

// Relational care becomes possible when other participants can respond
function carePeers(
  initiator = activeSession
) {
  return sessions.filter(
    (session) =>
      session !== initiator &&
      session.enabled &&
      session.camera?.gaze
  ).slice(
    0,
    collabCfg.maxAccepts
  );
}

// Determine whether the current session is waiting for a response to a care invitation.
function careInttWtng(
  session = activeSession
) {
  const state = session?.careState;
  return Boolean(
    state &&
      state.collabStatus === "offered" &&
      state.collabMode === "pending"
  );
}

function carePeeMaxTyp(speciesCounts) {
  const maximumType = careMaxType(speciesCounts);
  const types = [
    eco.lifeType.predator,
    eco.lifeType.parasite,
    eco.lifeType.roamer,
    eco.lifeType.deepDiver,
  ].filter((type) => type !== maximumType);
  return types.reduce((secondaryType, type) =>
    speciesCounts[type] > speciesCounts[secondaryType]
      ? type
      : secondaryType
  );
}

// Care reads gaze positions with display offsets, falling back
// to camera-derived gaze when display assistance is unavailable.
function careRespGaze(session) {
  const rawGaze = session?.camera?.gaze;
  if (!rawGaze) return null;
  return (
    window.GazeApp?.visCrsrPos?.(session.id, rawGaze) || rawGaze
  );
}

function careCllbProg() {
  if (care.state.collabStatus === "offered") return 1;
  return clamp(
    care.state.focusMs / guardCfg.attnHoldMs,
    0,
    1
  );
}

// Save lingering progress when leaving a Guardian so
// it can continue during rollback or renewed approach.
function qRecdCare(
  guardian,
  focusMs,
  interruptionMs = 0
) {
  if (!guardian || focusMs <= 0) return false;
  const existing = care.state.receding.find(
    (track) => track.guardian === guardian
  );
  if (existing) {
    existing.focusMs = max(existing.focusMs, focusMs);
    existing.interruptionMs = min(
      existing.interruptionMs,
      max(0, interruptionMs)
    );
  } else {
    care.state.receding.push({
      guardian,
      focusMs,
      interruptionMs: max(0, interruptionMs),
    });
  }
  return true;
}

// Retrieve and remove the Guardian's rollback record to restore progress when gaze returns.
function rsmRecdCare(guardian) {
  const index = care.state.receding.findIndex(
    (track) => track.guardian === guardian
  );
  if (index < 0) return null;
  return care.state.receding.splice(index, 1)[0];
}

// Decay stored progress according to departure rules, removing invalid or depleted records.
function updtRecdCare(elapsedMs) {
  const remaining = [];
  for (const track of care.state.receding) {
    const valid =
      creatures.includes(track.guardian) &&
      isVisible(track.guardian) &&
      !track.guardian.repairRetired;
    const fallback = updateAttnProg(
      track.focusMs / guardCfg.attnHoldMs,
      track.interruptionMs,
      clssAttnFlow({
        focused: false,
        hardReset: !valid,
      }),
      elapsedMs,
      { focusMs: guardCfg.attnHoldMs }
    );
    track.focusMs =
      fallback.progress * guardCfg.attnHoldMs;
    track.interruptionMs = fallback.interruptionMs;
    if (fallback.progress > 0 && valid) remaining.push(track);
  }
  care.state.receding = remaining;
}

// A time window makes the repair process gradually visible.
function careTmngScl() {
  return care.state.collabMode === "relational"
    ? guardCfg.relTmngScl
    : 1;
}

function careWindowMs(durationMs) {
  return durationMs * careTmngScl();
}

function scaleCareMs(durationMs) {
  return durationMs;
}

// Return the post-completion visual hold duration for the current care mode.
function careProgHoldMs() {
  const durationMs =
    care.state.collabMode === "relational"
      ? guardCfg.shrdProgHoldMs
      : guardCfg.progDoneHoldMs;
  return scaleCareMs(durationMs);
}

// Scan-phase durations are composed centrally from configuration so the
// visual layer and state machine share the same completion boundary.
function careScanTmngs() {
  const config = guardCfg;
  if (care.state.collabMode === "relational") {
    return {
      durationMs: config.relScanMs,
      fadeInMs: config.relScaFadInMs,
      fadeOutMs: config.relScaFadOutMs,
      lateFadeStrtMs: config.shrdScaFadAtMs,
      lateFadeMs: config.relScaLatFadMs,
    };
  }
  return {
    durationMs: config.scanMs,
    fadeInMs: config.scanFadeInMs,
    fadeOutMs: config.scanFadeOutMs,
    lateFadeStrtMs: config.scanLatFadStrM,
    lateFadeMs: config.scanLateFadeMs,
  };
}

// Signal travel time varies with connection distance within configured limits,
// keeping speed comparable across near and far relationships.
function careSgnlTrvlMs(distance) {
  const config = guardCfg;
  const refrDist = max(
    1,
    sqrt(width * width + height * height) *
      signalCfg.travelScale
  );
  const distProg = relSmth(
    clamp(distance / refrDist, 0, 1)
  );
  return lerp(
    signalCfg.travelMinMs,
    signalCfg.travelMaxMs,
    distProg
  );
}

// Establish collaboration-invitation state for one respondent.
// This function was modified with the assistance of ChatGPT.
function crtCareSgnl(source, session) {
  const start = focusPos(source);
  const responderGaze = careRespGaze(session) || start;
  const dx = responderGaze.x - start.x;
  const dy = responderGaze.y - start.y;
  const distance = sqrt(dx * dx + dy * dy);
  // Reserve stopping distance along the invitation path, leaving the other participant room to respond.
  const travelDistance = max(
    0,
    distance - signalCfg.stopDistance
  );
  const travelScale = distance > 0.001 ? travelDistance / distance : 0;
  const targetX = start.x + dx * travelScale;
  const targetY = start.y + dy * travelScale;
  // Generate curve, drift, and breathing deterministically from the participant identifier.
  const curveVariation = carePcktJttr(
    session.id,
    0,
    7
  );
  const curveSide =
    carePcktJttr(session.id, 0, 11) < 0 ? -1 : 1;
  const driftVariation = carePcktJttr(
    session.id,
    0,
    13
  );
  // The same object stores path geometry, gaze attraction, and acceptance state;
  // update phases advance its session fields.
  return {
    sessionId: session.id,
    startX: start.x,
    startY: start.y,
    targetX,
    targetY,
    x: start.x,
    y: start.y,
    progress: 0,
    trvlDurMs:
      careSgnlTrvlMs(travelDistance),
    motionScale: 1,
    heading: distance > 0.001 ? atan2(dy, dx) : 0,
    headingTarget: distance > 0.001 ? atan2(dy, dx) : 0,
    hdngRetElaMs: 0,
    hdngProgActv: false,
    curveSide,
    curveBend: lerp(
      packetCfg.curveBendMin,
      packetCfg.curveBendMax,
      (curveVariation + 1) * 0.5
    ),
    curveSkew: carePcktJttr(session.id, 0, 17),
    driftAmplitude: lerp(
      packetCfg.driftMin,
      packetCfg.driftMax,
      (driftVariation + 1) * 0.5
    ),
    driftPeriodMs: lerp(
      packetCfg.drftPrdMinMs,
      packetCfg.drftPrdMaxMs,
      (carePcktJttr(session.id, 0, 19) + 1) * 0.5
    ),
    driftPhase:
      (carePcktJttr(session.id, 0, 23) + 1) * PI,
    hoverPhase:
      (carePcktJttr(session.id, 0, 29) + 1) * PI,
    diameter: careSgnlDimt(session.id),
    acceptRadius: 0,
    gazeHeld: false,
    cptrPow: 0,
    captureInRange: false,
    captureActive: false,
    captureTargetX: null,
    captureTargetY: null,
    velocityX: 0,
    velocityY: 0,
    arrivalHoldMs: 0,
    farOffsetMs: 0,
    fadingOut: false,
    fadeOutElaMs: 0,
    inputInvalidMs: 0,
    accepted: false,
    visible: true,
  };
}

function careSignalFor(source, session) {
  let signal = care.state.signals[session.id];
  if (!signal) {
    signal = crtCareSgnl(source, session);
    care.state.signals[session.id] = signal;
  }
  return signal;
}

// Resolve the invitation signal's response target,
// preferring real-time gaze from a confirmed participant.
function careSgnlTgt(signal, responderGaze) {
  const dx = responderGaze.x - signal.startX;
  const dy = responderGaze.y - signal.startY;
  const distance = sqrt(dx * dx + dy * dy);
  const travelDistance = max(
    0,
    distance - signalCfg.stopDistance
  );
  const travelScale = distance > 0.001 ? travelDistance / distance : 0;
  return {
    x: signal.startX + dx * travelScale,
    y: signal.startY + dy * travelScale,
  };
}

// The data packet follows a stable Bezier path around the body center.
function careBzrPnt(signal, progress) {
  const pathX = signal.targetX - signal.startX;
  const pathY = signal.targetY - signal.startY;
  const pathLength = max(0.001, sqrt(pathX * pathX + pathY * pathY));
  const directionX = pathX / pathLength;
  const directionY = pathY / pathLength;
  const normalX = -directionY;
  const normalY = directionX;
  const bend =
    min(signal.curveBend, pathLength * 0.18) * signal.curveSide;
  const firstControlX =
    signal.startX + directionX * pathLength * 0.28 + normalX * bend;
  const firstControlY =
    signal.startY + directionY * pathLength * 0.28 + normalY * bend;
  const secondBend = bend * (-0.34 + signal.curveSkew * 0.14);
  const secondControlX =
    signal.startX + directionX * pathLength * 0.72 + normalX * secondBend;
  const secondControlY =
    signal.startY + directionY * pathLength * 0.72 + normalY * secondBend;
  const inverse = 1 - progress;
  const firstWeight = inverse * inverse * inverse;
  const secondWeight = 3 * inverse * inverse * progress;
  const thirdWeight = 3 * inverse * progress * progress;
  const fourthWeight = progress * progress * progress;
  return {
    x:
      firstWeight * signal.startX +
      secondWeight * firstControlX +
      thirdWeight * secondControlX +
      fourthWeight * signal.targetX,
    y:
      firstWeight * signal.startY +
      secondWeight * firstControlY +
      thirdWeight * secondControlY +
      fourthWeight * signal.targetY,
    normalX,
    normalY,
    directionX,
    directionY,
  };
}

function careAngleDelta(from, to) {
  return atan2(sin(to - from), cos(to - from));
}

// Rebuild the signal path when the response position changes while preserving existing travel progress.
function rbsCarSgnPat(signal, responderGaze) {
  if (!signal || !responderGaze) return;
  signal.startX = signal.x;
  signal.startY = signal.y;
  const target = careSgnlTgt(signal, responderGaze);
  signal.targetX = target.x;
  signal.targetY = target.y;
  signal.progress = 0;
  signal.arrivalHoldMs = 0;
  signal.trvlDurMs = careSgnlTrvlMs(
    dist(signal.startX, signal.startY, target.x, target.y)
  );
}

// This function was modified with the assistance of ChatGPT.
function updCareCptrMtn(
  signal,
  responderGaze,
  captureRadius,
  stepMs,
  pathVelocityX,
  pathVelocityY
) {
  const config = guardCfg;
  const entering = !signal.captureActive;
  // On first entering gaze attraction, inherit the original path velocity and clamp its maximum.
  if (entering) {
    signal.captureActive = true;
    signal.captureTargetX = responderGaze.x;
    signal.captureTargetY = responderGaze.y;
    const inheritedSpeed = sqrt(
      pathVelocityX * pathVelocityX + pathVelocityY * pathVelocityY
    );
    const inhrSpdLmt =
      packetCfg.cptrMaxSpd *
      packetCfg.gazeMtnScl;
    const inheritedScale =
      inheritedSpeed > inhrSpdLmt && inheritedSpeed > 0.001
        ? inhrSpdLmt / inheritedSpeed
        : 1;
    signal.velocityX = pathVelocityX * inheritedScale;
    signal.velocityY = pathVelocityY * inheritedScale;
  } else {
// Subsequent frames follow gaze smoothly, allowing the invitation signal to approach the other
// participant along a continuous trajectory.
    const targetFollow =
      1 -
      exp(
        -stepMs /
          max(1, packetCfg.cptrFllwMs)
      );
    signal.captureTargetX = lerp(
      signal.captureTargetX,
      responderGaze.x,
      targetFollow
    );
    signal.captureTargetY = lerp(
      signal.captureTargetY,
      responderGaze.y,
      targetFollow
    );
  }

// Gaze attraction uses an independent fade-in rhythm,
// allowing the relationship to approach its target gradually.
  signal.cptrPow = min(
    1,
    signal.cptrPow +
      stepMs / max(1, packetCfg.captureEaseMs)
  );
  const dx = signal.captureTargetX - signal.x;
  const dy = signal.captureTargetY - signal.y;
  const distance = sqrt(dx * dx + dy * dy);
  const settleRadius =
    packetCfg.settleRadius;
  const travelDistance = max(0, distance - settleRadius);
  const distProg = relSmth(
    clamp(travelDistance / max(1, captureRadius - settleRadius), 0, 1)
  );
  // Speed decreases near the holding radius, allowing the
  // signal's deceleration to form a responsive relationship.
  const desiredSpeed =
    packetCfg.cptrMaxSpd *
    signal.motionScale *
    distProg;
  const directionX = distance > 0.001 ? dx / distance : 0;
  const directionY = distance > 0.001 ? dy / distance : 0;
  const dsrdVelX = directionX * desiredSpeed;
  const dsrdVelY = directionY * desiredSpeed;
  const velocityFollow =
    1 -
    exp(
      -stepMs / max(1, packetCfg.captureEaseMs)
    );
  signal.velocityX = lerp(
    signal.velocityX,
    dsrdVelX,
    velocityFollow
  );
  signal.velocityY = lerp(
    signal.velocityY,
    dsrdVelY,
    velocityFollow
  );

  const stepSeconds = stepMs / 1000;
  let moveX = signal.velocityX * stepSeconds;
  let moveY = signal.velocityY * stepSeconds;
  const forwardMove = moveX * directionX + moveY * directionY;
  // Clamp the final step to the remaining distance.
  if (travelDistance <= 0.001) {
    moveX = 0;
    moveY = 0;
    signal.velocityX = 0;
    signal.velocityY = 0;
  } else if (forwardMove > travelDistance) {
    moveX = directionX * travelDistance;
    moveY = directionY * travelDistance;
    signal.velocityX = stepSeconds > 0 ? moveX / stepSeconds : 0;
    signal.velocityY = stepSeconds > 0 ? moveY / stepSeconds : 0;
  }
  return {
    x: signal.x + moveX,
    y: signal.y + moveY,
  };
}

// This function was modified with the assistance of ChatGPT.
function updtCareSgnl(source, session, elapsedMs = 0) {
  // The signal invites another participant to join the care process;
  // identity and personal data remain managed by the session boundary.
  const signal = careSignalFor(source, session);
  const config = guardCfg;
  const stepMs = max(0, elapsedMs);
  if (signal.visible === false) return signal;
  // Fade-out is the terminal branch: stop velocity and hide the signal when its duration ends.
  if (signal.fadingOut) {
    signal.fadeOutElaMs += stepMs;
    if (
      signal.fadeOutElaMs >=
      signalCfg.fadeOutMs
    ) {
      signal.visible = false;
    }
    signal.velocityX = 0;
    signal.velocityY = 0;
    return signal;
  }
  const motionTarget = signal.gazeHeld
    ? packetCfg.gazeMtnScl
    : 1;
  const motionFollow =
    1 - exp(-stepMs / packetCfg.gazeMtnEaseMs);
  signal.motionScale = lerp(signal.motionScale, motionTarget, motionFollow);
  const prevProg = signal.progress;
  const progAdvnc =
    (stepMs / max(1, signal.trvlDurMs)) * signal.motionScale;
  const rawProgress = prevProg + progAdvnc;
  signal.progress = clamp(rawProgress, 0, 1);
  if (prevProg >= 1) {
    signal.arrivalHoldMs += stepMs;
  } else if (rawProgress >= 1 && progAdvnc > 0) {
    signal.arrivalHoldMs +=
      stepMs * clamp((rawProgress - 1) / progAdvnc, 0, 1);
  }
  // Derive the acceptance radius from actual display size so
  // visual and hit ranges remain aligned after interface scaling.
  signal.diameter = careSgnlDimt(session.id);
  signal.acceptRadius =
    (signal.diameter /
      max(0.001, signalCfg.visualScale)) *
      0.5 *
      signalCfg.accptRadScl;
  const responderGaze = careRespGaze(session);
  const captureRadius =
    signal.acceptRadius *
    signalCfg.farRadiusScale;
  const cptrDist = responderGaze
    ? dist(signal.x, signal.y, responderGaze.x, responderGaze.y)
    : Infinity;
  const captureInRange = Boolean(
    signal.gazeHeld &&
      responderGaze &&
      cptrDist <= captureRadius
  );
  signal.captureInRange = captureInRange;
  const captureActive = Boolean(signal.gazeHeld && responderGaze);
  // Recalculate the remaining path after gaze interruption so
  // the signal returns smoothly to the invitation trajectory.
  if (!captureActive && signal.captureActive) {
    rbsCarSgnPat(signal, responderGaze);
    signal.captureActive = false;
    signal.cptrPow = 0;
    signal.captureTargetX = null;
    signal.captureTargetY = null;
  }
  if (responderGaze && !captureActive) {
    const desiredTarget = careSgnlTgt(
      signal,
      responderGaze
    );
    const targetDeltaX = desiredTarget.x - signal.targetX;
    const targetDeltaY = desiredTarget.y - signal.targetY;
    const targetDistance = sqrt(
      targetDeltaX * targetDeltaX + targetDeltaY * targetDeltaY
    );
    if (targetDistance > 0.001) {
      const follow =
        1 - exp(-stepMs / packetCfg.followMs);
      const maximumMove =
        packetCfg.targetMaxSpeed * (stepMs / 1000);
      const targetStep = min(follow, maximumMove / targetDistance);
      signal.targetX += targetDeltaX * targetStep;
      signal.targetY += targetDeltaY * targetStep;
    }
  }
  // Drift along the curved path before arrival, then hover
  // within a small range to distinguish approach from waiting.
  const travelProgress =
    signal.progress * signal.progress * (2.55 - 1.55 * signal.progress);
  const pathPoint = careBzrPnt(signal, travelProgress);
  const clock = care.state.offerElapsedMs;
  let nextX = pathPoint.x;
  let nextY = pathPoint.y;
  if (signal.progress < 1) {
    const driftEnvelope = sin(PI * travelProgress);
    const driftPhase =
      (TWO_PI * clock) / signal.driftPeriodMs + signal.driftPhase;
    const lateralDrift =
      (sin(driftPhase) * 0.72 +
        sin(driftPhase * 0.57 + signal.curveSkew * 2.1) * 0.28) *
      signal.driftAmplitude *
      driftEnvelope;
    const forwardDrift =
      sin(driftPhase * 0.71 + 1.3) *
      signal.driftAmplitude *
      0.22 *
      driftEnvelope;
    nextX +=
      pathPoint.normalX * lateralDrift +
      pathPoint.directionX * forwardDrift;
    nextY +=
      pathPoint.normalY * lateralDrift +
      pathPoint.directionY * forwardDrift;
  } else {
    // Keep post-arrival hover amplitude small.
    const hoverPhase =
      (TWO_PI * clock) / packetCfg.hoverPeriodMs +
      signal.hoverPhase;
    nextX +=
      cos(hoverPhase) * packetCfg.hoverRadius +
      sin(hoverPhase * 0.61 + 0.8) *
        packetCfg.hoverRadius *
        0.32;
    nextY +=
      sin(hoverPhase * 0.83) *
      packetCfg.hoverRadius *
        0.72;
  }
  // Estimate continuous velocity from this frame's path delta so gaze
  // attraction inherits the existing direction when it takes over.
  const stepSeconds = max(0.001, stepMs / 1000);
  const pathVelocityX = (nextX - signal.x) / stepSeconds;
  const pathVelocityY = (nextY - signal.y) / stepSeconds;
  // Gaze attraction takes ownership of path position and preserves the
  // original path velocity as the initial velocity for continuous entry.
  if (captureActive) {
    const cptrPos = updCareCptrMtn(
      signal,
      responderGaze,
      captureRadius,
      stepMs,
      pathVelocityX,
      pathVelocityY
    );
    nextX = cptrPos.x;
    nextY = cptrPos.y;
  } else {
    signal.cptrPow = 0;
    signal.velocityX = pathVelocityX;
    signal.velocityY = pathVelocityY;
  }
  const motionX = nextX - signal.x;
  const motionY = nextY - signal.y;
  // Face the participant while waiting or being gazed at;
  // otherwise rotate along the direction of movement.
  const tgtFcngActv = Boolean(
    responderGaze && (signal.progress >= 1 || signal.gazeHeld)
  );
  const headingX = tgtFcngActv
    ? responderGaze.x - nextX
    : motionX;
  const headingY = tgtFcngActv
    ? responderGaze.y - nextY
    : motionY;
  const hdngDist = sqrt(headingX * headingX + headingY * headingY);
  const progHdngActv = tgtFcngActv;
  if (progHdngActv) {
    signal.hdngRetElaMs =
      (signal.hdngRetElaMs || 0) + stepMs;
  } else {
    signal.hdngRetElaMs = 0;
  }
  if (
    hdngDist >=
      packetCfg.turnMtnThresh
  ) {
    const dsrdVctrHdng = atan2(headingY, headingX);
    const retargetMs = max(
      1,
      packetCfg.progTurnRetrMs
    );
    // Reacquire the target at preset intervals while facing the participant.
    if (
      !progHdngActv ||
      !signal.hdngProgActv ||
      !Number.isFinite(signal.headingTarget) ||
      signal.hdngRetElaMs >= retargetMs
    ) {
      signal.headingTarget = dsrdVctrHdng;
      signal.hdngRetElaMs = progHdngActv
        ? signal.hdngRetElaMs % retargetMs
        : 0;
    }
    const desiredHeading = progHdngActv
      ? signal.headingTarget
      : dsrdVctrHdng;
    const headingEaseMs = progHdngActv
      ? packetCfg.progTurnEaseMs
      : packetCfg.turnEaseMs;
    const hdngMaxTurRat = progHdngActv
      ? packetCfg.progTurRatMax
      : packetCfg.turnMaxTurRat;
    const headingFollow =
      1 - exp(-stepMs / max(1, headingEaseMs));
    const maximumTurn = hdngMaxTurRat * (stepMs / 1000);
    const headingDelta = careAngleDelta(
      signal.heading,
      desiredHeading
    );
    signal.heading += clamp(
      headingDelta * headingFollow,
      -maximumTurn,
      maximumTurn
    );
  }
  signal.hdngProgActv = progHdngActv;
  signal.x = nextX;
  signal.y = nextY;
  return signal;
}

// Calculate the data packet's breathing diameter from
// the session phase offset and current invitation clock.
function careSgnlDimt(sessionId) {
  const pulsePhase =
    ((care.state.offerElapsedMs + sessionId * 173) %
      signalCfg.pulseMs) /
    signalCfg.pulseMs;
  const pulse = 0.5 - 0.5 * cos(TWO_PI * pulsePhase);
  return (
    signalCfg.diameter *
    signalCfg.visualScale *
    (1 +
      signalCfg.breathScale * pulse)
  );
}

// Derive hit radius from the current breathing diameter
// so visual pulsing and interaction range change together.
function careSgnHasGaz(signal, gaze) {
  if (!signal || !gaze || signal.visible === false) return false;
  const radius = signal.acceptRadius;
  return dist2(signal.x, signal.y, gaze.x, gaze.y) <= radius * radius;
}

function careSgnRtcFar(signal, gaze) {
  if (!signal || !gaze) return false;
  const farRadius =
    signal.acceptRadius *
    signalCfg.farRadiusScale;
  return dist2(signal.x, signal.y, gaze.x, gaze.y) > farRadius * farRadius;
}

  // Fade from visible to zero along a smooth curve.
function careSgnFadAlp(signal) {
  if (!signal?.fadingOut) return 1;
  return (
    1 -
    relSmth(
      signal.fadeOutElaMs /
        max(1, signalCfg.fadeOutMs)
    )
  );
}

// Save current progress and opacity when signal fade-out begins.
function bgnCarSgnFad(signal) {
  if (!signal || signal.fadingOut || signal.visible === false) return false;
  signal.fadingOut = true;
  signal.fadeOutElaMs = 0;
  signal.gazeHeld = false;
  signal.cptrPow = 0;
  signal.captureInRange = false;
  signal.captureActive = false;
  signal.captureTargetX = null;
  signal.captureTargetY = null;
  signal.velocityX = 0;
  signal.velocityY = 0;
  return true;
}

// 4. Waiting for a shared response while care continues for one participant
// Create collaboration invitations for participants able to respond;
// later update flow handles fallback to solo care.
function beginCareOffer(source) {
  if (care.getOwnrSssn()) return false;
  const responders = carePeers();
  if (!source || !responders.length) {
    return false;
  }
  rstLurBrkInt();
  bgnCareLogSeq();
  care.state.source = source;
  care.state.candidate = source;
  care.state.collabStatus = "offered";
  care.state.collabMode = "pending";
  care.state.offerElapsedMs = 0;
  care.state.cllbAccWndMs = {};
  care.state.signals = {};
  for (const session of responders) {
    care.state.signals[session.id] =
      crtCareSgnl(source, session);
  }
  care.state.collIds = [];
  recordCareNote("signal", relClckNow(), {
    source,
    participantCount: responders.length + 1,
    priority: 70,
  });
  return true;
}

// A participant arriving alone still has a path into care. With no respondents, switch to solo care;
// after timeout, choose the mode from those who accepted.
// This function was modified with the assistance of ChatGPT.
function updtCareOffr(
  guardians,
  initiatorGaze,
  elapsedMs
) {
  if (care.state.collabStatus !== "offered") return false;
  const source = care.state.source;
  if (!source) return false;
  care.state.offerElapsedMs += max(0, elapsedMs);
  const responders = carePeers();
  if (!responders.length) {
    if (care.state.collIds.length === 0) {
      recordCareNote("unanswered", relClckNow(), {
        participantCount: 1,
        priority: 100,
      });
    }
    beginCareScan(source, initiatorGaze, guardians, "single", []);
    return true;
  }
  const okSssnIds = care.state.collIds;
  for (const session of responders) {
    if (okSssnIds.includes(session.id)) continue;
    // Valid, active gaze accumulates acceptance time; a resting state
    // pauses accumulation and preserves a neutral candidate state.
    const pauseReason = session.progPsRsn;
    const inputValid =
      isGazeActive(session.camera) &&
      session.engagementState === "gaze-engagement";
    const signal = updtCareSgnl(
      source,
      session,
      elapsedMs
    );
    const responderGaze = careRespGaze(session);
    const watchingSignal =
      inputValid &&
      careSgnHasGaz(
        signal,
        responderGaze
      );
    const previous = care.state.cllbAccWndMs[session.id] || 0;
    const stepMs = max(0, elapsedMs);
    let next = previous;
    // The acceptance window handles signal state, input validity, and rest separately,
    // reversing existing progress on active departure.
    if (signal.fadingOut || signal.visible === false) {
      next = 0;
      signal.gazeHeld = false;
      signal.farOffsetMs = 0;
      signal.inputInvalidMs = 0;
    } else if (watchingSignal) {
      next = previous + stepMs;
      signal.gazeHeld = true;
      signal.farOffsetMs = 0;
      signal.inputInvalidMs = 0;
    } else if (pauseReason) {
      signal.farOffsetMs = 0;
    } else if (!inputValid) {
      const fallback = updateAttnProg(
        previous / collabCfg.acceptMs,
        signal.inputInvalidMs,
        clssAttnFlow({ focused: false }),
        stepMs,
        {
          focusMs: collabCfg.acceptMs,
          leaveDelayMs:
            signalCfg.inputGraceMs,
        }
      );
      next =
        fallback.progress *
        collabCfg.acceptMs;
      signal.inputInvalidMs = fallback.interruptionMs;
      if (fallback.phase === "restoring" || fallback.phase === "idle") {
        signal.gazeHeld = false;
        signal.farOffsetMs = 0;
      }
    } else if (signal.gazeHeld) {
      // Store progress after a confirmed hold; brief deviation is handled by the distance check below.
      signal.inputInvalidMs = 0;
    } else {
      const fallback = updateAttnProg(
        previous / collabCfg.acceptMs,
        signal.inputInvalidMs,
        clssAttnFlow({ focused: false }),
        stepMs,
        {
          focusMs: collabCfg.acceptMs,
          leaveDelayMs:
            signalCfg.inputGraceMs,
        }
      );
      next =
        fallback.progress *
        collabCfg.acceptMs;
      signal.inputInvalidMs = fallback.interruptionMs;
      signal.farOffsetMs = 0;
    }
    // After gaze begins, continue checking whether the cursor remains distant.
    const reticleFar = careSgnRtcFar(
      signal,
      responderGaze
    );
    if (
      !signal.fadingOut &&
      next > 0 &&
      inputValid &&
      reticleFar
    ) {
      signal.farOffsetMs += stepMs;
    } else if (!signal.fadingOut) {
      signal.farOffsetMs = 0;
    }
    if (
      !signal.fadingOut &&
      signal.progress >= 1 &&
      signal.arrivalHoldMs >=
        signalCfg.arrivalHoldMs &&
      (next <= 0 ||
        signal.farOffsetMs >=
          signalCfg.farOffsetMs)
    ) {
      bgnCarSgnFad(signal);
    }
    care.state.cllbAccWndMs[session.id] = next;
    if (
      !signal.fadingOut &&
      signal.visible !== false &&
      next >= collabCfg.acceptMs
    ) {
      // Treat sustained lingering as acceptance once it reaches the threshold.
      const firstAccept = okSssnIds.length === 0;
      okSssnIds.push(session.id);
      signal.accepted = true;
      signal.visible = false;
      signal.gazeHeld = false;
      bgnCarLinFadIn(relClckNow());
      if (firstAccept) {
        recordCareNote("accepted", relClckNow(), {
          participantCount: okSssnIds.length + 1,
          priority: 90,
        });
      }
    }
  }
  // Begin relational care as soon as the allowed number of respondents is reached,
  // closing the response set at this boundary.
  const maximumAccepts = min(
    collabCfg.maxAccepts,
    responders.length
  );
  if (
    maximumAccepts > 0 &&
    okSssnIds.length >= maximumAccepts
  ) {
    if (okSssnIds.length === 0) {
      recordCareNote("unanswered", relClckNow(), {
        participantCount: 1,
        priority: 100,
      });
    }
    beginCareScan(
      source,
      initiatorGaze,
      guardians,
      "relational",
      okSssnIds
    );
    return true;
  }
  // Resolve the process after invitation timing ends and remaining signals disappear;
  // accepted participants determine whether relational mode begins.
  if (
    care.state.offerElapsedMs >=
      collabCfg.offerMs &&
    !responders
      .filter((session) => !okSssnIds.includes(session.id))
      .some((session) => {
        const signal = care.state.signals[session.id];
        return signal?.visible !== false;
      })
  ) {
    beginCareScan(
      source,
      initiatorGaze,
      guardians,
      okSssnIds.length ? "relational" : "single",
      okSssnIds
    );
    return true;
  }
  return false;
}

// This function was modified with the assistance of ChatGPT.
function makeCarWavPrf(source) {
  const ctrlPntN = max(
    8,
    floor(guardCfg.scanWavePntN)
  );
  const sequence = careWaveSeq++;
  // The source seed and session sequence jointly determine the contour,
  // keeping it stable within a cycle while allowing variation in the next.
  const seed =
    (floor(source?.seed || 0) ^
      Math.imul(sequence + 1, 0x9e3779b1) ^
      0x6d2b79f5) >>>
    0;
  const rng = mulberry32(seed);
  // Circular noise is neighborhood-smoothed, mean-centered, and normalized.
  const crtNsPrfl = (pointCount, smoothingPasses) => {
    let values = Array.from(
      { length: pointCount },
      () => rng() * 2 - 1
    );
    for (
      let pass = 0;
      pass < smoothingPasses;
      pass++
    ) {
      values = values.map((value, index) => {
        const previous = values[(index - 1 + values.length) % values.length];
        const next = values[(index + 1) % values.length];
        return previous * 0.25 + value * 0.5 + next * 0.25;
      });
    }
    const mean =
      values.reduce((sum, value) => sum + value, 0) / values.length;
    const centered = values.map((value) => value - mean);
    const maxMagn = max(
      0.001,
      ...centered.map((value) => abs(value))
    );
    return centered.map((value) => value / maxMagn);
  };
  return {
    primary: crtNsPrfl(
      ctrlPntN,
      guardCfg.scanWavSmtPss
    ),
    secondary: crtNsPrfl(
      ctrlPntN,
      guardCfg.scanWavSmtPss
    ),
    contour: crtNsPrfl(
      max(6, floor(guardCfg.scanCntrPnts)),
      guardCfg.scanCntSmtPss
    ),
    rotation: rng() * TWO_PI,
    globalShape: {
      ellipticity: lerp(
        guardCfg.scanOvalMin,
        guardCfg.scanOvalMax,
        rng()
      ),
      ellipseAngle: rng() * TWO_PI,
      lopsidedness: lerp(
        guardCfg.scanCntLopMin,
        guardCfg.scanCntLopMax,
        rng()
      ),
      lopsidedAngle: rng() * TWO_PI,
      triangularity: lerp(
        guardCfg.scanCntrTriMin,
        guardCfg.scanCntrTriMax,
        rng()
      ),
      triAngl: rng() * TWO_PI,
    },
  };
}

// 5. First perceive what the ecology needs, then decide how care should unfold
// The scanning phase confirms participant relationships and species in need of repair,
// then prepares state for the protective formation.
// Local contract: read the candidate, participants, and current ecological snapshot;
// determine interveneKind and the next phase when scanning ends.
// This function was modified with the assistance of ChatGPT.
function beginCareScan(
  source,
  gaze,
  guardians,
  collabMode = "single",
  collIds = []
) {
  const contCllbOffr =
    care.state.collabStatus === "offered";
  if (!contCllbOffr) bgnCareLogSeq();
  care.state.receding = [];
  const waitLinkStts =
    collabMode === "relational"
      ? care.state.linkStates
      : null;
  if (collabMode === "relational") {
    enfrcCareLock(
      activeSession,
      collIds
    );
  }
  const position = worldPos(source);
  const relational = collabMode === "relational";
// Save species counts when scanning begins so this care
// sequence is evaluated from one consistent snapshot.
  const speciesCounts = careSpcCnts();
  const crnrDist = [
    dist(position.x, position.y, 0, 0),
    dist(position.x, position.y, width, 0),
    dist(position.x, position.y, width, height),
    dist(position.x, position.y, 0, height),
  ];
  care.state.phase = "scanning";
  care.state.phaseElapsedMs = 0;
  care.state.panelRevealMs =
    guardCfg.pnlShowLeadMs;
  care.state.repairApplied = false;
  care.state.rprUsgSttld = false;
  care.state.source = source;
  care.state.collabStatus =
    collabMode === "relational" ? "accepted" : "single";
  care.state.collabMode = collabMode;
  care.state.collIds = [...collIds];
  // Logs distinguish successful collaboration, invitation fallback, and direct solo scanning;
  // all three paths share the subsequent repair implementation.
  if (relational) {
    lifeLog.record(
      "ATTENTION SHARED",
      "Shared attention is strengthening the ecology.",
      {
        key: "attention-shared",
        primarySpecies: "Guardian",
        aggregationKey: "attention-shared",
        priority: 70,
        dedupeMs: 30000,
        display: false,
        now: relClckNow(),
      }
    );
    recordCareNote("repairStarted", relClckNow(), {
      participantCount: collIds.length + 1,
      priority: 90,
    });
  } else if (contCllbOffr) {
    recordCareNote("fallback", relClckNow(), {
      participantCount: 1,
      priority: 95,
    });
  } else {
    recordCareNote("scan", relClckNow(), {
      participantCount: 1,
      priority: 65,
    });
  }
  if (waitLinkStts) {
    care.state.linkStates = waitLinkStts;
  }
  // The signal phase ends here; scanning reselects participants
  // and locks the visual center and maximum coverage radius.
  care.state.signals = {};
  care.state.participants =
    slctCareUsrs(source, gaze, guardians);
  care.state.centerX = position.x;
  care.state.centerY = position.y;
  care.state.maximumRadius = max(...crnrDist) + 48;
  const sourceRadius = infoRadius(source);
  const rightSpace = width - position.x - sourceRadius;
  const leftSpace = position.x - sourceRadius;
  // Place the panel on the side with more available space.
  care.state.panelSide =
    rightSpace >=
      guardCfg.panelWidth +
        guardCfg.panelOffset ||
    rightSpace >= leftSpace
      ? 1
      : -1;
  const waveProfile = makeCarWavPrf(source);
  care.state.waveProfile = waveProfile.primary;
  care.state.wavePrflNext = waveProfile.secondary;
  care.state.waveCntrPrfl = waveProfile.contour;
  care.state.wavePrflRot = waveProfile.rotation;
  care.state.waveGlblShp = waveProfile.globalShape;
  care.state.speciesCounts = speciesCounts;
  // Solo care identifies both excess and scarcity; multiplayer care begins with negotiated limits,
  // then establishes protective relationships.
  care.state.suppressType = careMaxType(speciesCounts);
  care.state.peerSuppType = relational
    ? carePeeMaxTyp(speciesCounts)
    : null;
  care.state.protectType = relational
    ? null
    : carePrtctType(speciesCounts);
  care.state.focusMs = guardCfg.focusMs;
  care.state.reqrFree = true;
  care.state.releaseMs = 0;
  care.state.leaveMs = 0;
  care.state.canceling = false;
  care.state.cnclElapsedMs = 0;
}

// Care proceeds through participation, repair, and regeneration.
function careEntForTyp(type) {
  if (type === eco.lifeType.parasite) {
    return parasites.filter((entity) => entity && isVisible(entity));
  }
  return (groups[type] || []).filter((entity) => {
    if (!entity || !isVisible(entity)) return false;
    return !(
      type === eco.lifeType.predator &&
      entity.birthProgress != null &&
      entity.birthProgress < 1
    );
  });
}

// Preserve minimum species counts while assigning each Guardian a distinct nearby target for limitation.
// This function was modified with the assistance of ChatGPT.
function prprCareLmt() {
  const source = care.state.source;
  const guardians = care.state.participants.length
    ? care.state.participants
    : source
      ? [source]
      : [];
  const projected = encnProjCnts();
  // Select targets among individuals above the minimum retained count,
  // allowing Guardians to regulate dominance and sustain ecological diversity.
  const removableCount = max(
    0,
    projected.byType[care.state.suppressType] -
      lifeCfg.spcMins[care.state.suppressType]
  );
  const candidates = careEntForTyp(
    care.state.suppressType
  ).filter((entity) => tgtRdyToSssn(entity));
  if (!guardians.length || !candidates.length) return false;
  if (removableCount <= 0) return false;
  const assigned = new Set();
  care.state.limitLinks = guardians
    .slice(0, min(guardians.length, candidates.length, removableCount))
    .map((guardian) => {
      const guardPos = worldPos(guardian);
      const available = candidates.filter((target) => !assigned.has(target));
      const target = available.reduce((nearest, entity) => {
        const position = worldPos(entity);
        const distSq = dist2(
          guardPos.x,
          guardPos.y,
          position.x,
          position.y
        );
        return !nearest || distSq < nearest.distSq
          ? { entity, distSq }
          : nearest;
      }, null).entity;
      assigned.add(target);
      return {
        guardian,
        target,
        tgtStrtScl: Number.isFinite(target.careScale)
          ? target.careScale
          : 1,
        tgtStrtAlph: Number.isFinite(target.careAlpha)
          ? target.careAlpha
          : 1,
        wrapScale: 1,
        wrapStartX: guardPos.x,
        wrapStartY: guardPos.y,
      };
    });
  const sourceLink =
    care.state.limitLinks.find(
      (link) => link.guardian === source
    ) || care.state.limitLinks[0];
  care.state.careTarget = sourceLink.target;
  care.state.tgtStrtScl = sourceLink.tgtStrtScl;
  care.state.tgtStrtAlph = sourceLink.tgtStrtAlph;
  return true;
}

// Plus-sign provenance distinguishes detected repair results from decorative feedback;
// only genuine repairs participate in resolution.
function usesDetcPlus(guardian) {
  if (
    care.state.interveneKind !== "cross-limit" &&
    !care.state.canceling
  ) {
    return false;
  }
  const link = care.state.limitLinks.find(
    (candidate) => candidate.guardian === guardian
  );
  return Boolean(
    link &&
      [
        "cross-approaching",
        "cross-attached",
        "cross-returning",
        "cross-abandoning",
      ].includes(link.state)
  );
}

function stblCarePlss(guardian) {
  if (!guardian?.driftPluses) return;
  guardian.crssPlusCareMs =
    guardCfg.crossCareMs;
  for (const plus of guardian.driftPluses) {
    plus.filtMtnSpd = 0;
    plus.motionActive = false;
    plus.motionStrength = 0;
    plus.mtnAlphPow = 0;
    plus.mtnAlphHoldMs = 0;
  }
}

function isCarePnlActv() {
  return getEncnStts().prdsBlwOthrs;
}

// Collect the source, participants, and targets involved in current
// care so locking and view queries share one relationship boundary.
function guardCareEntt() {
  const entities = new Set(care.state.participants);
  for (const link of care.state.limitLinks) {
    if (link?.guardian) entities.add(link.guardian);
    if (link?.target) entities.add(link.target);
  }
  for (const approach of care.state.shields) {
    if (approach?.guardian) entities.add(approach.guardian);
    if (approach?.target) entities.add(approach.target);
  }
  for (const link of care.state.links) {
    if (link?.guardian) entities.add(link.guardian);
    if (link?.target) entities.add(link.target);
  }
  for (const target of care.state.parents) {
    if (target) entities.add(target);
  }
  if (care.state.careTarget) {
    entities.add(care.state.careTarget);
  }
  if (care.state.shieldTarget) {
    entities.add(care.state.shieldTarget);
  }
  return [...entities].filter(
    (entity) => entity && !entity.repairRetired && isVisible(entity)
  );
}

function grdCarNeaEnt(gaze, entity) {
  const position =
    entity.type === eco.lifeType.guardian
      ? careSourcePos(entity)
      : worldPos(entity);
  const visualScale = Number.isFinite(entity.careScale)
    ? entity.careScale
    : 1;
  const radius =
    infoRadius(entity) * visualScale +
    guardCfg.careGazePddng;
  return dist2(gaze.x, gaze.y, position.x, position.y) <= radius * radius;
}

// Leave an additional holding margin around the panel
// so gaze has room to finish reading the care result.
function grdCareNearPnl(gaze) {
  if (!care.state.speciesCounts) return false;
  const fallback = carePnlLyt();
  const panel = carePanelBox?.x != null
    ? carePanelBox
    : {
        x: fallback.panelX,
        y: fallback.panelY,
        width: fallback.panelWidth,
        height: fallback.panelHeight,
      };
  const padding = guardCfg.carePnlPddng;
  return (
    gaze.x >= panel.x - padding &&
    gaze.x <= panel.x + panel.width + padding &&
    gaze.y >= panel.y - padding &&
    gaze.y <= panel.y + panel.height + padding
  );
}

function guardCareEnggd(gaze, hasController) {
  if (!hasController || !gaze) return false;
  return (
    guardCareEntt().some((entity) =>
      grdCarNeaEnt(gaze, entity)
    ) || grdCareNearPnl(gaze)
  );
}

function careIxFadeAlph() {
  if (!care.state.canceling) return 1;
  const progress = clamp(
    care.state.cnclElapsedMs /
      max(1, care.state.cnclDurMs),
    0,
    1
  );
  return 1 - cubicSmoothstep(progress);
}

// Enter the cancellation phase, saving the Guardian's current scale and setting the resolution duration.
function bgnCarGazCnc(
  durationMs = null,
  compRpr = false
) {
  if (care.state.canceling || care.state.phase === "idle") {
    return false;
  }
  // On cancellation, stop ecological actions and encounter
  // timing while preserving fields needed for visual resolution.
  care.state.canceling = true;
  care.state.cnclElapsedMs = 0;
  const resDurMs =
    durationMs === null
      ? careWindowMs(
          guardCfg.careCnclFadeMs
        )
      : durationMs;
  care.state.cnclDurMs = max(1, resDurMs);
  care.state.cnclCompRpr = compRpr;
  care.state.isEncnTmd = false;
  care.state.leaveMs = careWindowMs(
    guardCfg.leaveGraceMs
  );
  care.state.phase = "canceling";
  care.state.phaseElapsedMs = 0;
  care.state.interveneKind = null;
  // Snapshot each Guardian's current scale so fade-out returns
  // smoothly from the actual interrupted pose to ordinary state.
  for (const guardian of care.state.participants) {
    guardian.guardSigns = false;
    if (
      (guardian.drftSymblMode === "plus" ||
        guardian.driftSignMix?.toMode === "plus") &&
      guardian.driftSignMix?.toMode !== "base"
    ) {
      guardian.beginDriftFade("plus", "base");
    }
    guardian.guarCncStrScl = Number.isFinite(
      guardian.careScale
    )
      ? guardian.careScale
      : 1;
  }
  return true;
}

// Restore Guardian scale according to cancellation progress,
// then resolve required repair costs and reset care on completion.
function updtCarGazCnc(elapsedMs) {
  care.state.cnclElapsedMs += elapsedMs;
  const progress = clamp(
    care.state.cnclElapsedMs /
      max(1, care.state.cnclDurMs),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  for (const guardian of care.state.participants) {
    guardian.careScale = lerp(
      guardian.guarCncStrScl ?? 1,
      1,
      eased
    );
  }
  if (progress < 1) return false;
// Retain participating Guardians before reset for repair-cost resolution.
  const participants = [...care.state.participants];
  const shldDoneRpr =
    care.state.cnclCompRpr &&
    care.state.repairApplied &&
    !care.state.rprUsgSttld;
  for (const guardian of care.state.participants) {
    care.settle(guardian);
    delete guardian.guarCncStrScl;
  }
  // If a shield has been applied and its use count awaits resolution,
  // cancellation must still commit the repair cost.
  if (shldDoneRpr) {
    doneCareRprs(
      participants,
      typeof millis === "function" ? millis() : 0
    );
  }
  rstGuardCare();
  return true;
}

// When gaze leaves the care target and panel or input is interrupted,
// allow a return grace period before cancellation begins.
function updtGrdCareLv(gaze, hasController, elapsedMs) {
  const active =
    care.state.phase !== "idle" &&
    care.state.phase !== "scanning" &&
    !care.state.canceling;
  if (!active) return false;
  if (guardCareEnggd(gaze, hasController)) {
    care.state.leaveMs = 0;
    return false;
  }
  care.state.leaveMs += elapsedMs;
  if (
    care.state.leaveMs <
    careWindowMs(
      guardCfg.leaveGraceMs
    )
  ) {
    return false;
  }
  return bgnCarGazCnc();
}

// The completion phase freezes progress and relationship results before starting visual resolution.
function bgnGrdCareFnsh() {
  return bgnCarGazCnc(
    careWindowMs(
      guardCfg.careFnshFadeMs
    ),
    true
  );
}

// Open the panel after in-world care completes, retaining the locked source, species, and participants.
function openCarePanel() {
  for (const guardian of care.state.participants) {
    guardian.guardSigns = false;
    const transition = guardian.driftSignMix;
    if (
      guardian.drftSymblMode === "plus" &&
      transition?.toMode !== "base"
    ) {
      guardian.beginDriftFade("plus", "base");
    }
  }
  care.state.phase = "panel";
  care.state.phaseElapsedMs = 0;
  care.state.interveneKind = null;
}

// Begin panel fade-out so the care result gradually leaves the image.
function bgnCarePnlFade() {
  if (care.state.pnlFadeStart) return false;
  care.state.pnlFadeStart = true;
  care.state.pnlFadElaMs = 0;
  return true;
}

// Panel closure uses independent fade timing; state resolution occurs once visual departure completes.
function updtCarPnlFad() {
  const doneMoveN =
    care.state.shields.filter((approach) =>
      ["settling", "complete"].includes(approach.state)
    ).length;
  const pnlFadeCtff = min(
    2,
    care.state.shields.length
  );
  if (
    pnlFadeCtff > 0 &&
    doneMoveN >= pnlFadeCtff
  ) {
    sttlRprUse();
    bgnCarePnlFade();
  }
}

// 6. Guardians approach targets and carry support into protective relationships
// This section updates protective relationships and movement snapshots;
// lifeform additions and removals enter the ecology through the common world queue.
function guardPrntN(source) {
  const careNoise =
    abs(sin((source?.seed || 0) * 0.023 + 4.117)) % 1;
  return floor(
    lerp(
      guardCfg.careParentMin,
      guardCfg.careParentMax + 1,
      careNoise
    )
  );
}

// Prefer the source's care-time visual coordinates, falling back
// to its ordinary world position when interaction state is absent.
function careSourcePos(source) {
  const position = worldPos(source);
  return {
    x: Number.isFinite(source?.guardVisX)
      ? source.guardVisX
      : position.x,
    y: Number.isFinite(source?.guardVisY)
      ? source.guardVisY
      : position.y,
  };
}

// Derive approach speed from path length and remaining phase time
// so Guardians arrive at their targets as synchronously as possible.
function careApprSpd(
  distLeft,
  minMul,
  maxMul
) {
  const distProg = clamp(
    distLeft /
      max(1, guardCfg.apprSpdFarDist),
    0,
    1
  );
  const easedDistProg =
    cubicSmoothstep(distProg);
  const multiplier = lerp(
    minMul,
    maxMul,
    easedDistProg
  );
  return (
    settings.cruise.guard.speed *
    eco.moveSpeed *
    eco.simFps *
    multiplier
  );
}

// Calculate support-approach speed from remaining distance and apply the support-phase limit.
function careSupSpd(distLeft) {
  return careApprSpd(
    distLeft,
    guardCfg.suppSpdSclMin,
    guardCfg.suppSpdSclMax
  );
}

// Calculate shield-approach speed from remaining distance while maintaining a minimum visible movement.
function careShldSpd(distLeft) {
  return careApprSpd(
    distLeft,
    guardCfg.shldSpdSclMin,
    guardCfg.shldSpdSclMax
  );
}

// Sort by travel distance and assign post-cleanup waiting time to nearer relationships.
function assgnCareWts(links) {
  const ranked = [...links].sort(
    (left, right) => left.travelDistance - right.travelDistance
  );
  const fastCount = max(
    1,
    ceil(
      ranked.length *
        guardCfg.postClrWaiFasS
    )
  );
  ranked.forEach((link, index) => {
    if (index >= fastCount) {
      link.postClrWaiDurM = 0;
      return;
    }
    const fastRankProg =
      fastCount <= 1 ? 0 : index / (fastCount - 1);
    link.postClrWaiDurM = lerp(
      guardCfg.postClrWaiMaxM,
      guardCfg.postClrWaiMinM,
      fastRankProg
    );
  });
}

// Select a protective target by distance from available Roamers or Deep Divers.
function slctGrdPrnts(
  type,
  source,
  origin = careSourcePos(source),
  excluded = new Set()
) {
  if (
    type !== eco.lifeType.roamer &&
    type !== eco.lifeType.deepDiver
  ) {
    return [];
  }
  const candidates = careEntForTyp(type)
    .filter(
      (entity) =>
        entity !== care.state.careTarget &&
        !excluded.has(entity) &&
        tgtRdyToSssn(entity)
    )
    .sort((left, right) => {
      const leftPosition = worldPos(left);
      const rightPosition = worldPos(right);
      return (
        dist2(
          origin.x,
          origin.y,
          leftPosition.x,
          leftPosition.y
        ) -
        dist2(
          origin.x,
          origin.y,
          rightPosition.x,
          rightPosition.y
        )
      );
    });
  return candidates.slice(
    0,
    min(candidates.length, guardPrntN(source))
  );
}

// Build protective-formation pairs from Guardians and repairable targets
function prprCareShld() {
  const source = care.state.source;
  if (!source) return false;
  const guardians = care.state.participants.length
    ? care.state.participants
    : [source];
  const assigned = new Set();
  const links = [];
  // Assign a distinct target to each Guardian first,
  // allowing targets to be shared when there are too few.
  for (const guardian of guardians) {
    const origin = careSourcePos(guardian);
    let targets = slctGrdPrnts(
      care.state.protectType,
      guardian,
      origin,
      assigned
    );
    if (!targets.length) {
      targets = slctGrdPrnts(
        care.state.protectType,
        guardian,
        origin
      );
    }
    for (const target of targets) {
      links.push({
        guardian,
        target,
        boostStarted: false,
        mateStart: false,
        birthStarted: false,
        careApplied: false,
      });
      assigned.add(target);
    }
  }
  if (!links.length) return false;
  // Pair links are the primary relationship source for subsequent approach, enhancement,
  // and birth phases; parent lists are derived from them.
  care.state.links = links;
  care.state.parents = [...new Set(
    links.map((link) => link.target)
  )];
  care.state.shieldTarget =
    links.find((link) => link.guardian === source)?.target ||
    links[0].target;
  care.state.newborns = [];
  care.state.boostStarted = false;
  care.state.birthRolls = [];
  return true;
}

function guardShldPnt(target, guardian, directionX, directionY) {
  const targetPosition = worldPos(target);
  const gap =
    infoRadius(guardian) +
    infoRadius(target) +
    guardCfg.shldApprGap;
  return {
    x: targetPosition.x + directionX * gap,
    y: targetPosition.y + directionY * gap,
  };
}

// Cross-limiting points use both visible radii to preserve controlled overlap,
// conveying intervention while retaining a visible area for the target.
function guardLmtPnt(
  target,
  guardian,
  directionX,
  directionY
) {
  const targetPosition = worldPos(target);
  const targetRadius = infoRadius(target);
  const guardianRadius = infoRadius(guardian);
  const centerDistance =
    targetRadius +
    guardianRadius *
      (1 - guardCfg.crssGrdOvrlp);
  return {
    x: targetPosition.x + directionX * centerDistance,
    y: targetPosition.y + directionY * centerDistance,
  };
}

// Generate the approach path once before movement begins.
function prepCarePaths() {
  care.state.shieldSequence = 0;
  care.state.shields = care.state.participants.map(
    (guardian) => ({
      guardian,
      target:
        care.state.links.find(
          (link) => link.guardian === guardian
        )?.target || care.state.shieldTarget,
      links: care.state.links.filter(
        (link) => link.guardian === guardian
      ),
      state: "pending",
      travelDist: 0,
      trvlElapsedMs: 0,
      moveElapsedMs: 0,
      sttlElapsedMs: 0,
    })
  );
}

// Convert approach distance into a bounded animation
// duration so near and far targets convey comparable speed.
function careMoveDur(distance) {
  const distProg = clamp(
    distance / max(1, guardCfg.careMovFarDis),
    0,
    1
  );
  return lerp(
    guardCfg.careMoveMinMs,
    guardCfg.careMoveMaxMs,
    distProg
  );
}

// Build movement plans from preassigned relationships and save
// each Guardian's original pose for restoration on cancellation.
function prepCareMove(
  approach,
  sourcePosition = null
) {
  const source =
    sourcePosition || careSourcePos(approach.guardian);
  let maxDist = 0;
  let maxDur = guardCfg.careMoveMinMs;
  for (const link of approach.links || []) {
    const target = worldPos(link.target);
    link.moveDist = Math.hypot(
      target.x - source.x,
      target.y - source.y
    );
    link.moveDurMs = careMoveDur(
      link.moveDist
    );
    maxDist = max(maxDist, link.moveDist);
    maxDur = max(maxDur, link.moveDurMs);
  }
  approach.moveDist = maxDist;
  approach.moveDurMs = maxDur;
}

// Convert confirmed care targets into Guardian approach plans.
function strtShldAppr(approach) {
  if (!approach || approach.state !== "pending" || !approach.target) {
    return false;
  }
  const guardian = approach.guardian;
  // Convert minus signs back to plus signs after cross-species suppression,
  // restoring the visual language of recovery for the protection phase.
  if (care.state.interveneKind === "cross-limit") {
    guardian.guardSigns = false;
    guardian.beginDriftFade("minus", "plus");
  }
  const start = careSourcePos(guardian);
  const targetPosition = worldPos(approach.target);
  let directionX = start.x - targetPosition.x;
  let directionY = start.y - targetPosition.y;
  const dirLngth = Math.hypot(directionX, directionY);
  // When start and target overlap, generate a direction from the Guardian seed.
  if (dirLngth > 0.001) {
    directionX /= dirLngth;
    directionY /= dirLngth;
  } else {
    const fallbackAngle = ((guardian.seed || 0) * 0.0001) % TWO_PI;
    directionX = cos(fallbackAngle);
    directionY = sin(fallbackAngle);
  }
  const destination = guardShldPnt(
    approach.target,
    guardian,
    directionX,
    directionY
  );
  approach.startX = start.x;
  approach.startY = start.y;
  approach.directionX = directionX;
  approach.directionY = directionY;
  approach.startScale = Number.isFinite(guardian.careScale)
    ? guardian.careScale
    : 1;
  approach.travelDistance = Math.hypot(
    destination.x - start.x,
    destination.y - start.y
  );
  approach.travelDist = 0;
  approach.trvlElapsedMs = 0;
  approach.startOrder =
    care.state.shieldSequence++;
  prepCareMove(approach, destination);
  approach.state = "traveling";
  const estmDurMs =
    (approach.travelDistance /
      max(
        0.001,
        settings.cruise.guard.speed *
          eco.moveSpeed *
          eco.simFps *
          guardCfg.shldSpdSclMin
      )) *
    1000;
// The session stores its longest estimated duration,
// reserving a completion window for protective relationships.
  care.state.shldDurMs = max(
    care.state.shldDurMs,
    estmDurMs
  );
  if (guardian === care.state.source) {
    care.state.shieldStartX = approach.startX;
    care.state.shieldStartY = approach.startY;
    care.state.shieldDirX = approach.directionX;
    care.state.shieldDirY = approach.directionY;
    care.state.shldStrtScl = approach.startScale;
  }
  return true;
}

// Establish approach records and target pairs once before shielding begins.
function bgnGuardShld() {
  const source = care.state.source;
  if (!source || !prprCareShld()) {
    openCarePanel();
    return false;
  }
  prepCarePaths();
  for (const approach of care.state.shields) {
    care.startShield(approach);
  }
  const sourceApproach =
    care.state.shields.find(
      (approach) => approach.guardian === source
    ) || care.state.shields[0];
  care.state.shieldStartX = sourceApproach.startX;
  care.state.shieldStartY = sourceApproach.startY;
  care.state.shieldDirX = sourceApproach.directionX;
  care.state.shieldDirY = sourceApproach.directionY;
  care.state.shldStrtScl = sourceApproach.startScale;
  care.state.shldDurMs = max(
    ...care.state.shields.map(
      (approach) =>
        (approach.travelDistance /
          max(
            0.001,
            settings.cruise.guard.speed *
              eco.moveSpeed *
              eco.simFps *
              guardCfg.shldSpdSclMin
          )) *
        1000
    )
  );
  care.state.interveneKind = "protection-approach";
  care.state.phase = "protection-approaching";
  care.state.phaseElapsedMs = 0;
  return true;
}

// Start repair feedback for each target after its Guardian completes the approach
function bgnGrdCareBst(approach) {
  care.state.boostStarted = true;
  for (const link of approach.links) {
    if (link.boostStarted) continue;
    const alreadyBoosted = care.state.links.some(
      (candidate) =>
        candidate.target === link.target && candidate.boostStarted
    );
    for (const candidate of care.state.links) {
      if (candidate.target === link.target) candidate.boostStarted = true;
    }
    if (!alreadyBoosted) {
      bgnGuardBst(link.target, approach.guardian);
    }
  }
}

// Deduplicate offspring plans by parent relationship and store their outcomes in advance.
function bgnGrdChld(links, now) {
  for (const link of links) {
    if (!link?.target || link.mateStart) continue;
    const alreadyStarted = care.state.links.some(
      (candidate) =>
        candidate.target === link.target && candidate.mateStart
    );
    for (const candidate of care.state.links) {
      if (candidate.target === link.target) candidate.mateStart = true;
    }
    if (alreadyStarted) continue;
    link.target.guarCarStaAt = now;
    link.target.guardCareUntl =
      now + guardCfg.careMateMs;
    link.target.carePartSeed =
      abs(sin((link.target.seed || 0) * 0.019)) * TWO_PI;
    link.target.careCompanions = care.crtComp(
      link.target,
      link.guardian || care.state.source,
      now
    );
  }
}

// Deduplicate birth opportunities by valid parent and store their random rolls.
function bgnGuardBrths(links, now) {
  const targets = [...new Set(links.map((link) => link?.target))].filter(Boolean);
  for (const target of targets) {
    const alreadyStarted = care.state.links.some(
      (candidate) => candidate.target === target && candidate.birthStarted
    );
    for (const candidate of care.state.links) {
      if (candidate.target === target) candidate.birthStarted = true;
    }
    if (alreadyStarted) continue;
    const index = care.state.birthRolls.length;
    const rollRng = mulberry32(
      (floor((target.seed || 0) * 1000) ^
        floor(now) ^
        Math.imul(index + 1, 0x9e3779b1)) >>>
        0
    );
    const roll = rollRng();
    let child = null;
    if (roll < guardCfg.birthChance) {
      child = crtGuardChld(target, index, now);
      if (child) care.state.newborns.push(child);
    }
    care.state.birthRolls.push({
      type: target.type,
      roll,
      born: Boolean(child),
    });
  }
}

function settleCare(guardian) {
  // Resolution clears care-specific poses; each Guardian instance
  // continues to own its ordinary movement and individual form.
  if (!guardian || guardian.repairRetired) return;
  guardian.guardSigns = false;
  const finalPosition = careSourcePos(guardian);
  const driftX = Number.isFinite(guardian.tt)
    ? (noise(guardian.seed + guardian.tt) - 0.5) *
      (driftMode.guard.dx ?? 0)
    : 0;
  const driftY = Number.isFinite(guardian.dy) ? guardian.dy : 0;
  const cruiseX = finalPosition.x - driftX;
  const cruiseY = finalPosition.y - driftY;
  guardian.x = finalPosition.x;
  guardian.y = finalPosition.y;
  guardian.x0 = cruiseX;
  guardian.y0 = cruiseY;
  guardian.cruiseCenter = {
    x: cruiseX,
    y: cruiseY,
  };
  guardian.edgeResident = false;
  guardian.poleResident = null;
  guardian.cruiseOffsetX = 0;
  guardian.cruiseOffsetY = 0;
  guardian.attentionVisualX = null;
  guardian.attentionVisualY = null;
  guardian.attentionOffsetX = 0;
  guardian.attentionOffsetY = 0;
  guardian.attnPhase = "idle";
  guardian.attnTgts = [];
  guardian.attnOn = false;
  guardian.attnPow = 0;
  guardian.attnPlusPow = 0;
  delete guardian.guardVisX;
  delete guardian.guardVisY;
  delete guardian.careScale;
}

// This function was modified with the assistance of ChatGPT.
function updtShldAppr(
  elapsedMs,
  advnPhsEla = true,
  cordPhs = true
) {
  // Abandon and replan the current pair if its source, shield, or target becomes invalid.
  if (
    !care.state.source ||
    !care.state.shields.length ||
    care.state.shields.some(
      (approach) => !approach.target || !isVisible(approach.target)
    )
  ) {
    care.state.links = [];
    care.state.parents = [];
    care.state.shieldTarget = null;
    care.state.shields = [];
    bgnGuardShld();
    return;
  }
  if (advnPhsEla) {
    care.state.phaseElapsedMs += elapsedMs;
  }
  if (care.state.boostStarted) {
    updtCareBst(elapsedMs);
  }
  for (const approach of care.state.shields) {
    if (approach.guardian?.repairRetired) {
      approach.relsToCrs = true;
      approach.state = "complete";
      continue;
    }
    // traveling reaches a protective position outside the target;
    // ecological changes are committed during settling.
    if (approach.state === "traveling") {
      approach.trvlElapsedMs += elapsedMs;
      const current = careSourcePos(
        approach.guardian
      );
      const destination = guardShldPnt(
        approach.target,
        approach.guardian,
        approach.directionX,
        approach.directionY
      );
      const dx = destination.x - current.x;
      const dy = destination.y - current.y;
      const distLeft = Math.hypot(dx, dy);
      const approachSpeed =
        careShldSpd(distLeft);
      approach.currentSpeed = approachSpeed;
      approach.curSpdMul =
        approachSpeed /
        max(
          0.001,
          settings.cruise.guard.speed * eco.moveSpeed * eco.simFps
        );
      const step = min(
        distLeft,
        approachSpeed * (elapsedMs / 1000)
      );
      if (distLeft > 0.001) {
        approach.guardian.guardVisX =
          current.x + (dx / distLeft) * step;
        approach.guardian.guardVisY =
          current.y + (dy / distLeft) * step;
      }
      approach.travelDist += step;
      // Travel distance also returns Guardian scale to baseline
      // so body and protective pose stabilize together on arrival.
      const progress = clamp(
        approach.travelDist / max(0.001, approach.travelDistance),
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      approach.guardian.careScale = lerp(
        approach.startScale,
        1,
        eased
      );
      // Freeze the visual position after arrival and prepare the transfer plan;
      // log the event when the relationship is established.
      if (step >= distLeft - 0.001) {
        approach.guardian.guardVisX = destination.x;
        approach.guardian.guardVisY = destination.y;
        approach.guardian.careScale = 1;
        prepCareMove(approach);
        approach.state = "transferring";
        approach.moveElapsedMs = 0;
        recordCareNote(
          "protection",
          lifeLogNow(),
          { priority: 90 }
        );
      }
      continue;
    }
    // transferring reveals enhancement, accompaniment, and breathing feedback in sequence,
    // giving the support result a legible formation process.
    if (approach.state === "transferring") {
      approach.moveElapsedMs += elapsedMs;
      if (
        approach.moveElapsedMs >=
        guardCfg.careBstDlyMs
      ) {
        bgnGrdCareBst(approach);
      }
      if (
        approach.moveElapsedMs >=
        guardCfg.careMateDlyMs
      ) {
        bgnGrdChld(approach.links, millis());
      }
      if (
        approach.moveElapsedMs >=
        approach.moveDurMs *
          guardCfg.brthMoveProg
      ) {
        bgnGuardBrths(approach.links, millis());
      }
      if (
        approach.moveElapsedMs >=
        approach.moveDurMs
      ) {
        applyCareMove(approach.links, false);
        approach.state = "settling";
        approach.sttlElapsedMs = 0;
      }
      continue;
    }
    // settling leaves time for the result to settle before restoring the Guardian's ordinary pose.
    if (approach.state === "settling") {
      approach.sttlElapsedMs += elapsedMs;
      if (
        approach.sttlElapsedMs >=
        guardCfg.careSettleMs
      ) {
        care.settle(approach.guardian);
        approach.relsToCrs = true;
        approach.state = "complete";
      }
    }
  }
  updtCarPnlFad();
  if (!cordPhs) return;
  // Derive the global phase from all local relationships.
  const hasTraveling = care.state.shields.some(
    (approach) => approach.state === "traveling"
  );
  const hasTrns = care.state.shields.some(
    (approach) => approach.state === "transferring"
  );
  const hasSettling = care.state.shields.some(
    (approach) => approach.state === "settling"
  );
  const hasPending = care.state.shields.some(
    (approach) => approach.state === "pending"
  );
  const clrSeqActv = care.state.limitLinks.some(
    (link) => link.state && link.state !== "complete"
  );
  // Cleanup sequences take precedence over protection and support phases.
  if (clrSeqActv) {
    care.state.interveneKind = "guardian-clear";
    care.state.phase = care.state.limitLinks.some(
      (link) => link.state === "traveling"
    )
      ? "guardian-wrapping"
      : care.state.limitLinks.some(
            (link) => link.state === "clearing"
          )
        ? "guardian-clearing"
        : "guardian-clear-waiting";
    return;
  }
  if (hasPending) {
    for (const approach of care.state.shields) {
      care.startShield(approach);
    }
  }
  care.state.interveneKind =
    hasTraveling || hasPending
      ? "protection-approach"
      : "support";
  if (hasTraveling || hasPending) {
    care.state.phase = "protection-approaching";
  } else if (hasTrns) {
    care.state.phase = "support-transferring";
  } else if (hasSettling) {
    care.state.phase = "support-settling";
  } else {
    openCarePanel();
  }
}

// Enter the panel phase only after in-world care completes,
// retaining source and participants for continued result narration.
function turnCareToPnl() {
  const doneCrssLmt =
    care.state.interveneKind === "cross-limit";
  for (const guardian of care.state.participants) {
    guardian.guardSigns = false;
    if (doneCrssLmt) {
      guardian.beginDriftFade("minus", "plus");
    }
  }
  if (doneCrssLmt) {
    for (const guardian of care.state.participants) {
      stblCarePlss(guardian);
    }
  }
  care.state.interveneKind = null;
  bgnGuardShld();
}

function crtCareComp(
  parent,
  guardian,
  now,
  sizeScaleMin = guardCfg.careChldSclMin,
  sizeScaleMax = guardCfg.careCellSclMax
) {
  // Parent and Guardian jointly determine companion count
  // and orbit parameters, keeping one care result stable.
  const pluses = guardian?.driftPluses || [];
  const seed =
    (floor((parent?.seed || 0) * 1000) ^
      floor((guardian?.seed || 0) * 1000) ^
      floor(now) ^
      0x51ed270b) >>>
    0;
  const rng = mulberry32(seed);
  const count = floor(
    lerp(
      guardCfg.careMateNMin,
      guardCfg.careMateNMax + 1,
      rng()
    )
  );
  const guardDrawScl = guardian
    ? eco.drawScale * guardian.sz * scaleOf(guardian.type) * guardian.b
    : 1;
  return Array.from({ length: count }, (_, index) => {
    // Prefer dimensions inherited from the Guardian's actual drifting symbols;
    // use safe defaults when the symbol set is empty.
    const sourcePlus = pluses.length ? pluses[index % pluses.length] : null;
    const sourceSize = sourcePlus
      ? sourcePlus.size *
        driftCfg.sizeMul *
        guardDrawScl
      : 4;
    const sizeScale = lerp(sizeScaleMin, sizeScaleMax, rng());
    return {
      size: sourceSize * sizeScale,
      sizeScale,
      alpha: lerp(
        guardCfg.careMatAlpMin,
        guardCfg.careMatAlpMax,
        rng()
      ),
      phaseOffset: rng() * TWO_PI,
      radiusScale: lerp(0.82, 1.08, rng()),
      speed: lerp(0.00028, 0.0004, rng()),
      rotationScale: lerp(0.12, 0.22, rng()),
    };
  });
}

// Record the target's original scale and responsible Guardian when enhancement begins.
function bgnGuardBst(entity, guardian) {
  if (!entity) return false;
  const count = entity.guardCareBstN || 0;
  if (count >= guardCfg.careBoostLimit) return false;
  const currentScale = Number.isFinite(entity.guardCareScl)
    ? entity.guardCareScl
    : 1;
  const currentAlpha = Number.isFinite(entity.guardCareAlph)
    ? entity.guardCareAlph
    : 1;
  const targetScale = Number.isFinite(entity.guarCarSclTgt)
    ? entity.guarCarSclTgt
    : currentScale;
  const targetAlpha = Number.isFinite(entity.guarCarAlpTgt)
    ? entity.guarCarAlpTgt
    : currentAlpha;
  entity.guarCarSclTgt =
    targetScale * guardCfg.careSizeScale;
  entity.guarCarAlpTgt =
    targetAlpha * guardCfg.careAlphaScale;
  entity.guardCareBst = {
    elapsedMs: 0,
    fromScale: currentScale,
    fromAlpha: currentAlpha,
  };
  entity.guardCareBstN = count + 1;
  entity.guardCareSrc = guardian;
  return true;
}

// Advance all enhancement relationships on the same phase
// clock and commit one care effect at the completion boundary.
function updtCareBst(elapsedMs) {
  for (const entity of creatures) {
    const transition = entity.guardCareBst;
    if (!transition) continue;
    transition.elapsedMs += elapsedMs;
    const progress = clamp(
      transition.elapsedMs /
        max(1, guardCfg.careBstTxMs),
      0,
      1
    );
    const eased = cubicSmoothstep(progress);
    entity.guardCareScl = lerp(
      transition.fromScale,
      entity.guarCarSclTgt,
      eased
    );
    entity.guardCareAlph = lerp(
      transition.fromAlpha,
      entity.guarCarAlpTgt,
      eased
    );
    if (progress >= 1) {
      entity.guardCareScl = entity.guarCarSclTgt;
      entity.guardCareAlph = entity.guarCarAlpTgt;
      entity.guardCareBst = null;
    }
  }
}

// 7. Repair leaves seeds, and new life grows from them
function crtGuardChld(parent, index, now) {
  const creatureWorld = window.CreatureWorld;
  if (!parent || !creatureWorld?.add) return null;
  const seed =
    (floor(parent.seed || 0) ^
      Math.imul(index + 1, 0x9e3779b1) ^
      floor(now)) >>>
    0;
  // Parent, birth sequence, and time jointly generate a local random source.
  const rng = mulberry32(seed);
  const angle = rng() * TWO_PI;
  const parentPosition = worldPos(parent);
  const spawnDistance =
    infoRadius(parent) * 0.7 + guardCfg.birthOffset;
// Constrain the birth position to ecological bounds so offspring appear near their parent.
  const spawnPoint = ecoWorld.project(
    parentPosition.x + cos(angle) * spawnDistance,
    parentPosition.y + sin(angle) * spawnDistance,
    20
  );
  let child = null;
  if (parent.type === eco.lifeType.roamer) {
    child = new Roamer(spawnPoint.x, spawnPoint.y, angle);
    child.sz = parent.sz;
  } else if (parent.type === eco.lifeType.deepDiver) {
    child = new DeepDiver(
      spawnPoint.x,
      spawnPoint.y,
      srng(rng, 100, 900),
      angle
    );
    child.sz = parent.sz;
  }
  // Roamers and Deep Divers with corresponding offspring forms enter this birth path.
  if (!child) return null;
  child.grdBrthGlowAt = now;
  child.guarBrtGloRad = infoRadius(child);
  child.careBirth = {
    startAt: now,
    revealDuration: guardCfg.birthRevealMs,
    growthDuration: guardCfg.birthGrowthMs,
    initialScale: guardCfg.brthInitScl,
    revealScale: guardCfg.brthShowScl,
  };
  child.guardBirthMul =
    guardCfg.brthInitScl;
  child.guardBrthAlph = 0;
  // Configure the birth animation before handing the offspring to the world system.
  return creatureWorld.add(child, {
    group: "creature",
    origin: "guardian-ecology-support",
    parentSeed: parent.seed,
    targetType: parent.type,
  })
    ? child
    : null;
}

// Start care enhancement and birth; preserve existing result markers when resetResults is false.
function applyCareMove(
  links = care.state.links,
  resetResults = true
) {
  const now = typeof millis === "function" ? millis() : 0;
  if (resetResults) {
    care.state.newborns = [];
    care.state.birthRolls = [];
    for (const link of care.state.links) {
      link.careApplied = false;
      link.birthStarted = false;
    }
  }
  bgnGrdChld(links, now);
  bgnGuardBrths(links, now);
  const parents = [...new Set(links.map((link) => link.target))].filter(
    (parent) =>
      !care.state.links.some(
        (link) => link.target === parent && link.careApplied
      )
  );
  for (const parent of parents) {
    for (const candidate of care.state.links) {
      if (candidate.target === parent) candidate.careApplied = true;
    }
  }
  if (parents.length) {
    care.state.repairApplied = true;
  }
}

function updtGuardBrth(entity, now) {
// New life begins by revealing its contour, then unfolds its growth,
// giving appearance and maturation distinct rhythms.
  const birth = entity?.careBirth;
  if (!birth) return;
  const age = max(0, now - birth.startAt);
  if (age < birth.revealDuration) {
    const revealProgress = clamp(
      age / max(1, birth.revealDuration),
      0,
      1
    );
    const revealEase =
      cubicSmoothstep(revealProgress);
    entity.guardBirthMul = lerp(
      birth.initialScale,
      birth.revealScale,
      revealEase
    );
    entity.guardBrthAlph = revealEase;
    return;
  }
  if (birth.doneAftrShow) {
    entity.guardBirthMul = birth.revealScale;
    entity.guardBrthAlph = 1;
    entity.careBirth = null;
    return;
  }
  const growthProgress = clamp(
    (age - birth.revealDuration) / max(1, birth.growthDuration),
    0,
    1
  );
  const growthEase =
    growthProgress * growthProgress * growthProgress *
    (growthProgress * (growthProgress * 6 - 15) + 10);
  entity.guardBirthMul = lerp(
    birth.revealScale,
    1,
    growthEase
  );
  entity.guardBrthAlph = 1;
  if (growthProgress >= 1) {
    entity.guardBirthMul = 1;
    entity.guardBrthAlph = 1;
    entity.careBirth = null;
  }
}

// Repair presentation returns smoothly from the damaged scale to normal;
// logical repair is committed when completion conditions are met.
function updtCareRpr(entity, now) {
  const transition = entity?.guardRprTx;
  if (!transition) return;
  const progress = clamp(
    (now - transition.startAt) / max(1, transition.duration),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  entity.guardRprScl = lerp(
    transition.fromScale,
    transition.toScale,
    eased
  );
  entity.guardRprAlph = lerp(
    transition.fromAlpha,
    transition.toAlpha,
    eased
  );
  entity.grdRprRing = lerp(
    transition.fromRingWeight,
    transition.toRingWeight,
    eased
  );
  if (progress >= 1) entity.guardRprTx = null;
}

function crtSeedGroup(guardian, now) {
  // A retiring Guardian leaves seeds, carrying the cost of care into the next regeneration.
  const position = careSourcePos(guardian);
  const minimumCount = max(
    1,
    floor(guardCfg.seedCountMin || 1)
  );
  const maximumCount = max(
    minimumCount,
    floor(guardCfg.seedCountMax || minimumCount)
  );
  const seedRng = mulberry32(
    (floor((guardian.seed || 0) * 1000) ^ 0x6a09e667) >>> 0
  );
  const seedCount = min(
    maximumCount,
    minimumCount + floor(seedRng() * (maximumCount - minimumCount + 1))
  );
  const spread =
    seedCount > 1
      ? lerp(
          guardCfg.seedSpreadMin,
          guardCfg.seedSpreadMax,
          seedRng()
        )
      : 0;
  const spreadAngle = seedRng() * TWO_PI;
  const baseFloatPhase =
    abs(sin((guardian.seed || 0) * 0.017)) * TWO_PI;

  // Distribute multiple seeds evenly and project them back within world bounds.
  for (let index = 0; index < seedCount; index++) {
    const angle = spreadAngle + (index * TWO_PI) / seedCount;
    const seedPosition = ecoWorld.project(
      position.x + cos(angle) * spread,
      position.y + sin(angle) * spread,
      20
    );
    guardSeedClst.push({
      x: seedPosition.x,
      y: seedPosition.y,
      sourceGuard: guardian,
      createdAt: now,
      txEndsAt: now + guardCfg.seedTxMs,
      sourceSize: guardian.sz,
      sourceRotation: guardian.rot,
      sourceBreath: guardian.b,
      srcOtrPhs: guardian.r1,
      srcInnrPhs: guardian.r2,
      srcRprScl: guardian.guardRprScl ?? 1,
      srcRprAlph: guardian.guardRprAlph ?? 1,
      floatPhase:
        baseFloatPhase + (index * TWO_PI) / seedCount + seedRng() * 0.35,
      edgeResident: guardian.edgeResident || null,
    });
  }
  return seedCount;
}

// After repair completes, resolve Guardian, target, and log
// state before entering seed reveal and relationship fade-out.
function doneCareRpr(guardian, now) {
  if (!guardian || guardian.type !== eco.lifeType.guardian) return false;
  const useCount = min(
    guardCfg.repairUseLimit,
    (guardian.guardianRepairUseCount || 0) + 1
  );
  // If the limit is reached but the species minimum requires retention, roll back one count;
  // the ecological floor takes precedence over retirement rules.
  if (
    useCount >= guardCfg.repairUseLimit &&
    !lifeCanRmvEnt(guardian)
  ) {
    guardian.guardianRepairUseCount = max(
      0,
      guardCfg.repairUseLimit - 1
    );
    return false;
  }
  guardian.guardianRepairUseCount = useCount;
  // A retiring Guardian passes a sequence of care to its seeds,
  // then the old lifeform leaves through the world queue.
  if (useCount >= guardCfg.repairUseLimit) {
    guardian.repairRetired = true;
    care.crtSeedGroup(guardian, now);
    enqWrldCmmnd(
      activeSession,
      "guardian-retire",
      () =>
        window.CreatureWorld?.remove?.(
          guardian,
          "guardian-repair-limit"
        ),
      { seed: guardian.seed }
    );
    return true;
  }

  const toScale = pow(
    guardCfg.rprSclPerUse,
    useCount
  );
  const toAlpha = pow(
    guardCfg.rprAlphPerUse,
    useCount
  );
  const toRingWeight = pow(
    guardCfg.rprRingWght,
    useCount
  );
  // I leave the cost of repair on the Guardian, recording each use through scale, opacity, and rings.
  guardian.guardRprTx = {
    startAt: now,
    duration: guardCfg.rprTxMs,
    fromScale: guardian.guardRprScl ?? 1,
    fromAlpha: guardian.guardRprAlph ?? 1,
    fromRingWeight: guardian.grdRprRing ?? 1,
    toScale,
    toAlpha,
    toRingWeight,
  };
  clearLifeCache(guardian);
  return true;
}

// Deduplicate participating Guardians before resolving repair-use counts and retirement outcomes.
function doneCareRprs(guardians, now) {
  const unqGurd = [...new Set(guardians || [])].filter(
    (guardian) =>
      guardian && guardian.type === eco.lifeType.guardian
  );
  let completedCount = 0;
  for (const guardian of unqGurd) {
    if (doneCareRpr(guardian, now)) completedCount++;
  }
  if (completedCount > 0) {
    window.SharedClient?.recordInfluence?.(
      eco.lifeType.guardian,
      completedCount,
      { eventType: legacyEvent.guardianCare }
    );
    lifeLog.record(
      "BALANCE RESTORED",
      "Guardians have made room for vulnerable lives.",
      {
        key: "balance-restored",
        primarySpecies: "Guardian",
        aggregationKey: "balance-restored",
        priority: 100,
        dedupeMs: 30000,
        display: false,
        now,
      }
    );
  }
  return completedCount;
}

// Resolve repair cost for each deduplicated Guardian and set completion markers.
function sttlRprUse(
  now = typeof millis === "function" ? millis() : 0
) {
  if (
    !care.state.repairApplied ||
    care.state.rprUsgSttld ||
    !care.state.source
  ) {
    return false;
  }
  care.state.rprUsgSttld = true;
  const participants = care.state.participants.length
    ? care.state.participants
    : [care.state.source];
  return doneCareRprs(participants, now) > 0;
}

// Seed drift combines a stable phase with slow amplitude, affecting visual position.
function grdSeeFltOff(cluster, now) {
  const phase = cluster?.floatPhase || 0;
  const floatStartedAt = Number.isFinite(cluster?.txEndsAt)
    ? cluster.txEndsAt
    : now;
  const age = max(0, now - floatStartedAt);
  const entrProg = clamp(
    age / max(1, guardCfg.seedFltEasInMs),
    0,
    1
  );
  const entranceEase =
    cubicSmoothstep(entrProg);
  return {
    x:
      sin(
        now * (TWO_PI / guardCfg.seedFltPrdXMs) +
          phase
      ) * guardCfg.seedFloatX * entranceEase,
    y:
      sin(
        now * (TWO_PI / guardCfg.seedFltPrdYMs) +
          phase * 1.37
      ) * guardCfg.seedFloatY * entranceEase,
  };
}

// Seed transformation combines appearance, hold, and fade into a unified visual state.
function getSeedTx(cluster, now) {
  const progress = clamp(
    (now - cluster.createdAt) /
      max(1, guardCfg.seedTxMs),
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  return {
    progress,
    scale: lerp(
      cluster.srcRprScl ?? 1,
      guardCfg.seedScale,
      eased
    ),
    alpha: lerp(
      guardCfg.seedAlpha *
        (cluster.srcRprAlph ?? 1),
      guardCfg.seedAlpha,
      eased
    ),
  };
}

// Reserve cells for differentiation and lock the species plan for the care result;
// subsequent animation executes the established outcome.
function assgCarChnPla(
  guardian,
  plan,
  now
) {
  if (!guardian || !plan?.spcReqr) return false;
  const clusters = guardSeedClst.filter(
    (cluster) =>
      cluster.sourceGuard === guardian &&
      cluster.regrowAt == null
  );
  // When no cells are reserved, switch seeds to ordinary
  // regeneration and clear the species-conversion plan.
  if (!plan.speciesCell) {
    for (const cluster of clusters) {
      cluster.careRegrOff = true;
      cluster.regrowAt = now;
    }
    return clusters.length > 0;
  }
  if (!plan.deferred) return false;
  // When the seed count is zero, release reserved cells and downgrade
  // parasite probability to an amplification of existing pressure.
  if (!clusters.length) {
    freeEncnCell(plan.speciesCell, plan.reservationId);
    freeEncnCell(plan.parasiteCell, plan.reservationId);
    if (plan.parasiteRoll && !plan.paraAmped) {
      bstSprsPars();
      plan.paraAmped = true;
    }
    return false;
  }
  const groupId = `${legacyEvent.guardianGroupPrefix}-${plan.reservationId}`;
  // The first seed in a group owns the conversion plan; disable regeneration for the others to prevent
  // duplicate consumption of reserved resources.
  for (let index = 0; index < clusters.length; index++) {
    clusters[index].careRegrGrpId = groupId;
    clusters[index].careRegrOff = index > 0;
  }
  clusters[0].careChangePlan = plan;
  clusters[0].carePlanAssgAt = now;
  return true;
}

// Find an available BasicCell for each mature seed,
// prioritizing reserved cells and selecting others by distance.
function findCarRegSee(now) {
  const cells = window.GazeApp?.targets?.() || [];
  const maximumDistSq =
    guardCfg.seedCellRadius ** 2;
  let best = null;
  let bestDistSq = maximumDistSq;
  for (const cluster of guardSeedClst) {
    if (cluster.careRegrOff) continue;
    if (cluster.regrAppr || cluster.regrowAt != null) continue;
    if (
      now - cluster.txEndsAt <
      guardCfg.seedRegrDlyMs
    ) {
      continue;
    }
    const offset = grdSeeFltOff(cluster, now);
    const seedX = cluster.x + offset.x;
    const seedY = cluster.y + offset.y;
    // A seed first uses the cell reserved by its plan; without a reservation,
    // it searches for the nearest cell within the given radius.
    const reservedCell = cluster.careChangePlan?.speciesCell;
    const candidateCells = reservedCell ? [reservedCell] : cells;
    for (const cell of candidateCells) {
      if (!cell || cell.dead || cell.differentiating) continue;
      const distSq = dist2(
        seedX,
        seedY,
        cell.x,
        cell.y
      );
      if (!reservedCell && distSq > bestDistSq) continue;
      best = { cluster, cell };
      bestDistSq = reservedCell ? -1 : distSq;
      // Return immediately when a valid reserved cell is found, preserving the established pairing.
      if (reservedCell) return best;
    }
  }
  return best;
}

// Draw a BasicCell toward a seed, then transform it into a new Guardian.
// This function was modified with the assistance of ChatGPT.
function updtSeedRegr(now) {
  if (!guardSeedClst.length) return;
  // Remove seeds whose birth reveal is complete after the delay; retain seeds still regenerating.
  for (let index = guardSeedClst.length - 1; index >= 0; index--) {
    const cluster = guardSeedClst[index];
    if (
      cluster.regrowAt != null &&
      now - cluster.regrowAt >=
        guardCfg.seedGuaBrtDlyM +
          guardCfg.seedGuaBrtMs
    ) {
      guardSeedClst.splice(index, 1);
    }
  }
  if (!guardSeedClst.length) return;
  // Advance one cell toward a seed at a time.
  let apprGroup = guardSeedClst.find(
    (cluster) =>
      cluster.regrAppr && cluster.regrowAt == null
  );
  if (!apprGroup) {
    const candidate = care.findRegrSeed(now);
    if (!candidate) return;
    const offset = grdSeeFltOff(candidate.cluster, now);
    const started = window.GazeApp?.bgnTgtAppr?.(
      candidate.cell,
      candidate.cluster.x +
        offset.x +
        guardCfg.seedCellOffstX,
      candidate.cluster.y +
        offset.y +
        guardCfg.seedCellOffstY,
      guardCfg.seedCellApprMs,
      now
    );
    if (!started) return;
    candidate.cluster.regrAppr = { cell: candidate.cell };
    apprGroup = candidate.cluster;
  }

  // Cancel the approach if the candidate dies or begins another differentiation en route,
  // allowing the seed to choose again in a later frame.
  const sourceCell = apprGroup.regrAppr?.cell;
  if (!sourceCell || sourceCell.dead || sourceCell.differentiating) {
    window.GazeApp?.cnclTgtAppr?.(sourceCell);
    apprGroup.regrAppr = null;
    return;
  }
  const seedOffset = grdSeeFltOff(apprGroup, now);
  const approachState = window.GazeApp?.updtTgtAppr?.(
    sourceCell,
    apprGroup.x +
      seedOffset.x +
      guardCfg.seedCellOffstX,
    apprGroup.y +
      seedOffset.y +
      guardCfg.seedCellOffstY,
    now
  );
  if (!approachState?.complete) return;

  // When the BasicCell completes its approach and can fade out,
  // commit its regeneration as a new Guardian.
  const beginFadeOut = window.GazeApp?.bgnTgtFadeOut;
  if (typeof beginFadeOut !== "function") return;
  const fadingCell = beginFadeOut(
    sourceCell,
    guardCfg.seedCelFadOutM,
    now
  );
  if (!fadingCell) return;

  const cluster = apprGroup;
  const carePlan = cluster.careChangePlan || null;
  if (carePlan) {
    freeEncnCell(
      sourceCell,
      carePlan.reservationId
    );
  }
  // The new Guardian inherits the seed's size, direction, and edge properties,
  // allowing the repair result to continue from its ecological position.
  const spawnPoint = ecoWorld.project(sourceCell.x, sourceCell.y, 20);
  const guardian = new Guardian(
    spawnPoint.x,
    spawnPoint.y,
    cluster.sourceRotation
  );
  guardian.sz = cluster.sourceSize;
  guardian.edgeResident = cluster.edgeResident;
  guardian.cruiseCenter = { x: spawnPoint.x, y: spawnPoint.y };
  guardian.careBirth = {
    startAt:
      now + guardCfg.seedGuaBrtDlyM,
    revealDuration: guardCfg.seedGuaBrtMs,
    growthDuration: 1,
    initialScale: guardCfg.seedScale,
    revealScale: 1,
    doneAftrShow: true,
  };
  guardian.guardSeedBirth = true;
  guardian.guardBirthMul = guardCfg.seedScale;
  guardian.guardBrthAlph = 0;
  const added = window.CreatureWorld?.add?.(guardian, {
    group: "creature",
    origin: "guardian-seed-regrowth",
    targetType: eco.lifeType.guardian,
    });
  // If creation through the world queue fails, release the
  // reserved cell and conclude the plan with scarcity compensation.
  if (!added) {
    if (carePlan) {
      freeEncnCell(
        carePlan.parasiteCell,
        carePlan.reservationId
      );
      if (carePlan.parasiteRoll && !carePlan.paraAmped) {
        bstSprsPars();
        carePlan.paraAmped = true;
      }
    }
    return;
  }
  // During differentiation, switch to the session that owns the plan;
  // finally restores the participant context active before the call.
  if (carePlan) {
    holdLifeGlow(
      guardian,
      guardian.careBirth.startAt +
        guardian.careBirth.revealDuration
    );
    carePlan.spcDiff = true;
    const prevSssn = activeSession;
    const ownerSession =
      sessions[carePlan.sessionId] || prevSssn;
    try {
      bindIxSession(ownerSession);
      if (carePlan.parasiteRoll && carePlan.parasiteCell) {
        freeEncnCell(
          carePlan.parasiteCell,
          carePlan.reservationId
        );
        carePlan.parasiteDiffed =
          diff.toParasite(
            "interaction-complete",
            guardian,
            now,
            carePlan.parasiteCell
          );
        if (!carePlan.parasiteDiffed) {
          bstSprsPars();
          carePlan.paraAmped = true;
        }
      }
    } finally {
      bindIxSession(prevSssn);
    }
  }
// Seeds in the same group record a shared regeneration origin.
  const groupId = cluster.careRegrGrpId;
  for (const candidate of guardSeedClst) {
    if (!groupId || candidate.careRegrGrpId === groupId) {
      if (candidate === cluster || groupId) candidate.regrowAt = now;
    }
  }
}

function tickCareMove(elapsedMs) {
  care.updateShield(elapsedMs);
}

// Advance movement, protection, repair, and panel feedback according
// to the current phase, handling transitions between phases
// This function was modified with the assistance of ChatGPT.
function strtCareActn() {
  const source = care.state.source;
  care.state.encnElapsedMs = 0;
  care.state.isEncnTmd = true;
  if (!source || !prprCareLmt()) {
    turnCareToPnl();
    return;
  }
  care.state.phaseElapsedMs = 0;
  const usesMnsSymbl =
    care.state.suppressType === eco.lifeType.roamer ||
    care.state.suppressType === eco.lifeType.deepDiver;
  // Handle excess Roamers and Deep Divers through limitation,
  // preserving the necessary place of mind-wandering and sustained attention in the ecology.
  for (const guardian of care.state.participants) {
    guardian.guardSigns = usesMnsSymbl;
  }
  if (usesMnsSymbl) {
    care.state.interveneKind = "cross-limit";
    care.state.phase = "cross-detaching";
    for (const link of care.state.limitLinks) {
      const start = careSourcePos(link.guardian);
      const targetPosition = worldPos(link.target);
      let directionX = start.x - targetPosition.x;
      let directionY = start.y - targetPosition.y;
      const dirLngth = Math.hypot(directionX, directionY);
      // When positions overlap, derive a stable direction from the Guardian seed.
      if (dirLngth > 0.001) {
        directionX /= dirLngth;
        directionY /= dirLngth;
      } else {
        const fallbackAngle = ((link.guardian.seed || 0) * 0.0001) % TWO_PI;
        directionX = cos(fallbackAngle);
        directionY = sin(fallbackAngle);
      }
      const destination = guardLmtPnt(
        link.target,
        link.guardian,
        directionX,
        directionY
      );
      link.crssApprDirX = directionX;
      link.crssApprDirY = directionY;
      link.travelDistance = Math.hypot(
        destination.x - start.x,
        destination.y - start.y
      );
      link.travelDist = 0;
      link.crssApprProg = 0;
      link.crssTrvElaMs = 0;
      link.crssAttElaMs = 0;
      link.crssRtrElaMs = 0;
      link.crssCutStart = false;
      link.currentSpeed = 0;
      link.curSpdMul = 0;
      link.state = "cross-approaching";
    }
    assgnCareWts(care.state.limitLinks);
    if (prprCareShld()) {
      prepCarePaths();
    }
    return;
  }

  // Clear excess Predators and Parasites through wrapping because their ecological effects arise from
  // capture and the occupation of attention residue.
  care.state.interveneKind = "guardian-clear";
  care.state.phase = "guardian-wrapping";
  for (const link of care.state.limitLinks) {
    const sourceRadius = max(1, infoRadius(link.guardian));
    const targetRadius = max(1, infoRadius(link.target));
    link.wrapScale = max(
      guardCfg.guardGrowScl,
      (targetRadius / sourceRadius) *
        guardCfg.guardWrapPddng
    );
    const position = careSourcePos(link.guardian);
    const targetPosition = worldPos(link.target);
    link.wrapStartX = position.x;
    link.wrapStartY = position.y;
    link.guardStrtScl = Number.isFinite(
      link.guardian.careScale
    )
      ? link.guardian.careScale
      : 1;
    link.travelDistance = Math.hypot(
      targetPosition.x - position.x,
      targetPosition.y - position.y
    );
    link.travelDist = 0;
    link.trvlElapsedMs = 0;
    link.abndnElapsedMs = 0;
    link.abndnStrtScl = link.guardStrtScl;
    link.abandoned = false;
    link.clearElapsedMs = 0;
    link.postClrWaiElaM = 0;
    link.state = "traveling";
  }
  assgnCareWts(
    care.state.limitLinks
  );
  const sourceLink =
    care.state.limitLinks.find(
      (link) => link.guardian === source
    ) || care.state.limitLinks[0];
  care.state.wrapScale = sourceLink.wrapScale;
  care.state.wrapStartX = sourceLink.wrapStartX;
  care.state.wrapStartY = sourceLink.wrapStartY;
  if (prprCareShld()) {
    prepCarePaths();
  }
}

// Advance Guardian care time limits and visual cues, choosing completion
// or safe resolution at the boundary according to the current phase.
// This function was modified with the assistance of ChatGPT.
function updtGrdLmt(elapsedMs) {
  const links = care.state.limitLinks.filter(
    (link) => link.target && isVisible(link.target)
  );
  if (!links.length) {
    turnCareToPnl();
    return;
  }
  care.state.phaseElapsedMs += elapsedMs;
  let typeCutStart = links.some(
    (link) => link.crssCutStart
  );
// Each relationship of care completes or withdraws on its own timeline,
// preserving distinct rhythms within multiplayer collaboration.
  for (const link of links) {
    // cross-abandoning withdraws the Guardian while established limiting results await a common commit.
    if (link.state === "cross-abandoning") {
      link.abndnElapsedMs += elapsedMs;
      link.crssRtrElaMs = min(
        guardCfg.crossReturnMs,
        (link.abndnElapsedMs /
          max(1, guardCfg.suppExiShrMs)) *
          guardCfg.crossReturnMs
      );
      const progress = clamp(
        link.abndnElapsedMs /
          guardCfg.suppExiShrMs,
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      link.guardian.careScale = lerp(
        link.abndnStrtScl,
        1,
        eased
      );
      if (progress >= 1) {
        stblCarePlss(link.guardian);
        care.settle(link.guardian);
        link.relsToCrs = true;
        link.state = "cross-abandoned";
      }
      continue;
    }
    // A brief hold after limitation allows the result to be perceived
    // before assigning the same Guardian to a protective task.
    if (link.state === "cross-post-limit-wait") {
      link.postClrWaiElaM += elapsedMs;
      if (
        link.postClrWaiElaM >= link.postClrWaiDurM
      ) {
        link.state = "cross-complete";
        const approach = care.state.shields.find(
          (candidate) => candidate.guardian === link.guardian
        );
        care.startShield(approach);
      }
      continue;
    }
    // Adjust approach speed by remaining distance and withdraw on timeout.
    if (link.state === "cross-approaching") {
      link.crssTrvElaMs += elapsedMs;
      if (
        link.crssTrvElaMs >=
        guardCfg.crssPrstTmtMs
      ) {
        care.abndnLmtPrst(link);
        continue;
      }
      const current = careSourcePos(link.guardian);
      const destination = guardLmtPnt(
        link.target,
        link.guardian,
        link.crssApprDirX,
        link.crssApprDirY
      );
      const dx = destination.x - current.x;
      const dy = destination.y - current.y;
      const distLeft = Math.hypot(dx, dy);
      const approachSpeed =
        careSupSpd(distLeft);
      link.currentSpeed = approachSpeed;
      link.curSpdMul =
        approachSpeed /
        max(
          0.001,
          settings.cruise.guard.speed * eco.moveSpeed * eco.simFps
        );
// Scale displacement steps with remaining distance so the approach naturally slows before its endpoint.
      const step = min(
        distLeft,
        approachSpeed * (elapsedMs / 1000)
      );
      if (distLeft > 0.001) {
        link.guardian.guardVisX =
          current.x + (dx / distLeft) * step;
        link.guardian.guardVisY =
          current.y + (dy / distLeft) * step;
      }
      link.travelDist += step;
      // Estimate approach progress from distance traveled and the current remaining distance.
      const rawProgress =
        step >= distLeft - 0.001
          ? 1
          : clamp(
              link.travelDist /
                max(
                  0.001,
                  link.travelDist + distLeft - step
                ),
              0,
              1
            );
      link.crssApprProg =
        cubicSmoothstep(rawProgress);
      // The first arrival commits species-level limitation;
      // subsequent relationships add their own visual and return state.
      if (step >= distLeft - 0.001) {
        link.guardian.guardVisX = destination.x;
        link.guardian.guardVisY = destination.y;
        link.crssApprProg = 1;
        link.state = "cross-attached";
        link.crssAttElaMs = 0;
        care.strtLmtTgt(link.target);
        if (!typeCutStart) {
          care.strtLmtSpc(link.target.type);
          typeCutStart = true;
        }
        link.crssCutStart = true;
        care.state.repairApplied = true;
        recordCareNote(
          "suppression",
          lifeLogNow(),
          { priority: 90 }
        );
      }
      continue;
    }

    let rtrnAdvncMs = elapsedMs;
    // Return only after the attachment hold ends, leaving time for the limiting result to appear.
    if (link.state === "cross-attached") {
      const nextAttElaMs = link.crssAttElaMs + elapsedMs;
      if (nextAttElaMs < guardCfg.crossAttachMs) {
        link.crssAttElaMs = nextAttElaMs;
        continue;
      }
      link.crssAttElaMs = guardCfg.crossAttachMs;
      rtrnAdvncMs =
        nextAttElaMs - guardCfg.crossAttachMs;
      link.crssRtrElaMs = 0;
      link.state = "cross-returning";
    }

    if (link.state === "cross-returning") {
      link.crssRtrElaMs += rtrnAdvncMs;
      if (
        link.crssRtrElaMs >= guardCfg.crossReturnMs
      ) {
        link.crssRtrElaMs = guardCfg.crossReturnMs;
        stblCarePlss(link.guardian);
        const approach = care.state.shields.find(
          (candidate) => candidate.guardian === link.guardian
        );
        if (!approach) {
          link.state = "cross-complete";
        } else if (link.postClrWaiDurM > 0) {
          link.postClrWaiElaM = 0;
          link.state = "cross-post-limit-wait";
        } else {
          link.state = "cross-complete";
          care.startShield(approach);
        }
      }
    }
    // Each connection independently completes its return and subsequent protection.
  }

  care.updtLmtFade(links, elapsedMs);
  if (care.state.shields.length) {
    care.updateShield(elapsedMs, false, false);
  }
  // Expose the foremost currently visible action as the phase read by rendering and narrative text.
  let nextPhase = "guardian-clear-waiting";
  if (links.some((link) => link.state === "cross-approaching")) {
    nextPhase = "cross-detaching";
  } else if (links.some((link) => link.state === "cross-attached")) {
    nextPhase = "cross-attached";
  } else if (links.some((link) => link.state === "cross-returning")) {
    nextPhase = "cross-returning";
  } else if (
    care.state.shields.some(
      (approach) => approach.state === "traveling"
    )
  ) {
    nextPhase = "protection-approaching";
  } else if (
    care.state.shields.some(
      (approach) => approach.state === "transferring"
    )
  ) {
    nextPhase = "support-transferring";
  } else if (
    care.state.shields.some(
      (approach) => approach.state === "settling"
    )
  ) {
    nextPhase = "support-settling";
  }
  if (care.state.phase !== nextPhase) {
    care.state.phase = nextPhase;
    care.state.phaseElapsedMs = 0;
  }
  // Once limiting relationships and protective actions reach their terminal state,
  // the panel presents the ecological result that has taken effect.
  const areCrsLnkDon = links.every(
    (link) =>
      link.state === "cross-complete" || link.state === "cross-abandoned"
  );
  const areShldsRdy =
    !care.state.shields.length ||
    care.state.shields.every((approach) =>
      ["complete", "abandoned"].includes(approach.state)
    );
  if (areCrsLnkDon && areShldsRdy) {
    openCarePanel();
  }
}

// 8. Completion and interruption require resolution
// Completion and cancellation release targets, participants, connections, shields,
// and temporary visual state, bringing the relationship to a close.
function abndnLmtPrst(link) {
  if (!link || link.state !== "cross-approaching" || !link.guardian) {
    return false;
  }
  // Preserve scale and approach progress at interruption
  // so the Guardian returns smoothly from its current pose.
  link.state = "cross-abandoning";
  link.abandoned = true;
  link.abndnElapsedMs = 0;
  link.abndnStrtScl = Number.isFinite(link.guardian.careScale)
    ? link.guardian.careScale
    : 1;
  link.crossExitStart = clamp(
    link.crssApprProg || 0,
    0,
    1
  );
  link.crssRtrElaMs = 0;
  const approach = care.state.shields.find(
    (candidate) => candidate.guardian === link.guardian
  );
  if (approach) {
    approach.state = "abandoned";
    approach.links = [];
  }
  // Release the logical cross-limiting relationship here;
  // limitLinks continues to carry the return animation.
  care.state.links = care.state.links.filter(
    (careLink) => careLink.guardian !== link.guardian
  );
  care.state.parents = [
    ...new Set(care.state.links.map((careLink) => careLink.target)),
  ];
  care.state.shieldTarget =
    care.state.links.find(
      (careLink) => careLink.guardian === care.state.source
    )?.target || care.state.links[0]?.target || null;
  return true;
}

// When an ordinary approach is canceled, start the return animation
// from the current position and release the relationship of care.
function abndnGrdPrst(link) {
  if (!link || link.state !== "traveling" || !link.guardian) return false;
  link.state = "abandoning";
  link.abandoned = true;
  link.abndnElapsedMs = 0;
  link.abndnStrtScl = Number.isFinite(
    link.guardian.careScale
  )
    ? link.guardian.careScale
    : 1;
  const approach = care.state.shields.find(
    (candidate) => candidate.guardian === link.guardian
  );
  if (approach) {
    approach.state = "abandoned";
    approach.links = [];
  }
  care.state.links = care.state.links.filter(
    (careLink) => careLink.guardian !== link.guardian
  );
  care.state.parents = [
    ...new Set(care.state.links.map((careLink) => careLink.target)),
  ];
  care.state.shieldTarget =
    care.state.links.find(
      (careLink) => careLink.guardian === care.state.source
    )?.target || care.state.links[0]?.target || null;
  return true;
}

// This function was modified with the assistance of ChatGPT.
function updtCareClr(elapsedMs) {
  // Advance relationships that still have both Guardian and target,
  // returning safely to the panel when the structure becomes invalid.
  const links = care.state.limitLinks.filter(
    (link) => link.guardian && link.target
  );
  if (!care.state.source || !links.length) {
    turnCareToPnl();
    return;
  }
  care.state.phaseElapsedMs += elapsedMs;
  // Cleanup begins with a wrapping relationship and commits its result afterward,
  // allowing participants to see how ecological change occurs.
  for (const link of links) {
    // abandoning withdraws an ordinary approach while the target remains valid.
    if (link.state === "abandoning") {
      link.abndnElapsedMs += elapsedMs;
      // Wrapping scale changes smoothly with approach progress.
      const progress = clamp(
        link.abndnElapsedMs /
          guardCfg.suppExiShrMs,
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      link.guardian.careScale = lerp(
        link.abndnStrtScl,
        1,
        eased
      );
      if (progress >= 1) {
        care.settle(link.guardian);
        link.relsToCrs = true;
        const approach = care.state.shields.find(
          (candidate) => candidate.guardian === link.guardian
        );
        if (approach) approach.relsToCrs = true;
        link.state = "complete";
      }
      continue;
    }
    // Leave a period of visibility after cleanup, then move the same Guardian into a protective task.
    if (link.state === "post-clear-wait") {
      link.postClrWaiElaM += elapsedMs;
      if (
        link.postClrWaiElaM >=
        link.postClrWaiDurM
      ) {
        link.state = "complete";
        const approach = care.state.shields.find(
          (candidate) => candidate.guardian === link.guardian
        );
        care.startShield(approach);
      }
      continue;
    }
    // traveling approaches and gradually wraps the target,
    // withdrawing on timeout so the care process has a clear endpoint.
    if (link.state === "traveling") {
      link.trvlElapsedMs += elapsedMs;
      if (
        link.trvlElapsedMs >=
        guardCfg.suppChsTmtMs
      ) {
        abndnGrdPrst(link);
        continue;
      }
      const current = careSourcePos(
        link.guardian
      );
      const targetPosition = worldPos(link.target);
      const dx = targetPosition.x - current.x;
      const dy = targetPosition.y - current.y;
      const distLeft = Math.hypot(dx, dy);
      const approachSpeed =
        careSupSpd(distLeft);
      link.currentSpeed = approachSpeed;
      link.curSpdMul =
        approachSpeed /
        max(
          0.001,
          settings.cruise.guard.speed * eco.moveSpeed * eco.simFps
        );
      const step = min(
        distLeft,
        approachSpeed * (elapsedMs / 1000)
      );
      if (distLeft > 0.001) {
        link.guardian.guardVisX =
          current.x + (dx / distLeft) * step;
        link.guardian.guardVisY =
          current.y + (dy / distLeft) * step;
      }
      link.travelDist += step;
      // Bind the Guardian's wrapping scale to completed travel distance.
      const progress = clamp(
        link.travelDist / max(0.001, link.travelDistance),
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      link.guardian.careScale = lerp(
        link.guardStrtScl,
        link.wrapScale,
        eased
      );
      if (step >= distLeft - 0.001) {
        link.guardian.guardVisX = targetPosition.x;
        link.guardian.guardVisY = targetPosition.y;
        link.guardian.careScale = link.wrapScale;
        link.state = "clearing";
        link.clearElapsedMs = 0;
      }
      continue;
    }
    // clearing holds both positions and fades the target,
    // committing the world-removal command only on completion.
    if (link.state === "clearing") {
      link.clearElapsedMs += elapsedMs;
      const progress = clamp(
        link.clearElapsedMs /
          guardCfg.guardClrMs,
        0,
        1
      );
      const eased = cubicSmoothstep(progress);
      const targetPosition = worldPos(link.target);
      link.guardian.guardVisX = targetPosition.x;
      link.guardian.guardVisY = targetPosition.y;
      link.guardian.careScale = link.wrapScale;
      link.target.careScale = lerp(
        link.tgtStrtScl,
        guardCfg.clearEndScale,
        eased
      );
      link.target.careAlpha = lerp(
        link.tgtStrtAlph,
        0,
        eased
      );
      if (progress >= 1) {
        // One cleanup group records one limitation and fade.
        if (!care.state.repairApplied) {
          care.strtSpcFade(link.target.type);
          care.state.repairApplied = true;
          recordCareNote(
            "suppression",
            lifeLogNow(),
            { priority: 90 }
          );
        }
        enqWrldCmmnd(
          activeSession,
          "guardian-target-remove",
          () =>
            window.CreatureWorld?.remove?.(
              link.target,
              "guardian-ecology-limit"
            ),
          { type: link.target.type }
        );
        if (link.postClrWaiDurM > 0) {
          link.state = "post-clear-wait";
          link.postClrWaiElaM = 0;
        } else {
          link.state = "complete";
          const approach = care.state.shields.find(
            (candidate) => candidate.guardian === link.guardian
          );
          care.startShield(approach);
        }
      }
    }
  }
  care.updateShield(elapsedMs, false);
}

// Resolve ecological state after care completes and preserve display time for the result.
function fnshCarePnl() {
  // Snapshot references awaiting resolution, then return
  // the long-lived state object to its initial structure.
  const source = care.state.source;
  const participants = [...care.state.participants];
  const repairApplied = care.state.repairApplied;
  const rprUsgSttld = care.state.rprUsgSttld;
  const now = typeof millis === "function" ? millis() : 0;
  bgnCarGloFad(participants, now);
  for (const guardian of participants) {
    const isIxPositioned =
      Number.isFinite(guardian.guardVisX) ||
      Number.isFinite(guardian.guardVisY) ||
      Number.isFinite(guardian.careScale);
    if (isIxPositioned) {
      care.settle(guardian);
    }
  }
// Resolve one unit of consumption for each repair, keeping its ecological cost traceable.
  if (repairApplied && !rprUsgSttld) {
    doneCareRprs(
      participants.length ? participants : [source],
      now
    );
  }
  if (source) {
    rcrdSurvEvnt(legacyEvent.encounter, source, now, {
      sessionId: activeSession?.id,
      sequence: care.state.sequence || Math.round(now),
    });
    const spcReqr = Boolean(source.repairRetired);
    const carePlan = rslvFcsChng({
      host: source,
      species: eco.lifeType.guardian,
      spcReqr,
      session: activeSession,
      now,
      deferSpecies: spcReqr,
    });
    // Delay the retiring Guardian's species change until the care narrative ends.
    if (spcReqr) {
      assgCarChnPla(source, carePlan, now);
    }
  }
  care.state.phase = "idle";
  care.state.phaseElapsedMs = 0;
  care.state.panelRevealMs = 0;
  care.state.pnlFadeStart = false;
  care.state.pnlFadElaMs = 0;
  care.state.source = null;
  care.state.participants = [];
  care.state.speciesCounts = null;
  care.state.suppressType = null;
  care.state.protectType = null;
  care.state.careTarget = null;
  care.state.limitLinks = [];
  care.state.interveneKind = null;
  care.state.shields = [];
  care.state.candidate = null;
  care.state.candLvMs = 0;
  care.state.activationMs = 0;
  care.state.focusMs = 0;
  care.state.progressX = null;
  care.state.progressY = null;
  care.state.progressAtRest = false;
  care.state.encnElapsedMs = 0;
  care.state.isEncnTmd = false;
  care.state.repairApplied = false;
  care.state.rprUsgSttld = false;
}

// Multiplayer care records the shared result and a
// relationship fade-out snapshot, then resolves shared state.
function fnshCareShr() {
  const owner = activeSession;
  const source = care.state.source;
  const now = typeof millis === "function" ? millis() : 0;
  bgnCarLinFadOu(relClckNow());
  if (source) {
    recordCareNote("repairCompleted", now, {
      participantCount: care.state.collIds.length + 1,
      priority: 100,
    });
    rcrdSurvEvnt(legacyEvent.encounter, source, now, {
      sessionId: owner?.id,
      sequence: care.state.sequence || Math.round(now),
    });
    rslvFcsChng({
      host: source,
      species: eco.lifeType.guardian,
      spcReqr: false,
      session: owner,
      now,
    });
  }
  rstGuardCare();
  for (const session of sessions) {
    session.careState.reqrFree = true;
    session.careState.releaseMs = 0;
  }
  bindIxSession(owner);
}

// Relational care accumulates while the accepted relationship remains valid;
// participant departure moves it to a continuable or canceling path.
function updtCareShr(elapsedMs) {
  if (
    care.state.collabMode !== "relational" ||
    care.state.collabStatus !== "accepted"
  ) {
    return false;
  }
  care.state.panelRevealMs += elapsedMs;
  if (care.state.phase === "scanning") {
    const scanDurationMs = scaleCareMs(
      guardCfg.relScanMs
    );
    const nextElapsedMs = care.state.phaseElapsedMs + elapsedMs;
    if (nextElapsedMs < scanDurationMs) {
      care.state.phaseElapsedMs = nextElapsedMs;
      return true;
    }
    care.state.phase = "relational";
    care.state.phaseElapsedMs = nextElapsedMs - scanDurationMs;
    bgnRelAlrt();
  } else {
    care.state.phaseElapsedMs += elapsedMs;
  }
  if (
    care.state.phase === "relational" &&
    care.state.phaseElapsedMs >=
      returnCfg.durationMs
  ) {
    fnshCareShr();
  }
  return true;
}

// 9. Continuing care each frame while responding to sudden attention lures
// Pause and re-enable Predator lures during care
function rstLurBrkInt() {
  care.state.lureBrkCand = null;
  care.state.lureBrkCnfrmMs = 0;
  care.state.lureBrkOtsdMs = 0;
}

// When a Predator lure persistently draws gaze away from care,
// accumulate interruption confirmation and resolve this recovery cycle after the threshold.
function updLurBrkInt(
  gaze,
  hasController,
  elapsedMs,
  ixCntxt
) {
  const directEntity = ixCntxt?.drctFcsEntty || null;
  const drctLrdPrdt = Boolean(
    ixCntxt?.isFocusOnLure &&
      directEntity?.type === eco.lifeType.predator
  );
  // Allow lure removal while a Guardian candidate is forming.
  const guardProgActv = Boolean(
    care.state.phase === "idle" && care.state.candidate
  );
  if (!guardProgActv) {
    rstLurBrkInt();
    return { pending: false, confirmed: false, drctLrdPrdt };
  }

  if (drctLrdPrdt) {
    if (
      care.state.lureBrkCand !== directEntity
    ) {
      rstLurBrkInt();
      care.state.lureBrkCand = directEntity;
    }
  } else if (
    directEntity &&
    directEntity.type !== eco.lifeType.guardian &&
    directEntity !== care.state.lureBrkCand
  ) {
    rstLurBrkInt();
    return { pending: false, confirmed: false, drctLrdPrdt };
  }

  const candidate =
    care.state.lureBrkCand;
  if (!candidate) {
    return { pending: false, confirmed: false, drctLrdPrdt };
  }
  const position = worldPos(candidate);
  // The confirmation range is smaller than the ordinary lure hit range,
  // requiring participants to turn clearly toward the Predator's body.
  const coreRadius =
    infoRadius(candidate) *
    ixGazeScale(eco.lifeType.predator) *
    guardCfg.lureBrkRadScl;
  const insideCore = Boolean(
    hasController &&
      gaze &&
      directEntity === candidate &&
      drctLrdPrdt &&
      dist2(gaze.x, gaze.y, position.x, position.y) <=
        coreRadius * coreRadius
  );
  // Retain a brief grace period after leaving the core to absorb blinks and detection jitter.
  if (insideCore) {
    care.state.lureBrkOtsdMs = 0;
    care.state.lureBrkCnfrmMs += elapsedMs;
  } else {
    care.state.lureBrkOtsdMs += elapsedMs;
    if (
      care.state.lureBrkOtsdMs >
      guardCfg.lureBrkGrcMs
    ) {
      rstLurBrkInt();
      return { pending: false, confirmed: false, drctLrdPrdt };
    }
  }
  if (
    care.state.lureBrkCnfrmMs >=
    guardCfg.lureBrkCnfrmMs
  ) {
    rstLurBrkInt();
    return { pending: false, confirmed: true, drctLrdPrdt: true };
  }
  return { pending: true, confirmed: false, drctLrdPrdt };
}

// This function was modified with the assistance of ChatGPT.
function updateCareScan(
  guardians,
  closest,
  gaze,
  hasController,
  frameMs,
  ixCntxt = null
) {
  // Time domains: elapsedMs advances real interaction waits;
  // ecoActionMs advances ecological actions scaled by the rhythm of care.
  const elapsedMs = clamp(
    Number(frameMs) || 0,
    0,
    driftCfg.frameMsMax
  );
  const ecoActionMs =
    elapsedMs / careTmngScl();
  // The relationship owner advances multiplayer care.
  const relOwnr = care.getOwnrSssn();
  if (relOwnr && relOwnr !== activeSession) {
    return;
  }
  if (updtCareShr(elapsedMs)) return;
  // Shared completion and cancellation have the highest priority.
  if (care.state.canceling) {
    updtCarGazCnc(elapsedMs);
    return;
  }
  care.updtSpcFade(ecoActionMs);
  // The encounter time limit spans the care process; on timeout, resolve all phases together.
  if (care.state.isEncnTmd) {
    care.state.encnElapsedMs += elapsedMs;
    if (
      care.state.encnElapsedMs >=
      careWindowMs(
        guardCfg.careTimeoutMs
      )
    ) {
      bgnGrdCareFnsh();
      return;
    }
  }
  if (updtGrdCareLv(gaze, hasController, elapsedMs)) {
    return;
  }
  if (care.state.phase !== "idle") {
    care.state.panelRevealMs += elapsedMs;
  }
  // Advance established ecological actions first; the panel takes over after all actions end.
  if (care.state.phase === "scanning") {
    care.state.phaseElapsedMs += elapsedMs;
    if (
      care.state.phaseElapsedMs >=
      scaleCareMs(
        guardCfg.scanMs
      )
    ) {
      strtCareActn();
    }
  } else if (care.state.interveneKind === "cross-limit") {
    updtGrdLmt(ecoActionMs);
  } else if (care.state.interveneKind === "guardian-clear") {
    care.updateClear(ecoActionMs);
  } else if (
    care.state.interveneKind === "protection-approach"
  ) {
    care.updateShield(ecoActionMs);
  } else if (care.state.interveneKind === "support") {
    tickCareMove(ecoActionMs);
  } else if (care.state.phase === "panel") {
    if (
      !care.state.pnlFadeStart &&
      !isCarePnlActv()
    ) {
      bgnCarePnlFade();
    }
  }
  // Panel fade-out uses real interaction time, independent of ecological action speed.
  if (care.state.pnlFadeStart) {
    care.state.pnlFadElaMs += elapsedMs;
  }
  if (
    care.state.phase === "panel" &&
    care.state.pnlFadeStart &&
    care.state.pnlFadElaMs >=
      scaleCareMs(
        guardCfg.panelFadeOutMs
      )
  ) {
    fnshCarePnl();
  }

  // Update signals and positions during invitation;
  // form a new Guardian candidate after the invitation ends.
  if (care.state.collabStatus === "offered") {
    updtCarProPos(
      care.state.source,
      gaze
    );
    updtCareOffr(guardians, gaze, elapsedMs);
    return;
  }

  // Predator-lure removal takes precedence over ordinary candidate switching.
  const prdtStopIntnt =
    updLurBrkInt(
      gaze,
      hasController,
      elapsedMs,
      ixCntxt
    );
  if (prdtStopIntnt.pending) {
    care.state.candLvMs = 0;
    updtCarProPos(
      care.state.candidate,
      gaze
    );
    return;
  }
  const explOthrFcs = Boolean(
    ixCntxt?.contActv &&
      ixCntxt.drctFcsType &&
      ixCntxt.drctFcsType !== eco.lifeType.guardian &&
      (!prdtStopIntnt.drctLrdPrdt ||
        prdtStopIntnt.confirmed)
  );
  const heldCandidate =
    hasController &&
    !explOthrFcs &&
    guarIsNeaGaz(
      care.state.candidate,
      gaze,
      guardCfg.candHoldPddng
    )
      ? care.state.candidate
      : null;
  const focused = explOthrFcs
    ? null
    : heldCandidate || (hasController ? closest : null);

  // Require gaze to leave after care completes before unlocking.
  if (care.state.reqrFree) {
    if (focused) {
      care.state.releaseMs = 0;
    } else {
      care.state.releaseMs += elapsedMs;
      if (
        care.state.releaseMs >=
        careWindowMs(
          guardCfg.releaseGraceMs
        )
      ) {
        care.state.reqrFree = false;
        care.state.releaseMs = 0;
      }
    }
    return;
  }
  if (care.state.phase !== "idle") return;
  care.updateReceding(elapsedMs);

  // When a candidate is temporarily lost, decay it under the common interruption rules;
  // hard-reset immediately if the target becomes invalid.
  if (!focused) {
    if (
      care.state.candidate &&
      care.state.focusMs > 0
    ) {
      const candidateValid =
        creatures.includes(care.state.candidate) &&
        isVisible(care.state.candidate) &&
        !care.state.candidate.repairRetired;
      const fallback = updateAttnProg(
        care.state.focusMs /
          guardCfg.attnHoldMs,
        care.state.candLvMs,
        clssAttnFlow({
          focused: false,
          hardReset: !candidateValid,
        }),
        elapsedMs,
        { focusMs: guardCfg.attnHoldMs }
      );
      care.state.focusMs =
        fallback.progress * guardCfg.attnHoldMs;
      care.state.candLvMs = fallback.interruptionMs;
      if (fallback.progress > 0) {
        updtCarProPos(
          care.state.candidate,
          gaze
        );
        return;
      }
    }
    // Once rollback is exhausted, clear the candidate, timing,
    // and visual anchor so the next gaze begins a new encounter.
    care.state.candidate = null;
    care.state.candLvMs = 0;
    rstLurBrkInt();
    care.state.activationMs = 0;
    care.state.focusMs = 0;
    care.state.progressX = null;
    care.state.progressY = null;
    care.state.progressAtRest = false;
    care.state.encnElapsedMs = 0;
    care.state.isEncnTmd = false;
    return;
  }
  // Store old progress when switching Guardians and retrieve
  // the remaining lingering time on renewed approach.
  if (care.state.candidate !== focused) {
    care.queueReceding(
      care.state.candidate,
      care.state.focusMs,
      care.state.candLvMs
    );
    const resumed = care.resumeReceding(focused);
    care.state.candidate = focused;
    rstLurBrkInt();
    care.state.activationMs = resumed
      ? guardCfg.actvDlyMs
      : 0;
    care.state.focusMs = resumed?.focusMs || 0;
  }
  care.state.candLvMs = 0;
  updtCarProPos(focused, gaze);
  // The activation delay first filters passing glances; the remaining
  // frame time then contributes to formal lingering accumulation.
  const actvLeft = max(
    0,
    guardCfg.actvDlyMs -
      care.state.activationMs
  );
  const activationStep = min(actvLeft, elapsedMs);
  care.state.activationMs += activationStep;
  const focusStep = elapsedMs - activationStep;
  care.state.focusMs = min(
    guardCfg.focusMs,
    care.state.focusMs + focusStep
  );
  const attentionReady =
    care.state.activationMs >=
      guardCfg.actvDlyMs &&
    care.state.focusMs >=
      guardCfg.attnHoldMs;
  // After reaching the threshold, choose a collaboration invitation or solo scan according to respondent
  // count while keeping ecological rules consistent.
  if (attentionReady) {
    if (carePeers().length > 0) {
      beginCareOffer(focused);
    } else {
      beginCareScan(focused, gaze, guardians, "single", []);
    }
    return;
  }
}

// 8. The Guardian object and its specialized behavior are exposed through the same lifeform module.
window.Guardian = Guardian;
window.GuardianBehavior = Object.freeze({
  createSessionState: crtGuardCare,
  resetInteraction: rstGuardCare,
  updateInteraction(context = {}) {
    return updateCareScan(
      context.guardians || [],
      context.closest || null,
      context.gaze || null,
      Boolean(context.hasController),
      Number(context.frameMs) || 0,
      context.interactionContext || null
    );
  },
  getViewState() {
    return care.state;
  },
  controller: care,
});
