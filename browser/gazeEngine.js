// File Overview
// Manages face and gaze detection, calibration, participant presence,
// pointer fallback, and related visual feedback.

// 1. The work begins with the audience's presence
// Participation begins with the audience's choice; gaze and
// sustained presence then become material for the story.
(() => {
"use strict";

// 2. Perception remains stable and restrained
const gazeConfig = {
  seed: 9,
  fps: 60,
  background: "#0c256d",
  color: [108, 216, 226],
  drawScale: 1.68,
};
const ecoConst = window.EcologyConstants;
const num = window.NumericApp;
const softGlow = window.SoftGlowApp;
const legacyEvent = ecoConst.legacyEvent;

const cellRules = {
  bodyDiameter: 90,
  coreDimtMin: 25,
  coreDimtMax: 31,
  coreOffsetMin: 6,
  coreOffsetMax: 14,
  bodyFillAlpha: 120,
  coreFillAlpha: 210,
  coreStrkAlph: 207,
  coreStrkWght: 5.8,
  coreGlowAlpha: 0.16,
  coreWaveAmp: 3,
  coreWaveSpeed: 0.7,
  coreWaveSteps: 64,
  innerBaseSize: 12,
  innerRingMin: 2,
  innerRingMax: 6,
  innerScaleMin: 0.45,
  innerScaleMax: 1.2,
  innrRingClrs: [
    [227, 155, 173],
    [248, 228, 75],
    [101, 190, 255],
    [255, 255, 255],
    [163, 204, 131],
  ],
  innerGlowAlpha: 0.12,
  bodyGlowAlpha: 0.12,
  edgeGlowAlpha: 0.18,
  lineGlowBlur: 10,
  bodyGlowBlur: 10,
  bodyMtnSpd: 0.1,
  bodyDriftAmp: 2.1,
  linePlsAmp: 0.1,
  lineStrkAlph: 220,
  lineStrkWght: 6.2,
  lineDasLngMin: 4,
  lineDasLngMax: 22,
  lineDashGapMin: 19,
  lineDashGapMax: 40,
  lineDasPaiNMin: 8,
  lineDasPaiNMax: 11,
  bodyWaveAmp: 9.5,
  bodyWaveSpeed: 3.8,
  bodyWaveSteps: 72,
  followDelayMin: 280,
  followDelayMax: 1800,
  followSpeedMin: 0.12,
  followSpeedMax: 0.3,
  fllwDistMin: 58,
  fllwDistMax: 92,
  gazeShrtInfl: 0.08,
  pathLtrOffMin: -8,
  pathLtrOffMax: 8,
  seprGapMin: 2,
  seprGapMax: 8,
  seprPow: 0.45,
  seprPsss: 2,
  pathHistoryMs: 5000,
  pathHstDisMax: 300,
  pathSmplIntr: 45,
  pathSmplDist: 1.5,
  sizeMin: 0.16,
  sizeMax: 0.28,
  growthDuration: 3000,
  diffColorMs72: 2500,
  diffDuration: 3600,
  frstSpwnDly: 12000,
  spawnInterval: 28000,
  spawnOffsetMin: 0,
  spawnOffsetMax: 12,
  spwnLifeGapMin: 6,
  spwnLifeGapMax: 10,
  spawnRoamerGap: 50,
  spwnLifeQryRad: 160,
  spwnLifSrcSte: 12,
  spwnLifSrcRad: 144,
  spwnLifSrcAng: 24,
  maxCount: 6,
  twoUserMaxN: 4,
  thrUserMaxN: 3,
  lifeMin: 72000,
  lifeMax: 172800,
  deathDuration: 11000,
};

const faceTrack = {
  cameraWidth: 960,
  cameraHeight: 540,
  headXSign: 1,
  headYSign: 1,
  positionXGain: 0.76,
  positionYGain: 1,
  rotationXGain: 2.25,
  rotationYGain: 7.2,
  positionDeadX: 0.012,
  positionDeadY: 0.012,
  rotationDeadX: 0.018,
  rotationDeadY: 0.008,
  calibSettleMs: 2000,
  calibSampleMs: 2500,
  calibFadeInMs: 1500,
  calibFadeOutMs: 1000,
  clbMinPntSmpls: 10,
  clbSmplIntrMs: 24,
  clbStaWndMs: 320,
  clbStaMinSmp: 8,
  clbStblEyeMadX: 0.006,
  clbStblEyeMadY: 0.0045,
  stablePoseMad: [0.01, 0.008, 0.008, 0.008, 0.008, 0.012],
  rclbMssngMs: 15000,
  snglCrsExiDlyM: 2800,
  multiExitMs: 2800,
  crsrExitDurMs: 5500,
  snglCrsrRecvMs: 500,
  mltRecvMs: 650,
  slotKeepMs: 5000,
  faceSloRcnMtcM: 800,
  faceSloMtcRadP: 180,
  irisLandN: 478,
  eyeXGain: 1.5,
  eyeYGain: 2,
  eyeDeadX: 0.009,
  eyeDeadY: 0.0012,
  eyeMaxX: 0.22,
  eyeMaxY: 0.18,
  eyeRotXLmt: 0.18,
  eyeRotYLmt: 0.14,
  eyeCloseRatio: 0.48,
  eyeReopenRatio: 0.68,
  eyeSyncClsMean: 0.56,
  eyeSyncClsMax: 0.72,
  eyeClsDownGrd: 0.032,
  eyeClsdCertRt: 0.72,
  eyeClsdHoldMs: 1000,
  eyeShortCloseMs: 750,
  eyeLongCloseMs: 1500,
  eyeClosedCursorAlpha: 0.2,
  eyeRpnTxMs: 2000,
  eyeRippleMs: 2500,
  eyeRpnRppMinRa: 12,
  eyeRpnRppMaxRa: 180,
  eyeRpnRpplAlph: 0.58,
  prdtRpplDurMs: 4000,
  prdtRpplMaxRad: 190,
  prdtRppAlpBst: 40,
  predRppWdtBst: 0.5,
  eyeBlnkVisMs: 140,
  blinkSquashMs: 90,
  eyeBlnCrsMinSc: 0.34,
  eyeConfSmooth: 0.18,
  eyeConfEntr: 0.32,
  eyeConfExit: 0.2,
  eyeHorizAgrm: 0.16,
  eyeVertAgrm: 0.11,
  gazeHoldRadius: 10,
  gazeRadius: 56,
  gazeColor: [108, 216, 226],
  gazeCrsrAlph: 255,
  gazeCrsrScl: 1.1,
  idleCrsrAlph: 0.35,
  gazeGlowAlpha: 0.28,
  traceInterval: 105,
  traceLife: 2300,
  traceMax: 64,
  traceSpacing: 27,
  traceMinMove: 5,
  rpplMinRad: 3,
  rpplMaxRad: 13,
  rippleAlpha: 0.26,
  rpplUseAlpSte: 0.02,
  rpplLineWdth: 1.25,
};

let cells = [];
// The video stream, detection results, and calibration state belong to the current page and run,
// giving every encounter a clear data boundary.
// video and faceMesh provide real-time perception; faces stores the latest detection result.
let video;
let faceMesh;
let faces = [];
let camReady = false;
let detecting = false;
let faceDtcStaAt = -Infinity;
let lastFaceResultAt = -Infinity;
let isFaceRetrying = false;
let isFaceScanWait = false;
let joinRqstUntl = -Infinity;
// Controllers write the input mode and interface references; the detection pipeline reads them.
let gazeEnabled = false;
let skipCam = false;
let isPointerMode = false;
let pointerPresenceSrc = null;
let inptModeCont = null;
let inptModeBttns = [];
let ptrCtrlBttn = null;
let userNStts = null;
let recalibButton = null;
let recalibMenu = null;
let recalibOptions = null;
let consentPanel = null;
let cnsntWaveFrm = null;
let cnsntWaveSrfc = null;
let cnsnWavTopLef = null;
let consentWaveBR = null;
let cnsntPos = null;
let consentTitle = null;
let consentMessage = null;
let consentActions = null;
let joinButton = null;
let multiTestEnabled = false;
let multiModeEnabled = false;
let ptrFallback = "";
// Status notices and input-recovery rules manage participant feedback.
let status = "Loading FaceMesh…";
const sttsDsplyCfg = Object.freeze({
  trnsDurMs: 8000,
  fadeInMs: 2500,
  fadeOutMs: 2500,
  x: 17,
  top: 16,
  lineHeight: 13.2,
  verticalScale: 1.15,
  userNOffstX: 2,
});
const ecoRhythGdCfg = Object.freeze({
  controlGap: 8,
  fallbackTop: 194,
  contVertOffst: 8,
  entrHorOff: -3,
  sttsHorizOffst: -3,
  rclbHorizOffst: -16,
  rclbVertOffst: 3.5,
});
const statusCopy = Object.freeze({
  cmrPerm: "Allow camera access, and let the ecology notice you",
  calibration: "Follow the light and let your gaze gently settle",
  userMssng: "Your attention has moved away. Please come back to the screen",
  resized: "The view has shifted. Follow the light once again",
  observeOnly: "Stay for a while. The ecology is still growing",
  gazeRestored: "Your attention is back",
  pointerEnabled: "The cursor is guiding for now",
  ptrOff: "The cursor has moved away",
  gazeEnabled: "Your gaze is guiding again",
  eyesClosed: "Close your eyes, and the interaction pauses",
  calibComplete: "Your gaze has settled on the screen",
  cameraError: "The ecology cannot see you right now",
  cmrErrrActn: "Allow camera access, then reload the page",
  gazeError: "Your gaze cannot connect right now",
  gazeErrrActn: "Reload the page, or use the cursor instead",
  calibError: "The ecology cannot find your gaze",
  clbErrrActn: "Select Backup sensing: cursor to continue",
  rejoinScanning: "Looking for your attention again",
  rjnFaceMssng: "Move into the camera view, then try again",
  multOn: "Multiplayer is on. Waiting for another viewer",
});
const faceRcvrRls = Object.freeze({
  callTmtMs: 6000,
  restartDelayMs: 300,
  mnlJoinWndwMs: 15000,
});
const statusUi = {
  observedStatus: "",
  transient: null,
  storedErrr: null,
  persistent: null,
};
// Paths show the course of gaze; cell-lifecycle fields manage growth, differentiation, and departure.
let lastTrace = 0;
let traces = [];
const eyeRippleFx = new Map();
const predatorRipples = new Map();
let quietFrames = 0;
let extrClbLyr = null;
const cellSpwnStts = new Map();
let cellLifecycleStarted = false;
let gazePath = [];
let lastGazePathAt = -Infinity;
let testUserSnapshots = null;

// gazeFrame stores the current frame time; gaze and smoothGaze store continuous filtering state.
const gazeFrame = {
  dt: 1,
  now: 0,
};

const gaze = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
};

const cursorMove = {
  tilt: 0,
  targetTilt: 0,
  energy: 0,
};

const smoothGaze = {
  ready: false,
  x: 0,
  y: 0,
};

// eyeInput centrally stores eye-signal quality, baselines, offsets,
// and the tracking-loss recovery cycle.
const eyeInput = {
  // Availability and quality determine whether eye-tracking input may be used in this frame.
  available: false,
  calibrated: false,
  valid: false,
  state: "unavailable",
  engagementState: "gaze-engagement",
  confidence: 0,
  confidenceX: 0,
  confidenceY: 0,
  validX: false,
  validY: false,
  // Openness baselines are calibrated independently for the left and right eyes to detect eye closure.
  leftOpen: true,
  rightOpen: true,
  leftOpenness: 0,
  rightOpenness: 0,
  neutralX: 0,
  neutralY: 0,
  ntrlLeftOpen: 0.24,
  ntrlRghtOpen: 0.24,
  // raw and offset are normalized eye-motion values;
  // subsequent mapping converts them to canvas coordinates.
  rawX: 0,
  rawY: 0,
  offsetX: 0,
  offsetY: 0,
  closedSince: null,
  closurePhase: "open",
  closureSequence: 0,
  longClosureSequence: 0,
  closureDurationMs: 0,
  // These timestamps distinguish brief detection jitter, genuine tracking loss, and restabilization.
  lastClosureDurMs: 0,
  closureGaze: null,
  reopenStartedAt: null,
  closeLostAt: null,
  blinkUntil: 0,
  lastValidAt: -Infinity,
  faceGoneAt: null,
};

// Each participant has an independent cursor-tracking state, keeping multiple gaze paths separate.
function crtCrsrTrck(initialPhase = "tracking") {
  return {
    phase: initialPhase,
    alpha: initialPhase === "inactive" ? 0 : 1,
    lostAt: null,
    lossStartAlpha: initialPhase === "inactive" ? 0 : 1,
    lossDelayMs: null,
    multAtLoss: false,
    recoverAt: null,
    recvStrtAlph: initialPhase === "inactive" ? 0 : 1,
    inactiveSince: initialPhase === "inactive" ? 0 : null,
    reason: "",
  };
}

const primaryCursorTrack = crtCrsrTrck();

const headCenter = {
  ready: false,
  calibrating: false,
  startTime: 0,
  samples: [],
  positionX: 0,
  positionY: 0,
  rotationX: 0,
  rotationY: 0,
  roll: 0,
  faceScale: 0,
};

const calibPoints = Object.freeze([
  Object.freeze({ x: 0.5, y: 0.5, kind: "neutral" }),
]);

const clbFontFmly = "Neucha";
const userFlowScale = 1.265;
const clbCntntVisScl = 1.1;

const peerCalibRules = Object.freeze({
  prsnCnfrmMs: 1000,
  mssngCnclMs: 2800,
  panelWidth: 348,
  panelHeight: 138,
  pnlCntntOffstX: 6.8,
  pnlCntrOffstY: 11,
  pnlRadScl: 0.5,
  pnlBgBlur: 1,
  pnlBlurPddng: 48,
  safeRtclRad: 180,
  safeEncnRad: 220,
  minClrn: 0,
  horizOffstScl: 0.14,
  vertOffstScl: 0.16,
  horizOffstMax: 220,
  vertOffstMax: 150,
});

const gazeCalib = {
  active: false,
  pointIndex: 0,
  pointStartedAt: 0,
  pointValidMs: 0,
  pointStableMs: 0,
  lastUpdateAt: 0,
  lastSampleAt: -Infinity,
  pointSamples: [],
  stableSamples: [],
  trnnSmpls: [],
  rejected: false,
  failureReason: "",
  quality: "unavailable",
  lastCompletedAt: null,
};

const maximumParticipants = ecoConst.maximumParticipants;
const lifeType = ecoConst.lifeType;
const maximumDetectedFaces = 6;
const userCrsrShps = Object.freeze([
  "focus-arcs",
  "round-brackets",
  "square-brackets",
]);
const peerStates = Array.from(
  { length: maximumParticipants - 1 },
  (_, index) => ({
    id: index + 1,
    visible: false,
    calibrated: false,
    recalibrating: false,
    calibStartedAt: 0,
    calibPhase: "inactive",
    calibSeenAt: null,
    calibQueuedAt: null,
    calibUpdAt: 0,
    calibValidMs: 0,
    calibStableMs: 0,
    calibSampleAt: -Infinity,
    calibCompletedAt: null,
    clbMssngSnc: null,
    calibInvalidAt: null,
    calibBadAt: null,
    calibPausedReason: "",
    calibTarget: null,
    calibAnchor: { x: 0.5, y: 0.5 },
    calibStable: [],
    calibSamples: [],
    latestFeatures: null,
    neutral: null,
    gaze: { x: 0, y: 0, targetX: 0, targetY: 0 },
    eyes: {
      available: false,
      calibrated: false,
      valid: false,
      state: "unavailable",
      engagementState: "gaze-engagement",
      open: true,
      leftOpen: true,
      rightOpen: true,
      confidence: 0,
      confidenceX: 0,
      confidenceY: 0,
      validX: false,
      validY: false,
      offsetX: 0,
      offsetY: 0,
      closedSince: null,
      closurePhase: "open",
      closureSequence: 0,
      longClosureSequence: 0,
      closureDurationMs: 0,
      lastClosureDurMs: 0,
      closureGaze: null,
      reopenStartedAt: null,
      closeLostAt: null,
      blinkUntil: 0,
    },
    cursorTracking: crtCrsrTrck("inactive"),
    faceAssignmentId: 0,
    lastSeenAt: -Infinity,
    lastTrace: 0,
    traces: [],
  })
);
const faceAssignSlts = Array.from(
  { length: maximumDetectedFaces },
  (_, index) => ({
    participantId: index,
    face: null,
    center: null,
    lastSeenAt: -Infinity,
    assignmentId: 0,
  })
);
let nextFacAssId = 1;
let primaryFaceAssignId = 0;
let primarySlotId = 0;
const consentRules = Object.freeze({
  stblDetectMs: 1500,
  rcntPrsnGrcMs: 1200,
  rejoinGraceMs: 30000,
  rjnPosRadPx: 120,
  prmptTmtMs: 10000,
  gudnPrmptTmtMs: 5000,
  transitionMs: 1500,
  missingForgetMs: 2800,
  snglPnlWavPdd: 20,
  snglPnlCrnrRad: 50,
  pnlSrfcWaveAmp: 8,
  pnlCrnrWaveAmp: 12,
  snglPnlWaveSpd: 0.0001,
  pnlWavePnts: 96,
  snglPnlCrnOff: 1.5,
  pnlCrnrLegX: 46,
  pnlCrnrLegY: 14,
  pnlBttnWaveAmp: 1.6,
  pnlBttWavPnt: 48,
  pnlWavSmtPss: 3,
});
// Create independent waveform samples and phases for each invitation surface.
function makeCnsWavStt(
  seed,
  smoothingPasses,
  amplitude,
  pointCount = consentRules.pnlWavePnts
) {
  return {
    seed,
    smoothingPasses,
    amplitude,
    samples: new Float64Array(pointCount),
    scratch: new Float64Array(pointCount),
    offsets: new Float64Array(pointCount),
  };
}
const {
  panelMetrics: cnsntPnlMtrcs,
  rectPoint: cnsntRectPnt,
  updateOffset: updCnsntOffst,
  waveOffset: cnsntWaveOffst,
  wavePoint: cnsntWavePnt,
  closedPath: clsdCnsntPath,
  openPath: openCnsWavPat,
  waveRange: cnsntWaveRng,
  updatePanel: updtPnlWave,
} = window.GazeSupport.consent.create(consentRules, num);
const consent = Object.freeze({
  crtWaveStt: makeCnsWavStt,
  makePrmptPlcm: makeCnsntPlcm,
  updtPlcm: updCnsntPlcm,
  clrRjnWndw: clrRjnWndw,
  isPrsnElgb: isUserPrsnRdy,
  isJoinEligible: isVwrJoinElgb,
  rqstMnlRjn: rqstMnlRjn,
  normalizeState: normVwrStt,
  enroll: enrollViewer,
  closePrompt: clsCnsntPrmpt,
  openPrompt: openCnsntPrmpt,
  clsTmdOutPrmpt: clsTmdOutPrmpt,
  requestJoin: rqstVwrJoin,
  update: updtCnsntFlow,
  visWatc: visWatcUsrs,
  updtWaveOffst: updCnsntOffst,
  updtBttnWvs: updCnsntBttns,
  updtWaveFrm: updCnsWavFrm,
  cancelFade: cnclCnsntFade,
  showPanel: showCnsntPnl,
  hidePanel: hideCnsntPnl,
  handleAction: hndlCnsntActn,
  render: rndrCnsntUi,
  setup: stpCnsntCont,
  rnddRectPnt: cnsntRectPnt,
  waveOffset: cnsntWaveOffst,
  wavePoint: cnsntWavePnt,
  closedWavePath: clsdCnsntPath,
  openWavePath: openCnsWavPat,
  waveRange: cnsntWaveRng,
  snapshot: getConsentSnapshot,
});
const cnsntWaveStts = {
  surface: consent.crtWaveStt(
    61.83,
    3,
    consentRules.pnlSrfcWaveAmp
  ),
  topLeft: consent.crtWaveStt(
    83.17,
    4,
    consentRules.pnlCrnrWaveAmp
  ),
  bottomRight: consent.crtWaveStt(
    129.64,
    4,
    consentRules.pnlCrnrWaveAmp
  ),
  calibSurface: consent.crtWaveStt(
    173.29,
    3,
    consentRules.pnlSrfcWaveAmp
  ),
};
const cnsntWaveSize = {
  width: 0,
  height: 0,
};
const cnsntBttnWvs = new WeakMap();
let waveButtonSeq = 0;
const audienceStates = new Map();
let audiencePrompt = null;
let cnsntRndrKey = "";
let cnsntFadeTmr = null;
const testPeerStates = [
  {
    id: 1,
    inputMode: "eye-head",
    gaze: { x: 0, y: 0 },
    lastTrace: 0,
    traces: [],
  },
  {
    id: 2,
    inputMode: "keyboard",
    gaze: { x: 0, y: 0 },
    lastTrace: 0,
    traces: [],
  },
];
const mltKeybSpd = 7.2;
const aimCfg = Object.freeze({
  strength: 0.32,
  maximumOffset: 9,
  predAccmPow: 0.4,
  predAccMaxOff: 12,
  engageEase: 0.16,
  releaseEase: 0.2,
});
const aimStates = Array.from(
  { length: maximumParticipants },
  () => ({
    active: false,
    prdtAccm: false,
    rawGaze: null,
    logicalGaze: null,
    offsetX: 0,
    offsetY: 0,
  })
);

const clamp = num.clamp;
const cubicSmoothstep = num.cubicSmoothstep;

let gazeRandomUnit = num.createMulberry32(gazeConfig.seed);

function rstGazeRndm() {
  gazeRandomUnit = num.createMulberry32(gazeConfig.seed);
}

// The random entry point supports array selection and numeric ranges;
// environments outside p5 use the browser's random source.
function gazeRandom(minOrChoices, maxValue) {
  const unit = gazeRandomUnit();
  if (Array.isArray(minOrChoices)) {
    if (!minOrChoices.length) return undefined;
    return minOrChoices[
      Math.min(minOrChoices.length - 1, Math.floor(unit * minOrChoices.length))
    ];
  }
  if (arguments.length === 0) return unit;
  if (arguments.length === 1) return unit * minOrChoices;
  return minOrChoices + unit * (maxValue - minOrChoices);
}

// 3. Resources required to awaken perception
function preload(options = {}) {
  gazeEnabled = Boolean(options.enabled);
  skipCam = Boolean(options.skipCam);
  if (!gazeEnabled) return;
  if (skipCam) {
    status = "Move the mouse to guide the gaze path.";
    return;
  }
  if (typeof ml5 === "undefined" || !ml5.faceMesh) {
    status = "Unable to load ml5 FaceMesh.";
    holdErrrStts(
      statusCopy.gazeError,
      statusCopy.gazeErrrActn
    );
    return;
  }

  faceMesh = ml5.faceMesh({
    maxFaces: maximumDetectedFaces,
    refineLandmarks: true,
    flipped: true,
  });
}

const world = {
  centerX: () => width * 0.5,
  centerY: () => height * 0.5,
  radius: () => min(width * 0.5, height * 0.5),
  radiusX: () => min(width, height) * 0.6,
  radiusY: () => world.radius() * 1.05,

  // Determine whether a point lies within the BasicCell safe ellipse; padding reserves visual radius.
  inside(x, y, padding = 0) {
    const radiusX = max(1, this.radiusX() - padding);
    const radiusY = max(1, this.radiusY() - padding);
    const dx = (x - this.centerX()) / radiusX;
    const dy = (y - this.centerY()) / radiusY;
    return dx * dx + dy * dy <= 1;
  },

  // Candidate points lie within the safe ellipse; BasicCell
  // birth and gaze paths share the same visible boundary.
  project(x, y, padding = 0) {
    const centerX = this.centerX();
    const centerY = this.centerY();
    const radiusX = max(1, this.radiusX() - padding);
    const radiusY = max(1, this.radiusY() - padding);
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = sqrt(
      (dx * dx) / (radiusX * radiusX) +
        (dy * dy) / (radiusY * radiusY)
    );

    if (distance <= 1) return { x, y, hit: false, nx: 0, ny: 0 };

    const projectedX = centerX + dx / distance;
    const projectedY = centerY + dy / distance;
    let nx = (projectedX - centerX) / (radiusX * radiusX);
    let ny = (projectedY - centerY) / (radiusY * radiusY);
    const normalLength = max(0.001, sqrt(nx * nx + ny * ny));
    nx /= normalLength;
    ny /= normalLength;

    return { x: projectedX, y: projectedY, hit: true, nx, ny };
  },

  keep(cell) {
    const point = this.project(cell.x, cell.y);
    cell.x = point.x;
    cell.y = point.y;
  },
};

const getCircleTrig = num.circleTrig;
const makeWaveBuffer = num.createCircularNoiseBuffer;
const makeOrgRing = num.createOrganicRingPoints;

const drawWaveRing = softGlow.drawWaveRing;

// Generate an offset outline by adjusting each point's radius along its direction from the local origin.
function offstRingPnts(points, offset, output) {
  for (let index = 0; index < points.length; index++) {
    const x = points[index][0];
    const y = points[index][1];
    const radius = max(0.001, sqrt(x * x + y * y));
    const scale = max(0, radius + offset) / radius;
    output[index][0] = x * scale;
    output[index][1] = y * scale;
  }
  return output;
}

// Smoothly connect a closed curve through the midpoints of adjacent points.
function trcClsdPath(context, points, offsetX = 0, offsetY = 0) {
  const count = points.length;
  const pointAt = (index) =>
    points[((index % count) + count) % count];
  const first = pointAt(0);
  context.moveTo(first[0] + offsetX, first[1] + offsetY);

  for (let index = 0; index < count; index++) {
    const previous = pointAt(index - 1);
    const current = pointAt(index);
    const next = pointAt(index + 1);
    const afterNext = pointAt(index + 2);
    context.bezierCurveTo(
      current[0] + (next[0] - previous[0]) / 6 + offsetX,
      current[1] + (next[1] - previous[1]) / 6 + offsetY,
      next[0] - (afterNext[0] - current[0]) / 6 + offsetX,
      next[1] - (afterNext[1] - current[1]) / 6 + offsetY,
      next[0] + offsetX,
      next[1] + offsetY
    );
  }
  context.closePath();
}

function drawWavFilWitH(outerPoints, holePoints, holeX, holeY) {
  drawingContext.beginPath();
  trcClsdPath(drawingContext, outerPoints);
  trcClsdPath(drawingContext, holePoints, holeX, holeY);
  drawingContext.fill("evenodd");
}

// Trim from the end of the path by accumulated distance;
// queue length is measured by actual distance traveled.
function trimPathDist(points, maxDist) {
  let accmDist = 0;
  let keepFrom = 0;
  for (let index = points.length - 1; index > 0; index--) {
    accmDist += dist(
      points[index].x,
      points[index].y,
      points[index - 1].x,
      points[index - 1].y
    );
    if (accmDist > maxDist) {
      keepFrom = index;
      break;
    }
  }
  if (keepFrom > 0) points.splice(0, keepFrom);
}

// 4. Gaze becomes a path that BasicCells can follow
function recordGazePath(now) {
  const lastPoint = gazePath[gazePath.length - 1];
  const moved = lastPoint
    ? dist(lastPoint.x, lastPoint.y, gaze.x, gaze.y)
    : Infinity;
  if (
    !lastPoint ||
    (now - lastGazePathAt >= cellRules.pathSmplIntr &&
      moved >= cellRules.pathSmplDist)
  ) {
    gazePath.push({ x: gaze.x, y: gaze.y, at: now });
    lastGazePathAt = now;
  }

  const cutoff = now - cellRules.pathHistoryMs;
  while (gazePath.length > 1 && gazePath[1].at < cutoff) {
    gazePath.shift();
  }
  trimPathDist(gazePath, cellRules.pathHstDisMax);
}

function enqCellPath(cell, frame) {
  const replayUntil = frame.now - cell.followDelayMs;
  if (replayUntil <= cell.followStartAt) return;
  for (const point of gazePath) {
    if (
      point.at <= cell.followLastQueuedAt ||
      point.at > replayUntil
    ) {
      continue;
    }
    cell.followPath.push({ x: point.x, y: point.y, at: point.at });
    cell.followLastQueuedAt = point.at;
  }

  const oldstAllwdAt = frame.now - cellRules.pathHistoryMs;
  while (
    cell.followPath.length > 0 &&
    cell.followPath[0].at < oldstAllwdAt
  ) {
    cell.followPath.shift();
  }
  trimPathDist(
    cell.followPath,
    cellRules.pathHstDisMax
  );
}

// Each movement step is constrained by target distance,
// the gaze-exclusion radius, and the remaining path.
function lmtSteAtGazDis(cell, dx, dy, distance, desiredStep) {
  const unitX = dx / distance;
  const unitY = dy / distance;
  const gazeDX = cell.x0 - gaze.x;
  const gazeDY = cell.y0 - gaze.y;
  const curDist = sqrt(gazeDX * gazeDX + gazeDY * gazeDY);
  const candidateDX = gazeDX + unitX * desiredStep;
  const candidateDY = gazeDY + unitY * desiredStep;
  const candDist = sqrt(
    candidateDX * candidateDX + candidateDY * candidateDY
  );
  if (candDist >= curDist) return desiredStep;
  if (curDist <= cell.followDistance + 0.001) return 0;
  if (candDist >= cell.followDistance) return desiredStep;

  const projection = gazeDX * unitX + gazeDY * unitY;
  const radiusTerm =
    curDist * curDist -
    cell.followDistance * cell.followDistance;
  const discriminant = projection * projection - radiusTerm;
  if (discriminant <= 0) return 0;
  const stopStep = -projection - sqrt(discriminant);
  return constrain(stopStep, 0, desiredStep);
}

function updtPathFllw(cell, frame) {
// The path queue buffers gaze samples, and cells move along the path at their own speed.
  enqCellPath(cell, frame);
  let remainingStep = cell.followSpeed * max(0.1, frame.dt);
  while (cell.followPath.length > 0 && remainingStep > 0.001) {
    const queuedPoint = cell.followPath[0];
    const nextQdPnt = cell.followPath[1] || queuedPoint;
    let tangentX = nextQdPnt.x - queuedPoint.x;
    let tangentY = nextQdPnt.y - queuedPoint.y;
    let tangentLength = sqrt(tangentX * tangentX + tangentY * tangentY);
    // When consecutive points overlap, fall back first to the current-position direction and then to the
    // seeded direction, giving the lateral offset a stable normal.
    if (tangentLength < 0.001) {
      tangentX = queuedPoint.x - cell.x0;
      tangentY = queuedPoint.y - cell.y0;
      tangentLength = sqrt(tangentX * tangentX + tangentY * tangentY);
    }
    if (tangentLength < 0.001) {
      tangentX = cos(cell.seed);
      tangentY = sin(cell.seed);
      tangentLength = 1;
    }
    const offsetX =
      (-tangentY / tangentLength) * cell.pathLtrlOffst;
    const offsetY =
      (tangentX / tangentLength) * cell.pathLtrlOffst;
    const pathTarget = {
      x: lerp(
        queuedPoint.x + offsetX,
        gaze.x,
        cellRules.gazeShrtInfl
      ),
      y: lerp(
        queuedPoint.y + offsetY,
        gaze.y,
        cellRules.gazeShrtInfl
      ),
    };
    const dx = pathTarget.x - cell.x0;
    const dy = pathTarget.y - cell.y0;
    const distance = sqrt(dx * dx + dy * dy);
    if (distance <= 0.001) {
      cell.x0 = pathTarget.x;
      cell.y0 = pathTarget.y;
      cell.followPath.shift();
      continue;
    }
    const desiredStep = min(distance, remainingStep);
    // Limit the frame's step near the gaze point so the cell stops at the relational-distance boundary.
    const allowedStep = lmtSteAtGazDis(
      cell,
      dx,
      dy,
      distance,
      desiredStep
    );
    if (allowedStep <= 0.001) break;
    cell.x0 += (dx / distance) * allowedStep;
    cell.y0 += (dy / distance) * allowedStep;
    remainingStep -= allowedStep;
    if (allowedStep >= distance - 0.001) {
      cell.x0 = pathTarget.x;
      cell.y0 = pathTarget.y;
      cell.followPath.shift();
      continue;
    }
    if (allowedStep < desiredStep - 0.001) break;
  }
  const projected = world.project(cell.x0, cell.y0, 20);
  cell.x0 = projected.x;
  cell.y0 = projected.y;
}

// BasicCells continuously pulse and rotate while the gaze path gradually changes their positions.
function updtCellAnim(cell, dt) {
  cell.tt += 0.0050301 * cell.rw * dt;
  cell.x = cell.x0;
  cell.dy = 0;
  cell.y = cell.y0;
  cell.b = 1 + sin(cell.tt * 1.4 + cell.seed) * 0.04;
}

// Separation correction moves both the current position and path anchor.
function separateCell(cell, shiftX, shiftY) {
  if (
    cell.differentiating ||
    cell.directAppr ||
    cell.cellReturnHold
  ) {
    return;
  }
  const previousX = cell.x0;
  const previousY = cell.y0;
  const projected = world.project(
    previousX + shiftX,
    previousY + shiftY,
    20
  );
  cell.x0 = projected.x;
  cell.y0 = projected.y;
  cell.x += projected.x - previousX;
  cell.y += projected.y - previousY;
}

function seprBscClls() {
  // Multiple rounds of pairwise correction gradually resolve overlap;
  // differentiating cells hold position and leave displacement to ordinary cells.
  for (let pass = 0; pass < cellRules.seprPsss; pass++) {
    for (let firstIndex = 0; firstIndex < cells.length; firstIndex++) {
      const first = cells[firstIndex];
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < cells.length;
        secondIndex++
      ) {
        const second = cells[secondIndex];
        if (
          first.cellReturnHold ||
          second.cellReturnHold
        ) {
          continue;
        }
        if (first.differentiating && second.differentiating) continue;
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = sqrt(dx * dx + dy * dy);
        const pairGap =
          (first.separationGap + second.separationGap) * 0.5;
        const minDisttj =
          first.visualRadius +
          second.visualRadius +
          pairGap;
        if (distance >= minDisttj) continue;
        if (distance < 0.001) {
          const angle = (first.seed + second.seed) % TWO_PI;
          dx = cos(angle);
          dy = sin(angle);
          distance = 1;
        }
        const correction =
          (minDisttj - distance) * cellRules.seprPow;
        const share =
          first.differentiating ||
          second.differentiating ||
          first.directAppr ||
          second.directAppr
            ? 1
            : 0.5;
        const pushX = (dx / distance) * correction * share;
        const pushY = (dy / distance) * correction * share;
        if (!first.differentiating) {
          separateCell(first, -pushX, -pushY);
        }
        if (!second.differentiating) {
          separateCell(second, pushX, pushY);
        }
      }
    }
  }
}

function lifeOverlapAt(x, y, cellRadius, lifeGap) {
  // Query lifeforms near the birth point and return the maximum overlap,
  // allowing the position search to compare candidates.
  const creatureWorld = window.CreatureWorld;
  if (
    !creatureWorld?.queryNearby ||
    !creatureWorld?.getPosition ||
    !creatureWorld?.getVisRad
  ) {
    return 0;
  }

  const nearby = creatureWorld.queryNearby(
    { x, y },
    cellRules.spwnLifeQryRad
  );
  let maximumOverlap = 0;
  for (const entity of nearby) {
    const position = creatureWorld.getPosition(entity);
    const lifeRadius = creatureWorld.getVisRad(entity);
    if (!position || !Number.isFinite(lifeRadius)) continue;
    const interactionGap =
      entity.type === "Roamer" && entity.isIxActv?.()
        ? cellRules.spawnRoamerGap
        : 0;
    const minDisttj =
      cellRadius + lifeRadius + lifeGap + interactionGap;
    const dx = x - position.x;
    const dy = y - position.y;
    const distance = sqrt(dx * dx + dy * dy);
    maximumOverlap = max(
      maximumOverlap,
      minDisttj - distance
    );
  }
  return maximumOverlap;
}

function findClrBrthPnt(x, y, cellRadius, lifeGap) {
  // Sample in successive rings around the target, preferring the
  // smallest displacement that remains clear of lifeforms and cells.
  const origin = world.project(x, y, 20 + cellRadius);
  let best = origin;
  let bestOverlap = lifeOverlapAt(
    origin.x,
    origin.y,
    cellRadius,
    lifeGap
  );
  if (bestOverlap <= 0) return origin;

  const angleOffset = (x * 0.017 + y * 0.013) % TWO_PI;
  for (
    let radius = cellRules.spwnLifSrcSte;
    radius <= cellRules.spwnLifSrcRad;
    radius += cellRules.spwnLifSrcSte
  ) {
    for (
      let index = 0;
      index < cellRules.spwnLifSrcAng;
      index++
    ) {
      const angle =
        angleOffset +
        (TWO_PI * index) / cellRules.spwnLifSrcAng;
      const candidate = world.project(
        origin.x + cos(angle) * radius,
        origin.y + sin(angle) * radius,
        20 + cellRadius
      );
      const overlap = lifeOverlapAt(
        candidate.x,
        candidate.y,
        cellRadius,
        lifeGap
      );
      if (overlap <= 0) return candidate;
      if (overlap < bestOverlap) {
        best = candidate;
        bestOverlap = overlap;
      }
    }
  }
  return best;
}

// Birth spacing combines the target size with base clearance.
function birthLifeGap(targetSize) {
  const sizeProgress = clamp(
    (targetSize - cellRules.sizeMin) /
      (cellRules.sizeMax - cellRules.sizeMin),
    0,
    1
  );
  return lerp(
    cellRules.spwnLifeGapMin,
    cellRules.spwnLifeGapMax,
    sizeProgress
  );
}

const BasicCell = window.GazeSupport.basicCell.create({
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
});

function spawnBasicCell(participant, now, initial = false) {
  // Preserve and restore the p5 random state.
  const instance = typeof p5 !== "undefined" ? p5.instance : null;
  const ecsyRndmStt = instance?._lcg_random_state;
  let cell = null;
  try {
    const userGaze = participant?.gaze;
    const gazeCenter = initial || !userGaze
      ? { x: world.centerX(), y: world.centerY() }
      : clampGaze(userGaze.x, userGaze.y);
    const offsetAngle = initial ? 0 : gazeRandom(TWO_PI);
    const offsetDistance = initial
      ? 0
      : gazeRandom(cellRules.spawnOffsetMin, cellRules.spawnOffsetMax);
    const projected = world.project(
      gazeCenter.x + cos(offsetAngle) * offsetDistance,
      gazeCenter.y + sin(offsetAngle) * offsetDistance,
      20
    );
    const targetSize = gazeRandom(cellRules.sizeMin, cellRules.sizeMax);
    const cellRadius =
      cellRules.bodyDiameter * 0.5 * gazeConfig.drawScale * targetSize;
    // Candidate points then pass through a lifeform-avoidance search.
    const birthCenter = findClrBrthPnt(
      projected.x,
      projected.y,
      cellRadius,
      birthLifeGap(targetSize)
    );
    cell = new BasicCell(
      birthCenter.x,
      birthCenter.y,
      initial ? 0 : gazeRandom(-0.18, 0.18),
      targetSize,
      birthCenter
    );
  } finally {
    if (instance && Number.isFinite(ecsyRndmStt)) {
      instance._lcg_random_state = ecsyRndmStt;
    }
  }
  // Count the instance toward the participant quota and log it only after it is fully created.
  if (cell) {
    cell.brthUserId = clamp(
      Math.trunc(Number(participant?.participantId) || 0),
      0,
      maximumParticipants - 1
    );
    cell.beginBirthGlow(now);
    cells.push(cell);
    if (!initial) {
      window.LifeLogApp?.record?.(
        "LIFE EMERGED",
        "A possible life has entered the ecology.",
          {
            key: "life-emerged",
            primarySpecies: lifeType.basicCell,
            display: false,
            now,
        }
      );
    }
  }
  return cell;
}

function makeCell(now = millis(), participant = null) {
  return spawnBasicCell(participant, now, true);
}

function createRelCell(
  x,
  y,
  options = {},
  now = gazeFrame.now || millis()
) {
  if (
    window.InteractionSystem?.lifeMechanism?.canSpwnBscCell?.("fallback") === false
  ) {
    return null;
  }
  const targetSize = constrain(
    Number(options.size) || (cellRules.sizeMin + cellRules.sizeMax) * 0.5,
    cellRules.sizeMin,
    cellRules.sizeMax
  );
  const projected = world.project(x, y, 24);
  const cruiseCenter = { x: projected.x, y: projected.y };
  const cell = new BasicCell(
    projected.x,
    projected.y,
    Number(options.rotation) || 0,
    targetSize,
    cruiseCenter
  );
  cell.size = targetSize;
  cell.growthStart = now - cellRules.growthDuration;
  cell.followStartAt = now;
  cell.followLastQueuedAt = now;
  cell.relationalGlow = true;
  cell.countsForBirth = false;
  cell.relationalCreatedAt = now;
  cell.relationalGlowUntil = Number(options.glowUntil) || Infinity;
  if (options.regressionHold) {
    cell.cellReturnHold = {
      x: projected.x,
      y: projected.y,
    };
    cell.cellRtrnShow = constrain(
      Number(options.revealProgress) || 0,
      0,
      1
    );
  }
  cells.push(cell);
  return cell;
}

// Convert cell size into a relational-detection radius;
// reversion and differentiation share the same proximity range.
function relCellRad(size) {
  const resolvedSize = constrain(
    Number(size) || (cellRules.sizeMin + cellRules.sizeMax) * 0.5,
    cellRules.sizeMin,
    cellRules.sizeMax
  );
  return cellRules.bodyDiameter * 0.5 * gazeConfig.drawScale * resolvedSize;
}

function exportStoredCells(viewport = {}) {
  // The export copies restorable form and lifespan fields.
  const viewportWidth = max(1, Number(viewport.width) || width || 1);
  const viewportHeight = max(1, Number(viewport.height) || height || 1);
  return cells
    .filter(
      (cell) =>
        cell &&
        !cell.dead &&
        !cell.differentiating &&
        !cell.cellReturnHold
    )
    .map((cell) => ({
      x: cell.x / viewportWidth,
      y: cell.y / viewportHeight,
      x0: cell.x0 / viewportWidth,
      y0: cell.y0 / viewportHeight,
      rotation: cell.rotation,
      rotation0: cell.rotation0,
      targetSize: cell.targetSize,
      size: cell.size,
      seed: cell.seed,
      rw: cell.rw,
      tt: cell.tt,
      coreDiameter: cell.coreDiameter,
      core: cell.core ? { ...cell.core } : null,
      innerCircles: Array.isArray(cell.innerCircles)
        ? cell.innerCircles.map((circle) => ({
            ...circle,
            color: Array.isArray(circle.color) ? circle.color.slice() : circle.color,
          }))
        : [],
      outlineDashPattern: Array.isArray(cell.outlineDashPattern)
        ? cell.outlineDashPattern.slice()
        : [],
      lifeDuration: cell.lifeDuration,
      lifeConsumedMs: cell.lifeConsumedMs,
      relationalGlow: Boolean(cell.relationalGlow),
    }));
}

// This function was modified with the assistance of ChatGPT.
function restoreStoredCells(records, options = {}) {
  if (!Array.isArray(records) || !records.length) return 0;
  // Restore the BasicCell position for the current viewport together with its form and lifespan fields.
  const viewportWidth = max(1, Number(options.width) || width || 1);
  const viewportHeight = max(1, Number(options.height) || height || 1);
  const now = Number(options.now) || millis();
  const offlineLifeMs = max(
    0,
    Number(options.offlineLifeMs) || 0
  );
  const lifespanScale = max(
    0.001,
    Number(options.lifespanScale) || 1
  );
  let restored = 0;
  // Each record begins from a safe default form.
  for (const record of records) {
    const targetSize = constrain(
      Number(record?.targetSize) || (cellRules.sizeMin + cellRules.sizeMax) * 0.5,
      cellRules.sizeMin,
      cellRules.sizeMax
    );
    const x = constrain(Number(record?.x) || 0.5, 0, 1) * viewportWidth;
    const y = constrain(Number(record?.y) || 0.5, 0, 1) * viewportHeight;
    const rotation = Number(record?.rotation0) || 0;
    const cell = new BasicCell(
      x,
      y,
      rotation,
      targetSize,
      { x, y }
    );
    cell.x = x;
    cell.y = y;
    cell.x0 = constrain(Number(record?.x0) || Number(record?.x) || 0.5, 0, 1) * viewportWidth;
    cell.y0 = constrain(Number(record?.y0) || Number(record?.y) || 0.5, 0, 1) * viewportHeight;
    cell.rotation0 = Number(record?.rotation0) || rotation;
    cell.rotation = Number(record?.rotation) || cell.rotation0;
    cell.targetSize = targetSize;
    cell.size = targetSize;
    // Saved cells are treated as having completed their initial birth;
    // after restoration they enter roaming directly and retain their mature appearance.
    cell.growthStart = now - cellRules.growthDuration;
    cell.followStartAt = now;
    cell.followLastQueuedAt = now;
    cell.followPath = [];
    cell.cruiseCenter = { x, y };
    if (Number.isFinite(Number(record?.seed))) cell.seed = Number(record.seed);
    if (Number.isFinite(Number(record?.rw))) cell.rw = Number(record.rw);
    if (Number.isFinite(Number(record?.tt))) cell.tt = Number(record.tt);
    if (Number.isFinite(Number(record?.coreDiameter))) {
      cell.coreDiameter = Number(record.coreDiameter);
    }
    if (record?.core && Number.isFinite(record.core.x) && Number.isFinite(record.core.y)) {
      cell.core = { x: record.core.x, y: record.core.y };
    }
// Mutable arrays are copied layer by layer so the restoration
// snapshot and current runtime state retain independent contents.
    if (Array.isArray(record?.innerCircles)) {
      cell.innerCircles = record.innerCircles.map((circle) => ({
        ...circle,
        color: Array.isArray(circle.color) ? circle.color.slice() : circle.color,
      }));
    }
    if (Array.isArray(record?.outlineDashPattern)) {
      cell.outlineDashPattern = record.outlineDashPattern.slice();
    }
    const persistedLifeDur = Number(record?.lifeDuration);
    cell.lifeDuration = max(
      1,
      Number.isFinite(persistedLifeDur)
        ? persistedLifeDur * lifespanScale
        : cell.lifeDuration
    );
    // Offline elapsed time is added to consumed lifespan; expired cells enter a waiting stage until the
    // world system selects a safe time for removal.
    cell.lifeConsumedMs =
      max(0, Number(record?.lifeConsumedMs) || 0) + offlineLifeMs;
    cell.lifeRemainingMs = max(0, cell.lifeDuration - cell.lifeConsumedMs);
    cell.lifeLastUpdatedAt = now;
    cell.lifeClockPauseReason = null;
    cell.lifePhase = cell.lifeRemainingMs > 0 ? "alive" : "expired-waiting";
    cell.lifeSafeSince = null;
    cell.lifeDeathStartedAt = null;
    cell.lifeDeathOutcome = null;
    cell.lifeParasiteBorn = false;
    // Restored cross-run cells leave the birth count and
    // retain their relational glow as an ecological trace.
    cell.countsForBirth = false;
    cell.relationalGlow = Boolean(record?.relationalGlow);
    cell.relationalCreatedAt = now;
    cell.relationalGlowUntil = Infinity;
    cells.push(cell);
    restored++;
  }
  return restored;
}

// A reverting BasicCell follows its plan's visual target while
// retaining its original ecological ownership until completion.
function updtCellRtrn(
  cell,
  x,
  y,
  revealProgress
) {
  if (!cell || cell.dead) return false;
  const projected = world.project(x, y, 24);
  cell.cellReturnHold = {
    x: projected.x,
    y: projected.y,
  };
  cell.cellRtrnShow = constrain(
    Number(revealProgress) || 0,
    0,
    1
  );
  cell.x = projected.x;
  cell.y = projected.y;
  cell.x0 = projected.x;
  cell.y0 = projected.y;
  cell.opacity = 1;
  cell.dead = false;
  return true;
}

// When releasing a reversion hold, restore the cell's ordinary
// growth clock and clear the plan's temporary ownership.
function freeCellRtrn(cell, now = millis()) {
  if (!cell || cell.dead) return false;
  cell.cellReturnHold = null;
  cell.cellRtrnShow = 1;
  cell.opacity = 1;
  cell.deathScale = 1;
  cell.growthStart = now - cellRules.growthDuration;
  cell.followStartAt = now;
  cell.followLastQueuedAt = now;
  cell.followPath.length = 0;
  cell.cruiseCenter = { x: cell.x, y: cell.y };
  return true;
}

// Initial cell lifespans start together after the world and
// participant states are ready; ecological time begins at that moment.
function strtCellLife(now = millis()) {
  if (!gazeEnabled || cellLifecycleStarted) return false;
  cellLifecycleStarted = true;
  const groups = bscCelSpwGrp(actvCellUsrs());
  for (const group of groups) {
    const state = bscCellSpwnStt(group.key, now);
    state.initialized = true;
    if (gazeBirthCellCount(group.participantId) > 0) continue;
    makeCell(now, group.participant);
    state.lastSpawn = now;
    state.spawnedChild = false;
  }
  return true;
}

function isEncounterActive() {
  return Boolean(
    window.InteractionSystem?.encounter?.isActive?.()
  );
}

// Per-participant limits keep shared gaze relationships legible and ecological density stable.
function cellLimitPerUser(participantCount) {
  if (participantCount <= 1) return cellRules.maxCount;
  if (participantCount === 2) return cellRules.twoUserMaxN;
  return cellRules.thrUserMaxN;
}

// Calculate the current cell limit from the number of active participants.
function currentCellLimit() {
  const participantCount = activeViewerCount();
  const perUserLmt = cellLimitPerUser(participantCount);
  return participantCount <= 1
    ? perUserLmt
    : participantCount * perUserLmt;
}

function gazeBirthCellCount(participantId = null) {
  return cells.filter(
    (cell) =>
      cell.countsForBirth !== false &&
      (participantId == null || cell.brthUserId === participantId)
  ).length;
}

function actvCellUsrs() {
  // Allocate birth quotas to confirmed participants who remain present;
  // temporarily absent participants retain identity while generation pauses.
  if (testUserSnapshots?.length) {
    return testUserSnapshots
      .filter((participant) => participant?.inputActive !== false)
      .slice(0, maximumParticipants)
      .map((participant, participantId) => ({
        participantId,
        gaze: participant.gaze,
      }));
  }
  if (multiTestEnabled) {
    const participants = [{ participantId: 0, gaze }];
    if (skipCam) {
      participants.push({
        participantId: 1,
        gaze: testPeerStates[0].gaze,
      });
    } else if (peerStates[0].visible) {
      participants.push({
        participantId: 1,
        gaze: peerStates[0].gaze,
      });
    }
    participants.push({
      participantId: 2,
      gaze: testPeerStates[1].gaze,
    });
    return participants;
  }
  if (isPointerMode) return [{ participantId: 0, gaze }];

  const participants = [];
  if (
    primarySlotId &&
    isCursorVisible(primaryCursorTrack)
  ) {
    participants.push({ participantId: 0, gaze });
  }
  if (!multiModeEnabled) return participants;
  for (const participant of peerStates) {
    if (!participant.visible) continue;
    participants.push({
      participantId: participant.id,
      gaze: participant.gaze,
    });
  }
  return participants.slice(0, maximumParticipants);
}

// Map active participants to BasicCell birth groups.
function bscCelSpwGrp(participants) {
  const participantCount = participants.length;
  const limit = cellLimitPerUser(participantCount);
  if (participantCount <= 1) {
    return [{
      key: "shared",
      participant: participants[0] || { participantId: 0, gaze },
      participantId: null,
      limit,
    }];
  }
  return participants.map((participant) => ({
    key: `participant:${participant.participantId}`,
    participant,
    participantId: participant.participantId,
    limit,
  }));
}

// Create timing state for birth groups on demand,
// giving each participant an independent generation rhythm.
function bscCellSpwnStt(key, now) {
  let state = cellSpwnStts.get(key);
  if (!state) {
    state = {
      initialized: false,
      lastSpawn: now,
      spawnedChild: false,
      pauseStartedAt: null,
    };
    cellSpwnStts.set(key, state);
  }
  return state;
}

function updateGrowth(now) {
  // Each participant maintains independent birth timing, paused during
  // active encounters while preserving time already spent waiting.
  if (!cellLifecycleStarted) return;
  const groups = bscCelSpwGrp(actvCellUsrs());
  const activeKeys = new Set(groups.map((group) => group.key));
  for (const key of cellSpwnStts.keys()) {
    if (!activeKeys.has(key)) cellSpwnStts.delete(key);
  }
  if (isEncounterActive()) {
    for (const group of groups) {
      const state = bscCellSpwnStt(group.key, now);
      if (state.pauseStartedAt == null) state.pauseStartedAt = now;
    }
    return;
  }
  for (const group of groups) {
    const state = bscCellSpwnStt(group.key, now);
    if (state.pauseStartedAt != null) {
      state.lastSpawn += max(0, now - state.pauseStartedAt);
      state.pauseStartedAt = null;
    }
    const cellCount = gazeBirthCellCount(group.participantId);
    if (cellCount >= group.limit || headCenter.calibrating) continue;
    if (!state.initialized) {
      state.initialized = true;
      if (cellCount === 0) {
        makeCell(now, group.participant);
        state.lastSpawn = now;
        state.spawnedChild = false;
      }
      continue;
    }
    const spawnDelay = state.spawnedChild
      ? cellRules.spawnInterval
      : cellRules.frstSpwnDly;
    if (now - state.lastSpawn < spawnDelay) continue;
    if (!spawnBasicCell(group.participant, now)) continue;
    state.lastSpawn = now;
    state.spawnedChild = true;
  }
}

// 5. Perception remains present and recovers tracking after interruption
// Data flow: camera frame -> face detection -> temporary identity assignment -> eye signals;
// ecological objects are modified only by the system layer.
function startTrack() {
  gaze.x = width / 2;
  gaze.y = height / 2;
  gaze.targetX = width / 2;
  gaze.targetY = height / 2;
  smoothGaze.ready = true;
  smoothGaze.x = width / 2;
  smoothGaze.y = height / 2;

  status = "Waiting for camera permission…";
  // The camera image remains in the background; participants see gaze feedback on the canvas.
  video = createCapture(VIDEO, () => {
    camReady = true;
    status = "Starting face detection…";
    setTimeout(startDetect, 650);
  });
  video.size(faceTrack.cameraWidth, faceTrack.cameraHeight);
  video.hide();

  if (video && video.elt) {
    video.elt.onloadeddata = () => {
      camReady = true;
      setTimeout(startDetect, 650);
    };
    video.elt.onerror = () => {
      status = "The camera failed to start. Check browser permissions.";
      holdErrrStts(
        statusCopy.cameraError,
        statusCopy.cmrErrrActn
      );
    };
  }
}

function detcFaceCntr(face) {
  const keypoints = facePoints(face);
  if (!keypoints?.length) return { x: 0, y: 0 };
  const box = getFaceBox(keypoints);
  return { x: box.x + box.w * 0.5, y: box.y + box.h * 0.5 };
}

function isFaceLsActv(slotIndex) {
  const slot = faceAssignSlts[slotIndex];
  if (!slot?.assignmentId) return false;
  return (
    slot.assignmentId === primarySlotId ||
    audienceStates.has(slot.assignmentId) ||
    peerStates.some(
      (state) => state.faceAssignmentId === slot.assignmentId
    )
  );
}

function detectedFaceCount() {
  return faces.filter(Boolean).length;
}

function faceDetectionNow() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

// Detection results pass through continuous slot assignment before replacing the current list.
function accptFaceRslts(results) {
  lastFaceResultAt = faceDetectionNow();
  faces = assgnDetcFcs(results);
  return detectedFaceCount();
}

// This function was modified with the assistance of ChatGPT.
function assgnDetcFcs(results, now = performance.now()) {
  // Maintain participant continuity during current interactions by spatial distance;
  // identity association is limited to the current page session.
  const assignmentNow = Number(now) || 0;
  const incoming = (results || [])
    .slice(0, maximumDetectedFaces)
    .map((face) => ({
      face,
      center: detcFaceCntr(face),
    }));
  for (const slot of faceAssignSlts) slot.face = null;

  // Temporarily lost slots remain eligible for matching.
  const mtchCand = [];
  for (let slotIndex = 0; slotIndex < faceAssignSlts.length; slotIndex++) {
    const slot = faceAssignSlts[slotIndex];
    const recentlySeen =
      assignmentNow - slot.lastSeenAt <= faceTrack.faceSloRcnMtcM;
    if (
      !slot.assignmentId ||
      !slot.center ||
      (!isFaceLsActv(slotIndex) && !recentlySeen)
    ) {
      continue;
    }
    for (let faceIndex = 0; faceIndex < incoming.length; faceIndex++) {
      const dx = incoming[faceIndex].center.x - slot.center.x;
      const dy = incoming[faceIndex].center.y - slot.center.y;
      mtchCand.push({
        slotIndex,
        faceIndex,
        distSq: dx * dx + dy * dy,
      });
    }
  }
// After globally sorting detection candidates, continue participant
// identities one to one for more stable tracking relationships.
  mtchCand.sort(
    (first, second) => first.distSq - second.distSq
  );
  const usedSlots = new Set();
  const usedFaces = new Set();
  const maximumDistSq = faceTrack.faceSloMtcRadP ** 2;
  for (const candidate of mtchCand) {
    if (candidate.distSq > maximumDistSq) break;
    if (
      usedSlots.has(candidate.slotIndex) ||
      usedFaces.has(candidate.faceIndex)
    ) {
      continue;
    }
    const slot = faceAssignSlts[candidate.slotIndex];
    const detected = incoming[candidate.faceIndex];
    slot.face = detected.face;
    slot.center = detected.center;
    slot.lastSeenAt = assignmentNow;
    usedSlots.add(candidate.slotIndex);
    usedFaces.add(candidate.faceIndex);
  }

  // New faces enter empty slots according to horizontal screen position,
  // keeping first-appearance assignment predictable.
  const unssFcs = incoming
    .map((detected, faceIndex) => ({ ...detected, faceIndex }))
    .filter((detected) => !usedFaces.has(detected.faceIndex))
    .sort((first, second) => first.center.x - second.center.x);
  for (const detected of unssFcs) {
    const slotIndex = faceAssignSlts.findIndex((slot, index) => {
      if (usedSlots.has(index) || slot.face) return false;
      if (!slot.assignmentId) return true;
      const recentlySeen =
        assignmentNow - slot.lastSeenAt <= faceTrack.faceSloRcnMtcM;
      return !isFaceLsActv(index) && !recentlySeen;
    });
    if (slotIndex < 0) break;
    const slot = faceAssignSlts[slotIndex];
    slot.face = detected.face;
    slot.center = detected.center;
    slot.lastSeenAt = assignmentNow;
    slot.assignmentId = nextFacAssId++;
    usedSlots.add(slotIndex);
  }

  return faceAssignSlts.map((slot) => slot.face);
}

// Start continuous detection when both model and camera are ready;
// preserve a recoverable waiting state during preparation.
function startDetect() {
  if (detecting || isFaceRetrying) return;
  if (!faceMesh || !faceMesh.detectStart) {
    status = "FaceMesh failed to start.";
    holdErrrStts(
      statusCopy.gazeError,
      statusCopy.gazeErrrActn
    );
    return;
  }
  if (!camReady || !video) {
    status = "Waiting for camera permission…";
    setTimeout(startDetect, 500);
    return;
  }

  try {
    faceMesh.detectStart(video, (results) => {
      accptFaceRslts(results);
    });
    detecting = true;
    faceDtcStaAt = faceDetectionNow();
    clrHelErrStt();
    status = "Look directly at the screen and prepare for calibration.";
  } catch (error) {
    status = "Face detection failed to start.";
    holdErrrStts(
      statusCopy.gazeError,
      statusCopy.gazeErrrActn
    );
    console.error(error);
  }
}

function qFaceRstrt(reason = "") {
  if (
    isFaceRetrying ||
    skipCam ||
    !gazeEnabled ||
    !camReady ||
    !video ||
    !faceMesh
  ) {
    return false;
  }
  isFaceRetrying = true;
  detecting = false;
  try {
    faceMesh.detectStop?.();
  } catch {
    // A stalled detector may already have stopped internally.
  }
  window.setTimeout(() => {
    isFaceRetrying = false;
    startDetect();
  }, faceRcvrRls.restartDelayMs);
  if (reason) status = reason;
  return true;
}

// The detection health check decides whether to restart from the time of the last callback.
function ensrFaceHlthy() {
  if (skipCam || !gazeEnabled || !camReady || !video || !faceMesh) return false;
  const now = faceDetectionNow();
  const heartbeatAt = Number.isFinite(lastFaceResultAt)
    ? lastFaceResultAt
    : faceDtcStaAt;
  if (
    !detecting ||
    !Number.isFinite(heartbeatAt) ||
    now - heartbeatAt > faceRcvrRls.callTmtMs
  ) {
    qFaceRstrt("Reconnecting face detection…");
    return false;
  }
  return true;
}

function vdTrckEndd() {
  const element = video?.elt;
  const track = element?.srcObject?.getVideoTracks?.()[0];
  return Boolean(element?.error || (track && track.readyState === "ended"));
}

function rstrtCmrCptr() {
  if (skipCam || !gazeEnabled) return false;
  try {
    faceMesh?.detectStop?.();
  } catch {
    // The detector may have stopped with the camera track.
  }
  const element = video?.elt;
  for (const track of element?.srcObject?.getTracks?.() || []) track.stop();
  video?.remove?.();
  video = null;
  camReady = false;
  detecting = false;
  faceDtcStaAt = -Infinity;
  lastFaceResultAt = -Infinity;
  isFaceRetrying = false;
  faces = assgnDetcFcs([]);
  startTrack();
  return true;
}

// Run a single-frame detection on demand to supplement recovery checks for continuous detection.
async function runMnlFaceScan() {
  if (isFaceScanWait || !faceMesh?.detect || !video || !camReady) {
    ensrFaceHlthy();
    return false;
  }
  isFaceScanWait = true;
  try {
    const results = await faceMesh.detect(video);
    const faceCount = accptFaceRslts(results);
    if (faceCount > 0) {
      status = "Face detection has resumed. Hold still briefly.";
      qTrnsStts(statusCopy.rejoinScanning);
      return true;
    }
    status = "No face is currently detected. Face the camera and try again.";
    qTrnsStts(statusCopy.rjnFaceMssng);
    return false;
  } catch (error) {
    qFaceRstrt("Face detection was interrupted. Reconnecting…");
    console.error(error);
    return false;
  } finally {
    isFaceScanWait = false;
  }
}

const eyeLandmarks = Object.freeze({
  right: Object.freeze({
    corners: Object.freeze([33, 133]),
    upper: Object.freeze([160, 158]),
    lower: Object.freeze([144, 153]),
    iris: Object.freeze([468, 469, 470, 471, 472]),
  }),
  left: Object.freeze({
    corners: Object.freeze([362, 263]),
    upper: Object.freeze([385, 387]),
    lower: Object.freeze([380, 373]),
    iris: Object.freeze([473, 474, 475, 476, 477]),
  }),
});

// Calculate a stable center from specified landmarks, ignoring missing points.
function meanIndxdPnts(keypoints, indexes) {
  let x = 0;
  let y = 0;
  let count = 0;
  for (const index of indexes) {
    const point = keypoints[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return null;
    }
    x += point.x;
    y += point.y;
    count++;
  }
  return count ? { x: x / count, y: y / count } : null;
}

// 6. Understand blinking, eye closure, and reopening as a continuous attentional rhythm
function measureEye(keypoints, definition) {
  const firstCorner = keypoints[definition.corners[0]];
  const secondCorner = keypoints[definition.corners[1]];
  const upper = meanIndxdPnts(keypoints, definition.upper);
  const lower = meanIndxdPnts(keypoints, definition.lower);
  const iris = meanIndxdPnts(keypoints, definition.iris);
  if (!firstCorner || !secondCorner || !upper || !lower || !iris) return null;

  const leftCorner = firstCorner.x <= secondCorner.x
    ? firstCorner
    : secondCorner;
  const rightCorner = leftCorner === firstCorner
    ? secondCorner
    : firstCorner;
  const axisX = rightCorner.x - leftCorner.x;
  const axisY = rightCorner.y - leftCorner.y;
  const width = Math.max(0.001, Math.hypot(axisX, axisY));
  const horizontalAxis = { x: axisX / width, y: axisY / width };
  let verticalAxis = { x: -horizontalAxis.y, y: horizontalAxis.x };
  if (
    (lower.x - upper.x) * verticalAxis.x +
      (lower.y - upper.y) * verticalAxis.y <
    0
  ) {
    verticalAxis = { x: -verticalAxis.x, y: -verticalAxis.y };
  }

  const eyeCenter = {
    x: (leftCorner.x + rightCorner.x) * 0.5,
    y: (leftCorner.y + rightCorner.y) * 0.5,
  };
  const irisX = iris.x - eyeCenter.x;
  const irisY = iris.y - eyeCenter.y;
  const verticalSpan = Math.hypot(lower.x - upper.x, lower.y - upper.y);
  return {
    horizontal:
      (irisX * horizontalAxis.x + irisY * horizontalAxis.y) / width,
    vertical:
      (irisX * verticalAxis.x + irisY * verticalAxis.y) / width,
    openness: verticalSpan / width,
  };
}

function measureEyes(keypoints) {
  if (!keypoints || keypoints.length < faceTrack.irisLandN) return null;
  const left = measureEye(keypoints, eyeLandmarks.left);
  const right = measureEye(keypoints, eyeLandmarks.right);
  return left && right ? { left, right } : null;
}

function eyeOpnnRt(openness, ntrlOpnn) {
  return openness / Math.max(0.001, ntrlOpnn);
}

// Detect occlusion by combining eyelid openness with downward gaze.
function isDownGazeBlck(
  curVert,
  ntrlVert,
  calibrated,
  maxOpnnRt
) {
  if (!calibrated) return false;
  const downwardOffset = curVert - ntrlVert;
  return (
    downwardOffset >= faceTrack.eyeClsDownGrd &&
    maxOpnnRt > faceTrack.eyeClsdCertRt
  );
}

// Single-eye closure detection considers both absolute openness and the relative baseline,
// adapting to different participants' eye shapes.
function isEyeClosed(
  wasClosed,
  openness,
  ntrlOpnn,
  closureBlocked = false
) {
  if (closureBlocked) return false;
  const ratio = eyeOpnnRt(openness, ntrlOpnn);
  return wasClosed
    ? ratio < faceTrack.eyeReopenRatio
    : ratio < faceTrack.eyeCloseRatio;
}

// Consolidate current measurements from both eyes into an eye-closure snapshot.
function clssEyeClose(
  leftOpenness,
  rightOpenness,
  ntrlLeftOpnn,
  ntrlRghtOpnn,
  leftWasClosed,
  rightWasClosed,
  curVert,
  ntrlVert,
  calibrated
) {
  const leftRatio = eyeOpnnRt(leftOpenness, ntrlLeftOpnn);
  const rightRatio = eyeOpnnRt(rightOpenness, ntrlRghtOpnn);
  const maximumRatio = Math.max(leftRatio, rightRatio);
  const syncClose =
    (leftRatio + rightRatio) * 0.5 <
      faceTrack.eyeSyncClsMean &&
    maximumRatio < faceTrack.eyeSyncClsMax;
  const closureBlocked = isDownGazeBlck(
    curVert,
    ntrlVert,
    calibrated,
    maximumRatio
  );
  const allowClosure = syncClose || !closureBlocked;
  const leftClosed = isEyeClosed(
    leftWasClosed,
    leftOpenness,
    ntrlLeftOpnn,
    !allowClosure
  );
  const rightClosed = isEyeClosed(
    rightWasClosed,
    rightOpenness,
    ntrlRghtOpnn,
    !allowClosure
  );
  return {
    leftClosed: syncClose || leftClosed,
    rightClosed: syncClose || rightClosed,
  };
}

// When a blink ends, clear the short-closure timer; sequences
// already in an extended rest are resolved by the completion path.
function rsmBlnkTrck(eyes, now) {
  if (eyes?.closeLostAt == null) return;
  if (eyes.closedSince != null) {
    eyes.closedSince += max(0, now - eyes.closeLostAt);
  }
  eyes.closeLostAt = null;
}

// Briefly preserve eye-closure progress during tracking loss.
function prsrBlnkOnLoss(eyes, now, graceMs) {
  if (eyes?.closedSince == null) return false;
  if (eyes.closeLostAt == null) {
    eyes.closeLostAt = now;
  }
  if (now - eyes.closeLostAt <= graceMs) return true;
  cnclEyeClose(eyes);
  return false;
}

// The eye-opening ripple uses the point locked by the closure sequence,
// falling back to the current cursor position when it is absent.
function eyeRpnRpplPos(eyes, fallbackPos) {
  const source = eyes?.closureGaze || fallbackPos;
  if (!source) return null;
  const sourceX = Number(source.x);
  const sourceY = Number(source.y);
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return null;
  return {
    x: clamp(sourceX, 0, width),
    y: clamp(sourceY, 0, height),
  };
}

function queueEyeReopenRipple(eyes, participantId, fallbackPos, now) {
  const position = eyeRpnRpplPos(eyes, fallbackPos);
  if (!position) return false;
  const id = clamp(
    Math.trunc(Number(participantId) || 0),
    0,
    maximumParticipants - 1
  );
  const closureSequence = max(0, Number(eyes?.closureSequence) || 0);
  if (
    closureSequence > 0 &&
    eyeRippleFx.get(id)?.closureSequence === closureSequence
  ) {
    return false;
  }
  eyeRippleFx.set(id, {
    participantId: id,
    closureSequence,
    x: position.x,
    y: position.y,
    startedAt: now,
  });
  return true;
}

// Store each Predator ripple's position and start time by identifier,
// removing the oldest record when more than eight exist.
function qPrdtRppl(options = {}) {
  const sourceX = Number(options.x);
  const sourceY = Number(options.y);
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return false;
  const id = String(options.id ?? `predator:${predatorRipples.size}`);
  predatorRipples.set(id, {
    id,
    x: clamp(sourceX, 0, width),
    y: clamp(sourceY, 0, height),
    startedAt: Number.isFinite(options.startedAt)
      ? Number(options.startedAt)
      : gazeFrame.now || 0,
  });
  while (predatorRipples.size > 8) {
    predatorRipples.delete(
      predatorRipples.keys().next().value
    );
  }
  return true;
}

function updtEyeClose(eyes, now, position, participantId = 0) {
  // An eye-closure sequence locks its position and sequence number on the initial frame.
  const wasResting =
    eyes.closurePhase === "short-hold" ||
    eyes.closurePhase === "long-interrupt";
  if (eyes.closedSince == null) {
    eyes.closedSince = now;
    eyes.blinkUntil = 0;
    eyes.closureSequence = (eyes.closureSequence || 0) + 1;
    eyes.closureGaze = position
      ? { x: position.x, y: position.y }
      : null;
    eyes.reopenStartedAt = null;
    eyes.closeLostAt = null;
  } else {
    rsmBlnkTrck(eyes, now);
  }
  const durationMs = max(0, now - eyes.closedSince);
  eyes.closureDurationMs = durationMs;
  // One duration axis is interpreted successively as a blink, brief rest,
  // and intentional interruption; all three states share one timer.
  if (durationMs >= faceTrack.eyeLongCloseMs) {
    eyes.closurePhase = "long-interrupt";
    if ((eyes.longClosureSequence || 0) < eyes.closureSequence) {
      eyes.longClosureSequence = eyes.closureSequence;
    }
  } else if (durationMs >= faceTrack.eyeShortCloseMs) {
    eyes.closurePhase = "short-hold";
  } else {
    eyes.closurePhase = "blink";
  }
  eyes.state = durationMs >= faceTrack.eyeShortCloseMs
    ? "closed"
    : "closing";
  eyes.engagementState = durationMs >= faceTrack.eyeShortCloseMs
    ? "rest"
    : "gaze-engagement";
  if (!wasResting && durationMs >= faceTrack.eyeShortCloseMs) {
    window.SoundApp?.cue?.("eyes-close", {
      key: `eyes-close:${participantId}:${eyes.closureSequence}`,
      cooldownKey: `eyes-close:${participantId}`,
      x: position?.x,
      priority: 1,
    });
  }
  return durationMs;
}

// After an eye-closure sequence is resolved, it produces reopening feedback,
// separating short blinks and intentional rest into distinct ecological signals.
function fnshEyeClose(eyes, now, participantId = 0, fallbackPos = null) {
  if (eyes.closedSince == null) return 0;
  rsmBlnkTrck(eyes, now);
  const durationMs = max(0, now - eyes.closedSince);
  eyes.closedSince = null;
  eyes.closureDurationMs = 0;
  eyes.lastClosureDurMs = durationMs;
  if (
    durationMs >= faceTrack.eyeLongCloseMs &&
    (eyes.longClosureSequence || 0) < eyes.closureSequence
  ) {
    eyes.longClosureSequence = eyes.closureSequence;
  }
  // Reaching the rest threshold produces a reopening ripple;
  // an ordinary blink retains a brief cursor compression.
  if (durationMs >= faceTrack.eyeShortCloseMs) {
    eyes.blinkUntil = 0;
    eyes.closurePhase = "reopening";
    eyes.reopenStartedAt = now;
    const rippleQueued = queueEyeReopenRipple(
      eyes,
      participantId,
      fallbackPos,
      now
    );
    if (rippleQueued) {
      window.SoundApp?.cue?.("eyes-open", {
        key: `eyes-open:${participantId}:${eyes.closureSequence}`,
        cooldownKey: `eyes-open:${participantId}`,
        x: eyeRpnRpplPos(eyes, fallbackPos)?.x,
        priority: 1,
      });
    }
  } else {
    eyes.blinkUntil = now + faceTrack.eyeBlnkVisMs;
    eyes.closurePhase = "open";
    eyes.reopenStartedAt = null;
  }
  return durationMs;
}

// Cancel the active eye-closure sequence and clear its temporary locked point.
function cnclEyeClose(eyes) {
  eyes.closedSince = null;
  eyes.closureDurationMs = 0;
  eyes.closurePhase = "open";
  eyes.closureGaze = null;
  eyes.reopenStartedAt = null;
  eyes.closeLostAt = null;
  eyes.blinkUntil = 0;
}

// Reset the sequence only after the reopening stage completes rest resolution and exit feedback.
function updtBlnkOpen(eyes, now) {
  if (
    eyes.closurePhase === "reopening" &&
    now - eyes.reopenStartedAt >= faceTrack.eyeRpnTxMs
  ) {
    eyes.closurePhase = "open";
    eyes.reopenStartedAt = null;
    eyes.closureGaze = null;
  }
}

// Calculate eye-closure notice opacity separately for entry, hold, and exit stages.
function eyeClosureVisAlpha(eyes, now = gazeFrame.now || 0) {
  if (eyes?.closedSince != null) {
    return eyes.closurePhase === "blink"
      ? 1
      : faceTrack.eyeClosedCursorAlpha;
  }
  if (eyes?.closurePhase !== "reopening" || eyes.reopenStartedAt == null) {
    return 1;
  }
  const progress = clamp(
    (now - eyes.reopenStartedAt) / faceTrack.eyeRpnTxMs,
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  return lerp(faceTrack.eyeClosedCursorAlpha, 1, eased);
}

// Compress the cursor with a blink to give eye closure visible feedback.
function blnkCrsrSclY(eyes, now = gazeFrame.now || 0) {
  if (!eyes) return 1;
  const minimumScale = faceTrack.eyeBlnCrsMinSc;
  if (eyes.closedSince != null) {
    const closeProgress = clamp(
      (now - eyes.closedSince) / faceTrack.blinkSquashMs,
      0,
      1
    );
    return lerp(1, minimumScale, cubicSmoothstep(closeProgress));
  }
  if (Number.isFinite(eyes.blinkUntil) && now < eyes.blinkUntil) {
    const reopenStartedAt = eyes.blinkUntil - faceTrack.eyeBlnkVisMs;
    const reopenProgress = clamp(
      (now - reopenStartedAt) / faceTrack.eyeBlnkVisMs,
      0,
      1
    );
    return lerp(minimumScale, 1, cubicSmoothstep(reopenProgress));
  }
  if (eyes.closurePhase === "reopening" && eyes.reopenStartedAt != null) {
    const reopenProgress = clamp(
      (now - eyes.reopenStartedAt) / faceTrack.eyeRpnTxMs,
      0,
      1
    );
    return lerp(minimumScale, 1, cubicSmoothstep(reopenProgress));
  }
  return 1;
}

// When the iris signal is interrupted, mark eye motion
// unavailable and retain the latest coordinates for recovery.
function markEyeUnvl(state = "head-only", now = gazeFrame.now || 0) {
  eyeInput.available = false;
  eyeInput.valid = false;
  eyeInput.validX = false;
  eyeInput.validY = false;
  eyeInput.state = state;
  eyeInput.engagementState = "gaze-engagement";
  eyeInput.leftOpen = true;
  eyeInput.rightOpen = true;
  prsrBlnkOnLoss(
    eyeInput,
    now,
    multi.isActive()
      ? faceTrack.multiExitMs
      : faceTrack.snglCrsExiDlyM
  );
  eyeInput.confidence *= 1 - faceTrack.eyeConfSmooth;
  eyeInput.confidenceX *= 1 - faceTrack.eyeConfSmooth;
  eyeInput.confidenceY *= 1 - faceTrack.eyeConfSmooth;
  eyeInput.offsetX *= 0.75;
  eyeInput.offsetY *= 0.75;
}

// Continue gaze through blinks, while passing longer eye closures to the rest and interruption stages.
// This function was modified with the assistance of ChatGPT.
function updateEyeState(metrics, now) {
  if (!metrics) {
    // When iris data is interrupted, retain head-detection state and pause gaze-direction updates.
    markEyeUnvl("head-only", now);
    return;
  }

  eyeInput.available = true;
  eyeInput.leftOpenness = metrics.left.openness;
  eyeInput.rightOpenness = metrics.right.openness;
  const ntrlLeftOpen = eyeInput.calibrated
    ? eyeInput.ntrlLeftOpen
    : 0.24;
  const ntrlRghtOpen = eyeInput.calibrated
    ? eyeInput.ntrlRghtOpen
    : 0.24;
  // Eye-closure detection uses the participant's calibration baseline.
  const closure = clssEyeClose(
    metrics.left.openness,
    metrics.right.openness,
    ntrlLeftOpen,
    ntrlRghtOpen,
    !eyeInput.leftOpen,
    !eyeInput.rightOpen,
    (metrics.left.vertical + metrics.right.vertical) * 0.5,
    eyeInput.neutralY,
    eyeInput.calibrated
  );
  const { leftClosed, rightClosed } = closure;
  eyeInput.leftOpen = !leftClosed;
  eyeInput.rightOpen = !rightClosed;

  if (leftClosed && rightClosed) {
    // When both eyes close, suspend coordinate validity; an independent state machine uses duration to
    // distinguish blinks, rest, and interruption.
    updtEyeClose(eyeInput, now, gaze, 0);
    eyeInput.valid = false;
    eyeInput.validX = false;
    eyeInput.validY = false;
    eyeInput.confidence *= 1 - faceTrack.eyeConfSmooth;
    eyeInput.confidenceX *= 1 - faceTrack.eyeConfSmooth;
    eyeInput.confidenceY *= 1 - faceTrack.eyeConfSmooth;
    return;
  }

  if (eyeInput.closedSince != null) {
    fnshEyeClose(eyeInput, now, 0, gaze);
  }
  updtBlnkOpen(eyeInput, now);

  const activeEyes = [];
  if (!leftClosed) activeEyes.push(metrics.left);
  if (!rightClosed) activeEyes.push(metrics.right);
  eyeInput.rawX = activeEyes.reduce(
    (total, eye) => total + eye.horizontal,
    0
  ) / activeEyes.length;
  eyeInput.rawY = activeEyes.reduce(
    (total, eye) => total + eye.vertical,
    0
  ) / activeEyes.length;

  const bothOpen = !leftClosed && !rightClosed;
  // Continue accepting input when one eye is visible, while reducing consistency confidence.
  const horizAgrm = bothOpen
    ? 1 - clamp(
        Math.abs(metrics.left.horizontal - metrics.right.horizontal) /
          faceTrack.eyeHorizAgrm,
        0,
        1
      )
    : 0.55;
  const vertAgrm = bothOpen
    ? 1 - clamp(
        Math.abs(metrics.left.vertical - metrics.right.vertical) /
          faceTrack.eyeVertAgrm,
        0,
        1
      )
    : 0.55;
  const rngConf =
    Math.abs(eyeInput.rawX) <= 0.34 && Math.abs(eyeInput.rawY) <= 0.24
      ? 1
      : 0;
  const rawConfidenceX = horizAgrm * rngConf;
  const rawConfidenceY = vertAgrm * rngConf;
  eyeInput.confidenceX = lerp(
    eyeInput.confidenceX,
    rawConfidenceX,
    faceTrack.eyeConfSmooth
  );
  eyeInput.confidenceY = lerp(
    eyeInput.confidenceY,
    rawConfidenceY,
    faceTrack.eyeConfSmooth
  );
  eyeInput.confidence = Math.min(
    eyeInput.confidenceX,
    eyeInput.confidenceY
  );
  eyeInput.validX = eyeInput.validX
    ? eyeInput.confidenceX >= faceTrack.eyeConfExit
    : eyeInput.confidenceX >= faceTrack.eyeConfEntr;
  eyeInput.validY = eyeInput.validY
    ? eyeInput.confidenceY >= faceTrack.eyeConfExit
    : eyeInput.confidenceY >= faceTrack.eyeConfEntr;
  eyeInput.valid = eyeInput.validX && eyeInput.validY;
  // Use different confidence thresholds for entry and exit
  // to reduce repeated validity changes near boundary values.
  eyeInput.state = bothOpen
    ? now < eyeInput.blinkUntil
      ? "blink"
      : "open"
    : "partial";
  eyeInput.engagementState = "gaze-engagement";
  if (eyeInput.valid) eyeInput.lastValidAt = now;
}

// Face loss records its start time and state; identity
// release is determined by the unified grace-period logic.
function markFaceMssng(now) {
  if (eyeInput.faceGoneAt == null) eyeInput.faceGoneAt = now;
  markEyeUnvl("face-lost", now);
  if (gazeCalib.active) {
    gazeCalib.pointStartedAt = now;
    gazeCalib.pointValidMs = 0;
    gazeCalib.pointStableMs = 0;
    gazeCalib.lastUpdateAt = now;
    gazeCalib.pointSamples = [];
    gazeCalib.stableSamples = [];
  }
  if (
    now - eyeInput.faceGoneAt >=
    faceTrack.rclbMssngMs
  ) {
    headCenter.ready = false;
    headCenter.calibrating = false;
    headCenter.samples = [];
    eyeInput.calibrated = false;
    gazeCalib.rejected = false;
    gazeCalib.failureReason = "";
    gazeCalib.quality = "unavailable";
  }
}

// 7. Estimate where the audience is looking from head pose and calibration relationships
function gazePoseFetr(
  rawPositionX,
  rawPositionY,
  rawRotationX,
  rawRotationY,
  headRoll,
  faceScale
) {
  return [
    rawRotationX,
    rawRotationY,
    headRoll,
    rawPositionX,
    rawPositionY,
    faceScale,
  ];
}

// Measure sample stability with median absolute deviation.
function medianAbsDev(samples, property, center) {
  const deviations = samples
    .map((sample) => Math.abs(sample[property] - center))
    .sort((first, second) => first - second);
  if (!deviations.length) return Infinity;
  const middle = Math.floor(deviations.length * 0.5);
  return deviations.length % 2
      ? deviations[middle]
      : (deviations[middle - 1] + deviations[middle]) * 0.5;
}

// Estimate calibration stability from sample dispersion.
function clbSndStable(samples, poseForSample) {
  const usable = (samples || []).filter(
    (sample) => Number.isFinite(sample?.eyeX) && Number.isFinite(sample?.eyeY)
  );
  if (usable.length < 2) return 0.75;
  const normNs = [];
  for (const [property, threshold] of [
    ["eyeX", faceTrack.clbStblEyeMadX],
    ["eyeY", faceTrack.clbStblEyeMadY],
  ]) {
    const center = medianSample(usable, property);
    normNs.push(
      medianAbsDev(usable, property, center) / Math.max(0.0001, threshold)
    );
  }
  for (let index = 0; index < faceTrack.stablePoseMad.length; index++) {
    const poseValues = usable
      .map((sample) => ({ value: poseForSample(sample)?.[index] }))
      .filter((sample) => Number.isFinite(sample.value));
    if (poseValues.length < 2) continue;
    const center = medianSample(poseValues, "value");
    normNs.push(
      medianAbsDev(poseValues, "value", center) /
        Math.max(0.0001, faceTrack.stablePoseMad[index])
    );
  }
  const meanNoise =
    normNs.reduce((sum, value) => sum + Math.min(1.5, value), 0) /
    Math.max(1, normNs.length);
  return clamp(1 - meanNoise * 0.28, 0.58, 0.98);
}

function calibEntryX(samples, fallbackX) {
  const usable = (samples || []).filter((sample) => Number.isFinite(sample?.positionX));
  if (!usable.length) return fallbackX;
  return clamp((medianSample(usable, "positionX") + 0.5) * width, 0, width);
}

// Calculate offset from the participant's eye-motion baseline,
// adjusting its strength by head rotation and input confidence.
function eyeOffForHea(rawRotationX, rawRotationY) {
  if (!eyeInput.calibrated || !eyeInput.valid) {
    eyeInput.offsetX *= 0.75;
    eyeInput.offsetY *= 0.75;
    return { x: eyeInput.offsetX, y: eyeInput.offsetY };
  }

  const rotationX = Math.abs(rawRotationX - headCenter.rotationX);
  const rotationY = Math.abs(rawRotationY - headCenter.rotationY);
  const poseConfidence = Math.min(
    1 - clamp(rotationX / faceTrack.eyeRotXLmt, 0, 1),
    1 - clamp(rotationY / faceTrack.eyeRotYLmt, 0, 1)
  );
  const confidence = eyeInput.confidence * lerp(0.2, 1, poseConfidence);
  const targetX = clamp(
    deadZone(eyeInput.rawX - eyeInput.neutralX, faceTrack.eyeDeadX) *
      faceTrack.eyeXGain,
    -faceTrack.eyeMaxX,
    faceTrack.eyeMaxX
  ) * confidence;
  const targetY = clamp(
    deadZone(eyeInput.rawY - eyeInput.neutralY, faceTrack.eyeDeadY) *
      faceTrack.eyeYGain,
    -faceTrack.eyeMaxY,
    faceTrack.eyeMaxY
  ) * confidence;
  eyeInput.offsetX = lerp(eyeInput.offsetX, targetX, 0.3);
  eyeInput.offsetY = lerp(eyeInput.offsetY, targetY, 0.3);
  return { x: eyeInput.offsetX, y: eyeInput.offsetY };
}

const multi = Object.freeze({
  isActive: checkMultiMode,
});

// Determine whether multi-participant mode is active from the test setting and participation state.
function checkMultiMode() {
  if (!multiModeEnabled && !multiTestEnabled) return false;
  return Boolean(
    multiTestEnabled ||
      faces.filter(Boolean).length > 1 ||
      peerStates.some(
        (participant) => participant.cursorTracking.phase !== "inactive"
      )
  );
}

// Cursor-tracking reset centrally clears departure visuals and
// timing while allowing the caller to specify a new stable stage.
function rstCrsrTrack(tracking, phase = "tracking") {
  tracking.phase = phase;
  tracking.alpha = phase === "inactive" ? 0 : 1;
  tracking.lostAt = null;
  tracking.lossStartAlpha = tracking.alpha;
  tracking.lossDelayMs = null;
  tracking.multAtLoss = false;
  tracking.recoverAt = null;
  tracking.recvStrtAlph = tracking.alpha;
  tracking.inactiveSince = phase === "inactive" ? gazeFrame.now : null;
  tracking.reason = "";
}

// Tracking loss first passes through hold and fade stages.
function crsrTrckLost(
  tracking,
  now,
  delayMs,
  reason = ""
) {
  tracking.recoverAt = null;
  if (tracking.phase === "inactive") return tracking.phase;
  if (tracking.lostAt == null) {
    tracking.lostAt = now;
    tracking.lossStartAlpha = tracking.alpha;
    tracking.lossDelayMs = delayMs;
    tracking.multAtLoss = multi.isActive();
  }
  tracking.reason = reason || tracking.reason;
  const elapsed = max(0, now - tracking.lostAt);
  const resolvedDelay = tracking.lossDelayMs ?? delayMs;
  if (elapsed < resolvedDelay) {
    tracking.phase = "grace";
    tracking.alpha = tracking.lossStartAlpha;
    return tracking.phase;
  }
  const exitProgress = clamp(
    (elapsed - resolvedDelay) / faceTrack.crsrExitDurMs,
    0,
    1
  );
  tracking.phase = exitProgress >= 1 ? "inactive" : "exiting";
  tracking.alpha = tracking.lossStartAlpha * (1 - exitProgress);
  if (tracking.phase === "inactive" && tracking.inactiveSince == null) {
    tracking.inactiveSince = now;
  }
  return tracking.phase;
}

// The tracking-stability window absorbs brief detection fluctuations.
function cursorTrackOk(tracking, now, recoveryMs) {
  tracking.lostAt = null;
  tracking.lossDelayMs = null;
  tracking.reason = "";
  if (tracking.phase === "tracking") {
    tracking.alpha = 1;
    tracking.recoverAt = null;
    return true;
  }
  if (tracking.recoverAt == null) {
    tracking.recoverAt = now;
    tracking.recvStrtAlph = tracking.alpha;
  }
  const recvProg = clamp(
    (now - tracking.recoverAt) / max(1, recoveryMs),
    0,
    1
  );
  tracking.phase = recvProg >= 1 ? "tracking" : "recovering";
  tracking.alpha = lerp(
    tracking.recvStrtAlph,
    1,
    recvProg
  );
  if (tracking.phase === "tracking") {
    tracking.recoverAt = null;
    tracking.inactiveSince = null;
    return true;
  }
  return false;
}

// Restore tracking state and preserve the cursor during eye closure or a brief pause,
// distinguishing these states from input loss.
function holdCrsrTrack(tracking) {
  if (tracking.phase === "inactive") return false;
  rstCrsrTrack(tracking);
  return true;
}

function isCursorVisible(tracking) {
  return tracking.phase !== "inactive" && tracking.alpha > 0;
}

// Preserve pointer operation during camera failure to maintain accessibility.
function swtcToPtrFal(reason, multAtLoss = false) {
  ptrFallback = reason;
  if (multAtLoss || multiTestEnabled) {
    status = `${reason}. Participant 1's target has exited; other participants remain unchanged.`;
    return false;
  }
  status = `${reason}. The target has exited. Select the backup cursor input to continue.`;
  updtPtrBttn();
  return false;
}

function clrPtrFallback() {
  rstCrsrTrack(primaryCursorTrack);
}

// When the gaze signal is interrupted, enter a grace period before
// switching to pointer control if the interruption persists.
function waitForPtrFal(reason, now) {
  const lossDelay = multi.isActive()
    ? faceTrack.multiExitMs
    : faceTrack.snglCrsExiDlyM;
  const phase = crsrTrckLost(
    primaryCursorTrack,
    now,
    lossDelay,
    reason
  );
  const elapsed = max(0, now - (primaryCursorTrack.lostAt ?? now));
  const resolvedDelay = primaryCursorTrack.lossDelayMs ?? lossDelay;
  if (phase === "grace") {
    status = `${reason}. The target will remain briefly and begin exiting in ${(
      max(0, resolvedDelay - elapsed) / 1000
    ).toFixed(1)} seconds.`;
    return false;
  }
  if (phase === "exiting") {
    status = `${reason}. The target is exiting.`;
    return false;
  }
  return swtcToPtrFal(
    reason,
    primaryCursorTrack.multAtLoss
  );
}

// Bind primary-participant calibration reset to the current detection identifier.
function rstMainClb(assignmentId, now) {
  primaryFaceAssignId = assignmentId;
  headCenter.ready = false;
  headCenter.calibrating = false;
  headCenter.samples = [];
  gazeCalib.active = false;
  gazeCalib.rejected = false;
  gazeCalib.failureReason = "";
  gazeCalib.quality = "unavailable";
  gazeCalib.lastCompletedAt = null;
  eyeInput.calibrated = false;
  eyeInput.valid = false;
  cnclEyeClose(eyeInput);
  eyeRippleFx.delete(0);
  eyeInput.faceGoneAt = null;
  rstCrsrTrack(primaryCursorTrack, "inactive");
  primaryCursorTrack.inactiveSince = now;
}

// When releasing the primary slot, preserve departure feedback before
// clearing calibration and control ownership so another viewer can join.
function freeMainUser(now) {
  const assignmentId = primarySlotId;
  prsrRjnWndw(assignmentId, now);
  primarySlotId = 0;
  rstMainClb(0, now);
  const audience = audienceStates.get(assignmentId);
  if (audience?.status === "joining") audience.status = "watching";
  status = detectedFaceCount() > 0
    ? "The viewer is observing quietly."
    : "The ecology is growing quietly.";
}

// Preserve a grace period after primary-participant tracking is lost;
// release the slot once cursor departure completes and absence reaches the threshold.
function updtMainLoss(reason, now) {
  markFaceMssng(now);
  const phase = crsrTrckLost(
    primaryCursorTrack,
    now,
    multi.isActive()
      ? faceTrack.multiExitMs
      : faceTrack.snglCrsExiDlyM,
    reason
  );
  const missingMs = max(0, now - (eyeInput.faceGoneAt ?? now));
  if (
    phase === "inactive" &&
    missingMs >= faceTrack.snglCrsExiDlyM
  ) {
    freeMainUser(now);
    return;
  }
  status = phase === "exiting"
    ? `${reason}. The target is exiting.`
    : `${reason}. The participant's place will be retained briefly.`;
}

// Valid gaze control requires confirmed participation,
// calibration, presence, and available input simultaneously.
function isGazeControlActive() {
  if (multiTestEnabled) return true;
  if (isPointerMode) {
    return pointerPresenceSrc !== "tracking-fallback";
  }
  if (!primarySlotId) return false;
  if (primaryCursorTrack.phase !== "tracking") return false;
  if (gazeCalib.active) return false;
  if (!primaryUserFace()) return false;
  if (!eyeInput.calibrated || !eyeInput.available) return false;
  if (!eyeInput.valid) return false;
  return eyeInput.state !== "closed";
}

// Update the primary participant's head, eye, and gaze state from detection results;
// enter tracking recovery when input becomes invalid.
// This function was modified with the assistance of ChatGPT.
function updateCam() {
  const now = millis();
  if (multiTestEnabled) {
    const gazeTestState = peerStates[0];
    const gazeTestLabel = gazeTestState.calibrated
      ? "2 Gaze"
      : gazeTestState.faceAssignmentId
        ? "2 Gaze calibration"
        : "2 Gaze awaiting entry";
    status = skipCam
      ? "Three-participant test: 1 Cursor · 2 Simulated gaze · 3 Arrow keys"
      : `Three-participant test: 1 Cursor · ${gazeTestLabel} · 3 Arrow keys`;
    return;
  }
  if (isPointerMode) {
    status = ptrFallback
      ? `${ptrFallback}. Mouse control is currently active.`
      : "Mouse control is enabled.";
    return;
  }
  if (!primarySlotId) {
    // Viewers waiting to join affect presence state.
    if (audiencePrompt && audiencePrompt.mode !== "select") {
      status = "A viewer has been detected and may choose to join or only observe.";
    } else {
      status = detectedFaceCount() > 0
        ? "The viewer is observing quietly."
        : "The ecology is growing quietly.";
    }
    return;
  }

  const primarySlot = faceSlotForAssign(primarySlotId);
  const primaryFace = primarySlot?.face || null;
  if (!primaryFace) {
    // Preserve the participant's place while a face is
    // temporarily undetected, allowing time for tracking recovery.
    updtMainLoss("No participant detected", now);
    return;
  }

  const assignmentId = primarySlot.assignmentId;
  if (assignmentId && assignmentId !== primaryFaceAssignId) {
    rstMainClb(assignmentId, now);
  }

  eyeInput.faceGoneAt = null;

  const keypoints = facePoints(primaryFace);
  if (!keypoints || keypoints.length < 468) {
    markEyeUnvl("face-incomplete", now);
    waitForPtrFal("Facial landmarks are incomplete", now);
    return;
  }

  // Extract normalized head pose and eye measurements directly from landmarks;
  // the state layer retains derived metrics.
  const eyeMetrics = measureEyes(keypoints);
  const faceBox = getFaceBox(keypoints);
  const faceCenter = {
    x: faceBox.x + faceBox.w / 2,
    y: faceBox.y + faceBox.h / 2,
  };
  const rightEyeCenter = meanPoints(keypoints, [33, 133]);
  const leftEyeCenter = meanPoints(keypoints, [362, 263]);
  const eyeCenter = {
    x: (rightEyeCenter.x + leftEyeCenter.x) * 0.5,
    y: (rightEyeCenter.y + leftEyeCenter.y) * 0.5,
  };
  const nose = keypoints[1] || eyeCenter;
  const eyeSpan = max(1, pointDist(keypoints[33], keypoints[263]));
  // Normalize translation, yaw, and roll separately so calibration can independently compensate for
  // camera position and head-pose differences.
  const rawPositionX = faceCenter.x / faceTrack.cameraWidth - 0.5;
  const rawPositionY = faceCenter.y / faceTrack.cameraHeight - 0.5;
  const rawRotationX = (nose.x - eyeCenter.x) / eyeSpan;
  const rawRotationY = (nose.y - eyeCenter.y) / max(1, faceBox.h);
  let headAxisX = leftEyeCenter.x - rightEyeCenter.x;
  let headAxisY = leftEyeCenter.y - rightEyeCenter.y;
  if (headAxisX < 0) {
    headAxisX *= -1;
    headAxisY *= -1;
  }
  const headRoll = Math.atan2(headAxisY, headAxisX);
  const faceScale = eyeSpan / faceTrack.cameraWidth;

  // Eye validity is evaluated before calibration; the baseline accepts samples with complete iris data.
  updateEyeState(eyeMetrics, now);
  if (!eyeInput.available) {
    waitForPtrFal("Iris input is unavailable", now);
    return;
  }
  if (
    !headCenter.ready &&
    !headCenter.calibrating &&
    !gazeCalib.rejected
  ) {
    startCalib();
  }
  const pose = gazePoseFetr(
    rawPositionX,
    rawPositionY,
    rawRotationX,
    rawRotationY,
    headRoll,
    faceScale
  );
  const gazeSample = {
    pose,
    positionX: rawPositionX,
    positionY: rawPositionY,
    rotationX: rawRotationX,
    rotationY: rawRotationY,
    roll: headRoll,
    faceScale,
    eyeX: eyeInput.rawX,
    eyeY: eyeInput.rawY,
    leftOpen: eyeInput.leftOpenness,
    rightOpen: eyeInput.rightOpenness,
  };
  // Update the participant's calibration baseline with the current sample.
  updateCalib(gazeSample, now);

  if (gazeCalib.active) return;
  if (eyeInput.state === "closing") {
    holdCrsrTrack(primaryCursorTrack);
    status = "Your eyes and head are guiding the target together.";
    return;
  }
  if (eyeInput.state === "closed") {
    holdCrsrTrack(primaryCursorTrack);
    status = eyeInput.closurePhase === "long-interrupt"
      ? "Extended eye closure detected. The current interaction has been interrupted."
      : "Eye closure detected. Gaze input is paused.";
    return;
  }
  if (!eyeInput.calibrated || !eyeInput.available || !eyeInput.valid) {
    // When eye motion is interrupted for an extended period, the pointer takes over.
    // The work continues responding to the audience while
    // gaze data remains within a trustworthy boundary.
    waitForPtrFal("Iris input is unavailable or unstable", now);
    return;
  }

  const trackingReady = cursorTrackOk(
    primaryCursorTrack,
    now,
    multi.isActive()
      ? faceTrack.mltRecvMs
      : faceTrack.snglCrsrRecvMs
  );

  // Apply dead zones and gain relative to the participant's neutral pose,
  // then combine them with eye offset into a screen target.
  const positionX =
    deadZone(rawPositionX - headCenter.positionX, faceTrack.positionDeadX) *
    faceTrack.positionXGain;
  const positionY =
    deadZone(rawPositionY - headCenter.positionY, faceTrack.positionDeadY) *
    faceTrack.positionYGain;
  const rotationX =
    deadZone(rawRotationX - headCenter.rotationX, faceTrack.rotationDeadX) *
    faceTrack.rotationXGain;
  const rotationY =
    deadZone(rawRotationY - headCenter.rotationY, faceTrack.rotationDeadY) *
    faceTrack.rotationYGain;

  const eyeOffset = eyeOffForHea(rawRotationX, rawRotationY);
  const normalX =
    0.5 + faceTrack.headXSign * (positionX + rotationX) + eyeOffset.x;
  const normalY =
    0.5 + faceTrack.headYSign * (positionY + rotationY) + eyeOffset.y;

  status = trackingReady
    ? "Your eyes and head are guiding the target together."
    : "Head and eye detection has resumed. Confirming stability.";
  setTarget(normalX * width, normalY * height);
}

// 8. Multiple audience members are seen in turn while retaining their own calibration relationships
// Participant identifiers maintain continuous tracking
// within the current page and end with this page session.
function userFaceFetr(face) {
  const keypoints = facePoints(face);
  if (!keypoints || keypoints.length < 468) return null;
  // Normalize position, rotation, and scale by frame or face dimensions
  // so different camera resolutions use the same calibration thresholds.
  const faceBox = getFaceBox(keypoints);
  const rightEyeCenter = meanPoints(keypoints, [33, 133]);
  const leftEyeCenter = meanPoints(keypoints, [362, 263]);
  const eyeCenter = {
    x: (rightEyeCenter.x + leftEyeCenter.x) * 0.5,
    y: (rightEyeCenter.y + leftEyeCenter.y) * 0.5,
  };
  const nose = keypoints[1] || eyeCenter;
  const eyeSpan = max(1, pointDist(keypoints[33], keypoints[263]));
  let headAxisX = leftEyeCenter.x - rightEyeCenter.x;
  let headAxisY = leftEyeCenter.y - rightEyeCenter.y;
  // Normalize the eye-axis direction so head roll remains continuous when landmark order changes.
  if (headAxisX < 0) {
    headAxisX *= -1;
    headAxisY *= -1;
  }
  const metrics = measureEyes(keypoints);
  const activeEyes = metrics ? [metrics.left, metrics.right] : [];
  return {
    positionX: (faceBox.x + faceBox.w * 0.5) / faceTrack.cameraWidth - 0.5,
    positionY: (faceBox.y + faceBox.h * 0.5) / faceTrack.cameraHeight - 0.5,
    rotationX: (nose.x - eyeCenter.x) / eyeSpan,
    rotationY: (nose.y - eyeCenter.y) / max(1, faceBox.h),
    roll: Math.atan2(headAxisY, headAxisX),
    faceScale: eyeSpan / faceTrack.cameraWidth,
    // Average both eyes to reduce single-eye occlusion noise; if the iris signal is interrupted,
    // retain a neutral value and let validation end calibration.
    eyeX: activeEyes.length
      ? activeEyes.reduce((sum, eye) => sum + eye.horizontal, 0) /
        activeEyes.length
      : 0,
    eyeY: activeEyes.length
      ? activeEyes.reduce((sum, eye) => sum + eye.vertical, 0) /
        activeEyes.length
      : 0,
    leftOpen: metrics?.left?.openness ?? 0.24,
    rightOpen: metrics?.right?.openness ?? 0.24,
    hasIris: Boolean(metrics),
  };
}

function isPeerCalibPending(state) {
  return Boolean(
    state &&
      !state.calibrated &&
      state.calibPhase !== "inactive"
  );
}

// Treat preparation, sampling, and fade-out as active stages occupying the calibration target.
function isPeerCalibActive(state) {
  return Boolean(
    state &&
      ["preparing", "sampling", "fading"].includes(
        state.calibPhase
      )
  );
}

// Companion calibration samples must include iris data, open eyes, and finite feature values.
function isPeerClbVld(features) {
  if (!features?.hasIris) return false;
  if (features.leftOpen <= 0.08 || features.rightOpen <= 0.08) return false;
  return [
    "positionX",
    "positionY",
    "rotationX",
    "rotationY",
    "roll",
    "faceScale",
    "eyeX",
    "eyeY",
  ].every((key) => Number.isFinite(features[key]));
}

// Head-pose fields required for calibration follow a preset order used by the stability calculation.
function peerCalibPose(features) {
  return gazePoseFetr(
    features.positionX,
    features.positionY,
    features.rotationX,
    features.rotationY,
    features.roll,
    features.faceScale
  );
}

// Check separately whether each participant's eye and
// head samples meet calibration-stability requirements.
function peerClbStbl(state, features, now) {
  state.calibStable.push({
    eyeX: features.eyeX,
    eyeY: features.eyeY,
    pose: peerCalibPose(features),
    at: now,
  });
  state.calibStable =
    state.calibStable.filter(
      (entry) => now - entry.at <= faceTrack.clbStaWndMs
    );
  const samples = state.calibStable;
  if (samples.length < faceTrack.clbStaMinSmp) return false;
  const eyeX = medianSample(samples, "eyeX");
  const eyeY = medianSample(samples, "eyeY");
  if (
    medianAbsDev(samples, "eyeX", eyeX) >
      faceTrack.clbStblEyeMadX ||
    medianAbsDev(samples, "eyeY", eyeY) >
      faceTrack.clbStblEyeMadY
  ) {
    return false;
  }
  return peerCalibPose(features).every((value, index) => {
    const poseValues = samples.map((entry) => ({ value: entry.pose[index] }));
    const center = medianSample(poseValues, "value");
    return medianAbsDev(poseValues, "value", center) <=
      faceTrack.stablePoseMad[index];
  });
}

// Multi-participant calibration queue and safe-position selection
function calibObstacles() {
  const obstacles = [];
  const add = (point, radius) => {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
    obstacles.push({ x: point.x, y: point.y, radius });
  };
  // Confirmed, visible gaze points use the normal avoidance radius;
  // participants begin occupying space after calibration completes.
  if (isCursorVisible(primaryCursorTrack)) {
    add(gaze, peerCalibRules.safeRtclRad);
  }
  for (const participant of peerStates) {
    if (participant.calibrated && participant.visible) {
      add(participant.gaze, peerCalibRules.safeRtclRad);
    }
  }

  // A gaze engaged in interaction requires a larger safe area.
  const sessions = window.InteractionSystem?.calibration?.obstacles?.() || [];
  const creatureWorld = window.CreatureWorld;
  for (const session of sessions) {
    if (!session?.enabled) continue;
    add(
      session.logicalGaze || session.gaze,
      session.encnActv
        ? peerCalibRules.safeEncnRad
        : peerCalibRules.safeRtclRad
    );
    if (
      session.focusedType &&
      session.focusedSeed != null &&
      creatureWorld?.getByType
    ) {
      const focused = creatureWorld
        .getByType(session.focusedType)
        .find((entity) => entity?.seed === session.focusedSeed);
      if (focused) {
        // A focused lifeform may appear larger than the gaze point,
        // so the boundary must also include its visible radius.
        const position = creatureWorld.getPosition?.(focused) || focused;
        const visualRadius = creatureWorld.getVisRad?.(focused) || 0;
        add(
          position,
          max(
            peerCalibRules.safeEncnRad,
            visualRadius + 120
          )
        );
      }
    }
  }
  return obstacles;
}

function slctClbTgt() {
  // Constrain panel dimensions by the viewport first, preserving
  // a minimum readable area and safe margin in small windows.
  const panelWidth = min(
    peerCalibRules.panelWidth * userFlowScale,
    max(120, width - 32)
  );
  const panelHeight = min(
    peerCalibRules.panelHeight * userFlowScale,
    max(80, height - 32)
  );
  const halfWidth = panelWidth * 0.5;
  const halfHeight = panelHeight * 0.5;
  const pnlCntrOffstY = peerCalibRules.pnlCntrOffstY;
  const offsetX = min(
    width * peerCalibRules.horizOffstScl,
    peerCalibRules.horizOffstMax
  );
  const offsetY = min(
    height * peerCalibRules.vertOffstScl,
    peerCalibRules.vertOffstMax
  );
  // Evaluate stable candidate points near the center.
  const offsets = [
    [0, 0],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  // Obstacles include both interface elements and active lifeforms.
  const obstacles = calibObstacles();
  const encnActv = isEncounterActive();
  let best = null;
  for (const [horizontal, vertical] of offsets) {
    const candidate = {
      x: width * 0.5 + horizontal * offsetX,
      y: height * 0.5 + vertical * offsetY,
    };
    if (
      candidate.x - halfWidth < 16 ||
      candidate.x + halfWidth > width - 16 ||
      candidate.y + pnlCntrOffstY - halfHeight < 16 ||
      candidate.y + pnlCntrOffstY + halfHeight > height - 16
    ) {
      continue;
    }
    const ovrlCont =
      candidate.x - halfWidth < 300 &&
      candidate.y + pnlCntrOffstY + halfHeight > height - 160;
    if (ovrlCont) continue;
    let clearance = Infinity;
    for (const obstacle of obstacles) {
      clearance = min(
        clearance,
        Math.hypot(candidate.x - obstacle.x, candidate.y - obstacle.y) -
          obstacle.radius
      );
    }
    if (clearance < peerCalibRules.minClrn) continue;
    const centerDistance = Math.hypot(
      candidate.x - width * 0.5,
      candidate.y - height * 0.5
    );
    const centerPenalty =
      encnActv && horizontal === 0 && vertical === 0 ? 80 : 0;
    // Scoring prioritizes clearance, then mildly favors the center;
    // active encounters further reduce the exact center's weight.
    const score =
      (Number.isFinite(clearance) ? clearance : 1000) -
      centerDistance * 0.12 -
      centerPenalty;
    if (!best || score > best.score) best = { ...candidate, score };
  }
  return best ? { x: best.x, y: best.y } : null;
}

// Lock the target and clear the sample window when companion calibration begins.
function beginPeerCalib(state, target, now) {
  state.calibPhase = "preparing";
  state.calibStartedAt = now;
  state.calibUpdAt = now;
  state.calibValidMs = 0;
  state.calibStableMs = 0;
  state.calibSampleAt = -Infinity;
  state.calibCompletedAt = null;
  state.calibInvalidAt = null;
  state.calibBadAt = null;
  state.calibPausedReason = "";
  state.calibTarget = { x: target.x, y: target.y };
  state.calibAnchor = {
    x: target.x / max(1, width),
    y: target.y / max(1, height),
  };
  state.calibStable.length = 0;
  state.calibSamples.length = 0;
  state.neutral = null;
  state.gaze.x = target.x;
  state.gaze.y = target.y;
  state.gaze.targetX = target.x;
  state.gaze.targetY = target.y;
}

// After sampling completes, save the robust center value before entering the fade-out stage.
function donePeerSamp(state, now) {
  const keys = [
    "positionX",
    "positionY",
    "rotationX",
    "rotationY",
    "roll",
    "faceScale",
    "eyeX",
    "eyeY",
    "leftOpen",
    "rightOpen",
  ];
  state.neutral = Object.fromEntries(
    keys.map((key) => [key, medianSample(state.calibSamples, key)])
  );
  state.calibPhase = "fading";
  state.calibCompletedAt = now;
  state.calibPausedReason = "";
}

// Calibration completion opens interaction after valid samples
// are committed and releases the queue to the next participant.
function fnshPeerClb(state, now) {
  state.calibrated = true;
  state.calibPhase = "complete";
  state.calibPausedReason = "";
  state.eyes.calibrated = true;
  rstCrsrTrack(state.cursorTracking, "inactive");
  state.cursorTracking.inactiveSince = now;
  openCalibGuide(now);
  window.SoundApp?.userJnd?.({
    participantId: state.id,
    assignmentId: state.faceAssignmentId || `additional-${state.id}`,
    participantCount: jndSndN(),
    x: calibEntryX(state.calibSamples, state.gaze.x),
    stability: clbSndStable(
      state.calibSamples,
      peerCalibPose
    ),
    inputMode: "eye-head",
    priority: 2,
  });
}

// Advance one participant's calibration pose and sampling confirmation;
// stable features commit the mapping parameters.
function updtPeerClb(state, features, now) {
  if (!isPeerCalibActive(state) || state.calibPhase === "fading") {
    return;
  }
  const frameMs = clamp(now - state.calibUpdAt, 0, 100);
  state.calibUpdAt = now;
  // Clear the stability window immediately when input
  // validation fails; display the reason after a delay.
  if (!isPeerClbVld(features)) {
    if (state.calibInvalidAt == null) {
      state.calibInvalidAt = now;
    }
    state.calibPausedReason =
      now - state.calibInvalidAt >= faceTrack.eyeClsdHoldMs
        ? "eyes-unstable"
        : "";
    state.calibStable.length = 0;
    return;
  }
  state.calibInvalidAt = null;
  state.calibPausedReason = "";
  // preparing verifies continuous availability and begins
  // sampling only after the stability duration is reached.
  if (state.calibPhase === "preparing") {
    state.calibValidMs += frameMs;
    if (state.calibValidMs >= faceTrack.calibSettleMs) {
      state.calibPhase = "sampling";
      state.calibStableMs = 0;
      state.calibSampleAt = -Infinity;
      state.calibBadAt = null;
      state.calibStable.length = 0;
      state.calibSamples.length = 0;
    }
    return;
  }
  if (!peerClbStbl(state, features, now)) {
    if (state.calibBadAt == null) {
      state.calibBadAt = now;
    }
    state.calibPausedReason =
      now - state.calibBadAt >=
      faceTrack.clbStaWndMs
        ? "gaze-unstable"
        : "";
    return;
  }
  state.calibBadAt = null;
  state.calibStableMs += frameMs;
  if (
    now - state.calibSampleAt >=
    faceTrack.clbSmplIntrMs
  ) {
    state.calibSamples.push({ ...features });
    state.calibSampleAt = now;
  }
  // Both sample count and stability duration must be satisfied.
  if (
    state.calibSamples.length >= faceTrack.clbMinPntSmpls &&
    state.calibStableMs >= faceTrack.calibSampleMs
  ) {
    donePeerSamp(state, now);
  }
}

// Multi-participant calibration advances in queue order,
// with one participant using the calibration target at a time.
// This function was modified with the assistance of ChatGPT.
function updtClbQ(now) {
  for (const state of peerStates) {
    if (
      state.calibPhase === "fading" &&
      state.calibCompletedAt != null &&
      now - state.calibCompletedAt >= faceTrack.calibFadeOutMs
    ) {
      fnshPeerClb(state, now);
    }
  }
  if (
    (!multiTestEnabled &&
      (gazeCalib.active || clbOvrlyAlph(now) > 0)) ||
    peerStates.some(isPeerCalibActive)
  ) {
    return;
  }
  const waiting = peerStates
    .filter(
      (state) =>
        state.calibPhase === "waiting" &&
        isPeerClbVld(state.latestFeatures) &&
        now - state.lastSeenAt <= 250
    )
    .sort((first, second) => first.calibQueuedAt - second.calibQueuedAt);
  const next = waiting[0];
  if (!next) return;
  const target = next.calibTarget || slctClbTgt();
  if (!target) {
    next.calibPausedReason = "waiting-safe-area";
    return;
  }
  beginPeerCalib(next, target, now);
}

// Clear a participant's session, calibration, and temporary visual state.
function resetPeer(state, now) {
  state.visible = false;
  state.calibrated = false;
  state.recalibrating = false;
  state.calibStartedAt = now;
  state.calibPhase = "inactive";
  state.calibSeenAt = null;
  state.calibQueuedAt = null;
  state.calibUpdAt = now;
  state.calibValidMs = 0;
  state.calibStableMs = 0;
  state.calibSampleAt = -Infinity;
  state.calibCompletedAt = null;
  state.clbMssngSnc = null;
  state.calibInvalidAt = null;
  state.calibBadAt = null;
  state.calibPausedReason = "";
  state.calibTarget = null;
  state.calibAnchor = { x: 0.5, y: 0.5 };
  state.calibStable.length = 0;
  state.calibSamples.length = 0;
  state.latestFeatures = null;
  state.neutral = null;
  state.eyes.available = false;
  state.eyes.calibrated = false;
  state.eyes.valid = false;
  state.eyes.state = "unavailable";
  state.eyes.engagementState = "gaze-engagement";
  cnclEyeClose(state.eyes);
  eyeRippleFx.delete(state.id);
  state.faceAssignmentId = 0;
  rstCrsrTrack(state.cursorTracking, "inactive");
  state.cursorTracking.inactiveSince = now;
  state.lastSeenAt = -Infinity;
  state.lastTrace = 0;
  state.traces.length = 0;
}

function updPeeTraLos(state, now, reason) {
  // Another participant's tracking loss first enters a grace period and departure animation;
  // persistent failure releases the slot and calibration state.
  const eyes = state.eyes;
  eyes.available = false;
  eyes.valid = false;
  eyes.validX = false;
  eyes.validY = false;
  eyes.state = reason;
  eyes.engagementState = "gaze-engagement";
  prsrBlnkOnLoss(
    eyes,
    now,
    faceTrack.multiExitMs
  );
  if (!state.calibrated) {
    state.visible = false;
    state.calibPausedReason = reason;
    state.calibStable.length = 0;
    state.calibUpdAt = now;
    if (state.clbMssngSnc == null) {
      state.clbMssngSnc = now;
    }
    if (
      now - state.clbMssngSnc >=
      peerCalibRules.mssngCnclMs
    ) {
      prsrRjnWndw(state.faceAssignmentId, now);
      resetPeer(state, now);
    }
    return;
  }
  crsrTrckLost(
    state.cursorTracking,
    now,
    faceTrack.multiExitMs,
    reason
  );
  state.visible = isCursorVisible(state.cursorTracking);
  if (
    state.cursorTracking.phase === "inactive" &&
    now - state.lastSeenAt >= faceTrack.slotKeepMs
  ) {
    prsrRjnWndw(state.faceAssignmentId, now);
    resetPeer(state, now);
  }
}

// This function was modified with the assistance of ChatGPT.
function updatePeer(state, face, now) {
  if (!face) {
    // Multi-participant slots retain a brief reconnection window.
    updPeeTraLos(state, now, "face-lost");
    return;
  }
  const features = userFaceFetr(face);
  if (!features) {
    updPeeTraLos(state, now, "face-incomplete");
    return;
  }
  state.lastSeenAt = now;
  state.latestFeatures = { ...features };
  state.clbMssngSnc = null;
  if (!state.calibrated) {
    // Confirm a new participant's stable presence before adding them to the calibration queue.
    const featuresValid = isPeerClbVld(features);
    const eyes = state.eyes;
    // Before calibration, expose eye presence and openness while
    // keeping gaze coordinates hidden until the baseline is stable.
    eyes.available = features.hasIris;
    eyes.calibrated = false;
    eyes.valid = false;
    eyes.validX = false;
    eyes.validY = false;
    eyes.leftOpen = features.leftOpen > 0.08;
    eyes.rightOpen = features.rightOpen > 0.08;
    eyes.open = eyes.leftOpen || eyes.rightOpen;
    eyes.state = eyes.open ? "calibrating" : "closing";
    eyes.engagementState = "gaze-engagement";
    eyes.confidence = 0;
    eyes.confidenceX = 0;
    eyes.confidenceY = 0;
    state.visible = false;
    if (state.calibPhase === "inactive") {
      state.calibPhase = "confirming";
      state.calibSeenAt = now;
      state.calibPausedReason = "confirming-presence";
    }
    if (state.calibPhase === "confirming") {
      if (!featuresValid) {
        state.calibSeenAt = now;
        state.calibPausedReason = "eyes-unstable";
      } else if (
        now - state.calibSeenAt >=
        peerCalibRules.prsnCnfrmMs
      ) {
        state.calibPhase = "waiting";
        state.calibQueuedAt = now;
        state.calibPausedReason = "waiting-turn";
      }
    }
    updtPeerClb(state, features, now);
    return;
  }

  const eyes = state.eyes;
  // A calibrated participant's eye state determines whether the
  // cursor is held, tracking recovers, or tracking is treated as lost.
  const closure = clssEyeClose(
    features.leftOpen,
    features.rightOpen,
    state.neutral.leftOpen,
    state.neutral.rightOpen,
    !eyes.leftOpen,
    !eyes.rightOpen,
    features.eyeY,
    state.neutral.eyeY,
    state.calibrated
  );
  const { leftClosed, rightClosed } = closure;
  const leftOpen = !leftClosed;
  const rightOpen = !rightClosed;
  const open = leftOpen || rightOpen;
  eyes.available = features.hasIris;
  eyes.calibrated = state.calibrated;
  eyes.valid = state.calibrated && features.hasIris && open;
  if (open) {
    if (eyes.closedSince != null) {
      fnshEyeClose(eyes, now, state.id, state.gaze);
    }
    updtBlnkOpen(eyes, now);
    eyes.state = now < eyes.blinkUntil ? "blink" : "open";
    eyes.engagementState = "gaze-engagement";
  } else {
    updtEyeClose(eyes, now, state.gaze, state.id);
  }
  eyes.open = open;
  eyes.leftOpen = leftOpen;
  eyes.rightOpen = rightOpen;
  eyes.confidence = eyes.valid ? 1 : 0;
  eyes.confidenceX = eyes.confidence;
  eyes.confidenceY = eyes.confidence;
  eyes.validX = eyes.valid;
  eyes.validY = eyes.valid;

  if (!eyes.valid) {
    // Eye closure holds cursor position; other invalid input enters the tracking-loss fade,
    // distinguishing intentional rest from detection failure.
    if (eyes.state === "closing" || eyes.state === "closed") {
      holdCrsrTrack(state.cursorTracking);
    } else {
      crsrTrckLost(
        state.cursorTracking,
        now,
        faceTrack.multiExitMs,
        "eyes-unstable"
      );
    }
    state.visible = isCursorVisible(state.cursorTracking);
    return;
  }
  cursorTrackOk(
    state.cursorTracking,
    now,
    faceTrack.mltRecvMs
  );
  state.visible = isCursorVisible(state.cursorTracking);
  // Calculate each participant's offset relative to their own neutral pose.
  const positionX =
    deadZone(
      features.positionX - state.neutral.positionX,
      faceTrack.positionDeadX
    ) * faceTrack.positionXGain;
  const positionY =
    deadZone(
      features.positionY - state.neutral.positionY,
      faceTrack.positionDeadY
    ) * faceTrack.positionYGain;
  const rotationX =
    deadZone(
      features.rotationX - state.neutral.rotationX,
      faceTrack.rotationDeadX
    ) * faceTrack.rotationXGain;
  const rotationY =
    deadZone(
      features.rotationY - state.neutral.rotationY,
      faceTrack.rotationDeadY
    ) * faceTrack.rotationYGain;
  const eyeX = clamp(
    deadZone(features.eyeX - state.neutral.eyeX, faceTrack.eyeDeadX) *
      faceTrack.eyeXGain,
    -faceTrack.eyeMaxX,
    faceTrack.eyeMaxX
  );
  const eyeY = clamp(
    deadZone(features.eyeY - state.neutral.eyeY, faceTrack.eyeDeadY) *
      faceTrack.eyeYGain,
    -faceTrack.eyeMaxY,
    faceTrack.eyeMaxY
  );
  // Smooth eye-motion offset first, then combine it with
  // head pose into a target and smooth the cursor position.
  eyes.offsetX = lerp(eyes.offsetX, eyeX, 0.3);
  eyes.offsetY = lerp(eyes.offsetY, eyeY, 0.3);
  const calibAnchor = state.calibAnchor || { x: 0.5, y: 0.5 };
  const normalX =
    calibAnchor.x +
    faceTrack.headXSign * (positionX + rotationX) +
    eyes.offsetX;
  const normalY =
    calibAnchor.y +
    faceTrack.headYSign * (positionY + rotationY) +
    eyes.offsetY;
  const limited = clampGaze(normalX * width, normalY * height);
  state.gaze.targetX = limited.x;
  state.gaze.targetY = limited.y;
  state.gaze.x = lerp(state.gaze.x, state.gaze.targetX, 0.18);
  state.gaze.y = lerp(state.gaze.y, state.gaze.targetY, 0.18);
}

function faceSlotForAssign(assignmentId) {
  if (!assignmentId) return null;
  return faceAssignSlts.find(
    (slot) => slot.assignmentId === assignmentId
  ) || null;
}

function primaryUserFace() {
  return faceSlotForAssign(primarySlotId)?.face || null;
}

function audnPosLbl(state) {
  const normalizedX = (state?.center?.x || 0) / max(1, faceTrack.cameraWidth);
  if (normalizedX < 0.38) return "Left";
  if (normalizedX > 0.62) return "Right";
  return "Center";
}

// Count slots occupied by the primary participant, confirmed companions, and test mode.
function okSeatN() {
  if (multiTestEnabled) {
    return 2 + (peerStates[0].faceAssignmentId ? 1 : 0);
  }
  if (isPointerMode) return 1;
  return (
    (primarySlotId ? 1 : 0) +
    peerStates.filter((state) => state.faceAssignmentId).length
  );
}

// 9. Joining, leaving, and returning are choices made by the audience
function makePrmptPlcm(mode) {
  if (mode === "guidance") {
    return {
      layout: "center",
      panelWidth: min(
        peerCalibRules.panelWidth,
        max(120, width - 32)
      ),
      panelHeight: min(
        peerCalibRules.panelHeight,
        max(80, height - 32)
      ),
      x: width * 0.5,
      y: height * 0.5,
      calibTarget: null,
    };
  }
  return consent.makePrmptPlcm();
}

// Choose a locally safe position when participants are present;
// otherwise place the invitation panel at the center of the canvas.
function makeCnsntPlcm() {
  const local = okSeatN() > 0;
  if (!local) {
    return {
      layout: "center",
      panelWidth: min(
        peerCalibRules.panelWidth,
        max(120, width - 32)
      ),
      panelHeight: min(
        peerCalibRules.panelHeight,
        max(80, height - 32)
      ),
      x: width * 0.5,
      y: height * 0.5,
      calibTarget: null,
    };
  }
  const target = slctClbTgt() || {
    x: width * 0.5,
    y: height * 0.5,
  };
  return {
    layout: "local",
    panelWidth: min(
      peerCalibRules.panelWidth,
      max(120, width - 32)
    ),
    panelHeight: min(
      peerCalibRules.panelHeight,
      max(80, height - 32)
    ),
    x: target.x,
    y: target.y + peerCalibRules.pnlCntrOffstY,
    calibTarget: { x: target.x, y: target.y },
  };
}

// Apply saved layout position and dimensions to the invitation panel.
function updCnsntPlcm() {
  if (!consentPanel || !audiencePrompt) return;
  const placement = audiencePrompt.placement;
  if (!placement) return;
  consentPanel.dataset.layout = placement.layout;
  consentPanel.style.width = `${placement.panelWidth}px`;
  consentPanel.style.height = `${placement.panelHeight}px`;
  consentPanel.style.left = `${placement.x}px`;
  consentPanel.style.top = `${placement.y}px`;
}

function avlbPeerStt() {
  if (!multiModeEnabled && !multiTestEnabled) return null;
  return peerStates.find(
    (state) =>
      (!multiTestEnabled || state.id === 1) &&
      !state.faceAssignmentId &&
      !state.visible &&
      !state.calibrated &&
      state.calibPhase === "inactive"
  ) || null;
}

// The primary slot is assignable only when idle and without a reserved identity.
function isMainSeatRdy() {
  return Boolean(
    !multiTestEnabled &&
      !isPointerMode &&
      !primarySlotId
  );
}

function isJoinSeatAvlb() {
  return Boolean(
    isMainSeatRdy() || avlbPeerStt()
  );
}

// Clear the viewer's rejoin window and expired identity notice.
function clrRjnWndw(audience) {
  if (!audience) return;
  audience.rejoinUntil = -Infinity;
  audience.rjnReqsAt = null;
  audience.rejoinCenter = null;
  audience.rjnPosOk = false;
}

// A temporarily absent participant retains their original slot for a limited window;
// only after timeout may a new identity occupy it.
function prsrRjnWndw(assignmentId, now) {
  const audience = audienceStates.get(assignmentId);
  if (!audience) return;
  const slot = faceSlotForAssign(assignmentId);
  audience.status = "watching";
  audience.rejoinUntil = now + consentRules.rejoinGraceMs;
  audience.rjnReqsAt = null;
  audience.rejoinCenter = slot?.center
    ? { ...slot.center }
    : audience.center
      ? { ...audience.center }
      : null;
  audience.rjnPosOk = Boolean(audience.rejoinCenter);
}

// Rejoining validates spatial proximity as well as the identifier.
function isAudnNearRjn(audience, slot) {
  if (!audience?.rejoinCenter || !slot?.center) return false;
  return (
    Math.hypot(
      slot.center.x - audience.rejoinCenter.x,
      slot.center.y - audience.rejoinCenter.y
    ) <= consentRules.rjnPosRadPx
  );
}

// Invitation candidates must remain present through the minimum stability duration.
function isUserPrsnRdy(audience, now) {
  if (!audience) return false;
  const slot = faceSlotForAssign(audience.assignmentId);
  if (!slot?.center) return false;
  const recentlySeen =
    now - audience.lastSeenAt <= consentRules.rcntPrsnGrcMs;
  const wthnRjnWndw = audience.rejoinUntil >= now;
  if (!recentlySeen && !wthnRjnWndw) return false;
  if (!wthnRjnWndw || !slot.face) return true;
  return isAudnNearRjn(audience, slot);
}

// Check viewer state and continuous-presence conditions
// to determine eligibility for the joining process.
function isVwrJoinElgb(audience, now) {
  return Boolean(
    ["watching", "ready"].includes(audience?.status) &&
      consent.isPrsnElgb(audience, now)
  );
}

// Synchronize the join button's visibility, disabled state,
// and accessibility attributes so interface state matches actual permission to join.
function setJoinAvlb(available) {
  if (!joinButton) return;
  joinButton.hidden = false;
  joinButton.disabled = !available;
  joinButton.dataset.availability = available
    ? "available"
    : "unavailable";
  joinButton.title = available
    ? "Enter or re-enter the ecology"
    : gazeCalib.active || headCenter.calibrating
      ? "Complete gaze calibration first"
      : detectedFaceCount() > 0
        ? "Keep your face visible and steady for a moment"
        : "Move into the camera view to enter";
}

function canRcvrMain() {
  return Boolean(
    !isPointerMode &&
      !audiencePrompt &&
      primarySlotId &&
      primaryCursorTrack.phase === "inactive" &&
      !gazeCalib.active &&
      !headCenter.calibrating &&
      primaryUserFace()
  );
}

// When the primary participant reappears, validate identity first;
// a match reuses the reserved slot and calibration state, while a difference enters the rejoin process.
function rcvrMainUser(now) {
  if (!canRcvrMain()) return false;
  const assignmentId = primarySlotId;
  rstMainClb(assignmentId, now);
  const audience = audienceStates.get(assignmentId);
  if (audience) {
    audience.status = "joining";
    audience.lastSeenAt = now;
    consent.clrRjnWndw(audience);
  }
  startCalib();
  status = "Your gaze has been detected again. Please complete calibration.";
  consent.render();
  updtPtrBttn();
  return true;
}

function isManualJoinActive(now) {
  if (joinRqstUntl < now) {
    joinRqstUntl = -Infinity;
    return false;
  }
  return Number.isFinite(joinRqstUntl);
}

function clrJoinRqst() {
  joinRqstUntl = -Infinity;
}

// When there are no automatic candidates, create a time-limited manual joining window so privacy consent
// remains intentionally triggered by the viewer.
function rqstMnlRjn(now) {
  joinRqstUntl =
    now + faceRcvrRls.mnlJoinWndwMs;
  status = "Looking for your gaze again…";
  qTrnsStts(statusCopy.rejoinScanning, now);
  if (vdTrckEndd()) {
    rstrtCmrCptr();
  } else {
    ensrFaceHlthy();
  }
  void runMnlFaceScan();
  updtPtrBttn();
  return true;
}

// On manual joining completion, verify that the candidate remains present
// before promoting the temporary viewer to an interactive participant.
function doneMnlJoin(now) {
  if (!isManualJoinActive(now)) return false;
  if (gazeCalib.active || peerStates.some(isPeerCalibActive)) {
    return false;
  }
  if (rcvrMainUser(now)) {
    clrJoinRqst();
    return true;
  }
  const candidates = consent.visWatc();
  if (candidates.length === 1) {
    const joined = consent.requestJoin(candidates[0], now);
    if (joined) clrJoinRqst();
    return joined;
  }
  if (candidates.length > 1 && !audiencePrompt) {
    clrJoinRqst();
    return consent.openPrompt("select", null, now);
  }
  return false;
}

// Restore detection state after reconnection timeout; if the invitation has closed,
// return the corresponding viewer to watching state.
function normVwrStt(audience, now) {
  if (!audience) return false;
  const ownsOpenPrompt = audiencePrompt?.assignmentId === audience.assignmentId;
  if (
    audience.status === "rejoin-pending" &&
    audience.rejoinUntil < now
  ) {
    audience.status = "detecting";
    audience.firstSeenAt = now;
    audience.promptedOnce = false;
    consent.clrRjnWndw(audience);
    return true;
  }
  if (
    ["prompting", "slot-offer"].includes(audience.status) &&
    !ownsOpenPrompt
  ) {
    audience.status = "watching";
    return true;
  }
  return false;
}

function enrollViewer(audience, now) {
  // Assign a participant slot only after the viewer confirms.
  const slot = faceSlotForAssign(audience?.assignmentId);
  if (!slot?.face) return false;
  const prfrClbTgt =
    audiencePrompt?.assignmentId === audience.assignmentId
      ? audiencePrompt.placement?.calibTarget || null
      : null;
  if (isMainSeatRdy()) {
    primarySlotId = audience.assignmentId;
    rstMainClb(audience.assignmentId, now);
    consent.clrRjnWndw(audience);
    audience.status = "joining";
    audiencePrompt = null;
    consent.render();
    return true;
  }
  const participant = avlbPeerStt();
  if (!participant) return false;
  const features = userFaceFetr(slot.face);
  resetPeer(participant, now);
  participant.faceAssignmentId = audience.assignmentId;
  participant.calibPhase = "waiting";
  participant.calibSeenAt = now;
  participant.calibQueuedAt = now;
  participant.calibUpdAt = now;
  participant.calibPausedReason = "waiting-turn";
  participant.calibTarget = prfrClbTgt
    ? { ...prfrClbTgt }
    : null;
  participant.lastSeenAt = now;
  participant.latestFeatures = features ? { ...features } : null;
  consent.clrRjnWndw(audience);
  audience.status = "joining";
  audiencePrompt = null;
  consent.render();
  return true;
}

// Close the current invitation and update viewer state as needed.
function clsCnsntPrmpt(nextStatus = null) {
  if (audiencePrompt?.assignmentId && nextStatus) {
    const audience = audienceStates.get(audiencePrompt.assignmentId);
    if (audience) audience.status = nextStatus;
  }
  audiencePrompt = null;
  consent.render();
}

// The invitation panel locks its candidate and mode when opened.
function openCnsntPrmpt(mode, audience, now) {
  if (!audience && !["select", "guidance"].includes(mode)) return false;
  if (audience) {
    audience.promptedOnce = true;
    audience.status = mode === "slot" ? "slot-offer" : "prompting";
  }
  audiencePrompt = {
    mode,
    assignmentId: audience?.assignmentId || 0,
    openedAt: now,
    placement: makePrmptPlcm(mode),
  };
  consent.render();
  return true;
}

function openCalibGuide(now) {
  return consent.openPrompt("guidance", null, now);
}

// Invitation timeout closes temporary requests awaiting confirmation;
// established participation relationships use an independent lifecycle.
function clsTmdOutPrmpt(now) {
  const prompt = audiencePrompt;
  if (!prompt) return false;
  const timeoutMs = prompt.mode === "guidance"
    ? consentRules.gudnPrmptTmtMs
    : consentRules.prmptTmtMs;
  const timeoutElapsed =
    now - prompt.openedAt >= consentRules.transitionMs + timeoutMs;
  const hvrPrvnCls =
    prompt.mode !== "guidance" &&
    Boolean(consentPanel?.matches(":hover"));
  if (!timeoutElapsed || hvrPrvnCls) return false;
  consent.closePrompt(prompt.mode === "select" ? null : "watching");
  return true;
}

// A join request rechecks that the viewer remains available and the slot remains idle.
function rqstVwrJoin(audience, now) {
  if (
    !["watching", "ready", "prompting", "slot-offer"].includes(audience?.status) ||
    !consent.isPrsnElgb(audience, now)
  ) {
    return false;
  }
  if (isJoinSeatAvlb()) {
    const slot = faceSlotForAssign(audience.assignmentId);
    if (!slot?.face && audience.rejoinUntil >= now) {
      audience.status = "rejoin-pending";
      audience.rjnReqsAt = now;
      consent.render();
      return true;
    }
    return consent.enroll(audience, now);
  }
  return consent.openPrompt("full", audience, now);
}

// This function was modified with the assistance of ChatGPT.
function updtCnsntFlow(now) {
  // The viewer-joining process runs in camera-gaze mode.
  if (skipCam || isPointerMode) {
    if (audiencePrompt) consent.closePrompt();
    setJoinAvlb(false);
    cnsntRndrKey = "";
    return;
  }
  if (audiencePrompt?.mode === "guidance") {
    consent.clsTmdOutPrmpt(now);
  }
    // Single-participant mode begins with the primary slot; other invitations open afterward,
    // allowing initial calibration to focus on one participant.
  const isSnglModeLckd = Boolean(
    !multiModeEnabled &&
      !multiTestEnabled &&
      !isMainSeatRdy()
  );
  if (isSnglModeLckd) {
    if (audiencePrompt && audiencePrompt.mode !== "guidance") {
      consent.closePrompt("watching");
    }
    setJoinAvlb(false);
    consent.render();
    return;
  }
  // Active assignments represent temporary slots occupied within
  // the current page and are valid only for the current page session.
  const actvAssg = new Set(
    peerStates
      .map((state) => state.faceAssignmentId)
      .filter(Boolean)
  );
  if (primarySlotId) {
    actvAssg.add(primarySlotId);
  }
  for (let slotIndex = 0; slotIndex < faceAssignSlts.length; slotIndex++) {
    const slot = faceAssignSlts[slotIndex];
    if (!slot.face || !slot.assignmentId || actvAssg.has(slot.assignmentId)) {
      continue;
    }
    let audience = audienceStates.get(slot.assignmentId);
    if (!audience) {
      audience = {
        assignmentId: slot.assignmentId,
        status: "detecting",
        firstSeenAt: now,
        lastSeenAt: now,
        promptedOnce: false,
        center: slot.center ? { ...slot.center } : null,
        rejoinUntil: -Infinity,
        rjnReqsAt: null,
        rejoinCenter: null,
        rjnPosOk: false,
      };
      audienceStates.set(slot.assignmentId, audience);
    }
    // The reconnection window accepts a face near its original position;
    // excessive spatial difference requires confirmation as a new viewer.
    if (
      audience.rejoinUntil >= now &&
      audience.rejoinCenter &&
      !isAudnNearRjn(audience, slot)
    ) {
      audience.status = "detecting";
      audience.firstSeenAt = now;
      audience.promptedOnce = false;
      consent.clrRjnWndw(audience);
    } else if (audience.rejoinUntil >= now) {
      audience.rjnPosOk = true;
    }
    audience.lastSeenAt = now;
    audience.center = slot.center ? { ...slot.center } : audience.center;
  }

  // Normalize detection states individually and clear a viewer only
  // after the absence limit is exceeded outside the reconnection window.
  for (const [assignmentId, audience] of audienceStates) {
    if (actvAssg.has(assignmentId)) {
      audience.status = "joining";
      continue;
    }
    consent.normalizeState(audience, now);
    const retnForRjn = audience.rejoinUntil >= now;
    if (
      now - audience.lastSeenAt >= consentRules.missingForgetMs &&
      !retnForRjn
    ) {
      if (audiencePrompt?.assignmentId === assignmentId) audiencePrompt = null;
      audienceStates.delete(assignmentId);
      continue;
    }
    if (
      audience.status === "detecting" &&
      now - audience.firstSeenAt >= consentRules.stblDetectMs
    ) {
      audience.status = "ready";
    } else if (audience.status === "joining") {
      audience.status = "watching";
    }
  }

  // Multiple reconnection requests prioritize the earliest request;
  // insufficient slots produce an explicit notice.
  const pendingRejoin = [...audienceStates.values()]
    .filter(
      (audience) =>
        audience.status === "rejoin-pending" &&
        audience.rejoinUntil >= now &&
        audience.rjnPosOk &&
        Boolean(faceSlotForAssign(audience.assignmentId)?.face)
    )
    .sort(
      (first, second) =>
        (first.rjnReqsAt || 0) - (second.rjnReqsAt || 0)
    )[0];
  if (pendingRejoin) {
    pendingRejoin.status = "watching";
    if (isJoinSeatAvlb()) {
      consent.enroll(pendingRejoin, now);
    } else if (!audiencePrompt) {
      consent.openPrompt("full", pendingRejoin, now);
    }
  }

  doneMnlJoin(now);

  // Close an invitation when its target becomes invalid; otherwise check for timeout.
  if (audiencePrompt) {
    const promptAudience = audiencePrompt.assignmentId
      ? audienceStates.get(audiencePrompt.assignmentId)
      : null;
    const promptInvalid =
      audiencePrompt.assignmentId &&
      !consent.isPrsnElgb(promptAudience, now);
    if (promptInvalid) {
      consent.closePrompt("watching");
    } else {
      consent.clsTmdOutPrmpt(now);
    }
  }

  // Empty slots serve queued viewers first, then invite
  // viewers who have newly established stable presence.
  if (!audiencePrompt && isJoinSeatAvlb()) {
    const queued = [...audienceStates.values()]
      .filter(
        (audience) =>
          audience.status === "queued" &&
          consent.isPrsnElgb(audience, now)
      )
      .sort((first, second) => first.queuedAt - second.queuedAt)[0];
    if (queued) consent.openPrompt("slot", queued, now);
  }
  if (!audiencePrompt) {
    const ready = [...audienceStates.values()]
      .filter(
        (audience) =>
          audience.status === "ready" &&
          !audience.promptedOnce &&
          consent.isPrsnElgb(audience, now)
      )
      .sort((first, second) => first.firstSeenAt - second.firstSeenAt)[0];
    if (ready) consent.openPrompt("initial", ready, now);
  }
  consent.render();
}

// Each frame first synchronizes detection and presence, then advances calibration and departure so all
// multi-participant subsystems read the same moment's snapshot.
function updatePeers(now) {
  consent.update(now);
  for (let index = 0; index < peerStates.length; index++) {
    const state = peerStates[index];
    if (multiTestEnabled) {
      if (skipCam || index > 0) continue;
      const slot = faceSlotForAssign(state.faceAssignmentId);
      updatePeer(state, slot?.face || null, now);
      continue;
    }
    const slot = faceSlotForAssign(state.faceAssignmentId);
    const face = isPointerMode ? null : slot?.face || null;
    updatePeer(state, face, now);
  }
  updtClbQ(now);
}

// 10. Accompany the first participant in establishing a stable, understandable gaze mapping
function startCalib() {
  const now = millis();
  clrPtrFallback();
  headCenter.ready = false;
  headCenter.calibrating = true;
  headCenter.startTime = now;
  headCenter.samples = [];
  gazeCalib.active = true;
  gazeCalib.pointIndex = 0;
  gazeCalib.pointStartedAt = now;
  gazeCalib.pointValidMs = 0;
  gazeCalib.pointStableMs = 0;
  gazeCalib.lastUpdateAt = now;
  gazeCalib.lastSampleAt = -Infinity;
  gazeCalib.pointSamples = [];
  gazeCalib.stableSamples = [];
  gazeCalib.trnnSmpls = [];
  gazeCalib.rejected = false;
  gazeCalib.failureReason = "";
  gazeCalib.quality = "calibrating";
  gaze.x = width / 2;
  gaze.y = height / 2;
  gaze.targetX = width / 2;
  gaze.targetY = height / 2;
  smoothGaze.ready = true;
  smoothGaze.x = width / 2;
  smoothGaze.y = height / 2;
  quietFrames = 0;
  traces = [];
  eyeInput.calibrated = false;
  eyeInput.valid = false;
  eyeInput.validX = false;
  eyeInput.validY = false;
  eyeInput.state = eyeInput.available ? "calibrating" : "unavailable";
  eyeInput.confidence = 0;
  eyeInput.confidenceX = 0;
  eyeInput.confidenceY = 0;
  eyeInput.offsetX = 0;
  eyeInput.offsetY = 0;
  cnclEyeClose(eyeInput);
  eyeInput.blinkUntil = 0;
  status = "Head steady, let your gaze rest here.";
}

// Use current stable samples to establish head and eye baselines for the neutral pose.
function captureNeutral() {
  const baslSmpls = gazeCalib.trnnSmpls;
  if (!baslSmpls.length) return false;
  headCenter.positionX = medianSample(baslSmpls, "positionX");
  headCenter.positionY = medianSample(baslSmpls, "positionY");
  headCenter.rotationX = medianSample(baslSmpls, "rotationX");
  headCenter.rotationY = medianSample(baslSmpls, "rotationY");
  headCenter.roll = medianSample(baslSmpls, "roll");
  headCenter.faceScale = medianSample(baslSmpls, "faceScale");
  eyeInput.neutralX = medianSample(baslSmpls, "eyeX");
  eyeInput.neutralY = medianSample(baslSmpls, "eyeY");
  eyeInput.ntrlLeftOpen = Math.max(
    0.08,
    medianSample(baslSmpls, "leftOpen")
  );
  eyeInput.ntrlRghtOpen = Math.max(
    0.08,
    medianSample(baslSmpls, "rightOpen")
  );
  return true;
}

function finishCalib(now) {
  // First establish the neutral baseline from samples; on failure,
  // enter the unified completion and pointer-fallback path directly.
  if (!captureNeutral()) {
    rejectCalib("The eye and head baseline could not be established", now);
    return;
  }
  gazeCalib.active = false;
  gazeCalib.rejected = false;
  gazeCalib.failureReason = "";
  gazeCalib.quality = "ready";
  gazeCalib.lastCompletedAt = now;
  headCenter.calibrating = false;
  headCenter.ready = true;
  headCenter.samples = [];
  eyeInput.calibrated = true;
  eyeInput.state = "open";
  eyeInput.offsetX = 0;
  eyeInput.offsetY = 0;
  const calbCntrX = width * 0.5;
  const calbCntrY = height * 0.5;
  // On completion, reset both current values and filters to the center.
  gaze.x = calbCntrX;
  gaze.y = calbCntrY;
  gaze.targetX = calbCntrX;
  gaze.targetY = calbCntrY;
  smoothGaze.ready = true;
  smoothGaze.x = gaze.x;
  smoothGaze.y = gaze.y;
  status = "Eye + head calibration is complete.";
  clrHelErrStt();
  qTrnsStts(statusCopy.calibComplete, now);
  openCalibGuide(now);
  updtPtrBttn();
  window.SoundApp?.userJnd?.({
    participantId: 0,
    assignmentId:
      primarySlotId ||
      primaryFaceAssignId ||
      "primary",
    participantCount: jndSndN(),
    x: calibEntryX(gazeCalib.trnnSmpls, gaze.x),
    stability: clbSndStable(
      gazeCalib.trnnSmpls,
      (sample) => sample.pose
    ),
    inputMode: "eye-head",
    priority: 2,
  });
}

// Calibration failure retains the participant slot and records a recoverable reason.
function rejectCalib(reason, now) {
  gazeCalib.active = false;
  gazeCalib.rejected = true;
  gazeCalib.failureReason = reason;
  gazeCalib.quality = "rejected";
  gazeCalib.lastCompletedAt = now;
  headCenter.ready = false;
  headCenter.calibrating = false;
  eyeInput.calibrated = false;
  holdErrrStts(
    statusCopy.calibError,
    statusCopy.clbErrrActn
  );
  swtcToPtrFal(`${reason}. Input is unavailable`);
}

// At the end of one calibration point, save valid samples before
// deciding whether to advance or complete the full baseline.
function doneClbPnt(now) {
  gazeCalib.trnnSmpls.push(
    ...gazeCalib.pointSamples.map((sample) => ({
      ...sample,
      pointIndex: gazeCalib.pointIndex,
    }))
  );
  finishCalib(now);
}

// Determine stability from both sample center and dispersion.
function clbSmplStbl(sample, now) {
  gazeCalib.stableSamples.push({
    eyeX: sample.eyeX,
    eyeY: sample.eyeY,
    pose: sample.pose.slice(),
    at: now,
  });
  gazeCalib.stableSamples =
    gazeCalib.stableSamples.filter(
      (entry) => now - entry.at <= faceTrack.clbStaWndMs
    );
  const samples = gazeCalib.stableSamples;
  if (samples.length < faceTrack.clbStaMinSmp) {
    return false;
  }
  const eyeX = medianSample(samples, "eyeX");
  const eyeY = medianSample(samples, "eyeY");
  if (
    medianAbsDev(samples, "eyeX", eyeX) >
      faceTrack.clbStblEyeMadX ||
    medianAbsDev(samples, "eyeY", eyeY) >
      faceTrack.clbStblEyeMadY
  ) {
    return false;
  }
  return sample.pose.every((value, index) => {
    const poseValues = samples.map((entry) => ({ value: entry.pose[index] }));
    const center = medianSample(poseValues, "value");
    return medianAbsDev(poseValues, "value", center) <=
      faceTrack.stablePoseMad[index];
  });
}

// Orchestrate the primary participant's complete state machine from
// calibration guidance through stable sampling to result confirmation.
function updateCalib(sample, now) {
  if (!gazeCalib.active || !headCenter.calibrating) return;
  const label = "Baseline calibration";
  const sampleValid = Boolean(
    eyeInput.available &&
    eyeInput.valid &&
    eyeInput.leftOpen &&
    eyeInput.rightOpen &&
    Number.isFinite(sample.eyeX) &&
    Number.isFinite(sample.eyeY) &&
    sample.pose.every(Number.isFinite)
  );
  const frameMs = clamp(now - gazeCalib.lastUpdateAt, 0, 100);
  gazeCalib.lastUpdateAt = now;
  // Accumulate valid samples during waiting and sampling time.
  if (!sampleValid) {
    gazeCalib.stableSamples = [];
    status = `${label}: Gaze input is paused. Open your eyes and continue looking at the rounded rectangle.`;
    return;
  }

  gazeCalib.pointValidMs += frameMs;
  if (gazeCalib.pointValidMs < faceTrack.calibSettleMs) {
    status = `${label}: Keep looking at the target.`;
    return;
  }
  // Stability failure pauses the current point while preserving completed calibration stages.
  if (!clbSmplStbl(sample, now)) {
    status = `${label}: Look steadily at the dot and keep your head still.`;
    return;
  }
  gazeCalib.pointStableMs += frameMs;
  if (
    now - gazeCalib.lastSampleAt >=
    faceTrack.clbSmplIntrMs
  ) {
    gazeCalib.pointSamples.push({ ...sample });
    gazeCalib.lastSampleAt = now;
  }
  const enoughSamples =
    gazeCalib.pointSamples.length >=
    faceTrack.clbMinPntSmpls;
  if (
    enoughSamples &&
    gazeCalib.pointStableMs >= faceTrack.calibSampleMs
  ) {
    doneClbPnt(now);
    return;
  }
  status = `${label}: Collecting stable gaze samples.`;
}

function medianSample(samples, property) {
  const values = samples
    .map((sample) => sample[property])
    .filter(Number.isFinite)
    .sort((first, second) => first - second);
  if (!values.length) return 0;
  const middle = Math.floor(values.length * 0.5);
  return values.length % 2
    ? values[middle]
    : (values[middle - 1] + values[middle]) * 0.5;
}

function deadZone(value, size) {
  if (abs(value) < size) return 0;
  return value > 0 ? value - size : value + size;
}

// A small dead zone reduces jitter while keeping gaze response timely.
function setTarget(x, y) {
  const limited = clampGaze(x, y);
  if (!smoothGaze.ready) {
    smoothGaze.ready = true;
    smoothGaze.x = limited.x;
    smoothGaze.y = limited.y;
    gaze.targetX = limited.x;
    gaze.targetY = limited.y;
    return;
  }

  const dx = limited.x - smoothGaze.x;
  const dy = limited.y - smoothGaze.y;
  const distance = sqrt(dx * dx + dy * dy);
  if (distance <= faceTrack.gazeHoldRadius) {
    quietFrames++;
    gaze.targetX = smoothGaze.x;
    gaze.targetY = smoothGaze.y;
    return;
  }

  quietFrames = 0;
  const activeDistance = distance - faceTrack.gazeHoldRadius;
  const adjustedX = smoothGaze.x + (dx / distance) * activeDistance;
  const adjustedY = smoothGaze.y + (dy / distance) * activeDistance;
  const response = constrain(
    activeDistance /
      (faceTrack.gazeRadius - faceTrack.gazeHoldRadius),
    0,
    1
  );
  const strength = lerp(0.032, 0.48, pow(response, 1.35));
  smoothGaze.x = lerp(smoothGaze.x, adjustedX, strength);
  smoothGaze.y = lerp(smoothGaze.y, adjustedY, strength);
  gaze.targetX = smoothGaze.x;
  gaze.targetY = smoothGaze.y;
}

// 11. Smooth detection jitter so the cursor follows gaze with a gentle rhythm
function updateGaze() {
  if (!isFinite(gaze.targetX)) gaze.targetX = width / 2;
  if (!isFinite(gaze.targetY)) gaze.targetY = height / 2;

  const previousX = gaze.x;
  const previousY = gaze.y;

  const dx = gaze.targetX - gaze.x;
  const dy = gaze.targetY - gaze.y;
  const distance = sqrt(dx * dx + dy * dy);
  // Snap directly to the target at rest to eliminate subpixel jitter;
  // during movement, increase responsiveness with distance.
  if (distance < 0.65 || (quietFrames > 4 && distance < 1.5)) {
    gaze.x = gaze.targetX;
    gaze.y = gaze.targetY;
  } else {
    let smooth;
    // Maintain slower, steadier smoothing during calibration.
    if (headCenter.calibrating) smooth = 0.07;
    else if (distance < 4) smooth = 0.032;
    else if (distance < 20) smooth = 0.07;
    else if (distance < 80) smooth = 0.13;
    else smooth = 0.21;
    gaze.x = lerp(gaze.x, gaze.targetX, smooth);
    gaze.y = lerp(gaze.y, gaze.targetY, smooth);
  }

  // Tilt and path use the clipped gaze position; the interaction
  // layer calculates assisted hit coordinates separately.
  const limited = clampGaze(gaze.x, gaze.y);
  gaze.x = limited.x;
  gaze.y = limited.y;

  const moveX = gaze.x - previousX;
  const moveY = gaze.y - previousY;
  const moveSpeed = sqrt(moveX * moveX + moveY * moveY);
  cursorMove.targetTilt =
    moveSpeed > 0.05
      ? clamp(
          (moveX / moveSpeed) * 0.12 + (moveY / moveSpeed) * 0.07,
          -0.17,
          0.17
        )
      : 0;
  cursorMove.tilt = lerp(cursorMove.tilt, cursorMove.targetTilt, 0.18);
  cursorMove.energy = lerp(cursorMove.energy, clamp(moveSpeed / 18, 0, 1), 0.2);
  addTrace();
}

function addTrace() {
  // Sample the primary path by minimum distance and time interval.
  const hasController =
    multiTestEnabled ||
    isPointerMode ||
    Boolean(primaryUserFace());
  if (!hasController || headCenter.calibrating) {
    trimTraces();
    return;
  }

  const now = millis();
  if (now - lastTrace >= faceTrack.traceInterval) {
    const lastPoint = traces[traces.length - 1];
    if (!lastPoint) {
      traces.push({ x: gaze.x, y: gaze.y, born: now });
    } else {
      const dx = gaze.x - lastPoint.x;
      const dy = gaze.y - lastPoint.y;
      const distance = sqrt(dx * dx + dy * dy);
      if (distance >= faceTrack.traceMinMove) {
        const steps = constrain(
          ceil(distance / faceTrack.traceSpacing),
          1,
          12
        );
        for (let step = 1; step <= steps; step++) {
          const amount = step / steps;
          traces.push({
            x: lerp(lastPoint.x, gaze.x, amount),
            y: lerp(lastPoint.y, gaze.y, amount),
            born: now,
          });
        }
      }
    }
    lastTrace = now;
  }

  trimTraces();
  if (traces.length > faceTrack.traceMax) {
    traces.splice(0, traces.length - faceTrack.traceMax);
  }
}

function trimTraces() {
  traces = traces.filter(
    (point) => millis() - point.born < faceTrack.traceLife
  );
}

function updtUserTrc(participant, active, now) {
  // Each participant has an independent path and fade time; after deactivation,
  // retain a short trail before releasing old points.
  const userTrcs = participant.traces;
  if (!active) {
    for (let index = userTrcs.length - 1; index >= 0; index--) {
      if (now - userTrcs[index].born >= faceTrack.traceLife) {
        userTrcs.splice(index, 1);
      }
    }
    return;
  }

  if (now - participant.lastTrace >= faceTrack.traceInterval) {
    const lastPoint = userTrcs[userTrcs.length - 1];
    if (!lastPoint) {
      userTrcs.push({
        x: participant.gaze.x,
        y: participant.gaze.y,
        born: now,
      });
    } else {
      const dx = participant.gaze.x - lastPoint.x;
      const dy = participant.gaze.y - lastPoint.y;
      const distance = sqrt(dx * dx + dy * dy);
      if (distance >= faceTrack.traceMinMove) {
        const steps = constrain(
          ceil(distance / faceTrack.traceSpacing),
          1,
          12
        );
        for (let step = 1; step <= steps; step++) {
          const amount = step / steps;
          userTrcs.push({
            x: lerp(lastPoint.x, participant.gaze.x, amount),
            y: lerp(lastPoint.y, participant.gaze.y, amount),
            born: now,
          });
        }
      }
    }
    participant.lastTrace = now;
  }

  for (let index = userTrcs.length - 1; index >= 0; index--) {
    if (now - userTrcs[index].born >= faceTrack.traceLife) {
      userTrcs.splice(index, 1);
    }
  }
  if (userTrcs.length > faceTrack.traceMax) {
    userTrcs.splice(0, userTrcs.length - faceTrack.traceMax);
  }
}

// Sample and decay each participant's path independently.
function updtPeerTrcs(now) {
  if (multiTestEnabled) {
    if (skipCam) {
      updtUserTrc(testPeerStates[0], true, now);
    } else {
      const participant = peerStates[0];
      updtUserTrc(
        participant,
        participant.visible &&
          participant.eyes.valid &&
          participant.cursorTracking.phase === "tracking",
        now
      );
    }
    updtUserTrc(testPeerStates[1], true, now);
    return;
  }
  if (isPointerMode) return;
  for (const participant of peerStates) {
    updtUserTrc(
      participant,
      participant.visible &&
        participant.eyes.valid &&
        participant.cursorTracking.phase === "tracking",
      now
    );
  }
}

// Generate stable perturbation from a path point and salt,
// preserving the same texture when the path is redrawn.
function traceRand(point, salt) {
  const value =
    Math.sin(
      point.x * 12.9898 +
        point.y * 78.233 +
        point.born * 0.001 +
        salt * 37.719
    ) * 43758.5453;
  return value - Math.floor(value);
}

// Paired ripples share a center while offsetting scale and opacity,
// expressing the spread of gaze with fewer primitives.
function drawGazRppPai({
  x,
  y,
  progress,
  minimumRadius,
  maximumRadius,
  baseAlpha,
  sizeScale = 1,
  lineWidth = faceTrack.rpplLineWdth,
  innerDelay = 0.32,
  innrRadScl = 0.7,
  innrAlphScl = 0.44,
}) {
  const easedProgress = 1 - pow(1 - progress, 2);
  const radius =
    lerp(minimumRadius, maximumRadius, easedProgress) * sizeScale;
  const alpha = pow(1 - progress, 1.65) * baseAlpha;

  drawingContext.lineWidth = lineWidth;
  drawingContext.beginPath();
  drawingContext.arc(x, y, radius, 0, Math.PI * 2);
  drawingContext.strokeStyle = `rgba(${faceTrack.gazeColor[0]},${faceTrack.gazeColor[1]},${faceTrack.gazeColor[2]},${alpha})`;
  drawingContext.stroke();

  if (progress <= innerDelay) return;
  const innerProgress = (progress - innerDelay) / (1 - innerDelay);
  const innerRadius =
    lerp(
      minimumRadius,
      maximumRadius * innrRadScl,
      1 - pow(1 - innerProgress, 2)
    ) * sizeScale;
  const innerAlpha =
    pow(1 - innerProgress, 1.8) * baseAlpha * innrAlphScl;
  drawingContext.beginPath();
  drawingContext.arc(x, y, innerRadius, 0, Math.PI * 2);
  drawingContext.strokeStyle = `rgba(${faceTrack.gazeColor[0]},${faceTrack.gazeColor[1]},${faceTrack.gazeColor[2]},${innerAlpha})`;
  drawingContext.stroke();
}

// Decay path points by age and limit the number drawn.
function drawTrcPnts(tracePoints) {
  if (tracePoints.length === 0) return;
  const now = millis();
  drawingContext.save();
  const gazeColor = faceTrack.gazeColor;
  const rippleAlpha = currentRippleAlpha();

  for (const point of tracePoints) {
    const speedScale = lerp(1, 1.18, traceRand(point, 0));
    const sizeScale = lerp(0.88, 1.16, traceRand(point, 1));
    const alphaScale = lerp(0.78, 1.18, traceRand(point, 2));
    const offsetX = lerp(-1.6, 1.6, traceRand(point, 3));
    const offsetY = lerp(-1.6, 1.6, traceRand(point, 4));
    const progress = constrain(
      ((now - point.born) / faceTrack.traceLife) * speedScale,
      0,
      1
    );
    const innerDelay = lerp(0.25, 0.4, traceRand(point, 6));
    drawGazRppPai({
      x: point.x + offsetX,
      y: point.y + offsetY,
      progress,
      minimumRadius: faceTrack.rpplMinRad,
      maximumRadius: faceTrack.rpplMaxRad,
      baseAlpha: rippleAlpha * alphaScale,
      sizeScale,
      lineWidth:
        faceTrack.rpplLineWdth *
        lerp(0.88, 1.12, traceRand(point, 5)),
      innerDelay,
      innrRadScl: lerp(0.62, 0.78, traceRand(point, 7)),
      innrAlphScl: lerp(0.35, 0.52, traceRand(point, 8)),
    });
  }
  drawingContext.restore();
}

function drawTrace() {
  drawTrcPnts(traces);
}

// Draw each companion's independent path in turn.
function drawPeerTraces() {
  const participants = multiTestEnabled
    ? skipCam
      ? testPeerStates
      : [peerStates[0], testPeerStates[1]]
    : isPointerMode
      ? []
      : peerStates;
  for (const participant of participants) {
    drawTrcPnts(participant.traces);
  }
}

// Store raw gaze and assisted logical gaze separately.
function setIxVisAssist(participantId, assist) {
  const state = aimStates[participantId];
  if (!state) return;
  const active = Boolean(
    assist?.active &&
      assist.rawGaze &&
      assist.logicalGaze &&
      Number.isFinite(assist.rawGaze.x) &&
      Number.isFinite(assist.rawGaze.y) &&
      Number.isFinite(assist.logicalGaze.x) &&
      Number.isFinite(assist.logicalGaze.y)
  );
  state.active = active;
  state.prdtAccm = Boolean(
    active &&
      assist.target?.type === "Predator" &&
      assist.target.cptrProg > 0 &&
      !assist.target.captureDone
  );
  state.rawGaze = active ? { ...assist.rawGaze } : null;
  state.logicalGaze = active ? { ...assist.logicalGaze } : null;
}

function rslvCrsrPos(participantId, rawGaze) {
  // Smooth the display offset between raw and logical gaze and limit its distance.
  const state = aimStates[participantId];
  if (!state || !rawGaze) return rawGaze;
  let desiredX = 0;
  let desiredY = 0;
  if (state.active && state.rawGaze && state.logicalGaze) {
    const strength = state.prdtAccm
      ? aimCfg.predAccmPow
      : aimCfg.strength;
    const maximumOffset = state.prdtAccm
      ? aimCfg.predAccMaxOff
      : aimCfg.maximumOffset;
    desiredX =
      (state.logicalGaze.x - state.rawGaze.x) *
      strength;
    desiredY =
      (state.logicalGaze.y - state.rawGaze.y) *
      strength;
    const distance = Math.hypot(desiredX, desiredY);
    if (distance > maximumOffset) {
      const scale = maximumOffset / distance;
      desiredX *= scale;
      desiredY *= scale;
    }
  }
  const baseEase = state.active
    ? aimCfg.engageEase
    : aimCfg.releaseEase;
  const ease = 1 - Math.pow(1 - baseEase, Math.max(0.1, gazeFrame.dt));
  state.offsetX = lerp(state.offsetX, desiredX, ease);
  state.offsetY = lerp(state.offsetY, desiredY, ease);
  if (!state.active && Math.hypot(state.offsetX, state.offsetY) < 0.02) {
    state.offsetX = 0;
    state.offsetY = 0;
  }
  return visCrsrPos(participantId, rawGaze);
}

// Add the display offset to the raw gaze position to obtain visible cursor coordinates.
function visCrsrPos(participantId, rawGaze) {
  const state = aimStates[participantId];
  if (!state || !rawGaze) return rawGaze;
  return {
    x: rawGaze.x + state.offsetX,
    y: rawGaze.y + state.offsetY,
  };
}

function cursorExitEase(start, end, progress) {
  return num.smoothstep01(
    (progress - start) / max(0.001, end - start)
  );
}

// Departure visuals derive from the last position, stage, and elapsed time;
// the input-update pipeline maintains tracking data.
function crsrExitVisStt(tracking) {
  if (tracking?.phase !== "exiting") {
    return {
      active: false,
      progress: 0,
      horizScl: 1,
      verticalScale: 1,
      bracketAlpha: 1,
    };
  }
  const startAlpha = max(0.001, tracking.lossStartAlpha || 1);
  const progress = clamp(1 - tracking.alpha / startAlpha, 0, 1);
  const inward = cursorExitEase(0.03, 0.54, progress);
  const collapse = cursorExitEase(0.3, 0.66, progress);
  return {
    active: true,
    progress,
    horizScl: lerp(1, 0.1, inward),
    verticalScale: lerp(1, 0.1, collapse),
    bracketAlpha: 1 - cursorExitEase(0.48, 0.68, progress),
  };
}

function drawCursorExit(position, tracking, alphaScale = 1) {
  if (tracking?.phase !== "exiting" || !position) return;
  const exitVisual = crsrExitVisStt(tracking);
  const pointIn = cursorExitEase(0.42, 0.68, exitVisual.progress);
  const sharedFade = 1 - cursorExitEase(0.9, 1, exitVisual.progress);
  const pntVis = pointIn * sharedFade * alphaScale;
  if (pntVis <= 0) return;
  const rippleProgress = cursorExitEase(0.54, 1, exitVisual.progress);
  const rpplVis =
    cursorExitEase(0.54, 0.66, exitVisual.progress) *
    sharedFade *
    alphaScale;
  const gazeColor = faceTrack.gazeColor;

  drawingContext.save();
  drawGazRppPai({
    x: position.x,
    y: position.y,
    progress: rippleProgress,
    minimumRadius: 8,
    maximumRadius: 180,
    baseAlpha: currentRippleAlpha() * 0.47 * rpplVis,
    lineWidth: faceTrack.rpplLineWdth,
    innerDelay: 0.32,
    innrRadScl: 0.7,
    innrAlphScl: 0.44,
  });
  drawingContext.restore();

  push();
  translate(position.x, position.y);
  noStroke();
  drawingContext.shadowColor = `rgba(${gazeColor[0]},${gazeColor[1]},${gazeColor[2]},${0.5 * pntVis})`;
  drawingContext.shadowBlur = 7;
  fill(
    gazeColor[0],
    gazeColor[1],
    gazeColor[2],
    230 * pntVis
  );
  circle(0, 0, lerp(1.8, 4.2, pointIn));
  pop();
}

// The departure label follows the last trusted position and fades with the cursor,
// explaining the temporarily retained state.
function drawCrsExiLbl(position, tracking, alphaScale = 1) {
  if (tracking?.phase !== "exiting" || !position) return;
  const gazeColor = faceTrack.gazeColor;
  push();
  noStroke();
  drawingContext.shadowColor = "rgba(0,0,0,0)";
  drawingContext.shadowBlur = 0;
  fill(
    gazeColor[0],
    gazeColor[1],
    gazeColor[2],
    220 * tracking.alpha * alphaScale
  );
  textFont("Arial");
  textSize(12);
  textStyle(NORMAL);
  textAlign(CENTER, TOP);
  text("Attention drifts away.", position.x, position.y + 20);
  pop();
}

// Return a stable cursor form for each participant.
function userCursorShape(participantId) {
  const index = clamp(
    Math.trunc(Number(participantId) || 0),
    0,
    userCrsrShps.length - 1
  );
  return userCrsrShps[index];
}

// The eye-opening ripple uses a finite lifecycle and
// eased radius to provide brief feedback when eyes reopen.
function drawEyeRipple(now = gazeFrame.now || 0) {
  if (!eyeRippleFx.size) return;
  drawingContext.save();
  for (const [participantId, effect] of eyeRippleFx) {
    const progress = clamp(
      (now - effect.startedAt) / faceTrack.eyeRippleMs,
      0,
      1
    );
    if (progress >= 1) {
      eyeRippleFx.delete(participantId);
      continue;
    }
    drawGazRppPai({
      x: effect.x,
      y: effect.y,
      progress,
      minimumRadius: faceTrack.eyeRpnRppMinRa,
      maximumRadius: faceTrack.eyeRpnRppMaxRa,
      baseAlpha: currentRippleAlpha() * faceTrack.eyeRpnRpplAlph,
      lineWidth: faceTrack.rpplLineWdth * 1.2,
      innerDelay: 0.28,
      innrRadScl: 0.72,
      innrAlphScl: 0.58,
    });
  }
  drawingContext.restore();
}

// Expand a Predator ripple from its recorded position, growing and fading with elapsed time.
function drawPrdtRppl(now = gazeFrame.now || 0) {
  if (!predatorRipples.size) return;
  drawingContext.save();
  for (const [id, effect] of predatorRipples) {
    const progress = clamp(
      (now - effect.startedAt) /
        faceTrack.prdtRpplDurMs,
      0,
      1
    );
    if (progress >= 1) {
      predatorRipples.delete(id);
      continue;
    }
    drawGazRppPai({
      x: effect.x,
      y: effect.y,
      progress,
      minimumRadius: faceTrack.eyeRpnRppMinRa,
      maximumRadius: faceTrack.prdtRpplMaxRad,
      baseAlpha: clamp(
        currentRippleAlpha() * faceTrack.eyeRpnRpplAlph +
          faceTrack.prdtRppAlpBst / 255,
        0,
        1
      ),
      lineWidth:
        faceTrack.rpplLineWdth * 1.2 +
        faceTrack.predRppWdtBst,
      innerDelay: 0.28,
      innrRadScl: 0.72,
      innrAlphScl: 0.58,
    });
  }
  drawingContext.restore();
}

// Draw the primary participant's cursor and feedback layers
// according to input mode, calibration confidence, and rest state.
function drawCursor() {
  if (
    !multiTestEnabled &&
    !isPointerMode &&
    !primarySlotId
  ) {
    return;
  }
  const hasController = isGazeControlActive();
  const blinkActive =
    eyeInput.state === "closing" || eyeInput.state === "blink";
  const lifeVis =
    primaryCursorTrack.phase === "grace" ||
    primaryCursorTrack.phase === "exiting" ||
    primaryCursorTrack.phase === "recovering";
  const closeVisActv =
    eyeInput.closedSince != null || eyeInput.closurePhase === "reopening";
  const closureAlpha = isPointerMode
    ? 1
    : eyeClosureVisAlpha(eyeInput);
  // Continue drawing the decaying cursor during eye closure and
  // departure so changes in control become visible gradually.
  const visibility =
    (hasController || blinkActive || lifeVis || closeVisActv
      ? 1
      : faceTrack.idleCrsrAlph) *
    primaryCursorTrack.alpha *
    closureAlpha;
  const gazeColor = faceTrack.gazeColor;
  const visualGaze = rslvCrsrPos(0, gaze);
  // Calculate departure scaling and vertical blink compression separately.
  const exitVisual = crsrExitVisStt(primaryCursorTrack);
  const blinkScaleY = isPointerMode
    ? 1
    : blnkCrsrSclY(eyeInput);
  const openness = 1 + sin(frameCount * 0.08) * 0.025 + cursorMove.energy * 0.05;
  push();
  translate(visualGaze.x, visualGaze.y);
  rotate(exitVisual.active ? 0 : cursorMove.tilt);
  scale(
    faceTrack.gazeCrsrScl *
      (exitVisual.active ? 1 : openness) *
      exitVisual.horizScl,
    faceTrack.gazeCrsrScl *
      (exitVisual.active ? 1 : 1 - cursorMove.energy * 0.025) *
      exitVisual.verticalScale *
      blinkScaleY
  );
  noFill();
  stroke(
    gazeColor[0],
    gazeColor[1],
    gazeColor[2],
    faceTrack.gazeCrsrAlph * visibility * exitVisual.bracketAlpha
  );
  strokeWeight(2.5);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  drawingContext.shadowColor = `rgba(${gazeColor[0]},${gazeColor[1]},${gazeColor[2]},${faceTrack.gazeGlowAlpha * visibility})`;
  drawingContext.shadowBlur = 5;

  beginShape();
  vertex(-6.8, -8);
  bezierVertex(-8.1, -6.4, -10.5, -2.6, -11.5, 0);
  bezierVertex(-10.5, 2.6, -8.1, 6.4, -6.8, 8);
  endShape();

  beginShape();
  vertex(6.8, -8);
  bezierVertex(8.1, -6.4, 10.5, -2.6, 11.5, 0);
  bezierVertex(10.5, 2.6, 8.1, 6.4, 6.8, 8);
  endShape();
  pop();
  drawCursorExit(visualGaze, primaryCursorTrack);
  drawCrsExiLbl(visualGaze, primaryCursorTrack);
}

const { drawRndCrsr, drawRoundGlow, drawSqrCrsr } =
  window.GazeSupport.cursor.create();

// Draw independent cursors for other participants, using state
// differences to express calibration, tracking loss, and rest.
function drawPeerCursor(participant) {
  if (!participant?.visible) return;
  const cursorTracking =
    participant.cursorTracking || { phase: "tracking", alpha: 1 };
  const exitVisual = crsrExitVisStt(cursorTracking);
  const inputActive = Boolean(
    participant.eyes.valid &&
      cursorTracking.phase === "tracking"
  );
  const blinkActive =
    participant.eyes.state === "closing" || participant.eyes.state === "blink";
  const lifeVis =
    cursorTracking.phase === "grace" ||
      cursorTracking.phase === "exiting" ||
      cursorTracking.phase === "recovering";
  const actvVis = exitVisual.active ? 1 : 0.92;
  const closeVisActv =
    participant.eyes.closedSince != null ||
    participant.eyes.closurePhase === "reopening";
  const closureAlpha = eyeClosureVisAlpha(participant.eyes);
  // Adjust companion-cursor visibility according to input, eye-closure, and tracking state.
  const visibility =
    (inputActive || blinkActive || lifeVis || closeVisActv
      ? actvVis
      : faceTrack.idleCrsrAlph * 0.72) *
    cursorTracking.alpha *
    closureAlpha;
  const gazeColor = faceTrack.gazeColor;
  const visualGaze = rslvCrsrPos(
    participant.id,
    participant.gaze
  );
  const blinkScaleY = blnkCrsrSclY(participant.eyes);
  push();
  translate(visualGaze.x, visualGaze.y);
  scale(
    faceTrack.gazeCrsrScl * exitVisual.horizScl,
    faceTrack.gazeCrsrScl * exitVisual.verticalScale * blinkScaleY
  );
  noFill();
  // Participants receive stable shapes; color follows the shared visual language,
  // while outlines express identity differences.
  const cursorShape = userCursorShape(participant.id);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  if (cursorShape === "square-brackets") {
    stroke(
      gazeColor[0],
      gazeColor[1],
      gazeColor[2],
      faceTrack.gazeCrsrAlph * visibility * exitVisual.bracketAlpha
    );
    strokeWeight(2.5);
    drawingContext.shadowColor = `rgba(${gazeColor[0]},${gazeColor[1]},${gazeColor[2]},${faceTrack.gazeGlowAlpha * visibility})`;
    drawingContext.shadowBlur = 4;
    drawSqrCrsr();
  } else if (cursorShape === "round-brackets") {
    const glowSrcAlph =
      faceTrack.gazeGlowAlpha *
      visibility *
      visibility *
      exitVisual.bracketAlpha;
    stroke(
      gazeColor[0],
      gazeColor[1],
      gazeColor[2],
      255 * glowSrcAlph
    );
    strokeWeight(0.8);
    drawingContext.shadowColor = `rgba(${gazeColor[0]},${gazeColor[1]},${gazeColor[2]},1)`;
    drawingContext.shadowBlur = 4;
    drawRoundGlow();

    drawingContext.shadowColor = "rgba(0,0,0,0)";
    drawingContext.shadowBlur = 0;
    stroke(
      gazeColor[0],
      gazeColor[1],
      gazeColor[2],
      faceTrack.gazeCrsrAlph * visibility * exitVisual.bracketAlpha
    );
    drawRndCrsr();
  }
  pop();
  drawCursorExit(visualGaze, cursorTracking);
  drawCrsExiLbl(visualGaze, cursorTracking);
}

// Visual tests represent simulated participants with simplified cursors;
// calibration and privacy states use separate test data.
function drawTestCursor(participant) {
  drawPeerCursor({
    id: participant.id,
    visible: true,
    gaze: participant.gaze,
    eyes: { valid: true, state: "open" },
  });
}

// 12. Use live feedback to show the audience how the system currently perceives them
function clbTgtScrn() {
  const point = calibPoints[gazeCalib.pointIndex];
  const bounds = gazeBounds();
  return {
    x: bounds.x + point.x * bounds.w,
    y: bounds.y + point.y * bounds.h,
    kind: point.kind,
  };
}

const { trcClbPrtlPath, drawClbPrtPro } =
  window.GazeSupport.calibration.create({
    clamp,
    getNow: () => gazeFrame.now,
  });

// Ease the primary calibration mask separately during entry and completion.
function clbOvrlyAlph(now = millis()) {
  if (gazeCalib.active) {
    return clamp(
      (now - gazeCalib.pointStartedAt) / faceTrack.calibFadeInMs,
      0,
      1
    );
  }
  if (
    gazeCalib.quality !== "ready" ||
    gazeCalib.lastCompletedAt === null
  ) {
    return 0;
  }
  return 1 - clamp(
    (now - gazeCalib.lastCompletedAt) /
      faceTrack.calibFadeOutMs,
    0,
    1
  );
}

// After stable waiting ends, convert the current point's sampling time into calibration progress.
function mainClbProg() {
  return gazeCalib.pointValidMs < faceTrack.calibSettleMs
    ? 0
    : clamp(
        gazeCalib.pointStableMs / faceTrack.calibSampleMs,
        0,
        1
      );
}

function drawClbOvrly(alphaScale = clbOvrlyAlph()) {
  if (alphaScale <= 0) return;
  const target = clbTgtScrn();
  const progress = mainClbProg();
  const pulse = 1 + Math.sin(frameCount * 0.07) * 0.03;
  const color = faceTrack.gazeColor;
  const portalRadius = 34.5;
  const prtlLineLngth = 128;
  const prtlArrwWdth = 15.8;
  const prtlArrwRise = 14;
  push();
  noStroke();
  // A translucent full-screen mask reduces competition from ecological motion,
  // making calibration a temporary focus of attention.
  fill(3, 10, 38, 160 * alphaScale);
  rect(0, 0, width, height);
  translate(target.x, target.y);
  scale(userFlowScale * clbCntntVisScl);
  noFill();
  stroke(color[0], color[1], color[2], 110 * alphaScale);
  strokeWeight(2.1);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  // A subtle pulse affects the complete outline, while
  // highlighted path length still expresses actual completion.
  drawingContext.save();
  drawingContext.scale(pulse, pulse);
  trcClbPrtlPath(
    drawingContext,
    portalRadius,
    prtlLineLngth,
    prtlArrwWdth,
    prtlArrwRise
  );
  drawingContext.stroke();
  drawingContext.restore();
  stroke(color[0], color[1], color[2], 240 * alphaScale);
  strokeWeight(3.8);
  drawClbPrtPro(
    portalRadius,
    prtlLineLngth,
    prtlArrwWdth,
    prtlArrwRise,
    progress
  );
  noStroke();
  fill(color[0], color[1], color[2], 255 * alphaScale);
  circle(0, 0, 18);
  fill(255, 255, 255, 235 * alphaScale);
  circle(0, 0, 6);
  fill(255, 255, 255, 230 * alphaScale);
  stroke(255, 255, 255, 230 * alphaScale);
  strokeWeight(0.3);
  textFont(clbFontFmly);
  textSize(13.5);
  textStyle(NORMAL);
// Instructions remain to the left of the target, leaving space around the point the audience is viewing.
  textAlign(RIGHT, CENTER);
  drawingContext.save();
  drawingContext.font = `400 13.5px "${clbFontFmly}"`;
  drawingContext.letterSpacing = "0.9px";
  text("Head steady,", -16, -7.8);
  text("let your gaze rest here.", -16, 7.8);
  drawingContext.restore();
  pop();
}

// Companion calibration progress reflects valid stable-sampling time;
// waiting and fade-out stages use preset endpoint values.
function peerCalibProgress(state) {
  if (!state) return 0;
  if (state.calibPhase === "fading") return 1;
  if (state.calibPhase !== "sampling") return 0;
  return clamp(
    state.calibStableMs / faceTrack.calibSampleMs,
    0,
    1
  );
}

// Preparation, sampling, and fade-out independently control
// companion-panel opacity; sampling progress uses a separate field.
function peerCalibAlpha(state, now) {
  if (!state) return 0;
  if (state.calibPhase !== "fading") {
    return clamp(
      (now - state.calibStartedAt) / faceTrack.calibFadeInMs,
      0,
      1
    );
  }
  return 1 - clamp(
    (now - state.calibCompletedAt) / faceTrack.calibFadeOutMs,
    0,
    1
  );
}

function wrapClbPrmpt(state, message) {
  return userCursorShape(state.id) === "round-brackets"
    ? `(${message})`
    : `[${message}]`;
}

// Calibration guidance is determined jointly by stage and failure reason;
// the interface shows what the participant can currently do.
function peerClbPrmpt(state) {
  if (state.calibPhase === "fading") {
    return wrapClbPrmpt(state, "Calibration complete");
  }
  if (["face-lost", "face-incomplete"].includes(state.calibPausedReason)) {
    return wrapClbPrmpt(state, "Please return to view");
  }
  if (state.calibPausedReason === "eyes-unstable") {
    return wrapClbPrmpt(
      state,
      "Please open your eyes and look here"
    );
  }
  if (state.calibPausedReason === "gaze-unstable") {
    return wrapClbPrmpt(
      state,
      "Keep your head steady and look here"
    );
  }
  const calibKind = state.recalibrating
    ? "Recalibration"
    : "New participant";
  const message = state.calibPhase === "sampling"
    ? `${calibKind} · In progress...`
    : `${calibKind} · Hold steady...`;
  return wrapClbPrmpt(state, message);
}

// Return the action guidance currently required for the primary calibration stage.
function mainClbPrmpt() {
  if (!gazeCalib.active) return "[Calibration complete]";
  const phase = gazeCalib.pointValidMs < faceTrack.calibSettleMs
    ? "Hold steady..."
    : "In progress...";
  return `[Calibration · ${phase}]`;
}

// Reuse the blur layer by panel pixel dimensions, rebuilding
// it when dimensions change to control offscreen-canvas cost.
function getClbBlurLyr(panelWidth, panelHeight) {
  const padding =
    peerCalibRules.pnlBlurPddng * userFlowScale;
  const layerWidth = max(1, Math.ceil(panelWidth + padding * 2));
  const layerHeight = max(1, Math.ceil(panelHeight + padding * 2));
  if (
    extrClbLyr &&
    extrClbLyr.width === layerWidth &&
    extrClbLyr.height === layerHeight
  ) {
    return extrClbLyr;
  }
  if (extrClbLyr) extrClbLyr.remove();
  extrClbLyr = createGraphics(layerWidth, layerHeight);
  extrClbLyr.pixelDensity(1);
  return extrClbLyr;
}

function clbPnlRad(panelWidth, panelHeight) {
  return min(
    consentRules.snglPnlCrnrRad * userFlowScale,
    min(panelWidth, panelHeight) * peerCalibRules.pnlRadScl
  );
}

// A confirmation waveform emerges around the participant's calibration cursor,
// making hold progress visible while leaving clear space at the target.
function drawPeeClbWav(
  target,
  panelWidth,
  panelHeight,
  panelRadius,
  alphaScale,
  now
) {
  const state = cnsntWaveStts.calibSurface;
  consent.updtWaveOffst(state, now);
  const metrics = cnsntPnlMtrcs(
    panelWidth,
    panelHeight,
    0,
    panelRadius,
    0
  );
// Sample evenly along the panel perimeter so the status waveform fully surrounds the current feedback.
  const points = Array.from(
    { length: state.samples.length },
    (_, index) =>
      consent.wavePoint(
        metrics,
        (metrics.perimeter * index) / state.samples.length,
        state
      )
  );
  if (!points.length) return;
  const context = drawingContext;
  const first = points[0];
  const last = points[points.length - 1];
  context.save();
  context.translate(
    target.x - panelWidth * 0.5,
    target.y + peerCalibRules.pnlCntrOffstY - panelHeight * 0.5
  );
  context.beginPath();
  // Connect quadratic curves through adjacent-point midpoints,
  // concealing sharp corners from discrete sampling while preserving a hand-drawn quality.
  context.moveTo(
    (last.x + first.x) * 0.5,
    (last.y + first.y) * 0.5
  );
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    context.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) * 0.5,
      (current.y + next.y) * 0.5
    );
  }
  context.closePath();
  // The dark surface brings the calibration panel and soft lifeforms into the same visual language.
  context.fillStyle = `rgba(3, 10, 38, ${0.431 * alphaScale})`;
  context.fill();
  context.restore();
}

function drawCalibBlur(
  target,
  panelWidth,
  panelHeight,
  alphaScale,
  visualLayers = null
) {
  if (typeof createGraphics !== "function") return;
  // Capture the scene behind the panel into a reusable layer.
  const padding =
    peerCalibRules.pnlBlurPddng * userFlowScale;
  const panelRadius = clbPnlRad(
    panelWidth,
    panelHeight
  );
  const panelCenterY =
    target.y + peerCalibRules.pnlCntrOffstY;
  const captureX = target.x - panelWidth * 0.5 - padding;
  const captureY = panelCenterY - panelHeight * 0.5 - padding;
  const layer = getClbBlurLyr(panelWidth, panelHeight);
  const layerContext = layer.drawingContext;
  const sourceCanvas = drawingContext.canvas;
  // The DOM canvas may use high pixel density, so sampling coordinates
  // must be converted from logical dimensions to physical pixels.
  const sourceScaleX = sourceCanvas.width / max(1, width);
  const sourceScaleY = sourceCanvas.height / max(1, height);
  layerContext.save();
  layerContext.clearRect(0, 0, layer.width, layer.height);
  layerContext.fillStyle =
    visualLayers?.bgClr || gazeConfig.background;
  layerContext.fillRect(0, 0, layer.width, layer.height);
  layerContext.filter = `blur(${peerCalibRules.pnlBgBlur}px)`;
  layerContext.drawImage(
    sourceCanvas,
    captureX * sourceScaleX,
    captureY * sourceScaleY,
    layer.width * sourceScaleX,
    layer.height * sourceScaleY,
    0,
    0,
    layer.width,
    layer.height
  );
  layerContext.restore();

  drawingContext.save();
  // Rounded clipping confines the blurred background, after which
  // the arrow glow is composited back to keep guidance clear.
  drawingContext.beginPath();
  if (typeof drawingContext.roundRect === "function") {
    drawingContext.roundRect(
      target.x - panelWidth * 0.5,
      panelCenterY - panelHeight * 0.5,
      panelWidth,
      panelHeight,
      panelRadius
    );
  } else {
    drawingContext.rect(
      target.x - panelWidth * 0.5,
      panelCenterY - panelHeight * 0.5,
      panelWidth,
      panelHeight
    );
  }
  drawingContext.clip();
  drawingContext.globalAlpha *= alphaScale;
  drawingContext.drawImage(
    layer.canvas,
    captureX,
    captureY,
    layer.width,
    layer.height
  );
  drawingContext.globalAlpha = alphaScale;
  for (const glowCanvas of [
    visualLayers?.arrwGlowCnvs,
    visualLayers?.glowCanvas,
  ]) {
    if (!glowCanvas?.width || !glowCanvas?.height) continue;
    drawingContext.drawImage(
      glowCanvas,
      0,
      0,
      glowCanvas.width,
      glowCanvas.height,
      0,
      0,
      width,
      height
    );
  }
  drawingContext.restore();
}

// The primary participant and other participants share the same calibration-panel visuals.
function drawCalibPanel(
  target,
  progress,
  prompt,
  alphaScale,
  now = gazeFrame.now,
  visualLayers = null
) {
  if (alphaScale <= 0) return;
  const pulse = 1 + Math.sin(frameCount * 0.07) * 0.03;
  const color = faceTrack.gazeColor;
  const portalRadius = 34.5;
  const prtlLineLngth = 128;
  const prtlArrwWdth = 15.8;
  const prtlArrwRise = 14;
// Calculate panel size from preset dimensions and available viewport space.
  const panelWidth = min(
    peerCalibRules.panelWidth * userFlowScale,
    max(120, width - 32)
  );
  const panelHeight = min(
    peerCalibRules.panelHeight * userFlowScale,
    max(80, height - 32)
  );
  const panelRadius = clbPnlRad(
    panelWidth,
    panelHeight
  );
  // The scene behind the panel is captured and blurred, with waveform and content drawn above it to keep
  // guidance clear while preserving the ecological background.
  drawCalibBlur(
    target,
    panelWidth,
    panelHeight,
    alphaScale,
    visualLayers
  );
  push();
  drawPeeClbWav(
    target,
    panelWidth,
    panelHeight,
    panelRadius,
    alphaScale,
    now
  );
  translate(
    target.x +
      peerCalibRules.pnlCntntOffstX * userFlowScale,
    target.y
  );
  scale(userFlowScale * clbCntntVisScl);
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  drawingContext.save();
  drawingContext.scale(pulse, pulse);
  stroke(color[0], color[1], color[2], 151 * alphaScale);
  strokeWeight(2.1);
  // A low-opacity complete path provides direction, while a highlighted path draws the completed
  // portion, distinguishing guidance from live progress.
  trcClbPrtlPath(
    drawingContext,
    portalRadius,
    prtlLineLngth,
    prtlArrwWdth,
    prtlArrwRise
  );
  drawingContext.stroke();
  drawingContext.restore();
  stroke(color[0], color[1], color[2], 255 * alphaScale);
  strokeWeight(3.8);
  drawClbPrtPro(
    portalRadius,
    prtlLineLngth,
    prtlArrwWdth,
    prtlArrwRise,
    progress
  );
  // The double-layered central point is the target where gaze should currently remain.
  noStroke();
  fill(color[0], color[1], color[2], 255 * alphaScale);
  circle(0, 0, 18);
  fill(255, 255, 255, 255 * alphaScale);
  circle(0, 0, 6);
  fill(255, 255, 255, 252 * alphaScale);
  stroke(255, 255, 255, 252 * alphaScale);
  strokeWeight(0.3);
  textFont(clbFontFmly);
  textSize(13.5);
  textStyle(NORMAL);
  textAlign(RIGHT, CENTER);
  drawingContext.shadowColor = `rgba(0,5,20,${(115 / 255) * alphaScale})`;
  drawingContext.shadowBlur = 3.5;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 1;
  drawingContext.save();
  drawingContext.font = `400 13.5px "${clbFontFmly}"`;
  drawingContext.letterSpacing = "0.9px";
  text("Head steady,", -16, -7.8);
  text("let your gaze rest here.", -16, 7.8);
  drawingContext.restore();
  drawingContext.shadowColor = "rgba(0,0,0,0)";
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 0;
  textStyle(NORMAL);
  textSize(11);
  textAlign(CENTER, CENTER);
  fill(207, 230, 236, 255 * alphaScale);
  stroke(207, 230, 236, 255 * alphaScale);
  strokeWeight(0.2);
  drawingContext.save();
  drawingContext.letterSpacing = "1.05px";
  text(prompt, 0, 53);
  drawingContext.restore();
  pop();
}

// Primary calibration combines local blur, a waveform panel, and a target;
// text is drawn last to reduce interference from background feedback.
function drawMainClb(
  alphaScale,
  now = gazeFrame.now,
  visualLayers = null
) {
  drawCalibPanel(
    clbTgtScrn(),
    mainClbProg(),
    mainClbPrmpt(),
    alphaScale,
    now,
    visualLayers
  );
}

// Companion calibration overlays use their own targets and stage opacity,
// showing the current participant when several are queued.
function drawPeeClbOvr(
  now = gazeFrame.now,
  visualLayers = null
) {
  const state = peerStates.find(isPeerCalibActive);
  if (!state?.calibTarget) return;
  drawCalibPanel(
    state.calibTarget,
    peerCalibProgress(state),
    peerClbPrmpt(state),
    peerCalibAlpha(state, now),
    now,
    visualLayers
  );
}

// Prefer supplied time, then the frame clock, and use real time when frame time is unavailable.
function statusClockNow(now = null) {
  if (Number.isFinite(now)) return now;
  if (Number.isFinite(gazeFrame.now) && gazeFrame.now > 0) {
    return gazeFrame.now;
  }
  return typeof millis === "function" ? millis() : performance.now();
}

// Merge brief statuses by text and time, keeping repeated feedback at an appropriate density.
function qTrnsStts(message, now = null) {
  const text = String(message || "").trim();
  if (
    text !== statusCopy.userMssng &&
    text !== statusCopy.rjnFaceMssng &&
    text !== statusCopy.multOn
  ) {
    return false;
  }
  const startedAt = statusClockNow(now);
  const actvTrns = statusUi.transient;
  if (
    actvTrns?.text === text &&
    startedAt - actvTrns.startedAt <
      sttsDsplyCfg.trnsDurMs
  ) {
    return;
  }
  statusUi.transient = {
    kind: "transient",
    text,
    startedAt,
  };
  return true;
}

// Latch errors and recovery actions that require participant attention.
function holdErrrStts(message, action) {
  statusUi.storedErrr = {
    kind: "error",
    text: message,
    action,
  };
}

function clrHelErrStt() {
  statusUi.storedErrr = null;
}

function sttsContAny(message, fragments) {
  return fragments.some((fragment) => message.includes(fragment));
}

// Normalize internal states into brief, understandable live notices.
// This function was modified with the assistance of ChatGPT.
function classifyStatus(message) {
  const value = String(message || "").trim();
  if (!value) return null;

  // Classify by the recovery action available to the participant, creating stable notice categories.
  if (sttsContAny(value, ["camera failed to start", "Unable to start the camera"])) {
    return {
      kind: "error",
      text: statusCopy.cameraError,
      action: statusCopy.cmrErrrActn,
    };
  }
  // Classify model-loading or detection-start failures as gaze-input errors.
  if (
    sttsContAny(value, [
      "FaceMesh failed to start",
      "Unable to load ml5 FaceMesh",
      "Face detection failed to start",
      "Gaze detection failed to start",
    ])
  ) {
    return {
      kind: "error",
      text: statusCopy.gazeError,
      action: statusCopy.gazeErrrActn,
    };
  }
  if (sttsContAny(value, ["baseline could not be established", "Unable to complete calibration"])) {
    return {
      kind: "error",
      text: statusCopy.calibError,
      action: statusCopy.clbErrrActn,
    };
  }

  if (sttsContAny(value, ["Waiting for camera permission", "camera permission"])) {
    return { kind: "action", text: statusCopy.cmrPerm };
  }
  if (
    sttsContAny(value, [
      "No participant detected",
      "No face is currently detected",
      "No participant is currently available for recalibration",
      "no longer in a calibratable state",
      "Iris input is unavailable",
      "participant's place will be retained briefly",
      "target is exiting",
    ])
  ) {
    return { kind: "action", text: statusCopy.userMssng };
  }
  if (
    sttsContAny(value, [
      "Waiting for the viewer to confirm joining",
      "Confirm joining through the viewer invitation first",
    ])
  ) {
    return detectedFaceCount() > 0
      ? null
      : { kind: "action", text: statusCopy.userMssng };
  }
  return null;
}

function statusView(now) {
  const current = classifyStatus(status);
  // Transient states enter the brief-message queue, while errors
  // and action-required states become persistent displays.
  if (status !== statusUi.observedStatus) {
    statusUi.observedStatus = status;
    if (current?.kind === "transient") {
      qTrnsStts(current.text, now);
    }
  }

  // A latched error takes priority over new status.
  const storedCand = statusUi.storedErrr ||
    (current?.kind === "error" || current?.kind === "action"
      ? current
      : null);
  if (storedCand) {
    const key = [
      storedCand.kind,
      storedCand.text,
      storedCand.action || "",
    ].join("|");
    if (
      !statusUi.persistent ||
      statusUi.persistent.key !== key ||
      statusUi.persistent.endedAt !== null
    ) {
      statusUi.persistent = {
        ...storedCand,
        key,
        startedAt: now,
        endedAt: null,
        endAlpha: 1,
      };
    }
    const persistent = statusUi.persistent;
    const alpha = clamp(
      (now - persistent.startedAt) / max(1, sttsDsplyCfg.fadeInMs),
      0,
      1
    );
    return { ...persistent, alpha };
  }

  // When a persistent state clears, fade it from its current opacity.
  const persistent = statusUi.persistent;
  if (persistent) {
    if (persistent.endedAt === null) {
      persistent.endedAt = now;
      persistent.endAlpha = clamp(
        (now - persistent.startedAt) /
          max(1, sttsDsplyCfg.fadeInMs),
        0,
        1
      );
    }
    const fadeElapsed = max(0, now - persistent.endedAt);
    if (fadeElapsed >= sttsDsplyCfg.fadeOutMs) {
      statusUi.persistent = null;
    } else {
      const alpha = persistent.endAlpha *
        (1 - fadeElapsed / max(1, sttsDsplyCfg.fadeOutMs));
      return { ...persistent, alpha: clamp(alpha, 0, 1) };
    }
  }

  // Ordinary notices have a preset display window with
  // independent fade-in and fade-out durations at its ends.
  const transient = statusUi.transient;
  if (!transient) return null;
  const elapsed = max(0, now - transient.startedAt);
  if (elapsed >= sttsDsplyCfg.trnsDurMs) {
    statusUi.transient = null;
    return null;
  }
  const fadeInAlpha = elapsed / max(1, sttsDsplyCfg.fadeInMs);
  const fadeOutAlpha =
    (sttsDsplyCfg.trnsDurMs - elapsed) /
    max(1, sttsDsplyCfg.fadeOutMs);
  const alpha = min(1, fadeInAlpha, fadeOutAlpha);
  return { ...transient, alpha: clamp(alpha, 0, 1) };
}

function statusDisplayY() {
  const participantCount = document.getElementById(
    "interaction-participant-count"
  );
  if (participantCount?.getClientRects().length) {
    return participantCount.getBoundingClientRect().top;
  }
  return sttsDsplyCfg.top;
}

function statusDisplayX() {
  const participantCount = document.getElementById(
    "interaction-participant-count"
  );
  if (participantCount?.getClientRects().length) {
    return (
      participantCount.getBoundingClientRect().left +
      sttsDsplyCfg.userNOffstX
    );
  }
  return sttsDsplyCfg.x;
}

// Position the rhythm notice and adjust join and recalibration controls according to control dimensions.
function updtRhythGd() {
  const guide = document.getElementById("ecology-rhythm-guide");
  if (!guide) return;
  const controls = document.getElementById("lower-left-controls");
  const inputControls = document.getElementById("input-mode-controls");
  const entryControls = inputControls?.querySelector(".input-mode-row--entry");
  // Rearrange the control area when it is actually visible.
  const contVis = Boolean(
    controls &&
      inputControls &&
      entryControls &&
      !inputControls.hidden &&
      entryControls.getClientRects().length > 0
  );
  const top = ecoRhythGdCfg.fallbackTop;
  const topValue = `${top}px`;
  if (guide.style.top !== topValue) guide.style.top = topValue;

  const rclbBttnEl = document.getElementById("recalibration-button");
  const menu = document.getElementById("recalibration-participant-menu");
  const joinButton = document.getElementById("audience-join-request");
  const participantCount = document.getElementById(
    "interaction-participant-count"
  );
  if (!contVis || !rclbBttnEl || !joinButton || !participantCount) {
    return;
  }
  const controlsRect = controls.getBoundingClientRect();
  const inputRect = inputControls.getBoundingClientRect();
  // The DOM rectangle includes outer scaling; convert positions
  // back to the control's local coordinates before writing styles.
  const controlScale = controls.offsetWidth > 0
    ? controlsRect.width / controls.offsetWidth
    : 0.968;
  const safeScale = controlScale > 0 ? controlScale : 0.968;
  const guideRect = guide.getBoundingClientRect();
  const entryLeft = (
    guideRect.left +
    ecoRhythGdCfg.entrHorOff -
    inputRect.left
  ) / safeScale;
  const entryTop = (
    guideRect.bottom +
    ecoRhythGdCfg.controlGap -
    ecoRhythGdCfg.contVertOffst -
    inputRect.top
  ) / safeScale;
  const entryLeftValue = `${entryLeft}px`;
  const entryTopValue = `${entryTop}px`;
// Update styles only when values change, keeping high-frequency status feedback inexpensive.
  if (entryControls.style.left !== entryLeftValue) {
    entryControls.style.left = entryLeftValue;
  }
  if (entryControls.style.top !== entryTopValue) {
    entryControls.style.top = entryTopValue;
  }

  const joinRect = joinButton.getBoundingClientRect();
  const buttonLeft = (
    joinRect.right +
    ecoRhythGdCfg.controlGap +
    ecoRhythGdCfg.rclbHorizOffst -
    inputRect.left
  ) / safeScale;
  const buttonTop = (
    joinRect.top +
    ecoRhythGdCfg.rclbVertOffst -
    inputRect.top
  ) / safeScale;
  const bttnLeftVl = `${buttonLeft}px`;
  const buttonTopValue = `${buttonTop}px`;
  if (rclbBttnEl.style.left !== bttnLeftVl) {
    rclbBttnEl.style.left = bttnLeftVl;
  }
  if (rclbBttnEl.style.top !== buttonTopValue) {
    rclbBttnEl.style.top = buttonTopValue;
  }

  const recalibRect = rclbBttnEl.getBoundingClientRect();
  const controlsBottom = max(joinRect.bottom, recalibRect.bottom);
  const countLeft = (
    24 + ecoRhythGdCfg.sttsHorizOffst
  ) / safeScale;
  const countTop = (
    controlsBottom + ecoRhythGdCfg.controlGap - joinRect.top
  ) / safeScale;
  const countLeftValue = `${countLeft}px`;
  const countTopValue = `${countTop}px`;
  if (participantCount.style.left !== countLeftValue) {
    participantCount.style.left = countLeftValue;
  }
  if (participantCount.style.top !== countTopValue) {
    participantCount.style.top = countTopValue;
  }
  // Open the recalibration menu below the participant count, preserving
  // the reading order of join, recalibration, and status information.
  if (menu) {
    const countRect = participantCount.getBoundingClientRect();
    const menuTop = (
      countRect.bottom + ecoRhythGdCfg.controlGap - inputRect.top
    ) / safeScale;
    const menuTopValue = `${menuTop}px`;
    if (menu.style.left !== bttnLeftVl) menu.style.left = bttnLeftVl;
    if (menu.style.top !== menuTopValue) menu.style.top = menuTopValue;
  }
}

// Draw live notices according to status type and opacity.
function drawStatus() {
  const presentation = statusView(statusClockNow());
  if (!presentation || presentation.alpha <= 0) return;

  const x = statusDisplayX();
  const y = statusDisplayY();
  const statusLabel = presentation.action
    ? `${presentation.text}. ${presentation.action}`
    : presentation.text;
  const label = `ECOLOGY: ${statusLabel}`;
  const alpha = presentation.alpha;

  push();
  fill(255, 255, 255, 204 * alpha);
  noStroke();
  textFont("Averia Libre");
  textSize(12);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  drawingContext.letterSpacing = "0.088px";
  translate(x, y);
  scale(1, 1.15);
  text(label, 0, 0);
  pop();
}

// 13. Gaze-pointer switching and live control entry points
function gazeBounds() {
  const padding = 42;
  return {
    x: padding,
    y: padding,
    w: max(0, width - padding * 2),
    h: max(0, height - padding * 2),
  };
}

// Gaze coordinates are constrained by the current canvas; all input modes share the same boundary.
function clampGaze(x, y) {
  const bounds = gazeBounds();
  return {
    x: constrain(x, bounds.x, bounds.x + bounds.w),
    y: constrain(y, bounds.y, bounds.y + bounds.h),
  };
}

// Return test participants to deterministic initial paths so
// repeated tests begin from the same spatial relationships.
function rstTesPeePos() {
  const pointer = clampGaze(width * 0.66, height * 0.5);
  const simulatedGaze = clampGaze(width * 0.5, height * 0.36);
  const keyboard = clampGaze(width * 0.34, height * 0.68);
  gaze.x = pointer.x;
  gaze.y = pointer.y;
  gaze.targetX = pointer.x;
  gaze.targetY = pointer.y;
  smoothGaze.ready = true;
  smoothGaze.x = pointer.x;
  smoothGaze.y = pointer.y;
  testPeerStates[0].gaze.x = simulatedGaze.x;
  testPeerStates[0].gaze.y = simulatedGaze.y;
  testPeerStates[1].gaze.x = keyboard.x;
  testPeerStates[1].gaze.y = keyboard.y;
  for (const participant of testPeerStates) {
    participant.lastTrace = 0;
    participant.traces.length = 0;
  }
}

function setMultiTest(enabled) {
  // Test mode creates preset simulated-participant shapes
  // isolated from real camera state for repeatable verification.
  if (!gazeEnabled) return false;
  const next = Boolean(enabled);
  if (multiTestEnabled === next) return true;
  multiTestEnabled = next;
  testUserSnapshots = null;
  audiencePrompt = null;
  audienceStates.clear();
  consent.render();
  if (multiTestEnabled) {
    primarySlotId = 0;
    rstMainClb(0, gazeFrame.now);
    isPointerMode = false;
    pointerPresenceSrc = null;
    clrPtrFallback();
    ptrFallback = "";
    resetPeer(peerStates[0], gazeFrame.now);
    resetPeer(peerStates[1], gazeFrame.now);
    rstTesPeePos();
    strtCellLife();
    status = skipCam
      ? "Three-participant test: 1 Cursor · 2 Simulated gaze · 3 Arrow keys"
      : "Three-participant test: 1 Cursor · 2 Gaze calibration · 3 Arrow keys";
  } else {
    for (const participant of testPeerStates) {
      participant.lastTrace = 0;
      participant.traces.length = 0;
    }
    resetPeer(peerStates[0], gazeFrame.now);
    resetPeer(peerStates[1], gazeFrame.now);
    status = eyeInput.calibrated
      ? "The three-participant interaction test is off. Gaze mode is currently active."
      : "The three-participant interaction test is off.";
  }
  updtPtrBttn();
  return true;
}

// Enable multi-participant mode, update controls, and display a status notice.
function enblMltMode() {
  if (!gazeEnabled) return false;
  if (!multiModeEnabled) {
    multiModeEnabled = true;
    updtPtrBttn();
  }
  qTrnsStts(statusCopy.multOn);
  return true;
}

// Keyboard test input moves virtual participants at a
// preset speed and confines them to the visible canvas.
function updKeyTesPee() {
  if (!multiTestEnabled || typeof keyIsDown !== "function") return;
  let dx = (keyIsDown(39) ? 1 : 0) - (keyIsDown(37) ? 1 : 0);
  let dy = (keyIsDown(40) ? 1 : 0) - (keyIsDown(38) ? 1 : 0);
  if (!dx && !dy) return;
  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  const keyboard = testPeerStates[1].gaze;
  const limited = clampGaze(
    keyboard.x + dx * mltKeybSpd * gazeFrame.dt,
    keyboard.y + dy * mltKeybSpd * gazeFrame.dt
  );
  keyboard.x = limited.x;
  keyboard.y = limited.y;
}

// Input modes are prioritized as test pointer, active pointer,
// calibration, and head-eye tracking, providing one source of public state.
function currentInputMode() {
  if (multiTestEnabled) return "pointer";
  if (isPointerMode) return "pointer";
  if (gazeCalib.active) return "calibrating";
  return "eye-head";
}

function jndSndN() {
  const primaryJoined =
    isPointerMode ||
    Boolean(primarySlotId && eyeInput.calibrated);
  const joinedPeers = peerStates.filter(
    (participant) => participant.calibrated && participant.faceAssignmentId
  ).length;
  return clamp(
    (primaryJoined ? 1 : 0) + joinedPeers,
    1,
    maximumParticipants
  );
}

function activeViewerCount() {
  // Participant counts combine test, pointer, and confirmed slots; callers read the aggregate result.
  if (!gazeEnabled) return 0;
  if (testUserSnapshots?.length) {
    return clamp(
      testUserSnapshots.filter(
        (participant) => participant?.inputActive !== false
      ).length,
      0,
      maximumParticipants
    );
  }
  if (multiTestEnabled) {
    if (skipCam) return maximumParticipants;
    return clamp(
      2 + (peerStates[0].visible ? 1 : 0),
      0,
      maximumParticipants
    );
  }
  if (isPointerMode) return 1;
  if (!multiModeEnabled) {
    return primarySlotId &&
      isCursorVisible(primaryCursorTrack)
      ? 1
      : 0;
  }
  return clamp(
    (primarySlotId &&
    isCursorVisible(primaryCursorTrack)
      ? 1
      : 0) +
      peerStates.filter(
        (participant) => participant.visible
      ).length,
    0,
    maximumParticipants
  );
}

// Reduce each ripple's opacity as participant count increases to limit visual accumulation.
function currentRippleAlpha() {
  const participantCount = clamp(
    activeViewerCount(),
    1,
    maximumParticipants
  );
  return Math.max(
    0,
    faceTrack.rippleAlpha -
      (participantCount - 1) * faceTrack.rpplUseAlpSte
  );
}

// Recalculate participant count from the active-session snapshot.
function updtUserN() {
  if (!userNStts) return;
  const activeCount = activeViewerCount();
  const nextText = `Present here: ${activeCount}`;
  if (userNStts.textContent !== nextText) {
    userNStts.textContent = nextText;
  }
}

// Each call synchronizes the pointer-control button's visibility, availability,
// and guidance so the control reflects current input ownership.
function updtPtrBttn() {
  if (!inptModeCont) return;
  const mode = currentInputMode();
  inptModeCont.hidden = !gazeEnabled;
  updtUserN();
  // When there are no active participants, the same entry point becomes rejoin.
  const rejoinMode = Boolean(
    gazeEnabled &&
      !isPointerMode &&
      activeViewerCount() === 0 &&
      !gazeCalib.active &&
      !peerStates.some(isPeerCalibActive)
  );
  if (recalibButton) {
    const label = recalibButton.querySelector(
      ".recalibration-button-label"
    );
    const scanning = isManualJoinActive(gazeFrame.now || millis());
    if (label) {
      label.textContent = scanning
        ? "Scanning…"
        : rejoinMode
          ? "Rejoin"
          : "Reposition";
    }
    recalibButton.dataset.inputLabel = rejoinMode
      ? "Rejoin the ecology"
      : "Reposition";
    recalibButton.setAttribute("aria-busy", String(scanning));
  }
  // Update the visible label, accessible title, and ARIA state together.
  for (const button of inptModeBttns) {
    const selected = button.dataset.inputMode === mode;
    const label = button.dataset.inputLabel || button.textContent.trim();
    button.setAttribute("aria-pressed", String(selected));
    button.title = selected
      ? `Current mode: ${label}`
      : `Switch to ${label}`;
  }
  if (recalibButton) {
    recalibButton.setAttribute(
      "aria-expanded",
      String(Boolean(recalibMenu && !recalibMenu.hidden))
    );
  }
}

function recalibSymbol(participantId) {
  if (participantId === 1) return "( )";
  if (participantId === 2) return "[ ]";
  return "〈 〉";
}

// Retrieve the corresponding face by participant identifier; test mode uses a preset source.
function recalibFace(participantId) {
  if (participantId === 0) {
    return multiTestEnabled ? null : primaryUserFace();
  }
  if (multiTestEnabled) return faces?.[0] || null;
  const state = peerStates[participantId - 1];
  return faceSlotForAssign(state?.faceAssignmentId)?.face || null;
}

// Collect identifiers for participants who currently have face data and meet calibration conditions.
function rclbCand() {
  const participants = [];
  if (!multiTestEnabled && recalibFace(0)) {
    participants.push({ participantId: 0 });
  }
  for (const state of peerStates) {
    if (!state.visible || !state.calibrated) continue;
    if (multiTestEnabled && (skipCam || state.id !== 1)) continue;
    if (!recalibFace(state.id)) continue;
    participants.push({ participantId: state.id });
  }
  return participants;
}

function clsRclbMenu() {
  if (recalibMenu) recalibMenu.hidden = true;
  if (recalibButton) recalibButton.setAttribute("aria-expanded", "false");
}

// Recalibration resets baselines and sampling progress while
// retaining confirmed participant slots and joining relationships.
function rstrtPeerClb(participantId, now) {
  const state = peerStates[participantId - 1];
  const face = recalibFace(participantId);
  if (!state || !face || !state.visible || !state.calibrated) return false;
  const assignmentId = multiTestEnabled
    ? faceAssignSlts[0]?.assignmentId || 0
    : state.faceAssignmentId;
  const features = userFaceFetr(face);
  resetPeer(state, now);
  state.recalibrating = true;
  state.faceAssignmentId = assignmentId;
  state.calibPhase = "waiting";
  state.calibSeenAt = now;
  state.calibQueuedAt = -Infinity;
  state.calibUpdAt = now;
  state.calibPausedReason = "waiting-turn";
  state.lastSeenAt = now;
  state.latestFeatures = features ? { ...features } : null;
  return true;
}

// Recalibration enters a serial queue by participant identifier while
// other calibrated participants continue their current interactions.
function startRecalib(participantId) {
  clsRclbMenu();
  if (participantId === 0) {
    isPointerMode = false;
    pointerPresenceSrc = null;
    startCalib();
    status = "Recalibrating participant 1.";
    updtPtrBttn();
    return true;
  }
  const started = rstrtPeerClb(
    participantId,
    gazeFrame.now || millis()
  );
  status = started
    ? `Recalibrating participant ${participantId + 1}.`
    : "This participant is no longer in a calibratable state.";
  updtPtrBttn();
  return started;
}

// The recalibration menu lists participants who remain active in the interaction.
function openRclbMenu(participants) {
  if (!recalibMenu || !recalibOptions) {
    return false;
  }
  recalibOptions.replaceChildren();
  for (const participant of participants) {
    const participantId = participant.participantId;
    const button = document.createElement("button");
    const label = document.createElement("span");
    const shape = document.createElement("span");
    button.type = "button";
    button.className = "recalibration-participant-option";
    button.setAttribute("role", "menuitem");
    label.textContent = `Attention ${participantId + 1}`;
    shape.className = "recalibration-participant-shape";
    shape.textContent = recalibSymbol(participantId);
    button.append(label, shape);
    decrWaveBttn(button);
    button.addEventListener("click", () => {
      startRecalib(participantId);
    });
    recalibOptions.append(button);
  }
  recalibMenu.hidden = false;
  recalibButton?.setAttribute("aria-expanded", "true");
  recalibOptions.querySelector("button")?.focus();
  return true;
}

function requestRecalib() {
  // Calibration proceeds participant by participant; close the
  // new-request entry point while one participant is calibrating.
  if (
    gazeCalib.active ||
    peerStates.some(isPeerCalibActive)
  ) {
    clsRclbMenu();
    status = "Another participant is currently calibrating. Try again when calibration is complete.";
    return false;
  }
  // When participant count is zero, treat recalibration as rejoining and reuse the consent flow's
  // candidate selection and privacy boundary.
  if (activeViewerCount() === 0) {
    const now = gazeFrame.now || millis();
    if (rcvrMainUser(now)) return true;
    const candidates = consent.visWatc();
    if (candidates.length === 1) {
      return consent.requestJoin(candidates[0], now);
    }
    if (candidates.length > 1) {
      return consent.openPrompt("select", null, now);
    }
    return consent.rqstMnlRjn(now);
  }
  if (recalibMenu && !recalibMenu.hidden) {
    clsRclbMenu();
    return true;
  }
  const participants = rclbCand();
  if (participants.length === 0) {
    status = "No gaze participant is currently available for recalibration.";
    return false;
  }
  // A single candidate can begin directly; multiple candidates require
  // participant selection, so identity follows explicit choice.
  if (participants.length === 1) {
    return startRecalib(participants[0].participantId);
  }
  return openRclbMenu(participants);
}

// Button ripples decorate the actionable boundary; the native
// button still handles interaction hits to preserve accessibility.
function decrWaveBttn(button, seed = null) {
  if (!button || button.dataset.intrWaveBttn === "1") return button;
  button.dataset.intrWaveBttn = "1";
  button.classList.add("ecosystem-wave-button");
  const content = document.createElement("span");
  content.className = "ecosystem-wave-button-content";
  while (button.firstChild) content.append(button.firstChild);
  const wave = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  wave.classList.add("audience-consent-button-wave");
  wave.setAttribute("aria-hidden", "true");
  const surface = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  surface.classList.add("audience-consent-button-wave-surface");
  const outline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  outline.classList.add("audience-consent-button-wave-outline");
  wave.append(surface, outline);
  button.append(wave, content);
  const resolvedSeed = Number(seed);
  button.dataset.waveSeed = String(
    Number.isFinite(resolvedSeed)
      ? resolvedSeed
      : 211.37 + waveButtonSeq++ * 37.91
  );
  return button;
}

function stpWaveBttns() {
  for (const button of document.querySelectorAll("button")) {
    decrWaveBttn(button);
  }
}

// Native buttons handle invitation actions; clicks and keyboard entry share the same behavior,
// while waveforms provide visual decoration.
function audnActnBttn(label, onActivate) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "audience-consent-action";
  const labelElement = document.createElement("span");
  labelElement.className = "audience-consent-action-label";
  labelElement.textContent = label;
  button.append(labelElement);
  decrWaveBttn(
    button,
    label === "Enter" ? 211.37 : 307.91
  );
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onActivate(event);
  });
  button.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  return button;
}

function visWatcUsrs() {
  const now = gazeFrame.now || millis();
  return [...audienceStates.values()]
    .filter((audience) => consent.isJoinEligible(audience, now))
    .sort((first, second) => (first.center?.x || 0) - (second.center?.x || 0));
}

function updCnsntBttns(now) {
  // Each button holds independent noise state; when dimensions change,
  // recalculate the path while reusing existing waveform parameters.
  const buttons = document.querySelectorAll(".ecosystem-wave-button");
  for (const button of buttons) {
    const wave = button.querySelector(".audience-consent-button-wave");
    const surface = button.querySelector(
      ".audience-consent-button-wave-surface"
    );
    const outline = button.querySelector(
      ".audience-consent-button-wave-outline"
    );
    if (!wave || !surface || !outline) continue;
    const buttonWidth = button.offsetWidth;
    const buttonHeight = button.offsetHeight;
    if (!buttonWidth || !buttonHeight) continue;
    let state = cnsntBttnWvs.get(button);
    if (!state) {
      const confAmpl = Number(button.dataset.waveAmplitude);
      const waveAmplitude =
        Number.isFinite(confAmpl) && confAmpl > 0
          ? confAmpl
          : consentRules.pnlBttnWaveAmp;
      state = consent.crtWaveStt(
        Number(button.dataset.waveSeed) || 211.37,
        consentRules.pnlWavSmtPss,
        waveAmplitude,
        consentRules.pnlBttWavPnt
      );
      cnsntBttnWvs.set(button, state);
    }
    consent.updtWaveOffst(state, now);
    wave.setAttribute("viewBox", `0 0 ${buttonWidth} ${buttonHeight}`);
    const metrics = cnsntPnlMtrcs(
      buttonWidth - 6,
      buttonHeight - 6,
      0,
      Math.max(6, buttonHeight * 0.5 - 3),
      3
    );
    const points = Array.from(
      { length: state.samples.length },
      (_, index) =>
        consent.wavePoint(
          metrics,
          (metrics.perimeter * index) / state.samples.length,
          state
        )
    );
    const path = consent.closedWavePath(points);
    surface.setAttribute("d", path);
    outline.setAttribute("d", path);
  }
}


// One frame loop centrally updates consent-interface waveforms;
// scheduling stops while the panel is hidden to reduce background drawing.
function updCnsWavFrm(now) {
  if (
    !consentPanel ||
    consentPanel.hidden ||
    !consentPanel.dataset.promptMode
  ) {
    return;
  }
  updtPnlWave({
    panel: consentPanel,
    svg: cnsntWaveFrm,
    surface: cnsntWaveSrfc,
    topLeft: cnsnWavTopLef,
    bottomRight: consentWaveBR,
    waves: cnsntWaveStts,
    size: cnsntWaveSize,
    now,
  });
}

function cnclCnsntFade() {
  if (cnsntFadeTmr === null) return;
  clearTimeout(cnsntFadeTmr);
  cnsntFadeTmr = null;
}

// When showing the invitation panel, synchronize accessible state and
// the ripple clock so visual appearance aligns with keyboard focus.
function showCnsntPnl() {
  if (!consentPanel) return;
  const shouldFadeIn =
    consentPanel.hidden ||
    consentPanel.classList.contains("audience-consent-leaving");
  consent.cancelFade();
  consentPanel.classList.remove("audience-consent-leaving");
  consentPanel.hidden = false;
  if (!shouldFadeIn) return;
  consentPanel.classList.remove("audience-consent-entering");
  void consentPanel.offsetWidth;
  consentPanel.classList.add("audience-consent-entering");
  cnsntFadeTmr = setTimeout(() => {
    cnsntFadeTmr = null;
    consentPanel?.classList.remove("audience-consent-entering");
  }, consentRules.transitionMs);
}

function hideCnsntPnl() {
  if (!consentPanel || consentPanel.hidden) return false;
  if (consentPanel.classList.contains("audience-consent-leaving")) {
    return true;
  }
  consent.cancelFade();
  consentPanel.classList.remove("audience-consent-entering");
  void consentPanel.offsetWidth;
  consentPanel.classList.add("audience-consent-leaving");
  cnsntFadeTmr = setTimeout(() => {
    cnsntFadeTmr = null;
    if (audiencePrompt || !consentPanel) return;
    consentPanel.hidden = true;
    consentPanel.classList.remove("audience-consent-leaving");
  }, consentRules.transitionMs);
  return true;
}

// Route consent, cancellation, and selection centrally so
// every entry point uses the same presence and slot validation.
function hndlCnsntActn(action, assignmentId = 0) {
  const now = gazeFrame.now || millis();
  if (action === "cancel") {
    consent.closePrompt();
    return;
  }
  if (action === "select") {
    const audience = audienceStates.get(assignmentId);
    consent.closePrompt();
    consent.requestJoin(audience, now);
    return;
  }
  const audience = audienceStates.get(audiencePrompt?.assignmentId);
  if (!audience) {
    consent.closePrompt();
    return;
  }
  if (action === "watch") {
    qTrnsStts(statusCopy.observeOnly, now);
    consent.closePrompt("watching");
    return;
  }
  if (action === "queue") {
    audience.status = "queued";
    audience.queuedAt = now;
    consent.closePrompt();
    return;
  }
  if (action === "join") {
    if (!consent.requestJoin(audience, now)) consent.closePrompt("watching");
  }
}

// The consent panel presents choices to join, queue, or cancel an invitation.
function rndrCnsntUi() {
  if (
    !consentPanel ||
    !cnsntPos ||
    !consentTitle ||
    !consentMessage ||
    !consentActions
  ) {
    return;
  }
  consent.updtPlcm();
  // The current viewer and available input jointly determine the joining entry point;
  // willingness to participate comes from the explicit choice made this time.
  const watching = consent.visWatc();
  const isMainRjnRdy = canRcvrMain();
  const canMnlDtct = Boolean(
    gazeEnabled &&
      !skipCam &&
      !isPointerMode &&
      camReady &&
      activeViewerCount() === 0 &&
      !gazeCalib.active &&
      !peerStates.some(isPeerCalibActive)
  );
  const prmpAudn = audiencePrompt?.assignmentId
    ? audienceStates.get(audiencePrompt.assignmentId)
    : null;
  const shldShoPrmPos = detectedFaceCount() > 1;
  // The cache key contains semantic state that affects the interface.
  const renderKey = JSON.stringify({
    promptMode: audiencePrompt?.mode || "",
    prmptAssignId: audiencePrompt?.assignmentId || 0,
    promptPosition: prmpAudn
      ? audnPosLbl(prmpAudn)
      : "",
    shldShoPrmPos,
    promptLayout: audiencePrompt?.placement?.layout || "",
    detectedFaceCount: detectedFaceCount(),
    isMainRjnRdy,
    canMnlDtct,
    watching: watching.map((audience) => [
      audience.assignmentId,
      audnPosLbl(audience),
    ]),
  });
  if (renderKey === cnsntRndrKey) return;
  cnsntRndrKey = renderKey;
  // Hide the panel when the pending-confirmation list is empty;
  // joinable or recoverable states continue to provide an intentional joining entry point.
  if (!audiencePrompt) {
    consent.hidePanel();
    setJoinAvlb(
      watching.length > 0 ||
        isMainRjnRdy ||
        canMnlDtct
    );
    return;
  }
  consentActions.replaceChildren();
  consent.showPanel();
  consentPanel.dataset.promptMode = audiencePrompt.mode;
  setJoinAvlb(false);
  // guidance uses an independent text node to emphasize the action,
  // preserving accessible DOM structure and a plain-text write boundary.
  if (audiencePrompt.mode === "guidance") {
    cnsntPos.textContent = "";
    consentTitle.textContent = "";
    const moveEmphasis = Object.assign(document.createElement("span"), {
      className: "audience-consent-guidance-emphasis",
      textContent: "move",
    });
    const tryEmphasis = Object.assign(document.createElement("span"), {
      className: "audience-consent-guidance-emphasis",
      textContent: "try",
    });
    const moveLine = Object.assign(document.createElement("span"), {
      className: "audience-consent-guidance-line",
    });
    moveLine.append(
      "3. Now ",
      moveEmphasis,
      " your head and eyes to guide the target,"
    );
    const tryLine = Object.assign(document.createElement("span"), {
      className: "audience-consent-guidance-line",
    });
    tryLine.append(
      "4.Then ",
      tryEmphasis,
      ": short stay, longer linger, or eyes closed."
    );
    consentMessage.replaceChildren(moveLine, tryLine);
    return;
  }
  // When several viewers are present, list their current visible positions;
  // the selection remains bound to a temporary slot identifier.
  if (audiencePrompt.mode === "select") {
    cnsntPos.textContent = "";
    consentTitle.textContent = "Who would like to join?";
    consentMessage.textContent = "Select your position.";
    for (const audience of watching) {
      consentActions.append(
        audnActnBttn(audnPosLbl(audience), () => {
          consent.handleAction("select", audience.assignmentId);
        })
      );
    }
    consentActions.append(
      audnActnBttn("Cancel", () => consent.handleAction("cancel"))
    );
    return;
  }
  const audience = audienceStates.get(audiencePrompt.assignmentId);
  if (!audience) {
    consent.closePrompt();
    return;
  }
  cnsntPos.textContent = shldShoPrmPos
    ? `New viewer · ${audnPosLbl(audience)}`
    : "";
  // Full capacity, open-slot invitations, and first-time joining provide different choices.
  if (audiencePrompt.mode === "full") {
    consentTitle.textContent = "Interaction full";
    consentMessage.textContent = "Join queue?";
    consentActions.append(
      audnActnBttn("Join queue", () => consent.handleAction("queue")),
      audnActnBttn("Observe only", () => consent.handleAction("watch"))
    );
    return;
  }
  if (audiencePrompt.mode === "slot") {
    consentTitle.textContent = "A space is available";
    consentMessage.textContent = "Join now?";
    consentActions.append(
      audnActnBttn("Join now", () => consent.handleAction("join")),
      audnActnBttn("Not now", () => consent.handleAction("watch"))
    );
    return;
  }
  consentTitle.textContent = "Enter the ecosystem?";
  consentMessage.textContent = "New attention has arrived.";
  consentActions.append(
    audnActnBttn("Enter", () => consent.handleAction("join")),
    audnActnBttn("Observe only", () => consent.handleAction("watch"))
  );
}

function stpCnsntCont() {
  // Bind DOM references centrally once; repeated setup first clears
  // transition state while retaining a single set of event listeners.
  consent.cancelFade();
  consentPanel = document.getElementById("audience-consent-panel");
  cnsntWaveFrm = document.getElementById(
    "audience-consent-wave-frame"
  );
  cnsntWaveSrfc = document.getElementById(
    "audience-consent-wave-surface"
  );
  cnsnWavTopLef = document.getElementById(
    "audience-consent-wave-top-left"
  );
  consentWaveBR = document.getElementById(
    "audience-consent-wave-bottom-right"
  );
  if (consentPanel) {
    consentPanel.classList.remove(
      "audience-consent-entering",
      "audience-consent-leaving"
    );
    consentPanel.hidden = true;
  }
  cnsntPos = document.getElementById("audience-consent-position");
  consentTitle = document.getElementById("audience-consent-title");
  consentMessage = document.getElementById("audience-consent-message");
  consentActions = document.getElementById("audience-consent-actions");
  joinButton = document.getElementById("audience-join-request");
  setJoinAvlb(false);
  if (
    joinButton &&
    joinButton.dataset.gazeCtrlBnd !== "1"
  ) {
    joinButton.dataset.gazeCtrlBnd = "1";
    joinButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const now = gazeFrame.now || millis();
      if (rcvrMainUser(now)) return;
      // A single candidate can be requested directly; multiple candidates require selection,
      // while zero candidates enter manual rejoining.
      const watching = consent.visWatc();
      if (watching.length === 1) {
        consent.requestJoin(watching[0], now);
      } else if (watching.length > 1) {
        consent.openPrompt("select", null, now);
      } else {
        consent.rqstMnlRjn(now);
      }
    });
    joinButton.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }
  consent.render();
}

// Input mode changes the source of control, while ecological
// relationships continue using the same interaction language.
function setInputMode(mode) {
  if (!gazeEnabled) return false;
  if (mode === "pointer") return setPtrCtrlOn(true);
  ptrFallback = "";
  if (mode === "calibrating") {
    return requestRecalib();
  }
  if (mode !== "eye-head") return false;

  // When returning to gaze mode, first clear offsets and presence sources owned by the mouse.
  const wasPtrCtrlOn = isPointerMode;
  isPointerMode = false;
  pointerPresenceSrc = null;
  clrPtrFallback();
  eyeInput.offsetX = 0;
  eyeInput.offsetY = 0;
  quietFrames = 0;
  if (!primarySlotId) {
    gazeCalib.active = false;
    headCenter.calibrating = false;
    status = "Confirm joining through the viewer invitation first.";
    updtPtrBttn();
    return true;
  }
  // Recalibrate after leaving mouse control or when the gaze
  // baseline is absent; new samples generate the center point.
  const needsCalib =
    wasPtrCtrlOn || !eyeInput.calibrated || !headCenter.ready;
  if (needsCalib) {
    startCalib();
    status = wasPtrCtrlOn
      ? "Switched away from mouse control. Recalibrate eye + head mode."
      : "Eye + head mode must be calibrated first.";
  } else {
    gazeCalib.active = false;
    headCenter.calibrating = false;
    status = "Switched to eye + head mode.";
    qTrnsStts(statusCopy.gazeEnabled);
  }
  updtPtrBttn();
  return true;
}

// Switch safely between pointer and gaze control, uniformly
// resetting interaction state specific to each input mode.
function setPtrCtrlOn(enabled, source = "manual-participant") {
  if (!gazeEnabled) return false;
  if (enabled && multiTestEnabled) {
    status = "Three-participant test: participant 1 uses the mouse; participant 2 remains in gaze-calibration mode.";
    updtPtrBttn();
    return false;
  }
  const wasPtrCtrlOn = isPointerMode;
  isPointerMode = Boolean(enabled);
  pointerPresenceSrc = isPointerMode ? source : null;
  // A pointer created by detection fallback begins on an independent path;
  // manual mode clears the automatic fallback reason.
  if (pointerPresenceSrc === "tracking-fallback") {
    rstCrsrTrack(primaryCursorTrack, "inactive");
  } else {
    clrPtrFallback();
  }
  ptrFallback = "";
  if (isPointerMode) {
    clrJoinRqst();
    gazeCalib.active = false;
    headCenter.calibrating = false;
    strtCellLife();
  }
  quietFrames = 0;
  status = isPointerMode
    ? "Mouse control is enabled."
    : "Mouse control is disabled.";
  // Show a notice and play the join sound when a participant
  // switches intentionally; remain silent during system fallback.
  if (source === "manual-participant") {
    qTrnsStts(
      isPointerMode
        ? statusCopy.pointerEnabled
        : statusCopy.ptrOff
    );
    if (isPointerMode && !wasPtrCtrlOn) {
      window.SoundApp?.cue?.("participant-join", {
        key: "participant-join:pointer-mode-switch",
        cooldownKey: "participant-join:pointer-mode-switch",
        cooldownMs: 1,
        participantCount: jndSndN(),
        x: gaze.x,
        stability: 0.75,
        inputMode: "pointer",
        priority: 2,
        reverbMix: 0,
      });
    }
  }
  updtPtrBttn();
  return true;
}

function setupPtrButton() {
  // Control binding uses dataset to prevent duplicate registration;
  // clicks outside the menu close the recalibration selection.
  inptModeCont = document.getElementById("input-mode-controls");
  userNStts = document.getElementById(
    "interaction-participant-count"
  );
  recalibButton = document.getElementById("recalibration-button");
  recalibMenu = document.getElementById(
    "recalibration-participant-menu"
  );
  recalibOptions = document.getElementById(
    "recalibration-participant-options"
  );
  inptModeBttns = inptModeCont
    ? Array.from(inptModeCont.querySelectorAll("[data-input-mode]"))
    : [];
  ptrCtrlBttn = document.getElementById(
    "pointer-control-toggle"
  );
  if (!inptModeCont || !ptrCtrlBttn) return;
  for (const button of inptModeBttns) {
    if (button.dataset.gazeCtrlBnd === "1") continue;
    button.dataset.gazeCtrlBnd = "1";
    button.addEventListener("click", () => {
      setInputMode(button.dataset.inputMode);
    });
  }
  if (inptModeCont.dataset.rclbDsmssBnd !== "1") {
    inptModeCont.dataset.rclbDsmssBnd = "1";
    document.addEventListener("pointerdown", (event) => {
      if (recalibMenu?.hidden) return;
      if (inptModeCont.contains(event.target)) return;
      clsRclbMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") clsRclbMenu();
    });
    document.addEventListener("keydown", onInpModKyd, true);
  }
  updtPtrBttn();
}

// Handle page input-mode shortcuts, ignoring editable areas, controls,
// the reset dialog, reader mode, and Alt, Ctrl, or Meta combinations.
function onInpModKyd(event) {
  const target = event.target;
  const mode = event.code === "KeyG"
    ? "eye-head"
    : event.code === "KeyB"
      ? "pointer"
      : null;
  if (
    !mode ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    target?.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "") ||
    target?.closest?.("button, a[href]") ||
    !document.getElementById("maintenance-reset-overlay")?.hidden
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  setInputMode(mode);
}

// Pointer movement updates manually controlled presence time;
// system-generated cursor motion remains in the visual-feedback layer.
function pointerMoved(x, y) {
  if (!gazeEnabled) return false;
  const limited = clampGaze(x, y);
  if (multiTestEnabled) {
    smoothGaze.ready = true;
    smoothGaze.x = limited.x;
    smoothGaze.y = limited.y;
    gaze.x = limited.x;
    gaze.y = limited.y;
    gaze.targetX = limited.x;
    gaze.targetY = limited.y;
    quietFrames = 0;
    return true;
  }
  if (!isPointerMode) return multiTestEnabled;
  if (pointerPresenceSrc === "tracking-fallback") {
    setPtrCtrlOn(true, "manual-participant");
  }
  smoothGaze.ready = true;
  smoothGaze.x = limited.x;
  smoothGaze.y = limited.y;
  gaze.targetX = limited.x;
  gaze.targetY = limited.y;
  quietFrames = 0;
  return true;
}

const { facePoints, getFaceBox, meanPoints, pointDist } =
  window.GazeSupport.face;

// 14. Organize perception into a current snapshot that other systems can read safely
// Lifecycle entry points initialize and reset perception resources;
// public snapshots deliver copies of state to the interaction layer.
function setup(options = {}) {
  gazeEnabled = Boolean(options.enabled);
  rstGazeRndm();
  cells = [];
  primaryFaceAssignId = 0;
  primarySlotId = 0;
  faceDtcStaAt = -Infinity;
  lastFaceResultAt = -Infinity;
  isFaceRetrying = false;
  isFaceScanWait = false;
  joinRqstUntl = -Infinity;
  audiencePrompt = null;
  audienceStates.clear();
  cnsntRndrKey = "";
  rstCrsrTrack(primaryCursorTrack, "inactive");
  cellLifecycleStarted = false;
  cellSpwnStts.clear();
  eyeInput.faceGoneAt = null;
  setupPtrButton();
  consent.setup();
  stpWaveBttns();
  if (!gazeEnabled) return;
  if (isPointerMode) strtCellLife();
  if (faceMesh) startTrack();
}

function update(frame) {
  // Perception, consent, and participant states update first;
  // ecological cells then read the frame's stabilized input.
  gazeFrame.dt = frame.dt;
  gazeFrame.now = frame.now;
  updtRhythGd();
  consent.updtBttnWvs(gazeFrame.now);
  consent.updtWaveFrm(gazeFrame.now);
  if (!gazeEnabled) return;
  ensrFaceHlthy();
  updateCam();
  updatePeers(gazeFrame.now);
  updKeyTesPee();
  updtPeerTrcs(gazeFrame.now);
  updtPtrBttn();
  // Consent determines whether paths are recorded; calibration determines whether lifecycles begin;
  // the two permissions are validated separately.
  const acceptedUser = Boolean(
    isPointerMode ||
      multiTestEnabled ||
      primarySlotId ||
      testUserSnapshots?.length
  );
  const calibratedUser = Boolean(
    isPointerMode ||
      multiTestEnabled ||
      testUserSnapshots?.length ||
      (primarySlotId &&
        eyeInput.calibrated &&
        headCenter.ready &&
        clbOvrlyAlph(gazeFrame.now) <= 0) ||
      peerStates.some(
        (participant) => participant.faceAssignmentId && participant.calibrated
      )
  );
  if (calibratedUser) {
    strtCellLife(gazeFrame.now);
  }
  updateGaze();
  if (acceptedUser) recordGazePath(gazeFrame.now);
  updateGrowth(gazeFrame.now);
  for (const cell of cells) cell.update(gazeFrame);
  cells = cells.filter((cell) => !cell.dead);
  seprBscClls();
}

function drawScene() {
  if (!gazeEnabled) return;
  for (const cell of cells) cell.draw(gazeFrame);
  drawTrace();
  drawPeerTraces();
}

// Compose input overlays according to privacy, calibration, and multi-participant state,
// then draw all currently visible participant cursors.
function drawOverlay(frame, visualLayers = null) {
  if (!gazeEnabled) return;
  const calibAlpha = multiTestEnabled
    ? 0
    : clbOvrlyAlph(gazeFrame.now);
  const mainClbVis = Boolean(
    !multiTestEnabled &&
      (gazeCalib.active || calibAlpha > 0)
  );
  // Primary calibration covers the primary cursor; other participants
  // and system feedback continue to draw on independent layers.
  if (mainClbVis) {
    if (multiModeEnabled) {
      drawMainClb(
        calibAlpha,
        gazeFrame.now,
        visualLayers
      );
    } else {
      drawClbOvrly(calibAlpha);
    }
  } else {
    drawCursor();
  }
  if (multiTestEnabled) {
    if (skipCam) {
      drawTestCursor(testPeerStates[0]);
    } else {
      drawPeerCursor(peerStates[0]);
    }
    drawTestCursor(testPeerStates[1]);
  } else if (!isPointerMode) {
    for (const participant of peerStates) {
      drawPeerCursor(participant);
    }
  }
  if (!isPointerMode && (!multiTestEnabled || !skipCam)) {
    drawPeeClbOvr(gazeFrame.now, visualLayers);
  }
  drawEyeRipple(gazeFrame.now);
  drawPrdtRppl(gazeFrame.now);
  if (!mainClbVis && calibAlpha <= 0) drawStatus();
}

function didGazVieChn(change) {
  const previous = change?.previous;
  const next = change?.next;
  return Boolean(
    previous &&
      next &&
      Number.isFinite(previous.width) &&
      Number.isFinite(previous.height) &&
      Number.isFinite(next.width) &&
      Number.isFinite(next.height) &&
      (previous.width !== next.width || previous.height !== next.height)
  );
}

// Scale coordinate pairs when the viewport changes so gaze paths and
// calibration relationships retain their original relative positions.
function remapGazePair(
  value,
  xKey,
  yKey,
  previous,
  next,
  remappedPairs
) {
  if (!value || typeof value !== "object") return false;
  const x = value[xKey];
  const y = value[yKey];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  let valuePairs = remappedPairs.get(value);
  if (!valuePairs) {
    valuePairs = new Set();
    remappedPairs.set(value, valuePairs);
  }
  const pairKey = `${xKey}:${yKey}`;
  if (valuePairs.has(pairKey)) return false;
  valuePairs.add(pairKey);

  value[xKey] = (x / previous.width) * next.width;
  value[yKey] = (y / previous.height) * next.height;
  return true;
}

function remapGazeState(change) {
  if (!didGazVieChn(change)) return false;
  const { previous, next } = change;
  // WeakMap records shared coordinate objects that have already been scaled.
  const remappedPairs = new WeakMap();
  const remap = (value, xKey = "x", yKey = "y") =>
    remapGazePair(
      value,
      xKey,
      yKey,
      previous,
      next,
      remappedPairs
    );

  remap(gaze);
  remap(gaze, "targetX", "targetY");
  remap(smoothGaze);
  remap(eyeInput.closureGaze);
  for (const point of gazePath) remap(point);
  for (const point of traces) remap(point);
  for (const effect of eyeRippleFx.values()) remap(effect);
  for (const effect of predatorRipples.values()) remap(effect);

  // Entity positions, motion anchors, and active paths must
  // migrate together so animation remains continuous after scaling.
  for (const cell of cells) {
    remap(cell);
    remap(cell, "x0", "y0");
    remap(cell.cruiseCenter);
    remap(cell.directAppr, "startX", "startY");
    remap(cell.cellReturnHold);
    for (const point of cell.followPath || []) remap(point);
  }
  for (const participant of peerStates) {
    remap(participant.gaze);
    remap(participant.gaze, "targetX", "targetY");
    remap(participant.eyes?.closureGaze);
    for (const point of participant.traces || []) remap(point);
  }
  for (const participant of testPeerStates) {
    remap(participant.gaze);
    for (const point of participant.traces || []) remap(point);
  }
  for (const participant of testUserSnapshots || []) {
    remap(participant.gaze);
    remap(participant.eyes?.closureGaze);
  }
  for (const assist of aimStates) {
    remap(assist.rawGaze);
    remap(assist.logicalGaze);
  }
  return true;
}

function resize(viewportChange = null) {
  if (!gazeEnabled) return;
  remapGazeState(viewportChange);
  // The offscreen calibration layer depends on old pixel dimensions;
  // destroy it after viewport changes and rebuild it on demand.
  if (extrClbLyr) {
    extrClbLyr.remove();
    extrClbLyr = null;
  }
  const limited = clampGaze(gaze.x, gaze.y);
  gaze.x = limited.x;
  gaze.y = limited.y;
  const limitedTarget = clampGaze(gaze.targetX, gaze.targetY);
  gaze.targetX = limitedTarget.x;
  gaze.targetY = limitedTarget.y;
  if (!gazePath.length) {
    gazePath = [{ x: limited.x, y: limited.y, at: millis() }];
  }
  lastGazePathAt = gazePath[gazePath.length - 1].at;
  if (audiencePrompt) {
    audiencePrompt.placement = makePrmptPlcm(
      audiencePrompt.mode
    );
    cnsntRndrKey = "";
    consent.render();
  }
  // Active calibration for other participants returns to a safe area to wait.
  for (const participant of peerStates) {
    if (!isPeerCalibPending(participant)) continue;
    if (participant.calibPhase === "confirming") continue;
    participant.calibPhase = "waiting";
    participant.calibQueuedAt = gazeFrame.now;
    participant.calibUpdAt = gazeFrame.now;
    participant.calibValidMs = 0;
    participant.calibStableMs = 0;
    participant.calibSampleAt = -Infinity;
    participant.calibCompletedAt = null;
    participant.calibInvalidAt = null;
    participant.calibBadAt = null;
    participant.calibPausedReason = "waiting-safe-area";
    participant.calibTarget = null;
    participant.calibStable.length = 0;
    participant.calibSamples.length = 0;
    participant.neutral = null;
  }
  if (multiTestEnabled) {
    for (const participant of testPeerStates) {
      const userGaze = clampGaze(
        participant.gaze.x,
        participant.gaze.y
      );
      participant.gaze.x = userGaze.x;
      participant.gaze.y = userGaze.y;
    }
  }
  if (!isPointerMode && gazeCalib.active) {
    startCalib();
    status = "The viewport size changed. Complete baseline calibration again.";
  }
}

function keyPressed(value) {
  if (!gazeEnabled) return false;
  if (value === "m" || value === "M") return enblMltMode();
  if (value !== "c" && value !== "C") return false;
  return setInputMode("calibrating");
}

// Return a new array of available BasicCells whose objects still reference the current entities.
function targets() {
  return cells.filter(
    (cell) =>
      !cell.differentiating &&
      !cell.directAppr &&
      !cell.encounterLock &&
      !cell.cellReturnHold
  );
}

// Save the original position and endpoint when target approach begins;
// interpolation uses parameters from the starting snapshot.
function bgnTgtAppr(target, x, y, duration, now = gazeFrame.now) {
  if (
    !target ||
    !cells.includes(target) ||
    target.dead ||
    target.differentiating ||
    target.directAppr
  ) {
    return null;
  }
  target.directAppr = {
    startedAt: now,
    duration: max(1, duration),
    startX: target.x0,
    startY: target.y0,
  };
  return updtTgtAppr(target, x, y, now);
}

function updtTgtAppr(target, x, y, now = gazeFrame.now) {
  const approach = target?.directAppr;
  if (!approach || target.dead || target.differentiating) return null;
  const progress = constrain(
    (now - approach.startedAt) / approach.duration,
    0,
    1
  );
  const eased = cubicSmoothstep(progress);
  const projected = world.project(
    lerp(approach.startX, x, eased),
    lerp(approach.startY, y, eased),
    20
  );
  target.x0 = projected.x;
  target.y0 = projected.y;
  target.x = projected.x;
  target.y = projected.y;
  return { progress, complete: progress >= 1 };
}

// Cancel approach and release the movement plan, retaining the target's
// current coordinates so natural motion can take over continuously.
function cnclTgtAppr(target) {
  if (!target?.directAppr) return false;
  target.directAppr = null;
  return true;
}

// Select a living, idle BasicCell and begin its differentiation transition.
function beginCellDiff(
  duration = cellRules.diffDuration,
  colorDuration = cellRules.diffColorMs72,
  colors = null,
  alphas = null
) {
  const cell = cells.find((candidate) =>
    !candidate.dead &&
    !candidate.differentiating &&
    !candidate.directAppr
  );
  if (!cell) return null;
  return cell.beginDiff(
    gazeFrame.now,
    duration,
    colorDuration,
    colors,
    alphas
  )
    ? cell
    : null;
}

// Verify that the target cell remains in the collection and can
// differentiate before supplying duration and color parameters.
function bgnTgtDiff(
  target,
  duration = cellRules.diffDuration,
  colorDuration = cellRules.diffColorMs72,
  colors = null,
  alphas = null,
  now = gazeFrame.now
) {
  if (
    !target ||
    !cells.includes(target) ||
    target.dead ||
    target.differentiating
  ) {
    return null;
  }
  return target.beginDiff(
    now,
    duration,
    colorDuration,
    colors,
    alphas
  )
    ? target
    : null;
}

// Verify that the target cell remains available before starting a fade-out of the specified duration.
function bgnTgtFadeOut(target, duration, now = gazeFrame.now) {
  if (
    !target ||
    !cells.includes(target) ||
    target.dead ||
    target.differentiating
  ) {
    return null;
  }
  return target.beginFadeOut(now, duration) ? target : null;
}

// Export copies of eye-opening ripple data still playing; GazeEngine retains ownership of input state.
function getEyeReopenEffects(now = gazeFrame.now || 0) {
  return [...eyeRippleFx.values()].map((effect) => ({
    participantId: effect.participantId,
    closureSequence: effect.closureSequence,
    position: { x: effect.x, y: effect.y },
    progress: clamp(
      (now - effect.startedAt) / faceTrack.eyeRippleMs,
      0,
      1
    ),
    durationMs: faceTrack.eyeRippleMs,
  }));
}

function primarySnapshot() {
  // Every object and array is a copy of current state.
  const spawnTimerPaused =
    cellLifecycleStarted && isEncounterActive();
  const inputActive = isGazeControlActive();
  const inputMode = currentInputMode();
  const participantCount = activeViewerCount();
  return {
    participantId: 0,
    cursorShape: userCursorShape(0),
    faceAssignmentId: primaryFaceAssignId,
    enabled: gazeEnabled,
    camReady,
    detecting,
    // The heartbeat exposes time since the last result and retry state;
    // raw detection output remains in the perception layer.
    detectionHeartbeatAgeMs: Number.isFinite(lastFaceResultAt)
      ? max(0, faceDetectionNow() - lastFaceResultAt)
      : null,
    detectionRestartScheduled: isFaceRetrying,
    manualJoinPending: isManualJoinActive(gazeFrame.now),
    inputActive,
    inputMode,
    engagementState: isPointerMode
      ? null
      : eyeInput.engagementState,
    pointerActive: inputActive && isPointerMode,
    isPointerMode,
    pointerPresenceSrc,
    cursorTracking: { ...primaryCursorTrack },
    multiTestEnabled,
    multiModeEnabled,
    cellLifecycleStarted,
    faceCount: detectedFaceCount(),
    traceCount: traces.length,
    rippleAlpha: currentRippleAlpha(),
    eyeRippleFx: getEyeReopenEffects(),
    predatorRippleCount: predatorRipples.size,
    pathPointCount: gazePath.length,
    // Count stable and transitioning cells separately.
    cellCount: cells.filter((cell) => !cell.differentiating).length,
    cellCountLimit: currentCellLimit(),
    cellCountLimitPerParticipant:
      cellLimitPerUser(participantCount),
    countedCellCount: gazeBirthCellCount(),
    cellCountsByParticipant: Array.from(
      { length: maximumParticipants },
      (_, participantId) => gazeBirthCellCount(participantId)
    ),
    transitioningCellCount: cells.filter(
      (cell) => cell.differentiating
    ).length,
    spawnTimerPaused,
    gaze: { x: gaze.x, y: gaze.y },
    // Head and eye outputs expose derived signals required for interaction;
    // facial geometry and images remain in the perception layer.
    head: {
      ready: headCenter.ready,
      calibrating: headCenter.calibrating,
      neutralRoll: headCenter.roll,
      neutralFaceScale: headCenter.faceScale,
    },
    eyes: {
      available: eyeInput.available,
      calibrated: eyeInput.calibrated,
      valid: eyeInput.valid,
      state: eyeInput.state,
      engagementState: eyeInput.engagementState,
      open: eyeInput.leftOpen && eyeInput.rightOpen,
      leftOpen: eyeInput.leftOpen,
      rightOpen: eyeInput.rightOpen,
      confidence: eyeInput.confidence,
      confidenceX: eyeInput.confidenceX,
      confidenceY: eyeInput.confidenceY,
      validX: eyeInput.validX,
      validY: eyeInput.validY,
      offsetX: eyeInput.offsetX,
      offsetY: eyeInput.offsetY,
      closurePhase: eyeInput.closurePhase,
      closureSequence: eyeInput.closureSequence,
      longClosureSequence: eyeInput.longClosureSequence,
      closureDurationMs: eyeInput.closureDurationMs,
      lastClosureDurMs: eyeInput.lastClosureDurMs,
      reopenStartedAt: eyeInput.reopenStartedAt,
      visualAlpha: eyeClosureVisAlpha(eyeInput),
    },
    // The calibration snapshot provides progress and failure reason.
    calibration: {
      active: gazeCalib.active,
      pointIndex: gazeCalib.pointIndex,
      pointCount: calibPoints.length,
      quality: gazeCalib.quality,
      rejected: gazeCalib.rejected,
      failureReason: gazeCalib.failureReason,
      lastCompletedAt: gazeCalib.lastCompletedAt,
    },
    status,
  };
}

function peerSnapshot(participant) {
  // Companion snapshots provide corresponding input and calibration state;
  // the primary snapshot counts total cells.
  return {
    participantId: participant.id,
    cursorShape: userCursorShape(participant.id),
    faceAssignmentId: participant.faceAssignmentId,
    enabled: gazeEnabled,
    camReady,
    detecting,
    inputActive: Boolean(
      participant.visible &&
        participant.eyes.valid &&
        participant.cursorTracking.phase === "tracking"
    ),
    inputMode: "eye-head",
    engagementState: participant.eyes.engagementState,
    pointerActive: false,
    isPointerMode: false,
    cursorTracking: { ...participant.cursorTracking },
    faceCount: participant.visible ? 1 : 0,
    traceCount: participant.traces.length,
    rippleAlpha: currentRippleAlpha(),
    pathPointCount: 0,
    cellCount: 0,
    transitioningCellCount: 0,
    spawnTimerPaused: isEncounterActive(),
    gaze: { x: participant.gaze.x, y: participant.gaze.y },
    head: {
      ready: participant.calibrated,
      calibrating: isPeerCalibActive(participant),
    },
    eyes: {
      ...participant.eyes,
      visualAlpha: eyeClosureVisAlpha(participant.eyes),
    },
    calibration: {
      active: isPeerCalibActive(participant),
      pointIndex: 0,
      pointCount: 1,
      quality: participant.calibrated ? "good" : "calibrating",
      rejected: false,
      failureReason: "",
      lastCompletedAt: participant.calibCompletedAt,
    },
    status: participant.calibrated
      ? "Your eyes and head are guiding the target together."
      : "Look directly at the screen and prepare for calibration.",
  };
}

// Expose a summary of calibration-queue state while hiding internal samples and face-detection data.
function peerCalibQueue() {
  let waitingPosition = 0;
  return peerStates
    .filter(isPeerCalibPending)
    .sort((first, second) => {
      if (isPeerCalibActive(first)) return -1;
      if (isPeerCalibActive(second)) return 1;
      return (first.calibQueuedAt || 0) - (second.calibQueuedAt || 0);
    })
    .map((participant) => ({
      participantId: participant.id,
      cursorShape: userCursorShape(participant.id),
      phase: participant.calibPhase,
      queuePosition: isPeerCalibActive(participant)
        ? 0
        : ++waitingPosition,
      progress: peerCalibProgress(participant),
      pausedReason: participant.calibPausedReason,
      target: participant.calibTarget
        ? { ...participant.calibTarget }
        : null,
    }));
}

// Test participants use the same field structure as real snapshots;
// the real path independently manages camera identity and calibration samples.
function testPeerSnapshot(participant) {
  return {
    participantId: participant.id,
    cursorShape: userCursorShape(participant.id),
    enabled: gazeEnabled,
    camReady,
    detecting: false,
    inputActive: true,
    inputMode: participant.inputMode,
    engagementState:
      participant.inputMode === "eye-head" ? "gaze-engagement" : null,
    pointerActive: participant.inputMode === "pointer",
    isPointerMode: participant.inputMode === "pointer",
    keyboardActive: participant.inputMode === "keyboard",
    multiTestEnabled: true,
    faceCount: 0,
    traceCount: participant.traces.length,
    rippleAlpha: currentRippleAlpha(),
    pathPointCount: 0,
    cellCount: 0,
    transitioningCellCount: 0,
    spawnTimerPaused: isEncounterActive(),
    gaze: { x: participant.gaze.x, y: participant.gaze.y },
    eyes: {
      available: false,
      calibrated: false,
      valid: true,
      state: "open",
      engagementState: "gaze-engagement",
      open: true,
    },
    calibration: { active: false, quality: "simulated" },
    status: participant.inputMode === "eye-head"
      ? "Multi-participant test: simulated gaze input"
      : "Multi-participant test: arrow-key input",
  };
}

function setTestParticipants(participants) {
  // Simulated participants may be written in test mode with the camera disabled.
  if (!skipCam || !Array.isArray(participants)) return false;
  const previousTestUsers = testUserSnapshots;
  // Count remains constrained by the live participation limit
  // so test paths and live sessions use the same capacity rules.
  testUserSnapshots = participants
    .slice(0, maximumParticipants)
    .map((participant, index) => {
      const requestedState = participant?.engagementState;
      const requestedBlinkPhase = participant?.closurePhase;
      // Normalize external test values to the live eye-closure stages;
      // treat all other states as eyes open.
      const closurePhase = [
        "blink",
        "short-hold",
        "long-interrupt",
        "reopening",
      ].includes(requestedBlinkPhase)
        ? requestedBlinkPhase
        : requestedState === "rest"
          ? "short-hold"
          : "open";
      const closureActive =
        closurePhase === "blink" ||
        closurePhase === "short-hold" ||
        closurePhase === "long-interrupt";
      const engagementState =
        closurePhase === "short-hold" || closurePhase === "long-interrupt"
          ? "rest"
          : requestedState === "rest"
            ? "rest"
            : "gaze-engagement";
      // Valid input comes from active participants whose eyes are open.
      const inputActive =
        engagementState === "gaze-engagement" &&
        !closureActive &&
        participant?.inputActive !== false;
      const closureSequence = max(
        0,
        Number(participant?.closureSequence) || 0
      );
      const longClosureSequence = closurePhase === "long-interrupt"
        ? max(
            closureSequence || 1,
            Number(participant?.longClosureSequence) || 0
          )
        : max(0, Number(participant?.longClosureSequence) || 0);
      // participantId uses the current array index; simulated
      // identity is valid only within the current test session.
      const snapshot = {
        participantId: index,
        enabled: true,
        camReady: false,
        detecting: false,
        inputActive,
        inputMode:
          participant?.inputMode ||
          (index === 0 ? currentInputMode() : "eye-head"),
        engagementState,
        pointerActive: index === 0 && isPointerMode,
        isPointerMode: index === 0 && isPointerMode,
        faceCount: 1,
        gaze: {
          x: clamp(Number(participant?.x) || width * 0.5, 0, width),
          y: clamp(Number(participant?.y) || height * 0.5, 0, height),
        },
        // The eye snapshot simulates the live public fields.
        eyes: {
          available: true,
          calibrated: true,
          valid: inputActive,
          state: closureActive
            ? closurePhase === "blink"
              ? "closing"
              : "closed"
            : "open",
          engagementState,
          open: !closureActive,
          closurePhase,
          closureSequence,
          longClosureSequence,
          closureDurationMs: max(
            0,
            Number(participant?.closureDurationMs) || 0
          ),
          lastClosureDurMs: max(
            0,
            Number(participant?.lastClosureDurMs) || 0
          ),
          visualAlpha:
            closureActive ? faceTrack.eyeClosedCursorAlpha : 1,
        },
        calibration: { active: false, quality: "test" },
        status: "Test participant input",
      };
      const lastClosureDurMs = snapshot.eyes.lastClosureDurMs;
      // Reopening eyes uses the previous frame's position to generate feedback,
      // allowing tests to cover the real eye-opening feedback path.
      if (
        closurePhase === "reopening" &&
        lastClosureDurMs >= faceTrack.eyeShortCloseMs
      ) {
        const previous = previousTestUsers?.[index];
        queueEyeReopenRipple(
          {
            closureSequence,
            closureGaze: previous?.gaze || snapshot.gaze,
          },
          index,
          snapshot.gaze,
          gazeFrame.now
        );
      }
      return snapshot;
    });
  return true;
}

// The consent snapshot exposes interface state and anonymous participant summaries;
// facial landmarks and raw calibration samples remain in their respective processing layers.
function getConsentSnapshot() {
  const now = gazeFrame.now || 0;
  const present = [...audienceStates.values()].filter(
    (audience) => now - audience.lastSeenAt < consentRules.missingForgetMs
  );
  return {
    detectedFaceCapacity: maximumDetectedFaces,
    primaryParticipationAccepted: Boolean(primarySlotId),
    viewerCount: present.filter((audience) =>
      ["detecting", "ready", "prompting", "watching"].includes(
        audience.status
      )
    ).length,
    waitingViewerCount: present.filter((audience) =>
      ["queued", "slot-offer"].includes(audience.status)
    ).length,
    audiencePrompt: audiencePrompt
      ? {
          mode: audiencePrompt.mode,
          assignmentId: audiencePrompt.assignmentId,
        }
      : null,
  };
}

function ecoPresenceSnapshot() {
  // presence indicates continued eligibility for interaction and
  // permits a brief detection grace period in the current frame.
  const participantPresent = (participant) => Boolean(
    participant?.pointerActive ||
      participant?.faceCount > 0 ||
      participant?.cursorTracking?.phase === "tracking" ||
      participant?.cursorTracking?.phase === "grace" ||
      participant?.cursorTracking?.phase === "exiting" ||
      participant?.cursorTracking?.phase === "recovering"
  );
// Automated-test snapshots take priority in the read path, giving verification reproducible results.
  if (testUserSnapshots?.length) {
    const participants = testUserSnapshots.map((participant, index) => ({
      participantId: participant.participantId ?? index,
      confirmed: true,
      present: participantPresent(participant),
      trackingPhase: participant.cursorTracking?.phase || "tracking",
    }));
    return {
      confirmedParticipantCount: participants.length,
      presentCount: participants.filter((participant) => participant.present).length,
      anyonePresent: participants.some((participant) => participant.present),
      participants,
    };
  }
  if (multiTestEnabled) {
    return {
      confirmedParticipantCount: 3,
      presentCount: 3,
      anyonePresent: true,
      participants: [0, 1, 2].map((participantId) => ({
        participantId,
        confirmed: true,
        present: true,
        trackingPhase: "tracking",
      })),
    };
  }
  // Manual pointer mode is treated as one explicit participant.
  if (
    isPointerMode &&
    pointerPresenceSrc === "manual-participant"
  ) {
    return {
      confirmedParticipantCount: 1,
      presentCount: 1,
      anyonePresent: true,
      participants: [{
        participantId: 0,
        confirmed: true,
        present: true,
        trackingPhase: "tracking",
      }],
    };
  }
  // Live mode counts confirmed slots; candidate viewers remain in the consent process.
  const participants = [];
  if (primarySlotId) {
    const facePresent = Boolean(primaryUserFace());
    const trackingPhase = primaryCursorTrack.phase;
    participants.push({
      participantId: 0,
      confirmed: true,
      present: facePresent || trackingPhase !== "inactive",
      trackingPhase,
    });
  }
  for (const participant of peerStates) {
    if (!participant.faceAssignmentId) continue;
    const facePresent = Boolean(
      faceSlotForAssign(participant.faceAssignmentId)?.face
    );
    const trackingPhase = participant.cursorTracking.phase;
    participants.push({
      participantId: participant.id,
      confirmed: true,
      present: facePresent || trackingPhase !== "inactive",
      trackingPhase,
    });
  }
  const presentCount = participants.filter(
    (participant) => participant.present
  ).length;
  return {
    confirmedParticipantCount: participants.length,
    presentCount,
    anyonePresent: presentCount > 0,
    participants,
  };
}

// Snapshots carry the temporary identifiers, gaze coordinates,
// and diagnostic state required for current interactions;
// camera images and facial landmarks remain in the perception layer.
function snapshot() {
  const primary = primarySnapshot();
  const calibrationQueue = peerCalibQueue();
  const audience = consent.snapshot();
  // Copy nested gaze coordinates when injecting test users.
  if (testUserSnapshots?.length) {
    const participants = testUserSnapshots.map((participant, index) =>
      index === 0
        ? { ...primary, ...participant, gaze: { ...participant.gaze } }
        : { ...participant, gaze: { ...participant.gaze } }
    );
    return {
      ...participants[0],
      participantCount: participants.length,
      pendingParticipantCount: calibrationQueue.length,
      maximumParticipants,
      ...audience,
      multiModeEnabled: true,
      calibrationQueue,
      participants,
    };
  }
  // The multi-participant demonstration combines pointer and simulated gaze,
  // producing the same data shape as live mode.
  if (multiTestEnabled) {
    const pointerParticipant = {
      ...primary,
      inputActive: true,
      inputMode: "pointer",
      engagementState: null,
      pointerActive: true,
      isPointerMode: true,
      cursorTracking: { ...primaryCursorTrack, phase: "tracking", alpha: 1 },
    };
    const gazeParticipant = skipCam
      ? testPeerSnapshot(testPeerStates[0])
      : peerStates[0].visible
        ? peerSnapshot(peerStates[0])
        : null;
    const participants = [
      pointerParticipant,
      ...(gazeParticipant ? [gazeParticipant] : []),
      testPeerSnapshot(testPeerStates[1]),
    ];
    return {
      ...participants[0],
      participantCount: participants.length,
      pendingParticipantCount: calibrationQueue.length,
      maximumParticipants,
      ...audience,
      multiTestEnabled: true,
      multiModeEnabled: true,
      calibrationQueue,
      participants,
    };
  }
  // Normal mode exposes visible participants and enforces
  // the participant limit uniformly at the entry point.
  const additional = isPointerMode || !multiModeEnabled
    ? []
    : peerStates
        .filter((participant) => participant.visible)
        .map(peerSnapshot);
  const primaryVisible =
    isPointerMode ||
    (primarySlotId &&
      isCursorVisible(primaryCursorTrack));
  const participants = [
    ...(primaryVisible ? [primary] : []),
    ...additional,
  ].slice(0, maximumParticipants);
  return {
    ...primary,
    participantCount: participants.length,
    pendingParticipantCount: calibrationQueue.length,
    maximumParticipants,
    ...audience,
    calibrationQueue,
    participants,
  };
}

// 15. Pass the audience's temporary attentional signals to the entire ecology
// window.GazeEngine is the public entry point to the perception system.
window.GazeEngine = Object.freeze({
  preload,
  setup,
  update,
  drawScene,
  drawOverlay,
  resize,
  keyPressed,
  pointerMoved,
  setPtrCtrlOn,
  setInputMode,
  enblMltMode,
  setMultiTest,
  setTestParticipants,
  snapshot,
  eclgyPrsn: ecoPresenceSnapshot,
  targets,
  bgnTgtAppr,
  updtTgtAppr,
  cnclTgtAppr,
  beginCellDiff,
  bgnTgtDiff,
  bgnTgtFadeOut,
  createRelCell,
  relationalBasicCellVisualRadius: relCellRad,
  exportStoredCells,
  restoreStoredCells,
  updtCellRtrn,
  freeCellRtrn,
  setIxVisAssist,
  visCrsrPos,
  qPrdtRppl,
});
})();
